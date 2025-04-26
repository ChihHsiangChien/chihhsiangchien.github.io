# Python與ImageJ整合指南

## 簡介
Python作為一個強大的科學計算和數據分析工具，與ImageJ的整合可以大大擴展影像分析的能力。本章將介紹如何使用Python與ImageJ協同工作。

## 環境配置

### PyImageJ安裝
1. 基本安裝
   ```python
   # 使用pip安裝
   pip install pyimagej numpy scipy matplotlib

   # 導入必要模塊
   import imagej
   import numpy as np
   from matplotlib import pyplot as plt
   ```

2. 環境設置
   ```python
   # 初始化ImageJ
   ij = imagej.init('latest')
   
   # 設置記憶體
   ij = imagej.init('latest', mode='interactive', heap_size='4G')
   ```

### 依賴管理
1. Java依賴
   ```python
   # 檢查Java版本
   import jpype
   print(jpype.getDefaultJVMPath())
   
   # 添加Java類路徑
   imagej.init('latest', plugins_dir='path/to/plugins')
   ```

2. Python包
   ```python
   # 科學計算包
   import pandas as pd
   import scipy.ndimage as ndi
   from skimage import io, filters
   ```

## 基本操作

### 影像讀寫
1. 打開影像
   ```python
   # 從文件打開
   image = ij.io().open('sample.tif')
   
   # 轉換為NumPy數組
   img_array = ij.py.to_numpy(image)
   ```

2. 保存影像
   ```python
   # 保存為文件
   ij.io().save(image, 'output.tif')
   
   # 從NumPy數組創建ImagePlus
   imp = ij.py.to_imageplus(img_array)
   ```

### 影像處理
1. 基本處理
   ```python
   # 使用ImageJ命令
   ij.py.run_macro("""
       run("Gaussian Blur...", "sigma=2");
       run("Enhance Contrast", "saturated=0.35");
   """)
   ```

2. NumPy操作
   ```python
   # 直接操作數組
   img_array = np.array(image)
   filtered = filters.gaussian(img_array, sigma=2)
   result = ij.py.to_imageplus(filtered)
   ```

## 高級功能

### 插件調用
1. ImageJ插件
   ```python
   # 使用Bio-Formats
   ij.py.run_plugin("Bio-Formats Importer",
                    "open=[file.lif] color_mode=Default view=Hyperstack")
   
   # 使用TrackMate
   ij.py.run_plugin("TrackMate",
                    "model=[DoG detector] radius=2.5")
   ```

2. Python模塊
   ```python
   # scikit-image整合
   from skimage import segmentation, feature
   
   # 使用高級算法
   edges = feature.canny(img_array)
   segments = segmentation.watershed(img_array)
   ```

### 數據分析
1. 測量與統計
   ```python
   # 獲取測量結果
   results = ij.py.run_macro("""
       run("Analyze Particles...");
       return getResult("Area");
   """)
   
   # 使用pandas分析
   df = pd.DataFrame(results)
   statistics = df.describe()
   ```

2. 可視化
   ```python
   # matplotlib繪圖
   plt.figure(figsize=(10, 6))
   plt.imshow(img_array)
   plt.colorbar()
   plt.show()
   
   # 直方圖分析
   plt.hist(img_array.ravel(), bins=256)
   plt.show()
   ```

## 工作流程自動化

### 批量處理
1. 文件處理
   ```python
   import os
   
   def process_directory(input_dir, output_dir):
       for filename in os.listdir(input_dir):
           if filename.endswith('.tif'):
               # 處理每個文件
               image = ij.io().open(os.path.join(input_dir, filename))
               processed = process_image(image)
               ij.io().save(processed, os.path.join(output_dir, f"proc_{filename}"))
   ```

2. 並行處理
   ```python
   from concurrent.futures import ProcessPoolExecutor
   
   def parallel_processing(file_list):
       with ProcessPoolExecutor() as executor:
           results = list(executor.map(process_single_file, file_list))
   ```

