'use strict';
/* ===== 共用工具 ===== */
const W = 1600, H = 1000, SL = 360;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function mix(c1, c2, t) {
  const a = hex2rgb(c1), b = hex2rgb(c2);
  return 'rgb(' + a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',') + ')';
}
const COL = {
  int: '#ff6b3d', ext: '#38bdf8', igneous: '#f97316', sedimentary: '#eab308',
  metamorphic: '#a855f7', magma: '#ef4444', sediment: '#d6b77a'
};

/* ===== 步驟 =====
   fx: 這一步要播放的動畫效果
   arrows: 這一步顯示的營力箭頭
   anim: 這一步逐漸完成的場景狀態 */
const STEPS = [
  {
    short: '總覽', force: 'both', title: '岩石循環總覽',
    desc: `地球上的岩石不斷在<b>火成岩、沉積岩、變質岩</b>之間轉換，稱為<b>岩石循環</b>。推動循環的力量有兩種：
<ul><li><span class="i">內營力</span>：能量來自<b>地球內部</b>（地熱），如板塊運動、岩漿活動、火山、地震、造山運動，常使地表<b>起伏變大</b>。</li>
<li><span class="e">外營力</span>：能量來自<b>太陽</b>與<b>重力</b>，如風化、侵蝕、搬運、沉積，常使地表<b>趨於平坦</b>。</li></ul>
按「下一步」逐步觀察每個過程。`,
    rocks: ['basalt', 'granite', 'sandstone', 'gneiss'],
    focus: [800, 560, 1],
    fx: ['slab', 'magma', 'river', 'smoke', 'waves'],
    arrows: ['plate', 'convect', 'magmaUp', 'uplift', 'sun', 'riverA', 'wind'],
    cycle: { nodes: ['magma', 'igneous', 'sediment', 'sedimentary', 'metamorphic'], edges: ['m-i', 'i-s', 's-sr', 'sr-mt', 'mt-m', 'i-mt', 'sr-s', 'mt-s'] }
  },
  {
    short: '岩漿生成', force: 'int', title: '① 岩漿的生成',
    desc: `海洋板塊<b>隱沒</b>到大陸板塊下方。板塊中的水分在高溫高壓下釋出，使上方地函岩石的<b>熔點降低</b>而部分熔融，形成<b>岩漿</b>。
岩漿密度比周圍岩石小，會慢慢<b>上升</b>，聚集在地殼中的<b>岩漿庫</b>。<br>這是由地球內部熱能驅動的<span class="i">內營力</span>。`,
    rocks: ['magma'], focus: [1020, 760, 1.5],
    fx: ['slab', 'magma', 'water'], arrows: ['plate', 'convect', 'magmaUp'],
    cycle: { nodes: ['magma'], edges: [] }
  },
  {
    short: '噴出岩', force: 'int', title: '② 火山噴發 → 噴出岩',
    desc: `岩漿沿裂隙噴出地表成為<b>熔岩</b>。在地表<b>冷卻快</b>，礦物晶體來不及長大，所以<b>晶體細小</b>，有時留有氣孔。
<ul><li><b>玄武岩</b>：深色，如澎湖群島。</li><li><b>安山岩</b>：灰色，如大屯火山群。</li></ul>岩漿冷卻凝固形成的岩石稱為<b>火成岩</b>。`,
    rocks: ['basalt', 'andesite'], focus: [1200, 300, 2],
    fx: ['erupt', 'smoke'], arrows: ['erupt'], anim: 'LAVA',
    cycle: { nodes: ['magma', 'igneous'], edges: ['m-i'] }
  },
  {
    short: '侵入岩', force: 'int', title: '③ 地下冷凝 → 侵入岩',
    desc: `沒有噴出的岩漿<b>侵入</b>地殼中，在地底深處<b>緩慢冷卻</b>。礦物晶體有充分時間成長，所以<b>晶體粗大</b>、肉眼可見。
<ul><li><b>花岡岩</b>：淺色，有粉紅、白、灰、黑色晶體，如金門、馬祖。</li></ul>觀察：岩體顏色由熾熱橘紅逐漸冷卻，晶體越長越大。`,
    rocks: ['granite'], focus: [1060, 540, 1.9],
    fx: ['intrude'], arrows: ['intrude'], anim: 'PL',
    cycle: { nodes: ['magma', 'igneous'], edges: ['m-i'] }
  },
  {
    short: '造山抬升', force: 'int', title: '④ 板塊擠壓 → 抬升與造山',
    desc: `板塊互相擠壓，使岩層<b>隆起</b>、產生<b>褶皺</b>與<b>斷層</b>，形成高山並伴隨<b>地震</b>。原本深埋地下的岩石因此被抬升到地表，接受外營力作用。
<br>臺灣就是歐亞板塊與菲律賓海板塊碰撞抬升而成，至今仍持續隆起。`,
    rocks: [], focus: [880, 440, 1.4],
    fx: ['slab', 'quake'], arrows: ['plate', 'uplift', 'compress'], anim: 'U',
    cycle: { nodes: ['igneous', 'sedimentary', 'metamorphic'], edges: [] }
  },
  {
    short: '風化', force: 'ext', title: '⑤ 風化作用',
    desc: `岩石在<b>原地</b>崩解或分解，<b>位置沒有移動</b>，稱為風化。
<ul><li><b>物理風化</b>：日夜溫差使岩石<b>熱脹冷縮</b>而碎裂；水滲入裂縫結冰、體積膨脹撐開岩石（<b>冰楔作用</b>）。</li>
<li><b>化學風化</b>：雨水溶有二氧化碳呈弱酸性，<b>溶蝕</b>岩石。</li>
<li><b>生物風化</b>：植物<b>根部</b>生長撐裂岩石。</li></ul>能量來自太陽，屬於<span class="e">外營力</span>。`,
    rocks: ['granite'], focus: [880, 250, 2.3],
    fx: ['rain', 'weather', 'debris'], arrows: ['sun', 'rain'],
    cycle: { nodes: ['igneous', 'sediment'], edges: ['i-s', 'sr-s', 'mt-s'] }
  },
  {
    short: '侵蝕搬運', force: 'ext', title: '⑥ 侵蝕與搬運',
    desc: `<b>流水、風、冰川、海浪</b>把風化後的碎屑帶離原地（<b>侵蝕</b>），再運送到其他地方（<b>搬運</b>）。
<br>搬運過程中碎屑互相碰撞磨蝕，所以越往下游<b>顆粒越小、越圓滑</b>。重力使河水由高處往低處流。`,
    rocks: ['gravel', 'sand', 'mud'], focus: [780, 310, 1.7],
    fx: ['river', 'wind', 'waves', 'glacier'], arrows: ['riverA', 'wind'],
    cycle: { nodes: ['igneous', 'sediment'], edges: ['i-s'] }
  },
  {
    short: '沉積', force: 'ext', title: '⑦ 沉積作用',
    desc: `河流進入海洋後<b>流速變慢</b>，搬運能力下降，碎屑便沉積下來。
<ul><li><b>顆粒大</b>的先沉積（礫石在近岸）</li><li>顆粒小的被帶得較遠（砂 → 泥）</li></ul>這種依顆粒大小分開沉積的現象稱為<b>分選作用</b>。沉積物一層層堆積形成<b>層理</b>，生物遺骸也可能被埋藏。`,
    rocks: ['gravel', 'sand', 'mud'], focus: [530, 420, 2.4],
    fx: ['river', 'deposit'], arrows: ['riverA', 'deposit'], anim: 'SED',
    cycle: { nodes: ['sediment'], edges: ['i-s'] }
  },
  {
    short: '成岩', force: 'ext', title: '⑧ 壓密膠結 → 沉積岩',
    desc: `沉積物被上方越來越厚的沉積層<b>壓密</b>，水分被擠出；水中的礦物質（如碳酸鈣、二氧化矽）把顆粒<b>膠結</b>在一起，形成<b>沉積岩</b>（成岩作用）。
<ul><li>礫 → <b>礫岩</b>、砂 → <b>砂岩</b>、泥 → <b>頁岩</b></li><li>貝殼、珊瑚遺骸 → <b>石灰岩</b></li></ul>沉積岩的特徵：有<b>層理</b>，常含<b>化石</b>。`,
    rocks: ['conglomerate', 'sandstone', 'shale', 'limestone'], focus: [510, 470, 2.4],
    fx: ['squeeze'], arrows: ['burial'], anim: 'LITH',
    cycle: { nodes: ['sediment', 'sedimentary'], edges: ['s-sr'] }
  },
  {
    short: '變質', force: 'int', title: '⑨ 高溫高壓 → 變質岩',
    desc: `岩石在<b>沒有熔化</b>的情況下，受到<b>高溫、高壓</b>作用，礦物重新排列或再結晶，形成<b>變質岩</b>。壓力常使礦物排列成片狀（<b>葉理</b>）。
<ul><li>頁岩 → <b>板岩</b> → <b>片岩</b> → <b>片麻岩</b>（變質程度漸增）</li><li>石灰岩 → <b>大理岩</b>（如太魯閣）</li><li>砂岩 → <b>石英岩</b></li></ul>岩漿入侵時，周圍岩石受熱也會變質（<b>接觸變質</b>）。火成岩同樣可以變質。`,
    rocks: ['slate', 'schist', 'gneiss', 'marble', 'quartzite'], focus: [740, 630, 1.9],
    fx: ['slab', 'meta'], arrows: ['heat', 'press'], anim: 'META',
    cycle: { nodes: ['sedimentary', 'metamorphic', 'igneous'], edges: ['sr-mt', 'i-mt'] }
  },
  {
    short: '熔融', force: 'int', title: '⑩ 熔融 → 回到岩漿',
    desc: `岩石隨板塊隱沒被帶到更深處，溫度超過熔點時便<b>熔融</b>成岩漿，再上升到岩漿庫，<b>循環重新開始</b>。
<br>不只變質岩，任何岩石到了夠高的溫度都可能熔融。`,
    rocks: ['gneiss', 'magma'], focus: [900, 760, 1.4],
    fx: ['slab', 'melt', 'magma'], arrows: ['plate', 'meltA', 'magmaUp'],
    cycle: { nodes: ['metamorphic', 'magma'], edges: ['mt-m'] }
  },
  {
    short: '完整旅程', force: 'both', title: '⑪ 跟著一顆岩石去旅行',
    desc: `黃色光點代表一顆「岩石顆粒」：<br>岩漿 → 冷凝成花岡岩 → 抬升出露 → 風化侵蝕 → 河流搬運 → 沉積 → 成為沉積岩 → 隱沒變質 → 熔融回到岩漿。
<br><b>注意：</b>三大岩石之間並沒有固定順序，也可以走<b>捷徑</b>（循環圖中的虛線）：例如火成岩直接變質、沉積岩再被抬升風化。`,
    rocks: ['granite', 'sandstone', 'gneiss', 'magma'], focus: [800, 560, 1],
    fx: ['slab', 'tracer', 'river', 'smoke', 'waves'], arrows: [],
    cycle: { nodes: [], edges: [] }
  }
];
const ANIM_STEP = { LAVA: 2, PL: 3, U: 4, SED: 7, LITH: 8, META: 9 };

