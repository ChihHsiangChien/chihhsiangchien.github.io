class GraphicsEngine {
    constructor(container, onExplodeCallback, markRaw) {
        this.container = container;
        this.onExplodeCallback = onExplodeCallback;
        this.markRaw = markRaw; // Vue's markRaw for performance

        // Scene objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Visual elements
        this.visualBuildings = []; // { id, mesh }
        this.trees = [];
        this.missiles = [];
        this.explosions = [];
        this.particles = [];
        this.coordinateLabels = [];
        this.targetPreviewGroup = null;

        this.animationId = null;
    }

    init() {
        console.log('Initializing GraphicsEngine...');
        if (!this.container) {
            console.error("Container not provided to GraphicsEngine.");
            return;
        }

        this.scene = this.markRaw(new THREE.Scene());
        this.scene.background = new THREE.Color(0x87CEEB);

        this.camera = this.markRaw(new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000));
        this.camera.position.set(0, -20, 20);
        this.camera.up.set(0, 0, 1);
        this.camera.lookAt(0, 0, 0);

        this.renderer = this.markRaw(new THREE.WebGLRenderer({ antialias: true }));
        this.renderer.setSize(800, 600);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = this.markRaw(new THREE.OrbitControls(this.camera, this.renderer.domElement));
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.1;
            this.controls.minDistance = 5;
            this.controls.maxDistance = 100;
            this.controls.minPolarAngle = 0.1;
            this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
        }

        this._setupLighting();
        this._createTerrain();
        this._createGrid();
        this._createLaunchPad();
        this._createCoordinateLabels();

        this.animate();
        console.log('GraphicsEngine initialized.');
    }

    resetScene(buildingsData, treesData) {
        // Clear old visual objects
        [...this.visualBuildings, ...this.trees, ...this.missiles, ...this.explosions, ...this.particles].forEach(obj => {
            if (obj.mesh) this.scene.remove(obj.mesh);
            if (obj.trailLine) this.scene.remove(obj.trailLine);
        });
        this.clearTargetPreview();

        this.visualBuildings = [];
        this.trees = [];
        this.missiles = [];
        this.explosions = [];
        this.particles = [];

        this._createScene(buildingsData, treesData);
    }

    _createScene(buildingsData, treesData) {
        // Create buildings
        buildingsData.forEach(building => {
            const geometry = new THREE.BoxGeometry(1, 1, building.height);
            const material = new THREE.MeshLambertMaterial({ color: building.color });
            const mesh = this.markRaw(new THREE.Mesh(geometry, material));
            mesh.position.set(building.x, building.y, building.height / 2);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.visualBuildings.push({ id: building.id, mesh: mesh });
        });

        // Create trees
        treesData.forEach(tree => {
            this._createTree(tree.x, tree.y, tree.id);
        });
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();

        this._updateMissiles();
        this._updateExplosions();
        this._updateParticles();

        if (this.renderer) this.renderer.render(this.scene, this.camera);
    }

    // --- Public Methods for Game Logic to Call ---

    showTargetPreview(targetRegion) {
        this.clearTargetPreview();
        if (targetRegion.length === 0) return;

        this.targetPreviewGroup = this.markRaw(new THREE.Group());
        targetRegion.forEach(point => {
            const geometry = new THREE.PlaneGeometry(0.8, 0.8);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
            const plane = new THREE.Mesh(geometry, material);
            plane.position.set(point.x, point.y, 0.02);
            this.targetPreviewGroup.add(plane);
        });
        this.scene.add(this.targetPreviewGroup);
    }

    clearTargetPreview() {
        if (this.targetPreviewGroup) {
            this.scene.remove(this.targetPreviewGroup);
            this.targetPreviewGroup = null;
        }
    }

    launchAnimatedMissile(targetX, targetY, isAdvanced, explosionRadius) {
        // 根據飛彈類型決定視覺大小
        const visualRadius = isAdvanced ? 0.35 : 0.2;
        const geometry = new THREE.SphereGeometry(visualRadius, 8, 6);
        
        // 將兩種飛彈的顏色統一
        const missileColor = 0xff4444; // 紅色
        const emissiveColor = 0x220000; // 微弱的自發光
        const material = new THREE.MeshLambertMaterial({ color: missileColor, emissive: emissiveColor });
        const mesh = this.markRaw(new THREE.Mesh(geometry, material));
        mesh.position.set(10, -10, 0.5);
        this.scene.add(mesh);

        const trailGeometry = new THREE.BufferGeometry();
        trailGeometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(30 * 3), 3));
        const trailMaterial = new THREE.LineBasicMaterial({ color: missileColor, transparent: true, opacity: 0.6 });
        const trailLine = this.markRaw(new THREE.Line(trailGeometry, trailMaterial));
        trailLine.geometry.setDrawRange(0, 0);
        this.scene.add(trailLine);

        this.missiles.push({
            mesh, trailLine, trail: [],
            startX: 10, startY: -10, startZ: 0.5, targetX, targetY, targetZ: 0.5,
            isAdvanced, startTime: Date.now(), flightTime: 3000,
            explosionRadius: explosionRadius // 直接使用傳入的轟炸半徑
        });
    }

    destroyBuilding(buildingId) {
        const buildingVisual = this.visualBuildings.find(b => b.id === buildingId);
        if (buildingVisual && !buildingVisual.isDestroying) {
            buildingVisual.isDestroying = true;
            buildingVisual.mesh.material.color.setRGB(0.4, 0.4, 0.4);

            const animate = () => {
                const currentScale = buildingVisual.mesh.scale.x * 0.98;
                buildingVisual.mesh.scale.set(currentScale, currentScale, currentScale);
                buildingVisual.mesh.rotation.y += 0.1;

                if (buildingVisual.mesh.scale.x > 0.1) {
                    requestAnimationFrame(animate);
                } else {
                    this.scene.remove(buildingVisual.mesh);
                }
            };
            animate();
        }
    }

    destroyTree(treeId) {
        const treeVisualIndex = this.trees.findIndex(t => t.id === treeId);
        if (treeVisualIndex === -1) return;

        const treeVisual = this.trees[treeVisualIndex];
        if (treeVisual.isDestroying) return;

        treeVisual.isDestroying = true;
        const position = treeVisual.mesh.position;

        // Remove the original tree mesh
        this.scene.remove(treeVisual.mesh);
        this.trees.splice(treeVisualIndex, 1); // 從陣列中移除，避免重複處理

        // 創建木頭和樹葉粒子
        for (let i = 0; i < 20; i++) { // 樹幹粒子
            this._createTreeParticle(position.x, position.y, position.z + 0.5 + (Math.random() - 0.5), 0x8B4513);
        }
        for (let i = 0; i < 30; i++) { // 樹葉粒子
            this._createTreeParticle(position.x, position.y, position.z + 1.5 + (Math.random() - 0.5) * 1.6, 0x228B22);
        }
    }

    // --- Internal Update and Creation Methods ---

    _updateMissiles() {
        const currentTime = Date.now();
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];
            const progress = Math.min(1, (currentTime - missile.startTime) / missile.flightTime);

            if (progress >= 1) {
                this._createExplosion(missile.targetX, missile.targetY, missile.targetZ, missile.explosionRadius);
                if (this.onExplodeCallback) {
                    this.onExplodeCallback({ x: missile.targetX, y: missile.targetY, radius: missile.explosionRadius });
                }
                this.scene.remove(missile.mesh);
                this.scene.remove(missile.trailLine);
                this.missiles.splice(i, 1);
            } else {
                const height = 8 * Math.sin(Math.PI * progress);
                const x = missile.startX + (missile.targetX - missile.startX) * progress;
                const y = missile.startY + (missile.targetY - missile.startY) * progress;
                const z = missile.startZ + height;
                missile.mesh.position.set(x, y, z);

                missile.trail.push(new THREE.Vector3(x, y, z));
                if (missile.trail.length > 30) missile.trail.shift();

                const positions = missile.trailLine.geometry.attributes.position.array;
                missile.trail.forEach((p, j) => p.toArray(positions, j * 3));
                missile.trailLine.geometry.attributes.position.needsUpdate = true;
                missile.trailLine.geometry.setDrawRange(0, missile.trail.length);

                if (Math.random() < 0.3) this._createSmokeParticle(x, y, z);
            }
        }
    }

    _createExplosion(x, y, z, radius) {
        const explosionGeometry = new THREE.SphereGeometry(0.1, 16, 12);
        const explosionMaterial = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8 });
        const explosionMesh = this.markRaw(new THREE.Mesh(explosionGeometry, explosionMaterial));
        explosionMesh.position.set(x, y, z);
        this.scene.add(explosionMesh);

        this.explosions.push({
            mesh: explosionMesh, material: explosionMaterial,
            life: 60, maxLife: 60,
        });

        for (let i = 0; i < 50; i++) {
            this._createExplosionParticle(x, y, z, radius);
        }
    }

    _updateExplosions() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.life--;
            const scale = 1 + (1 - explosion.life / explosion.maxLife) * 10;
            explosion.mesh.scale.set(scale, scale, scale);
            explosion.material.opacity = Math.max(0, explosion.life / explosion.maxLife);

            if (explosion.life <= 0) {
                this.scene.remove(explosion.mesh);
                this.explosions.splice(i, 1);
            }
        }
    }

    _createExplosionParticle(x, y, z, radius) {
        const particleGeometry = new THREE.SphereGeometry(0.05, 6, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(Math.random() * 0.1, 1, 0.5), transparent: true });
        const particleMesh = this.markRaw(new THREE.Mesh(particleGeometry, particleMaterial));
        particleMesh.position.set(x + (Math.random() - 0.5) * radius, y + Math.random() * radius, z + (Math.random() - 0.5) * radius);
        this.scene.add(particleMesh);

        this.particles.push({
            mesh: particleMesh, material: particleMaterial,
            vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, vz: Math.random() * 0.1,
            life: 90, maxLife: 90
        });
    }

    _createTreeParticle(x, y, z, color) {
        const particleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1); // 使用小方塊模擬碎片
        const particleMaterial = new THREE.MeshBasicMaterial({ color: color });
        const particleMesh = this.markRaw(new THREE.Mesh(particleGeometry, particleMaterial));
        particleMesh.position.set(x, y, z);
        this.scene.add(particleMesh);

        this.particles.push({
            mesh: particleMesh, material: particleMaterial,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            vz: (Math.random() - 0.5) * 0.2 + 0.1, // 輕微向上彈出
            life: 120, maxLife: 120
        });
    }

    _createSmokeParticle(x, y, z) {
        const particleGeometry = new THREE.SphereGeometry(0.03, 6, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.6 });
        const particleMesh = this.markRaw(new THREE.Mesh(particleGeometry, particleMaterial));
        particleMesh.position.set(x + (Math.random() - 0.5) * 0.2, y + (Math.random() - 0.5) * 0.2, z + (Math.random() - 0.5) * 0.2);
        this.scene.add(particleMesh);

        this.particles.push({
            mesh: particleMesh, material: particleMaterial,
            vx: (Math.random() - 0.5) * 0.02, vy: (Math.random() - 0.5) * 0.02, vz: Math.random() * 0.01,
            life: 60, maxLife: 60
        });
    }

    _updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.x += p.vx;
            p.mesh.position.y += p.vy;
            p.mesh.position.z += p.vz;
            p.vz -= 0.002; // Gravity
            p.life--;
            p.material.opacity = Math.max(0, p.life / p.maxLife);

            if (p.life <= 0 || p.mesh.position.z < 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }
    }

    // --- Internal Setup Methods ---

    _setupLighting() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const light = new THREE.DirectionalLight(0xffffff, 0.8);
        light.position.set(50, 50, 50);
        light.castShadow = true;
        light.shadow.mapSize.set(2048, 2048);
        this.scene.add(light);
    }

    _createTerrain() {
        const planeGeometry = new THREE.PlaneGeometry(24, 24);
        const planeMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22, transparent: true, opacity: 0.8 });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.position.z = -0.01;
        plane.receiveShadow = true;
        this.scene.add(plane);
    }

    _createGrid() {
        const gridHelper = this.markRaw(new THREE.GridHelper(20, 20, 0x444444, 0x888888));
        gridHelper.rotation.x = Math.PI / 2;
        gridHelper.position.z = 0.01;
        this.scene.add(gridHelper);
    }

    _createLaunchPad() {
        const padGeometry = new THREE.CylinderGeometry(1, 1, 0.2, 32);
        const padMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const launchPad = this.markRaw(new THREE.Mesh(padGeometry, padMaterial));
        launchPad.position.set(10, -10, 0.1);
        launchPad.rotation.x = Math.PI / 2;
        launchPad.receiveShadow = true;
        this.scene.add(launchPad);

        const ringGeometry = new THREE.RingGeometry(0.8, 1, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
        const ring = this.markRaw(new THREE.Mesh(ringGeometry, ringMaterial));
        ring.position.set(10, -10, 0.21);
        this.scene.add(ring);
    }

    _createCoordinateLabels() {
        this.coordinateLabels.forEach(label => this.scene.remove(label));
        this.coordinateLabels = [];

        this._createAxisLabel('X', new THREE.Vector3(11, 0.1, 0.1), 'rgba(200, 0, 0, 0.8)', { fontSize: 64, scale: 3 });
        this._createAxisLabel('Y', new THREE.Vector3(0.1, 11, 0.1), 'rgba(0, 0, 180, 0.8)', { fontSize: 64, scale: 3 });

        for (let i = -10; i <= 10; i += 2) {
            if (i !== 0) {
                this._createAxisLabel(i.toString(), new THREE.Vector3(i, 0.5, 0.1), 'rgba(0, 0, 0, 0.7)', { fontSize: 48, scale: 1.5 });
                this._createAxisLabel(i.toString(), new THREE.Vector3(0.5, i, 0.1), 'rgba(0, 0, 0, 0.7)', { fontSize: 48, scale: 1.5 });
            }
        }
        this._createAxisLabel('0', new THREE.Vector3(-0.3, -0.3, 0.1), 'rgba(0, 0, 0, 0.7)', { fontSize: 48, scale: 1.5 });
    }

    _createAxisLabel(text, position, color, { fontSize = 48, scale = 2 } = {}) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const font = `Bold ${fontSize}px Arial`;
        context.font = font;
        const metrics = context.measureText(text);
        canvas.width = metrics.width;
        canvas.height = fontSize;
        context.font = font;
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
        const sprite = this.markRaw(new THREE.Sprite(material));
        sprite.position.copy(position);
        const spriteScale = scale * (fontSize / 100);
        sprite.scale.set(spriteScale * (canvas.width / canvas.height), spriteScale, 1.0);
        this.scene.add(sprite);
        this.coordinateLabels.push(sprite);
    }

    _createTree(x, y, id) {
        const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = this.markRaw(new THREE.Mesh(trunkGeometry, trunkMaterial));
        trunk.position.set(0, 0, 0.5); // 相對於群組的位置
        trunk.rotation.x = Math.PI / 2; // 旋轉樹幹使其垂直
        trunk.castShadow = true;

        const leavesGeometry = new THREE.SphereGeometry(0.8, 8, 6);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const leaves = this.markRaw(new THREE.Mesh(leavesGeometry, leavesMaterial));
        leaves.position.set(0, 0, 1.5); // 相對於群組的位置
        leaves.castShadow = true;

        const treeGroup = this.markRaw(new THREE.Group());
        treeGroup.add(trunk);
        treeGroup.add(leaves);
        treeGroup.position.set(x, y, 0); // 在場景中設定群組的絕對位置

        this.scene.add(treeGroup);
        this.trees.push({ id: id, mesh: treeGroup });
    }
}