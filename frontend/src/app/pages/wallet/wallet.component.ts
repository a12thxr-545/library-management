import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { WalletService } from '../../services/wallet.service';
import { BookService } from '../../services/book.service';
import { AuthService } from '../../services/auth.service';
import { RealtimeService, RealtimeMessage } from '../../services/realtime.service';
import { Wallet, WalletTransaction, Borrow } from '../../models';
import { Subscription } from 'rxjs';

import { TranslatePipe } from '../../pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
<div class="wp">
  <!-- PAYMENT GATEWAY MODAL -->
  <div class="overlay" *ngIf="showGateway" (click)="closeGateway($event)">
    <div class="overlay-inner">
    <div class="gw-modal" (click)="$event.stopPropagation()">

      <!-- Header -->
      <div class="gw-header">
        <div class="gw-header-left">
          <div class="gw-logo"><i class="material-icons">lock</i></div>
          <div>
            <div class="gw-title">LibraryPay Gateway</div>
            <div class="gw-sub">{{ 'wallet.gateway.secured' | t }}</div>
          </div>
        </div>
        <button class="gw-close" (click)="closeGateway(null)" *ngIf="!gwProcessing && !gwDone">
          <i class="material-icons">close</i>
        </button>
      </div>

      <!-- Amount Banner -->
      <div class="gw-amount-bar" *ngIf="!gwDone">
        <span class="gw-amount-label">{{ 'wallet.gateway.amount' | t }}</span>
        <span class="gw-amount-val">฿{{ topUpAmount | number:'1.2-2' }}</span>
      </div>

      <!-- Method Tabs -->
      <div class="gw-tabs" *ngIf="!gwProcessing && !gwDone">
        <button class="gw-tab" [class.act]="gwMethod==='card'" (click)="gwMethod='card'">
          <i class="material-icons">credit_card</i><span>{{ 'wallet.gateway.card' | t }}</span>
        </button>
        <button class="gw-tab" [class.act]="gwMethod==='promptpay'" (click)="gwMethod='promptpay'">
          <i class="material-icons">qr_code_2</i><span>{{ 'wallet.gateway.promptpay' | t }}</span>
        </button>
        <button class="gw-tab" [class.act]="gwMethod==='bank'" (click)="gwMethod='bank'">
          <i class="material-icons">account_balance</i><span>{{ 'wallet.gateway.transfer' | t }}</span>
        </button>
      </div>

      <!-- CARD METHOD -->
      <div *ngIf="gwMethod==='card' && !gwProcessing && !gwDone" class="gw-body">
        <!-- 3D Card Preview -->
        <div class="card-scene">
          <div class="card-3d" [class.flipped]="showCardBack">
            <div class="card-front">
              <div class="card-top-row">
                <div class="chip"></div>
                <i class="material-icons card-brand-ico">credit_card</i>
              </div>
              <div class="card-num">{{ displayCardNum }}</div>
              <div class="card-bottom">
                <div><div class="card-fl">CARDHOLDER</div><div class="card-fv">{{ card.name || 'YOUR NAME' }}</div></div>
                <div><div class="card-fl">EXPIRES</div><div class="card-fv">{{ card.expiry || 'MM/YY' }}</div></div>
              </div>
            </div>
            <div class="card-back">
              <div class="magstripe"></div>
              <div class="sig-row">
                <span class="sig-lbl">CVV</span>
                <span class="sig-cvv">{{ card.cvv || '•••' }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Card Form -->
        <div class="gw-form">
          <div class="gw-field">
            <label>{{ 'wallet.gateway.card_number' | t }}</label>
            <div class="gw-input-wrap">
              <input [(ngModel)]="card.number" (ngModelChange)="fmtCard($event)" (focus)="showCardBack=false" placeholder="1234 5678 9012 3456" maxlength="19">
              <i class="material-icons">credit_card</i>
            </div>
          </div>
          <div class="gw-field">
            <label>{{ 'wallet.gateway.card_holder' | t }}</label>
            <input [(ngModel)]="card.name" (focus)="showCardBack=false" placeholder="Name on card">
          </div>
          <div class="gw-row2">
            <div class="gw-field">
              <label>{{ 'wallet.gateway.card_expiry' | t }}</label>
              <input [(ngModel)]="card.expiry" (ngModelChange)="fmtExpiry($event)" (focus)="showCardBack=false" placeholder="MM/YY" maxlength="5">
            </div>
            <div class="gw-field">
              <label>{{ 'wallet.gateway.card_cvv' | t }}</label>
              <input [(ngModel)]="card.cvv" (input)="showCardBack=true" (blur)="showCardBack=false" placeholder="123" maxlength="4" type="password">
            </div>
          </div>
        </div>
      </div>

      <!-- PROMPTPAY METHOD -->
      <div *ngIf="gwMethod==='promptpay' && !gwProcessing && !gwDone" class="gw-body">
        <div class="pp-wrap">
          <div class="qr-box">
            <div class="qr-inner">
              <i class="material-icons" style="font-size:100px;color:#000">qr_code_2</i>
            </div>
          </div>
          <div class="pp-info">
            <div class="pp-amt">฿{{ topUpAmount | number:'1.2-2' }}</div>
            <div class="pp-hint">{{ 'wallet.gateway.pp_hint' | t }}</div>
            <div class="pp-id"><i class="material-icons">phone_iphone</i> PromptPay: 081-234-5678</div>
          </div>
        </div>
        <div class="pp-steps">
          <div class="pp-step"><span>1</span> {{ 'wallet.gateway.pp_step1' | t }}</div>
          <div class="pp-step"><span>2</span> {{ 'wallet.gateway.pp_step2' | t }}</div>
          <div class="pp-step"><span>3</span> {{ 'wallet.gateway.pp_step3' | t }} ฿{{ topUpAmount | number }}</div>
          <div class="pp-step"><span>4</span> {{ 'wallet.gateway.pp_step4' | t }}</div>
        </div>
      </div>

      <!-- BANK TRANSFER METHOD -->
      <div *ngIf="gwMethod==='bank' && !gwProcessing && !gwDone" class="gw-body">
        <div class="bank-card">
          <div class="bank-logo-row"><div class="bank-badge kbank">KBANK</div><span>{{ 'wallet.gateway.bank_name' | t }}</span></div>
          <div class="bank-row"><span>{{ 'wallet.gateway.acc_name' | t }}</span><strong>LibraryTH Co., Ltd.</strong></div>
          <div class="bank-row"><span>{{ 'wallet.gateway.acc_num' | t }}</span><strong class="mono">012-3-45678-9</strong></div>
          <div class="bank-row"><span>{{ 'wallet.gateway.transfer_amt' | t }}</span><strong class="bank-amt">฿{{ topUpAmount | number:'1.2-2' }}</strong></div>
        </div>
        <div class="bank-note">
          <i class="material-icons">info</i>
          {{ 'wallet.gateway.bank_hint' | t }}
        </div>
      </div>

      <!-- PROCESSING STATE -->
      <div class="gw-processing" *ngIf="gwProcessing">
        <div class="proc-ring"></div>
        <div class="proc-icon"><i class="material-icons spin">autorenew</i></div>
        <div class="proc-title">{{ 'wallet.gateway.processing' | t }}</div>
        <div class="proc-steps">
          <div class="proc-step" [class.done]="procStep>0" [class.active]="procStep===0">
            <i class="material-icons">{{ procStep>0?'check_circle':'radio_button_unchecked' }}</i> {{ 'wallet.gateway.proc_verify' | t }}
          </div>
          <div class="proc-step" [class.done]="procStep>1" [class.active]="procStep===1">
            <i class="material-icons">{{ procStep>1?'check_circle':'radio_button_unchecked' }}</i> {{ 'wallet.gateway.proc_confirm' | t }}
          </div>
          <div class="proc-step" [class.done]="procStep>2" [class.active]="procStep===2">
            <i class="material-icons">{{ procStep>2?'check_circle':'radio_button_unchecked' }}</i> {{ 'wallet.gateway.proc_wallet' | t }}
          </div>
        </div>
      </div>

      <!-- SUCCESS STATE -->
      <div class="gw-success" *ngIf="gwDone">
        <div class="succ-ring"></div>
        <i class="material-icons succ-ico">check_circle</i>
        <h2>{{ 'wallet.gateway.success_title' | t }}</h2>
        <p>{{ 'wallet.gateway.success_sub' | t }} <strong>฿{{ gwPaid | number:'1.2-2' }}</strong></p>
        <div class="succ-ref">
          <span>{{ 'wallet.gateway.ref_code' | t }}</span><strong>{{ gwRef }}</strong>
        </div>
        <div class="succ-bal">
          <span>{{ 'wallet.balance' | t }}</span>
          <span class="succ-bal-val">฿{{ wallet ? wallet.balance.toFixed(2) : '0.00' }}</span>
        </div>
        <button class="succ-btn" (click)="closeGateway(null)">{{ 'wallet.gateway.close' | t }}</button>
      </div>

      <!-- Error MSG -->
      <div class="gw-error" *ngIf="gwError && !gwProcessing && !gwDone">{{ gwError }}</div>

      <!-- Action Button -->
      <div class="gw-footer" *ngIf="!gwProcessing && !gwDone">
        <button class="gw-pay-btn" (click)="confirmPayment()">
          <i class="material-icons">lock</i>
          {{ gwMethod==='card' ? ('wallet.gateway.card' | t) : gwMethod==='promptpay' ? ('wallet.gateway.confirm_btn' | t) : ('wallet.gateway.send_slip' | t) }}
          ฿{{ topUpAmount | number:'1.2-2' }}
        </button>
        <p class="gw-secure"><i class="material-icons">verified_user</i> {{ 'wallet.gateway.secure_info' | t }}</p>
      </div>

    </div>
  </div>
  </div>

  <!-- MAIN PAGE -->
  <div class="page-header">
    <a (click)="goBack()" class="back-btn" style="cursor: pointer"><i class="material-icons">arrow_back</i> {{ 'common.return' | t }}</a>
    <div class="header-title">
      <i class="material-icons">account_balance_wallet</i>
      <h1>{{ 'wallet.title' | t }}</h1>
    </div>
  </div>

  <div class="wallet-layout">
    <div class="left-col">
      <!-- Wallet Card -->
      <div class="wcard" *ngIf="!(loadingService.loading$ | async); else walletCardSkeleton">
        <div class="wcard-bg"></div>
        <div class="wcard-content">
          <div class="wcard-top">
            <div class="wcard-icon"><i class="material-icons">account_balance_wallet</i></div>
            <div class="wcard-label">{{ 'wallet.balance' | t }}</div>
          </div>
          <div class="bal-display">
            <span class="bal-cur">฿</span>
            <span class="bal-amt">{{ wallet ? wallet.balance.toFixed(2) : '0.00' }}</span>
          </div>
          <div class="wcard-foot">
            <span class="wcard-username">{{ userName }}</span>
            <span class="dots">●●●● ●●●● ●●●●</span>
          </div>
        </div>
      </div>
      <ng-template #walletCardSkeleton>
        <div class="wcard">
          <div class="skeleton" style="width: 100%; height: 100%;"></div>
        </div>
      </ng-template>

      <!-- Top-Up Panel -->
      <div class="panel">
        <div class="ph"><i class="material-icons">add_circle</i><span>{{ 'wallet.topup' | t }}</span></div>
        <div class="quick-grid">
          <button class="qbtn" *ngFor="let a of quickAmounts" [class.sel]="topUpAmount===a" (click)="topUpAmount=a">
            ฿{{ a | number }}
          </button>
        </div>
        <label class="field-lbl">{{ ('wallet.topup.placeholder' | t) + ' (฿)' }}</label>
        <div class="amt-row">
          <span class="baht">฿</span>
          <input type="number" [(ngModel)]="topUpAmount" min="1" max="100000" [placeholder]="'wallet.topup.placeholder' | t" class="amt-inp">
        </div>
        <button class="topup-btn" (click)="openGateway()">
          <i class="material-icons">add</i> {{ 'wallet.topup.btn' | t }} ฿{{ topUpAmount | number }}
        </button>
        <!-- Payment method badges -->
        <div class="pm-badges">
          <div class="pm-badge"><i class="material-icons">credit_card</i><span>{{ 'wallet.gateway.card' | t }}</span></div>
          <div class="pm-badge"><i class="material-icons">qr_code_2</i><span>{{ 'wallet.gateway.promptpay' | t }}</span></div>
          <div class="pm-badge"><i class="material-icons">account_balance</i><span>{{ 'wallet.gateway.transfer' | t }}</span></div>
        </div>
      </div>

      <!-- Fines -->
      <div class="panel fine-panel" *ngIf="unpaidFines.length>0">
        <div class="ph danger"><i class="material-icons">warning</i><span>{{ 'wallet.fines' | t }}</span><span class="bdg">{{ unpaidFines.length }}</span></div>
        <div *ngFor="let b of unpaidFines" class="fine-item">
          <div class="fi-info">
            <div class="fi-title">{{ b.book_title||'Book' }}</div>
            <div class="fi-over"><i class="material-icons">schedule</i>{{ 'common.overdue' | t }} {{ daysOverdue(b.due_date) }} {{ 'common.days' | t }}</div>
          </div>
          <div class="fi-right">
            <div class="fi-amt">฿{{ b.fine_amount.toFixed(2) }}</div>
            <button class="pay-btn" (click)="payFine(b)" [disabled]="payingFineId===b.id">
              <i class="material-icons">{{ payingFineId===b.id?'autorenew':'payment' }}</i>{{ payingFineId===b.id?'...':'profile.pay_debt' | t }}
            </button>
          </div>
        </div>
        <div class="fine-total"><span>{{ 'home.view_all' | t }}</span><span class="fine-total-amt">฿{{ totalUnpaidFine.toFixed(2) }}</span></div>
        <div class="alert-err" *ngIf="fineError">{{ fineError }}</div>
        <div class="alert-ok" *ngIf="fineSuccess">{{ fineSuccess }}</div>
      </div>

      <div class="panel all-clear" *ngIf="unpaidFines.length===0 && !loading">
        <div class="ac-ico"><i class="material-icons">verified</i></div>
        <strong>{{ 'wallet.fines' | t }} : {{ 'common.returned' | t }}</strong>
      </div>
    </div>

    <div class="right-col">
      <div class="panel">
        <div class="ph"><i class="material-icons">history</i><span>{{ 'wallet.history' | t }}</span></div>
        <div class="txn-list" *ngIf="!(loadingService.loading$ | async); else txnSkeleton">
          <div class="txn-item" *ngFor="let tx of transactions" [class.tt]="tx.tx_type==='topup'" [class.tf]="tx.tx_type!=='topup'">
            <div class="txn-ico"><i class="material-icons">{{ tx.tx_type==='topup'?'add_circle':'remove_circle' }}</i></div>
            <div class="txn-info">
              <div class="txn-desc">{{ getTxDesc(tx.description) }}</div>
              <div class="txn-date">{{ fmtDate(tx.created_at) }}</div>
            </div>
            <div class="txn-amt" [class.pos]="tx.tx_type==='topup'" [class.neg]="tx.tx_type!=='topup'">
              {{ tx.tx_type==='topup'?'+':'-' }}฿{{ tx.amount.toFixed(2) }}
            </div>
          </div>
          <div class="empty-t" *ngIf="transactions.length===0">
            <i class="material-icons">receipt_long</i><p>{{ 'common.no_records' | t }}</p>
          </div>
        </div>
        <ng-template #txnSkeleton>
          <div class="txn-item" *ngFor="let s of [1,2,3,4,5]">
            <div class="skeleton" style="width: 34px; height: 34px; border-radius: 50%;"></div>
            <div class="txn-info">
              <div class="skeleton" style="height: 14px; width: 60%; margin-bottom: 6px;"></div>
              <div class="skeleton" style="height: 10px; width: 40%;"></div>
            </div>
            <div class="skeleton" style="height: 18px; width: 60px;"></div>
          </div>
        </ng-template>
      </div>

      <div class="panel">
        <div class="ph"><i class="material-icons">info</i><span>{{ 'wallet.fine_rate' | t }}</span></div>
        <div class="rate-row"><div class="rr-left"><i class="material-icons">school</i>{{ 'wallet.student' | t }}</div><div class="rr-val">25 {{ 'wallet.fine_rate.per_day' | t }}</div></div>
        <div class="rate-row"><div class="rr-left"><i class="material-icons">person</i>{{ 'wallet.professor' | t }}</div><div class="rr-val">15 {{ 'wallet.fine_rate.per_day' | t }}</div></div>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .wp { max-width:1020px; margin:0 auto; padding:24px 20px 60px; font-family:'Inter',sans-serif; }

    /* ── Header ── */
    .page-header { display:flex; align-items:center; gap:16px; margin-bottom:24px; flex-wrap: wrap; }
    .back-btn { display:inline-flex; align-items:center; gap:4px; color:var(--text2); font-size:.875rem; text-decoration:none; padding: 6px 0; }
    .back-btn:hover { color:var(--text); text-decoration:none; }
    .header-title { display:flex; align-items:center; gap:10px; flex: 1; min-width: 200px; }
    .header-title i { font-size:1.4rem; color:var(--accent); background:rgba(9,105,218,.12); padding:6px; border-radius:10px; }
    .header-title h1 { font-size:1.3rem; font-weight:800; margin:0; white-space: nowrap; }

    /* ── Layout ── */
    .wallet-layout { display:grid; grid-template-columns:360px 1fr; gap:20px; align-items:start; }
    @media (max-width:960px) { .wallet-layout { grid-template-columns:1fr; } }
    .left-col,.right-col { display:flex; flex-direction:column; gap:16px; }

    /* ── Wallet Card ── */
    .wcard { position:relative; border-radius:20px; overflow:hidden; height:190px; box-shadow:0 12px 40px rgba(9,105,218,.3); }
    .wcard-bg { position:absolute; inset:0; background:linear-gradient(135deg,#0550ae 0%,#0969da 50%,#54aeff 100%); }
    .wcard-bg::before,.wcard-bg::after { content:''; position:absolute; border-radius:50%; background:rgba(255,255,255,.07); }
    .wcard-bg::before { width:260px; height:260px; top:-80px; right:-60px; }
    .wcard-bg::after { width:160px; height:160px; bottom:-50px; left:-40px; background:rgba(255,255,255,.05); }
    .wcard-content { position:relative; z-index:1; height:100%; padding:22px 24px; display:flex; flex-direction:column; justify-content:space-between; color:white; }
    .wcard-top { display:flex; align-items:center; gap:10px; }
    .wcard-icon { width:34px; height:34px; background:rgba(255,255,255,.2); border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; }
    .wcard-label { font-size:.75rem; opacity:.7; text-transform:uppercase; letter-spacing:.5px; }
    .bal-display { display:flex; align-items:baseline; gap:4px; margin: 10px 0; }
    .bal-cur { font-size:1.3rem; font-weight:700; opacity:.85; }
    .bal-amt { font-size:2.4rem; font-weight:800; letter-spacing:-1px; line-height:1; }
    .wcard-foot { display:flex; justify-content:space-between; align-items:center; font-size:.8rem; }
    .wcard-username { font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .dots { opacity:.35; letter-spacing:2px; font-size:.6rem; }

    /* ── Panel ── */
    .panel { background:var(--bg2); border:1px solid var(--border); border-radius:16px; padding:20px; }
    .ph { display:flex; align-items:center; gap:8px; font-size:.88rem; font-weight:700; margin-bottom:16px; }
    .ph i { color:var(--accent); font-size:1.2rem; }
    .ph.danger i { color:var(--danger); }
    .bdg { margin-left:auto; background:var(--danger); color:white; font-size:.7rem; font-weight:700; padding:1px 8px; border-radius:20px; }

    /* ── Top-Up ── */
    .quick-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px; }
    .qbtn { padding:8px 4px; background:var(--bg3); border:1px solid var(--border); border-radius:8px; color:var(--text2); font-family:inherit; font-size:.8rem; font-weight:600; cursor:pointer; transition:all .15s; }
    .qbtn:hover,.qbtn.sel { border-color:var(--accent); color:var(--accent); background:rgba(9,105,218,.1); }
    .field-lbl { font-size:.75rem; color:var(--text2); font-weight:600; display:block; margin-bottom:6px; }
    .amt-row { display:flex; align-items:center; background:var(--bg3); border:1px solid var(--border); border-radius:10px; margin-bottom:14px; }
    .amt-row:focus-within { border-color:var(--accent); }
    .baht { padding:0 12px; color:var(--accent); font-weight:700; font-size:1rem; }
    .amt-inp { flex:1; border:none; background:transparent; padding:10px 12px 10px 0; font-size:1rem; font-weight:600; color:var(--text); outline:none; font-family:inherit; }
    .topup-btn { width:100%; padding:13px; background:linear-gradient(135deg,#0969da,#0550ae); color:white; border:none; border-radius:10px; font-family:inherit; font-size:.9rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:all .2s; box-shadow:0 4px 14px rgba(9,105,218,.3); margin-bottom:14px; }
    .topup-btn:hover { opacity:.9; transform:translateY(-1px); }
    .pm-badges { display:flex; gap:8px; }
    .pm-badge { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 4px; background:var(--bg3); border:1px solid var(--border); border-radius:8px; font-size:.68rem; color:var(--text3); }
    .pm-badge i { font-size:1rem; color:var(--accent); }

    /* ── Fines ── */
    .fine-item { display:flex; align-items:center; gap:12px; padding:12px; background:rgba(248,81,73,.05); border:1px solid rgba(248,81,73,.15); border-radius:10px; margin-bottom:8px; }
    .fi-info { flex:1; min-width:0; }
    .fi-title { font-size:.83rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
    .fi-over { display:flex; align-items:center; gap:3px; font-size:.7rem; color:var(--danger); }
    .fi-over i { font-size:.75rem; }
    .fi-right { display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0; }
    .fi-amt { font-size:.95rem; font-weight:800; color:var(--danger); }
    .pay-btn { display:flex; align-items:center; gap:3px; padding:4px 10px; background:var(--danger); color:white; border:none; border-radius:6px; font-family:inherit; font-size:.72rem; font-weight:700; cursor:pointer; }
    .pay-btn:disabled { opacity:.5; cursor:not-allowed; }
    .fine-total { display:flex; justify-content:space-between; padding-top:12px; border-top:1px solid var(--border); font-size:.82rem; font-weight:600; }
    .fine-total-amt { font-weight:800; color:var(--danger); }
    .all-clear { text-align:center; padding:28px; }
    .ac-ico { width:56px; height:56px; background:rgba(63,185,80,.12); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 12px; }
    .ac-ico i { color:var(--success); font-size:2rem; }
    .all-clear strong { display:block; font-size:.9rem; margin-bottom:4px; }
    .all-clear p { font-size:.78rem; color:var(--text3); margin:0; }
    .alert-err { background:rgba(248,81,73,.1); border:1px solid rgba(248,81,73,.25); color:var(--danger); padding:9px 12px; border-radius:8px; font-size:.8rem; margin-top:10px; }
    .alert-ok { background:rgba(63,185,80,.1); border:1px solid rgba(63,185,80,.25); color:var(--success); padding:9px 12px; border-radius:8px; font-size:.8rem; margin-top:10px; }

    /* ── Transactions ── */
    .txn-item { display:flex; align-items:center; gap:12px; padding:11px; border-radius:10px; background:var(--bg3); margin-bottom:6px; }
    .txn-ico { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .tt .txn-ico { background:rgba(63,185,80,.12); } .tt .txn-ico i { color:var(--success); }
    .tf .txn-ico { background:rgba(248,81,73,.1); } .tf .txn-ico i { color:var(--danger); }
    .txn-info { flex:1; min-width:0; }
    .txn-desc { font-size:.82rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .txn-date { font-size:.7rem; color:var(--text3); margin-top:2px; }
    .txn-amt { font-size:.88rem; font-weight:800; flex-shrink:0; }
    .pos { color:var(--success); } .neg { color:var(--danger); }
    .empty-t { text-align:center; padding:36px 0; color:var(--text3); }
    .empty-t i { font-size:2.4rem; display:block; opacity:.35; margin-bottom:8px; }
    .empty-t p { font-size:.82rem; margin:0; }
    .rate-row { display:flex; justify-content:space-between; align-items:center; padding:9px 12px; background:var(--bg3); border-radius:8px; margin-bottom:8px; }
    .rr-left { display:flex; align-items:center; gap:8px; font-size:.82rem; color:var(--text2); }
    .rr-left i { font-size:1rem; color:var(--accent); }
    .rr-val { font-size:.85rem; font-weight:700; color:var(--warning); }
    .rate-note { display:flex; align-items:center; gap:6px; font-size:.75rem; color:var(--text3); margin-top:4px; }
    .rate-note i { font-size:.9rem; color:var(--accent); }
    .loading-s { display:flex; align-items:center; justify-content:center; gap:8px; padding:36px 0; color:var(--text3); font-size:.85rem; }

    /* ── GATEWAY MODAL ── */
    .overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); backdrop-filter:blur(8px); z-index:9000; overflow-y:auto; -webkit-overflow-scrolling:touch; animation:fadeIn .2s ease; overscroll-behavior:contain; }
    .overlay-inner { min-height:100%; display:flex; align-items:center; justify-content:center; padding:16px 12px; box-sizing:border-box; }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    .gw-modal { background:var(--bg2); border:1px solid var(--border); border-radius:24px; width:100%; max-width:480px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,.5); animation:slideUp .25s cubic-bezier(.175,.885,.32,1.275); flex-shrink:0; }
    @media (max-width:600px) { .gw-modal { border-radius:20px; width:100%; max-width:100%; } .overlay-inner { padding:12px 8px; align-items:center; } }
    @keyframes slideUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
    .gw-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); }
    .gw-header-left { display:flex; align-items:center; gap:12px; }
    .gw-logo { width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg,#0969da,#0550ae); display:flex; align-items:center; justify-content:center; }
    .gw-logo i { color:white; font-size:1.2rem; }
    .gw-title { font-size:.9rem; font-weight:800; }
    .gw-sub { font-size:.7rem; color:var(--success); display:flex; align-items:center; gap:3px; margin-top:1px; }
    .gw-close { background:none; border:none; color:var(--text2); cursor:pointer; padding:4px; border-radius:6px; display:flex; align-items:center; }
    .gw-close:hover { background:var(--bg3); color:var(--text); }
    .gw-amount-bar { display:flex; justify-content:space-between; align-items:center; padding:12px 20px; background:rgba(9,105,218,.08); border-bottom:1px solid var(--border); }
    .gw-amount-label { font-size:.78rem; color:var(--text2); font-weight:600; }
    .gw-amount-val { font-size:1.2rem; font-weight:800; color:var(--accent); }
    .gw-tabs { display:flex; gap:0; border-bottom:1px solid var(--border); }
    .gw-tab { flex:1; padding:12px 6px; background:none; border:none; border-bottom:2px solid transparent; color:var(--text2); font-family:inherit; font-size:.72rem; font-weight:600; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px; transition:all .15s; }
    .gw-tab i { font-size:1.2rem; }
    .gw-tab.act { border-bottom-color:var(--accent); color:var(--accent); background:rgba(9,105,218,.05); }
    .gw-body { padding:20px; overflow-y: auto; flex: 1; scrollbar-width: thin; }

    /* 3D Card */
    .card-scene { height:180px; perspective:1000px; margin-bottom:20px; display: flex; justify-content: center; align-items: center; }
    .card-3d { width:280px; height:100%; position:relative; transform-style:preserve-3d; transition:transform .6s cubic-bezier(.4,0,.2,1); }
    @media (max-width: 360px) { .card-3d { transform: scale(0.9); } }
    .card-3d.flipped { transform:rotateY(180deg); }
    .card-front,.card-back { position:absolute; width:100%; height:100%; border-radius:14px; backface-visibility:hidden; padding:18px 20px; box-shadow:0 8px 28px rgba(0,0,0,.35); }
    .card-front { background:linear-gradient(135deg,#0550ae,#0969da 55%,#388bfd); color:white; display:flex; flex-direction:column; justify-content:space-between; }
    .card-back { background:linear-gradient(135deg,#1e293b,#334155); transform:rotateY(180deg); color:white; display:flex; flex-direction:column; justify-content:center; }
    .card-top-row { display:flex; justify-content:space-between; align-items:center; }
    .chip { width:34px; height:26px; background:linear-gradient(135deg,#f0c040,#d4a017); border-radius:4px; }
    .card-brand-ico { font-size:1.8rem; opacity:.9; }
    .card-num { font-size:1rem; letter-spacing:3px; font-family:'Courier New',monospace; opacity:.9; }
    .card-bottom { display:flex; gap:24px; }
    .card-fl { font-size:.5rem; opacity:.55; text-transform:uppercase; letter-spacing:1px; margin-bottom:2px; }
    .card-fv { font-size:.78rem; font-weight:600; text-transform:uppercase; }
    .magstripe { height:40px; background:rgba(0,0,0,.65); margin:0 -20px 18px; }
    .sig-row { display:flex; align-items:center; gap:10px; justify-content:flex-end; }
    .sig-lbl { font-size:.6rem; opacity:.55; }
    .sig-cvv { background:white; color:#1e293b; padding:4px 14px; border-radius:4px; font-family:monospace; font-size:.95rem; letter-spacing:3px; font-weight:700; }

    /* Card form */
    .gw-form { display:flex; flex-direction:column; gap:12px; }
    .gw-field label { font-size:.73rem; color:var(--text2); font-weight:600; display:block; margin-bottom:5px; }
    .gw-field input { width:100%; padding:9px 12px; background:var(--bg3); border:1px solid var(--border); border-radius:8px; color:var(--text); font-size:.875rem; outline:none; font-family:inherit; box-sizing:border-box; transition:border-color .15s; }
    .gw-field input:focus { border-color:var(--accent); }
    .gw-input-wrap { position:relative; }
    .gw-input-wrap input { padding-right:36px; }
    .gw-input-wrap i { position:absolute; right:10px; top:50%; transform:translateY(-50%); color:var(--text3); font-size:1rem; }
    .gw-row2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

    /* PromptPay */
    .pp-wrap { display:flex; gap:16px; align-items:center; background:var(--bg3); border-radius:12px; padding:16px; margin-bottom:16px; }
    .qr-box { width:110px; height:110px; background:white; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .pp-info { flex:1; }
    .pp-amt { font-size:1.5rem; font-weight:800; color:var(--warning); margin-bottom:4px; }
    .pp-hint { font-size:.78rem; color:var(--text2); margin-bottom:8px; }
    .pp-id { display:inline-flex; align-items:center; gap:4px; background:var(--bg2); border:1px solid var(--border); border-radius:6px; padding:4px 10px; font-size:.75rem; font-family:monospace; }
    .pp-steps { display:flex; flex-direction:column; gap:8px; }
    .pp-step { display:flex; align-items:center; gap:10px; font-size:.8rem; color:var(--text2); }
    .pp-step span { width:20px; height:20px; border-radius:50%; background:var(--accent); color:white; display:flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:700; flex-shrink:0; }

    /* Bank */
    .bank-card { background:var(--bg3); border-radius:12px; padding:16px; margin-bottom:12px; }
    .bank-logo-row { display:flex; align-items:center; gap:10px; margin-bottom:12px; font-size:.88rem; font-weight:600; }
    .bank-badge { padding:2px 8px; border-radius:4px; font-size:.72rem; font-weight:800; letter-spacing:1px; }
    .kbank { background:#1b5e20; color:white; }
    .bank-row { display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px solid var(--border); font-size:.82rem; }
    .bank-row:last-child { border-bottom:none; }
    .bank-row span { color:var(--text2); }
    .mono { font-family:monospace; letter-spacing:1px; }
    .bank-amt { color:var(--warning); font-size:.95rem; }
    .bank-note { display:flex; gap:8px; background:rgba(210,153,34,.1); border:1px solid rgba(210,153,34,.3); border-radius:8px; padding:10px 12px; font-size:.78rem; color:var(--text2); align-items:flex-start; }
    .bank-note i { color:var(--warning); font-size:1rem; flex-shrink:0; }

    /* Processing */
    .gw-processing { padding:40px 20px; text-align:center; position:relative; }
    .proc-ring { width:80px; height:80px; border-radius:50%; border:3px solid var(--border); border-top-color:var(--accent); animation:spin 1s linear infinite; margin:0 auto 8px; }
    .proc-icon { position:absolute; top:40px; left:50%; transform:translateX(-50%); width:80px; height:80px; display:flex; align-items:center; justify-content:center; }
    .proc-icon i { font-size:2rem; color:var(--accent); }
    .proc-title { font-size:.95rem; font-weight:700; margin-bottom:24px; margin-top:8px; }
    .proc-steps { display:flex; flex-direction:column; gap:10px; text-align:left; padding:0 20px; }
    .proc-step { display:flex; align-items:center; gap:10px; font-size:.82rem; color:var(--text3); transition:color .3s; }
    .proc-step i { font-size:1.1rem; transition:color .3s; }
    .proc-step.active { color:var(--accent); font-weight:600; }
    .proc-step.active i { color:var(--accent); animation:spin 1s linear infinite; }
    .proc-step.done { color:var(--success); }
    .proc-step.done i { color:var(--success); animation:none; }

    /* Success */
    .gw-success { padding:36px 24px; text-align:center; position:relative; }
    .succ-ring { position:absolute; width:90px; height:90px; border-radius:50%; border:2px solid rgba(63,185,80,.3); background:rgba(63,185,80,.08); top:36px; left:50%; transform:translateX(-50%); animation:pulse 1.5s ease-out forwards; }
    @keyframes pulse { 0%{transform:translateX(-50%) scale(.6);opacity:1} 100%{transform:translateX(-50%) scale(1.6);opacity:0} }
    .succ-ico { font-size:3.5rem; color:var(--success); display:block; animation:pop .4s cubic-bezier(.175,.885,.32,1.5); }
    @keyframes pop { from{transform:scale(.3);opacity:0} to{transform:scale(1);opacity:1} }
    .gw-success h2 { font-size:1.2rem; font-weight:800; margin:8px 0 4px; }
    .gw-success p { color:var(--text2); font-size:.87rem; margin-bottom:16px; }
    .succ-ref { background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:10px 16px; display:inline-flex; gap:10px; align-items:center; font-size:.8rem; margin-bottom:10px; }
    .succ-ref span { color:var(--text3); }
    .succ-ref strong { font-family:monospace; color:var(--accent); }
    .succ-bal { display:flex; justify-content:space-between; padding:12px 16px; background:rgba(9,105,218,.08); border-radius:10px; font-size:.85rem; margin-bottom:20px; }
    .succ-bal-val { font-weight:800; color:var(--accent); }
    .succ-btn { padding:10px 32px; background:var(--accent); color:white; border:none; border-radius:10px; font-family:inherit; font-size:.875rem; font-weight:700; cursor:pointer; }
    .succ-btn:hover { opacity:.9; }

    /* Footer */
    .gw-error { margin:0 20px; padding:9px 12px; background:rgba(248,81,73,.1); border:1px solid rgba(248,81,73,.25); color:var(--danger); border-radius:8px; font-size:.8rem; }
    .gw-footer { padding:16px 20px; border-top:1px solid var(--border); }
    .gw-pay-btn { width:100%; padding:13px; background:linear-gradient(135deg,#0969da,#0550ae); color:white; border:none; border-radius:10px; font-family:inherit; font-size:.92rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 14px rgba(9,105,218,.35); transition:all .2s; }
    .gw-pay-btn:hover { opacity:.9; transform:translateY(-1px); }
    .gw-pay-btn i { font-size:1rem; }
    .gw-secure { display:flex; align-items:center; justify-content:center; gap:4px; font-size:.7rem; color:var(--text3); margin:8px 0 0; }
    .gw-secure i { font-size:.85rem; color:var(--success); }

    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { animation:spin 1s linear infinite; display:inline-block; }

    @media (max-width:960px) { 
        .wp { padding: 20px 16px 60px; }
        .wallet-layout { grid-template-columns: 1fr; } 
    }
    @media (max-width:480px) { 
      .wp { padding:16px 12px 40px; } 
      .gw-header { padding: 14px 16px; }
      .gw-body { padding: 16px; }
      .gw-row2 { grid-template-columns:1fr; } 
      .pm-badges { gap: 6px; }
      .pm-badge { min-width: 0; flex: 1; padding: 6px 2px; font-size: 0.62rem; }
      .pm-badge i { font-size: 0.9rem; }
      .gw-tabs { overflow-x: auto; scrollbar-width: none; }
      .gw-tabs::-webkit-scrollbar { display: none; }
      .gw-tab { min-width: 80px; padding: 10px 4px; font-size: 0.68rem; }
      .quick-grid { grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .qbtn { font-size: 0.75rem; padding: 10px 2px; }
    }
  `]
})
export class WalletComponent implements OnInit, OnDestroy {
  wallet: Wallet | null = null;
  transactions: WalletTransaction[] = [];
  borrows: Borrow[] = [];
  loading = true;
  payingFineId: string | null = null;
  topUpAmount = 100;
  fineError = '';
  fineSuccess = '';
  quickAmounts = [50, 100, 200, 500, 1000, 2000];
  private sub: Subscription | null = null;
  fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="50"><rect width="36" height="50" fill="%2330363d"/><text x="18" y="25" font-family="sans-serif" font-size="10" fill="%238b949e" text-anchor="middle" dy=".3em">📚</text></svg>';

  // Gateway state
  showGateway = false;
  gwMethod: 'card' | 'promptpay' | 'bank' = 'card';
  gwProcessing = false;
  gwDone = false;
  gwError = '';
  gwPaid = 0;
  gwRef = '';
  procStep = 0;
  showCardBack = false;
  card = { number: '', name: '', expiry: '', cvv: '' };

  constructor(
    private walletService: WalletService,
    private bookService: BookService,
    private authService: AuthService,
    private realtime: RealtimeService,
    private router: Router,
    private location: Location,
    public loadingService: LoadingService,
    private languageService: LanguageService
  ) { }

  get userName() {
    const u = this.authService.currentUser;
    return u?.full_name || u?.username || 'ผู้ใช้';
  }
  get unpaidFines() { return this.borrows.filter(b => (b.fine_amount || 0) > 0 && !b.fine_paid); }
  get totalUnpaidFine() { return this.unpaidFines.reduce((s, b) => s + (b.fine_amount || 0), 0); }

  get displayCardNum(): string {
    const raw = this.card.number.replace(/\s/g, '');
    const groups: string[] = raw.match(/.{1,4}/g) || [];
    while (groups.length < 4) groups.push('\u2022\u2022\u2022\u2022');
    return groups.map((g, i) => i < 3 ? g.padEnd(4, '\u2022') : g).join(' ');
  }

  ngOnInit() {
    if (!this.authService.isLoggedIn) { this.router.navigate(['/login']); return; }
    this.loadAll();

    // Listen for realtime updates
    this.sub = this.realtime.messages$.subscribe((msg: RealtimeMessage) => {
      const events = ['WALLET_UPDATED', 'BORROW_RETURNED', 'BORROW_CREATED', 'BORROW_UPDATED'];
      if (events.includes(msg.event)) {
        console.log('[Wallet] Realtime update:', msg.event);
        this.loadAll(false); // Refresh everything silently
      }
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  loadAll(showLoading = true) {
    if (showLoading) this.loading = true;
    this.walletService.getWallet().subscribe(r => { if (r.data) this.wallet = r.data; });
    this.walletService.getTransactions().subscribe(r => { if (r.data) this.transactions = r.data; if (showLoading) this.loading = false; });
    this.bookService.myBorrows().subscribe(r => { if (r.data) this.borrows = r.data; });
  }

  openGateway() {
    if (!this.topUpAmount || this.topUpAmount <= 0) return;
    if (this.topUpAmount > 100000) return;
    this.gwMethod = 'card';
    this.gwError = '';
    this.gwDone = false;
    this.gwProcessing = false;
    this.gwPaid = 0;
    this.gwRef = '';
    this.procStep = 0;
    this.card = { number: '', name: '', expiry: '', cvv: '' };
    this.showGateway = true;
    this.showCardBack = false;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  closeGateway(e: MouseEvent | null) {
    if (this.gwProcessing) return;
    this.showGateway = false;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    if (this.gwDone) { this.loadAll(); }
  }

  confirmPayment() {
    this.gwError = '';
    if (this.gwMethod === 'card') {
      const raw = this.card.number.replace(/\s/g, '');
      const l = this.languageService.lang;
      if (raw.length < 16) { this.gwError = l === 'en' ? 'Card number must be 16 digits' : 'กรุณากรอกหมายเลขบัตร 16 หลัก'; return; }
      if (!this.card.name.trim()) { this.gwError = l === 'en' ? 'Cardholder name is required' : 'กรุณากรอกชื่อบนบัตร'; return; }
      if (this.card.expiry.length < 5) { this.gwError = l === 'en' ? 'Expiry date is required (MM/YY)' : 'กรุณากรอกวันหมดอายุบัตร (MM/YY)'; return; }
      if (this.card.cvv.length < 3) { this.gwError = l === 'en' ? 'CVV is required' : 'กรุณากรอก CVV'; return; }
    }

    this.gwProcessing = true;
    this.procStep = 0;

    // Simulate 3-step gateway processing
    setTimeout(() => { this.procStep = 1; }, 900);
    setTimeout(() => { this.procStep = 2; }, 1800);
    setTimeout(() => {
      // Call real API
      this.walletService.topUp(this.topUpAmount).subscribe({
        next: (r: any) => {
          this.procStep = 3;
          setTimeout(() => {
            this.gwProcessing = false;
            if (r.success && r.data) {
              if (this.wallet) this.wallet.balance = r.data.balance;
              this.gwPaid = this.topUpAmount;
              this.gwRef = 'LPG-' + Date.now().toString(36).toUpperCase();
              this.gwDone = true;
            } else {
              this.gwError = r.message || this.languageService.translate('wallet.error.generic');
            }
          }, 500);
        },
        error: (err: any) => {
          this.gwProcessing = false;
          this.gwError = err?.error?.message || this.languageService.translate('wallet.error.connection');
        }
      });
    }, 2700);
  }

  goBack() {
    this.location.back();
  }

  imgErr(e: any) {
    e.target.src = this.fallback;
  }

  fmtCard(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 16);
    this.card.number = d.replace(/(.{4})/g, '$1 ').trim();
  }

  fmtExpiry(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 4);
    this.card.expiry = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  }

  payFine(borrow: Borrow) {
    this.fineError = '';
    this.fineSuccess = '';
    if (!this.wallet || this.wallet.balance < borrow.fine_amount) {
      this.fineError = this.languageService.translate('wallet.error.insufficient')
        .replace('{{balance}}', this.wallet?.balance.toFixed(2) ?? '0.00')
        .replace('{{amount}}', borrow.fine_amount.toFixed(2));
      return;
    }
    this.payingFineId = borrow.id;
    this.walletService.payFine(borrow.id).subscribe({
      next: (r) => {
        this.payingFineId = null;
        if (r.success && r.data) {
          if (this.wallet) this.wallet.balance = r.data.new_balance;
          borrow.fine_paid = true;
          this.fineSuccess = r.data.message;
          setTimeout(() => this.fineSuccess = '', 3000);
          this.loadTransactions();
        } else {
          this.fineError = r.message || this.languageService.translate('wallet.error.generic');
        }
      },
      error: (err) => {
        this.payingFineId = null;
        this.fineError = err?.error?.message || this.languageService.translate('wallet.error.generic');
      }
    });
  }

  loadTransactions() {
    this.walletService.getTransactions().subscribe(r => { if (r.data) this.transactions = r.data; });
  }

  daysOverdue(due: string): number {
    return Math.max(0, Math.floor((Date.now() - new Date(due).getTime()) / 86400000));
  }

  fmtDate(d: string): string {
    const l = this.languageService.lang;
    return new Date(d).toLocaleString(l === 'th' ? 'th-TH' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getTxDesc(desc: string): string {
    if (!desc) return '';
    const l = this.languageService.lang;

    // Mapping patterns to translation keys
    const patterns = [
      { key: 'wallet.history.topup', match: /Top-up|เติมเงิน/i },
      { key: 'wallet.history.debt_settlement', match: /Automatic Debt Settlement|หักหนี้ค้างชำระอัตโนมัติ|Automated Fine Payment|ชำระค่าปรับค้างจ่าย/i },
      { key: 'wallet.history.fine_payment', match: /Fine Payment|จ่ายค่าปรับ|Fine Deduction|หักค่าปรับ/i },
      { key: 'wallet.history.borrow_fee', match: /Borrow Fee|ค่ายืมหนังสือ/i },
      { key: 'wallet.history.overdue_fine', match: /Overdue Fine|ค่าปรับเกินกำหนด/i }
    ];

    for (const p of patterns) {
      if (p.match.test(desc)) {
        // Extract extra info (like book title or amount)
        let extra = '';
        if (desc.includes(' — ')) {
          extra = desc.split(' — ')[1];
        } else if (desc.includes('฿')) {
          // Maybe it has amount, but we usually want the title
        }

        const translated = this.languageService.translate(p.key);
        return extra ? `${translated} — ${extra}` : translated;
      }
    }

    return desc;
  }
}
