function shoulder(v, k) {
  return Math.max(1 - (1 - v) ** k, 0) ** (1 / k);
}

export function glassHeight(t, p) {
  if (t <= 0) return 0;
  const v = Math.min(t / Math.max(p.bevel, 1), 1);
  let f;
  if (p.cut >= 0) {
    const s0 = shoulder(p.cut, p.curve);
    f = (shoulder(p.cut + (1 - p.cut) * v, p.curve) - s0) / Math.max(1 - s0, 1e-3);
  } else {
    f = -p.cut + (1 + p.cut) * shoulder(v, p.curve);
  }
  return p.thick * f + p.lens * p.thick * (1 - Math.exp(-t / 46));
}

function cutModel(view, p, along) {
  const { hw, hh } = view.size;
  const half = along ? hw : hh;
  const depth = x => Math.max(along ? Math.min(hh, hw - Math.abs(x)) : hh - Math.abs(x), 0);
  const long = hw >= hh ? hw : hh;
  const round = Math.abs(hw - hh) < 1;
  const dome = x => {
    const u = 1 - Math.min(depth(x) / Math.min(hw, hh), 1);
    return Math.sqrt(Math.max(1 - u * u, 0));
  };
  const lengthwise = x => (!round && along === hw >= hh ? Math.sqrt(Math.max(1 - (x / long) ** 2, 0)) : 1);
  const oval = x => dome(x) * lengthwise(x);
  const height = x => glassHeight(depth(x), p) * (1 + (oval(x) - 1) * p.body);
  return { half, depth, height };
}

function surfaceSlope(x, model) {
  const sigma = Math.max(0.75, 0.45 * model.depth(x));
  let sum = 0;
  let weights = 0;
  for (let k = -6; k <= 6; k++) {
    const w = Math.exp(-0.5 * (k / 2) ** 2);
    const q = x + (k / 2) * sigma;
    sum += w * (model.height(q + 0.25) - model.height(q - 0.25)) / 0.5;
    weights += w;
  }
  return sum / weights;
}

function surfaceProfile(model) {
  const step = model.half > 120 ? 1 : 0.25;
  const points = [];
  let h = 0;
  for (let x = -model.half; x <= 0; x += step) {
    points.push([x, h]);
    h += surfaceSlope(x + step / 2, model) * step;
  }
  const half = points.slice();
  for (let i = half.length - 2; i >= 0; i--) points.push([-half[i][0], half[i][1]]);
  return points;
}

function heightOn(poly, x) {
  if (x <= poly[0][0] || x >= poly[poly.length - 1][0]) return 0;
  let lo = 0;
  let hi = poly.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (poly[mid][0] <= x) lo = mid;
    else hi = mid;
  }
  const [x0, y0] = poly[lo];
  const [x1, y1] = poly[hi];
  return y0 + ((y1 - y0) * (x - x0)) / Math.max(x1 - x0, 1e-6);
}

function tipProfile(poly, hh, angle) {
  if (Math.abs(angle) < 1e-4) return poly;
  const pivot = Math.sign(angle) * hh;
  const c = Math.cos(-angle);
  const sn = Math.sin(-angle);
  return poly.map(([x, y]) => [pivot + (x - pivot) * c - y * sn, (x - pivot) * sn + y * c]);
}

function sightLine(x, poly, p, ior) {
  const h = heightOn(poly, x);
  const slope = (heightOn(poly, x + 0.5) - heightOn(poly, x - 0.5)) / 1;
  const len = Math.hypot(slope, 1);
  const nx = -slope / len;
  const ny = 1 / len;
  const eta = 1 / ior;
  const k = 1 - eta * eta * (1 - ny * ny);
  const c = eta * ny - Math.sqrt(Math.max(k, 0));
  const tx = c * nx;
  const ty = -eta + c * ny;
  return { h, land: x + (tx / Math.max(-ty, 0.25)) * h * p.flip };
}

