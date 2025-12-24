class HeartAnimation {
    constructor() {
        this.svg = document.getElementById('heart-svg');
        this.btnToggle = document.getElementById('btn-toggle');
        this.sliderSpeed = document.getElementById('slider-speed');
        
        // Status Elements
        this.statusPhase = document.getElementById('phase-name');
        this.statusAtria = document.getElementById('status-atria');
        this.statusVentricles = document.getElementById('status-ventricles');
        this.statusAV = document.getElementById('status-av');
        this.statusSL = document.getElementById('status-sl');

        // SVG Elements
        this.elRA = document.getElementById('ra');
        this.elLA = document.getElementById('la');
        this.elRV = document.getElementById('rv');
        this.elLV = document.getElementById('lv');
        
        this.valveTricuspid = document.getElementById('valve-tricuspid');
        this.valveMitral = document.getElementById('valve-mitral');
        this.valvePulmonary = document.getElementById('valve-pulmonary');
        this.valveAortic = document.getElementById('valve-aortic');

        // Animation State
        this.isPlaying = false;
        this.progress = 0; // 0.0 to 1.0
        this.speed = 1.0;
        this.lastTime = 0;
        
        // Audio
        this.audioCtx = null;
        this.hasPlayedLub = false;
        this.hasPlayedDub = false;

        this.init();
    }

    init() {
        if (this.btnToggle) {
            this.btnToggle.addEventListener('click', () => this.togglePlay());
        } else {
            console.error("HeartAnimation: btn-toggle not found");
        }
        
        if (this.sliderSpeed) {
            this.sliderSpeed.addEventListener('input', (e) => this.speed = parseFloat(e.target.value));
        } else {
            console.error("HeartAnimation: slider-speed not found");
        }
        
        // Initial Render
        this.updateView(0);
    }

    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playTone(freq, type, duration) {
        if (!this.audioCtx) return;
        
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = type; // 'sine', 'triangle'
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, this.audioCtx.currentTime + duration);
        
        gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    }

    playLub() {
        // S1: Closure of AV valves. Low pitch, longer.
        this.playTone(60, 'triangle', 0.15);
        this.playTone(40, 'sine', 0.15);
    }

    playDub() {
        // S2: Closure of SL valves. Higher pitch, shorter.
        this.playTone(90, 'triangle', 0.1);
        this.playTone(70, 'sine', 0.1);
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        this.btnToggle.textContent = this.isPlaying ? "暫停" : "播放";
        if (this.isPlaying) {
            this.initAudio();
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    loop(timestamp) {
        if (!this.isPlaying) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Cycle duration ~ 1 second at 1x speed
        const cycleDuration = 1.0 / this.speed;
        this.progress += dt / cycleDuration;

        if (this.progress >= 1.0) {
            this.progress %= 1.0;
            this.hasPlayedLub = false;
            this.hasPlayedDub = false;
        }

        this.updateView(this.progress);
        // this.updateParticles(); // Update blood particles
        requestAnimationFrame((t) => this.loop(t));
    }

    // Helper to interpolate values
    lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }

    updateView(p) {
        // Phases
        // 0.00 - 0.10: Atrial Systole (Atria Contract, Ventricles Full)
        // 0.10 - 0.15: Isovolumetric Contraction (Valves Close -> LUB)
        // 0.15 - 0.40: Ventricular Ejection (Ventricles Contract)
        // 0.40 - 0.50: Isovolumetric Relaxation (SL Valves Close -> DUB)
        // 0.50 - 1.00: Filling (All Relaxed)

        let atriaScale = 1;
        let ventScale = 1;
        let avOpen = true;
        let slOpen = false;
        let phaseText = "";

        if (p < 0.10) {
            // Atrial Systole
            phaseText = "心房收縮 (Atrial Systole)";
            // Atria contract 1.0 -> 0.8
            const t = p / 0.10;
            atriaScale = this.lerp(1.0, 0.85, t);
            ventScale = 1.0; // Full
            avOpen = true;
            slOpen = false;

            this.statusAtria.textContent = "收縮";
            this.statusVentricles.textContent = "舒張 (充血)";

        } else if (p < 0.15) {
            // Isovolumetric Contraction
            phaseText = "等容收縮 (Isovolumetric Contraction)";
            atriaScale = 0.9; // Relaxing
            ventScale = 1.0; // Building pressure
            avOpen = false; // CLOSED!
            slOpen = false;

            if (!this.hasPlayedLub) {
                this.playLub();
                this.hasPlayedLub = true;
            }

            this.statusAtria.textContent = "舒張";
            this.statusVentricles.textContent = "收縮 (壓力上升)";

        } else if (p < 0.40) {
            // Ventricular Ejection
            phaseText = "心室射血 (Ventricular Ejection)";
            const t = (p - 0.15) / 0.25;
            atriaScale = this.lerp(0.9, 1.0, t); // Filling
            ventScale = this.lerp(1.0, 0.7, t); // Contracting!
            avOpen = false;
            slOpen = true; // OPEN!

            this.statusAtria.textContent = "舒張 (充血)";
            this.statusVentricles.textContent = "收縮 (射血)";

        } else if (p < 0.50) {
            // Isovolumetric Relaxation
            phaseText = "等容舒張 (Isovolumetric Relaxation)";
            atriaScale = 1.0;
            ventScale = 0.7; // Relaxed but empty
            avOpen = false;
            slOpen = false; // CLOSED!

            if (!this.hasPlayedDub) {
                this.playDub();
                this.hasPlayedDub = true;
            }

            this.statusAtria.textContent = "充血";
            this.statusVentricles.textContent = "舒張";

        } else {
            // Ventricular Filling
            phaseText = "心室充血 (Ventricular Filling)";
            const t = (p - 0.50) / 0.50;
            atriaScale = 1.0;
            ventScale = this.lerp(0.7, 1.0, t); // Filling
            avOpen = true; // OPEN!
            slOpen = false;

            this.statusAtria.textContent = "舒張 (充血)";
            this.statusVentricles.textContent = "舒張 (充血)";
        }

        this.statusPhase.textContent = phaseText;
        this.statusAV.textContent = avOpen ? "開啟" : "關閉";
        this.statusSL.textContent = slOpen ? "開啟" : "關閉";

        // Apply Transforms
        // We use transform origin center for scaling
        // Note: In SVG, transform-origin is tricky. 
        // We'll use a simple approach: scale around a fixed point or just rely on CSS classes if possible, 
        // but JS style manipulation is more precise for the loop.
        
        // Actually, changing 'd' is hard. Let's use CSS transforms on the elements.
        // We need to set transform-origin in CSS or JS.
        
        // Atria
        this.setTransform(this.elRA, atriaScale, "150px 250px");
        this.setTransform(this.elLA, atriaScale, "450px 250px");
        
        // Ventricles
        this.setTransform(this.elRV, ventScale, "180px 400px");
        this.setTransform(this.elLV, ventScale, "420px 400px");

        // Valves
        this.setValve(this.valveTricuspid, avOpen);
        this.setValve(this.valveMitral, avOpen);
        this.setValve(this.valvePulmonary, slOpen);
        this.setValve(this.valveAortic, slOpen);
    }

    setTransform(el, scale, origin) {
        el.style.transformOrigin = origin;
        el.style.transform = `scale(${scale})`;
    }

    setValve(group, isOpen) {
        const left = group.querySelector('.leaflet-left');
        const right = group.querySelector('.leaflet-right');
        
        // Determine if it's an AV valve (pointing down) or SL valve (pointing up)
        // AV valves: Tricuspid, Mitral. SL valves: Pulmonary, Aortic.
        const isAV = group.id.includes('tricuspid') || group.id.includes('mitral');

        if (isAV) {
            if (isOpen) {
                // Open: Swing outwards (Leaflets move away from center)
                left.style.transform = "rotate(40deg)";
                right.style.transform = "rotate(-40deg)";
            } else {
                // Closed: Tips touch (Default 0deg is touching)
                // Maybe slight overlap or pressure bulge? Let's keep it simple.
                left.style.transform = "rotate(0deg)";
                right.style.transform = "rotate(0deg)";
            }
        } else {
            // SL Valves (Point UP)
            if (isOpen) {
                // Open: Swing outwards
                left.style.transform = "rotate(-40deg)";
                right.style.transform = "rotate(40deg)";
            } else {
                // Closed: Tips touch
                left.style.transform = "rotate(0deg)";
                right.style.transform = "rotate(0deg)";
            }
        }
    }
}

// Start
window.addEventListener('DOMContentLoaded', () => {
    new HeartAnimation();
});
