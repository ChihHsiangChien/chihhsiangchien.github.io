import { uiContext } from './context.js';

// --- Timeline Slider UI ---
function clearTimelineDom() {
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
}

function createTimelineControls({
    onPlay,
    onPause,
    onScaleToggle,
    onHighlightToggle,
    onAutoPanToggle,
    playbackSpeedSelect
}) {
    // Play 按鈕
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

    // Pause 按鈕
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

    // Scale 切換按鈕
    const scaleToggleButton = document.createElement('button');
    scaleToggleButton.id = 'timeline-scale-btn';
    scaleToggleButton.innerHTML = '📅';
    scaleToggleButton.title = '切換時間刻度模式';
    scaleToggleButton.className = 'ml-2 px-2 py-1 rounded border';
    scaleToggleButton.style.marginRight = '0.5rem';

    // Highlight 切換按鈕
    const highlightToggleButton = document.createElement('button');
    highlightToggleButton.id = 'timeline-highlight-btn';
    highlightToggleButton.innerHTML = '🔦';
    highlightToggleButton.title = '切換高亮模式';
    highlightToggleButton.className = 'ml-2 px-2 py-1 rounded border';
    highlightToggleButton.style.marginRight = '0.5rem';

    // AutoPan 切換按鈕
    const autoPanToggleButton = document.createElement('button');
    autoPanToggleButton.id = 'timeline-autopan-btn';
    autoPanToggleButton.innerHTML = '🎦';
    autoPanToggleButton.title = '切換自動平移';
    autoPanToggleButton.className = 'ml-2 px-2 py-1 rounded border';
    autoPanToggleButton.style.marginRight = '0.5rem';

    // 綁定事件
    timelinePlayBtn.addEventListener('pointerup', onPlay);
    timelinePauseBtn.addEventListener('pointerup', onPause);
    scaleToggleButton.addEventListener('pointerup', onScaleToggle);
    highlightToggleButton.addEventListener('pointerup', onHighlightToggle);
    autoPanToggleButton.addEventListener('pointerup', onAutoPanToggle);

    // 控制按鈕容器
    const timelineControlsContainer = document.createElement('div');
    timelineControlsContainer.id = 'timeline-controls-container';
    Object.assign(timelineControlsContainer.style, {
        position: 'absolute',
        left: '0',
        bottom: '10px',
        width: '20%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        zIndex: '10001'
    });

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

    return {
        timelineControlsContainer,
        timelinePlayBtn,
        timelinePauseBtn,
        scaleToggleButton,
        highlightToggleButton,
        autoPanToggleButton
    };
}

