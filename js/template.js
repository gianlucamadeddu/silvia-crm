// ═══ TEMPLATE.JS — Gestione Template WhatsApp / Email ═══

// ── Dati esempio per anteprima ──
const PREVIEW_DATA = {
  '{NOME}': 'Mario',
  '{COGNOME}': 'Rossi',
  '{NOME_COMPLETO}': 'Mario Rossi',
  '{TELEFONO}': '3331234567',
  '{EMAIL}': 'mario.rossi@email.it',
  '{CORSO_STUDI}': 'Liceo Scientifico',
  '{SCUOLA}': 'KOLBE – NOLA'
};

// ── Stato modulo ──
let templateList = [];
let editingTemplateId = null; // null = nuovo, stringa = modifica

// ══════════════════════════════════
// INIT
// ══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initTemplateModule();
});

async function initTemplateModule() {
  // Bottone nuovo template
  document.getElementById('btnNuovoTemplate').addEventListener('click', () => openModal(null));

  // Chiusura modale
  document.getElementById('modalTemplateClose').addEventListener('click', closeModal);
  document.getElementById('modalTemplateCancelBtn').addEventListener('click', closeModal);
  document.getElementById('modalTemplate').addEventListener('click', (e) => {
    if (e.target.id === 'modalTemplate') closeModal();
  });

  // Salva
  document.getElementById('modalTemplateSaveBtn').addEventListener('click', saveTemplate);

  // Bottoni variabili
  document.querySelectorAll('.tpl-var-btn').forEach(btn => {
    btn.addEventListener('click', () => insertVariable(btn.dataset.var));
  });

  // Anteprima live
  document.getElementById('tplTesto').addEventListener('input', updatePreview);

  // Carica lista
  await loadTemplates();
}

// ══════════════════════════════════
// CARICA TEMPLATE DA FIRESTORE
// ══════════════════════════════════
async function loadTemplates() {
  const pageContent = document.getElementById('pageContent');
  pageContent.innerHTML = '<p class="text-muted text-center" style="padding:40px">Caricamento...</p>';

  try {
    const snapshot = await db.collection('templates').orderBy('dataCreazione', 'desc').get();
    templateList = [];
    snapshot.forEach(doc => {
      templateList.push({ id: doc.id, ...doc.data() });
    });
    renderTemplateList();
  } catch (err) {
    console.error('Errore caricamento templates:', err);
    showToast('Errore nel caricamento dei template', 'error');
  }
}

