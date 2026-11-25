// --- 全域任意位置連續多尺度染色體至 DNA 雙股螺旋 3D 模擬 ---

const D_MAX = 72.0;
const D_MIN = 0.32;
const SOLENOID_TURNS = 200;
const NUCS_PER_TURN = 6;
const NUCS_PER_CHROMATID = SOLENOID_TURNS * NUCS_PER_TURN; // 1,200 顆核小體 / 姊妹染色分體
const R_SOLENOID = 0.62;
const R_WRAP = 0.31;
const WRAP_HALF_ANGLE = 1.65 * Math.PI;
const WRAP_RISE = 0.24;

const CHROMATIN_CHUNK_SIZE = 150; // 每 150 顆核小體預建為一個平滑 DNA 區塊，共 16 區塊覆蓋全染色體
const MAX_BASE_INSTANCES = 4800;

let scene, camera, renderer, controls;
let container, loadingEl;
let zoomSlider, stagePills, stageBadge, scaleReadout, regionReadout, stageTitle, stageDesc, legendList;

let targetZoom = 0.0;
let currentZoom = 0.0;
let lastFrameTime = performance.now();
let lastUiStage = '';
let lastRegionText = '';
let pointerMode = 'none'; // 'none' | 'orbit' | 'pan'
let pointerDownPos = { x: 0, y: 0 };
let prevPointerPos = { x: 0, y: 0 };
let activePinchDist = null;

// --- 全域資料結構 ---
const chromatids = []; // 兩條完整連續姊妹染色分體 (0: 右側, 1: 左側)
let activeC = 0;
let activeK = 0;
let defaultC = 0;
let defaultK = 0;

let hasBuiltHelix = false;
const builtHelixCenter = new THREE.Vector3();
let activeHelixSamplePoints = [];

// --- GPU 空間球形剖切共用 Uniforms ---
const sharedCutUniforms = {
    uFocusCenter: { value: new THREE.Vector3(0, 0, 0) },
    uMacroCutStrength: { value: 0.0 },
    uChromatinStrength: { value: 0.0 },
    uHelixCutStrength: { value: 0.0 },
    uHelixStrength: { value: 0.0 }
};

const sceneRefs = {
    macroTubularMeshes: [],
    macroEnvelopeMeshes: [],
    centromereCollarMesh: null,
    histoneInstancedMesh: null,
    chromatinDnaMat: null,
    chromatinDnaChunks: [],
    dnaHelixGroup: null,
    dnaStrandMesh1: null,
    dnaStrandMesh2: null,
    dnaBaseMeshes: [],
    hoverProbeRing: null,
    hoverProbeCore: null,
    ambientParticles: null,
    anchors: {
        p0: new THREE.Vector3(0, 0, 0),
        targetP1: new THREE.Vector3(),
        targetP2: new THREE.Vector3(),
        targetP3: new THREE.Vector3(),
        smoothedP1: new THREE.Vector3(),
        smoothedP2: new THREE.Vector3(),
        smoothedP3: new THREE.Vector3(),
        hoverPos: new THREE.Vector3(),
        hoverVisible: false
    }
};

// --- 數學輔助函式 ---
function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

/**
 * 沿 3D 曲線計算平行傳輸座標系 (Bishop / Rotation-Minimizing Frames)
 */
function computeParallelTransportFrames(curve, segments) {
    curve.arcLengthDivisions = Math.max(curve.arcLengthDivisions || 200, segments * 2);
    const points = new Array(segments + 1);
    const tangents = new Array(segments + 1);
    const normals = new Array(segments + 1);
    const binormals = new Array(segments + 1);

    for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        points[i] = curve.getPointAt(u);
        tangents[i] = curve.getTangentAt(u).normalize();
    }

    const t0 = tangents[0];
    const refAxis = Math.abs(t0.x) < 0.85
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 1, 0);
    const n0 = new THREE.Vector3().crossVectors(t0, refAxis).normalize();
    normals[0] = n0;
    binormals[0] = new THREE.Vector3().crossVectors(t0, n0).normalize();

    const rotAxis = new THREE.Vector3();
    const rotQuat = new THREE.Quaternion();

    for (let i = 1; i <= segments; i++) {
        const prevT = tangents[i - 1];
        const currT = tangents[i];
        const prevN = normals[i - 1].clone();

        rotAxis.crossVectors(prevT, currT);
        const sinTheta = rotAxis.length();
        if (sinTheta > 1e-6) {
            rotAxis.divideScalar(sinTheta);
            const theta = Math.acos(clamp(prevT.dot(currT), -1, 1));
            rotQuat.setFromAxisAngle(rotAxis, theta);
            prevN.applyQuaternion(rotQuat);
        }

        prevN.addScaledVector(currT, -prevN.dot(currT)).normalize();
        normals[i] = prevN;
        binormals[i] = new THREE.Vector3().crossVectors(currT, prevN).normalize();
    }

    return { points, tangents, normals, binormals };
}

/**
 * 針對多條獨立 3D 折線 (pointRuns) 以平行傳輸座標系直接建置單一無折角 Tube BufferGeometry
 */
