class MitosisAnimation {
    constructor() {
        this.cell = document.getElementById('cell');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.isAnimating = false;
        this.currentPhase = 'interphase';
        
        this.startBtn.addEventListener('click', () => this.startMitosis());
        this.resetBtn.addEventListener('click', () => this.reset());
        
        // Initialize chromosomes
        this.createChromosomes();
        this.createSpindleFibers();
    }

    createChromosomes() {
        const chromosomesContainer = document.querySelector('.chromosomes');
        for (let i = 0; i < 8; i++) {
            const chromosome = document.createElement('div');
            chromosome.className = 'chromosome';
            chromosome.style.cssText = `
                position: absolute;
                width: 40px;
                height: 6px;
                background-color: #8b0000;
                border-radius: 3px;
                top: ${50 + Math.sin(i * Math.PI/4) * 30}%;
                left: ${50 + Math.cos(i * Math.PI/4) * 30}%;
                transform: rotate(${i * 45}deg);
                transition: all 0.5s ease;
            `;
            chromosomesContainer.appendChild(chromosome);
        }
    }

    createSpindleFibers() {
        const spindleContainer = document.querySelector('.spindle-fibers');
        for (let i = 0; i < 12; i++) {
            const fiber = document.createElement('div');
            fiber.className = 'fiber';
            fiber.style.cssText = `
                position: absolute;
                width: 100px;
                height: 1px;
                background-color: #666;
                top: 50%;
                left: 50%;
                transform-origin: center;
                transform: rotate(${i * 30}deg);
                opacity: 0;
                transition: all 0.5s ease;
            `;
            spindleContainer.appendChild(fiber);
        }
    }

    async startMitosis() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.startBtn.disabled = true;

        // Prophase
        await this.prophase();
        
        // Metaphase
        await this.metaphase();
        
        // Anaphase
        await this.anaphase();
        
        // Telophase
        await this.telophase();
        
        this.isAnimating = false;
        this.startBtn.disabled = false;
    }

    async prophase() {
        this.currentPhase = 'prophase';
        this.cell.classList.add('prophase');
        await this.wait(2000);
    }

    async metaphase() {
        this.currentPhase = 'metaphase';
        this.cell.classList.remove('prophase');
        this.cell.classList.add('metaphase');
        document.querySelector('.spindle-fibers').style.display = 'block';
        await this.wait(2000);
    }

    async anaphase() {
        this.currentPhase = 'anaphase';
        this.cell.classList.remove('metaphase');
        this.cell.classList.add('anaphase');
        await this.wait(2000);
    }

    async telophase() {
        this.currentPhase = 'telophase';
        this.cell.classList.remove('anaphase');
        this.cell.classList.add('telophase');
        await this.wait(2000);
    }

    reset() {
        this.cell.className = '';
        this.currentPhase = 'interphase';
        document.querySelector('.spindle-fibers').style.display = 'none';
        this.startBtn.disabled = false;
        this.isAnimating = false;
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the animation when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MitosisAnimation();
}); 