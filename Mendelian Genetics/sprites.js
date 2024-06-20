class Sprite {
  constructor(id, x, y, r, alleles) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.r = r;
    this.alleles = alleles;

    this.color = this.determineColor();
    this.z = 0; // Z attribute to keep track of z-order

    this.svgNS = "http://www.w3.org/2000/svg";
    this.init(x, y);
  }

  async init(translateX, translateY) {
    await this.createSprite(translateX, translateY);
    this.setDraggable();
  }

  determineColor() {
    return this.alleles.includes("A") ? "blue" : "yellow";
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
        "transform",
        `translate(${translateX},${translateY})`
      );
      this.group.querySelector("#face").setAttribute("fill", this.color);
      this.group.querySelector("#alleles-text").textContent = this.alleles;

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
