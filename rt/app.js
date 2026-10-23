// Reaction Time Explorer - Zero-build JS implementation
// Core goals: seedable randomization, center/grid positioning, foreperiod scheduling, pointer handling, WebAudio beep,
// data recording and CSV export. Designed for tablet use. 

// ---------------------------- Utilities ----------------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function nowMs() { return performance.now(); }
function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

// Hash string to 32-bit int and mulberry32 PRNG
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededRng(seedStr) {
  const seed = xmur3(seedStr)();
  return mulberry32(seed);
}
function pickRand(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function uniformInt(rng, a, b) { // inclusive a..b
  return Math.floor(rng() * (b - a + 1)) + a;
}

function toPxSize(sizeStr, stage) {
  // Supports: vmin/vmax/vw/vh or px
  if (sizeStr.endsWith('px')) return parseFloat(sizeStr);
  const w = stage.clientWidth, h = stage.clientHeight;
  const vmin = Math.min(w, h) / 100;
  const vmax = Math.max(w, h) / 100;
  const vw = w / 100, vh = h / 100;
  const num = parseFloat(sizeStr);
  if (sizeStr.endsWith('vmin')) return num * vmin;
  if (sizeStr.endsWith('vmax')) return num * vmax;
  if (sizeStr.endsWith('vw')) return num * vw;
  if (sizeStr.endsWith('vh')) return num * vh;
  return num; // fallback as px
}

function csvEscape(val) {
  if (val == null) return '';
  const s = String(val);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function download(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}

function mean(arr) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a,b)=>a-b);
  const mid = Math.floor(s.length/2);
  return s.length % 2 ? s[mid] : (s[mid-1] + s[mid]) / 2;
}
function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = mean(arr.map(x => (x - m) ** 2));
  return Math.sqrt(v);
}

// ---------------------------- Audio ----------------------------
class Beeper {
  constructor() { this.ctx = null; this.enabled = true; this.volume = 0.4; }
  ensureCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  async beepAt(onsetTime, leadMs = 0) {
    if (!this.enabled) return;
    this.ensureCtx();
    const ctx = this.ctx;
    const startAt = ctx.currentTime + Math.max(0, (onsetTime - performance.now() + leadMs) / 1000);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.value = this.volume;
    o.connect(g).connect(ctx.destination);
    const dur = 0.06; // 60 ms
    o.start(startAt);
    o.stop(startAt + dur);
  }
}

// ---------------------------- Experiment Engine ----------------------------
const state = {
  sessionId: '',
  participantId: '',
  deviceInfo: navigator.userAgent,
  viewport: { w: 0, h: 0 },
  appVersion: '0.1.0',
  order: 'AB',
  practice: true,
  configA: null,
  configB: null,
  currentRun: null, // runtime details
  results: [], // trial-level records across all conditions
};

const beeper = new Beeper();

function buildRng(seedString) {
  const seed = seedString && seedString.trim() ? seedString.trim() : `auto-${Date.now()}`;
  return { rng: seededRng(seed), seed };
}

function buildGridPositions(stageRect, grid, marginPx) {
  const [gx, gy] = grid;
  const left = marginPx, top = marginPx;
  const right = stageRect.width - marginPx, bottom = stageRect.height - marginPx;
  const width = right - left, height = bottom - top;
  const xs = Array.from({length: gx}, (_,i)=> left + (i+0.5) * width / gx);
  const ys = Array.from({length: gy}, (_,i)=> top + (i+0.5) * height / gy);
  const cells = [];
  for (const x of xs) for (const y of ys) cells.push({ x, y });
  return cells;
}

function choosePosition(cfgPos, stage, rng) {
  const rect = stage.getBoundingClientRect();
  const margin = cfgPos.edgeMarginPx ?? 24;
  if (cfgPos.mode === 'fixed') {
    const x = clamp(rect.width * (cfgPos.x ?? 0.5), margin, rect.width - margin);
    const y = clamp(rect.height * (cfgPos.y ?? 0.5), margin, rect.height - margin);
    return { x, y, gridCell: null };
  } else if (cfgPos.mode === 'grid') {
    const cells = buildGridPositions(rect, cfgPos.grid ?? [3,3], margin);
    const idx = Math.floor(rng() * cells.length);
    return { ...cells[idx], gridCell: idx };
  } else { // full random
    const x = uniformInt(rng, margin, rect.width - margin);
    const y = uniformInt(rng, margin, rect.height - margin);
    return { x, y, gridCell: null };
  }
}

