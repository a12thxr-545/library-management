import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../services/loading.service';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-bar-wrap" *ngIf="loadingService.loading$ | async">
      <div class="loading-bar"></div>
    </div>
    <div class="loading-overlay" *ngIf="loadingService.loading$ | async">
      <div class="spinner-ring">
        <div></div><div></div><div></div><div></div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Top Progress Bar ── */
    .loading-bar-wrap {
      position: fixed; top: 0; left: 0; right: 0;
      height: 3px; z-index: 10000; pointer-events: none;
      overflow: hidden;
    }
    .loading-bar {
      height: 100%;
      background: linear-gradient(90deg, #0969da, #a371f7, #54aeff, #0969da);
      background-size: 300% 100%;
      animation: barSlide 1.5s ease-in-out infinite, shimmerBar 2s infinite;
      box-shadow: 0 0 12px rgba(56,139,253,0.7);
    }
    @keyframes barSlide {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @keyframes shimmerBar {
      0%   { background-position: 0% 0; }
      100% { background-position: 300% 0; }
    }
  `]
})
export class LoadingComponent {
  constructor(public loadingService: LoadingService) { }
}
