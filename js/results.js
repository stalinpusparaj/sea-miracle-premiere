// 05 · Results — drag the gold divider between before and after. Photos are shown as supplied (no retouching).
const PAIRS = [1, 2, 3, 4].map((n) => ({ before: `img/testi/p${n}_before.jpg`, after: `img/testi/p${n}_after.jpg`, thumb: `img/testi/p${n}_thumb.jpg` }));

export function initResults(api) {
  const pane = document.querySelector('[data-pane="results"]');
  const cmp = pane.querySelector('#compare');
  const handle = pane.querySelector('#cmpHandle');
  const before = pane.querySelector('#cmpBefore');
  const after = pane.querySelector('#cmpAfter');
  const thumbs = pane.querySelector('#thumbs');
  const seen = new Set();
  let cur = -1; let x = 50; let sweep = 0; let dragging = false;

  const setX = (v) => {
    x = Math.max(0, Math.min(100, v));
    cmp.style.setProperty('--x', `${x}%`);
    cmp.classList.toggle('hide-b', x < 16); cmp.classList.toggle('hide-a', x > 84);
    handle.setAttribute('aria-valuenow', String(Math.round(x)));
  };

  function intro() { // the divider sweeps across once to reveal the after photo
    cancelAnimationFrame(sweep);
    const keys = [[0, 96], [700, 8], [1250, 50]]; const t0 = performance.now();
    api.sfx('whoosh');
    const tick = (t) => {
      const el = t - t0; let k = keys.length - 1;
      for (let i = 1; i < keys.length; i++) if (el < keys[i][0]) { k = i; break; }
      const [ta, va] = keys[k - 1] || keys[0], [tb, vb] = keys[k];
      const p = tb === ta ? 1 : Math.min(1, (el - ta) / (tb - ta)); const e = p < .5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      setX(va + (vb - va) * e);
      if (el < keys[keys.length - 1][0] && !dragging) sweep = requestAnimationFrame(tick);
    };
    sweep = requestAnimationFrame(tick);
  }

  function select(i, { fromUser = true } = {}) {
    if (i === cur) { intro(); return; }
    cur = i;
    before.src = PAIRS[i].before; after.src = PAIRS[i].after;
    [...thumbs.children].forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
    Promise.all([before, after].map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = r; im.onerror = r; })))).then(intro);
    if (fromUser) { api.haptic(8); }
    markSeen(i);
  }

  function markSeen(i) {
    if (seen.has(i)) return;
    seen.add(i);
    thumbs.children[i].classList.add('seen');
    if (seen.size === PAIRS.length) setTimeout(() => api.awardStar('results', cmp), 900);
  }

  PAIRS.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'thumb'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', `Client result ${i + 1}`);
    b.innerHTML = `<img src="${p.thumb}" alt="" decoding="async">`;
    b.addEventListener('click', () => select(i));
    thumbs.appendChild(b);
  });

  // drag anywhere on the photo
  const fromEvent = (e) => { const r = cmp.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * 100; };
  let lastTick = 0;
  cmp.addEventListener('pointerdown', (e) => { e.preventDefault(); window.getSelection()?.removeAllRanges(); cmp.classList.add('touched'); dragging = true; cancelAnimationFrame(sweep); cmp.setPointerCapture(e.pointerId); setX(fromEvent(e)); });
  cmp.addEventListener('pointermove', (e) => {
    if (!dragging) return; setX(fromEvent(e));
    const now = performance.now(); if (now - lastTick > 120) { api.haptic(3); lastTick = now; }
  });
  const end = () => {
    if (!dragging) return; dragging = false;
    if (x < 12) { api.sfx('chime'); api.burstFrom(handle, { count: 14, spread: .6 }); }
  };
  cmp.addEventListener('pointerup', end); cmp.addEventListener('pointercancel', end);
  handle.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { setX(x - 5); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setX(x + 5); e.preventDefault(); }
  });

  return {
    enter() { if (cur < 0) select(0, { fromUser: false }); else intro(); },
    leave() { cancelAnimationFrame(sweep); },
  };
}
