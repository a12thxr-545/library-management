import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { BookService } from '../../services/book.service';
import { AuthService } from '../../services/auth.service';
import { Borrow } from '../../models';

interface CardForm {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
}

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <a routerLink="/profile" class="back">
        <i class="material-icons">arrow_back</i> Back to Profile
      </a>

      <div class="layout">
        <!-- Left: Fine Summary -->
        <div class="panel summary-panel">
          <div class="panel-header">
            <i class="material-icons">receipt_long</i>
            <span>Fine Summary</span>
          </div>

          <div class="fine-list" *ngIf="overdueBorrows.length > 0">
            <div class="fine-row" *ngFor="let b of overdueBorrows">
              <div class="fine-book">
                <div class="fine-title">{{ b.book_title || 'Book' }}</div>
                <div class="fine-date">Due: <span class="overdue-text">{{ fmt(b.due_date) }}</span></div>
              </div>
              <div class="fine-amount">฿{{ (b.fine_amount || 0).toFixed(2) }}</div>
            </div>
            <div class="total-row">
              <span>Total Due</span>
              <span class="total-amount">฿{{ totalFine.toFixed(2) }}</span>
            </div>
          </div>

          <div class="no-fine-msg" *ngIf="overdueBorrows.length === 0">
            <div class="check-circle">
              <i class="material-icons">check</i>
            </div>
            <strong>No outstanding fines</strong>
            <p>You're all clear!</p>
          </div>

          <!-- Info cards -->
          <div class="info-cards">
            <div class="info-card">
              <i class="material-icons">security</i>
              <span>256-bit SSL encryption</span>
            </div>
            <div class="info-card">
              <i class="material-icons">verified_user</i>
              <span>Secured payments</span>
            </div>
            <div class="info-card">
              <i class="material-icons">support_agent</i>
              <span>24/7 support</span>
            </div>
          </div>
        </div>

        <!-- Right: Payment Form -->
        <div class="panel payment-panel" *ngIf="!paymentDone">

          <!-- Method Tabs -->
          <div class="method-tabs">
            <button class="method-tab" [class.active]="method === 'card'" (click)="method = 'card'">
              <i class="material-icons">credit_card</i>
              <span>Card</span>
            </button>
            <button class="method-tab" [class.active]="method === 'promptpay'" (click)="method = 'promptpay'">
              <i class="material-icons">qr_code_2</i>
              <span>PromptPay</span>
            </button>
            <button class="method-tab" [class.active]="method === 'bank'" (click)="method = 'bank'">
              <i class="material-icons">account_balance</i>
              <span>Bank Transfer</span>
            </button>
          </div>

          <!-- ═══ CREDIT / DEBIT CARD ═══ -->
          <div *ngIf="method === 'card'" class="card-section">

            <!-- Animated Card Preview -->
            <div class="card-scene">
              <div class="card-3d" [class.is-flipped]="showBack">
                <!-- Front -->
                <div class="card-face card-face--front">
                  <div class="card-brand">
                    <div class="chip"></div>
                    <i class="material-icons card-logo">credit_card</i>
                  </div>
                  <div class="card-number-display">
                    {{ displayCardNumber }}
                  </div>
                  <div class="card-footer">
                    <div class="card-field">
                      <div class="card-field-label">CARDHOLDER</div>
                      <div class="card-field-value">{{ card.name || 'YOUR NAME' }}</div>
                    </div>
                    <div class="card-field">
                      <div class="card-field-label">EXPIRES</div>
                      <div class="card-field-value">{{ card.expiry || 'MM/YY' }}</div>
                    </div>
                  </div>
                </div>
                <!-- Back -->
                <div class="card-face card-face--back">
                  <div class="magstripe"></div>
                  <div class="sig-strip">
                    <span class="sig-label">CVV</span>
                    <span class="sig-cvv">{{ card.cvv || '•••' }}</span>
                  </div>
                  <div class="card-back-logo"><i class="material-icons" style="font-size:2rem">credit_card</i></div>
                </div>
              </div>
            </div>

            <!-- Card Form -->
            <div class="form-group">
              <label>Card Number</label>
              <div class="input-with-icon">
                <input type="text" [(ngModel)]="card.number"
                  (ngModelChange)="onCardNumberChange($event)"
                  (focus)="showBack = false"
                  placeholder="1234 5678 9012 3456" maxlength="19" />
                <i class="material-icons">credit_card</i>
              </div>
            </div>

            <div class="form-group">
              <label>Cardholder Name</label>
              <input type="text" [(ngModel)]="card.name"
                (focus)="showBack = false"
                placeholder="Name as shown on card" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Expiry Date</label>
                <input type="text" [(ngModel)]="card.expiry"
                  (ngModelChange)="onExpiryChange($event)"
                  (focus)="showBack = false"
                  placeholder="MM/YY" maxlength="5" />
              </div>
              <div class="form-group">
                <label>CVV</label>
                <input type="text" [(ngModel)]="card.cvv"
                  (input)="showBack = true" (blur)="showBack = false"
                  placeholder="123" maxlength="4" />
              </div>
            </div>
          </div>

          <!-- ═══ PROMPTPAY ═══ -->
          <div class="promptpay-section" *ngIf="method === 'promptpay'">
            <div class="qr-wrapper">
              <div class="qr-box">
                <i class="material-icons">qr_code_2</i>
              </div>
              <div class="qr-info">
                <div class="qr-amount">฿{{ totalFine > 0 ? totalFine.toFixed(2) : '0.00' }}</div>
                <div class="qr-sub">Scan with your banking app</div>
                <div class="promptpay-id">
                  <i class="material-icons" style="font-size:1rem">phone_iphone</i>
                  PromptPay: 081-234-5678
                </div>
              </div>
            </div>
            <div class="pp-steps">
              <div class="pp-step"><span>1</span> Open your banking app</div>
              <div class="pp-step"><span>2</span> Scan the QR code above</div>
              <div class="pp-step"><span>3</span> Confirm the payment amount</div>
              <div class="pp-step"><span>4</span> Click "Confirm Payment" below</div>
            </div>
          </div>

          <!-- ═══ BANK TRANSFER ═══ -->
          <div class="bank-section" *ngIf="method === 'bank'">
            <div class="bank-card">
              <div class="bank-logo-row">
                <div class="bank-badge kbank">KBANK</div>
                <span>Kasikorn Bank</span>
              </div>
              <div class="bank-detail"><span>Account Name</span><strong>LibraryTH Co., Ltd.</strong></div>
              <div class="bank-detail"><span>Account Number</span><strong class="acc-num">012-3-45678-9</strong></div>
              <div class="bank-detail"><span>Amount</span><strong class="bank-amount">฿{{ totalFine > 0 ? totalFine.toFixed(2) : '0.00' }}</strong></div>
            </div>
            <div class="bank-note">
              <i class="material-icons">info</i>
              Transfer the exact amount and send your slip to admin within 24 hours.
            </div>
          </div>

          <!-- Error message -->
          <div class="alert-error" *ngIf="formError">{{ formError }}</div>

          <!-- Pay Button -->
          <button class="pay-btn" (click)="processPayment()" [disabled]="processing">
            <span *ngIf="!processing">
              <i class="material-icons">lock</i>
              Pay {{ totalFine > 0 ? '฿' + totalFine.toFixed(2) : 'Now' }}
            </span>
            <span *ngIf="processing" class="loading-dots">
              <i class="material-icons spin">autorenew</i> Processing...
            </span>
          </button>

          <p class="secure-note">
            <i class="material-icons">verified_user</i>
            Your payment information is encrypted and secure
          </p>
        </div>

        <!-- Success State -->
        <div class="panel success-panel" *ngIf="paymentDone">
          <div class="success-icon-wrap">
            <div class="success-ring"></div>
            <i class="material-icons success-check">check_circle</i>
          </div>
          <h2>Payment Successful!</h2>
          <p class="success-sub">Your fine of <strong>฿{{ paidAmount.toFixed(2) }}</strong> has been paid.</p>
          <div class="success-ref">
            <span>Reference Number</span>
            <strong>{{ refNo }}</strong>
          </div>
          <a routerLink="/profile" class="go-btn">Back to Profile</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 28px 20px; }
    .back { color: var(--text2); font-size: 0.875rem; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 20px; }
    .back:hover { color: var(--text); text-decoration: none; }
    .back i { font-size: 1.1rem; }

    /* Layout */
    .layout { display: grid; grid-template-columns: 300px 1fr; gap: 20px; align-items: start; }

    /* Panels */
    .panel {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 16px; padding: 24px;
    }
    .panel-header {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.9rem; font-weight: 700; margin-bottom: 20px; color: var(--text);
    }
    .panel-header i { color: var(--accent); font-size: 1.2rem; }

    /* Fine list */
    .fine-list { display: flex; flex-direction: column; gap: 10px; }
    .fine-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 10px 12px; background: var(--bg3); border-radius: 10px;
    }
    .fine-title { font-size: 0.82rem; font-weight: 600; margin-bottom: 2px; }
    .fine-date { font-size: 0.72rem; color: var(--text2); }
    .overdue-text { color: var(--danger); font-weight: 600; }
    .fine-amount { font-size: 0.9rem; font-weight: 700; color: var(--danger); white-space: nowrap; }
    .total-row {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 14px; border-top: 1px solid var(--border);
      font-size: 0.85rem; font-weight: 600; margin-top: 4px;
    }
    .total-amount { font-size: 1.1rem; font-weight: 700; color: var(--warning); }

    /* No-fine message */
    .no-fine-msg { text-align: center; padding: 20px 0; }
    .check-circle {
      width: 56px; height: 56px; border-radius: 50%; background: rgba(63,185,80,0.15);
      display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;
    }
    .check-circle i { color: var(--success); font-size: 2rem; }
    .no-fine-msg strong { font-size: 0.9rem; display: block; margin-bottom: 4px; }
    .no-fine-msg p { font-size: 0.8rem; color: var(--text3); }

    /* Info cards */
    .info-cards { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }
    .info-card {
      display: flex; align-items: center; gap: 10px;
      font-size: 0.78rem; color: var(--text3);
    }
    .info-card i { font-size: 1rem; color: var(--accent); }

    /* Method Tabs */
    .method-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
    .method-tab {
      flex: 1; padding: 10px 8px; border-radius: 10px;
      background: var(--bg3); border: 1px solid var(--border); color: var(--text2);
      font-family: inherit; cursor: pointer; display: flex; flex-direction: column;
      align-items: center; gap: 4px; transition: all 0.15s;
    }
    .method-tab i { font-size: 1.3rem; }
    .method-tab span { font-size: 0.72rem; font-weight: 500; }
    .method-tab:hover { border-color: var(--accent); color: var(--text); }
    .method-tab.active {
      background: rgba(9,105,218,0.1); border-color: #0969da;
      color: #0969da;
    }

    /* ── CARD SCENE ── */
    .card-scene { width: 100%; height: 180px; perspective: 1000px; margin-bottom: 24px; }
    .card-3d {
      width: 100%; height: 100%; position: relative;
      transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(.4,0,.2,1);
    }
    .card-3d.is-flipped { transform: rotateY(180deg); }
    .card-face {
      position: absolute; width: 100%; height: 100%; border-radius: 14px;
      backface-visibility: hidden; padding: 18px 22px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    .card-face--front {
      background: linear-gradient(135deg, #0550ae 0%, #0969da 50%, #388bfd 100%);
      display: flex; flex-direction: column; justify-content: space-between; color: white;
    }
    .card-face--back {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      transform: rotateY(180deg); color: white; display: flex; flex-direction: column; justify-content: center;
    }

    .card-brand { display: flex; justify-content: space-between; align-items: center; }
    .chip {
      width: 36px; height: 28px; background: linear-gradient(135deg, #f0c040, #d4a017);
      border-radius: 5px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15);
    }
    .card-logo { font-size: 2rem; opacity: 0.9; }
    .card-number-display {
      font-size: 1.05rem; letter-spacing: 3px; font-family: 'Courier New', monospace;
      opacity: 0.9; text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .card-footer { display: flex; gap: 32px; }
    .card-field-label { font-size: 0.55rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
    .card-field-value { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; }

    .magstripe { height: 44px; background: rgba(0,0,0,0.65); margin: 0 -22px 20px; }
    .sig-strip { display: flex; align-items: center; gap: 12px; justify-content: flex-end; }
    .sig-label { font-size: 0.65rem; opacity: 0.6; }
    .sig-cvv {
      background: white; color: #1e293b; padding: 4px 16px;
      border-radius: 4px; font-family: monospace; font-size: 1rem; letter-spacing: 4px;
      font-weight: 700;
    }
    .card-back-logo { text-align: right; opacity: 0.3; margin-top: 12px; }

    /* Form */
    .form-group { margin-bottom: 14px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    label { display: block; font-size: 0.78rem; color: var(--text2); margin-bottom: 6px; font-weight: 600; }
    .input-with-icon { position: relative; }
    .input-with-icon input { padding-right: 36px; }
    .input-with-icon i { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text3); font-size: 1.1rem; }
    input {
      width: 100%; padding: 9px 12px; background: var(--bg3); border: 1px solid var(--border);
      border-radius: 8px; color: var(--text); font-size: 0.875rem; outline: none; font-family: inherit;
      transition: border-color 0.15s;
    }
    input:focus { border-color: var(--accent); }

    /* PromptPay */
    .promptpay-section { padding: 8px 0; }
    .qr-wrapper { display: flex; gap: 20px; align-items: center; background: var(--bg3); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .qr-box {
      width: 120px; height: 120px; background: white; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .qr-box i { font-size: 96px; color: #000; }
    .qr-amount { font-size: 1.6rem; font-weight: 800; color: var(--warning); margin-bottom: 4px; }
    .qr-sub { font-size: 0.8rem; color: var(--text2); margin-bottom: 10px; }
    .promptpay-id {
      display: inline-flex; align-items: center; gap: 4px;
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 8px; padding: 5px 12px; font-size: 0.8rem; font-family: monospace;
    }
    .pp-steps { display: flex; flex-direction: column; gap: 8px; }
    .pp-step { display: flex; align-items: center; gap: 10px; font-size: 0.82rem; color: var(--text2); }
    .pp-step span {
      width: 22px; height: 22px; border-radius: 50%; background: var(--accent);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 0.72rem; font-weight: 700; flex-shrink: 0;
    }

    /* Bank */
    .bank-card { background: var(--bg3); border-radius: 12px; padding: 18px; margin-bottom: 14px; }
    .bank-logo-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; font-size: 0.9rem; font-weight: 600; }
    .bank-badge {
      padding: 3px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 800;
      letter-spacing: 1px;
    }
    .bank-badge.kbank { background: #1b5e20; color: white; }
    .bank-detail { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 0.82rem; }
    .bank-detail:last-child { border-bottom: none; }
    .bank-detail span { color: var(--text2); }
    .acc-num { font-family: monospace; font-size: 0.9rem; letter-spacing: 1px; }
    .bank-amount { color: var(--warning); font-size: 1rem; }
    .bank-note {
      display: flex; gap: 8px; align-items: flex-start;
      background: rgba(210,153,34,0.1); border: 1px solid rgba(210,153,34,0.3);
      border-radius: 8px; padding: 10px 12px; font-size: 0.78rem; color: var(--text2);
    }
    .bank-note i { color: var(--warning); font-size: 1rem; flex-shrink: 0; }

    /* Error */
    .alert-error {
      background: rgba(248,81,73,0.1); border: 1px solid rgba(248,81,73,0.3);
      color: var(--danger); padding: 10px 14px; border-radius: 8px; font-size: 0.82rem; margin-top: 8px;
    }

    /* Pay Button */
    .pay-btn {
      width: 100%; padding: 13px; margin-top: 16px;
      background: linear-gradient(135deg, #0969da, #0550ae);
      color: white; border: none; border-radius: 10px;
      font-size: 0.9rem; font-weight: 700; font-family: inherit; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: opacity 0.2s, transform 0.1s; box-shadow: 0 4px 12px rgba(9,105,218,0.35);
    }
    .pay-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
    .pay-btn:active:not(:disabled) { transform: translateY(0); }
    .pay-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .pay-btn i { font-size: 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; display: inline-block; }
    .secure-note { text-align: center; font-size: 0.72rem; color: var(--text3); margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 4px; }
    .secure-note i { font-size: 0.9rem; color: var(--success); }

    /* Success */
    .success-panel { text-align: center; padding: 40px 24px; }
    .success-icon-wrap { position: relative; display: inline-block; margin-bottom: 20px; }
    .success-ring {
      width: 80px; height: 80px; border-radius: 50%;
      background: rgba(63,185,80,0.15); border: 2px solid rgba(63,185,80,0.3);
      position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
      animation: pulseRing 1.5s ease-out forwards;
    }
    @keyframes pulseRing { 0% { transform: translate(-50%,-50%) scale(0.5); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(1.5); opacity: 0; } }
    .success-check { font-size: 3.5rem; color: var(--success); animation: popIn 0.4s cubic-bezier(.175,.885,.32,1.5); display: block; }
    @keyframes popIn { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .success-panel h2 { font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; }
    .success-sub { color: var(--text2); font-size: 0.875rem; margin-bottom: 20px; }
    .success-ref {
      background: var(--bg3); border: 1px solid var(--border); border-radius: 10px;
      padding: 12px 20px; display: inline-flex; gap: 12px; align-items: center;
      font-size: 0.82rem; margin-bottom: 24px;
    }
    .success-ref span { color: var(--text3); }
    .success-ref strong { font-family: monospace; color: var(--accent); font-size: 0.9rem; }
    .go-btn {
      display: inline-block; padding: 10px 28px;
      background: var(--accent); color: white; border-radius: 10px;
      font-size: 0.875rem; font-weight: 600; text-decoration: none;
    }
    .go-btn:hover { background: var(--accent2); text-decoration: none; }

    /* Responsive */
    @media (max-width: 768px) {
      .layout { grid-template-columns: 1fr; }
      .qr-wrapper { flex-direction: column; text-align: center; }
    }
    @media (max-width: 480px) {
      .page { padding: 16px 12px; }
      .panel { padding: 16px; }
      .method-tabs { gap: 6px; }
      .method-tab { padding: 8px 4px; }
      .method-tab span { font-size: 0.68rem; }
      .form-row { grid-template-columns: 1fr; }
      .card-number-display { font-size: 0.9rem; letter-spacing: 2px; }
    }
  `]
})
export class PaymentComponent implements OnInit {
  borrows: Borrow[] = [];
  method: 'card' | 'promptpay' | 'bank' = 'card';
  showBack = false;
  processing = false;
  paymentDone = false;
  formError = '';
  paidAmount = 0;
  refNo = '';

  card: CardForm = { number: '', name: '', expiry: '', cvv: '' };

  constructor(
    private bookService: BookService,
    private authService: AuthService,
    private router: Router
  ) { }

  get overdueBorrows(): Borrow[] {
    return this.borrows.filter(b => (b.fine_amount || 0) > 0);
  }

  get totalFine(): number {
    return this.borrows.reduce((s, b) => s + (b.fine_amount || 0), 0);
  }

  get displayCardNumber(): string {
    if (!this.card.number) return '•••• •••• •••• ••••';
    const raw = this.card.number.replace(/\s/g, '');
    const groups: string[] = raw.match(/.{1,4}/g) || [];
    while (groups.length < 4) groups.push('••••');
    return groups.map((g, i) => {
      if (i < groups.length - 1 || raw.length === 16) return g.padEnd(4, '•');
      return g;
    }).join(' ');
  }

  ngOnInit() {
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.bookService.myBorrows().subscribe(r => {
      if (r.data) this.borrows = r.data;
    });
  }

  onCardNumberChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    this.card.number = digits.replace(/(.{4})/g, '$1 ').trim();
  }

  onExpiryChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    this.card.expiry = digits.length > 2
      ? digits.slice(0, 2) + '/' + digits.slice(2)
      : digits;
  }

  processPayment() {
    this.formError = '';

    if (this.method === 'card') {
      const raw = this.card.number.replace(/\s/g, '');
      if (raw.length < 16) { this.formError = 'Please enter a valid 16-digit card number'; return; }
      if (!this.card.name.trim()) { this.formError = 'Please enter the cardholder name'; return; }
      if (this.card.expiry.length < 5) { this.formError = 'Please enter a valid expiry date (MM/YY)'; return; }
      if (this.card.cvv.length < 3) { this.formError = 'Please enter a valid CVV'; return; }
    }

    this.processing = true;
    setTimeout(() => {
      this.processing = false;
      this.paymentDone = true;
      this.paidAmount = this.totalFine || 0;
      this.refNo = 'LIB-' + Date.now().toString(36).toUpperCase();
    }, 1800);
  }

  fmt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
