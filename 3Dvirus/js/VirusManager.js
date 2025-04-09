import { Scene } from './Scene.js';
import { CapsidProteinManager } from './CapsidProteinManager.js';
import { GeneticMaterialManager } from './GeneticMaterialManager.js';
import { ConfigurationManager } from './ConfigurationManager.js';
import { ClippingManager } from './ClippingManager.js';
import { EnvelopeManager } from './EnvelopeManager.js';
import { SpikeProteinManager } from './SpikeProteinManager.js';

export class VirusManager {
    constructor(canvasId = 'virusCanvas') {
        this.configManager = new ConfigurationManager();
        this.scene = new Scene(canvasId);
        //關掉剖面的線框
        this.clippingManager = new ClippingManager({ 
            helpers: false, // 關閉剖面幫助器
            planeConstant: 2 // <--- 在這裡設定初始值


         });
        
        this.initializeComponents();
        this.setupEventListeners();
    }

    initializeComponents() {
        // Initialize managers with configurations
        this.capsidManager = new CapsidProteinManager(
            this.configManager.getConfig('capsid')
        );
        
        this.geneticManager = new GeneticMaterialManager(
            this.configManager.getConfig('genetic')
        );

        // --- 獲取包膜配置 ---
        const envelopeConfig = this.configManager.getConfig('envelope');
        this.envelopeManager = new EnvelopeManager(envelopeConfig);

        // --- 獲取原始刺突配置 ---
        const spikeConfig = this.configManager.getConfig('spike');

        // --- 創建 SpikeProteinManager，並用包膜半徑覆蓋 surfaceRadius ---
        this.spikeManager = new SpikeProteinManager({
            ...spikeConfig, // 先展開原始的 spike 配置
            surfaceRadius: envelopeConfig.radius // <--- 關鍵：用包膜的半徑覆蓋 surfaceRadius
        });
                
        /*
        this.envelopeManager = new EnvelopeManager(
            this.configManager.getConfig('envelope')
        );

        this.spikeManager = new SpikeProteinManager(
            this.configManager.getConfig('spike')
        );
        */

        // Create virus components
        this.capsidStructure = this.capsidManager.createCapsidStructure();
        this.geneticMaterial = this.geneticManager.createGeneticMaterial();
        this.envelopeStructure = this.envelopeManager.createEnvelope();
        this.spikeProteins = this.spikeManager.createSpikes();

        // Add components to scene
        this.scene.add(this.capsidStructure);
        this.scene.add(this.geneticMaterial);
        this.scene.add(this.envelopeStructure);
        this.scene.add(this.spikeProteins);

        // Add clipping plane helper if available
        /*
        const helper = this.clippingManager.getHelper();
        if (helper) {
            this.scene.add(helper);
        }
        */
        // --- 在初始化時就啟用剖面 ---
        this.applyClippingToAll(true); // <--- 新增：立即應用剖面

        // Start animation
        this.scene.animate(() => this.update());
    }

    setupEventListeners() {
        /*
        document.getElementById('toggleCrossSection')?.addEventListener(
            'click', 
            () => this.toggleCrossSection()
        );
        */

        document.getElementById('toggleSpike')?.addEventListener(
            'click',
            () => this.toggleSpikeVisibility()
        );

        document.getElementById('toggleEnvelope')?.addEventListener(
            'click',
            () => this.toggleEnvelopeVisibility()
        );

        document.getElementById('toggleCapsid')?.addEventListener(
            'click', 
            () => this.toggleCapsidVisibility()
        );

        document.getElementById('toggleGeneticMaterial')?.addEventListener(
            'click', 
            () => this.toggleGeneticVisibility()
        );




        // Add clipping plane control events if needed
        document.getElementById('adjustClipping')?.addEventListener(
            'input',
            (e) => this.adjustClippingPlane(parseFloat(e.target.value))
        );
    }

