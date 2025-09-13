
// THREE.js setup
let scene, camera, renderer, controls;
let enzyme, substrate, products = [], animationId;
let mode = 'decomposition'; // 'decomposition' or 'synthesis'
let isAnimating = false;
let enzymeDecompositionGeometry, enzymeSynthesisGeometry, substrateDecompositionGeometry, substrateSynthesisGeometries;
let productDecompositionGeometries, productSynthesisGeometry;

// UI elements
const decompositionBtn = document.getElementById('decompositionBtn');
const synthesisBtn = document.getElementById('synthesisBtn');
const decomposeBtn = document.getElementById('decomposeBtn');
const synthesizeBtn = document.getElementById('synthesizeBtn');
const resetBtn = document.getElementById('resetBtn');
const messageBox = document.getElementById('messageBox');

// Initial setup
init();
animate();

// Initialize the scene, camera, and renderer
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a202c);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 25;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Add OrbitControls for user interaction
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // For a smoother effect
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.maxDistance = 50;
    controls.minDistance = 10;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Create geometries for different shapes
    createGeometries();

    // Create initial models
    createModels();
    updateUI();

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    decompositionBtn.addEventListener('click', () => switchMode('decomposition'));
    synthesisBtn.addEventListener('click', () => switchMode('synthesis'));
    decomposeBtn.addEventListener('click', runDecomposition);
    synthesizeBtn.addEventListener('click', runSynthesis);
    resetBtn.addEventListener('click', resetSimulation);
}

// Create all the necessary geometries at once
function createGeometries() {
    // Decomposition Enzyme
    const enzymeDecoShape = new THREE.Shape();
    enzymeDecoShape.moveTo(-2.5, -2);
    enzymeDecoShape.lineTo(2.5, -2);
    enzymeDecoShape.lineTo(2.5, 1);
    enzymeDecoShape.lineTo(0.5, 1);
    enzymeDecoShape.lineTo(0.5, 0);
    enzymeDecoShape.lineTo(-0.5, 0);
    enzymeDecoShape.lineTo(-0.5, 1);
    enzymeDecoShape.lineTo(-2.5, 1);
    enzymeDecoShape.lineTo(-2.5, -2);
    const extrudeSettings = {
        steps: 2, depth: 1, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2
    };
    enzymeDecompositionGeometry = new THREE.ExtrudeGeometry(enzymeDecoShape, extrudeSettings);

    // Synthesis Enzyme
    const enzymeSynthShape = new THREE.Shape();
    enzymeSynthShape.moveTo(-2.5, -2);
    enzymeSynthShape.lineTo(2.5, -2);
    enzymeSynthShape.lineTo(2.5, 1);
    enzymeSynthShape.lineTo(1, 1);
    enzymeSynthShape.lineTo(1, 0);
    enzymeSynthShape.lineTo(-1, 0);
    enzymeSynthShape.lineTo(-1, 1);
    enzymeSynthShape.lineTo(-2.5, 1);
    enzymeSynthShape.lineTo(-2.5, -2);
    enzymeSynthesisGeometry = new THREE.ExtrudeGeometry(enzymeSynthShape, extrudeSettings);

    // Decomposition Substrate
    const substrateDecoShape = new THREE.Shape();
    substrateDecoShape.moveTo(-0.5, 0);
    substrateDecoShape.lineTo(0.5, 0);
    substrateDecoShape.lineTo(0.5, 1);
    substrateDecoShape.lineTo(2.5, 1);
    substrateDecoShape.lineTo(2.5, -2);
    substrateDecoShape.lineTo(-2.5, -2);
    substrateDecoShape.lineTo(-2.5, 1);
    substrateDecoShape.lineTo(-0.5, 1);
    substrateDecoShape.lineTo(-0.5, 0);
    substrateDecompositionGeometry = new THREE.ExtrudeGeometry(substrateDecoShape, extrudeSettings);
    
    // Synthesis Substrates (Small ones)
    const subSynthShape1 = new THREE.Shape();
    subSynthShape1.moveTo(-1, 0);
    subSynthShape1.lineTo(1, 0);
    subSynthShape1.lineTo(1, 2);
    subSynthShape1.lineTo(-1, 2);
    subSynthShape1.lineTo(-1, 0);
    const subSynthShape2 = new THREE.Shape();
    subSynthShape2.arc(0, 0.5, 1, 0, Math.PI, true);
    subSynthShape2.lineTo(-1, 2.5);
    subSynthShape2.lineTo(1, 2.5);
    subSynthShape2.lineTo(1, 0.5);
    substrateSynthesisGeometries = [new THREE.ExtrudeGeometry(subSynthShape1, extrudeSettings), new THREE.ExtrudeGeometry(subSynthShape2, extrudeSettings)];

    // Decomposition Products (Small ones)
    const prodDecoShape1 = new THREE.Shape();
    prodDecoShape1.moveTo(-1.5, -0.5);
    prodDecoShape1.lineTo(1.5, -0.5);
    prodDecoShape1.lineTo(1.5, 1.5);
    prodDecoShape1.lineTo(-1.5, 1.5);
    prodDecoShape1.lineTo(-1.5, -0.5);
    const prodDecoShape2 = new THREE.Shape();
    prodDecoShape2.moveTo(-1, 0);
    prodDecoShape2.lineTo(1, 0);
    prodDecoShape2.lineTo(1, 2);
    prodDecoShape2.lineTo(-1, 2);
    prodDecoShape2.lineTo(-1, 0);
    productDecompositionGeometries = [new THREE.ExtrudeGeometry(prodDecoShape1, extrudeSettings), new THREE.ExtrudeGeometry(prodDecoShape2, extrudeSettings)];

    // Synthesis Product (Large one)
    const prodSynthShape = new THREE.Shape();
    prodSynthShape.moveTo(-1.5, 0);
    prodSynthShape.lineTo(1.5, 0);
    prodSynthShape.lineTo(1.5, 2.5);
    prodSynthShape.arc(0, 0.5, 1, 0, Math.PI, true);
    prodSynthShape.lineTo(-1.5, 0);
    productSynthesisGeometry = new THREE.ExtrudeGeometry(prodSynthShape, extrudeSettings);
}

