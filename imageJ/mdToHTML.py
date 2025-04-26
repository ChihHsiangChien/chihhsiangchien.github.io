import os
import re
import markdown
from markdown.extensions.toc import TocExtension

def convert_links(md_text):
    # 把 .md 超連結換成 .html
    return re.sub(r'\(([^)]+?)\.md\)', r'(\1.html)', md_text)

def convert_md_to_html(md_file):
    with open(md_file, 'r', encoding='utf-8') as f:
        md_text = f.read()

    # 替換 .md 連結
    md_text = convert_links(md_text)

    # 轉成 HTML，並啟用 TOC
    html_body = markdown.markdown(md_text, extensions=['toc'])

    # 頁面統一加上 styles.css，並加上浮動 TOC 區塊
    html_full = f"""
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>{os.path.splitext(os.path.basename(md_file))[0]}</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>

<div id="toc">
<h2>目錄</h2>
<div class="toc-container">
{markdown.markdown(md_text, extensions=[TocExtension(baselevel=2)])}
</div>
</div>

<div id="content">
{html_body}
</div>

</body>
</html>
"""

    # 儲存成 .html
    html_file = os.path.splitext(md_file)[0] + '.html'
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_full)

    print(f'✅ 已轉換：{md_file} → {html_file}')

# 可處理多個 md 檔案
md_files = ['index.md', 'imageProcess.md']
for md_file in md_files:
    convert_md_to_html(md_file)
