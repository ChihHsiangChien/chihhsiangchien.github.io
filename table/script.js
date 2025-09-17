// 載入 spec.json 並建立練習
const SPEC_PATH = 'spec.json';

let spec = null;
let specsList = null; // when multiple specs provided, store {name,spec} items
let state = {
  // map cardId -> {text, originRow, originCol}
  cards: {},
  // placement map: cellKey -> cardId
  placements: {},
  logs: []
};

const el = id => document.getElementById(id);

async function loadSpec(){
  // Check URL parameters `spec`. Support multiple entries: ?spec=a.json&spec=b.json
  const params = new URLSearchParams(location.search);
  const specParams = params.getAll('spec');
  if(specParams && specParams.length){
    specsList = [];
    // try to load each spec param (inline JSON or fetch path)
    for(const sp of specParams){
      // try inline JSON
      try{
        const decoded = decodeURIComponent(sp);
        if(decoded.trim().startsWith('{') || decoded.trim().startsWith('[')){
          const parsed = JSON.parse(decoded);
          specsList.push({name: parsed.title || 'inline', spec: parsed});
          console.info('載入 inline spec');
          continue;
        }
      }catch(e){ /* not inline */ }

      // try fetch
      try{
        let tried = false;
  // if sp looks like a simple name (no slash and short), try data/<name>.json
        if(!sp.includes('/') && sp.length && sp.length < 80){
          const candidate = `data/${sp}.json`;
          try{
            const r2 = await fetch(candidate);
            if(r2.ok){ const j = await r2.json(); specsList.push({name: j.title || sp, spec: j}); console.info('fetch', candidate, 'ok'); tried = true; continue; }
          }catch(e){ /* ignore */ }
          // try absolute-ish
          const candidate2 = `/table/data/${sp}.json`;
          try{ const r3 = await fetch(candidate2); if(r3.ok){ const j = await r3.json(); specsList.push({name: j.title || sp, spec: j}); console.info('fetch', candidate2, 'ok'); tried = true; continue; } }catch(e){}
        }

        const res = await fetch(sp);
        if(res.ok){ const j = await res.json(); specsList.push({name: j.title || sp, spec: j}); console.info('fetch', sp, 'ok'); continue; }
        if(!tried) console.warn('fetch', sp, 'status', res.status);
      }catch(err){ console.warn('fetch', sp, 'error', err); }
    }
  // if we loaded at least one spec, set the first as active and render selector UI
  if(specsList.length){ spec = specsList[0].spec; renderSpecSelector(); renderLeftSpecList(); return; }
  }

  // default: try to gather available spec files and pick SPEC_PATH
  await populateSpecListFromFiles();
  if(specsList && specsList.length){
    // if populate found any, set first as active
    spec = specsList[0].spec;
    renderSpecSelector();
    renderLeftSpecList();
    return;
  }

  // fallback embedded spec
  console.warn('未找到外部 spec 檔案，使用內建 fallback spec。');
  spec = {
    title: '單細胞生物與多細胞生物比較',
    head: ['單細胞生物','多細胞生物'],
    rows: [
      {label:'細胞數目',content:['一個','多個']},
      {label:'單一細胞獨立性',content:['能獨立生活','不能獨立生存']},
      {label:'單一細胞功能',content:['完成所有生命功能','僅能完成部分功能']},
      {label:'細胞分工',content:['沒有明顯分工','有專業分工']},
      {label:'實例',content:['草履蟲、變形蟲','人類、玉米、蚯蚓']}
    ]
  };
}

// Try to populate specsList by probing known JSON filenames in this folder
async function populateSpecListFromFiles(){
  // try to fetch a manifest at /table/data/index.json listing all json filenames
  specsList = [];
  try{
    const manifestRes = await fetch('data/index.json');
    if(manifestRes.ok){
      const list = await manifestRes.json();
      for(const fname of list){
        try{
          const res = await fetch(`data/${fname}`);
          if(res.ok){ const j = await res.json(); specsList.push({name: j.title || fname, spec: j, filename: `data/${fname}`}); }
        }catch(e){ console.warn('讀取', fname, '失敗', e); }
      }
    }
  }catch(e){
    console.warn('無法讀取 data/index.json', e);
  }
  // render selector if we have multiple
  renderSpecSelector();
}

