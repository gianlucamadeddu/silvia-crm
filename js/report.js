// ═══ REPORT.JS — Logica Report Commerciale + Estrazioni Studenti ═══

document.addEventListener('DOMContentLoaded', () => {
  initReport();
});

// ── Stato globale ──
let allLeads = [];
let impostazioni = null;
let chartStatiInstance = null;
let chartFontiInstance = null;
let chartTempoInstance = null;
let estrazioniData = [];
let sortColumn = '';
let sortDirection = 'asc';
let selectedFonte = ''; // Filtro fonte attivo

// ══════════════════════════════════
// INIT
// ══════════════════════════════════
async function initReport() {
  impostazioni = await loadImpostazioni();

  // Setup tabs
  setupTabs();

  // Setup periodo per report commerciale
  renderPeriodFilter('periodFilterContainer', onPeriodChange);

  // Setup filtro fonte
  setupFonteFilter();

  // Setup filtri estrazioni
  setupEstrazioniFiltri();

  // Bottoni
  document.getElementById('btnExportReport').addEventListener('click', exportReportCommerciale);
  document.getElementById('btnCercaEstrazione').addEventListener('click', cercaEstrazioni);
  document.getElementById('btnResetFiltri').addEventListener('click', resetFiltriEstrazioni);
  document.getElementById('btnExportEstrazione').addEventListener('click', exportEstrazioni);

  // Sorting tabella estrazioni
  setupTableSorting();
}

// ══════════════════════════════════
// FILTRO FONTE
// ══════════════════════════════════
function setupFonteFilter() {
  const select = document.getElementById('fonteFilter');
  if (!select) return;

  const fonti = impostazioni.fonti || [];

  // Popola dropdown con le fonti dalle impostazioni
  fonti.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.nome;
    opt.textContent = f.nome;
    select.appendChild(opt);
  });

  // Listener: al cambio fonte, aggiorna contatori e grafici
  select.addEventListener('change', () => {
    selectedFonte = select.value;
    renderCounters();
    renderCharts();
  });
}

// Restituisce i lead filtrati per fonte (se selezionata)
function getFilteredLeads() {
  if (!selectedFonte) return allLeads;
  return allLeads.filter(l => (l.fonte || '') === selectedFonte);
}

// ══════════════════════════════════
// TABS
// ══════════════════════════════════
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-item');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const tabId = tab.getAttribute('data-tab');
      document.getElementById('tabCommerciale').style.display = tabId === 'commerciale' ? 'block' : 'none';
      document.getElementById('tabEstrazioni').style.display = tabId === 'estrazioni' ? 'block' : 'none';
    });
  });
}

// ══════════════════════════════════
// REPORT COMMERCIALE
// ══════════════════════════════════

async function onPeriodChange(period, from, to) {
  const range = getDateRange(period, from, to);
  await loadLeadsForPeriod(range.from, range.to);
  renderCounters();
  renderCharts();
}

async function loadLeadsForPeriod(fromDate, toDate) {
  try {
    const fromTs = firebase.firestore.Timestamp.fromDate(fromDate);
    const toTs = firebase.firestore.Timestamp.fromDate(toDate);

    const snapshot = await db.collection('leads')
      .where('dataCreazione', '>=', fromTs)
      .where('dataCreazione', '<=', toTs)
      .get();

    allLeads = [];
    snapshot.forEach(doc => {
      allLeads.push({ id: doc.id, ...doc.data() });
    });
  } catch (err) {
    console.error('Errore caricamento leads:', err);
    showToast('Errore nel caricamento dei dati', 'error');
    allLeads = [];
  }
}

