document.addEventListener('DOMContentLoaded', () => {
    const sim = new Simulation();
    sim.start();
});

class Simulation {
    constructor() {
        // State
        this.glucose = 100; // mg/dL
        this.maxGlucose = 300;
        this.minGlucose = 50;
        
        this.insulin = 0;
        this.glucagon = 0;
        this.adrenaline = 0; // New Hormone
        
        this.liverGlycogen = 500; // Units
        this.muscleGlycogen = 1000;
        this.muscleGlycogen = 1000;
        this.fatStorage = 1000; // Units
        this.glycerol = 0; // New metabolite for indirect pathway
        
        this.maxLiverGlycogen = 1000;
        this.maxMuscleGlycogen = 2000;

        // Tuning Parameters
        this.insulinThreshold = 110;  // Glucose > 120 -> Secrete Insulin
        this.glucagonThreshold = 90;  // Glucose < 80 -> Secrete Glucagon
        
        // Constants
        this.basalConsumption = 0.05; // Brain always eats
        this.otherConsumption = 0.02; // Other organs
        this.insulinDecay = 0.02;     // Faster decay for responsiveness in auto mode
        this.glucagonDecay = 0.02;
        this.glucoseDecayNatural = 0.005; 

        // UI Elements
        this.uiGlucose = document.getElementById('blood-glucose-display');
        this.uiInsulinBar = document.getElementById('insulin-bar');
        this.uiGlucagonBar = document.getElementById('glucagon-bar');
        this.uiAdrenalineBar = document.getElementById('adrenaline-bar');
        this.uiLiverGlycogen = document.getElementById('liver-glycogen');
        this.uiMuscleGlycogen = document.getElementById('muscle-glycogen');
        this.uiFatStorage = document.getElementById('fat-storage');
        this.toggleAuto = document.getElementById('toggle-auto');
        
        this.organs = {
            brain: document.getElementById('organ-brain'),
            liver: document.getElementById('organ-liver'),
            muscle: document.getElementById('organ-muscle'),
            intestine: document.getElementById('organ-intestine'),
            fat: document.getElementById('organ-adipose'),
            other: document.getElementById('organ-other')
        };
        
        this.visLiver = document.getElementById('liver-storage-visual');
        this.visFat = document.getElementById('fat-storage-visual');
        this.visMuscle = document.getElementById('muscle-storage-visual');
        this.muscleSlider = document.getElementById('muscle-mass-slider');

        // Particles
        this.particleManager = new ParticleManager(document.getElementById('bloodstream-svg'));

        // Controls
        document.getElementById('btn-eat').addEventListener('click', () => this.eatMeal());
        document.getElementById('btn-insulin').addEventListener('click', () => this.injectInsulin());
        document.getElementById('btn-glucagon').addEventListener('click', () => this.injectGlucagon());
        document.getElementById('btn-exercise').addEventListener('click', () => this.startExercise());
        this.muscleSlider.addEventListener('input', () => this.updateMuscleCapacity());
        
        this.lastTime = 0;
        this.lastGlucose = this.glucose; // For PID (Derivative)
        this.isExercising = false;
        this.exerciseTimer = 0;
        
        // Init Muscle
        this.updateMuscleCapacity();
    }

    updateMuscleCapacity() {
        const scale = parseFloat(this.muscleSlider.value);
        // Base max is 2000
        this.maxMuscleGlycogen = 2000 * scale;
        
        // Visual Scale of the muscle card (Icon mainly)
        // We utilize a CSS var or direct style
        const icon = this.organs.muscle.querySelector('.icon');
        icon.style.transform = `scale(${0.8 + (scale * 0.2)})`; // Mild scaling
        
        // Update text readout if we had one for Max, but we only show current.
        // The storage container logic handles dots.
    }

    start() {
        requestAnimationFrame((t) => this.loop(t));
    }

    loop(timestamp) {
        this.lastTime = timestamp;

        this.updateState();
        this.updateUI();
        this.particleManager.update(this.glucose, this.glycerol);
        
        requestAnimationFrame((t) => this.loop(t));
    }

