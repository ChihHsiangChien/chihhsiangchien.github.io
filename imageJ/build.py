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
    md = markdown.Markdown(
        extensions=[
            TocExtension(toc_depth='1-3', permalink=False),
            'tables',
            'markdown.extensions.fenced_code',
            'markdown.extensions.attr_list',
            'pymdownx.arithmatex'
        ],
        extension_configs={
            'pymdownx.arithmatex': {
                'generic': True
            }
        }
    )

    html_body = md.convert(md_text)
    toc_html = md.toc

    # 拼成完整的 HTML
    html_full = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>{os.path.splitext(os.path.basename(md_path))[0]}</title>
<link rel="stylesheet" href="styles.css">
<!-- KaTeX CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css" integrity="sha384-wcIxkf4k558AjM3Yz3BBFQUbk/zgIYC2R0QpeeYb+TwlBVMrlgLqwRjRtGZiK7ww" crossorigin="anonymous">
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

<!-- Mermaid JS -->
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs';
  mermaid.initialize({{}}); // Keep double braces for literal JS object
  mermaid.run({{ nodes: document.querySelectorAll('.language-mermaid') }}); // Keep double braces
</script>

<!-- KaTeX JS -->
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js" integrity="sha384-hIoBPJpTUs74ddyc4bFZSM1TVlQDA60VBbJS0oA934VSz82sBx1X7kSx2ATBDIyd" crossorigin="anonymous"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/contrib/auto-render.min.js" integrity="sha384-43gviWU0YVjaDtb/GhzOouOXtZMP/7XUzwPTstBeZFe/+rCMvRwr4yROQP43s0Xk" crossorigin="anonymous"></script>
<!-- *** CORRECTED SCRIPT WITH ${{...}} ESCAPING *** -->
        <script>
            document.addEventListener("DOMContentLoaded", function() {{
                renderMathInElement(document.body, {{
                    delimiters: [
                        {{ left: '$$',  right: '$$',  display: true }},
                        {{ left: '\\\\[', right: '\\\\]', display: true }},
                        {{ left: '\\\\(', right: '\\\\)', display: false }}
                    ],
                    ignoredTags: ['script','noscript','style','textarea','pre','code'],
                    throwOnError: false
                }});
            }});
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

def build_all():
    for filename in os.listdir(input_folder):
        if filename.endswith('.md'):
            md_path = os.path.join(input_folder, filename)
            convert_md_to_html(md_path)

if __name__ == '__main__':
    build_all()
