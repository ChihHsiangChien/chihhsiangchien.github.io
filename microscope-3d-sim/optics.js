/**
 * Optical, Depth-of-Field (DoF), and 2D Canvas rendering engine for microscope-3d-sim.
 */

export const OBJECTIVES = [
  {
    label: '4X',
    mag: 4,
    na: 0.10,
    parfocalOffset: 0,
    baseBrightness: 1.12,
    dofBase: 14.0,
    blurRate: 0.24,
    ringColor: '#ef4444',
    workingGap: 57.5,
  },
  {
    label: '10X',
    mag: 10,
    na: 0.25,
    parfocalOffset: 3.5,
    baseBrightness: 0.94,
    dofBase: 5.2,
    blurRate: 0.58,
    ringColor: '#eab308',
    workingGap: 42.5,
  },
  {
    label: '40X',
    mag: 40,
    na: 0.65,
    parfocalOffset: 7.0,
    baseBrightness: 0.72,
    dofBase: 1.65,
    blurRate: 1.45,
    ringColor: '#3b82f6',
    workingGap: 27.5,
  },
];

export const EYEPIECES = [10, 15];
export const APERTURE_HOLES = [4, 6, 8, 10, 12, 14];

export const SLIDE_DIM = {
  width: 150,
  height: 52,
  specimenSize: 36,
};

export const STAGE_Z_RANGE = { min: -45, max: 45 };
export const SLIDE_OFFSET_X_RANGE = { min: -48, max: 48 };
export const SLIDE_OFFSET_Y_RANGE = { min: -28, max: 28 };

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Compute optical parameters including total magnification, focal plane Z,
 * depth-of-field half-thickness (dofHalf), brightness, contrast, and per-layer blur.
 */
export function computeOptics(state) {
  const obj = OBJECTIVES[clamp(state.objectiveIdx, 0, OBJECTIVES.length - 1)];
  const eyepieceMag = EYEPIECES.includes(state.eyepieceMag) ? state.eyepieceMag : 10;
  const apertureLevel = clamp(Math.round(state.apertureLevel), 1, 6);
  const apertureNorm = (apertureLevel - 1) / 5; // 0 (smallest) .. 1 (largest)

  const totalMag = eyepieceMag * obj.mag;
  const dofFactor = 2.15 - 1.15 * apertureNorm;
  const eyepieceScale = 10 / eyepieceMag;
  const dofHalf = obj.dofBase * dofFactor * eyepieceScale;
  const dofTotal = dofHalf * 2;

  const focalZ = state.stageZ - obj.parfocalOffset;

  const getLayerBlur = (layerZ) => {
    const dz = Math.abs(focalZ - layerZ);
    if (dz <= dofHalf) return 0;
    const excess = dz - dofHalf;
    const slope = obj.blurRate * (0.55 + 0.45 * apertureNorm) * (eyepieceMag / 10);
    return Math.min(22, excess * slope);
  };

  const lightOn = state.lightOn !== false;
  const brightnessPct = lightOn
    ? Math.round(clamp(obj.baseBrightness * (48 + apertureNorm * 95), 24, 155))
    : 0;
  const contrastPct = Math.round(114 - apertureNorm * 18);
  const fovUm = 4500 / totalMag;
  const fovStageUnits = 1800 / totalMag;
  const nearCollision = obj.mag === 40 && state.stageZ > 36;

  return {
    obj,
    eyepieceMag,
    apertureLevel,
    apertureNorm,
    lightOn,
    totalMag,
    dofHalf,
    dofTotal,
    focalZ,
    getLayerBlur,
    brightnessPct,
    contrastPct,
    fovUm,
    fovStageUnits,
    nearCollision,
  };
}

/**
 * Animated microorganism living inside the 3D water-drop specimen bounds.
 */
export class Bug {
  constructor() {
    const limit = SLIDE_DIM.specimenSize / 2 - 2.5;
    this.x = (Math.random() * 2 - 1) * limit;
    this.y = (Math.random() * 2 - 1) * limit;
    this.zBase = (Math.random() * 2 - 1) * 13;
    this.zPhase = Math.random() * Math.PI * 2;
    this.z = this.zBase;
    this.vx = (Math.random() - 0.5) * 0.24;
    this.vy = (Math.random() - 0.5) * 0.24;
    if (Math.hypot(this.vx, this.vy) < 0.06) {
      this.vx = 0.12;
      this.vy = -0.09;
    }
    this.size = 2.0;
    this.life = 50;
    this.maxLife = 50;
    this.isHurting = false;
    this.hurtTimer = null;
  }

  step(timeSec) {
    const limit = SLIDE_DIM.specimenSize / 2 - this.size * 0.7;
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < -limit || this.x > limit) {
      this.vx *= -1;
      this.x = clamp(this.x, -limit, limit);
    }
    if (this.y < -limit || this.y > limit) {
      this.vy *= -1;
      this.y = clamp(this.y, -limit, limit);
    }

