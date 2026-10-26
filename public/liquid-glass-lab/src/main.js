import { createRenderer, PERSPECTIVE } from './render.js';
import { drawSection } from './section.js';
import { createLink } from './link.js';
import { drawPage } from './page.js';

const BASE = {
  thick: 40, bevel: 5, curve: 2, cut: 0, body: 0, lens: 0.9, merge: 30,
  ior: 1.9, disp: 0, frost: 0, flip: -1,
  light: -20, elev: 21, spec: 0.1, refl: 0.8, studio: 1, rim: 0.5, irid: 0,
  tintA: 0.06, shadow: 0.28, caustic: 0,
  tilt: 0.8, settle: 0.7,
  rimDir: 1, shadowDist: 16, shadowBlur: 30, sat: 1.1,
};

const PRESETS = [
  ['clear', 'Clear lens', BASE],
  ['frosted', 'Frosted', { ...BASE, frost: 6, tintA: 0.28, refl: 0.6 }],
  ['prism', 'Prism', { ...BASE, disp: 0.08, rim: 0.6 }],
  ['pebble', 'Pebble', { ...BASE, thick: 46, ior: 1.6, bevel: 44, curve: 2.2, body: 1, lens: 0.4, spec: 0.45, shadow: 0.38 }],
  ['bubble', 'Soap bubble', { ...BASE, thick: 22, ior: 1.33, disp: 0.12, bevel: 30, lens: 0.3, irid: 0.75, refl: 0.9, tintA: 0, rim: 0.4 }],
  ['slab', 'Cut slab', { ...BASE, thick: 30, ior: 1.7, bevel: 16, curve: 1, cut: 0.25, lens: 0, spec: 0.3 }],
  ['css', 'CSS blur', { ...BASE, thick: 0, ior: 1, bevel: 2, lens: 0, merge: 0, frost: 26, flip: 1, light: 0, elev: 45, spec: 0, refl: 0, rim: 0.14, rimDir: 0, tintA: 0.7, shadow: 0.45, shadowDist: 18, shadowBlur: 50, sat: 1.3, tilt: 0 }],
];

const GROUPS = [
  {
    title: 'Form', note: 'changes the shape', items: [
      ['thick', 'Thickness', 0, 90, 1, 'px'],
      ['bevel', 'Bevel width', 2, 80, 1, 'px', 'how far the rounded rim reaches in from the outline'],
      ['curve', 'Edge curvature', 1, 6, 0.1, '', '1 straight chamfer · 2 round · 4+ square shoulder'],
      ['cut', 'Edge cut', -0.7, 0.9, 0.01, '', 'below 0 a raised wall at the outline · above 0 a shallow cap'],
      ['body', 'Body', 0, 1, 0.01, '', '0 extruded like a glass rod · 1 an oval dome'],
      ['lens', 'Dome', 0, 1.5, 0.05, '', 'extra curvature that magnifies'],
      ['merge', 'Liquid merge', 0, 90, 1, 'px', 'how eagerly the two drops fuse'],
    ],
  },
  {
    title: 'Optics', items: [
      ['ior', 'Index of refraction', 1, 2.4, 0.01, ''],
      ['disp', 'Dispersion', 0, 0.35, 0.005, '', 'rainbow fringes at the rim'],
      ['frost', 'Frost', 0, 40, 0.5, 'px'],
      ['flip', 'Rim pulls outside content in', 'toggle'],
    ],
  },
  {
    title: 'Light', items: [
      ['light', 'Light angle', -180, 180, 1, '°'],
      ['elev', 'Light height', 10, 80, 1, '°'],
      ['spec', 'Specular', 0, 2, 0.05, ''],
      ['refl', 'Fresnel reflection', 0, 1.5, 0.05, ''],
      ['studio', 'Reflected light', 0, 1, 0.01, '', '0 a dark room keeps glass clear · 1 bright surroundings'],
      ['rim', 'Rim light', 0, 1.2, 0.02, ''],
      ['irid', 'Iridescence', 0, 1.2, 0.05, ''],
      ['follow', 'Light follows the pointer', 'state'],
    ],
  },
  {
    title: 'Surface', items: [
      ['tintA', 'Tint', 0, 0.9, 0.01, ''],
      ['shadow', 'Shadow', 0, 1, 0.01, ''],
      ['caustic', 'Caustic', 0, 1, 0.01, '', 'light focused onto the page below'],
    ],
  },
  {
    title: 'Motion', items: [
      ['tilt', 'Drag tilt', 0, 2, 0.05, '', 'tips like a stone pulled across a table by a rope'],
      ['settle', 'Tilt settle', 0.2, 1.5, 0.05, '', 'low values rock before settling'],
    ],
  },
];

