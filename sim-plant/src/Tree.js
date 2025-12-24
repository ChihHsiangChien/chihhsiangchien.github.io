export class Node {
    constructor(parent = null) {
        this.parent = parent;
        this.children = [];
        this.type = 'branch'; // branch, leaf, flower, fruit
        this.length = 50;
        this.width = 10;
        this.angle = 0; 
        this.age = 0;
        
        // New Attributes
        this.nectar = 0; // 0-10
        this.defense = 0; // 0-10 (Metabolites)
        this.lifespan = 30; // Terms of days/turns. Leaves die after this.
    }
}

export class Tree {
    constructor() {
        this.root = new Node();
        this.root.angle = -90; 
        this.root.type = 'root';
        this.root.length = 80;
        this.root.width = 20; 
    }

    ageNodes() {
        let dropped = 0;
        this.traverse(this.root, (node) => {
             node.age += 1;
             
             // Leaf Lifespan
             if (node.type === 'leaf' && node.age > node.lifespan) {
                 this.dropNode(node);
                 dropped++;
             }
             
             // Fruit Drop (Age logic is now turns)
             if (node.type === 'fruit' && node.age > 10) {
                 this.dropNode(node);
             }
        });
        return { droppedLeaves: dropped };
    }

    distributeResource(type, amount) {
        // Distribute 'nectar' or 'defense' to appropriate nodes
        // Strategy: Distribute to those who need it? Or random?
        // User asked: "Metabolites affect leaf color" 
        // Let's distribute evenly or randomly.
        
        let targets = [];
        if (type === 'nectar') {
            this.traverse(this.root, n => { if (n.type === 'flower') targets.push(n); });
        } else if (type === 'defense') {
            this.traverse(this.root, n => { if (n.type === 'leaf') targets.push(n); });
        }
        
        if (targets.length === 0) return;
        
        // Simple distribution: Amount is total "units" to add
        for (let i = 0; i < amount; i++) {
             const target = targets[Math.floor(Math.random() * targets.length)];
             if (type === 'nectar') target.nectar = Math.min(10, target.nectar + 1);
             if (type === 'defense') target.defense = Math.min(10, target.defense + 1);
        }
    }


    dropNode(node) {
        if (node.parent) {
            node.parent.children = node.parent.children.filter(c => c !== node);
            node.parent = null;
            return true;
        }
        return false;
    }

    getLeafArea() {
        let count = 0;
        this.traverse(this.root, (node) => {
            if (node.type === 'leaf') count++;
        });
        return count * 10; // 10 units per leaf
    }

    getBiomass() {
        let mass = 0;
        this.traverse(this.root, (node) => {
            mass += node.width * node.length * 0.01;
        });
        return mass;
    }

    traverse(node, callback) {
        callback(node);
        // Create a copy of children to iterate in case callback modifies children
        [...node.children].forEach(child => this.traverse(child, callback));
    }
    
    // --- Growth Actions ---

    // --- Growth Actions ---

    growTall() {
        // Strategy: Increase height (length) of the main trunk and primary branches
        // This simulates reaching for light.
        // Recursive extension
        this.traverse(this.root, (node) => {
             if (node.type === 'root') {
                 node.length += 5;
             } else if (node.type === 'branch') {
                 // Branches grow slightly in length too
                 node.length += 2;
             }
        });
    }

    growThick() {
        // Strategy: Increase width (girth)
        // Constraints: Child cannot be thicker than parent? Or just general thickening.
        // Let's thicken root primarily, and trickle down capacity.
        
        // 1. Thicken Root
        this.root.width += 2;

        // 2. Thicken children, but enforce hierarchy
        this.traverse(this.root, (node) => {
            if (node.children) {
                 node.children.forEach(child => {
                     if (child.type === 'branch') {
                         // Child width target is a portion of parent
                         // If parent got thicker, child CAN get thicker
                         // But we also want to manually spend to thicken?
                         // For now, let's say "Grow Thick" action stimulates a wave of thickening
                         // that is constrained by parent width.
                         
                         const maxAllowed = node.width * 0.9; // Child max 90% of parent
                         if (child.width < maxAllowed) {
                             child.width += 1; // Grow a bit
                         }
                     }
                 });
            }
        });
    }

    addBranch() {
        // Find ANY branch or root
        let candidates = [];
        this.traverse(this.root, (node) => {
            if (node.type === 'branch' || node.type === 'root') {
                // STRUCTURAL CONSTRAINT: Width determines branching capacity
                // Example: Capacity = floor(width / 5)
                const capacity = Math.floor(node.width / 5);
                const currentBranches = node.children.filter(c => c.type === 'branch').length;
                
                if (currentBranches < capacity) {
                    candidates.push(node);
                }
            }
        });
        
        if (candidates.length > 0) {
            const parent = candidates[Math.floor(Math.random() * candidates.length)];
            const child = new Node(parent);
            
            // Initial size based on parent
            child.width = Math.max(2, parent.width * 0.4); 
            child.length = parent.length * 0.6;
            
            const siblings = parent.children.filter(c => c.type === 'branch').length;
            
            if (siblings === 0) {
                child.angle = (Math.random() > 0.5 ? 20 : -20) + (Math.random() * 10 - 5);
            } else {
                child.angle = (Math.random() * 100 - 50); 
            }
            
            child.length = Math.max(10, child.length); 
            child.width = Math.min(child.width, parent.width * 0.9); // Enforce immediate constraint
            
            parent.children.push(child);
            return true;
        }
        return false;
    }

