import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookService } from '../../services/book.service';
import { Borrow } from '../../models';

@Component({
    selector: 'app-admin-borrows',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page">
      <div class="header">
        <h1>Management: Borrowing Records</h1>
        <p>Monitor all active and past book loans across the library</p>
      </div>

      <div class="stats-row">
        <div class="stat-box">
          <span class="val">{{ activeCount }}</span>
          <span class="lbl">Active Loans</span>
        </div>
        <div class="stat-box">
          <span class="val">{{ overdueCount }}</span>
          <span class="lbl danger">Overdue</span>
        </div>
      </div>

      <div class="table-container">
        <table *ngIf="borrows.length > 0">
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Book Details</th>
              <th>Borrowed At</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Fines</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let b of borrows">
              <td>
                <div class="user-info">
                  <span class="name">{{ b.user_full_name || 'Anonymous' }}</span>
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
                <span class="badge" [class]="b.status">{{ b.status }}</span>
              </td>
              <td>
                <span *ngIf="b.fine_amount > 0" class="fine">
                  ฿{{ b.fine_amount }} <small>({{ b.fine_paid ? 'Paid' : 'Unpaid' }})</small>
                </span>
                <span *ngIf="b.fine_amount === 0" class="no-fine">-</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="empty" *ngIf="borrows.length === 0">
          <i class="material-icons">info_outline</i>
          <p>No borrowing records found.</p>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
    .header { margin-bottom: 32px; }
    h1 { font-size: 2rem; font-weight: 800; color: var(--text); }
    p { color: var(--text3); }

    .stats-row { display: flex; gap: 20px; margin-bottom: 32px; }
    .stat-box { 
      background: var(--bg2); border: 1px solid var(--border); 
      padding: 20px; border-radius: 16px; min-width: 160px;
    }
    .stat-box .val { display: block; font-size: 1.8rem; font-weight: 800; color: var(--accent); }
    .stat-box .lbl { font-size: 0.85rem; color: var(--text3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .lbl.danger { color: var(--danger); }

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
  `]
})
export class AdminBorrowsComponent implements OnInit {
    borrows: Borrow[] = [];
    fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="60"><rect width="40" height="60" fill="%2330363d"/></svg>';

    constructor(private bookService: BookService) { }

    ngOnInit() {
        this.bookService.getAllBorrows().subscribe(r => {
            this.borrows = r.data || [];
        });
    }

    get activeCount() { return this.borrows.filter(b => b.status === 'active').length; }
    get overdueCount() { return this.borrows.filter(b => b.status === 'overdue').length; }

    isOverdue(dueDate: string, status: string): boolean {
        if (status === 'returned') return false;
        return new Date(dueDate) < new Date();
    }

    imgErr(e: any) { e.target.src = this.fallback; }
}