const SLIDERS = GROUPS.flatMap(g => g.items).filter(i => typeof i[2] === 'number');
const SHAPES = ['circle', 'rect', 'capsule', 'group'];
const BACKDROPS = ['lines', 'grid', 'rings', 'page'];
const LIGHT_BACKDROPS = ['grid', 'page'];
const GROUP = [
  [-1, -92, -38, 34, 90],
  [0, -58, -40, 22, 70],
  [-1, 96, 30, 40, 110],
  [2, 62, 44, 26, 80],
  [3, 36, 34, 16, 60],
  [-1, -16, 94, 30, 95],
  [5, -46, 40, 20, 70],
  [-1, 24, -90, 26, 100],
];
const SHAPE_FLOOR = { group: { body: 0.4 } };
const DEFAULTS = { shape: 'rect', backdrop: 'page' };

function withShape(values, shape) {
  const next = { ...values };
  const floor = SHAPE_FLOOR[shape];
  if (!floor) return next;
  for (const [key, min] of Object.entries(floor)) if (values.thick > 0) next[key] = Math.max(values[key], min);
  return next;
}

const link = createLink({
  fields: [...SLIDERS.map(([key, , min, , step]) => ({ key, min, step })), { key: 'flip', min: -1, step: 2 }],
  presets: PRESETS,
  presetFor: (i, shape) => withShape(PRESETS[i][2], shape),
  shapes: SHAPES,
  backdrops: BACKDROPS,
  defaults: DEFAULTS,
});
const PANEL_SPACE = 372;
const MOBILE = 760;

const state = {
  shape: 'rect',
  backdrop: 'page',
  drop: true,
  follow: false,
  along: false,
  preset: 'clear',
  base: 'clear',
  p: { ...BASE },
  panelHidden: false,
  pointer: null,
  scroll: 0,
  drag: null,
  dirty: true,
};

const $ = s => document.querySelector(s);
const canvas = $('#gl');
const renderer = createRenderer(canvas);
if (!renderer) {
  document.body.classList.add('no-webgl');
  throw new Error('WebGL2 unavailable');
}

const bodyOf = (x, y) => ({ x, y, vx: 0, vy: 0, tx: 0, ty: 0, tvx: 0, tvy: 0 });
let shape = null;
let main = bodyOf(0, 0);
let second = bodyOf(0, 0);
let blobs = [];
let groupScale = 1;
let pageHeight = 0;
let pageKey = '';
let pan = null;

function area() {
  const mobile = innerWidth <= MOBILE;
  if (mobile) {
    const sheet = Math.min(innerHeight * 0.5, 460);
    return { x: 0, y: 64, w: innerWidth, h: innerHeight - sheet - 64 };
  }
  return { x: 0, y: 0, w: innerWidth - (state.panelHidden ? 0 : PANEL_SPACE), h: innerHeight };
}

function shapeFor(kind, a) {
  const dropR = 34;
  const room = Math.max(a.w - 2 * dropR - 72, 160) / 2;
  if (kind === 'circle') {
    const r = Math.min(96, room, a.h / 2 - 24);
    return { hw: r, hh: r, r, dropR };
  }
  if (kind === 'group') {
    groupScale = Math.min(1, (a.w - 40) / 420, (a.h - 40) / 330);
    const r = 54 * groupScale;
    return { hw: r, hh: r, r, dropR };
  }
  if (kind === 'rect') {
    const hw = Math.min(210, room);
    return { hw, hh: Math.min(118, a.h / 2 - 24), r: 44, dropR };
  }
  return { hw: Math.min(300, room), hh: 36, r: 36, dropR };
}

