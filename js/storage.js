window.Storage = (function () {
  const KEY = 'trip_calculator';

  const DEFAULT_STATE = {
    families: [],
    expenses: [],
    incomes: [],
    settings: { currency: 'PLN', splitRatio: [50, 50] },
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const parsed = JSON.parse(raw);
      // Ensure incomes array exists (migration for older data)
      if (!parsed.incomes) parsed.incomes = [];
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
