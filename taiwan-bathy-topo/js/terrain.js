/**
 * Taiwan 3D Topography & Bathymetry Visualizer
 * Terrain Module - DEM Processing, Mesh Generation & Custom Shaders
 */

class TerrainManager {
  constructor(scene) {
    this.scene = scene;
    this.meta = null;
    this.demArray = null; // Int16Array
    this.mesh = null;
    this.geometry = null;
    this.material = null;

    // World Dimensions (3D scene units)
    this.worldWidth = 120.0;
    this.worldHeight = 100.0;
    // Real horizontal span is ~800 km, so 1 world unit = ~6670 meters
    this.scaleFactor = 1.0 / 6670.0;

    // Default configuration
    this.exaggeration = 10.0;
    this.waterLevel = 0.0; // meters
    this.theme = 0; // 0: hypsometric, 1: natural, 2: scifi, 3: hillshade
    this.contourEnabled = true;
    this.contourInterval = 200.0; // meters
    this.contourOpacity = 0.6;
    this.sunAngle = 315.0; // degrees (Northwest light standard in cartography)

    // Grid resolution for 3D PlaneGeometry (384x320 is optimal balance of fidelity and mobile 60fps)
    this.gridW = 384;
    this.gridH = 320;
  }

  async load(onProgress) {
    if (onProgress) onProgress(0.1, "讀取高程數據庫中繼資料 (meta.json)...");
    const metaResp = await fetch("data/meta.json");
    if (!metaResp.ok) throw new Error("Failed to load data/meta.json");
    this.meta = await metaResp.json();

    if (onProgress) onProgress(0.3, "下載高程二進制陣列 (taiwan_dem.bin)...");
    const demResp = await fetch("data/taiwan_dem.bin");
    if (!demResp.ok) throw new Error("Failed to load data/taiwan_dem.bin");
    const buffer = await demResp.arrayBuffer();
    this.demArray = new Int16Array(buffer);

    if (onProgress) onProgress(0.7, "建構 3D 數值高程網格與著色器...");
    this.buildMesh();

    if (onProgress) onProgress(1.0, "載入完成！");
    return this.meta;
  }

