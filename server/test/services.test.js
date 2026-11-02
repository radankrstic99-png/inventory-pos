import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { openDatabase, seedIfEmpty } from '../src/db.js';
import { createReceipt, createSale, getDocument, listDocuments } from '../src/services/documentService.js';
import { createProduct, deleteProduct, getProduct, listProducts, updateProduct } from '../src/services/productService.js';
import { getSummary } from '../src/services/reportService.js';

let db;
let coffee;

beforeEach(() => {
  db = openDatabase(':memory:');
  coffee = createProduct(db, { sku: 'C1', name: 'Coffee', price: 6.5, minStock: 5 });
});

describe('products', () => {
  it('creates a product with zero stock', () => {
    assert.equal(coffee.price, 6.5);
    assert.equal(coffee.vatRate, 17);
    assert.equal(coffee.stock, 0);
    assert.equal(coffee.lowStock, true);
  });

  it('rejects a duplicate SKU with 409', () => {
    assert.throws(() => createProduct(db, { sku: 'C1', name: 'Other', price: 1 }), { status: 409 });
  });

  it('validates input', () => {
    assert.throws(() => createProduct(db, { sku: '', name: 'X', price: 1 }), { status: 400 });
    assert.throws(() => createProduct(db, { sku: 'X', name: 'X', price: -1 }), { status: 400 });
  });

  it('updates, searches and soft-deletes', () => {
    updateProduct(db, coffee.id, { sku: 'C1', name: 'Coffee 200g', price: 7 });
    assert.equal(getProduct(db, coffee.id).name, 'Coffee 200g');
    assert.equal(listProducts(db, { search: '200g' }).length, 1);
    deleteProduct(db, coffee.id);
    assert.equal(listProducts(db).length, 0);
    assert.throws(() => getProduct(db, coffee.id), { status: 404 });
  });
});

describe('documents', () => {
  it('a goods receipt increases stock', () => {
    const doc = createReceipt(db, { supplier: 'ACME', items: [{ productId: coffee.id, quantity: 10, unitCost: 4.2 }] });
    assert.match(doc.number, /^GR-\d{4}-00001$/);
    assert.equal(doc.total, 42);
    assert.equal(getProduct(db, coffee.id).stock, 10);
  });

  it('a sale decreases stock and calculates 17% VAT', () => {
    createReceipt(db, { supplier: 'ACME', items: [{ productId: coffee.id, quantity: 10, unitCost: 4 }] });
    const sale = createSale(db, { paymentMethod: 'CARD', items: [{ productId: coffee.id, quantity: 2 }] });
    assert.equal(sale.total, 13);
    assert.equal(sale.vat, 1.89); // 13.00 * 17 / 117
    assert.equal(sale.items[0].unitPrice, 6.5);
    assert.equal(getProduct(db, coffee.id).stock, 8);
  });

  it('refuses to sell more than is in stock and leaves nothing behind', () => {
    createReceipt(db, { supplier: 'ACME', items: [{ productId: coffee.id, quantity: 3, unitCost: 4 }] });
    assert.throws(
      () => createSale(db, { items: [{ productId: coffee.id, quantity: 2 }, { productId: coffee.id, quantity: 2 }] }),
      { status: 409 }
    );
    assert.equal(getProduct(db, coffee.id).stock, 3);
    assert.equal(listDocuments(db, { type: 'SALE' }).length, 0);
  });

  it('rejects unknown products and bad payment methods', () => {
    assert.throws(() => createSale(db, { items: [{ productId: 999, quantity: 1 }] }), { status: 400 });
    assert.throws(() => createSale(db, { paymentMethod: 'BITCOIN', items: [{ productId: coffee.id, quantity: 1 }] }), {
      status: 400
    });
  });

  it('returns document details with product names', () => {
    const doc = createReceipt(db, { supplier: 'ACME', items: [{ productId: coffee.id, quantity: 1, unitCost: 4 }] });
    assert.equal(getDocument(db, doc.id).items[0].name, 'Coffee');
  });
});

describe('reports', () => {
  it('summarises today\'s sales and low stock', () => {
    createReceipt(db, { supplier: 'ACME', items: [{ productId: coffee.id, quantity: 6, unitCost: 4 }] });
    createSale(db, { items: [{ productId: coffee.id, quantity: 2 }] });
    const s = getSummary(db);
    assert.deepEqual(s.todaySales, { total: 13, count: 1 });
    assert.equal(s.last7Days.length, 7);
    assert.equal(s.last7Days[6].total, 13);
    assert.equal(s.topProducts[0].name, 'Coffee');
    assert.equal(s.lowStock.length, 1); // 4 left, minimum is 5
    assert.equal(s.stockValue, 26);
  });

  it('seeds an empty database once', () => {
    const fresh = openDatabase(':memory:');
    assert.equal(seedIfEmpty(fresh, { createReceipt }), true);
    assert.equal(seedIfEmpty(fresh, { createReceipt }), false);
    assert.equal(listProducts(fresh).length, 6);
  });
});
