import { state } from "./state.js";
import { reactions } from "./enzyme-reactions.js";
import { addEnzymeFromToolbox, 
    addMoleculeFromToolbox, 
    randomPosX, 
    randomPosY, 
    handleTempSliderInput, 
    bindDraggable, 
    updateAllBrownian, 
    isNearActivation,
    updateActivationSites, 
    trySnapToAnyActivation,
    clearAll,
    updateCurrentChart
 } from "./main.js"; 
const canvas = document.getElementById("canvas");
const tempSlider = document.getElementById("temp-slider");
const tempValue = document.getElementById("temp-value");
const brownianSwitch = document.getElementById("brownian-switch");
const toolbox = document.getElementById("toolbox");

export function bindUIEvents() {
  // Chart tabs 切換
  document.querySelectorAll("#chart-tabs button").forEach(btn => {
    btn.onclick = function() {
      const type = btn.dataset.type;
      state.currentChartType = type;
      document.querySelectorAll("#chart-panels canvas").forEach(cvs => {
        cvs.style.display = cvs.id === type + "-chart" ? "" : "none";
      });
      updateCurrentChart();
    };
  });

  // Reset 按鈕
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.onclick = function() {
      clearAll();
      if (state.charts.concentration) {
        state.chartData.concentration.labels = [];
        state.chartData.concentration.datasets.forEach(ds => ds.data = []);
        state.chartTime = 0;
        state.charts.concentration.update();
      }
    };
  }

  // 溫度滑桿
  if (tempSlider && tempValue) {
    tempSlider.addEventListener("input", handleTempSliderInput);
  }

  // Brownian switch
  if (brownianSwitch) {
    brownianSwitch.addEventListener("change", updateAllBrownian);
  }

  // Toolbox 點擊/觸控
  if (toolbox && canvas) {
    toolbox.querySelectorAll(".toolbox-item").forEach((item) => {
      item.addEventListener("touchstart", (e) => {
        e.preventDefault();
        state.pendingToolboxItem = item;
        item.style.boxShadow = "0 0 0 3px #00bcd4";
      });
      item.addEventListener("click", (e) => {
        state.pendingToolboxItem = item;
        item.style.boxShadow = "0 0 0 3px #00bcd4";
      });
    });

    // 點 canvas 新增
    canvas.addEventListener("touchstart", (e) => {
      if (state.pendingToolboxItem) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        let x = touch.clientX - rect.left - 20;
        let y = touch.clientY - rect.top - 20;
        let angle = Math.floor(Math.random() * 360);
        const type = state.pendingToolboxItem.dataset.type;
        const enzymeType = state.pendingToolboxItem.dataset.enzymetype;
        const moleculeType = state.pendingToolboxItem.dataset.moleculetype;
        if (type === "enzyme" && enzymeType) {
          addEnzymeFromToolbox(enzymeType, x, y, angle);
        } else if (type === "molecule" && moleculeType) {
          addMoleculeFromToolbox(moleculeType, x, y);
        }
        state.pendingToolboxItem.style.boxShadow = "";
        state.pendingToolboxItem = null;
      }
    });
    canvas.addEventListener("click", (e) => {
      if (state.pendingToolboxItem) {
        const rect = canvas.getBoundingClientRect();
        let x = e.clientX - rect.left - 20;
        let y = e.clientY - rect.top - 20;
        let angle = Math.floor(Math.random() * 360);
        const type = state.pendingToolboxItem.dataset.type;
        const enzymeType = state.pendingToolboxItem.dataset.enzymetype;
        const moleculeType = state.pendingToolboxItem.dataset.moleculetype;
        if (type === "enzyme" && enzymeType) {
          addEnzymeFromToolbox(enzymeType, x, y, angle);
        } else if (type === "molecule" && moleculeType) {
          addMoleculeFromToolbox(moleculeType, x, y);
        }
        state.pendingToolboxItem.style.boxShadow = "";
        state.pendingToolboxItem = null;
      }
    });

    // Toolbox 拖曳
    toolbox.querySelectorAll(".toolbox-item").forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("type", item.dataset.type);
        if (item.dataset.enzymetype)
          e.dataTransfer.setData("enzymetype", item.dataset.enzymetype);
        if (item.dataset.moleculetype)
          e.dataTransfer.setData("moleculetype", item.dataset.moleculetype);
      });
    });

    // Canvas 拖曳放置
    canvas.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    canvas.addEventListener("drop", (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("type");
      const enzymeType = e.dataTransfer.getData("enzymetype");
      const moleculeType = e.dataTransfer.getData("moleculetype");
      const rect = canvas.getBoundingClientRect();
      let x = e.clientX - rect.left - 20;
      let y = e.clientY - rect.top - 20;
      let angle = Math.floor(Math.random() * 360);
      if (type === "enzyme" && enzymeType) {
        addEnzymeFromToolbox(enzymeType, x, y, angle);
      } else if (type === "molecule" && moleculeType) {
        addMoleculeFromToolbox(moleculeType, x, y);
      }
    });

    // +10/-10 按鈕
    toolbox.querySelectorAll(".toolbox-add10").forEach((x10btn) => {
      x10btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const type = x10btn.dataset.type;
        const enzymeType = x10btn.dataset.enzymetype;
        const moleculeType = x10btn.dataset.moleculetype;
        for (let i = 0; i < 10; i++) {
          let x = randomPosX();
          let y = randomPosY();
          let angle = Math.floor(Math.random() * 360);
          if (type === "enzyme" && enzymeType) {
            addEnzymeFromToolbox(enzymeType, x, y, angle);
          } else if (type === "molecule" && moleculeType) {
            addMoleculeFromToolbox(moleculeType, x, y);
          }
        }
      });
      x10btn.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const type = x10btn.dataset.type;
        const enzymeType = x10btn.dataset.enzymetype;
        const moleculeType = x10btn.dataset.moleculetype;
        for (let i = 0; i < 10; i++) {
          let x = randomPosX();
          let y = randomPosY();
          let angle = Math.floor(Math.random() * 360);
          if (type === "enzyme" && enzymeType) {
            addEnzymeFromToolbox(enzymeType, x, y, angle);
          } else if (type === "molecule" && moleculeType) {
            addMoleculeFromToolbox(moleculeType, x, y);
          }
        }
      });
    });

    toolbox.querySelectorAll(".toolbox-minus10").forEach((minus10btn) => {
      minus10btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const type = minus10btn.dataset.type;
        const enzymeType = minus10btn.dataset.enzymetype;
        const moleculeType = minus10btn.dataset.moleculetype;
        if (type === "enzyme" && enzymeType) {
          const targets = state.enzymes.filter(e => e.type === enzymeType);
          const removeCount = Math.min(10, targets.length);
          for (let i = 0; i < removeCount; i++) {
            const idx = state.enzymes.findIndex(e => e.type === enzymeType);
            if (idx !== -1) {
              const enzyme = state.enzymes[idx];
              if (enzyme.boundMolecules && enzyme.boundMolecules.length > 0) {
                enzyme.boundMolecules.forEach(m => {
                  if (m.el) {
                    m.el.style.pointerEvents = "auto";
                    m.el.style.filter = "";
                    m.startBrownian && m.startBrownian();
                  }
                });
                enzyme.boundMolecules = [];
              }
              state.enzymes[idx].remove();
              state.enzymes.splice(idx, 1);
              state.enzymeCount[enzymeType] = Math.max(0, (state.enzymeCount[enzymeType] || 1) - 1);
            }
          }
          bindDraggable();
        } else if (type === "molecule" && moleculeType) {
          const targets = state.molecules.filter(m => m.type === moleculeType);
          const removeCount = Math.min(10, targets.length);
          for (let i = 0; i < removeCount; i++) {
            const idx = state.molecules.findIndex(m => m.type === moleculeType);
            if (idx !== -1) {
              state.enzymes.forEach(enzyme => {
                if (enzyme.boundMolecules) {
                  enzyme.boundMolecules = enzyme.boundMolecules.filter(m => m !== state.molecules[idx]);
                }
              });
              state.molecules[idx].remove();
              state.molecules.splice(idx, 1);
              state.moleculeCount[moleculeType] = Math.max(0, (state.moleculeCount[moleculeType] || 1) - 1);
            }
          }
          bindDraggable();
        }
      });
      minus10btn.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const type = minus10btn.dataset.type;
        const enzymeType = minus10btn.dataset.enzymetype;
        const moleculeType = minus10btn.dataset.moleculetype;
        if (type === "enzyme" && enzymeType) {
          const targets = state.enzymes.filter(e => e.type === enzymeType);
          const removeCount = Math.min(10, targets.length);
          for (let i = 0; i < removeCount; i++) {
            const idx = state.enzymes.findIndex(e => e.type === enzymeType);
            if (idx !== -1) {
              const enzyme = state.enzymes[idx];
              if (enzyme.boundMolecules && enzyme.boundMolecules.length > 0) {
                enzyme.boundMolecules.forEach(m => {
                  if (m.el) {
                    m.el.style.pointerEvents = "auto";
                    m.el.style.filter = "";
                    m.startBrownian && m.startBrownian();
                  }
                });
                enzyme.boundMolecules = [];
              }
              state.enzymes[idx].remove();
              state.enzymes.splice(idx, 1);
              state.enzymeCount[enzymeType] = Math.max(0, (state.enzymeCount[enzymeType] || 1) - 1);
            }
          }
          bindDraggable();
        } else if (type === "molecule" && moleculeType) {
          const targets = state.molecules.filter(m => m.type === moleculeType);
          const removeCount = Math.min(10, targets.length);
          for (let i = 0; i < removeCount; i++) {
            const idx = state.molecules.findIndex(m => m.type === moleculeType);
            if (idx !== -1) {
              state.enzymes.forEach(enzyme => {
                if (enzyme.boundMolecules) {
                  enzyme.boundMolecules = enzyme.boundMolecules.filter(m => m !== state.molecules[idx]);
                }
              });
              state.molecules[idx].remove();
              state.molecules.splice(idx, 1);
              state.moleculeCount[moleculeType] = Math.max(0, (state.moleculeCount[moleculeType] || 1) - 1);
            }
          }
          bindDraggable();
        }
      });
    });
  }

  // Touch 拖曳支援（for mobile/tablet）
  if (toolbox) {
    toolbox.querySelectorAll(".toolbox-item").forEach((item) => {
      item.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        state.draggingType = item.dataset.type;
        state.draggingEnzymeType = item.dataset.enzymetype;
        state.draggingMoleculeType = item.dataset.moleculetype;
        state.draggingGhost = item.cloneNode(true);
        state.draggingGhost.style.position = "fixed";
        state.draggingGhost.style.left = touch.clientX - 20 + "px";
        state.draggingGhost.style.top = touch.clientY - 20 + "px";
        state.draggingGhost.style.opacity = "0.7";
        state.draggingGhost.style.pointerEvents = "none";
        state.draggingGhost.style.zIndex = 9999;
        document.body.appendChild(state.draggingGhost);
      });
      item.addEventListener("touchmove", (e) => {
        if (!state.draggingGhost) return;
        const touch = e.touches[0];
        state.draggingGhost.style.left = touch.clientX - 20 + "px";
        state.draggingGhost.style.top = touch.clientY - 20 + "px";
      });
      item.addEventListener("touchend", (e) => {
        if (state.draggingGhost) {
          const touch = e.changedTouches[0];
          const rect = canvas.getBoundingClientRect();
          if (
            touch.clientX >= rect.left &&
            touch.clientX <= rect.right &&
            touch.clientY >= rect.top &&
            touch.clientY <= rect.bottom
          ) {
            let x = touch.clientX - rect.left - 20;
            let y = touch.clientY - rect.top - 20;
            let angle = Math.floor(Math.random() * 360);
            if (state.draggingType === "enzyme" && state.draggingEnzymeType) {
              addEnzymeFromToolbox(state.draggingEnzymeType, x, y, angle);
            } else if (state.draggingType === "molecule" && state.draggingMoleculeType) {
              addMoleculeFromToolbox(state.draggingMoleculeType, x, y);
            }
          }
          state.draggingGhost.remove();
          state.draggingGhost = null;
          state.draggingType = null;
          state.draggingEnzymeType = null;
          state.draggingMoleculeType = null;
        }
      });
    });
  }

  // Canvas 拖曳與 pointer 事件
  if (canvas) {
    canvas.onpointermove = function (e) {
      if (!state.dragging) return;
      const canvasRect = canvas.getBoundingClientRect();
      let x = e.clientX - canvasRect.left - state.offsetX;
      let y = e.clientY - canvasRect.top - state.offsetY;
      x = Math.max(0, Math.min(canvasRect.width - 40, x));
      y = Math.max(0, Math.min(canvasRect.height - 40, y));
      state.dragging.updatePosition(x, y);
      if (state.dragging.angle !== undefined) {
        state.dragging.setAngle(state.dragging.angle);
      }
      if (state.dragType === "enzyme") updateActivationSites();

      if (state.dragType === "molecule") {
        let near = false;
        let enzymeAngle = 0;
        for (let enzymeIdx = 0; enzymeIdx < state.enzymes.length; enzymeIdx++) {
          const enzyme = state.enzymes[enzymeIdx];
          if (!enzyme) continue;
          const rule = reactions.find(
            (r) => r.type === enzyme.type && r.substrates.includes(state.dragging.type)
          );
          if (rule && isNearActivation(state.dragIndex, enzymeIdx)) {
            near = true;
            enzymeAngle = enzyme.angle || 0;
            break;
          }
        }
        if (near) {
          state.dragging.el.style.transition = "filter 0.2s, transform 0.4s";
          state.dragging.el.style.filter = "drop-shadow(0 0 12px #ff9800)";
          state.dragging.el.style.transform = `scale(1.15) rotate(${enzymeAngle})deg`;
        } else {
          state.dragging.el.style.transition = "filter 0.2s, transform 0.4s";
          state.dragging.el.style.filter = "";
          state.dragging.el.style.transform = `rotate(${state.dragging.angle || 0}deg)`;
        }
      }
    };

    canvas.onpointerup = function (e) {
      if (state.dragging) state.dragging.el.style.filter = "";

      if (state.dragType === "molecule") {
        trySnapToAnyActivation(state.dragIndex,"molecule");
      } else if (state.dragType === "enzyme") {
        trySnapToAnyActivation(state.dragIndex, "enzyme");
      }

      // 判斷是否在 toolbox 區
      const toolbox = document.getElementById("toolbox");
      if (toolbox) {
        const rect = toolbox.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          if (state.dragType === "enzyme") {
            state.enzymes[state.dragIndex].remove();
            state.enzymes.splice(state.dragIndex, 1);
            bindDraggable();
          } else if (state.dragType === "molecule") {
            state.enzymes.forEach(enzyme => {
              if (enzyme.boundMolecules) {
                enzyme.boundMolecules = enzyme.boundMolecules.filter(m => m !== state.molecules[state.dragIndex]);
              }
            });
            state.molecules[state.dragIndex].remove();
            state.molecules.splice(state.dragIndex, 1);
            bindDraggable();
          }
          state.dragging = null;
          state.dragType = null;
          state.dragIndex = -1;
          return;
        }
      }

      state.dragging = null;
      state.dragType = null;
      state.dragIndex = -1;
    };
    canvas.onpointerleave = canvas.onpointerup;
  }
}