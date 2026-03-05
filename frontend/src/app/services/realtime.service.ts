import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface RealtimeMessage {
    target_user_id?: string;
    event: string;
    payload: any;
}

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
    private socket: WebSocket | null = null;
    private messagesSubject = new Subject<RealtimeMessage>();
    public messages$ = this.messagesSubject.asObservable();

    constructor(private auth: AuthService) {
        this.auth.currentUser$.subscribe((user: any) => {
            if (user) {
                this.connect();
            } else {
                this.disconnect();
            }
        });
    }

    private connect() {
        if (this.socket) return;

        const token = this.auth.token;
        if (!token) return;

        // Convert http://... to ws://...
        const wsUrl = environment.apiUrl.replace('http', 'ws') + '/ws?token=' + token;

        this.socket = new WebSocket(wsUrl);

        this.socket.onmessage = (event) => {
            try {
                const msg: RealtimeMessage = JSON.parse(event.data);
                this.messagesSubject.next(msg);
                console.log('[Realtime] Message received:', msg);
            } catch (e) {
                console.error('[Realtime] Error parsing message:', e);
            }
        };

        this.socket.onclose = () => {
            this.socket = null;
            // Attempt reconnect after 5s if still logged in
            if (this.auth.token) {
                setTimeout(() => this.connect(), 5000);
            }
        };

        this.socket.onerror = (err) => {
            console.error('[Realtime] WebSocket error:', err);
        };
    }

    public send(msg: RealtimeMessage) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(msg));
        } else {
            console.warn('[Realtime] Cannot send, socket not connected');
        }
    }

    private disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    ngOnDestroy() {
        this.disconnect();
    }
}