### 自定義工作流
1. 工作流定義
   ```python
   class ImageAnalysisWorkflow:
       def __init__(self, ij):
           self.ij = ij
           
       def preprocess(self, image):
           # 預處理步驟
           return processed_image
           
       def analyze(self, image):
           # 分析步驟
           return results
           
       def run(self, input_file):
           image = self.ij.io().open(input_file)
           processed = self.preprocess(image)
           results = self.analyze(processed)
           return results
   ```

2. 工作流執行
   ```python
   # 創建工作流實例
   workflow = ImageAnalysisWorkflow(ij)
   
   # 執行分析
   results = workflow.run('sample.tif')
   ```

## 進階應用

### 機器學習整合
1. scikit-learn整合
   ```python
   from sklearn import svm
   from sklearn.preprocessing import StandardScaler
   
   def extract_features(image):
       # 特徵提取
       features = []
       # 使用ImageJ提取特徵
       return features
   
   # 訓練模型
   clf = svm.SVC()
   clf.fit(X_train, y_train)
   ```

2. 深度學習
   ```python
   import tensorflow as tf
   
   def create_training_data():
       # 使用ImageJ預處理數據
       ij.py.run_macro("""
           // 預處理腳本
       """)
       # 準備訓練數據
       return X, y
   ```

### 自定義UI
1. 圖形界面
   ```python
   import tkinter as tk
   from tkinter import filedialog
   
   class ImageJUI:
       def __init__(self, ij):
           self.ij = ij
           self.root = tk.Tk()
           self.setup_ui()
           
       def setup_ui(self):
           # 創建界面元素
           self.button = tk.Button(text="Open Image",
                                 command=self.open_image)
   ```

2. 交互功能
   ```python
   def interactive_analysis():
       # 獲取用戶輸入
       params = get_user_parameters()
       
       # 執行分析
       ij.py.run_macro(f"""
           run("Analyze Particles...", 
               "size={params['min_size']}-{params['max_size']}");
       """)
   ```

## 效能優化

### 記憶體管理
1. 大型數據處理
   ```python
   def process_large_image(file_path):
       # 分塊讀取
       with ImageReader(file_path) as reader:
           for tile in reader.iter_tiles():
               # 處理每個分塊
               process_tile(tile)
   ```

2. 資源釋放
   ```python
   def cleanup():
       # 清理ImageJ資源
       ij.py.run_macro("run('Collect Garbage');")
       
       # 清理Python記憶體
       import gc
       gc.collect()
   ```

### 計算優化
1. 向量化操作
   ```python
   # 使用NumPy向量化
   def optimize_calculation(image_array):
       return np.where(image_array > threshold,
                      image_array * scale,
                      image_array)
   ```

2. GPU加速
   ```python
   # 使用CuPy進行GPU計算
   import cupy as cp
   
   def gpu_processing(image_array):
       # 轉移到GPU
       gpu_array = cp.asarray(image_array)
       # GPU計算
       result = cp.fft.fft2(gpu_array)
       return cp.asnumpy(result)
   ```

## 最佳實踐

### 代碼組織
1. 模塊化設計
   ```python
   # image_analysis.py
   class ImageAnalyzer:
       def __init__(self, ij):
           self.ij = ij
           
       def analyze(self):
           pass
           
   # utils.py
   def preprocess_image(image):
       pass
   ```

2. 錯誤處理
   ```python
   class ImageJError(Exception):
       pass
   
   def safe_operation(func):
       def wrapper(*args, **kwargs):
           try:
               return func(*args, **kwargs)
           except Exception as e:
               raise ImageJError(f"Operation failed: {str(e)}")
       return wrapper
   ```

### 測試與調試
1. 單元測試
   ```python
   import unittest
   
   class TestImageAnalysis(unittest.TestCase):
       def setUp(self):
           self.ij = imagej.init()
           
       def test_processing(self):
           result = process_image(test_image)
           self.assertIsNotNone(result)
   ```

2. 日誌記錄
   ```python
   import logging
   
   logging.basicConfig(level=logging.INFO)
   logger = logging.getLogger(__name__)
   
   def process_with_logging():
       logger.info("Starting processing")
       try:
           # 處理步驟
           logger.debug("Processing details")
       except Exception as e:
           logger.error(f"Error occurred: {e}")
   ``` 