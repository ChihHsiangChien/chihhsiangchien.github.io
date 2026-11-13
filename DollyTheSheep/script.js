/**
 * 桃莉羊複製過程互動模擬器 (Dolly the Sheep Cloning Simulator)
 * 具備：同一連續顯微操作台（左側體細胞、中央卵細胞、右側微吸管）、
 * 完整展現「採集核 ➔ 顯微去核 ➔ 轉殖注入核 ➔ 電擊融合 ➔ 分裂」之連續過程！
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // 1. 步驟定義與資料模型 (Step Definitions)
    // =========================================================================
    const STEPS = [
        {
            id: 0,
            title: "準備開始：了解體細胞核轉殖 (SCNT)",
            shortTitle: "準備開始",
            ploidy: "準備就緒",
            tech: "背景介紹",
            sheepHighlight: "all",
            tip: "點擊右方「開始顯微實驗」按鈕，在同一顯微操作台上展開實驗！",
            actionText: "🚀 開始顯微實驗",
            narration: "1996 年蘇格蘭羅斯林研究所利用「體細胞核轉殖 (SCNT)」技術培育出桃莉羊。在顯微鏡視野中，全程統一以「橘色 (2n)」代表白面母羊 A 的體細胞核、「灰色 (1n)」代表黑面母羊 B 的卵細胞核。"
        },
        {
            id: 1,
            title: "步驟 1：黑面母羊 B 卵細胞顯微去核 (Enucleation)",
            shortTitle: "1. 卵細胞去核",
            ploidy: "1n ➔ 0n (移除卵核)",
            tech: "顯微穿刺去核法",
            sheepHighlight: "b",
            tip: "點擊中央卵細胞或右方按鈕，讓微吸管對準並吸出灰色的 1n 卵細胞核！",
            actionText: "✂️ 吸出並移除 1n 卵核",
            narration: "微吸管從右側水平對準黑面母羊 B 的卵細胞，穿刺透明帶將灰色的單倍體 (1n) 卵細胞核吸進管腔並排出移除，只留下具備活化因子的去核卵細胞質。"
        },
        {
            id: 2,
            title: "步驟 2：採集芬恩白面母羊 A 的乳腺體細胞核 (2n)",
            shortTitle: "2. 採集體核",
            ploidy: "2n (雙倍體)",
            tech: "顯微微吸管採樣",
            sheepHighlight: "a",
            tip: "點擊上方母羊 A 體細胞或右方按鈕，驅動微吸管精準吸入橘色的 2n 體細胞核！",
            actionText: "🧪 吸取 2n 體細胞核",
            narration: "微吸管移至芬恩白面母羊 A 的乳腺體細胞，尖端水平對準中心，精準將橘色的雙倍體 (2n) 細胞核吸入玻璃管腔中待命。"
        },
        {
            id: 3,
            title: "步驟 3：體細胞核轉殖注入 (Nuclear Transfer)",
            shortTitle: "3. 轉殖注入",
            ploidy: "2n (轉殖核就位)",
            tech: "顯微注射核轉殖",
            sheepHighlight: "a",
            tip: "點擊去核卵細胞或右方按鈕，將管內的橘色 2n 體細胞核注入去核卵中！",
            actionText: "💉 注入 2n 體細胞核",
            narration: "微吸管攜帶母羊 A 的橘色 2n 體細胞核，水平刺入母羊 B 的去核卵細胞中央，將橘色 2n 細胞核平穩推入卵細胞質中，完成核轉殖！"
        },
        {
            id: 4,
            title: "步驟 4：微電脈衝刺激——細胞融合與發育活化",
            shortTitle: "4. 電擊融合",
            ploidy: "2n (重組重塑中)",
            tech: "電融合與受精活化 (Electrofusion)",
            sheepHighlight: "all",
            tip: "點擊「⚡ 通電微電擊」鈕，施加微電擊促成細胞膜融合成一體！",
            actionText: "⚡ 通電施加微電擊",
            narration: "電極釋放數微秒的高壓微電擊，促使體細胞核與去核卵細胞膜完全融合成一體，同時電訊號喚醒卵質分子啟動胚胎有絲分裂！"
        },
        {
            id: 5,
            title: "步驟 5：早期胚胎體外發育 (卵裂與囊胚)",
            shortTitle: "5. 胚胎分裂",
            ploidy: "2n (有絲分裂)",
            tech: "體外胚胎培養 (IVC)",
            sheepHighlight: "none",
            tip: "點擊右方按鈕推進有絲分裂（2-細胞 ➔ 桑葚胚 ➔ 囊胚形成）！",
            actionText: "🧫 刺激胚胎有絲分裂",
            narration: "在培養皿中，重組細胞開始有絲分裂，依序分裂為 2-細胞、4-細胞、桑葚胚，最終形成具有百顆細胞與內細胞團 (ICM) 的早期囊胚。"
        },
        {
            id: 6,
            title: "步驟 6：將囊胚植入代理孕母（母羊 C）子宮",
            shortTitle: "6. 胚胎植入",
            ploidy: "2n (著床妊娠)",
            tech: "胚胎移植 (ET)",
            sheepHighlight: "c",
            tip: "點擊右方按鈕，驅動移植導管將囊胚送入代理孕母子宮著床！",
            actionText: "🩺 移植囊胚至孕母子宮",
            narration: "利用胚胎移植導管將囊胚送入第三隻母羊——蘇格蘭黑面母羊 C 的子宮內著床。母羊 C 僅提供養分環境，胎兒基因 0% 來自母羊 C！"
        },
        {
            id: 7,
            title: "步驟 7：桃莉羊（Dolly）誕生與遺傳驗證！",
            shortTitle: "7. 桃莉誕生",
            ploidy: "2n (芬恩白面)",
            tech: "複製成功！100% 白面特徵",
            sheepHighlight: "dolly",
            tip: "恭喜！點擊「迎接誕生」，慶祝桃莉小羊來到世界！",
            actionText: "🐑 迎接桃莉羊誕生！",
            narration: "經過 148 天懷孕期，代理孕母順利生下了白面母羊——桃莉！桃莉的面孔是白色的，外貌完全符合供核者母羊 A，證實遺傳性狀由「細胞核」所掌控！"
        }
    ];

    // =========================================================================
    // 2. DOM 元素快取
    // =========================================================================
    const tabLabBtn = document.getElementById('tab-lab-btn');
    const tabSandboxBtn = document.getElementById('tab-sandbox-btn');
    const viewLab = document.getElementById('view-lab');
    const viewSandbox = document.getElementById('view-sandbox');

    const stepperProgress = document.getElementById('stepper-progress');
    const stepNodesContainer = document.getElementById('step-nodes');
    const currentStepBadge = document.getElementById('current-step-badge');
    const narrationTitle = document.getElementById('narration-title');
    const narrationDesc = document.getElementById('narration-desc');
    const badgePloidy = document.getElementById('badge-ploidy');
    const badgeTech = document.getElementById('badge-tech');

    // 操作導引列
    const actionPromptText = document.getElementById('action-prompt-text');
    const btnCanvasAction = document.getElementById('btn-canvas-action');

    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const playPauseText = document.getElementById('play-pause-text');
    const btnReset = document.getElementById('btn-reset');
    const stepBtnContainer = document.getElementById('step-btn-container');

    const btnZoomNormal = document.getElementById('btn-zoom-normal');
    const btnZoomMicro = document.getElementById('btn-zoom-micro');
    const btnSoundToggle = document.getElementById('btn-sound-toggle');
    const soundOnIcon = btnSoundToggle.querySelector('.sound-on-icon');
    const soundOffIcon = btnSoundToggle.querySelector('.sound-off-icon');

    const cardSheepA = document.getElementById('card-sheep-a');
    const cardSheepB = document.getElementById('card-sheep-b');
    const cardSheepC = document.getElementById('card-sheep-c');
    const cardDolly = document.getElementById('card-dolly');
    const dollyStatusBadge = document.getElementById('dolly-status-badge');

    const labCanvas = document.getElementById('lab-canvas');
    const groupGuidelines = document.getElementById('canvas-guidelines');
    const groupSomatic = document.getElementById('group-somatic-source');
    const groupEgg = document.getElementById('group-egg-source');
    const groupFusionCleavage = document.getElementById('group-fusion-cleavage');
    const groupImplantBirth = document.getElementById('group-implant-birth');
    const groupPipettes = document.getElementById('group-pipettes');
    const groupEffects = document.getElementById('group-effects');
    const groupLabels = document.getElementById('group-labels');
    const confettiContainer = document.getElementById('confetti-container');

    // 抽屜與測驗 Modal
    const sheepDrawer = document.getElementById('sheep-detail-drawer');
    const drawerSheepTitle = document.getElementById('drawer-sheep-title');
    const drawerSheepBody = document.getElementById('drawer-sheep-body');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');

    const btnQuizModal = document.getElementById('btn-quiz-modal');
    const quizModal = document.getElementById('quiz-modal');
    const btnCloseQuiz = document.getElementById('btn-close-quiz');
    const quizBody = document.getElementById('quiz-body');
    const quizStatusInfo = document.getElementById('quiz-status-info');
    const btnNextQuestion = document.getElementById('btn-next-question');

    // 沙盒專屬元素
    const optionsDonorA = document.getElementById('options-donor-a');
    const optionsDonorB = document.getElementById('options-donor-b');
    const optionsDonorC = document.getElementById('options-donor-c');
    const btnRunSandbox = document.getElementById('btn-run-sandbox');
    const sandboxAvatarArea = document.getElementById('sandbox-avatar-area');
    const sandboxResultSpecs = document.getElementById('sandbox-result-specs');
    const questCountBadge = document.getElementById('quest-count-badge');

    // =========================================================================
    // 3. 狀態變數 (State)
    // =========================================================================
    let currentStep = 0;
    let isPlaying = false;
    let autoPlayTimer = null;
    let soundEnabled = true;

    // 各步驟完成狀態
    const stepCompletedState = {
        0: false,
        1: false, // 體細胞核已吸入吸管
        2: false, // 卵細胞核已吸出移除
        3: false, // 體細胞核已注入卵中
        4: false, // 電擊融合完成
        5: 0,     // 0: 2細胞, 1: 桑葚胚, 2: 囊胚
        6: false, // 子宮著床完成
        7: false  // 桃莉誕生完成
    };

    // 沙盒狀態
    let selectedDonorA = 'finn_white';
    let selectedDonorB = 'scottish_black';
    let selectedDonorC = 'scottish_black';
    let completedQuests = new Set();

    // =========================================================================
    // 4. Web Audio 音效引擎
    // =========================================================================
    let audioCtx = null;

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playTone(freq, type = 'sine', duration = 0.15, vol = 0.15) {
        if (!soundEnabled) return;
        try {
            initAudio();
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {}
    }

    function playPipetteSound() {
        if (!soundEnabled) return;
        try {
            initAudio();
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(260, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(640, audioCtx.currentTime + 0.25);
            gain.gain.setValueAtTime(0.14, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.28);
        } catch (e) {}
    }

    function playElectricZap() {
        if (!soundEnabled) return;
        try {
            initAudio();
            if (!audioCtx) return;
            const bufferSize = audioCtx.sampleRate * 0.22;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
            }
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1700;
            filter.Q.value = 3;
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);
            noise.start();
            playTone(110, 'sawtooth', 0.16, 0.28);
        } catch (e) {}
    }

    function playDivideSound() {
        if (!soundEnabled) return;
        playTone(540, 'sine', 0.1, 0.14);
        setTimeout(() => playTone(720, 'sine', 0.12, 0.15), 110);
    }

    function playSheepBleat() {
        if (!soundEnabled) return;
        try {
            initAudio();
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            const now = audioCtx.currentTime;
            osc.frequency.setValueAtTime(310, now);
            osc.frequency.linearRampToValueAtTime(370, now + 0.15);
            osc.frequency.linearRampToValueAtTime(290, now + 0.65);

            const lfo = audioCtx.createOscillator();
            const lfoGain = audioCtx.createGain();
            lfo.frequency.value = 7.5;
            lfoGain.gain.value = 16;
            lfo.connect(osc.frequency);
            lfo.start();

            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(820, now);
            filter.Q.value = 4;

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.65);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(now + 0.65);
            lfo.stop(now + 0.65);
        } catch (e) {}
    }

    function playCelebrationFanfare() {
        if (!soundEnabled) return;
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
            setTimeout(() => playTone(freq, 'triangle', 0.35, 0.2), idx * 110);
        });
        setTimeout(playSheepBleat, 550);
    }

    // =========================================================================
    // 5. SVG 向量羊隻繪製
    // =========================================================================
    const DONOR_VARIANTS = {
        finn_white: {
            id: 'finn_white',
            name: '芬恩白面母羊',
            faceColor: '#fff5eb',
            faceBorder: '#fbcfe8',
            fleeceColor: '#f8fafc',
            fleeceBorder: '#cbd5e1',
            earColor: '#fecdd3',
            legColor: '#fbcfe8',
            isMale: false,
            genderName: '雌性 (XX)',
            faceName: '白面',
            fleeceName: '純白毛'
        },
        scottish_black: {
            id: 'scottish_black',
            name: '蘇格蘭黑面母羊',
            faceColor: '#27272a',
            faceBorder: '#09090b',
            fleeceColor: '#f8fafc',
            fleeceBorder: '#cbd5e1',
            earColor: '#18181b',
            legColor: '#27272a',
            isMale: false,
            genderName: '雌性 (XX)',
            faceName: '黑面',
            fleeceName: '純白毛'
        },
        scottish_black_ram: {
            id: 'scottish_black_ram',
            name: '蘇格蘭黑面公羊',
            faceColor: '#27272a',
            faceBorder: '#09090b',
            fleeceColor: '#f8fafc',
            fleeceBorder: '#cbd5e1',
            earColor: '#18181b',
            legColor: '#27272a',
            isMale: true,
            genderName: '雄性 (XY)',
            faceName: '黑面',
            fleeceName: '純白毛'
        },
        valais_spotted: {
            id: 'valais_spotted',
            name: '瑞士黑鼻斑點母羊',
            faceColor: '#1c1917',
            faceBorder: '#0c0a09',
            fleeceColor: '#e7e5e4',
            fleeceBorder: '#a8a29e',
            earColor: '#292524',
            legColor: '#1c1917',
            isMale: false,
            genderName: '雌性 (XX)',
            faceName: '黑鼻黑眼斑',
            fleeceName: '灰白蓬鬆毛'
        },
        merino_golden_ram: {
            id: 'merino_golden_ram',
            name: '金黃美利奴公羊',
            faceColor: '#78350f',
            faceBorder: '#451a03',
            fleeceColor: '#fef08a',
            fleeceBorder: '#facc15',
            earColor: '#92400e',
            legColor: '#78350f',
            isMale: true,
            genderName: '雄性 (XY)',
            faceName: '金褐面',
            fleeceName: '金黃羊毛'
        }
    };

    function getSheepInnerMarkup(traits, isBaby = false) {
        const { faceColor, faceBorder, fleeceColor, fleeceBorder, earColor, legColor, isMale } = traits;
        const scale = isBaby ? 0.72 : 1;
        const yOffset = isBaby ? 14 : 0;

        return `
        <g transform="scale(${scale}) translate(${isBaby ? 18 : 0}, ${yOffset})">
            <rect x="26" y="58" width="7" height="20" rx="3.5" fill="${legColor}" stroke="#71717a" stroke-width="1"/>
            <rect x="40" y="58" width="7" height="20" rx="3.5" fill="${legColor}" stroke="#71717a" stroke-width="1"/>
            <rect x="58" y="58" width="7" height="20" rx="3.5" fill="${legColor}" stroke="#71717a" stroke-width="1"/>
            <rect x="72" y="58" width="7" height="20" rx="3.5" fill="${legColor}" stroke="#71717a" stroke-width="1"/>

            <g filter="drop-shadow(0 2px 3px rgba(0,0,0,0.08))">
                <circle cx="34" cy="46" r="14" fill="${fleeceColor}" stroke="${fleeceBorder}" stroke-width="1.5"/>
                <circle cx="50" cy="44" r="16" fill="${fleeceColor}" stroke="${fleeceBorder}" stroke-width="1.5"/>
                <circle cx="68" cy="46" r="15" fill="${fleeceColor}" stroke="${fleeceBorder}" stroke-width="1.5"/>
                <circle cx="42" cy="34" r="14" fill="${fleeceColor}" stroke="${fleeceBorder}" stroke-width="1.5"/>
                <circle cx="60" cy="34" r="15" fill="${fleeceColor}" stroke="${fleeceBorder}" stroke-width="1.5"/>
                <circle cx="76" cy="40" r="11" fill="${fleeceColor}" stroke="${fleeceBorder}" stroke-width="1.5"/>
                <circle cx="24" cy="42" r="11" fill="${fleeceColor}" stroke="${fleeceBorder}" stroke-width="1.5"/>
                <ellipse cx="50" cy="44" rx="26" ry="16" fill="${fleeceColor}"/>
            </g>

            <ellipse cx="12" cy="27" rx="8" ry="4" transform="rotate(-25 12 27)" fill="${earColor}" stroke="${faceBorder}" stroke-width="1.2"/>
            <ellipse cx="38" cy="27" rx="8" ry="4" transform="rotate(25 38 27)" fill="${earColor}" stroke="${faceBorder}" stroke-width="1.2"/>

            <path d="M 18,22 C 14,35 18,48 25,48 C 32,48 36,35 32,22 C 30,16 20,16 18,22 Z" 
                  fill="${faceColor}" stroke="${faceBorder}" stroke-width="1.8"/>

            <circle cx="21" cy="18" r="4.5" fill="${fleeceColor}" stroke="${fleeceBorder}" stroke-width="1"/>
            <circle cx="28" cy="18" r="4.5" fill="${fleeceColor}" stroke="${fleeceBorder}" stroke-width="1"/>
            <circle cx="24.5" cy="15" r="4" fill="${fleeceColor}" stroke="${fleeceBorder}" stroke-width="1"/>

            <circle cx="20" cy="29" r="2.2" fill="${faceColor === '#27272a' || faceColor === '#1c1917' ? '#fef08a' : '#0f172a'}"/>
            <circle cx="29" cy="29" r="2.2" fill="${faceColor === '#27272a' || faceColor === '#1c1917' ? '#fef08a' : '#0f172a'}"/>
            <circle cx="20.8" cy="28.2" r="0.8" fill="#ffffff"/>
            <circle cx="29.8" cy="28.2" r="0.8" fill="#ffffff"/>

            <ellipse cx="25" cy="41" rx="2.2" ry="1.4" fill="${faceColor === '#27272a' || faceColor === '#1c1917' ? '#18181b' : '#f472b6'}"/>

            ${isMale ? `
                <path d="M 15,18 Q 4,12 8,26 Q 12,32 17,24" fill="none" stroke="#d97706" stroke-width="3.5" stroke-linecap="round"/>
                <path d="M 34,18 Q 45,12 41,26 Q 37,32 32,24" fill="none" stroke="#d97706" stroke-width="3.5" stroke-linecap="round"/>
            ` : ''}

            ${isBaby ? `
                <g transform="translate(68, 12)">
                    <path d="M 0,-8 L 2.5,-2.5 L 8,0 L 2.5,2.5 L 0,8 L -2.5,2.5 L -8,0 L -2.5,-2.5 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.8">
                        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite"/>
                    </path>
                </g>
            ` : ''}
        </g>
        `;
    }

    function renderCustomSheepSVG(traits, isBaby = false) {
        return `
        <svg viewBox="0 0 100 85" width="100%" height="100%">
            ${getSheepInnerMarkup(traits, isBaby)}
        </svg>
        `;
    }

    function renderSheepSVGForCanvas(traits, isBaby, cx, cy, width = 140, height = 119) {
        const x = cx - width / 2;
        const y = cy - height / 2;
        return `
        <svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 100 85">
            ${getSheepInnerMarkup(traits, isBaby)}
        </svg>
        `;
    }

    function initSheepAvatars() {
        document.getElementById('svg-sheep-a').innerHTML = renderCustomSheepSVG(DONOR_VARIANTS.finn_white);
        document.getElementById('svg-sheep-b').innerHTML = renderCustomSheepSVG(DONOR_VARIANTS.scottish_black);
        document.getElementById('svg-sheep-c').innerHTML = renderCustomSheepSVG(DONOR_VARIANTS.scottish_black);
        document.getElementById('svg-sheep-dolly').innerHTML = renderCustomSheepSVG(DONOR_VARIANTS.finn_white, true);
    }

    // =========================================================================
    // 6. 步驟導覽列與按鈕初始化
    // =========================================================================
    function initStepper() {
        stepNodesContainer.innerHTML = '';
        stepBtnContainer.innerHTML = '';

        STEPS.forEach((step, idx) => {
            const nodeBtn = document.createElement('button');
            nodeBtn.className = `step-node ${idx === 0 ? 'active' : ''}`;
            nodeBtn.setAttribute('data-step', idx);
            nodeBtn.title = step.title;
            nodeBtn.innerHTML = `
                <div class="node-circle">${idx === 0 ? '★' : idx}</div>
                <div class="node-label">${step.shortTitle}</div>
            `;
            nodeBtn.addEventListener('click', () => {
                goToStep(idx);
                playTone(400 + idx * 50, 'sine', 0.08, 0.1);
            });
            stepNodesContainer.appendChild(nodeBtn);

            if (idx > 0) {
                const pillBtn = document.createElement('button');
                pillBtn.className = 'step-btn-pill';
                pillBtn.setAttribute('data-step', idx);
                pillBtn.textContent = step.shortTitle;
                pillBtn.addEventListener('click', () => {
                    goToStep(idx);
                    playTone(400 + idx * 50, 'sine', 0.08, 0.1);
                });
                stepBtnContainer.appendChild(pillBtn);
            }
        });
    }

    // =========================================================================
    // 7. 同一連續顯微操作台 (Unified SCNT Stage) —— 精確幾何與統一核色版
    //
    //  座標規劃 (viewBox 880 x 380)：
    //   ● 卵細胞固定吸管：從左側伸入，管口頂住卵細胞透明帶左緣 (x=264, y=230)
    //   ● 卵細胞 (母羊 B)：中心 EGG=(340, 230)，透明帶 r=76，細胞質 r=68
    //   ● 1n 卵核：位於卵細胞右側 EGG_NUC=(378, 230)
    //   ● 體細胞 (母羊 A)：中上方 SOMA=(480, 105)，細胞 r=32，2n 核位於細胞中心
    //   ● 顯微微吸管：於右側 PIP_REST=(600, 175) 待命，群組原點 (0,0) = 吸管「尖端開口中心」
    //     （兩顆細胞皆位於吸管尖端左側，吸管永遠先對齊 Y 軸再水平前進，絕不穿越或跑到吸管後方）
    //
    //  核的顏色全程 100% 統一：
    //   ● 2n 體細胞核 (母羊 A，白面) ＝ 橘色 (grad-somatic-nucleus, stroke #ea580c)
    //   ● 1n 卵細胞核 (母羊 B，黑面) ＝ 灰色 (grad-egg-nucleus, stroke #334155)
    //  核半徑統一 NUC_R = 10，吸管開口半高 12 > 10，核平順滑入玻璃管腔內。
    // =========================================================================
    const EGG = { x: 340, y: 230 };
    const EGG_NUC = { x: 378, y: 230 };      // 1n 卵核原位
    const INJECT_POS = { x: 356, y: 230 };   // 2n 核注入後位置
    const SOMA = { x: 480, y: 105 };         // 體細胞與其 2n 核中心
    const PIP_REST = { x: 600, y: 175 };     // 微吸管待命時的尖端位置
    const NUC_R = 10;
    const CARGO_X = 26;                      // 核被吸入後，在吸管內的局部 X (尖端右方管腔內)

    let pipPos = { ...PIP_REST };
    let animToken = 0;
    let isAnimating = false;

    // 統一的細胞核圖形 (2n 橘 / 1n 灰)，以 transform 定位，方便平滑補間動畫
    function nucleusMarkup(type, x, y, id = '', r = NUC_R) {
        const is2n = type === '2n';
        const fontSize = r >= 10 ? 9 : 7.5;
        return `
            <g ${id ? `id="${id}"` : ''} transform="translate(${x}, ${y})">
                <circle r="${r}" fill="url(#${is2n ? 'grad-somatic-nucleus' : 'grad-egg-nucleus'})"
                        stroke="${is2n ? '#ea580c' : '#334155'}" stroke-width="2"/>
                <text y="${fontSize * 0.36}" text-anchor="middle" fill="#ffffff" font-size="${fontSize}" font-weight="800">${is2n ? '2n' : '1n'}</text>
            </g>
        `;
    }

    // 空核位 (虛線) — 表示核已被取走
    function emptyNucleusMarkup(x, y) {
        return `<circle cx="${x}" cy="${y}" r="${NUC_R}" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.7"/>`;
    }

    /**
     * 顯微微吸管：尖端開口中心位於群組原點 (0,0)，管身往右延伸。
     * 繪製順序：管腔底色 → 管內貨物 (核) → 上下玻璃管壁，核因此確實位於玻璃管內。
     */
    function pipetteMarkup(cargoType) {
        return `
            <g id="micro-pipette" transform="translate(${pipPos.x}, ${pipPos.y})" style="cursor:pointer;">
                <!-- 管腔 (液體) -->
                <path d="M0,-12 L38,-15 L460,-15 L460,15 L38,15 L0,12 Z" fill="rgba(186, 230, 253, 0.16)"/>
                <!-- 管內貨物 -->
                <g id="pipette-cargo">${cargoType ? nucleusMarkup(cargoType, CARGO_X, 0, 'cargo-nucleus') : ''}</g>
                <!-- 玻璃管壁 (上 / 下) -->
                <path d="M0,-12 L38,-15 L460,-15" fill="none" stroke="#e2e8f0" stroke-width="3" stroke-linejoin="round"/>
                <path d="M0,12 L38,15 L460,15" fill="none" stroke="#e2e8f0" stroke-width="3" stroke-linejoin="round"/>
                <!-- 玻璃反光 -->
                <line x1="44" y1="-10" x2="460" y2="-10" stroke="#ffffff" stroke-width="1" opacity="0.35"/>
                <!-- 尖端開口標記 -->
                <line x1="0" y1="-12" x2="0" y2="12" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="2,2" opacity="0.85"/>
                <text x="110" y="32" text-anchor="middle" fill="#94a3b8" font-size="11">顯微微吸管</text>
            </g>
        `;
    }

    function setPipettePos(x, y) {
        pipPos = { x, y };
        const el = document.getElementById('micro-pipette');
        if (el) el.setAttribute('transform', `translate(${x}, ${y})`);
    }

    function setNodePos(el, x, y) {
        if (el) el.setAttribute('transform', `translate(${x}, ${y})`);
    }

    // 緩動補間 (ease-in-out)，被中斷 (換步驟) 時自動停止
    function tween(duration, onFrame) {
        const token = animToken;
        return new Promise(resolve => {
            const start = performance.now();
            function frame(now) {
                if (token !== animToken) return resolve(false);
                const t = Math.min(1, (now - start) / duration);
                const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                onFrame(e);
                if (t < 1) requestAnimationFrame(frame);
                else resolve(true);
            }
            requestAnimationFrame(frame);
        });
    }

    function movePipette(tx, ty, duration = 600) {
        const sx = pipPos.x, sy = pipPos.y;
        return tween(duration, e => setPipettePos(sx + (tx - sx) * e, sy + (ty - sy) * e));
    }

    function moveNode(el, from, to, duration = 450) {
        return tween(duration, e => setNodePos(el, from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e));
    }

    /**
     * 依「步驟 + 完成狀態」推導顯微台上每個物件的狀態 (可任意跳步驟，畫面永遠一致)
     *  步驟 1：卵細胞去核   步驟 2：吸取體細胞核   步驟 3：注入體細胞核
     */
    function getStageState(step) {
        const done = !!stepCompletedState[step];
        return {
            eggHasNucleus: step < 1 || (step === 1 && !done),
            somaHasNucleus: step < 2 || (step === 2 && !done),
            pipetteCargo: ((step === 2 && done) || (step === 3 && !done)) ? '2n' : null,
            injected: step > 3 || (step === 3 && done)
        };
    }

    function renderUnifiedLabStage(step) {
        const s = getStageState(step);

        // 卵細胞固定吸管 (左側)，管口頂住透明帶左緣 (EGG.x - 76)
        const holdTip = EGG.x - 76;
        groupGuidelines.innerHTML = `
            <g opacity="1">
                <path d="M${holdTip - 210},${EGG.y - 22} L${holdTip},${EGG.y - 22} L${holdTip},${EGG.y + 22} L${holdTip - 210},${EGG.y + 22} Z"
                      fill="rgba(148, 163, 184, 0.22)" stroke="#94a3b8" stroke-width="2"/>
                <path d="M${holdTip - 210},${EGG.y - 6} L${holdTip},${EGG.y - 6} L${holdTip},${EGG.y + 6} L${holdTip - 210},${EGG.y + 6} Z"
                      fill="rgba(15, 23, 42, 0.65)"/>
                <text x="${holdTip - 105}" y="${EGG.y + 42}" text-anchor="middle" fill="#cbd5e1" font-size="11">卵細胞固定吸管</text>
            </g>
        `;

        // 體細胞 (母羊 A)
        groupSomatic.innerHTML = `
            <g id="soma-unit" style="cursor:pointer;">
                <text x="${SOMA.x}" y="${SOMA.y - 44}" text-anchor="middle" fill="#f0abfc" font-size="12" font-weight="700">母羊 A 乳腺體細胞</text>
                <circle cx="${SOMA.x}" cy="${SOMA.y}" r="32" fill="url(#grad-somatic-cell)" stroke="#c026d3" stroke-width="2.5" opacity="0.92"/>
                ${s.somaHasNucleus ? nucleusMarkup('2n', SOMA.x, SOMA.y, 'soma-nucleus') : emptyNucleusMarkup(SOMA.x, SOMA.y)}
            </g>
        `;

        // 卵細胞 (母羊 B)
        const eggLabel = s.injected ? '重組卵（去核卵質 + 母羊 A 的橘色 2n 核）'
            : (s.eggHasNucleus ? '母羊 B 卵細胞（含灰色 1n 卵核）' : '去核卵細胞（1n 核已抽除，只剩卵質）');
        groupEgg.innerHTML = `
            <g id="egg-unit" style="cursor:pointer;">
                <circle cx="${EGG.x}" cy="${EGG.y}" r="76" fill="none" stroke="#86efac" stroke-width="4" stroke-dasharray="10,4" opacity="0.75"/>
                <circle cx="${EGG.x}" cy="${EGG.y}" r="68" fill="url(#grad-egg-cell)" stroke="#16a34a" stroke-width="2.5" opacity="0.9"/>
                <circle cx="${EGG.x - 10}" cy="${EGG.y - 58}" r="7" fill="#cbd5e1" stroke="#64748b" stroke-width="1.5"/>
                <text x="${EGG.x - 10}" y="${EGG.y - 70}" text-anchor="middle" fill="#cbd5e1" font-size="10">極體</text>
                ${s.eggHasNucleus ? nucleusMarkup('1n', EGG_NUC.x, EGG_NUC.y, 'egg-nucleus') : emptyNucleusMarkup(EGG_NUC.x, EGG_NUC.y)}
                ${s.injected ? nucleusMarkup('2n', INJECT_POS.x, INJECT_POS.y, 'injected-nucleus') : ''}
                <text x="${EGG.x}" y="${EGG.y + 100}" text-anchor="middle" fill="#86efac" font-size="12" font-weight="700">${eggLabel}</text>
            </g>
        `;

        // 圖例 (左上角)：核顏色對照
        groupLabels.innerHTML = `
            <g transform="translate(24, 34)">
                <rect x="-10" y="-20" width="236" height="58" rx="8" fill="rgba(15, 23, 42, 0.82)" stroke="#334155"/>
                ${nucleusMarkup('2n', 6, -3)}
                <text x="24" y="1" fill="#fdba74" font-size="12" font-weight="700">2n 體細胞核（母羊 A，白面）</text>
                ${nucleusMarkup('1n', 6, 21)}
                <text x="24" y="25" fill="#cbd5e1" font-size="12" font-weight="700">1n 卵細胞核（母羊 B，黑面）</text>
            </g>
        `;

        // 顯微微吸管 (每次重繪回到待命位置)
        pipPos = { ...PIP_REST };
        groupPipettes.innerHTML = pipetteMarkup(s.pipetteCargo);

        ['micro-pipette', 'soma-unit', 'egg-unit'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', triggerCurrentStepAction);
        });
    }

    function renderCanvasScene(stepIndex) {
        groupGuidelines.innerHTML = '';
        groupSomatic.innerHTML = '';
        groupEgg.innerHTML = '';
        groupFusionCleavage.innerHTML = '';
        groupImplantBirth.innerHTML = '';
        groupPipettes.innerHTML = '';
        groupEffects.innerHTML = '';
        groupLabels.innerHTML = '';

        switch (stepIndex) {
            case 0:
                renderScene0();
                break;
            case 1:
            case 2:
            case 3:
                renderUnifiedLabStage(stepIndex);
                break;

            case 4:
                // 步驟 4：電脈衝刺激膜融合
                renderScene4Fusion();
                break;

            case 5:
                // 步驟 5：卵裂與囊胚
                renderScene5Cleavage();
                break;

            case 6:
                // 步驟 6：植入代理孕母子宮
                renderScene6Implant();
                break;

            case 7:
                // 步驟 7：桃莉羊誕生！
                renderScene7Birth();
                break;
        }
    }

    function renderScene0() {
        groupGuidelines.innerHTML = `
            <line x1="140" y1="205" x2="760" y2="205" stroke="#38bdf8" stroke-dasharray="6,6" stroke-width="2" opacity="0.45"/>
        `;
        groupLabels.innerHTML = `
            <text x="440" y="72" text-anchor="middle" fill="#f8fafc" font-size="20" font-weight="700">體細胞核轉殖 (SCNT) 連續顯微操作流程</text>
            <text x="440" y="102" text-anchor="middle" fill="#94a3b8" font-size="14">同一顯微視野完成「1. 抽除灰色 1n 卵核 ➔ 2. 吸取橘色 2n 體核 ➔ 3. 注入去核卵」</text>
            
            <g transform="translate(150, 205)">
                <circle cx="0" cy="0" r="46" fill="rgba(192, 38, 211, 0.15)" stroke="#c026d3" stroke-width="2"/>
                ${nucleusMarkup('2n', 0, -20)}
                <text x="0" y="8" text-anchor="middle" fill="#f0abfc" font-size="13" font-weight="700">芬恩母羊 A</text>
                <text x="0" y="25" text-anchor="middle" fill="#fdba74" font-size="11" font-weight="700">提供橘色 2n 體核</text>
            </g>

            <g transform="translate(350, 205)">
                <circle cx="0" cy="0" r="46" fill="rgba(5, 150, 105, 0.15)" stroke="#059669" stroke-width="2"/>
                ${nucleusMarkup('1n', 0, -20)}
                <text x="0" y="8" text-anchor="middle" fill="#86efac" font-size="13" font-weight="700">黑面母羊 B</text>
                <text x="0" y="25" text-anchor="middle" fill="#cbd5e1" font-size="11" font-weight="700">抽除 1n 核留卵質</text>
            </g>

            <g transform="translate(550, 205)">
                <circle cx="0" cy="0" r="46" fill="rgba(217, 119, 6, 0.15)" stroke="#d97706" stroke-width="2"/>
                <text x="0" y="-6" text-anchor="middle" fill="#fde68a" font-size="13" font-weight="700">代理孕母 C</text>
                <text x="0" y="14" text-anchor="middle" fill="#e2e8f0" font-size="12">提供子宮懷孕</text>
                <text x="0" y="30" text-anchor="middle" fill="#fbbf24" font-size="11">(黑面，0% 基因)</text>
            </g>

            <g transform="translate(740, 205)">
                <circle cx="0" cy="0" r="48" fill="rgba(2, 132, 199, 0.25)" stroke="#38bdf8" stroke-width="2.5"/>
                ${nucleusMarkup('2n', 0, -22)}
                <text x="0" y="6" text-anchor="middle" fill="#7dd3fc" font-size="14" font-weight="800">桃莉 Dolly</text>
                <text x="0" y="24" text-anchor="middle" fill="#f8fafc" font-size="11" font-weight="700">繼承 2n 核 (白面)</text>
            </g>
        `;
    }

    /**
     * 步驟 4：電脈衝刺激融合（延續母羊 B 卵細胞質與母羊 A 橘色 2n 核配色）
     */
    function renderScene4Fusion() {
        const isDone = stepCompletedState[4];
        groupFusionCleavage.innerHTML = `
            <g transform="translate(440, 190)" style="cursor:pointer;" id="interactive-cell-4">
                <circle cx="0" cy="0" r="82" fill="none" stroke="#86efac" stroke-width="4" stroke-dasharray="10,4" opacity="0.75"/>
                <circle cx="0" cy="0" r="72" fill="url(#${isDone ? 'grad-fused-cell' : 'grad-egg-cell'})" stroke="${isDone ? '#0891b2' : '#16a34a'}" stroke-width="3.5" filter="url(#glow-cyan)">
                    <animate attributeName="r" values="70;74;70" dur="0.9s" repeatCount="indefinite"/>
                </circle>
                <circle cx="0" cy="0" r="22" fill="url(#grad-somatic-nucleus)" stroke="#ea580c" stroke-width="3" filter="url(#glow-zap)">
                    <animate attributeName="r" values="21;24;21" dur="0.6s" repeatCount="indefinite"/>
                </circle>
                <text x="0" y="4" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="800">2n</text>
                <text x="0" y="112" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="700">
                    ${isDone ? '✔ 電擊活化完成（橘色 2n 體核與去核卵完全融合）' : '重組卵（含母羊 A 橘色 2n 核）待電脈衝刺激'}
                </text>
            </g>

            <g transform="translate(240, 100)">
                <rect x="0" y="0" width="22" height="180" rx="6" fill="url(#grad-electrode)" stroke="#0284c7" stroke-width="2"/>
                <text x="11" y="-10" text-anchor="middle" fill="#38bdf8" font-size="14" font-weight="800">[ + ]</text>
            </g>
            <g transform="translate(620, 100)">
                <rect x="0" y="0" width="22" height="180" rx="6" fill="url(#grad-electrode)" stroke="#0284c7" stroke-width="2"/>
                <text x="11" y="-10" text-anchor="middle" fill="#38bdf8" font-size="14" font-weight="800">[ - ]</text>
            </g>
        `;

        if (isDone) {
            groupEffects.innerHTML = `
                <g stroke="#facc15" stroke-width="3" fill="none" filter="url(#glow-zap)">
                    <path d="M 265,160 L 330,180 L 370,170 L 420,190">
                        <animate attributeName="opacity" values="1;0.2;1;0.5;1" dur="0.3s" repeatCount="indefinite"/>
                    </path>
                    <path d="M 615,160 L 550,180 L 510,170 L 460,190">
                        <animate attributeName="opacity" values="0.3;1;0.1;1;0.4" dur="0.25s" repeatCount="indefinite"/>
                    </path>
                </g>
            `;
        }

        const cellEl = document.getElementById('interactive-cell-4');
        if (cellEl) cellEl.addEventListener('click', triggerCurrentStepAction);
    }

    /**
     * 步驟 5：早期胚胎體外發育（所有分裂細胞內的 2n 核皆保持一致的橘色）
     */
    function renderScene5Cleavage() {
        const sub = stepCompletedState[5];
        groupFusionCleavage.innerHTML = `
            <ellipse cx="440" cy="270" rx="360" ry="70" fill="rgba(15, 23, 42, 0.7)" stroke="#334155" stroke-width="2"/>
            <ellipse cx="440" cy="265" rx="340" ry="60" fill="rgba(56, 189, 248, 0.08)"/>

            <!-- 階段 1：2-細胞期 -->
            <g transform="translate(180, 180)" opacity="${sub >= 0 ? 1 : 0.35}">
                <ellipse cx="0" cy="0" rx="46" ry="38" fill="url(#grad-fused-cell)" stroke="#0891b2" stroke-width="2"/>
                <line x1="0" y1="-38" x2="0" y2="38" stroke="#0e7490" stroke-width="2.5"/>
                ${nucleusMarkup('2n', -20, 0, '', 10)}
                ${nucleusMarkup('2n', 20, 0, '', 10)}
                <text x="0" y="56" text-anchor="middle" fill="#cbd5e1" font-size="12" font-weight="600">2-細胞期 (2n)</text>
            </g>

            <path d="M 240 180 L 290 180" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="3,3"/>

            <!-- 階段 2：桑葚胚 -->
            <g transform="translate(360, 180)" opacity="${sub >= 1 ? 1 : 0.35}">
                <circle cx="0" cy="0" r="46" fill="rgba(103, 232, 249, 0.15)" stroke="#0891b2" stroke-width="2"/>
                <circle cx="-16" cy="-16" r="15" fill="url(#grad-fused-cell)" stroke="#0e7490"/>
                <circle cx="16" cy="-16" r="15" fill="url(#grad-fused-cell)" stroke="#0e7490"/>
                <circle cx="-16" cy="16" r="15" fill="url(#grad-fused-cell)" stroke="#0e7490"/>
                <circle cx="16" cy="16" r="15" fill="url(#grad-fused-cell)" stroke="#0e7490"/>
                <circle cx="0" cy="0" r="13" fill="url(#grad-fused-cell)" stroke="#0e7490"/>
                ${nucleusMarkup('2n', -16, -16, '', 7)}
                ${nucleusMarkup('2n', 16, -16, '', 7)}
                ${nucleusMarkup('2n', -16, 16, '', 7)}
                ${nucleusMarkup('2n', 16, 16, '', 7)}
                ${nucleusMarkup('2n', 0, 0, '', 7)}
                <text x="0" y="60" text-anchor="middle" fill="#cbd5e1" font-size="12" font-weight="600">桑葚胚 (Morula)</text>
            </g>

            <path d="M 430 180 L 480 180" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="3,3"/>

            <!-- 階段 3：早期囊胚期 -->
            <g transform="translate(560, 180)" opacity="${sub >= 2 ? 1 : 0.35}">
                <circle cx="0" cy="0" r="54" fill="none" stroke="#38bdf8" stroke-width="3" filter="url(#glow-cyan)"/>
                <circle cx="0" cy="0" r="50" fill="rgba(6, 182, 212, 0.2)"/>
                <g transform="translate(-16, -12)">
                    ${nucleusMarkup('2n', 0, 0, '', 8.5)}
                    ${nucleusMarkup('2n', 14, 4, '', 8)}
                    ${nucleusMarkup('2n', 5, 14, '', 8)}
                    ${nucleusMarkup('2n', -8, 10, '', 8)}
                    <text x="6" y="30" text-anchor="middle" fill="#fde047" font-size="11" font-weight="700">內細胞團 (2n)</text>
                </g>
                <text x="0" y="70" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="700">早期囊胚 (第 6 天)</text>
            </g>
        `;
    }

    /**
     * 步驟 6：胚胎植入代理孕母子宮
     */
    function renderScene6Implant() {
        const isDone = stepCompletedState[6];
        groupImplantBirth.innerHTML = `
            <g transform="translate(360, 190)">
                <path d="M 0,-80 C 120,-80 180,-10 180,60 C 180,120 80,150 0,140 C -80,130 -140,80 -140,20 C -140,-50 -60,-80 0,-80 Z" 
                      fill="rgba(217, 119, 6, 0.12)" stroke="#d97706" stroke-width="2.5" stroke-dasharray="6,4"/>
                <text x="10" y="-30" text-anchor="middle" fill="#fde68a" font-size="14" font-weight="700">代理孕母（黑面羊 C）子宮腔</text>

                <g transform="translate(10, 40)">
                    <circle cx="0" cy="0" r="32" fill="url(#grad-fused-cell)" stroke="#38bdf8" stroke-width="2.5" filter="url(#glow-cyan)">
                        <animate attributeName="r" values="30;34;30" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    ${nucleusMarkup('2n', 0, 0, '', 12)}
                    <text x="0" y="46" text-anchor="middle" fill="#67e8f9" font-size="12" font-weight="600">
                        ${isDone ? '✔ 著床成功！發育中' : '準備著床'}
                    </text>
                </g>
                ${isDone ? `
                    <path d="M -70,30 Q -20,40 0,40" stroke="#f43f5e" stroke-width="2.5" fill="none" stroke-dasharray="4,4"/>
                    <text x="-90" y="34" text-anchor="middle" fill="#fca5a5" font-size="11">母體養分供應</text>
                ` : ''}
            </g>

            <g id="anim-catheter" transform="${isDone ? 'translate(60, 230)' : 'translate(140, 230)'}" 
               style="cursor:pointer; transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);">
                <path d="M 0,0 L 160,0" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
                <text x="60" y="-12" text-anchor="middle" fill="#cbd5e1" font-size="11">胚胎移植導管</text>
            </g>
        `;

        const cathEl = document.getElementById('anim-catheter');
        if (cathEl) cathEl.addEventListener('click', triggerCurrentStepAction);
    }

    /**
     * 步驟 7：桃莉羊誕生！
     */
    function renderScene7Birth() {
        groupImplantBirth.innerHTML = `
            <g>
                <circle cx="440" cy="165" r="130" fill="radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, transparent 70%)" />
                <ellipse cx="440" cy="235" rx="135" ry="26" fill="rgba(15, 23, 42, 0.75)" stroke="#38bdf8" stroke-width="2.5"/>
                <ellipse cx="440" cy="230" rx="120" ry="20" fill="rgba(34, 197, 94, 0.18)"/>

                ${renderSheepSVGForCanvas(DONOR_VARIANTS.finn_white, true, 440, 160, 150, 128)}
            </g>

            <g transform="translate(440, 55)">
                <text x="0" y="0" text-anchor="middle" fill="#fef08a" font-size="22" font-weight="900">🎉 複製羊 桃莉 (Dolly) 順利誕生！ 🎉</text>
                <text x="0" y="26" text-anchor="middle" fill="#7dd3fc" font-size="13" font-weight="600">外表為「白面」母羊！完全符合供核母羊 A，證實細胞核掌控主要性狀！</text>
            </g>

            <g transform="translate(180, 275)">
                <rect x="-95" y="-32" width="190" height="64" rx="10" fill="rgba(15, 23, 42, 0.88)" stroke="#c026d3" stroke-width="2"/>
                <text x="0" y="-10" text-anchor="middle" fill="#f0abfc" font-size="13" font-weight="700">芬恩母羊 A (供核母羊)</text>
                <text x="0" y="14" text-anchor="middle" fill="#4ade80" font-size="12" font-weight="800">核 DNA 100% 相同 (白面)</text>
            </g>

            <g transform="translate(700, 275)">
                <rect x="-95" y="-32" width="190" height="64" rx="10" fill="rgba(15, 23, 42, 0.88)" stroke="#d97706" stroke-width="1.8"/>
                <text x="0" y="-10" text-anchor="middle" fill="#fde68a" font-size="13" font-weight="700">代理母羊 C (生母)</text>
                <text x="0" y="14" text-anchor="middle" fill="#f87171" font-size="12" font-weight="700">DNA 0% (純懷胎養育)</text>
            </g>
        `;
    }

    // =========================================================================
    // 8-0. 顯微操作動畫 (步驟 1~3：去核 → 吸取體核 → 注入)
    //      所有位移先對齊 Y 軸，再水平推進至核右緣 (tipX = nuc.x + NUC_R)，確保尖端與核 100% 對準
    // =========================================================================
    function beginAnim(prompt, btnText) {
        isAnimating = true;
        btnCanvasAction.disabled = true;
        actionPromptText.textContent = prompt;
        btnCanvasAction.textContent = btnText;
    }

    function endAnim(step, prompt, btnText) {
        stepCompletedState[step] = true;
        isAnimating = false;
        renderCanvasScene(step);
        btnCanvasAction.disabled = false;
        actionPromptText.textContent = prompt;
        btnCanvasAction.textContent = btnText;
    }

    // 步驟 1：卵細胞去核 —— 吸管先水平對準 Y=230，再前進貼合灰色 1n 卵核右緣，吸入管腔後退出並丟棄
    async function runEnucleation() {
        beginAnim('✂️ 微吸管水平對準卵細胞，穿過透明帶接近灰色 1n 卵核...', '⏳ 去核中...');
        const tipX = EGG_NUC.x + NUC_R;

        if (!await movePipette(EGG.x + 110, EGG_NUC.y, 350)) return;
        if (!await movePipette(tipX, EGG_NUC.y, 500)) return;
        playPipetteSound();
        actionPromptText.textContent = '✂️ 尖端貼合 1n 卵核，施加負壓將灰色 1n 卵核吸進管腔...';

        const nuc = document.getElementById('egg-nucleus');
        if (!await moveNode(nuc, EGG_NUC, { x: tipX + CARGO_X, y: EGG_NUC.y }, 450)) return;

        // 核轉為吸管內的貨物，原位留下虛線空位
        if (nuc) nuc.outerHTML = emptyNucleusMarkup(EGG_NUC.x, EGG_NUC.y);
        const cargoBox = document.getElementById('pipette-cargo');
        if (cargoBox) cargoBox.innerHTML = nucleusMarkup('1n', CARGO_X, 0, 'cargo-nucleus');

        if (!await movePipette(PIP_REST.x, EGG_NUC.y, 550)) return;

        // 排出丟棄灰色 1n 卵核
        actionPromptText.textContent = '🗑️ 將吸出的灰色 1n 卵核排出丟棄...';
        const cargo = document.getElementById('cargo-nucleus');
        if (!await tween(480, e => {
            setNodePos(cargo, CARGO_X - 48 * e, 36 * e);
            if (cargo) cargo.setAttribute('opacity', String(1 - e));
        })) return;

        if (!await movePipette(PIP_REST.x, PIP_REST.y, 300)) return;

        endAnim(1, '✔ 去核完成！母羊 B 的灰色 1n 卵核已移除，只留下綠色去核卵細胞質。', '前往步驟 2：吸取體細胞核 ➔');
    }

    // 步驟 2：吸取體細胞核 —— 吸管先對齊上方體細胞 Y=105，再水平刺入並吸取橘色 2n 核
    async function runHarvestSomaticNucleus() {
        beginAnim('🧪 微吸管移向母羊 A 乳腺體細胞，水平對準橘色 2n 體細胞核...', '⏳ 吸取中...');
        const tipX = SOMA.x + NUC_R;

        if (!await movePipette(SOMA.x + 80, SOMA.y, 400)) return;
        if (!await movePipette(tipX, SOMA.y, 450)) return;
        playPipetteSound();
        actionPromptText.textContent = '🧪 吸管尖端貼合橘色 2n 細胞核，吸入玻璃管腔內...';

        const nuc = document.getElementById('soma-nucleus');
        if (!await moveNode(nuc, SOMA, { x: tipX + CARGO_X, y: SOMA.y }, 450)) return;

        if (nuc) nuc.outerHTML = emptyNucleusMarkup(SOMA.x, SOMA.y);
        const cargoBox = document.getElementById('pipette-cargo');
        if (cargoBox) cargoBox.innerHTML = nucleusMarkup('2n', CARGO_X, 0, 'cargo-nucleus');

        if (!await movePipette(SOMA.x + 80, SOMA.y, 400)) return;
        if (!await movePipette(PIP_REST.x, PIP_REST.y, 500)) return;

        endAnim(2, '✔ 吸取成功！母羊 A 的橘色 2n 體細胞核已在吸管管腔中，準備注入去核卵。', '前往步驟 3：注入體細胞核 ➔');
    }

    // 步驟 3：注入 —— 吸管帶著橘色 2n 核水平對準去核卵 Y=230，刺入卵中將核推出尖端開口
    async function runInjectNucleus() {
        beginAnim('💉 微吸管攜帶橘色 2n 體細胞核，水平刺入去核卵細胞...', '⏳ 注入中...');
        const tipX = INJECT_POS.x + NUC_R;

        if (!await movePipette(EGG.x + 110, INJECT_POS.y, 380)) return;
        if (!await movePipette(tipX, INJECT_POS.y, 500)) return;
        playPipetteSound();
        actionPromptText.textContent = '💉 推出橘色 2n 體細胞核，精準送入去核卵細胞質中央...';

        const cargo = document.getElementById('cargo-nucleus');
        const localTarget = INJECT_POS.x - tipX;   // 尖端開口左方 (-NUC_R)
        if (!await moveNode(cargo, { x: CARGO_X, y: 0 }, { x: localTarget, y: 0 }, 480)) return;

        // 核留在卵中，吸管清空退出
        const cargoBox = document.getElementById('pipette-cargo');
        if (cargoBox) cargoBox.innerHTML = '';
        groupEgg.insertAdjacentHTML('beforeend', nucleusMarkup('2n', INJECT_POS.x, INJECT_POS.y, 'injected-nucleus'));

        if (!await movePipette(PIP_REST.x, INJECT_POS.y, 500)) return;
        if (!await movePipette(PIP_REST.x, PIP_REST.y, 300)) return;

        endAnim(3, '✔ 核轉殖完成！母羊 A 的橘色 2n 體核已進入母羊 B 的去核卵中。', '前往步驟 4：電擊融合 ➔');
    }

    // =========================================================================
    // 8. 手動顯微互動操作主邏輯 (Hands-on Action Handler)
    // =========================================================================
    function triggerCurrentStepAction() {
        if (isAnimating) return;
        switch (currentStep) {
            case 0:
                goToStep(1);
                break;

            case 1:
                if (stepCompletedState[1]) { goToStep(2); return; }
                runEnucleation();
                break;

            case 2:
                if (stepCompletedState[2]) { goToStep(3); return; }
                runHarvestSomaticNucleus();
                break;

            case 3:
                if (stepCompletedState[3]) { goToStep(4); return; }
                runInjectNucleus();
                break;
            case 4:
                // 電擊刺激融合
                if (stepCompletedState[4]) {
                    goToStep(5);
                    return;
                }

                playElectricZap();
                btnCanvasAction.classList.add('pressing');
                actionPromptText.textContent = "⚡ 高壓微電擊脈衝釋放！細胞膜正在融合成一體...";
                btnCanvasAction.textContent = "⚡ 電弧融合中...";
                btnCanvasAction.disabled = true;

                setTimeout(() => {
                    btnCanvasAction.classList.remove('pressing');
                    stepCompletedState[4] = true;
                    renderCanvasScene(4);
                    btnCanvasAction.disabled = false;
                    actionPromptText.textContent = "✔ 電擊活化成功！細胞膜已完全融合，重組胚胎發育啟動！";
                    btnCanvasAction.textContent = "前往步驟 5：胚胎卵裂發育 ➔";
                }, 800);
                break;

            case 5:
                // 胚胎分裂發育
                if (stepCompletedState[5] >= 2) {
                    goToStep(6);
                    return;
                }

                stepCompletedState[5]++;
                playDivideSound();
                renderCanvasScene(5);

                if (stepCompletedState[5] === 1) {
                    actionPromptText.textContent = "🧫 細胞持續有絲分裂中！已分裂為桑葚胚 (Morula)，請再點一次！";
                    btnCanvasAction.textContent = "🧫 繼續分裂 (桑葚胚 ➔ 囊胚)";
                } else if (stepCompletedState[5] >= 2) {
                    actionPromptText.textContent = "✔ 早期囊胚培育成熟！具備內細胞團 (ICM)，可進行子宮胚胎移植！";
                    btnCanvasAction.textContent = "前往步驟 6：胚胎植入 ➔";
                }
                break;

            case 6:
                // 植入代理孕母子宮
                if (stepCompletedState[6]) {
                    goToStep(7);
                    return;
                }

                playTone(360, 'sine', 0.25, 0.15);
                actionPromptText.textContent = "🩺 移植導管推進中，正在將囊胚送入代理孕母子宮腔...";
                btnCanvasAction.textContent = "⏳ 移植著床中...";
                btnCanvasAction.disabled = true;

                const cath = document.getElementById('anim-catheter');
                if (cath) cath.style.transform = 'translate(60px, 230px)';

                setTimeout(() => {
                    stepCompletedState[6] = true;
                    renderCanvasScene(6);
                    btnCanvasAction.disabled = false;
                    actionPromptText.textContent = "✔ 著床成功！進入約 148 天的妊娠期，黑面母羊 C 負責懷胎育養！";
                    btnCanvasAction.textContent = "前往步驟 7：迎接桃莉誕生 ➔";
                }, 800);
                break;

            case 7:
                triggerConfetti();
                playCelebrationFanfare();
                actionPromptText.textContent = "🎉 桃莉羊順利誕生！外貌為白面母羊，證實遺傳性狀由【細胞核】主宰！";
                btnCanvasAction.textContent = "🔄 重新體驗一次";
                btnCanvasAction.onclick = () => {
                    Object.keys(stepCompletedState).forEach(k => stepCompletedState[k] = (k === '5' ? 0 : false));
                    goToStep(0);
                };
                break;
        }
    }

    btnCanvasAction.addEventListener('click', triggerCurrentStepAction);

    // =========================================================================
    // 9. 步驟切換主控制器 (Step Controller)
    // =========================================================================
    function goToStep(index) {
        if (index < 0 || index >= STEPS.length) return;
        animToken++;
        isAnimating = false;
        currentStep = index;
        const stepData = STEPS[currentStep];

        // 1. 進度條更新
        const progressPct = (currentStep / (STEPS.length - 1)) * 100;
        stepperProgress.style.width = `${progressPct}%`;

        // 2. 節點狀態更新
        const nodes = stepNodesContainer.querySelectorAll('.step-node');
        nodes.forEach((node, idx) => {
            node.classList.remove('active', 'completed');
            if (idx === currentStep) {
                node.classList.add('active');
            } else if (idx < currentStep) {
                node.classList.add('completed');
            }
        });

        // 3. 步驟快選膠囊更新
        const pillBtns = stepBtnContainer.querySelectorAll('.step-btn-pill');
        pillBtns.forEach(btn => {
            const s = parseInt(btn.getAttribute('data-step'), 10);
            if (s === currentStep) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 4. 文字與解說更新
        currentStepBadge.textContent = currentStep === 0 ? "準備開始" : `步驟 ${currentStep} / ${STEPS.length - 1}`;
        narrationTitle.textContent = stepData.title;
        narrationDesc.textContent = stepData.narration;
        badgePloidy.textContent = `染色體狀態：${stepData.ploidy}`;
        badgeTech.textContent = `核心概念：${stepData.tech}`;

        // 5. 更新獨立操作導引列按鈕與提示
        btnCanvasAction.disabled = false;
        if (stepCompletedState[currentStep] && currentStep !== 0 && currentStep !== 7) {
            btnCanvasAction.textContent = `前往下一步 ➔`;
            actionPromptText.textContent = `✔ 當前步驟已就緒，點擊前往下一步！`;
        } else {
            actionPromptText.textContent = stepData.tip;
            btnCanvasAction.textContent = stepData.actionText;
        }
        btnCanvasAction.onclick = triggerCurrentStepAction;

        // 6. 更新母羊卡片高亮
        updateSheepHighlight(stepData.sheepHighlight);

        // 7. 渲染畫布場景
        renderCanvasScene(currentStep);

        // 8. 上一步 / 下一步按鈕狀態
        btnPrev.disabled = (currentStep === 0);
        btnNext.disabled = (currentStep === STEPS.length - 1);

        // 9. 音效與慶祝
        playStepSound(currentStep);
    }

    function playStepSound(step) {
        switch (step) {
            case 1:
            case 2:
            case 3:
                playPipetteSound();
                break;
            case 4:
                playElectricZap();
                break;
            case 5:
                playDivideSound();
                break;
            case 6:
                playTone(330, 'sine', 0.25, 0.15);
                break;
            case 7:
                triggerConfetti();
                playCelebrationFanfare();
                dollyStatusBadge.textContent = "誕生成功！";
                break;
            default:
                playTone(440, 'sine', 0.08, 0.1);
        }
    }

    function updateSheepHighlight(highlight) {
        [cardSheepA, cardSheepB, cardSheepC, cardDolly].forEach(c => c.classList.remove('highlight'));
        if (highlight === 'a') cardSheepA.classList.add('highlight');
        else if (highlight === 'b') cardSheepB.classList.add('highlight');
        else if (highlight === 'c') cardSheepC.classList.add('highlight');
        else if (highlight === 'dolly') cardDolly.classList.add('highlight');
        else if (highlight === 'all') {
            cardSheepA.classList.add('highlight');
            cardSheepB.classList.add('highlight');
            cardSheepC.classList.add('highlight');
        }
    }

    function triggerConfetti() {
        confettiContainer.innerHTML = '';
        const colors = ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b'];
        for (let i = 0; i < 48; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = `${Math.random() * 0.8}s`;
            piece.style.transform = `rotate(${Math.random() * 360}deg)`;
            confettiContainer.appendChild(piece);
        }
        setTimeout(() => confettiContainer.innerHTML = '', 4500);
    }

    // =========================================================================
    // 10. 自由基因混搭沙盒系統 (What-If Cloning Sandbox)
    // =========================================================================
    function initSandbox() {
        const donorAKeys = ['finn_white', 'scottish_black', 'scottish_black_ram', 'valais_spotted', 'merino_golden_ram'];
        optionsDonorA.innerHTML = '';
        donorAKeys.forEach(k => {
            const d = DONOR_VARIANTS[k];
            const optEl = document.createElement('div');
            optEl.className = `donor-card-option ${k === selectedDonorA ? 'selected' : ''}`;
            optEl.setAttribute('data-key', k);
            optEl.innerHTML = `
                <div class="donor-opt-avatar">${renderCustomSheepSVG(d)}</div>
                <div class="donor-opt-name">${d.name}</div>
                <div class="donor-opt-trait">${d.genderName} ‧ ${d.faceName}</div>
            `;
            optEl.addEventListener('click', () => {
                selectedDonorA = k;
                optionsDonorA.querySelectorAll('.donor-card-option').forEach(el => el.classList.remove('selected'));
                optEl.classList.add('selected');
                playTone(450, 'sine', 0.08, 0.1);
            });
            optionsDonorA.appendChild(optEl);
        });

        const donorBKeys = ['scottish_black', 'finn_white'];
        optionsDonorB.innerHTML = '';
        donorBKeys.forEach(k => {
            const d = DONOR_VARIANTS[k];
            const optEl = document.createElement('div');
            optEl.className = `donor-card-option ${k === selectedDonorB ? 'selected' : ''}`;
            optEl.setAttribute('data-key', k);
            optEl.innerHTML = `
                <div class="donor-opt-avatar">${renderCustomSheepSVG(d)}</div>
                <div class="donor-opt-name">${d.name}</div>
                <div class="donor-opt-trait">去核卵質 (含胞器)</div>
            `;
            optEl.addEventListener('click', () => {
                selectedDonorB = k;
                optionsDonorB.querySelectorAll('.donor-card-option').forEach(el => el.classList.remove('selected'));
                optEl.classList.add('selected');
                playTone(480, 'sine', 0.08, 0.1);
            });
            optionsDonorB.appendChild(optEl);
        });

        const donorCKeys = ['scottish_black', 'finn_white', 'valais_spotted'];
        optionsDonorC.innerHTML = '';
        donorCKeys.forEach(k => {
            const d = DONOR_VARIANTS[k];
            const optEl = document.createElement('div');
            optEl.className = `donor-card-option ${k === selectedDonorC ? 'selected' : ''}`;
            optEl.setAttribute('data-key', k);
            optEl.innerHTML = `
                <div class="donor-opt-avatar">${renderCustomSheepSVG(d)}</div>
                <div class="donor-opt-name">${d.name}</div>
                <div class="donor-opt-trait">子宮妊娠懷胎</div>
            `;
            optEl.addEventListener('click', () => {
                selectedDonorC = k;
                optionsDonorC.querySelectorAll('.donor-card-option').forEach(el => el.classList.remove('selected'));
                optEl.classList.add('selected');
                playTone(510, 'sine', 0.08, 0.1);
            });
            optionsDonorC.appendChild(optEl);
        });

        btnRunSandbox.addEventListener('click', runSandboxClone);

        document.querySelectorAll('.btn-quest-apply').forEach(btn => {
            btn.addEventListener('click', () => {
                const qNum = parseInt(btn.getAttribute('data-apply'), 10);
                applyQuestConfig(qNum);
            });
        });
    }

    function runSandboxClone() {
        playElectricZap();
        btnRunSandbox.disabled = true;
        btnRunSandbox.innerHTML = `<span>⚡ 電擊融合重組中...</span>`;
        sandboxAvatarArea.innerHTML = `<div style="font-size:32px; animation:spin 1s infinite linear;">⚡</div>`;

        setTimeout(() => {
            const donorA = DONOR_VARIANTS[selectedDonorA];
            const donorB = DONOR_VARIANTS[selectedDonorB];
            const donorC = DONOR_VARIANTS[selectedDonorC];

            sandboxAvatarArea.innerHTML = renderCustomSheepSVG(donorA, true);

            sandboxResultSpecs.innerHTML = `
                <h3 style="color:#0284c7; font-size:18px;">🎉 自訂複製小羊順利誕生！</h3>
                <div class="result-explanation-card">
                    <p><strong>面孔與毛色：</strong><span style="color:#c026d3; font-weight:700;">${donorA.faceName}、${donorA.fleeceName}</span>（100% 遺傳自<strong>供核者：${donorA.name}</strong>）</p>
                    <p><strong>性別特徵：</strong><span style="color:#0284c7; font-weight:700;">${donorA.genderName} ${donorA.isMale ? '(具有雄性大捲角)' : ''}</span>（完全由供核者細胞核染色體決定！）</p>
                    <p><strong>代理孕母影響：</strong>0%（生母【${donorC.name}】未傳遞任何 DNA，外觀毫不受影響）</p>
                </div>
            `;

            triggerConfetti();
            playCelebrationFanfare();

            btnRunSandbox.disabled = false;
            btnRunSandbox.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span>啟動複製實驗！ (開始培育)</span>`;

            checkQuestsProgress();
        }, 800);
    }

    function applyQuestConfig(questNum) {
        if (questNum === 1) {
            selectedDonorA = 'finn_white';
            selectedDonorB = 'scottish_black';
            selectedDonorC = 'scottish_black';
        } else if (questNum === 2) {
            selectedDonorA = 'merino_golden_ram';
            selectedDonorB = 'scottish_black';
            selectedDonorC = 'finn_white';
        } else if (questNum === 3) {
            selectedDonorA = 'valais_spotted';
            selectedDonorB = 'finn_white';
            selectedDonorC = 'finn_white';
        }

        refreshOptionSelection(optionsDonorA, selectedDonorA);
        refreshOptionSelection(optionsDonorB, selectedDonorB);
        refreshOptionSelection(optionsDonorC, selectedDonorC);

        runSandboxClone();
    }

    function refreshOptionSelection(container, selectedKey) {
        container.querySelectorAll('.donor-card-option').forEach(card => {
            if (card.getAttribute('data-key') === selectedKey) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    function checkQuestsProgress() {
        if (selectedDonorA === 'finn_white' && selectedDonorC === 'scottish_black') {
            completeQuest(1);
        }
        if (selectedDonorA === 'merino_golden_ram') {
            completeQuest(2);
        }
        if (selectedDonorA === 'valais_spotted' && selectedDonorC === 'finn_white') {
            completeQuest(3);
        }

        questCountBadge.textContent = `已完成 ${completedQuests.size} / 3`;
    }

    function completeQuest(id) {
        if (completedQuests.has(id)) return;
        completedQuests.add(id);
        const questEl = document.getElementById(`quest-${id}`);
        if (questEl) {
            questEl.classList.add('completed');
            questEl.querySelector('.quest-status-icon').textContent = '✅';
        }
    }

    // =========================================================================
    // 11. 模式切換 (Tabs)
    // =========================================================================
    tabLabBtn.addEventListener('click', () => {
        tabLabBtn.classList.add('active');
        tabSandboxBtn.classList.remove('active');
        viewLab.classList.add('active');
        viewSandbox.classList.remove('active');
        playTone(500, 'sine', 0.08, 0.1);
    });

    tabSandboxBtn.addEventListener('click', () => {
        tabSandboxBtn.classList.add('active');
        tabLabBtn.classList.remove('active');
        viewSandbox.classList.add('active');
        viewLab.classList.remove('active');
        playTone(600, 'sine', 0.08, 0.1);
    });

    // =========================================================================
    // 12. 播放與暫停控制器 (Auto Play)
    // =========================================================================
    function toggleAutoPlay() {
        if (isPlaying) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    }

    function startAutoPlay() {
        isPlaying = true;
        btnPlayPause.classList.add('btn-playing');
        btnPlayPause.querySelector('.play-icon').classList.add('hidden');
        btnPlayPause.querySelector('.pause-icon').classList.remove('hidden');
        playPauseText.textContent = "暫停演示";

        if (currentStep === STEPS.length - 1) {
            Object.keys(stepCompletedState).forEach(k => stepCompletedState[k] = (k === '5' ? 0 : false));
            goToStep(0);
        }

        autoPlayTimer = setInterval(() => {
            if (isAnimating) return;
            if (currentStep < STEPS.length - 1) {
                triggerCurrentStepAction();
            } else {
                stopAutoPlay();
            }
        }, 1600);
    }

    function stopAutoPlay() {
        isPlaying = false;
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
        }
        btnPlayPause.classList.remove('btn-playing');
        btnPlayPause.querySelector('.play-icon').classList.remove('hidden');
        btnPlayPause.querySelector('.pause-icon').classList.add('hidden');
        playPauseText.textContent = "自動演示";
    }

    // =========================================================================
    // 13. 母羊卡片點擊抽屜 (Sheep Role Detail Drawer)
    // =========================================================================
    const SHEEP_DETAILS = {
        a: {
            title: "母羊 A：芬恩・多賽特白面母羊 (Finn Dorset)",
            content: `
                <p><strong>品種外觀：</strong>白面 (White face)</p>
                <p><strong>實驗角色：</strong>體細胞（乳腺細胞）供體</p>
                <p><strong>遺傳貢獻：</strong><span style="color:#c026d3;font-weight:700;">提供 2n 細胞核（含有約 99.9% 以上的核 DNA）</span></p>
                <p style="margin-top:8px;"><strong>生物學意義：</strong>決定了桃莉羊的外貌為白面、性別為母羊（XX染色體），並擁有與母羊 A 完全一致的主要生理與生化特質。</p>
            `
        },
        b: {
            title: "母羊 B：蘇格蘭黑面母羊 (Scottish Blackface)",
            content: `
                <p><strong>品種外觀：</strong>黑面 (Black face)</p>
                <p><strong>實驗角色：</strong>未受精卵細胞供體</p>
                <p><strong>遺傳貢獻：</strong><span style="color:#059669;font-weight:700;">去核卵細胞質（含細胞質基質與微量粒線體 mtDNA）</span></p>
                <p style="margin-top:8px;"><strong>生物學意義：</strong>其細胞核已被顯微手術吸除，<strong>不決定</strong>桃莉的外表或毛色，但提供發育所需的關鍵胞器與去分化全能性因子。</p>
            `
        },
        c: {
            title: "母羊 C：蘇格蘭黑面母羊 (Scottish Blackface)",
            content: `
                <p><strong>品種外觀：</strong>黑面 (Black face)</p>
                <p><strong>實驗角色：</strong>代理孕母 (Surrogate Mother)</p>
                <p><strong>遺傳貢獻：</strong><span style="color:#d97706;font-weight:700;">0% 遺傳 DNA（僅提供子宮孕育環境）</span></p>
                <p style="margin-top:8px;"><strong>生物學意義：</strong>胚胎在母羊 C 子宮著床 148 天產下。母羊 C 僅供應養分與氧氣，桃莉與母羊 C <strong>完全無遺傳關係</strong>！</p>
            `
        },
        dolly: {
            title: "複製羊：桃莉 (Dolly, 1996 - 2003)",
            content: `
                <p><strong>品種外觀：</strong><span style="color:#0284c7;font-weight:700;">白面 (White face) 母羊</span></p>
                <p><strong>生殖方式：</strong><span style="color:#e11d48;font-weight:700;">無性生殖 (SCNT 體細胞核轉殖)</span></p>
                <p style="margin-top:8px;"><strong>科學結論：</strong>未經過受精作用，<strong>桃莉沒有父親</strong>。證明已分化成熟的體細胞核依然具備全能發育潛能！</p>
            `
        }
    };

    function showSheepDrawer(sheepKey) {
        const info = SHEEP_DETAILS[sheepKey];
        if (!info) return;
        drawerSheepTitle.textContent = info.title;
        drawerSheepBody.innerHTML = info.content;
        sheepDrawer.classList.remove('hidden');
        playTone(500, 'sine', 0.08, 0.1);
    }

    // =========================================================================
    // 14. 隨堂測驗系統 (Interactive Quiz Modal)
    // =========================================================================
    const QUIZ_QUESTIONS = [
        {
            q: "1. 桃莉羊（Dolly）誕生後，牠的面孔毛色是什麼特徵？為什麼？",
            options: [
                "白面，因為決定外貌性狀的細胞核來自芬恩白面母羊 A",
                "黑面，因為代理孕母 C 是蘇格蘭黑面羊",
                "黑面，因為提供卵細胞質的母羊 B 是黑面羊",
                "黑白相間，因為遺傳了三隻母羊的平均外觀"
            ],
            answer: 0,
            explain: "正解！生物的主要遺傳性狀由細胞核內的染色體（DNA）所決定。桃莉羊的細胞核來自芬恩白面母羊 A，因此桃莉是標準的白面羊。"
        },
        {
            q: "2. 桃莉羊的性別是公羊還是母羊？",
            options: [
                "一定是雌性母羊，因為提供體細胞核的母羊 A 染色體為 XX",
                "一定是雄性公羊，因為需要雄性激素才能刺激生殖發育",
                "雌雄同體，兼具雙方性徵",
                "隨機決定，公母機率各為 50%"
            ],
            answer: 0,
            explain: "正解！複製過程沒有精子參與（無 Y 染色體），體細胞核來自母羊 A，性染色體為 XX，因此桃莉羊 100% 為雌性母羊。"
        },
        {
            q: "3. 桃莉羊在生物學上屬於下列哪一種生殖方式？",
            options: [
                "無性生殖，沒有經過精細胞與卵細胞受精結合",
                "有性生殖，因為使用了代理孕母懷孕生產",
                "有性生殖，因為使用了母羊 B 的卵細胞",
                "孤雌生殖，由未受精卵自行發育而成"
            ],
            answer: 0,
            explain: "正解！複製動物技術（SCNT）沒有經過精卵結合之受精作用，本質上屬於「無性生殖」，桃莉在遺傳上沒有父親。"
        },
        {
            q: "4. 代理孕母（黑面母羊 C）對桃莉羊的遺傳貢獻為何？",
            options: [
                "完全沒有貢獻任何核 DNA 或遺傳基因，僅提供子宮孕育環境與營養",
                "貢獻了一半的染色體 (1n)",
                "貢獻了決定黑面性狀的顯性基因",
                "貢獻了母系粒線體 DNA"
            ],
            answer: 0,
            explain: "正解！代理孕母母羊 C 僅負責著床妊娠與胎盤物質交換，並不會改變胎兒的基因，雙方無遺傳親緣關係。"
        },
        {
            q: "5. 若檢驗桃莉羊體內極微量的「粒線體 DNA (mtDNA)」，其來源是哪一隻羊？",
            options: [
                "蘇格蘭黑面母羊 B（卵細胞供體）",
                "芬恩白面母羊 A（體細胞核供體）",
                "代理孕母黑面母羊 C",
                "三隻羊平均提供"
            ],
            answer: 0,
            explain: "正解！真核生物的粒線體存在於「細胞質」中，桃莉的細胞質來自母羊 B 的去核卵細胞，因此其微量的粒線體 DNA 來自母羊 B！"
        }
    ];

    let currentQuizIndex = 0;
    let quizScore = 0;
    let hasAnsweredCurrent = false;

    function openQuiz() {
        currentQuizIndex = 0;
        quizScore = 0;
        hasAnsweredCurrent = false;
        renderQuizQuestion();
        quizModal.classList.remove('hidden');
        playTone(600, 'sine', 0.1, 0.1);
    }

    function closeQuiz() {
        quizModal.classList.add('hidden');
    }

    function renderQuizQuestion() {
        hasAnsweredCurrent = false;
        btnNextQuestion.textContent = (currentQuizIndex === QUIZ_QUESTIONS.length - 1) ? "查看成績結果" : "下一題";
        quizStatusInfo.textContent = `第 ${currentQuizIndex + 1} / ${QUIZ_QUESTIONS.length} 題`;

        const qData = QUIZ_QUESTIONS[currentQuizIndex];
        let optionsHTML = '';
        qData.options.forEach((opt, idx) => {
            optionsHTML += `
                <button class="quiz-option-btn" data-index="${idx}">
                    <span class="opt-letter">${String.fromCharCode(65 + idx)}.</span>
                    <span>${opt}</span>
                </button>
            `;
        });

        quizBody.innerHTML = `
            <div class="quiz-question-box">
                <div class="quiz-q-title">${qData.q}</div>
                <div class="quiz-options">${optionsHTML}</div>
                <div class="quiz-explanation-box hidden" id="quiz-explain-box"></div>
            </div>
        `;

        const optionBtns = quizBody.querySelectorAll('.quiz-option-btn');
        optionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (hasAnsweredCurrent) return;
                const chosenIdx = parseInt(btn.getAttribute('data-index'), 10);
                checkQuizAnswer(chosenIdx, optionBtns);
            });
        });
    }

    function checkQuizAnswer(chosenIdx, optionBtns) {
        hasAnsweredCurrent = true;
        const qData = QUIZ_QUESTIONS[currentQuizIndex];
        const explainBox = document.getElementById('quiz-explain-box');

        optionBtns.forEach((btn, idx) => {
            btn.disabled = true;
            if (idx === qData.answer) {
                btn.classList.add('correct');
            } else if (idx === chosenIdx) {
                btn.classList.add('wrong');
            }
        });

        if (chosenIdx === qData.answer) {
            quizScore++;
            playTone(800, 'sine', 0.15, 0.2);
            explainBox.innerHTML = `<strong>🎉 答對了！</strong><br>${qData.explain}`;
        } else {
            playTone(200, 'sawtooth', 0.2, 0.2);
            explainBox.innerHTML = `<strong>❌ 答錯囉！</strong><br>${qData.explain}`;
        }
        explainBox.classList.remove('hidden');
    }

    function nextQuizQuestion() {
        if (!hasAnsweredCurrent) {
            alert("請先選擇一個答案！");
            return;
        }

        if (currentQuizIndex < QUIZ_QUESTIONS.length - 1) {
            currentQuizIndex++;
            renderQuizQuestion();
        } else {
            showQuizSummary();
        }
    }

    function showQuizSummary() {
        const isPerfect = (quizScore === QUIZ_QUESTIONS.length);
        quizStatusInfo.textContent = "測驗完成！";
        quizBody.innerHTML = `
            <div style="text-align:center; padding: 20px 0;">
                <div style="font-size: 54px; margin-bottom: 12px;">${isPerfect ? '🏆' : '🎯'}</div>
                <h3 style="font-size:22px; font-weight:800; color:#0f172a; margin-bottom: 8px;">測驗得分：${quizScore} / ${QUIZ_QUESTIONS.length}</h3>
                <p style="font-size:15px; color:#64748b; line-height:1.6; max-width:400px; margin:0 auto 20px;">
                    ${isPerfect 
                        ? '太強了！你已經完全掌握了桃莉羊複製的遺傳學核心原理！' 
                        : '表現不錯！多在沙盒實驗室中動手嘗試不同組合，加深印象喔！'}
                </p>
                <button class="btn-primary" id="btn-restart-quiz" style="padding:10px 24px; font-size:15px; border-radius:9999px;">重新測驗</button>
            </div>
        `;

        if (isPerfect) {
            triggerConfetti();
            playCelebrationFanfare();
        }

        btnNextQuestion.classList.add('hidden');
        document.getElementById('btn-restart-quiz').addEventListener('click', () => {
            btnNextQuestion.classList.remove('hidden');
            openQuiz();
        });
    }

    // =========================================================================
    // 15. 事件監聽 (Listeners)
    // =========================================================================
    btnNext.addEventListener('click', () => {
        stopAutoPlay();
        if (currentStep < STEPS.length - 1) goToStep(currentStep + 1);
    });

    btnPrev.addEventListener('click', () => {
        stopAutoPlay();
        if (currentStep > 0) goToStep(currentStep - 1);
    });

    btnPlayPause.addEventListener('click', toggleAutoPlay);

    btnReset.addEventListener('click', () => {
        stopAutoPlay();
        Object.keys(stepCompletedState).forEach(k => stepCompletedState[k] = (k === '5' ? 0 : false));
        goToStep(0);
    });

    btnSoundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        if (soundEnabled) {
            soundOnIcon.classList.remove('hidden');
            soundOffIcon.classList.add('hidden');
            playTone(600, 'sine', 0.1, 0.15);
        } else {
            soundOnIcon.classList.add('hidden');
            soundOffIcon.classList.remove('hidden');
        }
    });

    btnZoomNormal.addEventListener('click', () => {
        btnZoomNormal.classList.add('active');
        btnZoomMicro.classList.remove('active');
        labCanvas.style.transform = 'scale(1)';
        labCanvas.style.transition = 'transform 0.4s ease';
    });

    btnZoomMicro.addEventListener('click', () => {
        btnZoomMicro.classList.add('active');
        btnZoomNormal.classList.remove('active');
        labCanvas.style.transform = 'scale(1.35)';
        labCanvas.style.transition = 'transform 0.4s ease';
        playTone(550, 'sine', 0.08, 0.1);
    });

    cardSheepA.addEventListener('click', () => showSheepDrawer('a'));
    cardSheepB.addEventListener('click', () => showSheepDrawer('b'));
    cardSheepC.addEventListener('click', () => showSheepDrawer('c'));
    cardDolly.addEventListener('click', () => showSheepDrawer('dolly'));
    btnCloseDrawer.addEventListener('click', () => sheepDrawer.classList.add('hidden'));

    btnQuizModal.addEventListener('click', openQuiz);
    btnCloseQuiz.addEventListener('click', closeQuiz);
    btnNextQuestion.addEventListener('click', nextQuizQuestion);
    quizModal.addEventListener('click', (e) => {
        if (e.target === quizModal) closeQuiz();
    });

    window.addEventListener('keydown', (e) => {
        if (quizModal.classList.contains('hidden')) {
            if (e.key === 'ArrowRight' || e.key === 'Space') {
                if (currentStep < STEPS.length - 1) {
                    stopAutoPlay();
                    goToStep(currentStep + 1);
                }
            } else if (e.key === 'ArrowLeft') {
                if (currentStep > 0) {
                    stopAutoPlay();
                    goToStep(currentStep - 1);
                }
            }
        }
    });

    // =========================================================================
    // 16. 初始化系統
    // =========================================================================
    initSheepAvatars();
    initStepper();
    initSandbox();
    goToStep(0);
});
