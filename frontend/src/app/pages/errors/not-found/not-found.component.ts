import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-not-found',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="error-page">
      <div class="content fade-in">
        <div class="glitch-wrapper">
          <div class="error-code" data-text="404">404</div>
        </div>
        <div class="icon-stack">
          <i class="material-icons main-icon">sentiment_very_dissatisfied</i>
          <i class="material-icons decoration-1">search</i>
          <i class="material-icons decoration-2">auto_stories</i>
        </div>
        <h1>Lost in the Stacks?</h1>
        <p>The page you're looking for has been misplaced or moved to a secret collection.</p>
        
        <div class="actions">
          <a routerLink="/home" class="btn-primary">
            <i class="material-icons">home</i>
            Back to Home
          </a>
          <button (click)="goBack()" class="btn-outline">
            <i class="material-icons">arrow_back</i>
            Go Back
          </button>
        </div>
      </div>
      
      <div class="background-decor">
        <div class="floating-book b1"></div>
        <div class="floating-book b2"></div>
        <div class="floating-book b3"></div>
      </div>
    </div>
  `,
    styles: [`
    .error-page {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg);
      overflow: hidden;
      position: relative;
    }

    .content {
      text-align: center;
      z-index: 10;
      max-width: 500px;
      padding: 0 24px;
    }

    .error-code {
      font-size: 8rem;
      font-weight: 900;
      line-height: 1;
      color: var(--accent);
      position: relative;
      margin-bottom: 24px;
      letter-spacing: -2px;
      text-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
    }

    .icon-stack {
      position: relative;
      height: 100px;
      margin-bottom: 24px;
    }

    .main-icon {
      font-size: 4rem;
      color: var(--text3);
    }

    .decoration-1, .decoration-2 {
      position: absolute;
      font-size: 1.5rem;
      color: var(--accent);
      opacity: 0.5;
      animation: float 3s ease-in-out infinite;
    }

    .decoration-1 { top: 10px; right: 40%; animation-delay: 0.5s; }
    .decoration-2 { bottom: 10px; left: 40%; }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 16px;
      color: var(--text);
    }

    p {
      font-size: 1.1rem;
      color: var(--text2);
      margin-bottom: 40px;
      line-height: 1.6;
    }

    .actions {
      display: flex;
      gap: 16px;
      justify-content: center;
    }

    .btn-primary, .btn-outline {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 28px;
      border-radius: 14px;
      font-weight: 600;
      transition: all 0.3s;
      cursor: pointer;
      text-decoration: none;
    }

    .btn-primary {
      background: var(--accent);
      color: white;
      border: none;
      box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);
    }

    .btn-primary:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 30px rgba(99, 102, 241, 0.4);
    }

    .btn-outline {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
    }

    .btn-outline:hover {
      background: var(--bg2);
      border-color: var(--text3);
    }

    .background-decor .floating-book {
      position: absolute;
      width: 100px;
      height: 140px;
      background: var(--bg2);
      border: 2px solid var(--border);
      border-radius: 8px;
      opacity: 0.1;
      z-index: 1;
    }

    .b1 { top: 10%; left: 10%; transform: rotate(-15deg); }
    .b2 { bottom: 10%; right: 10%; transform: rotate(15deg); }
    .b3 { top: 40%; right: 20%; transform: rotate(5deg); }

    .fade-in {
      animation: fadeIn 0.8s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 600px) {
      .error-code { font-size: 6rem; }
      h1 { font-size: 1.8rem; }
      .actions { flex-direction: column; }
    }
  `]
})
export class NotFoundComponent {
    goBack() {
        window.history.back();
    }
}
