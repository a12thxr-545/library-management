import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BookService } from '../../services/book.service';
import { User, Borrow } from '../../models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <div class="layout">
        <!-- User Card -->
        <div class="card user-card">
          <div class="avatar">{{ initial }}</div>
          <div class="user-info">
            <div class="name">{{ user?.full_name || user?.username }}</div>
            <div class="username">@{{ user?.username }}</div>
            <span class="role">{{ roleLabel }}</span>
          </div>

          <table class="detail-table">
            <tr *ngIf="user?.email"><td>Email</td><td>{{ user?.email }}</td></tr>
            <tr *ngIf="user?.phone"><td>Phone</td><td>{{ user?.phone }}</td></tr>
            <tr *ngIf="user?.created_at"><td>Member since</td><td>{{ fmt(user?.created_at || '') }}</td></tr>
          </table>

          <div class="stats">
            <div class="stat"><strong>{{ total }}</strong><span>Total Borrows</span></div>
            <div class="stat"><strong>{{ active }}</strong><span>Active</span></div>
            <div class="stat"><strong>{{ totalFine.toFixed(0) }}</strong><span>Fine (฿)</span></div>
          </div>

          <a routerLink="/payment" class="btn-pay">
            <i class="material-icons" style="font-size:1rem;vertical-align:middle">payment</i>
            {{ totalFine > 0 ? 'Pay Fine ฿' + totalFine.toFixed(2) : 'Payment' }}
          </a>

        </div>

        <!-- Borrow History -->
        <div>
          <div class="tabs">
            <button class="tab" [class.active]="tab === 'all'" (click)="tab = 'all'">All ({{ total }})</button>
            <button class="tab" [class.active]="tab === 'active'" (click)="tab = 'active'">Active ({{ active }})</button>
            <button class="tab" [class.active]="tab === 'returned'" (click)="tab = 'returned'">Returned ({{ returned }})</button>
          </div>

            <div class="borrow-list" *ngIf="!loading">
              <a [routerLink]="['/books', b.book_id]" class="borrow-row clickable" *ngFor="let b of filtered">
                <img [src]="b.book_cover || fallback" [alt]="b.book_title" (error)="imgErr($event)" />
                <div class="bi">
                  <div class="bi-title">{{ b.book_title || 'Book' }}</div>
                  <div class="bi-dates">
                    <span>Borrowed {{ fmt(b.borrowed_at) }}</span>
                    <span>Due <span [style.color]="isOverdue(b) ? 'var(--danger)' : ''">{{ fmt(b.due_date) }}</span></span>
                    <span *ngIf="b.fine_amount > 0" style="color:var(--warning)">Fine ฿{{ b.fine_amount.toFixed(2) }}</span>
                  </div>
                </div>
                <span class="status" [class]="statusClass(b)">{{ statusLabel(b) }}</span>
              </a>

            <div class="empty" *ngIf="filtered.length === 0">
              <span>No records in this tab</span>
            </div>
          </div>
          <div class="loading" *ngIf="loading">Loading...</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1000px; margin: 0 auto; padding: 28px 20px; }
    .layout { display: grid; grid-template-columns: 240px 1fr; gap: 20px; align-items: start; }

    .card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
    .user-card { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 72px; }
    .avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 700; color: white; }
    .name { font-size: 1rem; font-weight: 700; }
    .username { font-size: 0.8rem; color: var(--text2); }
    .role { display: inline-block; font-size: 0.72rem; padding: 2px 8px; border-radius: 20px; background: rgba(99,102,241,0.15); color: var(--accent); border: 1px solid rgba(99,102,241,0.3); margin-top: 4px; }
    .detail-table { width: 100%; font-size: 0.8rem; border-collapse: collapse; }
    .detail-table td { padding: 5px 0; border-bottom: 1px solid var(--border); }
    .detail-table td:first-child { color: var(--text2); width: 90px; }
    .stats { display: flex; gap: 12px; }
    .stat { flex: 1; text-align: center; }
    .stat strong { display: block; font-size: 1.2rem; font-weight: 700; color: var(--accent); }
    .stat span { font-size: 0.7rem; color: var(--text3); }
    .stat span { font-size: 0.7rem; color: var(--text3); }
    .btn-pay {
      width: 100%; padding: 8px; background: rgba(210,153,34,0.15); border: 1px solid rgba(210,153,34,0.4);
      border-radius: var(--radius); color: var(--warning); font-size: 0.8rem; font-weight: 600;
      cursor: pointer; text-align: center; text-decoration: none; display: block;
    }
    .btn-pay:hover { background: rgba(210,153,34,0.25); text-decoration: none; }

    .tabs { display: flex; gap: 4px; margin-bottom: 12px; flex-wrap: wrap; }
    .tab { padding: 6px 14px; border-radius: 20px; font-size: 0.78rem; background: var(--bg2); border: 1px solid var(--border); color: var(--text2); cursor: pointer; font-family: inherit; }
    .tab.active { background: rgba(99,102,241,0.15); border-color: var(--accent); color: var(--text); }

    .borrow-list { display: flex; flex-direction: column; gap: 4px; }
    .borrow-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); text-decoration: none; color: inherit; }
    .borrow-row.clickable:hover { border-color: var(--accent); background: var(--bg3); }
    .borrow-row img { width: 36px; height: 50px; object-fit: cover; border-radius: 4px; flex-shrink: 0; background: var(--bg3); }
    .bi { flex: 1; min-width: 0; }
    .bi-title { font-size: 0.85rem; font-weight: 600; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bi-dates { display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.75rem; color: var(--text2); }
    .status { font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; flex-shrink: 0; white-space: nowrap; }
    .status.active { background: rgba(99,102,241,0.15); color: var(--accent); }
    .status.returned { background: rgba(63,185,80,0.15); color: var(--success); }
    .status.overdue { background: rgba(248,81,73,0.15); color: var(--danger); }
    .empty { padding: 24px; text-align: center; color: var(--text3); font-size: 0.85rem; }
    .loading { color: var(--text2); font-size: 0.875rem; padding: 16px; }

    @media (max-width: 768px) {
      .layout { grid-template-columns: 1fr; }
      .user-card { position: static; }
    }
    @media (max-width: 480px) {
      .page { padding: 16px 12px; }
      .bi-dates { gap: 6px; flex-direction: column; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  user: User | null = null; borrows: Borrow[] = []; loading = true; tab = 'all';
  fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="50"><rect width="36" height="50" fill="%2330363d"/><text x="18" y="25" font-family="sans-serif" font-size="10" fill="%238b949e" text-anchor="middle" dy=".3em">📚</text></svg>';

  constructor(private authService: AuthService, private bookService: BookService) { }
  get initial() { return (this.user?.full_name || this.user?.username || 'U').charAt(0).toUpperCase(); }
  get total() { return this.borrows.length; }
  get active() { return this.borrows.filter(b => b.status === 'active').length; }
  get returned() { return this.borrows.filter(b => b.status === 'returned').length; }
  get totalFine() { return this.borrows.reduce((s, b) => s + (b.fine_amount || 0), 0); }
  get filtered() {
    if (this.tab === 'active') return this.borrows.filter(b => b.status === 'active');
    if (this.tab === 'returned') return this.borrows.filter(b => b.status === 'returned');
    return this.borrows;
  }
  get roleLabel() {
    const r = this.user?.role;
    return r === 'professor' ? 'Professor' : r === 'librarian' ? 'Librarian' : 'Student';
  }

  ngOnInit() {
    this.user = this.authService.currentUser;
    this.bookService.myBorrows().subscribe(r => { if (r.data) this.borrows = r.data; this.loading = false; });
  }

  isOverdue(b: Borrow) { return b.status === 'active' && new Date(b.due_date) < new Date(); }
  statusClass(b: Borrow) { return this.isOverdue(b) ? 'overdue' : b.status; }
  statusLabel(b: Borrow) { return this.isOverdue(b) ? 'Overdue' : b.status === 'active' ? 'Active' : 'Returned'; }
  fmt(d: string) { return new Date(d).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }); }
  imgErr(e: any) { e.target.src = this.fallback; }
  logout() { this.authService.logout(); }
}
