/* eslint-disable no-console */
(async function() {
  // Load data
  const [eventsArr, strategiesArr, markovChains] = await Promise.all([
    fetch('../events.json').then(r => r.json()),
    fetch('../strategies.json').then(r => r.json()),
    fetch('../markov_chains.json').then(r => r.json())
  ]);

  // Game state
  const gameState = {
    biodiversity: 50,
    economy: 50,
    publicTrust: 50,
    climate: 50,
    social: 50,
    pm25_level: 60,
    pm25_threshold: 50,
    flags: {},
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

  // Build Chinese label mapping for flags (use card titles)
  const flagMap = {};
  strategiesArr.forEach(s => (s.set_flag || []).forEach(f => { flagMap[f] = s.title; }));
  eventsArr.forEach(e => (e.set_flag || []).forEach(f => { flagMap[f] = e.title; }));

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

  // Render dashboard metrics
  function renderDashboard() {
    const dash = document.getElementById('dashboard');
    dash.innerHTML = '';
    const metrics = [
      ['氣候穩定度', gameState.climate],
      ['生物多樣性', gameState.biodiversity],
      ['公共信任度', gameState.publicTrust],
      ['經濟可行性', gameState.economy],
      ['社會公平', gameState.social],
      ['PM2.5 等級', gameState.pm25_level]
    ];
    metrics.forEach(([label, value]) => {
      const card = document.createElement('div');
      card.className = 'w-full p-4 bg-white shadow rounded-lg flex flex-col items-center';
      card.innerHTML = `
        <span class="text-sm text-gray-500">${label}</span>
        <span class="text-2xl font-bold mt-1">${value}</span>
      `;
      dash.appendChild(card);
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
      const text = flagMap[flag] || flag;
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
    const choices = shuffle(strategiesArr).slice(0, 3);
    choices.forEach(card => {
      const btn = document.createElement('button');
      // color-code border based on net effect (sum of all metrics)
      const net = card.effect_biodiversity + card.effect_economy + card.effect_public_trust + card.effect_climate + card.effect_social;
      const borderColor = net > 0 ? 'border-green-500' : net < 0 ? 'border-red-500' : 'border-yellow-500';
      btn.className = `w-1/3 bg-white hover:shadow-lg active:shadow-md focus:outline-none rounded-lg border ${borderColor} transition-all p-4 flex flex-col`;
      btn.dataset.id = card.id;
      btn.innerHTML = `
        <h3 class="text-lg font-semibold mb-2">${card.title}</h3>
        <p class="text-sm text-gray-600 flex-1">${card.description}</p>
        <div class="mt-2 flex justify-between text-sm">
          <span class="text-green-600">${card.effect_biodiversity >= 0 ? '+' : ''}${card.effect_biodiversity} 生態</span>
          <span class="text-red-500">${card.effect_economy >= 0 ? '+' : ''}${card.effect_economy} 經濟</span>
        </div>
      `;
      btn.addEventListener('click', () => chooseStrategy(card));
      panel.appendChild(btn);
    });
  }

  // Apply strategy effects and proceed
  function chooseStrategy(card) {
    // apply effects
    gameState.biodiversity = clamp(gameState.biodiversity + card.effect_biodiversity);
    gameState.economy = clamp(gameState.economy + card.effect_economy);
    gameState.publicTrust = clamp(gameState.publicTrust + card.effect_public_trust);
    gameState.climate = clamp(gameState.climate + card.effect_climate);
    gameState.social = clamp(gameState.social + (card.effect_social || 0));
    checkAndClearResolvedEvents(); // Check if any events are resolved by this strategy's effects
    // Proceed to end-of-turn processing (Markov chains, next turn)
    processEndOfTurn();
  }

  // Check event conditions
  function shouldTrigger(event) {
    if (event.required_flag.length && !event.required_flag.every(f => getFlag(f))) return false;
    if (event.prohibit_flag.length && event.prohibit_flag.some(f => getFlag(f))) return false;
    return !!event.trigger_flag;
  }

  // Process events that occur before player makes a choice
  function processPreChoiceEvents(callbackAfterEventsHandled) {
    // Check pollution flag based on current gameState
    if (gameState.pm25_level > gameState.pm25_threshold) {
      setFlag('pollutionEvent');
    } else {
      clearFlag('pollutionEvent'); // Clear flag if condition no longer met
    }

    const triggeredEventsThisTurn = [];
    eventsArr.forEach(evt => {
      if (shouldTrigger(evt)) {
        triggeredEventsThisTurn.push(evt);
      }
    });

    const eventDisplayPanel = document.getElementById('event-display-panel');
    const ackButtonContainer = document.getElementById('acknowledge-events-container');

    if (triggeredEventsThisTurn.length > 0) {
      // Events exist, render them and wait for acknowledgement.
      // renderEventCards will make eventDisplayPanel and ackButtonContainer visible.
      renderEventCards(triggeredEventsThisTurn, () => {
        // This inner callback is from renderEventCards' acknowledge button.
        // Event display and ack button are hidden by renderEventCards.
        callbackAfterEventsHandled(); // Proceed to show banner/choices.
      });
    } else {
      // No events, hide event-specific UI (if it was somehow visible) and proceed.
      eventDisplayPanel.classList.add('hidden');
      ackButtonContainer.classList.add('hidden');
      callbackAfterEventsHandled(); // Proceed to show banner/choices.
    }
  }

  // Renders event cards and an acknowledge button
  function renderEventCards(eventsToDisplay, onAllEventsAcknowledgedCallback) {
    const panel = document.getElementById('event-display-panel');
    const ackButtonContainer = document.getElementById('acknowledge-events-container');
    panel.innerHTML = ''; 
    ackButtonContainer.innerHTML = ''; // Clear button early too

    if (!eventsToDisplay || eventsToDisplay.length === 0) {
        gameState.activeEventObjects = []; // Ensure it's empty if no events
        panel.classList.add('hidden');
        ackButtonContainer.classList.add('hidden'); // Ensure this is hidden too
        if (onAllEventsAcknowledgedCallback) onAllEventsAcknowledgedCallback();
        return;
    }

    panel.classList.remove('hidden'); // Show the panel
    ackButtonContainer.classList.remove('hidden'); // Show button container

    gameState.activeEventObjects = [...eventsToDisplay]; // Store active events

    eventsToDisplay.forEach(evt => {
      const cardEl = document.createElement('div');
      cardEl.className = 'bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 shadow-md mb-2';
      cardEl.dataset.eventId = evt.id; // Add data-event-id for later removal
      cardEl.innerHTML = `
        <div class="flex">
          <div class="py-1"><svg class="fill-current h-6 w-6 text-orange-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM9 11v2h2v-2H9zm0-4v2h2V7H9z"/></svg></div>
          <div>
            <p class="font-bold">${evt.title}</p>
            <p class="text-sm">${evt.description}</p>
          </div>
        </div>
      `;
      panel.appendChild(cardEl);
    });

    const ackButton = document.createElement('button');
    ackButton.id = 'acknowledge-all-events-btn';
    ackButton.className = 'mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50';
    ackButton.textContent = '確認事件並繼續';
    
    ackButton.onclick = () => {
      eventsToDisplay.forEach(evt => {
        if (evt.hasOwnProperty('effect_biodiversity')) gameState.biodiversity = clamp(gameState.biodiversity + evt.effect_biodiversity);
        if (evt.hasOwnProperty('effect_economy')) gameState.economy = clamp(gameState.economy + evt.effect_economy);
        if (evt.hasOwnProperty('effect_public_trust')) gameState.publicTrust = clamp(gameState.publicTrust + evt.effect_public_trust);
        if (evt.hasOwnProperty('effect_climate')) gameState.climate = clamp(gameState.climate + evt.effect_climate);
        if (evt.hasOwnProperty('effect_social')) gameState.social = clamp(gameState.social + evt.effect_social);
      });
      
      renderDashboard();
      renderFlags();

      // Keep event cards visible after acknowledgement
      // panel.innerHTML = ''; // Do not clear the event cards
      // panel.classList.add('hidden'); // Do not hide the panel
      ackButtonContainer.innerHTML = ''; 
      ackButtonContainer.classList.add('hidden');

      if (onAllEventsAcknowledgedCallback) onAllEventsAcknowledgedCallback();
    };
    ackButtonContainer.appendChild(ackButton);
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

      if (shouldDisappear) {
        const eventCardElement = panel.querySelector(`[data-event-id="${event.id}"]`);
        if (eventCardElement) {
          eventCardElement.remove();
          eventsWereClearedThisCheck = true;
        }
        return false; // Remove from activeEventObjects
      }
      return true; // Keep in activeEventObjects
    });

    if (gameState.activeEventObjects.length === 0 && panel.children.length === 0 && eventsWereClearedThisCheck) {
       // Hide panel if it became empty due to this check
      panel.classList.add('hidden');
    }
  }

  // Post-choice processing, Markov effects, and advancing to new turn
  function processEndOfTurn() {
    // PM2.5 chain
    const pmState = getMarkovChainState('pm25_degradation', gameState.flags.pm25_current_state); // Assuming you might store current Markov state if needed
    if (pmState === 'High') gameState.pm25_level = clamp(gameState.pm25_level + 10);
    else if (pmState === 'Medium') gameState.pm25_level = clamp(gameState.pm25_level + 5);
    else if (pmState === 'Low') gameState.pm25_level = clamp(gameState.pm25_level - 3);
    // Potentially setFlag('pm25_current_state', pmState);

    // forest fire chain
    const ffState = getMarkovChainState('forest_fire_impact', gameState.flags.ff_current_state);
    if (ffState === 'High') {
      gameState.climate = clamp(gameState.climate - 10);
      gameState.biodiversity = clamp(gameState.biodiversity - 15);
      gameState.economy = clamp(gameState.economy - 5);
    }
    // Potentially setFlag('ff_current_state', ffState);

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
    const ackButtonContainer = document.getElementById('acknowledge-events-container');

    choicePanel.classList.add('hidden');
    turnBanner.classList.add('hidden');
    eventDisplayPanel.classList.add('hidden'); 
    ackButtonContainer.classList.add('hidden'); 
    eventDisplayPanel.innerHTML = ''; // Clear event cards from previous turn
    ackButtonContainer.innerHTML = ''; // Clear ack button from previous turn
    gameState.activeEventObjects = []; // Clear active events from previous turn

    processPreChoiceEvents(() => {
      turnBanner.classList.remove('hidden');
      choicePanel.classList.remove('hidden');
      renderBanner();
      renderChoices();
      renderFlags();
    });
  }

  // Initialize
  startTurnSequence();
})();