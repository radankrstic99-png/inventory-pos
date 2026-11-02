import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createApp } from './app.js';
import { openDatabase, seedIfEmpty } from './db.js';
import { createReceipt } from './services/documentService.js';

const PORT = Number(process.env.PORT ?? 3000);
const DB_FILE = resolve(process.env.DB_FILE ?? 'data/inventory.db');

mkdirSync(dirname(DB_FILE), { recursive: true });
const db = openDatabase(DB_FILE);
if (seedIfEmpty(db, { createReceipt })) {
  console.log('Database was empty - added sample products and opening stock.');
}

createApp(db).listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}/api`);
});
