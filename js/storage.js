window.Storage = (function () {
  const KEY = 'trip_calculator';

  const DEFAULT_STATE = {
    families: [],
    expenses: [],
    incomes: [],
    settings: { currency: 'PLN', splitRatio: [50, 50], defaultEurRate: 4.25 },
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const parsed = JSON.parse(raw);
      // Migrate: ensure incomes array and EUR fields exist
      if (!parsed.incomes) parsed.incomes = [];
      if (!parsed.settings.defaultEurRate) parsed.settings.defaultEurRate = 4.25;
      parsed.expenses.forEach(e => {
        if (!e.currency) { e.currency = 'PLN'; e.exchangeRate = 1.0; e.amountPLN = e.amount; }
      });
      parsed.incomes.forEach(i => {
        if (!i.currency) { i.currency = 'PLN'; i.exchangeRate = 1.0; i.amountPLN = i.amount; }
      });
      return parsed;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function reset() {
    localStorage.removeItem(KEY);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  return { load, save, reset, generateId };
})();
