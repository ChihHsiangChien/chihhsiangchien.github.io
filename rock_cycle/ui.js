'use strict';
const $ = id => document.getElementById(id);
const appEl = $('app');

/* ===== 循環圖 SVG ===== */
const svg = $('cycle'), NS_SVG = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) { const e = document.createElementNS(NS_SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; }
(function buildCycle() {
  const defs = el('defs', {}, svg);
  [['int', COL.int], ['ext', COL.ext], ['dim', '#475569']].forEach(([id, c]) => {
    const m = el('marker', { id: 'mk-' + id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', fill: c }, m);
  });
  const R = 27;
  CE.forEach(e => {
    const A = CN[e.a], B = CN[e.b];
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    const cx = (A.x + B.x) / 2 + nx * e.curve, cy = (A.y + B.y) / 2 + ny * e.curve;
    const sh = (P, Q) => { const l = Math.hypot(Q.x - P.x, Q.y - P.y); return { x: P.x + (Q.x - P.x) / l * R, y: P.y + (Q.y - P.y) / l * R }; };
    const a = sh(A, { x: cx, y: cy }), b = sh(B, { x: cx, y: cy });
    e.path = el('path', { d: `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`, fill: 'none', 'stroke-width': 2.2, 'stroke-dasharray': e.dash ? '5 4' : '' }, svg);
    const mx = .25 * a.x + .5 * cx + .25 * b.x, my = .25 * a.y + .5 * cy + .25 * b.y;
    e.text = el('text', { x: mx, y: my + 3.5, 'text-anchor': 'middle', 'font-size': 10, 'paint-order': 'stroke', stroke: '#111a2e', 'stroke-width': 3 }, svg);
    e.text.textContent = e.label;
  });
  Object.entries(CN).forEach(([k, n]) => {
    const g = el('g', { class: 'node' }, svg);
    n.circle = el('circle', { cx: n.x, cy: n.y, r: R, 'stroke-width': 2.5 }, g);
    n.text = el('text', { x: n.x, y: n.y + 4.5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700 }, g);
    n.text.textContent = n.label;
    g.addEventListener('click', () => goStep(n.step));
  });
})();
function highlightCycle(nodes, edges) {
  Object.entries(CN).forEach(([k, n]) => {
    const on = nodes.includes(k);
    n.circle.setAttribute('fill', on ? n.c : '#18233d');
    n.circle.setAttribute('stroke', n.c);
    n.circle.setAttribute('opacity', on ? 1 : .55);
    n.text.setAttribute('fill', on ? '#0b1220' : '#cbd5e1');
  });
  CE.forEach(e => {
    const on = edges.includes(e.id), c = e.f === 'int' ? COL.int : COL.ext;
    e.path.setAttribute('stroke', on ? c : '#475569');
    e.path.setAttribute('marker-end', `url(#mk-${on ? e.f : 'dim'})`);
    e.path.setAttribute('opacity', on ? 1 : .6);
    e.text.setAttribute('fill', on ? c : '#64748b');
  });
}

/* ===== 面板 ===== */
const chipsEl = $('chips');
STEPS.forEach((s, i) => {
  const b = document.createElement('button');
  b.className = 'chip ' + s.force; b.textContent = (i ? i + ' ' : '') + s.short;
  b.onclick = () => goStep(i);
  chipsEl.appendChild(b);
});
const BADGE = { int: ['int', '內營力'], ext: ['ext', '外營力'], both: ['both', '內營力＋外營力'] };
function renderPanel() {
  const s = STEPS[app.step];
  const b = BADGE[s.force];
  $('stBadge').innerHTML = `<span class="badge ${b[0]}">${b[1]}</span>`;
  $('stTitle').textContent = s.title;
  $('stDesc').innerHTML = s.desc;
  $('stepNo').textContent = `步驟 ${app.step} / ${STEPS.length - 1}`;
  $('miniTitle').textContent = s.title;
  [...chipsEl.children].forEach((c, i) => c.classList.toggle('on', i === app.step));
  chipsEl.children[app.step].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  const rocks = $('rocks'); rocks.innerHTML = '';
  $('rockSec').style.display = s.rocks.length ? '' : 'none';
  s.rocks.forEach(k => {
    const R = ROCKS[k], card = document.createElement('div'); card.className = 'rock';
    const c = document.createElement('canvas'); c.width = 240; c.height = 96; drawRockTex(c, k);
    const d = document.createElement('div');
    d.innerHTML = `<b>${R.name}</b><span class="t" style="background:${COL[R.type]}">${TYPE_NAME[R.type]}</span><br>${R.tag}｜${R.desc}`;
    card.append(c, d); rocks.appendChild(card);
  });
  $('tracerNow').textContent = '';
  if (s.cycle.nodes.length || s.cycle.edges.length) highlightCycle(s.cycle.nodes, s.cycle.edges);
}
function goStep(i) {
  app.step = clamp(i, 0, STEPS.length - 1);
  app.stepT = 0; app.dwell = 0;
  app.fx = new Set(STEPS[app.step].fx);
  parts.length = 0;
  if (app.opt.autoCam) flyTo(STEPS[app.step].focus);
  renderPanel();
}
function setPlaying(p) {
  app.playing = p;
  $('play').textContent = p ? '⏸ 暫停' : '▶ 自動播放';
}

/* ===== 控制 ===== */
$('prev').onclick = $('miniPrev').onclick = () => goStep(app.step - 1);
$('next').onclick = $('miniNext').onclick = () => goStep(app.step + 1);
$('replay').onclick = () => goStep(app.step);
$('play').onclick = () => { if (!app.playing && app.step === STEPS.length - 1) goStep(0); setPlaying(!app.playing); };
$('hidePanel').onclick = () => appEl.classList.add('collapsed');
$('miniOpen').onclick = () => appEl.classList.remove('collapsed');
$('zIn').onclick = () => { camFly.on = false; zoomAt(cw / 2, ch / 2, 1.3); };
$('zOut').onclick = () => { camFly.on = false; zoomAt(cw / 2, ch / 2, 1 / 1.3); };
$('zFit').onclick = () => flyTo([800, 540, 1]);
const tg = { tGeo: 'geo', tProc: 'proc', tForce: 'force', tCam: 'autoCam' };
Object.entries(tg).forEach(([id, k]) => $(id).onchange = e => {
  app.opt[k] = e.target.checked; syncLblBtn();
  if (k === 'autoCam' && app.opt.autoCam) flyTo(STEPS[app.step].focus);
});
function syncLblBtn() { $('lblBtn').classList.toggle('off', !(app.opt.geo || app.opt.proc)); }
function toggleAllLabels() {
  const on = !(app.opt.geo || app.opt.proc);
  app.opt.geo = app.opt.proc = on; $('tGeo').checked = $('tProc').checked = on; syncLblBtn();
}
$('lblBtn').onclick = toggleAllLabels;
$('speed').oninput = e => { app.speed = +e.target.value; $('speedV').textContent = app.speed + '×'; };
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' && e.target.type === 'range') return;
  if (e.key === 'ArrowRight') goStep(app.step + 1);
  else if (e.key === 'ArrowLeft') goStep(app.step - 1);
  else if (e.key === ' ') { e.preventDefault(); $('play').click(); }
  else if (e.key === 'r' || e.key === 'R') goStep(app.step);
  else if (e.key === 'l' || e.key === 'L') toggleAllLabels();
  else if (e.key === 'p' || e.key === 'P') appEl.classList.toggle('collapsed');
});

/* ===== 觸控／滑鼠：平移、縮放 ===== */
const ptrs = new Map(); let pinch = null, lastTap = 0;
function pinchInfo() { const [a, b] = [...ptrs.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function localPos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, localPos(e)); camFly.on = false;
  if (ptrs.size === 2) pinch = pinchInfo();
  if (e.pointerType === 'touch' && ptrs.size === 1) { const now = performance.now(); if (now - lastTap < 300) flyTo([800, 540, 1]); lastTap = now; }
});
cv.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return;
  const p = localPos(e), old = ptrs.get(e.pointerId); ptrs.set(e.pointerId, p);
  const s = camS();
  if (ptrs.size === 1) { cam.x -= (p.x - old.x) / s; cam.y -= (p.y - old.y) / s; clampCam(); }
  else if (ptrs.size === 2 && pinch) {
    const n = pinchInfo();
    cam.x -= (n.x - pinch.x) / camS(); cam.y -= (n.y - pinch.y) / camS();
    if (pinch.d > 0) zoomAt(n.x, n.y, n.d / pinch.d);
    pinch = n;
  }
});
const endPtr = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; };
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('wheel', e => { e.preventDefault(); camFly.on = false; const p = localPos(e); zoomAt(p.x, p.y, Math.exp(-e.deltaY * .0015)); }, { passive: false });
cv.addEventListener('dblclick', () => flyTo([800, 540, 1]));

