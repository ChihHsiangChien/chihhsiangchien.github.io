// --- Sound effects ---
const soundPlace = new Audio("sounds/place.mp3");
const soundFlip = new Audio("sounds/flip.mp3");
function playPlaceSound() {
  try {
    soundPlace.currentTime = 0;
    soundPlace.play();
  } catch (e) {}
}
function playFlipSound() {
  try {
    soundFlip.currentTime = 0;
    soundFlip.play();
  } catch (e) {}
}

// 載入 spec.json 並建立練習
const SPEC_PATH = "spec.json";

let spec = null;
let specsList = null; // when multiple specs provided, store {name,spec} items
let state = {
  // map cardId -> {text, originRow, originCol}
  cards: {},
  // placement map: cellKey -> cardId
  placements: {},
  logs: [],
};
// app mode from URL params, e.g. mode=teach
let APP_MODE = "";

const el = (id) => document.getElementById(id);

// Flip animation timing constants (ms)
const FLIP_HALF_MS = 160; // time to rotate to 90deg
const FLIP_TOTAL_MS = 520; // total cleanup time after full flip
const FLIP_TRANSITION = "transform 260ms ease";

async function loadSpec() {
  // 1. 取得所有可用 spec 清單
  let allSpecs = [];
  try {
    const manifestRes = await fetch("data/index.json");
    if (manifestRes.ok) {
      const list = await manifestRes.json();
      for (const fname of list) {
        try {
          const res = await fetch(`data/${fname}`);
          if (res.ok) {
            const j = await res.json();
            allSpecs.push({
              name: j.title || fname.replace(/\.json$/, ""),
              spec: j,
              filename: fname.replace(/\.json$/, ""),
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {}

  // 2. 依 URL 參數決定目前 spec
  const params = new URLSearchParams(location.search);
  const specParam = params.get("spec");
  let activeIdx = 0;
  if (specParam && allSpecs.length) {
    const idx = allSpecs.findIndex(
      (s) =>
        s.filename === specParam ||
        s.filename + ".json" === specParam ||
        s.name === specParam
    );
    if (idx >= 0) activeIdx = idx;
  }
  specsList = allSpecs;
  if (specsList.length) {
    spec = specsList[activeIdx].spec;
    renderSpecSelector(activeIdx);
    renderLeftSpecList(activeIdx);
    return;
  }

  // fallback embedded spec
  console.warn("未找到外部 spec 檔案，使用內建 fallback spec。");
  spec = {
    title: "單細胞生物與多細胞生物比較",
    head: ["單細胞生物", "多細胞生物"],
    rows: [
      { label: "細胞數目", content: ["一個", "多個"] },
      { label: "單一細胞獨立性", content: ["能獨立生活", "不能獨立生存"] },
      {
        label: "單一細胞功能",
        content: ["完成所有生命功能", "僅能完成部分功能"],
      },
      { label: "細胞分工", content: ["沒有明顯分工", "有專業分工"] },
      { label: "實例", content: ["草履蟲、變形蟲", "人類、玉米、蚯蚓"] },
    ],
  };
}

// Try to populate specsList by probing known JSON filenames in this folder
async function populateSpecListFromFiles() {
  // try to fetch a manifest at /table/data/index.json listing all json filenames
  specsList = [];
  try {
    const manifestRes = await fetch("data/index.json");
    if (manifestRes.ok) {
      const list = await manifestRes.json();
      for (const fname of list) {
        try {
          const res = await fetch(`data/${fname}`);
          if (res.ok) {
            const j = await res.json();
            specsList.push({
              name: j.title || fname,
              spec: j,
              filename: `data/${fname}`,
            });
          }
        } catch (e) {
          console.warn("讀取", fname, "失敗", e);
        }
      }
    }
  } catch (e) {
    console.warn("無法讀取 data/index.json", e);
  }
  // render selector if we have multiple
  renderSpecSelector();
}

function uid() {
  return "c" + Math.random().toString(36).slice(2, 9);
}

// ...existing code...

function build() {
  el("exercise-title").textContent = spec.title || "練習";
  const table = el("table");
  table.innerHTML = "";

  const heads = spec.head || [];
  const rows = spec.rows || [];

  const grid = createTableGrid(heads, rows);
  table.appendChild(grid);

  // ensure document-level dragover allows drops in some browsers
  document.addEventListener("dragover", function (e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  });

  generateCards();
  attachControls();
}

function createTableGrid(heads, rows) {
  const grid = document.createElement("div");
  grid.className = "table-grid";
  grid.style.gridTemplateColumns = `160px repeat(${heads.length}, 1fr) 220px`;
  grid.classList.add("has-row-pools");

  addTableHeader(grid, heads);
  rows.forEach((r, i) => addTableRow(grid, r, i, heads.length));
  return grid;
}

function addTableHeader(grid, heads) {
  // top-left empty
  const corner = document.createElement("div");
  corner.className = "row-header";
  corner.style.gridColumn = "1 / 2";
  grid.appendChild(corner);

  // column heads
  heads.forEach((h) => {
    const ch = document.createElement("div");
    ch.className = "col-head";
    ch.textContent = h;
    grid.appendChild(ch);
  });

  // trailing header for per-row pools
  const poolHead = document.createElement("div");
  poolHead.className = "col-head pool-head";
  poolHead.textContent = "候選";
  grid.appendChild(poolHead);
}

function addTableRow(grid, row, rowIndex, colCount) {
  // label cell
  const lab = document.createElement("div");
  lab.className = "row-label";
  lab.textContent = row.label;
  grid.appendChild(lab);

  // content cells
  for (let j = 0; j < colCount; j++) {
    const cell = createTableCell(rowIndex, j);
    grid.appendChild(cell);
  }

  // trailing per-row pool cell
  const poolWrap = document.createElement("div");
  poolWrap.className = "row-pool-wrap";
  const poolLabel = document.createElement("div");
  poolLabel.className = "row-pool-label";
  poolLabel.textContent = "";
  const pool = document.createElement("div");
  pool.className = "row-pool";
  pool.dataset.row = rowIndex;
  // allow drag/drop into the per-row pool
  pool.addEventListener("dragenter", onDragEnter);
  pool.addEventListener("dragover", onDragOver);
  pool.addEventListener("dragleave", onDragLeave);
  pool.addEventListener("drop", onDrop);
  poolWrap.appendChild(pool);
  grid.appendChild(poolWrap);
}

function createTableCell(row, col) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.dataset.row = row;
  cell.dataset.col = col;
  cell.dataset.key = `${row}:${col}`;

  const inner = document.createElement("div");
  inner.className = "cell-inner";

  // attach listeners to both container and inner so drops targetting inner are handled
  [cell, inner].forEach((target) => {
    target.addEventListener("dragenter", onDragEnter);
    target.addEventListener("dragover", onDragOver);
    target.addEventListener("dragleave", onDragLeave);
    target.addEventListener("drop", onDrop);
  });

  // touch target on cell
  cell.addEventListener("pointerdown", onCellPointerDown);

  cell.appendChild(inner);
  return cell;
}

// ...existing code...
function generateCards() {
  state.cards = {};
  state.placements = {};

  const fallbackContainer =
    document.querySelector("#table .table-grid") ||
    el("table") ||
    document.body;

  clearAllRowPools();

  const rows = spec.rows || [];
  const cards = flattenSpecToCards(rows);

  shuffle(cards);

  cards.forEach((c) => {
    const id = uid();
    state.cards[id] = { text: c.text, row: c.row, col: c.col, id };
    const cardEl = createCardElement(c, id, rows);
    appendCardToPoolOrFallback(cardEl, c.row, fallbackContainer);
  });
}

function clearAllRowPools() {
  document.querySelectorAll(".row-pool").forEach((rp) => (rp.innerHTML = ""));
}

function flattenSpecToCards(rows) {
  const cards = [];
  rows.forEach((r, i) => {
    (r.content || []).forEach((cellItem, j) => {
      if (Array.isArray(cellItem)) {
        cellItem.forEach((p) => {
          if (typeof p === "string") {
            const txt = p.trim();
            if (txt) cards.push({ text: txt, row: i, col: j });
          } else if (p != null) {
            cards.push({ text: String(p), row: i, col: j });
          }
        });
      } else if (typeof cellItem === "string") {
        const txt = cellItem.trim();
        if (txt) cards.push({ text: txt, row: i, col: j });
      } else if (cellItem != null) {
        cards.push({ text: String(cellItem), row: i, col: j });
      }
    });
  });
  return cards;
}

function createCardElement(card, id, rows) {
  const cardEl = document.createElement("div");
  cardEl.className = "card in-pool small";
  cardEl.draggable = true;
  cardEl.textContent = card.text;
  cardEl.dataset.cardId = id;
  try {
    cardEl.dataset.canonicalText = String(card.text);
  } catch (_) {}

  // color coding: generate pastel color based on row label
  try {
    const rowLabel =
      rows[card.row] && rows[card.row].label ? rows[card.row].label : String(card.row);
    const bg = colorFromString(rowLabel, 75, 85);
    const border = colorFromString(rowLabel, 60, 70);
    cardEl.style.background = bg;
    cardEl.style.borderColor = border;
  } catch (e) {}

  cardEl.addEventListener("dragstart", onDragStart);
  cardEl.addEventListener("dragend", onDragEnd);
  cardEl.addEventListener("pointerdown", onCardPointerDown);
  cardEl.addEventListener("touchstart", onCardTouchStart, { passive: false });

  return cardEl;
}

function appendCardToPoolOrFallback(cardEl, rowIdx, fallbackContainer) {
  const rp = document.querySelector(`.row-pool[data-row='${rowIdx}']`);
  if (rp) rp.appendChild(cardEl);
  else fallbackContainer.appendChild(cardEl);
}
// Given a string, produce a pastel HSL color. s and l are percentages (0-100)
function colorFromString(str, s = 60, l = 85) {
  const h = Math.abs(hashString(str)) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}

function hashString(str) {
  // simple djb2-like
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash = hash & hash; // force 32bit
  }
  return hash;
}

function attachControls() {
  const btnSubmit = el("btn-submit");
  if (btnSubmit) btnSubmit.onclick = onSubmit;
  const btnReset = el("btn-reset");
  if (btnReset) btnReset.onclick = onReset;
  const btnAnswer = el("btn-answer");
  if (btnAnswer) btnAnswer.onclick = viewAnswerOrTeach;
  const teachBtn = document.getElementById("btn-teach");
  if (teachBtn) {
    const updateTeachLabel = () => {
      teachBtn.textContent = APP_MODE === "teach" ? "退出教學" : "教學模式";
    };
    // toggle teach mode when clicking the button (assign onclick to avoid duplicate listeners)
    teachBtn.onclick = () => {
      if (APP_MODE === "teach") {
        APP_MODE = "";
        // rebuild UI to reset placements and pools
        build();
        // remove mode param from URL without reloading
        try {
          const params = new URLSearchParams(location.search);
          params.delete("mode");
          history.replaceState(
            null,
            "",
            location.pathname +
              (params.toString() ? "?" + params.toString() : "")
          );
        } catch (e) {}
      } else {
        APP_MODE = "teach";
        // ensure UI is rebuilt then enter teach mode
        build();
        setTimeout(() => enterTeachMode(), 40);
        // add mode=teach to URL without reloading
        try {
          const params = new URLSearchParams(location.search);
          params.set("mode", "teach");
          history.replaceState(
            null,
            "",
            location.pathname + "?" + params.toString()
          );
        } catch (e) {}
      }
      updateTeachLabel();
    };
    updateTeachLabel();
  }
}

function viewAnswerOrTeach() {
  if (APP_MODE === "teach") enterTeachMode();
  else onViewAnswer();
}


// Place answers then hide the text on placed cards; clicking each card reveals its text.

function enterTeachMode() {
  // place answers into cells
  onViewAnswer();

  // For each card now in a cell, hide its text and set up reveal-on-click
  document.querySelectorAll(".cell .card").forEach(setupTeachCard);
}

function setupTeachCard(cardEl) {
  try {
    storeCardMeta(cardEl);
    preserveCardSize(cardEl);
    preserveCellMinHeight(cardEl);
    showCardBack(cardEl);
    cardEl.dataset.teach = "1";
    cardEl.draggable = APP_MODE === "teach";
    setupTeachCardFlipHandler(cardEl);
  } catch (e) {
    /* ignore */
  }
}

function storeCardMeta(cardEl) {
  const cardId = cardEl.dataset.cardId;
  const metaText =
    state.cards && state.cards[cardId] && state.cards[cardId].text
      ? state.cards[cardId].text
      : cardEl.textContent;
  cardEl.dataset.revealText = metaText;
  cardEl.dataset.origBg = cardEl.style.background || "";
  cardEl.dataset.origBorder = cardEl.style.borderColor || "";
}

function preserveCardSize(cardEl) {
  const w = cardEl.offsetWidth;
  if (w && w > 10) cardEl.style.minWidth = w + "px";
  const h = cardEl.offsetHeight;
  if (h && h > 8) cardEl.style.minHeight = h + "px";
}

function preserveCellMinHeight(cardEl) {
  try {
    const cell = cardEl.closest(".cell");
    if (cell) {
      const cellH = cell.offsetHeight;
      if (cellH && cellH > 8) {
        if (!cell.dataset.origMinHeight)
          cell.dataset.origMinHeight = cell.style.minHeight || "";
        cell.style.minHeight = cellH + "px";
        const cur = parseInt(cell.dataset.teachHiddenCount || "0", 10) || 0;
        cell.dataset.teachHiddenCount = String(cur + 1);
      }
    }
  } catch (_) {}
}

function showCardBack(cardEl) {
  cardEl.textContent = "";
  cardEl.style.background = "#eeeeee";
  cardEl.style.borderColor = "#cccccc";
}
function setupTeachCardFlipHandler(cardEl) {
  let lastFlipTime = 0;
  const FLIP_DEBOUNCE_MS = 300;

  // 滑鼠點擊直接翻牌
  cardEl.onclick = function(e) {
    console.log('[flip] onclick', cardEl.dataset.cardId);
    const now = Date.now();
    if (now - lastFlipTime < FLIP_DEBOUNCE_MS) return;
    lastFlipTime = now;
    flipTeachCard(cardEl);
  };

  // 觸控：短按翻牌，長按拖曳
  cardEl.ontouchstart = function(e) {
    let moved = false;
    let dragging = false;
    let timer = setTimeout(() => {
      timer = null;
      // 長按進入拖曳
      dragging = true;
      pointerState.dragging = true;
      pointerState.cardEl = cardEl;
      // 這裡可呼叫 onCardPointerDown 或你自己的拖曳啟動流程
      // 但要確保只在長按時才設 dragging
      console.log('[flip] long press, will drag', cardEl.dataset.cardId);
      // 你可以在這裡啟動拖曳流程
    }, 220);

    function cancel(ev) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        if (!moved && !dragging) {
          // 短按，觸發翻牌
          const now = Date.now();
          if (now - lastFlipTime < FLIP_DEBOUNCE_MS) return;
          lastFlipTime = now;
          console.log('[flip] tap, will flip', cardEl.dataset.cardId);
          flipTeachCard(cardEl);
        }
      }
      cleanup();
    }
    function onMove(ev) {
      moved = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      cleanup();
    }
    function cleanup() {
      cardEl.removeEventListener('touchend', cancel);
      cardEl.removeEventListener('touchmove', onMove);
      cardEl.removeEventListener('touchcancel', cancel);
    }
    cardEl.addEventListener('touchend', cancel, { passive: false });
    cardEl.addEventListener('touchmove', onMove, { passive: false });
    cardEl.addEventListener('touchcancel', cancel, { passive: false });
  };
}

function flipTeachCard(cardEl) {
  try {
    if (APP_MODE === "teach") playFlipSound();
    const doReveal = !!cardEl.dataset.revealText;
    cardEl.classList.add("flipping", "flip-mid");
    setTimeout(() => {
      if (doReveal) {
        revealTeachCard(cardEl);
      } else {
        hideTeachCard(cardEl);
      }
      requestAnimationFrame(() => {
        cardEl.classList.remove("flip-mid");
      });
    }, FLIP_HALF_MS);

    setTimeout(() => {
      cleanupTeachCardFlip(cardEl);
    }, FLIP_TOTAL_MS);
  } catch (e) {}
}

function revealTeachCard(cardEl) {
  cardEl.textContent = cardEl.dataset.revealText;
  delete cardEl.dataset.revealText;
  cardEl.style.background = cardEl.dataset.origBg || "";
  cardEl.style.borderColor = cardEl.dataset.origBorder || "";
  cardEl._needsSizeClear = true;
  cardEl.draggable = APP_MODE === "teach";
  try {
    const cell = cardEl.closest(".cell");
    if (cell) {
      const cur = parseInt(cell.dataset.teachHiddenCount || "0", 10) || 0;
      const next = Math.max(0, cur - 1);
      cell.dataset.teachHiddenCount = String(next);
      if (next === 0) cardEl._clearCellMinAfter = true;
    }
  } catch (_) {}
}

function hideTeachCard(cardEl) {
  cardEl.dataset.revealText = cardEl.textContent || cardEl.dataset.revealText || "";
  cardEl.dataset.origBg = cardEl.style.background || cardEl.dataset.origBg || "";
  cardEl.dataset.origBorder = cardEl.style.borderColor || cardEl.dataset.origBorder || "";
  preserveCardSize(cardEl);
  cardEl.textContent = "";
  cardEl.style.background = "#eeeeee";
  cardEl.style.borderColor = "#cccccc";
  cardEl.dataset.teach = "1";
  cardEl.draggable = APP_MODE === "teach";
  try {
    const cell = cardEl.closest(".cell");
    if (cell) {
      const cur = parseInt(cell.dataset.teachHiddenCount || "0", 10) || 0;
      cell.dataset.teachHiddenCount = String(cur + 1);
      if (!cell.style.minHeight || cell.style.minHeight === "") {
        const ch = cell.offsetHeight;
        if (ch && ch > 8) cell.style.minHeight = ch + "px";
      }
    }
  } catch (_) {}
}

function cleanupTeachCardFlip(cardEl) {
  try {
    if (cardEl._needsSizeClear) {
      cardEl.style.minWidth = "";
      cardEl.style.minHeight = "";
      delete cardEl._needsSizeClear;
    }
    if (cardEl._clearCellMinAfter) {
      const cell = cardEl.closest(".cell");
      if (cell) {
        const cnt = parseInt(cell.dataset.teachHiddenCount || "0", 10) || 0;
        if (cnt === 0) {
          cell.style.minHeight = cell.dataset.origMinHeight || "";
          delete cell.dataset.origMinHeight;
        }
      }
      delete cardEl._clearCellMinAfter;
    }
    cardEl.classList.remove("flipping", "flip-mid");
  } catch (_) {}
}



/* utilities */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const r = Math.floor(Math.random() * (i + 1));
    [a[i], a[r]] = [a[r], a[i]];
  }
}

/* Drag handlers */
let dragCardId = null;

function onDragStart(e) {
  const id = e.target.dataset.cardId;
  dragCardId = id;
  try {
    e.dataTransfer.setData("text/plain", id);
  } catch (_) {}
  e.dataTransfer.effectAllowed = "move";
  // set a drag image if supported to make drag visible
  try {
    const crt = e.target.cloneNode(true);
    crt.style.position = "absolute";
    crt.style.top = "-1000px";
    crt.style.left = "-1000px";
    document.body.appendChild(crt);
    e.dataTransfer.setDragImage(crt, 20, 10);
    setTimeout(() => crt.remove(), 50);
  } catch (_) {}
  e.target.classList.add("dragging");
  console.debug("dragstart", id, e.target.textContent);
  updateDebug();
}
function onDragEnd(e) {
  if (e.target) e.target.classList.remove("dragging");
  dragCardId = null;
  console.debug("dragend");
  updateDebug();
}

function onDragEnter(e) {
  e.preventDefault();
  e.currentTarget.classList.add("highlight");
  console.debug(
    "dragenter",
    e.currentTarget.dataset && e.currentTarget.dataset.key
  );
}
function onDragOver(e) {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  // debug
  const key =
    e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key;
  // console.debug('dragover', key);
}
function onDragLeave(e) {
  e.currentTarget.classList.remove("highlight");
  // console.debug('dragleave', e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key);
}

function onDrop(e) {
  e.preventDefault();
  // find the containing .cell (if drop happens on .cell-inner or children)
  // determine if dropped on a cell or a row-pool
  const pool =
    e.target && e.target.closest ? e.target.closest(".row-pool") : null;
  const cell = e.target && e.target.closest ? e.target.closest(".cell") : null;
  if (cell) cell.classList.remove("highlight");
  const id =
    (e.dataTransfer && e.dataTransfer.getData
      ? e.dataTransfer.getData("text/plain")
      : null) || dragCardId;
  console.debug("drop event", {
    cell: cell && cell.dataset && cell.dataset.key,
    pool: pool && pool.dataset && pool.dataset.row,
    cardId: id,
  });
  if (!id) return;
  if (pool) placeCardToPool(id, pool);
  else placeCardToCell(id, cell || e.currentTarget);
}

/* Pointer / touch fallback for cards and cells */
let pointerState = {
  dragging: false,
  cardEl: null,
  startX: 0,
  startY: 0,
  ghost: null,
  moved: false
};

function onCardPointerDown(e) {
  // begin drag-like interaction
  const elCard = e.currentTarget;
  // if this card is part of teach-mode hidden answers, do not pick it up
  // allow teachers to pick up teach-mode cards when APP_MODE === 'teach'
  if (elCard.dataset && elCard.dataset.teach && APP_MODE !== "teach") return;
  // Only handle pointer-based drag for touch/pen — avoid preventing native mouse dragstart
  if (e.pointerType && e.pointerType !== "touch" && e.pointerType !== "pen")
    return;
  e.preventDefault();
  // setPointerCapture may not exist in touch-only environments; guard it
  if (
    typeof elCard.setPointerCapture === "function" &&
    typeof e.pointerId !== "undefined"
  ) {
    try {
      elCard.setPointerCapture(e.pointerId);
    } catch (_) {}
  }
  pointerState.dragging = true;
  pointerState.cardEl = elCard;
  pointerState.startX = e.clientX;
  pointerState.startY = e.clientY;
  pointerState.moved = false;

  // create ghost
  const g = elCard.cloneNode(true);
  g.classList.add("dragging");
  g.style.position = "fixed";
  g.style.left = e.clientX - 40 + "px";
  g.style.top = e.clientY - 20 + "px";
  g.style.zIndex = 9999;
  g.style.pointerEvents = "none";
  document.body.appendChild(g);
  pointerState.ghost = g;

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp, { once: true });
  console.debug("pointerdown start", elCard.dataset.cardId, elCard.textContent);
}

