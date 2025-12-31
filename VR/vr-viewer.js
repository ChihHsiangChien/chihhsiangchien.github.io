/**
 * 360 VR 查看器核心模块
 * 支持配置化场景和主题
 */

class VRViewer {
    constructor(config) {
        this.config = config;
        this.currentScene = config.initialScene || 'scene1';
        this.engine = null;
        this.scene = null;
        this.camera = null;
        this.sphere = null;
        this.mat = null;
        this.currentFov = null;
        
        this.canvas = document.getElementById(config.canvasId || 'renderCanvas');
        this.hotspots = config.hotspots || {};
    }

    /**
     * 初始化VR查看器
     */
    init() {
        // 创建初始化函数
        const initializeViewer = () => {
            this.setupEngine();
            this.setupCamera();
            this.setupSphere();
            this.setupLighting();
            this.setupSceneSelector();
            this.setupZoomControl();
            this.setupClickCopy();
            this.loadScene(this.currentScene);
            this.startRenderLoop();
        };
        
        // 检查 DOM 是否已加载
        if (document.readyState === 'loading') {
            // DOM 还在加载中，等待 DOMContentLoaded 事件
            window.addEventListener('DOMContentLoaded', initializeViewer);
        } else {
            // DOM 已经加载完成，直接初始化
            initializeViewer();
        }
    }

    /**
     * 设置引擎和场景
     */
    setupEngine() {
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
    }

    /**
     * 设置相机
     */
    setupCamera() {
        this.camera = new BABYLON.ArcRotateCamera(
            "camera", 
            0, 
            Math.PI/2, 
            0.1, 
            BABYLON.Vector3.Zero(), 
            this.scene
        );
        this.camera.attachControl(this.canvas, true);
        this.camera.fov = Math.PI / 2;
        
        // 锁定相机距离
        this.camera.lowerRadiusLimit = 0.1;
        this.camera.upperRadiusLimit = 0.1;
        
        // 应用初始视角
        const initialSceneData = this.hotspots[this.currentScene];
        if (initialSceneData && initialSceneData.initialView) {
            this.camera.alpha = initialSceneData.initialView.alpha;
            this.camera.beta = initialSceneData.initialView.beta;
        }
    }

    /**
     * 设置球体和材质
     */
    setupSphere() {
        this.sphere = BABYLON.MeshBuilder.CreateSphere(
            "sphere", 
            { segments: 32, diameter: 1000 }, 
            this.scene
        );
        
        this.mat = new BABYLON.StandardMaterial("mat", this.scene);
        const sceneData = this.hotspots[this.currentScene];
        
        // 应用方向设置
        if (sceneData && sceneData.direction) {
            this.sphere.scaling.x = sceneData.direction.sphereScaleX;
            this.sphere.scaling.y = sceneData.direction.sphereScaleY;
        } else {
            this.sphere.scaling.x = -1;
            this.sphere.scaling.y = -1;
        }
        
        // 加载纹理
        console.log(`📸 加载纹理: ${sceneData.texture}`);
        const texture = new BABYLON.Texture(sceneData.texture, this.scene);
        this.mat.diffuseTexture = texture;
        
        // 添加纹理加载监听器（如果observable可用）
        if (texture.onLoadObservable) {
            texture.onLoadObservable.add(() => {
                console.log(`✓ 纹理加载成功: ${sceneData.texture}`);
            });
        }
        if (texture.onErrorObservable) {
            texture.onErrorObservable.add((error) => {
                console.error(`✗ 纹理加载失败: ${sceneData.texture}`, error);
            });
        }
        
        if (sceneData && sceneData.direction) {
            this.mat.diffuseTexture.uScale = sceneData.direction.uScale;
            this.mat.diffuseTexture.vScale = sceneData.direction.vScale;
        } else {
            this.mat.diffuseTexture.uScale = -1;
            this.mat.diffuseTexture.vScale = -1;
        }
        
        this.mat.backFaceCulling = false;
        this.sphere.material = this.mat;
    }

    /**
     * 设置光照
     */
    setupLighting() {
        const light = new BABYLON.HemisphericLight(
            "light", 
            new BABYLON.Vector3(0, 1, 0), 
            this.scene
        );
        light.intensity = 1;
    }

