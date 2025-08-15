import { uiContext } from './context.js';
import { updateCheckButtonState } from './uiController.js';



// 初始化地圖，設定底圖圖層與圖層切換控制。
export function setupMap(mapContainerId = 'map', defaultLayer = 'satellite') {
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' });
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri' });
    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)' });

    const layers = {
        "OpenStreetMap": osmLayer,
        "Satellite": satelliteLayer,
        "Topographic": topoLayer
    };

    const defaultLayers = {
        'osm': osmLayer,
        'satellite': satelliteLayer,
        'topo': topoLayer
    };

    const map = L.map(mapContainerId, { layers: [defaultLayers[defaultLayer] || satelliteLayer] });

    map.createPane('highlightedMarkerPane');
    map.getPane('highlightedMarkerPane').style.zIndex = 651;
    map.getPane('highlightedMarkerPane').style.pointerEvents = 'none';

    L.control.layers(layers).addTo(map);

    return map;
}

// 尋找最近地點，僅依賴 map 物件與傳入參數。
export function findClosestLocation(map, latLng, locations) {
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

// 根據地點 ID 找出地圖上的圖層（circle/polygon）。
export function findCircleByLocationId(map, locationId) {
    let foundLayer = null;
    map.eachLayer(layer => {
        if (layer.options && layer.options.location_id === locationId) {
            foundLayer = layer;
        }
    });
    return foundLayer;
}

// 重新排列同一地點的 marker 位置，依賴 map、locationsData、placedEvents。
export function repositionMarkersAtLocation(map, locationId, placedEvents, gameData, locationsData) {
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
            const newPoint = L.point(newX, newY);
            const newLatLng = map.containerPointToLatLng(newPoint);
            item.marker.setLatLng(newLatLng);
        });
    }
}

// 移動拖曳時的 ghostCard（虛擬卡片）。
export function moveGhost(ghostCard, dragOffset, e) {
    if (ghostCard) {
        ghostCard.style.left = (e.clientX - dragOffset.x) + 'px';
        ghostCard.style.top = (e.clientY - dragOffset.y) + 'px';
    }
}

// 更新拖曳時的指引線與 tooltip 樣式。
export function updateGuideLine({ map, guideLineRef, event, locationsData }) {

    if (guideLineRef.value) map.removeLayer(guideLineRef.value);

    if (!uiContext.lastGuideTooltipId) uiContext.lastGuideTooltipId = null;
    const latLng = map.mouseEventToLatLng(event);
    const closestLocation = findClosestLocation(map, latLng, locationsData);
    let currentTooltipId = null;
    if (closestLocation) currentTooltipId = closestLocation.location_id;

    if (uiContext.lastGuideTooltipId !== currentTooltipId) {
        map.eachLayer(layer => {
            if (layer.options && layer.options.location_id && layer.getTooltip && layer.getTooltip() && layer.getTooltip().getElement()) {
                layer.getTooltip().getElement().classList.remove('location-tooltip--guide-highlight');
            }
        });
        if (currentTooltipId) {
            const targetLayer = findCircleByLocationId(map, currentTooltipId);
            if (targetLayer && targetLayer.getTooltip && targetLayer.getTooltip() && targetLayer.getTooltip().getElement()) {
                targetLayer.getTooltip().getElement().classList.add('location-tooltip--guide-highlight');
            }
        }
        uiContext.lastGuideTooltipId = currentTooltipId;
    }
    if (closestLocation) {
        guideLineRef.value = L.polyline([latLng, closestLocation.center], { color: 'red', dashArray: '5, 5' }).addTo(map);
    }
}

// 更新拖曳時的指引線與最後拖曳事件資訊。
export function updateGuideAndLastEvent({
    map,
    guideLine,
    event,
    locationsData,
    setGuideLine,
    setLastDragEvent
}) {
    const mapContainer = map.getContainer();
    const mapRect = mapContainer.getBoundingClientRect();
    const mouseX = event.clientX;
    const mouseY = event.clientY;

    if (mouseX >= mapRect.left && mouseX <= mapRect.right && mouseY >= mapRect.top && mouseY <= mapRect.bottom) {
        const guideLineRef = { value: guideLine };
        updateGuideLine({
            map,
            guideLineRef,
            event,
            locationsData
        });
        setGuideLine(guideLineRef.value);
    } else {
        if (guideLine) {
            map.removeLayer(guideLine);
            setGuideLine(null);
        }
    }
    setLastDragEvent({ originalEvent: event });
}

