/**
 * IR Modulation Demo
 * Simulates Data signal, Carrier signal, and Modulation.
 */

class Oscilloscope {
    constructor(canvasId, color) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.color = color;
        this.dataPoints = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
        this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = this.canvas.offsetWidth;
        this.height = this.canvas.offsetHeight;
    }

    draw(time, valueFn) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.clearRect(0, 0, w, h);
        
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';

        // Draw a seamless scrolling waveform requires a bit more logic or a rolling buffer.
        // For simplicity and "real-time" feel without buffer management, 
        // we will redraw the entire width based on (time) for x pixels.
        // This is computationally higher but fine for small number of oscillators.
        
        // Window length in seconds to display
        const timeWindow = 2.0; 
        const pixelsPerSecond = w / timeWindow;

        // Current 'now' is at the right edge.
        const endTime = time;
        const startTime = endTime - timeWindow;

        for (let x = 0; x < w; x++) {
            // Map x (0 to w) to time (start to end)
            // t = startTime + (x / w) * window
            const t = startTime + (x / w) * timeWindow;
            
            // Calculate y (-1 to 1) -> (h to 0)
            const val = valueFn(t); 
            // Map -1..1 to h-padding..padding
            // Invert Y because canvas Y is down
            const y = (1 - val) / 2 * h * 0.8 + h * 0.1;

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.stroke();

        // Add a "reading head" glow at the end
        // ctx.shadowBlur = 10;
        // ctx.shadowColor = this.color;
        // ctx.stroke();
        // ctx.shadowBlur = 0;
    }
}

