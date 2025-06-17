## 專案：EcoTactica

## 1. 概述 (Overview)

**EcoTactica** 是一款專為 iPad 設計的基於瀏覽器的模擬遊戲。 學生扮演決策者或社區領袖的角色，在應對不可預見的全球或地方性事件的同時，權衡環境、經濟和社會之間的關係，以改善生物多樣性和永續性指標。

**遊戲機制**:
*   **卡牌驅動 (Card-driven)**：遊戲的核心是策略卡和事件卡的互動。
    *   **策略卡**： 玩家選擇。
    *   **事件卡**： 觸發事件並修改狀態。
*   **基於旗標的狀態機 (Flag-based State Machine)**：
    *   用於追蹤長期變化和觸發條件。
*   **馬可夫鏈 (Markov Chain)**：
    *   模擬概率性結果和回饋迴圈。

## 2. 核心循環 (Core Loop)
每回合，玩家：
1.  **審視 (Review)**： 查看儀錶板 (Dashboard) 上的環境和社會指標。
2.  **選擇 (Select)**： 從抽取的三張 **策略卡 (Strategy Cards)** 中選擇一張。
3.  **應對 (React)**： 可能會遇到 **事件卡 (Event Card)** (隨機或條件觸發)。
4.  **計算 (Compute)**： 系統計算狀態變化，修改儀錶板，並更新旗標 (Flags)。

## 3. 遊戲元素 (Game Elements)

### 3.1 儀錶板 (Dashboard) - 狀態 (State)

遊戲中會變化的可量化指標：

*   **氣候穩定度 (Climate Stability)** (0–100)
*   **生物多樣性指數 (Biodiversity Index)** (0–100)
*   **公眾信任度 (Public Trust)** (0–100)
*   **經濟可行性 (Economic Viability)** (0–100)
*   **社會公平 (Social Equity)** (0–100)
*   **旗標儲存 (Flag storage)** (詳情見下文)

### 3.2 策略卡 (Strategy Cards)
*  strategies.json
*   **卡牌數量**: 20+ 張預先定義好的卡牌，逐步抽取。
*   **每個卡牌的組成**:
    *   **標題 (Title)**
    *   **描述 (Description)**
    *   **效果 (Effect)**： 定量 (例如: +10 生物多樣性, -5 經濟)。
    *   **基於旗標的條件修飾符 (Conditional modifiers)**
*   **效果的應用**: 立即生效，或通過旗標觸發延遲效果。

### 3.3 事件卡 (Event Cards)
*  events.json
*   **觸發機制**: 隨機觸發，或基於特定旗標邏輯觸發。
*   **範例**:
    *   如果氣候穩定度 < 30，觸發"洪水災難 (Flood Disaster)"。
    *   如果連續 3 次出現污染事件後，公眾信任度 < 50，觸發"青年氣候罷課 (Youth Climate Strike)"。
*   **功能**: 可以放大或抵消策略效果。
### 旗標
* 觸發旗標 (trigger_flag): 當遊戲狀態滿足特定條件時 (例如，PM2.5 超過一定值)，設定這個旗標，表示事件可能發生。 這是一個用於事件觸發的訊號。
* 必須旗標 (required_flag): 事件只有在滿足這些旗標的條件下，才可能觸發。 例如，"青年倡議：氣候罷課"事件，必須旗標 可能包括 climatePolicyNeglected: true 與 publicTrust < 50。
* 禁止旗標 (prohibit_flag): 事件不能在這些旗標被設定時觸發。 例如，如果已經執行了「碳稅制度」策略，則可能禁止再次發生「全球關注：氣候峰會」事件 (避免重複)。
* 使用範例：
    * PM2.5：排放超標 事件：
    * 觸發旗標 (trigger_flag): pollutionEvent
    * 這個事件可能會在每回合結束時，檢查 PM2.5 指標是否超標，如果超標，則 pollutionEvent 旗標會被設置。
    * 青年倡議：氣候罷課 事件：
    * 觸發旗標 (trigger_flag): (留空，表示不直接由狀態觸發，而是由其他事件或旗標觸發)
    * 必須旗標 (required_flag): climatePolicyNeglected, publicTrust < 50 (表示如果玩家忽視氣候政策，且公眾信任度低，就會觸發)
    * 禁止旗標 (prohibit_flag): (無)

