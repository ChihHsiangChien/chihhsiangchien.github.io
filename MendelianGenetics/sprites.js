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

      // 設定表現型
      this.group.querySelector("#face").setAttribute("fill", this.faceColor);

      // Set alleles text content
      this.setAllelesText();
      
      // Hide the alleles-text initially
      this.group.querySelector("#alleles-text").style.display = "none";

      document
        .getElementById("toggleAllelesButton")
        .addEventListener("click", () => {
          this.toggleAllelesText();
        });

      // Set face color
      this.setFaceColor();

      // Set eyeball
      this.setEyeball();

      this.setTail();

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
    const faceColor = hasDominantAllele ? "blue" : "yellow";
    this.group.querySelector("#face").setAttribute("fill", faceColor);
  }

  setEyeball() {
    // 只要是 bb ~ 隱性遺傳
    const alleles = this.chromosomes.flatMap(
      (chromosome) => chromosome.alleles
    );
    const countB = alleles.filter((allele) => allele === "b").length;

    if (countB === 2) {
      // Replace left eyeball with a line
      const leftEyeball = this.group.querySelector("#left-eyeball");
      const leftLine = document.createElementNS(this.svgNS, "line");
      leftLine.setAttribute("x1", "-20");
      leftLine.setAttribute("y1", "-16");
      leftLine.setAttribute("x2", "-10");
      leftLine.setAttribute("y2", "-16");
      leftLine.setAttribute("stroke", "black");
      leftLine.setAttribute("stroke-width", "2");
      leftEyeball.replaceWith(leftLine);

      // Replace right eyeball with a line
      const rightEyeball = this.group.querySelector("#right-eyeball");
      const rightLine = document.createElementNS(this.svgNS, "line");
      rightLine.setAttribute("x1", "20");
      rightLine.setAttribute("y1", "-16");
      rightLine.setAttribute("x2", "10");
      rightLine.setAttribute("y2", "-16");
      rightLine.setAttribute("stroke", "black");
      rightLine.setAttribute("stroke-width", "2");
      rightEyeball.replaceWith(rightLine);
    }
  }

  setTail() {
    // 只要有 C ~ 顯性遺傳
    const hasDominantAllele = this.chromosomes.some((chromosome) =>
      chromosome.alleles.includes("C")
    );

    if (hasDominantAllele) {
      //const sprite = this.group.querySelectorAll('.sprite');
      const faceElement = this.group.querySelector("#face");
      console.log();
      if (faceElement) {
        //setAttribute("fill", faceColor);
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

  getGroup() {
    return this.group;
  }

  setDraggable() {
    let offsetX, offsetY, transform;

    const getMainSvg = () =>
      document.getElementById("svgContainer").querySelector("svg");

    const startDragging = (e, isTouch = false) => {
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
      e.preventDefault(); // Prevent default touch events
      startDragging(e, true);
    };

    this.group.addEventListener("mousedown", onMouseDown);
    this.group.addEventListener("touchstart", onTouchStart);
    this.group.style.cursor = "grab";
  }

  updateTransform(dx, dy, transform) {
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
