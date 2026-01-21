/**
 * Breathing Flow - Core Logic (Refined)
 */

// --- Configuration ---
const MODES = {
    relaxation: {
        id: 'relaxation',
        name: '放鬆呼吸',
        subtitle: '4s 吸 / 6s 吐',
        description: '透過延長吐氣時間，活化副交感神經，幫助身心放鬆。',
        phases: [
            { type: 'inhale', duration: 4, label: '吸氣', levelStart: 0, levelEnd: 1 },
            { type: 'exhale', duration: 6, label: '吐氣', levelStart: 1, levelEnd: 0 }
        ]
    },
    co2: {
        id: 'co2',
        name: 'CO₂ 耐受訓練',
        subtitle: '吐氣後憋氣',
        description: '吐氣後保持空肺，提升二氧化碳的耐受度，增強攝氧效率。',
        phases: [
            { type: 'inhale', duration: 4, label: '吸氣', levelStart: 0, levelEnd: 1 },
            { type: 'exhale', duration: 6, label: '吐氣', levelStart: 1, levelEnd: 0 },
            { type: 'hold', duration: 5, label: '空肺停留', levelStart: 0, levelEnd: 0 }
        ]
    },
    sigh: {
        id: 'sigh',
        name: '生理嘆息',
        subtitle: '雙重吸氣',
        description: '兩次吸氣確保肺泡張開，隨後長吐氣，快速降低壓力。',
        phases: [
            { type: 'inhale', duration: 2.5, label: '深吸氣', levelStart: 0, levelEnd: 1 }, 
            { type: 'inhale', duration: 0.5, label: '再吸氣', levelStart: 1, levelEnd: 1.2 }, 
            { type: 'exhale', duration: 6, label: '長吐氣', levelStart: 1.2, levelEnd: 0 }
        ]
    },
    box: {
        id: 'box',
        name: '箱式呼吸',
        subtitle: '4-4-4-4',
        description: '四等分呼吸法，海豹部隊用於高壓環境下保持專注冷靜。',
        phases: [
            { type: 'inhale', duration: 4, label: '吸氣', levelStart: 0, levelEnd: 1 },
            { type: 'hold', duration: 4, label: '吸氣保持', levelStart: 1, levelEnd: 1 },
            { type: 'exhale', duration: 4, label: '吐氣', levelStart: 1, levelEnd: 0 },
            { type: 'hold', duration: 4, label: '空肺停留', levelStart: 0, levelEnd: 0 }
        ]
    },
    advanced: {
        id: 'advanced',
        name: '進階控制',
        subtitle: '漸進式負荷',
        description: '長期間的屏息訓練，訓練生理耐受，鍛鍊心理韌性。',
        phases: [
            { type: 'inhale', duration: 4, label: '吸氣', levelStart: 0, levelEnd: 1 },
            { type: 'exhale', duration: 4, label: '吐氣', levelStart: 1, levelEnd: 0 },
            { type: 'hold', duration: 10, label: '空肺停留', levelStart: 0, levelEnd: 0 }
        ]
    },
    deep_hold: {
        id: 'deep_hold',
        name: '一般憋氣',
        subtitle: '深吸憋氣',
        description: '透過平穩呼吸準備，隨後進行深吸憋氣，測試缺氧耐受力。',
        phases: [
            // Cycle 1
            { type: 'inhale', duration: 4, label: '吸氣', levelStart: 0, levelEnd: 1 },
            { type: 'exhale', duration: 6, label: '吐氣', levelStart: 1, levelEnd: 0 },
            // Cycle 2
            { type: 'inhale', duration: 4, label: '吸氣', levelStart: 0, levelEnd: 1 },
            { type: 'exhale', duration: 6, label: '吐氣', levelStart: 1, levelEnd: 0 },
            // The Big Hold
            { type: 'inhale', duration: 3, label: '最大吸氣', levelStart: 0, levelEnd: 1 },
            { type: 'hold', duration: 120, label: '開始憋氣', levelStart: 1, levelEnd: 1, countUp: true }
        ]
    },    
    co2_prep: {
        id: 'co2_prep',
        name: '調降CO₂憋氣',
        subtitle: '排氣訓練',
        description: '延長吐氣並空肺停留，降低體內CO₂濃度，延後呼吸衝動。',
        phases: [
            // Cycle 1

            { type: 'inhale', duration: 3, label: '吸氣', levelStart: 0, levelEnd: 0.6 },
            { type: 'exhale', duration: 6, label: '吐氣', levelStart: 0.6, levelEnd: 0 },
            { type: 'hold', duration: 4, label: '空肺停留', levelStart: 0, levelEnd: 0 },
            // Cycle 2
            { type: 'inhale', duration: 3, label: '吸氣', levelStart: 0, levelEnd: 0.6 },
            { type: 'exhale', duration: 6, label: '吐氣', levelStart: 0.6, levelEnd: 0 },
            { type: 'hold', duration: 4, label: '空肺停留', levelStart: 0, levelEnd: 0 },
            // Cycle 3
            { type: 'inhale', duration: 3, label: '吸氣', levelStart: 0, levelEnd: 0.6 },
            { type: 'exhale', duration: 6, label: '吐氣', levelStart: 0.6, levelEnd: 0 },
            { type: 'hold', duration: 4, label: '空肺停留', levelStart: 0, levelEnd: 0 },
            // The Big Hold

            { type: 'inhale', duration: 2.5, label: '吸氣', levelStart: 0, levelEnd: 1 },
            { type: 'hold', duration: 120, label: '開始憋氣', levelStart: 1, levelEnd: 1, countUp: true } 
        ]
    },

    custom: {
        id: 'custom',
        name: '自訂頻率',
        subtitle: '調整 BPM',
        description: '自由調整呼吸速率，找到最適合當下狀態的節奏。',
        phases: [
            // Default 6 BPM (10s total): 4s Inhale, 6s Exhale
            { type: 'inhale', duration: 4, label: '吸氣', levelStart: 0, levelEnd: 1 },
            { type: 'exhale', duration: 6, label: '吐氣', levelStart: 1, levelEnd: 0 }
        ]
    }
};