    addLeaves() {
        // Add leaves to ANY branch that has space
        let candidates = [];
        this.traverse(this.root, (node) => {
            if (node.type === 'branch' || node.type === 'root') {
                 // Counts leaves on this specific node
                 const leafCount = node.children.filter(c => c.type === 'leaf').length;
                 const capacity = Math.ceil(node.length / 10);
                 if (leafCount < capacity) { 
                     candidates.push(node);
                 }
            }
        });

        if (candidates.length > 0) {
             // Add a leaf
             const target = candidates[Math.floor(Math.random() * candidates.length)];
             const leaf = new Node(target);
             leaf.type = 'leaf';
             leaf.length = 15;
             leaf.width = 15;
             
             // Random angle relative to branch
             leaf.angle = Math.random() * 120 - 60; 
             
             target.children.push(leaf);
             return true;
        }
        return false;
    }

    addFlower() {
        // Flowers grow on tips or near leaves
        let candidates = [];
        this.traverse(this.root, (node) => {
            if (node.type === 'branch') {
                const flowers = node.children.filter(c => c.type === 'flower' || c.type === 'fruit').length;
                if (flowers < 2) candidates.push(node);
            }
        });

        if (candidates.length > 0) {
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            const flower = new Node(target);
            flower.type = 'flower';
            flower.length = 10;
            flower.width = 10;
            flower.angle = Math.random() * 90 - 45;
            target.children.push(flower);
            return true;
        }
        return false;
    }

    getFlowerCount() {
        let count = 0;
        this.traverse(this.root, (node) => {
            if (node.type === 'flower') count++;
        });
        return count;
    }

    pollinateFlowers(availableNectar) {
        let nectarConsumed = 0;
        this.traverse(this.root, (node) => {
            // Can satisfy multiple flowers if nectar is sufficient
            if (node.type === 'flower') {
                if (availableNectar >= 5) {
                     // 30% chance per visit per flower? Or guaranteed if paid?
                     // Let's make it chance biased, but cost is paid on success?
                     // Or cost paid on visit regardless?
                     // User said: "Pollinator visitation... consumes nectar"
                     
                     if (Math.random() > 0.3) {
                        node.type = 'fruit';
                        node.width = 15; 
                        node.age = 0; 
                        
                        availableNectar -= 5;
                        nectarConsumed += 5;
                     }
                }
            }
        });
        return nectarConsumed;
    }

    removeRandomLeaves(count) {
        let leaves = [];
        this.traverse(this.root, (node) => {
            if (node.type === 'leaf') leaves.push(node);
        });

        let removed = 0;
        for (let i = 0; i < count; i++) {
            if (leaves.length === 0) break;
            const index = Math.floor(Math.random() * leaves.length);
            const leaf = leaves.splice(index, 1)[0];
            this.dropNode(leaf);
            removed++;
        }
        return removed;
    }

    removeRandomFruits(count) {
        let fruits = [];
        this.traverse(this.root, (node) => {
            if (node.type === 'fruit') fruits.push(node);
        });

        let removed = 0;
        for (let i = 0; i < count; i++) {
            if (fruits.length === 0) break;
            const index = Math.floor(Math.random() * fruits.length);
            const fruit = fruits.splice(index, 1)[0];
            this.dropNode(fruit);
            removed++;
        }
        return removed;
    }

    // Fungus now reduces thickness
    attackThickness(severity) {
        let victimNodes = [];
        this.traverse(this.root, (node) => {
            if (node.type === 'branch' || node.type === 'root') victimNodes.push(node);
        });

        // Pick random nodes to damage
        // Severity = number of damage events
        let dropped = 0;
        for(let i=0; i<severity; i++) {
             if (victimNodes.length === 0) break;
             const target = victimNodes[Math.floor(Math.random() * victimNodes.length)];
             
             // Reduce width
             target.width -= (1 + Math.random());
             
             // Check structural failure
             if (target.width <= 1) { // Threshold for breaking
                  if (target.type === 'root') {
                      target.width = 1; // Root shouldn't die completely easily? Or Game Over?
                  } else {
                      this.dropNode(target);
                      dropped++;
                      // Re-filtering victimNodes would be safer but expensive.
                      // Just mark it locally?
                  }
             }
        }
        return dropped;
    }
}
