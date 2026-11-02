import { transaction } from '../db.js';
import { badRequest, conflict, notFound } from '../errors.js';
import { fromCents, toCents, vatFromGross } from '../money.js';

const PAYMENT_METHODS = ['CASH', 'CARD'];

function loadActiveProduct(db, productId) {
  const row = db
    .prepare(
      `SELECT p.id, p.name, p.price_cents, p.vat_rate, s.quantity AS stock
       FROM products p JOIN product_stock s ON s.product_id = p.id
       WHERE p.id = ? AND p.active = 1`
    )
    .get(Number(productId));
  if (!row) throw badRequest(`Product ${productId} does not exist`);
  return row;
}

function requireItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw badRequest('At least one item is required');
  for (const item of items) {
    const q = Number(item?.quantity);
    if (!Number.isFinite(q) || q <= 0) throw badRequest('Quantity must be greater than 0');
  }
}

function nextNumber(db, type) {
  const prefix = type === 'SALE' ? 'S' : 'GR';
  const year = new Date().getFullYear();
  const { n } = db
    .prepare("SELECT COUNT(*) AS n FROM documents WHERE type = ? AND number LIKE ?")
    .get(type, `${prefix}-${year}-%`);
  return `${prefix}-${year}-${String(n + 1).padStart(5, '0')}`;
}

function insertDocument(db, { type, partner = null, paymentMethod = null, lines }) {
  const totalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const vatCents = lines.reduce((sum, l) => sum + l.vatCents, 0);
  const number = nextNumber(db, type);

  const { lastInsertRowid } = db
    .prepare(
      'INSERT INTO documents (type, number, partner, payment_method, total_cents, vat_cents) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(type, number, partner, paymentMethod, totalCents, vatCents);

  const insertItem = db.prepare(
    'INSERT INTO document_items (document_id, product_id, quantity, unit_price_cents, line_total_cents) VALUES (?, ?, ?, ?, ?)'
  );
  for (const l of lines) {
    insertItem.run(lastInsertRowid, l.productId, l.quantity, l.unitPriceCents, l.lineTotalCents);
  }
  return Number(lastInsertRowid);
}

/** Goods receipt: stock comes in from a supplier at a purchase price. */
export function createReceipt(db, { supplier, items } = {}) {
  const partner = String(supplier ?? '').trim();
  if (!partner) throw badRequest('Supplier is required');
  requireItems(items);

  return transaction(db, () => {
    const lines = items.map((item) => {
      loadActiveProduct(db, item.productId);
      const unitCost = Number(item.unitCost);
      if (!Number.isFinite(unitCost) || unitCost < 0) throw badRequest('Unit cost must be a number >= 0');
      const quantity = Number(item.quantity);
      const unitPriceCents = toCents(unitCost);
      return {
        productId: Number(item.productId),
        quantity,
        unitPriceCents,
        lineTotalCents: Math.round(unitPriceCents * quantity),
        vatCents: 0
      };
    });
    return getDocument(db, insertDocument(db, { type: 'RECEIPT', partner, lines }));
  });
}

/** Sale at the till: uses the current retail price and checks that there is enough stock. */
export function createSale(db, { paymentMethod = 'CASH', items } = {}) {
  if (!PAYMENT_METHODS.includes(paymentMethod)) throw badRequest('Payment method must be CASH or CARD');
  requireItems(items);

  return transaction(db, () => {
    // Merge repeated products so the stock check sees the full requested quantity.
    const wanted = new Map();
    for (const item of items) {
      const id = Number(item.productId);
      wanted.set(id, (wanted.get(id) ?? 0) + Number(item.quantity));
    }

    const lines = [...wanted].map(([productId, quantity]) => {
      const p = loadActiveProduct(db, productId);
      if (p.stock < quantity) {
        throw conflict(`Not enough stock for "${p.name}" (available: ${p.stock})`);
      }
      const lineTotalCents = Math.round(p.price_cents * quantity);
      return {
        productId,
        quantity,
        unitPriceCents: p.price_cents,
        lineTotalCents,
        vatCents: vatFromGross(lineTotalCents, p.vat_rate)
      };
    });
    return getDocument(db, insertDocument(db, { type: 'SALE', paymentMethod, lines }));
  });
}

function toSummary(row) {
  return {
    id: row.id,
    type: row.type,
    number: row.number,
    partner: row.partner,
    paymentMethod: row.payment_method,
    total: fromCents(row.total_cents),
    vat: fromCents(row.vat_cents),
    createdAt: `${row.created_at.replace(' ', 'T')}Z`, // SQLite stores UTC; send ISO 8601
    itemCount: row.item_count
  };
}

const SELECT_DOCUMENTS = `
  SELECT d.*, (SELECT COUNT(*) FROM document_items i WHERE i.document_id = d.id) AS item_count
  FROM documents d
`;

export function listDocuments(db, { type, limit = 50 } = {}) {
  const max = Math.min(Math.max(Number(limit) || 50, 1), 500);
  if (type) {
    if (!['RECEIPT', 'SALE'].includes(type)) throw badRequest('Type must be RECEIPT or SALE');
    return db
      .prepare(`${SELECT_DOCUMENTS} WHERE d.type = ? ORDER BY d.id DESC LIMIT ?`)
      .all(type, max)
      .map(toSummary);
  }
  return db.prepare(`${SELECT_DOCUMENTS} ORDER BY d.id DESC LIMIT ?`).all(max).map(toSummary);
}

export function getDocument(db, id) {
  const row = db.prepare(`${SELECT_DOCUMENTS} WHERE d.id = ?`).get(Number(id));
  if (!row) throw notFound(`Document ${id} not found`);

  const items = db
    .prepare(
      `SELECT i.product_id, p.sku, p.name, p.unit, i.quantity, i.unit_price_cents, i.line_total_cents
       FROM document_items i JOIN products p ON p.id = i.product_id
       WHERE i.document_id = ? ORDER BY i.id`
    )
    .all(Number(id))
    .map((i) => ({
      productId: i.product_id,
      sku: i.sku,
      name: i.name,
      unit: i.unit,
      quantity: i.quantity,
      unitPrice: fromCents(i.unit_price_cents),
      lineTotal: fromCents(i.line_total_cents)
    }));

  return { ...toSummary(row), items };
}
