import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BookService } from '../../services/book.service';
import { WalletService } from '../../services/wallet.service';
import { RealtimeService } from '../../services/realtime.service';
import { User, Borrow, ApiResponse, Wallet } from '../../models';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { LoadingService } from '../../services/loading.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  template: `
    <div class="page">
      <div class="top-nav">
        <a (click)="goBack()" class="back-btn">
          <i class="material-icons">arrow_back</i>
          <span>{{ 'common.return' | t }}</span>
        </a>
      </div>
      <div class="layout">
        <!-- User Card -->
        <div class="user-sidebar" *ngIf="!(loadingService.loading$ | async); else sidebarSkeleton">
          <div class="card user-card">
            <div class="avatar">{{ initial }}</div>
            <div class="user-info">
              <div class="name">{{ user?.full_name || user?.username }}</div>
              <div class="username">@{{ user?.username }}</div>
              <span class="role">{{ 'role.' + user?.role | t }}</span>
            </div>

            <table class="detail-table">
              <tr *ngIf="user?.email"><td>{{ 'profile.email' | t }}</td><td>{{ user?.email }}</td></tr>
              <tr *ngIf="user?.phone"><td>{{ 'profile.phone' | t }}</td><td>{{ user?.phone }}</td></tr>
              <tr *ngIf="user?.created_at"><td>{{ 'profile.member_since' | t }}</td><td>{{ fmt(user?.created_at || '') }}</td></tr>
            </table>

            <div class="stats">
              <div class="stat"><strong>{{ total }}</strong><span>{{ 'profile.total' | t }}</span></div>
              <div class="stat"><strong>{{ active }}</strong><span>{{ 'common.active' | t }}</span></div>
              <div class="stat"><strong [class.has-debt]="totalUnpaidFine > 0">{{ totalUnpaidFine.toFixed(0) }}</strong><span>{{ 'profile.debt' | t }} (฿)</span></div>
            </div>

            <a routerLink="/wallet" class="btn-wallet">
              <i class="material-icons" style="font-size:1rem;vertical-align:middle">account_balance_wallet</i>
              <span>{{ 'profile.wallet_balance' | t }} (฿{{ walletBalance.toFixed(2) }})</span>
            </a>

            <a routerLink="/payment" class="btn-pay" *ngIf="totalUnpaidFine > 0">
              <i class="material-icons" style="font-size:1rem;vertical-align:middle">payment</i>
              <span>{{ 'profile.pay_debt' | t }} ฿{{ totalUnpaidFine.toFixed(2) }}</span>
            </a>
          </div>

          <!-- Outstanding Debt Card -->
          <div class="card debt-alert" *ngIf="totalUnpaidFine > 0">
            <div class="debt-header">
              <i class="material-icons">report_problem</i>
              <span>{{ 'wallet.fines' | t }}</span>
              <span class="badge">{{ unpaidBorrows.length }}</span>
            </div>
            <div class="debt-items">
              <div class="debt-item" *ngFor="let b of unpaidBorrows">
                <span class="debt-name">{{ b.book_title }}</span>
                <span class="debt-val">฿{{ b.fine_amount.toFixed(2) }}</span>
              </div>
            </div>
            <div class="debt-total">
              <span>{{ 'home.view_all' | t }}</span>
              <span>฿{{ totalUnpaidFine.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- Borrow History -->
        <div>
          <div class="tabs">
            <button class="tab" [class.active]="tab === 'all'" (click)="tab = 'all'">{{ 'common.all' | t }} ({{ total }})</button>
            <button class="tab" [class.active]="tab === 'active'" (click)="tab = 'active'">{{ 'common.active' | t }} ({{ active }})</button>
            <button class="tab" [class.active]="tab === 'returned'" (click)="tab = 'returned'">{{ 'common.returned' | t }} ({{ returned }})</button>
            <button class="tab" [class.active]="tab === 'reservations'" (click)="tab = 'reservations'">{{ 'nav.reservations' | t }} ({{ reservations.length }})</button>
            <button class="tab" [class.active]="tab === 'debt'" (click)="tab = 'debt'" *ngIf="unpaidBorrows.length > 0">{{ 'profile.debt' | t }} ({{ unpaidBorrows.length }})</button>
          </div>

          <div class="borrow-list" *ngIf="tab !== 'reservations'">
            <ng-container *ngIf="!(loadingService.loading$ | async); else historySkeleton">
              <a [routerLink]="['/books', b.book_id]" class="borrow-row clickable" *ngFor="let b of filtered">
                <img [src]="b.book_cover || fallback" [alt]="b.book_title" (error)="imgErr($event)" />
                <div class="bi">
                  <div class="bi-title">{{ b.book_title || 'Book' }}</div>
                  <div class="bi-dates">
                    <span>{{ 'book.borrowed' | t }} {{ fmt(b.borrowed_at) }}</span>
                    <span>{{ 'book.return_date' | t }} <span [style.color]="isOverdue(b) ? 'var(--danger)' : ''">{{ fmt(b.due_date) }}</span></span>
                    <span *ngIf="b.fine_amount > 0" class="fine-badge" [class.paid]="b.fine_paid">
                      {{ (b.fine_paid ? 'common.returned' : 'wallet.fines') | t }} ฿{{ b.fine_amount.toFixed(2) }}
                    </span>
                  </div>
                </div>
                <span class="status" [class]="statusClass(b)">{{ ('common.' + statusClass(b)) | t }}</span>
              </a>

              <div class="empty" *ngIf="filtered.length === 0">
                <span>{{ 'common.no_records' | t }}</span>
              </div>
            </ng-container>

            <ng-template #historySkeleton>
              <div class="borrow-row" *ngFor="let s of [1,2,3,4]">
                <div class="skeleton" style="width: 36px; height: 50px; border-radius: 4px;"></div>
                <div class="bi">
                  <div class="skeleton" style="height: 14px; width: 60%; margin-bottom: 6px;"></div>
                  <div class="skeleton" style="height: 10px; width: 40%;"></div>
                </div>
                <div class="skeleton" style="height: 20px; width: 60px; border-radius: 4px;"></div>
              </div>
            </ng-template>
          </div>

          <!-- Reservations List -->
          <div class="borrow-list" *ngIf="tab === 'reservations'">
            <div class="borrow-row" *ngFor="let r of reservations">
              <img [src]="r.book_cover || fallback" [alt]="r.book_title" (error)="imgErr($event)" />
              <div class="bi">
                <div class="bi-title">{{ r.book_title }}</div>
                <div class="bi-dates">
                  <span>{{ 'common.status' | t }}: <span [style.color]="r.status === 'active' ? 'var(--success)' : 'var(--warning)'">{{ ('common.' + r.status) | t }}</span></span>
                  <span *ngIf="r.status === 'active'">{{ 'reserve.expires' | t }}: {{ fmt(r.expires_at) }}</span>
                </div>
              </div>
              <button class="cancel-btn" (click)="cancelRes(r.id)">
                <i class="material-icons">close</i>
              </button>
            </div>
            <div class="empty" *ngIf="reservations.length === 0">
              <span>{{ 'common.no_records' | t }}</span>
            </div>
          </div>
        </div>
      </div>

      <ng-template #sidebarSkeleton>
        <div class="user-sidebar">
          <div class="card user-card">
            <div class="skeleton" style="width: 56px; height: 56px; border-radius: 50%;"></div>
            <div class="user-info">
              <div class="skeleton" style="height: 18px; width: 70%; margin-bottom: 6px;"></div>
              <div class="skeleton" style="height: 14px; width: 50%;"></div>
            </div>
            <div class="skeleton" style="height: 60px; width: 100%;"></div>
            <div class="stats">
              <div class="stat" *ngFor="let s of [1,2,3]"><div class="skeleton" style="height: 20px; width: 30px; margin: 0 auto 4px;"></div><div class="skeleton" style="height: 10px; width: 40px; margin: 0 auto;"></div></div>
            </div>
            <div class="skeleton" style="height: 36px; width: 100%; border-radius: 8px;"></div>
          </div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .page { max-width: 1000px; margin: 0 auto; padding: 12px 20px 28px; }
    .top-nav { margin-bottom: 16px; display: flex; align-items: center; }
    .back-btn { 
      display: flex; align-items: center; gap: 8px; color: var(--text2); 
      cursor: pointer; text-decoration: none; font-size: 0.85rem; font-weight: 600;
      padding: 6px 12px; border-radius: 8px; transition: all 0.2s;
    }
    .back-btn:hover { background: var(--bg2); color: var(--text); }
    .back-btn i { font-size: 1.1rem; }
    .layout { display: grid; grid-template-columns: 240px 1fr; gap: 20px; align-items: start; }
    .user-sidebar { display: flex; flex-direction: column; gap:16px; position: sticky; top: 72px;}

    .card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
    .user-card { display: flex; flex-direction: column; gap: 14px; }
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
    .stat strong.has-debt { color: var(--danger); text-shadow: 0 0 10px rgba(248,81,73,0.3); }
    .stat span { font-size: 0.7rem; color: var(--text3); }
    
    .debt-alert { border-color: rgba(248,81,73,0.3); background: rgba(248,81,73,0.05); }
    .debt-header { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--danger); font-size: 0.85rem; margin-bottom: 12px; }
    .debt-header .material-icons { font-size: 1.2rem; }
    .debt-header .badge { background: var(--danger); color: white; padding: 0 6px; border-radius: 10px; font-size: 0.7rem; margin-left: auto; }
    .debt-items { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .debt-item { display: flex; justify-content: space-between; font-size: 0.75rem; border-bottom: 1px dashed var(--border); padding-bottom: 4px; }
    .debt-name { color: var(--text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
    .debt-val { color: var(--danger); font-weight: 600; }
    .debt-total { display: flex; justify-content: space-between; font-weight: 700; font-size: 0.9rem; margin-top: 4px; border-top: 1px solid var(--border); padding-top: 8px; }
    .debt-footer { margin-top: 10px; font-size: 0.7rem; color: #f85149; background: rgba(248,81,73,0.1); padding: 6px; border-radius: 4px; text-align: center; }

    .btn-pay {
      width: 100%; padding: 8px; background: rgba(210,153,34,0.15); border: 1px solid rgba(210,153,34,0.4);
      border-radius: var(--radius); color: var(--warning); font-size: 0.8rem; font-weight: 600;
      cursor: pointer; text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; gap:6px;
    }
    .btn-pay:hover { background: rgba(210,153,34,0.25); text-decoration: none; }
    .btn-wallet {
      width: 100%; padding: 8px; background: rgba(9,105,218,0.1); border: 1px solid rgba(9,105,218,0.3);
      border-radius: var(--radius); color: var(--accent); font-size: 0.8rem; font-weight: 600;
      cursor: pointer; text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; gap:6px;
    }
    .btn-wallet:hover { background: rgba(9,105,218,0.2); text-decoration: none; }

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
    .fine-badge { font-weight: 600; padding: 1px 6px; border-radius: 4px; background: rgba(248,81,73,0.1); color: var(--danger); font-size: 0.7rem; border: 1px solid rgba(248,81,73,0.2); }
    .fine-badge.paid { background: rgba(63,185,80,0.1); color: var(--success); border-color: rgba(63,185,80,0.2); }
    
    .status.returned { background: rgba(63,185,80,0.15); color: var(--success); }
    .status.overdue { background: rgba(248,81,73,0.15); color: var(--danger); }
    .cancel-btn { background: none; border: none; color: var(--text3); cursor: pointer; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .cancel-btn:hover { background: rgba(248,81,73,0.1); color: var(--danger); }
    .cancel-btn i { font-size: 1.2rem; }
    .empty { padding: 24px; text-align: center; color: var(--text3); font-size: 0.85rem; }
    .loading { color: var(--text2); font-size: 0.875rem; padding: 16px; }

    @media (max-width: 768px) {
      .layout { grid-template-columns: 1fr; }
      .user-sidebar { position: static; }
    }
  `]
})
export class ProfileComponent implements OnInit, OnDestroy {
  user: User | null = null; borrows: Borrow[] = []; reservations: any[] = []; loading = true; tab = 'all';
  walletBalance = 0;
  fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="50"><rect width="36" height="50" fill="%2330363d"/><text x="18" y="25" font-family="sans-serif" font-size="10" fill="%238b949e" text-anchor="middle" dy=".3em">📚</text></svg>';
  private sub: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private bookService: BookService,
    private walletService: WalletService,
    private realtime: RealtimeService,
    private location: Location,
    public loadingService: LoadingService,
    private languageService: LanguageService
  ) { }
  get initial() { return (this.user?.full_name || this.user?.username || 'U').charAt(0).toUpperCase(); }
  get total() { return this.borrows.length; }
  get active() { return this.borrows.filter(b => b.status === 'active').length; }
  get returned() { return this.borrows.filter(b => b.status === 'returned').length; }
  get unpaidBorrows() { return this.borrows.filter(b => b.fine_amount > 0 && !b.fine_paid); }
  get totalUnpaidFine() { return this.unpaidBorrows.reduce((s, b) => s + (b.fine_amount || 0), 0); }
  get filtered() {
    if (this.tab === 'active') return this.borrows.filter(b => b.status === 'active');
    if (this.tab === 'returned') return this.borrows.filter(b => b.status === 'returned');
    if (this.tab === 'debt') return this.unpaidBorrows;
    return this.borrows;
  }
  get roleLabel() {
    const r = this.user?.role;
    return r === 'professor' ? 'Professor' : r === 'librarian' ? 'Librarian' : r === 'addmin' ? 'Admin' : 'Student';
  }

  ngOnInit() {
    this.user = this.authService.currentUser;
    this.fetchData();

    // Listen for realtime updates
    this.sub = this.realtime.messages$.subscribe(msg => {
      const events = ['WALLET_UPDATED', 'BORROW_CREATED', 'BORROW_RETURNED', 'BORROW_UPDATED', 'USER_UPDATED'];
      if (events.includes(msg.event)) {
        console.log('[Profile] Realtime update:', msg.event);
        this.fetchData(false); // Reload without showing global spinner

        // If it's a user update and it's ME, refresh the auth profile
        if (msg.event === 'USER_UPDATED' && msg.payload.user_id === this.user?.id) {
          this.authService.refreshProfile();
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  fetchData(showLoading = true) {
    if (showLoading) this.loading = true;
    this.bookService.myBorrows().subscribe((r: ApiResponse<Borrow[]>) => {
      if (r.data) this.borrows = r.data;
      this.loading = false;
    });
    // Fetch reservations
    this.bookService.getReservations().subscribe(r => {
      if (r.data) this.reservations = r.data;
    });
  }

  cancelRes(id: string) {
    if (!confirm(this.languageService.lang === 'en' ? 'Cancel this reservation?' : 'ยืนยันการยกเลิกการจองนี้?')) return;
    this.bookService.cancelReservation(id).subscribe(r => {
      if (r.success) this.fetchData(false);
    });
  }

  isOverdue(b: Borrow) { return b.status === 'active' && new Date(b.due_date) < new Date(); }
  statusClass(b: Borrow) { return this.isOverdue(b) ? 'overdue' : b.status; }
  statusLabel(b: Borrow) { return this.isOverdue(b) ? 'Overdue' : b.status === 'active' ? 'Active' : 'Returned'; }
  fmt(d: string) {
    const l = this.languageService.lang;
    return new Date(d).toLocaleDateString(l === 'th' ? 'th-TH' : 'en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  imgErr(e: any) { e.target.src = this.fallback; }
  logout() { this.authService.logout(); }
  goBack() { this.location.back(); }
}
