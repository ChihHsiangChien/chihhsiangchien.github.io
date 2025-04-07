class GeneticMaterialManager {
    constructor(config = {}) {
        this.config = {
            helixRadius: config.helixRadius || 0.6,
            helixHeight: config.helixHeight || 1.2,
            helixTurns: config.helixTurns || 4,
            tubeRadius: config.tubeRadius || 0.05,
            tubeSegments: config.tubeSegments || 8,
            points: config.points || 64,
            color: config.color || 0xff0000,
            shininess: config.shininess || 100
        };

        this.material = this.createMaterial();
    }

    createMaterial() {
        return new THREE.MeshPhongMaterial({ 
            color: this.config.color,
            shininess: this.config.shininess,
            side: THREE.DoubleSide
        });
    }

    createGeneticMaterial() {
        const curvePoints = this.generateHelixPoints();
        const curve = new THREE.CatmullRomCurve3(curvePoints);
        const geometry = this.createTubeGeometry(curve);
        return new THREE.Mesh(geometry, this.material);
    }

    createTubeGeometry(curve) {
        return new THREE.TubeGeometry(
            curve, 
            this.config.points, 
            this.config.tubeRadius, 
            this.config.tubeSegments, 
            false
        );
    }

    generateHelixPoints() {
        const points = [];
        const { helixRadius, helixHeight, helixTurns, points: numPoints } = this.config;
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const angle = t * Math.PI * 2 * helixTurns;
            
            points.push(new THREE.Vector3(
                helixRadius * Math.cos(angle),
                helixHeight * (t - 0.5),
                helixRadius * Math.sin(angle)
            ));
        }
        
        return points;
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    getMaterial() {
        return this.material;
    }

    setColor(color) {
        this.material.color.set(color);
        this.material.needsUpdate = true;
    }

    setShininess(value) {
        this.material.shininess = value;
        this.material.needsUpdate = true;
    }
}

export { GeneticMaterialManager };