// cover.js — draws a finished cover onto a 2D canvas.
//
// The whole cover is one pure function of a state object:
//   { layout, grade, caption, subtitle, photos, panels }
// photos are loaded images; each panel says which photo fills it and how
// that photo is zoomed and panned inside the panel's polygon.

export const EXPORT_SIZES = [
  { label: 'Square post · 1080 × 1080', w: 1080, h: 1080 },
  { label: 'Portrait post · 1080 × 1350', w: 1080, h: 1350 },
  { label: 'Wide post · 1920 × 1080', w: 1920, h: 1080 },
];

const GRADES = {
  sunset: {
    filter: 'saturate(1.28) contrast(1.08) brightness(1.02)',
    washFrom: 'rgba(255, 122, 26, 0.16)',
    washTo: 'rgba(214, 38, 96, 0.30)',
    ink: '#ffd9a0',
  },
  neon: {
    filter: 'saturate(1.45) contrast(1.12)',
    washFrom: 'rgba(255, 0, 140, 0.20)',
    washTo: 'rgba(0, 214, 255, 0.20)',
    ink: '#7df3ff',
  },
  noir: {
    filter: 'grayscale(1) contrast(1.18) brightness(1.06)',
    washFrom: 'rgba(0, 0, 0, 0.05)',
    washTo: 'rgba(0, 0, 0, 0.22)',
    ink: '#f5f5f5',
  },
};

export function gradeOf(name) {
  return GRADES[name] ?? GRADES.sunset;
}

// Panel polygons per layout, as fractions of the cover's width and height.
export function panelsFor(layout) {
  if (layout === 'quad') {
    return [
      [[0, 0], [0.5, 0], [0.5, 0.42], [0, 0.42]],
      [[0.5, 0], [1, 0], [1, 0.42], [0.5, 0.42]],
      [[0, 0.58], [0.5, 0.58], [0.5, 1], [0, 1]],
      [[0.5, 0.58], [1, 0.58], [1, 1], [0.5, 1]],
    ];
  }
  if (layout === 'solo') {
    return [[[0, 0], [1, 0], [1, 1], [0, 1]]];
  }
  // trio: three stacked diagonal bands.
  return [
    [[0, 0], [1, 0], [1, 0.30], [0, 0.36]],
    [[0, 0.36], [1, 0.30], [1, 0.64], [0, 0.70]],
    [[0, 0.70], [1, 0.64], [1, 1], [0, 1]],
  ];
}

