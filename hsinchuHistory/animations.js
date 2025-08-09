const eventMarkers = {};

function playAnimations(events, currentDate, map, locations) {
    events.forEach(event => {
        const eventDate = new Date(event.start_time);
        const location = locations.find(l => l.location_id === event.location_id);

        if (!location) return;

        if (event.event_type === 'single') {
            // Check if the event is active in the current year and month
            if (eventDate.getFullYear() === currentDate.getFullYear() && eventDate.getMonth() === currentDate.getMonth()) {
                // If marker doesn't exist, create and animate it
                if (!eventMarkers[event.event_id]) {
                    map.panTo([location.lat, location.lng]);
                    const marker = L.marker([location.lat, location.lng], { icon: createPulseIcon() }).addTo(map);
                    eventMarkers[event.event_id] = marker;
                    // Remove marker after animation duration
                    setTimeout(() => {
                        if (eventMarkers[event.event_id]) { // Check if it still exists before removing
                            map.removeLayer(marker);
                            delete eventMarkers[event.event_id];
                        }
                    }, 1500); // Shorter duration for a flash
                }
            }
        } else if (event.event_type === 'continuous') {
            const endDate = new Date(event.end_time);
            const isActive = (currentDate >= eventDate && currentDate <= endDate);

            if (isActive) {
                if (!eventMarkers[event.event_id]) {
                    // Fade in
                    map.panTo([location.lat, location.lng]);
                    const marker = L.marker([location.lat, location.lng], { icon: createContinuousIcon(event.title, 'continuous-marker-fade-in') }).addTo(map);
                    eventMarkers[event.event_id] = marker;
                } else {
                    // Ensure it's visible and not fading out
                    L.DomUtil.removeClass(eventMarkers[event.event_id]._icon, 'continuous-marker-fade-out');
                    L.DomUtil.addClass(eventMarkers[event.event_id]._icon, 'continuous-marker-active');
                }
            } else {
                if (eventMarkers[event.event_id]) {
                    // Fade out
                    L.DomUtil.removeClass(eventMarkers[event.event_id]._icon, 'continuous-marker-active');
                    L.DomUtil.addClass(eventMarkers[event.event_id]._icon, 'continuous-marker-fade-out');
                    setTimeout(() => {
                        if (eventMarkers[event.event_id]) { // Check if it still exists before removing
                            map.removeLayer(eventMarkers[event.event_id]);
                            delete eventMarkers[event.event_id];
                        }
                    }, 500); // Match fade-out duration
                }
            }
        }
    });
}

function createPulseIcon() {
    return L.divIcon({
        className: 'css-pulse',
        html: '<div class="pulse-circle"></div>', // Inner element for animation
        iconSize: [30, 30], // Larger for visibility
        iconAnchor: [15, 15] // Center the icon
    });
}

function createContinuousIcon(title, initialClass = '') {
    return L.divIcon({
        className: `continuous-marker ${initialClass}`,
        html: `<div class="continuous-marker-content">${title}</div>`,
        iconSize: [100, 30], // Example size, adjust as needed
        iconAnchor: [50, 15] // Center the icon
    });
}