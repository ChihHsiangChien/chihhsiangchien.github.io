class Sprite {
  constructor(id, x, y, r, chromosomes) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.r = r;
    this.chromosomes = chromosomes; // An array of chromosome objects
    //this.faceColor = this.determineFaceColor();
    this.z = 0; // Z attribute to keep track of z-order

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

      // Set face color
      this.setFaceColor();

      // Set eyeball
      this.setEyeball();

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

  setFaceColor() {
    const hasDominantAllele = this.chromosomes.some((chromosome) =>
      chromosome.alleles.includes("A")
    );
    const faceColor = hasDominantAllele ? "blue" : "yellow";
    this.group.querySelector("#face").setAttribute("fill", faceColor);
  }

  setEyeball() {
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

  getGroup() {
    return this.group;
  }

  setDraggable() {
    let offsetX, offsetY, transform;
    const onMouseMove = (e) => {
      const dx = e.clientX - offsetX;
      const dy = e.clientY - offsetY;
      this.group.setAttribute(
        "transform",
        `translate(${dx}, ${dy}) ${transform}`
      );
      // Get the current transformation matrix
      const transformMatrix = this.group.transform.baseVal.consolidate().matrix;

      // Update data-translateX and data-translateY attributes
      if (transformMatrix) {
        const newX = transformMatrix.e || 0;
        const newY = transformMatrix.f || 0;
        this.group.setAttribute("data-translateX", newX);
        this.group.setAttribute("data-translateY", newY);
      }
    };

    this.group.addEventListener("mousedown", (e) => {
      const mainSvg = document
        .getElementById("svgContainer")
        .querySelector("svg");
      if (mainSvg) {
        mainSvg.appendChild(this.group);
      }

      offsetX = e.clientX;
      offsetY = e.clientY;
      const transformMatrix = this.group.getCTM();
      transform = transformMatrix
        ? `matrix(${transformMatrix.a}, ${transformMatrix.b}, ${transformMatrix.c}, ${transformMatrix.d}, ${transformMatrix.e}, ${transformMatrix.f})`
        : "";
      this.group.style.cursor = "grabbing";

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener(
        "mouseup",
        () => {
          document.removeEventListener("mousemove", onMouseMove);
          this.group.style.cursor = "grab";
        },
        { once: true }
      );
    });

    this.group.style.cursor = "grab";
  }
}