    updateState() {
        // Validation/Recovery
        if (isNaN(this.glucose)) this.glucose = 100;

        // 0. Auto Regulation
        if (this.toggleAuto.checked) {
            this.runHomeostasis();
        }

        // 1. Hormone Decay
        this.insulin = Math.max(0, this.insulin - this.insulinDecay);
        this.glucagon = Math.max(0, this.glucagon - this.glucagonDecay);

        // 2. Basal Metabolism
        // Brain
        if (this.glucose > 10) {
            this.glucose -= this.basalConsumption;
            this.activateOrgan('brain', 'consume');
        }
        // Other Organs
        if (this.glucose > 10) {
            this.glucose -= this.otherConsumption;
            this.activateOrgan('other', 'consume');
        }

        // Muscle Basal Metabolism
        // Muscles slowly burn glycogen to maintain tone, scaled by mass
        if (this.muscleGlycogen > 0) {
            const muscleMass = parseFloat(this.muscleSlider.value);
            const muscleBasal = 0.02 * muscleMass; 
            this.muscleGlycogen = Math.max(0, this.muscleGlycogen - muscleBasal);
        }

        // Exercise Effect
        if (this.exerciseTimer > 0) {
            this.exerciseTimer--;
            // Burn Logic
            // First burn Muscle Glycogen
            if (this.muscleGlycogen > 0) {
                this.muscleGlycogen -= 1;
                this.visMuscle.classList.add('flash-burn'); 
            }
            // Also burn glucose
            this.glucose -= 0.5;
            this.activateOrgan('muscle', 'consume');
        }

        // 3. Insulin Effects (Uptake)
        if (this.insulin > 0.1) {
            // Muscle Mass increases Insulin Sensitivity (Glucose Sink)
            const muscleMass = parseFloat(this.muscleSlider.value); // 1.0 to 3.0
            // Base efficiency + Bonus from muscle
            const uptakeSensitivity = 0.05 + (0.05 * muscleMass); 
            
            const uptakeRate = this.insulin * uptakeSensitivity;
            
            if (this.glucose > this.minGlucose) {
                this.glucose -= uptakeRate;
                
                // 1. Muscle Glycogen 
                if (this.muscleGlycogen < this.maxMuscleGlycogen) {
                    this.muscleGlycogen += uptakeRate * 0.6; // Muscle takes majority
                    this.activateOrgan('muscle', 'uptake');
                }

                // 2. Liver Stores
                if (this.liverGlycogen < this.maxLiverGlycogen) {
                     this.liverGlycogen += uptakeRate; 
                     this.activateOrgan('liver', 'uptake');
                } else {
                    // 3. Overflow to Fat
                    this.fatStorage += uptakeRate * 2;
                    this.activateOrgan('fat', 'uptake');
                }
            }
        } 
        
        // 4. Glucagon Effects (Release)
        // Insulin inhibits Glucagon
        if (this.glucagon > 0.1 && this.insulin < 2.0) { 
            // 1. Liver Glycogenolysis (Fast, Primary)
            if (this.liverGlycogen > 0) {
                const releaseRate = this.glucagon * 0.1;
                this.liverGlycogen -= releaseRate * 2;
                this.glucose += releaseRate;
                this.activateOrgan('liver', 'release');
            }
            
            // 2. Fat Lipolysis (Secondary, Slower)
            // Glucagon -> Stimulates Fat to release Glycerol
            if (this.fatStorage > 0) {
                 const lipolysisRate = this.glucagon * 0.05; 
                 // Fix: Ensure we don't go below zero
                 const actualRelease = Math.min(this.fatStorage, lipolysisRate * 2);
                 this.fatStorage -= actualRelease;
                 
                 // Add Glycerol (Prop to release)
                 this.glycerol += actualRelease * 0.5; 
                 this.activateOrgan('fat', 'release');
            }
        }

        // 5. Gluconeogenesis (Liver converts Glycerol -> Glucose)
        // Happens if Glycerol is present
        if (this.glycerol > 0) {
            const conversionRate = 0.1; // Speed of liver processing
            const amount = Math.min(this.glycerol, conversionRate);
            this.glycerol -= amount;
            this.glucose += amount;
            this.activateOrgan('liver', 'gluconeogenesis');
        }

        // 6. Extreme Starvation (Muscle Breakdown / Proteolysis)
        // If Glucose is Critical (< 40) AND Liver is empty
        if (this.glucose < 40 && this.liverGlycogen < 10) {
            // Body breaks down muscle protein/glycogen for emergency glucose
            if (this.muscleGlycogen > 0) {
                const breakdownRate = 0.2;
                this.muscleGlycogen = Math.max(0, this.muscleGlycogen - breakdownRate * 5); // Expensive trade
                this.glucose += breakdownRate; // Slight boost
                this.activateOrgan('muscle', 'release'); // Visual: Vein output
            }
        }

        // 7. Adrenaline Effects (Fight or Flight)
        // Decays over time
        this.adrenaline = Math.max(0, this.adrenaline - 0.03); 
        
        if (this.adrenaline > 0.1) {
             // 1. Muscle Glycogen Breakdown (Unique to Adrenaline)
             // Muscle doesn't release glucose to blood, but burns it internally or releases lactate (abstracted)
             // Let's say it makes glucose available for the "Burn" (Exercise) or just depletes store?
             // If we want it to raise blood glucose, biologically Adrenaline -> Liver Glycogenolysis.
             // Adrenaline -> Muscle Glycogenolysis -> Lactate -> Liver -> Glucose (Cori Cycle).
             // Let's simplify: Adrenaline boosts Liver Output & Fat Output strongly.
             
             // Boost Liver Release (on top of Glucagon)
             if (this.liverGlycogen > 0) {
                 const boost = this.adrenaline * 0.15;
                 this.liverGlycogen -= boost * 2;
                 this.glucose += boost;
                 this.activateOrgan('liver', 'release');
             }
             
             // Boost Fat Release
             if (this.fatStorage > 0) {
                 const fatBoost = this.adrenaline * 0.1;
                 const release = Math.min(this.fatStorage, fatBoost * 2);
                 this.fatStorage -= release;
                 this.glycerol += release * 0.5;
                 this.activateOrgan('fat', 'release');
             }
        }
        
        // Clamp
        this.glucose = Math.max(0, this.glucose);
        this.liverGlycogen = Math.max(0, this.liverGlycogen);
        this.muscleGlycogen = Math.max(0, this.muscleGlycogen);
    }

