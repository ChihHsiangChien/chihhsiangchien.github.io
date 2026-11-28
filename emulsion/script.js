(() => {
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const actionBtn = document.getElementById('actionBtn');
  const stirBtn = document.getElementById('stirBtn');
  const directLipaseBtn = document.getElementById('directLipaseBtn');
  const replayBtn = document.getElementById('replayBtn');
  const stepBadge = document.getElementById('stepBadge');
  const stepText = document.getElementById('stepText');
  const surfaceMetric = document.getElementById('surfaceMetric');
  const changeTypeMetric = document.getElementById('changeTypeMetric');
  const digestPercent = document.getElementById('digestPercent');
  const digestFill = document.getElementById('digestFill');

  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Colors
  const C = {
    oil: getCSS('--oil', '#F7C948'),
    oilStroke: '#DDA726',
    head: getCSS('--oil-ring', '#E85D04'),
    tail: getCSS('--oil-tail', '#3D405B'),
    water: getCSS('--water', '#08C4D4'),
    lipase: getCSS('--lipase', '#16A34A'),
    glycerol: getCSS('--glycerol', '#7C3AED'),
    fattyAcid: getCSS('--fatty-acid', '#F97316'),
    ink: getCSS('--ink', '#111111')
  };

  // Layout geometry
  let W = 800, H = 540;
  let inner = { x: 0, y: 0, w: 0, h: 0, r: 24 };
  let mag = { x: 0, y: 0, r: 0, side: 'right' };

  // State & particles
  // Phases:
  // 'before'             - oil layer & large drops on top
  // 'stir_no_emul'       - vigorous bottle shaking without emulsifier, then coalescing back
  // 'adding_emulsifier'  - dropper drops surfactant, molecules attach to interface & large drops
  // 'ready_to_stir'      - surfactant attached, waiting for user to shake
  // 'emulsifying'        - vigorous bottle shaking breaks drops into small micelles
  // 'after'              - stable oil-in-water emulsion with Brownian motion & repulsion
  let phase = 'before';
  let phaseStart = 0;
  let rafId = null;

  let largeDrops = [];
  let smallDrops = [];
  let animDrops = [];
  let tempDrops = [];     // for stir_no_emul
  let dropParticles = []; // falling droplets from dropper
  let lipaseParticles = []; // green lipase enzymes
  let productParticles = []; // glycerol & fatty acids
  let shakeState = { dx: 0, dy: 0, rot: 0, intensity: 0, phase: 0 };

  function getCSS(varName, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
  }

  function updateStatus(badge, text) {
    if (stepBadge) stepBadge.textContent = badge;
    if (stepText) stepText.textContent = text;
  }

  function updateMetrics(surface, changeType, pct, barColor = C.lipase) {
    if (surfaceMetric) surfaceMetric.textContent = surface;
    if (changeTypeMetric) changeTypeMetric.textContent = changeType;
    const clamped = Math.round(clamp(pct, 0, 100));
    if (digestPercent) digestPercent.textContent = `${clamped}%`;
    if (digestFill) {
      digestFill.style.width = `${clamped}%`;
      digestFill.style.backgroundColor = barColor;
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(320, Math.floor(rect.width));
    H = Math.max(280, Math.floor(rect.height));
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const margin = 28;
    const gap = 32;
    const topSpace = 38;
    let trySide = W >= 680;

    if (trySide) {
      const bh = Math.min(470, H - margin - topSpace);
      const bw = Math.min(390, Math.max(250, Math.floor(W * 0.45) - margin));
      inner.w = bw;
      inner.h = bh;
      inner.x = margin + 14;
      inner.y = topSpace + (H - topSpace - margin - bh) / 2;

      const freeW = W - (inner.x + inner.w) - gap - margin;
      const rCandidate = Math.min(Math.floor(bh * 0.42), Math.floor(freeW * 0.48));
      if (rCandidate >= 75) {
        mag.side = 'right';
        mag.r = rCandidate;
        mag.x = inner.x + inner.w + gap + mag.r;
        mag.y = inner.y + inner.h * 0.5;
      } else {
        trySide = false;
      }
    }

    if (!trySide) {
      const availH = H - topSpace - margin;
      const bh = Math.max(180, Math.floor(availH * 0.55));
      const bw = Math.min(400, W - margin * 2);
      inner.w = bw;
      inner.h = bh;
      inner.x = (W - bw) / 2;
      inner.y = topSpace;

      const freeH = H - (inner.y + inner.h) - gap - margin;
      const rBottom = Math.max(58, Math.min(Math.floor(inner.w * 0.3), Math.floor(freeH * 0.5)));
      mag.side = 'bottom';
      mag.r = rBottom;
      mag.x = inner.x + inner.w / 2;
      mag.y = inner.y + inner.h + gap + mag.r - 6;
    }

    setupBeforeData();
    if (phase === 'after' || phase === 'emulsifying') {
      makeSmallTargets();
    }
  }

  function setupBeforeData() {
    const desktop = W >= 600;
    const count = desktop ? 24 : 16;
    const rMin = 10, rMax = 17;
    const topBand = Math.max(42, inner.h * 0.19);

    largeDrops = [];
    let tries = 0;
    while (largeDrops.length < count && tries < 3000) {
      tries++;
      const r = rand(rMin, rMax);
      const x = clamp(inner.x + r + 6 + Math.random() * (inner.w - 2 * r - 12), inner.x + r + 4, inner.x + inner.w - r - 4);
      const y = clamp(inner.y + r + 10 + Math.random() * (topBand - 2 * r - 14), inner.y + r + 8, inner.y + topBand - r - 4);
      const d = { x, y, r };
      if (!collidesAny(d, largeDrops, 2.5)) {
        d.baseX = d.x;
        d.baseY = d.y;
        d.theta = Math.random() * Math.PI * 2;
        d.wobble = rand(0.5, 1.2);
        largeDrops.push(d);
      }
    }
  }

  function makeSmallTargets() {
    const desktop = W >= 600;
    const targetCount = desktop ? 95 : 65;
    const rMin = 4.2, rMax = 6.8;
    const margin = 10;
    const targets = [];
    let attempts = 0;
    while (targets.length < targetCount && attempts < 6000) {
      attempts++;
      const r = rand(rMin, rMax);
      const x = rand(inner.x + r + margin, inner.x + inner.w - r - margin);
      const y = rand(inner.y + r + margin, inner.y + inner.h - r - margin);
      const d = {
        x, y, r,
        vx: rand(-0.35, 0.35),
        vy: rand(-0.35, 0.35),
        theta: Math.random() * Math.PI * 2
      };
      if (!collidesAny(d, targets, 4)) targets.push(d);
    }
    smallDrops = targets;
  }

  // Compute bottle shake offset (dx, dy, rotation) given normalized shake time [0..1]
  function computeShake(shakeT) {
    if ( prefersReduced || shakeT <= 0 || shakeT >= 1) {
      return { dx: 0, dy: 0, rot: 0, intensity: 0, phase: 0 };
    }
    // Envelope ramps up quickly, holds vigorous shaking, then smoothly damps down
    const env = Math.sin(shakeT * Math.PI) * Math.min(1, (1 - shakeT) * 2.8);
    const freq = shakeT * Math.PI * 16; // ~8 full vigorous shakes
    const dx = Math.sin(freq) * 18 * env;
    const dy = Math.cos(freq * 2) * 9 * env;
    const rot = Math.sin(freq - 0.3) * 0.065 * env; // ~3.7 deg tilt
    return { dx, dy, rot, intensity: env, phase: freq };
  }

  // --- Phase Controllers ---

  function startStirWithoutEmulsifier() {
    if (phase !== 'before') return;
    cancelAnimationFrame(rafId);
    phase = 'stir_no_emul';
    phaseStart = performance.now();

    actionBtn.disabled = true;
    stirBtn.disabled = true;
    directLipaseBtn.disabled = true;
    replayBtn.disabled = false;

    updateStatus('對照實驗', '未加膽汁直接搖晃：搖晃時油滴暫時衝散，停止後因表面張力大迅速聚並浮回上層');
    updateMetrics('1×（大油滴）', '物理混合失敗', 0);

    tempDrops = [];
    largeDrops.forEach(ld => {
      const splits = 4;
      for (let i = 0; i < splits; i++) {
        const subR = ld.r / Math.sqrt(splits);
        const scatterX = clamp(inner.x + subR + 12 + Math.random() * (inner.w - 2 * subR - 24), inner.x + subR + 6, inner.x + inner.w - subR - 6);
        const scatterY = clamp(inner.y + inner.h * rand(0.15, 0.85), inner.y + subR + 10, inner.y + inner.h - subR - 10);
        tempDrops.push({
          sx: ld.x,
          sy: ld.y,
          mx: scatterX,
          my: scatterY,
          tx: ld.x,
          ty: ld.y,
          r0: ld.r,
          rMid: subR,
          seed: Math.random() * Math.PI * 2,
          px: ld.x,
          py: ld.y,
          pr: ld.r
        });
      }
    });

    const duration = prefersReduced ? 400 : 3400;

    function step(now) {
      const t = clamp((now - phaseStart) / duration, 0, 1);

      // 0% - 45%: Vigorous bottle shaking scatters droplets with inertia sloshing
      // 45% - 100%: Shaking stops, droplets buoyantly rise and coalesce back
      const shakePortion = 0.45;
      if (t < shakePortion) {
        const st = t / shakePortion;
        shakeState = computeShake(st);
        const disperse = easeOutCubic(st);

        tempDrops.forEach(d => {
          // Sloshing inertia response inside the shaking bottle
          const sloshX = -Math.cos(shakeState.phase + d.seed * 0.5) * 26 * shakeState.intensity;
          const sloshY = Math.sin(shakeState.phase * 1.5 + d.seed) * 20 * shakeState.intensity;
          const bx = lerp(d.sx, d.mx, disperse) + sloshX;
          const by = lerp(d.sy, d.my, disperse) + sloshY;
          d.px = clamp(bx, inner.x + d.rMid + 4, inner.x + inner.w - d.rMid - 4);
          d.py = clamp(by, inner.y + d.rMid + 4, inner.y + inner.h - d.rMid - 4);
          d.pr = lerp(d.r0 * 0.75, d.rMid, disperse);
        });
      } else {
        shakeState = { dx: 0, dy: 0, rot: 0, intensity: 0, phase: 0 };
        const ct = easeInOutQuad((t - shakePortion) / (1 - shakePortion));
        tempDrops.forEach(d => {
          const wobble = Math.sin(ct * Math.PI * 4 + d.seed) * (1 - ct) * 6;
          d.px = clamp(lerp(d.mx, d.tx, ct) + wobble, inner.x + d.r0 + 4, inner.x + inner.w - d.r0 - 4);
          d.py = lerp(d.my, d.ty, ct);
          d.pr = lerp(d.rMid, d.r0 * 0.88, ct);
        });
      }

      drawScene(t);

      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        shakeState = { dx: 0, dy: 0, rot: 0, intensity: 0, phase: 0 };
        phase = 'before';
        actionBtn.disabled = false;
        stirBtn.disabled = false;
        directLipaseBtn.disabled = false;
        updateStatus('步驟 1 / 5', '油水再度分離！請點「1. 加入膽汁」或「未乳化直接加胰液」比較差異');
        updateMetrics('1×（大油滴）', '尚未反應', 0);
        rafId = requestAnimationFrame(loopBefore);
      }
    }

    rafId = requestAnimationFrame(step);
  }

  function startAddingLipase(emulsified) {
    if (emulsified && phase !== 'after') return;
    if (!emulsified && phase !== 'before') return;

    cancelAnimationFrame(rafId);
    phase = emulsified ? 'adding_lipase_emulsified' : 'adding_lipase_raw';
    phaseStart = performance.now();
    shakeState = { dx: 0, dy: 0, rot: 0, intensity: 0, phase: 0 };

    actionBtn.disabled = true;
    stirBtn.disabled = true;
    directLipaseBtn.disabled = true;
    replayBtn.disabled = false;

    if (emulsified) {
      updateStatus('步驟 5 / 5', '加入胰液（胰脂酶）：酵素迅速接觸大量微胞表面，將三酸甘油酯高效率分解為「甘油＋脂肪酸」');
      updateMetrics('~10×（微小微胞）', '化學分解中（胰脂酶）', 0, C.lipase);
    } else {
      updateStatus('對照實驗（未乳化）', '未加膽汁直接加胰液：胰脂酶只能停在大油層表面作用，無法進入大油塊內部，分解效率極低！');
      updateMetrics('1×（表面積過小）', '化學分解受阻', 0, '#f59e0b');
    }

    const dropperX = inner.x + inner.w * 0.5;
    dropParticles = [];
    for (let i = 0; i < 18; i++) {
      dropParticles.push({
        delay: i * 0.025,
        x0: dropperX + rand(-8, 8),
        y0: inner.y - 16,
        tx: inner.x + inner.w * rand(0.15, 0.85),
        ty: emulsified ? inner.y + inner.h * rand(0.18, 0.82) : inner.y + inner.h * rand(0.08, 0.28),
        r: rand(3.5, 5)
      });
    }

    lipaseParticles = [];
    const enzymeCount = emulsified ? 28 : 22;
    for (let i = 0; i < enzymeCount; i++) {
      lipaseParticles.push({
        x: inner.x + inner.w * rand(0.1, 0.9),
        y: emulsified ? inner.y + inner.h * rand(0.12, 0.9) : inner.y + inner.h * rand(0.2, 0.85),
        vx: rand(-0.6, 0.6),
        vy: rand(-0.6, 0.6),
        rot: rand(0, Math.PI * 2),
        vrot: rand(-0.04, 0.04)
      });
    }

    productParticles = [];
    const prodCount = emulsified ? 75 : 14;
    for (let i = 0; i < prodCount; i++) {
      const isGlycerol = i % 4 === 0; // 1 glycerol : 3 fatty acids ratio!
      const anchor = emulsified && smallDrops.length
        ? smallDrops[i % smallDrops.length]
        : (largeDrops[i % Math.max(1, largeDrops.length)] || { x: inner.x + inner.w * 0.5, y: inner.y + inner.h * 0.16, r: 12 });
      productParticles.push({
        type: isGlycerol ? 'glycerol' : 'fattyAcid',
        appearAt: rand(0.22, 0.88),
        sx: anchor.x + rand(-8, 8),
        sy: emulsified ? anchor.y + rand(-8, 8) : anchor.y + anchor.r + rand(2, 10),
        x: anchor.x,
        y: anchor.y,
        vx: rand(-0.45, 0.45),
        vy: rand(-0.45, 0.45),
        rot: rand(0, Math.PI * 2)
      });
    }

    const duration = prefersReduced ? 350 : 3200;

    function step(now) {
      const t = clamp((now - phaseStart) / duration, 0, 1);
      const maxPct = emulsified ? 96 : 15;
      const curPct = easeOutCubic(clamp((t - 0.15) / 0.85, 0, 1)) * maxPct;
      updateMetrics(
        emulsified ? '~10×（微小微胞）' : '1×（表面積過小）',
        emulsified ? '化學分解：三酸甘油酯 → 甘油＋脂肪酸' : '僅表面微弱分解（受限於表面積）',
        curPct,
        emulsified ? C.lipase : '#f59e0b'
      );

      // Gently move enzymes & emerging products
      for (const e of lipaseParticles) {
        e.x = clamp(e.x + e.vx, inner.x + 10, inner.x + inner.w - 10);
        e.y = clamp(e.y + e.vy, emulsified ? inner.y + 10 : inner.y + inner.h * 0.18, inner.y + inner.h - 10);
        if (e.x <= inner.x + 11 || e.x >= inner.x + inner.w - 11) e.vx *= -1;
        if (e.y <= (emulsified ? inner.y + 11 : inner.y + inner.h * 0.19) || e.y >= inner.y + inner.h - 11) e.vy *= -1;
        e.rot += e.vrot;
      }
      for (const p of productParticles) {
        if (t >= p.appearAt) {
          p.x = clamp(p.x + p.vx, inner.x + 8, inner.x + inner.w - 8);
          p.y = clamp(p.y + p.vy, inner.y + 8, inner.y + inner.h - 8);
          if (p.x <= inner.x + 9 || p.x >= inner.x + inner.w - 9) p.vx *= -1;
          if (p.y <= inner.y + 9 || p.y >= inner.y + inner.h - 9) p.vy *= -1;
        } else {
          p.x = p.sx;
          p.y = p.sy;
        }
      }

      drawScene(t);

      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        phase = emulsified ? 'digested_emulsified' : 'digested_raw';
        if (emulsified) {
          actionBtn.textContent = '已完成分解 (96%)';
          updateStatus('步驟 5 / 5（完成）', '消化完成！經膽汁乳化後，胰液將絕大部分脂質分解成甘油與脂肪酸，便於小腸吸收');
        } else {
          updateStatus('對照結果：消化不良', '未經膽汁乳化，脂質僅表面約 15% 被分解，其餘仍是大油塊漂浮，胰液酵素無法接觸內部！');
        }
        rafId = requestAnimationFrame(() => loopDigested(emulsified));
      }
    }

    rafId = requestAnimationFrame(step);
  }

  function loopDigested(emulsified) {
    if (!emulsified) updateLargeDropsFloat();
    for (const e of lipaseParticles) {
      e.x = clamp(e.x + e.vx, inner.x + 10, inner.x + inner.w - 10);
      e.y = clamp(e.y + e.vy, emulsified ? inner.y + 10 : inner.y + inner.h * 0.18, inner.y + inner.h - 10);
      if (e.x <= inner.x + 11 || e.x >= inner.x + inner.w - 11) e.vx *= -1;
      if (e.y <= (emulsified ? inner.y + 11 : inner.y + inner.h * 0.19) || e.y >= inner.y + inner.h - 11) e.vy *= -1;
      e.rot += e.vrot;
    }
    for (const p of productParticles) {
      p.x = clamp(p.x + p.vx, inner.x + 8, inner.x + inner.w - 8);
      p.y = clamp(p.y + p.vy, inner.y + 8, inner.y + inner.h - 8);
      if (p.x <= inner.x + 9 || p.x >= inner.x + inner.w - 9) p.vx *= -1;
      if (p.y <= inner.y + 9 || p.y >= inner.y + inner.h - 9) p.vy *= -1;
    }
    drawScene(1);
    rafId = requestAnimationFrame(() => loopDigested(emulsified));
  }

  function startAddingEmulsifier() {
    if (phase === 'before') {
      cancelAnimationFrame(rafId);
      phase = 'adding_emulsifier';
      phaseStart = performance.now();
      shakeState = { dx: 0, dy: 0, rot: 0, intensity: 0, phase: 0 };

      actionBtn.disabled = true;
      stirBtn.disabled = true;
      directLipaseBtn.disabled = true;
      replayBtn.disabled = false;

      updateStatus('步驟 2 / 5', '加入膽汁（膽鹽）：膽鹽具「親水端」與「親油端」，自動排列於油水交界面以降低表面張力');
      updateMetrics('1× → 準備乳化', '物理性（膽汁）', 0);

      const dropperX = inner.x + inner.w * 0.5;
      dropParticles = [];
      for (let i = 0; i < 16; i++) {
        dropParticles.push({
          delay: i * 0.035,
          x0: dropperX + rand(-8, 8),
          y0: inner.y - 16,
          tx: inner.x + inner.w * rand(0.15, 0.85),
          ty: inner.y + inner.h * rand(0.05, 0.18),
          r: rand(3.5, 5)
        });
      }

      const duration = prefersReduced ? 200 : 1800;

      function step(now) {
        const t = clamp((now - phaseStart) / duration, 0, 1);
        updateLargeDropsFloat();
        drawScene(t);

        if (t < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          phase = 'ready_to_stir';
          actionBtn.disabled = false;
          actionBtn.textContent = '2. 搖晃混合（物理乳化）';
          updateStatus('步驟 3 / 5', '膽鹽已包覆油水界面！點擊「搖晃混合」將大油塊打散成微胞，增加接觸面積');
          rafId = requestAnimationFrame(loopReadyToStir);
        }
      }

      rafId = requestAnimationFrame(step);
    } else if (phase === 'ready_to_stir') {
      startEmulsifyShake();
    } else if (phase === 'after') {
      startAddingLipase(true);
    }
  }

  function loopReadyToStir() {
    updateLargeDropsFloat();
    drawScene(1);
    rafId = requestAnimationFrame(loopReadyToStir);
  }

  function startEmulsifyShake() {
    if (phase !== 'ready_to_stir') return;
    cancelAnimationFrame(rafId);
    makeSmallTargets();

    // Create multi-stage breakup particles:
    // Each small droplet knows its parent large droplet, an intermediate chaotic slosh path, and its final target
    const sources = largeDrops.map(d => ({ x: d.x, y: d.y, r: d.r }));
    animDrops = smallDrops.map(s => {
      const src = nearestPoint(s, sources);
      return {
        sx: src.x,
        sy: src.y,
        sr: src.r,
        tx: s.x,
        ty: s.y,
        r: s.r,
        seed: Math.random() * Math.PI * 2,
        breakDelay: rand(0.05, 0.35), // staggered breakup during shaking
        px: src.x,
        py: src.y,
        pr: src.r * 0.55
      };
    });

    phase = 'emulsifying';
    phaseStart = performance.now();
    actionBtn.disabled = true;
    stirBtn.disabled = true;

    updateStatus('步驟 3 / 4', '劇烈搖晃混合中：液體上下翻騰衝擊，大油滴不斷碎裂並被乳化劑包覆為微小油滴');

    const duration = prefersReduced ? 300 : 2400;

    function step(now) {
      const t = clamp((now - phaseStart) / duration, 0, 1);
      shakeState = computeShake(t);

      // Overall progression from top oil layer into uniform dispersion
      const mixProgress = easeInOutQuad(t);

      animDrops.forEach(a => {
        const localT = clamp((t - a.breakDelay) / (1 - a.breakDelay), 0, 1);
        const e = easeOutCubic(localT);

        // Strong sloshing & turbulent eddies driven by bottle shaking
        const sloshX = -Math.cos(shakeState.phase + a.seed * 0.7) * 38 * shakeState.intensity;
        const sloshY = Math.sin(shakeState.phase * 1.4 + a.seed) * 32 * shakeState.intensity;

        const basePx = lerp(a.sx, a.tx, e) + sloshX;
        const basePy = lerp(a.sy, a.ty, e) + sloshY;

        a.px = clamp(basePx, inner.x + a.r + 5, inner.x + inner.w - a.r - 5);
        a.py = clamp(basePy, inner.y + a.r + 5, inner.y + inner.h - a.r - 5);
        // Radius transitions from medium broken drop down to fine micelle
        a.pr = lerp(Math.min(a.sr * 0.65, 11), a.r, e);
      });

      drawScene(mixProgress);

      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        shakeState = { dx: 0, dy: 0, rot: 0, intensity: 0, phase: 0 };
        phase = 'after';
        smallDrops.forEach((s, i) => {
          s.x = animDrops[i].px;
          s.y = animDrops[i].py;
        });
        actionBtn.textContent = '3. 加入胰液（胰脂酶分解）';
        actionBtn.disabled = false;
        replayBtn.disabled = false;
        updateStatus('步驟 4 / 5', '膽汁乳化完成（物理變化）：大油滴變成微小微胞，總表面積劇增，但三酸甘油酯分子尚未分解！');
        updateMetrics('~10×（微小微胞）', '物理變化（未斷鍵）', 0);
        rafId = requestAnimationFrame(loopAfter);
      }
    }

    rafId = requestAnimationFrame(step);
  }

  function startAddingLipase(emulsified) {
    if (emulsified && phase !== 'after') return;
    if (!emulsified && phase !== 'before') return;

    cancelAnimationFrame(rafId);
    phase = emulsified ? 'adding_lipase_emulsified' : 'adding_lipase_raw';
    phaseStart = performance.now();
    shakeState = { dx: 0, dy: 0, rot: 0, intensity: 0, phase: 0 };

    actionBtn.disabled = true;
    stirBtn.disabled = true;
    directLipaseBtn.disabled = true;
    replayBtn.disabled = false;

    if (emulsified) {
      updateStatus('步驟 5 / 5', '加入胰液（胰脂酶）：酵素迅速接觸大量微胞表面，將三酸甘油酯高效率分解為「甘油＋脂肪酸」');
      updateMetrics('~10×（微小微胞）', '化學分解中（胰脂酶）', 0, C.lipase);
    } else {
      updateStatus('對照實驗（未乳化）', '未加膽汁直接加胰液：胰脂酶只能停在大油層表面作用，無法進入大油塊內部，分解效率極低！');
      updateMetrics('1×（表面積過小）', '化學分解受阻', 0, '#f59e0b');
    }

    const dropperX = inner.x + inner.w * 0.5;
    dropParticles = [];
    for (let i = 0; i < 18; i++) {
      dropParticles.push({
        delay: i * 0.025,
        x0: dropperX + rand(-8, 8),
        y0: inner.y - 16,
        tx: inner.x + inner.w * rand(0.15, 0.85),
        ty: emulsified ? inner.y + inner.h * rand(0.18, 0.82) : inner.y + inner.h * rand(0.08, 0.28),
        r: rand(3.5, 5)
      });
    }

    lipaseParticles = [];
    const enzymeCount = emulsified ? 28 : 22;
    for (let i = 0; i < enzymeCount; i++) {
      lipaseParticles.push({
        x: inner.x + inner.w * rand(0.1, 0.9),
        y: emulsified ? inner.y + inner.h * rand(0.12, 0.9) : inner.y + inner.h * rand(0.2, 0.85),
        vx: rand(-0.6, 0.6),
        vy: rand(-0.6, 0.6),
        rot: rand(0, Math.PI * 2),
        vrot: rand(-0.04, 0.04)
      });
    }

    productParticles = [];
    const prodCount = emulsified ? 75 : 14;
    for (let i = 0; i < prodCount; i++) {
      const isGlycerol = i % 4 === 0; // 1 glycerol : 3 fatty acids ratio!
      const anchor = emulsified && smallDrops.length
        ? smallDrops[i % smallDrops.length]
        : (largeDrops[i % Math.max(1, largeDrops.length)] || { x: inner.x + inner.w * 0.5, y: inner.y + inner.h * 0.16, r: 12 });
      productParticles.push({
        type: isGlycerol ? 'glycerol' : 'fattyAcid',
        appearAt: rand(0.22, 0.88),
        sx: anchor.x + rand(-8, 8),
        sy: emulsified ? anchor.y + rand(-8, 8) : anchor.y + anchor.r + rand(2, 10),
        x: anchor.x,
        y: anchor.y,
        vx: rand(-0.45, 0.45),
        vy: rand(-0.45, 0.45),
        rot: rand(0, Math.PI * 2)
      });
    }

    const duration = prefersReduced ? 350 : 3200;

    function step(now) {
      const t = clamp((now - phaseStart) / duration, 0, 1);
      const maxPct = emulsified ? 96 : 15;
      const curPct = easeOutCubic(clamp((t - 0.15) / 0.85, 0, 1)) * maxPct;
      updateMetrics(
        emulsified ? '~10×（微小微胞）' : '1×（表面積過小）',
        emulsified ? '化學分解：三酸甘油酯 → 甘油＋脂肪酸' : '僅表面微弱分解（受限於表面積）',
        curPct,
        emulsified ? C.lipase : '#f59e0b'
      );

      // Gently move enzymes & emerging products
      for (const e of lipaseParticles) {
        e.x = clamp(e.x + e.vx, inner.x + 10, inner.x + inner.w - 10);
        e.y = clamp(e.y + e.vy, emulsified ? inner.y + 10 : inner.y + inner.h * 0.18, inner.y + inner.h - 10);
        if (e.x <= inner.x + 11 || e.x >= inner.x + inner.w - 11) e.vx *= -1;
        if (e.y <= (emulsified ? inner.y + 11 : inner.y + inner.h * 0.19) || e.y >= inner.y + inner.h - 11) e.vy *= -1;
        e.rot += e.vrot;
      }
      for (const p of productParticles) {
        if (t >= p.appearAt) {
          p.x = clamp(p.x + p.vx, inner.x + 8, inner.x + inner.w - 8);
          p.y = clamp(p.y + p.vy, inner.y + 8, inner.y + inner.h - 8);
          if (p.x <= inner.x + 9 || p.x >= inner.x + inner.w - 9) p.vx *= -1;
          if (p.y <= inner.y + 9 || p.y >= inner.y + inner.h - 9) p.vy *= -1;
        } else {
          p.x = p.sx;
          p.y = p.sy;
        }
      }

      drawScene(t);

      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        phase = emulsified ? 'digested_emulsified' : 'digested_raw';
        if (emulsified) {
          actionBtn.textContent = '已完成分解 (96%)';
          updateStatus('步驟 5 / 5（完成）', '消化完成！經膽汁乳化後，胰液將絕大部分脂質分解成甘油與脂肪酸，便於小腸吸收');
        } else {
          updateStatus('對照結果：消化不良', '未經膽汁乳化，脂質僅表面約 15% 被分解，其餘仍是大油塊漂浮，胰液酵素無法接觸內部！');
        }
        rafId = requestAnimationFrame(() => loopDigested(emulsified));
      }
    }

    rafId = requestAnimationFrame(step);
  }

  function loopDigested(emulsified) {
    if (!emulsified) updateLargeDropsFloat();
    for (const e of lipaseParticles) {
      e.x = clamp(e.x + e.vx, inner.x + 10, inner.x + inner.w - 10);
      e.y = clamp(e.y + e.vy, emulsified ? inner.y + 10 : inner.y + inner.h * 0.18, inner.y + inner.h - 10);
      if (e.x <= inner.x + 11 || e.x >= inner.x + inner.w - 11) e.vx *= -1;
      if (e.y <= (emulsified ? inner.y + 11 : inner.y + inner.h * 0.19) || e.y >= inner.y + inner.h - 11) e.vy *= -1;
      e.rot += e.vrot;
    }
    for (const p of productParticles) {
      p.x = clamp(p.x + p.vx, inner.x + 8, inner.x + inner.w - 8);
      p.y = clamp(p.y + p.vy, inner.y + 8, inner.y + inner.h - 8);
      if (p.x <= inner.x + 9 || p.x >= inner.x + inner.w - 9) p.vx *= -1;
      if (p.y <= inner.y + 9 || p.y >= inner.y + inner.h - 9) p.vy *= -1;
    }
    drawScene(1);
    rafId = requestAnimationFrame(() => loopDigested(emulsified));
  }

  function updateLargeDropsFloat() {
    const ampX = 0.3;
    const ampY = 0.22;
    const rise = -0.025;
    const topLimit = inner.y + Math.max(10, inner.h * 0.03);
    const bottomLimit = inner.y + Math.max(42, inner.h * 0.22);

    for (const d of largeDrops) {
      d.theta += 0.02 * d.wobble;
      const dx = Math.cos(d.theta) * ampX * d.wobble;
      const dy = Math.sin(d.theta) * ampY * d.wobble + rise;
      d.x = clamp(d.x + dx, inner.x + d.r + 4, inner.x + inner.w - d.r - 4);
      d.y = clamp(d.y + dy, topLimit + d.r, bottomLimit - d.r);
    }
  }

  function loopBefore() {
    updateLargeDropsFloat();
    drawScene(0);
    rafId = requestAnimationFrame(loopBefore);
  }

  function loopAfter() {
    // Brownian motion + soft elastic repulsion between micelles so they never coalesce
    const n = smallDrops.length;
    for (let i = 0; i < n; i++) {
      const s = smallDrops[i];
      s.theta += 0.04 + Math.random() * 0.03;
      s.vx = (s.vx + Math.cos(s.theta) * 0.05) * 0.94;
      s.vy = (s.vy + Math.sin(s.theta) * 0.05) * 0.94;

      for (let j = i + 1; j < n; j++) {
        const o = smallDrops[j];
        const dx = o.x - s.x;
        const dy = o.y - s.y;
        const minDist = (s.r + o.r) * 1.45 + 4;
        const d2 = dx * dx + dy * dy;
        if (d2 < minDist * minDist && d2 > 0.01) {
          const dist = Math.sqrt(d2);
          const force = (minDist - dist) / minDist * 0.18;
          const nx = dx / dist;
          const ny = dy / dist;
          s.vx -= nx * force;
          s.vy -= ny * force;
          o.vx += nx * force;
          o.vy += ny * force;
        }
      }

      s.x += s.vx;
      s.y += s.vy;

      const pad = s.r * 1.4 + 4;
      if (s.x < inner.x + pad) { s.x = inner.x + pad; s.vx *= -0.8; }
      if (s.x > inner.x + inner.w - pad) { s.x = inner.x + inner.w - pad; s.vx *= -0.8; }
      if (s.y < inner.y + pad) { s.y = inner.y + pad; s.vy *= -0.8; }
      if (s.y > inner.y + inner.h - pad) { s.y = inner.y + inner.h - pad; s.vy *= -0.8; }
    }

    drawScene(1);
    rafId = requestAnimationFrame(loopAfter);
  }

  // --- Rendering ---

  function drawScene(animT = 0) {
    ctx.clearRect(0, 0, W, H);

    // Draw dropper if adding bile or lipase
    if (phase === 'adding_emulsifier' || phase === 'adding_lipase_emulsified' || phase === 'adding_lipase_raw') {
      drawDropper(animT, phase === 'adding_emulsifier' ? C.head : C.lipase);
    }

    // Apply bottle shake transform around bottle center
    const bottleCx = inner.x + inner.w * 0.5;
    const bottleCy = inner.y + inner.h * 0.5;

    ctx.save();
    if (shakeState.intensity > 0.001) {
      // Draw motion lines around shaking bottle
      drawShakeMotionLines(bottleCx, bottleCy, shakeState);
      ctx.translate(bottleCx + shakeState.dx, bottleCy + shakeState.dy);
      ctx.rotate(shakeState.rot);
      ctx.translate(-bottleCx, -bottleCy);
    }

    // Outer bottle shadow
    drawBottleShadow();

    // Clip fluid inside bottle
    ctx.save();
    roundedRect(ctx, inner.x, inner.y, inner.w, inner.h, inner.r);
    ctx.clip();

    // Water background
    ctx.fillStyle = C.water;
    ctx.fillRect(inner.x, inner.y, inner.w, inner.h);

    // Dynamic sloshing waves & bubbles when shaking
    if (shakeState.intensity > 0.01) {
      drawSloshWavesAndBubbles(shakeState);
    }

    if (phase === 'before') {
      drawOilFilm(1, 0, shakeState);
      drawDrops(largeDrops, 0);
    } else if (phase === 'stir_no_emul') {
      const filmAlpha = animT < 0.45 ? Math.max(0, 1 - (animT / 0.25)) : ((animT - 0.45) / 0.55);
      drawOilFilm(filmAlpha, 0, shakeState);
      drawDrops(tempDrops.map(d => ({ x: d.px, y: d.py, r: d.pr })), 0);
    } else if (phase === 'adding_emulsifier') {
      const surfAlpha = clamp((animT - 0.25) / 0.75, 0, 1);
      drawOilFilm(1, surfAlpha, shakeState);
      drawFallingSurfactant(animT);
      drawDrops(largeDrops, surfAlpha);
    } else if (phase === 'ready_to_stir') {
      drawOilFilm(1, 1, shakeState);
      drawDrops(largeDrops, 1);
    } else if (phase === 'emulsifying') {
      // Top oil layer breaks apart in waves during early shaking
      const filmAlpha = clamp(1 - animT * 1.6, 0, 1);
      drawOilFilm(filmAlpha, filmAlpha, shakeState);

      const largeAlpha = clamp(1 - animT * 1.8, 0, 1);
      if (largeAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = largeAlpha;
        drawDrops(largeDrops.map(d => ({
          x: d.x - Math.cos(shakeState.phase) * 16 * shakeState.intensity,
          y: d.y + Math.sin(shakeState.phase * 1.3) * 14 * shakeState.intensity,
          r: d.r * largeAlpha
        })), 1);
        ctx.restore();
      }
      drawDrops(animDrops.map(a => ({ x: a.px, y: a.py, r: a.pr })), 1);
    } else if (phase === 'after') {
      drawDrops(smallDrops, 1);
    } else if (phase === 'adding_lipase_emulsified' || phase === 'digested_emulsified') {
      const prog = phase === 'digested_emulsified' ? 1 : animT;
      const micelleScale = clamp(1 - prog * 0.72, 0.28, 1);
      const micelleAlpha = clamp(1 - prog * 0.78, 0.18, 1);
      ctx.save();
      ctx.globalAlpha = micelleAlpha;
      drawDrops(smallDrops.map(s => ({ x: s.x, y: s.y, r: Math.max(2, s.r * micelleScale) })), 1);
      ctx.restore();
      if (phase === 'adding_lipase_emulsified') {
        drawFallingDrops(animT, C.lipase);
      }
      drawLipaseAndProducts(prog);
    } else if (phase === 'adding_lipase_raw' || phase === 'digested_raw') {
      const prog = phase === 'digested_raw' ? 1 : animT;
      drawOilFilm(0.92, 0, shakeState);
      drawDrops(largeDrops.map(d => ({ x: d.x, y: d.y, r: d.r * (1 - prog * 0.08) })), 0);
      if (phase === 'adding_lipase_raw') {
        drawFallingDrops(animT, C.lipase);
      }
      drawLipaseAndProducts(prog);
    }

    ctx.restore(); // end fluid clip

    // Bottle outline
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    roundedRect(ctx, inner.x, inner.y, inner.w, inner.h, inner.r);
    ctx.stroke();

    ctx.restore(); // end bottle shake transform

    // Magnifier micro-view (remains steady so user can clearly observe the microscopic transformation)
    drawMagnifier(animT);
  }

  function drawShakeMotionLines(cx, cy, shake) {
    ctx.save();
    ctx.strokeStyle = `rgba(17, 17, 17, ${0.35 * shake.intensity})`;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';

    const leftX = inner.x - 14 + shake.dx * 0.6;
    const rightX = inner.x + inner.w + 14 + shake.dx * 0.6;
    const arcH = 45;

    // Left motion arcs
    ctx.beginPath();
    ctx.moveTo(leftX, cy - arcH);
    ctx.quadraticCurveTo(leftX - 10, cy, leftX, cy + arcH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(leftX - 7, cy - arcH * 0.65);
    ctx.quadraticCurveTo(leftX - 15, cy, leftX - 7, cy + arcH * 0.65);
    ctx.stroke();

    // Right motion arcs
    ctx.beginPath();
    ctx.moveTo(rightX, cy - arcH);
    ctx.quadraticCurveTo(rightX + 10, cy, rightX, cy + arcH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rightX + 7, cy - arcH * 0.65);
    ctx.quadraticCurveTo(rightX + 15, cy, rightX + 7, cy + arcH * 0.65);
    ctx.stroke();
    ctx.restore();
  }

  function drawSloshWavesAndBubbles(shake) {
    ctx.save();
    const tilt = -Math.sin(shake.phase) * 28 * shake.intensity;

    // Diagonal sloshing wave bands across the liquid
    ctx.fillStyle = `rgba(255, 255, 255, ${0.18 * shake.intensity})`;
    for (let band = 0; band < 3; band++) {
      const baseY = inner.y + inner.h * (0.25 + band * 0.25);
      ctx.beginPath();
      ctx.moveTo(inner.x, baseY + tilt);
      for (let x = 0; x <= inner.w; x += 20) {
        const waveY = baseY + tilt * (1 - (2 * x) / inner.w) + Math.sin(x * 0.05 + shake.phase * 1.5 + band) * 14 * shake.intensity;
        ctx.lineTo(inner.x + x, waveY);
      }
      ctx.lineTo(inner.x + inner.w, baseY - tilt + 28);
      ctx.lineTo(inner.x, baseY + tilt + 28);
      ctx.closePath();
      ctx.fill();
    }

    // Turbulent aeration bubbles during vigorous shaking
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * shake.intensity})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const bx = inner.x + ((i * 67 + Math.sin(shake.phase + i) * 45) % (inner.w - 24)) + 12;
      const by = inner.y + ((i * 53 + Math.cos(shake.phase * 1.2 + i) * 60) % (inner.h - 24)) + 12;
      const br = 2 + (i % 4) * 1.5 * shake.intensity;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBottleShadow() {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    roundedRect(ctx, inner.x + 4, inner.y + 6, inner.w, inner.h, inner.r);
    ctx.fill();
    ctx.restore();
  }

  function drawDropper(t, bulbColor = C.head) {
    const cx = inner.x + inner.w * 0.5;
    const tipY = inner.y - 4;
    ctx.save();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.fillStyle = '#fff';

    ctx.beginPath();
    ctx.moveTo(cx - 6, tipY - 26);
    ctx.lineTo(cx - 3, tipY);
    ctx.lineTo(cx + 3, tipY);
    ctx.lineTo(cx + 6, tipY - 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = bulbColor;
    ctx.beginPath();
    ctx.arc(cx, tipY - 28, 9, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawFallingDrops(t, color) {
    ctx.save();
    ctx.fillStyle = color;
    for (const p of dropParticles) {
      const localT = clamp((t - p.delay) / 0.45, 0, 1);
      if (localT <= 0 || localT >= 1) continue;
      const x = lerp(p.x0, p.tx, localT);
      const y = lerp(p.y0, p.ty, easeOutCubic(localT));
      ctx.beginPath();
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLipaseAndProducts(prog) {
    ctx.save();
    // Draw digestion products (glycerol + fatty acids)
    for (const p of productParticles) {
      if (prog < p.appearAt) continue;
      if (p.type === 'glycerol') {
        ctx.fillStyle = C.glycerol;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.strokeStyle = C.fattyAcid;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.quadraticCurveTo(-2, -3, 2, 0);
        ctx.quadraticCurveTo(5, 3, 8, 0);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Draw green lipase enzymes
    for (const e of lipaseParticles) {
      drawLipaseEnzyme(e.x, e.y, e.rot, 6.5);
    }
    ctx.restore();
  }

  function drawLipaseEnzyme(x, y, rot, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = C.lipase;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    // Pac-man / active-site cleft shape representing enzyme
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, size, 0.45, Math.PI * 2 - 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawFallingSurfactant(t) {
    ctx.save();
    for (const p of dropParticles) {
      const localT = clamp((t - p.delay) / 0.45, 0, 1);
      if (localT <= 0 || localT >= 1) continue;
      const x = lerp(p.x0, p.tx, localT);
      const y = lerp(p.y0, p.ty, easeOutCubic(localT));
      drawSurfactantMolecule(x, y, Math.PI * 0.5, 6, 3.2);
    }
    ctx.restore();
  }

  function drawOilFilm(alpha = 1, surfactantCoverage = 0, shake = { intensity: 0, phase: 0 }) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const filmH = Math.max(18, inner.h * 0.085);
    const sloshAmp = 18 * shake.intensity;

    // Wavy oil layer polygon
    ctx.fillStyle = C.oil;
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(inner.x + inner.w, inner.y);

    const steps = 24;
    for (let i = steps; i >= 0; i--) {
      const ratio = i / steps;
      const x = inner.x + ratio * inner.w;
      const sloshTilt = (ratio - 0.5) * 2 * Math.sin(shake.phase) * sloshAmp;
      const ripple = Math.sin(ratio * Math.PI * 3 + shake.phase * 2) * (sloshAmp * 0.45);
      const y = inner.y + filmH + sloshTilt + ripple;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Interface stroke
    ctx.strokeStyle = C.oilStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const x = inner.x + ratio * inner.w;
      const sloshTilt = (ratio - 0.5) * 2 * Math.sin(shake.phase) * sloshAmp;
      const ripple = Math.sin(ratio * Math.PI * 3 + shake.phase * 2) * (sloshAmp * 0.45);
      const y = inner.y + filmH + sloshTilt + ripple;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Surfactant molecules aligned along oil-water interface
    if (surfactantCoverage > 0.01) {
      ctx.globalAlpha = alpha * surfactantCoverage;
      const stepPx = 16;
      for (let x = inner.x + 12; x < inner.x + inner.w - 12; x += stepPx) {
        const ratio = (x - inner.x) / inner.w;
        const sloshTilt = (ratio - 0.5) * 2 * Math.sin(shake.phase) * sloshAmp;
        const ripple = Math.sin(ratio * Math.PI * 3 + shake.phase * 2) * (sloshAmp * 0.45);
        const y = inner.y + filmH + sloshTilt + ripple + 2.5;
        drawSurfactantMolecule(x, y, -Math.PI / 2, 6, 2.6);
      }
    }
    ctx.restore();
  }

  function drawSurfactantMolecule(hx, hy, tailAngle, tailLen, headR) {
    const tx = hx + Math.cos(tailAngle) * tailLen;
    const ty = hy + Math.sin(tailAngle) * tailLen;

    ctx.strokeStyle = C.tail;
    ctx.lineWidth = Math.max(1.3, headR * 0.55);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.fillStyle = C.head;
    ctx.beginPath();
    ctx.arc(hx, hy, headR, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDrops(arr, surfactantAlpha = 0) {
    for (const d of arr) {
      if (d.r <= 0.5) continue;
      ctx.fillStyle = C.oil;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();

      if (surfactantAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha *= surfactantAlpha;
        const headR = clamp(d.r * 0.28, 1.5, 3.2);
        const headDist = d.r + headR * 0.85;
        const tailLen = Math.min(d.r * 0.65, headR * 2.4);
        const circ = 2 * Math.PI * headDist;
        const count = clamp(Math.round(circ / (headR * 2.5)), 6, 16);

        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          const hx = d.x + Math.cos(a) * headDist;
          const hy = d.y + Math.sin(a) * headDist;
          drawSurfactantMolecule(hx, hy, a + Math.PI, tailLen, headR);
        }
        ctx.restore();
      }
    }
  }

  function drawMagnifier(animT) {
    const roiBefore = largestDropPoint() || { x: inner.x + inner.w * 0.5, y: inner.y + inner.h * 0.12 };
    let roiAfter = roiBefore;
    if (smallDrops.length) {
      const target = { x: inner.x + inner.w * 0.5, y: inner.y + inner.h * 0.5 };
      roiAfter = nearestPoint(target, smallDrops);
    }

    let shrinkProgress = 0;
    if (phase === 'emulsifying') shrinkProgress = easeOutCubic(clamp(animT, 0, 1));
    else if (phase === 'after' || phase === 'adding_lipase_emulsified' || phase === 'digested_emulsified') shrinkProgress = 1;

    // Follow bottle shake slightly for the ROI target ring
    const roiX = lerp(roiBefore.x, roiAfter.x, shrinkProgress) + shakeState.dx * 0.8;
    const roiY = lerp(roiBefore.y, roiAfter.y, shrinkProgress) + shakeState.dy * 0.8;

    ctx.save();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(roiX, roiY, lerp(18, 10, shrinkProgress), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const dirX = mag.x - roiX, dirY = mag.y - roiY;
    const len = Math.hypot(dirX, dirY) || 1;
    const nx = dirX / len, ny = dirY / len;
    const edgeX = mag.x - nx * (mag.r - 4);
    const edgeY = mag.y - ny * (mag.r - 4);

    ctx.beginPath();
    ctx.moveTo(roiX, roiY);
    ctx.lineTo(edgeX, edgeY);
    ctx.stroke();
    ctx.restore();

    // Lens body
    ctx.save();
    ctx.fillStyle = C.water;
    ctx.beginPath();
    ctx.arc(mag.x, mag.y, mag.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(mag.x, mag.y, mag.r - 4, 0, Math.PI * 2);
    ctx.clip();

    const R0 = mag.r * 0.56;
    const R1 = mag.r * 0.30;
    let r = lerp(R0, R1, shrinkProgress);

    let surfCoverage = 0;
    if (phase === 'adding_emulsifier') {
      surfCoverage = clamp((animT - 0.2) / 0.75, 0, 1);
    } else if (phase === 'ready_to_stir' || phase === 'emulsifying' || phase === 'after' || phase === 'adding_lipase_emulsified') {
      surfCoverage = 1;
    } else if (phase === 'digested_emulsified') {
      surfCoverage = 0.25;
    }

    const digestProg =
      phase === 'adding_lipase_emulsified' ? easeOutCubic(clamp(animT, 0, 1)) :
      phase === 'digested_emulsified' ? 1 :
      phase === 'adding_lipase_raw' ? easeOutCubic(clamp(animT, 0, 1)) :
      phase === 'digested_raw' ? 1 : 0;

    if (phase === 'adding_lipase_emulsified' || phase === 'digested_emulsified') {
      r = lerp(R1, mag.r * 0.08, digestProg);
      surfCoverage = lerp(1, 0.2, digestProg);
    }

    // Subtle vibration inside magnifier during shaking
    const microJoltX = shakeState.dx * 0.22;
    const microJoltY = shakeState.dy * 0.22;
    const mCx = mag.x + microJoltX;
    const mCy = mag.y + microJoltY;

    // Oil core
    if (!(phase === 'digested_emulsified')) {
      ctx.save();
      if (phase === 'adding_lipase_emulsified') ctx.globalAlpha = 1 - digestProg * 0.8;
      ctx.fillStyle = C.oil;
      ctx.beginPath();
      ctx.arc(mCx, mCy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.oilStroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Show intact Triglyceride molecules inside oil core!
      const molOffsets = shrinkProgress > 0.5
        ? [{ dx: -r * 0.28, dy: 0 }, { dx: r * 0.28, dy: 0 }]
        : [{ dx: -r * 0.36, dy: -r * 0.25 }, { dx: r * 0.32, dy: -r * 0.22 }, { dx: -r * 0.3, dy: r * 0.28 }, { dx: r * 0.34, dy: r * 0.26 }, { dx: 0, dy: 0 }];
      const molScale = shrinkProgress > 0.5 ? Math.max(0.45, mag.r * 0.0055) : Math.max(0.55, mag.r * 0.007);
      for (const mo of molOffsets) {
        drawTriglycerideMolecule(mCx + mo.dx, mCy + mo.dy, molScale);
      }
      ctx.restore();
    }

    // Bile salt amphiphiles around droplet
    if (surfCoverage > 0.01) {
      ctx.save();
      ctx.globalAlpha = surfCoverage;
      const beadCount = 16;
      const headR = Math.max(4, mag.r * 0.055);
      const slideIn = easeOutCubic(surfCoverage);
      const headDist = r + headR * 1.15 + (1 - slideIn) * 18;
      const tailLen = Math.min(r * 0.55, mag.r * 0.17);

      for (let i = 0; i < beadCount; i++) {
        const a = (i / beadCount) * Math.PI * 2;
        const hx = mCx + Math.cos(a) * headDist;
        const hy = mCy + Math.sin(a) * headDist;
        drawDetailedAmphiphile(hx, hy, a + Math.PI, tailLen, headR);
      }
      ctx.restore();
    }

    // Lipase enzymes & molecular breakdown visualization
    if (phase === 'adding_lipase_emulsified' || phase === 'digested_emulsified') {
      // Show green lipase enzymes cleaving and glycerol + fatty acids dispersing!
      const enzymeAngles = [0.4, 2.2, 4.1];
      enzymeAngles.forEach((ang, idx) => {
        const dist = lerp(mag.r * 0.65, mag.r * 0.36, digestProg);
        const ex = mCx + Math.cos(ang + digestProg * 0.5) * dist;
        const ey = mCy + Math.sin(ang + digestProg * 0.5) * dist;
        drawLipaseEnzyme(ex, ey, ang + Math.PI, Math.max(6, mag.r * 0.085));
      });

      // Dispersing glycerol & 3x fatty acid chains
      const pairs = 4;
      for (let i = 0; i < pairs; i++) {
        const baseAng = (i / pairs) * Math.PI * 2 + 0.3;
        const spread = lerp(r * 0.3, mag.r * 0.52, digestProg);
        const gx = mCx + Math.cos(baseAng) * spread;
        const gy = mCy + Math.sin(baseAng) * spread;
        ctx.fillStyle = C.glycerol;
        ctx.beginPath();
        ctx.arc(gx, gy, Math.max(4, mag.r * 0.048), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 3 fatty acids per glycerol
        for (let f = -1; f <= 1; f++) {
          const faAng = baseAng + f * 0.42;
          const fx = gx + Math.cos(faAng) * (mag.r * 0.14);
          const fy = gy + Math.sin(faAng) * (mag.r * 0.14);
          ctx.strokeStyle = C.fattyAcid;
          ctx.lineWidth = 2.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx + Math.cos(faAng) * (mag.r * 0.16), fy + Math.sin(faAng) * (mag.r * 0.16));
          ctx.stroke();
        }
      }
    } else if (phase === 'adding_lipase_raw' || phase === 'digested_raw') {
      // Un-emulsified: Lipase stuck on outer rim, core remains intact!
      const rimAngles = [0.2, 1.5, 2.9, 4.3, 5.4];
      rimAngles.forEach((ang) => {
        const ex = mCx + Math.cos(ang) * (r + mag.r * 0.1);
        const ey = mCy + Math.sin(ang) * (r + mag.r * 0.1);
        drawLipaseEnzyme(ex, ey, ang + Math.PI, Math.max(6, mag.r * 0.085));
      });
      // Only 1 tiny edge glycerol + fatty acid near the surface
      const gx = mCx + Math.cos(0.6) * (r + mag.r * 0.24);
      const gy = mCy + Math.sin(0.6) * (r + mag.r * 0.24);
      ctx.fillStyle = C.glycerol;
      ctx.beginPath();
      ctx.arc(gx, gy, Math.max(4, mag.r * 0.045), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleFont = Math.max(11, Math.round(mag.r * 0.115));
    ctx.font = `700 ${titleFont}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;

    if (phase === 'adding_lipase_emulsified' || phase === 'digested_emulsified') {
      ctx.fillText('化學變化：胰脂酶分解', mag.x, mag.y - mag.r * 0.74);
      drawMagBottomBanner(mag.x, mag.y, mag.r, '三酸甘油酯 → 甘油 + 3脂肪酸');
    } else if (phase === 'adding_lipase_raw' || phase === 'digested_raw') {
      ctx.fillText('無膽汁乳化：酵素受阻', mag.x, mag.y - mag.r * 0.74);
      drawMagBottomBanner(mag.x, mag.y, mag.r, '僅表面分解，核心仍為完整脂質');
    } else if (surfCoverage < 0.3) {
      ctx.fillText('大油滴 (含三酸甘油酯)', mag.x, mag.y - mag.r * 0.74);
      drawMagBottomBanner(mag.x, mag.y, mag.r, '表面積小・油水界面張力大');
    } else if (phase === 'after') {
      ctx.fillText('微胞 (物理變化：未分解)', mag.x, mag.y - mag.r * 0.74);
      drawMagBottomBanner(mag.x, mag.y, mag.r, '表面積劇增・三酸甘油酯仍完整');
    } else if (phase === 'emulsifying') {
      ctx.fillText('膽鹽打散並包覆', mag.x, mag.y - mag.r * 0.74);
      drawMagBottomBanner(mag.x, mag.y, mag.r, '大油塊 → 微小脂肪微胞');
    } else {
      ctx.fillText('膽鹽吸附油水界面', mag.x, mag.y - mag.r * 0.74);
      drawMagBottomBanner(mag.x, mag.y, mag.r, '親油尾插油・親水頭朝水');
    }

    ctx.restore(); // end lens clip

    ctx.lineWidth = 9;
    ctx.strokeStyle = C.ink;
    ctx.beginPath();
    ctx.arc(mag.x, mag.y, mag.r, 0, Math.PI * 2);
    ctx.stroke();

    const handleLen = Math.max(34, Math.min(58, mag.r * 0.65));
    const angle = 38 * Math.PI / 180;
    const hx = mag.x + Math.cos(angle) * (mag.r + 4);
    const hy = mag.y + Math.sin(angle) * (mag.r + 4);
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(angle) * handleLen, hy + Math.sin(angle) * handleLen);
    ctx.stroke();

    ctx.restore();
  }

  function drawDetailedAmphiphile(hx, hy, tailAngle, tailLen, headR) {
    const cos = Math.cos(tailAngle);
    const sin = Math.sin(tailAngle);
    const px = -sin;
    const py = cos;

    ctx.strokeStyle = C.tail;
    ctx.lineWidth = Math.max(2, headR * 0.42);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    const steps = 4;
    for (let s = 1; s <= steps; s++) {
      const f = s / steps;
      const wave = (s % 2 === 1 ? 1 : -1) * (headR * 0.35);
      const wx = hx + cos * (tailLen * f) + px * wave;
      const wy = hy + sin * (tailLen * f) + py * wave;
      ctx.lineTo(wx, wy);
    }
    ctx.stroke();

    ctx.fillStyle = C.head;
    ctx.beginPath();
    ctx.arc(hx, hy, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawTriglycerideMolecule(cx, cy, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    // Glycerol backbone (vertical purple bar)
    ctx.fillStyle = C.glycerol;
    roundedRect(ctx, -10, -10, 5, 20, 2.5);
    ctx.fill();
    // 3 fatty acid chains
    ctx.strokeStyle = C.fattyAcid;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    [-6, 0, 6].forEach((yOff) => {
      ctx.beginPath();
      ctx.moveTo(-5, yOff);
      ctx.lineTo(12, yOff);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawMagBottomBanner(cx, cy, lensR, text) {
    const fontSz = Math.max(9, Math.round(lensR * 0.088));
    ctx.font = `600 ${fontSz}px system-ui, -apple-system, sans-serif`;
    const labelY = cy + lensR * 0.68;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundedRect(ctx, cx - lensR * 0.76, labelY - 11, lensR * 1.52, 22, 6);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.fillText(text, cx, labelY);
  }

  function drawMicroCallouts(cx, cy, coreR, lensR) {
    drawMagBottomBanner(cx, cy, lensR, '親油尾插油・親水頭朝水');
  }

  function largestDropPoint() {
    if (!largeDrops.length) return null;
    let best = largeDrops[0];
    for (const d of largeDrops) {
      if (d.r > best.r) best = d;
    }
    return { x: best.x, y: best.y };
  }

  // Utils
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function dist2(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
  function collidesAny(d, arr, pad = 0) {
    for (const o of arr) {
      const r = d.r + o.r + pad;
      if (dist2(d, o) < r * r) return true;
    }
    return false;
  }
  function nearestPoint(p, pts) {
    let best = pts[0] || { x: inner.x + inner.w / 2, y: inner.y + inner.h * 0.1, r: 12 };
    let bestD = Infinity;
    for (const q of pts) {
      const dd = dist2(p, q);
      if (dd < bestD) { bestD = dd; best = q; }
    }
    return best;
  }

  function roundedRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function reset() {
    cancelAnimationFrame(rafId);
    phase = 'before';
    shakeState = { dx: 0, dy: 0, rot: 0, intensity: 0, phase: 0 };
    lipaseParticles = [];
    productParticles = [];
    actionBtn.disabled = false;
    actionBtn.textContent = '1. 加入膽汁（乳化）';
    stirBtn.disabled = false;
    directLipaseBtn.disabled = false;
    replayBtn.disabled = true;
    updateStatus('步驟 1 / 5', '脂質（三酸甘油酯）不溶於水，聚集成大油層浮在消化液表面');
    updateMetrics('1×（大油滴）', '尚未反應', 0);
    setupBeforeData();
    drawScene(0);
    rafId = requestAnimationFrame(loopBefore);
  }

  // Events
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('resize', () => {
    resize();
    drawScene(phase === 'after' || phase === 'digested_emulsified' || phase === 'digested_raw' ? 1 : 0);
  });
  actionBtn.addEventListener('click', startAddingEmulsifier);
  stirBtn.addEventListener('click', startStirWithoutEmulsifier);
  directLipaseBtn.addEventListener('click', () => startAddingLipase(false));
  replayBtn.addEventListener('click', reset);

  // Kickoff
  resize();
  drawScene(0);
  rafId = requestAnimationFrame(loopBefore);
})();