function layout() {
  const a = area();
  shape = shapeFor(state.shape, a);
  const cx = a.x + a.w / 2 - (state.drop ? shape.dropR + 5 : 0);
  const cy = a.y + a.h / 2;
  main = bodyOf(cx, cy);
  second = bodyOf(cx + homeOffset(), cy);
  blobs = state.shape === 'group' ? GROUP.map(([parent, ox, oy, r, k]) => ({ ...bodyOf(0, 0), parent, ox: ox * groupScale, oy: oy * groupScale, r: r * groupScale, k })) : [];
  blobs.forEach(b => { const h = blobHome(b); b.x = h.x; b.y = h.y; });
  const content = $('#content');
  content.className = `content ${state.shape}`;
  content.innerHTML = $(`#tpl-${state.shape}`).innerHTML;
  content.style.width = `${shape.hw * 2}px`;
  content.style.height = `${shape.hh * 2}px`;
  const drop = $('#drop');
  drop.style.width = drop.style.height = `${shape.dropR * 2}px`;
  wireContent();
  state.dirty = true;
}

function blobHome(b) {
  const parent = b.parent < 0 ? main : blobs[b.parent];
  return { x: parent.x + b.ox, y: parent.y + b.oy };
}

function homeOffset() {
  return shape.hw + shape.dropR + 10;
}

function wireContent() {
  const content = $('#content');
  content.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => act(b.dataset.act, b)));
}

let knob = 72;

function act(name, el) {
  if (name === 'random') randomize();
  if (name === 'share') share();
  if (name === 'tab') {
    el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
  }
  if (name === 'down' || name === 'up') {
    knob = Math.max(0, Math.min(100, knob + (name === 'up' ? 4 : -4)));
    $('#content .k-value').textContent = knob;
  }
}

function stepBody(b, tx, ty, k, damping, dt) {
  const p = state.p;
  b.vx += (k * (tx - b.x) - damping * b.vx) * dt;
  b.vy += (k * (ty - b.y) - damping * b.vy) * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  let gx = b.vx * 0.0006 * p.tilt;
  let gy = b.vy * 0.0006 * p.tilt;
  const len = Math.hypot(gx, gy);
  const cap = 0.2 + 0.28 * p.tilt;
  if (len > cap) { gx *= cap / len; gy *= cap / len; }
  const omega = 12;
  const c = 2 * p.settle * omega;
  b.tvx += (omega * omega * (gx - b.tx) - c * b.tvx) * dt;
  b.tvy += (omega * omega * (gy - b.ty) - c * b.tvy) * dt;
  b.tx += b.tvx * dt;
  b.ty += b.tvy * dt;
}

function simulate(dt) {
  const d = state.drag;
  const target = d && state.pointer ? { x: state.pointer.x - d.grab.x, y: state.pointer.y - d.grab.y } : null;
  if (d?.which === 'main') stepBody(main, target.x, target.y, 520, 40, dt);
  else stepBody(main, main.x, main.y, 0, 14, dt);
  if (d?.which === 'drop') stepBody(second, target.x, target.y, 600, 42, dt);
  else stepBody(second, main.x + homeOffset(), main.y, 150, 11, dt);
  blobs.forEach((b, i) => {
    const home = d?.which === i ? target : blobHome(b);
    const k = d?.which === i ? 600 : b.k;
    const c = 2 * 0.42 * Math.sqrt(k);
    b.vx += (k * (home.x - b.x) - c * b.vx) * dt;
    b.vy += (k * (home.y - b.y) - c * b.vy) * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  });
}