### 旗標種類
    * 事件旗標： 用於標記特定事件是否已發生。 例如，floodOccurred, energyCrisisOccurred。
    * 狀態旗標： 表示遊戲狀態的變更，可以被事件和策略修改。 例如，climatePolicyNeglected (表示玩家忽視氣候政策)。
    * 計數器旗標： 用於記錄事件發生的次數，或者玩家採取特定行動的次數。 例如，pollutionOverLimitCount (表示污染超標的回合數)。
    * 選擇旗標： 用於記錄玩家的決策。 例如，joinedTreaty (表示玩家是否加入了國際協議)。
    * 時間旗標 (延遲效果): 用于追踪延遲效果。例如，delayedCarbonTax (表示碳稅將在 X 回合後實施)。
    
### 旗標用於追蹤狀態、控制事件觸發、以及影響策略的效果。
* 原因：
    * 追蹤狀態： 旗標用於記錄遊戲中發生的事情、玩家的選擇、以及環境的變化。 例如，energyCrisisOccurred 旗標用於記錄能源危機是否發生過。
    * 事件觸發： 旗標是觸發事件的關鍵。 事件可能基於各種狀態 (如氣候穩定度、公眾信任度)，而這些狀態的變化通常通過旗標來表示。
    * 策略效果修飾： 策略的效果可以根據旗標的值而變化。 例如，如果設置了 carbonTaxImplemented 旗標，某些減少碳排放的策略可以獲得額外的效果。
    * 遊戲流程控制： 旗標可以用於控制遊戲的流程，例如，鎖定某些策略，直到滿足特定條件。
    * 複雜的交互作用： 旗標允許複雜的互動。 舉例來說，一個事件可以觸發設置旗標，而這個旗標又可以觸發另一個事件。 這讓遊戲中的事件可以產生連鎖反應，使得遊戲更具深度。


*   **資料類型**: 布林值 (Boolean) 或數值 (Numeric) 變數，儲存為鍵值對 (key-value pairs)。
*   **用途**:
    *   **追蹤事件歷史 (Event History)** (例如, `energyCrisisOccurred: true`)
    *   **儲存計數器 (Counters)** (例如, `pollutionOverLimitCount: 2`)
    *   **管理條件邏輯 (Conditional Logic)** 和延遲效果 (Delayed Effects)

### 遊戲邏輯範例 (事件觸發):
* 回合結束: 遊戲引擎檢查是否有任何事件的 觸發旗標 存在。
* 觸發旗標存在:
    * 引擎檢查事件的 必須旗標 是否全部為真。
    * 引擎檢查事件的 禁止旗標 是否全部為假。
* 觸發條件符合:
    * 如果事件的條件都符合，則事件卡被抽取，並執行事件的效果。



### 轉變 (Transitions)

*   **計算方式**: 遊戲邏輯基於策略 + 事件 + 旗標來評估狀態轉變。
*   **可選的馬可夫鏈 (Markov Chain)**：
    *   集成馬可夫鏈矩陣，用於概率性地模擬長期變化 (例如，如果 X 回合後沒有採取保育行動，則生物多樣性退化)。

## 4. 勝負條件 (Win/Lose Conditions)

*   **遊戲持續回合數**: 固定回合數 (例如, 12 回合)。
*   **評分標準 (Scoring Rubric)**： 根據最終儀錶板評估：
    *   在 3+ 個指標中達到 80 分或以上 = 傑出 (Outstanding)
    *   在 3+ 個指標中達到 50–80 分 = 可接受 (Acceptable)
    *   在 3+ 個指標中達到 <50 分 = 遊戲結束 (Game Over) (生態崩潰)

## 5. 範例資料格式 (Sample Data Formats)

### 5.1 策略卡 CSV 欄位 (Strategy Card CSV Columns):

```
| id | title | description | effect_biodiversity | effect_economy | effect_public_trust | effect_climate | effect_social | required_flag | prohibit_flag | delayed_flag | delay_turns |
```

### 5.2 旗標範例 (Flags Example):

```json
"flags": {
  "energyCrisisOccurred": true,
  "joinedTreaty": false,
  "pollutionOverLimitCount": 2,
  "delayedCarbonTax": {"delay": 2, "type": "carbonTax"}
}
```

## 6. UI/UX 指南 (UI/UX Guidelines)

