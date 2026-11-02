import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { Summary } from '../../core/models';
import { MoneyPipe } from '../../core/money.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [MoneyPipe, DatePipe, RouterLink],
  template: `
    <h1>Dashboard</h1>
    @if (error()) { <p class="alert error">{{ error() }}</p> }

    @if (summary(); as s) {
      <section class="cards">
        <div class="card stat">
          <span class="label">Sales today</span>
          <strong>{{ s.todaySales.total | money }}</strong>
          <span class="muted">{{ s.todaySales.count }} receipts</span>
        </div>
        <div class="card stat">
          <span class="label">Stock value (retail)</span>
          <strong>{{ s.stockValue | money }}</strong>
        </div>
        <div class="card stat">
          <span class="label">Low stock items</span>
          <strong [class.danger]="s.lowStock.length > 0">{{ s.lowStock.length }}</strong>
        </div>
      </section>

      <section class="grid-2">
        <div class="card">
          <h2>Sales, last 7 days</h2>
          <div class="bars">
            @for (day of s.last7Days; track day.date) {
              <div class="bar-col" [title]="(day.total | money)">
                <div class="bar" [style.height.%]="(day.total / maxDay()) * 100"></div>
                <span class="muted small">{{ day.date | date: 'EEE' }}</span>
              </div>
            }
          </div>
        </div>

        <div class="card">
          <h2>Best sellers (30 days)</h2>
          @if (s.topProducts.length === 0) {
            <p class="muted">No sales yet. <a routerLink="/pos">Make the first sale</a>.</p>
          } @else {
            <table>
              <thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Revenue</th></tr></thead>
              <tbody>
                @for (p of s.topProducts; track p.productId) {
                  <tr><td>{{ p.name }}</td><td class="num">{{ p.quantity }}</td><td class="num">{{ p.revenue | money }}</td></tr>
                }
              </tbody>
            </table>
          }
        </div>
      </section>

      @if (s.lowStock.length > 0) {
        <section class="card">
          <h2>Reorder soon</h2>
          <table>
            <thead><tr><th>SKU</th><th>Product</th><th class="num">In stock</th><th class="num">Minimum</th></tr></thead>
            <tbody>
              @for (p of s.lowStock; track p.id) {
                <tr><td>{{ p.sku }}</td><td>{{ p.name }}</td><td class="num danger">{{ p.stock }}</td><td class="num">{{ p.minStock }}</td></tr>
              }
            </tbody>
          </table>
          <a class="btn" routerLink="/receipt">New goods receipt</a>
        </section>
      }
    } @else if (!error()) {
      <p class="muted">Loading…</p>
    }
  `
})
export class DashboardComponent {
  private readonly api = inject(ApiService);

  readonly summary = signal<Summary | null>(null);
  readonly error = signal('');
  readonly maxDay = computed(() => Math.max(1, ...(this.summary()?.last7Days.map((d) => d.total) ?? [])));

  constructor() {
    this.api.getSummary().subscribe({
      next: (s) => this.summary.set(s),
      error: (e) => this.error.set(errorMessage(e))
    });
  }
}
