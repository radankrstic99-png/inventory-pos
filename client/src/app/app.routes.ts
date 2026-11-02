import { Routes } from '@angular/router';

// Each page is lazy-loaded, so the browser only downloads the code it needs.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'pos',
    title: 'Point of sale',
    loadComponent: () => import('./pages/pos/pos.component').then((m) => m.PosComponent)
  },
  {
    path: 'products',
    title: 'Products',
    loadComponent: () => import('./pages/products/products.component').then((m) => m.ProductsComponent)
  },
  {
    path: 'receipt',
    title: 'Goods receipt',
    loadComponent: () => import('./pages/receipt/receipt.component').then((m) => m.ReceiptComponent)
  },
  {
    path: 'documents',
    title: 'Documents',
    loadComponent: () => import('./pages/documents/documents.component').then((m) => m.DocumentsComponent)
  },
  { path: '**', redirectTo: 'dashboard' }
];
