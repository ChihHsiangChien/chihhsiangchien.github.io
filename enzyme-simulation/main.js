// ====== 實驗數據儲存 ======
let experimentResults = [];
let experimentRunning = false;
let experimentTimer = 0;
let experimentTargetTime = 0;
let experimentTemp = 37;

// ====== 實驗設計表單事件 ======
document.getElementById('experimentForm').onsubmit = function(e) {
  e.preventDefault();
  // 取得設定值
  const tempVal = parseInt(document.getElementById('expTemp').value);
  const enzNum = parseInt(document.getElementById('expEnzyme').value);
  const subNum = parseInt(document.getElementById('expSubstrate').value);
  const timeSec = parseInt(document.getElementById('expTime').value);
  const enzType = document.getElementById('expEnzymeType').value;
  // 初始化模擬
  temp = tempVal;
  experimentTemp = tempVal;
  experimentTimer = 0;
  experimentTargetTime = timeSec * 60; // 幀數
  reactionCount = 0;
  chartData = [];
  chartTime = 0;
  products = [];
  substrates = [];
  for (let i = 0; i < subNum; i++) {
    substrates.push(new Substrate(
      Math.random() * (width - 40) + 20,
      Math.random() * (height - 40) + 20,
      svgSubstrate
    ));
  }
  if (enzType === 'new') {
    enzymes = [];
    for (let i = 0; i < enzNum; i++) {
      const angle = (i / enzNum) * 2 * Math.PI;
      const r = 180;
      enzymes.push(new Enzyme(
        width / 2 + Math.cos(angle) * r,
        height / 2 + Math.sin(angle) * r,
        svgEnzActive, svgEnzDenatured
      ));
    }
  } else {
    // 使用現有酵素，若不足則補足
    while (enzymes.length < enzNum) {
      const angle = (enzymes.length / enzNum) * 2 * Math.PI;
      const r = 180;
      enzymes.push(new Enzyme(
        width / 2 + Math.cos(angle) * r,
        height / 2 + Math.sin(angle) * r,
        svgEnzActive, svgEnzDenatured
      ));
    }
    // 若太多則裁減
    enzymes = enzymes.slice(0, enzNum);
    // 重設所有酵素狀態
    for (const enz of enzymes) {
      enz.active = true;
      enz.reactionCount = 0;
    }
  }
  experimentRunning = true;
  document.getElementById('startExperiment').disabled = true;
};
// ====== 另一種不反應的物質 ======
class InertMolecule {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = Math.random() * 1.2 - 0.6;
    this.vy = Math.random() * 1.2 - 0.6;
    this.color = '#bdb2ff';
  }
  move(width, height) {
    const tempFactor = temp / 37;
    this.vx += (Math.random() - 0.5) * 0.1 * tempFactor;
    this.vy += (Math.random() - 0.5) * 0.1 * tempFactor;
    if (this.x < 8 || this.x > width - 8) this.vx *= -1;
    if (this.y < 8 || this.y > height - 8) this.vy *= -1;
    this.x += this.vx;
    this.y += this.vy;
  }
  display(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = this.color;
    //ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.strokeStyle = '#5f5f5f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

// ====== SVG 載入 ======
async function loadSVG(url) {
  const res = await fetch(url);
  return await res.text();
}

// ====== 物件定義 ======
class Enzyme {
  constructor(x, y, svgNormal, svgDenatured) {
    this.x = x;
    this.y = y;
    this.active = true;
    this.attractionRadius = 80;
    this.activeSite = { x: 20, y: 0 }; // 相對於中心
    this.svgNormal = svgNormal;
    this.svgDenatured = svgDenatured;
    this.reactionCount = 0;
    this.vx = Math.random() * 0.6 - 0.3;
    this.vy = Math.random() * 0.6 - 0.3;
    this.angle = Math.random() * 2 * Math.PI;
    this.omega = (Math.random() - 0.5) * 0.02; // 旋轉速度
  }
  getActiveSiteWorld() {
    // 回傳旋轉後的活化位座標（世界座標）
    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);
    const rx = this.activeSite.x * cosA - this.activeSite.y * sinA;
    const ry = this.activeSite.x * sinA + this.activeSite.y * cosA;
    return { x: this.x + rx, y: this.y + ry };
  }
  move(width, height) {
    // 溫度影響隨機運動
    const tempFactor = temp / 37;
    this.vx += (Math.random() - 0.5) * 0.03 * tempFactor;
    this.vy += (Math.random() - 0.5) * 0.03 * tempFactor;
    // 邊界反彈
    if (this.x < 20 || this.x > width - 20) this.vx *= -1;
    if (this.y < 20 || this.y > height - 20) this.vy *= -1;
    this.x += this.vx;
    this.y += this.vy;
    // 旋轉
    this.angle += this.omega;
  }
  display(ctx) {
    const svg = this.active ? this.svgNormal : this.svgDenatured;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    drawSVG(ctx, svg, -20, -20, 40, 40);
    ctx.restore();
    // 吸引區
    if (this.active) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.attractionRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#219ebc';
      ctx.fill();
      ctx.restore();
    }
  }
  attract(substrate) {
    if (!this.active) return null;
    const site = this.getActiveSiteWorld();
    const dx = site.x - substrate.x;
    const dy = site.y - substrate.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < this.attractionRadius) {
      // 吸引力強度與距離成反比
      const k = 0.15;
      return { x: (dx / dist) * k, y: (dy / dist) * k };
    }
    return null;
  }
  checkBinding(substrate) {
    const site = this.getActiveSiteWorld();
    const dx = site.x - substrate.x;
    const dy = site.y - substrate.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < 8 && !substrate.bound && this.active;
  }
}

