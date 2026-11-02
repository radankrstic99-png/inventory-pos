import cors from 'cors';
import express from 'express';
import { AppError } from './errors.js';
import { documentsRouter } from './routes/documents.js';
import { productsRouter } from './routes/products.js';
import { reportsRouter } from './routes/reports.js';

export function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/products', productsRouter(db));
  app.use('/api/reports', reportsRouter(db));
  app.use('/api', documentsRouter(db));

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  // Central error handler: known errors keep their status, everything else is a 500.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof AppError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