function moving() {
  return [main, second].some(b => Math.abs(b.vx) + Math.abs(b.vy) > 0.02 || Math.abs(b.tx) + Math.abs(b.ty) > 1e-4 || Math.abs(b.tvx) + Math.abs(b.tvy) > 1e-3)
    || Math.hypot(second.x - main.x - homeOffset(), second.y - main.y) > 0.05
    || blobs.some(b => Math.abs(b.vx) + Math.abs(b.vy) > 0.02 || Math.hypot(b.x - blobHome(b).x, b.y - blobHome(b).y) > 0.05);
}

function tip(b, extent) {
  const angle = Math.hypot(b.tx, b.ty);
  if (angle < 1e-4) return { dx: 1, dy: 0, angle: 0, e: extent(1, 0) };
  const dx = b.tx / angle;
  const dy = b.ty / angle;
  return { dx, dy, angle, e: extent(dx, dy) };
}

function tipCss(t, ox, oy) {
  if (t.angle < 1e-4) return { transform: '', origin: `${ox}px ${oy}px` };
  return {
    transform: ` perspective(${PERSPECTIVE}px) rotate3d(${-t.dy}, ${t.dx}, 0, ${t.angle}rad)`,
    origin: `${ox + t.dx * t.e}px ${oy + t.dy * t.e}px`,
  };
}

function lightDir() {
  const p = state.p;
  let angle = (p.light * Math.PI) / 180;
  if (state.follow && state.pointer) angle = Math.atan2(state.pointer.x - main.x, -(state.pointer.y - main.y));
  const elev = (p.elev * Math.PI) / 180;
  const x = Math.sin(angle);
  const y = -Math.cos(angle);
  return [x * Math.cos(elev), y * Math.cos(elev), Math.sin(elev), x, y];
}

function hit(x, y) {
  for (let i = blobs.length - 1; i >= 0; i--) {
    const b = blobs[i];
    if (Math.hypot(x - b.x, y - b.y) < b.r + 4) return { which: i, grab: { x: x - b.x, y: y - b.y } };
  }
  if (state.drop && Math.hypot(x - second.x, y - second.y) < shape.dropR + 4) return { which: 'drop', grab: { x: x - second.x, y: y - second.y } };
  const qx = Math.max(Math.abs(x - main.x) - shape.hw + shape.r, 0);
  const qy = Math.max(Math.abs(y - main.y) - shape.hh + shape.r, 0);
  const inside = Math.hypot(qx, qy) < shape.r + 2 && Math.abs(x - main.x) < shape.hw + 2 && Math.abs(y - main.y) < shape.hh + 2;
  return inside ? { which: 'main', grab: { x: x - main.x, y: y - main.y } } : null;
}

let pending = null;
let swallowClick = false;

function startDrag(h, pointerId) {
  state.drag = h;
  try { canvas.setPointerCapture(pointerId); } catch {}
  document.body.classList.add('dragging');
  $('#hint').classList.add('gone');
}

function endDrag() {
  pending = null;
  pan = null;
  if (!state.drag) return;
  state.drag = null;
  document.body.classList.remove('dragging');
}

addEventListener('pointerdown', e => {
  swallowClick = false;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (e.target.closest('#panel, #expand')) return;
  state.pointer = { x: e.clientX, y: e.clientY };
  const h = hit(e.clientX, e.clientY);
  if (!h) {
    if (e.target === canvas && state.backdrop === 'page') {
      pan = { y: e.clientY, scroll: state.scroll };
      try { canvas.setPointerCapture(e.pointerId); } catch {}
    }
    return;
  }
  if (e.target === canvas) startDrag(h, e.pointerId);
  else pending = { h, x: e.clientX, y: e.clientY, id: e.pointerId };
}, true);

addEventListener('pointermove', e => {
  state.pointer = { x: e.clientX, y: e.clientY };
  if (state.follow) state.dirty = true;
  if (pan) scrollTo(pan.scroll - (e.clientY - pan.y));
  if (pending && e.pointerId === pending.id && Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > 5) {
    startDrag(pending.h, pending.id);
    pending = null;
    swallowClick = true;
  }
  if (!state.drag && e.target === canvas) canvas.classList.toggle('grab', !!hit(e.clientX, e.clientY));
}, true);

