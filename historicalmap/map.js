// map.js

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


export function moveGhost(ghostCard, dragOffset, e) {
    if (ghostCard) {
        ghostCard.style.left = (e.clientX - dragOffset.x) + 'px';
        ghostCard.style.top = (e.clientY - dragOffset.y) + 'px';
    }
}

export function updateGuideLine({ map, guideLineRef, event, locationsData }) {

    if (guideLineRef.value) map.removeLayer(guideLineRef.value);

    if (!window._lastGuideTooltipId) window._lastGuideTooltipId = null;
    const latLng = map.mouseEventToLatLng(event);
    const closestLocation = findClosestLocation(map, latLng, locationsData);
    let currentTooltipId = null;
    if (closestLocation) currentTooltipId = closestLocation.location_id;

    if (window._lastGuideTooltipId !== currentTooltipId) {
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
        window._lastGuideTooltipId = currentTooltipId;
    }
    if (closestLocation) {
        guideLineRef.value = L.polyline([latLng, closestLocation.center], { color: 'red', dashArray: '5, 5' }).addTo(map);
    }
}

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