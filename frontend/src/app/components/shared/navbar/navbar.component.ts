import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';
import { RealtimeService } from '../../../services/realtime.service';
import { LanguageService } from '../../../services/language.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <nav class="nav">
      <div class="nav-inner">
        <a routerLink="/home" class="logo">
          <i class="material-icons">local_library</i> LibraryTH
        </a>

        <div class="nav-links" [class.open]="menuOpen" (click)="menuOpen = false">
          <a routerLink="/books" routerLinkActive="active"><i class="material-icons">book</i> {{ 'nav.books' | t }}</a>
          <a routerLink="/categories" routerLinkActive="active"><i class="material-icons">category</i> {{ 'nav.categories' | t }}</a>
          <a routerLink="/wallet" routerLinkActive="active"><i class="material-icons">account_balance_wallet</i> {{ 'nav.wallet' | t }}</a>
          <a routerLink="/payment" routerLinkActive="active"><i class="material-icons">payments</i> {{ 'nav.payment' | t }}</a>
          <a *ngIf="isLibrarian" routerLink="/admin/borrows" routerLinkActive="active" class="admin-link"><i class="material-icons">history_edu</i> {{ 'nav.loans' | t }}</a>
          <a *ngIf="isLibrarian" routerLink="/admin/inventory" routerLinkActive="active" class="admin-link"><i class="material-icons">inventory_2</i> {{ 'nav.inventory' | t }}</a>
          <a *ngIf="isAdmin" routerLink="/admin/users" routerLinkActive="active" class="admin-link"><i class="material-icons">people</i> {{ 'nav.members' | t }}</a>
          <button class="mobile-only" (click)="clearCache()"><i class="material-icons">cached</i> {{ 'nav.clear_cache' | t }}</button>
          
          <div class="dropdown-divider mobile-only"></div>
          <button class="menu-signout mobile-only" (click)="toggleTheme()"><i class="material-icons">{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</i> {{ 'nav.theme' | t }}</button>
          <button class="menu-signout mobile-only" (click)="toggleLang()"><i class="material-icons">translate</i> {{ 'nav.lang' | t }} ({{ langService.lang.toUpperCase() }})</button>
          
          <div class="dropdown-divider mobile-only"></div>
          <a routerLink="/profile" routerLinkActive="active" class="mobile-only"><i class="material-icons">person</i> {{ 'nav.profile' | t }}</a>
          <button class="menu-signout" (click)="logout()"><i class="material-icons">logout</i> {{ 'nav.signout' | t }}</button>
        </div>

        <div class="nav-right">
          <!-- Notification Bell -->
          <div class="notif-wrapper" *ngIf="user" (click)="notifOpen = !notifOpen">
            <button class="notif-btn" [class.has-new]="notifications.length > 0">
              <i class="material-icons">notifications</i>
              <span class="badg" *ngIf="notifications.length > 0">{{ notifications.length }}</span>
            </button>
            <div class="notif-dropdown" [class.show]="notifOpen" (click)="$event.stopPropagation()">
              <div class="notif-header">
                <span>{{ langService.lang === 'th' ? 'การแจ้งเตือน' : 'Notifications' }}</span>
                <button class="clear-notif" *ngIf="notifications.length > 0" (click)="clearNotifs()">{{ langService.lang === 'th' ? 'ล้างทั้งหมด' : 'Clear All' }}</button>
              </div>
              <div class="notif-list">
                <div class="notif-item" *ngFor="let n of notifications">
                   <div class="notif-meta">
                     <span class="sender">{{ n.sender }}</span>
                     <span class="time">{{ 'now' }}</span>
                   </div>
                   <p class="msg">{{ n.is_key ? (n.message | t) : n.message }}</p>
                </div>
                <div class="notif-empty" *ngIf="notifications.length === 0">
                  <i class="material-icons">notifications_none</i>
                  <p>{{ 'common.no_records' | t }}</p>
                </div>
              </div>
            </div>
          </div>

          <span class="role-tag" *ngIf="user">{{ 'role.' + (user.role === 'addmin' ? 'admin' : user.role) | t }}</span>
          
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
              <a routerLink="/profile" class="dropdown-item">
                <i class="material-icons">person</i> {{ 'nav.profile' | t }}
              </a>
              <div class="dropdown-divider"></div>
              
              <button class="dropdown-item" (click)="toggleTheme(); $event.stopPropagation()">
                <i class="material-icons">{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</i> {{ 'nav.theme' | t }}
              </button>
              <button class="dropdown-item" (click)="toggleLang(); $event.stopPropagation()">
                <i class="material-icons">translate</i> {{ 'nav.lang' | t }} ({{ langService.lang.toUpperCase() }})
              </button>
              
              <div class="dropdown-divider"></div>
              <a routerLink="/books" class="dropdown-item"><i class="material-icons">book</i> {{ 'nav.books' | t }}</a>
              <a routerLink="/categories" class="dropdown-item"><i class="material-icons">category</i> {{ 'nav.categories' | t }}</a>
              <a *ngIf="isLibrarian" routerLink="/admin/borrows" class="dropdown-item"><i class="material-icons">history_edu</i> {{ 'nav.loans' | t }}</a>
              <a *ngIf="isLibrarian" routerLink="/admin/inventory" class="dropdown-item"><i class="material-icons">inventory_2</i> {{ 'nav.inventory' | t }}</a>
              <a *ngIf="isAdmin" routerLink="/admin/users" class="dropdown-item"><i class="material-icons">people</i> {{ 'nav.members' | t }}</a>
              
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" (click)="clearCache()"><i class="material-icons">cached</i> {{ 'nav.clear_cache' | t }}</button>
              <button class="dropdown-item logout" (click)="logout()">
                <i class="material-icons">logout</i> {{ 'nav.signout' | t }}
              </button>
            </div>
          </div>

          <button class="hamburger" (click)="menuOpen = !menuOpen" [class.open]="menuOpen">
            <i class="material-icons">{{ menuOpen ? 'close' : 'menu' }}</i>
          </button>
        </div>
      </div>

      <!-- Mobile Menu Backdrop -->
      <div class="menu-backdrop" [class.show]="menuOpen" (click)="menuOpen = false"></div>
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

    /* Notifications */
    .notif-wrapper { position: relative; margin-right: 8px; cursor: pointer; }
    .notif-btn { 
      background: none; border: none; color: var(--text2); display: flex; align-items: center; justify-content: center;
      padding: 8px; border-radius: 50%; transition: all 0.2s; position: relative;
    }
    .notif-btn:hover { background: var(--bg3); color: var(--accent); }
    .notif-btn.has-new i { animation: bellShake 0.5s infinite; color: var(--accent); }
    .notif-btn .badg {
      position: absolute; top: 4px; right: 4px; background: var(--danger); color: white;
      font-size: 0.65rem; font-weight: 800; min-width: 16px; height: 16px; 
      border-radius: 8px; display: flex; align-items: center; justify-content: center;
      border: 2px solid var(--bg2);
    }
    .notif-dropdown {
      position: absolute; top: calc(100% + 12px); right: -10px; width: 300px;
      background: var(--bg2); border: 1px solid var(--border); border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5); visibility: hidden; opacity: 0;
      transform: translateY(-10px); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 1000;
    }
    .notif-dropdown.show { visibility: visible; opacity: 1; transform: translateY(0); }
    .notif-header { 
      padding: 14px 16px; border-bottom: 1px solid var(--border); display: flex; 
      justify-content: space-between; align-items: center; font-weight: 700; font-size: 0.9rem;
    }
    .clear-notif { background: none; border: none; color: var(--accent); font-size: 0.8rem; cursor: pointer; }
    .notif-list { max-height: 400px; overflow-y: auto; }
    .notif-item { padding: 16px; border-bottom: 1px solid var(--border); transition: background 0.2s; }
    .notif-item:hover { background: var(--bg3); }
    .notif-meta { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .notif-meta .sender { font-weight: 800; color: var(--accent); font-size: 0.8rem; }
    .notif-meta .time { font-size: 0.7rem; color: var(--text3); }
    .notif-item .msg { color: var(--text); font-size: 0.875rem; line-height: 1.4; margin: 0; }
    .notif-empty { padding: 40px 20px; text-align: center; color: var(--text3); }
    .notif-empty i { font-size: 2.5rem; margin-bottom: 8px; opacity: 0.5; }

    @keyframes bellShake {
      0% { transform: rotate(0); }
      25% { transform: rotate(15deg); }
      50% { transform: rotate(0); }
      75% { transform: rotate(-15deg); }
      100% { transform: rotate(0); }
    }

    .dropdown-divider.mobile-only { display: none; margin: 8px 0; }
    .mobile-only { display: none; }
    .mobile-avatar { display: none; text-decoration: none; }
    .desktop-only { display: block; }

    /* Hamburger (hidden on desktop/tablet) */
    .hamburger { display: none; background: none; border: none; color: var(--text2); padding: 6px; cursor: pointer; }
    .hamburger i { font-size: 1.4rem; }

    /* Responsive - Changed breakpoint from 768 to 640 to keep iPad Mini in desktop mode */
    @media (min-width: 641px) {
      .nav-links, .hamburger { display: none !important; } /* Hide main links because they are in dropdown */
    }

    @media (max-width: 640px) {
      .nav-inner { padding: 0 16px; gap: 8px; }
      .hamburger { display: flex; align-items: center; z-index: 1001; }
      .desktop-only { display: none; }
      .mobile-avatar { display: block; }
      .role-tag { display: none; }
      .notif-wrapper { margin-right: 0; }

      .menu-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,0.4);
        backdrop-filter: blur(4px); z-index: 998;
        opacity: 0; visibility: hidden; transition: 0.3s;
      }
      .menu-backdrop.show { opacity: 1; visibility: visible; }

      .nav-links {
        position: fixed; top: 0; right: 0; bottom: 0;
        width: 280px; max-width: 80%; background: var(--bg2); 
        box-shadow: -10px 0 30px rgba(0,0,0,0.3);
        flex-direction: column; gap: 4px; padding: 70px 16px 20px;
        transform: translateX(100%); opacity: 1; pointer-events: auto;
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 999; overflow-y: auto; display: flex;
        border-top: none; left: auto;
      }
      .nav-links.open { transform: translateX(0); }
      
      .nav-links a, .nav-links button:not(.mobile-avatar) { 
        padding: 12px 16px; font-size: 0.95rem; border-radius: 12px; 
        color: var(--text); background: var(--bg3); border: 1px solid var(--border);
        display: flex; align-items: center; gap: 12px; width: 100%;
        text-align: left; margin-bottom: 4px;
      }
      .nav-links a:active, .nav-links button:active { background: var(--bg); }
      .dropdown-divider.mobile-only { display: block; height: 1px; width: 100%; margin: 12px 0; background: var(--border); opacity: 0.5; }
      .mobile-only { display: flex !important; }
      .nav-links .admin-link { border-color: rgba(99,102,241,0.2); color: var(--accent); }
    }

    @media (max-width: 480px) {
      .nav-inner { padding: 0 12px; }
    }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  menuOpen = false;
  dropdownOpen = false;
  notifOpen = false;
  notifications: any[] = [];
  private sub: Subscription | null = null;

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    private realtime: RealtimeService,
    public langService: LanguageService,
    private router: Router
  ) { }

  ngOnInit() {
    this.sub = this.realtime.messages$.subscribe(msg => {
      if (msg.event === 'USER_UPDATED' && msg.payload.user_id === this.user?.id) {
        this.authService.refreshProfile();
      }

      if (msg.event === 'ADMIN_NOTIFICATION') {
        this.notifications.unshift({
          message: msg.payload.message,
          sender: msg.payload.sender,
          is_key: msg.payload.is_key,
          time: new Date()
        });
        this.notifOpen = true;
      }
    });

    // Close dropdowns on route change
    this.router.events.subscribe(() => {
      this.dropdownOpen = false;
      this.notifOpen = false;
    });
  }

  clearNotifs() {
    this.notifications = [];
    this.notifOpen = false;
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  get user() { return this.authService.currentUser; }
  get initial() { return (this.user?.full_name || this.user?.username || 'U').charAt(0).toUpperCase(); }
  get isLibrarian() { return this.authService.isLibrarian; }
  get isAdmin() { return this.authService.isAdmin; }

  logout() { this.authService.logout(); }
  toggleTheme() { this.themeService.toggleTheme(); }
  toggleLang() { this.langService.toggleLang(); }
  clearCache() {
    const msg = this.langService.lang === 'th' ? 'ยืนยันเพิ่มประสิทธิภาพและรีโหลดแอปหรือไม่?' : 'Confirm optimize and reload app?';
    if (confirm(msg)) {
      window.location.reload();
    }
  }
}
