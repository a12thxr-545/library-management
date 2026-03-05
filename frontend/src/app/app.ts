import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/shared/navbar/navbar.component';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { CommonModule } from '@angular/common';
import { LoadingComponent } from './components/shared/loading/loading.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, CommonModule, LoadingComponent],
  template: `
    <app-loading />
    <app-navbar *ngIf="auth.isLoggedIn" />
    <main [style.padding-top]="auth.isLoggedIn ? '56px' : '0'">
      <router-outlet />
    </main>
  `,
  styles: [`
    main { min-height: 100vh; background: var(--bg); position: relative; }
  `]
})
export class App {
  constructor(public auth: AuthService, public themeService: ThemeService) { }
}
