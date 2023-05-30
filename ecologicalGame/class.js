// Patch 對象模型
class Patch {
  constructor(pxcor, pycor) {
    this.pxcor = pxcor;
    this.pycor = pycor;
    this.pcolor = 0; // 初始顏色
  }

  setColor(color) {
    this.pcolor = color;
  }
}

// Tadpole 對象模型
class Tadpole {
  constructor() {
    this.shape = "";
    this.xcor = 0;
    this.ycor = 0;
    this.size = 0;
    this.color = "";
    this.heading = 0;
  }

  setShape(shape) {
    this.shape = shape;
  }

  setXCor(xcor) {
    this.xcor = xcor;
  }

  setYCor(ycor) {
    this.ycor = ycor;
  }

  setSize(size) {
    this.size = size;
  }

  setColor(color) {
    this.color = color;
  }

  setHeading(heading) {
    this.heading = heading;
  }

  fd(distance) {
    // 移動的邏輯
  }
}

// Net 對象模型
class Net {
  constructor() {
    this.xcor = 0;
    this.ycor = 0;
    this.shape = "";
    this.size = 0;
  }

  setXCor(xcor) {
    this.xcor = xcor;
  }

  setYCor(ycor) {
    this.ycor = ycor;
  }

  setShape(shape) {
    this.shape = shape;
  }

  setSize(size) {
    this.size = size;
  }
}

// Arrow 對象模型
class Arrow {
  constructor() {
    this.size = 0;
    this.heading = 0;
    this.color = "";
    this.xcor = 0;
    this.ycor = 0;
  }

  setSize(size) {
    this.size = size;
  }

  setHeading(heading) {
    this.heading = heading;
  }

  setColor(color) {
    this.color = color;
  }

  setXCor(xcor) {
    this.xcor = xcor;
  }

  setYCor(ycor) {
    this.ycor = ycor;
  }
}

// Scoop 對象模型
class Scoop {
  constructor() {
    this.xcor = 0;
    this.ycor = 0;
    this.shape = "";
    this.size = 0;
  }

  setXCor(xcor) {
    this.xcor = xcor;
  }

  setYCor(ycor) {
    this.ycor = ycor;
  }

  setShape(shape) {
    this.shape = shape;
  }

  setSize(size) {
    this.size = size;
  }

  die() {
    // 移除 scoop 的邏輯
  }
}

// 創建 Canvas 元素
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// 創建 patches
const patches = [];
const patchWidth = 10; // 每個 patch 的寬度
const patchHeight = 10; // 每個 patch 的高度

for (let px = 0; px < canvas.width; px += patchWidth) {
  for (let py = 0; py < canvas.height; py += patchHeight) {
    const patch = new Patch(px, py);
    patches.push(patch);
  }
}

// 在 canvas 上繪製 patches
patches.forEach((patch) => {
  ctx.fillStyle = patch.pcolor;
  ctx.fillRect(patch.pxcor, patch.pycor, patchWidth, patchHeight);
});

// 創建 tadpole
const tadpole = new Tadpole();
tadpole.setShape("tadpoleR");
tadpole.setXCor(50);
tadpole.setYCor(50);
tadpole.setSize(2);
tadpole.setColor("green");

// 在 canvas 上繪製 tadpole
ctx.fillStyle = tadpole.color;
ctx.fillRect(tadpole.xcor, tadpole.ycor, tadpole.size, tadpole.size);

/*
// 創建 patches
const patches = [];
for (let px = 0; px < patchWidth; px++) {
  for (let py = 0; py < patchHeight; py++) {
    const patch = new Patch(px, py);
    patches.push(patch);
  }
}

// 創建 tadpole
const tadpole = [];
for (let i = 0; i < tadpoleCount; i++) {
  const t = new Tadpole();
  tadpole.push(t);
}

// 創建 net
const net = [];
for (let i = 0; i < netCount; i++) {
  const n = new Net();
  net.push(n);
}

// 創建 arrow
const arrow = [];
for (let i = 0; i < arrowCount; i++) {
  const a = new Arrow();
  arrow.push(a);
}

// 創建 scoop
const scoop = [];
for (let i = 0; i < scoopCount; i++) {
  const s = new Scoop();
  scoop.push(s);
}
// 創建 Canvas 元素
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// 創建 patches
const patches = [];
const patchWidth = 10; // 每個 patch 的寬度
const patchHeight = 10; // 每個 patch 的高度

for (let px = 0; px < canvas.width; px += patchWidth) {
  for (let py = 0; py < canvas.height; py += patchHeight) {
    const patch = new Patch(px, py);
    patches.push(patch);
  }
}

// 在 canvas 上繪製 patches
patches.forEach((patch) => {
  ctx.fillStyle = patch.pcolor;
  ctx.fillRect(patch.pxcor, patch.pycor, patchWidth, patchHeight);
});

// 創建 tadpole
const tadpole = new Tadpole();
tadpole.setShape("tadpoleR");
tadpole.setXCor(50);
tadpole.setYCor(50);
tadpole.setSize(2);
tadpole.setColor("green");

// 在 canvas 上繪製 tadpole
ctx.fillStyle = tadpole.color;
ctx.fillRect(tadpole.xcor, tadpole.ycor, tadpole.size, tadpole.size);
*/