    runHomeostasis() {
        const target = 100;
        const currentGlucose = this.glucose;
        const delta = currentGlucose - this.lastGlucose; // Rate of change
        this.lastGlucose = currentGlucose;

        // PID Constants
        const Kp = 0.005; 
        const Kd = 0.1;   

        // If high, secrete insulin
        if (this.glucose > this.insulinThreshold) {
            const error = this.glucose - this.insulinThreshold;
            
            // PD Control
            let secretion = (error * Kp) + (delta * Kd);
            secretion = Math.max(0, secretion);

            this.insulin += secretion; 
            this.insulin = Math.min(10, this.insulin); 
        }
        // If low, secrete glucagon
        else if (this.glucose < this.glucagonThreshold) {
            const error = this.glucagonThreshold - this.glucose;
            
            let secretion = (error * Kp) - (delta * Kd);
            
            secretion = Math.max(0, secretion);
            this.glucagon += secretion;
            this.glucagon = Math.min(10, this.glucagon);
        }
    }

    eatMeal() {
        this.glucose += 30; 
        this.activateOrgan('intestine', 'active');
        // Glucose enters via Intestine VEIN (Organ -> Hub)
        // Vein path is defined as Organ -> Hub, so we use 'forward'
        this.particleManager.spawnTransit('path-intestine-vein', 'forward', 20, (count) => {
            this.glucose += count * 2; 
        });
    }

    startExercise() {
        this.exerciseTimer = 100; 
        this.adrenaline = Math.min(10, this.adrenaline + 8); // Spike Adrenaline
    }

    injectInsulin() {
        this.insulin = Math.min(10, this.insulin + 3);
    }

    injectGlucagon() {
        this.glucagon = Math.min(10, this.glucagon + 3);
    }

