const container = document.getElementById('container');
const cellSize = 50;
const minDistance = cellSize * 1.2;

let cells = [];

function createCell(x, y, isNew = false) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    
    // 為新細胞添加出現動畫類
    if (isNew) {
        cell.classList.add('new');
        // 300ms 後移除 new 類
        setTimeout(() => {
            cell.classList.remove('new');
        }, 400);
    }
    
    cell.style.left = `${x}px`;
    cell.style.top = `${y}px`;
    container.appendChild(cell);

    cell.addEventListener('click', () => splitCell(cell));
    cell.addEventListener('touchstart', (e) => {
        e.preventDefault();
        splitCell(cell);
    });

    cells.push({ element: cell, x: x, y: y });
    return cell;
}

function splitCell(cellElement) {
    if (cellElement.classList.contains('splitting')) return;

    const index = cells.findIndex(c => c.element === cellElement);
    if (index === -1) return;

    const { x, y } = cells[index];

    // 設置分裂角度（用於CSS變量和JavaScript計算）
    const splitAngle = Math.random() * Math.PI;
    cellElement.style.setProperty('--rotation-angle', `${splitAngle}rad`);
    
    // 計算兩個新細胞的最終位置
    const distance = cellSize * 0.8;
    const x1 = x + Math.cos(splitAngle) * distance;
    const y1 = y + Math.sin(splitAngle) * distance;
    const x2 = x - Math.cos(splitAngle) * distance;
    const y2 = y - Math.sin(splitAngle) * distance;

    // 添加分裂動畫類
    cellElement.classList.add('splitting');

    // 在分裂動畫完成後創建新細胞
    setTimeout(() => {
        // 從數組中移除原始細胞
        cells.splice(index, 1);
        container.removeChild(cellElement);

        // 創建兩個新細胞，標記為新創建
        const newCell1 = createCell(x1, y1, true);
        const newCell2 = createCell(x2, y2, true);
        
        // 短暫延遲後調整位置，給出現動畫一些時間
        setTimeout(() => {
            adjustCellPositions();
        }, 50);
    }, 500); // 與 CSS 中的動畫時間相匹配
}

function adjustCellPositions() {
    let iterations = 0;
    const maxIterations = 50;
    const damping = 0.8;
    
    // 緩存容器寬高
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    function resolveCollisions() {
        let movementDetected = false;
        
        for (let i = 0; i < cells.length; i++) {
            for (let j = i + 1; j < cells.length; j++) {
                let dx = cells[j].x - cells[i].x;
                let dy = cells[j].y - cells[i].y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                // 如果距離小於最小距離（甚至可能是0），則執行推擠
                if (distance < minDistance) {
                    movementDetected = true;
                    
                    // 如果兩個細胞完全重疊，則隨機生成一個推擠方向
                    let angle;
                    if (distance < 0.1) {
                        angle = Math.random() * Math.PI * 2;
                        distance = 0.1; // 避免除以 0
                    } else {
                        angle = Math.atan2(dy, dx);
                    }

                    const moveDistance = (minDistance - distance) / 2;
                    const moveX = Math.cos(angle) * moveDistance * damping;
                    const moveY = Math.sin(angle) * moveDistance * damping;

                    cells[i].x -= moveX;
                    cells[i].y -= moveY;
                    cells[j].x += moveX;
                    cells[j].y += moveY;
                }
            }
            
            // 邊界檢查（針對左上角座標進行修正）
            // 細胞直徑為 cellSize，所以左上角座標範圍是 [0, width-cellSize]
            cells[i].x = Math.max(0, Math.min(cells[i].x, containerWidth - cellSize));
            cells[i].y = Math.max(0, Math.min(cells[i].y, containerHeight - cellSize));
        }
        
        return movementDetected;
    }

    let hasCollisions;
    do {
        hasCollisions = resolveCollisions();
        iterations++;
    } while (hasCollisions && iterations < maxIterations);
    
    // 在所有疊代結束後，統一更新所有細胞的視覺位置
    for (let i = 0; i < cells.length; i++) {
        cells[i].element.style.left = `${cells[i].x}px`;
        cells[i].element.style.top = `${cells[i].y}px`;
    }
}

// 窗口大小變化時重新調整細胞位置
window.addEventListener('resize', adjustCellPositions);

// 初始細胞
createCell(container.offsetWidth / 2 - cellSize / 2, container.offsetHeight / 2 - cellSize / 2);

// 添加隨機細胞分裂的功能（每隔一段時間）
function randomSplit() {
    if (cells.length > 0 && cells.length < 30) { // 限制最大細胞數量
        const randomIndex = Math.floor(Math.random() * cells.length);
        splitCell(cells[randomIndex].element);
    }
    
    // 根據細胞數量調整下次分裂時間
    const nextTime = 2000 + Math.random() * 3000;
    setTimeout(randomSplit, nextTime);
}

// 10秒後開始隨機分裂
setTimeout(randomSplit, 10000);