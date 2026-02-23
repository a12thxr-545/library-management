import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Book, Borrow, PaginatedBooks } from '../models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BookService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getBooks(params?: { category?: string; search?: string; limit?: number; offset?: number }): Observable<ApiResponse<PaginatedBooks>> {
        let httpParams = new HttpParams();
        if (params?.category) httpParams = httpParams.set('category', params.category);
        if (params?.search) httpParams = httpParams.set('search', params.search);
        if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
        if (params?.offset) httpParams = httpParams.set('offset', params.offset.toString());
        return this.http.get<ApiResponse<PaginatedBooks>>(`${this.apiUrl}/books`, { params: httpParams });
    }

    getBook(id: string): Observable<ApiResponse<Book>> {
        return this.http.get<ApiResponse<Book>>(`${this.apiUrl}/books/${id}`);
    }

    getNewBooks(): Observable<ApiResponse<Book[]>> {
        return this.http.get<ApiResponse<Book[]>>(`${this.apiUrl}/books/new/latest`);
    }

    getPopularBooks(): Observable<ApiResponse<Book[]>> {
        return this.http.get<ApiResponse<Book[]>>(`${this.apiUrl}/books/popular/top`);
    }

    borrowBook(bookId: string, dueDate?: string, reservationId?: string): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.apiUrl}/borrow`, {
            book_id: bookId,
            due_date: dueDate,
            reservation_id: reservationId
        });
    }

    returnBook(borrowId: string): Observable<ApiResponse<any>> {
        return this.http.put<ApiResponse<any>>(`${this.apiUrl}/borrow/return/${borrowId}`, {});
    }

    myBorrows(): Observable<ApiResponse<Borrow[]>> {
        return this.http.get<ApiResponse<Borrow[]>>(`${this.apiUrl}/borrow/my`);
    }

    getAllBorrows(): Observable<ApiResponse<Borrow[]>> {
        return this.http.get<ApiResponse<Borrow[]>>(`${this.apiUrl}/borrow/all`);
    }
}