function buildMultiRunTubeGeometry(pointRuns, radius, radialSegments) {
    let totalVerts = 0;
    let totalIndices = 0;

    const validRuns = [];
    for (let r = 0; r < pointRuns.length; r++) {
        const pts = pointRuns[r];
        if (pts && pts.length >= 2) {
            validRuns.push(pts);
            totalVerts += pts.length * radialSegments;
            totalIndices += (pts.length - 1) * radialSegments * 6;
        }
    }

    if (validRuns.length === 0) {
        return new THREE.BufferGeometry();
    }

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const indices = totalVerts > 65535
        ? new Uint32Array(totalIndices)
        : new Uint16Array(totalIndices);

    const cosTable = new Float32Array(radialSegments);
    const sinTable = new Float32Array(radialSegments);
    for (let j = 0; j < radialSegments; j++) {
        const ang = (j / radialSegments) * Math.PI * 2;
        cosTable[j] = Math.cos(ang);
        sinTable[j] = Math.sin(ang);
    }

    const prevT = new THREE.Vector3();
    const currT = new THREE.Vector3();
    const nVec = new THREE.Vector3();
    const bVec = new THREE.Vector3();
    const rotAxis = new THREE.Vector3();
    const rotQuat = new THREE.Quaternion();
    const refX = new THREE.Vector3(1, 0, 0);
    const refY = new THREE.Vector3(0, 1, 0);

    let vOffset = 0;
    let iOffset = 0;

    for (let r = 0; r < validRuns.length; r++) {
        const pts = validRuns[r];
        const count = pts.length;
        const baseVertex = vOffset;

        for (let i = 0; i < count; i++) {
            if (i === 0) {
                currT.subVectors(pts[1], pts[0]);
            } else if (i === count - 1) {
                currT.subVectors(pts[count - 1], pts[count - 2]);
            } else {
                currT.subVectors(pts[i + 1], pts[i - 1]);
            }
            if (currT.lengthSq() < 1e-12) {
                currT.copy(i > 0 ? prevT : refY);
            } else {
                currT.normalize();
            }

            if (i === 0) {
                const refAxis = Math.abs(currT.x) < 0.85 ? refX : refY;
                nVec.crossVectors(currT, refAxis).normalize();
            } else {
                rotAxis.crossVectors(prevT, currT);
                const sinTheta = rotAxis.length();
                if (sinTheta > 1e-6) {
                    rotAxis.divideScalar(sinTheta);
                    const theta = Math.acos(clamp(prevT.dot(currT), -1, 1));
                    rotQuat.setFromAxisAngle(rotAxis, theta);
                    nVec.applyQuaternion(rotQuat);
                }
                nVec.addScaledVector(currT, -nVec.dot(currT)).normalize();
            }
            bVec.crossVectors(currT, nVec).normalize();
            prevT.copy(currT);

            const p = pts[i];
            for (let j = 0; j < radialSegments; j++) {
                const c = cosTable[j];
                const s = sinTable[j];
                const nx = c * nVec.x + s * bVec.x;
                const ny = c * nVec.y + s * bVec.y;
                const nz = c * nVec.z + s * bVec.z;

                const ptr = (vOffset + j) * 3;
                positions[ptr] = p.x + nx * radius;
                positions[ptr + 1] = p.y + ny * radius;
                positions[ptr + 2] = p.z + nz * radius;

                normals[ptr] = nx;
                normals[ptr + 1] = ny;
                normals[ptr + 2] = nz;
            }
            vOffset += radialSegments;
        }

        for (let i = 0; i < count - 1; i++) {
            const rowA = baseVertex + i * radialSegments;
            const rowB = baseVertex + (i + 1) * radialSegments;
            for (let j = 0; j < radialSegments; j++) {
                const jNext = (j + 1) % radialSegments;
                const a = rowA + j;
                const b = rowB + j;
                const c = rowB + jNext;
                const d = rowA + jNext;

                indices[iOffset++] = a;
                indices[iOffset++] = d;
                indices[iOffset++] = b;
                indices[iOffset++] = d;
                indices[iOffset++] = c;
                indices[iOffset++] = b;
            }
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeBoundingSphere();
    return geo;
}

/**
 * 注入 GPU 3D 球形漸層剖切 Shader，使任何座標點都能作為連續縮放視窗。
 */
function applySpatialWindowShader(material, opts) {
    const {
        cacheKey,
        layerStrengthUniform,
        innerCutStrengthUniform = null,
        innerR0 = 0.0,
        innerR1 = 0.0,
        outerCutEnabled = false,
        outerR0 = 0.0,
        outerR1 = 0.0,
        isInstanced = false
    } = opts;

    material.customProgramCacheKey = () => cacheKey;
    material.userData.cutBaseOpacity = opts.baseOpacity !== undefined ? opts.baseOpacity : 1.0;

    material.onBeforeCompile = shader => {
        shader.uniforms.uFocusCenter = sharedCutUniforms.uFocusCenter;
        shader.uniforms.uLayerStrength = layerStrengthUniform;
        shader.uniforms.uInnerCutStrength = innerCutStrengthUniform || { value: 0.0 };
        shader.uniforms.uInnerR0 = { value: innerR0 };
        shader.uniforms.uInnerR1 = { value: innerR1 };
        shader.uniforms.uOuterCutEnabled = { value: outerCutEnabled ? 1.0 : 0.0 };
        shader.uniforms.uOuterR0 = { value: outerR0 };
        shader.uniforms.uOuterR1 = { value: outerR1 };
        shader.uniforms.uBaseOpacity = { value: material.userData.cutBaseOpacity };
        material.userData.shaderUniforms = shader.uniforms;

        shader.vertexShader = shader.vertexShader
            .replace(
                '#include <common>',
                `#include <common>
                varying vec3 vCutWorldPos;
                uniform vec3 uFocusCenter;
                uniform float uLayerStrength;
                uniform float uOuterCutEnabled;
                uniform float uOuterR1;`
            )
            .replace(
                '#include <project_vertex>',
                `#include <project_vertex>
                vec4 cutLocalPos = vec4( transformed, 1.0 );
                #ifdef USE_INSTANCING
                    cutLocalPos = instanceMatrix * cutLocalPos;
                #endif
                vCutWorldPos = ( modelMatrix * cutLocalPos ).xyz;
                ${isInstanced ? `
                #ifdef USE_INSTANCING
                    vec3 instWorldCenter = ( modelMatrix * instanceMatrix[3] ).xyz;
                    if (uLayerStrength < 0.005 || (uOuterCutEnabled > 0.5 && distance(instWorldCenter, uFocusCenter) > (uOuterR1 + 0.65))) {
                        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
                    }
                #endif
                ` : ''}`
            );

        shader.fragmentShader = shader.fragmentShader
            .replace(
                '#include <common>',
                `#include <common>
                varying vec3 vCutWorldPos;
                uniform vec3 uFocusCenter;
                uniform float uLayerStrength;
                uniform float uInnerCutStrength;
                uniform float uInnerR0;
                uniform float uInnerR1;
                uniform float uOuterCutEnabled;
                uniform float uOuterR0;
                uniform float uOuterR1;
                uniform float uBaseOpacity;`
            )
            .replace(
                '#include <color_fragment>',
                `#include <color_fragment>
                float cutDist = distance(vCutWorldPos, uFocusCenter);
                float cutAlpha = uBaseOpacity * uLayerStrength;
                if (uInnerCutStrength > 0.001) {
                    float innerMask = smoothstep(uInnerR0, uInnerR1, cutDist);
                    cutAlpha *= mix(1.0, innerMask, uInnerCutStrength);
                }
                if (uOuterCutEnabled > 0.5) {
                    float outerMask = 1.0 - smoothstep(uOuterR0, uOuterR1, cutDist);
                    cutAlpha *= outerMask;
                }
                diffuseColor.a *= cutAlpha;
                if (diffuseColor.a < 0.015) discard;`
            );
    };
}

function updateMaterialTransparency(mat, transparent, depthWrite) {
    if (!mat) return;
    if (mat.transparent !== transparent) {
        mat.transparent = transparent;
        mat.needsUpdate = true;
    }
    mat.depthWrite = depthWrite;
}

// --- 合併 8 亞基組蛋白八聚體幾何體 ---
function createOctamerMergedGeometry() {
    const baseSphere = new THREE.SphereGeometry(0.105, 8, 6).toNonIndexed();
    const posAttr = baseSphere.getAttribute('position');
    const normAttr = baseSphere.getAttribute('normal');
    const vertsPerSphere = posAttr.count;
    const totalVerts = vertsPerSphere * 8;

    const mergedPos = new Float32Array(totalVerts * 3);
    const mergedNorm = new Float32Array(totalVerts * 3);
    const mergedColor = new Float32Array(totalVerts * 3);

    const colH34 = new THREE.Color(0x34d399);
    const colH2 = new THREE.Color(0x10b981);
    const subRadius = 0.125;
    const subAxial = 0.056;

    let cursor = 0;
    const v = new THREE.Vector3();

    for (let ring = 0; ring < 2; ring++) {
        const axialSign = ring === 0 ? -1 : 1;
        for (let q = 0; q < 4; q++) {
            const ang = (q / 4) * Math.PI * 2 + ring * (Math.PI * 0.25);
            const ox = Math.cos(ang) * subRadius;
            const oy = Math.sin(ang) * subRadius;
            const oz = axialSign * subAxial;
            const col = (q + ring) % 2 === 0 ? colH34 : colH2;

            for (let i = 0; i < vertsPerSphere; i++) {
                const idx = (cursor + i) * 3;
                v.fromBufferAttribute(posAttr, i);
                mergedPos[idx] = v.x + ox;
                mergedPos[idx + 1] = v.y + oy;
                mergedPos[idx + 2] = v.z * 0.92 + oz;

                v.fromBufferAttribute(normAttr, i);
                mergedNorm[idx] = v.x;
                mergedNorm[idx + 1] = v.y;
                mergedNorm[idx + 2] = v.z;

                mergedColor[idx] = col.r;
                mergedColor[idx + 1] = col.g;
                mergedColor[idx + 2] = col.b;
            }
            cursor += vertsPerSphere;
        }
    }

    baseSphere.dispose();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(mergedColor, 3));
    return geo;
}

// --- 初始化場景 ---
function init() {
    container = document.getElementById('container');
    loadingEl = document.getElementById('loading');
    zoomSlider = document.getElementById('zoom-slider');
    stagePills = Array.from(document.querySelectorAll('.stage-pill'));
    stageBadge = document.getElementById('stage-badge');
    scaleReadout = document.getElementById('scale-readout');
    regionReadout = document.getElementById('region-readout');
    stageTitle = document.getElementById('stage-title');
    stageDesc = document.getElementById('stage-desc');
    legendList = document.getElementById('legend-list');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0e1a);
    scene.fog = new THREE.FogExp2(0x0b0e1a, 0.0040);

    camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, D_MAX);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    // 三點式科學照明
    scene.add(new THREE.AmbientLight(0xdbeafe, 0.58));
    scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x1e1b4b, 0.55));

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.05);
    keyLight.position.set(22, 34, 42);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.55);
    rimLight.position.set(-28, -18, -24);
    scene.add(rimLight);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.05;
    controls.maxDistance = 300;
    controls.target.set(0, 0, 0);

    // 建構全域染色體、2,400 顆核小體、全染色體染色質 DNA 區塊與動態 3D 雙股螺旋
    buildWholeChromosomeAndNucleosomeLattice();
    buildChromatinDnaChunks();
    buildDynamicHelixMeshes();
    buildHoverProbe();
    buildAmbientParticles();

    defaultC = 0;
    defaultK = pickFrontFacingDefaultNucleosome(0, Math.floor(NUCS_PER_CHROMATID * 0.72));
    setActiveLocus(defaultC, defaultK, null, true);

    bindEvents();
    updateVisualsForZoom(0.0, sceneRefs.anchors.p0);
    updateStageUI(0.0, true);

    loadingEl.style.display = 'none';
    lastFrameTime = performance.now();
    animate();
}

