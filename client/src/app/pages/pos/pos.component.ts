import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ApiService, errorMessage } from '../../core/api.service';
import { DocumentDetail, PaymentMethod, Product } from '../../core/models';
import { MoneyPipe } from '../../core/money.pipe';

interface CartLine {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-pos',
  imports: [MoneyPipe, DatePipe],
  template: `
    <h1>Point of sale</h1>
    @if (error()) { <p class="alert error">{{ error() }}</p> }

    <div class="pos">
      <section class="card">
        <input
          class="search"
          placeholder="Search products or type a SKU…"
          [value]="term()"
          (input)="term.set($any($event.target).value)"
          (keydown.enter)="addFirstMatch()" />
        <div class="product-grid">
          @for (p of filtered(); track p.id) {
            <button class="product-tile" (click)="add(p)" [disabled]="p.stock <= 0">
              <span class="name">{{ p.name }}</span>
              <span class="price">{{ p.price | money }}</span>
              <span class="muted small" [class.danger]="p.lowStock">Stock: {{ p.stock }}</span>
            </button>
          } @empty {
            <p class="muted">No products match "{{ term() }}".</p>
          }
        </div>
      </section>

      <section class="card cart">
        <h2>Cart</h2>
        @for (line of cart(); track line.product.id) {
          <div class="cart-line">
            <span class="name">{{ line.product.name }}</span>
            <input
              type="number"
              min="0"
              [attr.max]="line.product.stock"
              [value]="line.quantity"
              (change)="setQuantity(line.product.id, $any($event.target).valueAsNumber)" />
            <span class="num">{{ line.product.price * line.quantity | money }}</span>
            <button class="link danger" (click)="setQuantity(line.product.id, 0)">✕</button>
          </div>
        } @empty {
          <p class="muted">Click a product to add it.</p>
        }

        <div class="totals">
          <div><span>VAT included</span><span>{{ vat() | money }}</span></div>
          <div class="grand"><span>Total</span><span>{{ total() | money }}</span></div>
        </div>

        <div class="pay">
          <button class="btn" [disabled]="cart().length === 0 || busy()" (click)="checkout('CASH')">Cash</button>
          <button class="btn" [disabled]="cart().length === 0 || busy()" (click)="checkout('CARD')">Card</button>
        </div>

        @if (lastSale(); as sale) {
          <div class="receipt">
            <strong>{{ sale.number }}</strong> · {{ sale.createdAt | date: 'dd.MM.yyyy HH:mm' }} · {{ sale.paymentMethod }}
            @for (item of sale.items; track item.productId) {
              <div class="receipt-line"><span>{{ item.quantity }} × {{ item.name }}</span><span>{{ item.lineTotal | money }}</span></div>
            }
            <div class="receipt-line"><strong>Total</strong><strong>{{ sale.total | money }}</strong></div>
          </div>
        }
      </section>
    </div>
  `
})
export class PosComponent {
  private readonly api = inject(ApiService);

  readonly products = signal<Product[]>([]);
  readonly term = signal('');
  readonly cart = signal<CartLine[]>([]);
  readonly lastSale = signal<DocumentDetail | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');

  readonly filtered = computed(() => {
    const t = this.term().trim().toLowerCase();
    return this.products().filter((p) => !t || p.name.toLowerCase().includes(t) || p.sku.toLowerCase() === t);
  });

  readonly total = computed(() => this.cart().reduce((sum, l) => sum + l.product.price * l.quantity, 0));

  // Prices include VAT, so VAT = gross * rate / (100 + rate).
  readonly vat = computed(() =>
    this.cart().reduce((sum, l) => {
      const gross = l.product.price * l.quantity;
      return sum + (gross * l.product.vatRate) / (100 + l.product.vatRate);
    }, 0)
  );

  constructor() {
    this.loadProducts();
  }

  private loadProducts(): void {
    this.api.getProducts().subscribe({
      next: (list) => this.products.set(list),
      error: (e) => this.error.set(errorMessage(e))
    });
  }

  add(product: Product): void {
    const existing = this.cart().find((l) => l.product.id === product.id);
    this.setQuantity(product.id, (existing?.quantity ?? 0) + 1, product);
  }

  addFirstMatch(): void {
    const first = this.filtered()[0];
    if (first) {
      this.add(first);
      this.term.set('');
    }
  }

  setQuantity(productId: number, quantity: number, product?: Product): void {
    this.error.set('');
    this.cart.update((lines) => {
      const rest = lines.filter((l) => l.product.id !== productId);
      if (!quantity || quantity <= 0) return rest;
      const p = product ?? lines.find((l) => l.product.id === productId)?.product;
      if (!p) return lines;
      if (quantity > p.stock) {
        this.error.set(`Only ${p.stock} of "${p.name}" in stock.`);
        quantity = p.stock;
      }
      const index = lines.findIndex((l) => l.product.id === productId);
      const updated = { product: p, quantity };
      return index === -1 ? [...lines, updated] : lines.map((l, i) => (i === index ? updated : l));
    });
  }

  checkout(paymentMethod: PaymentMethod): void {
    const items = this.cart().map((l) => ({ productId: l.product.id, quantity: l.quantity }));
    this.busy.set(true);
    this.api.createSale({ paymentMethod, items }).subscribe({
      next: (sale) => {
        this.lastSale.set(sale);
        this.cart.set([]);
        this.busy.set(false);
        this.loadProducts(); // refresh stock
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      }
    });
  }
}