function chooseForeperiod(cfgTiming, rng) {
  const fp = cfgTiming.foreperiod || { mode: 'fixed', ms: 1000 };
  if (fp.mode === 'fixed') return fp.ms ?? 1000;
  if (fp.mode === 'uniform') {
    const min = Math.floor(fp.minMs ?? 500), max = Math.floor(fp.maxMs ?? 1500);
    return uniformInt(rng, min, max);
  }
  // discrete set
  if (Array.isArray(fp.set)) return pickRand(rng, fp.set);
  return 1000;
}

function pickFrom(rng, arr) { return arr && arr.length ? pickRand(rng, arr) : undefined; }

function nextSessionId() {
  const t = new Date();
  const pad = (n)=> String(n).padStart(2,'0');
  return `S-${t.getFullYear()}${pad(t.getMonth()+1)}${pad(t.getDate())}-${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;
}

function formatProgress(run) {
  return `條件 ${run.conditionId}｜區塊 ${run.blockIndex+1}/${run.totalBlocks}｜試次 ${run.trialIndex+1}/${run.trialsPerBlock}`;
}

function showMsg(msg, ms=600) {
  const el = $('#overlayMsg');
  el.textContent = msg;
  el.hidden = false;
  if (ms>0) setTimeout(()=>{ el.hidden = true; }, ms);
}

// ---------------------------- Runner ----------------------------
class Runner {
  constructor(stage, target) {
    this.stage = stage; this.target = target;
    this.running = false; this.paused = false;
    this.handlersBound = false;
    this.current = null; // per-trial state
    this.onTrialEnd = null; // callback(trialRecord)
    this.onProgress = null; // callback(text)
    this.onAllDone = null; // callback()
    this.pointerListener = (ev) => this.handlePointer(ev);
  }

  bindPointer() {
    if (!this.handlersBound) {
      this.stage.addEventListener('pointerdown', this.pointerListener, { passive: true });
      this.handlersBound = true;
    }
  }
  unbindPointer() {
    if (this.handlersBound) {
      this.stage.removeEventListener('pointerdown', this.pointerListener);
      this.handlersBound = false;
    }
  }

  async start(runCfg) {
    this.running = true; this.paused = false;
    this.runCfg = runCfg;
    this.blockIndex = 0;
    this.bindPointer();
    await this.runBlocks();
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  stop() { this.running = false; this.unbindPointer(); this.hideTarget(); }

  hideTarget() { this.target.hidden = true; this.target.style.transform = 'translate(-9999px,-9999px)'; }

  async runBlocks() {
    const { totalBlocks } = this.runCfg;
    for (let b=0; b<totalBlocks && this.running; b++) {
      this.blockIndex = b;
      await this.runOneBlock();
      if (!this.running) break;
      if (b < totalBlocks-1) { showMsg('休息一下', 800); await sleep(800); }
    }
    this.stop();
    this.onAllDone && this.onAllDone();
  }

  async runOneBlock() {
    const { trialsPerBlock, rng, config } = this.runCfg;
    for (let i=0; i<trialsPerBlock && this.running; i++) {
      this.current = {
        conditionId: config.id,
        blockIndex: this.blockIndex,
        trialIndex: i,
        scheduledOnset: 0,
        actualOnset: 0,
        responded: false,
        finished: false,
        timeoutTimer: null,
        foreperiod: 0,
        targetRect: null,
        position: null,
        color: null,
        sizePx: 24,
        hasAudio: !!config.audio?.enabled,
        audioLeadMs: config.audio?.leadMs ?? 0,
        responseTimeoutMs: Math.max(100, config.timing?.responseTimeoutMs ?? 2000),
        anticipatoryMs: config.exclusion?.anticipatoryMs ?? 150,
      };

      const progress = {
        conditionId: config.id,
        blockIndex: this.blockIndex,
        totalBlocks: this.runCfg.totalBlocks,
        trialIndex: i,
        trialsPerBlock,
      };
      this.onProgress && this.onProgress(formatProgress(progress));

      // Wait for pause to clear (pause takes effect between trials)
      while (this.paused && this.running) await sleep(50);
      if (!this.running) break;

      await this.runOneTrial(config, this.current, rng);
      if (!this.running) break;

      // ITI
      await sleep(Math.max(0, config.timing?.itiMs ?? 600));
    }
  }

  async runOneTrial(config, cur, rng) {
    // Choose attributes
    const stage = this.stage;
    const pos = choosePosition(config.position || {mode:'fixed',x:.5,y:.5,edgeMarginPx:24}, stage, rng);
    const sizeStr = pickFrom(rng, config.target?.sizes || ['3vmin']);
    const color = pickFrom(rng, config.target?.colors || ['#ffffff']);
    const sizePx = toPxSize(sizeStr, stage);

    // Schedule foreperiod
    const foreperiod = chooseForeperiod(config.timing || {}, rng);
    cur.foreperiod = foreperiod; cur.position = pos; cur.color = color; cur.sizePx = sizePx;

    // Prepare target
    const t = this.target; t.hidden = true; t.style.background = color;
    t.style.width = `${Math.round(sizePx)}px`; t.style.height = `${Math.round(sizePx)}px`;
    const left = pos.x - sizePx/2, top = pos.y - sizePx/2;
    t.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;

    // Listen for false alarm during foreperiod
    cur.phase = 'foreperiod';
    const foreStart = nowMs();
    const scheduledOnset = foreStart + foreperiod;
    cur.scheduledOnset = scheduledOnset;

    // Audio schedule
    if (cur.hasAudio) beeper.beepAt(scheduledOnset, cur.audioLeadMs);

    // Wait until foreperiod ends (busy-wait vs timeout)
    // Use a short sleep loop to remain interruptible
    while (nowMs() < scheduledOnset && this.running) {
      if (this.paused) return; // will be re-run on resume at next trial
      await sleep(5);
    }
    if (!this.running || this.paused) return;

    // Show target on next animation frame for tighter onset
    await new Promise((res) => requestAnimationFrame(res));
    t.hidden = false;
    cur.actualOnset = nowMs();
    cur.phase = 'target';

    // Timeout timer
    const toMs = cur.responseTimeoutMs;
    cur.timeoutTimer = setTimeout(() => this.finishTrial({ type: 'timeout' }), toMs);

    // Wait for trial to finish
    await new Promise((res) => {
      const check = () => {
        if (cur.finished || !this.running || this.paused) return res();
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });

    // Ensure target hidden
    this.hideTarget();
  }

  handlePointer(ev) {
    if (!this.running) return;
    if (!this.current) return;
    const cur = this.current;
    const stageRect = this.stage.getBoundingClientRect();
    const x = ev.clientX - stageRect.left; const y = ev.clientY - stageRect.top;

    if (cur.phase === 'foreperiod') {
      // False alarm
      this.finishTrial({ type: 'fa', x, y });
      return;
    }
    if (cur.phase === 'target') {
      const rt = nowMs() - cur.actualOnset;
      // inside target?
      const dx = x - cur.position.x, dy = y - cur.position.y;
      const r = cur.sizePx/2;
      const inCircle = (dx*dx + dy*dy) <= (r*r);
      this.finishTrial({ type: 'response', x, y, rt, hit: inCircle });
      return;
    }
  }

  finishTrial({ type, x=null, y=null, rt=null, hit=null }) {
    const cur = this.current; if (!cur || cur.finished) return; cur.finished = true;
    clearTimeout(cur.timeoutTimer); cur.timeoutTimer = null;

    const anticipatory = rt != null && rt < cur.anticipatoryMs;
    const rec = {
      sessionId: state.sessionId,
      participantId: state.participantId,
      deviceInfo: state.deviceInfo,
      viewportW: state.viewport.w,
      viewportH: state.viewport.h,
      dateTime: new Date().toISOString(),

      conditionId: this.runCfg.config.id,
      trialIndex: cur.trialIndex,
      blockIndex: this.blockIndex,

      targetColor: cur.color,
      targetSizePx: Math.round(cur.sizePx),
      targetShape: this.runCfg.config.target?.shape || 'circle',
      positionX: Math.round(cur.position.x),
      positionY: Math.round(cur.position.y),
      gridCell: cur.position.gridCell ?? '',

      foreperiod: cur.foreperiod,
      hasAudio: cur.hasAudio,
      audioLeadMs: cur.audioLeadMs,

      scheduledOnset: Math.round(cur.scheduledOnset),
      actualOnset: Math.round(cur.actualOnset),
      responseTime: rt != null ? Math.round(cur.actualOnset + rt) : '',
      rtMs: rt != null ? Math.round(rt) : '',

      clickX: x != null ? Math.round(x) : '',
      clickY: y != null ? Math.round(y) : '',

      hit: hit === true,
      anticipatory: !!anticipatory,
      timeout: type === 'timeout',
      errorType: type === 'fa' ? 'FA' : (type === 'timeout' ? 'Miss' : (hit ? 'none' : 'Other')),
    };

    this.onTrialEnd && this.onTrialEnd(rec);
  }
}

// ---------------------------- App Wiring ----------------------------
async function loadConfig(name) {
  const res = await fetch(`./config/${name}`);
  if (!res.ok) throw new Error(`載入設定失敗：${name}`);
  return await res.json();
}

function showConfigInfo(a, b) {
  const info = $('#configInfo');
  const brief = (c)=> c ? `${c.label || c.id}｜每區 ${c.trialsPerBlock} 試｜區塊 ${c.blocks}` : '—';
  info.textContent = `A：${brief(a)}；B：${brief(b)}`;
}

function updateProgress(text) { $('#progressText').textContent = text; }

function computeSummaryByCondition(rows) {
  const byCond = new Map();
  for (const r of rows) {
    if (!byCond.has(r.conditionId)) byCond.set(r.conditionId, []);
    byCond.get(r.conditionId).push(r);
  }
  const summaries = [];
  for (const [cond, arr] of byCond) {
    const hits = arr.filter(r => r.hit && !r.anticipatory && !r.timeout && r.errorType==='none').map(r => r.rtMs);
    const fa = arr.filter(r => r.errorType === 'FA').length;
    const miss = arr.filter(r => r.timeout).length;
    summaries.push({
      conditionId: cond,
      n: arr.length,
      hits: hits.length,
      rtMean: Math.round(mean(hits)),
      rtMedian: Math.round(median(hits)),
      rtSd: Math.round(stddev(hits)),
      fa, miss
    });
  }
  return summaries;
}

function renderSummary() {
  const rows = state.results;
  const sum = computeSummaryByCondition(rows);
  if (!sum.length) { $('#summary').innerHTML = '<p>尚無資料</p>'; return; }
  let html = '<table class="table"><thead><tr><th>條件</th><th>總試次</th><th>命中數</th><th>平均RT</th><th>中位RT</th><th>SD</th><th>FA</th><th>Miss</th></tr></thead><tbody>';
  for (const s of sum) {
    html += `<tr><td>${s.conditionId}</td><td>${s.n}</td><td>${s.hits}</td><td>${s.rtMean}</td><td>${s.rtMedian}</td><td>${s.rtSd}</td><td>${s.fa}</td><td>${s.miss}</td></tr>`;
  }
  html += '</tbody></table>';
  $('#summary').innerHTML = html;

  // raw preview (last 10 rows)
  const last = rows.slice(-10);
  $('#rawData').textContent = JSON.stringify(last, null, 2);
}

function exportCSV() {
  const rows = state.results;
  if (!rows.length) { alert('尚無資料可匯出'); return; }
  const header = [
    'sessionId','participantId','deviceInfo','viewportW','viewportH','dateTime',
    'conditionId','trialIndex','blockIndex','targetColor','targetSizePx','targetShape','positionX','positionY','gridCell',
    'foreperiod','hasAudio','audioLeadMs','scheduledOnset','actualOnset','responseTime','rtMs',
    'clickX','clickY','hit','anticipatory','timeout','errorType'
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    const vals = header.map(k => csvEscape(r[k]));
    lines.push(vals.join(','));
  }
  const name = `${state.sessionId || 'session'}_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
  download(name, lines.join('\n'));
}

