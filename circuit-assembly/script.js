(() => {
  'use strict';

  // -------- URL Params & Defaults --------
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  const getInt = (k, fallback) => {
    const v = parseInt(params.get(k), 10);
    return Number.isFinite(v) ? v : fallback;
  };
  const getBool = (k, fallback) => {
    const v = params.get(k);
    return v == null ? fallback : (v === '1' || v === 'true');
  };

  const DEFAULT_GROUPS = 4;
  const groups = Math.max(1, getInt('groups', DEFAULT_GROUPS));
  const broken = Math.max(0, getInt('broken', 4)); // 預設 4 個壞零件
  const lit = Math.max(0, getInt('lit', 1)); // 預設至少 1 組會亮燈
  const demo = getBool('demo', true); // 預設 demo=1
  const debug = getBool('debug', false); // 預設 debug=0
  
  // 每次載入都生成新的隨機種子
  const seed = Math.floor(Math.random() * 1e9);

  // 更新工具列種子顯示
  /*
  const seedIndicator = document.getElementById('seed-indicator');
  if (seedIndicator) seedIndicator.textContent = `seed=${seed} · groups=${groups} · normals=${normals} · lit=${lit} · demo=${demo?1:0} · debug=${debug?1:0}`;
  */
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    params.set('seed', String(seed));
    params.set('groups', String(groups));
    params.set('broken', String(broken));
    params.set('lit', String(lit));
    params.set('demo', demo ? '1' : '0');
    params.set('debug', debug ? '1' : '0');
    window.location.search = params.toString();
  });
  document.getElementById('btn-new-seed')?.addEventListener('click', () => {
    params.set('seed', String(Math.floor(Math.random() * 1e9)));
    window.location.search = params.toString();
  });

  // -------- RNG --------
  function mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }
  const rand = mulberry32(seed >>> 0);
  const choice = (arr) => arr[Math.floor(rand() * arr.length)];
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // -------- Models --------
  const TYPES = ['battery','wire','socket','bulb'];
  /** @typedef {{id:string,type:string,good:boolean,origin:string,x:number,y:number, w:number,h:number,homeX:number,homeY:number}} Component */
  /** @typedef {{id:string,type:string,occupiedBy:string|null,cx:number,cy:number, w:number,h:number}} Slot */
  /** @typedef {{id:string, slots: Record<string, Slot>, isLit:boolean, bx:number,by:number}} Circuit */

  /** @type {Component[]} */
  const components = [];
  /** @type {Circuit[]} */
  const circuits = [];
  
  // Step counter
  let stepCount = 0;
  
  // Classification zones
  const zones = {
    broken: { id: 'zone-broken', label: '故障區', x: 0, y: 0, w: 0, h: 0 }
  };

  // SVG root
  const svg = document.getElementById('board');
  const NS = 'http://www.w3.org/2000/svg';

  // Layout constants
  const stage = { w: 1400, h: 700 }; // 加寬舞台以容納右側分類區
  const zoneW = 280; // 分類區寬度
  const mainAreaW = stage.w - zoneW - 36; // 主要區域寬度（電路+pool）
  const gridCols = Math.ceil(Math.sqrt(groups));
  const gridRows = Math.ceil(groups / gridCols);
  const pad = 12;
  const circuitW = (mainAreaW - pad*(gridCols+1)) / gridCols;
  const circuitH = (stage.h * 0.60 - pad*(gridRows+1)) / gridRows;
  const poolTop = stage.h * 0.60; // Pool 區域開始位置
  const poolCellW = 120, poolCellH = 90;
  const poolCols = Math.floor((mainAreaW - pad*2) / (poolCellW + 12));

  // Helper: create SVG element
  function el(name, attrs={}, children=[]) {
    const e = document.createElementNS(NS, name);
    for (const [k,v] of Object.entries(attrs)) {
      if (k === 'class') e.setAttribute('class', v);
      else e.setAttribute(k, String(v));
    }
    for (const c of children) e.appendChild(c);
    return e;
  }

  // Build circuits slots layout
  function buildCircuits(){
    for (let i=0;i<groups;i++){
      const row = Math.floor(i / gridCols);
      const col = i % gridCols;
      const x = pad + col*(circuitW + pad);
      const y = pad + row*(circuitH + pad);

      const cId = `circuit-${i+1}`;
      const gCircuit = el('g', { id: cId, class: 'circuit', transform: `translate(${x},${y})` });

      // base panel
      const panel = el('rect', { x:0, y:0, width:circuitW, height:circuitH, fill:'#f3f4f6', rx:16, ry:16, stroke:'#335aa7ff' });
      gCircuit.appendChild(panel);



      // slot positions (four corners-ish)
      const slotBox = [
        { type:'battery', cx: 80, cy: 50 },
        { type:'wire', cx: circuitW-80, cy: 50 },
        { type:'socket', cx: 80, cy: circuitH-50 },
        { type:'bulb', cx: circuitW-80, cy: circuitH-50 },
      ];

      const slots = {};
      const gSlots = el('g', { id: `${cId}-slots` });
      for (const s of slotBox){
        const sid = `slot-${cId}-${s.type}`;
        const w = 100, h = 70;
        const x0 = s.cx - w/2, y0 = s.cy - h/2;
        const gSlot = el('g', { id:sid, class:'slot', 'data-type':s.type, 'data-circuit':String(i+1), transform:`translate(${x0},${y0})` });
        const rect = el('rect', { x:0, y:0, width:w, height:h, class:'slot-rect' });
        gSlot.appendChild(rect);
        gSlots.appendChild(gSlot);
        slots[s.type] = { id:sid, type:s.type, occupiedBy:null, cx:s.cx + x, cy:s.cy + y, w, h };
      }
      gCircuit.appendChild(gSlots);

      // bulb visual
      const gBulb = el('g', { id: `${cId}-bulb`, class:'bulb' });
      const bx = circuitW/2, by = circuitH/2;
      const circle = el('circle', { cx:bx, cy:by, r:22, class:'bulb-off' });
      gBulb.appendChild(circle);
      gCircuit.appendChild(gBulb);

      svg.appendChild(gCircuit);

      circuits.push({ id:cId, slots, isLit:false, bx: x+bx, by: y+by });
    }
  }

  // Build components pool data
  function buildComponents(){
    // Strategy: Create fewer broken components so player needs to diagnose
    // broken = total number of broken components across all types
    // groups = total components per type
    // These broken components are randomly distributed across types
    
    const totalBroken = Math.min(broken, groups * TYPES.length); // Cap at total components
    
    console.log(`groups=${groups}, total broken=${totalBroken}, lit=${lit}`);
    
    // Create array to track broken count per type
    const brokenByType = {};
    for (const type of TYPES){
      brokenByType[type] = 0;
    }
    
    // Randomly assign broken components to types
    // Ensure each type has at least 'lit' good components for guaranteed lit circuits
    for (let i = 0; i < totalBroken; i++){
      // Find types that can still accept broken components
      const availableTypes = TYPES.filter(t => {
        const currentBroken = brokenByType[t];
        const wouldHaveGood = groups - currentBroken - 1; // -1 for the one we're about to add
        return wouldHaveGood >= lit; // Must leave enough good components for lit circuits
      });
      
      if (availableTypes.length > 0) {
        const type = choice(availableTypes);
        brokenByType[type]++;
      } else {
        console.warn(`Cannot assign broken component ${i}: no available types (all types need ${lit} good components for lit circuits)`);
      }
    }
    
    // Create components for each type
    for (const type of TYPES){
      const total = groups;
      const brokenCount = brokenByType[type];
      const goodCount = total - brokenCount;
      
      const arr = [];
      for (let i=0; i<goodCount; i++) arr.push({ good:true });
      for (let i=0; i<brokenCount; i++) arr.push({ good:false });
      shuffle(arr);
      
      for (let i=0; i<arr.length; i++){
        const id = `cmp-${type}-${String(components.length+1).padStart(2,'0')}`;
        components.push({ id, type, good:arr[i].good, origin:'pool', x:0,y:0, w:100, h:70, homeX:0, homeY:0 });
      }
    }
    
    // Debug: log component distribution
    console.log('=== Component Distribution ===');
    for (const type of TYPES){
      const ofType = components.filter(c => c.type === type);
      const good = ofType.filter(c => c.good).length;
      const bad = ofType.filter(c => !c.good).length;
      console.log(`${type}: ${good} good, ${bad} bad (total: ${ofType.length})`);
    }
    const totalGood = components.filter(c => c.good).length;
    const totalBad = components.filter(c => !c.good).length;
    console.log(`TOTAL: ${totalGood} good, ${totalBad} bad (total: ${components.length})`);
  }

  // Pool layout and placing
  function layoutPool(){
    // Create a group to contain components visually
    const gPool = el('g', { id:'pool' });
    svg.appendChild(gPool);

    // Grid positions
    const pos = [];
    const top = poolTop;
    let x = pad, y = top;
    const gapX = 12, gapY = 12;

    for (let i=0;i<components.length;i++){
      pos.push({x,y});
      x += poolCellW + gapX;
      if ((i+1) % poolCols === 0){
        x = pad; y += poolCellH + gapY;
      }
    }

    // 為每個零件分配固定的原始位置 (home position)
    for (let i=0; i<components.length; i++){
      const cmp = components[i];
      const homeX = pos[i].x + 10; // small padding inside cell
      const homeY = pos[i].y + 10;
      
      cmp.homeX = homeX;
      cmp.homeY = homeY;
      cmp.x = homeX;
      cmp.y = homeY;

      const g = el('g', { id:cmp.id, class:'component', 'data-type':cmp.type, transform:`translate(${cmp.x},${cmp.y})` });
      g.dataset.good = String(cmp.good); // 僅 debug 面板讀取，不做視覺表現

      // base rectangle
      const rect = el('rect', { x:0,y:0,width:cmp.w,height:cmp.h, class:'comp-shape' });
      g.appendChild(rect);

      // minimal icon per type（幾何化，不透露好壞）
      const icon = buildTypeIcon(cmp.type, cmp);
      if (icon) g.appendChild(icon);

      // 顯示零件類型名稱（左上角）
      const typeNames = {
        'battery': '電池',
        'wire': '電線',
        'socket': '燈座',
        'bulb': '燈泡'
      };
      const typeName = el('text', {
        x: 8,
        y: 16,
        class: 'comp-type-name',
        'text-anchor': 'start',
        'font-size': '12',
        'font-weight': '600',
        'fill': '#374151',
        'opacity': '0.9'
      });
      typeName.textContent = typeNames[cmp.type] || cmp.type;
      g.appendChild(typeName);

      // 顯示索引編號 (01-16)（右上角）
      const idx = String(i + 1).padStart(2, '0');
      const text = el('text', { 
        x: cmp.w - 8, 
        y: 16, 
        class: 'comp-index',
        'text-anchor': 'end',
        'font-size': '14',
        'font-weight': 'bold',
        'fill': '#374151',
        'opacity': '0.8'
      });
      text.textContent = idx;
      g.appendChild(text);

      enableDrag(g, cmp);

      gPool.appendChild(g);
    }
  }

  // Build classification zones
  function buildClassificationZones(){
    const zoneX = mainAreaW + 24; // 分類區域 X 起始位置（右側）
    const zoneCenterX = zoneX + zoneW / 2;
    
    // Layout from top to bottom:
    // 1. Button (top)
    // 2. Instruction text
    // 3. Broken zone
    // 4. Result text (at bottom)
    
    const buttonH = 45;
    const buttonW = 220;
    const buttonY = pad + buttonH / 2; // Top position for button
    
    const instructionY = buttonY + buttonH / 2 + 25; // Below button
    
    const stepCounterY = instructionY + 25; // Below instruction
    
    const resultTextY = stepCounterY + 25; // Below step counter
    
    const zonesStartY = resultTextY + 35; // Start zone below result text
    const availableHeight = stage.h - zonesStartY - pad - 20; // Remaining space for zone
    
    // Broken zone position (single zone, takes most of the space)
    zones.broken.x = zoneX;
    zones.broken.y = zonesStartY;
    zones.broken.w = zoneW;
    zones.broken.h = availableHeight;
    
    // Create SVG elements for zones
    const gZones = el('g', { id: 'classification-zones' });
    
    // Add check button (at top)
    const gButton = el('g', { 
      id: 'check-button', 
      class: 'check-button',
      style: 'cursor: pointer;'
    });
    
    const buttonRect = el('rect', {
      x: zoneCenterX - buttonW / 2,
      y: buttonY - buttonH / 2,
      width: buttonW,
      height: buttonH,
      rx: 8,
      ry: 8,
      fill: '#10b981',
      stroke: '#059669',
      'stroke-width': 2
    });
    
    const buttonText = el('text', {
      x: zoneCenterX,
      y: buttonY + 6,
      class: 'button-text',
      'text-anchor': 'middle',
      fill: '#ffffff',
      'font-size': '16',
      'font-weight': '600',
      style: 'pointer-events: none;'
    });
    buttonText.textContent = '檢查分類結果';
    
    gButton.appendChild(buttonRect);
    gButton.appendChild(buttonText);
    
    // Hover effect
    gButton.addEventListener('mouseenter', () => {
      buttonRect.setAttribute('fill', '#059669');
    });
    gButton.addEventListener('mouseleave', () => {
      buttonRect.setAttribute('fill', '#10b981');
    });
    gButton.addEventListener('click', checkClassification);
    
    gZones.appendChild(gButton);
    
    // Add instruction text (below button)
    const instructionText = el('text', {
      x: zoneCenterX,
      y: instructionY,
      'text-anchor': 'middle',
      'font-size': '13',
      'font-weight': '500',
      fill: '#6b7280'
    });
    instructionText.textContent = '將故障零件拖曳至此';
    gZones.appendChild(instructionText);
    
    // Add step counter text (below instruction)
    const stepCounterText = el('text', {
      id: 'step-counter',
      x: zoneCenterX,
      y: stepCounterY,
      'text-anchor': 'middle',
      'font-size': '12',
      'font-weight': '500',
      fill: '#9ca3af'
    });
    stepCounterText.textContent = '步驟: 0';
    gZones.appendChild(stepCounterText);
    
    // Add broken zone rectangle and label
    const zone = zones.broken;
    const gZone = el('g', { 
      id: zone.id, 
      class: 'zone zone-broken',
      'data-zone': 'broken'
    });
    
    const rect = el('rect', { 
      x: zone.x, 
      y: zone.y, 
      width: zone.w, 
      height: zone.h, 
      class: 'zone-rect',
      rx: 12,
      ry: 12
    });
    
    const label = el('text', {
      x: zone.x + zone.w / 2,
      y: zone.y + 30,
      class: 'zone-label',
      'text-anchor': 'middle'
    });
    label.textContent = zone.label;
    
    gZone.appendChild(rect);
    gZone.appendChild(label);
    gZones.appendChild(gZone);
    
    // Add result text area (below step counter, before zone)
    const resultText = el('text', {
      id: 'classification-result-svg',
      x: zoneCenterX,
      y: resultTextY,
      'text-anchor': 'middle',
      'font-size': '13',
      'font-weight': '600',
      fill: '#6b7280'
    });
    resultText.textContent = ''; // Initially empty
    
    gZones.appendChild(resultText);
    
    svg.appendChild(gZones);
  }

  function buildTypeIcon(type, cmp){
    switch(type){
      case 'battery': {
        const g = el('g', { class:'icon' });
        g.appendChild(el('rect', { x:15, y:20, width:65, height:30, rx:6, ry:6 }));
        g.appendChild(el('rect', { x:80, y:30, width:6, height:10, rx:2, ry:2 }));
        return g;
      }
      case 'wire': {
        const g = el('g', { class:'icon' });
        g.appendChild(el('path', { d:'M 8 50 C 36 10, 64 90, 92 50', fill:'none', stroke:'currentColor', 'stroke-width':5, 'stroke-linecap':'round' }));
        return g;
      }
      case 'socket': {
        const g = el('g', { class:'icon' });
        g.appendChild(el('rect', { x:18, y:18, width:64, height:40, rx:10, ry:10 }));
        g.appendChild(el('rect', { x:30, y:26, width:10, height:24, rx:2, ry:2 }));
        g.appendChild(el('rect', { x:60, y:26, width:10, height:24, rx:2, ry:2 }));
        return g;
      }
      case 'bulb': {
        const g = el('g', { class:'icon' });
        g.appendChild(el('circle', { cx:50, cy:34, r:20 }));
        g.appendChild(el('rect', { x:40, y:40, width:20, height:20, rx:3, ry:3 }));
        return g;
      }
    }
    return null;
  }

  // Find circuit and slot object by slot element id
  function findSlotByElementId(id){
    for (const c of circuits){
      for (const t of TYPES){
        if (c.slots[t].id === id) return { circuit:c, slot:c.slots[t] };
      }
    }
    return null;
  }

  // Recompute lit state for a circuit and update bulb
  function updateCircuitLit(circuit){
    let allGood = true;
    for (const t of TYPES){
      const s = circuit.slots[t];
      if (!s.occupiedBy){ allGood = false; break; }
      const cmp = components.find(c=>c.id===s.occupiedBy);
      if (!cmp || !cmp.good) { allGood = false; break; }
    }
    circuit.isLit = allGood;
    const g = document.getElementById(circuit.id);
    const bulb = g?.querySelector('g.bulb > circle');
    if (bulb){
      bulb.setAttribute('class', allGood ? 'bulb-on' : 'bulb-off');
    }

    const live = document.getElementById('status-live');
    if (live) live.textContent = `${circuit.id} ${allGood? '已點亮':'已熄滅'}`;
  }

  function updateAllCircuits(){
    for (const c of circuits) updateCircuitLit(c);
    if (debug) renderDebugPanel();
  }

  // Place a component into a slot (eject if occupied)
  function placeIntoSlot(cmp, slot){
    console.log(`[placeIntoSlot] Attempting to place ${cmp.id} (from ${cmp.origin}) into ${slot.id} (occupied by ${slot.occupiedBy})`);
    
    // Step 1: If incoming component was in another slot, clear that slot first
    if (cmp.origin.startsWith('circuit-')){
      const oldLoc = locateSlotByComponent(cmp.id);
      if (oldLoc){
        console.log(`[placeIntoSlot] Clearing old slot for incoming component: ${oldLoc.slot.id}`);
        oldLoc.slot.occupiedBy = null;
        updateCircuitLit(oldLoc.circuit);
      }
    }

    // Step 2: If target slot is occupied, eject the existing component
    if (slot.occupiedBy){
      const ejected = components.find(c=>c.id===slot.occupiedBy);
      if (ejected){
        console.log(`[placeIntoSlot] Ejecting ${ejected.id} from slot, returning to home:(${ejected.homeX},${ejected.homeY})`);
        slot.occupiedBy = null; // Clear slot first
        ejected.origin = 'pool'; // Mark as back in pool
        moveToPool(ejected); // Move to home position
      }
    }

    // Step 3: Place the incoming component into the slot
    const gCmp = document.getElementById(cmp.id);
    const tx = slot.cx - cmp.w/2; // because component's origin is top-left
    const ty = slot.cy - cmp.h/2;
    gCmp.setAttribute('transform', `translate(${tx},${ty})`);

    cmp.x = tx; cmp.y = ty; cmp.origin = slot.id.replace(/^slot-/, '').replace(/-(battery|wire|socket|bulb)$/,''); // e.g., circuit-1
    slot.occupiedBy = cmp.id;
    console.log(`[placeIntoSlot] Successfully placed ${cmp.id} into ${slot.id}`);

    // Step 4: Update circuit lit state
    const info = findSlotByElementId(slot.id);
    if (info) updateCircuitLit(info.circuit);
  }

  function locateSlotByComponent(componentId){
    for (const c of circuits){
      for (const t of TYPES){
        const s = c.slots[t];
        if (s.occupiedBy === componentId) return { circuit:c, slot:s };
      }
    }
    return null;
  }

  // Back to pool or zone
  function moveToPool(cmp){
    const gCmp = document.getElementById(cmp.id);
    // 回到零件的原始位置 (homeX, homeY)
    gCmp.setAttribute('transform', `translate(${cmp.homeX},${cmp.homeY})`);
    cmp.x = cmp.homeX;
    cmp.y = cmp.homeY;
    cmp.origin = 'pool';
  }
  
  // Find which zone contains a point
  function findZoneAtPoint(x, y){
    for (const [key, zone] of Object.entries(zones)){
      if (x >= zone.x && x <= zone.x + zone.w &&
          y >= zone.y && y <= zone.y + zone.h){
        return key; // 'good' or 'broken'
      }
    }
    return null;
  }

  // Pointer drag setup
  function enableDrag(gElem, cmp){
    let dragging = false;
    let startX = 0, startY = 0;
    let originalOrigin = ''; // 記錄拖曳前的 origin
    let pointerId = null; // 追蹤特定的 pointer

    const onPointerDown = (e) => {
      // 只處理主要按鈕（滑鼠左鍵或觸控）
      if (e.button !== undefined && e.button !== 0) return;
      
      // 防止事件冒泡和預設行為
      e.stopPropagation();
      
      dragging = true;
      pointerId = e.pointerId;
      
      // 記錄原始 origin（在修改之前）
      originalOrigin = cmp.origin;
      
      // 將元素移到最上層（SVG 中後來的元素在上面）
      const parent = gElem.parentNode;
      if (parent) {
        parent.appendChild(gElem);
      }
      
      gElem.setPointerCapture(e.pointerId);
      
      // 記錄起始位置
      const pt = getPointerSVGPoint(e);
      startX = pt.x;
      startY = pt.y;
      
      console.log(`[onPointerDown] ${cmp.id} pointerId:${e.pointerId} at SVG:(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}), origin:${cmp.origin}`);
      
      // 檢查是否從插槽拿起（使用 originalOrigin）
      if (originalOrigin.startsWith('circuit-')) {
        // 從插槽移除
        const loc = locateSlotByComponent(cmp.id);
        if (loc) {
          console.log(`[onPointerDown] Removing ${cmp.id} from slot ${loc.slot.id}`);
          loc.slot.occupiedBy = null;
          // 先不要改變 origin，等到真正放下時再決定
          updateCircuitLit(loc.circuit);
        }
      }
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      // 只處理同一個 pointer 的事件
      if (pointerId !== null && e.pointerId !== pointerId) return;
      
      e.stopPropagation();
      
      const pt = getPointerSVGPoint(e);
      
      // 計算新位置：當前組件位置 + 移動距離
      const dx = pt.x - startX;
      const dy = pt.y - startY;
      const nx = cmp.x + dx;
      const ny = cmp.y + dy;
      
      gElem.setAttribute('transform', `translate(${nx},${ny})`);
      
      // 更新起始位置為當前位置，以便下次移動計算
      startX = pt.x;
      startY = pt.y;
      
      // 暫時更新組件位置（會在放置或返回時正式更新）
      cmp.x = nx;
      cmp.y = ny;
    };

    const onPointerUp = (e) => {
      if (!dragging) return;
      // 只處理同一個 pointer 的事件
      if (pointerId !== null && e.pointerId !== pointerId) return;
      
      e.stopPropagation();
      
      dragging = false;
      pointerId = null;
      
      try {
        gElem.releasePointerCapture(e.pointerId);
      } catch(err) {
        console.warn('releasePointerCapture error:', err);
      }

      console.log(`[onPointerUp] ${cmp.id} released at client:(${e.clientX}, ${e.clientY})`);

      // Temporarily hide ALL components for hit testing (to find slots underneath)
      const allComponents = Array.from(document.querySelectorAll('.component'));
      const prevPointerEvents = allComponents.map(el => el.style.pointerEvents);
      allComponents.forEach(el => { el.style.pointerEvents = 'none'; });
      
      const elAt = document.elementFromPoint(e.clientX, e.clientY);
      
      // Restore pointer events
      allComponents.forEach((el, i) => { el.style.pointerEvents = prevPointerEvents[i]; });

      if (elAt) {
        console.log(`[onPointerUp] Element at drop: id="${elAt.id}" class="${elAt.getAttribute('class')}" tag="${elAt.tagName}"`);
      } else {
        console.log(`[onPointerUp] No element at drop point`);
      }

      const slotGroup = findSlotGroup(elAt);
      if (!slotGroup){
        // Check if dropped in a classification zone
        const pt = getPointerSVGPoint(e);
        const zone = findZoneAtPoint(pt.x, pt.y);
        
        if (zone){
          // Place in classification zone
          console.log(`[onPointerUp] Dropped in ${zone} zone`);
          cmp.origin = `zone-${zone}`;
          cmp.x = pt.x - cmp.w / 2;
          cmp.y = pt.y - cmp.h / 2;
          gElem.setAttribute('transform', `translate(${cmp.x},${cmp.y})`);
          stepCount++; // 計數：放入分類區
          updateStepCounter();
          if (debug) renderDebugPanel();
          return;
        }
        
        console.log(`[onPointerUp] No slot found, returning ${cmp.id} to home:(${cmp.homeX}, ${cmp.homeY})`);
        cmp.origin = 'pool'; // 現在才設定為 pool
        moveToPool(cmp);
        stepCount++; // 計數：返回 pool
        updateStepCounter();
        if (debug) renderDebugPanel();
        return;
      }

      console.log(`[onPointerUp] Found slot: ${slotGroup.id}`);

      // Type check
      const slotType = slotGroup.getAttribute('data-type');
      if (slotType !== cmp.type){
        console.log(`[onPointerUp] Type mismatch: slot=${slotType}, cmp=${cmp.type}`);
        cmp.origin = 'pool'; // 現在才設定為 pool
        moveToPool(cmp);
        stepCount++; // 計數：類型不符返回 pool
        updateStepCounter();
        if (debug) renderDebugPanel();
        return;
      }

      // Accept drop
      const slotId = slotGroup.id;
      const info = findSlotByElementId(slotId);
      if (!info) { 
        console.log(`[onPointerUp] Slot info not found`);
        cmp.origin = 'pool'; // 現在才設定為 pool
        moveToPool(cmp); 
        stepCount++; // 計數：slot 未找到返回 pool
        updateStepCounter();
        if (debug) renderDebugPanel();
        return; 
      }
      placeIntoSlot(cmp, info.slot);
      stepCount++; // 計數：成功放入 slot
      updateStepCounter();
      if (debug) renderDebugPanel();
    };

    const onPointerCancel = (e) => {
      // 只處理同一個 pointer 的事件
      if (pointerId !== null && e.pointerId !== pointerId) return;
      if (!dragging) return;
      
      console.log(`[onPointerCancel] ${cmp.id} pointerId:${e.pointerId} - CANCELLED (這不應該發生！)`);
      dragging = false;
      pointerId = null;
      cmp.origin = 'pool'; // 現在才設定為 pool
      moveToPool(cmp);
      if (debug) renderDebugPanel();
    };

    gElem.addEventListener('pointerdown', onPointerDown, {passive: false});
    gElem.addEventListener('pointermove', onPointerMove, {passive: false});
    gElem.addEventListener('pointerup', onPointerUp, {passive: false});
    gElem.addEventListener('pointercancel', onPointerCancel, {passive: false});
    
    // 防止觸控滾動和縮放
    gElem.style.touchAction = 'none';
    gElem.style.userSelect = 'none';
    gElem.style.webkitUserSelect = 'none';
    gElem.style.msTouchAction = 'none';
  }

  function getPointerSVGPoint(e){
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x:e.clientX, y:e.clientY };
    const inv = ctm.inverse();
    const sp = pt.matrixTransform(inv);
    return { x: sp.x, y: sp.y };
  }

  function findSlotGroup(target){
    if (!target) return null;
    let el = target;
    for (let i=0;i<4 && el;i++){
      if (el.classList && el.classList.contains('slot')) return el;
      el = el.parentNode;
    }
    return null;
  }

  // Demo prefill: place all components into slots
  function demoPrefill(){
    if (!demo) return;
    
    // Collect all components by type and separate good/bad
    const goodComponentsByType = {};
    const badComponentsByType = {};
    for (const t of TYPES){
      const allOfType = components.filter(c => c.type === t);
      goodComponentsByType[t] = allOfType.filter(c => c.good);
      badComponentsByType[t] = allOfType.filter(c => !c.good);
      // Shuffle both lists for randomness
      shuffle(goodComponentsByType[t]);
      shuffle(badComponentsByType[t]);
    }
    
    // Phase 1: Fill first 'lit' circuits with all good components (guaranteed to light up)
    const litCount = Math.min(lit, circuits.length);
    for (let i = 0; i < litCount; i++){
      const circuit = circuits[i];
      
      for (const t of TYPES){
        const slot = circuit.slots[t];
        // Use first available good component
        const cmp = goodComponentsByType[t].find(c => c.origin === 'pool');
        if (cmp) {
          placeIntoSlot(cmp, circuit.slots[t]);
        } else {
          // If no good component available, this shouldn't happen with correct normals setting
          console.warn(`No good ${t} component available for lit circuit ${i}`);
        }
      }
    }
    
    // Phase 2: Fill remaining slots randomly with whatever components are left
    for (let i = litCount; i < circuits.length; i++){
      const circuit = circuits[i];
      
      for (const t of TYPES){
        const slot = circuit.slots[t];
        if (slot.occupiedBy) continue; // Skip if already filled
        
        // Try to find any available component (good first, then bad)
        let cmp = goodComponentsByType[t].find(c => c.origin === 'pool');
        if (!cmp) {
          cmp = badComponentsByType[t].find(c => c.origin === 'pool');
        }
        
        if (cmp) {
          placeIntoSlot(cmp, circuit.slots[t]);
        } else {
          console.warn(`No ${t} component available for circuit ${i}`);
        }
      }
    }
  }
  
  // Update step counter display
  function updateStepCounter() {
    const stepCounterEl = document.getElementById('step-counter');
    if (stepCounterEl) {
      stepCounterEl.textContent = `步驟: ${stepCount}`;
    }
  }
  
  // Check classification results
  function checkClassification(){
    const brokenZoneComponents = components.filter(c => c.origin === 'zone-broken');
    
    // Count total broken components in the game
    const totalBrokenComponents = components.filter(c => !c.good).length;
    
    // Count how many are correctly identified
    let correctBroken = 0;
    let incorrectNormal = 0; // Normal components wrongly placed in broken zone
    
    for (const cmp of brokenZoneComponents){
      if (!cmp.good) {
        correctBroken++;
      } else {
        incorrectNormal++;
      }
    }
    
    const resultEl = document.getElementById('classification-result-svg');
    if (!resultEl) return;
    
    if (brokenZoneComponents.length === 0){
      resultEl.textContent = '請將故障零件拖曳至故障區';
      resultEl.setAttribute('fill', '#6b7280');
    } else if (incorrectNormal > 0){
      resultEl.textContent = `✗ 有 ${incorrectNormal} 個正常零件被誤判為故障`;
      resultEl.setAttribute('fill', '#ef4444');
    } else if (correctBroken === totalBrokenComponents){
      resultEl.textContent = `✓ 完全正確！找出全部 ${totalBrokenComponents} 個故障零件！`;
      resultEl.setAttribute('fill', '#10b981');
    } else {
      resultEl.textContent = `✓ 目前正確！已找出 ${correctBroken}/${totalBrokenComponents} 個故障零件`;
      resultEl.setAttribute('fill', '#3b82f6');
    }
  }

  // Debug panel
  function renderDebugPanel(){
    const panel = document.getElementById('debug-panel');
    if (!panel) return;
    panel.classList.toggle('hidden', !debug);
    if (!debug) return;

    const lines = [];
    lines.push(`seed=${seed} groups=${groups} broken=${broken} lit=${lit} demo=${demo?1:0} debug=${debug?1:0}`);
    for (const c of circuits){
      const o = TYPES.map(t=>{
        const s = c.slots[t];
        const id = s.occupiedBy ? s.occupiedBy : '-';
        const g = s.occupiedBy ? (components.find(x=>x.id===s.occupiedBy)?.good ? '✓':'x') : '·';
        return `${t}:${id}${g}`;
      }).join('  ');
      lines.push(`${c.id} ${c.isLit?'[LIT]':'[---]'}  ${o}`);
    }
    const poolStats = TYPES.map(t=>{
      const good = components.filter(c=>c.origin==='pool' && c.type===t && c.good).length;
      const bad = components.filter(c=>c.origin==='pool' && c.type===t && !c.good).length;
      return `${t} pool good=${good} bad=${bad}`;
    }).join(' | ');
    lines.push(poolStats);
    
    // 顯示所有零件的 home 位置（用於調試）
    lines.push('\n--- Components Home Positions ---');
    for (const cmp of components) {
      lines.push(`${cmp.id} (${cmp.type}) ${cmp.good?'✓':'x'} home:(${Math.round(cmp.homeX)},${Math.round(cmp.homeY)}) current:(${Math.round(cmp.x)},${Math.round(cmp.y)}) origin:${cmp.origin}`);
    }

    panel.textContent = lines.join('\n');
  }

  // -------- Bootstrap --------
  function init(){
    buildCircuits();
    buildComponents();
    buildClassificationZones();
    layoutPool();
    demoPrefill();
    updateAllCircuits();
    if (debug) renderDebugPanel();
    fitSvgToViewport();
  }

  init();

  // 根據視窗高度限制 SVG 最大高度，避免頁面捲動
  function fitSvgToViewport(){
    const header = document.querySelector('.toolbar');
    const hint = document.querySelector('.hint');
    const headerH = header ? header.offsetHeight : 0;
    const hintH = hint ? hint.offsetHeight : 0;
    const extra = 30; // 上下內距與餘裕
    const avail = Math.max(400, window.innerHeight - headerH - hintH - extra);
    svg.style.maxHeight = `${avail}px`;
  }
  window.addEventListener('resize', fitSvgToViewport);
})();
