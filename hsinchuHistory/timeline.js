
// --- Timeline Slider UI ---
function setupTimelineSlider(data, map, onStepHighlight, getPlacedChrono, isTimelineEnabled) {
    let timelineInterval = null; // Manage interval locally
    // Remove any previous slider
    const oldSlider = document.querySelector('input[type="range"][style*="fixed"]');
    if (oldSlider) oldSlider.remove();
    const oldControlsContainer = document.getElementById('timeline-controls-container');
    if (oldControlsContainer) oldControlsContainer.remove();
    const oldTooltip = document.getElementById('timeline-tooltip');
    if (oldTooltip) oldTooltip.remove();
    const oldTicksContainer = document.getElementById('timeline-ticks-container');
    if (oldTicksContainer) oldTicksContainer.remove();

    // Create slider
    const timelineSlider = document.createElement('input');
    timelineSlider.type = 'range';
    timelineSlider.className = 'timeline-slider'; // Add class for easier styling
    timelineSlider.min = 0;
    // The max value is based on the total number of events.
    // placedChrono will be populated later with correct markers.
    timelineSlider.max = data.events.length > 0 ? data.events.length - 1 : 0;
    timelineSlider.value = 0;
    timelineSlider.step = 1;
    timelineSlider.style.position = 'fixed';
    timelineSlider.style.left = '50%';
    timelineSlider.style.bottom = '32px';
    timelineSlider.style.transform = 'translateX(-50%)';
    timelineSlider.style.width = '60vw';
    timelineSlider.style.zIndex = '9999';
    // Note: All styling is now handled in style.css via the .timeline-slider class
    timelineSlider.style.display = 'none'; // Initially hidden
    timelineSlider.style.pointerEvents = 'none'; // Disabled at start
    timelineSlider.disabled = true;

    // --- Create Ticks for Slider ---
    const timelineTicksContainer = document.createElement('div');
    timelineTicksContainer.id = 'timeline-ticks-container';
    timelineTicksContainer.style.position = 'fixed';
    timelineTicksContainer.style.left = '50%';
    timelineTicksContainer.style.bottom = '44px'; // Align with slider track
    timelineTicksContainer.style.transform = 'translateX(-50%)';
    // 調整寬度和內邊距，使刻度與滑桿的實際軌道對齊，而不是整個元素的寬度。
    // 這是對齊自訂刻度與標準 <input type="range"> 的常見修正方法。
    timelineTicksContainer.style.width = 'calc(60vw - 20px)'; // 減去大約的滑桿圓球寬度
    timelineTicksContainer.style.padding = '0 10px';
    timelineTicksContainer.style.height = '8px'; // Height for the ticks
    timelineTicksContainer.style.zIndex = '10000'; // 高於滑桿軌道，但視覺上低於圓球
    timelineTicksContainer.style.pointerEvents = 'none';
    timelineTicksContainer.style.display = 'none'; // Initially hidden

    const sortedEvents = [...data.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const totalEvents = sortedEvents.length;

    if (totalEvents > 1) {
        sortedEvents.forEach((event, index) => {
            const tick = document.createElement('div');
            tick.style.position = 'absolute';
            tick.style.top = '0';
            tick.style.height = '100%';
            tick.style.width = '2px';
            tick.style.backgroundColor = '#9ca3af'; // gray-400
            tick.style.left = `calc(${(index / (totalEvents - 1)) * 100}% - 1px)`; // Center the tick
            timelineTicksContainer.appendChild(tick);
        });
    }

    // Create a container for the buttons to ensure they occupy the same position
    const timelineControlsContainer = document.createElement('div');
    timelineControlsContainer.id = 'timeline-controls-container';
    timelineControlsContainer.style.position = 'fixed';
    timelineControlsContainer.style.left = 'calc(50% - 35vw)'; // Position the container
    timelineControlsContainer.style.bottom = '28px';
    timelineControlsContainer.style.zIndex = '9999';
    timelineControlsContainer.style.display = 'none'; // Initially hidden

    // Play/Pause buttons
    const timelinePlayBtn = document.createElement('button');
    timelinePlayBtn.textContent = '▶️';
    timelinePlayBtn.style.fontSize = '1.5rem';
    timelinePlayBtn.style.background = '#fff';
    timelinePlayBtn.style.border = '1px solid #ccc';
    timelinePlayBtn.style.borderRadius = '0.5rem';
    timelinePlayBtn.style.padding = '0.2rem 0.8rem';
    timelinePlayBtn.style.cursor = 'pointer';
    timelinePlayBtn.style.display = 'block';
    timelinePlayBtn.style.pointerEvents = 'none'; // Disabled at start
    timelinePlayBtn.disabled = true;

    const timelinePauseBtn = document.createElement('button');
    timelinePauseBtn.textContent = '⏸️';
    timelinePauseBtn.style.fontSize = '1.5rem';
    timelinePauseBtn.style.background = '#fff';
    timelinePauseBtn.style.border = '1px solid #ccc';
    timelinePauseBtn.style.borderRadius = '0.5rem';
    timelinePauseBtn.style.padding = '0.2rem 0.8rem';
    timelinePauseBtn.style.cursor = 'pointer';
    timelinePauseBtn.style.display = 'none';
    timelinePauseBtn.style.pointerEvents = 'none'; // Disabled at start
    timelinePauseBtn.disabled = true;

    document.body.appendChild(timelineSlider);
    document.body.appendChild(timelineTicksContainer);
    timelineControlsContainer.appendChild(timelinePlayBtn);
    timelineControlsContainer.appendChild(timelinePauseBtn);
    document.body.appendChild(timelineControlsContainer);

    // --- Tooltip for Slider ---
    const timelineTooltip = document.createElement('div');
    timelineTooltip.id = 'timeline-tooltip';
    timelineTooltip.style.position = 'fixed';
    timelineTooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    timelineTooltip.style.color = 'white';
    timelineTooltip.style.padding = '5px 10px';
    timelineTooltip.style.borderRadius = '4px';
    timelineTooltip.style.display = 'none';
    timelineTooltip.style.zIndex = '10000';
    timelineTooltip.style.pointerEvents = 'none';
    timelineTooltip.style.whiteSpace = 'nowrap';
    document.body.appendChild(timelineTooltip);

    timelineSlider.addEventListener('mousemove', (e) => {
        if (!isTimelineEnabled()) return;

        const sliderRect = timelineSlider.getBoundingClientRect();
        const hoverPosition = e.clientX - sliderRect.left;
        const percentage = hoverPosition / sliderRect.width;
        const maxIndex = parseInt(timelineSlider.max, 10);
        let index = Math.round(percentage * maxIndex);
        index = Math.max(0, Math.min(maxIndex, index));

        const currentPlacedChrono = getPlacedChrono();
        if (currentPlacedChrono && currentPlacedChrono[index]) {
            const event = currentPlacedChrono[index].event;
            const year = new Date(event.start_time).getFullYear();
            timelineTooltip.textContent = `${year}: ${event.title}`;
            
            timelineTooltip.style.display = 'block';
            timelineTooltip.style.left = `${e.clientX}px`;
            timelineTooltip.style.top = `${sliderRect.top - 10}px`; // Position above the slider
            timelineTooltip.style.transform = 'translate(-50%, -100%)'; // Center horizontally, place above
        }
    });

    timelineSlider.addEventListener('mouseleave', () => {
        timelineTooltip.style.display = 'none';
    });

    let currentIdx = 0;

    timelineSlider.oninput = (e) => {
        if (!timelineSlider.disabled) {
            currentIdx = parseInt(timelineSlider.value, 10);
            onStepHighlight(currentIdx);
        }
    };

    timelinePlayBtn.onclick = () => {
        if (timelinePlayBtn.disabled) return;
        timelinePlayBtn.style.display = 'none'; // Hide play button
        timelinePauseBtn.style.display = 'block'; // Show pause button
        timelineInterval = setInterval(() => {
            currentIdx++;
            const currentPlacedChrono = getPlacedChrono();
            if (currentPlacedChrono && currentIdx >= currentPlacedChrono.length) {
                currentIdx = 0; // Loop back to the beginning
            }
            timelineSlider.value = currentIdx;
            onStepHighlight(currentIdx);
        }, 1200);
    };

    timelinePauseBtn.onclick = () => {
        if (timelinePauseBtn.disabled) return;
        timelinePauseBtn.style.display = 'none'; // Hide pause button
        timelinePlayBtn.style.display = 'block'; // Show play button
        clearInterval(timelineInterval);
    };

    // Initial highlight (only if timelineEnabled)
    // highlightStep(currentIdx); // Moved to checkAnswers to ensure it runs after placedChrono is populated
    return { timelineSlider, timelinePlayBtn, timelinePauseBtn };
}


function initializeTimeline2(data, map) {
    const timelineSlider = document.getElementById('timeline-slider');
    const timelineDate = document.getElementById('timeline-date');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playbackSpeedSelect = document.getElementById('playback-speed');

    const events = data.events;
    const sortedEvents = events.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const minDate = new Date(sortedEvents[0].start_time);
    const maxDate = new Date(sortedEvents[sortedEvents.length - 1].start_time);

    timelineSlider.min = minDate.getTime();
    timelineSlider.max = maxDate.getTime();
    timelineSlider.value = minDate.getTime();

    timelineDate.textContent = minDate.toDateString();

    let intervalId = null;
    let currentPlaybackSpeed = parseInt(playbackSpeedSelect.value);

    function startTimeline() {
        playPauseBtn.textContent = 'Pause';
        intervalId = setInterval(() => {
            const currentValue = parseInt(timelineSlider.value);
            const nextValue = currentValue + (1000 * 60 * 60 * 24 * 365 * currentPlaybackSpeed); // Advance by one year * speed
            if (nextValue > maxDate.getTime()) {
                timelineSlider.value = maxDate.getTime();
                stopTimeline();
            } else {
                timelineSlider.value = nextValue;
                updateTimeline();
            }
        }, 100); // Update every 100ms
    }

    function stopTimeline() {
        clearInterval(intervalId);
        intervalId = null;
        playPauseBtn.textContent = 'Play';
    }

    playPauseBtn.addEventListener('click', () => {
        if (intervalId) {
            stopTimeline();
        } else {
            startTimeline();
        }
    });

    playbackSpeedSelect.addEventListener('change', () => {
        currentPlaybackSpeed = parseInt(playbackSpeedSelect.value);
        if (intervalId) { // If playing, restart with new speed
            stopTimeline();
            startTimeline();
        }
    });

    timelineSlider.addEventListener('input', updateTimeline);

    function updateTimeline() {
        const currentDate = new Date(parseInt(timelineSlider.value));
        timelineDate.textContent = currentDate.toDateString();
        playAnimations(data.events, currentDate, map, data.locations);
    }
}