*   **針對 iPad 橫向模式 (landscape)** 的移動優先 (Mobile-first) 佈局。
*   **卡牌選擇面板** (底部)，**儀錶板** (頂部或側面)。
*   **卡牌效果的動畫過渡 (Animated transitions)**。
*   **策略和事件日誌 (Logs)**，用於審查。

*   **勝利條件和評分系統**:
    *   評分系統應該清晰地反映玩家的目標，並且能夠鼓勵玩家做出明智的選擇。
    *   考慮使用多種評分方式，例如：
        *   **總分** (總體指標)
        *   **單項指標** (例如，生物多樣性分數)
        *   **事件響應評分** (玩家如何應對事件)


**程式碼說明:**

1.  **載入資料:** 使用 `load_data()` 函數從 JSON 檔案載入事件和策略卡的資料。 使用 `load_markov_chains()`載入馬可夫鏈資料.
2.  **JSON 資料結構：** 使用 JSON 格式來儲存事件和策略卡的資料。
3.  **事件觸發邏輯：**
    *   `check_and_trigger_events(events)` 函數：
        *   檢查事件的觸發條件 (trigger\_flag, required\_flag, prohibit\_flag)。
        *   如果滿足條件，執行事件效果。
        *   呼叫 `apply_event_effects` 函數來執行效果，包括修改指標，設定或清除旗標，以及呼叫馬可夫鏈。
    *   `should_event_trigger(event)` 函數：檢查事件是否滿足觸發條件，運用 `all()` 和 `any()`
4.  **馬可夫鏈邏輯:**
    *   `get_markov_chain_state()` 函數：
        *   接收馬可夫鏈的名稱和目前狀態
        *   根據轉移矩陣，計算下一回合的狀態。
        *   回傳下個狀態.
5.  **策略執行邏輯 (choose\_strategy):**
    *   `choose_strategy(strategy_id, strategies)` 函數： 模擬玩家選擇策略，然後根據策略的資料，修改遊戲狀態。
6.  **主遊戲迴圈 (game\_loop):**
    *   `pm25_level` 高於閾值, 則設定 `pollutionEvent` 旗標。
    *   呼叫 `check_and_trigger_events` 來觸發事件。
    *   呼叫 `get_markov_chain_state()`，使用馬可夫鏈來更新遊戲的狀態 (例如，PM2.5 等級，氣候變化)。
    *   執行其他回合處理。

## markov chain
**使用這些馬可夫鏈的步驟：**

1.  **載入馬可夫鏈資料：**  在程式碼中，使用 `load_markov_chains()` 函數載入 `markov_chains.json` 檔案。
2.  **在回合開始時：**
    *   調用 `get_markov_chain_state(chain_name, markov_chains, current_state)` 函數， 來獲得下一個狀態.
3.  **在事件中：**
    *   在事件中，使用馬可夫鏈的結果來影響遊戲狀態。
    *   例如，  如果 `biodiversity_decline`  的狀態是  `Poor`，則可以對生物多樣性的指標造成較大的負面影響。

**修改轉移機率：**

根據遊戲的平衡性和您的想法，來調整這些轉移機率。 例如：

*   **控制變數：**  您可以通過策略卡和事件來修改轉移機率。  例如，如果玩家實施了 `再生農業` 策略，您可以修改 `biodiversity_decline` 馬可夫鏈的轉移機率， 使得狀態從 "Good" 轉移到 "Moderate" 的機率降低。
*   **事件觸發：** 可以根據遊戲的指標狀態，來改變馬可夫鏈的轉移機率。 例如，如果氣候變遷的指標很高，  `forest_fire_impact`  的狀態從  `Low`  轉移到 `High`  的機率可以增加。

**如何將這些馬可夫鏈與事件和策略結合 (範例)：**

1.  **PM2.5 事件：**
    *   **`PM2.5：排放超標` 事件:**
        *   `trigger_flag`: `pollutionEvent`
        *   `markov_chain`: `"pm25_degradation"`
        *   **效果：**  在  `apply_event_effects`  函數中， 根據  `pm25_degradation`  的狀態， 修改 `pm25_level`。  例如，如果狀態是 "High"，則增加 `pm25_level` 10； 如果是 "Medium"，則增加 5；  如果是 "Low"，則減少 3。