// --- 建構兩條連續姊妹染色分體與 2,400 顆核小體晶格 ---
function buildWholeChromosomeAndNucleosomeLattice() {
    const rightSpinePts = [
        new THREE.Vector3(11.0, -26.0, -0.30),
        new THREE.Vector3(7.4, -14.0, -0.75),
        new THREE.Vector3(3.6, -5.5, -0.30),
        new THREE.Vector3(1.15, 0.0, 0.00),
        new THREE.Vector3(3.4, 5.0, 0.30),
        new THREE.Vector3(6.8, 12.5, 0.75),
        new THREE.Vector3(9.8, 21.0, 0.25)
    ];
    const leftSpinePts = rightSpinePts.map(p => new THREE.Vector3(-p.x, p.y, -p.z));

    const spineConfigs = [
        { c: 0, label: '右側染色分體', pts: rightSpinePts, phase: 0.0 },
        { c: 1, label: '左側染色分體', pts: leftSpinePts, phase: Math.PI * 0.85 }
    ];

    const macroTurns = 21.0;
    const spineSamples = 900;
    const tubeRadius = 0.95;

    const totalNucleosomes = spineConfigs.length * NUCS_PER_CHROMATID;
    const octamerGeo = createOctamerMergedGeometry();
    const histoneMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.48,
        metalness: 0.08
    });
    applySpatialWindowShader(histoneMat, {
        cacheKey: 'histone-window-v2',
        layerStrengthUniform: sharedCutUniforms.uChromatinStrength,
        outerCutEnabled: true,
        outerR0: 7.6,
        outerR1: 9.8,
        isInstanced: true
    });

    const histoneInstanced = new THREE.InstancedMesh(octamerGeo, histoneMat, totalNucleosomes);
    histoneInstanced.frustumCulled = false;
    histoneInstanced.renderOrder = 2;

    const basisMat = new THREE.Matrix4();
    const posMat = new THREE.Matrix4();
    let instCursor = 0;

    spineConfigs.forEach(cfg => {
        const spineCurve = new THREE.CatmullRomCurve3(cfg.pts);
        const spineFrames = computeParallelTransportFrames(spineCurve, spineSamples);

        let uCentro = 0.55;
        let bestAbsY = Infinity;
        for (let i = 0; i <= spineSamples; i++) {
            const absY = Math.abs(spineFrames.points[i].y);
            if (absY < bestAbsY) {
                bestAbsY = absY;
                uCentro = i / spineSamples;
            }
        }

        const coilPts = [];
        for (let i = 0; i <= spineSamples; i++) {
            const u = i / spineSamples;
            const telStart = smoothstep(0.0, 0.08, u);
            const telEnd = 1.0 - smoothstep(0.92, 1.0, u);
            const centroPinch = 1.0 - 0.72 * Math.exp(-Math.pow((u - uCentro) / 0.055, 2));
            const rCoil = (0.35 + 2.35 * telStart * telEnd) * centroPinch;

            const angle = cfg.phase + u * Math.PI * 2 * macroTurns;
            const p = spineFrames.points[i].clone()
                .addScaledVector(spineFrames.normals[i], Math.cos(angle) * rCoil)
                .addScaledVector(spineFrames.binormals[i], Math.sin(angle) * rCoil);
            coilPts.push(p);
        }

        const macroCoilCurve = new THREE.CatmullRomCurve3(coilPts);
        macroCoilCurve.arcLengthDivisions = 1800;

        // 巨觀染色分體超螺旋管（外殼 renderOrder = 3，內層先繪製以免霧邊遮擋）
        const macroMat = new THREE.MeshStandardMaterial({
            color: cfg.c === 0 ? 0xf26b8a : 0xe85d7e,
            roughness: 0.46,
            metalness: 0.08
        });
        applySpatialWindowShader(macroMat, {
            cacheKey: 'macro-tube-cut-v2',
            layerStrengthUniform: { value: 1.0 },
            innerCutStrengthUniform: sharedCutUniforms.uMacroCutStrength,
            innerR0: 7.2,
            innerR1: 9.4
        });

        const macroMesh = new THREE.Mesh(
            new THREE.TubeGeometry(macroCoilCurve, 920, tubeRadius, 10, false),
            macroMat
        );
        macroMesh.renderOrder = 3;
        scene.add(macroMesh);
        sceneRefs.macroTubularMeshes.push(macroMesh);

        // 染色分體半透明外鞘
        const envMat = new THREE.MeshStandardMaterial({
            color: 0xff9eb5,
            roughness: 0.45,
            metalness: 0.05,
            transparent: true,
            depthWrite: false
        });
        applySpatialWindowShader(envMat, {
            cacheKey: 'macro-env-cut-v2',
            baseOpacity: 0.15,
            layerStrengthUniform: { value: 1.0 },
            innerCutStrengthUniform: sharedCutUniforms.uMacroCutStrength,
            innerR0: 7.0,
            innerR1: 9.2
        });
        const envMesh = new THREE.Mesh(
            new THREE.TubeGeometry(spineCurve, 84, 3.25, 14, false),
            envMat
        );
        envMesh.renderOrder = 4;
        scene.add(envMesh);
        sceneRefs.macroEnvelopeMeshes.push(envMesh);

        // 沿著此染色分體建構 1,200 顆螺線管核小體
        const coilSamples = NUCS_PER_CHROMATID * 2;
        const coilFrames = computeParallelTransportFrames(macroCoilCurve, coilSamples);
        const nucleosomes = [];

        for (let k = 0; k < NUCS_PER_CHROMATID; k++) {
            const s = k / (NUCS_PER_CHROMATID - 1);
            const fIdx = Math.min(coilSamples, Math.round(s * coilSamples));
            const coilCenter = coilFrames.points[fIdx].clone();
            const T_coil = coilFrames.tangents[fIdx];
            const N_coil = coilFrames.normals[fIdx];
            const B_coil = coilFrames.binormals[fIdx];

            const theta = s * Math.PI * 2 * SOLENOID_TURNS;
            const R_k = new THREE.Vector3()
                .addScaledVector(N_coil, Math.cos(theta))
                .addScaledVector(B_coil, Math.sin(theta))
                .normalize();
            const A_k = T_coil.clone().addScaledVector(R_k, -T_coil.dot(R_k)).normalize();
            const S_k = new THREE.Vector3().crossVectors(A_k, R_k).normalize();
            const P_k = coilCenter.clone().addScaledVector(R_k, R_SOLENOID);

            nucleosomes.push({ c: cfg.c, k, u: s, uCentro, P_k, R_k, S_k, A_k, coilCenter });

            basisMat.makeBasis(R_k, S_k, A_k);
            posMat.makeTranslation(P_k.x, P_k.y, P_k.z);
            posMat.multiply(basisMat);
            histoneInstanced.setMatrixAt(instCursor++, posMat);
        }

        chromatids.push({
            c: cfg.c,
            label: cfg.label,
            uCentro,
            spineCurve,
            macroCoilCurve,
            nucleosomes
        });
    });

    histoneInstanced.instanceMatrix.needsUpdate = true;
    scene.add(histoneInstanced);
    sceneRefs.histoneInstancedMesh = histoneInstanced;

    // 中央著絲粒連接環
    const centroGeo = new THREE.TorusGeometry(1.75, 0.36, 14, 42);
    const centroMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0x78350f,
        emissiveIntensity: 0.42,
        roughness: 0.35,
        metalness: 0.25
    });
    applySpatialWindowShader(centroMat, {
        cacheKey: 'centro-cut-v2',
        layerStrengthUniform: { value: 1.0 },
        innerCutStrengthUniform: sharedCutUniforms.uMacroCutStrength,
        innerR0: 7.0,
        innerR1: 9.2
    });
    const centroMesh = new THREE.Mesh(centroGeo, centroMat);
    centroMesh.rotation.x = Math.PI / 2;
    centroMesh.renderOrder = 3;
    scene.add(centroMesh);
    sceneRefs.centromereCollarMesh = centroMesh;
}

