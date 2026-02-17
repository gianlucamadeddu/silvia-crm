// ═══ Impostazioni Module ═══
document.addEventListener('DOMContentLoaded', async () => {

  // ── Stato locale ──
  let config = null;
  let activeSection = 'stati';
  let sortableInstance = null;

  // ── Riferimenti DOM ──
  const tabs = document.querySelectorAll('#settingsTabs .tab-item');
  const listEl = document.getElementById('settingsList');
  const addNameEl = document.getElementById('addName');
  const addColorEl = document.getElementById('addColor');
  const addBtn = document.getElementById('addBtn');

  // ── Mappa sezioni ──
  const SECTIONS = {
    stati:              { label: 'stato',               hasColor: true },
    fonti:              { label: 'fonte',               hasColor: false },
    corsiStudi:         { label: 'corso di studi',      hasColor: false },
    scuole:             { label: 'scuola convenzionata', hasColor: false },
    classi:             { label: 'classe',              hasColor: false },
    scuoleAssegnazione: { label: 'scuola assegnazione', hasColor: false },
    modalitaPagamento:  { label: 'modalità pagamento',  hasColor: false },
    macroAree:          { label: 'macro area',          hasColor: false }
  };

  // ════════════════════════════════════
  // CARICAMENTO
  // ════════════════════════════════════

  async function loadConfig() {
    try {
      config = await loadImpostazioni();
      // Copia profonda per non inquinare la cache di utils
      config = JSON.parse(JSON.stringify(config));
    } catch (err) {
      console.error('Errore caricamento impostazioni:', err);
      config = {};
    }
    // Assicura che ogni sezione esista come array
    Object.keys(SECTIONS).forEach(key => {
      if (!Array.isArray(config[key])) config[key] = [];
    });
  }

  // ════════════════════════════════════
  // SALVATAGGIO
  // ════════════════════════════════════

  async function saveSection(sectionKey) {
    try {
      await db.doc('impostazioni/config').update({
        [sectionKey]: config[sectionKey]
      });
      invalidateImpostazioniCache();
      showToast('Salvato con successo', 'success');
    } catch (err) {
      console.error('Errore salvataggio:', err);
      showToast('Errore durante il salvataggio', 'error');
    }
  }

  // ════════════════════════════════════
  // RENDERING LISTA
  // ════════════════════════════════════

  function renderList() {
    const items = config[activeSection] || [];
    const sectionCfg = SECTIONS[activeSection];

    // Ordina per posizione
    items.sort((a, b) => (a.posizione ?? 0) - (b.posizione ?? 0));

    // Mostra/nascondi color picker
    addColorEl.style.display = sectionCfg.hasColor ? 'block' : 'none';
    addNameEl.placeholder = `Nome nuovo ${sectionCfg.label}...`;
    addNameEl.value = '';

    if (items.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:40px 20px">
          <p class="empty-state-text">Nessun elemento configurato</p>
          <p class="empty-state-subtext">Aggiungi il primo usando il campo qui sotto</p>
        </div>`;
      initSortable();
      return;
    }

    listEl.innerHTML = items.map(item => {
      const isProtected = activeSection === 'stati' && item.eliminabile === false;

      return `
        <div class="imp-item" data-id="${item.id}">
          <div class="imp-item-left">
            <span class="imp-drag" title="Trascina per riordinare">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </span>
            ${sectionCfg.hasColor ? `<span class="imp-color-dot" style="background:${item.colore || '#6366f1'}"></span>` : ''}
            <span class="imp-item-name" data-id="${item.id}">${escapeHtml(item.nome)}</span>
          </div>
          <div class="imp-item-right">
            ${isProtected ? `
              <span class="imp-lock" title="Stato protetto">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
            ` : `
              <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${item.id}" title="Modifica">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn btn-ghost btn-icon imp-btn-del" data-action="delete" data-id="${item.id}" title="Elimina">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </button>
            `}
          </div>
        </div>`;
    }).join('');

    initSortable();
  }

  // ════════════════════════════════════
  // SORTABLE (Drag & Drop)
  // ════════════════════════════════════

  function initSortable() {
    if (sortableInstance) {
      sortableInstance.destroy();
      sortableInstance = null;
    }
    sortableInstance = new Sortable(listEl, {
      handle: '.imp-drag',
      animation: 200,
      ghostClass: 'imp-item-ghost',
      onEnd: async () => {
        const items = config[activeSection];
        const newOrder = [];
        listEl.querySelectorAll('.imp-item').forEach(el => {
          const found = items.find(i => i.id === el.dataset.id);
          if (found) newOrder.push(found);
        });
        newOrder.forEach((item, idx) => { item.posizione = idx; });
        config[activeSection] = newOrder;
        await saveSection(activeSection);
      }
    });
  }

  // ════════════════════════════════════
  // AGGIUNGI
  // ════════════════════════════════════

  async function addItem() {
    const nome = addNameEl.value.trim();
    if (!nome) { addNameEl.focus(); return; }

    const items = config[activeSection];
    const maxPos = items.reduce((max, i) => Math.max(max, i.posizione ?? 0), -1);

    const newItem = {
      id: generateId(),
      nome: nome,
      posizione: maxPos + 1
    };

    if (SECTIONS[activeSection].hasColor) {
      newItem.colore = addColorEl.value || '#6366f1';
      newItem.eliminabile = true;
    }

    items.push(newItem);
    await saveSection(activeSection);
    renderList();
    addNameEl.focus();
  }

  // ════════════════════════════════════
  // MODIFICA INLINE
  // ════════════════════════════════════

  function startEdit(itemId) {
    const items = config[activeSection];
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const nameSpan = listEl.querySelector(`.imp-item-name[data-id="${itemId}"]`);
    if (!nameSpan) return;

    // Campo testo
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input imp-inline-edit';
    input.value = item.nome;

    // Color picker inline (solo per stati)
    let colorInput = null;
    if (SECTIONS[activeSection].hasColor) {
      colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'imp-color-picker imp-inline-color';
      colorInput.value = item.colore || '#6366f1';
      // Inserisci il color picker prima del name span (dopo il dot)
      nameSpan.parentNode.insertBefore(colorInput, nameSpan);
      // Nascondi il dot originale
      const dot = nameSpan.parentNode.querySelector('.imp-color-dot');
      if (dot) dot.style.display = 'none';
    }

    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    let saved = false;
    const doSave = async () => {
      if (saved) return;
      saved = true;
      const newName = input.value.trim();
      let changed = false;
      if (newName && newName !== item.nome) {
        item.nome = newName;
        changed = true;
      }
      if (colorInput && colorInput.value !== item.colore) {
        item.colore = colorInput.value;
        changed = true;
      }
      if (changed) await saveSection(activeSection);
      renderList();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doSave(); }
      if (e.key === 'Escape') { saved = true; renderList(); }
    });

    input.addEventListener('blur', () => {
      setTimeout(doSave, 150);
    });
  }

  // ════════════════════════════════════
  // ELIMINA
  // ════════════════════════════════════

  function deleteItem(itemId) {
    const items = config[activeSection];
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (activeSection === 'stati' && item.eliminabile === false) {
      showToast('Lo stato "Nuovo" non può essere eliminato', 'error');
      return;
    }

    showConfirmModal(`Vuoi davvero eliminare "${item.nome}"?`, async () => {
      config[activeSection] = items.filter(i => i.id !== itemId);
      config[activeSection].forEach((el, idx) => { el.posizione = idx; });
      await saveSection(activeSection);
      renderList();
    });
  }

  // ════════════════════════════════════
  // GESTIONE TAB
  // ════════════════════════════════════

  function switchTab(sectionKey) {
    activeSection = sectionKey;
    tabs.forEach(t => t.classList.toggle('active', t.dataset.section === sectionKey));
    renderList();
  }

  // ════════════════════════════════════
  // EVENT LISTENERS
  // ════════════════════════════════════

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.section));
  });

  addBtn.addEventListener('click', addItem);

  addNameEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem(); }
  });

  // Delegazione click (modifica / elimina)
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const itemId = btn.dataset.id;
    if (action === 'edit') startEdit(itemId);
    if (action === 'delete') deleteItem(itemId);
  });

  // ════════════════════════════════════
  // UTILITY
  // ════════════════════════════════════

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ════════════════════════════════════
  // INIT
  // ════════════════════════════════════

  await loadConfig();
  renderList();

});
