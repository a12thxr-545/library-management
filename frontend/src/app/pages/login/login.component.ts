import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo"><i class="material-icons">local_library</i> LibraryTH</div>
        <h1>Sign In</h1>

        <div class="alert" *ngIf="error">{{ error }}</div>

        <form (ngSubmit)="login()">
          <div class="field">
            <label>Username</label>
            <input type="text" [(ngModel)]="username" name="username" placeholder="Enter your username" required />
          </div>
          <div class="field">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" name="password" placeholder="Enter your password" required />
          </div>
          <button type="submit" class="btn-submit" [disabled]="loading">
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <p class="auth-link">Don't have an account? <a routerLink="/register">Register</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 20px; }
    .auth-card { width: 100%; max-width: 360px; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 32px; }
    .auth-logo { font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; }
    h1 { font-size: 1.1rem; font-weight: 600; color: var(--text2); margin-bottom: 24px; }
    .alert { background: rgba(248,81,73,0.1); border: 1px solid rgba(248,81,73,0.4); color: var(--danger); padding: 10px 12px; border-radius: var(--radius); font-size: 0.85rem; margin-bottom: 16px; }
    .field { margin-bottom: 14px; }
    label { display: block; font-size: 0.8rem; color: var(--text2); margin-bottom: 6px; font-weight: 500; }
    input {
      width: 100%; padding: 8px 12px; background: var(--bg);
      border: 1px solid var(--border); border-radius: var(--radius);
      color: var(--text); font-size: 0.875rem; outline: none; font-family: inherit;
    }
    input:focus { border-color: var(--accent); }
    .btn-submit {
      width: 100%; padding: 9px; background: var(--accent); color: white;
      border: none; border-radius: var(--radius); font-size: 0.875rem;
      font-weight: 600; margin-top: 8px; cursor: pointer; font-family: inherit;
    }
    .btn-submit:hover:not(:disabled) { background: var(--accent2); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .auth-link { text-align: center; margin-top: 20px; color: var(--text2); font-size: 0.8rem; }
    @media (max-width: 400px) {
      .auth-card { padding: 24px 20px; }
    }
  `]
})
export class LoginComponent {
  username = ''; password = ''; error = ''; loading = false;
  constructor(private authService: AuthService, private router: Router) { }
  login() {
    if (!this.username || !this.password) { this.error = 'Please fill in all fields'; return; }
    this.loading = true; this.error = '';
    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        if (res.success) this.router.navigate(['/home']);
        else { this.error = res.message || 'Login failed'; this.loading = false; }
      },
      error: () => { this.error = 'Invalid username or password'; this.loading = false; }
    });
  }
}
