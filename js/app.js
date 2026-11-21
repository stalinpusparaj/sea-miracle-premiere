// Sea Miracle Premiere AR — core: tabs, stars, 3D/AR stage, partner + pass flows.
import { store } from './store.js';
import { audio, sfx, haptic, burst, burstFrom, flyStar } from './fx.js';
import { initRitual } from './ritual.js';
import { initProfit } from './profit.js';
import { initResults } from './results.js';

const CFG = window.SM_CONFIG || {};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const mv = $('#mv');
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const STAR_KEYS = ['bottle', 'ritual', 'profit', 'display', 'results'];
const STAR_LABEL = { bottle: 'Bottle', ritual: 'Ritual', profit: 'Profit', display: 'Display', results: 'Results' };
const STAR_HINT = { bottle: 'open the gel', ritual: 'walk the 4 steps', profit: 'try your numbers', display: 'place the display', results: 'see real results' };
const visible = (el) => !!el && el.getClientRects().length > 0;

/* ---------------- persistent state ---------------- */
const params = new URLSearchParams(location.search);
const table = (params.get('t') || params.get('table') || store.get('sm-table') || '').replace(/[^\w-]/g, '').slice(0, 12);
if (table) store.set('sm-table', table);
const readStars = () => new Set((store.get('sm-stars') || '').split(',').filter((k) => STAR_KEYS.includes(k)));
let stars = readStars();
function saveStars() {                       // merge with what another tab may have saved meanwhile
  stars = new Set([...readStars(), ...stars]);
  store.set('sm-stars', [...stars].join(','));
}
addEventListener('storage', (e) => { if (e.key === 'sm-stars') { stars = new Set([...stars, ...readStars()]); renderStars(); } });

function newPassCode() {                     // 6 characters from a 32-letter alphabet: ~1 billion codes
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return 'SM-' + [...b].map((x) => A[x % 32]).join('');
}
let passCode = store.get('sm-pass');
if (!/^SM-[A-Z2-9]{6}$/.test(passCode || '')) { passCode = newPassCode(); store.set('sm-pass', passCode); }

/* ---------------- helpers ---------------- */
let toastTimer = 0;
export function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
let liveTimer = 0;
export function announce(msg) {              // screen-reader only, for values that animate on screen
  const l = $('#srLive'); clearTimeout(liveTimer);
  liveTimer = setTimeout(() => { l.textContent = msg; }, 120);
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
  saveStars();
  const left = STAR_KEYS.filter((k) => !stars.has(k)).length;   // snapshot now: two stars can be in flight at once
  const target = $(`.star[data-star="${key}"]`);
  const src = visible(fromEl) ? fromEl : $(`.tab[data-tab="${key}"]`);
  sfx('star'); haptic([12, 40, 18]);
  burstFrom(src, { count: 26 });
  flyStar(src, target, () => {
    renderStars(); burstFrom(target, { count: 16, spread: .6 }); sfx('coin');
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
let pendingThanks = false; let thanksTimer = 0;
export function sendWhatsApp(text) {
  const url = waLink(text);
  if (!url) { toast('The Sea Miracle WhatsApp number isn’t set up yet — please ask the team at the event.', 4200); console.warn('SM_CONFIG.whatsappNumber is empty (public/js/config.js)'); return false; }
  sfx('whoosh');
  window.open(url, '_blank', 'noopener');
  pendingThanks = true; clearTimeout(thanksTimer);
  thanksTimer = setTimeout(() => { if (document.visibilityState === 'visible') pendingThanks = false; }, 1500);   // WhatsApp never opened
  return true;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !pendingThanks) return;
  pendingThanks = false;
  setTimeout(() => { toast('Sent it? The Sea Miracle team will reply on WhatsApp.', 3800); sfx('chime'); burst(innerWidth / 2, innerHeight * .35, { count: 40 }); }, 400);
});
function contextLine() {
  return [`Event: ${CFG.eventName || 'Sea Miracle Premiere'}`, table && `Table: ${table}`, `Stars: ${stars.size}/5`, `Pass: ${passCode}`].filter(Boolean).join('\n');
}

/* ---------------- modals (focus stays inside; page behind is inert) ---------------- */
const BACKGROUND = ['#top', '#mv', '#sheet', '#dock', '#partnerFab'];
const setBackgroundInert = (on) => BACKGROUND.forEach((s) => { const el = $(s); if (el) el.inert = on; });
let openModalEl = null; let lastFocus = null;
function openModal(id) {
  const m = $('#' + id);
  if (!m.hidden) return;
  if (openModalEl && openModalEl !== m) closeModal(openModalEl, { restore: false });
  const a = document.activeElement; if (!a || !a.closest('.modal')) lastFocus = a;
  m.hidden = false; openModalEl = m; setBackgroundInert(true);
  sfx('whoosh'); haptic(10);
  setTimeout(() => (m.querySelector('input, button:not([data-close])') || m).focus(), 60);
}
function closeModal(m, { restore = true } = {}) {
  m.hidden = true;
  if (openModalEl === m) openModalEl = null;
  if (!openModalEl) setBackgroundInert(false);
  if (restore && lastFocus && visible(lastFocus)) lastFocus.focus();
}
$$('.modal').forEach((m) => {
  m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) closeModal(m); });
  m.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(m); return; }
    if (e.key !== 'Tab') return;
    const f = $$('button, input, [tabindex]:not([tabindex="-1"])', m).filter((el) => visible(el) && !el.disabled);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
});
export function openPartner() { openModal('partner'); }

