let ctx,
  edges = [],
  nodeMap = {},
  ellipses = [],
  cells = [];
let CELL_COUNT = 10;


// === 參數集中管理 ===
const CELL_RADIUS = 3;         // 血球半徑（像素）
const CELL_SPEED_MIN = 0.02;   // 血球最小速度
const CELL_SPEED_MAX = 0.14;   // 血球最大速度

const HEART_PERIOD = 300;      // 心臟跳動週期（幀數，約3秒）
let heartFrame = 0;            // 心臟動畫計數


const FIRST_LEFT_VENTRICLE_ID = "393";
const FIRST_RIGHT_VENTRICLE_ID = "177";

// 取得所有 ellipse 節點
function getEllipses(cells) {
  return cells
    .filter((cell) => cell.getAttribute("style")?.includes("ellipse"))
    .map((cell) => {
      const id = cell.getAttribute("id");
      const geometry = cell.getElementsByTagName("mxGeometry")[0];
      const x = geometry?.getAttribute("x") ?? 0;
      const y = geometry?.getAttribute("y") ?? 0;
      const value = cell.getAttribute("value") || "";
      return { id, x: Number(x), y: Number(y), value };
    });
}

// 取得所有 edge（有向邊）
function getEdges(cells) {
  return cells
    .filter(
      (cell) =>        
        cell.getAttribute("source") &&
        cell.getAttribute("target")
    )
    .map((cell) => {
      // 從 style 解析 strokeWidth
      const style = cell.getAttribute("style") || "";
      const match = style.match(/strokeWidth=(\d+(\.\d+)?)/);
      const strokeWidth = match ? parseFloat(match[1]) : 1;
      return {
        id: cell.getAttribute("id"),
        strokeWidth,
        source: cell.getAttribute("source"),
        target: cell.getAttribute("target"),
      };
    });
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
    const strokeWidth = edge.strokeWidth || 1;
    if (!from || !to) return;
    drawBloodVessel(ctx, from.x + 50, from.y + 50, to.x + 50, to.y + 50, strokeWidth);
  });
}

// 畫血管
function drawBloodVessel(ctx, x1, y1, x2, y2, strokeWidth) {
  const headlen = 12;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  // isolate canvas state so styles (like lineWidth) don't leak
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = "#ffcaca6f";
  ctx.lineWidth = strokeWidth*5 || 2;
  ctx.stroke();
  ctx.restore();  
  // drawArrowHead(ctx, x2, y2, angle, headlen, "#1976d2"); // 可選擇是否畫箭頭
  
}


// 畫箭頭
function drawArrowHead(ctx, x2, y2, angle, headlen = 12, color = "#1976d2") {
  ctx.save();
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
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}


