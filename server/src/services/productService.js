import { badRequest, conflict, notFound } from '../errors.js';
import { fromCents, toCents } from '../money.js';

const SELECT_PRODUCTS = `
  SELECT p.id, p.sku, p.name, p.unit, p.price_cents, p.vat_rate, p.min_stock, s.quantity
  FROM products p
  JOIN product_stock s ON s.product_id = p.id
`;

export function toProduct(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    unit: row.unit,
    price: fromCents(row.price_cents),
    vatRate: row.vat_rate,
    minStock: row.min_stock,
    stock: row.quantity,
    lowStock: row.quantity <= row.min_stock
  };
}

function validate(input) {
  const sku = String(input?.sku ?? '').trim();
  const name = String(input?.name ?? '').trim();
  const unit = String(input?.unit ?? 'pcs').trim() || 'pcs';
  const price = Number(input?.price);
  const vatRate = input?.vatRate === undefined ? 17 : Number(input.vatRate);
  const minStock = input?.minStock === undefined ? 0 : Number(input.minStock);

  if (!sku) throw badRequest('SKU is required');
  if (!name) throw badRequest('Name is required');
  if (!Number.isFinite(price) || price < 0) throw badRequest('Price must be a number >= 0');
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) throw badRequest('VAT rate must be between 0 and 100');
  if (!Number.isFinite(minStock) || minStock < 0) throw badRequest('Minimum stock must be >= 0');

  return { sku, name, unit, priceCents: toCents(price), vatRate, minStock };
}

function rethrowUnique(err, sku) {
  if (String(err.message).includes('UNIQUE constraint failed')) {
    throw conflict(`A product with SKU "${sku}" already exists`);
  }
  throw err;
}

export function listProducts(db, { search = '' } = {}) {
  const term = `%${search.trim()}%`;
  return db
    .prepare(`${SELECT_PRODUCTS} WHERE p.active = 1 AND (p.name LIKE ? OR p.sku LIKE ?) ORDER BY p.name`)
    .all(term, term)
    .map(toProduct);
}

export function getProduct(db, id) {
  const row = db.prepare(`${SELECT_PRODUCTS} WHERE p.id = ? AND p.active = 1`).get(Number(id));
  if (!row) throw notFound(`Product ${id} not found`);
  return toProduct(row);
}

export function createProduct(db, input) {
  const p = validate(input);
  try {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO products (sku, name, unit, price_cents, vat_rate, min_stock) VALUES (?, ?, ?, ?, ?, ?)')
      .run(p.sku, p.name, p.unit, p.priceCents, p.vatRate, p.minStock);
    return getProduct(db, lastInsertRowid);
  } catch (err) {
    rethrowUnique(err, p.sku);
  }
}

export function updateProduct(db, id, input) {
  getProduct(db, id);
  const p = validate(input);
  try {
    db.prepare(
      'UPDATE products SET sku = ?, name = ?, unit = ?, price_cents = ?, vat_rate = ?, min_stock = ? WHERE id = ?'
    ).run(p.sku, p.name, p.unit, p.priceCents, p.vatRate, p.minStock, Number(id));
  } catch (err) {
    rethrowUnique(err, p.sku);
  }
  return getProduct(db, id);
}

/** Soft delete: the product disappears from lists but its document history stays intact. */
export function deleteProduct(db, id) {
  getProduct(db, id);
  db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(Number(id));
}
