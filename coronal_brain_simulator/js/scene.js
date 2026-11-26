/* =========================================================================
 * scene.js — 依冠狀切面區域產生對應的顯微組織插圖場景與神經網路接線
 * ========================================================================= */
(function () {
  'use strict';
  const U = BS.util, C = BS.cells;
  const W = 1700, H = 1120;
  const HW = W / 2, HH = H / 2;

  const SCENE_INFO = {
    cortex_superficial: { title: '皮質淺層微迴路（第 I–III 層）', sub: '密集水平星狀聯絡神經元與外錐體細胞交織的橫向聯合網路' },
    cortex_anterior: { title: '前額／運動皮質深層（第 IV–VI 層）', sub: '大型 Betz 樣厚簇錐體神經元為主，具長投射有髓鞘軸突束' },
    cortex_posterior: { title: '頂葉感覺聯合皮質（第 IV–VI 層）', sub: '中小型錐體細胞與高密度第 IV 層顆粒星狀神經元接收視丘感覺輸入' },
    hippocampus: { title: '海馬迴 CA 區錐體細胞層', sub: '錐體細胞整齊成帶排列，側枝（Schaffer 側枝樣）橫向連接相鄰頂樹突' },
    striatum: { title: '紋狀體（基底核）', sub: 'GABA 中型多棘神經元（抑制性為主）、膽鹼性中間神經元與穿越的鉛筆纖維束' },
    thalamus: { title: '視丘中繼核團', sub: '叢狀樹突視丘中繼神經元接收上行感覺傳入纖維，並受抑制性神經元調控' },
    whitematter: { title: '白質有髓鞘纖維束', sub: '平行排列的有髓鞘軸突、束間寡突膠質細胞與纖維型星形膠質細胞' },
    ventricle: { title: '側腦室壁與室管膜', sub: '室管膜細胞以纖毛推動腦脊髓液循環，下方為室管膜下神經組織' }
  };

  function typeForRegion(reg, x, y, plane) {
    switch (reg) {
      case 1: return { type: 'cortex_superficial', regionName: '大腦皮質淺層（第 I–III 層）' };
      case 2: return plane === 'hippocampus'
        ? { type: 'cortex_posterior', regionName: '頂葉聯合皮質深層（第 IV–VI 層）' }
        : { type: 'cortex_anterior', regionName: '前額／運動皮質深層（第 IV–VI 層）' };
      case 3: {
        let a = Math.atan2(y, x);
        if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
        a = U.clamp(a, -0.75, 0.75);
        return { type: 'whitematter', regionName: '中央白質（輻射冠）', fiberAngle: a, laneGap: 48 };
      }
      case 4: {
        const isAC = Math.abs(y - 26) < 14;
        return { type: 'whitematter', regionName: isAC ? '前連合橫向纖維束' : '胼胝體連合纖維束', fiberAngle: 0, laneGap: isAC ? 44 : 36 };
      }
      case 5: return { type: 'ventricle', regionName: '側腦室壁（室管膜）' };
      case 6: return plane === 'hippocampus' && Math.abs(x) < 64 && y > -10
        ? { type: 'thalamus', regionName: '視丘核團' } : { type: 'striatum', regionName: '基底核（紋狀體）' };
      case 7: return { type: 'whitematter', regionName: '內囊垂直投射束', fiberAngle: Math.PI / 2, laneGap: 38 };
      case 8: return { type: 'hippocampus', regionName: '海馬迴結構' };
      default: return null;
    }
  }

  /* ---------------- 組織塊外框（撕裂邊緣） ---------------- */
  function makeFrame(rng) {
    const pts = [];
    const rc = 60, step = 26;
    const ph1 = rng.range(0, 6), ph2 = rng.range(0, 6);
    const sides = [
      { x0: -HW + rc, y0: -HH, x1: HW - rc, y1: -HH, nx: 0, ny: -1 },
      { x0: HW, y0: -HH + rc, x1: HW, y1: HH - rc, nx: 1, ny: 0 },
      { x0: HW - rc, y0: HH, x1: -HW + rc, y1: HH, nx: 0, ny: 1 },
      { x0: -HW, y0: HH - rc, x1: -HW, y1: -HH + rc, nx: -1, ny: 0 }
    ];
    const corners = [{ cx: HW - rc, cy: -HH + rc, a0: -Math.PI / 2 }, { cx: HW - rc, cy: HH - rc, a0: 0 },
      { cx: -HW + rc, cy: HH - rc, a0: Math.PI / 2 }, { cx: -HW + rc, cy: -HH + rc, a0: Math.PI }];
    let t = 0;
    const jit = () => { t += 1; return 5 * Math.sin(t * 0.21 + ph1) + 3 * Math.sin(t * 0.57 + ph2) + rng.range(-1.6, 1.6); };
    for (let k = 0; k < 4; k++) {
      const s = sides[k];
      const L = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
      const n = Math.round(L / step);
      for (let i = 0; i < n; i++) {
        const f = i / n, j = jit();
        pts.push({ x: s.x0 + (s.x1 - s.x0) * f + s.nx * j, y: s.y0 + (s.y1 - s.y0) * f + s.ny * j });
      }
      const c = corners[k];
      for (let i = 0; i < 4; i++) {
        const a = c.a0 + (i / 4) * (Math.PI / 2), j = jit();
        pts.push({ x: c.cx + Math.cos(a) * (rc + j), y: c.cy + Math.sin(a) * (rc + j) });
      }
    }
    const path = new Path2D();
    U.addPoly(path, pts, true);
    return { pts, path };
  }

  function makeVessel(rng, p0, p1, p2, p3, R) {
    const L0 = U.dist(p0.x, p0.y, p3.x, p3.y);
    const pts = U.cubicPts(p0, p1, p2, p3, Math.max(12, Math.round(L0 / 8)));
    const cum = U.cumLengths(pts);
    const len = cum[cum.length - 1];
    const v = { cls: 'capillary', pts, cum, len, R, rbcs: [], nuclei: [], clot: null, hem: null, path: U.polylinePath(pts) };
    for (let s = rng.range(5, 30); s < len; s += rng.range(26, 44)) v.rbcs.push({ s, tilt: rng.range(-0.6, 0.6), off: rng.range(-0.2, 0.2) });
    let side = 1;
    for (let s = rng.range(30, 60); s < len - 20; s += rng.range(70, 110)) { v.nuclei.push({ s, side }); side = -side; }
    return v;
  }

  function nearVessel(sc, x, y, m) {
    for (const v of sc.vessels) if (U.nearestOnPolyline(v.pts, v.cum, x, y).d < v.R + m) return true;
    return false;
  }
  const inFrame = (x, y, m) => Math.abs(x) < HW - m && Math.abs(y) < HH - m;

  function place(rng, count, sampler, ok, minD, others, tries) {
    const out = [];
    let t = 0;
    while (out.length < count && t < (tries || 600)) {
      t++;
      const p = sampler();
      if (!ok(p)) continue;
      let good = true;
      for (const o of others.concat(out)) if (U.dist(p.x, p.y, o.x, o.y) < (o.minD || minD)) { good = false; break; }
      if (good) out.push(p);
    }
    return out;
  }

  /* ---------------- 突觸接點 ---------------- */
  function makeSynapse(sc, rng, pre, post, opt) {
    const from = pre.virtual ? (opt && opt.from) || { x: pre.x, y: pre.y } : { x: pre.x, y: pre.y };
    let contact, bouton, psPts, br = null, idx = 0;
    const somatic = !pre.excit || (opt && opt.somatic);
    if (somatic) {
      let ang = Math.atan2(from.y - post.y, from.x - post.x) + rng.range(-0.7, 0.7);
      // 避開已使用位置
      for (let k = 0; k < 6; k++) {
        const used = post.usedContacts.some((u) => Math.hypot(u.x - (post.x + Math.cos(ang) * post.r), u.y - (post.y + Math.sin(ang) * post.r)) < 8);
        if (!used) break;
        ang += 0.6;
      }
      contact = { x: post.x + Math.cos(ang) * post.r, y: post.y + Math.sin(ang) * post.r };
      bouton = { x: post.x + Math.cos(ang) * (post.r + 4.5), y: post.y + Math.sin(ang) * (post.r + 4.5) };
      psPts = [contact, { x: post.x, y: post.y }];
    } else {
      let best = null, bestScore = Infinity;
      for (const b of post.branches) {
        if (opt && opt.apicalOnly && !b.apical && !(b.parent && isApicalTree(b))) continue;
        for (let i = 2; i < b.pts.length - 1; i += 2) {
          if (b.depth === 0 && b.cum[i] < post.r + 22) continue;
          const p = b.pts[i];
          if (post.usedContacts.some((u) => Math.hypot(u.x - p.x, u.y - p.y) < 16)) continue;
          const sc0 = U.dist(p.x, p.y, from.x, from.y) * rng.range(0.75, 1.0) + (opt && opt.preferMid ? Math.abs(b.cum[i] - 120) * 0.3 : 0);
          if (sc0 < bestScore) { bestScore = sc0; best = { b, i }; }
        }
      }
      if (!best) return makeSynapse(sc, rng, pre, post, { somatic: true, from });
      br = best.b; idx = best.i;
      const p = br.pts[idx];
      const a = Math.atan2(br.pts[idx + 1].y - br.pts[idx - 1].y, br.pts[idx + 1].x - br.pts[idx - 1].x);
      const nx = -Math.sin(a), ny = Math.cos(a);
      const side = Math.sign((from.x - p.x) * nx + (from.y - p.y) * ny) || 1;
      const hw = br.hw[idx];
      contact = { x: p.x + nx * side * hw, y: p.y + ny * side * hw };
      bouton = { x: p.x + nx * side * (hw + 4.5), y: p.y + ny * side * (hw + 4.5) };
      psPts = C.pathToSoma(post, br, idx);
    }
    post.usedContacts.push(contact);
    const psCum = U.cumLengths(psPts);
    const syn = {
      id: sc.synapses.length, pre, post, excit: pre.excit, contact, bouton,
      geo: { bouton, contact }, branch: br, idx,
      psPts, psCum, psLen: psCum[psCum.length - 1],
      weight: pre.excit ? rng.range(0.95, 1.45) : rng.range(0.9, 1.2),
      baseWeight: 0, vesicles: [], nt: [], bound: 0, lastRelease: -10, path: null
    };
    syn.baseWeight = syn.weight;
    for (let k = 0; k < 8; k++) {
      const a = rng.range(0, Math.PI * 2), rr = Math.sqrt(rng.next()) * 2.1;
      syn.vesicles.push({ u: -0.7 + Math.cos(a) * rr * 0.9, w: Math.sin(a) * rr });
    }
    sc.synapses.push(syn);
    post.inputs.push(syn);
    pre.outputs.push(syn);
    return syn;
  }

  function isApicalTree(b) { while (b) { if (b.apical) return true; b = b.parent; } return false; }

  /* ---------------- 白質走道路徑 ---------------- */
  function laneRange(v, th, inset) {
    const c = Math.cos(th), s = Math.sin(th);
    // 點 = u*(c,s) + v*(-s,c)
    let u0 = -1e9, u1 = 1e9;
    const clip = (k, b, lim) => { // |k*u + b| <= lim
      if (Math.abs(k) < 1e-6) { if (Math.abs(b) > lim) { u0 = 1; u1 = 0; } return; }
      let a1 = (-lim - b) / k, a2 = (lim - b) / k;
      if (a1 > a2) { const t = a1; a1 = a2; a2 = t; }
      u0 = Math.max(u0, a1); u1 = Math.min(u1, a2);
    };
    clip(c, -s * v, HW - inset);
    clip(s, c * v, HH - inset);
    return u0 < u1 ? [u0, u1] : null;
  }
  function lanePt(u, v, th) { const c = Math.cos(th), s = Math.sin(th); return { x: u * c - v * s, y: u * s + v * c }; }

  /* =========================================================================
   * 場景產生主函式
   * ========================================================================= */
  function generate(info, seed) {
    const rng = new U.RNG(seed);
    const sc = {
      info: Object.assign({}, info, SCENE_INFO[info.type]), W, H, seed,
      neurons: [], synapses: [], astros: [], oligos: [], orphans: null, micro: [], epend: [], vessels: [],
      frame: makeFrame(rng), ventricle: null, archY: null, stipple: [], fibers: null
    };
    const T = info.type;
    const addNeuron = (spec) => {
      const n = C.buildNeuronMorph(rng, spec);
      n.id = sc.neurons.length; n.inputs = []; n.outputs = []; n.usedContacts = [];
      sc.neurons.push(n);
      return n;
    };

    /* ---- 1. 微血管 ---- */
    if (T === 'whitematter') {
      const th = info.fiberAngle || 0;
      const rgv = laneRange(0, th + 0.35, 70) || [-680, 680];
      const st = lanePt(rgv[0], 0, th + 0.35), en = lanePt(rgv[1] + 90, 0, th + 0.35);
      sc.vessels.push(makeVessel(rng, st, lanePt(-260, rng.range(-130, 130), th + 0.35), lanePt(260, rng.range(-130, 130), th + 0.35), en, 11));
    } else if (T === 'ventricle') {
      sc.vessels.push(makeVessel(rng, { x: -HW + 80, y: 120 }, { x: -300, y: rng.range(0, 250) }, { x: 300, y: rng.range(150, 400) }, { x: HW + 120, y: rng.range(200, 380) }, 11));
    } else {
      const x0 = rng.range(-350, 350);
      sc.vessels.push(makeVessel(rng, { x: x0, y: -HH + 80 }, { x: x0 + rng.range(-200, 200), y: -150 }, { x: x0 + rng.range(-250, 250), y: 200 }, { x: x0 + rng.range(-300, 300), y: HH + 120 }, 11));
      const yv = T === 'hippocampus' ? -250 : rng.range(220, 380);
      sc.vessels.push(makeVessel(rng, { x: -HW + 75, y: yv }, { x: -400, y: yv + rng.range(-120, 120) }, { x: 300, y: yv + rng.range(-120, 120) }, { x: HW + 120, y: yv + rng.range(-150, 150) }, 10));
    }
    sc.vessels.forEach((v, i) => { v.id = i; });

    /* ---- 2. 神經元配置 ---- */
    const okSoma = (m) => (p) => inFrame(p.x, p.y, m) && !nearVessel(sc, p.x, p.y, 34);
    let exitFor = null;     // n => {exit, exitAngle}
    let targetFor = null;   // n => [{post, opt}]
    let myelinCollaterals = false;

    if (T === 'cortex_superficial') {
      const pyr = place(rng, 4, () => ({ x: rng.range(-700, 700), y: rng.range(10, 360) }), okSoma(90), 180, []);
      pyr.forEach((p) => addNeuron({ kind: 'pyramidal', x: p.x, y: p.y, r: rng.range(12.5, 14.5), orient: -Math.PI / 2 + rng.range(-0.1, 0.1),
        apicalLen: U.clamp((p.y + HH - 70) * rng.range(0.65, 0.85), 180, 380) }));
      const st = place(rng, 6, () => ({ x: rng.range(-720, 720), y: rng.range(-360, 260) }), okSoma(100), 140, pyr);
      st.forEach((p) => addNeuron({ kind: 'stellate', x: p.x, y: p.y, r: rng.range(12, 14.5) }));
      const bk = place(rng, 3, () => ({ x: rng.range(-700, 700), y: rng.range(-280, 320) }), okSoma(110), 140, pyr.concat(st));
      bk.forEach((p) => addNeuron({ kind: 'basket', x: p.x, y: p.y, r: rng.range(11.5, 13) }));
      exitFor = (n) => n.kind === 'pyramidal' ? { exit: { x: n.x + rng.range(-100, 100), y: HH + 120 }, exitAngle: Math.PI / 2 } : null;
    } else if (T === 'cortex_anterior') {
      const pyr = place(rng, 9, () => ({ x: rng.range(-720, 720), y: rng.range(-120, 380) }), okSoma(90), 145, []);
      pyr.forEach((p) => addNeuron({ kind: 'pyramidal', x: p.x, y: p.y, r: rng.range(17.5, 21), orient: -Math.PI / 2 + rng.range(-0.1, 0.1),
        apicalLen: U.clamp((p.y + HH - 60) * rng.range(0.82, 0.95), 240, 580) }));
      const st = place(rng, 2, () => ({ x: rng.range(-680, 680), y: rng.range(-330, 120) }), okSoma(110), 160, pyr);
      st.forEach((p) => addNeuron({ kind: 'stellate', x: p.x, y: p.y, r: rng.range(13, 14.5) }));
      const bk = place(rng, 3, () => ({ x: rng.range(-700, 700), y: rng.range(-200, 360) }), okSoma(110), 130, pyr.concat(st));
      bk.forEach((p) => addNeuron({ kind: 'basket', x: p.x, y: p.y, r: rng.range(12, 13.5) }));
      exitFor = (n) => n.kind === 'pyramidal' ? { exit: { x: n.x + rng.range(-120, 120), y: HH + 120 }, exitAngle: Math.PI / 2 } : null;
    } else if (T === 'cortex_posterior') {
      const pyr = place(rng, 6, () => ({ x: rng.range(-720, 720), y: rng.range(-60, 380) }), okSoma(90), 165, []);
      pyr.forEach((p) => addNeuron({ kind: 'pyramidal', x: p.x, y: p.y, r: rng.range(15, 17.5), orient: -Math.PI / 2 + rng.range(-0.14, 0.14),
        apicalLen: U.clamp((p.y + HH - 70) * rng.range(0.75, 0.9), 200, 500) }));
      const st = place(rng, 5, () => ({ x: rng.range(-720, 720), y: rng.range(-340, 180) }), okSoma(105), 140, pyr);
      st.forEach((p) => addNeuron({ kind: 'stellate', x: p.x, y: p.y, r: rng.range(12.5, 14.5) }));
      const bk = place(rng, 3, () => ({ x: rng.range(-700, 700), y: rng.range(-220, 360) }), okSoma(110), 130, pyr.concat(st));
      bk.forEach((p) => addNeuron({ kind: 'basket', x: p.x, y: p.y, r: rng.range(12, 13.5) }));
      exitFor = (n) => n.kind === 'pyramidal' ? { exit: { x: n.x + rng.range(-120, 120), y: HH + 120 }, exitAngle: Math.PI / 2 } : null;
    } else if (T === 'hippocampus') {
      const y0 = 90;
      for (let i = 0; i < 9; i++) {
        const x = -680 + i * 170 + rng.range(-18, 18), y = y0 + rng.range(-22, 22);
        addNeuron({ kind: 'pyramidal', x, y, r: rng.range(15.5, 18), orient: -Math.PI / 2 + rng.range(-0.08, 0.08),
          apicalLen: U.clamp((y + HH - 60) * rng.range(0.82, 0.94), 300, 560), basalLen: 130 });
      }
      [-425, 425].forEach((x) => addNeuron({ kind: 'basket', x: x + rng.range(-20, 20), y: y0 + rng.range(55, 85), r: 12.5 }));
      exitFor = (n) => n.kind === 'pyramidal' ? { exit: { x: n.x + rng.range(-260, 260), y: HH + 120 }, exitAngle: Math.PI / 2 } : null;
      targetFor = (n) => {
        if (n.kind !== 'pyramidal') return null;
        const pyr = sc.neurons.filter((m) => m.kind === 'pyramidal' && m !== n).sort((a, b) => Math.abs(a.x - n.x) - Math.abs(b.x - n.x));
        const dir = n.id % 2 === 0 ? 1 : -1;
        const ahead = pyr.filter((m) => (m.x - n.x) * dir > 0).slice(0, 2);
        const list = ahead.length ? ahead : pyr.slice(0, 2);
        const out = list.map((m) => ({ post: m, opt: { apicalOnly: true } }));
        const bk = sc.neurons.filter((m) => m.kind === 'basket').sort((a, b) => Math.abs(a.x - n.x) - Math.abs(b.x - n.x))[0];
        if (bk && Math.abs(bk.x - n.x) < 300) out.push({ post: bk });
        return out;
      };
    } else if (T === 'striatum' || T === 'thalamus') {
      const isTh = T === 'thalamus';
      const main = place(rng, isTh ? 8 : 7, () => ({ x: rng.range(-700, 700), y: rng.range(-420, 420) }), okSoma(110), 165, []);
      main.forEach((p) => addNeuron({ kind: isTh ? 'relay' : 'msn', x: p.x, y: p.y, r: isTh ? rng.range(15, 17) : rng.range(13, 15) }));
      const ex = place(rng, isTh ? 3 : 2, () => ({ x: rng.range(-650, 650), y: rng.range(-380, 380) }), okSoma(130), 170, main);
      ex.forEach((p) => addNeuron({ kind: isTh ? 'basket' : 'cholinergic', x: p.x, y: p.y, r: isTh ? 12.5 : rng.range(18, 20) }));
      // 上行／皮質傳入纖維（遠端投射軸突，會自發放電驅動網路）
      const realList = sc.neurons.slice();
      const nAff = isTh ? 4 : 4;
      for (let i = 0; i < nAff; i++) {
        const fromTop = !isTh;
        const x = rng.range(-650, 650);
        const v = addNeuron({ kind: 'virtual', x, y: fromTop ? -HH - 60 : HH + 60 });
        v.axonAngle = fromTop ? Math.PI / 2 : -Math.PI / 2;
        v.afferent = true;
        const tgt = realList.filter((m) => m.excit || !isTh).sort((a, b) => Math.abs(a.x - x) + Math.abs(a.y - v.y) * 0.3 - (Math.abs(b.x - x) + Math.abs(b.y - v.y) * 0.3)).slice(0, 2);
        v.fixedTargets = tgt;
      }
      // 穿越的有髓鞘纖維束（鉛筆纖維）
      const bx = rng.sign() * rng.range(150, 450);
      for (let i = 0; i < 4; i++) {
        const v = addNeuron({ kind: 'virtual', x: bx + i * 15 - 22, y: -HH - 60 });
        v.axonAngle = Math.PI / 2; v.passThrough = true;
        v.route = [];
        for (let y = -HH - 50; y <= HH + 80; y += 20) v.route.push({ x: bx + i * 15 - 22 + Math.sin(y * 0.004 + i) * 30, y });
      }
      exitFor = (n) => n.passThrough ? { exit: n.route[n.route.length - 1], exitAngle: Math.PI / 2 } : null;
      myelinCollaterals = false;
    } else if (T === 'whitematter') {
      const th = info.fiberAngle || 0;
      const gap = info.laneGap || 44;
      const lanes = [];
      for (let v = -330; v <= 330; v += gap + rng.range(-5, 5)) lanes.push(v);
      // 兩端真實神經元
      const ends = [];
      const pickLanes = [lanes[1], lanes[Math.floor(lanes.length / 2)], lanes[lanes.length - 2]];
      pickLanes.forEach((v, i) => {
        const rg = laneRange(v, th, 95);
        if (!rg) return;
        const L = lanePt(rg[0], v, th), R = lanePt(rg[1], v, th);
        const a = addNeuron({ kind: 'stellate', x: L.x, y: L.y, r: 14, axonAngle: th });
        const b = addNeuron({ kind: 'stellate', x: R.x, y: R.y, r: 14, axonAngle: th + Math.PI });
        a.lane = v; b.lane = v; a.side = -1; b.side = 1;
        ends.push(a, b);
        void i;
      });
      // 穿越軸突
      lanes.forEach((v) => {
        if (pickLanes.includes(v)) return;
        const rg = laneRange(v, th, -120);
        if (!rg) return;
        const forward = rng.chance(0.5);
        const s = lanePt(forward ? rg[0] : rg[1], v, th);
        const vn = addNeuron({ kind: 'virtual', x: s.x, y: s.y });
        vn.axonAngle = forward ? th : th + Math.PI;
        vn.passThrough = true; vn.lane = v;
        vn.route = [];
        const steps = 50, ph = rng.range(0, 6), amp = rng.range(4, 10);
        for (let k = 0; k <= steps; k++) {
          const u = forward ? U.lerp(rg[0], rg[1], k / steps) : U.lerp(rg[1], rg[0], k / steps);
          vn.route.push(lanePt(u, v + Math.sin(u * 0.006 + ph) * amp, th));
        }
      });
      sc.wmEnds = ends;
      sc.wmAngle = th;
      exitFor = (n) => n.passThrough ? { exit: n.route[n.route.length - 1], exitAngle: n.axonAngle } : null;
      targetFor = (n) => {
        if (n.virtual) return null;
        const opp = ends.filter((m) => m.side !== n.side).sort((a, b) => Math.abs(a.lane - n.lane) - Math.abs(b.lane - n.lane));
        return opp.slice(0, 2).map((m) => ({ post: m }));
      };
      myelinCollaterals = true;
    } else if (T === 'ventricle') {
      sc.archY = (x) => -HH + 150 + (x * x) / 5200;
      const pos = place(rng, 8, () => ({ x: rng.range(-720, 720), y: rng.range(-120, 440) }), (p) => okSoma(100)(p) && p.y > sc.archY(p.x) + 200, 160, []);
      pos.forEach((p, i) => addNeuron({ kind: i < 6 ? 'stellate' : 'basket', x: p.x, y: p.y, r: i < 6 ? rng.range(14, 17) : 12.5 }));
    }

    /* ---- 3. 接線：決定每個神經元的突觸後目標 ---- */
    const real = sc.neurons.filter((n) => !n.virtual);
    const plan = new Map();
    const pairs = new Set();
    for (const n of sc.neurons) {
      let list = targetFor ? targetFor(n) : null;
      if (n.fixedTargets) list = n.fixedTargets.map((m) => ({ post: m }));
      if (!list && !n.virtual) {
        const k = n.excit ? (n.kind === 'pyramidal' ? 3 : rng.int(2, 3)) : 3;
        const maxD = n.excit ? 760 : 520;
        list = real.filter((m) => m !== n).map((m) => ({ m, d: U.dist(n.x, n.y, m.x, m.y) }))
          .filter((o) => o.d > 60 && o.d < maxD).sort((a, b) => a.d - b.d).slice(0, k).map((o) => ({ post: o.m }));
      }
      list = (list || []).filter((t) => { const key = n.id + '>' + t.post.id; if (pairs.has(key)) return false; pairs.add(key); return true; });
      plan.set(n, list);
    }
    // 確保每個真實神經元至少有一個興奮性輸入
    for (const m of real) {
      const hasIn = [...plan.entries()].some(([pre, l]) => pre.excit && l.some((t) => t.post === m));
      if (!hasIn) {
        const src = real.filter((p) => p !== m && p.excit).sort((a, b) => U.dist(a.x, a.y, m.x, m.y) - U.dist(b.x, b.y, m.x, m.y))[0];
        if (src) plan.get(src).push({ post: m });
      }
    }

    /* ---- 4. 建立突觸與軸突樹 ---- */
    for (const n of sc.neurons) {
      const list = plan.get(n);
      const ex = exitFor ? exitFor(n) : null;
      if (!list.length && !ex) {
        // 沒有目標：讓軸突離開視野
        const a = n.axonAngle;
        list.length = 0;
        const e = { x: n.x + Math.cos(a) * 900, y: n.y + Math.sin(a) * 900 };
        n._exit = { exit: e, exitAngle: a };
      }
      const syns = list.map((t) => makeSynapse(sc, rng, n, t.post, Object.assign({ from: n.virtual ? { x: n.x + Math.cos(n.axonAngle) * 400, y: n.y + Math.sin(n.axonAngle) * 400 } : null }, t.opt || {})));
      const exit = ex || n._exit || null;
      const myelin = n.excit && (T !== 'ventricle' || true);
      const opt = { myelin: n.kind !== 'basket' && n.kind !== 'msn' && myelin, myelinCollaterals, exit: exit ? exit.exit : null, exitAngle: exit ? exit.exitAngle : 0 };
      if (n.route) opt.route = n.route;
      if (n.lane != null && !n.virtual && syns.length) {
        // 白質：主軸突沿走道平行前進
        const th = sc.wmAngle;
        const post = syns[0].post;
        const rgA = laneRange(n.lane, th, 95);
        const route = [];
        const u0 = n.side < 0 ? rgA[0] + 50 : rgA[1] - 50;
        const u1 = n.side < 0 ? rgA[1] - 120 : rgA[0] + 120;
        const vv = n.lane + 16;
        for (let k = 0; k <= 40; k++) route.push(lanePt(U.lerp(u0, u1, k / 40), vv + Math.sin(k * 0.3) * 3, th));
        route.push({ x: (route[route.length - 1].x + syns[0].bouton.x) / 2, y: (route[route.length - 1].y + syns[0].bouton.y) / 2 });
        route.push(syns[0].bouton);
        opt.route = route;
        void post;
      }
      C.buildAxon(n, rng, syns.map((s) => s.geo), opt);
      for (const p of n.axon.paths) if (p.synapse) { const syn = syns.find((s) => s.geo === p.synapse); if (syn) syn.path = p; }
    }
    for (const n of sc.neurons) C.finalizeNeuron(n, rng);

    /* ---- 5. 寡突膠質細胞 ---- */
    const internodes = [];
    for (const n of sc.neurons) for (const p of n.axon.paths) for (const it of p.internodes) internodes.push({ path: p, internode: it, n });
    const nOli = T === 'whitematter' ? 11 : T === 'striatum' || T === 'thalamus' ? 6 : 5;
    const somata = real.map((n) => ({ x: n.x, y: n.y, minD: 60 }));
    const oliPos = place(rng, nOli, () => {
      if (internodes.length && rng.chance(0.85)) {
        const it = rng.pick(internodes);
        const p = U.pointAtS(it.path.pts, it.path.cum, (it.internode.s0 + it.internode.s1) / 2);
        const o = rng.sign() * rng.range(22, 60);
        return { x: p.x - Math.sin(p.a) * o, y: p.y + Math.cos(p.a) * o };
      }
      return { x: rng.range(-750, 750), y: rng.range(-480, 480) };
    }, (p) => inFrame(p.x, p.y, 60) && !nearVessel(sc, p.x, p.y, 25) && (!sc.archY || p.y > sc.archY(p.x) + 80), 120, somata);
    const oliList = oliPos.map((p) => ({ x: p.x, y: p.y, sheaths: [] }));
    const maxPer = T === 'whitematter' ? 5 : 4;
    const lim = T === 'whitematter' ? 190 : 220;
    const sorted = internodes.map((it) => {
      const p = U.pointAtS(it.path.pts, it.path.cum, (it.internode.s0 + it.internode.s1) / 2);
      let best = null, bd = Infinity;
      for (const o of oliList) { const d = U.dist(o.x, o.y, p.x, p.y); if (d < bd) { bd = d; best = o; } }
      return { it, best, bd, p };
    }).sort((a, b) => a.bd - b.bd);
    const orphans = [];
    for (const e of sorted) {
      if (!inFrame(e.p.x, e.p.y, 20)) { orphans.push(e.it); continue; }
      const cands = oliList.map((o) => ({ o, d: U.dist(o.x, o.y, e.p.x, e.p.y) })).filter((c) => c.d < lim && c.o.sheaths.length < maxPer).sort((a, b) => a.d - b.d);
      if (cands.length) cands[0].o.sheaths.push(e.it); else orphans.push(e.it);
    }
    sc.oligos = oliList.filter((o) => o.sheaths.length > 0).map((o) => C.buildOligodendrocyte(o, rng));
    sc.oligos.forEach((o, i) => { o.id = i; });
    sc.orphans = C.buildOrphanSheaths(orphans);

    /* ---- 6. 星形膠質細胞 ---- */
    const nAst = T === 'whitematter' ? 5 : 6;
    const astPos = place(rng, nAst, () => {
      if (sc.vessels.length && rng.chance(0.7)) {
        const v = rng.pick(sc.vessels);
        const p = U.pointAtS(v.pts, v.cum, rng.range(60, v.len - 60));
        const o = rng.sign() * rng.range(65, 170);
        return { x: p.x - Math.sin(p.a) * o, y: p.y + Math.cos(p.a) * o };
      }
      return { x: rng.range(-720, 720), y: rng.range(-460, 460) };
    }, (p) => inFrame(p.x, p.y, 70) && !nearVessel(sc, p.x, p.y, 40) && (!sc.archY || p.y > sc.archY(p.x) + 90), 150,
    real.map((n) => ({ x: n.x, y: n.y, minD: 75 })).concat(oliPos.map((o) => ({ x: o.x, y: o.y, minD: 45 }))));
    sc.astros = astPos.map((p) => C.buildAstrocyte({ x: p.x, y: p.y, r: rng.range(9.5, 11.5) }, rng, sc.vessels, T === 'whitematter'));
    sc.astros.forEach((a, i) => { a.id = i; });

    /* ---- 7. 微膠細胞 ---- */
    const micPos = place(rng, 4, () => ({ x: rng.range(-700, 700), y: rng.range(-440, 440) }),
      (p) => inFrame(p.x, p.y, 80) && !nearVessel(sc, p.x, p.y, 30) && (!sc.archY || p.y > sc.archY(p.x) + 80), 220,
      real.map((n) => ({ x: n.x, y: n.y, minD: 70 })));
    sc.micro = micPos.map((p) => C.buildMicroglia(p, rng));
    sc.micro.forEach((m, i) => { m.id = i; });

    /* ---- 8. 室管膜與腦室 ---- */
    if (sc.archY) {
      const pts = [];
      let x = -HW - 20;
      while (x < HW + 20) {
        const y = sc.archY(x);
        const slope = (2 * x) / 5200;
        const rot = Math.atan(slope);
        const w = 15.5;
        sc.epend.push(C.buildEpendymal({ x: x - Math.sin(rot) * 17, y: y + Math.cos(rot) * 17, rot, w }, rng));
        x += (2 * w + 0.6) * Math.cos(rot);
      }
      sc.epend.forEach((e, i) => { e.id = i; });
      const vp = new Path2D();
      vp.moveTo(-HW - 50, -HH - 50);
      for (let xx = -HW - 50; xx <= HW + 50; xx += 20) pts.push({ x: xx, y: sc.archY(xx) });
      vp.lineTo(pts[0].x, pts[0].y);
      for (const p of pts) vp.lineTo(p.x, p.y);
      vp.lineTo(HW + 50, -HH - 50);
      vp.closePath();
      sc.ventricle = vp;
    }

    /* ---- 9. 神經氈點描與細纖維 ---- */
    for (let i = 0; i < 1700; i++) {
      const x = rng.range(-HW, HW), y = rng.range(-HH, HH);
      if (sc.archY && y < sc.archY(x)) continue;
      sc.stipple.push({ x, y, r: rng.range(0.6, 1.5) });
    }
    const fib = new Path2D();
    for (let i = 0; i < 140; i++) {
      let x = rng.range(-HW, HW), y = rng.range(-HH, HH), a = rng.range(0, 6.28);
      if (T === 'whitematter' && rng.chance(0.7)) a = sc.wmAngle + rng.range(-0.08, 0.08);
      if (sc.archY && y < sc.archY(x) + 30) continue;
      fib.moveTo(x, y);
      for (let k = 0; k < 12; k++) { a += rng.range(-0.25, 0.25); x += Math.cos(a) * 14; y += Math.sin(a) * 14; fib.lineTo(x, y); }
    }
    sc.fibers = fib;
    sc.real = real;
    return sc;
  }

  /** 規劃從 pre 既有軸突長出一條新側枝並於 post 樹突形成突觸 */
  function planSprout(sc, pre, post) {
    if (!pre || !post || !pre.axon || !pre.axon.paths.length || post.virtual) return null;
    const rng = new U.RNG(((sc.seed ^ (pre.id * 919) ^ (post.id * 1777) ^ sc.synapses.length) >>> 0) + 1);
    const main = pre.axon.paths[0];

    // 1. 尋找 post 樹突上尚未被佔用的理想接觸點
    let best = null, bestScore = Infinity;
    for (const b of post.branches) {
      for (let i = 2; i < b.pts.length - 1; i += 2) {
        if (b.depth === 0 && b.cum[i] < post.r + 22) continue;
        const p = b.pts[i];
        if (post.usedContacts.some((u) => Math.hypot(u.x - p.x, u.y - p.y) < 16)) continue;
        const d = U.dist(p.x, p.y, pre.x, pre.y);
        if (d < bestScore) { bestScore = d; best = { b, i }; }
      }
    }
    let contact, bouton, psPts, br = null, idx = 0;
    if (best) {
      br = best.b; idx = best.i;
      const p = br.pts[idx];
      const a = Math.atan2(br.pts[idx + 1].y - br.pts[idx - 1].y, br.pts[idx + 1].x - br.pts[idx - 1].x);
      const nx = -Math.sin(a), ny = Math.cos(a);
      const side = Math.sign((pre.x - p.x) * nx + (pre.y - p.y) * ny) || 1;
      const hw = br.hw[idx];
      contact = { x: p.x + nx * side * hw, y: p.y + ny * side * hw };
      bouton = { x: p.x + nx * side * (hw + 4.5), y: p.y + ny * side * (hw + 4.5) };
      psPts = C.pathToSoma(post, br, idx);
    } else {
      const ang = Math.atan2(pre.y - post.y, pre.x - post.x) + rng.range(-0.5, 0.5);
      contact = { x: post.x + Math.cos(ang) * post.r, y: post.y + Math.sin(ang) * post.r };
      bouton = { x: post.x + Math.cos(ang) * (post.r + 4.5), y: post.y + Math.sin(ang) * (post.r + 4.5) };
      psPts = [contact, { x: post.x, y: post.y }];
    }

    // 2. 在 pre 主軸突上找最適合萌芽的蘭氏結或中段起點
    let bestS = main.len * 0.5, bestD = Infinity;
    const sMin = pre.virtual ? 40 : pre.r + 36;
    const sMax = Math.max(sMin + 1, main.len - 36);
    for (let k = 0; k <= 20; k++) {
      const s = sMin + ((sMax - sMin) * k) / 20;
      const p = U.pointAtS(main.pts, main.cum, s);
      const d = U.dist(p.x, p.y, bouton.x, bouton.y);
      if (d < bestD) { bestD = d; bestS = s; }
    }
    if (main.nodes.length) {
      let nb = main.nodes[0];
      for (const nd of main.nodes) if (Math.abs(nd - bestS) < Math.abs(nb - bestS)) nb = nd;
      if (Math.abs(nb - bestS) < 90) bestS = nb;
    }

    const B = U.pointAtS(main.pts, main.cum, bestS);
    const toT = Math.atan2(bouton.y - B.y, bouton.x - B.x);
    let da = toT - B.a;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    const startA = B.a + U.clamp(da, -1.0, 1.0);
    const D = U.dist(B.x, B.y, bouton.x, bouton.y);
    const ap = { x: bouton.x - contact.x, y: bouton.y - contact.y };
    const apl = Math.hypot(ap.x, ap.y) || 1;
    const p1 = { x: B.x + Math.cos(startA) * Math.min(75, D * 0.38), y: B.y + Math.sin(startA) * Math.min(75, D * 0.38) };
    const p2 = { x: bouton.x + (ap.x / apl) * Math.min(70, D * 0.35), y: bouton.y + (ap.y / apl) * Math.min(70, D * 0.35) };
    const pts = U.cubicPts({ x: B.x, y: B.y }, p1, p2, bouton, Math.max(8, Math.round(D / 8)));
    const cum = U.cumLengths(pts);
    const psCum = U.cumLengths(psPts);
    return {
      parentIdx: 0, fromS: bestS, pts, cum, len: cum[cum.length - 1],
      contact, bouton, br, idx, psPts, psCum, psLen: psCum[psCum.length - 1]
    };
  }

  /** 將完成生長的芽生側枝正式併入軸突剪影與突觸網路 */
  function commitSproutSynapse(sc, pre, post, spec, T) {
    const rng = new U.RNG(((sc.seed ^ sc.synapses.length * 7919) >>> 0) + 1);
    post.usedContacts.push(spec.contact);
    const syn = {
      id: sc.synapses.length, pre, post, excit: pre.excit,
      contact: spec.contact, bouton: spec.bouton,
      geo: { bouton: spec.bouton, contact: spec.contact },
      branch: spec.br, idx: spec.idx,
      psPts: spec.psPts, psCum: spec.psCum, psLen: spec.psLen,
      weight: pre.excit ? 1.28 : 1.05,
      baseWeight: pre.excit ? 1.28 : 1.05,
      vesicles: [], nt: [], bound: 0, lastRelease: -10, path: null,
      isNew: true, bornAt: T || 0
    };
    for (let k = 0; k < 8; k++) {
      const a = rng.range(0, Math.PI * 2), rr = Math.sqrt(rng.next()) * 2.1;
      syn.vesicles.push({ u: -0.7 + Math.cos(a) * rr * 0.9, w: Math.sin(a) * rr });
    }
    const path = C.attachCollateralPath(pre, spec.parentIdx, spec.fromS, spec.pts, syn.geo, false);
    syn.path = path;
    sc.synapses.push(syn);
    post.inputs.push(syn);
    pre.outputs.push(syn);
    C.finalizeNeuron(pre, rng);
    return syn;
  }

  BS.scene = { typeForRegion, generate, planSprout, commitSproutSynapse, SCENE_INFO, W, H };
})();
