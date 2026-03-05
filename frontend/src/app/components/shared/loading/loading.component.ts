import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../services/loading.service';

@Component({
    selector: 'app-loading',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="loading-container" *ngIf="loadingService.loading$ | async">
      <div class="progress-bar"></div>
    </div>
  `,
    styles: [`
    .loading-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      z-index: 9999;
      pointer-events: none;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent) 0%, #a371f7 50%, var(--accent) 100%);
      background-size: 200% 100%;
      animation: progress 1.5s infinite linear, shimmer 2s infinite ease-out;
      width: 100%;
      box-shadow: 0 0 10px var(--accent);
    }
    @keyframes progress {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class LoadingComponent {
    constructor(public loadingService: LoadingService) { }
}
