// 監聽溫度 slider
const tempSlider = document.getElementById('temp-slider');
const tempValue = document.getElementById('temp-value');
if (tempSlider && tempValue) {
	tempSlider.addEventListener('input', function() {
		const t = parseInt(tempSlider.value, 10);
		tempValue.textContent = t;
		enzymes.forEach(e => e.checkDenature(t));
	});
}
// --- 反應規則集中維護 ---
const reactions = [
  {
    enzymeType: 'decompositionA',
    enzymeActiveIcon: 'enzyme_A_active.svg',
    enzymeDenaturedIcon: 'enzyme_A_denatured.svg',
    substrateTypes: ['A'],
    substrateIcons: ['A.svg'],
    products: ['B', 'C'],
    productIcons: ['B.svg', 'C.svg']
  }
  // ...可擴充
];


// 多個酵素與受質動態管理
const canvas = document.getElementById('canvas');
// 多活化位支援
let activationSites = [];
const enzymeCountInput = document.getElementById('enzyme-count');
const substrateCountInput = document.getElementById('substrate-count');

let enzymes = [];
let substrates = [];
let products = [];
let dragging = null;
let offsetX = 0, offsetY = 0;
let dragType = null; // 'enzyme' or 'substrate'
let dragIndex = -1;

function randomPosX() {
	return Math.floor(Math.random() * (canvas.clientWidth - 40));
}
function randomPosY() {
	return Math.floor(Math.random() * (canvas.clientHeight - 40));
}
// --- 物件導向清除 ---
function clearAll() {
	enzymes.forEach(e => e.remove());
	substrates.forEach(s => s.remove());
	products.forEach(p => p.remove && p.remove());
	enzymes = [];
	substrates = [];
	products = [];
}


// --- 類別設計 ---
class Enzyme {
		constructor(type, x, y, angle, denatureTemp = 50) {
			this.type = type; // 例如 'synthesisA', 'synthesisB', 'decompositionA' ...
			this.x = x;
			this.y = y;
			this.denatureTemp = denatureTemp;
			this.denatured = false;
			this.angle = angle;
			this.el = document.createElement('img');
			this.el.src = this.getIconSrc();
			this.el.className = 'draggable enzyme';
			this.el.style.left = x + 'px';
			this.el.style.top = y + 'px';
			this.el.style.zIndex = 2;
			this.el.dataset.angle = angle;
			this.el.style.transform = `rotate(${angle}deg)`;
			canvas.appendChild(this.el);
			// 活化位
			this.activation = document.createElement('div');
			this.activation.className = 'activation-site';
			this.activation.style.left = x + 'px';
			this.activation.style.top = y + 'px';
			canvas.appendChild(this.activation);
		}
		getIconSrc() {
			// 從 reactions array 取得對應 enzymeType 的 active icon
			const rule = reactions.find(r => r.enzymeType === this.type);
			if (rule && rule.enzymeActiveIcon) return rule.enzymeActiveIcon;
			return 'enzyme_A_active.svg';
		}
	// 檢查溫度，超過即變性（不可逆）
	checkDenature(temp) {
		if (!this.denatured && temp >= this.denatureTemp) {
			this.denatured = true;
			this.el.src = this.getDenaturedIconSrc();
			if (this.activation) {
				this.activation.remove();
				this.activation = null;
			}
		}
	}

	getDenaturedIconSrc() {
		// 從 reactions array 取得對應 enzymeType 的 denatured icon
		const rule = reactions.find(r => r.enzymeType === this.type);
		if (rule && rule.enzymeDenaturedIcon) return rule.enzymeDenaturedIcon;
		return 'enzyme_denatured.svg';
	}

		updatePosition(x, y) {
			this.x = x; this.y = y;
			this.el.style.left = x + 'px';
			this.el.style.top = y + 'px';
			if (this.activation) {
				this.activation.style.left = x + 'px';
				this.activation.style.top = y + 'px';
			}
		}
	setAngle(angle) {
		this.angle = angle;
		this.el.dataset.angle = angle;
		this.el.style.transform = `rotate(${angle}deg)`;
	}
	remove() {
		this.el.remove();
		this.activation.remove();
	}
}

