class Organism {
  constructor(type, xGridIdx, yGridIdx, xSpeed, ySpeed, reproduceInterval) {
    this.type = type; // 生物的類型
    this.xGridIdx = xGridIdx;
    this.yGridIdx = yGridIdx;
    this.x = this.xGridIdx * gridWidth + gridWidth; // 位置的x坐标
    this.y = this.yGridIdx * gridHeight + gridHeight; // 位置的y坐标    
    this.lifespan = 100; // 壽命
    this.energy = 100; // 吃飽程度
    this.maxLifespan = 100; // 最大生命值

    this.xSpeed = xSpeed; // 速度
    this.ySpeed = ySpeed; // 速度

    this.reproduceInterval = reproduceInterval;
    this.reproduceTime = this.lifespan - this.reproduceInterval;

    this.image = new Image();
    this.image.src = this.type + ".png";

    this.numChildren = 0;

    // 設置圖片加載完成後的callback，確保繪製時圖片已經加載完成
    this.image.onload = () => {
      this.draw();
    };
  }
}

Organism.prototype.draw = function () {
  ctx.drawImage(this.image, this.x, this.y, imageWidth, imageHeight);

  // 繪製生命值條
  ctx.fillStyle = "red";
  const lifespanWidth = (this.lifespan / this.maxLifespan) * imageWidth;
  ctx.fillRect(this.x, this.y + imageHeight, lifespanWidth, 5);

  if (this.type === "grass") {
    return;
  }
  // 繪製energy條
  ctx.fillStyle = "blue";
  const energyWidth = (this.energy / 100) * imageWidth;
  ctx.fillRect(this.x, this.y + imageHeight * 1.2, energyWidth, 5);
};

Organism.prototype.move = function () {

  // 草不執行move
  if (this.type === "grass") {
    return;
  }

  // 把grids裡的舊位置先刪除
  const gridIndex =
    grids[this.type][this.yGridIdx][this.xGridIdx].indexOf(this);

  if (gridIndex !== -1) {
    grids[this.type][this.yGridIdx][this.xGridIdx].splice(gridIndex, 1);
  }

  // 根据速度更新生物的位置
  this.x += this.xSpeed;
  this.y += this.ySpeed;

  // 检测邊界碰撞
  if (this.x <= gridWidth) {
    this.xSpeed *= -1; // 改變x方向速度
    this.x = gridWidth;
  }

  if (this.x >= canvas.width - gridWidth) {
    this.xSpeed *= -1; // 改變x方向速度
    this.x = canvas.width - gridWidth;
  }

  if (this.y <= gridHeight) {
    this.ySpeed *= -1; // 改變y方向速度
    this.y = gridHeight;
  }

  if (this.y >= canvas.height - gridHeight) {
    this.ySpeed *= -1; // 改變y方向速度
    this.y = canvas.height - gridHeight;
  }

  this.xGridIdx = Math.floor((this.x - gridWidth) / gridWidth);
  this.yGridIdx = Math.floor((this.y - gridHeight) / gridHeight);

  if (!grids[this.type][this.yGridIdx][this.xGridIdx]) {
    grids[this.type][this.yGridIdx][this.xGridIdx] = [];
  }
  grids[this.type][this.yGridIdx][this.xGridIdx].push(this);
};

Organism.prototype.eat = function () {

  //草沒有獵物
  if (this.type === "grass") {
    return;
  }

  // 同一個grid cell沒有草
  if (grids["grass"][this.yGridIdx][this.xGridIdx] === null) {
    return;
  }

  // 吃到草
  if (grids["grass"][this.yGridIdx][this.xGridIdx].length !== 0) {
    this.energy += 10;
    this.lifespan += 10;
    var food = grids["grass"][this.yGridIdx][this.xGridIdx].pop();
    food.dead();
  }
};

Organism.prototype.dead = function () {
  const index = organisms[this.type].indexOf(this);
  if (index !== -1) {
    organisms[this.type].splice(index, 1);
  }
  const gridIndex =
    grids[this.type][this.yGridIdx][this.xGridIdx].indexOf(this);
  if (gridIndex !== -1) {
    grids[this.type][this.yGridIdx][this.xGridIdx].splice(gridIndex, 1);
  }
};

