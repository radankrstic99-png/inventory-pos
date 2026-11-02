import { Router } from 'express';
import { getSummary } from '../services/reportService.js';

export function reportsRouter(db) {
  const router = Router();
  router.get('/summary', (req, res) => res.json(getSummary(db)));
  return router;
}
