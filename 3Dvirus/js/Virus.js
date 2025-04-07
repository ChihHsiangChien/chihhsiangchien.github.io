// Import the managers
import { CapsidProteinManager } from './CapsidProteinManager.js';
import { GeneticMaterialManager } from './GeneticMaterialManager.js';
import { SpikeProteinManager } from './SpikeProteinManager.js';

export class Virus {
    constructor() {
        // Create managers
        this.capsidProteinManager = new CapsidProteinManager();
        this.geneticMaterialManager = new GeneticMaterialManager();
        this.spikeProteinManager = new SpikeProteinManager();
        
        // Create main group to hold all components
        this.group = new THREE.Group();
        
        // Create components
        this.createEnvelope();
        this.createCapsid();
        this.createGeneticMaterial();
        this.createSpikeProteins();
        
        // Add all components to main group
        this.group.add(this.envelope);
        this.group.add(this.capsidGroup);
        this.group.add(this.geneticMaterial);
        this.group.add(this.spikeProteins);
    }

    createEnvelope() {
        const envelopeGeometry = new THREE.SphereGeometry(1.2, 32, 32);
        this.envelopeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x0077ff, 
            flatShading: false,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        this.envelope = new THREE.Mesh(envelopeGeometry, this.envelopeMaterial);
    }

    createCapsid() {
        this.capsidGroup = this.capsidProteinManager.createCapsidStructure();
    }

    createGeneticMaterial() {
        this.geneticMaterial = this.geneticMaterialManager.createGeneticMaterial();
    }

    createSpikeProteins() {
        this.spikeProteins = this.spikeProteinManager.createSpikeProteins(this.envelope.geometry);
        // Position stays at origin since spikes are already positioned relative to envelope
        this.spikeProteins.position.set(0, 0, 0);
    }

    getAllMaterials() {
        return [
            this.envelopeMaterial, 
            this.capsidProteinManager.getCapsidMaterial(),
            this.spikeProteinManager.getMaterial(), 
            this.geneticMaterialManager.getMaterial()
        ];
    }

    getObject() {
        return this.group;
    }

    toggleGeneticMaterial() {
        this.geneticMaterial.visible = !this.geneticMaterial.visible;
    }

    toggleCapsid() {
        this.capsidProteinManager.toggleVisibility();
    }

    toggleEnvelope() {
        this.envelope.visible = !this.envelope.visible;
    }

    toggleSpike() {
        this.spikeProteins.visible = !this.spikeProteins.visible;
    }

    setBodyOpacity(opacity) {
        this.envelopeMaterial.opacity = opacity;
        this.capsidProteinManager.setOpacity(opacity);
    }
}