// --- Easing Functions ---
const EASE = {
    inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
    linear: x => x, 
};

// --- Controller Class ---
class BreathController {
    constructor() {
        this.active = false;
        this.mode = MODES.relaxation;
        this.phaseIndex = 0;
        this.startTime = 0;
        this.phaseProgress = 0; // 0.0 to 1.0
        this.currentPhase = this.mode.phases[0];
        
        // Event Listeners
        this.onPhaseChange = null;
        this.onTick = null;
    }

    setMode(modeKey) {
        // Deep copy to allow mutation (for progressive overload or custom BPM)
        this.mode = JSON.parse(JSON.stringify(MODES[modeKey]));
        this.reset();
    }
    
    // Updates durations for Custom Mode without resetting position if active
    updateCustomBPM(bpm) {
        if (this.mode.id !== 'custom') return;
        
        // Calculate total cycle time
        // BPM = 60 / CycleTime
        // CycleTime = 60 / BPM
        const cycleTime = 60 / bpm;
        
        // Ratio: 40% Inhale, 60% Exhale (Relaxation default)
        // Or simple 1:1? Let's stick to relaxation ratio 1:1.5
        const inhaleRatio = 0.4;
        const exhaleRatio = 0.6;
        
        const inhaleDur = cycleTime * inhaleRatio;
        const exhaleDur = cycleTime * exhaleRatio;
        
        // Update Config
        this.mode.phases[0].duration = inhaleDur; // Inhale
        this.mode.phases[1].duration = exhaleDur; // Exhale
        
        // If active, we must seamlessly adjust startTime
        if (this.active) {
            // New Duration for current phase
            const newDur = this.mode.phases[this.phaseIndex].duration;
            
            // We want to keep phaseProgress constant
            // P = (Now - Start) / OldDur
            // Start = Now - (P * OldDur)
            // Goal: P = (Now - NewStart) / NewDur
            // (Now - Start) / OldDur = (Now - NewStart) / NewDur
            // NewStart = Now - (P * NewDur)
            
            const now = performance.now();
            this.startTime = now - (this.phaseProgress * newDur * 1000);
            
            // Also need to update currentPhase object reference or values
            this.currentPhase = this.mode.phases[this.phaseIndex];
        }
        
        this.updateBPM();
    }

    start() {
        this.active = true;
        this.startTime = performance.now();
        this.phaseIndex = 0;
        this.currentPhase = this.mode.phases[0];
        if (this.onPhaseChange) this.onPhaseChange(this.currentPhase);
        
        soundEngine.start();
        this.updateBPM();
        bpmDisplay.classList.remove('hidden');
    }

