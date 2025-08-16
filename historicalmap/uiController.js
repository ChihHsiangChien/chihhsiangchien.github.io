import { uiContext } from './context.js';

/**
 * 初始化 UI 相關的 DOM 元素，並存入 uiContext 方便後續存取。
 */
export function initUiDomElements() {
    uiContext.cardContainer = document.getElementById('card-container');
    uiContext.checkAnswersBtn = document.getElementById('check-answers-btn');
    uiContext.togglePanelBtn = document.getElementById('toggle-panel-btn');
    uiContext.rightPanel = document.getElementById('right-panel');
    uiContext.panelContent = document.getElementById('panel-content');
    uiContext.mapContainer = document.getElementById('map');
    uiContext.toggleIcon = document.getElementById('toggle-icon');

    // Timeline 相關 DOM
    uiContext.timelineSlider = document.getElementById('timeline-slider');
    uiContext.timelineContainer = document.getElementById('timeline-container');
    uiContext.playbackSpeedSelect = document.getElementById('playback-speed');    
}

export function insertSortButtonsContainerIfNeeded(panelContent) {
    if (!panelContent) return;
    if (document.getElementById('sort-buttons-container')) return;
    if (uiContext.sequentialMode || uiContext.timelineMode) return;
    const sortDiv = document.createElement('div');
    sortDiv.id = 'sort-buttons-container';
    sortDiv.className = 'p-4 border-b bg-white shadow-sm';
    sortDiv.innerHTML = `
        <div class="flex justify-between items-center select-none">
            <div class="flex flex-wrap gap-1 justify-end select-none">
                <button id="sort-year-asc" class="px-3 py-1 text-xs bg-blue-500 text-white rounded-full shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 select-none">年代 ▲</button>
                <button id="sort-year-desc" class="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 select-none">年代 ▼</button>
                <button id="sort-region-asc" class="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 select-none">區域 ▲</button>
                <button id="sort-region-desc" class="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-full shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 select-none">區域 ▼</button>
            </div>
            <span id="card-count" class="ml-4 text-xs text-gray-500 select-none"></span>
        </div>
    `;
    panelContent.insertBefore(sortDiv, panelContent.firstChild);
}

/**
 * 根據傳入或 context 內的事件資料，渲染卡片到卡片容器。
 * 若為循序模式則只允許一張卡片可拖曳。
 * 會自動更新卡片數量顯示。
 */
export function renderCards({ eventsToRender, regionColorConfig } = {}) {
    const events = eventsToRender || uiContext.eventsToRender;
    const regionCfg = regionColorConfig || uiContext.regionColorConfig;
    const {
        cardContainer,
        placedEvents,
        createCard,
        sequentialMode,
        updateDraggableCards,
        updateCardCount
    } = uiContext;

    cardContainer.innerHTML = '';
    // 避免重複查詢 regionCfg
    events.forEach(event => {
        if (!placedEvents[event.event_id]) {
            cardContainer.appendChild(createCard(event, regionCfg));
        }
    });
    if (sequentialMode && updateDraggableCards) updateDraggableCards();
    if (updateCardCount) updateCardCount();
}

/**
 * 在循序模式下，僅允許下一個正確事件的卡片可拖曳，其餘卡片設為不可拖曳並調整樣式。
 */
export function updateDraggableCards() {
    const { sequentialMode, eventsData, currentEventIndex } = uiContext;
    if (!sequentialMode || !Array.isArray(eventsData) || typeof currentEventIndex !== 'number') return;
    const cards = document.querySelectorAll('.draggable-card');
    const nextEvent = eventsData[currentEventIndex];
    cards.forEach(card => {
        const isDraggable = nextEvent && card.id === nextEvent.event_id;
        card.dataset.draggable = isDraggable;
        card.classList.toggle('opacity-50', !isDraggable);
        card.classList.toggle('cursor-not-allowed', !isDraggable);
        card.classList.toggle('cursor-pointer', isDraggable);
    });
}

/**
 * 更新卡片計數顯示。
 * 會取得已放入的事件數量與總事件數，並顯示於畫面上。
 * 若找不到顯示用的 span 或遊戲資料不存在則不執行。
 */
export function updateCardCount() {
    const { gameData, placedEvents } = uiContext;
    const cardCountSpan = document.getElementById('card-count');
    if (!cardCountSpan || !gameData?.events) return;
    cardCountSpan.textContent = `已放入：${Object.keys(placedEvents).length} / 全部：${gameData.events.length}`;
}

/**
 * 根據已放入卡片數量，決定檢查答案按鈕是否可用。
 * 若尚未放入任何卡片則按鈕設為 disabled。
 */
export function updateCheckButtonState() {
    const btn = uiContext.checkAnswersBtn;
    if (btn) btn.disabled = Object.keys(uiContext.placedEvents).length === 0;
}

/**
 * 調整卡片容器的最大高度，確保 UI 排版不會超出視窗。
 * 依據檢查按鈕高度與上下 padding 動態計算。
 */
