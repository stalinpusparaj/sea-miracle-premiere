// Storage that never throws: falls back to memory when the browser blocks site data
// (Safari/Chrome "block all cookies", Android WebViews without DOM storage, private modes with full quota).
const mem = new Map();
let ls = null;
try { ls = window.localStorage; ls && ls.getItem('sm-probe'); } catch { ls = null; }

export const store = {
  get(key) {
    try { if (ls) { const v = ls.getItem(key); if (v !== null) return v; } } catch { /* fall through */ }
    return mem.has(key) ? mem.get(key) : null;
  },
  set(key, value) {
    const v = String(value);
    mem.set(key, v);
    try { ls && ls.setItem(key, v); } catch { /* memory copy is enough for this visit */ }
  },
  json(key) { try { return JSON.parse(this.get(key) || 'null'); } catch { return null; } },
};
