class Sprite {
    constructor(id, x, y, r, alleles) {
        this.id = id;
        this.x = 0;
        this.y = 0;
        this.r = r;
        this.alleles = alleles;

        this.color = this.determineColor();
        this.z = 0;  // Z attribute to keep track of z-order

        this.svgNS = "http://www.w3.org/2000/svg";
        this.createSprite(x,y);
    }
    determineColor() {
        return this.alleles.includes('A') ? 'blue' : 'yellow';
    }
    createSprite(x,y) {
        // Create the face (circle)
        this.face = document.createElementNS(this.svgNS, "circle");
        this.face.setAttribute("cx", this.x);
        this.face.setAttribute("cy", this.y);
        this.face.setAttribute("r", this.r);
        this.face.setAttribute("fill", this.color);
        this.face.setAttribute("stroke", "black");
        this.face.setAttribute("stroke-width", "2");
        this.face.setAttribute("id", this.id);

        // Create the left eye (circle)
        this.leftEye = document.createElementNS(this.svgNS, "circle");
        this.leftEye.setAttribute("cx", this.x - this.r * .8);
        this.leftEye.setAttribute("cy", this.y - this.r * .8);
        this.leftEye.setAttribute("r", "10");
        this.leftEye.setAttribute("fill", "white");
        this.leftEye.setAttribute("stroke", "black");
        this.leftEye.setAttribute("stroke-width", "2");

        this.leftEyeball = document.createElementNS(this.svgNS, "circle");
        this.leftEyeball.setAttribute("cx", this.x - this.r * .8);
        this.leftEyeball.setAttribute("cy", this.y - this.r * .8);
        this.leftEyeball.setAttribute("r", "5");
        this.leftEyeball.setAttribute("fill", "black");
        this.leftEyeball.setAttribute("stroke", "black");
        this.leftEyeball.setAttribute("stroke-width", "2");


        // Create the right eye (circle)
        this.rightEye = document.createElementNS(this.svgNS, "circle");
        this.rightEye.setAttribute("cx", this.x + this.r * .8);
        this.rightEye.setAttribute("cy", this.y - this.r * .8);
        this.rightEye.setAttribute("r", "10");
        this.rightEye.setAttribute("fill", "white");
        this.rightEye.setAttribute("stroke", "black");
        this.rightEye.setAttribute("stroke-width", "2");

        this.rightEyeball = document.createElementNS(this.svgNS, "circle");
        this.rightEyeball.setAttribute("cx", this.x + this.r * .8);
        this.rightEyeball.setAttribute("cy", this.y - this.r * .8);
        this.rightEyeball.setAttribute("r", "5");
        this.rightEyeball.setAttribute("fill", "black");
        this.rightEyeball.setAttribute("stroke", "black");
        this.rightEyeball.setAttribute("stroke-width", "2");        

        this.text = document.createElementNS(svgNS, "text");
        this.text.setAttribute("x", this.x);
        this.text.setAttribute("y", this.y);
        this.text.setAttribute("dominant-baseline", "middle");
        this.text.setAttribute("text-anchor", "middle");
        this.text.textContent = this.alleles;




        // Append elements to the SVG group
        this.group = document.createElementNS(this.svgNS, "g");
        this.group.setAttribute("class", "sprite");
        
        this.group.setAttribute("transform", `translate(${x},${y})`);

        //this.group.setAttribute("transform", `translate(0,0)`);


        this.group.appendChild(this.face);
        this.group.appendChild(this.leftEye);
        this.group.appendChild(this.leftEyeball);        
        this.group.appendChild(this.rightEye);
        this.group.appendChild(this.rightEyeball);     
        this.group.appendChild(this.text);
               

    }

    getGroup() {
        return this.group;
    }

    setDraggable() {
        let offsetX, offsetY, transform;
        const onMouseMove = (e) => {
            const dx = e.clientX - offsetX;
            const dy = e.clientY - offsetY;
            this.group.setAttribute('transform', `translate(${dx}, ${dy}) ${transform}`);
        };
    
        this.group.addEventListener('mousedown', (e) => {
            // Bring the sprite to the top by appending it to the end of the SVG
            svg.appendChild(this.group);
    
            offsetX = e.clientX;
            offsetY = e.clientY;
            const transformMatrix = this.group.getCTM();
            transform = transformMatrix ? `matrix(${transformMatrix.a}, ${transformMatrix.b}, ${transformMatrix.c}, ${transformMatrix.d}, ${transformMatrix.e}, ${transformMatrix.f})` : '';
            this.group.style.cursor = 'grabbing';
    
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', () => {
                document.removeEventListener('mousemove', onMouseMove);
                this.group.style.cursor = 'grab';
            }, { once: true });
        });
    
        this.group.style.cursor = 'grab';
    }
}