function createGrid(type) {
  if (!grids.hasOwnProperty(type)) {
    var matrix = new Array(numGridY)
      .fill(null)
      .map(() => new Array(numGridX).fill(null));
    //var matrix = new Array(numGridY).fill(0).map(() => new Array(numGridX).fill(0));
    grids[type] = matrix;
  }
}
function getEmptyCell(type) {
  var xGridIdx = Math.floor((Math.random() * (canvas.width - 2 * gridWidth)) / gridWidth);
  var yGridIdx = Math.floor((Math.random() * (canvas.height - 2 * gridHeight)) / gridHeight);

  while (grids[type][yGridIdx][xGridIdx] !== null) {
    // console.log(grids[type][x][y]) ;
    xGridIdx = Math.floor((Math.random() * (canvas.width - 2 * gridWidth)) / gridWidth);
    yGridIdx = Math.floor((Math.random() * (canvas.height - 2 * gridHeight)) / gridHeight);
  }

  return { xGridIdx, yGridIdx };
}
Organism.prototype.born = function () {
  var { xGridIdx, yGridIdx } = getEmptyCell(this.type);

  var xSpeed = 0;
  var ySpeed = 0;
  if (this.type !== "grass") {
    xGridIdx = this.xGridIdx;
    yGridIdx = this.yGridIdx;
    xSpeed = getRandomInt(-5, 5);
    ySpeed = getRandomInt(-5, 5);
  }
  var child = new Organism(this.type, xGridIdx, yGridIdx, xSpeed, ySpeed, this.reproduceInterval);
  if (organisms.hasOwnProperty(this.type)) {
    organisms[child.type].push(child);
  } else {
    organisms[child.type] = [child];
  }

  if (!grids[child.type][child.yGridIdx][child.xGridIdx]) {
    grids[child.type][child.yGridIdx][child.xGridIdx] = [];
  }
  grids[child.type][child.yGridIdx][child.xGridIdx].push(child);
};

Organism.prototype.updateAgeAndLifespan = function () {
  switch (this.type) {
    case "grass":
      {
        const timeFactor = 0.1; // 控制時間對壽命的影響程度
        this.lifespan -= timeFactor;
      }
      break;
    default: {
      const timeFactor = 0.1; // 控制時間對壽命的影響程度
      const energyFactor = 0.0005;

      this.lifespan -= timeFactor - (this.energy * energyFactor);
      this.energy -= 0.1;
      //this.lifespan -= timeFactor;
    }
  }

  // 檢查是否死亡
  if (this.lifespan <= 0 || this.energy <= 20) {
    this.dead();
  }
};

// 從min到max取亂數
function getRandomInt(min, max) {
  //return Math.floor(Math.random() * (max - min + 1)) + min;
  return Math.random() * (max - min + 1) + min;
}

function generateOrganisms(type, num) {
  for (let i = 0; i < num; i++) {
    var xGridIdx, yGridIdx;
    var xSpeed, ySpeed;
    var reproduceInterval;

    switch (type) {
      case "grass":
        {
          ({ xGridIdx, yGridIdx } = getEmptyCell(type));
          xSpeed = ySpeed = 0;
          reproduceInterval = 40;
        }
        break;
      default: {
        xGridIdx = Math.floor((Math.random() * (canvas.width - 2 * gridWidth)) / gridWidth);
        yGridIdx = Math.floor((Math.random() * (canvas.height - 2 * gridHeight)) / gridHeight);
        xSpeed = getRandomInt(-5, 5);
        ySpeed = getRandomInt(-5, 5);
        reproduceInterval = 50;
      }
    }

    var organism = new Organism(type, xGridIdx, yGridIdx, xSpeed, ySpeed, reproduceInterval);

    if (type in organisms) {
      organisms[type].push(organism);
    } else {
      organisms[type] = [organism];
    }

    if (!grids[type][yGridIdx][xGridIdx]) {
      grids[type][yGridIdx][xGridIdx] = [];
    }
    grids[type][yGridIdx][xGridIdx].push(organism);
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const organismTypes = Object.keys(organisms).sort((a, b) => {
    // Compare the keys in reverse order
    if (a > b) {
      return 1;
    } else if (a < b) {
      return -1;
    } else {
      return 0;
    }
  });

  organismTypes.forEach((type) => {
    organisms[type].forEach((organism) => {
      organism.move();
      organism.eat();
      organism.draw();
      organism.updateAgeAndLifespan();

      // 生殖的時機
      if (Math.floor(organism.lifespan) === organism.reproduceTime) {
        organism.born();
        organism.reproduceTime -= organism.reproduceInterval;
      }

    });
  });

  requestAnimationFrame(animate);
}

// 创建canvas元素
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

// 设置canvas的宽度和高度
canvas.width = window.innerWidth * 0.9;
canvas.height = window.innerHeight * 0.9;

var imageWidth = 50;
var imageHeight = 50;
var gridWidth = imageWidth * 1.1;
var gridHeight = imageHeight * 1.4;

var numGridX = Math.floor((canvas.width - 2 * gridWidth) / gridWidth) + 1;
var numGridY = Math.floor((canvas.height - 2 * gridHeight) / gridHeight) + 1;


var organisms = {};
var grids = {};

createGrid("sheep");
generateOrganisms("sheep", 3);
createGrid("grass");
generateOrganisms("grass", 30);

animate();