    this.z = clamp(this.zBase + Math.sin(timeSec * 0.8 + this.zPhase) * 3.5, -16, 16);
  }

  getHeading() {
    return Math.atan2(this.vy, this.vx);
  }

  getHurt(points) {
    this.life = Math.max(0, this.life - points);
    this.isHurting = true;
    if (this.hurtTimer) clearTimeout(this.hurtTimer);
    this.hurtTimer = setTimeout(() => {
      this.isHurting = false;
      this.hurtTimer = null;
    }, 150);
  }
}

/**
 * Detect whether CanvasRenderingContext2D.filter is supported.
 */
function supportsCanvasFilter() {
  if (typeof document === 'undefined') return false;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  if (!ctx || !('filter' in ctx)) return false;
  ctx.filter = 'blur(2px)';
  return ctx.filter === 'blur(2px)';
}

/**
 * Return layer summary descriptors for the Z-axis Depth-of-Field diagram.
 */
export function getModeDepthMarkers(mode, bugs = []) {
  if (mode === 'threads') {
    return [
      { z: 16, label: '紅線 (上層 +16 μm)', short: '紅 +16', color: '#f43f5e' },
      { z: 0, label: '黃線 (中層 0 μm)', short: '黃 0', color: '#facc15' },
      { z: -16, label: '藍線 (下層 -16 μm)', short: '藍 -16', color: '#38bdf8' },
    ];
  }
  if (mode === 'specimen') {
    return [
      { z: 12, label: '表層細胞壁 (+12 μm)', short: '表層 +12', color: '#a3e635' },
      { z: 0, label: '細胞影像 (0 μm)', short: '細胞 0', color: '#22c55e' },
      { z: -12, label: '底層顆粒 (-12 μm)', short: '底層 -12', color: '#38bdf8' },
    ];
  }
  if (mode === 'bugs') {
    const list = [
      { z: 12, label: '表層微藻 (+12 μm)', short: '微藻 +12', color: '#86efac' },
      { z: -14, label: '水底雜質 (-14 μm)', short: '底層 -14', color: '#7dd3fc' },
    ];
    bugs.forEach((b, idx) => {
      list.push({
        z: b.z,
        label: `蟲蟲 #${idx + 1} (${b.z.toFixed(1)} μm)`,
        short: `蟲${idx + 1}`,
        color: b.isHurting ? '#ef4444' : '#fb923c',
        isBug: true,
      });
    });
    return list;
  }
  return [
    { z: 14, label: '蓋玻片塵點 (+14 μm)', short: '塵點 +14', color: '#94a3b8' },
    { z: 0, label: 'DF 字樣 (0 μm)', short: 'DF 0', color: '#e2e8f0' },
  ];
}

/**
 * Draw a fiber strand with micro-fibrils for crisp high-mag rendering.
 */
