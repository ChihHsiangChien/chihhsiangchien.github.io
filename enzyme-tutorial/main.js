// 多個酵素與受質動態管理
const canvas = document.getElementById('canvas');
const enzymeCountInput = document.getElementById('enzyme-count');
const substrateCountInput = document.getElementById('substrate-count');

// 監聽溫度 slider
const tempSlider = document.getElementById('temp-slider');
const tempValue = document.getElementById('temp-value');
// --- 工具箱拖曳新增分子/酵素 ---
const toolbox = document.getElementById('toolbox');
if (toolbox && canvas) {
	// 自動產生 toolbox 內容
	toolbox.innerHTML = '';
	// 酵素
	const enzymeTypes = Array.from(new Set(reactions.map(r => r.type)));
	enzymeTypes.forEach(type => {
		const rule = reactions.find(r => r.type === type);
		const icon = rule && rule.enzymeActiveIcon ? rule.enzymeActiveIcon : 'enzyme_A_active.svg';
		const div = document.createElement('div');
		div.draggable = true;
		div.className = 'toolbox-item';
		div.dataset.type = 'enzyme';
		div.dataset.enzymetype = type;
		div.style.width = '40px';
		div.style.height = '40px';
		div.style.cursor = 'grab';
		div.innerHTML = `<img src="${icon}" alt="酵素${type}" style="width:40px;height:40px;">`;
		toolbox.appendChild(div);
	});
	// 分子
	const moleculeTypes = Array.from(new Set(reactions.flatMap(r => [...(r.substrates||[]), ...(r.products||[])])));
	moleculeTypes.forEach(type => {
		// 找 icon
		let icon = null;
		for (const rule of reactions) {
			const idx = rule.substrates.indexOf(type);
			if (idx !== -1 && rule.substrateIcons && rule.substrateIcons[idx]) {
				icon = rule.substrateIcons[idx];
				break;
			}
			const prodIdx = rule.products.indexOf(type);
			if (prodIdx !== -1 && rule.productIcons && rule.productIcons[prodIdx]) {
				icon = rule.productIcons[prodIdx];
				break;
			}
		}
		if (!icon) icon = type + '.svg';
		const div = document.createElement('div');
		div.draggable = true;
		div.className = 'toolbox-item';
		div.dataset.type = 'molecule';
		div.dataset.moleculetype = type;
		div.style.width = '40px';
		div.style.height = '40px';
		div.style.cursor = 'grab';
		div.innerHTML = `<img src="${icon}" alt="分子${type}" style="width:40px;height:40px;">`;
		toolbox.appendChild(div);
	});

	// 允許 canvas 放置
	canvas.addEventListener('dragover', e => {
		e.preventDefault();
	});
	canvas.addEventListener('drop', e => {
		e.preventDefault();
		const type = e.dataTransfer.getData('type');
		const enzymeType = e.dataTransfer.getData('enzymetype');
		const moleculeType = e.dataTransfer.getData('moleculetype');
		// 取得滑鼠座標相對於 canvas
		const rect = canvas.getBoundingClientRect();
		let x = e.clientX - rect.left - 20;
		let y = e.clientY - rect.top - 20;
		let angle = Math.floor(Math.random() * 360);
		if (type === 'enzyme' && enzymeType) {
			let denatureTemp = 30; // 可根據 enzymeType 設定
			enzymes.push(new Enzyme(enzymeType, x, y, angle, denatureTemp));
			bindDraggable();
		} else if (type === 'molecule' && moleculeType) {
			molecules.push(new Molecule(moleculeType, x, y, angle));
			bindDraggable();
		}
	});

	// 設定 toolbox-item 拖曳資料
	toolbox.querySelectorAll('.toolbox-item').forEach(item => {
		item.addEventListener('dragstart', e => {
			e.dataTransfer.setData('type', item.dataset.type);
			if (item.dataset.enzymetype) e.dataTransfer.setData('enzymetype', item.dataset.enzymetype);
			if (item.dataset.moleculetype) e.dataTransfer.setData('moleculetype', item.dataset.moleculetype);
		});
	});
}

