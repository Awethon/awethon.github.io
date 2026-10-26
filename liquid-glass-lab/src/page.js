const PAPER = '#faf8f4';
const INK = '#17171b';
const MUTED = '#6c6b72';
const HAIR = 'rgba(23, 23, 27, 0.12)';
const RED = '#e0533b';
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'Onest, system-ui, sans-serif';
const DISPLAY = 'Unbounded, Onest, system-ui, sans-serif';

const HEADLINE = 'How glassmakers learned to bend light without breaking it';
const DECK = 'From blown bottle glass to lenses ground by hand, the craft of shaping light has always been a quiet negotiation between heat, patience and the stubborn physics of a material that is neither quite solid nor quite liquid.';

const BODY = [
  'The first thing every apprentice learns in a glass studio is that the material does not want to hold still. At the end of a blowpipe it sags, it breathes, it remembers every hesitation of the hand that turns it. Getting a clean curve is less about force than about timing: knowing the exact second when the glass is soft enough to move and firm enough to keep the shape you give it.',
  'That same curve is what makes glass interesting to the eye. A flat pane barely changes what lies behind it, but a rounded edge gathers the scene, squeezes it, and throws it back at a slightly different angle. Look at the rim of a thick tumbler on a printed page and the lines of text bend toward the edge, split into faint colours, and then snap back into place a few millimetres further in.',
  'Opticians have a vocabulary for each of these effects. Refraction is the bending itself, set by how much more slowly light travels inside the glass than in air. Dispersion is the rainbow that appears when that slowing differs a little between red and blue. Reflection is the bright sheen that grows stronger the more steeply you look across a surface, until at a grazing angle almost all of the light bounces away.',
];

const BODY_2 = [
  'None of this is new. Medieval lens grinders worked by eye, testing each disc against candlelight and a line drawn on the wall. What has changed is that the same effects can now be computed, pixel by pixel, for shapes that never existed in a furnace: a capsule that melts into a droplet, a card with a bevel cut exactly five pixels wide, a pebble that tips as you pull it across the screen.',
  'Designers who work with these surfaces tend to describe them in physical terms. They talk about thickness and weight, about where the light sits, about whether an edge should feel ground or polished. The best results usually come from restraint: a little refraction to show depth, a hint of colour at the rim, and enough clarity that whatever sits behind the glass still reads.',
];

const LIST = [
  'Thickness decides how far the image can shift.',
  'The rim decides where the bending happens.',
  'The light decides whether the glass reads as solid.',
];

const QUOTE = 'A good piece of glass does not hide what is behind it. It tells you, very politely, that it is there.';

const MOST_READ = [
  'The quiet return of hand-blown window panes',
  'Why every lighthouse lens looks like a beehive',
  'A field guide to the colours inside a soap bubble',
  'Notes from a furnace that never goes cold',
  'What astronomers learned from a broken mirror',
];

const CARDS = [
  ['DESIGN', 'Interfaces that feel like objects, not pictures of them'],
  ['SCIENCE', 'The surprisingly long history of the magnifying glass'],
  ['TRAVEL', 'Three days among the glass studios of a northern island'],
  ['CULTURE', 'Collectors who only buy cloudy, imperfect bottles'],
  ['CRAFT', 'Grinding a lens by hand, one patient hour at a time'],
  ['SCIENCE', 'Why diamonds sparkle and window glass mostly does not'],
];

const SKIES = [
  ['#ffcf9e', '#ff8a6b', '#7a3e8f', '#3b2a6b', '#1f1d3d'],
  ['#c6e6ff', '#7cb7ff', '#2f6fdc', '#1d4aa8', '#0f2b66'],
  ['#ffe9a8', '#ffc65a', '#f07d2e', '#a8442b', '#4a2420'],
  ['#d6f5e8', '#7fd8b6', '#2f9c86', '#1f6b6a', '#123c44'],
  ['#f6d6ff', '#d59cff', '#8a5be8', '#4b3bb0', '#231e5c'],
  ['#ffe0e0', '#ff9aa8', '#e2537a', '#8c2f61', '#3c1838'],
];

