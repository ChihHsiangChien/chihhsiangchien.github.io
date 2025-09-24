// filepath: c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\enzyme-tutorial\experiment.js
import { state } from "./state.js";
import { reactions } from "./enzyme-reactions.js";
import { clearAll, addItemFromToolbox, handleTempSliderInput, updateAllBrownian } from "./main.js";
import { randomPosX, randomPosY } from "./utils.js";
import { generateUniquePositions } from "./utils.js";


export async function runExperiment() {
  const enzymeType = document.getElementById("exp-enzyme-select").value;
  const temp = parseInt(document.getElementById("exp-temp-input").value, 10);
  const time = parseInt(document.getElementById("exp-time-input").value, 10);
  const expStartBtn = document.getElementById("exp-start-btn");
  const brownianToggleBtn = document.getElementById("brownian-toggle-btn");
  state.expTempSelectedEnzyme = enzymeType;

  const enzymeSource = document.querySelector('input[name="exp-enzyme-source"]:checked').value;
  if (enzymeSource === "new") {
    clearAll();
    // 不重複放酵素
    const enzymePositions = generateUniquePositions(10, 100);
    enzymePositions.forEach(pos => {
      addItemFromToolbox("enzyme", enzymeType, pos.x, pos.y, pos.angle);
    });

    // 自動加入對應受質
    const rule = reactions.find(r => r.type === enzymeType);
    if (rule && rule.substrates) {
      rule.substrates.forEach(type => {
        for (let i = 0; i < 20; i++) {
          addItemFromToolbox("molecule", type, randomPosX(), randomPosY());
        }
      });
    }
  }
  // 如果是 "old"，則不清空畫布、不自動加入酵素與受質

  // 設定溫度
  document.getElementById("temp-slider").value = temp;
  handleTempSliderInput();

  // 啟動布朗運動
  state.brownianEnabled = true;
  if (brownianToggleBtn) {
    brownianToggleBtn.textContent = "啟用布朗運動";
    brownianToggleBtn.style.background = "#009688";
    brownianToggleBtn.style.color = "#fff";
  }
  updateAllBrownian();

  // 記錄初始產物數
  const rule = reactions.find(r => r.type === enzymeType);
  const productTypes = (rule && rule.products) ? rule.products : [];
  const productPerReaction = productTypes.length;
  const getProductCount = () =>
    productTypes.reduce((sum, type) => sum + (state.moleculeCount[type] || 0), 0);
  const startProductCount = getProductCount();

  // 等待觀察時間
  if (expStartBtn) {
    expStartBtn.disabled = true;
    expStartBtn.textContent = "實驗中...";
    expStartBtn.style.background = "#aaa";
    expStartBtn.style.cursor = "not-allowed";
  }
  await new Promise(res => setTimeout(res, time * 1000));
  if (expStartBtn) {
    expStartBtn.disabled = false;
    expStartBtn.textContent = "開始實驗";
    expStartBtn.style.background = "#8009ff";
    expStartBtn.style.cursor = "pointer";
  }

  // 記錄產物增加數
  const endProductCount = getProductCount();
  const productDelta = endProductCount - startProductCount;
  const value = productPerReaction > 0 ? productDelta / productPerReaction : 0;

  // 儲存到 state.expTempData
  if (!state.expTempData[enzymeType]) state.expTempData[enzymeType] = [];
  state.expTempData[enzymeType].push({ temp, value });

  // 更新圖表
  import("./chart.js").then(mod => {
    mod.updateExpTempChart();
  });
  // 切換到圖表 tab
  document.querySelectorAll("#chart-tabs button").forEach(btn => {
    if (btn.dataset.type === "exp-temp") btn.click();
  });
}

export async function runAutoExperiment(abortObj) {
  const enzymeType = document.getElementById("exp-enzyme-select").value;
  const tempInterval = parseInt(document.getElementById("auto-temp-interval").value, 10);
  const time = parseInt(document.getElementById("exp-time-input").value, 10);
  const repeat = parseInt(document.getElementById("auto-repeat").value, 10);
  const autoExpBtn = document.getElementById("auto-exp-btn");
  const autoExpStopBtn = document.getElementById("auto-exp-stop-btn");

  autoExpBtn.disabled = true;
  autoExpBtn.textContent = "自動實驗中...";
  autoExpBtn.style.background = "#aaa";
  autoExpBtn.style.cursor = "not-allowed";
  if (autoExpStopBtn) {
    autoExpStopBtn.disabled = false;
    autoExpStopBtn.style.opacity = "1";
  }

  // 清空該酵素的實驗資料
  state.expTempData[enzymeType] = [];

  for (let temp = 0; temp <= 100; temp += tempInterval) {
    for (let r = 0; r < repeat; r++) {
      if (abortObj && abortObj.aborted) {
        autoExpBtn.disabled = false;
        autoExpBtn.textContent = "開始自動實驗";
        autoExpBtn.style.background = "#8009ff";
        autoExpBtn.style.cursor = "pointer";
        if (autoExpStopBtn) {
          autoExpStopBtn.disabled = true;
          autoExpStopBtn.style.opacity = "0.5";
        }
        return;
      }
      // 設定溫度
      document.getElementById("exp-enzyme-select").value = enzymeType;
      document.getElementById("exp-temp-input").value = temp;
      document.getElementById("exp-time-input").value = time;
      document.getElementById("exp-use-new-enzyme").checked = true;
      await runExperiment();
      await new Promise(res => setTimeout(res, 200));
    }
  }

  autoExpBtn.disabled = false;
  autoExpBtn.textContent = "開始自動實驗";
  autoExpBtn.style.background = "#8009ff";
  autoExpBtn.style.cursor = "pointer";
  if (autoExpStopBtn) {
    autoExpStopBtn.disabled = true;
    autoExpStopBtn.style.opacity = "0.5";
  }
}