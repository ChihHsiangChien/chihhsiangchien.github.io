'use strict';
/* ===== 共享狀態 ===== */
const app = {
  step: 0, stepT: 0, time: 0, simTime: 0, speed: 1, playing: false, dwell: 0,
  opt: { geo: true, proc: true, force: true, autoCam: true },
  tracerNode: null, tracerText: ''
};
const S = { U: 1, LAVA: 1, PL: 1, PLvis: 1, SED: 1, LITH: 1, META: 1 };

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const stageEl = document.getElementById('stage');
let cw = 1, ch = 1, dpr = 1, fitS = 1;

/* ===== 相機 (zoom / pan) ===== */
const cam = { x: 800, y: 540, z: 1 };
const camFly = { on: false, t: 0, from: null, to: null };
const camS = () => fitS * cam.z;
function toWorld(sx, sy) { const s = camS(); return { x: (sx - cw / 2) / s + cam.x, y: (sy - ch / 2) / s + cam.y }; }
function toScreen(wx, wy) { const s = camS(); return { x: (wx - cam.x) * s + cw / 2, y: (wy - cam.y) * s + ch / 2 }; }
function clampCam() { cam.z = clamp(cam.z, .6, 8); cam.x = clamp(cam.x, 0, W); cam.y = clamp(cam.y, 0, H); }
function zoomAt(sx, sy, f) {
  const a = toWorld(sx, sy);
  cam.z = clamp(cam.z * f, .6, 8);
  const b = toWorld(sx, sy);
  cam.x += a.x - b.x; cam.y += a.y - b.y; clampCam();
}
function flyTo(f) {
  camFly.on = true; camFly.t = 0;
  camFly.from = { x: cam.x, y: cam.y, z: cam.z };
  camFly.to = { x: f[0], y: f[1], z: f[2] };
}
function resize() {
  const r = stageEl.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cw = Math.max(1, r.width); ch = Math.max(1, r.height);
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  fitS = Math.min(cw / W, ch / H) * 1.02;
}
new ResizeObserver(resize).observe(stageEl);
resize();

/* ===== 地形 ===== */
const SURF = [[0, 560], [250, 566], [318, 612], [345, 616], [385, 540], [420, 452], [470, 436], [590, 416], [622, 360], [660, 352], [720, 344], [760, 300], [820, 240], [870, 205], [910, 236], [950, 214], [990, 240], [1040, 300], [1082, 322], [1120, 262], [1168, 182], [1184, 172], [1200, 188], [1216, 172], [1232, 182], [1282, 262], [1332, 314], [1400, 330], [1600, 336]];
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function baseY(x) {
  if (x <= 0) return SURF[0][1];
  for (let i = 1; i < SURF.length; i++) {
    if (x <= SURF[i][0]) {
      const a = SURF[i - 1], b = SURF[i], p0 = SURF[Math.max(0, i - 2)], p3 = SURF[Math.min(SURF.length - 1, i + 1)];
      return catmull(p0[1], a[1], b[1], p3[1], (x - a[0]) / (b[0] - a[0]));
    }
  }
  return SURF[SURF.length - 1][1];
}
const bump = x => 85 * Math.exp(-Math.pow((x - 900) / 130, 2));
const plateTop = x => x < 250 ? 560 + x * 6 / 250 : x < 330 ? 566 + (x - 250) * 44 / 80 : 610 + .42 * (x - 330);
const PT = 72;
const NS = 400, BASE = new Float32Array(NS + 1), SY = new Float32Array(NS + 1);
for (let i = 0; i <= NS; i++) BASE[i] = baseY(i * 4);
function sedThick(x) {
  if (x < 400 || x > 624) return 0;
  return 26 * Math.pow(Math.sin(Math.PI * (x - 400) / 224), .6) * S.SED * (1 - .25 * S.LITH);
}
function updateSurface() {
  for (let i = 0; i <= NS; i++) { const x = i * 4; SY[i] = BASE[i] + (1 - S.U) * bump(x) - sedThick(x); }
}
function sampleArr(arr, x) {
  const f = clamp(x, 0, W) / 4, i = Math.floor(f), t = f - i;
  return i >= NS ? arr[NS] : arr[i] * (1 - t) + arr[i + 1] * t;
}
const surfY = x => sampleArr(SY, x);
const shelfY = x => sampleArr(BASE, x); // 沉積層底部