// Touch fallback wrapper: translate touch events to the existing pointer drag flow.
function onCardTouchStart(e) {
  // touchstart may be used on devices without pointer events (older Safari)
  e.preventDefault();
  const touch =
    e.changedTouches && e.changedTouches[0]
      ? e.changedTouches[0]
      : e.touches && e.touches[0];
  if (!touch) return;
  const el = e.currentTarget;
  // if this card is part of teach-mode hidden answers, do not pick it up
  // allow teachers to pick up teach-mode cards when APP_MODE === 'teach'
  if (el.dataset && el.dataset.teach && APP_MODE !== "teach") return;

  // Create a minimal synthetic event that onCardPointerDown can use
  const synthetic = {
    currentTarget: el,
    clientX: touch.clientX,
    clientY: touch.clientY,
    pointerType: "touch",
    pointerId: Date.now() % 1000000,
    preventDefault: () => e.preventDefault(),
  };

  // Start pointer-like drag
  onCardPointerDown(synthetic);

  // touchmove/touchend wrappers to forward to pointer handlers
  function touchMoveHandler(ev) {
    ev.preventDefault();
    const t = ev.touches && ev.touches[0];
    if (!t) return;
    // call pointer move with a simple object containing clientX/Y
    onPointerMove({ clientX: t.clientX, clientY: t.clientY });
  }
  function touchEndHandler(ev) {
    ev.preventDefault();
    const t = ev.changedTouches && ev.changedTouches[0];
    const clientX = t ? t.clientX : synthetic.clientX;
    const clientY = t ? t.clientY : synthetic.clientY;
    // forward to pointer up
    onPointerUp({ clientX, clientY });
    window.removeEventListener("touchmove", touchMoveHandler);
  }

  window.addEventListener("touchmove", touchMoveHandler, { passive: false });
  window.addEventListener("touchend", touchEndHandler, {
    passive: false,
    once: true,
  });
}

