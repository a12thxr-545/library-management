import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookService } from '../../services/book.service';
import { CategoryService } from '../../services/category.service';
import { RealtimeService } from '../../services/realtime.service';
import { Book, Category } from '../../models';
import { Subscription } from 'rxjs';
import { Location } from '@angular/common';
import { LoadingService } from '../../services/loading.service';


@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<!-- ADD / EDIT BOOK MODAL -->
<div class="modal-overlay" *ngIf="showModal" (click)="closeModal($event)">
  <div class="modal-inner">
    <div class="modal-box" (click)="$event.stopPropagation()">
      <div class="modal-head">
        <div class="modal-icon"><i class="material-icons">{{ editingBook ? 'edit' : 'add_circle' }}</i></div>
        <div>
          <div class="modal-title">{{ editingBook ? 'แก้ไขหนังสือ' : 'เพิ่มหนังสือใหม่' }}</div>
          <div class="modal-sub">กรอกข้อมูลหนังสือให้ครบถ้วน</div>
        </div>
        <button class="modal-close" (click)="closeModal(null)" [disabled]="saving">
          <i class="material-icons">close</i>
        </button>
      </div>

      <div class="modal-body">
        <!-- Title -->
        <div class="field">
          <label><i class="material-icons">title</i> ชื่อหนังสือ <span class="req">*</span></label>
          <input [(ngModel)]="form.title" placeholder="เช่น Harry Potter and the Sorcerer's Stone" [class.err]="formErr.title">
          <span class="err-msg" *ngIf="formErr.title">กรุณาใส่ชื่อหนังสือ</span>
        </div>

        <!-- Author -->
        <div class="field">
          <label><i class="material-icons">person</i> ผู้แต่ง <span class="req">*</span></label>
          <input [(ngModel)]="form.author" placeholder="เช่น J.K. Rowling" [class.err]="formErr.author">
          <span class="err-msg" *ngIf="formErr.author">กรุณาใส่ชื่อผู้แต่ง</span>
        </div>

        <!-- Category -->
        <div class="field">
          <label><i class="material-icons">category</i> หมวดหมู่ <span class="req">*</span></label>
          <select [(ngModel)]="form.category_id" [class.err]="formErr.category_id">
            <option value="">-- เลือกหมวดหมู่ --</option>
            <option *ngFor="let c of categories" [value]="c.id">{{ c.name }}</option>
          </select>
          <span class="err-msg" *ngIf="formErr.category_id">กรุณาเลือกหมวดหมู่</span>
        </div>

        <!-- Description -->
        <div class="field">
          <label><i class="material-icons">description</i> คำอธิบาย</label>
          <textarea [(ngModel)]="form.description" placeholder="เขียนคำอธิบายย่อเกี่ยวกับหนังสือ..." rows="3"></textarea>
        </div>

        <!-- Row: Copies + Year -->
        <div class="field-row">
          <div class="field">
            <label><i class="material-icons">inventory_2</i> จำนวนสำเนา <span class="req">*</span></label>
            <input type="number" [(ngModel)]="form.total_copies" min="1" max="999" placeholder="1" [class.err]="formErr.total_copies">
            <span class="err-msg" *ngIf="formErr.total_copies">ต้องมากกว่า 0</span>
          </div>
          <div class="field">
            <label><i class="material-icons">calendar_today</i> ปีพิมพ์</label>
            <input type="number" [(ngModel)]="form.published_year" min="1900" max="2030" placeholder="เช่น 2024">
          </div>
        </div>

        <!-- Row: Publisher + ISBN -->
        <div class="field-row">
          <div class="field">
            <label><i class="material-icons">business</i> สำนักพิมพ์</label>
            <input [(ngModel)]="form.publisher" placeholder="เช่น Bloomsbury">
          </div>
          <div class="field">
            <label><i class="material-icons">qr_code</i> ISBN</label>
            <input [(ngModel)]="form.isbn" placeholder="978-xxxxxxxxxx">
          </div>
        </div>

        <!-- Cover URL -->
        <div class="field">
          <label><i class="material-icons">image</i> URL รูปปก</label>
          <input [(ngModel)]="form.cover_url" placeholder="https://..." (ngModelChange)="previewCover = form.cover_url">
          <div class="cover-preview" *ngIf="previewCover">
            <img [src]="previewCover" (error)="previewCover=''" alt="preview">
          </div>
        </div>

        <div class="api-err" *ngIf="apiErr">
          <i class="material-icons">error_outline</i> {{ apiErr }}
        </div>
      </div>

      <div class="modal-foot">
        <button class="btn-cancel" (click)="closeModal(null)" [disabled]="saving">ยกเลิก</button>
        <button class="btn-save" (click)="saveBook()" [disabled]="saving" [class.loading]="saving">
          <span *ngIf="!saving"><i class="material-icons">{{ editingBook ? 'save' : 'add' }}</i> {{ editingBook ? 'บันทึกการแก้ไข' : 'เพิ่มหนังสือ' }}</span>
          <span *ngIf="saving" class="saving-dots"><span></span><span></span><span></span></span>
        </button>
      </div>
    </div>
  </div>