    activateOrgan(name, type) {
        const organ = this.organs[name];
        if (!organ) return;
        
        // Remove conflicting
        if (type === 'uptake') organ.classList.remove('active-release');
        if (type === 'release') organ.classList.remove('active-uptake');

        organ.classList.add('active-' + (type === 'gluconeogenesis' ? 'release' : type)); 
        
        const pathArtery = 'path-' + name;
        const pathVein = 'path-' + name + '-vein';
        
        if (type === 'uptake' || type === 'consume' || type === 'active') { // 'active' for intestine usually means functioning
            // Uptake/Consume: Hub -> Organ via Artery
            // Intestine 'active' during eating is special (see eatMeal), but basic 'uptake' might happen? 
            // Actually intestine absorbs, doesn't uptake glucose from blood for storage usually.
            // But we have basal consumption.
            
            // For general 'uptake' (Storage) or 'consume' (Basal/Exercise):
            // Spawn on ARTERY (Hub -> Organ)
            if (Math.random() < 0.2) {
                this.particleManager.spawnTransit(pathArtery, 'forward', 1, null, 'glucose-particle');
            }
        } 
        else if (type === 'release') {
            // General Release (Liver Glycogen) - EXCLUDE FAT (it does lipolysis)
            if (name !== 'fat' && Math.random() < 0.2) {
                // Release: Organ -> Hub via VEIN
                // Vein defined as Organ -> Hub ('forward')
                this.particleManager.spawnTransit(pathVein, 'forward', 1, null, 'glucose-particle');
            }
        } 
        
        // Custom Types
        if (name === 'fat' && type === 'release') {
             // FAT RELEASE (Lipolysis) -> Glycerol (Yellow) VIA VEIN
             if (Math.random() < 0.2) {
                 this.particleManager.spawnTransit(pathVein, 'forward', 1, null, 'glycerol-particle');
             }
        }
        else if (type === 'gluconeogenesis') {
             // 1. Glycerol Uptake (Hub -> Liver Artery) - Yellow
             if (Math.random() < 0.3) {
                 this.particleManager.spawnTransit(pathArtery, 'forward', 1, null, 'glycerol-particle');
             }
             // 2. Glucose Release (Liver Vein -> Hub) - White
             if (Math.random() < 0.3) {
                 this.particleManager.spawnTransit(pathVein, 'forward', 1, null, 'glucose-particle');
             }
        }
        
        // Cleanup class
        setTimeout(() => {
             organ.classList.remove('active-' + (type === 'gluconeogenesis' ? 'release' : type));
        }, 500);
    }

    updateUI() {
        this.uiGlucose.textContent = Math.floor(this.glucose);
        this.uiInsulinBar.style.width = (this.insulin * 10) + '%';
        this.uiGlucagonBar.style.width = (this.glucagon * 10) + '%';
        this.uiAdrenalineBar.style.width = (this.adrenaline * 10) + '%';
        this.uiLiverGlycogen.textContent = Math.floor(this.liverGlycogen);
        this.uiMuscleGlycogen.textContent = Math.floor(this.muscleGlycogen);
        this.uiFatStorage.textContent = Math.floor(this.fatStorage);
        
        // Color coding
        if (this.glucose > 180) this.uiGlucose.style.color = '#e74c3c';
        else if (this.glucose < 70) this.uiGlucose.style.color = '#3498db';
        else this.uiGlucose.style.color = '#27ae60';
        
        // Render Storage
        this.renderStorage(this.visLiver, this.liverGlycogen, 50, '#d35400');
        this.renderStorage(this.visFat, this.fatStorage, 100, '#f1c40f');
        this.renderStorage(this.visMuscle, this.muscleGlycogen, 100, '#c0392b');
    }
    
    renderStorage(container, amount, scale, color) {
        // scale: 1 dot per X units
        const count = Math.min(50, Math.floor(amount / scale));
        // Simple diff check to avoid thrashing layout?
        if (container.childElementCount !== count) {
            container.innerHTML = '';
            for(let i=0; i<count; i++) {
                const dot = document.createElement('div');
                dot.className = 'storage-unit';
                dot.style.backgroundColor = color;
                container.appendChild(dot);
            }
        }
    }
}

class ParticleManager {
    constructor(svg) {
        this.svg = svg;
        this.particles = [];
        this.glycerolParticles = []; // New separate array for main loop glycerol
        this.transitParticles = [];
        this.path = document.getElementById('main-loop');
        this.pathLength = this.path ? this.path.getTotalLength() : 1000;
    }

