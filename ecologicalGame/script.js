var imageWidth = 50;
var imageHeight = 50;
// 创建一个生物类
class Organism {
  constructor(x, y, health, xSpeed, ySpeed, imageSrc) {
    this.x = x; // 位置的x坐标
    this.y = y; // 位置的y坐标
    this.health = health; // 生命值
    this.xSpeed = xSpeed; // 速度
    this.ySpeed = ySpeed; // 速度
    this.image = new Image();
    this.image.src = imageSrc; // 图片位置

    // 设置图片加载完成后的回调函数，确保绘制时图片已加载
    this.image.onload = () => {
      this.draw();
    };

    this.moveInterval = setInterval(() => {
      this.move();
    }, 100);
  }

  draw() {
    // 在canvas上绘制生物图像
    ctx.drawImage(this.image, this.x, this.y, imageWidth, imageHeight);
  }

  move() {
    // 根据速度更新生物的位置
    this.x += this.speed;
    this.y += this.speed;
    // 在移动前先清除画布
  }
}

// 创建canvas元素
// const canvas = document.createElement('canvas');
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

// 设置canvas的宽度和高度
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 创建生物对象
// 创建10个随机位置的草对象
/*
const grasses = [];
for (let i = 0; i < 10; i++) {
  const x = Math.random() * canvas.width; // 在canvas宽度范围内生成随机x坐标
  const y = Math.random() * canvas.height; // 在canvas高度范围内生成随机y坐标
  const grass = new Organism(x, y, 100, 0, "grass.png");
  grasses.push(grass);
}
*/

const sheeps = [];
for (let i = 0; i < 10; i++) {
  const x = Math.random() * canvas.width; // 在canvas宽度范围内生成随机x坐标
  const y = Math.random() * canvas.height; // 在canvas高度范围内生成随机y坐标
  const xSpeed = Math.random() * 10-5; // 在canvas高度范围内生成随机y坐标
  const ySpeed = Math.random() * 10-5; // 在canvas高度范围内生成随机y坐标
  const sheep = new Organism(x, y, 100, xSpeed, ySpeed, "sheep.png");
  sheeps.push(sheep);
}

/*
const sheep = new Organism(150, 150, 200, 4, "sheep.png");
const wolf = new Organism(250, 250, 300, 3, "wolf.png");
*/

setInterval(() => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  sheeps.forEach((organism) => {
    organism.move();
    organism.draw();
  });
}, 100);