// --- Touch 支援：點擊工具箱圖示，點 canvas 新增 ---
let pendingToolboxItem = null;
if (toolbox && canvas) {
	toolbox.querySelectorAll('.toolbox-item').forEach(item => {
		// 滑鼠拖曳已支援，這裡加觸控/點擊
		item.addEventListener('touchstart', e => {
			e.preventDefault();
			pendingToolboxItem = item;
			// 可加 highlight 效果
			item.style.boxShadow = '0 0 0 3px #00bcd4';
		});
		item.addEventListener('click', e => {
			// 桌機點擊也可用
			pendingToolboxItem = item;
			item.style.boxShadow = '0 0 0 3px #00bcd4';
		});
	});
	// 點 canvas 新增
	canvas.addEventListener('touchstart', e => {
		if (pendingToolboxItem) {
			const touch = e.touches[0];
			const rect = canvas.getBoundingClientRect();
			let x = touch.clientX - rect.left - 20;
			let y = touch.clientY - rect.top - 20;
			let angle = Math.floor(Math.random() * 360);
			const type = pendingToolboxItem.dataset.type;
			const enzymeType = pendingToolboxItem.dataset.enzymetype;
			const moleculeType = pendingToolboxItem.dataset.moleculetype;
			if (type === 'enzyme' && enzymeType) {
				let denatureTemp = 30;
				enzymes.push(new Enzyme(enzymeType, x, y, angle, denatureTemp));
				bindDraggable();
			} else if (type === 'molecule' && moleculeType) {
				molecules.push(new Molecule(moleculeType, x, y, angle));
				bindDraggable();
			}
			pendingToolboxItem.style.boxShadow = '';
			pendingToolboxItem = null;
		}
	});
	canvas.addEventListener('click', e => {
		if (pendingToolboxItem) {
			const rect = canvas.getBoundingClientRect();
			let x = e.clientX - rect.left - 20;
			let y = e.clientY - rect.top - 20;
			let angle = Math.floor(Math.random() * 360);
			const type = pendingToolboxItem.dataset.type;
			const enzymeType = pendingToolboxItem.dataset.enzymetype;
			const moleculeType = pendingToolboxItem.dataset.moleculetype;
			if (type === 'enzyme' && enzymeType) {
				let denatureTemp = 30;
				enzymes.push(new Enzyme(enzymeType, x, y, angle, denatureTemp));
				bindDraggable();
			} else if (type === 'molecule' && moleculeType) {
				molecules.push(new Molecule(moleculeType, x, y, angle));
				bindDraggable();
			}
			pendingToolboxItem.style.boxShadow = '';
			pendingToolboxItem = null;
		}
	});
}

// --- 反應規則外部化 ---
import { reactions } from './enzyme-reactions.js';


// 活化位判斷半徑（像素）
const ACTIVATION_SITE_RADIUS = 35;


// 多活化位支援
let activationSites = [];
let enzymes = [];
let molecules = [];
let dragging = null;
let offsetX = 0, offsetY = 0;
let dragType = null; // 'enzyme' or 'substrate'
let dragIndex = -1;

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
		/*
		this.activation.style.left = x + 'px';
		this.activation.style.top = y + 'px';
		*/
		canvas.appendChild(this.activation);
		// 暫存已吸附的分子（for 多受質合成）
		this.boundMolecules = [];
		this.updateActivationPosition();
	}
	getIconSrc() {
		// 從 reactions array 取得對應 type 的 active icon
		const rule = reactions.find(r => r.type === this.type);
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
		// 從 reactions array 取得對應 type 的 denatured icon
		const rule = reactions.find(r => r.type === this.type);
		if (rule && rule.enzymeDenaturedIcon) return rule.enzymeDenaturedIcon;
		return 'enzyme_denatured.svg';
	}

	updatePosition(x, y) {
		this.x = x; this.y = y;
		this.el.style.left = x + 'px';
		this.el.style.top = y + 'px';
		this.activation.style.left = x + 'px';
		this.activation.style.top = y + 'px';
		if (this.activation) {
			// 若有 updateActivationPosition 方法則呼叫，否則 fallback
			if (typeof this.updateActivationPosition === 'function') {
				this.updateActivationPosition();
			} else {
				this.activation.style.left = x + 'px';
				this.activation.style.top = y + 'px';
			}
		}
		// 移動已結合的受質分子
		if (this.boundMolecules && this.boundMolecules.length > 0) {
			// 以酵素中心為基準
			const centerX = this.x + (this.el.width || 40) / 2;
			const centerY = this.y + (this.el.height || 40) / 2;
			this.boundMolecules.forEach((m, i) => {
				// 多受質時可稍微錯開
				const offset = 10 * i - 10 * (this.boundMolecules.length - 1) / 2;
				m.updatePosition(centerX + offset - (m.el.width || 40) / 2, centerY - (m.el.height || 40) / 2);
			});
		}
	}
	updateActivationPosition() {
		if (!this.activation) return;
		// 設定活化位距離酵素中心 r 像素（可調整）
		const r = 1;
		const rad = (this.angle || 0) * Math.PI / 180;
		const centerX = this.x + this.el.width / 2;
		const centerY = this.y + this.el.height / 2;
		// 活化位在正上方（-90度），可依需求調整
		const ax = centerX + r * Math.cos(rad - Math.PI/2) - this.activation.offsetWidth / 2;
		const ay = centerY + r * Math.sin(rad - Math.PI/2) - this.activation.offsetHeight / 2;
		this.activation.style.left = ax + 'px';
		this.activation.style.top = ay + 'px';
	}	
	setAngle(angle) {
		this.angle = angle;
		this.el.dataset.angle = angle;
		this.el.style.transform = `rotate(${angle}deg)`;
		this.updateActivationPosition();
	}
	remove() {
		this.el.remove();
		this.activation.remove();
	}
}


