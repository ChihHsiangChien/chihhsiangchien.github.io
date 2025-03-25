import cv2
import numpy as np
import os
import json

def enhance_image(image):
    # 转换为LAB颜色空间以更好地处理亮度
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # 对L通道进行CLAHE（自适应直方图均衡化）
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    cl = clahe.apply(l)
    
    # 合并通道
    enhanced_lab = cv2.merge((cl,a,b))
    
    # 转换回BGR
    enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    
    # 增加对比度
    alpha = 1.3  # 对比度增强因子
    beta = 10    # 亮度增强因子
    enhanced_contrast = cv2.convertScaleAbs(enhanced_bgr, alpha=alpha, beta=beta)
    
    return enhanced_contrast

def draw_preview(image, contours, bones_info):
    # 创建预览图像副本
    preview = image.copy()
    
    # 为每个轮廓绘制边界和标签
    for bone in bones_info:
        # 获取轮廓
        contour = contours[bone['id']]
        
        # 随机生成颜色
        color = (np.random.randint(0, 255), np.random.randint(0, 255), np.random.randint(0, 255))
        
        # 绘制轮廓
        cv2.drawContours(preview, [contour], -1, color, 4)
        
        # 添加文件名标签
        label = f"bone_{bone['id']}"
        # 使用轮廓的重心作为标签位置
        M = cv2.moments(contour)
        if M["m00"] != 0:
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
        else:
            cx = bone['x']
            cy = bone['y']
            
        # 绘制白色背景以提高可读性
        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
        cv2.rectangle(preview, 
                     (cx - 2, cy - label_size[1] - 2),
                     (cx + label_size[0] + 2, cy + 2),
                     (255, 255, 255),
                     -1)
        
        # 绘制标签文本
        cv2.putText(preview, label, (cx, cy), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        # 添加面积百分比
        area_label = f"{bone['area_percentage']:.1f}%"
        cv2.putText(preview, area_label, (cx, cy + 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
    
    return preview

def merge_close_contours(contours, image_shape, distance_threshold=50):
    if not contours:
        return contours
    
    # 计算所有轮廓的中心点
    centers = []
    for contour in contours:
        M = cv2.moments(contour)
        if M["m00"] != 0:
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
            centers.append((cx, cy))
        else:
            centers.append((0, 0))
    
    # 合并距离接近的轮廓
    merged_contours = []
    used = set()
    
    for i in range(len(contours)):
        if i in used:
            continue
            
        current_contour = contours[i]
        current_center = centers[i]
        to_merge = [i]
        
        for j in range(i + 1, len(contours)):
            if j in used:
                continue
                
            # 计算轮廓中心之间的距离
            dx = current_center[0] - centers[j][0]
            dy = current_center[1] - centers[j][1]
            distance = np.sqrt(dx*dx + dy*dy)
            
            # 如果距离小于阈值，合并轮廓
            if distance < distance_threshold:
                to_merge.append(j)
        
        # 合并选中的轮廓
        if len(to_merge) > 1:
            merged_contour = np.vstack([contours[i] for i in to_merge])
            merged_contours.append(merged_contour)
            used.update(to_merge)
        else:
            merged_contours.append(current_contour)
            used.add(i)
    
    return merged_contours

def process_image(image_path):
    # 读取图像
    image = cv2.imread(image_path)
    if image is None:
        raise Exception("无法读取图像")
    
    # 增强图像
    enhanced = enhance_image(image)
    
    # 保存增强后的图像用于调试
    cv2.imwrite('bones/enhanced.png', enhanced)
    
    # 转换为灰度图
    gray = cv2.cvtColor(enhanced, cv2.COLOR_BGR2GRAY)
    
    # 使用高斯模糊减少噪声
    blurred = cv2.GaussianBlur(gray, (9, 9), 0)
    
    # 使用自适应阈值处理
    binary = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        21,  # 邻域大小
        5    # 常数减项
    )
    
    # 进行形态学操作以清理图像
    kernel = np.ones((7,7), np.uint8)
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=5)
    
    # 进行开运算，去除小的噪点
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel, iterations=3)
    
    # 保存处理后的二值图像用于调试
    cv2.imwrite('bones/binary.png', cleaned)
    
    # 找到轮廓
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # 合并接近的轮廓
    contours = merge_close_contours(contours, image.shape, distance_threshold=60)  # 增加距离阈值
    
    # 创建输出目录
    if not os.path.exists('bones'):
        os.makedirs('bones')
    
    # 保存骨头信息
    bones_info = []
    
    # 计算图像总面积
    total_area = image.shape[0] * image.shape[1]
    
    # 处理每个轮廓
    for i, contour in enumerate(contours):
        # 过滤掉太小的轮廓
        area = cv2.contourArea(contour)
        area_percentage = (area / total_area) * 100
        
        # 调整面积阈值，只保留相对较大的区域
        if area_percentage < 0.2:
            continue
            
        # 获取轮廓的边界框
        x, y, w, h = cv2.boundingRect(contour)
        
        # 扩大边界框以确保包含完整的骨头
        padding = 15
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = min(image.shape[1] - x, w + 2 * padding)
        h = min(image.shape[0] - y, h + 2 * padding)
        
        # 创建掩码
        mask = np.zeros(image.shape[:2], dtype=np.uint8)
        cv2.drawContours(mask, [contour], -1, (255), -1)
        
        # 提取骨头图像
        bone_image = image.copy()
        bone_image[mask == 0] = [255, 255, 255]
        bone_crop = bone_image[y:y+h, x:x+w]
        
        # 保存骨头图像
        filename = f'bones/bone_{i}.png'
        cv2.imwrite(filename, bone_crop)
        
        # 保存骨头信息
        bones_info.append({
            'id': i,
            'filename': filename,
            'x': x,
            'y': y,
            'width': w,
            'height': h,
            'area': area,
            'area_percentage': area_percentage
        })
    
    # 按面积从大到小排序
    bones_info.sort(key=lambda x: x['area'], reverse=True)
    
    # 生成预览图
    preview = draw_preview(image, contours, bones_info)
    cv2.imwrite('bones/preview.png', preview)
    
    # 保存骨头信息到JSON文件
    with open('bones/bones_info.json', 'w', encoding='utf-8') as f:
        json.dump(bones_info, f, indent=2)
    
    print(f"已处理 {len(bones_info)} 个骨头")
    print("骨头面积百分比：")
    for bone in bones_info:
        print(f"骨头 {bone['id']}: {bone['area_percentage']:.2f}%")
    print("\n预览图已保存为 bones/preview.png")
    
    return bones_info

if __name__ == '__main__':
    process_image('original.png') 