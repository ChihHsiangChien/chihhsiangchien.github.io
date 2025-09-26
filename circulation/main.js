let ctx,
  edges = [],
  nodeMap = {},
  ellipses = [],
  particles = [];
let PARTICLE_COUNT = 100;

// 取得所有 ellipse 節點
function getEllipses(cells) {
  return cells
    .filter((cell) => cell.getAttribute("style")?.includes("ellipse"))
    .map((cell) => {
      const id = cell.getAttribute("id");
      const geometry = cell.getElementsByTagName("mxGeometry")[0];
      const x = geometry?.getAttribute("x") ?? 0;
      const y = geometry?.getAttribute("y") ?? 0;
      return { id, x: Number(x), y: Number(y) };
    });
}

// 取得所有 edge（有向邊）
function getEdges(cells) {
  return cells
    .filter(
      (cell) =>
        cell.getAttribute("edge") === "1" &&
        cell.getAttribute("source") &&
        cell.getAttribute("target")
    )
    .map((cell) => ({
      edge: cell.getAttribute("id"),
      source: cell.getAttribute("source"),
      target: cell.getAttribute("target"),
    }));
}

// 畫所有節點
function drawNodes(ctx, nodes, nodeMap) {
  nodes.forEach((node) => {
    nodeMap[node.id] = node;
    ctx.beginPath();
    ctx.arc(node.x + 50, node.y + 50, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.id, node.x + 50, node.y + 50);
  });
}

// 畫所有邊
function drawEdges(ctx, edges, nodeMap) {
  edges.forEach((edge) => {
    const from = nodeMap[edge.source];
    const to = nodeMap[edge.target];
    if (!from || !to) return;
    drawArrow(ctx, from.x + 50, from.y + 50, to.x + 50, to.y + 50);
  });
}

// 畫箭頭
function drawArrow(ctx, x1, y1, x2, y2) {
  const headlen = 12;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = "#1976d2";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headlen * Math.cos(angle - Math.PI / 7),
    y2 - headlen * Math.sin(angle - Math.PI / 7)
  );
  ctx.lineTo(
    x2 - headlen * Math.cos(angle + Math.PI / 7),
    y2 - headlen * Math.sin(angle + Math.PI / 7)
  );
  ctx.lineTo(x2, y2);
  ctx.lineTo(
    x2 - headlen * Math.cos(angle - Math.PI / 7),
    y2 - headlen * Math.sin(angle - Math.PI / 7)
  );
  ctx.fillStyle = "#1976d2";
  ctx.fill();
}

// 粒子類別（即時隨機選出口）
class Particle {
  constructor(startId) {
    this.currentNode = startId;
    this.nextNode = null;
    this.t = 0;
    this.speed = 0.01 + Math.random() * 0.01;
    this.chooseNext();
    this.offset = 0; // 橫向偏移
    this.pathWidth = 10; // 路徑寬度
    this.frameCount = 0;      // <--- 加這行
    this.offsetInterval = 8;  // 每幾幀才更新 offset

  }
  chooseNext() {
    // 找所有從 currentNode 出發的邊
    const outs = edges.filter((e) => e.source === this.currentNode);
    if (outs.length === 0) {
      this.nextNode = null;
      return;
    }
    const nextEdge = outs[Math.floor(Math.random() * outs.length)];
    this.nextNode = nextEdge.target;
  }
  update() {
    if (!this.nextNode) return;
    this.t += this.speed;
    if (this.t >= 1) {
      this.currentNode = this.nextNode;
      this.t = 0;
      this.chooseNext();
    }
  }
  isDone() {
    return !this.nextNode;
  }
  getPos2(nodeMap) {
    const from = nodeMap[this.currentNode];
    const to = nodeMap[this.nextNode];
    if (!from || !to) return { x: 0, y: 0 };
    const x = from.x + 50 + (to.x - from.x) * this.t;
    const y = from.y + 50 + (to.y - from.y) * this.t;
    return { x, y };
  }
  getPos(nodeMap) {
    const from = nodeMap[this.currentNode];
    const to = nodeMap[this.nextNode];
    if (!from || !to) return { x: 0, y: 0 };
    // 主路徑方向
    const fx = from.x + 50;
    const fy = from.y + 50;
    const tx = to.x + 50;
    const ty = to.y + 50;
    const dx = tx - fx;
    const dy = ty - fy;
    // 單位法向量（垂直於主路徑）
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    // --- 布朗運動式平滑抖動 ---
    // 每幀微調 offset，讓它在 [-pathWidth/2, pathWidth/2] 之間
    const drift = (Math.random() - 0.5) * 1.2; // 調整這個數值可改變抖動幅度
    this.offset += drift;
    // 限制 offset 不超過血管寬度
    const halfWidth = this.pathWidth / 2;
    if (this.offset > halfWidth) this.offset = halfWidth;
    if (this.offset < -halfWidth) this.offset = -halfWidth;
    // 線性插值 + 法向量偏移
    const x = fx + dx * this.t + nx * this.offset;
    const y = fy + dy * this.t + ny * this.offset;
    return { x, y };
  }
}

// 產生粒子
function resetParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const start = randomStartId(ellipses);
    particles.push(new Particle(start));
  }
}

// 隨機產生一條路徑
function randomPath(startId, edges, nodeMap) {
  const path = [startId];
  let current = startId;
  const maxStep = 30;
  for (let i = 0; i < maxStep; i++) {
    const outs = edges.filter((e) => e.source === current);
    if (outs.length === 0) break;
    const next = outs[Math.floor(Math.random() * outs.length)].target;
    path.push(next);
    current = next;
    if (!edges.some((e) => e.source === current)) break;
  }
  return path;
}

function randomStartId(ellipses) {
  return ellipses[Math.floor(Math.random() * ellipses.length)].id;
}

// 動畫主迴圈
function animate() {
  ctx.clearRect(0, 0, 800, 800);
  drawEdges(ctx, edges, nodeMap);
  //drawNodes(ctx, ellipses, nodeMap);

  // 畫粒子
  for (const p of particles) {
    if (p.isDone()) continue;
    p.update();
    const pos = p.getPos(nodeMap);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = "#ff5722";
    ctx.fill();
    ctx.strokeStyle = "#b71c1c";
    ctx.stroke();
  }
  requestAnimationFrame(animate);
}

// 初始化
function init() {
  fetch("data.xml")
    .then((response) => response.text())
    .then((xmlString) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      const mxCells = Array.from(xmlDoc.getElementsByTagName("mxCell"));

      ellipses = getEllipses(mxCells);
      edges = getEdges(mxCells);

      document.getElementById("output").textContent =
        "Ellipses:\n" +
        JSON.stringify(ellipses, null, 2) +
        "\n\nEdges:\n" +
        JSON.stringify(edges, null, 2);

      const canvas = document.getElementById("graph");
      ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, 800, 800);

      nodeMap = {};
      ellipses.forEach(node => {
        nodeMap[node.id] = node;
      });      
      drawNodes(ctx, ellipses, nodeMap);
      //drawEdges(ctx, edges, nodeMap);

      resetParticles();
      animate();

      // 點擊重設粒子
      canvas.addEventListener("click", resetParticles);
    })
    .catch((err) => {
      document.getElementById("output").textContent =
        "載入 data.xml 失敗：" + err;
    });
}

// 啟動
init();
