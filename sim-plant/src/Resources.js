export class Resources {
    constructor() {
        this.storage = {
            glucose: 50,  // Staring energy
            water: 100,
            nectar: 0,
            defenseMeta: 0,
            defenseAnti: 0,
            offspring: 0
        };
        
        this.rates = {
            photosynthesis: 0.01, // per leaf area per ms
            metabolism: 0.002 // base burn rate
        };
    }

    spend(type, amount) {
        if (this.storage[type] >= amount) {
            this.storage[type] -= amount;
            return true;
        }
        console.log("Not enough " + type);
        return false;
    }

    addOffspring(count) {
        this.storage.offspring += count;
    }

    simulateDay(tree) {
        // 1. Photosynthesis (16 hours = 1000ms * 16 units effectively)
        // Previous dt/16 scale was for 60fps real-time. 
        // Let's normalize: 
        // Production = LeafArea * rate * time_units
        // Metabolism = Biomass * rate * time_units (24h)
        
        const dayTime = 1000; // arbitrary units
        const nightTime = 500;
        
        // Efficiency bonus from Height
        const heightBonus = (tree.root.length / 100); 
        const production = tree.getLeafArea() * this.rates.photosynthesis * dayTime * (1 + heightBonus * 0.2);
        
        // Metabolism (Day + Night)
        const biomass = tree.getBiomass();
        const consumption = biomass * this.rates.metabolism * (dayTime + nightTime);
        
        this.storage.glucose += production;
        this.storage.glucose -= consumption;
        
        // Starvation bounds
        if (this.storage.glucose < 0) this.storage.glucose = 0;

        return {
            produced: production,
            consumed: consumption
        };
    }

    updateUI() {
        document.getElementById('res-glucose').innerText = Math.floor(this.storage.glucose);
        // Starch removed
        
        // If we add Nectar to UI:
        const nectarEl = document.getElementById('res-nectar');
        if (nectarEl) nectarEl.innerText = Math.floor(this.storage.nectar);
        
        const metaEl = document.getElementById('res-meta');
        if (metaEl) metaEl.innerText = Math.floor(this.storage.defenseMeta);
        
        const antiEl = document.getElementById('res-anti');
        if (antiEl) antiEl.innerText = Math.floor(this.storage.defenseAnti);

        const offspringEl = document.getElementById('res-offspring');
        if (offspringEl) offspringEl.innerText = Math.floor(this.storage.offspring);
    }
}
