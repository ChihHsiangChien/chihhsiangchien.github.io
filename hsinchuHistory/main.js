document.addEventListener('DOMContentLoaded', () => {
    // --- Map Initialization ---
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' });
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri' });
    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)' });
    // Initialize map without a specific center/zoom; it will be set dynamically.
    const map = L.map('map', { layers: [satelliteLayer] });
    L.control.layers({ "OpenStreetMap": osmLayer, "Satellite": satelliteLayer, "Topographic": topoLayer }).addTo(map);

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

    // --- Game Setup ---
    fetch('data.json').then(response => response.json()).then(data => {
        gameData = data; // Store data
        setupGame(gameData);

        // 檢查網址參數，啟用自動播放模式
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === 'autoplay') {
            autoPlaceAndStartTimeline(gameData);
        }
    });

    function setupGame(data) {
        locationsData = data.locations;
        // --- 隨機排序事件卡片 ---
        const shuffledEvents = [...data.events];
        for (let i = shuffledEvents.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledEvents[i], shuffledEvents[j]] = [shuffledEvents[j], shuffledEvents[i]];
        }
        shuffledEvents.forEach(event => cardContainer.appendChild(createCard(event)));

        // --- Create a bounds object to fit all locations ---
        const bounds = L.latLngBounds();

        locationsData.forEach(location => {
            let layer;
            if (location.shape === 'polygon') {
                // 如果是多邊形，使用 L.polygon
                layer = L.polygon(location.points, { droppable: true, location_id: location.location_id });
            } else {
                // 預設為圓形
                layer = L.circle(location.center, { radius: location.radius, droppable: true, location_id: location.location_id });
            }
            layer.addTo(map)
                 .bindTooltip(`<span>${location.name}</span>`, { permanent: true, direction: 'center', className: 'location-tooltip' });

            // Now that the layer is on the map, get its bounds.
            // We must handle circles specially, as their getBounds() method requires the map
            // to be initialized with a view (zoom/center), which we are about to set with fitBounds().
            // It's a chicken-and-egg problem. So, we calculate the circle's bounds manually.
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
            // 更新按鈕外觀以提供視覺回饋
            highlightToggleButton.style.opacity = isHighlightModeEnabled ? '1' : '0.5';
            highlightToggleButton.title = isHighlightModeEnabled ? '關閉高亮模式' : '開啟高亮模式';
            highlightStep(parseInt(timelineSlider.value, 10)); // 立即重新整理地圖樣式
        };
        const toggleAutoPan = () => {
            isAutoPanEnabled = !isAutoPanEnabled;
            // 更新按鈕外觀以提供視覺回饋
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
                toggleIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />'; // > icon to indicate collapse action
                togglePanelBtn.style.right = 'calc(33.3333vw - 1.25rem)';
            } else {
                // Collapse panel
                rightPanel.classList.remove('w-1/3');
                rightPanel.classList.add('w-0');
                panelContent.classList.add('hidden');
                mapContainer.classList.remove('w-2/3');
                mapContainer.classList.add('w-full');
                toggleIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />'; // < icon to indicate expand action
                togglePanelBtn.style.right = '0.5rem';
            }

            setTimeout(() => {
                map.invalidateSize();
            }, 300); // Match CSS transition duration
        });
    }

    function createCard(event) {
        const card = document.createElement('div');
        card.className = 'draggable-card p-2 mb-2 bg-white rounded shadow cursor-pointer border-2 border-gray-300';
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

        // 防止點擊連結時觸發卡片的拖曳事件
        card.querySelectorAll('a').forEach(link => {
            // 使用 pointerdown 阻止事件冒泡到卡片，避免觸發拖曳
            link.addEventListener('pointerdown', e => e.stopPropagation());
        });

        // --- Unified Drag and Click Handling ---
        let isDragging = false;
        let pointerDownPos = { x: 0, y: 0 };

        card.addEventListener('pointerdown', (e) => {
            // 只有主要按鈕（滑鼠左鍵、觸控、觸控筆）才能觸發拖曳
            if (e.pointerType === 'mouse' && e.button !== 0) return;

            e.stopPropagation();

            isDragging = false;
            pointerDownPos = { x: e.clientX, y: e.clientY };

            // 監聽 document 上的 move 和 up 事件，以便在卡片外也能追蹤
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp, { once: true }); // 自動移除監聽器
        }, { passive: false });

        function startDrag(e) {
            isDragging = true;

            const cardRect = card.getBoundingClientRect();
            dragOffset = { x: e.clientX - cardRect.left, y: e.clientY - cardRect.top };

            ghostCard = L.DomUtil.create('div', 'is-dragging', document.body);
            ghostCard.innerHTML = card.querySelector('h3').outerHTML;
            ghostCard.style.width = card.offsetWidth + 'px';
            L.DomUtil.setOpacity(card, 0.5);

            // 初始 ghost 位置
            moveGhost(e);
        }

        function onPointerMove(e) {
            // 為支援觸控拖曳，需立即防止瀏覽器預設的捲動行為
            e.preventDefault();

            if (!isDragging) {
                // 檢查移動距離是否超過閾值，以區分點擊和拖曳
                const posDiff = Math.sqrt(Math.pow(e.clientX - pointerDownPos.x, 2) + Math.pow(e.clientY - pointerDownPos.y, 2));
                if (posDiff > 5) { // 移動超過 5px 才開始拖曳
                    startDrag(e);
                }
            }

            // 如果正在拖曳（不論是剛開始還是持續中），更新鬼魂卡片位置
            if (isDragging) {
                moveGhost(e);
                updateGuideAndLastEvent(e);
            }
        }

        function onPointerUp(e) {
            document.removeEventListener('pointermove', onPointerMove);

            if (isDragging) {
                L.DomUtil.setOpacity(card, 1);
                if (guideLine) { map.removeLayer(guideLine); guideLine = null; }
                handleDropAttempt(card);
                lastDragEvent = null;
            } else {
                // 如果不是拖曳，就視為點擊
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
        const latLng = map.mouseEventToLatLng(e);
        const closestLocation = findClosestLocation(latLng, locationsData);
        if (closestLocation) {
            // Now all locations have a 'center' property
            guideLine = L.polyline([latLng, closestLocation.center], { color: 'red', dashArray: '5, 5' }).addTo(map);
        }
        //console.log('[updateGuideLine] guideLine:', guideLine);                
    }

    function handleDrop({ drop, drag }) {

        const card = drag._element;
        const oldPlacedEvent = placedEvents[card.id];

        if (ghostCard) {
            // 對於多邊形，取得其邊界中心點
            const dropLatLng = drop.getBounds ? drop.getBounds().getCenter() : drop.getLatLng();
            const dropPoint = map.latLngToContainerPoint(dropLatLng);
            
            const targetX = dropPoint.x - ghostCard.offsetWidth / 2;
            const targetY = dropPoint.y - ghostCard.offsetHeight / 2;

            ghostCard.style.transition = 'left 0.2s ease-out, top 0.2s ease-out';
            ghostCard.style.left = targetX + 'px';
            ghostCard.style.top = targetY + 'px';

            // Remove ghost after animation
            setTimeout(() => {
                if (ghostCard) {
                    L.DomUtil.remove(ghostCard);
                    ghostCard = null;
                }
                card.style.display = 'none'; // Hide original card after ghost is gone
            }, 200); // Match transition duration
        } else {
            card.style.display = 'none'; // Hide immediately if no ghost (shouldn't happen)
        }

        // If this card was already placed somewhere else, remove the old marker
        if (oldPlacedEvent) {
            map.removeLayer(oldPlacedEvent.marker);
            repositionMarkersAtLocation(oldPlacedEvent.droppedLocationId); // Reposition markers at the old location
        }

        const eventId = card.id;
        const eventData = gameData.events.find(e => e.event_id === eventId);
        const year = new Date(eventData.start_time).getFullYear();

        const markerIcon = L.divIcon({
            html: `<div class="placed-event-marker"><span>${eventData.title}</span><span class="marker-year">${year}</span></div>`,
            className: 'custom-div-icon',
            iconSize: null,
        });

        const markerLatLng = drop.getBounds ? drop.getBounds().getCenter() : drop.getLatLng();
        const marker = L.marker(markerLatLng, { icon: markerIcon, draggable: true }).addTo(map);

        // --- Add popup with description and links ---
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

        // --- Enable re-dragging placed cards ---
        marker.on('dragstart', function(e) {
            const markerInstance = this;
            markerInstance.originalLatLng = markerInstance.getLatLng(); // Store original position
            const eventId = Object.keys(placedEvents).find(key => placedEvents[key].marker === markerInstance);
            if (!eventId) return;

            const originalCard = document.getElementById(eventId);

            // The original card is hidden with `display: none`, so its offsetWidth is 0.
            // We need to temporarily make it visible to get the correct width for the ghost.
            const originalDisplay = originalCard.style.display;
            originalCard.style.display = 'block'; // Temporarily show to measure.
            const cardWidth = originalCard.offsetWidth;
            originalCard.style.display = originalDisplay; // Hide it back immediately.

            ghostCard = L.DomUtil.create('div', 'is-dragging', document.body);
            ghostCard.innerHTML = originalCard.querySelector('h3').outerHTML;
            ghostCard.style.width = cardWidth + 'px';
            
            markerInstance.setOpacity(0); // Hide the marker being dragged
            dragOffset = { x: ghostCard.offsetWidth / 2, y: ghostCard.offsetHeight / 2 };
        });
        
        marker.on('drag', function(e) {
            // The originalEvent can be a MouseEvent or a TouchEvent.
            // We need an object with clientX/clientY for our functions.
            let eventForCoords = e.originalEvent; // Leaflet's drag event has originalEvent
            if (eventForCoords.touches && eventForCoords.touches.length > 0) {
                // On touch devices, use the first touch point.
                eventForCoords = eventForCoords.touches[0];
            }
            moveGhost(eventForCoords);
            updateGuideLine(eventForCoords);
            lastDragEvent = { originalEvent: eventForCoords }; // 修正：儲存處理過的座標物件
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

                // Check if dropped on the card container
                if (eventId && mouseX >= cardContainerRect.left && mouseX <= cardContainerRect.right && mouseY >= cardContainerRect.top && mouseY <= cardContainerRect.bottom) {
                    // --- Handle drop on container ---
                    const oldLocationId = placedEvents[eventId].droppedLocationId;
                    map.removeLayer(markerInstance);
                    delete placedEvents[eventId];

                    const cardElement = document.getElementById(eventId);
                    cardElement.style.display = 'block';
                    cardElement.style.position = ''; cardElement.style.left = ''; cardElement.style.top = ''; cardElement.style.transform = '';

                    repositionMarkersAtLocation(oldLocationId);
                    updateCheckButtonState();
                } else {
                    // --- Handle drop on map (existing logic) ---
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
                // 新增：處理拖曳到地圖外放開的情況
                // 將 marker 恢復到原始位置並設為可見
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
    }

    function checkAnswers(data) {
        let allCorrect = true;
        const locationsToUpdate = new Set();

        data.events.forEach(event => {
            const placed = placedEvents[event.event_id];
            if (placed) {
                if (placed.droppedLocationId === event.location_id) {
                    // Correctly placed: style it and disable dragging
                    const year = new Date(event.start_time).getFullYear();
                    const correctIcon = L.divIcon({ html: `<div class="placed-event-marker placed-event-marker--correct"><span>${event.title}</span><span class="marker-year">${year}</span></div>`, className: 'custom-div-icon', iconSize: null });
                    placed.marker.setIcon(correctIcon);
                    if (placed.marker.dragging) {
                        placed.marker.dragging.disable();
                    }
                } else {
                    // Incorrectly placed: return card to list
                    allCorrect = false;
                    map.removeLayer(placed.marker);
                    
                    const cardElement = document.getElementById(event.event_id);
                    cardElement.style.display = 'block';
                    
                    // Reset position styles left by L.Draggable
                    cardElement.style.position = '';
                    cardElement.style.left = '';
                    cardElement.style.top = '';
                    cardElement.style.transform = '';

                    locationsToUpdate.add(placed.droppedLocationId);
                    delete placedEvents[event.event_id];
                }
            } else {
                // Not placed at all
                allCorrect = false;
            }
        });

        locationsToUpdate.forEach(locationId => repositionMarkersAtLocation(locationId));

        if (allCorrect) {
            checkAnswersBtn.style.display = 'none';

            // --- Populate Chronological Data for Timeline ---
            // This needs to be done here because only now are the markers guaranteed to be correct.
            placedChrono = data.events
                .map(eventData => {
                    const placed = placedEvents[eventData.event_id];
                    return {
                        event: eventData,
                        marker: placed ? placed.marker : null // Get the final, correct marker
                    };
                })
                .sort((a, b) => new Date(a.event.start_time) - new Date(b.event.start_time));

            // --- Enable Timeline Mode ---
            timelineEnabled = true;
            // Enable slider and buttons
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
            if (scaleToggleButton) { // <-- 3. 在遊戲完成時啟用按鈕
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
            
            // Trigger initial highlight on the first event
            highlightStep(parseInt(timelineSlider.value, 10));
        } else {
            // Not all correct, so disable the button until all cards are placed again.
            updateCheckButtonState();
        }
    }

    function updateCheckButtonState() {
        const placedCount = Object.keys(placedEvents).length;
        checkAnswersBtn.disabled = placedCount === 0;
    }

    function highlightStep(idx) {
        if (!timelineEnabled) {
            // Clear all highlights when timeline is disabled
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

        // --- 處理非高亮模式 ---
        if (!isHighlightModeEnabled) {
            const currentEvent = placedChrono[idx];
            if (currentEvent && currentEvent.marker && isAutoPanEnabled) {
                map.panTo(currentEvent.marker.getLatLng());
            }
            // 將所有 marker 和地點標籤恢復為中性樣式
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
            return; // 結束函式，不執行後續的高亮邏輯
        }

        // Get the location_id of the currently highlighted event
        const highlightedEvent = placedChrono[idx];
        const highlightedLocationId = highlightedEvent ? highlightedEvent.event.location_id : null;

        // --- Update Event Markers ---
        placedChrono.forEach((item, i) => {
            if (item.marker) {
                const year = new Date(item.event.start_time).getFullYear();
                const isHighlighted = i === idx;
                const markerClass = `placed-event-marker placed-event-marker--correct ${isHighlighted ? 'placed-event-marker--highlight' : 'placed-event-marker--dimmed'}`;
                
                item.marker.setZIndexOffset(isHighlighted ? 1000 : 0);
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

        // --- Update Location Labels ---
        map.eachLayer(layer => {
            if (layer.options.location_id && layer.getTooltip() && layer.getTooltip().getElement()) {
                const tooltipEl = layer.getTooltip().getElement();
                const isHighlighted = layer.options.location_id === highlightedLocationId;
                tooltipEl.classList.toggle('location-tooltip--highlight', isHighlighted);
                tooltipEl.classList.toggle('location-tooltip--dimmed', !isHighlighted);
            }
        });
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
            // Now all locations have a 'center' property
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
        // 1. Find all events placed at this location
        const placedAtLocation = Object.entries(placedEvents)
            .filter(([eventId, data]) => data.droppedLocationId === locationId)
            .map(([eventId, data]) => {
                // 2. Get full event data for sorting
                const eventData = gameData.events.find(e => e.event_id === eventId);
                return {
                    marker: data.marker,
                    event: eventData
                };
            });

        // 3. Sort them by start_time
        placedAtLocation.sort((a, b) => new Date(a.event.start_time) - new Date(b.event.start_time));

        if (placedAtLocation.length > 0) {
            const locationData = locationsData.find(l => l.location_id === locationId);
            if (!locationData) return;

            // 4. Convert center lat/lng to pixel coordinates
            // Now all locations have a 'center' property
            const centerPoint = map.latLngToContainerPoint(locationData.center);
            const markerHeight = 20; // Approximate height of a marker, adjust as needed
            // Dynamic padding based on zoom level
            const padding = Math.max(0, (map.getZoom() - 13) * 3);

            // Calculation to stack markers below the location label
            const locationLabelHeight = 30; // Approximate height of the location label tooltip
            const spacingBelowLabel = -10;   // Gap between label and first marker
            const startY = centerPoint.y + (locationLabelHeight / 2) + spacingBelowLabel + (markerHeight / 2);

            // 5. Calculate new position for each marker
            placedAtLocation.forEach((item, index) => {
                const newY = startY + index * (markerHeight + padding);
                const newX = centerPoint.x - 25;
                const newPoint = L.point( newX , newY);
                
                // 6. Convert back to lat/lng and update marker
                const newLatLng = map.containerPointToLatLng(newPoint);
                item.marker.setLatLng(newLatLng);
            });
        }
    }

    // 自動播放模式：自動將所有事件卡片放到正確位置並啟用時間軸
    function autoPlaceAndStartTimeline(data) {
        // 1. 依序將所有事件卡片放到正確地點
        data.events.forEach(event => {
            const card = document.getElementById(event.event_id);
            if (!card) return;
            // 找到正確地點的 circle
            const location = locationsData.find(loc => loc.location_id === event.location_id);
            if (!location) return;
            const circle = findCircleByLocationId(location.location_id);
            if (!circle) return;

            // 模擬拖放：直接呼叫 handleDrop
            handleDrop({
                drop: circle,
                drag: { _element: card }
            });
        });

        // 2. 檢查答案（會啟用時間軸）
        checkAnswers(data);

        // 3. 自動播放時間軸
        setTimeout(() => {
            if (timelinePlayBtn && !timelinePlayBtn.disabled) {
                timelinePlayBtn.click();
            }
        }, 800); // 稍微延遲，確保 UI 已更新
    }

    // --- 行動裝置事件列表高度自動調整 ---
    function adjustCardContainerHeight() {
        // 檢查按鈕高度（可依實際按鈕高度微調）
        const checkBtnHeight = checkAnswersBtn.offsetHeight || 56;
        // 上方 padding（可依 UI 微調）
        const topPadding = 16;
        // 下方安全距離
        const bottomPadding = 24;
        // 計算可用高度
        const availableHeight = window.innerHeight - topPadding - checkBtnHeight - bottomPadding;
        cardContainer.style.maxHeight = availableHeight + 'px';
        cardContainer.style.overflowY = 'auto';
    }
    adjustCardContainerHeight();
    window.addEventListener('resize', adjustCardContainerHeight);
});