class Substrate {
	constructor(type, x, y, angle) {
		this.type = type; // 可擴充不同受質
		this.x = x;
		this.y = y;
		this.angle = angle;
		this.el = document.createElement('img');
		this.el.src = this.getIconSrc();
		this.el.className = 'draggable substrate';
		this.el.style.left = x + 'px';
		this.el.style.top = y + 'px';
		this.el.style.zIndex = 2;
		this.el.dataset.angle = angle;
		this.el.style.transform = `rotate(${angle}deg)`;
		canvas.appendChild(this.el);
	}
	getIconSrc() {
		// 從 reactions array 找到有此 substrateType 的反應，並取對應 icon
		for (const rule of reactions) {
			const idx = rule.substrateTypes.indexOf(this.type);
			if (idx !== -1 && rule.substrateIcons && rule.substrateIcons[idx]) {
				return rule.substrateIcons[idx];
			}
		}
		return this.type + '.svg'; // fallback
	}
	updatePosition(x, y) {
		this.x = x; this.y = y;
		this.el.style.left = x + 'px';
		this.el.style.top = y + 'px';
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

function renderAll() {
	clearAll();
	// 酵素與活化位
	// 這裡可根據需求產生多種型態
	for (let i = 0; i < parseInt(enzymeCountInput.value); i++) {
		let x = randomPosX();
		let y = randomPosY();
		let angle = Math.floor(Math.random() * 360);
		// 交錯產生不同型態酵素
		//let type = (i % 2 === 0) ? 'synthesisA' : 'decompositionA';
    let type = 'decompositionA';
    let denatureTemp = 30;
		enzymes.push(new Enzyme(type, x, y, angle, denatureTemp ));
	}
	// 受質
	for (let i = 0; i < parseInt(substrateCountInput.value); i++) {
		let x = randomPosX();
		let y = randomPosY();
		let angle = Math.floor(Math.random() * 360);
		// 交錯產生不同型態受質    
		//let type = (i % 2 === 0) ? 'A' : 'AB';
    let type = 'A';
		substrates.push(new Substrate(type, x, y, angle));
	}
	updateActivationSites();
	bindDraggable();
}

function updateActivationSites() {
	for (let i = 0; i < activationSites.length; i++) {
		if (enzymes[i]) {
			activationSites[i].style.left = enzymes[i].offsetLeft + 'px';
			activationSites[i].style.top = enzymes[i].offsetTop + 'px';
			activationSites[i].style.display = '';
		} else {
			activationSites[i].style.display = 'none';
		}
	}
}


	function bindDraggable() {
		enzymes.forEach((enzyme, idx) => {
			enzyme.el.onpointerdown = e => startDrag(e, 'enzyme', idx);
		});
		substrates.forEach((substrate, idx) => {
			substrate.el.onpointerdown = e => startDrag(e, 'substrate', idx);
		});
		products.forEach((product, idx) => {
			if (product.el) product.el.onpointerdown = e => startDrag(e, 'product', idx);
		});
	}


	function startDrag(e, type, idx) {
		if (type === 'enzyme') {
			dragging = enzymes[idx];
		} else if (type === 'substrate') {
			dragging = substrates[idx];
		} else if (type === 'product') {
			dragging = products[idx];
		}
		dragType = type;
		dragIndex = idx;
		const rect = dragging.el.getBoundingClientRect();
		offsetX = e.clientX - rect.left;
		offsetY = e.clientY - rect.top;
		dragging.el.style.filter = 'brightness(1.2) drop-shadow(0 0 8px #00bcd4)';
		// 設定自訂 ghost image
		if (e.dataTransfer) {
			e.dataTransfer.setDragImage(dragging.el, 20, 20);
		} else if (typeof e.target.setPointerCapture === 'function') {
			try {
				const ghost = dragging.el.cloneNode(true);
				ghost.style.position = 'absolute';
				ghost.style.left = '-9999px';
				ghost.style.top = '-9999px';
				ghost.style.pointerEvents = 'none';
				ghost.style.opacity = '1';
				ghost.style.transform = dragging.el.style.transform;
				document.body.appendChild(ghost);
				e.target.setPointerCapture(e.pointerId);
				setTimeout(() => ghost.remove(), 1000);
			} catch {}
		}
		dragging.el.setPointerCapture(e.pointerId);
	}

canvas.onpointermove = function(e) {
	if (!dragging) return;
	const canvasRect = canvas.getBoundingClientRect();
	let x = e.clientX - canvasRect.left - offsetX;
	let y = e.clientY - canvasRect.top - offsetY;
	x = Math.max(0, Math.min(canvasRect.width - 40, x));
	y = Math.max(0, Math.min(canvasRect.height - 40, y));
	dragging.updatePosition(x, y);
	// 立即同步 ghost/本體旋轉
	if (dragging.angle !== undefined) {
		dragging.setAngle(dragging.angle);
	}
	if (dragType === 'enzyme') updateActivationSites();
};


canvas.onpointerup = function(e) {
	if (dragging) dragging.el.style.filter = '';
	if (dragType === 'substrate') {
		trySnapToAnyActivation(dragIndex);
	} else if (dragType === 'enzyme') {
		for (let i = 0; i < substrates.length; i++) {
			trySnapToAnyActivation(i);
		}
	}
	dragging = null;
	dragType = null;
	dragIndex = -1;
};
canvas.onpointerleave = canvas.onpointerup;

function getCenter(el) {
	if (!el) return { x: 0, y: 0 };
	return {
		x: el.offsetLeft + el.offsetWidth / 2,
		y: el.offsetTop + el.offsetHeight / 2
	};
}

function distance(a, b) {
	return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isNearActivation(idx, enzymeIdx) {
	if (enzymes.length === 0) return false;
	const s = getCenter(substrates[idx].el);
	const a = getCenter(enzymes[enzymeIdx].activation);
	return distance(s, a) < 32;
}



// 嘗試讓受質吸附到任一活化位
function trySnapToAnyActivation(substrateIdx) {
  for (let enzymeIdx = 0; enzymeIdx < enzymes.length; enzymeIdx++) {
    if (isNearActivation(substrateIdx, enzymeIdx)) {
      // 查找反應規則
      const enzyme = enzymes[enzymeIdx];
      const substrate = substrates[substrateIdx];
      const rule = reactions.find(r =>
        r.enzymeType === enzyme.type &&
        r.substrateTypes.includes(substrate.type)
      );
      if (!rule) continue;
      substrate.updatePosition(enzyme.x, enzyme.y);
      const enzymeAngle = enzyme.angle || 0;
      substrate.el.style.transition = 'filter 0.2s, transform 0.4s';
      substrate.el.style.filter = 'drop-shadow(0 0 12px #ff9800)';
      substrate.el.style.transform = `scale(1.15) rotate(${enzymeAngle}deg)`;
      enzyme.el.style.transition = 'filter 0.2s, transform 0.2s';
      enzyme.el.style.filter = 'drop-shadow(0 0 12px #ff9800)';
      enzyme.el.style.transform = `scale(1.08) rotate(${enzymeAngle}deg)`;
      setTimeout(() => {
        substrate.el.style.filter = '';
        substrate.el.style.transform = `rotate(${enzymeAngle}deg)`;
        enzyme.el.style.filter = '';
        enzyme.el.style.transform = `rotate(${enzymeAngle}deg)`;
        triggerReaction(substrateIdx, enzymeIdx, rule);
      }, 800);
      break;
    }
  }
}

function triggerReaction(idx, enzymeIdx, rule) {
  substrates[idx].el.style.opacity = 0;
  setTimeout(() => {
    if (substrates[idx]) substrates[idx].remove();
    substrates.splice(idx, 1);
    bindDraggable();
  }, 300);
  // 根據反應規則產生產物
  const center = getCenter(enzymes[enzymeIdx].activation);
  const theta = Math.random() * Math.PI * 2;
  if (rule && rule.products && rule.products.length > 0) {
    for (let i = 0; i < rule.products.length; i++) {
      const prodName = rule.products[i];
      const angle = theta + (i * Math.PI);
      createProduct(prodName + '.svg', center, angle);
    }
  }
}


class Product {
	constructor(type, x, y, angle, src) {
		this.type = type;
		this.x = x;
		this.y = y;
		this.angle = angle;
		this.el = document.createElement('img');
		this.el.src = src;
		this.el.className = 'draggable product';
		this.el.style.left = x + 'px';
		this.el.style.top = y + 'px';
		this.el.style.zIndex = 2;
		this.el.dataset.angle = angle;
		this.el.style.transform = `rotate(${angle}deg)`;
		canvas.appendChild(this.el);
	}
	updatePosition(x, y) {
		this.x = x; this.y = y;
		this.el.style.left = x + 'px';
		this.el.style.top = y + 'px';
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

function createProduct(src, center, angle) {
	// 解析 type from src (e.g., 'B.svg' => 'B')
	let type = src.replace('.svg', '');
	let x = center.x - 20;
	let y = center.y - 20;
	let prod = new Product(type, x, y, 0, src);
	products.push(prod);
	// 隨機速度
	let v = 3 + Math.random() * 2;
	let vx = Math.cos(angle) * v;
	let vy = Math.sin(angle) * v;
	let damping = 0.96;
	let rot = 0;
	let rotSpeed = (Math.random() - 0.5) * 8;
	function animate() {
		let x = parseFloat(prod.el.style.left);
		let y = parseFloat(prod.el.style.top);
		x += vx;
		y += vy;
		vx *= damping;
		vy *= damping;
		rot += rotSpeed;
		prod.el.style.left = x + 'px';
		prod.el.style.top = y + 'px';
		prod.el.style.transform = `rotate(${rot}deg)`;
		if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
			requestAnimationFrame(animate);
		}
	}
	animate();
	bindDraggable();
}

enzymeCountInput.onchange = renderAll;
substrateCountInput.onchange = renderAll;

window.addEventListener('DOMContentLoaded', renderAll);

