window.Expenses = (function () {

  const EXPENSE_CATEGORIES = [
    { id: 'food',          emoji: '🍕', label: 'Jedzenie',   color: '#F97316' },
    { id: 'transport',     emoji: '🚗', label: 'Transport',  color: '#3B82F6' },
    { id: 'accommodation', emoji: '🏠', label: 'Nocleg',     color: '#8B5CF6' },
    { id: 'entertainment', emoji: '🎡', label: 'Atrakcje',   color: '#EC4899' },
    { id: 'shopping',      emoji: '🛒', label: 'Zakupy',     color: '#10B981' },
    { id: 'other',         emoji: '💼', label: 'Inne',       color: '#6B7280' },
  ];

  const INCOME_CATEGORIES = [
    { id: 'refund',        emoji: '💸', label: 'Zwrot',          color: '#14B8A6' },
    { id: 'contribution',  emoji: '💵', label: 'Wkład własny',   color: '#22C55E' },
    { id: 'other_income',  emoji: '📥', label: 'Inne przychody', color: '#A3E635' },
  ];

  function getExpenseCategory(id) {
    return EXPENSE_CATEGORIES.find(c => c.id === id) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
  }

  function getIncomeCategory(id) {
    return INCOME_CATEGORIES.find(c => c.id === id) || INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1];
  }

  // ── EXPENSES ──────────────────────────────────────────────

  function addExpense(data) {
    const state = Storage.load();
    const expense = {
      id: Storage.generateId(),
      description: data.description.trim(),
      amount: parseFloat(data.amount),
      currency: data.currency || 'PLN',
      exchangeRate: parseFloat(data.exchangeRate) || 1.0,
      amountPLN: parseFloat(data.amountPLN) || parseFloat(data.amount),
      category: data.category,
      paidByFamily: data.paidByFamily,
      paidByPerson: data.paidByPerson,
      date: data.date,
    };
    state.expenses.push(expense);
    Storage.save(state);
    return expense;
  }

  function updateExpense(id, data) {
    const state = Storage.load();
    const idx = state.expenses.findIndex(e => e.id === id);
    if (idx === -1) return null;
    state.expenses[idx] = {
      ...state.expenses[idx],
      description: data.description.trim(),
      amount: parseFloat(data.amount),
      currency: data.currency || 'PLN',
      exchangeRate: parseFloat(data.exchangeRate) || 1.0,
      amountPLN: parseFloat(data.amountPLN) || parseFloat(data.amount),
      category: data.category,
      paidByFamily: data.paidByFamily,
      paidByPerson: data.paidByPerson,
      date: data.date,
    };
    Storage.save(state);
    return state.expenses[idx];
  }

  function deleteExpense(id) {
    const state = Storage.load();
    state.expenses = state.expenses.filter(e => e.id !== id);
    Storage.save(state);
  }

  function getExpenses(filters) {
    const state = Storage.load();
    let list = [...state.expenses];
    if (filters) {
      if (filters.category) list = list.filter(e => e.category === filters.category);
      if (filters.familyId) list = list.filter(e => e.paidByFamily === filters.familyId);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(e => e.description.toLowerCase().includes(q));
      }
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

  // ── INCOMES ───────────────────────────────────────────────

  function addIncome(data) {
    const state = Storage.load();
    const income = {
      id: Storage.generateId(),
      description: data.description.trim(),
      amount: parseFloat(data.amount),
      currency: data.currency || 'PLN',
      exchangeRate: parseFloat(data.exchangeRate) || 1.0,
      amountPLN: parseFloat(data.amountPLN) || parseFloat(data.amount),
      category: data.category,
      receivedByFamily: data.receivedByFamily,
      receivedByPerson: data.receivedByPerson,
      date: data.date,
    };
    state.incomes.push(income);
    Storage.save(state);
    return income;
  }

  function updateIncome(id, data) {
    const state = Storage.load();
    const idx = state.incomes.findIndex(i => i.id === id);
    if (idx === -1) return null;
    state.incomes[idx] = {
      ...state.incomes[idx],
      description: data.description.trim(),
      amount: parseFloat(data.amount),
      currency: data.currency || 'PLN',
      exchangeRate: parseFloat(data.exchangeRate) || 1.0,
      amountPLN: parseFloat(data.amountPLN) || parseFloat(data.amount),
      category: data.category,
      receivedByFamily: data.receivedByFamily,
      receivedByPerson: data.receivedByPerson,
      date: data.date,
    };
    Storage.save(state);
    return state.incomes[idx];
  }

  function deleteIncome(id) {
    const state = Storage.load();
    state.incomes = state.incomes.filter(i => i.id !== id);
    Storage.save(state);
  }

  function getIncomes(filters) {
    const state = Storage.load();
    let list = [...state.incomes];
    if (filters) {
      if (filters.category) list = list.filter(i => i.category === filters.category);
      if (filters.familyId) list = list.filter(i => i.receivedByFamily === filters.familyId);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(i => i.description.toLowerCase().includes(q));
      }
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }

  // ── SETTLEMENT ────────────────────────────────────────────

  function calculateSettlement() {
    const state = Storage.load();
    const { families, expenses, incomes, settings } = state;
    const ratios = settings.splitRatio;

    const expenseTotal = expenses.reduce((s, e) => s + e.amountPLN, 0);
    const incomeTotal  = incomes.reduce((s, i) => s + i.amountPLN, 0);
    const netTotal     = expenseTotal - incomeTotal;

    const result = families.map((fam, idx) => {
      const paid     = expenses.filter(e => e.paidByFamily === fam.id).reduce((s, e) => s + e.amountPLN, 0);
      const received = incomes.filter(i => i.receivedByFamily === fam.id).reduce((s, i) => s + i.amountPLN, 0);
      const netContrib = paid - received;
      const fairShare  = netTotal * (ratios[idx] / 100);
      const balance    = netContrib - fairShare;
      return { id: fam.id, name: fam.name, paid, received, netContrib, fairShare, balance };
    });

    let debtor = null;
    const underpaid = result.filter(f => f.balance < -0.005);
    if (underpaid.length > 0) {
      const f = underpaid[0];
      const creditor = result.find(r => r.id !== f.id);
      debtor = { familyId: f.id, familyName: f.name, toFamily: creditor.name, owes: Math.abs(f.balance) };
    }

    return { expenseTotal, incomeTotal, netTotal, families: result, debtor };
  }

  // ── AGGREGATIONS (for charts) ─────────────────────────────

  function getTotalByCategory() {
    const state = Storage.load();
    const totals = {};
    EXPENSE_CATEGORIES.forEach(c => { totals[c.id] = 0; });
    state.expenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amountPLN; });
    return totals;
  }

  function getTotalByFamily() {
    const state = Storage.load();
    const totals = {};
    state.families.forEach(f => { totals[f.id] = 0; });
    state.expenses.forEach(e => { totals[e.paidByFamily] = (totals[e.paidByFamily] || 0) + e.amountPLN; });
    return totals;
  }

  function getExpensesByDate() {
    const state = Storage.load();
    const map = {};
    state.expenses.forEach(e => {
      map[e.date] = (map[e.date] || 0) + e.amountPLN;
    });
    const dates = Object.keys(map).sort();
    let running = 0;
    return dates.map(date => {
      running += map[date];
      return { date, daily: map[date], cumulative: running };
    });
  }

  return {
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    getExpenseCategory,
    getIncomeCategory,
    addExpense, updateExpense, deleteExpense, getExpenses,
    addIncome, updateIncome, deleteIncome, getIncomes,
    calculateSettlement,
    getTotalByCategory,
    getTotalByFamily,
    getExpensesByDate,
  };
})();
