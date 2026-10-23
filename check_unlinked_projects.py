#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
檢視 index.html 與專案資料夾結構，找出未被首頁連結的專案目錄與 HTML 頁面。

使用方式:
    python3 check_unlinked_projects.py
    python3 check_unlinked_projects.py --md UNLINKED_PROJECTS.md
"""

import sys
import argparse
import urllib.parse
from pathlib import Path
from bs4 import BeautifulSoup


def parse_index_links(index_path: Path):
    """解析 index.html 內所有 <a> 標籤的連結目標"""
    if not index_path.exists():
        print(f"[錯誤] 找不到 {index_path}", file=sys.stderr)
        sys.exit(1)

    with open(index_path, "r", encoding="utf-8", errors="ignore") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    raw_links = []
    broken_links = []
    typo_links = []

    for a in soup.find_all("a"):
        href = a.get("href")
        if not href:
            continue

        raw_href = href
        # 檢查前後是否有不小心多鍵入的空白
        if raw_href != raw_href.strip():
            typo_links.append((raw_href, a.text.strip()))

        stripped = raw_href.strip()
        # 排除外部連結
        if stripped.startswith("http://") or stripped.startswith("https://") or stripped.startswith("mailto:"):
            continue

        # 去除 query parameter 與 hash
        clean_url = stripped.split("?")[0].split("#")[0].rstrip("/")
        clean_path = urllib.parse.unquote(clean_url)

        if not clean_path:
            continue

        raw_links.append(clean_path)

        # 檢查連結目標是否存在
        target = Path(clean_path)
        if not target.exists() and not (target / "index.html").exists():
            broken_links.append((raw_href, a.text.strip()))

    return raw_links, broken_links, typo_links


def inspect_repository(root_path: Path, linked_paths: list):
    """比對本專案目錄與 index.html 連結"""
    # 建立已連結集合（包含路徑本身及其所有父目錄）
    linked_set = set()
    for lp in linked_paths:
        p = Path(lp)
        linked_set.add(str(p))
        for parent in p.parents:
            if str(parent) != ".":
                linked_set.add(str(parent))

    # 取得專案下一級目錄（忽略隱藏目錄如 .git）
    all_top_dirs = [
        d for d in root_path.iterdir()
        if d.is_dir() and not d.name.startswith(".")
    ]

    unlinked_top_dirs = []
    linked_top_dirs = []

    for d in sorted(all_top_dirs):
        # 如果一級目錄名稱未出現在任何連結中
        if d.name not in linked_set:
            unlinked_top_dirs.append(d)
        else:
            linked_top_dirs.append(d)

    # 檢查所有 HTML 檔案是否有遺漏
    all_html_files = [
        p for p in root_path.rglob("*.html")
        if not any(part.startswith(".") for part in p.parts)
    ]

    unlinked_html_files = []
    for h in all_html_files:
        rel = str(h.relative_to(root_path))
        if rel == "index.html":
            continue
        # 檢查各種連結形式 (例如 folder/index.html, folder, 或完整 html 名稱)
        is_linked = False
        if rel in linked_set:
            is_linked = True
        elif rel.endswith("/index.html") and rel[:-11] in linked_set:
            is_linked = True
        elif rel.endswith("index.html") and rel[:-10].rstrip("/") in linked_set:
            is_linked = True

        if not is_linked:
            unlinked_html_files.append(h)

    return linked_top_dirs, unlinked_top_dirs, unlinked_html_files


def get_html_title(html_path: Path) -> str:
    """讀取 HTML title 標籤"""
    try:
        with open(html_path, "r", encoding="utf-8", errors="ignore") as f:
            soup = BeautifulSoup(f.read(), "html.parser")
            if soup.title and soup.title.string:
                return soup.title.string.strip()
    except Exception:
        pass
    return "(無標題)"


def main():
    parser = argparse.ArgumentParser(description="檢視 index.html 與專案目錄中未連結的項目")
    parser.add_argument("--root", default=".", help="專案根目錄路徑 (預設: .)")
    parser.add_argument("--index", default="index.html", help="首頁檔案名稱 (預設: index.html)")
    args = parser.parse_args()

    root_path = Path(args.root).resolve()
    index_path = root_path / args.index

    print(f"🔍 正在檢視專案目錄: {root_path}")
    print(f"📄 讀取首頁: {index_path}\n")

    linked_paths, broken_links, typo_links = parse_index_links(index_path)
    linked_top_dirs, unlinked_top_dirs, unlinked_html_files = inspect_repository(root_path, linked_paths)

    print("=" * 60)
    print("📊 統計總覽")
    print("=" * 60)
    print(f"• index.html 有效內部連結數: {len(linked_paths)}")
    print(f"• 一級目錄總數: {len(linked_top_dirs) + len(unlinked_top_dirs)}")
    print(f"  ├── 已連結之一級目錄: {len(linked_top_dirs)}")
    print(f"  └── 未被連結之一級目錄: {len(unlinked_top_dirs)}")
    print(f"• 全專案未被連結之 HTML 檔案數: {len(unlinked_html_files)}")

    if typo_links:
        print("\n⚠️ 發現可能有格式瑕疵的連結（如前後包含多餘空格）：")
        for raw, text in typo_links:
            print(f"   - href='{raw}' (標題: {text})")

    if broken_links:
        print("\n❌ 發現無效死連結 (404 Not Found)：")
        for raw, text in broken_links:
            print(f"   - href='{raw}' (標題: {text})")

    print("\n" + "=" * 60)
    print(f"📁 未被 index.html 連結之一級目錄清單 ({len(unlinked_top_dirs)} 個)")
    print("=" * 60)

    for d in sorted(unlinked_top_dirs, key=lambda x: x.name):
        has_index = (d / "index.html").exists()
        html_files = list(d.glob("*.html"))
        files = list(d.glob("*"))

        title_info = ""
        if has_index:
            title_info = f" [首頁標題: {get_html_title(d / 'index.html')}]"
        elif html_files:
            title_info = f" [包含 HTML: {html_files[0].name} - {get_html_title(html_files[0])}]"

        status_tag = "🟢 具 index.html" if has_index else "⚪ 無 index.html"
        print(f"• {d.name:<25} | {status_tag} | 共 {len(files)} 檔案{title_info}")

    print("\n💡 提示：若需查看各未連結目錄的詳細教學定位與精進建議，請參閱 UNLINKED_PROJECTS.md")


if __name__ == "__main__":
    main()
