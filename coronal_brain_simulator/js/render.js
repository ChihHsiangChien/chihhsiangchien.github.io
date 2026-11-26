/* =========================================================================
 * render.js — 高效能顯微組織解剖插圖渲染器
 *
 * 架構：雙層靜態離屏快取（全圖版 PlateCache + 高倍率視口動態重烘 HiResCache）
 *       + 視錐剔除 (Frustum Culling) + RBC/Microglia Sprite 預烘 + 標籤排版快取
 *       100% 保留手繪墨線、連續剪影、體積光影與嚴格前後圖層順序 (Z-order)。
 * ========================================================================= */
(function () {
  'use strict';
  const U = BS.util, C = BS.cells;
  const INK = C.INK;

  function typeAlpha(highlights, key) {
    if (!highlights) return 1;
    if (highlights.size === 0) return 0;
    if (highlights.size >= 6) return 1;
    return highlights.has(key) ? 1 : 0.12;
  }

  function layerAlpha(highlights, key, hasFocus) {
    const base = typeAlpha(highlights, key);
    if (!hasFocus || base === 0) return base;
    return Math.min(base, 0.14);
  }

  function bboxIntersects(bb, rect) {
    if (!bb || !rect) return true;
    return !(bb.x1 < rect.x0 || bb.x0 > rect.x1 || bb.y1 < rect.y0 || bb.y0 > rect.y1);
  }

  function getVesselBBox(v) {
    if (v._bbox) return v._bbox;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of v.pts) {
      if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y;
      if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y;
    }
    const pad = v.R + 100;
    v._bbox = { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
    return v._bbox;
  }

  function getStipplePath(sc) {
    if (sc._stipplePath) return sc._stipplePath;
    const p = new Path2D();
    for (const st of sc.stipple) {
      p.moveTo(st.x + st.r, st.y);
      p.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    }
    sc._stipplePath = p;
    return p;
  }

  /* ---------------- 預烘雙凹紅血球 Sprite ---------------- */
  let rbcSprite = null;
  function getRbcSprite() {
    if (rbcSprite) return rbcSprite;
    const c = document.createElement('canvas');
    c.width = 40;
    c.height = 28;
    const g = c.getContext('2d');
    g.save();
    g.translate(20, 14);
    g.scale(2, 2);

    const grad = g.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 7.2);
    grad.addColorStop(0, '#ff8a80');
    grad.addColorStop(0.55, '#e53935');
    grad.addColorStop(1, '#8e1515');
    g.fillStyle = grad;
    g.strokeStyle = INK;
    g.lineWidth = 0.72;
    g.beginPath();
    g.ellipse(0, 0, 6.4, 4.2, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    g.fillStyle = 'rgba(92, 10, 10, 0.58)';
    g.beginPath();
    g.ellipse(0, 0, 2.7, 1.5, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    rbcSprite = c;
    return rbcSprite;
  }

  /* ---------------- 3D 微血管靜態層與動態層拆分 ---------------- */
  function drawOneVesselStatic(ctx, v, vOpt, cullRect, withHalo) {
    if (!v || (cullRect && !bboxIntersects(getVesselBBox(v), cullRect))) return;
    const R = v.R;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (withHalo) {
      ctx.strokeStyle = 'rgba(255, 160, 0, 0.42)';
      ctx.lineWidth = (R + 6.5) * 2;
      ctx.stroke(v.path);
    }

    // 外墨線邊框
    ctx.strokeStyle = INK;
    ctx.lineWidth = (R + 2.4) * 2;
    ctx.stroke(v.path);

    // 內皮外層暗紅管壁
    ctx.strokeStyle = '#a92c27';
    ctx.lineWidth = (R + 0.8) * 2;
    ctx.stroke(v.path);

    // 血管壁立體反光帶
    ctx.strokeStyle = '#de5b4b';
    ctx.lineWidth = R * 1.45;
    ctx.stroke(v.path);

    // 血管內腔暗紅血液底色
    ctx.strokeStyle = '#5e1110';
    ctx.lineWidth = (R - 2.4) * 2;
    ctx.stroke(v.path);

    // 血管壁扁平內皮細胞核
    for (const en of v.nuclei) {
      const P = U.pointAtS(v.pts, v.cum, en.s);
      if (cullRect && (P.x < cullRect.x0 - 20 || P.x > cullRect.x1 + 20 || P.y < cullRect.y0 - 20 || P.y > cullRect.y1 + 20)) continue;
      const nx = -Math.sin(P.a), ny = Math.cos(P.a);
      const ex = P.x + nx * en.side * (R - 0.8);
      const ey = P.y + ny * en.side * (R - 0.8);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(P.a);
      ctx.fillStyle = '#f8bbd0';
      ctx.strokeStyle = INK;
      ctx.lineWidth = vOpt.o * 0.55;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.2, 1.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 起始端立體橫切開口剖面
    const P0 = U.pointAtS(v.pts, v.cum, 4);
    ctx.save();
    ctx.translate(P0.x, P0.y);
    ctx.rotate(P0.a);
    ctx.fillStyle = '#d84b42';
    ctx.strokeStyle = INK;
    ctx.lineWidth = vOpt.o * 0.85;
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.42, R + 0.8, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#420908';
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.26, R * 0.74, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  function drawVesselsStatic(ctx, sc, vOpt, cullRect, skipId) {
    for (const v of sc.vessels) {
      if (skipId != null && v.id === skipId) continue;
      drawOneVesselStatic(ctx, v, vOpt, cullRect, false);
    }
  }

  function drawOneVesselDynamic(ctx, v, vOpt, cullRect, spr) {
    if (!v || (cullRect && !bboxIntersects(getVesselBBox(v), cullRect))) return;
    const R = v.R;

    // 若有血栓，重繪缺血段血管灰暗色調
    if (v.clot) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(78, 52, 46, 0.75)';
      ctx.lineWidth = (R + 0.6) * 2;
      ctx.stroke(v.path);
      ctx.restore();
    }

    // 流動雙凹圓盤紅血球 (Sprite drawImage)
    for (const rbc of v.rbcs) {
      if (rbc.s < 8) continue;
      const P = U.pointAtS(v.pts, v.cum, rbc.s);
      const nx = -Math.sin(P.a), ny = Math.cos(P.a);
      const rx = P.x + nx * rbc.off * R * 0.45;
      const ry = P.y + ny * rbc.off * R * 0.45;
      if (cullRect && (rx < cullRect.x0 - 15 || rx > cullRect.x1 + 15 || ry < cullRect.y0 - 15 || ry > cullRect.y1 + 15)) continue;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(P.a + rbc.tilt);
      ctx.drawImage(spr, -10, -7, 20, 14);
      ctx.restore();
    }

    // 缺血性血栓或出血性中風病灶
    if (v.clot) {
      ctx.save();
      ctx.fillStyle = '#ffb300';
      ctx.strokeStyle = INK;
      ctx.lineWidth = vOpt.o;
      ctx.beginPath();
      ctx.arc(v.clot.x, v.clot.y, R * 0.92, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    if (v.hem) {
      const hg = ctx.createRadialGradient(v.hem.x, v.hem.y, 4, v.hem.x, v.hem.y, 92);
      hg.addColorStop(0, 'rgba(183, 28, 28, 0.82)');
      hg.addColorStop(0.55, 'rgba(198, 40, 40, 0.35)');
      hg.addColorStop(1, 'rgba(198, 40, 40, 0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(v.hem.x, v.hem.y, 92, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawVesselsDynamic(ctx, sc, vOpt, cullRect, skipId) {
    const spr = getRbcSprite();
    for (const v of sc.vessels) {
      if (skipId != null && v.id === skipId) continue;
      drawOneVesselDynamic(ctx, v, vOpt, cullRect, spr);
    }
  }

  /* ---------------- 室管膜細胞：動態纖毛 + 靜態本體拆分 ---------------- */
  function strokeEpendymalCiliaFor(ctx, e, sim) {
    const speed = sim.isSleeping ? 8.5 : 2.8;
    const amp = sim.isSleeping ? 8.5 : 4.0;
    const cs = Math.cos(e.rot), sn = Math.sin(e.rot);
    const y0 = -e.h + 1;
    for (let i = 0; i < e.cilia.length; i++) {
      const c = e.cilia[i];
      const wave = Math.sin(sim.T * speed + e.phase + c.ph + i * 0.55) * amp;
      const sx = e.x + c.x * cs - y0 * sn;
      const sy = e.y + c.x * sn + y0 * cs;
      const mxL = c.x + wave * 0.55, myL = -e.h - c.len * 0.5;
      const exL = c.x + wave, eyL = -e.h - c.len;
      const mx = e.x + mxL * cs - myL * sn;
      const my = e.y + mxL * sn + myL * cs;
      const ex = e.x + exL * cs - eyL * sn;
      const ey = e.y + exL * sn + eyL * cs;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
    }
  }

  function drawOneEpendymalCilia(ctx, e, sim) {
    if (!e || !e.cilia.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    strokeEpendymalCiliaFor(ctx, e, sim);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#d44b49';
    ctx.stroke();
    ctx.restore();
  }

  function drawEpendymalCilia(ctx, sc, sim, cullRect, skipId) {
    if (!sc.epend.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const e of sc.epend) {
      if (skipId != null && e.id === skipId) continue;
      if (cullRect && (e.x < cullRect.x0 - 60 || e.x > cullRect.x1 + 60 || e.y < cullRect.y0 - 70 || e.y > cullRect.y1 + 60)) continue;
      strokeEpendymalCiliaFor(ctx, e, sim);
    }
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#d44b49';
    ctx.stroke();
    ctx.restore();
  }

  function drawOneEpendymalBody(ctx, e, vOpt, withHalo) {
    if (!e) return;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rot);
    if (withHalo) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255, 160, 0, 0.42)';
      ctx.lineWidth = 7.5;
      ctx.stroke(e.body);
    }
    C.drawGlia(ctx, e, C.PAL.epend, vOpt, { noSoma: true });
    C.somaGlow(ctx, 0, -2, 13, C.PAL.epend, 1.5);
    C.drawNucleus(ctx, 0, 0, 5.2, 6.4, 0, C.PAL.epend.nucleus, vOpt.o * 0.55, '#4a1d28');
    ctx.restore();
  }

  function drawEpendymalBodiesStatic(ctx, sc, vOpt, cullRect, skipId) {
    if (!sc.epend.length) return;
    for (const e of sc.epend) {
      if (skipId != null && e.id === skipId) continue;
      if (cullRect && (e.x < cullRect.x0 - 95 || e.x > cullRect.x1 + 95 || e.y < cullRect.y0 - 95 || e.y > cullRect.y1 + 110)) continue;
      drawOneEpendymalBody(ctx, e, vOpt, false);
    }
  }

  function drawOneAstro(ctx, a, vOpt, withHalo) {
    if (!a) return;
    ctx.save();
    const s = a.baseScale == null ? 1 : a.baseScale;
    if (Math.abs(s - 1) > 0.005) {
      ctx.translate(a.x, a.y);
      ctx.scale(s, s);
      ctx.translate(-a.x, -a.y);
    }
    if (withHalo) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255, 160, 0, 0.42)';
      ctx.lineWidth = 8.0;
      ctx.stroke(a.body);
    }
    C.drawGlia(ctx, a, C.PAL.astro, vOpt);
    C.drawNucleus(ctx, a.nucleus.x, a.nucleus.y, a.nucleus.rx, a.nucleus.ry, a.nucleus.rot, C.PAL.astro.nucleus, vOpt.o * 0.55, '#254a0b');
    ctx.restore();
  }

  /* ---------------- 寡突膠質細胞與連續髓鞘套管 ---------------- */
  function drawOneOligo(ctx, o, vOpt, withHalo) {
    if (!o) return;
    ctx.save();
    if (withHalo) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255, 160, 0, 0.42)';
      ctx.lineWidth = 8.0;
      ctx.stroke(o.body);
    }
    C.drawGlia(ctx, o, C.PAL.oligo, vOpt);
    C.drawNucleus(ctx, o.nucleus.x, o.nucleus.y, o.nucleus.rx, o.nucleus.ry, o.nucleus.rot, C.PAL.oligo.nucleus, vOpt.o * 0.55, '#072f54');
    if (vOpt.detail2 && o.sheaths) {
      ctx.strokeStyle = 'rgba(20, 55, 85, 0.55)';
      ctx.lineWidth = 0.75;
      for (const sh of o.sheaths) {
        const p = sh.path, it = sh.internode;
        for (const sEnd of [it.s0 + 1.8, it.s1 - 1.8]) {
          const P = U.pointAtS(p.pts, p.cum, sEnd);
          const nx = -Math.sin(P.a), ny = Math.cos(P.a);
          ctx.beginPath();
          ctx.moveTo(P.x + nx * 3.5, P.y + ny * 3.5);
          ctx.lineTo(P.x - nx * 3.5, P.y - ny * 3.5);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function drawOligosAndMyelin(ctx, sc, vOpt, highlights, cullRect, skipId) {
    const alpha = typeAlpha(highlights, 'oligodendrocyte');
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;

    if (sc.orphans && sc.orphans.bbox && bboxIntersects(sc.orphans.bbox, cullRect)) {
      C.drawSilhouette(ctx, sc.orphans.body, C.PAL.oligo.base, vOpt.o, 0);
      ctx.save();
      ctx.clip(sc.orphans.body);
      C.strokeShading(ctx, sc.orphans.shade, C.PAL.oligo, vOpt.detail);
      ctx.restore();
    }

    for (const o of sc.oligos) {
      if (skipId != null && o.id === skipId) continue;
      if (cullRect && !bboxIntersects(o.bbox, cullRect)) continue;
      C.drawGlia(ctx, o, C.PAL.oligo, vOpt);
      C.drawNucleus(ctx, o.nucleus.x, o.nucleus.y, o.nucleus.rx, o.nucleus.ry, o.nucleus.rot, C.PAL.oligo.nucleus, vOpt.o * 0.55, '#072f54');
    }

    if (vOpt.detail2) {
      ctx.strokeStyle = 'rgba(20, 55, 85, 0.55)';
      ctx.lineWidth = 0.75;
      for (const n of sc.neurons) {
        if (cullRect && !bboxIntersects(n.bbox, cullRect)) continue;
        if (!n.axon) continue;
        for (const p of n.axon.paths) {
          for (const it of p.internodes) {
            if (skipId != null && it.owner && it.owner.id === skipId) continue;
            for (const sEnd of [it.s0 + 1.8, it.s1 - 1.8]) {
              const P = U.pointAtS(p.pts, p.cum, sEnd);
              if (cullRect && (P.x < cullRect.x0 - 10 || P.x > cullRect.x1 + 10 || P.y < cullRect.y0 - 10 || P.y > cullRect.y1 + 10)) continue;
              const nx = -Math.sin(P.a), ny = Math.cos(P.a);
              ctx.beginPath();
              ctx.moveTo(P.x + nx * 3.5, P.y + ny * 3.5);
              ctx.lineTo(P.x - nx * 3.5, P.y - ny * 3.5);
              ctx.stroke();
            }
          }
        }
      }
    }
    ctx.restore();
  }

  /* ---------------- 突觸超微結構 (Zoom LOD + 視錐剔除) ---------------- */
  function drawSynapseUltrastructure(ctx, sc, sim, zoom, cullRect) {
    const microA = U.smoothstep(1.85, 3.1, zoom);
    if (microA <= 0.02) return;

    ctx.save();
    for (const syn of sc.synapses) {
      const b = syn.bouton, c = syn.contact;
      if (cullRect) {
        const sx = (b.x + c.x) * 0.5, sy = (b.y + c.y) * 0.5;
        if (sx < cullRect.x0 - 20 || sx > cullRect.x1 + 20 || sy < cullRect.y0 - 20 || sy > cullRect.y1 + 20) continue;
      }
      const dx = c.x - b.x, dy = c.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;
      const wx = -uy, wy = ux;

      ctx.save();
      ctx.globalAlpha = microA;

      const ltpBoost = Math.max(0, syn.weight - syn.baseWeight);
      const psdCol = syn.bound > 0.08
        ? (syn.excit ? '#ff6d00' : '#00b0ff')
        : (syn.excit ? '#6a1b9a' : '#1565c0');
      ctx.strokeStyle = psdCol;
      ctx.lineWidth = 1.6 + Math.min(1.4, ltpBoost * 1.8);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c.x + wx * 3.4, c.y + wy * 3.4);
      ctx.lineTo(c.x - wx * 3.4, c.y - wy * 3.4);
      ctx.stroke();

      if (syn.isNew && (sim.T - syn.bornAt) < 8) {
        const kNew = 1 - (sim.T - syn.bornAt) / 8;
        ctx.strokeStyle = `rgba(46, 125, 50, ${0.75 * kNew})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 7.5 + (1 - kNew) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let r = -2; r <= 2; r++) {
        const rx = c.x + wx * r * 1.45 - ux * 0.4;
        const ry = c.y + wy * r * 1.45 - uy * 0.4;
        ctx.fillStyle = syn.bound > 0.1 ? '#ffea00' : psdCol;
        ctx.beginPath();
        ctx.arc(rx, ry, 0.62, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const v of syn.vesicles) {
        const vx = b.x + ux * v.u + wx * v.w;
        const vy = b.y + uy * v.u + wy * v.w;
        ctx.fillStyle = syn.excit ? '#ffb74d' : '#b39ddb';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.42;
        ctx.beginPath();
        ctx.arc(vx, vy, 0.78, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      const datFast = sim.datRate > 1.5;
      ctx.fillStyle = datFast ? '#d32f2f' : '#1976d2';
      for (const side of [-1, 1]) {
        const tx = b.x + ux * 2.2 + wx * side * 3.1;
        const ty = b.y + uy * 2.2 + wy * side * 3.1;
        ctx.beginPath();
        ctx.arc(tx, ty, datFast ? 0.85 : 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      if (syn.nt.length) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.55, microA);
        for (const m of syn.nt) {
          const mx = U.lerp(b.x + ux * 2.4, c.x - ux * 0.5, m.p) + wx * m.wOff * 0.42;
          const my = U.lerp(b.y + uy * 2.4, c.y - uy * 0.5, m.p) + wy * m.wOff * 0.42;
          ctx.fillStyle = syn.excit ? '#00e676' : '#40c4ff';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 0.35;
          ctx.beginPath();
          ctx.arc(mx, my, 0.85, 0, Math.PI * 2);
          ctx.fill();
          if (microA > 0.4) ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /* ---------------- 結構可塑性：新生纖維與生長錐 (Growth Cone) ---------------- */
  function drawGrowingSprouts(ctx, sim, vOpt) {
    if (!sim.growingSprouts || !sim.growingSprouts.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const sp of sim.growingSprouts) {
      const spec = sp.spec;
      const sEnd = Math.max(2, sp.progress * spec.len);
      const pts = U.subPolyline(spec.pts, spec.cum, 0, sEnd, 4);
      if (pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4.4;
        ctx.stroke();
        ctx.strokeStyle = '#ffca28';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      // 目標樹突上的新生樹突棘萌芽
      if (sp.progress > 0.42) {
        const kSpine = (sp.progress - 0.42) / 0.58;
        const c = spec.contact, b = spec.bouton;
        const dx = b.x - c.x, dy = b.y - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const nx = dx / d, ny = dy / d;
        const tipX = c.x + nx * 3.2 * kSpine, tipY = c.y + ny * 3.2 * kSpine;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(tipX, tipY); ctx.stroke();
        ctx.strokeStyle = '#f4d06a';
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.fillStyle = '#a5d6a7';
        ctx.strokeStyle = INK;
        ctx.lineWidth = vOpt.o * 0.6;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 1.8 * kSpine, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }

      // 軸突末端「生長錐 (Growth Cone)」掌狀體與絲狀偽足 (Filopodia)
      const tip = U.pointAtS(spec.pts, spec.cum, sEnd);
      ctx.save();
      ctx.translate(tip.x, tip.y);
      ctx.rotate(tip.a);

      // 擺動的絲狀偽足觸角
      ctx.strokeStyle = '#e65100';
      ctx.lineWidth = 1.1;
      for (let f = -2; f <= 2; f++) {
        const ang = f * 0.36 + Math.sin(sim.T * 9 + f * 1.7) * 0.14;
        const fl = 9 + Math.cos(sim.T * 7 + f) * 2.5;
        ctx.beginPath();
        ctx.moveTo(3, f * 1.1);
        ctx.lineTo(3 + Math.cos(ang) * fl, f * 1.1 + Math.sin(ang) * fl);
        ctx.stroke();
      }

      // 掌狀生長錐本體
      ctx.fillStyle = '#ffe082';
      ctx.strokeStyle = INK;
      ctx.lineWidth = vOpt.o * 0.85;
      ctx.beginPath();
      ctx.ellipse(1.5, 0, 5.2, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---------------- 動作電位、跳躍傳導、樹突 EPSP/IPSP 與級聯擴散視覺化 ---------------- */
  function drawSignals(ctx, sc, sim, cullRect, focusedId) {
    if (!sim.enabled) return;
    const hasFocus = focusedId != null;
    ctx.save();

    for (const rp of sim.somaRipples) {
      if (cullRect && (rp.x < cullRect.x0 - 70 || rp.x > cullRect.x1 + 70 || rp.y < cullRect.y0 - 70 || rp.y > cullRect.y1 + 70)) continue;
      const age = sim.T - rp.t0;
      const p = U.clamp(age / 0.85, 0, 1);
      const rad = rp.r0 + p * (rp.isRoot ? 58 : 38);
      const alpha = (1 - p) * (rp.isRoot ? 0.85 : 0.62);
      ctx.strokeStyle = rp.isRoot
        ? `rgba(255, 111, 0, ${alpha})`
        : (rp.excit ? `rgba(255, 196, 0, ${alpha})` : `rgba(124, 77, 255, ${alpha})`);
      ctx.lineWidth = rp.isRoot ? 3.0 * (1 - p * 0.5) : 2.0 * (1 - p * 0.5);
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rad, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const sp of sim.spikes) {
      if (cullRect && sp.neuron.bbox && !bboxIntersects(sp.neuron.bbox, cullRect)) continue;
      const isFocusedSpike = !hasFocus || sp.neuron.id === focusedId;
      ctx.save();
      if (!isFocusedSpike) ctx.globalAlpha *= 0.18;
      const tau = sim.T - sp.t0;
      const ax = sp.neuron.axon;
      if (!ax) { ctx.restore(); continue; }
      const colCore = sp.excit ? '#fffde7' : '#f3e5f5';
      const colGlow = sp.excit ? 'rgba(255, 179, 0, 0.88)' : 'rgba(156, 39, 176, 0.85)';
      const colOuter = sp.excit ? 'rgba(255, 111, 0, 0.35)' : 'rgba(103, 58, 183, 0.35)';

      for (const path of ax.paths) {
        const sNow = C.sAtTime(path, tau);
        if (sNow >= 0 && sNow <= path.len) {
          const P = U.pointAtS(path.pts, path.cum, sNow);
          if (!cullRect || (P.x >= cullRect.x0 - 40 && P.x <= cullRect.x1 + 40 && P.y >= cullRect.y0 - 40 && P.y <= cullRect.y1 + 40)) {
            const sTail = Math.max(0, sNow - 28);
            const tail = U.subPolyline(path.pts, path.cum, sTail, sNow, 4);

            if (tail.length >= 2) {
              ctx.lineCap = 'round';
              ctx.strokeStyle = colOuter;
              ctx.lineWidth = 7.5;
              ctx.beginPath();
              ctx.moveTo(tail[0].x, tail[0].y);
              for (let i = 1; i < tail.length; i++) ctx.lineTo(tail[i].x, tail[i].y);
              ctx.stroke();

              ctx.strokeStyle = colGlow;
              ctx.lineWidth = 3.4;
              ctx.stroke();
            }

            ctx.fillStyle = colOuter;
            ctx.beginPath(); ctx.arc(P.x, P.y, 6.8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = colGlow;
            ctx.beginPath(); ctx.arc(P.x, P.y, 4.0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = colCore;
            ctx.beginPath(); ctx.arc(P.x, P.y, 2.0, 0, Math.PI * 2); ctx.fill();
          }
        }

        for (const ndS of path.nodes) {
          const dtNode = tau - C.timeAtS(path, ndS);
          if (dtNode >= 0 && dtNode < 0.16) {
            const NP = U.pointAtS(path.pts, path.cum, ndS);
            if (cullRect && (NP.x < cullRect.x0 - 20 || NP.x > cullRect.x1 + 20 || NP.y < cullRect.y0 - 20 || NP.y > cullRect.y1 + 20)) continue;
            const k = 1 - dtNode / 0.16;
            ctx.fillStyle = `rgba(0, 229, 255, ${0.72 * k})`;
            ctx.beginPath();
            ctx.arc(NP.x, NP.y, 4.2 + (1 - k) * 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * k})`;
            ctx.beginPath();
            ctx.arc(NP.x, NP.y, 2.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    for (const psp of sim.psps) {
      if (cullRect && psp.post.bbox && !bboxIntersects(psp.post.bbox, cullRect)) continue;
      const isFocusedPsp = !hasFocus || psp.syn.pre.id === focusedId || psp.post.id === focusedId;
      ctx.save();
      if (!isFocusedPsp) ctx.globalAlpha *= 0.18;
      const prog = U.clamp((sim.T - psp.t0) / psp.dur, 0, 1);
      const sNow = prog * psp.syn.psLen;
      const P = U.pointAtS(psp.syn.psPts, psp.syn.psCum, sNow);
      if (cullRect && (P.x < cullRect.x0 - 35 || P.x > cullRect.x1 + 35 || P.y < cullRect.y0 - 35 || P.y > cullRect.y1 + 35)) { ctx.restore(); continue; }
      const s0 = Math.max(0, sNow - 22);
      const seg = U.subPolyline(psp.syn.psPts, psp.syn.psCum, s0, sNow, 3.5);
      if (seg.length >= 2) {
        ctx.lineCap = 'round';
        ctx.strokeStyle = psp.excit ? 'rgba(255, 109, 0, 0.72)' : 'rgba(0, 176, 255, 0.78)';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
        ctx.stroke();
      }
      ctx.fillStyle = psp.excit ? '#ffea00' : '#80d8ff';
      ctx.beginPath();
      ctx.arc(P.x, P.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const n of sc.real) {
      if (cullRect && (n.x < cullRect.x0 - n.r - 12 || n.x > cullRect.x1 + n.r + 12 || n.y < cullRect.y0 - n.r - 12 || n.y > cullRect.y1 + n.r + 12)) continue;
      if (Math.abs(n.V) > 0.08) {
        const ratio = U.clamp(Math.abs(n.V), 0, 1);
        ctx.strokeStyle = n.V > 0 ? 'rgba(230, 81, 0, 0.85)' : 'rgba(2, 119, 189, 0.82)';
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 4.2, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
        ctx.stroke();
      }
      if (sim.caffeineTimer > 0) {
        ctx.save();
        ctx.strokeStyle = '#1565c0';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 6.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  /* ---------------- 代謝廢物（腺苷、類澱粉蛋白斑塊、麩胺酸） ---------------- */
  function drawWastes(ctx, sim, vOpt, cullRect) {
    if (!sim.wastes.length) return;
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = vOpt.o * 0.6;
    for (const w of sim.wastes) {
      if (cullRect && (w.x < cullRect.x0 - 12 || w.x > cullRect.x1 + 12 || w.y < cullRect.y0 - 12 || w.y > cullRect.y1 + 12)) continue;
      if (w.type === 'adenosine') {
        ctx.fillStyle = '#ab47bc';
        ctx.beginPath(); ctx.arc(w.x, w.y, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (w.type === 'amyloid') {
        ctx.fillStyle = '#795548';
        ctx.beginPath();
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2;
          const r = k % 2 === 0 ? 6.8 : 4.6;
          const px = w.x + Math.cos(a) * r, py = w.y + Math.sin(a) * r;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = '#ff3d00';
        ctx.beginPath(); ctx.arc(w.x, w.y, 3.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---------------- 雙層離屏快取系統 (PlateCache + HiResCache) ---------------- */
  let plateCache = null;
  let hiResCache = null;

  function computeAstroState(sc) {
    if (!sc.astros.length) return 'none';
    const s = sc.astros[0].baseScale == null ? 1 : sc.astros[0].baseScale;
    if (Math.abs(s - 1.0) < 0.008) return 'awake';
    if (Math.abs(s - 0.68) < 0.008) return 'sleep';
    return 'animating';
  }

  function focusCacheKey(focusedCell) {
    if (!focusedCell) return '';
    if (focusedCell.kind === 'microglia') return 'dim_all';
    return `${focusedCell.kind}:${focusedCell.id}`;
  }

  function bakeStaticPair(sc, stain, highlights, astroState, rect, scale, vOpt, withShadow, focusedCell) {
    const cw = Math.max(64, Math.ceil(rect.w * scale));
    const ch = Math.max(64, Math.ceil(rect.h * scale));
    const isNissl = stain === 'nissl';
    const hasFocus = focusedCell != null;
    const fKind = hasFocus ? focusedCell.kind : null;
    const fId = hasFocus ? focusedCell.id : null;

    const bg = document.createElement('canvas');
    bg.width = cw; bg.height = ch;
    const bgCtx = bg.getContext('2d');

    const fg = document.createElement('canvas');
    fg.width = cw; fg.height = ch;
    const fgCtx = fg.getContext('2d');

    const cullRect = { x0: rect.x0 - 45, y0: rect.y0 - 45, x1: rect.x0 + rect.w + 45, y1: rect.y0 + rect.h + 45 };

    // --- 烘焙 bgCanvas（紙張陰影、暖沙黃神經氈漸層、CSF 腦室、細纖維、點描、靜態微血管） ---
    bgCtx.save();
    bgCtx.translate(-rect.x0 * scale, -rect.y0 * scale);
    bgCtx.scale(scale, scale);

    if (withShadow) {
      bgCtx.save();
      bgCtx.shadowColor = 'rgba(48, 28, 12, 0.34)';
      bgCtx.shadowBlur = 32;
      bgCtx.shadowOffsetX = 6;
      bgCtx.shadowOffsetY = 12;
      bgCtx.fillStyle = isNissl ? '#e8eef5' : '#f4ddb0';
      bgCtx.fill(sc.frame.path);
      bgCtx.restore();
    }

    bgCtx.save();
    bgCtx.clip(sc.frame.path);

    const bgGrad = bgCtx.createRadialGradient(-120, -90, 40, 0, 60, 1050);
    if (isNissl) {
      bgGrad.addColorStop(0, '#f3effa');
      bgGrad.addColorStop(0.5, '#e2dcf2');
      bgGrad.addColorStop(1, '#cfc8e6');
    } else {
      bgGrad.addColorStop(0, '#fcf0c2');
      bgGrad.addColorStop(0.45, '#ecd198');
      bgGrad.addColorStop(1, '#dcba7b');
    }
    bgCtx.fillStyle = bgGrad;
    bgCtx.fillRect(rect.x0 - 10, rect.y0 - 10, rect.w + 20, rect.h + 20);

    if (sc.ventricle) {
      const csfG = bgCtx.createLinearGradient(0, -sc.H / 2, 0, -sc.H / 2 + 260);
      csfG.addColorStop(0, '#9ac6ea');
      csfG.addColorStop(1, '#deeffc');
      bgCtx.fillStyle = csfG;
      bgCtx.fill(sc.ventricle);
    }

    bgCtx.strokeStyle = isNissl ? 'rgba(95, 70, 145, 0.14)' : 'rgba(128, 86, 38, 0.14)';
    bgCtx.lineWidth = 1.0;
    bgCtx.stroke(sc.fibers);

    bgCtx.fillStyle = isNissl ? 'rgba(85, 65, 130, 0.14)' : 'rgba(120, 78, 30, 0.15)';
    bgCtx.fill(getStipplePath(sc));

    bgCtx.save();
    bgCtx.globalAlpha *= layerAlpha(highlights, 'capillary', hasFocus);
    drawVesselsStatic(bgCtx, sc, vOpt, cullRect, fKind === 'capillary' ? fId : null);
    bgCtx.restore();

    if (fKind === 'capillary') {
      const fv = sc.vessels.find((v) => v.id === fId);
      if (fv) drawOneVesselStatic(bgCtx, fv, vOpt, cullRect, true);
    }

    bgCtx.restore();
    bgCtx.restore();

    // --- 烘焙 fgCanvas（室管膜本體、靜態星形膠、神經元靜態剪影、寡突膠與髓鞘） ---
    fgCtx.save();
    fgCtx.translate(-rect.x0 * scale, -rect.y0 * scale);
    fgCtx.scale(scale, scale);
    fgCtx.clip(sc.frame.path);

    fgCtx.save();
    fgCtx.globalAlpha *= layerAlpha(highlights, 'ependyma', hasFocus);
    drawEpendymalBodiesStatic(fgCtx, sc, vOpt, cullRect, fKind === 'ependyma' ? fId : null);
    fgCtx.restore();

    if (astroState !== 'animating') {
      fgCtx.save();
      fgCtx.globalAlpha *= layerAlpha(highlights, 'astrocyte', hasFocus);
      for (const a of sc.astros) {
        if (fKind === 'astrocyte' && a.id === fId) continue;
        if (!bboxIntersects(a.bbox, cullRect)) continue;
        drawOneAstro(fgCtx, a, vOpt, false);
      }
      fgCtx.restore();
    }

    const neuronOpt = Object.assign({}, vOpt, { signals: false, T: -100 });
    const neuronBase = typeAlpha(highlights, 'neuron');
    if (!hasFocus) {
      fgCtx.save();
      fgCtx.globalAlpha *= neuronBase;
      for (const n of sc.neurons) {
        if (!bboxIntersects(n.bbox, cullRect)) continue;
        C.drawNeuron(fgCtx, n, neuronOpt);
      }
      fgCtx.restore();

      drawOligosAndMyelin(fgCtx, sc, vOpt, highlights, cullRect, null);
    } else {
      // 先以淡化透明度繪製背景神經元與髓鞘，再將單獨 highlight 的目標細胞置頂並加上暖金光暈
      fgCtx.save();
      fgCtx.globalAlpha *= Math.min(neuronBase, 0.14);
      for (const n of sc.neurons) {
        if (fKind === 'neuron' && n.id === fId) continue;
        if (!bboxIntersects(n.bbox, cullRect)) continue;
        C.drawNeuron(fgCtx, n, neuronOpt);
      }
      fgCtx.restore();

      fgCtx.save();
      fgCtx.globalAlpha *= 0.14;
      drawOligosAndMyelin(fgCtx, sc, vOpt, highlights, cullRect, fKind === 'oligodendrocyte' ? fId : null);
      fgCtx.restore();

      if (fKind === 'neuron') {
        const fn = sc.neurons.find((n) => n.id === fId);
        if (fn && bboxIntersects(fn.bbox, cullRect)) {
          fgCtx.save();
          fgCtx.lineCap = 'round';
          fgCtx.lineJoin = 'round';
          const haloBody = vOpt.spines && fn.bodySpiny ? fn.bodySpiny : fn.body;
          fgCtx.strokeStyle = 'rgba(255, 160, 0, 0.38)';
          fgCtx.lineWidth = 8.5;
          fgCtx.stroke(haloBody);
          C.drawNeuron(fgCtx, fn, neuronOpt);
          fgCtx.restore();
        }
      } else if (fKind === 'oligodendrocyte') {
        const fo = sc.oligos.find((o) => o.id === fId);
        if (fo && bboxIntersects(fo.bbox, cullRect)) drawOneOligo(fgCtx, fo, vOpt, true);
      } else if (fKind === 'astrocyte' && astroState !== 'animating') {
        const fa = sc.astros.find((a) => a.id === fId);
        if (fa && bboxIntersects(fa.bbox, cullRect)) drawOneAstro(fgCtx, fa, vOpt, true);
      } else if (fKind === 'ependyma') {
        const fe = sc.epend.find((e) => e.id === fId);
        if (fe && (!fe.bbox || bboxIntersects(fe.bbox, cullRect))) drawOneEpendymalBody(fgCtx, fe, vOpt, true);
      }
    }

    fgCtx.restore();

    return { bg, fg, x0: rect.x0, y0: rect.y0, w: rect.w, h: rect.h, scale };
  }

  function ensurePlateCache(sc, stain, hlKey, highlights, astroState, focusedCell) {
    const fKey = focusCacheKey(focusedCell);
    const key = `${sc.seed}:${stain}:${hlKey}:${astroState}:${fKey}`;
    if (plateCache && plateCache.key === key) return plateCache;

    const rect = { x0: -sc.W / 2 - 52, y0: -sc.H / 2 - 52, w: sc.W + 104, h: sc.H + 104 };
    const scale = 1.1;
    const vOpt = { o: 1.28, shadow: 5, detail: true, detail2: false, spines: false };
    const baked = bakeStaticPair(sc, stain, highlights, astroState, rect, scale, vOpt, true, focusedCell);
    plateCache = Object.assign({ key }, baked);
    return plateCache;
  }

  function coversViewRect(cache, vr) {
    if (!cache || !vr) return false;
    return vr.x0 >= cache.x0 + 4 && vr.x1 <= cache.x0 + cache.w - 4 &&
           vr.y0 >= cache.y0 + 4 && vr.y1 <= cache.y0 + cache.h - 4;
  }

  function ensureHiResCache(sc, stain, hlKey, highlights, astroState, opt) {
    const zoom = opt.microZoom;
    const vr = opt.viewRect;
    if (!vr || zoom <= 1.15) return null;

    const targetScale = opt.worldPxScale * Math.min(opt.dpr || 1, 1.75);
    const fKey = focusCacheKey(opt.focusedCell);
    const key = `${sc.seed}:${stain}:${hlKey}:${astroState}:${fKey}`;
    const valid = hiResCache && hiResCache.key === key &&
                  coversViewRect(hiResCache, vr) &&
                  Math.abs(Math.log(targetScale / hiResCache.scale)) <= 0.28;
    if (valid) return hiResCache;

    if (!opt.cameraSettled) {
      return (hiResCache && hiResCache.key === key && coversViewRect(hiResCache, vr)) ? hiResCache : null;
    }

    const vw = vr.x1 - vr.x0, vh = vr.y1 - vr.y0;
    const cx = (vr.x0 + vr.x1) * 0.5, cy = (vr.y0 + vr.y1) * 0.5;
    const pad = 1.26;
    const w = vw * pad, h = vh * pad;
    const rect = { x0: cx - w * 0.5, y0: cy - h * 0.5, w, h };

    const maxDim = 3072;
    const scale = Math.min(targetScale, maxDim / Math.max(w, h));
    const o = U.clamp(1.28 / Math.pow(Math.max(0.6, zoom), 0.28), 0.62, 1.55);
    const vOpt = {
      o,
      shadow: zoom < 2.2 ? 5 : 0,
      detail: true,
      detail2: zoom > 1.35,
      spines: true
    };
    const baked = bakeStaticPair(sc, stain, highlights, astroState, rect, scale, vOpt, true, opt.focusedCell);
    hiResCache = Object.assign({ key }, baked);
    return hiResCache;
  }

  /* ---------------- 螢幕空間自動避碰引線標籤（附佈局快取） ---------------- */
  function collectSceneAnchors(sc, zoom) {
    const out = [];
    const pyr = sc.real.find((n) => n.kind === 'pyramidal') || sc.real.find((n) => n.excit);
    if (pyr) {
      out.push({
        title: pyr.kindInfo.title,
        sub: pyr.kindInfo.en,
        wx: pyr.x, wy: pyr.y,
        dx: 64, dy: -46
      });
      if (pyr.axon && pyr.axon.paths[0] && pyr.axon.paths[0].len > 60) {
        const hp = U.pointAtS(pyr.axon.paths[0].pts, pyr.axon.paths[0].cum, pyr.r + 12);
        if (zoom > 1.35) {
          out.push({ title: '軸突丘（起始段）', sub: 'Axon hillock / AIS', wx: hp.x, wy: hp.y, dx: 68, dy: 32 });
        }
      }
      if (pyr.spiny && pyr.spines && pyr.spines.length > 8 && zoom > 1.7) {
        const sp = pyr.spines[Math.floor(pyr.spines.length * 0.35)];
        out.push({ title: '樹突棘', sub: 'Dendritic spines', wx: sp.x, wy: sp.y, dx: -72, dy: -32 });
      }
    }

    const inh = sc.real.find((n) => !n.excit);
    if (inh) {
      out.push({ title: inh.kindInfo.title, sub: inh.kindInfo.en, wx: inh.x, wy: inh.y, dx: -68, dy: -42 });
    }

    if (sc.oligos.length) {
      const o = sc.oligos[0];
      out.push({ title: '寡突膠質細胞', sub: 'Oligodendrocyte', wx: o.x, wy: o.y, dx: -72, dy: 40 });
      if (o.sheaths.length) {
        const sh = o.sheaths[0];
        if (sh.path.nodes.length) {
          const np = U.pointAtS(sh.path.pts, sh.path.cum, sh.path.nodes[0]);
          out.push({ title: '髓鞘與蘭氏結', sub: 'Myelin & Node of Ranvier', wx: np.x, wy: np.y, dx: 72, dy: -38 });
        }
      }
    }

    if (sc.astros.length) {
      const a = sc.astros[0];
      out.push({ title: '星形膠質細胞', sub: 'Astrocyte', wx: a.x, wy: a.y, dx: 68, dy: 42 });
      if (a.endfeet.length) {
        const ef = a.endfeet[0];
        out.push({ title: '血管周終足（血腦障壁）', sub: 'Perivascular endfoot (BBB)', wx: ef.x, wy: ef.y, dx: -78, dy: -36 });
      }
    }

    if (sc.micro.length) {
      const m = sc.micro[0];
      out.push({ title: '微膠細胞（免疫哨兵）', sub: 'Microglia', wx: m.x, wy: m.y, dx: 66, dy: -36 });
    }

    if (sc.vessels.length) {
      const v = sc.vessels[0];
      const vp = U.pointAtS(v.pts, v.cum, v.len * 0.45);
      out.push({ title: '微血管與雙凹紅血球', sub: 'Capillary & RBCs', wx: vp.x, wy: vp.y, dx: -76, dy: 40 });
    }

    if (sc.epend.length) {
      const ep = sc.epend[Math.floor(sc.epend.length * 0.5)];
      out.push({ title: '室管膜細胞與擺動纖毛', sub: 'Ependymal cells & cilia', wx: ep.x, wy: ep.y - 12, dx: 0, dy: -56 });
    }

    if (zoom > 2.1 && sc.synapses.length) {
      const syn = sc.synapses.find((s) => s.excit && !s.pre.virtual) || sc.synapses[0];
      out.push({ title: '突觸前終扣與突觸囊泡', sub: 'Presynaptic bouton & vesicles', wx: syn.bouton.x, wy: syn.bouton.y, dx: -95, dy: -46 });
      out.push({ title: '突觸間隙與後膜受體 (PSD)', sub: 'Synaptic cleft & receptors', wx: syn.contact.x, wy: syn.contact.y, dx: 95, dy: 44 });
    }

    return out;
  }

  let labelLayoutCache = null;

  function drawMicroLabelsScreen(ctx, sc, sim, worldToScreen, width, height, microZoom, showLabels, safeBounds, camUx, camUy) {
    const minX = safeBounds ? safeBounds.left : 16;
    const maxX = safeBounds ? safeBounds.right : width - 16;

    // 1. 動態點擊級聯擴散徽章 (G0 -> G1 -> G2) 與新生突觸提示
    if (sim.enabled && sim.activeWave && (sim.T - sim.activeWave.startT) < 4.5) {
      for (const n of sc.real) {
        if (!sim.activeWave.recruited.has(n.id)) continue;
        const sp = worldToScreen(n.x, n.y - n.r - 8);
        if (sp.x < minX + 20 || sp.x > maxX - 20 || sp.y < 70 || sp.y > height - 56) continue;
        const gen = n.waveGen;
        const tag = gen === 0 ? '起始激發 (G0)' : `第 ${gen} 階擴散 (G${gen})`;
        ctx.save();
        ctx.font = '700 11px "Microsoft JhengHei", sans-serif';
        const tw = ctx.measureText(tag).width + 14;
        ctx.fillStyle = gen === 0 ? '#e65100' : '#fff8e7';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(sp.x - tw / 2, sp.y - 20, tw, 20, 99);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = gen === 0 ? '#ffffff' : '#bf360c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tag, sp.x, sp.y - 10);
        ctx.restore();
      }
    }

    if (showLabels) {
      for (const syn of sc.synapses) {
        if (!syn.isNew || (sim.T - syn.bornAt) >= 5.5) continue;
        const sp = worldToScreen(syn.contact.x, syn.contact.y - 12);
        if (sp.x < minX + 20 || sp.x > maxX - 20 || sp.y < 70 || sp.y > height - 56) continue;
        const tag = '新生突觸';
        ctx.save();
        ctx.font = '700 10.5px "Microsoft JhengHei", sans-serif';
        const tw = ctx.measureText(tag).width + 12;
        ctx.fillStyle = '#e8f5e9';
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(sp.x - tw / 2, sp.y - 18, tw, 18, 99);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1b5e20';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tag, sp.x, sp.y - 9);
        ctx.restore();
      }
    }

    if (!showLabels) return;

    const zoomTier = microZoom > 2.1 ? 3 : microZoom > 1.7 ? 2 : microZoom > 1.35 ? 1 : 0;
    const uxQ = camUx != null ? Math.round(camUx * 2) : 0;
    const uyQ = camUy != null ? Math.round(camUy * 2) : 0;
    const mzQ = Math.round(microZoom * 40);
    const lKey = `${sc.seed}:${sc.synapses.length}:${zoomTier}:${uxQ}:${uyQ}:${mzQ}:${minX}:${maxX}:${width}:${height}`;

    let items;
    if (labelLayoutCache && labelLayoutCache.key === lKey) {
      items = labelLayoutCache.items;
    } else {
      const anchors = collectSceneAnchors(sc, microZoom);
      const placed = [];
      items = [];
      for (const a of anchors) {
        const p = worldToScreen(a.wx, a.wy);
        if (p.x < minX + 10 || p.x > maxX - 10 || p.y < 76 || p.y > height - 66) continue;

        ctx.font = '700 12px "Noto Serif TC", "Microsoft JhengHei", serif';
        const w1 = ctx.measureText(a.title).width;
        ctx.font = 'italic 600 10px Georgia, serif';
        const w2 = ctx.measureText(a.sub).width;
        const bw = Math.max(w1, w2) + 14;
        const bh = 30;

        if (maxX - minX < bw + 20) continue;
        let lx = U.clamp(p.x + a.dx, minX + bw / 2, maxX - bw / 2);
        let ly = U.clamp(p.y + a.dy, 78 + bh / 2, height - 76 - bh / 2);

        for (let iter = 0; iter < 5; iter++) {
          for (const q of placed) {
            const ox = (bw + q.bw) / 2 + 8 - Math.abs(lx - q.lx);
            const oy = (bh + q.bh) / 2 + 6 - Math.abs(ly - q.ly);
            if (ox > 0 && oy > 0) ly += (ly >= q.ly ? 1 : -1) * (oy + 2);
          }
          ly = U.clamp(ly, 78 + bh / 2, height - 52 - bh / 2);
        }

        const overlaps = placed.some((q) => Math.abs(lx - q.lx) < (bw + q.bw) / 2 + 4 && Math.abs(ly - q.ly) < (bh + q.bh) / 2 + 3);
        if (overlaps) continue;
        placed.push({ lx, ly, bw, bh });

        const edgeX = lx > p.x ? lx - bw / 2 : lx + bw / 2;
        const elbowX = edgeX + (lx > p.x ? -10 : 10);
        items.push({ px: p.x, py: p.y, lx, ly, bw, bh, edgeX, elbowX, title: a.title, sub: a.sub });
      }
      labelLayoutCache = { key: lKey, items };
    }

    ctx.save();
    for (const it of items) {
      ctx.strokeStyle = 'rgba(255, 250, 236, 0.85)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(it.px, it.py);
      ctx.lineTo(it.elbowX, it.ly);
      ctx.lineTo(it.edgeX, it.ly);
      ctx.stroke();

      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(it.px, it.py);
      ctx.lineTo(it.elbowX, it.ly);
      ctx.lineTo(it.edgeX, it.ly);
      ctx.stroke();

      ctx.fillStyle = '#fff8e7';
      ctx.beginPath();
      ctx.arc(it.px, it.py, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 251, 240, 0.94)';
      ctx.strokeStyle = 'rgba(36, 24, 15, 0.78)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(it.lx - it.bw / 2, it.ly - it.bh / 2, it.bw, it.bh, 6);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = INK;
      ctx.font = '700 11.5px "Noto Serif TC", "Microsoft JhengHei", serif';
      ctx.fillText(it.title, it.lx, it.ly - 3);
      ctx.fillStyle = '#6d4c3d';
      ctx.font = 'italic 600 9.5px Georgia, serif';
      ctx.fillText(it.sub, it.lx, it.ly + 10);
    }
    ctx.restore();
  }

  /* =========================================================================
   * 繪製整張顯微組織插畫圖版 (使用靜態雙層快取 + 視錐剔除動態疊加)
   * ========================================================================= */
  let lastCacheMode = 'plate';

  function drawMicroScene(ctx, sc, sim, opt) {
    const zoom = opt.microZoom;
    const stain = opt.stain || 'natural';
    const highlights = opt.highlights;
    const hlKey = highlights && highlights.size ? Array.from(highlights).sort().join(',') : '';
    const astroState = computeAstroState(sc);
    const cullRect = opt.viewRect || null;
    const focusedCell = opt.focusedCell || null;
    const hasFocus = focusedCell != null;
    const fKind = hasFocus ? focusedCell.kind : null;
    const fId = hasFocus ? focusedCell.id : null;
    const focusedNeuronId = fKind === 'neuron' ? fId : null;

    const plate = ensurePlateCache(sc, stain, hlKey, highlights, astroState, focusedCell);
    const hiRes = ensureHiResCache(sc, stain, hlKey, highlights, astroState, opt);
    const active = hiRes || plate;
    lastCacheMode = hiRes ? 'hiRes' : 'plate';

    const o = U.clamp(1.28 / Math.pow(Math.max(0.6, zoom), 0.28), 0.62, 1.55);
    const vOpt = { o, shadow: zoom < 2.2 ? 5 : 0, detail: zoom > 0.65 };
    const needsFrameClip = !cullRect || cullRect.x0 <= -sc.W / 2 + 65 || cullRect.x1 >= sc.W / 2 - 65 || cullRect.y0 <= -sc.H / 2 + 65 || cullRect.y1 >= sc.H / 2 - 65;

    ctx.save();

    // 1. 貼上靜態背景層（含紙張陰影、漸層神經氈、點描、靜態血管）
    ctx.drawImage(active.bg, active.x0, active.y0, active.w, active.h);

    // 2. 動態層 1（接近圖版邊框時才剪裁，高倍率內部免去光柵化 clip）
    ctx.save();
    if (needsFrameClip) ctx.clip(sc.frame.path);

    // 2a. 腦脊髓液／類淋巴流場微粒
    for (const p of sim.csfParticles) {
      if (cullRect && (p.x < cullRect.x0 - 15 || p.x > cullRect.x1 + 15 || p.y < cullRect.y0 - 25 || p.y > cullRect.y1 + 25)) continue;
      ctx.fillStyle = sim.isSleeping ? 'rgba(25, 118, 210, 0.36)' : 'rgba(255, 255, 255, 0.32)';
      ctx.beginPath();
      if (sim.isSleeping) ctx.roundRect(p.x, p.y, 2.6, p.r * 5.5, 1.5);
      else ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2b. 室管膜動態纖毛（在靜態粉紅本體下方）
    if (sc.epend.length) {
      ctx.save();
      ctx.globalAlpha *= layerAlpha(highlights, 'ependyma', hasFocus);
      drawEpendymalCilia(ctx, sc, sim, cullRect, fKind === 'ependyma' ? fId : null);
      ctx.restore();
      if (fKind === 'ependyma') {
        const fe = sc.epend.find((e) => e.id === fId);
        if (fe && (!fe.bbox || bboxIntersects(fe.bbox, cullRect))) drawOneEpendymalCilia(ctx, fe, sim);
      }
    }

    // 2c. 微血管動態紅血球、血栓與出血（在星形膠終足下方）
    ctx.save();
    ctx.globalAlpha *= layerAlpha(highlights, 'capillary', hasFocus);
    drawVesselsDynamic(ctx, sc, vOpt, cullRect, fKind === 'capillary' ? fId : null);
    ctx.restore();
    if (fKind === 'capillary') {
      const fv = sc.vessels.find((v) => v.id === fId);
      if (fv) drawOneVesselDynamic(ctx, fv, vOpt, cullRect, getRbcSprite());
    }

    // 2d. 若星形膠細胞正在睡眠收縮/恢復過渡中，即時縮放繪製
    if (astroState === 'animating') {
      ctx.save();
      ctx.globalAlpha *= layerAlpha(highlights, 'astrocyte', hasFocus);
      for (const a of sc.astros) {
        if (fKind === 'astrocyte' && a.id === fId) continue;
        if (cullRect && !bboxIntersects(a.bbox, cullRect)) continue;
        drawOneAstro(ctx, a, vOpt, false);
      }
      ctx.restore();
    }
    ctx.restore(); // 結束動態層 1 clip

    // 3. 貼上靜態前景層（本身已於離屏預剪裁至 sc.frame.path，不需重複光柵化 clip mask）
    ctx.drawImage(active.fg, active.x0, active.y0, active.w, active.h);

    // 4. 動態層 2：過渡中星形膠置頂、膜電位閃光、超微突觸囊泡、訊號傳導、廢物、微膠細胞 Sprite、選取光環
    ctx.save();
    if (needsFrameClip) ctx.clip(sc.frame.path);

    if (astroState === 'animating' && fKind === 'astrocyte') {
      const fa = sc.astros.find((a) => a.id === fId);
      if (fa && bboxIntersects(fa.bbox, cullRect)) drawOneAstro(ctx, fa, vOpt, true);
    }

    const neuronDynAlpha = focusedNeuronId != null ? 1 : layerAlpha(highlights, 'neuron', hasFocus);
    if (neuronDynAlpha > 0) {
      if (opt.showSignals) {
        ctx.save();
        ctx.globalAlpha *= neuronDynAlpha;
        for (const n of sc.real) {
          if (focusedNeuronId != null && n.id !== focusedNeuronId) continue;
          if (cullRect && (n.x < cullRect.x0 - n.r * 1.6 || n.x > cullRect.x1 + n.r * 1.6 || n.y < cullRect.y0 - n.r * 1.6 || n.y > cullRect.y1 + n.r * 1.6)) continue;
          C.drawNeuronDynamicOverlay(ctx, n, sim);
        }
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha *= neuronDynAlpha;
      drawGrowingSprouts(ctx, sim, vOpt);
      drawSynapseUltrastructure(ctx, sc, sim, zoom, cullRect);
      if (opt.showSignals) {
        drawSignals(ctx, sc, sim, cullRect, focusedNeuronId);
      }
      ctx.restore();
    }

    ctx.save();
    if (hasFocus && fKind !== 'microglia') ctx.globalAlpha *= 0.22;
    drawWastes(ctx, sim, vOpt, cullRect);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha *= layerAlpha(highlights, 'microglia', hasFocus);
    for (const mg of sc.micro) {
      if (fKind === 'microglia' && mg.id === fId) continue;
      const r = mg.rad || 65;
      if (cullRect && (mg.x < cullRect.x0 - r || mg.x > cullRect.x1 + r || mg.y < cullRect.y0 - r || mg.y > cullRect.y1 + r)) continue;
      const spr = C.bakeMicrogliaSprite(mg);
      ctx.save();
      ctx.translate(mg.x, mg.y);
      ctx.rotate(mg.rot);
      const pulse = 1 + (mg.eat > 0 ? Math.sin(mg.eat * 16) * 0.16 : 0);
      if (pulse !== 1) ctx.scale(pulse, pulse);
      const hw = spr.halfWorld;
      ctx.drawImage(spr.canvas, -hw, -hw, hw * 2, hw * 2);
      ctx.restore();
    }
    ctx.restore();

    if (fKind === 'microglia') {
      const fm = sc.micro.find((m) => m.id === fId);
      if (fm) {
        const spr = C.bakeMicrogliaSprite(fm);
        ctx.save();
        ctx.translate(fm.x, fm.y);
        ctx.rotate(fm.rot);
        const pulse = 1 + (fm.eat > 0 ? Math.sin(fm.eat * 16) * 0.16 : 0);
        if (pulse !== 1) ctx.scale(pulse, pulse);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(255, 160, 0, 0.45)';
        ctx.lineWidth = 7.5;
        ctx.stroke(fm.body);
        const hw = spr.halfWorld;
        ctx.drawImage(spr.canvas, -hw, -hw, hw * 2, hw * 2);
        ctx.restore();
      }
    }

    if (opt.selected) {
      const sel = opt.selected;
      const sx = (sel.kind === 'microglia' && sel.entity) ? sel.entity.x : sel.x;
      const sy = (sel.kind === 'microglia' && sel.entity) ? sel.entity.y : sel.y;
      const pulse = 1 + Math.sin(sim.T * 5) * 0.08;
      ctx.save();
      ctx.strokeStyle = '#d84315';
      ctx.lineWidth = 2.4 / Math.max(0.7, Math.sqrt(zoom));
      ctx.beginPath();
      ctx.arc(sx, sy, (sel.r + 9) * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#fff8e7';
      ctx.lineWidth = 1.4 / Math.max(0.7, Math.sqrt(zoom));
      ctx.beginPath();
      ctx.arc(sx, sy, sel.r + 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // 結束 frame clip

    // 圖版外框墨線（僅當視野接近外框邊界時繪製）
    if (!cullRect || cullRect.x0 <= -sc.W / 2 + 25 || cullRect.x1 >= sc.W / 2 - 25 || cullRect.y0 <= -sc.H / 2 + 25 || cullRect.y1 >= sc.H / 2 - 25) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.8;
      ctx.stroke(sc.frame.path);
    }

    ctx.restore();
  }

  function invalidateSceneCache() {
    plateCache = null;
    hiResCache = null;
    labelLayoutCache = null;
  }

  BS.render = {
    drawMicroScene,
    drawMicroLabelsScreen,
    invalidateSceneCache,
    getCacheMode: () => lastCacheMode
  };
})();
