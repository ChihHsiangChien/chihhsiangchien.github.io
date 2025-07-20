// 模式：'lv' 為 Lotka–Volterra 模式，'sine' 為相位示範模式（可獨立調整基線、振幅、週期與相位差）
// 97年生物指考第9題
// 初始模式設定為 Lotka–Volterra 模式
let currentMode = 'lv';
const descriptions = {
  lv: '假設狐狸捕捉兔子，這些參數怎麼影響牠們之間的關係？',
  sine: '此模式可獨立調整捕食者與獵物的基線、振幅、週期，並可改變相位差。'
};
// 各模式的頁面標題 (h1 與 <title>)
const titles = {
  lv: '捕食者-獵物模型：Lotka–Volterra 方程式',
  sine: '相位示範模式 (Sine 模式)'
};

function updateDescriptions() {
  document.getElementById('mode-description').textContent = descriptions[currentMode];
}

/**
 * 更新頁面主標題 (h1) 與瀏覽器標籤標題 (<title>)
 */
function updateTitle() {
  const titleText = titles[currentMode];
  document.querySelector('h1').textContent = titleText;
  document.title = titleText;
}

function updateEquationsContent() {
  const eq = document.getElementById('equations');
  if (currentMode === 'lv') {
    eq.innerHTML = `<p>Lotka–Volterra 方程式：</p>
<pre>dx/dt = α x - β x y
dy/dt = δ x y - γ y</pre>`;
  } else {
    eq.innerHTML = `<p> (獵物與捕食者基線、振幅與週期可獨立調整)：</p>
<pre>x(t) = Bₓ + Aₓ sin(2π t / Tₓ)
y(t) = Bᵧ + Aᵧ sin(2π t / Tᵧ + φ)</pre>`;
  }
}

function updateLayout() {
  const main = document.getElementById('main-content');
  const container = document.querySelector('.container');
  if (currentMode === 'sine') {
    main.classList.add('sine-layout');
    main.classList.remove('lv-layout');
    container.classList.add('sine-mode');
    container.classList.remove('lv-mode');
  } else {
    main.classList.add('lv-layout');
    main.classList.remove('sine-layout');
    container.classList.add('lv-mode');
    container.classList.remove('sine-mode');
  }
}

function toggleMode() {
  currentMode = currentMode === 'lv' ? 'sine' : 'lv';
  document.getElementById('lv-params').hidden = currentMode !== 'lv';
  document.getElementById('sine-params').hidden = currentMode !== 'sine';
  // 更新標題、說明、排版與圖形
  updateTitle();
  document.getElementById('toggle-mode').textContent =
    currentMode === 'lv' ? '切換到相位示範模式' : '切換到 Lotka–Volterra 模式';
  updateDescriptions();
  updatePlots();
  updateLayout();
  const eq = document.getElementById('equations');
  if (!eq.hidden) {
    updateEquationsContent();
    document.getElementById('toggle-equations').textContent = '隱藏方程式';
  }
}

function getParams() {
  const tmax = parseFloat(document.getElementById('tmax').value);
  const dt = parseFloat(document.getElementById('dt').value);
  if (currentMode === 'lv') {
    return {
      mode: 'lv',
      alpha: parseFloat(document.getElementById('alpha').value),
      beta: parseFloat(document.getElementById('beta').value),
      delta: parseFloat(document.getElementById('delta').value),
      gamma: parseFloat(document.getElementById('gamma').value),
      x0: parseFloat(document.getElementById('x0').value),
      y0: parseFloat(document.getElementById('y0').value),
      tmax, dt
    };
  } else {
    return {
      mode: 'sine',
      baselineX: parseFloat(document.getElementById('baselineX').value),
      baselineY: parseFloat(document.getElementById('baselineY').value),
      amplitudeX: parseFloat(document.getElementById('amplitudeX').value),
      amplitudeY: parseFloat(document.getElementById('amplitudeY').value),
      periodX: parseFloat(document.getElementById('periodX').value),
      periodY: parseFloat(document.getElementById('periodY').value),
      phaseShift: parseFloat(document.getElementById('phaseShift').value),
      tmax, dt
    };
  }
}

