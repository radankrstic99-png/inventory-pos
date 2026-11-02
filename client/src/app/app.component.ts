import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <span class="brand">Inventory &amp; POS</span>
      <nav>
        @for (link of links; track link.path) {
          <a [routerLink]="link.path" routerLinkActive="active">{{ link.label }}</a>
        }
      </nav>
    </header>
    <main class="container">
      <router-outlet />
    </main>
  `
})
export class AppComponent {
  readonly links = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/pos', label: 'Point of sale' },
    { path: '/products', label: 'Products' },
    { path: '/receipt', label: 'Goods receipt' },
    { path: '/documents', label: 'Documents' }
  ];
}
