import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookService } from '../../services/book.service';
import { RealtimeService } from '../../services/realtime.service';
import { Borrow } from '../../models';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Location } from '@angular/common';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-admin-borrows',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="page">
      <div class="header">
        <a (click)="goBack()" class="back-btn"><i class="material-icons">arrow_back</i> {{ 'common.return' | t }}</a>
        <h1>{{ 'admin.borrows.title' | t }}</h1>
        <p>{{ 'admin.borrows.sub' | t }}</p>
      </div>

      <div class="stats-row" *ngIf="!(loadingService.loading$ | async); else statsSkeleton">
        <div class="stat-box clickable" (click)="filter = 'active'" [class.active-stat]="filter === 'active'">
          <span class="val">{{ activeCount }}</span>
          <span class="lbl">{{ 'admin.borrows.active' | t }}</span>
        </div>
        <div class="stat-box clickable" (click)="filter = 'overdue'" [class.active-stat]="filter === 'overdue'">
          <span class="val">{{ overdueCount }}</span>
          <span class="lbl danger">{{ 'common.overdue' | t }}</span>
        </div>
        <div class="stat-box clickable" (click)="filter = 'all'" [class.active-stat]="filter === 'all'">
          <span class="val">{{ borrows.length }}</span>
          <span class="lbl">{{ 'admin.borrows.all' | t }}</span>
        </div>
      </div>
      <ng-template #statsSkeleton>
        <div class="stats-row">
          <div class="stat-box" *ngFor="let s of [1,2,3]">
             <div class="skeleton" style="height: 32px; width: 40px; margin-bottom: 8px;"></div>
             <div class="skeleton" style="height: 14px; width: 80px;"></div>
          </div>
        </div>
      </ng-template>

      <div class="filter-bar">
        <button class="filter-btn" [class.active]="filter === 'all'" (click)="filter = 'all'">{{ 'common.all' | t }}</button>
        <button class="filter-btn" [class.active]="filter === 'active'" (click)="filter = 'active'">{{ 'admin.borrows.active' | t }}</button>
        <button class="filter-btn" [class.active]="filter === 'overdue'" (click)="filter = 'overdue'">{{ 'common.overdue' | t }}</button>
        <button class="filter-btn" [class.active]="filter === 'returned'" (click)="filter = 'returned'">{{ 'common.returned' | t }}</button>
      </div>

      <div class="table-container">
        <table *ngIf="filteredBorrows.length > 0 || (loadingService.loading$ | async)">
          <thead>
            <tr>
               <th>{{ 'nav.members' | t }}</th>
              <th>{{ 'book.details' | t }}</th>
              <th>{{ 'book.borrowed' | t }}</th>
              <th>{{ 'book.return_date' | t }}</th>
              <th>{{ 'common.status' | t }}</th>
              <th>{{ 'wallet.fines' | t }}</th>
            </tr>
          </thead>
          <tbody *ngIf="!(loadingService.loading$ | async); else borrowsSkeleton">
            <tr *ngFor="let b of filteredBorrows">
              <td>
                <div class="user-info">
                  <span class="name">{{ b.user_full_name || ('common.anonymous' | t) }}</span>
                  <span class="username">@{{ b.username }}</span>
                </div>
              </td>
              <td>
                <div class="book-info">
                  <img [src]="b.book_cover || fallback" (error)="imgErr($event)" class="mini-cover" />
                  <span class="title">{{ b.book_title }}</span>
                </div>
              </td>
              <td>{{ b.borrowed_at | date:'mediumDate' }}</td>
              <td>
                <span [class.overdue]="isOverdue(b.due_date, b.status)">
                  {{ b.due_date | date:'mediumDate' }}
                </span>
              </td>
              <td>
                <span class="badge" [class]="b.status">{{ ('common.' + b.status) | t }}</span>
              </td>
              <td>
               <span *ngIf="b.fine_amount > 0" class="fine">
                  ฿{{ b.fine_amount }} <small>({{ b.fine_paid ? (('nav.payment' | t) + ' ' + ('common.returned' | t)) : ('profile.debt' | t) }})</small>
                </span>
                <span *ngIf="b.fine_amount === 0" class="no-fine">-</span>
              </td>
            </tr>
          </tbody>
          <ng-template #borrowsSkeleton>
            <tbody>
              <tr *ngFor="let s of [1,2,3,4,5]">
                <td><div class="user-info"><div class="skeleton" style="height: 16px; width: 120px; margin-bottom: 6px;"></div><div class="skeleton" style="height: 12px; width: 80px;"></div></div></td>
                <td><div class="book-info"><div class="skeleton" style="width: 40px; height: 60px; border-radius: 4px;"></div><div class="skeleton" style="height: 16px; width: 140px;"></div></div></td>
                <td><div class="skeleton" style="height: 14px; width: 80px;"></div></td>
                <td><div class="skeleton" style="height: 14px; width: 80px;"></div></td>
                <td><div class="skeleton" style="height: 24px; width: 80px; border-radius: 10px;"></div></td>
                <td><div class="skeleton" style="height: 14px; width: 100px;"></div></td>
              </tr>
            </tbody>
          </ng-template>
        </table>

        <div class="empty" *ngIf="borrows.length === 0">
          <i class="material-icons">info_outline</i>
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
    h1 { font-size: 2rem; font-weight: 800; color: var(--text); }
    p { color: var(--text3); }

    .stats-row { display: flex; gap: 20px; margin-bottom: 32px; }
    .stat-box.clickable { cursor: pointer; transition: all 0.2s; }
    .stat-box.clickable:hover { border-color: var(--accent); transform: translateY(-2px); }
    .stat-box.active-stat { border-color: var(--accent); background: rgba(56,139,253,0.05); }

    .filter-bar { display: flex; gap: 8px; margin-bottom: 20px; }
    .filter-btn { 
      padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;
      background: var(--bg2); border: 1px solid var(--border); color: var(--text2); 
      cursor: pointer; transition: all 0.2s;
    }
    .filter-btn:hover { border-color: var(--text3); }
    .filter-btn.active { background: var(--accent); border-color: var(--accent); color: white; }

    .table-container { 
      background: var(--bg2); border: 1px solid var(--border); 
      border-radius: 16px; overflow: hidden; 
    }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 16px; background: var(--bg3); color: var(--text2); font-size: 0.85rem; font-weight: 600; }
    td { padding: 16px; border-top: 1px solid var(--border); color: var(--text); vertical-align: middle; }
    
    .user-info { display: flex; flex-direction: column; }
    .user-info .name { font-weight: 700; color: var(--text); }
    .user-info .username { font-size: 0.8rem; color: var(--text3); }

    .book-info { display: flex; align-items: center; gap: 12px; }
    .mini-cover { width: 40px; height: 60px; object-fit: cover; border-radius: 4px; background: var(--bg3); }
    .book-info .title { font-weight: 600; font-size: 0.95rem; }

    .badge { padding: 4px 10px; border-radius: 10px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .badge.active { background: rgba(56,139,253,0.1); color: var(--accent); }
    .badge.returned { background: rgba(63,185,80,0.1); color: #3fb950; }
    .badge.overdue { background: rgba(248,81,73,0.1); color: var(--danger); }

    .overdue { color: var(--danger); font-weight: 700; }
    .fine { color: var(--danger); font-weight: 600; }
    .no-fine { color: var(--text3); }

    .empty { padding: 60px; text-align: center; color: var(--text3); }
    .empty i { font-size: 3rem; margin-bottom: 12px; }

    @media (max-width: 768px) {
      .stats-row { flex-direction: column; }
      .table-container { overflow-x: auto; }
      table { min-width: 700px; }
      .filter-bar { overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
      .filter-bar::-webkit-scrollbar { display: none; }
      .filter-btn { white-space: nowrap; }
    }
    @media (max-width: 480px) {
      .page { padding: 24px 16px; }
      h1 { font-size: 1.6rem; }
    }
  `]
})
export class AdminBorrowsComponent implements OnInit, OnDestroy {
  borrows: Borrow[] = [];
  filter: 'all' | 'active' | 'overdue' | 'returned' = 'all';
  fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="60"><rect width="40" height="60" fill="%2330363d"/></svg>';
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
      if (msg.event === 'BORROW_CREATED' || msg.event === 'BORROW_RETURNED' || msg.event === 'BORROW_UPDATED') {
        this.fetchData();
      }
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  fetchData() {
    this.bookService.getAllBorrows().subscribe(r => {
      this.borrows = r.data || [];
    });
  }

  get activeCount() {
    return this.borrows.filter(b => b.status === 'active' && new Date(b.due_date) >= new Date()).length;
  }
  get overdueCount() {
    return this.borrows.filter(b => b.status === 'overdue' || (b.status === 'active' && new Date(b.due_date) < new Date())).length;
  }

  get filteredBorrows() {
    const now = new Date();
    if (this.filter === 'all') return this.borrows;
    if (this.filter === 'active') {
      return this.borrows.filter(b => b.status === 'active' && new Date(b.due_date) >= now);
    }
    if (this.filter === 'overdue') {
      return this.borrows.filter(b => b.status === 'overdue' || (b.status === 'active' && new Date(b.due_date) < now));
    }
    if (this.filter === 'returned') {
      return this.borrows.filter(b => b.status === 'returned');
    }
    return this.borrows;
  }

  isOverdue(dueDate: string, status: string): boolean {
    if (status === 'returned') return false;
    return new Date(dueDate) < new Date();
  }

  imgErr(e: any) { e.target.src = this.fallback; }
}
