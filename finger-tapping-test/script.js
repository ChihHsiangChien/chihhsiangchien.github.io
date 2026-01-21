class FingerTappingTest {
    constructor() {
        this.timeLeft = 10;
        this.clickCount = 0;
        this.isRunning = false;
        this.totalTime = 10;

        // 讀取本地儲存的歷史記錄
        this.history = this.loadHistory();

        // DOM 元素
        this.tapButton = document.getElementById('tapButton');
        this.timerDisplay = document.getElementById('timer');
        this.clickCountDisplay = document.getElementById('clickCount');
        this.resultContainer = document.getElementById('resultContainer');
        this.finalCountDisplay = document.getElementById('finalCount');
        this.clickRateDisplay = document.getElementById('clickRate');
        this.restartButton = document.getElementById('restartButton');
        this.clearDataButton = document.getElementById('clearDataButton');

        // 統計元素
        this.bestScoreDisplay = document.getElementById('bestScore');
        this.averageScoreDisplay = document.getElementById('averageScore');
        this.testCountDisplay = document.getElementById('testCount');

        // 圖表
        this.chartCanvas = document.getElementById('performanceChart');
        this.chart = null;

        // 事件監聽
        this.tapButton.addEventListener('click', () => this.handleTap());
        this.restartButton.addEventListener('click', () => this.restart());
        this.clearDataButton.addEventListener('click', () => this.clearData());

        // 初始化圖表
        this.initChart();
        this.updateStatistics();
    }

    handleTap() {
        if (!this.isRunning) {
            this.startTest();
        }

        if (this.isRunning) {
            this.clickCount++;
            this.updateClickDisplay();
            this.addTapEffect();
        }
    }

    startTest() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.tapButton.disabled = false;
        this.countdownInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                this.endTest();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        this.timerDisplay.textContent = Math.max(0, this.timeLeft);
        
        // 時間快用完時，計時器變紅
        if (this.timeLeft <= 3) {
            this.timerDisplay.style.color = '#e74c3c';
        }
    }

    updateClickDisplay() {
        this.clickCountDisplay.textContent = this.clickCount;
    }

    addTapEffect() {
        // 添加點擊動畫效果
        this.tapButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.tapButton.style.transform = 'scale(1)';
        }, 50);
    }

    endTest() {
        this.isRunning = false;
        clearInterval(this.countdownInterval);
        this.tapButton.disabled = true;
        this.saveResult();
        this.showResults();
    }

    showResults() {
        const clickRate = (this.clickCount / this.totalTime).toFixed(2);
        
        this.finalCountDisplay.textContent = this.clickCount;
        this.clickRateDisplay.textContent = clickRate;

        // 隱藏測試界面，顯示結果
        this.tapButton.style.display = 'none';
        this.resultContainer.classList.remove('hidden');
    }

    saveResult() {
        // 保存結果到歷史記錄
        this.history.push({
            clicks: this.clickCount,
            timestamp: new Date().toLocaleString('zh-TW')
        });
        this.saveHistory();
    }

    restart() {
        // 重置所有變數
        this.timeLeft = this.totalTime;
        this.clickCount = 0;
        this.isRunning = false;

        // 清除倒計時
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        // 重置 DOM
        this.updateTimerDisplay();
        this.updateClickDisplay();
        this.tapButton.textContent = '點擊我';
        this.tapButton.style.display = 'block';
        this.tapButton.disabled = false;
        this.tapButton.style.transform = 'scale(1)';
        this.timerDisplay.style.color = '#667eea';
        this.resultContainer.classList.add('hidden');

        // 更新圖表和統計
        this.updateChart();
        this.updateStatistics();
    }

    /* 圖表相關方法 */
    initChart() {
        const ctx = this.chartCanvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.getChartLabels(),
                datasets: [{
                    label: '點擊次數',
                    data: this.history.map(h => h.clicks),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#666',
                            font: {
                                size: 12,
                                weight: '600'
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#999'
                        },
                        grid: {
                            color: '#e5e5e5'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#999'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    updateChart() {
        if (this.chart) {
            this.chart.data.labels = this.getChartLabels();
            this.chart.data.datasets[0].data = this.history.map(h => h.clicks);
            this.chart.update();
        }
    }

    getChartLabels() {
        return this.history.map((_, index) => `第 ${index + 1} 次`);
    }

    /* 統計相關方法 */
    updateStatistics() {
        if (this.history.length === 0) {
            this.bestScoreDisplay.textContent = '-';
            this.averageScoreDisplay.textContent = '-';
            this.testCountDisplay.textContent = '0';
            this.clearDataButton.classList.add('hidden');
            return;
        }

        const bestScore = Math.max(...this.history.map(h => h.clicks));
        const averageScore = (this.history.reduce((sum, h) => sum + h.clicks, 0) / this.history.length).toFixed(1);

        this.bestScoreDisplay.textContent = bestScore;
        this.averageScoreDisplay.textContent = averageScore;
        this.testCountDisplay.textContent = this.history.length;
        this.clearDataButton.classList.remove('hidden');
    }

    /* 本地儲存方法 */
    saveHistory() {
        localStorage.setItem('tappingTestHistory', JSON.stringify(this.history));
    }

    loadHistory() {
        const data = localStorage.getItem('tappingTestHistory');
        return data ? JSON.parse(data) : [];
    }

    clearData() {
        if (confirm('確定要清除所有測試記錄嗎？此操作無法復原。')) {
            this.history = [];
            this.saveHistory();
            this.updateChart();
            this.updateStatistics();
        }
    }
}

// 當 DOM 加載完成後初始化應用
document.addEventListener('DOMContentLoaded', () => {
    new FingerTappingTest();
});
