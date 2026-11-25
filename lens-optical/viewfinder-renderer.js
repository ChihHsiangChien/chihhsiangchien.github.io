(function (global) {
  'use strict';

  class ViewfinderRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.size = 216;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.size * this.dpr);
      this.canvas.height = Math.round(this.size * this.dpr);
      this.canvas.style.width = `${this.size}px`;
      this.canvas.style.height = `${this.size}px`;
    }

    _computeLayerBlur(st, layerZMm) {
      if (st.stage1State !== 'real' || st.stage2State === 'past-eyepiece' || st.stage2State === 'real-behind-eye') {
        return 16;
      }
      const zErr = Math.abs(st.stageOffset - layerZMm);
      const ratio = zErr / Math.max(0.001, st.dofMm);
      return Math.min(18, Math.pow(ratio, 1.15) * 4.2);
    }

    render(st, specimenType) {
      const ctx = this.ctx;
      const S = this.size;
      const R = S * 0.5;

      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, S, S);

      // Circular field stop mask
      ctx.beginPath();
      ctx.arc(R, R, R - 2, 0, Math.PI * 2);
      ctx.clip();

      // Illuminated slide background scaled by aperture brightness
      const luma = Math.round(252 * st.brightness);
      const bgTint = Math.round(245 * st.brightness);
      ctx.fillStyle = `rgb(${luma}, ${luma}, ${bgTint})`;
      ctx.fillRect(0, 0, S, S);

      // 180° compound microscope image inversion
      ctx.save();
      ctx.translate(R, R);
      ctx.rotate(Math.PI);

      const zoom = Math.pow(st.nominalMag / 40, 0.72);

      if (specimenType === 'threads') {
        this._drawThreads(ctx, st, zoom);
      } else if (specimenType === 'onion') {
        this._drawOnionCells(ctx, st, zoom);
      } else {
        this._drawLetterB(ctx, st, zoom);
      }

      ctx.restore();

      // Eyepiece optical vignette
      const vig = ctx.createRadialGradient(R, R, R * 0.62, R, R, R);
      vig.addColorStop(0, 'rgba(15, 23, 42, 0)');
      vig.addColorStop(0.86, 'rgba(15, 23, 42, 0.16)');
      vig.addColorStop(1, 'rgba(2, 6, 23, 0.72)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, S, S);

      // Center crosshair & scale bar
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(R - 8, R);
      ctx.lineTo(R + 8, R);
      ctx.moveTo(R, R - 8);
      ctx.lineTo(R, R + 8);
      ctx.stroke();

      this._drawHud(ctx, st, S);
      ctx.restore();
    }

    _withBlur(ctx, blurPx, drawFn) {
      ctx.save();
      if ('filter' in ctx) {
        ctx.filter = blurPx > 0.25 ? `blur(${blurPx.toFixed(1)}px)` : 'none';
      }
      drawFn();
      ctx.restore();
    }

    _drawLetterB(ctx, st, zoom) {
      const blur = this._computeLayerBlur(st, 0);
      this._withBlur(ctx, blur, () => {
        ctx.save();
        ctx.scale(zoom, zoom);

        // Subtle slide grid
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 0.8 / zoom;
        for (let g = -120; g <= 120; g += 24) {
          ctx.beginPath();
          ctx.moveTo(g, -120);
          ctx.lineTo(g, 120);
          ctx.moveTo(-120, g);
          ctx.lineTo(120, g);
          ctx.stroke();
        }

        // Crisp lowercase 'b' (appears as 'q' under 180° inversion!)
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 58px Georgia, "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('b', 0, 2);

        // Reference orientation marker on upper-right stem
        ctx.fillStyle = '#059669';
        ctx.beginPath();
        ctx.arc(14, -22, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    }

    _drawThreads(ctx, st, zoom) {
      const sep = 2.2 * st.obj.dofBaseMm;
      const layers = [
        { z: -sep, color: '#2563eb', angle: -0.58, offset: -5 }, // Bottom: Blue
        { z: 0, color: '#059669', angle: 0.12, offset: 0 },     // Middle: Green
        { z: sep, color: '#dc2626', angle: 0.78, offset: 5 }    // Top: Red
      ];

      for (const layer of layers) {
        const blur = this._computeLayerBlur(st, layer.z);
        this._withBlur(ctx, blur, () => {
          ctx.save();
          ctx.scale(zoom, zoom);
          ctx.rotate(layer.angle);
          ctx.strokeStyle = layer.color;
          ctx.globalAlpha = 0.86;

          for (let s = -2; s <= 2; s++) {
            ctx.lineWidth = s === 0 ? 3.2 : 1.1;
            ctx.beginPath();
            const yBase = layer.offset + s * 2.1;
            ctx.moveTo(-95, yBase + Math.sin(s * 1.4) * 3);
            ctx.bezierCurveTo(-30, yBase - 4, 30, yBase + 4, 95, yBase - Math.cos(s) * 3);
            ctx.stroke();
          }
          ctx.restore();
        });
      }
    }

    _drawOnionCells(ctx, st, zoom) {
      const blur = this._computeLayerBlur(st, 0);
      this._withBlur(ctx, blur, () => {
        ctx.save();
        ctx.scale(zoom, zoom);

        const cellW = 46;
        const cellH = 24;
        for (let row = -5; row <= 5; row++) {
          const xShift = (row % 2) * (cellW * 0.5);
          for (let col = -4; col <= 4; col++) {
            const cx = col * cellW + xShift;
            const cy = row * cellH;
            const x = cx - cellW / 2;
            const y = cy - cellH / 2;

            // Cell interior
            ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
            ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

            // Cell wall
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.6 / Math.max(0.8, zoom * 0.65);
            ctx.strokeRect(x, y, cellW, cellH);

            // Stained nucleus (iodine / methylene blue style)
            const nOffX = ((row * 7 + col * 13) % 11) - 5;
            const nOffY = ((row * 11 + col * 5) % 7) - 3;
            ctx.fillStyle = 'rgba(109, 40, 217, 0.72)';
            ctx.beginPath();
            ctx.ellipse(cx + nOffX, cy + nOffY, 4.4, 3.3, 0.25, 0, Math.PI * 2);
            ctx.fill();

            // Nucleolus
            ctx.fillStyle = 'rgba(76, 29, 149, 0.9)';
            ctx.beginPath();
            ctx.arc(cx + nOffX + 1, cy + nOffY, 1.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      });
    }

    _drawHud(ctx, st, S) {
      // Bottom scale bar & magnification tag
      const scaleUm = Math.round(1000 / Math.max(10, st.nominalMag) * 10);
      const label = scaleUm >= 1000 ? `${(scaleUm / 1000).toFixed(1)} mm` : `${scaleUm} μm`;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.beginPath();
      ctx.roundRect(S / 2 - 44, S - 28, 88, 19, 9);
      ctx.fill();

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(S / 2 - 32, S - 15);
      ctx.lineTo(S / 2 - 8, S - 15);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 9px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${label} • ${st.nominalMag}×`, S / 2 - 4, S - 15);

      // Out-of-range optical warning pill
      if (st.stage1State !== 'real') {
        ctx.fillStyle = 'rgba(220, 38, 38, 0.88)';
        ctx.beginPath();
        ctx.roundRect(S / 2 - 64, 14, 128, 20, 10);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('物距 ≤ f₁：無法成實像', S / 2, 27);
      } else if (st.stage2State === 'past-eyepiece' || st.stage2State === 'real-behind-eye') {
        ctx.fillStyle = 'rgba(217, 119, 6, 0.9)';
        ctx.beginPath();
        ctx.roundRect(S / 2 - 64, 14, 128, 20, 10);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('中間像超出目鏡焦距', S / 2, 27);
      }
    }
  }

  global.LensOptics = global.LensOptics || {};
  global.LensOptics.ViewfinderRenderer = ViewfinderRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
