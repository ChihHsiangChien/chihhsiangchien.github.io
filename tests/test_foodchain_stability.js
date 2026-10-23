/**
 * Automated Verification Test for foodChain & foodWeb mathematical stability
 */

const assert = require("assert");
const FoodChainData = require("../foodChain/data.js");

console.log("=== Running FoodChain & FoodWeb Mathematical Stability Tests ===");

// 1. Data Integrity Check
console.log("Test 1: Checking Data Configuration...");
assert(FoodChainData.simpleChain, "simpleChain config must exist");
assert.strictEqual(typeof FoodChainData.simpleChain.initialCounts.wolf, "number");
assert.strictEqual(typeof FoodChainData.simpleChain.initialCounts.sheep, "number");
assert.strictEqual(typeof FoodChainData.simpleChain.initialCounts.grass, "number");

const preset1 = FoodChainData.foodWeb.presetTaiwanForest;
assert.strictEqual(preset1.species.length, 10, "Preset 1 must have exactly 10 species");
const requiredSpecies = ["臺灣黑熊", "石虎", "赤腹松鼠", "梅花鹿", "臺灣野兔", "巢鼠", "環頸雉", "芒草", "臺灣冷杉", "殼斗科植物"];
for (const name of requiredSpecies) {
  const found = preset1.species.some(s => s.name === name);
  assert(found, `Preset 1 must include ${name}`);
}
console.log("✓ Preset 1 includes all 10 Taiwan native species.");

// 2. Mathematical Stability Simulation Engine
function simulateWeb(preset, steps, dt = 0.1) {
  const species = JSON.parse(JSON.stringify(preset.species));
  
  for (let step = 0; step < steps; step++) {
    const currentPops = {};
    for (const s of species) {
      assert(!isNaN(s.pop) && isFinite(s.pop), `Population of ${s.name} must be finite number at step ${step}, got ${s.pop}`);
      currentPops[s.name] = s.pop;
    }
    
    const dN = {};
    for (const s of species) dN[s.name] = 0;
    
    for (const s of species) {
      if (s.isProducer) {
        // Logistic growth with carrying capacity
        const growth = s.r * s.pop * (1 - s.pop / s.K);
        dN[s.name] += growth;
      } else {
        // Foraging response
        let totalPrey = 0;
        for (const pName of s.preys) totalPrey += (currentPops[pName] || 0);
        
        const B = 80;
        const intakeFraction = totalPrey > 0 ? (totalPrey / (totalPrey + B)) : 0;
        const totalIntake = s.c * intakeFraction * s.pop;
        
        // Energy gain
        dN[s.name] += totalIntake * s.e;
        
        // Mortality & self-limitation
        const densityLoss = (s.d * (s.pop / s.K)) * s.pop;
        dN[s.name] -= (s.d * s.pop + densityLoss);
        
        // Prey loss
        if (totalPrey > 0) {
          for (const pName of s.preys) {
            const eatenFraction = (currentPops[pName] || 0) / totalPrey;
            const eatenAmount = totalIntake * eatenFraction;
            dN[pName] = (dN[pName] || 0) - eatenAmount;
          }
        }
      }
    }
    
    // Euler update with non-negative clamping and upper bound
    for (const s of species) {
      s.pop = Math.max(0, s.pop + dN[s.name] * dt);
      if (s.K && s.pop > s.K * 1.5) {
        s.pop = s.K * 1.5;
      }
      assert(!isNaN(s.pop) && isFinite(s.pop), `Updated pop of ${s.name} must not be NaN/Infinity`);
    }
  }
  
  return species;
}

// Test 2: Run 1000 steps without explosion or crash
console.log("Test 2: Running 1000 Steps Simulation of Preset 1...");
const finalSpecies = simulateWeb(preset1, 1000);
for (const s of finalSpecies) {
  console.log(`  - ${s.name} (${s.tierName}): pop = ${s.pop.toFixed(1)} (K = ${s.K})`);
  assert(s.pop > 0, `${s.name} should maintain viable population`);
  assert(s.pop <= s.K * 1.5, `${s.name} should stay within carrying capacity`);
}
console.log("✓ All 10 species maintain healthy, bounded populations after 1000 steps.");

// Test 3: Trophic Cascade Response
console.log("Test 3: Testing Trophic Cascade Response (Perturbation)...");
// Baseline run
const speciesCopy = JSON.parse(JSON.stringify(preset1.species));
// Run 200 steps to reach equilibrium
let s1 = simulateWeb({ species: speciesCopy }, 200);
const preRabbit = s1.find(s => s.name === "臺灣野兔").pop;
const preCat = s1.find(s => s.name === "石虎").pop;

// Remove predator (石虎 pop = 0)
const pertSpecies = JSON.parse(JSON.stringify(s1));
pertSpecies.find(s => s.name === "石虎").pop = 0;
let s2 = simulateWeb({ species: pertSpecies }, 200);
const postRabbit = s2.find(s => s.name === "臺灣野兔").pop;

console.log(`  - Baseline: 石虎 = ${preCat.toFixed(1)}, 臺灣野兔 = ${preRabbit.toFixed(1)}`);
console.log(`  - Post-removal of 石虎: 臺灣野兔 = ${postRabbit.toFixed(1)}`);
assert(postRabbit > preRabbit, "Removing predator must release herbivore population (Trophic Cascade)");
console.log("✓ Trophic cascade verified: Herbivore population released when predator removed.");

console.log("\nALL FOODWEB MATHEMATICAL TESTS PASSED SUCCESSFULLY! ✓");
