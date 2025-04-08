export class ClippingManager {
    constructor(config = {}) {
        this.config = {
            planeNormal: config.planeNormal || new THREE.Vector3(0, 0, -1),
            planeConstant: config.planeConstant || 0.5,
            helpers: config.helpers || false
        };

        this.plane = new THREE.Plane(this.config.planeNormal, this.config.planeConstant);
        this.planeHelper = this.createPlaneHelper();
    }

    createPlaneHelper() {
        if (!this.config.helpers) return null;
        const helper = new THREE.PlaneHelper(this.plane, 2, 0xffff00);
        helper.visible = false;
        return helper;
    }

    getPlane() {
        return this.plane;
    }

    getHelper() {
        return this.planeHelper;
    }

    setPlaneConstant(value) {
        this.plane.constant = value;
        this.config.planeConstant = value;
    }

    setPlaneNormal(normal) {
        this.plane.normal.copy(normal);
        this.config.planeNormal = normal;
    }

    toggleHelper() {
        if (this.planeHelper) {
            this.planeHelper.visible = !this.planeHelper.visible;
            return this.planeHelper.visible;
        }
        return false;
    }

    applyToMesh(mesh, enabled = true) {
        if (!mesh) return;

        const clippingPlanes = enabled ? [this.plane] : null;

        const configureMaterial = (material) => {
            if (material) {
                material.clippingPlanes = clippingPlanes;
                material.clipIntersection = false;
                material.clipShadows = true;
                material.wireframe = false;
                material.side = THREE.FrontSide;
                material.needsUpdate = true;
            }
        };

        // Handle mesh's own material
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(configureMaterial);
        } else if (mesh.material) {
            configureMaterial(mesh.material);
        }

        // Handle all child mesh materials
        mesh.traverse(child => {
            if (child.isMesh && child !== mesh) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(configureMaterial);
                } else if (child.material) {
                    configureMaterial(child.material);
                }
            }
        });
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        if (newConfig.planeNormal) {
            this.setPlaneNormal(newConfig.planeNormal);
        }
        if (newConfig.planeConstant !== undefined) {
            this.setPlaneConstant(newConfig.planeConstant);
        }
    }
}