</div>

<!-- DELETE CONFIRM MODAL -->
<div class="modal-overlay" *ngIf="confirmDelete" (click)="confirmDelete=null">
  <div class="modal-inner">
    <div class="del-box" (click)="$event.stopPropagation()">
      <div class="del-icon"><i class="material-icons">delete_forever</i></div>
      <h3>ลบหนังสือ?</h3>
      <p>คุณกำลังจะลบ <strong>"{{ confirmDelete.title }}"</strong> ออกจากระบบ การกระทำนี้ไม่สามารถย้อนกลับได้</p>
      <div class="del-btns">
        <button class="btn-cancel" (click)="confirmDelete=null">ยกเลิก</button>
        <button class="btn-del" (click)="doDelete()" [disabled]="saving">
          <i class="material-icons">delete</i> ลบเลย
        </button>
      </div>
    </div>
  </div>
</div>

<!-- MAIN PAGE -->
<div class="page">
  <div class="page-head">
    <button class="back-btn" (click)="goBack()">
      <i class="material-icons">arrow_back</i>
    </button>
    <div class="head-text">
      <h1><i class="material-icons">inventory_2</i> คลังหนังสือ</h1>
      <p>จัดการรายการหนังสือในระบบ</p>
    </div>
    <button class="add-btn" (click)="openAdd()">
      <i class="material-icons">add</i>
      <span>เพิ่มหนังสือ</span>
    </button>
  </div>

  <!-- Search + Stats Bar -->
  <div class="toolbar">
    <div class="search-wrap">
      <i class="material-icons">search</i>
      <input type="text" [(ngModel)]="search" (ngModelChange)="filter()" placeholder="ค้นหาชื่อ, ผู้แต่ง, ISBN...">
      <button class="clear-search" *ngIf="search" (click)="search=''; filter()">
        <i class="material-icons">close</i>
      </button>
    </div>
    <div class="stat-chips">
      <span class="chip total"><i class="material-icons">book</i> {{ books.length }} เล่ม</span>
      <span class="chip avail"><i class="material-icons">check_circle</i> {{ availableCount }} ว่าง</span>
      <span class="chip low" *ngIf="lowStockCount > 0"><i class="material-icons">warning</i> {{ lowStockCount }} ใกล้หมด</span>
    </div>
  </div>

  <!-- SUCCESS TOAST -->
  <div class="toast" [class.show]="toastMsg">
    <i class="material-icons">check_circle</i> {{ toastMsg }}
  </div>

  <!-- TABLE -->
  <div class="table-wrap">
    <ng-container *ngIf="!(loadingService.loading$ | async); else skelRows">
      <div class="book-row" *ngFor="let b of filteredBooks; let i = index" [style.animation-delay]="i * 30 + 'ms'">
        <div class="row-cover">
          <img [src]="b.cover_url || fallback" (error)="imgErr($event)" [alt]="b.title">
        </div>
        <div class="row-info">
          <div class="row-title">{{ b.title }}</div>
          <div class="row-meta">
            <span><i class="material-icons">person</i>{{ b.author }}</span>
            <span *ngIf="b.category_name"><i class="material-icons">category</i>{{ b.category_name }}</span>
            <span *ngIf="b.isbn" class="isbn"><i class="material-icons">qr_code</i>{{ b.isbn }}</span>
          </div>
        </div>
        <div class="row-stock">
          <div class="stock-num" [class.danger]="b.available_copies === 0" [class.warn]="b.available_copies > 0 && b.available_copies < 3">
            {{ b.available_copies }}<span>/{{ b.total_copies }}</span>
          </div>
          <div class="stock-bar">
            <div class="stock-fill" [style.width.%]="b.total_copies > 0 ? (b.available_copies / b.total_copies) * 100 : 0"
              [class.empty]="b.available_copies === 0" [class.low]="b.available_copies > 0 && b.available_copies < 3"></div>
          </div>
          <span class="status-pill" [class]="b.status">{{ b.status === 'available' ? 'ว่าง' : b.status === 'borrowed' ? 'ถูกยืม' : 'จอง' }}</span>
        </div>
        <div class="row-stats">
          <span><i class="material-icons">visibility</i>{{ b.view_count }}</span>
          <span><i class="material-icons">history</i>{{ b.borrow_count }}</span>
        </div>
        <div class="row-actions">
          <button class="act-btn edit" (click)="openEdit(b)" title="แก้ไข">
            <i class="material-icons">edit</i>
          </button>
          <button class="act-btn del" (click)="confirmDelete=b" title="ลบ">
            <i class="material-icons">delete</i>
          </button>
        </div>
      </div>

      <div class="empty" *ngIf="filteredBooks.length === 0">
        <i class="material-icons">search_off</i>
        <p>{{ search ? 'ไม่พบหนังสือที่ค้นหา' : 'ยังไม่มีหนังสือในระบบ' }}</p>
        <button class="add-btn-empty" (click)="openAdd()" *ngIf="!search">
          <i class="material-icons">add</i> เพิ่มหนังสือแรก
        </button>
      </div>
    </ng-container>

    <ng-template #skelRows>
      <div class="book-row skel-row" *ngFor="let s of [1,2,3,4,5,6]">
        <div class="skeleton skel-cover"></div>
        <div class="row-info">
          <div class="skeleton" style="height:16px;width:60%;margin-bottom:8px;border-radius:6px"></div>
          <div class="skeleton" style="height:12px;width:40%;border-radius:6px"></div>
        </div>
        <div class="row-stock">
          <div class="skeleton" style="height:20px;width:50px;border-radius:6px;margin-bottom:6px"></div>
          <div class="skeleton" style="height:6px;width:80px;border-radius:3px"></div>
        </div>
        <div class="row-stats">
          <div class="skeleton" style="height:14px;width:36px;border-radius:6px"></div>
        </div>
        <div class="row-actions">
          <div class="skeleton" style="height:32px;width:32px;border-radius:8px"></div>
          <div class="skeleton" style="height:32px;width:32px;border-radius:8px"></div>
        </div>
      </div>
    </ng-template>
  </div>
