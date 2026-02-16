    // ============================================
    //
    //  MODULO AGENDA CALENDARIO
    //
    // ============================================

    let agendaView = 'month';
    let agendaDate = new Date();
    let agendaAppointments = [];
    let agendaLeads = [];
    let agendaUnsub = null;

    const AG_MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    const AG_DAYS = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];

    async function renderAgendaPage() {
      const myVersion = pageVersion;

      // Carica leads per la ricerca
      try {
        const snap = await getDocs(collection(db, 'leads'));
        if (pageVersion !== myVersion) return;
        agendaLeads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch(e) { console.error('Errore leads agenda:', e); }

      if (pageVersion !== myVersion) return;

      mainContent.innerHTML = `
        <div class="agenda-header">
          <div>
            <h1 class="page-title">Agenda Calendario</h1>
            <p class="page-subtitle">Appuntamenti e richiami</p>
          </div>
          <div class="agenda-controls">
            <div class="agenda-legend">
              <div class="agenda-legend-item"><div class="agenda-legend-dot blue"></div>Nuovo</div>
              <div class="agenda-legend-item"><div class="agenda-legend-dot orange"></div>Richiamo</div>
            </div>
            <div class="agenda-nav">
              <button class="agenda-nav-btn" id="agNavPrev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
              <button class="agenda-today-btn" id="agNavToday">Oggi</button>
              <button class="agenda-nav-btn" id="agNavNext"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
            </div>
            <div class="agenda-period" id="agPeriod"></div>
            <div class="agenda-view-toggle">
              <button class="agenda-view-btn active" data-agview="month">Mese</button>
              <button class="agenda-view-btn" data-agview="week">Settimana</button>
              <button class="agenda-view-btn" data-agview="day">Giorno</button>
            </div>
            <button class="btn btn-primary" style="width:auto;" id="agNewAppt">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nuovo Appuntamento
            </button>
          </div>
        </div>
        <div id="agCalendar"></div>

        <!-- Modal Crea/Modifica -->
        <div class="agenda-modal-overlay" id="agModalCreate">
          <div class="agenda-modal">
            <div class="agenda-modal-hd">
              <h3 id="agModalTitle">Nuovo Appuntamento</h3>
              <button class="agenda-modal-close" onclick="document.getElementById('agModalCreate').classList.remove('open')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="agenda-modal-body">
              <input type="hidden" id="agEditId">
              <div class="ag-form-row">
                <div class="ag-form-group">
                  <label class="ag-form-label">Data *</label>
                  <input type="date" class="form-control" id="agData">
                </div>
                <div class="ag-form-group">
                  <label class="ag-form-label">Ora *</label>
                  <input type="time" class="form-control" id="agOra">
                </div>
              </div>
              <div class="ag-form-row">
                <div class="ag-form-group">
                  <label class="ag-form-label">Tipo *</label>
                  <select class="form-control" id="agTipo">
                    <option value="nuovo">Nuovo Appuntamento</option>
                    <option value="richiamo">Richiamo</option>
                  </select>
                </div>
                <div class="ag-form-group">
                  <label class="ag-form-label">Lead Associato</label>
                  <div class="ag-lead-search">
                    <input type="text" class="form-control" id="agLeadSearch" placeholder="Cerca nome..." autocomplete="off">
                    <input type="hidden" id="agLeadId">
                    <input type="hidden" id="agLeadNome">
                    <input type="hidden" id="agLeadCognome">
                    <div class="ag-lead-results" id="agLeadResults"></div>
                  </div>
                </div>
              </div>
              <div class="ag-form-row full">
                <div class="ag-form-group">
                  <label class="ag-form-label">Descrizione</label>
                  <textarea class="form-control" id="agDescrizione" rows="3" placeholder="Note..."></textarea>
                </div>
              </div>
            </div>
            <div class="agenda-modal-ft">
              <button class="btn btn-secondary" onclick="document.getElementById('agModalCreate').classList.remove('open')">Annulla</button>
              <button class="btn btn-primary" style="background:var(--green);width:auto;" id="agSaveBtn">Salva</button>
            </div>
          </div>
        </div>

        <!-- Modal Dettaglio -->
        <div class="agenda-modal-overlay" id="agModalDetail">
          <div class="agenda-modal">
            <div class="agenda-modal-hd">
              <h3>Dettaglio Appuntamento</h3>
              <button class="agenda-modal-close" onclick="document.getElementById('agModalDetail').classList.remove('open')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="agenda-modal-body" id="agDetailBody"></div>
            <div class="agenda-modal-ft" id="agDetailFt"></div>
          </div>
        </div>
      `;

      if (pageVersion !== myVersion) return;

      // Bind events
      document.getElementById('agNavPrev').addEventListener('click', () => agNavigate(-1));
      document.getElementById('agNavNext').addEventListener('click', () => agNavigate(1));
      document.getElementById('agNavToday').addEventListener('click', () => { agendaDate = new Date(); agRender(); });
      document.getElementById('agNewAppt').addEventListener('click', () => agOpenCreate());
      document.getElementById('agSaveBtn').addEventListener('click', agSaveAppt);

      document.querySelectorAll('.agenda-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          agendaView = btn.dataset.agview;
          document.querySelectorAll('.agenda-view-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          agRender();
        });
      });

      // Lead search
      const agSearchInput = document.getElementById('agLeadSearch');
      const agResultsDiv = document.getElementById('agLeadResults');
      agSearchInput.addEventListener('input', () => {
        const q = agSearchInput.value.toLowerCase().trim();
        if (q.length < 2) { agResultsDiv.classList.remove('show'); return; }
        const matches = agendaLeads.filter(l =>
          (l.nome && l.nome.toLowerCase().includes(q)) ||
          (l.cognome && l.cognome.toLowerCase().includes(q)) ||
          ((l.nome + ' ' + l.cognome).toLowerCase().includes(q))
        ).slice(0, 8);
        if (!matches.length) {
          agResultsDiv.innerHTML = '<div class="ag-lead-result-item" style="color:var(--text-secondary)">Nessun lead trovato</div>';
        } else {
          agResultsDiv.innerHTML = matches.map(l => {
            const initials = ((l.nome||'?')[0] + (l.cognome||'?')[0]).toUpperCase();
            return '<div class="ag-lead-result-item" data-lid="'+l.id+'" data-ln="'+(l.nome||'')+'" data-lc="'+(l.cognome||'')+'">' +
              '<div class="ag-lead-avatar">'+initials+'</div>' +
              (l.nome||'')+' '+(l.cognome||'')+
              (l.telefono ? ' <span style="color:var(--text-secondary);font-size:11px">· '+l.telefono+'</span>' : '') +
              '</div>';
          }).join('');
          agResultsDiv.querySelectorAll('.ag-lead-result-item[data-lid]').forEach(item => {
            item.addEventListener('click', () => {
              document.getElementById('agLeadId').value = item.dataset.lid;
              document.getElementById('agLeadNome').value = item.dataset.ln;
              document.getElementById('agLeadCognome').value = item.dataset.lc;
              agSearchInput.value = (item.dataset.ln + ' ' + item.dataset.lc).trim();
              agResultsDiv.classList.remove('show');
            });
          });
        }
        agResultsDiv.classList.add('show');
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.ag-lead-search')) agResultsDiv.classList.remove('show');
      });

      // Real-time listener appuntamenti
      if (agendaUnsub) agendaUnsub();
      agendaUnsub = onSnapshot(collection(db, 'appuntamenti'), (snap) => {
        if (currentPage !== 'agenda') return;
        agendaAppointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        agRender();
      });

      agRender();
    }

    // ── Navigation ──
    function agNavigate(dir) {
      if (agendaView === 'month') agendaDate.setMonth(agendaDate.getMonth() + dir);
      else if (agendaView === 'week') agendaDate.setDate(agendaDate.getDate() + 7 * dir);
      else agendaDate.setDate(agendaDate.getDate() + dir);
      agRender();
    }

    // ── Render dispatcher ──
    function agRender() {
      agUpdatePeriod();
      var c = document.getElementById('agCalendar');
      if (!c) return;
      if (agendaView === 'month') agRenderMonth(c);
      else if (agendaView === 'week') agRenderWeek(c);
      else agRenderDay(c);
    }

    function agUpdatePeriod() {
      var el = document.getElementById('agPeriod');
      if (!el) return;
      if (agendaView === 'month') {
        el.textContent = AG_MONTHS[agendaDate.getMonth()] + ' ' + agendaDate.getFullYear();
      } else if (agendaView === 'week') {
        var s = agWeekStart(agendaDate), e = new Date(s); e.setDate(e.getDate() + 6);
        el.textContent = s.getDate() + ' ' + AG_MONTHS[s.getMonth()].substring(0,3) + ' – ' + e.getDate() + ' ' + AG_MONTHS[e.getMonth()].substring(0,3) + ' ' + e.getFullYear();
      } else {
        el.textContent = AG_DAYS[agendaDate.getDay()] + ' ' + agendaDate.getDate() + ' ' + AG_MONTHS[agendaDate.getMonth()] + ' ' + agendaDate.getFullYear();
      }
    }

    // ── MONTH ──
    function agRenderMonth(c) {
      var y = agendaDate.getFullYear(), m = agendaDate.getMonth();
      var first = new Date(y, m, 1), last = new Date(y, m+1, 0);
      var startDow = first.getDay() - 1; if (startDow < 0) startDow = 6;
      var todayStr = agFmt(new Date());

      var h = '<div class="cal-card"><div class="cal-weekdays">';
      ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].forEach(function(d){ h += '<div class="cal-weekday">'+d+'</div>'; });
      h += '</div><div class="cal-grid">';

      var prevLast = new Date(y, m, 0);
      for (var i = startDow - 1; i >= 0; i--) {
        var d = prevLast.getDate() - i;
        var ds = agFmt(new Date(y, m-1, d));
        h += '<div class="cal-day other-month" data-date="'+ds+'"><div class="cal-day-num">'+d+'</div><div class="cal-day-events">'+agMonthEvts(ds)+'</div></div>';
      }
      for (var d = 1; d <= last.getDate(); d++) {
        var ds = agFmt(new Date(y, m, d));
        var cls = ds === todayStr ? ' today' : '';
        h += '<div class="cal-day'+cls+'" data-date="'+ds+'"><div class="cal-day-num">'+d+'</div><div class="cal-day-events">'+agMonthEvts(ds)+'</div></div>';
      }
      var total = startDow + last.getDate();
      var rem = total % 7 === 0 ? 0 : 7 - (total % 7);
      for (var d = 1; d <= rem; d++) {
        var ds = agFmt(new Date(y, m+1, d));
        h += '<div class="cal-day other-month" data-date="'+ds+'"><div class="cal-day-num">'+d+'</div><div class="cal-day-events">'+agMonthEvts(ds)+'</div></div>';
      }
      h += '</div></div>';
      c.innerHTML = h;

      // Bind clicks
      c.querySelectorAll('.cal-day').forEach(function(cell) {
        cell.addEventListener('click', function(e) {
          if (e.target.closest('.cal-evt') || e.target.closest('.cal-day-more')) return;
          agendaDate = new Date(cell.dataset.date + 'T00:00:00');
          agendaView = 'day';
          document.querySelectorAll('.agenda-view-btn').forEach(function(b){ b.classList.remove('active'); });
          document.querySelector('[data-agview="day"]').classList.add('active');
          agRender();
        });
      });
      c.querySelectorAll('.cal-evt').forEach(function(evt) {
        evt.addEventListener('click', function(e) { e.stopPropagation(); agOpenDetail(evt.dataset.id); });
      });
      c.querySelectorAll('.cal-day-more').forEach(function(more) {
        more.addEventListener('click', function(e) {
          e.stopPropagation();
          agendaDate = new Date(more.closest('.cal-day').dataset.date + 'T00:00:00');
          agendaView = 'day';
          document.querySelectorAll('.agenda-view-btn').forEach(function(b){ b.classList.remove('active'); });
          document.querySelector('[data-agview="day"]').classList.add('active');
          agRender();
        });
      });
    }

    function agMonthEvts(ds) {
      var list = agendaAppointments.filter(function(a){ return a.data === ds; }).sort(function(a,b){ return (a.ora||'').localeCompare(b.ora||''); });
      if (!list.length) return '';
      var h = '';
      list.slice(0,3).forEach(function(a) {
        var nome = agName(a);
        h += '<div class="cal-evt tipo-'+a.tipo+'" data-id="'+a.id+'" title="'+(a.ora||'')+' - '+nome+'">'+(a.ora ? a.ora.substring(0,5)+' ' : '')+nome+'</div>';
      });
      if (list.length > 3) h += '<div class="cal-day-more">+'+(list.length-3)+' altri</div>';
      return h;
    }

    // ── WEEK ──
    function agRenderWeek(c) {
      var start = agWeekStart(agendaDate);
      var todayStr = agFmt(new Date());
      var hours = agHours();
      var dayNames = ['LUN','MAR','MER','GIO','VEN','SAB','DOM'];

      var h = '<div class="week-wrap"><div class="week-times">';
      hours.forEach(function(hr){ h += '<div class="week-time">'+hr+'</div>'; });
      h += '</div><div class="week-cols">';

      for (var i = 0; i < 7; i++) {
        var day = new Date(start); day.setDate(day.getDate() + i);
        var ds = agFmt(day);
        var isToday = ds === todayStr;
        var dayAppts = agendaAppointments.filter(function(a){ return a.data === ds; });

        h += '<div class="week-col">';
        h += '<div class="week-col-hd'+(isToday ? ' today-hd' : '')+'" data-date="'+ds+'">';
        h += '<div class="week-col-hd-name">'+dayNames[i]+'</div>';
        h += '<div class="week-col-hd-num">'+day.getDate()+'</div></div>';
        h += '<div class="week-slots" data-date="'+ds+'">';
        hours.forEach(function(){ h += '<div class="week-hour-line"></div>'; });
        if (isToday) h += agNowLine();
        dayAppts.forEach(function(a){ h += agWeekEvt(a); });
        h += '</div></div>';
      }
      h += '</div></div>';
      c.innerHTML = h;

      // Bind
      c.querySelectorAll('.week-col-hd').forEach(function(hd) {
        hd.style.cursor = 'pointer';
        hd.addEventListener('click', function() {
          agendaDate = new Date(hd.dataset.date + 'T00:00:00');
          agendaView = 'day';
          document.querySelectorAll('.agenda-view-btn').forEach(function(b){ b.classList.remove('active'); });
          document.querySelector('[data-agview="day"]').classList.add('active');
          agRender();
        });
      });
      c.querySelectorAll('.week-evt').forEach(function(evt) {
        evt.addEventListener('click', function(e) { e.stopPropagation(); agOpenDetail(evt.dataset.id); });
      });
      c.querySelectorAll('.week-slots').forEach(function(slot) {
        slot.addEventListener('click', function(e) {
          if (e.target.closest('.week-evt')) return;
          var rect = slot.getBoundingClientRect();
          var y = e.clientY - rect.top;
          var hour = Math.floor(y / 60) + 7;
          var mins = Math.floor((y % 60) / 15) * 15;
          agOpenCreate(slot.dataset.date, String(hour).padStart(2,'0') + ':' + String(mins).padStart(2,'0'));
        });
      });
    }

    function agWeekEvt(a) {
      if (!a.ora) return '';
      var parts = a.ora.split(':');
      var top = (parseInt(parts[0],10) - 7) * 60 + parseInt(parts[1],10);
      if (top < 0) return '';
      var nome = agName(a);
      var desc = a.descrizione ? '<div class="week-evt-desc">'+a.descrizione.substring(0,25)+'</div>' : '';
      return '<div class="week-evt tipo-'+a.tipo+'" data-id="'+a.id+'" style="top:'+top+'px;min-height:55px">' +
        '<div class="week-evt-time">'+a.ora.substring(0,5)+'</div>' +
        '<div class="week-evt-name">'+nome+'</div>' +
        desc + '</div>';
    }

    // ── DAY ──
    function agRenderDay(c) {
      var ds = agFmt(agendaDate);
      var isToday = ds === agFmt(new Date());
      var hours = agHours();
      var dayAppts = agendaAppointments.filter(function(a){ return a.data === ds; }).sort(function(a,b){ return (a.ora||'').localeCompare(b.ora||''); });

      var h = '<div class="dayv-wrap"><div class="dayv-header">';
      h += AG_DAYS[agendaDate.getDay()] + ' ' + agendaDate.getDate() + ' ' + AG_MONTHS[agendaDate.getMonth()] + ' ' + agendaDate.getFullYear();
      if (dayAppts.length > 0) h += ' &mdash; <span style="color:var(--primary);font-weight:700">' + dayAppts.length + ' appuntament' + (dayAppts.length===1?'o':'i') + '</span>';
      h += '</div><div class="dayv-body"><div class="dayv-times">';
      hours.forEach(function(hr){ h += '<div class="dayv-time-label">'+hr+'</div>'; });
      h += '</div><div class="dayv-content" data-date="'+ds+'">';
      hours.forEach(function(){ h += '<div class="dayv-hour-row"></div>'; });
      if (isToday) h += agNowLine();
      dayAppts.forEach(function(a){ h += agDayEvt(a); });
      h += '</div></div></div>';
      c.innerHTML = h;

      // Bind
      c.querySelectorAll('.dayv-evt').forEach(function(evt) {
        evt.addEventListener('click', function(e) { e.stopPropagation(); agOpenDetail(evt.dataset.id); });
      });
      var content = c.querySelector('.dayv-content');
      if (content) {
        content.addEventListener('click', function(e) {
          if (e.target.closest('.dayv-evt')) return;
          var rect = content.getBoundingClientRect();
          var y = e.clientY - rect.top;
          var hour = Math.floor(y / 60) + 7;
          var mins = Math.floor((y % 60) / 15) * 15;
          agOpenCreate(content.dataset.date, String(hour).padStart(2,'0') + ':' + String(mins).padStart(2,'0'));
        });
      }
    }

    function agDayEvt(a) {
      if (!a.ora) return '';
      var parts = a.ora.split(':');
      var top = (parseInt(parts[0],10) - 7) * 60 + parseInt(parts[1],10);
      if (top < 0) return '';
      var nome = agName(a);
      var tipoLabel = a.tipo === 'richiamo' ? 'Richiamo' : 'Appuntamento';
      return '<div class="dayv-evt tipo-'+a.tipo+'" data-id="'+a.id+'" style="top:'+top+'px;min-height:58px">' +
        '<div class="dayv-evt-time">'+a.ora.substring(0,5)+' &middot; '+tipoLabel+'</div>' +
        '<div class="dayv-evt-name">'+nome+'</div>' +
        '<div class="dayv-evt-desc">'+(a.descrizione ? a.descrizione.substring(0,70) : '')+'</div></div>';
    }

    function agNowLine() {
      var now = new Date();
      var top = (now.getHours() - 7) * 60 + now.getMinutes();
      if (top < 0) return '';
      return '<div class="now-line" style="top:'+top+'px"></div>';
    }

    // ── MODALS ──
    function agOpenCreate(dateStr, ora) {
      document.getElementById('agEditId').value = '';
      document.getElementById('agModalTitle').textContent = 'Nuovo Appuntamento';
      document.getElementById('agData').value = dateStr || agFmt(agendaDate);
      document.getElementById('agOra').value = ora || '09:00';
      document.getElementById('agTipo').value = 'nuovo';
      document.getElementById('agLeadSearch').value = '';
      document.getElementById('agLeadId').value = '';
      document.getElementById('agLeadNome').value = '';
      document.getElementById('agLeadCognome').value = '';
      document.getElementById('agDescrizione').value = '';
      document.getElementById('agModalCreate').classList.add('open');
    }

    function agOpenDetail(id) {
      var a = agendaAppointments.find(function(x){ return x.id === id; });
      if (!a) return;
      var dateObj = new Date(a.data + 'T00:00:00');
      var dateF = dateObj.getDate() + ' ' + AG_MONTHS[dateObj.getMonth()] + ' ' + dateObj.getFullYear();
      var nome = agName(a);

      var body = '';
      body += '<div class="ag-detail-row"><div class="ag-detail-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div><div class="ag-detail-label">Data e ora</div><div class="ag-detail-value">'+dateF+' alle '+(a.ora||'--:--')+'</div></div></div>';
      body += '<div class="ag-detail-row"><div class="ag-detail-icon '+(a.tipo==='richiamo'?'orange':'blue')+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><div class="ag-detail-label">Tipo</div><div class="ag-detail-value"><span class="ag-tipo-badge '+a.tipo+'">'+(a.tipo==='richiamo'?'Richiamo':'Nuovo Appuntamento')+'</span></div></div></div>';
      body += '<div class="ag-detail-row"><div class="ag-detail-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div><div class="ag-detail-label">Lead</div><div class="ag-detail-value">'+(a.leadId ? '<span class="ag-detail-link" data-leadid="'+a.leadId+'">'+nome+'</span>' : nome)+'</div></div></div>';
      if (a.descrizione) {
        body += '<div class="ag-detail-row"><div class="ag-detail-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg></div><div><div class="ag-detail-label">Descrizione</div><div class="ag-detail-value">'+a.descrizione+'</div></div></div>';
      }
      if (a.tipo === 'richiamo' && a.leadId) {
        body += '<div style="margin-top:10px;padding:10px;background:#fef3c7;border-radius:8px;text-align:center"><button class="btn btn-primary" style="background:#f59e0b;width:auto;" data-gotolead="'+a.leadId+'">Vedi Scheda Lead</button></div>';
      }

      document.getElementById('agDetailBody').innerHTML = body;
      document.getElementById('agDetailFt').innerHTML =
        '<button class="btn btn-secondary" onclick="document.getElementById(\'agModalDetail\').classList.remove(\'open\')">Chiudi</button>' +
        '<button class="btn btn-primary" style="width:auto;" data-editid="'+a.id+'">Modifica</button>' +
        '<button class="btn btn-red" style="width:auto;" data-deleteid="'+a.id+'">Elimina</button>';

      // Bind detail actions
      var detailEl = document.getElementById('agDetailBody');
      var footerEl = document.getElementById('agDetailFt');

      detailEl.querySelectorAll('.ag-detail-link').forEach(function(link) {
        link.addEventListener('click', function() {
          document.getElementById('agModalDetail').classList.remove('open');
          openLeadDetail(link.dataset.leadid);
        });
      });
      detailEl.querySelectorAll('[data-gotolead]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          document.getElementById('agModalDetail').classList.remove('open');
          openLeadDetail(btn.dataset.gotolead);
        });
      });
      footerEl.querySelector('[data-editid]').addEventListener('click', function() {
        agEditAppt(this.dataset.editid);
      });
      footerEl.querySelector('[data-deleteid]').addEventListener('click', function() {
        agDeleteAppt(this.dataset.deleteid);
      });

      document.getElementById('agModalDetail').classList.add('open');
    }

    function agEditAppt(id) {
      var a = agendaAppointments.find(function(x){ return x.id === id; });
      if (!a) return;
      document.getElementById('agModalDetail').classList.remove('open');
      setTimeout(function() {
        document.getElementById('agEditId').value = id;
        document.getElementById('agModalTitle').textContent = 'Modifica Appuntamento';
        document.getElementById('agData').value = a.data;
        document.getElementById('agOra').value = a.ora;
        document.getElementById('agTipo').value = a.tipo;
        document.getElementById('agLeadSearch').value = ((a.leadNome||'') + ' ' + (a.leadCognome||'')).trim();
        document.getElementById('agLeadId').value = a.leadId || '';
        document.getElementById('agLeadNome').value = a.leadNome || '';
        document.getElementById('agLeadCognome').value = a.leadCognome || '';
        document.getElementById('agDescrizione').value = a.descrizione || '';
        document.getElementById('agModalCreate').classList.add('open');
      }, 200);
    }

    async function agDeleteAppt(id) {
      if (!confirm('Eliminare questo appuntamento?')) return;
      try {
        await deleteDoc(doc(db, 'appuntamenti', id));
        showToast('Appuntamento eliminato', 'success');
        document.getElementById('agModalDetail').classList.remove('open');
      } catch(e) { showToast('Errore eliminazione', 'error'); }
    }

    async function agSaveAppt() {
      var data = document.getElementById('agData').value;
      var ora = document.getElementById('agOra').value;
      var tipo = document.getElementById('agTipo').value;
      var leadId = document.getElementById('agLeadId').value;
      var leadNome = document.getElementById('agLeadNome').value;
      var leadCognome = document.getElementById('agLeadCognome').value;
      var descrizione = document.getElementById('agDescrizione').value;
      var editId = document.getElementById('agEditId').value;

      if (!data || !ora) { showToast('Inserisci data e ora', 'error'); return; }

      var obj = { data: data, ora: ora, tipo: tipo, leadId: leadId||'', leadNome: leadNome||'', leadCognome: leadCognome||'', descrizione: descrizione||'', completato: false };

      try {
        if (editId) {
          await updateDoc(doc(db, 'appuntamenti', editId), obj);
          showToast('Appuntamento aggiornato!', 'success');
        } else {
          await addDoc(collection(db, 'appuntamenti'), obj);
          showToast('Appuntamento creato!', 'success');
        }
        document.getElementById('agModalCreate').classList.remove('open');
      } catch(e) { console.error(e); showToast('Errore nel salvataggio', 'error'); }
    }

    // ── Helpers ──
    function agName(a) {
      return (a.leadNome || a.leadCognome) ? ((a.leadNome||'')+' '+(a.leadCognome||'')).trim() : 'Senza lead';
    }
    function agFmt(d) {
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }
    function agWeekStart(d) {
      var date = new Date(d); var day = date.getDay();
      var diff = day === 0 ? -6 : 1 - day;
      date.setDate(date.getDate() + diff); date.setHours(0,0,0,0);
      return date;
    }
    function agHours() {
      var h = [];
      for (var i = 7; i <= 21; i++) h.push(String(i).padStart(2,'0') + ':00');
      return h;
    }