// --- 計算核小體纏繞 DNA 座標與切向量 ---
function evalWrapPoint(nuc, phi) {
    const h = (phi / (2 * WRAP_HALF_ANGLE)) * WRAP_RISE;
    return nuc.P_k.clone()
        .addScaledVector(nuc.R_k, -R_WRAP * Math.cos(phi))
        .addScaledVector(nuc.S_k, R_WRAP * Math.sin(phi))
        .addScaledVector(nuc.A_k, h);
}

function evalWrapTangent(nuc, phi) {
    const hPrime = WRAP_RISE / (2 * WRAP_HALF_ANGLE);
    return new THREE.Vector3()
        .addScaledVector(nuc.R_k, R_WRAP * Math.sin(phi))
        .addScaledVector(nuc.S_k, R_WRAP * Math.cos(phi))
        .addScaledVector(nuc.A_k, hPrime)
        .normalize();
}

function buildNucleosomeDnaPoints(nucList, startIdx, endIdx, wrapSteps = 22, linkerSteps = 8) {
    const pts = [];
    for (let k = startIdx; k <= endIdx; k++) {
        const nuc = nucList[k];
        for (let j = 0; j <= wrapSteps; j++) {
            if (j === 0 && pts.length > 0) continue;
            const phi = lerp(-WRAP_HALF_ANGLE, WRAP_HALF_ANGLE, j / wrapSteps);
            pts.push(evalWrapPoint(nuc, phi));
        }

        if (k < endIdx) {
            const nextNuc = nucList[k + 1];
            const pExit = evalWrapPoint(nuc, WRAP_HALF_ANGLE);
            const tExit = evalWrapTangent(nuc, WRAP_HALF_ANGLE);
            const pEntry = evalWrapPoint(nextNuc, -WRAP_HALF_ANGLE);
            const tEntry = evalWrapTangent(nextNuc, -WRAP_HALF_ANGLE);

            const handle = pExit.distanceTo(pEntry) * 0.36;
            const c1 = pExit.clone().addScaledVector(tExit, handle);
            const c2 = pEntry.clone().addScaledVector(tEntry, -handle);
            const bezier = new THREE.CubicBezierCurve3(pExit, c1, c2, pEntry);

            for (let s = 1; s <= linkerSteps; s++) {
                pts.push(bezier.getPoint(s / linkerSteps));
            }
        }
    }
    return pts;
}

// --- 預建覆蓋全 2,400 顆核小體的平滑染色質 DNA 區塊 (16 區塊，確保任何相鄰線圈與雙染色分體都不缺 DNA) ---
function buildChromatinDnaChunks() {
    const chromatinMat = new THREE.MeshStandardMaterial({
        color: 0xfb7185,
        emissive: 0x3b0a1a,
        emissiveIntensity: 0.22,
        roughness: 0.38,
        metalness: 0.08
    });
    applySpatialWindowShader(chromatinMat, {
        cacheKey: 'chromatin-dna-chunk-v2',
        layerStrengthUniform: sharedCutUniforms.uChromatinStrength,
        innerCutStrengthUniform: sharedCutUniforms.uHelixCutStrength,
        innerR0: 1.95,
        innerR1: 2.75,
        outerCutEnabled: true,
        outerR0: 7.6,
        outerR1: 9.8
    });
    sceneRefs.chromatinDnaMat = chromatinMat;

    for (let c = 0; c < chromatids.length; c++) {
        const nucs = chromatids[c].nucleosomes;
        for (let start = 0; start < nucs.length - 1; start += CHROMATIN_CHUNK_SIZE) {
            const end = Math.min(nucs.length - 1, start + CHROMATIN_CHUNK_SIZE);
            const pts = buildNucleosomeDnaPoints(nucs, start, end, 22, 8);
            const geo = buildMultiRunTubeGeometry([pts], 0.052, 6);
            const mesh = new THREE.Mesh(geo, chromatinMat);
            mesh.renderOrder = 2;
            mesh.visible = false;
            scene.add(mesh);
            sceneRefs.chromatinDnaChunks.push({
                mesh,
                center: geo.boundingSphere.center.clone(),
                radius: geo.boundingSphere.radius
            });
        }
    }
}

// --- 3D 空間球體搜尋：找出位於雙股螺旋視窗半徑內的所有連續核小體片段（涵蓋跨線圈與雙染色分體） ---
function findContiguousRunsInSphere(centerVec, radius) {
    const rSq = radius * radius;
    const runs = [];
    for (let c = 0; c < chromatids.length; c++) {
        const nucs = chromatids[c].nucleosomes;
        let runStart = -1;
        let lastHit = -1;
        for (let k = 0; k < nucs.length; k++) {
            if (nucs[k].P_k.distanceToSquared(centerVec) <= rSq) {
                if (runStart === -1) {
                    runStart = k;
                } else if (k - lastHit > 3) {
                    runs.push({
                        c,
                        start: Math.max(0, runStart - 1),
                        end: Math.min(nucs.length - 1, lastHit + 1)
                    });
                    runStart = k;
                }
                lastHit = k;
            }
        }
        if (runStart !== -1) {
            runs.push({
                c,
                start: Math.max(0, runStart - 1),
                end: Math.min(nucs.length - 1, lastHit + 1)
            });
        }
    }
    return runs;
}

function resamplePolylineByArcLength(pts, stepDist) {
    const cumLen = new Float64Array(pts.length);
    for (let i = 1; i < pts.length; i++) {
        cumLen[i] = cumLen[i - 1] + pts[i].distanceTo(pts[i - 1]);
    }
    const totalLen = cumLen[pts.length - 1];
    if (totalLen < 1e-6) return { points: [], totalLen: 0 };

    const sampleCount = Math.max(4, Math.floor(totalLen / stepDist));
    const sampled = new Array(sampleCount + 1);
    let segIdx = 0;

    for (let s = 0; s <= sampleCount; s++) {
        const targetD = (s / sampleCount) * totalLen;
        while (segIdx < pts.length - 2 && cumLen[segIdx + 1] < targetD) {
            segIdx++;
        }
        const segLen = cumLen[segIdx + 1] - cumLen[segIdx];
        const alpha = segLen > 1e-9 ? (targetD - cumLen[segIdx]) / segLen : 0;
        sampled[s] = new THREE.Vector3().lerpVectors(pts[segIdx], pts[segIdx + 1], alpha);
    }

    return { points: sampled, totalLen };
}

function computePolylineFrames(pts) {
    const count = pts.length;
    const normals = new Array(count);
    const binormals = new Array(count);
    const prevT = new THREE.Vector3();
    const currT = new THREE.Vector3();
    const nVec = new THREE.Vector3();
    const rotAxis = new THREE.Vector3();
    const rotQuat = new THREE.Quaternion();
    const refX = new THREE.Vector3(1, 0, 0);
    const refY = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < count; i++) {
        if (i === 0) currT.subVectors(pts[1], pts[0]);
        else if (i === count - 1) currT.subVectors(pts[count - 1], pts[count - 2]);
        else currT.subVectors(pts[i + 1], pts[i - 1]);

        if (currT.lengthSq() < 1e-12) currT.copy(i > 0 ? prevT : refY);
        else currT.normalize();

        if (i === 0) {
            const refAxis = Math.abs(currT.x) < 0.85 ? refX : refY;
            nVec.crossVectors(currT, refAxis).normalize();
        } else {
            rotAxis.crossVectors(prevT, currT);
            const sinTheta = rotAxis.length();
            if (sinTheta > 1e-6) {
                rotAxis.divideScalar(sinTheta);
                const theta = Math.acos(clamp(prevT.dot(currT), -1, 1));
                rotQuat.setFromAxisAngle(rotAxis, theta);
                nVec.applyQuaternion(rotQuat);
            }
            nVec.addScaledVector(currT, -nVec.dot(currT)).normalize();
        }
        normals[i] = nVec.clone();
        binormals[i] = new THREE.Vector3().crossVectors(currT, nVec).normalize();
        prevT.copy(currT);
    }
    return { normals, binormals };
}