function uid(){return 'c'+Math.random().toString(36).slice(2,9)}

function build(){
  el('exercise-title').textContent = spec.title || '練習';

  const table = el('table');
  table.innerHTML = '';

  const heads = spec.head || [];
  const rows = spec.rows || [];

  // build header row
  const grid = document.createElement('div');
  grid.className = 'table-grid';
  // add an extra trailing column for per-row card pools
  grid.style.gridTemplateColumns = `160px repeat(${heads.length}, 1fr) 220px`;
  grid.classList.add('has-row-pools');

  // top-left empty
  const corner = document.createElement('div');
  corner.className = 'row-header';
  corner.style.gridColumn = '1 / 2';
  grid.appendChild(corner);

  // column heads
  heads.forEach(h=>{
    const ch = document.createElement('div');
    ch.className = 'col-head';
    ch.textContent = h;
    grid.appendChild(ch);
  });

  // trailing header for per-row pools
  const poolHead = document.createElement('div');
  poolHead.className = 'col-head pool-head';
  poolHead.textContent = '候選卡片';
  grid.appendChild(poolHead);

  // rows
  rows.forEach((r, i)=>{
    // label cell
    const lab = document.createElement('div');
    lab.className = 'row-label';
    lab.textContent = r.label;
    grid.appendChild(lab);

    // content cells
    for(let j=0;j<heads.length;j++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = i;
      cell.dataset.col = j;
      cell.dataset.key = `${i}:${j}`;

      const inner = document.createElement('div');
      inner.className = 'cell-inner';

      // attach listeners to both container and inner so drops targetting inner are handled
      [cell, inner].forEach(target =>{
        target.addEventListener('dragenter', onDragEnter);
        target.addEventListener('dragover', onDragOver);
        target.addEventListener('dragleave', onDragLeave);
        target.addEventListener('drop', onDrop);
      });

      // touch target on cell
      cell.addEventListener('pointerdown', onCellPointerDown);

      cell.appendChild(inner);
      grid.appendChild(cell);
    }

    // trailing per-row pool cell
    const poolWrap = document.createElement('div');
    poolWrap.className = 'row-pool-wrap';
    const poolLabel = document.createElement('div');
    poolLabel.className = 'row-pool-label';
    poolLabel.textContent = '';
    const pool = document.createElement('div');
    pool.className = 'row-pool';
    pool.dataset.row = i;
    poolWrap.appendChild(pool);
    grid.appendChild(poolWrap);
  });

  table.appendChild(grid);

  // ensure document-level dragover allows drops in some browsers
  document.addEventListener('dragover', function(e){ e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect = 'move'; });

  generateCards();
  attachControls();
}

function generateCards(){
  state.cards = {};
  state.placements = {};

  // find a fallback container (table grid) if per-row pools are missing
  const fallbackContainer = document.querySelector('#table .table-grid') || el('table') || document.body;

  // clear any existing per-row pools
  document.querySelectorAll('.row-pool').forEach(rp=>rp.innerHTML='');

  const rows = spec.rows || [];
  const heads = spec.head || [];

  // flatten into card objects with correct coordinates
  const cards = [];
  rows.forEach((r,i)=>{
    (r.content || []).forEach((text,j)=>{
      cards.push({text, row:i, col:j});
    });
  });

  // shuffle
  shuffle(cards);

  cards.forEach(c=>{
    const id = uid();
    state.cards[id] = {text:c.text,row:c.row,col:c.col,id};

    const cardEl = document.createElement('div');
    cardEl.className = 'card in-pool small';
    cardEl.draggable = true;
    cardEl.textContent = c.text;
    cardEl.dataset.cardId = id;

    // color coding: generate pastel color based on row label
    try{
      const rowLabel = (rows[c.row] && rows[c.row].label) ? rows[c.row].label : String(c.row);
      const bg = colorFromString(rowLabel, 75, 85); // pastel lightness
      const border = colorFromString(rowLabel, 60, 70);
      cardEl.style.background = bg;
      cardEl.style.borderColor = border;
    }catch(e){ /* ignore coloring errors */ }

    cardEl.addEventListener('dragstart', onDragStart);
    cardEl.addEventListener('dragend', onDragEnd);

    // pointer for touch-dnd fallback
    cardEl.addEventListener('pointerdown', onCardPointerDown);

    // append to per-row pool if exists, otherwise to fallback container
    const rp = document.querySelector(`.row-pool[data-row='${c.row}']`);
    if(rp) rp.appendChild(cardEl);
    else fallbackContainer.appendChild(cardEl);
  });
}