// ── Contatori ──
function renderCounters() {
  const container = document.getElementById('reportCounters');
  const statiContainer = document.getElementById('statiCounters');
  const stati = impostazioni.stati || [];

  // Usa i lead filtrati per fonte
  const leads = getFilteredLeads();

  // Lead totali
  const totale = leads.length;

  // Per fonte (conta le top 3)
  const perFonte = {};
  leads.forEach(l => {
    const f = l.fonte || 'Non specificata';
    perFonte[f] = (perFonte[f] || 0) + 1;
  });
  const fonteTop = Object.entries(perFonte).sort((a, b) => b[1] - a[1])[0];

  // Contratti (stati tipo "contratto" / "iscritto" oppure ultimo stato)
  const statiContratto = stati.filter(s =>
    /contratt|iscritt|chiuso|vinto/i.test(s.nome)
  ).map(s => s.nome);
  const contratti = leads.filter(l => statiContratto.includes(l.stato)).length;

  // Conversione %
  const conversione = totale > 0 ? ((contratti / totale) * 100).toFixed(1) : '0.0';

  container.innerHTML = `
    <div class="counter-card">
      <div class="counter-icon blue">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <div>
        <div class="counter-value">${totale}</div>
        <div class="counter-label">Lead Totali</div>
      </div>
    </div>
    <div class="counter-card">
      <div class="counter-icon green">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div>
        <div class="counter-value">${contratti}</div>
        <div class="counter-label">Contratti</div>
      </div>
    </div>
    <div class="counter-card">
      <div class="counter-icon yellow">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <div>
        <div class="counter-value">${conversione}%</div>
        <div class="counter-label">Conversione</div>
      </div>
    </div>
    <div class="counter-card">
      <div class="counter-icon pink">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </div>
      <div>
        <div class="counter-value">${fonteTop ? fonteTop[1] : 0}</div>
        <div class="counter-label">Top Fonte: ${fonteTop ? fonteTop[0] : '—'}</div>
      </div>
    </div>
  `;

  // Card per ogni stato
  const perStato = {};
  leads.forEach(l => {
    const s = l.stato || 'Sconosciuto';
    perStato[s] = (perStato[s] || 0) + 1;
  });

  statiContainer.innerHTML = stati.map(s => {
    const count = perStato[s.nome] || 0;
    const bgColor = hexToRgba(s.colore, 0.12);
    return `
      <div class="counter-card" style="border-left: 4px solid ${s.colore}">
        <div class="counter-icon" style="background:${bgColor}">
          <div style="width:12px;height:12px;border-radius:50%;background:${s.colore}"></div>
        </div>
        <div>
          <div class="counter-value">${count}</div>
          <div class="counter-label">${s.nome}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Grafici ──
function renderCharts() {
  renderChartStati();
  renderChartFonti();
  renderChartTempo();
}

function renderChartStati() {
  const stati = impostazioni.stati || [];
  const leads = getFilteredLeads();

  const perStato = {};
  leads.forEach(l => {
    const s = l.stato || 'Sconosciuto';
    perStato[s] = (perStato[s] || 0) + 1;
  });

  const labels = stati.map(s => s.nome);
  const data = stati.map(s => perStato[s.nome] || 0);
  const colors = stati.map(s => s.colore);

  if (chartStatiInstance) chartStatiInstance.destroy();

  const ctx = document.getElementById('chartStati').getContext('2d');
  chartStatiInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Lead',
        data: data,
        backgroundColor: colors.map(c => hexToRgba(c, 0.7)),
        borderColor: colors,
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 12 } },
          grid: { color: '#f1f5f9' }
        },
        x: {
          ticks: { font: { size: 11 }, maxRotation: 45 },
          grid: { display: false }
        }
      }
    }
  });
}

function renderChartFonti() {
  const leads = getFilteredLeads();

  const perFonte = {};
  leads.forEach(l => {
    const f = l.fonte || 'Non specificata';
    perFonte[f] = (perFonte[f] || 0) + 1;
  });

  const labels = Object.keys(perFonte);
  const data = Object.values(perFonte);
  const palette = ['#1e40af', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'];
  const colors = labels.map((_, i) => palette[i % palette.length]);

  if (chartFontiInstance) chartFontiInstance.destroy();

  const ctx = document.getElementById('chartFonti').getContext('2d');
  chartFontiInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 12 }, padding: 16, usePointStyle: true, pointStyleWidth: 10 }
        }
      }
    }
  });
}

function renderChartTempo() {
  const leads = getFilteredLeads();

  // Raggruppa lead per mese di creazione
  const perMese = {};
  leads.forEach(l => {
    if (!l.dataCreazione) return;
    const d = l.dataCreazione.toDate ? l.dataCreazione.toDate() : new Date(l.dataCreazione);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    perMese[key] = (perMese[key] || 0) + 1;
  });

  // Ordina per data
  const sortedKeys = Object.keys(perMese).sort();
  const mesiLabels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  const labels = sortedKeys.map(k => {
    const [y, m] = k.split('-');
    return `${mesiLabels[parseInt(m) - 1]} ${y}`;
  });
  const data = sortedKeys.map(k => perMese[k]);

  if (chartTempoInstance) chartTempoInstance.destroy();

  const ctx = document.getElementById('chartTempo').getContext('2d');
  chartTempoInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Lead creati',
        data: data,
        borderColor: '#1e40af',
        backgroundColor: 'rgba(30,64,175,0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#1e40af',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 12 } },
          grid: { color: '#f1f5f9' }
        },
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

// ── Export Report Commerciale ──
function exportReportCommerciale() {
  const leads = getFilteredLeads();

  if (leads.length === 0) {
    showToast('Nessun dato da esportare', 'warning');
    return;
  }

  const data = leads.map(l => ({
    nome: l.nome || '',
    cognome: l.cognome || '',
    telefono: l.telefono || '',
    email: l.email || '',
    stato: l.stato || '',
    fonte: l.fonte || '',
    dataCreazione: l.dataCreazione ? formatDate(l.dataCreazione) : ''
  }));

  const columns = [
    { header: 'Nome', key: 'nome', width: 16 },
    { header: 'Cognome', key: 'cognome', width: 18 },
    { header: 'Telefono', key: 'telefono', width: 16 },
    { header: 'Email', key: 'email', width: 24 },
    { header: 'Stato', key: 'stato', width: 16 },
    { header: 'Fonte', key: 'fonte', width: 16 },
    { header: 'Data Creazione', key: 'dataCreazione', width: 16 }
  ];

  const suffix = selectedFonte ? `_${selectedFonte.replace(/\s+/g, '_')}` : '';
  exportToExcel(data, columns, `Report_Commerciale${suffix}`);
}

// ══════════════════════════════════
// ESTRAZIONI STUDENTI
// ══════════════════════════════════

function setupEstrazioniFiltri() {
  // Multi select: Corso studi
  createMultiSelect('msCorso', (impostazioni.corsiStudi || []).map(c => c.nome), 'Seleziona corsi...');
  // Multi select: Scuola convenzionata
  createMultiSelect('msScuola', (impostazioni.scuole || []).map(s => s.nome), 'Seleziona scuole...');
  // Multi select: Scuola assegnazione
  createMultiSelect('msScuolaAss', (impostazioni.scuoleAssegnazione || []).map(s => s.nome), 'Seleziona scuole...');
  // Multi select: Classe
  createMultiSelect('msClasse', (impostazioni.classi || []).map(c => c.nome), 'Seleziona classi...');
  // Macro Area dropdown
  const macroSel = document.getElementById('filtroMacroArea');
  (impostazioni.macroAree || []).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.nome;
    opt.textContent = m.nome;
    macroSel.appendChild(opt);
  });
}

// ── Multi-Select custom component ──
function createMultiSelect(containerId, options, placeholder) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const id = 'ms_' + containerId;
  container.innerHTML = `
    <button type="button" class="multi-select-btn" id="${id}_btn">
      <span class="placeholder">${placeholder}</span>
      <span class="arrow">▼</span>
    </button>
    <div class="multi-select-dropdown" id="${id}_drop">
      ${options.map((opt, i) => `
        <label class="multi-select-option">
          <input type="checkbox" value="${opt}" data-ms="${id}">
          <span>${opt}</span>
        </label>
      `).join('')}
    </div>
  `;

  const btn = document.getElementById(`${id}_btn`);
  const drop = document.getElementById(`${id}_drop`);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Chiudi tutti gli altri
    document.querySelectorAll('.multi-select-dropdown.open').forEach(d => {
      if (d !== drop) {
        d.classList.remove('open');
        d.previousElementSibling.classList.remove('open');
      }
    });
    drop.classList.toggle('open');
    btn.classList.toggle('open');
  });

  // Aggiorna label quando cambiano le selezioni
  drop.addEventListener('change', () => {
    const checked = drop.querySelectorAll('input:checked');
    const span = btn.querySelector('span:first-child');
    if (checked.length === 0) {
      span.className = 'placeholder';
      span.textContent = placeholder;
    } else if (checked.length <= 2) {
      span.className = '';
      span.textContent = Array.from(checked).map(c => c.value).join(', ');
    } else {
      span.className = '';
      span.textContent = `${checked.length} selezionati`;
    }
  });

  // Chiudi dropdown al click fuori
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      drop.classList.remove('open');
      btn.classList.remove('open');
    }
  });

  // Metodo per ottenere i valori selezionati
  container.getSelectedValues = function () {
    return Array.from(drop.querySelectorAll('input:checked')).map(c => c.value);
  };

  // Metodo per resettare
  container.resetSelection = function () {
    drop.querySelectorAll('input:checked').forEach(c => c.checked = false);
    const span = btn.querySelector('span:first-child');
    span.className = 'placeholder';
    span.textContent = placeholder;
  };
}

// ── Cerca Estrazioni ──
async function cercaEstrazioni() {
  const btnCerca = document.getElementById('btnCercaEstrazione');
  btnCerca.disabled = true;
  btnCerca.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Ricerca...';

  try {
    // Carica TUTTI i lead (estrazioni non si basano solo su dataCreazione)
    const snapshot = await db.collection('leads').get();
    let leads = [];
    snapshot.forEach(doc => {
      leads.push({ id: doc.id, ...doc.data() });
    });

    // Applica filtri
    leads = applicaFiltriEstrazioni(leads);

    // Mappa a dati tabella
    estrazioniData = leads.map(l => {
      const studente = l.studente || {};
      const pagamento = l.pagamento || {};
      const rate = pagamento.rate || [];

      // Calcola stato pagamento
      const statoPag = calcolaStatoPagamento(rate);

      // Prossima scadenza non pagata
      const prossimaScadenza = getProssimaScadenza(rate);

      return {
        id: l.id,
        nome: l.nome || '',
        cognome: l.cognome || '',
        corsoStudi: studente.corsoStudi || '',
        scuola: studente.scuolaProvenienza || '',
        classe: (studente.classiRecupero || []).join(', ') || studente.inserimentoClasse || '',
        macroArea: studente.macroArea || '',
        pagamento: statoPag,
        scadenza: prossimaScadenza,
        scadenzaRaw: prossimaScadenza === '—' ? null : prossimaScadenza
      };
    });

    // Render risultati
    renderEstrazioniResults();
  } catch (err) {
    console.error('Errore estrazioni:', err);
    showToast('Errore nella ricerca', 'error');
  } finally {
    btnCerca.disabled = false;
    btnCerca.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Cerca`;
  }
}

function applicaFiltriEstrazioni(leads) {
  const partenzaDa = document.getElementById('filtroPartenzaDa').value;
  const partenzaA = document.getElementById('filtroPartenzaA').value;
  const scadenzaDa = document.getElementById('filtroScadenzaDa').value;
  const scadenzaA = document.getElementById('filtroScadenzaA').value;

  const corsiSel = document.getElementById('msCorso').getSelectedValues();
  const scuoleSel = document.getElementById('msScuola').getSelectedValues();
  const scuoleAssSel = document.getElementById('msScuolaAss').getSelectedValues();
  const classiSel = document.getElementById('msClasse').getSelectedValues();

  const macroArea = document.getElementById('filtroMacroArea').value;
  const statoPag = document.getElementById('filtroStatoPagamento').value;
  const servizio = document.getElementById('filtroServizio').value;

  return leads.filter(l => {
    const studente = l.studente || {};
    const pagamento = l.pagamento || {};
    const rate = pagamento.rate || [];

    // Filtro data partenza (usiamo partenzeEffettuate o dataCreazione)
    if (partenzaDa || partenzaA) {
      const dataRef = l.dataCreazione ? (l.dataCreazione.toDate ? l.dataCreazione.toDate() : new Date(l.dataCreazione)) : null;
      if (dataRef) {
        if (partenzaDa && dataRef < new Date(partenzaDa + 'T00:00:00')) return false;
        if (partenzaA && dataRef > new Date(partenzaA + 'T23:59:59')) return false;
      } else {
        return false;
      }
    }

    // Filtro scadenze pagamenti
    if (scadenzaDa || scadenzaA) {
      const hasMatchingRate = rate.some(r => {
        if (!r.dataScadenza) return false;
        const ds = r.dataScadenza.toDate ? r.dataScadenza.toDate() : new Date(r.dataScadenza);
        if (scadenzaDa && ds < new Date(scadenzaDa + 'T00:00:00')) return false;
        if (scadenzaA && ds > new Date(scadenzaA + 'T23:59:59')) return false;
        return true;
      });
      if (!hasMatchingRate && rate.length > 0) return false;
      if (rate.length === 0 && (scadenzaDa || scadenzaA)) return false;
    }

    // Filtro corsi di studi (multi)
    if (corsiSel.length > 0 && !corsiSel.includes(studente.corsoStudi)) return false;

    // Filtro scuole convenzionate (multi)
    if (scuoleSel.length > 0 && !scuoleSel.includes(studente.scuolaProvenienza)) return false;

    // Filtro scuole assegnazione (multi)
    if (scuoleAssSel.length > 0 && !scuoleAssSel.includes(studente.scuolaAssegnazione)) return false;

    // Filtro classi (multi)
    if (classiSel.length > 0) {
      const leadClassi = studente.classiRecupero || [];
      const hasClasse = classiSel.some(c => leadClassi.includes(c)) ||
                        classiSel.includes(studente.inserimentoClasse);
      if (!hasClasse) return false;
    }

    // Filtro macro area
    if (macroArea && studente.macroArea !== macroArea) return false;

    // Filtro servizio
    if (servizio && studente.servizio !== servizio) return false;

    // Filtro stato pagamento
    if (statoPag) {
      const stPag = calcolaStatoPagamento(rate);
      if (statoPag === 'pagato' && stPag !== 'Pagato') return false;
      if (statoPag === 'non_pagato' && stPag !== 'Non pagato') return false;
      if (statoPag === 'in_ritardo' && stPag !== 'In ritardo') return false;
    }

    return true;
  });
}

function calcolaStatoPagamento(rate) {
  if (!rate || rate.length === 0) return 'Non definito';

  const now = new Date();
  const totalRate = rate.length;
  const pagate = rate.filter(r => r.pagato).length;

  if (pagate === totalRate) return 'Pagato';

  // Verifica se ci sono rate scadute non pagate
  const inRitardo = rate.some(r => {
    if (r.pagato) return false;
    if (!r.dataScadenza) return false;
    const ds = r.dataScadenza.toDate ? r.dataScadenza.toDate() : new Date(r.dataScadenza);
    return ds < now;
  });

  if (inRitardo) return 'In ritardo';
  return 'Non pagato';
}

function getProssimaScadenza(rate) {
  if (!rate || rate.length === 0) return '—';

  const now = new Date();
  const nonPagate = rate
    .filter(r => !r.pagato && r.dataScadenza)
    .map(r => ({
      data: r.dataScadenza.toDate ? r.dataScadenza.toDate() : new Date(r.dataScadenza)
    }))
    .sort((a, b) => a.data - b.data);

  if (nonPagate.length === 0) return '—';
  return formatDate(nonPagate[0].data);
}

function renderEstrazioniResults() {
  const resultsDiv = document.getElementById('estrazioniResults');
  const emptyDiv = document.getElementById('estrazioniEmpty');
  const countSpan = document.getElementById('resultsCount');
  const tbody = document.getElementById('estrazioniBody');

  if (estrazioniData.length === 0) {
    resultsDiv.style.display = 'none';
    emptyDiv.style.display = 'block';
    emptyDiv.querySelector('.empty-state-text').textContent = 'Nessuno studente trovato';
    emptyDiv.querySelector('.empty-state-subtext').textContent = 'Prova a modificare i filtri di ricerca';
    return;
  }

  emptyDiv.style.display = 'none';
  resultsDiv.style.display = 'block';
  countSpan.textContent = `${estrazioniData.length} studenti trovati`;

  // Ordina se serve
  let sorted = [...estrazioniData];
  if (sortColumn) {
    sorted.sort((a, b) => {
      let va = a[sortColumn] || '';
      let vb = b[sortColumn] || '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDirection === 'asc' ? -1 : 1;
      if (va > vb) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  tbody.innerHTML = sorted.map(s => {
    const badgeClass = getBadgePagamentoClass(s.pagamento);
    return `
      <tr class="clickable-row" onclick="window.location.href='lead-dettaglio.html?id=${s.id}'">
        <td>${escapeHtml(s.nome)}</td>
        <td>${escapeHtml(s.cognome)}</td>
        <td>${escapeHtml(s.corsoStudi)}</td>
        <td>${escapeHtml(s.scuola)}</td>
        <td>${escapeHtml(s.classe)}</td>
        <td>${escapeHtml(s.macroArea)}</td>
        <td><span class="badge-payment ${badgeClass}">${s.pagamento}</span></td>
        <td>${s.scadenza}</td>
      </tr>
    `;
  }).join('');
}

function getBadgePagamentoClass(stato) {
  switch (stato) {
    case 'Pagato': return 'badge-pagato';
    case 'Non pagato': return 'badge-non-pagato';
    case 'In ritardo': return 'badge-in-ritardo';
    default: return '';
  }
}

// ── Table Sorting ──
function setupTableSorting() {
  const ths = document.querySelectorAll('#estrazioniTable th[data-sort]');
  ths.forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (sortColumn === col) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = col;
        sortDirection = 'asc';
      }

      // Aggiorna classi visive
      ths.forEach(t => t.classList.remove('sorted-asc', 'sorted-desc'));
      th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');

      // Re-render
      renderEstrazioniResults();
    });
  });
}

