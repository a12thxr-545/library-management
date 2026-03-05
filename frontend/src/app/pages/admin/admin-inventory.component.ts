import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookService } from '../../services/book.service';
import { RealtimeService } from '../../services/realtime.service';
import { Book } from '../../models';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Location } from '@angular/common';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page">
      <div class="header">
        <a (click)="goBack()" class="back-btn"><i class="material-icons">arrow_back</i> {{ 'common.return' | t }}</a>
        <h1>{{ 'admin.inventory.title' | t }}</h1>
        <p>{{ 'admin.inventory.sub' | t }}</p>
      </div>

      <div class="search-bar">
        <i class="material-icons">search</i>
        <input type="text" [(ngModel)]="search" (ngModelChange)="filter()" [placeholder]="'home.search_placeholder' | t" />
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>{{ 'nav.books' | t }}</th>
              <th>ISBN</th>
              <th>{{ 'admin.inventory.status' | t }}</th>
              <th>{{ 'admin.inventory.stats' | t }}</th>
              <th>{{ 'common.status' | t }}</th>
            </tr>
          </thead>
          <tbody *ngIf="!(loadingService.loading$ | async); else inventorySkeleton">
            <tr *ngFor="let b of filteredBooks">
              <td>
                <div class="book-cell">
                  <img [src]="b.cover_url || fallback" (error)="imgErr($event)" />
                  <div class="info">
                    <span class="title">{{ b.title }}</span>
                    <span class="author">{{ b.author }}</span>
                  </div>
                </div>
              </td>
              <td class="isbn">{{ b.isbn || '-' }}</td>
              <td>
                <div class="stock">
                  <span class="val">{{ b.available_copies }} / {{ b.total_copies }}</span>
                  <div class="bar-bg">
                    <div class="bar-fg" [style.width.%]="(b.available_copies / b.total_copies) * 100" [class.low]="b.available_copies === 0"></div>
                  </div>
                </div>
              </td>
              <td>
                <div class="stats">
                  <span class="row"><i class="material-icons">visibility</i> {{ b.view_count }} {{ 'book.views' | t }}</span>
                  <span class="row"><i class="material-icons">history</i> {{ b.borrow_count }} {{ 'book.borrows' | t }}</span>
                </div>
              </td>
              <td>
                <span class="status-pill" [class]="b.status">{{ ('common.' + b.status) | t }}</span>
              </td>
            </tr>
          </tbody>
          <ng-template #inventorySkeleton>
            <tbody>
              <tr *ngFor="let s of [1,2,3,4,5]">
                <td><div class="book-cell"><div class="skeleton" style="width: 44px; height: 64px; border-radius: 4px;"></div><div class="info"><div class="skeleton" style="height: 16px; width: 120px; margin-bottom: 6px;"></div><div class="skeleton" style="height: 12px; width: 80px;"></div></div></div></td>
                <td><div class="skeleton" style="height: 14px; width: 100px;"></div></td>
                <td><div class="stock"><div class="skeleton" style="height: 14px; width: 60px; align-self: flex-end; margin-bottom: 6px;"></div><div class="skeleton" style="height: 6px; width: 100%;"></div></div></td>
                <td><div class="stats"><div class="skeleton" style="height: 12px; width: 80px; margin-bottom: 6px;"></div><div class="skeleton" style="height: 12px; width: 80px;"></div></div></td>
                <td><div class="skeleton" style="height: 24px; width: 80px; border-radius: 20px;"></div></td>
              </tr>
            </tbody>
          </ng-template>
        </table>

        <div class="empty" *ngIf="filteredBooks.length === 0">
           <i class="material-icons">search_off</i>
           <p>{{ 'common.no_records' | t }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
    .header { margin-bottom: 32px; position: relative; }
    .back-btn { 
      display: inline-flex; align-items: center; gap: 8px; color: var(--text2); 
      text-decoration: none; font-weight: 600; margin-bottom: 24px; cursor: pointer;
    }
    h1 { font-size: 2rem; font-weight: 800; color: var(--text); margin-bottom: 8px; }
    p { color: var(--text3); font-size: 1.05rem; }

    .search-bar { 
      margin-bottom: 24px; position: relative; display: flex; align-items: center;
      background: var(--bg2); border: 1px solid var(--border); border-radius: 12px;
      padding: 0 16px;
    }
    .search-bar i { color: var(--text3); margin-right: 12px; }
    .search-bar input { 
      flex: 1; background: none; border: none; padding: 14px 0; 
      color: var(--text); font-size: 1rem; outline: none;
    }

    .table-container { background: var(--bg2); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 18px; background: var(--bg3); color: var(--text2); font-size: 0.85rem; font-weight: 710; }
    td { padding: 18px; border-top: 1px solid var(--border); vertical-align: middle; }

    .book-cell { display: flex; align-items: center; gap: 14px; }
    .book-cell img { width: 44px; height: 64px; border-radius: 4px; object-fit: cover; background: var(--bg3); }
    .book-cell .info { display: flex; flex-direction: column; }
    .book-cell .title { font-weight: 700; color: var(--text); }
    .book-cell .author { font-size: 0.8rem; color: var(--text3); }

    .isbn { font-family: monospace; color: var(--text3); font-size: 0.85rem; }

    .stock { display: flex; flex-direction: column; gap: 6px; width: 120px; }
    .stock .val { font-size: 0.85rem; font-weight: 800; color: var(--text); text-align: right; }
    .bar-bg { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .bar-fg { height: 100%; background: var(--accent); border-radius: 3px; }
    .bar-fg.low { background: var(--danger); }

    .stats { display: flex; flex-direction: column; gap: 4px; }
    .stats .row { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text2); }
    .stats i { font-size: 1rem; color: var(--text3); }

    .status-pill { 
      padding: 4px 10px; border-radius: 20px; font-size: 0.72rem; 
      font-weight: 800; text-transform: uppercase;
    }
    .status-pill.available { background: rgba(63,185,80,0.1); color: #3fb950; }
    .status-pill.borrowed { background: rgba(56,139,253,0.1); color: var(--accent); }
    .status-pill.reserved { background: rgba(163,113,247,0.1); color: #a371f7; }

    .empty { padding: 100px; text-align: center; color: var(--text3); }
    .empty i { font-size: 4rem; opacity: 0.5; margin-bottom: 20px; }

    @media (max-width: 900px) {
      th:nth-child(2), td:nth-child(2), th:nth-child(4), td:nth-child(4) { display: none; }
    }
    @media (max-width: 600px) {
      .page { padding: 24px 16px; }
      h1 { font-size: 1.5rem; }
      td, th { padding: 12px; }
      .book-cell .title { font-size: 0.9rem; }
      .table-container { overflow-x: auto; }
      table { min-width: 400px; }
    }
  `]
})
export class AdminInventoryComponent implements OnInit, OnDestroy {
  books: Book[] = []; filteredBooks: Book[] = []; search = '';
  fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="64"><rect width="44" height="64" fill="%2330363d"/></svg>';
  private sub: Subscription | null = null;

  constructor(
    private bookService: BookService,
    private realtime: RealtimeService,
    public loadingService: LoadingService,
    private location: Location
  ) { }

  goBack() { this.location.back(); }

  ngOnInit() {
    this.fetchData();

    // Listen for realtime updates
    this.sub = this.realtime.messages$.subscribe(msg => {
      const events = ['BOOK_STOCK_UPDATED', 'BORROW_CREATED', 'BORROW_RETURNED', 'BORROW_UPDATED'];
      if (events.includes(msg.event)) {
        this.fetchData();
      }
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  fetchData() {
    this.bookService.getBooks({ limit: 100 }).subscribe(r => {
      this.books = r.data?.books || [];
      this.filter(); // Maintain current search filter
    });
  }

  filter() {
    const q = this.search.toLowerCase();
    this.filteredBooks = this.books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.isbn && b.isbn.includes(q))
    );
  }

  imgErr(e: any) { e.target.src = this.fallback; }
}
