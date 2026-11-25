(function (global) {
  'use strict';

  const Engine = global.LensOptics.Engine;

  class BenchRenderer {
    constructor(canvas, callbacks) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.callbacks = callbacks || {};

      this.state = null;
      this.viewConfig = {
        cameraMode: 'full',
        highlightStage: 'all',
        layers: {
          rays: true,
          cone: true,
          focal: true,
          body: true,
          virtual: true
        }
      };

      this.cam = { xMin: -66, xMax: 282, yHalf: 105 };
      this.targetCam = { ...this.cam };
      this.userOverrodeCam = false;
      this.animFrameId = null;

      this.dragMode = null; // 'stage' | 'pan' | null
      this.dragStartPx = { x: 0, y: 0 };
      this.dragStartStage = 0;
      this.dragStartCam = null;

      this.width = 800;
      this.height = 500;
      this.dpr = 1;
      this.padding = { left: 24, right: 24, top: 34, bottom: 38 };

      this._bindEvents();
    }

    resize(w, h) {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = Math.max(300, w);
      this.height = Math.max(240, h);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.render();
    }

    setState(opticalState, viewConfig) {
      this.state = opticalState;
      if (viewConfig) {
        this.viewConfig = {
          ...this.viewConfig,
          ...viewConfig,
          layers: { ...this.viewConfig.layers, ...(viewConfig.layers || {}) }
        };
      }
      if (!this.userOverrodeCam) {
        this._computeTargetCamera();
        this._ensureAnimating();
      }
      this.render();
    }

    setCameraMode(mode, immediate) {
      this.viewConfig.cameraMode = mode;
      this.userOverrodeCam = false;
      this._computeTargetCamera();
      if (immediate) {
        this.cam = { ...this.targetCam };
        this.render();
      } else {
        this._ensureAnimating();
      }
    }

    resetCamera() {
      this.userOverrodeCam = false;
      this._computeTargetCamera();
      this._ensureAnimating();
    }

    _computeTargetCamera() {
      if (!this.state) return;
      const st = this.state;
      const mode = this.viewConfig.cameraMode;
      const h2Abs = st.h2 !== null && Number.isFinite(st.h2) ? Math.abs(st.h2) : 88;
      const xImg2 = st.xImg2 !== null && Number.isFinite(st.xImg2) ? st.xImg2 : -28;

      if (mode === 'objective') {
        const yNeed = Math.max(20, Math.min(48, (st.h1 ? Math.abs(st.h1) : 8) * 2.1));
        this.targetCam = {
          xMin: Math.min(-24, st.specX - 18),
          xMax: 218,
          yHalf: yNeed
        };
      } else if (mode === 'eyepiece') {
        const leftBound = Math.max(-95, Math.min(xImg2 - 18, -42));
        const yNeed = Math.max(32, Math.min(165, h2Abs * 1.24));
        this.targetCam = {
          xMin: leftBound,
          xMax: st.eyeX + 28,
          yHalf: yNeed
        };
      } else if (mode === 'aperture') {
        this.targetCam = {
          xMin: -58,
          xMax: 214,
          yHalf: 22
        };
      } else {
        // 'full'
        const leftBound = Math.max(-72, Math.min(Engine.BENCH.lampX - 16, xImg2 - 14));
        const yNeed = Math.max(46, Math.min(155, h2Abs * 1.24));
        this.targetCam = {
          xMin: leftBound,
          xMax: st.eyeX + 34,
          yHalf: yNeed
        };
      }
    }

    _ensureAnimating() {
      if (this.animFrameId !== null) return;
      const step = () => {
        const alpha = 0.22;
        const dxMin = this.targetCam.xMin - this.cam.xMin;
        const dxMax = this.targetCam.xMax - this.cam.xMax;
        const dy = this.targetCam.yHalf - this.cam.yHalf;

        if (Math.abs(dxMin) < 0.08 && Math.abs(dxMax) < 0.08 && Math.abs(dy) < 0.08) {
          this.cam = { ...this.targetCam };
          this.animFrameId = null;
          this.render();
          return;
        }

        this.cam.xMin += dxMin * alpha;
        this.cam.xMax += dxMax * alpha;
        this.cam.yHalf += dy * alpha;
        this.render();
        this.animFrameId = requestAnimationFrame(step);
      };
      this.animFrameId = requestAnimationFrame(step);
    }

    _getTransform() {
      const plotW = Math.max(100, this.width - this.padding.left - this.padding.right);
      const plotH = Math.max(100, this.height - this.padding.top - this.padding.bottom);
      const spanX = Math.max(10, this.cam.xMax - this.cam.xMin);
      const scaleX = plotW / spanX;
      const scaleY = (plotH * 0.5) / Math.max(5, this.cam.yHalf);
      const centerY = this.padding.top + plotH * 0.5;

      return {
        plotW,
        plotH,
        scaleX,
        scaleY,
        centerY,
        toScreenX: (wx) => this.padding.left + (wx - this.cam.xMin) * scaleX,
        toScreenY: (wy) => centerY - wy * scaleY,
        toWorldX: (sx) => this.cam.xMin + (sx - this.padding.left) / scaleX
      };
    }

    _bindEvents() {
      const getLocalPos = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      };

      const isOverStageHandle = (pos) => {
        if (!this.state) return false;
        const t = this._getTransform();
        const sx = t.toScreenX(this.state.specX);
        const sy = t.centerY;
        const dx = pos.x - sx;
        const dy = pos.y - sy;
        return Math.abs(dx) <= 18 && dy >= -48 && dy <= 34;
      };

      this.canvas.addEventListener('pointerdown', (e) => {
        const pos = getLocalPos(e);
        this.canvas.setPointerCapture(e.pointerId);
        this.dragStartPx = pos;
        if (isOverStageHandle(pos)) {
          this.dragMode = 'stage';
          this.dragStartStage = this.state.stageOffset;
          this.canvas.style.cursor = 'ew-resize';
        } else {
          this.dragMode = 'pan';
          this.dragStartCam = { ...this.cam };
          this.userOverrodeCam = true;
          this.canvas.style.cursor = 'grabbing';
        }
      });

      this.canvas.addEventListener('pointermove', (e) => {
        const pos = getLocalPos(e);
        if (!this.dragMode) {
          this.canvas.style.cursor = isOverStageHandle(pos) ? 'ew-resize' : 'grab';
          return;
        }
        const t = this._getTransform();
        const dxPx = pos.x - this.dragStartPx.x;
        if (this.dragMode === 'stage') {
          const dxMm = dxPx / t.scaleX;
          if (typeof this.callbacks.onStageDrag === 'function') {
            this.callbacks.onStageDrag(this.dragStartStage + dxMm);
          }
        } else if (this.dragMode === 'pan' && this.dragStartCam) {
          const spanX = this.dragStartCam.xMax - this.dragStartCam.xMin;
          const dxMm = (dxPx / t.plotW) * spanX;
          this.cam.xMin = this.dragStartCam.xMin - dxMm;
          this.cam.xMax = this.dragStartCam.xMax - dxMm;
          this.targetCam = { ...this.cam };
          this.render();
        }
      });

      const endDrag = (e) => {
        if (this.dragMode && this.canvas.hasPointerCapture(e.pointerId)) {
          this.canvas.releasePointerCapture(e.pointerId);
        }
        this.dragMode = null;
        this.canvas.style.cursor = 'grab';
      };

      this.canvas.addEventListener('pointerup', endDrag);
      this.canvas.addEventListener('pointercancel', endDrag);

      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const pos = getLocalPos(e);
        const t = this._getTransform();
        const wx = t.toWorldX(pos.x);
        const factor = e.deltaY > 0 ? 1.12 : 0.89;
        const curSpan = this.cam.xMax - this.cam.xMin;
        const newSpan = Math.min(500, Math.max(24, curSpan * factor));
        const ratio = (wx - this.cam.xMin) / curSpan;

        this.userOverrodeCam = true;
        this.cam.xMin = wx - ratio * newSpan;
        this.cam.xMax = this.cam.xMin + newSpan;
        this.cam.yHalf = Math.min(220, Math.max(8, this.cam.yHalf * factor));
        this.targetCam = { ...this.cam };
        this.render();
      }, { passive: false });
    }

    render() {
      const ctx = this.ctx;
      const st = this.state;
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.width, this.height);

      // Subtle paper-lab background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.width, this.height);

      if (!st) {
        ctx.restore();
        return;
      }

      const t = this._getTransform();
      const layers = this.viewConfig.layers;
      const hl = this.viewConfig.highlightStage;

      this._drawGridAndAxis(ctx, t);
      if (layers.body) this._drawMechanics(ctx, st, t);
      if (layers.cone) this._drawLampAndCone(ctx, st, t, hl);
      this._drawIrisDiaphragm(ctx, st, t);
      this._drawIIPLine(ctx, st, t, layers.cone);

      this._drawLens(ctx, t.toScreenX(st.x1), t.centerY, Engine.BENCH.objLensHalfH * t.scaleY, '#059669', `物鏡 ${st.obj.mag}×`);
      this._drawLens(ctx, t.toScreenX(st.x2), t.centerY, Engine.BENCH.eyeLensHalfH * t.scaleY, '#7c3aed', `目鏡 ${st.eye.mag}×`);
      this._drawEye(ctx, t.toScreenX(st.eyeX), t.centerY);

      if (layers.focal) this._drawFocalMarkers(ctx, st, t);

      if (layers.rays) {
        const s1Alpha = hl === 'eyepiece' ? 0.25 : 0.92;
        const s2Alpha = hl === 'objective' ? 0.22 : 0.92;
        this._drawRayStage(ctx, st.stage1Rays, t, s1Alpha, false, st.stage1State === 'virtual' && layers.virtual);
        if (st.stage1State === 'real' && st.stage2Rays.length > 0) {
          this._drawRayStage(ctx, st.stage2Rays, t, s2Alpha, true, layers.virtual);
        }
      }

      // Draw object & image arrows
      this._drawStageAndSpecimen(ctx, st, t);

      if (st.stage1State === 'real' && Number.isFinite(st.xImg1) && Number.isFinite(st.h1)) {
        const emphasizeReal = hl === 'objective';
        if (emphasizeReal) {
          this._drawGlowVertical(ctx, t.toScreenX(st.xImg1), t.centerY, t.toScreenY(st.h1), 'rgba(16, 185, 129, 0.28)');
        }
        this._drawArrow(ctx, t.toScreenX(st.xImg1), t.centerY, t.toScreenY(st.h1), '#059669', '中間實像', false);
      } else if (st.stage1State === 'virtual' && Number.isFinite(st.xImg1) && Number.isFinite(st.h1)) {
        this._drawArrow(ctx, t.toScreenX(st.xImg1), t.centerY, t.toScreenY(st.h1), '#059669', '物鏡虛像', true);
      }

      if (layers.virtual && st.stage1State === 'real' && st.stage2State === 'virtual' && Number.isFinite(st.xImg2) && Number.isFinite(st.h2)) {
        if (hl === 'eyepiece') {
          this._drawGlowVertical(ctx, t.toScreenX(st.xImg2), t.centerY, t.toScreenY(st.h2), 'rgba(245, 158, 11, 0.25)');
        }
        this._drawArrow(ctx, t.toScreenX(st.xImg2), t.centerY, t.toScreenY(st.h2), '#d97706', '最終虛像', true);
      }

      // Objective Loupe Inset when working distance is tiny in full view
      const objDistPx = (st.x1 - st.specX) * t.scaleX;
      if (this.viewConfig.cameraMode === 'full' && !this.userOverrodeCam && objDistPx < 54) {
        this._drawObjectiveLoupe(ctx, st);
      }

      this._drawLegendOverlay(ctx, st);
      ctx.restore();
    }

    _drawGridAndAxis(ctx, t) {
      const spanX = this.cam.xMax - this.cam.xMin;
      const stepMm = spanX > 220 ? 25 : (spanX > 90 ? 10 : 5);
      const startX = Math.floor(this.cam.xMin / stepMm) * stepMm;

      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#f1f5f9';
      ctx.beginPath();
      for (let x = startX; x <= this.cam.xMax; x += stepMm) {
        const sx = t.toScreenX(x);
        ctx.moveTo(sx, this.padding.top);
        ctx.lineTo(sx, this.height - this.padding.bottom);
      }
      ctx.stroke();

      // Optical axis
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(this.padding.left, t.centerY);
      ctx.lineTo(this.width - this.padding.right, t.centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bottom millimeter ruler
      const rulerY = this.height - 20;
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(this.padding.left, rulerY);
      ctx.lineTo(this.width - this.padding.right, rulerY);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      const labelEvery = stepMm >= 25 ? 50 : (stepMm >= 10 ? 20 : 10);
      for (let x = startX; x <= this.cam.xMax; x += stepMm) {
        const sx = t.toScreenX(x);
        if (sx < this.padding.left + 8 || sx > this.width - this.padding.right - 8) continue;
        const isMajor = Math.abs(x % labelEvery) < 1e-6;
        ctx.beginPath();
        ctx.moveTo(sx, rulerY - (isMajor ? 5 : 3));
        ctx.lineTo(sx, rulerY + (isMajor ? 2 : 0));
        ctx.strokeStyle = isMajor ? '#94a3b8' : '#cbd5e1';
        ctx.stroke();
        if (isMajor) {
          ctx.fillText(`${x}mm`, sx, rulerY + 12);
        }
      }
      ctx.restore();
    }

    _drawMechanics(ctx, st, t) {
      ctx.save();
      const noseX = t.toScreenX(Engine.BENCH.nosepieceX);
      const x1Px = t.toScreenX(st.x1);
      const x2Px = t.toScreenX(st.x2);
      const tubeHalfPx = Math.max(24, Math.min(48, Engine.BENCH.eyeLensHalfH * t.scaleY * 0.95));

      // Body tube from nosepiece to eyepiece
      ctx.fillStyle = 'rgba(241, 245, 249, 0.72)';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.2;
      ctx.fillRect(noseX, t.centerY - tubeHalfPx, x2Px - noseX, tubeHalfPx * 2);
      ctx.strokeRect(noseX, t.centerY - tubeHalfPx, x2Px - noseX, tubeHalfPx * 2);

      // Parfocal objective barrel (nosepiece -> x1)
      const barrelW = Math.max(4, noseX - x1Px);
      const barrelHalfPx = Math.max(14, Math.min(30, Engine.BENCH.objLensHalfH * t.scaleY * 0.95));
      ctx.fillStyle = 'rgba(148, 163, 184, 0.34)';
      ctx.strokeStyle = '#64748b';
      ctx.fillRect(x1Px, t.centerY - barrelHalfPx, barrelW, barrelHalfPx * 2);
      ctx.strokeRect(x1Px, t.centerY - barrelHalfPx, barrelW, barrelHalfPx * 2);

      // Nosepiece mount vertical collar
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(noseX, t.centerY - tubeHalfPx - 5);
      ctx.lineTo(noseX, t.centerY + tubeHalfPx + 5);
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('鼻輪基準', noseX, t.centerY - tubeHalfPx - 10);
      ctx.restore();
    }

    _drawLampAndCone(ctx, st, t, hl) {
      const c = st.cone;
      const lampSx = t.toScreenX(c.lampX);
      const irisSx = t.toScreenX(c.irisX);
      const specSx = t.toScreenX(st.specX);
      const x1Sx = t.toScreenX(st.x1);
      const afterEndSx = t.toScreenX(c.afterLensEndX);

      ctx.save();
      const coneOpacity = hl === 'aperture' ? 0.24 : 0.13;

      // Lamp bulb glyph
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(lampSx, t.centerY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#92400e';
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('光源', lampSx, t.centerY + 20);

      // Blocked marginal rays (when aperture < 1.0)
      if (st.aperture < 0.98) {
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.42)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        // Lamp to iris outer edge
        ctx.moveTo(lampSx, t.centerY);
        ctx.lineTo(irisSx, t.toScreenY(Engine.BENCH.irisOuterHalfH * 0.78));
        ctx.moveTo(lampSx, t.centerY);
        ctx.lineTo(irisSx, t.toScreenY(-Engine.BENCH.irisOuterHalfH * 0.78));
        // Specimen to lens outer rim (blocked marginal boundary)
        ctx.moveTo(specSx, t.centerY);
        ctx.lineTo(x1Sx, t.toScreenY(c.maxConeHalf));
        ctx.moveTo(specSx, t.centerY);
        ctx.lineTo(x1Sx, t.toScreenY(-c.maxConeHalf));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Transmitted cone: Lamp -> Iris -> Specimen -> Objective -> Image/IIP
      ctx.fillStyle = `rgba(245, 158, 11, ${coneOpacity})`;
      ctx.beginPath();
      ctx.moveTo(lampSx, t.centerY);
      ctx.lineTo(irisSx, t.toScreenY(c.irisGapHalf));
      ctx.lineTo(irisSx, t.toScreenY(-c.irisGapHalf));
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(irisSx, t.toScreenY(c.irisGapHalf));
      ctx.lineTo(specSx, t.centerY);
      ctx.lineTo(irisSx, t.toScreenY(-c.irisGapHalf));
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(specSx, t.centerY);
      ctx.lineTo(x1Sx, t.toScreenY(c.effConeHalf));
      ctx.lineTo(x1Sx, t.toScreenY(-c.effConeHalf));
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x1Sx, t.toScreenY(c.effConeHalf));
      ctx.lineTo(afterEndSx, t.toScreenY(c.afterLensEndYTop));
      ctx.lineTo(afterEndSx, t.toScreenY(c.afterLensEndYBot));
      ctx.lineTo(x1Sx, t.toScreenY(-c.effConeHalf));
      ctx.closePath();
      ctx.fill();

      // Crisp boundary rays for the transmitted cone
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(specSx, t.centerY);
      ctx.lineTo(x1Sx, t.toScreenY(c.effConeHalf));
      ctx.lineTo(afterEndSx, t.toScreenY(c.afterLensEndYTop));
      ctx.moveTo(specSx, t.centerY);
      ctx.lineTo(x1Sx, t.toScreenY(-c.effConeHalf));
      ctx.lineTo(afterEndSx, t.toScreenY(c.afterLensEndYBot));
      ctx.stroke();

      ctx.restore();
    }

    _drawIrisDiaphragm(ctx, st, t) {
      const irisSx = t.toScreenX(Engine.BENCH.irisX);
      const outerH = Math.max(18, Engine.BENCH.irisOuterHalfH * t.scaleY);
      const gapHalfPx = Math.max(2, st.cone.irisGapHalf * t.scaleY);

      ctx.save();
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;

      const bladeW = 6;
      const topBladeH = Math.max(4, outerH - gapHalfPx);
      // Top iris blade
      ctx.fillRect(irisSx - bladeW / 2, t.centerY - outerH, bladeW, topBladeH);
      ctx.strokeRect(irisSx - bladeW / 2, t.centerY - outerH, bladeW, topBladeH);
      // Bottom iris blade
      ctx.fillRect(irisSx - bladeW / 2, t.centerY + gapHalfPx, bladeW, topBladeH);
      ctx.strokeRect(irisSx - bladeW / 2, t.centerY + gapHalfPx, bladeW, topBladeH);

      ctx.fillStyle = '#334155';
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`光圈 ${Math.round(st.aperture * 100)}%`, irisSx, t.centerY - outerH - 8);
      ctx.restore();
    }

    _drawIIPLine(ctx, st, t, showCoc) {
      const iipSx = t.toScreenX(Engine.BENCH.iipX);
      const lineHalf = Math.max(36, Math.min(72, Engine.BENCH.eyeLensHalfH * t.scaleY * 1.1));

      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(iipSx, t.centerY - lineHalf);
      ctx.lineTo(iipSx, t.centerY + lineHalf);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#dc2626';
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('中間像面 IIP', iipSx, t.centerY - lineHalf - 7);

      // Highlight Circle of Confusion blur bar on IIP when defocused
      if (showCoc && st.cocRadiusAtIipMm !== null && st.cocRadiusAtIipMm > 0.15) {
        const yTop = t.toScreenY(st.cone.iipYTop);
        const yBot = t.toScreenY(st.cone.iipYBot);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(iipSx, yTop);
        ctx.lineTo(iipSx, yBot);
        ctx.stroke();

        ctx.fillStyle = '#b45309';
        ctx.font = '700 10px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`彌散半徑 ${st.cocRadiusAtIipMm.toFixed(2)}mm`, iipSx + 7, t.centerY + 14);
      }
      ctx.restore();
    }

    _drawLens(ctx, sx, cy, halfPx, color, label) {
      const h = Math.max(20, Math.min(95, halfPx));
      const bulge = Math.max(5, Math.min(11, h * 0.2));

      ctx.save();
      // Glass lens body
      const grad = ctx.createLinearGradient(sx - bulge, cy, sx + bulge, cy);
      grad.addColorStop(0, `${color}22`);
      grad.addColorStop(0.5, `${color}40`);
      grad.addColorStop(1, `${color}22`);

      ctx.fillStyle = grad;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, cy - h);
      ctx.quadraticCurveTo(sx + bulge, cy, sx, cy + h);
      ctx.quadraticCurveTo(sx - bulge, cy, sx, cy - h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Thin principal plane axis
      ctx.strokeStyle = `${color}66`;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(sx, cy - h - 4);
      ctx.lineTo(sx, cy + h + 4);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, sx, cy - h - 10);
      ctx.restore();
    }

    _drawEye(ctx, sx, cy) {
      ctx.save();
      ctx.translate(sx, cy);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.quadraticCurveTo(0, -13, 14, 0);
      ctx.quadraticCurveTo(0, 13, -14, 0);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(-3, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-4, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#475569';
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('觀察眼', 0, 24);
      ctx.restore();
    }

    _drawFocalMarkers(ctx, st, t) {
      const drawDot = (wx, label, color, yOffset) => {
        const sx = t.toScreenX(wx);
        if (sx < this.padding.left || sx > this.width - this.padding.right) return;
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, t.centerY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '700 10px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, sx, t.centerY + yOffset);
        ctx.restore();
      };

      drawDot(st.x1 - st.f1, 'F₁', '#059669', 15);
      drawDot(st.x1 + st.f1, "F₁'", '#059669', 15);
      if (st.x1 - 2 * st.f1 > this.cam.xMin + 8) {
        drawDot(st.x1 - 2 * st.f1, '2F₁', '#059669', -10);
      }

      drawDot(st.x2 - st.f2, 'F₂', '#7c3aed', 15);
      drawDot(st.x2 + st.f2, "F₂'", '#7c3aed', 15);
    }

    _drawRayStage(ctx, rays, t, alpha, isStage2, drawVirtualExt) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = isStage2 ? 1.7 : 1.9;

      for (const ray of rays) {
        const x0 = t.toScreenX(ray.p0.x);
        const y0 = t.toScreenY(ray.p0.y);
        const xl = t.toScreenX(ray.pLens.x);
        const yl = t.toScreenY(ray.pLens.y);
        const xe = t.toScreenX(ray.endX);
        const ye = t.toScreenY(ray.endY);

        // Skip pathologically extreme rays when object sits right next to focal point
        if (![x0, y0, xl, yl, xe, ye].every(Number.isFinite)) continue;
        if (Math.abs(yl - t.centerY) > 1500) continue;

        ctx.strokeStyle = ray.color;
        ctx.fillStyle = ray.color;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(xl, yl);
        ctx.lineTo(xe, ye);
        ctx.stroke();

        // Directional arrowheads on incoming & refracted segments
        this._drawArrowHeadOnSegment(ctx, x0, y0, xl, yl, 0.55);
        this._drawArrowHeadOnSegment(ctx, xl, yl, xe, ye, 0.45);

        // Virtual backward extension (dashed)
        if (drawVirtualExt && ray.backEndX !== null && ray.backEndY !== null) {
          const xb = t.toScreenX(ray.backEndX);
          const yb = t.toScreenY(ray.backEndY);
          if (Number.isFinite(xb) && Number.isFinite(yb)) {
            ctx.save();
            ctx.setLineDash([5, 4]);
            ctx.globalAlpha = alpha * 0.72;
            ctx.beginPath();
            ctx.moveTo(xl, yl);
            ctx.lineTo(xb, yb);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      ctx.restore();
    }

    _drawArrowHeadOnSegment(ctx, x1, y1, x2, y2, frac) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 24) return;
      const mx = x1 + dx * frac;
      const my = y1 + dy * frac;
      const ang = Math.atan2(dy, dx);
      const sz = 5.5;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(sz * 0.6, 0);
      ctx.lineTo(-sz * 0.7, -sz * 0.48);
      ctx.lineTo(-sz * 0.7, sz * 0.48);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    _drawStageAndSpecimen(ctx, st, t) {
      const sx = t.toScreenX(st.specX);
      const tipY = t.toScreenY(st.h0);

      // Draggable stage platform & grip
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(sx - 3, t.centerY + 2, 6, 18);
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(sx - 10, t.centerY + 18, 20, 12, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⇄', sx, t.centerY + 27);
      ctx.restore();

      this._drawArrow(ctx, sx, t.centerY, tipY, '#0f172a', '標本', false);
    }

    _drawArrow(ctx, sx, baseY, tipY, color, label, isDashed) {
      if (!Number.isFinite(sx) || !Number.isFinite(tipY)) return;
      const clampedTipY = Math.max(this.padding.top - 10, Math.min(this.height - this.padding.bottom + 10, tipY));
      const dir = clampedTipY <= baseY ? -1 : 1; // -1 means pointing up
      const shaftLen = Math.abs(clampedTipY - baseY);

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2.6;
      if (isDashed) ctx.setLineDash([5, 4]);

      ctx.beginPath();
      ctx.moveTo(sx, baseY);
      ctx.lineTo(sx, clampedTipY);
      ctx.stroke();
      ctx.setLineDash([]);

      if (shaftLen >= 4) {
        const headSize = Math.min(8, Math.max(4.5, shaftLen * 0.35));
        ctx.beginPath();
        ctx.moveTo(sx, clampedTipY);
        ctx.lineTo(sx - headSize * 0.65, clampedTipY - dir * headSize);
        ctx.lineTo(sx + headSize * 0.65, clampedTipY - dir * headSize);
        ctx.closePath();
        ctx.fill();
      }

      if (label) {
        ctx.font = '700 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        const labelY = dir < 0 ? clampedTipY - 8 : clampedTipY + 14;
        ctx.fillText(label, sx, Math.max(14, Math.min(this.height - 6, labelY)));
      }
      ctx.restore();
    }

    _drawGlowVertical(ctx, sx, y0, y1, color) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, y0);
      ctx.lineTo(sx, y1);
      ctx.stroke();
      ctx.restore();
    }

    _drawObjectiveLoupe(ctx, st) {
      const boxX = 14;
      const boxY = 14;
      const boxW = 228;
      const boxH = 128;

      ctx.save();
      // Card frame
      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.2;
      ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();

      // Title bar
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`物鏡近拍放大 (${st.obj.mag}× | u₁=${st.u1.toFixed(2)}mm)`, boxX + 10, boxY + 16);

      // Clip interior
      ctx.beginPath();
      ctx.roundRect(boxX + 4, boxY + 22, boxW - 8, boxH - 26, 6);
      ctx.clip();

      const lxMin = Math.min(st.specX - 3, st.x1 - st.f1 * 1.45);
      const lxMax = st.x1 + st.f1 * 1.35;
      const lyHalf = Math.max(st.h0 * 1.9, 0.35);
      const pad = 12;
      const sxFn = (wx) => boxX + pad + ((wx - lxMin) / Math.max(1, lxMax - lxMin)) * (boxW - pad * 2);
      const cy = boxY + 22 + (boxH - 26) * 0.54;
      const syScale = ((boxH - 36) * 0.5) / lyHalf;
      const syFn = (wy) => cy - wy * syScale;

      // Optical axis
      ctx.strokeStyle = '#cbd5e1';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(boxX + 6, cy);
      ctx.lineTo(boxX + boxW - 6, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Objective lens & F1
      const lensSx = sxFn(st.x1);
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(lensSx, boxY + 28);
      ctx.lineTo(lensSx, boxY + boxH - 10);
      ctx.stroke();

      const f1Sx = sxFn(st.x1 - st.f1);
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(f1Sx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '700 9px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('F₁', f1Sx, cy + 12);

      // Principal rays in loupe
      ctx.lineWidth = 1.4;
      for (const ray of st.stage1Rays) {
        const y0 = syFn(ray.p0.y);
        const yl = syFn(ray.pLens.y);
        const xEnd = Math.min(lxMax, ray.endX);
        const ye = syFn(ray.pLens.y + ray.sOut * (xEnd - st.x1));
        if (![y0, yl, ye].every(Number.isFinite)) continue;
        ctx.strokeStyle = ray.color;
        ctx.beginPath();
        ctx.moveTo(sxFn(ray.p0.x), y0);
        ctx.lineTo(sxFn(ray.pLens.x), yl);
        ctx.lineTo(sxFn(xEnd), ye);
        ctx.stroke();
      }

      // Specimen arrow
      const specSx = sxFn(st.specX);
      const specTipY = syFn(st.h0);
      ctx.strokeStyle = '#0f172a';
      ctx.fillStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(specSx, cy);
      ctx.lineTo(specSx, specTipY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(specSx, specTipY);
      ctx.lineTo(specSx - 3.5, specTipY + 5);
      ctx.lineTo(specSx + 3.5, specTipY + 5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    _drawLegendOverlay(ctx, st) {
      const items = [
        { color: Engine.RAY_COLORS.parallel, text: '平行主軸→過焦點' },
        { color: Engine.RAY_COLORS.center, text: '過鏡心不偏折' },
        { color: Engine.RAY_COLORS.focal, text: '過前焦點→平行射出' }
      ];
      ctx.save();
      const x = 14;
      const y = this.height - 54;
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.textAlign = 'left';

      let legendW = 14;
      for (const item of items) {
        legendW += 16 + ctx.measureText(item.text).width + 12;
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, legendW, 24, 8);
      ctx.fill();
      ctx.stroke();

      let curX = x + 10;
      for (const item of items) {
        ctx.fillStyle = item.color;
        ctx.fillRect(curX, y + 10, 12, 3);
        ctx.fillStyle = '#334155';
        ctx.fillText(item.text, curX + 16, y + 15);
        curX += 16 + ctx.measureText(item.text).width + 12;
      }

      // Drag hint pill on right (only when space permits without overlap)
      const hint = st.isFocused ? '拖曳標本桿微調對焦 • 滾輪縮放' : '對焦未準：拖曳標本桿或點「一鍵對焦」';
      const hw = ctx.measureText(hint).width + 18;
      if (x + legendW + 12 < this.width - hw - 14) {
        ctx.fillStyle = st.isFocused ? 'rgba(241, 245, 249, 0.92)' : 'rgba(254, 243, 199, 0.95)';
        ctx.strokeStyle = st.isFocused ? '#cbd5e1' : '#f59e0b';
        ctx.beginPath();
        ctx.roundRect(this.width - hw - 14, y, hw, 24, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = st.isFocused ? '#475569' : '#92400e';
        ctx.fillText(hint, this.width - hw - 5, y + 15);
      }
      ctx.restore();
    }
  }

  global.LensOptics = global.LensOptics || {};
  global.LensOptics.BenchRenderer = BenchRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
