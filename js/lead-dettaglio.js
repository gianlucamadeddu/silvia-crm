// ═══ LEAD-DETTAGLIO.JS — Anagrafica singolo lead/studente ═══

let currentLeadId = null;
let currentLead = null;
let isNewLead = false;
let impostazioni = null;
let rateCounter = 0;

// ══════════════════════════════════
// INIT
// ══════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  renderSidebar('lead');

  // Carica impostazioni
  impostazioni = await loadImpostazioni();

  // Popola tutti i dropdown
  popolaDropdown();

  // Gestione tab
  initTabs();

  // Gestione checkbox minore
  document.getElementById('fieldIsMinore').addEventListener('change', (e) => {
    document.getElementById('genitoreSection').classList.toggle('visible', e.target.checked);
  });

  // Leggi URL params
  const params = new URLSearchParams(window.location.search);

  if (params.get('new') === 'true') {
    // ── Nuovo lead ──
    isNewLead = true;
    document.getElementById('leadNameHeader').textContent = 'Nuovo Lead';
    document.getElementById('leadStatoBadge').style.display = 'none';
    document.getElementById('fieldDataCreazione').value = formatDateTime(new Date());
    // Nascondi pannello azioni per nuovo lead (tranne salvataggio)
    document.getElementById('actionsPanel').style.display = 'none';
  } else if (params.get('id')) {
    // ── Lead esistente ──
    currentLeadId = params.get('id');
    await caricaLead();
  } else {
    // Nessun parametro → torna alla lista
    window.location.href = 'lead-elenco.html';
  }
});

// ══════════════════════════════════
// TAB NAVIGATION
// ══════════════════════════════════
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-item[data-tab]');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Rimuovi active da tutti
      tabButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      // Attiva il selezionato
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

// ══════════════════════════════════
// POPOLA DROPDOWN DA IMPOSTAZIONI
// ══════════════════════════════════
function popolaDropdown() {
  const cfg = impostazioni;

  // Fonti
  fillSelect('fieldFonte', cfg.fonti || [], 'nome');

  // Macro Aree
  fillSelect('fieldMacroArea', cfg.macroAree || [], 'nome');

  // Corsi di studi
  fillSelect('fieldCorsoStudi', cfg.corsiStudi || [], 'nome');

  // Classi (inserimento)
  fillSelect('fieldInserimentoClasse', cfg.classi || [], 'nome');

  // Scuole assegnazione
  fillSelect('fieldScuolaAssegnazione', cfg.scuoleAssegnazione || [], 'nome');

  // Modalità pagamento
  fillSelect('fieldModalitaPagamento', cfg.modalitaPagamento || [], 'nome');

  // Stati (per azione cambia stato)
  fillSelect('actionCambiaStato', cfg.stati || [], 'nome', true);
}

function fillSelect(selectId, items, labelField, addPlaceholder) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  // Mantieni la prima option placeholder
  const placeholder = sel.querySelector('option[value=""]');
  sel.innerHTML = '';
  if (placeholder) sel.appendChild(placeholder);
  else {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '— Seleziona —';
    sel.appendChild(opt);
  }

  // Ordina per posizione se presente
  const sorted = [...items].sort((a, b) => (a.posizione ?? 999) - (b.posizione ?? 999));
  sorted.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item[labelField] || item.nome;
    opt.textContent = item[labelField] || item.nome;
    sel.appendChild(opt);
  });
}

// ══════════════════════════════════
// CARICA LEAD DA FIRESTORE
// ══════════════════════════════════
async function caricaLead() {
  try {
    const doc = await db.collection('leads').doc(currentLeadId).get();
    if (!doc.exists) {
      showToast('Lead non trovato', 'error');
      setTimeout(() => window.location.href = 'lead-elenco.html', 1500);
      return;
    }

    currentLead = { id: doc.id, ...doc.data() };
    popolaCampi();
    await caricaStorico();
    renderNote();

  } catch (err) {
    console.error('Errore caricamento lead:', err);
    showToast('Errore nel caricamento', 'error');
  }
}

