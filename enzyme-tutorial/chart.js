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
