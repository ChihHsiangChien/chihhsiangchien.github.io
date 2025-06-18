/* eslint-disable no-console */
(async function() {
  // Global toggle for Markov chain functionality
  const useMarkovChains = false; // Set to false to disable all Markov chain features

  // Game Control Variables
  const MAX_EVENTS_TO_SHOW_PER_TURN = 10; // 每回合最多顯示的事件數量
  const PM25_CRISIS_THRESHOLD = 80;      // 觸發「細懸浮微粒太高」旗標的 PM2.5 閾值
  const MAX_STRATEGIES_TO_CHOOSE_PER_TURN = 5; // 每回合可選擇的策略卡數量
  const STRATEGIES_PER_PAGE = 20; // 每頁顯示的策略卡數量
  const MAX_TURNS = 5; // 遊戲最大回合數

  // Scoring Constants
  const MAX_METRIC_VALUE_PER_CATEGORY = 1000;
  const NUM_CORE_METRICS = 5; // Biodiversity, Economy, Public Trust, Climate, Social
  const MAX_POSSIBLE_METRIC_SUM = NUM_CORE_METRICS * MAX_METRIC_VALUE_PER_CATEGORY;
  const METRICS_SCORE_WEIGHT_PERCENT = 80; // 70% for metrics contribution to score
  const TURNS_SCORE_WEIGHT_PERCENT = 20;   // 30% for turns contribution to score
  const MAX_TOTAL_SCORE = 100;

  // Load data
  const moduleFiles = [
    
    //'data/modules/pollution_module.json',
    'data/modules/common_elements.json',    
    'data/modules/spoonbills_crisis.json',
    'data/modules/leopard_cat_crisis.json',
    'data/modules/forest_fire.json',
    'data/modules/green_sea_turtle_conservation.json',

    // ... 其他模組檔案
  ];
  const markovChainFile = 'data/markov_chains.json'; // 或您選擇的其他路徑

  async function loadGameData() {
    let combinedEvents = [];
    let combinedStrategies = [];

    try {
      const loadedModules = await Promise.all(
        moduleFiles.map(file => fetch(file).then(r => {
          if (!r.ok) throw new Error(`Failed to load ${file}: ${r.statusText}`);
          return r.json();
        }))
      );

      loadedModules.forEach(module => {
        if (module.events && Array.isArray(module.events)) {
          combinedEvents = combinedEvents.concat(module.events);
        }
        if (module.strategies && Array.isArray(module.strategies)) {
          combinedStrategies = combinedStrategies.concat(module.strategies);
        }
      });

      const markovChains = await fetch(markovChainFile).then(r => r.json());
      return [combinedEvents, combinedStrategies, markovChains];
    } catch (error) {
      console.error("Error loading game data:", error);
      // Handle error appropriately, e.g., show an error message to the user
      // For now, rethrow to stop execution if critical data is missing
      throw error;
    }
  }

  const [eventsArr, strategiesArr, markovChains] = await loadGameData();

  

  // Game state
  const gameState = {
    biodiversity: 1000,
    economy: 200,
    publicTrust: 500,
    climate: 500,
    social: 500,
    pm25_level: 60,
    // pm25_threshold: 65, // This was used for a flag, can be kept if still needed for other logic
    flags: {}, // Flags will be populated by Markov chain init and game events
    turn: 1,
    activeEventObjects: [], // To store currently displayed event objects
    selectedStrategies: [], // To store strategy cards selected by the player this turn
    strategyPage: 1 // Current page for strategy card selection
  };

  // Cached DOM Elements
  const DOMElements = {
    dashboard: document.getElementById('dashboard'),
    banner: document.getElementById('banner'),
    flagsPanel: document.getElementById('flags-panel'),
    selectedStrategiesDisplay: document.getElementById('selected-strategies-display'),
    cardPanel: document.getElementById('card-panel'),
    uiControlsArea: document.getElementById('ui-controls-area'),
    eventDisplayPanel: document.getElementById('event-display-panel'),
    // Pagination and Confirm buttons will be cached after creation in their setup functions
  };


  // Utils
  function clamp(v) { return Math.max(0, Math.min(1000, v)); }
  function getFlag(name) { return !!gameState.flags[name]; }
  function setFlag(name, val = true) { gameState.flags[name] = val; }
  function clearFlag(name) { delete gameState.flags[name]; }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Global effect mapping for cards
  const EFFECT_MAPPING = [
    { key: 'effect_biodiversity', label: '生多', color: 'text-green-600' },
    { key: 'effect_economy', label: '經濟', color: 'text-blue-600' },
    { key: 'effect_public_trust', label: '信任', color: 'text-purple-600' },
    { key: 'effect_climate', label: '氣候', color: 'text-orange-600' },
    { key: 'effect_social', label: '社會', color: 'text-pink-600' }
  ];

  // Map Markov chain internal names to Chinese display names
  const markovChainChineseNames = {
    "pm25_degradation": "PM2.5惡化趨勢",
    "forest_fire_impact": "森林火災衝擊狀態",
    "biodiversity_decline": "生物多樣性衰退趨勢",
    "fishery_resource_depletion": "漁業資源枯竭狀態",
    "climate_change_impact": "氣候變遷衝擊程度",
    "public_trust_erosion": "公共信任侵蝕狀態",
    "economic_fluctuation": "經濟波動狀態",
    "invasive_species_spread": "入侵物種擴散狀態"
    // Add other chain names here and their Chinese counterparts
  };

  // Markov chain next state
  function getMarkovChainState(chainName, currentState) {
    const chain = markovChains[chainName];
    if (!chain) return currentState;
    const states = chain.states;
    const idx = states.indexOf(currentState || chain.initial_state);
    if (idx < 0) return currentState;
    const probs = chain.transitions[idx];
    const rnd = Math.random();
    let acc = 0;
    for (let i = 0; i < probs.length; i++) {
      acc += probs[i];
      if (rnd < acc) return states[i];
    }
    return states[states.length - 1];
  }
  // Initialize Markov chain states in gameState.flags
  Object.keys(markovChains).forEach(chainName => {
    gameState.flags[`${chainName}_current_state`] = markovChains[chainName].initial_state;
  });


  // Markov chain state translations
  const markovStateTranslations = {
    "pm25_degradation": { "Low": "低", "Medium": "中等", "High": "高" },    
    "forest_fire_impact": { "Low": "低風險", "Medium": "中風險", "High": "高風險" }, // Corrected: removed duplicate
    "biodiversity_decline": { "Good": "良好", "Moderate": "普通", "Poor": "差" },
    "fishery_resource_depletion": { "Abundant": "豐富", "Stable": "穩定", "Declining": "減少", "Collapsed": "枯竭" },
    "climate_change_impact": { "Mild": "輕微", "Moderate": "中等", "Severe": "嚴重" },
    "public_trust_erosion": { "High": "高", "Moderate": "中等", "Low": "低" },
    "economic_fluctuation": { "Prosperous": "繁榮", "Stable": "穩定", "Recession": "衰退" },
    "invasive_species_spread": { "Contained": "受控", "Spreading": "擴散中", "Widespread": "廣泛擴散" }
  };

  // Metric descriptions
  const metricDescriptions = {
    '生物多樣性': '衡量生態系統中物種的豐富度和多樣性。高分表示健康的生態系統。',
    '經濟可行性': '反映了經濟活動的可持續性和盈利能力。高分表示經濟狀況良好。',
    '公共信任度': '代表公眾對政府和相關機構的信任程度。高分表示社會穩定，政策易於推行。',
    '氣候穩定度': '指氣候系統的穩定性和可預測性。高分表示氣候變化影響較小。',
    '社會公平': '衡量社會資源和機會分配的公平程度。高分表示社會更加平等和諧。',
    'PM2.5 等級': '空氣中細懸浮微粒（PM2.5）的濃度。數值越低表示空氣品質越好。',
    'PM2.5惡化趨勢': '預測PM2.5污染程度的短期變化趨勢。',
    '森林火災衝擊狀態': '預測的森林火災發生風險等級。',
    '生物多樣性衰退趨勢': '預測生物多樣性的變化趨勢。',
    '漁業資源枯竭狀態': '預測漁業資源的存量變化。',
    '氣候變遷衝擊程度': '預測氣候變遷帶來的影響嚴重性。',    
    '當前事件數量': '目前畫面上顯示的待處理事件卡片數量。',
    '公共信任侵蝕狀態': '預測公眾信任度的變化趨勢。',
    '經濟波動狀態': '預測整體經濟的景氣狀況。',
    '入侵物種擴散狀態': '預測外來入侵物種的擴散程度。'
  };

  // Render dashboard metrics
  function renderDashboard() {
    const metricStyles = {
      '生物多樣性': { bg: 'bg-green-100', border: 'border-green-500', labelText: 'text-green-700', valueText: 'text-green-800' },
      '經濟可行性': { bg: 'bg-blue-100', border: 'border-blue-500', labelText: 'text-blue-700', valueText: 'text-blue-800' },
      '公共信任度': { bg: 'bg-purple-100', border: 'border-purple-500', labelText: 'text-purple-700', valueText: 'text-purple-800' },
      '氣候穩定度': { bg: 'bg-orange-100', border: 'border-orange-500', labelText: 'text-orange-700', valueText: 'text-orange-800' },
      '社會公平': { bg: 'bg-pink-100', border: 'border-pink-500', labelText: 'text-pink-700', valueText: 'text-pink-800' },
      'PM2.5 等級': { bg: 'bg-gray-100', border: 'border-gray-500', labelText: 'text-gray-700', valueText: 'text-gray-800' },
      '當前事件數量': { bg: 'bg-yellow-100', border: 'border-yellow-500', labelText: 'text-yellow-700', valueText: 'text-yellow-800' },
    };

    const metrics = [
      ['生物多樣性', gameState.biodiversity, null], // label, value, originalChainName (null for base metrics)
      ['經濟可行性', gameState.economy, null],
      ['公共信任度', gameState.publicTrust, null],
      ['氣候穩定度', gameState.climate, null],
      ['社會公平', gameState.social, null],
      ['PM2.5 等級', gameState.pm25_level, null],
      ['當前事件數量', gameState.activeEventObjects.length, null]
    ];


    // Add Markov chain states to the dashboard metrics
    if (useMarkovChains) {
      Object.keys(markovChains).forEach(chainName => {
        const stateKey = `${chainName}_current_state`;
        const chineseLabel = markovChainChineseNames[chainName] || `${chainName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}狀態`; // Fallback
        metrics.push([chineseLabel, gameState.flags[stateKey], chainName]); // Store original chainName for translation lookup
      });
    }

    const defaultMetricStyle = { bg: 'bg-gray-100', border: 'border-gray-500', labelText: 'text-gray-700', valueText: 'text-gray-800' };

    DOMElements.dashboard.innerHTML = '';
    const dash = DOMElements.dashboard;
    // Set dashboard to a fixed 2-column layout
    dash.className = 'grid grid-cols-2 gap-4 p-4';

    metrics.forEach(metricItem => {
      const label = metricItem[0];
      const value = metricItem[1];
      const originalChainName = metricItem[2]; // This will be the original chainName for Markov metrics, or null/undefined

      const card = document.createElement('div');
      const styles = metricStyles[label] || defaultMetricStyle;
      // Use w-full to make the card take the full width of its grid cell.
      // Use min-h-16 to allow vertical expansion if content needs more space.
      card.className = `w-full p-2 shadow rounded-lg flex flex-col items-center ${styles.bg} border ${styles.border} min-h-16 justify-center`;

      let displayValue = value;
      // Use originalChainName for accurate translation of Markov states
      if (originalChainName && markovStateTranslations[originalChainName] && markovStateTranslations[originalChainName][value]) {
        displayValue = markovStateTranslations[originalChainName][value];
      }
      card.innerHTML = `
        <div class="flex items-center">
          <span class="text-xs ${styles.labelText} break-words text-center">${label}</span>
          <button class="info-icon ml-2 text-xs text-gray-500 hover:text-gray-700 focus:outline-none" data-metric="${label}" title="詳細說明">
          
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>
        <span class="text-lg font-bold mt-1 ${styles.valueText} break-words text-center">${displayValue}</span>
      `;
      dash.appendChild(card);

      const infoButton = card.querySelector('.info-icon');
      infoButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click if any
        const metricName = e.currentTarget.dataset.metric;
        const description = metricDescriptions[metricName] || '暫無詳細說明。';
        alert(`${metricName}：\n${description}`);
        // 您可以將 alert 替換為更美觀的模態框或提示框
      });
    });
  }

  // Render turn banner
  function renderBanner() {
    // 更新提示文字，告知玩家最多可選擇的卡片數量
    DOMElements.banner.textContent = `回合 ${gameState.turn}：請選擇最多 ${MAX_STRATEGIES_TO_CHOOSE_PER_TURN} 張策略卡 (${gameState.selectedStrategies.length} 已選)`;
  }

  // Render flag checkboxes (show Chinese labels)
  function renderFlags() {
    DOMElements.flagsPanel.innerHTML = '';
    const panel = DOMElements.flagsPanel;
    Object.entries(gameState.flags).forEach(([flag, val]) => {
      // Do not display Markov chain current states in the flags panel
      if (flag.endsWith('_current_state')) {
        return;
      }
      const text = flag; 
      const lbl = document.createElement('label');
      lbl.className = 'inline-flex items-center mr-4';
      lbl.innerHTML = `
        <input type="checkbox" class="form-checkbox" ${val ? 'checked' : ''} disabled />
        <span class="ml-2">${text}</span>
      `;
      panel.appendChild(lbl);
    });
  }

  // Render selected strategy IDs
  function renderSelectedStrategyIDs() {
    if (!DOMElements.selectedStrategiesDisplay) return; 

    DOMElements.selectedStrategiesDisplay.innerHTML = ''; // Clear previous IDs
    if (gameState.selectedStrategies.length > 0) {
      const title = document.createElement('h4');
      title.className = 'text-sm font-semibold mb-1 text-gray-700';
      title.textContent = '已選策略：';
      DOMElements.selectedStrategiesDisplay.appendChild(title);
      gameState.selectedStrategies.forEach(card => {
        const idEl = document.createElement('p');
        idEl.className = 'text-xs text-gray-600 break-all';
        idEl.textContent = card.id;
        DOMElements.selectedStrategiesDisplay.appendChild(idEl);
      });
    }
  }

  const SELECTED_STRATEGY_CLASSES = ['ring-4', 'ring-indigo-500', 'ring-offset-2']; // Highlight classes as an array

  function getAvailableStrategies() {
    return strategiesArr.filter(strategy => 
      areFlagsMet(strategy.required_flag, getFlag) && 
      !isProhibitedByFlags(strategy.prohibit_flag, getFlag));
  }
  // Render strategy choices
  function renderChoices() {
    DOMElements.cardPanel.innerHTML = '';
    const panel = DOMElements.cardPanel;
    // Set card panel to a fixed 1-column layout
    panel.className = 'grid grid-cols-1 gap-4 p-4';

    // Filter strategies:
    // - Must meet required_flag conditions
    // - Must NOT meet prohibit_flag conditions
    const availableStrategies = getAvailableStrategies();

    // Pagination logic
    const totalPages = Math.ceil(availableStrategies.length / STRATEGIES_PER_PAGE);
    gameState.strategyPage = Math.max(1, Math.min(gameState.strategyPage, totalPages || 1)); // Ensure page is within bounds
    const startIndex = (gameState.strategyPage - 1) * STRATEGIES_PER_PAGE;
    const endIndex = startIndex + STRATEGIES_PER_PAGE;
    const choices = availableStrategies.slice(startIndex, endIndex);
    choices.forEach(card => {
      const btn = document.createElement('button');
      // color-code border based on net effect (sum of all metrics)
      const net = (card.effect_biodiversity || 0) + (card.effect_economy || 0) + (card.effect_public_trust || 0) + (card.effect_climate || 0) + (card.effect_social || 0);
      const borderColor = net > 0 ? 'border-green-500' : net < 0 ? 'border-red-500' : 'border-yellow-500';      
      // Use w-full to make the card take the full width of its grid cell, remove max-w-xs.
      let baseButtonClasses = `w-full bg-indigo-50 hover:shadow-lg active:shadow-md focus:outline-none rounded-lg border ${borderColor} transition-all p-4 flex flex-col`;
      
      if (gameState.selectedStrategies.find(s => s.id === card.id)) {
        baseButtonClasses += ` ${SELECTED_STRATEGY_CLASSES.join(' ')}`;
      }
      btn.className = baseButtonClasses;
      btn.dataset.id = card.id; // Keep dataset.id for consistency if used elsewhere

      let effectsHTML = '';
      EFFECT_MAPPING.forEach(effect => {
        if (card[effect.key] !== undefined && card[effect.key] !== 0) {
          effectsHTML += `<span class="${effect.color} mr-2 whitespace-nowrap">${card[effect.key] >= 0 ? '+' : ''}${card[effect.key]} ${effect.label}</span>`;
        }
      });

      btn.innerHTML = `
        <div class="flex justify-between items-center mb-1">
          <h3 class="text-base font-semibold break-words">${card.id}</h3>
          ${(card.set_flag && card.set_flag.length > 0) ? `<button class="strategy-info-btn text-xs text-blue-500 hover:text-blue-700 focus:outline-none p-1" title="顯示旗標效果"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>` : ''}
        </div>
        ${card.description ? `<p class="text-xs text-gray-600 flex-1 mb-2 break-words">${card.description}</p>` : '<p class="mb-2">&nbsp;</p>'}
        <div class="mt-auto text-xs flex flex-wrap">
          ${effectsHTML || '<span class="text-gray-500">無立即效果</span>'}
        </div>
      `;

      btn.addEventListener('click', () => {
        const index = gameState.selectedStrategies.findIndex(s => s.id === card.id);
        if (index > -1) { // Card is already selected, so unselect it
          gameState.selectedStrategies.splice(index, 1);
          btn.classList.remove(...SELECTED_STRATEGY_CLASSES);
        } else { // Card is not selected
          if (gameState.selectedStrategies.length < MAX_STRATEGIES_TO_CHOOSE_PER_TURN) {
            gameState.selectedStrategies.push(card);
            btn.classList.add(...SELECTED_STRATEGY_CLASSES);
          } else {
            alert(`每回合最多只能選擇 ${MAX_STRATEGIES_TO_CHOOSE_PER_TURN} 張策略卡。`);
            return;
          }
        }
        renderBanner(); // Update card count in banner
        updateConfirmStrategiesButtonState();
        renderSelectedStrategyIDs();
      });


      // btn.addEventListener('click', () => chooseStrategy(card)); // OLD: single choice

      const strategyInfoBtn = btn.querySelector('.strategy-info-btn');
      if (strategyInfoBtn) {
        strategyInfoBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // 防止觸發卡片選擇
          // 'card' 變數來自外部 forEach 迴圈的作用域
          let message = "";
          if (card.set_flag && card.set_flag.length > 0) {
            message = `產生的效果: ${card.set_flag.join(', ')}`;
          } else {
            message = "此卡無設定旗標的效果。"; // 理論上按鈕不應出現於此情況
          }
          alert(message);
        });
      }
      panel.appendChild(btn);
    });
  }

  // Function to setup or get pagination controls
  function setupPaginationControls() {
    let prevButton = document.getElementById('prev-strategy-page-btn');
    let nextButton = document.getElementById('next-strategy-page-btn');
    let pageInfo = document.getElementById('strategy-page-info');

    if (!prevButton) {
      prevButton = document.createElement('button');
      prevButton.id = 'prev-strategy-page-btn';
      prevButton.textContent = '上一頁';
      prevButton.className = 'mt-2 mb-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded shadow focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
      prevButton.addEventListener('click', () => {
        if (gameState.strategyPage > 1) {
          gameState.strategyPage--;
          renderChoices();
          updatePaginationControlsState();
        }
      });
      DOMElements.uiControlsArea.appendChild(prevButton);
      DOMElements.prevStrategyPageBtn = prevButton; // Cache it
    }
    if (!pageInfo) {
      pageInfo = document.createElement('span');
      pageInfo.id = 'strategy-page-info';
      pageInfo.className = 'mt-2 mb-2 mx-2 text-sm text-gray-700';
      DOMElements.uiControlsArea.appendChild(pageInfo);
      DOMElements.strategyPageInfo = pageInfo; // Cache it
    }
    if (!nextButton) {
      nextButton = document.createElement('button');
      nextButton.id = 'next-strategy-page-btn';
      nextButton.textContent = '下一頁';
      nextButton.className = 'mt-2 mb-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded shadow focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
      nextButton.addEventListener('click', () => {
        // Calculate total pages inside the event listener to ensure it's up-to-date
        const totalAvailable = getAvailableStrategies().length;
        const totalPages = Math.ceil(totalAvailable / STRATEGIES_PER_PAGE);
        if (gameState.strategyPage < totalPages) {
          gameState.strategyPage++;
          renderChoices();
          updatePaginationControlsState();
        }
      });
      DOMElements.uiControlsArea.appendChild(nextButton);
      DOMElements.nextStrategyPageBtn = nextButton; // Cache it
    }
    updatePaginationControlsState(); // Initial state update
  }

  function updatePaginationControlsState() {
    if (!DOMElements.prevStrategyPageBtn || !DOMElements.nextStrategyPageBtn || !DOMElements.strategyPageInfo) return;

    const totalAvailable = getAvailableStrategies().length;
    const totalPages = Math.ceil(totalAvailable / STRATEGIES_PER_PAGE) || 1;

    DOMElements.prevStrategyPageBtn.disabled = gameState.strategyPage <= 1;
    DOMElements.nextStrategyPageBtn.disabled = gameState.strategyPage >= totalPages;
    DOMElements.strategyPageInfo.textContent = `第 ${gameState.strategyPage} / ${totalPages} 頁`;
  }

  // Function to setup or get the confirm strategies button
  function setupConfirmStrategiesButton() {
    // const controlsContainer = document.getElementById('ui-controls-area'); // Already cached in DOMElements.uiControlsArea
    let confirmButton = document.getElementById('confirm-strategies-btn');

    if (!confirmButton) {
      confirmButton = document.createElement('button');
      confirmButton.id = 'confirm-strategies-btn';
      confirmButton.textContent = '確認策略';
      confirmButton.className = 'mt-2 mb-2 ml-4 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded shadow focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
      confirmButton.disabled = true; // Initially disabled

      confirmButton.addEventListener('click', () => {
        // 由於 0 到 MAX_STRATEGIES_TO_CHOOSE_PER_TURN 張都是有效選擇，直接套用策略
        applySelectedStrategies();
      });
      // Insert confirm button after pagination controls if they exist, or at the end
      if (DOMElements.nextStrategyPageBtn && DOMElements.nextStrategyPageBtn.nextSibling) {
        DOMElements.uiControlsArea.insertBefore(confirmButton, DOMElements.nextStrategyPageBtn.nextSibling);
      } else {
        DOMElements.uiControlsArea.appendChild(confirmButton);
      }
      DOMElements.confirmStrategiesBtn = confirmButton; // Cache it
    }

    return confirmButton;
  }

  function updateConfirmStrategiesButtonState() {
    if (DOMElements.confirmStrategiesBtn) {
      // 按鈕應總是啟用，因為玩家可以選擇 0 張卡片並確認（即跳過選擇）
      // 卡片選擇邏輯已限制選擇數量不超過 MAX_STRATEGIES_TO_CHOOSE_PER_TURN
      DOMElements.confirmStrategiesBtn.disabled = false;
    }
  }

  // Apply effects of all selected strategies and proceed
  function applySelectedStrategies() {
    gameState.selectedStrategies.forEach(card => {
      // apply effects
      gameState.biodiversity = clamp(gameState.biodiversity + (card.effect_biodiversity || 0));
      gameState.economy = clamp(gameState.economy + (card.effect_economy || 0));
      gameState.publicTrust = clamp(gameState.publicTrust + (card.effect_public_trust || 0));
      gameState.climate = clamp(gameState.climate + (card.effect_climate || 0));
      gameState.social = clamp(gameState.social + (card.effect_social || 0));

      // Handle set_flag from strategy card
      if (card.set_flag && Array.isArray(card.set_flag)) {
        card.set_flag.forEach(flagName => setFlag(flagName));
      }
      // Handle clear_flag from strategy card
      if (card.clear_flag && Array.isArray(card.clear_flag)) {
        card.clear_flag.forEach(flagName => clearFlag(flagName));
      }

      // Handle Markov chain effects from strategy card
      if (useMarkovChains && card.markov_effects && Array.isArray(card.markov_effects)) {
        card.markov_effects.forEach(effect => {
          const chainName = effect.chain_name;
          if (markovChains[chainName]) { // Check if the chain exists
            const chain = markovChains[chainName];
            if (chain && chain.states && chain.transitions) {
              const targetColIndex = chain.states.indexOf(effect.target_col_state);
              if (targetColIndex === -1) {
                console.warn(`Markov effect error: Target state "${effect.target_col_state}" not found in chain "${chainName}".`);
                return;
              }

              const probabilityIncrease = effect.probability_increase_flat || 0;
              if (probabilityIncrease === 0) return;

              chain.transitions.forEach((row) => {
                const old_target_prob = row[targetColIndex];
                let new_target_prob = old_target_prob + probabilityIncrease;
                new_target_prob = Math.max(0, Math.min(1, new_target_prob)); // Clamp target probability

                const actual_delta_for_target = new_target_prob - old_target_prob;

                if (Math.abs(actual_delta_for_target) < 1e-9) { // Effectively no change
                  return;
                }

                row[targetColIndex] = new_target_prob;

                const sum_others_old = 1.0 - old_target_prob;
                const sum_others_new = 1.0 - new_target_prob;

                if (sum_others_old > 1e-9) { // If there was probability in other states to begin with
                  const scale_factor_for_others = sum_others_new / sum_others_old;
                  for (let i = 0; i < row.length; i++) {
                    if (i !== targetColIndex) {
                      row[i] *= scale_factor_for_others;
                    }
                  }
                } else if (sum_others_new > 1e-9) { // old_target_prob was ~1.0, new_target_prob is < 1.0. Distribute to others.
                  const num_other_states = row.length - 1;
                  if (num_other_states > 0) {
                    const amount_to_add_to_each_other = sum_others_new / num_other_states;
                    for (let i = 0; i < row.length; i++) {
                      if (i !== targetColIndex) {
                        row[i] = amount_to_add_to_each_other;
                      }
                    }
                  }
                }

                // Final normalization pass for the row to ensure sum is 1 and no negatives
                let current_row_sum = 0;
                for(let i=0; i<row.length; ++i) {
                    if(row[i] < 0) row[i] = 0; // Clamp any negatives
                    current_row_sum += row[i];
                }
                if (current_row_sum > 1e-9) {
                    for (let i = 0; i < row.length; i++) {
                        row[i] /= current_row_sum;
                    }
                } // else: if sum is 0, it's a problematic state, potentially leave as is or error.
              });
            }
          }
        });
      }
    });

    gameState.selectedStrategies = []; // Clear selected cards after applying
    renderSelectedStrategyIDs(); // Clear the display of selected IDs
    renderFlags(); // Update flag display after potential changes
    checkAndClearResolvedEvents(); // Check if any events are resolved by this strategy's effects
    // Proceed to end-of-turn processing (Markov chains, next turn)
    processEndOfTurn();
  }

  // Check for game over conditions
  function checkGameOverConditions() {
    if (gameState.turn > MAX_TURNS) {
      return `達到最大回合數 (${MAX_TURNS} 回)。`;
    }
    if (gameState.biodiversity <= 0) return "「生物多樣性」耗盡。";
    if (gameState.economy <= 0) return "「經濟可行性」崩潰。";
    if (gameState.publicTrust <= 0) return "「公共信任度」歸零。";
    if (gameState.climate <= 0) return "「氣候穩定度」失衡。";
    if (gameState.social <= 0) return "「社會公平」瓦解。";

    // 遊戲開始後 (turn > 1)，如果當前回合已無作用中事件，則遊戲結束
    // 這個檢查點應該在 processPreChoiceEvents 之後，確保 activeEventObjects 是最新的
    if (gameState.turn > 1 && gameState.activeEventObjects.length === 0) {
      return "所有當前事件已處理完畢。";
    }
    return null; // No game over condition met
  }

  // Handle game over
  function handleGameOver(reason) {
    // Calculate score
    let currentMetricSum = gameState.biodiversity + gameState.economy + gameState.publicTrust + gameState.climate + gameState.social;
    currentMetricSum = Math.max(0, currentMetricSum); // Ensure sum isn't negative

    const metricScoreContribution = (currentMetricSum / MAX_POSSIBLE_METRIC_SUM) * METRICS_SCORE_WEIGHT_PERCENT;

    let completedTurnsForScore = gameState.turn - 1; // Turns completed before game over
    if (gameState.turn > MAX_TURNS) { // Ended due to MAX_TURNS
      completedTurnsForScore = MAX_TURNS;
    }
    completedTurnsForScore = Math.max(0, completedTurnsForScore);

    const turnScoreContribution = MAX_TURNS > 0 ? (completedTurnsForScore / MAX_TURNS) * TURNS_SCORE_WEIGHT_PERCENT : 0;

    let finalScore = Math.round(metricScoreContribution + turnScoreContribution);
    finalScore = Math.max(0, Math.min(MAX_TOTAL_SCORE, finalScore)); // Clamp score

    // Hide main game UI elements
    const mainHeader = document.getElementById('main-header');
    if (mainHeader) mainHeader.classList.add('hidden');
    
    const mainGameArea = document.getElementById('main-game-area');
    if (mainGameArea) mainGameArea.classList.add('hidden');

    // Display game over screen
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameOverReasonEl = document.getElementById('game-over-reason');
    const gameOverScoreEl = document.getElementById('game-over-score');
    const restartButton = document.getElementById('restart-game-btn');

    if (gameOverReasonEl) gameOverReasonEl.textContent = `原因：${reason}`;
    if (gameOverScoreEl) gameOverScoreEl.textContent = `您的治理分數為：${finalScore}`;
    if (gameOverScreen) gameOverScreen.classList.remove('hidden');

    if (restartButton) {
      restartButton.addEventListener('click', () => {
        window.location.reload(); // Simple way to restart
      });
    }
  }
  /**
   * Evaluates a flag condition (string, array, or object with 'and'/'or').
   * @param {*} condition The condition to evaluate.
   * @param {function} getFlagFunc Function to get a flag's status (e.g., getFlag).
   * @param {'AND' | 'OR'} implicitArrayMode Defines how a plain array of flags is treated ('AND' or 'OR').
   *                                        Also influences the return value for null/undefined conditions.
   * @returns {boolean} True if the condition is met, false otherwise.
   */
  function evaluateFlagCondition(condition, getFlagFunc, implicitArrayMode = 'AND') {
    if (condition === null || condition === undefined) {
      // For AND-like logic (e.g., requirements), no condition means "met" (true).
      // For OR-like logic (e.g., prohibitions), no condition means "not met" (false).
      return implicitArrayMode === 'AND';
    }

    if (typeof condition === 'string') {
      return getFlagFunc(condition);
    } else if (Array.isArray(condition)) {
      if (condition.length === 0) {
        return implicitArrayMode === 'AND'; // Empty array: true for AND, false for OR
      }
      return implicitArrayMode === 'AND' ?
        condition.every(flagName => getFlagFunc(flagName)) :
        condition.some(flagName => getFlagFunc(flagName));
    } else if (typeof condition === 'object') {
      if (condition.and && Array.isArray(condition.and)) {
        // AND: true if all flags are true. Empty array is true.
        return condition.and.every(flagName => getFlagFunc(flagName));
      } else if (condition.or && Array.isArray(condition.or)) {
        // OR: true if at least one flag is true. Empty array is false.
        return condition.or.some(flagName => getFlagFunc(flagName));
      } else if (condition.nand && Array.isArray(condition.nand)) {
        // NAND: true if not all flags are true (i.e., at least one is false). Empty array is false (NOT (AND([])) = NOT(true) = false).
        if (condition.nand.length === 0) return false; // No elements to be false, so AND would be true, NAND false.
        return !condition.nand.every(flagName => getFlagFunc(flagName));
      } else if (condition.nor && Array.isArray(condition.nor)) {
        // NOR: true if all flags are false (i.e., not even one is true). Empty array is true (NOT (OR([])) = NOT(false) = true).
        return !condition.nor.some(flagName => getFlagFunc(flagName));
      } else if (condition.xor && Array.isArray(condition.xor)) {
        // XOR: true if an odd number of flags are true. Empty array is false (0 true flags is even).
        if (condition.xor.length === 0) return false;
        const trueCount = condition.xor.filter(flagName => getFlagFunc(flagName)).length;
        return trueCount % 2 === 1;
      } else if (condition.xnor && Array.isArray(condition.xnor)) {
        // XNOR: true if an even number of flags are true. Empty array is true (0 true flags is even).
        // Also true if all flags have the same truth value (all true or all false for 2+ inputs).
        // For 0 inputs, it's true (0 is even).
        // For 1 input {"xnor": ["A"]}, it's true if A is false (0 true if A is false, 1 true if A is true). This is NOT A.
        // Let's stick to "even number of true flags".
        const trueCount = condition.xnor.filter(flagName => getFlagFunc(flagName)).length;
        return trueCount % 2 === 0;
      }
      // console.warn("Unrecognized flag condition object:", condition);
      return false; // Malformed object: condition not met.
    }
    // console.warn("Unrecognized type for flag condition:", condition);
    return false; // Unrecognized type: condition not met.
  }

  // Wrapper for required_flag logic
  function areFlagsMet(condition, getFlagFunc) {
    return evaluateFlagCondition(condition, getFlagFunc, 'AND');
  }

  // Wrapper for prohibit_flag logic
  function isProhibitedByFlags(condition, getFlagFunc) {
    return evaluateFlagCondition(condition, getFlagFunc, 'OR');
  }

  // Check event conditions
  function shouldTrigger(event) {
    // Check required flags
    if (!areFlagsMet(event.required_flag, getFlag)) return false;
    // Check prohibit flags
    if (isProhibitedByFlags(event.prohibit_flag, getFlag)) return false;

    return !event.trigger_flag || getFlag(event.trigger_flag);
  }

  // Process events that occur before player makes a choice
  function processPreChoiceEvents(callbackAfterEventsHandled) {
    // Check pollution flag based on current gameState
    // PM25_CRISIS_THRESHOLD is now a global constant
    if (gameState.pm25_level > PM25_CRISIS_THRESHOLD) {      setFlag('細懸浮微粒太高');
      renderFlags(); // Update flag display immediately
    } else {
      if (getFlag('細懸浮微粒太高')) { // Only clear and re-render if it was set
        clearFlag('細懸浮微粒太高');
        renderFlags(); // Update flag display immediately
      }
    }
    const triggeredEventsThisTurn = [];
    eventsArr.forEach(evt => {
      if (shouldTrigger(evt)) {
        triggeredEventsThisTurn.push(evt);
      }
    });

    // DOMElements.eventDisplayPanel and DOMElements.uiControlsArea are already cached

    if (triggeredEventsThisTurn.length > 0) {
      let eventsToActuallyShow = triggeredEventsThisTurn;
      if (triggeredEventsThisTurn.length > MAX_EVENTS_TO_SHOW_PER_TURN) {
        // 如果觸發的事件多於上限，則隨機選取
        // 先洗牌，再取前 MAX_EVENTS_TO_SHOW_PER_TURN 個
        eventsToActuallyShow = shuffle(triggeredEventsThisTurn).slice(0, MAX_EVENTS_TO_SHOW_PER_TURN);
      }

      // 使用篩選後或隨機選取後的事件列表來渲染
      renderEventCards(eventsToActuallyShow, () => {
        // This inner callback is from renderEventCards' acknowledge button.
        // Event display and ack button are hidden by renderEventCards.
        callbackAfterEventsHandled(); // Proceed to show banner/choices.
      });
    } else {
      // No events, hide event-specific UI (if it was somehow visible) and proceed.
      // 確保如果沒有事件顯示，activeEventObjects 也被清空
      gameState.activeEventObjects = [];
      renderDashboard(); // Update dashboard to show 0 events
      DOMElements.eventDisplayPanel.classList.add('hidden');
      // Ensure ack button is not present if no events
      const existingAckButton = DOMElements.uiControlsArea.querySelector('#acknowledge-all-events-btn');
      if (existingAckButton) existingAckButton.remove();

      callbackAfterEventsHandled(); // Proceed to show banner/choices.
    }
  }

  // Renders event cards and an acknowledge button
  function renderEventCards(eventsToDisplay, onAllEventsAcknowledgedCallback) {
    DOMElements.eventDisplayPanel.innerHTML = ''; 
    const panel = DOMElements.eventDisplayPanel;

    // Remove previous ack button if any, before creating a new one
    const oldAckButton = DOMElements.uiControlsArea.querySelector('#acknowledge-all-events-btn');
    if (oldAckButton) oldAckButton.remove();

    if (!eventsToDisplay || eventsToDisplay.length === 0) {
        gameState.activeEventObjects = []; // Ensure it's empty if no events
        renderDashboard(); // Update dashboard to show 0 events if called with no events
        panel.classList.add('hidden');
        // Ensure ack button is not present if no events (already handled by removal above)
        if (onAllEventsAcknowledgedCallback) onAllEventsAcknowledgedCallback();
        return;
    }

    gameState.activeEventObjects = [...eventsToDisplay]; // Store active events
    renderDashboard(); // Update dashboard with the correct count of presented events

    panel.classList.remove('hidden'); // Show the panel


    eventsToDisplay.forEach(evt => {
      const cardEl = document.createElement('div');
      // Changed event card color to amber
      cardEl.className = 'bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 shadow-md mb-2';
      cardEl.dataset.eventId = evt.id; // Add data-event-id for later removal

      let effectsHTML = '';
      EFFECT_MAPPING.forEach(effect => {
        if (evt[effect.key] !== undefined && evt[effect.key] !== 0) {
          effectsHTML += `<span class="${effect.color} mr-2 whitespace-nowrap">${evt[effect.key] >= 0 ? '+' : ''}${evt[effect.key]} ${effect.label}</span>`;
        }
      });

      cardEl.innerHTML = `
        <div class="flex">
          <div class="py-1"><svg class="fill-current h-6 w-6 text-amber-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM9 11v2h2v-2H9zm0-4v2h2V7H9z"/></svg></div>
          <div>
            <div class="flex justify-between items-center">
              <p class="font-bold">${evt.id}</p>
              ${evt.disappears_if_flag_set ? `<button class="event-info-btn text-xs text-amber-700 hover:text-amber-900 focus:outline-none p-1" title="顯示消除條件"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>` : ''}
            </div>
            ${evt.description ? `<p class="text-sm mb-1">${evt.description}</p>` : ''}
            <div class="mt-1 text-xs flex flex-wrap">
            ${effectsHTML || '<span class="text-gray-500">無立即效果</span>'}
            </div>
          </div>
        </div>
      `;
      panel.appendChild(cardEl);

      const eventInfoBtn = cardEl.querySelector('.event-info-btn');
      if (eventInfoBtn) {
        eventInfoBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          // 'evt' 變數來自外部 forEach 迴圈的作用域
          let message = "";
          const condition = evt.disappears_if_flag_set;
          if (condition) {
            if (typeof condition === 'string') {
              message = `消除所需的條件: ${condition}`;
            } else if (typeof condition === 'object') {
              if (condition.and && Array.isArray(condition.and)) {
                message = `消除所需的條件 (AND): ${condition.and.join(' 且 ')}`;
              } else if (condition.or && Array.isArray(condition.or)) {
                message = `消除所需的條件 (OR): ${condition.or.join(' 或 ')}`;
              } else {
                message = "此事件消除條件格式無法識別。";
              }
            }
          } else { // No disappears_if_flag_set defined
            message = "此事件無特定旗標消除條件。"; // 理論上按鈕不應出現於此情況
          }
          alert(message);
        });
      }
    });

    const ackButton = document.createElement('button');
    ackButton.id = 'acknowledge-all-events-btn';
    ackButton.className = 'mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50';
    ackButton.textContent = '確認並繼續';
    
    ackButton.onclick = () => {
      eventsToDisplay.forEach(evt => {
        if (evt.hasOwnProperty('effect_biodiversity')) gameState.biodiversity = clamp(gameState.biodiversity + evt.effect_biodiversity);
        if (evt.hasOwnProperty('effect_economy')) gameState.economy = clamp(gameState.economy + evt.effect_economy);
        if (evt.hasOwnProperty('effect_public_trust')) gameState.publicTrust = clamp(gameState.publicTrust + evt.effect_public_trust);
        if (evt.hasOwnProperty('effect_climate')) gameState.climate = clamp(gameState.climate + evt.effect_climate);
        if (evt.hasOwnProperty('effect_social')) gameState.social = clamp(gameState.social + evt.effect_social);

        // Handle set_flag for events
        if (evt.set_flag && Array.isArray(evt.set_flag)) {
            evt.set_flag.forEach(flagName => setFlag(flagName));
        }
        // Handle clear_flag for events
        if (evt.clear_flag && Array.isArray(evt.clear_flag)) {
            evt.clear_flag.forEach(flagName => clearFlag(flagName));
        }
      });
      
      renderDashboard();
      renderFlags();

      // Keep event cards visible after acknowledgement
      // panel.innerHTML = ''; // Do not clear the event cards
      // panel.classList.add('hidden'); // Do not hide the panel
      ackButton.remove(); // Remove the button itself
      // The ackButtonContainer div remains in the layout, empty, until next turn's cleanup.

      if (onAllEventsAcknowledgedCallback) onAllEventsAcknowledgedCallback();
    };    
    DOMElements.uiControlsArea.appendChild(ackButton);
  }

  // Check and clear events based on gameState conditions
  function checkAndClearResolvedEvents() {
    let eventsWereModifiedThisCheck = false; // To track if any event card was actually removed

    const remainingActiveEvents = [];
    gameState.activeEventObjects.forEach(event => {
      let shouldDisappear = false;
      const flagCondition = event.disappears_if_flag_set;

      if (flagCondition) {
        // For disappears_if_flag_set, an empty array or null/undefined condition means it does NOT disappear.
        // The 'AND' mode for evaluateFlagCondition handles this correctly if flagCondition is an array or object.
        // If flagCondition is a string, it's evaluated directly.
        if (evaluateFlagCondition(flagCondition, getFlag, 'AND')) {
          shouldDisappear = true;
        }
      }
      if (!shouldDisappear && event.disappears_if_flag_not_set && !getFlag(event.disappears_if_flag_not_set)) {
        shouldDisappear = true;
      }
      if (!shouldDisappear && event.disappears_if_metric_below) {
        const metricName = Object.keys(event.disappears_if_metric_below)[0];
        const threshold = event.disappears_if_metric_below[metricName];
        if (gameState[metricName] !== undefined && gameState[metricName] < threshold) {
          shouldDisappear = true;
        }
      }
      if (!shouldDisappear && event.disappears_if_metric_above) {
        const metricName = Object.keys(event.disappears_if_metric_above)[0];
        const threshold = event.disappears_if_metric_above[metricName];
        if (gameState[metricName] !== undefined && gameState[metricName] > threshold) {
          shouldDisappear = true;
        }
      }

      if (shouldDisappear) {
        const eventCardElement = DOMElements.eventDisplayPanel.querySelector(`[data-event-id="${event.id}"]`);
        if (eventCardElement) {
          eventCardElement.remove();
        }
        eventsWereModifiedThisCheck = true;
        // Do not add to remainingActiveEvents, it's being removed
      } else {
        remainingActiveEvents.push(event); // Keep in activeEventObjects
      }
    });

    gameState.activeEventObjects = remainingActiveEvents;

    // If the panel is now empty of children (because all were removed)
    // and events were indeed modified during this specific check, and no active events remain.
    if (DOMElements.eventDisplayPanel.children.length === 0 && eventsWereModifiedThisCheck && gameState.activeEventObjects.length === 0) {
      DOMElements.eventDisplayPanel.classList.add('hidden');
    }
    if (eventsWereModifiedThisCheck) {
      renderDashboard(); // Update dashboard for event count if events were removed
    }
  }

  // Post-choice processing, Markov effects, and advancing to new turn
  function processEndOfTurn() {
    if (useMarkovChains) {
      // Process all Markov chains
      Object.keys(markovChains).forEach(chainName => {
        const currentStateKey = `${chainName}_current_state`;
        const currentState = gameState.flags[currentStateKey];
        const newState = getMarkovChainState(chainName, currentState);
        gameState.flags[currentStateKey] = newState;

        // Apply specific game logic based on new states for relevant chains
        if (chainName === 'pm25_degradation') {
          if (newState === 'High') gameState.pm25_level = clamp(gameState.pm25_level + randomInt(5,10));
          else if (newState === 'Medium') gameState.pm25_level = clamp(gameState.pm25_level + randomInt(-5,5));
          else if (newState === 'Low') gameState.pm25_level = clamp(gameState.pm25_level + randomInt(-5,-1));
        } else if (chainName === 'forest_fire_impact') {
          if (newState === 'High') {
            gameState.climate = clamp(gameState.climate + randomInt(5,10)); // Example: High fire risk worsens climate
            gameState.biodiversity = clamp(gameState.biodiversity + randomInt(-5,5)); // Example: Biodiversity might be affected
            gameState.economy = clamp(gameState.economy + randomInt(-5,-1)); // Example: Economy might be affected
          }
        }
        // Add more else if blocks here for other chains that directly affect core metrics
      });
    }
    // next turn
    checkAndClearResolvedEvents(); // Check if any events are resolved by Markov chain effects
    gameState.turn++;
    gameState.strategyPage = 1; // Reset to first page of strategies for the new turn
    startTurnSequence(); // Start the next turn's sequence
  }

  // Main function to start a turn's sequence
  function startTurnSequence() {
    setupPaginationControls(); // Setup/get pagination buttons
    // Confirm button is also cached via DOMElements.confirmStrategiesBtn after setup
    const confirmStrategiesButton = setupConfirmStrategiesButton();

    // Clear state for the new turn FIRST
    gameState.activeEventObjects = []; // Clear active events from previous turn
    gameState.selectedStrategies = []; // Clear selected strategies for the new turn
    gameState.strategyPage = 1; // Reset to first page for new turn
    
    // Render initial state of UI elements for the new turn
    renderDashboard(); // Now uses the cleared activeEventObjects, so count is 0.
    renderFlags();
    renderSelectedStrategyIDs(); // Clear the display of selected IDs

    // Prepare UI panels
    DOMElements.cardPanel.classList.add('hidden');
    DOMElements.banner.classList.add('hidden');
    DOMElements.eventDisplayPanel.classList.add('hidden'); 
    DOMElements.eventDisplayPanel.innerHTML = ''; // Clear event cards from previous turn

    // Clear previous ack button from uiControlsArea
    const existingAckButton = DOMElements.uiControlsArea.querySelector('#acknowledge-all-events-btn');
    if (existingAckButton) existingAckButton.remove();

    // Hide pagination and confirm buttons initially
    if (DOMElements.prevStrategyPageBtn) DOMElements.prevStrategyPageBtn.classList.add('hidden');
    if (DOMElements.nextStrategyPageBtn) DOMElements.nextStrategyPageBtn.classList.add('hidden');
    if (DOMElements.strategyPageInfo) DOMElements.strategyPageInfo.classList.add('hidden');
    if (DOMElements.confirmStrategiesBtn) DOMElements.confirmStrategiesBtn.classList.add('hidden');

    processPreChoiceEvents(() => {
      // Check for game over conditions AFTER events for the turn are processed and their effects applied
      // Also, checkAndClearResolvedEvents might have run, so activeEventObjects is up-to-date.
      const gameOverReason = checkGameOverConditions();
      if (gameOverReason) {
        handleGameOver(gameOverReason); // This will hide main game area
        return; // Stop further turn processing
      }

      DOMElements.banner.classList.remove('hidden');
      DOMElements.cardPanel.classList.remove('hidden');
      renderBanner();
      renderChoices(); // This will also update pagination state internally
      if (DOMElements.prevStrategyPageBtn) DOMElements.prevStrategyPageBtn.classList.remove('hidden');
      if (DOMElements.nextStrategyPageBtn) DOMElements.nextStrategyPageBtn.classList.remove('hidden');
      if (DOMElements.strategyPageInfo) DOMElements.strategyPageInfo.classList.remove('hidden');
      updatePaginationControlsState(); // Explicitly update after choices are rendered
      renderFlags();
      if (DOMElements.confirmStrategiesBtn) DOMElements.confirmStrategiesBtn.classList.remove('hidden');
      updateConfirmStrategiesButtonState(); // Ensure confirm button is correctly enabled/disabled
    });
  }

  // Initialize
  startTurnSequence();
})();