// ══════════════════════════════════
// POPOLA TUTTI I CAMPI DEL FORM
// ══════════════════════════════════
function popolaCampi() {
  const l = currentLead;

  // Header
  const nomeCompleto = `${l.nome || ''} ${l.cognome || ''}`.trim();
  document.getElementById('leadNameHeader').textContent = nomeCompleto || 'Lead senza nome';

  // Badge stato
  if (l.stato) {
    const badge = document.getElementById('leadStatoBadge');
    const statoConfig = (impostazioni.stati || []).find(s => s.nome === l.stato);
    const colore = statoConfig ? statoConfig.colore : '#64748b';
    badge.textContent = l.stato;
    badge.style.display = 'inline-block';
    badge.style.background = colore + '20';
    badge.style.color = colore;

    // Seleziona stato corrente nel dropdown azioni
    const stateSel = document.getElementById('actionCambiaStato');
    if (stateSel) stateSel.value = l.stato;
  }

  // ── Tab Anagrafici ──
  setVal('fieldNome', l.nome);
  setVal('fieldCognome', l.cognome);
  setVal('fieldTelefono', l.telefono);
  setVal('fieldEmail', l.email);
  setVal('fieldProvincia', l.provincia);
  setVal('fieldFonte', l.fonte);
  document.getElementById('fieldDataCreazione').value = l.dataCreazione ? formatDateTime(l.dataCreazione) : '—';

  // Minore + Genitore
  if (l.isMinore) {
    document.getElementById('fieldIsMinore').checked = true;
    document.getElementById('genitoreSection').classList.add('visible');
    if (l.genitore) {
      setVal('fieldGenitoreNome', l.genitore.nome);
      setVal('fieldGenitoreCognome', l.genitore.cognome);
      setVal('fieldGenitoreTelefono', l.genitore.telefono);
      setVal('fieldGenitoreEmail', l.genitore.email);
    }
  }

  // ── Tab Studente ──
  const s = l.studente || {};
  if (s.dataNascita) document.getElementById('fieldDataNascita').value = toInputDate(s.dataNascita);
  setVal('fieldCF', s.codiceFiscale);
  setVal('fieldResidenza', s.residenza);
  setVal('fieldCellulareStudente', s.cellulare);
  setVal('fieldEmailStudente', s.email);
  setVal('fieldScuolaProvenienza', s.scuolaProvenienza);
  if (s.dataRitiroScuola) document.getElementById('fieldDataRitiro').value = toInputDate(s.dataRitiroScuola);
  setVal('fieldMacroArea', s.macroArea);
  setVal('fieldCorsoStudi', s.corsoStudi);
  setVal('fieldServizio', s.servizio);
  setVal('fieldInserimentoClasse', s.inserimentoClasse);
  setVal('fieldPartenze', s.partenzeEffettuate);
  setVal('fieldScuolaAssegnazione', s.scuolaAssegnazione);

  // Classi recupero
  if (s.classiRecupero && Array.isArray(s.classiRecupero)) {
    const checkboxes = document.querySelectorAll('#classiRecuperoGroup input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = s.classiRecupero.includes(cb.value);
    });
  }

  // Calendario scolastico (link)
  if (s.calendarioScolastico) {
    document.getElementById('calendarioLink').innerHTML =
      `<a href="${s.calendarioScolastico}" target="_blank" class="file-link">📄 Visualizza calendario</a>`;
  }

  // ── Tab Pagamenti ──
  const p = l.pagamento || {};
  setVal('fieldModalitaPagamento', p.modalita);
  renderRate(p.rate || []);

  // ── Tab Note ──
  renderNote();
}

// Helper: setta valore di un input/select
function setVal(id, value) {
  const el = document.getElementById(id);
  if (el && value !== undefined && value !== null) el.value = value;
}