/* ===== 岩石資料 ===== */
const ROCKS = {
  magma: { name: '岩漿', type: 'magma', tag: '熔融物質', desc: '地下高溫熔融的物質，噴出地表後稱為熔岩。' },
  basalt: { name: '玄武岩', type: 'igneous', tag: '火成岩・噴出岩', desc: '深色、晶體細小，常有氣孔。例：澎湖。' },
  andesite: { name: '安山岩', type: 'igneous', tag: '火成岩・噴出岩', desc: '灰色，細小基質中有斑晶。例：大屯山。' },
  granite: { name: '花岡岩', type: 'igneous', tag: '火成岩・侵入岩', desc: '淺色、晶體粗大肉眼可見。例：金門。' },
  gravel: { name: '礫', type: 'sediment', tag: '沉積物 >2 mm', desc: '顆粒最大，最先沉積，多在河口近岸。' },
  sand: { name: '砂', type: 'sediment', tag: '沉積物', desc: '中等顆粒，沉積於海灘、淺海。' },
  mud: { name: '泥', type: 'sediment', tag: '沉積物 <1/16 mm', desc: '顆粒最細，被帶到較遠較平靜處。' },
  conglomerate: { name: '礫岩', type: 'sedimentary', tag: '沉積岩', desc: '礫石被膠結而成，可見圓滑礫石。' },
  sandstone: { name: '砂岩', type: 'sedimentary', tag: '沉積岩', desc: '砂粒膠結而成，臺灣西部丘陵常見。' },
  shale: { name: '頁岩', type: 'sedimentary', tag: '沉積岩', desc: '泥壓密而成，薄層狀容易剝開。' },
  limestone: { name: '石灰岩', type: 'sedimentary', tag: '沉積岩', desc: '碳酸鈣遺骸形成，遇稀鹽酸冒泡。' },
  slate: { name: '板岩', type: 'metamorphic', tag: '變質岩', desc: '頁岩低度變質，可剝成薄板。' },
  schist: { name: '片岩', type: 'metamorphic', tag: '變質岩', desc: '雲母片狀排列，有閃亮光澤。' },
  gneiss: { name: '片麻岩', type: 'metamorphic', tag: '變質岩', desc: '高度變質，深淺礦物分帶呈條紋。' },
  marble: { name: '大理岩', type: 'metamorphic', tag: '變質岩', desc: '石灰岩變質再結晶。例：太魯閣。' },
  quartzite: { name: '石英岩', type: 'metamorphic', tag: '變質岩', desc: '砂岩變質，石英再結晶，很堅硬。' }
};
const TYPE_NAME = { magma: '岩漿', igneous: '火成岩', sediment: '沉積物', sedimentary: '沉積岩', metamorphic: '變質岩' };

