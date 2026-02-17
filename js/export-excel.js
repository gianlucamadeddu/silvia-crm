// ═══ EXPORT-EXCEL.JS — Funzioni export Excel con SheetJS ═══

/**
 * Esporta dati in un file .xlsx e lo scarica.
 * @param {Array<Object>} data - Array di oggetti con i dati
 * @param {Array<{header: string, key: string, width?: number}>} columns - Definizione colonne
 * @param {string} filename - Nome file senza estensione
 */
function exportToExcel(data, columns, filename) {
  if (!window.XLSX) {
    showToast('Libreria Excel non caricata', 'error');
    return;
  }

  // Costruisci header
  const headers = columns.map(c => c.header);

  // Costruisci righe
  const rows = data.map(row => {
    return columns.map(col => {
      const val = row[col.key];
      if (val === undefined || val === null) return '';
      return val;
    });
  });

  // Crea worksheet
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Imposta larghezza colonne
  ws['!cols'] = columns.map(col => ({ wch: col.width || 18 }));

  // Crea workbook e scarica
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dati');
  XLSX.writeFile(wb, `${filename}.xlsx`);

  showToast('File Excel scaricato!', 'success');
}