// Helper: converte timestamp/stringa in formato yyyy-MM-dd per input[type=date]
function toInputDate(val) {
  if (!val) return '';
  const d = val.toDate ? val.toDate() : new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

// ══════════════════════════════════
// SALVA — TAB DATI ANAGRAFICI
// ══════════════════════════════════
async function salvaAnagrafici() {
  const nome = document.getElementById('fieldNome').value.trim();
  const cognome = document.getElementById('fieldCognome').value.trim();
  const telefono = document.getElementById('fieldTelefono').value.trim();

  if (!nome || !cognome || !telefono) {
    showToast('Nome, Cognome e Telefono sono obbligatori', 'error');
    return;
  }

  const data = {
    nome,
    cognome,
    telefono,
    email: document.getElementById('fieldEmail').value.trim(),
    provincia: document.getElementById('fieldProvincia').value.trim(),
    fonte: document.getElementById('fieldFonte').value,
    isMinore: document.getElementById('fieldIsMinore').checked
  };

  // Genitore
  if (data.isMinore) {
    data.genitore = {
      nome: document.getElementById('fieldGenitoreNome').value.trim(),
      cognome: document.getElementById('fieldGenitoreCognome').value.trim(),
      telefono: document.getElementById('fieldGenitoreTelefono').value.trim(),
      email: document.getElementById('fieldGenitoreEmail').value.trim()
    };
  } else {
    data.genitore = null;
  }

  try {
    if (isNewLead) {
      // Crea nuovo lead
      data.dataCreazione = firebase.firestore.FieldValue.serverTimestamp();
      data.stato = 'Nuovo';
      data.studente = {};
      data.pagamento = { modalita: '', rate: [] };
      data.note = '';

      const docRef = await db.collection('leads').add(data);
      currentLeadId = docRef.id;
      isNewLead = false;

      // Crea primo storico stati
      await db.collection('leads').doc(currentLeadId).collection('storicoStati').add({
        statoPrecedente: '',
        statoNuovo: 'Nuovo',
        data: firebase.firestore.FieldValue.serverTimestamp(),
        origine: 'Creazione lead'
      });

      showToast('Lead creato con successo!', 'success');

      // Redirect alla pagina del lead appena creato
      setTimeout(() => {
        window.location.href = `lead-dettaglio.html?id=${currentLeadId}`;
      }, 800);

    } else {
      await db.collection('leads').doc(currentLeadId).update(data);
      // Aggiorna header
      const nomeCompleto = `${nome} ${cognome}`.trim();
      document.getElementById('leadNameHeader').textContent = nomeCompleto;
      showToast('Dati anagrafici salvati', 'success');
    }
  } catch (err) {
    console.error('Errore salvataggio:', err);
    showToast('Errore nel salvataggio', 'error');
  }
}

// ══════════════════════════════════
// SALVA — TAB DATI STUDENTE
// ══════════════════════════════════
async function salvaStudente() {
  if (!currentLeadId) {
    showToast('Salva prima i dati anagrafici', 'warning');
    return;
  }

  // Classi recupero
  const classiRecupero = [];
  document.querySelectorAll('#classiRecuperoGroup input[type="checkbox"]:checked').forEach(cb => {
    classiRecupero.push(cb.value);
  });

  const studente = {
    dataNascita: document.getElementById('fieldDataNascita').value || null,
    codiceFiscale: document.getElementById('fieldCF').value.trim().toUpperCase(),
    residenza: document.getElementById('fieldResidenza').value.trim(),
    cellulare: document.getElementById('fieldCellulareStudente').value.trim(),
    email: document.getElementById('fieldEmailStudente').value.trim(),
    scuolaProvenienza: document.getElementById('fieldScuolaProvenienza').value.trim(),
    dataRitiroScuola: document.getElementById('fieldDataRitiro').value || null,
    macroArea: document.getElementById('fieldMacroArea').value,
    corsoStudi: document.getElementById('fieldCorsoStudi').value,
    servizio: document.getElementById('fieldServizio').value,
    classiRecupero,
    inserimentoClasse: document.getElementById('fieldInserimentoClasse').value,
    partenzeEffettuate: document.getElementById('fieldPartenze').value.trim(),
    scuolaAssegnazione: document.getElementById('fieldScuolaAssegnazione').value
  };

  // Upload calendario scolastico
  const fileInput = document.getElementById('fieldCalendarioFile');
  if (fileInput.files.length > 0) {
    try {
      const file = fileInput.files[0];
      const path = `calendari/${currentLeadId}/${file.name}`;
      const ref = storage.ref(path);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      studente.calendarioScolastico = url;
    } catch (err) {
      console.error('Errore upload file:', err);
      showToast('Errore upload calendario', 'error');
      return;
    }
  } else {
    // Mantieni il link esistente
    studente.calendarioScolastico = currentLead?.studente?.calendarioScolastico || null;
  }

  try {
    await db.collection('leads').doc(currentLeadId).update({ studente });
    // Aggiorna local
    if (currentLead) currentLead.studente = studente;

    // Aggiorna link calendario
    if (studente.calendarioScolastico) {
      document.getElementById('calendarioLink').innerHTML =
        `<a href="${studente.calendarioScolastico}" target="_blank" class="file-link">📄 Visualizza calendario</a>`;
    }
    fileInput.value = '';

    showToast('Dati studente salvati', 'success');
  } catch (err) {
    console.error('Errore salvataggio studente:', err);
    showToast('Errore nel salvataggio', 'error');
  }
}

// ══════════════════════════════════
// PAGAMENTI — RATE
// ══════════════════════════════════
function renderRate(rate) {
  const tbody = document.getElementById('rateTableBody');
  tbody.innerHTML = '';
  rateCounter = 0;

  if (!rate || rate.length === 0) {
    // Nessuna rata
    calcolaTotale();
    return;
  }

  rate.forEach((r, i) => {
    aggiungiRigaRata(r);
  });
  calcolaTotale();
}

function aggiungiRata() {
  aggiungiRigaRata(null);
}

function aggiungiRigaRata(rataData) {
  rateCounter++;
  const tbody = document.getElementById('rateTableBody');
  const tr = document.createElement('tr');
  tr.dataset.rateIndex = rateCounter;

  const importo = rataData ? rataData.importo : '';
  const dataScad = rataData && rataData.dataScadenza ? toInputDate(rataData.dataScadenza) : '';
  const pagato = rataData ? rataData.pagato : false;

  tr.innerHTML = `
    <td style="font-weight:500;color:#64748b;">${rateCounter}</td>
    <td><input type="number" class="form-input rata-importo" value="${importo}" placeholder="0,00" min="0" step="0.01" onchange="calcolaTotale()"></td>
    <td><input type="date" class="form-input rata-scadenza" value="${dataScad}"></td>
    <td style="text-align:center;"><input type="checkbox" class="rata-pagato" ${pagato ? 'checked' : ''} style="width:18px;height:18px;accent-color:#22c55e;"></td>
    <td style="text-align:center;">
      <button class="btn-ghost btn-sm" onclick="rimuoviRata(this)" title="Rimuovi" style="color:#ef4444;padding:4px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </td>
  `;

  tbody.appendChild(tr);
  calcolaTotale();
}

function rimuoviRata(btn) {
  btn.closest('tr').remove();
  // Rinumera
  const rows = document.querySelectorAll('#rateTableBody tr');
  rows.forEach((tr, i) => {
    tr.querySelector('td:first-child').textContent = i + 1;
  });
  rateCounter = rows.length;
  calcolaTotale();
}

function calcolaTotale() {
  let totale = 0;
  document.querySelectorAll('.rata-importo').forEach(input => {
    totale += parseFloat(input.value) || 0;
  });
  document.getElementById('rateTotale').textContent =
    `€ ${totale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function salvaPagamenti() {
  if (!currentLeadId) {
    showToast('Salva prima i dati anagrafici', 'warning');
    return;
  }

  const rate = [];
  document.querySelectorAll('#rateTableBody tr').forEach(tr => {
    const importo = parseFloat(tr.querySelector('.rata-importo').value) || 0;
    const scadenza = tr.querySelector('.rata-scadenza').value;
    const pagato = tr.querySelector('.rata-pagato').checked;
    rate.push({
      importo,
      dataScadenza: scadenza || null,
      pagato
    });
  });

  const pagamento = {
    modalita: document.getElementById('fieldModalitaPagamento').value,
    rate
  };

  try {
    await db.collection('leads').doc(currentLeadId).update({ pagamento });
    if (currentLead) currentLead.pagamento = pagamento;
    showToast('Pagamenti salvati', 'success');
  } catch (err) {
    console.error('Errore salvataggio pagamenti:', err);
    showToast('Errore nel salvataggio', 'error');
  }
}

// ══════════════════════════════════
// STORICO STATI
// ══════════════════════════════════
async function caricaStorico() {
  if (!currentLeadId) return;

  try {
    const snap = await db.collection('leads').doc(currentLeadId)
      .collection('storicoStati')
      .orderBy('data', 'desc')
      .get();

    const container = document.getElementById('storicoTimeline');

    if (snap.empty) {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px 20px;">
          <p class="empty-state-text">Nessun cambio stato registrato</p>
        </div>`;
      return;
    }

    let html = '<div class="timeline">';
    snap.forEach(doc => {
      const s = doc.data();
      const statoConfig = (impostazioni.stati || []).find(st => st.nome === s.statoNuovo);
      const colore = statoConfig ? statoConfig.colore : '#64748b';

      const prec = s.statoPrecedente || '—';
      const dataStr = s.data ? formatDateTime(s.data) : '—';

      html += `
        <div class="timeline-item">
          <div class="timeline-bar" style="background:${colore};"></div>
          <div class="timeline-date">${dataStr}</div>
          <div class="timeline-content">
            <strong style="color:${colore}">${prec}</strong>
            <span style="color:#94a3b8;margin:0 6px;">→</span>
            <strong style="color:${colore}">${s.statoNuovo}</strong>
            ${s.origine ? `<span style="display:block;font-size:12px;color:#94a3b8;margin-top:2px;">${s.origine}</span>` : ''}
          </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;

  } catch (err) {
    console.error('Errore caricamento storico:', err);
  }
}

// ══════════════════════════════════
// NOTE
// ══════════════════════════════════
function renderNote() {
  const container = document.getElementById('noteList');
  const noteRaw = currentLead?.note || '';

  // Le note sono salvate come stringa JSON array o stringa semplice
  let noteArray = [];
  if (Array.isArray(noteRaw)) {
    noteArray = noteRaw;
  } else if (typeof noteRaw === 'string' && noteRaw.startsWith('[')) {
    try { noteArray = JSON.parse(noteRaw); } catch { noteArray = []; }
  } else if (typeof noteRaw === 'string' && noteRaw.trim()) {
    // Singola nota legacy
    noteArray = [{ testo: noteRaw, data: currentLead.dataCreazione || new Date() }];
  }

  if (noteArray.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px 20px;">
        <p class="empty-state-text">Nessuna nota presente</p>
      </div>`;
    return;
  }

  // Ordina dal più recente
  noteArray.sort((a, b) => {
    const da = a.data?.toDate ? a.data.toDate() : new Date(a.data);
    const db2 = b.data?.toDate ? b.data.toDate() : new Date(b.data);
    return db2 - da;
  });

  container.innerHTML = noteArray.map((n, i) => `
    <div class="note-item">
      <div class="note-item-date">${formatDateTime(n.data)}</div>
      <div class="note-item-text">${escapeHtml(n.testo)}</div>
      <button class="note-item-delete" onclick="eliminaNota(${i})" title="Elimina nota">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');

  // Salva array per riferimento
  currentLead._noteArray = noteArray;
}

async function aggiungiNota() {
  if (!currentLeadId) {
    showToast('Salva prima i dati anagrafici', 'warning');
    return;
  }

  const textarea = document.getElementById('nuovaNotaText');
  const testo = textarea.value.trim();
  if (!testo) {
    showToast('Scrivi una nota prima di aggiungerla', 'warning');
    return;
  }

  // Recupera note esistenti
  let noteArray = currentLead?._noteArray || [];
  if (!Array.isArray(noteArray)) noteArray = [];

  noteArray.push({ testo, data: new Date().toISOString() });

  try {
    await db.collection('leads').doc(currentLeadId).update({
      note: JSON.stringify(noteArray)
    });
    if (currentLead) {
      currentLead.note = JSON.stringify(noteArray);
      currentLead._noteArray = noteArray;
    }
    textarea.value = '';
    renderNote();
    showToast('Nota aggiunta', 'success');
  } catch (err) {
    console.error('Errore aggiunta nota:', err);
    showToast('Errore nel salvataggio', 'error');
  }
}

async function eliminaNota(index) {
  if (!currentLeadId) return;

  let noteArray = currentLead?._noteArray || [];
  if (index < 0 || index >= noteArray.length) return;

  showConfirmModal('Eliminare questa nota?', async () => {
    noteArray.splice(index, 1);
    try {
      await db.collection('leads').doc(currentLeadId).update({
        note: JSON.stringify(noteArray)
      });
      if (currentLead) {
        currentLead.note = JSON.stringify(noteArray);
        currentLead._noteArray = noteArray;
      }
      renderNote();
      showToast('Nota eliminata', 'success');
    } catch (err) {
      console.error('Errore eliminazione nota:', err);
      showToast('Errore', 'error');
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ══════════════════════════════════
// AZIONI — CAMBIA STATO
// ══════════════════════════════════
async function cambiaStato() {
  const select = document.getElementById('actionCambiaStato');
  const nuovoStato = select.value;
  if (!nuovoStato || !currentLeadId) return;

  const statoCorrente = currentLead?.stato || '';
  if (nuovoStato === statoCorrente) return;

  try {
    // Aggiorna stato nel lead
    await db.collection('leads').doc(currentLeadId).update({ stato: nuovoStato });

    // Crea record storico
    await db.collection('leads').doc(currentLeadId).collection('storicoStati').add({
      statoPrecedente: statoCorrente,
      statoNuovo: nuovoStato,
      data: firebase.firestore.FieldValue.serverTimestamp(),
      origine: 'Modifica manuale'
    });

    // Aggiorna locale
    if (currentLead) currentLead.stato = nuovoStato;

    // Aggiorna badge
    const statoConfig = (impostazioni.stati || []).find(s => s.nome === nuovoStato);
    const colore = statoConfig ? statoConfig.colore : '#64748b';
    const badge = document.getElementById('leadStatoBadge');
    badge.textContent = nuovoStato;
    badge.style.display = 'inline-block';
    badge.style.background = colore + '20';
    badge.style.color = colore;

    showToast(`Stato cambiato in "${nuovoStato}"`, 'success');

    // Ricarica storico
    await caricaStorico();

  } catch (err) {
    console.error('Errore cambio stato:', err);
    showToast('Errore nel cambio stato', 'error');
  }
}

// ══════════════════════════════════
// AZIONI — CONTATTO
// ══════════════════════════════════
function getTelefono() {
  return document.getElementById('fieldTelefono').value.trim().replace(/\s+/g, '');
}

function getEmail() {
  return document.getElementById('fieldEmail').value.trim();
}

function apriWhatsApp() {
  const tel = getTelefono();
  if (!tel) { showToast('Nessun numero di telefono', 'warning'); return; }
  // Normalizza: togli + e spazi, aggiungi 39 se non presente
  let num = tel.replace(/[^0-9+]/g, '');
  if (num.startsWith('0')) num = '39' + num.substring(1);
  else if (!num.startsWith('+') && !num.startsWith('39')) num = '39' + num;
  num = num.replace('+', '');
  window.open(`https://wa.me/${num}`, '_blank');
}

function apriEmail() {
  const email = getEmail();
  if (!email) { showToast('Nessuna email', 'warning'); return; }
  window.open(`mailto:${email}`);
}

function apriChiamata() {
  const tel = getTelefono();
  if (!tel) { showToast('Nessun numero di telefono', 'warning'); return; }
  window.open(`tel:${tel}`);
}

// ══════════════════════════════════
// AZIONI — APPUNTAMENTO (modale)
// ══════════════════════════════════
function apriModaleAppuntamento() {
  if (!currentLeadId) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Nuovo Appuntamento</h2>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Data *</label>
            <input type="date" class="form-input" id="appData">
          </div>
          <div class="form-group">
            <label class="form-label">Ora *</label>
            <input type="time" class="form-input" id="appOra">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-select" id="appTipo">
            <option value="nuovo">Nuovo appuntamento</option>
            <option value="richiamo">Richiamo</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Descrizione</label>
          <textarea class="form-textarea" id="appDescrizione" rows="3" placeholder="Note sull'appuntamento..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Annulla</button>
        <button class="btn btn-primary" id="btnSalvaAppuntamento">Salva</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Precompila data odierna
  const oggi = new Date().toISOString().split('T')[0];
  document.getElementById('appData').value = oggi;

  // Gestione click sfondo
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // Salva
  document.getElementById('btnSalvaAppuntamento').addEventListener('click', async () => {
    const data = document.getElementById('appData').value;
    const ora = document.getElementById('appOra').value;
    if (!data || !ora) { showToast('Data e ora sono obbligatori', 'error'); return; }

    try {
      await db.collection('appuntamenti').add({
        leadId: currentLeadId,
        leadNome: currentLead?.nome || '',
        leadCognome: currentLead?.cognome || '',
        data,
        ora,
        tipo: document.getElementById('appTipo').value,
        descrizione: document.getElementById('appDescrizione').value.trim(),
        completato: false
      });
      overlay.remove();
      showToast('Appuntamento creato', 'success');
    } catch (err) {
      console.error('Errore creazione appuntamento:', err);
      showToast('Errore', 'error');
    }
  });
}

// ══════════════════════════════════
// AZIONI — TEMPLATE (modale)
// ══════════════════════════════════
async function apriModaleTemplate() {
  if (!currentLeadId) return;

  // Carica templates
  let templates = [];
  try {
    const snap = await db.collection('templates').orderBy('nome').get();
    snap.forEach(doc => templates.push({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('Errore caricamento template:', err);
  }

  if (templates.length === 0) {
    showToast('Nessun template disponibile. Creane uno dalla pagina Template.', 'warning');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content modal-lg">
      <div class="modal-header">
        <h2>Usa Template</h2>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Seleziona template</label>
          <select class="form-select" id="templateSelect">
            <option value="">— Seleziona —</option>
            ${templates.map(t => `<option value="${t.id}">${t.nome} (${t.tipo})</option>`).join('')}
          </select>
        </div>
        <div id="templatePreview" style="display:none;">
          <label class="form-label">Anteprima</label>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:14px;white-space:pre-wrap;line-height:1.6;max-height:300px;overflow-y:auto;" id="templatePreviewText"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Chiudi</button>
        <button class="btn btn-whatsapp" id="btnTemplateWhatsApp" style="display:none;">Invia via WhatsApp</button>
        <button class="btn btn-primary" id="btnTemplateEmail" style="display:none;">Invia via Email</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  const selectEl = document.getElementById('templateSelect');
  const previewDiv = document.getElementById('templatePreview');
  const previewText = document.getElementById('templatePreviewText');
  const btnWA = document.getElementById('btnTemplateWhatsApp');
  const btnEmail = document.getElementById('btnTemplateEmail');

  selectEl.addEventListener('change', () => {
    const tmplId = selectEl.value;
    if (!tmplId) {
      previewDiv.style.display = 'none';
      btnWA.style.display = 'none';
      btnEmail.style.display = 'none';
      return;
    }

    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) return;

    // Compila variabili
    const testo = compilaTemplate(tmpl.testo);
    previewText.textContent = testo;
    previewDiv.style.display = 'block';

    // Mostra pulsanti in base al tipo
    if (tmpl.tipo === 'WhatsApp') {
      btnWA.style.display = 'inline-flex';
      btnEmail.style.display = 'none';
    } else if (tmpl.tipo === 'Email') {
      btnWA.style.display = 'none';
      btnEmail.style.display = 'inline-flex';
    } else {
      btnWA.style.display = 'inline-flex';
      btnEmail.style.display = 'inline-flex';
    }
  });

  // Invia WhatsApp
  btnWA.addEventListener('click', () => {
    const tel = getTelefono();
    if (!tel) { showToast('Nessun numero di telefono', 'warning'); return; }
    const testo = previewText.textContent;
    let num = tel.replace(/[^0-9+]/g, '');
    if (num.startsWith('0')) num = '39' + num.substring(1);
    else if (!num.startsWith('+') && !num.startsWith('39')) num = '39' + num;
    num = num.replace('+', '');
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(testo)}`, '_blank');
    overlay.remove();
  });

  // Invia Email
  btnEmail.addEventListener('click', () => {
    const email = getEmail();
    if (!email) { showToast('Nessuna email', 'warning'); return; }
    const testo = previewText.textContent;
    window.open(`mailto:${email}?body=${encodeURIComponent(testo)}`);
    overlay.remove();
  });
}

function compilaTemplate(testo) {
  if (!testo) return '';
  const l = currentLead || {};
  const s = l.studente || {};

  return testo
    .replace(/\{NOME\}/g, l.nome || '')
    .replace(/\{COGNOME\}/g, l.cognome || '')
    .replace(/\{NOME_COMPLETO\}/g, `${l.nome || ''} ${l.cognome || ''}`.trim())
    .replace(/\{TELEFONO\}/g, l.telefono || '')
    .replace(/\{EMAIL\}/g, l.email || '')
    .replace(/\{CORSO_STUDI\}/g, s.corsoStudi || '')
    .replace(/\{SCUOLA\}/g, s.scuolaAssegnazione || '');
}

// ══════════════════════════════════
// AZIONI — ELIMINA LEAD
// ══════════════════════════════════
function eliminaLead() {
  if (!currentLeadId) return;

  showConfirmModal('Sei sicura di voler eliminare questo lead? L\'operazione è irreversibile.', async () => {
    try {
      // Elimina sotto-collezione storicoStati
      const storicoSnap = await db.collection('leads').doc(currentLeadId)
        .collection('storicoStati').get();
      const batch = db.batch();
      storicoSnap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      // Elimina lead
      await db.collection('leads').doc(currentLeadId).delete();

      showToast('Lead eliminato', 'success');
      setTimeout(() => window.location.href = 'lead-elenco.html', 1000);

    } catch (err) {
      console.error('Errore eliminazione:', err);
      showToast('Errore nell\'eliminazione', 'error');
    }
  });
}
