// main.js — the editor around the cover renderer, plus the ?shot= staging
// the entry's screenshots are taken with.
//
// State lives here; cover.js only draws it. Photos never leave the machine:
// uploads are read as data URLs and drawn from memory.

import { drawCover, panelsFor, panelBounds, panelIndexAt, exportPNG, EXPORT_SIZES } from './cover.js';

const SAMPLES = [
  { name: 'boulevard', src: 'samples/boulevard.jpg' },
  { name: 'pier', src: 'samples/pier.jpg' },
];

const state = {
  layout: 'trio',
  grade: 'sunset',
  caption: 'SUNSET HEIST',
  subtitle: 'A COVER STORY',
  photos: [],
  panels: [],
};
const photoNames = [];
let selected = 0;
let sizeIndex = 0;

const params = new URLSearchParams(location.search);
const shot = params.get('shot');

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function loadSamples() {
  state.photos = [];
  photoNames.length = 0;
  for (const sample of SAMPLES) {
    state.photos.push(await loadImage(sample.src));
    photoNames.push(sample.name);
  }
}

// Fresh panels for the current layout, photos filled round-robin from
// startPhoto so no staged cover repeats one photo in every panel.
function freshPanels(startPhoto = 0) {
  const count = panelsFor(state.layout).length;
  const total = Math.max(1, state.photos.length);
  state.panels = Array.from({ length: count }, (_, i) => ({
    photo: (startPhoto + i) % total,
    zoom: 1,
    panX: 0,
    panY: 0,
  }));
  selected = 0;
}

function el(id) {
  return document.getElementById(id);
}

function render() {
  const canvas = el('preview');
  const { w, h } = EXPORT_SIZES[sizeIndex];
  const scale = Math.min(1, 900 / w, 900 / h);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  drawCover(ctx, canvas.width, canvas.height, state);
  // Outline the selected panel so it is clear which one the controls edit.
  const poly = panelsFor(state.layout)[selected];
  if (poly) {
    ctx.beginPath();
    poly.forEach(([fx, fy], i) => {
      if (i === 0) ctx.moveTo(fx * canvas.width, fy * canvas.height);
      else ctx.lineTo(fx * canvas.width, fy * canvas.height);
    });
    ctx.closePath();
    ctx.strokeStyle = '#ff7a1a';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function buildThumbs() {
  const box = el('thumbs');
  box.replaceChildren();
  state.photos.forEach((img, i) => {
    const t = document.createElement('img');
    t.src = img.src;
    t.alt = photoNames[i] ?? `photo ${i + 1}`;
    t.className = 'thumb' + (state.panels[selected]?.photo === i ? ' on' : '');
    t.addEventListener('click', () => {
      state.panels[selected].photo = i;
      buildThumbs();
      render();
    });
    box.appendChild(t);
  });
}

function selectPanel(i) {
  selected = i;
  el('panelNo').textContent = String(i + 1);
  el('zoom').value = String(state.panels[i].zoom);
  buildThumbs();
  render();
}

function markSeg(attr, value) {
  document.querySelectorAll(`[data-${attr}]`).forEach((b) => {
    b.classList.toggle('on', b.getAttribute(`data-${attr}`) === value);
  });
}

function wireSeg(attr, apply) {
  document.querySelectorAll(`[data-${attr}]`).forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.getAttribute(`data-${attr}`);
      markSeg(attr, value);
      apply(value);
    });
  });
}