  buildMesh() {
    const w = this.gridW;
    const h = this.gridH;
    const demW = this.meta.width; // 768
    const demH = this.meta.height; // 640

    // Create PlaneGeometry lying flat in X-Z plane
    this.geometry = new THREE.PlaneGeometry(this.worldWidth, this.worldHeight, w - 1, h - 1);
    this.geometry.rotateX(-Math.PI / 2); // Orient X horizontally, Z vertically, Y up

    const count = w * h;
    const elevations = new Float32Array(count);
    const pos = this.geometry.attributes.position.array;

    for (let j = 0; j < h; j++) {
      const v = j / (h - 1);
      for (let i = 0; i < w; i++) {
        const u = i / (w - 1);
        const idx = j * w + i;
        const elev = this.sampleElevation(u, v);
        elevations[idx] = elev;
        // pos[idx * 3 + 1] is Y (elevation)
        pos[idx * 3 + 1] = elev * this.scaleFactor * this.exaggeration;
      }
    }

    this.geometry.setAttribute('elevation', new THREE.BufferAttribute(elevations, 1));
    this.geometry.computeVertexNormals();

    // Custom ShaderMaterial for realistic Hypsometric / Bathymetric coloring & GPU Contours
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uWaterLevel: { value: this.waterLevel },
        uExaggeration: { value: this.exaggeration },
        uScaleFactor: { value: this.scaleFactor },
        uTheme: { value: this.theme },
        uContourEnabled: { value: this.contourEnabled ? 1.0 : 0.0 },
        uContourInterval: { value: this.contourInterval },
        uContourOpacity: { value: this.contourOpacity },
        uSunDirection: { value: this.computeSunDirection() },
        uProfileActive: { value: 0.0 },
        uProfileP1: { value: new THREE.Vector2(0, 0) },
        uProfileP2: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader: `
        attribute float elevation;
        varying float vElevation;
        varying vec2 vUv;
        varying vec3 vNormalWorld;
        varying vec3 vWorldPos;
        uniform float uExaggeration;
        uniform float uScaleFactor;

        void main() {
          vElevation = elevation;
          vUv = uv;
          
          vec3 displacedPos = position;
          displacedPos.y = elevation * uScaleFactor * uExaggeration;

          vec4 worldPosition = modelMatrix * vec4(displacedPos, 1.0);
          vWorldPos = worldPosition.xyz;
          vNormalWorld = normalize(normalMatrix * normal);

          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        varying float vElevation;
        varying vec2 vUv;
        varying vec3 vNormalWorld;
        varying vec3 vWorldPos;

        uniform float uWaterLevel;
        uniform int uTheme;
        uniform float uContourEnabled;
        uniform float uContourInterval;
        uniform float uContourOpacity;
        uniform vec3 uSunDirection;

        // Hypsometric & Bathymetric Color Ramps
        vec3 getTheme0Color(float elev) {
          // Classic Hypsometric with Sandy Seafloor & Distinct Blue Water
          if (elev < -4000.0) {
            float t = smoothstep(-6800.0, -4000.0, elev);
            return mix(vec3(0.22, 0.17, 0.14), vec3(0.38, 0.30, 0.22), t); // Deep trench basalt / bedrock
          } else if (elev < -1000.0) {
            float t = smoothstep(-4000.0, -1000.0, elev);
            return mix(vec3(0.38, 0.30, 0.22), vec3(0.58, 0.48, 0.34), t); // Abyssal benthic silt
          } else if (elev < -150.0) {
            float t = smoothstep(-1000.0, -150.0, elev);
            return mix(vec3(0.58, 0.48, 0.34), vec3(0.78, 0.68, 0.48), t); // Continental slope sediment
          } else if (elev < 0.0) {
            float t = smoothstep(-150.0, 0.0, elev);
            return mix(vec3(0.78, 0.68, 0.48), vec3(0.88, 0.80, 0.62), t); // Shallow sandy shelf (Taiwan Strait)
          } else if (elev < 100.0) {
            float t = smoothstep(0.0, 100.0, elev);
            return mix(vec3(0.24, 0.58, 0.32), vec3(0.38, 0.72, 0.42), t); // Coastal plains
          } else if (elev < 800.0) {
            float t = smoothstep(100.0, 800.0, elev);
            return mix(vec3(0.38, 0.72, 0.42), vec3(0.68, 0.82, 0.48), t); // Hills & lowlands
          } else if (elev < 1800.0) {
            float t = smoothstep(800.0, 1800.0, elev);
            return mix(vec3(0.68, 0.82, 0.48), vec3(0.82, 0.72, 0.45), t); // Mid-altitude
          } else if (elev < 3000.0) {
            float t = smoothstep(1800.0, 3000.0, elev);
            return mix(vec3(0.82, 0.72, 0.45), vec3(0.65, 0.45, 0.28), t); // High mountains
          } else {
            float t = smoothstep(3000.0, 3952.0, elev);
            return mix(vec3(0.65, 0.45, 0.28), vec3(0.95, 0.96, 0.98), t); // Alpine peaks / snow
          }
        }

        vec3 getTheme1Color(float elev) {
          // Natural Satellite with Sandy / Clay Seafloor
          if (elev < 0.0) {
            float t = smoothstep(-6800.0, 0.0, elev);
            return mix(vec3(0.20, 0.16, 0.13), vec3(0.85, 0.76, 0.58), t);
          } else if (elev < 500.0) {
            float t = smoothstep(0.0, 500.0, elev);
            return mix(vec3(0.16, 0.38, 0.22), vec3(0.26, 0.50, 0.28), t);
          } else if (elev < 2000.0) {
            float t = smoothstep(500.0, 2000.0, elev);
            return mix(vec3(0.26, 0.50, 0.28), vec3(0.48, 0.45, 0.32), t);
          } else {
            float t = smoothstep(2000.0, 3952.0, elev);
            return mix(vec3(0.48, 0.45, 0.32), vec3(0.82, 0.80, 0.78), t);
          }
        }

        vec3 getTheme2Color(float elev) {
          // Sci-Fi Neon / Radar Bathymetry
          if (elev < 0.0) {
            float t = smoothstep(-6800.0, 0.0, elev);
            return mix(vec3(0.02, 0.02, 0.10), vec3(0.0, 0.94, 1.0), t);
          } else {
            float t = smoothstep(0.0, 3952.0, elev);
            return mix(vec3(0.0, 0.94, 1.0), vec3(1.0, 0.0, 0.5), t);
          }
        }

        vec3 getTheme3Color(float elev) {
          // Hillshade Monochromatic
          float t = smoothstep(-6800.0, 3952.0, elev);
          return mix(vec3(0.12, 0.14, 0.18), vec3(0.92, 0.94, 0.96), t);
        }

        void main() {
          vec3 baseColor;
          if (uTheme == 0) {
            baseColor = getTheme0Color(vElevation);
          } else if (uTheme == 1) {
            baseColor = getTheme1Color(vElevation);
          } else if (uTheme == 2) {
            baseColor = getTheme2Color(vElevation);
          } else {
            baseColor = getTheme3Color(vElevation);
          }

          // Shading: Sun Direction Diffuse + Ambient
          vec3 norm = normalize(vNormalWorld);
          float diff = max(dot(norm, uSunDirection), 0.0);
          float ambient = 0.45;
          vec3 shadedColor = baseColor * (diff * 0.75 + ambient);

          // Real-time Procedural Vector Contour Lines (GPU Isocontours)
          if (uContourEnabled > 0.5) {
            float interval = uContourInterval;
            float f = abs(fract((vElevation + 10000.0) / interval - 0.5) - 0.5);
            float df = fwidth((vElevation + 10000.0) / interval);
            float line = 1.0 - smoothstep(0.0, max(df * 1.5, 0.001), f);

            // Index Contour every 5x interval (thicker and darker)
            float f5 = abs(fract((vElevation + 10000.0) / (interval * 5.0) - 0.5) - 0.5);
            float df5 = fwidth((vElevation + 10000.0) / (interval * 5.0));
            float indexLine = 1.0 - smoothstep(0.0, max(df5 * 2.0, 0.001), f5);

            // Crisp contours: dark olive for land, dark earth-bronze for sandy seabed
            vec3 contourColor = (vElevation >= 0.0) ? vec3(0.10, 0.06, 0.02) : vec3(0.32, 0.22, 0.14);
            float lineAlpha = max(line * 0.5, indexLine * 0.85) * uContourOpacity;
            shadedColor = mix(shadedColor, contourColor, lineAlpha);
          }

          // Sea level inundation indicator tint:
          // If elevation is below active water level, add subtle aquatic blue absorption
          if (vElevation < uWaterLevel) {
            float depth = uWaterLevel - vElevation;
            float waterAbsorb = clamp(depth / 3500.0, 0.0, 0.35);
            shadedColor = mix(shadedColor, vec3(0.02, 0.28, 0.45), waterAbsorb);
          }

          gl_FragColor = vec4(shadedColor, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    // Add Base skirt walls under the terrain box for visual finish
    this.buildBaseSkirt();
  }

  buildBaseSkirt() {
    // Adds solid base walls around the perimeter of the terrain plane
    const skirtColor = 0x060c18;
    const skirtMat = new THREE.MeshBasicMaterial({ color: skirtColor, side: THREE.DoubleSide });
    
    // Bottom cap
    const bottomGeo = new THREE.PlaneGeometry(this.worldWidth, this.worldHeight);
    bottomGeo.rotateX(Math.PI / 2);
    const bottomMesh = new THREE.Mesh(bottomGeo, skirtMat);
    bottomMesh.position.y = -7500.0 * this.scaleFactor * this.exaggeration;
    this.mesh.add(bottomMesh);
  }

  computeSunDirection() {
    const rad = THREE.MathUtils.degToRad(this.sunAngle);
    const altitudeRad = THREE.MathUtils.degToRad(45.0); // 45 degree sun elevation
    const x = Math.cos(rad) * Math.cos(altitudeRad);
    const z = Math.sin(rad) * Math.cos(altitudeRad);
    const y = Math.sin(altitudeRad);
    return new THREE.Vector3(x, y, z).normalize();
  }

  setExaggeration(val) {
    this.exaggeration = Math.max(1.0, Math.min(30.0, val));
    if (!this.mesh) return;

    this.material.uniforms.uExaggeration.value = this.exaggeration;

    // Update geometry vertex Y coordinates
    const w = this.gridW;
    const h = this.gridH;
    const pos = this.geometry.attributes.position.array;
    const elevs = this.geometry.attributes.elevation.array;

    for (let i = 0; i < w * h; i++) {
      pos[i * 3 + 1] = elevs[i] * this.scaleFactor * this.exaggeration;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  setWaterLevel(meters) {
    this.waterLevel = meters;
    if (this.material) {
      this.material.uniforms.uWaterLevel.value = meters;
    }
  }

  setTheme(themeId) {
    this.theme = parseInt(themeId, 10);
    if (this.material) {
      this.material.uniforms.uTheme.value = this.theme;
    }
  }

  setContours(enabled, interval, opacity) {
    this.contourEnabled = enabled;
    if (interval !== undefined) this.contourInterval = parseFloat(interval);
    if (opacity !== undefined) this.contourOpacity = parseFloat(opacity);

    if (this.material) {
      this.material.uniforms.uContourEnabled.value = this.contourEnabled ? 1.0 : 0.0;
      this.material.uniforms.uContourInterval.value = this.contourInterval;
      this.material.uniforms.uContourOpacity.value = this.contourOpacity;
    }
  }

  setSunAngle(degrees) {
    this.sunAngle = degrees;
    if (this.material) {
      this.material.uniforms.uSunDirection.value = this.computeSunDirection();
    }
  }

  /**
   * Sample elevation with bilinear interpolation from DEM Int16 grid
   * u, v in [0, 1] range
   */
  sampleElevation(u, v) {
    if (!this.demArray || !this.meta) return 0;
    const w = this.meta.width;
    const h = this.meta.height;

    const x = Math.max(0, Math.min(w - 1, u * (w - 1)));
    const y = Math.max(0, Math.min(h - 1, v * (h - 1)));

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(w - 1, x0 + 1);
    const y1 = Math.min(h - 1, y0 + 1);

    const fx = x - x0;
    const fy = y - y0;

    const v00 = this.demArray[y0 * w + x0];
    const v10 = this.demArray[y0 * w + x1];
    const v01 = this.demArray[y1 * w + x0];
    const v11 = this.demArray[y1 * w + x1];

    const v0 = v00 * (1 - fx) + v10 * fx;
    const v1 = v01 * (1 - fx) + v11 * fx;

    return v0 * (1 - fy) + v1 * fy;
  }

  /**
   * Geographic conversions: (lat, lon) <-> normalized (u, v) <-> 3D world (x, y, z)
   */
  latLonToUV(lat, lon) {
    // Web Mercator tile bounds based on zoom 8 tiles 211..216, 108..112
    const n = Math.pow(2.0, 8.0);
    const xtile = ((lon + 180.0) / 360.0) * n;
    const latRad = THREE.MathUtils.degToRad(lat);
    const ytile = (1.0 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2.0 * n;

    const u = (xtile - 211.0) / 6.0;
    const v = (ytile - 108.0) / 5.0;
    return { u: THREE.MathUtils.clamp(u, 0, 1), v: THREE.MathUtils.clamp(v, 0, 1) };
  }

  uvToLatLon(u, v) {
    const n = Math.pow(2.0, 8.0);
    const xtile = 211.0 + u * 6.0;
    const ytile = 108.0 + v * 5.0;

    const lon = (xtile / n) * 360.0 - 180.0;
    const latRad = Math.atan(Math.sinh(Math.PI * (1.0 - 2.0 * ytile / n)));
    const lat = THREE.MathUtils.radToDeg(latRad);
    return { lat, lon };
  }

  uvToWorld(u, v, elevMeters) {
    // PlaneGeometry extends from -worldWidth/2 to +worldWidth/2
    const x = (u - 0.5) * this.worldWidth;
    const z = (v - 0.5) * this.worldHeight;
    const elev = (elevMeters !== undefined) ? elevMeters : this.sampleElevation(u, v);
    const y = elev * this.scaleFactor * this.exaggeration;
    return new THREE.Vector3(x, y, z);
  }

  worldToUV(worldX, worldZ) {
    const u = (worldX / this.worldWidth) + 0.5;
    const v = (worldZ / this.worldHeight) + 0.5;
    return { u: THREE.MathUtils.clamp(u, 0, 1), v: THREE.MathUtils.clamp(v, 0, 1) };
  }
}
