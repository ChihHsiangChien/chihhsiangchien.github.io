import { uiContext } from './context.js';
import { repositionMarkersAtLocation } from './map.js';
import { updateCheckButtonState, updateCardCount } from './uiController.js';
import { updateDraggableCards } from './uiController.js';

import { setupMarkerDragEvents } from './map.js';
import { findClosestLocation } from './map.js';
import { findCircleByLocationId } from './map.js';

import { highlightStep } from './timeline.js';
import { enableTimelineKeydown } from './timeline.js';

import { delay } from './utils.js';

/**
 * 產生事件的 popup HTML 內容
 * @param {Object} eventData
 * @returns {string}
 */
function generatePopupContent(eventData) {
    let popupContent = `<b>${eventData.title}</b>`;
    if (eventData.image) {
        popupContent += `
            <br><img src="${eventData.image}" alt="${eventData.title}" style="width:100%; max-width:200px; margin-top:8px; border-radius:4px;">
            ${eventData.image_source ? `<div style="text-align:left; font-size:0.75rem; color:#666; margin-top:4px;">圖片來源：<a href="${eventData.image_source.url}" target="_blank" rel="noopener noreferrer">${eventData.image_source.name}</a></div>` : ''}
        `;
    }
    if (eventData.description) {
        popupContent += `<br>${eventData.description}`;
    }
    if (eventData.links && eventData.links.length > 0) {
        popupContent += '<div style="margin-top: 8px;">';
        eventData.links.forEach(link => {
            popupContent += `<a href="${link.url}" target="_blank" rel="noopener noreferrer" style="margin-right: 8px;">${link.name}</a>`;
        });
        popupContent += '</div>';
    }
    return popupContent;
}

export function handleDropAttempt(cardElement) {
    let successfulDrop = false;
    const lastDragEvent = uiContext.lastDragEventRef.value;
    const map = uiContext.map;

    if (lastDragEvent) {

        const mapContainer = map.getContainer();
        const mapRect = mapContainer.getBoundingClientRect();
        const mouseX = lastDragEvent.originalEvent.clientX;
        const mouseY = lastDragEvent.originalEvent.clientY;
        const droppedOnMap = mouseX >= mapRect.left && mouseX <= mapRect.right && mouseY >= mapRect.top && mouseY <= mapRect.bottom;
        
        if (droppedOnMap) {                        
            const latLng = map.mouseEventToLatLng(lastDragEvent.originalEvent);
            const closestLocation = findClosestLocation(map, latLng, uiContext.locationsData);

            if (closestLocation) {
                const droppedOnCircle = findCircleByLocationId(map, closestLocation.location_id);
                if (droppedOnCircle) {
                    map.fire('droppable:drop', { drop: droppedOnCircle, drag: { _element: cardElement } });
                    successfulDrop = true;
                }
            }
        }
    }

    if (!successfulDrop) {
        if (uiContext.ghostCardRef.value) {
            L.DomUtil.remove(uiContext.ghostCardRef.value);
            uiContext.ghostCardRef.value = null;
        }
        cardElement.style.position = '';
        cardElement.style.left = '';
        cardElement.style.top = '';
        cardElement.style.transform = '';
    }
}

// 處理 ghostCard 動畫與移除
function animateGhostCardDrop(card, drop, map) {
    if (uiContext.ghostCardRef.value) {
        const dropLatLng = drop.getBounds ? drop.getBounds().getCenter() : drop.getLatLng();
        const dropPoint = map.latLngToContainerPoint(dropLatLng);
        const targetX = dropPoint.x - uiContext.ghostCardRef.value.offsetWidth / 2;
        const targetY = dropPoint.y - uiContext.ghostCardRef.value.offsetHeight / 2;
        uiContext.ghostCardRef.value.style.transition = 'left 0.2s ease-out, top 0.2s ease-out';
        uiContext.ghostCardRef.value.style.left = targetX + 'px';
        uiContext.ghostCardRef.value.style.top = targetY + 'px';
        setTimeout(() => {
            removeGhostCard();
            card.style.display = 'none';
        }, 200);
    } else {
        card.style.display = 'none';
    }
}

export function handleDrop({ drop, drag, map }) {
    const card = drag._element;
    const eventId = card.id;
    const droppedLocationId = drop.options.location_id;
    const eventData = uiContext.gameData.events.find(e => e.event_id === eventId);

    if (uiContext.sequentialMode) {
        handleSequentialDrop(
            { card, eventId, droppedLocationId, eventData, drop, map });
        return;
    }

    handleNormalDrop({ card, eventId, droppedLocationId, eventData, drop, map });
}

