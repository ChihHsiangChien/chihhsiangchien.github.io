import os
import re
import markdown
from markdown.extensions.toc import TocExtension

# 設定：要處理的資料夾
input_folder = './'
output_folder = './'

def convert_links(md_text):
    # 將 .md 的連結改成 .html
    return re.sub(r'\(([^)]+?)\.md\)', r'(\1.html)', md_text)

def convert_md_to_html(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    # 替換 .md 連結
    md_text = convert_links(md_text)

    # 使用 markdown 函式庫產生 HTML 和 TOC
    # 加入 'tables' 擴充功能
    md = markdown.Markdown(extensions=[
        TocExtension(toc_depth='1-3', permalink=False),
        'tables',  # <--- 加入這個擴充功能
        'markdown.extensions.fenced_code',
        'markdown.extensions.fenced_code', # 處理 ``` ``` 程式碼區塊
        # 如果需要其他擴充功能，也可以加在這裡，例如：
        
        'markdown.extensions.attr_list'  # <--- 加入這個        
        #'markdown.extensions.codehilite', # 程式碼高亮 (需安裝 Pygments)        


    ])
    html_body = md.convert(md_text)
    toc_html = md.toc # 直接取得 markdown 產生的 TOC

    # 拼成完整的 HTML
    html_full = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>{os.path.splitext(os.path.basename(md_path))[0]}</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>

<div id="toc">
<h2><a href="index.html">回到首頁</a></h2>

<div class="toc-container">
{toc_html}
</div>
</div>

<div id="content">
{html_body}
</div>

<!-- 如果需要使用 Mermaid JS，請取消註解以下代碼並確保 Mermaid JS 已正確安裝 -->
<!-- Mermaid 是一個用於生成圖表和流程圖的 JavaScript 庫。 -->
<!-- 官方文件: https://mermaid-js.github.io/mermaid/#/ -->
<script type="module">
  // 初始化 Mermaid JS，啟用自動渲染
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs';
  // 設定 Mermaid 的配置
  mermaid.initialize({{
    startOnLoad: true,
    theme: 'neutral',
    flowchart: {{
      curve: 'linear'
    }},
    sequence: {{
      actorFontSize: 16,
      actorMargin: 10,
      boxTextMargin: 6,
      noteMargin: 10,
      messageMargin: 10
    }}
  }});  

  // 自動渲染所有的 Mermaid 圖表
  mermaid.run({{ nodes: document.querySelectorAll('.language-mermaid') }});

</script>

</body>
</html>
"""

    # 儲存 HTML
    html_file = os.path.splitext(os.path.basename(md_path))[0] + '.html'
    output_path = os.path.join(output_folder, html_file)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_full)

    print(f'✅ {md_path} → {output_path}')

# ... (build_all 和 if __name__ == '__main__' 部分不變) ...

def build_all():
    for filename in os.listdir(input_folder):
        if filename.endswith('.md'):
            md_path = os.path.join(input_folder, filename)
            convert_md_to_html(md_path)

if __name__ == '__main__':
    build_all()
