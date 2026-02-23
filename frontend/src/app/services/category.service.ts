import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Book, Category } from '../models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoryService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getCategories(): Observable<ApiResponse<Category[]>> {
        return this.http.get<ApiResponse<Category[]>>(`${this.apiUrl}/categories`);
    }

    getBooksByCategory(categoryId: string): Observable<ApiResponse<Book[]>> {
        return this.http.get<ApiResponse<Book[]>>(`${this.apiUrl}/categories/${categoryId}/books`);
    }
}