// Sequential mode 處理
export function handleSequentialDrop({ card, eventId, droppedLocationId, eventData, drop, map }) {
    const correctEvent = uiContext.eventsData[uiContext.currentEventIndex];
    const isCorrect = correctEvent && eventId === correctEvent.event_id && droppedLocationId === correctEvent.location_id;
    let popupContent = generatePopupContent(eventData);

    if (isCorrect) {
        card.style.display = 'none';
        removeGhostCard();
        const marker = createStaticMarker(drop, eventData, popupContent, map);
        uiContext.placedEvents[eventId] = { marker, droppedLocationId };
        repositionMarkersAtLocation(map, droppedLocationId, uiContext.placedEvents, uiContext.gameData, uiContext.locationsData);
        uiContext.currentEventIndex++;
        updateDraggableCards();
        if (uiContext.currentEventIndex >= uiContext.eventsData.length) {
            checkAnswers(uiContext.gameData, map);
        }
    } else {
        removeGhostCard();
        L.DomUtil.setOpacity(card, 1);
        card.classList.add('card-shake');
        setTimeout(() => card.classList.remove('card-shake'), 820);
    }
}

// 一般模式處理
export function handleNormalDrop({ card, eventId, droppedLocationId, eventData, drop, map }) {
    const oldPlacedEvent = uiContext.placedEvents[card.id];
    animateGhostCardDrop(card, drop, map);

    if (oldPlacedEvent) {
        map.removeLayer(oldPlacedEvent.marker);
        repositionMarkersAtLocation(map, oldPlacedEvent.droppedLocationId, uiContext.placedEvents, uiContext.gameData, uiContext.locationsData);
    }

    const marker = createDraggableMarker(drop, eventData, map);
    marker.bindPopup(generatePopupContent(eventData));
    setupMarkerDragEvents(marker, map);

    uiContext.placedEvents[card.id] = {
        marker,
        droppedLocationId: drop.options.location_id
    };

    updateCheckButtonState();
    repositionMarkersAtLocation(map, drop.options.location_id, uiContext.placedEvents, uiContext.gameData, uiContext.locationsData);
    updateCardCount();
}

// 建立靜態 marker（sequential mode）
function createStaticMarker(drop, eventData, popupContent, map) {
    const year = new Date(eventData.start_time).getFullYear();
    const correctIcon = L.divIcon({
        html: `<div class="placed-event-marker placed-event-marker--correct"><span>${eventData.title}</span><span class="marker-year">${year}</span></div>`,
        className: 'custom-div-icon',
        iconSize: null,
    });
    const markerLatLng = drop.getBounds ? drop.getBounds().getCenter() : drop.getLatLng();
    const marker = L.marker(markerLatLng, { icon: correctIcon }).addTo(map);
    marker.bindPopup(popupContent);
    return marker;
}

// 建立可拖曳 marker（一般模式）
function createDraggableMarker(drop, eventData, map) {
    const year = new Date(eventData.start_time).getFullYear();
    const markerIcon = L.divIcon({
        html: `<div class="placed-event-marker"><span>${eventData.title}</span><span class="marker-year">${year}</span></div>`,
        className: 'custom-div-icon',
        iconSize: null,
    });
    const markerLatLng = drop.getBounds ? drop.getBounds().getCenter() : drop.getLatLng();
    return L.marker(markerLatLng, { icon: markerIcon, draggable: true }).addTo(map);
}


// 移除 ghostCard
function removeGhostCard() {
    if (uiContext.ghostCardRef.value) {
        L.DomUtil.remove(uiContext.ghostCardRef.value);
        uiContext.ghostCardRef.value = null;
    }
}


