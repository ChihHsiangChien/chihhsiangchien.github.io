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
      r: 10,
      smallR: 8,
      // connector between residues (more visible defaults)
      linkColor: 'rgba(216,90,90,0.85)',
      linkWidth: 3,
      linkOpacity: 0.95,
      // where to place the link relative to residue shapes: 'under' or 'over'
      linkPlace: 'over'
    },
    trig: {
      glycerolWidth: 28,
      glycerolRectW: 30,
      glycerolRectH: 15,
      glycerolRectRx: 3,
      faHeight: 6,
      faWidthMin: 6,
      gap: 6,
      faHeightMult: 6,
      svgPadding: 8,
      faSvg: { width: 12, height: 44 }
    },
    child: {
      padding: '2px',
      borderRadius: '6px'
    },
    split: {
      gap: 8,
      spread: 8
    },
    token: {
      initialGlc: 6,
      initialAA: 10
    }
  };

  // Debug helpers (enable for tracing emissions and conversions)
  const DEBUG = false; // set false to silence debug output
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

  // compute thresholds (path lengths) for mouth and small intestine zones
  const svgRect = () => svg.getBoundingClientRect();
  const zoneRect = zone.getBBox(); // small intestine in svg coords
  const mouthRect = mouth.getBBox(); // mouth zone in svg coords
  const stomach = document.getElementById('stomachZone');
  const stomachRect = stomach.getBBox();

  function findZoneRange(box){
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

  const {start: smallStart, end: smallEnd} = findZoneRange(zoneRect);
  const {start: mouthStart, end: mouthEnd} = findZoneRange(mouthRect);
  const {start: stomachStart, end: stomachEnd} = findZoneRange(stomachRect);
  // determine if path starts inside mouth zone (prevents immediate conversion)
  const startsInMouth = (()=>{
    const p0 = path.getPointAtLength(0);
    return (p0.y >= mouthRect.y && p0.y <= mouthRect.y + mouthRect.height);
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
    const positions = [];
    for(let i=0;i<n;i++){
      const t = n===1?0.5: i/(n-1);
      positions.push(bezier(t));
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
      const linkPath = document.createElementNS('http://www.w3.org/2000/svg','path');
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
    const faW = Math.max(SIZES.trig.faWidthMin, faHeight); // thin tail width
    const faH = faHeight * SIZES.trig.faHeightMult; // tail length
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
  glycerol.setAttribute('rx', SIZES.trig.glycerolRectRx);
    glycerol.setAttribute('fill', 'hsl(40 70% 55%)'); // warm golden glycerol
    glycerol.setAttribute('class','svg-fat-gly');
    svgEl.appendChild(glycerol);

    // three fatty acid tails below the glycerol block
    const startX = (width - (faW * 3 + gap * 2)) / 2;
    const tailY = gy + glycerolWidth - SIZES.trig.glycerolRectH;
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
      r.setAttribute('rx', SIZES.trig.glycerolRectRx);
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
    const start = Math.max(0, startLen);
    const remaining = Math.max(50, baseRemainingDuration || 2000);
    let converted = false;

    function step(ts){
      if(!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const t = Math.min(1, elapsed/remaining);
      const len = start + t * (pathLen - start);
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

    function step(timestamp){
      if(!startTime) startTime = timestamp;
      // if the token element was removed by an earlier conversion, stop processing
      if(!tokenEl.isConnected) return;
      const elapsed = timestamp - startTime;
      const t = Math.min(1, elapsed/duration);
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
        if((!startsInMouth && insideMouthNow) || (startsInMouth && len > mouthEnd + 2)){
          mouthConverted = true;
          if(type === 'carb'){
            // compute remaining duration for children (proportional to distance left)
            const remainingDuration = Math.max(300, duration * (1 - t));
              debugLog('animateAlongPath: convertToMaltose call', {label, len, remainingDuration, dataset: tokenEl.dataset});
              convertToMaltose(tokenEl, len, remainingDuration);
            info.textContent = `${label} 在口中部分水解，形成麥芽糖（二糖，成對顯示)。`;
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
          info.textContent = `${label} 到達胃，蛋白質被分解為多肽（polypeptide）。`;
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
          info.textContent = `${label} 到達小腸，已轉換為小分子（葡萄糖）。`;
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
