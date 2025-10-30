(() => {
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const actionBtn = document.getElementById('actionBtn');
  const replayBtn = document.getElementById('replayBtn');

  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Colors
  const C = {
    oil: getCSS('--oil', '#F7C948'),
    ring: getCSS('--oil-ring', '#F58A4B'),
    water: getCSS('--water', '#08C4D4'),
    ink: getCSS('--ink', '#111')
  };

  // Bottle geometry (inner fluid area) + magnifier
  let W = 800, H = 540; // CSS pixels
  let inner = { x:0, y:0, w:0, h:0, r:24 };
  let mag = { x:0, y:0, r:0, side:'right' };

  // Droplet models
  let largeDrops = []; // before
  let smallDrops = []; // after targets
  let animDrops = [];  // during animation
  let phase = 'before';
  let rafId;

  function getCSS(varName, fallback){
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
  }

  function resize(){
    const rect = canvas.getBoundingClientRect();
    W = Math.max(320, Math.floor(rect.width));
    H = Math.max(260, Math.floor(rect.height));
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Layout: bottle + magnifier (right if wide, bottom if narrow)
    const margin = 24;
    const gap = 24;
    const bh = Math.min(520, H - margin*2);
    let bw;
    let trySide = W >= 720; // candidate for side-by-side

    if (trySide){
      bw = Math.min(420, Math.max(280, Math.floor(W * 0.5) - margin*2));
      inner.w = bw; inner.h = bh;
      inner.x = margin; inner.y = (H - bh) / 2;
      // space for magnifier on the right
      const freeW = W - inner.x - inner.w - gap - margin;
      const rCandidate = Math.min(Math.floor(bh * 0.42), Math.floor(freeW * 0.5));
      if (rCandidate >= 70){
        mag.side = 'right';
        mag.r = rCandidate;
        mag.x = inner.x + inner.w + gap + mag.r;
        mag.y = inner.y + inner.h/2;
      } else {
        trySide = false; // fall back to bottom layout
      }
    }

    if (!trySide){
      // bottle centered on top, magnifier below
      bw = Math.min(480, W - margin*2);
      inner.w = bw; inner.h = bh;
      inner.x = (W - bw) / 2; inner.y = margin;
      const freeH = H - inner.y - inner.h - gap - margin;
      const rBottom = Math.max(50, Math.min(Math.floor(inner.w * 0.32), Math.floor(freeH * 0.5)));
      mag.side = 'bottom';
      mag.r = rBottom;
      mag.x = inner.x + inner.w/2;
      mag.y = inner.y + inner.h + gap + mag.r;
    }

    // Regenerate scenes
    setupBefore();
    if (phase !== 'before') {
      // generate after targets again for new size
      makeSmallTargets();
    }
  }

  function setupBefore(){
    // large droplets near top interface
    const area = inner.w * inner.h;
    const desktop = W >= 600;
    const count = desktop ? 28 : 18;
    const rMin = 10, rMax = 18;
    const topBand = Math.max(40, inner.h * 0.18);

    largeDrops = [];
    let tries = 0;
    while (largeDrops.length < count && tries < 3000){
      tries++;
      const r = rand(rMin, rMax);
      const x = clamp(inner.x + r + 4 + Math.random() * (inner.w - 2*r - 8), inner.x + r + 2, inner.x + inner.w - r - 2);
      const y = clamp(inner.y + r + 8 + Math.random() * (topBand - 2*r - 16), inner.y + r + 8, inner.y + topBand - r - 8);
      const d = {x,y,r};
      if (!collidesAny(d, largeDrops, 2)){
        largeDrops.push(d);
      }
    }

    phase = 'before';
  }

  function makeSmallTargets(){
    // Create uniform small droplets across the whole inner area
    const desktop = W >= 600;
    const targetCount = desktop ? 140 : 90;
    const rMin = 3, rMax = 5;
    const margin = 6;
    const targets = [];
    let attempts = 0;
    while (targets.length < targetCount && attempts < 8000){
      attempts++;
      const r = rand(rMin, rMax);
      const x = rand(inner.x + r + margin, inner.x + inner.w - r - margin);
      const y = rand(inner.y + r + margin, inner.y + inner.h - r - margin);
      const d = {x,y,r, baseX:x, baseY:y, theta:Math.random()*Math.PI*2};
      if (!collidesAny(d, targets, 1.2)) targets.push(d);
    }
    smallDrops = targets;
  }

  function startEmulsify(){
    if (phase !== 'before') return;
    makeSmallTargets();

    // create anim drops by pairing smalls to nearest large to get plausible split sources
    const sources = largeDrops.map(d => ({x:d.x, y:d.y}));
    animDrops = smallDrops.map(s => ({
      sx: nearestPoint(s, sources).x,
      sy: nearestPoint(s, sources).y,
      tx: s.x,
      ty: s.y,
      r: s.r,
      // animation state
      px: 0, py: 0, pr: 0
    }));

    const t0 = performance.now();
    const duration = prefersReduced ? 0 : 1200;
    phase = 'emulsifying';

    function step(now){
      const t = duration === 0 ? 1 : clamp((now - t0)/duration, 0, 1);
      // ease
      const e = easeOutCubic(t);
      // shrink large, grow small
      animDrops.forEach(a => {
        a.px = lerp(a.sx, a.tx, e);
        a.py = lerp(a.sy, a.ty, e);
        a.pr = a.r * e;
      });

  drawScene(t);

      if (t < 1){
        rafId = requestAnimationFrame(step);
      } else {
        phase = 'after';
        // bind final to smallDrops for jitter
        smallDrops.forEach((s,i)=>{ s.x = animDrops[i].px; s.y = animDrops[i].py; });
        rafId = requestAnimationFrame(loopAfter);
        actionBtn.disabled = true;
        replayBtn.disabled = false;
      }
    }

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(step);
  }

  function loopAfter(){
    // Light Brownian motion
    smallDrops.forEach(s => {
      const amp = 0.4; // CSS px per frame
      s.theta += 0.03 + Math.random()*0.02;
      const dx = Math.cos(s.theta) * amp * Math.random();
      const dy = Math.sin(s.theta) * amp * Math.random();
      s.x = clamp(s.x + dx, inner.x + s.r + 3, inner.x + inner.w - s.r - 3);
      s.y = clamp(s.y + dy, inner.y + s.r + 3, inner.y + inner.h - s.r - 3);
    });

    drawScene(1);
    rafId = requestAnimationFrame(loopAfter);
  }

  function drawScene(animT=0){
    ctx.clearRect(0,0,W,H);

    // Draw bottle (outer stroke)
    drawBottle();

    // Water fill
    ctx.save();
    roundedRect(ctx, inner.x, inner.y, inner.w, inner.h, inner.r);
    ctx.clip();
    ctx.fillStyle = C.water;
    ctx.fillRect(inner.x, inner.y, inner.w, inner.h);

    if (phase === 'before'){
      drawOilFilm();
      drawDrops(largeDrops, false);
    } else if (phase === 'emulsifying'){
      drawOilFilm(1-animT); // fade away
      // shrink large
      const largeAlpha = 1 - animT;
      if (largeAlpha > 0){
        ctx.globalAlpha = largeAlpha;
        drawDrops(largeDrops.map(d=>({x:d.x,y:d.y,r:d.r*largeAlpha})), false);
        ctx.globalAlpha = 1;
      }
      // grow small
      drawDrops(animDrops.map(a=>({x:a.px,y:a.py,r:a.pr})), true);
    } else if (phase === 'after'){
      drawDrops(smallDrops, true);
    }

    ctx.restore();

    // Bottle outline on top
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    roundedRect(ctx, inner.x, inner.y, inner.w, inner.h, inner.r);
    ctx.stroke();

    // Magnifier micro-view
    drawMagnifier(animT);
  }

  function drawBottle(){
    // simple shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    roundedRect(ctx, inner.x+4, inner.y+6, inner.w, inner.h, inner.r);
    ctx.fill();
    ctx.restore();
  }

  function drawOilFilm(alpha=1){
    ctx.save();
    ctx.globalAlpha = alpha;
    const filmH = Math.max(16, inner.h * 0.08);
    ctx.fillStyle = C.oil;
    ctx.fillRect(inner.x, inner.y, inner.w, filmH);
    ctx.restore();
  }

  function drawDrops(arr, withRing){
    for (const d of arr){
      // oil core
      ctx.fillStyle = C.oil;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
      ctx.fill();
      if (withRing){
        ctx.strokeStyle = C.ring;
        ctx.lineWidth = Math.max(1, d.r*0.35);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r + ctx.lineWidth*0.35, 0, Math.PI*2);
        ctx.stroke();
      }
    }
  }

  function drawMagnifier(animT){
    // Determine ROI in the bottle
    const roiBefore = largestDropPoint() || {x: inner.x + inner.w*0.5, y: inner.y + inner.h*0.12};
    let roiAfter = roiBefore;
    if (smallDrops.length){
      // choose a target near mid-height
      const target = {x: inner.x + inner.w*0.5, y: inner.y + inner.h*0.5};
      roiAfter = nearestPoint(target, smallDrops);
    }

    // Interpolate ROI during animation
    const t = phase === 'emulsifying' ? clamp(animT, 0, 1) : (phase === 'after' ? 1 : 0);
    const roiX = lerp(roiBefore.x, roiAfter.x, easeOutCubic(t));
    const roiY = lerp(roiBefore.y, roiAfter.y, easeOutCubic(t));

    // Draw leader line from ROI to magnifier edge
    const dirX = mag.x - roiX, dirY = mag.y - roiY;
    const len = Math.hypot(dirX, dirY) || 1;
    const nx = dirX / len, ny = dirY / len;
    const edgeX = mag.x - nx * (mag.r - 6);
    const edgeY = mag.y - ny * (mag.r - 6);

    ctx.save();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(roiX, roiY);
    ctx.lineTo(edgeX, edgeY);
    ctx.stroke();
    ctx.restore();

    // Lens
    ctx.save();
    // lens body
    ctx.fillStyle = C.water;
    ctx.beginPath();
    ctx.arc(mag.x, mag.y, mag.r, 0, Math.PI*2);
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = C.ink;
    ctx.stroke();

    // handle
    const handleLen = Math.max(38, Math.min(64, mag.r*0.7));
    const angle = 35 * Math.PI/180;
    const hx = mag.x + Math.cos(angle) * (mag.r + 6);
    const hy = mag.y + Math.sin(angle) * (mag.r + 6);
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(angle)*handleLen, hy + Math.sin(angle)*handleLen);
    ctx.stroke();

    // content: oil droplet size transitions
    const R0 = mag.r * 0.48; // before radius
    const R1 = mag.r * 0.30; // after radius
    const easeT = t; // already eased above for roi; similar feel
    const r = lerp(R0, R1, easeT);
    // Draw oil core
    ctx.fillStyle = C.oil;
    ctx.beginPath();
    ctx.arc(mag.x, mag.y, r, 0, Math.PI*2);
    ctx.fill();

    // Emulsifier ring strength increases with t
    const ringAlpha = (phase === 'before') ? 0 : 1;
    const visible = phase === 'emulsifying' ? easeT : ringAlpha;
    if (visible > 0){
      // outer ring
      ctx.globalAlpha = visible;
      ctx.strokeStyle = C.ring;
      ctx.lineWidth = Math.max(2, mag.r * 0.06);
      ctx.beginPath();
      ctx.arc(mag.x, mag.y, r + ctx.lineWidth*0.6, 0, Math.PI*2);
      ctx.stroke();

      // heads as beads
      const beads = 14;
      const beadR = Math.max(3, Math.min(6, mag.r*0.07));
      for (let i=0;i<beads;i++){
        const a = (i/beads) * Math.PI*2;
        const bx = mag.x + Math.cos(a) * (r + ctx.lineWidth*0.6);
        const by = mag.y + Math.sin(a) * (r + ctx.lineWidth*0.6);
        ctx.beginPath();
        ctx.fillStyle = C.ring;
        ctx.arc(bx, by, beadR, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // label
    ctx.fillStyle = C.ink;
    ctx.font = `${Math.max(12, Math.floor(mag.r*0.22))}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('油滴  ', mag.x, mag.y);

    ctx.restore();
  }

  function largestDropPoint(){
    if (!largeDrops.length) return null;
    let best = largeDrops[0];
    for (const d of largeDrops){ if (d.r > best.r) best = d; }
    return {x: best.x, y: best.y};
  }

  // Utils
  function rand(a,b){ return a + Math.random()*(b-a); }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function easeOutCubic(t){ return 1 - Math.pow(1-t, 3); }
  function dist2(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return dx*dx+dy*dy; }
  function collidesAny(d, arr, pad=0){
    for (const o of arr){
      const r = d.r + o.r + pad;
      if (dist2(d,o) < r*r) return true;
    }
    return false;
  }
  function nearestPoint(p, pts){
    let best = pts[0] || {x:inner.x+inner.w/2, y:inner.y+inner.h*0.1};
    let bestD = Infinity;
    for (const q of pts){
      const dd = dist2(p, q);
      if (dd < bestD){ bestD = dd; best = q; }
    }
    return best;
  }

  function roundedRect(c, x, y, w, h, r){
    const rr = Math.min(r, w/2, h/2);
    c.beginPath();
    c.moveTo(x+rr, y);
    c.arcTo(x+w, y, x+w, y+h, rr);
    c.arcTo(x+w, y+h, x, y+h, rr);
    c.arcTo(x, y+h, x, y, rr);
    c.arcTo(x, y, x+w, y, rr);
    c.closePath();
  }

  function reset(){
    actionBtn.disabled = false;
    replayBtn.disabled = true;
    setupBefore();
    drawScene(0);
    cancelAnimationFrame(rafId);
  }

  // Events
  window.addEventListener('resize', () => { resize(); drawScene(0); });
  actionBtn.addEventListener('click', startEmulsify);
  replayBtn.addEventListener('click', reset);

  // Kickoff
  resize();
  drawScene(0);
})();
