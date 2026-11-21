// 02 · The 45-minute ritual — steps follow Sea Miracle's own procedure video; clips are from that video.
const STEPS = [
  { title: 'Check & soak', min: 10, clip: 'media/step1_soak',
    text: 'Check the feet first — skip the ritual on open wounds, active infections, or bleeding or inflamed skin. Cleanse and soak, then dry the feet thoroughly.' },
  { title: 'Apply gel', min: 5, clip: 'media/step2_apply', gel: true,
    text: 'Wearing gloves, apply Heel Peel Foot Gel to the callus areas only. Keep it off the surrounding skin and place cotton pads to stop it dripping.' },
  { title: 'Wrap · 20 min', min: 20, clip: 'media/step3_wrap',
    text: 'Wrap the feet securely in film and let the gel work for about 20 minutes.' },
  { title: 'Remove & finish', min: 10, clip: 'media/step4_callus',
    text: 'Unwrap and remove the softened callus with a stainless-steel scraper or callus machine. Smooth with a buffer, rinse and nourish.' },
];
const TOTAL = STEPS.reduce((a, s) => a + s.min, 0); // ≈ 45
const CIRC = 2 * Math.PI * 27;

export function initRitual(api) {
  const pane = document.querySelector('[data-pane="ritual"]');
  const video = pane.querySelector('#stepVideo');
  const card = pane.querySelector('.clip-card');
  const stepBtns = [...pane.querySelectorAll('.step')];
  const next = pane.querySelector('#stepNext');
  const done = new Set();
  let cur = 0; let ringMin = 0; let raf = 0; let userPaused = api.reduceMotion;

  video.loop = !api.reduceMotion;
  const renderPaused = () => { card.classList.toggle('paused', video.paused); card.setAttribute('aria-label', video.paused ? 'Play the clip' : 'Pause the clip'); };
  video.addEventListener('play', renderPaused); video.addEventListener('pause', renderPaused);
  const togglePlay = () => { if (video.paused) { userPaused = false; video.play().catch(() => {}); } else { userPaused = true; video.pause(); } };
  card.addEventListener('click', togglePlay);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePlay(); } });

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
    pane.querySelector('#stepTag').textContent = `${String(i + 1).padStart(2, '0')} · ≈${s.min} min`;
    video.poster = s.clip + '.jpg';
    video.src = s.clip + '.mp4';
    if (!userPaused) video.play().catch(() => {});
    renderPaused();
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
      api.toast('About 45 minutes · one premium ritual in every pedicure slot', 3600);
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