// 畫血球
function drawCells(ctx, cells, nodeMap) {
  for (const c of cells) {
    if (c.isDone()) continue;
    c.update();
    const pos = c.getPos(nodeMap);
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, CELL_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = "#ff5722";
    ctx.fill();
    ctx.strokeStyle = "#b71c1c";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}

// cell類別（即時隨機選出口）
class Cell {
  constructor(startId) {
    this.currentNode = startId;
    this.nextNode = null;
    this.t = 0;
    //this.speed = 0.02 + Math.random() * 0.02;
    this.speed = 0.02;
    this.chooseNext();
    this.offset = 0; // 橫向偏移
    this.pathWidth = 10; // 路徑寬度
    this.frameCount = 0;      // <--- 加這行
    this.offsetInterval = 8;  // 每幾幀才更新 offset

  }  
  getCurrentValue() {
    return nodeMap[this.currentNode]?.value || "";
  }


  chooseNext() {
    // 找所有從 currentNode 出發的邊
    let outs = edges.filter((e) => e.source === this.currentNode);

    // 取得目前與目標節點的 value
    const currValue = nodeMap[this.currentNode]?.value || "";

    // 你可以在這裡根據 value 過濾不允許的逆行（如心室→心房）
    outs = outs.filter(e => {
      const targetValue = nodeMap[e.target]?.value || "";
      // 範例：阻擋所有「心室」到「心房」的逆行
      if (currValue.includes("心室") && targetValue.includes("心房")) {
        return false;
      }
      return true;
    });

    if (outs.length === 0) {
      this.nextNode = null;
      return;
    }
    const nextEdge = outs[Math.floor(Math.random() * outs.length)];
    this.nextNode = nextEdge.target;

    // --- 多個心臟節點的加速機制 ---
    // 只要 value 包含「心房」或「心室」就視為心臟部位
    const isEnteringHeart = nodeMap[nextEdge.target]?.value?.match(/心室/);
    const isLeavingHeart = nodeMap[nextEdge.source]?.value?.match(/心室/);

    const DIASTOLE_RATIO = 2/3; // 舒張期比例
    const SYSTOLE_RATIO = 1/3;  // 收縮期比例

    const phase = (heartFrame % HEART_PERIOD) / HEART_PERIOD;
    let heartBoost = 1;
    // 進入心臟（吸入加速，舒張期）
    if (isEnteringHeart) {
      if (phase < DIASTOLE_RATIO) {
        // phase / DIASTOLE_RATIO 會從 0~1
        heartBoost = 1 + 0.7 * Math.sin(Math.PI * (phase / DIASTOLE_RATIO));
      }
    }
    // 離開心臟（打出加速，收縮期）
    if (isLeavingHeart) {
      if (phase >= DIASTOLE_RATIO) {
        // (phase - DIASTOLE_RATIO) / SYSTOLE_RATIO 會從 0~1
        heartBoost = 1 + 0.7 * Math.sin(Math.PI * ((phase - DIASTOLE_RATIO) / SYSTOLE_RATIO));
      }
    }

    // 根據 strokeWidth 設定速度
    const minW = 1, maxW = 5;
    const minS = CELL_SPEED_MIN, maxS = CELL_SPEED_MAX;
    const w = Math.max(minW, Math.min(nextEdge.strokeWidth, maxW));
    let baseSpeed = minS + ((w - minW) / (maxW - minW)) * (maxS - minS);

    // 加入亂數微調（±10%）
    const rand = 0.9 + Math.random() * 0.2;
    this.speed = baseSpeed * heartBoost * rand;
    this.baseSpeed = this.speed; // 新增這行，記住基礎速度

  }

  update() {
    const phase = (heartFrame % HEART_PERIOD) / HEART_PERIOD;
    const heartBoost = 1 + 0.7 * Math.sin(phase * 2 * Math.PI);
    this.speed = this.baseSpeed * heartBoost;

    // --- SYSTOLE時，心室內血球有機率被彈回對應的第一個心室節點 ---
    const DIASTOLE_RATIO = 2/3;
    if (phase >= DIASTOLE_RATIO) {
      const currValue = nodeMap[this.currentNode]?.value || "";
      // 左心室
      if (currValue.includes("左心室") && this.currentNode !== FIRST_LEFT_VENTRICLE_ID) {
        if (Math.random() < 0.1) {
          this.nextNode = FIRST_LEFT_VENTRICLE_ID;
          this.t = 0;
        }
      }
      // 右心室
      if (currValue.includes("右心室") && this.currentNode !== FIRST_RIGHT_VENTRICLE_ID) {
        if (Math.random() < 0.1) {
          this.nextNode = FIRST_RIGHT_VENTRICLE_ID;
          this.t = 0;
        }
      }
    }

    if (!this.nextNode) return;
    this.t += this.speed;
    if (this.t >= 1) {
      this.currentNode = this.nextNode;
      this.t = 0;
      this.chooseNext();
    }
  }

  update3() {
    // === 新增：所有血球都受心臟週期影響 ===
    const phase = (heartFrame % HEART_PERIOD) / HEART_PERIOD;
    // 你可以調整 0.7 這個數字決定加速幅度
    const heartBoost = 1 + 0.7 * Math.sin(phase * 2 * Math.PI);

    // 讓速度跟著心跳變化
    // const originalSpeed = this.speed;
    // this.speed = originalSpeed * heartBoost;
    this.speed = this.baseSpeed * heartBoost; // 每幀用 baseSpeed 當基準


    if (!this.nextNode) return;
    this.t += this.speed;
    if (this.t >= 1) {
      this.currentNode = this.nextNode;
      this.t = 0;
      this.chooseNext();
    }
  }  
  update2() {
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
function resetCells() {
  cells = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const start = randomStartId(ellipses);
    cells.push(new Cell(start));
  }
}


function randomStartId(ellipses) {
  return ellipses[Math.floor(Math.random() * ellipses.length)].id;
}

// 動畫主迴圈
function animate() {
  ctx.clearRect(0, 0, 800, 800);
  drawEdges(ctx, edges, nodeMap);
  //drawNodes(ctx, ellipses, nodeMap);
  heartFrame = (heartFrame + 1) % HEART_PERIOD;

  // 畫血球
  drawCells(ctx, cells, nodeMap);
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
      // drawNodes(ctx, ellipses, nodeMap);
      // drawEdges(ctx, edges, nodeMap);

      resetCells();
      animate();

      // 點擊重設粒子
      canvas.addEventListener("click", resetCells);
    })
    .catch((err) => {
      document.getElementById("output").textContent =
        "載入 data.xml 失敗：" + err;
    });
}

// 啟動
init();
