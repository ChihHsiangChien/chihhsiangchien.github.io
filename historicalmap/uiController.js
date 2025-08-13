export function renderCards({
    eventsToRender,
    regionColorConfig,
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
}) {
    cardContainer.innerHTML = '';
    eventsToRender.forEach(event => {
        if (!placedEvents[event.event_id]) {
            cardContainer.appendChild(
                createCard(event, regionColorConfig, {
                    sequentialMode,
                    moveGhost,
                    updateGuideAndLastEvent,
                    map,
                    locationsData,
                    getGuideLine: () => guideLineRef.value,
                    setGuideLine: val => { guideLineRef.value = val; },
                    setLastDragEvent: val => { lastDragEventRef.value = val; },
                    getGhostCard: () => ghostCardRef.value,
                    setGhostCard: val => { ghostCardRef.value = val; },
                    dragOffsetRef,
                    handleDropAttempt
                })
            );
        }
    });
    if (sequentialMode && updateDraggableCards) {
        updateDraggableCards();
    }
    if (updateCardCount) updateCardCount();
}

export function updateDraggableCards({ sequentialMode, eventsData, currentEventIndex }) {
    if (!sequentialMode) return;
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

export function updateCardCount({ gameData, placedEvents }) {
    const cardCountSpan = document.getElementById('card-count');
    if (!cardCountSpan || !gameData.events) return;
    const total = gameData.events.length;
    const placed = Object.keys(placedEvents).length;
    cardCountSpan.textContent = `已放入：${placed} / 全部：${total}`;
}