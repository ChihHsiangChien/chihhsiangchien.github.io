import pandas as pd
import csv

df = pd.read_csv('~/下載/新竹的歷史 - 工作表1.csv', header=0)
results = []

# 欄位名稱
headers = df.columns

# 掃描每一列
for idx, row in df.iterrows():
    year = row['西元']
    chineseEra = row['中國紀年'] + str(row['年序']) + "年"
    # 第8欄到倒數第二欄（Python index: 8 ~ -2）
    for col in headers[8:-1]:
        content = row[col]
        if pd.notna(content) and str(content).strip() != '':
            content = chineseEra + "，" + content
            results.append((year, col, content))
            '''
            results.append({
                '西元年': year,
                '分類': col,
                '事件': content
            })
            '''

# 輸出結果
for item in results:
    print(item)


# 轉成 DataFrame
output_df = pd.DataFrame(results, columns=['西元年', '分類', '事件'])

# 輸出成 CSV
output_df.to_csv('output.csv', index=False, encoding='utf-8-sig')    