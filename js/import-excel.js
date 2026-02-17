// ═══ IMPORT-EXCEL.JS — Logica import lead da Excel ═══

(function () {
  'use strict';

  // Colonne attese nel template
  const COLUMNS = ['Nome', 'Cognome', 'Telefono', 'Email', 'Fonte', 'Note'];
  const REQUIRED = ['Nome', 'Cognome', 'Telefono']; // campi obbligatori

  let parsedRows = [];   // array di oggetti {Nome, Cognome, ...}
  let validRows = [];    // solo quelli validi
  let invalidRows = [];  // indici righe con errore

  // ══════════════════════════════════
  // INIT
  // ══════════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    renderSidebar('lead');

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    // Click sulla drop zone → apri selettore file
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag & drop
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    // Selezione file classica
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) handleFile(file);
    });

    // Scarica template
    document.getElementById('downloadTemplateBtn').addEventListener('click', downloadTemplate);

    // Importa
    document.getElementById('importBtn').addEventListener('click', importLeads);
  });

  // ══════════════════════════════════
  // SCARICA TEMPLATE .XLSX
  // ══════════════════════════════════
  function downloadTemplate() {
    const wsData = [
      COLUMNS,
      ['Mario', 'Rossi', '3331234567', 'mario.rossi@email.com', 'Sito Web', 'Lead di esempio']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Larghezza colonne
    ws['!cols'] = COLUMNS.map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lead');
    XLSX.writeFile(wb, 'Template_Import_Lead.xlsx');

    showToast('Template scaricato!', 'success');
  }

  // ══════════════════════════════════
  // LEGGI FILE EXCEL
  // ══════════════════════════════════
  function handleFile(file) {
    if (!file.name.endsWith('.xlsx')) {
      showToast('Solo file .xlsx sono supportati', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (jsonData.length === 0) {
          showToast('Il file è vuoto', 'warning');
          return;
        }

        parsedRows = jsonData;
        validateAndPreview();
      } catch (err) {
        console.error('Errore lettura Excel:', err);
        showToast('Errore nella lettura del file', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ══════════════════════════════════
  // VALIDA E MOSTRA PREVIEW
  // ══════════════════════════════════
  function validateAndPreview() {
    validRows = [];
    invalidRows = [];

    parsedRows.forEach((row, i) => {
      const nome = String(row['Nome'] || '').trim();
      const cognome = String(row['Cognome'] || '').trim();
      const telefono = String(row['Telefono'] || '').trim();

      if (!nome || !cognome || !telefono) {
        invalidRows.push(i);
      } else {
        validRows.push(row);
      }
    });

    // Mostra sezione preview
    document.getElementById('previewSection').classList.remove('hidden');

    // Summary
    const summary = document.getElementById('previewSummary');
    summary.innerHTML = `
      <span class="valid">${validRows.length} lead validi</span>
      <span class="text-muted">su ${parsedRows.length} totali</span>
      ${invalidRows.length > 0 ? `<span class="invalid">${invalidRows.length} con errori (rosso)</span>` : ''}
    `;

    // Abilita/disabilita bottone import
    document.getElementById('importBtn').disabled = validRows.length === 0;

    // Intestazioni tabella
    const thead = document.getElementById('previewHead');
    const cols = Object.keys(parsedRows[0] || {});
    thead.innerHTML = `<tr><th>#</th>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>`;

    // Righe tabella
    const tbody = document.getElementById('previewBody');
    tbody.innerHTML = parsedRows.map((row, i) => {
      const isError = invalidRows.includes(i);
      return `
        <tr class="${isError ? 'row-error' : ''}">
          <td>${i + 1}</td>
          ${cols.map(c => `<td>${esc(String(row[c] || ''))}</td>`).join('')}
        </tr>
      `;
    }).join('');

    // Scroll alla preview
    document.getElementById('previewSection').scrollIntoView({ behavior: 'smooth' });
  }

  // ══════════════════════════════════
  // IMPORTA LEAD SU FIRESTORE
  // ══════════════════════════════════
  async function importLeads() {
    if (validRows.length === 0) return;

    const btn = document.getElementById('importBtn');
    btn.disabled = true;
    btn.textContent = 'Importazione in corso...';

    try {
      let count = 0;

      // Importa a batch di 20 (limite Firestore: 500 per batch, ma andiamo piano)
      const chunkSize = 20;
      for (let i = 0; i < validRows.length; i += chunkSize) {
        const chunk = validRows.slice(i, i + chunkSize);
        const batch = db.batch();

        for (const row of chunk) {
          const leadRef = db.collection('leads').doc();
          const leadData = {
            nome: String(row['Nome'] || '').trim(),
            cognome: String(row['Cognome'] || '').trim(),
            telefono: String(row['Telefono'] || '').trim(),
            email: String(row['Email'] || '').trim(),
            fonte: String(row['Fonte'] || '').trim(),
            note: String(row['Note'] || '').trim(),
            stato: 'Nuovo',
            dataCreazione: firebase.firestore.FieldValue.serverTimestamp(),
            provincia: '',
            isMinore: false
          };
          batch.set(leadRef, leadData);

          // Storico stati (creazione separata dopo il batch, perché serve sub-collection)
          // Lo facciamo dopo
        }

        await batch.commit();
        count += chunk.length;
      }

      // Ora aggiungi storico per ogni lead importato (best effort)
      // Recupera gli ultimi N lead creati con stato "Nuovo"
      // Alternativa: creiamo lo storico in un secondo giro
      const recentSnap = await db.collection('leads')
        .where('stato', '==', 'Nuovo')
        .orderBy('dataCreazione', 'desc')
        .limit(validRows.length)
        .get();

      for (const doc of recentSnap.docs) {
        try {
          await db.collection('leads').doc(doc.id).collection('storicoStati').add({
            statoPrecedente: '',
            statoNuovo: 'Nuovo',
            data: firebase.firestore.FieldValue.serverTimestamp(),
            origine: 'Import Excel'
          });
        } catch (_) { /* ignora errori singoli */ }
      }

      showToast(`${count} lead importati con successo!`, 'success');

      // Dopo 1.5s vai alla lista lead
      setTimeout(() => {
        window.location.href = 'lead-elenco.html';
      }, 1500);

    } catch (err) {
      console.error('Errore importazione:', err);
      showToast('Errore durante l\'importazione', 'error');
      btn.disabled = false;
      btn.textContent = 'Importa lead validi';
    }
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

})();
