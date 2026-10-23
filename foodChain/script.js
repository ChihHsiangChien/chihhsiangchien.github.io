/**
 * foodChain & foodWeb Consolidated Application Engine
 * Module 1: Simple Food Chain (Wolf - Sheep - Grass Spatial Simulation)
 * Module 2: Multi-Species Food Web (10-Species Taiwan Biodiversity Equilibrium)
 */

(function () {
  "use strict";

  // =========================================================================
  // 1. Dual-Mode Tab Navigation Manager
  // =========================================================================
  const tabSimpleBtn = document.getElementById("tab-simple");
  const tabComplexBtn = document.getElementById("tab-complex");
  const panelSimple = document.getElementById("panel-simple");
  const panelComplex = document.getElementById("panel-complex");

  let currentTab = "simple";

  function switchTab(target) {
    if (target === currentTab) return;
    currentTab = target;

    if (target === "simple") {
      tabSimpleBtn.classList.add("active");
      tabSimpleBtn.setAttribute("aria-selected", "true");
      tabComplexBtn.classList.remove("active");
      tabComplexBtn.setAttribute("aria-selected", "false");

      panelSimple.classList.add("active");
      panelComplex.classList.remove("active");

      // Trigger resize for simple canvas
      if (window.chainSim) {
        window.chainSim.handleResize();
      }
    } else {
      tabComplexBtn.classList.add("active");
      tabComplexBtn.setAttribute("aria-selected", "true");
      tabSimpleBtn.classList.remove("active");
      tabSimpleBtn.setAttribute("aria-selected", "false");

      panelComplex.classList.add("active");
      panelSimple.classList.remove("active");

      // Trigger resize for complex web and chart
      if (window.webSim) {
        window.webSim.handleResize();
      }
    }
  }

  if (tabSimpleBtn && tabComplexBtn) {
    tabSimpleBtn.addEventListener("click", () => switchTab("simple"));
    tabComplexBtn.addEventListener("click", () => switchTab("complex"));
  }

  // =========================================================================
  // 2. Unit 1: Simple Food Chain Spatial Simulation (Wolf-Sheep-Grass)
  // =========================================================================
  class SimpleChainSimulation {
    constructor() {
      this.canvas = document.getElementById("chainCanvas");
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");

      this.config = FoodChainData.simpleChain;
      this.isRunning = true;
      this.speedMultiplier = 1.0;
      this.tickCount = 0;

      // Sprites
      this.sprites = {
        wolf: new Image(),
        sheep: new Image(),
        grass: new Image()
      };
      this.sprites.wolf.src = "wolf.png";
      this.sprites.sheep.src = "sheep.png";
      this.sprites.grass.src = "grass.png";

      // Simulation Entities
      this.wolves = [];
      this.sheep = [];
      this.grassList = [];

      // Grid settings
      this.gridCols = 16;
      this.gridRows = 12;
      this.cellWidth = 50;
      this.cellHeight = 42;

      // HUD elements
      this.wolfCountEl = document.getElementById("wolfCount");
      this.sheepCountEl = document.getElementById("sheepCount");
      this.grassCountEl = document.getElementById("grassCount");
      this.statusEl = document.getElementById("chainStatus");
      this.playPauseBtn = document.getElementById("chainPlayPauseBtn");
      this.speedSlider = document.getElementById("chainSpeedSlider");
      this.speedValEl = document.getElementById("chainSpeedVal");

      this.initEventListeners();
      this.handleResize();
      this.reset();
      this.startLoop();
    }

    initEventListeners() {
      // Play / Pause
      if (this.playPauseBtn) {
        this.playPauseBtn.addEventListener("click", () => {
          this.isRunning = !this.isRunning;
          const icon = this.playPauseBtn.querySelector(".btn-icon");
          const text = this.playPauseBtn.querySelector(".btn-text");
          if (this.isRunning) {
            if (icon) icon.textContent = "⏸️";
            if (text) text.textContent = "暫停模擬";
            if (this.statusEl) this.statusEl.textContent = "運行中";
          } else {
            if (icon) icon.textContent = "▶️";
            if (text) text.textContent = "繼續模擬";
            if (this.statusEl) this.statusEl.textContent = "已暫停";
          }
        });
      }

      // Reset
      const resetBtn = document.getElementById("chainResetBtn");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => this.reset());
      }

      // Speed Slider
      if (this.speedSlider) {
        this.speedSlider.addEventListener("input", (e) => {
          this.speedMultiplier = parseFloat(e.target.value) || 1.0;
          if (this.speedValEl) {
            this.speedValEl.textContent = this.speedMultiplier.toFixed(1) + "x";
          }
        });
      }

      // Spawn buttons
      const spawnWolfBtn = document.getElementById("spawnWolfBtn");
      if (spawnWolfBtn) {
        spawnWolfBtn.addEventListener("click", () => this.spawnWolf());
      }

      const spawnSheepBtn = document.getElementById("spawnSheepBtn");
      if (spawnSheepBtn) {
        spawnSheepBtn.addEventListener("click", () => this.spawnSheep());
      }

      const spawnGrassBtn = document.getElementById("spawnGrassBtn");
      if (spawnGrassBtn) {
        spawnGrassBtn.addEventListener("click", () => this.spawnGrassGroup(5));
      }

      // Canvas click to spawn random organism
      this.canvas.addEventListener("click", (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const choices = ["wolf", "sheep", "grass"];
        const pick = choices[Math.floor(Math.random() * choices.length)];
        if (pick === "wolf") this.spawnWolf(x, y);
        else if (pick === "sheep") this.spawnSheep(x, y);
        else this.spawnGrass(x, y);
      });

      // Window Resize
      window.addEventListener("resize", () => this.handleResize());
    }

    handleResize() {
      if (!this.canvas) return;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width || 800;
      const height = window.innerWidth <= 768 ? 380 : 520;

      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = width + "px";
      this.canvas.style.height = height + "px";

      this.logicalWidth = width;
      this.logicalHeight = height;

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }

    reset() {
      this.wolves = [];
      this.sheep = [];
      this.grassList = [];
      this.tickCount = 0;

      const counts = this.config.initialCounts;
      // Spawn Grass
      for (let i = 0; i < counts.grass; i++) {
        this.spawnGrass();
      }
      // Spawn Sheep
      for (let i = 0; i < counts.sheep; i++) {
        this.spawnSheep();
      }
      // Spawn Wolves
      for (let i = 0; i < counts.wolf; i++) {
        this.spawnWolf();
      }

      this.updateHUD();
    }

    spawnGrass(x, y) {
      if (this.grassList.length >= this.config.maxGrassCapacity) return;
      const posX = x !== undefined ? x : 30 + Math.random() * (this.logicalWidth - 60);
      const posY = y !== undefined ? y : 30 + Math.random() * (this.logicalHeight - 60);
      this.grassList.push({
        x: posX,
        y: posY,
        lifespan: this.config.entities.grass.lifespan,
        maxLifespan: this.config.entities.grass.maxLifespan,
        size: 30
      });
    }

    spawnGrassGroup(num) {
      for (let i = 0; i < num; i++) {
        this.spawnGrass();
      }
    }

    spawnSheep(x, y) {
      const cfg = this.config.entities.sheep;
      const posX = x !== undefined ? x : 40 + Math.random() * (this.logicalWidth - 80);
      const posY = y !== undefined ? y : 40 + Math.random() * (this.logicalHeight - 80);
      const angle = Math.random() * Math.PI * 2;
      this.sheep.push({
        x: posX,
        y: posY,
        vx: Math.cos(angle) * cfg.speed,
        vy: Math.sin(angle) * cfg.speed,
        lifespan: cfg.lifespan,
        maxLifespan: cfg.maxLifespan,
        energy: cfg.energy,
        maxEnergy: cfg.maxEnergy,
        size: 34,
        reproduceTimer: 0
      });
    }

    spawnWolf(x, y) {
      const cfg = this.config.entities.wolf;
      const posX = x !== undefined ? x : 40 + Math.random() * (this.logicalWidth - 80);
      const posY = y !== undefined ? y : 40 + Math.random() * (this.logicalHeight - 80);
      const angle = Math.random() * Math.PI * 2;
      this.wolves.push({
        x: posX,
        y: posY,
        vx: Math.cos(angle) * cfg.speed,
        vy: Math.sin(angle) * cfg.speed,
        lifespan: cfg.lifespan,
        maxLifespan: cfg.maxLifespan,
        energy: cfg.energy,
        maxEnergy: cfg.maxEnergy,
        size: 38,
        reproduceTimer: 0
      });
    }

    update() {
      if (!this.isRunning) return;
      this.tickCount++;

      const speed = this.speedMultiplier;
      const sheepCfg = this.config.entities.sheep;
      const wolfCfg = this.config.entities.wolf;

      // 1. Natural Grass Regrowth
      if (this.tickCount % Math.max(1, Math.round(this.config.grassRegrowInterval / speed)) === 0) {
        if (this.grassList.length < this.config.maxGrassCapacity) {
          this.spawnGrass();
        }
      }

      // 2. Sheep AI, Movement, Grazing, and Reproduction
      const deadSheep = new Set();
      const deadGrass = new Set();
      const newSheep = [];

      for (let i = 0; i < this.sheep.length; i++) {
        const s = this.sheep[i];

        // Aging and energy decay
        s.lifespan -= 0.08 * speed;
        s.energy -= 0.12 * speed;
        s.reproduceTimer += 1 * speed;

        if (s.lifespan <= 0 || s.energy <= 0) {
          deadSheep.add(s);
          continue;
        }

        // Behavior: Flee from closest wolf if in danger
        let closestWolf = null;
        let minWolfDist = sheepCfg.detectionRadius;
        for (const w of this.wolves) {
          const dx = w.x - s.x;
          const dy = w.y - s.y;
          const dist = Math.hypot(dx, dy);
          if (dist < minWolfDist) {
            minWolfDist = dist;
            closestWolf = w;
          }
        }

        if (closestWolf) {
          // Flee in opposite direction
          const angle = Math.atan2(s.y - closestWolf.y, s.x - closestWolf.x);
          s.vx = Math.cos(angle) * sheepCfg.speed * 1.25;
          s.vy = Math.sin(angle) * sheepCfg.speed * 1.25;
        } else {
          // Seek closest grass if hungry
          let closestGrass = null;
          let minGrassDist = sheepCfg.detectionRadius * 1.5;
          for (const g of this.grassList) {
            if (deadGrass.has(g)) continue;
            const dist = Math.hypot(g.x - s.x, g.y - s.y);
            if (dist < minGrassDist) {
              minGrassDist = dist;
              closestGrass = g;
            }
          }

          if (closestGrass) {
            const angle = Math.atan2(closestGrass.y - s.y, closestGrass.x - s.x);
            s.vx = Math.cos(angle) * sheepCfg.speed;
            s.vy = Math.sin(angle) * sheepCfg.speed;

            // Eat grass when close
            if (minGrassDist < 26) {
              deadGrass.add(closestGrass);
              s.energy = Math.min(s.maxEnergy, s.energy + sheepCfg.eatGainEnergy);
              s.lifespan = Math.min(s.maxLifespan, s.lifespan + sheepCfg.eatGainLifespan);
            }
          } else {
            // Wander randomly
            if (Math.random() < 0.03) {
              const angle = Math.random() * Math.PI * 2;
              s.vx = Math.cos(angle) * sheepCfg.speed;
              s.vy = Math.sin(angle) * sheepCfg.speed;
            }
          }
        }

        // Position update
        s.x += s.vx * speed;
        s.y += s.vy * speed;

        // Boundary bounce
        if (s.x < 20) { s.x = 20; s.vx = Math.abs(s.vx); }
        if (s.x > this.logicalWidth - 20) { s.x = this.logicalWidth - 20; s.vx = -Math.abs(s.vx); }
        if (s.y < 20) { s.y = 20; s.vy = Math.abs(s.vy); }
        if (s.y > this.logicalHeight - 20) { s.y = this.logicalHeight - 20; s.vy = -Math.abs(s.vy); }

        // Reproduction
        if (
          s.energy >= sheepCfg.reproduceThreshold &&
          s.reproduceTimer >= sheepCfg.reproduceInterval &&
          this.sheep.length < 80
        ) {
          s.energy -= sheepCfg.reproduceEnergyCost;
          s.reproduceTimer = 0;
          newSheep.push({
            x: s.x + (Math.random() - 0.5) * 20,
            y: s.y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * sheepCfg.speed,
            vy: (Math.random() - 0.5) * sheepCfg.speed,
            lifespan: sheepCfg.lifespan,
            maxLifespan: sheepCfg.maxLifespan,
            energy: sheepCfg.energy,
            maxEnergy: sheepCfg.maxEnergy,
            size: 34,
            reproduceTimer: 0
          });
        }
      }

      // Remove consumed grass and dead sheep
      if (deadGrass.size > 0) {
        this.grassList = this.grassList.filter((g) => !deadGrass.has(g));
      }
      if (deadSheep.size > 0) {
        this.sheep = this.sheep.filter((s) => !deadSheep.has(s));
      }
      if (newSheep.length > 0) {
        this.sheep.push(...newSheep);
      }

      // 3. Wolf AI, Hunting, and Reproduction
      const deadWolves = new Set();
      const newWolves = [];
      const huntedSheep = new Set();

      for (let i = 0; i < this.wolves.length; i++) {
        const w = this.wolves[i];

        // Aging and energy decay
        w.lifespan -= 0.09 * speed;
        w.energy -= 0.16 * speed;
        w.reproduceTimer += 1 * speed;

        if (w.lifespan <= 0 || w.energy <= 0) {
          deadWolves.add(w);
          continue;
        }

        // Hunt closest sheep
        let targetSheep = null;
        let minSheepDist = wolfCfg.detectionRadius;
        for (const s of this.sheep) {
          if (huntedSheep.has(s)) continue;
          const dist = Math.hypot(s.x - w.x, s.y - w.y);
          if (dist < minSheepDist) {
            minSheepDist = dist;
            targetSheep = s;
          }
        }

        if (targetSheep) {
          // Chase target
          const angle = Math.atan2(targetSheep.y - w.y, targetSheep.x - w.x);
          w.vx = Math.cos(angle) * wolfCfg.speed;
          w.vy = Math.sin(angle) * wolfCfg.speed;

          // Catch and eat sheep!
          if (minSheepDist < 30) {
            huntedSheep.add(targetSheep);
            w.energy = Math.min(w.maxEnergy, w.energy + wolfCfg.eatGainEnergy);
            w.lifespan = Math.min(w.maxLifespan, w.lifespan + wolfCfg.eatGainLifespan);
          }
        } else {
          // Wander
          if (Math.random() < 0.02) {
            const angle = Math.random() * Math.PI * 2;
            w.vx = Math.cos(angle) * wolfCfg.speed * 0.7;
            w.vy = Math.sin(angle) * wolfCfg.speed * 0.7;
          }
        }

        // Position update
        w.x += w.vx * speed;
        w.y += w.vy * speed;

        // Boundary bounce
        if (w.x < 20) { w.x = 20; w.vx = Math.abs(w.vx); }
        if (w.x > this.logicalWidth - 20) { w.x = this.logicalWidth - 20; w.vx = -Math.abs(w.vx); }
        if (w.y < 20) { w.y = 20; w.vy = Math.abs(w.vy); }
        if (w.y > this.logicalHeight - 20) { w.y = this.logicalHeight - 20; w.vy = -Math.abs(w.vy); }

        // Reproduction
        if (
          w.energy >= wolfCfg.reproduceThreshold &&
          w.reproduceTimer >= wolfCfg.reproduceInterval &&
          this.wolves.length < 25
        ) {
          w.energy -= wolfCfg.reproduceEnergyCost;
          w.reproduceTimer = 0;
          newWolves.push({
            x: w.x + (Math.random() - 0.5) * 20,
            y: w.y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * wolfCfg.speed,
            vy: (Math.random() - 0.5) * wolfCfg.speed,
            lifespan: wolfCfg.lifespan,
            maxLifespan: wolfCfg.maxLifespan,
            energy: wolfCfg.energy,
            maxEnergy: wolfCfg.maxEnergy,
            size: 38,
            reproduceTimer: 0
          });
        }
      }

      // Remove hunted sheep & dead wolves
      if (huntedSheep.size > 0) {
        this.sheep = this.sheep.filter((s) => !huntedSheep.has(s));
      }
      if (deadWolves.size > 0) {
        this.wolves = this.wolves.filter((w) => !deadWolves.has(w));
      }
      if (newWolves.length > 0) {
        this.wolves.push(...newWolves);
      }

      // Update HUD periodically
      if (this.tickCount % 6 === 0) {
        this.updateHUD();
      }
    }

    render() {
      const ctx = this.ctx;
      const w = this.logicalWidth;
      const h = this.logicalHeight;

      ctx.clearRect(0, 0, w, h);

      // Subtle background ecological grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 1. Draw Grass
      for (const g of this.grassList) {
        if (this.sprites.grass.complete && this.sprites.grass.naturalWidth > 0) {
          ctx.drawImage(this.sprites.grass, g.x - g.size / 2, g.y - g.size / 2, g.size, g.size);
        } else {
          // Fallback procedural grass
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(g.x, g.y, g.size / 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Draw Sheep
      for (const s of this.sheep) {
        const sz = s.size;
        if (this.sprites.sheep.complete && this.sprites.sheep.naturalWidth > 0) {
          ctx.drawImage(this.sprites.sheep, s.x - sz / 2, s.y - sz / 2, sz, sz);
        } else {
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(s.x, s.y, sz / 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Energy / Lifespan bars
        this.drawBar(s.x, s.y - sz / 2 - 4, sz * 0.9, s.energy / s.maxEnergy, "#38bdf8");
      }

      // 3. Draw Wolves
      for (const wolf of this.wolves) {
        const sz = wolf.size;
        if (this.sprites.wolf.complete && this.sprites.wolf.naturalWidth > 0) {
          ctx.drawImage(this.sprites.wolf, wolf.x - sz / 2, wolf.y - sz / 2, sz, sz);
        } else {
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(wolf.x, wolf.y, sz / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Energy / Lifespan bars
        this.drawBar(wolf.x, wolf.y - sz / 2 - 4, sz * 0.9, wolf.energy / wolf.maxEnergy, "#ef4444");
      }
    }

    drawBar(x, y, width, fraction, color) {
      const ctx = this.ctx;
      const barHeight = 3;
      const barX = x - width / 2;

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(barX, y, width, barHeight);

      ctx.fillStyle = color;
      ctx.fillRect(barX, y, Math.max(0, width * Math.min(1, fraction)), barHeight);
    }

    updateHUD() {
      if (this.wolfCountEl) this.wolfCountEl.textContent = this.wolves.length;
      if (this.sheepCountEl) this.sheepCountEl.textContent = this.sheep.length;
      if (this.grassCountEl) this.grassCountEl.textContent = this.grassList.length;
    }

    startLoop() {
      const loop = () => {
        if (currentTab === "simple") {
          this.update();
          this.render();
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }


  // =========================================================================
  // 3. Unit 2: Multi-Species Food Web Simulation & Real-Time Topology
  // =========================================================================
  class MultiSpeciesWebSimulation {
    constructor() {
      this.networkCanvas = document.getElementById("webNetworkCanvas");
      this.chartCanvas = document.getElementById("populationChart");
      if (!this.networkCanvas || !this.chartCanvas) return;

      this.netCtx = this.networkCanvas.getContext("2d");
      this.currentPresetKey = "presetTaiwanForest";
      this.species = [];
      this.selectedSpecies = null;
      this.historyData = [];
      this.maxHistory = 60;
      this.isRunning = true;
      this.speedMultiplier = 1.0;
      this.timeTick = 0;
      this.chartInstance = null;

      // Particle animations along network edges
      this.particles = [];

      this.initPreset();
      this.initUI();
      this.initChart();
      this.handleResize();
      this.startLoop();
    }

    initPreset() {
      const preset = FoodChainData.foodWeb[this.currentPresetKey];
      if (!preset) return;

      // Deep copy species
      this.species = JSON.parse(JSON.stringify(preset.species));
      this.historyData = [];

      // Compute initial network layout positions based on trophic levels
      this.layoutNetworkNodes();

      // Default selected species: top predator or first one
      this.selectedSpecies = this.species.find((s) => s.trophicLevel >= 3) || this.species[0];
      this.updateInspectorCard();

      // Reset particles
      this.particles = [];
      for (let i = 0; i < 24; i++) {
        this.spawnRandomParticle();
      }
    }

    layoutNetworkNodes() {
      const width = this.networkCanvas.width || 500;
      const height = this.networkCanvas.height || 380;
      const dpr = window.devicePixelRatio || 1;
      const lw = width / dpr;
      const lh = height / dpr;

      // Group species by trophic level (1 = Producers, 2 = Herbivores, 3/4 = Predators)
      const levels = { 4: [], 3: [], 2: [], 1: [] };
      this.species.forEach((s) => {
        const lvl = s.trophicLevel >= 4 ? 4 : s.trophicLevel;
        if (levels[lvl]) levels[lvl].push(s);
        else levels[2].push(s);
      });

      // Assign vertical slots: Apex (top), Carnivores, Herbivores, Producers (bottom)
      const yCoords = {
        4: lh * 0.16,
        3: lh * 0.35,
        2: lh * 0.58,
        1: lh * 0.84
      };

      Object.keys(levels).forEach((lvlStr) => {
        const lvl = parseInt(lvlStr, 10);
        const group = levels[lvl];
        const count = group.length;
        if (count === 0) return;

        const y = yCoords[lvl];
        group.forEach((s, idx) => {
          const x = (lw / (count + 1)) * (idx + 1);
          s.x = x;
          s.y = y;
          s.radius = s.isProducer ? 18 : s.trophicLevel >= 3 ? 24 : 20;
        });
      });
    }

    initUI() {
      // Play / Pause
      const playPauseBtn = document.getElementById("webPlayPauseBtn");
      if (playPauseBtn) {
        playPauseBtn.addEventListener("click", () => {
          this.isRunning = !this.isRunning;
          const icon = playPauseBtn.querySelector(".btn-icon");
          const text = playPauseBtn.querySelector(".btn-text");
          const statusBadge = document.getElementById("webStatusBadge");
          if (this.isRunning) {
            if (icon) icon.textContent = "⏸️";
            if (text) text.textContent = "暫停模擬";
            if (statusBadge) statusBadge.textContent = "動態平衡中";
          } else {
            if (icon) icon.textContent = "▶️";
            if (text) text.textContent = "繼續模擬";
            if (statusBadge) statusBadge.textContent = "已暫停";
          }
        });
      }

      // Reset
      const resetBtn = document.getElementById("webResetBtn");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          this.initPreset();
          this.initChart();
        });
      }

      // Speed Slider
      const speedSlider = document.getElementById("webSpeedSlider");
      const speedVal = document.getElementById("webSpeedVal");
      if (speedSlider) {
        speedSlider.addEventListener("input", (e) => {
          this.speedMultiplier = parseFloat(e.target.value) || 1.0;
          if (speedVal) speedVal.textContent = this.speedMultiplier.toFixed(1) + "x";
        });
      }

      // Preset Selector
      const presetSelect = document.getElementById("presetSelect");
      if (presetSelect) {
        presetSelect.addEventListener("change", (e) => {
          this.currentPresetKey = e.target.value;
          this.initPreset();
          this.initChart();
        });
      }

      // Perturbation shortcuts
      const btnDisruptApex = document.getElementById("btnDisruptApex");
      if (btnDisruptApex) {
        btnDisruptApex.addEventListener("click", () => {
          // Severely reduce or eliminate top carnivores (石虎 & 臺灣黑熊 / 老鷹)
          this.species.forEach((s) => {
            if (s.trophicLevel >= 3) {
              s.pop = Math.max(0, s.pop * 0.1);
            }
          });
          this.showToast("⚠️ 已大幅獵捕頂級掠食者，請觀察草食動物是否過度滋生！");
        });
      }

      const btnDrought = document.getElementById("btnDrought");
      if (btnDrought) {
        btnDrought.addEventListener("click", () => {
          // Drastically reduce producers
          this.species.forEach((s) => {
            if (s.isProducer) {
              s.pop = Math.max(10, s.pop * 0.25);
            }
          });
          this.showToast("☀️ 乾旱衝擊植物生產力，請觀察草食獸與掠食者連鎖飢餓！");
        });
      }

      const btnRestoreBalance = document.getElementById("btnRestoreBalance");
      if (btnRestoreBalance) {
        btnRestoreBalance.addEventListener("click", () => {
          const preset = FoodChainData.foodWeb[this.currentPresetKey];
          this.species.forEach((s) => {
            const orig = preset.species.find((os) => os.name === s.name);
            if (orig) s.pop = orig.pop;
          });
          this.showToast("🌱 已實施生態系復育，恢復標準族群平衡！");
        });
      }

      // Node inspector buttons
      const btnBoost = document.getElementById("btnBoostPop");
      if (btnBoost) {
        btnBoost.addEventListener("click", () => {
          if (this.selectedSpecies) {
            this.selectedSpecies.pop = Math.round(this.selectedSpecies.pop * 1.25);
            this.updateInspectorCard();
          }
        });
      }

      const btnReduce = document.getElementById("btnReducePop");
      if (btnReduce) {
        btnReduce.addEventListener("click", () => {
          if (this.selectedSpecies) {
            this.selectedSpecies.pop = Math.max(0, Math.round(this.selectedSpecies.pop * 0.75));
            this.updateInspectorCard();
          }
        });
      }

      const btnToggle = document.getElementById("btnToggleExtinct");
      if (btnToggle) {
        btnToggle.addEventListener("click", () => {
          if (this.selectedSpecies) {
            if (this.selectedSpecies.pop > 0) {
              this.selectedSpecies.savedPop = this.selectedSpecies.pop;
              this.selectedSpecies.pop = 0;
            } else {
              this.selectedSpecies.pop = this.selectedSpecies.savedPop || 50;
            }
            this.updateInspectorCard();
          }
        });
      }

      // Canvas click to select node
      this.networkCanvas.addEventListener("click", (e) => {
        const rect = this.networkCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        for (const s of this.species) {
          const dist = Math.hypot(clickX - s.x, clickY - s.y);
          if (dist <= s.radius + 6) {
            this.selectedSpecies = s;
            this.updateInspectorCard();
            break;
          }
        }
      });
    }

    showToast(msg) {
      const hint = document.getElementById("networkHint");
      if (hint) {
        hint.textContent = msg;
        setTimeout(() => {
          hint.textContent = "點擊節點檢視物種關係";
        }, 4000);
      }
    }

    updateInspectorCard() {
      const s = this.selectedSpecies;
      if (!s) return;

      const nameEl = document.getElementById("inspName");
      const latinEl = document.getElementById("inspLatin");
      const roleTagEl = document.getElementById("inspRoleTag");
      const descEl = document.getElementById("inspDesc");
      const preyListEl = document.getElementById("inspPreyList");
      const predListEl = document.getElementById("inspPredatorList");
      const btnToggle = document.getElementById("btnToggleExtinct");

      if (nameEl) nameEl.textContent = `${s.name} (${Math.round(s.pop)})`;
      if (latinEl) latinEl.textContent = s.scientific || "";
      if (descEl) descEl.textContent = s.desc || "";

      if (roleTagEl) {
        roleTagEl.textContent = s.tierName;
        roleTagEl.className = "species-role-tag";
        if (s.isProducer) roleTagEl.classList.add("role-producer");
        else if (s.trophicLevel === 2) roleTagEl.classList.add("role-herbivore");
        else if (s.trophicLevel === 3) roleTagEl.classList.add("role-carnivore");
        else roleTagEl.classList.add("role-apex");
      }

      if (preyListEl) {
        if (s.isProducer || !s.preys || s.preys.length === 0) {
          preyListEl.innerHTML = `<span class="tag-badge prey-badge">太陽能與無機養分 (生產者)</span>`;
        } else {
          preyListEl.innerHTML = s.preys
            .map((p) => `<span class="tag-badge prey-badge">${p}</span>`)
            .join(" ");
        }
      }

      if (predListEl) {
        const predators = this.species.filter((other) => other.preys && other.preys.includes(s.name));
        if (predators.length === 0) {
          predListEl.innerHTML = `<span class="tag-badge predator-badge">無（頂級掠食者）</span>`;
        } else {
          predListEl.innerHTML = predators
            .map((p) => `<span class="tag-badge predator-badge">${p.name}</span>`)
            .join(" ");
        }
      }

      if (btnToggle) {
        btnToggle.textContent = s.pop <= 0 ? "恢復物種" : "暫時移除";
      }
    }

    initChart() {
      if (typeof Chart === "undefined") {
        // Fallback: simple canvas chart
        return;
      }

      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      const datasets = this.species.map((s) => ({
        label: s.name,
        data: [s.pop],
        borderColor: s.color,
        backgroundColor: s.color,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.35,
        fill: false
      }));

      this.chartInstance = new Chart(this.chartCanvas, {
        type: "line",
        data: {
          labels: ["0"],
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: "#94a3b8",
                boxWidth: 12,
                font: { size: 11 }
              }
            },
            tooltip: {
              mode: "index",
              intersect: false
            }
          },
          scales: {
            x: {
              display: false,
              grid: { color: "rgba(255,255,255,0.05)" }
            },
            y: {
              grid: { color: "rgba(255,255,255,0.08)" },
              ticks: { color: "#94a3b8", font: { size: 10 } }
            }
          }
        }
      });
    }

    stepSimulation(dt = 0.1) {
      if (!this.isRunning) return;

      const currentPops = {};
      for (const s of this.species) {
        currentPops[s.name] = s.pop;
      }

      const dN = {};
      for (const s of this.species) {
        dN[s.name] = 0;
      }

      for (const s of this.species) {
        if (s.pop <= 0) continue;

        if (s.isProducer) {
          // Logistic growth capped at carrying capacity K
          const growth = s.r * s.pop * (1 - s.pop / s.K);
          dN[s.name] += growth;
        } else {
          // Foraging response on available preys
          let totalPrey = 0;
          if (s.preys) {
            for (const pName of s.preys) {
              totalPrey += currentPops[pName] || 0;
            }
          }

          const B = 80; // Half-saturation constant
          const intakeFraction = totalPrey > 0 ? totalPrey / (totalPrey + B) : 0;
          const totalIntake = s.c * intakeFraction * s.pop;

          // Energy assimilation gain
          dN[s.name] += totalIntake * s.e;

          // Natural mortality and intraspecific self-limitation (prevents explosion)
          const densityLoss = (s.d * (s.pop / s.K)) * s.pop;
          dN[s.name] -= s.d * s.pop + densityLoss;

          // Subtract predated amounts from preys proportionally
          if (totalPrey > 0 && s.preys) {
            for (const pName of s.preys) {
              const eatenFraction = (currentPops[pName] || 0) / totalPrey;
              const eatenAmount = totalIntake * eatenFraction;
              dN[pName] = (dN[pName] || 0) - eatenAmount;
            }
          }
        }
      }

      // Euler update with non-negative clamping and upper bounds
      for (const s of this.species) {
        s.pop = Math.max(0, s.pop + dN[s.name] * dt * this.speedMultiplier);
        if (s.K && s.pop > s.K * 1.5) {
          s.pop = s.K * 1.5;
        }
      }
    }

    updateChart() {
      this.timeTick++;
      const labels = this.chartInstance.data.labels;
      labels.push(this.timeTick.toString());
      if (labels.length > this.maxHistory) {
        labels.shift();
      }

      this.chartInstance.data.datasets.forEach((dataset, idx) => {
        const s = this.species[idx];
        if (!s) return;
        dataset.data.push(Math.round(s.pop));
        if (dataset.data.length > this.maxHistory) {
          dataset.data.shift();
        }
      });

      this.chartInstance.update();
    }

    renderNetwork() {
      const ctx = this.netCtx;
      const w = this.networkCanvas.width / (window.devicePixelRatio || 1);
      const h = this.networkCanvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      // Draw Trophic Level Guide Lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.setLineDash([4, 4]);
      [h * 0.16, h * 0.35, h * 0.58, h * 0.84].forEach((y) => {
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(w - 10, y);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // 1. Draw Directed Links (Prey -> Predator)
      for (const predator of this.species) {
        if (!predator.preys || predator.preys.length === 0) continue;

        for (const preyName of predator.preys) {
          const prey = this.species.find((s) => s.name === preyName);
          if (!prey) continue;

          const isSelectedLink =
            this.selectedSpecies &&
            (this.selectedSpecies.name === predator.name || this.selectedSpecies.name === prey.name);

          ctx.beginPath();
          ctx.moveTo(prey.x, prey.y);
          ctx.lineTo(predator.x, predator.y);

          if (isSelectedLink) {
            if (this.selectedSpecies.name === predator.name) {
              // Predator is selected: incoming food lines highlighted in green
              ctx.strokeStyle = "rgba(74, 222, 128, 0.85)";
              ctx.lineWidth = 2.5;
            } else {
              // Prey is selected: outgoing threat lines highlighted in red
              ctx.strokeStyle = "rgba(239, 68, 68, 0.85)";
              ctx.lineWidth = 2.5;
            }
          } else {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.lineWidth = 1;
          }
          ctx.stroke();

          // Arrowhead
          this.drawArrowhead(ctx, prey.x, prey.y, predator.x, predator.y, predator.radius + 6, ctx.strokeStyle);
        }
      }

      // 2. Draw Moving Energy Particles
      this.updateAndDrawParticles(ctx);

      // 3. Draw Species Nodes
      for (const s of this.species) {
        const isSelected = this.selectedSpecies && this.selectedSpecies.name === s.name;

        // Outer Glow for selected
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius + 7, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(56, 189, 248, 0.3)";
          ctx.fill();
        }

        // Main Node Circle
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = s.pop > 0 ? s.color : "#475569";
        ctx.fill();
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.strokeStyle = isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.7)";
        ctx.stroke();

        // Species Name Label
        ctx.fillStyle = isSelected ? "#ffffff" : "#cbd5e1";
        ctx.font = isSelected ? "bold 12px sans-serif" : "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(s.name, s.x, s.y + s.radius + 14);

        // Population Count inside node or right below
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(Math.round(s.pop).toString(), s.x, s.y + 3);
      }
    }

    drawArrowhead(ctx, fromX, fromY, toX, toY, targetRadius, color) {
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const endX = toX - Math.cos(angle) * targetRadius;
      const endY = toY - Math.sin(angle) * targetRadius;
      const arrowLength = 7;

      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle - Math.PI / 6),
        endY - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - arrowLength * Math.cos(angle + Math.PI / 6),
        endY - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    spawnRandomParticle() {
      // Find a random link
      const predators = this.species.filter((s) => s.preys && s.preys.length > 0 && s.pop > 0);
      if (predators.length === 0) return;
      const pred = predators[Math.floor(Math.random() * predators.length)];
      const preyName = pred.preys[Math.floor(Math.random() * pred.preys.length)];
      const prey = this.species.find((s) => s.name === preyName && s.pop > 0);
      if (!prey) return;

      this.particles.push({
        from: prey,
        to: pred,
        progress: Math.random(),
        speed: 0.006 + Math.random() * 0.008,
        color: prey.color
      });
    }

    updateAndDrawParticles(ctx) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.progress += p.speed * this.speedMultiplier;

        if (p.progress >= 1.0) {
          // Respawn
          p.progress = 0;
          const predators = this.species.filter((s) => s.preys && s.preys.length > 0 && s.pop > 0);
          if (predators.length > 0) {
            const pred = predators[Math.floor(Math.random() * predators.length)];
            const preyName = pred.preys[Math.floor(Math.random() * pred.preys.length)];
            const prey = this.species.find((s) => s.name === preyName && s.pop > 0);
            if (prey) {
              p.from = prey;
              p.to = pred;
              p.color = prey.color;
            }
          }
        }

        const currX = p.from.x + (p.to.x - p.from.x) * p.progress;
        const currY = p.from.y + (p.to.y - p.from.y) * p.progress;

        ctx.beginPath();
        ctx.arc(currX, currY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    handleResize() {
      if (!this.networkCanvas) return;
      const rect = this.networkCanvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width || 460;
      const height = window.innerWidth <= 768 ? 300 : 380;

      this.networkCanvas.width = width * dpr;
      this.networkCanvas.height = height * dpr;
      this.networkCanvas.style.width = width + "px";
      this.networkCanvas.style.height = height + "px";

      this.netCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.netCtx.scale(dpr, dpr);

      this.layoutNetworkNodes();
      if (this.chartInstance) {
        this.chartInstance.resize();
      }
    }

    startLoop() {
      let lastChartUpdate = 0;
      const loop = (timestamp) => {
        if (currentTab === "complex") {
          this.stepSimulation();
          this.renderNetwork();

          if (this.chartInstance && timestamp - lastChartUpdate > 250 / this.speedMultiplier) {
            this.updateChart();
            lastChartUpdate = timestamp;
          }
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  // =========================================================================
  // 4. Initialize Everything on DOMContentLoaded
  // =========================================================================
  window.addEventListener("DOMContentLoaded", () => {
    window.chainSim = new SimpleChainSimulation();
    window.webSim = new MultiSpeciesWebSimulation();
  });
})();
