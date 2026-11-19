/**
 * Taiwan 3D Topography & Bathymetry Visualizer
 * Water Module - Dynamic Sea Level Mesh, Waves & Environmental Simulation
 */

class WaterSimulation {
  constructor(scene, terrainManager) {
    this.scene = scene;
    this.terrain = terrainManager;

    this.waterMesh = null;
    this.waterMaterial = null;
    this.waterLevel = 0.0; // in meters
    this.targetWaterLevel = 0.0;
    this.isLerping = false;
    this.lerpSpeed = 0.06;

    // Animation status
    this.isAnimating = false;
    this.animScenario = 'all_cycle';
    this.animSpeed = 1.0;
    this.animTime = 0.0;

    // Simulation presets
    this.presets = [];

    this.initWaterMesh();
  }

  initWaterMesh() {
    const geo = new THREE.PlaneGeometry(this.terrain.worldWidth * 1.05, this.terrain.worldHeight * 1.05, 64, 64);
    geo.rotateX(-Math.PI / 2);

    // Tranquil flat hydrostatic water plane (no wave ripples or wave distortion)
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: { value: this.terrain.computeSunDirection() },
        uWaterColor: { value: new THREE.Color(0x0088cc) },
        uDeepWaterColor: { value: new THREE.Color(0x005588) },
        uOpacity: { value: 0.62 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vec3 pos = position; // Smooth flat hydrostatic water level

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));

          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        uniform vec3 uSunDirection;
        uniform vec3 uWaterColor;
        uniform vec3 uDeepWaterColor;
        uniform float uOpacity;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 norm = normalize(vNormal);

          // Subtle natural Fresnel edge reflection without wave glitter
          float fresnel = pow(1.0 - max(dot(viewDir, norm), 0.0), 2.5);
          fresnel = clamp(fresnel, 0.1, 0.6);

          vec3 baseColor = mix(uWaterColor, uDeepWaterColor, 0.35);
          vec3 finalColor = mix(baseColor, vec3(0.7, 0.9, 1.0), fresnel * 0.4);

          gl_FragColor = vec4(finalColor, uOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.waterMesh = new THREE.Mesh(geo, this.waterMaterial);
    this.updateMeshPosition();
    this.scene.add(this.waterMesh);
  }

  setPresets(presetsList) {
    this.presets = presetsList || [];
  }

  updateMeshPosition() {
    if (!this.waterMesh) return;
    const yPos = this.waterLevel * this.terrain.scaleFactor * this.terrain.exaggeration;
    this.waterMesh.position.y = yPos;
  }

  setWaterLevel(level, animate = false) {
    const clamped = Math.max(-7000, Math.min(100, level));
    if (animate) {
      this.targetWaterLevel = clamped;
      this.isLerping = true;
    } else {
      this.waterLevel = clamped;
      this.targetWaterLevel = clamped;
      this.isLerping = false;
      this.applyWaterLevel();
    }
  }

  applyWaterLevel() {
    this.updateMeshPosition();
    this.terrain.setWaterLevel(this.waterLevel);
    this.dispatchWaterChangeEvent();
  }

  dispatchWaterChangeEvent() {
    const event = new CustomEvent('waterchange', {
      detail: {
        level: this.waterLevel,
        stats: this.calculateEnvironmentalStats()
      }
    });
    window.dispatchEvent(event);
  }

  calculateEnvironmentalStats() {
    const dem = this.terrain.demArray;
    if (!dem) return { landPercent: 0, straitState: '海峽', taipeiState: '陸地' };

    const totalCount = dem.length;
    let aboveCount = 0;
    // Fast sampled loop for performance
    const step = 8;
    let sampledCount = 0;
    for (let i = 0; i < totalCount; i += step) {
      if (dem[i] > this.waterLevel) aboveCount++;
      sampledCount++;
    }

    const landPercent = ((aboveCount / sampledCount) * 100).toFixed(1);

    // Taiwan Strait status (average shelf depth -60m)
    let straitState = '海洋海峽';
    if (this.waterLevel <= -100) {
      straitState = '完全陸橋 (連通大陸)';
    } else if (this.waterLevel <= -50) {
      straitState = '淺灘沙洲 (大部出露)';
    } else if (this.waterLevel <= -20) {
      straitState = '極淺水道 (群島群立)';
    } else if (this.waterLevel >= 20) {
      straitState = '寬廣深邃海峽';
    }

    // Taipei basin elevation ~15m
    let taipeiState = '正常乾燥盆地';
    if (this.waterLevel >= 25) {
      taipeiState = '台北內海完全成形';
    } else if (this.waterLevel >= 15) {
      taipeiState = '台北盆地嚴重淹水 (台北湖)';
    } else if (this.waterLevel >= 5) {
      taipeiState = '淡水河口倒灌侵襲';
    } else if (this.waterLevel >= 1) {
      taipeiState = '沿海潮汐防洪警戒';
    }

    return { landPercent, straitState, taipeiState };
  }

  toggleAnimation(forceState) {
    this.isAnimating = (forceState !== undefined) ? forceState : !this.isAnimating;
    return this.isAnimating;
  }

  setAnimationScenario(scenario) {
    this.animScenario = scenario;
    this.animTime = 0.0;
  }

  setAnimationSpeed(speed) {
    this.animSpeed = parseFloat(speed);
  }

  update(delta) {
    if (!this.waterMesh) return;

    // Smooth lerp when moving between presets
    if (this.isLerping) {
      const diff = this.targetWaterLevel - this.waterLevel;
      if (Math.abs(diff) < 0.2) {
        this.waterLevel = this.targetWaterLevel;
        this.isLerping = false;
      } else {
        this.waterLevel += diff * this.lerpSpeed;
      }
      this.applyWaterLevel();
    }

    // Autonomous animation cycle
    if (this.isAnimating) {
      this.animTime += delta * this.animSpeed;
      let newLevel = this.waterLevel;

      if (this.animScenario === 'all_cycle') {
        // Continuous smooth wave between -7000 and +66
        // Use non-linear sinusoidal transformation to spend more time around key transitions (-120m to +10m)
        const t = (Math.sin(this.animTime * 0.3) + 1.0) * 0.5; // 0 to 1
        if (t < 0.6) {
          // -7000m to -120m (drained to ice age)
          newLevel = -7000 + (t / 0.6) * 6880;
        } else {
          // -120m to +66m (human history to global melt)
          const subT = (t - 0.6) / 0.4;
          newLevel = -120 + subT * 186;
        }
      } else if (this.animScenario === 'drain') {
        // Drain 0m down to -7000m and loop
        const t = (this.animTime * 0.25) % 1.0;
        newLevel = 0 - t * 7000;
      } else if (this.animScenario === 'ice_age') {
        // Ping-pong between 0m and -120m
        const t = (Math.sin(this.animTime * 0.6) + 1.0) * 0.5;
        newLevel = -t * 120;
      } else if (this.animScenario === 'sea_rise') {
        // Ping-pong between 0m and +66m
        const t = (Math.sin(this.animTime * 0.6) + 1.0) * 0.5;
        newLevel = t * 66;
      }

      this.waterLevel = newLevel;
      this.targetWaterLevel = newLevel;
      this.applyWaterLevel();
    }
  }

  setVisible(visible) {
    if (this.waterMesh) {
      this.waterMesh.visible = visible;
    }
  }
}