// Given a string, produce a pastel HSL color. s and l are percentages (0-100)
function colorFromString(str, s = 60, l = 85){
  const h = Math.abs(hashString(str)) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}

function hashString(str){
  // simple djb2-like
  let hash = 5381;
  for(let i=0;i<str.length;i++){
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // force 32bit
  }
  return hash;
}

function attachControls(){
  el('btn-submit').addEventListener('click', onSubmit);
  el('btn-reset').addEventListener('click', onReset);
  el('btn-answer').addEventListener('click', onViewAnswer);
}

/* utilities */
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const r=Math.floor(Math.random()*(i+1));[a[i],a[r]]=[a[r],a[i]];
  }
}

/* Drag handlers */
let dragCardId = null;

function onDragStart(e){
  const id = e.target.dataset.cardId;
  dragCardId = id;
  try{ e.dataTransfer.setData('text/plain', id); } catch(_){}
  e.dataTransfer.effectAllowed = 'move';
  // set a drag image if supported to make drag visible
  try{
    const crt = e.target.cloneNode(true);
    crt.style.position='absolute';crt.style.top='-1000px';crt.style.left='-1000px';
    document.body.appendChild(crt);
    e.dataTransfer.setDragImage(crt, 20, 10);
    setTimeout(()=>crt.remove(),50);
  }catch(_){ }
  e.target.classList.add('dragging');
  console.debug('dragstart', id, e.target.textContent);
  updateDebug();
}
function onDragEnd(e){
  if(e.target) e.target.classList.remove('dragging');
  dragCardId = null;
  console.debug('dragend');
  updateDebug();
}