function generateSummaryText() {
  const rows = state.results;
  if (!rows || !rows.length) return '';

  const summaries = computeSummaryByCondition(rows);
  const now = new Date();
  const formatDateTime = now.toLocaleString('zh-TW', { hour12: false });

  let text = '==============================\n';
  text += '📋 反應時間探究測驗報告\n';
  text += '==============================\n';
  text += `受試者代號：${state.participantId || '（未填寫）'}\n`;
  text += `測驗場次：${state.sessionId || '（無）'}\n`;
  text += `測驗時間：${formatDateTime}\n`;
  text += `設備環境：${state.deviceInfo || navigator.userAgent}\n`;
  text += `視窗解析度：${state.viewport.w} × ${state.viewport.h}\n`;
  text += `條件順序：${state.order || 'AB'}\n\n`;

  text += '【條件分組摘要數據】\n';
  for (const s of summaries) {
    const hitRate = s.n > 0 ? ((s.hits / s.n) * 100).toFixed(1) : '0.0';
    const faRate = s.n > 0 ? ((s.fa / s.n) * 100).toFixed(1) : '0.0';
    const missRate = s.n > 0 ? ((s.miss / s.n) * 100).toFixed(1) : '0.0';

    text += `▶ 條件：${s.conditionId}\n`;
    text += `  • 總試次：${s.n} 試\n`;
    text += `  • 有效命中數 (Hits)：${s.hits} 次 (${hitRate}%)\n`;
    text += `  • 平均反應時間 (Mean RT)：${s.rtMean} ms\n`;
    text += `  • 中位數反應時間 (Median RT)：${s.rtMedian} ms\n`;
    text += `  • 標準差 (SD)：${s.rtSd} ms\n`;
    text += `  • 提早誤按 / 虛報 (FA)：${s.fa} 次 (誤按率: ${faRate}%)\n`;
    text += `  • 逾時漏失 (Miss)：${s.miss} 次 (漏失率: ${missRate}%)\n\n`;
  }

  // 全體匯總
  const allHits = rows.filter(r => r.hit && !r.anticipatory && !r.timeout && r.errorType === 'none').map(r => r.rtMs);
  const totalFA = rows.filter(r => r.errorType === 'FA').length;
  const totalMiss = rows.filter(r => r.timeout).length;
  const totalHitRate = rows.length > 0 ? ((allHits.length / rows.length) * 100).toFixed(1) : '0.0';
  const totalFaRate = rows.length > 0 ? ((totalFA / rows.length) * 100).toFixed(1) : '0.0';

  text += '【整體統計彙總】\n';
  text += `  • 累計總試次：${rows.length} 試\n`;
  text += `  • 全體平均反應時間：${Math.round(mean(allHits))} ms\n`;
  text += `  • 全體中位反應時間：${Math.round(median(allHits))} ms\n`;
  text += `  • 全體標準差 (SD)：${Math.round(stddev(allHits))} ms\n`;
  text += `  • 全體命中率：${totalHitRate}%\n`;
  text += `  • 全體虛報率 (FA Rate)：${totalFaRate}%\n`;
  text += '==============================\n';

  return text;
}