// Create the initial 3D models based on the current mode
function createModels() {
    // Remove previous models
    for (let i = scene.children.length - 1; i >= 0; i--) {
        const child = scene.children[i];
        if (child.name === 'enzyme' || child.name === 'substrate' || (child.name && child.name.startsWith('product'))) {
            scene.remove(child);
        }
    }

    // Create Enzyme (only for current mode)
    let enzymeMaterial, enzymeGeometry;
    if (mode === 'decomposition') {
        enzymeMaterial = new THREE.MeshStandardMaterial({ color: 0x3d5d59, transparent: true, opacity: 0.9 });
        enzymeGeometry = enzymeDecompositionGeometry;
    } else {
        enzymeMaterial = new THREE.MeshStandardMaterial({ color: 0x98664b, transparent: true, opacity: 0.9 });
        enzymeGeometry = enzymeSynthesisGeometry;
    }
    enzyme = new THREE.Mesh(enzymeGeometry, enzymeMaterial);
    enzyme.position.set(0, -5, 0);
    enzyme.name = 'enzyme';
    scene.add(enzyme);

    if (mode === 'decomposition') {
        // Create Substrate (large molecule)
        const substrateMaterial = new THREE.MeshStandardMaterial({ color: 0x4f9f95, transparent: true, opacity: 0.9 });
        substrate = new THREE.Mesh(substrateDecompositionGeometry, substrateMaterial);
        substrate.position.set(0, 10, 0);
        substrate.name = 'substrate';
        scene.add(substrate);
        products = [];
    } else {
        // Synthesis mode: two small substrates
        const substrateMaterial1 = new THREE.MeshStandardMaterial({ color: 0xe6b07c, transparent: true, opacity: 0.9 });
        const sub1 = new THREE.Mesh(substrateSynthesisGeometries[0], substrateMaterial1);
        sub1.position.set(-2, 10, 0);
        sub1.name = 'product1';
        scene.add(sub1);

        const substrateMaterial2 = new THREE.MeshStandardMaterial({ color: 0xe6b07c, transparent: true, opacity: 0.9 });
        const sub2 = new THREE.Mesh(substrateSynthesisGeometries[1], substrateMaterial2);
        sub2.position.set(2, 10, 0);
        sub2.name = 'product2';
        scene.add(sub2);
        products = [sub1, sub2];
        substrate = null;
    }
}

