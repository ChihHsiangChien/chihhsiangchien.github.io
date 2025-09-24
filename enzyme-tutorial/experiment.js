// filepath: c:\Users\User\Documents\GitHub\chihhsiangchien.github.io\enzyme-tutorial\experiment.js
import { state } from "./state.js";
import { reactions } from "./enzyme-reactions.js";
import { clearAll, addItemFromToolbox, randomPosX, randomPosY, handleTempSliderInput, updateAllBrownian } from "./main.js";



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
    // 自動加入新酵素
    for (let i = 0; i < 10; i++) {
      addItemFromToolbox("enzyme", enzymeType, randomPosX(), randomPosY());
    }
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

