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
            color: this.config.spikeColor, // 例如：亮藍色，以便區分
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

            // 定義頭部球體的半徑和相對於中心軸的偏移量
            // 可以調整這些值來改變頭部的外觀
            const headSphereRadius = this.config.spikeRadius * 1.8; // 稍微調整頭部球體大小
            const headOffsetRadius = this.config.spikeRadius * 1.2; // 頭部球體中心離 Y 軸的距離
            const headYPosition = this.config.spikeLength; // 頭部球體的 Y 坐標 (在圓柱頂部)

            // 重新創建頭部球體的幾何體 (如果半徑改變了)
            const spikeTipGeometry = new THREE.SphereGeometry(
                headSphereRadius,
                this.config.detail,
                this.config.detail
            );

            // 計算三個球體在 XZ 平面上的位置 (圍繞 Y 軸)
            const angleIncrement = (Math.PI * 2) / 3; // 360 度 / 3 = 120 度



            // --- 新增：定義橢圓縮放比例 ---
            // scaleY > 1 會沿著刺突方向拉長
            // scaleXZ < 1 會在垂直於刺突方向上壓扁
            // 你可以調整這些值來獲得想要的效果
            const scaleY = 1.5; // 沿 Y 軸（刺突方向）的縮放比例
            const scaleXZ = 0.7; // 沿 X 和 Z 軸（垂直方向）的縮放比例

            for (let j = 0; j < 3; j++) {
                const angle = j * angleIncrement;
                const tipX = headOffsetRadius * Math.cos(angle);
                const tipZ = headOffsetRadius * Math.sin(angle);

                const spikeTip = new THREE.Mesh(spikeTipGeometry, spikeTipMaterial);
                spikeTip.position.set(tipX, headYPosition, tipZ);

                // 不需要單獨旋轉每個球體了，它們的位置已經定義了結構
                // spikeTip.rotation.set(...) // 移除或註釋掉之前的旋轉

                // --- 新增：應用縮放使球體變為橢球體 ---
                spikeTip.scale.set(scaleXZ, scaleY, scaleXZ); // 設置 X, Y, Z 軸的縮放


                singleSpikeGroup.add(spikeTip);
            }

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