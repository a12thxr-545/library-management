import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { BookService } from '../../services/book.service';
import { CategoryService } from '../../services/category.service';
import { Book, Category } from '../../models';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <!-- Top row: search + sort -->
      <div class="toolbar">
        <div class="search-wrap">
          <i class="material-icons search-icon">search</i>
          <input [(ngModel)]="search" (ngModelChange)="onSearch()" placeholder="Search books..." />
        </div>
        <select [(ngModel)]="sort" (ngModelChange)="load()">
          <option value="latest">Newest</option>
          <option value="popular">Popular</option>
          <option value="title">A-Z</option>
        </select>
      </div>

      <!-- Category tab bar -->
      <div class="tab-bar">
        <div class="tab-scroll">
          <button class="tab-item" [class.active]="!selectedCat" (click)="selectCat(null)">All</button>
          <button class="tab-item" *ngFor="let c of categories" [class.active]="selectedCat === c.id" (click)="selectCat(c.id)">
            {{ c.name }}
          </button>
        </div>
      </div>

      <div class="result-info">{{ total }} result{{ total !== 1 ? 's' : '' }}</div>

      <div class="books-grid">
        <div class="book-row" *ngFor="let b of books" [routerLink]="['/books', b.id]">
          <img [src]="b.cover_url || fallback" [alt]="b.title" (error)="imgErr($event)" />
          <div class="book-info">
            <div class="book-title">{{ b.title }}</div>
            <div class="book-meta">{{ b.author }} · {{ b.category_name }}</div>
            <div class="book-stats">{{ b.borrow_count }} borrows · {{ b.view_count }} views</div>
          </div>
          <div class="book-right">
            <span class="avail" [class.red]="b.available_copies === 0">
              {{ b.available_copies > 0 ? b.available_copies + ' available' : 'Unavailable' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" *ngIf="total > limit">
        <button [disabled]="offset === 0" (click)="prev()">
          <i class="material-icons">arrow_back</i> Previous
        </button>
        <span>Page {{ page }} / {{ totalPages }}</span>
        <button [disabled]="offset + limit >= total" (click)="next()">
          Next <i class="material-icons">arrow_forward</i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 28px 20px 28px; }
    .toolbar { display: flex; gap: 10px; margin-bottom: 0; align-items: center; }
    .search-wrap { flex: 1; min-width: 0; position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: 10px; color: var(--text3); font-size: 1.1rem; }
    input {
      width: 100%; padding: 7px 12px 7px 34px; background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); color: var(--text); font-size: 0.875rem; outline: none;
    }
    input:focus { border-color: var(--accent); }
    select {
      padding: 6px 10px; background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); color: var(--text); font-size: 0.8rem; outline: none; cursor: pointer;
      flex-shrink: 0;
    }

    /* Tab bar */
    .tab-bar {
      position: sticky; top: 56px; z-index: 50;
      background: var(--bg); border-bottom: 1px solid var(--border);
      margin: 0 -20px; padding: 0 20px;
    }
    .tab-scroll {
      display: flex; gap: 0; overflow-x: auto; scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    .tab-scroll::-webkit-scrollbar { display: none; }
    .tab-item {
      flex-shrink: 0; padding: 10px 16px;
      background: none; border: none; color: var(--text2);
      font-size: 0.85rem; font-family: inherit; cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
      white-space: nowrap;
    }
    .tab-item:hover { color: var(--text); }
    .tab-item.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

    .result-info { font-size: 0.8rem; color: var(--text3); margin: 14px 0 10px; }

    .books-grid { display: flex; flex-direction: column; gap: 4px; }
    .book-row {
      display: flex; align-items: center; gap: 14px; padding: 10px 14px;
      background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius);
      cursor: pointer; transition: border-color 0.15s;
    }
    .book-row:hover { border-color: var(--accent); }
    .book-row img { width: 40px; height: 56px; object-fit: cover; border-radius: 4px; flex-shrink: 0; background: var(--bg3); }
    .book-info { flex: 1; min-width: 0; }
    .book-title { font-size: 0.875rem; font-weight: 600; color: var(--text); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .book-meta { font-size: 0.78rem; color: var(--text2); margin-bottom: 2px; }
    .book-stats { font-size: 0.72rem; color: var(--text3); }
    .book-right { text-align: right; flex-shrink: 0; }
    .avail { font-size: 0.75rem; padding: 3px 10px; border-radius: 4px; background: rgba(63,185,80,0.15); color: var(--success); font-weight: 500; white-space: nowrap; }
    .avail.red { background: rgba(248,81,73,0.15); color: var(--danger); }

    .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 24px; }
    .pagination button {
      padding: 6px 16px; background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); color: var(--text2); font-size: 0.8rem; cursor: pointer;
      display: flex; align-items: center; gap: 4px;
    }
    .pagination button i { font-size: 1rem; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination span { font-size: 0.8rem; color: var(--text2); }

    /* Responsive */
    @media (max-width: 768px) {
      .page { padding: 16px 16px 28px; }
      .tab-bar { margin: 0 -16px; padding: 0 16px; }
      .tab-item { padding: 10px 14px; font-size: 0.8rem; }
    }
    @media (max-width: 480px) {
      .page { padding: 12px 12px 24px; }
      .tab-bar { margin: 0 -12px; padding: 0 12px; }
      .toolbar { gap: 8px; }
      .book-stats { display: none; }
      .cat-btn { font-size: 0.73rem; padding: 4px 10px; }
    }
  `]
})
export class BooksComponent implements OnInit {
  books: Book[] = []; categories: Category[] = [];
  search = ''; selectedCat: string | null = null; sort = 'latest';
  total = 0; limit = 20; offset = 0;
  fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="56"><rect width="40" height="56" fill="%2330363d"/><text x="20" y="28" font-family="sans-serif" font-size="10" fill="%238b949e" text-anchor="middle" dy=".3em">📚</text></svg>';
  private searchTimer: any;

  constructor(private bookService: BookService, private categoryService: CategoryService, private route: ActivatedRoute) { }

  get page() { return Math.floor(this.offset / this.limit) + 1; }
  get totalPages() { return Math.ceil(this.total / this.limit); }

  ngOnInit() {
    this.categoryService.getCategories().subscribe(r => { if (r.data) this.categories = r.data; });
    this.route.queryParams.subscribe(p => { if (p['search']) this.search = p['search']; this.load(); });
  }

  load() {
    const params: any = { limit: this.limit, offset: this.offset };
    if (this.search) params.search = this.search;
    if (this.selectedCat) params.category = this.selectedCat;
    this.bookService.getBooks(params).subscribe(r => {
      if (r.data) { this.books = r.data.books; this.total = r.data.total; }
    });
  }

  onSearch() { clearTimeout(this.searchTimer); this.offset = 0; this.searchTimer = setTimeout(() => this.load(), 300); }
  selectCat(id: string | null) { this.selectedCat = id; this.offset = 0; this.load(); }
  prev() { this.offset -= this.limit; this.load(); }
  next() { this.offset += this.limit; this.load(); }
  imgErr(e: any) { e.target.src = this.fallback; }
}