export function setupTimelineSlider(data, map,mapConfig, onStepHighlight, getPlacedChrono, isTimelineEnabled, onToggleHighlight, onToggleAutoPan) {
    let timelineInterval = null;
    let isTimeScaleMode = false;

    clearTimelineDom();

    // 取得現有 DOM 元素
    const timelineSlider = uiContext.timelineSlider;
    const timelineContainer = uiContext.timelineContainer;
    const playbackSpeedSelect = uiContext.playbackSpeedSelect;

    timelineSlider.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
        }
    });    

    // --- 控制按鈕建立 ---
    // 建立控制按鈕
    const controls = createTimelineControls({
        onPlay: () => {
            if (controls.timelinePlayBtn.disabled) return;
            controls.timelinePlayBtn.style.display = 'none';
            controls.timelinePauseBtn.style.display = 'block';
            controls.timelinePauseBtn.disabled = false;
            startTimelineInterval();
        },
        onPause: () => {
            if (controls.timelinePauseBtn.disabled) return;
            controls.timelinePauseBtn.style.display = 'none';
            controls.timelinePlayBtn.style.display = 'block';
            controls.timelinePlayBtn.disabled = false;
            clearInterval(timelineInterval);
            timelineInterval = null;
        },
        onScaleToggle: () => {
            const currentValue = parseInt(timelineSlider.value, 10);
            updateSliderScale(currentValue);
        },
        onHighlightToggle: onToggleHighlight,
        onAutoPanToggle: onToggleAutoPan,
        playbackSpeedSelect
    });

    timelineContainer.appendChild(controls.timelineControlsContainer);


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
    timelineSlider.style.left = '25%';
    timelineSlider.style.width = '70%'; // 或 '80%'，依需求
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

            // sliderContainer最左和最右有一段空間是slider不會用到的
            const leftPadding = 6;
            const usableWidth = sliderRect.width - 2 * leftPadding;


            // 設定tick的位置在slider上
            eventIndexTicksContainer.style.left = leftOffset + leftPadding + 'px';
            eventIndexTicksContainer.style.width = usableWidth + 'px';
            eventIndexTicksContainer.style.bottom = topOffset + 'px';
            timeScaleTicksContainer.style.left = leftOffset + leftPadding + 'px';
            timeScaleTicksContainer.style.width = usableWidth + 'px';
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
        padding: '5px 5px',
        borderRadius: '4px',
        display: 'none',
        zIndex: '10002',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        
    });
    document.body.appendChild(timelineTooltip);

    timelineSlider.addEventListener('mousemove', (e) => {
        if (!isTimelineEnabled()) return;
        // 只取得 sliderRect，不執行 updateTicksContainerLayout
        const sliderRect = timelineSlider.getBoundingClientRect();
        const timelineContainerRect = timelineContainer.getBoundingClientRect();        
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
        if (eventToShow && timelineContainerRect.top > 0) {
            const year = new Date(eventToShow.start_time).getFullYear();
            timelineTooltip.textContent = `${year}: ${eventToShow.title}`;
            timelineTooltip.style.display = 'block';

            const tooltipHeight = timelineTooltip.offsetHeight || 30; // 預設高度30，避免初次為0
            timelineTooltip.style.left = `${e.clientX}px`;
            timelineTooltip.style.top = `${timelineContainerRect.top - tooltipHeight}px`; // 頂部往上偏移
            timelineTooltip.style.transform = 'translate(-50%, 0%)';        
        } else {
            timelineTooltip.style.display = 'none';
        }        
    });
    timelineSlider.addEventListener('mouseleave', () => {
        timelineTooltip.style.display = 'none';
    });

    // 決定 slider 滑到哪個位置就切換 highlight     
    let currentIdx = 0;
    timelineSlider.oninput = (e) => {
        if (!timelineSlider.disabled) {
            if (isTimeScaleMode) {
                // 找到最接近的事件時間
                const currentTime = parseInt(timelineSlider.value, 10);
                const eventTimes = sortedEvents.map(ev => new Date(ev.start_time).getTime());
                // 找到最接近的事件
                const closestIdx = findClosestEventIndex(eventTimes, currentTime);

                timelineSlider.value = eventTimes[closestIdx]; // 強制跳到最近事件
                onStepHighlight(closestIdx, map);
            } else {
                currentIdx = parseInt(timelineSlider.value, 10);
                onStepHighlight(currentIdx, map);
            }
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
            onStepHighlight(currentIdx, map);
        }, intervalMs);
    }

    // --- Get date range for time scale mode ---
    const sortedEvents = [...data.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const minDate = sortedEvents.length > 0 ? new Date(sortedEvents[0].start_time) : new Date();
    const maxDate = sortedEvents.length > 0 ? new Date(sortedEvents[sortedEvents.length - 1].start_time) : new Date();
    const totalEvents = sortedEvents.length;
    const totalTimeSpan = maxDate.getTime() - minDate.getTime();

    // 初始化 timelineSlider 的值
    if (isTimeScaleMode) {
        timelineSlider.value = String(minDate.getTime()); // 設置為時間刻度模式的最小時間
    } else {
        timelineSlider.value = '0'; // 設置為事件索引模式的第一個索引
    }

    // 產生事件索引模式的 ticks
    eventIndexTicksContainer.innerHTML = ''; // 清空
    const thumbDiameter = 24; // 與 CSS 保持一致
    for (let i = 0; i < totalEvents; i++) {
        const percentage = i / (totalEvents - 1);
        const tick = document.createElement('div');
        Object.assign(tick.style, {
            position: 'absolute',
            left: `${percentage * 100}%`,
            
            width: '1px',
            height: '10px',
            background: '#9ca3af'
        });
        eventIndexTicksContainer.appendChild(tick);
    }

    
    const yearRanges = mapConfig.yearRanges || [];

    function getYearRangeColor(year) {
        for (const range of yearRanges) {
            if (year >= range.start && year <= range.end) {
                return range.color;
            }
        }
        return '#6b7280'; // 預設色
    }


    // 產生時間刻度背景色區塊
    if (totalTimeSpan > 0 && yearRanges.length > 0) {
        yearRanges.forEach(range => {
            // 計算區段起訖百分比
            const startDate = new Date(range.start, 0, 1);
            const endDate = new Date(range.end, 11, 31);
            const startPercent = Math.max(0, (startDate.getTime() - minDate.getTime()) / totalTimeSpan);
            const endPercent = Math.min(1, (endDate.getTime() - minDate.getTime()) / totalTimeSpan);
            const widthPercent = (endPercent - startPercent) * 100;

            // 建立背景色區塊
            const bgDiv = document.createElement('div');
            Object.assign(bgDiv.style, {
                position: 'absolute',
                left: `${startPercent * 100}%`,
                width: `${widthPercent}%`,
                top: '0',
                bottom: '0',
                background: range.color,
                opacity: '0.25',
                zIndex: '1',
                pointerEvents: 'none',
                borderRadius: '6px'
            });
            timeScaleTicksContainer.appendChild(bgDiv);
        });
    }
    
    // 產生時間刻度的 ticks 
    if (totalTimeSpan > 0) {
        const startYear = minDate.getFullYear();
        const endYear = maxDate.getFullYear();
        const yearSpan = endYear - startYear;
        let yearInterval = 1;
        if (yearSpan > 200) yearInterval = 50;
        else if (yearSpan > 100) yearInterval = 10;
        else if (yearSpan > 50) yearInterval = 10;
        else if (yearSpan > 20) yearInterval = 5;
        const firstTickYear = Math.ceil(startYear / yearInterval) * yearInterval;
        for (let year = firstTickYear; year < endYear; year += yearInterval) {
            const yearDate = new Date(year, 0, 1);
            const percentage = (yearDate.getTime() - minDate.getTime()) / totalTimeSpan;
            if (percentage > 0 && percentage < 1) {
                const tickColor = getYearRangeColor(year);
                const tick = document.createElement('div');
                Object.assign(tick.style, {
                    position: 'absolute',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#1e1f20ff',
                    left: `${percentage * 100}%`
                });
                tick.innerHTML = `<div>${year}</div>
                    <div style="width: 1px; height: 5px; background-color: #1e1f20ff; margin: 0 auto 2px;"></div>`;
                timeScaleTicksContainer.appendChild(tick);
            }
        }
    }
    
    // 產生事件刻度 紅色圓形（時間刻度模式下）
    if (totalTimeSpan > 0 && sortedEvents.length > 0) {
        sortedEvents.forEach(event => {
            const eventDate = new Date(event.start_time);
            const percentage = (eventDate.getTime() - minDate.getTime()) / totalTimeSpan;
            if (percentage >= 0 && percentage <= 1) {
                const eventTick = document.createElement('div');
                Object.assign(eventTick.style, {
                    position: 'absolute',
                    width: '8px',           // 圓形寬度
                    height: '8px',          // 圓形高度
                    left: `${percentage * 100}%`,
                    transform: 'translateX(-50%)', // 使圓形中心對齊
                    bottom: `${timeScaleTicksContainer.getBoundingClientRect().bottom + 5}px`,
                    background: '#96000061', // 可自訂顏色
                    borderRadius: '50%',    // 變成圓形
                    zIndex: '2'
                });
                timeScaleTicksContainer.appendChild(eventTick);
            }
        });
    } 
    

    function updateSliderScale(currentValue = null) {
        if (currentValue === null) {
            // 如果沒有傳入當前值，根據當前模式獲取滑塊值
            currentValue = isTimeScaleMode
                ? parseInt(timelineSlider.value, 10) // 當前時間刻度模式的時間值
                : parseInt(timelineSlider.value, 10); // 當前事件索引模式的索引值
        }

        // 切換模式
        isTimeScaleMode = !isTimeScaleMode;

        if (isTimeScaleMode) {
            // 切換到時間刻度模式
            timelineSlider.min = minDate.getTime();
            timelineSlider.max = maxDate.getTime();
            timelineSlider.step = 1000 * 60 * 60 * 24; // 一天
            if (!isNaN(currentValue)) {
                // 將索引轉換為對應的時間
                const eventTime = sortedEvents[currentValue]?.start_time
                    ? new Date(sortedEvents[currentValue].start_time).getTime()
                    : minDate.getTime();
                timelineSlider.value = String(eventTime);
            }
            controls.scaleToggleButton.innerHTML = '🔢';
            controls.scaleToggleButton.title = '切換事件索引模式';
            eventIndexTicksContainer.style.display = 'none';
            timeScaleTicksContainer.style.display = isTimelineEnabled() ? 'flex' : 'none';
        } else {
            // 切換到事件索引模式
            timelineSlider.min = 0;
            timelineSlider.max = totalEvents > 0 ? totalEvents - 1 : 0;
            timelineSlider.step = 1;
            if (!isNaN(currentValue)) {
                // 將時間轉換為對應的索引
                const closestIndex = sortedEvents.findIndex(event => {
                    const eventTime = new Date(event.start_time).getTime();
                    return eventTime >= currentValue;
                });
                timelineSlider.value = closestIndex !== -1 ? String(closestIndex) : '0';
            }
            controls.scaleToggleButton.innerHTML = '📅';
            controls.scaleToggleButton.title = '切換時間刻度模式';
            eventIndexTicksContainer.style.display = isTimelineEnabled() ? 'flex' : 'none';
            timeScaleTicksContainer.style.display = 'none';
        }
    }


    // 暴露給外部的切換功能
    window.timelineScaleToggle = () => {
        const currentValue = parseInt(timelineSlider.value, 10); // 獲取當前滑塊值
        updateSliderScale(currentValue); // 傳入當前值進行模式切換
    };

    controls.highlightToggleButton.addEventListener('pointerup', onToggleHighlight);
    controls.autoPanToggleButton.addEventListener('pointerup', onToggleAutoPan);

    //return { timelineSlider, timelinePlayBtn, timelinePauseBtn, scaleToggleButton, highlightToggleButton, autoPanToggleButton };
    return {
        timelineSlider,
        timelinePlayBtn: controls.timelinePlayBtn,
        timelinePauseBtn: controls.timelinePauseBtn,
        scaleToggleButton: controls.scaleToggleButton,
        highlightToggleButton: controls.highlightToggleButton,
        autoPanToggleButton: controls.autoPanToggleButton
    };    
}

