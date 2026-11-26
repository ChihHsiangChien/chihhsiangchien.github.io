/* =========================================================================
 * util.js — 共用數學、亂數與幾何工具（連續輪廓繪圖核心）
 * ========================================================================= */
(function () {
  'use strict';
  const BS = (window.BS = window.BS || {});

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class RNG {
    constructor(seed) { this._r = mulberry32((seed >>> 0) || 1); }
    next() { return this._r(); }
    range(a, b) { return a + (b - a) * this._r(); }
    int(a, b) { return a + Math.floor(this._r() * (b - a + 1)); }
    pick(arr) { return arr[Math.floor(this._r() * arr.length)]; }
    chance(p) { return this._r() < p; }
    sign() { return this._r() < 0.5 ? -1 : 1; }
  }

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function cumLengths(pts) {
    const c = [0];
    for (let i = 1; i < pts.length; i++) {
      c.push(c[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    return c;
  }

  /** 沿折線取弧長 s 處的點與切線角 */
  function pointAtS(pts, cum, s) {
    const n = pts.length;
    const L = cum[n - 1];
    if (s <= 0) {
      return { x: pts[0].x, y: pts[0].y, a: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x), i: 0 };
    }
    if (s >= L) {
      return { x: pts[n - 1].x, y: pts[n - 1].y, a: Math.atan2(pts[n - 1].y - pts[n - 2].y, pts[n - 1].x - pts[n - 2].x), i: n - 2 };
    }
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const seg = cum[hi] - cum[lo] || 1;
    const t = (s - cum[lo]) / seg;
    const p0 = pts[lo], p1 = pts[hi];
    return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t, a: Math.atan2(p1.y - p0.y, p1.x - p0.x), i: lo };
  }

  function subPolyline(pts, cum, s0, s1, step, offset) {
    const out = [];
    const n = Math.max(2, Math.ceil(Math.abs(s1 - s0) / (step || 6)) + 1);
    for (let i = 0; i < n; i++) {
      const p = pointAtS(pts, cum, s0 + ((s1 - s0) * i) / (n - 1));
      if (offset) out.push({ x: p.x - Math.sin(p.a) * offset, y: p.y + Math.cos(p.a) * offset });
      else out.push({ x: p.x, y: p.y });
    }
    return out;
  }

  function cubicPts(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, it = 1 - t;
      out.push({
        x: it * it * it * p0.x + 3 * it * it * t * p1.x + 3 * it * t * t * p2.x + t * t * t * p3.x,
        y: it * it * it * p0.y + 3 * it * it * t * p1.y + 3 * it * t * t * p2.y + t * t * t * p3.y
      });
    }
    return out;
  }

  function signedArea(poly) {
    let a = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j].x * poly[i].y - poly[i].x * poly[j].y;
    return a / 2;
  }

  /**
   * 錐形帶狀多邊形（樹突、軸突、突起）。
   * hw 為半寬（數值或逐點陣列），兩端為圓帽，可與其他形狀做無縫聯集。
   */
  function ribbonPoly(pts, hw, capSeg) {
    const n = pts.length;
    const K = capSeg || 5;
    const H = (i) => (typeof hw === 'number' ? hw : hw[i]);
    const L = [], R = [], na = [];
    for (let i = 0; i < n; i++) {
      let tx, ty;
      if (i === 0) { tx = pts[1].x - pts[0].x; ty = pts[1].y - pts[0].y; }
      else if (i === n - 1) { tx = pts[i].x - pts[i - 1].x; ty = pts[i].y - pts[i - 1].y; }
      else { tx = pts[i + 1].x - pts[i - 1].x; ty = pts[i + 1].y - pts[i - 1].y; }
      const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const nx = -ty, ny = tx;
      na.push(Math.atan2(ny, nx));
      const h = H(i);
      L.push({ x: pts[i].x + nx * h, y: pts[i].y + ny * h });
      R.push({ x: pts[i].x - nx * h, y: pts[i].y - ny * h });
    }
    const poly = L.slice();
    const an = na[n - 1], he = H(n - 1), pe = pts[n - 1];
    for (let k = 1; k < K; k++) { const a = an - (Math.PI * k) / K; poly.push({ x: pe.x + Math.cos(a) * he, y: pe.y + Math.sin(a) * he }); }
    for (let i = n - 1; i >= 0; i--) poly.push(R[i]);
    const a0 = na[0], h0 = H(0), p0 = pts[0];
    for (let k = 1; k < K; k++) { const a = a0 + Math.PI - (Math.PI * k) / K; poly.push({ x: p0.x + Math.cos(a) * h0, y: p0.y + Math.sin(a) * h0 }); }
    return poly;
  }

  function circlePoly(cx, cy, r, n, wobble, seed) {
    n = n || 22;
    const out = [];
    const ph = seed || 0;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = wobble ? r * (1 + wobble * Math.sin(3 * a + ph) + wobble * 0.6 * Math.sin(5 * a + ph * 1.7)) : r;
      out.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
    }
    return out;
  }

  function ellipsePoly(cx, cy, rx, ry, rot, n) {
    n = n || 22;
    const out = [], c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      out.push({ x: cx + x * c - y * s, y: cy + x * s + y * c });
    }
    return out;
  }

  /** 把多邊形以一致方向（正向面積）平滑加入 Path2D，確保 nonzero 填色為真正聯集 */
  function addPoly(path, poly, smooth) {
    if (poly.length < 3) return;
    if (signedArea(poly) < 0) poly = poly.slice().reverse();
    const n = poly.length;
    if (smooth === false) {
      path.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < n; i++) path.lineTo(poly[i].x, poly[i].y);
      path.closePath();
      return;
    }
    path.moveTo((poly[n - 1].x + poly[0].x) / 2, (poly[n - 1].y + poly[0].y) / 2);
    for (let i = 0; i < n; i++) {
      const p = poly[i], q = poly[(i + 1) % n];
      path.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
    }
    path.closePath();
  }

  function polylinePath(pts, path) {
    const p = path || new Path2D();
    p.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y);
    return p;
  }

  /** 點到折線最近距離與弧長 */
  function nearestOnPolyline(pts, cum, x, y) {
    let best = Infinity, bs = 0;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1].x, ay = pts[i - 1].y, bx = pts[i].x, by = pts[i].y;
      const dx = bx - ax, dy = by - ay;
      const l2 = dx * dx + dy * dy || 1;
      let t = ((x - ax) * dx + (y - ay) * dy) / l2;
      t = clamp(t, 0, 1);
      const px = ax + dx * t, py = ay + dy * t;
      const d = Math.hypot(x - px, y - py);
      if (d < best) { best = d; bs = cum[i - 1] + (cum[i] - cum[i - 1]) * t; }
    }
    return { d: best, s: bs };
  }

  function niceNumber(v) {
    const e = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / e;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * e;
  }

  BS.util = {
    RNG, lerp, clamp, dist, smoothstep, easeInOut,
    cumLengths, pointAtS, subPolyline, cubicPts, signedArea,
    ribbonPoly, circlePoly, ellipsePoly, addPoly, polylinePath,
    nearestOnPolyline, niceNumber
  };
})();
