// Sea Miracle Premiere AR — core: tabs, stars, 3D/AR stage, partner + pass flows.
import { audio, sfx, haptic, burst, burstFrom, flyStar } from './fx.js';
import { initRitual } from './ritual.js';
import { initProfit } from './profit.js';
import { initResults } from './results.js';

const CFG = window.SM_CONFIG || {};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const mv = $('#mv');
const STAR_KEYS = ['bottle', 'ritual', 'profit', 'display', 'results'];
const STAR_LABEL = { bottle: 'Bottle', ritual: 'Ritual', profit: 'Profit', display: 'Display', results: 'Results' };
const STAR_HINT = { bottle: 'open the gel', ritual: 'walk the 4 steps', profit: 'try your numbers', display: 'place the display', results: 'see 4 real results' };

/* ---------------- persistent state ---------------- */
const params = new URLSearchParams(location.search);
const table = (params.get('t') || params.get('table') || localStorage.getItem('sm-table') || '').replace(/[^\w-]/g, '').slice(0, 12);
if (table) localStorage.setItem('sm-table', table);
let stars = new Set((localStorage.getItem('sm-stars') || '').split(',').filter((k) => STAR_KEYS.includes(k)));
let passCode = localStorage.getItem('sm-pass');
if (!passCode) { passCode = 'SM-' + String(Math.floor(1000 + Math.random() * 9000)); localStorage.setItem('sm-pass', passCode); }

/* ---------------- helpers ---------------- */
let toastTimer = 0;
export function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
function stageNote(msg) { const n = $('#stageNote'); n.textContent = msg; n.classList.toggle('show', !!msg); }

function renderStars() {
  STAR_KEYS.forEach((k) => {
    $(`.star[data-star="${k}"]`).classList.toggle('on', stars.has(k));
    $(`.tab[data-tab="${k}"]`).classList.toggle('earned', stars.has(k));
  });
  $('#stars').setAttribute('aria-label', `${stars.size} of 5 stars collected — show what's left`);
  updateNextCta();
}

/* "Next star" guidance at the end of each pane */
function updateNextCta() {
  const btn = $('#nextCta'); const cur = document.body.dataset.tab;
  if (stars.size === 5) { btn.dataset.go = 'pass'; $('#nextLabel').textContent = 'All 5 stars — open my Premiere Partner Pass'; btn.hidden = false; return; }
  if (!stars.has(cur)) { btn.hidden = true; return; }
  const next = STAR_KEYS.find((k) => !stars.has(k));
  btn.dataset.go = next; $('#nextLabel').textContent = `Next star: ${STAR_LABEL[next]} — ${STAR_HINT[next]}`; btn.hidden = false;
}
$('#nextCta').addEventListener('click', () => { const go = $('#nextCta').dataset.go; if (go === 'pass') openPass(); else setTab(go); });
$('#stars').addEventListener('click', () => {
  const left = STAR_KEYS.filter((k) => !stars.has(k));
  sfx('tap'); haptic(6);
  if (!left.length) { openPass(); return; }
  toast(`${stars.size}/5 · still to collect: ${left.map((k) => STAR_LABEL[k]).join(' · ')}`, 3200);
});

export function awardStar(key, fromEl) {
  if (stars.has(key)) return false;
  stars.add(key);
  localStorage.setItem('sm-stars', [...stars].join(','));
  const target = $(`.star[data-star="${key}"]`);
  const src = fromEl || $(`.tab[data-tab="${key}"]`);
  sfx('star'); haptic([12, 40, 18]);
  burstFrom(src, { count: 26 });
  flyStar(src, target, () => {
    renderStars(); burstFrom(target, { count: 16, spread: .6 }); sfx('coin');
    const left = 5 - stars.size;
    toast(left ? `★ ${STAR_LABEL[key]} star collected — ${left} to go` : '★ All 5 stars! Your Premiere Partner Pass is ready');
    if (!left) setTimeout(openPass, 1100);
  });
  return true;
}

