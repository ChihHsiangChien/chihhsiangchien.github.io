// 定義蝌蚪類別
class Tadpole {
  constructor(x, y, size, speed) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.speed = speed;
    this.direction = Math.random() * Math.PI * 2; // 隨機方向
    this.changeDirectionFrequency = 0.3; // 改變方向的頻率
    this.marked = false; // 是否已標記
    this.color = '#00ff00'; // 初始化顏色為綠色

  }

  // 更新蝌蚪位置
  update(pond) {
    // 隨機改變方向
    if (Math.random() < this.changeDirectionFrequency) {
      this.direction += (Math.random() - 0.5) * Math.PI / 4;
    }

    this.x += Math.cos(this.direction) * this.speed;
    this.y += Math.sin(this.direction) * this.speed;

    // 确保蝌蚪在池塘内，接近池塘時逐漸改變方向
    if (this.x - this.size < pond.x) {
      this.x = pond.x + this.size;
      this.direction = Math.PI - this.direction;
    } else if (this.x + this.size > pond.x + pond.width) {
      this.x = pond.x + pond.width - this.size;
      this.direction = Math.PI - this.direction;
    }

    if (this.y - this.size < pond.y) {
      this.y = pond.y + this.size;
      this.direction = -this.direction;
    } else if (this.y + this.size > pond.y + pond.height) {
      this.y = pond.y + pond.height - this.size;
      this.direction = -this.direction;
    }
  }

  // 繪製蝌蚪
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }

  // 改變蝌蚪顏色
  changeColor() {
    this.color = this.marked ? '#ff0000' : '#00ff00';
  }

}

// 定義池塘類別
class Pond {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  // 繪製池塘
  draw(ctx) {
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = '#0000ff';
    ctx.stroke();
    ctx.closePath();
  }
}



// 定義魚缸類別
class Aquarium {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  // 繪製魚缸
  draw(ctx) {
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = '#ff0000';
    ctx.stroke();
    ctx.closePath();
  }
}

// 定義網子類別
class Net {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  // 檢查蝌蚪是否在網子範圍內
  catch(tadpoles) {
    return tadpoles.filter(tadpole =>
      tadpole.x > this.x && tadpole.x < this.x + this.width &&
      tadpole.y > this.y && tadpole.y < this.y + this.height
    );
  }

  catchRandom(tadpoles) {
    // 隨機捕捉
    return tadpoles.filter(() => Math.random() < 0.01);
  }

  // 繪製網子
  draw(ctx) {
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.width, this.height);
    ctx.strokeStyle = '#000000';
    ctx.stroke();
    ctx.closePath();
  }
}




// 獲取畫布
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 設置畫布大小
canvas.width = window.innerWidth * 0.6;
canvas.height = window.innerHeight * 0.6;


// 設置捕捉數量
const maxCaughtTadpoles = 100; // 最大捕捉數量
let caughtTadpolesCount = 0; //   已經捕獲數量



// 創建池塘實例
const pond = new Pond(10, 10, canvas.width * 0.75, canvas.height * 0.75);

// 創建魚缸實例
const aquarium = new Aquarium(pond.x + pond.width + 10, pond.y, canvas.width * 0.2, canvas.width * 0.2);

// 設置網子大小
const netSize = pond.width / 4;


// 創建網子實例
const net = new Net(pond.x + pond.width / 2 - netSize / 2, pond.y + pond.height / 2 - netSize / 2, netSize, netSize);


let tadpoles = [];

// 創建蝌蚪實例
function initializeTadpoles() {
  const numberOfTadpoles = Math.floor(Math.random() * 1001) + 1000;
  tadpoles = [];

  for (let i = 0; i < numberOfTadpoles; i++) {
    const x = Math.random() * pond.width + pond.x;
    const y = Math.random() * pond.height + pond.y;
    const size = canvas.width / 500; // 蝌蚪大小
    const speed = Math.random() * 2 + 1; // 蝌蚪速度
    tadpoles.push(new Tadpole(x, y, size, speed));

  }
}

// 動畫狀態
let isAnimating = true;
let tadpolesInAquarium = [];


// 動畫循環
function animate() {
  if (isAnimating) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 繪製池塘
    pond.draw(ctx);
    aquarium.draw(ctx);
    //net.draw(ctx);


    // 更新和繪製蝌蚪
    tadpoles.forEach(tadpole => {
      if (!tadpolesInAquarium.includes(tadpole)) {
        tadpole.update(pond);
      }
      tadpole.draw(ctx);
    });

    tadpolesInAquarium.forEach(tadpole => {
      tadpole.update(aquarium);
      tadpole.draw(ctx);
    });
  }
  requestAnimationFrame(animate);
}

// 初始化與開始動畫
initializeTadpoles();
animate();



// 切換按鈕事件
const toggleBtn = document.getElementById('toggleBtn');
toggleBtn.addEventListener('click', () => {
  isAnimating = !isAnimating;
  toggleBtn.textContent = isAnimating ? '暫停' : '繼續';
});


