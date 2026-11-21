// 03 · Profit calculator — every figure comes from the owner's own slider values.
//   extra profit / month = clients × uptake% × (price − cost) + retail bottles × margin per bottle
const inr = (n) => Math.round(n).toLocaleString('en-IN');
const num = (n) => (Math.round(n * 10) / 10).toLocaleString('en-IN');
const FIELDS = [
  { id: 'clients', fmt: (v) => v },
  { id: 'uptake', fmt: (v) => `${v}%` },
  { id: 'price', fmt: (v) => `₹${inr(v)}` },
  { id: 'cost', fmt: (v) => `₹${inr(v)}` },
  { id: 'retail', fmt: (v) => v },
  { id: 'margin', fmt: (v) => `₹${inr(v)}` },
];
// Example salons (clearly labelled as examples in the UI; owners then fine-tune with the sliders)
const PRESETS = {
  boutique: { clients: 30, uptake: 30, price: 700, cost: 150, retail: 4, margin: 200 },
  busy: { clients: 120, uptake: 40, price: 1000, cost: 150, retail: 15, margin: 250 },
  spa: { clients: 250, uptake: 50, price: 1800, cost: 250, retail: 40, margin: 350 },
};

export function initProfit(api) {
  const pane = document.querySelector('[data-pane="profit"]');
  const defaults = Object.assign({ clients: 60, uptake: 40, price: 900, cost: 150, retail: 8, margin: 250 }, api.config.calculator || {});
  const saved = api.store.json('sm-calc');
  const vals = Object.assign({}, defaults, saved || {});
  const els = {};
  const presetBtns = [...pane.querySelectorAll('[data-preset]')];
  let shown = 0; let raf = 0; let touched = false; let lastTick = 0;

  const calc = () => {
    const rituals = vals.clients * vals.uptake / 100;
    const perRitual = vals.price - vals.cost;
    const month = rituals * Math.max(0, perRitual) + vals.retail * vals.margin;
    return { rituals, perRitual, month, year: month * 12, week: rituals * 12 / 52 };
  };

  function animateTo(target) {
    cancelAnimationFrame(raf);
    const from = shown, t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 600), e = 1 - (1 - k) ** 3;
      shown = from + (target - from) * e;
      pane.querySelector('#resMonth').textContent = inr(shown);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function render({ fromUser = false } = {}) {
    FIELDS.forEach(({ id, fmt }) => {
      const s = els[id];
      s.value = vals[id];
      const p = ((s.value - s.min) / (s.max - s.min)) * 100;
      s.style.setProperty('--p', `${p}%`);
      s.setAttribute('aria-valuetext', String(fmt(vals[id])));
      pane.querySelector(`#o-${id}`).textContent = fmt(vals[id]);
    });
    const r = calc();
    animateTo(r.month);
    pane.querySelector('#resYear').textContent = inr(r.year);
    pane.querySelector('#resWeek').textContent = num(r.week);
    pane.querySelector('#resMath').textContent = r.perRitual > 0
      ? `${num(r.rituals)} rituals × ₹${inr(r.perRitual)} + ${vals.retail} bottles × ₹${inr(vals.margin)}`
      : 'Your cost is higher than your price — raise the ritual price';
    presetBtns.forEach((b) => {
      const p = PRESETS[b.dataset.preset];
      b.setAttribute('aria-pressed', String(Object.keys(p).every((k) => p[k] === vals[k])));
    });
    if (fromUser) api.announce(`Estimated extra margin ₹${inr(r.month)} a month`);
  }

  function changed() {
    api.store.set('sm-calc', JSON.stringify(vals));
    render({ fromUser: true });
    if (!touched) {
      touched = true;
      setTimeout(() => api.awardStar('profit', pane.querySelector('.result-value')), 1400);
    }
  }

  FIELDS.forEach(({ id }) => {
    const s = pane.querySelector(`#s-${id}`); els[id] = s;
    s.addEventListener('input', () => {
      vals[id] = Number(s.value);
      const now = performance.now();
      if (now - lastTick > 90) { api.sfx('tap'); api.haptic(4); lastTick = now; }
      changed();
    });
  });

  presetBtns.forEach((b) => b.addEventListener('click', () => {
    Object.assign(vals, PRESETS[b.dataset.preset]);
    api.sfx('coin'); api.haptic(10);
    changed();
  }));

  pane.querySelector('#sendNumbers').addEventListener('click', () => {
    const r = calc();
    api.sendWhatsApp(
      `Hello Sea Miracle! I tried the profit calculator at the premiere. My numbers:\n\n` +
      `Pedicure clients/month: ${vals.clients}\nClients adding Heel Peel: ${vals.uptake}%\nRitual price: ₹${inr(vals.price)}\nMy cost per ritual: ₹${inr(vals.cost)}\n` +
      `Retail bottles/month: ${vals.retail} at ₹${inr(vals.margin)} margin\n\nIllustrative extra margin: ₹${inr(r.month)}/month (₹${inr(r.year)}/year)\n` +
      `Please share your trade pricing.\n\n${api.contextLine()}`);
  });

  render();
  return {
    enter() { shown = 0; render(); },
    leave() {},
  };
}