// 在地圖上渲染所有地點（circle/polygon），並設定 tooltip。
export function renderLocationsOnMap(map, regionColorConfig) {
    const bounds = L.latLngBounds();
    uiContext.locationsData.forEach(location => {
        let layer;
        const region = location.region || 'default';
        const colorInfo = regionColorConfig[region] || regionColorConfig.default;

        if (location.shape === 'polygon') {
            layer = L.polygon(location.points, { droppable: true, location_id: location.location_id });
        } else {
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
    // 存 bounds 供 fitMapToLocations 使用
    map._customBounds = bounds;
}

// 讓地圖自動縮放至所有地點的範圍。
export function fitMapToLocations(map) {
    const bounds = map._customBounds;
    if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}


// 註冊 marker 拖曳事件
// 註冊 marker 拖曳事件的起始處理。
function handleMarkerDragStart(markerInstance) {
    markerInstance.originalLatLng = markerInstance.getLatLng();
    const eventId = Object.keys(uiContext.placedEvents).find(key => uiContext.placedEvents[key].marker === markerInstance);
    if (!eventId) return;
    const originalCard = document.getElementById(eventId);
    const originalDisplay = originalCard.style.display;
    originalCard.style.display = 'block';
    const cardWidth = originalCard.offsetWidth;
    originalCard.style.display = originalDisplay;
    uiContext.ghostCardRef.value = L.DomUtil.create('div', 'is-dragging', document.body);
    uiContext.ghostCardRef.value.innerHTML = originalCard.querySelector('h3').outerHTML;
    uiContext.ghostCardRef.value.style.width = cardWidth + 'px';
    markerInstance.setOpacity(0);
    uiContext.dragOffsetRef.value = { 
        x: uiContext.ghostCardRef.value.offsetWidth / 2, 
        y: uiContext.ghostCardRef.value.offsetHeight / 2 
    };
}

// 處理 marker 拖曳過程中的事件。
function handleMarkerDrag(e, map) {
    let eventForCoords = e.originalEvent;
    if (eventForCoords.touches && eventForCoords.touches.length > 0) {
        eventForCoords = eventForCoords.touches[0];
    }
    moveGhost(uiContext.ghostCardRef.value, uiContext.dragOffsetRef.value, eventForCoords);
    updateGuideLine({
        map,
        guideLineRef: uiContext.guideLineRef,
        event: eventForCoords,
        locationsData: uiContext.locationsData
    });
    uiContext.lastDragEventRef.value = { originalEvent: eventForCoords };
}

// 處理 marker 拖曳結束時的事件。
function handleMarkerDragEnd(markerInstance, map) {
    const lastDragEvent = uiContext.lastDragEventRef.value;
    map.eachLayer(layer => {
        if (
            layer.options &&
            layer.options.location_id &&
            layer.getTooltip &&
            layer.getTooltip() &&
            layer.getTooltip().getElement()
        ) {
            layer.getTooltip().getElement().classList.remove('location-tooltip--guide-highlight');
        }
    });
    uiContext.lastGuideTooltipId = null;
    if (uiContext.guideLineRef.value) map.removeLayer(uiContext.guideLineRef.value);
    uiContext.guideLineRef.value = null;

    if (uiContext.ghostCardRef.value) {
        L.DomUtil.remove(uiContext.ghostCardRef.value);
        uiContext.ghostCardRef.value = null;
    }

    if (lastDragEvent) {
        const mouseX = lastDragEvent.originalEvent.clientX;
        const mouseY = lastDragEvent.originalEvent.clientY;
        const cardContainerRect = uiContext.cardContainer.getBoundingClientRect();
        const eventId = Object.keys(uiContext.placedEvents).find(key => uiContext.placedEvents[key].marker === markerInstance);

        if (eventId && mouseX >= cardContainerRect.left && mouseX <= cardContainerRect.right && mouseY >= cardContainerRect.top && mouseY <= cardContainerRect.bottom) {
            const oldLocationId = uiContext.placedEvents[eventId].droppedLocationId;
            map.removeLayer(markerInstance);
            delete uiContext.placedEvents[eventId];
            const cardElement = document.getElementById(eventId);
            cardElement.style.display = 'block';
            cardElement.style.position = ''; cardElement.style.left = ''; cardElement.style.top = ''; cardElement.style.transform = '';
            repositionMarkersAtLocation(map, oldLocationId, uiContext.placedEvents, uiContext.gameData, uiContext.locationsData);
            updateCheckButtonState();
        } else {
            const latLng = map.mouseEventToLatLng(lastDragEvent.originalEvent);
            const closestLocation = findClosestLocation(map, latLng, uiContext.locationsData);
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
}

// 註冊 marker 拖曳相關事件（dragstart, drag, dragend）。
export function setupMarkerDragEvents(marker, map) {
    marker.on('dragstart', function() {
        handleMarkerDragStart(this);
    });

    marker.on('drag', function(e) {
        handleMarkerDrag(e, map);
    });

    marker.on('dragend', function() {
        handleMarkerDragEnd(this, map);
    });
}


// 地圖縮放時，重新排列所有已放置 marker 的位置。
export function handleZoom(map) {
    const locationsToUpdate = new Set(Object.values(uiContext.placedEvents).map(p => p.droppedLocationId));
    locationsToUpdate.forEach(locationId => {
        repositionMarkersAtLocation(map, locationId, uiContext.placedEvents, uiContext.gameData, uiContext.locationsData);
    });
}