function drawFiberStrand(ctx, points, baseWidth, mainColor, fibrilColor, nodeColor, pxPerUnit) {
  const strokePath = (pts, width, color, alpha = 1, dash = []) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    if (dash.length) ctx.setLineDash(dash);
    ctx.stroke();
    ctx.restore();
  };

  strokePath(points, baseWidth, mainColor, 0.92);

  // Subtle internal twist / fibril strands visible at 100X-400X
  const offset = baseWidth * 0.24;
  const shiftedA = points.map(([x, y], i) => [x + (i % 2 === 0 ? offset : -offset), y + offset * 0.5]);
  const shiftedB = points.map(([x, y], i) => [x - (i % 2 === 0 ? offset : -offset), y - offset * 0.5]);
  strokePath(shiftedA, Math.max(0.8, baseWidth * 0.22), fibrilColor, 0.72);
  strokePath(shiftedB, Math.max(0.8, baseWidth * 0.16), '#ffffff', 0.32, [baseWidth * 1.1, baseWidth * 0.9]);

  // Micro-beads / cellular nodes along strand
  if (pxPerUnit > 14) {
    ctx.save();
    ctx.fillStyle = nodeColor;
    for (let i = 1; i < points.length - 1; i++) {
      const [nx, ny] = points[i];
      ctx.beginPath();
      ctx.arc(nx, ny, baseWidth * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export class OpticsView {
  constructor({ eyepieceCanvas, slideCanvas, dofCanvas, onSlideOffsetChange }) {
    this.eyepieceCanvas = eyepieceCanvas;
    this.eyepieceCtx = eyepieceCanvas.getContext('2d');
    this.slideCanvas = slideCanvas;
    this.slideCtx = slideCanvas.getContext('2d');
    this.dofCanvas = dofCanvas;
    this.dofCtx = dofCanvas.getContext('2d');
    this.onSlideOffsetChange = onSlideOffsetChange;

    this.hasNativeFilter = supportsCanvasFilter();
    this.scratchCanvas = document.createElement('canvas');
    this.scratchCtx = this.scratchCanvas.getContext('2d');

    this.cellImage = new Image();
    this.cellLoaded = false;
    this.cellImage.onload = () => {
      this.cellLoaded = true;
      if (this._lastState) this.renderAll(this._lastState);
    };
    this.cellImage.src = 'assets/cell.jpg';

    this.bugImage = new Image();
    this.bugLoaded = false;
    this.bugImage.onload = () => {
      this.bugLoaded = true;
      if (this._lastState) this.renderAll(this._lastState);
    };
    this.bugImage.src = 'assets/bug.png';

    this.bugs = [];
    this.resetBugs(4);

    this._lastState = null;
    this._draggingSlide = false;
    this._dragStart = { x: 0, y: 0, offsetX: 0, offsetY: 0 };
    this._bindSlideDrag();
  }

  resetBugs(count = 4) {
    this.bugs = Array.from({ length: count }, () => new Bug());
  }

  addBugs(count = 3) {
    for (let i = 0; i < count; i++) {
      this.bugs.push(new Bug());
    }
  }

  /**
   * Advance animated bugs and check 400X crosshair damage when in focus.
   * Returns { changed, killedDelta }.
   */
  stepBugs(timeSec, state) {
    if (state.mode !== 'bugs' || this.bugs.length === 0) {
      return { changed: false, killedDelta: 0 };
    }
    const optics = computeOptics(state);
    let killedDelta = 0;

    for (const bug of this.bugs) {
      bug.step(timeSec);
      if (optics.totalMag >= 400) {
        // Crosshair is at stage origin (0, 0); bug world pos is (slideOffset + bug.xy)
        const wx = state.slideOffsetX + bug.x;
        const wy = state.slideOffsetY + bug.y;
        const hitRadius = bug.size * 0.72;
        const inCrosshair = Math.hypot(wx, wy) <= hitRadius;
        const inFocus = optics.getLayerBlur(bug.z) < 2.8;
        if (inCrosshair && inFocus) {
          bug.getHurt(2.2);
        }
      }
    }

    const before = this.bugs.length;
    this.bugs = this.bugs.filter((b) => b.life > 0);
    killedDelta = before - this.bugs.length;

    return { changed: true, killedDelta };
  }

  _bindSlideDrag() {
    const getPos = (ev) => {
      const rect = this.slideCanvas.getBoundingClientRect();
      const pt = ev.touches ? ev.touches[0] : ev;
      return {
        x: pt.clientX - rect.left,
        y: pt.clientY - rect.top,
        scaleX: this.slideCanvas.width / Math.max(1, rect.width),
        scaleY: this.slideCanvas.height / Math.max(1, rect.height),
      };
    };

    const startDrag = (ev) => {
      if (!this._lastState) return;
      ev.preventDefault();
      const pos = getPos(ev);
      this._draggingSlide = true;
      this._dragStart = {
        x: pos.x * pos.scaleX,
        y: pos.y * pos.scaleY,
        offsetX: this._lastState.slideOffsetX,
        offsetY: this._lastState.slideOffsetY,
      };
      this.slideCanvas.style.cursor = 'grabbing';
    };

    const moveDrag = (ev) => {
      if (!this._draggingSlide || !this._lastState) return;
      ev.preventDefault();
      const pos = getPos(ev);
      const pxPerUnit = this._getSlideCanvasScale();
      const dx = (pos.x * pos.scaleX - this._dragStart.x) / pxPerUnit;
      const dy = (pos.y * pos.scaleY - this._dragStart.y) / pxPerUnit;
      const nextX = clamp(this._dragStart.offsetX + dx, SLIDE_OFFSET_X_RANGE.min, SLIDE_OFFSET_X_RANGE.max);
      const nextY = clamp(this._dragStart.offsetY + dy, SLIDE_OFFSET_Y_RANGE.min, SLIDE_OFFSET_Y_RANGE.max);
      if (this.onSlideOffsetChange) {
        this.onSlideOffsetChange(nextX, nextY);
      }
    };

    const endDrag = () => {
      if (!this._draggingSlide) return;
      this._draggingSlide = false;
      this.slideCanvas.style.cursor = 'grab';
    };

    this.slideCanvas.addEventListener('mousedown', startDrag);
    this.slideCanvas.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('touchmove', moveDrag, { passive: false });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);
  }

  _getSlideCanvasScale() {
    // Stage is 200x200 units mapped cleanly into slideCanvas
    return Math.min(this.slideCanvas.width, this.slideCanvas.height) / 215;
  }

  renderAll(state) {
    this._lastState = state;
    const optics = computeOptics(state);
    this.renderEyepiece(state, optics);
    this.renderSlideTopView(state, optics);
    this.renderDofDiagram(state, optics);
  }

  /**
   * Build ordered depth layers for the current mode.
   * Each layer has { z, draw(ctx, pxPerUnit) } in stage-space centered at (0,0) = optical axis.
   */
  _buildLayers(state, optics) {
    const sx = state.slideOffsetX;
    const sy = state.slideOffsetY;
    const halfSpec = SLIDE_DIM.specimenSize / 2;

    const layers = [];

    // Glass slide & coverslip base (at z = 0)
    layers.push({
      z: 0,
      draw: (ctx, pxPerUnit) => {
        ctx.save();
        ctx.translate(sx * pxPerUnit, sy * pxPerUnit);

        const sw = SLIDE_DIM.width * pxPerUnit;
        const sh = SLIDE_DIM.height * pxPerUnit;
        ctx.fillStyle = 'rgba(186, 230, 253, 0.16)';
        ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
        ctx.lineWidth = Math.max(1.2, pxPerUnit * 0.25);
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
        ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);

        const cw = (SLIDE_DIM.specimenSize + 4) * pxPerUnit;
        ctx.fillStyle = state.mode === 'bugs' ? 'rgba(186, 230, 253, 0.34)' : 'rgba(224, 242, 254, 0.15)';
        ctx.fillRect(-cw / 2, -cw / 2, cw, cw);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = Math.max(1, pxPerUnit * 0.16);
        ctx.strokeRect(-cw / 2, -cw / 2, cw, cw);
        ctx.restore();
      },
    });

    if (state.mode === 'threads') {
      // Bottom layer (-16 um): Blue woven strand + beads
      layers.push({
        z: -16,
        draw: (ctx, pxPerUnit) => {
          ctx.save();
          ctx.translate(sx * pxPerUnit, sy * pxPerUnit);
          const u = pxPerUnit;
          const pts = [
            [-14 * u, -6 * u],
            [-6 * u, -2.5 * u],
            [0 * u, 0.5 * u],
            [6 * u, 3.5 * u],
            [14 * u, 7 * u],
          ];
          drawFiberStrand(ctx, pts, 1.8 * u, '#0284c7', '#38bdf8', '#0369a1', u);

          // Tiny blue reference beads
          ctx.fillStyle = 'rgba(14, 165, 233, 0.72)';
          [[-8.5, 6.5], [7.5, -5.5], [-2.5, -9.5]].forEach(([bx, by]) => {
            ctx.beginPath();
            ctx.arc(bx * u, by * u, 1.05 * u, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        },
      });

      // Middle layer (0 um): Amber-yellow strand + translucent green organelles
      layers.push({
        z: 0,
        draw: (ctx, pxPerUnit) => {
          ctx.save();
          ctx.translate(sx * pxPerUnit, sy * pxPerUnit);
          const u = pxPerUnit;
          const pts = [
            [-14 * u, 7.5 * u],
            [-6 * u, 3.2 * u],
            [0 * u, -0.4 * u],
            [6 * u, -3.6 * u],
            [14 * u, -8 * u],
          ];
          drawFiberStrand(ctx, pts, 1.65 * u, '#d97706', '#facc15', '#b45309', u);

          // Translucent green chloroplast-like discs
          [[-5.5, -5.0], [5.5, 4.8], [2.2, 8.2]].forEach(([gx, gy]) => {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.65)';
            ctx.strokeStyle = 'rgba(21, 128, 61, 0.85)';
            ctx.lineWidth = Math.max(0.8, 0.14 * u);
            ctx.beginPath();
            ctx.ellipse(gx * u, gy * u, 1.3 * u, 0.85 * u, 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });
          ctx.restore();
        },
      });

      // Top layer (+16 um): Crimson-red strand + coverslip air ring & pollen
      layers.push({
        z: 16,
        draw: (ctx, pxPerUnit) => {
          ctx.save();
          ctx.translate(sx * pxPerUnit, sy * pxPerUnit);
          const u = pxPerUnit;
          const pts = [
            [-2.2 * u, -14.5 * u],
            [-1.1 * u, -6.5 * u],
            [0.2 * u, 0.2 * u],
            [1.6 * u, 7.0 * u],
            [2.6 * u, 14.5 * u],
          ];
          drawFiberStrand(ctx, pts, 1.5 * u, '#e11d48', '#fb7185', '#9f1239', u);

          // Top air micro-bubble ring & crimson pollen dot
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.65)';
          ctx.lineWidth = Math.max(1, 0.26 * u);
          ctx.beginPath();
          ctx.arc(-7.5 * u, -8.5 * u, 1.6 * u, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(244, 63, 94, 0.78)';
          ctx.beginPath();
          ctx.arc(6.8 * u, 8.5 * u, 0.9 * u, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        },
      });
    } else if (state.mode === 'specimen') {
      // Bottom layer (-12 um): Deep translucent cytoplasmic granules
      layers.push({
        z: -12,
        draw: (ctx, pxPerUnit) => {
          ctx.save();
          ctx.translate(sx * pxPerUnit, sy * pxPerUnit);
          const u = pxPerUnit;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
          for (let i = -2; i <= 2; i++) {
            for (let j = -2; j <= 2; j++) {
              ctx.beginPath();
              ctx.arc((i * 5.2 + (j % 2) * 1.4) * u, (j * 5.2) * u, 1.1 * u, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.restore();
        },
      });

      // Middle layer (0 um): cell.jpg specimen
      layers.push({
        z: 0,
        draw: (ctx, pxPerUnit) => {
          ctx.save();
          ctx.translate(sx * pxPerUnit, sy * pxPerUnit);
          const sizePx = SLIDE_DIM.specimenSize * pxPerUnit;
          if (this.cellLoaded) {
            ctx.drawImage(this.cellImage, -sizePx / 2, -sizePx / 2, sizePx, sizePx);
          } else {
            ctx.fillStyle = 'rgba(134, 239, 172, 0.45)';
            ctx.fillRect(-sizePx / 2, -sizePx / 2, sizePx, sizePx);
          }
          ctx.restore();
        },
      });

      // Top layer (+12 um): Upper cell wall ridges + coverslip specks
      layers.push({
        z: 12,
        draw: (ctx, pxPerUnit) => {
          ctx.save();
          ctx.translate(sx * pxPerUnit, sy * pxPerUnit);
          const u = pxPerUnit;
          ctx.strokeStyle = 'rgba(22, 101, 52, 0.42)';
          ctx.lineWidth = Math.max(0.8, 0.25 * u);
          for (let x = -12; x <= 12; x += 6) {
            ctx.beginPath();
            ctx.moveTo(x * u, -halfSpec * u);
            ctx.lineTo((x + 1.5) * u, halfSpec * u);
            ctx.stroke();
          }
          // Tiny coverslip dust particles
          ctx.fillStyle = 'rgba(51, 65, 85, 0.55)';
          [[-6, -4], [4.5, 3.2], [9, -9]].forEach(([dx, dy]) => {
            ctx.beginPath();
            ctx.arc(dx * u, dy * u, 0.45 * u, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        },
      });
    } else if (state.mode === 'bugs') {
      // Bottom pond debris (-14 um)
      layers.push({
        z: -14,
        draw: (ctx, pxPerUnit) => {
          ctx.save();
          ctx.translate(sx * pxPerUnit, sy * pxPerUnit);
          const u = pxPerUnit;
          ctx.fillStyle = 'rgba(100, 116, 139, 0.35)';
          [[-9, -7], [8, 9], [-5, 10], [11, -6]].forEach(([dx, dy]) => {
            ctx.beginPath();
            ctx.arc(dx * u, dy * u, 1.2 * u, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        },
      });

      // Each living bug at its own dynamic Z depth!
      this.bugs.forEach((bug) => {
        layers.push({
          z: bug.z,
          draw: (ctx, pxPerUnit) => {
            ctx.save();
            ctx.translate((sx + bug.x) * pxPerUnit, (sy + bug.y) * pxPerUnit);
            const sizePx = bug.size * pxPerUnit;

            ctx.save();
            ctx.rotate(bug.getHeading() + Math.PI / 2);
            if (this.bugLoaded) {
              ctx.drawImage(this.bugImage, -sizePx / 2, -sizePx / 2, sizePx, sizePx);
            } else {
              ctx.fillStyle = '#0f766e';
              ctx.beginPath();
              ctx.ellipse(0, 0, sizePx * 0.35, sizePx * 0.5, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            if (bug.isHurting) {
              ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
              ctx.beginPath();
              ctx.arc(0, 0, sizePx * 0.48, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();

            if (optics.totalMag >= 400) {
              const barW = sizePx * 1.1;
              const barH = Math.max(4, sizePx * 0.08);
              ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
              ctx.fillRect(-barW / 2, -sizePx * 0.72, barW, barH);
              ctx.fillStyle = '#ef4444';
              ctx.fillRect(-barW / 2, -sizePx * 0.72, barW * (bug.life / bug.maxLife), barH);
            }
            ctx.restore();
          },
        });
      });

      // Top floating micro-algae (+12 um)
      layers.push({
        z: 12,
        draw: (ctx, pxPerUnit) => {
          ctx.save();
          ctx.translate(sx * pxPerUnit, sy * pxPerUnit);
          const u = pxPerUnit;
          ctx.strokeStyle = 'rgba(22, 163, 74, 0.55)';
          ctx.lineWidth = Math.max(1, 0.22 * u);
          ctx.beginPath();
          ctx.arc(5 * u, -6 * u, 1.4 * u, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(-8 * u, 4 * u, 1.0 * u, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        },
      });
    } else {
      // DF mode (z = 0 um) + top coverslip specks (+14 um)
      layers.push({
        z: 0,
        draw: (ctx, pxPerUnit) => {
          ctx.save();
          ctx.translate(sx * pxPerUnit, sy * pxPerUnit);
          ctx.font = `800 ${16 * pxPerUnit}px "Inter", "Noto Sans TC", sans-serif`;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('DF', 0, 0);
          ctx.restore();
        },
      });

      layers.push({
        z: 14,
        draw: (ctx, pxPerUnit) => {
          ctx.save();
          ctx.translate(sx * pxPerUnit, sy * pxPerUnit);
          const u = pxPerUnit;
          ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
          [[-9, -5], [9, 6], [2, -10]].forEach(([dx, dy]) => {
            ctx.beginPath();
            ctx.arc(dx * u, dy * u, 0.55 * u, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        },
      });
    }

    // Sort back-to-front by z
    layers.sort((a, b) => a.z - b.z);
    return layers;
  }

  /**
   * Draw one layer onto targetCtx applying Gaussian blur and contrast/brightness.
   */
  _drawBlurredLayer(targetCtx, width, height, blurPx, contrastPct, drawFn) {
    if (blurPx < 0.15) {
      targetCtx.save();
      if (this.hasNativeFilter) {
        targetCtx.filter = `contrast(${contrastPct}%)`;
      }
      drawFn(targetCtx);
      targetCtx.restore();
      return;
    }

    if (this.hasNativeFilter) {
      targetCtx.save();
      targetCtx.filter = `blur(${blurPx.toFixed(2)}px) contrast(${contrastPct}%)`;
      drawFn(targetCtx);
      targetCtx.restore();
      return;
    }

    // Fallback when ctx.filter is unavailable (e.g., older WebKit): downscale/upscale
    const scale = Math.max(0.08, 1 / (1 + blurPx * 0.45));
    const sw = Math.max(8, Math.round(width * scale));
    const sh = Math.max(8, Math.round(height * scale));
    this.scratchCanvas.width = sw;
    this.scratchCanvas.height = sh;
    const sctx = this.scratchCtx;
    sctx.clearRect(0, 0, sw, sh);
    sctx.save();
    sctx.scale(scale, scale);
    drawFn(sctx);
    sctx.restore();

    targetCtx.save();
    targetCtx.imageSmoothingEnabled = true;
    targetCtx.imageSmoothingQuality = 'high';
    targetCtx.drawImage(this.scratchCanvas, 0, 0, sw, sh, 0, 0, width, height);
    targetCtx.restore();
  }

  renderEyepiece(state, optics) {
    const canvas = this.eyepieceCanvas;
    const ctx = this.eyepieceCtx;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 4;
    const pxPerUnit = w / optics.fovStageUnits;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    if (!optics.lightOn) {
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, w, h);

      ctx.font = '700 18px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('光源已關閉', cx, cy - 12);

      ctx.font = '500 13px "Noto Sans TC", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('請點擊底座或下方「光源開關」開啟照明', cx, cy + 16);

      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#334155';
      ctx.stroke();
      return;
    }

    // Condenser illumination background
    const lum = clamp(optics.brightnessPct / 100, 0.2, 1.5);
    const rCol = Math.min(255, Math.round(244 * lum));
    const gCol = Math.min(255, Math.round(248 * lum));
    const bCol = Math.min(255, Math.round(220 * lum));
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
    grad.addColorStop(0, `rgb(${rCol}, ${gCol}, ${bCol})`);
    grad.addColorStop(0.84, `rgb(${Math.round(rCol * 0.92)}, ${Math.round(gCol * 0.92)}, ${Math.round(bCol * 0.88)})`);
    grad.addColorStop(1, `rgb(${Math.round(rCol * 0.62)}, ${Math.round(gCol * 0.62)}, ${Math.round(bCol * 0.58)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Apply compound 180-deg inversion BEFORE drawing specimen layers
    ctx.save();
    ctx.translate(cx, cy);
    if (state.compound) {
      ctx.scale(-1, -1);
    }

    const layers = this._buildLayers(state, optics);
    for (const layer of layers) {
      const blurPx = optics.getLayerBlur(layer.z);
      this._drawBlurredLayer(ctx, w, h, blurPx, optics.contrastPct, (c) => {
        if (c === ctx) {
          layer.draw(c, pxPerUnit);
        } else {
          // Fallback scratch canvas needs centering
          c.save();
          c.translate(cx, cy);
          if (state.compound) c.scale(-1, -1);
          layer.draw(c, pxPerUnit);
          c.restore();
        }
      });
    }
    ctx.restore(); // undo compound transform

    // Ocular rim vignette
    const vig = ctx.createRadialGradient(cx, cy, radius * 0.78, cx, cy, radius);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(2,6,23,0.68)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    // Crosshair in 400X+ bugs mode
    if (state.mode === 'bugs' && optics.totalMag >= 400) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy);
      ctx.lineTo(cx + 16, cy);
      ctx.moveTo(cx, cy - 16);
      ctx.lineTo(cx, cy + 16);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Dynamic calibrated scale bar (bottom-right inside ocular)
    const targetBarUm = optics.fovUm * 0.22;
    const niceSteps = [5, 10, 20, 50, 100, 200, 500];
    const barUm = niceSteps.reduce((prev, curr) =>
      Math.abs(curr - targetBarUm) < Math.abs(prev - targetBarUm) ? curr : prev
    );
    const barPx = (barUm / optics.fovUm) * (radius * 2);
    const bx = cx + radius * 0.58 - barPx;
    const by = cy + radius * 0.74;

    ctx.strokeStyle = lum < 0.5 ? '#f8fafc' : '#0f172a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx, by - 4);
    ctx.lineTo(bx, by + 4);
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + barPx, by);
    ctx.moveTo(bx + barPx, by - 4);
    ctx.lineTo(bx + barPx, by + 4);
    ctx.stroke();

    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillStyle = lum < 0.5 ? '#f8fafc' : '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${barUm} μm`, bx + barPx / 2, by - 4);

    ctx.restore(); // undo circle clip

    // Outer brass/slate bezel ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#334155';
    ctx.stroke();
  }

  renderSlideTopView(state, optics) {
    const canvas = this.slideCanvas;
    const ctx = this.slideCtx;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const u = this._getSlideCanvasScale();

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy);

    // Stage body (200x200)
    const stageS = 200 * u;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.fillRect(-stageS / 2, -stageS / 2, stageS, stageS);
    ctx.strokeRect(-stageS / 2, -stageS / 2, stageS, stageS);

    // Stage central hole + dynamic aperture illumination
    const holeR = 12 * u;
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(0, 0, holeR, 0, Math.PI * 2);
    ctx.fill();

    if (optics.lightOn) {
      const apRadius = Math.min(APERTURE_HOLES[optics.apertureLevel - 1] * 0.85, 11.4) * u;
      const apAlpha = 0.35 + optics.apertureNorm * 0.65;
      ctx.fillStyle = `rgba(254, 243, 199, ${apAlpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(0, 0, apRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glass slide & specimen at (slideOffsetX, slideOffsetY)
    ctx.save();
    ctx.translate(state.slideOffsetX * u, state.slideOffsetY * u);

    const sw = SLIDE_DIM.width * u;
    const sh = SLIDE_DIM.height * u;
    ctx.fillStyle = 'rgba(186, 230, 253, 0.25)';
    ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);

    // Frosted label tab on left of slide
    ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.fillRect(-sw / 2 + 2, -sh / 2 + 2, 22 * u, sh - 4);

    // Specimen preview on slide
    this._drawSlideSpecimenPreview(ctx, state, u);
    ctx.restore();

    // Stage clips (closer to user, drawn above slide wings)
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-51.75 * u, -56 * u, 7.5 * u, 72 * u);
    ctx.fillRect(44.25 * u, -56 * u, 7.5 * u, 72 * u);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(-48 * u, -54 * u, 4 * u, 0, Math.PI * 2);
    ctx.arc(48 * u, -54 * u, 4 * u, 0, Math.PI * 2);
    ctx.fill();

    // Dashed cyan eyepiece FOV indicator at optical center (0, 0)
    const fovBox = Math.max(4, optics.fovStageUnits * u);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, fovBox / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  _drawSlideSpecimenPreview(ctx, state, u) {
    const specPx = SLIDE_DIM.specimenSize * u;
    ctx.fillStyle = state.mode === 'bugs' ? 'rgba(125, 211, 252, 0.45)' : 'rgba(224, 242, 254, 0.2)';
    ctx.fillRect(-specPx / 2, -specPx / 2, specPx, specPx);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-specPx / 2, -specPx / 2, specPx, specPx);

    if (state.mode === 'threads') {
      ctx.lineWidth = Math.max(1.5, 1.5 * u);
      ctx.strokeStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(-14 * u, -6 * u);
      ctx.lineTo(14 * u, 7 * u);
      ctx.stroke();

      ctx.strokeStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(-14 * u, 7.5 * u);
      ctx.lineTo(14 * u, -8 * u);
      ctx.stroke();

      ctx.strokeStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(-2.2 * u, -14.5 * u);
      ctx.lineTo(2.6 * u, 14.5 * u);
      ctx.stroke();
    } else if (state.mode === 'specimen') {
      if (this.cellLoaded) {
        ctx.drawImage(this.cellImage, -specPx / 2, -specPx / 2, specPx, specPx);
      }
    } else if (state.mode === 'bugs') {
      this.bugs.forEach((b) => {
        ctx.fillStyle = b.isHurting ? '#ef4444' : '#0f766e';
        ctx.beginPath();
        ctx.arc(b.x * u, b.y * u, Math.max(2, b.size * u * 0.5), 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      ctx.font = `800 ${14 * u}px sans-serif`;
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DF', 0, 0);
    }
  }

  /**
   * Render the live specimen onto an external canvas used as a Three.js CanvasTexture on the 3D slide.
   */
  renderSlideTextureCanvas(canvas, state) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle translucent tinted background
    ctx.fillStyle = state.mode === 'bugs' ? 'rgba(186, 230, 253, 0.55)' : 'rgba(241, 245, 249, 0.35)';
    ctx.fillRect(0, 0, w, h);

    const u = w / SLIDE_DIM.specimenSize;
    ctx.save();
    ctx.translate(w / 2, h / 2);

    if (state.mode === 'threads') {
      drawFiberStrand(ctx, [[-14 * u, -6 * u], [0, 0.5 * u], [14 * u, 7 * u]], 1.8 * u, '#0284c7', '#38bdf8', '#0369a1', u);
      drawFiberStrand(ctx, [[-14 * u, 7.5 * u], [0, -0.4 * u], [14 * u, -8 * u]], 1.65 * u, '#d97706', '#facc15', '#b45309', u);
      drawFiberStrand(ctx, [[-2.2 * u, -14.5 * u], [0.2 * u, 0.2 * u], [2.6 * u, 14.5 * u]], 1.5 * u, '#e11d48', '#fb7185', '#9f1239', u);
    } else if (state.mode === 'specimen') {
      if (this.cellLoaded) {
        ctx.drawImage(this.cellImage, -w / 2, -h / 2, w, h);
      }
    } else if (state.mode === 'bugs') {
      this.bugs.forEach((b) => {
        ctx.save();
        ctx.translate(b.x * u, b.y * u);
        ctx.rotate(b.getHeading() + Math.PI / 2);
        const s = b.size * u;
        if (this.bugLoaded) {
          ctx.drawImage(this.bugImage, -s / 2, -s / 2, s, s);
        } else {
          ctx.fillStyle = '#0f766e';
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    } else {
      ctx.font = `800 ${16 * u}px sans-serif`;
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DF', 0, 0);
    }

    ctx.restore();
  }

  /**
   * Render the Z-axis Depth-of-Field cross-section diagram.
   */
  renderDofDiagram(state, optics) {
    const canvas = this.dofCanvas;
    const ctx = this.dofCtx;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const padTop = 36;
    const padBottom = 18;
    const plotTop = padTop;
    const plotBottom = h - padBottom;
    const plotH = plotBottom - plotTop;
    const zMin = -35;
    const zMax = 35;

    const zToY = (z) => plotTop + ((zMax - clamp(z, zMin, zMax)) / (zMax - zMin)) * plotH;

    // Objective lens icon at top
    const objW = 54;
    const objH = 22;
    const objX = w * 0.28 - objW / 2;
    ctx.fillStyle = '#334155';
    ctx.fillRect(objX, 4, objW, objH);
    ctx.fillStyle = optics.obj.ringColor;
    ctx.fillRect(objX, 4 + objH - 5, objW, 3);
    ctx.font = '700 11px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${optics.obj.label} 物鏡`, w * 0.28, 13);

    // Depth axis & tick marks
    const axisX = 40;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(axisX, plotTop);
    ctx.lineTo(axisX, plotBottom);
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    [-30, -16, 0, 16, 30].forEach((zVal) => {
      const y = zToY(zVal);
      ctx.beginPath();
      ctx.moveTo(axisX - 4, y);
      ctx.lineTo(w - 10, y);
      ctx.strokeStyle = zVal === 0 ? 'rgba(148, 163, 184, 0.25)' : 'rgba(51, 65, 85, 0.35)';
      ctx.stroke();
      ctx.fillText(`${zVal > 0 ? '+' : ''}${zVal}`, axisX - 7, y);
    });

    // Translucent Depth of Field band
    const bandTop = zToY(optics.focalZ + optics.dofHalf);
    const bandBottom = zToY(optics.focalZ - optics.dofHalf);
    const bandH = Math.max(3, bandBottom - bandTop);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.fillRect(axisX, bandTop, w - axisX - 10, bandH);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(axisX, bandTop, w - axisX - 10, bandH);

    // Focal plane center line
    const focalY = zToY(optics.focalZ);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(axisX, focalY);
    ctx.lineTo(w - 10, focalY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Specimen layer markers
    const markers = getModeDepthMarkers(state.mode, this.bugs);
    markers.forEach((m, idx) => {
      const y = zToY(m.z);
      const inDoF = Math.abs(optics.focalZ - m.z) <= optics.dofHalf;
      const dotX = m.isBug ? 72 + idx * 14 : 64;

      ctx.beginPath();
      ctx.arc(dotX, y, inDoF ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = m.color;
      ctx.fill();
      if (inDoF) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }

      if (!m.isBug || idx === 0) {
        ctx.font = inDoF ? '700 11px sans-serif' : '11px sans-serif';
        ctx.fillStyle = inDoF ? '#f8fafc' : '#94a3b8';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const textX = m.isBug ? 132 : 76;
        const label = m.isBug ? `水樣蟲蟲 (${this.bugs.length}隻)` : m.label;
        ctx.fillText(label, textX, y);
      }
    });

    // Label current focal plane value
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`焦平面 ${optics.focalZ.toFixed(1)} μm  (景深 ±${optics.dofHalf.toFixed(1)} μm)`, w - 12, h - 2);
  }
}
