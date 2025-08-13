// 引入設定
import { mapsData } from './maps.config.js';
import { setupMap } from './map.js';
import { moveGhost, updateGuideLine, findClosestLocation, findCircleByLocationId, repositionMarkersAtLocation } from './map.js';
import { updateGuideAndLastEvent } from './map.js';

import { createCard } from './card.js';

import { delay } from './utils.js';
import { generatePopupContent } from './utils.js';

import { adjustCardContainerHeight } from './uiUtils.js';
import { setupTimelineSlider, timelineKeydownHandler } from './timeline.js';


import { updateDraggableCards } from './uiController.js';


document.addEventListener('DOMContentLoaded', () => {
    let sequentialMode = false;
    let currentEventIndex = 0;
    let eventsData = []; // To store sorted events for sequential mode

    // 2. 從 URL 讀取要顯示的地圖 ID 和模式
    const urlParams = new URLSearchParams(window.location.search);
    const mapId = urlParams.get('map') || 'chutung-history'; // 預設載入竹東地圖
    sequentialMode = urlParams.get('mode') === 'sequential';
    const currentMapConfig = mapsData[mapId];

    if (!currentMapConfig) {
        console.error(`Map with id "${mapId}" not found in maps.config.js`);
        // 可以在此顯示錯誤訊息或載入預設地圖
        return;
    }

    // 3. 根據設定檔載入對應的資料
    fetch(currentMapConfig.dataPath)
        .then(response => response.json())
        .then(async data => {
            setupGame(data, currentMapConfig.regionColorConfig);

            const timelineContainer = document.getElementById('timeline-container');
            if (urlParams.get('mode') === 'autoplay') {
                await autoPlaceAndCollapsePanel(data, timelineContainer);
            } else {
                if (timelineContainer) timelineContainer.classList.add('hidden');
            }
        });

    // --- Map Initialization ---
    const map = setupMap('map', 'satellite');

    function injectRegionStyles(config) {
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

    // --- Game State & UI ---
    let placedEvents = {};
    let guideLine = null;
    let locationsData = [];
    let gameData = {}; // Store game data globally
    let ghostCard = null;
    let dragOffset = { x: 0, y: 0 };
    let lastDragEvent = null; // To store the last mouse event during drag
    const cardContainer = document.getElementById('card-container');
    const checkAnswersBtn = document.getElementById('check-answers-btn');
    const rightPanel = document.getElementById('right-panel');
    const panelContent = document.getElementById('panel-content');
    const togglePanelBtn = document.getElementById('toggle-panel-btn');
    const toggleIcon = document.getElementById('toggle-icon');
    const mapContainer = document.getElementById('map');

    let timelineEnabled = false;
    let timelineSlider = null;
    let timelinePlayBtn = null;
    let timelinePauseBtn = null;
    let scaleToggleButton = null;
    let highlightToggleButton = null;
    let autoPanToggleButton = null;
    let isAutoPanEnabled = true; // 新增：自動平移狀態，預設開啟
    let isHighlightModeEnabled = true; // 新增：高亮模式狀態，預設開啟
    let placedChrono = []; // Will be populated with {event, marker} objects


    function renderCards(eventsToRender, regionColorConfig) {
        cardContainer.innerHTML = ''; // Clear existing cards
        eventsToRender.forEach(event => {
            // Only create a card if it hasn't been placed on the map yet
            if (!placedEvents[event.event_id]) {
                //cardContainer.appendChild(createCard(event, regionColorConfig));
            cardContainer.appendChild(
                createCard(event, regionColorConfig, {
                    sequentialMode,
                    moveGhost,
                    updateGuideAndLastEvent,
                    map,
                    locationsData,
                    getGuideLine: () => guideLine,
                    setGuideLine: val => { guideLine = val; },
                    setLastDragEvent: val => { lastDragEvent = val; },
                    getGhostCard: () => ghostCard,
                    setGhostCard: val => { ghostCard = val; },
                    dragOffsetRef: dragOffset,
                    handleDropAttempt
                })
            );               
            }
        });
        if (sequentialMode) {
            updateDraggableCards({
                sequentialMode,
                eventsData,
                currentEventIndex
            });
        }
        updateCardCount();
    }

    // --- 卡片統計更新函式 ---
    function updateCardCount() {
        const cardCountSpan = document.getElementById('card-count');
        if (!cardCountSpan || !gameData.events) return;
        const total = gameData.events.length;
        const placed = Object.keys(placedEvents).length; // 已放入地圖
        cardCountSpan.textContent = `已放入：${placed} / 全部：${total}`;        
        //const sorted = document.querySelectorAll('.draggable-card').length;
        //cardCountSpan.textContent = `卡片：${sorted} / ${total}`;
    }

    function setupGame(data, regionColorConfig) {
        gameData = data; // 將載入的資料存到全域變數中
        locationsData = data.locations;
        injectRegionStyles(regionColorConfig);

        // --- 預設排序並渲染卡片 ---
        const sortedEvents = [...data.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        eventsData = sortedEvents; // Store for sequential mode
        renderCards(sortedEvents, regionColorConfig);

        // --- Sorting Logic ---
        const sortYearAscBtn = document.getElementById('sort-year-asc');
        const sortYearDescBtn = document.getElementById('sort-year-desc');
        const sortRegionAscBtn = document.getElementById('sort-region-asc');
        const sortRegionDescBtn = document.getElementById('sort-region-desc');
        const sortButtons = [sortYearAscBtn, sortYearDescBtn, sortRegionAscBtn, sortRegionDescBtn];
        
        if (sequentialMode) {
            checkAnswersBtn.style.display = 'none';
            const sortContainer = document.getElementById('sort-buttons-container');
            if (sortContainer) {
                sortContainer.style.display = 'none';
            }
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
            const sorted = [...gameData.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
            renderCards(sorted, regionColorConfig);
            updateSortButtonStyles(sortYearAscBtn);
        });

        sortYearDescBtn.addEventListener('click', () => {
            const sorted = [...gameData.events].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
            renderCards(sorted, regionColorConfig);
            updateSortButtonStyles(sortYearDescBtn);
        });

        sortRegionAscBtn.addEventListener('click', () => {
            const sorted = [...gameData.events].sort((a, b) => (a.region || '').localeCompare(b.region || '', 'zh-Hant'));
            renderCards(sorted, regionColorConfig);
            updateSortButtonStyles(sortRegionAscBtn);
        });

        sortRegionDescBtn.addEventListener('click', () => {
            const sorted = [...gameData.events].sort((a, b) => (b.region || '').localeCompare(a.region || '', 'zh-Hant'));
            renderCards(sorted, regionColorConfig);
            updateSortButtonStyles(sortRegionDescBtn);
        });
        // --- Create a bounds object to fit all locations ---
        const bounds = L.latLngBounds();

        locationsData.forEach(location => {
            let layer;
            const region = location.region || 'default';
            const colorInfo = regionColorConfig[region] || regionColorConfig.default;

            if (location.shape === 'polygon') {
                // 如果是多邊形，使用 L.polygon
                layer = L.polygon(location.points, { droppable: true, location_id: location.location_id });
            } else {
                // 預設為圓形
                layer = L.circle(location.center, { radius: location.radius, droppable: true, location_id: location.location_id });
            }
            layer.addTo(map)
                 .bindTooltip(`<span>${location.name}</span>`, { permanent: true, direction: 'center', className: `location-tooltip region-${colorInfo.name}` });

            if (layer instanceof L.Polygon) {
                bounds.extend(layer.getBounds());
            } else if (layer instanceof L.Circle) {
                bounds.extend(layer.getLatLng().toBounds(layer.getRadius()));
            }
        });

        // --- Fit map to the calculated bounds ---
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        map.on('droppable:drop', handleDrop);
        checkAnswersBtn.addEventListener('click', () => checkAnswers(gameData));
        map.on('zoomend', handleZoom);
        // Pass callbacks and getters to decouple timeline logic from main.js
        const getPlacedChrono = () => placedChrono;
        const isTimelineEnabled = () => timelineEnabled;
        const toggleHighlightMode = () => {
            isHighlightModeEnabled = !isHighlightModeEnabled;
            highlightToggleButton.style.opacity = isHighlightModeEnabled ? '1' : '0.5';
            highlightToggleButton.title = isHighlightModeEnabled ? '關閉高亮模式' : '開啟高亮模式';
            highlightStep(parseInt(timelineSlider.value, 10));
        };
        const toggleAutoPan = () => {
            isAutoPanEnabled = !isAutoPanEnabled;
            autoPanToggleButton.style.opacity = isAutoPanEnabled ? '1' : '0.5';
            autoPanToggleButton.title = isAutoPanEnabled ? '關閉自動平移' : '開啟自動平移';
        };

        const controls = setupTimelineSlider(data, map, currentMapConfig, highlightStep, getPlacedChrono, isTimelineEnabled, toggleHighlightMode, toggleAutoPan);        
        timelineSlider = controls.timelineSlider;
        timelinePlayBtn = controls.timelinePlayBtn;
        timelinePauseBtn = controls.timelinePauseBtn;
        scaleToggleButton = controls.scaleToggleButton;
        highlightToggleButton = controls.highlightToggleButton;
        autoPanToggleButton = controls.autoPanToggleButton;

        togglePanelBtn.addEventListener('click', () => {
            const isCollapsed = rightPanel.classList.contains('w-0');

            if (isCollapsed) {
                // Expand panel
                rightPanel.classList.remove('w-0');
                rightPanel.classList.add('w-1/3');
                panelContent.classList.remove('hidden');
                mapContainer.classList.remove('w-full');
                mapContainer.classList.add('w-2/3');
                toggleIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />';
                togglePanelBtn.style.right = 'calc(33.3333vw - 1.25rem)';
            } else {
                // Collapse panel
                rightPanel.classList.remove('w-1/3');
                rightPanel.classList.add('w-0');
                panelContent.classList.add('hidden');
                mapContainer.classList.remove('w-2/3');
                mapContainer.classList.add('w-full');
                toggleIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />';
                togglePanelBtn.style.right = '0.5rem';
            }

            setTimeout(() => {
                map.invalidateSize();
            }, 300);
        });
    }



    function handleDropAttempt(cardElement) {
        let successfulDrop = false;
        if (lastDragEvent) {
            const mapContainer = map.getContainer();
            const mapRect = mapContainer.getBoundingClientRect();
            const mouseX = lastDragEvent.originalEvent.clientX;
            const mouseY = lastDragEvent.originalEvent.clientY;
            const droppedOnMap = mouseX >= mapRect.left && mouseX <= mapRect.right && mouseY >= mapRect.top && mouseY <= mapRect.bottom;

            if (droppedOnMap) {
                const latLng = map.mouseEventToLatLng(lastDragEvent.originalEvent);
                const closestLocation = findClosestLocation(map, latLng, locationsData);

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
            if (ghostCard) {
                L.DomUtil.remove(ghostCard);
                ghostCard = null;
            }
            cardElement.style.position = '';
            cardElement.style.left = '';
            cardElement.style.top = '';
            cardElement.style.transform = '';
        }
    }


    function handleDrop({ drop, drag }) {
        const card = drag._element;
        const eventId = card.id;
        const droppedLocationId = drop.options.location_id;
        const eventData = gameData.events.find(e => e.event_id === eventId);
    

        // --- Sequential Mode Logic ---
        if (sequentialMode) {
            const correctEvent = eventsData[currentEventIndex];
            const isCorrect = correctEvent && eventId === correctEvent.event_id && droppedLocationId === correctEvent.location_id;

            // 宣告 popupContent 於此區塊最前面
            let popupContent = generatePopupContent(eventData);


            if (isCorrect) {
                // Correct placement
                card.style.display = 'none'; // Hide card from panel
                if (ghostCard) { L.DomUtil.remove(ghostCard); ghostCard = null; }

                const year = new Date(eventData.start_time).getFullYear();
                const correctIcon = L.divIcon({
                    html: `<div class="placed-event-marker placed-event-marker--correct"><span>${eventData.title}</span><span class="marker-year">${year}</span></div>`,
                    className: 'custom-div-icon',
                    iconSize: null,
                });
                const markerLatLng = drop.getBounds ? drop.getBounds().getCenter() : drop.getLatLng();
                const marker = L.marker(markerLatLng, { icon: correctIcon }).addTo(map);
                marker.bindPopup(popupContent);

                // Add to placedEvents so repositioning and final check works
                placedEvents[eventId] = { marker: marker, droppedLocationId: droppedLocationId };

                repositionMarkersAtLocation(map, droppedLocationId, placedEvents, gameData, locationsData);

                currentEventIndex++;
                updateDraggableCards({
                    sequentialMode,
                    eventsData,
                    currentEventIndex
                });

                if (currentEventIndex >= eventsData.length) {
                    // Game finished, call checkAnswers to enable timeline
                    checkAnswers(gameData);
                }
            } else {
                // Incorrect placement
                if (ghostCard) { L.DomUtil.remove(ghostCard); ghostCard = null; }
                L.DomUtil.setOpacity(card, 1);
                card.classList.add('card-shake');
                setTimeout(() => card.classList.remove('card-shake'), 820);
            }
            return; // End execution for sequential mode
        }

        const oldPlacedEvent = placedEvents[card.id];

        if (ghostCard) {
            const dropLatLng = drop.getBounds ? drop.getBounds().getCenter() : drop.getLatLng();
            const dropPoint = map.latLngToContainerPoint(dropLatLng);
            
            const targetX = dropPoint.x - ghostCard.offsetWidth / 2;
            const targetY = dropPoint.y - ghostCard.offsetHeight / 2;

            ghostCard.style.transition = 'left 0.2s ease-out, top 0.2s ease-out';
            ghostCard.style.left = targetX + 'px';
            ghostCard.style.top = targetY + 'px';

            setTimeout(() => {
                if (ghostCard) {
                    L.DomUtil.remove(ghostCard);
                    ghostCard = null;
                }
                card.style.display = 'none';
            }, 200);
        } else {
            card.style.display = 'none';
        }

        if (oldPlacedEvent) {
            map.removeLayer(oldPlacedEvent.marker);
            repositionMarkersAtLocation(map, oldPlacedEvent.droppedLocationId, placedEvents, gameData, locationsData);
        }

        const year = new Date(eventData.start_time).getFullYear();

        const markerIcon = L.divIcon({
            html: `<div class="placed-event-marker"><span>${eventData.title}</span><span class="marker-year">${year}</span></div>`,
            className: 'custom-div-icon',
            iconSize: null,
        });

        const markerLatLng = drop.getBounds ? drop.getBounds().getCenter() : drop.getLatLng();
        const marker = L.marker(markerLatLng, { icon: markerIcon, draggable: true }).addTo(map);


        let popupContent = generatePopupContent(eventData);

        marker.bindPopup(popupContent);

        marker.on('dragstart', function(e) {
            const markerInstance = this;
            markerInstance.originalLatLng = markerInstance.getLatLng();
            const eventId = Object.keys(placedEvents).find(key => placedEvents[key].marker === markerInstance);
            if (!eventId) return;

            const originalCard = document.getElementById(eventId);
            const originalDisplay = originalCard.style.display;
            originalCard.style.display = 'block';
            const cardWidth = originalCard.offsetWidth;
            originalCard.style.display = originalDisplay;

            ghostCard = L.DomUtil.create('div', 'is-dragging', document.body);
            ghostCard.innerHTML = originalCard.querySelector('h3').outerHTML;
            ghostCard.style.width = cardWidth + 'px';
            
            markerInstance.setOpacity(0);
            dragOffset = { x: ghostCard.offsetWidth / 2, y: ghostCard.offsetHeight / 2 };
        });
        
        marker.on('drag', function(e) {
            let eventForCoords = e.originalEvent;
            if (eventForCoords.touches && eventForCoords.touches.length > 0) {
                eventForCoords = eventForCoords.touches[0];
            }
            moveGhost(ghostCard, dragOffset,eventForCoords);

            const guideLineRef = { value: guideLine };
            updateGuideLine({
                map,
                guideLineRef,
                event: eventForCoords,
                locationsData
            });    
            guideLine = guideLineRef.value;        
            lastDragEvent = { originalEvent: eventForCoords };
        });        

        marker.on('dragend', function(e) {
            const markerInstance = this;
            if (guideLine) map.removeLayer(guideLine); guideLine = null;
            if (ghostCard) L.DomUtil.remove(ghostCard); ghostCard = null;
            
            if (lastDragEvent) {
                const mouseX = lastDragEvent.originalEvent.clientX;
                const mouseY = lastDragEvent.originalEvent.clientY;
                const cardContainerRect = cardContainer.getBoundingClientRect();
                const eventId = Object.keys(placedEvents).find(key => placedEvents[key].marker === markerInstance);

                if (eventId && mouseX >= cardContainerRect.left && mouseX <= cardContainerRect.right && mouseY >= cardContainerRect.top && mouseY <= cardContainerRect.bottom) {
                    const oldLocationId = placedEvents[eventId].droppedLocationId;
                    map.removeLayer(markerInstance);
                    delete placedEvents[eventId];

                    const cardElement = document.getElementById(eventId);
                    cardElement.style.display = 'block';
                    cardElement.style.position = ''; cardElement.style.left = ''; cardElement.style.top = ''; cardElement.style.transform = '';

                    repositionMarkersAtLocation(map, oldLocationId, placedEvents, gameData, locationsData);
                    updateCheckButtonState();
                } else {
                    const latLng = map.mouseEventToLatLng(lastDragEvent.originalEvent);
                    const closestLocation = findClosestLocation(map, latLng, locationsData);
                    if (closestLocation && eventId) {
                        const droppedOnCircle = findCircleByLocationId(map, closestLocation.location_id);
                        const originalCardElement = document.getElementById(eventId);
                        map.fire('droppable:drop', { drop: droppedOnCircle, drag: { _element: originalCardElement } });
                    } else {
                        markerInstance.setLatLng(markerInstance.originalLatLng);
                        markerInstance.setOpacity(1);
                    }
                }
            } else {
                markerInstance.setLatLng(markerInstance.originalLatLng);
                markerInstance.setOpacity(1);
            }
        });

        placedEvents[card.id] = {
            marker: marker,
            droppedLocationId: drop.options.location_id
        };

        updateCheckButtonState();
        repositionMarkersAtLocation(map, drop.options.location_id, placedEvents, gameData, locationsData);
        updateCardCount();
    }

    function checkAnswers(data) {
        let allCorrect = true;
        const locationsToUpdate = new Set();

        data.events.forEach(event => {
            const placed = placedEvents[event.event_id];
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
                    delete placedEvents[event.event_id];
                    updateCardCount();                    
                }
            } else {
                allCorrect = false;
            }
        });

        locationsToUpdate.forEach(locationId => repositionMarkersAtLocation(map, locationId, placedEvents, gameData, locationsData));

        if (allCorrect) {
            checkAnswersBtn.style.display = 'none';

            placedChrono = data.events
                .map(eventData => {
                    const placed = placedEvents[eventData.event_id];
                    return {
                        event: eventData,
                        marker: placed ? placed.marker : null
                    };
                })
                .sort((a, b) => new Date(a.event.start_time) - new Date(b.event.start_time));

            // 修正：同時間事件微調 start_time
            for (let i = 1; i < placedChrono.length; i++) {
                const prevTime = new Date(placedChrono[i - 1].event.start_time).getTime();
                const currTime = new Date(placedChrono[i].event.start_time).getTime();
                if (currTime <= prevTime) {
                    // 增加 1 天 ，根據 timelineSlider.step的設定
                    placedChrono[i].event.start_time = new Date(prevTime + 86400000).toISOString();
                }
            }                

            timelineEnabled = true;
            if (timelineSlider) {
                timelineSlider.disabled = false;
                timelineSlider.style.pointerEvents = 'auto';
                timelineSlider.style.display = 'block';
            }
            const ticksContainer = document.getElementById('timeline-ticks-container');
            if (ticksContainer) {
                ticksContainer.style.display = 'block';
            }
            const timelineControlsContainer = document.getElementById('timeline-controls-container');
            if (timelineControlsContainer) {
                timelineControlsContainer.style.display = 'flex';
            }
            if (timelinePlayBtn) {
                timelinePlayBtn.disabled = false;
                timelinePlayBtn.style.pointerEvents = 'auto';
            }
            if (timelinePauseBtn) {
                timelinePauseBtn.disabled = false;
                timelinePauseBtn.style.pointerEvents = 'auto';
            }
            if (scaleToggleButton) {
                scaleToggleButton.disabled = false;
                scaleToggleButton.style.pointerEvents = 'auto';
            }
            if (highlightToggleButton) {
                highlightToggleButton.disabled = false;
                highlightToggleButton.style.pointerEvents = 'auto';
            }
            if (autoPanToggleButton) {
                autoPanToggleButton.disabled = false;
                autoPanToggleButton.style.pointerEvents = 'auto';
            }
            
            highlightStep(parseInt(timelineSlider.value, 10));
        } else {
            updateCheckButtonState();
        }
    }

    function updateCheckButtonState() {
        const placedCount = Object.keys(placedEvents).length;
        checkAnswersBtn.disabled = placedCount === 0;
    }

    function highlightStep(idx) {
        if (!timelineEnabled) {
            placedChrono.forEach(item => {
                if (item.marker) {
                    const year = new Date(item.event.start_time).getFullYear();
                    item.marker.setIcon(L.divIcon({
                        html: `<div class="placed-event-marker placed-event-marker--correct"><span>${item.event.title}</span><span class="marker-year">${year}</span></div>`,
                        className: 'custom-div-icon',
                        iconSize: null,
                    }));
                }
            });
            map.eachLayer(layer => {
                if (layer.getTooltip() && layer.getTooltip().getElement()) {
                    layer.getTooltip().getElement().classList.remove('location-tooltip--dimmed', 'location-tooltip--highlight');
                }
            });
            return;
        }

        if (!isHighlightModeEnabled) {
            const currentEvent = placedChrono[idx];
            if (currentEvent && currentEvent.marker && isAutoPanEnabled) {
                map.panTo(currentEvent.marker.getLatLng());
            }
            placedChrono.forEach(item => {
                if (item.marker) {
                    const year = new Date(item.event.start_time).getFullYear();
                    item.marker.setIcon(L.divIcon({
                        html: `<div class="placed-event-marker placed-event-marker--correct"><span>${item.event.title}</span><span class="marker-year">${year}</span></div>`,
                        className: 'custom-div-icon',
                        iconSize: null,
                    }));
                }
            });
            map.eachLayer(layer => {
                if (layer.getTooltip() && layer.getTooltip().getElement()) {
                    layer.getTooltip().getElement().classList.remove('location-tooltip--dimmed', 'location-tooltip--highlight');
                }
            });
            return;
        }

        const highlightedEvent = placedChrono[idx];
        const highlightedLocationId = highlightedEvent ? highlightedEvent.event.location_id : null;

        placedChrono.forEach((item, i) => {
            if (item.marker) {
                const year = new Date(item.event.start_time).getFullYear();
                const isHighlighted = i === idx;
                const targetPane = isHighlighted ? 'highlightedMarkerPane' : 'markerPane';
                if (item.marker.options.pane !== targetPane) {
                    item.marker.options.pane = targetPane;
                    if (map.hasLayer(item.marker)) {
                        map.removeLayer(item.marker);
                        map.addLayer(item.marker);
                    }
                }
                const markerClass = `placed-event-marker placed-event-marker--correct ${isHighlighted ? 'placed-event-marker--highlight' : 'placed-event-marker--dimmed'}`;                
                item.marker.setIcon(L.divIcon({
                    html: `<div class="${markerClass}"><span>${item.event.title}</span><span class="marker-year">${year}</span></div>`,
                    className: 'custom-div-icon',
                    iconSize: null,
                }));

                if (isHighlighted && isAutoPanEnabled) {
                    map.panTo(item.marker.getLatLng());
                }
            }
        });

        let highlightedLayer = null;
        map.eachLayer(layer => {
            if (layer.options.location_id && layer.getTooltip() && layer.getTooltip().getElement()) {
                const tooltipEl = layer.getTooltip().getElement();
                const isHighlighted = layer.options.location_id === highlightedLocationId;
                tooltipEl.classList.toggle('location-tooltip--highlight', isHighlighted);
                tooltipEl.classList.toggle('location-tooltip--dimmed', !isHighlighted);

                if (isHighlighted) {
                    highlightedLayer = layer;
                }
            }
        });

        if (highlightedLayer) {
            highlightedLayer.bringToFront();
        }
    }

    function handleZoom() {
        const locationsToUpdate = new Set(Object.values(placedEvents).map(p => p.droppedLocationId));
        locationsToUpdate.forEach(locationId => {
            repositionMarkersAtLocation(map, locationId, placedEvents, gameData, locationsData);
        });
    }



    // 遍歷所有事件，找到對應的卡片和地圖位置，然後呼叫 handleDrop，直接將卡片放到 marker 上
    function autoPlaceAndStartTimeline(data) {
        data.events.forEach(event => {
            const card = document.getElementById(event.event_id);
            if (!card) return;
            const location = locationsData.find(loc => loc.location_id === event.location_id);
            if (!location) return;
            const circle = findCircleByLocationId(map, location.location_id);
            if (!circle) return;

            handleDrop({
                drop: circle,
                drag: { _element: card }
            });
        });

        checkAnswers(data);

        setTimeout(() => {
            if (timelinePlayBtn && !timelinePlayBtn.disabled) {
                timelinePlayBtn.click();
            }
        }, 800);
    }

    adjustCardContainerHeight(cardContainer, checkAnswersBtn);
    window.addEventListener('resize', () => adjustCardContainerHeight(cardContainer, checkAnswersBtn));

    // --- 簡化 autoplay mode 控制流程 ---
    async function autoPlaceAndCollapsePanel(data, timelineContainer) {

        // ...收合 panel 相關程式...
        autoPlaceAndStartTimeline(data);

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

    function enableTimelineKeydown() {
        window.removeEventListener('keydown', timelineKeydownProxy);
        window.addEventListener('keydown', timelineKeydownProxy);
    }

    function timelineKeydownProxy(e) {
        timelineKeydownHandler(e, timelineEnabled, timelineSlider, placedChrono, highlightStep);
    }    
});