    /**
     * 设置场景选择器
     */
    setupSceneSelector() {
        const container = document.getElementById('scene-selector');
        if (!container) return;
        
        const sceneList = document.createElement('div');
        sceneList.className = 'scene-list';
        
        // 遍历所有场景
        Object.keys(this.hotspots).forEach(sceneKey => {
            const sceneData = this.hotspots[sceneKey];
            const button = document.createElement('button');
            button.className = 'scene-btn';
            button.textContent = sceneData.name;
            button.dataset.scene = sceneKey;
            
            // 设置初始选中状态
            if (sceneKey === this.currentScene) {
                button.classList.add('active');
            }
            
            button.addEventListener('click', () => {
                // 更新所有按钮的active状态
                document.querySelectorAll('.scene-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');
                
                // 加载场景
                this.loadScene(sceneKey);
            });
            
            sceneList.appendChild(button);
        });
        
        // 添加展开/收起按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'scene-selector-toggle';
        toggleBtn.textContent = '📋';
        toggleBtn.title = '切换场景';
        
        toggleBtn.addEventListener('click', () => {
            sceneList.classList.toggle('visible');
            toggleBtn.classList.toggle('active');
        });
        
        container.appendChild(toggleBtn);
        container.appendChild(sceneList);
    }

    /**
     * 设置缩放控制
     */
    setupZoomControl() {
        this.currentFov = this.camera.fov;
        const minFov = Math.PI / 8;
        const maxFov = Math.PI / 2;
        const zoomStep = Math.PI / 36;
        
        const updateZoom = (newFov) => {
            this.currentFov = Math.max(minFov, Math.min(maxFov, newFov));
            this.camera.fov = this.currentFov;
        };
        
        document.addEventListener('wheel', (e) => {
            const delta = Math.sign(e.deltaY) * zoomStep;
            updateZoom(this.currentFov + delta);
        });
        
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                updateZoom(this.currentFov - zoomStep);
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                updateZoom(this.currentFov + zoomStep);
            });
        }
    }

    /**
     * 设置点击复制功能
     */
    setupClickCopy() {
        this.canvas.addEventListener('click', (e) => {
            const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
            if (pickInfo && pickInfo.hit && pickInfo.pickedMesh === this.sphere) {
                const hitPoint = pickInfo.pickedPoint;
                const normalized = hitPoint.normalize();
                
                const alpha = this.camera.alpha.toFixed(4);
                const beta = this.camera.beta.toFixed(4);
                const fov = this.camera.fov.toFixed(4);
                
                const coordText = `position: new BABYLON.Vector3(${normalized.x.toFixed(4)}, ${normalized.y.toFixed(4)}, ${normalized.z.toFixed(4)})\nalpha: ${alpha}\nbeta: ${beta}\ninitialFov: ${fov}`;
                
                navigator.clipboard.writeText(coordText).then(() => {
                    const debugInfo = document.getElementById('debug-info');
                    if (debugInfo) {
                        const originalBg = debugInfo.style.background;
                        debugInfo.style.background = 'rgba(0, 255, 0, 0.3)';
                        setTimeout(() => {
                            debugInfo.style.background = originalBg;
                        }, 200);
                    }
                    console.log('✓ 座标已复制:', coordText);
                });
            }
        });
    }

    /**
     * 加载场景
     */
    loadScene(sceneKey) {
        this.currentScene = sceneKey;
        const sceneData = this.hotspots[sceneKey];
        
        if (!sceneData) {
            console.error('Scene not found:', sceneKey);
            return;
        }
        
        // 更新场景名称
        const sceneNameEl = document.getElementById('scene-name');
        if (sceneNameEl) {
            sceneNameEl.textContent = sceneData.name;
        }
        
        // 清空旧hotspots
        const container = document.getElementById('hotspots-container');
        if (container) {
            container.innerHTML = '';
        }
        
        // 应用方向设置
        if (sceneData.direction) {
            this.sphere.scaling.x = sceneData.direction.sphereScaleX;
            this.sphere.scaling.y = sceneData.direction.sphereScaleY;
        }
        
        // 更改纹理
        this.mat.diffuseTexture.dispose();
        console.log(`📸 加载纹理: ${sceneData.texture}`);
        const newTexture = new BABYLON.Texture(sceneData.texture, this.scene);
        this.mat.diffuseTexture = newTexture;
        
        // 添加纹理加载监听器（如果observable可用）
        if (newTexture.onLoadObservable) {
            newTexture.onLoadObservable.add(() => {
                console.log(`✓ 纹理加载成功: ${sceneData.texture}`);
            });
        }
        if (newTexture.onErrorObservable) {
            newTexture.onErrorObservable.add((error) => {
                console.error(`✗ 纹理加载失败: ${sceneData.texture}`, error);
            });
        }
        
        if (sceneData.direction) {
            this.mat.diffuseTexture.uScale = sceneData.direction.uScale;
            this.mat.diffuseTexture.vScale = sceneData.direction.vScale;
        } else {
            this.mat.diffuseTexture.uScale = -1;
            this.mat.diffuseTexture.vScale = -1;
        }
        
        // 应用初始视角
        if (sceneData.initialView) {
            this.camera.alpha = sceneData.initialView.alpha;
            this.camera.beta = sceneData.initialView.beta;
        }
        
        // 应用初始FOV
        if (sceneData.initialFov !== undefined) {
            this.camera.fov = sceneData.initialFov;
            this.currentFov = sceneData.initialFov;
        }
        
        // 更新hotspots
        this.updateHotspotPositions();
        
        console.log('✓ Loaded scene:', sceneData.name);
    }

    /**
     * 更新Hotspot位置
     */
    updateHotspotPositions() {
        const container = document.getElementById('hotspots-container');
        if (!container) return;
        
        const sceneData = this.hotspots[this.currentScene];
        if (!sceneData || !sceneData.portals) return;
        
        sceneData.portals.forEach((portal, index) => {
            let hotspot = document.getElementById(`portal-${index}`);
            
            if (!hotspot) {
                hotspot = document.createElement('div');
                hotspot.id = `portal-${index}`;
                
                const isEntrance = portal.name.includes('←');
                hotspot.className = isEntrance ? 'portal-hotspot entrance' : 'portal-hotspot';
                
                // 在 hotspot 内部显示 portal 名称
                hotspot.innerHTML = portal.name;
                hotspot.style.fontSize = '12px';
                hotspot.style.fontWeight = 'bold';
                hotspot.style.color = isEntrance ? 'rgba(0, 200, 100, 1)' : 'rgba(100, 160, 255, 1)';
                hotspot.style.textAlign = 'center';
                hotspot.style.lineHeight = '1.2';
                hotspot.style.padding = '5px';
                hotspot.style.wordWrap = 'break-word';
                hotspot.style.overflow = 'hidden';
                hotspot.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.9)';
                
                hotspot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.loadScene(portal.target);
                });
                
                container.appendChild(hotspot);
            }
            
            // 计算3D坐标在屏幕上的位置
            const worldPos = portal.position.scale(500);
            const viewMatrix = this.camera.getViewMatrix();
            const projectionMatrix = this.camera.getProjectionMatrix();
            const screenPos = BABYLON.Vector3.Project(
                worldPos,
                BABYLON.Matrix.Identity(),
                viewMatrix.multiply(projectionMatrix),
                this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight())
            );
            
            // 只在坐标在屏幕内时显示
            if (screenPos.z > 0 && screenPos.z < 1 && 
                screenPos.x > 0 && screenPos.x < this.engine.getRenderWidth() &&
                screenPos.y > 0 && screenPos.y < this.engine.getRenderHeight()) {
                
                hotspot.style.display = 'flex';
                hotspot.style.left = (screenPos.x - 30) + 'px';
                hotspot.style.top = (screenPos.y - 30) + 'px';
            } else {
                hotspot.style.display = 'none';
            }
        });
    }

    /**
     * 更新调试信息
     */
    updateDebugInfo() {
        const alphaEl = document.getElementById('debug-alpha');
        const betaEl = document.getElementById('debug-beta');
        const fovEl = document.getElementById('debug-fov');
        
        if (alphaEl) alphaEl.textContent = this.camera.alpha.toFixed(4);
        if (betaEl) betaEl.textContent = this.camera.beta.toFixed(4);
        if (fovEl) fovEl.textContent = this.camera.fov.toFixed(4);
        
        const pickInfo = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (pickInfo && pickInfo.hit && pickInfo.pickedMesh === this.sphere) {
            const hitPoint = pickInfo.pickedPoint;
            const normalized = hitPoint.normalize();
            
            const xEl = document.getElementById('debug-x');
            const yEl = document.getElementById('debug-y');
            const zEl = document.getElementById('debug-z');
            
            if (xEl) xEl.textContent = normalized.x.toFixed(4);
            if (yEl) yEl.textContent = normalized.y.toFixed(4);
            if (zEl) zEl.textContent = normalized.z.toFixed(4);
        }
    }

    /**
     * 启动渲染循环
     */
    startRenderLoop() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
            this.updateHotspotPositions();
            this.updateDebugInfo();
        });
        
        window.addEventListener('resize', () => this.engine.resize());
    }
}
