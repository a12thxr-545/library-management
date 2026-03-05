import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InterestService } from '../../services/interest.service';
import { Book } from '../../models';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  providers: [],
  template: `
    <div class="page">
      <div class="header">
        <div class="title-area">
          <h1>Recommended for You</h1>
          <p>Based on your selected interests</p>
        </div>
        <button routerLink="/interests" class="btn-edit">
          <i class="material-icons">settings</i> Edit Interests
        </button>
      </div>

      <div class="book-grid" *ngIf="loading">
        <div class="book-card" *ngFor="let s of [1,2,3,4,5,6,7,8]">
          <div class="skeleton" style="aspect-ratio: 2/3; width: 100%;"></div>
          <div class="info-wrap">
            <div class="skeleton" style="height: 18px; width: 80%; margin-bottom: 8px;"></div>
            <div class="skeleton" style="height: 14px; width: 50%;"></div>
          </div>
        </div>
      </div>

      <div class="book-grid" *ngIf="!loading && books.length > 0">
        <div class="book-card highlight" *ngFor="let b of books" [routerLink]="['/books', b.id]">
          <div class="cover-wrap">
            <img [src]="b.cover_url || fallback" [alt]="b.title" (error)="imgErr($event)" />
            <div class="category-tag">{{ b.category_name }}</div>
          </div>
          <div class="info-wrap">
            <div class="info-title">{{ b.title }}</div>
            <div class="info-author">{{ b.author }}</div>
            <div class="info-stats">
              <span class="borrows"><i class="material-icons">trending_up</i> {{ b.borrow_count }}</span>
              <span class="status" [class.danger]="b.available_copies === 0">
                {{ b.available_copies > 0 ? (b.available_copies + ' available') : 'Borrowed' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!loading && books.length === 0">
        <i class="material-icons">error_outline</i>
        <p>We couldn't find any books matching your interests yet.</p>
        <button routerLink="/home" class="btn-primary">Browse All Books</button>
      </div>
      
      <div class="actions" *ngIf="!loading && books.length > 0">
         <button routerLink="/home" class="btn-home">Go to Home <i class="material-icons">arrow_forward</i></button>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 60px 24px; min-height: 80vh; }
    
    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 48px; border-bottom: 1px solid var(--border); padding-bottom: 24px; }
    h1 { font-size: 2.5rem; font-weight: 800; color: var(--text); margin-bottom: 8px; }
    p { color: var(--text3); font-size: 1.1rem; }
    
    .btn-edit { background: var(--bg2); border: 1px solid var(--border); color: var(--text2); padding: 10px 20px; border-radius: 12px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; font-family: inherit; }
    .btn-edit:hover { background: var(--bg3); color: var(--text); border-color: var(--text3); }

    .book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 32px; }
    .book-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .book-card:hover { transform: translateY(-8px); border-color: var(--accent); box-shadow: 0 15px 30px rgba(0,0,0,0.3); }
    
    .cover-wrap { position: relative; aspect-ratio: 2/3; background: var(--bg3); }
    .cover-wrap img { width: 100%; height: 100%; object-fit: cover; }
    
    .category-tag { position: absolute; top: 12px; left: 12px; background: rgba(56,139,253,0.9); color: white; padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; }
    
    .info-wrap { padding: 20px; display: flex; flex-direction: column; gap: 8px; }
    .info-title { font-size: 1.1rem; font-weight: 700; color: var(--text); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .info-author { color: var(--text3); font-size: 0.9rem; }
    
    .info-stats { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 0.8rem; font-weight: 600; }
    .borrows { display: flex; align-items: center; gap: 4px; color: var(--accent); }
    .borrows i { font-size: 1rem; }
    .status { color: var(--accent); }
    .status.danger { color: var(--danger); }

    .loading { text-align: center; padding: 100px 0; }
    .spinner { width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state { text-align: center; padding: 100px 20px; }
    .empty-state i { font-size: 4rem; color: var(--text3); margin-bottom: 16px; }
    .btn-primary { background: var(--accent); color: white; border: none; padding: 12px 32px; border-radius: 12px; font-weight: 700; margin-top: 24px; cursor: pointer; }

    .actions { margin-top: 60px; text-align: center; }
    .btn-home { background: none; border: 2px solid var(--accent); color: var(--accent); padding: 14px 40px; border-radius: 16px; font-weight: 800; display: inline-flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s; font-family: inherit; }
    .btn-home:hover { background: var(--accent); color: white; }

    @media (max-width: 768px) {
      .header { flex-direction: column; align-items: flex-start; gap: 20px; }
      h1 { font-size: 1.8rem; }
      .book-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
    }
  `]
})
export class RecommendationsComponent implements OnInit {
  books: Book[] = [];
  loading = true;
  fallback = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
    <rect width="200" height="300" fill="%231a1b26"/>
    <path d="M40 0h140a20 20 0 0 1 20 20v260a20 20 0 0 1-20 20H40a20 20 0 0 1-20-20V20A20 20 0 0 1 40 0z" fill="%2324283b"/>
    <rect x="40" y="40" width="120" height="10" rx="5" fill="%23414868" opacity="0.5"/>
    <rect x="40" y="65" width="80" height="10" rx="5" fill="%23414868" opacity="0.5"/>
    <path d="M20 20v260c0 11 9 20 20 20h10V20c0-11-9-20-20-20z" fill="%2316161e"/>
  </svg>`;

  constructor(private interestService: InterestService) { }

  ngOnInit() {
    this.interestService.getRecommendations().subscribe({
      next: (r) => {
        this.books = r.data || [];
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  imgErr(e: any) { e.target.src = this.fallback; }
}