function onDragEnter(e){
  e.preventDefault();
  e.currentTarget.classList.add('highlight');
  console.debug('dragenter', e.currentTarget.dataset && e.currentTarget.dataset.key);
}
function onDragOver(e){
  e.preventDefault();
  if(e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  // debug
  const key = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key;
  // console.debug('dragover', key);
}
function onDragLeave(e){
  e.currentTarget.classList.remove('highlight');
  // console.debug('dragleave', e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key);
}

function onDrop(e){
  e.preventDefault();
  // find the containing .cell (if drop happens on .cell-inner or children)
  const cell = (e.target && e.target.closest) ? e.target.closest('.cell') : e.currentTarget;
  if(cell) cell.classList.remove('highlight');
  const id = (e.dataTransfer && e.dataTransfer.getData ? e.dataTransfer.getData('text/plain') : null) || dragCardId;
  console.debug('drop event', {cell: cell && cell.dataset && cell.dataset.key, cardId:id});
  if(!id) return;
  placeCardToCell(id, cell || e.currentTarget);
}

/* Pointer / touch fallback for cards and cells */
let pointerState = { dragging:false, cardEl:null, startX:0, startY:0, ghost:null };

function onCardPointerDown(e){
  // begin drag-like interaction
  const elCard = e.currentTarget;
  // Only handle pointer-based drag for touch/pen — avoid preventing native mouse dragstart
  if(e.pointerType && e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
  e.preventDefault();
  elCard.setPointerCapture(e.pointerId);
  pointerState.dragging = true;
  pointerState.cardEl = elCard;
  pointerState.startX = e.clientX;
  pointerState.startY = e.clientY;

  // create ghost
  const g = elCard.cloneNode(true);
  g.classList.add('dragging');
  g.style.position = 'fixed';
  g.style.left = (e.clientX - 40) + 'px';
  g.style.top = (e.clientY - 20) + 'px';
  g.style.zIndex = 9999;
  document.body.appendChild(g);
  pointerState.ghost = g;

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp, {once:true});
  console.debug('pointerdown start', elCard.dataset.cardId, elCard.textContent);
}

function onPointerMove(e){
  if(!pointerState.dragging) return;
  const g = pointerState.ghost;
  g.style.left = (e.clientX - 40) + 'px';
  g.style.top = (e.clientY - 20) + 'px';

  // highlight cell under pointer
  const elUnder = document.elementFromPoint(e.clientX, e.clientY);
  document.querySelectorAll('.cell.highlight').forEach(n=>n.classList.remove('highlight'));
  const cell = elUnder && elUnder.closest && elUnder.closest('.cell');
  if(cell) cell.classList.add('highlight');
  // debug
  // console.debug('pointermove', e.clientX, e.clientY, cell && cell.dataset.key);
}

function onPointerUp(e){
  window.removeEventListener('pointermove', onPointerMove);
  pointerState.dragging = false;
  const g = pointerState.ghost;
  const elUnder = document.elementFromPoint(e.clientX, e.clientY);
  const cell = elUnder && elUnder.closest && elUnder.closest('.cell');
  if(cell){
    const id = pointerState.cardEl.dataset.cardId;
    placeCardToCell(id, cell);
  }
  if(g) g.remove();
  pointerState.cardEl = null; pointerState.ghost = null;
  document.querySelectorAll('.cell.highlight').forEach(n=>n.classList.remove('highlight'));
  console.debug('pointerup');
  updateDebug();
}

function onCellPointerDown(e){
  // for mobile: if a card is in the cell, pick it up
  // Only on touch/pen
  if(e.pointerType && e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
  const cell = e.currentTarget;
  const cardEl = cell.querySelector('.card');
  if(cardEl){
    // emulate picking — provide required properties
    const fakeEvent = {
      currentTarget: cardEl,
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      pointerType: e.pointerType,
      preventDefault: ()=>{}
    };
    onCardPointerDown(fakeEvent);
  }
}

/* placement logic */
function placeCardToCell(cardId, cell){
  const singleOnly = el('opt-single').checked;

  const key = cell.dataset.key;
  if(singleOnly){
    // if cell already has a card, return it to pool
    const existing = cell.querySelector('.card');
    if(existing){
      // try to return to its original row-pool first
      const existingId = existing.dataset.cardId;
      let returned = false;
      try{
        const meta = state.cards[existingId];
        if(meta && (meta.row !== undefined && meta.row !== null)){
          const rp = document.querySelector(`.row-pool[data-row='${meta.row}']`);
          if(rp){ rp.appendChild(existing); returned = true; }
        }
      }catch(e){}
      if(!returned){ const pool = el('card-pool'); pool.appendChild(existing); }
      delete state.placements[key];
    }
  }

  // remove card from wherever it was
  const cardEl = document.querySelector(`[data-card-id='${cardId}']`);
  if(!cardEl) return;

  // attach to cell
  cell.querySelector('.cell-inner').appendChild(cardEl);
  cardEl.classList.remove('in-pool');
  state.placements[key] = cardId;

  // clear styles
  cell.classList.remove('correct','wrong');
}

function updateDebug(){
  // debug UI removed; keep this function as a no-op for safety
  return;
}

function renderSpecSelector(){
  const container = el('spec-selector-container');
  if(!container) return;
  container.innerHTML = '';
  if(!specsList || specsList.length <= 1) return;

  const label = document.createElement('label');
  label.textContent = '題目： ';
  const sel = document.createElement('select');
  specsList.forEach((s,i)=>{
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = s.name || `spec ${i+1}`;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', ()=>{
    const idx = Number(sel.value);
    if(Number.isFinite(idx) && specsList[idx]){
      spec = specsList[idx].spec;
      // rebuild UI
      build();
      updateDebug();
    }
  });
  container.appendChild(label);
  container.appendChild(sel);
}

// Also populate left panel list (clickable) if available
function renderLeftSpecList(){
  const listEl = el('spec-list');
  if(!listEl) return;
  listEl.innerHTML = '';
  if(!specsList || !specsList.length){ listEl.textContent = '無可用題目'; return; }
  specsList.forEach((s,i)=>{
    const it = document.createElement('div');
    it.className = 'spec-item';
    it.textContent = s.name || `spec ${i+1}`;
    it.addEventListener('click', ()=>{
      spec = s.spec;
      build();
      // mark active
      document.querySelectorAll('.spec-item').forEach(n=>n.classList.remove('active'));
      it.classList.add('active');
    });
    listEl.appendChild(it);
  });
  // mark first active
  const first = listEl.querySelector('.spec-item'); if(first) first.classList.add('active');
}

/* controls */
function onSubmit(){
  const rows = spec.rows || [];
  const heads = spec.head || [];
  let correct = 0, total = 0;

  document.querySelectorAll('.cell').forEach(cell=>{
    const key = cell.dataset.key;
    const [i,j] = key.split(':').map(Number);
    const expected = ((rows[i]&&rows[i].content)||[])[j];
    total++;
    const cardId = state.placements[key];
    if(!cardId){
      cell.classList.remove('correct');
      cell.classList.remove('wrong');
      return;
    }
    const card = state.cards[cardId];
    if(card && card.text === expected){
      cell.classList.add('correct');
      cell.classList.remove('wrong');
      correct++;
      // mark card
      const elc = document.querySelector(`[data-card-id='${cardId}']`);
      if(elc){elc.classList.add('correct'); elc.classList.remove('wrong')}
    } else {
      cell.classList.add('wrong');
      cell.classList.remove('correct');
      const elc = document.querySelector(`[data-card-id='${cardId}']`);
      if(elc){elc.classList.add('wrong'); elc.classList.remove('correct')}
      if(el('opt-auto-return').checked){
        // move back to pool after short delay
        setTimeout(()=>{
          const elc2 = document.querySelector(`[data-card-id='${cardId}']`);
          if(elc2){
            // try to return to original row-pool, fall back to global pool
            let returned = false;
            try{
              const meta = state.cards[cardId];
              if(meta && (meta.row !== undefined && meta.row !== null)){
                const rp2 = document.querySelector(`.row-pool[data-row='${meta.row}']`);
                if(rp2){ rp2.appendChild(elc2); returned = true; }
              }
            }catch(e){}
            if(!returned){ const pool = el('card-pool'); pool.appendChild(elc2); }
          }
          delete state.placements[key];
          cell.classList.remove('wrong');
        },600);
      }
    }
  });

  const score = Math.round((correct/total)*100);
  logEvent({type:'submit',correct,total,score,timestamp:Date.now()});
  // log-output UI removed; logs are kept in memory

  // show a brief result
  alert(`正確 ${correct} / ${total}，得分 ${score}%`);
}

function onReset(){
  // move all cards back to their original per-row pools if possible
  document.querySelectorAll('.cell .card').forEach(c=>{
    const id = c.dataset.cardId;
    let returned = false;
    try{ const meta = state.cards[id]; if(meta && meta.row !== undefined){ const rp = document.querySelector(`.row-pool[data-row='${meta.row}']`); if(rp){ rp.appendChild(c); returned = true; } } }catch(e){}
    if(!returned){ document.querySelector('#table .table-grid')?.appendChild(c); }
  });
  state.placements = {};
  document.querySelectorAll('.cell').forEach(c=>c.classList.remove('correct','wrong'));
  document.querySelectorAll('.card').forEach(c=>c.classList.remove('correct','wrong'));
  logEvent({type:'reset',timestamp:Date.now()});

}

function onViewAnswer(){
  // place correct cards to their cells; clear current placements first
  state.placements = {};

  // move all cards to their per-row pools as a starting point
  document.querySelectorAll('.card').forEach(c=>{
    const id = c.dataset.cardId;
    let returned = false;
    try{ const meta = state.cards[id]; if(meta && meta.row !== undefined){ const rp = document.querySelector(`.row-pool[data-row='${meta.row}']`); if(rp){ rp.appendChild(c); returned = true; } } }catch(e){}
    if(!returned){ document.querySelector('#table .table-grid')?.appendChild(c); }
  });

  const rows = spec.rows || [];
  rows.forEach((r,i)=>{
    (r.content||[]).forEach((text,j)=>{
      // find a card matching this text
      const cardEl = Array.from(document.querySelectorAll('.card')).find(c=>c.textContent === text);
      if(cardEl){
        const cell = document.querySelector(`.cell[data-row='${i}'][data-col='${j}']`);
        if(cell){
          cell.querySelector('.cell-inner').appendChild(cardEl);
          state.placements[cell.dataset.key] = cardEl.dataset.cardId;
        }
      }
    });
  });
  logEvent({type:'view-answer',timestamp:Date.now()});
  el('log-output').textContent = JSON.stringify(state.logs,null,2);
}

function logEvent(obj){
  state.logs.push(obj);
}

/* boot */
window.addEventListener('DOMContentLoaded', async ()=>{
  await loadSpec();
  build();
});