addEventListener('pointerup', endDrag, true);
addEventListener('pointercancel', endDrag, true);
canvas.addEventListener('lostpointercapture', endDrag);

addEventListener('click', e => {
  if (!swallowClick) return;
  swallowClick = false;
  e.stopPropagation();
  e.preventDefault();
}, true);

function fmt(v, unit, decimals) {
  return `${Number(v).toFixed(decimals)}${unit}`;
}

function buildPanel() {
  const presets = $('#presets');
  for (const [key, name] of PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.dataset.key = key;
    b.addEventListener('click', () => applyPreset(key));
    presets.append(b);
  }
  const groups = $('#groups');
  for (const group of GROUPS) {
    const box = document.createElement('details');
    box.className = 'group';
    box.open = true;
    box.innerHTML = `<summary><span>${group.title}</span>${group.note ? `<em>${group.note}</em>` : ''}</summary>`;
    const list = document.createElement('div');
    list.className = 'group-body';
    for (const item of group.items) list.append(item[2] === 'toggle' || item[2] === 'state' ? toggleRow(item) : sliderRow(item));
    box.append(list);
    groups.append(box);
  }
  document.querySelectorAll('.seg').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const key = seg.dataset.key;
    if (key === 'along') state.along = b.dataset.v === 'along';
    else if (key === 'shape') {
      const before = presetValues(state.base);
      const after = presetValues(state.base, b.dataset.v);
      if (Math.abs(state.p.body - before.body) < 1e-6) state.p.body = after.body;
      state.shape = b.dataset.v;
      state.preset = matchPreset();
    } else state[key] = b.dataset.v;
    if (key === 'shape') layout();
    state.dirty = true;
    syncAll();
  }));
  $('#dropToggle').addEventListener('change', e => {
    state.drop = e.target.checked;
    layout();
    syncAll();
  });
  $('#share').addEventListener('click', share);
  $('#random').addEventListener('click', randomize);
  $('#reset').addEventListener('click', () => applyPreset(state.base));
  $('#collapse').addEventListener('click', () => setPanel(true));
  $('#expand').addEventListener('click', () => setPanel(false));
  addEventListener('keydown', e => {
    if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey) return;
    if (e.key === 'h') setPanel(!state.panelHidden);
  });
}

function sliderRow([key, label, min, max, step, unit, hint]) {
  const row = document.createElement('label');
  row.className = 'sl';
  row.title = 'Double-click to reset';
  row.innerHTML = `<span class="sl-label">${label}</span><output></output><input type="range" min="${min}" max="${max}" step="${step}" data-key="${key}">${hint ? `<small>${hint}</small>` : ''}`;
  const input = row.querySelector('input');
  input.addEventListener('input', () => {
    state.p[key] = Number(input.value);
    state.preset = matchPreset();
    state.dirty = true;
    syncAll();
  });
  row.addEventListener('dblclick', () => {
    state.p[key] = presetValues(state.base)[key];
    state.preset = matchPreset();
    state.dirty = true;
    syncAll();
  });
  row.dataset.unit = unit;
  row.dataset.dec = String((String(step).split('.')[1] ?? '').length);
  return row;
}

function toggleRow([key, label, kind]) {
  const row = document.createElement('label');
  row.className = 'check';
  row.innerHTML = `<input type="checkbox" data-toggle="${key}" data-kind="${kind}"><span class="switch"></span><span>${label}</span>`;
  row.querySelector('input').addEventListener('change', e => {
    if (kind === 'toggle') state.p[key] = e.target.checked ? -1 : 1;
    else state[key] = e.target.checked;
    state.preset = matchPreset();
    state.dirty = true;
    syncAll();
  });
  return row;
}

function presetValues(key, shape = state.shape) {
  return withShape((PRESETS.find(p => p[0] === key) ?? PRESETS[0])[2], shape);
}