/* ===== 預先產生的形狀 ===== */
const R0 = rng(7);
const PLUTON = { x: 985, y: 548, rx: 82, ry: 52, pts: [], cr: [] };
for (let i = 0; i < 36; i++) PLUTON.pts.push(1 + (R0() - .5) * .22);
for (let i = 0; i < 170; i++) {
  const a = R0() * 6.283, rr = Math.sqrt(R0()) * .88, k = R0();
  PLUTON.cr.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, s: 1.4 + R0() * 3, c: k < .4 ? '#e9a497' : k < .7 ? '#f3efe8' : k < .88 ? '#a8a49c' : '#1f1f1f' });
}
const CHAMBER = { x: 1190, y: 592, rx: 64, ry: 40, pts: [] };
for (let i = 0; i < 30; i++) CHAMBER.pts.push(1 + (R0() - .5) * .25);
const GRAINS = [];
for (let i = 0; i < 280; i++) {
  const x = 402 + R0() * 220, size = x > 555 ? 2.4 : x > 470 ? 1.2 : .6;
  GRAINS.push({ x, f: R0(), r: size * (.6 + R0() * .6), c: x > 555 ? ['#8b6f52', '#a08a73', '#6f6458'][i % 3] : x > 470 ? '#e3c48a' : '#8a8378' });
}
const FOSSILS = [[455, 64], [540, 70], [600, 66], [500, 66]];
const META_ZONE = [[555, 575], [650, 560], [760, 585], [860, 640], [870, 705], [780, 735], [660, 705], [590, 660]];
const TREES = [690, 780, 800, 1360, 1420, 1500];

function blobPath(o, pts, k = 1) {
  ctx.beginPath();
  const n = pts.length;
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, r = pts[i % n];
    const x = o.x + Math.cos(a) * o.rx * r * k, y = o.y + Math.sin(a) * o.ry * r * k;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
function polyPath(pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
function bandPath(x0, x1, top, bot) {
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, top(x));
  for (let x = x1; x >= x0; x -= 4) ctx.lineTo(x, bot(x));
  ctx.closePath();
}
function riverPts() { const p = []; for (let x = 864; x >= 624; x -= 6) p.push([x, surfY(x) + 1]); return p; }
function polyLen(p) { const c = [0]; for (let i = 1; i < p.length; i++) c.push(c[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])); return c; }
function polySample(p, c, u) {
  const L = c[c.length - 1] * clamp(u);
  let i = 1; while (i < c.length - 1 && c[i] < L) i++;
  const t = (L - c[i - 1]) / ((c[i] - c[i - 1]) || 1);
  return [lerp(p[i - 1][0], p[i][0], t), lerp(p[i - 1][1], p[i][1], t)];
}

