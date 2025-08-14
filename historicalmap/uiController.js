import { uiContext } from './context.js';


export function initUiDomElements() {
    uiContext.cardContainer = document.getElementById('card-container');
    uiContext.checkAnswersBtn = document.getElementById('check-answers-btn');
    uiContext.togglePanelBtn = document.getElementById('toggle-panel-btn');
    uiContext.rightPanel = document.getElementById('right-panel');
    uiContext.panelContent = document.getElementById('panel-content');
    uiContext.mapContainer = document.getElementById('map');
    uiContext.toggleIcon = document.getElementById('toggle-icon');
}


export function renderCards({ eventsToRender, regionColorConfig } = {}) {
    // 若沒傳參數則用 context 內的
    const events = eventsToRender || uiContext.eventsToRender;
    const regionCfg = regionColorConfig || uiContext.regionColorConfig;
    const {
        cardContainer,
        placedEvents,
        createCard,
        sequentialMode,
        moveGhost,
        updateGuideAndLastEvent,
        map,
        locationsData,
        guideLineRef,
        lastDragEventRef,
        ghostCardRef,
        dragOffsetRef,
        handleDropAttempt,
        updateDraggableCards,
        updateCardCount
    } = uiContext;

    cardContainer.innerHTML = '';
    events.forEach(event => {
        if (!placedEvents[event.event_id]) {
            cardContainer.appendChild(
                createCard(event, regionCfg)
            );
        }
    });
    if (sequentialMode && updateDraggableCards) {
        updateDraggableCards();
    }
    if (updateCardCount) updateCardCount();
}

export function updateDraggableCards() {
    const { sequentialMode, eventsData, currentEventIndex } = uiContext;

    if (!sequentialMode || !Array.isArray(eventsData) || typeof currentEventIndex !== 'number') return;
    const cards = document.querySelectorAll('.draggable-card');
    const nextEvent = eventsData[currentEventIndex];

    cards.forEach(card => {
        const isDraggable = nextEvent && card.id === nextEvent.event_id;
        card.dataset.draggable = isDraggable;
        if (isDraggable) {
            card.classList.remove('opacity-50', 'cursor-not-allowed');
            card.classList.add('cursor-pointer');
        } else {
            card.classList.add('opacity-50', 'cursor-not-allowed');
            card.classList.remove('cursor-pointer');
        }
    });
}

// --- 卡片統計更新函式 ---
export function updateCardCount() {
    if (!uiContext) return;    
    const { gameData, placedEvents } = uiContext;
    const cardCountSpan = document.getElementById('card-count');
    if (!cardCountSpan || !gameData.events) return;
    const total = gameData.events.length;
    const placed = Object.keys(placedEvents).length;
    cardCountSpan.textContent = `已放入：${placed} / 全部：${total}`;
}

export function updateCheckButtonState() {
    const placedCount = Object.keys(uiContext.placedEvents).length;
    const checkAnswersBtn = uiContext.checkAnswersBtn;
    if (checkAnswersBtn) {
        checkAnswersBtn.disabled = placedCount === 0;
    }
}

// 調整卡片容器高度，僅依賴 DOM
export function adjustCardContainerHeight(cardContainer, checkAnswersBtn) {
    const checkBtnHeight = checkAnswersBtn.offsetHeight || 56;
    const topPadding = 16;
    const bottomPadding = 24;
    const availableHeight = window.innerHeight - topPadding - checkBtnHeight - bottomPadding;
    cardContainer.style.maxHeight = availableHeight + 'px';
    cardContainer.style.overflowY = 'auto';
}



export function injectRegionStyles(config) {
    const styleElement = document.createElement('style');
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
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        });
        activeButton.classList.add('bg-blue-500', 'text-white');
        activeButton.classList.remove('bg-gray-200', 'text-gray-700');
    }

    sortYearAscBtn.addEventListener('click', () => {
        const sorted = [...uiContext.gameData.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        uiContext.eventsToRender = sorted;
        renderCards();
        updateSortButtonStyles(sortYearAscBtn);
    });

    sortYearDescBtn.addEventListener('click', () => {
        const sorted = [...uiContext.gameData.events].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
        uiContext.eventsToRender = sorted;
        renderCards();
        updateSortButtonStyles(sortYearDescBtn);
    });

    sortRegionAscBtn.addEventListener('click', () => {
        const sorted = [...uiContext.gameData.events].sort((a, b) => (a.region || '').localeCompare(b.region || '', 'zh-Hant'));
        uiContext.eventsToRender = sorted;
        renderCards();
        updateSortButtonStyles(sortRegionAscBtn);
    });

    sortRegionDescBtn.addEventListener('click', () => {
        const sorted = [...uiContext.gameData.events].sort((a, b) => (b.region || '').localeCompare(a.region || '', 'zh-Hant'));
        uiContext.eventsToRender = sorted;
        renderCards();
        updateSortButtonStyles(sortRegionDescBtn);
    });
}

export function setupPanelToggle() {
    const { togglePanelBtn, rightPanel, panelContent, mapContainer, toggleIcon } = uiContext;
    if (!togglePanelBtn || !rightPanel || !panelContent || !mapContainer || !toggleIcon) {
        console.error('setupPanelToggle: One or more DOM elements are missing in uiContext', {
            togglePanelBtn, rightPanel, panelContent, mapContainer, toggleIcon
        });
        return;
    }
    togglePanelBtn.addEventListener('click', () => {
        const isCollapsed = rightPanel.classList.contains('w-0');
        if (isCollapsed) {
            rightPanel.classList.remove('w-0');
            rightPanel.classList.add('w-1/3');
            panelContent.classList.remove('hidden');
            mapContainer.classList.remove('w-full');
            mapContainer.classList.add('w-2/3');
            toggleIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />';
            togglePanelBtn.style.right = 'calc(33.3333vw - 1.25rem)';
        } else {
            rightPanel.classList.remove('w-1/3');
            rightPanel.classList.add('w-0');
            panelContent.classList.add('hidden');
            mapContainer.classList.remove('w-2/3');
            mapContainer.classList.add('w-full');
            toggleIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />';
            togglePanelBtn.style.right = '0.5rem';
        }
        setTimeout(() => {
            uiContext.map.invalidateSize();
        }, 300);
    });
}
