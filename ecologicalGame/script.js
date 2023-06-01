var imageWidth = 50;
var imageHeight = 50;
var numSheeps = 0;
var canvasBorder = 30;

// 创建一个生物类
class Organism {
  constructor(type, x, y, lifespan, xSpeed, ySpeed, imageSrc) {
    this.type = type; // 生物的類型
    this.x = x; // 位置的x坐标
    this.y = y; // 位置的y坐标
    this.lifespan = lifespan;    // 壽命
    this.energy = 100;         // 吃飽程度
    this.maxLifespan = lifespan; // 最大生命值

    this.xSpeed = xSpeed; // 速度
    this.ySpeed = ySpeed; // 速度
    this.image = new Image();
    this.image.src = imageSrc; // 图片位置

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
  // 繪製energy條
  ctx.fillStyle = "blue";
  const energyWidth = (this.energy / 100) * imageWidth;
  ctx.fillRect(this.x, this.y + imageHeight * 1.2, energyWidth, 5);
};

Organism.prototype.move = function () {
  // 根据速度更新生物的位置
  this.x += this.xSpeed;
  this.y += this.ySpeed;

  // 检测邊界碰撞
  if (this.x <= canvasBorder || this.x + imageWidth >= canvas.width - canvasBorder) {
    this.xSpeed *= -1; // 改變x方向速度
  }

  if (this.y <= canvasBorder || this.y + imageHeight * 1.5 >= canvas.height - canvasBorder) {
    this.ySpeed *= -1; // 改變y方向速度
  }
};

Organism.prototype.dead = function () {
  const index = organisms.indexOf(this);
  if (index !== -1) {
    organisms.splice(index, 1);
  }
}

Organism.prototype.born = function () {
  const child = new Organism(
    this.name,
    this.x,
    this.y,
    this.maxLifespan,
    getRandomInt(-5,5),
    getRandomInt(-5,5),
    this.image.src
  );
  organisms.push(child);

};

Organism.prototype.updateAgeAndLifespan = function () {
  // 根据能量更新生物的速度
  var speedMultiplier = this.energy / 100; // 根据能量计算速度的变化系数，这里假设能量和速度的关系为二次函数

  // 根据速度变化系数调整 xSpeed 和 ySpeed
  // this.xSpeed *= speedMultiplier;
  // this.ySpeed *= speedMultiplier;


  // 檢查 organism 是否為草
  if (this.type !== 'grass') {
    // 根據吃飽程度調整壽命變化
    const energyFactor = 100 - this.energy; // 越餓(energy越小)，壽命降低越快
    const timeFactor = 0.1; // 控制時間對壽命的影響程度
    this.lifespan -= energyFactor * timeFactor;

    // 根据移動距離降低能量
    const distance = Math.sqrt(this.xSpeed ** 2 + this.ySpeed ** 2);
    this.energy -= distance * 0.1;

  } else {
    // 調整草的壽命變化
    const timeFactor = 0.2; // 控制時間對壽命的影響程度
    this.lifespan -= timeFactor;
  }

  // 檢查是否死亡
  if (this.lifespan <= 0) {
    this.dead();
  }
}

// 從min到max取亂數
function getRandomInt(min, max) {
  //return Math.floor(Math.random() * (max - min + 1)) + min;
  return Math.random() * (max - min + 1) + min;
}


// 创建canvas元素
// const canvas = document.createElement('canvas');
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

// 设置canvas的宽度和高度
canvas.width = window.innerWidth * 0.9;
canvas.height = window.innerHeight * 0.9;

const organisms = [];
for (let i = 0; i < 10; i++) {
  const x = Math.random() * canvas.width; // 在canvas宽度范围内生成随机x坐标
  const y = Math.random() * canvas.height; // 在canvas高度范围内生成随机y坐标
  const xSpeed = getRandomInt(-5,5); // 在canvas高度范围内生成随机y坐标
  const ySpeed = getRandomInt(-5,5); // 在canvas高度范围内生成随机y坐标
  const sheep = new Organism("sheep", x, y, 100, xSpeed, ySpeed, "sheep.png");
  organisms.push(sheep);
  numSheeps += 1;
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  organisms.forEach((organism) => {
    organism.move();
    organism.draw();
    organism.updateAgeAndLifespan();

    //壽命
    if (organism.lifespan < organism.maxLifespan * 0.6 &&
      organism.lifespan >= organism.maxLifespan * 0.5 &&
      organism.numChildren == 0
    ) {
      organism.born();
      organism.numChildren += 1;
    }
  });

  requestAnimationFrame(animate);
}

animate();