function showToast(msg, duration = 2500) {
  let toast = $('#toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast.__timer);
  toast.__timer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

async function copySummaryText() {
  const rows = state.results;
  if (!rows || !rows.length) {
    alert('尚無資料可複製，請先完成實驗測驗！');
    return;
  }

  const text = generateSummaryText();
  const copyBtn = $('#btn-copy-summary');
  const originalText = copyBtn ? copyBtn.textContent : '複製結果文字';

  let copied = false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (err) {
      console.warn('Clipboard API 寫入失敗，切換降級相容模式:', err);
    }
  }

  if (!copied) {
    // 降級方案：document.execCommand('copy')
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      copied = document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (fallbackErr) {
      console.error('降級複製亦失敗:', fallbackErr);
    }
  }

  if (copied) {
    if (copyBtn) {
      copyBtn.textContent = '✅ 已複製文字！';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('copied');
      }, 2000);
    }
    showToast('✅ 測驗結果已成功複製到剪貼簿！');
  } else {
    alert('複製失敗，請手動複製下列文字：\n\n' + text);
  }
}

// 暴露於 window 供測試與腳本調用
window.generateSummaryText = generateSummaryText;
window.copySummaryText = copySummaryText;

function setButtons({ running }) {
  $('#btn-start').disabled = running;
  $('#btn-pause').disabled = !running;
  $('#btn-resume').disabled = true;
}

