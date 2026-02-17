// ═══════════════════════════════════════════
// SILVIA CRM — Agenda Calendario (agenda.js)
// ═══════════════════════════════════════════

(function () {
  'use strict';

  // ── Stato corrente ──
  let currentView = 'month'; // month | week | day
  let currentDate = new Date();
  let appointments = [];
  let editingId = null;
  let leadsCache = [];

  const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
  const GIORNI_BREVI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const GIORNI_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const HOUR_START = 8;
  const HOUR_END = 20;

  // ── DOM references ──
  const calContainer = () => document.getElementById('calContainer');
  const calLabel = () => document.getElementById('calLabel');

  // ══════════════════════════════
  // INIT
  // ══════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    initToolbar();
    initModals();
    render();
  });

  // ══════════════════════════════
  // TOOLBAR
  // ══════════════════════════════
  function initToolbar() {
    // View toggle
    document.querySelectorAll('.cal-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        render();
      });
    });

    // Navigation
    document.getElementById('btnPrev').addEventListener('click', () => navigate(-1));
    document.getElementById('btnNext').addEventListener('click', () => navigate(1));
    document.getElementById('btnOggi').addEventListener('click', () => {
      currentDate = new Date();
      render();
    });

    // New appointment button
    document.getElementById('btnNuovoAppuntamento').addEventListener('click', () => {
      openCreateModal();
    });
  }

  function navigate(direction) {
    if (currentView === 'month') {
      currentDate.setMonth(currentDate.getMonth() + direction);
    } else if (currentView === 'week') {
      currentDate.setDate(currentDate.getDate() + (7 * direction));
    } else {
      currentDate.setDate(currentDate.getDate() + direction);
    }
    render();
  }

  function updateLabel() {
    const label = calLabel();
    if (!label) return;

    if (currentView === 'month') {
      label.textContent = `${MESI[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (currentView === 'week') {
      const { start, end } = getWeekRange(currentDate);
      if (start.getMonth() === end.getMonth()) {
        label.textContent = `${start.getDate()} – ${end.getDate()} ${MESI[start.getMonth()]} ${start.getFullYear()}`;
      } else {
        label.textContent = `${start.getDate()} ${MESI[start.getMonth()].substring(0, 3)} – ${end.getDate()} ${MESI[end.getMonth()].substring(0, 3)} ${end.getFullYear()}`;
      }
    } else {
      const d = currentDate;
      const dow = getDayOfWeek(d);
      label.textContent = `${GIORNI_FULL[dow]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
    }
  }

  // ══════════════════════════════
  // RENDER DISPATCHER
  // ══════════════════════════════
  async function render() {
    updateLabel();
    await loadAppointments();

    if (currentView === 'month') renderMonth();
    else if (currentView === 'week') renderWeek();
    else renderDay();
  }

  // ══════════════════════════════
  // LOAD APPOINTMENTS FROM FIRESTORE
  // ══════════════════════════════
  async function loadAppointments() {
    try {
      const { from, to } = getQueryRange();
      const snapshot = await db.collection('appuntamenti')
        .where('data', '>=', from.toISOString().split('T')[0])
        .where('data', '<=', to.toISOString().split('T')[0])
        .get();

      appointments = [];
      snapshot.forEach(doc => {
        appointments.push({ id: doc.id, ...doc.data() });
      });
    } catch (err) {
      console.error('Errore caricamento appuntamenti:', err);
      appointments = [];
    }
  }

  function getQueryRange() {
    if (currentView === 'month') {
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth();
      // Include prev/next month overflow
      const from = new Date(y, m - 1, 1);
      const to = new Date(y, m + 2, 0);
      return { from, to };
    } else if (currentView === 'week') {
      const { start, end } = getWeekRange(currentDate);
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() + 1);
      return { from: start, to: end };
    } else {
      const d = new Date(currentDate);
      d.setHours(0, 0, 0, 0);
      const d2 = new Date(d);
      d2.setHours(23, 59, 59);
      return { from: d, to: d2 };
    }
  }

  // ══════════════════════════════
  // HELPERS DATE
  // ══════════════════════════════
  function getDayOfWeek(date) {
    // 0=Lun, 6=Dom
    const d = date.getDay();
    return d === 0 ? 6 : d - 1;
  }

  function getWeekRange(date) {
    const d = new Date(date);
    const dow = getDayOfWeek(d);
    const start = new Date(d);
    start.setDate(d.getDate() - dow);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59);
    return { start, end };
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

  function isToday(date) {
    return isSameDay(date, new Date());
  }

  function isWeekend(date) {
    const dow = getDayOfWeek(date);
    return dow >= 5; // Sab=5, Dom=6
  }

  function dateToStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getEventsForDate(dateStr) {
    return appointments.filter(a => a.data === dateStr)
      .sort((a, b) => (a.ora || '00:00').localeCompare(b.ora || '00:00'));
  }

  // ══════════════════════════════
  // VISTA MESE
  // ══════════════════════════════
  function renderMonth() {
    const container = calContainer();
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const startDow = getDayOfWeek(firstDay);
    const totalDays = lastDay.getDate();

    // Calculate grid start (previous month fill)
    const gridStart = new Date(firstDay);
    gridStart.setDate(gridStart.getDate() - startDow);

    // Calculate total cells (always 6 rows)
    const totalCells = 42;

    let html = '<div class="cal-month-grid">';

    // Weekday headers
    GIORNI_BREVI.forEach((g, i) => {
      html += `<div class="cal-weekday-header ${i >= 5 ? 'weekend' : ''}">${g}</div>`;
    });

    // Day cells
    const MAX_EVENTS = 3;
    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + i);
      const dateStr = dateToStr(cellDate);
      const isOther = cellDate.getMonth() !== m;
      const isTodayCell = isToday(cellDate);
      const isWknd = isWeekend(cellDate);

      let classes = 'cal-day-cell';
      if (isOther) classes += ' other-month';
      if (isTodayCell) classes += ' today';
      if (isWknd) classes += ' weekend';

      const events = getEventsForDate(dateStr);

      html += `<div class="${classes}" data-date="${dateStr}">`;
      html += `<div class="cal-day-number">${cellDate.getDate()}</div>`;
      html += '<div class="cal-day-events">';

      const visibleEvents = events.slice(0, MAX_EVENTS);
      const remaining = events.length - MAX_EVENTS;

      visibleEvents.forEach(evt => {
        const tipoClass = evt.tipo === 'richiamo' ? 'tipo-richiamo' : 'tipo-nuovo';
        const timeStr = evt.ora ? evt.ora.substring(0, 5) : '';
        const nameStr = evt.leadNome ? `${evt.leadNome} ${evt.leadCognome || ''}`.trim() : (evt.descrizione || 'Appuntamento');
        html += `<div class="cal-event-block ${tipoClass}" data-id="${evt.id}" title="${timeStr} ${nameStr}">`;
        if (timeStr) html += `<span class="cal-event-time">${timeStr}</span>`;
        html += `<span class="cal-event-label">${nameStr}</span>`;
        html += '</div>';
      });

      if (remaining > 0) {
        html += `<div class="cal-more-events" data-date="${dateStr}">+${remaining} altri</div>`;
      }

      html += '</div></div>';
    }

    html += '</div>';
    container.innerHTML = html;

    // Event listeners
    container.querySelectorAll('.cal-day-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        // Don't open create if clicked on event block or more
        if (e.target.closest('.cal-event-block') || e.target.closest('.cal-more-events')) return;
        const date = cell.dataset.date;
        openCreateModal(date);
      });
    });

    container.querySelectorAll('.cal-event-block').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.dataset.id;
        openDetailModal(id);
      });
    });

    container.querySelectorAll('.cal-more-events').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        // Switch to day view for that date
        const dateStr = el.dataset.date;
        const parts = dateStr.split('-');
        currentDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        currentView = 'day';
        document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.cal-view-btn[data-view="day"]').classList.add('active');
        render();
      });
    });
  }

  // ══════════════════════════════
  // VISTA SETTIMANA
  // ══════════════════════════════
  function renderWeek() {
    const container = calContainer();
    const { start } = getWeekRange(currentDate);

    // Build days array
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }

    let html = '';

    // Header
    html += '<div class="cal-week-header cal-week-header-7">';
    html += '<div class="cal-week-col-header"></div>'; // empty corner
    days.forEach(d => {
      const dow = getDayOfWeek(d);
      const todayCls = isToday(d) ? ' today' : '';
      const wkndCls = isWeekend(d) ? ' weekend' : '';
      html += `<div class="cal-week-col-header">
        <div class="cal-col-dayname${wkndCls}">${GIORNI_BREVI[dow]}</div>
        <div class="cal-col-daynum${todayCls}${wkndCls}">${d.getDate()}</div>
      </div>`;
    });
    html += '</div>';

    // Time grid
    html += '<div class="cal-time-grid-wrapper">';
    html += '<div class="cal-time-grid cal-time-grid-7">';

    // Time labels
    html += '<div class="cal-time-labels">';
    for (let h = HOUR_START; h <= HOUR_END; h++) {
      html += `<div class="cal-time-label">${String(h).padStart(2, '0')}:00</div>`;
    }
    html += '</div>';

    // Columns
    days.forEach((d, colIdx) => {
      const dateStr = dateToStr(d);
      const events = getEventsForDate(dateStr);

      html += `<div class="cal-time-column" data-date="${dateStr}" data-col="${colIdx}">`;
      // Slots
      for (let h = HOUR_START; h <= HOUR_END; h++) {
        html += `<div class="cal-time-slot" data-hour="${h}" data-date="${dateStr}"></div>`;
      }

      // Event blocks (positioned)
      events.forEach(evt => {
        const blockHtml = buildTimeEventBlock(evt);
        if (blockHtml) html += blockHtml;
      });

      // Now line
      if (isToday(d)) {
        const nowPos = getNowPosition();
        if (nowPos !== null) {
          html += `<div class="cal-now-line" style="top:${nowPos}px"></div>`;
        }
      }

      html += '</div>';
    });

    html += '</div></div>';
    container.innerHTML = html;

    bindTimeGridEvents(container);
    scrollToCurrentTime(container);
  }

  // ══════════════════════════════
  // VISTA GIORNO
  // ══════════════════════════════
  function renderDay() {
    const container = calContainer();
    const d = currentDate;
    const dateStr = dateToStr(d);
    const events = getEventsForDate(dateStr);
    const dow = getDayOfWeek(d);

    let html = '';

    // Header
    html += '<div class="cal-week-header cal-week-header-1">';
    html += '<div class="cal-week-col-header"></div>';
    const todayCls = isToday(d) ? ' today' : '';
    const wkndCls = isWeekend(d) ? ' weekend' : '';
    html += `<div class="cal-week-col-header">
      <div class="cal-col-dayname${wkndCls}">${GIORNI_FULL[dow]}</div>
      <div class="cal-col-daynum${todayCls}${wkndCls}">${d.getDate()}</div>
    </div>`;
    html += '</div>';

    // Time grid
    html += '<div class="cal-time-grid-wrapper">';
    html += '<div class="cal-time-grid cal-time-grid-1">';

    // Time labels
    html += '<div class="cal-time-labels">';
    for (let h = HOUR_START; h <= HOUR_END; h++) {
      html += `<div class="cal-time-label">${String(h).padStart(2, '0')}:00</div>`;
    }
    html += '</div>';

    // Single column
    html += `<div class="cal-time-column" data-date="${dateStr}" data-col="0">`;
    for (let h = HOUR_START; h <= HOUR_END; h++) {
      html += `<div class="cal-time-slot" data-hour="${h}" data-date="${dateStr}"></div>`;
    }

    events.forEach(evt => {
      const blockHtml = buildTimeEventBlock(evt);
      if (blockHtml) html += blockHtml;
    });

    if (isToday(d)) {
      const nowPos = getNowPosition();
      if (nowPos !== null) {
        html += `<div class="cal-now-line" style="top:${nowPos}px"></div>`;
      }
    }

    html += '</div>';
    html += '</div></div>';
    container.innerHTML = html;

    bindTimeGridEvents(container);
    scrollToCurrentTime(container);
  }

  // ── Build positioned event block for week/day views ──
  function buildTimeEventBlock(evt) {
    if (!evt.ora) return '';
    const parts = evt.ora.split(':');
    const hour = parseInt(parts[0]);
    const minutes = parseInt(parts[1] || 0);

    if (hour < HOUR_START || hour > HOUR_END) return '';

    const topPx = (hour - HOUR_START) * 60 + minutes;
    const heightPx = 50; // Default 50min block
    const tipoClass = evt.tipo === 'richiamo' ? 'tipo-richiamo' : 'tipo-nuovo';
    const nameStr = evt.leadNome ? `${evt.leadNome} ${evt.leadCognome || ''}`.trim() : 'Appuntamento';
    const timeStr = evt.ora.substring(0, 5);

    return `<div class="cal-week-event ${tipoClass}" data-id="${evt.id}" style="top:${topPx}px;height:${heightPx}px;">
      <span class="cal-week-event-time">${timeStr}</span>
      <span class="cal-week-event-title">${nameStr}</span>
      ${evt.descrizione ? `<span class="cal-week-event-desc">${evt.descrizione}</span>` : ''}
    </div>`;
  }

  function getNowPosition() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    if (h < HOUR_START || h > HOUR_END) return null;
    return (h - HOUR_START) * 60 + m;
  }

  function scrollToCurrentTime(container) {
    const wrapper = container.querySelector('.cal-time-grid-wrapper');
    if (!wrapper) return;
    const now = new Date();
    const h = now.getHours();
    if (h >= HOUR_START && h <= HOUR_END) {
      const scrollTo = Math.max(0, (h - HOUR_START - 1) * 60);
      wrapper.scrollTop = scrollTo;
    }
  }

  function bindTimeGridEvents(container) {
    // Click on time slot → create
    container.querySelectorAll('.cal-time-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const date = slot.dataset.date;
        const hour = slot.dataset.hour;
        openCreateModal(date, `${String(hour).padStart(2, '0')}:00`);
      });
    });

    // Click on event block → detail
    container.querySelectorAll('.cal-week-event').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openDetailModal(el.dataset.id);
      });
    });
  }

  // ══════════════════════════════
  // MODALE CREAZIONE / MODIFICA
  // ══════════════════════════════
  function initModals() {
    const modal = document.getElementById('modalAppuntamento');
    const detModal = document.getElementById('modalDettaglio');

    // Close handlers
    document.getElementById('modalAppClose').addEventListener('click', () => closeModal(modal));
    document.getElementById('btnAnnullaApp').addEventListener('click', () => closeModal(modal));
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });

    document.getElementById('modalDetClose').addEventListener('click', () => closeModal(detModal));
    detModal.addEventListener('click', (e) => { if (e.target === detModal) closeModal(detModal); });

    // Save
    document.getElementById('btnSalvaApp').addEventListener('click', saveAppointment);

    // Lead search
    const searchInput = document.getElementById('appLeadSearch');
    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => searchLeads(searchInput.value.trim()), 300);
    });
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length >= 2) searchLeads(searchInput.value.trim());
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.lead-search-wrapper')) {
        document.getElementById('leadSearchResults').classList.add('hidden');
      }
    });

    // Clear selected lead
    document.getElementById('leadSelectedClear').addEventListener('click', clearSelectedLead);

    // Detail modal actions
    document.getElementById('btnEliminaApp').addEventListener('click', deleteAppointment);
    document.getElementById('btnModificaApp').addEventListener('click', editAppointment);
  }

  function openCreateModal(date, time) {
    editingId = null;
    document.getElementById('modalAppTitle').textContent = 'Nuovo Appuntamento';

    // Reset form
    document.getElementById('appData').value = date || dateToStr(new Date());
    document.getElementById('appOra').value = time || '09:00';
    document.getElementById('appTipo').value = 'nuovo';
    document.getElementById('appLeadSearch').value = '';
    document.getElementById('appLeadId').value = '';
    document.getElementById('appDescrizione').value = '';
    clearSelectedLead();

    openModal(document.getElementById('modalAppuntamento'));
  }

  function openModal(modal) {
    modal.classList.remove('hidden');
    // Focus first input
    setTimeout(() => {
      const firstInput = modal.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  function closeModal(modal) {
    modal.classList.add('hidden');
  }

  // ── Lead Search ──
  async function searchLeads(query) {
    const resultsDiv = document.getElementById('leadSearchResults');
    if (query.length < 2) {
      resultsDiv.classList.add('hidden');
      return;
    }

    try {
      // Load leads if not cached
      if (leadsCache.length === 0) {
        const snapshot = await db.collection('leads').get();
        leadsCache = [];
        snapshot.forEach(doc => {
          const d = doc.data();
          leadsCache.push({ id: doc.id, nome: d.nome, cognome: d.cognome, telefono: d.telefono || '' });
        });
      }

      const q = query.toLowerCase();
      const results = leadsCache.filter(l =>
        (l.nome && l.nome.toLowerCase().includes(q)) ||
        (l.cognome && l.cognome.toLowerCase().includes(q)) ||
        (`${l.nome} ${l.cognome}`.toLowerCase().includes(q))
      ).slice(0, 8);

      if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="lead-search-item" style="color:#94a3b8;cursor:default;">Nessun lead trovato</div>';
      } else {
        resultsDiv.innerHTML = results.map(l =>
          `<div class="lead-search-item" data-id="${l.id}" data-nome="${l.nome}" data-cognome="${l.cognome}">
            <span class="lead-search-item-name">${l.nome} ${l.cognome}</span>
            <span class="lead-search-item-phone">${l.telefono}</span>
          </div>`
        ).join('');

        resultsDiv.querySelectorAll('.lead-search-item[data-id]').forEach(item => {
          item.addEventListener('click', () => {
            selectLead(item.dataset.id, item.dataset.nome, item.dataset.cognome);
            resultsDiv.classList.add('hidden');
          });
        });
      }

      resultsDiv.classList.remove('hidden');
    } catch (err) {
      console.error('Errore ricerca lead:', err);
    }
  }

  function selectLead(id, nome, cognome) {
    document.getElementById('appLeadId').value = id;
    document.getElementById('appLeadSearch').value = '';
    document.getElementById('appLeadSearch').classList.add('hidden');
    document.getElementById('leadSelectedName').textContent = `${nome} ${cognome}`;
    document.getElementById('leadSelected').classList.remove('hidden');
  }

  function clearSelectedLead() {
    document.getElementById('appLeadId').value = '';
    document.getElementById('appLeadSearch').value = '';
    document.getElementById('appLeadSearch').classList.remove('hidden');
    document.getElementById('leadSelected').classList.add('hidden');
  }

  // ── Save appointment ──
  async function saveAppointment() {
    const data = document.getElementById('appData').value;
    const ora = document.getElementById('appOra').value;
    const tipo = document.getElementById('appTipo').value;
    const leadId = document.getElementById('appLeadId').value;
    const descrizione = document.getElementById('appDescrizione').value.trim();

    if (!data || !ora) {
      showToast('Data e ora sono obbligatori', 'error');
      return;
    }

    // Get lead info
    let leadNome = '', leadCognome = '';
    if (leadId) {
      const lead = leadsCache.find(l => l.id === leadId);
      if (lead) {
        leadNome = lead.nome;
        leadCognome = lead.cognome;
      }
    }

    const appData = {
      data: data,
      ora: ora,
      tipo: tipo,
      leadId: leadId || '',
      leadNome: leadNome,
      leadCognome: leadCognome,
      descrizione: descrizione,
      completato: false
    };

    try {
      if (editingId) {
        await db.collection('appuntamenti').doc(editingId).update(appData);
        showToast('Appuntamento aggiornato');
      } else {
        await db.collection('appuntamenti').add(appData);
        showToast('Appuntamento creato');
      }

      closeModal(document.getElementById('modalAppuntamento'));
      leadsCache = []; // Invalidate for next search
      await render();
    } catch (err) {
      console.error('Errore salvataggio:', err);
      showToast('Errore nel salvataggio', 'error');
    }
  }

  // ══════════════════════════════
  // MODALE DETTAGLIO
  // ══════════════════════════════
  function openDetailModal(appointmentId) {
    const app = appointments.find(a => a.id === appointmentId);
    if (!app) return;

    const detBody = document.getElementById('dettaglioBody');
    const tipoBadge = app.tipo === 'richiamo'
      ? '<span class="det-badge richiamo">Richiamo</span>'
      : '<span class="det-badge nuovo">Nuovo</span>';

    // Format date nicely
    const parts = app.data.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dow = getDayOfWeek(dateObj);
    const dateStr = `${GIORNI_FULL[dow]} ${dateObj.getDate()} ${MESI[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    let leadLink = '—';
    if (app.leadId && app.leadNome) {
      leadLink = `<a href="lead-dettaglio.html?id=${app.leadId}">${app.leadNome} ${app.leadCognome || ''}</a>`;
    } else if (app.leadNome) {
      leadLink = `${app.leadNome} ${app.leadCognome || ''}`;
    }

    detBody.innerHTML = `
      <div class="det-row">
        <svg class="det-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <div>
          <div class="det-label">Data</div>
          <div class="det-value">${dateStr}</div>
        </div>
      </div>
      <div class="det-row">
        <svg class="det-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <div>
          <div class="det-label">Ora</div>
          <div class="det-value">${app.ora || '—'}</div>
        </div>
      </div>
      <div class="det-row">
        <svg class="det-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        <div>
          <div class="det-label">Tipo</div>
          <div class="det-value">${tipoBadge}</div>
        </div>
      </div>
      <div class="det-row">
        <svg class="det-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <div>
          <div class="det-label">Lead</div>
          <div class="det-value">${leadLink}</div>
        </div>
      </div>
      ${app.descrizione ? `
      <div class="det-row">
        <svg class="det-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
        <div>
          <div class="det-label">Descrizione</div>
          <div class="det-value">${app.descrizione}</div>
        </div>
      </div>` : ''}
      ${app.tipo === 'richiamo' && app.leadId ? `
      <div style="margin-top:16px;text-align:center">
        <a href="lead-dettaglio.html?id=${app.leadId}" class="btn btn-primary btn-sm">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Vedi scheda lead
        </a>
      </div>` : ''}
    `;

    // Store current appointment id for actions
    document.getElementById('btnEliminaApp').dataset.id = appointmentId;
    document.getElementById('btnModificaApp').dataset.id = appointmentId;

    openModal(document.getElementById('modalDettaglio'));
  }

  // ── Delete ──
  function deleteAppointment() {
    const id = document.getElementById('btnEliminaApp').dataset.id;
    if (!id) return;

    showConfirmModal('Vuoi eliminare questo appuntamento?', async () => {
      try {
        await db.collection('appuntamenti').doc(id).delete();
        showToast('Appuntamento eliminato');
        closeModal(document.getElementById('modalDettaglio'));
        await render();
      } catch (err) {
        console.error('Errore eliminazione:', err);
        showToast('Errore nell\'eliminazione', 'error');
      }
    });
  }

  // ── Edit (opens create modal with pre-filled data) ──
  function editAppointment() {
    const id = document.getElementById('btnModificaApp').dataset.id;
    const app = appointments.find(a => a.id === id);
    if (!app) return;

    closeModal(document.getElementById('modalDettaglio'));

    editingId = id;
    document.getElementById('modalAppTitle').textContent = 'Modifica Appuntamento';
    document.getElementById('appData').value = app.data || '';
    document.getElementById('appOra').value = app.ora || '';
    document.getElementById('appTipo').value = app.tipo || 'nuovo';
    document.getElementById('appDescrizione').value = app.descrizione || '';

    if (app.leadId && app.leadNome) {
      selectLead(app.leadId, app.leadNome, app.leadCognome || '');
    } else {
      clearSelectedLead();
    }

    openModal(document.getElementById('modalAppuntamento'));
  }

})();
