'use strict';
/* ===== 粒子 ===== */
const parts = [];
const emitAcc = {};
const PR = rng(99);
function emit(key, rate, dt, fn) {
  emitAcc[key] = (emitAcc[key] || 0) + rate * dt;
  while (emitAcc[key] >= 1) { emitAcc[key]--; fn(); }
}
function spawnParticles(dt) {
  const fx = app.fx, r = PR;
  if (fx.has('magma')) emit('magma', fx.has('melt') ? 1.2 : 2.2, dt, () => {
    const x = 960 + r() * 150;
    parts.push({ k: 'magma', x0: x, y0: plateTop(x) - 10, cx: x + 60 + r() * 60, cy: plateTop(x) - 170, x1: 1170 + r() * 40, y1: 600, t: 0, life: 3.5 + r() * 1.5, r: 3 + r() * 3 });
  });
  if (fx.has('water')) emit('water', 6, dt, () => {
    const x = 800 + r() * 260;
    parts.push({ k: 'water', x, y: plateTop(x) - 2, vx: (r() - .5) * 8, vy: -18 - r() * 14, t: 0, life: 2.2 });
  });
  if (fx.has('erupt')) {
    emit('ash', 14, dt, () => parts.push({ k: 'ash', x: 1200 + (r() - .5) * 10, y: 180, vx: (r() - .3) * 40, vy: -70 - r() * 50, t: 0, life: 4 + r() * 2, r: 4 + r() * 4 }));
    emit('bomb', 4, dt, () => parts.push({ k: 'bomb', x: 1200, y: 182, vx: (r() - .5) * 170, vy: -170 - r() * 110, t: 0, life: 5, r: 2 + r() * 2 }));
  }
  if (fx.has('smoke')) emit('smoke', 2, dt, () => parts.push({ k: 'ash', x: 1200, y: 182, vx: 10 + r() * 15, vy: -25 - r() * 15, t: 0, life: 5, r: 4 + r() * 3 }));
  if (fx.has('rain')) emit('rain', 60, dt, () => parts.push({ k: 'rain', x: 780 + r() * 220, y: 110 + r() * 20, vy: 320 + r() * 80, t: 0, life: 2 }));
  if (fx.has('debris')) emit('debris', 1.4, dt, () => {
    const x = r() < .5 ? 866 : 948;
    parts.push({ k: 'debris', x, dir: -1, sp: 22 + r() * 18, t: 0, life: 7, r: 1.6 + r() * 2.2, rot: 0 });
  });
  if (fx.has('river')) emit('grain', fx.has('deposit') ? 7 : 5, dt, () => parts.push({ k: 'grain', s: 0, sp: .11 + r() * .05, t: 0, life: 20, r0: 3.4 + r() * 1.6, deposit: fx.has('deposit') }));
  if (fx.has('wind')) emit('sand', 5, dt, () => parts.push({ k: 'sand', x: 1300 + r() * 30, ph: r() * 6, sp: 70 + r() * 40, t: 0, life: 5 }));
  if (fx.has('squeeze')) emit('sq', 9, dt, () => { const x = 405 + r() * 215; parts.push({ k: 'water', x, y: surfY(x) + 4, vx: 0, vy: -16 - r() * 10, t: 0, life: 1.6 }); });
  if (fx.has('melt')) emit('melt', 1.3, dt, () => parts.push({ k: 'melt', u: 0, t: 0, life: 6 }));
}
const MELT_PATH = [[640, 690], [760, 750], [880, 800], [1010, 850]];
function updateParticles(dt) {
  const rp = riverPts(), rc = polyLen(rp);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t += dt;
    let dead = p.t > p.life;
    switch (p.k) {
      case 'water': case 'ash': p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'ash') { p.vx += 12 * dt; p.r += 3 * dt; } break;
      case 'bomb': p.vy += 220 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.vy > 0 && p.y > surfY(p.x) - 2) dead = true; break;
      case 'rain': p.y += p.vy * dt; if (p.y > surfY(p.x)) dead = true; break;
      case 'debris': p.x += p.dir * p.sp * dt; p.rot += dt * 5; if (p.x < 700) dead = true; break;
      case 'grain': {
        p.s += p.sp * dt;
        if (p.s >= 1) {
          if (p.deposit) { const r = p.r0 * .35; parts[i] = { k: 'settle', x: 622, y: 364, vx: -(14 + (5 - r * 2) * 14), vy: 6 + r * 9, r, t: 0, life: 12 }; continue; }
          dead = true;
        }
        break;
      }
      case 'settle': p.x += p.vx * dt; p.y += p.vy * dt; if (p.y >= surfY(p.x) - p.r || p.x < 390) dead = true; break;
      case 'sand': p.x += p.sp * dt; if (p.x > 1600) dead = true; break;
      case 'melt': p.u += dt / 4.5; if (p.u >= 1) {
        parts[i] = { k: 'magma', x0: 1010, y0: 850, cx: 1090, cy: 700, x1: 1175, y1: 605, t: 0, life: 3.5, r: 4.5 }; continue;
      } break;
    }
    if (dead) parts.splice(i, 1);
  }
  app._rp = rp; app._rc = rc;
}
function drawParticles() {
  const rp = app._rp, rc = app._rc;
  for (const p of parts) {
    const a = 1 - clamp((p.t - p.life + .6) / .6);
    ctx.globalAlpha = a;
    switch (p.k) {
      case 'magma': {
        const u = clamp(p.t / p.life), v = 1 - u;
        const x = v * v * p.x0 + 2 * v * u * p.cx + u * u * p.x1 + Math.sin(p.t * 4) * 3, y = v * v * p.y0 + 2 * v * u * p.cy + u * u * p.y1;
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 2);
        g.addColorStop(0, '#fff1a8'); g.addColorStop(.4, '#ff7a1a'); g.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, p.r * 2, 0, 7); ctx.fill(); break;
      }
      case 'water': ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 7); ctx.fill(); break;
      case 'ash': ctx.globalAlpha = a * .55; ctx.fillStyle = '#6b6b6b'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); break;
      case 'bomb': ctx.fillStyle = '#ff6a1a'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); break;
      case 'rain': ctx.strokeStyle = 'rgba(80,140,220,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 2, p.y - 9); ctx.stroke(); break;
      case 'debris': { const y = surfY(p.x) - p.r; ctx.fillStyle = '#8a7258'; ctx.save(); ctx.translate(p.x, y); ctx.rotate(p.rot); ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 1.6); ctx.restore(); break; }
      case 'grain': {
        const q = polySample(rp, rc, p.s), r = p.r0 * (1 - p.s * .62);
        ctx.fillStyle = p.s < .35 ? '#7a6a5a' : p.s < .7 ? '#c9a46a' : '#e3c48a';
        ctx.beginPath();
        if (p.s < .3) { ctx.save(); ctx.translate(q[0], q[1] - r); ctx.rotate(p.t * 3); ctx.rect(-r, -r * .8, r * 2, r * 1.6); ctx.restore(); } // 有稜角
        else ctx.arc(q[0], q[1] - r, r, 0, 7); // 圓滑
        ctx.fill(); break;
      }
      case 'settle': ctx.fillStyle = p.r > 1.4 ? '#8b6f52' : p.r > .9 ? '#e3c48a' : '#a39b90'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + .6, 0, 7); ctx.fill(); break;
      case 'sand': { const y = surfY(p.x) - 2 - Math.abs(Math.sin(p.t * 5 + p.ph)) * 12; ctx.fillStyle = '#d8b878'; ctx.beginPath(); ctx.arc(p.x, y, 1.6, 0, 7); ctx.fill(); break; }
      case 'melt': {
        const q = polySample(MELT_PATH, polyLen(MELT_PATH), p.u);
        ctx.fillStyle = mix('#7c5aa6', '#ff5a1a', p.u); ctx.beginPath(); ctx.arc(q[0], q[1], 5 - p.u * 1.5, 0, 7); ctx.fill(); break;
      }
    }
  }
  ctx.globalAlpha = 1;
}

