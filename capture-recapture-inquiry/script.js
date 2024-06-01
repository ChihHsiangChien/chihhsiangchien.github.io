let chart1, chart2, chart3;

async function runEstimation() {
    const totalPopulation = parseInt(document.getElementById('totalPopulation').value);
    const numSamples = parseInt(document.getElementById('numSamples').value);
    const sampleSize = parseInt(document.getElementById('sampleSize').value);
    
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = '0%';
    progressBar.innerText = '0%';

    // Reset charts if they already exist
    if (chart1) chart1.destroy();
    if (chart2) chart2.destroy();
    if (chart3) chart3.destroy();

    const estimates = await captureRecaptureEstimate(totalPopulation, sampleSize, numSamples, updateProgress);
    
    const markedCounts = estimates.map(e => e[0]);
    const populationEstimates = estimates.map(e => e[1]);
    
    chart1 = plotData(markedCounts, populationEstimates, 'scatterPlot1', '標記數量 vs 每次取樣計算出的估計族群大小', '標記數量', '估計值');

    const averageEstimates = calculateAverageEstimates(estimates);
    const avgMarkedCounts = Object.keys(averageEstimates).map(Number);
    const avgPopulationEstimates = Object.values(averageEstimates);
    
    chart2 = plotData(avgMarkedCounts, avgPopulationEstimates, 'scatterPlot2', '標記數量 vs 平均估計值', '標記數量', '平均估計值');
    
    const errors = populationEstimates.map(est => calculateError(totalPopulation, est));

    chart3 = plotData(markedCounts, errors, 'scatterPlot3', '標記數量 vs 誤差百分比(半對數圖)', '標記數量', '誤差百分比', true);

}

async function captureRecaptureEstimate(totalPopulation, sampleSize, numSamples, progressCallback) {
    const estimates = [];
    const totalIterations = (totalPopulation - 1) * numSamples;
    let currentIteration = 0;
    
    for (let markedCount = 1; markedCount < totalPopulation; markedCount++) {
        let sampleCount = 0;
        
        while (sampleCount < numSamples) {
            const markedPopulation = getRandomSample(totalPopulation, markedCount);
            const sample = getRandomSample(totalPopulation, sampleSize);
            
            const markedInSample = sample.filter(x => markedPopulation.includes(x)).length;
            
            if (markedInSample === 0) continue;
            
            const populationEstimate = (markedCount * sampleSize) / markedInSample;
            estimates.push([markedCount, populationEstimate]);
            sampleCount++;
            
            currentIteration++;
            progressCallback(currentIteration, totalIterations);
            
            // Yield control back to the browser to update the progress bar
            await new Promise(resolve => setTimeout(resolve, 0));
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
    return Math.abs(trueValue - estimatedValue) / trueValue * 100;
}

function calculateAverageEstimates(estimates) {
    const averages = {};
    
    estimates.forEach(([count, estimate]) => {
        if (!averages[count]) averages[count] = [];
        averages[count].push(estimate);
    });
    
    for (const count in averages) {
        averages[count] = averages[count].reduce((sum, est) => sum + est, 0) / averages[count].length;
    }
    
    return averages;
}

function plotData(xData, yData, canvasId, title, xLabel, yLabel, logarithmic = false) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    
    
    const options = {
        type: 'scatter',
        data: {
            datasets: [{
                label: title,
                data: xData.map((x, i) => ({ x, y: yData[i] })),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                pointRadius: 3
            }]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xLabel,
                        font: {
                            size: 14  // Change x-axis title font size here
                        }
                    },
                    ticks: {
                        font: {
                            size: 12  // Change x-axis labels font size here
                        }
                    }
                },
                y: {
                    type: logarithmic ? 'logarithmic' : 'linear',
                    title: {
                        display: true,
                        text: yLabel,
                        font: {
                            size: 14  // Change y-axis title font size here
                        }
                    },
                    ticks: {
                        font: {
                            size: 12  // Change y-axis labels font size here
                        },
                        callback: function(value, index, values) {
                            return Number(value.toString());
                        }
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 18  // Change chart title font size here
                    }
                }
            }
        }
    };

    return new Chart(ctx, options);
}

function updateProgress(currentIteration, totalIterations) {
    const progressBar = document.getElementById('progress-bar');
    const progress = (currentIteration / totalIterations) * 100;
    progressBar.style.width = progress + '%';
    progressBar.innerText = Math.round(progress) + '%';
}