$('#partnerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.currentTarget; const d = new FormData(f);
  const name = String(d.get('name') || '').trim(), salon = String(d.get('salon') || '').trim(), city = String(d.get('city') || '').trim();
  const err = $('#formErr');
  if (!name || !salon || !city) { err.textContent = 'Please add your name, salon and city.'; (!name ? f.name : !salon ? f.salon : f.city).focus(); return; }
  err.textContent = '';
  const interest = d.getAll('interest').join(', ') || 'Not sure yet';
  const msg = `Hello Sea Miracle! I saw the premiere and I'd like to become a partner.\n\nName: ${name}\nSalon/store: ${salon}\nCity: ${city}\nInterested in: ${interest}\n\n${contextLine()}`;
  store.set('sm-lead', JSON.stringify({ name, salon, city }));
  if (sendWhatsApp(msg)) { burstFrom(f.querySelector('.wa'), { count: 30 }); closeModal($('#partner')); }
});
(() => { // prefill a returning visitor on their own phone
  const l = store.json('sm-lead'); if (!l) return;
  const f = $('#partnerForm'); f.name.value = l.name || ''; f.salon.value = l.salon || ''; f.city.value = l.city || '';
})();

function openPass() {
  if (!$('#pass').hidden) return;
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
mv.addEventListener('quick-look-button-tapped', openPartner);   // iOS Quick Look banner

// In Chrome's WebXR AR only the overlay is drawn, so leave AR first and open the form when the session ends.
let partnerAfterAR = false;
$('#arPartner').addEventListener('click', () => {
  const exit = mv.shadowRoot && mv.shadowRoot.querySelector('.slot.exit-webxr-ar-button');
  if (exit) { partnerAfterAR = true; exit.click(); } else openPartner();
});

/* ---------------- 3D stage ---------------- */
const MODELS = {
  bottle: {
    src: 'models/bottle.glb',
    ios: 'models/bottle.usdz#callToAction=Become%20a%20Partner&checkoutTitle=Heel%20Peel%20Foot%20Gel&checkoutSubtitle=Sea%20Miracle%20%C2%B7%20Professional%20foot%20care',
    orbit: '0deg 80deg 0.42m', target: '0m 0.077m 0m', min: 'auto 20deg 0.19m', max: 'auto 100deg 0.9m', fov: '30deg',
    ar: 'View on your table', alt: '3D model of the Sea Miracle Heel Peel Foot Gel bottle, 150 ml',
  },
  display: {
    src: 'models/display.glb',
    ios: 'models/display.usdz#callToAction=Become%20a%20Partner&checkoutTitle=Partner%20counter%20display&checkoutSubtitle=Concept%20%C2%B7%20Sea%20Miracle',
    orbit: '24deg 74deg 2.45m', target: '0m 0.33m 0m', min: 'auto 20deg 0.8m', max: 'auto 100deg 3.4m', fov: '30deg',
    ar: 'Place it on your counter', alt: '3D model of a concept Sea Miracle counter display holding 15 Heel Peel bottles',
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
  $('#arHint').textContent = key === 'display' ? 'Drag the display to move it · twist with two fingers to turn' : 'Drag the bottle to move it · twist with two fingers to turn';
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
if (REDUCE) mv.autoRotate = false;

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
  const st = e.detail.status;
  if (st === 'object-placed') { sfx('pop'); haptic(20); }
  if (st === 'failed') toast('AR isn’t available on this phone — you can still explore in 3D.', 3600);
  if (st === 'not-presenting' && partnerAfterAR) { partnerAfterAR = false; setTimeout(openPartner, 300); }
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
    opening = false; mv.classList.remove('lid-open'); mv.autoRotate = !REDUCE;
    awardStar('bottle', fromEl || $('.hotspot.lid'));
  }, 4200);
}
$('.hotspot.lid').addEventListener('click', (e) => openGel(e.currentTarget));
$('#arOpen').addEventListener('click', (e) => { if (modelKey === 'bottle') openGel(e.currentTarget); });

