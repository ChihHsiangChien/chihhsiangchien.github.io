export class EnvelopeManager {
    constructor(config = {}) {
        this.config = {
            radius: config.radius,
            detail: config.detail,
            color: config.color,
            opacity: config.opacity,
            thickness: config.thickness
        };
    }

    createEnvelope() {
        // Create outer and inner spheres for the envelope
        const outerGeometry = new THREE.SphereGeometry(
            this.config.radius,
            this.config.detail,
            this.config.detail
        );
        /*
        const innerGeometry = new THREE.SphereGeometry(
            this.config.radius - this.config.thickness,
            this.config.detail,
            this.config.detail
        );
        */

        const material = new THREE.MeshPhongMaterial({
            color: this.config.color,
            transparent: true,
            opacity: this.config.opacity,
            // side: THREE.FrontSide, // Change this line

            side: THREE.DoubleSide,
            clipShadows: true,
            clipIntersection: false,
            wireframe: false
        });

        const outerSphere = new THREE.Mesh(outerGeometry, material);
        //const innerSphere = new THREE.Mesh(innerGeometry, material);

        // Create a group to hold both spheres
        this.envelope = new THREE.Group();
        this.envelope.add(outerSphere);
        //this.envelope.add(innerSphere);

        return this.envelope;
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    setOpacity(opacity) {
        if (this.envelope) {
            this.envelope.traverse(child => {
                if (child.isMesh) {
                    child.material.opacity = opacity;
                }
            });
        }
    }
}