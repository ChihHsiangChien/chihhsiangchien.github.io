// 讀取外部 JSON 並初始化排序卡片

// 取得 URL 參數
function getActivityFile() {
  const params = new URLSearchParams(window.location.search);
  const activity = params.get('activity');
  if (activity === 'animal') return 'data_animal.json';
  if (activity === 'plant') return 'data_plant.json';
  return 'data.json';
}


function loadActivity() {
  fetch(getActivityFile())
    .then(res => res.json())
    .then(data => {
      document.getElementById('activity-title').textContent = data.title || '排序活動';
      initCards(data);
    });
}


// TOC 按鈕切換
const tocBtns = document.querySelectorAll('.toc-btn');
const urlActivity = (new URLSearchParams(window.location.search).get('activity')) || '';
tocBtns.forEach(btn => {
  if (btn.dataset.activity === urlActivity) btn.classList.add('active');
  btn.addEventListener('click', function() {
    const val = btn.dataset.activity;
    const url = val ? `?activity=${val}` : location.pathname;
    window.location.href = url;
  });
});

loadActivity();

const list = document.getElementById('sortable-list');
let correctOrder = [];


// 依標題自動產生顏色（hash to HSL）
function getCardColor(title, color) {
  if (color) return color;
  // hash string to int
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  // 0~359 色相
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 80%)`;
}

function initCards(data) {
  // 取得正確順序
  correctOrder = data.cards.map(card => card.title);
  // 隨機排序
  const shuffled = [...data.cards].sort(() => Math.random() - 0.5);
  list.innerHTML = '';
  shuffled.forEach(card => {
    const li = document.createElement('li');
    li.className = 'card';
    li.style.background = getCardColor(card.title, card.color);
    li.draggable = true;
    // 標題放在 span 方便檢查
    const span = document.createElement('span');
    span.className = 'card-title';
    span.textContent = card.title;
    li.appendChild(span);
    li.title = card.content;
    list.appendChild(li);
  });
  enableDragAndDrop();
}

function enableDragAndDrop() {
  let draggingEl = null;
  let dragOverEl = null;

  // 滑鼠/桌面拖曳
  list.querySelectorAll('.card').forEach(card => {
    card.addEventListener('dragstart', e => {
      draggingEl = card;
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', e => {
      draggingEl = null;
      card.classList.remove('dragging');
    });
    card.addEventListener('dragover', e => {
      e.preventDefault();
    });
    card.addEventListener('dragenter', e => {
      e.preventDefault();
      dragOverEl = card;
      if (draggingEl && draggingEl !== dragOverEl) {
        const cards = Array.from(list.children);
        const dragIndex = cards.indexOf(draggingEl);
        const overIndex = cards.indexOf(dragOverEl);
        if (dragIndex < overIndex) {
          list.insertBefore(draggingEl, dragOverEl.nextSibling);
        } else {
          list.insertBefore(draggingEl, dragOverEl);
        }
      }
    });

    // 觸控拖曳
    let touchStartY = 0;
    let touchDragging = false;
    card.addEventListener('touchstart', e => {
      touchDragging = true;
      draggingEl = card;
      card.classList.add('dragging');
      touchStartY = e.touches[0].clientY;
      e.preventDefault();
    }, {passive: false});
    card.addEventListener('touchmove', e => {
      if (!touchDragging) return;
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (!target) return;
      const overCard = target.closest('.card');
      if (overCard && overCard !== draggingEl) {
        dragOverEl = overCard;
        const cards = Array.from(list.children);
        const dragIndex = cards.indexOf(draggingEl);
        const overIndex = cards.indexOf(dragOverEl);
        if (dragIndex < overIndex) {
          list.insertBefore(draggingEl, dragOverEl.nextSibling);
        } else {
          list.insertBefore(draggingEl, dragOverEl);
        }
      }
      e.preventDefault();
    }, {passive: false});
    card.addEventListener('touchend', e => {
      if (touchDragging) {
        card.classList.remove('dragging');
        draggingEl = null;
        dragOverEl = null;
        touchDragging = false;
      }
      e.preventDefault();
    }, {passive: false});
  });
}

document.getElementById('check-btn').onclick = function() {
  const cards = Array.from(list.children);
  const userOrder = cards.map(li => {
    const span = li.querySelector('.card-title');
    return span ? span.textContent : li.textContent;
  });
  let correct = 0;
  for (let i = 0; i < correctOrder.length; i++) {
    // 移除舊的標記
    const mark = cards[i].querySelector('.checkmark');
    if (mark) mark.remove();
    // 檢查正確與否
    if (userOrder[i] === correctOrder[i]) {
      correct++;
      const o = document.createElement('span');
      o.className = 'checkmark';
      o.textContent = 'O';
      o.style.color = '#388e3c';
      o.style.float = 'right';
      o.style.fontWeight = 'bold';
      o.style.fontSize = '1.3em';
      cards[i].appendChild(o);
    } else {
      const x = document.createElement('span');
      x.className = 'checkmark';
      x.textContent = 'X';
      x.style.color = '#d32f2f';
      x.style.float = 'right';
      x.style.fontWeight = 'bold';
      x.style.fontSize = '1.3em';
      cards[i].appendChild(x);
    }
  }
  const result = document.getElementById('result');
  if (correct === correctOrder.length) {
    result.textContent = '全部正確！';
    result.style.color = '#2d6cdf';
  } else {
    result.textContent = `正確 ${correct} / ${correctOrder.length} 項，請再試一次。`;
    result.style.color = '#d32f2f';
  }
};
