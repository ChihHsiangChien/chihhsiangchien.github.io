window.onload = function () {
    // Scene setup
    let renderer, scene, camera;
    let world;
    let particles = [];
    const particleCount = 200;
    const particleRadius = 0.5;
    const tubeRadius = 4;
    
    const compressionFactor = 0.2;
    const compressionSpeed = 0.5;
    const tubeLength = 200;      // 血管長度
    const compressionLength = 30; // 壓縮區長度
    const centralSectionZ = 0;

    const pulseImpulse = 20;
    // Physics bodies and meshes
    let frontValveBodies = [], backValveBodies = [];
    let frontValveMeshes = [], backValveMeshes = [];
    // 狀態: 'normal'（平時）、'compress'（壓縮）、'expand'（擴張）
    let vesselState = 'normal';
    let currentCompression = 0;
    let frontValveEnabled = false;
    let backValveEnabled = false;

    // Visual compression zone
    let compressionZoneMesh;

    // UI elements
    const toggleCompressBtn = document.getElementById('toggle-compress');
    const addFrontValveBtn = document.getElementById('add-front-valve');
    const removeFrontValveBtn = document.getElementById('remove-front-valve');
    const addBackValveBtn = document.getElementById('add-back-valve');
    const removeBackValveBtn = document.getElementById('remove-back-valve');
    const resetViewBtn = document.getElementById('reset-view');
    const frontValveStatus = document.getElementById('front-valve-status');
    const backValveStatus = document.getElementById('back-valve-status');

    function init() {
        // 渲染器
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x2c3e50);
        document.body.appendChild(renderer.domElement);

        // 場景
        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x2c3e50, 40, 120);

        // 攝影機
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(50, 50, 0);
        camera.lookAt(0, 0, 0);


        // 光源
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 20);
        scene.add(directionalLight);

        // 物理世界
        world = new CANNON.World();
        world.gravity.set(0, 0, 0);
        world.broadphase = new CANNON.NaiveBroadphase();
        world.solver.iterations = 10;

        // 創建血管（視覺效果）
        createTube();

        // 創建血球
        createParticles();

        // 鼠標/觸控控制
        initControls();

        // UI事件監聽器

        // 狀態切換按鈕
        toggleCompressBtn.addEventListener('click', () => {
            if (vesselState === 'normal' || vesselState === 'expand') {
                vesselState = 'compress';
                toggleCompressBtn.textContent = '擴張血管';
                toggleCompressBtn.classList.remove('btn-green');
                toggleCompressBtn.classList.add('btn-red');
            } else if (vesselState === 'compress') {
                vesselState = 'expand';
                toggleCompressBtn.textContent = '壓縮血管';
                toggleCompressBtn.classList.remove('btn-red');
                toggleCompressBtn.classList.add('btn-green');
            }
            // 狀態切換時，所有粒子的 hasPulsed 都設為 false
            particles.forEach(p => { p.hasPulsed = false; });
        });

        addFrontValveBtn.addEventListener('click', () => {
            if (!frontValveEnabled) {
                addValve('front');
            }
        });

        removeFrontValveBtn.addEventListener('click', () => {
            if (frontValveEnabled) {
                removeValve('front');
            }
        });

        addBackValveBtn.addEventListener('click', () => {
            if (!backValveEnabled) {
                addValve('back');
            }
        });

        removeBackValveBtn.addEventListener('click', () => {
            if (backValveEnabled) {
                removeValve('back');
            }
        });

        resetViewBtn.addEventListener('click', () => {
            resetCamera();
        });

        window.addEventListener('resize', onWindowResize);
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
            const sensitivity = 1;
            camera.position.setLength(camera.position.length() + delta * sensitivity);
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
        renderer.domElement.addEventListener('wheel', (e) => { e.preventDefault(); zoomCamera(e.deltaY > 0 ? 1 : -1); });

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
        });

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
        });
        renderer.domElement.addEventListener('touchend', () => { isDragging = false; });
    }

    function createTube() {
        const frontTubeLength = (tubeLength - compressionLength) / 2;
        const frontTubeGeometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, frontTubeLength, 32, 1, true);
        const frontTubeMaterial = new THREE.MeshBasicMaterial({ color: 0xecf0f1, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
        const frontTubeMesh = new THREE.Mesh(frontTubeGeometry, frontTubeMaterial);
        frontTubeMesh.rotation.x = Math.PI / 2; //原本沿 Y 軸的圓柱體被旋轉 90 度，改為沿 Z 軸延伸。        
        frontTubeMesh.position.z = - (compressionLength/2 + frontTubeLength/2);
        scene.add(frontTubeMesh);

        const backTubeLength = (tubeLength - compressionLength) / 2;
        const backTubeGeometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, backTubeLength, 32, 1, true);
        const backTubeMaterial = new THREE.MeshBasicMaterial({ color: 0xecf0f1, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
        const backTubeMesh = new THREE.Mesh(backTubeGeometry, backTubeMaterial);
        backTubeMesh.rotation.x = Math.PI / 2; 
        backTubeMesh.position.z = (compressionLength/2 + backTubeLength/2);
        scene.add(backTubeMesh);


        // 壓縮區域的視覺化效果
        const compressionGeometry = new THREE.CylinderGeometry(tubeRadius, tubeRadius, compressionLength, 32);
        const compressionMaterial = new THREE.MeshBasicMaterial({ color: 0x3498db, transparent: true, opacity: 0.5 });
        compressionZoneMesh = new THREE.Mesh(compressionGeometry, compressionMaterial);
        compressionZoneMesh.rotation.x = Math.PI / 2;
        compressionZoneMesh.position.z = centralSectionZ;
        scene.add(compressionZoneMesh);
    }

    function createParticles() {
        const particleGeometry = new THREE.SphereGeometry(particleRadius, 16, 16);
        const particleMaterial = new THREE.MeshLambertMaterial({ color: 0xe74c3c });

        for (let i = 0; i < particleCount; i++) {
            const randomAngle = Math.random() * Math.PI * 2;
            const randomRadius = Math.random() * (tubeRadius - particleRadius * 2);
            const x = Math.cos(randomAngle) * randomRadius * 0.5;
            const y = Math.sin(randomAngle) * randomRadius * 0.5;
            const z = (Math.random() - 0.5) * tubeLength * 1;

            const position = new THREE.Vector3(x, y, z);

            const particleMesh = new THREE.Mesh(particleGeometry, particleMaterial);
            particleMesh.position.copy(position);
            scene.add(particleMesh);

            const particleBody = new CANNON.Body({
                mass: 1,
                shape: new CANNON.Sphere(particleRadius),
                position: new CANNON.Vec3(position.x, position.y, position.z),
                linearDamping: 0.95, // 增加阻尼，防止衝太遠
                angularDamping: 0.95,
            });

            world.addBody(particleBody);
            // 增加一個 hasPulsed 屬性，記錄是否已給過中心脈衝
            particles.push({ mesh: particleMesh, body: particleBody, hasPulsed: false });
        }
    }
    
    function createValve(position) {
        const valveSize = tubeRadius * 2;
        // 讓瓣膜顏色明顯
        const leafMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000, transparent: false, opacity: 1 });
        const leafGeometry = new THREE.BoxGeometry(tubeRadius * 1.5, valveSize * 0.7, 0.2);
        // 單片瓣膜
        const valveLeaf = new THREE.Mesh(leafGeometry, leafMaterial);
        // 物理剛體：薄片，橫跨血管
        const valveBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3((tubeRadius * 1.5) / 2, (valveSize * 0.7) / 2, 0.1)),
            collisionFilterGroup: 2,
            collisionFilterMask: 1 // 只與血球碰撞
        });
        let zPos;
        if (position === 'front') {
            zPos = -compressionLength / 2 - 1;
            valveLeaf.position.set(0, 0, zPos);
            valveBody.position.set(0, 0, zPos);
            frontValveMeshes.push(valveLeaf);
            frontValveBodies.push(valveBody);
        } else if (position === 'back') {
            zPos = compressionLength / 2 + 1;
            valveLeaf.position.set(0, 0, zPos);
            valveBody.position.set(0, 0, zPos);
            backValveMeshes.push(valveLeaf);
            backValveBodies.push(valveBody);
        }
        scene.add(valveLeaf);
        world.addBody(valveBody);
    }
    
    function addValve(position) {
        if (position === 'front' && !frontValveEnabled) {
            createValve('front');
            frontValveEnabled = true;
            frontValveStatus.textContent = "開啟";
            frontValveStatus.classList.remove('status-off');
            frontValveStatus.classList.add('status-on');
            addFrontValveBtn.classList.add('hidden');
            removeFrontValveBtn.classList.remove('hidden');
        } else if (position === 'back' && !backValveEnabled) {
            createValve('back');
            backValveEnabled = true;
            backValveStatus.textContent = "開啟";
            backValveStatus.classList.remove('status-off');
            backValveStatus.classList.add('status-on');
            addBackValveBtn.classList.add('hidden');
            removeBackValveBtn.classList.remove('hidden');
        }
    }

    function removeValve(position) {
        if (position === 'front' && frontValveEnabled) {
            frontValveMeshes.forEach(m => scene.remove(m));
            frontValveBodies.forEach(b => world.removeBody(b));
            frontValveMeshes = [];
            frontValveBodies = [];
            frontValveEnabled = false;
            frontValveStatus.textContent = "關閉";
            frontValveStatus.classList.remove('status-on');
            frontValveStatus.classList.add('status-off');
            addFrontValveBtn.classList.remove('hidden');
            removeFrontValveBtn.classList.add('hidden');
        } else if (position === 'back' && backValveEnabled) {
            backValveMeshes.forEach(m => scene.remove(m));
            backValveBodies.forEach(b => world.removeBody(b));
            backValveMeshes = [];
            backValveBodies = [];
            backValveEnabled = false;
            backValveStatus.textContent = "關閉";
            backValveStatus.classList.remove('status-on');
            backValveStatus.classList.add('status-off');
            addBackValveBtn.classList.remove('hidden');
            removeBackValveBtn.classList.add('hidden');
        }
    }
    
    function updateCompression() {
        // 根據壓縮/擴張狀態動態改變壓縮區的半徑（只縮放x/y，不影響長度z）
        let currentTubeRadius = tubeRadius;
        if (vesselState === 'compress') {
            currentCompression = Math.min(1, currentCompression + compressionSpeed);
            currentTubeRadius = tubeRadius * (1 - currentCompression * compressionFactor); // 壓縮時縮小半徑
        } else if (vesselState === 'expand') {
            currentCompression = Math.max(-1, currentCompression - compressionSpeed);
            currentTubeRadius = tubeRadius * (1 + Math.abs(currentCompression) * compressionFactor); // 擴張時放大半徑
        } else { // normal
            // 回到正常狀態時，逐漸恢復到原始半徑
            if (currentCompression > 0) {
                currentCompression = Math.max(0, currentCompression - compressionSpeed * 2);
            } else if (currentCompression < 0) {
                currentCompression = Math.min(0, currentCompression + compressionSpeed * 2);
            }
            currentTubeRadius = tubeRadius * (1 - currentCompression * compressionFactor);
        }
        compressionZoneMesh.scale.x = currentTubeRadius / tubeRadius;
        compressionZoneMesh.scale.y = 1;  //這是血管軸
        compressionZoneMesh.scale.z = currentTubeRadius / tubeRadius; // 長度不變
        if (vesselState === 'compress' || vesselState === 'expand') {
            particles.forEach(p => {
                const posZ = p.body.position.z;
                if (!p.hasPulsed) {
                    if (vesselState === 'compress') {
                        // 壓縮時，只給一次 impulse
                        let impulse;
                        if (posZ > 0) {
                            impulse = new CANNON.Vec3(0, 0, pulseImpulse);
                        } else if (posZ < 0) {
                            impulse = new CANNON.Vec3(0, 0, -pulseImpulse);
                        } else {
                            impulse = new CANNON.Vec3(0, 0, (Math.random() > 0.5 ? 1 : -1) * pulseImpulse);
                        }
                        p.body.applyImpulse(impulse, p.body.position);
                    } else if (vesselState === 'expand') {
                        // 擴張時，只給一次初始速度
                        if (posZ > 0) {
                            p.body.velocity.z = -pulseImpulse;
                        } else if (posZ < 0) {
                            p.body.velocity.z = pulseImpulse;
                        } else {
                            p.body.velocity.z = (Math.random() > 0.5 ? 1 : -1) * pulseImpulse;
                        }
                    }
                    p.hasPulsed = true;
                }
            });
        }
        // normal 狀態不施加任何力
    }
    
    function updateValves() {
        particles.forEach(p => {
            // 確保血球被限制在血管內部
            const r = Math.sqrt(p.body.position.x**2 + p.body.position.y**2);
            if (r > tubeRadius) {
                const direction = new CANNON.Vec3(p.body.position.x, p.body.position.y, 0).unit();
                const normalForce = direction.scale(-1500);
                p.body.applyForce(normalForce, p.body.position);
            }
            // 單向閥物理：
            // z 減少（順流），z 增加是逆流
            // 前瓣膜zPos = -compressionLength / 2 - 1
            // 後瓣膜zPos = compressionLength / 2 + 1
            // particle的postion.z若在兩瓣膜之間，且velocity.z > 0 則後瓣膜阻擋             
            // particle的postion.z若在兩瓣膜之間，且velocity.z < 0 則前瓣膜阻擋
            if (frontValveEnabled && backValveEnabled && frontValveBodies.length > 0 && backValveBodies.length > 0) {
                const frontZ = frontValveBodies[0].position.z;
                const backZ = backValveBodies[0].position.z;
                // 在兩瓣膜之間
                if (p.body.position.z > frontZ && p.body.position.z < backZ) {
                    // 順流（z 減少）允許，逆流（z 增加）阻擋
                    if (p.body.velocity.z > 0) { // 逆流，阻擋於後瓣膜
                        p.body.velocity.z = 0;
                        p.body.position.z = backZ;
                    } else if (p.body.velocity.z < 0) { // 順流，檢查前瓣膜
                        // 不阻擋
                    }
                }
            } else if (frontValveEnabled && frontValveBodies.length > 0) {
                const frontZ = frontValveBodies[0].position.z;
                if (p.body.position.z > frontZ && p.body.velocity.z < 0) {
                    // 只裝前瓣膜時，z 減少（順流）允許，z 增加（逆流）不會進入這區間
                    // 不阻擋
                }
                if (p.body.position.z > frontZ && p.body.velocity.z > 0) {
                    // 逆流，阻擋於前瓣膜外側
                    p.body.velocity.z = 0;
                    p.body.position.z = frontZ;
                }
            } else if (backValveEnabled && backValveBodies.length > 0) {
                const backZ = backValveBodies[0].position.z;
                if (p.body.position.z < backZ && p.body.velocity.z > 0) {
                    // 逆流，阻擋於後瓣膜內側
                    p.body.velocity.z = 0;
                    p.body.position.z = backZ;
                }
            }
        });
    }
    
    function resetCamera() {
        camera.position.set(50, 50, 0);
        camera.lookAt(0, 0, 0);
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        requestAnimationFrame(animate);
        
        world.step(1/60);
        
        updateCompression();
        updateValves();

        particles.forEach(p => {
            p.mesh.position.copy(p.body.position);
            p.mesh.quaternion.copy(p.body.quaternion);
        });

        if (frontValveEnabled && frontValveMeshes.length > 0 && frontValveBodies.length > 0) {
            frontValveMeshes[0].position.copy(frontValveBodies[0].position);
            frontValveMeshes[0].quaternion.copy(frontValveBodies[0].quaternion);
        }
        if (backValveEnabled && backValveMeshes.length > 0 && backValveBodies.length > 0) {
            backValveMeshes[0].position.copy(backValveBodies[0].position);
            backValveMeshes[0].quaternion.copy(backValveBodies[0].quaternion);
        }

        renderer.render(scene, camera);
    }

    // 初始狀態為 normal
    vesselState = 'normal';
    toggleCompressBtn.textContent = '壓縮血管';
    toggleCompressBtn.classList.remove('btn-red', 'btn-green');
    toggleCompressBtn.classList.add('btn-blue');
    init();
    animate();
};