function onPointerMove(e) {
  if (!pointerState.dragging) return;
  pointerState.moved = true; 
  const g = pointerState.ghost;
  g.style.left = e.clientX - 40 + "px";
  g.style.top = e.clientY - 20 + "px";

  // highlight cell under pointer
  const elUnder = document.elementFromPoint(e.clientX, e.clientY);
  document
    .querySelectorAll(".cell.highlight")
    .forEach((n) => n.classList.remove("highlight"));
  const cell = elUnder && elUnder.closest && elUnder.closest(".cell");
  if (cell) cell.classList.add("highlight");
  // debug
  // console.debug('pointermove', e.clientX, e.clientY, cell && cell.dataset.key);
}
function onPointerUp(e) {
  window.removeEventListener("pointermove", onPointerMove);
  pointerState.dragging = false;
  const g = pointerState.ghost;
  const elUnder = document.elementFromPoint(e.clientX, e.clientY);
  const cell = elUnder && elUnder.closest ? elUnder.closest(".cell") : null;
  const pool = elUnder && elUnder.closest ? elUnder.closest(".row-pool") : null;
  if (pointerState.cardEl) {
    if (pool) {
      const id = pointerState.cardEl.dataset.cardId;
      placeCardToPool(id, pool);
    } else if (cell) {
      const id = pointerState.cardEl.dataset.cardId;
      placeCardToCell(id, cell);
    }
  }
  if (g) g.remove();
  pointerState.cardEl = null;
  pointerState.ghost = null;
  pointerState.moved = false;
  document
    .querySelectorAll(".cell.highlight")
    .forEach((n) => n.classList.remove("highlight"));
  updateDebug();
  document.querySelectorAll('.card.dragging').forEach(g => {
    if (g.style.position === 'fixed') g.remove();
  });
}

