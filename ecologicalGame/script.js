var imageWidth = 50;
var imageHeight = 50;
var numSheeps = 0;

// 创建一个生物类
class Organism {
  constructor(name, x, y, health, xSpeed, ySpeed, imageSrc) {
    this.name = name; // 生物的名字
    this.x = x; // 位置的x坐标
    this.y = y; // 位置的y坐标
    this.health = health; // 生命值
    this.maxHealth = health; // 最大生命值

    this.xSpeed = xSpeed; // 速度
    this.ySpeed = ySpeed; // 速度
    this.image = new Image();
    this.image.src = imageSrc; // 图片位置

    // 设置图片加载完成后的回调函数，确保绘制时图片已加载
    this.image.onload = () => {
      this.draw();
    };
  }
}

Organism.prototype.draw = function () {
  ctx.drawImage(this.image, this.x, this.y, imageWidth, imageHeight);

  // 繪製生命值條
  ctx.fillStyle = "red";
  const healthWidth = (this.health / this.maxHealth) * imageWidth;
  ctx.fillRect(this.x, this.y + imageHeight, healthWidth, 5);
};

Organism.prototype.move = function () {
  // 根据速度更新生物的位置
  this.x += this.xSpeed;
  this.y += this.ySpeed;

  // 检测邊界碰撞
  if (this.x <= 0 || this.x + imageWidth >= canvas.width) {
    this.xSpeed *= -1; // 改變x方向速度
  }

  if (this.y <= 0 || this.y + imageHeight >= canvas.height) {
    this.ySpeed *= -1; // 改變y方向速度
  }

  // 根据移動距離减少生命值
  const distance = Math.sqrt(this.xSpeed ** 2 + this.ySpeed ** 2);
  this.health -= distance * 0.1;

  if (this.health <= 0) {
    this.dead();

  }
};

Organism.prototype.dead = function () {
  const index = organisms.indexOf(this);
  if (index !== -1) {
    organisms.splice(index, 1);
  }
}



// 创建canvas元素
// const canvas = document.createElement('canvas');
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

// 设置canvas的宽度和高度
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const organisms = [];
for (let i = 0; i < 10; i++) {
  const x = Math.random() * canvas.width; // 在canvas宽度范围内生成随机x坐标
  const y = Math.random() * canvas.height; // 在canvas高度范围内生成随机y坐标
  const xSpeed = Math.random() * 10 - 5; // 在canvas高度范围内生成随机y坐标
  const ySpeed = Math.random() * 10 - 5; // 在canvas高度范围内生成随机y坐标
  const sheep = new Organism("sheep", x, y, 100, xSpeed, ySpeed, "sheep.png");
  organisms.push(sheep);
  numSheeps += 1;
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  organisms.forEach((organism) => {
    organism.move();
    organism.draw();
  });

  requestAnimationFrame(animate);
}

animate();
