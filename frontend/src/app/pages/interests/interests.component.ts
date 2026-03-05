import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CategoryService } from '../../services/category.service';
import { InterestService } from '../../services/interest.service';
import { Category } from '../../models';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-interests',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="interests-page">
      <div class="card">
        <h1>What are you interested in?</h1>
        <p>Select at least 3 categories to help us recommend the best books for you.</p>

        <div class="alert" *ngIf="error">{{ error }}</div>
        
        <div class="category-grid" *ngIf="!(loadingService.loading$ | async); else skeleton">
          <div 
            *ngFor="let cat of categories" 
            class="cat-card" 
            [class.selected]="isSelected(cat.id)"
            (click)="toggleSelection(cat.id)"
            [style.border-color]="isSelected(cat.id) ? cat.color : ''"
          >
            <i class="material-icons cat-icon" [style.color]="cat.color">{{ cat.icon }}</i>
            <span class="name">{{ cat.name }}</span>
            <div class="check" *ngIf="isSelected(cat.id)" [style.background]="cat.color">
              <i class="material-icons">check</i>
            </div>
          </div>
        </div>

        <ng-template #skeleton>
          <div class="category-grid">
            <div class="cat-card" *ngFor="let s of [1,2,3,4,5,6,7,8]">
               <div class="skeleton" style="width: 50px; height: 50px; border-radius: 50%;"></div>
               <div class="skeleton" style="height: 14px; width: 80px; margin-top: 10px;"></div>
            </div>
          </div>
        </ng-template>

        <div class="actions">
          <button 
            class="btn-primary" 
            [disabled]="selectedIds.size < 1 || loading" 
            (click)="save()"
          >
            {{ loading ? 'Saving...' : 'Finish Setup (' + selectedIds.size + ' selected)' }}
          </button>
          <button class="btn-skip" (click)="skip()">Skip for now</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .interests-page {
      min-height: calc(100vh - 56px);
      display: flex; align-items: center; justify-content: center;
      padding: 40px 20px; background: var(--bg);
    }
    .card {
      max-width: 800px; width: 100%;
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 24px; padding: 40px; text-align: center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
    }
    h1 { font-size: 2rem; font-weight: 800; margin-bottom: 12px; color: var(--text); }
    p { color: var(--text3); margin-bottom: 40px; font-size: 1.1rem; }

    .alert { background: rgba(248,81,73,0.1); border: 1px solid rgba(248,81,73,0.4); color: var(--danger); padding: 12px; border-radius: 12px; margin-bottom: 24px; font-size: 0.9rem; }

    .category-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px; margin-bottom: 40px;
    }
    .cat-card {
      background: var(--bg3); border: 2px solid transparent;
      border-radius: 20px; padding: 24px 16px; cursor: pointer;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    .cat-card:hover { transform: translateY(-4px); background: var(--border); }
    .cat-card.selected { background: var(--bg2); transform: scale(1.05); }
    
    .cat-icon { font-size: 2.8rem; margin-bottom: 4px; opacity: 0.9; }
    .name { font-weight: 700; color: var(--text); font-size: 0.95rem; }
    
    .check {
      position: absolute; top: 10px; right: 10px;
      width: 24px; height: 24px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 16px;
    }
    .check i { font-size: 16px; }

    .actions { display: flex; flex-direction: column; gap: 12px; align-items: center; }
    .btn-primary {
      padding: 14px 40px; background: var(--accent); color: white;
      border: none; border-radius: 12px; font-weight: 800; font-size: 1.1rem;
      cursor: pointer; transition: all 0.2s; width: 100%; max-width: 300px;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .btn-primary:not(:disabled):hover { opacity: 0.9; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(56,139,253,0.3); }
    
    .btn-skip {
      background: none; border: none; color: var(--text3);
      font-size: 0.9rem; cursor: pointer; text-decoration: underline;
    }
    .btn-skip:hover { color: var(--text); }

    @media (max-width: 600px) {
      .card { padding: 24px; border-radius: 0; position: fixed; inset: 0; max-height: 100vh; overflow-y: auto; }
      .category-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class InterestsComponent implements OnInit {
  categories: Category[] = [];
  selectedIds = new Set<string>();
  loading = false;
  error = '';

  constructor(
    private categoryService: CategoryService,
    private interestService: InterestService,
    private router: Router,
    public loadingService: LoadingService
  ) { }

  ngOnInit() {
    this.categoryService.getCategories().subscribe(r => {
      if (r.data) this.categories = r.data;
    });
  }

  toggleSelection(id: string) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  isSelected(id: string) {
    return this.selectedIds.has(id);
  }

  save() {
    this.loading = true;
    this.error = '';
    this.interestService.setInterests(Array.from(this.selectedIds)).subscribe({
      next: () => {
        this.router.navigate(['/recommended']);
      },
      error: (err) => {
        this.loading = false;
        this.error = 'Failed to save interests. Please ensure the backend server is running and restarted.';
        console.error(err);
      }
    });
  }

  skip() {
    this.router.navigate(['/home']);
  }
}