//時間軸用左右鍵控制
export function timelineKeydownHandler(e, timelineEnabled, timelineSlider, placedChrono, highlightStep, map) {
    if (!timelineEnabled || !timelineSlider || timelineSlider.disabled || timelineSlider.style.display === 'none') return;
    if (placedChrono.length === 0) return;

    const isTimeScaleMode = timelineSlider.step && timelineSlider.step != '1';
    const eventTimes = placedChrono.map(item => new Date(item.event.start_time).getTime());
    // 只在按鍵時找一次最接近的 index，之後直接用 index ±1
    let currentIdx = 0;
    if (isTimeScaleMode) {
        currentIdx = findClosestEventIndex(eventTimes, parseInt(timelineSlider.value, 10));
    } else {
        currentIdx = parseInt(timelineSlider.value, 10);
        
    }

    if (e.key === 'ArrowLeft') {
        let idx;
        if (isTimeScaleMode) {
            // 時間刻度模式
            idx = Math.max(0, currentIdx - 1);
            while (idx > 0 && eventTimes[idx] === eventTimes[currentIdx]) {
                idx--;
            }
            timelineSlider.value = String(eventTimes[idx]);
        } else {
            // 事件索引模式
            idx = Math.max(0, currentIdx - 1);
            timelineSlider.value = String(idx);
        }
        highlightStep(idx, map);
    } else if (e.key === 'ArrowRight') {
        let idx;
        if (isTimeScaleMode) {
            // 時間刻度模式
            idx = Math.min(eventTimes.length - 1, currentIdx + 1);
            while (idx < eventTimes.length - 1 && eventTimes[idx] === eventTimes[currentIdx]) {
                idx++;
            }
            timelineSlider.value = String(eventTimes[idx]);
        } else {
            // 事件索引模式
            idx = Math.min(eventTimes.length - 1, currentIdx + 1);
            timelineSlider.value = String(idx);
        }
        highlightStep(idx, map);
    }
}

