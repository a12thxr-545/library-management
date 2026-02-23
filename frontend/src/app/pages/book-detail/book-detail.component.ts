import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { BookService } from '../../services/book.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { Book, Borrow } from '../../models';

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="page" *ngIf="book">
      <a routerLink="/books" class="back">
        <i class="material-icons" style="font-size:1rem; vertical-align:middle">arrow_back</i> Back
      </a>

      <div class="layout">
        <div class="left">
          <img [src]="book.cover_url || fallback" [alt]="book.title" (error)="imgErr($event)" class="cover" />
          <div class="action-box">
            <div class="copies">
              <span>Total</span><strong>{{ book.total_copies }} copies</strong>
              <span>Available</span><strong [style.color]="book.available_copies > 0 ? 'var(--success)' : 'var(--danger)'">{{ book.available_copies }} copies</strong>
            </div>

            <div class="borrow-form" *ngIf="!activeBorrow && book.available_copies > 0 && isLoggedIn">
              <div class="due-selector">
                 <label>Return Date</label>
                 <input type="date" [(ngModel)]="selectedDueDate" [min]="minDate" [max]="maxDate" />
              </div>

              <button class="btn primary" (click)="borrow()" [disabled]="busy">
                {{ busy ? 'Processing...' : 'Borrow Book' }}
              </button>
            </div>

            <button class="btn danger" (click)="doReturn()" *ngIf="activeBorrow && isLoggedIn" [disabled]="busy">
              {{ busy ? '...' : 'Return Book' }}
            </button>
            <div class="unavail" *ngIf="!activeBorrow && book.available_copies === 0 && isLoggedIn">Currently Unavailable</div>

            <div class="borrow-info" *ngIf="activeBorrow">
              <div class="bi-row"><span>Borrowed</span><span>{{ fmt(activeBorrow.borrowed_at) }}</span></div>
              <div class="bi-row"><span>Due Date</span><span [style.color]="overdue ? 'var(--danger)' : ''">{{ fmt(activeBorrow.due_date) }}</span></div>
            </div>

            <div class="msg success" *ngIf="msg === 'borrow'">
               <i class="material-icons" style="font-size:1rem; vertical-align:middle">check_circle</i> Borrowed successfully!
            </div>
            <div class="msg success" *ngIf="msg === 'return'">
               <i class="material-icons" style="font-size:1rem; vertical-align:middle">check_circle</i> Returned successfully!
            </div>
            <div class="msg error" *ngIf="msg === 'error'">
               <i class="material-icons" style="font-size:1rem; vertical-align:middle">error</i> Something went wrong
            </div>
          </div>
        </div>

        <div class="right">
          <div class="cat-tag" *ngIf="book.category_name">{{ book.category_name }}</div>
          <h1>{{ book.title }}</h1>
          <p class="author">{{ book.author }}</p>

          <div class="meta-row">
            <div class="meta"><strong>{{ book.view_count }}</strong><span>Views</span></div>
            <div class="meta"><strong>{{ book.borrow_count }}</strong><span>Borrows</span></div>
            <div class="meta" *ngIf="book.published_year"><strong>{{ book.published_year }}</strong><span>Year</span></div>
          </div>

          <table class="info-table" *ngIf="book.isbn || book.publisher">
            <tr *ngIf="book.isbn"><td>ISBN</td><td>{{ book.isbn }}</td></tr>
            <tr *ngIf="book.publisher"><td>Publisher</td><td>{{ book.publisher }}</td></tr>
          </table>

          <div class="desc" *ngIf="book.description">
            <h3>Description</h3>
            <p>{{ book.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="page loading" *ngIf="!book && !notFound">Loading...</div>
    <div class="page" *ngIf="notFound">
      <a routerLink="/books" class="back">
        <i class="material-icons" style="font-size:1rem; vertical-align:middle">arrow_back</i> Back
      </a>
      <p style="color:var(--text2);margin-top:20px">Book not found.</p>
    </div>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 28px 20px; }
    .back { color: var(--text2); font-size: 0.875rem; }
    .back:hover { color: var(--text); text-decoration: none; }
    .loading { color: var(--text2); }

    .layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; margin-top: 20px; }
    .cover { width: 200px; aspect-ratio: 2/3; object-fit: cover; border-radius: var(--radius); border: 1px solid var(--border); }
    .action-box { margin-top: 12px; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .copies { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; font-size: 0.8rem; align-items: center; }
    .copies span { color: var(--text2); }
    .copies strong { font-size: 0.9rem; font-weight: 700; text-align: right; }
    .btn { padding: 8px 14px; border-radius: var(--radius); font-size: 0.85rem; font-weight: 600; border: none; cursor: pointer; width: 100%; }
    .btn.primary { background: var(--accent); color: white; }
    .btn.primary:hover:not(:disabled) { background: var(--accent2); }
    .btn.danger { background: rgba(248,81,73,0.15); color: var(--danger); border: 1px solid rgba(248,81,73,0.3); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .unavail { text-align: center; color: var(--text3); font-size: 0.8rem; padding: 4px 0; }

    .borrow-form {
      padding-top: 10px; border-top: 1px solid var(--border); margin-top: 4px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .due-selector { display: flex; flex-direction: column; gap: 6px; }
    .due-selector label { font-size: 0.8rem; font-weight: 500; color: var(--text2); }
    .due-selector input {
      -webkit-appearance: none; appearance: none;
      padding: 12px 14px; background: var(--bg3); border: 1px solid var(--border);
      border-radius: 8px; color: var(--text); font-size: 1rem; font-family: inherit;
      outline: none; width: 100%; transition: border-color 0.2s;
      min-height: 44px; /* iOS friendly tap target */
    }
    .due-selector input:focus { border-color: var(--accent); }

    .borrow-info { font-size: 0.78rem; border-top: 1px solid var(--border); padding-top: 8px; }
    .bi-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .bi-row span:first-child { color: var(--text2); }
    .msg { font-size: 0.8rem; padding: 6px 10px; border-radius: 4px; text-align: center; }
    .msg.success { background: rgba(63,185,80,0.1); color: var(--success); }
    .msg.error { background: rgba(248,81,73,0.1); color: var(--danger); }

    .cat-tag { display: inline-block; background: rgba(99,102,241,0.15); color: var(--accent); font-size: 0.75rem; padding: 2px 10px; border-radius: 20px; margin-bottom: 10px; }
    h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 6px; }
    .author { color: var(--text2); font-size: 0.9rem; margin-bottom: 20px; }
    .meta-row { display: flex; gap: 24px; margin-bottom: 20px; flex-wrap: wrap; }
    .meta { display: flex; flex-direction: column; }
    .meta strong { font-size: 1.2rem; font-weight: 700; color: var(--accent); }
    .meta span { font-size: 0.72rem; color: var(--text3); }
    .info-table { width: 100%; font-size: 0.8rem; border-collapse: collapse; margin-bottom: 20px; }
    .info-table td { padding: 6px 0; border-bottom: 1px solid var(--border); }
    .info-table td:first-child { color: var(--text2); width: 100px; }
    .desc h3 { font-size: 0.875rem; font-weight: 600; margin-bottom: 8px; }
    .desc p { color: var(--text2); font-size: 0.875rem; line-height: 1.7; }

    /* Responsive */
    @media (max-width: 768px) {
      .layout { grid-template-columns: 160px 1fr; gap: 20px; }
      .cover { width: 160px; }
    }
    @media (max-width: 540px) {
      .page { padding: 16px 12px; }
      .layout { grid-template-columns: 1fr; }
      .cover { width: 100%; max-width: 200px; margin: 0 auto; display: block; }
    }
  `]
})
export class BookDetailComponent implements OnInit {
  book: Book | null = null; notFound = false;
  activeBorrow: Borrow | null = null; busy = false; msg = '';
  fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="%2330363d"/><text x="100" y="150" font-family="sans-serif" font-size="40" fill="%238b949e" text-anchor="middle" dy=".3em">📚</text></svg>';

  selectedDueDate = '';
  minDate = '';
  maxDate = '';

  constructor(private route: ActivatedRoute, private bookService: BookService, public authService: AuthService) { }
  get isLoggedIn() { return this.authService.isLoggedIn; }
  get overdue() { return this.activeBorrow ? new Date(this.activeBorrow.due_date) < new Date() : false; }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.bookService.getBook(id).subscribe(r => { if (r.data) this.book = r.data; else this.notFound = true; });
    if (this.isLoggedIn) {
      this.bookService.myBorrows().subscribe(r => {
        if (r.data) this.activeBorrow = r.data.find(b => b.book_id === id && b.status === 'active') || null;
      });
      this.initDates();
    }
  }

  initDates() {
    const now = new Date();
    const minDay = new Date(now);
    minDay.setDate(now.getDate() + 1);

    const role = this.authService.currentUser?.role;
    const maxDays = role === 'professor' ? 30 : 14;
    const maxDay = new Date(now);
    maxDay.setDate(now.getDate() + maxDays);

    this.minDate = minDay.toISOString().split('T')[0];
    this.maxDate = maxDay.toISOString().split('T')[0];
    this.selectedDueDate = this.maxDate;
  }

  borrow() {
    if (!this.book) return;
    this.busy = true;
    const dueDate = new Date(this.selectedDueDate).toISOString();
    this.bookService.borrowBook(this.book.id, dueDate).subscribe({
      next: (r) => { if (r.success) { this.msg = 'borrow'; if (this.book) this.book.available_copies--; this.ngOnInit(); } else this.msg = 'error'; this.busy = false; setTimeout(() => this.msg = '', 3000); },
      error: () => { this.msg = 'error'; this.busy = false; setTimeout(() => this.msg = '', 3000); }
    });
  }

  doReturn() {
    if (!this.activeBorrow) return;
    this.busy = true;
    this.bookService.returnBook(this.activeBorrow.id).subscribe({
      next: (r) => { if (r.success) { this.msg = 'return'; if (this.book) this.book.available_copies++; this.activeBorrow = null; } else this.msg = 'error'; this.busy = false; setTimeout(() => this.msg = '', 3000); },
      error: () => { this.msg = 'error'; this.busy = false; setTimeout(() => this.msg = '', 3000); }
    });
  }

  fmt(d: string) { return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }); }
  imgErr(e: any) { e.target.src = this.fallback; }
}
