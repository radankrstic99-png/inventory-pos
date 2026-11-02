import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sku         TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  unit        TEXT    NOT NULL DEFAULT 'pcs',
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  vat_rate    REAL    NOT NULL DEFAULT 17,
  min_stock   REAL    NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  type           TEXT    NOT NULL CHECK (type IN ('RECEIPT', 'SALE')),
  number         TEXT    NOT NULL UNIQUE,
  partner        TEXT,
  payment_method TEXT,
  total_cents    INTEGER NOT NULL,
  vat_cents      INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id      INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  product_id       INTEGER NOT NULL REFERENCES products(id),
  quantity         REAL    NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_product   ON document_items(product_id);
CREATE INDEX IF NOT EXISTS idx_items_document  ON document_items(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_type  ON documents(type, created_at);

-- Current stock is derived from documents, never stored, so it can't drift.
CREATE VIEW IF NOT EXISTS product_stock AS
SELECT p.id AS product_id,
       COALESCE(SUM(CASE d.type
                      WHEN 'RECEIPT' THEN i.quantity
                      WHEN 'SALE'    THEN -i.quantity
                    END), 0) AS quantity
FROM products p
LEFT JOIN document_items i ON i.product_id = p.id
LEFT JOIN documents d      ON d.id = i.document_id
GROUP BY p.id;
`;

/** Opens (or creates) the SQLite database and makes sure the schema exists. */
export function openDatabase(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}

/** Runs fn inside a transaction; rolls back if it throws. */
export function transaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

const SAMPLE_PRODUCTS = [
  ['1001', 'Espresso coffee 200g', 'pcs', 650, 17, 10],
  ['1002', 'Mineral water 1.5L', 'pcs', 120, 17, 24],
  ['1003', 'Chocolate bar 100g', 'pcs', 250, 17, 20],
  ['1004', 'Engine oil 5W-30 1L', 'pcs', 1890, 17, 5],
  ['1005', 'Windshield washer 3L', 'pcs', 790, 17, 6],
  ['1006', 'Sandwich', 'pcs', 450, 17, 8]
];

/** Fills an empty database with a few products and an opening stock receipt. */
export function seedIfEmpty(db, { createReceipt }) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM products').get();
  if (n > 0) return false;

  const insert = db.prepare(
    'INSERT INTO products (sku, name, unit, price_cents, vat_rate, min_stock) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const ids = SAMPLE_PRODUCTS.map((p) => Number(insert.run(...p).lastInsertRowid));

  createReceipt(db, {
    supplier: 'Opening stock',
    items: ids.map((productId, i) => ({
      productId,
      quantity: [40, 120, 60, 15, 20, 12][i],
      unitCost: SAMPLE_PRODUCTS[i][3] / 100 * 0.7
    }))
  });
  return true;
}
