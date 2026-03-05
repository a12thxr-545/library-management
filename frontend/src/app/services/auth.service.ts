import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest, User } from '../models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private apiUrl = environment.apiUrl;
    private currentUserSubject = new BehaviorSubject<User | null>(this.loadUser());
    currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient, private router: Router) {
        // Automatically refresh profile on startup if logged in
        if (this.isLoggedIn) {
            this.refreshProfile();
        }
    }

    private loadUser(): User | null {
        const stored = localStorage.getItem('library_user');
        return stored ? JSON.parse(stored) : null;
    }

    refreshProfile() {
        if (!this.isLoggedIn) return;
        this.getMe().subscribe({
            next: (res) => {
                if (res.success && res.data) {
                    localStorage.setItem('library_user', JSON.stringify(res.data));
                    this.currentUserSubject.next(res.data);
                }
            }
        });
    }

    getMe(): Observable<ApiResponse<User>> {
        return this.http.get<ApiResponse<User>>(`${this.apiUrl}/auth/me`);
    }

    get currentUser(): User | null {
        return this.currentUserSubject.value;
    }

    get token(): string | null {
        return localStorage.getItem('library_token');
    }

    get isLoggedIn(): boolean {
        return !!this.token;
    }

    get isAdmin(): boolean {
        return this.currentUser?.role === 'addmin';
    }

    get isLibrarian(): boolean {
        const role = this.currentUser?.role;
        return role === 'librarian' || role === 'addmin';
    }

    login(data: LoginRequest): Observable<ApiResponse<AuthResponse>> {
        return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/auth/login`, data).pipe(
            tap(res => {
                if (res.success && res.data) {
                    localStorage.setItem('library_token', res.data.token);
                    localStorage.setItem('library_user', JSON.stringify(res.data.user));
                    this.currentUserSubject.next(res.data.user);
                }
            })
        );
    }

    register(data: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
        return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/auth/register`, data).pipe(
            tap(res => {
                if (res.success && res.data) {
                    localStorage.setItem('library_token', res.data.token);
                    localStorage.setItem('library_user', JSON.stringify(res.data.user));
                    this.currentUserSubject.next(res.data.user);
                }
            })
        );
    }

    logout() {
        localStorage.removeItem('library_token');
        localStorage.removeItem('library_user');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
    }

    getUsers(): Observable<ApiResponse<User[]>> {
        return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/admin/users`);
    }

    updateRole(userId: string, role: string): Observable<ApiResponse<any>> {
        return this.http.put<ApiResponse<any>>(`${this.apiUrl}/admin/users/${userId}/role`, { role });
    }

    sendNotification(userId: string, message: string, isKey: boolean): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.apiUrl}/admin/notifications`, { user_id: userId, message, is_key: isKey });
    }
}