// place a card into a row-pool element
function placeCardToPool(cardId, poolEl) {
  let cardEl = Array.from(document.querySelectorAll(`[data-card-id='${cardId}']`))
    .find(c => c.parentElement && (c.parentElement.classList.contains('row-pool') || c.parentElement.classList.contains('cell-inner')));
  if (!cardEl) {
    cardEl = document.querySelector(`.card.dragging[data-card-id='${cardId}']`);
  }
  if (!cardEl || !poolEl) return;
  poolEl.appendChild(cardEl);
  cardEl.classList.add("in-pool");
  // clear any cell-level classes and placements that referenced this card
  const key = Object.keys(state.placements || {}).find(
    (k) => state.placements[k] === cardId
  );
  if (key) delete state.placements[key];
  playPlaceSound();
}

function onCellPointerDown(e) {
  // for mobile: if a card is in the cell, pick it up
  // Only on touch/pen
  if (e.pointerType && e.pointerType !== "touch" && e.pointerType !== "pen")
    return;
  const cell = e.currentTarget;
  const cardEl = cell.querySelector(".card");
  if (cardEl) {
    // emulate picking — provide required properties
    const fakeEvent = {
      currentTarget: cardEl,
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      pointerType: e.pointerType,
      preventDefault: () => {},
    };
    onCardPointerDown(fakeEvent);
  }
}

