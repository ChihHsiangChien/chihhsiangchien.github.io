import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// No GLTFLoader needed now

let scene, camera, renderer, controls;
let mitochondrionModel, chloroplastModel;
let currentModel = null;
let isCrossSection = true;

// --- Configuration ---
const OUTER_MEMBRANE_NAME = "Outer_Membrane"; // Name we assign to the outer mesh
const INNER_STRUCTURE_NAME = "Inner_Structure"; // Name for inner parts group

// Clipping plane for cross-section
const globalPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.5); // Clip from top down slightly

// UI Elements
const loadingElement = document.getElementById("loading"); // Keep for potential future use
const mitoBtn = document.getElementById("mitoBtn");
const chloroBtn = document.getElementById("chloroBtn");
const viewToggleBtn = document.getElementById("viewToggleBtn");
const container = document.getElementById("container");

init();
// Instead of loading, we create the models directly
createAndAddModels();

function init() {
  // --- Scene ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdddddd);

  // --- Camera ---
  camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.z = 15; // Adjust initial distance
  camera.position.y = 5;

  // --- Renderer ---
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.localClippingEnabled = true; // Enable local clipping
  //renderer.clippingPlanes = [globalPlane];
  container.appendChild(renderer.domElement);

  // --- Lighting ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  // --- Controls ---
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 2;
  controls.maxDistance = 50;
  controls.target.set(0, 0, 0);

  // --- Event Listeners ---
  window.addEventListener("resize", onWindowResize);
  mitoBtn.addEventListener("click", () => showModel("mitochondrion"));
  chloroBtn.addEventListener("click", () => showModel("chloroplast"));
  viewToggleBtn.addEventListener("click", toggleCrossSection);

  // --- Start Animation Loop ---
  animate();
}

