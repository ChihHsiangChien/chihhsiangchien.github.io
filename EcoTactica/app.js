/* eslint-disable no-console */
(async function() {
  // Load data
  const moduleFiles = [
    
    //'data/modules/pollution_module.json',
    'data/modules/common_elements.json',    
    'data/modules/spoonbills_crisis.json',
    'data/modules/forest_fire.json',
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
    biodiversity: 50,
    economy: 50,
    publicTrust: 50,
    climate: 50,
    social: 50,
    pm25_level: 60,
    // pm25_threshold: 65, // This was used for a flag, can be kept if still needed for other logic
    flags: {
      // Initialize current states for all Markov chains
      // ...gameState.flags, // Keep any existing flags
      // Object.keys(markovChains).reduce((acc, chainName) => {
      //   acc[`${chainName}_current_state`] = markovChains[chainName].initial_state;
      //   return acc;
      // }, {})
    },
    turn: 1,
    activeEventObjects: [] // To store currently displayed event objects
  };

  // Utils
  function clamp(v) { return Math.max(0, Math.min(100, v)); }
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
    "forest_fire_impact": { "Low": "低", "Medium": "中等", "High": "高" },
    // Add other chains here if needed
    "forest_fire_impact": { "Low": "低風險", "Medium": "中風險", "High": "高風險" },
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
      'PM2.5 等級': { bg: 'bg-gray-100', border: 'border-gray-500', labelText: 'text-gray-700', valueText: 'text-gray-800' }
    };

    const metrics = [
      ['生物多樣性', gameState.biodiversity, null], // label, value, originalChainName (null for base metrics)
      ['經濟可行性', gameState.economy, null],
      ['公共信任度', gameState.publicTrust, null],
      ['氣候穩定度', gameState.climate, null],
      ['社會公平', gameState.social, null],
      ['PM2.5 等級', gameState.pm25_level, null]
    ];


    // Add Markov chain states to the dashboard metrics
    Object.keys(markovChains).forEach(chainName => {
      const stateKey = `${chainName}_current_state`;
      const chineseLabel = markovChainChineseNames[chainName] || `${chainName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}狀態`; // Fallback
      metrics.push([chineseLabel, gameState.flags[stateKey], chainName]); // Store original chainName for translation lookup
    });

    const defaultMetricStyle = { bg: 'bg-gray-100', border: 'border-gray-500', labelText: 'text-gray-700', valueText: 'text-gray-800' };

    const dash = document.getElementById('dashboard');
    dash.innerHTML = '';
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
    const banner = document.getElementById('banner');
    banner.textContent = `回合 ${gameState.turn}：請選擇一張策略卡`;
  }

  // Render flag checkboxes (show Chinese labels)
  function renderFlags() {
    const panel = document.getElementById('flags-panel');
    panel.innerHTML = '';
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

  // Render strategy choices
  function renderChoices() {
    const panel = document.getElementById('card-panel');
    panel.innerHTML = '';
    // Set card panel to a fixed 1-column layout
    panel.className = 'grid grid-cols-1 gap-4 p-4';

    // Filter strategies: do not show if prohibit_flag conditions are met
    const availableStrategies = strategiesArr.filter(strategy => {
      if (strategy.prohibit_flag && Array.isArray(strategy.prohibit_flag) && strategy.prohibit_flag.length) {
        return !strategy.prohibit_flag.some(f => getFlag(f));
      }
      return true; // No prohibit_flag or empty, so it's available
    });
    const choices = shuffle(availableStrategies).slice(0, 3);
    choices.forEach(card => {
      const btn = document.createElement('button');
      // color-code border based on net effect (sum of all metrics)
      const net = card.effect_biodiversity + card.effect_economy + card.effect_public_trust + card.effect_climate + card.effect_social;
      const borderColor = net > 0 ? 'border-green-500' : net < 0 ? 'border-red-500' : 'border-yellow-500';      
      // Use w-full to make the card take the full width of its grid cell, remove max-w-xs.
      btn.className = `w-full bg-indigo-50 hover:shadow-lg active:shadow-md focus:outline-none rounded-lg border ${borderColor} transition-all p-4 flex flex-col`;
      btn.dataset.id = card.id; // Keep dataset.id for consistency if used elsewhere

      let effectsHTML = '';
      EFFECT_MAPPING.forEach(effect => {
        if (card[effect.key] !== undefined && card[effect.key] !== 0) {
          effectsHTML += `<span class="${effect.color} mr-2 whitespace-nowrap">${card[effect.key] >= 0 ? '+' : ''}${card[effect.key]} ${effect.label}</span>`;
        }
      });

      btn.innerHTML = `
        <h3 class="text-base font-semibold mb-2 break-words">${card.id}</h3>
        
        ${card.description ? `<p class="text-xs text-gray-600 flex-1 mb-2 break-words">${card.description}</p>` : '<p class="mb-2">&nbsp;</p>'}

        <div class="mt-auto text-xs flex flex-wrap">
          ${effectsHTML || '<span class="text-gray-500">無立即效果</span>'}
        </div>
      `;
      btn.addEventListener('click', () => chooseStrategy(card));
      panel.appendChild(btn);
    });
  }

  // Function to setup or get the shuffle button
  function setupShuffleStrategiesButton() {
    const controlsContainer = document.getElementById('ui-controls-area');
    let shuffleButton = document.getElementById('shuffle-strategies-btn');

    if (!shuffleButton) {
      shuffleButton = document.createElement('button');
      shuffleButton.id = 'shuffle-strategies-btn';
      shuffleButton.textContent = '策略卡洗牌';
      shuffleButton.className = 'mt-2 mb-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded shadow focus:outline-none'; // Basic styling
      
      shuffleButton.addEventListener('click', () => {
        // Simply re-render the choices. This will shuffle and pick new cards.
        renderChoices();
      });

      controlsContainer.appendChild(shuffleButton);
    }
    return shuffleButton;
  }

  // Apply strategy effects and proceed
  function chooseStrategy(card) {
    // apply effects
    gameState.biodiversity = clamp(gameState.biodiversity + (card.effect_biodiversity || 0));
    gameState.economy = clamp(gameState.economy + (card.effect_economy || 0));
    gameState.publicTrust = clamp(gameState.publicTrust + (card.effect_public_trust || 0));
    gameState.climate = clamp(gameState.climate + (card.effect_climate || 0));
    gameState.social = clamp(gameState.social + (card.effect_social || 0)); // Already correctly handles undefined

    // Handle set_flag from strategy card
    if (card.set_flag && Array.isArray(card.set_flag)) {
      card.set_flag.forEach(flagName => setFlag(flagName));
    }
    // Handle clear_flag from strategy card
    if (card.clear_flag && Array.isArray(card.clear_flag)) {
      card.clear_flag.forEach(flagName => clearFlag(flagName));
    }

    // Handle Markov chain effects from strategy card
    if (card.markov_effects && Array.isArray(card.markov_effects)) {
      card.markov_effects.forEach(effect => {
        const chain = markovChains[effect.chain_name];
        if (chain && chain.states && chain.transitions) {
          const targetColIndex = chain.states.indexOf(effect.target_col_state);
          if (targetColIndex === -1) {
            console.warn(`Markov effect error: Target state "${effect.target_col_state}" not found in chain "${effect.chain_name}".`);
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
      });
    }

    renderFlags(); // Update flag display after potential changes
    checkAndClearResolvedEvents(); // Check if any events are resolved by this strategy's effects
    // Proceed to end-of-turn processing (Markov chains, next turn)
    processEndOfTurn();
  }

  // Check event conditions
  function shouldTrigger(event) {
    if (event.required_flag && Array.isArray(event.required_flag) && event.required_flag.length && !event.required_flag.every(f => getFlag(f))) return false;    
    if (event.prohibit_flag && Array.isArray(event.prohibit_flag) && event.prohibit_flag.length && event.prohibit_flag.some(f => getFlag(f))) return false;
    // An event triggers if its trigger_flag is set, OR if it has no trigger_flag (making it a potential random event if not prohibited)
    // The original logic was: return !!event.trigger_flag;
    // This means only events with a non-null trigger_flag that is true in gameState.flags will trigger.
    // return event.trigger_flag ? getFlag(event.trigger_flag) : false; // Only trigger if trigger_flag is present and true
    // If trigger_flag is explicitly defined (not null, not undefined)
    return !event.trigger_flag || getFlag(event.trigger_flag);

    
  }

  // Process events that occur before player makes a choice
  function processPreChoiceEvents(callbackAfterEventsHandled) {
    // Check pollution flag based on current gameState
    // The pm25_threshold was part of gameState but not used. If you have a specific threshold for this flag:
    const PM25_CRISIS_THRESHOLD = 80; // Example threshold
    if (gameState.pm25_level > PM25_CRISIS_THRESHOLD) {      setFlag('細懸浮微粒太高');
    } else {
      clearFlag('細懸浮微粒太高'); // Clear flag if condition no longer met
    }

    const triggeredEventsThisTurn = [];
    eventsArr.forEach(evt => {
      if (shouldTrigger(evt)) {
        triggeredEventsThisTurn.push(evt);
      }
    });

    const eventDisplayPanel = document.getElementById('event-display-panel');
    const uiControlsArea = document.getElementById('ui-controls-area');

    const MAX_EVENTS_TO_SHOW_PER_TURN = 1; // 設定每回合最多顯示的事件數量

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
      eventDisplayPanel.classList.add('hidden');
      // Ensure ack button is not present if no events
      const existingAckButton = uiControlsArea.querySelector('#acknowledge-all-events-btn');
      if (existingAckButton) existingAckButton.remove();
      callbackAfterEventsHandled(); // Proceed to show banner/choices.
    }
  }

  // Renders event cards and an acknowledge button
  function renderEventCards(eventsToDisplay, onAllEventsAcknowledgedCallback) {
    const panel = document.getElementById('event-display-panel');
    const uiControlsArea = document.getElementById('ui-controls-area');
    panel.innerHTML = ''; 

    // Remove previous ack button if any, before creating a new one
    const oldAckButton = uiControlsArea.querySelector('#acknowledge-all-events-btn');
    if (oldAckButton) oldAckButton.remove();

    if (!eventsToDisplay || eventsToDisplay.length === 0) {
        gameState.activeEventObjects = []; // Ensure it's empty if no events
        panel.classList.add('hidden');
        // Ensure ack button is not present if no events (already handled by removal above)
        if (onAllEventsAcknowledgedCallback) onAllEventsAcknowledgedCallback();
        return;
    }

    panel.classList.remove('hidden'); // Show the panel

    gameState.activeEventObjects = [...eventsToDisplay]; // Store active events

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
            <p class="font-bold">${evt.id}</p>
            ${evt.description ? `<p class="text-sm mb-1">${evt.description}</p>` : ''}
            <div class="mt-1 text-xs flex flex-wrap">
            ${effectsHTML || '<span class="text-gray-500">無立即效果</span>'}
            </div>
          </div>  
        </div>
      `;
      panel.appendChild(cardEl);
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
    uiControlsArea.appendChild(ackButton);
  }

  // Check and clear events based on gameState conditions
  function checkAndClearResolvedEvents() {
    const panel = document.getElementById('event-display-panel');
    let eventsWereClearedThisCheck = false;

    gameState.activeEventObjects = gameState.activeEventObjects.filter(event => {
      let shouldDisappear = false;
      if (event.disappears_if_flag_set && getFlag(event.disappears_if_flag_set)) {
        shouldDisappear = true;
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
      /*
      if (shouldDisappear) {
        const eventCardElement = panel.querySelector(`[data-event-id="${event.id}"]`);
        if (event.id === "黑面琵鷺族群減少") console.log(`For event "${event.id}", eventCardElement is:`, eventCardElement);

        if (eventCardElement) {
          if (event.id === "黑面琵鷺族群減少") console.log('Before remove() for "黑面琵鷺族群減少":', panel.innerHTML);
          eventCardElement.remove();
          if (event.id === "黑面琵鷺族群減少") console.log('After remove() for "黑面琵鷺族群減少":', panel.innerHTML);
          eventsWereClearedThisCheck = true;
          // if (event.id === "黑面琵鷺族群減少") console.log('After remove(), eventCardElement.parentNode:', eventCardElement.parentNode); // 檢查是否已從 DOM 分離
        }
        return false; // Remove from activeEventObjects
      }
        */
      return true; // Keep in activeEventObjects
    });

    if (gameState.activeEventObjects.length === 0 && panel.children.length === 0 && eventsWereClearedThisCheck) {
       // Hide panel if it became empty due to this check
      panel.classList.add('hidden');
    }
  }

  // Post-choice processing, Markov effects, and advancing to new turn
  function processEndOfTurn() {
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
    // next turn
    checkAndClearResolvedEvents(); // Check if any events are resolved by Markov chain effects
    gameState.turn++;
    startTurnSequence(); // Start the next turn's sequence
  }

  // Main function to start a turn's sequence
  function startTurnSequence() {
    renderDashboard();
    renderFlags();

    const choicePanel = document.getElementById('card-panel');
    const turnBanner = document.getElementById('banner');
    const eventDisplayPanel = document.getElementById('event-display-panel');
    const uiControlsArea = document.getElementById('ui-controls-area');
    const shuffleButton = setupShuffleStrategiesButton(); // Setup/get button

    choicePanel.classList.add('hidden');
    turnBanner.classList.add('hidden');
    eventDisplayPanel.classList.add('hidden'); 
    eventDisplayPanel.innerHTML = ''; // Clear event cards from previous turn
    gameState.activeEventObjects = []; // Clear active events from previous turn
    
    // Clear previous ack button from uiControlsArea
    const existingAckButton = uiControlsArea.querySelector('#acknowledge-all-events-btn');
    if (existingAckButton) existingAckButton.remove();

    // Hide shuffle button initially
    if (shuffleButton) shuffleButton.classList.add('hidden');

    processPreChoiceEvents(() => {
      turnBanner.classList.remove('hidden');
      choicePanel.classList.remove('hidden');
      renderBanner();
      renderChoices();
      if (shuffleButton) shuffleButton.classList.remove('hidden');
      renderFlags();
    });
  }

  // Initialize
  startTurnSequence();
})();