function placeCardToCell(cardId, cell) {
  const singleOnly = el("opt-single").checked;
  const key = cell.dataset.key;

  if (singleOnly) {
    handleSingleOnlyCell(cell, key);
  }

  const cardEl = findMovableCardElement(cardId);
  if (!cardEl) {
    console.warn("[placeCardToCell] cardEl not found for cardId:", cardId);
    return;
  }

  moveCardToCell(cardEl, cell);
  state.placements[cell.dataset.key] = cardId;
  // if (APP_MODE !== "teach") playPlaceSound();
  playPlaceSound();
  cell.classList.remove("correct", "wrong");
}

function handleSingleOnlyCell(cell, key) {
  const existing = cell.querySelector(".card");
  if (!existing) return;
  const existingId = existing.dataset.cardId;
  returnCardToPool(existing, existingId);
  delete state.placements[key];
}

function findMovableCardElement(cardId) {
  // 先找 pool 或 cell 內的卡片（不是 ghost）
  let cardEl = Array.from(document.querySelectorAll(`[data-card-id='${cardId}']`))
    .find(c => c.parentElement && (c.parentElement.classList.contains('row-pool') || c.parentElement.classList.contains('cell-inner')));
  // 如果找不到，再 fallback 找唯一的 .card.dragging（滑鼠拖曳時）
  if (!cardEl) {
    cardEl = document.querySelector(`.card.dragging[data-card-id='${cardId}']`);
  }
  return cardEl;
}