class Substrate {
  constructor(x, y, svg) {
    this.x = x;
    this.y = y;
    this.vx = Math.random() * 1.2 - 0.6;
    this.vy = Math.random() * 1.2 - 0.6;
    this.bound = false;
    this.svg = svg;
    this.bindingTimer = 0;
  }
  move(width, height) {
    if (!this.bound) {
      // Brownian-like motion，溫度影響
      const tempFactor = temp / 37;
      this.vx += (Math.random() - 0.5) * 0.1 * tempFactor;
      this.vy += (Math.random() - 0.5) * 0.1 * tempFactor;
      // 邊界反彈
      if (this.x < 8 || this.x > width - 8) this.vx *= -1;
      if (this.y < 8 || this.y > height - 8) this.vy *= -1;
      this.x += this.vx;
      this.y += this.vy;
    }
  }
  display(ctx) {
    drawSVG(ctx, this.svg, this.x - 10, this.y - 10, 20, 20);
  }
  applyForce(force) {
    this.vx += force.x;
    this.vy += force.y;
  }
}

class Product {
  constructor(x, y, vx, vy, svg) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.svg = svg;
  }
  move(width, height) {
    // 溫度影響擾動
    const tempFactor = temp / 37;
    this.vx += (Math.random() - 0.5) * 0.04 * tempFactor;
    this.vy += (Math.random() - 0.5) * 0.04 * tempFactor;
    this.x += this.vx;
    this.y += this.vy;
    // 邊界反彈
    if (this.x < 8 || this.x > width - 8) this.vx *= -1;
    if (this.y < 8 || this.y > height - 8) this.vy *= -1;
  }
  display(ctx) {
    drawSVG(ctx, this.svg, this.x - 12, this.y - 10, 24, 20);
  }
}

// ====== SVG 畫到 Canvas ======
function drawSVG(ctx, svg, x, y, w, h) {
  const img = new window.Image();
  const svg64 = btoa(unescape(encodeURIComponent(svg)));
  img.src = 'data:image/svg+xml;base64,' + svg64;
  ctx.drawImage(img, x, y, w, h);
}

// ====== 主程式邏輯 ======
let enzymes = [], substrates = [], products = [], inerts = [];
let svgEnzActive, svgEnzDenatured, svgSubstrate, svgProduct, svgProduct2;
let reactionCount = 0;
let temp = 37;
let T_opt = 37, T_denature = 60;
let denatureProb = 0;
let chartData = [];
let chartTime = 0;


// ====== UI 控制元件 ======
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width, height = canvas.height;

// 新增控制面板
let controlPanel = document.createElement('div');
controlPanel.style.textAlign = 'center';
controlPanel.style.margin = '1em';
controlPanel.innerHTML = `
  <button id="addSubstrateBtn">添加新受質</button>
  <select id="enzymeSelect">
    <option value="old">原有酵素</option>
    <option value="new">新酵素</option>
  </select>
  <button id="addEnzymeBtn">添加新酵素</button>
  <br><br>
  <button id="toggleEnzyme" class="toggle-btn" style="background:#8ecae6;">酵素</button>
  <button id="toggleSubstrate" class="toggle-btn" style="background:#ffb703;">受質</button>
  <button id="toggleProduct" class="toggle-btn" style="background:#ffd166;">產物</button>
  <button id="toggleInert" class="toggle-btn" style="background:#bdb2ff;">非專一分子</button>
`;
// 插入到 .main-flex 之前，若找不到則加在 body 最前
const mainFlex = document.querySelector('.main-flex');
if (mainFlex) {
  document.body.insertBefore(controlPanel, mainFlex);
} else {
  document.body.insertBefore(controlPanel, document.body.firstChild);
}

// highlight/dimmed 狀態
let showEnzyme = true, showSubstrate = true, showProduct = true, showInert = true;

function toggleBtnState(btn, flag) {
  btn.style.opacity = flag ? '1' : '0.3';
}

