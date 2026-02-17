// ═══ DASHBOARD.JS — Logica Dashboard ═══

document.addEventListener('DOMContentLoaded', () => {
  // Render sidebar con "dashboard" attivo
  renderSidebar('dashboard');

  // Render filtro periodo nell'header
  renderPeriodFilter('periodContainer', onPeriodChange);
});

// ══════════════════════════════════
// Callback filtro periodo
// ══════════════════════════════════
function onPeriodChange(period, customFrom, customTo) {
  const range = getDateRange(period, customFrom, customTo);
  loadDashboardData(range.from, range.to);
}

// ══════════════════════════════════
// Carica tutti i dati della dashboard
// ══════════════════════════════════
async function loadDashboardData(from, to) {
  try {
    // Carica impostazioni per avere gli stati
    const impostazioni = await loadImpostazioni();

    // ── Query lead nel periodo ──
    const leadsSnap = await db.collection('leads')
      .where('dataCreazione', '>=', from)
      .where('dataCreazione', '<=', to)
      .get();

    const leads = [];
    leadsSnap.forEach(doc => {
      leads.push({ id: doc.id, ...doc.data() });
    });

    // ── Contatore: Lead Totali (nel periodo) ──
    const leadTotali = leads.length;

    // ── Contatore: Nuovi Lead (stato "Nuovo") ──
    const nuoviLead = leads.filter(l => l.stato === 'Nuovo').length;

    // ── Contatore: Iscritti (stato "Iscritto") ──
    const iscritti = leads.filter(l => l.stato === 'Iscritti').length;

    // ── Contatore: Appuntamenti Oggi ──
    const oggi = new Date();
    const oggiInizio = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 0, 0, 0);
    const oggiFine = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 23, 59, 59);

    const appSnap = await db.collection('appuntamenti')
      .where('data', '>=', oggiInizio)
      .where('data', '<=', oggiFine)
      .get();

    const appuntamentiOggi = [];
    appSnap.forEach(doc => {
      appuntamentiOggi.push({ id: doc.id, ...doc.data() });
    });

    // ── Aggiorna contatori ──
    document.getElementById('countLeadTotali').textContent = leadTotali;
    document.getElementById('countAppuntamentiOggi').textContent = appuntamentiOggi.length;
    document.getElementById('countIscritti').textContent = iscritti;
    document.getElementById('countNuoviLead').textContent = nuoviLead;

    // ── Clienti Recenti (ultimi 10 per dataCreazione, dal periodo) ──
    const leadRecenti = leads
      .sort((a, b) => {
        const da = a.dataCreazione?.toDate ? a.dataCreazione.toDate() : new Date(a.dataCreazione);
        const db2 = b.dataCreazione?.toDate ? b.dataCreazione.toDate() : new Date(b.dataCreazione);
        return db2 - da;
      })
      .slice(0, 10);

    renderClientiRecenti(leadRecenti, impostazioni);

    // ── Appuntamenti Oggi (ordinati per ora) ──
    const appOrdinati = appuntamentiOggi.sort((a, b) => {
      const oraA = a.ora || '00:00';
      const oraB = b.ora || '00:00';
      return oraA.localeCompare(oraB);
    });

    renderAppuntamentiOggi(appOrdinati);

  } catch (err) {
    console.error('Errore caricamento dashboard:', err);
    showToast('Errore nel caricamento dei dati', 'error');
  }
}

// ══════════════════════════════════
// Render Clienti Recenti
// ══════════════════════════════════
function renderClientiRecenti(leads, impostazioni) {
  const container = document.getElementById('clientiRecentiList');

  if (leads.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px 20px">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        </div>
        <p class="empty-state-text">Nessun cliente recente</p>
      </div>
    `;
    return;
  }

  // Mappa stati per colore
  const statiMap = {};
  if (impostazioni.stati) {
    impostazioni.stati.forEach(s => {
      statiMap[s.nome] = s.colore;
    });
  }

  container.innerHTML = leads.map(lead => {
    const nome = `${lead.nome || ''} ${lead.cognome || ''}`.trim();
    const fonte = lead.fonte || '—';
    const data = formatDate(lead.dataCreazione);
    const stato = lead.stato || 'Nuovo';
    const colore = statiMap[stato] || '#64748b';

    // Colore pastello per il badge
    const badgeBg = colore + '20'; // 20 = ~12% opacità in hex
    const badgeColor = colore;

    return `
      <div class="dash-list-item" onclick="window.location.href='lead-dettaglio.html?id=${lead.id}'" style="cursor:pointer">
        <div class="dash-list-info">
          <span class="dash-list-name">${nome}</span>
          <span class="dash-list-meta">${fonte} • ${data}</span>
        </div>
        <span class="badge" style="background:${badgeBg};color:${badgeColor}">${stato}</span>
      </div>
    `;
  }).join('');
}

// ══════════════════════════════════
// Render Appuntamenti Oggi
// ══════════════════════════════════
function renderAppuntamentiOggi(appuntamenti) {
  const container = document.getElementById('appuntamentiOggiList');

  if (appuntamenti.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px 20px">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <p class="empty-state-text">Nessun appuntamento oggi</p>
      </div>
    `;
    return;
  }

  container.innerHTML = appuntamenti.map(app => {
    const ora = app.ora || '--:--';
    const nome = `${app.leadNome || ''} ${app.leadCognome || ''}`.trim() || 'Senza nome';
    const tipo = app.tipo || 'nuovo';
    const isNuovo = tipo === 'nuovo';

    const badgeBg = isNuovo ? '#dbeafe' : '#fef3c7';
    const badgeColor = isNuovo ? '#1e40af' : '#a16207';
    const badgeLabel = isNuovo ? 'Nuovo' : 'Richiamo';

    return `
      <div class="dash-list-item" onclick="window.location.href='lead-dettaglio.html?id=${app.leadId}'" style="cursor:pointer">
        <div class="dash-list-info">
          <span class="dash-list-time">${ora}</span>
          <span class="dash-list-name">${nome}</span>
        </div>
        <span class="badge" style="background:${badgeBg};color:${badgeColor}">${badgeLabel}</span>
      </div>
    `;
  }).join('');
}