// A panel's bounding box, as fractions of the cover.
export function panelBounds(layout, index) {
  const poly = panelsFor(layout)[index];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// The caption band some layouts paint behind the lettering:
// [x, y, w, h] as fractions — h is the band's HEIGHT.
function bandFor(layout) {
  if (layout === 'quad') return [0, 0.42, 1, 0.16];
  if (layout === 'solo') return [0, 0.72, 1, 0.28];
  return null;
}

function tracePath(ctx, poly, w, h) {
  ctx.beginPath();
  poly.forEach(([fx, fy], i) => {
    if (i === 0) ctx.moveTo(fx * w, fy * h);
    else ctx.lineTo(fx * w, fy * h);
  });
  ctx.closePath();
}

function paintPanel(ctx, w, h, poly, panel, photos, grade) {
  const img = photos.length ? photos[panel.photo % photos.length] : null;
  const box = boundsOf(poly);
  const bx = box.x * w, by = box.y * h, bw = box.w * w, bh = box.h * h;
  ctx.save();
  tracePath(ctx, poly, w, h);
  ctx.clip();
  if (img) {
    // Cover-fit: scale so the photo covers the panel's box (never
    // stretched), zoom around the box centre, pan by a box fraction.
    const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * panel.zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const cx = bx + bw / 2 + panel.panX * bw;
    const cy = by + bh / 2 + panel.panY * bh;
    ctx.filter = grade.filter;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.filter = 'none';
  } else {
    ctx.fillStyle = '#241a30';
    ctx.fillRect(bx, by, bw, bh);
  }
  // The grade's colour wash, then a vignette, both inside the panel.
  const wash = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  wash.addColorStop(0, grade.washFrom);
  wash.addColorStop(1, grade.washTo);
  ctx.fillStyle = wash;
  ctx.fillRect(bx, by, bw, bh);
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.35,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();
}

function boundsOf(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function paintCaption(ctx, w, h, state, grade) {
  const band = bandFor(state.layout);
  if (band) {
    const [fx, fy, fw, fh] = band;
    const g = ctx.createLinearGradient(0, fy * h, 0, (fy + fh) * h);
    g.addColorStop(0, 'rgba(10, 6, 14, 0.88)');
    g.addColorStop(1, 'rgba(10, 6, 14, 0.96)');
    ctx.fillStyle = g;
    ctx.fillRect(fx * w, fy * h, fw * w, fh * h);
  }
  const caption = (state.caption || '').toUpperCase();
  if (!caption) return;
  let size, x, y, align;
  if (state.layout === 'quad') {
    size = 0.085 * w; x = 0.5 * w; y = 0.50 * h; align = 'center';
  } else if (state.layout === 'solo') {
    size = 0.12 * w; x = 0.06 * w; y = 0.88 * h; align = 'left';
  } else {
    size = 0.115 * w; x = 0.06 * w; y = 0.86 * h; align = 'left';
  }
  ctx.textAlign = align;
  ctx.textBaseline = state.layout === 'quad' ? 'middle' : 'alphabetic';
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size / 11;
  ctx.strokeStyle = 'rgba(12, 6, 10, 0.92)';
  ctx.strokeText(caption, x, y);
  ctx.shadowColor = 'rgba(255, 46, 136, 0.55)';
  ctx.shadowBlur = size / 6;
  ctx.fillStyle = grade.ink;
  ctx.fillText(caption, x, y);
  ctx.shadowBlur = 0;
  const subtitle = (state.subtitle || '').toUpperCase();
  if (subtitle) {
    const sSize = size * 0.24;
    ctx.font = `700 ${sSize}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(245, 237, 224, 0.92)';
    ctx.letterSpacing = `${Math.round(size * 0.09)}px`;
    // Clamp the subtitle's line so it can never fall off the canvas.
    const sy = Math.min(y + size * 0.52, h - sSize * 1.7);
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(subtitle, x, sy);
    ctx.letterSpacing = '0px';
  }
}

export function drawCover(ctx, w, h, state) {
  const grade = gradeOf(state.grade);
  const polys = panelsFor(state.layout);
  ctx.fillStyle = '#0d0a12';
  ctx.fillRect(0, 0, w, h);
  polys.forEach((poly, i) => {
    const panel = state.panels[i] ?? { photo: i, zoom: 1, panX: 0, panY: 0 };
    paintPanel(ctx, w, h, poly, panel, state.photos, grade);
  });
  paintCaption(ctx, w, h, state, grade);
  // White seams along every panel edge, then a frame around the cover.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  for (const poly of polys) {
    tracePath(ctx, poly, w, h);
    ctx.lineWidth = Math.max(1, 0.003 * w);
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(2, 0.005 * w);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

// Which panel of a layout holds the point (fx, fy), in cover fractions?
export function panelIndexAt(layout, fx, fy) {
  const polys = panelsFor(layout);
  for (let i = 0; i < polys.length; i++) {
    if (pointInPolygon(fx, fy, polys[i])) return i;
  }
  return -1;
}

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function captionSlug(text) {
  const slug = (text || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'cover';
}

// Re-render offscreen at the full export size and download the PNG.
export function exportPNG(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), w, h, state);
  const name = `vice-sunset-${captionSlug(state.caption)}-${w}x${h}.png`;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
  return name;
}