document.getElementById('toggleEnzyme').onclick = function() {
  showEnzyme = !showEnzyme;
  toggleBtnState(this, showEnzyme);
};
document.getElementById('toggleSubstrate').onclick = function() {
  showSubstrate = !showSubstrate;
  toggleBtnState(this, showSubstrate);
};
document.getElementById('toggleProduct').onclick = function() {
  showProduct = !showProduct;
  toggleBtnState(this, showProduct);
};
document.getElementById('toggleInert').onclick = function() {
  showInert = !showInert;
  toggleBtnState(this, showInert);
};

// ====== 初始化 ======
async function init() {
  [svgEnzActive, svgEnzDenatured, svgSubstrate, svgProduct, svgProduct2] = await Promise.all([
    loadSVG('enzyme_active.svg'),
    loadSVG('enzyme_denatured.svg'),
    loadSVG('substrate.svg'),
    loadSVG('product.svg'),
    loadSVG('product2.svg')
  ]);
  // 初始化酵素
  enzymes = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * 2 * Math.PI;
    const r = 180;
    enzymes.push(new Enzyme(
      width / 2 + Math.cos(angle) * r,
      height / 2 + Math.sin(angle) * r,
      svgEnzActive, svgEnzDenatured
    ));
  }
  // 初始化受質
  substrates = [];
  for (let i = 0; i < 18; i++) {
    substrates.push(new Substrate(
      Math.random() * (width - 40) + 20,
      Math.random() * (height - 40) + 20,
      svgSubstrate
    ));
  }
  products = [];
  inerts = [];
  for (let i = 0; i < 10; i++) {
    inerts.push(new InertMolecule(
      Math.random() * (width - 40) + 20,
      Math.random() * (height - 40) + 20
    ));
  }
  reactionCount = 0;
  chartData = [];
  chartTime = 0;
  requestAnimationFrame(loop);
}

// ====== 新增受質與酵素功能 ======
document.getElementById('addSubstrateBtn').onclick = function() {
  const enzymeMode = document.getElementById('enzymeSelect').value;
  if (enzymeMode === 'old') {
    // 只用原有酵素反應（不新增酵素）
    substrates.push(new Substrate(
      Math.random() * (width - 40) + 20,
      Math.random() * (height - 40) + 20,
      svgSubstrate
    ));
  } else if (enzymeMode === 'new') {
    // 新增一個新酵素（活性）並添加受質
    const angle = Math.random() * 2 * Math.PI;
    const r = 180;
    enzymes.push(new Enzyme(
      width / 2 + Math.cos(angle) * r,
      height / 2 + Math.sin(angle) * r,
      svgEnzActive, svgEnzDenatured
    ));
    substrates.push(new Substrate(
      Math.random() * (width - 40) + 20,
      Math.random() * (height - 40) + 20,
      svgSubstrate
    ));
  }
};

document.getElementById('addEnzymeBtn').onclick = function() {
  // 單純新增一個新酵素
  const angle = Math.random() * 2 * Math.PI;
  const r = 180;
  enzymes.push(new Enzyme(
    width / 2 + Math.cos(angle) * r,
    height / 2 + Math.sin(angle) * r,
    svgEnzActive, svgEnzDenatured
  ));
};

