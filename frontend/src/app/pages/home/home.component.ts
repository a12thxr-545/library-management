import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { BookService } from '../../services/book.service';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { Book, Category } from '../../models';

import { InterestService } from '../../services/interest.service';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <!-- Welcome & Search -->
      <div class="hero">
        <h1>Simplify your reading journey</h1>
        <div class="search-bar">
          <div class="input-group">
            <i class="material-icons">search</i>
            <input [(ngModel)]="search" (keyup.enter)="goSearch()" placeholder="Find books, authors, or categories..." />
          </div>
          <button class="search-btn" (click)="goSearch()">Search</button>
        </div>
      </div>

      <!-- Stats row -->
      <div class="stats-grid">
        <div class="stat-card"><strong>{{ totalBooks }}</strong><span>Books available</span></div>
        <div class="stat-card"><strong>{{ categories.length }}</strong><span>Categories</span></div>
        <div class="stat-card"><strong>{{ loanDays }}</strong><span>Day borrowing</span></div>
      </div>

      <!-- Recommended for You (Based on interests) -->
      <section class="recommended-section" *ngIf="recommendedBooks.length > 0">
        <div class="section-header">
          <div class="title-with-subtitle">
            <h2>Recommended for You</h2>
            <p>Based on your interests</p>
          </div>
          <a routerLink="/interests" class="link-settings"><i class="material-icons">settings</i> Update Interests</a>
        </div>
        <div class="book-grid">
          <div class="book-card highlight" *ngFor="let b of recommendedBooks" [routerLink]="['/books', b.id]">
            <div class="cover-wrap">
              <img [src]="b.cover_url || fallback" [alt]="b.title" (error)="imgErr($event)" />
              <div class="category-tag">{{ b.category_name }}</div>
            </div>
            <div class="info-wrap">
              <div class="info-title">{{ b.title }}</div>
              <div class="info-author">{{ b.author }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- New Books -->
      <section>
        <div class="section-header">
          <h2>New Arrivals</h2>
          <a routerLink="/books" class="link-all">View All <i class="material-icons">chevron_right</i></a>
        </div>
        <div class="book-grid">
          <div class="book-card" *ngFor="let b of newBooks" [routerLink]="['/books', b.id]">
            <div class="cover-wrap"><img [src]="b.cover_url || fallback" [alt]="b.title" (error)="imgErr($event)" /></div>
            <div class="info-wrap">
              <div class="info-title">{{ b.title }}</div>
              <div class="info-author">{{ b.author }}</div>
              <span class="info-badge" [class.danger]="b.available_copies === 0">
                {{ b.available_copies > 0 ? (b.available_copies + ' available') : 'Borrowed' }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Popular Books -->
      <section>
        <div class="section-header">
          <h2>Most Popular</h2>
          <a routerLink="/books" class="link-all">View All <i class="material-icons">chevron_right</i></a>
        </div>
        <div class="book-grid">
          <div class="book-card" *ngFor="let b of popularBooks" [routerLink]="['/books', b.id]">
            <div class="cover-wrap"><img [src]="b.cover_url || fallback" [alt]="b.title" (error)="imgErr($event)" /></div>
            <div class="info-wrap">
              <div class="info-title">{{ b.title }}</div>
              <div class="info-author">{{ b.author }}</div>
              <span class="info-badge">{{ b.borrow_count }} borrows</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Explore Categories -->
      <section>
        <div class="section-header"><h2>Explore Topics</h2></div>
        <div class="category-list">
          <a class="topic-chip" *ngFor="let c of categories" [routerLink]="['/categories']" [queryParams]="{selected: c.id}">
             {{ c.name }} <small>({{ c.book_count }})</small>
          </a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
    
    .hero { text-align: center; margin-bottom: 48px; }
    .hero h1 { font-size: 2rem; font-weight: 800; margin-bottom: 24px; color: var(--text); }
    
    .search-bar { 
      display: flex; gap: 12px; max-width: 600px; margin: 0 auto;
    }
    .input-group { 
      flex: 1; background: var(--bg2); border: 2px solid var(--border); border-radius: 16px;
      display: flex; align-items: center; padding: 0 16px; transition: border-color 0.2s, box-shadow 0.2s;
    }
    .input-group:focus-within { border-color: var(--accent); box-shadow: 0 0 0 4px rgba(56,139,253,0.15); }
    .input-group i { color: var(--text3); font-size: 1.5rem; margin-right: 12px; }
    .input-group input { 
      background: none; border: none; color: var(--text); padding: 14px 0; font-size: 1.1rem;
      outline: none; width: 100%; font-family: inherit;
    }
    .search-btn {
      background: var(--accent); color: white; border: none; padding: 0 24px;
      border-radius: 16px; font-weight: 700; font-family: inherit; cursor: pointer;
      transition: transform 0.1s, opacity 0.2s;
    }
    .search-btn:hover { opacity: 0.95; transform: translateY(-1px); }
    .search-btn:active { transform: translateY(0); }

    .stats-grid { 
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 60px;
    }
    .stat-card { 
      background: linear-gradient(135deg, var(--bg2), var(--bg3)); border: 1px solid var(--border); 
      padding: 24px; border-radius: 20px; text-align: center;
    }
    .stat-card strong { display: block; font-size: 1.8rem; font-weight: 800; color: var(--accent); margin-bottom: 4px; }
    .stat-card span { font-size: 0.85rem; color: var(--text3); font-weight: 500; }

    section { margin-bottom: 60px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .section-header h2 { font-size: 1.5rem; font-weight: 700; }
    .link-all { color: var(--accent); font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 2px; font-size: 0.95rem; }
    .link-all:hover { text-decoration: underline; }

    .book-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 24px; }
    .book-card { 
      background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; 
      overflow: hidden; cursor: pointer; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      display: flex; flex-direction: column;
    }
    .book-card:hover { transform: translateY(-6px); border-color: var(--accent); box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
    .cover-wrap { width: 100%; aspect-ratio: 2/3; background: var(--bg3); display: flex; align-items: center; justify-content: center; }
    .cover-wrap img { width: 100%; height: 100%; object-fit: cover; }
    
    .info-wrap { padding: 16px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .info-title { font-size: 1rem; font-weight: 700; color: var(--text); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .info-author { font-size: 0.85rem; color: var(--text3); margin-bottom: 4px; }
    .info-badge { font-size: 0.75rem; font-weight: 700; padding: 4px 8px; border-radius: 8px; background: rgba(56,139,253,0.1); color: var(--accent); align-self: start; margin-top: auto; }
    .info-badge.danger { background: rgba(248,81,73,0.1); color: var(--danger); }

    /* Recommended Styles */
    .recommended-section { 
      background: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.1); 
      border-radius: 24px; padding: 32px; margin-bottom: 60px;
    }
    .title-with-subtitle h2 { margin-bottom: 4px; }
    .title-with-subtitle p { font-size: 0.9rem; color: var(--text3); }
    .link-settings { color: var(--text3); text-decoration: none; display: flex; align-items: center; gap: 6px; font-size: 0.85rem; padding: 6px 12px; border-radius: 8px; transition: all 0.2s; }
    .link-settings:hover { background: var(--bg3); color: var(--text); }
    .book-card.highlight { border-color: rgba(99,102,241,0.2); }
    .book-card.highlight:hover { border-color: var(--accent); }
    .category-tag { 
      position: absolute; bottom: 8px; left: 8px; 
      background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; 
      border-radius: 6px; font-size: 0.7rem; font-weight: 600; backdrop-filter: blur(4px);
    }
    .cover-wrap { position: relative; }

    .category-list { display: flex; flex-wrap: wrap; gap: 12px; }
    .topic-chip {
      padding: 10px 20px; background: var(--bg2); border: 1px solid var(--border);
      border-radius: 30px; font-size: 0.95rem; color: var(--text); font-weight: 500; text-decoration: none;
      transition: all 0.2s;
    }
    .topic-chip:hover { border-color: var(--accent); background: var(--accent); color: white; transform: scale(1.05); }
    .topic-chip small { opacity: 0.7; font-weight: 400; font-size: 0.8rem; }

    @media (max-width: 1200px) {
      .book-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    }
    @media (max-width: 900px) {
      .hero h1 { font-size: 1.8rem; }
      .book-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; }
      .stat-card { padding: 16px; }
      .stat-card strong { font-size: 1.5rem; }
    }
    @media (max-width: 640px) {
      .page { padding: 24px 16px; }
      .hero h1 { font-size: 1.4rem; }
      .search-bar { flex-direction: column; }
      .search-btn { padding: 14px; }
      .stats-grid { grid-template-columns: 1fr; gap: 12px; }
      .book-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .info-title { font-size: 0.9rem; }
    }
  `]
})
export class HomeComponent implements OnInit {
  newBooks: Book[] = []; popularBooks: Book[] = []; categories: Category[] = [];
  recommendedBooks: Book[] = [];
  search = ''; totalBooks = 0;
  fallback = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
    <rect width="200" height="300" fill="%231a1b26"/>
    <path d="M40 0h140a20 20 0 0 1 20 20v260a20 20 0 0 1-20 20H40a20 20 0 0 1-20-20V20A20 20 0 0 1 40 0z" fill="%2324283b"/>
    <rect x="40" y="40" width="120" height="10" rx="5" fill="%23414868" opacity="0.5"/>
    <rect x="40" y="65" width="80" height="10" rx="5" fill="%23414868" opacity="0.5"/>
    <path d="M20 20v260c0 11 9 20 20 20h10V20c0-11-9-20-20-20z" fill="%2316161e"/>
  </svg>`;

  constructor(
    private bookService: BookService,
    private categoryService: CategoryService,
    private interestService: InterestService,
    public authService: AuthService,
    private router: Router
  ) { }

  get loanDays() { return this.authService.currentUser?.role === 'professor' ? 30 : 14; }

  ngOnInit() {
    this.bookService.getNewBooks().subscribe(r => { if (r.data) this.newBooks = r.data.slice(0, 6); });
    this.bookService.getPopularBooks().subscribe(r => { if (r.data) this.popularBooks = r.data.slice(0, 6); });
    this.categoryService.getCategories().subscribe(r => { if (r.data) this.categories = r.data; });
    this.bookService.getBooks({}).subscribe(r => { if (r.data) this.totalBooks = r.data.total; });
    this.interestService.getRecommendations().subscribe(r => { if (r.data) this.recommendedBooks = r.data; });
  }

  goSearch() { if (this.search.trim()) this.router.navigate(['/books'], { queryParams: { search: this.search } }); }
  imgErr(e: any) { e.target.src = this.fallback; }
}
