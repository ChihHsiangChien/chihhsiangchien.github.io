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
import { autoPlaceAndCollapsePanel } from './gameLogic.js';


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
                await autoPlaceAndCollapsePanel(data, timelineContainer, map);
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
        injectRegionStyles(regionColorConfig);


        // --- 只在一般模式插入排序區塊 ---
        //const panelContent = document.getElementById('panel-content');
        if (!uiContext.sequentialMode && !uiContext.timelineMode) {
            insertSortButtonsContainerIfNeeded(uiContext.panelContent);
        }     

   
        // --- 預設排序並渲染卡片 ---
        const sortedEvents = [...data.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        uiContext.eventsData = sortedEvents;

        setupUiContext(regionColorConfig, sortedEvents);
        renderCards();

        setupSortButtons(regionColorConfig);
        renderLocationsOnMap(map, regionColorConfig);
        fitMapToLocations(map);
        uiContext.checkAnswersBtn.addEventListener('click', () => checkAnswers(uiContext.gameData, map));

        map.on('droppable:drop', (e) => handleDrop({ ...e, map }));
        map.on('zoomend', () => handleZoom(map));
        setupTimelineControls(data, regionColorConfig,  map, currentMapConfig);
        setupPanelToggle();
    }

    function insertCategoryButtonsIfNeeded(events, panelContent) {
        // 取得所有 category（排除 undefined/null/空字串）
        const categories = Array.from(
            new Set(events.map(e => e.category).filter(c => c && c.trim()))
        );
        // 若沒有 category 欄位則不顯示
        if (categories.length === 0) return;

        // 避免重複插入
        if (document.getElementById('category-buttons-container')) return;

        const catDiv = document.createElement('div');
        catDiv.id = 'category-buttons-container';
        catDiv.className = 'p-2 flex flex-wrap gap-2 bg-white border-b';

        // "全部" 按鈕
        const allBtn = document.createElement('button');
        allBtn.textContent = '全部';
        allBtn.className = 'px-3 py-1 text-xs bg-blue-500 text-white rounded-full shadow-sm';
        allBtn.onclick = () => {
            uiContext.eventsToRender = [...uiContext.eventsData];
            renderCards();
            updateCategoryButtonStyles(allBtn);
        };
        catDiv.appendChild(allBtn);

        // 其他 category 按鈕
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.textContent = cat;
            btn.className = 'px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-full shadow-sm';
            btn.onclick = () => {
                uiContext.eventsToRender = uiContext.eventsData.filter(e => e.category === cat);
                renderCards();
                updateCategoryButtonStyles(btn);
            };
            catDiv.appendChild(btn);
        });

        // 樣式切換
        function updateCategoryButtonStyles(activeBtn) {
            catDiv.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('bg-blue-500', btn === activeBtn);
                btn.classList.toggle('text-white', btn === activeBtn);
                btn.classList.toggle('bg-gray-200', btn !== activeBtn);
                btn.classList.toggle('text-gray-700', btn !== activeBtn);
            });
        }

        // 插入到 panelContent 最上方
        panelContent.insertBefore(catDiv, panelContent.firstChild);
    }

});