    stop() {
        this.active = false;
        // Reset mode config to default (restore original durations)
        this.setMode(this.mode.id);
        bpmDisplay.classList.add('hidden');
        soundEngine.stop();
    }

    reset() {
        this.phaseIndex = 0;
        this.currentPhase = this.mode.phases[0];
        this.phaseProgress = 0;
        if (this.onPhaseChange) this.onPhaseChange(this.currentPhase);
    }
    
    updateBPM() {
        // Calculate total cycle duration
        let totalDuration = 0;
        this.mode.phases.forEach(p => totalDuration += p.duration);
        
        if (totalDuration > 0) {
            const bpm = (60 / totalDuration).toFixed(1);
            // Remove .0 if integer
            const formattedBPM = bpm.endsWith('.0') ? bpm.slice(0, -2) : bpm;
            bpmDisplay.textContent = `${formattedBPM} 呼吸/分`;
        }
    }

    update(now) {
        if (!this.active) return;

        const duration = this.currentPhase.duration;
        const elapsedSeconds = (now - this.startTime) / 1000;
        
        this.phaseProgress = Math.min(elapsedSeconds / duration, 1.0);

        if (this.phaseProgress >= 1.0) {
            this.nextPhase(now);
        }

        if (this.onTick) this.onTick(this.currentPhase, this.phaseProgress);
    }
    
    nextPhase(now) {
        this.phaseIndex = (this.phaseIndex + 1) % this.mode.phases.length;
        
        // Progressive Overload for Advanced Mode
        // If we completed a full cycle (returning to index 0)
        if (this.phaseIndex === 0 && this.mode.id === 'advanced') {
            const holdPhase = this.mode.phases.find(p => p.type === 'hold');
            if (holdPhase) {
                holdPhase.duration += 2; // Increase hold by 2 seconds each cycle
                // Optional: Cap the max duration? e.g. 60s
                // holdPhase.duration = Math.min(holdPhase.duration, 60);
                
                // Note: The UI label doesn't automatically update to show "12s" unless we update the label text
                // or if the UI reads directly from currentPhase.duration
                // Currently UI just shows Duration in Timer. 
                
                this.updateBPM();
            }
        }

        this.currentPhase = this.mode.phases[this.phaseIndex];
        this.startTime = now;
        this.phaseProgress = 0;
        
        if (this.onPhaseChange) this.onPhaseChange(this.currentPhase);
    }
}
// Check original code context to ensure we didn't clip too much
// We are replacing from 'advanced: {' down to 'nextPhase' logic roughly.
// The original code had Sound Class after Controller.
// I need to be careful to ONLY replace controller logic or verify lines.
// The Tool input handles 'ReplacementContent'. I'll provide the exact block.

// Wait, I should ensure I don't delete SoundEngine class if it was below.
// In previous steps, SoundEngine was added at line ~304.
// This replacement is targeting lines around ~42 (MODES) + Controller Class.
// I will target carefully.



