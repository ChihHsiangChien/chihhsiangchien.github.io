import os
import re

# --- 設定 ---
# Markdown 檔案所在的目錄
PAGES_DIR = './'
# 主索引檔案的路徑
INDEX_FILE = os.path.join(PAGES_DIR, 'index.md')
# --- 設定結束 ---

def find_unlinked_markdown_files(pages_dir, index_file):
    """
    找出指定目錄下未在索引檔案中連結的 Markdown 檔案。

    Args:
        pages_dir (str): 包含所有 Markdown 檔案的目錄路徑。
        index_file (str): 主索引 Markdown 檔案的路徑。

    Returns:
        set: 未被連結的 Markdown 檔案名稱集合。
             如果發生錯誤則返回 None。
    """
    all_md_files = set()
    linked_md_files = set()

    # 1. 取得目錄下所有的 .md 檔案名稱
    try:
        for filename in os.listdir(pages_dir):
            if filename.lower().endswith('.md'):
                all_md_files.add(filename)
    except FileNotFoundError:
        print(f"錯誤：找不到目錄 '{pages_dir}'")
        return None
    except Exception as e:
        print(f"讀取目錄 '{pages_dir}' 時發生錯誤：{e}")
        return None

    if not all_md_files:
        print(f"目錄 '{pages_dir}' 中沒有找到任何 .md 檔案。")
        return set() # 返回空集合

    # 2. 讀取 index.md 並找出所有連結的 .md 檔案
    try:
        with open(index_file, 'r', encoding='utf-8') as f:
            content = f.read()
            # 使用正規表達式尋找 Markdown 連結中的 .md 檔案
            # 匹配像 [連結文字](檔案名稱.md) 或 <檔案名稱.md> 這樣的模式
            # 這裡使用一個比較通用的模式，主要捕獲括號內的 .md 檔案
            # 注意：這個 regex 可能需要根據 index.md 中實際的連結格式微調
            # (.*?\.md) 會捕獲括號內以 .md 結尾的字串
            found_links = re.findall(r'\(([^)]*?\.md)\)', content)
            # 也可以考慮直接匹配 <...> 格式的連結 (如果有的話)
            # found_angle_links = re.findall(r'<([^>]*?\.md)>', content)
            # linked_md_files.update(found_angle_links)

            linked_md_files.update(link.strip() for link in found_links)

    except FileNotFoundError:
        print(f"錯誤：找不到索引檔案 '{index_file}'")
        return None
    except Exception as e:
        print(f"讀取索引檔案 '{index_file}' 時發生錯誤：{e}")
        return None

    # 3. 將 index.md 本身視為已被連結 (或不需要檢查)
    index_filename = os.path.basename(index_file)
    if index_filename in all_md_files:
         # 可以選擇從 all_md_files 移除，或加入 linked_md_files
         # all_md_files.remove(index_filename)
         linked_md_files.add(index_filename) # 加入 linked_md_files 更直觀

    # 4. 計算差集，找出未被連結的檔案
    unlinked_files = all_md_files - linked_md_files

    return unlinked_files

# --- 執行 ---
if __name__ == "__main__":
    unlinked = find_unlinked_markdown_files(PAGES_DIR, INDEX_FILE)

    if unlinked is not None:
        if unlinked:
            print(f"在 '{os.path.basename(INDEX_FILE)}' 中未被連結的 .md 檔案：")
            for file in sorted(list(unlinked)): # 排序後輸出
                print(f"- {file}")
        else:
            print(f"所有在 '{PAGES_DIR}' 目錄下的 .md 檔案都已在 '{os.path.basename(INDEX_FILE)}' 中被連結。")

