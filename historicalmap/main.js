// 引入設定
import { uiContext } from './context.js';
import { mapsData } from './maps.config.js';
import { setupMap } from './map.js';
import { moveGhost, updateGuideLine, findClosestLocation, findCircleByLocationId, repositionMarkersAtLocation } from './map.js';
import { renderLocationsOnMap, fitMapToLocations, setupMarkerDragEvents }from './map.js';
import { updateGuideAndLastEvent } from './map.js';
import { createCard } from './card.js';
import { delay } from './utils.js';

import { adjustCardContainerHeight } from './uiController.js';
import { renderCards } from './uiController.js';
import { updateDraggableCards, updateCardCount } from './uiController.js';
import { setupSortButtons } from './uiController.js';

import {setupTimelineControls} from './timeline.js';
import {highlightStep} from './timeline.js';
import {enableTimelineKeydown} from './timeline.js';

import { checkAnswers } from './gameLogic.js';
import { handleDrop, handleNormalDrop, handleSequentialDrop } from './gameLogic.js';

document.addEventListener('DOMContentLoaded', () => {
        

    // 從 URL 讀取要顯示的地圖 ID 和模式
    const urlParams = new URLSearchParams(window.location.search);
    const mapId = urlParams.get('map') || 'chutung-history'; // 預設載入竹東地圖
    uiContext.sequentialMode = urlParams.get('mode') === 'sequential';
    const currentMapConfig = mapsData[mapId];

    if (!currentMapConfig) {
        console.error(`Map with id "${mapId}" not found in maps.config.js`);
        // 可以在此顯示錯誤訊息或載入預設地圖
        return;
    }

    // 3. 根據設定檔載入對應的資料
    fetch(currentMapConfig.dataPath)
        .then(response => response.json())
        .then(async data => {
            setupGame(data, currentMapConfig.regionColorConfig);

            const timelineContainer = document.getElementById('timeline-container');
            if (urlParams.get('mode') === 'autoplay') {
                await autoPlaceAndCollapsePanel(data, timelineContainer);
            } else {
                if (timelineContainer) timelineContainer.classList.add('hidden');
            }
        });

    // --- Map Initialization ---
    const map = setupMap('map', 'satellite');

    function injectRegionStyles(config) {
        const styleElement = document.createElement('style');
        let cssRules = '';
        for (const regionKey in config) {
            const region = config[regionKey];
            if (region.name) {
                cssRules += `
                    .location-tooltip.region-${region.name} {
                        background-color: ${region.mapBgColor};
                        border-color: ${region.borderColor};
                    }
                `;
            }
        }
        styleElement.textContent = cssRules;
        document.head.appendChild(styleElement);
    }


    // --- Game State & UI ---
    const cardContainer = document.getElementById('card-container');
    const checkAnswersBtn = document.getElementById('check-answers-btn');
    const rightPanel = document.getElementById('right-panel');
    const panelContent = document.getElementById('panel-content');
    const togglePanelBtn = document.getElementById('toggle-panel-btn');
    const toggleIcon = document.getElementById('toggle-icon');
    const mapContainer = document.getElementById('map');

    function setupGame(data, regionColorConfig) {
        uiContext.gameData = data;
        uiContext.locationsData = data.locations;
        injectRegionStyles(regionColorConfig);

        // --- 預設排序並渲染卡片 ---
        const sortedEvents = [...data.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        //eventsData = sortedEvents;
        uiContext.eventsData = sortedEvents;

        setupUiContext(regionColorConfig, sortedEvents);
        renderCards();

        setupSortButtons(regionColorConfig);
        renderLocationsOnMap(map, regionColorConfig);
        fitMapToLocations(map);

        map.on('droppable:drop', (e) => handleDrop({ ...e, map }));
        checkAnswersBtn.addEventListener('click', () => checkAnswers(uiContext.gameData, map));
        map.on('zoomend', handleZoom);

        setupTimelineControls(data, regionColorConfig,  map, currentMapConfig);

        setupPanelToggle();
    }

    // --- 拆分出的小函式 ---

    function setupUiContext(regionColorConfig, sortedEvents) {
        uiContext.cardContainer = cardContainer;
        uiContext.createCard = createCard;
        uiContext.moveGhost = moveGhost;
        uiContext.updateGuideAndLastEvent = updateGuideAndLastEvent;
        uiContext.map = map;
        uiContext.handleDropAttempt = handleDropAttempt;
        uiContext.updateDraggableCards = updateDraggableCards;
        uiContext.updateCardCount = updateCardCount;
        uiContext.regionColorConfig = regionColorConfig;
        uiContext.eventsToRender = sortedEvents;
        uiContext.currentEventIndex = 0;  
        uiContext.checkAnswersBtn = checkAnswersBtn;      
    }






    function setupPanelToggle() {
        togglePanelBtn.addEventListener('click', () => {
            const isCollapsed = rightPanel.classList.contains('w-0');
            if (isCollapsed) {
                rightPanel.classList.remove('w-0');
                rightPanel.classList.add('w-1/3');
                panelContent.classList.remove('hidden');
                mapContainer.classList.remove('w-full');
                mapContainer.classList.add('w-2/3');
                toggleIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />';
                togglePanelBtn.style.right = 'calc(33.3333vw - 1.25rem)';
            } else {
                rightPanel.classList.remove('w-1/3');
                rightPanel.classList.add('w-0');
                panelContent.classList.add('hidden');
                mapContainer.classList.remove('w-2/3');
                mapContainer.classList.add('w-full');
                toggleIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />';
                togglePanelBtn.style.right = '0.5rem';
            }
            setTimeout(() => {
                map.invalidateSize();
            }, 300);
        });
    }

    function handleDropAttempt(cardElement) {
        let successfulDrop = false;
        const lastDragEvent = uiContext.lastDragEventRef.value;

        if (lastDragEvent) {

            const mapContainer = map.getContainer();
            const mapRect = mapContainer.getBoundingClientRect();
            const mouseX = lastDragEvent.originalEvent.clientX;
            const mouseY = lastDragEvent.originalEvent.clientY;
            const droppedOnMap = mouseX >= mapRect.left && mouseX <= mapRect.right && mouseY >= mapRect.top && mouseY <= mapRect.bottom;
            
            if (droppedOnMap) {                        
                const latLng = map.mouseEventToLatLng(lastDragEvent.originalEvent);
                const closestLocation = findClosestLocation(map, latLng, uiContext.locationsData);

                if (closestLocation) {
                    const droppedOnCircle = findCircleByLocationId(map, closestLocation.location_id);
                    if (droppedOnCircle) {
                        map.fire('droppable:drop', { drop: droppedOnCircle, drag: { _element: cardElement } });
                        successfulDrop = true;
                    }
                }
            }
        }

        if (!successfulDrop) {
            if (uiContext.ghostCardRef.value) {
                L.DomUtil.remove(uiContext.ghostCardRef.value);
                uiContext.ghostCardRef.value = null;
            }
            cardElement.style.position = '';
            cardElement.style.left = '';
            cardElement.style.top = '';
            cardElement.style.transform = '';
        }
    }



    function handleZoom() {
        const locationsToUpdate = new Set(Object.values(uiContext.placedEvents).map(p => p.droppedLocationId));
        locationsToUpdate.forEach(locationId => {
            repositionMarkersAtLocation(map, locationId, uiContext.placedEvents, uiContext.gameData, uiContext.locationsData);
        });
    }


    // 遍歷所有事件，找到對應的卡片和地圖位置，然後呼叫 handleDrop，直接將卡片放到 marker 上
    function autoPlaceAndStartTimeline(data) {
        data.events.forEach(event => {
            const card = document.getElementById(event.event_id);
            if (!card) return;
            const location = uiContext.locationsData.find(loc => loc.location_id === event.location_id);
            if (!location) return;
            const circle = findCircleByLocationId(map, location.location_id);
            if (!circle) return;

            handleDrop({
                drop: circle,
                drag: { _element: card },
                map: uiContext.map
            });
        });

        checkAnswers(uiContext.gameData, map);

        setTimeout(() => {
            if (uiContext.timelinePlayBtn && !uiContext.timelinePlayBtn.disabled) {
                uiContext.timelinePlayBtn.click();
            }
        }, 800);
    }

    adjustCardContainerHeight(cardContainer, checkAnswersBtn);
    window.addEventListener('resize', () => adjustCardContainerHeight(cardContainer, checkAnswersBtn));

    // --- 簡化 autoplay mode 控制流程 ---
    async function autoPlaceAndCollapsePanel(data, timelineContainer) {

        // ...收合 panel 相關程式...
        autoPlaceAndStartTimeline(data);

        await delay(500);

        const rightPanel = document.getElementById('right-panel');
        const toggleBtn = document.getElementById('toggle-panel-btn');
        const isCollapsed = rightPanel && rightPanel.classList.contains('w-0');

        if (rightPanel && toggleBtn && !isCollapsed) {
            toggleBtn.click();
            await delay(350); // 等待收合動畫
            // 收合後主動更新 timeline ticks layout
            if (window.updateTimelineTicksLayout) window.updateTimelineTicksLayout();
            // 新增：主動執行一次 scaleToggleButton 的 function（確保 slider/ticks 位置正確）
            //if (window.timelineScaleToggle) window.timelineScaleToggle();
        }
        
        if (timelineContainer) timelineContainer.classList.remove('hidden');
        // 顯示 timelineContainer 後再主動更新一次
        if (window.updateTimelineTicksLayout) window.updateTimelineTicksLayout();
        // 再執行一次 scaleToggleButton 的 function
        if (window.timelineScaleToggle) window.timelineScaleToggle();

        enableTimelineKeydown();
 
    }

});