/* 程序化岩石紋理 */
function drawRockTex(c, key) {
  const w = c.width, h = c.height, g = c.getContext('2d');
  const r = rng(key.length * 97 + key.charCodeAt(0) * 13);
  const noise = (base, v, n, sz) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const b = hex2rgb(base);
    for (let i = 0; i < n; i++) {
      const d = (r() - .5) * v;
      g.fillStyle = 'rgb(' + b.map(x => clamp(x + d, 0, 255) | 0).join(',') + ')';
      g.fillRect(r() * w, r() * h, sz, sz);
    }
  };
  const dots = (cols, n, s0, s1, stroke) => {
    for (let i = 0; i < n; i++) {
      const s = s0 + r() * (s1 - s0);
      g.fillStyle = cols[(r() * cols.length) | 0];
      g.beginPath(); g.ellipse(r() * w, r() * h, s, s * .75, r() * 3, 0, 7); g.fill();
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
    }
  };
  const polys = (cols, n, s0, s1) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = cols[(r() * cols.length) | 0];
      const x = r() * w, y = r() * h, s = s0 + r() * (s1 - s0);
      g.beginPath();
      for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28 + r(); g.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); }
      g.fill();
    }
  };
  const bands = (cols, n, amp, lw, freq = 18) => {
    for (let i = 0; i < n; i++) {
      g.strokeStyle = cols[i % cols.length]; g.lineWidth = lw;
      g.beginPath();
      const y0 = i / n * h * 1.2 - 4, ph = r() * 6;
      for (let x = 0; x <= w; x += 3) g.lineTo(x, y0 + Math.sin(x / freq + ph) * amp);
      g.stroke();
    }
  };
  switch (key) {
    case 'magma': {
      const gr = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 1.4);
      gr.addColorStop(0, '#ffe08a'); gr.addColorStop(.4, '#ff7a1a'); gr.addColorStop(1, '#8b1a0a');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(40,10,5,.65)'; g.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (r() - .5) * 40; y += (r() - .5) * 30; g.lineTo(x, y); }
        g.stroke();
      }
      break;
    }
    case 'basalt': noise('#3b3e43', 30, 3000, 2); dots(['#141517'], 22, 1.5, 4); break;
    case 'andesite': noise('#7a7c80', 30, 3000, 2); polys(['#f2f2ee', '#e6e4dc', '#1d1d1d'], 60, 1.5, 3); break;
    case 'granite': noise('#d8cfc6', 20, 800, 2); polys(['#e9a497', '#d98c7a', '#f4f0e9', '#b5b0a8', '#b5b0a8', '#1f1f1f'], 300, 3, 8); break;
    case 'gravel': noise('#b8a07a', 30, 1500, 2); dots(['#7a6a5a', '#9a8a78', '#5e5a55', '#a8876a', '#c9c1b5'], 30, 5, 11, 'rgba(0,0,0,.25)'); break;
    case 'sand': noise('#d8b878', 50, 5000, 1.5); break;
    case 'mud': noise('#7d7468', 18, 4000, 1); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, h * .3, w, 6); break;
    case 'conglomerate': noise('#b49a74', 30, 2000, 2); dots(['#6f655b', '#8d8070', '#a9a196', '#5a524a', '#c4b6a2'], 26, 5, 12, 'rgba(0,0,0,.3)'); break;
    case 'sandstone': noise('#d4b27a', 36, 4500, 1.5); g.globalAlpha = .25; bands(['#a8844f', '#e8cc96'], 6, 1, 2, 60); g.globalAlpha = 1; break;
    case 'shale': noise('#5b5f66', 16, 1500, 2); bands(['#4a4e55', '#6c7078', '#53575e'], 22, .5, 1.5, 80); break;
    case 'limestone': {
      noise('#cfcbbf', 20, 2500, 2);
      g.strokeStyle = '#8f8a7c'; g.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) {
        const x = r() * w, y = r() * h, s = 4 + r() * 5;
        g.beginPath();
        for (let a = 0; a < 12; a += .3) g.lineTo(x + Math.cos(a) * a / 12 * s, y + Math.sin(a) * a / 12 * s);
        g.stroke();
      }
      break;
    }
    case 'slate': {
      noise('#3f4650', 12, 1500, 2);
      g.strokeStyle = 'rgba(160,175,190,.25)'; g.lineWidth = 1;
      for (let i = -h; i < w; i += 6) { g.beginPath(); g.moveTo(i, h); g.lineTo(i + h * .6, 0); g.stroke(); }
      break;
    }
    case 'schist': {
      noise('#8c8f86', 20, 1500, 2); bands(['#6d7068', '#a9aca2', '#7b7e75'], 14, 3, 2);
      for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,255,255,' + (.3 + r() * .6) + ')'; g.fillRect(r() * w, r() * h, 2, 1); }
      break;
    }
    case 'gneiss': g.fillStyle = '#d9cfc0'; g.fillRect(0, 0, w, h); bands(['#e8dfd2', '#2f2f2f', '#cbbfae', '#3c3a38', '#e3c9b8'], 9, 6, 6, 22); break;
    case 'marble': {
      noise('#f1efea', 10, 2500, 2);
      g.strokeStyle = 'rgba(120,120,130,.45)';
      for (let i = 0; i < 4; i++) {
        g.lineWidth = .8 + r() * 1.5; g.beginPath(); g.moveTo(0, r() * h);
        g.bezierCurveTo(w * .3, r() * h, w * .6, r() * h, w, r() * h); g.stroke();
      }
      break;
    }
    case 'quartzite': noise('#e8d6cc', 30, 4000, 2); polys(['rgba(255,255,255,.4)'], 80, 2, 4); break;
  }
}