// ====== 主動畫迴圈 ======
function loop() {
  // 實驗計時與自動停止
  if (experimentRunning) {
    experimentTimer++;
    if (experimentTimer >= experimentTargetTime) {
      experimentRunning = false;
      document.getElementById('startExperiment').disabled = false;
      // 記錄本次實驗數據
      experimentResults.push({
        temp: experimentTemp,
        reaction: reactionCount
      });
      drawSummaryChart();
    }
  }
// ====== 實驗結果折線圖 ======
function drawSummaryChart() {
  const chart = document.getElementById('summaryChart');
  const c = chart.getContext('2d');
  c.clearRect(0, 0, chart.width, chart.height);
  if (experimentResults.length === 0) return;
  // 排序
  const sorted = experimentResults.slice().sort((a, b) => a.temp - b.temp);
  // 畫線
  c.strokeStyle = '#ef476f';
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i < sorted.length; i++) {
    const x = 40 + (sorted[i].temp - 10) / 90 * (chart.width - 60);
    const y = chart.height - 30 - (sorted[i].reaction / Math.max(...sorted.map(r=>r.reaction),1)) * (chart.height - 60);
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  // 點
  c.fillStyle = '#ef476f';
  for (let i = 0; i < sorted.length; i++) {
    const x = 40 + (sorted[i].temp - 10) / 90 * (chart.width - 60);
    const y = chart.height - 30 - (sorted[i].reaction / Math.max(...sorted.map(r=>r.reaction),1)) * (chart.height - 60);
    c.beginPath();
    c.arc(x, y, 5, 0, 2 * Math.PI);
    c.fill();
  }
  // 標籤
  c.fillStyle = '#333';
  c.font = '14px sans-serif';
  c.fillText('溫度', chart.width/2-20, chart.height-8);
  c.save();
  c.translate(10, chart.height/2+20);
  c.rotate(-Math.PI/2);
  c.fillText('反應數', 0, 0);
  c.restore();
}
  ctx.clearRect(0, 0, width, height);
  // 酵素移動與顯示
  for (const enz of enzymes) {
    enz.move(width, height);
    if (showEnzyme) {
      ctx.save();
      ctx.globalAlpha = 1;
      enz.display(ctx);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.15;
      enz.display(ctx);
      ctx.restore();
    }
  }
  // 不反應物質運動與顯示
  for (const inert of inerts) {
    inert.move(width, height);
    if (showInert) {
      ctx.save();
      ctx.globalAlpha = 1;
      inert.display(ctx);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.15;
      inert.display(ctx);
      ctx.restore();
    }
  }
  // 受質運動與吸引
  for (const sub of substrates) {
    if (!sub.bound) {
      // 檢查是否進入任何酵素吸引區
      for (const enz of enzymes) {
        const force = enz.attract(sub);
        if (force) sub.applyForce(force);
        if (enz.checkBinding(sub)) {
          sub.bound = true;
          sub.bindingTimer = 0;
          enz.reactionCount++;
        }
      }
    }
    sub.move(width, height);
    if (showSubstrate) {
      ctx.save();
      ctx.globalAlpha = 1;
      sub.display(ctx);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.15;
      sub.display(ctx);
      ctx.restore();
    }
  }
  // 受質結合後等待幾幀產生產物
  for (let i = substrates.length - 1; i >= 0; i--) {
    const sub = substrates[i];
    if (sub.bound) {
      sub.bindingTimer++;
      if (sub.bindingTimer > 20) {
        // 產生兩個產物
        const angle = Math.random() * 2 * Math.PI;
        const speed = 1.2 + Math.random() * 0.8;
        products.push(new Product(
          sub.x, sub.y,
          Math.cos(angle) * speed, Math.sin(angle) * speed,
          svgProduct
        ));
        products.push(new Product(
          sub.x, sub.y,
          Math.cos(angle + Math.PI) * speed, Math.sin(angle + Math.PI) * speed,
          svgProduct2
        ));
        substrates.splice(i, 1);
        reactionCount++;
      }
    }
  }
  // 產物運動
  for (const prod of products) {
    prod.move(width, height);
    if (showProduct) {
      ctx.save();
      ctx.globalAlpha = 1;
      prod.display(ctx);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.15;
      prod.display(ctx);
      ctx.restore();
    }
  
  }
  // 變性機制
  denatureProb = temp > T_denature ? (temp - T_denature) * 0.005 : 0;
  for (const enz of enzymes) {
    if (enz.active && temp > T_denature && Math.random() < denatureProb) {
      enz.active = false;
    }
  }
  // Dashboard 更新
  updateDashboard();
  // 反應速率紀錄
  if (chartTime % 30 === 0) {
    chartData.push({
      t: chartTime / 60,
      rate: reactionCount
    });
    if (chartData.length > 40) chartData.shift();
  }
  chartTime++;
  drawChart();
  requestAnimationFrame(loop);
}

// ====== Dashboard 與 Chart ======
function updateDashboard() {
  const tempValue = document.getElementById('tempValue');
  const activeEnzyme = document.getElementById('activeEnzyme');
  const denaturedEnzyme = document.getElementById('denaturedEnzyme');
  const reactionCountSpan = document.getElementById('reactionCount');
  if (tempValue) tempValue.textContent = temp;
  if (activeEnzyme) activeEnzyme.textContent = enzymes.filter(e => e.active).length;
  if (denaturedEnzyme) denaturedEnzyme.textContent = enzymes.filter(e => !e.active).length;
  if (reactionCountSpan) reactionCountSpan.textContent = reactionCount;
}

function drawChart() {
  const chart = document.getElementById('rateChart');
  const c = chart.getContext('2d');
  c.clearRect(0, 0, chart.width, chart.height);
  c.strokeStyle = '#219ebc';
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i < chartData.length; i++) {
    const x = (i / (chartData.length - 1)) * (chart.width - 20) + 10;
    const y = chart.height - 10 - (chartData[i].rate / Math.max(1, reactionCount)) * (chart.height - 20);
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  // 軸線
  c.strokeStyle = '#888';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(10, 10); c.lineTo(10, chart.height - 10); c.lineTo(chart.width - 10, chart.height - 10);
  c.stroke();
}

// ====== 溫度滑桿事件 ======
// 已改用表單設定溫度，移除舊的 tempSlider 事件監聽

// ====== 啟動 ======
init();
