window.App = (function () {

  let currentSection = 'dashboard';
  let transactionMode = 'expense'; // 'expense' | 'income'
  let confirmCallback = null;
  let editingId = null;
  let editingType = null; // 'expense' | 'income'

  // ── INIT ──────────────────────────────────────────────────

  function init() {
    const state = Storage.load();
    if (!state.families || state.families.length < 2 || !state.families[0].name) {
      showSetup();
    } else {
      showApp();
      navigateTo('dashboard');
    }
    updateHeaderTripName();
    bindGlobalEvents();
  }

  // ── SETUP ─────────────────────────────────────────────────

  function showSetup() {
    document.getElementById('setup-overlay').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }

  function showApp() {
    document.getElementById('setup-overlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  }

  function saveSetup() {
    const f1name = document.getElementById('setup-f1-name').value.trim();
    const f1members = document.getElementById('setup-f1-members').value.trim();
    const f2name = document.getElementById('setup-f2-name').value.trim();
    const f2members = document.getElementById('setup-f2-members').value.trim();

    if (!f1name || !f2name) {
      alert('Podaj nazwy obu rodzin.');
      return;
    }

    const parseMem = str => str ? str.split(',').map(s => s.trim()).filter(Boolean) : ['Osoba'];
    const state = Storage.load();
    state.families = [
      { id: 'f1', name: f1name, members: parseMem(f1members) },
      { id: 'f2', name: f2name, members: parseMem(f2members) },
    ];
    Storage.save(state);
    showApp();
    navigateTo('dashboard');
  }

  // ── ROUTING ───────────────────────────────────────────────

  function navigateTo(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const section = document.getElementById('section-' + sectionId);
    if (section) section.classList.add('active');
    const btn = document.querySelector('[data-section="' + sectionId + '"]');
    if (btn) btn.classList.add('active');
    currentSection = sectionId;

    if (sectionId === 'dashboard')  renderDashboard();
    if (sectionId === 'expenses')   renderTransactionList();
    if (sectionId === 'settlement') renderSettlement();
    if (sectionId === 'stats')      Charts.renderAll();
    if (sectionId === 'settings')   renderSettings();
  }

  // ── DASHBOARD ─────────────────────────────────────────────

  function renderDashboard() {
    const s = Expenses.calculateSettlement();
    const state = Storage.load();

    // Update header
    document.getElementById('header-total').textContent = formatCurrency(s.expenseTotal);

    // Stat cards
    const grid = document.getElementById('dashboard-cards');
    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Łączne wydatki</div>
        <div class="stat-amount">${formatCurrency(s.expenseTotal)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Łączne wpływy</div>
        <div class="stat-amount income-color">${formatCurrency(s.incomeTotal)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Do rozliczenia</div>
        <div class="stat-amount ${s.netTotal < 0 ? 'income-color' : ''}">${formatCurrency(Math.abs(s.netTotal))}</div>
      </div>
    `;

    // Family cards
    const famCards = document.getElementById('dashboard-families');
    famCards.innerHTML = s.families.map(f => `
      <div class="stat-card">
        <div class="stat-label">${escHtml(f.name)}</div>
        <div class="stat-amount">${formatCurrency(f.paid)}</div>
        <div class="stat-sub">wpłynęło: ${formatCurrency(f.received)}</div>
      </div>
    `).join('');

    // Settlement banner
    const banner = document.getElementById('dashboard-banner');
    if (s.debtor) {
      banner.innerHTML = `<div class="settlement-banner debt">
        ⚖️ <strong>${escHtml(s.debtor.familyName)}</strong> musi przelać <strong>${formatCurrency(s.debtor.owes)}</strong> rodzinie <strong>${escHtml(s.debtor.toFamily)}</strong>
      </div>`;
    } else if (s.expenseTotal > 0) {
      banner.innerHTML = `<div class="settlement-banner balanced">✅ Wszystko rozliczone – żadna rodzina nie jest winna!</div>`;
    } else {
      banner.innerHTML = `<div class="settlement-banner empty">Brak wydatków — dodaj pierwszy wydatek przyciskiem poniżej.</div>`;
    }

    // Recent transactions
    const recentContainer = document.getElementById('dashboard-recent');
    const recent = Expenses.getExpenses().slice(0, 5);
    if (recent.length === 0) {
      recentContainer.innerHTML = '<p class="empty-state">Brak wydatków.</p>';
    } else {
      recentContainer.innerHTML = '<div class="transaction-list">' + renderTransactionItems(recent, 'expense') + '</div>';
    }
  }

  // ── TRANSACTIONS LIST ─────────────────────────────────────

  function renderTransactionList() {
    // Update mode toggle UI
    document.querySelectorAll('.mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === transactionMode);
    });

    const state = Storage.load();
    const filters = getActiveFilters();
    const container = document.getElementById('transaction-list');
    const filterFamily = document.getElementById('filter-family');

    // Populate family filter options
    filterFamily.innerHTML = '<option value="">Wszystkie rodziny</option>' +
      state.families.map(f => `<option value="${f.id}">${escHtml(f.name)}</option>`).join('');

    if (transactionMode === 'expense') {
      const cats = document.getElementById('filter-category');
      cats.innerHTML = '<option value="">Wszystkie kategorie</option>' +
        Expenses.EXPENSE_CATEGORIES.map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join('');

      const items = Expenses.getExpenses(filters);
      if (items.length === 0) {
        container.innerHTML = '<p class="empty-state">Brak wydatków. Dodaj pierwszy klikając +</p>';
      } else {
        container.innerHTML = '<div class="transaction-list">' + renderTransactionItems(items, 'expense') + '</div>';
      }
    } else {
      const cats = document.getElementById('filter-category');
      cats.innerHTML = '<option value="">Wszystkie kategorie</option>' +
        Expenses.INCOME_CATEGORIES.map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join('');

      const incomeFilters = {
        category: filters.category,
        familyId: filters.familyId,
        search: filters.search,
      };
      const items = Expenses.getIncomes(incomeFilters);
      if (items.length === 0) {
        container.innerHTML = '<p class="empty-state">Brak wpływów. Dodaj pierwszy klikając +</p>';
      } else {
        container.innerHTML = '<div class="transaction-list">' + renderTransactionItems(items, 'income') + '</div>';
      }
    }
  }

  function renderTransactionItems(items, type) {
    const state = Storage.load();
    return items.map(item => {
      const catInfo = type === 'expense'
        ? Expenses.getExpenseCategory(item.category)
        : Expenses.getIncomeCategory(item.category);
      const familyId   = type === 'expense' ? item.paidByFamily : item.receivedByFamily;
      const personName = type === 'expense' ? item.paidByPerson : item.receivedByPerson;
      const family = state.families.find(f => f.id === familyId);
      const familyName = family ? family.name : '?';
      const sign = type === 'income' ? '+' : '-';
      const amountClass = type === 'income' ? 'income-color' : 'expense-color';
      const isEur = item.currency === 'EUR';
      const amountDisplay = isEur
        ? `${sign}${formatEur(item.amount)} <span class="pln-equiv">(≈ ${formatCurrency(item.amountPLN)})</span>`
        : `${sign}${formatCurrency(item.amountPLN)}`;

      return `<div class="transaction-item" data-id="${item.id}" data-type="${type}">
        <div class="cat-badge" style="background:${catInfo.color}20;color:${catInfo.color}">${catInfo.emoji}</div>
        <div class="transaction-info">
          <div class="transaction-desc">${escHtml(item.description)}</div>
          <div class="transaction-meta">${formatDate(item.date)} · ${escHtml(personName)} (${escHtml(familyName)})</div>
        </div>
        <div class="transaction-right">
          <div class="transaction-amount ${amountClass}">${amountDisplay}</div>
          <div class="transaction-actions">
            <button class="btn-icon" data-action="edit" data-id="${item.id}" data-entry-type="${type}" title="Edytuj">✏️</button>
            <button class="btn-icon btn-icon-danger" data-action="delete" data-id="${item.id}" data-entry-type="${type}" title="Usuń">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function getActiveFilters() {
    return {
      category: (document.getElementById('filter-category') || {}).value || null,
      familyId: (document.getElementById('filter-family') || {}).value || null,
      search: ((document.getElementById('filter-search') || {}).value || '').trim() || null,
    };
  }

  // ── SETTLEMENT ────────────────────────────────────────────

  function renderSettlement() {
    const s = Expenses.calculateSettlement();
    const state = Storage.load();

    // Split ratio inputs
    document.getElementById('ratio-f1-val').textContent = state.settings.splitRatio[0] + '%';
    document.getElementById('ratio-f2-val').textContent = state.settings.splitRatio[1] + '%';
    document.getElementById('ratio-slider').value = state.settings.splitRatio[0];

    // Family labels
    if (state.families[0]) document.getElementById('ratio-f1-name').textContent = state.families[0].name;
    if (state.families[1]) document.getElementById('ratio-f2-name').textContent = state.families[1].name;

    // Summary numbers
    document.getElementById('sett-expense-total').textContent = formatCurrency(s.expenseTotal);
    document.getElementById('sett-income-total').textContent  = formatCurrency(s.incomeTotal);
    document.getElementById('sett-net-total').textContent     = formatCurrency(s.netTotal);

    // Result banner
    const banner = document.getElementById('settlement-banner');
    if (s.debtor) {
      banner.className = 'settlement-result debt';
      banner.innerHTML = `<div class="sett-icon">⚖️</div>
        <div class="sett-text"><strong>${escHtml(s.debtor.familyName)}</strong> powinna przelać</div>
        <div class="sett-amount">${formatCurrency(s.debtor.owes)}</div>
        <div class="sett-text">rodzinie <strong>${escHtml(s.debtor.toFamily)}</strong></div>`;
    } else if (s.expenseTotal > 0) {
      banner.className = 'settlement-result balanced';
      banner.innerHTML = `<div class="sett-icon">✅</div><div class="sett-text">Wszystko rozliczone!</div>`;
    } else {
      banner.className = 'settlement-result empty';
      banner.innerHTML = `<div class="sett-icon">📋</div><div class="sett-text">Brak wydatków do rozliczenia.</div>`;
    }

    // Per-family table
    const tbody = document.getElementById('sett-table-body');
    tbody.innerHTML = s.families.map(f => `
      <tr>
        <td><strong>${escHtml(f.name)}</strong></td>
        <td>${formatCurrency(f.paid)}</td>
        <td>${formatCurrency(f.received)}</td>
        <td>${formatCurrency(f.fairShare)}</td>
        <td class="${f.balance >= 0 ? 'income-color' : 'expense-color'}">
          ${f.balance >= 0 ? '+' : ''}${formatCurrency(f.balance)}
        </td>
      </tr>
    `).join('');

    renderPartialPayments();
  }

  function renderPartialPayments() {
    const state = Storage.load();
    const transfers = state.expenses.filter(e => e.category === 'transfer');
    const container = document.getElementById('partial-payments-list');
    if (transfers.length === 0) { container.innerHTML = ''; return; }

    const familyName = id => (state.families.find(f => f.id === id) || {}).name || id;
    // For each transfer expense, find the matching income to get receiver name
    const rows = transfers.map(t => {
      const matchIncome = state.incomes.find(i =>
        i.category === 'transfer' && i.date === t.date && Math.abs(i.amountPLN - t.amountPLN) < 0.01
      );
      const toName = matchIncome ? familyName(matchIncome.receivedByFamily) : '?';
      const amtDisplay = t.currency === 'EUR' ? formatEur(t.amount) : formatCurrency(t.amountPLN);
      return `
        <div class="transaction-item">
          <div class="cat-badge" style="background:#A855F720;color:#A855F7">🔄</div>
          <div class="transaction-info">
            <div class="transaction-desc">${escHtml(familyName(t.paidByFamily))} → ${escHtml(toName)}</div>
            <div class="transaction-meta">${formatDate(t.date)}</div>
          </div>
          <div class="transaction-right">
            <div class="transaction-amount">${amtDisplay}</div>
            <div class="transaction-actions">
              <button class="btn-icon btn-icon-danger" data-action="delete-transfer-pair"
                data-date="${t.date}" data-amount="${t.amountPLN}" title="Usuń">🗑️</button>
            </div>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="card mt-md">
        <div class="section-header"><h3>Częściowe zwroty</h3></div>
        ${rows}
      </div>`;
  }

  // ── TRANSFER MODAL ────────────────────────────────────────

  function openTransferModal() {
    const state = Storage.load();
    const famSel = document.getElementById('tr-from-family');
    famSel.innerHTML = state.families.map(f => `<option value="${f.id}">${escHtml(f.name)}</option>`).join('');
    document.getElementById('tr-amount').value = '';
    document.getElementById('tr-currency').value = 'PLN';
    document.getElementById('tr-rate-group').style.display = 'none';
    document.getElementById('tr-exchange-rate').value = state.settings.defaultEurRate || 4.25;
    document.getElementById('tr-date').value = todayISO();
    document.getElementById('tr-error').textContent = '';
    showModal('transfer-modal');
  }

  function handleTransferFormSubmit(e) {
    e.preventDefault();
    const state = Storage.load();
    const fromFamilyId = document.getElementById('tr-from-family').value;
    const amount = parseFloat(document.getElementById('tr-amount').value);
    const currency = document.getElementById('tr-currency').value;
    const exchangeRate = currency === 'EUR' ? (parseFloat(document.getElementById('tr-exchange-rate').value) || 1) : 1.0;
    const amountPLN = amount * exchangeRate;
    const date = document.getElementById('tr-date').value;
    const errEl = document.getElementById('tr-error');

    if (!amount || amount <= 0) { errEl.textContent = 'Podaj poprawną kwotę.'; return; }
    if (!date) { errEl.textContent = 'Podaj datę.'; return; }

    const toFamily = state.families.find(f => f.id !== fromFamilyId);
    const fromFamily = state.families.find(f => f.id === fromFamilyId);
    if (!toFamily) { errEl.textContent = 'Brak drugiej rodziny.'; return; }

    const desc = `Zwrot: ${fromFamily.name} → ${toFamily.name}`;

    // Expense for the paying family (reduces their surplus / covers their debt)
    Expenses.addExpense({
      description: desc, amount, currency, exchangeRate, amountPLN,
      category: 'transfer', paidByFamily: fromFamilyId,
      paidByPerson: fromFamily.members[0] || '', date,
    });
    // Income for the receiving family (mirrors the payment)
    Expenses.addIncome({
      description: desc, amount, currency, exchangeRate, amountPLN,
      category: 'transfer', receivedByFamily: toFamily.id,
      receivedByPerson: toFamily.members[0] || '', date,
    });

    closeModal('transfer-modal');
    renderSettlement();
    showToast('Częściowy zwrot zapisany.');
  }

  function handleSliderChange(val) {
    const state = Storage.load();
    const v = parseInt(val, 10);
    state.settings.splitRatio = [v, 100 - v];
    Storage.save(state);
    renderSettlement();
  }

  // ── MODAL ─────────────────────────────────────────────────

  function openAddModal() {
    editingId = null;
    editingType = transactionMode;
    populateModal(transactionMode, null);
    document.getElementById('modal-title').textContent = transactionMode === 'expense' ? 'Dodaj wydatek' : 'Dodaj wpływ';
    showModal('expense-modal');
  }

  function openEditModal(id, type) {
    editingId = id;
    editingType = type;
    const item = type === 'expense'
      ? Expenses.getExpenses().find(e => e.id === id)
      : Expenses.getIncomes().find(i => i.id === id);
    if (!item) return;
    populateModal(type, item);
    document.getElementById('modal-title').textContent = type === 'expense' ? 'Edytuj wydatek' : 'Edytuj wpływ';
    showModal('expense-modal');
  }

  function toggleRateGroup(currency) {
    document.getElementById('f-rate-group').style.display = currency === 'EUR' ? '' : 'none';
  }

  function updatePlnPreview() {
    const amount = parseFloat(document.getElementById('f-amount').value) || 0;
    const rate   = parseFloat(document.getElementById('f-exchange-rate').value) || 0;
    document.getElementById('f-pln-preview').textContent = '= ' + formatCurrency(amount * rate);
  }

  function populateModal(type, item) {
    const state = Storage.load();
    const isExpense = type === 'expense';

    // Category select
    const catSelect = document.getElementById('f-category');
    const cats = isExpense ? Expenses.EXPENSE_CATEGORIES : Expenses.INCOME_CATEGORIES;
    catSelect.innerHTML = cats.map(c => `<option value="${c.id}">${c.emoji} ${c.label}</option>`).join('');

    // Person/family label
    document.getElementById('f-person-label').textContent = isExpense ? 'Kto zapłacił (osoba)' : 'Kto otrzymał (osoba)';
    document.getElementById('f-family-label').textContent = isExpense ? 'Kto zapłacił (rodzina)' : 'Kto otrzymał (rodzina)';

    // Family select
    const famSelect = document.getElementById('f-family');
    famSelect.innerHTML = state.families.map(f => `<option value="${f.id}">${escHtml(f.name)}</option>`).join('');

    if (item) {
      document.getElementById('f-description').value = item.description;
      document.getElementById('f-amount').value = item.amount;
      catSelect.value = item.category;
      const famId = isExpense ? item.paidByFamily : item.receivedByFamily;
      famSelect.value = famId;
      populatePersonSelect(famId);
      const personId = isExpense ? item.paidByPerson : item.receivedByPerson;
      document.getElementById('f-person').value = personId;
      document.getElementById('f-date').value = item.date;
      document.getElementById('f-currency').value = item.currency || 'PLN';
      document.getElementById('f-exchange-rate').value = item.exchangeRate || state.settings.defaultEurRate || 4.25;
      toggleRateGroup(item.currency || 'PLN');
    } else {
      document.getElementById('f-description').value = '';
      document.getElementById('f-amount').value = '';
      catSelect.value = cats[0].id;
      famSelect.value = state.families[0] ? state.families[0].id : '';
      populatePersonSelect(state.families[0] ? state.families[0].id : '');
      document.getElementById('f-date').value = todayISO();
      document.getElementById('f-currency').value = 'PLN';
      document.getElementById('f-exchange-rate').value = state.settings.defaultEurRate || 4.25;
      toggleRateGroup('PLN');
    }
    document.getElementById('f-error').textContent = '';
    updatePlnPreview();
  }

  function populatePersonSelect(familyId) {
    const state = Storage.load();
    const family = state.families.find(f => f.id === familyId);
    const select = document.getElementById('f-person');
    select.innerHTML = family
      ? family.members.map(m => `<option value="${escHtml(m)}">${escHtml(m)}</option>`).join('')
      : '<option>—</option>';
  }

  function handleExpenseFormSubmit(e) {
    e.preventDefault();
    const desc = document.getElementById('f-description').value.trim();
    const amount = parseFloat(document.getElementById('f-amount').value);
    const category = document.getElementById('f-category').value;
    const familyId = document.getElementById('f-family').value;
    const person = document.getElementById('f-person').value;
    const date = document.getElementById('f-date').value;
    const errEl = document.getElementById('f-error');

    const currency = document.getElementById('f-currency').value;
    const exchangeRate = currency === 'EUR'
      ? (parseFloat(document.getElementById('f-exchange-rate').value) || 1)
      : 1.0;
    const amountPLN = amount * exchangeRate;

    if (!desc) { errEl.textContent = 'Podaj opis.'; return; }
    if (!amount || amount <= 0) { errEl.textContent = 'Podaj poprawną kwotę.'; return; }
    if (currency === 'EUR' && exchangeRate <= 0) { errEl.textContent = 'Podaj poprawny kurs EUR.'; return; }
    if (!date) { errEl.textContent = 'Podaj datę.'; return; }
    errEl.textContent = '';

    if (editingType === 'expense') {
      const data = { description: desc, amount, currency, exchangeRate, amountPLN, category, paidByFamily: familyId, paidByPerson: person, date };
      if (editingId) Expenses.updateExpense(editingId, data);
      else Expenses.addExpense(data);
    } else {
      const data = { description: desc, amount, currency, exchangeRate, amountPLN, category, receivedByFamily: familyId, receivedByPerson: person, date };
      if (editingId) Expenses.updateIncome(editingId, data);
      else Expenses.addIncome(data);
    }

    closeModal('expense-modal');
    if (currentSection === 'expenses') renderTransactionList();
    else if (currentSection === 'dashboard') renderDashboard();
    else if (currentSection === 'settlement') renderSettlement();
  }

  function showModal(id) {
    const m = document.getElementById(id);
    m.classList.remove('hidden');
    m.classList.add('visible');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    m.classList.add('hidden');
    m.classList.remove('visible');
  }

  function confirmAction(message, onConfirm) {
    document.getElementById('confirm-message').textContent = message;
    confirmCallback = onConfirm;
    showModal('confirm-modal');
  }

  // ── SETTINGS ─────────────────────────────────────────────

  function renderSettings() {
    const state = Storage.load();
    if (state.families[0]) {
      document.getElementById('settings-f1-name').value = state.families[0].name;
      document.getElementById('settings-f1-members').value = state.families[0].members.join(', ');
    }
    if (state.families[1]) {
      document.getElementById('settings-f2-name').value = state.families[1].name;
      document.getElementById('settings-f2-members').value = state.families[1].members.join(', ');
    }
    document.getElementById('settings-eur-rate').value = state.settings.defaultEurRate || 4.25;
  }

  function saveSettings() {
    const state = Storage.load();
    const parseMem = str => str ? str.split(',').map(s => s.trim()).filter(Boolean) : ['Osoba'];
    const f1name = document.getElementById('settings-f1-name').value.trim();
    const f2name = document.getElementById('settings-f2-name').value.trim();
    if (!f1name || !f2name) { alert('Nazwy rodzin nie mogą być puste.'); return; }
    state.families[0].name    = f1name;
    state.families[0].members = parseMem(document.getElementById('settings-f1-members').value);
    state.families[1].name    = f2name;
    state.families[1].members = parseMem(document.getElementById('settings-f2-members').value);
    const eurRate = parseFloat(document.getElementById('settings-eur-rate').value);
    if (eurRate > 0) state.settings.defaultEurRate = eurRate;
    Storage.save(state);
    showToast('Ustawienia zapisane.');
  }

  function resetData() {
    confirmAction('Czy na pewno chcesz usunąć WSZYSTKIE dane? Tej operacji nie można cofnąć.', () => {
      Storage.reset();
      showSetup();
      // Reset setup form
      ['setup-f1-name','setup-f1-members','setup-f2-name','setup-f2-members'].forEach(id => {
        document.getElementById(id).value = '';
      });
    });
  }

  // ── TOAST ─────────────────────────────────────────────────

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2500);
  }

  // ── TRIP SELECTOR ─────────────────────────────────────────

  function updateHeaderTripName() {
    const name = localStorage.getItem('trip_calculator_trip_name') || 'Wakacje';
    const el = document.getElementById('current-trip-name');
    if (el) el.textContent = name;
  }

  async function openTripSelector() {
    await renderTripList();
    document.getElementById('trip-overlay').classList.remove('hidden');
  }

  function closeTripSelector() {
    document.getElementById('trip-overlay').classList.add('hidden');
    document.getElementById('trip-new-form').classList.add('hidden');
    document.getElementById('btn-new-trip').style.display = '';
  }

  async function renderTripList() {
    const container = document.getElementById('trip-list');
    container.innerHTML = '<p class="text-muted">Ładowanie…</p>';
    const trips = await Storage.getTrips();
    const currentId = Storage.currentTripId();
    if (trips.length === 0) {
      container.innerHTML = '<p class="empty-state">Brak wycieczek.</p>';
      return;
    }
    container.innerHTML = trips.map(t => `
      <div class="trip-card ${t.id === currentId ? 'trip-card--active' : ''}">
        <div class="trip-card-info">
          <div class="trip-card-name">${escHtml(t.name)}</div>
          ${t.destination ? `<div class="trip-card-meta">📍 ${escHtml(t.destination)}</div>` : ''}
        </div>
        <div class="trip-card-actions">
          ${t.id !== currentId
            ? `<button class="btn btn-primary btn-sm" data-action="switch-trip" data-id="${t.id}" data-name="${escHtml(t.name)}">Wybierz</button>`
            : `<span class="trip-active-badge">Aktywna</span>`}
          <button class="btn btn-danger btn-sm" data-action="delete-trip" data-id="${t.id}" data-name="${escHtml(t.name)}" title="Usuń">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  // ── EVENT BINDING ─────────────────────────────────────────

  function bindGlobalEvents() {
    // Tab nav
    document.querySelector('.tab-nav').addEventListener('click', e => {
      const btn = e.target.closest('.tab-btn');
      if (btn) navigateTo(btn.dataset.section);
    });

    // Mode toggle (expense / income)
    document.querySelectorAll('.mode-tab').forEach(t => {
      t.addEventListener('click', () => {
        transactionMode = t.dataset.mode;
        renderTransactionList();
      });
    });

    // Transaction list actions (delegated)
    document.getElementById('transaction-list').addEventListener('click', e => {
      const editBtn   = e.target.closest('[data-action="edit"]');
      const deleteBtn = e.target.closest('[data-action="delete"]');
      if (editBtn) openEditModal(editBtn.dataset.id, editBtn.dataset.entryType);
      if (deleteBtn) {
        const type = deleteBtn.dataset.entryType;
        confirmAction('Czy na pewno chcesz usunąć tę pozycję?', () => {
          if (type === 'expense') Expenses.deleteExpense(deleteBtn.dataset.id);
          else Expenses.deleteIncome(deleteBtn.dataset.id);
          renderTransactionList();
        });
      }
    });

    // Dashboard recent list (delegated)
    document.getElementById('dashboard-recent').addEventListener('click', e => {
      const editBtn   = e.target.closest('[data-action="edit"]');
      const deleteBtn = e.target.closest('[data-action="delete"]');
      if (editBtn) openEditModal(editBtn.dataset.id, editBtn.dataset.entryType || 'expense');
      if (deleteBtn) {
        confirmAction('Czy na pewno chcesz usunąć ten wydatek?', () => {
          Expenses.deleteExpense(deleteBtn.dataset.id);
          renderDashboard();
        });
      }
    });

    // Filter bar
    ['filter-category', 'filter-family', 'filter-search'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', renderTransactionList);
    });

    // FAB
    document.getElementById('btn-fab').addEventListener('click', openAddModal);

    // Modal expense form
    document.getElementById('expense-form').addEventListener('submit', handleExpenseFormSubmit);
    document.getElementById('btn-cancel-modal').addEventListener('click', () => closeModal('expense-modal'));

    // Modal backdrops
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', () => {
        closeModal('expense-modal');
        closeModal('confirm-modal');
        closeModal('transfer-modal');
      });
    });

    // Confirm modal
    document.getElementById('btn-confirm-ok').addEventListener('click', () => {
      if (confirmCallback) confirmCallback();
      confirmCallback = null;
      closeModal('confirm-modal');
    });
    document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
      confirmCallback = null;
      closeModal('confirm-modal');
    });

    // Family select → person select
    document.getElementById('f-family').addEventListener('change', function () {
      populatePersonSelect(this.value);
    });

    // Currency → toggle rate group + live preview
    document.getElementById('f-currency').addEventListener('change', function () {
      toggleRateGroup(this.value);
      updatePlnPreview();
    });
    document.getElementById('f-amount').addEventListener('input', updatePlnPreview);
    document.getElementById('f-exchange-rate').addEventListener('input', updatePlnPreview);

    // Settlement slider
    document.getElementById('ratio-slider').addEventListener('input', function () {
      handleSliderChange(this.value);
    });

    // Setup
    document.getElementById('btn-save-setup').addEventListener('click', saveSetup);

    // Settings
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
    document.getElementById('btn-reset-data').addEventListener('click', resetData);

    // Transfer (partial payment)
    document.getElementById('btn-add-transfer').addEventListener('click', openTransferModal);
    document.getElementById('btn-cancel-transfer').addEventListener('click', () => closeModal('transfer-modal'));
    document.getElementById('transfer-form').addEventListener('submit', handleTransferFormSubmit);
    document.getElementById('tr-currency').addEventListener('change', function () {
      document.getElementById('tr-rate-group').style.display = this.value === 'EUR' ? '' : 'none';
    });
    document.getElementById('partial-payments-list').addEventListener('click', e => {
      const btn = e.target.closest('[data-action="delete-transfer-pair"]');
      if (!btn) return;
      confirmAction('Usunąć ten częściowy zwrot?', () => {
        const state = Storage.load();
        const targetAmt = parseFloat(btn.dataset.amount);
        const targetDate = btn.dataset.date;
        // Remove matching expense
        state.expenses = state.expenses.filter(ex =>
          !(ex.category === 'transfer' && ex.date === targetDate && Math.abs(ex.amountPLN - targetAmt) < 0.01)
        );
        // Remove matching income
        state.incomes = state.incomes.filter(inc =>
          !(inc.category === 'transfer' && inc.date === targetDate && Math.abs(inc.amountPLN - targetAmt) < 0.01)
        );
        Storage.save(state);
        renderSettlement();
      });
    });
    // Trip selector — open/close
    document.getElementById('btn-trip-switcher').addEventListener('click', openTripSelector);
    document.getElementById('btn-close-trips').addEventListener('click', closeTripSelector);

    // Trip list — switch / delete (delegated)
    document.getElementById('trip-list').addEventListener('click', async e => {
      const sw  = e.target.closest('[data-action="switch-trip"]');
      const del = e.target.closest('[data-action="delete-trip"]');

      if (sw) {
        await Storage.switchTrip(sw.dataset.id, sw.dataset.name);
        closeTripSelector();
        updateHeaderTripName();
        const state = Storage.load();
        if (!state.families || state.families.length < 2 || !state.families[0].name) {
          showSetup();
        } else {
          showApp();
          navigateTo('dashboard');
        }
      }

      if (del) {
        confirmAction(`Usunąć wycieczkę „${del.dataset.name}"? Tej operacji nie można cofnąć.`, async () => {
          const isActive = del.dataset.id === Storage.currentTripId();
          await Storage.deleteTrip(del.dataset.id);
          if (isActive) {
            const remaining = await Storage.getTrips();
            if (remaining.length > 0) {
              await Storage.switchTrip(remaining[0].id, remaining[0].name);
              closeTripSelector();
              updateHeaderTripName();
              const state = Storage.load();
              if (!state.families || state.families.length < 2 || !state.families[0].name) showSetup();
              else { showApp(); navigateTo('dashboard'); }
            } else {
              // No trips left — create a fresh one
              const trip = await Storage.createTrip('Wakacje');
              await Storage.switchTrip(trip.id, trip.name);
              closeTripSelector();
              updateHeaderTripName();
              showSetup();
            }
          } else {
            await renderTripList();
          }
        });
      }
    });

    // New trip form toggle
    document.getElementById('btn-new-trip').addEventListener('click', () => {
      document.getElementById('trip-new-form').classList.remove('hidden');
      document.getElementById('btn-new-trip').style.display = 'none';
      document.getElementById('trip-new-name').value = '';
      document.getElementById('trip-new-dest').value = '';
      document.getElementById('trip-new-name').focus();
    });
    document.getElementById('btn-trip-new-cancel').addEventListener('click', () => {
      document.getElementById('trip-new-form').classList.add('hidden');
      document.getElementById('btn-new-trip').style.display = '';
    });
    document.getElementById('btn-trip-new-save').addEventListener('click', async () => {
      const name = document.getElementById('trip-new-name').value.trim();
      if (!name) { document.getElementById('trip-new-name').focus(); return; }
      const dest = document.getElementById('trip-new-dest').value.trim();
      const trip = await Storage.createTrip(name, dest);
      await Storage.switchTrip(trip.id, trip.name);
      closeTripSelector();
      updateHeaderTripName();
      showSetup();
    });
  }

  // ── HELPERS ───────────────────────────────────────────────

  function formatCurrency(amount) {
    return Number(amount).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
  }

  function formatEur(amount) {
    return Number(amount).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, navigateTo };
})();

document.addEventListener('DOMContentLoaded', () => Storage.initTrip().then(App.init));
