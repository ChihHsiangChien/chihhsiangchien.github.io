export class ConfigurationManager {
    constructor() {
        this.config = {
            capsid: {
                proteinSize: 0.05,
                proteinDetail: 16,
                proteinColor: 0x88cc88,
                proteinShininess: 100,
                proteinSpecular: 0x444444,
                capsidColor: 0x666666,
                capsidOpacity: 0.3,
                spacing: 0.105,
                hexRadius: 0.1
            },
            genetic: {
                helixRadius: 0.6,
                helixHeight: 1.2,
                helixTurns: 4,
                tubeRadius: 0.05,
                tubeSegments: 8,
                points: 64,
                color: 0xff0000,
                shininess: 100
            },
            scene: {
                backgroundColor: 0xeeeeee,
                cameraFov: 75,
                cameraNear: 0.1,
                cameraFar: 1000,
                cameraPosition: { x: 0, y: 0, z: 5 },
                controls: {
                    minDistance: 2,
                    maxDistance: 10,
                    dampingFactor: 0.05
                },
                lights: {
                    ambient: {
                        color: 0x404040,
                        intensity: 0.6
                    },
                    directional1: {
                        color: 0xffffff,
                        intensity: 1.0,
                        position: { x: 5, y: 5, z: 5 }
                    },
                    directional2: {
                        color: 0xffffff,
                        intensity: 0.8,
                        position: { x: -5, y: -5, z: -5 }
                    }
                }
            },
            envelope: {
                radius: 1.2,
                detail: 32,
                color: 0xffff00,
                opacity: 0.2,
                thickness: 0.1
            },
            spike: {
                spikeCount: 50,
                spikeLength: 0.3,
                spikeRadius: 0.03,
                spikeColor: 0xff5500,
                surfaceRadius: 1.35,
                detail: 8
            }
        };

        this.state = {
            isCrossSection: false,
            isVirusVisible: true,
            isCapsidVisible: true,
            isGeneticMaterialVisible: true,
            isEnvelopeVisible: true,
            isSpikeVisible: true
        };
    }

    getConfig(section) {
        return section ? this.config[section] : this.config;
    }

    updateConfig(section, newConfig) {
        if (section) {
            this.config[section] = { ...this.config[section], ...newConfig };
        } else {
            this.config = { ...this.config, ...newConfig };
        }
    }

    getState() {
        return { ...this.state };
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
    }

    toggleCrossSection() {
        this.state.isCrossSection = !this.state.isCrossSection;
        return this.state.isCrossSection;
    }

    toggleVirusVisibility() {
        this.state.isVirusVisible = !this.state.isVirusVisible;
        return this.state.isVirusVisible;
    }

    toggleCapsidVisibility() {
        this.state.isCapsidVisible = !this.state.isCapsidVisible;
        return this.state.isCapsidVisible;
    }

    toggleGeneticMaterialVisibility() {
        this.state.isGeneticMaterialVisible = !this.state.isGeneticMaterialVisible;
        return this.state.isGeneticMaterialVisible;
    }

    toggleEnvelopeVisibility() {
        this.state.isEnvelopeVisible = !this.state.isEnvelopeVisible;
        return this.state.isEnvelopeVisible;
    }

    toggleSpikeVisibility() {
        this.state.isSpikeVisible = !this.state.isSpikeVisible;
        return this.state.isSpikeVisible;
    }
}