/* ---------------- WhatsApp ---------------- */
function waLink(text) {
  const num = String(CFG.whatsappNumber || '').replace(/\D/g, '');
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
export function sendWhatsApp(text) {
  const url = waLink(text);
  if (!url) { toast('The Sea Miracle WhatsApp number isn’t set up yet — please ask the team at the event.', 4200); console.warn('SM_CONFIG.whatsappNumber is empty (public/js/config.js)'); return false; }
  sfx('whoosh');
  window.open(url, '_blank', 'noopener');
  pendingThanks = true;
  return true;
}
let pendingThanks = false;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !pendingThanks) return;
  pendingThanks = false;
  setTimeout(() => { toast('Thank you! The Sea Miracle team will reply on WhatsApp.', 3800); sfx('chime'); burst(innerWidth / 2, innerHeight * .35, { count: 40 }); }, 400);
});
function contextLine() {
  return [`Event: ${CFG.eventName || 'Sea Miracle Premiere'}`, table && `Table: ${table}`, `Stars: ${stars.size}/5`, `Pass: ${passCode}`].filter(Boolean).join('\n');
}

/* ---------------- modals ---------------- */
let lastFocus = null;
function openModal(id) {
  const m = $('#' + id); lastFocus = document.activeElement;
  m.hidden = false; sfx('whoosh'); haptic(10);
  setTimeout(() => (m.querySelector('input, button:not([data-close])') || m).focus(), 60);
}
function closeModal(m) { m.hidden = true; lastFocus && lastFocus.focus && lastFocus.focus(); }
$$('.modal').forEach((m) => {
  m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) closeModal(m); });
  m.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(m); });
});
export function openPartner() { openModal('partner'); }

$('#partnerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.currentTarget; const d = new FormData(f);
  const name = String(d.get('name') || '').trim(), salon = String(d.get('salon') || '').trim(), city = String(d.get('city') || '').trim();
  const err = $('#formErr');
  if (!name || !salon || !city) { err.textContent = 'Please add your name, salon and city.'; (f.name.value ? (f.salon.value ? f.city : f.salon) : f.name).focus(); return; }
  err.textContent = '';
  const interest = d.getAll('interest').join(', ') || 'Not sure yet';
  const msg = `Hello Sea Miracle! I saw the premiere and I'd like to become a partner.\n\nName: ${name}\nSalon/store: ${salon}\nCity: ${city}\nInterested in: ${interest}\n\n${contextLine()}`;
  localStorage.setItem('sm-lead', JSON.stringify({ name, salon, city }));
  if (sendWhatsApp(msg)) { burstFrom(f.querySelector('.wa'), { count: 30 }); closeModal($('#partner')); }
});
(() => { // prefill a returning visitor
  try { const l = JSON.parse(localStorage.getItem('sm-lead') || 'null'); if (l) { const f = $('#partnerForm'); f.name.value = l.name; f.salon.value = l.salon; f.city.value = l.city; } } catch { /* ignore */ }
})();

function openPass() {
  $('#passCode').textContent = passCode;
  $('#passTable').textContent = table ? `Table ${table} · ${CFG.eventName || 'Sea Miracle Premiere'}` : (CFG.eventName || 'Sea Miracle Premiere');
  $('#passOffer').textContent = CFG.passOffer || '';
  openModal('pass'); sfx('fanfare'); haptic([20, 60, 20, 60, 40]);
  burst(innerWidth / 2, innerHeight * .9, { count: 140, kind: 'confetti' });
  setTimeout(() => burst(innerWidth * .2, innerHeight * .8, { count: 60, kind: 'confetti' }), 350);
  setTimeout(() => burst(innerWidth * .8, innerHeight * .8, { count: 60, kind: 'confetti' }), 600);
}
$('#passClaim').addEventListener('click', () => {
  sendWhatsApp(`Hello Sea Miracle! I collected all 5 stars at the premiere and unlocked my Premiere Partner Pass (${passCode}). I'd like to claim the partner offer.\n\n${contextLine()}`);
});
$('#partnerFab').addEventListener('click', openPartner);
$('#arPartner').addEventListener('click', openPartner);
mv.addEventListener('quick-look-button-tapped', openPartner);   // iOS Quick Look banner

