# Tailwind CSS 類別清單 (Class List)

| 元件                | 類別                                                                                                              | 用途                                |
|---------------------|-------------------------------------------------------------------------------------------------------------------|------------------------------------|
| 全局 Container       | `min-h-screen flex flex-col bg-gray-50 text-gray-800 font-sans`                                                       | 滿版、彈性直列、背景、字體           |
| Header / 標題區       | `px-6 py-4 bg-green-600 text-white flex justify-between items-center`                                               | 上方標題條                           |
| 指標卡片 (Metric)      | `w-28 p-4 bg-white shadow rounded-lg flex flex-col items-center`                                                      | 儀表板各指標                         |
| 指標數字             | `text-2xl font-bold mt-1`                                                                                            | 大號粗體                             |
| 主要內容區 (Main)     | `flex-1 p-6 overflow-auto`                                                                                           | 中間內容、可捲動                     |
| 狀態提示欄 (Banner)    | `w-full bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4`                                            | 回合提示／警告                       |
| 卡片容器 (Card Panel)  | `w-full bg-gray-100 p-4 flex justify-around space-x-4`                                                               | 底部三張卡片的外框                   |
| 策略卡 (Strategy Card) | `w-1/3 bg-white hover:shadow-lg active:shadow-md focus:outline-none rounded-lg border cursor-pointer transition-all` | 策略卡                              |
| 卡片標題             | `text-lg font-semibold mb-2`                                                                                         | 卡片標題                            |
| 卡片敘述             | `text-sm text-gray-600 flex-1`                                                                                        | 卡片說明                            |
| 卡片效果列           | `mt-2 flex justify-between text-sm`                                                                                   | 卡片效果（例：+10 生態、-5 經濟）   |
| 主要按鈕 (Button)      | `px-4 py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded focus:outline-none transition`   | 一般按鈕（開始、下一回合、再玩一次…） |
| 浮動 Modal 背板        | `fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center`                                                | Modal 遮罩                           |
| 事件卡 Modal         | `bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4`                                                          | 置中事件卡                          |
| 側邊日誌 (Drawer)      | `fixed top-0 right-0 h-full w-80 bg-white shadow-lg transform translate-x-full transition-transform`               | 右側抽屜                            |
| 側邊日誌開啟           | `translate-x-0`                                                                                                       | 抽屜滑出狀態                        |