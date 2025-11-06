// script.js — 控制營養素沿 SVG 路徑移動並在小腸處轉換成小分子
document.addEventListener('DOMContentLoaded', ()=>{
  const svg = document.getElementById('svg');
  const path = document.getElementById('digestPath');
  const zone = document.getElementById('smallIntestineZone');
  const mouth = document.getElementById('mouthZone');
  const tokensContainer = document.getElementById('tokens');
  const info = document.getElementById('info');

  // viewBox of svg is 0 0 400 900
  // centralize visual size variables so they can be tuned in one place
  const SIZES = {
    svgViewBox: { width: 140, height: 200 },
    hex: {
      r: 10,
      gap: 2,
      fill: '#6f6fe0',
      stroke: 'rgba(0,0,0,0.06)',
      horizFactor: 1.75,
      extraHeight: 4,
      smallR: 10,
      largeR: 12
    },
    aa: {
      r: 5,
      smallR: 8,
      // connector between residues (more visible defaults)
      linkColor: 'rgba(216,90,90,0.85)',
      linkWidth: 3,
      linkOpacity: 0.95,
      // control curvature of amino-acid chain link
      curveAmplitude: 10,
      curveWaves: 3,
      // span controls how much of the bezier curve the residues occupy.
      // 1 = full length (default behavior). <1 compresses them toward the center
      // (e.g. 0.8 or 0.6 makes residues closer together).
      span: 0.2,
      // optional extra gap used by width computation (keeps backward compat.)
      gap: 6,
      // where to place the link relative to residue shapes: 'under' or 'over'
      linkPlace: 'over'
    },
    trig: {
      glycerolWidth: 28,
      glycerolRectW: 30,
      glycerolRectH: 12,
      // corner radius for the glycerol rectangle
      glycerolCornerRadius: 3,
      // fatty-acid tail sizing
      faHeight: 5,
      fattyAcidMinWidth: 6,
      gap: 6,
      fattyAcidHeightMultiplier: 5,
      // vertical offset applied to fatty-acid tail Y (positive moves tails down)
      fattyAcidYOffset: -10,
      svgPadding: 8,
      faSvg: { width: 12, height: 30 }
    },
    child: {
      padding: '2px',
      borderRadius: '6px'
    },
    split: {
      gap: 8,
      spread: 8,
      // margin (in path-length units) before the end of small intestine where
      // children will be absorbed (disappear). Increase to make them travel
      // further into the small intestine before fading.
      absorbMargin: 0,
      // small entry margin to avoid immediate on-spawn conversions when
      // mouthStart === 0 or zones align with the path origin. Units are in
      // path-length coordinates (same units as path.getPointAtLength).
      entryMargin: 2,
      // probabilistic absorption parameters: when a single-unit child is in
      // the small intestine, its chance to be absorbed increases with
      // proximity to `smallEnd`. The probability per animation step is:
      //   chance = baseProb + (maxProb - baseProb) * (p^exponent)
      // where p is normalized position in small intestine [0..1].
      absorbBaseProb: 0.02,
      absorbMaxProb: 0.9,
      absorbProbExponent: 2
    },
    token: {
      initialGlc: 6,
      initialAA: 10
    }
  };

  // Debug helpers (enable for tracing emissions and conversions)
  const DEBUG = false; // set false to silence debug output
   // Simulation controls
   // SIM_SPEED: multiplier applied to elapsed time in animations (1 = normal,
   // <1 = slower, >1 = faster). SIM_PAUSED freezes animations by adjusting
   // start timestamps so elapsed does not advance while paused.
   let SIM_SPEED = 1.0;
   let SIM_PAUSED = false;
  // Configuration: whether to use SVG zone elements for detection. When
  // false, the SVG elements like #smallIntestineZone and #stomachZone are
  // treated as purely visual and zones are derived from percentages below.
  const USE_ELEMENT_ZONES = false;
  // on-page debug panel (visible when DEBUG=true)
  let _debugPanel = null;
  function ensureDebugPanel(){
    if(_debugPanel || !DEBUG) return _debugPanel;
    _debugPanel = document.createElement('div');
    _debugPanel.id = 'digestion-debug-panel';
    _debugPanel.style.position = 'fixed';
    _debugPanel.style.right = '12px';
    _debugPanel.style.bottom = '12px';
    _debugPanel.style.width = '320px';
    _debugPanel.style.maxHeight = '40vh';
    _debugPanel.style.overflow = 'auto';
    _debugPanel.style.background = 'rgba(20,20,20,0.9)';
    _debugPanel.style.color = '#e6e6e6';
    _debugPanel.style.fontSize = '12px';
    _debugPanel.style.padding = '8px';
    _debugPanel.style.borderRadius = '8px';
    _debugPanel.style.zIndex = 99999;
    _debugPanel.style.boxShadow = '0 6px 18px rgba(0,0,0,0.4)';
    _debugPanel.style.fontFamily = 'monospace';
    const header = document.createElement('div');
    header.textContent = 'digestion DEBUG';
    header.style.fontWeight = '600';
    header.style.marginBottom = '6px';
    header.style.fontSize = '13px';
    _debugPanel.appendChild(header);
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.fontSize = '11px';
    clearBtn.style.marginLeft = '8px';
    clearBtn.addEventListener('click', ()=>{ while(_debugPanel.children.length>1) _debugPanel.removeChild(_debugPanel.lastChild); });
    header.appendChild(clearBtn);
    document.body.appendChild(_debugPanel);
    return _debugPanel;
  }

  // speed control UI (always available) — pause/resume + speed slider
  function createSpeedControlPanel(){
    const existing = document.getElementById('speed-control-panel');
    if(existing) return existing;
    const panel = document.createElement('div');
    panel.id = 'speed-control-panel';
    panel.style.position = 'fixed';
    panel.style.left = '12px';
    panel.style.bottom = '12px';
    panel.style.width = '220px';
    panel.style.background = 'rgba(0,0,0,0.7)';
    panel.style.color = '#fff';
    panel.style.fontSize = '12px';
    panel.style.padding = '8px';
    panel.style.borderRadius = '8px';
    panel.style.zIndex = 9999999;
    panel.style.fontFamily = 'system-ui, sans-serif';

    const header = document.createElement('div');
    header.style.fontWeight = '600';
    header.style.marginBottom = '6px';
    header.textContent = 'Simulation Speed';
    panel.appendChild(header);

    const row = document.createElement('div');
    row.style.display = 'flex'; row.style.gap = '8px'; row.style.alignItems = 'center';

    const btn = document.createElement('button');
    btn.textContent = SIM_PAUSED ? 'Resume' : 'Pause';
    btn.style.fontSize = '12px';
    btn.addEventListener('click', ()=>{ SIM_PAUSED = !SIM_PAUSED; btn.textContent = SIM_PAUSED ? 'Resume' : 'Pause'; });
    row.appendChild(btn);

    const speedWrap = document.createElement('div');
    speedWrap.style.display='flex'; speedWrap.style.flexDirection='column'; speedWrap.style.flex='1';
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '0.1'; slider.max = '2.0'; slider.step = '0.05'; slider.value = String(SIM_SPEED);
    const label = document.createElement('div'); label.style.fontSize='11px'; label.style.marginTop='4px'; label.textContent = `speed: ${SIM_SPEED.toFixed(2)}x`;
    slider.addEventListener('input', ()=>{ SIM_SPEED = Number(slider.value); label.textContent = `speed: ${SIM_SPEED.toFixed(2)}x`; });
    speedWrap.appendChild(slider); speedWrap.appendChild(label);

    row.appendChild(speedWrap);
    panel.appendChild(row);
    document.body.appendChild(panel);
    return panel;
  }

  function debugLog(...args){
    if(!DEBUG) return;
    // Console output (use log so it's visible even if debug level filtered)
    if(console && console.log) console.log('[digestion]', ...args);
    try{
      const panel = ensureDebugPanel();
      if(panel){
        const line = document.createElement('div');
        line.style.padding = '2px 0';
        const time = new Date().toLocaleTimeString();
        const text = args.map(a=>{
          try{ return (typeof a === 'string')? a : JSON.stringify(a); }catch(e){ return String(a); }
        }).join(' ');
        line.textContent = `${time} ${text}`;
        panel.appendChild(line);
        // keep panel to reasonable length
        while(panel.children.length > 201) panel.removeChild(panel.children[1]);
      }
    }catch(e){ /* ignore */ }
  }

  function debugFlash(el, color='rgba(0,0,0,0.12)'){
    try{
      if(!el || !el.style) return;
      const prev = el.style.boxShadow || '';
      el.style.boxShadow = `0 0 0 6px ${color}`;
      setTimeout(()=>{ el.style.boxShadow = prev; }, 420);
    }catch(e){ /* ignore */ }
  }

  const viewBox = { width: SIZES.svgViewBox.width, height: SIZES.svgViewBox.height };
  const pathLen = path.getTotalLength();

  // compute thresholds (path lengths) for mouth / stomach / small intestine zones
  // New behavior: zones may be defined as SVG polygons/polylines (preferred).
  // Fallback: if polygon points are not available, use element.getBBox() (legacy behavior).

  // parse a 'points' attribute robustly into [{x,y},...]
  function parsePointsAttr(str){
    if(!str) return [];
    // allow separators like "", ",", or whitespace
    const nums = String(str).trim().replace(/,/g,' ').split(/\s+/).map(Number).filter(n=>!isNaN(n));
    const out = [];
    for(let i=0;i+1<nums.length;i+=2) out.push({x: nums[i], y: nums[i+1]});
    return out;
  }

  // return polygon points for an SVG element if possible (polygon/polyline/rect/circle/path fallback)
  function getElementPolygon(el){
    if(!el) return null;
    const tag = (el.tagName || '').toLowerCase();
    // polygon / polyline: parse explicit points
    if(tag === 'polygon' || tag === 'polyline'){
      return parsePointsAttr(el.getAttribute('points'));
    }

    // if element has a 'd' attribute (path data) or is a path, sample points along that path
    const dattr = el.getAttribute && el.getAttribute('d');
    if(dattr || tag === 'path'){
      const d = dattr || el.getAttribute('d') || el.getAttribute('D') || '';
      if(d && d.length){
        return createPathPointsFromD(d, 120);
      }
      // fallback to bbox if d is empty
      const b2 = el.getBBox();
      return [
        {x: b2.x, y: b2.y},
        {x: b2.x + b2.width, y: b2.y},
        {x: b2.x + b2.width, y: b2.y + b2.height},
        {x: b2.x, y: b2.y + b2.height}
      ];
    }

    // rect/circle/ellipse -> convert bbox to rectangle polygon
    if(tag === 'rect' || tag === 'circle' || tag === 'ellipse'){
      const b = el.getBBox();
      return [
        {x: b.x, y: b.y},
        {x: b.x + b.width, y: b.y},
        {x: b.x + b.width, y: b.y + b.height},
        {x: b.x, y: b.y + b.height}
      ];
    }
    return null;
  }

  // create an in-memory path element from a d-string and sample N points along it
  function createPathPointsFromD(dString, maxPoints){
    try{
      const tmp = document.createElementNS('http://www.w3.org/2000/svg','path');
      tmp.setAttribute('d', dString);
      // ensure it's in the DOM so getTotalLength works in some browsers
      // append to svg temporarily and remove after sampling
      svg.appendChild(tmp);
      const L = tmp.getTotalLength();
      const pts = [];
      const steps = Math.max(4, Math.min(512, Math.floor(L / (Math.max(1, L / (maxPoints || 80))))));
      const step = Math.max(1, Math.floor(L / (maxPoints || 80)));
      for(let i=0;i<=L;i+=step){
        const p = tmp.getPointAtLength(i);
        pts.push({x: p.x, y: p.y});
      }
      // ensure last point included
      if(pts.length === 0){
        const p0 = tmp.getPointAtLength(0);
        pts.push({x: p0.x, y: p0.y});
      }
      tmp.remove();
      return pts;
    }catch(e){
      try{ tmp && tmp.remove(); }catch(_){/*ignore*/}
      return [];
    }
  }

  // point-in-polygon test (ray-casting)
  function pointInPolygon(pt, vs){
    if(!vs || vs.length === 0) return false;
    let x = pt.x, y = pt.y;
    let inside = false;
    for(let i=0, j=vs.length-1; i<vs.length; j=i++){
      const xi = vs[i].x, yi = vs[i].y;
      const xj = vs[j].x, yj = vs[j].y;
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if(intersect) inside = !inside;
    }
    return inside;
  }

  // legacy bbox-based finder (kept for fallback)
  function findZoneRangeLegacy(box){
    let start = 0, end = pathLen;
    for(let i=0;i<=pathLen;i+=2){
      const p = path.getPointAtLength(i);
      if(p.y >= box.y && p.y <= box.y + box.height){ start = i; break; }
    }
    for(let i=Math.floor(pathLen);i>=0;i-=2){
      const p = path.getPointAtLength(i);
      if(p.y >= box.y && p.y <= box.y + box.height){ end = i; break; }
    }
    return {start,end};
  }

  // find path-length range where path points fall inside the element's polygon (or bbox fallback)
  function findZoneRangeForElement(el){
    const poly = getElementPolygon(el);
    if(poly && poly.length >= 3){
      let start = 0, end = pathLen;
      for(let i=0;i<=pathLen;i+=2){
        const p = path.getPointAtLength(i);
        if(pointInPolygon(p, poly)){ start = i; break; }
      }
      for(let i=Math.floor(pathLen);i>=0;i-=2){
        const p = path.getPointAtLength(i);
        if(pointInPolygon(p, poly)){ end = i; break; }
      }
      return {start,end};
    }
    // fallback to bbox
    const box = el.getBBox();
    return findZoneRangeLegacy(box);
  }

  // compute ranges using polygon-aware finder
  const smallZoneEl = zone;
  const mouthEl = mouth;
  const stomachEl = document.getElementById('stomachZone');
  // compute original zone ranges. If USE_ELEMENT_ZONES is true we sample
  // the SVG zone elements; otherwise treat the SVG markers as visual only
  // and derive zone lengths from configured percentages (ZONE_OVERRIDES).
  const _orig = {};
  // default percentage fallbacks (used when not using element zones)
  const DEFAULT_ZONE_PCTS = { mouthEndPct: 3.9, esophEndPct: 16.2, stomachEndPct: 21.3, smallEndPct: 70.3 };
  // explicit override values (can be replaced by debug UI). Declared early
  // so code that checks for ZONE_OVERRIDES does not hit the temporal
  // dead zone when accessing the binding before initialization.
  const ZONE_OVERRIDES = {
    mouthEndPct: 3.9,
    esophEndPct: 16.2,
    stomachEndPct: 21.3,
    smallEndPct: 70.3
  };
  if(USE_ELEMENT_ZONES){
    const _small = findZoneRangeForElement(smallZoneEl);
    const _mouth = findZoneRangeForElement(mouthEl);
    const _stomach = findZoneRangeForElement(stomachEl);
    _orig.smallStart = _small.start; _orig.smallEnd = _small.end;
    _orig.mouthStart = _mouth.start; _orig.mouthEnd = _mouth.end;
    _orig.stomachStart = _stomach.start; _orig.stomachEnd = _stomach.end;
  }else{
    // use percentages (ZONE_OVERRIDES may be replaced later by debug panel)
    const pcts = (typeof ZONE_OVERRIDES === 'object' && ZONE_OVERRIDES) ? ZONE_OVERRIDES : DEFAULT_ZONE_PCTS;
    const toLen = pct => (pathLen>0 ? (pct/100) * pathLen : 0);
    _orig.mouthStart = 0;
    _orig.mouthEnd = toLen(pcts.mouthEndPct || DEFAULT_ZONE_PCTS.mouthEndPct);
    _orig.stomachStart = toLen(pcts.esophEndPct || DEFAULT_ZONE_PCTS.esophEndPct);
    _orig.stomachEnd = toLen(pcts.stomachEndPct || DEFAULT_ZONE_PCTS.stomachEndPct);
    _orig.smallStart = toLen(pcts.stomachEndPct || DEFAULT_ZONE_PCTS.stomachEndPct);
    _orig.smallEnd = toLen(pcts.smallEndPct || DEFAULT_ZONE_PCTS.smallEndPct);
  }

  // current active zone boundaries (may be overridden by debug UI)
  // initialize from the SVG-detected originals; these are declared here so
  // they exist before any overrides are applied.
  let mouthStart = _orig.mouthStart;
  let mouthEnd = _orig.mouthEnd;
  let stomachStart = _orig.stomachStart;
  let stomachEnd = _orig.stomachEnd;
  let smallStart = _orig.smallStart;
  let smallEnd = _orig.smallEnd;
  // esophagus (between mouth end and stomach start)
  let esophStart = (typeof _orig.mouthEnd === 'number') ? _orig.mouthEnd : 0;
  let esophEnd = (typeof _orig.stomachStart === 'number') ? _orig.stomachStart : (typeof _orig.mouthEnd === 'number' ? _orig.mouthEnd : 0);

  // 當 pathLen 已知時，用百分比覆寫 zone 長度（會取代之後的變數初始值）
  if(typeof ZONE_OVERRIDES === 'object'){
    const toLen = pct => (pathLen>0) ? (pct/100) * pathLen : 0;
    mouthStart = 0;
    mouthEnd = toLen(ZONE_OVERRIDES.mouthEndPct || 0);
    esophStart = mouthEnd;
    esophEnd = toLen(ZONE_OVERRIDES.esophEndPct || 0);
    stomachStart = esophEnd;
    stomachEnd = toLen(ZONE_OVERRIDES.stomachEndPct || 0);
    smallStart = stomachEnd;
    smallEnd = toLen(ZONE_OVERRIDES.smallEndPct || 0);

    // redraw debug markers if DEBUG 模式開啟
    if(typeof drawSmallIntestineDebugMarkers === 'function') drawSmallIntestineDebugMarkers();
  }

  // (zone boundary variables are declared earlier so overrides can apply)

  // debug helper: draw markers for smallStart / smallEnd on the main SVG
  function drawSmallIntestineDebugMarkers(){
    try{
      // if debugging is disabled, ensure any existing debug group is removed
      // and do nothing further.
      const prev = document.getElementById('debug-absorb-markers');
      if(!DEBUG){ if(prev) prev.remove(); return; }
      // remove existing debug group
      if(prev) prev.remove();
      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      g.setAttribute('id','debug-absorb-markers');
      g.setAttribute('pointer-events','none');
      // helper to create a small circle + label
      function addMarker(atLen, color, label){
        if(typeof atLen !== 'number' || isNaN(atLen)) return;
        const p = path.getPointAtLength(Math.max(0, Math.min(pathLen, atLen)));
        const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
        c.setAttribute('cx', String(p.x));
        c.setAttribute('cy', String(p.y));
        c.setAttribute('r','2.5');
        c.setAttribute('fill', color);
        c.setAttribute('stroke','white');
        c.setAttribute('stroke-width','0.6');
        g.appendChild(c);
        const t = document.createElementNS('http://www.w3.org/2000/svg','text');
        t.setAttribute('x', String(p.x + 4));
        t.setAttribute('y', String(p.y + 4));
        t.setAttribute('font-size','6');
        t.setAttribute('fill', color);
        t.setAttribute('font-family','sans-serif');
        t.textContent = label;
        g.appendChild(t);
      }

      // helper to draw a colored segment along the digestPath from a..b
      function addSegment(aLen, bLen, color, dash){
        if(typeof aLen !== 'number' || typeof bLen !== 'number') return;
        const a = Math.max(0, Math.min(pathLen, aLen));
        const b = Math.max(0, Math.min(pathLen, bLen));
        if(Math.abs(b-a) < 1) return;
        const L = Math.abs(b - a);
        const steps = Math.max(6, Math.min(300, Math.floor(L / 2)));
        let d = '';
        for(let i=0;i<=steps;i++){
          const t = a + (i/steps) * (b - a);
          const p = path.getPointAtLength(t);
          d += (i===0? 'M ' : ' L ') + p.x + ' ' + p.y;
        }
        const seg = document.createElementNS('http://www.w3.org/2000/svg','path');
        seg.setAttribute('d', d);
        seg.setAttribute('fill','none');
        seg.setAttribute('stroke', color);
        seg.setAttribute('stroke-width','2');
        if(dash) seg.setAttribute('stroke-dasharray', dash);
        seg.setAttribute('opacity','0.9');
        g.appendChild(seg);
      }

      // draw zones: mouth (0..mouthEnd), esophagus (mouthEnd..esophEnd), stomach (esophEnd..stomachEnd), small (stomachEnd..smallEnd)
      addSegment(0, mouthEnd, 'rgba(200,30,30,0.7)');
      addSegment(mouthEnd, esophEnd, 'rgba(220,120,30,0.7)');
      addSegment(esophEnd, stomachEnd, 'rgba(200,160,60,0.7)');
      addSegment(stomachEnd, smallEnd, 'rgba(34,139,34,0.7)','4 3');
      // highlight the final 50% of the small intestine separately
      if(typeof smallStart === 'number' && typeof smallEnd === 'number' && smallEnd > smallStart){
        const smallMid = smallStart + 0.5 * (smallEnd - smallStart);
        addSegment(smallMid, smallEnd, 'rgba(34,139,34,0.95)');
        addSegment(smallEnd, pathLen, 'rgba(120,30,160,0.5)','6 4');
        // marker for small-midpoint
        addMarker(smallMid, '#32CD32', 'smallMid');
      }else{
        addSegment(smallEnd, pathLen, 'rgba(120,30,160,0.5)','6 4');
      }

      // markers for boundaries
      addMarker(mouthEnd, '#b22222', 'mouthEnd');
      addMarker(esophEnd, '#d9772a', 'esophEnd');
      addMarker(stomachEnd, '#b8860b', 'stomachEnd');
      addMarker(smallStart, '#228B22', 'smallStart');
      addMarker(smallEnd, '#006400', 'smallEnd');
      svg.appendChild(g);
    }catch(e){ /* ignore debug drawing errors */ }
  }

  // draw markers when debugging is enabled
  if(DEBUG) drawSmallIntestineDebugMarkers();

  // --- DEBUG: interactive zone sliders to override boundaries ---
  function createZoneDebugPanel(){
    try{
      const existing = document.getElementById('zone-debug-panel');
      if(existing) existing.remove();
      const panel = document.createElement('div');
      panel.id = 'zone-debug-panel';
      panel.style.position = 'fixed';
      panel.style.left = '12px';
      panel.style.top = '12px';
      panel.style.width = '320px';
      panel.style.maxHeight = '60vh';
      panel.style.overflow = 'auto';
      panel.style.background = 'rgba(20,20,20,0.9)';
      panel.style.color = '#e6e6e6';
      panel.style.fontSize = '12px';
      panel.style.padding = '8px';
      panel.style.borderRadius = '8px';
      panel.style.zIndex = 999999;
      panel.style.boxShadow = '0 6px 18px rgba(0,0,0,0.4)';
      panel.style.fontFamily = 'system-ui, sans-serif';

      const header = document.createElement('div');
      header.style.fontWeight = '600';
      header.style.marginBottom = '6px';
      header.textContent = 'ZONE DEBUG';
      panel.appendChild(header);

      const info = document.createElement('div');
      info.style.fontSize = '11px';
      info.style.marginBottom = '8px';
      info.textContent = 'Use sliders to override digestPath boundaries (percent of path length).';
      panel.appendChild(info);

      // helper to create a slider row
      function makeSlider(id,label,initialPct){
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.gap = '4px';
        row.style.marginBottom = '8px';
        const lab = document.createElement('label');
        lab.textContent = label;
        lab.style.fontSize = '11px';
        row.appendChild(lab);
        const ctrl = document.createElement('input');
        ctrl.type = 'range';
        ctrl.min = '0'; ctrl.max = '100'; ctrl.step = '0.1';
        ctrl.value = String(initialPct);
        ctrl.id = id;
        ctrl.style.width = '100%';
        row.appendChild(ctrl);
        const read = document.createElement('div');
        read.style.fontSize = '11px';
        read.style.opacity = '0.9';
        read.textContent = `${initialPct.toFixed(1)}%`;
        row.appendChild(read);
        ctrl.addEventListener('input', ()=>{ read.textContent = `${Number(ctrl.value).toFixed(1)}%`; applyZoneOverridesFromSliders(); });
        return {row, ctrl, read};
      }

  // compute initial percentages from the current active zone values (which
  // may already have been overridden by ZONE_OVERRIDES). Fall back to
  // the originally-detected _orig values when a current value isn't set.
  const toPct = v => (pathLen>0 ? (v/pathLen*100) : 0);
  const mouthEndPct = toPct((typeof mouthEnd === 'number' && !isNaN(mouthEnd)) ? mouthEnd : (_orig.mouthEnd || 0));
  const esophagusEndPct = toPct((typeof esophEnd === 'number' && !isNaN(esophEnd)) ? esophEnd : (_orig.stomachStart || 0));
  const stomachEndPct = toPct((typeof stomachEnd === 'number' && !isNaN(stomachEnd)) ? stomachEnd : (_orig.stomachEnd || 0));
  const smallEndPct = toPct((typeof smallEnd === 'number' && !isNaN(smallEnd)) ? smallEnd : (_orig.smallEnd || 0));

      const sMouth = makeSlider('dbg-mouthEnd','Mouth end (%)', mouthEndPct);
      const sEsoph = makeSlider('dbg-esophEnd','Esophagus end (%)', esophagusEndPct);
      const sStomach = makeSlider('dbg-stomachEnd','Stomach end (%)', stomachEndPct);
      const sSmall = makeSlider('dbg-smallEnd','Small intestine end (%)', smallEndPct);

      panel.appendChild(sMouth.row);
      panel.appendChild(sEsoph.row);
      panel.appendChild(sStomach.row);
      panel.appendChild(sSmall.row);

      const btnRow = document.createElement('div');
      btnRow.style.display='flex'; btnRow.style.gap='8px'; btnRow.style.marginTop='6px';
      const reset = document.createElement('button'); reset.textContent='Reset';
      reset.style.fontSize='12px'; reset.addEventListener('click', ()=>{ sMouth.ctrl.value = String(mouthEndPct); sMouth.read.textContent = `${mouthEndPct.toFixed(1)}%`; sEsoph.ctrl.value = String(esophagusEndPct); sEsoph.read.textContent = `${esophagusEndPct.toFixed(1)}%`; sStomach.ctrl.value = String(stomachEndPct); sStomach.read.textContent = `${stomachEndPct.toFixed(1)}%`; sSmall.ctrl.value = String(smallEndPct); sSmall.read.textContent = `${smallEndPct.toFixed(1)}%`; applyZoneOverridesFromSliders(); });
      const close = document.createElement('button'); close.textContent='Close'; close.style.fontSize='12px'; close.addEventListener('click', ()=>{ panel.remove(); drawSmallIntestineDebugMarkers(); });
      btnRow.appendChild(reset); btnRow.appendChild(close);
      panel.appendChild(btnRow);

      // expose controls to window for console tweaking
      window.__zoneDebugControls = {sMouth, sEsoph, sStomach, sSmall};

      document.body.appendChild(panel);
      // initial apply
      applyZoneOverridesFromSliders();
    }catch(e){ console && console.warn && console.warn('zone debug panel error', e); }
  }

  function applyZoneOverridesFromSliders(){
    try{
      const c = window.__zoneDebugControls;
      if(!c) return;
      // read percent values, ensure monotonic increasing order
      let mEnd = Math.max(0, Math.min(100, Number(c.sMouth.ctrl.value)));
      let eEnd = Math.max(mEnd, Math.min(100, Number(c.sEsoph.ctrl.value)));
      let stEnd = Math.max(eEnd, Math.min(100, Number(c.sStomach.ctrl.value)));
      let smEnd = Math.max(stEnd, Math.min(100, Number(c.sSmall.ctrl.value)));

      // convert to lengths and enforce monotonicity
      mouthStart = 0; mouthEnd = (mEnd/100) * pathLen;
      esophStart = mouthEnd; esophEnd = (eEnd/100) * pathLen;
      stomachStart = esophEnd; stomachEnd = (stEnd/100) * pathLen;
      smallStart = stomachEnd; smallEnd = (smEnd/100) * pathLen;

      // redraw markers
      drawSmallIntestineDebugMarkers();
    }catch(e){/*ignore*/}
  }

  if(DEBUG){ createZoneDebugPanel(); }
  // always create speed control UI so users can pause or change simulation speed
  try{ createSpeedControlPanel(); }catch(e){/*ignore*/}

  // determine if path starts inside mouth polygon/bbox (prevents immediate conversion)
  const startsInMouth = (()=>{
    const p0 = path.getPointAtLength(0);
    const poly = getElementPolygon(mouthEl);
    if(poly && poly.length >= 3) return pointInPolygon(p0, poly);
    const b = mouthEl.getBBox();
    return (p0.y >= b.y && p0.y <= b.y + b.height);
  })();

  function svgPointToScreen(pt){
    const r = svg.getBoundingClientRect();
    const scaleX = r.width / viewBox.width;
    const scaleY = r.height / viewBox.height;
    return {
      x: r.left + pt.x * scaleX,
      y: r.top + pt.y * scaleY
    };
  }
  // helper: create an inline SVG chain of flat-top hexagons
  function createHexChainSVG(count, r = SIZES.hex.r, gap = SIZES.hex.gap, fill = SIZES.hex.fill, stroke = SIZES.hex.stroke){
    const sqrt3 = Math.sqrt(3);
    const horiz = r * SIZES.hex.horizFactor; // horizontal spacing between centers
    const width = (count - 1) * horiz + r * 2 + gap * (count - 1);
    const height = r * sqrt3 + SIZES.hex.extraHeight;
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svgEl.setAttribute('width', width);
    svgEl.setAttribute('height', height);
    svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgEl.setAttribute('aria-hidden','true');

    for(let i=0;i<count;i++){
      const cx = r + i * (horiz + gap);
      const cy = height/2;
      const points = [
        [cx + r, cy],
        [cx + r/2, cy + r*sqrt3/2],
        [cx - r/2, cy + r*sqrt3/2],
        [cx - r, cy],
        [cx - r/2, cy - r*sqrt3/2],
        [cx + r/2, cy - r*sqrt3/2]
      ].map(p=>p.join(',')).join(' ');
      const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
      poly.setAttribute('points', points);
      poly.setAttribute('fill', fill);
      poly.setAttribute('stroke', stroke);
      poly.setAttribute('stroke-width', '0.5');
      poly.setAttribute('class','svg-hex');
      svgEl.appendChild(poly);
    }
    return svgEl;
  }

  // helper: create an inline SVG chain for amino-acid shapes (alternating circle/rect)
  // create amino chain SVG from an ordered sequence of shapes
  // seq: array of shape strings: 'triangle'|'square'|'diamond'|'circle'
  function createAminoChainSVGFromSequence(seq, r = SIZES.aa.r){
    const n = seq.length;
    // lay out shapes along a gentle Bezier curve from left to right
    const width = Math.max(60, n * (r*2 + 6));
    const height = r * 3 + 10;
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svgEl.setAttribute('width', width);
    svgEl.setAttribute('height', height);
    svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgEl.setAttribute('aria-hidden','true');

    // define a simple cubic Bezier curve control points
    const p0 = {x: r, y: height*0.6};
    const p3 = {x: width - r, y: height*0.6};
    const cp1 = {x: width*0.25, y: height*0.2};
    const cp2 = {x: width*0.75, y: height*0.95};

    function bezier(t){
      const x = Math.pow(1-t,3)*p0.x + 3*Math.pow(1-t,2)*t*cp1.x + 3*(1-t)*Math.pow(t,2)*cp2.x + Math.pow(t,3)*p3.x;
      const y = Math.pow(1-t,3)*p0.y + 3*Math.pow(1-t,2)*t*cp1.y + 3*(1-t)*Math.pow(t,2)*cp2.y + Math.pow(t,3)*p3.y;
      return {x,y};
    }

    // helper: compute a color for an amino-acid shape using same hue but varying saturation/lightness
    function aaColor(shape){
      const hue = (SIZES.aaHue || 8); // base hue (red-orange)
      const map = {
        'circle': [60, 50],
        'square': [75, 44],
        'diamond': [50, 56],
        'triangle': [85, 40]
      };
      const vals = map[shape] || [65,50];
      const sat = vals[0];
      const light = vals[1];
      return `hsl(${hue} ${sat}% ${light}%)`;
    }

    // compute positions for all residues first so we can draw a connecting link
    // positions are sampled along the base bezier but we add a configurable
    // sinusoidal offset to the y coordinate to create a more curved/wavy chain.
    // To allow tuning density (how close residues are), we support SIZES.aa.span
    // which compresses the t-range used to sample the bezier. span in (0,1].
    const positions = [];
    const span = (SIZES.aa.span !== undefined) ? SIZES.aa.span : 1;
    const startT = (1 - span) / 2; // center the sampling window
    for(let i=0;i<n;i++){
      const t = (n===1) ? 0.5 : (startT + (i/(n-1)) * span);
      const base = bezier(t);
      // normalize wave phase across the sampling window so waves behave consistently
      const localT = (span > 0) ? ((t - startT) / span) : 0;
      const wave = (SIZES.aa.curveAmplitude || 0) * Math.sin(localT * Math.PI * 2 * (SIZES.aa.curveWaves || 1));
      positions.push({ x: base.x, y: base.y + wave });
    }

    // draw a smooth linking path between amino-acid centers using Catmull-Rom -> Bezier
    let linkPath = null;
    if(positions.length > 1){
      // convert array of {x,y} into a smooth cubic-bezier path that passes through all points
      function catmullRom2bezier(pts){
        const d = pts;
        const n = d.length;
        if(n === 0) return '';
        if(n === 1) return `M ${d[0].x} ${d[0].y}`;
        if(n === 2) return `M ${d[0].x} ${d[0].y} L ${d[1].x} ${d[1].y}`;
        let path = `M ${d[0].x} ${d[0].y}`;
        for(let i=0;i<n-1;i++){
          const p0 = i > 0 ? d[i-1] : d[i];
          const p1 = d[i];
          const p2 = d[i+1];
          const p3 = i+2 < n ? d[i+2] : p2;
          // Catmull-Rom to Bezier conversion (standard tension = 0.5 -> divide by 6)
          const c1x = p1.x + (p2.x - p0.x) / 6;
          const c1y = p1.y + (p2.y - p0.y) / 6;
          const c2x = p2.x - (p3.x - p1.x) / 6;
          const c2y = p2.y - (p3.y - p1.y) / 6;
          path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
        }
        return path;
      }

  const dAttr = catmullRom2bezier(positions);
  // assign to outer-scoped linkPath (avoid shadowing with const)
  linkPath = document.createElementNS('http://www.w3.org/2000/svg','path');
  linkPath.setAttribute('d', dAttr);
      linkPath.setAttribute('fill', 'none');
      linkPath.setAttribute('stroke', SIZES.aa.linkColor || 'rgba(0,0,0,0.35)');
      linkPath.setAttribute('stroke-width', String(SIZES.aa.linkWidth || Math.max(1, r*0.45)));
      linkPath.setAttribute('stroke-linecap', 'round');
      linkPath.setAttribute('stroke-linejoin', 'round');
      linkPath.setAttribute('stroke-opacity', String(SIZES.aa.linkOpacity ?? 0.95));
      linkPath.setAttribute('pointer-events', 'none');
      linkPath.setAttribute('class', 'svg-aa-link');
    }

    // now render each residue on top of the link
    for(let i=0;i<n;i++){
      const pos = positions[i];
      const shape = seq[i];
      const fill = aaColor(shape);
      if(shape === 'circle'){
        const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
        c.setAttribute('cx', pos.x);
        c.setAttribute('cy', pos.y);
        c.setAttribute('r', r*0.8);
        c.setAttribute('fill', fill);
        c.setAttribute('class','svg-aa');
        svgEl.appendChild(c);
      }else if(shape === 'square'){
        const s = document.createElementNS('http://www.w3.org/2000/svg','rect');
        const side = r*1.4;
        s.setAttribute('x', pos.x - side/2);
        s.setAttribute('y', pos.y - side/2);
        s.setAttribute('width', side);
        s.setAttribute('height', side);
        s.setAttribute('rx', side*0.15);
        s.setAttribute('fill', fill);
        s.setAttribute('class','svg-aa');
        svgEl.appendChild(s);
      }else if(shape === 'diamond'){
        const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
        const w = r*1.6;
        const h = r*1.6;
        const pts = [
          [pos.x, pos.y - h/2],
          [pos.x + w/2, pos.y],
          [pos.x, pos.y + h/2],
          [pos.x - w/2, pos.y]
        ].map(p=>p.join(',')).join(' ');
        poly.setAttribute('points', pts);
        poly.setAttribute('fill', fill);
        poly.setAttribute('class','svg-aa');
        svgEl.appendChild(poly);
      }else{ // triangle
        const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
        const w = r*1.6;
        const h = r*1.4;
        const pts = [
          [pos.x, pos.y - h/2],
          [pos.x - w/2, pos.y + h/2],
          [pos.x + w/2, pos.y + h/2]
        ].map(p=>p.join(',')).join(' ');
        poly.setAttribute('points', pts);
        poly.setAttribute('fill', fill);
        poly.setAttribute('class','svg-aa');
        svgEl.appendChild(poly);
      }
    }
    // append link on top if requested
    if(linkPath && (SIZES.aa.linkPlace === 'over')){
      svgEl.appendChild(linkPath);
    }else if(linkPath){
      // ensure link is underneath shapes
      svgEl.insertBefore(linkPath, svgEl.firstChild);
    }
    return svgEl;
  }

  // compatibility alias: older code may call createAminoChainSVG — forward to the new function
  window.createAminoChainSVG = createAminoChainSVGFromSequence;

  // generate a random amino-acid sequence of given length using the allowed shapes
  function generateAminoSequence(n){
    const shapes = ['triangle','square','diamond','circle'];
    const seq = [];
    for(let i=0;i<n;i++) seq.push(shapes[Math.floor(Math.random()*shapes.length)]);
    return seq;
  }

  // partition a sequence into groups of size 2 or 3 preserving order
  function partitionSequence(seq){
    const out = [];
    let i = 0;
    while(i < seq.length){
      const remaining = seq.length - i;
      // choose size 2 or 3, but ensure we don't leave a remainder of 1
      let size = (Math.random() < 0.5) ? 2 : 3;
      if(remaining === 4) size = 2; // prefer 2+2 rather than 3+1
      if(remaining === 2) size = 2;
      if(remaining === 3) size = 3;
      if(size > remaining) size = remaining;
      out.push(seq.slice(i, i+size));
      i += size;
    }
    return out;
  }

  function createMovingToken(type,label){
    const el = document.createElement('div');
    el.className = `moving ${type}`;
    el.style.left = '0px';
    el.style.top = '0px';

    if(type === 'carb'){
      // start as a starch chain (6 hexagons)
      const initialGlc = SIZES.token.initialGlc; // number of glucose units in this starch token
      const svgChain = createHexChainSVG(initialGlc, SIZES.hex.r, 0, SIZES.hex.fill);
      // store original glucose count for later conversions
      el.dataset.glucoseCount = String(initialGlc);
      el.appendChild(svgChain);
      el.title = '澱粉 (多醣)';
    }else if(type === 'protein'){
      // start as a protein chain composed of several amino-acid shapes
      const initialAA = SIZES.token.initialAA; // user requested amino acids per protein
      const seq = generateAminoSequence(initialAA);
      const svgChain = createAminoChainSVGFromSequence(seq, SIZES.aa.smallR);
      el.dataset.aminoCount = String(initialAA);
      el.dataset.aminoSeq = JSON.stringify(seq);
      el.appendChild(svgChain);
      el.title = '蛋白質 (多肽鏈)';
    }else if(type === 'fat'){
      // render a triglyceride: one glycerol block + three fatty-acid tails
      const svgTrig = createTriglycerideSVG();
      // store counts for later conversion
      el.dataset.glycerolCount = '1';
      el.dataset.fattyCount = '3';
      el.appendChild(svgTrig);
      el.title = '脂質 (三酸甘油酯)';
    }else{
      el.innerText = label;
    }

    document.body.appendChild(el);
    return el;
  }

  // create an inline SVG representing a triglyceride: one large glycerol rect and three long thin fatty-acid rects
  function createTriglycerideSVG(glycerolWidth = SIZES.trig.glycerolWidth, faHeight = SIZES.trig.faHeight){
    // overall layout: glycerol block on top, three vertical fatty-acid tails below (like comb teeth)
  const faW = Math.max(SIZES.trig.fattyAcidMinWidth, faHeight); // thin tail width
  const faH = faHeight * SIZES.trig.fattyAcidHeightMultiplier; // tail length
    const gap = SIZES.trig.gap;
    const contentWidth = Math.max(glycerolWidth, faW * 3 + gap * 2);
    const width = contentWidth + SIZES.trig.svgPadding;
    const height = glycerolWidth + SIZES.trig.svgPadding + faH;
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svgEl.setAttribute('width', width);
    svgEl.setAttribute('height', height);
    svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgEl.setAttribute('aria-hidden','true');

    // glycerol block centered at top
  const glycerol = document.createElementNS('http://www.w3.org/2000/svg','rect');
  const gx = (width - glycerolWidth) / 2;
  const gy = 2;
  glycerol.setAttribute('x', gx);
  glycerol.setAttribute('y', gy);
  glycerol.setAttribute('width', SIZES.trig.glycerolRectW);
  glycerol.setAttribute('height', SIZES.trig.glycerolRectH);
  glycerol.setAttribute('rx', SIZES.trig.glycerolCornerRadius);
    glycerol.setAttribute('fill', 'hsl(40 70% 55%)'); // warm golden glycerol
    glycerol.setAttribute('class','svg-fat-gly');
    svgEl.appendChild(glycerol);

    // three fatty acid tails below the glycerol block
    const startX = (width - (faW * 3 + gap * 2)) / 2;
  // allow an explicit offset (tunable via SIZES.trig.fattyAcidYOffset) so
  // fatty-acid tails can be nudged vertically without changing glycerol geometry
  const tailY = gy + glycerolWidth - SIZES.trig.glycerolRectH + (SIZES.trig.fattyAcidYOffset || 0);
    for(let i=0;i<3;i++){
      const fa = document.createElementNS('http://www.w3.org/2000/svg','rect');
      const x = startX + i * (faW + gap);
      fa.setAttribute('x', x);
      fa.setAttribute('y', tailY);
      fa.setAttribute('width', faW);
      fa.setAttribute('height', faH);
      fa.setAttribute('rx', 2);
      fa.setAttribute('fill', 'hsl(40 65% 45%)'); // slightly darker tails
      fa.setAttribute('class','svg-fat-fa');
      svgEl.appendChild(fa);
    }
    return svgEl;
  }

  // create fat child element: either glycerol or fatty-acid ('gly' or 'fa')
  function createFatChild(kind){
    const el = document.createElement('div');
    el.className = `moving child fat-child ${kind}`;
    el.style.left = '0px'; el.style.top = '0px';
    el.dataset.type = 'fat';
    if(kind === 'gly'){
      el.dataset.glycerol = '1';
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('width', SIZES.trig.glycerolRectW);
      svg.setAttribute('height', SIZES.trig.glycerolRectH);
      svg.setAttribute('viewBox', `0 0 ${SIZES.trig.glycerolRectW} ${SIZES.trig.glycerolRectH}`);
      const r = document.createElementNS('http://www.w3.org/2000/svg','rect');
      r.setAttribute('x',0);
      r.setAttribute('y',0);
      r.setAttribute('width', SIZES.trig.glycerolRectW);
      r.setAttribute('height', SIZES.trig.glycerolRectH);
  r.setAttribute('rx', SIZES.trig.glycerolCornerRadius);
      r.setAttribute('fill','hsl(40 70% 55%)');
      svg.appendChild(r);
      el.appendChild(svg);
    }else{
      el.dataset.fatty = '1';
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      // vertical thin rectangle for fatty acid
      svg.setAttribute('width', SIZES.trig.faSvg.width);
      svg.setAttribute('height', SIZES.trig.faSvg.height);
      svg.setAttribute('viewBox', `0 0 ${SIZES.trig.faSvg.width} ${SIZES.trig.faSvg.height}`);
      const r = document.createElementNS('http://www.w3.org/2000/svg','rect');
      r.setAttribute('x',2); r.setAttribute('y',0); r.setAttribute('width', SIZES.trig.faSvg.width - 4); r.setAttribute('height', SIZES.trig.faSvg.height - 4); r.setAttribute('rx',3);
      r.setAttribute('fill','hsl(40 65% 45%)');
      svg.appendChild(r);
      el.appendChild(svg);
    }
    document.body.appendChild(el);
    return el;
  }

  // Create a small moving child token (detached) representing unitSize glucose units (1 or 2)
  function createMovingChild(unitSize, fill, kind='carb'){
    const el = document.createElement('div');
    el.className = `moving child ${kind}-child`;
    el.style.left = '0px';
    el.style.top = '0px';
  el.style.padding = SIZES.child.padding;
  el.style.borderRadius = SIZES.child.borderRadius;
    el.style.background = 'transparent';
    el.dataset.type = kind;
    if(kind === 'carb'){
      el.dataset.glucoseCount = String(unitSize);
      const svg = createHexChainSVG(unitSize, unitSize===1 ? SIZES.aa.smallR : SIZES.hex.r, 0, fill);
      el.appendChild(svg);
    }else if(kind === 'protein'){
      el.dataset.aminoCount = String(unitSize);
      // if a sequence is already provided, render it; otherwise render a placeholder sequence of circles
      let seq = null;
      try{ seq = el.dataset.aminoSeq ? JSON.parse(el.dataset.aminoSeq) : null; }catch(e){ seq = null; }
      if(seq && Array.isArray(seq)){
        el.appendChild(createAminoChainSVGFromSequence(seq, unitSize===1 ? SIZES.aa.smallR : SIZES.aa.r));
      }else{
        const placeholder = new Array(unitSize).fill('circle');
        el.appendChild(createAminoChainSVGFromSequence(placeholder, unitSize===1 ? SIZES.aa.smallR : SIZES.aa.r));
      }
    }
    document.body.appendChild(el);
    return el;
  }

  // Animate a detached child along the path starting at `startLen` for remaining duration
  function animateChildAlongPath(childEl, startLen, baseRemainingDuration, label){
    let startTime = null;
    let lastFrameTs = null;
    const start = Math.max(0, startLen);
    const remaining = Math.max(50, baseRemainingDuration || 2000);
    let converted = false;

    // children should not travel all the way to the very end of the digestive path
    // — they should disappear before entering the large intestine. Use the
    // small intestine end (`smallEnd`) as the cutoff. If smallEnd is not
    // available, fall back to the full path length.
    const childEndCutoff = (typeof smallEnd === 'number' && !isNaN(smallEnd)) ? Math.max(0, Math.min(pathLen, smallEnd)) : pathLen;

    // if the start position is already at/after the cutoff, fade immediately
    if(start >= childEndCutoff){
      childEl.style.transition = 'opacity 400ms ease, transform 400ms ease';
      childEl.style.opacity = '0';
      setTimeout(()=>childEl.remove(), 450);
      return;
    }

    // absorption scheduling: single-unit small molecules should be absorbed
    // when they enter the small intestine (smallStart). We schedule a small
    // randomized delay per child to avoid them all disappearing simultaneously.
    let absorptionScheduled = false;

    function step(ts){
      if(!startTime){ startTime = ts; lastFrameTs = ts; }
      if(lastFrameTs === null) lastFrameTs = ts;
      // if paused, advance startTime so elapsed does not include paused duration
      if(SIM_PAUSED){ startTime += (ts - lastFrameTs); lastFrameTs = ts; requestAnimationFrame(step); return; }
      const elapsed = ts - startTime;
      // apply speed multiplier: effective elapsed scales with SIM_SPEED
      const effectiveElapsed = elapsed * (typeof SIM_SPEED === 'number' ? SIM_SPEED : 1);
      const t = Math.min(1, effectiveElapsed / remaining);
      lastFrameTs = ts;
      // limit child travel to the small-intestine cutoff instead of full path
      const len = start + t * (Math.max(start, childEndCutoff) - start);
      // If this is a single-unit small molecule (e.g. glucose or single AA)
      // and it has crossed into the small intestine, schedule absorption.
      // Use dataset signals to detect unit children (glucoseCount==1 or aminoCount==1).
  const isCarbSingle = (childEl.dataset.type === 'carb') && (parseInt(childEl.dataset.glucoseCount||'1',10) === 1);
  const isProteinSingle = (childEl.dataset.type === 'protein') && (parseInt(childEl.dataset.aminoCount||'1',10) === 1);
  // fats are created as single-unit children (glycerol or fatty-acid). Treat
  // them as single-unit small molecules for absorption purposes so that
  // glycerol and fatty acids also randomly disappear in the latter 50%.
  const isFatSingle = (childEl.dataset.type === 'fat') && (childEl.dataset.glycerol === '1' || childEl.dataset.fatty === '1');
  const shouldAbsorb = !absorptionScheduled && (isCarbSingle || isProteinSingle || isFatSingle);
      if(shouldAbsorb){
        // New behavior: absorption is probabilistic and increases with
        // proximity to smallEnd. If smallStart/smallEnd are available, compute
        // a normalized position p in [0..1] and use a configurable curve to
        // derive the per-step chance to absorb. If the zones are not
        // available, fall back to the previous margin-based cutoff.
        if(typeof smallStart === 'number' && typeof smallEnd === 'number' && !isNaN(smallStart) && !isNaN(smallEnd) && (smallEnd > smallStart)){
          // only allow probabilistic absorption in the latter half of the small intestine
          const smallMid = smallStart + 0.5 * (smallEnd - smallStart);
          if(len >= smallMid && len <= smallEnd){
            // normalize p across smallMid..smallEnd so chance only increases within the latter half
            const p = (smallEnd > smallMid) ? ((len - smallMid) / (smallEnd - smallMid)) : 1;
            const baseProb = (SIZES && SIZES.split && typeof SIZES.split.absorbBaseProb === 'number') ? SIZES.split.absorbBaseProb : 0.02;
            const maxProb = (SIZES && SIZES.split && typeof SIZES.split.absorbMaxProb === 'number') ? SIZES.split.absorbMaxProb : 0.9;
            const exp = (SIZES && SIZES.split && typeof SIZES.split.absorbProbExponent === 'number') ? SIZES.split.absorbProbExponent : 2;
            const chance = Math.min(1, Math.max(0, baseProb + (maxProb - baseProb) * Math.pow(Math.max(0, Math.min(1, p)), exp)));
            if(Math.random() < chance){
              absorptionScheduled = true;
              const stagger = 50 + Math.floor(Math.random() * 400);
              setTimeout(()=>{
                try{
                  childEl.style.transition = 'opacity 400ms ease, transform 400ms ease';
                  childEl.style.opacity = '0';
                  setTimeout(()=>{ try{ childEl.remove(); }catch(_){/*ignore*/} }, 450);
                }catch(e){/*ignore*/}
              }, stagger);
            }
          }
        }else{
          const margin = (SIZES && SIZES.split && SIZES.split.absorbMargin) ? SIZES.split.absorbMargin : 8;
          const absorbThreshold = Math.max(0, childEndCutoff - margin);
          if(len >= absorbThreshold){
            absorptionScheduled = true;
            const stagger = 50 + Math.floor(Math.random() * 400);
            setTimeout(()=>{
              try{
                childEl.style.transition = 'opacity 400ms ease, transform 400ms ease';
                childEl.style.opacity = '0';
                setTimeout(()=>{ try{ childEl.remove(); }catch(_){/*ignore*/} }, 450);
              }catch(e){/*ignore*/}
            }, stagger);
          }
        }
      }
      const pt = path.getPointAtLength(len);
      const screen = svgPointToScreen(pt);
      childEl.style.left = `${screen.x}px`;
      childEl.style.top = `${screen.y}px`;
      childEl.style.transform = 'translate(-50%,-50%)';

      // if this child represents multiple units, convert when reaching small intestine
      const kind = childEl.dataset.type || 'carb';
      if(kind === 'carb'){
        const gCount = parseInt(childEl.dataset.glucoseCount||'1',10);
        if(!converted && gCount > 1 && len >= smallStart && len <= smallEnd){
          converted = true;
          convertChildToGlucose(childEl, len, Math.max(300, remaining*(1-t)));
          return; // child will be removed by conversion
        }
      }else if(kind === 'protein'){
        const aCount = parseInt(childEl.dataset.aminoCount||'1',10);
        // polypeptides (aCount>1) split into single amino acids in small intestine
        if(!converted && aCount > 1 && len >= smallStart && len <= smallEnd){
          converted = true;
          convertChildToAminoAcids(childEl, len, Math.max(300, remaining*(1-t)));
          return;
        }
      }

      if(t < 1){
        requestAnimationFrame(step);
      }else{
        childEl.style.transition = 'opacity 700ms ease, transform 700ms ease';
        childEl.style.opacity = '0';
        setTimeout(()=>childEl.remove(),900);
      }
    }
    requestAnimationFrame(step);
  }

  // Convert a detached maltose child into individual glucose detached children
  function convertChildToGlucose(childEl, atLen, remainingDuration){
    // idempotent guard
    if(childEl.dataset._converted) return;
    childEl.dataset._converted = 'toGlucose';
    const gCount = parseInt(childEl.dataset.glucoseCount||'2',10);
    debugLog('convertChildToGlucose', {gCount, atLen, remainingDuration, dataset: childEl.dataset});
    // create gCount new child tokens (single glucose) and animate them from atLen
    for(let i=0;i<gCount;i++){
      const gl = createMovingChild(1,'#6f6fe0');
      // annotate and flash emitted glucose
      gl.dataset.emittedBy = 'convertChildToGlucose';
      debugFlash(gl, 'rgba(111,111,224,0.25)');
      // small speed variation
      const factor = 0.9 + Math.random()*0.3;
      animateChildAlongPath(gl, atLen + i*2, Math.max(400, remainingDuration*factor), '葡萄糖');
    }
    childEl.remove();
  }

  // Convert a detached polypeptide child into individual amino-acid detached children
  function convertChildToAminoAcids(childEl, atLen, remainingDuration){
    // preserve sequence order stored in dataset.aminoSeq if present
    const seq = childEl.dataset.aminoSeq ? JSON.parse(childEl.dataset.aminoSeq) : new Array(parseInt(childEl.dataset.aminoCount||'2',10)).fill('circle');
    for(let i=0;i<seq.length;i++){
      const shape = seq[i];
      const aa = createMovingChild(1,'#d85a5a','protein');
      // draw this aa shape specifically inside the child
      aa.innerHTML = '';
  aa.appendChild(createAminoChainSVGFromSequence([shape], SIZES.aa.smallR));
      aa.dataset.aminoSeq = JSON.stringify([shape]);
      const factor = 0.9 + Math.random()*0.3;
      animateChildAlongPath(aa, atLen + i*2, Math.max(350, remainingDuration*factor), '胺基酸');
    }
    childEl.remove();
  }

  // Convert token into maltose; if startLen provided, emit detached maltose child tokens that continue along path
  function convertToMaltose(el, startLen, remainingDuration){
    // idempotent guard: prevent double conversion
    if(el.dataset._converted) return;
    el.dataset._converted = 'maltose';
    const gCount = parseInt(el.dataset.glucoseCount || '6',10);
    // compute number of maltose (pairs) and whether there's a leftover glucose
    const maltoseUnits = Math.floor(gCount / 2);
    const remainder = gCount % 2;
    debugLog('convertToMaltose', {gCount, maltoseUnits, remainder, dataset: el.dataset});
    if(typeof startLen === 'number'){
      // emit maltose (pairs) first
      let offsetIndex = 0;
      for(let i=0;i<maltoseUnits;i++){
        const child = createMovingChild(2, '#9b8ef0');
        child.dataset.emittedBy = 'convertToMaltose';
        debugFlash(child, 'rgba(155,142,240,0.25)');
        const offsetLen = startLen + offsetIndex * 2;
        const factor = 0.85 + Math.random()*0.4; // speed variation
        animateChildAlongPath(child, offsetLen, Math.max(300, remainingDuration * factor), '麥芽糖');
        offsetIndex++;
      }
      // if there's a leftover single glucose, emit it as a single-glucose child
      if(remainder === 1){
        const single = createMovingChild(1, '#6f6fe0');
        single.dataset.emittedBy = 'convertToMaltose';
        debugFlash(single, 'rgba(111,111,224,0.25)');
        const factor = 0.9 + Math.random()*0.3;
        animateChildAlongPath(single, startLen + offsetIndex * 2, Math.max(300, remainingDuration * factor), '葡萄糖');
      }
      // remove original token element
      el.remove();
    }else{
      // fallback: inline split visuals showing maltose pairs and optional leftover glucose
      // build a split container similar to splitIntoElements but allow mixed unit sizes
      el.innerHTML = '';
      const splitContainer = document.createElement('div');
      splitContainer.className = 'split-container';
      splitContainer.style.position = 'relative';
      splitContainer.style.display = 'flex';
      splitContainer.style.gap = String(SIZES.split.gap || 8) + 'px';
      splitContainer.style.alignItems = 'center';

      // maltose (pairs)
      for(let i=0;i<maltoseUnits;i++){
        const child = document.createElement('div');
        child.className = 'split-mol';
        child.style.width = 'auto';
        child.style.height = 'auto';
        child.style.display = 'inline-block';
        child.style.transition = 'transform 420ms cubic-bezier(.2,.9,.2,1), opacity 420ms ease';
        child.setAttribute('aria-hidden','false');
        const svgUnit = createHexChainSVG(2, SIZES.hex.r, 0, '#9b8ef0');
        child.appendChild(svgUnit);
        splitContainer.appendChild(child);
      }
      // leftover single glucose, if any
      if(remainder === 1){
        const child = document.createElement('div');
        child.className = 'split-mol';
        child.style.width = 'auto';
        child.style.height = 'auto';
        child.style.display = 'inline-block';
        child.style.transition = 'transform 420ms cubic-bezier(.2,.9,.2,1), opacity 420ms ease';
        child.setAttribute('aria-hidden','false');
        const svgUnit = createHexChainSVG(1, SIZES.hex.smallR, 0, '#6f6fe0');
        child.appendChild(svgUnit);
        splitContainer.appendChild(child);
      }
      el.appendChild(splitContainer);
      el.title = '麥芽糖 / 葡萄糖 (分解結果)';
      // slight separation animation: spread children horizontally a bit
      requestAnimationFrame(()=>{
        const children = splitContainer.children;
        const total = children.length;
        for(let i=0;i<total;i++){
          const c = children[i];
          const mid = (total-1)/2;
          const idx = i - mid;
          const x = idx * (SIZES.split.spread || 8);
          const y = Math.abs(idx) * 1;
          c.style.transform = `translate(${x}px, ${y}px)`;
        }
      });
    }
  }

  // Convert token into polypeptides; if startLen provided, emit detached polypeptide child tokens that continue along path
  function convertToPolypeptide(el, startLen, remainingDuration){
    // get sequence and partition into groups of 2 or 3 while preserving order
    const seq = el.dataset.aminoSeq ? JSON.parse(el.dataset.aminoSeq) : new Array(parseInt(el.dataset.aminoCount||'6',10)).fill('circle');
    const groups = partitionSequence(seq);
  if(el.dataset._converted) return;
  el.dataset._converted = 'polypeptide';
  if(typeof startLen === 'number'){
      for(let i=0;i<groups.length;i++){
        const grp = groups[i];
        const child = createMovingChild(grp.length, '#d85a5a', 'protein');
        // store the sequence for this child so later splitting preserves order
        child.dataset.aminoSeq = JSON.stringify(grp);
        // update visual to reflect real subsequence
  child.innerHTML = '';
  child.appendChild(createAminoChainSVGFromSequence(grp, SIZES.aa.r));
        const offsetLen = startLen + i * 2;
        const factor = 0.85 + Math.random()*0.4;
        animateChildAlongPath(child, offsetLen, Math.max(300, remainingDuration * factor), '多肽');
      }
      el.remove();
    }else{
      // fallback: inline groups visual (uses first element of each group)
      const units = groups.map(g=>g.length);
      splitIntoElements(el, units.length, {unitSize:3, fill:'#d85a5a', label:'多肽'});
    }
  }

  // Convert token into glucose; if startLen provided, emit detached glucose child tokens that continue along path
  function convertToGlucose(el, startLen, remainingDuration){
    if(el.dataset._converted) return;
    el.dataset._converted = 'glucose';
    const gCount = parseInt(el.dataset.glucoseCount || '6',10);
    debugLog('convertToGlucose', {gCount, startLen, remainingDuration, dataset: el.dataset});
    if(typeof startLen === 'number'){
      for(let i=0;i<gCount;i++){
        const child = createMovingChild(1, '#6f6fe0');
        child.dataset.emittedBy = 'convertToGlucose';
        debugFlash(child, 'rgba(111,111,224,0.25)');
        const offsetLen = startLen + i * 2;
        const factor = 0.9 + Math.random()*0.4;
        animateChildAlongPath(child, offsetLen, Math.max(200, remainingDuration * factor), '葡萄糖');
      }
      el.remove();
    }else{
      // fallback: inline split
      splitIntoElements(el, gCount, {unitSize:1, fill:'#6f6fe0', label:'葡萄糖 (單糖)'});
    }
  }

  // Convert token into amino acids (used when a whole protein token reaches small intestine without prior stomach split)
  function convertToAminoAcids(el, startLen, remainingDuration){
    if(el.dataset._converted) return;
    el.dataset._converted = 'aminoacids';
    const seq = el.dataset.aminoSeq ? JSON.parse(el.dataset.aminoSeq) : new Array(parseInt(el.dataset.aminoCount||'6',10)).fill('circle');
    if(typeof startLen === 'number'){
      for(let i=0;i<seq.length;i++){
        const shape = seq[i];
        const child = createMovingChild(1, '#d85a5a', 'protein');
        child.innerHTML = '';
  child.appendChild(createAminoChainSVGFromSequence([shape], SIZES.aa.smallR));
        child.dataset.aminoSeq = JSON.stringify([shape]);
        const offsetLen = startLen + i * 2;
        const factor = 0.9 + Math.random()*0.4;
        animateChildAlongPath(child, offsetLen, Math.max(200, remainingDuration * factor), '胺基酸');
      }
      el.remove();
    }else{
      splitIntoElements(el, seq.length, {unitSize:1, fill:'#d85a5a', label:'胺基酸 (單體)'});
    }
  }

  // Convert triglyceride token into glycerol + fatty acids
  function convertToFat(el, startLen, remainingDuration){
    if(el.dataset._converted) return;
    el.dataset._converted = 'fat';
    const glycerolCount = parseInt(el.dataset.glycerolCount || '1', 10);
    const fattyCount = parseInt(el.dataset.fattyCount || '3', 10);
    if(typeof startLen === 'number'){
      // emit one glycerol then fatty acids as detached moving children
      let offsetIndex = 0;
      // glycerol
      for(let g=0; g<glycerolCount; g++){
        const gly = createFatChild('gly');
        const factor = 0.9 + Math.random()*0.3;
        animateChildAlongPath(gly, startLen + offsetIndex*2, Math.max(300, remainingDuration*factor), '甘油');
        offsetIndex++;
      }
      // fatty acids
      for(let i=0;i<fattyCount;i++){
        const fa = createFatChild('fa');
        const factor = 0.9 + Math.random()*0.3;
        animateChildAlongPath(fa, startLen + offsetIndex*2, Math.max(300, remainingDuration*factor), '脂肪酸');
        offsetIndex++;
      }
      el.remove();
    }else{
      // fallback inline small-mols representation
      el.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'small-mols';
      // glycerol swatch
      const g = document.createElement('span'); g.className='mol gly'; wrap.appendChild(g);
      // fatty acid swatches
      for(let i=0;i<fattyCount;i++){ const f=document.createElement('span'); f.className='mol'; f.style.background='#ffb86b'; wrap.appendChild(f); }
      el.appendChild(wrap);
      el.title = '甘油 + 脂肪酸 (小分子)';
    }
  }

  // split the token element into `count` child elements; each child will contain an inline SVG hex chain of length unitSize
  function splitIntoElements(containerEl, count, opts={unitSize:1, fill:'#6f6fe0', label:''}){
    const unitSize = opts.unitSize || 1;
    const fill = opts.fill || '#6f6fe0';
    const label = opts.label || '';

    // clear existing content and create a split container to hold children
    containerEl.innerHTML = '';
    const splitContainer = document.createElement('div');
    splitContainer.className = 'split-container';
    splitContainer.style.position = 'relative';
    splitContainer.style.display = 'flex';
    splitContainer.style.gap = '8px';
    splitContainer.style.alignItems = 'center';

    for(let i=0;i<count;i++){
      const child = document.createElement('div');
      child.className = 'split-mol';
      child.style.width = 'auto';
      child.style.height = 'auto';
      child.style.display = 'inline-block';
      child.style.transition = 'transform 420ms cubic-bezier(.2,.9,.2,1), opacity 420ms ease';
      child.setAttribute('aria-hidden','false');

      // create an SVG representing this unit
  const svgUnit = createHexChainSVG(unitSize, unitSize===1 ? SIZES.hex.smallR : SIZES.hex.largeR, 0, fill);
      child.appendChild(svgUnit);
      splitContainer.appendChild(child);
    }

    containerEl.appendChild(splitContainer);
    containerEl.title = label;

    // slight separation animation: spread children horizontally a bit
    requestAnimationFrame(()=>{
      const children = splitContainer.children;
      const total = children.length;
      for(let i=0;i<total;i++){
        const c = children[i];
        // compute offset centered around 0
        const mid = (total-1)/2;
        const idx = i - mid;
        const x = idx * 8; // spread distance
        const y = Math.abs(idx) * 1; // small vertical stagger
        c.style.transform = `translate(${x}px, ${y}px)`;
      }
    });
  }

  function convertVisual(el,type){
    // For non-carb types, keep previous small-mols behavior
    if(type === 'carb'){
      // fallback: convert directly to glucose
      convertToGlucose(el);
      return;
    }
    el.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'small-mols';
    if(type==='protein'){
      for(let i=0;i<5;i++){ const m=document.createElement('span'); m.className='mol aa'; wrap.appendChild(m); }
      el.title = '胺基酸 (小分子)';
    }else if(type==='fat'){
      const g=document.createElement('span'); g.className='mol gly'; wrap.appendChild(g);
      const f1=document.createElement('span'); f1.className='mol'; f1.style.background='#ffb86b'; wrap.appendChild(f1);
      const f2=document.createElement('span'); f2.className='mol'; f2.style.background='#ffdfb2'; wrap.appendChild(f2);
      el.title = '甘油 + 脂肪酸 (小分子)';
    }
    el.appendChild(wrap);
  }

  function animateAlongPath(type, duration=4500, label){
    const tokenEl = createMovingToken(type,label);
    let startTime = null;
    let mouthConverted = false;
    let stomachConverted = false;
    let smallConverted = false;
    let lastFrameTs = null;

    function step(timestamp){
      if(!startTime){ startTime = timestamp; lastFrameTs = timestamp; }
      if(lastFrameTs === null) lastFrameTs = timestamp;
      if(SIM_PAUSED){ startTime += (timestamp - lastFrameTs); lastFrameTs = timestamp; requestAnimationFrame(step); return; }
      // if the token element was removed by an earlier conversion, stop processing
      if(!tokenEl.isConnected) return;
      const elapsed = timestamp - startTime;
      const effectiveElapsed = elapsed * (typeof SIM_SPEED === 'number' ? SIM_SPEED : 1);
      const t = Math.min(1, effectiveElapsed/duration);
      lastFrameTs = timestamp;
      const len = t * pathLen;
      const pt = path.getPointAtLength(len);
      const screen = svgPointToScreen(pt);
      tokenEl.style.left = `${screen.x}px`;
      tokenEl.style.top = `${screen.y}px`;
      tokenEl.style.transform = 'translate(-50%,-50%)';

      // mouth conversion: starch -> maltose (paired glucose)
      if(!mouthConverted){
        // only convert if we enter mouth after starting (or after passing the mouth end)
        const insideMouthNow = (len >= mouthStart && len <= mouthEnd);
        const entryMargin = (SIZES && SIZES.split && typeof SIZES.split.entryMargin === 'number') ? SIZES.split.entryMargin : 2;
        const enteredMouth = len > (mouthStart + entryMargin);
        if((!startsInMouth && insideMouthNow && enteredMouth) || (startsInMouth && len > mouthEnd + 2)){
          mouthConverted = true;
          if(type === 'carb'){
            // compute remaining duration for children (proportional to distance left)
            const remainingDuration = Math.max(300, duration * (1 - t));
              debugLog('animateAlongPath: convertToMaltose call', {label, len, remainingDuration, dataset: tokenEl.dataset});
              convertToMaltose(tokenEl, len, remainingDuration);
            info.textContent = `${label} 在口中部份分解，形成麥芽糖。`;
            // stop further processing for this token in this frame (it may have been removed)
            return;
          }
        }
      }

      // stomach conversion: protein -> polypeptide
      if(!stomachConverted){
        const insideStomachNow = (len >= stomachStart && len <= stomachEnd);
        if(insideStomachNow && type === 'protein'){
          stomachConverted = true;
          const remainingDuration = Math.max(300, duration * (1 - t));
            debugLog('animateAlongPath: convertToPolypeptide call', {label, len, remainingDuration, dataset: tokenEl.dataset});
            convertToPolypeptide(tokenEl, len, remainingDuration);
          info.textContent = `${label} 到達胃，蛋白質被分解為多肽。`;
          // token may have been removed; stop further processing this frame
          return;
        }
      }

      // small intestine conversion: sucrose -> glucose (single)
      if(!smallConverted && len >= smallStart && len <= smallEnd){
        smallConverted = true;
        const remainingDuration = Math.max(200, duration * (1 - t));
        if(type === 'carb'){
          debugLog('animateAlongPath: convertToGlucose call', {label, len, remainingDuration, dataset: tokenEl.dataset});
          convertToGlucose(tokenEl, len, remainingDuration);
          info.textContent = `${label} 到達小腸，已轉換為葡萄糖。`;
          // convertToGlucose removes the token; stop further processing
          return;
        }else if(type === 'protein'){
          // convert protein (or remaining polypeptide) into individual amino acids
          convertToAminoAcids(tokenEl, len, remainingDuration);
          info.textContent = `${label} 到達小腸，蛋白質被分解為胺基酸。`;
          return;
        }else if(type === 'fat'){
          // convert triglyceride into glycerol + 3 fatty acids
          convertToFat(tokenEl, len, remainingDuration);
          info.textContent = `${label} 到達小腸，脂質被分解為甘油與脂肪酸。`;
          return;
        }else{
          convertVisual(tokenEl,type);
          info.textContent = `${label} 到達小腸，已轉換為小分子。`;
          return;
        }
      }

      if(t < 1){
        requestAnimationFrame(step);
      }else{
        // finish animation: fade out
        tokenEl.style.transition = 'opacity 700ms ease, transform 700ms ease';
        tokenEl.style.opacity = '0';
        tokenEl.style.transform += ' scale(0.6)';
        setTimeout(()=>tokenEl.remove(),900);
      }
    }
    requestAnimationFrame(step);
  }

  // wire up token buttons
  tokensContainer.querySelectorAll('.token').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const type = btn.dataset.type;
      const label = btn.innerText || type;
      // durations slightly different per nutrient
      const duration = type==='fat' ? 5200 : (type==='protein' ? 4600 : 3800);
      animateAlongPath(type, duration, label);
    });
  });

});
