export interface Product {
  id: number;
  sku: string;
  name: string;
  unit: string;
  price: number;
  vatRate: number;
  minStock: number;
  stock: number;
  lowStock: boolean;
}

export type ProductInput = Pick<Product, 'sku' | 'name' | 'unit' | 'price' | 'vatRate' | 'minStock'>;

export type DocumentType = 'RECEIPT' | 'SALE';
export type PaymentMethod = 'CASH' | 'CARD';

export interface DocumentSummary {
  id: number;
  type: DocumentType;
  number: string;
  partner: string | null;
  paymentMethod: PaymentMethod | null;
  total: number;
  vat: number;
  createdAt: string;
  itemCount: number;
}

export interface DocumentLine {
  productId: number;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface DocumentDetail extends DocumentSummary {
  items: DocumentLine[];
}

export interface ReceiptInput {
  supplier: string;
  items: { productId: number; quantity: number; unitCost: number }[];
}

export interface SaleInput {
  paymentMethod: PaymentMethod;
  items: { productId: number; quantity: number }[];
}

export interface Summary {
  todaySales: { total: number; count: number };
  last7Days: { date: string; total: number }[];
  topProducts: { productId: number; name: string; quantity: number; revenue: number }[];
  lowStock: Product[];
  stockValue: number;
}
