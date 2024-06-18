document.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('mySvg');
    const centerX = 200; // Center of the SVG
    const centerY = 200; // Center of the SVG
    const numLines = 300; // Number of lines to draw
    const angleStep = 0.1; // Angle step in radians
    const lengthStep = 0.5; // Length step for each iteration

    let currentAngle = 0;
    let currentLength = 0;
    let duration = 1; // Initial duration in seconds
    let direction = 1; // 1 for normal, -1 for reverse

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('transform-origin', `${centerX/2} ${centerY/2}`);


    for (let i = 0; i < numLines; i++) {
        const x1 = centerX + currentLength * Math.cos(currentAngle);
        const y1 = centerY + currentLength * Math.sin(currentAngle);
        currentAngle += angleStep;
        currentLength += lengthStep;
        const x2 = centerX + currentLength * Math.cos(currentAngle);
        const y2 = centerY + currentLength * Math.sin(currentAngle);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', 'black');
        line.setAttribute('stroke-width', '2');

        group.appendChild(line);
    }

    svg.appendChild(group);

    const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
    animate.setAttribute('attributeName', 'transform');
    animate.setAttribute('attributeType', 'XML');
    animate.setAttribute('type', 'rotate');
    animate.setAttribute('from', `0 ${centerX/2} ${centerY/2}`); // Rotating around the center of the SVG
    animate.setAttribute('to', `360 ${centerX/2} ${centerY/2}`);
    animate.setAttribute('dur', `${duration}s`);
    animate.setAttribute('repeatCount', 'indefinite');

    group.appendChild(animate);

    // Control buttons
    document.getElementById('speedUp').addEventListener('click', () => {
        duration = Math.max(0.1, duration - 1);
        animate.setAttribute('dur', `${duration}s`);
    });

    document.getElementById('slowDown').addEventListener('click', () => {
        duration += 1;
        animate.setAttribute('dur', `${duration}s`);
    });

    document.getElementById('reverse').addEventListener('click', () => {
        direction *= -1;
        animate.setAttribute('from', `0 ${centerX/2} ${centerY/2}`);
        animate.setAttribute('to', `${360 * direction} ${centerX/2} ${centerY/2}`);
    });
});