export function adjustCardContainerHeight(cardContainer, checkAnswersBtn) {
    const checkBtnHeight = checkAnswersBtn.offsetHeight || 56;
    const topPadding = 16;
    const bottomPadding = 24;
    const availableHeight = window.innerHeight - topPadding - checkBtnHeight - bottomPadding;
    cardContainer.style.maxHeight = availableHeight + 'px';
    cardContainer.style.overflowY = 'auto';
}

/**
 * 根據地區顏色設定，動態注入對應的 CSS 樣式到 <head>。
 * 避免重複注入。
 */
export function injectRegionStyles(config) {
    if (document.getElementById('region-style')) return;
    const styleElement = document.createElement('style');
    styleElement.id = 'region-style';
    let cssRules = '';
    for (const regionKey in config) {
        const region = config[regionKey];
        if (region.name) {
            cssRules += `
                .location-tooltip.region-${region.name} {
                    background-color: ${region.mapBgColor};
                    border-color: ${region.borderColor};
                }
            `;
        }
    }
    styleElement.textContent = cssRules;
    document.head.appendChild(styleElement);
}

// 優化：避免重複綁定事件，並簡化樣式切換
let sortButtonsInitialized = false;

/**
 * 綁定排序按鈕事件，支援依年份或地區排序。
 * 僅初始化一次，循序模式下隱藏排序與檢查按鈕。
 * 點擊按鈕後會重新渲染卡片並更新按鈕樣式。
 */
export function setupSortButtons(regionColorConfig) {
    const sortYearAscBtn = document.getElementById('sort-year-asc');
    const sortYearDescBtn = document.getElementById('sort-year-desc');
    const sortRegionAscBtn = document.getElementById('sort-region-asc');
    const sortRegionDescBtn = document.getElementById('sort-region-desc');
    const sortButtons = [sortYearAscBtn, sortYearDescBtn, sortRegionAscBtn, sortRegionDescBtn];

    if (uiContext.sequentialMode) {
        uiContext.checkAnswersBtn.style.display = 'none';
        const sortContainer = document.getElementById('sort-buttons-container');
        if (sortContainer) sortContainer.style.display = 'none';
        return;
    }

    function updateSortButtonStyles(activeButton) {
        sortButtons.forEach(btn => {
            if (!btn) return;
            btn.classList.toggle('bg-blue-500', btn === activeButton);
            btn.classList.toggle('text-white', btn === activeButton);
            btn.classList.toggle('bg-gray-200', btn !== activeButton);
            btn.classList.toggle('text-gray-700', btn !== activeButton);
        });
    }

    if (!sortButtonsInitialized) {
        sortYearAscBtn?.addEventListener('click', () => {
            const sorted = [...uiContext.gameData.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
            uiContext.eventsToRender = sorted;
            renderCards();
            updateSortButtonStyles(sortYearAscBtn);
        });

        sortYearDescBtn?.addEventListener('click', () => {
            const sorted = [...uiContext.gameData.events].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
            uiContext.eventsToRender = sorted;
            renderCards();
            updateSortButtonStyles(sortYearDescBtn);
        });

        sortRegionAscBtn?.addEventListener('click', () => {
            const sorted = [...uiContext.gameData.events].sort((a, b) => (a.region || '').localeCompare(b.region || '', 'zh-Hant'));
            uiContext.eventsToRender = sorted;
            renderCards();
            updateSortButtonStyles(sortRegionAscBtn);
        });

        sortRegionDescBtn?.addEventListener('click', () => {
            const sorted = [...uiContext.gameData.events].sort((a, b) => (b.region || '').localeCompare(a.region || '', 'zh-Hant'));
            uiContext.eventsToRender = sorted;
            renderCards();
            updateSortButtonStyles(sortRegionDescBtn);
        });
        sortButtonsInitialized = true;
    }
}

/**
 * 綁定右側面板的顯示/隱藏切換按鈕，並根據狀態調整相關樣式與地圖寬度。
 * 避免重複綁定。
 */
export function setupPanelToggle() {
    const { togglePanelBtn, rightPanel, panelContent, mapContainer, toggleIcon } = uiContext;
    if (!togglePanelBtn || !rightPanel || !panelContent || !mapContainer || !toggleIcon) {
        console.error('setupPanelToggle: One or more DOM元素缺失', {
            togglePanelBtn, rightPanel, panelContent, mapContainer, toggleIcon
        });
        return;
    }
    // 避免重複綁定
    if (togglePanelBtn.dataset.bound) return;
    togglePanelBtn.dataset.bound = '1';

    togglePanelBtn.addEventListener('click', () => {
        const isCollapsed = rightPanel.classList.contains('w-0');
        rightPanel.classList.toggle('w-0', !isCollapsed);
        rightPanel.classList.toggle('w-1/3', isCollapsed);
        panelContent.classList.toggle('hidden', !isCollapsed);
        mapContainer.classList.toggle('w-full', !isCollapsed);
        mapContainer.classList.toggle('w-2/3', isCollapsed);
        toggleIcon.innerHTML = isCollapsed
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />';
        togglePanelBtn.style.right = isCollapsed
            ? 'calc(33.3333vw - 1.25rem)'
            : '0.5rem';
        setTimeout(() => {
            uiContext.map.invalidateSize();
        }, 300);
    });
}
