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

        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => {
                if (mat) {
                    mat.clippingPlanes = clippingPlanes;
                    mat.needsUpdate = true;
                }
            });
        } else if (mesh.material) {
            mesh.material.clippingPlanes = clippingPlanes;
            mesh.material.needsUpdate = true;
        }

        // Handle children
        mesh.traverse(child => {
            if (child.isMesh && child !== mesh) {
                this.applyToMesh(child, enabled);
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