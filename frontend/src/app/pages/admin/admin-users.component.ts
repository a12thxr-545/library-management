import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models';

@Component({
    selector: 'app-admin-users',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="page">
      <div class="header">
        <h1>Member Directory</h1>
        <p>Manage and distinguish library members by their assigned roles</p>
      </div>

      <div class="tabs">
        <button [class.active]="currentTab === 'members'" (click)="currentTab = 'members'">
          Students & Professors <span class="badge">{{ memberUsers.length }}</span>
        </button>
        <button [class.active]="currentTab === 'librarians'" (click)="currentTab = 'librarians'">
          Librarians <span class="badge">{{ librarianUsers.length }}</span>
        </button>
      </div>

      <div class="table-container">
        <table *ngIf="displayUsers.length > 0">
          <thead>
            <tr>
              <th>Profile</th>
              <th>Username</th>
              <th>Contact Info</th>
              <th>Role</th>
              <th>Joined Date</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of displayUsers">
              <td>
                <div class="user-cell">
                  <div class="avatar">{{ u.full_name?.charAt(0) || u.username.charAt(0) | uppercase }}</div>
                  <div class="details">
                    <span class="full-name">{{ u.full_name || 'No Full Name' }}</span>
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
                <span class="role-pill" [class]="u.role">{{ u.role }}</span>
              </td>
              <td class="date-cell">{{ u.created_at | date:'mediumDate' }}</td>
            </tr>
          </tbody>
        </table>

        <div class="empty" *ngIf="displayUsers.length === 0">
          <i class="material-icons">people_outline</i>
          <p>No users found in this category.</p>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
    .header { margin-bottom: 40px; }
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

    .table-container { background: var(--bg2); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; }
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

    .role-pill { 
      padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; 
      font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .role-pill.student { background: rgba(56,139,253,0.1); color: var(--accent); }
    .role-pill.professor { background: rgba(163,113,247,0.1); color: #a371f7; }
    .role-pill.librarian { background: rgba(63,185,80,0.1); color: #3fb950; }

    .date-cell { font-size: 0.9rem; color: var(--text3); }

    .empty { padding: 100px; text-align: center; color: var(--text3); }
    .empty i { font-size: 4rem; margin-bottom: 16px; opacity: 0.5; }

    @media (max-width: 768px) {
      .tabs { flex-direction: column; }
      th:nth-child(3), td:nth-child(3), th:nth-child(5), td:nth-child(5) { display: none; }
    }
  `]
})
export class AdminUsersComponent implements OnInit {
    users: User[] = [];
    currentTab: 'members' | 'librarians' = 'members';

    constructor(private authService: AuthService) { }

    ngOnInit() {
        this.authService.getUsers().subscribe(r => {
            this.users = r.data || [];
        });
    }

    get memberUsers() {
        return this.users.filter(u => u.role === 'student' || u.role === 'professor');
    }

    get librarianUsers() {
        return this.users.filter(u => u.role === 'librarian');
    }

    get displayUsers() {
        return this.currentTab === 'members' ? this.memberUsers : this.librarianUsers;
    }
}