2.  **策略：再生能源優先**
   * `能源轉型：綠能優先`的策略卡:
    *   `set_flag`: `greenEnergyPromotion`
    *   **影響：** 在程式碼中，可以根據 `greenEnergyPromotion` 旗標，來修改  `pm25_degradation` 馬可夫鏈的轉移機率 (例如： 將狀態轉移到 'High' 的機率降低)
3.  **森林大火事件**
  *   **`森林大火事件`事件:**
        *   `trigger_flag`: `forestFireEvent`
        *   `markov_chain`: `"forest_fire_impact"`
        *   **效果：** 在 `apply_event_effects`  函數中， 根據  `forest_fire_impact`  的狀態， 修改 `climate` (氣候), `biodiversity`(生物多樣性),  `economy` (經濟)。


**運作流程 (PM2.5 事件)：**

1.  **回合 1 開始:**
    *   `pm25_level` 檢查，如果大於閾值，則設定 `pollutionEvent = True`。
    *   `check_and_trigger_events` 函數被呼叫。
    *   `PM2.5：排放超標`  事件被檢查。  因為  `pollutionEvent` 為  `True` 且 沒有 `prohibit_flag`，事件觸發。
    *   執行事件效果：  降低 `public_trust`，降低 `climate`，並且呼叫  `get_markov_chain_state`。
    *   `get_markov_chain_state` 函數根據  `pm25_degradation` 馬可夫鏈的轉移機率， 更新  `pm25_level`。
    *   `pm25_level`  根據  `pm25_degradation` 馬可夫鏈的結果，可能增加，可能減少，也可能不變。
    *   顯示遊戲狀態。
2.  **玩家選擇策略 (例如：節能家電補助):**
    *   玩家選擇策略 71.
    *   執行 `能源效率：節能家電補助` 策略。  設定 `greenEnergyPromotion = True`。
3.  **回合 2 開始:**
    *   `pm25_level` 檢查，如果大於閾值，則設定 `pollutionEvent = True`。
    *   `check_and_trigger_events` 函數被呼叫。
    *   `PM2.5：排放超標 (加劇)` 事件被檢查。  `trigger_flag` 是 `pollutionEvent`。 `required_flag` 是 `carbonTaxImplemented` (假定碳稅尚未實施，因此不會觸發此事件)。
    *   `get_markov_chain_state()`被呼叫，再次更新 `pm25_level`。
    *   顯示遊戲狀態。


**馬可夫鏈包括**

*   **`pm25_degradation`:**  (保留之前的例子) 模擬 PM2.5 污染的變化.
*   **`forest_fire_impact`:** (保留之前的例子) 模擬森林大火的影響.
*   **`biodiversity_decline`:**  模擬生物多樣性的衰退。 如果沒有保護措施，衰退的可能性較高。
*   **`fishery_resource_depletion`:** 模擬漁業資源的枯竭。 枯竭是一個不可逆轉的狀態。
*   **`climate_change_impact`:**  模擬氣候變遷的影響。
*   **`public_trust_erosion`:**  模擬公眾信任度的變化。
*   **`economic_fluctuation`:**  模擬經濟狀況的波動。
*   **`invasive_species_spread`:** 模擬外來物種的擴散。




** 程式碼 (Python 範例，更完整):**

