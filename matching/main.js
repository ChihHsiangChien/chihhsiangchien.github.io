// 將文字中的 \n 或 \n 轉成 <br>
function formatCardText(str) {
	return String(str).replace(/\\n|\n/g, '<br>');
}
// 將化學式中的 _數字 轉成 <sub>數字</sub>
function formatChemicalFormula(str) {
  // 只將 _後的連續數字做下標
  return str.replace(/_(\d+)/g, function(match, p1) {
    return '<sub>' + p1 + '</sub>';
  });
}


// 配對遊戲主程式
const dataDir = 'data/';
const sounds = {
	click: document.getElementById('audio-click'),
	match: document.getElementById('audio-match'),
	nomatch: document.getElementById('audio-nomatch')
};
const grid = document.getElementById('gameGrid');
const statusSpan = document.getElementById('status');
const timerSpan = document.getElementById('timer');
const dataSourceSelect = document.getElementById('dataSource');
const gameOverDiv = document.getElementById('gameOver');

let cardData = [];
let cards = [];
let flippedCards = [];
let matchedCount = 0;
let totalPairs = 0;
let timer = null;
let timeElapsed = 0;
let gameActive = false;

// 取得 URL 參數
function getQueryParam(name) {
	const url = new URL(window.location.href);
	return url.searchParams.get(name);
}

// 動態載入 data 目錄下的 JSON 檔案
async function loadDataSources() {
	// 假設 data 目錄下的檔案已知
	const files = [
		{file: 'cells.json', name: '細胞結構'},
        {file: 'elements.json', name: '元素與化合物'},
        {file: 'cell-shape.json', name: '細胞形狀'},
        {file: 'cell-function.json', name: '細胞功能'}

	];
	dataSourceSelect.innerHTML = '';
	files.forEach(f => {
		const opt = document.createElement('option');
		opt.value = f.file;
		opt.textContent = f.name;
		dataSourceSelect.appendChild(opt);
	});
	// 根據 URL 參數或預設選擇
	const param = getQueryParam('data');
	if (param) {
		dataSourceSelect.value = param;
	}
}

// 載入 JSON 資料
async function loadCardData(filename) {
	// 確保副檔名正確
	if (!filename.endsWith('.json')) filename += '.json';
	const res = await fetch(dataDir + filename + '?t=' + Date.now());
	const data = await res.json();
	return data;
}

// 洗牌
function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

// 初始化遊戲
async function initGame() {
	gameActive = false;
	grid.innerHTML = '';
	flippedCards = [];
	matchedCount = 0;
	timeElapsed = 0;
	clearInterval(timer);
	timerSpan.textContent = '';
	gameOverDiv.classList.add('hidden');

	const filename = dataSourceSelect.value;
		cardData = await loadCardData(filename);
	// 展平成一維陣列
	let flat = [];
	cardData.forEach((pair, idx) => {
		flat.push({ content: pair[0], pairId: idx });
		flat.push({ content: pair[1], pairId: idx });
	});
	cards = shuffle(flat);
	totalPairs = cardData.length;

	// 產生卡片，內容自動處理下標與換行
	cards.forEach((card, i) => {
		const cardDiv = document.createElement('div');
		cardDiv.className = 'card';
		cardDiv.dataset.index = i;
		// 先處理化學式下標，再處理換行
		cardDiv.innerHTML = '<div class="card-content"><span class="chem-text">' + formatCardText(formatChemicalFormula(card.content)) + '</span></div>';
		cardDiv.addEventListener('click', onCardClick);
		grid.appendChild(cardDiv);
	});

	// 遊戲狀態
	statusSpan.textContent = `剩餘配對：${totalPairs - matchedCount}`;
	// 立即啟動遊戲與計時
	gameActive = true;
	startTimer();
    
}

// 移除重複的 onCardClick 實作，保留下方正確版本
function onCardClick(e) {
	if (!gameActive) return;
	const cardDiv = e.currentTarget;
	const idx = parseInt(cardDiv.dataset.index);
	if (cardDiv.classList.contains('matched')) return;
	// 檢查是否已選取，若是則取消選取
	const foundIdx = flippedCards.findIndex(c => c.idx === idx);
	if (foundIdx !== -1) {
		cardDiv.classList.remove('selected');
		flippedCards.splice(foundIdx, 1);
		return;
	}
	if (flippedCards.length === 2) return;

	cardDiv.classList.add('selected');
	sounds.click.currentTime = 0; sounds.click.play();
	flippedCards.push({ idx, el: cardDiv });

	if (flippedCards.length === 2) {
		checkMatch();
	}
}

function checkMatch() {
	const [a, b] = flippedCards;
	const cardA = cards[a.idx];
	const cardB = cards[b.idx];
	if (cardA.pairId === cardB.pairId) {
		// 配對成功
		setTimeout(() => {
			a.el.classList.add('matched');
			b.el.classList.add('matched');
			a.el.classList.remove('selected');
			b.el.classList.remove('selected');
			matchedCount++;
			statusSpan.textContent = `剩餘配對：${totalPairs - matchedCount}`;
			sounds.match.currentTime = 0; sounds.match.play();
			flippedCards = [];
			if (matchedCount === totalPairs) {
				endGame();
			}
		}, 200);
	} else {
		// 配對失敗
		setTimeout(() => {
			a.el.classList.remove('flipped', 'selected');
			b.el.classList.remove('flipped', 'selected');
			sounds.nomatch.currentTime = 0; sounds.nomatch.play();
			flippedCards = [];
		}, 200);
	}

}

function startTimer() {
	timerSpan.textContent = '時間：0 秒';
	timer = setInterval(() => {
		timeElapsed++;
		timerSpan.textContent = `時間：${timeElapsed} 秒`;
	}, 1000);
}

function endGame() {
	gameActive = false;
	clearInterval(timer);
	setTimeout(() => {
		gameOverDiv.classList.remove('hidden');
	}, 600);
}

// 選單切換主題
dataSourceSelect.addEventListener('change', () => {
	// 重新載入頁面並帶上 data 參數
	const val = dataSourceSelect.value;
	const url = new URL(window.location.href);
	url.searchParams.set('data', val);
	window.location.href = url.toString();
});

// 初始化
window.addEventListener('DOMContentLoaded', async () => {
	await loadDataSources();
	await initGame();
});
