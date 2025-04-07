export class CrossSectionManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.active = false;
        this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
        this.renderer.localClippingEnabled = true; // Enable clipping by default
    }

    toggle(virus) {
        this.active = !this.active;
        
        if (this.active) {
            this.clippingPlane.constant = 0.5;
            virus.setBodyOpacity(0.5);
        } else {
            this.clippingPlane.constant = 0;
            virus.setBodyOpacity(0.8);
        }
        
        const materials = virus.getAllMaterials();
        materials.forEach(material => {
            material.clippingPlanes = this.active ? [this.clippingPlane] : [];
            material.needsUpdate = true;
            material.side = THREE.DoubleSide; // Ensure double-sided rendering
        });
        
        this.renderer.clippingPlanes = this.active ? [this.clippingPlane] : [];
    }

    isActive() {
        return this.active;
    }
}