```python
import json
import random

# --- 1. 載入資料 (資料驅動設計的關鍵) ---
def load_data(file_path):
    """從 JSON 檔案載入資料"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"錯誤：找不到檔案 {file_path}。")
        return {}
    except json.JSONDecodeError:
        print(f"錯誤：{file_path} 不是有效的 JSON 檔案。")
        return {}

# --- 2.  遊戲狀態 (State) ---
game_state = {
    "biodiversity": 50,
    "economy": 50,
    "public_trust": 50,
    "climate": 50,
    "flags": {
        "pollutionEvent": False,
        "carbonTaxImplemented": False,
        "pollutionControl": False,
        "greenEnergyPromotion": False
    },
    "pm25_level": 60,
    "pm25_threshold": 50,
    "current_turn": 1
}

# --- 3. 馬可夫鏈相關函數 (Markov Chain Functions) ---
def load_markov_chains(file_path):
    """载入马尔可夫链"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"錯誤：找不到檔案 {file_path}。")
        return {}
    except json.JSONDecodeError:
        print(f"錯誤：{file_path} 不是有效的 JSON 檔案。")
        return {}

def get_markov_chain_state(chain_name, markov_chains, current_state=None):
    """根据马尔可夫链的转移动态更新游戏状态"""
    if chain_name not in markov_chains:
        print(f"警告：找不到馬可夫鏈 {chain_name}。")
        return current_state
    chain = markov_chains[chain_name]
    if current_state is None:
      current_state = chain["initial_state"]
    try:
      current_index = chain["states"].index(current_state)
      probabilities = chain["transitions"][current_index]
      next_state = random.choices(chain["states"], weights=probabilities, k=1)[0]
      return next_state
    except ValueError:
       print(f"警告：馬可夫鏈的初始狀態或當前狀態不存在。")
       return current_state

# --- 4. 輔助函數 (Helper functions) ---
def get_flag(flag_name):
    """取得旗標的值"""
    return game_state["flags"].get(flag_name, False)

def set_flag(flag_name, value):
    """設定旗標的值"""
    game_state["flags"][flag_name] = value
    print(f"  - 設定旗標: {flag_name} = {value}")

def clear_flag(flag_name):
  """清空旗標"""
  if flag_name in game_state["flags"]:
      game_state["flags"].pop(flag_name)
      print(f"  - 清空旗標: {flag_name}")
  else:
      print(f"  - 警告: 旗標 {flag_name} 不存在，無法清除")

def change_biodiversity(amount):
    """改變生物多樣性"""
    global game_state
    game_state["biodiversity"] = max(0, min(100, game_state["biodiversity"] + amount))
    print(f"  - 生物多樣性: {game_state['biodiversity']}")

def change_economy(amount):
    """改變經濟"""
    global game_state
    game_state["economy"] = max(0, min(100, game_state["economy"] + amount))
    print(f"  - 經濟: {game_state['economy']}")

def change_public_trust(amount):
    """改變公共信任度"""
    global game_state
    game_state["public_trust"] = max(0, min(100, game_state["public_trust"] + amount))
    print(f"  - 公共信任度: {game_state['public_trust']}")

def change_climate(amount):
    """改變氣候"""
    global game_state
    game_state["climate"] = max(0, min(100, game_state["climate"] + amount))
    print(f"  - 氣候: {game_state['climate']}")

def get_pm25_value():
    """ 取得PM2.5 指標"""
    return game_state["pm25_level"]

def set_pm25_value(value):
    """设置 PM2.5 的数值"""
    global game_state
    game_state["pm25_level"] = max(0, min(100, value)) # 限制在 0-100
    print(f"  - PM2.5 等級: {game_state['pm25_level']}")

# --- 5. 事件觸發邏輯 (Event Triggering Logic) ---
def check_and_trigger_events(events, markov_chains):
    """ 檢查並觸發事件 """
    triggered_events = []  # 儲存被觸發的事件，方便後續使用
    for event_id, event in events.items():
        if should_event_trigger(event):
            print(f"\n*** 事件觸發： {event['title']} ***")
            apply_event_effects(event, markov_chains)
            triggered_events.append(event_id)
    return triggered_events

def should_event_trigger(event):
    """ 檢查事件是否滿足觸發條件 """
    # 檢查 trigger_flag
    if not get_flag(event["trigger_flag"]):  # 如果觸發旗標不存在
        return False

    # 檢查 required_flags (如果存在)
    if event["required_flag"]:
        required_flags = event["required_flag"]
        if not all(get_flag(flag) for flag in required_flags): # 使用 all()， 檢查所有 required flag
            return False

    # 檢查 prohibit_flags (如果存在)
    if event["prohibit_flag"]:
        prohibit_flags = event["prohibit_flag"]
        if any(get_flag(flag) for flag in prohibit_flags): # 使用 any() 檢查是否有任何一個 prohibit_flag 是 True
            return False

    return True  # 滿足所有條件

def apply_event_effects(event, markov_chains):
    """ 執行事件效果，修改狀態 """
    # 修改指標 (生物多樣性、經濟、公共信任等)
    change_biodiversity(event["effect_biodiversity"])
    change_economy(event["effect_economy"])
    change_public_trust(event["effect_public_trust"])
    change_climate(event["effect_climate"])

    # 設置旗標 (如果事件有 set_flag)
    for flag in event["set_flag"]: # 如果是串列，逐一設定
       set_flag(flag, True)

    # 清除旗標 (如果事件有 clear_flag)
    for flag in event["clear_flag"]: # 如果是串列，逐一清除
        clear_flag(flag)

    # 馬可夫鏈
    if "markov_chain" in event and event["markov_chain"]:
        chain_name = event["markov_chain"]
        current_state = get_markov_chain_state(chain_name, markov_chains)
        print(f"  -  馬可夫鏈 -  {chain_name} 狀態: {current_state}")
        # 根據馬可夫鏈的結果，影響遊戲狀態 (示例)
        if chain_name == "pm25_degradation":
            if current_state == "High":
                set_pm25_value(get_pm25_value() + 10) # PM2.5 更嚴重
            elif current_state == "Medium":
                set_pm25_value(get_pm25_value() + 5) # PM2.5 惡化
            elif current_state == "Low":
               set_pm25_value(get_pm25_value() - 3) # PM2.5 改善

        if chain_name == "forest_fire_impact":
            if current_state == "High":
                change_climate(-10)
                change_biodiversity(-15) # 生物多樣性大幅下降
                change_economy(-5)  # 經濟損失

# --- 6. 策略執行邏輯  ---
def choose_strategy(strategy_id, strategies, events):
    """玩家選擇策略卡"""
    strategy = strategies.get(strategy_id)
    if strategy:
        print(f"\n*** 執行策略: {strategy['title']} ***")
        # 執行策略效果 (修改指標)
        change_biodiversity(strategy["effect_biodiversity"])
        change_economy(strategy["effect_economy"])
        change_public_trust(strategy["effect_public_trust"])
        change_climate(strategy["effect_climate"])

        # 設定旗標 (如果策略卡設定了 set_flag)
        for flag in strategy["set_flag"]:
            set_flag(flag, True)

        # 清除旗標 (如果策略卡設定了 clear_flag)
        for flag in strategy["clear_flag"]:
            clear_flag(flag)

# --- 7. 主遊戲迴圈 (Simplified Game Loop) ---
def game_loop(events, strategies, markov_chains):
    """簡化遊戲迴圈"""
    global game_state
    print(f"\n--- 第 {game_state['current_turn']} 回合 ---")

    # 檢查是否 PM2.5 超標, 設置 pollutionEvent
    if get_pm25_value() > game_state["pm25_threshold"]:
        set_flag("pollutionEvent", True)

    # 觸發事件
    triggered_events = check_and_trigger_events(events, markov_chains)
    # 觸發事件可能讓 pollutionEvent = False
    # 玩家選擇策略 (示例， 可以改為從 UI 獲取輸入)
    # 選擇策略 71 (節能家電補助)
    choose_strategy(71, strategies)

    # 選擇策略 89 (焚化爐改善)
    #choose_strategy(89, strategies)

    #  檢查是否 PM2.5 超標，設置pollutionEvent
    if get_pm25_value() > game_state["pm25_threshold"]:
        set_flag("pollutionEvent", True)

    # 再次觸發事件
    check_and_trigger_events(events, markov_chains)

    # 馬可夫鏈 (在每回合結束時運行)
    pm25_state = get_markov_chain_state("pm25_degradation", markov_chains)
    print(f"  - 遊戲結束前 PM2.5 狀態: {pm25_state}")
    # 模擬氣候事件的馬可夫鏈 (例如：影響森林大火)
    forest_fire_state = get_markov_chain_state("forest_fire_impact", markov_chains)
    print(f"  -  森林大火影響: {forest_fire_state}")
    #  根據馬可夫鏈的結果，影響遊戲狀態 (示例)

    # 顯示遊戲狀態
    print("\n--- 遊戲狀態 ---")
    print(f"生物多樣性: {game_state['biodiversity']}")
    print(f"經濟: {game_state['economy']}")
    print(f"公共信任: {game_state['public_trust']}")
    print(f"氣候: {game_state['climate']}")
    print(f"PM2.5 等級: {game_state['pm25_level']}")
    print(f"旗標: {game_state['flags']}")
    game_state["current_turn"] += 1
# --- 8. 初始化和執行 ---
if __name__ == "__main__":
    # 載入事件資料
    events = load_data("events.json")
    # 載入策略卡資料
    strategies = load_data("strategies.json")
    # 載入馬可夫鏈資料
    markov_chains = load_markov_chains("markov_chains.json")
    # 執行遊戲迴圈 (一個簡化的回合)
    game_loop(events, strategies, markov_chains)
    game_loop(events, strategies, markov_chains)
    game_loop(events, strategies, markov_chains)
```
