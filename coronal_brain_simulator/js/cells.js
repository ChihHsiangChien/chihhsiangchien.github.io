/* =========================================================================
 * cells.js — 教科書插圖級細胞形態生成與繪製
 *
 * 核心技法：每個細胞的胞體、樹突、軸突、突起、終足都建成「同方向多邊形」
 * 並合併為單一 Path2D。繪製時先以墨線色描粗邊、再以本體色填滿，
 * 內部接縫被填色覆蓋，只留下外輪廓 → 神經突與胞體成為連續的單一剪影。
 * ========================================================================= */
(function () {
  'use strict';
  const U = BS.util;
  const INK = '#24180f';
  const LX = -0.6, LY = -0.8; // 光源方向（左上）

  const PAL = {
    excit: { base: '#f4d06a', hi: '255,251,228', shade: 'rgba(130,80,8,0.30)', light: 'rgba(255,255,236,0.62)',
      nucleus: ['#f7d9b5', '#c58a55', '#82482a'], nucleolus: '#3e1f0e', nissl: 'rgba(110,55,120,0.55)', name: '興奮性神經元' },
    inhib: { base: '#c7aee8', hi: '250,244,255', shade: 'rgba(70,30,115,0.30)', light: 'rgba(255,250,255,0.55)',
      nucleus: ['#eadcf7', '#9a72c6', '#583487'], nucleolus: '#2e1450', nissl: 'rgba(60,25,120,0.5)', name: '抑制性神經元' },
    astro: { base: '#9fcf63', hi: '242,255,225', shade: 'rgba(38,80,8,0.30)', light: 'rgba(250,255,235,0.55)',
      nucleus: ['#d4eab8', '#79a845', '#3f6d19'] },
    oligo: { base: '#93d3f3', hi: '238,251,255', shade: 'rgba(8,70,125,0.30)', light: 'rgba(255,255,255,0.7)',
      nucleus: ['#bfe8fc', '#2d82c4', '#0e4a82'] },
    micro: { base: '#a9343f', hi: '245,150,160', shade: 'rgba(55,0,8,0.38)', light: 'rgba(255,205,210,0.42)',
      nucleus: ['#7c1e29', '#4a0b12', '#2a0508'] },
    epend: { base: '#f3a5b3', hi: '255,238,242', shade: 'rgba(140,40,62,0.28)', light: 'rgba(255,246,248,0.55)',
      nucleus: ['#dcb0b9', '#8c5160', '#5a2a36'] }
  };

  /* ---------------- 幾何累積器 ---------------- */
  class Geom {
    constructor() { this.polys = []; this.lines = []; this.x0 = Infinity; this.y0 = Infinity; this.x1 = -Infinity; this.y1 = -Infinity; }
    poly(p) {
      this.polys.push(p);
      for (const q of p) {
        if (q.x < this.x0) this.x0 = q.x; if (q.y < this.y0) this.y0 = q.y;
        if (q.x > this.x1) this.x1 = q.x; if (q.y > this.y1) this.y1 = q.y;
      }
      return this;
    }
    ribbon(pts, hw, opt) {
      this.poly(U.ribbonPoly(pts, hw, 5));
      if (!opt || opt.shade !== false) this.lines.push({ pts, hw, skipC: opt && opt.skipC, skipR: (opt && opt.skipR) || 0 });
      return this;
    }
    path(extra) {
      const p = new Path2D();
      for (const q of this.polys) U.addPoly(p, q, true);
      if (extra) for (const q of extra) U.addPoly(p, q, true);
      return p;
    }
    /** 依骨架偏移產生的明暗線（立體圓柱感），只畫在剪影內部 */
    shading() {
      const lt = new Path2D(), ln = new Path2D(), dt = new Path2D(), dn = new Path2D();
      for (const L of this.lines) {
        const hwAt = (i) => (typeof L.hw === 'number' ? L.hw : L.hw[i]);
        let avg = 0;
        for (let i = 0; i < L.pts.length; i++) avg += hwAt(i);
        avg /= L.pts.length;
        const thick = avg > 2.1;
        const lp = thick ? lt : ln, dp = thick ? dt : dn;
        let started = false;
        for (let i = 0; i < L.pts.length; i++) {
          const p = L.pts[i];
          if (L.skipC && Math.hypot(p.x - L.skipC.x, p.y - L.skipC.y) < L.skipR) { started = false; continue; }
          const h = hwAt(i);
          const lx = p.x + LX * h * 0.45, ly = p.y + LY * h * 0.45;
          const dx = p.x - LX * h * 0.42, dy = p.y - LY * h * 0.42;
          if (!started) { lp.moveTo(lx, ly); dp.moveTo(dx, dy); started = true; }
          else { lp.lineTo(lx, ly); dp.lineTo(dx, dy); }
        }
      }
      return { lt, ln, dt, dn };
    }
    bbox(pad) { pad = pad || 0; return { x0: this.x0 - pad, y0: this.y0 - pad, x1: this.x1 + pad, y1: this.y1 + pad }; }
  }

  /* ---------------- 分支生長（樹突／星形膠突起／微膠分枝） ---------------- */
  function grow(cell, rng, x, y, ang, len, hw0, hw1, depth, maxDepth, o, parent, parentIdx) {
    const step = o.step || 6;
    const cnt = Math.max(3, Math.round(len / step));
    const pts = [{ x, y }];
    let a = ang, px = x, py = y;
    const wig = o.wiggle == null ? 0.16 : o.wiggle;
    for (let i = 1; i <= cnt; i++) {
      a += rng.range(-wig, wig);
      a += (ang - a) * 0.14;
      px += (Math.cos(a) * len) / cnt;
      py += (Math.sin(a) * len) / cnt;
      pts.push({ x: px, y: py });
    }
    const willFork = depth < maxDepth && rng.chance(o.fork == null ? 0.72 : o.fork);
    const tipHw = willFork ? Math.max(hw1 * 1.25, hw0 * 0.55) : hw1;
    const cum = U.cumLengths(pts);
    const hw = pts.map((p, i) => {
      const t = i / cnt;
      let w = tipHw + (hw0 - tipHw) * Math.pow(1 - t, o.taper || 1.2);
      if (o.flare && depth === 0) w += o.flare.w * Math.exp(-cum[i] / o.flare.d);
      return w;
    });
    const br = { pts, hw, cum, len: cum[cum.length - 1], depth, parent: parent || null, parentIdx: parentIdx || 0, apical: !!o.apical, id: cell.branches.length };
    cell.branches.push(br);

    if (depth < maxDepth) {
      const sides = o.sides ? o.sides(depth, rng) : rng.int(0, 1);
      for (let k = 0; k < sides; k++) {
        const idx = Math.max(1, Math.min(cnt - 1, Math.round(cnt * rng.range(0.28, 0.78))));
        const p = pts[idx];
        const la = Math.atan2(pts[idx + 1].y - pts[idx - 1].y, pts[idx + 1].x - pts[idx - 1].x);
        const sa = o.sideAngle || [0.5, 1.05];
        const ca = la + rng.sign() * rng.range(sa[0], sa[1]);
        grow(cell, rng, p.x, p.y, ca, len * rng.range(0.42, 0.66), Math.min(hw[idx] * 0.72, hw0 * 0.7), hw1, depth + 1, maxDepth,
          Object.assign({}, o, { flare: null, apical: false }), br, idx);
      }
    }
    if (willFork) {
      const end = pts[cnt];
      const spread = rng.range(0.32, 0.6);
      for (const sg of [-1, 1]) {
        grow(cell, rng, end.x, end.y, a + sg * spread + rng.range(-0.1, 0.1), len * rng.range(0.5, 0.72), tipHw * 0.95, hw1,
          depth + 1, maxDepth, Object.assign({}, o, { flare: null }), br, cnt);
      }
    }
    return br;
  }

  /* ---------------- 神經元 ---------------- */
  const NEURON_KINDS = {
    pyramidal: { title: '錐體神經元', en: 'Pyramidal neuron', spiny: true, excit: true },
    stellate: { title: '多極星狀神經元', en: 'Multipolar stellate neuron', spiny: true, excit: true },
    basket: { title: '籃狀細胞（抑制性中間神經元）', en: 'Basket cell (GABAergic)', spiny: false, excit: false },
    msn: { title: '中型多棘神經元（GABA）', en: 'Medium spiny neuron', spiny: true, excit: false },
    cholinergic: { title: '大型無棘中間神經元（膽鹼性）', en: 'Cholinergic interneuron', spiny: false, excit: true },
    relay: { title: '視丘中繼神經元', en: 'Thalamic relay neuron', spiny: false, excit: true },
    virtual: { title: '遠端投射軸突', en: 'Projection axon', spiny: false, excit: true }
  };

  function buildNeuronMorph(rng, spec) {
    const kind = NEURON_KINDS[spec.kind];
    const n = {
      cls: 'neuron', kind: spec.kind, kindInfo: kind, x: spec.x, y: spec.y, r: spec.r || 16,
      excit: kind.excit, spiny: kind.spiny, virtual: spec.kind === 'virtual',
      orient: spec.orient == null ? -Math.PI / 2 : spec.orient,
      branches: [], axonAngle: 0, seed: rng.int(1, 1e9), somaWobble: rng.range(0, 6)
    };
    if (n.virtual) return n;
    const r = n.r;
    const flare = (k, d) => ({ w: r * k, d: r * d });
    if (spec.kind === 'pyramidal') {
      const apLen = spec.apicalLen || 320;
      grow(n, rng, n.x, n.y, n.orient + rng.range(-0.06, 0.06), apLen, 3.3, 0.9, 0, 3,
        { apical: true, flare: flare(0.62, 1.0), wiggle: 0.07, taper: 0.9, fork: 0.95,
          sides: (d, R) => (d === 0 ? R.int(3, 5) : d === 1 ? R.int(0, 1) : 0), sideAngle: [0.7, 1.15] });
      const nb = rng.int(4, 6);
      for (let i = 0; i < nb; i++) {
        const a = n.orient + Math.PI + ((i + 0.5) / nb - 0.5) * 3.3 + rng.range(-0.15, 0.15);
        grow(n, rng, n.x, n.y, a, rng.range(spec.basalLen ? spec.basalLen * 0.8 : 70, spec.basalLen || 115), 2.5, 0.7, 0, 2,
          { flare: flare(0.38, 0.6), wiggle: 0.2 });
      }
      n.axonAngle = n.orient + Math.PI + rng.range(-0.15, 0.15);
    } else {
      const P = {
        stellate: { nd: [5, 7], len: [70, 115], hw: 2.4, depth: 2, wig: 0.2 },
        basket: { nd: [5, 6], len: [65, 100], hw: 2.0, depth: 2, wig: 0.24 },
        msn: { nd: [5, 6], len: [80, 115], hw: 2.3, depth: 2, wig: 0.22 },
        cholinergic: { nd: [4, 5], len: [110, 160], hw: 2.8, depth: 2, wig: 0.14 },
        relay: { nd: [6, 8], len: [55, 80], hw: 2.4, depth: 2, wig: 0.26 }
      }[spec.kind];
      const nd = rng.int(P.nd[0], P.nd[1]);
      const off = rng.range(0, Math.PI * 2);
      for (let i = 0; i < nd; i++) {
        const a = off + (i / nd) * Math.PI * 2 + rng.range(-0.25, 0.25);
        grow(n, rng, n.x, n.y, a, rng.range(P.len[0], P.len[1]), P.hw, 0.7, 0, P.depth,
          { flare: flare(0.42, 0.62), wiggle: P.wig, fork: spec.kind === 'relay' ? 0.9 : 0.7 });
      }
      // 軸突自兩支主樹突之間的空隙發出
      const roots = n.branches.filter((b) => b.depth === 0).map((b) => Math.atan2(b.pts[2].y - n.y, b.pts[2].x - n.x)).sort((p, q) => p - q);
      let bestGap = 0, bestA = rng.range(0, 6.28);
      for (let i = 0; i < roots.length; i++) {
        const a0 = roots[i], a1 = i === roots.length - 1 ? roots[0] + Math.PI * 2 : roots[i + 1];
        if (a1 - a0 > bestGap) { bestGap = a1 - a0; bestA = (a0 + a1) / 2; }
      }
      n.axonAngle = spec.axonAngle != null ? spec.axonAngle : bestA;
    }
    // 尼氏體
    n.nissl = [];
    for (let i = 0; i < 14; i++) {
      const a = rng.range(0, Math.PI * 2), rr = rng.range(r * 0.5, r * 0.85);
      n.nissl.push({ x: n.x + Math.cos(a) * rr, y: n.y + Math.sin(a) * rr, rx: rng.range(0.9, 1.8), ry: rng.range(0.5, 0.9), rot: rng.range(0, 3.14) });
    }
    return n;
  }

  /* ---------------- 軸突（含軸突丘、側枝、終扣、髓鞘節段） ---------------- */
  const V_UNM = 170;   // 無髓鞘傳導速度（world 單位/秒，模擬時間）
  const V_MYE = 1250;  // 有髓鞘跳躍傳導
  const INTERNODE = 46, NODE_GAP = 4.5;

  function axonHw(main, s, r) {
    return (main ? 1.45 : 0.95) + (main ? r * 0.5 * Math.exp(-s / (r * 0.55)) : 0.55 * Math.exp(-s / 6));
  }

  function makeAxonPath(pts, isMain, r, myelin, startTrim) {
    const cum = U.cumLengths(pts);
    const len = cum[cum.length - 1];
    const hw = pts.map((p, i) => axonHw(isMain, cum[i], r));
    const path = { pts, cum, len, hw, main: isMain, internodes: [], nodes: [], synapse: null, parent: -1, fromS: 0, tArr: null, tEnd: 0 };
    if (myelin && len > 200) {
      let s = (startTrim || 0) + 28;
      const m1 = len - 42;
      while (s + INTERNODE <= m1) {
        path.internodes.push({ s0: s, s1: s + INTERNODE, owner: null });
        s += INTERNODE + NODE_GAP;
      }
      for (let k = 0; k < path.internodes.length - 1; k++) path.nodes.push(path.internodes[k].s1 + NODE_GAP / 2);
    }
    return path;
  }

  function inInternode(path, s) {
    for (const it of path.internodes) if (s >= it.s0 && s <= it.s1) return true;
    return false;
  }

  function computeArrival(path, t0) {
    const t = [t0];
    for (let i = 1; i < path.pts.length; i++) {
      const ds = path.cum[i] - path.cum[i - 1];
      const sm = (path.cum[i] + path.cum[i - 1]) / 2;
      t.push(t[i - 1] + ds / (inInternode(path, sm) ? V_MYE : V_UNM));
    }
    path.tArr = t;
    path.tEnd = t[t.length - 1];
  }

  function timeAtS(path, s) {
    const p = U.pointAtS(path.pts, path.cum, s);
    const i = p.i;
    const seg = path.cum[i + 1] - path.cum[i] || 1;
    const f = U.clamp((s - path.cum[i]) / seg, 0, 1);
    return path.tArr[i] + (path.tArr[i + 1] - path.tArr[i]) * f;
  }

  function sAtTime(path, tau) {
    const t = path.tArr;
    if (tau <= t[0]) return -1;
    if (tau >= t[t.length - 1]) return path.len + 1;
    let lo = 0, hi = t.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t[m] <= tau) lo = m; else hi = m; }
    const f = (tau - t[lo]) / (t[hi] - t[lo] || 1);
    return path.cum[lo] + (path.cum[hi] - path.cum[lo]) * f;
  }

  /**
   * 建立神經元軸突樹。
   * targets: [{bouton, contact}]；opt.exit: 主軸突離開視野的終點
   */
  function buildAxon(n, rng, targets, opt) {
    const paths = [];
    const a0 = n.axonAngle;
    const r = n.r;
    let origin, hill, startTrim = 0;
    if (n.virtual) {
      origin = { x: n.x, y: n.y };
      hill = { x: n.x + Math.cos(a0) * 30, y: n.y + Math.sin(a0) * 30 };
    } else {
      origin = { x: n.x, y: n.y };
      hill = { x: n.x + Math.cos(a0) * (r + 16), y: n.y + Math.sin(a0) * (r + 16) };
      startTrim = r;
    }
    const tlist = targets.slice();
    let mainEnd, approach, mainSyn = null, mainPts;
    if (opt.exit) {
      mainEnd = opt.exit;
      approach = { x: -Math.cos(opt.exitAngle), y: -Math.sin(opt.exitAngle) };
    } else {
      const t0 = tlist.shift();
      mainEnd = t0.bouton; mainSyn = t0;
      approach = norm(t0.bouton.x - t0.contact.x, t0.bouton.y - t0.contact.y);
    }
    if (opt.route) {
      // 指定走道（白質平行纖維束、穿越纖維）
      const route = opt.route;
      if (n.virtual) mainPts = route.slice();
      else {
        const d1 = norm(route[1].x - route[0].x, route[1].y - route[0].y);
        const lead = U.cubicPts(hill, { x: hill.x + Math.cos(a0) * 30, y: hill.y + Math.sin(a0) * 30 },
          { x: route[0].x - d1.x * 30, y: route[0].y - d1.y * 30 }, route[0], 6);
        mainPts = [origin, { x: (origin.x + hill.x) / 2, y: (origin.y + hill.y) / 2 }].concat(lead, route.slice(1));
      }
    } else {
      const L = U.dist(hill.x, hill.y, mainEnd.x, mainEnd.y);
      const c1 = { x: hill.x + Math.cos(a0) * Math.min(220, L * 0.45), y: hill.y + Math.sin(a0) * Math.min(220, L * 0.45) };
      const c2 = { x: mainEnd.x + approach.x * Math.min(170, L * 0.35), y: mainEnd.y + approach.y * Math.min(170, L * 0.35) };
      const bez = U.cubicPts(hill, c1, c2, mainEnd, Math.max(8, Math.round(L / 8)));
      mainPts = [origin, { x: (origin.x + hill.x) / 2, y: (origin.y + hill.y) / 2 }].concat(bez);
    }
    const main = makeAxonPath(mainPts, true, n.virtual ? 2 : r, opt.myelin, startTrim);
    main.synapse = mainSyn;
    paths.push(main);

    // 側枝（collaterals）
    for (const tg of tlist) {
      let bestS = main.len * 0.5, bestD = Infinity;
      const sMin = (n.virtual ? 40 : r + 40), sMax = Math.max(sMin + 1, main.len - 40);
      for (let k = 0; k <= 24; k++) {
        const s = sMin + ((sMax - sMin) * k) / 24;
        const p = U.pointAtS(main.pts, main.cum, s);
        const d = U.dist(p.x, p.y, tg.bouton.x, tg.bouton.y) + rng.range(0, 30);
        if (d < bestD) { bestD = d; bestS = s; }
      }
      // 避免側枝從髓鞘節段中間長出：對齊到蘭氏結
      if (main.nodes.length) {
        let nb = main.nodes[0];
        for (const nd of main.nodes) if (Math.abs(nd - bestS) < Math.abs(nb - bestS)) nb = nd;
        if (Math.abs(nb - bestS) < 80) bestS = nb;
      }
      const B = U.pointAtS(main.pts, main.cum, bestS);
      const toT = Math.atan2(tg.bouton.y - B.y, tg.bouton.x - B.x);
      let da = toT - B.a;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const startA = B.a + U.clamp(da, -1.0, 1.0);
      const D = U.dist(B.x, B.y, tg.bouton.x, tg.bouton.y);
      const ap = norm(tg.bouton.x - tg.contact.x, tg.bouton.y - tg.contact.y);
      const p1 = { x: B.x + Math.cos(startA) * Math.min(70, D * 0.4), y: B.y + Math.sin(startA) * Math.min(70, D * 0.4) };
      const p2 = { x: tg.bouton.x + ap.x * Math.min(70, D * 0.35), y: tg.bouton.y + ap.y * Math.min(70, D * 0.35) };
      const pts = U.cubicPts({ x: B.x, y: B.y }, p1, p2, tg.bouton, Math.max(6, Math.round(D / 8)));
      const col = makeAxonPath(pts, false, r, opt.myelin && opt.myelinCollaterals, 0);
      col.parent = 0; col.fromS = bestS; col.synapse = tg;
      paths.push(col);
    }
    computeArrival(main, 0);
    for (const p of paths) if (p.parent >= 0) computeArrival(p, timeAtS(paths[p.parent], p.fromS));
    n.axon = { paths, maxT: Math.max.apply(null, paths.map((p) => p.tEnd)) };
    return n.axon;
  }

  function norm(x, y) { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; }

  /** 樹突接觸點：從突觸點沿樹突回溯到胞體的路徑（突觸後電位傳遞用） */
  function pathToSoma(n, br, idx) {
    const pts = [];
    let b = br, i = idx;
    while (b) {
      for (let k = i; k >= 0; k--) pts.push(b.pts[k]);
      if (!b.parent) break;
      i = b.parentIdx; b = b.parent;
    }
    const last = pts[pts.length - 1];
    if (Math.hypot(last.x - n.x, last.y - n.y) > 0.5) pts.push({ x: n.x, y: n.y });
    return pts;
  }

  /* ---------------- 神經元最終剪影 ---------------- */
  function finalizeNeuron(n, rng) {
    const g = new Geom();
    if (!n.virtual) g.poly(U.circlePoly(n.x, n.y, n.r, 30, 0.05, n.somaWobble));
    for (const br of n.branches) {
      g.ribbon(br.pts, br.hw, br.depth === 0 ? { skipC: n, skipR: n.r * 0.95 } : null);
    }
    if (n.axon) {
      for (const p of n.axon.paths) {
        g.ribbon(p.pts, p.hw, { skipC: n, skipR: n.r + 6 });
        if (p.synapse) g.poly(U.circlePoly(p.pts[p.pts.length - 1].x, p.pts[p.pts.length - 1].y, 3.4, 14));
      }
    }
    n.body = g.path();
    n.shade = g.shading();
    n.bbox = g.bbox(6);
    if (n.spiny) {
      const spines = [];
      n.spines = [];
      for (const br of n.branches) {
        const startS = br.depth === 0 ? n.r + 10 : 4;
        let s = startS + rng.range(0, 4), side = 1;
        while (s < br.len - 2) {
          const p = U.pointAtS(br.pts, br.cum, s);
          const hw = br.hw[Math.min(br.hw.length - 1, p.i)];
          const nx = -Math.sin(p.a) * side, ny = Math.cos(p.a) * side;
          const tilt = rng.range(-0.5, 0.5);
          const dx = nx * Math.cos(tilt) - ny * Math.sin(tilt), dy = nx * Math.sin(tilt) + ny * Math.cos(tilt);
          const sl = rng.range(3.2, 5.2);
          const a = { x: p.x + nx * hw * 0.5, y: p.y + ny * hw * 0.5 };
          const b = { x: p.x + nx * hw + dx * sl, y: p.y + ny * hw + dy * sl };
          spines.push(U.ribbonPoly([a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, b], 0.42, 3));
          const hr = rng.range(1.0, 1.55);
          spines.push(U.circlePoly(b.x + dx * hr * 0.6, b.y + dy * hr * 0.6, hr, 8));
          n.spines.push({ x: b.x, y: b.y });
          s += rng.range(4.5, 8.5);
          side = rng.chance(0.7) ? -side : side;
        }
      }
      n.bodySpiny = g.path(spines);
    }
  }

  /* ---------------- 星形膠質細胞 ---------------- */
  function buildAstrocyte(a, rng, vessels, fibrous) {
    const cell = { cls: 'astrocyte', x: a.x, y: a.y, r: a.r || 10, branches: [], endfeet: [], fibrous: !!fibrous };
    const g = new Geom();
    g.poly(U.circlePoly(cell.x, cell.y, cell.r, 24, 0.08, rng.range(0, 6)));
    // 血管終足
    let best = null;
    for (const v of vessels) {
      const nr = U.nearestOnPolyline(v.pts, v.cum, cell.x, cell.y);
      if (nr.d < 320 && (!best || nr.d < best.d)) best = { v, s: nr.s, d: nr.d };
    }
    const footAngles = [];
    if (best) {
      const v = best.v;
      const nf = best.d < 200 ? 2 : 1;
      for (let k = 0; k < nf; k++) {
        const s = U.clamp(best.s + (k === 0 ? rng.range(-15, 15) : rng.sign() * rng.range(38, 60)), 25, v.len - 25);
        const P = U.pointAtS(v.pts, v.cum, s);
        const nx = -Math.sin(P.a), ny = Math.cos(P.a);
        const side = Math.sign((cell.x - P.x) * nx + (cell.y - P.y) * ny) || 1;
        const off = v.R + 2.4;
        const W = { x: P.x + nx * side * off, y: P.y + ny * side * off };
        const D = U.dist(cell.x, cell.y, W.x, W.y);
        const ang = Math.atan2(W.y - cell.y, W.x - cell.x);
        footAngles.push(ang);
        const p1 = { x: cell.x + Math.cos(ang + rng.range(-0.3, 0.3)) * D * 0.35, y: cell.y + Math.sin(ang + rng.range(-0.3, 0.3)) * D * 0.35 };
        const p2 = { x: W.x + nx * side * D * 0.3, y: W.y + ny * side * D * 0.3 };
        const pts = U.cubicPts({ x: cell.x, y: cell.y }, p1, p2, W, Math.max(6, Math.round(D / 7)));
        const cum = U.cumLengths(pts);
        const hw = pts.map((p, i) => 1.9 + cell.r * 0.32 * Math.exp(-cum[i] / (cell.r * 0.7)) + 0.6 * (i / (pts.length - 1)));
        g.ribbon(pts, hw, { skipC: cell, skipR: cell.r });
        const pad = U.subPolyline(v.pts, v.cum, s - 17, s + 17, 4, side * off);
        g.ribbon(pad, 2.7, { shade: true });
        cell.endfeet.push({ x: W.x, y: W.y, vessel: v, s });
      }
    }
    const np = fibrous ? rng.int(5, 6) : rng.int(7, 10);
    const off = rng.range(0, 6.28);
    for (let i = 0; i < np; i++) {
      const ang = off + (i / np) * Math.PI * 2 + rng.range(-0.25, 0.25);
      if (footAngles.some((fa) => Math.abs(Math.atan2(Math.sin(ang - fa), Math.cos(ang - fa))) < 0.45)) continue;
      grow(cell, rng, cell.x, cell.y, ang, fibrous ? rng.range(95, 150) : rng.range(42, 80), 2.1, 0.55, 0, fibrous ? 1 : 2,
        { flare: { w: cell.r * 0.34, d: cell.r * 0.6 }, wiggle: fibrous ? 0.08 : 0.26, sides: (d, R) => (fibrous ? R.int(0, 1) : R.int(1, 2)), fork: fibrous ? 0.3 : 0.75 });
    }
    for (const br of cell.branches) g.ribbon(br.pts, br.hw, br.depth === 0 ? { skipC: cell, skipR: cell.r } : null);
    cell.body = g.path();
    cell.shade = g.shading();
    cell.bbox = g.bbox(6);
    cell.nucleus = { x: cell.x + rng.range(-1.5, 1.5), y: cell.y + rng.range(-1.5, 1.5), rx: cell.r * 0.6, ry: cell.r * 0.42, rot: rng.range(0, 3.14) };
    cell.baseScale = 1;
    return cell;
  }

  /* ---------------- 寡突膠質細胞（突起延續為髓鞘） ---------------- */
  function buildOligodendrocyte(o, rng) {
    const cell = { cls: 'oligodendrocyte', x: o.x, y: o.y, r: o.r || 8.5, sheaths: o.sheaths || [] };
    const gFull = new Geom(), gProc = new Geom(), gSheath = new Geom();
    const soma = U.circlePoly(cell.x, cell.y, cell.r, 22, 0.05, rng.range(0, 6));
    gFull.poly(soma); gProc.poly(soma);
    cell.procEnds = [];
    for (const sh of cell.sheaths) {
      const path = sh.path, it = sh.internode;
      const mid = U.pointAtS(path.pts, path.cum, (it.s0 + it.s1) / 2);
      const D = U.dist(cell.x, cell.y, mid.x, mid.y);
      const ang = Math.atan2(mid.y - cell.y, mid.x - cell.x);
      const bend = rng.range(-0.35, 0.35);
      const p1 = { x: cell.x + Math.cos(ang + bend) * D * 0.4, y: cell.y + Math.sin(ang + bend) * D * 0.4 };
      const p2 = { x: mid.x - Math.cos(ang - bend) * D * 0.3, y: mid.y - Math.sin(ang - bend) * D * 0.3 };
      const pts = U.cubicPts({ x: cell.x, y: cell.y }, p1, p2, { x: mid.x, y: mid.y }, Math.max(5, Math.round(D / 7)));
      const cum = U.cumLengths(pts);
      const hw = pts.map((p, i) => 1.15 + cell.r * 0.3 * Math.exp(-cum[i] / (cell.r * 0.8)) + 0.9 * Math.pow(i / (pts.length - 1), 3));
      gFull.ribbon(pts, hw, { skipC: cell, skipR: cell.r });
      gProc.ribbon(pts, hw, { skipC: cell, skipR: cell.r });
      const sp = U.subPolyline(path.pts, path.cum, it.s0, it.s1, 5);
      gFull.ribbon(sp, 3.9);
      gSheath.ribbon(sp, 3.9);
      cell.procEnds.push({ x: mid.x, y: mid.y });
      it.owner = cell;
    }
    cell.body = gFull.path(); cell.shade = gFull.shading(); cell.bbox = gFull.bbox(6);
    cell.procBody = gProc.path(); cell.procShade = gProc.shading();
    cell.sheathBody = gSheath.path(); cell.sheathShade = gSheath.shading();
    cell.nucleus = { x: cell.x, y: cell.y, rx: cell.r * 0.66, ry: cell.r * 0.6, rot: rng.range(0, 3) };
    return cell;
  }

  function buildOrphanSheaths(list) {
    const g = new Geom();
    for (const sh of list) g.ribbon(U.subPolyline(sh.path.pts, sh.path.cum, sh.internode.s0, sh.internode.s1, 5), 3.9);
    return { body: g.path(), shade: g.shading(), bbox: g.polys.length ? g.bbox(4) : null };
  }

  /* ---------------- 微膠細胞（局部座標，可移動） ---------------- */
  function buildMicroglia(m, rng) {
    const cell = { cls: 'microglia', x: m.x, y: m.y, rot: rng.range(0, 6.28), branches: [], vx: 0, vy: 0, eat: 0, target: null, wander: rng.range(0, 6.28) };
    const g = new Geom();
    g.poly(U.ellipsePoly(0, 0, 7.5, 4.8, 0, 20));
    const np = rng.int(4, 6);
    for (let i = 0; i < np; i++) {
      const ang = (i / np) * Math.PI * 2 + rng.range(-0.3, 0.3);
      grow(cell, rng, 0, 0, ang, rng.range(30, 52), 1.5, 0.35, 0, 3,
        { flare: { w: 2.4, d: 5 }, wiggle: 0.38, step: 4.5, sides: (d, R) => R.int(1, 2), fork: 0.7, sideAngle: [0.6, 1.2] });
    }
    for (const br of cell.branches) g.ribbon(br.pts, br.hw, br.depth === 0 ? { skipC: { x: 0, y: 0 }, skipR: 6 } : null);
    cell.body = g.path(); cell.shade = g.shading(); cell.rad = Math.max(-g.x0, g.x1, -g.y0, g.y1) + 4;
    return cell;
  }

  /* ---------------- 室管膜細胞（局部座標，-y 指向腦室） ---------------- */
  function buildEpendymal(e, rng) {
    const cell = { cls: 'ependyma', x: e.x, y: e.y, rot: e.rot, phase: rng.range(0, 6.28), cilia: [] };
    const g = new Geom();
    const w = e.w || 15.5, h = 17;
    const poly = [];
    const N = 10;
    // 頂面微凸、側邊平直、基底圓角
    for (let i = 0; i <= N; i++) { const t = i / N; poly.push({ x: -w + 2 * w * t, y: -h - Math.sin(t * Math.PI) * 2.2 }); }
    for (let i = 1; i <= 4; i++) poly.push({ x: w + (i === 4 ? -0.6 : 0), y: -h + (2 * h * i) / 4 - (i === 4 ? 2 : 0) });
    for (let i = 0; i <= N; i++) { const t = i / N; poly.push({ x: w - 2 * w * t, y: h + Math.sin(t * Math.PI) * 1.5 }); }
    for (let i = 1; i < 4; i++) poly.push({ x: -w, y: h - (2 * h * i) / 4 });
    g.poly(poly);
    // 伸入腦實質的基底突起
    const nb = rng.int(1, 2);
    for (let k = 0; k < nb; k++) {
      const sx = rng.range(-w * 0.5, w * 0.5);
      const L = rng.range(40, 75);
      const ex = sx + rng.range(-14, 14);
      const pts = U.cubicPts({ x: sx, y: h - 4 }, { x: sx, y: h + L * 0.4 }, { x: ex, y: h + L * 0.7 }, { x: ex + rng.range(-5, 5), y: h + L }, 8);
      const hw = pts.map((p, i) => 3.2 * (1 - i / pts.length) + 0.6);
      g.ribbon(pts, hw);
    }
    const nc = 5;
    for (let i = 0; i < nc; i++) cell.cilia.push({ x: -w * 0.75 + (1.5 * w * i) / (nc - 1), len: rng.range(16, 26), ph: rng.range(0, 1.2) });
    cell.body = g.path(); cell.shade = g.shading(); cell.h = h; cell.w = w;
    return cell;
  }

  /* =========================================================================
   * 繪製
   * ========================================================================= */
  function drawSilhouette(ctx, body, fill, o, shadow) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (shadow) {
      ctx.shadowColor = 'rgba(70,40,10,0.32)';
      ctx.shadowBlur = shadow; ctx.shadowOffsetX = shadow * 0.35; ctx.shadowOffsetY = shadow * 0.55;
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 2 * o; ctx.stroke(body);
    if (shadow) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
    ctx.fillStyle = fill; ctx.fill(body);
  }

  function strokeShading(ctx, shade, pal, detail) {
    if (!shade || !detail) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = pal.shade;
    ctx.lineWidth = 1.9; ctx.stroke(shade.dt);
    ctx.lineWidth = 0.7; ctx.stroke(shade.dn);
    ctx.strokeStyle = pal.light;
    ctx.lineWidth = 1.6; ctx.stroke(shade.lt);
    ctx.lineWidth = 0.55; ctx.stroke(shade.ln);
  }

  function somaGlow(ctx, x, y, r, pal, k) {
    const gx = x + LX * r * 0.35, gy = y + LY * r * 0.35;
    const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * (k || 1.7));
    gr.addColorStop(0, `rgba(${pal.hi},0.95)`);
    gr.addColorStop(0.45, `rgba(${pal.hi},0.4)`);
    gr.addColorStop(1, `rgba(${pal.hi},0)`);
    ctx.fillStyle = gr;
    const R = r * (k || 1.7);
    ctx.fillRect(gx - R, gy - R, R * 2, R * 2);
  }

  function drawNucleus(ctx, x, y, rx, ry, rot, cols, o, nucleolus) {
    const gr = ctx.createRadialGradient(x + LX * rx * 0.3, y + LY * ry * 0.3, 0, x, y, Math.max(rx, ry));
    gr.addColorStop(0, cols[0]); gr.addColorStop(0.6, cols[1]); gr.addColorStop(1, cols[2]);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = o * 1.1; ctx.stroke();
    if (nucleolus) {
      ctx.fillStyle = nucleolus;
      ctx.beginPath(); ctx.arc(x + rx * 0.15, y - ry * 0.1, Math.min(rx, ry) * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.arc(x + rx * 0.05, y - ry * 0.22, Math.min(rx, ry) * 0.1, 0, Math.PI * 2); ctx.fill();
    }
  }

  /** 神經元：剪影 + 體積光 + 明暗線 + 膜電位色調 + 細胞核 */
  function drawNeuron(ctx, n, v) {
    const pal = n.excit ? PAL.excit : PAL.inhib;
    const body = v.spines && n.bodySpiny ? n.bodySpiny : n.body;
    let fill = pal.base;
    if (n.atp < 15) fill = n.excit ? '#c9bc95' : '#b3a8bf';
    drawSilhouette(ctx, body, fill, v.o, v.shadow);
    ctx.save();
    ctx.clip(body);
    if (!n.virtual) somaGlow(ctx, n.x, n.y, n.r, pal);
    strokeShading(ctx, n.shade, pal, v.detail);
    // 膜電位色調：去極化 → 暖橘；過極化 → 冷藍；放電瞬間 → 亮白黃
    if (v.signals) {
      const flash = v.T - n.lastFire;
      let tint = null;
      if (flash >= 0 && flash < 0.35) tint = `rgba(255,236,120,${0.75 * (1 - flash / 0.35)})`;
      else if (n.V > 0.05) tint = `rgba(255,140,40,${Math.min(0.45, n.V * 0.38)})`;
      else if (n.V < -0.05) tint = `rgba(70,140,230,${Math.min(0.35, -n.V * 0.5)})`;
      if (tint) { ctx.fillStyle = tint; ctx.fillRect(n.bbox.x0, n.bbox.y0, n.bbox.x1 - n.bbox.x0, n.bbox.y1 - n.bbox.y0); }
    }
    ctx.restore();
    if (n.virtual) return;
    if (v.detail2 && n.nissl) {
      ctx.fillStyle = pal.nissl;
      for (const f of n.nissl) { ctx.beginPath(); ctx.ellipse(f.x, f.y, f.rx, f.ry, f.rot, 0, Math.PI * 2); ctx.fill(); }
    }
    drawNucleus(ctx, n.x, n.y, n.r * 0.42, n.r * 0.4, 0, pal.nucleus, v.o * 0.55, pal.nucleolus);
  }

  function drawGlia(ctx, cell, pal, v, opt) {
    const body = (opt && opt.body) || cell.body;
    const shade = (opt && opt.shade) || cell.shade;
    drawSilhouette(ctx, body, pal.base, v.o, v.shadow);
    ctx.save();
    ctx.clip(body);
    if (!opt || !opt.noSoma) somaGlow(ctx, cell.x || 0, cell.y || 0, cell.r || 7, pal, 2.0);
    strokeShading(ctx, shade, pal, v.detail);
    if (opt && opt.tint) { ctx.fillStyle = opt.tint; ctx.fill(body); }
    ctx.restore();
  }

  BS.cells = {
    INK, PAL, LX, LY, NEURON_KINDS, V_UNM, V_MYE,
    Geom, grow, buildNeuronMorph, buildAxon, pathToSoma, finalizeNeuron,
    buildAstrocyte, buildOligodendrocyte, buildOrphanSheaths, buildMicroglia, buildEpendymal,
    timeAtS, sAtTime, drawSilhouette, strokeShading, somaGlow, drawNucleus, drawNeuron, drawGlia
  };
})();
