// ═══ LEAD.JS — Logica pagina Lead Elenco ═══

(function () {
  'use strict';

  // ── Stato locale ──
  let allLeads = [];          // tutti i lead dal DB
  let filteredLeads = [];     // dopo filtri
  let selectedIds = new Set();
  let impostazioni = null;
  let currentSort = { field: 'dataCreazione', dir: 'desc' };
  let currentPeriod = { period: 'mese', from: null, to: null };

  // ══════════════════════════════════
  // INIT
  // ══════════════════════════════════
  document.addEventListener('DOMContentLoaded', async () => {
    renderSidebar('lead');

    // Carica impostazioni per dropdown
    impostazioni = await loadImpostazioni();
    populateDropdowns();

    // Filtro periodo
    renderPeriodFilter('periodFilterContainer', onPeriodChange);

    // Eventi
    document.getElementById('filtroFonte').addEventListener('change', applyFilters);
    document.getElementById('filtroStato').addEventListener('change', applyFilters);
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('selectAll').addEventListener('change', onSelectAll);
    document.getElementById('bulkDeleteBtn').addEventListener('click', onBulkDelete);

    // Ordinamento click header
    document.querySelectorAll('#leadTable th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (currentSort.field === field) {
          currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.field = field;
          currentSort.dir = 'asc';
        }
        applyFilters();
      });
    });

    // Carica lead
    loadLeads();
  });

  // ══════════════════════════════════
  // POPOLA DROPDOWN FONTI E STATI
  // ══════════════════════════════════
  function populateDropdowns() {
    const fonteSelect = document.getElementById('filtroFonte');
    const statoSelect = document.getElementById('filtroStato');

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

    if (impostazioni.stati) {
      impostazioni.stati
        .sort((a, b) => (a.posizione || 0) - (b.posizione || 0))
        .forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.nome;
          opt.textContent = s.nome;
          statoSelect.appendChild(opt);
        });
    }
  }

  // ══════════════════════════════════
  // CARICA LEAD DA FIRESTORE
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
  // APPLICA FILTRI + ORDINAMENTO
  // ══════════════════════════════════
  function applyFilters() {
    const fonte = document.getElementById('filtroFonte').value;
    const stato = document.getElementById('filtroStato').value;
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const { from, to } = getDateRange(currentPeriod.period, currentPeriod.from, currentPeriod.to);

    filteredLeads = allLeads.filter(lead => {
      // Filtro periodo
      if (lead.dataCreazione) {
        const d = lead.dataCreazione.toDate ? lead.dataCreazione.toDate() : new Date(lead.dataCreazione);
        if (d < from || d > to) return false;
      } else {
        return false; // se non ha data, escludi
      }

      // Filtro fonte
      if (fonte && lead.fonte !== fonte) return false;

      // Filtro stato
      if (stato && lead.stato !== stato) return false;

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

    // Ordinamento
    filteredLeads.sort((a, b) => {
      let valA = a[currentSort.field] || '';
      let valB = b[currentSort.field] || '';

      // Gestione date
      if (currentSort.field === 'dataCreazione') {
        valA = valA && valA.toDate ? valA.toDate().getTime() : (valA ? new Date(valA).getTime() : 0);
        valB = valB && valB.toDate ? valB.toDate().getTime() : (valB ? new Date(valB).getTime() : 0);
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return currentSort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return currentSort.dir === 'asc' ? 1 : -1;
      return 0;
    });

    // Reset selezione
    selectedIds.clear();
    document.getElementById('selectAll').checked = false;
    updateBulkBar();

    renderTable();
  }

  // ══════════════════════════════════
  // RENDER TABELLA
  // ══════════════════════════════════
  function renderTable() {
    const tbody = document.getElementById('leadTableBody');
    const emptyState = document.getElementById('emptyState');

    if (filteredLeads.length === 0) {
      tbody.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    // Mappa colori stati
    const statiMap = {};
    if (impostazioni && impostazioni.stati) {
      impostazioni.stati.forEach(s => { statiMap[s.nome] = s.colore; });
    }

    tbody.innerHTML = filteredLeads.map(lead => {
      const colore = statiMap[lead.stato] || '#64748b';
      const bgBadge = colore + '20'; // trasparenza
      return `
        <tr data-id="${lead.id}" style="cursor:pointer">
          <td><input type="checkbox" class="checkbox-cell row-check" data-id="${lead.id}" ${selectedIds.has(lead.id) ? 'checked' : ''}></td>
          <td>${esc(lead.nome)}</td>
          <td>${esc(lead.cognome)}</td>
          <td>${esc(lead.telefono)}</td>
          <td>${esc(lead.email || '')}</td>
          <td>${esc(lead.fonte || '')}</td>
          <td><span class="badge" style="background:${bgBadge}; color:${colore}">${esc(lead.stato || '')}</span></td>
          <td>${formatDate(lead.dataCreazione)}</td>
        </tr>
      `;
    }).join('');

    // Click riga → dettaglio
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.type === 'checkbox') return; // non navigare se clicca checkbox
        window.location.href = 'lead-dettaglio.html?id=' + tr.dataset.id;
      });
    });

    // Checkbox singola
    tbody.querySelectorAll('.row-check').forEach(cb => {
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
  // SELEZIONE
  // ══════════════════════════════════
  function onSelectAll(e) {
    const checked = e.target.checked;
    selectedIds.clear();
    if (checked) {
      filteredLeads.forEach(l => selectedIds.add(l.id));
    }
    document.querySelectorAll('.row-check').forEach(cb => { cb.checked = checked; });
    updateBulkBar();
  }

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

  // ══════════════════════════════════
  // ELIMINA SELEZIONATI
  // ══════════════════════════════════
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

          // Elimina anche sotto-collezioni storicoStati (best effort)
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
