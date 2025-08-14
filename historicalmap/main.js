// 引入設定
import { uiContext } from './context.js';

import { mapsData } from './maps.config.js';

import { setupMap } from './map.js';
import { moveGhost,  } from './map.js';
import { renderLocationsOnMap, fitMapToLocations }from './map.js';
import { updateGuideAndLastEvent } from './map.js';
import { handleZoom } from './map.js';

import { createCard } from './card.js';

import { adjustCardContainerHeight } from './uiController.js';
import { renderCards } from './uiController.js';
import { updateDraggableCards, updateCardCount } from './uiController.js';
import { setupSortButtons } from './uiController.js';
import { injectRegionStyles } from './uiController.js';
import { setupPanelToggle } from './uiController.js';

import {setupTimelineControls} from './timeline.js';

import { checkAnswers } from './gameLogic.js';
import { handleDrop,} from './gameLogic.js';
import { handleDropAttempt } from './gameLogic.js';
import { autoPlaceAndCollapsePanel } from './gameLogic.js';


document.addEventListener('DOMContentLoaded', () => {
    // 從 URL 讀取要顯示的地圖 ID 和模式
    const urlParams = new URLSearchParams(window.location.search);
    const mapId = urlParams.get('map') || 'chutung-history'; // 預設載入竹東地圖
    uiContext.sequentialMode = urlParams.get('mode') === 'sequential';
    const currentMapConfig = mapsData[mapId];

    if (!currentMapConfig) {
        console.error(`Map with id "${mapId}" not found in maps.config.js`);
        return;
    }

    // 根據設定檔載入對應的資料
    fetch(currentMapConfig.dataPath)
        .then(response => response.json())
        .then(async data => {
            setupGame(data, currentMapConfig.regionColorConfig);

            const timelineContainer = document.getElementById('timeline-container');
            if (urlParams.get('mode') === 'autoplay') {
                await autoPlaceAndCollapsePanel(data, timelineContainer, map);
            } else {
                if (timelineContainer) timelineContainer.classList.add('hidden');
            }
        });

    // --- Map Initialization ---
    const map = setupMap('map', 'satellite');

    // --- Game State & UI ---
    const cardContainer = document.getElementById('card-container');
    const checkAnswersBtn = document.getElementById('check-answers-btn');
    const togglePanelBtn = document.getElementById('toggle-panel-btn');
    const rightPanel = document.getElementById('right-panel');
    const panelContent = document.getElementById('panel-content');
    const mapContainer = document.getElementById('map');
    const toggleIcon = document.getElementById('toggle-icon'); 

    function setupUiContext(regionColorConfig, sortedEvents) {
        uiContext.cardContainer = cardContainer;
        uiContext.togglePanelBtn = togglePanelBtn;
        uiContext.rightPanel = rightPanel;
        uiContext.panelContent = panelContent;
        uiContext.mapContainer = mapContainer;
        uiContext.toggleIcon = toggleIcon;
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
    function setupGame(data, regionColorConfig) {
        uiContext.gameData = data;
        uiContext.locationsData = data.locations;
        injectRegionStyles(regionColorConfig);

        // --- 預設排序並渲染卡片 ---
        const sortedEvents = [...data.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        uiContext.eventsData = sortedEvents;

        setupUiContext(regionColorConfig, sortedEvents);
        renderCards();

        setupSortButtons(regionColorConfig);
        renderLocationsOnMap(map, regionColorConfig);
        fitMapToLocations(map);

        map.on('droppable:drop', (e) => handleDrop({ ...e, map }));
        checkAnswersBtn.addEventListener('click', () => checkAnswers(uiContext.gameData, map));
        map.on('zoomend', () => handleZoom(map));
        setupTimelineControls(data, regionColorConfig,  map, currentMapConfig);
        setupPanelToggle();
    }


    adjustCardContainerHeight(cardContainer, checkAnswersBtn);
    window.addEventListener('resize', () => adjustCardContainerHeight(cardContainer, checkAnswersBtn));
});