/* ===== 標籤（螢幕座標，大小不隨縮放改變） ===== */
let labels = [];
function L(wx, wy, text, kind, o = {}) { labels.push({ wx, wy, text, kind, ...o }); }
function drawLabels() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const small = Math.min(cw, ch) < 500;
  const fs = small ? 11 : 13;
  const placed = [];
  labels.sort((a, b) => (b.hi ? 1 : 0) - (a.hi ? 1 : 0));
  for (const lb of labels) {
    if (lb.kind === 'geo' && !app.opt.geo) continue;
    if (lb.kind === 'proc' && !app.opt.proc) continue;
    if (lb.kind === 'force' && !app.opt.force) continue;
    const p = toScreen(lb.wx, lb.wy);
    const f = (lb.hi ? 'bold ' : '') + (lb.hi ? fs + 1 : fs) + 'px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
    ctx.font = f;
    const tw = ctx.measureText(lb.text).width + 12, th = fs + 10;
    let bx = p.x + (lb.dx || 0) - tw / 2, by = p.y + (lb.dy ?? -26) - th / 2;
    const tries = [0, -1, 1, -2, 2, -3, 3];
    for (const k of tries) {
      const y = by + k * (th + 2);
      if (!placed.some(r => bx < r.x + r.w && bx + tw > r.x && y < r.y + r.h && y + th > r.y)) { by = y; break; }
    }
    if (bx + tw < 0 || bx > cw || by + th < 0 || by > ch) continue;
    placed.push({ x: bx, y: by, w: tw, h: th });
    const col = lb.color || (lb.kind === 'geo' ? '#cbd5e1' : '#fde68a');
    // 引線
    ctx.strokeStyle = col; ctx.globalAlpha = .8; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(clamp(p.x, bx + 4, bx + tw - 4), by + th / 2 < p.y ? by + th : by); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = lb.kind === 'geo' ? 'rgba(15,23,42,.72)' : 'rgba(15,23,42,.86)';
    ctx.beginPath(); ctx.roundRect(bx, by, tw, th, 6); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = lb.hi ? 1.6 : 1; ctx.stroke();
    ctx.fillStyle = lb.kind === 'geo' ? '#e2e8f0' : '#fff';
    ctx.textBaseline = 'middle'; ctx.fillText(lb.text, bx + 6, by + th / 2 + .5);
  }
}

