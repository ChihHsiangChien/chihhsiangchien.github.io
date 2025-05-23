let chart1, chart2, chart3, chart4, chart5, chart6;

async function runEstimation() {
  const totalPopulation = parseInt(
    document.getElementById("totalPopulation").value
  );
  const numSamples = parseInt(document.getElementById("numSamples").value);
  const sampleSize = parseInt(document.getElementById("sampleSize").value);

  const progressBar = document.getElementById("progress-bar");
  progressBar.style.width = "0%";
  progressBar.innerText = "0%";

  // Reset charts if they already exist
  if (chart1) chart1.destroy();
  if (chart2) chart2.destroy();
  if (chart3) chart3.destroy();
  if (chart4) chart4.destroy();
  if (chart5) chart5.destroy();
  if (chart6) chart6.destroy();

  const estimates = await captureRecaptureEstimate(
    totalPopulation,
    sampleSize,
    numSamples,
    updateProgress
  );

  const markedCounts = estimates.map((e) => e[0]);
  const populationEstimates = estimates.map((e) => e[1]);

  chart1 = plotData(
    markedCounts,
    populationEstimates,
    "scatterPlot1",
    "標記數量 vs 每次取樣計算出的估計族群大小",
    "標記數量",
    "估計值",
    "rgba(75, 0, 192, 0.6)"
  );

  const averageEstimates = calculateAverageEstimates(estimates);
  const avgMarkedCounts = Object.keys(averageEstimates).map(Number);
  const avgPopulationEstimates = Object.values(averageEstimates);

  chart2 = plotData(
    avgMarkedCounts,
    avgPopulationEstimates,
    "scatterPlot2",
    "標記數量 vs 平均數估計族群",
    "標記數量",
    "平均值",
    "rgba(75, 192, 192, 0.6)"
  );

  const avgErrors = avgMarkedCounts.map((count) => {
    const avgEstimate = averageEstimates[count];
    return calculateError(totalPopulation, avgEstimate);
  });

  chart3 = plotData(
    avgMarkedCounts,
    avgErrors,
    "scatterPlot3",
    "標記數量 vs 平均值不確定度(半對數圖)",
    "標記數量",
    "不確定度",
    "rgba(75, 192, 192, 0.6)",
    true
  );

  const medianEstimates = calculateMedianEstimates(estimates);
  const medMarkedCounts = Object.keys(medianEstimates).map(Number);
  const medPopulationEstimates = Object.values(medianEstimates);

  // 中位數估計
  chart4 = plotData(
    medMarkedCounts,
    medPopulationEstimates,
    "scatterPlot4",
    "標記數量 vs 用中位數估計族群",
    "標記數量",
    "中位數",
    "rgba(192, 75, 192, 0.6)"
  );

  // 用中位數計算不確定度
  const medErrors = medMarkedCounts.map((count) => {
    const medEstimate = medianEstimates[count];
    return calculateError(totalPopulation, medEstimate);
  });

  chart5 = plotData(
    medMarkedCounts,
    medErrors,
    "scatterPlot5",
    "標記數量 vs 中位數不確定度(半對數圖)",
    "標記數量",
    "不確定度",
    "rgba(192, 75, 192, 0.6)",
    true
  );

  // 平均數和中位數在同一張圖
  chart6 = plotCombinedData(
    avgMarkedCounts,
    avgPopulationEstimates,
    medMarkedCounts,
    medPopulationEstimates,
    "scatterPlot6",
    "標記數量 vs 平均值和中位數估計族群",
    "標記數量",
    "估計族群"
  );
}