/* ===== 循環圖 ===== */
const CN = {
  magma: { x: 150, y: 34, label: '岩漿', c: COL.magma, step: 1 },
  igneous: { x: 266, y: 112, label: '火成岩', c: COL.igneous, step: 3 },
  sediment: { x: 222, y: 214, label: '沉積物', c: COL.sediment, step: 7 },
  sedimentary: { x: 78, y: 214, label: '沉積岩', c: COL.sedimentary, step: 8 },
  metamorphic: { x: 34, y: 112, label: '變質岩', c: COL.metamorphic, step: 9 }
};
const CE = [
  { id: 'm-i', a: 'magma', b: 'igneous', label: '冷卻凝固', f: 'int', curve: -22 },
  { id: 'i-s', a: 'igneous', b: 'sediment', label: '風化侵蝕', f: 'ext', curve: -22 },
  { id: 's-sr', a: 'sediment', b: 'sedimentary', label: '壓密膠結', f: 'ext', curve: -22 },
  { id: 'sr-mt', a: 'sedimentary', b: 'metamorphic', label: '高溫高壓', f: 'int', curve: -22 },
  { id: 'mt-m', a: 'metamorphic', b: 'magma', label: '熔融', f: 'int', curve: -22 },
  { id: 'i-mt', a: 'igneous', b: 'metamorphic', label: '高溫高壓', f: 'int', curve: 0, dash: true },
  { id: 'sr-s', a: 'sedimentary', b: 'sediment', label: '風化', f: 'ext', curve: -16, dash: true },
  { id: 'mt-s', a: 'metamorphic', b: 'sediment', label: '風化', f: 'ext', curve: 14, dash: true }
];
