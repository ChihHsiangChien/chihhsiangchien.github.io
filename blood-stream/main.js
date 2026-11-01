window.onload = function () {
    // Scene setup
    let renderer, scene, camera;
    let world;
    let particles = [];
    let particleCount = 200;
    const particleRadius = 0.52;
    const tubeRadius = 4;

    const compressionFactor = 0.35; // 壓縮時管徑收縮幅度更明顯
    const compressionSpeed = 0.08;  // 平滑自然的收縮/舒張動畫速度
    const tubeLength = 170;         // 延長血管總長 (-85 到 +85)，大幅擴展動脈脈搏波傳播距離
    const halfTubeLength = tubeLength / 2;
    const compressionLength = 30;   // 中央心室壓縮區長度 (-15 到 +15)
    const halfCompressionLength = compressionLength / 2;
    const centralSectionZ = 0;

    // 心房囊袋（靜脈竇 Sinus Venosus / Atrium）參數：位於後瓣膜 (+16) 上游入口處 (z = +16.5 ~ +44.5)
    const atriumLength = 28;
    const halfAtriumLength = atriumLength / 2;
    const atriumCenterZ = 30.5;
    const atriumZMin = atriumCenterZ - halfAtriumLength; // +16.5
    const atriumZMax = atriumCenterZ + halfAtriumLength; // +44.5
    const atriumMaxBulgeFactor = 0.92; // 囊袋最大膨大倍率（半徑可達原本的 ~1.92 倍）

    // 物理剛體與視覺網格
    let frontValveBodies = [], backValveBodies = [];
    let frontValveMeshes = [], backValveMeshes = [];

    // 狀態: 'normal'（平時）、'compress'（壓縮收縮）、'expand'（擴張舒張）
    let vesselState = 'normal';
    let currentCompression = 0; // -1 (完全擴張) ~ 0 (平時) ~ +1 (完全壓縮)
    let phaseTimer = 0;         // 紀錄當前收縮/舒張階段經過的時間 (秒)

    let frontValveEnabled = false;
    let backValveEnabled = false;
    let regurgitationEnabled = false; // 模擬瓣膜關閉不全 / 逆流 (Valvular Regurgitation)
    let atriumEnabled = false;
    let atriumCurrentBulge = 0; // 0 (未膨大普通血管) ~ 1+ (心房囊袋充盈膨大)

    // 連續壓縮（規律自動搏動）狀態
    let autoCompressEnabled = false;
    let autoCompressTimer = 0;
    const autoCycleHalfPeriod = 0.85; // 每 0.85 秒切換一次收縮/舒張（約每分鐘 35~40 次完整搏動，便於觀察）

    // 不規律收縮（心律不整原型）狀態
    let irregularCompressEnabled = false;
    let irregularTimer = 0;
    let irregularNextInterval = 0.3;
    let irregularStrength = 0.5;   // 當前不規律搏動的有效收縮/舒張強度 (0.2 ~ 1.0)
    let irregularModeType = 'premature'; // 'premature' (早搏) | 'fibrillation' (微弱亂顫) | 'pause' (節律停頓) | 'compensatory' (補償收縮)
    let tremorTime = 0;

    // 動脈彈性脈搏波（Arterial Pulse Waves）參數與狀態：長度 69 單位長
    const arteryLength = halfTubeLength - (halfCompressionLength + 1); // 85 - 16 = 69
    const arteryCenterZ = -(halfCompressionLength + 1 + arteryLength / 2); // -50.5
    let arterialPulseWaves = [];
    let pulseSpawnedThisPhase = false; // 每搏收縮期精準激發單次脈搏波的時相旗標

    // Visual meshes
    let fullTubeMesh;
    let compressionZoneMesh;
    let atriumZoneMesh;
    let arteryZoneMesh;
    let sharedParticleGeometry = null;
    let sharedParticleMaterial = null;

    // UI elements
    const toggleCompressBtn = document.getElementById('toggle-compress');
    const autoCompressBtn = document.getElementById('auto-compress');
    const irregularCompressBtn = document.getElementById('irregular-compress');
    const toggleRegurgitationBtn = document.getElementById('toggle-regurgitation');
    const toggleAtriumBtn = document.getElementById('toggle-atrium');
    const toggleBackValveBtn = document.getElementById('toggle-back-valve');
    const toggleFrontValveBtn = document.getElementById('toggle-front-valve');
    const toggleLabelsBtn = document.getElementById('toggle-labels');
    const resetViewBtn = document.getElementById('reset-view');
    const atriumStatus = document.getElementById('atrium-status');
    const arterialPulseStatus = document.getElementById('arterial-pulse-status');
    const frontValveStatus = document.getElementById('front-valve-status');
    const backValveStatus = document.getElementById('back-valve-status');
    const regurgitationStatus = document.getElementById('regurgitation-status');
    const vesselPhaseStatus = document.getElementById('vessel-phase-status');
    const flowHint = document.getElementById('flow-hint');

    // 大字構造標籤元素（預設關閉）
    let labelsVisible = false;
    const anatomicalLabelsContainer = document.getElementById('anatomical-labels');
    const labelVein = document.getElementById('label-vein');
    const labelAtrium = document.getElementById('label-atrium');
    const labelAvValve = document.getElementById('label-av-valve');
    const labelVentricle = document.getElementById('label-ventricle');
    const labelArterialValve = document.getElementById('label-arterial-valve');
    const labelArtery = document.getElementById('label-artery');
    const tempProjVec = new THREE.Vector3();

    // Particle quality UI elements
    const particleSlider = document.getElementById('particle-slider');
    const particleCountDisplay = document.getElementById('particle-count-display');
    const qualityLowBtn = document.getElementById('quality-low-btn');
    const qualityMedBtn = document.getElementById('quality-med-btn');
    const qualityHighBtn = document.getElementById('quality-high-btn');

    function init() {
        // 渲染器
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x1e293b);
        document.body.appendChild(renderer.domElement);

        // 場景
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x1e293b, 85, 235);

        // 攝影機：讓更長的 Z 軸血管橫向完整展開於畫面中央
        camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(58, 42, 0);
        camera.lookAt(0, 0, 0);

        // 光源
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.85);
        directionalLight.position.set(30, 45, 25);
        scene.add(directionalLight);
        const backLight = new THREE.DirectionalLight(0x93c5fd, 0.35);
        backLight.position.set(-30, -20, -20);
        scene.add(backLight);

        // 物理世界：使用 SAPBroadphase 大幅提升多粒子碰撞檢測效能，並設定零摩擦材質防止血球塞車
        world = new CANNON.World();
        world.gravity.set(0, 0, 0);
        world.broadphase = new CANNON.SAPBroadphase(world);
        world.solver.iterations = 6;
        world.defaultContactMaterial.friction = 0.0;
        world.defaultContactMaterial.restitution = 0.1;

        // 創建血管（視覺效果）
        createTube();

        // 創建血球
        createParticles();

        // 鼠標/觸控控制
        initControls();

        // 單次壓縮/擴張切換按鈕
        toggleCompressBtn.addEventListener('click', () => {
            if (autoCompressEnabled) stopAutoCompress();
            if (irregularCompressEnabled) stopIrregularCompress();
            if (vesselState === 'normal' || vesselState === 'expand') {
                setVesselPhase('compress');
            } else {
                setVesselPhase('expand');
            }
        });

        // 連續壓縮（規律自動心臟搏動）按鈕
        if (autoCompressBtn) {
            autoCompressBtn.addEventListener('click', () => {
                if (autoCompressEnabled) {
                    stopAutoCompress();
                    setVesselPhase('normal');
                } else {
                    if (irregularCompressEnabled) stopIrregularCompress();
                    startAutoCompress();
                }
                updateFlowHint();
            });
        }

        // 不規律收縮（心律不整原型）按鈕
        if (irregularCompressBtn) {
            irregularCompressBtn.addEventListener('click', () => {
                if (irregularCompressEnabled) {
                    stopIrregularCompress();
                    setVesselPhase('normal');
                } else {
                    if (autoCompressEnabled) stopAutoCompress();
                    startIrregularCompress();
                }
                updateFlowHint();
            });
        }

        // 瓣膜關閉不全（逆流）切換按鈕
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

        if (toggleLabelsBtn) {
            toggleLabelsBtn.addEventListener('click', () => {
                labelsVisible = !labelsVisible;
                if (anatomicalLabelsContainer) {
                    anatomicalLabelsContainer.classList.toggle('hidden', !labelsVisible);
                }
                if (labelsVisible) {
                    toggleLabelsBtn.textContent = '🏷️ 隱藏標籤';
                    toggleLabelsBtn.classList.remove('btn-neutral');
                    toggleLabelsBtn.classList.add('btn-blue');
                    updateAnatomicalLabels();
                } else {
                    toggleLabelsBtn.textContent = '🏷️ 顯示標籤';
                    toggleLabelsBtn.classList.remove('btn-blue');
                    toggleLabelsBtn.classList.add('btn-neutral');
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
            qualityLowBtn.addEventListener('click', () => setParticleCount(80));
        }
        if (qualityMedBtn) {
            qualityMedBtn.addEventListener('click', () => setParticleCount(200));
        }
        if (qualityHighBtn) {
            qualityHighBtn.addEventListener('click', () => setParticleCount(400));
        }

        updateFlowHint();
        window.addEventListener('resize', onWindowResize);
    }

    function toggleRegurgitation() {
        regurgitationEnabled = !regurgitationEnabled;
        if (regurgitationEnabled) {
            if (toggleRegurgitationBtn) {
                toggleRegurgitationBtn.textContent = '❌ 移除關閉不全(恢復正常)';
                toggleRegurgitationBtn.classList.remove('btn-amber');
                toggleRegurgitationBtn.classList.add('btn-red');
            }
            if (regurgitationStatus) {
                regurgitationStatus.textContent = '⚠️ 關閉不全 (逆流漏血)';
                regurgitationStatus.className = 'status-badge status-warn';
            }
            // 若目前尚未安裝瓣膜，自動為使用者安裝前後瓣膜以利即時觀察
            if (!backValveEnabled && !frontValveEnabled) {
                addValve('back');
                addValve('front');
            }
        } else {
            if (toggleRegurgitationBtn) {
                toggleRegurgitationBtn.textContent = '⚠️ 瓣膜關閉不全(逆流)';
                toggleRegurgitationBtn.classList.remove('btn-red');
                toggleRegurgitationBtn.classList.add('btn-amber');
            }
            if (regurgitationStatus) {
                regurgitationStatus.textContent = '健康正常 (緊密閉合)';
                regurgitationStatus.className = 'status-badge status-neutral';
            }
        }
        updateFlowHint();
    }

    function toggleAtrium() {
        atriumEnabled = !atriumEnabled;
        if (atriumEnabled) {
            if (toggleAtriumBtn) {
                toggleAtriumBtn.textContent = '－ 移除心房囊袋';
                toggleAtriumBtn.classList.remove('btn-green');
                toggleAtriumBtn.classList.add('btn-red');
            }
            if (atriumStatus) {
                atriumStatus.textContent = '已開啟 (儲血囊袋)';
                atriumStatus.className = 'status-badge status-on';
            }
        } else {
            if (toggleAtriumBtn) {
                toggleAtriumBtn.textContent = '＋ 心房囊袋(靜脈竇)';
                toggleAtriumBtn.classList.remove('btn-red');
                toggleAtriumBtn.classList.add('btn-green');
            }
            if (atriumStatus) {
                atriumStatus.textContent = '未開啟';
                atriumStatus.className = 'status-badge status-off';
            }
        }
        updateFlowHint();
    }

    function setVesselPhase(newPhase) {
        vesselState = newPhase;
        phaseTimer = 0;
        pulseSpawnedThisPhase = false;

        if (vesselState === 'compress') {
            toggleCompressBtn.textContent = '擴張心室';
            toggleCompressBtn.classList.remove('btn-blue', 'btn-green');
            toggleCompressBtn.classList.add('btn-red');
            if (vesselPhaseStatus) {
                if (irregularCompressEnabled) {
                    const modeText = irregularModeType === 'premature'
                        ? '⚡ 心律不整：提早收縮 (充盈不足)'
                        : irregularModeType === 'fibrillation'
                            ? '⚡ 心律不整：微弱亂顫 (無效搏動)'
                            : '⚡ 心律不整：不規則收縮';
                    vesselPhaseStatus.textContent = modeText;
                    vesselPhaseStatus.className = 'status-badge status-warn';
                } else {
                    vesselPhaseStatus.textContent = autoCompressEnabled ? '自動搏動：心室收縮' : '壓縮心室 (收縮期)';
                    vesselPhaseStatus.className = 'status-badge status-off';
                }
            }
        } else if (vesselState === 'expand') {
            toggleCompressBtn.textContent = '壓縮心室';
            toggleCompressBtn.classList.remove('btn-blue', 'btn-red');
            toggleCompressBtn.classList.add('btn-green');
            if (vesselPhaseStatus) {
                if (irregularCompressEnabled) {
                    const modeText = irregularModeType === 'pause'
                        ? '⚡ 心律不整：代償長停頓 (血流遲滯)'
                        : irregularModeType === 'premature'
                            ? '⚡ 心律不整：極短舒張 (來不及充血)'
                            : '⚡ 心律不整：不規則舒張';
                    vesselPhaseStatus.textContent = modeText;
                    vesselPhaseStatus.className = 'status-badge status-warn';
                } else {
                    vesselPhaseStatus.textContent = autoCompressEnabled ? '自動搏動：心室舒張' : '擴張心室 (舒張期)';
                    vesselPhaseStatus.className = 'status-badge status-on';
                }
            }
        } else {
            toggleCompressBtn.textContent = '壓縮心室';
            toggleCompressBtn.classList.remove('btn-red', 'btn-green');
            toggleCompressBtn.classList.add('btn-blue');
            if (vesselPhaseStatus) {
                vesselPhaseStatus.textContent = '平時 (靜止)';
                vesselPhaseStatus.className = 'status-badge status-neutral';
            }
        }
    }

    function startAutoCompress() {
        autoCompressEnabled = true;
        autoCompressTimer = 0;
        irregularStrength = 1.0;
        if (autoCompressBtn) {
            autoCompressBtn.textContent = '停止連續壓縮';
            autoCompressBtn.classList.remove('btn-purple');
            autoCompressBtn.classList.add('btn-amber');
        }
        setVesselPhase('compress');
    }

    function stopAutoCompress() {
        autoCompressEnabled = false;
        autoCompressTimer = 0;
        if (autoCompressBtn) {
            autoCompressBtn.textContent = '連續壓縮';
            autoCompressBtn.classList.remove('btn-amber');
            autoCompressBtn.classList.add('btn-purple');
        }
    }

    function scheduleNextIrregularPhase() {
        irregularTimer = 0;
        const rand = Math.random();

        if (vesselState !== 'compress') {
            // 即將進入收縮期：隨機決定是「早搏 (充盈不足)」、「微弱亂顫」或「代償後收縮」
            if (irregularModeType === 'premature') {
                // 剛經歷極短舒張期，心室尚未充飽血就提早收縮 → 收縮力道弱、排血量少
                irregularStrength = 0.35 + Math.random() * 0.2;
                irregularNextInterval = 0.22 + Math.random() * 0.15;
            } else if (rand < 0.45) {
                // 快速微弱亂顫 (Fibrillation / Flutter)：管壁急促淺抖，幾乎推不動血液
                irregularModeType = 'fibrillation';
                irregularStrength = 0.22 + Math.random() * 0.18;
                irregularNextInterval = 0.14 + Math.random() * 0.12;
            } else {
                // 代償間歇後的偶發較強收縮
                irregularModeType = 'compensatory';
                irregularStrength = 0.72 + Math.random() * 0.22;
                irregularNextInterval = 0.45 + Math.random() * 0.25;
            }
            setVesselPhase('compress');
        } else {
            // 即將進入舒張期：隨機決定是「極短舒張 (引發下一次早搏)」、「亂顫抖動」或「代償性長停頓」
            if (rand < 0.42) {
                // 極短舒張期：心室還沒擴張完、血液還沒流入多少，馬上又會觸發早搏！
                irregularModeType = 'premature';
                irregularStrength = 0.3 + Math.random() * 0.2;
                irregularNextInterval = 0.16 + Math.random() * 0.12;
            } else if (rand < 0.75) {
                // 亂顫期短促舒張
                irregularModeType = 'fibrillation';
                irregularStrength = 0.25 + Math.random() * 0.15;
                irregularNextInterval = 0.14 + Math.random() * 0.12;
            } else {
                // 代償間歇 (Compensatory Pause)：長停頓，血流一度停滯
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
            irregularCompressBtn.textContent = '停止不規律收縮';
            irregularCompressBtn.classList.remove('btn-rose');
            irregularCompressBtn.classList.add('btn-irregular-active');
        }
        scheduleNextIrregularPhase();
    }

    function stopIrregularCompress() {
        irregularCompressEnabled = false;
        irregularTimer = 0;
        irregularStrength = 1.0;
        if (irregularCompressBtn) {
            irregularCompressBtn.textContent = '不規律收縮(心律不整)';
            irregularCompressBtn.classList.remove('btn-irregular-active');
            irregularCompressBtn.classList.add('btn-rose');
        }
    }

    function updateFlowHint() {
        if (!flowHint) return;
        if (regurgitationEnabled) {
            if (frontValveEnabled && backValveEnabled) {
                flowHint.textContent = '⚠️ 瓣膜關閉不全（全心逆流）：收縮期房室瓣無法閉合，大量血液逆噴回心房；舒張期動脈瓣漏縫倒灌，動脈脈搏波塌陷（水錘脈），循環效率大幅癱瘓！';
            } else if (backValveEnabled) {
                flowHint.textContent = '⚠️ 房室瓣關閉不全（二尖瓣逆流）：收縮期血液透過瓣膜縫隙逆流噴回心房/靜脈，前向動脈射血量大幅腰斬！';
            } else if (frontValveEnabled) {
                flowHint.textContent = '⚠️ 動脈瓣關閉不全（主動脈瓣逆流）：舒張期動脈高壓血液倒灌回心室，脈搏波迅速衰減塌陷，心室容量負荷超載！';
            } else {
                flowHint.textContent = '⚠️ 請開啟前瓣膜或後瓣膜，以觀察瓣膜關閉不全與逆流現象。';
            }
            return;
        }
        if (irregularCompressEnabled) {
            flowHint.textContent = '⚡ 心律不整（不規律收縮）：舒張期過短導致心室來不及充血就提早收縮（空打），加上快速微弱亂顫與長停頓，使血流忽快忽慢、效率大幅下降！';
            return;
        }
        const atriumNote = atriumEnabled
            ? '【心房/靜脈竇囊袋已開啟：心室收縮時囊袋膨大暫存回流血，心室舒張時囊袋回縮將大量血液快速灌入心室！】'
            : '';
        if (frontValveEnabled && backValveEnabled) {
            flowHint.textContent = `❤️ 雙瓣膜心臟模式：收縮時後瓣膜閉合向右排血並激發動脈脈搏波；舒張時前瓣膜閉合防倒流、從左側吸入新血。${atriumNote}`;
        } else if (backValveEnabled && !frontValveEnabled) {
            flowHint.textContent = `⚠️ 僅有後瓣膜(左)：收縮時向右排血激發動脈脈搏，但舒張時缺乏前瓣膜，剛排出的血液又會倒流回來。${atriumNote}`;
        } else if (!backValveEnabled && frontValveEnabled) {
            flowHint.textContent = `⚠️ 僅有前瓣膜(右)：舒張時防止右側動脈血液倒流，但收縮時缺乏後瓣膜，部分血液會向左側逆流漏失。${atriumNote}`;
        } else {
            flowHint.textContent = `💡 原始未分化心管（無瓣膜）：收縮時血液對稱向兩端散開，舒張時吸回，在原地往復震盪；尚未建立單向高壓動脈脈搏。${atriumNote}`;
        }
    }

    function initControls() {
        const center = new THREE.Vector3(0, 0, 0);
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let touchStartDistance = 0;
        let previousTouchPosition = { x: 0, y: 0 };

        function rotateCamera(deltaX, deltaY) {
            const sensitivity = 0.005;
            const axisX = new THREE.Vector3(0, 1, 0);
            const axisY = new THREE.Vector3(1, 0, 0);
            const qX = new THREE.Quaternion().setFromAxisAngle(axisX, -deltaX * sensitivity);
            const qY = new THREE.Quaternion().setFromAxisAngle(axisY, -deltaY * sensitivity);
            camera.position.applyQuaternion(qX);
            camera.position.applyQuaternion(qY);
            camera.up.applyQuaternion(qX);
            camera.up.applyQuaternion(qY);
            camera.lookAt(center);
        }

        function panCamera(deltaX, deltaY) {
            const sensitivity = camera.position.distanceTo(center) * 0.001;
            const right = new THREE.Vector3().crossVectors(camera.up, camera.position).normalize();
            const up = camera.up.clone();
            camera.position.addScaledVector(right, -deltaX * sensitivity);
            camera.position.addScaledVector(up, deltaY * sensitivity);
            center.addScaledVector(right, -deltaX * sensitivity);
            center.addScaledVector(up, deltaY * sensitivity);
            camera.lookAt(center);
        }

        function zoomCamera(delta) {
            const sensitivity = 1.5;
            const newLen = Math.max(20, Math.min(140, camera.position.length() + delta * sensitivity));
            camera.position.setLength(newLen);
            camera.lookAt(center);
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
                rotateCamera(deltaX * 0.5, deltaY * 0.5);
                previousTouchPosition.x = touch.clientX;
                previousTouchPosition.y = touch.clientY;
            } else if (isDragging === 'zoom' && e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                const delta = touchStartDistance - currentDistance;
                zoomCamera(delta * 0.1);
                touchStartDistance = currentDistance;
            }
        }, { passive: false });
        renderer.domElement.addEventListener('touchend', () => { isDragging = false; });
    }

    function createTube() {
        // 全長連貫無接縫的半透明主血管（軸向分段數提升至 144，長度擴充至 170，呈現長距離脈搏波波動）
        const fullTubeGeometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeLength, 36, 144, true);
        const fullTubeMaterial = new THREE.MeshPhongMaterial({
            color: 0xf1f5f9,
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        fullTubeMesh = new THREE.Mesh(fullTubeGeometry, fullTubeMaterial);
        fullTubeMesh.rotation.x = Math.PI / 2;
        fullTubeMesh.position.z = 0;
        scene.add(fullTubeMesh);

        // 中央可收縮/舒張的原始心管肌肉壁（搏動心室腔 z: -15 ~ +15）
        const compressionGeometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, compressionLength, 36, 32, true);
        const compressionMaterial = new THREE.MeshPhongMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.12,
            transparent: true,
            opacity: 0.32,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        compressionZoneMesh = new THREE.Mesh(compressionGeometry, compressionMaterial);
        compressionZoneMesh.rotation.x = Math.PI / 2;
        compressionZoneMesh.position.z = centralSectionZ;
        scene.add(compressionZoneMesh);

        // 上游入口處可膨大的心房囊袋 / 靜脈竇肌肉壁（z: +16.5 ~ +44.5）
        const atriumGeometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, atriumLength, 36, 32, true);
        const atriumMaterial = new THREE.MeshPhongMaterial({
            color: 0xf43f5e,
            emissive: 0xbe123c,
            emissiveIntensity: 0.15,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        atriumZoneMesh = new THREE.Mesh(atriumGeometry, atriumMaterial);
        atriumZoneMesh.rotation.x = Math.PI / 2;
        atriumZoneMesh.position.z = atriumCenterZ;
        atriumZoneMesh.visible = false;
        scene.add(atriumZoneMesh);

        // 下游長距離彈性動脈肌肉壁套管（長度 69 單位長，細分 64 格，高幅度生動跳動）
        const arteryGeometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, arteryLength, 36, 64, true);
        const arteryMaterial = new THREE.MeshPhongMaterial({
            color: 0xf87171,
            emissive: 0x991b1b,
            emissiveIntensity: 0.16,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        arteryZoneMesh = new THREE.Mesh(arteryGeometry, arteryMaterial);
        arteryZoneMesh.rotation.x = Math.PI / 2;
        arteryZoneMesh.position.z = arteryCenterZ;
        arteryZoneMesh.visible = false; // 初始未安裝瓣膜時隱藏，血管保持完全對稱無動脈化
        scene.add(arteryZoneMesh);
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
        if (sharedParticleMaterial) {
            sharedParticleMaterial.dispose();
            sharedParticleMaterial = null;
        }
        particles = [];
    }

    // 取得在指定 Z 位置處的血管有效內半徑（動脈波高度與心室外觀精準吻合）
    function getEffectiveTubeRadiusAtZ(z) {
        // 1. 中央心室區 (-15 ~ +15)：平滑收縮與舒張
        if (Math.abs(z) <= halfCompressionLength) {
            const u = z / halfCompressionLength; // -1 ~ +1
            const ventEnvelope = Math.pow(Math.cos(u * Math.PI * 0.5), 0.75);
            const scale = 1 - currentCompression * compressionFactor * ventEnvelope;
            return tubeRadius * scale;
        }
        // 2. 上游心房囊袋 / 靜脈竇區 (+16.5 ~ +44.5)：開啟時膨大成圓潤囊袋
        if (atriumCurrentBulge > 0.001 && z >= atriumZMin && z <= atriumZMax) {
            const u = (z - atriumCenterZ) / halfAtriumLength; // -1 ~ +1
            const pouchProfile = Math.pow(Math.cos(u * Math.PI * 0.5), 1.6);
            const scale = 1 + atriumCurrentBulge * atriumMaxBulgeFactor * pouchProfile;
            return tubeRadius * scale;
        }
        // 3. 下游動脈區 (z <= -16)：受心室射血驅動的動脈彈性脈搏波 (Arterial Pulse Waves)
        if (z <= -halfCompressionLength - 1) {
            let pulseExpansion = 0;
            for (let i = 0; i < arterialPulseWaves.length; i++) {
                const wave = arterialPulseWaves[i];
                const dist = Math.abs(z - wave.z);
                if (dist < wave.width * 2.2) {
                    const norm = dist / wave.width;
                    pulseExpansion += wave.amplitude * Math.exp(-norm * norm * 1.5);
                }
            }
            if (pulseExpansion > 0.0005) {
                // 根部平滑漸變 (Root Taper): 在動脈瓣交界處 (z = -16 到 -19) 平滑銜接，消除接縫落差
                const rootDist = Math.max(0, (-halfCompressionLength - 1) - z);
                const rootTaper = Math.min(1.0, rootDist / 3.0);
                // 脈搏波高度與心室充盈期高度 (約 4.8 ~ 5.0) 保持一致吻合，最大擴張約 +24%
                const scale = 1 + Math.min(0.24, pulseExpansion * 0.22) * rootTaper;
                return tubeRadius * scale;
            }
        }
        return tubeRadius;
    }

    // 動態更新血管主體、心室套管與心房囊袋的 3D 頂點形狀，使囊袋膨大與心室搏動平滑自然
    function updateCylinderMeshProfile(mesh, centerZ, radiusOffsetFactor) {
        if (!mesh || !mesh.geometry) return;
        const posAttr = mesh.geometry.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const vx = posAttr.getX(i);
            const vy = posAttr.getY(i); // 旋轉 90 度後，local Y 對應 world Z 偏移
            const vz = posAttr.getZ(i);
            const currRadial = Math.sqrt(vx * vx + vz * vz);
            if (currRadial > 0.0001) {
                const worldZ = centerZ + vy;
                const targetR = getEffectiveTubeRadiusAtZ(worldZ) * radiusOffsetFactor;
                const ratio = targetR / currRadial;
                posAttr.setX(i, vx * ratio);
                posAttr.setZ(i, vz * ratio);
            }
        }
        posAttr.needsUpdate = true;
    }

    // 在給定區間生成隨機血管截面座標 (x, y)
    function randomCrossSectionXY(maxR) {
        const safeR = Math.max(0.5, maxR - particleRadius * 1.3);
        const angle = Math.random() * Math.PI * 2;
        // 使用平方根分佈讓粒子在圓截面內均勻分佈，不擠在圓心
        const r = Math.sqrt(Math.random()) * safeR;
        return {
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r
        };
    }

    function createParticles(count) {
        if (typeof count === 'number') {
            particleCount = count;
        }

        // 依粒子數量動態調整網格細分，兼顧行動裝置效能與紅血球圓潤外觀
        let segments = 14;
        if (particleCount <= 100) {
            segments = 10;
        } else if (particleCount <= 250) {
            segments = 12;
        }

        // 建立略帶扁平雙凹感的紅血球幾何體與共用材質（大幅減少 GPU draw state 切換）
        sharedParticleGeometry = new THREE.SphereGeometry(particleRadius, segments, segments);
        sharedParticleGeometry.scale(1.15, 0.65, 1.15); // 紅血球圓盤比例
        sharedParticleMaterial = new THREE.MeshPhongMaterial({
            color: 0xdc2626,
            emissive: 0x450a0a,
            specular: 0xfca5a5,
            shininess: 35
        });

        // 隨機均勻分佈血球於整條血管內，無分層排序或人工間隔，呈現完全自然的流體分佈
        const collisionShape = new CANNON.Sphere(particleRadius * 0.7);

        for (let i = 0; i < particleCount; i++) {
            const z = (Math.random() - 0.5) * (tubeLength - 4);
            const localR = getEffectiveTubeRadiusAtZ(z);
            const { x, y } = randomCrossSectionXY(localR);

            const particleMesh = new THREE.Mesh(sharedParticleGeometry, sharedParticleMaterial);
            particleMesh.position.set(x, y, z);
            particleMesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            scene.add(particleMesh);

            const particleBody = new CANNON.Body({
                mass: 1,
                shape: collisionShape,
                position: new CANNON.Vec3(x, y, z),
                linearDamping: 0.35, // 具備真實血液黏滯感，外力停止時平緩減速
                angularDamping: 0.4
            });

            // 微小初始自轉
            particleBody.angularVelocity.set(
                (Math.random() - 0.5) * 1.2,
                (Math.random() - 0.5) * 1.2,
                (Math.random() - 0.5) * 1.2
            );

            world.addBody(particleBody);
            particles.push({ mesh: particleMesh, body: particleBody, hasPulsed: false });
        }
    }

    function setParticleCount(newCount) {
        newCount = Math.max(20, Math.min(500, parseInt(newCount, 10) || 200));
        clearParticles();
        createParticles(newCount);

        if (particleSlider) particleSlider.value = newCount;
        if (particleCountDisplay) particleCountDisplay.textContent = `${newCount} 顆`;

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

    function createValve(position) {
        let zPos;
        if (position === 'front') {
            zPos = -halfCompressionLength - 1; // z = -16 (右側出口前瓣膜)
        } else if (position === 'back') {
            zPos = halfCompressionLength + 1;  // z = +16 (左側入口後瓣膜)
        }

        // 注意：不在 Cannon.js 放入永久靜態擋板剛體，避免順流時血球撞牆塞車！
        // 僅使用輕量座標物件紀錄瓣膜物理平面位置，單向阻擋由 updateValves 流體邊界條件精準控制
        const valveAnchor = {
            position: new CANNON.Vec3(0, 0, zPos)
        };

        // 解剖擬真靜脈/心臟瓣膜 (Bicuspid Valve + Annulus Ring)
        const valveGroup = new THREE.Group();
        valveGroup.position.set(0, 0, zPos);

        // 血管壁基部纖維環 (Annulus Fibrosus)
        const ringGeometry = new THREE.TorusGeometry(tubeRadius * 0.98, 0.2, 12, 32);
        const ringMaterial = new THREE.MeshPhongMaterial({ color: 0xb91c1c });
        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        valveGroup.add(ringMesh);

        // 擬真葉片材質
        const cuspMaterial = new THREE.MeshPhongMaterial({
            color: 0xf87171,
            emissive: 0x7f1d1d,
            emissiveIntensity: 0.2,
            side: THREE.DoubleSide
        });

        // 雙瓣葉片尺寸
        const flapWidth = tubeRadius * 1.65;
        const flapLength = tubeRadius * 0.88;
        const flapThickness = 0.16;
        const cuspGeometry = new THREE.BoxGeometry(flapWidth, flapLength, flapThickness);

        // 上葉片樞紐 (Top Cusp Pivot)
        const topPivot = new THREE.Group();
        topPivot.position.set(0, tubeRadius * 0.72, 0);
        const topCusp = new THREE.Mesh(cuspGeometry, cuspMaterial);
        topCusp.position.set(0, -flapLength / 2, 0);
        topPivot.add(topCusp);
        valveGroup.add(topPivot);

        // 下葉片樞紐 (Bottom Cusp Pivot)
        const bottomPivot = new THREE.Group();
        bottomPivot.position.set(0, -tubeRadius * 0.72, 0);
        const bottomCusp = new THREE.Mesh(cuspGeometry, cuspMaterial);
        bottomCusp.position.set(0, flapLength / 2, 0);
        bottomPivot.add(bottomCusp);
        valveGroup.add(bottomPivot);

        // 初始靜止閉合角度（頂端朝向順流 -Z 右側方向微傾閉合，呈 V 字型漏斗阻止倒流）
        const restAngle = 0.18;
        topPivot.rotation.x = restAngle;
        bottomPivot.rotation.x = -restAngle;

        valveGroup.material = cuspMaterial;
        valveGroup.userData = {
            topPivot,
            bottomPivot,
            currentOpen: 0,
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

    function addValve(position) {
        if (position === 'front' && !frontValveEnabled) {
            createValve('front');
            frontValveEnabled = true;
            frontValveStatus.textContent = "已安裝 (單向導通)";
            frontValveStatus.className = 'status-badge status-on';
            if (toggleFrontValveBtn) {
                toggleFrontValveBtn.textContent = '－ 移除前瓣膜(右)';
                toggleFrontValveBtn.classList.remove('btn-green');
                toggleFrontValveBtn.classList.add('btn-red');
            }
            updateFlowHint();
        } else if (position === 'back' && !backValveEnabled) {
            createValve('back');
            backValveEnabled = true;
            backValveStatus.textContent = "已安裝 (單向導通)";
            backValveStatus.className = 'status-badge status-on';
            if (toggleBackValveBtn) {
                toggleBackValveBtn.textContent = '－ 移除後瓣膜(左)';
                toggleBackValveBtn.classList.remove('btn-green');
                toggleBackValveBtn.classList.add('btn-red');
            }
            updateFlowHint();
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
            frontValveStatus.textContent = "未安裝";
            frontValveStatus.className = 'status-badge status-off';
            if (toggleFrontValveBtn) {
                toggleFrontValveBtn.textContent = '＋ 新增前瓣膜(右)';
                toggleFrontValveBtn.classList.remove('btn-red');
                toggleFrontValveBtn.classList.add('btn-green');
            }
            updateFlowHint();
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
            backValveStatus.textContent = "未安裝";
            backValveStatus.className = 'status-badge status-off';
            if (toggleBackValveBtn) {
                toggleBackValveBtn.textContent = '＋ 新增後瓣膜(左)';
                toggleBackValveBtn.classList.remove('btn-red');
                toggleBackValveBtn.classList.add('btn-green');
            }
            updateFlowHint();
        }
    }

    // 核心流體力學與心管搏動模型
    function updateCompression(dt) {
        // 若開啟「連續壓縮」，自動依規律週期切換壓縮(收縮)與擴張(舒張)
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
            // 若開啟「不規律收縮（心律不整）」，依隨機忽快忽慢與深淺不一的節律切換
            irregularTimer += dt;
            tremorTime += dt;
            if (irregularTimer >= irregularNextInterval) {
                scheduleNextIrregularPhase();
            }
        }

        phaseTimer += dt;

        // 1. 更新中央心室腔與上游心房囊袋（靜脈竇）的視覺與物理管徑
        let targetCompression = 0;
        const effectiveStrength = irregularCompressEnabled ? irregularStrength : 1.0;
        // 心律不整亂顫時，管壁附加高頻微幅顫抖 (Fibrillation Tremor)
        const tremorOffset = (irregularCompressEnabled && irregularModeType === 'fibrillation')
            ? Math.sin(tremorTime * 42.0) * 0.12
            : 0;

        if (vesselState === 'compress') {
            targetCompression = 1.0 * effectiveStrength + tremorOffset;
        } else if (vesselState === 'expand') {
            targetCompression = -0.55 * effectiveStrength + tremorOffset; // 舒張時適度擴張
        } else {
            targetCompression = 0.0;
        }

        const adaptSpeed = irregularCompressEnabled ? compressionSpeed * 1.45 : compressionSpeed;
        currentCompression += (targetCompression - currentCompression) * adaptSpeed * (dt * 60);

        // 計算心房囊袋（靜脈竇）的動態膨大程度：
        // - 心室壓縮 (compress) 時：後瓣膜關閉，上游回流血液湧入心房囊袋儲血，囊袋顯著充盈膨大 (1.05)
        // - 心室擴張 (expand) 時：心房囊袋彈性回縮 (0.28)，將儲存的血液快速擠入心室！
        // - 心律不整時：房室協同失調 (AV Dyssynchrony)，心房不規則顫動，無法有效配合心室注血
        let targetAtriumBulge = 0;
        if (atriumEnabled) {
            if (irregularCompressEnabled) {
                targetAtriumBulge = 0.68 + 0.22 * Math.sin(tremorTime * 19.0);
                if (atriumStatus) {
                    atriumStatus.textContent = '⚡ 房室失調 (心房亂顫)';
                    atriumStatus.className = 'status-badge status-warn';
                }
            } else if (vesselState === 'compress') {
                targetAtriumBulge = 1.05;
                if (atriumStatus) {
                    atriumStatus.textContent = '充盈儲血中 (囊袋膨大)';
                    atriumStatus.className = 'status-badge status-warn';
                }
            } else if (vesselState === 'expand') {
                targetAtriumBulge = 0.28;
                if (atriumStatus) {
                    atriumStatus.textContent = '收縮注血中 (灌入心室 →)';
                    atriumStatus.className = 'status-badge status-on';
                }
            } else {
                targetAtriumBulge = 0.85;
                if (atriumStatus) {
                    atriumStatus.textContent = '已開啟 (儲血囊袋)';
                    atriumStatus.className = 'status-badge status-on';
                }
            }
        }

        const prevAtriumBulge = atriumCurrentBulge;
        atriumCurrentBulge += (targetAtriumBulge - atriumCurrentBulge) * 0.09 * (dt * 60);
        const atriumBulgeDelta = atriumCurrentBulge - prevAtriumBulge;

        // 推進動脈彈性脈搏波向右（下游）長距離傳導 (Pulse Wave Propagation)
        const pulseWaveSpeed = 42.0; // 脈搏波在動脈壁中的傳播速度 (單位/秒)
        for (let i = arterialPulseWaves.length - 1; i >= 0; i--) {
            const wave = arterialPulseWaves[i];
            wave.z -= pulseWaveSpeed * dt;
            // 若發生動脈瓣關閉不全（舒張期血液倒灌），動脈舒張壓急速潰散，脈搏波迅速衰減塌陷 (Corrigan's / collapsing pulse)
            const decayRate = (regurgitationEnabled && frontValveEnabled && vesselState === 'expand')
                ? Math.pow(0.78, dt * 60)
                : Math.pow(0.982, dt * 60);
            wave.amplitude *= decayRate;
            if (wave.z < -halfTubeLength - 10 || wave.amplitude < 0.04) {
                arterialPulseWaves.splice(i, 1);
            }
        }

        // 激發動脈彈性脈搏波（演化邏輯：需先安裝單向瓣膜建立射血體系；無瓣膜時左右對稱分流，不產生單側動脈波）
        if (vesselState === 'compress' && (frontValveEnabled || backValveEnabled)) {
            // 判定心室是否已明顯收縮增壓 (currentCompression 達到收縮進度，避免剛按下的第 1 幀過早發射)
            const isChamberContracted = currentCompression >= 0.35 || phaseTimer >= 0.22;
            // 判定動脈瓣是否已順流推開 (有安裝前瓣膜時檢測開度，僅後瓣膜或心律不整時達射血時相)
            const isValveOpened = !frontValveEnabled || (frontValveMeshes.length > 0 && frontValveMeshes[0].userData && frontValveMeshes[0].userData.currentOpen > 0.16) || phaseTimer >= 0.30;

            if (!pulseSpawnedThisPhase && isChamberContracted && isValveOpened) {
                pulseSpawnedThisPhase = true;
                // 若房室瓣關閉不全，大量血液逆流回心房，前向射血量折損，動脈脈搏波強度顯著減弱
                const regurgLoss = (regurgitationEnabled && backValveEnabled) ? 0.48 : 1.0;
                const amp = (irregularCompressEnabled ? irregularStrength : 1.0) * (frontValveEnabled ? 1.0 : 0.8) * regurgLoss;
                arterialPulseWaves.push({
                    z: -halfCompressionLength - 1.0, // 從動脈瓣口 (z = -16.0) 根部平滑湧出
                    amplitude: amp,
                    width: 8.5 // 脈搏波寬度
                });
            }
        }

        // 動態更新動脈脈搏狀態提示
        if (arterialPulseStatus) {
            if (!frontValveEnabled && !backValveEnabled) {
                arterialPulseStatus.textContent = '未形成 (無單向瓣膜高壓射血)';
                arterialPulseStatus.className = 'status-badge status-off';
            } else {
                const maxPulseAmp = arterialPulseWaves.length > 0 ? Math.max(...arterialPulseWaves.map(w => w.amplitude)) : 0;
                if (regurgitationEnabled && frontValveEnabled && vesselState === 'expand') {
                    arterialPulseStatus.textContent = '⚠️ 脈搏波塌陷 (水錘脈/舒張倒灌)';
                    arterialPulseStatus.className = 'status-badge status-warn';
                } else if (maxPulseAmp > 0.3) {
                    arterialPulseStatus.textContent = '💓 收縮期脈搏波 (強烈傳導中...)';
                    arterialPulseStatus.className = 'status-badge status-on';
                } else {
                    arterialPulseStatus.textContent = '平穩 (舒張基線)';
                    arterialPulseStatus.className = 'status-badge status-neutral';
                }
            }
        }

        // 更新主血管、心室肌肉壁、心房囊袋與動脈彈性套管的 3D 網格頂點
        updateCylinderMeshProfile(fullTubeMesh, 0, 1.0);
        updateCylinderMeshProfile(compressionZoneMesh, centralSectionZ, 1.02);

        if (atriumZoneMesh) {
            if (atriumCurrentBulge > 0.01) {
                atriumZoneMesh.visible = true;
                atriumZoneMesh.material.opacity = Math.min(0.36, atriumCurrentBulge * 0.36);
                updateCylinderMeshProfile(atriumZoneMesh, atriumCenterZ, 1.025);
            } else {
                atriumZoneMesh.visible = false;
            }
        }

        const hasAnyValve = frontValveEnabled || backValveEnabled;
        if (arteryZoneMesh) {
            if (hasAnyValve) {
                arteryZoneMesh.visible = true;
                updateCylinderMeshProfile(arteryZoneMesh, arteryCenterZ, 1.02);
                const activePulseAmp = arterialPulseWaves.length > 0 ? Math.max(...arterialPulseWaves.map(w => w.amplitude)) : 0;
                // 脈搏波通過時發出自然雅緻的收縮壓動脈微光，柔和吻合心室
                arteryZoneMesh.material.emissiveIntensity = 0.12 + Math.min(0.50, activePulseAmp * 0.40);
                arteryZoneMesh.material.opacity = 0.25 + Math.min(0.25, activePulseAmp * 0.20);
            } else {
                arteryZoneMesh.visible = false;
                arterialPulseWaves = [];
            }
        }

        // 2. 依據「收縮/舒張狀態」、「前後瓣膜配置」與「心房囊袋儲血/注血」計算連續流場推進力
        // 脈衝包絡線：規律連續搏動時維持飽滿動能；心律不整時隨早搏/亂顫/長停頓呈現強弱不均與斷續停滯
        let pulseEnvelope;
        if (autoCompressEnabled) {
            pulseEnvelope = 0.6 + 0.4 * Math.cos(Math.min(Math.PI, (phaseTimer / autoCycleHalfPeriod) * Math.PI * 0.7));
        } else if (irregularCompressEnabled) {
            pulseEnvelope = effectiveStrength * Math.exp(-phaseTimer * 2.1);
        } else {
            pulseEnvelope = Math.exp(-phaseTimer * 1.6);
        }

        const frontZ = -halfCompressionLength - 1; // -16 (右側出口)
        const backZ = halfCompressionLength + 1;   // +16 (左側入口)

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const pos = p.body.position;
            const posZ = pos.z;
            let targetVz = 0;

            // 當心房囊袋正在膨大充盈時，讓位於囊袋區 (+16.5 ~ +44.5) 內的血球自然向囊袋外圍擴散填滿囊袋空間
            if (atriumCurrentBulge > 0.05 && posZ >= atriumZMin && posZ <= atriumZMax) {
                const localMaxR = getEffectiveTubeRadiusAtZ(posZ) - particleRadius * 1.2;
                const rSq = pos.x * pos.x + pos.y * pos.y;
                if (atriumBulgeDelta > 0.0005 && rSq > 0.01 && rSq < localMaxR * localMaxR * 0.85) {
                    const radialOutSpeed = atriumBulgeDelta * 45.0;
                    p.body.velocity.x += (pos.x / Math.sqrt(rSq)) * radialOutSpeed;
                    p.body.velocity.y += (pos.y / Math.sqrt(rSq)) * radialOutSpeed;
                }
            }

            if (vesselState === 'compress') {
                // 【壓縮心室 / 心室收縮期】
                if (backValveEnabled) {
                    if (regurgitationEnabled) {
                        // 房室瓣關閉不全 (Mitral / AV Regurgitation):
                        // 心室收縮期高壓下，中央漏孔產生強勁反向高速射流 (+Z 方向，逆噴入心房)
                        const rSq = pos.x * pos.x + pos.y * pos.y;
                        const isCentralJet = rSq < 3.2 * 3.2;

                        if (posZ >= -4 && posZ <= backZ + 20) {
                            // 房室瓣前後區域：中央高速逆流噴柱
                            if (isCentralJet) {
                                targetVz = +(12.5 + Math.sin(phaseTimer * 28.0) * 2.5) * pulseEnvelope;
                            } else {
                                targetVz = +(4.0 * pulseEnvelope);
                            }
                        } else if (posZ > backZ + 20) {
                            // 心房囊袋/靜脈深部受逆流波及，血液受阻倒退
                            targetVz = +(3.0 * pulseEnvelope);
                        } else {
                            // 心室前半部 (-16 ~ -4)：前向射血量折損
                            const chamberProgress = (posZ - frontZ) / (backZ - frontZ);
                            const speed = (2.5 + 5.5 * (1.0 - chamberProgress)) * pulseEnvelope;
                            targetVz = -speed;
                        }
                    } else {
                        // 後瓣膜正常緊密閉合：
                        // 心室內部 (-16 ~ +16) 與右側下游 (z < -16) 的血液全部受壓向右 (-Z) 強勁噴出！
                        if (posZ <= backZ) {
                            const chamberProgress = posZ > frontZ
                                ? (backZ - posZ) / (backZ - frontZ)
                                : 1.0;
                            const speed = (6.0 + 13.5 * chamberProgress) * pulseEnvelope;
                            targetVz = -speed;
                        } else if (atriumEnabled) {
                            // 心房囊袋已開啟：上游 (z > 44.5) 靜脈血快速流入心房囊袋；囊袋內 (16 < z <= 44.5) 緩速匯聚儲血！
                            if (posZ > atriumZMax) {
                                targetVz = -9.5 * pulseEnvelope;
                            } else {
                                // 越靠近關閉的後瓣膜 (+16)，流速越平緩，讓血球舒適儲存在膨大的心房囊袋中
                                const pouchProgress = (posZ - backZ) / atriumLength; // 0 (在 backZ) ~ 1 (在囊袋入口)
                                targetVz = -(1.5 + 6.5 * pouchProgress) * pulseEnvelope;
                            }
                        } else {
                            // 無心房囊袋：上游靜脈血液僅能平緩向右 (-Z) 推進
                            targetVz = -3.8 * pulseEnvelope;
                        }
                    }
                } else {
                    // 無後瓣膜：壓縮時血液從中央 (z = 0) 向左右兩端分流擠出
                    if (posZ < 0) {
                        const factor = Math.min(1.0, Math.abs(posZ) / 12 + 0.25);
                        targetVz = -14.0 * factor * pulseEnvelope;
                    } else {
                        const factor = Math.min(1.0, Math.abs(posZ) / 12 + 0.25);
                        targetVz = +14.0 * factor * pulseEnvelope;
                    }
                }
            } else if (vesselState === 'expand') {
                // 【擴張心室 / 心室舒張期】
                // 若開啟心房囊袋（靜脈竇），規律搏動時囊袋彈性回縮提供 1.38 倍額外注血推力 (Atrial Kick)；心律不整時房室失調失去增幅
                const atrialBoost = (atriumEnabled && posZ >= centralSectionZ && posZ <= atriumZMax + 4)
                    ? (irregularCompressEnabled ? 0.85 : 1.38)
                    : 1.0;

                if (frontValveEnabled) {
                    if (regurgitationEnabled) {
                        // 動脈瓣關閉不全 (Aortic Regurgitation):
                        // 舒張期動脈內高壓血液經由未閉合的動脈瓣孔徑劇烈倒灌回低壓心室 (+Z 方向)
                        if (posZ <= frontZ && posZ >= frontZ - 30) {
                            // 動脈近端：血液急速倒灌回心室 (水錘脈 / 舒張期逆流)
                            const leakFactor = Math.max(0.35, 1.0 - Math.abs(posZ - frontZ) / 30);
                            targetVz = +(13.5 * leakFactor) * pulseEnvelope;
                        } else if (posZ < frontZ - 30) {
                            // 動脈遠端：前向動能驟失停滯
                            targetVz = +0.5 * pulseEnvelope;
                        } else if (posZ > frontZ && posZ <= 0) {
                            // 心室流出道：倒灌血液湧入心室前端
                            targetVz = +(6.5 * (1.0 - (posZ - frontZ) / 16)) * pulseEnvelope;
                        } else {
                            // 心室後部與心房：從左向右充血
                            const distToFront = Math.max(0, posZ - frontZ);
                            const fillFactor = Math.min(1.0, distToFront / 10 + 0.35);
                            targetVz = -11.0 * fillFactor * atrialBoost * pulseEnvelope;
                        }
                    } else {
                        // 前瓣膜正常緊密阻擋下游血液倒流：
                        if (posZ >= frontZ) {
                            const distToFront = Math.max(0, posZ - frontZ);
                            const fillFactor = Math.min(1.0, distToFront / 10 + 0.35);
                            targetVz = -15.0 * fillFactor * atrialBoost * pulseEnvelope;
                        } else {
                            targetVz = -4.5 * pulseEnvelope;
                        }
                    }
                } else {
                    // 無前瓣膜：擴張時右側下游 (z < 0) 血液倒流吸回腔室
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

            // 動脈脈搏波推力：當脈搏波通過時，賦予下游血球更澎湃同步的動脈射血脈衝流速！
            if (posZ < -halfCompressionLength - 1) {
                for (let w = 0; w < arterialPulseWaves.length; w++) {
                    const wave = arterialPulseWaves[w];
                    const dist = posZ - wave.z;
                    if (Math.abs(dist) < wave.width * 1.8) {
                        const pushFactor = Math.exp(-(dist * dist) / (wave.width * wave.width));
                        targetVz -= wave.amplitude * pushFactor * 10.5;
                    }
                }
            }

            // 平滑更新粒子的軸向速度（在平時 normal 狀態自然減速靜止，不人為分區聚簇）
            if (vesselState === 'normal') {
                p.body.velocity.z *= 0.94;
            } else {
                p.body.velocity.z += (targetVz - p.body.velocity.z) * 0.18;
            }
        }
    }

    // 單向瓣膜物理約束、管壁徑向約束、以及左右兩端無限循環補血
    function updateValves() {
        const hasFront = frontValveEnabled;
        const hasBack = backValveEnabled;
        const frontZ = -halfCompressionLength - 1; // -16
        const backZ = halfCompressionLength + 1;   // +16

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const pos = p.body.position;
            const vel = p.body.velocity;

            // 1. 動態管壁徑向約束（在中央壓縮區會隨血管收縮真正將血球往軸心擠壓）
            const localTubeRadius = getEffectiveTubeRadiusAtZ(pos.z);
            const maxAllowedR = Math.max(particleRadius * 1.1, localTubeRadius - particleRadius * 0.9);
            const rSq = pos.x * pos.x + pos.y * pos.y;

            if (rSq > maxAllowedR * maxAllowedR) {
                const r = Math.sqrt(rSq);
                const scale = maxAllowedR / r;
                pos.x *= scale;
                pos.y *= scale;
                // 將向外衝撞管壁的速度分量平滑導回管內
                const nx = pos.x / maxAllowedR;
                const ny = pos.y / maxAllowedR;
                const radialVel = vel.x * nx + vel.y * ny;
                if (radialVel > 0) {
                    vel.x -= radialVel * nx * 1.2;
                    vel.y -= radialVel * ny * 1.2;
                }
            }

            // 2. 單向瓣膜物理阻擋判定（順流 -Z 完全暢通，逆流 +Z 精準阻擋且不塞車）
            // 後瓣膜 (backZ = +16)：阻擋粒子從腔室 (z <= backZ) 向左逆流 (+Z) 穿過 backZ
            if (hasBack) {
                if (pos.z <= backZ && pos.z > backZ - 4.0 && vel.z > 0) {
                    // 若開啟瓣膜關閉不全，中央孔隙區 (r < 2.5) 允許血球向後逆流漏失，不予阻擋！
                    const rSq = pos.x * pos.x + pos.y * pos.y;
                    const isLeakingThrough = regurgitationEnabled && (rSq < 2.5 * 2.5);
                    if (!isLeakingThrough) {
                        vel.z = -Math.abs(vel.z) * 0.15; // 柔和反彈，避免卡死在平面上
                        if (pos.z > backZ - 0.3) {
                            pos.z = backZ - 0.3 - Math.random() * 0.8;
                        }
                    }
                }
            }

            // 前瓣膜 (frontZ = -16)：阻擋粒子從下游 (z <= frontZ) 向左逆流 (+Z) 穿過 frontZ
            if (hasFront) {
                if (pos.z <= frontZ && pos.z > frontZ - 4.0 && vel.z > 0) {
                    // 若開啟瓣膜關閉不全，中央孔隙區 (r < 2.5) 允許血球向左倒灌回心室！
                    const rSq = pos.x * pos.x + pos.y * pos.y;
                    const isLeakingThrough = regurgitationEnabled && (rSq < 2.5 * 2.5);
                    if (!isLeakingThrough) {
                        vel.z = -Math.abs(vel.z) * 0.15;
                        if (pos.z > frontZ - 0.3) {
                            pos.z = frontZ - 0.3 - Math.random() * 0.8;
                        }
                    }
                }
            }

            // 3. 邊界循環機制：右側 (-Z) 離開血管的血球消失，立即在左側 (+Z) 入口補上！
            if (pos.z < -halfTubeLength) {
                const overflow = -halfTubeLength - pos.z;
                pos.z = halfTubeLength - (overflow % 4.0) - Math.random() * 1.5;
                const { x, y } = randomCrossSectionXY(tubeRadius);
                pos.x = x;
                pos.y = y;
                vel.x *= 0.2;
                vel.y *= 0.2;
            } else if (pos.z > halfTubeLength) {
                // 若在無後瓣膜時有血球從左側 (+Z) 逆流溢出，則循環補回右側末端，保持血管內血球總數守恆
                const overflow = pos.z - halfTubeLength;
                pos.z = -halfTubeLength + (overflow % 4.0) + Math.random() * 1.5;
                const { x, y } = randomCrossSectionXY(tubeRadius);
                pos.x = x;
                pos.y = y;
                vel.x *= 0.2;
                vel.y *= 0.2;
            }
        }
    }

    // 動態解剖瓣膜開闔動畫與即時狀態顯示：順流 (-Z) 時向外張開，逆流或靜止時緊密閉合
    function updateValveFlapAnimation(valveMesh, valveZ, valveType) {
        if (!valveMesh || !valveMesh.userData || !valveMesh.userData.topPivot) return;
        const { topPivot, bottomPivot } = valveMesh.userData;

        // 計算瓣膜附近的血液淨流速 (-Z 為正值順流，+Z 為負值逆流)
        let netForwardFlow = 0;
        let count = 0;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const dz = p.body.position.z - valveZ;
            if (Math.abs(dz) < 9) {
                count++;
                netForwardFlow += -p.body.velocity.z;
            }
        }

        const avgForwardFlow = count > 0 ? (netForwardFlow / count) : 0;

        // 結合流體速度與搏動周期決定瓣膜張開程度
        let targetOpen = 0;
        let isRegurgitating = false;

        if (valveType === 'front' && vesselState === 'expand') {
            // 舒張擴張時，動脈瓣應受下游逆壓迅速緊閉；若關閉不全則無法閉合
            if (regurgitationEnabled) {
                targetOpen = 0.36; // 維持中央漏孔
                isRegurgitating = true;
            } else {
                targetOpen = 0.0;
            }
        } else if (valveType === 'back' && vesselState === 'compress') {
            // 收縮壓縮時，後瓣膜應受腔室高壓迅速緊閉；若關閉不全則維持縫隙
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

        // 開啟時平滑自然，閉合時果斷迅速（防止倒流生理特性）
        const smoothing = targetOpen > valveMesh.userData.currentOpen ? 0.22 : 0.38;
        valveMesh.userData.currentOpen += (targetOpen - valveMesh.userData.currentOpen) * smoothing;

        const restAngle = 0.18; // 緊密貼合角
        const maxTilt = 0.65;   // 最大開啟角

        // 瓣膜關閉不全受高速逆流衝擊時，瓣葉伴隨病理性撲動震顫 (Valvular Fluttering)
        const regurgFlutter = isRegurgitating ? Math.sin(phaseTimer * 46.0) * 0.07 : 0;

        topPivot.rotation.x = restAngle + (valveMesh.userData.currentOpen + regurgFlutter) * maxTilt;
        bottomPivot.rotation.x = -restAngle - (valveMesh.userData.currentOpen + regurgFlutter) * maxTilt;

        // 同步更新左上角資訊面板的瓣膜即時開闔狀態
        const isOpen = valveMesh.userData.currentOpen > 0.22;
        if (valveType === 'front' && frontValveStatus) {
            if (isRegurgitating) {
                frontValveStatus.textContent = '❌ 關閉不全 (舒張期倒灌)';
                frontValveStatus.className = 'status-badge status-warn';
            } else {
                frontValveStatus.textContent = isOpen ? '開啟導通 (順流 →)' : '閉合阻擋 (防倒流)';
                frontValveStatus.className = isOpen ? 'status-badge status-on' : 'status-badge status-neutral';
            }
        } else if (valveType === 'back' && backValveStatus) {
            if (isRegurgitating) {
                backValveStatus.textContent = '❌ 關閉不全 (收縮期逆流)';
                backValveStatus.className = 'status-badge status-warn';
            } else {
                backValveStatus.textContent = isOpen ? '開啟導通 (吸入 →)' : '閉合阻擋 (防逆流)';
                backValveStatus.className = isOpen ? 'status-badge status-on' : 'status-badge status-neutral';
            }
        }
    }

    // 將 3D 解剖位置投影至 2D 螢幕座標，更新大字構造標籤位置
    function positionSingleLabel(el, x, y, z, isActive) {
        if (!el) return;
        tempProjVec.set(x, y, z);
        tempProjVec.project(camera);

        // 若在攝影機視野後方則隱藏
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

    function updateAnatomicalLabels() {
        if (!labelsVisible) return;
        const frontZ = -halfCompressionLength - 1; // -16 動脈瓣
        const backZ = halfCompressionLength + 1;   // +16 房室瓣
        const atriumR = getEffectiveTubeRadiusAtZ(atriumCenterZ);
        const ventR = getEffectiveTubeRadiusAtZ(centralSectionZ);
        const arteryR = getEffectiveTubeRadiusAtZ(arteryCenterZ);

        // 上排標籤 (anat-label-top，引線向下)：
        // 1. 靜脈 (z = +62)、2. 心室 (z = 0)、3. 動脈 (z = -50.5)
        // 只有在安裝瓣膜建立單向循環時，兩端才分化出動脈與靜脈；無瓣膜時維持未分化心管
        const hasCirculation = frontValveEnabled || backValveEnabled || atriumEnabled;
        positionSingleLabel(labelVein, 0, tubeRadius + 4.2, 62, hasCirculation);
        positionSingleLabel(labelVentricle, 0, ventR + 4.2, centralSectionZ, true);
        positionSingleLabel(labelArtery, 0, arteryR + 4.2, arteryCenterZ, hasCirculation);

        // 下排標籤 (anat-label-bottom，引線向上)：
        // 4. 心房 (z = +30.5)、5. 房室瓣 (z = +16)、6. 動脈瓣 (z = -16)
        positionSingleLabel(labelAtrium, 0, -(atriumR + 4.2), atriumCenterZ, atriumEnabled);
        positionSingleLabel(labelAvValve, 0, -(tubeRadius + 4.2), backZ, backValveEnabled);
        positionSingleLabel(labelArterialValve, 0, -(tubeRadius + 4.2), frontZ, frontValveEnabled);
    }

    function resetCamera() {
        camera.position.set(58, 42, 0);
        camera.up.set(0, 1, 0);
        camera.lookAt(0, 0, 0);
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

        if (frontValveEnabled && frontValveMeshes.length > 0 && frontValveBodies.length > 0) {
            updateValveFlapAnimation(frontValveMeshes[0], frontValveBodies[0].position.z, 'front');
        }
        if (backValveEnabled && backValveMeshes.length > 0 && backValveBodies.length > 0) {
            updateValveFlapAnimation(backValveMeshes[0], backValveBodies[0].position.z, 'back');
        }

        if (labelsVisible) {
            updateAnatomicalLabels();
        }

        renderer.render(scene, camera);
    }

    // 初始狀態設定
    init();
    setVesselPhase('normal');
    animate(performance.now());
};
