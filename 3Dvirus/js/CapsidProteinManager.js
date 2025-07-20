class CapsidProteinManager {
    constructor(config = {}) {
        this.config = {
            proteinSize: config.proteinSize || 0.05,
            proteinDetail: config.proteinDetail || 16,
            proteinColor: config.proteinColor || 0x88cc88,
            proteinShininess: config.proteinShininess || 100,
            proteinSpecular: config.proteinSpecular || 0x444444,
            capsidColor: config.capsidColor || 0x666666,
            capsidOpacity: config.capsidOpacity || 0.3,
            spacing: config.spacing || 0.105,
            hexRadius: config.hexRadius || 0.1
        };

        this.components = {
            proteinGeometry: this.createProteinGeometry(),
            proteinMaterial: this.createProteinMaterial(),
            capsidMaterial: this.createCapsidMaterial()
        };
    }

    createProteinGeometry() {
        return new THREE.SphereGeometry(
            this.config.proteinSize,
            this.config.proteinDetail,
            this.config.proteinDetail
        );
    }

    createProteinMaterial() {
        return new THREE.MeshPhongMaterial({ 
            color: this.config.proteinColor,
            shininess: this.config.proteinShininess,
            specular: this.config.proteinSpecular,
            side: THREE.FrontSide,
            clipShadows: true
        });
    }

    createCapsidMaterial() {
        return new THREE.MeshPhongMaterial({ 
            color: this.config.capsidColor,
            transparent: true,
            opacity: this.config.capsidOpacity,
            wireframe: false,
            side: THREE.FrontSide,
            clipShadows: true,
            clipIntersection: false
        });
    }

    createCapsidStructure() {
        const capsidGeometry = new THREE.IcosahedronGeometry(1, 1);
        this.capsid = new THREE.Mesh(capsidGeometry, this.components.capsidMaterial);

        const faces = this.extractFacesFromGeometry(capsidGeometry);
        const proteinCount = faces.length * 7;
        this.capsidProteins = this.createProteins(faces, proteinCount);

        this.group = new THREE.Group();
        this.group.add(this.capsid);
        this.group.add(this.capsidProteins);

        return this.group;
    }

    extractFacesFromGeometry(geometry) {
        const faces = [];
        const positionAttribute = geometry.attributes.position;
        const index = geometry.index; // Get the index buffer

        if (index) {
            // Indexed geometry: use index buffer to define faces
            for (let i = 0; i < index.count; i += 3) {
                const a = index.getX(i);
                const b = index.getX(i + 1);
                const c = index.getX(i + 2);

                const vertices = [
                    new THREE.Vector3().fromBufferAttribute(positionAttribute, a),
                    new THREE.Vector3().fromBufferAttribute(positionAttribute, b),
                    new THREE.Vector3().fromBufferAttribute(positionAttribute, c)
                ];

                const center = new THREE.Vector3()
                    .add(vertices[0])
                    .add(vertices[1])
                    .add(vertices[2])
                    .divideScalar(3);

                faces.push({ vertices, center });
            }
        } else {
            // Non-indexed geometry: use position buffer directly (original method)
            for (let i = 0; i < positionAttribute.count; i += 3) {
                const vertices = [
                    new THREE.Vector3().fromBufferAttribute(positionAttribute, i),
                    new THREE.Vector3().fromBufferAttribute(positionAttribute, i + 1),
                    new THREE.Vector3().fromBufferAttribute(positionAttribute, i + 2)
                ];

                const center = new THREE.Vector3()
                    .add(vertices[0])
                    .add(vertices[1])
                    .add(vertices[2])
                    .divideScalar(3);

                faces.push({ vertices, center });
            }
        }
        return faces;
    }


    extractFacesFromGeometry2(geometry) {
        const faces = [];
        const positionAttribute = geometry.attributes.position;
        
        for (let i = 0; i < positionAttribute.count; i += 3) {
            const vertices = [
                new THREE.Vector3().fromBufferAttribute(positionAttribute, i),
                new THREE.Vector3().fromBufferAttribute(positionAttribute, i + 1),
                new THREE.Vector3().fromBufferAttribute(positionAttribute, i + 2)
            ];
            
            const center = new THREE.Vector3()
                .add(vertices[0])
                .add(vertices[1])
                .add(vertices[2])
                .divideScalar(3);
                
            faces.push({ vertices, center });
        }
        return faces;
    }

    createProteins(faces, proteinCount) {
        this.proteinInstancedMesh = new THREE.InstancedMesh(
            this.components.proteinGeometry,
            this.components.proteinMaterial,
            proteinCount * 2
        );

        const matrix = new THREE.Matrix4();
        let instanceIndex = 0;
        const processedVertices = new Set();
        const processedEdges = new Set();

        faces.forEach(face => {
            instanceIndex = this.addFaceProteins(face, matrix, instanceIndex);
            instanceIndex = this.addEdgeProteins(face, matrix, instanceIndex, processedEdges);
            instanceIndex = this.addVertexProteins(face, matrix, instanceIndex, processedVertices);
        });

        this.proteinInstancedMesh.count = instanceIndex;
        this.proteinInstancedMesh.instanceMatrix.needsUpdate = true;
        return this.proteinInstancedMesh;
    }

    addFaceProteins(face, matrix, instanceIndex) {
        const { vertices, center } = face;
        const [v0, v1, v2] = vertices;

        // 1. 將中心點投影到單位球面上 (貼合表面)
        const projectedCenter = center.clone().normalize(); // 假設半徑為 1
        // 2. 球面上的法線就是從原點指向該點的方向 (也是投影點本身)
        const centerNormal = projectedCenter.clone();

        // 3. 放置中心蛋白質
        instanceIndex = this.placeProtein(projectedCenter, centerNormal, matrix, instanceIndex);

        // --- 計算切面上的六邊形 ---

        // 4. 建立切面的基準向量 (需要兩個互相垂直且與法線垂直的向量)
        let tangent1;
        const globalUp = new THREE.Vector3(0, 1, 0); // 使用全局 Y 軸作為參考

        // 處理法線接近全局 Y 軸的情況，避免 crossVectors 結果為零向量
        if (Math.abs(centerNormal.dot(globalUp)) > 0.99) {
            // 如果法線幾乎是 Y 軸，則使用 X 軸作為第一個切線方向
            tangent1 = new THREE.Vector3(1, 0, 0);
        } else {
            // 第一個切線向量：全局 Y 軸與法線的叉乘
            tangent1 = new THREE.Vector3().crossVectors(globalUp, centerNormal).normalize();
        }
        // 第二個切線向量：法線與第一個切線向量的叉乘
        const tangent2 = new THREE.Vector3().crossVectors(centerNormal, tangent1).normalize(); // crossVectors 結果已垂直，normalize確保長度為1

        const angles = [0, 60, 120, 180, 240, 300];
        angles.forEach(angle => {
            const angleRad = (angle * Math.PI) / 180;

            // 5. 在切面上計算偏移量向量
            // 使用 tangent1 作為 0 度方向 (cos)，tangent2 作為 90 度方向 (sin)
            const offsetInTangentPlane = tangent1.clone().multiplyScalar(Math.cos(angleRad) * this.config.hexRadius)
                                          .add(tangent2.clone().multiplyScalar(Math.sin(angleRad) * this.config.hexRadius));

            // 6. 計算在切面上偏移後的大致位置 (尚未投影回球面)
            const potentialPosTangent = projectedCenter.clone().add(offsetInTangentPlane);

            // 7. 將這個在切面上計算出的位置，重新投影回單位球面上
            const projectedPos = potentialPosTangent.clone().normalize();

            // 8. (可選但推薦) 邊界檢查：仍然檢查原始 *平面* 上的對應點是否在三角形內
            //    這有助於避免蛋白質放置在離原始面太遠的地方
            const posOnPlaneForCheck = center.clone().add(
                new THREE.Vector3(
                    Math.cos(angleRad) * this.config.hexRadius,
                    Math.sin(angleRad) * this.config.hexRadius,
                    0
                ).applyMatrix3(new THREE.Matrix3().setFromMatrix4(matrix)) // 沿用舊的計算方式僅用於檢查
            );

            if (this.isPointInTriangle(posOnPlaneForCheck, v0, v1, v2)) {
                // 9. 如果檢查通過，放置蛋白質在 *新計算並投影回球面* 的位置
                const posNormal = projectedPos.clone(); // 球面上的法線就是投影點本身
                instanceIndex = this.placeProtein(projectedPos, posNormal, matrix, instanceIndex);
            }
        });

        return instanceIndex;
    }


    addFaceProteins_temp(face, matrix, instanceIndex) {
        const { vertices, center } = face;
        const [v0, v1, v2] = vertices;
        
        const edge1 = v1.clone().sub(v0);
        const edge2 = v2.clone().sub(v0);
        const faceNormal = edge1.clone().cross(edge2).normalize();

        instanceIndex = this.placeProtein(center, faceNormal, matrix, instanceIndex);

        const angles = [0, 60, 120, 180, 240, 300];
        //const angles = [0, 120];
        angles.forEach(angle => {
            const angleRad = (angle * Math.PI) / 180;
            const pos = center.clone().add(
                new THREE.Vector3(
                    Math.cos(angleRad) * this.config.hexRadius,
                    Math.sin(angleRad) * this.config.hexRadius,
                    0
                ).applyMatrix3(new THREE.Matrix3().setFromMatrix4(matrix))
            );

            if (this.isPointInTriangle(pos, v0, v1, v2)) {
                instanceIndex = this.addFaceProteins(pos, faceNormal, matrix, instanceIndex);
            }
        });

        return instanceIndex;
    }

    addEdgeProteins(face, matrix, instanceIndex, processedEdges) {
        const edges = face.vertices.map((v, i, arr) => [v, arr[(i + 1) % 3]]);

        edges.forEach(([v1, v2]) => {
            const edgeKey = this.getEdgeKey(v1, v2);
            if (!processedEdges.has(edgeKey)) {
                processedEdges.add(edgeKey);
                
                const edgeVector = v2.clone().sub(v1);
                const edgeLength = edgeVector.length();
                const numProteins = Math.floor(edgeLength / this.config.spacing) - 1;
                
                for (let i = 1; i <= numProteins; i++) {
                    const t = i / (numProteins + 1);
                    const pos = v1.clone().lerp(v2, t);
                    const normal = edgeVector.clone().normalize();
                    instanceIndex = this.placeProtein(pos, normal, matrix, instanceIndex);
                }
            }
        });

        return instanceIndex;
    }

    addVertexProteins(face, matrix, instanceIndex, processedVertices) {
        face.vertices.forEach(vertex => {
            const vertexKey = this.getVertexKey(vertex);
            if (!processedVertices.has(vertexKey)) {
                processedVertices.add(vertexKey);
                const normal = vertex.clone().normalize();
                instanceIndex = this.placeProtein(vertex, normal, matrix, instanceIndex);
            }
        });
        return instanceIndex;
    }

    placeProtein(position, normal, matrix, instanceIndex) {
        if (instanceIndex >= this.proteinInstancedMesh.count) return instanceIndex;
        // 1. 設定位置
        matrix.makeTranslation(position.x, position.y, position.z);
        /*        
        //const randomAngle = Math.random() * Math.PI * 2;
        const randomAngle = 0; // Random rotation angle
        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(normal, randomAngle);
        matrix.multiply(rotationMatrix);
        */
        // 2. 計算旋轉以使蛋白質朝外 (對齊局部 Y 軸與法線)
        const defaultUp = new THREE.Vector3(0, 1, 0); // 假設蛋白質的預設向上方向是 Y 軸
        const targetNormal = normal.clone().normalize(); // 確保法線是單位向量

        // 創建一個四元數，計算從 defaultUp 旋轉到 targetNormal 所需的旋轉
        const quaternion = new THREE.Quaternion();
        // 檢查 normal 是否與 defaultUp 或其反方向過於接近，避免計算問題
        if (targetNormal.distanceTo(defaultUp) > 0.001 && targetNormal.distanceTo(defaultUp.clone().negate()) > 0.001) {
             quaternion.setFromUnitVectors(defaultUp, targetNormal);
        } else if (targetNormal.distanceTo(defaultUp.clone().negate()) <= 0.001) {
             // 如果法線幾乎是 (0, -1, 0)，繞 X 軸旋轉 180 度
             quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
        }
        // 如果法線幾乎是 (0, 1, 0)，則不需要旋轉，quaternion 保持為單位四元數

        // 創建一個基於四元數的旋轉矩陣
        const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);

        // 3. 將旋轉應用到變換矩陣上 (乘在平移之後)
        matrix.multiply(rotationMatrix);

        // 4. 將最終的變換矩陣設定給 InstancedMesh 中的對應實例
        this.proteinInstancedMesh.setMatrixAt(instanceIndex, matrix);
        return instanceIndex + 1;
    }

    isPointInTriangle(p, a, b, c) {
        const v0 = b.clone().sub(a);
        const v1 = c.clone().sub(a);
        const v2 = p.clone().sub(a);

        const dot00 = v0.dot(v0);
        const dot01 = v0.dot(v1);
        const dot02 = v0.dot(v2);
        const dot11 = v1.dot(v1);
        const dot12 = v1.dot(v2);

        const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
        const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

        return u >= -0.1 && v >= -0.1 && (u + v) <= 1.1;
    }

    getEdgeKey(v1, v2) {
        const p1 = v1.toArray().join(',');
        const p2 = v2.toArray().join(',');
        return p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
    }

    getVertexKey(vertex) {
        return vertex.toArray().join(',');
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    getMaterial() {
        return this.components.proteinMaterial;
    }

    getCapsidMaterial() {
        return this.components.capsidMaterial;
    }

    setOpacity(opacity) {
        this.components.capsidMaterial.opacity = opacity * 0.75;
    }

    toggleVisibility() {
        this.capsid.visible = !this.capsid.visible;
        this.capsidProteins.visible = !this.capsidProteins.visible;
    }
}

export { CapsidProteinManager };