export function checkAnswers(data, map) {
    let allCorrect = true;
    const locationsToUpdate = new Set();

    data.events.forEach(event => {
        const placed = uiContext.placedEvents[event.event_id];
        if (placed) {
            if (placed.droppedLocationId === event.location_id) {
                const year = new Date(event.start_time).getFullYear();
                const correctIcon = L.divIcon({ html: `<div class="placed-event-marker placed-event-marker--correct"><span>${event.title}</span><span class="marker-year">${year}</span></div>`, className: 'custom-div-icon', iconSize: null });
                placed.marker.setIcon(correctIcon);
                if (placed.marker.dragging) {
                    placed.marker.dragging.disable();
                }
            } else {
                allCorrect = false;
                map.removeLayer(placed.marker);

                const cardElement = document.getElementById(event.event_id);
                cardElement.style.display = 'block';
                cardElement.style.position = '';
                cardElement.style.left = '';
                cardElement.style.top = '';
                cardElement.style.transform = '';

                locationsToUpdate.add(placed.droppedLocationId);
                delete uiContext.placedEvents[event.event_id];
                updateCardCount();
            }
        } else {
            allCorrect = false;
        }
    });

    locationsToUpdate.forEach(locationId => repositionMarkersAtLocation(map, locationId, uiContext.placedEvents, uiContext.gameData, uiContext.locationsData));

    if (allCorrect) {
        uiContext.checkAnswersBtn.style.display = 'none';

        uiContext.placedChrono = data.events
            .map(eventData => {
                const placed = uiContext.placedEvents[eventData.event_id];
                return {
                    event: eventData,
                    marker: placed ? placed.marker : null
                };
            })
            .sort((a, b) => new Date(a.event.start_time) - new Date(b.event.start_time));

        // 修正：同時間事件微調 start_time
        for (let i = 1; i < uiContext.placedChrono.length; i++) {
            const prevTime = new Date(uiContext.placedChrono[i - 1].event.start_time).getTime();
            const currTime = new Date(uiContext.placedChrono[i].event.start_time).getTime();
            if (currTime <= prevTime) {
                uiContext.placedChrono[i].event.start_time = new Date(prevTime + 86400000).toISOString();
            }
        }

        uiContext.timelineEnabled = true;
        if (uiContext.timelineSlider) {
            uiContext.timelineSlider.disabled = false;
            uiContext.timelineSlider.style.pointerEvents = 'auto';
            uiContext.timelineSlider.style.display = 'block';
        }
        const ticksContainer = document.getElementById('timeline-ticks-container');
        if (ticksContainer) {
            ticksContainer.style.display = 'block';
        }
        const timelineControlsContainer = document.getElementById('timeline-controls-container');
        if (timelineControlsContainer) {
            timelineControlsContainer.style.display = 'flex';
        }
        if (uiContext.timelinePlayBtn) {
            uiContext.timelinePlayBtn.disabled = false;
            uiContext.timelinePlayBtn.style.pointerEvents = 'auto';
        }
        if (uiContext.timelinePauseBtn) {
            uiContext.timelinePauseBtn.disabled = false;
            uiContext.timelinePauseBtn.style.pointerEvents = 'auto';
        }
        if (uiContext.scaleToggleButton) {
            uiContext.scaleToggleButton.disabled = false;
            uiContext.scaleToggleButton.style.pointerEvents = 'auto';
        }
        if (uiContext.highlightToggleButton) {
            uiContext.highlightToggleButton.disabled = false;
            uiContext.highlightToggleButton.style.pointerEvents = 'auto';
        }
        if (uiContext.autoPanToggleButton) {
            uiContext.autoPanToggleButton.disabled = false;
            uiContext.autoPanToggleButton.style.pointerEvents = 'auto';
        }

        highlightStep(parseInt(uiContext.timelineSlider.value, 10), map);
    } else {
        updateCheckButtonState();
    }
}



// 遍歷所有事件，找到對應的卡片和地圖位置，然後呼叫 handleDrop，直接將卡片放到 marker 上
export function autoPlaceAndStartTimeline(data, map) {
    data.events.forEach(event => {
        const card = document.getElementById(event.event_id);
        if (!card) return;
        const location = uiContext.locationsData.find(loc => loc.location_id === event.location_id);
        if (!location) return;
        const circle = findCircleByLocationId(map, location.location_id);
        if (!circle) return;

        handleDrop({
            drop: circle,
            drag: { _element: card },
            map: uiContext.map
        });
    });

    checkAnswers(uiContext.gameData, map);

    setTimeout(() => {
        if (uiContext.timelinePlayBtn && !uiContext.timelinePlayBtn.disabled) {
            uiContext.timelinePlayBtn.click();
        }
    }, 800);
}



// --- 簡化 autoplay mode 控制流程 ---
export async function autoPlaceAndCollapsePanel(data, timelineContainer, map) {

    // ...收合 panel 相關程式...
    autoPlaceAndStartTimeline(data,map);

    await delay(500);

    const rightPanel = document.getElementById('right-panel');
    const toggleBtn = document.getElementById('toggle-panel-btn');
    const isCollapsed = rightPanel && rightPanel.classList.contains('w-0');

    if (rightPanel && toggleBtn && !isCollapsed) {
        toggleBtn.click();
        await delay(350); // 等待收合動畫
        // 收合後主動更新 timeline ticks layout
        if (window.updateTimelineTicksLayout) window.updateTimelineTicksLayout();
        // 新增：主動執行一次 scaleToggleButton 的 function（確保 slider/ticks 位置正確）
        //if (window.timelineScaleToggle) window.timelineScaleToggle();
    }
    
    if (timelineContainer) timelineContainer.classList.remove('hidden');
    // 顯示 timelineContainer 後再主動更新一次
    if (window.updateTimelineTicksLayout) window.updateTimelineTicksLayout();
    // 再執行一次 scaleToggleButton 的 function
    if (window.timelineScaleToggle) window.timelineScaleToggle();

    enableTimelineKeydown();
}