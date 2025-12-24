export class Renderer {
    constructor(tree) {
        this.tree = tree;
        this.svg = document.getElementById('tree-svg');
        this.width = this.svg.clientWidth || 800;
        this.height = this.svg.clientHeight || 600;
        
        // Initial setup
        this.render();
        
        // Handle resize
        window.addEventListener('resize', () => {
             this.width = this.svg.clientWidth;
             this.height = this.svg.clientHeight;
             this.render();
        });
    }

    render() {
        // Clear SVG
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }
        
        // Center bottom start
        const startX = this.width / 2;
        const startY = this.height; // Bottom
        
        this.drawNode(this.tree.root, startX, startY, 0);
    }

    drawNode(node, x, y, parentAngle) {
        // Calculate end point
        // Global angle = parentAngle + node.angle
        // NOTE: Standard math angle 0 is right. -90 is up.
        // But our node.angle is relative.
        
        // For the root, parentAngle is 0, but its own angle is -90.
        // For children, we sum up.
        
        const currentAngle = parentAngle + node.angle;
        const rad = currentAngle * (Math.PI / 180);
        
        const endX = x + Math.cos(rad) * node.length;
        const endY = y + Math.sin(rad) * node.length;
        
        // Create SVG Element
        if (node.type === 'leaf') {
             const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
             circle.setAttribute("cx", endX);
             circle.setAttribute("cy", endY);
             circle.setAttribute("r", node.width / 2);
             
             // Dynamic Leaf Color: Green gets darker with Defense (Metabolites)
             // Base: #4ade80 (rgb(74, 222, 128)) -> Darker: rgb(20, 100, 40)
             // Defense 0-10
             const sat = 70 + (node.defense * 2); // More saturated
             const light = 60 - (node.defense * 4); // Darker
             circle.setAttribute("fill", `hsl(142, ${sat}%, ${light}%)`);
             
             circle.setAttribute("opacity", "0.8");
             this.svg.appendChild(circle);
        } else if (node.type === 'flower') {
             const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
             circle.setAttribute("cx", endX);
             circle.setAttribute("cy", endY);
             circle.setAttribute("r", node.width / 2);
             
             // Dynamic Flower Color: Pink gets deeper with Nectar
             // Base: #fb7185 -> Deeper Red/Target
             const light = 70 - (node.nectar * 4); 
             circle.setAttribute("fill", `hsl(350, 90%, ${light}%)`);
             
             circle.setAttribute("stroke", "#fff");
             circle.setAttribute("stroke-width", "1");
             this.svg.appendChild(circle);
        } else if (node.type === 'fruit') {
             const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
             circle.setAttribute("cx", endX);
             circle.setAttribute("cy", endY);
             circle.setAttribute("r", node.width / 2);
             circle.setAttribute("fill", "#8b5cf6"); // Violet/Purple fruit
             circle.setAttribute("stroke", "#4c1d95");
             circle.setAttribute("stroke-width", "1");
             this.svg.appendChild(circle);
        } else {
             const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
             line.setAttribute("x1", x);
             line.setAttribute("y1", y);
             line.setAttribute("x2", endX);
             line.setAttribute("y2", endY);
             line.setAttribute("stroke", "#8D6E63"); // Wood color
             line.setAttribute("stroke-width", node.width);
             line.setAttribute("stroke-linecap", "round");
             this.svg.appendChild(line);
        }

        // Recursion
        node.children.forEach(child => {
            this.drawNode(child, endX, endY, currentAngle);
        });
    }
}