// --- Visualizer Class ---
class Visualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.resize();

        window.addEventListener('resize', () => this.resize());

        this.timeOffset = 0; // In seconds, scrolling speed
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    /**
     * Helper: Get the Breath Level (0-1) at a specific future/past time relative to cycle start.
     * We need to simulate the cycle loop to draw the background.
     */
    getLevelAtCycleTime(tSeconds, mode) {
        // Calculate total cycle duration
        const cycleDuration = mode.phases.reduce((acc, p) => acc + p.duration, 0);
        let activeTime = tSeconds % cycleDuration;
        if (activeTime < 0) activeTime += cycleDuration;

        // Find which phase this time falls into
        let accumulated = 0;
        for (let p of mode.phases) {
            if (activeTime < accumulated + p.duration) {
                // Inside this phase
                const localT = activeTime - accumulated;
                const progress = localT / p.duration;
                // Linear interpolation for "Straight Lines" visual
                // level = start + (end - start) * progress
                return p.levelStart + (p.levelEnd - p.levelStart) * progress;
            }
            accumulated += p.duration;
        }
        return 0;
    }

    draw(controller) {
        const { ctx, width, height } = this;
        ctx.clearRect(0, 0, width, height);

        const cy = height / 2;
        const range = height * 0.25; // Amplitude from center
        const pixelsPerSecond = 100; // Horizontal scroll speed scale

        // Update Global Time Offset
        if (controller.active) {
            this.timeOffset += 0.016; 
        } else {
            this.timeOffset += 0.005;
        }

        // --- Calculate Points First ---
        // We will generate an array of points to draw.
        const points = [];
        const stepX = 4; // Smoother
        
        let currentCycleTime = 0;
        if (controller.active) {
            let preDuration = 0;
            for (let i = 0; i < controller.phaseIndex; i++) {
                preDuration += controller.mode.phases[i].duration;
            }
            currentCycleTime = preDuration + (controller.currentPhase.duration * controller.phaseProgress);
        } else {
            currentCycleTime = this.timeOffset % 10;
        }

        // Generate points across screen
        for (let x = -50; x < width + 50; x += stepX) {
            const timeDelta = (x - width / 2) / pixelsPerSecond;
            const tQuery = currentCycleTime + timeDelta;
            const level = this.getLevelAtCycleTime(tQuery, controller.active ? controller.mode : MODES.relaxation);
            const y = cy + range - (level * 2 * range);
            points.push({ x, y, level });
        }

        // --- Pass 1: Base Line (Cyan) ---
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)'; // Lower opacity base
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (points.length > 0) ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        
        // Base Fill
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
        ctx.fill();

        // --- Pass 2: High Points (Full Lung Hold) ---
        // Level near 1.0
        ctx.beginPath();
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; // Bright White
        ctx.shadowBlur = 1;
        ctx.shadowColor = 'white';

        let drawingHigh = false;
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.level >= 0.99) {
                if (!drawingHigh) {
                    ctx.moveTo(p.x, p.y);
                    drawingHigh = true;
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            } else {
                drawingHigh = false;
            }
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset

        // --- Pass 3: Low Points (Empty Lung Hold) ---
        // Level near 0.0
        ctx.beginPath();
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(100, 100, 255, 0.8)'; // Deep Purple/Blue
        // ctx.shadowBlur = 5;
        // ctx.shadowColor = 'blue';

        let drawingLow = false;
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.level <= 0.01) {
                if (!drawingLow) {
                    ctx.moveTo(p.x, p.y);
                    drawingLow = true;
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            } else {
                drawingLow = false;
            }
        }
        ctx.stroke();


        // --- Draw Ticks (每秒一个刻度) ---
        // Draw tick marks as dots for every second on the line
        // Only show ticks in the future (to the right of the center dot)
        //const pixelsPerSecond = 100; // Same as scroll speed
        const centerX = width / 2;
        const tickRadius = 5; // Radius of dot
        
        // Calculate absolute elapsed time since breathing started (in seconds)
        let absoluteElapsedTime = currentCycleTime; // Relative time in current cycle
        if (controller.active) {
            // Add time from all completed cycles
            const cycleDuration = controller.mode.phases.reduce((acc, p) => acc + p.duration, 0);
            const timeSinceStart = (performance.now() - controller.startTime) / 1000;
            const completedCycles = Math.floor(timeSinceStart / cycleDuration);
            absoluteElapsedTime = completedCycles * cycleDuration + currentCycleTime;
        }
        
        // Calculate which second ticks should be visible
        // Integer seconds from the absolute elapsed time, but only future ones
        const startSecond = Math.max(0, Math.ceil(absoluteElapsedTime));
        const endSecond = Math.ceil(absoluteElapsedTime + ((width - centerX) / pixelsPerSecond));
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        
        for (let second = startSecond; second <= endSecond; second++) {
            const timeAtTick = second;
            const timeDelta = timeAtTick - absoluteElapsedTime;
            
            // Only draw ticks that are in the future (timeDelta >= 0)
            if (timeDelta < 0) continue;
            
            const tickX = centerX + (timeDelta * pixelsPerSecond);
            
            // Make sure tick is within canvas
            if (tickX >= 0 && tickX <= width) {
                // Use modulo to get the time within the current cycle for level calculation
                const timeInCycle = timeAtTick % (controller.active ? controller.mode.phases.reduce((acc, p) => acc + p.duration, 0) : 10);
                const level = this.getLevelAtCycleTime(timeInCycle, controller.active ? controller.mode : MODES.relaxation);
                const tickY = cy + range - (level * 2 * range);
                
                // Draw dot
                ctx.beginPath();
                ctx.arc(tickX, tickY, tickRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // --- Draw Central Dot ---
        // Re-calculate dot level safely (or use points array closer to center?)
        // Let's re-calc for precision at exact center time.
        const dotLevel = this.getLevelAtCycleTime(currentCycleTime, controller.active ? controller.mode : MODES.relaxation);
        const dotY = cy + range - (dotLevel * 2 * range);
        
        // Adjust dot size based on breath level (not progress)
        // This ensures continuous growth during multiple inhale phases
        const baseSize = 15;
        const maxSize = 35;
        let dotSize = baseSize;
        
        if (controller.active) {
            const type = controller.currentPhase.type;
            
            if (type === 'inhale') {
                // Grow based on actual lung level, not progress
                // This ensures continuous growth even with multiple inhale phases
                dotSize = baseSize + (maxSize - baseSize) * Math.min(dotLevel, 1);
            } else if (type === 'exhale') {
                // Shrink based on actual lung level
                dotSize = baseSize + (maxSize - baseSize) * Math.max(dotLevel, 0);
            } else if (type === 'hold') {
                // Keep size based on current lung level
                dotSize = baseSize + (maxSize - baseSize) * dotLevel;
            }
        } else {
            dotSize = baseSize;
        }
        
        ctx.shadowBlur = 40;
        ctx.shadowColor = 'cyan';
        ctx.fillStyle = '#ffffff';
        
        ctx.beginPath();
        ctx.arc(width / 2, dotY, dotSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw Vertical Guide Line
        /*
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(width / 2, 0); 
        ctx.lineTo(width / 2, height);
        ctx.stroke();
        ctx.setLineDash([]);
        */
        
        // Draw Reference Horizon Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(0, cy - range); 
        ctx.lineTo(width, cy - range);
        ctx.moveTo(0, cy + range); 
        ctx.lineTo(width, cy + range);
        ctx.stroke();
    }
}

// --- Sound Engine Class (Web Audio API) ---
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.oscillators = [];
        this.filter = null;
        this.lfo = null;
        this.isMuted = false;
        this.baseFreqs = [174.61, 220.00, 261.63, 349.23]; // F3, A3, C4, F4 (F Major 7ish)
        
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            // Master Chain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3; // Base volume
            this.masterGain.connect(this.ctx.destination);

            // Filter (Lowpass) - Controlled by breath
            this.filter = this.ctx.createBiquadFilter();
            this.filter.type = 'lowpass';
            this.filter.frequency.value = 200; // Start dark
            this.filter.Q.value = 1;
            this.filter.connect(this.masterGain);

            // Create Drone Oscillators
            this.baseFreqs.forEach(freq => {
                this.createOscillator(freq);
            });
            
            // White Noise (Wind/Breath texture)
            this.createNoise();

            this.initialized = true;
        } catch (e) {
            console.error('Web Audio API not supported', e);
        }
    }

    createOscillator(freq) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        const gain = this.ctx.createGain();
        gain.gain.value = 0.1;
        
        // Slight Detune LFO for richness
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.1 + Math.random() * 0.2; // Slow
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 2; // +/- 2Hz detune
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        osc.connect(gain);
        gain.connect(this.filter);
        osc.start();
        
        this.oscillators.push({ osc, gain });
    }

    createNoise() {
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 400; 

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0.05;

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        noise.start();
        this.noiseNode = { node: noiseFilter, gain: noiseGain };
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        if(this.masterGain) {
            this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime, 0.1);
        }
        return this.isMuted;
    }

    start() {
        if (!this.initialized || !this.ctx || this.isMuted) return;
        this.resume();
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0.3, now + 1); // Fade in
    }

    stop() {
        if (!this.initialized || !this.ctx) return;
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0, now + 0.5); // Fade out
    }

    updateBreath(level, active) {
        if (!this.initialized || !this.ctx) return;
        
        const now = this.ctx.currentTime;
        
        if (active) {
            // Level 0 (Exhale end) -> Darker, Quieter
            // Level 1 (Inhale end) -> Brighter, Louder
            
            // Filter Frequency: 200Hz -> 800Hz
            const targetFreq = 200 + (level * 600);
            this.filter.frequency.setTargetAtTime(targetFreq, now, 0.1);
            
            // Volume Swell
            const targetVol = 0.2 + (level * 0.2); // 0.2 to 0.4
            // this.masterGain.gain.setTargetAtTime(targetVol, now, 0.1); // Doesn't interact well with Mute

            // Noise modulation (Windier when full)
            if (this.noiseNode) {
                 this.noiseNode.gain.gain.setTargetAtTime(0.02 + (level * 0.08), now, 0.1);
            }
        } else {
            // Idle state
            this.filter.frequency.setTargetAtTime(200, now, 1);
            if (this.noiseNode) this.noiseNode.gain.gain.setTargetAtTime(0.02, now, 1);
        }
    }

    playPhaseChange(phase) {
        if (!this.initialized || this.isMuted) return;
        
        // Bell sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination); // Bypass lowpass for clarity
        
        const now = this.ctx.currentTime;
        const type = phase.type;
        
        // Distinct Sounds for 4 States
        if (type === 'inhale') {
            // Inhale: A4 (440Hz) - Bright, inviting
            osc.frequency.setValueAtTime(440, now); 
            osc.type = 'sine';
            
            // Volume Envelope
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
            
        } else if (type === 'exhale') {
            // Exhale: G4 (392Hz) - Higher than before (was F4), gentle release
            osc.frequency.setValueAtTime(392.00, now);
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
            
        } else if (type === 'hold') {
            // Distinguish Full vs Empty Hold
            if (phase.levelStart >= 0.9) {
                // Hold Full: Bb4 (466.16Hz) - Lower than C5 (523), less subtle
                osc.frequency.setValueAtTime(466.16, now); 
                osc.type = 'triangle';
                
                // Sharper attack for "Stop" feel
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
                
            } else {
                // Hold Empty: Low Thud (F3 - 174.61Hz) - Deep relaxation/void
                osc.frequency.setValueAtTime(174.61, now); 
                osc.type = 'sine';
                // Deeper, duller sound
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.15, now + 0.1); // Slightly louder for low freq
                gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
            }
        
        } else if (type === 'recover') {
             // Recovery: Rising slide?
             osc.frequency.setValueAtTime(300, now);
             osc.frequency.linearRampToValueAtTime(500, now + 0.5);
             osc.type = 'sine';
             
             gain.gain.setValueAtTime(0, now);
             gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
             gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
        }
        
        osc.start(now);
        osc.stop(now + 2);
    }
}