// --- 建立複用的 3D DNA 雙股螺旋網格 ---
function buildDynamicHelixMeshes() {
    const helixGroup = new THREE.Group();

    const makeStrandMat = (colorHex, emissiveHex, key) => {
        const mat = new THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: emissiveHex,
            emissiveIntensity: 0.25,
            roughness: 0.35,
            metalness: 0.12
        });
        applySpatialWindowShader(mat, {
            cacheKey: key,
            layerStrengthUniform: sharedCutUniforms.uHelixStrength,
            outerCutEnabled: true,
            outerR0: 2.00,
            outerR1: 2.85
        });
        return mat;
    };

    const s1 = new THREE.Mesh(
        new THREE.BufferGeometry(),
        makeStrandMat(0xff5c77, 0x3f0a17, 'helix-strand1-v2')
    );
    const s2 = new THREE.Mesh(
        new THREE.BufferGeometry(),
        makeStrandMat(0x38bdf8, 0x082f49, 'helix-strand2-v2')
    );
    s1.frustumCulled = false;
    s2.frustumCulled = false;
    s1.renderOrder = 1;
    s2.renderOrder = 1;
    helixGroup.add(s1, s2);
    sceneRefs.dnaStrandMesh1 = s1;
    sceneRefs.dnaStrandMesh2 = s2;

    const baseColors = [0x22c55e, 0xf59e0b, 0x06b6d4, 0xa855f7];
    const baseGeo = new THREE.CylinderGeometry(0.0082, 0.0082, 1.0, 6);
    baseColors.forEach((hex, idx) => {
        const mat = new THREE.MeshStandardMaterial({
            color: hex,
            emissive: hex,
            emissiveIntensity: 0.16,
            roughness: 0.4,
            metalness: 0.1
        });
        applySpatialWindowShader(mat, {
            cacheKey: `helix-base-${idx}-v2`,
            layerStrengthUniform: sharedCutUniforms.uHelixStrength,
            outerCutEnabled: true,
            outerR0: 2.00,
            outerR1: 2.85,
            isInstanced: true
        });
        const inst = new THREE.InstancedMesh(baseGeo, mat, MAX_BASE_INSTANCES);
        inst.count = 0;
        inst.frustumCulled = false;
        inst.renderOrder = 1;
        helixGroup.add(inst);
        sceneRefs.dnaBaseMeshes.push(inst);
    });

    scene.add(helixGroup);
    sceneRefs.dnaHelixGroup = helixGroup;
}

function updateDoubleHelixPatch(focusCenter) {
    if (hasBuiltHelix && focusCenter.distanceToSquared(builtHelixCenter) <= 0.2025) return; // 0.45^2
    hasBuiltHelix = true;
    builtHelixCenter.copy(focusCenter);

    // 搜尋 3.45 單位球體內所有相鄰線圈與雙染色分體區段，涵蓋 2.85 雙股螺旋視窗 + 0.45 緩衝
    const runs = findContiguousRunsInSphere(focusCenter, 3.45);
    if (runs.length === 0) {
        runs.push({
            c: activeC,
            start: Math.max(0, activeK - 4),
            end: Math.min(NUCS_PER_CHROMATID - 1, activeK + 4)
        });
    }

    const pitch = 0.18;
    const sampleStep = pitch / 11; // 每圈 11 個骨架取樣點 (~32.7°/步)
    const rHelix = 0.052;
    const grooveOffset = 2.42;

    const strand1Runs = [];
    const strand2Runs = [];
    activeHelixSamplePoints = [];

    const baseCounts = [0, 0, 0, 0];
    const upAxis = new THREE.Vector3(0, 1, 0);
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const m = new THREE.Matrix4();
    const posTmp = new THREE.Vector3();
    const scaleTmp = new THREE.Vector3();
    const rPickSq = 2.95 * 2.95;

    for (let r = 0; r < runs.length; r++) {
        const run = runs[r];
        const rawPts = buildNucleosomeDnaPoints(chromatids[run.c].nucleosomes, run.start, run.end, 26, 10);
        const { points: pts, totalLen } = resamplePolylineByArcLength(rawPts, sampleStep);
        if (pts.length < 4) continue;

        const { normals, binormals } = computePolylineFrames(pts);
        const totalTurns = totalLen / pitch;
        const s1Pts = new Array(pts.length);
        const s2Pts = new Array(pts.length);

        for (let i = 0; i < pts.length; i++) {
            const u = i / (pts.length - 1);
            const angle = u * Math.PI * 2 * totalTurns;
            const p = pts[i];
            const n = normals[i];
            const b = binormals[i];

            s1Pts[i] = new THREE.Vector3(
                p.x + (Math.cos(angle) * n.x + Math.sin(angle) * b.x) * rHelix,
                p.y + (Math.cos(angle) * n.y + Math.sin(angle) * b.y) * rHelix,
                p.z + (Math.cos(angle) * n.z + Math.sin(angle) * b.z) * rHelix
            );
            const a2 = angle + grooveOffset;
            s2Pts[i] = new THREE.Vector3(
                p.x + (Math.cos(a2) * n.x + Math.sin(a2) * b.x) * rHelix,
                p.y + (Math.cos(a2) * n.y + Math.sin(a2) * b.y) * rHelix,
                p.z + (Math.cos(a2) * n.z + Math.sin(a2) * b.z) * rHelix
            );

            if (i % 4 === 0 && p.distanceToSquared(focusCenter) <= rPickSq) {
                activeHelixSamplePoints.push(p);
            }
        }

        strand1Runs.push(s1Pts);
        strand2Runs.push(s2Pts);

        // 依實際距離 focusCenter 由近到遠或逐一放置鹼基對（過濾掉距離超過 2.95 單位的遠端點以免浪費實例上限）
        const totalBasePairs = Math.floor(totalTurns * 10);
        const seqSeedOffset = run.c * 10000 + run.start * 113;

        for (let bp = 0; bp < totalBasePairs; bp++) {
            const u = (bp + 0.5) / totalBasePairs;
            const idx = Math.min(pts.length - 1, Math.round(u * (pts.length - 1)));
            const center = pts[idx];
            if (center.distanceToSquared(focusCenter) > rPickSq) continue;

            const angle = u * Math.PI * 2 * totalTurns;
            const a2 = angle + grooveOffset;
            const n = normals[idx];
            const b = binormals[idx];

            p1.copy(center)
                .addScaledVector(n, Math.cos(angle) * rHelix)
                .addScaledVector(b, Math.sin(angle) * rHelix);
            p2.copy(center)
                .addScaledVector(n, Math.cos(a2) * rHelix)
                .addScaledVector(b, Math.sin(a2) * rHelix);

            dir.subVectors(p2, p1);
            const fullLen = dir.length();
            if (fullLen < 1e-5) continue;
            dir.divideScalar(fullLen);
            quat.setFromUnitVectors(upAxis, dir);

            const seqIdx = bp + seqSeedOffset;
            const code = (seqIdx * 7 + Math.floor(seqIdx / 3) * 5) % 4;
            const leftType = code;
            const rightType = code < 2 ? 1 - code : 5 - code;
            const halfLen = fullLen * 0.45;
            scaleTmp.set(1, halfLen, 1);

            if (baseCounts[leftType] < MAX_BASE_INSTANCES) {
                posTmp.copy(p1).addScaledVector(dir, fullLen * 0.24);
                m.compose(posTmp, quat, scaleTmp);
                sceneRefs.dnaBaseMeshes[leftType].setMatrixAt(baseCounts[leftType]++, m);
            }
            if (baseCounts[rightType] < MAX_BASE_INSTANCES) {
                posTmp.copy(p2).addScaledVector(dir, -fullLen * 0.24);
                m.compose(posTmp, quat, scaleTmp);
                sceneRefs.dnaBaseMeshes[rightType].setMatrixAt(baseCounts[rightType]++, m);
            }
        }
    }

    const newGeo1 = buildMultiRunTubeGeometry(strand1Runs, 0.0135, 5);
    const newGeo2 = buildMultiRunTubeGeometry(strand2Runs, 0.0135, 5);
    const oldGeo1 = sceneRefs.dnaStrandMesh1.geometry;
    const oldGeo2 = sceneRefs.dnaStrandMesh2.geometry;
    sceneRefs.dnaStrandMesh1.geometry = newGeo1;
    sceneRefs.dnaStrandMesh2.geometry = newGeo2;
    if (oldGeo1) oldGeo1.dispose();
    if (oldGeo2) oldGeo2.dispose();

    sceneRefs.dnaBaseMeshes.forEach((inst, typeIdx) => {
        inst.count = baseCounts[typeIdx];
        inst.instanceMatrix.needsUpdate = true;
    });
}

