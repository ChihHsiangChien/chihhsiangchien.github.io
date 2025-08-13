
// 調整卡片容器高度，僅依賴 DOM
export function adjustCardContainerHeight(cardContainer, checkAnswersBtn) {
    const checkBtnHeight = checkAnswersBtn.offsetHeight || 56;
    const topPadding = 16;
    const bottomPadding = 24;
    const availableHeight = window.innerHeight - topPadding - checkBtnHeight - bottomPadding;
    cardContainer.style.maxHeight = availableHeight + 'px';
    cardContainer.style.overflowY = 'auto';
}