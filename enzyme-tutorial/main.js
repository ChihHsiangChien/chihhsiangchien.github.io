// 酵素作用模擬主程式
// 拖曳 substrate 與 enzyme，重疊時產生兩個 product 並給予不同速度與阻尼


// 多個酵素與受質動態管理
const canvas = document.getElementById('canvas');
// 多活化位支援
let activationSites = [];
const enzymeCountInput = document.getElementById('enzyme-count');
const substrateCountInput = document.getElementById('substrate-count');

let enzymes = [];
let substrates = [];
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
  enzymes = [];
  substrates = [];
}



// --- 類別設計 ---
class Enzyme {
	constructor(type, x, y, angle, specificity = null) {
		this.type = type; // 'synthesis' | 'decomposition' | ...
		this.specificity = specificity; // 受質專一性
		this.x = x;
		this.y = y;
		this.angle = angle;
		this.el = document.createElement('img');
		this.el.src = type === 'decomposition' ? 'enzyme_denatured.svg' : 'enzyme_active.svg';
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
	updatePosition(x, y) {
		this.x = x; this.y = y;
		this.el.style.left = x + 'px';
		this.el.style.top = y + 'px';
		this.activation.style.left = x + 'px';
		this.activation.style.top = y + 'px';
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
		this.el.src = 'substrate.svg';
		this.el.className = 'draggable substrate';
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

function renderAll() {
	clearAll();
	// 酵素與活化位
	for (let i = 0; i < parseInt(enzymeCountInput.value); i++) {
		let x = randomPosX();
		let y = randomPosY();
		let angle = Math.floor(Math.random() * 360);
		enzymes.push(new Enzyme('synthesis', x, y, angle));
	}
	// 受質
	for (let i = 0; i < parseInt(substrateCountInput.value); i++) {
		let x = randomPosX();
		let y = randomPosY();
		let angle = Math.floor(Math.random() * 360);
		substrates.push(new Substrate('default', x, y, angle));
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
}

function startDrag(e, type, idx) {  
	dragging = (type === 'enzyme' ? enzymes[idx] : substrates[idx]);
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
			// 吸附到該酵素活化位
			substrates[substrateIdx].updatePosition(enzymes[enzymeIdx].x, enzymes[enzymeIdx].y);
			// 旋轉對齊該酵素
			const enzymeAngle = enzymes[enzymeIdx].angle || 0;
			substrates[substrateIdx].el.style.transition = 'filter 0.2s, transform 0.4s';
			substrates[substrateIdx].el.style.filter = 'drop-shadow(0 0 12px #ff9800)';
			substrates[substrateIdx].el.style.transform = `scale(1.15) rotate(${enzymeAngle}deg)`;
			enzymes[enzymeIdx].el.style.transition = 'filter 0.2s, transform 0.2s';
			enzymes[enzymeIdx].el.style.filter = 'drop-shadow(0 0 12px #ff9800)';
			enzymes[enzymeIdx].el.style.transform = `scale(1.08) rotate(${enzymeAngle}deg)`;
			setTimeout(() => {
				substrates[substrateIdx].el.style.filter = '';
				substrates[substrateIdx].el.style.transform = `rotate(${enzymeAngle}deg)`;
				enzymes[enzymeIdx].el.style.filter = '';
				enzymes[enzymeIdx].el.style.transform = `rotate(${enzymeAngle}deg)`;
				triggerReaction(substrateIdx, enzymeIdx);
			}, 800);
			break;
		}
	}
}

function triggerReaction(idx, enzymeIdx) {
	// 受質消失
	substrates[idx].el.style.opacity = 0;
	setTimeout(() => {
		if (substrates[idx]) substrates[idx].remove();
		substrates.splice(idx, 1);
		bindDraggable();
	}, 300);
	// 產生兩個產物，隨機方向180度相反，並旋轉
	const center = getCenter(enzymes[enzymeIdx].activation);
	const theta = Math.random() * Math.PI * 2;
	createProduct('product1.svg', center, theta);
	createProduct('product2.svg', center, theta + Math.PI);
}

function createProduct(src, center, angle) {
	const prod = document.createElement('img');
	prod.src = src;
	prod.className = 'product';
	prod.style.left = (center.x - 20) + 'px';
	prod.style.top = (center.y - 20) + 'px';
	prod.style.transform = 'rotate(0deg)';
	prod.style.zIndex = 1;
	canvas.appendChild(prod);
	// 隨機速度
	let v = 3 + Math.random() * 2;
	let vx = Math.cos(angle) * v;
	let vy = Math.sin(angle) * v;
	let damping = 0.96;
	let rot = 0;
	let rotSpeed = (Math.random() - 0.5) * 8;
	function animate() {
		let x = parseFloat(prod.style.left);
		let y = parseFloat(prod.style.top);
		x += vx;
		y += vy;
		vx *= damping;
		vy *= damping;
		rot += rotSpeed;
		prod.style.left = x + 'px';
		prod.style.top = y + 'px';
		prod.style.transform = `rotate(${rot}deg)`;
		if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
			requestAnimationFrame(animate);
		}
	}
	animate();
}

enzymeCountInput.onchange = renderAll;
substrateCountInput.onchange = renderAll;

window.addEventListener('DOMContentLoaded', renderAll);