/* ---------------- 3D stage ---------------- */
const MODELS = {
  bottle: {
    src: 'models/bottle.glb',
    ios: 'models/bottle.usdz#callToAction=Become%20a%20Partner&checkoutTitle=Heel%20Peel%20Foot%20Gel&checkoutSubtitle=Sea%20Miracle%20%C2%B7%20Professional%20foot%20care',
    orbit: '0deg 80deg 0.66m', target: '0m 0.122m 0m', min: 'auto 20deg 0.3m', max: 'auto 100deg 1.4m', fov: '30deg',
    ar: 'View on your table', alt: '3D model of the Sea Miracle Heel Peel Foot Gel bottle',
  },
  display: {
    src: 'models/display.glb',
    ios: 'models/display.usdz#callToAction=Become%20a%20Partner&checkoutTitle=Partner%20counter%20display&checkoutSubtitle=Concept%20%C2%B7%20Sea%20Miracle',
    orbit: '24deg 74deg 2.7m', target: '0m 0.40m 0m', min: 'auto 20deg 0.9m', max: 'auto 100deg 3.6m', fov: '30deg',
    ar: 'Place it on your counter', alt: '3D model of a concept Sea Miracle partner counter display with 12 Heel Peel bottles',
  },
};
let modelKey = 'bottle';
function setModel(key) {
  if (key === modelKey) return;
  modelKey = key; const m = MODELS[key];
  $('.mv-progress').classList.remove('done');
  mv.classList.toggle('is-display', key === 'display');
  mv.setAttribute('ios-src', m.ios);
  mv.src = m.src; mv.alt = m.alt;
  mv.cameraTarget = m.target; mv.minCameraOrbit = m.min; mv.maxCameraOrbit = m.max; mv.fieldOfView = m.fov; mv.cameraOrbit = m.orbit;
  $('#arLabel').textContent = m.ar;
  $('#arHint').textContent = key === 'display' ? 'Point at your counter · tap to place' : 'Point at the table · tap to place · pinch to turn';
}
mv.addEventListener('progress', (e) => {
  $('.mv-progress-fill').style.width = `${Math.round(e.detail.totalProgress * 100)}%`;
  if (e.detail.totalProgress >= 1) $('.mv-progress').classList.add('done');
});
mv.addEventListener('load', () => {
  mv.cameraOrbit = MODELS[modelKey].orbit; mv.jumpCameraToGoal();
  if (modelKey === 'display') {
    const d = mv.getDimensions();
    $('#dimW').textContent = Math.round(d.x * 100); $('#dimD').textContent = Math.round(d.z * 100); $('#dimH').textContent = Math.round(d.y * 100);
  }
});
mv.addEventListener('error', () => toast('The 3D model could not load. Check your connection and try again.', 4000));

// AR needs the phone's real browser: in-app browsers (Instagram, WhatsApp, Facebook...) and laptops can't place it
const IN_APP = /FBAN|FBAV|Instagram|WhatsApp|Line[/]|Snapchat|MicroMessenger|; wv[)]/i.test(navigator.userAgent);
let arChecked = false;
mv.addEventListener('load', () => {
  if (arChecked) return; arChecked = true;
  const noAR = !mv.canActivateAR || IN_APP;
  $$('.ar-note').forEach((n) => {
    n.hidden = !noAR;
    if (noAR && !matchMedia('(pointer: coarse)').matches) n.querySelector('span').textContent = 'Open this page on your phone to place it in AR.';
  });
});
$$('[data-copy-link]').forEach((b) => b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Link copied — paste it into Chrome or Safari'); }
  catch { toast(location.href, 5000); }
}));

// AR launch — the star is awarded on launch because Scene Viewer / Quick Look give no "placed" event
$('#arBtn').addEventListener('click', () => {
  sfx('whoosh'); haptic(14);
  const key = modelKey;
  setTimeout(() => awardStar(key, $('#arBtn')), 1200);
});
mv.addEventListener('ar-status', (e) => {
  if (e.detail.status === 'object-placed') { sfx('pop'); haptic(20); }
  if (e.detail.status === 'failed') toast('AR isn’t available on this phone — you can still explore in 3D.', 3600);
});