// ══════════════════════════════════
// RENDER LISTA
// ══════════════════════════════════
function renderTemplateList() {
  const pageContent = document.getElementById('pageContent');

  if (templateList.length === 0) {
    pageContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="64" height="64">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <p class="empty-state-text">Nessun template. Crea il primo!</p>
        <p class="empty-state-subtext">I template ti aiutano a inviare messaggi rapidi via WhatsApp o Email</p>
      </div>`;
    return;
  }

  let html = `
    <div class="card" style="padding:0; overflow:hidden;">
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Data creazione</th>
              <th style="text-align:right">Azioni</th>
            </tr>
          </thead>
          <tbody>`;

  templateList.forEach(tpl => {
    const badgeClass = tpl.tipo === 'WhatsApp'
      ? 'background:#dcfce7;color:#16a34a;'
      : 'background:#dbeafe;color:#1e40af;';

    html += `
            <tr>
              <td style="font-weight:500">${escapeHtml(tpl.nome)}</td>
              <td><span class="badge" style="${badgeClass}">${escapeHtml(tpl.tipo)}</span></td>
              <td class="text-muted text-sm">${formatDate(tpl.dataCreazione)}</td>
              <td style="text-align:right">
                <div style="display:inline-flex;gap:4px;">
                  <button class="btn btn-ghost btn-sm" title="Modifica" onclick="openModal('${tpl.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn btn-ghost btn-sm" title="Duplica" onclick="duplicateTemplate('${tpl.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                  <button class="btn btn-ghost btn-sm" title="Elimina" style="color:#ef4444" onclick="deleteTemplate('${tpl.id}', '${escapeHtml(tpl.nome).replace(/'/g, "\\'")}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </div>
              </td>
            </tr>`;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>`;

  pageContent.innerHTML = html;
}

// ══════════════════════════════════
// APRI MODALE (nuovo o modifica)
// ══════════════════════════════════
function openModal(templateId) {
  editingTemplateId = templateId;

  const titleEl = document.getElementById('modalTemplateTitle');
  const nomeInput = document.getElementById('tplNome');
  const tipoSelect = document.getElementById('tplTipo');
  const testoArea = document.getElementById('tplTesto');

  if (templateId) {
    // Modifica
    const tpl = templateList.find(t => t.id === templateId);
    if (!tpl) return;
    titleEl.textContent = 'Modifica Template';
    nomeInput.value = tpl.nome || '';
    tipoSelect.value = tpl.tipo || 'WhatsApp';
    testoArea.value = tpl.testo || '';
  } else {
    // Nuovo
    titleEl.textContent = 'Nuovo Template';
    nomeInput.value = '';
    tipoSelect.value = 'WhatsApp';
    testoArea.value = '';
  }

  updatePreview();
  document.getElementById('modalTemplate').classList.remove('hidden');
  nomeInput.focus();
}

// ══════════════════════════════════
// CHIUDI MODALE
// ══════════════════════════════════
function closeModal() {
  document.getElementById('modalTemplate').classList.add('hidden');
  editingTemplateId = null;
}

// ══════════════════════════════════
// INSERISCI VARIABILE AL CURSORE
// ══════════════════════════════════
function insertVariable(variable) {
  const textarea = document.getElementById('tplTesto');
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  textarea.value = text.substring(0, start) + variable + text.substring(end);

  // Riposiziona cursore dopo la variabile
  const newPos = start + variable.length;
  textarea.setSelectionRange(newPos, newPos);
  textarea.focus();

  updatePreview();
}

// ══════════════════════════════════
// ANTEPRIMA LIVE
// ══════════════════════════════════
function updatePreview() {
  const testo = document.getElementById('tplTesto').value;
  const previewBox = document.getElementById('tplPreview');

  if (!testo.trim()) {
    previewBox.innerHTML = '<em class="text-muted text-sm">Scrivi qualcosa per vedere l\'anteprima...</em>';
    return;
  }

  let preview = escapeHtml(testo);

  // Sostituisci variabili con valori esempio evidenziati
  Object.entries(PREVIEW_DATA).forEach(([key, value]) => {
    const regex = new RegExp(escapeRegex(key), 'g');
    preview = preview.replace(regex, `<strong style="color:#1e40af">${value}</strong>`);
  });

  // Mantieni a capo
  preview = preview.replace(/\n/g, '<br>');

  previewBox.innerHTML = preview;
}

// ══════════════════════════════════
// SALVA TEMPLATE (crea o aggiorna)
// ══════════════════════════════════
async function saveTemplate() {
  const nome = document.getElementById('tplNome').value.trim();
  const tipo = document.getElementById('tplTipo').value;
  const testo = document.getElementById('tplTesto').value.trim();

  // Validazione
  if (!nome) {
    showToast('Inserisci il nome del template', 'warning');
    document.getElementById('tplNome').focus();
    return;
  }

  const saveBtn = document.getElementById('modalTemplateSaveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Salvataggio...';

  try {
    const data = {
      nome,
      tipo,
      testo,
      dataCreazione: editingTemplateId
        ? (templateList.find(t => t.id === editingTemplateId)?.dataCreazione || firebase.firestore.FieldValue.serverTimestamp())
        : firebase.firestore.FieldValue.serverTimestamp()
    };

    if (editingTemplateId) {
      // Aggiorna esistente (mantieni dataCreazione originale)
      await db.collection('templates').doc(editingTemplateId).update({
        nome,
        tipo,
        testo
      });
      showToast('Template aggiornato');
    } else {
      // Crea nuovo
      await db.collection('templates').add(data);
      showToast('Template creato');
    }

    closeModal();
    await loadTemplates();
  } catch (err) {
    console.error('Errore salvataggio template:', err);
    showToast('Errore nel salvataggio', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Salva';
  }
}

// ══════════════════════════════════
// DUPLICA TEMPLATE
// ══════════════════════════════════
async function duplicateTemplate(templateId) {
  const tpl = templateList.find(t => t.id === templateId);
  if (!tpl) return;

  try {
    await db.collection('templates').add({
      nome: 'Copia di ' + tpl.nome,
      tipo: tpl.tipo,
      testo: tpl.testo,
      dataCreazione: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Template duplicato');
    await loadTemplates();
  } catch (err) {
    console.error('Errore duplicazione:', err);
    showToast('Errore nella duplicazione', 'error');
  }
}

// ══════════════════════════════════
// ELIMINA TEMPLATE
// ══════════════════════════════════
function deleteTemplate(templateId, templateName) {
  showConfirmModal(
    `Sei sicura di voler eliminare il template "<strong>${templateName}</strong>"?`,
    async () => {
      try {
        await db.collection('templates').doc(templateId).delete();
        showToast('Template eliminato');
        await loadTemplates();
      } catch (err) {
        console.error('Errore eliminazione:', err);
        showToast('Errore nell\'eliminazione', 'error');
      }
    }
  );
}

// ══════════════════════════════════
// HELPERS
// ══════════════════════════════════
function escapeHtml(str) {
  if (!str) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return str.replace(/[&<>"']/g, c => map[c]);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
