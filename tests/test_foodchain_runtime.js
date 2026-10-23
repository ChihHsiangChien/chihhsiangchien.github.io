/**
 * Runtime emulation test for foodChain/script.js
 * Verifies that all classes, event handlers, and simulation cycles execute without throwing any errors.
 */

const fs = require("fs");
const path = require("path");

console.log("=== Testing foodChain/script.js Runtime Simulation ===");

// Create lightweight DOM mock
class MockElement {
  constructor(id, tagName = "div") {
    this.id = id;
    this.tagName = tagName;
    this.classList = {
      classes: new Set(),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      contains: (c) => this.classList.classes.has(c)
    };
    this.attributes = {};
    this.listeners = {};
    this.style = {};
    this.textContent = "";
    this.innerHTML = "";
    this.value = "1";
    this.parentElement = {
      getBoundingClientRect: () => ({ width: 800, height: 600 })
    };
  }

  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }
  dispatchEvent(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data || { target: this, clientX: 100, clientY: 100 }));
    }
  }
  querySelector(sel) {
    return new MockElement(sel);
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 800, height: 600 };
  }
}

class MockCanvasContext {
  constructor() {
    this.canvas = new MockElement("canvas", "canvas");
  }
  clearRect() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  stroke() {}
  fill() {}
  arc() {}
  fillRect() {}
  drawImage() {}
  setTransform() {}
  scale() {}
  setLineDash() {}
  fillText() {}
  save() {}
  restore() {}
  closePath() {}
}

class MockCanvas extends MockElement {
  constructor(id) {
    super(id, "canvas");
    this.width = 800;
    this.height = 600;
  }
  getContext(type) {
    return new MockCanvasContext();
  }
}

const elements = {
  "tab-simple": new MockElement("tab-simple", "button"),
  "tab-complex": new MockElement("tab-complex", "button"),
  "panel-simple": new MockElement("panel-simple", "section"),
  "panel-complex": new MockElement("panel-complex", "section"),
  "chainCanvas": new MockCanvas("chainCanvas"),
  "webNetworkCanvas": new MockCanvas("webNetworkCanvas"),
  "populationChart": new MockCanvas("populationChart"),
  "chainPlayPauseBtn": new MockElement("chainPlayPauseBtn", "button"),
  "chainResetBtn": new MockElement("chainResetBtn", "button"),
  "chainSpeedSlider": new MockElement("chainSpeedSlider", "input"),
  "chainSpeedVal": new MockElement("chainSpeedVal", "span"),
  "spawnWolfBtn": new MockElement("spawnWolfBtn", "button"),
  "spawnSheepBtn": new MockElement("spawnSheepBtn", "button"),
  "spawnGrassBtn": new MockElement("spawnGrassBtn", "button"),
  "wolfCount": new MockElement("wolfCount", "span"),
  "sheepCount": new MockElement("sheepCount", "span"),
  "grassCount": new MockElement("grassCount", "span"),
  "chainStatus": new MockElement("chainStatus", "span"),
  "webPlayPauseBtn": new MockElement("webPlayPauseBtn", "button"),
  "webResetBtn": new MockElement("webResetBtn", "button"),
  "webSpeedSlider": new MockElement("webSpeedSlider", "input"),
  "webSpeedVal": new MockElement("webSpeedVal", "span"),
  "presetSelect": new MockElement("presetSelect", "select"),
  "btnDisruptApex": new MockElement("btnDisruptApex", "button"),
  "btnDrought": new MockElement("btnDrought", "button"),
  "btnRestoreBalance": new MockElement("btnRestoreBalance", "button"),
  "btnBoostPop": new MockElement("btnBoostPop", "button"),
  "btnReducePop": new MockElement("btnReducePop", "button"),
  "btnToggleExtinct": new MockElement("btnToggleExtinct", "button"),
  "speciesCard": new MockElement("speciesCard", "div"),
  "inspName": new MockElement("inspName", "span"),
  "inspLatin": new MockElement("inspLatin", "span"),
  "inspRoleTag": new MockElement("inspRoleTag", "span"),
  "inspDesc": new MockElement("inspDesc", "p"),
  "inspPreyList": new MockElement("inspPreyList", "span"),
  "inspPredatorList": new MockElement("inspPredatorList", "span"),
  "networkHint": new MockElement("networkHint", "span"),
  "webStatusBadge": new MockElement("webStatusBadge", "span")
};

global.window = {
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 1,
  addEventListener: (event, handler) => {
    if (event === "DOMContentLoaded") {
      handler();
    }
  }
};

global.document = {
  getElementById: (id) => elements[id] || null
};

global.Image = class {
  constructor() {
    this.src = "";
    this.complete = true;
    this.naturalWidth = 300;
    this.naturalHeight = 300;
  }
};

global.requestAnimationFrame = (fn) => setTimeout(fn, 16);

// Load data.js
global.FoodChainData = require("../foodChain/data.js");

// Mock Chart
global.Chart = class {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.data = config.data;
  }
  update() {}
  resize() {}
  destroy() {}
};

// Evaluate script.js
const scriptCode = fs.readFileSync(path.join(__dirname, "../foodChain/script.js"), "utf8");
eval(scriptCode);

console.log("✓ script.js loaded and evaluated without errors.");

// Verify global instances
if (!global.window.chainSim) throw new Error("window.chainSim not instantiated!");
if (!global.window.webSim) throw new Error("window.webSim not instantiated!");

console.log("✓ SimpleChainSimulation & MultiSpeciesWebSimulation instantiated.");

// Test Mode 1 updates
const sim1 = global.window.chainSim;
for (let i = 0; i < 50; i++) {
  sim1.update();
  sim1.render();
}
console.log(`✓ Mode 1 ran 50 simulation steps: Wolves=${sim1.wolves.length}, Sheep=${sim1.sheep.length}, Grass=${sim1.grassList.length}`);

// Test Spawning
sim1.spawnWolf();
sim1.spawnSheep();
sim1.spawnGrass();
console.log("✓ Mode 1 spawn functions executed successfully.");

// Test Mode 2 updates
const sim2 = global.window.webSim;
for (let i = 0; i < 50; i++) {
  sim2.stepSimulation();
  sim2.renderNetwork();
}
console.log(`✓ Mode 2 ran 50 steps: Species count=${sim2.species.length}`);

// Test Tab Switching
elements["tab-complex"].dispatchEvent("click");
console.log("✓ Tab switched to complex mode successfully.");

elements["tab-simple"].dispatchEvent("click");
console.log("✓ Tab switched back to simple mode successfully.");

// Test Perturbations
elements["btnDisruptApex"].dispatchEvent("click");
elements["btnDrought"].dispatchEvent("click");
elements["btnRestoreBalance"].dispatchEvent("click");
console.log("✓ Mode 2 perturbation buttons tested successfully.");

console.log("\nALL RUNTIME SIMULATION TESTS PASSED! ✓");
process.exit(0);
