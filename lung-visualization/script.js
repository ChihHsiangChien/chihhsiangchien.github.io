// Three.js 肺臟3D視覺化模型 - 主軸型碎形樹

class LungVisualization {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);
        
        const container = document.getElementById('canvas-container');
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
        this.camera.position.set(0, 0, 16);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
        container.appendChild(this.renderer.domElement);
        
        this.setupLights();
        
        this.lungGroup = new THREE.Group();
        this.scene.add(this.lungGroup);
        
        this.autoRotate = true;
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        
        this.buildLung();
        this.bindEvents();
        this.animate();
        
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambientLight);
        
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(15, 20, 15);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);
        
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-15, 10, -15);
        this.scene.add(fillLight);
    }
    
    buildLung() {
        // 1. 主氣管 (Trachea)
        const tracheaStart = new THREE.Vector3(0, 7, 0);
        const tracheaEnd = new THREE.Vector3(0, 3, 0);
        this.drawCylinder(tracheaStart, tracheaEnd, 0.8, '#CC0000');
        
        // 2. 左右主支氣管 (Main Bronchi)
        const leftMainEnd = new THREE.Vector3(-3, 0, 0);
        const rightMainEnd = new THREE.Vector3(3, 0, 0);
        this.drawCylinder(tracheaEnd, leftMainEnd, 0.6, '#D32F2F');
        this.drawCylinder(tracheaEnd, rightMainEnd, 0.6, '#D32F2F');
        
        // 3. 左肺支氣管系統
        this.buildLeftLung(leftMainEnd);
        
        // 4. 右肺支氣管系統
        this.buildRightLung(rightMainEnd);
    }
    
    buildLeftLung(startPos) {
        // 左肺上葉
        const upperPos = new THREE.Vector3(-4, 1, 0.5);
        this.drawCylinder(startPos, upperPos, 0.4, '#E63946');
        this.buildLobarBranches(upperPos, -1, 1);
        
        // 左肺中部
        const middlePos = new THREE.Vector3(-4.5, -1, 0);
        this.drawCylinder(startPos, middlePos, 0.4, '#E63946');
        this.buildLobarBranches(middlePos, -1, 0);
        
        // 左肺下葉
        const lowerPos = new THREE.Vector3(-4, -3, -0.5);
        this.drawCylinder(startPos, lowerPos, 0.4, '#E63946');
        this.buildLobarBranches(lowerPos, -1, -1);
    }
    
    buildRightLung(startPos) {
        // 右肺上葉
        const upperPos = new THREE.Vector3(4, 1, 0.5);
        this.drawCylinder(startPos, upperPos, 0.4, '#E63946');
        this.buildLobarBranches(upperPos, 1, 1);
        
        // 右肺中葉
        const middlePos = new THREE.Vector3(4.5, -1, 0);
        this.drawCylinder(startPos, middlePos, 0.4, '#E63946');
        this.buildLobarBranches(middlePos, 1, 0);
        
        // 右肺下葉
        const lowerPos = new THREE.Vector3(4, -3, -0.5);
        this.drawCylinder(startPos, lowerPos, 0.4, '#E63946');
        this.buildLobarBranches(lowerPos, 1, -1);
    }
    
    buildLobarBranches(startPos, sideMultiplier, heightLevel) {
        // 每個葉段產生3-4個段支氣管
        const numSegments = 4;
        
        for (let i = 0; i < numSegments; i++) {
            const angle = (i / numSegments) * Math.PI * 0.8 - Math.PI * 0.4;
            const distance = 1.5 + Math.random() * 0.5;
            
            const segmentEnd = new THREE.Vector3(
                startPos.x + sideMultiplier * Math.cos(angle) * distance,
                startPos.y + (Math.random() - 0.5) * 0.8,
                startPos.z + Math.sin(angle) * distance
            );
            
            this.drawCylinder(startPos, segmentEnd, 0.25, '#F77F88');
            
            // 每個段支氣管再分出2-3個細支氣管
            this.buildBronchioles(segmentEnd, sideMultiplier, i);
        }
    }
    
    buildBronchioles(startPos, sideMultiplier, seedIndex) {
        const numBronchioles = 3;
        
        for (let i = 0; i < numBronchioles; i++) {
            const angle = (i / numBronchioles) * Math.PI - Math.PI * 0.5;
            const distance = 1.0 + Math.random() * 0.4;
            
            const bronchioleEnd = new THREE.Vector3(
                startPos.x + sideMultiplier * Math.cos(angle) * distance * 0.6,
                startPos.y + Math.sin(angle) * distance * 0.5,
                startPos.z + (Math.random() - 0.5) * distance
            );
            
            this.drawCylinder(startPos, bronchioleEnd, 0.15, '#FFB6D9');
            
            // 細支氣管末端
            this.buildTerminalBronchioles(bronchioleEnd, sideMultiplier, seedIndex * 3 + i);
        }
    }
    
    buildTerminalBronchioles(startPos, sideMultiplier, seedIndex) {
        const numTerminal = 2;
        
        for (let i = 0; i < numTerminal; i++) {
            const angle = (i - 0.5) * Math.PI * 0.3;
            const distance = 0.6 + Math.random() * 0.3;
            
            const terminalEnd = new THREE.Vector3(
                startPos.x + sideMultiplier * Math.cos(angle) * distance * 0.4,
                startPos.y + (Math.random() - 0.5) * 0.5,
                startPos.z + Math.sin(angle) * distance * 0.5
            );
            
            this.drawCylinder(startPos, terminalEnd, 0.1, '#FFC9E3');
            
            // 終末細支氣管末端產生肺泡
            this.createAlveoliAt(terminalEnd, 0.08);
        }
    }
    
    getColorByDepth(depth) {
        const colorMap = {
            0: '#CC0000',   // 深紅 - 主氣管
            1: '#D32F2F',   // 紅
            2: '#E63946',   // 鮮紅 - 主支氣管
            3: '#EE5A52',   // 紅粉
            4: '#F77F88',   // 粉紅 - 支氣管
            5: '#FF99AC',   // 淺粉紅
            6: '#FFB6D9',   // 更淺粉紅 - 細支氣管
            7: '#FFC9E3',   // 極淺粉紅
            8: '#FFD4E5',   // 最淺 - 終末細支氣管/肺泡
        };
        
        if (depth >= 8) return colorMap[8];
        return colorMap[depth] || colorMap[8];
    }
    
    drawCylinder(startPos, endPos, radius, colorHex) {
        const direction = new THREE.Vector3().subVectors(endPos, startPos);
        const length = direction.length();
        
        if (length < 0.01) return;
        
        const geometry = new THREE.CylinderGeometry(radius, radius * 0.8, length, 8);
        
        const color = new THREE.Color(colorHex);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.2,
            roughness: 0.6
        });
        
        const cylinder = new THREE.Mesh(geometry, material);
        
        const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        cylinder.position.copy(midPoint);
        
        const yAxis = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(yAxis, direction.normalize());
        cylinder.quaternion.copy(quaternion);
        
        cylinder.castShadow = true;
        cylinder.receiveShadow = true;
        
        this.lungGroup.add(cylinder);
    }
    
    createAlveoliAt(position, baseRadius) {
        const numAlveoli = 8 + Math.floor(Math.random() * 6);
        const clusterRadius = 0.5 + baseRadius * 2;
        
        for (let i = 0; i < numAlveoli; i++) {
            const angle = (i / numAlveoli) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const r = clusterRadius * (0.3 + Math.random() * 0.7);
            
            const x = position.x + Math.cos(angle) * r;
            const y = position.y + (Math.random() - 0.5) * 0.4;
            const z = position.z + Math.sin(angle) * r;
            
            const alveolRadius = 0.12 + Math.random() * 0.15;
            
            const geometry = new THREE.SphereGeometry(alveolRadius, 8, 8);
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#FFE5F0'),
                metalness: 0.05,
                roughness: 0.8
            });
            
            const alveolus = new THREE.Mesh(geometry, material);
            alveolus.position.set(x, y, z);
            alveolus.castShadow = true;
            alveolus.receiveShadow = true;
            
            this.lungGroup.add(alveolus);
        }
    }
    
    bindEvents() {
        document.getElementById('rotateBtn').addEventListener('click', (e) => {
            this.autoRotate = !this.autoRotate;
            e.target.classList.toggle('btn-active');
        });
        
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.camera.position.z = Math.max(this.camera.position.z * 0.85, 5);
        });
        
        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.camera.position.z = Math.min(this.camera.position.z * 1.15, 40);
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.camera.position.set(0, 0, 16);
            this.lungGroup.rotation.set(0, 0, 0);
            this.autoRotate = true;
            document.getElementById('rotateBtn').classList.add('btn-active');
        });
        
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });
        
        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.previousMousePosition.x;
                const deltaY = e.clientY - this.previousMousePosition.y;
                
                this.lungGroup.rotation.y += deltaX * 0.008;
                this.lungGroup.rotation.x += deltaY * 0.008;
                
                // 限制X軸旋轉範圍，防止上下顛倒
                this.lungGroup.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.lungGroup.rotation.x));
                
                this.previousMousePosition = { x: e.clientX, y: e.clientY };
            }
        });
        
        this.renderer.domElement.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
        
        this.renderer.domElement.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });
        
        this.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY > 0) {
                this.camera.position.z = Math.min(this.camera.position.z * 1.1, 40);
            } else {
                this.camera.position.z = Math.max(this.camera.position.z * 0.9, 5);
            }
        });
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.autoRotate) {
            this.lungGroup.rotation.y += 0.002;
            // 保持輕微的前傾角度，但不超過限制
            this.lungGroup.rotation.x = 0.3;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        const container = document.getElementById('canvas-container');
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }
}

// 初始化
window.addEventListener('DOMContentLoaded', () => {
    new LungVisualization();
});
