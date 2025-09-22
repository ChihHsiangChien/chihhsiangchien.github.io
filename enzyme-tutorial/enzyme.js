import { reactions } from "./enzyme-reactions.js";
import { temperatureToSpeed } from "./utils.js";


// --- 類別設計 ---
export class Enzyme {
  constructor(type, x, y, angle, denatureTemp = 50) {
    this.type = type; // 例如 'synthesisA', 'synthesisB', 'decompositionA' ...
    this.x = x;
    this.y = y;
    this.denatureTemp = denatureTemp;
    this.denatured = false;
    this.angle = angle;
    this.el = document.createElement("img");
    this.el.src = this.getIconSrc();
    this.el.className = "draggable enzyme";
    this.el.style.left = x + "px";
    this.el.style.top = y + "px";
    this.el.style.zIndex = 2;
    this.el.dataset.angle = angle;
    this.el.style.transform = `rotate(${angle}deg)`;
    canvas.appendChild(this.el);
    // 活化位
    this.activation = document.createElement("div");
    this.activation.className = "activation-site";
    /*
        this.activation.style.left = x + 'px';
        this.activation.style.top = y + 'px';
        */
    canvas.appendChild(this.activation);
    // 暫存已吸附的分子（for 多受質合成）
    this.boundMolecules = [];
    this.updateActivationPosition();
    // 布朗運動參數
    this.vx = 0;
    this.vy = 0;
    this.brownianTimer = null;
    this.brownianActive = true;
    this.randomizeVelocity();
  }
  getIconSrc() {
    // 從 reactions array 取得對應 type 的 active icon
    const rule = reactions.find((r) => r.type === this.type);
    if (rule && rule.enzymeActiveIcon) return rule.enzymeActiveIcon;
    return "enzyme_A_active.svg";
  }
  // 檢查溫度，超過即變性（不可逆）
  checkDenature(temp) {
    if (!this.denatured && temp >= this.denatureTemp) {
      this.denatured = true;
      this.el.src = this.getDenaturedIconSrc();
      // 釋放所有已結合的受質
      if (this.boundMolecules && this.boundMolecules.length > 0) {
        this.boundMolecules.forEach(m => {
          // 讓分子恢復可互動與布朗運動
          if (m.el) {
            m.el.style.pointerEvents = "auto";
            m.el.style.filter = "";         // 解除highlight
            m.startBrownian && m.startBrownian();
          }
        });
        this.boundMolecules = [];
      }
      this.el.style.filter = "";

      if (this.activation) {
        this.activation.remove();
        this.activation = null;
      }
    }
  } 

  getDenaturedIconSrc() {
    // 從 reactions array 取得對應 type 的 denatured icon
    const rule = reactions.find((r) => r.type === this.type);
    if (rule && rule.enzymeDenaturedIcon) return rule.enzymeDenaturedIcon;
    return "enzyme_denatured.svg";
  }

  updatePosition(x, y) {
    this.x = x;
    this.y = y;
    this.el.style.left = x + "px";
    this.el.style.top = y + "px";

    if (this.activation) {
      this.activation.style.left = x + "px";
      this.activation.style.top = y + "px";
      // 若有 updateActivationPosition 方法則呼叫，否則 fallback
      if (typeof this.updateActivationPosition === "function") {
        this.updateActivationPosition();
      } else {
        this.activation.style.left = x + "px";
        this.activation.style.top = y + "px";
      }
    }
    // 移動已結合的受質分子
    if (this.boundMolecules && this.boundMolecules.length > 0) {
      // 以酵素中心為基準
      const centerX = this.x + (this.el.width || 40) / 2;
      const centerY = this.y + (this.el.height || 40) / 2;
      this.boundMolecules.forEach((m, i) => {
        // 多受質時可稍微錯開
        const offset = 10 * i - (10 * (this.boundMolecules.length - 1)) / 2;
        m.updatePosition(
          centerX + offset - (m.el.width || 40) / 2,
          centerY - (m.el.height || 40) / 2
        );
      });
    }
  }
  updateActivationPosition() {
    if (!this.activation) return;
    // 設定活化位距離酵素中心 r 像素（可調整）
    const r = 1;
    const rad = ((this.angle || 0) * Math.PI) / 180;
    const centerX = this.x + this.el.width / 2;
    const centerY = this.y + this.el.height / 2;
    // 活化位在正上方（-90度），可依需求調整
    const ax =
      centerX +
      r * Math.cos(rad - Math.PI / 2) -
      this.activation.offsetWidth / 2;
    const ay =
      centerY +
      r * Math.sin(rad - Math.PI / 2) -
      this.activation.offsetHeight / 2;
    this.activation.style.left = ax + "px";
    this.activation.style.top = ay + "px";
  }
  setAngle(angle) {
    this.angle = angle;
    this.el.dataset.angle = angle;
    this.el.style.transform = `rotate(${angle}deg)`;
    this.updateActivationPosition();
  }
  remove() {
    this.el.remove();
    if (this.activation) this.activation.remove();
  }

  randomizeVelocity(temp, speedRatio) {
    const speed = temperatureToSpeed(temp) * speedRatio;
    const angle = Math.random() * 2 * Math.PI;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  startBrownian() {
    this.brownianActive = true;

  }

  stopBrownian() {
    this.brownianActive = false;
  }
}