function simulate(params) {
  if (params.mode === 'lv') {
    const {alpha, beta, delta, gamma, x0, y0, tmax, dt} = params;
    const n = Math.ceil(tmax / dt) + 1;
    const t = new Array(n);
    const x = new Array(n);
    const y = new Array(n);
    x[0] = x0;
    y[0] = y0;
    t[0] = 0;
    for (let i = 1; i < n; i++) {
      const xi = x[i - 1];
      const yi = y[i - 1];
      const ti = t[i - 1];
      const k1x = alpha * xi - beta * xi * yi;
      const k1y = delta * xi * yi - gamma * yi;
      const x2 = xi + k1x * dt / 2;
      const y2 = yi + k1y * dt / 2;
      const k2x = alpha * x2 - beta * x2 * y2;
      const k2y = delta * x2 * y2 - gamma * y2;
      const x3 = xi + k2x * dt / 2;
      const y3 = yi + k2y * dt / 2;
      const k3x = alpha * x3 - beta * x3 * y3;
      const k3y = delta * x3 * y3 - gamma * y3;
      const x4 = xi + k3x * dt;
      const y4 = yi + k3y * dt;
      const k4x = alpha * x4 - beta * x4 * y4;
      const k4y = delta * x4 * y4 - gamma * y4;
      const dx = (k1x + 2 * k2x + 2 * k3x + k4x) / 6;
      const dy = (k1y + 2 * k2y + 2 * k3y + k4y) / 6;
      x[i] = xi + dx * dt;
      y[i] = yi + dy * dt;
      t[i] = ti + dt;
    }
    return {t, x, y};
  } else {
    const {baselineX, baselineY, amplitudeX, amplitudeY, periodX, periodY, phaseShift, tmax, dt} = params;
    const n = Math.ceil(tmax / dt) + 1;
    const t = new Array(n);
    const x = new Array(n);
    const y = new Array(n);
    for (let i = 0; i < n; i++) {
      t[i] = i * dt;
      // 根據基線與振幅計算數值
      const thetaX = (2 * Math.PI * t[i]) / periodX;
      const thetaY = (2 * Math.PI * t[i]) / periodY + phaseShift * 2 * Math.PI;
      x[i] = baselineX + amplitudeX * Math.sin(thetaX);
      y[i] = baselineY + amplitudeY * Math.sin(thetaY);
    }
    return {t, x, y};
  }
}

function drawPlots(data) {
  if (currentMode === 'lv') {
    Plotly.newPlot('time-series', [
      {x: data.t, y: data.x, mode: 'lines', name: '獵物 Prey'},
      {x: data.t, y: data.y, mode: 'lines', name: '捕食者 Predator'}
    ], {title: '數量隨時間變化', xaxis: {title: '時間'}, yaxis: {title: '數量'}});
    const eqScaleLv = !!document.getElementById('equal-scale-lv')?.checked;
    const phaseLayoutLv = {
      title: '相位圖 (捕食者 vs 獵物)',
      xaxis: {title: '捕食者數量'},
      yaxis: {title: '獵物數量'}
    };
    if (eqScaleLv) {
      phaseLayoutLv.yaxis.scaleanchor = 'x';
      phaseLayoutLv.yaxis.scaleratio = 1;
    }
    Plotly.newPlot('phase-space', [
      {x: data.y, y: data.x, mode: 'lines', name: 'Phase 路徑'}
    ], phaseLayoutLv);
  } else {
    // 相位示範模式：時間序列與相位圖
    Plotly.newPlot('time-series', [
      {x: data.t, y: data.x, mode: 'lines', name: '獵物 Prey'},
      {x: data.t, y: data.y, mode: 'lines', name: '捕食者 Predator'}
    ], {title: '數量隨時間變化', xaxis: {title: '時間'}, yaxis: {title: '數量'}});
    const eqScale = !!document.getElementById('equal-scale')?.checked;
    const phaseLayout = {
      title: '相位圖 (捕食者 vs 獵物)',
      xaxis: {title: '捕食者數量'},
      yaxis: {title: '獵物數量'}
    };
    if (eqScale) {
      phaseLayout.yaxis.scaleanchor = 'x';
      phaseLayout.yaxis.scaleratio = 1;
    }
    Plotly.newPlot('phase-space', [
      {x: data.y, y: data.x, mode: 'lines', name: 'Phase 路徑'}
    ], phaseLayout);
  }
}

function updatePlots() {
  const params = getParams();
  const data = simulate(params);
  drawPlots(data);
}

function toggleEquations() {
  const eq = document.getElementById('equations');
  const btn = document.getElementById('toggle-equations');
  if (eq.hidden) {
    updateEquationsContent();
    eq.hidden = false;
    btn.textContent = '隱藏方程式';
  } else {
    eq.hidden = true;
    btn.textContent = '顯示方程式';
  }
}

window.addEventListener('load', function() {
  // 初始化 UI 狀態為預設模式
  document.getElementById('lv-params').hidden = currentMode !== 'lv';
  document.getElementById('sine-params').hidden = currentMode !== 'sine';
  document.getElementById('toggle-mode').textContent =
    currentMode === 'lv' ? '切換到相位示範模式' : '切換到 Lotka–Volterra 模式';
  // 初始載入時同步更新標題、說明與排版
  updateTitle();
  updateDescriptions();
  updateLayout();
  updatePlots();
  document.getElementById('toggle-mode').addEventListener('click', toggleMode);
  // 參數變動即時更新
  document.querySelectorAll('#params-form input').forEach(input =>
    input.addEventListener('input', updatePlots)
  );
  document.getElementById('toggle-equations').addEventListener('click', toggleEquations);
});