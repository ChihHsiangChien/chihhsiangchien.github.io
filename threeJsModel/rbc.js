import * as THREE from 'three';

// 設置場景、相機和渲染器
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 添加光源
const ambientLight = new THREE.AmbientLight(0x404040); // 環境光
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 100, 100); // 點光源
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// 創建紅血球的雙凹圓盤幾何體
function createRedBloodCell() {
    const geometry = new THREE.BufferGeometry();
    const radius = 2; // 紅血球半徑
    const thickness = 0.4; // 中間凹陷的厚度
    const segments = 32; // 圓周分段數
    const radialSegments = 16; // 徑向分段數
    const vertices = [];
    const indices = [];

    // 生成頂點
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2; // 圓周角度
        for (let j = 0; j <= radialSegments; j++) {
            const r = (j / radialSegments) * radius; // 徑向距離
            // 紅血球的雙凹形狀可以用數學公式描述
            const z = Math.sin(r * Math.PI / radius) * thickness * Math.exp(-r * r / (radius * radius));
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);
            vertices.push(x, y, z); // 上表面
            vertices.push(x, y, -z); // 下表面（對稱）
        }
    }

    // 生成索引（三角形面）
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const a = i * (radialSegments + 1) * 2 + j * 2;
            const b = a + 2;
            const c = (i + 1) * (radialSegments + 1) * 2 + j * 2;
            const d = c + 2;

            // 上表面三角形
            indices.push(a, b, c);
            indices.push(b, d, c);

            // 下表面三角形
            indices.push(a + 1, c + 1, b + 1);
            indices.push(b + 1, c + 1, d + 1);
        }
    }

    // 設置 BufferGeometry 的屬性
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals(); // 計算法線以獲得平滑光照效果

    // 創建材質
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000, shininess: 50 });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}

// 添加紅血球到場景
const redBloodCell = createRedBloodCell();
scene.add(redBloodCell);

// 設置相機位置
camera.position.z = 5;

// 動畫循環
function animate() {
    requestAnimationFrame(animate);
    redBloodCell.rotation.x += 0.01; // 旋轉動畫
    redBloodCell.rotation.y += 0.01;
    renderer.render(scene, camera);
}
animate();

// 處理窗口大小變化
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});