export function drawSection(canvas, { p, size, tilt, along }) {
  const view = { size };
  const model = cutModel(view, p, along);
  const hh = model.half;
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const hgt = canvas.clientHeight;
  canvas.width = Math.round(w * ratio);
  canvas.height = Math.round(hgt * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, w, hgt);

  const pad = Math.max(16, hh * (along ? 0.06 : 0.35));
  const flat = surfaceProfile(model);
  const glassTop = Math.max(...flat.map(pt => pt[1]), 1);
  const trueTop = Math.max(...flat.map(([x]) => model.height(x)), 1);
  const hMax = glassTop + 0.6 * view.size.hh;
  const profile = tipProfile(flat, hh, tilt);
  const floor = hgt - 22;
  const top = 16;
  const scaleX = (w - 8) / (2 * (hh + pad));
  const scaleY = Math.min((floor - top - 14) / hMax, along ? Infinity : scaleX);
  const scale = scaleX;
  const stretch = scaleY / scaleX;
  const X = x => w / 2 + x * scaleX;
  const Y = y => floor - y * scaleY;
  const ink = 'rgba(246, 243, 238, ';
  ctx.font = '500 10.5px Onest, system-ui, sans-serif';

  for (let x = -hh - pad; x < hh + pad; x += 6) {
    ctx.fillStyle = `hsl(${(x * 4 + 720) % 360} 55% 55% / 0.85)`;
    ctx.fillRect(X(x), floor + 1, Math.max(6 * scale - 0.5, 1), 5);
  }
  ctx.strokeStyle = ink + '0.35)';
  ctx.beginPath();
  ctx.moveTo(0, floor + 0.5);
  ctx.lineTo(w, floor + 0.5);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(X(profile[0][0]), Y(profile[0][1]));
  for (const [x, y] of profile) ctx.lineTo(X(x), Y(y));
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, Y(hMax), 0, floor);
  fill.addColorStop(0, 'rgba(190, 210, 255, 0.28)');
  fill.addColorStop(1, 'rgba(190, 210, 255, 0.1)');
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = ink + '0.85)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.lineWidth = 1;

  const count = 15;
  for (let i = 0; i < count; i++) {
    const x0 = profile[0][0];
    const x1 = profile[profile.length - 1][0];
    const x = x0 + 0.6 + (x1 - x0 - 1.2) * (i / (count - 1));
    const colour = `hsl(${(x * 4 + 720) % 360} 70% 66%)`;
    const ray = sightLine(x, profile, p, p.ior);
    ctx.strokeStyle = ink + '0.22)';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(X(x), top);
    ctx.lineTo(X(x), Y(ray.h));
    ctx.stroke();
    if (p.disp > 0.001) {
      for (const [shift, tone] of [[-p.disp, 'rgba(255, 90, 90, 0.55)'], [p.disp, 'rgba(90, 140, 255, 0.55)']]) {
        const r = sightLine(x, profile, p, p.ior + shift);
        ctx.strokeStyle = tone;
        ctx.setLineDash(p.flip < 0 ? [3, 3] : []);
        ctx.beginPath();
        ctx.moveTo(X(x), Y(r.h));
        ctx.lineTo(X(r.land), floor);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = colour;
    ctx.setLineDash(p.flip < 0 ? [3, 3] : []);
    ctx.beginPath();
    ctx.moveTo(X(x), Y(ray.h));
    ctx.lineTo(X(ray.land), floor);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(X(ray.land), floor, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const lightRad = (p.light * Math.PI) / 180;
  const side = -Math.cos(lightRad) < 0 ? -1 : 1;
  const elev = (p.elev * Math.PI) / 180;
  const lx = X(side * (hh + pad * 0.55));
  const ly = Y(hMax) - 4;
  const lead = 26;
  ctx.strokeStyle = 'rgba(255, 226, 150, 0.9)';
  ctx.fillStyle = 'rgba(255, 226, 150, 0.9)';
  const sx = Math.min(Math.max(lx + side * Math.cos(elev) * lead, 6), w - 6);
  const sy = Math.max(ly - Math.sin(elev) * lead, 6);
  ctx.beginPath();
  ctx.moveTo(sx - side * Math.cos(elev) * lead, sy + Math.sin(elev) * lead);
  ctx.lineTo(sx, sy);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx, sy, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = ink + '0.55)';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText(along ? '← left end' : '↑ top edge', 2, hgt - 2);
  ctx.textAlign = 'right';
  ctx.fillText(along ? 'right end →' : 'bottom edge ↓', w - 2, hgt - 2);
  if (stretch > 1.2) {
    ctx.textAlign = 'left';
    ctx.fillText(`height ×${Math.round(stretch)}`, 2, 11);
  }
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(trueTop)}px tall`, X(0), Math.max(Y(glassTop) - 8, 11));

  const bev = Math.min(p.bevel, hh);
  ctx.strokeStyle = 'rgba(217, 200, 255, 0.9)';
  ctx.beginPath();
  ctx.moveTo(X(-hh), floor - 6);
  ctx.lineTo(X(-hh), floor - 2);
  ctx.lineTo(X(-hh + bev), floor - 2);
  ctx.lineTo(X(-hh + bev), floor - 6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(217, 200, 255, 0.9)';
  ctx.textAlign = 'left';
  ctx.fillText(`bevel ${p.bevel}px`, X(-hh + bev) + 4, floor - 4);
  if (p.flip < 0) {
    ctx.textAlign = 'right';
    ctx.fillText('rim pulls outside in (not physical)', w - 2, 11);
  }
  drawEdgeInset(ctx, profile, p, w - 102, 20, 100, 70);
}

function drawEdgeInset(ctx, profile, p, ix, iy, iw, ih) {
  const left = profile[0][0];
  const span = Math.max(p.bevel * 1.6, 10);
  const from = left - 2;
  const to = left + span;
  const part = profile.filter(([x]) => x >= from && x <= to);
  const peak = Math.max(...part.map(pt => pt[1]), 1);
  const sy = (ih - 22) / peak;
  const sx = Math.max(iw / (to - from), sy);
  const stretch = Math.round(sx / sy);
  const X = x => ix + (x - from) * sx;
  const Y = y => iy + ih - 4 - y * sy;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 9, 13, 0.96)';
  ctx.strokeStyle = 'rgba(217, 200, 255, 0.35)';
  ctx.beginPath();
  ctx.roundRect(ix, iy, iw, ih, 8);
  ctx.fill();
  ctx.stroke();
  ctx.clip();
  ctx.strokeStyle = 'rgba(246, 243, 238, 0.3)';
  ctx.beginPath();
  ctx.moveTo(ix, Y(0));
  ctx.lineTo(ix + iw, Y(0));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X(part[0][0]), Y(0));
  for (const [x, y] of part) ctx.lineTo(X(x), Y(y));
  ctx.lineTo(X(part[part.length - 1][0]), Y(0));
  ctx.closePath();
  ctx.fillStyle = 'rgba(190, 210, 255, 0.2)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(246, 243, 238, 0.9)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(217, 200, 255, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(X(left), Y(0) - 3);
  ctx.lineTo(X(left + p.bevel), Y(0) - 3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(246, 243, 238, 0.6)';
  ctx.textAlign = 'left';
  ctx.fillText(stretch > 1 ? `edge, ${stretch}× wider` : "edge, zoomed", ix + 6, iy + 12);
  ctx.restore();
}

