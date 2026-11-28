(() => {
  'use strict';

  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const ZODIAC_NAMES = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
  const ZODIAC_EMOJIS = ['🐭', '🐮', '🐯', '🐰', '🐲', '🐍', '🐴', '🐑', '🐵', '🐔', '🐶', '🐷'];

  const STEM_WUXING = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  const WUXING_COLOR = {
    '木': '#22c55e',
    '火': '#ef4444',
    '土': '#eab308',
    '金': '#cbd5e1',
    '水': '#38bdf8'
  };

  // --- DOM ---
  const svg = document.getElementById('zodiac-svg');
  const yearInput = document.getElementById('year-input');
  const btnLookup = document.getElementById('btn-lookup');
  const btnToday = document.getElementById('btn-today');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnPlay = document.getElementById('btn-play');

  const detailYearEl = document.getElementById('detail-year');
  const detailGanzhiEl = document.getElementById('detail-ganzhi');
  const detailZodiacEl = document.getElementById('detail-zodiac');
  const detailStemEl = document.getElementById('detail-stem');
  const detailBranchEl = document.getElementById('detail-branch');
  const detailIndexEl = document.getElementById('detail-index');
  const detailYinYangEl = document.getElementById('detail-yinyang');
  const detailRelatedEl = document.getElementById('detail-related');

  const quizScoreEl = document.getElementById('quiz-score');
  const quizQuestionEl = document.getElementById('quiz-question');
  const quizOptionsEl = document.getElementById('quiz-options');
  const quizFeedbackEl = document.getElementById('quiz-feedback');
  const btnNextQuiz = document.getElementById('btn-next-quiz');

  // --- State ---
  let cycleBaseYear = 1984;
  let selectedYear = new Date().getFullYear();
  let activeWx = 'all';
  let playTimer = null;
  let quizCorrectCount = 0;
  let currentQuizAnswer = null;
  let quizAnswered = false;

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function getYearInfo(year) {
    const idx60 = mod(year - 1984, 60);
    const stemIdx = idx60 % 10;
    const branchIdx = idx60 % 12;
    const stem = STEMS[stemIdx];
    const branch = BRANCHES[branchIdx];
    const wx = STEM_WUXING[stemIdx];
    const yinYang = stemIdx % 2 === 0 ? '陽' : '陰';
    return {
      year,
      idx60,
      stem,
      branch,
      ganzhi: `${stem}${branch}`,
      wx,
      yinYang,
      zodiacName: ZODIAC_NAMES[branchIdx],
      zodiacEmoji: ZODIAC_EMOJIS[branchIdx],
      color: WUXING_COLOR[wx]
    };
  }

  function syncCycleBaseForYear(year) {
    // Snap cycleBaseYear to the 60-year cycle containing `year` (1984 is a Jia-Zi year)
    const offset = Math.floor((year - 1984) / 60);
    cycleBaseYear = 1984 + offset * 60;
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.base) === cycleBaseYear);
    });
  }

  // --- SVG Wheel Builder ---
  function createSvgEl(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  function sectorPath(rIn, rOut, a1Deg, a2Deg) {
    const a1 = ((a1Deg - 90) * Math.PI) / 180;
    const a2 = ((a2Deg - 90) * Math.PI) / 180;
    const x1 = Math.cos(a1) * rOut;
    const y1 = Math.sin(a1) * rOut;
    const x2 = Math.cos(a2) * rOut;
    const y2 = Math.sin(a2) * rOut;
    const x3 = Math.cos(a2) * rIn;
    const y3 = Math.sin(a2) * rIn;
    const x4 = Math.cos(a1) * rIn;
    const y4 = Math.sin(a1) * rIn;
    return `M ${x1} ${y1} A ${rOut} ${rOut} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 0 0 ${x4} ${y4} Z`;
  }

  function renderWheel() {
    svg.innerHTML = '';
    const selectedIdx = mod(selectedYear - 1984, 60);

    // Background rings
    svg.appendChild(createSvgEl('circle', { cx: 0, cy: 0, r: 410, fill: '#0f172a', stroke: 'rgba(255,255,255,0.14)', 'stroke-width': 2 }));
    svg.appendChild(createSvgEl('circle', { cx: 0, cy: 0, r: 345, fill: 'none', stroke: 'rgba(255,255,255,0.12)', 'stroke-width': 1 }));
    svg.appendChild(createSvgEl('circle', { cx: 0, cy: 0, r: 280, fill: 'none', stroke: 'rgba(255,255,255,0.12)', 'stroke-width': 1 }));
    svg.appendChild(createSvgEl('circle', { cx: 0, cy: 0, r: 215, fill: 'none', stroke: 'rgba(255,255,255,0.12)', 'stroke-width': 1 }));
    svg.appendChild(createSvgEl('circle', { cx: 0, cy: 0, r: 150, fill: '#111827', stroke: 'rgba(255,255,255,0.2)', 'stroke-width': 2 }));

    for (let i = 0; i < 60; i++) {
      const year = cycleBaseYear + i;
      const info = getYearInfo(year);
      const aCenter = i * 6;
      const a1 = aCenter - 3;
      const a2 = aCenter + 3;
      const isSelected = i === selectedIdx;
      const isDimmed = activeWx !== 'all' && info.wx !== activeWx;

      const g = createSvgEl('g', {
        class: `sector-group ${isDimmed ? 'dimmed' : ''}`,
        'data-year': year
      });

      // Highlight wedge
      const wedge = createSvgEl('path', {
        d: sectorPath(150, 410, a1, a2),
        fill: isSelected ? 'rgba(251, 191, 36, 0.28)' : 'rgba(255,255,255,0.01)',
        stroke: isSelected ? '#fbbf24' : 'rgba(255,255,255,0.08)',
        'stroke-width': isSelected ? 2.2 : 0.8
      });
      g.appendChild(wedge);

      const rad = ((aCenter - 90) * Math.PI) / 180;
      const addRadialText = (r, txt, fill, size, bold = false) => {
        const tx = Math.cos(rad) * r;
        const ty = Math.sin(rad) * r;
        const t = createSvgEl('text', {
          x: tx,
          y: ty,
          fill,
          'font-size': size,
          'font-weight': bold ? '800' : '600',
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          transform: `rotate(${aCenter}, ${tx}, ${ty})`
        });
        t.textContent = txt;
        g.appendChild(t);
      };

      // Year (outer), Stem (mid-outer), Branch (mid-inner), Zodiac (inner)
      addRadialText(378, String(year), isSelected ? '#fde68a' : '#94a3b8', 11.5, isSelected);
      addRadialText(312, info.stem, info.color, 18, true);
      addRadialText(247, info.branch, '#e2e8f0', 17, isSelected);
      addRadialText(182, info.zodiacEmoji, '#fff', 16, false);

      g.addEventListener('click', () => selectYear(year));
      svg.appendChild(g);
    }

    // Center hub summary
    const selInfo = getYearInfo(selectedYear);
    const cYear = createSvgEl('text', { x: 0, y: -44, fill: '#94a3b8', 'font-size': 18, 'font-weight': 700, 'text-anchor': 'middle' });
    cYear.textContent = `${selInfo.year} 年`;
    const cGz = createSvgEl('text', { x: 0, y: 2, fill: '#fde68a', 'font-size': 46, 'font-weight': 900, 'text-anchor': 'middle' });
    cGz.textContent = selInfo.ganzhi;
    const cMeta = createSvgEl('text', { x: 0, y: 48, fill: selInfo.color, 'font-size': 20, 'font-weight': 700, 'text-anchor': 'middle' });
    cMeta.textContent = `${selInfo.zodiacEmoji} ${selInfo.zodiacName} · 五行${selInfo.wx}`;
    const cSub = createSvgEl('text', { x: 0, y: 80, fill: '#64748b', 'font-size': 13, 'text-anchor': 'middle' });
    cSub.textContent = `第 ${selInfo.idx60 + 1} / 60 位`;

    svg.append(cYear, cGz, cMeta, cSub);
  }

  function updateDetailPanel() {
    const info = getYearInfo(selectedYear);
    const roc = selectedYear - 1911;
    const rocText = roc >= 1 ? `民國 ${roc} 年` : `民國前 ${1 - roc} 年`;

    detailYearEl.textContent = `西元 ${selectedYear} 年（${rocText}）`;
    detailGanzhiEl.textContent = `${info.ganzhi}年`;
    detailZodiacEl.textContent = info.zodiacEmoji;
    detailStemEl.textContent = `${info.stem} · 五行${info.wx}`;
    detailStemEl.style.color = info.color;
    detailBranchEl.textContent = `${info.branch} · ${info.zodiacName}`;
    detailIndexEl.textContent = `第 ${info.idx60 + 1} / 60 位`;
    detailYinYangEl.textContent = info.yinYang;

    const sameYears = [-120, -60, 0, 60, 120].map((d) => selectedYear + d).filter((y) => y > 0);
    detailRelatedEl.textContent = `同干支年份：${sameYears.join('、')}`;
    yearInput.value = String(selectedYear);
  }

  function selectYear(year) {
    selectedYear = Math.max(1, Math.min(9999, Math.round(year)));
    syncCycleBaseForYear(selectedYear);
    updateDetailPanel();
    renderWheel();
  }

  // --- Quiz Generator ---
  function generateQuiz() {
    quizAnswered = false;
    quizFeedbackEl.textContent = '';
    quizOptionsEl.innerHTML = '';

    const baseYear = 1984 + Math.floor(Math.random() * 60);
    const baseInfo = getYearInfo(baseYear);
    const type = Math.random() < 0.5 ? 'nextYear' : 'zodiac';

    let question = '';
    let answer = '';
    const choices = new Set();

    if (type === 'nextYear') {
      const nextInfo = getYearInfo(baseYear + 1);
      question = `已知 ${baseYear} 年是「${baseInfo.ganzhi}年」，請問隔年（${baseYear + 1} 年）是什麼干支年？`;
      answer = nextInfo.ganzhi;
      choices.add(answer);
      while (choices.size < 4) {
        const randInfo = getYearInfo(baseYear + 1 + Math.floor(Math.random() * 11) + 1);
        choices.add(randInfo.ganzhi);
      }
    } else {
      question = `「${baseInfo.ganzhi}年」（${baseYear} 年）對應的生肖與天干五行分別是？`;
      answer = `${baseInfo.zodiacName} · ${baseInfo.wx}`;
      choices.add(answer);
      while (choices.size < 4) {
        const rInfo = getYearInfo(1984 + Math.floor(Math.random() * 60));
        choices.add(`${rInfo.zodiacName} · ${rInfo.wx}`);
      }
    }

    currentQuizAnswer = answer;
    quizQuestionEl.textContent = question;

    const shuffled = Array.from(choices).sort(() => Math.random() - 0.5);
    shuffled.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        if (quizAnswered) return;
        quizAnswered = true;
        if (opt === currentQuizAnswer) {
          btn.classList.add('correct');
          quizCorrectCount++;
          quizScoreEl.textContent = `答對 ${quizCorrectCount} 題`;
          quizFeedbackEl.textContent = '✅ 答對了！干支是 10 天干與 12 地支的最小公倍數循環。';
        } else {
          btn.classList.add('wrong');
          quizOptionsEl.querySelectorAll('.quiz-opt').forEach((b) => {
            if (b.textContent === currentQuizAnswer) b.classList.add('correct');
          });
          quizFeedbackEl.textContent = `❌ 正確答案是：${currentQuizAnswer}`;
        }
      });
      quizOptionsEl.appendChild(btn);
    });
  }

  // --- Events ---
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const newBase = Number(btn.dataset.base);
      const offset = mod(selectedYear - 1984, 60);
      selectYear(newBase + offset);
    });
  });

  document.querySelectorAll('.wx-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeWx = btn.dataset.wx;
      document.querySelectorAll('.wx-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderWheel();
    });
  });

  btnLookup.addEventListener('click', () => {
    const val = parseInt(yearInput.value, 10);
    if (!isNaN(val)) selectYear(val);
  });

  yearInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = parseInt(yearInput.value, 10);
      if (!isNaN(val)) selectYear(val);
    }
  });

  btnToday.addEventListener('click', () => selectYear(new Date().getFullYear()));
  btnPrev.addEventListener('click', () => selectYear(selectedYear - 1));
  btnNext.addEventListener('click', () => selectYear(selectedYear + 1));

  btnPlay.addEventListener('click', () => {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
      btnPlay.textContent = '▶ 輪轉';
    } else {
      btnPlay.textContent = '⏸ 暫停';
      playTimer = setInterval(() => selectYear(selectedYear + 1), 350);
    }
  });

  btnNextQuiz.addEventListener('click', generateQuiz);

  // --- Boot ---
  selectYear(selectedYear);
  generateQuiz();
})();
