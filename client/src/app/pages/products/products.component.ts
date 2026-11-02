import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errorMessage } from '../../core/api.service';
import { Product, ProductInput } from '../../core/models';
import { MoneyPipe } from '../../core/money.pipe';

const emptyForm = (): ProductInput => ({ sku: '', name: '', unit: 'pcs', price: 0, vatRate: 17, minStock: 0 });

@Component({
  selector: 'app-products',
  imports: [FormsModule, MoneyPipe],
  template: `
    <h1>Products</h1>
    @if (error()) { <p class="alert error">{{ error() }}</p> }
    @if (message()) { <p class="alert success">{{ message() }}</p> }

    <section class="card">
      <h2>{{ editingId() ? 'Edit product' : 'New product' }}</h2>
      <form class="form-grid" (ngSubmit)="save()" #f="ngForm">
        <label>SKU <input name="sku" [(ngModel)]="form.sku" required /></label>
        <label class="wide">Name <input name="name" [(ngModel)]="form.name" required /></label>
        <label>Unit <input name="unit" [(ngModel)]="form.unit" /></label>
        <label>Price (incl. VAT) <input name="price" type="number" min="0" step="0.01" [(ngModel)]="form.price" required /></label>
        <label>VAT % <input name="vatRate" type="number" min="0" max="100" [(ngModel)]="form.vatRate" /></label>
        <label>Min. stock <input name="minStock" type="number" min="0" [(ngModel)]="form.minStock" /></label>
        <div class="actions">
          <button class="btn" type="submit" [disabled]="f.invalid || saving()">{{ editingId() ? 'Save changes' : 'Add product' }}</button>
          @if (editingId()) { <button class="btn secondary" type="button" (click)="reset()">Cancel</button> }
        </div>
      </form>
    </section>

    <section class="card">
      <div class="toolbar">
        <input placeholder="Search by name or SKU…" [(ngModel)]="search" (ngModelChange)="load()" />
      </div>
      <table>
        <thead>
          <tr><th>SKU</th><th>Name</th><th class="num">Price</th><th class="num">VAT</th><th class="num">Stock</th><th></th></tr>
        </thead>
        <tbody>
          @for (p of products(); track p.id) {
            <tr>
              <td>{{ p.sku }}</td>
              <td>{{ p.name }}</td>
              <td class="num">{{ p.price | money }}</td>
              <td class="num">{{ p.vatRate }}%</td>
              <td class="num" [class.danger]="p.lowStock">{{ p.stock }} {{ p.unit }}</td>
              <td class="row-actions">
                <button class="link" (click)="edit(p)">Edit</button>
                <button class="link danger" (click)="remove(p)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="muted">No products found.</td></tr>
          }
        </tbody>
      </table>
    </section>
  `
})
export class ProductsComponent {
  private readonly api = inject(ApiService);

  readonly products = signal<Product[]>([]);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');

  search = '';
  form: ProductInput = emptyForm();

  constructor() {
    this.load();
  }

  load(): void {
    this.api.getProducts(this.search).subscribe({
      next: (list) => this.products.set(list),
      error: (e) => this.error.set(errorMessage(e))
    });
  }

  edit(p: Product): void {
    this.editingId.set(p.id);
    this.form = { sku: p.sku, name: p.name, unit: p.unit, price: p.price, vatRate: p.vatRate, minStock: p.minStock };
    this.message.set('');
  }

  reset(): void {
    this.editingId.set(null);
    this.form = emptyForm();
  }

  save(): void {
    const id = this.editingId();
    const request = id ? this.api.updateProduct(id, this.form) : this.api.createProduct(this.form);
    this.saving.set(true);
    this.error.set('');
    request.subscribe({
      next: (p) => {
        this.message.set(`${id ? 'Updated' : 'Added'} "${p.name}".`);
        this.saving.set(false);
        this.reset();
        this.load();
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.saving.set(false);
      }
    });
  }

  remove(p: Product): void {
    if (!confirm(`Delete "${p.name}"? Its document history is kept.`)) return;
    this.api.deleteProduct(p.id).subscribe({
      next: () => {
        this.message.set(`Deleted "${p.name}".`);
        this.load();
      },
      error: (e) => this.error.set(errorMessage(e))
    });
  }
}
