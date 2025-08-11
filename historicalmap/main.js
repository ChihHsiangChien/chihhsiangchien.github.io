// 1. 引入地圖設定
import { mapsData } from './maps.config.js';
import { setupMap } from './map.js';

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
        .then(data => {
            // 將地圖資料和區域顏色設定一起傳入 setupGame
            setupGame(data, currentMapConfig.regionColorConfig);

            // 檢查網址參數，啟用自動播放模式
            if (urlParams.get('mode') === 'autoplay') {
                autoPlaceAndStartTimeline(data);
                
                // 自動收合右側面板以提供更好的觀看體驗
                setTimeout(() => {
                    const rightPanel = document.getElementById('right-panel');
                    const toggleBtn = document.getElementById('toggle-panel-btn');
                    const isCollapsed = rightPanel && rightPanel.classList.contains('w-0');
                    if (rightPanel && toggleBtn && !isCollapsed) {
                        toggleBtn.click();
                    }
                }, 500); // 可依實際情況調整延遲時間
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

    function updateDraggableCards() {
        if (!sequentialMode) return;
        const cards = document.querySelectorAll('.draggable-card');
        const nextEvent = eventsData[currentEventIndex];

        cards.forEach(card => {
            // The card is draggable if it's the next event in sequence.
            const isDraggable = nextEvent && card.id === nextEvent.event_id;
            //card.setAttribute('draggable', isDraggable);
            card.dataset.draggable = isDraggable; // 用 data-draggable

            if (isDraggable) {
                card.classList.remove('opacity-50', 'cursor-not-allowed');
                card.classList.add('cursor-pointer');
            } else {
                card.classList.add('opacity-50', 'cursor-not-allowed');
                card.classList.remove('cursor-pointer');
            }
        });
        updateCardCount(); // 只在全部卡片狀態更新後呼叫一次
    }

    function renderCards(eventsToRender, regionColorConfig) {
        cardContainer.innerHTML = ''; // Clear existing cards
        eventsToRender.forEach(event => {
            // Only create a card if it hasn't been placed on the map yet
            if (!placedEvents[event.event_id]) {
                cardContainer.appendChild(createCard(event, regionColorConfig));
            }
        });
        if (sequentialMode) {
            updateDraggableCards();
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
        const controls = setupTimelineSlider(data, map, highlightStep, getPlacedChrono, isTimelineEnabled, toggleHighlightMode, toggleAutoPan);
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

    function createCard(event, regionColorConfig) {
        const card = document.createElement('div');
        const region = event.region || 'default';
        const colorInfo = regionColorConfig[region] || regionColorConfig.default;
        card.className = `draggable-card p-2 mb-2 mr-2 rounded shadow cursor-pointer border-2`;
        card.style.backgroundColor = colorInfo.bgColor;
        card.style.borderColor = colorInfo.borderColor;
        card.style.color = colorInfo.textColor;
        card.id = event.event_id;
        const year = new Date(event.start_time).getFullYear();

        let imageHTML = '';
        if (event.image) {
            imageHTML = `
                <div class="mt-2">
                    <img src="${event.image}" alt="${event.title}" class="w-full h-auto rounded">
                    ${event.image_source ? `<div class="text-left text-xs text-gray-500 mt-1">圖片來源：<a href="${event.image_source.url}" target="_blank" rel="noopener noreferrer" class="hover:underline">${event.image_source.name}</a></div>` : ''}
                </div>
            `;
        }

        let linksHTML = '';
        if (event.links && event.links.length > 0) {
            linksHTML += '<div class="mt-2 text-xs space-x-2">';
            event.links.forEach(link => {
                linksHTML += `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${link.name}</a>`;
            });
            linksHTML += '</div>';
        }

        card.innerHTML = `<h3 class="font-bold text-sm flex justify-between items-center"><span>${event.title}</span><span class="text-xs text-gray-500 font-normal ml-2">${year}</span></h3><div class="details hidden mt-1">${imageHTML}<p class="text-xs text-gray-600 mt-2">${event.description || ''}</p>${linksHTML}</div>`;

        card.querySelectorAll('a').forEach(link => {
            link.addEventListener('pointerdown', e => e.stopPropagation());
        });

        let isDragging = false;
        let pointerDownPos = { x: 0, y: 0 };

        card.addEventListener('pointerdown', (e) => {
            e.preventDefault(); // 防止選取文字

            if ((e.pointerType === 'mouse' && e.button !== 0) || (sequentialMode && card.dataset.draggable !== 'true')) {
                return;
            }

            e.stopPropagation();
            isDragging = false;
            pointerDownPos = { x: e.clientX, y: e.clientY };

            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp, { once: true });
        }, { passive: false });

        function startDrag(e) {
            isDragging = true;
            const cardRect = card.getBoundingClientRect();
            dragOffset = { x: e.clientX - cardRect.left, y: e.clientY - cardRect.top };
            ghostCard = L.DomUtil.create('div', 'is-dragging', document.body);
            ghostCard.innerHTML = card.querySelector('h3').outerHTML;
            ghostCard.style.width = card.offsetWidth + 'px';
            L.DomUtil.setOpacity(card, 0.5);
            moveGhost(e);
        }

        function onPointerMove(e) {
            e.preventDefault();
            if (!isDragging) {
                const posDiff = Math.sqrt(Math.pow(e.clientX - pointerDownPos.x, 2) + Math.pow(e.clientY - pointerDownPos.y, 2));
                if (posDiff > 5) {
                    startDrag(e);
                }
            }
            if (isDragging) {
                moveGhost(e);
                updateGuideAndLastEvent(e);
            }
        }

        function onPointerUp(e) {
            document.removeEventListener('pointermove', onPointerMove);
            // 拖曳結束時移除所有 tooltip 的 guide-highlight class
            map.eachLayer(layer => {
                if (layer.options && layer.options.location_id && layer.getTooltip && layer.getTooltip() && layer.getTooltip().getElement()) {
                    layer.getTooltip().getElement().classList.remove('location-tooltip--guide-highlight');
                }
            });
            window._lastGuideTooltipId = null;
            if (isDragging) {
                L.DomUtil.setOpacity(card, 1);
                if (guideLine) { map.removeLayer(guideLine); guideLine = null; }
                handleDropAttempt(card);
                lastDragEvent = null;
            } else {
                card.querySelector('.details').classList.toggle('hidden');
            }
            isDragging = false;
        }

        return card;
    }

    function updateGuideAndLastEvent(e) {
        const mapContainer = map.getContainer();
        const mapRect = mapContainer.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        if (mouseX >= mapRect.left && mouseX <= mapRect.right && mouseY >= mapRect.top && mouseY <= mapRect.bottom) {
            updateGuideLine(e);
        } else {
            if (guideLine) {
                map.removeLayer(guideLine);
                guideLine = null;
            }
        }
        lastDragEvent = { originalEvent: e };
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
                const closestLocation = findClosestLocation(latLng, locationsData);

                if (closestLocation) {
                    const droppedOnCircle = findCircleByLocationId(closestLocation.location_id);
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
    
    function moveGhost(e) {
        if (ghostCard) {
            ghostCard.style.left = (e.clientX - dragOffset.x) + 'px';
            ghostCard.style.top = (e.clientY - dragOffset.y) + 'px';
        }
    }
    function updateGuideLine(e) {
        if (guideLine) map.removeLayer(guideLine);
        // 儲存上一次 highlight 的 tooltip id
        if (!window._lastGuideTooltipId) window._lastGuideTooltipId = null;
        const latLng = map.mouseEventToLatLng(e);
        const closestLocation = findClosestLocation(latLng, locationsData);
        let currentTooltipId = null;
        if (closestLocation) {
            currentTooltipId = closestLocation.location_id;
        }
        // 只有目標 tooltip id 變更時才移除/加入 highlight class
        if (window._lastGuideTooltipId !== currentTooltipId) {
            // 先移除所有 highlight class
            map.eachLayer(layer => {
                if (layer.options && layer.options.location_id && layer.getTooltip && layer.getTooltip() && layer.getTooltip().getElement()) {
                    layer.getTooltip().getElement().classList.remove('location-tooltip--guide-highlight');
                }
            });
            // 加入新的 highlight class
            if (currentTooltipId) {
                const targetLayer = findCircleByLocationId(currentTooltipId);
                if (targetLayer && targetLayer.getTooltip && targetLayer.getTooltip() && targetLayer.getTooltip().getElement()) {
                    targetLayer.getTooltip().getElement().classList.add('location-tooltip--guide-highlight');
                }
            }
            window._lastGuideTooltipId = currentTooltipId;
        }
        if (closestLocation) {
            guideLine = L.polyline([latLng, closestLocation.center], { color: 'red', dashArray: '5, 5' }).addTo(map);
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
                
                // Add to placedEvents so repositioning and final check works
                placedEvents[eventId] = { marker: marker, droppedLocationId: droppedLocationId };
                
                repositionMarkersAtLocation(droppedLocationId);

                currentEventIndex++;
                updateDraggableCards();

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
            repositionMarkersAtLocation(oldPlacedEvent.droppedLocationId);
        }

        const year = new Date(eventData.start_time).getFullYear();

        const markerIcon = L.divIcon({
            html: `<div class="placed-event-marker"><span>${eventData.title}</span><span class="marker-year">${year}</span></div>`,
            className: 'custom-div-icon',
            iconSize: null,
        });

        const markerLatLng = drop.getBounds ? drop.getBounds().getCenter() : drop.getLatLng();
        const marker = L.marker(markerLatLng, { icon: markerIcon, draggable: true }).addTo(map);

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
            moveGhost(eventForCoords);
            updateGuideLine(eventForCoords);
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

                    repositionMarkersAtLocation(oldLocationId);
                    updateCheckButtonState();
                } else {
                    const latLng = map.mouseEventToLatLng(lastDragEvent.originalEvent);
                    const closestLocation = findClosestLocation(latLng, locationsData);
                    if (closestLocation && eventId) {
                        const droppedOnCircle = findCircleByLocationId(closestLocation.location_id);
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
    repositionMarkersAtLocation(drop.options.location_id);
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

        locationsToUpdate.forEach(locationId => repositionMarkersAtLocation(locationId));

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
            repositionMarkersAtLocation(locationId);
        });
    }

    function findClosestLocation(latLng, locations) {
        let closest = null, minDistance = Infinity;
        locations.forEach(loc => {
            const distance = map.distance(latLng, loc.center);
            if (distance < minDistance) {
                minDistance = distance;
                closest = loc;
            }
        });
        return closest;
    }

    function findCircleByLocationId(locationId) {
        let foundLayer = null;
        map.eachLayer(layer => {
            if (layer.options.location_id === locationId) {
                foundLayer = layer;
            }
        });
        return foundLayer;
    }

    function repositionMarkersAtLocation(locationId) {
        const placedAtLocation = Object.entries(placedEvents)
            .filter(([eventId, data]) => data.droppedLocationId === locationId)
            .map(([eventId, data]) => {
                const eventData = gameData.events.find(e => e.event_id === eventId);
                return {
                    marker: data.marker,
                    event: eventData
                };
            });

        placedAtLocation.sort((a, b) => new Date(a.event.start_time) - new Date(b.event.start_time));

        if (placedAtLocation.length > 0) {
            const locationData = locationsData.find(l => l.location_id === locationId);
            if (!locationData) return;

            const centerPoint = map.latLngToContainerPoint(locationData.center);
            const markerHeight = 20;
            const padding = Math.max(0, (map.getZoom() - 13) * 3);
            const locationLabelHeight = 30;
            const spacingBelowLabel = -10;
            const startY = centerPoint.y + (locationLabelHeight / 2) + spacingBelowLabel + (markerHeight / 2);

            placedAtLocation.forEach((item, index) => {
                const newY = startY + index * (markerHeight + padding);
                const newX = centerPoint.x - 25;
                const newPoint = L.point( newX , newY);
                
                const newLatLng = map.containerPointToLatLng(newPoint);
                item.marker.setLatLng(newLatLng);
            });
        }
    }

    function autoPlaceAndStartTimeline(data) {
        data.events.forEach(event => {
            const card = document.getElementById(event.event_id);
            if (!card) return;
            const location = locationsData.find(loc => loc.location_id === event.location_id);
            if (!location) return;
            const circle = findCircleByLocationId(location.location_id);
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

    function adjustCardContainerHeight() {
        const checkBtnHeight = checkAnswersBtn.offsetHeight || 56;
        const topPadding = 16;
        const bottomPadding = 24;
        const availableHeight = window.innerHeight - topPadding - checkBtnHeight - bottomPadding;
        cardContainer.style.maxHeight = availableHeight + 'px';
        cardContainer.style.overflowY = 'auto';
    }
    adjustCardContainerHeight();
    window.addEventListener('resize', adjustCardContainerHeight);
});