function moveCardToCell(cardEl, cell) {
  const cellInner = cell.querySelector(".cell-inner");
  if (!cellInner) return;
  cellInner.appendChild(cardEl);
  cardEl.classList.remove("in-pool");
}

function updateDebug() {
  // debug UI removed; keep this function as a no-op for safety
  return;
}

function renderSpecSelector(activeIdx = 0) {
  const container = el("spec-selector-container");
  if (!container) return;
  container.innerHTML = "";
  if (!specsList || !specsList.length) return;

  const label = document.createElement("label");
  label.textContent = "題目： ";
  const sel = document.createElement("select");
  specsList.forEach((s, i) => {
    const opt = document.createElement("option");
    opt.value = s.filename || i;
    opt.textContent = s.name || `spec ${i + 1}`;
    if (i === activeIdx) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", () => {
    const val = sel.value;
    // 切換時直接跳轉網址
    const url = new URL(location.href);
    url.searchParams.set("spec", val);
    location.href = url.toString();
  });
  container.appendChild(label);
  container.appendChild(sel);
}

// Also populate left panel list (clickable) if available
function renderLeftSpecList(activeIdx = 0) {
  const listEl = el("spec-list");
  if (!listEl) return;
  listEl.innerHTML = "";
  if (!specsList || !specsList.length) {
    listEl.textContent = "無可用題目";
    return;
  }
  specsList.forEach((s, i) => {
    const it = document.createElement("div");
    it.className = "spec-item";
    it.textContent = s.name || `spec ${i + 1}`;
    if (i === activeIdx) it.classList.add("active");
    // use onclick assignment to avoid accumulating multiple listeners
    try {
      it.onclick = null;
    } catch (_) {}
    it.onclick = () => {
      spec = s.spec;
      build();
      // if teach mode is active, re-enter teach mode after switching spec
      if (APP_MODE === "teach") {
        setTimeout(() => enterTeachMode(), 40);
      }
      // mark active
      document
        .querySelectorAll(".spec-item")
        .forEach((n) => n.classList.remove("active"));
      it.classList.add("active");
    };
    listEl.appendChild(it);
  });
}