/* ===== 靜態場景繪製 ===== */
function drawBackground(t) {
  const fx = app.fx;
  // 天空
  let g = ctx.createLinearGradient(0, 0, 0, SL);
  g.addColorStop(0, '#5aa9e6'); g.addColorStop(1, '#cfe9f7');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, SL + 2);
  // 太陽
  const sx = 1480, sy = 80, pul = fx.has('weather') || app.step === 0 ? 1 + .08 * Math.sin(t * 3) : 1;
  g = ctx.createRadialGradient(sx, sy, 5, sx, sy, 80 * pul);
  g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(.35, 'rgba(255,214,90,.9)'); g.addColorStop(1, 'rgba(255,214,90,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 80 * pul, 0, 7); ctx.fill();
  // 雲
  const rainy = fx.has('rain');
  drawCloud(260 + ((t * 6) % 300), 110, 1, rainy ? '#e5edf5' : '#ffffff');
  drawCloud(rainy ? 880 : 760 + Math.sin(t * .2) * 40, 95, rainy ? 1.5 : 1.1, rainy ? '#9aa8b8' : '#ffffff');
  // 海洋
  g = ctx.createLinearGradient(0, SL, 0, 640);
  g.addColorStop(0, '#2f86c9'); g.addColorStop(1, '#0d3a66');
  ctx.fillStyle = g; ctx.fillRect(0, SL, W, H - SL);
}
function drawCloud(x, y, k, col) {
  ctx.fillStyle = col; ctx.globalAlpha = .92;
  ctx.beginPath();
  [[0, 0, 26], [28, -10, 30], [58, 0, 24], [30, 8, 26]].forEach(c => { ctx.moveTo(x + c[0] * k + c[2] * k, y + c[1] * k); ctx.arc(x + c[0] * k, y + c[1] * k, c[2] * k, 0, 7); });
  ctx.fill(); ctx.globalAlpha = 1;
}
function earthPath() {
  ctx.beginPath(); ctx.moveTo(0, H + 5);
  for (let i = 0; i <= NS; i++) ctx.lineTo(i * 4, SY[i]);
  ctx.lineTo(W, H + 5); ctx.closePath();
}
function drawEarth(t) {
  // 大陸地殼
  earthPath();
  let g = ctx.createLinearGradient(0, 170, 0, 760);
  g.addColorStop(0, '#a88b67'); g.addColorStop(1, '#5a4636');
  ctx.fillStyle = g; ctx.fill();

  ctx.save(); earthPath(); ctx.clip();
  // 陸地上的岩層（會隨抬升彎曲＝褶皺）
  const bands = [[8, 24, '#b9a07a'], [24, 42, '#977a5a'], [42, 62, '#c4a77d'], [62, 88, '#86694f'], [88, 116, '#a58a68']];
  bands.forEach(b => { bandPath(630, 1095, x => surfY(x) + b[0], x => surfY(x) + b[1]); ctx.fillStyle = b[2]; ctx.globalAlpha = .75; ctx.fill(); });
  // 火山錐內部的舊熔岩層
  ctx.globalAlpha = .55;
  for (let k = 0; k < 3; k++) { bandPath(1100, 1330, x => surfY(x) + 10 + k * 22, x => surfY(x) + 20 + k * 22); ctx.fillStyle = '#4b4743'; ctx.fill(); }
  // 大陸棚下方較早的沉積岩層
  const old = [[0, 16, '#8d7b68'], [16, 32, '#d1b27c'], [32, 46, '#6b6f76'], [46, 62, '#cfcbbf'], [62, 80, '#c8a874'], [80, 100, '#666a71']];
  ctx.globalAlpha = .9;
  old.forEach(b => { bandPath(380, 660, x => shelfY(x) + b[0], x => shelfY(x) + b[1]); ctx.fillStyle = b[2]; ctx.fill(); });
  // 化石
  ctx.globalAlpha = .8; ctx.strokeStyle = '#6e6656'; ctx.lineWidth = 1.2;
  FOSSILS.forEach(f => { const x = f[0], y = shelfY(x) + f[1] - 12; ctx.beginPath(); for (let a = 0; a < 12; a += .4) ctx.lineTo(x + Math.cos(a) * a * .45, y + Math.sin(a) * a * .45); ctx.stroke(); });
  ctx.globalAlpha = 1;
  ctx.restore();

  // 地函
  ctx.beginPath(); ctx.moveTo(0, H + 5);
  for (let x = 0; x <= 492; x += 8) ctx.lineTo(x, plateTop(x) + PT);
  ctx.lineTo(W, 750); ctx.lineTo(W, H + 5); ctx.closePath();
  g = ctx.createLinearGradient(0, 620, 0, H);
  g.addColorStop(0, '#d06a32'); g.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = g; ctx.fill();
  // 地函中的熱流紋理
  ctx.strokeStyle = 'rgba(255,200,120,.12)'; ctx.lineWidth = 3;
  for (let k = 0; k < 6; k++) { ctx.beginPath(); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 800 + k * 34 + Math.sin(x / 90 + t * .5 + k) * 8); ctx.stroke(); }

  // 海洋板塊（隱沒板塊）
  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, plateTop(x));
  for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, plateTop(x) + PT);
  ctx.closePath(); ctx.fillStyle = '#4b5563'; ctx.fill();
  ctx.beginPath();
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, plateTop(x));
  for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, plateTop(x) + 14);
  ctx.closePath(); ctx.fillStyle = '#2f3540'; ctx.fill();
  if (app.fx.has('slab')) { // 板塊移動的虛線
    const s = camS();
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2.5 / s;
    ctx.setLineDash([16 / s, 12 / s]); ctx.lineDashOffset = -app.simTime * 30;
    ctx.beginPath(); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, plateTop(x) + PT * .55); ctx.stroke();
    ctx.restore();
  }

  // 地表線：陸地綠色、海底沙色
  ctx.lineWidth = 3; ctx.strokeStyle = '#5f9e4a';
  ctx.beginPath(); for (let x = 624; x <= W; x += 4) ctx.lineTo(x, surfY(x)); ctx.stroke();
  ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let x = 0; x <= 624; x += 4) ctx.lineTo(x, surfY(x)); ctx.stroke();
}

