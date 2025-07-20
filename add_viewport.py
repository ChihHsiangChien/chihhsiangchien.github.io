import os

def add_viewport_meta(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 檢查是否已經有 viewport meta 標籤
    if 'viewport' in content:
        return
    
    # 在 head 標籤後添加 viewport meta 標籤
    if '<head>' in content:
        new_content = content.replace('<head>', '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">')
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Added viewport meta to {file_path}")

def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                add_viewport_meta(file_path)

# 處理當前目錄下的所有 HTML 文件
process_directory('.') 