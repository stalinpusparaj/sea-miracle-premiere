// Sound (synthesised with Web Audio — no files to download), haptics and gold particle bursts.

import { store } from './store.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let ctx = null;
let muted = store.get('sm-muted') === '1';

export const audio = {
  unlock() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  },
  get muted() { return muted; },
  set muted(v) { muted = !!v; store.set('sm-muted', muted ? '1' : '0'); },
};

function tone(freq, start, dur, { type = 'sine', gain = .18, glideTo = null } = {}) {
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + .012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + dur + .02);
}

function noise(start, dur, { gain = .12, from = 400, to = 3000 } = {}) {
  const t0 = ctx.currentTime + start;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(ctx.destination); src.start(t0);
}

const SOUNDS = {
  tap() { tone(880, 0, .08, { gain: .07 }); },
  chime() { [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, i * .07, .5, { gain: .1 })); },
  star() { [1318.5, 1568, 2093, 2637].forEach((f, i) => tone(f, i * .06, .45, { type: 'triangle', gain: .09 })); noise(0, .35, { gain: .04, from: 3000, to: 9000 }); },
  pop() { tone(320, 0, .14, { glideTo: 900, gain: .14 }); noise(0, .08, { gain: .05, from: 1200, to: 4000 }); },
  whoosh() { noise(0, .45, { gain: .1, from: 300, to: 4000 }); },
  coin() { tone(1567, 0, .09, { type: 'square', gain: .05 }); tone(2093, .08, .3, { type: 'square', gain: .05 }); },
  fanfare() { [523.3, 659.3, 784, 1046.5, 1318.5, 1568].forEach((f, i) => tone(f, i * .09, .7, { type: 'triangle', gain: .09 })); noise(.3, .9, { gain: .05, from: 2000, to: 10000 }); },
};

export function sfx(name) {
  if (muted || !ctx || !SOUNDS[name]) return;
  try { SOUNDS[name](); } catch { /* audio is a nice-to-have */ }
}

export function haptic(pattern = 12) { if (!muted && navigator.vibrate) navigator.vibrate(pattern); }

/* ---------------- particles ---------------- */
const canvas = document.getElementById('fx');
const c2d = canvas.getContext('2d');
let parts = []; let raf = 0; let dpr = 1; let lastT = 0;
const GOLDS = ['#F7EB8A', '#F3D959', '#F0B735', '#FFF6C9', '#FFFFFF'];

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
}
addEventListener('resize', resize); resize();

function starPath(r) {
  c2d.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r; c2d.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c2d.closePath();
}

function loop(now) {
  const f = lastT ? Math.min(4, (now - lastT) / (1000 / 60)) : 1;   // frames elapsed at 60 fps
  lastT = now;
  c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  c2d.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    const drag = p.drag ** f;
    p.life -= f / 60; p.vy += p.g * f; p.vx *= drag; p.vy *= drag; p.x += p.vx * f; p.y += p.vy * f; p.rot += p.vr * f;
    const a = Math.max(0, Math.min(1, p.life / p.max * 1.6));
    c2d.save(); c2d.globalAlpha = a; c2d.translate(p.x, p.y); c2d.rotate(p.rot); c2d.fillStyle = p.color;
    if (p.shape === 'star') { starPath(p.size); c2d.fill(); }
    else if (p.shape === 'rect') { c2d.fillRect(-p.size, -p.size * .45, p.size * 2, p.size * .9); }
    else { c2d.shadowColor = p.color; c2d.shadowBlur = 8; c2d.beginPath(); c2d.arc(0, 0, p.size * .5, 0, 7); c2d.fill(); }
    c2d.restore();
  }
  raf = parts.length ? requestAnimationFrame(loop) : 0;
  if (!raf) { c2d.clearRect(0, 0, innerWidth, innerHeight); lastT = 0; }
}

/** Gold burst from a screen point. kind: 'burst' | 'confetti' | 'coins' */
export function burst(x, y, { count = 28, kind = 'burst', spread = 1 } = {}) {
  if (reduceMotion) count = Math.min(count, 8);
  for (let i = 0; i < count; i++) {
    const ang = kind === 'confetti' ? -Math.PI / 2 + (Math.random() - .5) * 2.2 : Math.random() * Math.PI * 2;
    const sp = (kind === 'confetti' ? 9 + Math.random() * 9 : 2.5 + Math.random() * 6) * spread;
    const max = kind === 'confetti' ? 2.4 + Math.random() : .9 + Math.random() * .6;
    parts.push({
      x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: kind === 'confetti' ? .22 : .08, drag: kind === 'confetti' ? .985 : .95,
      rot: Math.random() * 6, vr: (Math.random() - .5) * .3, life: max, max,
      size: kind === 'coins' ? 7 + Math.random() * 4 : 3 + Math.random() * 6,
      shape: kind === 'confetti' ? (Math.random() < .5 ? 'rect' : 'star') : (Math.random() < .55 ? 'star' : 'dot'),
      color: GOLDS[(Math.random() * GOLDS.length) | 0],
    });
  }
  if (!raf) raf = requestAnimationFrame(loop);
}

export function burstFrom(el, opts) {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, opts);
}

/** Fly a gold star from an element to a target element, then call done(). */
export function flyStar(fromEl, toEl, done) {
  const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  const s = document.createElement('div');
  s.style.cssText = `position:fixed;z-index:70;left:${a.left + a.width / 2 - 18}px;top:${a.top + a.height / 2 - 18}px;width:36px;height:36px;pointer-events:none;
    background:linear-gradient(100deg,#F7EB8A,#F3D959 45%,#F0B735);clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
    filter:drop-shadow(0 0 10px #F7EB8A)`;
  document.body.appendChild(s);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = s.animate([
    { transform: 'translate(0,0) scale(.4) rotate(0)', opacity: 0 },
    { transform: `translate(${dx * .25}px,${dy * .25 - 80}px) scale(1.6) rotate(140deg)`, opacity: 1, offset: .35 },
    { transform: `translate(${dx}px,${dy}px) scale(.5) rotate(360deg)`, opacity: 1 },
  ], { duration: reduceMotion ? 10 : 900, easing: 'cubic-bezier(.5,0,.3,1)' });
  anim.onfinish = () => { s.remove(); done && done(); };
}