// Animate the scene
function animate() {
    animationId = requestAnimationFrame(animate);

    if (mode === 'decomposition' && isAnimating) {
        if (substrate.position.y > 0) {
            substrate.position.y -= 0.05;
            substrate.rotation.y += 0.01;
        } else if (products.length === 0) {
            // Start separation
            showInfo("專一性：受質與酵素結合");
            setTimeout(() => {
                const productMaterial1 = new THREE.MeshStandardMaterial({ color: 0x82c8be, transparent: true, opacity: 0.9 });
                const productMaterial2 = new THREE.MeshStandardMaterial({ color: 0x1d5854, transparent: true, opacity: 0.9 });
                const product1 = new THREE.Mesh(productDecompositionGeometries[0], productMaterial1);
                const product2 = new THREE.Mesh(productDecompositionGeometries[1], productMaterial2);

                product1.position.copy(enzyme.position).add(new THREE.Vector3(-1.5, 0.5, 0));
                product2.position.copy(enzyme.position).add(new THREE.Vector3(1.5, -0.5, 0));
                product1.name = 'product1';
                product2.name = 'product2';
                scene.add(product1);
                scene.add(product2);
                products = [product1, product2];
                scene.remove(substrate); // Remove the original substrate
                showInfo("分解作用：生成產物並分離");
            }, 1000);
        } else {
            products[0].position.x -= 0.05;
            products[0].position.y += 0.05;
            products[1].position.x += 0.05;
            products[1].position.y += 0.05;
            if (products[0].position.y > 10) {
                isAnimating = false;
                showInfo("可重複使用：酵素恢復原狀");
            }
        }
    } else if (mode === 'synthesis' && isAnimating) {
        if (products[0].position.y > 0) {
            products[0].position.y -= 0.05;
            products[1].position.y -= 0.05;
            products[0].position.x += 0.01;
            products[1].position.x -= 0.01;
        } else if (!substrate) {
            // Start combination
            showInfo("專一性：小分子受質與酵素結合");
            setTimeout(() => {
                const newSubstrateMaterial = new THREE.MeshStandardMaterial({ color: 0xe19463, transparent: true, opacity: 0.9 });
                substrate = new THREE.Mesh(productSynthesisGeometry, newSubstrateMaterial);
                substrate.position.copy(enzyme.position).add(new THREE.Vector3(0, 0.5, 0));
                substrate.name = 'substrate';
                scene.add(substrate);
                scene.remove(products[0]);
                scene.remove(products[1]);
                products = []; // Clear the products array for synthesis
                showInfo("合成作用：生成大分子產物");
            }, 1000);
        } else {
            substrate.position.y += 0.05;
            substrate.rotation.y += 0.01;
            if (substrate.position.y > 10) {
                isAnimating = false;
                showInfo("可重複使用：酵素恢復原狀");
            }
        }
    }

    // Rotate enzyme for visual effect only when not animating
    if (!isAnimating) {
        enzyme.rotation.y += 0.005;
    }

    // Update controls
    controls.update();

    renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Switch between decomposition and synthesis modes
function switchMode(newMode) {
    if (isAnimating) {
        showInfo("動畫進行中，請稍後");
        return;
    }
    mode = newMode;
    updateUI();
    resetSimulation();
}

// Update UI based on mode
function updateUI() {
    if (mode === 'decomposition') {
        decomposeBtn.classList.remove('hidden');
        synthesizeBtn.classList.add('hidden');
        decompositionBtn.classList.add('bg-blue-600');
        decompositionBtn.classList.remove('bg-blue-400');
        synthesisBtn.classList.add('bg-green-400');
        synthesisBtn.classList.remove('bg-green-600');
        showInfo("選擇模式：分解作用");
    } else {
        synthesizeBtn.classList.remove('hidden');
        decomposeBtn.classList.add('hidden');
        synthesisBtn.classList.add('bg-green-600');
        synthesisBtn.classList.remove('bg-green-400');
        decompositionBtn.classList.add('bg-blue-400');
        decompositionBtn.classList.remove('bg-blue-600');
        showInfo("選擇模式：合成作用");
    }
}

// Run the decomposition animation
function runDecomposition() {
    if (isAnimating) return;
    isAnimating = true;
    showInfo("分解作用開始...");
}

// Run the synthesis animation
function runSynthesis() {
    if (isAnimating) return;
    isAnimating = true;
    showInfo("合成作用開始...");
}

// Reset the simulation
function resetSimulation() {
    isAnimating = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    createModels();
    animate();
    showInfo("模擬已重置");
}

// Show a temporary message
function showInfo(message) {
    messageBox.textContent = message;
    messageBox.classList.add('active');
    clearTimeout(messageBox.timer);
    messageBox.timer = setTimeout(() => {
        messageBox.classList.remove('active');
    }, 3000);
}
