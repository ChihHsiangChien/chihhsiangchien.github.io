// 引入設定
import { uiContext } from './context.js';

import { mapsData } from './maps.config.js';

import { setupMap } from './map.js';
import { moveGhost } from './map.js';
import { renderLocationsOnMap, fitMapToLocations } from './map.js';
import { updateGuideAndLastEvent } from './map.js';
import { handleZoom } from './map.js';



import { createCard } from './card.js';

import { initUiDomElements } from './uiController.js';
import { insertSortButtonsContainerIfNeeded } from './uiController.js';
import { insertCategoryButtonsIfNeeded, filterTimelineByCategories } from './uiController.js'

import { adjustCardContainerHeight } from './uiController.js';
import { renderCards } from './uiController.js';
import { updateDraggableCards, updateCardCount } from './uiController.js';
import { setupSortButtons } from './uiController.js';
import { injectRegionStyles } from './uiController.js';
import { setupPanelToggle } from './uiController.js';

import {setupTimelineControls} from './timeline.js';

import { checkAnswers } from './gameLogic.js';
import { handleDrop } from './gameLogic.js';
import { handleDropAttempt } from './gameLogic.js';
import { autoPlaceCards } from './gameLogic.js';


document.addEventListener('DOMContentLoaded', () => {
    // --- Map Initialization ---
    const map = setupMap('map', 'satellite');    
    initUiDomElements();

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
            uiContext.timelineMode = urlParams.get('mode') === 'timeline';

            setupGame(data, currentMapConfig.regionColorConfig);
            const timelineContainer = document.getElementById('timeline-container');
            if (uiContext.timelineMode) {
                await autoPlaceCards(data, timelineContainer, map);
                renderCards();                
            } else {
                if (timelineContainer) timelineContainer.classList.add('hidden');
            }

        });



    adjustCardContainerHeight(uiContext.cardContainer, uiContext.checkAnswersBtn);
    window.addEventListener('resize', () => adjustCardContainerHeight(uiContext.cardContainer, uiContext.checkAnswersBtn));        

    function setupUiContext(regionColorConfig, sortedEvents) {
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
    }   

    function setupGame(data, regionColorConfig) {
        uiContext.gameData = data;
        uiContext.locationsData = data.locations;
        const regionList = Array.from(new Set(data.locations.map(loc => loc.region || 'default')));
        injectRegionStyles(regionList);


        // --- 只在一般模式插入排序區塊 ---
        //const panelContent = document.getElementById('panel-content');
        if (!uiContext.sequentialMode && !uiContext.timelineMode) {
            insertSortButtonsContainerIfNeeded(uiContext.panelContent);
        }     

        
        // --- 預設排序並渲染卡片 ---
        const sortedEvents = [...data.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        uiContext.eventsData = sortedEvents;

        setupUiContext(regionColorConfig, sortedEvents);

        // Timeline mode: 動態產生 category 按鈕
        if (uiContext.timelineMode) {
            insertCategoryButtonsIfNeeded(data, uiContext.panelContent, regionColorConfig, map, currentMapConfig);
        }

        renderCards();

        setupSortButtons();
        renderLocationsOnMap(map);
        fitMapToLocations(map);
        uiContext.checkAnswersBtn.addEventListener('click', () => checkAnswers(uiContext.gameData, map));

        map.on('droppable:drop', (e) => handleDrop({ ...e, map }));
        map.on('zoomend', () => handleZoom(map));
        setupTimelineControls(data, map, currentMapConfig, false);
        setupPanelToggle();
    }




});