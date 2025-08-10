
// --- Timeline Slider UI ---
function setupTimelineSlider(data, map, onStepHighlight, getPlacedChrono, isTimelineEnabled, onToggleHighlight, onToggleAutoPan) {
    let timelineInterval = null; // Manage interval locally
    let isTimeScaleMode = false; // State for timeline scale mode
    // Remove any previous slider
    const oldSlider = document.querySelector('input[type="range"][style*="fixed"]');
    if (oldSlider) oldSlider.remove();
    const oldControlsContainer = document.getElementById('timeline-controls-container');
    if (oldControlsContainer) oldControlsContainer.remove();
    const oldTooltip = document.getElementById('timeline-tooltip');
    if (oldTooltip) oldTooltip.remove();
    const oldEventTicksContainer = document.getElementById('timeline-ticks-container');
    if (oldEventTicksContainer) oldEventTicksContainer.remove();
    const oldTimeScaleTicksContainer = document.getElementById('time-scale-ticks-container');
    if (oldTimeScaleTicksContainer) oldTimeScaleTicksContainer.remove();

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
    timelineSlider.style.transform = 'translateX(-45%)';
    timelineSlider.style.width = '60vw';
    timelineSlider.style.zIndex = '9999';
    // Note: All styling is now handled in style.css via the .timeline-slider class
    timelineSlider.style.display = 'none'; // Initially hidden
    timelineSlider.style.pointerEvents = 'none'; // Disabled at start
    timelineSlider.disabled = true;

    // --- Create Ticks for Slider ---
    const eventIndexTicksContainer = document.createElement('div');
    eventIndexTicksContainer.id = 'timeline-ticks-container';
    eventIndexTicksContainer.style.position = 'fixed';
    eventIndexTicksContainer.style.left = '50%';
    // 垂直置中於滑桿軌道上 (軌道高12px，容器高8px，滑桿底部32px，軌道中心點在 32 + 24/2 = 44px處，所以容器底部在 44 - 8/2 = 40px)
    eventIndexTicksContainer.style.bottom = '50px';
    eventIndexTicksContainer.style.transform = 'translateX(-45%)';
    // 調整寬度和內邊距，使刻度與滑桿的實際軌道對齊，而不是整個元素的寬度。
    // 這是對齊自訂刻度與標準 <input type="range"> 的常見修正方法。
    eventIndexTicksContainer.style.width = 'calc(60vw - 20px)'; // 減去大約的滑桿圓球寬度
    eventIndexTicksContainer.style.padding = '0 10px';
    eventIndexTicksContainer.style.height = '15px'; // Height for the ticks
    eventIndexTicksContainer.style.background = '#fff'; // 新增背景色以利於在地圖上顯示
    eventIndexTicksContainer.style.borderRadius = '8px'; // 圓角使其看起來像軌道
    eventIndexTicksContainer.style.boxShadow = '0 2px 8px #0003'; // 新增陰影以增加立體感
    eventIndexTicksContainer.style.zIndex = '9998'; // 高於滑桿軌道，但視覺上低於圓球
    eventIndexTicksContainer.style.pointerEvents = 'none';
    eventIndexTicksContainer.style.display = 'none'; // Initially hidden

    // --- Get date range for time scale mode ---
    const sortedEvents = [...data.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const minDate = sortedEvents.length > 0 ? new Date(sortedEvents[0].start_time) : new Date();
    const maxDate = sortedEvents.length > 0 ? new Date(sortedEvents[sortedEvents.length - 1].start_time) : new Date();
    const totalEvents = sortedEvents.length;
    const totalTimeSpan = maxDate.getTime() - minDate.getTime();

    // --- Populate Event Index Ticks ---
    if (totalEvents > 1) {
        sortedEvents.forEach((event, index) => {
            const tick = document.createElement('div');
            tick.style.position = 'absolute';
            tick.style.top = '0';
            tick.style.height = '100%';
            tick.style.width = '2px';
            tick.style.backgroundColor = '#9ca3af'; // gray-400
            tick.style.left = `calc(${(index / (totalEvents - 1)) * 100}% - 1px)`; // Center the tick
            eventIndexTicksContainer.appendChild(tick);
        });
    }

    // --- Create Ticks for Time Scale Mode ---
    const timeScaleTicksContainer = document.createElement('div');
    timeScaleTicksContainer.id = 'time-scale-ticks-container';
    timeScaleTicksContainer.style.position = 'fixed';
    timeScaleTicksContainer.style.left = '50%';
    timeScaleTicksContainer.style.bottom = '50px'; // Position above the slider
    timeScaleTicksContainer.style.transform = 'translateX(-45%)';
    timeScaleTicksContainer.style.width = 'calc(60vw - 20px)';
    timeScaleTicksContainer.style.padding = '0 10px';
    timeScaleTicksContainer.style.height = '30px'; // Height for the year labels
    timeScaleTicksContainer.style.background = '#fff'; // 新增背景色以利於在地圖上顯示
    timeScaleTicksContainer.style.zIndex = '9998'; // Below slider thumb
    timeScaleTicksContainer.style.pointerEvents = 'none';
    timeScaleTicksContainer.style.display = 'none'; // Initially hidden

    if (totalTimeSpan > 0) {
        const startYear = minDate.getFullYear();
        const endYear = maxDate.getFullYear();
        const yearSpan = endYear - startYear;

        let yearInterval = 1;
        if (yearSpan > 200) yearInterval = 50;
        else if (yearSpan > 100) yearInterval = 20;
        else if (yearSpan > 50) yearInterval = 10;
        else if (yearSpan > 20) yearInterval = 5;

        const firstTickYear = Math.ceil(startYear / yearInterval) * yearInterval;

        for (let year = firstTickYear; year < endYear; year += yearInterval) {
            const yearDate = new Date(year, 0, 1);
            const percentage = (yearDate.getTime() - minDate.getTime()) / totalTimeSpan;

            if (percentage > 0 && percentage < 1) { // Avoid cluttering the edges
                const tick = document.createElement('div');
                tick.style.position = 'absolute';
                tick.style.transform = 'translateX(-50%)';
                tick.style.textAlign = 'center';
                tick.style.fontSize = '12px';
                tick.style.color = '#6b7280'; // gray-500
                tick.style.left = `${percentage * 100}%`;
                tick.innerHTML = `
                    <div>${year}</div>
                    <div style="width: 1px; height: 5px; background-color: #9ca3af; margin: 0 auto 2px;"></div>
                    
                `;
                timeScaleTicksContainer.appendChild(tick);
            }
        }
    }

    // Create a container for the buttons to ensure they occupy the same position
    const timelineControlsContainer = document.createElement('div');
    timelineControlsContainer.id = 'timeline-controls-container';
    timelineControlsContainer.style.position = 'fixed';
    timelineControlsContainer.style.left = 'calc(50% - 45vw)'; // Position the container
    timelineControlsContainer.style.bottom = '28px';
    timelineControlsContainer.style.zIndex = '9999';
    timelineControlsContainer.style.display = 'none'; // Initially hidden, will be set to 'flex'
    timelineControlsContainer.style.alignItems = 'center'; // Vertically center the buttons

    // --- Create Toggle Button for Auto Pan ---
    const autoPanToggleButton = document.createElement('button');
    autoPanToggleButton.innerHTML = '🎦'; // Camera icon
    autoPanToggleButton.title = '切換自動平移';
    autoPanToggleButton.style.fontSize = '1.5rem';
    autoPanToggleButton.style.background = '#fff';
    autoPanToggleButton.style.border = '1px solid #ccc';
    autoPanToggleButton.style.borderRadius = '0.5rem';
    autoPanToggleButton.style.padding = '0.2rem 0.8rem';
    autoPanToggleButton.style.cursor = 'pointer';
    autoPanToggleButton.style.marginRight = '0.5rem';
    autoPanToggleButton.disabled = true;
    autoPanToggleButton.style.pointerEvents = 'none';

    // --- Create Toggle Button for Highlight Mode ---
    const highlightToggleButton = document.createElement('button');
    highlightToggleButton.innerHTML = '🔦'; // Spotlight icon
    highlightToggleButton.title = '切換高亮模式';
    highlightToggleButton.style.fontSize = '1.5rem';
    highlightToggleButton.style.background = '#fff';
    highlightToggleButton.style.border = '1px solid #ccc';
    highlightToggleButton.style.borderRadius = '0.5rem';
    highlightToggleButton.style.padding = '0.2rem 0.8rem';
    highlightToggleButton.style.cursor = 'pointer';
    highlightToggleButton.style.marginRight = '0.5rem';
    highlightToggleButton.disabled = true;
    highlightToggleButton.style.pointerEvents = 'none';

    // --- Create Toggle Button for Scale Mode ---
    const scaleToggleButton = document.createElement('button');
    scaleToggleButton.innerHTML = '📅'; // Calendar icon for time scale
    scaleToggleButton.title = '切換時間刻度模式';
    scaleToggleButton.style.fontSize = '1.5rem';
    scaleToggleButton.style.background = '#fff';
    scaleToggleButton.style.border = '1px solid #ccc';
    scaleToggleButton.style.borderRadius = '0.5rem';
    scaleToggleButton.style.padding = '0.2rem 0.8rem';
    scaleToggleButton.style.cursor = 'pointer';
    scaleToggleButton.style.marginRight = '0.5rem'; // Add some space
    scaleToggleButton.disabled = true;
    scaleToggleButton.style.pointerEvents = 'none';

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
    document.body.appendChild(eventIndexTicksContainer);
    document.body.appendChild(timeScaleTicksContainer);
    timelineControlsContainer.appendChild(autoPanToggleButton);
    timelineControlsContainer.appendChild(highlightToggleButton);
    timelineControlsContainer.appendChild(scaleToggleButton);
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
        const percentage = (e.clientX - sliderRect.left) / sliderRect.width;
        
        let eventToShow = null;
        const currentPlacedChrono = getPlacedChrono();

        if (isTimeScaleMode) {
            const hoverTime = minDate.getTime() + percentage * (totalTimeSpan);

            if (currentPlacedChrono && currentPlacedChrono.length > 0) {
                // 找到第一個時間點在 hoverTime 之後的事件索引
                const firstFutureIndex = currentPlacedChrono.findIndex(item => new Date(item.event.start_time).getTime() > hoverTime);

                let indexToShow = -1;
                if (firstFutureIndex === -1) {
                    // 如果所有事件都發生了，顯示最後一個
                    indexToShow = currentPlacedChrono.length - 1;
                } else if (firstFutureIndex === 0) {
                    // 如果滑鼠在第一個事件之前，顯示第一個事件的資訊
                    indexToShow = 0;
                } else {
                    // 否則，顯示剛發生過的前一個事件
                    indexToShow = firstFutureIndex - 1;
                }

                if (indexToShow !== -1) {
                    eventToShow = currentPlacedChrono[indexToShow].event;
                }
            }
        } else {
            const maxIndex = parseInt(timelineSlider.max, 10);
            let index = Math.round(percentage * maxIndex);
            index = Math.max(0, Math.min(maxIndex, index));
            if (currentPlacedChrono && currentPlacedChrono[index]) {
                eventToShow = currentPlacedChrono[index].event;
            }
        }

        if (eventToShow) {
            const year = new Date(eventToShow.start_time).getFullYear();
            timelineTooltip.textContent = `${year}: ${eventToShow.title}`;
            
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
            if (isTimeScaleMode) {
                const currentTime = parseInt(timelineSlider.value, 10);
                let newIndex = 0;
                const currentPlacedChrono = getPlacedChrono();
                if (currentPlacedChrono && currentPlacedChrono.length > 0) {
                    // 找到第一個時間點在目前滑桿時間之後的事件索引
                    const firstFutureIndex = currentPlacedChrono.findIndex(item => new Date(item.event.start_time).getTime() > currentTime);

                    if (firstFutureIndex === -1) {
                        // 如果所有事件都已發生，則停在最後一個事件
                        newIndex = currentPlacedChrono.length - 1;
                    } else if (firstFutureIndex === 0) {
                        // 如果滑桿在第一個事件之前，高亮第一個事件
                        newIndex = 0;
                    } else {
                        // 否則，高亮剛發生過的前一個事件
                        newIndex = firstFutureIndex - 1;
                    }
                }
                currentIdx = newIndex;
            } else {
                currentIdx = parseInt(timelineSlider.value, 10);
            }
            onStepHighlight(currentIdx);
        }
    };

    // Use 'pointerup' for better compatibility on touch devices, as 'click' can be unreliable.
    timelinePlayBtn.addEventListener('pointerup', () => {
        if (timelinePlayBtn.disabled) return; // 允許在兩種模式下播放
        timelinePlayBtn.style.display = 'none'; // Hide play button
        timelinePauseBtn.style.display = 'block'; // Show pause button
        timelinePauseBtn.disabled = false;
        timelineInterval = setInterval(() => {
            currentIdx++;
            const currentPlacedChrono = getPlacedChrono();
            if (currentPlacedChrono && currentIdx >= currentPlacedChrono.length) {
                currentIdx = 0; // Loop back to the beginning
            }

            // 根據當前模式更新滑桿的值
            if (isTimeScaleMode) {
                const eventDate = new Date(currentPlacedChrono[currentIdx].event.start_time);
                timelineSlider.value = eventDate.getTime();
            } else {
                timelineSlider.value = currentIdx;
            }
            onStepHighlight(currentIdx);
        }, 1200);
    });

    const pauseTimeline = () => {
        if (timelinePauseBtn.disabled) return;
        timelinePauseBtn.style.display = 'none'; // Hide pause button
        timelinePlayBtn.style.display = 'block'; // Show play button
        timelinePlayBtn.disabled = false;
        clearInterval(timelineInterval);
        timelineInterval = null;
    };
    timelinePauseBtn.addEventListener('pointerup', pauseTimeline);

    function updateSliderScale() {
        if (isTimeScaleMode) {
            // Time Scale Mode
            timelineSlider.min = minDate.getTime();
            timelineSlider.max = maxDate.getTime();
            timelineSlider.step = 1000 * 60 * 60 * 24; // One day step
            
            const currentPlacedChrono = getPlacedChrono();
            if (currentPlacedChrono && currentPlacedChrono[currentIdx]) {
                const eventDate = new Date(currentPlacedChrono[currentIdx].event.start_time);
                timelineSlider.value = eventDate.getTime();
            }
            scaleToggleButton.innerHTML = '🔢'; // Number icon for index scale
            scaleToggleButton.title = '切換事件索引模式';
            eventIndexTicksContainer.style.display = 'none';
            timeScaleTicksContainer.style.display = isTimelineEnabled() ? 'block' : 'none';
        } else {
            // Event Index Mode (default)
            timelineSlider.min = 0;
            timelineSlider.max = totalEvents > 0 ? totalEvents - 1 : 0;
            timelineSlider.step = 1;
            timelineSlider.value = currentIdx;
            scaleToggleButton.innerHTML = '📅'; // Calendar icon for time scale
            scaleToggleButton.title = '切換時間刻度模式';
            eventIndexTicksContainer.style.display = isTimelineEnabled() ? 'block' : 'none';
            timeScaleTicksContainer.style.display = 'none';
        }
    }

    scaleToggleButton.addEventListener('pointerup', () => {
        isTimeScaleMode = !isTimeScaleMode;
        // 允許在播放時切換模式而無需暫停
        updateSliderScale();
    });

    highlightToggleButton.addEventListener('pointerup', onToggleHighlight);

    autoPanToggleButton.addEventListener('pointerup', onToggleAutoPan);

    return { timelineSlider, timelinePlayBtn, timelinePauseBtn, scaleToggleButton, highlightToggleButton, autoPanToggleButton };
}