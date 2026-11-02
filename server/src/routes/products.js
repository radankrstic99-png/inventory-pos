import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct
} from '../services/productService.js';

export function productsRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(listProducts(db, { search: String(req.query.search ?? '') }));
  });

  router.get('/:id', (req, res) => {
    res.json(getProduct(db, req.params.id));
  });

  router.post('/', (req, res) => {
    res.status(201).json(createProduct(db, req.body));
  });

  router.put('/:id', (req, res) => {
    res.json(updateProduct(db, req.params.id, req.body));
  });

  router.delete('/:id', (req, res) => {
    deleteProduct(db, req.params.id);
    res.status(204).end();
  });

  return router;
}
