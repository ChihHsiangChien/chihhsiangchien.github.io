// 分子結構定義與繪製
const atomRadius = { O: 28, C: 24, H: 15, N: 26 };
const bondLength = 40;
const h2oAngle = 104 * Math.PI / 180;

const moleculeStructures = {
  CO: {
    atoms: [
      { element: "C", x: -bondLength * 0.6, y: 0, radius: atomRadius.C },
      { element: "O", x: bondLength * 0.6, y: 0, radius: atomRadius.O },
    ],
    bonds: [ [0, 1] ],
    baseRadius: atomRadius.C,
  },
  H2: {
    atoms: [
      { element: "H", x: -atomRadius.H, y: 0, radius: atomRadius.H },
      { element: "H", x: atomRadius.H, y: 0, radius: atomRadius.H },
    ],
    bonds: [ [0, 1] ],
    baseRadius: atomRadius.H,
  },
  CO2: {
    atoms: [
      { element: "C", x: 0, y: 0, radius: atomRadius.C },
      { element: "O", x: -bondLength * 1.2, y: 0, radius: atomRadius.O },
      { element: "O", x: bondLength * 1.2, y: 0, radius: atomRadius.O },
    ],
    bonds: [ [0, 1], [0, 2] ],
    baseRadius: atomRadius.C,
  },
  O2: {
    atoms: [
      { element: "O", x: -atomRadius.O, y: 0, radius: atomRadius.O },
      { element: "O", x: atomRadius.O, y: 0, radius: atomRadius.O },
    ],
    bonds: [ [0, 1] ],
    baseRadius: atomRadius.O,
  },
  N2: {
    atoms: [
      { element: "N", x: -atomRadius.N, y: 0, radius: atomRadius.O },
      { element: "N", x: atomRadius.N, y: 0, radius: atomRadius.O },
    ],
    bonds: [ [0, 1] ],
    baseRadius: atomRadius.N,
  },  
  H2O: {
    atoms: [
      { element: "O", x: 0, y: 0, radius: atomRadius.O },
      { element: "H", x: bondLength * Math.cos(h2oAngle / 2), y: bondLength * Math.sin(h2oAngle / 2), radius: atomRadius.H },
      { element: "H", x: bondLength * Math.cos(h2oAngle / 2), y: -bondLength * Math.sin(h2oAngle / 2), radius: atomRadius.H },
    ],
    bonds: [ [0, 1], [0, 2] ],
    baseRadius: atomRadius.O,
  },

  Glucose: {
    atoms: [
      { element: "C", x: 0, y: 0, radius: atomRadius.C },
      { element: "C", x: bondLength, y: 0, radius: atomRadius.C },
      { element: "C", x: bondLength, y: bondLength, radius: atomRadius.C },
      { element: "C", x: 0, y: bondLength, radius: atomRadius.C },
      { element: "C", x: -bondLength, y: bondLength, radius: atomRadius.C },
      { element: "C", x: -bondLength, y: 0, radius: atomRadius.C },
      { element: "O", x: 0, y: -bondLength * 1.5, radius: atomRadius.O },
      { element: "O", x: bondLength * 1.5, y: 0, radius: atomRadius.O },
      { element: "O", x: bondLength * 1.5, y: bondLength, radius: atomRadius.O },
      { element: "O", x: 0, y: bondLength * 1.5, radius: atomRadius.O },
      { element: "O", x: -bondLength * 1.5, y: bondLength, radius: atomRadius.O },
      { element: "O", x: -bondLength * 1.5, y: 0, radius: atomRadius.O },
      { element: "H", x: bondLength, y: -bondLength * 1.5, radius: atomRadius.H },
      { element: "H", x: bondLength * 1.5, y: -bondLength, radius: atomRadius.H },
      { element: "H", x: bondLength * 1.5, y: bondLength * 1.5, radius: atomRadius.H },
      { element: "H", x: 0, y: bondLength * 2, radius: atomRadius.H },
      { element: "H", x: -bondLength * 1.5, y: bondLength * 1.5, radius: atomRadius.H },
      { element: "H", x: -bondLength * 1.5, y: -bondLength, radius: atomRadius.H },
    ],
    bonds: [ [0,1],[1,2],[2,3],[3,4],[4,5],[5,0], [0,6],[1,7],[2,8],[3,9],[4,10],[5,11], [1,12],[2,13],[3,14],[4,15],[5,16],[0,17] ],
    baseRadius: atomRadius.C,
  },
};

function drawMolecule(structure, ctx, centerX, centerY) {
  // 畫鍵
  structure.bonds.forEach(([a, b]) => {
    const atomA = structure.atoms[a];
    const atomB = structure.atoms[b];
    ctx.beginPath();
    ctx.moveTo(centerX + atomA.x, centerY + atomA.y);
    ctx.lineTo(centerX + atomB.x, centerY + atomB.y);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 6;
    ctx.stroke();
  });
  // 畫原子
  structure.atoms.forEach(atom => {
    ctx.beginPath();
    ctx.arc(centerX + atom.x, centerY + atom.y, atom.radius, 0, 2 * Math.PI);
    // 根據 element 設定顏色
    let fillColor = '#fff';
    let textColor = 'white';
    switch(atom.element) {
      case 'O': fillColor = '#ef4444'; break; // red
      case 'C': fillColor = '#4b5563'; break; // black
      case 'H': fillColor = '#d1d5db'; textColor = '#1a202c'; break; // light gray
      case 'N': fillColor = '#257019'; break; // dark green
    }
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.font = `${atom.radius}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(atom.element, centerX + atom.x, centerY + atom.y);
  });
}

// 依分子名稱取得結構
function getMoleculeStructureByName(name) {
  if (name === '一氧化碳 ($CO$)') return moleculeStructures.CO;
  if (name === '氫氣 ($H_2$)') return moleculeStructures.H2;
  if (name === '水分子 ($H_2O$)') return moleculeStructures.H2O;
  if (name === '二氧化碳 ($CO_2$)') return moleculeStructures.CO2;
  if (name === '葡萄糖 ($C_6H_{12}O_6$)') return moleculeStructures.Glucose;
  if (name === '氧氣 ($O_2$)') return moleculeStructures.O2;
  if (name === '氧氣 ($O_2$)') return moleculeStructures.O2;
  if (name === '氮氣 ($N_2$)') return moleculeStructures.N2;
  return null;
}

// 將分子結構繪製到指定容器
function renderMoleculeTo(container, structure) {
  container.innerHTML = '';
  if (!structure) return;
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  canvas.style.width = '180px';
  canvas.style.height = '180px';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  drawMolecule(structure, ctx, 100, 100);
}
