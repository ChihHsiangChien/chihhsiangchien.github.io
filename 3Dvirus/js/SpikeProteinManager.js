export class SpikeProteinManager {
    constructor(config = {}) {
        this.config = {
            spikeCount: config.spikeCount || 50,
            spikeLength: config.spikeLength || 0.3,
            spikeRadius: config.spikeRadius || 0.03,
            spikeColor: config.spikeColor || 0xff0000,
            surfaceRadius: config.surfaceRadius || 1.35,
            detail: config.detail || 8
        };
    }

    createSpikes() {
        // --- 1. 創建基礎幾何體 ---
        const cylinderGeometry = new THREE.CylinderGeometry(
            this.config.spikeRadius * 0.1, // top radius (可以調整，例如保持與底部相同)
            this.config.spikeRadius * 2,   // bottom radius
            this.config.spikeLength,
            this.config.detail,
            1
        );
        // **重要：將圓柱體向上移動，使其底部在 Y=0**
        cylinderGeometry.translate(0, this.config.spikeLength / 2, 0);

        const spikeTipGeometry = new THREE.SphereGeometry(
            this.config.spikeRadius * 2, // 頂部球體半徑 (可以調整)
            this.config.detail,
            this.config.detail
        );

        // --- 2. 創建不同的材質 ---
        const cylinderMaterial = new THREE.MeshPhongMaterial({
            color: this.config.spikeColor, // 圓柱體使用配置的顏色
            shininess: 100
        });

        // **為頂部球體創建一個明顯不同的材質**
        const spikeTipMaterial = new THREE.MeshPhongMaterial({
            color: 0x00ffff, // 例如：亮藍色，以便區分
            shininess: 150
        });

        // --- 3. 初始化主組 ---
        this.spikesGroup = new THREE.Group();

        // --- 4. 迴圈創建每個完整的刺突 ---
        for (let i = 0; i < this.config.spikeCount; i++) {
            // --- a. 計算刺突在病毒表面的位置和朝向 (這部分不變) ---
            const phi = Math.acos(1 - 2 * (i / this.config.spikeCount));
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;
            const x = Math.cos(theta) * Math.sin(phi);
            const y = Math.sin(theta) * Math.sin(phi);
            const z = Math.cos(phi);
            const spikePosition = new THREE.Vector3(
                x * this.config.surfaceRadius,
                y * this.config.surfaceRadius,
                z * this.config.surfaceRadius
            );

            // --- b. 為這個刺突創建一個單獨的組 ---
            const singleSpikeGroup = new THREE.Group();

            // --- c. 創建並添加圓柱體網格到單獨組 ---
            const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
            // 圓柱體不需要額外定位，因為它的幾何體已經移動過，底部在組的原點
            singleSpikeGroup.add(cylinderMesh);

            // --- d. 創建並添加頂部球體網格到單獨組 ---
            const spikeTip1 = new THREE.Mesh(spikeTipGeometry, spikeTipMaterial);
            const spikeTip2 = new THREE.Mesh(spikeTipGeometry, spikeTipMaterial);
            const spikeTip3 = new THREE.Mesh(spikeTipGeometry, spikeTipMaterial);

            // **在單獨組的局部坐標系中定位頂部球體**
            spikeTip1.position.set(0, this.config.spikeLength, 0);
            spikeTip2.position.set(this.config.spikeRadius * 0.8, this.config.spikeLength, 0); // 偏移量可能需要根據新的球體半徑調整
            spikeTip3.position.set(-this.config.spikeRadius * 0.8, this.config.spikeLength, 0); // 偏移量可能需要根據新的球體半徑調整

            singleSpikeGroup.add(spikeTip1);
            singleSpikeGroup.add(spikeTip2);
            singleSpikeGroup.add(spikeTip3);

            // --- e. 定位和定向這個單獨的刺突組 ---
            singleSpikeGroup.position.copy(spikePosition);
            singleSpikeGroup.lookAt(spikePosition.clone().multiplyScalar(2)); // 指向外部
            singleSpikeGroup.rotateX(Math.PI / 2); // 調整圓柱體方向

            // --- f. 將這個完整的刺突組添加到主組 ---
            this.spikesGroup.add(singleSpikeGroup);
        }

        // --- 5. 返回包含所有刺突的主組 ---
        return this.spikesGroup;
    }


    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    setOpacity(opacity) {
        if (this.spikesGroup) {
            this.spikesGroup.traverse(child => {
                if (child.isMesh) {
                    if (opacity < 1) {
                        child.material.transparent = true;
                    }
                    child.material.opacity = opacity;
                }
            });
        }
    }
}