// =============================================================
// Procedural Model Creation Functions
// =============================================================
function createMitochondrion() {
  const group = new THREE.Group();
  const innerStructures = new THREE.Group();
  innerStructures.name = INNER_STRUCTURE_NAME;

  // --- Materials ---
  const outerMaterial = new THREE.MeshStandardMaterial({
    color: 0xff8c69, // Orangey-red
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide, // Render inside for clipping
    clippingPlanes: isCrossSection ? [globalPlane] : null,
    clipIntersection: false,
    metalness: 0.1,
    roughness: 0.6,
  });

  const innerMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd700, // Gold/Yellow
    side: THREE.DoubleSide,
    clippingPlanes: isCrossSection ? [globalPlane] : null,
    clipIntersection: false,
    metalness: 0.1,
    roughness: 0.7,
  });

  const cristaeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4a460, // Sandy brown - distinct from inner membrane
    side: THREE.DoubleSide,
    clippingPlanes: isCrossSection ? [globalPlane] : null,
    clipIntersection: false,
    metalness: 0.1,
    roughness: 0.7,
  });

  // --- Geometry ---
  const outerRadius = 2;
  const length = 5;
  const innerRadius = 1.6;
  const innerLength = 4.5;

  // Outer Membrane (Capsule Shape)
  const outerCylGeom = new THREE.CylinderGeometry(
    outerRadius,
    outerRadius,
    length,
    32,
    1,
    true
  ); // Open ended cylinder
  const outerSphereGeom = new THREE.SphereGeometry(outerRadius, 32, 16);

  const outerCylinder = new THREE.Mesh(outerCylGeom, outerMaterial);
  const topSphere = new THREE.Mesh(outerSphereGeom, outerMaterial);
  const bottomSphere = new THREE.Mesh(outerSphereGeom, outerMaterial);
  topSphere.position.y = length / 2;
  bottomSphere.position.y = -length / 2;

  // Give the main outer shape the designated name
  const outerGroup = new THREE.Group();
  outerGroup.add(outerCylinder, topSphere, bottomSphere);
  outerGroup.name = OUTER_MEMBRANE_NAME; // Name the group containing outer parts
  //之後要開啟外膜的話要把這行註解掉
  //group.add(outerGroup);

  // Inner Membrane (Similar capsule, smaller)
  const innerCylGeom = new THREE.CylinderGeometry(
    innerRadius,
    innerRadius,
    innerLength,
    24,
    1,
    true
  );
  const innerSphereGeom = new THREE.SphereGeometry(innerRadius, 24, 12);

  const innerCylinder = new THREE.Mesh(innerCylGeom, innerMaterial);
  const innerTopSphere = new THREE.Mesh(innerSphereGeom, innerMaterial);
  const innerBottomSphere = new THREE.Mesh(innerSphereGeom, innerMaterial);
  innerTopSphere.position.y = innerLength / 2;
  innerBottomSphere.position.y = -innerLength / 2;
  innerStructures.add(innerCylinder, innerTopSphere, innerBottomSphere);

  // --- Improved Cristae (Folded membrane sheets) ---
  // Create a matrix of cristae that fold and extend into the matrix

  // Create matrix space material (for visualization)
  const matrixMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffe0, // Light yellow for matrix
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    clippingPlanes: isCrossSection ? [globalPlane] : null,
    clipIntersection: false,
    metalness: 0.0,
    roughness: 0.9,
  });

  // Parameters for cristae generation
  const cristaeCount = 18; // More cristae for greater density
  const cristaeSegments = 8; // Segments for shape complexity

  // Create anatomically correct folded cristae
  for (let i = 0; i < cristaeCount; i++) {
    // Use a more complex geometry to represent the folded membrane structures
    // Position along the length of the mitochondrion
    const yPos = (Math.random() * 0.8 - 0.4) * innerLength;

    // Random rotation around y-axis for varied orientation
    const rotY = Math.random() * Math.PI * 2;

    // Create a curved, folded sheet using spline curves
    const cristaeFoldPoints = [];

    // Create a fold that extends inward from the inner membrane
    const foldDepth = innerRadius * 0.8; // How far it extends into matrix
    const foldWidth = innerRadius * (0.6 + Math.random() * 0.6);
    const foldHeight = 0.12 + Math.random() * 0.12;

    // Create the shape for a single crista
    // Start from inner membrane and curve inward
    const cristaeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(innerRadius - 0.05, 0, 0),
      new THREE.Vector3(innerRadius - foldDepth * 0.3, foldHeight * 0.2, 0),
      new THREE.Vector3(innerRadius - foldDepth * 0.6, -foldHeight * 0.1, 0),
      new THREE.Vector3(innerRadius - foldDepth, foldHeight * 0.4, 0),
      new THREE.Vector3(innerRadius - foldDepth * 0.7, -foldHeight * 0.2, 0),
      new THREE.Vector3(innerRadius - foldDepth * 0.4, foldHeight * 0.3, 0),
    ]);

    // Create a tube along the curve
    const tubeGeometry = new THREE.TubeGeometry(
      cristaeCurve,
      cristaeSegments,
      foldHeight * 0.5, // tube radius
      8, // tubular segments
      false // closed
    );

    // Create the crista membrane
    const crista = new THREE.Mesh(tubeGeometry, cristaeMaterial);

    // Position and rotate the crista
    crista.position.y = yPos;
    crista.rotation.y = rotY;

    // Add some random variation to make each crista unique
    crista.scale.x = 0.8 + Math.random() * 0.4;
    crista.scale.z = 0.7 + Math.random() * 0.6;

    innerStructures.add(crista);

    // Add perpendicular cristae "plates" that connect to main fold
    if (Math.random() > 0.3) {
      const plateGeom = new THREE.PlaneGeometry(
        foldDepth * 0.6,
        foldHeight * 2
      );
      const plate = new THREE.Mesh(plateGeom, cristaeMaterial);
      plate.position.set(
        innerRadius - foldDepth * 0.5,
        yPos + (Math.random() - 0.5) * 0.2,
        0
      );
      plate.rotation.y = rotY + Math.PI / 2;
      innerStructures.add(plate);
    }
  }

  // Add matrix (the space inside inner membrane)
  const matrixGeom = new THREE.SphereGeometry(innerRadius * 0.85, 20, 16);
  const matrix = new THREE.Mesh(matrixGeom, matrixMaterial);
  innerStructures.add(matrix);

  // Add some granules to represent mitochondrial DNA and ribosomes
  const granuleCount = 12;
  const granuleMaterial = new THREE.MeshStandardMaterial({
    color: 0x4682b4, // Steel blue
    metalness: 0.2,
    roughness: 0.6,
    clippingPlanes: isCrossSection ? [globalPlane] : null,
  });

  for (let i = 0; i < granuleCount; i++) {
    const granuleSize = 0.08 + Math.random() * 0.08;
    const granuleGeom = new THREE.SphereGeometry(granuleSize, 8, 8);
    const granule = new THREE.Mesh(granuleGeom, granuleMaterial);

    // Position randomly within the matrix
    const radius = innerRadius * 0.7 * Math.random();
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI - Math.PI / 2;

    granule.position.set(
      radius * Math.sin(theta) * Math.cos(phi),
      (Math.random() - 0.5) * innerLength * 0.8,
      radius * Math.sin(theta) * Math.sin(phi)
    );

    innerStructures.add(granule);
  }

  group.add(innerStructures);
  return group;
}