// open the gel (lid flips, a drop falls)
let opening = false;
export function openGel(fromEl) {
  if (opening || modelKey !== 'bottle') return;
  opening = true;
  const lid = $('.hotspot.lid'); const r = lid.getBoundingClientRect();   // measure before the hotspot hides
  mv.autoRotate = false;
  mv.classList.add('lid-open');
  mv.animationName = 'Open';
  mv.currentTime = 0;
  mv.play({ repetitions: 1 });
  sfx('pop'); haptic(16);
  if (r.width) burst(r.left + r.width / 2, r.top + r.height / 2, { count: 30 });
  setTimeout(() => { sfx('chime'); }, 2100);
  setTimeout(() => {
    opening = false; mv.classList.remove('lid-open'); mv.autoRotate = true;
    awardStar('bottle', fromEl || $('.hotspot.lid'));
  }, 4200);
}
$('.hotspot.lid').addEventListener('click', (e) => openGel(e.currentTarget));
$('#arOpen').addEventListener('click', (e) => { if (modelKey === 'bottle') openGel(e.currentTarget); });

// claim hotspots
const seenClaims = new Set();
$$('.hotspot.claim').forEach((h) => h.addEventListener('click', () => {
  const on = !h.classList.contains('show');
  $$('.hotspot.claim').forEach((o) => o.classList.remove('show'));
  h.classList.toggle('show', on); h.classList.add('seen');
  sfx('tap'); haptic(8);
  if (on) { burstFrom(h, { count: 10, spread: .5 }); seenClaims.add(h.dataset.claim); }
  if (seenClaims.size === 4 && !h.dataset.done) { h.dataset.done = '1'; toast('You’ve explored every claim — now tap the cap to open it'); }
}));

// display star also earned by exploring it in 3D for a few seconds
let displayExplore = 0;
mv.addEventListener('camera-change', (e) => {
  if (modelKey !== 'display' || e.detail.source !== 'user-interaction' || stars.has('display')) return;
  if (!displayExplore) displayExplore = performance.now();
  else if (performance.now() - displayExplore > 5000) awardStar('display', $('#arBtn'));
});

/* ---------------- tabs ---------------- */
const features = {};
function setTab(name, { silent = false } = {}) {
  const prev = document.body.dataset.tab;
  document.body.dataset.tab = name;
  $$('.tab').forEach((t) => (t.dataset.tab === name ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
  $$('.pane').forEach((p) => { p.hidden = p.dataset.pane !== name; });
  setModel(name === 'display' ? 'display' : 'bottle');
  mv.interactionPrompt = name === 'bottle' || name === 'display' ? 'auto' : 'none';
  stageNote('');
  if (prev !== name) { features[prev]?.leave?.(); features[name]?.enter?.(); }
  updateNextCta();
  $('#sheet').scrollTop = 0;
  if (!silent) { sfx('tap'); haptic(6); }
}
$$('.tab').forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));

// keep the AR button and partner button just above the sheet
new ResizeObserver(([e]) => document.documentElement.style.setProperty('--sheet-h', `${Math.round(e.target.getBoundingClientRect().height)}px`)).observe($('#sheet'));

/* ---------------- sound toggle ---------------- */
function renderMute() { const b = $('#muteBtn'); b.setAttribute('aria-pressed', String(audio.muted)); b.setAttribute('aria-label', audio.muted ? 'Sound on' : 'Sound off'); }
$('#muteBtn').addEventListener('click', () => { audio.muted = !audio.muted; renderMute(); if (!audio.muted) sfx('chime'); });
renderMute();

/* ---------------- splash ---------------- */
$('#splashEvent').textContent = CFG.eventName || 'Sea Miracle Premiere';
if (table) { const st = $('#splashTable'); st.hidden = false; st.textContent = `Table ${table}`; }
if (stars.size) $('#beginBtn').textContent = stars.size === 5 ? 'Open my Partner Pass' : `Continue · ${stars.size}/5 stars`;
$('#beginBtn').addEventListener('click', (e) => {
  audio.unlock(); sfx('chime'); haptic(14);
  burstFrom(e.currentTarget, { count: 40 });
  document.body.classList.remove('is-splash');
  setTimeout(() => {
    if (stars.size === 5) openPass();
    else toast(stars.size ? 'Welcome back — keep collecting stars' : 'Tap the gold cap to open the bottle ✨', 3200);
  }, 700);
});
document.addEventListener('pointerdown', () => audio.unlock(), { once: true });

/* ---------------- features ---------------- */
const api = { awardStar, toast, sfx, haptic, burst, burstFrom, openGel, sendWhatsApp, contextLine, openPartner, config: CFG, mv };
features.ritual = initRitual(api);
features.profit = initProfit(api);
features.results = initResults(api);
renderStars();
setTab('bottle', { silent: true });
