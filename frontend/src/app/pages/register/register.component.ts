import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo"><i class="material-icons">local_library</i> LibraryTH</div>
        <h1>Create Account</h1>

        <div class="alert" *ngIf="error">{{ error }}</div>

        <form (ngSubmit)="register()">
          <div class="row2">
            <div class="field">
              <label>Username *</label>
              <input type="text" [(ngModel)]="form.username" name="username" placeholder="username" required />
            </div>
            <div class="field">
              <label>Role</label>
              <select [(ngModel)]="form.role" name="role">
                <option value="student">Student</option>
                <option value="professor">Professor</option>
              </select>
            </div>
          </div>
          <div class="field">
            <label>Full Name</label>
            <input type="text" [(ngModel)]="form.full_name" name="full_name" placeholder="First Last" />
          </div>
          <div class="field">
            <label>Email</label>
            <input type="email" [(ngModel)]="form.email" name="email" placeholder="example@email.com" />
          </div>
          <div class="row2">
            <div class="field">
              <label>Password *</label>
              <input type="password" [(ngModel)]="form.password" name="password" required />
            </div>
            <div class="field">
              <label>Confirm Password *</label>
              <input type="password" [(ngModel)]="confirm" name="confirm" required />
            </div>
          </div>
          <button type="submit" class="btn-submit" [disabled]="loading">
            {{ loading ? 'Creating account...' : 'Create Account' }}
          </button>
        </form>

        <p class="auth-link">Already have an account? <a routerLink="/login">Sign in</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); padding: 20px; }
    .auth-card { width: 100%; max-width: 440px; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 32px; }
    .auth-logo { font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; }
    h1 { font-size: 1.1rem; font-weight: 600; color: var(--text2); margin-bottom: 24px; }
    .alert { background: rgba(248,81,73,0.1); border: 1px solid rgba(248,81,73,0.4); color: var(--danger); padding: 10px 12px; border-radius: var(--radius); font-size: 0.85rem; margin-bottom: 16px; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { margin-bottom: 14px; }
    label { display: block; font-size: 0.8rem; color: var(--text2); margin-bottom: 6px; font-weight: 500; }
    input, select {
      width: 100%; padding: 10px 12px; background: var(--bg);
      border: 1px solid var(--border); border-radius: var(--radius);
      color: var(--text); font-size: 0.875rem; outline: none; font-family: inherit;
      box-sizing: border-box;
    }
    select {
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 12px center;
      background-size: 16px;
      padding-right: 40px;
    }
    input:focus, select:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(9,105,218,0.1); }
    .btn-submit {
      width: 100%; padding: 12px; background: var(--accent); color: white;
      border: none; border-radius: var(--radius); font-size: 0.95rem;
      font-weight: 700; margin-top: 10px; cursor: pointer; font-family: inherit;
      transition: all 0.2s;
    }
    .btn-submit:hover:not(:disabled) { background: var(--accent2); transform: translateY(-1px); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .auth-link { text-align: center; margin-top: 24px; color: var(--text2); font-size: 0.85rem; }
    @media (max-width: 500px) {
      .auth-card { padding: 24px 20px; border: none; background: transparent; }
      .row2 { grid-template-columns: 1fr; gap: 0; }
      h1 { text-align: center; font-size: 1.5rem; }
      .auth-logo { text-align: center; justify-content: center; display: flex; align-items: center; gap: 8px; }
    }
  `]
})
export class RegisterComponent {
  form = { username: '', email: '', password: '', full_name: '', role: 'student' };
  confirm = ''; error = ''; loading = false;
  constructor(private authService: AuthService, private router: Router) { }
  register() {
    if (!this.form.username || !this.form.password) { this.error = 'Please fill in username and password'; return; }
    if (this.form.username.length < 3) { this.error = 'Username must be at least 3 characters'; return; }
    if (this.form.password.length < 6) { this.error = 'Password must be at least 6 characters'; return; }
    if (this.form.password !== this.confirm) { this.error = 'Passwords do not match'; return; }
    this.loading = true; this.error = '';
    this.authService.register(this.form).subscribe({
      next: (res) => {
        if (res.success) { this.router.navigate(['/interests']); }
        else { this.error = res.message || 'Registration failed'; this.loading = false; }
      },
      error: (err) => {
        const status = err.status;
        const msg = err.error?.message || '';
        if (status === 0) {
          this.error = 'Cannot connect to server — please ensure the backend is running';
        } else if (status === 409 || msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('already')) {
          this.error = 'Username already taken, please choose another';
        } else if (msg) {
          this.error = msg;
        } else {
          this.error = `Registration failed (Error ${status || 'unknown'})`;
        }
        this.loading = false;
      }
    });
  }
}
