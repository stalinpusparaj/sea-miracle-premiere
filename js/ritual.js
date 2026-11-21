// 02 · The 45-minute ritual — four steps with the client's own procedure footage and a 45-minute ring.
const STEPS = [
  { title: 'Soak', min: 10, clip: 'media/step1_soak', text: 'Cleanse and soak the feet to soften the skin.' },
  { title: 'Apply gel', min: 5, clip: 'media/step2_apply', text: 'Apply Heel Peel Foot Gel generously and evenly over the heel and sole.', gel: true },
  { title: 'Wrap · 20 min', min: 20, clip: 'media/step3_wrap', text: 'Wrap the feet in film and let the formula work for 20 minutes.' },
  { title: 'Remove callus', min: 10, clip: 'media/step4_callus', text: 'Unwrap and gently remove the softened callus with a foot rasp. Massage and rinse.' },
];
const TOTAL = STEPS.reduce((a, s) => a + s.min, 0); // 45
const CIRC = 2 * Math.PI * 27;

export function initRitual(api) {
  const pane = document.querySelector('[data-pane="ritual"]');
  const video = pane.querySelector('#stepVideo');
  const stepBtns = [...pane.querySelectorAll('.step')];
  const next = pane.querySelector('#stepNext');
  const done = new Set();
  let cur = 0; let ringMin = 0; let raf = 0;

  function animateRing(toMin) {
    cancelAnimationFrame(raf);
    const from = ringMin, t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / 800), e = 1 - (1 - k) ** 3;
      ringMin = from + (toMin - from) * e;
      pane.querySelector('#ringMin').textContent = Math.round(ringMin);
      pane.querySelector('#ringFg').style.strokeDashoffset = String(CIRC * (1 - ringMin / TOTAL));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function show(i, { fromUser = true } = {}) {
    cur = i; const s = STEPS[i];
    stepBtns.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.classList.toggle('done', done.has(k)); });
    pane.querySelector('#stepTitle').textContent = s.title;
    pane.querySelector('#stepText').textContent = s.text;
    pane.querySelector('#stepTag').textContent = `${String(i + 1).padStart(2, '0')} · ${s.min} min`;
    video.poster = s.clip + '.jpg';
    video.src = s.clip + '.mp4';
    video.play().catch(() => {});
    pane.querySelector('#stepCount').textContent = `Step ${i + 1} of ${STEPS.length}`;
    next.textContent = i < STEPS.length - 1 ? `Next: ${STEPS[i + 1].title} →` : (done.size === STEPS.length ? 'Replay the ritual' : 'Finish the ritual ✓');
    if (fromUser) { api.sfx('tap'); api.haptic(8); }
    if (s.gel && fromUser) api.openGel(next);
  }

  function complete(i) {
    if (done.has(i)) return;
    done.add(i);
    const mins = STEPS.filter((_, k) => done.has(k)).reduce((a, s) => a + s.min, 0);
    animateRing(mins);
    api.sfx('coin');
    api.burstFrom(stepBtns[i], { count: 12, spread: .6 });
    stepBtns[i].classList.add('done');
  }

  stepBtns.forEach((b, i) => b.addEventListener('click', () => show(i)));
  next.addEventListener('click', () => {
    complete(cur);
    if (cur < STEPS.length - 1) { show(cur + 1); return; }
    if (done.size === STEPS.length) {
      if (!api.awardStar('ritual', next)) { show(0); return; }
      api.toast('45 minutes · one premium ritual in every pedicure slot', 3600);
      next.textContent = 'Replay the ritual';
    } else {
      const missing = STEPS.findIndex((_, k) => !done.has(k));
      show(missing);
    }
  });

  return {
    enter() { show(cur, { fromUser: false }); },
    leave() { video.pause(); },
  };
}
