import os
import re
import markdown

def convert_links(md_text):
    # 將 [文字](xxx.md) 變成 [文字](xxx.html)
    return re.sub(r'\(([^)]+?)\.md\)', r'(\1.html)', md_text)

def convert_md_to_html(md_file):
    with open(md_file, 'r', encoding='utf-8') as f:
        md_text = f.read()

    # 轉換 .md 連結
    md_text = convert_links(md_text)

    # markdown 轉 html
    html = markdown.markdown(md_text)

    # 儲存成 .html 檔
    html_file = os.path.splitext(md_file)[0] + '.html'
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f'✅ 已轉換：{md_file} → {html_file}')

# 可處理多個檔案
md_files = ['index.md', 'imageProcess.md']
for md_file in md_files:
    convert_md_to_html(md_file)
