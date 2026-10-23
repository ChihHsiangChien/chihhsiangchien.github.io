(() => {
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const actionBtn = document.getElementById('actionBtn');
  const stirBtn = document.getElementById('stirBtn');
  const replayBtn = document.getElementById('replayBtn');
  const stepBadge = document.getElementById('stepBadge');
  const stepText = document.getElementById('stepText');

  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Colors
  const C = {
    oil: getCSS('--oil', '#F7C948'),
    oilStroke: '#DDA726',
    head: getCSS('--oil-ring', '#E85D04'),
    tail: getCSS('--oil-tail', '#3D405B'),
    water: getCSS('--water', '#08C4D4'),
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
  let dropParticles = []; // falling surfactant droplets from dropper
  let shakeState = { dx: 0, dy: 0, rot: 0, intensity: 0, phase: 0 };

  function getCSS(varName, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
  }

  function updateStatus(badge, text) {
    if (stepBadge) stepBadge.textContent = badge;
    if (stepText) stepText.textContent = text;
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
    replayBtn.disabled = false;

    updateStatus('對照實驗', '未加乳化劑直接搖晃：搖晃時油滴暫時衝散混合，但停止搖晃後因表面張力大迅速浮回上層');

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
        updateStatus('步驟 1 / 4', '油水再度分離！請點擊「加入乳化劑」觀察界面活性劑的作用');
        rafId = requestAnimationFrame(loopBefore);
      }
    }

    rafId = requestAnimationFrame(step);
  }

  function startAddingEmulsifier() {
    if (phase === 'before') {
      cancelAnimationFrame(rafId);
      phase = 'adding_emulsifier';
      phaseStart = performance.now();
      shakeState = { dx: 0, dy: 0, rot: 0, intensity: 0, phase: 0 };

      actionBtn.disabled = true;
      stirBtn.disabled = true;
      replayBtn.disabled = false;

      updateStatus('步驟 2 / 4', '加入乳化劑：分子具有「親水端」與「親油端」，自動排列於油水交界面以降低表面張力');

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
          actionBtn.textContent = '搖晃混合 (乳化)';
          updateStatus('步驟 3 / 4', '乳化劑已包覆油水界面！點擊「搖晃混合」劇烈搖晃瓶身，將油層打散成微胞');
          rafId = requestAnimationFrame(loopReadyToStir);
        }
      }

      rafId = requestAnimationFrame(step);
    } else if (phase === 'ready_to_stir') {
      startEmulsifyShake();
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
        actionBtn.textContent = '已完成乳化';
        actionBtn.disabled = true;
        replayBtn.disabled = false;
        updateStatus('步驟 4 / 4', '穩定水包油 (O/W) 乳化液：親水端朝外與水相容，且微胞彼此排斥不再聚並');
        rafId = requestAnimationFrame(loopAfter);
      }
    }

    rafId = requestAnimationFrame(step);
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

    // Draw dropper if adding emulsifier
    if (phase === 'adding_emulsifier') {
      drawDropper(animT);
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

  function drawDropper(t) {
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

    ctx.fillStyle = C.head;
    ctx.beginPath();
    ctx.arc(cx, tipY - 28, 9, Math.PI, 0, false);
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
    else if (phase === 'after') shrinkProgress = 1;

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
    const r = lerp(R0, R1, shrinkProgress);

    let surfCoverage = 0;
    if (phase === 'adding_emulsifier') {
      surfCoverage = clamp((animT - 0.2) / 0.75, 0, 1);
    } else if (phase === 'ready_to_stir' || phase === 'emulsifying' || phase === 'after') {
      surfCoverage = 1;
    }

    // Subtle vibration inside magnifier during shaking
    const microJoltX = shakeState.dx * 0.22;
    const microJoltY = shakeState.dy * 0.22;
    const mCx = mag.x + microJoltX;
    const mCy = mag.y + microJoltY;

    ctx.fillStyle = C.oil;
    ctx.beginPath();
    ctx.arc(mCx, mCy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.oilStroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();

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

    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleFont = Math.max(11, Math.round(mag.r * 0.12));
    ctx.font = `600 ${titleFont}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;

    if (surfCoverage < 0.3) {
      ctx.fillText('大油滴', mCx, mCy - 8);
      ctx.font = `${Math.max(10, titleFont - 2)}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#333';
      ctx.fillText('(油水界面張力大)', mCx, mCy + 10);
    } else if (phase === 'after') {
      ctx.fillText('微胞 (Micelle)', mag.x, mag.y - mag.r * 0.72);
      ctx.font = `600 ${Math.max(10, titleFont - 2)}px system-ui, -apple-system, sans-serif`;
      ctx.fillText('油核', mCx, mCy);
      drawMicroCallouts(mag.x, mag.y, r, mag.r);
    } else if (phase === 'emulsifying') {
      ctx.fillText('搖晃打散並包覆', mag.x, mag.y - mag.r * 0.74);
      ctx.font = `600 ${Math.max(10, titleFont - 1)}px system-ui, -apple-system, sans-serif`;
      ctx.fillText('油滴碎裂中', mCx, mCy);
    } else {
      ctx.fillText('乳化劑吸附界面', mag.x, mag.y - mag.r * 0.74);
      ctx.font = `600 ${Math.max(10, titleFont - 1)}px system-ui, -apple-system, sans-serif`;
      ctx.fillText('油滴', mCx, mCy);
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

  function drawMicroCallouts(cx, cy, coreR, lensR) {
    const fontSz = Math.max(9, Math.round(lensR * 0.095));
    ctx.font = `600 ${fontSz}px system-ui, -apple-system, sans-serif`;

    const labelY = cy + lensR * 0.68;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    roundedRect(ctx, cx - lensR * 0.72, labelY - 11, lensR * 1.44, 22, 6);
    ctx.fill();

    ctx.fillStyle = C.ink;
    ctx.fillText('親油尾插油・親水頭朝水', cx, labelY);
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
    actionBtn.disabled = false;
    actionBtn.textContent = '加入乳化劑';
    stirBtn.disabled = false;
    replayBtn.disabled = true;
    updateStatus('步驟 1 / 4', '油水不相溶：密度較小的油浮在水面上');
    setupBeforeData();
    drawScene(0);
    rafId = requestAnimationFrame(loopBefore);
  }

  // Events
  window.addEventListener('resize', () => {
    resize();
    drawScene(phase === 'after' ? 1 : 0);
  });
  actionBtn.addEventListener('click', startAddingEmulsifier);
  stirBtn.addEventListener('click', startStirWithoutEmulsifier);
  replayBtn.addEventListener('click', reset);

  // Kickoff
  resize();
  drawScene(0);
  rafId = requestAnimationFrame(loopBefore);
})();
