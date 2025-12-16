import { Tree } from './Tree.js';
import { Renderer } from './Renderer.js';
import { Resources } from './Resources.js';
import { Events } from './Events.js';

export class Game {
    constructor() {
        this.gameSpeed = 1.0;
        this.day = 1;
        this.isDaytime = true; 

        // Subsystems
        this.resources = new Resources();
        this.tree = new Tree();
        this.renderer = new Renderer(this.tree);
        this.events = new Events(this);
        
        // Bind UI Actions
        this.bindControls();
        
        console.log("Game Initialized");
    }

    bindControls() {
        document.getElementById('btn-grow-tall').addEventListener('click', () => {
             const cost = this.getGrowTallCost();
             if (this.resources.spend('glucose', cost)) {
                 this.tree.growTall();
                 this.advanceTime(2); // Heavy action takes 2 days
                 this.draw();
             }
        });

        document.getElementById('btn-grow-thick').addEventListener('click', () => {
             const cost = this.getGrowThickCost();
             if (this.resources.spend('glucose', cost)) {
                 this.tree.growThick();
                 this.advanceTime(2); // Heavy action takes 2 days
                 this.draw();
             }
        });
        
        // ... (Other bindings unchanged, assumed)
        
        document.getElementById('btn-grow-branch').addEventListener('click', (e) => {
             // Moderate: Adds potential leaf spots
             // Shift-Click OR Toggle: Grow 5x
             const isBulk = e.shiftKey || document.getElementById('toggle-bulk').checked;
             const count = isBulk ? 5 : 1;
             
             for(let i=0; i<count; i++) {
                 if (this.resources.spend('glucose', 30)) {
                     if (!this.tree.addBranch()) {
                         this.resources.storage.glucose += 30; // Refund
                         // If explicit single click, notify user
                         if (count === 1) this.events.log("無法生長：沒有足夠的空間長出新枝條。", "warning");
                         break; // Stop trying
                     } else {
                         this.advanceTime(2); // 2 days per branch
                     }
                 } else {
                     break;
                 }
             }
             this.draw();
        });
        
        document.getElementById('btn-grow-leaf').addEventListener('click', (e) => {
             // Cheap: The primary income source
             // Shift-Click OR Toggle: Grow 5x
             const isBulk = e.shiftKey || document.getElementById('toggle-bulk').checked;
             const count = isBulk ? 5 : 1;

             for(let i=0; i<count; i++) {
                 if (this.resources.spend('glucose', 10)) {
                     if (!this.tree.addLeaves()) {
                         this.resources.storage.glucose += 10; // Refund
                         if (count === 1) this.events.log("無法生長：枝條上沒有空間長葉子了。", "warning");
                         break;
                     } else {
                         this.advanceTime(1); // 1 day per leaf
                     }
                 } else {
                     break; 
                 }
             }
             this.draw();
        });

        document.getElementById('btn-flower').addEventListener('click', (e) => {
             // Luxury: Reproduction
             // Shift-Click OR Toggle: 5x
             const isBulk = e.shiftKey || document.getElementById('toggle-bulk').checked;
             const count = isBulk ? 5 : 1;
             
             for(let i=0; i<count; i++) {
                 if (this.resources.spend('glucose', 40)) {
                    if (!this.tree.addFlower()) {
                        this.resources.storage.glucose += 40; // Refund
                        if (count === 1) this.events.log("無法生長：沒有空間開花了。", "warning");
                        break;
                    } else {
                        this.advanceTime(2); // 2 days per flower (complex structure)
                    }
                 } else {
                    break;
                 }
             }
             this.draw();
        });
        
        document.getElementById('btn-nectar').addEventListener('click', () => {
             if (this.resources.spend('glucose', 15)) {
                 this.tree.distributeResource('nectar', 5);
                 this.resources.storage.nectar += 5; 
                 this.events.log("已為花朵添加花蜜。", "good");
                 this.advanceTime(1); // 1 day
                 this.draw();
             }
        });

        document.getElementById('btn-defend-meta').addEventListener('click', () => {
             if (this.resources.spend('glucose', 20)) {
                 this.tree.distributeResource('defense', 5);
                 this.resources.storage.defenseMeta += 5;
                 this.events.log("已合成防禦代謝物並強化葉片。", "good");
                 this.advanceTime(1); // 1 day
                 this.draw();
             }
        });

        document.getElementById('btn-defend-anti').addEventListener('click', () => {
             if (this.resources.spend('glucose', 20)) {
                 this.resources.storage.defenseAnti += 1; 
                 this.events.log("已合成抗菌物質。", "good");
                 this.advanceTime(1); // 1 day
                 this.draw(); // Make sure to update UI
             }
        });

        // Next Turn Button removed
    }

    advanceTime(days) {
        for(let i=0; i<days; i++) {
            this.nextTurn();
        }
    }
    
    // Dynamic Costs
    // Dynamic Costs
    getGrowTallCost() {
        // Base 40 + Biomass scaling
        // Biomass roughly starts at 16 (80*20*0.01). 
        // 40 + 16*0.5 = 48. Reasonable start.
        return Math.floor(40 + this.tree.getBiomass() * 0.5);
    }

    getGrowThickCost() {
        // Base 50 + Biomass scaling
        return Math.floor(50 + this.tree.getBiomass() * 0.5);
    }
    
    updateButtonCosts() {
        document.getElementById('btn-grow-tall').innerText = `長高 (${this.getGrowTallCost()})`;
        document.getElementById('btn-grow-thick').innerText = `長粗 (${this.getGrowThickCost()})`;
    }

    nextTurn() {
        this.day++;
        this.events.log(`--- 第 ${this.day} 天 ---`, "neutral");
        document.getElementById('day-counter').innerText = `第 ${this.day} 天`;

        // 1. Photosynthesis & Metabolism
        const report = this.resources.simulateDay(this.tree);
        this.events.log(`光合作用 +${Math.floor(report.produced)} | 基礎代謝 -${Math.floor(report.consumed)}`, "neutral");

        // 2. Tree Aging & Dropping
        const ageResult = this.tree.ageNodes();
        if (ageResult.droppedLeaves > 0) {
            this.events.log(`${ageResult.droppedLeaves} 片葉子壽終正寢。`, "neutral");
        }
        
        // 3. Events (Storms, Pests)
        this.events.triggerTurnEvents();
        
        // Redraw
        this.draw();
    }

    draw() {
        this.renderer.render();
        this.resources.updateUI();
        this.updateButtonCosts();
    }
}
