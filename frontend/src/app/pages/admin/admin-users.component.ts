import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RealtimeService } from '../../services/realtime.service';
import { User } from '../../models';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="page">
      <div class="header">
        <a (click)="goBack()" class="back-btn"><i class="material-icons">arrow_back</i> {{ 'common.return' | t }}</a>
        <h1>{{ 'admin.users.title' | t }}</h1>
        <p>{{ 'admin.users.sub' | t }}</p>
      </div>

      <div class="tabs">
        <button [class.active]="currentTab === 'members'" (click)="currentTab = 'members'">
          {{ 'admin.users.members' | t }} <span class="badge">{{ memberUsers.length }}</span>
        </button>
        <button [class.active]="currentTab === 'librarians'" (click)="currentTab = 'librarians'">
          {{ 'admin.users.staff' | t }} <span class="badge">{{ librarianUsers.length }}</span>
        </button>
      </div>

      <div class="table-container">
        <!-- Skeleton Loading -->
        <table *ngIf="loadingService.loading$ | async">
          <thead>
            <tr>
              <th>{{ 'nav.profile' | t }}</th>
              <th>{{ 'login.user' | t }}</th>
              <th>{{ 'nav.profile' | t }} Info</th>
              <th>{{ 'common.status' | t }}</th>
              <th>{{ 'wallet.balance' | t }}</th>
              <th>{{ 'profile.member_since' | t }}</th>
              <th>{{ 'admin.notify.send' | t }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of [1,2,3,4,5]">
              <td><div class="skeleton" style="height: 40px; width: 140px;"></div></td>
              <td><div class="skeleton" style="height: 20px; width: 80px;"></div></td>
              <td><div class="skeleton" style="height: 40px; width: 180px;"></div></td>
              <td><div class="skeleton" style="height: 28px; width: 100px;"></div></td>
              <td><div class="skeleton" style="height: 20px; width: 60px;"></div></td>
              <td><div class="skeleton" style="height: 20px; width: 80px;"></div></td>
              <td><div class="skeleton" style="height: 32px; width: 32px;"></div></td>
            </tr>
          </tbody>
        </table>

        <table *ngIf="displayUsers.length > 0 && !(loadingService.loading$ | async)">
          <thead>
            <tr>
              <th>{{ 'nav.profile' | t }}</th>
              <th>{{ 'login.user' | t }}</th>
              <th>{{ 'nav.profile' | t }} Info</th>
              <th>{{ 'common.status' | t }}</th>
              <th>{{ 'wallet.balance' | t }}</th>
              <th>{{ 'profile.member_since' | t }}</th>
              <th>{{ 'admin.notify.send' | t }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of displayUsers">
              <td>
                <div class="user-cell">
                  <div class="avatar">{{ u.full_name?.charAt(0) || u.username.charAt(0) | uppercase }}</div>
                  <div class="details">
                    <span class="full-name">{{ u.full_name || ('common.anonymous' | t) }}</span>
                    <span class="id-small">ID: {{ u.id.split('-')[0] }}...</span>
                  </div>
                </div>
              </td>
              <td class="username-cell">&#64;{{ u.username }}</td>
              <td>
                <div class="contact-info">
                  <div class="info-row"><i class="material-icons">email</i> {{ u.email }}</div>
                  <div class="info-row" *ngIf="u.phone"><i class="material-icons">phone</i> {{ u.phone }}</div>
                </div>
              </td>
              <td>
                <div class="role-control">
                  <select [ngModel]="u.role" (ngModelChange)="changeRole(u, $event)" class="role-select" [class]="u.role" [disabled]="!authService.isAdmin">
                    <option value="student">{{ 'role.student' | t }}</option>
                    <option value="professor">{{ 'role.professor' | t }}</option>
                    <option value="librarian">{{ 'role.librarian' | t }}</option>
                    <option value="addmin">{{ 'role.admin' | t }}</option>
                  </select>
                </div>
              </td>
              <td>
                <div class="balance-cell" [class.danger]="(u.balance || 0) < 0">฿{{ (u.balance || 0) | number:'1.2-2' }}</div>
              </td>
              <td class="date-cell">{{ u.created_at | date:'mediumDate' }}</td>
              <td>
                <button class="notify-btn" (click)="openNotify(u)">
                  <i class="material-icons">notifications_active</i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Notify Modal (Simple overlay) -->
        <div class="notify-overlay" *ngIf="selectedUser" (click)="selectedUser = null">
          <div class="notify-modal" (click)="$event.stopPropagation()">
            <h2>{{ 'admin.notify.send' | t }} &#64;{{ selectedUser.username }}</h2>
            
            <div class="choices">
              <button (click)="notifyReason = '1'" [class.active]="notifyReason === '1'">{{ 'admin.notify.reason1' | t }}</button>
              <button (click)="notifyReason = '2'" [class.active]="notifyReason === '2'">{{ 'admin.notify.reason2' | t }}</button>
              <button (click)="notifyReason = 'custom'" [class.active]="notifyReason === 'custom'">{{ 'admin.notify.reason3' | t }}</button>
            </div>

            <textarea *ngIf="notifyReason === 'custom'" [(ngModel)]="customMessage" [placeholder]="'admin.notify.custom' | t"></textarea>

            <div class="modal-actions">
              <button class="cancel" (click)="selectedUser = null">{{ 'wallet.gateway.close' | t }}</button>
              <button class="send" (click)="sendNotification()" [disabled]="!canSend">
                {{ 'admin.notify.btn' | t }}
              </button>
            </div>
          </div>
        </div>

        <div class="empty" *ngIf="displayUsers.length === 0">
          <i class="material-icons">people_outline</i>
          <p>{{ 'common.no_records' | t }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
    .header { margin-bottom: 40px; position: relative; }
    .back-btn { 
      display: inline-flex; align-items: center; gap: 8px; color: var(--text2); 
      text-decoration: none; font-weight: 600; margin-bottom: 24px; cursor: pointer;
    }
    h1 { font-size: 2.2rem; font-weight: 800; color: var(--text); margin-bottom: 8px; }
    p { color: var(--text3); font-size: 1.1rem; }

    .tabs { display: flex; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
    .tabs button { 
      background: none; border: none; padding: 12px 24px; color: var(--text3); 
      font-weight: 600; cursor: pointer; border-radius: 12px; transition: all 0.2s;
      display: flex; align-items: center; gap: 10px;
    }
    .tabs button.active { background: var(--bg3); color: var(--accent); }
    .tabs button .badge { 
      background: var(--border); color: var(--text2); padding: 2px 8px; 
      border-radius: 20px; font-size: 0.75rem; 
    }
    .tabs button.active .badge { background: var(--accent); color: white; }

    .table-container { background: var(--bg2); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; position: relative; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 18px; background: var(--bg3); color: var(--text2); font-size: 0.85rem; font-weight: 710; }
    td { padding: 18px; border-top: 1px solid var(--border); color: var(--text); vertical-align: middle; }

    .user-cell { display: flex; align-items: center; gap: 14px; }
    .avatar { 
      width: 40px; height: 40px; background: var(--accent); color: white; 
      border-radius: 12px; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1.2rem;
    }
    .details { display: flex; flex-direction: column; }
    .full-name { font-weight: 700; color: var(--text); }
    .id-small { font-size: 0.75rem; color: var(--text3); }

    .username-cell { font-family: monospace; color: var(--accent); font-weight: 600; }
    
    .contact-info { display: flex; flex-direction: column; gap: 4px; }
    .info-row { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text2); }
    .info-row i { font-size: 1rem; color: var(--text3); }

    .role-select {
      background: var(--bg); border: 1px solid var(--border); border-radius: 12px;
      padding: 6px 32px 6px 12px; font-size: 0.75rem; font-weight: 710;
      color: var(--text); appearance: none; cursor: pointer;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat; background-position: right 10px center; background-size: 14px;
      transition: all 0.2s;
    }
    .role-select.student { border-color: var(--accent); color: var(--accent); }
    .role-select.professor { border-color: #a371f7; color: #a371f7; }
    .role-select.librarian { border-color: #3fb950; color: #3fb950; }
    .role-select.addmin { border-color: #f85149; color: #f85149; }

    .balance-cell { font-weight: 700; color: var(--accent); }
    .balance-cell.danger { color: var(--danger); }

    .notify-btn {
      background: none; border: none; color: var(--accent); cursor: pointer;
      padding: 8px; border-radius: 50%; transition: all 0.2s;
    }
    .notify-btn:hover { background: rgba(56,139,253,0.1); transform: scale(1.1); }

    .notify-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .notify-modal {
      background: var(--bg2); border: 1px solid var(--border); border-radius: 24px;
      padding: 32px; width: 100%; max-width: 500px; animation: slideUp 0.3s ease-out;
    }
    .notify-modal h2 { margin-bottom: 24px; font-size: 1.5rem; }
    .choices { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
    .choices button {
      text-align: left; padding: 14px; border-radius: 12px; background: var(--bg3);
      border: 1px solid var(--border); color: var(--text); cursor: pointer; font-weight: 510;
    }
    .choices button.active { border-color: var(--accent); background: rgba(56,139,253,0.05); color: var(--accent); }
    
    textarea {
      width: 100%; height: 100px; border-radius: 12px; background: var(--bg);
      border: 1px solid var(--border); color: var(--text); padding: 12px;
      margin-bottom: 20px; outline: none; font-size: 0.95rem; resize: none;
    }

    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .modal-actions button { padding: 10px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; }
    .cancel { background: none; border: 1px solid var(--border); color: var(--text2); }
    .send { background: var(--accent); border: none; color: white; }
    .send:disabled { opacity: 0.5; cursor: not-allowed; }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @media (max-width: 768px) {
      th:nth-child(3), td:nth-child(3), th:nth-child(5), td:nth-child(5) { display: none; }
    }
  `]
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  users: User[] = [];
  currentTab: 'members' | 'librarians' = 'members';
  selectedUser: User | null = null;
  notifyReason: string = '1';
  customMessage: string = '';
  private sub: Subscription | null = null;

  constructor(
    public authService: AuthService,
    private realtime: RealtimeService,
    private location: Location,
    public languageService: LanguageService,
    public loadingService: LoadingService
  ) { }

  goBack() { this.location.back(); }

  ngOnInit() {
    this.fetchData();

    this.sub = this.realtime.messages$.subscribe(msg => {
      if (msg.event === 'USER_UPDATED' || msg.event === 'WALLET_UPDATED') {
        this.fetchData();
      }
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  fetchData() {
    this.authService.getUsers().subscribe(r => {
      this.users = r.data || [];
    });
  }

  get memberUsers() {
    return this.users.filter(u => u.role === 'student' || u.role === 'professor');
  }
  get librarianUsers() {
    return this.users.filter(u => u.role === 'librarian' || u.role === 'addmin');
  }
  get displayUsers() {
    return this.currentTab === 'members' ? this.memberUsers : this.librarianUsers;
  }

  openNotify(user: User) {
    this.selectedUser = user;
    this.notifyReason = '1';
    this.customMessage = '';
  }

  get canSend() {
    if (this.notifyReason === 'custom') return this.customMessage.trim().length > 0;
    return true;
  }

  sendNotification() {
    if (!this.selectedUser) return;

    let message = '';
    let isKey = false;

    if (this.notifyReason === '1') {
      message = 'admin.notify.reason1';
      isKey = true;
    } else if (this.notifyReason === '2') {
      message = 'admin.notify.reason2';
      isKey = true;
    } else {
      message = this.customMessage;
      isKey = false;
    }

    this.authService.sendNotification(this.selectedUser.id, message, isKey).subscribe(r => {
      if (r.success) {
        alert(this.languageService.translate('admin.notify.success'));
        this.selectedUser = null;
      }
    });
  }

  changeRole(user: User, newRole: string) {
    const l = this.languageService.lang;
    const msg = l === 'en'
      ? `Confirm change role for @${user.username} to ${newRole.toUpperCase()}?`
      : `ยืนยันการเปลี่ยนบทบาทของผู้ใช้งาน @${user.username} เป็น ${newRole.toUpperCase()} หรือไม่?`;

    if (!confirm(msg)) return;

    this.authService.updateRole(user.id, newRole).subscribe(r => {
      if (r.success) {
        user.role = newRole;
      }
    });
  }
}
