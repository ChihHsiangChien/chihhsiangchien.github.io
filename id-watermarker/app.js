document.addEventListener('DOMContentLoaded', () => {
  // --- DOM 元素獲取 ---
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const previewContainer = document.getElementById('preview-container');
  const previewCanvas = document.getElementById('preview-canvas');
  const imageInfo = document.getElementById('image-info');
  
  // 控制項
  const watermarkText = document.getElementById('watermark-text');
  const layoutMode = document.getElementById('layout-mode');
  const fontFamily = document.getElementById('font-family');
  const fontColor = document.getElementById('font-color');
  const colorHex = document.getElementById('color-hex');
  const watermarkOpacity = document.getElementById('watermark-opacity');
  const fontSize = document.getElementById('font-size');
  const rotationAngle = document.getElementById('rotation-angle');
  const gridGap = document.getElementById('grid-gap');
  const gridGapGroup = document.getElementById('grid-gap-group');
  
  // 顯示值
  const opacityVal = document.getElementById('opacity-val');
  const sizeVal = document.getElementById('size-val');
  const angleVal = document.getElementById('angle-val');
  const gapVal = document.getElementById('gap-val');
  
  // 按鈕
  const downloadBtn = document.getElementById('download-btn');
  const clearBtn = document.getElementById('clear-btn');
  const quickTagBtns = document.querySelectorAll('.quick-tag-btn');

  // --- 狀態變數 ---
  let loadedImage = null;
  let originalFileName = 'id_card';

  // --- 初始化設定 ---
  // 排版模式變更時切換網格密度控制項顯示
  layoutMode.addEventListener('change', () => {
    if (layoutMode.value === 'center') {
      gridGapGroup.classList.add('hidden');
    } else {
      gridGapGroup.classList.remove('hidden');
    }
    renderWatermark();
  });

  // 更新顏色選擇器的 Hex 代碼文字
  fontColor.addEventListener('input', (e) => {
    colorHex.textContent = e.target.value.toUpperCase();
    renderWatermark();
  });

  // 監聽所有滑桿變更以即時更新數值顯示與 Canvas
  watermarkOpacity.addEventListener('input', (e) => {
    opacityVal.textContent = e.target.value;
    renderWatermark();
  });

  fontSize.addEventListener('input', (e) => {
    sizeVal.textContent = e.target.value;
    renderWatermark();
  });

  rotationAngle.addEventListener('input', (e) => {
    angleVal.textContent = e.target.value;
    renderWatermark();
  });

  gridGap.addEventListener('input', (e) => {
    gapVal.textContent = e.target.value;
    renderWatermark();
  });

  watermarkText.addEventListener('input', renderWatermark);
  fontFamily.addEventListener('change', renderWatermark);

  // 快速標籤按鈕事件
  quickTagBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      watermarkText.value = btn.getAttribute('data-text');
      renderWatermark();
    });
  });

  // --- 拖曳與上傳處理 ---
  // 防止瀏覽器預設行為
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  // 高亮拖曳區域
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
  });

  // 處理檔案丟入
  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  });

  // 點擊選擇檔案
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('請上傳影像檔案 (JPEG, PNG, WebP)！');
      return;
    }

    // 紀錄原始檔名，去除副檔名
    originalFileName = file.name.substring(0, file.name.lastIndexOf('.')) || 'id_card';

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        loadedImage = img;
        // 顯示圖片尺寸資訊
        imageInfo.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
        
        // 切換介面顯示
        dropzone.classList.add('hidden');
        previewContainer.classList.remove('hidden');
        downloadBtn.removeAttribute('disabled');
        clearBtn.removeAttribute('disabled');
        
        // 渲染浮水印
        renderWatermark();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // --- 清除與重設邏輯 ---
  clearBtn.addEventListener('click', resetApp);

  function resetApp() {
    loadedImage = null;
    fileInput.value = '';
    
    // 清除畫布
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // 切換顯示
    previewContainer.classList.add('hidden');
    dropzone.classList.remove('hidden');
    downloadBtn.setAttribute('disabled', 'true');
    clearBtn.setAttribute('disabled', 'true');
  }

  // --- 核心浮水印繪製引擎 ---
  function renderWatermark() {
    if (!loadedImage) return;

    const ctx = previewCanvas.getContext('2d');
    const width = loadedImage.naturalWidth;
    const height = loadedImage.naturalHeight;

    // 設定畫布尺寸為圖片原始解析度 (保證輸出不失真)
    previewCanvas.width = width;
    previewCanvas.height = height;

    // 1. 繪製原始影像
    ctx.drawImage(loadedImage, 0, 0);

    // 2. 準備浮水印設定
    const text = watermarkText.value.trim();
    if (!text) return; // 沒有文字就直接返回

    const size = parseInt(fontSize.value, 10);
    const color = fontColor.value;
    const opacity = parseFloat(watermarkOpacity.value);
    const angle = parseInt(rotationAngle.value, 10) * Math.PI / 180; // 轉為弧度
    const font = fontFamily.value;

    ctx.save();
    
    // 套用基本文字設定
    ctx.font = `${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (layoutMode.value === 'center') {
      // --- 置中單一浮水印 ---
      ctx.translate(width / 2, height / 2);
      ctx.rotate(angle);
      ctx.fillText(text, 0, 0);
    } else {
      // --- 滿版網格浮水印 (Staggered Grid) ---
      // 計算對角線長度以確保旋轉時能覆蓋整個畫面
      const maxDim = Math.sqrt(width * width + height * height);
      
      // 平移到畫面中心點進行旋轉
      ctx.translate(width / 2, height / 2);
      ctx.rotate(angle);

      // 量測字體寬度，以此動態決定水平間距，避免文字重疊或空隙過大
      const textWidth = ctx.measureText(text).width || 100;
      const gap = parseInt(gridGap.value, 10);
      
      const stepX = textWidth + gap;
      const stepY = gap;

      // 橫跨整個對角線區域進行繪製
      for (let y = -maxDim; y < maxDim; y += stepY) {
        // 交錯偏移，產生更自然的交錯浮水印效果，增加防偽難度
        const isEvenRow = Math.round(y / stepY) % 2 === 0;
        const shiftX = isEvenRow ? stepX / 2 : 0;
        
        for (let x = -maxDim - shiftX; x < maxDim; x += stepX) {
          ctx.fillText(text, x, y);
        }
      }
    }

    ctx.restore();
  }

  // --- 檔案下載匯出 ---
  downloadBtn.addEventListener('click', () => {
    if (!loadedImage) return;

    // 將 Canvas 匯出為高品質 JPG (95% 品質，保留細節同時檔案適中)
    const dataUrl = previewCanvas.toDataURL('image/jpeg', 0.95);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = `${originalFileName}_watermarked.jpg`;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  });
});
