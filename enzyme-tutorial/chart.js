import { state } from "./state.js";
import { reactions } from "./enzyme-reactions.js";
import { getSVGMainColorFromUrl } from "./utils.js"; // 如果這個函式在 main.js，否則請改正確來源

// 初始化圖表
export function initConcentrationChart() {
  const ctx = document.getElementById('concentration-chart').getContext('2d');
  // 取得所有分子/酵素/產物類型
  const moleculeTypes = Array.from(
    new Set(
      reactions.flatMap(r => [...(r.substrates || []), ...(r.products || [])])
    )
  );
  const enzymeTypes = Array.from(new Set(reactions.map(r => r.type)));
  // 建立 datasets
  state.chartData.concentration = {
    labels: [],
    datasets: [
      ...enzymeTypes.map(type => ({
        label: `酵素-${type}`,
        data: [],
        borderColor: '#8009ff',
        backgroundColor: '#8009ff22',
        fill: false,
        tension: 0.2,
        pointRadius: 0
      })),
      ...moleculeTypes.map(type => ({
        label: `分子-${type}`,
        data: [],
        borderColor: '#009688',
        backgroundColor: '#00968822',
        fill: false,
        tension: 0.2,
        pointRadius: 0
      }))
    ]
  };
  // 建立 chart 實例並存到 state.charts
  state.charts.concentration = new Chart(ctx, {
    type: 'line',
    data: state.chartData.concentration,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 0.8, // 或 2，依你需求    
      animation: false,
      scales: {
        x: { title: { display: true, text: '時間 (秒)' } },
        y: { title: { display: true, text: '數量' }, beginAtZero: true }
      }
    }
  });

  // 動態載入分子SVG顏色
  moleculeTypes.forEach(async (type, i) => {
    // 找 icon
    let icon = null;
    for (const rule of reactions) {
      const idx = rule.substrates.indexOf(type);
      if (idx !== -1 && rule.substrateIcons && rule.substrateIcons[idx]) {
        icon = rule.substrateIcons[idx];
        break;
      }
      const prodIdx = rule.products.indexOf(type);
      if (prodIdx !== -1 && rule.productIcons && rule.productIcons[prodIdx]) {
        icon = rule.productIcons[prodIdx];
        break;
      }
    }
    if (icon) {
      const color = await getSVGMainColorFromUrl(icon, "#009688");
      state.chartData.concentration.datasets[enzymeTypes.length + i].backgroundColor = color;
      state.chartData.concentration.datasets[enzymeTypes.length + i].borderColor = color;      
      state.charts.concentration.update();
    }
  });
  // 酵素同理
  enzymeTypes.forEach(async (type, i) => {
    const rule = reactions.find(r => r.type === type);
    if (rule && rule.enzymeActiveIcon) {
      const color = await getSVGMainColorFromUrl(rule.enzymeActiveIcon, "#8009ff");
      state.chartData.concentration.datasets[i].backgroundColor = color;
      state.chartData.concentration.datasets[i].borderColor = color;
      state.charts.concentration.update();
    }
  });
}

export function updateConcentrationChart() {
  if (state.chartPaused) return;
  if (!state.charts.concentration) return;
  state.chartTime += 1;
  state.chartData.concentration.labels.push(state.chartTime);

  // 只統計 canvas 內且有顯示的酵素
  const enzymeTypes = Array.from(new Set(reactions.map(r => r.type)));
  enzymeTypes.forEach((type, i) => {
    state.chartData.concentration.datasets[i].data.push(state.enzymeCount[type] || 0);
  });

  // 只統計 canvas 內且有顯示的分子
  const moleculeTypes = Array.from(
    new Set(
      reactions.flatMap(r => [...(r.substrates || []), ...(r.products || [])])
    )
  );
  moleculeTypes.forEach((type, i) => {
    state.chartData.concentration.datasets[enzymeTypes.length + i].data.push(state.moleculeCount[type] || 0);
  });

  // 最多顯示 100 筆
  if (state.chartData.concentration.labels.length > 100) {
    state.chartData.concentration.labels.shift();
    state.chartData.concentration.datasets.forEach(ds => ds.data.shift());
  }
  state.chartData.concentration.datasets.forEach(ds => {
    ds.hidden = ds.data.every(v => v === 0);
  });  
  state.charts.concentration.update();
}


export function updateCurrentChart() {
  const type = state.currentChartType;
  if (type === "concentration") {
    updateConcentrationChart();
  }
  // 之後可加其他 chart 的更新
}




/**
 * 實驗模式：反應分子與溫度圖表
 * state.expTempData = {
 *   [enzymeType]: [ { temp, value }, ... ]
 * }
 * value: 單次實驗產生的反應分子數
 */

export function updateExpTempChart() {
  const cvs = document.getElementById("exp-temp-chart");
  if (!cvs) return;
  const ctx = cvs.getContext("2d");
  if (!state.expTempData) return;


  const enzymeTypes = Object.keys(state.expTempData);
  const datasets = [];

  enzymeTypes.forEach((enzymeType, idx) => {
    const raw = state.expTempData[enzymeType];
    const tempGroups = {};
    raw.forEach(({ temp, value }) => {
      if (!tempGroups[temp]) tempGroups[temp] = [];
      tempGroups[temp].push(value);
    });
    const temps = Object.keys(tempGroups).map(Number).sort((a, b) => a - b);
    function median(arr) {
      if (!arr.length) return 0;
      const sorted = arr.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }
    const medians = temps.map(t => median(tempGroups[t]));


    // 取得酵素 icon url
    const rule = reactions.find(r => r.type === enzymeType);
    let color = "#8009ff"; // 預設色
    if (rule && rule.enzymeActiveIcon) {
        // 注意：getSVGMainColorFromUrl 是 async，這裡需 await 或預先取得顏色
        // 建議可在 init 時預先取得顏色並存到 state
        color = state.enzymeColors?.[enzymeType] || color;
    }    

    // 灰點：單次實驗
    datasets.push({
      label: `${enzymeType} 單次實驗`,
      data: raw.map(({ temp, value }) => ({ x: temp, y: value })),
      showLine: false,
      pointBackgroundColor: "#aaa",
      pointBorderColor: "#aaa",
      pointRadius: 4,
      type: "scatter"
    });
    // 彩色線+點：中位數
    datasets.push({
    label: `${enzymeType} 中位數`,
    data: temps.map((t, i) => ({ x: t, y: medians[i] })),
    borderColor: color,
    backgroundColor: color,
    pointBackgroundColor: color,
    pointBorderColor: color,
    pointRadius: 7,
    fill: false,
    tension: 0,
    showLine: true,
    type: "line"
    });
  });

  // 初始化或更新 Chart
  if (!state.charts.expTemp) {
    state.charts.expTemp = new Chart(ctx, {
      type: "scatter",
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.2,
        animation: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: {
            title: { display: true, text: "溫度 (°C)" },
            type: "linear",
            min: 0,
            max: 100
          },
          y: {
            title: { display: true, text: "反應次數" },
            beginAtZero: true
          }
        }
      }
    });
  } else {
    state.charts.expTemp.data.datasets = datasets;
    state.charts.expTemp.update();
  }
}