function wireEditor() {
  wireSeg('layout', (value) => {
    state.layout = value;
    freshPanels(state.panels[0]?.photo ?? 0);
    selectPanel(0);
  });
  wireSeg('grade', (value) => {
    state.grade = value;
    render();
  });

  el('caption').addEventListener('input', (e) => {
    state.caption = e.target.value;
    render();
  });
  el('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    render();
  });

  el('zoom').addEventListener('input', (e) => {
    state.panels[selected].zoom = Number(e.target.value);
    render();
  });
  el('nextPhoto').addEventListener('click', () => {
    const panel = state.panels[selected];
    panel.photo = (panel.photo + 1) % state.photos.length;
    buildThumbs();
    render();
  });

  el('file').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const img = await loadImage(String(reader.result));
      state.photos.push(img);
      photoNames.push(file.name.replace(/\.[^.]+$/, ''));
      state.panels[selected].photo = state.photos.length - 1;
      buildThumbs();
      render();
    };
    reader.readAsDataURL(file);
  });

  const sizeSel = el('size');
  EXPORT_SIZES.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = s.label;
    sizeSel.appendChild(opt);
  });
  sizeSel.value = String(sizeIndex);
  sizeSel.addEventListener('change', (e) => {
    sizeIndex = Number(e.target.value);
    render();
  });

  el('export').addEventListener('click', () => {
    const { w, h } = EXPORT_SIZES[sizeIndex];
    const name = exportPNG(state, w, h);
    el('note').textContent = `Exported ${name} — look in your downloads.`;
  });

  // Click a panel to select it; drag inside it to pan its photo.
  const canvas = el('preview');
  let drag = null;
  const canvasPoint = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const p = canvasPoint(e);
    const idx = panelIndexAt(state.layout, p.x / canvas.width, p.y / canvas.height);
    if (idx >= 0) {
      if (idx !== selected) selectPanel(idx);
      drag = p;
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = canvasPoint(e);
    const panel = state.panels[selected];
    const box = panelBounds(state.layout, selected);
    const clamp = (v) => Math.max(-0.5, Math.min(0.5, v));
    panel.panX = clamp(panel.panX + (p.x - drag.x) / canvas.width / box.w);
    panel.panY = clamp(panel.panY + (p.y - drag.y) / canvas.height / box.h);
    drag = p;
    render();
  });
  canvas.addEventListener('pointerup', () => {
    drag = null;
  });
}

// Read the ?shot= parameters into the state: which sample the panels start
// from, the layout, the caption, the grade and the export size.
function applyShotParams() {
  const start = Math.max(0, SAMPLES.findIndex((s) => s.name === params.get('photo')));
  if (params.get('layout')) state.layout = params.get('layout');
  if (params.get('grade')) state.grade = params.get('grade');
  if (params.get('caption')) state.caption = params.get('caption');
  if (params.get('subtitle')) state.subtitle = params.get('subtitle');
  const size = params.get('size');
  if (size) {
    const idx = EXPORT_SIZES.findIndex((s) => `${s.w}x${s.h}` === size);
    if (idx >= 0) sizeIndex = idx;
  }
  freshPanels(start);
}

function syncEditorInputs() {
  el('caption').value = state.caption;
  el('subtitle').value = state.subtitle;
  markSeg('layout', state.layout);
  markSeg('grade', state.grade);
}

async function boot() {
  await loadSamples();
  if (shot === 'cover' || shot === 'editor') applyShotParams();
  else freshPanels(0);
  try {
    await document.fonts.load('80px Anton');
  } catch { /* the fallback stack still draws */ }
  await document.fonts.ready;

  if (shot === 'cover') {
    // The cover alone, at the full export size, fitted to the viewport.
    document.querySelector('.topbar').hidden = true;
    document.querySelector('.layout-wrap').hidden = true;
    const { w, h } = EXPORT_SIZES[sizeIndex];
    const c = document.createElement('canvas');
    c.id = 'coverFull';
    c.width = w;
    c.height = h;
    document.body.appendChild(c);
    drawCover(c.getContext('2d'), w, h, state);
    document.title = `cover: ${state.caption}`;
    return;
  }

  wireEditor();
  syncEditorInputs();
  selectPanel(0);
  if (shot === 'editor') document.title = `editor: ${state.caption}`;
}

window.__cover = { state, exportPNG, render };

boot();
