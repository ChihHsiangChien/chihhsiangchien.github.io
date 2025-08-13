import { uiContext } from './context.js';

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