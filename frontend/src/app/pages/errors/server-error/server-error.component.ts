import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-server-error',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="error-page">
      <div class="content fade-in">
        <div class="icon-wrapper">
          <i class="material-icons info-icon">error_outline</i>
          <div class="pulse"></div>
        </div>
        
        <h1 class="error-title">Database Connection Issue</h1>
        <p>Our server is currently having trouble connecting to the database. This is usually temporary and we're looking into it.</p>
        
        <div class="error-details">
          <div class="status">
            <span class="dot"></span>
            Status: 500 Internal Server Error
          </div>
          <p class="hint">Check your DATABASE_URL or Postgres status.</p>
        </div>

        <div class="actions">
          <button (click)="retry()" class="btn-primary">
            <i class="material-icons">refresh</i>
            Try Again
          </button>
          <button (click)="contact()" class="btn-text">
            Check Server Status
          </button>
        </div>
      </div>
      
      <div class="grid-bg"></div>
    </div>
  `,
    styles: [`
    .error-page {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a; /* Custom dark deep blue */
      color: #f8fafc;
      overflow: hidden;
      position: relative;
    }

    .content {
      text-align: center;
      z-index: 10;
      max-width: 460px;
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(20px);
      padding: 48px;
      border-radius: 32px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .icon-wrapper {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .info-icon {
      font-size: 3rem;
      color: #ef4444; /* Bright red */
      z-index: 2;
    }

    .pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      background: rgba(239, 68, 68, 0.2);
      border-radius: 50%;
      animation: pulse 2s ease-out infinite;
    }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    .error-title {
      font-size: 1.75rem;
      font-weight: 800;
      margin-bottom: 12px;
      background: linear-gradient(to right, #fff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    p {
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 32px;
    }

    .error-details {
      background: rgba(15, 23, 42, 0.5);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 32px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-family: monospace;
      font-size: 0.85rem;
      color: #ef4444;
      margin-bottom: 4px;
    }

    .dot {
      width: 8px;
      height: 8px;
      background: #ef4444;
      border-radius: 50%;
    }

    .hint {
      font-size: 0.75rem;
      color: #64748b;
      margin-bottom: 0;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn-primary {
      background: #ef4444;
      color: white;
      border: none;
      padding: 14px;
      border-radius: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover {
      background: #dc2626;
      transform: translateY(-2px);
    }

    .btn-text {
      background: none;
      border: none;
      color: #64748b;
      font-size: 0.9rem;
      cursor: pointer;
      padding: 8px;
    }

    .btn-text:hover { color: #f8fafc; }

    .grid-bg {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0);
      background-size: 40px 40px;
      z-index: 1;
    }

    .fade-in { animation: fadeIn 0.8s ease-out; }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class ServerErrorComponent {
    retry() {
        window.location.reload();
    }

    contact() {
        // Check server status or other logic
        alert('Server status check is not implemented.');
    }
}