// --- Initialization ---
const soundEngine = new SoundEngine();
const controller = new BreathController();
const visualizer = new Visualizer('visualizer');

const ui = {
    toggleBtn: document.getElementById('toggle-btn'),
    phaseText: document.getElementById('phase-text'),
    timerText: document.getElementById('timer-text'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    controlsContainer: document.querySelector('.controls-container'),
    header: document.querySelector('.header'),
    overlay: document.querySelector('.overlay')
};

// Add Audio Button
const audioBtn = document.createElement('button');
audioBtn.className = 'icon-btn';
audioBtn.innerHTML = '🔊';
audioBtn.style.cssText = "position: absolute; top: 2rem; right: 2rem; background: none; border: 1px solid rgba(255,255,255,0.2); color: white; padding: 10px; border-radius: 50%; cursor: pointer; pointer-events: auto;";
document.querySelector('.overlay').appendChild(audioBtn);

audioBtn.addEventListener('click', () => {
    if (!soundEngine.initialized) soundEngine.init();
    const muted = soundEngine.toggleMute();
    audioBtn.innerHTML = muted ? '🔇' : '🔊';
    audioBtn.style.opacity = muted ? '0.5' : '1';
});


// Add Tick Listener for Sound Logic
controller.onTick = (phase, progress) => {
    // We need 'level' here too, but it's calculated in loop. 
    // Let's rely on loop to call soundEngine.updateBreath
};

controller.onPhaseChange = (phase) => {
    soundEngine.playPhaseChange(phase);
};


// --- Loop ---
function animate() {
    const now = performance.now();
    controller.update(now);
    
    // UI Updates
    if (controller.active) {
        ui.phaseText.textContent = controller.currentPhase.label;
        const elapsed = (now - controller.startTime) / 1000;
        
        // Timer Display Logic
        if (controller.currentPhase.countUp) {
            // Count UP (e.g. for long holds)
            const count = Math.floor(elapsed);
            ui.timerText.textContent = count + 's';
            ui.timerText.classList.add('timer-large');
            ui.phaseText.style.opacity = 0.5; // Dim phase text slightly?
        } else {
            // Count DOWN (default)
            const remaining = Math.ceil(controller.currentPhase.duration - elapsed);
            // Clamp to 0
            ui.timerText.textContent = Math.max(0, remaining) + 's';
            ui.timerText.classList.remove('timer-large');
            ui.phaseText.style.opacity = 1;
        }
    } else {
        ui.phaseText.textContent = "準備";
        ui.timerText.textContent = "00:00";
        ui.timerText.classList.remove('timer-large');
        ui.phaseText.style.opacity = 0.9;
    }

    // Determine current breath level (reused logic)
    let level = 0;
    if (controller.active) {
        const p = controller.phaseProgress;
        const type = controller.currentPhase.type;
        const eased = controller.mode.id === 'box' ? EASE.linear(p) : EASE.inOutSine(p); // Box linear? No, keep sine for comfort.
        const sineEased = EASE.inOutSine(p);

        if (type === 'inhale') level = sineEased;
        else if (type === 'exhale') level = 1 - sineEased;
        else if (type === 'hold') {
             // Logic for Hold Levels
             const m = controller.mode.id;
             const i = controller.phaseIndex;
             if (m === 'box') level = (i === 1) ? 1 : 0;
             else if (m === 'co2') level = 0;
             else if (m === 'advanced') level = 0; 
             else level = 0;
        }
        else if (type === 'recover') level = sineEased; 
    }
    
    // Update Sound
    soundEngine.updateBreath(level, controller.active);

    // Draw
    visualizer.draw(controller);

    requestAnimationFrame(animate);
}


// --- Events ---
const customControls = document.getElementById('custom-controls');
const bpmSlider = document.getElementById('bpm-slider');
const bpmValue = document.getElementById('bpm-value');
const modeDescription = document.getElementById('mode-description');
const bpmDisplay = document.getElementById('bpm-display');

// ... (Rest of Events)

// Add Helper to Controller (or outside)
// Let's add it to Controller class logic for better encapsulation
// or just utility function. Controller seems best.

bpmSlider.addEventListener('input', (e) => {
    const bpm = parseFloat(e.target.value);
    bpmValue.textContent = bpm;
    controller.updateCustomBPM(bpm);
});

ui.toggleBtn.addEventListener('click', () => {
    
    // Init Audio on first user interaction
    if (!soundEngine.initialized) {
        soundEngine.init();
    }
    soundEngine.resume(); // Browser policy

    if (controller.active) {
        controller.stop();
        ui.toggleBtn.textContent = "開始練習";
        ui.toggleBtn.classList.remove('stop');
        ui.toggleBtn.classList.remove('active-practice');
        
        // Show UI
        ui.controlsContainer.classList.remove('hidden');
        ui.header.classList.remove('hidden');
        
    } else {
        controller.start();
        ui.toggleBtn.textContent = "停止";
        ui.toggleBtn.classList.add('stop');
        ui.toggleBtn.classList.add('active-practice');

        // Hide UI (Focus Mode)
        ui.controlsContainer.classList.add('hidden');
        ui.header.classList.add('hidden');
    }
});

// Initialize Mode Buttons Dynamically from Configuration
function initModeButtons() {
    const container = document.querySelector('.mode-selector');
    if (!container) return; // Ensure container exists
    container.innerHTML = ''; // Clear static HTML

    Object.keys(MODES).forEach(key => {
        const mode = MODES[key];
        const btn = document.createElement('button');
        btn.className = 'mode-btn';
        if (key === 'relaxation') btn.classList.add('active'); // Default active
        btn.dataset.mode = mode.id;
        
        // HTML Structure
        btn.innerHTML = `
            <span class="label">${mode.name}</span>
            <span class="sub">${mode.subtitle}</span>
        `;
        
        // Event Listener
        btn.addEventListener('click', () => {
            // Visual Active State
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Logic
            if (mode.description) {
                modeDescription.textContent = mode.description;
            }

            controller.setMode(mode.id);
            
            if (mode.id === 'custom') {
                customControls.classList.remove('hidden');
                controller.updateCustomBPM(parseFloat(bpmSlider.value));
            } else {
                customControls.classList.add('hidden');
            }
            
            // Stop current session if running
            if (controller.active) {
                controller.stop();
                ui.toggleBtn.textContent = "開始練習";
                ui.toggleBtn.classList.remove('stop');
            } else {
                 // Even if not active, reset timer display
                 ui.timerText.textContent = "00:00";
            }
            ui.phaseText.textContent = "準備";
            
            // Update BPM display for the new mode immediately
            controller.updateBPM();
            // bpmDisplay.classList.add('hidden'); // Hide until start? Or show? Standard is show on Start.
        });
        
        container.appendChild(btn);
    });
}

// Run Initialization
initModeButtons();

// Start Loop
animate();
