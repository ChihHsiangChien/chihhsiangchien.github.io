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
            specular: this.config.proteinSpecular
        });
    }

    createCapsidMaterial() {
        return new THREE.MeshPhongMaterial({ 
            color: this.config.capsidColor,
            transparent: true,
            opacity: this.config.capsidOpacity,
            wireframe: false
        });
    }

    createCapsidStructure() {
        const capsidGeometry = new THREE.IcosahedronGeometry(1, 1);
        this.capsid = new THREE.Mesh(capsidGeometry, this.components.capsidMaterial);

        const faces = this.extractFacesFromGeometry(capsidGeometry);
        const proteinCount = faces.length * 20;
        this.capsidProteins = this.createProteins(faces, proteinCount);

        this.group = new THREE.Group();
        this.group.add(this.capsid);
        this.group.add(this.capsidProteins);

        return this.group;
    }

    extractFacesFromGeometry(geometry) {
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
        
        const edge1 = v1.clone().sub(v0);
        const edge2 = v2.clone().sub(v0);
        const faceNormal = edge1.clone().cross(edge2).normalize();

        instanceIndex = this.placeProtein(center, faceNormal, matrix, instanceIndex);

        const angles = [0, 60, 120, 180, 240, 300];
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
                instanceIndex = this.placeProtein(pos, faceNormal, matrix, instanceIndex);
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

        matrix.makeTranslation(position.x, position.y, position.z);
        const randomAngle = Math.random() * Math.PI * 2;
        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(normal, randomAngle);
        matrix.multiply(rotationMatrix);

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