function createChloroplast() {
  const group = new THREE.Group();
  const innerStructures = new THREE.Group();
  innerStructures.name = INNER_STRUCTURE_NAME;

  // --- Materials ---
  const outerMaterial = new THREE.MeshStandardMaterial({
    color: 0x98fb98, // Pale Green
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    clippingPlanes: isCrossSection ? [globalPlane] : null,
    clipIntersection: false,
    metalness: 0.1,
    roughness: 0.6,
  });

  const innerMaterial = new THREE.MeshStandardMaterial({
    color: 0x90ee90, // Light Green
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    clippingPlanes: isCrossSection ? [globalPlane] : null,
    clipIntersection: false,
    metalness: 0.1,
    roughness: 0.7,
  });

  const granaMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e8b57, // Sea Green (darker)
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    clippingPlanes: isCrossSection ? [globalPlane] : null,
    clipIntersection: false,
    metalness: 0.2,
    roughness: 0.5,
  });

  // --- Geometry ---
  const outerRadius = 3.5;
  const outerThickness = 5.0; // Make it flatter
  const innerRadius = 3.0;
  const innerThickness = 4;

  // Outer Membrane (Flattened Sphere)
  const outerGeom = new THREE.SphereGeometry(outerRadius, 32, 16);
  outerGeom.scale(1, outerThickness / (outerRadius * 2), 1); // Scale Y axis
  const outerMembrane = new THREE.Mesh(outerGeom, outerMaterial);
  outerMembrane.name = OUTER_MEMBRANE_NAME; // Name the mesh directly
  group.add(outerMembrane);

  // Inner Membrane (Smaller Flattened Sphere)
  const innerGeom = new THREE.SphereGeometry(innerRadius, 24, 12);
  innerGeom.scale(1, innerThickness / (innerRadius * 2), 1);
  const innerMembrane = new THREE.Mesh(innerGeom, innerMaterial);
  innerStructures.add(innerMembrane);

  // Grana (Stacks of thin cylinders)

  // Create a group for the grana stacks
  // 使用陣列維護 granaStack 的資料
  const granaStackData = [
    { discs: 8, rNum: 0.9, angleNum: 0.6, yNum: -0.3 },
    { discs: 7, rNum: 0.5, angleNum: 0.7, yNum: -0.5 },
    { discs: 8, rNum: 0.8, angleNum: 0.8, yNum: -0.5 },
    { discs: 9, rNum: 0.7, angleNum: 0.9, yNum: -0.5 },

    // 可根據需要添加更多 granaStack，例如：
    // { discs: 6, r: innerRadius * 0.3, angle: Math.PI / 2 }
  ];

  const discRadius = 0.5; // 圓盤半徑
  const discHeight = 0.1; // 圓盤高度
  const stackSpacing = 0.03; // 圓盤間的間距

  granaStackData.forEach((stack, i) => {
    const granumGroup = new THREE.Group();

    // 從陣列中取得預設的 r 和 angle，而不是隨機生成
    const r = stack.rNum * (innerRadius * 0.7);
    const angle = stack.angleNum * Math.PI * 2; // 角度範圍 [0, 2π]
    const xPos = Math.cos(angle) * r; // x 座標
    const zPos = Math.sin(angle) * r; // z 座標

    const discsPerGranum = stack.discs; // 從資料中取得圓盤數量
    const totalStackHeight =
      discsPerGranum * discHeight + (discsPerGranum - 1) * stackSpacing;
    // 在內膜厚度內垂直分佈 granaStack
    // const yStart = (Math.random() - 0.5) * (innerThickness * 0.8 - totalStackHeight);
    const yStart = stack.yNum * innerThickness;

    for (let j = 0; j < discsPerGranum; j++) {
      const discGeom = new THREE.CylinderGeometry(
        discRadius,
        discRadius,
        discHeight,
        16
      );
      const disc = new THREE.Mesh(discGeom, granaMaterial);
      const yPos = yStart + j * (discHeight + stackSpacing); // 計算每個圓盤的 y 座標
      disc.position.set(xPos, yPos, zPos); // 設定圓盤位置
      disc.rotation.y = Math.PI / 2; // 將圓柱軸與世界 Y 軸對齊
      granumGroup.add(disc); // 將圓盤加入群組
    }
    innerStructures.add(granumGroup); // 將 granaStack 群組加入內部結構
  });

  group.add(innerStructures);
  return group;
}

// =============================================================
// Main Logic Integration
// =============================================================

