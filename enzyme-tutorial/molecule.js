import { reactions } from "./enzyme-reactions.js";
import { temperatureToSpeed } from "./utils.js";

export class Molecule {
  constructor(type, x, y, angle) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.el = document.createElement("img");
    this.el.src = this.getIconSrc();
    this.el.className = "draggable molecule";
    this.el.style.left = x + "px";
    this.el.style.top = y + "px";
    this.el.style.zIndex = 2;
    this.el.dataset.angle = angle;
    this.el.style.transform = `rotate(${angle}deg)`;
    canvas.appendChild(this.el);
    // 布朗運動參數
    this.vx = 0;
    this.vy = 0;
    this.brownianTimer = null;
    this.brownianActive = true;
    this.randomizeVelocity();
  }

  randomizeVelocity(temp) {
    const speed = temperatureToSpeed(temp);
    const angle = Math.random() * 2 * Math.PI;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  getIconSrc() {
    // 從 reactions array 找到有此 type 的反應，並取對應 icon
    for (const rule of reactions) {
      const idx = rule.substrates.indexOf(this.type);
      if (idx !== -1 && rule.substrateIcons && rule.substrateIcons[idx]) {
        return rule.substrateIcons[idx];
      }
      // 產物也可能有 icon
      const prodIdx = rule.products.indexOf(this.type);
      if (prodIdx !== -1 && rule.productIcons && rule.productIcons[prodIdx]) {
        return rule.productIcons[prodIdx];
      }
    }
    return this.type + ".svg"; // fallback
  }

  updatePosition(x, y) {
    this.x = x;
    this.y = y;
    this.el.style.left = x + "px";
    this.el.style.top = y + "px";
  }

  startBrownian() {
    this.brownianActive = true;
  }

  stopBrownian() {
    this.brownianActive = false;
  }

  setAngle(angle) {
    this.angle = angle;
    this.el.dataset.angle = angle;
    this.el.style.transform = `rotate(${angle}deg)`;
  }

  remove() {
    this.el.remove();
  }

  setAngle(angle) {
    this.angle = angle;
    this.el.dataset.angle = angle;
    this.el.style.transform = `rotate(${angle}deg)`;
  }
  remove() {
    this.el.remove();
  }
}
