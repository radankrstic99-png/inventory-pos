import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ApiService, errorMessage } from '../../core/api.service';
import { DocumentDetail, DocumentSummary, DocumentType } from '../../core/models';
import { MoneyPipe } from '../../core/money.pipe';

@Component({
  selector: 'app-documents',
  imports: [MoneyPipe, DatePipe],
  template: `
    <h1>Documents</h1>
    @if (error()) { <p class="alert error">{{ error() }}</p> }

    <div class="tabs">
      @for (f of filters; track f.label) {
        <button [class.active]="type() === f.type" (click)="setType(f.type)">{{ f.label }}</button>
      }
    </div>

    <div class="grid-2">
      <section class="card">
        <table>
          <thead><tr><th>Number</th><th>Date</th><th>Partner / payment</th><th class="num">Total</th></tr></thead>
          <tbody>
            @for (d of documents(); track d.id) {
              <tr class="clickable" [class.selected]="selected()?.id === d.id" (click)="open(d.id)">
                <td><span class="badge" [class.sale]="d.type === 'SALE'">{{ d.type === 'SALE' ? 'Sale' : 'Receipt' }}</span> {{ d.number }}</td>
                <td>{{ d.createdAt | date: 'dd.MM.yyyy HH:mm' }}</td>
                <td>{{ d.partner ?? d.paymentMethod }}</td>
                <td class="num">{{ d.total | money }}</td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="muted">No documents yet.</td></tr>
            }
          </tbody>
        </table>
      </section>

      <section class="card">
        @if (selected(); as doc) {
          <h2>{{ doc.number }}</h2>
          <p class="muted">{{ doc.createdAt | date: 'dd.MM.yyyy HH:mm' }} · {{ doc.partner ?? doc.paymentMethod }}</p>
          <table>
            <thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th></tr></thead>
            <tbody>
              @for (i of doc.items; track i.productId) {
                <tr><td>{{ i.name }}</td><td class="num">{{ i.quantity }} {{ i.unit }}</td><td class="num">{{ i.unitPrice | money }}</td><td class="num">{{ i.lineTotal | money }}</td></tr>
              }
            </tbody>
            <tfoot>
              @if (doc.type === 'SALE') {
                <tr><td colspan="3">VAT included</td><td class="num">{{ doc.vat | money }}</td></tr>
              }
              <tr><td colspan="3"><strong>Total</strong></td><td class="num"><strong>{{ doc.total | money }}</strong></td></tr>
            </tfoot>
          </table>
        } @else {
          <p class="muted">Select a document to see its items.</p>
        }
      </section>
    </div>
  `
})
export class DocumentsComponent {
  private readonly api = inject(ApiService);

  readonly filters: { label: string; type: DocumentType | null }[] = [
    { label: 'All', type: null },
    { label: 'Sales', type: 'SALE' },
    { label: 'Goods receipts', type: 'RECEIPT' }
  ];

  readonly type = signal<DocumentType | null>(null);
  readonly documents = signal<DocumentSummary[]>([]);
  readonly selected = signal<DocumentDetail | null>(null);
  readonly error = signal('');

  constructor() {
    this.load();
  }

  setType(type: DocumentType | null): void {
    this.type.set(type);
    this.load();
  }

  load(): void {
    this.api.getDocuments(this.type() ?? undefined).subscribe({
      next: (list) => this.documents.set(list),
      error: (e) => this.error.set(errorMessage(e))
    });
  }

  open(id: number): void {
    this.api.getDocument(id).subscribe({
      next: (doc) => this.selected.set(doc),
      error: (e) => this.error.set(errorMessage(e))
    });
  }
}
