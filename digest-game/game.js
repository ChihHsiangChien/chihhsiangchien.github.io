/**
 * 人體消化大冒險 (Digest Game)
 * Core Game Engine & Scientific Simulation Logic
 */

// --- Web Audio Synthesizer (Zero External Dependencies) ---
class SoundController {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playSpray(freq = 400) {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.35);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }

  playDigested() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  playEmulsify() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(400, now);
      osc1.frequency.linearRampToValueAtTime(700, now + 0.25);
      osc2.frequency.setValueAtTime(405, now);
      osc2.frequency.linearRampToValueAtTime(710, now + 0.25);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.28);
      osc2.stop(now + 0.28);
    } catch (e) {}
  }

  playAbsorbed() {
    if (this.muted || !this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const now = this.ctx.currentTime + idx * 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      });
    } catch (e) {}
  }

  playFail() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  playInvalidTarget() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  playBacteria() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.16);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }
}

// --- Particle Effects System ---
class Particle {
  constructor(x, y, vx, vy, color, size, life, shape = 'circle') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.shape = shape;
  }

  update(dt, canvasWidth, canvasHeight) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.life -= dt;

    // Confine particles strictly within the mucosal walls of the digestive canal!
    if (canvasWidth && canvasHeight && typeof getTractProfile === 'function') {
      const r = Math.max(0, Math.min(1, this.x / canvasWidth));
      const p = getTractProfile(r, canvasHeight);
      if (this.y < p.topY + 3) {
        this.y = p.topY + 3;
        this.vy = Math.abs(this.vy) * 0.4;
      } else if (this.y > p.botY - 3) {
        this.y = p.botY - 3;
        this.vy = -Math.abs(this.vy) * 0.4;
      }
    }
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = this.color;

    if (this.shape === 'star') {
      ctx.translate(this.x, this.y);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(Math.cos((18 + i * 72) * 0.0174) * this.size, -Math.sin((18 + i * 72) * 0.0174) * this.size);
        ctx.lineTo(Math.cos((54 + i * 72) * 0.0174) * (this.size * 0.45), -Math.sin((54 + i * 72) * 0.0174) * (this.size * 0.45));
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// --- Floating Toast on Canvas ---
class FloatingText {
  constructor(x, y, text, color = '#38bdf8', isBig = false) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 1.3;
    this.maxLife = 1.3;
    this.isBig = isBig;
  }

  update(dt) {
    this.y -= 25 * dt;
    this.life -= dt;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.font = this.isBig ? 'bold 15px Outfit, sans-serif' : 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    
    // Background pill badge
    const metrics = ctx.measureText(this.text);
    const bgWidth = metrics.width + 16;
    const bgHeight = this.isBig ? 24 : 18;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(this.x - bgWidth / 2, this.y - bgHeight / 2 - 2, bgWidth, bgHeight, 10);
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y + 4);
    ctx.restore();
  }
}

// --- Anatomical Digestive Canal Continuous Profile Definition (7 Equal Sections) ---
function getTractProfile(xRatio, height) {
  const midY = height * 0.52;
  let centerY = midY;
  let topH = 32;
  let botH = 32;

  if (xRatio < 0.143) {
    // 1. 口腔 (0.000 ~ 0.143): 寬敞漏斗狀入口，由寬平滑收窄至咽部
    const t = Math.max(0, Math.min(1, xRatio / 0.143));
    const w = 46 - t * 14; // 46px -> 32px
    centerY = midY;
    topH = w;
    botH = w;
  } else if (xRatio < 0.286) {
    // 2. 食道 (0.143 ~ 0.286): 平滑肌輸送管道 (半寬 32px，總腔寬 64px)
    centerY = midY;
    topH = 32;
    botH = 32;
  } else if (xRatio < 0.429) {
    // 3. 胃 (0.286 ~ 0.429): 寬大的 J 型膨大囊袋 (上隆下凹胃大彎)
    const t = Math.max(0, Math.min(1, (xRatio - 0.286) / 0.143));
    const curve = Math.sin(t * Math.PI);
    centerY = midY + curve * 14;
    topH = 32 + curve * 36; // 隆起至 ~68px
    botH = 32 + curve * 54; // 凹陷至 ~86px
  } else if (xRatio < 0.571) {
    // 4. 小腸前段 (十二指腸 0.429 ~ 0.571): 肝臟膽汁乳化區
    const t = Math.max(0, Math.min(1, (xRatio - 0.429) / 0.143));
    centerY = midY;
    const w = 32 + t * 3; // 32px -> 35px
    topH = w;
    botH = w;
  } else if (xRatio < 0.714) {
    // 5. 小腸中段 (0.571 ~ 0.714): 胰液水解主要作用區
    centerY = midY;
    topH = 35;
    botH = 35;
  } else if (xRatio < 0.857) {
    // 6. 小腸後段 (0.714 ~ 0.857): 腸腺收尾水解與絨毛吸收區
    centerY = midY;
    topH = 35;
    botH = 35;
  } else {
    // 7. 大腸 (0.857 ~ 1.000): 寬闊結腸，具 3 段結腸袋 (Haustra) 膨突波形
    centerY = midY;
    const t = Math.max(0, Math.min(1, (xRatio - 0.857) / 0.143));
    const haustra = Math.sin(t * Math.PI * 3);
    const w = 38 + Math.max(0, haustra) * 14; // 38px -> 52px 囊袋
    topH = w;
    botH = w;
  }

  return { centerY, topY: centerY - topH, botY: centerY + botH, topH, botH };
}

// --- Nutrient Molecule Entity ---
class Nutrient {
  constructor(type, x, y, speed, laneOffset = 0) {
    this.type = type; // 'starch' | 'protein' | 'lipid' | 'glycerol' | 'fatty_acid' | 'cellulose'
    this.stage = 0;   // 0: Big, 1: Medium, 2: Small, 3: Absorbed
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.laneOffset = laneOffset;
    this.angle = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 2 + Math.random() * 2;
    this.absorbedProgress = 0;
    this.isDead = false;
    this.isMediumDroplet = false;
    this.bacteriaTargetRelX = 0.875 + Math.random() * 0.095; // 隨機在大腸袋間分佈被細菌攝取位置

    this.subDroplets = [
      { ox: -7, oy: -5, r: 4.5 },
      { ox: 6, oy: -6, r: 5 },
      { ox: -4, oy: 6, r: 4.5 },
      { ox: 7, oy: 5, r: 4 },
      { ox: 0, oy: 0, r: 5.5 }
    ];

    // Wave collision tracker to prevent duplicate hits and spam
    this.processedWaveId = null;
    this.warnedWaveId = null;
  }

  getRadius() {
    if (this.type === 'cellulose') return 16;
    if (this.stage === 0) return 17;
    if (this.stage === 1) return this.isMediumDroplet ? 11 : 13;
    return 10;
  }

  getName() {
    if (this.type === 'cellulose') {
      return '纖維素 (膳食纖維)';
    } else if (this.type === 'starch') {
      if (this.stage === 0) return '澱粉 (大)';
      if (this.stage === 1) return '麥芽糖 (中)';
      return '葡萄糖 (小)';
    } else if (this.type === 'protein') {
      if (this.stage === 0) return '蛋白質 (大)';
      if (this.stage === 1) return '多肽鏈 (中)';
      return '胺基酸 (小)';
    } else if (this.type === 'lipid') {
      if (this.stage === 0) return '大油滴 (大)';
      if (this.isMediumDroplet) return '中油滴 (中)';
      return '乳化小油滴 (中)';
    } else if (this.type === 'glycerol') {
      return '甘油 (小)';
    } else if (this.type === 'fatty_acid') {
      return '脂肪酸 (小)';
    }
    return '';
  }

  update(dt, canvasWidth, canvasHeight, speedMultiplier = 1) {
    this.angle += this.wobbleSpeed * dt * speedMultiplier;

    if (canvasWidth && canvasHeight && typeof getTractProfile === 'function') {
      const relX = Math.max(0, Math.min(1, this.x / canvasWidth));
      const profile = getTractProfile(relX, canvasHeight);
      const molRadius = this.getRadius();

      if (this.stage === 3) {
        // Absorption animation: float smoothly upward towards mucosal villi
        this.absorbedProgress += dt * 1.5 * speedMultiplier;
        this.y -= dt * 40 * speedMultiplier;
        if (this.y < profile.topY + molRadius + 2) {
          this.y = profile.topY + molRadius + 2;
        }
        if (this.absorbedProgress >= 1) {
          this.isDead = true;
        }
        return;
      }

      // Safe wobble amplitude strictly tailored to local lumen dimensions
      const availableLumen = Math.min(profile.topH, profile.botH) - molRadius - 8;
      const safeWobble = Math.max(1, Math.min(5, availableLumen * 0.35));

      // Target position along organ continuous anatomical centerline plus lane offset
      const targetBaseY = profile.centerY + this.laneOffset;
      this.y = targetBaseY + Math.sin(this.angle) * safeWobble;

      // Absolute strict bounding clamp: [y - molRadius, y + molRadius] stays within [topY + 5, botY - 5]
      const minY = profile.topY + molRadius + 5;
      const maxY = profile.botY - molRadius - 5;
      if (this.y < minY) this.y = minY;
      if (this.y > maxY) this.y = maxY;
    }

    this.x += this.speed * dt * 60 * speedMultiplier;
  }

