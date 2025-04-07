export class SpikeProteinManager {
    constructor(config = {}) {
        this.config = {
            spikeCount: config.spikeCount || 50,
            spikeLength: config.spikeLength || 0.3,
            spikeRadius: config.spikeRadius || 0.03,
            spikeColor: config.spikeColor || 0xff0000,
            surfaceRadius: config.surfaceRadius || 1.2,
            detail: config.detail || 8
        };
    }

    createSpikes() {
        const spikeGeometry = new THREE.CylinderGeometry(
            0, // top radius (0 for cone)
            this.config.spikeRadius,
            this.config.spikeLength,
            this.config.detail,
            1
        );

        const spikeMaterial = new THREE.MeshPhongMaterial({
            color: this.config.spikeColor,
            shininess: 100
        });

        this.spikesGroup = new THREE.Group();

        // Create and position spikes evenly on the surface
        for (let i = 0; i < this.config.spikeCount; i++) {
            // Use fibonacci sphere distribution for even spacing
            const phi = Math.acos(1 - 2 * (i / this.config.spikeCount));
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;

            // Calculate position on sphere
            const x = Math.cos(theta) * Math.sin(phi);
            const y = Math.sin(theta) * Math.sin(phi);
            const z = Math.cos(phi);

            const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);

            // Position spike
            spike.position.set(
                x * this.config.surfaceRadius,
                y * this.config.surfaceRadius,
                z * this.config.surfaceRadius
            );

            // Orient spike to point outward
            spike.lookAt(spike.position.clone().multiplyScalar(2));
            spike.rotateX(Math.PI / 2); // Adjust for cylinder geometry

            this.spikesGroup.add(spike);
        }

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