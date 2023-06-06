class Bug {
  constructor(x, y, imageUrl) {
    this.x = x;
    this.y = y;
    this.width = 3;
    this.height = 3;
    this.speedX = Math.random() - 0.5;
    this.speedY = Math.random() - 0.5;

    this.image = new Image();
    this.image.onload = this.draw.bind(this);
    this.image.src = imageUrl;

    this.canvas = document.getElementById("canvas");
    this.ctx = this.canvas.getContext("2d");
  }
  move() {
    this.x += this.speedX;
    this.y += this.speedY;
  }
  draw() {
    this.ctx.drawImage(this.image, this.x, this.y, 3, 3);
  }
}

var bugs = [];

for (var i = 0; i < 0; i++) {
  const x = microscope.specimenX + Math.random() * microscope.specimenWidth;
  const y = microscope.specimenY + Math.random() * microscope.specimenHeight;
  const bug = new Bug(x, y, "bug.png");
  bug.draw();
  bugs.push(bug);
}
