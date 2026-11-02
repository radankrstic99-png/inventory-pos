import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  DocumentDetail,
  DocumentSummary,
  DocumentType,
  Product,
  ProductInput,
  ReceiptInput,
  SaleInput,
  Summary
} from './models';

/** All calls to the REST API go through this service. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  getProducts(search = '') {
    const params = new HttpParams().set('search', search);
    return this.http.get<Product[]>(`${this.base}/products`, { params });
  }

  createProduct(input: ProductInput) {
    return this.http.post<Product>(`${this.base}/products`, input);
  }

  updateProduct(id: number, input: ProductInput) {
    return this.http.put<Product>(`${this.base}/products/${id}`, input);
  }

  deleteProduct(id: number) {
    return this.http.delete<void>(`${this.base}/products/${id}`);
  }

  createReceipt(input: ReceiptInput) {
    return this.http.post<DocumentDetail>(`${this.base}/receipts`, input);
  }

  createSale(input: SaleInput) {
    return this.http.post<DocumentDetail>(`${this.base}/sales`, input);
  }

  getDocuments(type?: DocumentType) {
    const params = type ? new HttpParams().set('type', type) : new HttpParams();
    return this.http.get<DocumentSummary[]>(`${this.base}/documents`, { params });
  }

  getDocument(id: number) {
    return this.http.get<DocumentDetail>(`${this.base}/documents/${id}`);
  }

  getSummary() {
    return this.http.get<Summary>(`${this.base}/reports/summary`);
  }
}

/** Turns an HTTP error into a message the user can read. */
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the server. Is the API running on port 3000?';
    const body = err.error as { error?: string } | null;
    return body?.error ?? err.message;
  }
  return 'Unexpected error';
}