function matchPreset() {
  const hit = PRESETS.find(([key]) => {
    const values = presetValues(key);
    return Object.keys(BASE).every(k => Math.abs(values[k] - state.p[k]) < 1e-6);
  });
  return hit ? hit[0] : null;
}

function applyPreset(key) {
  state.p = { ...presetValues(key) };
  state.preset = key;
  state.base = key;
  state.dirty = true;
  syncAll();
}

function randomize() {
  const pool = PRESETS.filter(p => p[0] !== 'css');
  const [baseKey] = pool[Math.floor(Math.random() * pool.length)];
  const base = presetValues(baseKey);
  const next = { ...base };
  for (const [key, , min, max, step] of SLIDERS) {
    if (['tilt', 'settle', 'light', 'elev', 'tintA', 'shadow'].includes(key)) continue;
    const spread = (max - min) * (['disp', 'frost', 'irid', 'caustic', 'cut'].includes(key) ? 0.12 : 0.3);
    const v = clamp(base[key] + (Math.random() - 0.5) * spread, min, max);
    next[key] = +(Math.round(v / step) * step).toFixed(4);
  }
  next.light = Math.round(-180 + Math.random() * 360);
  next.flip = Math.random() < 0.5 ? -1 : 1;
  state.p = next;
  state.base = baseKey;
  state.preset = matchPreset();
  state.dirty = true;
  syncAll();
}

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

function setPanel(hidden) {
  state.panelHidden = hidden;
  document.body.classList.toggle('panel-hidden', hidden);
  state.dirty = true;
}

function syncAll() {
  document.querySelectorAll('.seg').forEach(seg => {
    const key = seg.dataset.key;
    const value = key === 'along' ? (state.along ? 'along' : 'across') : state[key];
    seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === value));
  });
  document.querySelectorAll('#presets button').forEach(b => b.classList.toggle('on', b.dataset.key === state.preset));
  document.querySelectorAll('#groups .sl').forEach(row => {
    const input = row.querySelector('input');
    const v = state.p[input.dataset.key];
    if (Number(input.value) !== v) input.value = v;
    row.querySelector('output').textContent = fmt(v, row.dataset.unit, Number(row.dataset.dec));
  });
  document.querySelectorAll('[data-toggle]').forEach(input => {
    input.checked = input.dataset.kind === 'toggle' ? state.p[input.dataset.toggle] < 0 : !!state[input.dataset.toggle];
  });
  $('#dropToggle').checked = state.drop;
  document.body.dataset.backdrop = state.backdrop;
  document.body.classList.toggle('light', LIGHT_BACKDROPS.includes(state.backdrop));
  $('#hint').textContent = state.backdrop === 'page' ? 'Drag the glass · scroll the page' : 'Drag the glass';
  ensurePage();
  document.body.classList.toggle('no-drop', !state.drop);
  scheduleHash();
}

let hashTimer = 0;

function scheduleHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => history.replaceState(null, '', encode()), 250);
}

function encode() {
  const code = link.encode(state);
  return code ? `#${code}` : location.pathname + location.search;
}

function decode() {
  const hash = location.hash.slice(1);
  let next = { ...DEFAULTS, drop: true, follow: false, p: withShape(BASE, DEFAULTS.shape), base: 'clear' };
  try {
    if (hash.includes('=')) next = decodeParams(new URLSearchParams(hash));
    else if (hash) next = link.decode(hash);
  } catch {}
  Object.assign(state, { shape: next.shape, backdrop: next.backdrop, drop: next.drop, follow: next.follow, p: next.p });
  state.preset = matchPreset();
  state.base = state.preset ?? next.base;
}

function decodeParams(q) {
  const p = { ...BASE };
  for (const key of Object.keys(BASE)) {
    const v = Number(q.get(key));
    if (q.has(key) && Number.isFinite(v)) p[key] = v;
  }
  return {
    shape: SHAPES.includes(q.get('shape')) ? q.get('shape') : 'capsule',
    backdrop: BACKDROPS.includes(q.get('bg')) ? q.get('bg') : 'lines',
    drop: q.get('drop') !== '0',
    follow: q.get('follow') === '1',
    p,
    base: 'clear',
  };
}