  draw(ctx, canvasWidth, canvasHeight, skipLabel = false) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.stage === 3) {
      ctx.globalAlpha = Math.max(0, 1 - this.absorbedProgress);
      ctx.scale(1 + this.absorbedProgress * 0.3, 1 + this.absorbedProgress * 0.3);
    }

    // Outer Glow if absorbed state
    if (this.stage === 2) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#fef08a';
    }

    // Render based on nutrient type and stage
    if (this.type === 'starch') {
      this.drawStarch(ctx);
    } else if (this.type === 'protein') {
      this.drawProtein(ctx);
    } else if (this.type === 'lipid') {
      this.drawLipid(ctx);
    } else if (this.type === 'glycerol') {
      this.drawGlycerol(ctx);
    } else if (this.type === 'fatty_acid') {
      this.drawFattyAcid(ctx);
    } else if (this.type === 'cellulose') {
      this.drawCellulose(ctx);
    }

    ctx.restore();

    // Text Label (when drawn individually)
    if (!skipLabel && this.stage !== 3 && canvasWidth && canvasHeight) {
      this.drawLabel(ctx, canvasWidth, canvasHeight);
    }
  }

  drawLabel(ctx, canvasWidth, canvasHeight, customX = null, customY = null) {
    const lx = customX !== null ? customX : this.x;
    const ly = customY !== null ? customY : this.y;
    const relX = Math.max(0, Math.min(1, lx / canvasWidth));
    const profile = getTractProfile(relX, canvasHeight);
    const molRadius = this.getRadius();
    const name = this.getName();

    ctx.save();
    ctx.font = '800 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    const textWidth = ctx.measureText(name).width;

    // Choose whether label goes above or below molecule depending on available vertical space in lumen
    let labelY = ly + molRadius + 14;
    if (labelY + 9 > profile.botY) {
      labelY = ly - molRadius - 10;
    }
    // Strict clamp so label box never penetrates tract borders
    labelY = Math.max(profile.topY + 12, Math.min(profile.botY - 8, labelY));

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(lx - textWidth / 2 - 6, labelY - 11, textWidth + 12, 18, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, lx, labelY + 2.8);
    ctx.restore();
  }

  // Helper: Single Glucose Monomer Unit (六角環吡喃糖單體)
  drawGlucoseMonomer(ctx, x, y, angleOffset = 0, radius = 6.4) {
    ctx.save();
    ctx.translate(x, y);

    // Glucose Pyranose Ring
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let j = 0; j < 6; j++) {
      const a = (j * Math.PI) / 3 + angleOffset;
      const px = Math.cos(a) * radius;
      const py = Math.sin(a) * radius;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central core sparkling highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Helper: Single Amino Acid Monomer Unit (球體胺基酸單體)
  drawAminoAcidMonomer(ctx, x, y, radius = 5.4) {
    ctx.save();
    ctx.translate(x, y);

    // Amino Acid spherical bead
    ctx.fillStyle = '#10b981';
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3D Specular reflection highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(-radius * 0.32, -radius * 0.32, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawStarch(ctx) {
    if (this.stage === 0) {
      // Starch (Big): Poly-glucose macromolecule (6 identical Glucose monomers chained in a hex-ring)
      const ringRadius = 10;
      const count = 6;

      // Glycosidic bonds between monomers
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = 0; i <= count; i++) {
        const rad = (i * Math.PI * 2) / count + this.angle * 0.2;
        const hx = Math.cos(rad) * ringRadius;
        const hy = Math.sin(rad) * ringRadius;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.stroke();

      // 6 Identical Glucose monomers
      for (let i = 0; i < count; i++) {
        const rad = (i * Math.PI * 2) / count + this.angle * 0.2;
        const hx = Math.cos(rad) * ringRadius;
        const hy = Math.sin(rad) * ringRadius;
        this.drawGlucoseMonomer(ctx, hx, hy, rad, 6.4);
      }

    } else if (this.stage === 1) {
      // Maltose (Medium): Exactly 2 identical Glucose monomers bonded together (Disaccharide)
      const d = 7.5;

      // Glycosidic bond bridge between the two glucose rings
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-d + 3, 0);
      ctx.lineTo(d - 3, 0);
      ctx.stroke();

      // Glycosidic oxygen bridge node (α-1,4 糖苷鍵)
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      // 2 Identical Glucose monomers
      this.drawGlucoseMonomer(ctx, -d, 0, this.angle * 0.2, 6.6);
      this.drawGlucoseMonomer(ctx, d, 0, -this.angle * 0.2, 6.6);

    } else {
      // Glucose (Small): Exactly 1 single Glucose monomer unit (Monosaccharide)
      ctx.save();
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10;
      this.drawGlucoseMonomer(ctx, 0, 0, this.angle * 0.4, 7.0);
      ctx.restore();
    }
  }

  drawProtein(ctx) {
    if (this.stage === 0) {
      // Protein (Big): Folded globular macromolecule (8 identical Amino Acid monomers knotted)
      const knots = [
        { x: -10, y: -7 },
        { x: 0, y: -11 },
        { x: 10, y: -7 },
        { x: 11, y: 3 },
        { x: 4, y: 10 },
        { x: -7, y: 9 },
        { x: -11, y: 1 },
        { x: 0, y: 0 }
      ];

      // Polypeptide backbone threading through all amino acid monomers
      ctx.strokeStyle = 'rgba(167, 243, 208, 0.7)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      knots.forEach((k, idx) => {
        if (idx === 0) ctx.moveTo(k.x, k.y);
        else ctx.lineTo(k.x, k.y);
      });
      ctx.closePath();
      ctx.stroke();

      // 8 Identical Amino Acid beads
      knots.forEach((k) => {
        this.drawAminoAcidMonomer(ctx, k.x, k.y, 5.2);
      });

    } else if (this.stage === 1) {
      // Polypeptide (Medium): 4 identical Amino Acid monomers connected by peptide bonds
      const beads = [
        { x: -13.5, y: 0 },
        { x: -4.5, y: 0 },
        { x: 4.5, y: 0 },
        { x: 13.5, y: 0 }
      ];
      // Wave motion along peptide chain
      const pos = beads.map((b, idx) => ({
        x: b.x,
        y: Math.sin(this.angle * 1.5 + idx * 1.2) * 2.8
      }));

      // Peptide backbone line
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      pos.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // 4 Identical Amino Acid beads
      pos.forEach((p) => {
        this.drawAminoAcidMonomer(ctx, p.x, p.y, 5.4);
      });

    } else {
      // Amino Acid (Small): Exactly 1 single Amino Acid monomer bead
      ctx.save();
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 10;
      this.drawAminoAcidMonomer(ctx, 0, 0, 6.4);
      ctx.restore();
    }
  }

  drawLipid(ctx) {
    if (this.stage === 0) {
      // Lipid (Big): Giant glistening golden oil droplet
      ctx.fillStyle = '#eab308';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Organic droplet wobble
      for (let i = 0; i < 16; i++) {
        const rad = (i * Math.PI * 2) / 16;
        const dist = 15 + Math.sin(rad * 3 + this.angle * 2) * 1.5;
        const px = Math.cos(rad) * dist;
        const py = Math.sin(rad) * dist;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gleam highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(-5, -5, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.stage === 1) {
      if (this.isMediumDroplet) {
        // Medium oil droplet (中油滴): A solid medium golden droplet (radius ~10.5)
        ctx.fillStyle = '#eab308';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const rad = (i * Math.PI * 2) / 16;
          const dist = 10.5 + Math.sin(rad * 3 + this.angle * 2) * 1.0;
          const px = Math.cos(rad) * dist;
          const py = Math.sin(rad) * dist;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Gleam highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(-3, -3, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Emulsified lipid (Medium): Cluster of tiny dispersed micro-droplets
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#fef9c3';
        ctx.lineWidth = 1.3;
        this.subDroplets.forEach((d, idx) => {
          const jx = d.ox + Math.sin(this.angle * 3 + idx) * 1.5;
          const jy = d.oy + Math.cos(this.angle * 3 + idx) * 1.5;
          ctx.beginPath();
          ctx.arc(jx, jy, d.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
      }
    }
  }

  drawGlycerol(ctx) {
    // Glycerol (甘油): 3-carbon hydrophilic alcohol (3 connected sky-blue spheres)
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 1.8;
    const offsets = [-7, 0, 7];
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.stroke();
    offsets.forEach((ox) => {
      ctx.beginPath();
      ctx.arc(ox, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    // Sparkling polar center
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFattyAcid(ctx) {
    // Fatty Acid (脂肪酸): Polar carboxyl head + lipophilic hydrocarbon zigzag tail
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 1.8;
    // Carboxyl polar head
    ctx.beginPath();
    ctx.arc(-6, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Hydrocarbon tail
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-1, 0);
    ctx.lineTo(3, -3);
    ctx.lineTo(8, 3);
    ctx.lineTo(13, -1);
    ctx.stroke();
  }

  drawCellulose(ctx) {
    // Cellulose (膳食纖維): Parallel β-1,4-glucan chains linked by cross-strand hydrogen bonds
    ctx.save();
    ctx.rotate(this.angle * 0.12);

    // Subtle emerald outer bio-glow
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 9;

    const strandY = [-6, 6];
    const nodeCount = 3;
    const spacing = 11;

    // Cross-linking hydrogen bonds (跨鏈氫鍵虛線)
    ctx.strokeStyle = 'rgba(167, 243, 208, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 2]);
    for (let i = 0; i < nodeCount; i++) {
      const nx = (i - 1) * spacing;
      ctx.beginPath();
      ctx.moveTo(nx, strandY[0]);
      ctx.lineTo(nx, strandY[1]);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Two parallel β-glucan polysaccharide strands
    strandY.forEach((sy, sIdx) => {
      // Backbone fiber line
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-spacing * 1.3, sy);
      ctx.lineTo(spacing * 1.3, sy);
      ctx.stroke();

      // β-glucose monomer units along the strand (alternating stereochemistry)
      for (let i = 0; i < nodeCount; i++) {
        const nx = (i - 1) * spacing;
        ctx.save();
        ctx.translate(nx, sy);

        // β-glucose pyranose ring (emerald hex-ring)
        ctx.fillStyle = sIdx === 0 ? '#22c55e' : '#16a34a';
        ctx.strokeStyle = '#a7f3d0';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const a = (j * Math.PI) / 3 + (i % 2 === 0 ? 0 : Math.PI / 6);
          const px = Math.cos(a) * 4.6;
          const py = Math.sin(a) * 4.6;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Monomer core gleam
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-1, -1, 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    });

    ctx.restore();
  }
}

// --- Main Game Engine ---
class DigestGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundController();

    // Game State
    this.mode = 'beginner'; // 'beginner' | 'intermediate' | 'auto'
    this.isAutoMode = false;
    this.hp = 100;
    this.score = 0;
    this.absorbedCount = 0;
    this.targetAbsorbed = 10;
    this.isGameOver = false;
    this.isVictory = false;

    // Organ Zones (relative 0.0 ~ 1.0, 7 Equal Sections)
    this.zones = {
      mouth: { start: 0.000, end: 0.143, name: '口腔' },
      esophagus: { start: 0.143, end: 0.286, name: '食道' },
      stomach: { start: 0.286, end: 0.429, name: '胃' },
      duodenum: { start: 0.429, end: 0.571, name: '小腸前段' },
      midIntestine: { start: 0.571, end: 0.714, name: '小腸中段' },
      lateIntestine: { start: 0.714, end: 0.857, name: '小腸後段' },
      colon: { start: 0.857, end: 1.000, name: '大腸' }
    };

    // Gland Spray State (5 Charges Ammo System with 1.5s recharge and skill refill)
    this.glands = {
      salivary: {
        name: '唾腺',
        maxCharges: 5,
        charges: 5,
        rechargeTimer: 0,
        rechargeRate: 1.5,
        activeTimer: 0,
        range: [0.01, 0.143],
        color: 'rgba(56, 189, 248, 0.45)',
        particleColor: '#38bdf8'
      },
      gastric: {
        name: '胃腺',
        maxCharges: 5,
        charges: 5,
        rechargeTimer: 0,
        rechargeRate: 1.5,
        activeTimer: 0,
        range: [0.286, 0.429],
        color: 'rgba(163, 230, 53, 0.45)',
        particleColor: '#a3e635'
      },
      liver: {
        name: '肝臟',
        maxCharges: 5,
        charges: 5,
        rechargeTimer: 0,
        rechargeRate: 1.5,
        activeTimer: 0,
        range: [0.429, 0.571],
        color: 'rgba(34, 197, 94, 0.45)',
        particleColor: '#22c55e'
      },
      pancreas: {
        name: '胰臟',
        maxCharges: 5,
        charges: 5,
        rechargeTimer: 0,
        rechargeRate: 1.5,
        activeTimer: 0,
        range: [0.571, 0.714],
        color: 'rgba(245, 158, 11, 0.45)',
        particleColor: '#f59e0b'
      },
      intestinal: {
        name: '腸腺',
        maxCharges: 5,
        charges: 5,
        rechargeTimer: 0,
        rechargeRate: 1.5,
        activeTimer: 0,
        range: [0.714, 0.857],
        color: 'rgba(192, 132, 252, 0.45)',
        particleColor: '#c084fc'
      }
    };

    // Entities & VFX
    this.nutrients = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spawnTimer = 0;
    this.sprayWaveCounter = 0;
    this.targetNutrientType = 'random'; // 'random', 'starch', 'protein', 'lipid', 'cellulose'
    this.speedMultiplier = 2.0;         // Global movement speed multiplier (0.5x ~ 2.0x)
    this.lastTime = performance.now();

    // DOM Bindings & Tablet Touch Safeguards
    this.bindDOM();
    this.initTouchSafeguards();
    this.resizeCanvas();
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      window.scrollTo(0, 0);
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.resizeCanvas();
        window.scrollTo(0, 0);
      }, 150);
    });

    // Start Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  initTouchSafeguards() {
    // 1. Prevent iOS gesture zooming (pinch-to-zoom)
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

    // 2. Prevent multi-touch pinch gestures
    document.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // 3. Prevent double-tap to zoom on entire page
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = performance.now();
      if (now - lastTouchEnd <= 320) {
        if (e.cancelable) e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });

    // 4. Ensure viewport stays locked at (0, 0) so controls and HUD are never cropped or scrolled away
    window.addEventListener('scroll', () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    });
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
  }

  bindDOM() {
    const addFastAction = (id, handler) => {
      const el = document.getElementById(id);
      if (!el) return;
      let lastTrigger = 0;
      const doAction = (e) => {
        const now = performance.now();
        if (now - lastTrigger < 120) return;
        lastTrigger = now;
        this.sound.init();
        handler(e);
      };
      el.addEventListener('pointerdown', (e) => {
        if (e.cancelable) e.preventDefault();
        doAction(e);
      });
      el.addEventListener('click', (e) => {
        doAction(e);
      });
    };

    // Mode toggles
    addFastAction('btnBeginner', () => this.setMode('beginner'));
    addFastAction('btnIntermediate', () => this.setMode('intermediate'));
    addFastAction('btnAuto', () => {
      if (this.mode === 'auto') {
        this.setMode('beginner');
      } else {
        this.setMode('auto');
      }
    });

    // Keyboard shortcuts for Accessibility and Fast Demonstration
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (this.mode === 'auto') {
          this.setMode('beginner');
        } else {
          this.setMode('auto');
        }
      } else if (e.key === '1') {
        this.triggerGland('salivary');
      } else if (e.key === '2') {
        this.triggerGland('gastric');
      } else if (e.key === '3') {
        this.triggerGland('liver');
      } else if (e.key === '4') {
        this.triggerGland('pancreas');
      } else if (e.key === '5') {
        this.triggerGland('intestinal');
      } else if (e.key === 'r' || e.key === 'R') {
        this.restart();
      }
    });

    // Sound toggle
    addFastAction('btnMute', () => {
      const isMuted = this.sound.toggleMute();
      document.getElementById('btnMute').innerHTML = isMuted ? '靜音' : '音效';
    });

    // Reset button
    addFastAction('btnReset', () => this.restart());
    addFastAction('btnRestartModal', () => {
      document.getElementById('modalResult').classList.remove('open');
      this.restart();
    });

    // Gland buttons (Ultra-responsive pointerdown without 300ms delay & immune to double-tap zoom)
    const glandKeys = ['salivary', 'gastric', 'liver', 'pancreas', 'intestinal'];
    glandKeys.forEach((key) => {
      addFastAction(`btn-${key}`, () => {
        this.triggerGland(key);
      });
    });

    // Teaching Practice Focus Nutrient Selector
    const selectNutrient = document.getElementById('selectNutrient');
    if (selectNutrient) {
      selectNutrient.addEventListener('change', (e) => {
        this.sound.init();
        this.setTargetNutrient(e.target.value);
      });
    }

    // Movement Speed Control
    const selectSpeed = document.getElementById('selectSpeed');
    if (selectSpeed) {
      selectSpeed.addEventListener('change', (e) => {
        this.sound.init();
        this.setSpeedMultiplier(parseFloat(e.target.value) || 1.0);
      });
    }

    // First interaction audio unlock
    window.addEventListener('pointerdown', () => this.sound.init(), { once: true });
  }

  setSpeedMultiplier(mult) {
    this.speedMultiplier = mult;
    const names = {
      0.5: '🐢 0.5x 慢速教學',
      0.75: '🚶 0.75x 慢速',
      1.0: '⚡ 1.0x 標準速度',
      1.5: '🚀 1.5x 快速挑戰',
      2.0: '🔥 2.0x 極速狂飆'
    };
    const desc = names[mult] || `${mult}x`;

    const centerX = this.width ? this.width * 0.45 : 300;
    const centerY = this.height ? this.height * 0.35 : 120;
    this.floatingTexts.push(new FloatingText(centerX, centerY, `⚡ 移動速度已設為：${desc}`, '#38bdf8'));
    this.sound.playDigested();
  }

  setTargetNutrient(type) {
    this.targetNutrientType = type;
    const names = {
      random: '隨機出現 (綜合測驗)',
      starch: '澱粉 (醣類)',
      protein: '蛋白質',
      lipid: '脂質 (大油滴)',
      cellulose: '纖維素 (無法分解)'
    };
    const name = names[type] || type;

    // Visual Floating text on canvas to give instant feedback to students/teachers
    const centerX = this.width ? this.width * 0.45 : 300;
    const centerY = this.height ? this.height * 0.35 : 120;
    const msg = type === 'random' ? `🎲 已恢復：隨機生成養分` : `🎯 教學練習：持續生成【${name}】`;
    this.floatingTexts.push(new FloatingText(centerX, centerY, msg, type === 'random' ? '#38bdf8' : '#fbbf24'));

    // Sound feedback
    this.sound.playDigested();

    // Instant spawn or update for seamless classroom demonstration
    if (this.nutrients.length === 0) {
      this.spawnNutrient();
    } else if (this.mode === 'beginner' && this.nutrients.length === 1 && this.nutrients[0].x < 0.18 * this.width && this.nutrients[0].stage === 0) {
      if (type !== 'random') {
        const speed = this.nutrients[0].speed;
        const profile = getTractProfile(0, this.height);
        this.nutrients = [new Nutrient(type, this.nutrients[0].x, profile.centerY, speed)];
      }
    }
  }

  setMode(mode, forceRestart = true) {
    this.mode = mode;
    this.isAutoMode = (mode === 'auto');

    if (mode === 'beginner') {
      this.targetAbsorbed = 10;
    } else if (mode === 'intermediate') {
      this.targetAbsorbed = 25;
    } else {
      this.targetAbsorbed = Infinity;
    }

    if (forceRestart || this.isGameOver || this.isVictory) {
      this.restart();
    } else {
      this.updateHUD();
    }

    const centerX = this.width ? this.width * 0.45 : 300;
    const centerY = this.height ? this.height * 0.35 : 120;
    if (this.isAutoMode) {
      this.floatingTexts.push(new FloatingText(centerX, centerY, '🤖 已啟動【無限自動演示】：消化腺將持續自動反應！', '#10b981', true));
      this.sound.playDigested();
      if (this.nutrients.length === 0) {
        this.spawnNutrient();
      }
    } else {
      const modeName = mode === 'beginner' ? '初階教學' : '中階挑戰';
      this.floatingTexts.push(new FloatingText(centerX, centerY, `🎮 已切換至【${modeName}】：請手動點擊消化腺`, '#38bdf8'));
      this.sound.playDigested();
    }
  }

  reset() {
    this.restart();
  }

  restart() {
    this.hp = 100;
    this.score = 0;
    this.absorbedCount = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.nutrients = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spawnTimer = 0;
    this.sprayWaveCounter = 0;
    this.peristalsisDistance = 0;

    Object.keys(this.glands).forEach((k) => {
      this.glands[k].charges = this.glands[k].maxCharges;
      this.glands[k].rechargeTimer = 0;
      this.glands[k].activeTimer = 0;
      this.glands[k].waveId = 0;
    });

    this.updateHUD();
    this.spawnNutrient();
  }

  triggerGland(key) {
    const gland = this.glands[key];
    if (!gland || gland.charges <= 0 || this.isGameOver || this.isVictory) return;

    // Consume 1 charge
    gland.charges--;

    // Increment wave ID for this specific spray activation
    this.sprayWaveCounter++;
    gland.waveId = this.sprayWaveCounter;

    // Activate 1.0s continuous spray
    gland.activeTimer = 1.0;

    // Audio & particles
    const pitch = key === 'salivary' ? 500 : key === 'gastric' ? 300 : key === 'liver' ? 420 : key === 'pancreas' ? 600 : 700;
    this.sound.playSpray(pitch);
    this.spawnSprayParticles(key);

    // Immediate hit check on trigger
    this.checkSprayHit(key);

    // Update HUD charges immediately
    this.updateHUD();
  }

  spawnSprayParticles(key) {
    const gland = this.glands[key];
    const leftX = gland.range[0] * this.width;
    const rightX = gland.range[1] * this.width;

    // Spawn digestive enzyme particles STRICTLY inside the digestive tract lumen!
    for (let i = 0; i < 22; i++) {
      const px = leftX + 8 + Math.random() * (rightX - leftX - 16);
      const r = Math.max(0, Math.min(1, px / this.width));
      const p = getTractProfile(r, this.height);
      const py = p.topY + 5 + Math.random() * (p.botY - p.topY - 10);
      const vx = (Math.random() - 0.5) * 1.6;
      const vy = (Math.random() - 0.5) * 1.6;
      this.particles.push(new Particle(px, py, vx, vy, gland.particleColor, 2.5 + Math.random() * 2.5, 0.6 + Math.random() * 0.4));
    }
  }

  checkSprayHit(key) {
    const gland = this.glands[key];
    const leftX = gland.range[0] * this.width;
    const rightX = gland.range[1] * this.width;
    const currentWave = gland.waveId;

    this.nutrients.forEach((n) => {
      if (n.isDead || n.stage === 3) return;

      // Check if molecule is inside spray range
      if (n.x >= leftX - 10 && n.x <= rightX + 10) {
        // If this nutrient was already successfully digested by this spray wave, do NOT re-process or show false warning!
        if (n.processedWaveId === currentWave) {
          return;
        }

        const result = this.processDigestion(key, n);
        if (result.success) {
          n.processedWaveId = currentWave;
          this.applyHitSuccess(n, result, key);
        } else if (result.reason) {
          // Only show warning ONCE per spray wave (prevents 60-FPS spamming!)
          if (n.warnedWaveId !== currentWave) {
            n.warnedWaveId = currentWave;
            this.sound.playInvalidTarget();
            this.floatingTexts.push(new FloatingText(n.x, n.y - 25, result.reason, '#94a3b8'));
          }
        }
      }
    });
  }

  processDigestion(glandKey, n) {
    if (n.type === 'cellulose') {
      if (glandKey === 'salivary') return { success: false, reason: '缺乏纖維素酶' };
      if (glandKey === 'gastric') return { success: false, reason: '缺乏纖維素酶' };
      if (glandKey === 'liver') return { success: false, reason: '缺乏纖維素酶' };
      if (glandKey === 'pancreas') return { success: false, reason: '缺乏纖維素酶' };
      if (glandKey === 'intestinal') return { success: false, reason: '缺乏纖維素酶' };
    }

    // 1. Salivary (唾腺) in Mouth: 1 Starch (6-glucose cluster) -> 3 Maltose (2-glucoses each)
    if (glandKey === 'salivary') {
      if (n.type === 'starch' && n.stage === 0) {
        const m1 = new Nutrient('starch', n.x - 14, n.y - 7, n.speed, -7);
        m1.stage = 1;
        const m2 = new Nutrient('starch', n.x, n.y + 7, n.speed, 7);
        m2.stage = 1;
        const m3 = new Nutrient('starch', n.x + 14, n.y, n.speed, 0);
        m3.stage = 1;
        return {
          success: true,
          splitEntities: [m1, m2, m3],
          text: '',
          pts: 120
        };
      }
      return { success: false, reason: '沒有這種酵素' };
    }

    // 2. Gastric (胃腺) in Stomach: 1 Protein (8-mer) -> 2 Polypeptides (4-mers each)
    if (glandKey === 'gastric') {
      if (n.type === 'protein' && n.stage === 0) {
        const p1 = new Nutrient('protein', n.x - 12, n.y - 8, n.speed, -8);
        p1.stage = 1;
        const p2 = new Nutrient('protein', n.x + 12, n.y + 8, n.speed, 8);
        p2.stage = 1;
        return {
          success: true,
          splitEntities: [p1, p2],
          text: '',
          pts: 120
        };
      }
      return { success: false, reason: '沒有這種酵素' };
    }

    // 3. Liver (肝臟) in Duodenum
    if (glandKey === 'liver') {
      if (n.type === 'lipid' && n.stage === 0) {
        // Crucial Scientific Detail: Physical emulsification! Not an enzyme!
        return { success: true, nextStage: 1, text: '膽汁乳化增加表面積', pts: 120, isEmulsify: true };
      }
      return { success: false, reason: '膽汁無酵素' };
    }

    // 4. Pancreas (胰臟) in Small Intestine (Mid)
    if (glandKey === 'pancreas') {
      // Handles emulsified lipids: 1 Triglyceride -> 1 Glycerol + 3 Fatty Acids!
      if (n.type === 'lipid' && n.stage === 1 && !n.isMediumDroplet) {
        const g1 = new Nutrient('glycerol', n.x - 12, n.y - 8, n.speed, -8);
        g1.stage = 2;
        const f1 = new Nutrient('fatty_acid', n.x - 4, n.y + 8, n.speed, 8);
        f1.stage = 2;
        const f2 = new Nutrient('fatty_acid', n.x + 5, n.y - 6, n.speed, -6);
        f2.stage = 2;
        const f3 = new Nutrient('fatty_acid', n.x + 14, n.y + 6, n.speed, 6);
        f3.stage = 2;
        return {
          success: true,
          splitEntities: [g1, f1, f2, f3],
          text: '',
          pts: 190
        };
      }
      if (n.type === 'lipid' && n.isMediumDroplet) {
        return { success: false, reason: '缺乏膽汁乳化！' };
      }
      if (n.type === 'lipid' && n.stage === 0) {
        // Without liver bile, oil droplet has tiny surface area: pancreatic lipase only partially hydrolyzes outer molecules
        // producing a residual medium lipid droplet (中油滴) and some fatty acids + glycerol.
        // The medium lipid droplet cannot be absorbed and flows to the large intestine!
        const medLipid = new Nutrient('lipid', n.x - 14, n.y - 4, n.speed, -4);
        medLipid.stage = 1;
        medLipid.isMediumDroplet = true;

        const g1 = new Nutrient('glycerol', n.x + 6, n.y - 8, n.speed, -8);
        g1.stage = 2;

        const f1 = new Nutrient('fatty_acid', n.x + 12, n.y + 5, n.speed, 5);
        f1.stage = 2;

        const f2 = new Nutrient('fatty_acid', n.x + 18, n.y - 3, n.speed, -3);
        f2.stage = 2;

        return {
          success: true,
          splitEntities: [medLipid, g1, f1, f2],
          text: '只有部分分解',
          pts: 80
        };
      }
      // Handles proteins: 1 Polypeptide (4-mer) -> 4 Amino Acids!
      if (n.type === 'protein' && n.stage === 1) {
        const a1 = new Nutrient('protein', n.x - 14, n.y - 9, n.speed, -9);
        a1.stage = 2;
        const a2 = new Nutrient('protein', n.x - 5, n.y + 7, n.speed, 7);
        a2.stage = 2;
        const a3 = new Nutrient('protein', n.x + 5, n.y - 7, n.speed, -7);
        a3.stage = 2;
        const a4 = new Nutrient('protein', n.x + 14, n.y + 9, n.speed, 9);
        a4.stage = 2;
        return {
          success: true,
          splitEntities: [a1, a2, a3, a4],
          text: '',
          pts: 160
        };
      }
      // Handles starch/maltose: 1 Maltose (2-mer) -> 2 Glucoses!
      if (n.type === 'starch' && n.stage === 1) {
        const g1 = new Nutrient('starch', n.x - 8, n.y - 6, n.speed, -6);
        g1.stage = 2;
        const g2 = new Nutrient('starch', n.x + 8, n.y + 6, n.speed, 6);
        g2.stage = 2;
        return {
          success: true,
          splitEntities: [g1, g2],
          text: '',
          pts: 150
        };
      }
      if (n.type === 'starch' && n.stage === 0) {
        // Biological tolerance: pancreatic amylase can digest starch into 3 maltoses
        const m1 = new Nutrient('starch', n.x - 14, n.y - 7, n.speed, -7);
        m1.stage = 1;
        const m2 = new Nutrient('starch', n.x, n.y + 7, n.speed, 7);
        m2.stage = 1;
        const m3 = new Nutrient('starch', n.x + 14, n.y, n.speed, 0);
        m3.stage = 1;
        return {
          success: true,
          splitEntities: [m1, m2, m3],
          text: '',
          pts: 90
        };
      }
      return { success: false, reason: '沒有這種酵素' };
    }

    // 5. Intestinal Gland (腸腺) in Small Intestine (Late)
    if (glandKey === 'intestinal') {
      if (n.type === 'starch' && n.stage === 1) {
        // 1 Maltose (2-mer) -> 2 Glucoses!
        const g1 = new Nutrient('starch', n.x - 8, n.y - 6, n.speed, -6);
        g1.stage = 2;
        const g2 = new Nutrient('starch', n.x + 8, n.y + 6, n.speed, 6);
        g2.stage = 2;
        return {
          success: true,
          splitEntities: [g1, g2],
          text: '',
          pts: 150
        };
      }
      if (n.type === 'protein' && n.stage === 1) {
        // 1 Polypeptide (4-mer) -> 4 Amino Acids!
        const a1 = new Nutrient('protein', n.x - 14, n.y - 9, n.speed, -9);
        a1.stage = 2;
        const a2 = new Nutrient('protein', n.x - 5, n.y + 7, n.speed, 7);
        a2.stage = 2;
        const a3 = new Nutrient('protein', n.x + 5, n.y - 7, n.speed, -7);
        a3.stage = 2;
        const a4 = new Nutrient('protein', n.x + 14, n.y + 9, n.speed, 9);
        a4.stage = 2;
        return {
          success: true,
          splitEntities: [a1, a2, a3, a4],
          text: '',
          pts: 160
        };
      }
      return { success: false, reason: '沒有這種酵素' };
    }

    return { success: false };
  }

  applyHitSuccess(n, result, key) {
    if (result.splitEntities) {
      n.isDead = true;
      result.splitEntities.forEach((ent) => {
        ent.processedWaveId = this.sprayWaveCounter;
        this.nutrients.push(ent);
      });
    } else {
      n.stage = result.nextStage;
    }
    this.score += result.pts;

    // Skill Reward: Refill +1 charge immediately for the acting gland!
    if (key && this.glands[key]) {
      const g = this.glands[key];
      if (g.charges < g.maxCharges) {
        g.charges = Math.min(g.maxCharges, g.charges + 1);
        this.floatingTexts.push(new FloatingText(n.x, n.y - 45, `${g.name}+1充能！`, g.particleColor, false));
      }
    }

    if (result.isEmulsify) {
      this.sound.playEmulsify();
      this.floatingTexts.push(new FloatingText(n.x, n.y - 30, result.text, '#22c55e', true));
      // Dispersion explosion
      for (let i = 0; i < 20; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 3;
        this.particles.push(new Particle(n.x, n.y, Math.cos(ang) * spd, Math.sin(ang) * spd, '#facc15', 3, 0.5));
      }
    } else {
      this.sound.playDigested();
      this.floatingTexts.push(new FloatingText(n.x, n.y - 30, result.text, '#38bdf8', true));
      // Splitting sparks
      for (let i = 0; i < 16; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.5 + Math.random() * 2.5;
        this.particles.push(new Particle(n.x, n.y, Math.cos(ang) * spd, Math.sin(ang) * spd, '#fef08a', 2.5, 0.4, 'star'));
      }
    }

    this.updateHUD();
  }

  spawnNutrient() {
    const types = ['starch', 'protein', 'lipid', 'cellulose'];
    let chosenType;
    if (this.targetNutrientType && this.targetNutrientType !== 'random' && types.includes(this.targetNutrientType)) {
      chosenType = this.targetNutrientType;
    } else {
      chosenType = types[Math.floor(Math.random() * types.length)];
    }
    const speed = this.mode === 'beginner' ? 1.05 : this.mode === 'auto' ? 1.20 : 1.45;
    const profile = getTractProfile(0, this.height);
    const n = new Nutrient(chosenType, -30, profile.centerY, speed);
    this.nutrients.push(n);
  }

  update(dt) {
    if (this.isGameOver || this.isVictory) return;

    const speedMult = this.speedMultiplier || 1.0;

    // Synchronize peristaltic wave travel distance at the EXACT velocity of the nutrients
    const baseSpeed = this.mode === 'beginner' ? 1.05 : this.mode === 'auto' ? 1.20 : 1.45;
    const currentSpeed = baseSpeed * speedMult;
    this.peristalsisDistance = (this.peristalsisDistance || 0) + (currentSpeed * 60 * dt);

    // Update charges recharge & spray active timers
    Object.keys(this.glands).forEach((key) => {
      const g = this.glands[key];
      // Automatic recharge: 1 charge every 1.5 seconds (up to 5 charges max)
      if (g.charges < g.maxCharges) {
        g.rechargeTimer += dt;
        if (g.rechargeTimer >= g.rechargeRate) {
          g.charges = Math.min(g.maxCharges, g.charges + 1);
          g.rechargeTimer = 0;
        }
      } else {
        g.rechargeTimer = 0;
      }

      if (g.activeTimer > 0) {
        g.activeTimer = Math.max(0, g.activeTimer - dt);
        // Continuous check during 1s spray duration
        this.checkSprayHit(key);
      }
    });

    // Continuously update charge bars
    this.updateGlandBars();

    // Spawn Nutrients (Scales smoothly with speed multiplier to prevent clustering)
    this.spawnTimer += dt * speedMult;
    const interval = this.mode === 'beginner' ? 7.5 : this.mode === 'auto' ? 5.2 : 3.8;
    if (this.mode === 'beginner') {
      if (this.nutrients.length === 0) {
        this.spawnNutrient();
        this.spawnTimer = 0;
      }
    } else if (this.mode === 'auto') {
      if (this.nutrients.length === 0 || this.spawnTimer >= interval) {
        this.spawnNutrient();
        this.spawnTimer = 0;
      }
    } else {
      if (this.spawnTimer >= interval) {
        this.spawnNutrient();
        this.spawnTimer = 0;
      }
    }

    // Update Nutrients with current speed multiplier
    for (let i = this.nutrients.length - 1; i >= 0; i--) {
      const n = this.nutrients[i];
      n.update(dt, this.width, this.height, speedMult);

      const relX = n.x / this.width;

      // Small Intestine Absorption Zone (小腸後段 - 回腸絨毛吸收區: 0.714 ~ 0.857)
      // 小分子不應在一進入區段就全部擠在一起吸收，而是隨機分佈在小腸後段區間內被絨毛陸續吸收
      if (n.stage === 2 && relX >= 0.714) {
        // 為每個小分子分配小腸後段區段內的隨機吸收座標 (0.725 ~ 0.848)
        if (n.absorbRelX === undefined) {
          const startX = Math.max(relX + 0.015, 0.725);
          const endX = 0.848;
          if (startX < endX) {
            n.absorbRelX = startX + Math.random() * (endX - startX);
          } else {
            n.absorbRelX = endX;
          }
        }

        // 當移動達到自身隨機吸收點，或接近小腸後段末端 (0.850) 時觸發吸收動畫
        if (relX >= n.absorbRelX || relX >= 0.850) {
          n.stage = 3; // Trigger absorption
          this.sound.playAbsorbed();
          this.score += 200;
          this.absorbedCount++;
          this.hp = Math.min(100, this.hp + 5); // Regenerate HP on good absorption

          // Scientific distinction of absorption paths
          if (n.type === 'glycerol') {
            this.floatingTexts.push(new FloatingText(n.x, n.y - 35, '吸收！', '#38bdf8', true));
          } else if (n.type === 'fatty_acid') {
            this.floatingTexts.push(new FloatingText(n.x, n.y - 35, '吸收！', '#f59e0b', true));
          } else if (n.type === 'starch') {
            this.floatingTexts.push(new FloatingText(n.x, n.y - 35, '吸收！', '#38bdf8', true));
          } else if (n.type === 'protein') {
            this.floatingTexts.push(new FloatingText(n.x, n.y - 35, '吸收！', '#10b981', true));
          } else {
            this.floatingTexts.push(new FloatingText(n.x, n.y - 35, '吸收！', '#38bdf8', true));
          }

          // Absorption sparkles ascending
          for (let j = 0; j < 25; j++) {
            this.particles.push(new Particle(
              n.x + (Math.random() - 0.5) * 30,
              n.y + (Math.random() - 0.5) * 15,
              (Math.random() - 0.5) * 1.5,
              -(2 + Math.random() * 3),
              '#38bdf8',
              2.5,
              0.6,
              'star'
            ));
          }

          this.updateHUD();

          // Check Victory (Manual modes only; auto mode runs infinitely)
          if (this.mode !== 'auto' && this.targetAbsorbed !== Infinity && this.absorbedCount >= this.targetAbsorbed) {
            this.triggerVictory();
          }
        }
      }

      // Large Intestine (大腸區段: relX >= 0.857) - 腸道共生菌群隨機利用未消化養分與膳食纖維
      if (relX >= 0.857 && n.stage !== 3 && !n.isDead) {
        if (!n.bacteriaTargetRelX) {
          n.bacteriaTargetRelX = 0.875 + Math.random() * 0.095;
        }

        if (relX >= n.bacteriaTargetRelX) {
          n.isDead = true;
          this.sound.playBacteria();

          if (n.type === 'cellulose') {
            // 纖維素專門餵養大腸益生菌，產生短鏈脂肪酸(SCFA)，維護腸道屏障與健康！
            const bonusScore = 150;
            const hpHeal = 5;
            this.score += bonusScore;
            this.hp = Math.min(100, this.hp + hpHeal);

            this.floatingTexts.push(
              new FloatingText(n.x, n.y - 30, `膳食纖維餵好菌！產生短鏈脂肪酸 (+${bonusScore}分 / +${hpHeal}HP)`, '#4ade80', true)
            );

            // 翠綠色與星芒發酵粒子擴散
            for (let j = 0; j < 25; j++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 1.2 + Math.random() * 2.5;
              this.particles.push(
                new Particle(n.x, n.y, Math.cos(ang) * spd, Math.sin(ang) * spd - 1.2, '#22c55e', 3, 0.7, 'star')
              );
            }
          } else {
            // 未被小腸分解吸收的養分，走進大腸被細菌利用
            const penaltyScore = 30;
            this.score -= penaltyScore;

            let nutrientName = '養分';
            if (n.type === 'protein') nutrientName = '蛋白質';
            else if (n.type === 'starch') nutrientName = '醣類';
            else if (n.type === 'lipid') nutrientName = '殘餘脂質';

            this.floatingTexts.push(
              new FloatingText(n.x, n.y - 30, `${nutrientName}被細菌利用拿來用了！(-${penaltyScore}分)`, '#a78bfa', true)
            );

            // 紫色菌叢分解粒子擴散
            for (let j = 0; j < 18; j++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 1.0 + Math.random() * 2.2;
              this.particles.push(
                new Particle(n.x, n.y, Math.cos(ang) * spd, Math.sin(ang) * spd - 0.8, '#c084fc', 2.5, 0.5)
              );
            }
          }

          this.updateHUD();
        }
      }

      if (n.isDead || n.x > this.width + 50) {
        this.nutrients.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt, this.width, this.height);
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].update(dt);
      if (this.floatingTexts[i].life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Auto Mode: automatically react with digestive glands as nutrients arrive!
    this.updateAutoMode(dt);

    // Update Button Highlights for Beginner mode
    this.updateButtonGuides();
  }

  ensureChargeForAuto(key) {
    const g = this.glands[key];
    if (g && g.charges <= 0) {
      g.charges = 1;
      this.updateGlandBars();
    }
  }

  highlightAutoGland(key) {
    const btn = document.getElementById(`btn-${key}`);
    if (btn) {
      btn.classList.add('auto-trigger');
      setTimeout(() => {
        btn.classList.remove('auto-trigger');
      }, 300);
    }
  }

  updateAutoMode(dt) {
    if (!this.isAutoMode || this.isGameOver || this.isVictory) return;

    // Check each active nutrient in the digestive canal
    for (const n of this.nutrients) {
      if (n.isDead || n.stage === 3) continue;

      const relX = n.x / this.width;

      // 1. 口腔 (0.000 ~ 0.143) -> 唾腺 (Salivary Gland)
      // 專一性受質：大澱粉 (starch, stage 0)
      if (n.type === 'starch' && n.stage === 0) {
        if (relX >= 0.035 && relX <= 0.125) {
          const g = this.glands['salivary'];
          if (g && g.activeTimer <= 0.05) {
            this.ensureChargeForAuto('salivary');
            this.triggerGland('salivary');
            this.highlightAutoGland('salivary');
          }
        }
      }

      // 2. 胃 (0.286 ~ 0.429) -> 胃腺 (Gastric Gland)
      // 專一性受質：大蛋白質 (protein, stage 0)
      else if (n.type === 'protein' && n.stage === 0) {
        if (relX >= 0.31 && relX <= 0.40) {
          const g = this.glands['gastric'];
          if (g && g.activeTimer <= 0.05) {
            this.ensureChargeForAuto('gastric');
            this.triggerGland('gastric');
            this.highlightAutoGland('gastric');
          }
        }
      }

      // 3. 小腸前段 (十二指腸 0.429 ~ 0.571) -> 肝臟膽汁 (Liver Bile)
      // 專一性受質：大油滴 (lipid, stage 0) -> 物理乳化增加表面積
      else if (n.type === 'lipid' && n.stage === 0) {
        if (relX >= 0.445 && relX <= 0.54) {
          const g = this.glands['liver'];
          if (g && g.activeTimer <= 0.05) {
            this.ensureChargeForAuto('liver');
            this.triggerGland('liver');
            this.highlightAutoGland('liver');
          }
        }
      }

      // 4. 小腸中段 (0.571 ~ 0.714) -> 胰臟 (Pancreas)
      // 專一性受質：
      // - 已乳化小油滴 (lipid, stage 1, !isMediumDroplet) -> 胰脂肪酶水解成甘油 + 脂肪酸
      // - 多肽鏈 (protein, stage 1) -> 胰蛋白酶水解成胺基酸
      // - (容錯：若有未在口腔水解的澱粉漂至此處)
      else if (
        (n.type === 'lipid' && n.stage === 1 && !n.isMediumDroplet) ||
        (n.type === 'protein' && n.stage === 1) ||
        (n.type === 'starch' && n.stage === 0)
      ) {
        if (relX >= 0.585 && relX <= 0.68) {
          const g = this.glands['pancreas'];
          if (g && g.activeTimer <= 0.05) {
            this.ensureChargeForAuto('pancreas');
            this.triggerGland('pancreas');
            this.highlightAutoGland('pancreas');
          }
        }
      }

      // 5. 小腸後段 (0.714 ~ 0.857) -> 腸腺 (Intestinal Gland)
      // 專一性受質：
      // - 麥芽糖 (starch, stage 1) -> 麥芽糖酶水解成葡萄糖
      // - (容錯：若有多肽鏈尚未被胰臟分解)
      else if (
        (n.type === 'starch' && n.stage === 1) ||
        (n.type === 'protein' && n.stage === 1)
      ) {
        if (relX >= 0.725 && relX <= 0.81) {
          const g = this.glands['intestinal'];
          if (g && g.activeTimer <= 0.05) {
            this.ensureChargeForAuto('intestinal');
            this.triggerGland('intestinal');
            this.highlightAutoGland('intestinal');
          }
        }
      }

      // 6. 纖維素 (cellulose)：人體無酵素，自動保留至大腸共生菌群發酵
      else if (n.type === 'cellulose') {
        if (relX >= 0.06 && !n._celluloseNotified) {
          n._celluloseNotified = true;
          this.floatingTexts.push(
            new FloatingText(n.x, n.y - 28, '💡 人體無纖維素酶，保留至大腸由共生菌發酵', '#4ade80')
          );
        }
      }
    }
  }

  updateButtonGuides() {
    const keys = ['salivary', 'gastric', 'liver', 'pancreas', 'intestinal'];
    keys.forEach((k) => {
      const btn = document.getElementById(`btn-${k}`);
      if (btn) btn.classList.remove('highlight');
    });

    if (this.mode !== 'beginner' || this.nutrients.length === 0) return;

    // Highlight the button that can digest the first nutrient right now
    const target = this.nutrients[0];
    if (!target || target.stage === 3) return;

    const relX = target.x / this.width;

    if (target.type === 'starch') {
      if (target.stage === 0 && relX >= 0.01 && relX <= 0.143) {
        document.getElementById('btn-salivary')?.classList.add('highlight');
      } else if (target.stage === 1 && relX >= 0.571 && relX <= 0.857) {
        document.getElementById('btn-intestinal')?.classList.add('highlight');
      }
    } else if (target.type === 'protein') {
      if (target.stage === 0 && relX >= 0.286 && relX <= 0.429) {
        document.getElementById('btn-gastric')?.classList.add('highlight');
      } else if (target.stage === 1 && relX >= 0.571 && relX <= 0.857) {
        document.getElementById('btn-pancreas')?.classList.add('highlight');
      }
    } else if (target.type === 'lipid') {
      if (target.stage === 0 && relX >= 0.429 && relX <= 0.571) {
        document.getElementById('btn-liver')?.classList.add('highlight');
      } else if ((target.stage === 1 || target.stage === 0) && relX >= 0.571 && relX <= 0.857) {
        document.getElementById('btn-pancreas')?.classList.add('highlight');
      }
    }
  }

  updateHUD() {
    document.getElementById('hudHp').textContent = `${this.hp}%`;
    document.getElementById('hudHp').style.color = this.hp > 60 ? '#10b981' : this.hp > 30 ? '#f59e0b' : '#ef4444';
    document.getElementById('hpBar').style.width = `${this.hp}%`;
    document.getElementById('hudScore').textContent = this.score;
    const progressText = (this.mode === 'auto' || this.isAutoMode || this.targetAbsorbed === Infinity) ? `${this.absorbedCount} / ∞` : `${this.absorbedCount} / ${this.targetAbsorbed}`;
    document.getElementById('hudProgress').textContent = progressText;

    document.getElementById('btnBeginner')?.classList.toggle('active', this.mode === 'beginner');
    document.getElementById('btnIntermediate')?.classList.toggle('active', this.mode === 'intermediate');
    document.getElementById('btnAuto')?.classList.toggle('active', this.mode === 'auto');

    const autoBadge = document.getElementById('autoStatusBadge');
    if (autoBadge) {
      autoBadge.classList.toggle('hidden', !this.isAutoMode);
    }

    this.updateGlandBars();
  }

  updateGlandBars() {
    Object.keys(this.glands).forEach((key) => {
      const g = this.glands[key];
      const btn = document.getElementById(`btn-${key}`);
      const barFill = document.getElementById(`charge-bar-${key}`);
      const txtCount = document.getElementById(`charge-txt-${key}`);

      if (btn) {
        if (g.charges <= 0) {
          btn.classList.add('out-of-charges');
          btn.disabled = true;
        } else {
          btn.classList.remove('out-of-charges');
          btn.disabled = false;
        }
      }

      if (barFill && txtCount) {
        const partial = g.charges < g.maxCharges ? (g.rechargeTimer / g.rechargeRate) : 0;
        const totalProgress = Math.min(1, (g.charges + partial) / g.maxCharges);
        barFill.style.width = `${(totalProgress * 100).toFixed(1)}%`;
        txtCount.textContent = `${g.charges}/${g.maxCharges}`;

        if (g.charges === 0) {
          barFill.style.background = '#64748b';
        } else {
          barFill.style.background = '';
        }
      }
    });
  }

  draw() {
    // Bulletproof clear of all physical pixels:
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    // 1. Draw Digestive Tract Anatomy
    this.drawDigestiveTract();

    // 2. Draw Active Spray Clouds
    this.drawSprays();

    // 3. Draw Nutrients Molecules (skip individual labels so we can cluster deduplicate them)
    this.nutrients.forEach((n) => n.draw(this.ctx, this.width, this.height, true));

    // 4. Draw Deduplicated Nutrient Labels (only one label per cluster for small/split molecules)
    this.drawNutrientLabels();

    // 5. Draw Particles
    this.particles.forEach((p) => p.draw(this.ctx));

    // 6. Draw Floating Texts
    this.floatingTexts.forEach((t) => t.draw(this.ctx));
  }

  drawNutrientLabels() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Group active nutrients by type and stage
    // For small molecules (stage 2) and medium split molecules (stage 1):
    // Clusters of the same name within 140px will only show ONE representative label pill!
    const active = this.nutrients.filter((n) => !n.isDead && n.stage !== 3);
    const clusters = [];

    active.forEach((n) => {
      const name = n.getName();
      // For large molecules (stage 0), always draw their individual label
      if (n.stage === 0) {
        n.drawLabel(ctx, w, h);
        return;
      }

      // For split molecules (stage 1 & 2): check if there is an existing cluster nearby
      const existing = clusters.find(
        (c) => c.name === name && Math.abs(c.avgX - n.x) < 140
      );

      if (existing) {
        existing.items.push(n);
        existing.avgX = existing.items.reduce((sum, item) => sum + item.x, 0) / existing.items.length;
        existing.avgY = existing.items.reduce((sum, item) => sum + item.y, 0) / existing.items.length;
      } else {
        clusters.push({
          name,
          items: [n],
          avgX: n.x,
          avgY: n.y,
          rep: n
        });
      }
    });

    // Render exactly one representative label per cluster at the center of the group
    clusters.forEach((c) => {
      c.rep.drawLabel(ctx, w, h, c.avgX, c.avgY);
    });
  }

  drawDigestiveTract() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Draw Highly Distinct Organ Zone Background Blocks & Dividers
    this.drawOrganZoneBlocks(ctx, w, h);

    // 2. Draw Unified, Seamless, Continuous Digestive Canal Outline
    this.drawContinuousDigestiveTract(ctx, w, h);

    // 3. Draw Internal Anatomical Details (Rugae, Villi, Inflow Nozzles)
    this.drawInternalAnatomicalDetails(ctx, w, h);
  }

  drawOrganZoneBlocks(ctx, w, h) {
    const pad = 10;
    const gap = 8;
    const colW = (w - pad * 2 - gap * 6) / 7;

    const zones = [
      { name: '1. 口腔', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.10)' },
      { name: '2. 食道', color: '#fb7185', bg: 'rgba(251, 113, 133, 0.05)' },
      { name: '3. 胃', color: '#eab308', bg: 'rgba(234, 179, 8, 0.10)' },
      { name: '4. 小腸前段 (十二指腸)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.09)' },
      { name: '5. 小腸中段', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.09)' },
      { name: '6. 小腸後段', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.09)' },
      { name: '7. 大腸', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.10)' }
    ];

    zones.forEach((z, idx) => {
      const x1 = pad + idx * (colW + gap);
      const zw = colW;

      ctx.save();

      // Distinct Background Card Block strictly aligned with the button and tag
      const blockGrad = ctx.createLinearGradient(0, 0, 0, h);
      blockGrad.addColorStop(0, 'rgba(15, 23, 42, 0.85)');
      blockGrad.addColorStop(0.5, z.bg);
      blockGrad.addColorStop(1, 'rgba(15, 23, 42, 0.92)');
      ctx.fillStyle = blockGrad;
      ctx.fillRect(x1, 0, zw, h);

      // Top and Bottom Accent border lines for strong grouping
      ctx.fillStyle = z.color;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x1 + 1, 0, zw - 2, 4);
      ctx.fillRect(x1 + 1, h - 4, zw - 2, 4);

      // Distinct Vertical Column Divider Pillars aligned right down the middle of column gaps
      if (idx > 0) {
        const divX = x1 - gap / 2;
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = z.color;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(divX, 0);
        ctx.lineTo(divX, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Joint Notch Dot
        ctx.fillStyle = z.color;
        ctx.beginPath();
        ctx.arc(divX, 8, 3, 0, Math.PI * 2);
        ctx.arc(divX, h - 8, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  drawContinuousDigestiveTract(ctx, w, h) {
    const step = 4; // High-resolution sampling along tract
    const points = [];
    for (let x = -8; x <= w + 8; x += step) {
      const r = Math.max(0, Math.min(1, x / w));
      const p = getTractProfile(r, h);
      points.push({ x, topY: p.topY, botY: p.botY, centerY: p.centerY });
    }

    ctx.save();

    // 1. Trace the single continuous contour
    ctx.beginPath();
    // Trace upper wall from left to right
    ctx.moveTo(points[0].x, points[0].topY);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].topY);
    }
    // Trace lower wall from right to left
    for (let i = points.length - 1; i >= 0; i--) {
      ctx.lineTo(points[i].x, points[i].botY);
    }
    ctx.closePath();

    // 2. Continuous Lumen Horizontal Anatomical Gradient Fill
    const lumenGrad = ctx.createLinearGradient(0, 0, w, 0);
    lumenGrad.addColorStop(0.00, 'rgba(244, 63, 94, 0.28)');   // 口腔 (Rose)
    lumenGrad.addColorStop(0.18, 'rgba(251, 113, 133, 0.22)'); // 食道 (Salmon)
    lumenGrad.addColorStop(0.30, 'rgba(234, 179, 8, 0.32)');   // 胃 (Amber)
    lumenGrad.addColorStop(0.52, 'rgba(16, 185, 129, 0.28)');  // 十二指腸 (Emerald)
    lumenGrad.addColorStop(0.68, 'rgba(6, 182, 212, 0.28)');   // 小腸中後 (Cyan)
    lumenGrad.addColorStop(0.86, 'rgba(139, 92, 246, 0.30)');  // 大腸 (Purple)
    lumenGrad.addColorStop(1.00, 'rgba(139, 92, 246, 0.35)');
    ctx.fillStyle = lumenGrad;
    ctx.fill();

    // 3. Continuous Muscularis Outer Wall Stroke
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
    ctx.shadowBlur = 10;
    ctx.stroke();

    ctx.restore();
  }

  drawInternalAnatomicalDetails(ctx, w, h) {
    ctx.save();

    // 1. Continuous Gastrointestinal Peristaltic Waves (食道 ➔ 胃 ➔ 小腸 ➔ 大腸 全程平滑肌蠕動波)
    // Synchronized to move at the EXACT same speed as the nutrients!
    const peristalsisStart = 0.18 * w; // Starts at esophagus entrance
    const peristalsisEnd = 0.98 * w;   // Extends all the way through colon to rectum
    const peristalsisSpan = peristalsisEnd - peristalsisStart;

    // 3 progressive rhythmic peristaltic waves spaced evenly
    const waveCount = 3;
    const waveSpacing = peristalsisSpan / waveCount;

    ctx.save();
    for (let i = 0; i < waveCount; i++) {
      const dist = ((this.peristalsisDistance || 0) + i * waveSpacing) % peristalsisSpan;
      const waveX = peristalsisStart + dist;
      const prog = dist / peristalsisSpan; // 0.0 to 1.0
      const r = Math.max(0, Math.min(1, waveX / w));
      const p = getTractProfile(r, h);

      // Fade in smoothly at esophagus entrance and fade out at colon end
      const edgeAlpha = Math.sin(prog * Math.PI);
      ctx.globalAlpha = Math.max(0, edgeAlpha * 0.45);

      // Forward-bowing muscular contraction ring conforming dynamically to local tract walls
      const forwardApex = waveX + Math.min(18, p.topH * 0.45);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
      ctx.shadowBlur = 6;

      ctx.beginPath();
      ctx.moveTo(waveX, p.topY + 1);
      ctx.quadraticCurveTo(forwardApex, p.centerY, waveX, p.botY - 1);
      ctx.stroke();

      // Soft trailing ripple echo
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.moveTo(waveX - 8, p.topY + 3);
      ctx.quadraticCurveTo(forwardApex - 8, p.centerY, waveX - 8, p.botY - 3);
      ctx.stroke();
    }
    ctx.restore();

    // (Note: Stomach rugae folds and duct lines removed per user request for clarity)

    // 2. Small Intestine (0.571 ~ 0.857) Microvilli fringe on top & bottom walls
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.5;
    for (let vx = 0.571 * w; vx < 0.857 * w; vx += 7) {
      const p = getTractProfile(vx / w, h);
      // Top microvilli
      ctx.beginPath();
      ctx.moveTo(vx, p.topY);
      ctx.lineTo(vx, p.topY + 6);
      ctx.stroke();
      // Bottom microvilli
      ctx.beginPath();
      ctx.moveTo(vx, p.botY);
      ctx.lineTo(vx, p.botY - 6);
      ctx.stroke();
    }

    // Absorption Gate Microvilli Area (0.74 ~ 0.857)
    const absStart = 0.74 * w;
    const absEnd = 0.857 * w;
    const pAbs1 = getTractProfile(0.74, h);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(absStart, pAbs1.topY, absEnd - absStart, pAbs1.botY - pAbs1.topY);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(absStart, pAbs1.topY, absEnd - absStart, pAbs1.botY - pAbs1.topY);
    ctx.setLineDash([]);

    // 5. Colon (0.857 ~ 1.000) Haustral sulcus lines between bulges
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.45)';
    ctx.lineWidth = 2;
    for (let c = 1; c <= 2; c++) {
      const cx = 0.857 * w + (0.143 * w * (c / 3));
      const p = getTractProfile(cx / w, h);
      ctx.beginPath();
      ctx.moveTo(cx, p.topY);
      ctx.lineTo(cx, p.centerY - 8);
      ctx.moveTo(cx, p.centerY + 8);
      ctx.lineTo(cx, p.botY);
      ctx.stroke();
    }



    ctx.restore();
  }

  drawSprays() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const hasActive = Object.values(this.glands).some((g) => g.activeTimer > 0);
    if (!hasActive) return;

    ctx.save();

    // STRICT CLIPPING TO TRACT LUMEN:
    // Digestive enzymes ONLY exist and react INSIDE the digestive canal lumen!
    const step = 4;
    ctx.beginPath();
    ctx.moveTo(-8, getTractProfile(0, h).topY);
    for (let x = -8; x <= w + 8; x += step) {
      const p = getTractProfile(Math.max(0, Math.min(1, x / w)), h);
      ctx.lineTo(x, p.topY);
    }
    for (let x = w + 8; x >= -8; x -= step) {
      const p = getTractProfile(Math.max(0, Math.min(1, x / w)), h);
      ctx.lineTo(x, p.botY);
    }
    ctx.closePath();
    ctx.clip(); // Restrict all spray mist strictly inside digestive tract walls

    // Draw active enzyme fluid mist within the clipped lumen
    Object.keys(this.glands).forEach((key) => {
      const g = this.glands[key];
      if (g.activeTimer > 0) {
        const startX = g.range[0] * w;
        const endX = g.range[1] * w;
        const sprayW = endX - startX;
        const alpha = Math.min(1, g.activeTimer / 0.4);

        ctx.save();
        ctx.globalAlpha = alpha * 0.8;

        // Glowing enzyme fluid bath inside the tract
        const fluidGrad = ctx.createLinearGradient(startX, 0, endX, 0);
        fluidGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
        fluidGrad.addColorStop(0.15, g.color);
        fluidGrad.addColorStop(0.85, g.color);
        fluidGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = fluidGrad;
        ctx.fillRect(startX, 0, sprayW, h);

        ctx.restore();
      }
    });

    ctx.restore();
  }

  triggerVictory() {
    this.isVictory = true;
    const title = this.isAutoMode ? '自動演示成功！完美消化吸收' : '完美消化！營養吸收大成功';
    document.getElementById('modalResultTitle').textContent = title;
    document.getElementById('modalResultTitle').style.color = '#38bdf8';
    const iconEl = document.getElementById('modalResultIcon');
    if (iconEl) iconEl.textContent = '';
    document.getElementById('resScore').textContent = this.score;
    document.getElementById('resAbsorbed').textContent = this.absorbedCount;
    document.getElementById('resHp').textContent = `${this.hp}%`;
    const desc = this.isAutoMode
      ? `系統已自動引導消化腺完成 ${this.absorbedCount} 份養分的兩階段水解與乳化，小腸絨毛全數成功吸收！`
      : `您已成功讓小腸吸收了 ${this.absorbedCount} 份完整分解的小分子營養！人體充滿能量！`;
    document.getElementById('modalResultDesc').textContent = desc;
    document.getElementById('modalResult').classList.add('open');
  }

  triggerGameOver() {
    this.isGameOver = true;
    document.getElementById('modalResultTitle').textContent = '消化不良！腸胃體力耗盡';
    document.getElementById('modalResultTitle').style.color = '#ef4444';
    const iconEl = document.getElementById('modalResultIcon');
    if (iconEl) iconEl.textContent = '';
    document.getElementById('resScore').textContent = this.score;
    document.getElementById('resAbsorbed').textContent = this.absorbedCount;
    document.getElementById('resHp').textContent = '0%';
    document.getElementById('modalResultDesc').textContent = '太多大分子或半消化分子未被及時分解而排入大腸，引起嚴重消化不良與腹痛。再試一次吧！';
    document.getElementById('modalResult').classList.add('open');
  }

  loop(currentTime) {
    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  window.game = new DigestGame();
});
