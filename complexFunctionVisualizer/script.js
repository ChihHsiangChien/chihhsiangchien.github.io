class ComplexFunctionVisualizer {
    constructor() {
        // Parameters for the complex function
        this.gamma = 0.5;  // decay rate (γ)
        this.t0 = 1.05;    // peak time (t₀)
        this.omega = 2 * Math.PI;  // angular frequency (ω)
        this.isRunning = false;
        this.time = 0;
        this.tMax = 10;    // Maximum time range
        this.timeDirection = 1;  // 1 for forward, -1 for reverse
        this.projectionSize = 2; // Size for projections to maintain consistency
        this.gridSize = 4;  // Size of the grid (should be 2 * projectionSize)
        this.gridDivisions = 20;  // Number of grid divisions
        
        // Initialize scenes and renderers
        this.initScenes();
        
        // Create visualization elements
        this.createVisualizationElements();
        
        // Setup event listeners
        this.setupEventListeners();
        this.createCurve();
        this.animate();
    }

    createVisualizationElements() {
        // Controls
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.timeSlider = document.getElementById('timeSlider');
        this.rotationSlider = document.getElementById('rotationSlider');
        
        // Create particle
        const sphereGeometry = new THREE.SphereGeometry(0.05, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xff3366 });
        this.particle = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.scene.add(this.particle);
        
        // Create projection particles
        this.xyParticle = new THREE.Mesh(sphereGeometry, sphereMaterial.clone());
        this.yzParticle = new THREE.Mesh(sphereGeometry, sphereMaterial.clone());
        this.xzParticle = new THREE.Mesh(sphereGeometry, sphereMaterial.clone());
        this.xyScene.add(this.xyParticle);
        this.yzScene.add(this.yzParticle);
        this.xzScene.add(this.xzParticle);
        
        // Create trail effect
        this.trailPoints = [];
        this.maxTrailPoints = 100;
        this.createTrail();
    }
    
    initScenes() {
        // Main 3D scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf8f0ff);
        this.camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('mainCanvas'),
            antialias: true
        });
        
        // Set up main camera
        this.camera.position.set(3, 2, 4);
        this.camera.lookAt(0, 0, 0);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        const pointLight = new THREE.PointLight(0xffffff, 0.8);
        pointLight.position.set(5, 5, 5);
        this.scene.add(ambientLight, pointLight);
        
        // Initialize projection scenes
        const projectionBackground = new THREE.Color(0xf8f0ff);
        
        // XY projection (Real-Imaginary plane)
        this.xyScene = new THREE.Scene();
        this.xyScene.background = projectionBackground;
        this.xyCamera = new THREE.OrthographicCamera(
            -this.projectionSize, 
            this.projectionSize, 
            this.projectionSize, 
            -this.projectionSize, 
            0.1, 
            10
        );
        this.xyRenderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('projectionXY'),
            antialias: true
        });
        this.xyCamera.position.set(0, 0, 5);
        this.xyCamera.lookAt(0, 0, 0);
        
        // YZ projection (Imaginary-Time plane)
        this.yzScene = new THREE.Scene();
        this.yzScene.background = projectionBackground;
        this.yzCamera = new THREE.OrthographicCamera(
            -this.projectionSize, 
            this.projectionSize, 
            this.projectionSize, 
            -this.projectionSize, 
            0.1, 
            10
        );
        this.yzRenderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('projectionYZ'),
            antialias: true
        });
        this.yzCamera.position.set(5, 0, 0);
        this.yzCamera.lookAt(0, 0, 0);
        this.yzCamera.up.set(0, 1, 0);
        
        // XZ projection (Real-Time plane)
        this.xzScene = new THREE.Scene();
        this.xzScene.background = projectionBackground;
        this.xzCamera = new THREE.OrthographicCamera(
            -this.projectionSize, 
            this.projectionSize, 
            this.projectionSize, 
            -this.projectionSize, 
            0.1, 
            10
        );
        this.xzRenderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('projectionXZ'),
            antialias: true
        });
        this.xzCamera.position.set(0, 5, 0);
        this.xzCamera.lookAt(0, 0, 0);
        this.xzCamera.up.set(1, 0, 0);
        
        // Add grids and axes
        this.setupGridsAndAxes();
    }

    setupGridsAndAxes() {
        // Add grid helpers with consistent size
        const mainGridHelper = new THREE.GridHelper(this.gridSize, this.gridDivisions, 0xcccccc, 0xcccccc);
        mainGridHelper.material.opacity = 0.3;
        mainGridHelper.material.transparent = true;
        this.scene.add(mainGridHelper);

        // Add custom grids for projections with consistent size
        this.addCustomGrid(this.xyScene, this.gridSize, this.gridDivisions, true);   // XY plane
        this.addCustomGrid(this.yzScene, this.gridSize, this.gridDivisions, false);  // YZ plane
        this.addCustomGrid(this.xzScene, this.gridSize, this.gridDivisions, false);  // XZ plane

        // Add axes with consistent length
        this.addAxesWithLabels(this.scene);
        this.addAxesWithLabels(this.xyScene, 'Re', 'Im');
        this.addAxesWithLabels(this.yzScene, 't', 'Im');
        this.addAxesWithLabels(this.xzScene, 'Re', 't');
    }

    addCustomGrid(scene, size, divisions, isXY) {
        // Create grid lines
        const gridGeometry = new THREE.BufferGeometry();
        const gridMaterial = new THREE.LineBasicMaterial({
            color: 0xcccccc,
            opacity: 0.3,
            transparent: true
        });

        const vertices = [];
        const step = size / divisions;

        // Vertical lines
        for (let i = -size/2; i <= size/2; i += step) {
            vertices.push(i, -size/2, 0);
            vertices.push(i, size/2, 0);
        }

        // Horizontal lines
        for (let i = -size/2; i <= size/2; i += step) {
            vertices.push(-size/2, i, 0);
            vertices.push(size/2, i, 0);
        }

        gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const grid = new THREE.LineSegments(gridGeometry, gridMaterial);

        if (!isXY) {
            grid.rotation.x = Math.PI/2;
        }

        scene.add(grid);
    }

    createCurve() {
        // Clear previous curves
        if (this.curve) {
            this.scene.remove(this.curve);
        }
        if (this.xyProjection) {
            this.xyScene.remove(this.xyProjection);
        }
        if (this.yzProjection) {
            this.yzScene.remove(this.yzProjection);
        }
        if (this.xzProjection) {
            this.xzScene.remove(this.xzProjection);
        }
        
        // Create points for the curve
        const points = [];
        const numPoints = 1000;
        
        for (let i = 0; i <= numPoints; i++) {
            const t = (i / numPoints) * this.tMax;
            const point = this.calculatePoint(t);
            if (isFinite(point.x) && isFinite(point.y) && isFinite(point.z)) {
                points.push(new THREE.Vector3(point.x, point.y, point.z));
            }
        }
        
        // Create the curve only if we have valid points
        if (points.length > 1) {
            const curve = new THREE.CatmullRomCurve3(points);
            const geometry = new THREE.TubeGeometry(curve, 100, 0.05, 8, false);
            const material = new THREE.MeshPhongMaterial({
                color: 0x00ff00,
                shininess: 100
            });
            
            this.curve = new THREE.Mesh(geometry, material);
            this.scene.add(this.curve);
            
            // Create projection curves
            this.createProjectionCurves(points);
        }
    }
    
    createProjectionCurves(points) {
        // Create geometries for projections with consistent scale
        const xyPoints = points.map(p => new THREE.Vector3(p.x, p.y, 0));
        const yzPoints = points.map(p => new THREE.Vector3(0, p.y, p.z));
        const xzPoints = points.map(p => new THREE.Vector3(p.x, 0, p.z));

        // Create materials with different colors
        const xyMaterial = new THREE.LineBasicMaterial({ 
            color: 0x0000ff, 
            opacity: 0.8,
            transparent: true,
            linewidth: 2
        });
        const yzMaterial = new THREE.LineBasicMaterial({ 
            color: 0xff0000,
            opacity: 0.8,
            transparent: true,
            linewidth: 2
        });
        const xzMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ff00,
            opacity: 0.8,
            transparent: true,
            linewidth: 2
        });

        // Remove existing projections
        if (this.xyProjection) this.xyScene.remove(this.xyProjection);
        if (this.yzProjection) this.yzScene.remove(this.yzProjection);
        if (this.xzProjection) this.xzScene.remove(this.xzProjection);

        // Create new projections with consistent scale
        this.xyProjection = new THREE.Line(new THREE.BufferGeometry().setFromPoints(xyPoints), xyMaterial);
        this.yzProjection = new THREE.Line(new THREE.BufferGeometry().setFromPoints(yzPoints), yzMaterial);
        this.xzProjection = new THREE.Line(new THREE.BufferGeometry().setFromPoints(xzPoints), xzMaterial);

        // Add projections to scenes
        this.xyScene.add(this.xyProjection);
        this.yzScene.add(this.yzProjection);
        this.xzScene.add(this.xzProjection);
    }
    
    calculatePoint(t) {
        // Calculate envelope: e^(-γ(t-t₀)²)
        const envelope = Math.exp(-this.gamma * Math.pow(t - this.t0, 2));
        
        // Calculate real part: e^(-γ(t-t₀)²) cos(ωt)
        const real = envelope * Math.cos(this.omega * t);
        
        // Calculate imaginary part: e^(-γ(t-t₀)²) sin(ωt)
        const imag = envelope * Math.sin(this.omega * t);
        
        // Calculate magnitude: |f(t)| = e^(-γ(t-t₀)²)
        const magnitude = envelope;
        
        // Calculate phase: arg f(t) = ωt
        const phase = this.omega * t;
        
        return { 
            x: real,      // Real part
            y: imag,      // Imaginary part
            z: t,         // Time
            magnitude: magnitude,  // For potential visualization
            phase: phase          // For potential visualization
        };
    }
    
    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.toggleAnimation());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.timeSlider.addEventListener('input', (e) => {
            this.time = parseFloat(e.target.value) / 10;
            this.updateCurve();
        });
        this.rotationSlider.addEventListener('input', (e) => {
            const angle = (parseFloat(e.target.value) * Math.PI) / 180;
            this.camera.position.x = 4 * Math.cos(angle);
            this.camera.position.z = 4 * Math.sin(angle);
            this.camera.lookAt(0, 0, 0);
        });
    }
    
    toggleAnimation() {
        this.isRunning = !this.isRunning;
        this.startBtn.textContent = this.isRunning ? '暫停' : '開始';
    }
    
    reset() {
        this.time = 0;
        this.timeDirection = 1;  // Reset direction to forward
        this.timeSlider.value = 0;
        this.updateCurve();
    }
    
    updateCurve() {
        const point = this.calculatePoint(this.time);
        
        // Update main particle position
        this.particle.position.set(point.x, point.y, point.z);
        
        // Update projection particles
        this.xyParticle.position.set(point.x, point.y, 0);
        this.yzParticle.position.set(0, point.y, point.z);
        this.xzParticle.position.set(point.x, 0, point.z);
        
        // Update trail
        this.trailPoints.push(new THREE.Vector3(point.x, point.y, point.z));
        if (this.trailPoints.length > this.maxTrailPoints) {
            this.trailPoints.shift();
        }
        
        // Update trails
        this.trail.geometry.setFromPoints(this.trailPoints);
        
        // Update projection trails
        const xyPoints = this.trailPoints.map(p => new THREE.Vector3(p.x, p.y, 0));
        const yzPoints = this.trailPoints.map(p => new THREE.Vector3(0, p.y, p.z));
        const xzPoints = this.trailPoints.map(p => new THREE.Vector3(p.x, 0, p.z));
        
        this.xyTrail.geometry.setFromPoints(xyPoints);
        this.yzTrail.geometry.setFromPoints(yzPoints);
        this.xzTrail.geometry.setFromPoints(xzPoints);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.isRunning) {
            this.time += 0.01 * this.timeDirection;
            
            // Check if we need to reverse direction
            if (this.time >= this.tMax/3) {
                this.time = this.tMax/3;
                this.timeDirection = -1;
            } else if (this.time <= 0) {
                this.time = 0;
                this.timeDirection = 1;
            }
            
            this.timeSlider.value = this.time * 10;
            this.updateCurve();
        }
        
        // Render all scenes
        this.renderer.render(this.scene, this.camera);
        this.xyRenderer.render(this.xyScene, this.xyCamera);
        this.yzRenderer.render(this.yzScene, this.yzCamera);
        this.xzRenderer.render(this.xzScene, this.xzCamera);
    }
    
    onWindowResize() {
        // Update main view
        const mainCanvas = document.getElementById('mainCanvas');
        const width = mainCanvas.clientWidth;
        const height = mainCanvas.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
        
        // Get projection canvas dimensions
        const projCanvas = document.getElementById('projectionXY');
        const projWidth = projCanvas.clientWidth;
        const projHeight = projCanvas.clientHeight;
        
        // Force square aspect ratio for projections
        const size = Math.min(projWidth, projHeight);
        
        // Update all projection renderers with square size
        this.xyRenderer.setSize(size, size, false);
        this.yzRenderer.setSize(size, size, false);
        this.xzRenderer.setSize(size, size, false);
        
        // Update projection cameras with fixed size (no aspect ratio adjustment)
        const cameras = [this.xyCamera, this.yzCamera, this.xzCamera];
        cameras.forEach(camera => {
            camera.left = -this.projectionSize;
            camera.right = this.projectionSize;
            camera.top = this.projectionSize;
            camera.bottom = -this.projectionSize;
            camera.updateProjectionMatrix();
        });
    }

    addAxesWithLabels(scene, xLabel = 'x', yLabel = 'y', zLabel = 'z') {
        // Create axes
        const axesHelper = new THREE.AxesHelper(2);
        scene.add(axesHelper);

        // Create axis labels
        const createLabel = (text, position) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 64;
            canvas.height = 32;

            context.fillStyle = '#000000';
            context.font = '24px Arial';
            context.fillText(text, 4, 24);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.copy(position);
            sprite.scale.set(0.5, 0.25, 1);
            
            return sprite;
        };

        // Add labels at the end of each axis
        const xLabelSprite = createLabel(xLabel, new THREE.Vector3(2.2, 0, 0));
        const yLabelSprite = createLabel(yLabel, new THREE.Vector3(0, 2.2, 0));
        const zLabelSprite = createLabel(zLabel, new THREE.Vector3(0, 0, 2.2));

        scene.add(xLabelSprite);
        scene.add(yLabelSprite);
        scene.add(zLabelSprite);
    }

    createTrail() {
        // Create main trail
        const trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0xff3366,
            opacity: 0.5,
            transparent: true
        });
        this.trail = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(this.trail);

        // Create projection trails
        const projectionMaterial = {
            xy: new THREE.LineBasicMaterial({
                color: 0x0000ff,
                opacity: 0.5,
                transparent: true
            }),
            yz: new THREE.LineBasicMaterial({
                color: 0xff0000,
                opacity: 0.5,
                transparent: true
            }),
            xz: new THREE.LineBasicMaterial({
                color: 0x00ff00,
                opacity: 0.5,
                transparent: true
            })
        };

        this.xyTrail = new THREE.Line(new THREE.BufferGeometry(), projectionMaterial.xy);
        this.yzTrail = new THREE.Line(new THREE.BufferGeometry(), projectionMaterial.yz);
        this.xzTrail = new THREE.Line(new THREE.BufferGeometry(), projectionMaterial.xz);

        this.xyScene.add(this.xyTrail);
        this.yzScene.add(this.yzTrail);
        this.xzScene.add(this.xzTrail);
    }
}

// Initialize the visualization when the page loads
window.addEventListener('load', () => {
    const visualizer = new ComplexFunctionVisualizer();
    
    // Handle window resizing
    window.addEventListener('resize', () => visualizer.onWindowResize());
    visualizer.onWindowResize();
}); 