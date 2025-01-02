// 設定初始數值
let bloodSugar = 100;  // mg/dL
let bodyTemp = 36.5;   // °C
let inflammation = 2;  // 發炎指數 (0-10)
let hydration = 290;   // 血液濃度 (mOsm/kg)

// 取得HTML元素
const statusDescription = document.getElementById('status-description');
const bloodSugarChartCanvas = document.getElementById('bloodSugarChart');
const bodyTempChartCanvas = document.getElementById('bodyTempChart');
const inflammationChartCanvas = document.getElementById('inflammationChart');

// 設置圖表
const bloodSugarChart = new Chart(bloodSugarChartCanvas, {
    type: 'line',
    data: {
        labels: ['0', '1', '2', '3', '4'],
        datasets: [{
            label: '血糖 (mg/dL)',
            data: [bloodSugar, bloodSugar, bloodSugar, bloodSugar, bloodSugar],
            borderColor: 'rgb(255, 99, 132)',
            fill: false,
        }]
    },
    options: {
        scales: {
            y: {
                min: 0,
                max: 200
            }
        }
    }
});

const bodyTempChart = new Chart(bodyTempChartCanvas, {
    type: 'line',
    data: {
        labels: ['0', '1', '2', '3', '4'],
        datasets: [{
            label: '體溫 (°C)',
            data: [bodyTemp, bodyTemp, bodyTemp, bodyTemp, bodyTemp],
            borderColor: 'rgb(54, 162, 235)',
            fill: false,
        }]
    },
    options: {
        scales: {
            y: {
                min: 34,
                max: 42
            }
        }
    }
});

const inflammationChart = new Chart(inflammationChartCanvas, {
    type: 'line',
    data: {
        labels: ['0', '1', '2', '3', '4'],
        datasets: [{
            label: '發炎指數',
            data: [inflammation, inflammation, inflammation, inflammation, inflammation],
            borderColor: 'rgb(255, 159, 64)',
            fill: false,
        }]
    },
    options: {
        scales: {
            y: {
                min: 0,
                max: 10
            }
        }
    }
});

// 按鈕事件處理
document.getElementById('insulin-button').addEventListener('click', () => {
    bloodSugar -= 20;
    updateCharts();
    updateStatus("血糖下降，胰島素已分泌");
});

document.getElementById('glucagon-button').addEventListener('click', () => {
    bloodSugar += 20;
    updateCharts();
    updateStatus("血糖上升，升糖素已分泌");
});

document.getElementById('sweat-button').addEventListener('click', () => {
    bodyTemp -= 0.5;
    hydration -= 10;
    updateCharts();
    updateStatus("體溫下降，排汗開始");
});

document.getElementById('drink-water-button').addEventListener('click', () => {
    hydration -= 5;
    updateCharts();
    updateStatus("補充水分，血液濃度正常");
});

document.getElementById('immune-button').addEventListener('click', () => {
    inflammation -= 1;
    updateCharts();
    updateStatus("免疫反應啟動，發炎指數降低");
});

// 更新圖表
function updateCharts() {
    bloodSugarChart.data.datasets[0].data.push(bloodSugar);
    bloodSugarChart.data.datasets[0].data.shift();

    bodyTempChart.data.datasets[0].data.push(bodyTemp);
    bodyTempChart.data.datasets[0].data.shift();

    inflammationChart.data.datasets[0].data.push(inflammation);
    inflammationChart.data.datasets[0].data.shift();

    bloodSugarChart.update();
    bodyTempChart.update();
    inflammationChart.update();
}

// 更新狀況描述
function updateStatus(message) {
    statusDescription.textContent = message;
}
