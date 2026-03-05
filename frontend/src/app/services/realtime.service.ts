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
    private reconnectTimer: any = null;
    private isDestroyed = false;

    constructor(private auth: AuthService) {
        this.auth.currentUser$.subscribe((user: any) => {
            if (user) {
                this.connect();
            } else {
                this.disconnect();
            }
        });
    }

    private getWsUrl(): string {
        const token = this.auth.token;
        const apiUrl = environment.apiUrl;

        // If apiUrl is a relative path like '/api', build WS URL from window.location
        if (apiUrl.startsWith('/')) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            return `${protocol}//${host}/api/ws?token=${token}`;
        }

        // If apiUrl is an absolute URL (production), convert http → ws
        const wsBase = apiUrl
            .replace(/^https:\/\//, 'wss://')
            .replace(/^http:\/\//, 'ws://');
        return `${wsBase}/ws?token=${token}`;
    }

    private connect() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
        const token = this.auth.token;
        if (!token) return;

        try {
            const wsUrl = this.getWsUrl();
            console.log('[Realtime] Connecting to:', wsUrl.replace(/token=.*/, 'token=***'));
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('[Realtime] Connected ✅');
            };

            this.socket.onmessage = (event) => {
                try {
                    const msg: RealtimeMessage = JSON.parse(event.data);
                    this.messagesSubject.next(msg);
                } catch (e) {
                    console.error('[Realtime] Error parsing message:', e);
                }
            };

            this.socket.onclose = (event) => {
                this.socket = null;
                if (!this.isDestroyed && this.auth.token) {
                    console.log('[Realtime] Disconnected, reconnecting in 5s...');
                    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
                }
            };

            this.socket.onerror = (err) => {
                console.warn('[Realtime] WebSocket error (may be normal in dev):', err);
            };
        } catch (err) {
            console.warn('[Realtime] Could not create WebSocket:', err);
        }
    }

    public send(msg: RealtimeMessage) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(msg));
        } else {
            console.warn('[Realtime] Cannot send, socket not connected');
        }
    }

    private disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    ngOnDestroy() {
        this.isDestroyed = true;
        this.disconnect();
    }
}