function createAndAddModels() {
  loadingElement.style.display = "block"; // Show briefly
  loadingElement.textContent = "Creating models...";

  mitochondrionModel = createMitochondrion();
  chloroplastModel = createChloroplast();

  // Center and scale (optional, adjust scale factor if needed)
  centerAndScaleModel(mitochondrionModel, 8);
  centerAndScaleModel(chloroplastModel, 8);

  mitochondrionModel.visible = false; // Start hidden
  chloroplastModel.visible = false; // Start hidden

  scene.add(mitochondrionModel);
  scene.add(chloroplastModel);

  loadingElement.style.display = "none";
  // Show the first model by default
  showModel("chloroplast");
}

function centerAndScaleModel(model, targetSize) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  if (maxDim === 0) return; // Avoid division by zero

  const scale = targetSize / maxDim;
  model.scale.set(scale, scale, scale);

  // Recalculate center after scaling
  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  model.position.sub(scaledCenter); // Center the model at origin
}

function setMaterialTransparency(material) {
  // This function is now primarily handled within the creation functions,
  // but keep it in case we need to adjust later.
  material.transparent = true;
  material.opacity = 0.5;
  material.needsUpdate = true;
}

function showModel(type) {
  if (mitochondrionModel) mitochondrionModel.visible = type === "mitochondrion";
  if (chloroplastModel) chloroplastModel.visible = type === "chloroplast";

  currentModel =
    type === "mitochondrion" ? mitochondrionModel : chloroplastModel;

  // Apply clipping state to the newly visible model
  applyClippingToModel(currentModel, isCrossSection);

  // Optional: Reset camera - might be useful
  // controls.target.set(0, 0, 0);
  // camera.position.set(0, 5, 15);
  controls.update();
}
isCrossSection;

function toggleCrossSection() {
  isCrossSection = !isCrossSection;

  // Update the clipping planes for all relevant objects
  scene.traverse((object) => {
    if (object.isMesh && object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((mat) => {
          mat.clippingPlanes = isCrossSection ? [globalPlane] : null;
          mat.needsUpdate = true;
        });
      } else {
        object.material.clippingPlanes = isCrossSection ? [globalPlane] : null;
        object.material.needsUpdate = true;
      }
    }
  });

  // Update renderer setting
  renderer.localClippingEnabled = isCrossSection;
}

function applyClippingToModel(model, applyClipping) {
  if (!model) return;

  // Find the outer membrane and inner structures
  const outerMembraneObject = model.getObjectByName(OUTER_MEMBRANE_NAME);
  const innerStructuresGroup = model.getObjectByName(INNER_STRUCTURE_NAME);

  const clippingPlanesArray = applyClipping ? [globalPlane] : null;

  console.log(clippingPlanesArray);
  /*  
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          mat.clippingPlanes = isCrossSection ? [globalPlane] : null;
          mat.needsUpdate = true;
        });
      } else {
        child.material.clippingPlanes = isCrossSection ? [globalPlane] : null;
        child.material.needsUpdate = true;
      }
    }
  });
   */

  // Apply to outer membrane materials
  if (outerMembraneObject) {
    outerMembraneObject.traverse((child) => {
      if (child.isMesh) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((mat) => {
          if (mat) {
            mat.clippingPlanes = clippingPlanesArray;
            // Ensure transparency is set correctly on outer membrane
            mat.transparent = true;
            mat.opacity = 0.5;
            mat.needsUpdate = true;
          }
        });
      }
    });
  }

  // Apply to all inner structure materials
  if (innerStructuresGroup) {
    innerStructuresGroup.traverse((child) => {
      if (child.isMesh) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((mat) => {
          if (mat) {
            mat.clippingPlanes = clippingPlanesArray;
            // Inner materials should NOT be transparent
            mat.transparent = false;
            mat.opacity = 1;
            mat.needsUpdate = true;
          }
        });
      }
    });
  }


  // If model structure is simpler (e.g. chloroplast only has one outer mesh)
  // a simpler traverse might work, but the named approach is more robust.
  /* // General traversal as fallback
    model.traverse((child) => {
        if (child.isMesh) {
             const materials = Array.isArray(child.material) ? child.material : [child.material];
             materials.forEach(mat => {
                 if(mat) {
                    mat.clippingPlanes = clippingPlanesArray;
                    // Careful: this overrides specific transparency settings
                    // if (!child.name || child.name !== OUTER_MEMBRANE_NAME) { // Example check
                    //    mat.transparent = false;
                    // }
                    mat.needsUpdate = true;
                 }
             });
        }
    });
    */
}

function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
