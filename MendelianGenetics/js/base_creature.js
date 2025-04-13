class BaseCreature {
    constructor(id, x, y, r, chromosomes) {
        this.id = id;
        this.r = r;
        this.chromosomes = chromosomes;
        this.z = 0;
        this.isAllelesTextVisible = false;
        this.svgNS = "http://www.w3.org/2000/svg";
        //this.init(x, y);
    }

    async init(initialTranslateX, initialTranslateY) {
        await this.createSprite(initialTranslateX, initialTranslateY);
        this.setDraggable();
    }

    getMainSvg() {
        return document.getElementById("svgContainer")?.querySelector("svg");
    }

    setAllelesText() {
        const alleleGroups = {};
        this.chromosomes.forEach((chromosome) => {
            const number = chromosome.number;
            if (!alleleGroups[number]) {
                alleleGroups[number] = [];
            }
            alleleGroups[number].push(...chromosome.alleles);
        });

        Object.keys(alleleGroups).forEach((number) => {
            alleleGroups[number].sort((a, b) =>
                a.localeCompare(b, undefined, { caseFirst: "upper" })
            );
        });

        const allelesTextElement = this.group.querySelector("#alleles-text");
        if (allelesTextElement) {
            allelesTextElement.setAttribute("text-anchor", "start"); // 強制設定為靠左對齊

            // 清除之前的內容 (無論是 textContent 還是舊的 tspans)
            while (allelesTextElement.firstChild) {
                allelesTextElement.removeChild(allelesTextElement.firstChild);
            }

            // 設定 tspan 的基本屬性
            const startX = allelesTextElement.getAttribute("x") || 0; // 水平對齊位置
            const lineHeight = 10; // 每行的行高 (可以調整)

            let lineNum = 0;
            Object.keys(alleleGroups)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .forEach((number) => {
                    // 為每個染色體創建一個 tspan
                    const allelesString = alleleGroups[number].join(","); // 該染色體的等位基因字串
                    const tspan = document.createElementNS(this.svgNS, "tspan");
                    tspan.setAttribute("x", startX);
                    // 使用 dy 屬性來控制垂直間距，第一行相對於 <text> 的 y，後續行相對於上一行
                    tspan.setAttribute("dy", lineNum === 0 ? 0 : lineHeight);
                    // 可以選擇性地加上染色體編號標示
                    tspan.textContent = `Ch${number}: ${allelesString}`;
                    allelesTextElement.appendChild(tspan);
                    lineNum++;
                });
        }
    }

    toggleAllelesText() {
        this.isAllelesTextVisible = !this.isAllelesTextVisible;
        const allelesTextElement = this.group.querySelector("#alleles-text");
        if (allelesTextElement) {
            allelesTextElement.style.display = this.isAllelesTextVisible ? "block" : "none";
        }
    }

    setAllelesVisibility(visible) {
        this.isAllelesTextVisible = visible;
        const allelesTextElement = this.group.querySelector("#alleles-text");
        if (allelesTextElement) {
            allelesTextElement.style.display = visible ? "block" : "none";
        }
    }


    setDraggable() {
        let startSVGPoint;
        let initialTranslate;
        let inverseCTM;
        let grabOffset;
        const mainSvg = this.getMainSvg();
        if (!mainSvg) {
            console.error("Cannot set draggable, main SVG not found.");
            return;
        }

        const startDragging = (e) => {
            e.preventDefault();
            const isTouch = e.type === 'touchstart';
            const point = isTouch ? e.touches[0] : e;
            inverseCTM = mainSvg.getScreenCTM()?.inverse();
            if (!inverseCTM) return;

            let svgPoint = mainSvg.createSVGPoint();
            svgPoint.x = point.clientX;
            svgPoint.y = point.clientY;
            startSVGPoint = svgPoint.matrixTransform(inverseCTM);
            
            const currentMatrix = this.group.transform.baseVal.consolidate()?.matrix;
            initialTranslate = {
                x: currentMatrix?.e ?? 0,
                y: currentMatrix?.f ?? 0
            };

            grabOffset = {
                x: startSVGPoint.x - initialTranslate.x,
                y: startSVGPoint.y - initialTranslate.y
            };

            mainSvg.appendChild(this.group);
            this.group.style.cursor = 'grabbing';

            const moveEvent = isTouch ? "touchmove" : "mousemove";
            const endEvent = isTouch ? "touchend" : "mouseup";
            document.addEventListener(moveEvent, onMove);
            document.addEventListener(endEvent, endDragging, { once: true });
        };

        const onMove = (e) => {
            e.preventDefault();
            const isTouch = e.type === 'touchmove';
            const point = isTouch ? e.touches[0] : e;
            if (!inverseCTM || !grabOffset) return;

            let currentSVGPoint = mainSvg.createSVGPoint();
            currentSVGPoint.x = point.clientX;
            currentSVGPoint.y = point.clientY;
            currentSVGPoint = currentSVGPoint.matrixTransform(inverseCTM);

            const newX = currentSVGPoint.x - grabOffset.x;
            const newY = currentSVGPoint.y - grabOffset.y;
            this.updateTransform(newX, newY);
        };

        const endDragging = () => {
            this.group.style.cursor = "grab";
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("touchmove", onMove);

            startSVGPoint = null;
            initialTranslate = null;
            inverseCTM = null;
            grabOffset = null;

            const finalMatrix = this.group.transform.baseVal.consolidate()?.matrix;
            if (finalMatrix) {
                this.group.setAttribute("data-translateX", finalMatrix.e);
                this.group.setAttribute("data-translateY", finalMatrix.f);
            }
        };

        this.group.addEventListener("mousedown", startDragging);
        this.group.addEventListener("touchstart", startDragging, { passive: false });
        this.group.style.cursor = "grab";
        this.group.style.touchAction = "none";
    }

    updateTransform(newX, newY) {
        const mainSvg = this.getMainSvg();
        if (!mainSvg) return;
        const newTransformString = `translate(${newX}, ${newY})`;
        this.group.setAttribute('transform', newTransformString);
    }

    getGroup() {
        return this.group;
    }

    // Abstract methods that must be implemented by child classes
    async createSprite(translateX, translateY) {
        throw new Error('createSprite must be implemented by child class');
    }

    applyTraits() {
        throw new Error('applyTraits must be implemented by child class');
    }


}