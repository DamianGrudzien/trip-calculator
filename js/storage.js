window.Storage = (function () {
  const API_BASE = 'https://trip-calculator-ihdn.onrender.com';
  const TRIP_ID_KEY = 'trip_calculator_trip_id';

  const DEFAULT_STATE = {
    families: [],
    expenses: [],
    incomes: [],
    settings: { currency: 'PLN', splitRatio: [50, 50], defaultEurRate: 4.25 },
  };

  let _cache = null;
  let _tripId = localStorage.getItem(TRIP_ID_KEY);

  // ── Bootstrap ────────────────────────────────────────────────────────────

  async function initTrip() {
    _showLoader('Łączenie z serwerem…');
    try {
      if (_tripId) {
        const res = await fetch(`${API_BASE}/api/trips/${_tripId}/state`);
        if (res.ok) {
          _cache = _normalize(await res.json());
          // Refresh stored name from server
          fetch(`${API_BASE}/api/trips/${_tripId}`)
            .then(r => r.json())
            .then(t => localStorage.setItem('trip_calculator_trip_name', t.name))
            .catch(() => {});
          _hideLoader();
          return _cache;
        }
        // Trip deleted server-side — forget it
        _tripId = null;
        localStorage.removeItem(TRIP_ID_KEY);
      }

      // Look for existing trips or create one
      const trips = await fetch(`${API_BASE}/api/trips`).then(r => r.json());
      let chosenTrip;
      if (trips.length > 0) {
        chosenTrip = trips[0];
      } else {
        chosenTrip = await fetch(`${API_BASE}/api/trips`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Wakacje' }),
        }).then(r => r.json());
      }
      _tripId = chosenTrip.id;
      localStorage.setItem(TRIP_ID_KEY, _tripId);
      localStorage.setItem('trip_calculator_trip_name', chosenTrip.name);

      const state = await fetch(`${API_BASE}/api/trips/${_tripId}/state`).then(r => r.json());
      _cache = _normalize(state);
    } catch (err) {
      console.warn('Backend niedostępny — tryb offline (localStorage)', err);
      _cache = _fromLocalStorage();
    }
    _hideLoader();
    return _cache;
  }

  // ── Synchronous API (unchanged contract for app.js / expenses.js) ────────

  function load() {
    return _cache || JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  function save(state) {
    _cache = state;
    if (_tripId) {
      fetch(`${API_BASE}/api/trips/${_tripId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      }).catch(err => {
        console.warn('Zapis do API nieudany — fallback localStorage', err);
        localStorage.setItem('trip_calculator', JSON.stringify(state));
      });
    }
  }

  function reset() {
    const empty = JSON.parse(JSON.stringify(DEFAULT_STATE));
    _cache = empty;
    if (_tripId) {
      fetch(`${API_BASE}/api/trips/${_tripId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empty),
      }).catch(console.error);
    }
    return empty;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function _normalize(state) {
    if (!state.incomes) state.incomes = [];
    if (!state.settings) state.settings = {};
    if (!state.settings.currency)      state.settings.currency = 'PLN';
    if (!state.settings.splitRatio)    state.settings.splitRatio = [50, 50];
    if (!state.settings.defaultEurRate) state.settings.defaultEurRate = 4.25;
    (state.expenses || []).forEach(e => {
      if (!e.currency) { e.currency = 'PLN'; e.exchangeRate = 1.0; e.amountPLN = e.amountPLN || e.amount; }
    });
    (state.incomes || []).forEach(i => {
      if (!i.currency) { i.currency = 'PLN'; i.exchangeRate = 1.0; i.amountPLN = i.amountPLN || i.amount; }
    });
    return state;
  }

  function _fromLocalStorage() {
    try {
      const raw = localStorage.getItem('trip_calculator');
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      return _normalize(JSON.parse(raw));
    } catch {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  function _showLoader(msg) {
    let el = document.getElementById('storage-loader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'storage-loader';
      el.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:9999',
        'background:#fff', 'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center', 'gap:16px',
      ].join(';');
      el.innerHTML =
        '<div style="width:40px;height:40px;border:4px solid #e5e7eb;border-top-color:#6366f1;border-radius:50%;animation:spin 0.8s linear infinite"></div>' +
        '<p style="color:#6b7280;font-size:1rem;margin:0" id="storage-loader-msg"></p>' +
        '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
      document.body.appendChild(el);
    }
    document.getElementById('storage-loader-msg').textContent = msg;
  }

  function _hideLoader() {
    const el = document.getElementById('storage-loader');
    if (el) el.remove();
  }

  // ── Multi-trip API ───────────────────────────────────────────────────────

  async function getTrips() {
    return fetch(`${API_BASE}/api/trips`).then(r => r.json());
  }

  async function createTrip(name, destination) {
    return fetch(`${API_BASE}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, destination: destination || null }),
    }).then(r => r.json());
  }

  async function deleteTrip(tripId) {
    return fetch(`${API_BASE}/api/trips/${tripId}`, { method: 'DELETE' });
  }

  async function switchTrip(tripId, tripName) {
    _showLoader('Ładowanie wycieczki…');
    _tripId = tripId;
    localStorage.setItem(TRIP_ID_KEY, tripId);
    if (tripName) localStorage.setItem('trip_calculator_trip_name', tripName);
    const state = await fetch(`${API_BASE}/api/trips/${tripId}/state`).then(r => r.json());
    _cache = _normalize(state);
    _hideLoader();
    return _cache;
  }

  function currentTripId() { return _tripId; }

  return { initTrip, load, save, reset, generateId, getTrips, createTrip, deleteTrip, switchTrip, currentTripId };
})();