// claim hotspots
const seenClaims = new Set(); let claimsToastDone = false;
$$('.hotspot.claim').forEach((h) => h.addEventListener('click', () => {
  const on = !h.classList.contains('show');
  $$('.hotspot.claim').forEach((o) => o.classList.remove('show'));
  h.classList.toggle('show', on); h.classList.add('seen');
  sfx('tap'); haptic(8);
  if (on) { burstFrom(h, { count: 10, spread: .5 }); seenClaims.add(h.dataset.claim); }
  if (seenClaims.size === 4 && !claimsToastDone) { claimsToastDone = true; toast('You’ve explored every claim — now tap the cap to open it'); }
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
function renderMute() { $('#muteBtn').setAttribute('aria-pressed', String(audio.muted)); }
$('#muteBtn').addEventListener('click', () => { audio.muted = !audio.muted; renderMute(); if (!audio.muted) sfx('chime'); });
renderMute();

/* ---------------- splash ---------------- */
$('#splashEvent').textContent = CFG.eventName || 'Sea Miracle Premiere';
if (table) { const st = $('#splashTable'); st.hidden = false; st.textContent = `Table ${table}`; }
if (stars.size) $('#beginBtn').textContent = stars.size === 5 ? 'Open my Partner Pass' : `Continue · ${stars.size}/5 stars`;
setBackgroundInert(true);                    // nothing behind the splash is reachable until it is dismissed
$('#beginBtn').addEventListener('click', (e) => {
  audio.unlock(); sfx('chime'); haptic(14);
  burstFrom(e.currentTarget, { count: 40 });
  document.body.classList.remove('is-splash');
  $('#splash').inert = true; setBackgroundInert(false);
  if (e.detail === 0) setTimeout(() => { if (!openModalEl) $('.tab[aria-current="page"]').focus({ preventScroll: true }); }, 650);   // keyboard users land on the dock
  setTimeout(() => {
    if (stars.size === 5) openPass();
    else toast(stars.size ? 'Welcome back — keep collecting stars' : 'Tap the gold cap to open the bottle ✨', 3200);
  }, 700);
});
document.addEventListener('pointerdown', () => audio.unlock(), { once: true });

/* ---------------- features ---------------- */
const api = { awardStar, toast, announce, sfx, haptic, burst, burstFrom, openGel, sendWhatsApp, contextLine, openPartner, config: CFG, mv, store, reduceMotion: REDUCE };
features.ritual = initRitual(api);
features.profit = initProfit(api);
features.results = initResults(api);
renderStars();
setTab('bottle', { silent: true });
