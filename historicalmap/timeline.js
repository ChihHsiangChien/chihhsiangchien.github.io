// --- Timeline Slider UI ---
function setupTimelineSlider(data, map, onStepHighlight, getPlacedChrono, isTimelineEnabled, onToggleHighlight, onToggleAutoPan) {
    let timelineInterval = null;
    let isTimeScaleMode = false;

    // 移除舊的 DOM 元素
    [
        'timeline-controls-container',
        'timeline-tooltip',
        'timeline-ticks-container',
        'time-scale-ticks-container'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    const oldSlider = document.querySelector('input[type="range"][style*="fixed"]');
    if (oldSlider) oldSlider.remove();

    // 取得現有 DOM 元素
    const timelineSlider = document.getElementById('timeline-slider');
    const timelineContainer = document.getElementById('timeline-container');
    const playbackSpeedSelect = document.getElementById('playback-speed');

    // --- 控制按鈕建立 ---
    const timelinePlayBtn = document.createElement('button');
    timelinePlayBtn.id = 'play-pause-btn';
    timelinePlayBtn.textContent = '▶️';
    timelinePlayBtn.className = 'px-4 py-2 bg-blue-500 text-white rounded';
    Object.assign(timelinePlayBtn.style, {
        fontSize: '1.5rem',
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: '0.5rem',
        padding: '0.2rem 0.8rem',
        cursor: 'pointer',
        display: 'block',
        pointerEvents: 'auto'
    });

    const timelinePauseBtn = document.createElement('button');
    timelinePauseBtn.id = 'pause-btn';
    timelinePauseBtn.textContent = '⏸️';
    timelinePauseBtn.className = 'px-4 py-2 bg-blue-500 text-white rounded';
    Object.assign(timelinePauseBtn.style, {
        fontSize: '1.5rem',
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: '0.5rem',
        padding: '0.2rem 0.8rem',
        cursor: 'pointer',
        display: 'none',
        pointerEvents: 'auto'
    });

    const scaleToggleButton = document.createElement('button');
    scaleToggleButton.id = 'timeline-scale-btn';
    scaleToggleButton.innerHTML = '📅';
    scaleToggleButton.title = '切換時間刻度模式';
    scaleToggleButton.className = 'ml-2 px-2 py-1 rounded border';
    scaleToggleButton.style.marginRight = '0.5rem';

    const highlightToggleButton = document.createElement('button');
    highlightToggleButton.id = 'timeline-highlight-btn';
    highlightToggleButton.innerHTML = '🔦';
    highlightToggleButton.title = '切換高亮模式';
    highlightToggleButton.className = 'ml-2 px-2 py-1 rounded border';
    highlightToggleButton.style.marginRight = '0.5rem';

    const autoPanToggleButton = document.createElement('button');
    autoPanToggleButton.id = 'timeline-autopan-btn';
    autoPanToggleButton.innerHTML = '🎦';
    autoPanToggleButton.title = '切換自動平移';
    autoPanToggleButton.className = 'ml-2 px-2 py-1 rounded border';
    autoPanToggleButton.style.marginRight = '0.5rem';

    // --- Ticks for Slider ---
    const eventIndexTicksContainer = document.createElement('div');
    eventIndexTicksContainer.id = 'timeline-ticks-container';
    eventIndexTicksContainer.className = 'h-4 flex items-center';
    Object.assign(eventIndexTicksContainer.style, {
        position: 'absolute',
        bottom: '30px',
        height: '30px',
        pointerEvents: 'none',
        zIndex: '9998'
    });
    timelineContainer.appendChild(eventIndexTicksContainer);

    const timeScaleTicksContainer = document.createElement('div');
    timeScaleTicksContainer.id = 'time-scale-ticks-container';
    timeScaleTicksContainer.className = 'h-8 flex items-center';
    Object.assign(timeScaleTicksContainer.style, {
        position: 'absolute',
        bottom: '30px',
        padding: '0 10px',
        height: '30px',
        background: '#fff',
        zIndex: '9998',
        pointerEvents: 'none',
        display: 'none'
    });
    timelineContainer.appendChild(timeScaleTicksContainer);

    // slider 的位置和尺寸
    timelineSlider.style.position = 'absolute';
    timelineSlider.style.left = '20%';
    timelineSlider.style.width = '75%'; // 或 '80%'，依需求
    timelineSlider.style.top = '40px';
    timelineSlider.style.zIndex = '10002'; /* 確保在其他元素之上 */

    // --- ticksContainer layout update function ---
    function updateTicksContainerLayout() {
        requestAnimationFrame(() => {
            if (!timelineSlider || !timelineContainer) return;
            const sliderRect = timelineSlider.getBoundingClientRect();
            const containerRect = timelineContainer.getBoundingClientRect();
            const leftOffset = sliderRect.left - containerRect.left;
            const topOffset = sliderRect.top - containerRect.top;
            const sliderWidth = sliderRect.width;

            eventIndexTicksContainer.style.left = leftOffset + 'px';
            eventIndexTicksContainer.style.width = sliderWidth + 'px';
            eventIndexTicksContainer.style.bottom = topOffset + 'px';
            timeScaleTicksContainer.style.left = leftOffset + 'px';
            timeScaleTicksContainer.style.width = sliderWidth + 'px';
            timeScaleTicksContainer.style.bottom = topOffset + 'px';
        });
    }

    // 初始呼叫一次
    updateTicksContainerLayout();

    // 只在 resize、panel收合、timelineContainer顯示時執行
    const observer = new MutationObserver(() => {
        if (!timelineContainer.classList.contains('hidden')) {
            updateTicksContainerLayout();
        }
    });
    observer.observe(timelineContainer, { attributes: true, attributeFilter: ['class'] });

    window.addEventListener('resize', updateTicksContainerLayout);
    window.updateTimelineTicksLayout = updateTicksContainerLayout;

    // --- Tooltip for Slider ---
    const timelineTooltip = document.createElement('div');
    timelineTooltip.id = 'timeline-tooltip';
    Object.assign(timelineTooltip.style, {
        position: 'fixed',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '4px',
        display: 'none',
        zIndex: '10002',
        pointerEvents: 'none',
        whiteSpace: 'nowrap'
    });
    document.body.appendChild(timelineTooltip);

    timelineSlider.addEventListener('mousemove', (e) => {
        if (!isTimelineEnabled()) return;
        // 只取得 sliderRect，不執行 updateTicksContainerLayout
        const sliderRect = timelineSlider.getBoundingClientRect();
        const percentage = (e.clientX - sliderRect.left) / sliderRect.width;
        let eventToShow = null;
        const currentPlacedChrono = getPlacedChrono();
        if (isTimeScaleMode) {
            const hoverTime = minDate.getTime() + percentage * (totalTimeSpan);
            if (currentPlacedChrono && currentPlacedChrono.length > 0) {
                const firstFutureIndex = currentPlacedChrono.findIndex(item => new Date(item.event.start_time).getTime() > hoverTime);
                let indexToShow = -1;
                if (firstFutureIndex === -1) indexToShow = currentPlacedChrono.length - 1;
                else if (firstFutureIndex === 0) indexToShow = 0;
                else indexToShow = firstFutureIndex - 1;
                if (indexToShow !== -1) eventToShow = currentPlacedChrono[indexToShow].event;
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
            timelineTooltip.style.top = `${sliderRect.top - 10}px`;
            timelineTooltip.style.transform = 'translate(-50%, -100%)';
        }
    });
    timelineSlider.addEventListener('mouseleave', () => {
        timelineTooltip.style.display = 'none';
    });

    let currentIdx = 0;
    timelineSlider.oninput = (e) => {
        if (!timelineSlider.disabled) {
            // 只做 highlight，不執行 updateTicksContainerLayout
            if (isTimeScaleMode) {
                const currentTime = parseInt(timelineSlider.value, 10);
                let newIndex = 0;
                const currentPlacedChrono = getPlacedChrono();
                if (currentPlacedChrono && currentPlacedChrono.length > 0) {
                    const firstFutureIndex = currentPlacedChrono.findIndex(item => new Date(item.event.start_time).getTime() > currentTime);
                    if (firstFutureIndex === -1) newIndex = currentPlacedChrono.length - 1;
                    else if (firstFutureIndex === 0) newIndex = 0;
                    else newIndex = firstFutureIndex - 1;
                }
                currentIdx = newIndex;
            } else {
                currentIdx = parseInt(timelineSlider.value, 10);
            }
            onStepHighlight(currentIdx);
        }
    };

    // --- 播放速度控制 ---
    let playbackSpeed = 1;
    const setPlaybackSpeed = (speed) => {
        playbackSpeed = speed;
        // 若正在播放，重啟 interval
        if (timelineInterval) {
            clearInterval(timelineInterval);
            startTimelineInterval();
        }
    };
    if (playbackSpeedSelect) {
        playbackSpeedSelect.addEventListener('change', (e) => {
            setPlaybackSpeed(Number(e.target.value));
        });
    }
    function startTimelineInterval() {
        const baseMs = 1200;
        const intervalMs = baseMs / playbackSpeed;
        timelineInterval = setInterval(() => {
            currentIdx++;
            const currentPlacedChrono = getPlacedChrono();
            if (currentPlacedChrono && currentIdx >= currentPlacedChrono.length) {
                currentIdx = 0;
            }
            if (isTimeScaleMode) {
                const eventDate = new Date(currentPlacedChrono[currentIdx].event.start_time);
                timelineSlider.value = eventDate.getTime();
            } else {
                timelineSlider.value = currentIdx;
            }
            onStepHighlight(currentIdx);
        }, intervalMs);
    }

    // --- Get date range for time scale mode ---
    const sortedEvents = [...data.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const minDate = sortedEvents.length > 0 ? new Date(sortedEvents[0].start_time) : new Date();
    const maxDate = sortedEvents.length > 0 ? new Date(sortedEvents[sortedEvents.length - 1].start_time) : new Date();
    const totalEvents = sortedEvents.length;
    const totalTimeSpan = maxDate.getTime() - minDate.getTime();



    // 產生事件索引模式的 ticks
    eventIndexTicksContainer.innerHTML = ''; // 清空
    for (let i = 0; i < totalEvents; i++) {
        const percentage = i / (totalEvents - 1);
        const tick = document.createElement('div');
        Object.assign(tick.style, {
            position: 'absolute',
            left: `${percentage * 100}%`,
            transform: 'translateX(-50%)',
            width: '1px',
            height: '10px',
            background: '#9ca3af'
        });
        eventIndexTicksContainer.appendChild(tick);
    }


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
            if (percentage > 0 && percentage < 1) {
                const tick = document.createElement('div');
                Object.assign(tick.style, {
                    position: 'absolute',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#6b7280',
                    left: `${percentage * 100}%`
                });
                tick.innerHTML = `<div>${year}</div>
                    <div style="width: 1px; height: 5px; background-color: #9ca3af; margin: 0 auto 2px;"></div>`;
                timeScaleTicksContainer.appendChild(tick);
            }
        }
    }

    // --- 控制按鈕容器 ---
    let timelineControlsContainer = document.createElement('div');
    timelineControlsContainer.id = 'timeline-controls-container';
    Object.assign(timelineControlsContainer.style, {
        position: 'absolute',
        left: '0',        
        bottom: '10px',
        width: '25%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        zIndex: '10001'
    });
    timelineContainer.appendChild(timelineControlsContainer);

    // 依序 append 按鈕
    timelineControlsContainer.appendChild(scaleToggleButton);
    timelineControlsContainer.appendChild(highlightToggleButton);
    timelineControlsContainer.appendChild(autoPanToggleButton);
    timelineControlsContainer.appendChild(timelinePlayBtn);
    timelineControlsContainer.appendChild(timelinePauseBtn);
    if (playbackSpeedSelect) {
        playbackSpeedSelect.style.marginLeft = '0.5rem';
        timelineControlsContainer.appendChild(playbackSpeedSelect);
    }


    timelinePlayBtn.addEventListener('pointerup', () => {
        if (timelinePlayBtn.disabled) return;
        timelinePlayBtn.style.display = 'none';
        timelinePauseBtn.style.display = 'block';
        timelinePauseBtn.disabled = false;
        startTimelineInterval(); // 修正：統一用 playbackSpeed
    });

    const pauseTimeline = () => {
        if (timelinePauseBtn.disabled) return;
        timelinePauseBtn.style.display = 'none';
        timelinePlayBtn.style.display = 'block';
        timelinePlayBtn.disabled = false;
        clearInterval(timelineInterval);
        timelineInterval = null;
    };
    timelinePauseBtn.addEventListener('pointerup', pauseTimeline);

    function updateSliderScale() {
        if (isTimeScaleMode) {
            timelineSlider.min = minDate.getTime();
            timelineSlider.max = maxDate.getTime();
            timelineSlider.step = 1000 * 60 * 60 * 24;
            const currentPlacedChrono = getPlacedChrono();
            if (currentPlacedChrono && currentPlacedChrono[currentIdx]) {
                const eventDate = new Date(currentPlacedChrono[currentIdx].event.start_time);
                timelineSlider.value = eventDate.getTime();
            }
            scaleToggleButton.innerHTML = '🔢';
            scaleToggleButton.title = '切換事件索引模式';
            eventIndexTicksContainer.style.display = 'none';
            timeScaleTicksContainer.style.display = isTimelineEnabled() ? 'flex' : 'none';
        } else {
            timelineSlider.min = 0;
            timelineSlider.max = totalEvents > 0 ? totalEvents - 1 : 0;
            timelineSlider.step = 1;
            timelineSlider.value = currentIdx;
            scaleToggleButton.innerHTML = '📅';
            scaleToggleButton.title = '切換時間刻度模式';
            eventIndexTicksContainer.style.display = isTimelineEnabled() ? 'flex' : 'none';
            timeScaleTicksContainer.style.display = 'none';
        }
    }

    scaleToggleButton.addEventListener('pointerup', () => {
        isTimeScaleMode = !isTimeScaleMode;
        updateSliderScale();
    });

    // 新增：暴露 scaleToggleButton 的功能給外部呼叫
    window.timelineScaleToggle = () => {
        updateSliderScale();
    };

    highlightToggleButton.addEventListener('pointerup', onToggleHighlight);
    autoPanToggleButton.addEventListener('pointerup', onToggleAutoPan);

    return { timelineSlider, timelinePlayBtn, timelinePauseBtn, scaleToggleButton, highlightToggleButton, autoPanToggleButton };
}

window.setupTimelineSlider = setupTimelineSlider;