    update() {
        const state = this.configManager.getState();
        
        // Update component visibility
        if (this.capsidStructure) {
            this.capsidStructure.visible = state.isCapsidVisible;
        }
        
        if (this.geneticMaterial) {
            this.geneticMaterial.visible = state.isGeneticMaterialVisible;
        }

        if (this.envelopeStructure) {
            this.envelopeStructure.visible = state.isEnvelopeVisible;
        }

        if (this.spikeProteins) {
            this.spikeProteins.visible = state.isSpikeVisible;
        }

        // Update clipping state
        // 因為剖面現在總是啟用，不需要在每一幀都去應用它
        //this.updateClipping(state.isCrossSection);
    }
    /*
    toggleCrossSection() {
        const isCrossSection = this.configManager.toggleCrossSection();
        this.updateClipping(isCrossSection);
        
        // Toggle helper visibility
        //this.clippingManager.toggleHelper();
    }
    */

    applyClippingToAll(enabled) {
        // Apply clipping to all components
        this.clippingManager.applyToMesh(this.capsidStructure, enabled);
        this.clippingManager.applyToMesh(this.geneticMaterial, enabled);
        this.clippingManager.applyToMesh(this.envelopeStructure, enabled);
        this.clippingManager.applyToMesh(this.spikeProteins, enabled);
    }

    adjustClippingPlane(value) {
        this.clippingManager.setPlaneConstant(value);
    }

    toggleCapsidVisibility() {
        const isVisible = this.configManager.toggleCapsidVisibility();
        if (this.capsidStructure) {
            this.capsidStructure.visible = isVisible;
        }
    }

    toggleGeneticVisibility() {
        const isVisible = this.configManager.toggleGeneticMaterialVisibility();
        if (this.geneticMaterial) {
            this.geneticMaterial.visible = isVisible;
        }
    }

    toggleEnvelopeVisibility() {        
        const isVisible = this.configManager.toggleEnvelopeVisibility();
        if (this.envelopeStructure) {
            this.envelopeStructure.visible = isVisible;
        }
    }

    toggleSpikeVisibility() {
        const isVisible = this.configManager.toggleSpikeVisibility();
        if (this.spikeProteins) {
            this.spikeProteins.visible = isVisible;
        }
    }

    setOpacity(opacity) {
        console.log('Setting opacity to:', opacity);
        //this.capsidManager.setOpacity(opacity);
        this.envelopeManager.setOpacity(opacity);
        this.spikeManager.setOpacity(opacity);
    }

    // Configuration methods
    updateConfig(section, config) {
        this.configManager.updateConfig(section, config);
        this.refreshComponents(section);
    }

    refreshComponents(section) {
        switch(section) {
            case 'capsid':
                this.capsidManager.updateConfig(this.configManager.getConfig('capsid'));
                this.scene.remove(this.capsidStructure);
                this.capsidStructure = this.capsidManager.createCapsidStructure();
                this.scene.add(this.capsidStructure);
                break;
                
            case 'genetic':
                this.geneticManager.updateConfig(this.configManager.getConfig('genetic'));
                this.scene.remove(this.geneticMaterial);
                this.geneticMaterial = this.geneticManager.createGeneticMaterial();
                this.scene.add(this.geneticMaterial);
                break;

            case 'envelope':
                this.envelopeManager.updateConfig(this.configManager.getConfig('envelope'));
                this.scene.remove(this.envelopeStructure);
                this.envelopeStructure = this.envelopeManager.createEnvelope();
                this.scene.add(this.envelopeStructure);
                break;

            case 'spike':


                 // --- 確保更新 spike 時也使用正確的包膜半徑 ---
                 // 新增以下四行代碼
                 // 獲取當前的包膜半徑配置

                 const envelopeRadius = this.configManager.getConfig('envelope').radius;
                 const spikeConfig = {
                     ...this.configManager.getConfig('spike'),
                     surfaceRadius: envelopeRadius // 重新應用包膜半徑
                 };

                 this.spikeManager.updateConfig(spikeConfig);
                 this.scene.remove(this.spikeProteins);
                 this.spikeProteins = this.spikeManager.createSpikes();
                 this.scene.add(this.spikeProteins);
                 break;               
                
            case 'scene':
                const sceneConfig = this.configManager.getConfig('scene');
                // Update scene configuration as needed
                break;

            case 'clipping':
                this.clippingManager.updateConfig(config);
                break;
        }

        // Reapply clipping if enabled
        if (this.configManager.getState().isCrossSection) {
            this.applyClippingToAll(true); // <--- 在重建後重新應用剖面
        }
    }
}