function drawMeta(t) {
  if (S.META < .01) return;
  ctx.save();
  polyPath(META_ZONE); ctx.clip();
  ctx.globalAlpha = S.META;
  const g = ctx.createLinearGradient(0, 560, 0, 740);
  g.addColorStop(0, '#7c5aa6'); g.addColorStop(1, '#4c2f78');
  ctx.fillStyle = g; ctx.fillRect(540, 540, 350, 220);
  // 葉理：波浪狀排列
  const active = app.fx.has('meta');
  for (let k = 0; k < 16; k++) {
    ctx.strokeStyle = k % 2 ? 'rgba(235,220,255,.55)' : 'rgba(40,20,70,.6)';
    ctx.lineWidth = k % 2 ? 2 : 3;
    ctx.beginPath();
    for (let x = 540; x <= 890; x += 6) {
      const y = 560 + k * 11 + (x - 540) * .18 + Math.sin(x / 26 + k * .7 + (active ? t * .8 : 0)) * 4 * S.META;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.save(); polyPath(META_ZONE); ctx.strokeStyle = 'rgba(216,180,254,' + (.7 * S.META) + ')'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.restore();
}

function drawPluton(t) {
  if (S.PLvis < .01) return;
  ctx.save(); ctx.globalAlpha = S.PLvis;
  // 接觸變質暈圈
  if (S.META > .01) {
    blobPath(PLUTON, PLUTON.pts, 1.28);
    ctx.fillStyle = 'rgba(168,85,247,' + (.45 * S.META) + ')'; ctx.fill();
  }
  const cool = S.PL;
  blobPath(PLUTON, PLUTON.pts);
  const g = ctx.createRadialGradient(PLUTON.x, PLUTON.y, 5, PLUTON.x, PLUTON.y, 90);
  g.addColorStop(0, mix('#ffd166', '#e2d6cb', cool)); g.addColorStop(1, mix('#e8471c', '#c9b8aa', cool));
  ctx.fillStyle = g; ctx.fill();
  if (cool < .9) { ctx.shadowColor = 'rgba(255,120,30,.8)'; ctx.shadowBlur = 25 * (1 - cool); ctx.strokeStyle = 'rgba(255,150,60,' + (1 - cool) + ')'; ctx.lineWidth = 2; ctx.stroke(); ctx.shadowBlur = 0; }
  // 晶體逐漸長大
  PLUTON.cr.forEach(c => {
    const s = c.s * clamp(cool * 1.2 - .1);
    if (s <= .1) return;
    ctx.fillStyle = c.c;
    ctx.fillRect(PLUTON.x + c.x * PLUTON.rx - s / 2, PLUTON.y + c.y * PLUTON.ry - s / 2, s, s * .8);
  });
  ctx.restore();
}

function drawMagmaSystem(t) {
  const erupting = app.fx.has('erupt');
  // 火山管道
  ctx.beginPath();
  ctx.moveTo(1183, 560); ctx.bezierCurveTo(1186, 450, 1195, 300, 1196, 186);
  ctx.lineTo(1204, 186); ctx.bezierCurveTo(1205, 300, 1200, 450, 1199, 560); ctx.closePath();
  ctx.fillStyle = erupting ? '#ff8a2a' : '#b23a1a'; ctx.fill();
  if (erupting) { // 管道中上升的岩漿團
    for (let k = 0; k < 6; k++) {
      const u = ((app.simTime * .5 + k / 6) % 1), y = lerp(560, 190, u);
      ctx.fillStyle = 'rgba(255,230,120,.9)'; ctx.beginPath(); ctx.arc(1192 + u * 8, y, 3.5, 0, 7); ctx.fill();
    }
  }
  // 岩漿庫
  const pul = 1 + .03 * Math.sin(t * 2.4);
  blobPath(CHAMBER, CHAMBER.pts, pul);
  const g = ctx.createRadialGradient(CHAMBER.x, CHAMBER.y, 4, CHAMBER.x, CHAMBER.y, 70);
  g.addColorStop(0, '#ffe08a'); g.addColorStop(.45, '#ff6a1a'); g.addColorStop(1, '#a3200e');
  ctx.save(); ctx.shadowColor = 'rgba(255,90,20,.9)'; ctx.shadowBlur = 30; ctx.fillStyle = g; ctx.fill(); ctx.restore();
  // 熔岩流（噴出岩）
  if (S.LAVA > .01) {
    const hot = app.step === 2 ? 1 - clamp((app.stepT - .55) / .45) : 0;
    const col = mix('#3a3d42', '#ff7a1a', hot);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (hot > .05) { ctx.shadowColor = 'rgba(255,100,20,.9)'; ctx.shadowBlur = 18 * hot; }
    ctx.strokeStyle = col; ctx.lineWidth = 7;
    const dR = 115 * S.LAVA, dL = 95 * S.LAVA;
    ctx.beginPath(); for (let x = 1214; x <= 1214 + dR; x += 3) ctx.lineTo(x, surfY(x) - 2.5); ctx.stroke();
    ctx.beginPath(); for (let x = 1186; x >= 1186 - dL; x -= 3) ctx.lineTo(x, surfY(x) - 2.5); ctx.stroke();
    ctx.restore();
  }
}

function drawSedLayer(t) {
  if (S.SED < .01) return;
  const L = S.LITH;
  ctx.save();
  bandPath(400, 624, x => surfY(x), x => shelfY(x));
  const g = ctx.createLinearGradient(400, 0, 624, 0);
  g.addColorStop(0, mix('#9a938a', '#666a71', L)); g.addColorStop(.32, mix('#9a938a', '#666a71', L));
  g.addColorStop(.36, mix('#e3c48a', '#d1b27c', L)); g.addColorStop(.7, mix('#e3c48a', '#d1b27c', L));
  g.addColorStop(.74, mix('#a08a73', '#8d7b68', L)); g.addColorStop(1, mix('#a08a73', '#8d7b68', L));
  ctx.fillStyle = g; ctx.fill();
  ctx.clip();
  // 鬆散顆粒
  GRAINS.forEach(p => {
    const top = surfY(p.x), bot = shelfY(p.x);
    if (bot - top < .5) return;
    ctx.fillStyle = p.c; ctx.globalAlpha = 1 - L * .5;
    ctx.beginPath(); ctx.arc(p.x, lerp(bot, top, p.f), p.r * (1 - L * .25), 0, 7); ctx.fill();
  });
  // 成岩後出現層理線
  if (L > .02) {
    ctx.globalAlpha = L * .8; ctx.strokeStyle = 'rgba(40,30,20,.55)'; ctx.lineWidth = 1;
    [.33, .66].forEach(f => { ctx.beginPath(); for (let x = 400; x <= 624; x += 4) ctx.lineTo(x, lerp(shelfY(x), surfY(x), f)); ctx.stroke(); });
  }
  ctx.restore();
}

function drawSurfaceDetails(t) {
  const fx = app.fx;
  // 樹
  TREES.forEach(x => {
    const y = surfY(x);
    ctx.fillStyle = '#5b3d24'; ctx.fillRect(x - 1.5, y - 14, 3, 14);
    ctx.fillStyle = '#2f7d3a'; ctx.beginPath(); ctx.arc(x, y - 18, 8, 0, 7); ctx.fill();
  });
  // 冰川（山頂積雪）
  if (fx.has('glacier')) {
    ctx.fillStyle = 'rgba(245,250,255,.95)';
    ctx.beginPath(); for (let x = 842; x <= 898; x += 3) ctx.lineTo(x, surfY(x) - 1);
    for (let x = 898; x >= 842; x -= 3) ctx.lineTo(x, surfY(x) + 5 + 4 * Math.sin((x - 842) / 56 * Math.PI)); ctx.fill();
  }
  if (fx.has('weather')) drawWeathering(t);
}

function drawWeathering(t) {
  const day = Math.sin(t * 1.4); // >0 白天
  // 熱脹冷縮：山頂裂隙寬度隨日夜變化
  const cx = 870, cy = surfY(870);
  ctx.strokeStyle = '#3b2a1c'; ctx.lineWidth = 1.2 + (day > 0 ? day * 1.3 : 0);
  [[-14, 0, -18, 16], [0, 2, 4, 22], [14, 4, 18, 20], [-6, 10, 8, 12]].forEach(c => {
    ctx.beginPath(); ctx.moveTo(cx + c[0], cy + c[1]); ctx.lineTo(cx + (c[0] + c[2]) / 2 + 3, cy + c[1] + c[3] / 2); ctx.lineTo(cx + c[2], cy + c[1] + c[3]); ctx.stroke();
  });
  // 日夜小圖示
  const ix = 870, iy = cy - 40;
  if (day > 0) { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(ix, iy, 8, 0, 7); ctx.fill(); }
  else { ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.arc(ix, iy, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#5aa9e6'; ctx.beginPath(); ctx.arc(ix + 4, iy - 3, 7, 0, 7); ctx.fill(); }
  app.dayText = day > 0 ? '白天受熱膨脹' : '夜晚冷卻收縮';
  // 冰楔作用
  const ice = (Math.sin(t * 1.1) + 1) / 2, x0 = 952, y0 = surfY(952), w = 2.5 + ice * 3.5;
  ctx.beginPath(); ctx.moveTo(x0 - w, y0); ctx.lineTo(x0 + w, y0); ctx.lineTo(x0 + 2, y0 + 26); ctx.lineTo(x0 - 1, y0 + 34); ctx.closePath();
  ctx.fillStyle = mix('#3b82f6', '#f0f9ff', ice); ctx.fill(); ctx.strokeStyle = '#2b1d12'; ctx.lineWidth = 1; ctx.stroke();
  app.iceText = ice > .5 ? '結冰膨脹撐開裂縫' : '水滲入裂縫';
  // 植物根部撐裂
  const rx = 790, ry = surfY(790);
  ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.4;
  [[-10, 18], [-3, 24], [6, 20], [12, 14]].forEach(r => { ctx.beginPath(); ctx.moveTo(rx, ry); ctx.quadraticCurveTo(rx + r[0] * .3, ry + r[1] * .6, rx + r[0], ry + r[1] * (.9 + .1 * Math.sin(t * 2))); ctx.stroke(); });
}
