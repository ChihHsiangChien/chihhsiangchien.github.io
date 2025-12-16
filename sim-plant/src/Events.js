export class Events {
    constructor(game) {
        this.game = game;
        this.eventTimer = 0;
        this.eventInterval = 20000; // Check for event every 20s
    }

    update(dt) {
        // Deprecated in turn-based, but kept empty implementation if needed
    }

    triggerTurnEvents() {
        // 1. Storm (Every 5 turns)
        if (this.game.day % 5 === 0) {
            this.triggerStorm();
        }

        // 2. Herbivore (Random Chance)
        if (Math.random() < 0.3) {
            this.triggerHerbivore();
        }
        
        if (Math.random() < 0.1) {
             this.triggerFungus();
        }

        // --- Positive Events ---
        // 4. Sunny Day (30%)
        if (Math.random() < 0.3) this.triggerSunnyDay();

        // 5. Nutrient Rain (20%)
        if (Math.random() < 0.2) this.triggerNutrientRain();

        // 6. Beneficial Insects (10%)
        if (Math.random() < 0.1) this.triggerBeneficialInsects();
    }
    
    triggerSunnyDay() {
        this.log("陽光普照！光合作用效率大幅提升。", "good");
        // Bonus roughly equal to 2x normal production (5 per leaf vs ~2.25)
        const amount = Math.max(20, Math.floor(this.game.tree.getLeafArea() * 0.5));
        this.game.resources.storage.glucose += amount;
        this.log(`獲得額外 ${amount} 葡萄糖。`, "good");
    }

    triggerNutrientRain() {
        this.log("一場及時雨帶來了豐富的養分。", "good");
        // Base 30 + Root Width bonus (rewarding thick roots)
        const rootBonus = this.game.tree.root.width * 2; 
        const total = 30 + Math.floor(rootBonus);
        this.game.resources.storage.glucose += total;
        this.log(`根系吸收了 ${total} 葡萄糖。`, "good");
    }

    triggerBeneficialInsects() {
        this.log("益蟲遷徙經過，協助清除了害蟲。", "good");
        let count = 0;
        this.game.tree.traverse(this.game.tree.root, n => {
            if (n.type === 'leaf' && Math.random() < 0.5) { // 50% of leaves get boost
                n.defense = Math.min(10, n.defense + 2);
                count++;
            }
        });
        if (count > 0) this.log(`${count} 片葉子獲得了防禦提升。`, "good");
    }
    
    triggerStorm() {
        this.log("暴風雨來襲！強風正在摧毀脆弱的枝條...", "warning");
        // Visual Effect
        const tree = document.getElementById('tree-svg');
        tree.classList.add('effect-wind');
        setTimeout(() => tree.classList.remove('effect-wind'), 3000); 

        // Break thin branches/leaves
        let broken = 0;
        let victims = [];
        this.game.tree.traverse(this.game.tree.root, n => {
             // Leaf or Thin branch conditions
             // Increased threshold: width < 8 (was 5)
             // Increased chance: 0.4 (was 0.3)
             if (n.type === 'leaf' || (n.type === 'branch' && n.width < 8 && n !== this.game.tree.root)) {
                 if (Math.random() < 0.4) victims.push(n);
             }
        });
        
        victims.forEach(v => {
            if (this.game.tree.dropNode(v)) {
                 broken++;
            }
        });
        
        if (broken > 0) {
            this.log(`暴風雨吹斷了 ${broken} 個部分（枝條/葉片）！`, "bad");
        } else {
            this.log("樹木非常強壯，挺過了暴風雨！", "good");
        }
    }

    triggerHerbivore() {
        // Eat leaf with LOWEST defense
        let leaves = [];
        this.game.tree.traverse(this.game.tree.root, n => {
            if (n.type === 'leaf') leaves.push(n);
        });
        
        if (leaves.length === 0) return;
        
        // Sort by defense ascending (Logic: Lower defense comes first)
        leaves.sort((a,b) => a.defense - b.defense);
        
        // Eat the bottom ones (10% to 25%)
        // Random severity: 0.1 (mild) to 0.25 (severe)
        const severity = 0.1 + Math.random() * 0.15;
        const hungryCount = Math.max(1, Math.floor(leaves.length * severity)); 
        let eaten = 0;
        for(let i=0; i<hungryCount; i++) {
            if (i < leaves.length) {
                this.game.tree.dropNode(leaves[i]);
                eaten++;
            }
        }
        this.log(`草食動物吃掉了 ${eaten} 片防禦最弱的葉子！`, "bad");
    }

    triggerRandomEvent() {
        const roll = Math.random();
        
        if (roll < 0.3) {
            this.triggerPestAttack();
        } else if (roll < 0.5) {
            this.triggerStrongWind();
        } else if (roll < 0.7) {
            this.triggerFungus();
        } else {
             // Sunny/Good day message?
             this.log("一陣微風吹過。");
        }
    }

    triggerPestAttack() {
        this.log("警告：蚜蟲正在攻擊葉片！", "warning");
        const defense = this.game.resources.storage.defenseMeta;
        
        // If defense is high, damage is low
        const damageChance = Math.max(0.1, 1.0 - (defense * 0.1));
        
        if (Math.random() < damageChance) {
             const loss = this.game.tree.removeRandomLeaves(5); // Lose up to 5 leaves
             if (loss > 0) {
                 this.log(`因蟲害損失了 ${loss} 片葉子。`, "bad");
             } else {
                 this.log("葉片挺過了攻擊。", "good");
             }
        } else {
            this.log("代謝物擊退了害蟲！", "good");
        }
        
        // Consume defense
        this.game.resources.storage.defenseMeta = Math.max(0, this.game.resources.storage.defenseMeta - 2);
    }

    triggerStrongWind() {
        this.log("警告：強風來襲！", "warning");
        
        // Visual Effect
        const tree = document.getElementById('tree-svg');
        tree.classList.add('effect-wind');
        setTimeout(() => tree.classList.remove('effect-wind'), 3000); // Lasts 3s

        // Lose weak branches or fruit?
        const loss = this.game.tree.removeRandomFruits(2);
        if (loss > 0) {
            this.log(`強風吹落了 ${loss} 顆果實。`, "bad");
        }
    }

    triggerFungus() {
        this.log("警告：偵測到真菌孢子！", "warning");
        const defense = this.game.resources.storage.defenseAnti;
         
        // Defense reduces potential damage
        // Max damage chance 0.8, reduced by defense (e.g. 5 defense = 0.5 reduction)
        const damageChance = Math.max(0.1, 0.8 - (defense * 0.1));

        if (Math.random() < damageChance) {
             this.log("真菌腐蝕了枝幹！", "bad");
             // Reduce thickness logic
             const dropped = this.game.tree.attackThickness(1 + Math.floor(Math.random() * 2)); 
             if (dropped > 0) {
                 this.log(`因結構脆弱，損失了 ${dropped} 根枝條。`, "bad");
             }
        } else {
             this.log("抗菌物質成功抑制了真菌。", "good");
        }
        
        this.game.resources.storage.defenseAnti = Math.max(0, this.game.resources.storage.defenseAnti - 2);
    }

    log(message, type = "normal") {
        const area = document.getElementById('notification-area');
        const div = document.createElement('div');
        div.innerText = message;
        div.className = `notification ${type}`;
        area.prepend(div);
        
        // Fade out
        setTimeout(() => {
            div.style.opacity = 0;
            setTimeout(() => div.remove(), 1000);
        }, 4000);
    }
}
