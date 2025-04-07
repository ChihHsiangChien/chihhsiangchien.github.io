export class LabelManager {
    constructor(camera, renderer) {
        this.camera = camera;
        this.renderer = renderer;
        this.labelsDiv = document.getElementById('labels');
        this.linesDiv = document.getElementById('lines');
        this.visible = false;
        this.labels = [];
    }

    addLabel(object, name, offset, anchorOffset) {
        const labelData = {
            object,
            name,
            offset: offset || new THREE.Vector3(),
            anchorOffset: anchorOffset || new THREE.Vector3(),
            element: this.createLabelElement(name),
            lineElement: this.createLineElement()
        };
        this.labels.push(labelData);
    }

    createLabelElement(text) {
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = text;
        label.style.display = 'none';
        this.labelsDiv.appendChild(label);
        return label;
    }

    createLineElement() {
        const line = document.createElement('div');
        line.className = 'label-line';
        line.style.display = 'none';
        this.linesDiv.appendChild(line);
        return line;
    }

    setVisibility(visible) {
        this.visible = visible;
        this.labels.forEach(data => {
            data.element.style.display = visible ? 'block' : 'none';
            data.lineElement.style.display = visible ? 'block' : 'none';
        });
    }

    update(crossSectionActive) {
        if (!this.visible) return;

        this.labels.forEach(data => {
            if (!data.object || (data.object.visible === false)) {
                data.element.style.display = 'none';
                data.lineElement.style.display = 'none';
                return;
            }

            // Update label position
            const labelPos = new THREE.Vector3();
            data.object.updateWorldMatrix(true, false);
            labelPos.setFromMatrixPosition(data.object.matrixWorld).add(data.offset);
            labelPos.project(this.camera);

            const labelX = (labelPos.x * .5 + .5) * this.renderer.domElement.clientWidth;
            const labelY = (labelPos.y * -.5 + .5) * this.renderer.domElement.clientHeight;

            data.element.style.transform = `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`;
            data.element.style.display = 'block';

            // Update line position
            const objectPos = new THREE.Vector3();
            data.object.updateWorldMatrix(true, false);
            objectPos.setFromMatrixPosition(data.object.matrixWorld).add(data.anchorOffset);
            objectPos.project(this.camera);

            const objX = (objectPos.x * .5 + .5) * this.renderer.domElement.clientWidth;
            const objY = (objectPos.y * -.5 + .5) * this.renderer.domElement.clientHeight;

            const dx = objX - labelX;
            const dy = objY - labelY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            data.lineElement.style.width = `${distance}px`;
            data.lineElement.style.left = `${labelX}px`;
            data.lineElement.style.top = `${labelY}px`;
            data.lineElement.style.transform = `rotate(${angle}rad)`;
            data.lineElement.style.display = 'block';
        });
    }
}