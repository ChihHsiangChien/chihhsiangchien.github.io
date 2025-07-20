import cv2
import numpy as np
import os
import json

def get_contour_center(contour):
    M = cv2.moments(contour)
    if M["m00"] != 0:
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
    else:
        x, y, w, h = cv2.boundingRect(contour)
        cx = x + w // 2
        cy = y + h // 2
    return (cx, cy)

def are_contours_close(contour1, contour2, threshold=10):
    # 计算两个轮廓的中心点距离
    center1 = get_contour_center(contour1)
    center2 = get_contour_center(contour2)
    
    # 计算欧氏距离
    distance = np.sqrt((center1[0] - center2[0])**2 + (center1[1] - center2[1])**2)
    
    return distance < threshold

def extract_red_contours(image):
    # 转换到HSV颜色空间
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    # 定义红色的HSV范围（包括暗红和亮红）
    lower_red1 = np.array([0, 50, 50])
    upper_red1 = np.array([10, 255, 255])
    lower_red2 = np.array([170, 50, 50])
    upper_red2 = np.array([180, 255, 255])
    
    # 创建红色掩码
    mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
    mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
    red_mask = cv2.bitwise_or(mask1, mask2)
    
    # 使用形态学操作清理掩码
    kernel = np.ones((5,5), np.uint8)
    red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    
    # 找到轮廓
    contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # 根据空间距离对轮廓进行分组
    contour_groups = []
    used_contours = set()
    
    for i, contour in enumerate(contours):
        if i in used_contours:
            continue
            
        # 创建新组
        current_group = [contour]
        used_contours.add(i)
        
        # 查找与当前轮廓接近的其他轮廓
        for j, other_contour in enumerate(contours):
            if j in used_contours:
                continue
                
            # 检查是否有任何当前组中的轮廓与这个轮廓接近
            for group_contour in current_group:
                if are_contours_close(group_contour, other_contour):
                    current_group.append(other_contour)
                    used_contours.add(j)
                    break
        
        contour_groups.append(current_group)
    
    # 打印分组信息用于调试
    print(f"找到 {len(contour_groups)} 组轮廓")
    for i, group in enumerate(contour_groups):
        print(f"第 {i+1} 组包含 {len(group)} 个轮廓")
    
    return contour_groups

def trim_white_space(image):
    # 转换为灰度图
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # 找到非白色区域
    _, binary = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY_INV)
    coords = cv2.findNonZero(binary)
    
    if coords is None:
        return image, (0, 0, image.shape[1], image.shape[0])
    
    # 获取边界框
    x, y, w, h = cv2.boundingRect(coords)
    
    # 添加小边距
    padding = 5
    x = max(0, x - padding)
    y = max(0, y - padding)
    w = min(image.shape[1] - x, w + 2 * padding)
    h = min(image.shape[0] - y, h + 2 * padding)
    
    # 裁剪图像
    return image[y:y+h, x:x+w], (x, y, w, h)

def process_cut_image(original_path, cut_path):
    # 读取原始图像和手绘图像
    original = cv2.imread(original_path)
    cut = cv2.imread(cut_path)
    
    if original is None or cut is None:
        raise Exception("无法读取图像")
    
    # 获取手绘的红色轮廓组
    contour_groups = extract_red_contours(cut)
    
    # 创建输出目录
    if not os.path.exists('bones'):
        os.makedirs('bones')
    
    # 获取当前bones目录中最大的骨头编号
    existing_bones = [f for f in os.listdir('bones') if f.startswith('bone_') and f.endswith('.png')]
    max_bone_id = -1
    for bone_file in existing_bones:
        try:
            bone_id = int(bone_file.replace('bone_', '').replace('.png', ''))
            max_bone_id = max(max_bone_id, bone_id)
        except:
            continue
    
    next_bone_id = max_bone_id + 1
    bones_info = []
    processed_positions = set()  # 用于存储已处理的位置
    
    # 处理每组轮廓
    for group_idx, contour_group in enumerate(contour_groups):
        # 创建组掩码
        mask = np.zeros(original.shape[:2], dtype=np.uint8)
        
        # 绘制组内所有轮廓
        for contour in contour_group:
            cv2.drawContours(mask, [contour], -1, (255), -1)
        
        # 获取整个组的边界框
        x, y, w, h = cv2.boundingRect(mask)
        
        # 检查位置是否已处理
        position_key = f"{x},{y}"
        if position_key in processed_positions:
            continue
        processed_positions.add(position_key)
        
        # 提取骨头图像
        bone_image = original.copy()
        bone_image[mask == 0] = [255, 255, 255]
        bone_crop = bone_image[y:y+h, x:x+w]
        
        # 裁剪掉多余的白色区域
        trimmed_image, (trim_x, trim_y, trim_w, trim_h) = trim_white_space(bone_crop)
        
        # 计算最终坐标
        final_x = x + trim_x
        final_y = y + trim_y
        
        # 计算面积
        area = cv2.countNonZero(mask)
        area_percentage = (area / (original.shape[0] * original.shape[1])) * 100
        
        # 使用坐标命名保存骨头图像
        filename = f'bones/bone_{final_x}_{final_y}.png'
        cv2.imwrite(filename, trimmed_image)
        
        # 保存骨头信息
        bones_info.append({
            'id': f"{final_x}_{final_y}",  # 使用坐标作为ID
            'filename': filename,
            'x': final_x,
            'y': final_y,
            'width': trim_w,
            'height': trim_h,
            'area': area,
            'area_percentage': area_percentage
        })
    
    # 生成预览图
    preview = original.copy()
    for i, bone in enumerate(bones_info):
        x, y = bone['x'], bone['y']
        w, h = bone['width'], bone['height']
        # 为每个组使用不同的颜色
        color = (
            (0, 255, 0),  # 绿色
            (255, 0, 0),  # 蓝色
            (0, 0, 255),  # 红色
            (255, 255, 0),  # 青色
            (255, 0, 255),  # 洋红色
        )[i % 5]
        
        cv2.rectangle(preview, (x, y), (x + w, y + h), color, 2)
        
        # 添加标签
        label = f"bone_{bone['id']}"  # 使用坐标标识
        cv2.putText(preview, label, (x, y - 5), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        # 添加面积百分比
        area_label = f"{bone['area_percentage']:.1f}%"
        cv2.putText(preview, area_label, (x, y - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
    
    # 保存预览图
    cv2.imwrite('bones/preview_cut.png', preview)
    
    # 更新或创建bones_info.json
    try:
        with open('bones/bones_info.json', 'r', encoding='utf-8') as f:
            existing_info = json.load(f)
    except:
        existing_info = []
    
    # 添加新的骨头信息
    existing_info.extend(bones_info)
    
    # 保存更新后的信息
    with open('bones/bones_info.json', 'w', encoding='utf-8') as f:
        json.dump(existing_info, f, indent=2)
    
    print(f"已处理 {len(bones_info)} 个新的骨头")
    print("新骨头信息：")
    for bone in bones_info:
        print(f"骨头 {bone['id']}: 位置({bone['x']}, {bone['y']}), 面积{bone['area_percentage']:.2f}%")
    print("\n预览图已保存为 bones/preview_cut.png")
    
    return bones_info

if __name__ == '__main__':
    process_cut_image('original.png', 'cut.png') 