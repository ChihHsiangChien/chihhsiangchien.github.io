class Sprite {
  constructor(id, x, y, r, chromosomes) {
    this.id = id;
    // Store initial logical position if needed, but transform handles visual position
    // this.x = x;
    // this.y = y;
    this.r = r;
    this.chromosomes = chromosomes; // An array of chromosome objects

    this.z = 0; // Z attribute to keep track of z-order

    this.isAllelesTextVisible = false;

    this.svgNS = "http://www.w3.org/2000/svg";
    // Pass initial coordinates directly to init/createSprite
    this.init(x, y);
  }

  async init(initialTranslateX, initialTranslateY) {
    // Pass initial coordinates to createSprite
    await this.createSprite(initialTranslateX, initialTranslateY);
    // setDraggable doesn't need coordinates now, it reads from the element
    this.setDraggable();
  }

  async createSprite(translateX, translateY) {
    try {
      const response = await fetch("sprite.svg");
      const svgText = await response.text();
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

      const template = svgDoc.getElementById("sprite-template");
      if (!template) throw new Error("Template not found in sprite.svg");

      this.group = template.cloneNode(true);

      this.group.setAttribute("id", this.id);
      this.group.setAttribute("class", "sprite");

      // Store initial logical position in data attributes
      this.group.setAttribute("data-translateX", translateX);
      this.group.setAttribute("data-translateY", translateY);

      this.group.setAttribute(
        "data-chromosomes",
        JSON.stringify(this.chromosomes)
      );

      // Apply the initial transform
      // Use SVGTransform API for potentially cleaner updates later
      const mainSvg = this.getMainSvg(); // Helper function needed
      if (mainSvg) {
          const initialTransform = mainSvg.createSVGTransform();
          initialTransform.setTranslate(translateX, translateY);
          this.group.transform.baseVal.initialize(initialTransform); // Initialize transform list
      } else {
          // Fallback or error if mainSvg not found yet
          this.group.setAttribute("transform", `translate(${translateX},${translateY})`);
      }


      // Set alleles text content
      this.setAllelesText();

      // Hide the alleles-text initially
      const allelesTextElement = this.group.querySelector("#alleles-text");
      if (allelesTextElement) {
          allelesTextElement.style.display = "none";
      }

      // Consider moving this button listener outside the class or making it static
      // to avoid adding multiple listeners if many sprites are created.
      // Or add it once elsewhere and have it call a method on the currently selected sprite.
      // document
      //   .getElementById("toggleAllelesButton")
      //   .addEventListener("click", () => {
      //     this.toggleAllelesText(); // This will toggle ALL sprites if attached like this
      //   });

      // ===設定表現型=====
      this.setFaceColor();
      this.setEyeball();
      this.setTail();
      this.setEars();
      this.setHorns();

      // 将 g 元素添加到主 SVG
      if (mainSvg) {
        mainSvg.appendChild(this.group);
      } else {
        console.error("Main SVG not found during createSprite");
      }
    } catch (error) {
      console.error("Error creating sprite:", error);
    }
  }

  // Helper to get the main SVG element consistently
  getMainSvg() {
      return document.getElementById("svgContainer")?.querySelector("svg");
  }


  // 顯示基因型 (No changes needed here)
  setAllelesText() {
    // ... (keep existing code) ...
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
    let allelesText = "";
    Object.keys(alleleGroups)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((number) => {
        allelesText += alleleGroups[number].join("");
      });
     const allelesTextElement = this.group.querySelector("#alleles-text");
     if (allelesTextElement) {
        allelesTextElement.textContent = allelesText;
     }
  }

  // toggle基因型 (No changes needed here, but consider event listener placement)
  toggleAllelesText() {
    this.isAllelesTextVisible = !this.isAllelesTextVisible;
    const allelesTextElement = this.group.querySelector("#alleles-text");
     if (allelesTextElement) {
        allelesTextElement.style.display = this.isAllelesTextVisible ? "block" : "none";
     }
  }

  // Phenotype setting methods (No changes needed here)
  setFaceColor() { /* ... keep existing code ... */
    const hasDominantAllele = this.chromosomes.some((chromosome) =>
      chromosome.alleles.includes("A")
    );
    const faceColor = hasDominantAllele ? "DarkTurquoise" : "lightblue";
    const faceElement = this.group.querySelector("#face");
    if(faceElement) faceElement.setAttribute("fill", faceColor);
  }
  setEyeball() { /* ... keep existing code ... */
    const alleles = this.chromosomes.flatMap(
      (chromosome) => chromosome.alleles
    );
    const count = alleles.filter((allele) => allele === "circleEye").length;

    if (count === 0) {
      const leftEye = this.group.querySelector("#left-eye");
      if (leftEye) {
          const leftLine = document.createElementNS(this.svgNS, "line");
          leftLine.setAttribute("x1", "-12"); leftLine.setAttribute("y1", "-8");
          leftLine.setAttribute("x2", "-2"); leftLine.setAttribute("y2", "-8");
          leftLine.setAttribute("stroke", "black"); leftLine.setAttribute("stroke-width", "1");
          leftEye.replaceWith(leftLine);
      }

      const rightEye = this.group.querySelector("#right-eye");
       if (rightEye) {
          const rightLine = document.createElementNS(this.svgNS, "line");
          rightLine.setAttribute("x1", "12"); rightLine.setAttribute("y1", "-8");
          rightLine.setAttribute("x2", "2"); rightLine.setAttribute("y2", "-8");
          rightLine.setAttribute("stroke", "black"); rightLine.setAttribute("stroke-width", "1");
          rightEye.replaceWith(rightLine);
       }
    }
  }
  setTail() { /* ... keep existing code ... */
    const hasDominantAllele = this.chromosomes.some((chromosome) =>
      chromosome.alleles.includes("tail")
    );
    if (hasDominantAllele) {
      const faceElement = this.group.querySelector("#face");
      if (faceElement) {
        const faceFill = faceElement.getAttribute("fill");
        const tailPath = document.createElementNS(this.svgNS, "path");
        tailPath.setAttribute("style", `fill:${faceFill};stroke:black;stroke-width:2`);
        tailPath.setAttribute("d", "M 5.5673167,8.9411756 C 17.331503,11.46651 27.181949,7.1981385 34.595237,3.6784866 24.412928,11.621994 18.395379,14.988234 6.710685,16.313789");
        tailPath.setAttribute("id", "tail");
        const tailTipPath = document.createElementNS(this.svgNS, "path");
        tailTipPath.setAttribute("style", `fill:${faceFill};stroke:black;stroke-width:2`);
        tailTipPath.setAttribute("d", "M 36.651297,4.4896989 A 3.346251,3.0420463 0 0 1 33.305046,7.5317452 3.346251,3.0420463 0 0 1 29.958795,4.4896989 3.346251,3.0420463 0 0 1 33.305046,1.4476526 3.346251,3.0420463 0 0 1 36.651297,4.4896989 Z");
        tailTipPath.setAttribute("id", "tailtip");
        this.group.insertBefore(tailPath, faceElement);
        this.group.insertBefore(tailTipPath, faceElement);
      }
    }
  }
  setEars() { /* ... keep existing code ... */
    const alleles = this.chromosomes.flatMap((chromosome) => chromosome.alleles);
    const count = alleles.filter((allele) => allele === "roundEar").length;
    const faceElement = this.group.querySelector("#face");
    if (!faceElement) return;
    const faceFill = faceElement.getAttribute("fill");

    const leftEar = document.createElementNS(this.svgNS, "path");
    leftEar.setAttribute("style", `fill:${faceFill};stroke:black;stroke-width:2`);
    leftEar.setAttribute("id", "leftEar");
    const rightEar = document.createElementNS(this.svgNS, "path");
    rightEar.setAttribute("style", `fill:${faceFill};stroke:black;stroke-width:2`);
    rightEar.setAttribute("id", "rightEar");

    if (count > 0) { // Changed logic slightly: > 0 means at least one dominant allele
      leftEar.setAttribute("d", "M -8,-18 C -20,-25 -27,-13 -18,-5");
      rightEar.setAttribute("d", "M 8,-18 C 20,-25 27,-13 18,-5");
    } else {
      leftEar.setAttribute("d", "M -8,-17 -21,-19 -17,-8");
      rightEar.setAttribute("d", "M 8,-17 21,-19 17,-8");
    }
    this.group.appendChild(leftEar);
    this.group.appendChild(rightEar);
  }
  setHorns() { /* ... keep existing code ... */
    const alleles = this.chromosomes.flatMap((chromosome) => chromosome.alleles);
    const count = alleles.filter((allele) => allele === "horn").length;
    const faceElement = this.group.querySelector("#face");
    if (!faceElement) return;
    const faceFill = faceElement.getAttribute("fill");

    const createHorn = (d, id) => {
        const horn = document.createElementNS(this.svgNS, "path");
        horn.setAttribute("style", `fill:${faceFill};stroke:black;stroke-width:2`);
        horn.setAttribute("d", d);
        horn.setAttribute("id", id);
        this.group.appendChild(horn);
    };

    if (count >= 1) {
        createHorn("m -8, 16 -1,5 4,-4", "leftHorn4");
        createHorn("m 8, 16 1,5 -4,-4", "rightHorn4");
    }
    if (count >= 2) {
        createHorn("m -13,13 -3,6 6,-3", "leftHorn3");
        createHorn("m 13,13 3,6 -6,-3", "rightHorn3");
    }
     if (count >= 3) {
        createHorn("m -16, 9 -4,5 7,-2", "leftHorn2");
        createHorn("m 16,9 4,5 -7,-2", "rightHorn2");
    }
    if (count >= 4) {
        createHorn("m -18,3 -6,5 h 7", "leftHorn1");
        createHorn("m 18,3 6,5 h -7", "rightHorn1");
    }
    // Note: The original switch case had fall-through, this achieves the same cumulative effect.
  }

  setWhiskers() {} // Placeholder
  getGroup() {
    return this.group;
  }

  // Helper to get the main SVG element consistently
  getMainSvg() {
      return document.getElementById("svgContainer")?.querySelector("svg");
  }


  // --- Revised Drag Logic ---
    setDraggable() {
    let startSVGPoint;      // Store drag start position in SVG coordinates
    let initialTranslate;   // Store initial transform.translate values
    let inverseCTM;         // Store the inverse CTM of the SVG canvas
    let grabOffset;         // Store offset between click and sprite origin

    const mainSvg = this.getMainSvg();
    if (!mainSvg) {
        console.error("Cannot set draggable, main SVG not found."); // Keep this error log
        return;
    }

    const startDragging = (e) => {
        e.preventDefault();
        const isTouch = e.type === 'touchstart';
        const point = isTouch ? e.touches[0] : e;

        inverseCTM = mainSvg.getScreenCTM()?.inverse();
        if (!inverseCTM) {
            // Optional: Add an error log here if needed
            // console.error("Could not get inverse CTM");
            return;
        }

        let svgPoint = mainSvg.createSVGPoint();
        svgPoint.x = point.clientX;
        svgPoint.y = point.clientY;
        startSVGPoint = svgPoint.matrixTransform(inverseCTM); // Where the mouse clicked

        const currentMatrix = this.group.transform.baseVal.consolidate()?.matrix;
        initialTranslate = { // Store the read values
            x: currentMatrix?.e ?? 0,
            y: currentMatrix?.f ?? 0
        };

        // Calculate Grab Offset
        grabOffset = {
            x: startSVGPoint.x - initialTranslate.x,
            y: startSVGPoint.y - initialTranslate.y
        };

        // Bring to front
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
        currentSVGPoint = currentSVGPoint.matrixTransform(inverseCTM); // Current mouse pos in SVG coords

        const newX = currentSVGPoint.x - grabOffset.x; // Target X for sprite origin
        const newY = currentSVGPoint.y - grabOffset.y; // Target Y for sprite origin

        this.updateTransform(newX, newY);
    };

    const endDragging = () => {
        this.group.style.cursor = "grab";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("touchmove", onMove);

        // Reset temporary variables
        startSVGPoint = null;
        initialTranslate = null;
        inverseCTM = null;
        grabOffset = null;

        // Update data attributes
        const finalMatrix = this.group.transform.baseVal.consolidate()?.matrix;
        if (finalMatrix) {
            this.group.setAttribute("data-translateX", finalMatrix.e);
            this.group.setAttribute("data-translateY", finalMatrix.f);
            // Removed the console.log for final data
        }
    };

    // Add initial listeners
    this.group.addEventListener("mousedown", startDragging);
    this.group.addEventListener("touchstart", startDragging, { passive: false });
    this.group.style.cursor = "grab";
    this.group.style.touchAction = "none";
  }

  // --- Cleaned updateTransform ---
  updateTransform(newX, newY) {
    const mainSvg = this.getMainSvg();
    if (!mainSvg) return;

    // Use setAttribute (as it solved the rendering issue)
    const newTransformString = `translate(${newX}, ${newY})`;
    this.group.setAttribute('transform', newTransformString);

    // Removed the requestAnimationFrame check block
  }
}
