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