//window.setupTimelineSlider = setupTimelineSlider;
export function setupTimelineControls(data, regionColorConfig, map, currentMapConfig) {
    const getPlacedChrono = () => uiContext.placedChrono;
    const isTimelineEnabled = () => uiContext.timelineEnabled;
    const toggleHighlightMode = () => {
        uiContext.isHighlightModeEnabled = !uiContext.isHighlightModeEnabled;
        uiContext.highlightToggleButton.style.opacity = uiContext.isHighlightModeEnabled ? '1' : '0.5';
        uiContext.highlightToggleButton.title = uiContext.isHighlightModeEnabled ? '關閉高亮模式' : '開啟高亮模式';
        highlightStep(parseInt(uiContext.timelineSlider.value, 10), map);
    };
    const toggleAutoPan = () => {
        uiContext.isAutoPanEnabled = !uiContext.isAutoPanEnabled;
        uiContext.autoPanToggleButton.style.opacity = uiContext.isAutoPanEnabled ? '1' : '0.5';
        uiContext.autoPanToggleButton.title = uiContext.isAutoPanEnabled ? '關閉自動平移' : '開啟自動平移';
    };

    const controls = setupTimelineSlider(
        data, 
        map, 
        currentMapConfig, 
        highlightStep,
        getPlacedChrono, 
        isTimelineEnabled, 
        toggleHighlightMode, 
        toggleAutoPan
    );
    uiContext.timelineSlider = controls.timelineSlider;
    uiContext.timelinePlayBtn = controls.timelinePlayBtn;
    uiContext.timelinePauseBtn = controls.timelinePauseBtn;
    uiContext.scaleToggleButton = controls.scaleToggleButton;
    uiContext.highlightToggleButton = controls.highlightToggleButton;
    uiContext.autoPanToggleButton = controls.autoPanToggleButton;
}