</div>
  `,
  styles: [`
    /* ── Page ── */
    .page { max-width:1200px; margin:0 auto; padding:80px 24px 60px; font-family:'Inter',sans-serif; }

    /* ── Header ── */
    .page-head { display:flex; align-items:center; gap:16px; margin-bottom:28px; flex-wrap:wrap; }
    .back-btn { background:var(--bg2); border:1px solid var(--border); color:var(--text2); padding:8px; border-radius:10px; display:flex; align-items:center; cursor:pointer; transition:all .2s; }
    .back-btn:hover { background:var(--bg3); color:var(--text); }
    .back-btn i { font-size:1.3rem; }
    .head-text { flex:1; }
    .head-text h1 { font-size:1.5rem; font-weight:800; display:flex; align-items:center; gap:8px; margin-bottom:2px; }
    .head-text h1 i { color:var(--accent); font-size:1.4rem; }
    .head-text p { color:var(--text3); font-size:.875rem; }
    .add-btn { display:flex; align-items:center; gap:6px; padding:10px 20px; background:linear-gradient(135deg,#0969da,#0550ae); color:white; border:none; border-radius:12px; font-size:.9rem; font-weight:700; cursor:pointer; transition:all .2s; box-shadow:0 4px 14px rgba(9,105,218,.35); white-space:nowrap; }
    .add-btn:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(9,105,218,.45); }
    .add-btn i { font-size:1.2rem; }

    /* ── Toolbar ── */
    .toolbar { display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
    .search-wrap { flex:1; min-width:220px; display:flex; align-items:center; gap:8px; background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:0 14px; transition:border .2s; }
    .search-wrap:focus-within { border-color:var(--accent); }
    .search-wrap i { color:var(--text3); font-size:1.1rem; }
    .search-wrap input { flex:1; background:none; border:none; padding:12px 0; color:var(--text); font-size:.9rem; outline:none; font-family:inherit; }
    .clear-search { background:none; border:none; color:var(--text3); cursor:pointer; display:flex; align-items:center; padding:4px; border-radius:50%; }
    .clear-search:hover { background:var(--bg3); color:var(--text); }
    .stat-chips { display:flex; gap:8px; flex-wrap:wrap; }
    .chip { display:flex; align-items:center; gap:4px; padding:6px 12px; border-radius:20px; font-size:.78rem; font-weight:700; }
    .chip i { font-size:.9rem; }
    .chip.total { background:rgba(56,139,253,.1); color:var(--accent); }
    .chip.avail { background:rgba(63,185,80,.1); color:var(--success); }
    .chip.low { background:rgba(248,81,73,.1); color:var(--danger); }

    /* ── Toast ── */
    .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(80px); background:var(--success); color:white; padding:12px 24px; border-radius:30px; font-size:.875rem; font-weight:700; display:flex; align-items:center; gap:8px; z-index:9999; opacity:0; transition:all .3s cubic-bezier(.175,.885,.32,1.275); white-space:nowrap; }
    .toast.show { transform:translateX(-50%) translateY(0); opacity:1; }

    /* ── Table ── */
    .table-wrap { background:var(--bg2); border:1px solid var(--border); border-radius:20px; overflow:hidden; }
    .book-row { display:flex; align-items:center; gap:16px; padding:16px 20px; border-bottom:1px solid var(--border); transition:background .15s; animation:rowIn .3s ease both; }
    .book-row:hover { background:var(--bg3); }
    .book-row:last-child { border-bottom:none; }
    @keyframes rowIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:none} }

    .row-cover img { width:48px; height:68px; border-radius:6px; object-fit:cover; background:var(--bg3); flex-shrink:0; }
    .skel-cover { width:48px; height:68px; border-radius:6px; flex-shrink:0; }

    .row-info { flex:1; min-width:0; }
    .row-title { font-weight:700; font-size:.9rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:6px; }
    .row-meta { display:flex; flex-wrap:wrap; gap:8px; }
    .row-meta span { display:flex; align-items:center; gap:3px; font-size:.75rem; color:var(--text3); }
    .row-meta i { font-size:.85rem; }
    .row-meta .isbn { font-family:monospace; }

    .row-stock { display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; width:100px; }
    .stock-num { font-size:1rem; font-weight:800; color:var(--success); }
    .stock-num span { font-size:.75rem; font-weight:500; color:var(--text3); }
    .stock-num.danger { color:var(--danger); }
    .stock-num.warn { color:var(--warning); }
    .stock-bar { width:80px; height:6px; background:var(--border); border-radius:3px; overflow:hidden; }
    .stock-fill { height:100%; background:var(--success); border-radius:3px; transition:width .4s; }
    .stock-fill.empty { background:var(--danger); }
    .stock-fill.low { background:var(--warning); }
    .status-pill { font-size:.68rem; font-weight:800; padding:3px 8px; border-radius:20px; margin-top:2px; }
    .status-pill.available { background:rgba(63,185,80,.1); color:var(--success); }
    .status-pill.borrowed { background:rgba(56,139,253,.1); color:var(--accent); }
    .status-pill.reserved { background:rgba(163,113,247,.1); color:#a371f7; }

    .row-stats { display:flex; flex-direction:column; gap:4px; flex-shrink:0; width:60px; }
    .row-stats span { display:flex; align-items:center; gap:4px; font-size:.75rem; color:var(--text3); }
    .row-stats i { font-size:.85rem; }

    .row-actions { display:flex; gap:8px; flex-shrink:0; }
    .act-btn { width:34px; height:34px; border:none; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; }
    .act-btn i { font-size:1rem; }
    .act-btn.edit { background:rgba(56,139,253,.1); color:var(--accent); }
    .act-btn.edit:hover { background:rgba(56,139,253,.2); transform:scale(1.1); }
    .act-btn.del { background:rgba(248,81,73,.1); color:var(--danger); }
    .act-btn.del:hover { background:rgba(248,81,73,.2); transform:scale(1.1); }

    .empty { padding:80px 20px; text-align:center; color:var(--text3); }
    .empty i { font-size:3.5rem; opacity:.4; display:block; margin-bottom:12px; }
    .empty p { font-size:.9rem; margin-bottom:16px; }
    .add-btn-empty { display:inline-flex; align-items:center; gap:6px; padding:10px 20px; background:var(--accent); color:white; border:none; border-radius:12px; font-size:.9rem; font-weight:700; cursor:pointer; }

    /* ── Modal ── */
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); backdrop-filter:blur(8px); z-index:9000; overflow-y:auto; -webkit-overflow-scrolling:touch; }
    .modal-inner { min-height:100%; display:flex; align-items:center; justify-content:center; padding:20px 16px; box-sizing:border-box; }
    .modal-box { background:var(--bg2); border:1px solid var(--border); border-radius:24px; width:100%; max-width:560px; overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,.5); animation:modalIn .25s cubic-bezier(.175,.885,.32,1.275); }
    @keyframes modalIn { from{opacity:0;transform:scale(.95) translateY(20px)} to{opacity:1;transform:none} }

    .modal-head { display:flex; align-items:center; gap:14px; padding:20px 24px; border-bottom:1px solid var(--border); }
    .modal-icon { width:44px; height:44px; background:linear-gradient(135deg,#0969da,#0550ae); border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .modal-icon i { color:white; font-size:1.3rem; }
    .modal-title { font-size:1rem; font-weight:800; }
    .modal-sub { font-size:.75rem; color:var(--text3); margin-top:2px; }
    .modal-close { margin-left:auto; background:none; border:none; color:var(--text3); cursor:pointer; padding:6px; border-radius:8px; display:flex; transition:all .2s; }
    .modal-close:hover { background:var(--bg3); color:var(--text); }

    .modal-body { padding:20px 24px; max-height:65vh; overflow-y:auto; display:flex; flex-direction:column; gap:14px; }
    .field { display:flex; flex-direction:column; gap:6px; }
    .field label { font-size:.8rem; font-weight:700; color:var(--text2); display:flex; align-items:center; gap:5px; }
    .field label i { font-size:.95rem; color:var(--accent); }
    .req { color:var(--danger); }
    .field input, .field select, .field textarea { background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:10px 14px; color:var(--text); font-size:.875rem; font-family:inherit; outline:none; transition:border .2s; resize:vertical; }
    .field input:focus, .field select:focus, .field textarea:focus { border-color:var(--accent); }
    .field input.err, .field select.err { border-color:var(--danger); }
    .err-msg { font-size:.72rem; color:var(--danger); }
    .field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .cover-preview { margin-top:8px; }
    .cover-preview img { height:80px; border-radius:8px; object-fit:cover; }
    .api-err { background:rgba(248,81,73,.1); border:1px solid rgba(248,81,73,.25); color:var(--danger); padding:10px 14px; border-radius:10px; font-size:.8rem; display:flex; align-items:center; gap:8px; }

    .modal-foot { display:flex; justify-content:flex-end; gap:10px; padding:16px 24px; border-top:1px solid var(--border); }
    .btn-cancel { background:var(--bg3); border:1px solid var(--border); color:var(--text2); padding:10px 20px; border-radius:10px; font-size:.875rem; font-weight:600; cursor:pointer; transition:all .2s; font-family:inherit; }
    .btn-cancel:hover { background:var(--border); }
    .btn-save { background:linear-gradient(135deg,#0969da,#0550ae); color:white; border:none; padding:10px 24px; border-radius:10px; font-size:.875rem; font-weight:700; cursor:pointer; transition:all .2s; display:flex; align-items:center; gap:6px; min-width:140px; justify-content:center; font-family:inherit; }
    .btn-save:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 16px rgba(9,105,218,.4); }
    .btn-save:disabled { opacity:.6; cursor:not-allowed; }
    .btn-save i { font-size:1.1rem; }
    .saving-dots { display:flex; gap:5px; align-items:center; }
    .saving-dots span { width:7px; height:7px; background:white; border-radius:50%; animation:dotPulse 1.2s infinite; }
    .saving-dots span:nth-child(2) { animation-delay:.2s; }
    .saving-dots span:nth-child(3) { animation-delay:.4s; }
    @keyframes dotPulse { 0%,80%,100%{opacity:.3;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }

    /* Delete Modal */
    .del-box { background:var(--bg2); border:1px solid var(--border); border-radius:24px; width:100%; max-width:380px; padding:32px 28px; text-align:center; animation:modalIn .25s cubic-bezier(.175,.885,.32,1.275); }
    .del-icon { width:56px; height:56px; background:rgba(248,81,73,.12); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
    .del-icon i { color:var(--danger); font-size:1.8rem; }
    .del-box h3 { font-size:1.1rem; font-weight:800; margin-bottom:8px; }
    .del-box p { font-size:.875rem; color:var(--text2); line-height:1.5; margin-bottom:24px; }
    .del-box p strong { color:var(--text); }
    .del-btns { display:flex; gap:10px; justify-content:center; }
    .btn-del { background:var(--danger); color:white; border:none; padding:10px 24px; border-radius:10px; font-size:.875rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:inherit; transition:all .2s; }
    .btn-del:hover:not(:disabled) { background:#e03e37; transform:translateY(-1px); }
    .btn-del:disabled { opacity:.6; cursor:not-allowed; }

    /* ── Responsive ── */
    @media (max-width:768px) {
      .page { padding:72px 14px 60px; }
      .book-row { gap:10px; padding:14px 14px; }
      .row-stats { display:none; }
      .row-stock { width:80px; }
    }
    @media (max-width:540px) {
      .book-row { gap:8px; padding:12px 12px; }
      .row-cover img, .skel-cover { width:40px; height:58px; }
      .add-btn span { display:none; }
      .add-btn { padding:10px 12px; }
      .toolbar { gap:8px; }
      .field-row { grid-template-columns:1fr; }
      .modal-body { max-height:60vh; }
      .stat-chips { display:none; }
    }
  `]
})
export class AdminInventoryComponent implements OnInit, OnDestroy {
  books: Book[] = [];
  filteredBooks: Book[] = [];
  categories: Category[] = [];
  search = '';
  showModal = false;
  editingBook: Book | null = null;
  confirmDelete: Book | null = null;
  saving = false;
  toastMsg = '';
  apiErr = '';
  previewCover = '';
  private sub: Subscription | null = null;

  form = this.emptyForm();
  formErr: any = {};

  fallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="68"><rect width="48" height="68" fill="%2330363d"/><text x="50%" y="50%" fill="%236e7681" font-size="10" text-anchor="middle" dy=".3em">No img</text></svg>';

  constructor(
    private bookService: BookService,
    private categoryService: CategoryService,
    private realtime: RealtimeService,
    public loadingService: LoadingService,
    private location: Location
  ) { }

  goBack() { this.location.back(); }

  ngOnInit() {
    this.fetchData();
    this.categoryService.getCategories().subscribe(r => {
      this.categories = r.data || [];
    });

    this.sub = this.realtime.messages$.subscribe(msg => {
      const events = ['BOOK_STOCK_UPDATED', 'BORROW_CREATED', 'BORROW_RETURNED'];
      if (events.includes(msg.event)) this.fetchData();
    });
  }

  ngOnDestroy() { if (this.sub) this.sub.unsubscribe(); }

  fetchData() {
    this.bookService.getBooks({ limit: 200 }).subscribe(r => {
      this.books = r.data?.books || [];
      this.filter();
    });
  }

  filter() {
    const q = this.search.toLowerCase();
    this.filteredBooks = this.books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.isbn && b.isbn.includes(q)) ||
      (b.category_name && b.category_name.toLowerCase().includes(q))
    );
  }

  get availableCount() { return this.books.filter(b => b.available_copies > 0).length; }
  get lowStockCount() { return this.books.filter(b => b.available_copies > 0 && b.available_copies < 3).length; }

  openAdd() {
    this.editingBook = null;
    this.form = this.emptyForm();
    this.formErr = {};
    this.apiErr = '';
    this.previewCover = '';
    this.showModal = true;
  }

  openEdit(b: Book) {
    this.editingBook = b;
    this.form = {
      title: b.title,
      author: b.author,
      category_id: b.category_id || '',
      description: b.description || '',
      total_copies: b.total_copies,
      published_year: b.published_year || null,
      publisher: b.publisher || '',
      isbn: b.isbn || '',
      cover_url: b.cover_url || '',
    };
    this.formErr = {};
    this.apiErr = '';
    this.previewCover = b.cover_url || '';
    this.showModal = true;
  }

  closeModal(e: any) {
    if (e && e.target !== e.currentTarget) return;
    if (!this.saving) { this.showModal = false; this.editingBook = null; }
  }

  validate(): boolean {
    this.formErr = {};
    if (!this.form.title?.trim()) this.formErr.title = true;
    if (!this.form.author?.trim()) this.formErr.author = true;
    if (!this.form.category_id) this.formErr.category_id = true;
    if (!this.form.total_copies || this.form.total_copies < 1) this.formErr.total_copies = true;
    return Object.keys(this.formErr).length === 0;
  }

  saveBook() {
    if (!this.validate()) return;
    this.saving = true;
    this.apiErr = '';

    const data = {
      title: this.form.title.trim(),
      author: this.form.author.trim(),
      category_id: this.form.category_id || null,
      description: this.form.description?.trim() || null,
      total_copies: Number(this.form.total_copies),
      published_year: this.form.published_year ? Number(this.form.published_year) : null,
      publisher: this.form.publisher?.trim() || null,
      isbn: this.form.isbn?.trim() || null,
      cover_url: this.form.cover_url?.trim() || null,
    };

    const obs = this.editingBook
      ? this.bookService.updateBook(this.editingBook.id, data)
      : this.bookService.createBook(data);

    obs.subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.editingBook = null;
        this.fetchData();
        this.showToast(this.editingBook ? 'อัพเดทหนังสือสำเร็จ' : 'เพิ่มหนังสือสำเร็จ ✓');
      },
      error: (err) => {
        this.saving = false;
        this.apiErr = err?.error?.message || err?.error?.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
      }
    });
  }

  doDelete() {
    if (!this.confirmDelete) return;
    this.saving = true;
    this.bookService.deleteBook(this.confirmDelete.id).subscribe({
      next: () => {
        this.saving = false;
        const title = this.confirmDelete?.title;
        this.confirmDelete = null;
        this.fetchData();
        this.showToast(`ลบหนังสือ "${title}" สำเร็จ`);
      },
      error: () => {
        this.saving = false;
        this.confirmDelete = null;
      }
    });
  }

  showToast(msg: string) {
    this.toastMsg = msg;
    setTimeout(() => this.toastMsg = '', 3000);
  }

  imgErr(e: any) { e.target.src = this.fallback; }

  private emptyForm() {
    return { title: '', author: '', category_id: '', description: '', total_copies: 1, published_year: null as number | null, publisher: '', isbn: '', cover_url: '' };
  }
}
