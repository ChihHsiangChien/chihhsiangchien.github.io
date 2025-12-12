import * as THREE from 'three';

export class Enemy {
    constructor(scene, x, z, questionData) {
        this.scene = scene;
        this.position = new THREE.Vector3(x, 1.5, z); // Floating slightly? No, walk on ground. 1.5 is center height for 3m tall sprite?
        this.questionData = questionData; // { q, options, answerIndex }
        this.isDead = false;
        
        // Options setup
        this.options = questionData.options; // Array of 3 or 4 strings
        this.answerIndex = questionData.answerIndex;

        // Visuals
        this.mesh = this.createVisuals();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // Movement
        this.speed = 2.0;
        
        // Animation state
        this.wiggleTime = Math.random() * 100;
    }

    createVisuals() {
        // Create a canvas texture
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 512; // Tall sprite
        const ctx = canvas.getContext('2d');

        // Draw Monster
        this.drawMonster(ctx, canvas.width, canvas.height);

        // Draw Options
        this.drawOptions(ctx, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        // SpriteMaterial keeps it facing camera
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        
        sprite.scale.set(1.5, 3, 1); // 1.5m wide, 3m tall
        return sprite;
    }

    drawMonster(ctx, w, h) {
        // Monster Body (Green Slime)
        ctx.fillStyle = '#44aa44';
        
        // Draw a blob shape
        ctx.beginPath();
        ctx.moveTo(w*0.2, h*0.9);
        ctx.bezierCurveTo(w*0.1, h*0.7, w*0.1, h*0.3, w*0.2, h*0.1); 
        ctx.bezierCurveTo(w*0.4, h*0.05, w*0.6, h*0.05, w*0.8, h*0.1); 
        ctx.bezierCurveTo(w*0.9, h*0.3, w*0.9, h*0.7, w*0.8, h*0.9); 
        ctx.bezierCurveTo(w*0.6, h*0.95, w*0.4, h*0.95, w*0.2, h*0.9); 
        ctx.fill();
        ctx.strokeStyle = '#225522';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(w*0.35, h*0.25, 20, 0, Math.PI*2);
        ctx.arc(w*0.65, h*0.25, 20, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(w*0.35, h*0.25, 5, 0, Math.PI*2);
        ctx.arc(w*0.65, h*0.25, 5, 0, Math.PI*2);
        ctx.fill();

        // Question Stem
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        
        // Wrap question text
        this.wrapText(ctx, this.questionData.q, w/2, h*0.1, w*0.9, 30);
    }

    drawOptions(ctx, w, h) {
        const count = this.options.length;
        const startY = h * 0.35; 
        const endY = h * 0.95;
        const heightPerOption = (endY - startY) / count;

        ctx.font = 'bold 24px Arial'; // Smaller font for options
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        this.zones = []; 
        
        for (let i = 0; i < count; i++) {
            const y = startY + i * heightPerOption;
            const textY = y + heightPerOption / 2;
            const optionText = this.options[i];

            // Draw Background (Organ)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(w*0.1, y + 2, w*0.8, heightPerOption - 4);
            
            ctx.fillStyle = '#ffff00';
            // Wrap option text
            this.wrapText(ctx, optionText, w/2, textY, w*0.75, 28);
            
            // Hit Zones
            const topLocalY = 0.5 - (y / h);
            const bottomLocalY = 0.5 - ((y + heightPerOption) / h);
            
            this.zones.push({
                index: i,
                top: topLocalY,
                bottom: bottomLocalY,
                text: optionText
            });
        }
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(''); // Splitting by char for Chinese wrapping
        let line = '';
        // If it's English, split by ' '
        const isEnglish = /^[A-Za-z0-9\s?!.,]+$/.test(text);
        const tokens = isEnglish ? text.split(' ') : text.split('');
        
        // Adjust y to start slightly higher if multiple lines? 
        // Simple wrap starting at y.
        // Actually for centered vertical text (options), we might need to calculate height first.
        // For Question (top), flowing down is fine.
        
        // For options (middle), let's just draw.
        
        // Pre-calc lines to center vertically?
        let lines = [];
        let currentLine = tokens[0];

        for(let n = 1; n < tokens.length; n++) {
            let testLine = currentLine + (isEnglish ? ' ' : '') + tokens[n];
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(currentLine);
                currentLine = tokens[n];
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);

        // Draw lines
        let startY = y - (lines.length - 1) * lineHeight / 2;
        for (let k = 0; k < lines.length; k++) {
            ctx.fillText(lines[k], x, startY + k * lineHeight);
        }
    }

    update(delta, playerPosition) {
        if (this.isDead) return;

        // Wiggle
        this.wiggleTime += delta * 5;
        this.mesh.scale.set(1.5 + Math.sin(this.wiggleTime)*0.1, 3 - Math.sin(this.wiggleTime)*0.1, 1);

        // Move towards player (Simple AI)
        const dist = this.position.distanceTo(playerPosition);
        if (dist > 3 && dist < 20) { // Don't get too close, and only chase if close enough
            const dir = new THREE.Vector3().subVectors(playerPosition, this.position).normalize();
            dir.y = 0; // Stay on ground
            
            // Wall collision for enemies?
            // Ignore for now, ghost enemies
            
            this.position.add(dir.multiplyScalar(this.speed * delta));
            this.mesh.position.copy(this.position);
        }
    }

    checkHit(intersectPoint) {
        // intersectPoint is in World Coordinates?
        // Raycaster gives point.
        // We need local Y on the sprite.
        // The sprite is always facing camera, but its position is this.mesh.position
        // And rotation is set by render loop (billboard).
        // Actually raycast interaction with Sprite in Three.js is weird? 
        // No, Raycaster intersectObject(sprite) works.
        // It returns point.
        
        // Easier: Raycaster return includes 'uv' for Mesh? For Sprite?
        // Sprite raycast usually returns valid intersection.
        // Let's assume we get the Y relative to center.
        
        // Ideally we use the UV y coordinate.
        // The intersection object from three.js usually has .uv property if available needed?
        // For sprites, raycast might not return uv.
        
        // Basic math:
        // World Hit Y - Sprite Position Y = Local Offset Y
        // Local Offset Y is between -H/2 and H/2.
        
        const localY = (intersectPoint.y - this.mesh.position.y) / this.mesh.scale.y; 
        // localY should be approx -0.5 to 0.5
        
        for (const zone of this.zones) {
            if (localY <= zone.top && localY >= zone.bottom) {
                return zone.index;
            }
        }
        return -1;
    }

    takeDamage(optionIndex) {
        if (optionIndex === this.answerIndex) {
            this.die();
            return { correct: true, dead: true };
        } else {
            // Wrong answer feedback
            // Maybe flash red
            this.mesh.material.color.set(0xff0000);
            setTimeout(() => { if(!this.isDead) this.mesh.material.color.set(0xffffff); }, 200);
            return { correct: false, dead: false };
        }
    }

    die() {
        this.isDead = true;
        this.scene.remove(this.mesh);
        // Effects?
    }
}
