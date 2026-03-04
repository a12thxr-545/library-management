import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="nav">
      <div class="nav-inner">
        <a routerLink="/home" class="logo">
          <i class="material-icons">local_library</i> LibraryTH
        </a>

        <div class="nav-links" [class.open]="menuOpen" (click)="menuOpen = false">
          <a routerLink="/books" routerLinkActive="active"><i class="material-icons">book</i> Books</a>
          <a routerLink="/categories" routerLinkActive="active"><i class="material-icons">category</i> Categories</a>
          <a routerLink="/wallet" routerLinkActive="active"><i class="material-icons">account_balance_wallet</i> Wallet</a>
          <a routerLink="/payment" routerLinkActive="active"><i class="material-icons">payments</i> Payment</a>
          <a *ngIf="isLibrarian" routerLink="/admin/borrows" routerLinkActive="active" class="admin-link"><i class="material-icons">history_edu</i> Loans</a>
          <a *ngIf="isLibrarian" routerLink="/admin/users" routerLinkActive="active" class="admin-link"><i class="material-icons">people</i> Members</a>
          <button class="mobile-only" (click)="clearCache()"><i class="material-icons">cached</i> Clear Cache</button>
          <div class="dropdown-divider mobile-only"></div>
          <a routerLink="/profile" routerLinkActive="active" class="mobile-only"><i class="material-icons">person</i> Profile</a>
          <button class="menu-signout" (click)="logout()"><i class="material-icons">logout</i> Sign Out</button>
        </div>

        <div class="nav-right">
          <button class="theme-btn" (click)="themeService.toggleTheme()" [title]="themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
            <i class="material-icons">{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</i>
          </button>

          <span class="role-tag" *ngIf="user">{{ roleLabel }}</span>
          
          <div class="user-dropdown-container desktop-only">
            <div class="user-meta">
              <a routerLink="/profile" class="user-link">
                <span class="avatar">{{ initial }}</span>
                <span class="uname">{{ user?.full_name || user?.username }}</span>
              </a>
              <button class="dropdown-trigger" (click)="dropdownOpen = !dropdownOpen" [class.active]="dropdownOpen" title="Menu">
                <i class="material-icons">{{ dropdownOpen ? 'close' : 'menu' }}</i>
              </button>
            </div>
            
            <div class="dropdown-menu" [class.show]="dropdownOpen" (click)="dropdownOpen = false">
              <a routerLink="/books" class="dropdown-item">
                <i class="material-icons">book</i> Books
              </a>
              <a routerLink="/categories" class="dropdown-item">
                <i class="material-icons">category</i> Categories
              </a>
              <a routerLink="/payment" class="dropdown-item">
                <i class="material-icons">payments</i> Payment
              </a>
              <a routerLink="/wallet" class="dropdown-item">
                <i class="material-icons">account_balance_wallet</i> Wallet
              </a>
              <a *ngIf="isLibrarian" routerLink="/admin/borrows" class="dropdown-item">
                <i class="material-icons">history_edu</i> Loan Records
              </a>
              <a *ngIf="isLibrarian" routerLink="/admin/users" class="dropdown-item">
                <i class="material-icons">people</i> Member Directory
              </a>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" (click)="clearCache()">
                <i class="material-icons">cached</i> Clear Cache
              </button>
              <a routerLink="/profile" class="dropdown-item">
                <i class="material-icons">person</i> View Profile
              </a>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item logout" (click)="logout()">
                <i class="material-icons">logout</i> Sign Out
              </button>
            </div>
          </div>

          <!-- Mobile Only Avatar (Link to profile) -->
          <a routerLink="/profile" class="mobile-avatar" *ngIf="user">
            <span class="avatar">{{ initial }}</span>
          </a>

          <!-- Hamburger — far right on mobile -->
          <button class="hamburger" (click)="menuOpen = !menuOpen" [class.open]="menuOpen">
            <i class="material-icons">{{ menuOpen ? 'close' : 'menu' }}</i>
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: var(--bg2); border-bottom: 1px solid var(--border);
      height: 56px;
    }
    .nav-inner {
      max-width: 1200px; margin: 0 auto; padding: 0 24px;
      height: 100%; display: flex; align-items: center; gap: 16px;
    }
    .logo { font-weight: 700; font-size: 1rem; color: var(--text); text-decoration: none; flex-shrink: 0; display: flex; align-items: center; gap: 6px; }
    .logo:hover { text-decoration: none; }

    .nav-links { display: flex; gap: 4px; }
    .nav-links a, .nav-links button {
      display: flex; align-items: center; gap: 8px;
    }
    .nav-links a {
      color: var(--text2); text-decoration: none; padding: 6px 12px;
      border-radius: var(--radius); font-size: 0.875rem; transition: color 0.15s, background 0.15s;
    }
    .nav-links a:hover { color: var(--text); background: var(--bg3); text-decoration: none; }
    .nav-links a.active { color: var(--text); background: var(--bg3); }
    .nav-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }

    .role-tag {
      font-size: 0.7rem; padding: 2px 8px; border-radius: 20px;
      background: rgba(99,102,241,0.15); color: var(--accent);
      border: 1px solid rgba(99,102,241,0.3); white-space: nowrap;
    }
    .user-meta {
      display: flex; align-items: center; background: var(--bg3);
      border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden;
    }
    .user-link {
      display: flex; align-items: center; gap: 8px; color: var(--text);
      text-decoration: none; font-size: 0.875rem; padding: 4px 10px;
      transition: background 0.2s;
    }
    .user-link:hover { background: rgba(255,255,255,0.05); text-decoration: none; }
    
    .dropdown-trigger {
      background: none; border: none; border-left: 1px solid var(--border);
      color: var(--text3); padding: 4px 8px; cursor: pointer; display: flex;
      align-items: center; transition: all 0.2s;
    }
    .dropdown-trigger:hover, .dropdown-trigger.active { color: var(--accent); background: rgba(255,255,255,0.05); }
    .dropdown-trigger i { font-size: 1.2rem; }

    .avatar {
      width: 24px; height: 24px; border-radius: 50%;
      background: var(--accent); display: flex; align-items: center;
      justify-content: center; font-size: 0.75rem; font-weight: 700; color: white;
      flex-shrink: 0;
    }

    .user-dropdown-container { position: relative; }
    .dropdown-menu {
      position: absolute; top: calc(100% + 8px); right: 0;
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); width: 180px; padding: 6px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      display: flex; flex-direction: column; z-index: 1000;
      opacity: 0; visibility: hidden; pointer-events: none;
      transform: translateY(-10px);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .dropdown-menu.show { opacity: 1; visibility: visible; pointer-events: auto; transform: translateY(0); }
    .dropdown-item {
      padding: 10px 12px; font-size: 0.875rem; color: var(--text);
      text-decoration: none; border-radius: 6px; border: none; background: none;
      display: flex; align-items: center; gap: 10px; cursor: pointer;
      text-align: left; transition: all 0.2s; font-family: inherit;
    }
    .dropdown-item:hover { background: var(--bg3); color: var(--accent); }
    .dropdown-divider { height: 1px; background: var(--border); margin: 6px 0; }
    .dropdown-item.logout { color: var(--danger); }
    .dropdown-item.logout:hover { background: rgba(248,81,73,0.1); color: var(--danger); }
    .dropdown-item i { font-size: 1.2rem; }

    /* Sign Out inside mobile hamburger menu */
    .menu-signout {
      width: 100%; text-align: left; background: none; border: none;
      border-top: 1px solid var(--border); margin-top: 8px; padding: 14px 16px;
      font-size: 0.95rem; font-family: inherit; color: var(--danger); cursor: pointer;
      display: flex; align-items: center; gap: 12px; transition: background 0.2s;
    }
    .menu-signout:hover { background: rgba(248,81,73,0.08); }

    .theme-btn {
      background: none; border: none; color: var(--text2);
      display: flex; align-items: center; justify-content: center;
      padding: 6px; border-radius: 50%; transition: background 0.2s; cursor: pointer;
    }
    .theme-btn:hover { background: var(--bg3); color: var(--text); }
    .theme-btn i { font-size: 1.25rem; }

    .dropdown-divider.mobile-only { display: none; margin: 8px 0; }
    .mobile-only { display: none; }
    .mobile-avatar { display: none; text-decoration: none; }
    .desktop-only { display: block; }

    /* Hamburger (hidden on desktop/tablet) */
    .hamburger { display: none; background: none; border: none; color: var(--text2); padding: 6px; cursor: pointer; }
    .hamburger i { font-size: 1.4rem; }

    /* Responsive - Changed breakpoint from 768 to 640 to keep iPad Mini in desktop mode */
    @media (min-width: 641px) {
      .nav-links { display: none; } /* Hide main links because they are in dropdown */
    }

    @media (max-width: 640px) {
      .nav-inner { padding: 0 16px; gap: 8px; }
      .hamburger { display: flex; align-items: center; }
      .desktop-only { display: none; }
      .mobile-avatar { display: block; }
      .role-tag { display: none; }
      .menu-signout { display: flex; color: var(--danger); }

      .nav-links {
        position: fixed; top: 56px; left: 0; right: 0; bottom: 0;
        background: var(--bg); border-top: 1px solid var(--border);
        flex-direction: column; gap: 4px; padding: 12px;
        transform: translateX(100%); opacity: 0; pointer-events: none;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s;
        z-index: 99; overflow-y: auto;
      }
      .nav-links.open { transform: translateX(0); opacity: 1; pointer-events: auto; }
      .nav-links a, .nav-links button:not(.mobile-avatar) { 
        padding: 14px 16px; font-size: 1rem; border-radius: 12px; 
        color: var(--text); background: var(--bg2); border: 1px solid var(--border);
        display: flex; align-items: center; gap: 12px; width: 100%;
        text-align: left;
      }
      .nav-links a:active, .nav-links button:active { background: var(--bg3); }
      .dropdown-divider.mobile-only { display: block; height: 1px; width: 100%; margin: 8px 0; background: var(--border); }
      .mobile-only { display: flex !important; margin-bottom: 4px; }
      .nav-links .admin-link { border-color: rgba(9,105,218,.2); color: var(--accent); }
    }

    @media (max-width: 480px) {
      .nav-inner { padding: 0 12px; }
    }
  `]
})
export class NavbarComponent {
  menuOpen = false;
  dropdownOpen = false;
  constructor(public authService: AuthService, public themeService: ThemeService, private router: Router) { }
  get user() { return this.authService.currentUser; }
  get initial() { return (this.user?.full_name || this.user?.username || 'U').charAt(0).toUpperCase(); }
  get roleLabel() {
    const r = this.user?.role;
    return r === 'professor' ? 'Professor' : r === 'librarian' ? 'Librarian' : 'Student';
  }
  get isLibrarian() { return this.user?.role === 'librarian'; }
  logout() { this.authService.logout(); }
  clearCache() {
    if (confirm('ยืนยันล้างแคชและรีโหลดแอปหรือไม่?')) {
      window.location.reload();
    }
  }
}
