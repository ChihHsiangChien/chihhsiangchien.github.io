// ====== 重要參數集中設定 ======
// 受質靠近酵素活化位時，對齊的偏移角度（單位：弧度，0為完全對齊酵素）
let substrateAngleOffset = 0; // 例如 Math.PI/2 代表90度
let activeSiteX = 0;
let activeSiteY = 0;
let temp = 37; // 當前溫度
const T_opt = 37; // 最佳溫度
const T_denature = 60; // 變性臨界溫度

// Return a temperature factor used to scale random jitter and movement speed.
// Clamped so very low temperatures still move a little, and very high temps are limited.
function getTempFactor() {
  const raw = temp / T_opt;
  return Math.min(2.0, Math.max(0.12, raw));
}

let k_attract = 1; // 酵素吸引力強度
let bindingThreshold = 8; // 活化位結合距離
let enzymeRadius = 20; // 酵素半徑
let defaultAttractionRadius = 40; // 全域預設吸引半徑
let substrateRadius = 10; // 受質半徑
let productRadius = 12; // 產物半徑
let inertCount = 0; // 非專一分子數量
let enzymeCount = 5;
let substrateCount = 80;


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
      svgSubstrateImg
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
        svgEnzActiveImg, svgEnzDenaturedImg
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
        svgEnzActiveImg, svgEnzDenaturedImg
      ));
    }
    // 若太多則裁減
    enzymes = enzymes.slice(0, enzNum);
    // 重設所有酵素計數，但保留其 active（例如先前變性的酵素應維持變性狀態）
    for (const enz of enzymes) {
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
    const tf = getTempFactor();
    this.vx = (Math.random() * 1.2 - 0.6) * tf;
    this.vy = (Math.random() * 1.2 - 0.6) * tf;
    this.color = '#bdb2ff';
  }
  move(width, height) {
    const tempFactor = getTempFactor();
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
  this.attractionRadius = defaultAttractionRadius;
    this.activeSite = { x: activeSiteX, y: activeSiteY }; // 相對於中心
    this.svgNormal = svgNormal;
    this.svgDenatured = svgDenatured;
  this.reactionCount = 0;
  const tf = getTempFactor();
  this.vx = (Math.random() * 0.6 - 0.3) * tf;
  this.vy = (Math.random() * 0.6 - 0.3) * tf;
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
  const tempFactor = getTempFactor();
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
  // draw centered at 0,0 using intrinsic size (or fallback)
  drawSVG(ctx, svg, 0, 0, 40, 40);
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
      return { x: (dx / dist) * k_attract, y: (dy / dist) * k_attract };
    }
    return null;
  }
  checkBinding(substrate) {
    const site = this.getActiveSiteWorld();
    const dx = site.x - substrate.x;
    const dy = site.y - substrate.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < bindingThreshold && !substrate.bound && this.active;
  }
}

// Setter to update attraction radius for future and existing enzymes
function setAttractionRadius(r) {
  defaultAttractionRadius = r;
  for (const enz of enzymes) enz.attractionRadius = r;
}

