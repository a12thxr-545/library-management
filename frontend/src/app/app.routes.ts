import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
    { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) },
    { path: 'interests', loadComponent: () => import('./pages/interests/interests.component').then(m => m.InterestsComponent), canActivate: [authGuard] },
    { path: 'recommended', loadComponent: () => import('./pages/recommendations/recommendations.component').then(m => m.RecommendationsComponent), canActivate: [authGuard] },
    { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent), canActivate: [authGuard] },
    { path: 'books', loadComponent: () => import('./pages/books/books.component').then(m => m.BooksComponent), canActivate: [authGuard] },
    { path: 'books/:id', loadComponent: () => import('./pages/book-detail/book-detail.component').then(m => m.BookDetailComponent), canActivate: [authGuard] },
    { path: 'categories', loadComponent: () => import('./pages/categories/categories.component').then(m => m.CategoriesComponent), canActivate: [authGuard] },
    { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent), canActivate: [authGuard] },
    { path: 'payment', loadComponent: () => import('./pages/payment/payment.component').then(m => m.PaymentComponent), canActivate: [authGuard] },
    { path: 'admin/borrows', loadComponent: () => import('./pages/admin/admin-borrows.component').then(m => m.AdminBorrowsComponent), canActivate: [authGuard] },
    { path: 'admin/users', loadComponent: () => import('./pages/admin/admin-users.component').then(m => m.AdminUsersComponent), canActivate: [authGuard] },
    { path: 'error', loadComponent: () => import('./pages/errors/server-error/server-error.component').then(m => m.ServerErrorComponent) },
    { path: '**', loadComponent: () => import('./pages/errors/not-found/not-found.component').then(m => m.NotFoundComponent) },
];
