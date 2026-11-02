# Inventory & POS

A full-stack web application for a small retail shop: product catalogue, goods receipts, a point-of-sale screen, document history and a sales dashboard.

The idea comes from my day-to-day work with retail bookkeeping and fiscal POS software. I wanted to build the core of such a system myself.

**Stack:** Angular 19 · TypeScript · Node.js · Express 5 · SQLite · REST API

## Features

- **Products**: create, edit, search and delete products, with SKU, retail price, VAT rate and minimum stock.
- **Goods receipts**: record stock coming in from a supplier, with purchase prices.
- **Point of sale**: search or click products, adjust quantities, pay by cash or card, print-style receipt.
- **Stock control**: stock is calculated from documents, a sale is refused if there isn't enough stock, low-stock items are flagged.
- **Documents**: history of all sales and receipts, with line items.
- **Dashboard**: today's sales, last 7 days, best sellers, stock value, items to reorder.

## Technical highlights

- **Angular 19** with standalone components, signals, the new control flow (`@if`, `@for`), lazy-loaded routes and a typed API service.
- **Layered Express API**: routes → services → database, with central error handling and proper HTTP status codes (400 / 404 / 409).
- **Data integrity**:
  - Money is stored as integer cents.
  - Stock is never stored but derived from documents through a SQL view.
  - Every sale or receipt runs in a database transaction, so a failed sale leaves nothing behind.
- **VAT**: prices include VAT (17%, Bosnia and Herzegovina), and the VAT is calculated per line on every sale.
- **Tests**: unit tests of the business logic with Node's built-in test runner (`npm test`).

## Project structure

```
inventory-pos/
├── server/                 Node.js + Express REST API
│   ├── src/
│   │   ├── db.js           schema, stock view, transactions, sample data
│   │   ├── money.js        cents conversion, VAT
│   │   ├── services/       business logic (products, documents, reports)
│   │   ├── routes/         Express routers
│   │   ├── app.js          Express app + error handling
│   │   └── index.js        entry point
│   └── test/               unit tests
└── client/                 Angular frontend
    └── src/app/
        ├── core/           models, API service, money pipe
        └── pages/          dashboard, pos, products, receipt, documents
```

## Getting started

Requirements: **Node.js 22.13 or newer** (it uses the built-in `node:sqlite` module, so no database server is needed).

```bash
# 1. API (http://localhost:3000)
cd server
npm install
npm start          # creates data/inventory.db with sample products on first run

# 2. Frontend (http://localhost:4200), in a second terminal
cd client
npm install
npm start
```

Open http://localhost:4200. The Angular dev server forwards `/api` calls to the API.

Run the tests:

```bash
cd server
npm test
```

## REST API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/products?search=` | List products with current stock |
| GET | `/api/products/:id` | One product |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Delete a product (soft delete, history is kept) |
| POST | `/api/receipts` | Goods receipt `{ supplier, items: [{ productId, quantity, unitCost }] }` |
| POST | `/api/sales` | Sale `{ paymentMethod: "CASH" \| "CARD", items: [{ productId, quantity }] }` |
| GET | `/api/documents?type=SALE\|RECEIPT` | Document history |
| GET | `/api/documents/:id` | Document with line items |
| GET | `/api/reports/summary` | Dashboard numbers |

Errors are returned as `{ "error": "message" }`. A sale that exceeds stock returns `409 Conflict`.

## Possible next steps

- User login and roles (cashier / manager)
- Docker setup and deployment to AWS
- Purchase price tracking and profit margin reports
- Barcode scanner input on the POS screen

## Author

Radan Krstić · Computer Science graduate, Sinergija University (2026)
