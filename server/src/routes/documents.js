import { Router } from 'express';
import {
  createReceipt,
  createSale,
  getDocument,
  listDocuments
} from '../services/documentService.js';

export function documentsRouter(db) {
  const router = Router();

  router.post('/receipts', (req, res) => {
    res.status(201).json(createReceipt(db, req.body));
  });

  router.post('/sales', (req, res) => {
    res.status(201).json(createSale(db, req.body));
  });

  router.get('/documents', (req, res) => {
    const type = req.query.type ? String(req.query.type) : undefined;
    res.json(listDocuments(db, { type, limit: req.query.limit }));
  });

  router.get('/documents/:id', (req, res) => {
    res.json(getDocument(db, req.params.id));
  });

  return router;
}