function onSubmit() {
  const rows = spec.rows || [];
  const heads = spec.head || [];
  let correct = 0,
    totalCardsPlaced = 0,
    totalExpectedCards = 0;

  totalExpectedCards = countTotalExpectedCards(rows);

  document.querySelectorAll(".cell").forEach((cell) => {
    const key = cell.dataset.key;
    const [i, j] = key.split(":").map(Number);
    const expectedList = getExpectedList(rows, i, j);

    const cardsInCell = Array.from(cell.querySelectorAll(".card"));
    if (cardsInCell.length === 0) {
      cell.classList.remove("correct", "wrong");
      return;
    }

    let anyWrong = false;
    cardsInCell.forEach((cardEl) => {
      const cardId = cardEl.dataset.cardId;
      const meta = state.cards[cardId];
      totalCardsPlaced++;
      const text = meta ? meta.text : cardEl.textContent;
      if (expectedList.length && expectedList.includes(text)) {
        correct++;
        markCard(cardEl, true);
      } else {
        anyWrong = true;
        markCard(cardEl, false);
        handleAutoReturn(cardEl, cardId, key, cell);
      }
    });

    markCell(cell, anyWrong, cardsInCell.length);

    if (cardsInCell.length > 0) {
      state.placements[key] = cardsInCell[0].dataset.cardId;
    }
  });

  const totalCandidates = Object.keys(state.cards || {}).length;
  const score =
    totalCandidates > 0 ? Math.round((correct / totalCandidates) * 100) : 0;
  logEvent({
    type: "submit",
    correct,
    totalPlaced: totalCardsPlaced,
    totalExpected: totalExpectedCards,
    totalCandidates,
    score,
    timestamp: Date.now(),
  });

  showResultPanel(`得分 ${score}% (${correct}/${totalCandidates})`);

  if (totalCandidates > 0 && correct === totalCandidates) {
    alert(`正確 ${correct} / ${totalCandidates}，得分 ${score}%`);
  }
}

function countTotalExpectedCards(rows) {
  let total = 0;
  rows.forEach((r) => {
    (r.content || []).forEach((expectedRaw) => {
      if (Array.isArray(expectedRaw)) total += expectedRaw.length;
      else if (expectedRaw != null) total += 1;
    });
  });
  return total;
}

function getExpectedList(rows, i, j) {
  const expectedRaw = ((rows[i] && rows[i].content) || [])[j];
  return normalizeExpectedList(expectedRaw);
}

function markCard(cardEl, isCorrect) {
  if (isCorrect) {
    cardEl.classList.add("correct");
    cardEl.classList.remove("wrong");
  } else {
    cardEl.classList.add("wrong");
    cardEl.classList.remove("correct");
  }
}
function handleAutoReturn(cardEl, cardId, key, cell) {
  if (!el("opt-auto-return").checked) return;
  setTimeout(() => {
    const elc2 = document.querySelector(`[data-card-id='${cardId}']`);
    if (elc2) {
      returnCardToPool(elc2, cardId);
    }
    try {
      if (
        state.placements &&
        state.placements[key] &&
        state.placements[key] === cardId
      )
        delete state.placements[key];
    } catch (_) {}
    cell.classList.remove("wrong");
  }, 600);
}

function markCell(cell, anyWrong, cardsCount) {
  if (!anyWrong && cardsCount > 0) {
    cell.classList.add("correct");
    cell.classList.remove("wrong");
  } else if (anyWrong) {
    cell.classList.add("wrong");
    cell.classList.remove("correct");
  }
}