/* ===== 主迴圈 ===== */
function updateState(dt) {
  const st = app.step, e = ease(clamp(app.stepT));
  const T = {};
  for (const k in ANIM_STEP) T[k] = (st === 0 || st === STEPS.length - 1) ? 1 : ANIM_STEP[k] < st ? 1 : ANIM_STEP[k] === st ? e : 0;
  T.PLvis = (st === 0 || st >= 3) ? 1 : 0;
  const f = 1 - Math.exp(-dt * 5);
  for (const k in T) S[k] += (T[k] - S[k]) * f;
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const sdt = dt * app.speed;
  app.time += sdt; app.simTime += sdt;
  app.stepT = Math.min(1, app.stepT + sdt / 6);
  if (app.playing) {
    if (app.stepT >= 1) app.dwell += sdt;
    const need = app.step === STEPS.length - 1 ? 30 : 4;
    if (app.dwell > need) { if (app.step < STEPS.length - 1) goStep(app.step + 1); else setPlaying(false); }
  }
  $('progBar').style.width = (app.stepT * 100) + '%';
  if (camFly.on) {
    camFly.t = Math.min(1, camFly.t + dt / 1.2);
    const k = ease(camFly.t), a = camFly.from, b = camFly.to;
    cam.x = lerp(a.x, b.x, k); cam.y = lerp(a.y, b.y, k); cam.z = lerp(a.z, b.z, k);
    if (camFly.t >= 1) camFly.on = false;
  }
  updateState(dt);
  updateSurface();
  spawnParticles(sdt);
  updateParticles(sdt);
  renderScene();
  if (app.fx.has('tracer')) {
    const txt = '目前：' + app.tracerText;
    if ($('tracerNow').textContent !== txt) { $('tracerNow').textContent = txt; highlightCycle([app.tracerNode], []); }
  }
  requestAnimationFrame(frame);
}
goStep(0);
requestAnimationFrame(frame);
