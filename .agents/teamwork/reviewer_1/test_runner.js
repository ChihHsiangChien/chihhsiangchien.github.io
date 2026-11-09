const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const htmlPath = path.join(repoRoot, 'neuro_physiology', 'receptors.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract JS
const scriptMatch = html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g);
const code = scriptMatch.map(s => s.replace(/<\/?script[^>]*>/g, '')).join('\n;\n');

// Mock DOM
let drawCalls = 0;
const mockCtx = {
  clearRect: () => drawCalls++,
  fillRect: () => drawCalls++,
  strokeRect: () => drawCalls++,
  beginPath: () => drawCalls++,
  closePath: () => drawCalls++,
  moveTo: () => drawCalls++,
  lineTo: () => drawCalls++,
  arc: () => drawCalls++,
  ellipse: () => drawCalls++,
  bezierCurveTo: () => drawCalls++,
  quadraticCurveTo: () => drawCalls++,
  fill: () => drawCalls++,
  stroke: () => drawCalls++,
  save: () => drawCalls++,
  restore: () => drawCalls++,
  setLineDash: () => {},
  setTransform: () => {},
  scale: () => {},
  translate: () => {},
  rotate: () => {},
  fillText: () => drawCalls++,
  strokeText: () => drawCalls++,
  measureText: () => ({ width: 50 }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} })
};

const mockCanvas = {
  getContext: () => mockCtx,
  width: 1200,
  height: 700,
  parentElement: { getBoundingClientRect: () => ({ width: 1200, height: 700 }) },
  getBoundingClientRect: () => ({ width: 1200, height: 700 }),
  addEventListener: () => {}
};

const mockEl = (id) => ({
  id,
  classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
  style: {},
  addEventListener: () => {},
  setAttribute: () => {},
  getAttribute: () => '',
  querySelector: () => mockEl('sub'),
  querySelectorAll: () => [mockEl('sub1'), mockEl('sub2')],
  value: '0',
  textContent: '',
  innerHTML: ''
});

const tailwind = { config: {} };
const window = {
  addEventListener: () => {},
  devicePixelRatio: 1,
  innerWidth: 1200,
  innerHeight: 800
};
const document = {
  getElementById: (id) => id === 'simCanvas' ? mockCanvas : mockEl(id),
  querySelector: (sel) => (sel && sel.includes('canvas')) ? mockCanvas : mockEl(sel),
  querySelectorAll: () => [mockEl('q1'), mockEl('q2')],
  addEventListener: () => {}
};
const performance = { now: () => Date.now() };

const testScript = `
${code}

const renderer = new ReceptorSimulationRenderer(mockCanvas);
const senses = ['vision', 'hearing', 'smell', 'taste', 'skin'];

// Test 1: Extreme timeline T values for all valid senses
[-100, -0.001, 0, 0.25, 0.50, 0.80, 1.0, 1.0001, 9999, NaN, Infinity, -Infinity].forEach(tVal => {
  senses.forEach(s => {
    renderer.render(s, tVal, getCurrentPhase(tVal));
  });
});
console.log("PASS Test 1: Extreme progress and phase inputs handled safely for all 5 senses");

// Test 2: Rapid switching between receptors
const ctrl = new ConductionTimelineController();
for (let i = 0; i < 200; i++) {
  const sense = senses[i % senses.length];
  ctrl.setReceptor(sense);
  ctrl.update(Date.now() + i * 50);
}
console.log("PASS Test 2: 200 rapid receptor switchings");

// Test 3: App initialization and simulated button clicks
const app = new ReceptorApp();
senses.forEach(s => app.switchReceptor(s));
app.setSpeed(2.0);
app.setSpeed(0.5);
app.updatePlayPauseUI(true);
app.updatePlayPauseUI(false);
console.log("PASS Test 3: ReceptorApp DOM controls and state updates");
`;

eval(testScript);
console.log("ALL_VALID_ADVERSARIAL_TESTS_SUCCESSFUL");