// Result panel: a small non-blocking panel that auto-hides
let resultPanelTimeout = null;
function ensureResultPanel() {
  if (document.getElementById("result-panel")) return;
  const p = document.createElement("div");
  p.id = "result-panel";
  p.style.position = "fixed";
  p.style.right = "18px";
  p.style.bottom = "18px";
  p.style.padding = "10px 14px";
  p.style.background = "rgba(0,0,0,0.75)";
  p.style.color = "white";
  p.style.borderRadius = "8px";
  p.style.fontSize = "14px";
  p.style.zIndex = 20000;
  p.style.boxShadow = "0 6px 18px rgba(0,0,0,0.35)";
  p.style.opacity = "0";
  p.style.transition = "opacity 240ms ease";
  document.body.appendChild(p);
}
function showResultPanel(text, ms = 4000) {
  ensureResultPanel();
  const p = document.getElementById("result-panel");
  p.textContent = text;
  p.style.opacity = "1";
  if (resultPanelTimeout) clearTimeout(resultPanelTimeout);
  resultPanelTimeout = setTimeout(() => {
    p.style.opacity = "0";
  }, ms);
}

function hideResultPanel() {
  const p = document.getElementById("result-panel");
  if (p) {
    p.style.opacity = "0";
  }
  if (resultPanelTimeout) clearTimeout(resultPanelTimeout);
}

function onReset() {
  resetAllCardsToPools();
  state.placements = {};
  document
    .querySelectorAll(".cell")
    .forEach((c) => c.classList.remove("correct", "wrong"));
  document
    .querySelectorAll(".card")
    .forEach((c) => c.classList.remove("correct", "wrong"));
  logEvent({ type: "reset", timestamp: Date.now() });
}


function onViewAnswer() {
  state.placements = {};
  resetAllCardsToPools();

  const rows = spec.rows || [];
  rows.forEach((row, i) => {
    (row.content || []).forEach((expectedRaw, j) => {
      const expectedList = normalizeExpectedList(expectedRaw);
      const cell = document.querySelector(
        `.cell[data-row='${i}'][data-col='${j}']`
      );
      if (!cell) return;

      const allCards = Array.from(document.querySelectorAll(".card"));
      const alreadyPlaced = new Set(Object.values(state.placements || {}));
      let firstPlacedId = null;

      expectedList.forEach((expRaw) => {
        const exp = String(expRaw).trim();
        const cardEl = findUnplacedCardForText(allCards, exp, alreadyPlaced);
        if (cardEl) {
          cell.querySelector(".cell-inner").appendChild(cardEl);
          alreadyPlaced.add(cardEl.dataset.cardId);
          if (!firstPlacedId) {
            firstPlacedId = cardEl.dataset.cardId;
            state.placements[cell.dataset.key] = firstPlacedId;
          }
        }
      });
    });
  });

  logEvent({ type: "view-answer", timestamp: Date.now() });
  updateLogOutput();
}

function returnCardToPool(cardEl, cardId) {
  let returned = false;
  try {
    const meta = state.cards[cardId];
    if (meta && meta.row !== undefined) {
      const rp = document.querySelector(`.row-pool[data-row='${meta.row}']`);
      if (rp) {
        rp.appendChild(cardEl);
        returned = true;
      }
    }
  } catch (e) {}
  if (!returned) {
    const pool = el("card-pool") || document.querySelector("#table .table-grid");
    if (pool) pool.appendChild(cardEl);
  }
}

function resetAllCardsToPools() {
  document.querySelectorAll(".card").forEach((c) => {
    const id = c.dataset.cardId;
    returnCardToPool(c, id);
  });
}

function normalizeExpectedList(expectedRaw) {
  if (Array.isArray(expectedRaw)) return expectedRaw.map(String);
  else if (expectedRaw != null) return [String(expectedRaw)];
  return [];
}

function findUnplacedCardForText(allCards, exp, alreadyPlaced) {
  return allCards.find((c) => {
    if (!c || !c.dataset) return false;
    if (alreadyPlaced.has(c.dataset.cardId)) return false;
    const canon =
      c.dataset.canonicalText !== undefined
        ? String(c.dataset.canonicalText).trim()
        : null;
    if (canon && canon === exp) return true;
    try {
      const meta = state.cards && state.cards[c.dataset.cardId];
      if (meta && String(meta.text).trim() === exp) return true;
    } catch (_) {}
    return false;
  });
}

function updateLogOutput() {
  const lo = document.getElementById("log-output");
  if (lo) lo.textContent = JSON.stringify(state.logs, null, 2);
}

function logEvent(obj) {
  state.logs.push(obj);
}

/* boot */
window.addEventListener("DOMContentLoaded", async () => {
  // read mode param
  try {
    const params = new URLSearchParams(location.search);
    APP_MODE = params.get("mode") || "";
  } catch (e) {}
  await loadSpec();
  build();
  // if mode=teach, optionally auto-enter teach view (do not auto-reveal text)
  if (APP_MODE === "teach") {
    // place answers but keep them hidden until clicked
    // defer slightly to allow build to finish
    setTimeout(() => enterTeachMode(), 40);
  }
});
