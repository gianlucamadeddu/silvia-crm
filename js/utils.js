// ═══ UTILS.JS — Funzioni condivise ═══

// ── Cache impostazioni ──
let _impostazioniCache = null;

// ══════════════════════════════════
// renderSidebar(activePage)
// ══════════════════════════════════
function renderSidebar(activePage) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const menuItems = [
    { id: 'dashboard',    label: 'Dashboard',         href: 'dashboard.html',   icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
    { id: 'lead',         label: 'Lead',              href: 'lead-elenco.html', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { id: 'agenda',       label: 'Agenda Calendario', href: 'agenda.html',      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
    { id: 'template',     label: 'Template',          href: 'template.html',    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' },
    { id: 'impostazioni', label: 'Impostazioni',      href: 'impostazioni.html',icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' },
    { id: 'report',       label: 'Report',            href: 'report.html',      icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' }
  ];

  sidebar.innerHTML = `
    <div class="sidebar-logo-section">
      <div class="sidebar-logo">SILVIA</div>
      <div class="sidebar-payoff">Vendita</div>
    </div>
    <div class="sidebar-divider"></div>
    <div class="sidebar-label">MENU PRINCIPALE</div>
    <nav class="sidebar-menu">
      ${menuItems.map(item => `
        <a href="${item.href}" class="menu-item ${item.id === activePage ? 'active' : ''}">
          ${item.icon}
          <span>${item.label}</span>
        </a>
      `).join('')}
    </nav>
    <div class="sidebar-footer">
      <a href="#" class="menu-item" onclick="doLogout(); return false;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>Esci</span>
      </a>
    </div>
  `;

  // Hamburger per mobile
  if (!document.querySelector('.hamburger')) {
    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger';
    hamburger.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    document.body.appendChild(hamburger);

    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
  }
}

// ══════════════════════════════════
// renderPeriodFilter(containerId, cb)
// ══════════════════════════════════
function renderPeriodFilter(containerId, onChangeCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="period-filter">
      <select class="period-select" id="periodSelect">
        <option value="mese">Mese corrente</option>
        <option value="trimestre">Trimestre</option>
        <option value="semestre">Semestre</option>
        <option value="anno">Anno</option>
        <option value="personalizzato">Personalizzato</option>
      </select>
      <div class="period-dates" id="periodDates">
        <span class="text-sm text-muted">Da</span>
        <input type="date" id="periodFrom">
        <span class="text-sm text-muted">A</span>
        <input type="date" id="periodTo">
      </div>
    </div>
  `;

  const select = document.getElementById('periodSelect');
  const datesDiv = document.getElementById('periodDates');
  const fromInput = document.getElementById('periodFrom');
  const toInput = document.getElementById('periodTo');

  function triggerChange() {
    const period = select.value;
    if (period === 'personalizzato') {
      datesDiv.classList.add('visible');
      if (fromInput.value && toInput.value) {
        onChangeCallback(period, fromInput.value, toInput.value);
      }
    } else {
      datesDiv.classList.remove('visible');
      onChangeCallback(period, null, null);
    }
  }

  select.addEventListener('change', triggerChange);
  fromInput.addEventListener('change', triggerChange);
  toInput.addEventListener('change', triggerChange);

  // Trigger iniziale
  triggerChange();
}

// ══════════════════════════════════
// getDateRange(period, from, to)
// ══════════════════════════════════
function getDateRange(periodValue, customFrom, customTo) {
  const now = new Date();
  let from, to;

  switch (periodValue) {
    case 'mese':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;
    case 'trimestre':
      from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;
    case 'semestre':
      from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;
    case 'anno':
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      break;
    case 'personalizzato':
      from = customFrom ? new Date(customFrom + 'T00:00:00') : new Date(now.getFullYear(), 0, 1);
      to = customTo ? new Date(customTo + 'T23:59:59') : now;
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = now;
  }

  return { from, to };
}

// ══════════════════════════════════
// showToast(message, type)
// ══════════════════════════════════
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
    if (container.children.length === 0) {
      container.remove();
    }
  }, 3000);
}

// ══════════════════════════════════
// showConfirmModal(message, onConfirm)
// ══════════════════════════════════
function showConfirmModal(message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content" style="max-width:420px">
      <div class="modal-body" style="padding:32px 24px;text-align:center">
        <p style="font-size:15px;margin-bottom:24px">${message}</p>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-secondary" id="confirmCancel">Annulla</button>
          <button class="btn btn-danger" id="confirmOk">Conferma</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('confirmCancel').addEventListener('click', () => overlay.remove());
  document.getElementById('confirmOk').addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

// ══════════════════════════════════
// Formattazione date
// ══════════════════════════════════
const _mesiBrevi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

function formatDate(timestamp) {
  if (!timestamp) return '—';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return `${d.getDate()} ${_mesiBrevi[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const ore = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${_mesiBrevi[d.getMonth()]} ${d.getFullYear()} ${ore}:${min}`;
}

// ══════════════════════════════════
// generateId()
// ══════════════════════════════════
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ══════════════════════════════════
// loadImpostazioni()
// ══════════════════════════════════
async function loadImpostazioni() {
  if (_impostazioniCache) return _impostazioniCache;

  try {
    const doc = await db.collection('impostazioni').doc('config').get();
    if (doc.exists) {
      _impostazioniCache = doc.data();
    } else {
      _impostazioniCache = { stati: [], fonti: [], corsiStudi: [], scuole: [], classi: [], scuoleAssegnazione: [], modalitaPagamento: [], macroAree: [] };
    }
  } catch (err) {
    console.error('Errore caricamento impostazioni:', err);
    _impostazioniCache = { stati: [], fonti: [], corsiStudi: [], scuole: [], classi: [], scuoleAssegnazione: [], modalitaPagamento: [], macroAree: [] };
  }

  return _impostazioniCache;
}

// Invalida cache (da chiamare dopo modifiche impostazioni)
function invalidateImpostazioniCache() {
  _impostazioniCache = null;
}