export function highlightStep(idx, map) {
    map = map || uiContext.map;
    if (!map || typeof map.hasLayer !== 'function') return;
    
    if (!uiContext.timelineEnabled) {
        uiContext.placedChrono.forEach(item => {
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

    if (!uiContext.isHighlightModeEnabled) {
        const currentEvent = uiContext.placedChrono[idx];
        if (currentEvent && currentEvent.marker && uiContext.isAutoPanEnabled) {
            map.panTo(currentEvent.marker.getLatLng());
        }
        uiContext.placedChrono.forEach(item => {
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

    const highlightedEvent = uiContext.placedChrono[idx];
    const highlightedLocationId = highlightedEvent ? highlightedEvent.event.location_id : null;

    uiContext.placedChrono.forEach((item, i) => {
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

            if (isHighlighted && uiContext.isAutoPanEnabled) {
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


// 啟用 timeline 相關元件與按鈕
export function enableTimelineFeatures(map) {
    uiContext.timelineEnabled = true;
    if (uiContext.timelineSlider) {
        uiContext.timelineSlider.disabled = false;
        uiContext.timelineSlider.style.pointerEvents = 'auto';
        uiContext.timelineSlider.style.display = 'block';
    }

    [
        document.getElementById('timeline-ticks-container'),
        document.getElementById('timeline-controls-container')
    ].forEach((el, idx) => {
        if (el) el.style.display = idx === 0 ? 'block' : 'flex';
    });

    [
        uiContext.timelinePlayBtn,
        uiContext.timelinePauseBtn,
        uiContext.scaleToggleButton,
        uiContext.highlightToggleButton,
        uiContext.autoPanToggleButton
    ].forEach(btn => {
        if (btn) {
            btn.disabled = false;
            btn.style.pointerEvents = 'auto';
        }
    });

    highlightStep(parseInt(uiContext.timelineSlider.value, 10), map);
    window.removeEventListener('keydown', timelineKeydownProxy);
    window.addEventListener('keydown', timelineKeydownProxy);    
}


    
function timelineKeydownProxy(e) {
    timelineKeydownHandler(
        e, 
        uiContext.timelineEnabled, 
        uiContext.timelineSlider, 
        uiContext.placedChrono, 
        highlightStep,
        uiContext.map
    );
}

function findClosestEventIndex(eventTimes, targetTime) {
    let closestIdx = 0;
    let minDiff = Math.abs(eventTimes[0] - targetTime);
    for (let i = 1; i < eventTimes.length; i++) {
        const diff = Math.abs(eventTimes[i] - targetTime);
        if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
        }
    }
    return closestIdx;
}