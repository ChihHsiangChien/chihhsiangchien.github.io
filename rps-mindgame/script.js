const rockButton = document.getElementById('rock');
const paperButton = document.getElementById('paper');
const scissorsButton = document.getElementById('scissors');
const resultDiv = document.getElementById('result');
const moneyDiv = document.getElementById('money');
const historyList = document.getElementById('historyList');
const aiChoiceDiv = document.getElementById('aiChoice');
const moneyChartCanvas = document.getElementById('moneyChart');

let money = 100;
localStorage.setItem('money', money);
console.log("金額重置為 100 元");

moneyDiv.textContent = `金額: ${money} 元`;

let history = [];
const MAX_HISTORY = 10;
let gameCount = 1;
localStorage.setItem('gameCount', gameCount);
console.log("gameCount 重設為 1");

let playerHistory = [];
const AI_LEARN_LENGTH = 10;

let moneyChart = new Chart(moneyChartCanvas, {
    type: 'line',
    data: {
        labels: ['初始'],
        datasets: [{
            label: '金額',
            data: [money],
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});

function aiChoose() {
    if (playerHistory.length < AI_LEARN_LENGTH) {
        const choices = ['rock', 'paper', 'scissors'];
        return choices[Math.floor(Math.random() * choices.length)];
    } else {
        const rockRate = playerHistory.filter(choice => choice === 'rock').length / AI_LEARN_LENGTH;
        const paperRate = playerHistory.filter(choice => choice === 'paper').length / AI_LEARN_LENGTH;
        const scissorsRate = playerHistory.filter(choice => choice === 'scissors').length / AI_LEARN_LENGTH;

        let rockProb = 0.33;
        let paperProb = 0.33;
        let scissorsProb = 0.33;

        if (rockRate > paperRate && rockRate > scissorsRate) {
            // 玩家傾向出石頭，AI 大幅增加出布的機率
            rockProb = 0.05;
            paperProb = 0.75;
            scissorsProb = 0.2;
        } else if (paperRate > rockRate && paperRate > scissorsRate) {
            // 玩家傾向出布，AI 大幅增加出剪刀的機率
            rockProb = 0.2;
            paperProb = 0.05;
            scissorsProb = 0.75;
        } else if (scissorsRate > rockRate && scissorsRate > paperRate) {
            // 玩家傾向出剪刀，AI 大幅增加出石頭的機率
            rockProb = 0.75;
            paperProb = 0.2;
            scissorsProb = 0.05;
        } else {
            // 玩家出招沒有明顯模式，AI 維持隨機策略
            rockProb = 0.33;
            paperProb = 0.33;
            scissorsProb = 0.33;
        }

        console.log("AI 選擇機率：");
        console.log(`石頭: ${rockProb}, 布: ${paperProb}, 剪刀: ${scissorsProb}`);

        const randomNumber = Math.random();
        if (randomNumber < rockProb) {
            return 'rock';
        } else if (randomNumber < rockProb + paperProb) {
            return 'paper';
        } else {
            return 'scissors';
        }
    }
}

function determineWinner(playerChoice, aiChoice) {
    const choicesMap = {
        'rock': '石頭',
        'paper': '布',
        'scissors': '剪刀'
    };
    if (playerChoice === aiChoice) {
        return "平手！";
    } else if (
        (playerChoice === 'rock' && aiChoice === 'scissors') ||
        (playerChoice === 'paper' && aiChoice === 'rock') ||
        (playerChoice === 'scissors' && aiChoice === 'paper')
    ) {
        let gain = 0;
        if (playerChoice === 'paper') {
            gain = 50;
        } else if (playerChoice === 'scissors') {
            gain = 20;
        } else {
            gain = 10;
        }
        money += gain;
        console.log(`贏了！獲得 ${gain} 元`);
        return `你贏了！ +${gain} 元`;
    } else {
        let loss = 0;
        if (playerChoice === 'paper') {
            loss = 20;
        } else if (playerChoice === 'scissors') {
            loss = 10;
        } else {
            loss = 50;
        }
        money -= loss;
        console.log(`輸了！失去 ${loss} 元`);
        return `你輸了！ -${loss} 元`;
    }
}

function updateHistory(playerChoice, aiChoice, result) {
    const choicesMap = {
        'rock': '石頭',
        'paper': '布',
        'scissors': '剪刀'
    };
    const historyItem = `第 ${gameCount} 局 - 你: ${choicesMap[playerChoice]}, AI: ${choicesMap[aiChoice]}, 結果: ${result}`;
    history.unshift(historyItem);

    if (history.length > MAX_HISTORY) {
        history.pop();
    }

    historyList.innerHTML = '';
    history.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        historyList.appendChild(li);
    });
}

function endGame() {
    resultDiv.textContent = "遊戲結束，你沒錢了！";
    rockButton.disabled = true;
    paperButton.disabled = true;
    scissorsButton.disabled = true;
}

function playRound(playerChoice) {
    console.log(`第 ${gameCount} 局開始`);
    console.log(`玩家選擇：${playerChoice}`);

    if (money <= 0) {
        console.log("沒錢了，遊戲結束！");
        endGame();
        return;
    }

    const aiChoiceMade = aiChoose();
    console.log(`AI 選擇：${aiChoiceMade}`);

    const result = determineWinner(playerChoice, aiChoiceMade);
    console.log(`遊戲結果：${result}`);

    resultDiv.textContent = result;
    moneyDiv.textContent = `金額: ${money} 元`;
    console.log(`目前金額：${money} 元`);

    const choicesMap = {
        'rock': '石頭',
        'paper': '布',
        'scissors': '剪刀'
    };

    aiChoiceDiv.textContent = `AI選擇: ${choicesMap[aiChoiceMade]}`;
    updateHistory(playerChoice, aiChoiceMade, result);

    playerHistory.push(playerChoice);
    console.log(`玩家歷史選擇：${playerHistory}`);

    if (playerHistory.length > AI_LEARN_LENGTH) {
        playerHistory.shift();
    }

    localStorage.setItem('money', money);
    localStorage.setItem('gameCount', gameCount + 1);

    moneyChart.data.labels.push(`第 ${gameCount} 局`);
    moneyChart.data.datasets[0].data.push(money);
    moneyChart.update();

    gameCount++;
}

rockButton.addEventListener('click', () => {
    playRound('rock');
});
paperButton.addEventListener('click', () => {
    playRound('paper');
});
scissorsButton.addEventListener('click', () => {
    playRound('scissors');
});

if (money <= 0) {
    console.log("遊戲開始時檢查，沒錢了，遊戲結束！");
    endGame();
}