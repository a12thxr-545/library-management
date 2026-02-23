import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ApiResponse, Book, UserInterest } from '../models';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class InterestService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getInterests(): Observable<ApiResponse<UserInterest[]>> {
        return this.http.get<ApiResponse<UserInterest[]>>(`${this.apiUrl}/interests`);
    }

    setInterests(categoryIds: string[]): Observable<ApiResponse<void>> {
        return this.http.post<ApiResponse<void>>(`${this.apiUrl}/interests`, { category_ids: categoryIds });
    }

    getRecommendations(): Observable<ApiResponse<Book[]>> {
        return this.http.get<ApiResponse<Book[]>>(`${this.apiUrl}/recommendations`);
    }
}