// 捕捉按鈕 事件
const netBtn = document.getElementById('catchBtn');
catchBtn.addEventListener('click', () => {

  // 清空 message
  message.innerHTML = '';

  const caughtTadpoles = net.catchRandom(tadpoles);

  // 將捕捉到的蝌蚪移動到魚缸
  caughtTadpoles.forEach(tadpole => {
    if (caughtTadpolesCount < maxCaughtTadpoles && !tadpolesInAquarium.includes(tadpole)) {
      tadpole.x = aquarium.x + Math.random() * aquarium.width;
      tadpole.y = aquarium.y + Math.random() * aquarium.height;
      tadpolesInAquarium.push(tadpole);
      caughtTadpolesCount++; // 更新已捕捉数量

    }
  });
  // 更新並顯示訊息
  updateInfo();
});




// 釋放按鈕 事件
const releaseBtn = document.getElementById('releaseBtn');
releaseBtn.addEventListener('click', () => {
  // 將魚缸中的所有蝌蚪釋放回池塘
  tadpolesInAquarium.forEach(tadpole => {
    // const newX = pond.x + Math.random() * pond.width;
    // const newY = pond.y + Math.random() * pond.height;
    const newX = pond.x + 0.5 * pond.width;
    const newY = pond.y + 0.5 * pond.height;
    tadpole.x = newX;
    tadpole.y = newY;
  });
  // 清空魚缸中的蝌蚪
  tadpolesInAquarium = [];
  caughtTadpolesCount = 0;


  // 更新並顯示訊息
  updateInfo();
});


// 標記1隻按鈕 事件
const markBtn = document.getElementById('markBtn');
markBtn.addEventListener('click', () => {
  // 找到第一個未標記的蝌蚪，將其標記為已標記，改變顏色
  for (let i = 0; i < tadpolesInAquarium.length; i++) {
    if (!tadpolesInAquarium[i].marked) {
      tadpolesInAquarium[i].marked = true;
      tadpolesInAquarium[i].changeColor();
      break; // 找到一個未標記的就結束循環
    }
  }
  // 更新並顯示訊息
  updateInfo();
});

// 全部標記按鈕 事件
const markAllBtn = document.getElementById('markAllBtn');
markAllBtn.addEventListener('click', () => {
  // 將所有未標記的蝌蚪標記為已標記，改變顏色
  tadpolesInAquarium.forEach(tadpole => {
    if (!tadpole.marked) {
      tadpole.marked = true;
      tadpole.changeColor();
    }
  });
  // 更新並顯示訊息
  updateInfo();
});

// 取消標記1隻按鈕 事件
const unmarkBtn = document.getElementById('unmarkBtn');
unmarkBtn.addEventListener('click', () => {
  // 找到第一個標記的蝌蚪，將其標記為未標記，改變顏色
  for (let i = 0; i < tadpolesInAquarium.length; i++) {
    if (tadpolesInAquarium[i].marked) {
      tadpolesInAquarium[i].marked = false;
      tadpolesInAquarium[i].changeColor();
      break; // 找到一個未標記的就結束循環
    }
  }
  // 更新並顯示訊息
  updateInfo();
});


// 取消全部標記按鈕 事件
const unmarkAllBtn = document.getElementById('unmarkAllBtn');
unmarkAllBtn.addEventListener('click', () => {
  // 將所有已標記的蝌蚪標記為未標記，改變顏色
  tadpolesInAquarium.forEach(tadpole => {
    if (tadpole.marked) {
      tadpole.marked = false;
      tadpole.changeColor();
    }
  });
  // 更新並顯示訊息
  updateInfo();
});


// 更新並顯示訊息
function updateInfo() {
  const tadpolesCountElement = document.getElementById('tadpolesCount');
  const markedTadpolesCountElement = document.getElementById('markedTadpolesCount');
  const markedPondTadpolesCountElement = document.getElementById('markedPondTadpolesCount');

  tadpolesCountElement.textContent = tadpolesInAquarium.length;
  markedTadpolesCountElement.textContent = tadpolesInAquarium.filter(tadpole => tadpole.marked).length;
  //markedPondTadpolesCountElement.textContent = tadpoles.filter(tadpole => tadpole.marked && !tadpolesInAquarium.includes(tadpole)).length;
  markedPondTadpolesCountElement.textContent = tadpoles.filter(tadpole => tadpole.marked).length;
}

// 推測答案判斷
const guessInput = document.getElementById('guessInput');
const submitGuessBtn = document.getElementById('submitGuessBtn');
const message = document.getElementById('message');

// 提交答案 按鈕事件
submitGuessBtn.addEventListener('click', () => {
  const guess = parseInt(guessInput.value);
  const totalTadpoles = tadpoles.length;
  const error = Math.abs(totalTadpoles - guess);
  const errorPercentage = (error / totalTadpoles) * 100;
  message.innerHTML = `誤差百分比: ${errorPercentage.toFixed(2)}%<br>(實際數量: ${totalTadpoles})`;

  // 清空輸入框
  guessInput.value = '';

  //重置蝌蚪
  initializeTadpoles();
});




// 重置 按鈕事件
const resetBtn = document.getElementById('resetBtn');
resetBtn.addEventListener('click', () => {
  // 清空輸入框
  guessInput.value = '';

  // 清空 message
  message.innerHTML = '';

  //重置蝌蚪
  initializeTadpoles();

  // 更新並顯示訊息
  updateInfo();

});

// 避免iOS雙擊使畫面縮放
document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
});

let lastTouchEnd = 0;
document.addEventListener('touchend', function (e) {
  const now = (new Date()).getTime();
  if (now - lastTouchEnd <= 300) {
      e.preventDefault();
  }
  lastTouchEnd = now;
}, false);