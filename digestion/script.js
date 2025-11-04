// script.js — 控制營養素沿 SVG 路徑移動並在小腸處轉換成小分子
document.addEventListener('DOMContentLoaded', ()=>{
  const svg = document.getElementById('svg');
  const path = document.getElementById('digestPath');
  const zone = document.getElementById('smallIntestineZone');
  const mouth = document.getElementById('mouthZone');
  const tokensContainer = document.getElementById('tokens');
  const info = document.getElementById('info');

  // viewBox of svg is 0 0 400 900
  const viewBox = {width:400, height:900};
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
  function createHexChainSVG(count, r=10, gap=2, fill='#6f6fe0', stroke='rgba(0,0,0,0.06)'){
    const sqrt3 = Math.sqrt(3);
    const horiz = r * 1.75; // horizontal spacing between centers
    const width = (count - 1) * horiz + r * 2 + gap * (count-1);
    const height = r * sqrt3 + 4;
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
  function createAminoChainSVGFromSequence(seq, r=10){
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
      const hue = 8; // base hue (red-orange)
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

    for(let i=0;i<n;i++){
      const t = n===1?0.5: i/(n-1);
      const pos = bezier(t);
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
      const initialGlc = 6; // number of glucose units in this starch token
      const svgChain = createHexChainSVG(initialGlc, 10, 0, '#6f6fe0');
      // store original glucose count for later conversions
      el.dataset.glucoseCount = String(initialGlc);
      el.appendChild(svgChain);
      el.title = '澱粉 (多醣)';
    }else if(type === 'protein'){
      // start as a protein chain composed of several amino-acid shapes
      const initialAA = 10; // user requested 10 amino acids per protein
      const seq = generateAminoSequence(initialAA);
      const svgChain = createAminoChainSVGFromSequence(seq, 8);
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
  function createTriglycerideSVG(glycerolWidth=28, faHeight=6){
    // overall layout: glycerol block on top, three vertical fatty-acid tails below (like comb teeth)
    const faW = Math.max(6, faHeight); // thin tail width
    const faH = faHeight * 6; // tail length
    const gap = 6;
    const contentWidth = Math.max(glycerolWidth, faW*3 + gap*2);
    const width = contentWidth + 8;
    const height = glycerolWidth + 8 + faH;
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
    glycerol.setAttribute('width', 30);
    glycerol.setAttribute('height', 15);
    glycerol.setAttribute('rx', 3);
    glycerol.setAttribute('fill', 'hsl(40 70% 55%)'); // warm golden glycerol
    glycerol.setAttribute('class','svg-fat-gly');
    svgEl.appendChild(glycerol);

    // three fatty acid tails below the glycerol block
    const startX = (width - (faW*3 + gap*2)) / 2;
    const tailY = gy + glycerolWidth - 15 ;
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
      svg.setAttribute('width', 30);
      svg.setAttribute('height', 15);
      svg.setAttribute('viewBox','0 0 20 20');
      const r = document.createElementNS('http://www.w3.org/2000/svg','rect');
      r.setAttribute('x',0); 
      r.setAttribute('y',0); 
      r.setAttribute('width',30); 
      r.setAttribute('height',15); 
      r.setAttribute('rx',3);
      r.setAttribute('fill','hsl(40 70% 55%)');
      svg.appendChild(r);
      el.appendChild(svg);
    }else{
      el.dataset.fatty = '1';
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      // vertical thin rectangle for fatty acid
      svg.setAttribute('width', 12);
      svg.setAttribute('height', 44);
      svg.setAttribute('viewBox','0 0 12 44');
      const r = document.createElementNS('http://www.w3.org/2000/svg','rect');
      r.setAttribute('x',2); r.setAttribute('y',0); r.setAttribute('width',8); r.setAttribute('height',40); r.setAttribute('rx',3);
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
    el.style.padding = '2px';
    el.style.borderRadius = '6px';
    el.style.background = 'transparent';
    el.dataset.type = kind;
    if(kind === 'carb'){
      el.dataset.glucoseCount = String(unitSize);
      const svg = createHexChainSVG(unitSize, unitSize===1?8:10, 0, fill);
      el.appendChild(svg);
    }else if(kind === 'protein'){
      el.dataset.aminoCount = String(unitSize);
      // if a sequence is already provided, render it; otherwise render a placeholder sequence of circles
      let seq = null;
      try{ seq = el.dataset.aminoSeq ? JSON.parse(el.dataset.aminoSeq) : null; }catch(e){ seq = null; }
      if(seq && Array.isArray(seq)){
        el.appendChild(createAminoChainSVGFromSequence(seq, unitSize===1?8:10));
      }else{
        const placeholder = new Array(unitSize).fill('circle');
        el.appendChild(createAminoChainSVGFromSequence(placeholder, unitSize===1?8:10));
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
    const gCount = parseInt(childEl.dataset.glucoseCount||'2',10);
    // create gCount new child tokens (single glucose) and animate them from atLen
    for(let i=0;i<gCount;i++){
      const gl = createMovingChild(1,'#6f6fe0');
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
      aa.appendChild(createAminoChainSVGFromSequence([shape], 8));
      aa.dataset.aminoSeq = JSON.stringify([shape]);
      const factor = 0.9 + Math.random()*0.3;
      animateChildAlongPath(aa, atLen + i*2, Math.max(350, remainingDuration*factor), '胺基酸');
    }
    childEl.remove();
  }

  // Convert token into maltose; if startLen provided, emit detached maltose child tokens that continue along path
  function convertToMaltose(el, startLen, remainingDuration){
    const gCount = parseInt(el.dataset.glucoseCount || '6',10);
    const maltoseUnits = Math.max(1, Math.floor(gCount/2));
    if(typeof startLen === 'number'){
      // emit maltoseUnits detached children that each contain 2 glucose units
      for(let i=0;i<maltoseUnits;i++){
        const child = createMovingChild(2, '#9b8ef0');
        // slight position offset so children don't perfectly overlap at spawn
        const offsetLen = startLen + i * 2;
        const factor = 0.85 + Math.random()*0.4; // speed variation
        animateChildAlongPath(child, offsetLen, Math.max(300, remainingDuration * factor), '麥芽糖');
      }
      // remove original token element
      el.remove();
    }else{
      // fallback: render inline split visuals inside the token
      splitIntoElements(el, maltoseUnits, {unitSize:2, fill:'#9b8ef0', label:'麥芽糖 (二糖)'});
    }
  }

  // Convert token into polypeptides; if startLen provided, emit detached polypeptide child tokens that continue along path
  function convertToPolypeptide(el, startLen, remainingDuration){
    // get sequence and partition into groups of 2 or 3 while preserving order
    const seq = el.dataset.aminoSeq ? JSON.parse(el.dataset.aminoSeq) : new Array(parseInt(el.dataset.aminoCount||'6',10)).fill('circle');
    const groups = partitionSequence(seq);
    if(typeof startLen === 'number'){
      for(let i=0;i<groups.length;i++){
        const grp = groups[i];
        const child = createMovingChild(grp.length, '#d85a5a', 'protein');
        // store the sequence for this child so later splitting preserves order
        child.dataset.aminoSeq = JSON.stringify(grp);
        // update visual to reflect real subsequence
        child.innerHTML = '';
        child.appendChild(createAminoChainSVGFromSequence(grp, 10));
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
    const gCount = parseInt(el.dataset.glucoseCount || '6',10);
    if(typeof startLen === 'number'){
      for(let i=0;i<gCount;i++){
        const child = createMovingChild(1, '#6f6fe0');
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
    const seq = el.dataset.aminoSeq ? JSON.parse(el.dataset.aminoSeq) : new Array(parseInt(el.dataset.aminoCount||'6',10)).fill('circle');
    if(typeof startLen === 'number'){
      for(let i=0;i<seq.length;i++){
        const shape = seq[i];
        const child = createMovingChild(1, '#d85a5a', 'protein');
        child.innerHTML = '';
        child.appendChild(createAminoChainSVGFromSequence([shape], 8));
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
      const svgUnit = createHexChainSVG(unitSize, unitSize===1?10:12, 0, fill);
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
            convertToMaltose(tokenEl, len, remainingDuration);
            info.textContent = `${label} 在口中部分水解，形成麥芽糖（二糖，成對顯示）。`;
          }
        }
      }

      // stomach conversion: protein -> polypeptide
      if(!stomachConverted){
        const insideStomachNow = (len >= stomachStart && len <= stomachEnd);
        if(insideStomachNow && type === 'protein'){
          stomachConverted = true;
          const remainingDuration = Math.max(300, duration * (1 - t));
          convertToPolypeptide(tokenEl, len, remainingDuration);
          info.textContent = `${label} 到達胃，蛋白質被分解為多肽（polypeptide）。`;
        }
      }

      // small intestine conversion: sucrose -> glucose (single)
      if(!smallConverted && len >= smallStart && len <= smallEnd){
        smallConverted = true;
        const remainingDuration = Math.max(200, duration * (1 - t));
        if(type === 'carb'){
          convertToGlucose(tokenEl, len, remainingDuration);
          info.textContent = `${label} 到達小腸，已轉換為小分子（葡萄糖）。`;
        }else if(type === 'protein'){
          // convert protein (or remaining polypeptide) into individual amino acids
          convertToAminoAcids(tokenEl, len, remainingDuration);
          info.textContent = `${label} 到達小腸，蛋白質被分解為胺基酸。`;
        }else if(type === 'fat'){
          // convert triglyceride into glycerol + 3 fatty acids
          convertToFat(tokenEl, len, remainingDuration);
          info.textContent = `${label} 到達小腸，脂質被分解為甘油與脂肪酸。`;
        }else{
          convertVisual(tokenEl,type);
          info.textContent = `${label} 到達小腸，已轉換為小分子。`;
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