class Substrate {
  constructor(x, y, svg) {
    this.x = x;
    this.y = y;
  const tf = getTempFactor();
  this.vx = (Math.random() * 1.2 - 0.6) * tf;
  this.vy = (Math.random() * 1.2 - 0.6) * tf;
    this.bound = false;
    this.svg = svg;
    this.bindingTimer = 0;
    this.angle = Math.atan2(this.vy, this.vx); // initialize facing motion direction
  }
  move(width, height) {
    if (!this.bound) {
      // Brownian-like motion，溫度影響
  const tempFactor = getTempFactor();
  this.vx += (Math.random() - 0.5) * 0.1 * tempFactor;
  this.vy += (Math.random() - 0.5) * 0.1 * tempFactor;
      // 邊界反彈
      if (this.x < 8 || this.x > width - 8) this.vx *= -1;
      if (this.y < 8 || this.y > height - 8) this.vy *= -1;
      this.x += this.vx;
      this.y += this.vy;
      // smoothly rotate to face velocity direction
      const targetAngle = Math.atan2(this.vy, this.vx);
      let d = targetAngle - this.angle;
      d = ((d + Math.PI) % (2 * Math.PI)) - Math.PI;
      this.angle += d * 0.15; // smoothing factor
    }
  }
  display(ctx) {
    ctx.save();
  ctx.translate(this.x, this.y);
  ctx.rotate(this.angle);
  drawSVG(ctx, this.svg, 0, 0, substrateRadius * 2, substrateRadius * 2);
    ctx.restore();
  }
  applyForce(force) {
    this.vx += force.x;
    this.vy += force.y;
  }
  rotateToEnzymeAngle(enzymeAngle) {
    // 讓受質旋轉到和酵素角度加上偏移
    let targetAngle = enzymeAngle + substrateAngleOffset;
    let dAngle = targetAngle - this.angle;
    dAngle = ((dAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
    this.angle += dAngle * 0.2;
  }
  rotateTo(targetX, targetY) {
    // 保留原本朝向活化位的函式
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const targetAngle = Math.atan2(dy, dx);
    let dAngle = targetAngle - this.angle;
    dAngle = ((dAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
    this.angle += dAngle * 0.2;
  }
}

class Product {
  constructor(x, y, vx, vy, svg) {
    this.x = x;
    this.y = y;
  const tf = getTempFactor();
  this.vx = vx * tf;
  this.vy = vy * tf;
    this.svg = svg;
    this.angle = Math.atan2(vy, vx); // face initial velocity
  }
  move(width, height) {
    // 溫度影響擾動
  const tempFactor = getTempFactor();
  this.vx += (Math.random() - 0.5) * 0.04 * tempFactor;
  this.vy += (Math.random() - 0.5) * 0.04 * tempFactor;
    this.x += this.vx;
    this.y += this.vy;
    // rotate to face velocity
    const targetAngle = Math.atan2(this.vy, this.vx);
    let d = targetAngle - this.angle;
    d = ((d + Math.PI) % (2 * Math.PI)) - Math.PI;
    this.angle += d * 0.2;
    // 邊界反彈
    if (this.x < 8 || this.x > width - 8) this.vx *= -1;
    if (this.y < 8 || this.y > height - 8) this.vy *= -1;
  }
  display(ctx) {
  ctx.save();
  ctx.translate(this.x, this.y);
  ctx.rotate(this.angle);
  // draw centered using intrinsic size fallback to requested size
  drawSVG(ctx, this.svg, 0, 0, productRadius * 2, productRadius * 1.67);
  ctx.restore();
  }
}

// ====== SVG cache and drawing helpers ======
const svgImageCache = new Map();

function createImageFromSVG(svg) {
  if (svgImageCache.has(svg)) return svgImageCache.get(svg);
  const img = new window.Image();
  try {
    const svg64 = btoa(unescape(encodeURIComponent(svg)));
    img.src = 'data:image/svg+xml;base64,' + svg64;
  } catch (e) {
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }
  svgImageCache.set(svg, img);
  return img;
}

function drawSVG(ctx, svgOrImg, x, y, w, h) {
  if (!svgOrImg) return;
  let img = null;
  if (svgOrImg instanceof window.Image) img = svgOrImg;
  else if (typeof svgOrImg === 'string') img = svgImageCache.get(svgOrImg) || createImageFromSVG(svgOrImg);
  if (!img) return;
  if (img.complete && img.naturalWidth > 0) {
    // Draw using SVG intrinsic size (naturalWidth/naturalHeight).
    // Center at the provided x,y so callers can pass object center.
    let iw = img.naturalWidth;
    let ih = img.naturalHeight;
    // some SVGs have 0 natural size; try parsing viewBox from cached svg string if available
    if ((iw === 0 || ih === 0) && typeof svgOrImg === 'string') {
      const svgText = svgOrImg;
      const match = svgText.match(/viewBox\s*=\s*['\"]([\-\d\.]+)\s+([\-\d\.]+)\s+([\d\.]+)\s+([\d\.]+)['\"]/);
      if (match) {
        iw = parseFloat(match[3]);
        ih = parseFloat(match[4]);
      }
    }
    if (iw === 0 || ih === 0) {
      // fallback to requested w/h or small default
      iw = w || 40; ih = h || 40;
    }
    ctx.drawImage(img, x - iw / 2, y - ih / 2, iw, ih);
  }
}

// ====== Helpers to compute overlap-based active site ======
function whenImagesLoaded(imgs, cb) {
  let remaining = imgs.length;
  const tryDec = () => { if (--remaining === 0) cb(); };
  for (const img of imgs) {
    if (img.complete && img.naturalWidth > 0) {
      tryDec();
    } else {
      img.onload = tryDec;
      // fallback error handler
      img.onerror = tryDec;
    }
  }
}

function computeActiveSiteFromOverlap(imgA, imgB, svgTextA, svgTextB) {
  // Parse viewBox from svgTextA or svgTextB (prefer A)
  const vbRegex = /viewBox\s*=\s*['"]([\-\d\.]+)\s+([\-\d\.]+)\s+([\d\.]+)\s+([\d\.]+)['"]/;
  let m = svgTextA && svgTextA.match(vbRegex);
  if (!m && svgTextB) m = svgTextB.match(vbRegex);
  if (!m) {
    console.warn('No viewBox found in either SVG; cannot compute overlap in viewBox coords');
    return null;
  }
  const minX = parseFloat(m[1]);
  const minY = parseFloat(m[2]);
  const vbW = Math.max(1, parseFloat(m[3]));
  const vbH = Math.max(1, parseFloat(m[4]));
  // use viewBox width/height as canvas size (mapping viewBox units to pixels 1:1)
  const w = Math.round(vbW);
  const h = Math.round(vbH);
  const c1 = document.createElement('canvas'); c1.width = w; c1.height = h; const ctx1 = c1.getContext('2d');
  const c2 = document.createElement('canvas'); c2.width = w; c2.height = h; const ctx2 = c2.getContext('2d');
  // draw each image into the viewBox-sized canvas (this preserves viewBox coordinates)
  ctx1.clearRect(0,0,w,h); ctx1.drawImage(imgA, 0, 0, w, h);
  ctx2.clearRect(0,0,w,h); ctx2.drawImage(imgB, 0, 0, w, h);
  const d1 = ctx1.getImageData(0,0,w,h).data;
  const d2 = ctx2.getImageData(0,0,w,h).data;
  let sumX = 0, sumY = 0, count = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a1 = d1[i+3];
      const a2 = d2[i+3];
      if (a1 > 16 && a2 > 16) {
        sumX += x; sumY += y; count++;
      }
    }
  }
  if (count === 0) return null;
  const cx = sumX / count;
  const cy = sumY / count;
  return { cx, cy, w, h, minX, minY };
}

// ====== 主程式邏輯 ======
let enzymes = [], substrates = [], products = [], inerts = [];
let svgEnzActive, svgEnzDenatured, svgSubstrate, svgProduct1, svgProduct2;
// image instances (created from svg strings in init)
let svgEnzActiveImg = null, svgEnzDenaturedImg = null, svgSubstrateImg = null, svgProduct1Img = null, svgProduct2Img = null;
let reactionCount = 0;

let denatureProb = 0;
let chartData = [];
let chartTime = 0;


// ====== UI 控制元件 ======
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width, height = canvas.height;

// highlight/dimmed 狀態
let showEnzyme = true, showSubstrate = true, showProduct = true, showInert = true;
// 全域開關：控制酵素是否會移動（true = 移動）
let enzymesMove = false;

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
  [svgEnzActive, svgEnzDenatured, svgSubstrate, svgProduct1, svgProduct2] = await Promise.all([
    loadSVG('enzyme_active.svg'),
    loadSVG('enzyme_denatured.svg'),
    loadSVG('substrate.svg'),
    loadSVG('product1.svg'),
    loadSVG('product2.svg')
  ]);
  // create Image objects once and cache them
  svgEnzActiveImg = createImageFromSVG(svgEnzActive);
  svgEnzDenaturedImg = createImageFromSVG(svgEnzDenatured);
  svgSubstrateImg = createImageFromSVG(svgSubstrate);
  svgProduct1Img = createImageFromSVG(svgProduct1);
  svgProduct2Img = createImageFromSVG(svgProduct2);
  // 當 enzyme 與 substrate 圖片載入完成後，自動計算活化位（以兩圖的重疊區質心）
  whenImagesLoaded([svgEnzActiveImg, svgSubstrateImg], () => {
    const overlap = computeActiveSiteFromOverlap(svgSubstrateImg, svgEnzActiveImg, svgSubstrate, svgEnzActive);
    if (overlap) {
      // overlap.cx/cy in viewBox pixels (0..w-1). compute normalized offset relative to center
      const cx = overlap.w / 2; const cy = overlap.h / 2;
      const normX = (overlap.cx - cx) / overlap.w; // -0.5..0.5 normalized
      const normY = (overlap.cy - cy) / overlap.h;
      // convert normalized offset to actual image pixel offset using enzyme image natural size
      const drawW = (svgEnzActiveImg.naturalWidth && svgEnzActiveImg.naturalWidth > 0) ? svgEnzActiveImg.naturalWidth : overlap.w;
      const drawH = (svgEnzActiveImg.naturalHeight && svgEnzActiveImg.naturalHeight > 0) ? svgEnzActiveImg.naturalHeight : overlap.h;
      activeSiteX = normX * drawW;
      activeSiteY = normY * drawH;
      // 更新現有酵素實例
      for (const enz of enzymes) enz.activeSite = { x: activeSiteX, y: activeSiteY };
      console.log('Auto activeSite set (pixels):', activeSiteX, activeSiteY);
    } else {
      console.log('No overlap detected between substrate and enzyme images');
    }
    // 初始化酵素（放在此處可確保使用自動計算的 activeSite）
    enzymes = [];
    for (let i = 0; i < enzymeCount; i++) {
      const angle = (i / 8) * 2 * Math.PI;
      const r = 180;
      const e = new Enzyme(
        width / 2 + Math.cos(angle) * r,
        height / 2 + Math.sin(angle) * r,
        svgEnzActiveImg, svgEnzDenaturedImg
      );
      // start inactive if temperature is denaturing
      e.active = !(temp > T_denature);
      enzymes.push(e);
    }
  });
  // 初始化受質
  substrates = [];
  for (let i = 0; i < substrateCount; i++) {
    substrates.push(new Substrate(
      Math.random() * (width - 40) + 20,
      Math.random() * (height - 40) + 20,
      svgSubstrateImg
    ));
  }
  products = [];
  inerts = [];
  for (let i = 0; i < inertCount; i++) {
    inerts.push(new InertMolecule(
      Math.random() * (width - 40) + 20,
      Math.random() * (height - 40) + 20
    ));
  }
  reactionCount = 0;
  chartData = [];
  chartTime = 0;
  // ensure chart canvases fit their parent panels
  fitChartsToContainer();
  requestAnimationFrame(loop);
}

// Resize chart canvases to match their parent container size (CSS box) and preserve drawing scale
function fitChartsToContainer() {
  const summary = document.getElementById('summaryChart');
  const rate = document.getElementById('rateChart');
  if (summary && summary.parentElement) {
    const rect = summary.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(100, Math.floor(rect.width));
    // clamp height: fallback to width * ratio if parent height is 0 or excessively large
    const parentH = Math.floor(rect.height);
    const fallbackH = Math.max(80, Math.floor(w * 0.28)); // sensible aspect ratio
    const maxH = Math.max(120, Math.floor(w * 0.6));
    let h = parentH > 0 ? parentH : fallbackH;
    if (h > maxH) h = maxH;
    summary.width = Math.floor(w * dpr);
    summary.height = Math.floor(h * dpr);
    summary.style.width = w + 'px';
    summary.style.height = h + 'px';
    const ctx = summary.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  if (rate && rate.parentElement) {
    const rect2 = rate.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w2 = Math.max(100, Math.floor(rect2.width));
    const parentH2 = Math.floor(rect2.height);
    const fallbackH2 = Math.max(60, Math.floor(w2 * 0.18));
    const maxH2 = Math.max(100, Math.floor(w2 * 0.45));
    let h2 = parentH2 > 0 ? parentH2 : fallbackH2;
    if (h2 > maxH2) h2 = maxH2;
    rate.width = Math.floor(w2 * dpr);
    rate.height = Math.floor(h2 * dpr);
    rate.style.width = w2 + 'px';
    rate.style.height = h2 + 'px';
    const ctx2 = rate.getContext('2d');
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // redraw charts to fit new sizes
  drawSummaryChart();
  drawChart();
}

// Debounced resize handler
let _resizeTimer = null;
window.addEventListener('resize', () => {
  if (_resizeTimer) clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    fitChartsToContainer();
  }, 120);
});

// ====== 新增受質與酵素功能 ======
document.getElementById('addSubstrateBtn').onclick = function() {
  const enzymeMode = document.getElementById('enzymeSelect').value;
  if (enzymeMode === 'old') {
    // 只用原有酵素反應（不新增酵素）
    substrates.push(new Substrate(
      Math.random() * (width - 40) + 20,
      Math.random() * (height - 40) + 20,
      svgSubstrateImg
    ));
  } else if (enzymeMode === 'new') {
    // 新增一個新酵素（活性）並添加受質
    const angle = Math.random() * 2 * Math.PI;
    const r = 180;
    enzymes.push(new Enzyme(
      width / 2 + Math.cos(angle) * r,
      height / 2 + Math.sin(angle) * r,
      svgEnzActiveImg, svgEnzDenaturedImg
    ));
  // ensure correct active state at current temperature
  enzymes[enzymes.length-1].active = !(temp > T_denature);
    substrates.push(new Substrate(
      Math.random() * (width - 40) + 20,
      Math.random() * (height - 40) + 20,
  svgSubstrateImg
    ));
  }
};

document.getElementById('addEnzymeBtn').onclick = function() {
  // 單純新增一個新酵素
  const angle = Math.random() * 2 * Math.PI;
  const r = 180;
  const newE = new Enzyme(
    width / 2 + Math.cos(angle) * r,
    height / 2 + Math.sin(angle) * r,
    svgEnzActiveImg, svgEnzDenaturedImg
  );
  newE.active = !(temp > T_denature);
  enzymes.push(newE);
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
  ctx.clearRect(0, 0, width, height);
  // 酵素移動與顯示
  for (const enz of enzymes) {
  if (enzymesMove) enz.move(width, height);
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
        const site = enz.getActiveSiteWorld();
        if (force) {
          sub.applyForce(force);
          // 進入吸引區時自動旋轉到酵素角度+偏移
          sub.rotateToEnzymeAngle(enz.angle);
        }
        // 只有真的靠近活化位才設為 bound
        if (enz.checkBinding(sub)) {
          sub.bound = true;
          sub.bindingTimer = 0;
          enz.reactionCount++;
          // 結合時強制對齊酵素角度+偏移
          sub.rotateToEnzymeAngle(enz.angle);
          break;
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
          svgProduct1Img
        ));
        products.push(new Product(
          sub.x, sub.y,
          Math.cos(angle + Math.PI) * speed, Math.sin(angle + Math.PI) * speed,
          svgProduct2Img
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

// draw summary chart (top-level so it can be called from init/resize)
function drawSummaryChart() {
  const chart = document.getElementById('summaryChart');
  if (!chart) return;
  const c = chart.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const drawingW = chart.width / dpr; // logical CSS pixels
  const drawingH = chart.height / dpr;
  c.clearRect(0, 0, chart.width, chart.height);
  if (experimentResults.length === 0) return;
  // 排序並準備繪圖參數（使用 margin-based mapping）
  const sorted = experimentResults.slice().sort((a, b) => a.temp - b.temp);
  const marginLeft = 40, marginRight = 10, marginTop = 10, marginBottom = 44; // more bottom room for labels
  const plotW = drawingW - marginLeft - marginRight;
  const plotH = drawingH - marginTop - marginBottom;
  const tickStart = 0;
  const maxTemp = Math.max(...sorted.map(r => r.temp));
  const tickEnd = Math.max(100, Math.ceil(maxTemp / 10) * 10);
  const tickStep = 10;

  // background and axis lines
  c.fillStyle = '#fff';
  c.fillRect(0, 0, chart.width, chart.height);
  c.strokeStyle = '#333';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(marginLeft, marginTop);
  c.lineTo(marginLeft, drawingH - marginBottom);
  c.lineTo(drawingW - marginRight, drawingH - marginBottom);
  c.stroke();

  // y range
  const yMax = Math.max(...sorted.map(r => r.reaction), 1);

  // draw polyline (uses same mapping as points)
  c.strokeStyle = '#ef476f';
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i < sorted.length; i++) {
    const x = marginLeft + ((sorted[i].temp - tickStart) / (tickEnd - tickStart)) * plotW;
    const y = drawingH - marginBottom - (sorted[i].reaction / yMax) * plotH;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();

  // x-axis ticks and labels
  c.fillStyle = '#333';
  c.font = '12px sans-serif';
  for (let t = tickStart; t <= tickEnd; t += tickStep) {
    const tx = marginLeft + ((t - tickStart) / (tickEnd - tickStart)) * plotW;
    c.strokeStyle = '#ccc';
    c.lineWidth = 1;
  c.beginPath();
  c.moveTo(tx, drawingH - marginBottom);
  c.lineTo(tx, drawingH - marginBottom + 8);
    c.stroke();
  c.fillText(String(t), tx - 10, drawingH - marginBottom + 20);
  }

  // draw data points (same mapping)
  c.fillStyle = '#ef476f';
  for (let i = 0; i < sorted.length; i++) {
    const x = marginLeft + ((sorted[i].temp - tickStart) / (tickEnd - tickStart)) * plotW;
    const y = drawingH - marginBottom - (sorted[i].reaction / yMax) * plotH;
    c.beginPath();
    c.arc(x, y, 5, 0, 2 * Math.PI);
    c.fill();
  }

  // axis labels
  c.fillStyle = '#333';
  c.font = '14px sans-serif';
  c.fillText('溫度', drawingW / 2 - 20, drawingH - marginBottom + 28);
  c.save();
  c.translate(10, drawingH / 2 + 20);
  c.rotate(-Math.PI / 2);
  c.fillText('反應數', 0, 0);
  c.restore();
}

function drawChart() {
  const chart = document.getElementById('rateChart');
  const c = chart.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const drawingW = chart.width / dpr;
  const drawingH = chart.height / dpr;
  const marginLeft = 40, marginRight = 10, marginTop = 8, marginBottom = 34;
  // background
  c.fillStyle = '#fff';
  c.fillRect(0, 0, chart.width, chart.height);
  c.strokeStyle = '#219ebc';
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i < chartData.length; i++) {
    const x = (i / (chartData.length - 1)) * (drawingW - marginLeft - marginRight) + marginLeft;
    const y = drawingH - marginBottom - (chartData[i].rate / Math.max(1, reactionCount)) * (drawingH - marginTop - marginBottom);
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  // 軸線
  c.strokeStyle = '#888';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(marginLeft, marginTop); c.lineTo(marginLeft, drawingH - marginBottom); c.lineTo(drawingW - marginRight, drawingH - marginBottom);
  c.stroke();
}

// ====== 啟動 ======
init();
