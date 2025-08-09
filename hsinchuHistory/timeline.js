function initializeTimeline(data, map) {
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