// ── Reset Filtri ──
function resetFiltriEstrazioni() {
  document.getElementById('filtroPartenzaDa').value = '';
  document.getElementById('filtroPartenzaA').value = '';
  document.getElementById('filtroScadenzaDa').value = '';
  document.getElementById('filtroScadenzaA').value = '';
  document.getElementById('filtroMacroArea').value = '';
  document.getElementById('filtroStatoPagamento').value = '';
  document.getElementById('filtroServizio').value = '';

  // Reset multi-selects
  document.getElementById('msCorso').resetSelection();
  document.getElementById('msScuola').resetSelection();
  document.getElementById('msScuolaAss').resetSelection();
  document.getElementById('msClasse').resetSelection();

  // Nascondi risultati
  document.getElementById('estrazioniResults').style.display = 'none';
  const emptyDiv = document.getElementById('estrazioniEmpty');
  emptyDiv.style.display = 'block';
  emptyDiv.querySelector('.empty-state-text').textContent = 'Usa i filtri per cercare studenti';
  emptyDiv.querySelector('.empty-state-subtext').textContent = 'Seleziona i criteri e premi "Cerca"';

  estrazioniData = [];
  showToast('Filtri resettati', 'success');
}

// ── Export Estrazioni ──
function exportEstrazioni() {
  if (estrazioniData.length === 0) {
    showToast('Nessun dato da esportare', 'warning');
    return;
  }

  const columns = [
    { header: 'Nome', key: 'nome', width: 16 },
    { header: 'Cognome', key: 'cognome', width: 18 },
    { header: 'Corso di Studi', key: 'corsoStudi', width: 30 },
    { header: 'Scuola', key: 'scuola', width: 30 },
    { header: 'Classe', key: 'classe', width: 14 },
    { header: 'Macro Area', key: 'macroArea', width: 20 },
    { header: 'Pagamento', key: 'pagamento', width: 16 },
    { header: 'Scadenza', key: 'scadenza', width: 16 }
  ];

  exportToExcel(estrazioniData, columns, 'Estrazione_Studenti');
}

// ══════════════════════════════════
// UTILITY
// ══════════════════════════════════
function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(100,100,100,${alpha})`;
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
