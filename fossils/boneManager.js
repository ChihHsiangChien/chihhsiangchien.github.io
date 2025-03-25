class BoneManager {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvasContainer = document.getElementById('canvasContainer');
        this.layerControls = document.getElementById('layerControls');
        this.bones = [];
        this.selectedBone = null;
        this.isDragging = false;
        this.isRotating = false;
        this.lastX = 0;
        this.lastY = 0;
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.isSmallScreen = window.innerWidth < 768 || window.innerHeight < 768;
        this.version = "0.1"; // 版本號
        this.setGlobalScale(); // 根據設備和螢幕方向設置縮放比例
        this.setupCanvas();
        this.loadBones();
        this.addEventListeners();
        this.updateLayerControls();
    }

    // 根據設備和螢幕方向設置縮放比例
    setGlobalScale() {
        // 基本縮放比例
        let scale = 0.6;
        
        // 檢測是否是手機或平板
        if (this.isTouchDevice) {
            // 基本觸控設備縮放
            scale = 0.5;
            
            // 螢幕尺寸較小時進一步縮小
            if (this.isSmallScreen) {
                scale = 0.4;
            }
            
            // 檢測橫屏模式（寬度大於高度）
            if (window.innerWidth > window.innerHeight) {
                // 橫屏時再縮小一點
                scale *= 0.8;
            }
        }
        
        // 設置全局縮放比例
        this.globalScale = scale;
        console.log(`設置縮放比例: ${this.globalScale}, 裝置類型: ${this.isTouchDevice ? '觸控' : '非觸控'}, 螢幕大小: ${this.isSmallScreen ? '小' : '大'}, 方向: ${window.innerWidth > window.innerHeight ? '橫' : '直'}`);
    }

    setupCanvas() {
        // 检测并适应屏幕方向
        this.updateCanvasSize();
        
        // 调整画布容器大小以匹配画布
        this.canvasContainer.style.width = '100%';
        this.canvasContainer.style.height = '100vh';
        this.canvasContainer.style.margin = '0';
        
        // 添加窗口大小改变和屏幕方向变化事件监听器
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('orientationchange', this.handleResize.bind(this));
    }

    // 處理視窗大小變化和方向變化
    handleResize() {
        // 更新螢幕大小檢測
        this.isSmallScreen = window.innerWidth < 768 || window.innerHeight < 768;
        
        // 重新計算縮放比例
        this.setGlobalScale();
        
        // 更新畫布大小
        this.updateCanvasSize();
        
        // 重新繪製畫面
        this.draw();
    }

    updateCanvasSize() {
        // 设置画布为窗口大小，最大化展示空间
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.draw();
    }

    async loadBones() {
        try {
            const response = await fetch('bones/bones_info.json');
            const bonesInfo = await response.json();
            
            // 定義畫面邊界，留出邊距確保骨頭完全在畫面內
            const margin = 50;
            const availableWidth = this.canvas.width - 2 * margin;
            const availableHeight = this.canvas.height - 2 * margin;
            
            // 加载每个骨头图片
            for (const boneInfo of bonesInfo) {
                const img = new Image();
                img.src = `bones/${boneInfo.id}.png`;
                await new Promise((resolve, reject) => {
                    img.onload = () => {
                        // 計算考慮縮放後的尺寸
                        const scaledWidth = img.width * this.globalScale;
                        const scaledHeight = img.height * this.globalScale;
                        
                        // 確保骨頭在畫面範圍內
                        const maxX = this.canvas.width - scaledWidth;
                        const maxY = this.canvas.height - scaledHeight;
                        
                        // 生成隨機位置，確保在畫面內
                        const randomX = margin + Math.random() * (availableWidth - scaledWidth);
                        const randomY = margin + Math.random() * (availableHeight - scaledHeight);
                        
                        // 生成隨機旋轉角度（0-360度轉為弧度）
                        const randomRotation = Math.random() * Math.PI * 2;
                        
                        // 创建骨头对象，使用图片原始尺寸和隨機旋轉
                        const bone = {
                            id: boneInfo.id,
                            image: img,
                            x: randomX / this.globalScale, // 轉換回未縮放座標
                            y: randomY / this.globalScale,
                            width: img.width,
                            height: img.height,
                            rotation: randomRotation,
                            scale: 1,
                            handleAngle: 0, // 初始手柄角度为0
                            handleVisible: false // 初始不显示手柄
                        };
                        bone.originalX = bone.x;
                        bone.originalY = bone.y;
                        this.bones.push(bone);
                        resolve();
                    };
                    img.onerror = reject;
                });
            }
            this.draw();
        } catch (error) {
            console.error('加载骨头图片失败:', error);
        }
    }

    addEventListeners() {
        // 鼠标事件
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        // 触摸事件
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        document.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
        
        // 禁用移动设备上的默认触摸行为（如滚动、缩放）
        this.canvas.addEventListener('touchstart', function(e) {
            e.preventDefault();
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', function(e) {
            e.preventDefault();
        }, { passive: false });
        
        // 图层控制按钮事件
        document.getElementById('moveToTop').addEventListener('click', () => {
            if (!this.selectedBone) return;
            this.moveToTop();
        });
        document.getElementById('moveUp').addEventListener('click', () => {
            if (!this.selectedBone) return;
            this.moveUp();
        });
        document.getElementById('moveDown').addEventListener('click', () => {
            if (!this.selectedBone) return;
            this.moveDown();
        });
        document.getElementById('moveToBottom').addEventListener('click', () => {
            if (!this.selectedBone) return;
            this.moveToBottom();
        });
    }

    // 触摸事件处理函数
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            // 单指触摸 - 转换为鼠标事件格式处理
            const touch = e.touches[0];
            const mouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => e.preventDefault()
            };
            this.handleMouseDown(mouseEvent);
        }
    }

    handleTouchMove(e) {
        if (e.touches.length === 1) {
            // 单指移动 - 转换为鼠标事件格式处理
            const touch = e.touches[0];
            const mouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => e.preventDefault()
            };
            this.handleMouseMove(mouseEvent);
        }
    }

    handleTouchEnd(e) {
        this.handleMouseUp(e);
    }

    updateLayerControls() {
        const buttons = this.layerControls.getElementsByTagName('button');
        for (const button of buttons) {
            if (this.selectedBone) {
                button.classList.remove('disabled');
            } else {
                button.classList.add('disabled');
            }
        }
    }

    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    handleMouseDown(e) {
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        const x = coords.x;
        const y = coords.y;
        
        // 重置拖动状态，但保留选中和旋转状态
        this.isDragging = false;
        
        // 首先检查是否点击了旋转手柄
        if (this.selectedBone && this.selectedBone.handleVisible) {
            // 获取骨头中心点的实际坐标（考虑缩放）
            const centerX = (this.selectedBone.x + this.selectedBone.width / 2) * this.globalScale;
            const centerY = (this.selectedBone.y + this.selectedBone.height / 2) * this.globalScale;
            
            // 计算旋转手柄的距离和位置
            const handleDistance = Math.max(this.selectedBone.width, this.selectedBone.height) / 2 + 20;
            
            // 考虑骨头当前旋转角度计算手柄位置
            const angle = this.selectedBone.handleAngle;
            const handleX = centerX + Math.sin(angle) * handleDistance * this.globalScale;
            const handleY = centerY - Math.cos(angle) * handleDistance * this.globalScale;
            
            // 计算鼠标点击位置到手柄的距离
            const dx = x - handleX;
            const dy = y - handleY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 增大触摸设备上的点击区域
            const touchRadius = this.isTouchDevice ? 30 : 20;
            
            // 检测是否点击了旋转手柄
            if (distance <= touchRadius) {
                console.log('✓ 点击了旋转手柄');
                this.isRotating = true;
                this.lastX = x;
                this.lastY = y;
                // 开始旋转时记录初始角度
                this.initialHandleAngle = this.selectedBone.handleAngle;
                this.initialRotation = this.selectedBone.rotation;
                this.draw();
                return; // 重要：点击旋转手柄后不继续处理
            }
        }
        
        // 从上到下检查（这样可以选中最上层的骨头）
        const unscaledX = x / this.globalScale;
        const unscaledY = y / this.globalScale;
        
        // 保存之前选中的骨头
        const previousSelected = this.selectedBone;
        
        // 查找点击位置下的骨头
        const clickedBone = [...this.bones].reverse().find(bone => 
            this.isPointInBone(unscaledX, unscaledY, bone)
        );
        
        if (clickedBone) {
            this.selectedBone = clickedBone;
            this.isDragging = true;
            this.lastX = x;
            this.lastY = y;
            
            // 如果是新选中的骨头，重置手柄角度为0（正上方）
            if (clickedBone !== previousSelected) {
                console.log('✓ 选中新骨头:', clickedBone.id);
                // 每次选中新骨头时，重置手柄角度为0度
                this.selectedBone.handleAngle = 0;
                this.selectedBone.handleVisible = true;
            } else {
                console.log('✓ 继续拖动当前骨头:', clickedBone.id);
            }
        } else {
            // 如果点击了空白处，则取消选中
            if (previousSelected) {
                console.log('✓ 点击空白处，取消选中');
                this.selectedBone = null;
            }
        }
        
        // 停止任何旋转操作
        this.isRotating = false;
        
        // 更新控制面板状态
        this.updateLayerControls();
        this.draw();
    }

    handleMouseMove(e) {
        if (!this.selectedBone) return;
        
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        const x = coords.x;
        const y = coords.y;
        
        if (this.isRotating) {
            // 旋转模式 - 使用画布坐标进行计算
            const centerX = (this.selectedBone.x + this.selectedBone.width / 2) * this.globalScale;
            const centerY = (this.selectedBone.y + this.selectedBone.height / 2) * this.globalScale;
            
            // 计算从中心点到鼠标当前位置和上一位置的向量
            const vecPrevX = this.lastX - centerX;
            const vecPrevY = this.lastY - centerY;
            const vecCurrX = x - centerX;
            const vecCurrY = y - centerY;
            
            // 计算两个向量之间的角度（弧度）
            // 使用向量的叉积和点积来计算
            const cross = vecPrevX * vecCurrY - vecPrevY * vecCurrX;
            const dot = vecPrevX * vecCurrX + vecPrevY * vecCurrY;
            
            // 计算角度变化，限制单次旋转不超过一定角度以避免跳跃
            let deltaAngle = Math.atan2(cross, dot);
            if (Math.abs(deltaAngle) > Math.PI/18) { // 限制每次不超过10度
                deltaAngle = Math.sign(deltaAngle) * Math.PI/18;
            }
            
            // 更新旋转角度
            this.selectedBone.rotation += deltaAngle;
            
            // 同时更新手柄角度，保持手柄与骨头一起旋转
            this.selectedBone.handleAngle += deltaAngle;
            
            console.log('旋转骨头:', this.selectedBone.id, 
                        '角度:', (this.selectedBone.rotation * 180 / Math.PI).toFixed(2), 
                        '手柄角度:', (this.selectedBone.handleAngle * 180 / Math.PI).toFixed(2));
            
            this.lastX = x;
            this.lastY = y;
            this.draw();
        } else if (this.isDragging) {
            // 移动模式 - 使用未缩放的距离
            const dx = (x - this.lastX) / this.globalScale;
            const dy = (y - this.lastY) / this.globalScale;
            this.selectedBone.x += dx;
            this.selectedBone.y += dy;
            
            this.lastX = x;
            this.lastY = y;
            this.draw();
        }
    }

    handleMouseUp(e) {
        this.isDragging = false;
        this.isRotating = false;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制所有骨头
        this.bones.forEach(bone => {
            this.ctx.save();
            
            // 移动到骨头中心
            const centerX = bone.x + bone.width / 2;
            const centerY = bone.y + bone.height / 2;
            
            // 应用全局缩放和旋转
            this.ctx.translate(centerX * this.globalScale, centerY * this.globalScale);
            this.ctx.scale(this.globalScale, this.globalScale);
            this.ctx.rotate(bone.rotation);
            
            // 绘制骨头图像
            this.ctx.drawImage(
                bone.image,
                -bone.width / 2,
                -bone.height / 2,
                bone.width,
                bone.height
            );
            
            this.ctx.restore();
            
            // 如果是选中的骨头且手柄可见，绘制旋转手柄
            if (this.selectedBone === bone && bone.handleVisible) {
                this.ctx.save();
                
                // 计算骨头中心点的实际坐标（考虑缩放）
                const centerX = (bone.x + bone.width / 2) * this.globalScale;
                const centerY = (bone.y + bone.height / 2) * this.globalScale;
                
                // 把坐标移动到骨头中心
                this.ctx.translate(centerX, centerY);
                
                // 旋转到手柄角度
                this.ctx.rotate(bone.handleAngle);
                
                // 应用缩放
                this.ctx.scale(this.globalScale, this.globalScale);
                
                // 计算旋转手柄距离
                const handleDistance = Math.max(bone.width, bone.height) / 2 + 20;
                const handleRadius = 10 / this.globalScale;
                
                // 绘制连接线
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(0, -handleDistance);
                this.ctx.strokeStyle = '#4CAF50';
                this.ctx.lineWidth = 2 / this.globalScale;
                this.ctx.stroke();
                
                // 绘制手柄
                this.ctx.beginPath();
                this.ctx.arc(0, -handleDistance, handleRadius, 0, Math.PI * 2);
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.fill();
                
                // 添加旋转图标
                this.ctx.beginPath();
                this.ctx.arc(0, -handleDistance, handleRadius - 3 / this.globalScale, 0, Math.PI * 1.5);
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 2 / this.globalScale;
                this.ctx.stroke();
                
                // 绘制箭头
                this.ctx.beginPath();
                this.ctx.moveTo(handleRadius - 2 / this.globalScale, -handleDistance - 2 / this.globalScale);
                this.ctx.lineTo(handleRadius + 2 / this.globalScale, -handleDistance - 2 / this.globalScale);
                this.ctx.lineTo(handleRadius, -handleDistance - 6 / this.globalScale);
                this.ctx.fillStyle = 'white';
                this.ctx.fill();
                
                this.ctx.restore();
            }
        });
        
        // 在左下角繪製版本號
        this.drawVersionNumber();
    }
    
    // 繪製版本號的函數
    drawVersionNumber() {
        this.ctx.save();
        
        // 設定文字樣式
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'bottom';
        
        // 在左下角繪製版本號，留出一點邊距
        const margin = 10;
        this.ctx.fillText(`v${this.version}`, margin, this.canvas.height - margin);
        
        this.ctx.restore();
    }

    isPointInBone(x, y, bone) {
        // 简单的矩形碰撞检测
        const boneCenterX = bone.x + bone.width / 2;
        const boneCenterY = bone.y + bone.height / 2;
        
        // 将点转换到骨头的坐标系
        const dx = x - boneCenterX;
        const dy = y - boneCenterY;
        const rotatedX = dx * Math.cos(-bone.rotation) - dy * Math.sin(-bone.rotation);
        const rotatedY = dx * Math.sin(-bone.rotation) + dy * Math.cos(-bone.rotation);
        
        // 检查点是否在矩形内
        return Math.abs(rotatedX) <= bone.width / 2 && Math.abs(rotatedY) <= bone.height / 2;
    }

    // 图层控制方法
    moveToTop() {
        if (!this.selectedBone) return;
        const index = this.bones.indexOf(this.selectedBone);
        this.bones.splice(index, 1);
        this.bones.push(this.selectedBone);
        this.draw();
    }

    moveUp() {
        if (!this.selectedBone) return;
        const index = this.bones.indexOf(this.selectedBone);
        if (index < this.bones.length - 1) {
            this.bones.splice(index, 1);
            this.bones.splice(index + 1, 0, this.selectedBone);
            this.draw();
        }
    }

    moveDown() {
        if (!this.selectedBone) return;
        const index = this.bones.indexOf(this.selectedBone);
        if (index > 0) {
            this.bones.splice(index, 1);
            this.bones.splice(index - 1, 0, this.selectedBone);
            this.draw();
        }
    }

    moveToBottom() {
        if (!this.selectedBone) return;
        const index = this.bones.indexOf(this.selectedBone);
        this.bones.splice(index, 1);
        this.bones.unshift(this.selectedBone);
        this.draw();
    }
} 