/* ===== 營力箭頭 ===== */
const ARROWS = {
  plate: { f: 'int', label: '內營力：板塊運動', pts: () => [[30, 594], [250, 598], [330, 628]] },
  convect: { f: 'int', label: '內營力：地函對流（地熱）', pts: () => [[380, 960], [180, 975], [70, 900], [130, 820], [330, 800]] },
  magmaUp: { f: 'int', label: '內營力：岩漿上升', pts: () => [[1030, 850], [1080, 740], [1160, 640]] },
  erupt: { f: 'int', label: '內營力：火山噴發', pts: () => [[1240, 480], [1250, 300], [1225, 150]] },
  intrude: { f: 'int', label: '內營力：岩漿入侵', pts: () => [[1150, 610], [1110, 600], [1075, 570]] },
  uplift: { f: 'int', label: '內營力：地殼隆起', multi: () => [[[820, 520], [820, 400]], [[900, 540], [900, 420]], [[980, 520], [980, 400]]] },
  compress: { f: 'int', label: '擠壓', multi: () => [[[600, 470], [700, 470]], [[1150, 470], [1060, 470]]] },
  heat: { f: 'int', label: '內營力：高溫', multi: () => [[[700, 830], [700, 740]], [[800, 860], [800, 760]]] },
  press: { f: 'int', label: '內營力：高壓擠壓', multi: () => [[[470, 640], [560, 640]], [[960, 680], [880, 680]], [[720, 470], [720, 550]]] },
  meltA: { f: 'int', label: '隱沒帶到深處', pts: () => [[600, 650], [800, 750], [1000, 830]] },
  sun: { f: 'ext', label: '外營力：太陽能', pts: () => [[1430, 110], [1200, 120], [990, 170]] },
  rain: { f: 'ext', label: '外營力：降水', multi: () => [[[830, 120], [830, 175]], [[930, 120], [930, 180]]] },
  riverA: { f: 'ext', label: '外營力：流水（重力）', pts: () => [[850, 180], [770, 255], [680, 315], [625, 335]] },
  wind: { f: 'ext', label: '外營力：風', pts: () => [[1330, 270], [1450, 262], [1570, 272]] },
  deposit: { f: 'ext', label: '外營力：沉積', pts: () => [[615, 372], [550, 392], [440, 412]] },
  burial: { f: 'ext', label: '上覆沉積物的重量', multi: () => [[[450, 365], [450, 410]], [[520, 365], [520, 398]], [[590, 365], [590, 392]]] }
};
function strokeArrow(pts, color, wpx) {
  const s = camS();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 2) ctx.lineTo(pts[1][0], pts[1][1]);
    else {
      for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    }
  };
  ctx.strokeStyle = 'rgba(10,15,30,.55)'; ctx.lineWidth = (wpx + 3) / s; path(); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = wpx / s;
  ctx.setLineDash([14 / s, 9 / s]); ctx.lineDashOffset = -app.simTime * 40 / s; path(); ctx.stroke(); ctx.setLineDash([]);
  const a = pts[pts.length - 2], b = pts[pts.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hs = wpx * 3.4 / s;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(b[0] + Math.cos(ang) * hs * .4, b[1] + Math.sin(ang) * hs * .4);
  ctx.lineTo(b[0] - Math.cos(ang - .5) * hs, b[1] - Math.sin(ang - .5) * hs);
  ctx.lineTo(b[0] - Math.cos(ang + .5) * hs, b[1] - Math.sin(ang + .5) * hs); ctx.closePath(); ctx.fill();
}
function drawArrows() {
  if (!app.opt.force) return;
  for (const id of STEPS[app.step].arrows) {
    const A = ARROWS[id], col = A.f === 'int' ? COL.int : COL.ext;
    const list = A.multi ? A.multi() : [A.pts()];
    list.forEach(p => strokeArrow(p, col, 4));
    const p0 = list[0], mid = p0[Math.floor(p0.length / 2)] || p0[0];
    L(mid[0], mid[1], A.label, 'force', { color: col, hi: true, dy: -24 });
  }
}

