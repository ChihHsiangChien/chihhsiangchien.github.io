(function (global) {
  'use strict';

  const BENCH = Object.freeze({
    lampX: -48,
    irisX: -16,
    spec0X: 0,
    nosepieceX: 45,
    iipX: 200,
    nearPoint: 250,
    objLensHalfH: 14,
    eyeLensHalfH: 30,
    irisOuterHalfH: 15
  });

  const OBJECTIVES = Object.freeze({
    4: Object.freeze({
      mag: 4,
      na: 0.10,
      focusMin: -12.0,
      focusMax: 6.0,
      focusStep: 0.05,
      focusUnit: 'mm',
      dofBaseMm: 0.45,
      color: '#059669'
    }),
    10: Object.freeze({
      mag: 10,
      na: 0.25,
      focusMin: -1.5,
      focusMax: 0.8,
      focusStep: 0.005,
      focusUnit: 'mm',
      dofBaseMm: 0.08,
      color: '#059669'
    }),
    40: Object.freeze({
      mag: 40,
      na: 0.65,
      focusMin: -0.12,
      focusMax: 0.06,
      focusStep: 0.001,
      focusUnit: 'um',
      dofBaseMm: 0.008,
      color: '#059669'
    })
  });

  const EYEPIECES = Object.freeze({
    5: Object.freeze({ mag: 5, f: 50 }),
    10: Object.freeze({ mag: 10, f: 25 }),
    15: Object.freeze({ mag: 15, f: 250 / 15 })
  });

  const RAY_COLORS = Object.freeze({
    parallel: '#dc2626',
    center: '#2563eb',
    focal: '#0d9488'
  });

  /**
   * ABCD thin-lens refraction: y unchanged, slope out = slope in - y / f.
   * @param {number} _xLens - Principal plane x (kept for signature clarity)
   * @param {number} f - Focal length in mm
   * @param {number} yHit - Hit height on lens plane in mm
   * @param {number} slopeIn - Incoming ray dy/dx
   * @returns {number} Outgoing ray dy/dx
   */
  function refractThinLens(_xLens, f, yHit, slopeIn) {
    return slopeIn - yHit / f;
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  /**
   * Compute parfocal geometry for a given objective & eyepiece combination.
   */
  function getParfocalGeometry(objMag, eyeMag) {
    const obj = OBJECTIVES[objMag] || OBJECTIVES[4];
    const eye = EYEPIECES[eyeMag] || EYEPIECES[10];

    const u1Ideal = BENCH.iipX / (1 + obj.mag);
    const v1Ideal = BENCH.iipX - u1Ideal;
    const f1 = (u1Ideal * v1Ideal) / BENCH.iipX;
    const x1 = u1Ideal;
    const barrelLen = BENCH.nosepieceX - x1;
    const h0 = 8.0 / obj.mag;

    const f2 = eye.f;
    const u2Ideal = (BENCH.nearPoint * f2) / (BENCH.nearPoint + f2);
    const x2 = BENCH.iipX + u2Ideal;
    const eyeX = x2 + 24;

    return {
      obj,
      eye,
      u1Ideal,
      v1Ideal,
      f1,
      x1,
      barrelLen,
      h0,
      f2,
      u2Ideal,
      x2,
      eyeX
    };
  }

  /**
   * Compute full two-stage thin-lens optical state, principal rays, aperture cone, and DoF metrics.
   */
  function computeOpticalState(params) {
    const objMag = OBJECTIVES[params.objMag] ? params.objMag : 4;
    const eyeMag = EYEPIECES[params.eyeMag] ? params.eyeMag : 10;
    const aperture = clamp(typeof params.aperture === 'number' ? params.aperture : 1.0, 0.2, 1.0);
    const geom = getParfocalGeometry(objMag, eyeMag);
    const { obj, eye, f1, x1, h0, f2, x2, eyeX } = geom;

    const rawOffset = typeof params.stageOffset === 'number' && Number.isFinite(params.stageOffset)
      ? params.stageOffset
      : 0;
    const maxSpecX = x1 - 0.2;
    const specX = Math.min(BENCH.spec0X + rawOffset, maxSpecX);
    const stageOffset = specX - BENCH.spec0X;
    const u1 = Math.max(0.2, x1 - specX);

    // Stage 1: Objective thin-lens imaging
    const eps1 = Math.max(0.02, f1 * 0.003);
    let stage1State;
    if (u1 > f1 + eps1) {
      stage1State = 'real';
    } else if (Math.abs(u1 - f1) <= eps1) {
      stage1State = 'at-focus';
    } else {
      stage1State = 'virtual';
    }

    let v1 = null;
    let xImg1 = null;
    let m1 = null;
    let h1 = null;

    if (stage1State !== 'at-focus') {
      v1 = (u1 * f1) / (u1 - f1);
      xImg1 = x1 + v1;
      m1 = -v1 / u1;
      h1 = h0 * m1;
    }

    // Build Stage 1 principal rays from (specX, h0)
    const stage1Rays = [];
    {
      // 1. Parallel to axis -> refracts through F1'
      const sOutPar = refractThinLens(x1, f1, h0, 0);
      stage1Rays.push({
        id: 'parallel',
        label: '平行主軸過焦點',
        color: RAY_COLORS.parallel,
        p0: { x: specX, y: h0 },
        pLens: { x: x1, y: h0 },
        sIn: 0,
        sOut: sOutPar,
        endX: stage1State === 'real' ? xImg1 : x2,
        endY: stage1State === 'real' ? h1 : h0 + sOutPar * (x2 - x1),
        backEndX: stage1State === 'virtual' ? xImg1 : null,
        backEndY: stage1State === 'virtual' ? h1 : null
      });

      // 2. Through optical center O1
      const sInCtr = -h0 / u1;
      const sOutCtr = refractThinLens(x1, f1, 0, sInCtr);
      stage1Rays.push({
        id: 'center',
        label: '過透鏡中心不偏折',
        color: RAY_COLORS.center,
        p0: { x: specX, y: h0 },
        pLens: { x: x1, y: 0 },
        sIn: sInCtr,
        sOut: sOutCtr,
        endX: stage1State === 'real' ? xImg1 : x2,
        endY: stage1State === 'real' ? h1 : sOutCtr * (x2 - x1),
        backEndX: stage1State === 'virtual' ? xImg1 : null,
        backEndY: stage1State === 'virtual' ? h1 : null
      });

      // 3. Through front focus F1 -> emerges parallel
      if (stage1State !== 'at-focus') {
        const sInFoc = -h0 / (u1 - f1);
        const yHitFoc = h0 + sInFoc * u1;
        const sOutFoc = refractThinLens(x1, f1, yHitFoc, sInFoc);
        stage1Rays.push({
          id: 'focal',
          label: '過前焦點平行射出',
          color: RAY_COLORS.focal,
          p0: { x: specX, y: h0 },
          pLens: { x: x1, y: yHitFoc },
          sIn: sInFoc,
          sOut: sOutFoc,
          endX: stage1State === 'real' ? xImg1 : x2,
          endY: stage1State === 'real' ? h1 : yHitFoc + sOutFoc * (x2 - x1),
          backEndX: stage1State === 'virtual' ? xImg1 : null,
          backEndY: stage1State === 'virtual' ? h1 : null
        });
      }
    }

    // Stage 2: Eyepiece thin-lens imaging
    let u2 = null;
    let v2 = null;
    let xImg2 = null;
    let m2 = null;
    let h2 = null;
    let stage2State = 'unavailable';
    const stage2Rays = [];

    if (stage1State === 'real') {
      u2 = x2 - xImg1;
      const eps2 = Math.max(0.05, f2 * 0.004);

      if (u2 <= 0.1) {
        stage2State = 'past-eyepiece';
      } else if (u2 < f2 - eps2) {
        stage2State = 'virtual';
      } else if (Math.abs(u2 - f2) <= eps2) {
        stage2State = 'infinity';
      } else {
        stage2State = 'real-behind-eye';
      }

      if (stage2State === 'virtual' || stage2State === 'real-behind-eye') {
        v2 = (u2 * f2) / (u2 - f2);
        xImg2 = x2 + v2;
        m2 = -v2 / u2;
        h2 = h1 * m2;
      }

      if (stage2State !== 'past-eyepiece') {
        const forwardEndX = stage2State === 'real-behind-eye'
          ? clamp(xImg2, eyeX + 12, x2 + 120)
          : eyeX + 12;

        // 1. Parallel from intermediate real image -> refracts through F2'
        const sOut2Par = refractThinLens(x2, f2, h1, 0);
        stage2Rays.push({
          id: 'parallel',
          color: RAY_COLORS.parallel,
          p0: { x: xImg1, y: h1 },
          pLens: { x: x2, y: h1 },
          sIn: 0,
          sOut: sOut2Par,
          endX: forwardEndX,
          endY: h1 + sOut2Par * (forwardEndX - x2),
          backEndX: stage2State === 'virtual' ? xImg2 : (stage2State === 'infinity' ? xImg1 - 90 : null),
          backEndY: stage2State === 'virtual' ? h2 : (stage2State === 'infinity' ? h1 + sOut2Par * (xImg1 - 90 - x2) : null)
        });

        // 2. Through eyepiece optical center O2
        const sIn2Ctr = -h1 / u2;
        const sOut2Ctr = refractThinLens(x2, f2, 0, sIn2Ctr);
        stage2Rays.push({
          id: 'center',
          color: RAY_COLORS.center,
          p0: { x: xImg1, y: h1 },
          pLens: { x: x2, y: 0 },
          sIn: sIn2Ctr,
          sOut: sOut2Ctr,
          endX: forwardEndX,
          endY: sOut2Ctr * (forwardEndX - x2),
          backEndX: stage2State === 'virtual' ? xImg2 : (stage2State === 'infinity' ? xImg1 - 90 : null),
          backEndY: stage2State === 'virtual' ? h2 : (stage2State === 'infinity' ? sOut2Ctr * (xImg1 - 90 - x2) : null)
        });

        // 3. Aligned with eyepiece front focus F2 -> emerges parallel
        if (stage2State !== 'infinity') {
          const sIn2Foc = h1 / (f2 - u2);
          const yHit2Foc = h1 + sIn2Foc * u2;
          const sOut2Foc = refractThinLens(x2, f2, yHit2Foc, sIn2Foc);
          stage2Rays.push({
            id: 'focal',
            color: RAY_COLORS.focal,
            p0: { x: xImg1, y: h1 },
            pLens: { x: x2, y: yHit2Foc },
            sIn: sIn2Foc,
            sOut: sOut2Foc,
            endX: forwardEndX,
            endY: yHit2Foc + sOut2Foc * (forwardEndX - x2),
            backEndX: stage2State === 'virtual' ? xImg2 : null,
            backEndY: stage2State === 'virtual' ? h2 : null
          });
        }
      }
    }

    // Aperture & Depth-of-Field physics
    const maxConeHalf = BENCH.objLensHalfH * 0.85;
    const effConeHalf = maxConeHalf * aperture;
    const irisGapHalf = (BENCH.irisOuterHalfH * 0.78) * aperture;

    const naEff = obj.na * aperture;
    const brightness = 0.18 + 0.82 * Math.pow(aperture, 1.6);
    const dofFactor = 1 / aperture;
    const dofMm = obj.dofBaseMm * dofFactor;

    const iipErrorMm = stage1State === 'real' ? xImg1 - BENCH.iipX : null;
    let cocRadiusAtIipMm = null;
    if (stage1State === 'real') {
      cocRadiusAtIipMm = effConeHalf * Math.abs(xImg1 - BENCH.iipX) / Math.max(1, Math.abs(xImg1 - x1));
    }

    const isFocused = stage1State === 'real' && Math.abs(xImg1 - BENCH.iipX) <= 2.5;

    // Illumination / axial light-cone geometry (from axial specimen point through lens aperture)
    const cone = {
      lampX: BENCH.lampX,
      irisX: BENCH.irisX,
      irisGapHalf,
      maxConeHalf,
      effConeHalf,
      transmittedTop: [{ x: BENCH.lampX, y: 0 }, { x: BENCH.irisX, y: irisGapHalf }, { x: specX, y: 0 }, { x: x1, y: effConeHalf }],
      transmittedBottom: [{ x: BENCH.lampX, y: 0 }, { x: BENCH.irisX, y: -irisGapHalf }, { x: specX, y: 0 }, { x: x1, y: -effConeHalf }],
      blockedTop: [{ x: BENCH.lampX, y: 0 }, { x: BENCH.irisX, y: BENCH.irisOuterHalfH * 0.78 }, { x: specX, y: 0 }, { x: x1, y: maxConeHalf }],
      blockedBottom: [{ x: BENCH.lampX, y: 0 }, { x: BENCH.irisX, y: -BENCH.irisOuterHalfH * 0.78 }, { x: specX, y: 0 }, { x: x1, y: -maxConeHalf }],
      afterLensEndX: stage1State === 'real' ? Math.max(BENCH.iipX, xImg1) : BENCH.iipX,
      afterLensEndYTop: null,
      afterLensEndYBot: null
    };

    if (stage1State === 'real') {
      const slopeTop = -effConeHalf / Math.max(1, xImg1 - x1);
      const endX = Math.min(x2 - 2, Math.max(BENCH.iipX + 4, xImg1));
      cone.afterLensEndX = endX;
      cone.afterLensEndYTop = effConeHalf + slopeTop * (endX - x1);
      cone.afterLensEndYBot = -effConeHalf - slopeTop * (endX - x1);
      cone.iipYTop = effConeHalf + slopeTop * (BENCH.iipX - x1);
      cone.iipYBot = -effConeHalf - slopeTop * (BENCH.iipX - x1);
    } else {
      const endX = BENCH.iipX;
      const slopeTop = effConeHalf / u1 - effConeHalf / f1;
      cone.afterLensEndX = endX;
      cone.afterLensEndYTop = effConeHalf + slopeTop * (endX - x1);
      cone.afterLensEndYBot = -cone.afterLensEndYTop;
      cone.iipYTop = cone.afterLensEndYTop;
      cone.iipYBot = cone.afterLensEndYBot;
    }

    const nominalMag = obj.mag * eye.mag;
    const actualM1 = m1 !== null ? Math.abs(m1) : null;
    const actualM2 = m2 !== null ? Math.abs(m2) : null;
    const actualTotalMag = actualM1 !== null && actualM2 !== null ? actualM1 * actualM2 : null;

    return {
      ...geom,
      stageOffset,
      specX,
      u1,
      v1,
      xImg1,
      m1,
      h1,
      stage1State,
      stage1Rays,
      u2,
      v2,
      xImg2,
      m2,
      h2,
      stage2State,
      stage2Rays,
      aperture,
      naEff,
      brightness,
      dofFactor,
      dofMm,
      iipErrorMm,
      cocRadiusAtIipMm,
      isFocused,
      nominalMag,
      actualM1,
      actualM2,
      actualTotalMag,
      cone
    };
  }

  global.LensOptics = global.LensOptics || {};
  global.LensOptics.Engine = {
    BENCH,
    OBJECTIVES,
    EYEPIECES,
    RAY_COLORS,
    refractThinLens,
    getParfocalGeometry,
    computeOpticalState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.LensOptics.Engine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
