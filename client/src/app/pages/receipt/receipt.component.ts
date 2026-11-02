import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errorMessage } from '../../core/api.service';
import { DocumentDetail, Product } from '../../core/models';
import { MoneyPipe } from '../../core/money.pipe';

interface ReceiptLine {
  productId: number | null;
  quantity: number;
  unitCost: number;
}

const newLine = (): ReceiptLine => ({ productId: null, quantity: 1, unitCost: 0 });

@Component({
  selector: 'app-receipt',
  imports: [FormsModule, MoneyPipe],
  template: `
    <h1>Goods receipt</h1>
    <p class="muted">Record goods coming in from a supplier. Stock goes up as soon as the receipt is saved.</p>
    @if (error()) { <p class="alert error">{{ error() }}</p> }
    @if (saved(); as doc) {
      <p class="alert success">Saved receipt <strong>{{ doc.number }}</strong> — {{ doc.itemCount }} items, {{ doc.total | money }}.</p>
    }

    <section class="card">
      <label class="supplier">Supplier <input name="supplier" [(ngModel)]="supplier" placeholder="e.g. Wholesale Ltd." /></label>

      <table>
        <thead><tr><th>Product</th><th class="num">Quantity</th><th class="num">Unit cost</th><th class="num">Line total</th><th></th></tr></thead>
        <tbody>
          @for (line of lines; track $index) {
            <tr>
              <td>
                <select [(ngModel)]="line.productId" [name]="'product' + $index">
                  <option [ngValue]="null" disabled>Choose a product…</option>
                  @for (p of products(); track p.id) {
                    <option [ngValue]="p.id">{{ p.sku }} — {{ p.name }}</option>
                  }
                </select>
              </td>
              <td class="num"><input type="number" min="0.001" step="any" [(ngModel)]="line.quantity" [name]="'qty' + $index" /></td>
              <td class="num"><input type="number" min="0" step="0.01" [(ngModel)]="line.unitCost" [name]="'cost' + $index" /></td>
              <td class="num">{{ line.quantity * line.unitCost | money }}</td>
              <td><button class="link danger" (click)="removeLine($index)" [disabled]="lines.length === 1">Remove</button></td>
            </tr>
          }
        </tbody>
        <tfoot><tr><td colspan="3"><button class="link" (click)="addLine()">+ Add line</button></td><td class="num"><strong>{{ total() | money }}</strong></td><td></td></tr></tfoot>
      </table>

      <button class="btn" (click)="save()" [disabled]="saving()">Save receipt</button>
    </section>
  `
})
export class ReceiptComponent {
  private readonly api = inject(ApiService);

  readonly products = signal<Product[]>([]);
  readonly saved = signal<DocumentDetail | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');

  supplier = '';
  lines: ReceiptLine[] = [newLine()];

  constructor() {
    this.api.getProducts().subscribe({
      next: (list) => this.products.set(list),
      error: (e) => this.error.set(errorMessage(e))
    });
  }

  total(): number {
    return this.lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
  }

  addLine(): void {
    this.lines.push(newLine());
  }

  removeLine(index: number): void {
    this.lines.splice(index, 1);
  }

  save(): void {
    const items = this.lines
      .filter((l): l is ReceiptLine & { productId: number } => l.productId !== null)
      .map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost }));

    if (items.length === 0) {
      this.error.set('Choose at least one product.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.api.createReceipt({ supplier: this.supplier, items }).subscribe({
      next: (doc) => {
        this.saved.set(doc);
        this.saving.set(false);
        this.supplier = '';
        this.lines = [newLine()];
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      }
    });
  }
}