async function share() {
  history.replaceState(null, '', encode());
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied');
  } catch {
    prompt('Copy this link', url);
  }
}

let toastTimer = 0;

function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

const sectionCanvas = $('#section canvas');
let sectionKey = '';

function updateSection() {
  const tilt = Math.round((state.along ? main.tx : main.ty) * 1000) / 1000;
  const key = JSON.stringify([state.p, shape, tilt, state.along, sectionCanvas.clientWidth]);
  if (key === sectionKey) return;
  sectionKey = key;
  drawSection(sectionCanvas, { p: state.p, size: shape, tilt, along: state.along });
}

function scrollTo(y) {
  const next = clamp(y, 0, Math.max(0, pageHeight - innerHeight));
  if (next === state.scroll) return;
  state.scroll = next;
  state.dirty = true;
}

addEventListener('wheel', e => {
  if (state.backdrop !== 'page' || e.target.closest?.('#panel')) return;
  scrollTo(state.scroll + e.deltaY);
}, { passive: true });

async function ensurePage() {
  if (state.backdrop !== 'page') return;
  const a = area();
  const ratio = renderer.size().dpr;
  const column = innerWidth <= MOBILE ? innerWidth : a.w;
  const key = `${innerWidth}|${innerHeight}|${column}|${ratio}`;
  if (key === pageKey) return;
  pageKey = key;
  await Promise.all(['500 21px Unbounded', '500 14px Onest', '600 14px Onest'].map(f => document.fonts.load(f)));
  const { canvas: page, cssHeight } = drawPage({ width: innerWidth, viewport: innerHeight, column, dpr: ratio, maxPixels: renderer.maxTexture });
  renderer.setPage(page);
  pageHeight = cssHeight;
  scrollTo(state.scroll);
  state.dirty = true;
}

function resize() {
  renderer.resize(innerWidth, innerHeight, Math.min(devicePixelRatio || 1, 2));
  layout();
  ensurePage();
}

let last = performance.now();
let fps = 60;
let fpsShown = 0;

function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  for (let i = 0; i < 2; i++) simulate(dt / 2);
  if (state.dirty || state.drag || moving()) {
    state.dirty = false;
    const light = lightDir();
    const mainTip = tip(main, (dx, dy) => Math.abs(dx) * (shape.hw - shape.r) + Math.abs(dy) * (shape.hh - shape.r) + shape.r);
    const dropTip = tip(second, () => shape.dropR);
    const tint = LIGHT_BACKDROPS.includes(state.backdrop) ? [0.96, 0.96, 0.97] : [0.04, 0.045, 0.06];
    renderer.render({ p: state.p, backdrop: state.backdrop, scroll: state.scroll, light, shape, drop: state.drop, main, second, mainTip, dropTip, tint, blobs });
    const content = $('#content');
    const c = tipCss(mainTip, shape.hw, shape.hh);
    content.style.transformOrigin = c.origin;
    content.style.transform = `translate(${main.x - shape.hw}px, ${main.y - shape.hh}px)${c.transform}`;
    const drop = $('#drop');
    const d = tipCss(dropTip, shape.dropR, shape.dropR);
    drop.style.transformOrigin = d.origin;
    drop.style.transform = `translate(${second.x - shape.dropR}px, ${second.y - shape.dropR}px)${d.transform}`;
    fps += (1000 / Math.max(now - (frame.prev ?? now - 16.7), 1) - fps) * 0.08;
    frame.prev = now;
  } else {
    frame.prev = undefined;
  }
  if (now - fpsShown > 500) {
    $('#fps').textContent = frame.prev === undefined ? 'idle' : `${Math.round(fps)} fps`;
    fpsShown = now;
  }
  updateSection();
  requestAnimationFrame(frame);
}

decode();
buildPanel();
resize();
syncAll();
addEventListener('resize', resize);
addEventListener('hashchange', () => {
  decode();
  layout();
  syncAll();
});
requestAnimationFrame(frame);