// --- 游標懸停 3D 探測光環 ---
function buildHoverProbe() {
    const ringGeo = new THREE.TorusGeometry(1.0, 0.065, 10, 36);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.visible = false;
    ring.renderOrder = 5;
    scene.add(ring);
    sceneRefs.hoverProbeRing = ring;

    const coreGeo = new THREE.SphereGeometry(0.85, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.14,
        depthWrite: false
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.visible = false;
    core.renderOrder = 5;
    scene.add(core);
    sceneRefs.hoverProbeCore = core;
}

function buildAmbientParticles() {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const u = ((i * 73 + 19) % 1000) / 1000;
        const v = ((i * 197 + 41) % 1000) / 1000;
        const w = ((i * 313 + 7) % 1000) / 1000;
        const theta = u * Math.PI * 2;
        const phi = Math.acos(2 * v - 1);
        const radius = 12 + w * 78;

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.cos(phi);
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: 0.22,
        transparent: true,
        opacity: 0.35,
        depthWrite: false
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    sceneRefs.ambientParticles = pts;
}

// --- 預設與任意區位切換 ---
function pickFrontFacingDefaultNucleosome(c, approxK) {
    const nucs = chromatids[c].nucleosomes;
    let bestK = approxK;
    let bestScore = -Infinity;
    for (let k = Math.max(0, approxK - 6); k <= Math.min(nucs.length - 1, approxK + 6); k++) {
        const score = nucs[k].R_k.z + 0.2 * nucs[k].R_k.y;
        if (score > bestScore) {
            bestScore = score;
            bestK = k;
        }
    }
    return bestK;
}

function setActiveLocus(c, k, optionalDnaPoint = null, snapImmediate = false) {
    activeC = c;
    activeK = clamp(k, 0, NUCS_PER_CHROMATID - 1);

    const nuc = chromatids[activeC].nucleosomes[activeK];
    sceneRefs.anchors.targetP1.copy(nuc.coilCenter);
    sceneRefs.anchors.targetP2.copy(nuc.P_k);
    if (optionalDnaPoint) {
        sceneRefs.anchors.targetP3.copy(optionalDnaPoint);
    } else {
        sceneRefs.anchors.targetP3.copy(evalWrapPoint(nuc, Math.PI));
    }

    if (snapImmediate) {
        sceneRefs.anchors.smoothedP1.copy(sceneRefs.anchors.targetP1);
        sceneRefs.anchors.smoothedP2.copy(sceneRefs.anchors.targetP2);
        sceneRefs.anchors.smoothedP3.copy(sceneRefs.anchors.targetP3);
    }

    updateRegionLabel(activeC, activeK);
}

function findNearestNucleosomeToWorldPoint(worldPt) {
    let bestC = activeC;
    let bestK = activeK;
    let bestDistSq = Infinity;

    for (let c = 0; c < chromatids.length; c++) {
        const nucs = chromatids[c].nucleosomes;
        for (let k = 0; k < nucs.length; k++) {
            const dSq = nucs[k].P_k.distanceToSquared(worldPt);
            if (dSq < bestDistSq) {
                bestDistSq = dSq;
                bestC = c;
                bestK = k;
            }
        }
    }
    return { c: bestC, k: bestK, dist: Math.sqrt(bestDistSq) };
}

// --- 分層射線拾取 ---
const _raycaster = new THREE.Raycaster();
const _ndcVec = new THREE.Vector2();
const _toPt = new THREE.Vector3();

function pickStructureAtNdc(ndcX, ndcY) {
    _ndcVec.set(ndcX, ndcY);
    _raycaster.setFromCamera(_ndcVec, camera);
    const origin = _raycaster.ray.origin;
    const dir = _raycaster.ray.direction;

    const maxAngle = lerp(0.055, 0.16, currentZoom);
    const restrictToWindow = currentZoom > 0.50;
    const focusCenter = sharedCutUniforms.uFocusCenter.value;
    let bestHit = null;
    let bestScore = Infinity;

    for (let c = 0; c < chromatids.length; c++) {
        const nucs = chromatids[c].nucleosomes;
        for (let k = 0; k < nucs.length; k++) {
            const pt = nucs[k].P_k;
            if (restrictToWindow && pt.distanceToSquared(focusCenter) > 96.04) continue; // 9.8^2

            _toPt.subVectors(pt, origin);
            const proj = _toPt.dot(dir);
            if (proj <= 0.04) continue;

            const perpSq = Math.max(0, _toPt.lengthSq() - proj * proj);
            const perp = Math.sqrt(perpSq);
            const angularDist = perp / proj;

            if (angularDist < maxAngle || (currentZoom < 0.25 && perp < 1.35)) {
                const score = angularDist + proj * 0.0008;
                if (score < bestScore) {
                    bestScore = score;
                    bestHit = { c, k, point: pt, dnaPoint: null, proj };
                }
            }
        }
    }

    if (currentZoom > 0.45 && activeHelixSamplePoints.length > 0) {
        let bestDnaPt = null;
        let bestDnaScore = Infinity;
        for (let i = 0; i < activeHelixSamplePoints.length; i++) {
            const pt = activeHelixSamplePoints[i];
            _toPt.subVectors(pt, origin);
            const proj = _toPt.dot(dir);
            if (proj <= 0.04) continue;
            const perp = Math.sqrt(Math.max(0, _toPt.lengthSq() - proj * proj));
            const ang = perp / proj;
            if (ang < 0.075) {
                const score = ang + proj * 0.002;
                if (score < bestDnaScore) {
                    bestDnaScore = score;
                    bestDnaPt = pt;
                }
            }
        }
        if (bestDnaPt) {
            const nearest = findNearestNucleosomeToWorldPoint(bestDnaPt);
            return {
                c: nearest.c,
                k: nearest.k,
                point: bestDnaPt,
                dnaPoint: bestDnaPt
            };
        }
    }

    return bestHit;
}

// --- 連續縮放映射 ---
function getDistanceForZoom(z) {
    return D_MAX * Math.pow(D_MIN / D_MAX, clamp(z, 0, 1));
}

function getFocusPointForZoom(z, outVec) {
    const { p0, smoothedP1, smoothedP2, smoothedP3 } = sceneRefs.anchors;
    const t1 = smoothstep(0.03, 0.28, z);
    const t2 = smoothstep(0.28, 0.60, z);
    const t3 = smoothstep(0.60, 0.88, z);

    outVec.copy(p0)
        .lerp(smoothedP1, t1)
        .lerp(smoothedP2, t2)
        .lerp(smoothedP3, t3);
    return outVec;
}

// --- 更新 GPU 球形視窗 uniforms、區塊剔除與材質狀態 ---
function updateVisualsForZoom(z, focusCenter) {
    const macroCut = smoothstep(0.11, 0.30, z);
    const chromStrength = smoothstep(0.09, 0.26, z);
    const helixCut = smoothstep(0.45, 0.65, z);
    const helixStrength = smoothstep(0.43, 0.63, z);

    sharedCutUniforms.uMacroCutStrength.value = macroCut;
    sharedCutUniforms.uChromatinStrength.value = chromStrength;
    sharedCutUniforms.uHelixCutStrength.value = helixCut;
    sharedCutUniforms.uHelixStrength.value = helixStrength;

    const macroNeedTrans = macroCut > 0.004;
    sceneRefs.macroTubularMeshes.forEach(m => updateMaterialTransparency(m.material, macroNeedTrans, true));
    updateMaterialTransparency(sceneRefs.centromereCollarMesh.material, macroNeedTrans, true);

    const envVisible = z < 0.35;
    sceneRefs.macroEnvelopeMeshes.forEach(m => { m.visible = envVisible; });

    const showChromatin = chromStrength > 0.004;
    sceneRefs.histoneInstancedMesh.visible = showChromatin;
    updateMaterialTransparency(sceneRefs.histoneInstancedMesh.material, chromStrength < 0.995, true);

    const showChromatinDna = showChromatin && helixCut < 0.998;
    updateMaterialTransparency(
        sceneRefs.chromatinDnaMat,
        chromStrength < 0.995 || helixCut > 0.004,
        true
    );
    for (let i = 0; i < sceneRefs.chromatinDnaChunks.length; i++) {
        const ch = sceneRefs.chromatinDnaChunks[i];
        if (!showChromatinDna) {
            ch.mesh.visible = false;
        } else {
            const maxR = ch.radius + 10.2;
            ch.mesh.visible = ch.center.distanceToSquared(focusCenter) <= maxR * maxR;
        }
    }

    const showHelix = helixStrength > 0.004;
    sceneRefs.dnaHelixGroup.visible = showHelix;
    if (showHelix) {
        const helixTrans = helixStrength < 0.995;
        updateMaterialTransparency(sceneRefs.dnaStrandMesh1.material, helixTrans, true);
        updateMaterialTransparency(sceneRefs.dnaStrandMesh2.material, helixTrans, true);
        sceneRefs.dnaBaseMeshes.forEach(inst => updateMaterialTransparency(inst.material, helixTrans, true));
    }

    if (z > 0.36) {
        updateDoubleHelixPatch(focusCenter);
    }
}

// --- 生物尺度資訊與區位名稱同步 ---
const STAGE_DATA = {
    chromosome: {
        badge: '層級 1 / 4',
        title: '中期染色體 (Metaphase Chromosome)',
        desc: '將游標指向染色體上的任意位置（短臂、長臂、端粒或著絲粒）並滾動滑鼠滾輪或雙擊，即可從該處連續放大穿入內部的染色質纖維、核小體與 DNA 雙股螺旋。',
        legends: [
            { color: '#f26b8a', label: '姊妹染色分體超螺旋' },
            { color: '#fbbf24', label: '中央著絲粒 (Centromere)' },
            { color: '#7dd3fc', label: '游標指向放大位置' }
        ]
    },
    chromatin: {
        badge: '層級 2 / 4',
        title: '30 nm 染色質纖維 (Chromatin Fiber)',
        desc: '目前所在位置的高密度核小體螺線管結構。可繼續放大穿入單顆核小體，或按住滑鼠右鍵平移掃描鄰近染色體線圈。',
        legends: [
            { color: '#fb7185', label: '盤繞的 DNA 鏈' },
            { color: '#34d399', label: '組蛋白核心陣列' },
            { color: '#f26b8a', label: '周圍染色體超螺旋脈絡' }
        ]
    },
    nucleosome: {
        badge: '層級 3 / 4',
        title: '核小體與連接 DNA (Nucleosome)',
        desc: '染色質的基本重複單位：DNA 雙股螺旋沿著 8 個組蛋白亞基組成的圓盤核心纏繞約 1.65 圈，再經連接 DNA 接往下一顆核小體。',
        legends: [
            { color: '#34d399', label: '組蛋白八聚體 (H2A/B/H3/H4)' },
            { color: '#ff5c77', label: 'DNA 雙股螺旋鏈' },
            { color: '#38bdf8', label: '互補骨架鏈' }
        ]
    },
    dna: {
        badge: '層級 4 / 4',
        title: 'DNA 雙股螺旋 (DNA Double Helix)',
        desc: '遺傳物質的分子結構：兩條反向平行的去氧核糖-磷酸骨架形成大溝與小溝，內部透過氫鍵進行專一性鹼基配對 (A=T, C≡G)。',
        legends: [
            { color: '#ff5c77', label: "5'→3' 磷酸骨架" },
            { color: '#38bdf8', label: "3'→5' 磷酸骨架" },
            { color: '#22c55e', label: 'A 腺嘌呤' },
            { color: '#f59e0b', label: 'T 胸腺嘧啶' },
            { color: '#06b6d4', label: 'C 胞嘧啶' },
            { color: '#a855f7', label: 'G 鳥糞嘌呤' }
        ]
    }
};

function describeAnatomicalRegion(c, k) {
    const chrom = chromatids[c];
    const nuc = chrom.nucleosomes[k];
    const u = nuc.u;
    const uC = chrom.uCentro;

    let armRegion = '';
    if (u < 0.08 || u > 0.92) {
        armRegion = '端粒區 (Telomere)';
    } else if (Math.abs(u - uC) < 0.075) {
        armRegion = '中央著絲粒 (Centromere)';
    } else if (u < uC) {
        armRegion = '長臂 (q 臂)';
    } else {
        armRegion = '短臂 (p 臂)';
    }
    return `目標區位：${chrom.label} · ${armRegion}（核小體 #${k + 1}）`;
}

function updateRegionLabel(c, k) {
    const text = describeAnatomicalRegion(c, k);
    if (text !== lastRegionText) {
        lastRegionText = text;
        regionReadout.textContent = text;
    }
}

function getStageKeyForZoom(z) {
    if (z < 0.24) return 'chromosome';
    if (z < 0.50) return 'chromatin';
    if (z < 0.78) return 'nucleosome';
    return 'dna';
}

function formatScaleNanometers(z) {
    const nm = 1400 * Math.pow(2.0 / 1400, clamp(z, 0, 1));
    if (nm >= 100) return `~${Math.round(nm).toLocaleString('en-US')} nm`;
    if (nm >= 10) return `~${nm.toFixed(0)} nm`;
    return `~${nm.toFixed(1)} nm`;
}

function updateStageUI(z, force = false) {
    scaleReadout.textContent = formatScaleNanometers(z);

    if (document.activeElement !== zoomSlider) {
        zoomSlider.value = Math.round(z * 1000);
    }

    const stageKey = getStageKeyForZoom(z);
    if (stageKey === lastUiStage && !force) return;
    lastUiStage = stageKey;

    const info = STAGE_DATA[stageKey];
    stageBadge.textContent = info.badge;
    stageTitle.textContent = info.title;
    stageDesc.textContent = info.desc;

    legendList.innerHTML = info.legends.map(item => (
        `<span class="legend-item">` +
        `<span class="legend-swatch" style="background:${item.color};color:${item.color}"></span>` +
        `${item.label}</span>`
    )).join('');

    stagePills.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.stage === stageKey);
    });
}