const APP = {
    audioCtx: null,
    isPlaying: false,
    
    // Nodes
    dataOsc: null,
    carrierOsc: null,
    masterGain: null,
    
    // Params
    dataFreq: 2,
    carrierFreq: 400,
    
    // State
    startTime: 0,
    
    // Visualizers
    scopeData: null,
    scopeCarrier: null,
    scopeMod: null,
    scopeDemod: null,

    init() {
        // Init UI
        this.cacheDOM();
        this.bindEvents();
        
        // Init Scopes
        this.scopeData = new Oscilloscope('canvas-data', '#ff0055');
        this.scopeCarrier = new Oscilloscope('canvas-carrier', '#00ccff');
        this.scopeMod = new Oscilloscope('canvas-mod', '#ccff00');
        this.scopeDemod = new Oscilloscope('canvas-demod', '#ffffff');

        // Animation Loop
        requestAnimationFrame(this.loop.bind(this));
    },

    cacheDOM() {
        this.btnStart = document.getElementById('btn-start');
        this.overlay = document.getElementById('start-overlay');
        
        this.sliderData = document.getElementById('slider-data-freq');
        this.valData = document.getElementById('val-data-freq');
        
        this.sliderCarrier = document.getElementById('slider-carrier-freq');
        this.valCarrier = document.getElementById('val-carrier-freq');

        this.btnAudioData = document.getElementById('btn-audio-data');
        this.btnAudioCarrier = document.getElementById('btn-audio-carrier');
        this.btnAudioMod = document.getElementById('btn-audio-mod');
    },

    bindEvents() {
        this.btnStart.addEventListener('click', () => {
            this.startAudio();
            this.overlay.classList.add('hidden');
        });

        this.sliderData.addEventListener('input', (e) => {
            this.dataFreq = parseFloat(e.target.value);
            this.valData.textContent = this.dataFreq + ' Hz';
            this.updateAudioParams();
        });

        this.sliderCarrier.addEventListener('input', (e) => {
            this.carrierFreq = parseFloat(e.target.value);
            this.valCarrier.textContent = this.carrierFreq + ' Hz';
            this.updateAudioParams();
        });

        // Temporary audio routing for listening
        this.btnAudioData.addEventListener('mousedown', () => this.hearSignal('data'));
        this.btnAudioData.addEventListener('mouseup', () => this.stopHear());
        this.btnAudioCarrier.addEventListener('mousedown', () => this.hearSignal('carrier'));
        this.btnAudioCarrier.addEventListener('mouseup', () => this.stopHear());
        this.btnAudioMod.addEventListener('mousedown', () => this.hearSignal('mod'));
        this.btnAudioMod.addEventListener('mouseup', () => this.stopHear());
    },

    startAudio() {
        if (this.audioCtx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
        this.startTime = this.audioCtx.currentTime;
        
        // We actually won't use real Web Audio oscillators for the *core logic* 
        // because we want precise control over the visual vs audio mapping 
        // and we want to "hear" the data signal (2Hz) which is inaudible.
        //
        // STRATEGY: 
        // 1. Visuals are purely mathematical functions of time.
        // 2. Audio is synthesized on demand when "Listen" is clicked, 
        //    matching the parameters of the visual.
        
        this.isPlaying = true;
    },

    hearSignal(type) {
        if (!this.audioCtx) return;
        
        // Create nodes for temporary playback
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        gain.connect(this.audioCtx.destination);
        
        const now = this.audioCtx.currentTime;
        
        if (type === 'carrier') {
            // Just play carrier
            osc.frequency.setValueAtTime(this.carrierFreq, now);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, now);
            osc.start();
            this.currentSource = osc;
        } else if (type === 'data') {
            // Play data as a tone? Or just the clicks? 
            // 2Hz square wave is hard to hear. 
            // Let's sound it as a constant tone that turns on/off?
            // Actually, let's play a separate "Indication Tone" (e.g. 400Hz) 
            // that pulses at the data rate.
            
            // Actually, just playing the raw 2Hz square wave results in clicks.
            // Better to Modulate a comfortable tone (e.g. 600Hz) with the data signal
            // so user hears the "Check... Check..." rhythm.
            
            osc.frequency.setValueAtTime(600, now); // Comfortable listening tone
            osc.type = 'sine';
            
            // Create an LFO for the data rate
            const lfo = this.audioCtx.createOscillator();
            lfo.frequency.setValueAtTime(this.dataFreq, now);
            lfo.type = 'square';
            
            const lfoGain = this.audioCtx.createGain();
            lfoGain.gain.value = 1000; // Strong modulation to gate it
            
            // This is complex to gate a signal with an oscillator perfectly in Web Audio without logic.
            // Simpler: Just use the same logic as 'mod' but with a different carrier.
            
            // Let's implement 'mod' and 'data' similarly.
            // DATA: Beeps at dataFreq.
            // MOD: Beeps at dataFreq using carrierFreq.
            
            osc.stop(); // cancel the prev setup
            
            this.playPulse(600); // 600Hz beep for Data
        } else if (type === 'mod') {
            this.playPulse(this.carrierFreq); // Real carrier beep for Mod
        }
    },
    
    playPulse(toneFreq) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.frequency.value = toneFreq;
        osc.type = 'sine';
        
        // AM Modulation with Square Wave
        const lfo = this.audioCtx.createOscillator();
        const lfoGain = this.audioCtx.createGain();
        
        lfo.frequency.value = this.dataFreq;
        lfo.type = 'square';
        
        // Square wave goes -1 to 1.
        // We want 0 to 1 for gain.
        // So we need to offset it. Or simply use a custom curve.
        // Easiest is to use an AudioWorklet or just simple Gain automation if simple.
        // But for continuous LFO, connecting LFO to Gain AudioParam:
        // Gain = Base (0.5) + LFO (0.5) -> oscillates 0 to 1.
        
        lfo.connect(lfoGain);
        lfoGain.gain.value = 0.5;
        
        // Connect LFO (scaled to +/- 0.5) to gain.gain
        // But gain.gain base value should be 0.5
        gain.gain.value = 0.5; 
        lfoGain.connect(gain.gain);
        
        osc.start();
        lfo.start();
        
        this.currentSourceNodes = [osc, lfo, gain, lfoGain];
    },

    stopHear() {
        if (this.currentSourceNodes) {
            this.currentSourceNodes.forEach(n => {
                try { n.stop(); } catch(e){}
                try { n.disconnect(); } catch(e){}
            });
            this.currentSourceNodes = null;
        }
        if (this.currentSource) {
            try { this.currentSource.stop(); } catch(e){}
            try { this.currentSource.disconnect(); } catch(e){}
            this.currentSource = null;
        }
    },
    
    updateAudioParams() {
        // Updated in real-time during 'hear' if needed, 
        // but typically restarts on new click.
        // If we want real-time slider updates to affect currently playing sound:
        // We would need to store references to active nodes. 
        // For this simple demo, holding the button while dragging is rare.
        // Let's just keep it simple.
    },

    // Mathematical Wave Functions for Visuals
    getSignalValue(t) {
        // Square wave at dataFreq
        // Math.sin(2 * pi * f * t) > 0 ? 1 : 0 (or -1)
        // IR logic: 0 = Off, 1 = On.
        // Let's align phase so it looks nice.
        const val = Math.sin(2 * Math.PI * this.dataFreq * t);
        return val > 0 ? 1 : 0; // Unipolar 0 or 1
    },

    getCarrierValue(t) {
        // Sine wave at carrierFreq
        return Math.sin(2 * Math.PI * this.carrierFreq * t);
    },

    loop() {
        requestAnimationFrame(this.loop.bind(this));
        
        let now = 0;
        if (this.audioCtx) {
            now = this.audioCtx.currentTime;
        } else {
            // Fallback time if not started
            now = performance.now() / 1000;
        }

        // Draw Data (Square)
        // Adjust logic: Visuals usually show bipolar (-1 to 1) centering.
        // But IR data is logic level (0 or 1).
        // Let's draw it 0 to 1.
        this.scopeData.draw(now, (t) => {
            const s = this.getSignalValue(t); 
            // Map 0..1 to -0.5..0.5 for centering? 
            // Or just allow 0 to 1. Scope draw expects -1..1 range.
            // If s is 0 or 1:
            // 1 -> 0.8
            // 0 -> -0.8
            return s === 1 ? 0.8 : -0.8;
        });

        // Draw Carrier (Sine)
        this.scopeCarrier.draw(now, (t) => {
            return this.getCarrierValue(t);
        });

        // Draw Modulated (Data * Carrier)
        this.scopeMod.draw(now, (t) => {
            const s = this.getSignalValue(t);
            const c = this.getCarrierValue(t);
            // If data is 1, we see carrier.
            // If data is 0, we see nothing (0).
            if (s === 1) return c;
            return 0;
        });
        
        // Draw Demodulated (Filtered)
        // Simple logic: If Modulated has energy, output 1.
        // We can simulate simple RC filter smoothing
        this.scopeDemod.draw(now, (t) => {
             const s = this.getSignalValue(t);
             // Add some lag/smoothing to make it look "real" like a receiver
             // Just a slight shape change?
             // For educational clarity, keeping it clean is better, 
             // maybe just rounded corners or slight delay.
             return s === 1 ? 0.8 : -0.8;
        });

    }
};

window.onload = () => {
    APP.init();
};