class Molecule {
	constructor(type, x, y, angle) {
		this.type = type;
		this.x = x;
		this.y = y;
		this.angle = angle;
		this.el = document.createElement('img');
		this.el.src = this.getIconSrc();
		this.el.className = 'draggable molecule';
		this.el.style.left = x + 'px';
		this.el.style.top = y + 'px';
		this.el.style.zIndex = 2;
		this.el.dataset.angle = angle;
		this.el.style.transform = `rotate(${angle}deg)`;
		canvas.appendChild(this.el);
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


function handleTempSliderInput() {
	const t = parseInt(tempSlider.value, 10);
	tempValue.textContent = t;
	enzymes.forEach(e => e.checkDenature(t));
}

function randomPosX() {
	return Math.floor(Math.random() * (canvas.clientWidth - 40));
}
function randomPosY() {
	return Math.floor(Math.random() * (canvas.clientHeight - 40));
}
// --- 物件導向清除 ---
function clearAll() {
	enzymes.forEach(e => e.remove());
	molecules.forEach(m => m.remove && m.remove());
	enzymes = [];
	molecules = [];
}



function renderAll() {
	// 根據 reactions 陣列自動產生所有可用酵素
	let enzymeTypes = reactions.map(r => r.type);
	let substrateTypes = Array.from(new Set(reactions.flatMap(r => r.substrates)));

	// 平均分配各類型酵素
	let enzymeTotal = parseInt(enzymeCountInput.value);
	for (let i = 0; i < enzymeTotal; i++) {
		let x = randomPosX();
		let y = randomPosY();
		let angle = Math.floor(Math.random() * 360);
		let type = enzymeTypes[i % enzymeTypes.length];
		let rule = reactions.find(r => r.type === type);
		let denatureTemp = rule && rule.denatureTemp ? rule.denatureTemp : 30;
		enzymes.push(new Enzyme(type, x, y, angle, denatureTemp));
	}

	// 平均分配各類型初始分子
	let substrateTotal = parseInt(substrateCountInput.value);
	for (let i = 0; i < substrateTotal; i++) {
		let x = randomPosX();
		let y = randomPosY();
		let angle = Math.floor(Math.random() * 360);
		let type = substrateTypes[i % substrateTypes.length];
		molecules.push(new Molecule(type, x, y, angle));
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
	molecules.forEach((molecule, idx) => {
		molecule.el.onpointerdown = e => startDrag(e, 'molecule', idx);
	});
}


function startDrag(e, type, idx) {
	if (type === 'enzyme') {
		dragging = enzymes[idx];
	} else if (type === 'molecule') {
		dragging = molecules[idx];
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
	if (dragType === 'molecule') {
		trySnapToAnyActivation(dragIndex);
	} else if (dragType === 'enzyme') {
		for (let i = 0; i < molecules.length; i++) {
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
	const s = getCenter(molecules[idx].el);
	const a = getCenter(enzymes[enzymeIdx].activation);
	return distance(s, a) < ACTIVATION_SITE_RADIUS;
}


// 嘗試讓受質吸附到任一活化位
function trySnapToAnyActivation(idx) {
	for (let enzymeIdx = 0; enzymeIdx < enzymes.length; enzymeIdx++) {
		if (isNearActivation(idx, enzymeIdx)) {
			const enzyme = enzymes[enzymeIdx];
			const molecule = molecules[idx];
			const rule = reactions.find(r =>
				r.type === enzyme.type &&
				r.substrates.includes(molecule.type)
			);
			if (!rule) continue;

			// 多受質合成：需等所有受質到齊才觸發
			// 先檢查已吸附的分子
			if (!enzyme.boundMolecules) enzyme.boundMolecules = [];
			// 避免重複吸附同一分子
			if (enzyme.boundMolecules.includes(molecule)) continue;
			// 限制同型受質吸附數量不可超過規則需求
			// countTypes 提到區塊外，避免重複宣告
			if (typeof trySnapToAnyActivation.countTypes !== 'function') {
				trySnapToAnyActivation.countTypes = function(arr) {
					const map = {};
					arr.forEach(t => { map[t] = (map[t] || 0) + 1; });
					return map;
				};
			}
			const requiredTypes_local = rule.substrates;
			const reqCount_local = trySnapToAnyActivation.countTypes(requiredTypes_local);
			const curCount_local = trySnapToAnyActivation.countTypes(enzyme.boundMolecules.map(m => m.type));
			const molType = molecule.type;
			if ((curCount_local[molType] || 0) >= (reqCount_local[molType] || 0)) continue;
			enzyme.boundMolecules.push(molecule);
			// 讓已結合分子不再攔截 pointer 事件
			molecule.el.style.pointerEvents = 'none';
			molecule.updatePosition(enzyme.x, enzyme.y);
			const enzymeAngle = enzyme.angle || 0;
			molecule.el.style.transition = 'filter 0.2s, transform 0.4s';
			molecule.el.style.filter = 'drop-shadow(0 0 12px #ff9800)';
			molecule.el.style.transform = `scale(1.15) rotate(${enzymeAngle}deg)`;
			enzyme.el.style.transition = 'filter 0.2s, transform 0.2s';
			enzyme.el.style.filter = 'drop-shadow(0 0 12px #ff9800)';
			enzyme.el.style.transform = `scale(1.08) rotate(${enzymeAngle}deg)`;

			// 檢查是否所有受質都到齊（型別與數量都要完全符合，不能重複）
			function countTypes(arr) {
				const map = {};
				arr.forEach(t => { map[t] = (map[t] || 0) + 1; });
				return map;
			}
			const requiredTypes = rule.substrates;
			const currentTypes = enzyme.boundMolecules.map(m => m.type);
			const reqCount = countTypes(requiredTypes);
			const curCount = countTypes(currentTypes);
			let allArrived = true;
			for (const t in reqCount) {
				if (curCount[t] !== reqCount[t]) { allArrived = false; break; }
			}
			// 不能有多餘型別
			for (const t in curCount) {
				if (!(t in reqCount)) { allArrived = false; break; }
			}

			setTimeout(() => {
				molecule.el.style.filter = '';
				molecule.el.style.transform = `rotate(${enzymeAngle}deg)`;
				enzyme.el.style.filter = '';
				enzyme.el.style.transform = `rotate(${enzymeAngle}deg)`;
				if (allArrived) {
					// 找到所有分子的 idx
					const idxs = enzyme.boundMolecules.map(m => molecules.indexOf(m)).filter(i => i !== -1);
					triggerReaction(idxs, enzymeIdx, rule);
					enzyme.boundMolecules = [];
				}
			}, 800);
			break;
		}
	}
}


function triggerReaction(idxs, enzymeIdx, rule) {
	// idxs: 受質分子的索引（可為單一數字或陣列）
	if (!Array.isArray(idxs)) idxs = [idxs];
	// 先讓所有分子淡出
	idxs.forEach(idx => {
		if (molecules[idx]) {
			molecules[idx].el.style.opacity = 0;
			// 恢復 pointer 事件，避免產物也被禁用
			molecules[idx].el.style.pointerEvents = 'auto';
		}
	});
	setTimeout(() => {
		// 移除所有受質分子
		// 注意：要從大到小刪除，避免索引錯亂
		idxs.sort((a, b) => b - a).forEach(idx => {
			if (molecules[idx]) molecules[idx].remove();
			molecules.splice(idx, 1);
		});
		bindDraggable();
	}, 300);
	// 產生產物
	const center = getCenter(enzymes[enzymeIdx].activation);
	const theta = Math.random() * Math.PI * 2;
	if (rule && rule.products && rule.products.length > 0) {
		for (let i = 0; i < rule.products.length; i++) {
			const prodName = rule.products[i];
			const angle = theta + (i * Math.PI);
			createProduct(prodName, center, angle);
		}
	}
}


function createProduct(src, center, angle) {
	let type = src;
	let x = center.x - 20;
	let y = center.y - 20;
	let molecule = new Molecule(type, x, y, 0);
	molecules.push(molecule);
	// 隨機速度
	let v = 3 + Math.random() * 2;
	let vx = Math.cos(angle) * v;
	let vy = Math.sin(angle) * v;
	let damping = 0.96;
	let rot = 0;
	let rotSpeed = (Math.random() - 0.5) * 8;
	function animate() {
		let x = parseFloat(molecule.el.style.left);
		let y = parseFloat(molecule.el.style.top);
		x += vx;
		y += vy;
		vx *= damping;
		vy *= damping;
		rot += rotSpeed;
		molecule.el.style.left = x + 'px';
		molecule.el.style.top = y + 'px';
		molecule.el.style.transform = `rotate(${rot}deg)`;
		if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) {
			requestAnimationFrame(animate);
		}
	}
	animate();
	bindDraggable();
}


clearAll();
enzymeCountInput.onchange = renderAll;
substrateCountInput.onchange = renderAll;

window.addEventListener('DOMContentLoaded', renderAll);

if (tempSlider && tempValue) {
	tempSlider.addEventListener('input', handleTempSliderInput);
}