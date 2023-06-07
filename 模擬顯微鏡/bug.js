class Bug {
  constructor(microscopeObj) {
    // 把parent object(microscope)傳入
    this.width = 3;
    this.height = 3;
    this.microscopeObj = microscopeObj;
    // 把x y放在玻片範圍內
    this.x =
      microscopeObj.specimenX +
      Math.random() * (microscopeObj.specimenWidth - 2 * this.width);
    this.y =
      microscopeObj.specimenY +
      Math.random() * (microscopeObj.specimenHeight - 2 * this.height);

    this.speedX = Math.random() - 0.5;
    this.speedY = Math.random() - 0.5;
    //this.speedX = 0;
    //this.speedY = 0;
    this.image = new Image();
    this.life = 50; //生命值
    /*
    this.image.onload = function() {      
      this.drawOnCanvas();
      this.drawOnZoomCanvas();
    }.bind(this);
    */
    this.image.src = "bug.png";
  }
  move() {
    this.x += this.speedX;
    this.y += this.speedY;
    // 檢查是否超出邊界
    if (
      this.x < this.microscopeObj.specimenX + this.width ||
      this.x >
        this.microscopeObj.specimenX +
          this.microscopeObj.specimenWidth -
          this.width
    ) {
      this.speedX *= -1;
    }
    if (
      this.y < this.microscopeObj.specimenY + this.height ||
      this.y >
        this.microscopeObj.specimenY +
          this.microscopeObj.specimenHeight -
          this.height
    ) {
      this.speedY *= -1;
    }
  }
  drawOnCanvas() {
    // on canvas
    const canvas = this.microscopeObj.canvas;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
  }
  drawOnZoomCanvas() {
    const canvas = this.microscopeObj.zoomCanvas;
    const ctx = canvas.getContext("2d");
    // on zoomCanvas
    const zoomedBugX =
      (this.x -
        (this.microscopeObj.canvas.width *
          (1 - 1 / this.microscopeObj.zoomFactor)) /
          2) *
      this.microscopeObj.zoomFactor;

    const zoomedBugY =
      (this.y -
        (this.microscopeObj.canvas.height *
          (1 - 1 / this.microscopeObj.zoomFactor)) /
          2) *
      this.microscopeObj.zoomFactor;

    ctx.drawImage(
      this.image,
      zoomedBugX,
      zoomedBugY,
      this.width * this.microscopeObj.zoomFactor,
      this.height * this.microscopeObj.zoomFactor
    );

    if (this.microscopeObj.zoomFactor == 40) {
      //如果在最高倍才會畫血條
      // 繪製生命值條
      ctx.fillStyle = "red";
      const lifespanWidth =
        (this.life / 50) * this.width * this.microscopeObj.zoomFactor;
      ctx.fillRect(zoomedBugX, zoomedBugY - 10, lifespanWidth, 5);
    }
  }
  getHurt(hurtPoint) {
    this.life -= hurtPoint;
  }
}
