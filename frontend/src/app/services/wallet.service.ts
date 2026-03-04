import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Wallet, WalletTransaction } from '../models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WalletService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getWallet(): Observable<ApiResponse<Wallet>> {
        return this.http.get<ApiResponse<Wallet>>(`${this.apiUrl}/wallet`);
    }

    topUp(amount: number): Observable<ApiResponse<{ balance: number; topped_up: number; message: string }>> {
        return this.http.post<ApiResponse<any>>(`${this.apiUrl}/wallet/topup`, { amount });
    }

    payFine(borrowId: string): Observable<ApiResponse<{ paid: number; new_balance: number; message: string }>> {
        return this.http.post<ApiResponse<any>>(`${this.apiUrl}/wallet/pay-fine`, { borrow_id: borrowId });
    }

    getTransactions(): Observable<ApiResponse<WalletTransaction[]>> {
        return this.http.get<ApiResponse<WalletTransaction[]>>(`${this.apiUrl}/wallet/transactions`);
    }
}