async function captureRecaptureEstimate(
  totalPopulation,
  sampleSize,
  numSamples,
  progressCallback
) {
  const estimates = [];
  const totalIterations = (totalPopulation - 1) * numSamples;
  let currentIteration = 0;

  for (let markedCount = 1; markedCount < totalPopulation; markedCount++) {
    let sampleCount = 0;

    while (sampleCount < numSamples) {
      const markedPopulation = getRandomSample(totalPopulation, markedCount);
      const sample = getRandomSample(totalPopulation, sampleSize);

      const markedInSample = sample.filter((x) =>
        markedPopulation.includes(x)
      ).length;

      if (markedInSample === 0) continue;

      const populationEstimate = (markedCount * sampleSize) / markedInSample;
      estimates.push([markedCount, populationEstimate]);
      sampleCount++;

      currentIteration++;
      progressCallback(currentIteration, totalIterations);

      // Yield control back to the browser to update the progress bar
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return estimates;
}

function getRandomSample(totalPopulation, sampleSize) {
  const population = Array.from({ length: totalPopulation }, (_, i) => i + 1);
  const sample = [];

  for (let i = 0; i < sampleSize; i++) {
    const randomIndex = Math.floor(Math.random() * population.length);
    sample.push(population.splice(randomIndex, 1)[0]);
  }

  return sample;
}

function calculateError(trueValue, estimatedValue) {
  return (Math.abs(trueValue - estimatedValue) / trueValue) * 100;
}

function calculateAverageEstimates(estimates) {
  const averages = {};

  estimates.forEach(([count, estimate]) => {
    if (!averages[count]) averages[count] = [];
    averages[count].push(estimate);
  });

  for (const count in averages) {
    averages[count] =
      averages[count].reduce((sum, est) => sum + est, 0) /
      averages[count].length;
  }

  return averages;
}

function calculateMedianEstimates(estimates) {
  const medians = {};

  estimates.forEach(([count, estimate]) => {
    if (!medians[count]) medians[count] = [];
    medians[count].push(estimate);
  });

  for (const count in medians) {
    medians[count].sort((a, b) => a - b); // 对数组进行排序
    const middleIndex = Math.floor(medians[count].length / 2);

    if (medians[count].length % 2 === 0) {
      // 如果元素数量是偶数，中位数是中间两个元素的平均值
      medians[count] =
        (medians[count][middleIndex - 1] + medians[count][middleIndex]) / 2;
    } else {
      // 如果元素数量是奇数，中位数是中间元素
      medians[count] = medians[count][middleIndex];
    }
  }

  return medians;
}

function plotData(
  xData,
  yData,
  canvasId,
  title,
  xLabel,
  yLabel,
  color = "rgba(75, 192, 192, 0.6)", // 默认颜色
  logarithmic = false,
) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  // 设置 canvas 尺寸
  canvas.width = 600; // 设置宽度
  canvas.height = 400; // 设置高度

  const options = {
    type: "scatter",
    data: {
      datasets: [
        {
          label: title,
          data: xData.map((x, i) => ({ x, y: yData[i] })),
          backgroundColor: color,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: false, // 禁用响应式，以确保图表不自动调整大小

      scales: {
        x: {
          title: {
            display: true,
            text: xLabel,
            font: {
              size: 14, // Change x-axis title font size here
            },
          },
          ticks: {
            font: {
              size: 12, // Change x-axis labels font size here
            },
          },
        },
        y: {
          type: logarithmic ? "logarithmic" : "linear",
          title: {
            display: true,
            text: yLabel,
            font: {
              size: 14, // Change y-axis title font size here
            },
          },
          ticks: {
            font: {
              size: 12, // Change y-axis labels font size here
            },
            callback: function (value, index, values) {
              return Number(value.toString());
            },
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 18, // Change chart title font size here
          },
        },
      },
    },
  };

  return new Chart(ctx, options);
}

function plotCombinedData(
  avgXData,
  avgYData,
  medXData,
  medYData,
  canvasId,
  title,
  xLabel,
  yLabel,
  avgColor = "rgba(75, 192, 192, 0.6)",
  medColor = "rgba(192, 75, 192, 0.6)"
) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  // 设置 canvas 尺寸
  canvas.width = 600; // 设置宽度
  canvas.height = 400; // 设置高度

  const options = {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "平均值",
          data: avgXData.map((x, i) => ({ x, y: avgYData[i] })),
          backgroundColor: avgColor,
          pointRadius: 3,
        },
        {
          label: "中位數",
          data: medXData.map((x, i) => ({ x, y: medYData[i] })),
          backgroundColor: medColor,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: false, // 禁用响应式，以确保图表不自动调整大小
      scales: {
        x: {
          title: {
            display: true,
            text: xLabel,
            font: {
              size: 14, // 更改 x 轴标题字体大小
            },
          },
          ticks: {
            font: {
              size: 12, // 更改 x 轴标签字体大小
            },
          },
        },
        y: {
          title: {
            display: true,
            text: yLabel,
            font: {
              size: 14, // 更改 y 轴标题字体大小
            },
          },
          ticks: {
            font: {
              size: 12, // 更改 y 轴标签字体大小
            },
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 18, // 更改图表标题字体大小
          },
        },
      },
    },
  };

  return new Chart(ctx, options);
}

function updateProgress(currentIteration, totalIterations) {
  const progressBar = document.getElementById("progress-bar");
  const progress = (currentIteration / totalIterations) * 100;
  progressBar.style.width = progress + "%";
  progressBar.innerText = Math.round(progress) + "%";
}
