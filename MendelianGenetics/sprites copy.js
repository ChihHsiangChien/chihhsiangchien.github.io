class Sprite {
  constructor(id, x, y, r, chromosomes) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.r = r;
    this.chromosomes = chromosomes; // An array of chromosome objects

    this.z = 0; // Z attribute to keep track of z-order

    this.isAllelesTextVisible = false;

    this.svgNS = "http://www.w3.org/2000/svg";
    // Pass initial coordinates directly to init/createSprite
    this.init(x, y);
  }

  async init(translateX, translateY) {
    await this.createSprite(translateX, translateY);
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

      this.group.setAttribute("data-translateX", translateX); // Store translateX
      this.group.setAttribute("data-translateY", translateY); // Store translateY

      this.group.setAttribute(
        "data-chromosomes",
        JSON.stringify(this.chromosomes)
      );
      this.group.setAttribute(
        "data-chromosomes",
        JSON.stringify(this.chromosomes)
      );

      //this.group.setAttribute("data-chromosomes", this.chromosomes); // Store translateY

      this.group.setAttribute(
        "transform",
        `translate(${translateX},${translateY})`
      );

      // Set alleles text content
      this.setAllelesText();

      // Hide the alleles-text initially
      this.group.querySelector("#alleles-text").style.display = "none";

      document
        .getElementById("toggleAllelesButton")
        .addEventListener("click", () => {
          this.toggleAllelesText();
        });

      // ===設定表現型=====
      this.setFaceColor();
      this.setEyeball();
      this.setTail();
      this.setEars();
      this.setHorns();

      // 将 g 元素添加到主 SVG
      const mainSvg = document
        .getElementById("svgContainer")
        .querySelector("svg");
      if (mainSvg) {
        mainSvg.appendChild(this.group);
      } else {
        throw new Error("Main SVG not found");
      }
    } catch (error) {
      console.error("Error creating sprite:", error);
    }
  }

  // 顯示基因型
  setAllelesText() {
    // Group alleles by chromosome number
    const alleleGroups = {};
    this.chromosomes.forEach((chromosome) => {
      const number = chromosome.number;
      if (!alleleGroups[number]) {
        alleleGroups[number] = [];
      }
      alleleGroups[number].push(...chromosome.alleles);
    });

    // Sort alleles within each chromosome group
    Object.keys(alleleGroups).forEach((number) => {
      alleleGroups[number].sort((a, b) =>
        a.localeCompare(b, undefined, { caseFirst: "upper" })
      );
    });

    // Concatenate sorted alleles by chromosome number order
    let allelesText = "";
    Object.keys(alleleGroups)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((number) => {
        allelesText += alleleGroups[number].join("");
      });

    // Update #alleles-text content
    this.group.querySelector("#alleles-text").textContent = allelesText;
  }

  // toggle基因型
  toggleAllelesText() {
    // Toggle the visibility state
    this.isAllelesTextVisible = !this.isAllelesTextVisible;

    // Update the display property based on the visibility state
    const allelesTextElement = this.group.querySelector("#alleles-text");
    if (this.isAllelesTextVisible) {
      allelesTextElement.style.display = "block";
    } else {
      allelesTextElement.style.display = "none";
    }
  }

  setFaceColor() {
    // 只要有大A ~ 顯性遺傳
    const hasDominantAllele = this.chromosomes.some((chromosome) =>
      chromosome.alleles.includes("A")
    );
    const faceColor = hasDominantAllele ? "DarkTurquoise" : "lightblue";
    this.group.querySelector("#face").setAttribute("fill", faceColor);
  }

  setEyeball() {
    // 顯性是圓形眼，隱性是瞇瞇眼--只要沒有circleEye，就是瞇瞇眼
    const alleles = this.chromosomes.flatMap(
      (chromosome) => chromosome.alleles
    );
    const count = alleles.filter((allele) => allele === "circleEye").length;

    if (count === 0) {
      // Replace left eyeball with a line
      const leftEye = this.group.querySelector("#left-eye");
      const leftLine = document.createElementNS(this.svgNS, "line");
      leftLine.setAttribute("x1", "-12");
      leftLine.setAttribute("y1", "-8");
      leftLine.setAttribute("x2", "-2");
      leftLine.setAttribute("y2", "-8");
      leftLine.setAttribute("stroke", "black");
      leftLine.setAttribute("stroke-width", "1");
      leftEye.replaceWith(leftLine);

      // Replace right eyeball with a line
      const rightEye = this.group.querySelector("#right-eye");
      const rightLine = document.createElementNS(this.svgNS, "line");
      rightLine.setAttribute("x1", "12");
      rightLine.setAttribute("y1", "-8");
      rightLine.setAttribute("x2", "2");
      rightLine.setAttribute("y2", "-8");
      rightLine.setAttribute("stroke", "black");
      rightLine.setAttribute("stroke-width", "1");
      rightEye.replaceWith(rightLine);
    }
  }

  setTail() {
    // 只要有 tail ~ 顯性遺傳
    const hasDominantAllele = this.chromosomes.some((chromosome) =>
      chromosome.alleles.includes("tail")
    );

    if (hasDominantAllele) {
      const faceElement = this.group.querySelector("#face");
      if (faceElement) {
        const faceFill = faceElement.getAttribute("fill");

        const tailPath = document.createElementNS(this.svgNS, "path");
        tailPath.setAttribute(
          "style",
          `fill:${faceFill};stroke:black;stroke-width:2`
        );
        tailPath.setAttribute(
          "d",
          "M 5.5673167,8.9411756 C 17.331503,11.46651 27.181949,7.1981385 34.595237,3.6784866 24.412928,11.621994 18.395379,14.988234 6.710685,16.313789"
        );
        tailPath.setAttribute("id", "tail");

        const tailTipPath = document.createElementNS(this.svgNS, "path");
        tailTipPath.setAttribute(
          "style",
          `fill:${faceFill};stroke:black;stroke-width:2`
        );
        tailTipPath.setAttribute(
          "d",
          "M 36.651297,4.4896989 A 3.346251,3.0420463 0 0 1 33.305046,7.5317452 3.346251,3.0420463 0 0 1 29.958795,4.4896989 3.346251,3.0420463 0 0 1 33.305046,1.4476526 3.346251,3.0420463 0 0 1 36.651297,4.4896989 Z"
        );
        tailTipPath.setAttribute("id", "tailtip");

        this.group.insertBefore(tailPath, faceElement);
        this.group.insertBefore(tailTipPath, faceElement);
      }
    }
  }

  setEars() {
    // 圓形耳為顯性遺傳。只要有 roundEar 就是圓形耳，否則就是尖耳
    const alleles = this.chromosomes.flatMap(
      (chromosome) => chromosome.alleles
    );
    const count = alleles.filter((allele) => allele === "roundEar").length;
    const faceFill = this.group.querySelector("#face").getAttribute("fill");

    const leftEar = document.createElementNS(this.svgNS, "path");
    leftEar.setAttribute(
      "style",
      `fill:${faceFill};stroke:black;stroke-width:2`
    );
    leftEar.setAttribute("id", "leftEar");

    const rightEar = document.createElementNS(this.svgNS, "path");
    rightEar.setAttribute(
      "style",
      `fill:${faceFill};stroke:black;stroke-width:2`
    );
    rightEar.setAttribute("id", "rightEar");

    if (count > 1) {
      leftEar.setAttribute("d", "M -8,-18 C -20,-25 -27,-13 -18,-5");
      rightEar.setAttribute("d", "M 8,-18 C 20,-25 27,-13 18,-5");
    } else {
      leftEar.setAttribute("d", "M -8,-17 -21,-19 -17,-8");
      rightEar.setAttribute("d", "M 8,-17 21,-19 17,-8");
    }
    this.group.appendChild(leftEar);
    this.group.appendChild(rightEar);
  }

  setHorns() {
    // 計算horn的數量，多基因遺傳
    const alleles = this.chromosomes.flatMap(
      (chromosome) => chromosome.alleles
    );
    const count = alleles.filter((allele) => allele === "horn").length;

    const faceElement = this.group.querySelector("#face");
    const faceFill = faceElement.getAttribute("fill");

    if (faceElement) {
      switch (count) {
        case 4:
          const leftHorn1 = document.createElementNS(this.svgNS, "path");
          leftHorn1.setAttribute(
            "style",
            `fill:${faceFill};stroke:black;stroke-width:2`
          );
          leftHorn1.setAttribute("d", "m -18,3 -6,5 h 7");
          leftHorn1.setAttribute("id", "leftHorn1");
          this.group.appendChild(leftHorn1);

          const rightHorn1 = document.createElementNS(this.svgNS, "path");
          rightHorn1.setAttribute(
            "style",
            `fill:${faceFill};stroke:black;stroke-width:2`
          );
          rightHorn1.setAttribute("d", "m 18,3 6,5 h -7");
          rightHorn1.setAttribute("id", "rightHorn1");
          this.group.appendChild(rightHorn1);
        case 3:
          const leftHorn2 = document.createElementNS(this.svgNS, "path");
          leftHorn2.setAttribute(
            "style",
            `fill:${faceFill};stroke:black;stroke-width:2`
          );
          leftHorn2.setAttribute("d", "m -16, 9 -4,5 7,-2");
          leftHorn2.setAttribute("id", "leftHorn2");
          this.group.appendChild(leftHorn2);

          const rightHorn2 = document.createElementNS(this.svgNS, "path");
          rightHorn2.setAttribute(
            "style",
            `fill:${faceFill};stroke:black;stroke-width:2`
          );
          rightHorn2.setAttribute("d", "m 16,9 4,5 -7,-2");
          rightHorn2.setAttribute("id", "rightHorn2");
          this.group.appendChild(rightHorn2);
        case 2:
          const leftHorn3 = document.createElementNS(this.svgNS, "path");
          leftHorn3.setAttribute(
            "style",
            `fill:${faceFill};stroke:black;stroke-width:2`
          );
          leftHorn3.setAttribute("d", "m -13,13 -3,6 6,-3");
          leftHorn3.setAttribute("id", "leftHorn3");
          this.group.appendChild(leftHorn3);

          const rightHorn3 = document.createElementNS(this.svgNS, "path");
          rightHorn3.setAttribute(
            "style",
            `fill:${faceFill};stroke:black;stroke-width:2`
          );
          rightHorn3.setAttribute("d", "m 13,13 3,6 -6,-3");
          rightHorn3.setAttribute("id", "rightHorn3");
          this.group.appendChild(rightHorn3);
        case 1:
          const leftHorn4 = document.createElementNS(this.svgNS, "path");
          leftHorn4.setAttribute(
            "style",
            `fill:${faceFill};stroke:black;stroke-width:2`
          );
          leftHorn4.setAttribute("d", "m -8, 16 -1,5 4,-4");
          leftHorn4.setAttribute("id", "leftHorn4");
          this.group.appendChild(leftHorn4);

          const rightHorn4 = document.createElementNS(this.svgNS, "path");
          rightHorn4.setAttribute(
            "style",
            `fill:${faceFill};stroke:black;stroke-width:2`
          );
          rightHorn4.setAttribute("d", "m 8, 16 1,5 -4,-4");
          rightHorn4.setAttribute("id", "rightHorn4");
          this.group.appendChild(rightHorn4);
        default:
          break;
      }
    }
  }

  setWhiskers() {}
  getGroup() {
    return this.group;
  }

  setDraggable() {
    let offsetX, offsetY, transform;

    const getMainSvg = () =>
      document.getElementById("svgContainer").querySelector("svg");

    const startDragging = (e, isTouch = false) => {
      e.preventDefault(); // Prevent default touch events testing
      const point = isTouch ? e.touches[0] : e;
      const mainSvg = getMainSvg();
      if (mainSvg) {
        mainSvg.appendChild(this.group);
      }

      offsetX = point.clientX;
      offsetY = point.clientY;
      const transformMatrix = this.group.getCTM();
      transform = transformMatrix
        ? `matrix(${transformMatrix.a}, ${transformMatrix.b}, ${transformMatrix.c}, ${transformMatrix.d}, ${transformMatrix.e}, ${transformMatrix.f})`
        : "";
      this.group.style.cursor = "grabbing";

      const moveEvent = isTouch ? "touchmove" : "mousemove";
      const endEvent = isTouch ? "touchend" : "mouseup";

      const moveHandler = isTouch ? onTouchMove : onMouseMove;

      document.addEventListener(moveEvent, moveHandler);
      document.addEventListener(
        endEvent,
        () => {
          document.removeEventListener(moveEvent, moveHandler);
          this.group.style.cursor = "grab";
        },
        { once: true }
      );
    };

    const onMouseMove = (e) => {
      e.preventDefault(); // Prevent default touch events testing

      const dx = e.clientX - offsetX;
      const dy = e.clientY - offsetY;
      this.updateTransform(dx, dy, transform);
    };

    const onTouchMove = (e) => {
      e.preventDefault(); // Prevent default touch events
      const touch = e.touches[0];
      const dx = touch.clientX - offsetX;
      const dy = touch.clientY - offsetY;
      this.updateTransform(dx, dy, transform);
    };

    const onMouseDown = (e) => {
      startDragging(e, false);
    };

    const onTouchStart = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
      startDragging(e, true);
    };

    this.group.addEventListener("mousedown", onMouseDown);
    this.group.addEventListener("touchstart", onTouchStart, { passive: false });
    this.group.style.cursor = "grab";
    this.group.style.touchAction = "none";
  }

  updateTransform(dx, dy, transform) {
    const svgContainer = document.getElementById("svgContainer");
    const svgRect = svgContainer.getBoundingClientRect();
    const groupRect = this.group.getBoundingClientRect();

    this.group.setAttribute(
      "transform",
      `translate(${dx}, ${dy}) ${transform}`
    );

    const transformMatrix = this.group.transform.baseVal.consolidate().matrix;
    if (transformMatrix) {
      const newX = transformMatrix.e || 0;
      const newY = transformMatrix.f || 0;


      this.group.setAttribute("data-translateX", newX);
      this.group.setAttribute("data-translateY", newY);
    }
  }
}
