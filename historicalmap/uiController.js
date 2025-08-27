import { uiContext } from './context.js';
import { highlightStep } from './timeline.js';
import { setupTimelineControls } from './timeline.js';
import { updateMarkerHighlightByFilter } from './map.js';
import { autoPlaceCards } from './gameLogic.js';
import { stringToBgColor, stringToBorderColor, stringToTextColor, stringToHslBg, stringToHslBorder } from './colorUtils.js';
import { slug } from './colorUtils.js';






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
        updateCardCount,
        timelineMode,
        map 

    } = uiContext;

    cardContainer.innerHTML = '';
    const mapInstance = uiContext.map;


    events.forEach(event => {
        if (timelineMode || !placedEvents[event.event_id]) {
            const card = createCard(event, regionCfg);
            if (timelineMode) {
                setupTimelineCardClick(card, event);
            }
            cardContainer.appendChild(card);
        }
    });
    if (sequentialMode && updateDraggableCards) updateDraggableCards();
    if (updateCardCount) updateCardCount();
}

function setupTimelineCardClick(card, event) {
    card.setAttribute('draggable', 'false');
    card.classList.add('cursor-pointer', 'opacity-80');
    card.onclick = () => {
        // 找到該事件在 placedChrono 的 index
        const placedChrono = uiContext.placedChrono;
        if (!placedChrono) return;
        const idx = placedChrono.findIndex(item => item.event.event_id === event.event_id);
        if (idx !== -1 && typeof highlightStep === 'function') {
            highlightStep(idx, uiContext.map);
        }
    };

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


export function injectRegionStyles(regionList) {
    if (document.getElementById('region-style')) return;
    const styleElement = document.createElement('style');
    styleElement.id = 'region-style';
    let cssRules = '';
    regionList.forEach(region => {
        const key = slug(region);
        const bg = stringToHslBg(region);
        const border = stringToHslBorder(region);
        cssRules += `
            .location-tooltip.region-${key} {
                background-color: ${bg};
                border-color: ${border};
            }
        `;
    });
    styleElement.textContent = cssRules;
    document.head.appendChild(styleElement);
}

export function injectRegionStyles2(config) {
    if (document.getElementById('region-style')) return;
    const styleElement = document.createElement('style');
    styleElement.id = 'region-style';
    let cssRules = '';
    for (const regionKey in config) {
        /*
        const region = config[regionKey];
        if (region.name) {
            cssRules += `
                .location-tooltip.region-${region.name} {
                    background-color: ${region.mapBgColor};
                    border-color: ${region.borderColor};
                }
            `;
        }
        */
        // regionKey 直接用來產生顏色
        // regionKey 直接用來產生顏色
        const bg = stringToHslBg(regionKey);
        const border = stringToHslBorder(regionKey);
        cssRules += `
            .location-tooltip.region-${regionKey} {
                background-color: ${bg};
                border-color: ${border};
            }
        `;       
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
export function setupSortButtons() {
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



// category 按鈕會直接篩選 data 並重建 timeline
export function insertCategoryButtonsIfNeeded(data, panelContent, map, currentMapConfig) {
    const events = data.events;
    const categories = Array.from(
        new Set(events.map(e => e.category).filter(c => c && c.trim()))
    );
    if (categories.length === 0) return;
    if (document.getElementById('category-buttons-container')) return;

    const catDiv = document.createElement('div');
    catDiv.id = 'category-buttons-container';
    catDiv.className = 'p-2 flex flex-wrap gap-2 bg-white border-b';

    // 儲存目前選中的 category
    let selectedCategories = new Set();

    // "全部" 按鈕
    const allBtn = document.createElement('button');
    allBtn.textContent = '全部';
    allBtn.className = 'px-3 py-1 text-xs bg-blue-500 text-white rounded-full shadow-sm';
    allBtn.onclick = () => {
        selectedCategories.clear();
        updateCategoryButtonStyles();
        filterTimelineByCategories(selectedCategories, data, map, currentMapConfig, catDiv);
    };
    catDiv.appendChild(allBtn);

    // 其他 category 按鈕
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.textContent = cat;
        btn.className = 'px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-full shadow-sm';
        btn.onclick = () => {
            if (selectedCategories.has(cat)) {
                selectedCategories.delete(cat);
            } else {
                selectedCategories.add(cat);
            }
            updateCategoryButtonStyles();
            filterTimelineByCategories(selectedCategories, data, map, currentMapConfig, catDiv);
        };
        btn.dataset.category = cat;
        catDiv.appendChild(btn);
    });

    // 樣式切換
    function updateCategoryButtonStyles() {
        // "全部" 按鈕高亮：沒有選任何 category 時
        allBtn.classList.toggle('bg-blue-500', selectedCategories.size === 0);
        allBtn.classList.toggle('text-white', selectedCategories.size === 0);
        allBtn.classList.toggle('bg-gray-200', selectedCategories.size !== 0);
        allBtn.classList.toggle('text-gray-700', selectedCategories.size !== 0);

        // 其他 category 按鈕
        catDiv.querySelectorAll('button[data-category]').forEach(btn => {
            const cat = btn.dataset.category;
            const active = selectedCategories.has(cat);
            btn.classList.toggle('bg-blue-500', active);
            btn.classList.toggle('text-white', active);
            btn.classList.toggle('bg-gray-200', !active);
            btn.classList.toggle('text-gray-700', !active);
        });
    }

    panelContent.insertBefore(catDiv, panelContent.firstChild);

    // 預設啟動全部
    filterTimelineByCategories(selectedCategories, data, map, currentMapConfig, catDiv);
}

export async function filterTimelineByCategories(selectedCategories, data, map, currentMapConfig, catDiv) {
    //clearAllMarkerHighlights();

    // 篩選事件
    let filteredEvents;
    if (!selectedCategories || selectedCategories.size === 0) {
        filteredEvents = [...data.events];
    } else {
        filteredEvents = data.events.filter(e => selectedCategories.has(e.category));
    }

    updateMarkerHighlightByFilter(filteredEvents);
    // 產生新的 data 給 timeline
    const filteredData = { ...data, events: filteredEvents };

    // 更新卡片
    uiContext.eventsData = filteredEvents;
    uiContext.eventsToRender = filteredEvents;
    renderCards();

    // 重新啟動 timeline
    const timelineContainer = document.getElementById('timeline-container');
    await autoPlaceCards(filteredData, timelineContainer, map);
    setupTimelineControls(filteredData, map, currentMapConfig, true);
    
    renderCards();
}