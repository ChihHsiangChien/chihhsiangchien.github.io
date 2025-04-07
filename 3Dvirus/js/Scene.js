export class Scene {
    constructor(canvasId) {
        this.sceneElements = this.initializeScene(canvasId);
        this.setupRenderer();
        this.setupControls();
        this.setupLighting();
        this.setupEventListeners();
    }

    initializeScene(canvasId) {
        return {
            scene: new THREE.Scene(),
            camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
            renderer: new THREE.WebGLRenderer({ 
                canvas: document.getElementById(canvasId), 
                antialias: true 
            })
        };
    }

    setupRenderer() {
        const { renderer } = this.sceneElements;
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0xeeeeee);
        renderer.localClippingEnabled = true;
    }

    setupControls() {
        const { camera, renderer } = this.sceneElements;
        this.controls = new THREE.OrbitControls(camera, renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 10;
        camera.position.z = 5;
    }

    setupLighting() {
        const { scene } = this.sceneElements;
        const lights = {
            ambient: new THREE.AmbientLight(0x404040, 0.6),
            directional1: new THREE.DirectionalLight(0xffffff, 1.0),
            directional2: new THREE.DirectionalLight(0xffffff, 0.8)
        };

        lights.directional1.position.set(5, 5, 5);
        lights.directional2.position.set(-5, -5, -5);

        Object.values(lights).forEach(light => scene.add(light));
        this.lights = lights;
    }

    setupEventListeners() {
        window.addEventListener('resize', this.handleResize.bind(this), false);
    }

    handleResize() {
        const { camera, renderer } = this.sceneElements;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    add(object) {
        this.sceneElements.scene.add(object);
    }

    animate(callback) {
        const { scene, camera, renderer } = this.sceneElements;
        
        const animate = () => {
            requestAnimationFrame(animate);
            this.controls.update();
            if (callback) callback();
            renderer.render(scene, camera);
        };
        
        animate();
    }

    getScene() {
        return this.sceneElements.scene;
    }

    getCamera() {
        return this.sceneElements.camera;
    }

    getRenderer() {
        return this.sceneElements.renderer;
    }

    getControls() {
        return this.controls;
    }

    getLights() {
        return this.lights;
    }
}