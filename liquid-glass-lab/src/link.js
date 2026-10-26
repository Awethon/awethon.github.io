const VERSION = 1;

function toBase64Url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, c => c.charCodeAt(0));
}

function pushVarint(out, n) {
  while (n > 127) {
    out.push((n & 127) | 128);
    n = Math.floor(n / 128);
  }
  out.push(n);
}

function reader(bytes) {
  let i = 0;
  return {
    byte() {
      if (i >= bytes.length) throw new Error('short link');
      return bytes[i++];
    },
    varint() {
      let n = 0;
      let scale = 1;
      for (;;) {
        const b = this.byte();
        n += (b & 127) * scale;
        if (b < 128) return n;
        scale *= 128;
      }
    },
  };
}

export function createLink({ fields, presets, presetFor, shapes, backdrops, defaults }) {
  const fixedKeys = Object.keys(presets[0][2]).filter(k => !fields.some(f => f.key === k));
  const index = (f, v) => Math.max(0, Math.round((v - f.min) / f.step));
  const value = (f, i) => +(f.min + i * f.step).toFixed(6);

  function encode({ shape, backdrop, drop, follow, p }) {
    let best = null;
    presets.forEach((_, i) => {
      const values = presetFor(i, shape);
      if (fixedKeys.some(k => Math.abs(values[k] - p[k]) > 1e-6)) return;
      const diff = fields.filter(f => index(f, values[f.key]) !== index(f, p[f.key]));
      if (!best || diff.length < best.diff.length) best = { i, diff };
    });
    if (!best) best = { i: 0, diff: fields };
    if (best.i === 0 && !best.diff.length && shape === defaults.shape && backdrop === defaults.backdrop && drop && !follow) return '';
    const out = [VERSION, shapes.indexOf(shape) | (backdrops.indexOf(backdrop) << 2) | (drop ? 16 : 0) | (follow ? 32 : 0), best.i];
    const mask = fields.reduce((m, f, i) => (best.diff.includes(f) ? m + 2 ** i : m), 0);
    pushVarint(out, mask);
    for (const f of best.diff) pushVarint(out, index(f, p[f.key]));
    return toBase64Url(out);
  }

  function decode(text) {
    const r = reader(fromBase64Url(text));
    if (r.byte() !== VERSION) throw new Error('unknown link version');
    const head = r.byte();
    const shape = shapes[head & 3] ?? defaults.shape;
    const baseIndex = r.byte();
    const base = presets[baseIndex];
    if (!base) throw new Error('unknown preset');
    const p = { ...presetFor(baseIndex, shape) };
    let mask = r.varint();
    for (const f of fields) {
      if (mask % 2) p[f.key] = value(f, r.varint());
      mask = Math.floor(mask / 2);
    }
    return {
      shape,
      backdrop: backdrops[(head >> 2) & 3] ?? defaults.backdrop,
      drop: !!(head & 16),
      follow: !!(head & 32),
      p,
      base: base[0],
    };
  }

  return { encode, decode };
}
