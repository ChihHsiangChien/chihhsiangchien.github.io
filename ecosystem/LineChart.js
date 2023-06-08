// 創建折線圖類別
class LineChart {
  constructor(data) {
    this.data = data;
  }

  // 繪製折線圖
  draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const maxValue = Math.max(...this.data.flatMap((d) => d.values));
    const xScale = chartWidth / (this.data[0].values.length - 1);
    const yScale = chartHeight / maxValue;

    ctx.beginPath();
    ctx.lineWidth = 2;

    // 繪製折線
    for (let i = 0; i < this.data.length; i++) {
      const species = this.data[i];
      const values = species.values;

      ctx.strokeStyle = colors[i];
      ctx.moveTo(
        chartMargin.left,
        canvas.height - chartMargin.bottom -Math.log(values[0]) * yScale
      );

      for (let j = 1; j < values.length; j++) {
        const x = chartMargin.left + j * xScale;
        const y = canvas.height - chartMargin.bottom - Math.log(values[j]) * yScale;
        ctx.lineTo(x, y);
      }
    }


    ctx.stroke();

    // 繪製座標軸
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;

    // x軸
    ctx.moveTo(chartMargin.left, canvas.height - chartMargin.bottom);
    ctx.lineTo(
      canvas.width - chartMargin.right,
      canvas.height - chartMargin.bottom
    );

    // y軸
    ctx.moveTo(chartMargin.left, chartMargin.top);
    ctx.lineTo(chartMargin.left, canvas.height - chartMargin.bottom);

    ctx.stroke();

    // 標記數值
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";

    // x軸標記
    for (let i = 0; i < this.data[0].values.length; i++) {
      const x = chartMargin.left + i * xScale;
      const y = canvas.height - chartMargin.bottom + 20;
      ctx.fillText(i.toString(), x, y);
    }

    // y軸標記
    for (let i = 0; i <= maxValue; i += maxValue / 5) {
      const x = chartMargin.left - 20;
      const y = canvas.height - chartMargin.bottom - i * yScale;
      ctx.fillText(i.toString(), x, y);
    }
  }
}

// 更新並繪製折線圖
function updateChart() {
  for (let i = 0; i < chartData.length; i++) {
    const species = ecosystem.species[i];
    const values = chartData[i].values;
    values.push(species.population);

    if (values.length > chartWidth) {
      values.shift();
    }
  }

  const lineChart = new LineChart(chartData);
  lineChart.draw();

  requestAnimationFrame(updateChart);
}