function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen();
}

async function startExperiment() {
  // Unlock audio context on first gesture
  try { beeper.ensureCtx(); } catch {}

  const participantId = $('#participantId').value.trim();
  const seedInput = $('#seedInput').value.trim();
  const order = $('#orderSelect').value;
  const withPractice = $('#practiceSelect').value === 'on';

  const configAName = $('#controlConfigSelect').value;
  const configBName = $('#expConfigSelect').value;

  const [cfgA, cfgB] = await Promise.all([
    loadConfig(configAName), loadConfig(configBName)
  ]);

  if (!withPractice) { cfgA.practiceTrials = 0; cfgB.practiceTrials = 0; }

  const { rng, seed } = buildRng(seedInput);

  state.sessionId = nextSessionId();
  state.participantId = participantId;
  state.viewport = { w: $('#stage').clientWidth, h: $('#stage').clientHeight };
  state.order = order;
  state.results = [];
  state.configA = cfgA; state.configB = cfgB;
  beeper.enabled = !!(cfgA.audio?.enabled || cfgB.audio?.enabled);
  beeper.volume = (cfgA.audio?.volume ?? 0.4);

  showConfigInfo(cfgA, cfgB);

  const orderList = order === 'AB' ? [cfgA, cfgB] : [cfgB, cfgA];

  setButtons({ running: true });

  const runner = new Runner($('#stage'), $('#target'));
  state.currentRun = runner;
  runner.onProgress = (txt) => updateProgress(txt);
  runner.onTrialEnd = (rec) => { state.results.push(rec); };
  runner.onAllDone = () => {
    setButtons({ running: false });
    updateProgress('完成');
    $('#resultsPanel').classList.add('show');
    renderSummary();
  };

  // Practice then formal for each condition
  for (const cfg of orderList) {
    // Practice
    if (cfg.practiceTrials > 0) {
      showMsg('練習開始', 600);
      await runner.start({
        config: cfg,
        trialsPerBlock: cfg.practiceTrials,
        totalBlocks: 1,
        rng,
      });
      if (!runner.running) break;
      showMsg('練習結束', 800);
      await sleep(800);
    }

    // Formal blocks
    showMsg(`條件 ${cfg.id} 開始`, 600);
    await runner.start({
      config: cfg,
      trialsPerBlock: cfg.trialsPerBlock,
      totalBlocks: cfg.blocks,
      rng,
    });
    if (!runner.running) break;
    showMsg(`條件 ${cfg.id} 結束`, 800);
    await sleep(800);
  }
}

