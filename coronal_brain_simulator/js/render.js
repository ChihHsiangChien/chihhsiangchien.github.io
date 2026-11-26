/* =========================================================================
 * render.js — 顯微組織教科書插圖渲染器（連續輪廓 + 訊號級聯擴散 + 突觸超微結構 + 引線標籤）
 * ========================================================================= */
(function () {
  'use strict';
  const U = BS.util, C = BS.cells;
  const INK = C.INK;

  function typeAlpha(highlights, key) {
    if (!highlights || highlights.size === 0) return 1;
    return highlights.has(key) ? 1 : 0.16;
  }

  /* ---------------- 3D 微血管與雙凹紅血球 ---------------- */
  function drawVessels(ctx, sc, sim, vOpt) {
    for (const v of sc.vessels) {
      const R = v.R;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 外墨線邊框
      ctx.strokeStyle = INK;
      ctx.lineWidth = (R + 2.4) * 2;
      ctx.stroke(v.path);

      // 內皮外層暗紅管壁
      ctx.strokeStyle = v.clot ? '#6d4c41' : '#a92c27';
      ctx.lineWidth = (R + 0.8) * 2;
      ctx.stroke(v.path);

      // 血管壁立體高光帶
      ctx.strokeStyle = v.clot ? '#8d6e63' : '#de5b4b';
      ctx.lineWidth = R * 1.45;
      ctx.stroke(v.path);

      // 血管內腔暗紅血液底色
      ctx.strokeStyle = v.clot ? '#4e342e' : '#5e1110';
      ctx.lineWidth = (R - 2.4) * 2;
      ctx.stroke(v.path);

      // 流動雙凹圓盤紅血球 (RBCs)
      for (const rbc of v.rbcs) {
        const P = U.pointAtS(v.pts, v.cum, rbc.s);
        const nx = -Math.sin(P.a), ny = Math.cos(P.a);
        const rx = P.x + nx * rbc.off * R * 0.45;
        const ry = P.y + ny * rbc.off * R * 0.45;
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(P.a + rbc.tilt);

        const g = ctx.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 7.2);
        g.addColorStop(0, '#ff8a80');
        g.addColorStop(0.55, '#e53935');
        g.addColorStop(1, '#8e1515');
        ctx.fillStyle = g;
        ctx.strokeStyle = INK;
        ctx.lineWidth = vOpt.o * 0.65;
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.4, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 雙凹中央凹陷陰影
        ctx.fillStyle = 'rgba(92, 10, 10, 0.58)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.7, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 血管壁扁平內皮細胞核
      for (const en of v.nuclei) {
        const P = U.pointAtS(v.pts, v.cum, en.s);
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

      ctx.restore();
    }
  }

  /* ---------------- 室管膜細胞與擺動纖毛 ---------------- */
  function drawEpendymalLayer(ctx, sc, sim, vOpt) {
    if (!sc.epend.length) return;
    const speed = sim.isSleeping ? 8.5 : 2.8;
    const amp = sim.isSleeping ? 8.5 : 4.0;
    for (const e of sc.epend) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot);

      // 頂端伸入 CSF 的擺動纖毛（先畫再蓋上連續細胞剪影）
      ctx.strokeStyle = INK;
      ctx.lineCap = 'round';
      for (let i = 0; i < e.cilia.length; i++) {
        const c = e.cilia[i];
        const wave = Math.sin(sim.T * speed + e.phase + c.ph + i * 0.55) * amp;
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = INK;
        ctx.beginPath();
        ctx.moveTo(c.x, -e.h + 1);
        ctx.quadraticCurveTo(c.x + wave * 0.55, -e.h - c.len * 0.5, c.x + wave, -e.h - c.len);
        ctx.stroke();

        ctx.lineWidth = 1.4;
        ctx.strokeStyle = '#d44b49';
        ctx.stroke();
      }

      C.drawGlia(ctx, e, C.PAL.epend, vOpt, { noSoma: true });
      C.somaGlow(ctx, 0, -2, 13, C.PAL.epend, 1.5);
      C.drawNucleus(ctx, 0, 0, 5.2, 6.4, 0, C.PAL.epend.nucleus, vOpt.o * 0.55, '#4a1d28');
      ctx.restore();
    }
  }

  /* ---------------- 寡突膠質細胞與連續髓鞘套管 ---------------- */
  function drawOligosAndMyelin(ctx, sc, vOpt, highlights) {
    const aOligo = typeAlpha(highlights, 'oligodendrocyte');
    const aMyelin = typeAlpha(highlights, 'myelin');
    const alpha = Math.max(aOligo, aMyelin);
    ctx.save();
    ctx.globalAlpha *= alpha;

    // 視野邊緣未被局部寡突膠細胞認領的髓鞘節段
    if (sc.orphans && sc.orphans.bbox) {
      C.drawSilhouette(ctx, sc.orphans.body, C.PAL.oligo.base, vOpt.o, 0);
      ctx.save();
      ctx.clip(sc.orphans.body);
      C.strokeShading(ctx, sc.orphans.shade, C.PAL.oligo, vOpt.detail);
      ctx.restore();
    }

    // 寡突膠質細胞：本體 + 支臂 + 髓鞘節段為「同一連續 Path2D 剪影」！
    for (const o of sc.oligos) {
      C.drawGlia(ctx, o, C.PAL.oligo, vOpt);
      C.drawNucleus(ctx, o.nucleus.x, o.nucleus.y, o.nucleus.rx, o.nucleus.ry, o.nucleus.rot, C.PAL.oligo.nucleus, vOpt.o * 0.55, '#072f54');
    }

    // 在高倍率下繪製髓鞘節段兩端的螺旋包裹層紋 (Paranodal loops)
    if (vOpt.detail2) {
      ctx.strokeStyle = 'rgba(20, 55, 85, 0.55)';
      ctx.lineWidth = 0.75;
      for (const n of sc.neurons) {
        if (!n.axon) continue;
        for (const p of n.axon.paths) {
          for (const it of p.internodes) {
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
      }
    }
    ctx.restore();
  }

  /* ---------------- 突觸超微結構 (Zoom LOD) ---------------- */
  function drawSynapseUltrastructure(ctx, sc, sim, zoom) {
    const microA = U.smoothstep(1.85, 3.1, zoom);
    if (microA <= 0.02) return;

    ctx.save();
    for (const syn of sc.synapses) {
      const b = syn.bouton, c = syn.contact;
      const dx = c.x - b.x, dy = c.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;
      const wx = -uy, wy = ux;

      ctx.save();
      ctx.globalAlpha = microA;

      // 突觸後緻密區 (Postsynaptic Density, PSD) 與受體
      const psdCol = syn.bound > 0.08
        ? (syn.excit ? '#ff6d00' : '#00b0ff')
        : (syn.excit ? '#6a1b9a' : '#1565c0');
      ctx.strokeStyle = psdCol;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c.x + wx * 3.4, c.y + wy * 3.4);
      ctx.lineTo(c.x - wx * 3.4, c.y - wy * 3.4);
      ctx.stroke();

      // 受體小通道顆粒
      for (let r = -2; r <= 2; r++) {
        const rx = c.x + wx * r * 1.45 - ux * 0.4;
        const ry = c.y + wy * r * 1.45 - uy * 0.4;
        ctx.fillStyle = syn.bound > 0.1 ? '#ffea00' : psdCol;
        ctx.beginPath();
        ctx.arc(rx, ry, 0.62, 0, Math.PI * 2);
        ctx.fill();
      }

      // 突觸前終扣內的突觸囊泡 (Synaptic vesicles)
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

      // DAT 回收轉運體標記（位於突觸前膜兩側）
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

      // 突觸間隙擴散中的神經傳導物質微粒（即使中倍率也可見微光閃動）
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

  /* ---------------- 動作電位、跳躍傳導、樹突 EPSP/IPSP 與級聯擴散視覺化 ---------------- */
  function drawSignals(ctx, sc, sim) {
    if (!sim.enabled) return;
    ctx.save();

    // 1. 胞體放電擴散漣漪波 (Soma Firing Ripples)
    for (const rp of sim.somaRipples) {
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

    // 2. 軸突動作電位與蘭氏結跳躍傳導 (Saltatory Conduction)
    for (const sp of sim.spikes) {
      const tau = sim.T - sp.t0;
      const ax = sp.neuron.axon;
      if (!ax) continue;
      const colCore = sp.excit ? '#fffde7' : '#f3e5f5';
      const colGlow = sp.excit ? 'rgba(255, 179, 0, 0.88)' : 'rgba(156, 39, 176, 0.85)';
      const colOuter = sp.excit ? 'rgba(255, 111, 0, 0.35)' : 'rgba(103, 58, 183, 0.35)';

      for (const path of ax.paths) {
        const sNow = C.sAtTime(path, tau);
        if (sNow >= 0 && sNow <= path.len) {
          const P = U.pointAtS(path.pts, path.cum, sNow);
          const sTail = Math.max(0, sNow - 28);
          const tail = U.subPolyline(path.pts, path.cum, sTail, sNow, 4);

          // 電位拖尾光弧
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

          // 脈衝前端亮核
          ctx.fillStyle = colOuter;
          ctx.beginPath(); ctx.arc(P.x, P.y, 6.8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = colGlow;
          ctx.beginPath(); ctx.arc(P.x, P.y, 4.0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = colCore;
          ctx.beginPath(); ctx.arc(P.x, P.y, 2.0, 0, Math.PI * 2); ctx.fill();
        }

        // 蘭氏結跳躍放電閃光（Na+ 通道叢集再生電位）
        for (const ndS of path.nodes) {
          const dtNode = tau - C.timeAtS(path, ndS);
          if (dtNode >= 0 && dtNode < 0.16) {
            const k = 1 - dtNode / 0.16;
            const NP = U.pointAtS(path.pts, path.cum, ndS);
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
    }

    // 3. 突觸後樹突電位（EPSP 暖金波向胞體匯聚 ／ IPSP 冰藍抑制波）
    for (const psp of sim.psps) {
      const prog = U.clamp((sim.T - psp.t0) / psp.dur, 0, 1);
      const sNow = prog * psp.syn.psLen;
      const P = U.pointAtS(psp.syn.psPts, psp.syn.psCum, sNow);
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
    }

    // 4. 胞體膜電位閾值積分環（清楚看見亞閾值 EPSP 累加到 100% 觸發下一波擴散！）
    for (const n of sc.real) {
      if (Math.abs(n.V) > 0.08) {
        const ratio = U.clamp(Math.abs(n.V), 0, 1);
        ctx.strokeStyle = n.V > 0 ? 'rgba(230, 81, 0, 0.85)' : 'rgba(2, 119, 189, 0.82)';
        ctx.lineWidth = 2.3;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 4.2, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
        ctx.stroke();
      }
      // 咖啡因受體保護虛線環
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
  function drawWastes(ctx, sim, vOpt) {
    for (const w of sim.wastes) {
      ctx.save();
      ctx.strokeStyle = INK;
      ctx.lineWidth = vOpt.o * 0.6;
      if (w.type === 'adenosine') {
        ctx.fillStyle = '#ab47bc';
        ctx.beginPath(); ctx.arc(w.x, w.y, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (w.type === 'amyloid') {
        // 不規則聚集斑塊
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
      ctx.restore();
    }
  }

  /* ---------------- 螢幕空間自動避碰教科書引線標籤 ---------------- */
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

  function drawMicroLabelsScreen(ctx, sc, sim, worldToScreen, width, height, microZoom, showLabels, safeBounds) {
    const minX = safeBounds ? safeBounds.left : 16;
    const maxX = safeBounds ? safeBounds.right : width - 16;
    // 1. 若有正在進行或剛完成的點擊級聯波，顯示 G0 → G1 → G2 擴散階層徽章
    if (sim.enabled && sim.activeWave && (sim.T - sim.activeWave.startT) < 4.5) {
      for (const n of sc.real) {
        if (!sim.activeWave.recruited.has(n.id)) continue;
        const sp = worldToScreen(n.x, n.y - n.r - 8);
        if (sp.x < minX + 20 || sp.x > maxX - 20 || sp.y < 70 || sp.y > height - 56) continue;
        const gen = n.waveGen;
        const tag = gen === 0 ? '⚡ 起始激發 (G0)' : `↳ 第 ${gen} 階擴散 (G${gen})`;
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

    if (!showLabels) return;
    const anchors = collectSceneAnchors(sc, microZoom);
    const placed = [];

    ctx.save();
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

      // 簡易避碰排斥
      for (let iter = 0; iter < 5; iter++) {
        for (const q of placed) {
          const ox = (bw + q.bw) / 2 + 8 - Math.abs(lx - q.lx);
          const oy = (bh + q.bh) / 2 + 6 - Math.abs(ly - q.ly);
          if (ox > 0 && oy > 0) {
            ly += (ly >= q.ly ? 1 : -1) * (oy + 2);
          }
        }
        ly = U.clamp(ly, 78 + bh / 2, height - 52 - bh / 2);
      }

      // 若與已放標籤仍重疊則略過，保持版面乾淨如教科書
      const overlaps = placed.some((q) => Math.abs(lx - q.lx) < (bw + q.bw) / 2 + 4 && Math.abs(ly - q.ly) < (bh + q.bh) / 2 + 3);
      if (overlaps) continue;
      placed.push({ lx, ly, bw, bh });

      const edgeX = lx > p.x ? lx - bw / 2 : lx + bw / 2;
      const elbowX = edgeX + (lx > p.x ? -10 : 10);

      // 引線白暈 + 墨線
      ctx.strokeStyle = 'rgba(255, 250, 236, 0.85)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(elbowX, ly);
      ctx.lineTo(edgeX, ly);
      ctx.stroke();

      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(elbowX, ly);
      ctx.lineTo(edgeX, ly);
      ctx.stroke();

      // 錨點小圓點
      ctx.fillStyle = '#fff8e7';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 羊皮紙名牌膠囊
      ctx.fillStyle = 'rgba(255, 251, 240, 0.92)';
      ctx.strokeStyle = 'rgba(36, 24, 15, 0.78)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(lx - bw / 2, ly - bh / 2, bw, bh, 6);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = INK;
      ctx.font = '700 11.5px "Noto Serif TC", "Microsoft JhengHei", serif';
      ctx.fillText(a.title, lx, ly - 3);
      ctx.fillStyle = '#6d4c3d';
      ctx.font = 'italic 600 9.5px Georgia, serif';
      ctx.fillText(a.sub, lx, ly + 10);
    }
    ctx.restore();
  }

  /* =========================================================================
   * 繪製整張顯微組織插畫圖版 (World Space: -850..850 x -560..560)
   * ========================================================================= */
  function drawMicroScene(ctx, sc, sim, opt) {
    const zoom = opt.microZoom;
    const isNissl = opt.stain === 'nissl';
    const highlights = opt.highlights;

    // 線條粗細隨縮放微調，保持手繪墨線質感不糊不刺
    const o = U.clamp(1.28 / Math.pow(Math.max(0.6, zoom), 0.28), 0.62, 1.55);
    const vOpt = {
      o,
      shadow: zoom < 2.2 ? 5 : 0,
      detail: zoom > 0.65,
      detail2: zoom > 1.35,
      spines: zoom > 1.15,
      signals: sim.enabled,
      T: sim.T
    };

    ctx.save();

    // 1. 圖版紙張立體外陰影與撕裂邊緣剪裁
    ctx.save();
    ctx.shadowColor = 'rgba(48, 28, 12, 0.34)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = isNissl ? '#e8eef5' : '#f4ddb0';
    ctx.fill(sc.frame.path);
    ctx.restore();

    ctx.save();
    ctx.clip(sc.frame.path);

    // 2. 暖沙黃腦實質神經氈漸層底圖（對齊 brain_cells 經典插畫暖色調）
    const bgGrad = ctx.createRadialGradient(-120, -90, 40, 0, 60, 1050);
    if (isNissl) {
      bgGrad.addColorStop(0, '#f3effa');
      bgGrad.addColorStop(0.5, '#e2dcf2');
      bgGrad.addColorStop(1, '#cfc8e6');
    } else {
      bgGrad.addColorStop(0, '#fcf0c2');
      bgGrad.addColorStop(0.45, '#ecd198');
      bgGrad.addColorStop(1, '#dcba7b');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-sc.W / 2 - 40, -sc.H / 2 - 40, sc.W + 80, sc.H + 80);

    // 3. 若為側腦室場景，繪製頂部水藍色腦室腔 (CSF)
    if (sc.ventricle) {
      const csfG = ctx.createLinearGradient(0, -sc.H / 2, 0, -sc.H / 2 + 260);
      csfG.addColorStop(0, '#9ac6ea');
      csfG.addColorStop(1, '#deeffc');
      ctx.fillStyle = csfG;
      ctx.fill(sc.ventricle);
    }

    // 4. 背景無髓鞘神經氈細纖維與點描顆粒
    ctx.strokeStyle = isNissl ? 'rgba(95, 70, 145, 0.14)' : 'rgba(128, 86, 38, 0.14)';
    ctx.lineWidth = 1.0;
    ctx.stroke(sc.fibers);

    ctx.fillStyle = isNissl ? 'rgba(85, 65, 130, 0.14)' : 'rgba(120, 78, 30, 0.15)';
    for (const st of sc.stipple) {
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. 腦脊髓液／類淋巴流場微粒
    for (const p of sim.csfParticles) {
      ctx.fillStyle = sim.isSleeping ? 'rgba(25, 118, 210, 0.36)' : 'rgba(255, 255, 255, 0.32)';
      ctx.beginPath();
      if (sim.isSleeping) ctx.roundRect(p.x, p.y, 2.6, p.r * 5.5, 1.5);
      else ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. 室管膜細胞層
    ctx.save();
    ctx.globalAlpha *= typeAlpha(highlights, 'ependyma');
    drawEpendymalLayer(ctx, sc, sim, vOpt);
    ctx.restore();

    // 7. 3D 剖面微血管與流動雙凹紅血球
    ctx.save();
    ctx.globalAlpha *= typeAlpha(highlights, 'capillary');
    drawVessels(ctx, sc, sim, vOpt);
    ctx.restore();

    // 8. 綠色星形膠質細胞與環抱血管的寬扁終足（連續輪廓，支援睡眠收縮）
    ctx.save();
    ctx.globalAlpha *= typeAlpha(highlights, 'astrocyte');
    for (const a of sc.astros) {
      ctx.save();
      const s = a.baseScale || 1;
      if (Math.abs(s - 1) > 0.005) {
        ctx.translate(a.x, a.y);
        ctx.scale(s, s);
        ctx.translate(-a.x, -a.y);
      }
      C.drawGlia(ctx, a, C.PAL.astro, vOpt);
      C.drawNucleus(ctx, a.nucleus.x, a.nucleus.y, a.nucleus.rx, a.nucleus.ry, a.nucleus.rot, C.PAL.astro.nucleus, vOpt.o * 0.55, '#254a0b');
      ctx.restore();
    }
    ctx.restore();

    // 9. 神經元（胞體、錐形樹突、樹突棘、軸突丘、側枝、突觸前終扣 —— 單一無縫連續剪影！）
    ctx.save();
    ctx.globalAlpha *= typeAlpha(highlights, 'neuron');
    for (const n of sc.neurons) {
      C.drawNeuron(ctx, n, vOpt);
    }
    ctx.restore();

    // 10. 寡突膠質細胞與立體冰藍髓鞘套管（包覆在連續軸突上，露出蘭氏結！）
    drawOligosAndMyelin(ctx, sc, vOpt, highlights);

    // 11. 突觸間隙超微結構（囊泡、傳導物質擴散、DAT 轉運體、PSD 受體）
    drawSynapseUltrastructure(ctx, sc, sim, zoom);

    // 12. 訊號傳導與跨細胞級聯擴散動畫（可 Toggle 開關）
    if (opt.showSignals) {
      drawSignals(ctx, sc, sim);
    }

    // 13. 代謝廢物與深酒紅多刺微膠細胞（巡邏吞噬）
    drawWastes(ctx, sim, vOpt);

    ctx.save();
    ctx.globalAlpha *= typeAlpha(highlights, 'microglia');
    for (const mg of sc.micro) {
      ctx.save();
      ctx.translate(mg.x, mg.y);
      ctx.rotate(mg.rot);
      const pulse = 1 + (mg.eat > 0 ? Math.sin(mg.eat * 16) * 0.16 : 0);
      ctx.scale(pulse, pulse);
      C.drawGlia(ctx, mg, C.PAL.micro, vOpt, { noSoma: true });
      C.somaGlow(ctx, 0, 0, 8, C.PAL.micro, 1.8);
      C.drawNucleus(ctx, 0, 0, 4.6, 3.1, 0.15, C.PAL.micro.nucleus, vOpt.o * 0.55, null);
      ctx.restore();
    }
    ctx.restore();

    // 14. 點選鎖定物件的高亮指示框
    if (opt.selected) {
      const sel = opt.selected;
      const pulse = 1 + Math.sin(sim.T * 5) * 0.08;
      ctx.save();
      ctx.strokeStyle = '#d84315';
      ctx.lineWidth = 2.4 / Math.max(0.7, Math.sqrt(zoom));
      ctx.beginPath();
      ctx.arc(sel.x, sel.y, (sel.r + 9) * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#fff8e7';
      ctx.lineWidth = 1.4 / Math.max(0.7, Math.sqrt(zoom));
      ctx.beginPath();
      ctx.arc(sel.x, sel.y, sel.r + 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // 結束 frame clip

    // 圖版外框手繪雙重墨線
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    ctx.stroke(sc.frame.path);

    ctx.restore();
  }

  BS.render = {
    drawMicroScene,
    drawMicroLabelsScreen
  };
})();