/* ===== 地震波 ===== */
function drawQuake(t) {
  if (!app.fx.has('quake')) return;
  for (let k = 0; k < 3; k++) {
    const u = ((app.simTime * .6 + k / 3) % 1);
    ctx.strokeStyle = 'rgba(255,240,200,' + (1 - u) * .8 + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(760, 560, 10 + u * 120, 0, 7); ctx.stroke();
  }
  ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(760, 560, 5, 0, 7); ctx.fill();
}

/* ===== 波浪 ===== */
function drawWaves(t) {
  const big = app.fx.has('waves') ? 1 : .4;
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); for (let x = 0; x <= 624; x += 6) ctx.lineTo(x, SL + Math.sin(x * .05 + t * 2) * 1.8 * big); ctx.stroke();
  if (app.fx.has('waves')) {
    const u = (t * .7) % 1;
    ctx.strokeStyle = 'rgba(255,255,255,' + (1 - u) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(612 - u * 6, SL - 3, 8 + u * 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  }
}

/* ===== 岩石旅行者 ===== */
const TRACER = [
  { p: () => [1190, 592], txt: '岩漿', node: 'magma' },
  { p: () => [1080, 575], txt: '岩漿入侵地殼', node: 'magma' },
  { p: () => [990, 548], txt: '緩慢冷卻 → 花岡岩（火成岩）', node: 'igneous' },
  { p: () => [930, 400], txt: '造山運動抬升', node: 'igneous' },
  { p: () => [866, surfY(866) - 3], txt: '出露地表 → 風化', node: 'sediment' },
  { river: true, txt: '流水侵蝕、搬運', node: 'sediment' },
  { p: () => [530, surfY(530) - 3], txt: '沉積成為沉積物', node: 'sediment' },
  { p: () => [520, shelfY(520) + 30], txt: '埋藏、壓密膠結 → 沉積岩', node: 'sedimentary' },
  { p: () => [600, 610], txt: '被帶到地底深處', node: 'sedimentary' },
  { p: () => [710, 650], txt: '高溫高壓 → 變質岩', node: 'metamorphic' },
  { p: () => [860, 780], txt: '隨板塊隱沒', node: 'metamorphic' },
  { p: () => [1020, 860], txt: '熔融 → 岩漿', node: 'magma' },
  { p: () => [1190, 592], txt: '回到岩漿庫，循環重新開始', node: 'magma' }
];
const trail = [];
function drawTracer() {
  if (!app.fx.has('tracer')) { trail.length = 0; return; }
  const pts = [], meta = [];
  TRACER.forEach(w => {
    if (w.river) { app._rp.forEach((q, i) => { if (i % 4 === 0) { pts.push([q[0], q[1] - 3]); meta.push(w); } }); }
    else { pts.push(w.p()); meta.push(w); }
  });
  const c = polyLen(pts), total = c[c.length - 1];
  const u = (app.simTime * 34 / total) % 1;
  const q = polySample(pts, c, u);
  const Ld = u * total; let idx = 0; while (idx < c.length - 1 && c[idx + 1] <= Ld) idx++;
  const w = meta[Math.min(idx + 1, meta.length - 1)];
  app.tracerNode = w.node; app.tracerText = w.txt;
  trail.push(q); if (trail.length > 40) trail.shift();
  const s = camS();
  ctx.strokeStyle = 'rgba(253,230,138,.6)'; ctx.lineWidth = 3 / s;
  ctx.beginPath(); trail.forEach((p, i) => { if (i && Math.hypot(p[0] - trail[i - 1][0], p[1] - trail[i - 1][1]) > 60) ctx.moveTo(p[0], p[1]); else i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke();
  const r = 9 / s;
  const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r * 2.2);
  g.addColorStop(0, '#fffbe6'); g.addColorStop(.4, COL[w.node] || '#fde68a'); g.addColorStop(1, 'rgba(253,230,138,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q[0], q[1], r * 2.2, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2 / s; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 7); ctx.stroke();
  L(q[0], q[1], '● ' + w.txt, 'proc', { hi: true, color: COL[w.node], dy: -34, force: true });
}

/* ===== 每一步的標籤 ===== */
function collectLabels() {
  const st = app.step;
  // 地形構造
  L(170, 420, '海洋', 'geo', { dy: 0 });
  L(130, 596, '海洋板塊', 'geo', { dy: 30 });
  L(330, 614, '海溝', 'geo', { dy: -40 });
  L(1450, 520, '大陸地殼', 'geo', { dy: 0 });
  L(240, 900, '地函', 'geo', { dy: 0 });
  L(1300, 1000 - 20, '隱沒的板塊', 'geo', { dy: -30 });
  L(CHAMBER.x + 40, CHAMBER.y + 20, '岩漿庫', 'geo', { dy: 34, dx: 30 });
  L(1200, 176, '火山', 'geo', { dy: -30 });
  L(900, surfY(900), '山脈', 'geo', { dy: -40 });
  L(740, surfY(740), '河流', 'geo', { dy: -26, dx: -20 });
  L(520, 420, '大陸棚', 'geo', { dy: 50 });
  // 過程與岩石
  const P = (x, y, t, o = {}) => L(x, y, t, 'proc', { hi: true, ...o });
  switch (st) {
    case 0:
    case 11:
      if (st === 0) {
        P(1250, 240, '火成岩（玄武岩）', { color: COL.igneous, dx: 70, dy: -10 });
        P(985, 548, '火成岩（花岡岩）', { color: COL.igneous, dy: 0 });
        P(470, 470, '沉積岩', { color: COL.sedimentary, dy: 40, dx: -60 });
        P(720, 640, '變質岩', { color: COL.metamorphic, dy: 0 });
      }
      break;
    case 1:
      P(1050, 860, '部分熔融產生岩漿', { color: COL.magma, dy: 30 });
      P(900, plateTop(900) - 10, '板塊釋出水分 → 熔點降低', { color: '#7dd3fc', dy: -40, dx: -60 });
      P(1120, 700, '岩漿密度小而上升', { color: COL.magma, dx: 90, dy: 0 });
      break;
    case 2:
      P(1290, 120, '火山灰', { dy: 0, color: '#cbd5e1' });
      P(1300, surfY(1300), '熔岩流', { color: COL.magma, dy: -30, dx: 40 });
      P(1120, surfY(1120), '快速冷卻 → 噴出岩（晶體細小）', { color: COL.igneous, dy: 40, dx: -110 });
      break;
    case 3:
      P(985, 548, S.PL < .6 ? '岩漿侵入地殼' : '緩慢冷卻 → 侵入岩（晶體粗大）', { color: COL.igneous, dy: 72 });
      break;
    case 4:
      P(900, surfY(900), '隆起成山（造山運動）', { color: COL.int, dy: -50 });
      P(760, 560, '地震', { color: '#fde68a', dy: 0, dx: -70 });
      P(820, surfY(820) + 40, '岩層彎曲（褶皺）', { color: '#fde68a', dy: 50, dx: -40 });
      break;
    case 5:
      P(870, surfY(870), '熱脹冷縮：' + (app.dayText || ''), { dy: -64, color: '#fde68a' });
      P(952, surfY(952) + 15, '冰楔作用：' + (app.iceText || ''), { dy: 40, dx: 70, color: '#bae6fd' });
      P(790, surfY(790) + 10, '生物風化：根部撐裂', { dy: 40, dx: -60, color: '#86efac' });
      P(900, 150, '化學風化：雨水溶蝕', { dy: -20, dx: -100, color: '#93c5fd' });
      break;
    case 6:
      P(870, surfY(870), '冰川侵蝕', { dy: -40, color: '#e0f2fe' });
      P(820, surfY(820), '上游：顆粒大、有稜角', { dy: 50, dx: 40 });
      P(660, surfY(660), '下游：顆粒小、較圓滑', { dy: 50, dx: 20 });
      P(1450, surfY(1450) - 6, '風力侵蝕搬運', { dy: -50 });
      P(612, SL, '海浪侵蝕', { dy: -40, dx: -40, color: '#bae6fd' });
      break;
    case 7:
      P(595, surfY(595), '礫（大，先沉積）', { dy: -60, dx: 30, color: '#d6b77a' });
      P(515, surfY(515), '砂', { dy: -40, color: '#e3c48a' });
      P(430, surfY(430), '泥（細，帶得遠）', { dy: -60, dx: -30, color: '#cbd5e1' });
      P(520, shelfY(520) - 4, '分選作用、層理', { dy: 50 });
      break;
    case 8:
      P(595, surfY(595) + 6, '礫岩', { dy: 50, dx: 40, color: COL.sedimentary });
      P(515, surfY(515) + 6, '砂岩', { dy: 50, color: COL.sedimentary });
      P(430, surfY(430) + 6, '頁岩', { dy: 50, dx: -30, color: COL.sedimentary });
      P(FOSSILS[1][0], shelfY(FOSSILS[1][0]) + FOSSILS[1][1] - 12, '石灰岩層中的化石', { dy: 40, dx: 50, color: COL.sedimentary });
      P(520, 380, '壓密：水分被擠出', { dy: -40, color: '#7dd3fc' });
      break;
    case 9:
      P(720, 640, '區域變質（葉理）', { color: COL.metamorphic, dy: 0 });
      P(985, 548 - 66, '接觸變質', { color: COL.metamorphic, dy: -30 });
      P(700, 720, '頁岩→板岩→片岩→片麻岩', { color: '#d8b4fe', dy: 50, dx: -80 });
      break;
    case 10:
      P(760, 750, '岩石隨板塊下沉', { color: COL.metamorphic, dy: 40, dx: -40 });
      P(1010, 850, '溫度超過熔點 → 熔融', { color: COL.magma, dy: 40 });
      P(1180, 620, '回到岩漿庫', { color: COL.magma, dy: 60, dx: 40 });
      break;
  }
}

/* ===== 每格畫面 ===== */
function renderScene() {
  const t = app.time;
  labels = [];
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, cw, ch);
  const s = camS();
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (cw / 2 - cam.x * s), dpr * (ch / 2 - cam.y * s));
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  drawBackground(t);
  drawWaves(t);
  drawEarth(t);
  drawMeta(t);
  drawPluton(t);
  drawMagmaSystem(t);
  drawSedLayer(t);
  // 河流
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#3b8fd9'; ctx.lineWidth = 4;
  ctx.beginPath(); app._rp.forEach((p, i) => i ? ctx.lineTo(p[0], p[1] - 1) : ctx.moveTo(p[0], p[1] - 1)); ctx.stroke();
  if (app.fx.has('river')) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 10]); ctx.lineDashOffset = -app.simTime * 30; ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
  drawSurfaceDetails(t);
  drawQuake(t);
  drawParticles();
  drawArrows();
  drawTracer();
  ctx.restore();
  collectLabels();
  drawLabels();
}