function art(ctx, x, y, w, h, seed, radius) {
  const sky = SKIES[seed % SKIES.length];
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, sky[0]);
  g.addColorStop(0.55, sky[1]);
  g.addColorStop(1, sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const kind = seed % 3;
  if (kind === 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(x + w * 0.68, y + h * 0.38, Math.min(w, h) * 0.13, 0, Math.PI * 2);
    ctx.fill();
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = sky[2 + layer];
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      const base = y + h * (0.55 + layer * 0.14);
      for (let i = 0; i <= 40; i++) {
        const px = x + (w * i) / 40;
        ctx.lineTo(px, base - Math.sin(i * 0.35 + seed + layer * 1.7) * h * 0.07 - Math.sin(i * 0.11 + layer) * h * 0.05);
      }
      ctx.lineTo(x + w, y + h);
      ctx.fill();
    }
  } else if (kind === 1) {
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255, 255, 255, 0.55)' : sky[3 + (i % 2)];
      const r = Math.min(w, h) * (0.08 + ((i * 37 + seed * 13) % 23) / 100);
      ctx.beginPath();
      ctx.arc(x + w * (((i * 53 + seed * 29) % 97) / 97), y + h * (((i * 71 + seed * 17) % 89) / 89), r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = sky[4];
    ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
  } else {
    ctx.lineWidth = Math.max(2, h / 40);
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(255, 255, 255, 0.8)' : sky[2 + (i % 3)];
      ctx.beginPath();
      for (let k = 0; k <= 60; k++) {
        const px = x + (w * k) / 60;
        const py = y + h * (0.12 + i * 0.065) + Math.sin(k * 0.22 + i * 0.6 + seed) * h * 0.05;
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function wrap(ctx, text, x, y, width, lineHeight, maxLines = Infinity) {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > width && line) {
      lines++;
      if (lines === maxLines) {
        ctx.fillText(`${line}…`, x, y);
        return y + lineHeight;
      }
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = words[i];
    } else line = test;
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function pill(ctx, x, y, w, h, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export function drawPage({ width, viewport, column, dpr, maxPixels }) {
  const narrow = column < 760;
  const maxW = narrow ? column - 32 : Math.min(1040, column - 96);
  const x0 = (column - maxW) / 2;
  const cssHeight = Math.min(Math.round(narrow ? 5260 : 4000), Math.floor(maxPixels / dpr));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, cssHeight);
  ctx.textBaseline = 'alphabetic';
  const top = narrow ? 60 : 104;
  ctx.fillStyle = HAIR;
  ctx.fillRect(0, top - 1, width, 1);
  ctx.translate(0, top);

  ctx.fillStyle = INK;
  ctx.font = `500 21px ${DISPLAY}`;
  ctx.fillText('Driftwood', x0, 44);
  const logoW = ctx.measureText('Driftwood').width;
  ctx.font = `500 13px ${SANS}`;
  ctx.fillStyle = MUTED;
  ctx.fillText('JOURNAL', x0 + logoW + 8, 43);
  if (!narrow) {
    ctx.font = `600 14px ${SANS}`;
    ctx.fillStyle = INK;
    let nx = x0 + logoW + 96;
    for (const item of ['World', 'Science', 'Design', 'Culture', 'Travel', 'Craft']) {
      ctx.fillText(item, nx, 43);
      nx += ctx.measureText(item).width + 26;
    }
    pill(ctx, x0 + maxW - 268, 20, 150, 36, null, HAIR);
    ctx.fillStyle = MUTED;
    ctx.font = `500 13px ${SANS}`;
    ctx.fillText('Search the journal', x0 + maxW - 250, 43);
  }
  pill(ctx, x0 + maxW - 104, 20, 104, 36, INK);
  ctx.fillStyle = PAPER;
  ctx.font = `600 13px ${SANS}`;
  ctx.fillText('Subscribe', x0 + maxW - 84, 43);
  ctx.fillStyle = HAIR;
  ctx.fillRect(0, 74, width, 1);

  let y = narrow ? 128 : 150;
  ctx.fillStyle = RED;
  ctx.font = `600 12px ${SANS}`;
  ctx.fillText('SCIENCE  ·  CRAFT', x0, y);
  y += narrow ? 44 : 64;
  ctx.fillStyle = INK;
  const headSize = narrow ? 30 : 48;
  ctx.font = `500 ${headSize}px ${DISPLAY}`;
  y = wrap(ctx, HEADLINE, x0, y, Math.min(maxW, 880), headSize * 1.22, 4);
  y += 6;
  ctx.fillStyle = MUTED;
  ctx.font = `500 ${narrow ? 16 : 19}px ${SANS}`;
  y = wrap(ctx, DECK, x0, y, Math.min(maxW, 760), narrow ? 24 : 29);
  y += 22;
  const avatar = ctx.createLinearGradient(x0, y - 16, x0 + 36, y + 20);
  avatar.addColorStop(0, '#ffb38a');
  avatar.addColorStop(1, '#8a5be8');
  ctx.fillStyle = avatar;
  ctx.beginPath();
  ctx.arc(x0 + 18, y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = `600 14px ${SANS}`;
  ctx.fillText('By Mara Lindqvist', x0 + 48, y - 3);
  ctx.fillStyle = MUTED;
  ctx.font = `500 13px ${SANS}`;
  ctx.fillText('12 min read  ·  October 26', x0 + 48, y + 15);
  y += 44;

  const heroH = Math.round(maxW * (narrow ? 0.62 : 0.42));
  art(ctx, x0, y, maxW, heroH, 1, 20);
  y += heroH + 22;
  ctx.fillStyle = MUTED;
  ctx.font = `500 13px ${SANS}`;
  ctx.fillText('Evening light through a stack of handmade panes. Illustration for Driftwood.', x0, y);
  y += 50;

  const mainW = narrow ? maxW : Math.round(maxW * 0.62);
  const sideX = x0 + mainW + 56;
  const sideW = maxW - mainW - 56;
  const columnTop = y;

  const paragraph = text => {
    ctx.fillStyle = '#2a2a30';
    ctx.font = `${narrow ? 17 : 19}px ${SERIF}`;
    y = wrap(ctx, text, x0, y, mainW, narrow ? 28 : 32) + 18;
  };
  BODY.forEach(paragraph);

  y += 10;
  ctx.fillStyle = RED;
  ctx.fillRect(x0, y - 22, 4, narrow ? 96 : 104);
  ctx.fillStyle = INK;
  ctx.font = `italic ${narrow ? 22 : 27}px ${SERIF}`;
  y = wrap(ctx, `“${QUOTE}”`, x0 + 26, y + 6, mainW - 26, narrow ? 32 : 38) + 40;

  const inlineH = Math.round(mainW * 0.56);
  art(ctx, x0, y, mainW, inlineH, 5, 16);
  y += inlineH + 22;
  ctx.fillStyle = MUTED;
  ctx.font = `500 13px ${SANS}`;
  ctx.fillText('Ripples in a pane of crown glass, seen against a striped wall.', x0, y);
  y += 48;

  ctx.fillStyle = INK;
  ctx.font = `500 ${narrow ? 20 : 24}px ${DISPLAY}`;
  ctx.fillText('From the furnace to the screen', x0, y);
  y += 38;
  BODY_2.forEach(paragraph);
  ctx.font = `${narrow ? 17 : 19}px ${SERIF}`;
  for (const item of LIST) {
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(x0 + 6, y - 6, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2a30';
    y = wrap(ctx, item, x0 + 22, y, mainW - 22, narrow ? 28 : 32) + 6;
  }
  y += 24;

  if (!narrow) {
    let sy = columnTop - 6;
    ctx.fillStyle = INK;
    ctx.font = `600 12px ${SANS}`;
    ctx.fillText('MOST READ', sideX, sy);
    sy += 22;
    MOST_READ.forEach((title, i) => {
      ctx.fillStyle = HAIR;
      ctx.fillRect(sideX, sy, sideW, 1);
      sy += 28;
      ctx.fillStyle = RED;
      ctx.font = `500 24px ${DISPLAY}`;
      ctx.fillText(String(i + 1), sideX, sy + 10);
      art(ctx, sideX + sideW - 64, sy - 14, 64, 64, i + 2, 10);
      ctx.fillStyle = INK;
      ctx.font = `600 15px ${SANS}`;
      wrap(ctx, title, sideX + 36, sy, sideW - 112, 21, 3);
      sy += 72;
    });
    sy += 26;
    ctx.fillStyle = '#efe9df';
    ctx.beginPath();
    ctx.roundRect(sideX, sy, sideW, 220, 18);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `500 19px ${DISPLAY}`;
    ctx.fillText('The Sunday Lens', sideX + 24, sy + 46);
    ctx.fillStyle = MUTED;
    ctx.font = `500 14px ${SANS}`;
    wrap(ctx, 'One long read about light, craft and materials, every Sunday morning.', sideX + 24, sy + 78, sideW - 48, 21);
    pill(ctx, sideX + 24, sy + 132, sideW - 48, 40, PAPER, HAIR);
    ctx.fillStyle = MUTED;
    ctx.fillText('you@example.com', sideX + 42, sy + 157);
    pill(ctx, sideX + 24, sy + 180, 110, 30, RED);
    ctx.fillStyle = PAPER;
    ctx.font = `600 13px ${SANS}`;
    ctx.fillText('Sign me up', sideX + 42, sy + 200);
  }

  ctx.fillStyle = HAIR;
  ctx.fillRect(x0, y, maxW, 1);
  y += 52;
  ctx.fillStyle = INK;
  ctx.font = `500 ${narrow ? 20 : 26}px ${DISPLAY}`;
  ctx.fillText('More from Driftwood', x0, y);
  y += 32;
  const cols = narrow ? 1 : 3;
  const gap = 28;
  const cardW = (maxW - gap * (cols - 1)) / cols;
  const thumbH = Math.round(cardW * 0.62);
  CARDS.slice(0, narrow ? 3 : 6).forEach(([kicker, title], i) => {
    const cx = x0 + (i % cols) * (cardW + gap);
    const cy = y + Math.floor(i / cols) * (thumbH + 132);
    art(ctx, cx, cy, cardW, thumbH, i + 7, 14);
    ctx.fillStyle = RED;
    ctx.font = `600 11px ${SANS}`;
    ctx.fillText(kicker, cx, cy + thumbH + 28);
    ctx.fillStyle = INK;
    ctx.font = `600 17px ${SANS}`;
    wrap(ctx, title, cx, cy + thumbH + 54, cardW, 23, 2);
    ctx.fillStyle = MUTED;
    ctx.font = `500 13px ${SANS}`;
    ctx.fillText(`${6 + i * 3} min read`, cx, cy + thumbH + 106);
  });
  y += Math.ceil((narrow ? 3 : 6) / cols) * (thumbH + 132) + 40;

  ctx.fillStyle = INK;
  ctx.fillRect(0, y, width, cssHeight - y + top);
  y += 64;
  ctx.fillStyle = PAPER;
  ctx.font = `500 22px ${DISPLAY}`;
  ctx.fillText('Driftwood', x0, y);
  ctx.fillStyle = 'rgba(250, 248, 244, 0.55)';
  ctx.font = `500 14px ${SANS}`;
  wrap(ctx, 'Slow stories about how things are made. An invented magazine drawn as a backdrop for Liquid Glass Lab.', x0, y + 34, Math.min(320, maxW), 21);
  if (!narrow) {
    const heads = [['Sections', 'World', 'Science', 'Design', 'Culture'], ['Journal', 'About', 'Newsletter', 'Archive', 'Contact'], ['Follow', 'Instagram', 'Mastodon', 'RSS', 'Podcast']];
    heads.forEach((list, c) => {
      const fx = x0 + maxW - 520 + c * 180;
      ctx.fillStyle = PAPER;
      ctx.font = `600 13px ${SANS}`;
      ctx.fillText(list[0], fx, y);
      ctx.fillStyle = 'rgba(250, 248, 244, 0.55)';
      ctx.font = `500 14px ${SANS}`;
      list.slice(1).forEach((item, k) => ctx.fillText(item, fx, y + 32 + k * 28));
    });
  }

  return { canvas, cssHeight: Math.max(cssHeight, viewport) };
}
