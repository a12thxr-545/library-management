import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../services/category.service';
import { Category, Book } from '../../models';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <!-- Sticky tab bar -->
      <div class="tab-bar">
        <div class="tab-scroll">
          <button
            class="tab-item"
            *ngFor="let c of categories"
            [class.active]="selected?.id === c.id"
            (click)="select(c)">
            {{ c.name }}
            <span class="count">{{ c.book_count }}</span>
          </button>
        </div>
      </div>

      <!-- Selected category info + books -->
      <div class="content" *ngIf="selected">
        <div class="cat-header">
          <div>
            <h1 class="cat-name">{{ selected.name }}</h1>
            <p class="cat-desc" *ngIf="selected.description">{{ selected.description }}</p>
          </div>
          <span class="total-badge">{{ selected.book_count }} books</span>
        </div>

        <div class="loading-row" *ngIf="loading">Loading...</div>

        <div class="books-grid" *ngIf="!loading">
          <div class="book-row" *ngFor="let b of books" [routerLink]="['/books', b.id]">
            <img [src]="b.cover_url || fallback" [alt]="b.title" (error)="imgErr($event)" />
            <div class="bi">
              <div class="bi-title">{{ b.title }}</div>
              <div class="bi-author">{{ b.author }}</div>
            </div>
            <span class="avail" [class.red]="b.available_copies === 0">
              {{ b.available_copies > 0 ? b.available_copies + ' avail.' : 'Unavailable' }}
            </span>
          </div>

          <div class="empty" *ngIf="books.length === 0">
            No books in this category
          </div>
        </div>
      </div>

      <!-- Default state (nothing selected) -->
      <div class="empty-state" *ngIf="!selected && categories.length > 0">
        <i class="material-icons">book</i>
        <p>Select a category above</p>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; padding-top: 0; }

    /* Sticky tab bar */
    .tab-bar {
      position: sticky; top: 56px; z-index: 50;
      background: var(--bg); border-bottom: 1px solid var(--border);
      margin: 0 -20px; padding: 0 20px;
    }
    .tab-scroll {
      display: flex; overflow-x: auto; scrollbar-width: none;
      -webkit-overflow-scrolling: touch; gap: 0;
    }
    .tab-scroll::-webkit-scrollbar { display: none; }
    .tab-item {
      flex-shrink: 0; padding: 16px 20px;
      background: none; border: none; border-bottom: 3px solid transparent;
      color: var(--text2); font-size: 0.95rem; font-family: inherit; cursor: pointer;
      display: flex; align-items: center; gap: 8px;
      transition: color 0.15s, border-color 0.15s; white-space: nowrap;
    }
    .tab-item:hover { color: var(--text); }
    .tab-item.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 700; }
    .count {
      font-size: 0.75rem; padding: 2px 8px; border-radius: 20px;
      background: var(--bg3); color: var(--text3); font-weight: 600;
    }
    .tab-item.active .count { background: rgba(99,102,241,0.15); color: var(--accent); }

    /* Content area */
    .content { padding: 20px 20px 32px; }
    .cat-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    .cat-name { font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; }
    .cat-desc { font-size: 0.8rem; color: var(--text2); }
    .total-badge {
      flex-shrink: 0; font-size: 0.78rem; padding: 3px 12px;
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 20px; color: var(--text3); margin-top: 4px;
    }

    /* Book list */
    .loading-row { padding: 24px; text-align: center; font-size: 0.875rem; color: var(--text3); }
    .books-grid { display: flex; flex-direction: column; gap: 4px; }
    .book-row {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); cursor: pointer; transition: border-color 0.15s;
    }
    .book-row:hover { border-color: var(--accent); }
    .book-row img {
      width: 36px; height: 50px; object-fit: cover; border-radius: 4px;
      background: var(--bg3); flex-shrink: 0;
    }
    .bi { flex: 1; min-width: 0; }
    .bi-title { font-size: 0.875rem; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bi-author { font-size: 0.78rem; color: var(--text2); }
    .avail { font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; background: rgba(63,185,80,0.15); color: var(--success); flex-shrink: 0; white-space: nowrap; }
    .avail.red { background: rgba(248,81,73,0.15); color: var(--danger); }
    .empty { padding: 24px; text-align: center; color: var(--text3); font-size: 0.875rem; }

    /* Default state */
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 60px 20px; color: var(--text3); }
    .empty-state i { font-size: 3rem; color: var(--border); }
    .empty-state p { font-size: 0.875rem; }

    /* Responsive */
    @media (max-width: 768px) {
      .tab-bar { margin: 0 -16px; padding: 0 16px; }
      .tab-item { padding: 14px 16px; font-size: 0.9rem; }
      .content { padding: 16px 16px 24px; }
    }
    @media (max-width: 480px) {
      .tab-bar { margin: 0 -12px; padding: 0 12px; }
      .tab-item { padding: 12px 12px; font-size: 0.85rem; }
      .content { padding: 12px 12px 20px; }
    }
  `]
})
export class CategoriesComponent implements OnInit {
  categories: Category[] = [];
  selected: Category | null = null;
  books: Book[] = [];
  loading = false;
  fallback = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
    <rect width="200" height="300" fill="%231a1b26"/>
    <path d="M40 0h140a20 20 0 0 1 20 20v260a20 20 0 0 1-20 20H40a20 20 0 0 1-20-20V20A20 20 0 0 1 40 0z" fill="%2324283b"/>
    <rect x="40" y="40" width="120" height="10" rx="5" fill="%23414868" opacity="0.5"/>
    <rect x="40" y="65" width="80" height="10" rx="5" fill="%23414868" opacity="0.5"/>
    <path d="M20 20v260c0 11 9 20 20 20h10V20c0-11-9-20-20-20z" fill="%2316161e"/>
  </svg>`;

  constructor(private categoryService: CategoryService) { }

  ngOnInit() {
    this.categoryService.getCategories().subscribe(r => {
      if (r.data) {
        this.categories = r.data;
        // Auto-select first category
        if (this.categories.length > 0) {
          this.select(this.categories[0]);
        }
      }
    });
  }

  select(c: Category) {
    if (this.selected?.id === c.id) return;
    this.selected = c;
    this.loading = true;
    this.books = [];
    this.categoryService.getBooksByCategory(c.id).subscribe(r => {
      this.books = r.data || [];
      this.loading = false;
    });
  }

  imgErr(e: any) { e.target.src = this.fallback; }
}