    update(glucoseLevel, glycerolLevel = 0) {
        this.updateMainLoop(glucoseLevel, this.particles, 'glucose-particle', 5);
        this.updateMainLoop(glycerolLevel, this.glycerolParticles, 'glycerol-particle', 0.5); // Sensitive scale for trace amounts
        this.updateParticles(); 
    }

    updateMainLoop(level, array, className, scale) {
        // Target based on level (Scale divisor can be tweaked)
        const targetCount = Math.floor(level / scale);
        
        // Smooth adjustment: only 1 per frame
        if (array.length < targetCount) {
            this.createMainLoopParticle(array, className);
        } 
        else if (array.length > targetCount) {
            this.removeMainLoopParticle(array);
        }
    }
    
    updateParticles() {
        // Main loop particle movement (Glucose)
        this.moveLoopParticles(this.particles);
        // Main loop particle movement (Glycerol)
        this.moveLoopParticles(this.glycerolParticles);

        // Transit Particles Only
        for (let i = this.transitParticles.length - 1; i >= 0; i--) {
            const p = this.transitParticles[i];
            p.progress += p.speed;

            // Use p.pathLength
            if (p.progress >= p.pathLength) { 
                // Arrived
                p.active = false;
                p.element.remove();
                this.transitParticles.splice(i, 1);
                
                // Trigger callback if exists
                if (p.onArrive) p.onArrive();

            } else {
                // Calculate position
                // Logic to handle reverse flow
                // direction is 'forward' or 'reverse'
                const isReverse = p.direction === 'reverse';
                let currentDist = isReverse ? (p.pathLength - p.progress) : p.progress;
                
                // Safety check
                if (!isFinite(currentDist)) currentDist = 0;
                
                // Ensure bounds
                const safeDist = Math.max(0, Math.min(p.pathLength, currentDist));
                
                const point = p.pathElement.getPointAtLength(safeDist);
                
                p.element.setAttribute("cx", point.x);
                p.element.setAttribute("cy", point.y);
            }
        }
    }

    moveLoopParticles(array) {
         for (let i = array.length - 1; i >= 0; i--) {
            const p = array[i];
            p.distance += p.speed;
            if (p.distance > this.pathLength) {
                p.distance = 0; // Loop back
            }
            const point = this.path.getPointAtLength(p.distance);
            p.element.setAttribute("cx", point.x);
            p.element.setAttribute("cy", point.y);
        }
    }

    createMainLoopParticle(array, className) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute('r', 4);
        circle.setAttribute('class', className);
        const dist = Math.random() * this.pathLength;
        const point = this.path.getPointAtLength(dist);
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        this.svg.appendChild(circle);
        array.push({ element: circle, distance: dist, speed: 1 + Math.random() });
    }

    removeMainLoopParticle(array) {
        const p = array.pop();
        if (p) this.svg.removeChild(p.element);
    }

    spawnTransit(pathId, direction, count, onComplete, className = 'glucose-particle') {
        const pathElement = document.getElementById(pathId);
        if (!pathElement) return;

        const len = pathElement.getTotalLength();

        for (let i = 0; i < count; i++) {
            // Stagger
            setTimeout(() => {
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute('r', 4);
                circle.setAttribute('class', className);
                
                // Start position depends on direction
                // If forward: start at 0. If reverse: start at len.
                // But we track 'progress' as distance travelled from start (0..len).
                // So initial visual pos is handled in update loop first frame, or set here.
                // Let's set initial here to avoid flash.
                
                const startDist = direction === 'forward' ? 0 : len;
                const point = pathElement.getPointAtLength(startDist);
                circle.setAttribute('cx', point.x);
                circle.setAttribute('cy', point.y);
                
                this.svg.appendChild(circle);
                
                this.transitParticles.push({
                    element: circle,
                    pathElement: pathElement,
                    pathLength: len, 
                    direction: direction,
                    progress: 0, 
                    speed: 3 + Math.random() * 2,
                    // Fix: Call onComplete for EVERY particle, passing 1 (unit count)
                    // This ensures gradual consistent increase
                    onArrive: onComplete ? () => onComplete(1) : null
                });
            }, i * 50);
        }
    }
}