function clearResults() {
  state.results = [];
  $('#resultsPanel').classList.remove('show');
  $('#summary').innerHTML = '';
  $('#rawData').textContent = '';
  updateProgress('尚未開始');
}

// ---------------------------- Event bindings ----------------------------
window.addEventListener('DOMContentLoaded', () => {
  // Buttons
  $('#btn-start').addEventListener('click', startExperiment);
  $('#btn-export').addEventListener('click', exportCSV);
  $('#btn-export-2').addEventListener('click', exportCSV);
  const btnCopy = $('#btn-copy-summary');
  if (btnCopy) btnCopy.addEventListener('click', copySummaryText);
  $('#btn-clear').addEventListener('click', clearResults);
  $('#btn-fullscreen').addEventListener('click', enterFullscreen);

  // Pause/Resume hooks (effective between trials)
  $('#btn-pause').addEventListener('click', () => {
    const r = state.currentRun; if (r) { r.pause(); $('#btn-resume').disabled = false; $('#btn-pause').disabled = true; showMsg('將於本試次後暫停', 800); }
  });
  $('#btn-resume').addEventListener('click', () => {
    const r = state.currentRun; if (r) { r.resume(); $('#btn-resume').disabled = true; $('#btn-pause').disabled = false; showMsg('繼續', 600); }
  });

  // Populate config info
  showConfigInfo(null, null);

  // Prevent gesture zoom on double-tap
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (window.__lastTap && (now - window.__lastTap) < 300) e.preventDefault();
    window.__lastTap = now;
  }, { passive: false });
});
