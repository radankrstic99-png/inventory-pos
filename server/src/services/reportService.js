import { fromCents } from '../money.js';
import { listProducts } from './productService.js';

/** Numbers for the dashboard: today's sales, last 7 days, best sellers, low stock, stock value. */
export function getSummary(db) {
  const today = db
    .prepare(
      `SELECT COALESCE(SUM(total_cents), 0) AS total, COUNT(*) AS count
       FROM documents
       WHERE type = 'SALE' AND date(created_at, 'localtime') = date('now', 'localtime')`
    )
    .get();

  const byDay = new Map(
    db
      .prepare(
        `SELECT date(created_at, 'localtime') AS day, SUM(total_cents) AS total
         FROM documents
         WHERE type = 'SALE' AND date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')
         GROUP BY day`
      )
      .all()
      .map((r) => [r.day, r.total])
  );

  // Always return 7 days, including days without sales.
  const last7Days = db
    .prepare(
      `WITH RECURSIVE days(n) AS (SELECT 6 UNION ALL SELECT n - 1 FROM days WHERE n > 0)
       SELECT date('now', 'localtime', '-' || n || ' days') AS day FROM days`
    )
    .all()
    .map(({ day }) => ({ date: day, total: fromCents(byDay.get(day) ?? 0) }));

  const topProducts = db
    .prepare(
      `SELECT p.id, p.name, SUM(i.quantity) AS quantity, SUM(i.line_total_cents) AS revenue
       FROM document_items i
       JOIN documents d ON d.id = i.document_id
       JOIN products p  ON p.id = i.product_id
       WHERE d.type = 'SALE' AND d.created_at >= datetime('now', '-30 days')
       GROUP BY p.id
       ORDER BY quantity DESC
       LIMIT 5`
    )
    .all()
    .map((r) => ({ productId: r.id, name: r.name, quantity: r.quantity, revenue: fromCents(r.revenue) }));

  const products = listProducts(db);
  const stockValue = products.reduce((sum, p) => sum + Math.max(p.stock, 0) * p.price, 0);

  return {
    todaySales: { total: fromCents(today.total), count: today.count },
    last7Days,
    topProducts,
    lowStock: products.filter((p) => p.lowStock),
    stockValue: Math.round(stockValue * 100) / 100
  };
}
