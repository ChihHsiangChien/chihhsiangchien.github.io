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

    // --- 新增：用於受傷效果的屬性 ---
    this.isHurting = false;       // 標記是否正在顯示受傷效果
    this.hurtEffectDuration = 150; // 受傷效果持續時間 (毫秒)
    this.hurtTimerId = null;      // 用於儲存 setTimeout 的 ID
    // --- 結束新增 ---

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
      // 稍微移回邊界內，避免卡住
      this.x = Math.max(this.microscopeObj.specimenX + this.width, Math.min(this.x, this.microscopeObj.specimenX + this.microscopeObj.specimenWidth - this.width));

    }
    if (
      this.y < this.microscopeObj.specimenY + this.height ||
      this.y >
        this.microscopeObj.specimenY +
          this.microscopeObj.specimenHeight -
          this.height
    ) {
      this.speedY *= -1;
      // 稍微移回邊界內，避免卡住
      this.y = Math.max(this.microscopeObj.specimenY + this.height, Math.min(this.y, this.microscopeObj.specimenY + this.microscopeObj.specimenHeight - this.height));

    }
  }
  drawOnCanvas() {
    // on canvas
    const canvas = this.microscopeObj.canvas;
    const ctx = canvas.getContext("2d");
    // --- 修改：根據 isHurting 狀態繪圖 ---
    if (this.isHurting) {
      // 閃爍效果：疊加半透明紅色
      ctx.save(); // 保存當前繪圖狀態
      ctx.globalAlpha = 0.7; // 可以調整透明度
      // 先畫原圖
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
      // 再疊加紅色濾鏡效果 (簡單做法是畫一個紅色矩形)
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; // 半透明紅色
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.restore(); // 恢復繪圖狀態
    } else {
      // 正常繪製
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }

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

      const zoomedWidth = this.width * this.microscopeObj.zoomFactor;
      const zoomedHeight = this.height * this.microscopeObj.zoomFactor;
  
      // --- 修改：根據 isHurting 狀態繪圖 ---
      if (this.isHurting) {
        // 閃爍效果：疊加半透明紅色
        ctx.save();
        ctx.globalAlpha = 0.7;
        // 先畫原圖
        ctx.drawImage(this.image, zoomedBugX, zoomedBugY, zoomedWidth, zoomedHeight);
        // 再疊加紅色濾鏡效果
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.fillRect(zoomedBugX, zoomedBugY, zoomedWidth, zoomedHeight);
        ctx.restore();
      } else {
        // 正常繪製
        ctx.drawImage(this.image, zoomedBugX, zoomedBugY, zoomedWidth, zoomedHeight);
      }

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
    this.isHurting = true; // 標記為正在受傷

    // --- 新增：啟動計時器以關閉受傷效果 ---
    // 如果之前已經有計時器在跑，先清除它，以處理連續受傷的情況
    if (this.hurtTimerId) {
      clearTimeout(this.hurtTimerId);
    }

    // 設定一個新的計時器，在指定時間後將 isHurting 設回 false
    this.hurtTimerId = setTimeout(() => {
      this.isHurting = false;
      this.hurtTimerId = null; // 清除計時器 ID
      // 不需要手動重繪，因為主循環 (setInterval) 會持續重繪
    }, this.hurtEffectDuration);
    // --- 結束新增 ---    
  }
}
