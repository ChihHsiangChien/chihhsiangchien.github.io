window.onload = function () {
    // Scene setup
    let renderer, scene, camera;
    let world;
    let particles = [];
    let particleCount = 240;
    const particleRadius = 0.52;
    const tubeRadius = 4;

    // 攝影機軌道控制參數（標準 OrbitControls 航向-俯仰角球座標模型：永遠維持世界 Y 軸向上，旋轉不歪斜翻轉）
    const orbitTarget = new THREE.Vector3(0, -4, 0);
    const spherical = {
        radius: 80,
        theta: Math.PI / 2,
        phi: Math.PI / 2 - 0.28
    };

    function updateCameraFromSpherical() {
        const sinPhiRadius = spherical.radius * Math.sin(spherical.phi);
        camera.position.x = orbitTarget.x + sinPhiRadius * Math.cos(spherical.theta);
        camera.position.y = orbitTarget.y + spherical.radius * Math.cos(spherical.phi);
        camera.position.z = orbitTarget.z + sinPhiRadius * Math.sin(spherical.theta);
        camera.up.set(0, 1, 0);
        camera.lookAt(orbitTarget);
    }

    function initCameraSpherical(x, y, z, tx, ty, tz) {
        orbitTarget.set(tx, ty, tz);
        const dx = x - tx;
        const dy = y - ty;
        const dz = z - tz;
        spherical.radius = Math.max(25, Math.min(180, Math.sqrt(dx * dx + dy * dy + dz * dz)));
        spherical.phi = Math.acos(Math.max(-1, Math.min(1, dy / spherical.radius)));
        spherical.theta = Math.atan2(dz, dx);
        updateCameraFromSpherical();
    }

    const compressionFactor = 0.35; // 壓縮時管徑收縮幅度更明顯
    const compressionSpeed = 0.08;  // 平滑自然的收縮/舒張動畫速度

    // 單一 V 型心管單元長度 (-60 到 +60，共 120 單位)
    const tubeLength = 120;
    const halfTubeLength = tubeLength / 2; // 60
    const compressionLength = 30;          // 中央心室壓縮區長度 (-15 到 +15)
    const halfCompressionLength = compressionLength / 2;
    const centralSectionZ = 0;

    // 心房囊袋（靜脈竇 Sinus Venosus / Atrium）參數：位於後瓣膜 (+16) 上游入口處 (u = +16.5 ~ +42.5)
    const atriumLength = 26;
    const halfAtriumLength = atriumLength / 2;
    const atriumCenterZ = 29.5;
    const atriumZMin = atriumCenterZ - halfAtriumLength; // +16.5
    const atriumZMax = atriumCenterZ + halfAtriumLength; // +42.5
    const atriumMaxBulgeFactor = 0.92; // 囊袋最大膨大倍率（半徑可達原本的 ~1.92 倍）

    // 動脈彈性脈搏波區段參數 (u = -60 ~ -16，長度 44)
    const arteryLength = halfTubeLength - (halfCompressionLength + 1); // 60 - 16 = 44
    const arteryCenterZ = -(halfCompressionLength + 1 + arteryLength / 2); // -38.0

    // 物理剛體與視覺網格（支援單一管或左右雙心管共 2 組前瓣膜 + 2 組後瓣膜）
    let frontValveBodies = [], backValveBodies = [];
    let frontValveMeshes = [], backValveMeshes = [];

    // 狀態: 'normal'（平時）、'compress'（壓縮收縮）、'expand'（擴張舒張）
    let vesselState = 'normal';
    let currentCompression = 0; // -1 (完全擴張) ~ 0 (平時) ~ +1 (完全壓縮)
    let phaseTimer = 0;         // 紀錄當前收縮/舒張階段經過的時間 (秒)

    let frontValveEnabled = false;
    let backValveEnabled = false;
    let regurgitationEnabled = false;
    let atriumEnabled = false;
    let atriumCurrentBulge = 0;

    // 兩階段演化/組裝控制：
    // 1. bendEnabled: 控制單根心管是否產生 V 型彎折 (0 = 水平直管, 1 = V 型心室彎折)
    // 2. dualHeartEnabled: 控制是否組合兩組反向對稱的 V 型心管並使動脈與對側靜脈連接成閉鎖循環
    let bendEnabled = false;
    let currentBend = 0.0;
    let targetBend = 0.0;
    let dualHeartEnabled = false;

    const MAX_SPINE_SAMPLES = 1200;
    const SPINE_S_STEP = 0.5;
    let spineCount = 240;
    let loopTotalLength = 120;
    let seg1StartS = 120;
    let seg2StartS = 180;
    let seg3StartS = 300;

    const spineCx = new Float32Array(MAX_SPINE_SAMPLES);
    const spineCy = new Float32Array(MAX_SPINE_SAMPLES);
    const spineCz = new Float32Array(MAX_SPINE_SAMPLES);
    const spineTx = new Float32Array(MAX_SPINE_SAMPLES);
    const spineTy = new Float32Array(MAX_SPINE_SAMPLES);
    const spineTz = new Float32Array(MAX_SPINE_SAMPLES);
    const spineUx = new Float32Array(MAX_SPINE_SAMPLES);
    const spineUy = new Float32Array(MAX_SPINE_SAMPLES);
    const spineUz = new Float32Array(MAX_SPINE_SAMPLES);
    const spineVx = new Float32Array(MAX_SPINE_SAMPLES);
    const spineVy = new Float32Array(MAX_SPINE_SAMPLES);
    const spineVz = new Float32Array(MAX_SPINE_SAMPLES);
    const spineAlpha = new Float32Array(MAX_SPINE_SAMPLES);

    const tempSpine = { cx: 0, cy: 0, cz: 0, tx: 0, ty: 0, tz: 1, ux: 0, uy: 1, uz: 0, vx: 1, vy: 0, vz: 0, alpha: 0 };
    const tempSpinePrev = { cx: 0, cy: 0, cz: 0, tx: 0, ty: 0, tz: 1, ux: 0, uy: 1, uz: 0, vx: 1, vy: 0, vz: 0, alpha: 0 };
    const tempSpineProj = { cx: 0, cy: 0, cz: 0, tx: 0, ty: 0, tz: 1, ux: 0, uy: 1, uz: 0, vx: 1, vy: 0, vz: 0, alpha: 0 };

    function wrapLoopS(s) {
        if (!dualHeartEnabled) {
            return Math.max(0, Math.min(loopTotalLength, s));
        }
        let r = s % loopTotalLength;
        if (r < 0) r += loopTotalLength;
        return r;
    }

    function getSpineAngleAtU(u, bend) {
        if (bend <= 0.00001) return 0;
        const turnScale = 6.8;
        if (u >= 0) {
            const baseInflow = 1.32 * Math.tanh(u / turnScale);
            const topCurveIn = 0.32 * Math.max(0, (u - 24) / 32);
            return bend * (baseInflow + topCurveIn);
        } else {
            const arterialMaxAngle = 1.24; // ~71° 陡峭筆直斜向高射
            return bend * arterialMaxAngle * Math.tanh(u / turnScale);
        }
    }

    function sampleCubicBezierByArcLength(p0, p1, p2, p3, step) {
        const fineSteps = 160;
        const ptsX = new Float32Array(fineSteps + 1);
        const ptsY = new Float32Array(fineSteps + 1);
        const ptsZ = new Float32Array(fineSteps + 1);
        const cumLen = new Float32Array(fineSteps + 1);

        for (let i = 0; i <= fineSteps; i++) {
            const t = i / fineSteps;
            const mt = 1 - t;
            const b0 = mt * mt * mt;
            const b1 = 3 * mt * mt * t;
            const b2 = 3 * mt * t * t;
            const b3 = t * t * t;
            ptsX[i] = b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x;
            ptsY[i] = b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y;
            ptsZ[i] = b0 * p0.z + b1 * p1.z + b2 * p2.z + b3 * p3.z;
            if (i > 0) {
                const dx = ptsX[i] - ptsX[i - 1];
                const dy = ptsY[i] - ptsY[i - 1];
                const dz = ptsZ[i] - ptsZ[i - 1];
                cumLen[i] = cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz);
            }
        }

        const totalArc = cumLen[fineSteps];
        const numSegments = Math.max(12, Math.round(totalArc / step));
        const resX = new Float32Array(numSegments);
        const resY = new Float32Array(numSegments);
        const resZ = new Float32Array(numSegments);

        let searchIdx = 0;
        for (let k = 0; k < numSegments; k++) {
            const targetD = (k / numSegments) * totalArc;
            while (searchIdx < fineSteps - 1 && cumLen[searchIdx + 1] < targetD) {
                searchIdx++;
            }
            const segLen = Math.max(0.00001, cumLen[searchIdx + 1] - cumLen[searchIdx]);
            const frac = (targetD - cumLen[searchIdx]) / segLen;
            resX[k] = ptsX[searchIdx] + (ptsX[searchIdx + 1] - ptsX[searchIdx]) * frac;
            resY[k] = ptsY[searchIdx] + (ptsY[searchIdx + 1] - ptsY[searchIdx]) * frac;
            resZ[k] = ptsZ[searchIdx] + (ptsZ[searchIdx + 1] - ptsZ[searchIdx]) * frac;
        }

        return {
            x: resX,
            y: resY,
            z: resZ,
            count: numSegments,
            length: numSegments * step
        };
    }

    // 使用平行傳輸 (Bishop Parallel Transport) 計算頂端連接圓弧的無扭結截面基底 (U, V)，徹底消除切線平行於 X 軸時的截面翻轉與擠壓
    function transportArchFrame(startIdx, endIdx) {
        const span = endIdx - startIdx;
        if (span <= 1) return;

        const tmpUx = new Float32Array(span + 1);
        const tmpUy = new Float32Array(span + 1);
        const tmpUz = new Float32Array(span + 1);
        const tmpVx = new Float32Array(span + 1);
        const tmpVy = new Float32Array(span + 1);
        const tmpVz = new Float32Array(span + 1);

        tmpUx[0] = spineUx[startIdx];
        tmpUy[0] = spineUy[startIdx];
        tmpUz[0] = spineUz[startIdx];
        tmpVx[0] = spineVx[startIdx];
        tmpVy[0] = spineVy[startIdx];
        tmpVz[0] = spineVz[startIdx];

        for (let step = 1; step <= span; step++) {
            const idx = (startIdx + step) % spineCount;
            const tx = spineTx[idx];
            const ty = spineTy[idx];
            const tz = spineTz[idx];

            let ux = tmpUx[step - 1];
            let uy = tmpUy[step - 1];
            let uz = tmpUz[step - 1];
            const dotUT = ux * tx + uy * ty + uz * tz;
            ux -= dotUT * tx;
            uy -= dotUT * ty;
            uz -= dotUT * tz;
            const uLen = Math.max(0.00001, Math.sqrt(ux * ux + uy * uy + uz * uz));
            ux /= uLen;
            uy /= uLen;
            uz /= uLen;

            tmpUx[step] = ux;
            tmpUy[step] = uy;
            tmpUz[step] = uz;
            tmpVx[step] = uy * tz - uz * ty;
            tmpVy[step] = uz * tx - ux * tz;
            tmpVz[step] = ux * ty - uy * tx;
        }

        const endMod = endIdx % spineCount;
        const targetUx = spineUx[endMod];
        const targetUy = spineUy[endMod];
        const targetUz = spineUz[endMod];

        const cosTheta = targetUx * tmpUx[span] + targetUy * tmpUy[span] + targetUz * tmpUz[span];
        const sinTheta = targetUx * tmpVx[span] + targetUy * tmpVy[span] + targetUz * tmpVz[span];
        const totalTwist = Math.atan2(sinTheta, cosTheta);

        for (let step = 1; step < span; step++) {
            const idx = (startIdx + step) % spineCount;
            const theta = (step / span) * totalTwist;
            const c = Math.cos(theta);
            const s = Math.sin(theta);

            spineUx[idx] = c * tmpUx[step] + s * tmpVx[step];
            spineUy[idx] = c * tmpUy[step] + s * tmpVy[step];
            spineUz[idx] = c * tmpUz[step] + s * tmpVz[step];
            spineVx[idx] = -s * tmpUx[step] + c * tmpVx[step];
            spineVy[idx] = -s * tmpUy[step] + c * tmpVy[step];
            spineVz[idx] = -s * tmpUz[step] + c * tmpVz[step];
        }
    }

    function rebuildSpineTable(bend) {
        const heartSteps = Math.round(tubeLength / SPINE_S_STEP); // 240
        const zeroIdx = Math.round(halfTubeLength / SPINE_S_STEP); // 120
        const baseY = new Float32Array(heartSteps + 1);
        const baseZ = new Float32Array(heartSteps + 1);

        const baseApexY = -30.0 * bend;
        baseY[zeroIdx] = baseApexY;
        baseZ[zeroIdx] = 0;

        for (let i = zeroIdx + 1; i <= heartSteps; i++) {
            const uMid = -halfTubeLength + (i - 0.5) * SPINE_S_STEP;
            const aMid = getSpineAngleAtU(uMid, bend);
            baseY[i] = baseY[i - 1] + Math.sin(aMid) * SPINE_S_STEP;
            baseZ[i] = baseZ[i - 1] + Math.cos(aMid) * SPINE_S_STEP;
        }
        for (let i = zeroIdx - 1; i >= 0; i--) {
            const uMid = -halfTubeLength + (i + 0.5) * SPINE_S_STEP;
            const aMid = getSpineAngleAtU(uMid, bend);
            baseY[i] = baseY[i + 1] - Math.sin(aMid) * SPINE_S_STEP;
            baseZ[i] = baseZ[i + 1] - Math.cos(aMid) * SPINE_S_STEP;
        }

        if (!dualHeartEnabled) {
            for (let i = 0; i <= heartSteps; i++) {
                spineCx[i] = 0;
                spineCy[i] = baseY[i];
                spineCz[i] = baseZ[i];

                const u = -halfTubeLength + i * SPINE_S_STEP;
                const a = getSpineAngleAtU(u, bend);
                const sinA = Math.sin(a);
                const cosA = Math.cos(a);
                spineAlpha[i] = a;
                spineTx[i] = 0;
                spineTy[i] = sinA;
                spineTz[i] = cosA;
                spineUx[i] = 0;
                spineUy[i] = cosA;
                spineUz[i] = -sinA;
                spineVx[i] = 1;
                spineVy[i] = 0;
                spineVz[i] = 0;
            }
            spineCount = heartSteps;
            loopTotalLength = tubeLength;
            seg1StartS = tubeLength;
            seg2StartS = tubeLength;
            seg3StartS = tubeLength;
            return;
        }

        const xSep = 4.4;
        const zApexOffset = 7.5 * bend;
        const yDualSpread = 14.0 * (1 - bend);

        const h0X = +xSep;
        const h0Y = +yDualSpread;
        const h1X = -xSep;
        const h1Y = -yDualSpread;

        const aArt = getSpineAngleAtU(-halfTubeLength, bend);
        const aVein = getSpineAngleAtU(halfTubeLength, bend);

        const p0Art = { x: h0X, y: baseY[0] + h0Y, z: +zApexOffset + baseZ[0] };
        const p0Vein = { x: h0X, y: baseY[heartSteps] + h0Y, z: +zApexOffset + baseZ[heartSteps] };
        const t0Art = { x: 0, y: Math.sin(aArt), z: Math.cos(aArt) };
        const t0Vein = { x: 0, y: Math.sin(aVein), z: Math.cos(aVein) };

        const p1Art = { x: h1X, y: baseY[0] + h1Y, z: -zApexOffset - baseZ[0] };
        const p1Vein = { x: h1X, y: baseY[heartSteps] + h1Y, z: -zApexOffset - baseZ[heartSteps] };
        const t1Art = { x: 0, y: Math.sin(aArt), z: -Math.cos(aArt) };
        const t1Vein = { x: 0, y: Math.sin(aVein), z: -Math.cos(aVein) };

        const handleLen = 10.5;
        const archLift = 0.0;

        // 左上方動靜脈連接弧 (連接 Heart 0 的靜脈 p0Vein -> Heart 1 的動脈 p1Art)
        // 注意切線方向：s 增加方向在 p0Vein 為 +t0Vein (向上)，在 p1Art 為 +t1Art (向下進入 Heart 1)，因此 P2 需沿 -t1Art 往上延伸
        const archLeftTop = sampleCubicBezierByArcLength(
            p0Vein,
            {
                x: p0Vein.x + t0Vein.x * handleLen,
                y: p0Vein.y + t0Vein.y * handleLen + archLift,
                z: p0Vein.z + t0Vein.z * handleLen
            },
            {
                x: p1Art.x - t1Art.x * handleLen,
                y: p1Art.y - t1Art.y * handleLen + archLift,
                z: p1Art.z - t1Art.z * handleLen
            },
            p1Art,
            SPINE_S_STEP
        );

        // 右上方肺部微血管連接弧 (連接 Heart 1 的靜脈 p1Vein -> Heart 0 的動脈 p0Art)
        // 注意切線方向：s 增加方向在 p1Vein 為 +t1Vein (向上)，在 p0Art 為 +t0Art (向下進入 Heart 0)，因此 P2 需沿 -t0Art 往上延伸
        const archRightTop = sampleCubicBezierByArcLength(
            p1Vein,
            {
                x: p1Vein.x + t1Vein.x * handleLen,
                y: p1Vein.y + t1Vein.y * handleLen + archLift,
                z: p1Vein.z + t1Vein.z * handleLen
            },
            {
                x: p0Art.x - t0Art.x * handleLen,
                y: p0Art.y - t0Art.y * handleLen + archLift,
                z: p0Art.z - t0Art.z * handleLen
            },
            p0Art,
            SPINE_S_STEP
        );

        let writeIdx = 0;

        for (let i = 0; i < heartSteps; i++) {
            spineCx[writeIdx] = h0X;
            spineCy[writeIdx] = baseY[i] + h0Y;
            spineCz[writeIdx] = +zApexOffset + baseZ[i];
            writeIdx++;
        }
        const seg1Idx = writeIdx;
        seg1StartS = seg1Idx * SPINE_S_STEP;

        for (let i = 0; i < archLeftTop.count; i++) {
            spineCx[writeIdx] = archLeftTop.x[i];
            spineCy[writeIdx] = archLeftTop.y[i];
            spineCz[writeIdx] = archLeftTop.z[i];
            writeIdx++;
        }
        const seg2Idx = writeIdx;
        seg2StartS = seg2Idx * SPINE_S_STEP;

        for (let i = 0; i < heartSteps; i++) {
            spineCx[writeIdx] = h1X;
            spineCy[writeIdx] = baseY[i] + h1Y;
            spineCz[writeIdx] = -zApexOffset - baseZ[i];
            writeIdx++;
        }
        const seg3Idx = writeIdx;
        seg3StartS = seg3Idx * SPINE_S_STEP;

        for (let i = 0; i < archRightTop.count; i++) {
            spineCx[writeIdx] = archRightTop.x[i];
            spineCy[writeIdx] = archRightTop.y[i];
            spineCz[writeIdx] = archRightTop.z[i];
            writeIdx++;
        }

        spineCount = writeIdx;
        loopTotalLength = spineCount * SPINE_S_STEP;

        spineCx[spineCount] = spineCx[0];
        spineCy[spineCount] = spineCy[0];
        spineCz[spineCount] = spineCz[0];

        for (let i = 0; i < spineCount; i++) {
            const prev = (i - 1 + spineCount) % spineCount;
            const next = (i + 1) % spineCount;
            const dx = spineCx[next] - spineCx[prev];
            const dy = spineCy[next] - spineCy[prev];
            const dz = spineCz[next] - spineCz[prev];
            const len = Math.max(0.00001, Math.sqrt(dx * dx + dy * dy + dz * dz));
            const tx = dx / len;
            const ty = dy / len;
            const tz = dz / len;

            spineTx[i] = tx;
            spineTy[i] = ty;
            spineTz[i] = tz;
            spineAlpha[i] = Math.atan2(ty, tz);

            const yzLen = Math.max(0.0001, Math.sqrt(ty * ty + tz * tz));
            const ux = 0;
            const uy = tz / yzLen;
            const uz = -ty / yzLen;
            spineUx[i] = ux;
            spineUy[i] = uy;
            spineUz[i] = uz;

            spineVx[i] = uy * tz - uz * ty;
            spineVy[i] = uz * tx - ux * tz;
            spineVz[i] = ux * ty - uy * tx;
        }

        // 對頂端左右兩道連接圓弧使用平行傳輸法向量，消除切線接近 X 軸時的截面扭轉
        transportArchFrame(seg1Idx - 1, seg2Idx);
        transportArchFrame(seg3Idx - 1, spineCount);

        spineTx[spineCount] = spineTx[0];
        spineTy[spineCount] = spineTy[0];
        spineTz[spineCount] = spineTz[0];
        spineUx[spineCount] = spineUx[0];
        spineUy[spineCount] = spineUy[0];
        spineUz[spineCount] = spineUz[0];
        spineVx[spineCount] = spineVx[0];
        spineVy[spineCount] = spineVy[0];
        spineVz[spineCount] = spineVz[0];
        spineAlpha[spineCount] = spineAlpha[0];
    }

    function getSpineAtS(s, out) {
        const target = out || tempSpine;
        const wrappedS = wrapLoopS(s);
        const f = wrappedS / SPINE_S_STEP;
        const idx = Math.min(spineCount - 1, Math.max(0, Math.floor(f)));
        const nextIdx = idx + 1;
        const t = f - idx;

        target.cx = spineCx[idx] + (spineCx[nextIdx] - spineCx[idx]) * t;
        target.cy = spineCy[idx] + (spineCy[nextIdx] - spineCy[idx]) * t;
        target.cz = spineCz[idx] + (spineCz[nextIdx] - spineCz[idx]) * t;

        let tx = spineTx[idx] + (spineTx[nextIdx] - spineTx[idx]) * t;
        let ty = spineTy[idx] + (spineTy[nextIdx] - spineTy[idx]) * t;
        let tz = spineTz[idx] + (spineTz[nextIdx] - spineTz[idx]) * t;
        const tLen = Math.max(0.00001, Math.sqrt(tx * tx + ty * ty + tz * tz));
        target.tx = tx / tLen;
        target.ty = ty / tLen;
        target.tz = tz / tLen;

        let ux = spineUx[idx] + (spineUx[nextIdx] - spineUx[idx]) * t;
        let uy = spineUy[idx] + (spineUy[nextIdx] - spineUy[idx]) * t;
        let uz = spineUz[idx] + (spineUz[nextIdx] - spineUz[idx]) * t;
        const uLen = Math.max(0.00001, Math.sqrt(ux * ux + uy * uy + uz * uz));
        target.ux = ux / uLen;
        target.uy = uy / uLen;
        target.uz = uz / uLen;

        let vx = spineVx[idx] + (spineVx[nextIdx] - spineVx[idx]) * t;
        let vy = spineVy[idx] + (spineVy[nextIdx] - spineVy[idx]) * t;
        let vz = spineVz[idx] + (spineVz[nextIdx] - spineVz[idx]) * t;
        const vLen = Math.max(0.00001, Math.sqrt(vx * vx + vy * vy + vz * vz));
        target.vx = vx / vLen;
        target.vy = vy / vLen;
        target.vz = vz / vLen;

        target.alpha = spineAlpha[idx] + (spineAlpha[nextIdx] - spineAlpha[idx]) * t;
        return target;
    }

    function getHeartLocalU(s) {
        if (!dualHeartEnabled) {
            const clamped = Math.max(0, Math.min(loopTotalLength, s));
            return { heartIndex: 0, u: clamped - halfTubeLength };
        }
        const ws = wrapLoopS(s);
        if (ws <= seg1StartS) {
            return { heartIndex: 0, u: ws - halfTubeLength };
        } else if (ws < seg2StartS) {
            const archLen = seg2StartS - seg1StartS;
            const dFromH0 = ws - seg1StartS;
            if (dFromH0 < archLen * 0.5) {
                return { heartIndex: 0, u: halfTubeLength + dFromH0 };
            } else {
                return { heartIndex: 1, u: -halfTubeLength - (seg2StartS - ws) };
            }
        } else if (ws <= seg3StartS) {
            return { heartIndex: 1, u: (ws - seg2StartS) - halfTubeLength };
        } else {
            const archLen = loopTotalLength - seg3StartS;
            const dFromH1 = ws - seg3StartS;
            if (dFromH1 < archLen * 0.5) {
                return { heartIndex: 1, u: halfTubeLength + dFromH1 };
            } else {
                return { heartIndex: 0, u: -halfTubeLength - (loopTotalLength - ws) };
            }
        }
    }

    function getLoopSFromHeartU(heartIndex, u) {
        if (!dualHeartEnabled || heartIndex === 0) {
            return wrapLoopS(u + halfTubeLength);
        } else {
            return wrapLoopS(seg2StartS + u + halfTubeLength);
        }
    }

    function findClosestLoopS(x, y, z) {
        let bestIdx = 0;
        let bestDistSq = Infinity;
        for (let i = 0; i < spineCount; i++) {
            const dx = x - spineCx[i];
            const dy = y - spineCy[i];
            const dz = z - spineCz[i];
            const dSq = dx * dx + dy * dy + dz * dz;
            if (dSq < bestDistSq) {
                bestDistSq = dSq;
                bestIdx = i;
            }
        }
        return bestIdx * SPINE_S_STEP;
    }

    function projectPointToSpineS(x, y, z, hintS) {
        let baseS;
        if (typeof hintS === 'number' && !isNaN(hintS)) {
            const centerIdx = Math.round(wrapLoopS(hintS) / SPINE_S_STEP) % spineCount;
            let bestIdx = centerIdx;
            let bestDistSq = Infinity;
            const searchRadius = 18;
            for (let offset = -searchRadius; offset <= searchRadius; offset++) {
                const idx = (centerIdx + offset + spineCount) % spineCount;
                const dx = x - spineCx[idx];
                const dy = y - spineCy[idx];
                const dz = z - spineCz[idx];
                const dSq = dx * dx + dy * dy + dz * dz;
                if (dSq < bestDistSq) {
                    bestDistSq = dSq;
                    bestIdx = idx;
                }
            }
            if (bestDistSq > 49.0) {
                baseS = findClosestLoopS(x, y, z);
            } else {
                baseS = bestIdx * SPINE_S_STEP;
            }
        } else {
            baseS = findClosestLoopS(x, y, z);
        }

        getSpineAtS(baseS, tempSpineProj);
        const dx = x - tempSpineProj.cx;
        const dy = y - tempSpineProj.cy;
        const dz = z - tempSpineProj.cz;
        const rawDs = dx * tempSpineProj.tx + dy * tempSpineProj.ty + dz * tempSpineProj.tz;
        const clampedDs = Math.max(-SPINE_S_STEP, Math.min(SPINE_S_STEP, rawDs));
        return wrapLoopS(baseS + clampedDs);
    }

    rebuildSpineTable(currentBend);

    let autoCompressEnabled = false;
    let autoCompressTimer = 0;
    const autoCycleHalfPeriod = 0.85;

    let irregularCompressEnabled = false;
    let irregularTimer = 0;
    let irregularNextInterval = 0.3;
    let irregularStrength = 0.5;
    let irregularModeType = 'premature';
    let tremorTime = 0;

    let arterialPulseWaves = [];
    let pulseSpawnedThisPhase = false;

    // Visual meshes:
    // - singleTubeMesh: 單一心管半透明外管
    // - loopTubeMesh: 雙心循環完整閉鎖外管
    let singleTubeMesh = null;
    let loopTubeMesh = null;
    let compressionZoneMeshes = [];
    let atriumZoneMeshes = [];
    let arteryZoneMeshes = [];
    let sharedParticleGeometry = null;
    let rbcMaterialPalette = [];

    // UI elements
    const toggleCompressBtn = document.getElementById('toggle-compress');
    const autoCompressBtn = document.getElementById('auto-compress');
    const irregularCompressBtn = document.getElementById('irregular-compress');
    const toggleRegurgitationBtn = document.getElementById('toggle-regurgitation');
    const toggleAtriumBtn = document.getElementById('toggle-atrium');
    const toggleBackValveBtn = document.getElementById('toggle-back-valve');
    const toggleFrontValveBtn = document.getElementById('toggle-front-valve');
    const toggleBendBtn = document.getElementById('toggle-bend');
    const toggleDualHeartBtn = document.getElementById('toggle-dual-heart');
    const toggleLabelsBtn = document.getElementById('toggle-labels');
    const resetViewBtn = document.getElementById('reset-view');

    let labelsVisible = false;
    const anatomicalLabelsContainer = document.getElementById('anatomical-labels');
    const labelVein = document.getElementById('label-vein');
    const labelAtrium = document.getElementById('label-atrium');
    const labelAvValve = document.getElementById('label-av-valve');
    const labelVentricle = document.getElementById('label-ventricle');
    const labelArterialValve = document.getElementById('label-arterial-valve');
    const labelArtery = document.getElementById('label-artery');

    const labelVein2 = document.getElementById('label-vein-2');
    const labelAtrium2 = document.getElementById('label-atrium-2');
    const labelVentricle2 = document.getElementById('label-ventricle-2');
    const labelArtery2 = document.getElementById('label-artery-2');
    const tempProjVec = new THREE.Vector3();

    const particleSlider = document.getElementById('particle-slider');
    const particleCountDisplay = document.getElementById('particle-count-display');
    const qualityLowBtn = document.getElementById('quality-low-btn');
    const qualityMedBtn = document.getElementById('quality-med-btn');
    const qualityHighBtn = document.getElementById('quality-high-btn');

    function init() {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x1e293b);
        document.body.appendChild(renderer.domElement);

        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x1e293b, 95, 260);

        camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
        initCameraSpherical(78, 26, 0, 0, -2, 0);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.85);
        directionalLight.position.set(35, 50, 25);
        scene.add(directionalLight);
        const backLight = new THREE.DirectionalLight(0x93c5fd, 0.35);
        backLight.position.set(-35, -20, -20);
        scene.add(backLight);

        world = new CANNON.World();
        world.gravity.set(0, 0, 0);
        world.broadphase = new CANNON.SAPBroadphase(world);
        world.solver.iterations = 6;
        world.defaultContactMaterial.friction = 0.0;
        world.defaultContactMaterial.restitution = 0.1;

        createTube();
        createParticles();
        initControls();

        toggleCompressBtn.addEventListener('click', () => {
            if (autoCompressEnabled) stopAutoCompress();
            if (irregularCompressEnabled) stopIrregularCompress();
            if (vesselState === 'normal' || vesselState === 'expand') {
                setVesselPhase('compress');
            } else {
                setVesselPhase('expand');
            }
        });

        if (autoCompressBtn) {
            autoCompressBtn.addEventListener('click', () => {
                if (autoCompressEnabled) {
                    stopAutoCompress();
                    setVesselPhase('normal');
                } else {
                    if (irregularCompressEnabled) stopIrregularCompress();
                    startAutoCompress();
                }
            });
        }

        if (irregularCompressBtn) {
            irregularCompressBtn.addEventListener('click', () => {
                if (irregularCompressEnabled) {
                    stopIrregularCompress();
                    setVesselPhase('normal');
                } else {
                    if (autoCompressEnabled) stopAutoCompress();
                    startIrregularCompress();
                }
            });
        }

        if (toggleRegurgitationBtn) {
            toggleRegurgitationBtn.addEventListener('click', () => {
                toggleRegurgitation();
            });
        }

        if (toggleAtriumBtn) {
            toggleAtriumBtn.addEventListener('click', () => {
                toggleAtrium();
            });
        }

        if (toggleBackValveBtn) {
            toggleBackValveBtn.addEventListener('click', () => {
                if (backValveEnabled) {
                    removeValve('back');
                } else {
                    addValve('back');
                }
            });
        }

        if (toggleFrontValveBtn) {
            toggleFrontValveBtn.addEventListener('click', () => {
                if (frontValveEnabled) {
                    removeValve('front');
                } else {
                    addValve('front');
                }
            });
        }

        if (toggleBendBtn) {
            toggleBendBtn.addEventListener('click', () => {
                toggleVesselBend();
            });
        }

        if (toggleDualHeartBtn) {
            toggleDualHeartBtn.addEventListener('click', () => {
                toggleDualHeartMode();
            });
        }

        if (toggleLabelsBtn) {
            toggleLabelsBtn.addEventListener('click', () => {
                labelsVisible = !labelsVisible;
                if (anatomicalLabelsContainer) {
                    anatomicalLabelsContainer.classList.toggle('hidden', !labelsVisible);
                }
                toggleLabelsBtn.classList.toggle('btn-active', labelsVisible);
                if (labelsVisible) {
                    toggleLabelsBtn.textContent = '隱藏標籤';
                    updateAnatomicalLabels();
                } else {
                    toggleLabelsBtn.textContent = '構造標籤';
                }
            });
        }

        resetViewBtn.addEventListener('click', () => {
            resetCamera();
        });

        if (particleSlider) {
            particleSlider.addEventListener('input', (e) => {
                setParticleCount(parseInt(e.target.value, 10));
            });
            particleSlider.addEventListener('change', (e) => {
                setParticleCount(parseInt(e.target.value, 10));
            });
        }
        if (qualityLowBtn) {
            qualityLowBtn.addEventListener('click', () => setParticleCount(120));
        }
        if (qualityMedBtn) {
            qualityMedBtn.addEventListener('click', () => setParticleCount(240));
        }
        if (qualityHighBtn) {
            qualityHighBtn.addEventListener('click', () => setParticleCount(420));
        }

        window.addEventListener('resize', onWindowResize);
    }

    function updateBendButtonUI() {
        if (!toggleBendBtn) return;
        if (bendEnabled) {
            toggleBendBtn.textContent = '水平直管';
            toggleBendBtn.classList.add('btn-active');
        } else {
            toggleBendBtn.textContent = '心管彎折(V型)';
            toggleBendBtn.classList.remove('btn-active');
        }
    }

    function updateDualHeartButtonUI() {
        if (!toggleDualHeartBtn) return;
        if (dualHeartEnabled) {
            toggleDualHeartBtn.textContent = '單一心管';
            toggleDualHeartBtn.classList.add('btn-active');
        } else {
            toggleDualHeartBtn.textContent = '雙心循環';
            toggleDualHeartBtn.classList.remove('btn-active');
        }
    }

    function syncSecondaryMeshesVisibility() {
        if (singleTubeMesh) {
            singleTubeMesh.visible = !dualHeartEnabled;
        }
        if (loopTubeMesh) {
            loopTubeMesh.visible = dualHeartEnabled;
        }
        if (compressionZoneMeshes[1]) {
            compressionZoneMeshes[1].visible = dualHeartEnabled;
        }
        if (atriumZoneMeshes[1]) {
            atriumZoneMeshes[1].visible = dualHeartEnabled && (atriumCurrentBulge > 0.01);
        }
        if (arteryZoneMeshes[1]) {
            arteryZoneMeshes[1].visible = dualHeartEnabled && (frontValveEnabled || backValveEnabled);
        }
        frontValveMeshes.forEach(m => {
            if (m && m.userData && m.userData.heartIndex === 1) {
                m.visible = dualHeartEnabled;
            }
        });
        backValveMeshes.forEach(m => {
            if (m && m.userData && m.userData.heartIndex === 1) {
                m.visible = dualHeartEnabled;
            }
        });

        const extraLabels = [labelVein2, labelAtrium2, labelVentricle2, labelArtery2];
        extraLabels.forEach(el => {
            if (el) el.classList.toggle('hidden', !dualHeartEnabled);
        });
    }

    function toggleVesselBend() {
        bendEnabled = !bendEnabled;
        targetBend = bendEnabled ? 1.0 : 0.0;
        if (!bendEnabled && dualHeartEnabled) {
            dualHeartEnabled = false;
            updateDualHeartButtonUI();
            rebuildSpineTable(currentBend);
            syncSecondaryMeshesVisibility();
            redistributeParticlesOnModeSwitch();
            syncValvesToSpine();
            updateAllTubeMeshes();
        }
        updateBendButtonUI();
    }

    function toggleDualHeartMode() {
        dualHeartEnabled = !dualHeartEnabled;
        if (dualHeartEnabled && !bendEnabled) {
            bendEnabled = true;
            currentBend = 1.0;
            targetBend = 1.0;
            updateBendButtonUI();
        }
        updateDualHeartButtonUI();
        rebuildSpineTable(currentBend);
        syncSecondaryMeshesVisibility();
        syncValvesToSpine();
        redistributeParticlesOnModeSwitch();
        updateAllTubeMeshes();
        if (labelsVisible) updateAnatomicalLabels();
    }

    function redistributeParticlesOnModeSwitch() {
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const s = Math.random() * loopTotalLength;
            p.s = s;
            const sp = getSpineAtS(s, tempSpine);
            const { u } = getHeartLocalU(s);
            const maxR = getEffectiveTubeRadiusAtZ(u);
            const { x: rv, y: ru } = randomCrossSectionXY(maxR);

            p.body.position.set(
                sp.cx + rv * sp.vx + ru * sp.ux,
                sp.cy + rv * sp.vy + ru * sp.uy,
                sp.cz + rv * sp.vz + ru * sp.uz
            );
            p.body.velocity.set(0, 0, 0);

            const palIdx = getParticleOxygenPaletteIndex(s);
            p.palIdx = palIdx;
            if (rbcMaterialPalette[palIdx]) {
                p.mesh.material = rbcMaterialPalette[palIdx];
            }
        }
    }

    function toggleRegurgitation() {
        regurgitationEnabled = !regurgitationEnabled;
        if (toggleRegurgitationBtn) {
            toggleRegurgitationBtn.classList.toggle('btn-active', regurgitationEnabled);
            toggleRegurgitationBtn.textContent = regurgitationEnabled ? '關閉逆流' : '瓣膜逆流';
        }
        if (regurgitationEnabled) {
            if (!backValveEnabled && !frontValveEnabled) {
                addValve('back');
                addValve('front');
            }
        }
    }

    function toggleAtrium() {
        atriumEnabled = !atriumEnabled;
        if (toggleAtriumBtn) {
            toggleAtriumBtn.classList.toggle('btn-active', atriumEnabled);
            toggleAtriumBtn.textContent = atriumEnabled ? '移除心房' : '心房囊袋';
        }
    }

    function setVesselPhase(newPhase) {
        vesselState = newPhase;
        phaseTimer = 0;
        pulseSpawnedThisPhase = false;

        if (toggleCompressBtn) {
            if (vesselState === 'compress') {
                toggleCompressBtn.textContent = '擴張心室';
                toggleCompressBtn.classList.add('btn-active');
            } else if (vesselState === 'expand') {
                toggleCompressBtn.textContent = '壓縮心室';
                toggleCompressBtn.classList.add('btn-active');
            } else {
                toggleCompressBtn.textContent = '單次壓縮';
                toggleCompressBtn.classList.remove('btn-active');
            }
        }
    }

    function startAutoCompress() {
        autoCompressEnabled = true;
        autoCompressTimer = 0;
        irregularStrength = 1.0;
        if (autoCompressBtn) {
            autoCompressBtn.textContent = '停止搏動';
            autoCompressBtn.classList.add('btn-active');
        }
        setVesselPhase('compress');
    }

    function stopAutoCompress() {
        autoCompressEnabled = false;
        autoCompressTimer = 0;
        if (autoCompressBtn) {
            autoCompressBtn.textContent = '連續搏動';
            autoCompressBtn.classList.remove('btn-active');
        }
    }

    function scheduleNextIrregularPhase() {
        irregularTimer = 0;
        const rand = Math.random();

        if (vesselState !== 'compress') {
            if (irregularModeType === 'premature') {
                irregularStrength = 0.35 + Math.random() * 0.2;
                irregularNextInterval = 0.22 + Math.random() * 0.15;
            } else if (rand < 0.45) {
                irregularModeType = 'fibrillation';
                irregularStrength = 0.22 + Math.random() * 0.18;
                irregularNextInterval = 0.14 + Math.random() * 0.12;
            } else {
                irregularModeType = 'compensatory';
                irregularStrength = 0.72 + Math.random() * 0.22;
                irregularNextInterval = 0.45 + Math.random() * 0.25;
            }
            setVesselPhase('compress');
        } else {
            if (rand < 0.42) {
                irregularModeType = 'premature';
                irregularStrength = 0.3 + Math.random() * 0.2;
                irregularNextInterval = 0.16 + Math.random() * 0.12;
            } else if (rand < 0.75) {
                irregularModeType = 'fibrillation';
                irregularStrength = 0.25 + Math.random() * 0.15;
                irregularNextInterval = 0.14 + Math.random() * 0.12;
            } else {
                irregularModeType = 'pause';
                irregularStrength = 0.55 + Math.random() * 0.2;
                irregularNextInterval = 1.05 + Math.random() * 0.45;
            }
            setVesselPhase('expand');
        }
    }

    function startIrregularCompress() {
        irregularCompressEnabled = true;
        irregularModeType = 'premature';
        if (irregularCompressBtn) {
            irregularCompressBtn.textContent = '停止心律不整';
            irregularCompressBtn.classList.add('btn-active');
        }
        scheduleNextIrregularPhase();
    }

    function stopIrregularCompress() {
        irregularCompressEnabled = false;
        irregularTimer = 0;
        irregularStrength = 1.0;
        if (irregularCompressBtn) {
            irregularCompressBtn.textContent = '心律不整';
            irregularCompressBtn.classList.remove('btn-active');
        }
    }

    function initControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let touchStartDistance = 0;
        let previousTouchPosition = { x: 0, y: 0 };

        function rotateCamera(deltaX, deltaY) {
            const rotateSpeed = 0.0055;
            spherical.theta -= deltaX * rotateSpeed;
            spherical.phi -= deltaY * rotateSpeed;
            const phiMargin = 0.06;
            spherical.phi = Math.max(phiMargin, Math.min(Math.PI - phiMargin, spherical.phi));
            updateCameraFromSpherical();
        }

        function panCamera(deltaX, deltaY) {
            const panSpeed = spherical.radius * 0.0012;
            const cosT = Math.cos(spherical.theta);
            const sinT = Math.sin(spherical.theta);
            orbitTarget.x += sinT * deltaX * panSpeed;
            orbitTarget.z -= cosT * deltaX * panSpeed;
            orbitTarget.y += deltaY * panSpeed;
            updateCameraFromSpherical();
        }

        function zoomCamera(delta) {
            const zoomSpeed = 2.0;
            spherical.radius = Math.max(25, Math.min(180, spherical.radius + delta * zoomSpeed));
            updateCameraFromSpherical();
        }

        renderer.domElement.addEventListener('mousedown', (e) => {
            if (e.buttons === 1) { isDragging = 'rotate'; }
            else if (e.buttons === 2) { isDragging = 'pan'; }
            previousMousePosition.x = e.clientX;
            previousMousePosition.y = e.clientY;
            e.preventDefault();
        });

        renderer.domElement.addEventListener('mouseup', () => { isDragging = false; });
        renderer.domElement.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            if (isDragging === 'rotate') { rotateCamera(deltaX, deltaY); }
            else if (isDragging === 'pan') { panCamera(deltaX, deltaY); }
            previousMousePosition.x = e.clientX;
            previousMousePosition.y = e.clientY;
        });
        renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
        renderer.domElement.addEventListener('wheel', (e) => { e.preventDefault(); zoomCamera(e.deltaY > 0 ? 1 : -1); }, { passive: false });

        renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = 'rotate';
                previousTouchPosition.x = e.touches[0].clientX;
                previousTouchPosition.y = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                isDragging = 'zoom';
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                touchStartDistance = Math.sqrt(dx * dx + dy * dy);
            }
            e.preventDefault();
        }, { passive: false });

        renderer.domElement.addEventListener('touchmove', (e) => {
            if (isDragging === 'rotate') {
                const touch = e.touches[0];
                const deltaX = touch.clientX - previousTouchPosition.x;
                const deltaY = touch.clientY - previousTouchPosition.y;
                rotateCamera(deltaX * 0.8, deltaY * 0.8);
                previousTouchPosition.x = touch.clientX;
                previousTouchPosition.y = touch.clientY;
            } else if (isDragging === 'zoom' && e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                const delta = touchStartDistance - currentDistance;
                zoomCamera(delta * 0.15);
                touchStartDistance = currentDistance;
            }
        }, { passive: false });
        renderer.domElement.addEventListener('touchend', () => { isDragging = false; });
    }

    function prepareLoopTubeGeometry(geometry, isFullLoop, heartIndex, centerU, segLength) {
        const posAttr = geometry.attributes.position;
        const count = posAttr.count;
        const baseNorm = new Float32Array(count);
        const baseU = new Float32Array(count);
        const baseUv = new Float32Array(count);
        const baseUu = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const vx = posAttr.getX(i);
            const vy = posAttr.getY(i);
            const vz = posAttr.getZ(i);
            const r = Math.sqrt(vx * vx + vz * vz);
            baseNorm[i] = (vy + segLength * 0.5) / segLength; // 0 ~ 1
            baseU[i] = centerU + vy;
            if (r > 0.0001) {
                baseUv[i] = vx / r;
                baseUu[i] = -vz / r;
            } else {
                baseUv[i] = 0;
                baseUu[i] = 0;
            }
        }
        geometry.userData = {
            isFullLoop: !!isFullLoop,
            heartIndex: heartIndex || 0,
            baseNorm,
            baseU,
            baseUv,
            baseUu
        };
    }

    function createTube() {
        compressionZoneMeshes = [];
        atriumZoneMeshes = [];
        arteryZoneMeshes = [];

        const mainTubeMaterial = new THREE.MeshPhongMaterial({
            color: 0xf1f5f9,
            transparent: true,
            opacity: 0.17,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        // 1. 單一心管主網格
        const singleTubeGeom = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLength, 32, 128, true);
        prepareLoopTubeGeometry(singleTubeGeom, false, 0, 0, tubeLength);
        singleTubeMesh = new THREE.Mesh(singleTubeGeom, mainTubeMaterial);
        singleTubeMesh.visible = !dualHeartEnabled;
        scene.add(singleTubeMesh);

        // 2. 雙心循環閉鎖全環網格 (360 軸向分段)
        const loopTubeGeom = new THREE.CylinderGeometry(tubeRadius, tubeRadius, 360, 32, 360, true);
        prepareLoopTubeGeometry(loopTubeGeom, true, 0, 0, 360);
        loopTubeMesh = new THREE.Mesh(loopTubeGeom, mainTubeMaterial);
        loopTubeMesh.visible = dualHeartEnabled;
        scene.add(loopTubeMesh);

        // 3. 為左組心管 (h = 0) 與右組對稱心管 (h = 1) 建立心室腔、心房囊袋與動脈套管
        for (let h = 0; h < 2; h++) {
            const compressionGeometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, compressionLength, 32, 40, true);
            prepareLoopTubeGeometry(compressionGeometry, false, h, centralSectionZ, compressionLength);
            const compressionMaterial = new THREE.MeshPhongMaterial({
                color: 0x38bdf8,
                emissive: 0x0284c7,
                emissiveIntensity: 0.14,
                transparent: true,
                opacity: 0.34,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const ventMesh = new THREE.Mesh(compressionGeometry, compressionMaterial);
            ventMesh.visible = (h === 0) || dualHeartEnabled;
            scene.add(ventMesh);
            compressionZoneMeshes.push(ventMesh);

            const atriumGeometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, atriumLength, 32, 32, true);
            prepareLoopTubeGeometry(atriumGeometry, false, h, atriumCenterZ, atriumLength);
            const atriumMaterial = new THREE.MeshPhongMaterial({
                color: 0xf43f5e,
                emissive: 0xbe123c,
                emissiveIntensity: 0.15,
                transparent: true,
                opacity: 0.0,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const atrMesh = new THREE.Mesh(atriumGeometry, atriumMaterial);
            atrMesh.visible = false;
            scene.add(atrMesh);
            atriumZoneMeshes.push(atrMesh);

            const arteryGeometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, arteryLength, 32, 48, true);
            prepareLoopTubeGeometry(arteryGeometry, false, h, arteryCenterZ, arteryLength);
            const arteryMaterial = new THREE.MeshPhongMaterial({
                color: 0xf87171,
                emissive: 0x991b1b,
                emissiveIntensity: 0.16,
                transparent: true,
                opacity: 0.28,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const artMesh = new THREE.Mesh(arteryGeometry, arteryMaterial);
            artMesh.visible = false;
            scene.add(artMesh);
            arteryZoneMeshes.push(artMesh);
        }

        updateAllTubeMeshes();
    }

    function updateAllTubeMeshes() {
        if (!dualHeartEnabled) {
            updateCylinderMeshProfile(singleTubeMesh, 1.0);
        } else {
            updateCylinderMeshProfile(loopTubeMesh, 1.0);
        }
        const activeHearts = dualHeartEnabled ? 2 : 1;
        for (let h = 0; h < activeHearts; h++) {
            updateCylinderMeshProfile(compressionZoneMeshes[h], 1.02);
            if (atriumZoneMeshes[h] && atriumZoneMeshes[h].visible) {
                updateCylinderMeshProfile(atriumZoneMeshes[h], 1.025);
            }
            if (arteryZoneMeshes[h] && arteryZoneMeshes[h].visible) {
                updateCylinderMeshProfile(arteryZoneMeshes[h], 1.02);
            }
        }
    }

    function clearParticles() {
        particles.forEach(p => {
            if (p.mesh) {
                scene.remove(p.mesh);
            }
            if (p.body) {
                world.removeBody(p.body);
            }
        });
        if (sharedParticleGeometry) {
            sharedParticleGeometry.dispose();
            sharedParticleGeometry = null;
        }
        rbcMaterialPalette.forEach(mat => mat.dispose());
        rbcMaterialPalette = [];
        particles = [];
    }

    function getEffectiveTubeRadiusAtZ(u) {
        if (Math.abs(u) <= halfCompressionLength) {
            const normU = u / halfCompressionLength;
            const ventEnvelope = Math.pow(Math.cos(normU * Math.PI * 0.5), 0.75);
            const scale = 1 - currentCompression * compressionFactor * ventEnvelope;
            return tubeRadius * scale;
        }
        if (atriumCurrentBulge > 0.001 && u >= atriumZMin && u <= atriumZMax) {
            const normU = (u - atriumCenterZ) / halfAtriumLength;
            const pouchProfile = Math.pow(Math.cos(normU * Math.PI * 0.5), 1.6);
            const scale = 1 + atriumCurrentBulge * atriumMaxBulgeFactor * pouchProfile;
            return tubeRadius * scale;
        }
        if (u <= -halfCompressionLength - 1 && u > -halfTubeLength) {
            let pulseExpansion = 0;
            for (let i = 0; i < arterialPulseWaves.length; i++) {
                const wave = arterialPulseWaves[i];
                const dist = Math.abs(u - wave.z);
                if (dist < wave.width * 2.2) {
                    const norm = dist / wave.width;
                    pulseExpansion += wave.amplitude * Math.exp(-norm * norm * 1.5);
                }
            }
            if (pulseExpansion > 0.0005) {
                const rootDist = Math.max(0, (-halfCompressionLength - 1) - u);
                const rootTaper = Math.min(1.0, rootDist / 3.0);
                const tipDist = Math.max(0, u + halfTubeLength);
                const tipTaper = Math.min(1.0, tipDist / 8.0);
                const scale = 1 + Math.min(0.24, pulseExpansion * 0.22) * rootTaper * tipTaper;
                return tubeRadius * scale;
            }
        }
        return tubeRadius;
    }

    function updateCylinderMeshProfile(mesh, radiusOffsetFactor) {
        if (!mesh || !mesh.geometry) return;
        const geom = mesh.geometry;
        const posAttr = geom.attributes.position;
        const normAttr = geom.attributes.normal;
        const { isFullLoop, heartIndex, baseNorm, baseU, baseUv, baseUu } = geom.userData;
        if (!baseUv) return;

        for (let i = 0; i < posAttr.count; i++) {
            let loopS;
            let localU;
            if (isFullLoop) {
                loopS = baseNorm[i] * loopTotalLength;
                localU = getHeartLocalU(loopS).u;
            } else {
                localU = baseU[i];
                loopS = getLoopSFromHeartU(heartIndex, localU);
            }

            const sp = getSpineAtS(loopS, tempSpine);
            const targetR = getEffectiveTubeRadiusAtZ(localU) * radiusOffsetFactor;

            const uv = baseUv[i];
            const uu = baseUu[i];
            const nx = uv * sp.vx + uu * sp.ux;
            const ny = uv * sp.vy + uu * sp.uy;
            const nz = uv * sp.vz + uu * sp.uz;

            posAttr.setXYZ(
                i,
                sp.cx + targetR * nx,
                sp.cy + targetR * ny,
                sp.cz + targetR * nz
            );
            if (normAttr) {
                normAttr.setXYZ(i, nx, ny, nz);
            }
        }

        posAttr.needsUpdate = true;
        if (normAttr) {
            normAttr.needsUpdate = true;
        }
    }

    function randomCrossSectionXY(maxR) {
        const safeR = Math.max(0.2, maxR - particleRadius * 1.15);
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * safeR;
        return {
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r
        };
    }

    function getParticleOxygenPaletteIndex(s) {
        const paletteMax = rbcMaterialPalette.length - 1;
        if (paletteMax <= 0) return 0;
        if (!dualHeartEnabled) {
            return paletteMax;
        }

        const ws = wrapLoopS(s);
        if (ws <= seg1StartS) {
            return 0;
        } else if (ws < seg2StartS) {
            const t = (ws - seg1StartS) / Math.max(1, seg2StartS - seg1StartS);
            return Math.min(paletteMax, Math.max(0, Math.round(t * paletteMax)));
        } else if (ws <= seg3StartS) {
            return paletteMax;
        } else {
            const t = 1.0 - (ws - seg3StartS) / Math.max(1, loopTotalLength - seg3StartS);
            return Math.min(paletteMax, Math.max(0, Math.round(t * paletteMax)));
        }
    }

    function createParticles(count) {
        if (typeof count === 'number') {
            particleCount = count;
        }

        let segments = 12;
        if (particleCount <= 150) {
            segments = 10;
        }

        sharedParticleGeometry = new THREE.SphereGeometry(particleRadius, segments, segments);
        sharedParticleGeometry.scale(1.15, 0.65, 1.15);

        const paletteSteps = 16;
        const deoxColor = new THREE.Color(0x4a0418); // 深度暗紫紅（缺氧靜脈血）
        const oxColor = new THREE.Color(0xff0820);   // 極致鮮亮紅（充氧動脈血）
        const deoxEmissive = new THREE.Color(0x1a0108);
        const oxEmissive = new THREE.Color(0x80000a);

        rbcMaterialPalette = [];
        for (let k = 0; k < paletteSteps; k++) {
            const t = k / (paletteSteps - 1);
            const c = deoxColor.clone().lerp(oxColor, t);
            const em = deoxEmissive.clone().lerp(oxEmissive, t);
            rbcMaterialPalette.push(new THREE.MeshPhongMaterial({
                color: c,
                emissive: em,
                specular: t > 0.5 ? 0xfecaca : 0x991b1b,
                shininess: 45
            }));
        }

        const collisionShape = new CANNON.Sphere(particleRadius * 0.7);

        for (let i = 0; i < particleCount; i++) {
            const s = Math.random() * loopTotalLength;
            const { u } = getHeartLocalU(s);
            const maxR = getEffectiveTubeRadiusAtZ(u);
            const { x: rv, y: ru } = randomCrossSectionXY(maxR);
            const sp = getSpineAtS(s, tempSpine);

            const wx = sp.cx + rv * sp.vx + ru * sp.ux;
            const wy = sp.cy + rv * sp.vy + ru * sp.uy;
            const wz = sp.cz + rv * sp.vz + ru * sp.uz;

            const palIdx = getParticleOxygenPaletteIndex(s);
            const particleMesh = new THREE.Mesh(sharedParticleGeometry, rbcMaterialPalette[palIdx]);
            particleMesh.position.set(wx, wy, wz);
            particleMesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            scene.add(particleMesh);

            const particleBody = new CANNON.Body({
                mass: 1,
                shape: collisionShape,
                position: new CANNON.Vec3(wx, wy, wz),
                linearDamping: 0.35,
                angularDamping: 0.4
            });

            particleBody.angularVelocity.set(
                (Math.random() - 0.5) * 1.2,
                (Math.random() - 0.5) * 1.2,
                (Math.random() - 0.5) * 1.2
            );

            world.addBody(particleBody);
            particles.push({ mesh: particleMesh, body: particleBody, s: s, palIdx: palIdx });
        }
    }

    function setParticleCount(newCount) {
        newCount = Math.max(40, Math.min(550, parseInt(newCount, 10) || 240));
        clearParticles();
        createParticles(newCount);

        if (particleSlider) particleSlider.value = newCount;
        if (particleCountDisplay) particleCountDisplay.textContent = `${newCount}`;

        const buttons = [qualityLowBtn, qualityMedBtn, qualityHighBtn];
        buttons.forEach(btn => {
            if (!btn) return;
            const countVal = parseInt(btn.dataset.count, 10);
            if (countVal === newCount) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    const tempBasisMat = new THREE.Matrix4();
    function alignValveGroupToSpine(valveGroup, heartIndex, localU) {
        const loopS = getLoopSFromHeartU(heartIndex, localU);
        const sp = getSpineAtS(loopS, tempSpine);
        valveGroup.position.set(sp.cx, sp.cy, sp.cz);
        tempBasisMat.set(
            sp.vx, sp.ux, sp.tx, 0,
            sp.vy, sp.uy, sp.ty, 0,
            sp.vz, sp.uz, sp.tz, 0,
            0,     0,     0,     1
        );
        valveGroup.quaternion.setFromRotationMatrix(tempBasisMat);
    }

    function syncValvesToSpine() {
        const allValveMeshes = [...frontValveMeshes, ...backValveMeshes];
        for (let i = 0; i < allValveMeshes.length; i++) {
            const valveGroup = allValveMeshes[i];
            if (!valveGroup || !valveGroup.userData) continue;
            alignValveGroupToSpine(valveGroup, valveGroup.userData.heartIndex, valveGroup.userData.zPos);
        }
    }

    function createValve(position) {
        let zPos;
        if (position === 'front') {
            zPos = -halfCompressionLength - 1; // u = -16
        } else if (position === 'back') {
            zPos = halfCompressionLength + 1;  // u = +16
        }

        for (let h = 0; h < 2; h++) {
            const valveAnchor = {
                heartIndex: h,
                zPos: zPos
            };

            const valveGroup = new THREE.Group();
            alignValveGroupToSpine(valveGroup, h, zPos);
            valveGroup.visible = (h === 0) || dualHeartEnabled;

            const ringGeometry = new THREE.TorusGeometry(tubeRadius * 0.98, 0.2, 12, 32);
            const ringMaterial = new THREE.MeshPhongMaterial({ color: 0xb91c1c });
            const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            valveGroup.add(ringMesh);

            const cuspMaterial = new THREE.MeshPhongMaterial({
                color: 0xf87171,
                emissive: 0x7f1d1d,
                emissiveIntensity: 0.2,
                side: THREE.DoubleSide
            });

            const flapWidth = tubeRadius * 1.65;
            const flapLength = tubeRadius * 0.88;
            const flapThickness = 0.16;
            const cuspGeometry = new THREE.BoxGeometry(flapWidth, flapLength, flapThickness);

            const topPivot = new THREE.Group();
            topPivot.position.set(0, tubeRadius * 0.72, 0);
            const topCusp = new THREE.Mesh(cuspGeometry, cuspMaterial);
            topCusp.position.set(0, -flapLength / 2, 0);
            topPivot.add(topCusp);
            valveGroup.add(topPivot);

            const bottomPivot = new THREE.Group();
            bottomPivot.position.set(0, -tubeRadius * 0.72, 0);
            const bottomCusp = new THREE.Mesh(cuspGeometry, cuspMaterial);
            bottomCusp.position.set(0, flapLength / 2, 0);
            bottomPivot.add(bottomCusp);
            valveGroup.add(bottomPivot);

            const restAngle = 0.18;
            topPivot.rotation.x = restAngle;
            bottomPivot.rotation.x = -restAngle;

            valveGroup.material = cuspMaterial;
            valveGroup.userData = {
                topPivot,
                bottomPivot,
                currentOpen: 0,
                heartIndex: h,
                zPos,
                position
            };

            if (position === 'front') {
                frontValveMeshes.push(valveGroup);
                frontValveBodies.push(valveAnchor);
            } else if (position === 'back') {
                backValveMeshes.push(valveGroup);
                backValveBodies.push(valveAnchor);
            }

            scene.add(valveGroup);
        }
    }

    function addValve(position) {
        if (position === 'front' && !frontValveEnabled) {
            createValve('front');
            frontValveEnabled = true;
            if (toggleFrontValveBtn) {
                toggleFrontValveBtn.textContent = '移除動脈瓣';
                toggleFrontValveBtn.classList.add('btn-active');
            }
        } else if (position === 'back' && !backValveEnabled) {
            createValve('back');
            backValveEnabled = true;
            if (toggleBackValveBtn) {
                toggleBackValveBtn.textContent = '移除房室瓣';
                toggleBackValveBtn.classList.add('btn-active');
            }
        }
    }

    function removeValve(position) {
        if (position === 'front' && frontValveEnabled) {
            frontValveMeshes.forEach(m => {
                scene.remove(m);
                if (m.traverse) {
                    m.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose());
                            else child.material.dispose();
                        }
                    });
                }
            });
            frontValveMeshes = [];
            frontValveBodies = [];
            frontValveEnabled = false;
            if (toggleFrontValveBtn) {
                toggleFrontValveBtn.textContent = '出口動脈瓣';
                toggleFrontValveBtn.classList.remove('btn-active');
            }
        } else if (position === 'back' && backValveEnabled) {
            backValveMeshes.forEach(m => {
                scene.remove(m);
                if (m.traverse) {
                    m.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose());
                            else child.material.dispose();
                        }
                    });
                }
            });
            backValveMeshes = [];
            backValveBodies = [];
            backValveEnabled = false;
            if (toggleBackValveBtn) {
                toggleBackValveBtn.textContent = '入口房室瓣';
                toggleBackValveBtn.classList.remove('btn-active');
            }
        }
    }

    function updateDynamicBendTransition(dt) {
        const bendDiff = targetBend - currentBend;
        if (Math.abs(bendDiff) <= 0.0001) return;

        const oldLoopLength = loopTotalLength;
        const count = particles.length;
        for (let i = 0; i < count; i++) {
            const p = particles[i];
            const pos = p.body.position;
            const vel = p.body.velocity;
            p.s = projectPointToSpineS(pos.x, pos.y, pos.z, p.s);
            const spOld = getSpineAtS(p.s, tempSpinePrev);
            const dx = pos.x - spOld.cx;
            const dy = pos.y - spOld.cy;
            const dz = pos.z - spOld.cz;
            p._normS = p.s / oldLoopLength;
            p._rv = dx * spOld.vx + dy * spOld.vy + dz * spOld.vz;
            p._ru = dx * spOld.ux + dy * spOld.uy + dz * spOld.uz;
            p._velS = vel.x * spOld.tx + vel.y * spOld.ty + vel.z * spOld.tz;
            p._velV = vel.x * spOld.vx + vel.y * spOld.vy + vel.z * spOld.vz;
            p._velU = vel.x * spOld.ux + vel.y * spOld.uy + vel.z * spOld.uz;
        }

        const step = bendDiff * Math.min(1.0, dt * 4.2);
        if (Math.abs(bendDiff) < 0.001) {
            currentBend = targetBend;
        } else {
            currentBend += step;
        }
        rebuildSpineTable(currentBend);
        syncValvesToSpine();

        for (let i = 0; i < count; i++) {
            const p = particles[i];
            const pos = p.body.position;
            const vel = p.body.velocity;
            p.s = p._normS * loopTotalLength;
            const spNew = getSpineAtS(p.s, tempSpine);
            pos.x = spNew.cx + p._rv * spNew.vx + p._ru * spNew.ux;
            pos.y = spNew.cy + p._rv * spNew.vy + p._ru * spNew.uy;
            pos.z = spNew.cz + p._rv * spNew.vz + p._ru * spNew.uz;
            vel.x = p._velS * spNew.tx + p._velV * spNew.vx + p._velU * spNew.ux;
            vel.y = p._velS * spNew.ty + p._velV * spNew.vy + p._velU * spNew.uy;
            vel.z = p._velS * spNew.tz + p._velV * spNew.vz + p._velU * spNew.uz;
        }
    }

    function updateCompression(dt) {
        updateDynamicBendTransition(dt);

        if (autoCompressEnabled) {
            autoCompressTimer += dt;
            if (autoCompressTimer >= autoCycleHalfPeriod) {
                autoCompressTimer = 0;
                if (vesselState === 'compress') {
                    setVesselPhase('expand');
                } else {
                    setVesselPhase('compress');
                }
            }
        } else if (irregularCompressEnabled) {
            irregularTimer += dt;
            tremorTime += dt;
            if (irregularTimer >= irregularNextInterval) {
                scheduleNextIrregularPhase();
            }
        }

        phaseTimer += dt;

        let targetCompression = 0;
        const effectiveStrength = irregularCompressEnabled ? irregularStrength : 1.0;
        const tremorOffset = (irregularCompressEnabled && irregularModeType === 'fibrillation')
            ? Math.sin(tremorTime * 42.0) * 0.12
            : 0;

        if (vesselState === 'compress') {
            targetCompression = 1.0 * effectiveStrength + tremorOffset;
        } else if (vesselState === 'expand') {
            targetCompression = -0.55 * effectiveStrength + tremorOffset;
        } else {
            targetCompression = 0.0;
        }

        const adaptSpeed = irregularCompressEnabled ? compressionSpeed * 1.45 : compressionSpeed;
        currentCompression += (targetCompression - currentCompression) * adaptSpeed * (dt * 60);

        let targetAtriumBulge = 0;
        if (atriumEnabled) {
            if (irregularCompressEnabled) {
                targetAtriumBulge = 0.68 + 0.22 * Math.sin(tremorTime * 19.0);
            } else if (vesselState === 'compress') {
                targetAtriumBulge = 1.05;
            } else if (vesselState === 'expand') {
                targetAtriumBulge = 0.28;
            } else {
                targetAtriumBulge = 0.85;
            }
        }

        const prevAtriumBulge = atriumCurrentBulge;
        atriumCurrentBulge += (targetAtriumBulge - atriumCurrentBulge) * 0.09 * (dt * 60);
        const atriumBulgeDelta = atriumCurrentBulge - prevAtriumBulge;

        // 推進動脈彈性脈搏波
        const pulseWaveSpeed = 42.0;
        for (let i = arterialPulseWaves.length - 1; i >= 0; i--) {
            const wave = arterialPulseWaves[i];
            wave.z -= pulseWaveSpeed * dt;
            const decayRate = (regurgitationEnabled && frontValveEnabled && vesselState === 'expand')
                ? Math.pow(0.78, dt * 60)
                : Math.pow(0.982, dt * 60);
            wave.amplitude *= decayRate;
            if (wave.z < -halfTubeLength - 15 || wave.amplitude < 0.04) {
                arterialPulseWaves.splice(i, 1);
            }
        }

        // 激發動脈彈性脈搏波
        if (vesselState === 'compress' && (frontValveEnabled || backValveEnabled)) {
            const isChamberContracted = currentCompression >= 0.35 || phaseTimer >= 0.22;
            const isValveOpened = !frontValveEnabled || (frontValveMeshes.length > 0 && frontValveMeshes[0].userData && frontValveMeshes[0].userData.currentOpen > 0.16) || phaseTimer >= 0.30;

            if (!pulseSpawnedThisPhase && isChamberContracted && isValveOpened) {
                pulseSpawnedThisPhase = true;
                const regurgLoss = (regurgitationEnabled && backValveEnabled) ? 0.48 : 1.0;
                const amp = (irregularCompressEnabled ? irregularStrength : 1.0) * (frontValveEnabled ? 1.0 : 0.8) * regurgLoss;
                arterialPulseWaves.push({
                    z: -halfCompressionLength - 1.0,
                    amplitude: amp,
                    width: 8.5
                });
            }
        }

        // 更新外管與套管網格頂點
        if (!dualHeartEnabled) {
            updateCylinderMeshProfile(singleTubeMesh, 1.0);
        } else {
            updateCylinderMeshProfile(loopTubeMesh, 1.0);
        }

        const activeHearts = dualHeartEnabled ? 2 : 1;
        for (let h = 0; h < 2; h++) {
            const isHeartActive = (h < activeHearts);
            if (compressionZoneMeshes[h]) {
                compressionZoneMeshes[h].visible = isHeartActive;
                if (isHeartActive) {
                    updateCylinderMeshProfile(compressionZoneMeshes[h], 1.02);
                }
            }

            const atrMesh = atriumZoneMeshes[h];
            if (atrMesh) {
                if (isHeartActive && atriumCurrentBulge > 0.01) {
                    atrMesh.visible = true;
                    atrMesh.material.opacity = Math.min(0.36, atriumCurrentBulge * 0.36);
                    updateCylinderMeshProfile(atrMesh, 1.025);
                } else {
                    atrMesh.visible = false;
                }
            }

            const artMesh = arteryZoneMeshes[h];
            const hasAnyValve = frontValveEnabled || backValveEnabled;
            if (artMesh) {
                if (isHeartActive && hasAnyValve) {
                    artMesh.visible = true;
                    updateCylinderMeshProfile(artMesh, 1.02);
                    const activePulseAmp = arterialPulseWaves.length > 0 ? Math.max(...arterialPulseWaves.map(w => w.amplitude)) : 0;
                    artMesh.material.emissiveIntensity = 0.12 + Math.min(0.50, activePulseAmp * 0.40);
                    artMesh.material.opacity = 0.25 + Math.min(0.25, activePulseAmp * 0.20);
                } else {
                    artMesh.visible = false;
                    if (!hasAnyValve) arterialPulseWaves = [];
                }
            }
        }

        let pulseEnvelope;
        if (autoCompressEnabled) {
            pulseEnvelope = 0.6 + 0.4 * Math.cos(Math.min(Math.PI, (phaseTimer / autoCycleHalfPeriod) * Math.PI * 0.7));
        } else if (irregularCompressEnabled) {
            pulseEnvelope = effectiveStrength * Math.exp(-phaseTimer * 2.1);
        } else {
            pulseEnvelope = Math.exp(-phaseTimer * 1.6);
        }

        const frontZ = -halfCompressionLength - 1; // -16
        const backZ = halfCompressionLength + 1;   // +16

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const pos = p.body.position;
            const vel = p.body.velocity;

            const prevS = p.s;
            const spPrev = getSpineAtS(prevS, tempSpinePrev);
            let velS = vel.x * spPrev.tx + vel.y * spPrev.ty + vel.z * spPrev.tz;
            let velV = vel.x * spPrev.vx + vel.y * spPrev.vy + vel.z * spPrev.vz;
            let velU = vel.x * spPrev.ux + vel.y * spPrev.uy + vel.z * spPrev.uz;

            const newS = projectPointToSpineS(pos.x, pos.y, pos.z, prevS);
            p.s = newS;
            const sp = getSpineAtS(newS, tempSpine);
            const { u: posZ } = getHeartLocalU(newS);

            const newPalIdx = getParticleOxygenPaletteIndex(newS);
            if (newPalIdx !== p.palIdx && rbcMaterialPalette[newPalIdx]) {
                p.palIdx = newPalIdx;
                p.mesh.material = rbcMaterialPalette[newPalIdx];
            }

            const dx = pos.x - sp.cx;
            const dy = pos.y - sp.cy;
            const dz = pos.z - sp.cz;
            const rv = dx * sp.vx + dy * sp.vy + dz * sp.vz;
            const ru = dx * sp.ux + dy * sp.uy + dz * sp.uz;
            const rSq = rv * rv + ru * ru;

            let targetVz = 0;

            // 在雙心循環的頂端連接區段 (左上/右上動靜脈交界處)，給予持續平穩的順向推進動能並收斂橫向離心偏移
            const isTopArch = dualHeartEnabled && (
                (newS > seg1StartS && newS < seg2StartS) ||
                (newS > seg3StartS && newS < loopTotalLength)
            );
            if (isTopArch) {
                targetVz = -9.5 * Math.max(0.45, pulseEnvelope);
                velV *= 0.88;
                velU *= 0.88;
            } else {
                if (atriumCurrentBulge > 0.05 && posZ >= atriumZMin && posZ <= atriumZMax) {
                    const localMaxR = getEffectiveTubeRadiusAtZ(posZ) - particleRadius * 1.2;
                    if (atriumBulgeDelta > 0.0005 && rSq > 0.01 && rSq < localMaxR * localMaxR * 0.85) {
                        const radialOutSpeed = atriumBulgeDelta * 45.0;
                        const r = Math.sqrt(rSq);
                        velV += (rv / r) * radialOutSpeed;
                        velU += (ru / r) * radialOutSpeed;
                    }
                }

                if (vesselState === 'compress') {
                    if (backValveEnabled) {
                        if (regurgitationEnabled) {
                            const isCentralJet = rSq < 3.2 * 3.2;
                            if (posZ >= -4 && posZ <= backZ + 20) {
                                if (isCentralJet) {
                                    targetVz = +(12.5 + Math.sin(phaseTimer * 28.0) * 2.5) * pulseEnvelope;
                                } else {
                                    targetVz = +(4.0 * pulseEnvelope);
                                }
                            } else if (posZ > backZ + 20) {
                                targetVz = +(3.0 * pulseEnvelope);
                            } else {
                                const chamberProgress = Math.max(0, (posZ - frontZ) / (backZ - frontZ));
                                const speed = (2.5 + 5.5 * (1.0 - chamberProgress)) * pulseEnvelope;
                                targetVz = -speed;
                            }
                        } else {
                            if (posZ <= backZ) {
                                const chamberProgress = posZ > frontZ
                                    ? (backZ - posZ) / (backZ - frontZ)
                                    : 1.0;
                                const speed = (6.5 + 13.5 * chamberProgress) * pulseEnvelope;
                                targetVz = -speed;
                            } else if (atriumEnabled) {
                                if (posZ > atriumZMax) {
                                    targetVz = -9.5 * pulseEnvelope;
                                } else {
                                    const pouchProgress = (posZ - backZ) / atriumLength;
                                    targetVz = -(1.5 + 6.5 * pouchProgress) * pulseEnvelope;
                                }
                            } else {
                                targetVz = -5.2 * pulseEnvelope;
                            }
                        }
                    } else {
                        if (posZ < 0) {
                            const factor = Math.min(1.0, Math.abs(posZ) / 12 + 0.25);
                            targetVz = -14.0 * factor * pulseEnvelope;
                        } else {
                            const factor = Math.min(1.0, Math.abs(posZ) / 12 + 0.25);
                            targetVz = +14.0 * factor * pulseEnvelope;
                        }
                    }
                } else if (vesselState === 'expand') {
                    const atrialBoost = (atriumEnabled && posZ >= centralSectionZ && posZ <= atriumZMax + 4)
                        ? (irregularCompressEnabled ? 0.85 : 1.38)
                        : 1.0;

                    if (frontValveEnabled) {
                        if (regurgitationEnabled) {
                            if (posZ <= frontZ && posZ >= frontZ - 30) {
                                const leakFactor = Math.max(0.35, 1.0 - Math.abs(posZ - frontZ) / 30);
                                targetVz = +(13.5 * leakFactor) * pulseEnvelope;
                            } else if (posZ < frontZ - 30) {
                                targetVz = +0.5 * pulseEnvelope;
                            } else if (posZ > frontZ && posZ <= 0) {
                                targetVz = +(6.5 * (1.0 - (posZ - frontZ) / 16)) * pulseEnvelope;
                            } else {
                                const distToFront = Math.max(0, posZ - frontZ);
                                const fillFactor = Math.min(1.0, distToFront / 10 + 0.35);
                                targetVz = -11.0 * fillFactor * atrialBoost * pulseEnvelope;
                            }
                        } else {
                            if (posZ >= frontZ) {
                                const distToFront = Math.max(0, posZ - frontZ);
                                const fillFactor = Math.min(1.0, distToFront / 10 + 0.35);
                                targetVz = -15.0 * fillFactor * atrialBoost * pulseEnvelope;
                            } else {
                                targetVz = -5.8 * pulseEnvelope;
                            }
                        }
                    } else {
                        if (posZ < -2) {
                            const factor = Math.min(1.0, Math.abs(posZ) / 15 + 0.25);
                            targetVz = +13.5 * factor * pulseEnvelope;
                        } else if (posZ > 2) {
                            const factor = Math.min(1.0, Math.abs(posZ) / 15 + 0.25);
                            targetVz = -13.5 * factor * atrialBoost * pulseEnvelope;
                        } else {
                            targetVz = 0;
                        }
                    }
                }
            }

            if (posZ < -halfCompressionLength - 1 && posZ > -halfTubeLength) {
                for (let w = 0; w < arterialPulseWaves.length; w++) {
                    const wave = arterialPulseWaves[w];
                    const dist = posZ - wave.z;
                    if (Math.abs(dist) < wave.width * 1.8) {
                        const pushFactor = Math.exp(-(dist * dist) / (wave.width * wave.width));
                        targetVz -= wave.amplitude * pushFactor * 10.5;
                    }
                }
            }

            if (vesselState === 'normal') {
                velS *= 0.94;
            } else {
                velS += (targetVz - velS) * 0.18;
            }

            vel.x = velS * sp.tx + velV * sp.vx + velU * sp.ux;
            vel.y = velS * sp.ty + velV * sp.vy + velU * sp.uy;
            vel.z = velS * sp.tz + velV * sp.vz + velU * sp.uz;
        }
    }

    function updateValves() {
        const hasFront = frontValveEnabled;
        const hasBack = backValveEnabled;
        const frontZ = -halfCompressionLength - 1; // -16
        const backZ = halfCompressionLength + 1;   // +16

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const pos = p.body.position;
            const vel = p.body.velocity;

            let s = projectPointToSpineS(pos.x, pos.y, pos.z, p.s);
            let sp = getSpineAtS(s, tempSpine);
            let { heartIndex, u: localU } = getHeartLocalU(s);

            const dx = pos.x - sp.cx;
            const dy = pos.y - sp.cy;
            const dz = pos.z - sp.cz;
            let rv = dx * sp.vx + dy * sp.vy + dz * sp.vz;
            let ru = dx * sp.ux + dy * sp.uy + dz * sp.uz;

            // 1. 動態 3D 管壁徑向約束與法平面鎖定 (確保大曲率轉彎處血球絕對不穿出管壁)
            const localTubeRadius = getEffectiveTubeRadiusAtZ(localU);
            const maxAllowedR = Math.max(0.5, localTubeRadius - particleRadius * 0.95);
            const rSq = rv * rv + ru * ru;

            if (rSq > maxAllowedR * maxAllowedR) {
                const r = Math.sqrt(rSq);
                const scale = maxAllowedR / r;
                rv *= scale;
                ru *= scale;

                const nv = rv / maxAllowedR;
                const nu = ru / maxAllowedR;
                const nx = nv * sp.vx + nu * sp.ux;
                const ny = nv * sp.vy + nu * sp.uy;
                const nz = nv * sp.vz + nu * sp.uz;
                const radialVel = vel.x * nx + vel.y * ny + vel.z * nz;
                if (radialVel > 0) {
                    vel.x -= radialVel * nx * 1.25;
                    vel.y -= radialVel * ny * 1.25;
                    vel.z -= radialVel * nz * 1.25;
                }
            }

            pos.x = sp.cx + rv * sp.vx + ru * sp.ux;
            pos.y = sp.cy + rv * sp.vy + ru * sp.uy;
            pos.z = sp.cz + rv * sp.vz + ru * sp.uz;

            let velS = vel.x * sp.tx + vel.y * sp.ty + vel.z * sp.tz;
            const velV = vel.x * sp.vx + vel.y * sp.vy + vel.z * sp.vz;
            const velU = vel.x * sp.ux + vel.y * sp.uy + vel.z * sp.uz;

            // 2. 單向瓣膜物理阻擋判定
            if (hasBack && Math.abs(localU) <= halfTubeLength) {
                if (localU <= backZ && localU > backZ - 4.0 && velS > 0) {
                    const isLeakingThrough = regurgitationEnabled && (rSq < 2.5 * 2.5);
                    if (!isLeakingThrough) {
                        velS = -Math.abs(velS) * 0.15;
                        if (localU > backZ - 0.3) {
                            const clampedU = backZ - 0.3 - Math.random() * 0.8;
                            s = getLoopSFromHeartU(heartIndex, clampedU);
                            sp = getSpineAtS(s, tempSpine);
                            pos.x = sp.cx + rv * sp.vx + ru * sp.ux;
                            pos.y = sp.cy + rv * sp.vy + ru * sp.uy;
                            pos.z = sp.cz + rv * sp.vz + ru * sp.uz;
                        }
                        vel.x = velS * sp.tx + velV * sp.vx + velU * sp.ux;
                        vel.y = velS * sp.ty + velV * sp.vy + velU * sp.uy;
                        vel.z = velS * sp.tz + velV * sp.vz + velU * sp.uz;
                    }
                }
            }

            if (hasFront && Math.abs(localU) <= halfTubeLength) {
                if (localU <= frontZ && localU > frontZ - 4.0 && velS > 0) {
                    const isLeakingThrough = regurgitationEnabled && (rSq < 2.5 * 2.5);
                    if (!isLeakingThrough) {
                        velS = -Math.abs(velS) * 0.15;
                        if (localU > frontZ - 0.3) {
                            const clampedU = frontZ - 0.3 - Math.random() * 0.8;
                            s = getLoopSFromHeartU(heartIndex, clampedU);
                            sp = getSpineAtS(s, tempSpine);
                            pos.x = sp.cx + rv * sp.vx + ru * sp.ux;
                            pos.y = sp.cy + rv * sp.vy + ru * sp.uy;
                            pos.z = sp.cz + rv * sp.vz + ru * sp.uz;
                        }
                        vel.x = velS * sp.tx + velV * sp.vx + velU * sp.ux;
                        vel.y = velS * sp.ty + velV * sp.vy + velU * sp.uy;
                        vel.z = velS * sp.tz + velV * sp.vz + velU * sp.uz;
                    }
                }
            }

            if (!dualHeartEnabled) {
                if (s <= 0.5 && velS < 0) {
                    s = loopTotalLength - 1.0 - Math.random() * 2.0;
                    const { x: newRv, y: newRu } = randomCrossSectionXY(tubeRadius);
                    sp = getSpineAtS(s, tempSpine);
                    pos.x = sp.cx + newRv * sp.vx + newRu * sp.ux;
                    pos.y = sp.cy + newRv * sp.vy + newRu * sp.uy;
                    pos.z = sp.cz + newRv * sp.vz + newRu * sp.uz;
                    vel.x = velS * sp.tx;
                    vel.y = velS * sp.ty;
                    vel.z = velS * sp.tz;
                } else if (s >= loopTotalLength - 0.5 && velS > 0) {
                    s = 1.0 + Math.random() * 2.0;
                    const { x: newRv, y: newRu } = randomCrossSectionXY(tubeRadius);
                    sp = getSpineAtS(s, tempSpine);
                    pos.x = sp.cx + newRv * sp.vx + newRu * sp.ux;
                    pos.y = sp.cy + newRv * sp.vy + newRu * sp.uy;
                    pos.z = sp.cz + newRv * sp.vz + newRu * sp.uz;
                    vel.x = velS * sp.tx;
                    vel.y = velS * sp.ty;
                    vel.z = velS * sp.tz;
                }
            }

            p.s = s;
        }
    }

    function updateValveFlapAnimation(valveMesh, valveZ, valveType) {
        if (!valveMesh || !valveMesh.visible || !valveMesh.userData || !valveMesh.userData.topPivot) return;
        const { topPivot, bottomPivot, heartIndex } = valveMesh.userData;

        const valveLoopS = getLoopSFromHeartU(heartIndex, valveZ);
        const spValve = getSpineAtS(valveLoopS, tempSpine);

        let netForwardFlow = 0;
        let count = 0;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            let ds = Math.abs(p.s - valveLoopS);
            if (dualHeartEnabled && ds > loopTotalLength * 0.5) ds = loopTotalLength - ds;
            if (ds < 9) {
                count++;
                const vel = p.body.velocity;
                const velS = vel.x * spValve.tx + vel.y * spValve.ty + vel.z * spValve.tz;
                netForwardFlow += -velS;
            }
        }

        const avgForwardFlow = count > 0 ? (netForwardFlow / count) : 0;

        let targetOpen = 0;
        let isRegurgitating = false;

        if (valveType === 'front' && vesselState === 'expand') {
            if (regurgitationEnabled) {
                targetOpen = 0.36;
                isRegurgitating = true;
            } else {
                targetOpen = 0.0;
            }
        } else if (valveType === 'back' && vesselState === 'compress') {
            if (regurgitationEnabled) {
                targetOpen = 0.36;
                isRegurgitating = true;
            } else {
                targetOpen = 0.0;
            }
        } else if (avgForwardFlow > 0.8) {
            targetOpen = Math.min(1.0, (avgForwardFlow - 0.5) / 8.0);
        } else {
            targetOpen = regurgitationEnabled ? 0.22 : 0.0;
        }

        const smoothing = targetOpen > valveMesh.userData.currentOpen ? 0.22 : 0.38;
        valveMesh.userData.currentOpen += (targetOpen - valveMesh.userData.currentOpen) * smoothing;

        const restAngle = 0.18;
        const maxTilt = 0.65;
        const regurgFlutter = isRegurgitating ? Math.sin(phaseTimer * 46.0) * 0.07 : 0;

        topPivot.rotation.x = restAngle + (valveMesh.userData.currentOpen + regurgFlutter) * maxTilt;
        bottomPivot.rotation.x = -restAngle - (valveMesh.userData.currentOpen + regurgFlutter) * maxTilt;
    }

    function positionSingleLabel(el, x, y, z, isActive) {
        if (!el || el.classList.contains('hidden')) return;
        tempProjVec.set(x, y, z);
        tempProjVec.project(camera);

        if (tempProjVec.z > 1.0) {
            el.style.display = 'none';
            return;
        }
        el.style.display = 'flex';
        const screenX = (tempProjVec.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (-tempProjVec.y * 0.5 + 0.5) * window.innerHeight;
        el.style.left = `${screenX}px`;
        el.style.top = `${screenY}px`;
        el.classList.toggle('anat-inactive', !isActive);
    }

    function positionLabelAtHeartU(el, heartIndex, localU, isTop, radiusAtS, isActive, zOutwardOffset) {
        const loopS = getLoopSFromHeartU(heartIndex, localU);
        const sp = getSpineAtS(loopS, tempSpine);
        const offset = radiusAtS + 4.8;
        const wy = sp.cy + (isTop ? offset : -offset);
        const wz = sp.cz + (zOutwardOffset || 0);
        positionSingleLabel(el, sp.cx, wy, wz, isActive);
    }

    function updateAnatomicalLabels() {
        if (!labelsVisible) return;
        const frontZ = -halfCompressionLength - 1; // -16 動脈瓣
        const backZ = halfCompressionLength + 1;   // +16 房室瓣
        const atriumR = getEffectiveTubeRadiusAtZ(atriumCenterZ);
        const ventR = getEffectiveTubeRadiusAtZ(centralSectionZ);
        const arteryR = getEffectiveTubeRadiusAtZ(arteryCenterZ);
        const hasCirculation = frontValveEnabled || backValveEnabled || atriumEnabled;

        if (!dualHeartEnabled) {
            positionLabelAtHeartU(labelVein, 0, 48, true, tubeRadius, hasCirculation, 0);
            positionLabelAtHeartU(labelAtrium, 0, atriumCenterZ, false, atriumR, atriumEnabled, 0);
            positionLabelAtHeartU(labelAvValve, 0, backZ, false, tubeRadius, backValveEnabled, 0);
            positionLabelAtHeartU(labelVentricle, 0, centralSectionZ, false, ventR, true, 0);
            positionLabelAtHeartU(labelArterialValve, 0, frontZ, false, tubeRadius, frontValveEnabled, 0);
            positionLabelAtHeartU(labelArtery, 0, -45, true, arteryR, hasCirculation, 0);
        } else {
            positionLabelAtHeartU(labelVein, 0, 48, true, tubeRadius, hasCirculation, 6.0);
            positionLabelAtHeartU(labelAtrium, 0, atriumCenterZ, false, atriumR, atriumEnabled, 7.0);
            positionLabelAtHeartU(labelAvValve, 0, backZ, false, tubeRadius, backValveEnabled, 5.0);
            positionLabelAtHeartU(labelVentricle, 0, centralSectionZ, false, ventR, true, 3.5);
            positionLabelAtHeartU(labelArterialValve, 0, frontZ, false, tubeRadius, frontValveEnabled, -4.0);
            positionLabelAtHeartU(labelArtery, 0, -48, true, arteryR, hasCirculation, 0);

            positionLabelAtHeartU(labelVein2, 1, 48, true, tubeRadius, hasCirculation, -6.0);
            positionLabelAtHeartU(labelAtrium2, 1, atriumCenterZ, false, atriumR, atriumEnabled, -7.0);
            positionLabelAtHeartU(labelVentricle2, 1, centralSectionZ, false, ventR, true, -3.5);
            positionLabelAtHeartU(labelArtery2, 1, -48, true, arteryR, hasCirculation, 0);
        }
    }

    function resetCamera() {
        initCameraSpherical(78, 26, 0, 0, -2, 0);
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    let lastTime = performance.now();

    function animate(now) {
        requestAnimationFrame(animate);

        const dt = Math.min(0.05, Math.max(0.001, ((now || performance.now()) - lastTime) / 1000));
        lastTime = now || performance.now();

        world.step(1 / 60, dt, 2);

        updateCompression(dt);
        updateValves();

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.mesh.position.copy(p.body.position);
            p.mesh.quaternion.copy(p.body.quaternion);
        }

        if (frontValveEnabled) {
            for (let i = 0; i < frontValveMeshes.length; i++) {
                updateValveFlapAnimation(frontValveMeshes[i], frontValveMeshes[i].userData.zPos, 'front');
            }
        }
        if (backValveEnabled) {
            for (let i = 0; i < backValveMeshes.length; i++) {
                updateValveFlapAnimation(backValveMeshes[i], backValveMeshes[i].userData.zPos, 'back');
            }
        }

        if (labelsVisible) {
            updateAnatomicalLabels();
        }

        renderer.render(scene, camera);
    }

    init();
    setVesselPhase('normal');
    animate(performance.now());
};
