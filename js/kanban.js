// ═══ KANBAN.JS — Logica pagina Lead Kanban ═══

(function () {
  'use strict';

  // ── Stato locale ──
  let allLeads = [];
  let filteredLeads = [];
  let selectedIds = new Set();
  let impostazioni = null;
  let currentPeriod = { period: 'mese', from: null, to: null };

  // ══════════════════════════════════
  // INIT
  // ══════════════════════════════════
  document.addEventListener('DOMContentLoaded', async () => {
    renderSidebar('lead');

    impostazioni = await loadImpostazioni();
    populateDropdowns();

    renderPeriodFilter('periodFilterContainer', onPeriodChange);

    document.getElementById('filtroFonte').addEventListener('change', applyFilters);
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('bulkDeleteBtn').addEventListener('click', onBulkDelete);

    loadLeads();
  });

  // ══════════════════════════════════
  // POPOLA DROPDOWN
  // ══════════════════════════════════
  function populateDropdowns() {
    const fonteSelect = document.getElementById('filtroFonte');
    if (impostazioni.fonti) {
      impostazioni.fonti
        .sort((a, b) => (a.posizione || 0) - (b.posizione || 0))
        .forEach(f => {
          const opt = document.createElement('option');
          opt.value = f.nome;
          opt.textContent = f.nome;
          fonteSelect.appendChild(opt);
        });
    }
  }

  // ══════════════════════════════════
  // CARICA LEAD
  // ══════════════════════════════════
  async function loadLeads() {
    try {
      const snapshot = await db.collection('leads').get();
      allLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      applyFilters();
    } catch (err) {
      console.error('Errore caricamento lead:', err);
      showToast('Errore nel caricamento dei lead', 'error');
    }
  }

  // ══════════════════════════════════
  // CALLBACK PERIODO
  // ══════════════════════════════════
  function onPeriodChange(period, from, to) {
    currentPeriod = { period, from, to };
    applyFilters();
  }

  // ══════════════════════════════════
  // APPLICA FILTRI
  // ══════════════════════════════════
  function applyFilters() {
    const fonte = document.getElementById('filtroFonte').value;
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const { from, to } = getDateRange(currentPeriod.period, currentPeriod.from, currentPeriod.to);

    filteredLeads = allLeads.filter(lead => {
      // Periodo
      if (lead.dataCreazione) {
        const d = lead.dataCreazione.toDate ? lead.dataCreazione.toDate() : new Date(lead.dataCreazione);
        if (d < from || d > to) return false;
      } else {
        return false;
      }

      // Fonte
      if (fonte && lead.fonte !== fonte) return false;

      // Ricerca
      if (search) {
        const haystack = [
          lead.nome || '',
          lead.cognome || '',
          lead.telefono || '',
          lead.email || ''
        ].join(' ').toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });

    selectedIds.clear();
    updateBulkBar();
    renderKanban();
  }

  // ══════════════════════════════════
  // RENDER KANBAN
  // ══════════════════════════════════
  function renderKanban() {
    const board = document.getElementById('kanbanBoard');
    const emptyState = document.getElementById('emptyState');

    const stati = (impostazioni.stati || [])
      .slice()
      .sort((a, b) => (a.posizione || 0) - (b.posizione || 0));

    if (stati.length === 0) {
      board.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    // Raggruppa lead per stato
    const grouped = {};
    stati.forEach(s => { grouped[s.nome] = []; });
    filteredLeads.forEach(lead => {
      const stato = lead.stato || 'Nuovo';
      if (grouped[stato]) {
        grouped[stato].push(lead);
      } else {
        // Se lo stato del lead non è più nelle impostazioni, metti in prima colonna
        const prima = stati[0];
        if (prima) grouped[prima.nome].push(lead);
      }
    });

    const totalLeads = filteredLeads.length;
    if (totalLeads === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
    }

    board.innerHTML = stati.map(stato => {
      const leads = grouped[stato.nome] || [];
      const colore = stato.colore || '#64748b';
      return `
        <div class="kanban-column">
          <div class="kanban-header" style="border-bottom-color:${colore}">
            <span class="kanban-header-title" style="color:${colore}">${esc(stato.nome)}</span>
            <span class="kanban-header-count">${leads.length}</span>
          </div>
          <div class="kanban-cards" data-stato="${esc(stato.nome)}" id="col-${stato.id}">
            ${leads.map(lead => renderCard(lead)).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Inizializza SortableJS su ogni colonna
    board.querySelectorAll('.kanban-cards').forEach(container => {
      new Sortable(container, {
        group: 'kanban',
        animation: 200,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: onCardDrop
      });
    });

    // Click card → dettaglio
    board.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.type === 'checkbox') return;
        window.location.href = 'lead-dettaglio.html?id=' + card.dataset.id;
      });
    });

    // Checkbox card
    board.querySelectorAll('.kanban-card-check').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          selectedIds.add(cb.dataset.id);
        } else {
          selectedIds.delete(cb.dataset.id);
        }
        updateBulkBar();
      });
    });
  }

  // ══════════════════════════════════
  // RENDER SINGOLA CARD
  // ══════════════════════════════════
  function renderCard(lead) {
    return `
      <div class="kanban-card" data-id="${lead.id}" style="cursor:pointer">
        <div style="display:flex; align-items:flex-start; gap:8px;">
          <input type="checkbox" class="checkbox-cell kanban-card-check" data-id="${lead.id}" ${selectedIds.has(lead.id) ? 'checked' : ''} style="margin-top:2px">
          <div style="flex:1; min-width:0;">
            <div class="kanban-card-name">${esc(lead.nome)} ${esc(lead.cognome)}</div>
            <div class="kanban-card-info">${esc(lead.telefono || '')}</div>
            <div class="kanban-card-info">${esc(lead.fonte || '')} · ${formatDate(lead.dataCreazione)}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ══════════════════════════════════
  // DRAG & DROP — Cambio stato
  // ══════════════════════════════════
  async function onCardDrop(evt) {
    const cardEl = evt.item;
    const leadId = cardEl.dataset.id;
    const nuovoStato = evt.to.dataset.stato;
    const vecchioStato = evt.from.dataset.stato;

    if (nuovoStato === vecchioStato) return;

    try {
      // 1) Aggiorna stato lead
      await db.collection('leads').doc(leadId).update({ stato: nuovoStato });

      // 2) Aggiungi record nello storico
      await db.collection('leads').doc(leadId).collection('storicoStati').add({
        statoPrecedente: vecchioStato,
        statoNuovo: nuovoStato,
        data: firebase.firestore.FieldValue.serverTimestamp(),
        origine: 'Manuale'
      });

      // 3) Aggiorna contatori nelle intestazioni
      updateColumnCounts();

      // 4) Aggiorna dato locale
      const lead = allLeads.find(l => l.id === leadId);
      if (lead) lead.stato = nuovoStato;
      const fLead = filteredLeads.find(l => l.id === leadId);
      if (fLead) fLead.stato = nuovoStato;

      showToast(`Stato aggiornato a "${nuovoStato}"`, 'success');
    } catch (err) {
      console.error('Errore aggiornamento stato:', err);
      showToast('Errore nell\'aggiornamento dello stato', 'error');
      // Ricarica per ripristinare
      loadLeads();
    }
  }

  // Aggiorna i contatori delle colonne dopo drag
  function updateColumnCounts() {
    document.querySelectorAll('.kanban-cards').forEach(container => {
      const count = container.querySelectorAll('.kanban-card').length;
      const header = container.closest('.kanban-column').querySelector('.kanban-header-count');
      if (header) header.textContent = count;
    });
  }

  // ══════════════════════════════════
  // SELEZIONE E ELIMINA
  // ══════════════════════════════════
  function updateBulkBar() {
    const bar = document.getElementById('bulkBar');
    const count = document.getElementById('bulkCount');
    if (selectedIds.size > 0) {
      bar.classList.remove('hidden');
      bar.style.display = 'flex';
      count.textContent = selectedIds.size + ' selezionat' + (selectedIds.size === 1 ? 'o' : 'i');
    } else {
      bar.classList.add('hidden');
      bar.style.display = '';
    }
  }

  function onBulkDelete() {
    showConfirmModal(
      `Vuoi eliminare ${selectedIds.size} lead? L'azione è irreversibile.`,
      async () => {
        try {
          const batch = db.batch();
          selectedIds.forEach(id => {
            batch.delete(db.collection('leads').doc(id));
          });
          await batch.commit();

          for (const id of selectedIds) {
            try {
              const storicoSnap = await db.collection('leads').doc(id).collection('storicoStati').get();
              const subBatch = db.batch();
              storicoSnap.docs.forEach(d => subBatch.delete(d.ref));
              await subBatch.commit();
            } catch (_) { /* ignora */ }
          }

          showToast(`${selectedIds.size} lead eliminati`, 'success');
          selectedIds.clear();
          updateBulkBar();
          loadLeads();
        } catch (err) {
          console.error('Errore eliminazione:', err);
          showToast('Errore durante l\'eliminazione', 'error');
        }
      }
    );
  }

  // ══════════════════════════════════
  // HELPERS
  // ══════════════════════════════════
  function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

})();
