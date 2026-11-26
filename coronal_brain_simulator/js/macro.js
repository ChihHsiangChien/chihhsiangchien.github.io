/* =========================================================================
 * macro.js — 解剖插畫風格：全腦冠狀切面（1x 巨觀視圖 + 區域遮罩 + 解剖標籤）
 * ========================================================================= */
(function () {
  'use strict';
  const INK = '#24180f';

  function buildCortexOutline(inset) {
    const pts = [];
    const steps = 280;
    const thickness = inset || 0;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const sx = Math.sin(t);
      const cy = -Math.cos(t);
      let rx = 335 * sx;
      let ry = 255 * cy;

      // 大腦縱裂 (Longitudinal fissure)
      const topIndent = Math.exp(-Math.pow(sx * 7.5, 2)) * (cy < 0 ? 1 : 0);
      ry += topIndent * 108;

      // 外側裂 (Sylvian fissure)
      const sylvianAngle = Math.abs(Math.abs(sx) - 0.92) + Math.abs(cy - 0.16);
      const sylvianIndent = Math.exp(-Math.pow(sylvianAngle * 6.5, 2));
      rx -= Math.sign(sx) * sylvianIndent * 58;
      ry += sylvianIndent * 14;

      // 顳葉底與腦幹切口
      if (cy > 0.35) {
        const bottomCleft = Math.exp(-Math.pow(sx * 4.5, 2));
        ry -= bottomCleft * 68;
        rx += Math.sign(sx) * Math.sin((cy - 0.35) * 3.0) * 18;
      }

      // 腦迴與腦溝波浪 (Gyri & Sulci)
      const gyriWave =
        Math.sin(t * 22 + 0.4) * 7.5 +
        Math.sin(t * 37 - 1.1) * 4.2 +
        Math.cos(t * 13) * 5.0;
      const waveMask = (1 - topIndent * 0.85) * (1 - sylvianIndent * 0.6);
      const radialOffset = gyriWave * waveMask - thickness;
      const len = Math.hypot(rx, ry) || 1;
      rx += (rx / len) * radialOffset;
      ry += (ry / len) * radialOffset;
      pts.push({ x: rx, y: ry });
    }
    return pts;
  }

  const outerPts = buildCortexOutline(0);
  const midPts = buildCortexOutline(11);
  const innerWhitePts = buildCortexOutline(24);

  function tracePoly(ctx, pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
  }

  // 腦溝紋理線（沿外輪廓凹陷處向內延伸的手繪腦溝墨線）
  function buildSulciLines() {
    const lines = [];
    for (let i = 4; i < outerPts.length - 4; i++) {
      const p0 = outerPts[i - 3], p = outerPts[i], p1 = outerPts[i + 3];
      const r0 = Math.hypot(p0.x, p0.y), r = Math.hypot(p.x, p.y), r1 = Math.hypot(p1.x, p1.y);
      if (r < r0 - 1.2 && r < r1 - 1.2 && Math.abs(p.x) > 22) {
        const len = r || 1;
        const nx = -p.x / len, ny = -p.y / len;
        const depth = Math.min(20, (Math.min(r0, r1) - r) * 2.4 + 6);
        lines.push({
          x0: p.x, y0: p.y,
          cx: p.x + nx * depth * 0.55 + ny * 2.5,
          cy: p.y + ny * depth * 0.55 - nx * 2.5,
          x1: p.x + nx * depth, y1: p.y + ny * depth
        });
        i += 4;
      }
    }
    return lines;
  }
  const sulciLines = buildSulciLines();

  // 離屏碰撞遮罩（毫秒級查詢解剖分區）
  const MASK_W = 400, MASK_H = 320;
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = MASK_W;
  maskCanvas.height = MASK_H;
  const mctx = maskCanvas.getContext('2d', { willReadFrequently: true });

  function callosumPath(ctx) {
    ctx.moveTo(-115, -62);
    ctx.bezierCurveTo(-65, -88, 65, -88, 115, -62);
    ctx.bezierCurveTo(95, -45, 55, -56, 0, -56);
    ctx.bezierCurveTo(-55, -56, -95, -45, -115, -62);
    ctx.closePath();
  }

  function internalCapPath(ctx, dir) {
    ctx.moveTo(dir * 74, -50);
    ctx.lineTo(dir * 102, -40);
    ctx.lineTo(dir * 74, 68);
    ctx.lineTo(dir * 52, 62);
    ctx.closePath();
  }

  function normWhiteAngle(a) {
    while (a > Math.PI / 2) a -= Math.PI;
    while (a <= -Math.PI / 2) a += Math.PI;
    return a;
  }

  /**
   * 依巨觀切面區域計算對應的白質神經纖維方向（弧度，範圍 (-pi/2, pi/2]）
   */
  function getWhiteMatterAngle(wx, wy, reg, plane) {
    void plane;
    if (reg === 7) {
      const dir = wx >= 0 ? 1 : -1;
      return normWhiteAngle(Math.atan2(110, -dir * 25));
    }
    if (reg === 3) {
      const dir = wx >= 0 ? 1 : -1;
      const ox = dir * 82;
      const oy = -16;
      return normWhiteAngle(Math.atan2(wy - oy, wx - ox));
    }
    if (reg === 4) {
      if (Math.abs(wy - 26) < 14) return 0;
      return Math.atan(Math.max(-1, Math.min(1, wx / 115)) * 0.28);
    }
    return 0;
  }

  function ventriclePath(ctx, dir) {
    ctx.moveTo(dir * 3, -55);
    ctx.bezierCurveTo(dir * 42, -55, dir * 56, -38, dir * 48, -16);
    ctx.bezierCurveTo(dir * 34, -8, dir * 12, -12, dir * 3, -24);
    ctx.closePath();
  }

  function bakeMask(mode) {
    mctx.clearRect(0, 0, MASK_W, MASK_H);
    mctx.save();
    mctx.translate(MASK_W / 2, MASK_H / 2);
    mctx.scale(0.5, 0.5);

    mctx.fillStyle = 'rgb(10,0,0)'; tracePoly(mctx, outerPts); mctx.fill();
    mctx.fillStyle = 'rgb(20,0,0)'; tracePoly(mctx, midPts); mctx.fill();
    mctx.fillStyle = 'rgb(30,0,0)'; tracePoly(mctx, innerWhitePts); mctx.fill();

    mctx.fillStyle = 'rgb(40,0,0)';
    mctx.beginPath(); callosumPath(mctx); mctx.fill();
    if (mode === 'anterior') {
      mctx.beginPath(); mctx.ellipse(0, 26, 98, 7, 0, 0, Math.PI * 2); mctx.fill();
    }

    mctx.fillStyle = 'rgb(50,0,0)';
    for (const dir of [-1, 1]) { mctx.beginPath(); ventriclePath(mctx, dir); mctx.fill(); }

    mctx.fillStyle = 'rgb(60,0,0)';
    for (const dir of [-1, 1]) {
      mctx.beginPath(); mctx.ellipse(dir * 54, -22, 16, 24, dir * -0.25, 0, Math.PI * 2); mctx.fill();
      mctx.beginPath(); mctx.ellipse(dir * 122, 12, 32, 46, dir * 0.15, 0, Math.PI * 2); mctx.fill();
      if (mode === 'hippocampus') {
        mctx.beginPath(); mctx.ellipse(dir * 34, 22, 28, 38, dir * -0.1, 0, Math.PI * 2); mctx.fill();
      }
    }

    mctx.fillStyle = 'rgb(70,0,0)';
    for (const dir of [-1, 1]) { mctx.beginPath(); internalCapPath(mctx, dir); mctx.fill(); }

    if (mode === 'hippocampus') {
      mctx.fillStyle = 'rgb(80,0,0)';
      for (const dir of [-1, 1]) {
        mctx.beginPath(); mctx.ellipse(dir * 108, 108, 30, 22, dir * 0.25, 0, Math.PI * 2); mctx.fill();
      }
    }

    mctx.restore();
    return mctx.getImageData(0, 0, MASK_W, MASK_H).data;
  }

  const maskAnterior = bakeMask('anterior');
  const maskHippo = bakeMask('hippocampus');

  function getRegionAt(wx, wy, plane) {
    const px = Math.round(wx * 0.5 + MASK_W / 2);
    const py = Math.round(wy * 0.5 + MASK_H / 2);
    if (px < 0 || px >= MASK_W || py < 0 || py >= MASK_H) return 0;
    const data = plane === 'anterior' ? maskAnterior : maskHippo;
    return Math.round(data[(py * MASK_W + px) * 4] / 10);
  }

  const REGION_LABELS = {
    0: '蛛網膜下腔／解剖背景',
    1: '大腦皮質灰質（第 I–III 層：分子層與外錐體層）',
    2: '大腦皮質灰質（第 IV–VI 層：內顆粒層與大錐體層）',
    3: '中央白質（輻射冠有髓鞘投射纖維）',
    4: '胼胝體／前連合（橫向連合有髓鞘神經纖維束）',
    5: '側腦室腔（腦脊髓液與室管膜纖毛邊界）',
    6: '深部灰質核團（基底核紋狀體／視丘）',
    7: '內囊白質通道（皮質脊髓與視丘投射纖維束）',
    8: '海馬迴結構（阿蒙角 CA 錐體細胞層與齒狀回）'
  };

  // 解剖引線標籤定義
  function getCallouts(plane) {
    const list = [
      { title: '大腦皮質（灰質）', sub: 'Cerebral Cortex', ax: -222, ay: -156, lx: -346, ly: -206, align: 'right', preset: 'cortex' },
      { title: '中央白質（輻射冠）', sub: 'Corona Radiata', ax: 192, ay: -120, lx: 346, ly: -195, align: 'left', preset: 'radiata' },
      { title: '胼胝體', sub: 'Corpus Callosum', ax: 0, ay: -70, lx: 346, ly: -125, align: 'left', preset: 'callosum' },
      { title: '側腦室與室管膜', sub: 'Lateral Ventricle', ax: -30, ay: -34, lx: -346, ly: -120, align: 'right', preset: 'ventricle' },
      { title: '尾狀核', sub: 'Caudate Nucleus', ax: 54, ay: -24, lx: 346, ly: -58, align: 'left', preset: 'striatum' },
      { title: '內囊（白質束）', sub: 'Internal Capsule', ax: 74, ay: 12, lx: 346, ly: 8, align: 'left', preset: 'capsule' },
      { title: '豆狀核（殼核／蒼白球）', sub: 'Lentiform Nucleus', ax: -124, ay: 18, lx: -346, ly: 18, align: 'right', preset: 'striatum' }
    ];
    if (plane === 'anterior') {
      list.push({ title: '前連合', sub: 'Anterior Commissure', ax: 38, ay: 26, lx: 346, ly: 78, align: 'left', preset: 'callosum' });
    } else {
      list.push({ title: '視丘', sub: 'Thalamus', ax: -34, ay: 24, lx: -346, ly: -46, align: 'right', preset: 'thalamus' });
      list.push({ title: '海馬迴（CA 錐體層）', sub: 'Hippocampus', ax: 108, ay: 108, lx: 346, ly: 118, align: 'left', preset: 'hippo' });
    }
    return list;
  }

  const macroCache = new Map();

  function getBakedBrain(plane, stain) {
    const key = `${plane}:${stain}`;
    const cached = macroCache.get(key);
    if (cached) return cached;

    const c = document.createElement('canvas');
    c.width = 1680;
    c.height = 1320;
    const g = c.getContext('2d');
    g.save();
    g.translate(840, 660);
    g.scale(2, 2);

    const isNissl = stain === 'nissl';
    const pal = isNissl ? {
      cortex1: '#9f8ac8', cortex2: '#8670b6', white: '#cce4f4', callosum: '#b3d7ef',
      nuclei: '#8e78bc', pallidum: '#a795cf', capsule: '#bfe0f5', hippo: '#8c74bd',
      ventricle: '#a6d2ed', fiberLine: 'rgba(42,108,158,0.28)'
    } : {
      cortex1: '#dfad97', cortex2: '#cf967e', white: '#fbf2dc', callosum: '#fff9ea',
      nuclei: '#d59a84', pallidum: '#e4bca8', capsule: '#f6ebd2', hippo: '#d3957f',
      ventricle: '#a9d3ec', fiberLine: 'rgba(148,108,65,0.22)'
    };

    g.lineJoin = 'round';
    g.lineCap = 'round';

    // 1. 羊皮紙上的立體投影與外層軟腦膜墨線
    g.save();
    g.shadowColor = 'rgba(62, 38, 16, 0.28)';
    g.shadowBlur = 26;
    g.shadowOffsetX = 6;
    g.shadowOffsetY = 10;
    g.fillStyle = pal.cortex1;
    tracePoly(g, outerPts);
    g.fill();
    g.restore();

    // 2. 皮質深層 (Layers IV-VI)
    g.fillStyle = pal.cortex2;
    tracePoly(g, midPts);
    g.fill();

    // 皮質分層細虛線 (Baillarger 條紋感)
    g.strokeStyle = 'rgba(60,32,18,0.18)';
    g.lineWidth = 0.7;
    g.setLineDash([3, 3]);
    tracePoly(g, midPts);
    g.stroke();
    g.setLineDash([]);

    // 3. 中央白質與墨線交界
    g.fillStyle = pal.white;
    tracePoly(g, innerWhitePts);
    g.fill();
    g.strokeStyle = 'rgba(54,32,16,0.42)';
    g.lineWidth = 0.9;
    g.stroke();

    // 放射狀白質纖維手繪排線紋理（由雙側內囊上端扇形輻射而出，與顯微白質視野角度一致）
    g.save();
    tracePoly(g, innerWhitePts);
    g.clip();
    g.strokeStyle = pal.fiberLine;
    g.lineWidth = 0.85;
    for (const dir of [-1, 1]) {
      g.save();
      g.beginPath();
      g.rect(dir < 0 ? -420 : 0, -330, 420, 660);
      g.clip();
      const ox = dir * 82, oy = -16;
      const nRays = 54;
      for (let i = 0; i < nRays; i++) {
        const ang = (i / nRays) * Math.PI * 2;
        g.beginPath();
        g.moveTo(ox + Math.cos(ang) * 26, oy + Math.sin(ang) * 26);
        g.lineTo(ox + Math.cos(ang) * 320, oy + Math.sin(ang) * 320);
        g.stroke();
      }
      g.restore();
    }
    g.restore();

    // 4. 胼胝體與前連合
    g.fillStyle = pal.callosum;
    g.strokeStyle = 'rgba(44,26,14,0.65)';
    g.lineWidth = 1.2;
    g.beginPath();
    callosumPath(g);
    g.fill();
    g.stroke();

    // 胼胝體橫向平行纖維細線
    g.save();
    g.beginPath(); callosumPath(g); g.clip();
    g.strokeStyle = pal.fiberLine;
    g.lineWidth = 0.75;
    for (let dy = -6; dy <= 8; dy += 3.5) {
      g.beginPath();
      g.moveTo(-115, -60 + dy);
      g.bezierCurveTo(-55, -82 + dy, 55, -82 + dy, 115, -60 + dy);
      g.stroke();
    }
    g.restore();

    if (plane === 'anterior') {
      g.fillStyle = pal.callosum;
      g.strokeStyle = 'rgba(44,26,14,0.6)';
      g.lineWidth = 1.0;
      g.beginPath();
      g.ellipse(0, 26, 98, 6.5, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();

      // 前連合橫向平行纖維細線
      g.save();
      g.beginPath();
      g.ellipse(0, 26, 98, 6.5, 0, 0, Math.PI * 2);
      g.clip();
      g.strokeStyle = pal.fiberLine;
      g.lineWidth = 0.72;
      for (const dy of [-3, 0, 3]) {
        g.beginPath();
        g.moveTo(-98, 26 + dy);
        g.lineTo(98, 26 + dy);
        g.stroke();
      }
      g.restore();
    }

    // 5. 深部灰質核團、內囊與海馬迴
    for (const dir of [-1, 1]) {
      // 內囊與斜行投射纖維紋理
      g.fillStyle = pal.capsule;
      g.strokeStyle = 'rgba(44,26,14,0.32)';
      g.lineWidth = 0.85;
      g.beginPath(); internalCapPath(g, dir); g.fill(); g.stroke();
      g.save();
      g.beginPath(); internalCapPath(g, dir); g.clip();
      g.strokeStyle = pal.fiberLine;
      g.lineWidth = 0.85;
      for (let t = 0.1; t <= 0.92; t += 0.16) {
        g.beginPath();
        g.moveTo(dir * (74 + 28 * t), -50 + 10 * t);
        g.lineTo(dir * (52 + 22 * t), 62 + 6 * t);
        g.stroke();
      }
      g.restore();

      // 尾狀核頭
      g.fillStyle = pal.nuclei;
      g.strokeStyle = 'rgba(44,26,14,0.65)';
      g.lineWidth = 1.1;
      g.beginPath();
      g.ellipse(dir * 54, -22, 16, 24, dir * -0.25, 0, Math.PI * 2);
      g.fill(); g.stroke();

      // 橫跨內囊前肢的紋狀體灰質橋 (Pontes grisei caudatolenticulares)
      if (plane === 'anterior') {
        g.strokeStyle = pal.nuclei;
        g.lineWidth = 2.6;
        for (let b = -22; b <= 24; b += 11) {
          g.beginPath();
          g.moveTo(dir * 66, b);
          g.lineTo(dir * 96, b + 8);
          g.stroke();
        }
      }

      // 豆狀核：殼核 + 外/內蒼白球
      g.fillStyle = pal.nuclei;
      g.strokeStyle = 'rgba(44,26,14,0.65)';
      g.lineWidth = 1.15;
      g.beginPath();
      g.ellipse(dir * 124, 12, 30, 44, dir * 0.15, 0, Math.PI * 2);
      g.fill(); g.stroke();

      g.fillStyle = pal.pallidum;
      g.strokeStyle = 'rgba(44,26,14,0.45)';
      g.lineWidth = 0.9;
      g.beginPath();
      g.ellipse(dir * 107, 16, 15, 28, dir * 0.12, 0, Math.PI * 2);
      g.fill(); g.stroke();

      // 屏狀核 (Claustrum)
      g.strokeStyle = pal.nuclei;
      g.lineWidth = 3.2;
      g.beginPath();
      g.arc(dir * 141, 12, 35, dir === 1 ? -0.62 : Math.PI - 0.62, dir === 1 ? 0.62 : Math.PI + 0.62);
      g.stroke();

      if (plane === 'hippocampus') {
        // 視丘
        g.fillStyle = pal.nuclei;
        g.strokeStyle = 'rgba(44,26,14,0.68)';
        g.lineWidth = 1.15;
        g.beginPath();
        g.ellipse(dir * 34, 22, 27, 37, dir * -0.1, 0, Math.PI * 2);
        g.fill(); g.stroke();

        // 海馬迴雙 C 互鎖結構 (CA1-CA3 + 齒狀回)
        g.save();
        g.translate(dir * 108, 108);
        g.scale(dir, 1);
        g.fillStyle = pal.hippo;
        g.strokeStyle = 'rgba(44,26,14,0.72)';
        g.lineWidth = 1.1;
        g.beginPath();
        g.arc(0, 0, 23, 0.18, Math.PI * 1.78);
        g.arc(4, 2, 12.5, Math.PI * 1.78, 0.18, true);
        g.closePath();
        g.fill(); g.stroke();

        // 齒狀回顆粒細胞帶
        g.strokeStyle = isNissl ? '#4e3188' : '#8c4332';
        g.lineWidth = 2.0;
        g.beginPath();
        g.arc(5, 2, 9, 0.5, Math.PI * 1.55);
        g.stroke();
        g.restore();
      }
    }

    // 6. 側腦室（清澈水藍 CSF + 粉紅室管膜鑲邊 + 紅色脈絡叢）
    for (const dir of [-1, 1]) {
      const vGrad = g.createLinearGradient(0, -56, 0, -8);
      vGrad.addColorStop(0, '#8cc0e4');
      vGrad.addColorStop(1, '#cde6f7');
      g.fillStyle = vGrad;
      g.beginPath(); ventriclePath(g, dir); g.fill();

      g.strokeStyle = '#d96b7c';
      g.lineWidth = 1.9;
      g.stroke();
      g.strokeStyle = INK;
      g.lineWidth = 1.0;
      g.stroke();

      // 脈絡叢絨毛團 (Choroid plexus)
      g.fillStyle = '#d94841';
      g.strokeStyle = INK;
      g.lineWidth = 0.85;
      for (let k = -1; k <= 1; k++) {
        g.beginPath();
        g.arc(dir * (22 + k * 3.5), -21 + Math.abs(k) * 1.5, 3.4, 0, Math.PI * 2);
        g.fill(); g.stroke();
      }
    }
    // 透明隔 (Septum pellucidum)
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(0, -56);
    g.lineTo(0, -22);
    g.stroke();

    // 7. 腦溝與外輪廓手繪墨線
    g.strokeStyle = INK;
    g.lineWidth = 1.5;
    for (const s of sulciLines) {
      g.beginPath();
      g.moveTo(s.x0, s.y0);
      g.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1);
      g.stroke();
    }
    g.lineWidth = 2.2;
    tracePoly(g, outerPts);
    g.stroke();

    g.restore();
    macroCache.set(key, c);
    return c;
  }

  /**
   * 繪製解剖插畫風格冠狀切面（靜態層使用離屏快取）
   * opt: { plane, stain, showLabels, hoverWorld, activeSample, zoom }
   */
  function draw(ctx, opt) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 1-7. 靜態解剖冠狀切面（離屏快取一次繪出）
    const baked = getBakedBrain(opt.plane, opt.stain);
    ctx.drawImage(baked, -420, -330, 840, 660);

    // 8. 顯微取樣框標記（顯示目前載入/滑鼠指向的顯微組織位置）
    if (opt.activeSample) {
      const sp = opt.activeSample;
      ctx.save();
      ctx.strokeStyle = '#c62828';
      ctx.lineWidth = 1.8 / Math.max(1, opt.zoom * 0.45);
      ctx.fillStyle = 'rgba(198, 40, 40, 0.12)';
      const box = 16;
      ctx.beginPath();
      ctx.roundRect(sp.x - box, sp.y - box * 0.68, box * 2, box * 1.36, 3);
      ctx.fill();
      ctx.stroke();
      // 十字準星
      ctx.beginPath();
      ctx.moveTo(sp.x - box - 4, sp.y); ctx.lineTo(sp.x - box + 3, sp.y);
      ctx.moveTo(sp.x + box - 3, sp.y); ctx.lineTo(sp.x + box + 4, sp.y);
      ctx.moveTo(sp.x, sp.y - box * 0.68 - 4); ctx.lineTo(sp.x, sp.y - box * 0.68 + 3);
      ctx.moveTo(sp.x, sp.y + box * 0.68 - 3); ctx.lineTo(sp.x, sp.y + box * 0.68 + 4);
      ctx.stroke();
      ctx.restore();
    }

    if (opt.hoverWorld && opt.hoverReg > 0) {
      const hw = opt.hoverWorld;
      ctx.save();
      ctx.strokeStyle = 'rgba(25, 118, 210, 0.85)';
      ctx.setLineDash([3, 2.5]);
      ctx.lineWidth = 1.4 / Math.max(1, opt.zoom * 0.5);
      ctx.beginPath();
      ctx.arc(hw.x, hw.y, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 9. 引線解剖標籤（可 Toggle 開關）
    if (opt.showLabels && opt.zoom < 4.2) {
      const alpha = Math.max(0, Math.min(1, 1 - (opt.zoom - 2.4) / 1.6));
      ctx.save();
      ctx.globalAlpha *= alpha;
      const callouts = getCallouts(opt.plane);
      for (const c of callouts) {
        const elbowX = c.lx + (c.align === 'left' ? -16 : 16);
        // 引線白底暈邊 + 墨線
        ctx.strokeStyle = 'rgba(255,250,238,0.85)';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(c.ax, c.ay);
        ctx.lineTo(elbowX, c.ly);
        ctx.lineTo(c.lx, c.ly);
        ctx.stroke();

        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(c.ax, c.ay);
        ctx.lineTo(elbowX, c.ly);
        ctx.lineTo(c.lx, c.ly);
        ctx.stroke();

        // 解剖錨點圓珠
        ctx.fillStyle = '#fff8e7';
        ctx.beginPath();
        ctx.arc(c.ax, c.ay, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 文字標註
        const tx = c.lx + (c.align === 'left' ? 6 : -6);
        ctx.textAlign = c.align;
        ctx.font = '700 12.5px "Noto Serif TC", "Microsoft JhengHei", serif';
        ctx.fillStyle = INK;
        ctx.fillText(c.title, tx, c.ly - 2);
        ctx.font = 'italic 600 10px Georgia, "Times New Roman", serif';
        ctx.fillStyle = '#6d4c3d';
        ctx.fillText(c.sub, tx, c.ly + 11);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 繪製大腦側面／矢狀示意圖，清楚標示「A 前連合層面」與「B 視丘／海馬迴層面」的冠狀切割位置
   */
  function drawSagittalCutDiagram(ctx, w, h, plane, stain) {
    const isNissl = stain === 'nissl';
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // 羊皮紙底色
    ctx.fillStyle = isNissl ? '#eff3fb' : '#fbf2db';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w * 0.5, h * 0.52);
    const s = Math.min(w / 240, h / 118);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 1. 腦幹（橋腦＋延腦）
    ctx.fillStyle = isNissl ? '#d8d2ea' : '#ecd9bd';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-6, 16);
    ctx.bezierCurveTo(-10, 26, -6, 37, 2, 42);
    ctx.lineTo(10, 54);
    ctx.lineTo(22, 54);
    ctx.lineTo(18, 30);
    ctx.lineTo(14, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. 小腦（含小腦葉細紋）
    ctx.fillStyle = isNissl ? '#c3b5df' : '#dfbe9f';
    ctx.beginPath();
    ctx.moveTo(16, 14);
    ctx.bezierCurveTo(38, 12, 66, 20, 62, 36);
    ctx.bezierCurveTo(56, 48, 28, 49, 16, 36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(44, 26, 14, 0.35)';
    ctx.lineWidth = 0.85;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(22, 21 + k * 5);
      ctx.quadraticCurveTo(42, 23 + k * 5.2, 58 - k * 2, 25 + k * 4.5);
      ctx.stroke();
    }

    // 3. 大腦半球側面輪廓（左為額葉前緣，右為枕葉後緣）
    ctx.fillStyle = isNissl ? '#b39fd6' : '#e6bda6';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.65;
    ctx.beginPath();
    ctx.moveTo(-82, 12);
    ctx.bezierCurveTo(-92, -16, -64, -44, -10, -47);
    ctx.bezierCurveTo(46, -50, 86, -24, 86, 4);
    ctx.bezierCurveTo(86, 18, 66, 20, 40, 17);
    ctx.bezierCurveTo(22, 15, 10, 22, -4, 24);
    ctx.bezierCurveTo(-24, 28, -46, 24, -52, 16);
    ctx.bezierCurveTo(-66, 18, -78, 18, -82, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 外側裂 (Sylvian fissure) 與中央溝示意線
    ctx.strokeStyle = 'rgba(44, 26, 14, 0.5)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-48, 8);
    ctx.quadraticCurveTo(-18, 4, 14, -10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -46);
    ctx.quadraticCurveTo(-10, -28, -14, -10);
    ctx.stroke();

    // 4. 半透明內部標的構造（胼胝體、前連合、視丘、海馬迴）
    ctx.fillStyle = isNissl ? 'rgba(130, 186, 228, 0.65)' : 'rgba(255, 249, 232, 0.72)';
    ctx.strokeStyle = 'rgba(44, 26, 14, 0.45)';
    ctx.lineWidth = 0.85;
    // 胼胝體弧線
    ctx.beginPath();
    ctx.moveTo(-36, -12);
    ctx.bezierCurveTo(-26, -28, 22, -28, 34, -10);
    ctx.bezierCurveTo(22, -18, -20, -18, -32, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 前連合點 (Anterior commissure)
    ctx.fillStyle = '#e65100';
    ctx.beginPath();
    ctx.arc(-20, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 視丘與海馬迴輪廓
    ctx.fillStyle = isNissl ? 'rgba(120, 96, 175, 0.55)' : 'rgba(196, 122, 98, 0.55)';
    ctx.beginPath();
    ctx.ellipse(6, -4, 12, 8, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isNissl ? '#5c3c99' : '#9c422c';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4, 14);
    ctx.quadraticCurveTo(10, 14, 20, 2);
    ctx.stroke();

    // 5. 兩條冠狀切線：A 前連合 (-20) vs B 視丘／海馬迴 (+10)
    const cuts = [
      { id: 'anterior', x: -20, label: 'A 前連合' },
      { id: 'hippocampus', x: 10, label: 'B 視丘海馬' }
    ];
    for (const c of cuts) {
      const active = c.id === plane;
      if (active) {
        ctx.fillStyle = 'rgba(198, 40, 40, 0.14)';
        ctx.fillRect(c.x - 5, -52, 10, 98);
      }
      ctx.save();
      ctx.strokeStyle = active ? '#c62828' : 'rgba(93, 64, 55, 0.55)';
      ctx.lineWidth = active ? 2.1 : 1.1;
      if (!active) ctx.setLineDash([3, 2.5]);
      ctx.beginPath();
      ctx.moveTo(c.x, -51);
      ctx.lineTo(c.x, 42);
      ctx.stroke();
      ctx.restore();

      // 頂部三角指標
      if (active) {
        ctx.fillStyle = '#c62828';
        ctx.beginPath();
        ctx.moveTo(c.x, -49);
        ctx.lineTo(c.x - 4.2, -55);
        ctx.lineTo(c.x + 4.2, -55);
        ctx.closePath();
        ctx.fill();
      }

      ctx.font = active ? '800 8.5px "Microsoft JhengHei", sans-serif' : '700 8px "Microsoft JhengHei", sans-serif';
      ctx.fillStyle = active ? '#b71c1c' : '#6d4c3d';
      ctx.textAlign = c.id === 'anterior' ? 'right' : 'left';
      ctx.fillText(c.label, c.x + (c.id === 'anterior' ? -4 : 4), 48);
    }

    // 方向字標
    ctx.font = '700 8px "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#5d4037';
    ctx.textAlign = 'left';
    ctx.fillText('前額', -106, -34);
    ctx.textAlign = 'right';
    ctx.fillText('枕葉', 106, -34);
    ctx.fillText('小腦', 88, 45);

    ctx.restore();
    ctx.restore();
  }

  BS.macro = {
    getRegionAt,
    getWhiteMatterAngle,
    REGION_LABELS,
    getCallouts,
    draw,
    drawSagittalCutDiagram,
    outerPts
  };
})();