// --- 互動事件處理 ---
function getNdcFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    return {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1
    };
}

const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();
const _panWorldTarget = new THREE.Vector3();

function bindEvents() {
    window.addEventListener('resize', onWindowResize, false);
    const dom = renderer.domElement;

    dom.addEventListener('contextmenu', e => e.preventDefault());

    dom.addEventListener('pointerdown', e => {
        pointerDownPos = { x: e.clientX, y: e.clientY };
        prevPointerPos = { x: e.clientX, y: e.clientY };
        if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
            pointerMode = 'pan';
            controls.enabled = false;
        } else {
            pointerMode = 'orbit';
        }
    });

    dom.addEventListener('pointermove', e => {
        if (pointerMode === 'pan') {
            const dx = e.clientX - prevPointerPos.x;
            const dy = e.clientY - prevPointerPos.y;
            prevPointerPos = { x: e.clientX, y: e.clientY };

            const dist = getDistanceForZoom(currentZoom);
            const panScale = dist * 0.0022;
            _camRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
            _camUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

            getFocusPointForZoom(currentZoom, _panWorldTarget);
            _panWorldTarget
                .addScaledVector(_camRight, -dx * panScale)
                .addScaledVector(_camUp, dy * panScale);

            const nearest = findNearestNucleosomeToWorldPoint(_panWorldTarget);
            if (nearest.dist < 9.0) {
                setActiveLocus(nearest.c, nearest.k, null, false);
            }
            return;
        }

        if (pointerMode !== 'none') return;

        const ndc = getNdcFromEvent(e);
        const hit = pickStructureAtNdc(ndc.x, ndc.y);
        if (hit && currentZoom < 0.85) {
            sceneRefs.anchors.hoverPos.copy(hit.point);
            sceneRefs.anchors.hoverVisible = true;
            dom.style.cursor = 'pointer';
        } else {
            sceneRefs.anchors.hoverVisible = false;
            dom.style.cursor = hit ? 'pointer' : 'grab';
        }
    });

    window.addEventListener('pointerup', e => {
        if (pointerMode === 'pan') {
            controls.enabled = true;
        } else if (pointerMode === 'orbit') {
            const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
            if (moved < 5 && e.target === dom) {
                const ndc = getNdcFromEvent(e);
                const hit = pickStructureAtNdc(ndc.x, ndc.y);
                if (hit) {
                    setActiveLocus(hit.c, hit.k, hit.dnaPoint, false);
                }
            }
        }
        pointerMode = 'none';
    });

    dom.addEventListener('pointerleave', () => {
        sceneRefs.anchors.hoverVisible = false;
    });

    dom.addEventListener('dblclick', e => {
        const ndc = getNdcFromEvent(e);
        const hit = pickStructureAtNdc(ndc.x, ndc.y);
        if (hit) {
            setActiveLocus(hit.c, hit.k, hit.dnaPoint, false);
        }
        targetZoom = clamp(targetZoom + 0.32, 0, 1);
    });

    dom.addEventListener('wheel', e => {
        e.preventDefault();
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 28;
        else if (e.deltaMode === 2) delta *= 240;

        const step = clamp(-delta * 0.00048, -0.065, 0.065);
        if (step > 0) {
            const ndc = getNdcFromEvent(e);
            const hit = pickStructureAtNdc(ndc.x, ndc.y);
            if (hit) {
                setActiveLocus(hit.c, hit.k, hit.dnaPoint, false);
            }
        }
        targetZoom = clamp(targetZoom + step, 0, 1);
    }, { passive: false });

    const getTouchDist = touches => Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
    );

    dom.addEventListener('touchstart', e => {
        if (e.touches.length === 2) {
            controls.enabled = false;
            activePinchDist = getTouchDist(e.touches);
            const midX = (e.touches[0].clientX + e.touches[1].clientX) * 0.5;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) * 0.5;
            const rect = dom.getBoundingClientRect();
            const hit = pickStructureAtNdc(
                ((midX - rect.left) / rect.width) * 2 - 1,
                -((midY - rect.top) / rect.height) * 2 + 1
            );
            if (hit) {
                setActiveLocus(hit.c, hit.k, hit.dnaPoint, false);
            }
        }
    }, { passive: true });

    dom.addEventListener('touchmove', e => {
        if (e.touches.length === 2 && activePinchDist) {
            e.preventDefault();
            const newDist = getTouchDist(e.touches);
            if (newDist > 1 && activePinchDist > 1) {
                const zoomDelta = Math.log(newDist / activePinchDist) * 0.30;
                targetZoom = clamp(targetZoom + zoomDelta, 0, 1);
            }
            activePinchDist = newDist;
        }
    }, { passive: false });

    dom.addEventListener('touchend', e => {
        if (e.touches.length < 2) {
            activePinchDist = null;
            controls.enabled = true;
        }
    });

    zoomSlider.addEventListener('input', e => {
        targetZoom = clamp(Number(e.target.value) / 1000, 0, 1);
    });

    stagePills.forEach(btn => {
        btn.addEventListener('click', () => {
            targetZoom = clamp(parseFloat(btn.dataset.zoom), 0, 1);
        });
    });

    document.getElementById('zoom-in-btn').addEventListener('click', () => {
        targetZoom = clamp(targetZoom + 0.10, 0, 1);
    });

    document.getElementById('zoom-out-btn').addEventListener('click', () => {
        targetZoom = clamp(targetZoom - 0.10, 0, 1);
    });

    document.getElementById('reset-view-btn').addEventListener('click', () => {
        targetZoom = 0.0;
        setActiveLocus(defaultC, defaultK, null, false);
        const dist = getDistanceForZoom(currentZoom);
        const focus = getFocusPointForZoom(currentZoom, new THREE.Vector3());
        controls.target.copy(focus);
        camera.position.copy(focus).add(new THREE.Vector3(0, 0, dist));
        controls.update();
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- 主動畫迴圈 ---
const _viewDir = new THREE.Vector3();
const _nextTarget = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    const elapsedSeconds = now * 0.001;

    const zoomAlpha = 1 - Math.exp(-8.5 * dt);
    currentZoom += (targetZoom - currentZoom) * zoomAlpha;
    if (Math.abs(targetZoom - currentZoom) < 1e-5) currentZoom = targetZoom;

    const anchorAlpha = 1 - Math.exp(-9.5 * dt);
    sceneRefs.anchors.smoothedP1.lerp(sceneRefs.anchors.targetP1, anchorAlpha);
    sceneRefs.anchors.smoothedP2.lerp(sceneRefs.anchors.targetP2, anchorAlpha);
    sceneRefs.anchors.smoothedP3.lerp(sceneRefs.anchors.targetP3, anchorAlpha);

    _viewDir.copy(camera.position).sub(controls.target);
    if (_viewDir.lengthSq() < 1e-8) _viewDir.set(0, 0, 1);
    else _viewDir.normalize();

    getFocusPointForZoom(currentZoom, _nextTarget);
    const nextDist = getDistanceForZoom(currentZoom);

    controls.target.copy(_nextTarget);
    camera.position.copy(_nextTarget).addScaledVector(_viewDir, nextDist);

    sharedCutUniforms.uFocusCenter.value.copy(_nextTarget);

    const nextNear = Math.max(0.003, nextDist * 0.015);
    const nextFar = Math.max(260, nextDist * 80);
    if (Math.abs(camera.near - nextNear) / camera.near > 0.05 || Math.abs(camera.far - nextFar) / camera.far > 0.05) {
        camera.near = nextNear;
        camera.far = nextFar;
        camera.updateProjectionMatrix();
    }

    controls.update();

    if (sceneRefs.anchors.hoverVisible && currentZoom < 0.85) {
        const probeScale = lerp(1.35, 0.28, smoothstep(0.0, 0.72, currentZoom)) * (1.0 + 0.07 * Math.sin(elapsedSeconds * 4.0));
        sceneRefs.hoverProbeRing.visible = true;
        sceneRefs.hoverProbeCore.visible = true;
        sceneRefs.hoverProbeRing.position.copy(sceneRefs.anchors.hoverPos);
        sceneRefs.hoverProbeCore.position.copy(sceneRefs.anchors.hoverPos);
        sceneRefs.hoverProbeRing.quaternion.copy(camera.quaternion);
        sceneRefs.hoverProbeRing.scale.setScalar(probeScale);
        sceneRefs.hoverProbeCore.scale.setScalar(probeScale);
        const fade = 1.0 - smoothstep(0.65, 0.85, currentZoom);
        sceneRefs.hoverProbeRing.material.opacity = 0.82 * fade;
        sceneRefs.hoverProbeCore.material.opacity = 0.14 * fade;
    } else {
        sceneRefs.hoverProbeRing.visible = false;
        sceneRefs.hoverProbeCore.visible = false;
    }

    updateVisualsForZoom(currentZoom, _nextTarget);
    updateStageUI(currentZoom, false);

    if (sceneRefs.ambientParticles && pointerMode === 'none') {
        sceneRefs.ambientParticles.rotation.y += dt * 0.010;
    }

    renderer.render(scene, camera);
}

// --- 啟動 ---
init();
