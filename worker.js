// ============================================================
//  备忘录 Memo App — Cloudflare Worker
//  Backend: D1 (SQLite)  |  Frontend: Embedded SPA
// ============================================================

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>备忘录</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #F4F5F7;
      --surface:  #FFFFFF;
      --border:   #E4E6EA;
      --text-1:   #1A1D23;
      --text-2:   #5E6470;
      --text-3:   #9EA5B0;
      --accent:   #4F46E5;
      --accent-lt:#EEF2FF;
      --danger:   #EF4444;
      --shadow:   0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04);
      --shadow-md:0 4px 12px rgba(0,0,0,.10);
      --radius:   10px;
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
              'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      --mono: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Courier New', monospace;
    }

    html, body { height: 100%; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text-1);
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* ── Top Bar ── */
    .topbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 24px;
      height: 56px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      box-shadow: var(--shadow);
      flex-shrink: 0;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .topbar-logo {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: var(--accent);
      user-select: none;
    }
    .topbar-logo span { color: var(--text-1); }
    .topbar-count {
      font-size: 12px;
      color: var(--text-3);
      padding: 2px 8px;
      background: var(--bg);
      border-radius: 20px;
      border: 1px solid var(--border);
    }
    .topbar-search {
      flex: 1;
      max-width: 360px;
      margin-left: auto;
      position: relative;
    }
    .topbar-search input {
      width: 100%;
      padding: 7px 12px 7px 34px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 13px;
      font-family: var(--font);
      background: var(--bg);
      color: var(--text-1);
      outline: none;
      transition: border-color .15s, box-shadow .15s;
    }
    .topbar-search input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(79,70,229,.12);
      background: var(--surface);
    }
    .topbar-search .icon-search {
      position: absolute; left: 10px; top: 50%;
      transform: translateY(-50%);
      color: var(--text-3); font-size: 14px; pointer-events: none;
    }

    /* ── Layout ── */
    .layout {
      display: grid;
      grid-template-columns: 300px 1fr;
      flex: 1;
      min-height: 0;
    }

    /* ── Sidebar ── */
    .sidebar {
      border-right: 1px solid var(--border);
      background: var(--surface);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .sidebar-header {
      padding: 16px 16px 12px;
      flex-shrink: 0;
    }
    .btn-new {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 9px 16px;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: var(--radius);
      font-size: 14px;
      font-weight: 600;
      font-family: var(--font);
      cursor: pointer;
      transition: background .15s, transform .1s, box-shadow .15s;
      box-shadow: 0 2px 6px rgba(79,70,229,.35);
    }
    .btn-new:hover { background: #4338CA; box-shadow: 0 4px 10px rgba(79,70,229,.4); }
    .btn-new:active { transform: scale(.97); }
    .btn-new svg { flex-shrink: 0; }

    .memo-list {
      overflow-y: auto;
      flex: 1;
      padding: 4px 8px 16px;
    }
    .memo-list::-webkit-scrollbar { width: 4px; }
    .memo-list::-webkit-scrollbar-track { background: transparent; }
    .memo-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    .memo-item {
      position: relative;
      padding: 12px 14px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 4px;
      border: 1px solid transparent;
      transition: background .12s, border-color .12s;
      overflow: hidden;
    }
    .memo-item::before {
      content: '';
      position: absolute;
      left: 0; top: 8px; bottom: 8px;
      width: 3px;
      background: var(--accent);
      border-radius: 0 3px 3px 0;
      transform: scaleX(0);
      transform-origin: left;
      transition: transform .18s cubic-bezier(.34,1.56,.64,1);
    }
    .memo-item:hover { background: var(--bg); }
    .memo-item.active {
      background: var(--accent-lt);
      border-color: rgba(79,70,229,.2);
    }
    .memo-item.active::before { transform: scaleX(1); }

    .memo-item-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
    }
    .memo-item-preview {
      font-size: 12px;
      color: var(--text-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.4;
      margin-bottom: 5px;
    }
    .memo-item-meta {
      font-size: 11px;
      color: var(--text-3);
    }
    .memo-item-title.untitled { color: var(--text-3); font-style: italic; }

    .empty-list {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 200px;
      color: var(--text-3);
      font-size: 13px;
      text-align: center;
      gap: 8px;
    }
    .empty-list svg { opacity: .4; }

    /* ── Editor ── */
    .editor {
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: var(--bg);
    }
    .editor-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--text-3);
      gap: 12px;
      font-size: 14px;
    }
    .editor-placeholder svg { opacity: .3; }
    .editor-pane {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 24px 32px;
      max-width: 820px;
      width: 100%;
      margin: 0 auto;
    }

    .editor-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      gap: 12px;
    }
    .editor-meta {
      font-size: 12px;
      color: var(--text-3);
    }
    .toolbar-actions { display: flex; gap: 6px; }
    .btn-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px;
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: 7px;
      cursor: pointer;
      color: var(--text-2);
      font-size: 14px;
      transition: all .12s;
    }
    .btn-icon:hover { background: var(--bg); color: var(--text-1); }
    .btn-icon.danger:hover { border-color: var(--danger); color: var(--danger); background: #FEF2F2; }
    .btn-save {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 14px;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 600;
      font-family: var(--font);
      cursor: pointer;
      transition: all .12s;
    }
    .btn-save:hover { background: #4338CA; }
    .btn-save:disabled { opacity: .5; cursor: not-allowed; }
    .btn-save.saved {
      background: #10B981;
    }

    .editor-title-input {
      width: 100%;
      border: none;
      outline: none;
      font-size: 26px;
      font-weight: 700;
      font-family: var(--font);
      color: var(--text-1);
      background: transparent;
      padding: 0;
      margin-bottom: 16px;
      line-height: 1.3;
    }
    .editor-title-input::placeholder { color: var(--text-3); }

    .editor-divider {
      height: 1px;
      background: var(--border);
      margin-bottom: 16px;
    }

    .editor-content {
      flex: 1;
      width: 100%;
      border: none;
      outline: none;
      font-size: 15px;
      font-family: var(--font);
      line-height: 1.75;
      color: var(--text-1);
      background: transparent;
      resize: none;
      padding: 0;
      min-height: 300px;
    }
    .editor-content::placeholder { color: var(--text-3); }

    /* ── Status Toast ── */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 10px 18px;
      background: var(--text-1);
      color: #fff;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: var(--shadow-md);
      opacity: 0;
      transform: translateY(8px);
      transition: all .2s;
      pointer-events: none;
      z-index: 999;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .toast.error { background: var(--danger); }

    /* ── New item animation ── */
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .memo-item.new { animation: slideIn .25s cubic-bezier(.34,1.56,.64,1); }

    /* ── Skeleton ── */
    .skeleton {
      background: linear-gradient(90deg, var(--bg) 25%, var(--border) 50%, var(--bg) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.2s infinite;
      border-radius: 6px;
    }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    /* ── Mobile ── */
    @media (max-width: 700px) {
      .layout { grid-template-columns: 1fr; }
      .editor { display: none; }
      .editor.mobile-visible { display: flex; }
      .sidebar { display: flex; }
      .sidebar.mobile-hidden { display: none; }
      .topbar-search { max-width: 200px; }
      .editor-pane { padding: 16px; }
    }

    /* ── Confirm overlay ── */
    .overlay {
      display: none;
      position: fixed; inset: 0;
      background: rgba(0,0,0,.35);
      z-index: 200;
      align-items: center;
      justify-content: center;
    }
    .overlay.show { display: flex; }
    .dialog {
      background: var(--surface);
      border-radius: 14px;
      padding: 28px;
      max-width: 340px;
      width: 90%;
      box-shadow: var(--shadow-md);
    }
    .dialog h3 { font-size: 16px; margin-bottom: 8px; }
    .dialog p  { font-size: 14px; color: var(--text-2); margin-bottom: 20px; }
    .dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .btn-cancel {
      padding: 8px 16px; border: 1px solid var(--border);
      background: var(--surface); border-radius: 8px;
      font-size: 14px; font-family: var(--font);
      cursor: pointer; color: var(--text-1);
      transition: background .12s;
    }
    .btn-cancel:hover { background: var(--bg); }
    .btn-delete {
      padding: 8px 16px; border: none;
      background: var(--danger); color: #fff;
      border-radius: 8px; font-size: 14px;
      font-family: var(--font); cursor: pointer;
      transition: background .12s;
    }
    .btn-delete:hover { background: #DC2626; }

    mark { background: rgba(79,70,229,.18); border-radius: 2px; padding: 0 1px; }
  </style>
</head>
<body>

<!-- Top Bar -->
<div class="topbar">
  <div class="topbar-logo">📝 <span>备忘录</span></div>
  <div class="topbar-count" id="memoCount">0 条</div>
  <div class="topbar-search">
    <span class="icon-search">🔍</span>
    <input type="text" id="searchInput" placeholder="搜索备忘录…" oninput="handleSearch(this.value)" />
  </div>
</div>

<!-- Main Layout -->
<div class="layout">
  <!-- Sidebar -->
  <div class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <button class="btn-new" onclick="createNew()">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" stroke-linecap="round"/>
        </svg>
        新建备忘录
      </button>
    </div>
    <div class="memo-list" id="memoList">
      <!-- items injected -->
    </div>
  </div>

  <!-- Editor -->
  <div class="editor" id="editorArea">
    <div class="editor-placeholder" id="editorPlaceholder">
      <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>选择或新建一条备忘录</span>
    </div>

    <div class="editor-pane" id="editorPane" style="display:none">
      <div class="editor-toolbar">
        <div class="editor-meta" id="editorMeta">—</div>
        <div class="toolbar-actions">
          <button class="btn-save" id="btnSave" onclick="saveMemo()" disabled>保存</button>
          <button class="btn-icon danger" title="删除" onclick="confirmDelete()">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      <input class="editor-title-input" id="titleInput" type="text" placeholder="标题（可选）" oninput="markDirty()" />
      <div class="editor-divider"></div>
      <textarea class="editor-content" id="contentInput" placeholder="开始记录…" oninput="markDirty()"></textarea>
    </div>
  </div>
</div>

<!-- Delete confirm dialog -->
<div class="overlay" id="deleteOverlay">
  <div class="dialog">
    <h3>删除备忘录</h3>
    <p>此操作不可撤销，确定要删除这条备忘录吗？</p>
    <div class="dialog-actions">
      <button class="btn-cancel" onclick="closeDialog()">取消</button>
      <button class="btn-delete" onclick="deleteMemo()">删除</button>
    </div>
  </div>
</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<script>
// ── State ──────────────────────────────────────────────────
let memos = [];
let filtered = [];
let currentId = null;
let dirty = false;
let saveTimer = null;
let searchQuery = '';

// ── API ────────────────────────────────────────────────────
async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Init ───────────────────────────────────────────────────
async function init() {
  try {
    memos = await api('GET', '/api/memos');
    filtered = [...memos];
    renderList();
    updateCount();
  } catch (e) {
    showToast('加载失败：' + e.message, true);
  }
}

// ── Render ─────────────────────────────────────────────────
function renderList() {
  const list = document.getElementById('memoList');
  if (!filtered.length) {
    list.innerHTML = \`<div class="empty-list">
      <svg width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke-linecap="round"/>
      </svg>
      <span>\${searchQuery ? '没有匹配的备忘录' : '还没有备忘录<br>点击"新建"开始记录'}</span>
    </div>\`;
    return;
  }
  list.innerHTML = filtered.map(m => {
    const titleText = m.title || '（无标题）';
    const preview = m.content.replace(/\\n/g, ' ').slice(0, 60);
    const date = formatDate(m.updated_at);
    const isActive = m.id === currentId;
    const highlight = t => searchQuery
      ? t.replace(new RegExp('(' + escapeReg(searchQuery) + ')', 'gi'), '<mark>\$1</mark>')
      : t;
    return \`<div class="memo-item\${isActive ? ' active' : ''}" id="item-\${m.id}" onclick="openMemo(\${m.id})">
      <div class="memo-item-title\${m.title ? '' : ' untitled'}">\${highlight(escapeHtml(titleText))}</div>
      <div class="memo-item-preview">\${highlight(escapeHtml(preview))}</div>
      <div class="memo-item-meta">\${date}</div>
    </div>\`;
  }).join('');
}

function updateCount() {
  document.getElementById('memoCount').textContent = memos.length + ' 条';
}

// ── Create ─────────────────────────────────────────────────
async function createNew() {
  if (dirty && currentId !== null) {
    await saveMemo(true);
  }
  try {
    const m = await api('POST', '/api/memos', { title: '', content: '' });
    memos.unshift(m);
    applySearch();
    updateCount();
    openMemo(m.id, true);
    showToast('已新建备忘录');
    // animate
    const el = document.getElementById('item-' + m.id);
    if (el) el.classList.add('new');
  } catch (e) {
    showToast('新建失败：' + e.message, true);
  }
}

// ── Open ───────────────────────────────────────────────────
function openMemo(id, skipFocus) {
  const m = memos.find(x => x.id === id);
  if (!m) return;
  currentId = id;
  dirty = false;

  document.getElementById('editorPlaceholder').style.display = 'none';
  document.getElementById('editorPane').style.display = 'flex';
  document.getElementById('editorPane').style.flexDirection = 'column';

  document.getElementById('titleInput').value = m.title || '';
  document.getElementById('contentInput').value = m.content || '';
  document.getElementById('editorMeta').textContent = '最后更新 ' + formatDate(m.updated_at);
  setBtnSave(false);
  renderList(); // refresh active state

  if (!skipFocus) {
    setTimeout(() => document.getElementById('contentInput').focus(), 50);
  }

  // Mobile: show editor
  document.getElementById('sidebar').classList.remove('mobile-hidden');
  if (window.innerWidth <= 700) {
    document.getElementById('sidebar').classList.add('mobile-hidden');
    document.getElementById('editorArea').classList.add('mobile-visible');
  }
}

// ── Save ───────────────────────────────────────────────────
function markDirty() {
  dirty = true;
  setBtnSave(true);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveMemo(true), 2500); // auto-save
}

async function saveMemo(silent) {
  if (currentId === null) return;
  const title   = document.getElementById('titleInput').value.trim();
  const content = document.getElementById('contentInput').value;
  try {
    const updated = await api('PUT', '/api/memos/' + currentId, { title, content });
    const idx = memos.findIndex(x => x.id === currentId);
    if (idx !== -1) {
      memos[idx] = updated;
      memos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    }
    applySearch();
    dirty = false;
    setBtnSave(false, true);
    document.getElementById('editorMeta').textContent = '最后更新 ' + formatDate(updated.updated_at);
    if (!silent) showToast('已保存');
  } catch (e) {
    showToast('保存失败：' + e.message, true);
  }
}

function setBtnSave(enabled, saved) {
  const btn = document.getElementById('btnSave');
  btn.disabled = !enabled;
  btn.classList.toggle('saved', !!saved);
  btn.textContent = saved ? '✓ 已保存' : '保存';
  if (saved) setTimeout(() => { btn.classList.remove('saved'); btn.textContent = '保存'; }, 1800);
}

// ── Delete ─────────────────────────────────────────────────
function confirmDelete() {
  if (currentId === null) return;
  document.getElementById('deleteOverlay').classList.add('show');
}
function closeDialog() {
  document.getElementById('deleteOverlay').classList.remove('show');
}
async function deleteMemo() {
  closeDialog();
  if (currentId === null) return;
  try {
    await api('DELETE', '/api/memos/' + currentId);
    memos = memos.filter(x => x.id !== currentId);
    currentId = null;
    dirty = false;
    applySearch();
    updateCount();
    document.getElementById('editorPane').style.display = 'none';
    document.getElementById('editorPlaceholder').style.display = 'flex';
    showToast('已删除');
    // Mobile
    if (window.innerWidth <= 700) {
      document.getElementById('sidebar').classList.remove('mobile-hidden');
      document.getElementById('editorArea').classList.remove('mobile-visible');
    }
  } catch (e) {
    showToast('删除失败：' + e.message, true);
  }
}

// ── Search ─────────────────────────────────────────────────
function handleSearch(q) {
  searchQuery = q.trim().toLowerCase();
  applySearch();
}
function applySearch() {
  if (!searchQuery) {
    filtered = [...memos];
  } else {
    filtered = memos.filter(m =>
      (m.title || '').toLowerCase().includes(searchQuery) ||
      (m.content || '').toLowerCase().includes(searchQuery)
    );
  }
  renderList();
}

// ── Keyboard shortcuts ─────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    if (dirty) saveMemo();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault();
    createNew();
  }
  if (e.key === 'Escape') closeDialog();
});

// ── Utils ──────────────────────────────────────────────────
function formatDate(dt) {
  if (!dt) return '';
  const d = new Date(dt.endsWith('Z') ? dt : dt + 'Z');
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)    return '刚刚';
  if (diff < 3600)  return Math.floor(diff / 60) + ' 分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
  if (diff < 604800) return Math.floor(diff / 86400) + ' 天前';
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escapeReg(s) { return s.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'); }

function showToast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '') + ' show';
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ── Boot ───────────────────────────────────────────────────
init();
</script>
</body>
</html>`;

// ── CORS helper ──────────────────────────────────────────────
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return Response.json(data, { status, headers: cors });
}

function err(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// ============================================================
//  WIDGET_HTML — 桌面壁纸小组件页面
//  专为 Lively Wallpaper 设计：透明背景、自动每 5 秒刷新、
//  深色玻璃卡片、平滑淡入。直接读取 /api/widget.json。
// ============================================================
const WIDGET_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>备忘录 Widget</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  /* 这些变量全部可由网址参数覆盖，改外观无需重新部署 Worker */
  :root {
    --page-bg: transparent;            /* 整页背景：默认透明，透出桌面壁纸 */
    --card-bg: rgba(24, 26, 32, 0.82); /* 卡片背景 */
    --blur: 18px;                      /* 卡片毛玻璃模糊半径 */
    --pos-top: 32px;
    --pos-right: 32px;
    --pos-bottom: auto;
    --pos-left: auto;
    --card-w: 300px;
  }
  html, body {
    width: 100%; height: 100%;
    background: var(--page-bg);
    overflow: hidden;
    font-family: "Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    user-select: none;
    cursor: default;
  }
  .card {
    position: fixed;
    top: var(--pos-top); right: var(--pos-right);
    bottom: var(--pos-bottom); left: var(--pos-left);
    width: var(--card-w); max-height: 80vh;
    display: flex; flex-direction: column;
    background: var(--card-bg);
    backdrop-filter: blur(var(--blur)) saturate(140%);
    -webkit-backdrop-filter: blur(var(--blur)) saturate(140%);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
    padding: 18px 20px 16px;
    overflow: hidden;
  }
  .header {
    display: flex; align-items: center; gap: 9px;
    padding-bottom: 12px; margin-bottom: 4px;
    border-bottom: 1px solid rgba(255,255,255,0.10);
  }
  .header .icon { font-size: 17px; line-height: 1; }
  .header .title {
    font-size: 15px; font-weight: 700; color: #fff;
    flex: 1; letter-spacing: 0.5px;
  }
  .header .dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #34d399; box-shadow: 0 0 8px #34d399;
    transition: background 0.3s, box-shadow 0.3s;
  }
  .header .dot.stale { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
  .header .dot.error { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
  .list {
    list-style: none; overflow-y: auto; padding-top: 12px;
    scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.2) transparent;
  }
  .list::-webkit-scrollbar { width: 5px; }
  .list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 3px; }
  .item {
    display: flex; align-items: flex-start; gap: 9px;
    padding: 7px 0; font-size: 13px; line-height: 1.5;
    color: #c8cdd7;
    animation: fadeIn 0.35s ease both;
  }
  .item .bullet { color: #818cf8; flex-shrink: 0; margin-top: 1px; }
  .item .text {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .empty {
    padding: 18px 4px; font-size: 13px; color: #82879440;
    color: #828794; text-align: center;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
</style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="icon">📝</span>
      <span class="title">备忘录</span>
      <span class="dot" id="status"></span>
    </div>
    <ul class="list" id="list"></ul>
  </div>
<script>
  // ── 从网址参数读取外观设置（改外观只需改 URL，无需重新部署）──
  // 支持的参数：
  //   bg     整页背景色。给个颜色=纯色背景；black=纯黑；省略/transparent=透明
  //   card   卡片背景色（默认深灰半透明）
  //   blur   毛玻璃模糊半径（px），纯色背景时通常设 0
  //   pos    卡片位置：tr 右上(默认) / tl 左上 / br 右下 / bl 左下 / center 居中
  //   margin 卡片距边缘的距离（px，默认 32）
  //   width  卡片宽度（px，默认 300）
  //   rate   刷新间隔（秒，默认 5）
  const P = new URLSearchParams(location.search);
  const root = document.documentElement.style;

  // 颜色参数：允许 "black"/"white"/"#rrggbb"/"rrggbb"/"r,g,b,a" 等写法
  function color(v) {
    if (!v) return null;
    v = v.trim();
    if (/^[0-9a-fA-F]{6}$/.test(v) || /^[0-9a-fA-F]{3}$/.test(v)) return '#' + v;
    if (/^\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+/.test(v)) {                 // r,g,b 或 r,g,b,a
      const n = v.split(',').map(s => s.trim());
      return n.length >= 4 ? 'rgba(' + n.join(',') + ')' : 'rgb(' + n.join(',') + ')';
    }
    return v;                                                        // 关键字如 black / transparent
  }

  const bg = color(P.get('bg'));
  if (bg) root.setProperty('--page-bg', bg);
  const card = color(P.get('card'));
  if (card) root.setProperty('--card-bg', card);
  if (P.has('blur')) root.setProperty('--blur', (parseFloat(P.get('blur')) || 0) + 'px');
  if (P.has('width')) root.setProperty('--card-w', (parseInt(P.get('width')) || 300) + 'px');

  // 位置：先全部重置为 auto，再按 pos 设两边
  const m = (P.has('margin') ? parseInt(P.get('margin')) : 32) + 'px';
  const pos = (P.get('pos') || 'tr').toLowerCase();
  const POS = {
    tr: { top: m, right: m },
    tl: { top: m, left: m },
    br: { bottom: m, right: m },
    bl: { bottom: m, left: m },
  };
  ['top','right','bottom','left'].forEach(k => root.setProperty('--pos-' + k, 'auto'));
  if (pos === 'center') {
    root.setProperty('--pos-top', '50%');
    root.setProperty('--pos-left', '50%');
    document.querySelector('.card').style.transform = 'translate(-50%, -50%)';
  } else {
    const set = POS[pos] || POS.tr;
    for (const k in set) root.setProperty('--pos-' + k, set[k]);
  }

  // 同源部署：/widget 与 /api/widget.json 在同一个 Worker 上，直接相对路径即可
  const API = '/api/widget.json';
  const REFRESH_MS = (P.has('rate') ? Math.max(1, parseFloat(P.get('rate'))) : 5) * 1000;
  const listEl = document.getElementById('list');
  const statusEl = document.getElementById('status');
  let lastSignature = null;

  function render(memos) {
    // 内容没变就不重绘，避免动画反复闪
    const sig = memos.map(m => m.title + '|' + m.updated_at).join('§');
    if (sig === lastSignature) return;
    lastSignature = sig;

    if (!memos.length) {
      listEl.innerHTML = '<li class="empty">暂无备忘录，去网页端新建一条吧</li>';
      return;
    }
    listEl.innerHTML = memos.map(m => {
      const t = (m.title && m.title.trim()) ? m.title.trim() : '(无标题)';
      const safe = t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return '<li class="item"><span class="bullet">•</span><span class="text">' + safe + '</span></li>';
    }).join('');
  }

  async function tick() {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      render(data.memos || []);
      statusEl.className = 'dot';            // 绿：正常
    } catch (e) {
      statusEl.className = 'dot error';      // 红：抓取失败
    }
  }

  tick();
  setInterval(tick, REFRESH_MS);
</script>
</body>
</html>`;

// ── Router ───────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;          // e.g. /api/memos/42
    const method = request.method;

    // Pre-flight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // ── /api/widget — lightweight title list for desktop/Android widgets ──
    if (path === '/api/widget' && method === 'GET') {
      const { results } = await env.DB
        .prepare('SELECT title FROM memos ORDER BY updated_at DESC LIMIT 100')
        .all();
      const lines = results
        .map(r => '• ' + ((r.title && r.title.trim()) ? r.title.trim() : '(无标题)'))
        .join('\n');
      return new Response(lines, {
        headers: { ...cors, 'Content-Type': 'text/plain; charset=UTF-8' },
      });
    }

    // ── /api/widget.json — 结构化数据，供桌面壁纸网页(/widget)渲染 ──
    if (path === '/api/widget.json' && method === 'GET') {
      const { results } = await env.DB
        .prepare('SELECT title, updated_at FROM memos ORDER BY updated_at DESC LIMIT 100')
        .all();
      return new Response(JSON.stringify({ memos: results }), {
        headers: { ...cors, 'Content-Type': 'application/json; charset=UTF-8' },
      });
    }

    // ── /widget — 桌面壁纸用的自动刷新页面(配合 Lively Wallpaper)──
    if (path === '/widget' && method === 'GET') {
      return new Response(WIDGET_HTML, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      });
    }

    // ── /api/memos ───────────────────────────────────────────
    if (path === '/api/memos') {
      if (method === 'GET') {
        const { results } = await env.DB
          .prepare('SELECT * FROM memos ORDER BY updated_at DESC')
          .all();
        return json(results);
      }

      if (method === 'POST') {
        let body;
        try { body = await request.json(); }
        catch { return err('Invalid JSON'); }
        const { title = '', content = '' } = body;
        const { results } = await env.DB
          .prepare('INSERT INTO memos (title, content) VALUES (?, ?) RETURNING *')
          .bind(title, content)
          .all();
        return json(results[0], 201);
      }
    }

    // ── /api/memos/:id ───────────────────────────────────────
    const match = path.match(/^\/api\/memos\/(\d+)$/);
    if (match) {
      const id = Number(match[1]);

      if (method === 'GET') {
        const row = await env.DB
          .prepare('SELECT * FROM memos WHERE id = ?')
          .bind(id)
          .first();
        if (!row) return err('Not found', 404);
        return json(row);
      }

      if (method === 'PUT') {
        let body;
        try { body = await request.json(); }
        catch { return err('Invalid JSON'); }
        const { title = '', content = '' } = body;
        const { results } = await env.DB
          .prepare(`UPDATE memos
                    SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    RETURNING *`)
          .bind(title, content, id)
          .all();
        if (!results.length) return err('Not found', 404);
        return json(results[0]);
      }

      if (method === 'DELETE') {
        const { meta } = await env.DB
          .prepare('DELETE FROM memos WHERE id = ?')
          .bind(id)
          .run();
        if (!meta.changes) return err('Not found', 404);
        return new Response(null, { status: 204, headers: cors });
      }
    }

    // ── Serve HTML SPA ───────────────────────────────────────
    if (method === 'GET') {
      return new Response(HTML, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      });
    }

    return err('Not Found', 404);
  },
};
