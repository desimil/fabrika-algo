const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

const STORAGE_KEY = "digitalquest_progress_v1";
function loadProgress() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      unlocked: p.unlocked ?? 1,
      stars: p.stars ?? {},
      xp: p.xp ?? 0,
      avatar: p.avatar ?? null,
      badges: p.badges ?? []
    };
  } catch (e) {
    return { unlocked: 1, stars: {}, xp: 0, avatar: null, badges: [] };
  }
}
function saveProgress() { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

let progress = loadProgress();
let currentLevel = null;
let levelState = null; // per-type working state
let attemptsFailed = 0;

// ---------------- Screens ----------------
function showScreen(id) {
  $$(".screen").forEach(s => s.classList.add("hidden"));
  $("#" + id).classList.remove("hidden");
}

function renderAvatarPicker(targetSel, onPick) {
  const wrap = $(targetSel);
  wrap.innerHTML = "";
  AVATARS.forEach(av => {
    const b = document.createElement("button");
    b.className = "avatar-btn " + av.id + (progress.avatar === av.id ? " selected" : "");
    b.innerHTML = `<span class="av-emoji">${av.emoji}</span><span class="av-name">${av.name}</span>`;
    b.addEventListener("click", () => {
      progress.avatar = av.id;
      saveProgress();
      onPick && onPick(av);
      renderAvatarPicker(targetSel, onPick);
      updateTopbarAvatar();
    });
    wrap.appendChild(b);
  });
}

function updateTopbarAvatar() {
  const av = AVATARS.find(a => a.id === progress.avatar) || AVATARS[0];
  $("#topAvatar").textContent = av.emoji;
  $("#topAvatar").className = "top-avatar " + av.id;
  $("#topXp").textContent = progress.xp + " XP";
}

function startIntro() {
  renderAvatarPicker("#avatarPicker", null);
  showScreen("screenIntro");
}

function isLevelUnlocked(id) { return id <= progress.unlocked; }
function isLevelDone(id) { return (progress.stars[id] ?? 0) > 0; }

function renderMap() {
  updateTopbarAvatar();
  const root = $("#worldsRoot");
  root.innerHTML = "";
  WORLDS.forEach(world => {
    const lvls = LEVELS.filter(l => l.worldId === world.id);
    if (lvls.length === 0) return;
    const worldDone = lvls.every(l => isLevelDone(l.id));
    const sec = document.createElement("div");
    sec.className = "world-card" + (worldDone ? " world-done" : "");
    sec.innerHTML = `
      <div class="world-head">
        <div class="world-name">${world.name}</div>
        <div class="world-badge ${worldDone ? "earned" : ""}">${world.badgeEmoji} ${world.badge}${worldDone ? " ✓" : ""}</div>
      </div>
      <div class="level-grid" id="grid-${world.id}"></div>
    `;
    root.appendChild(sec);
    const grid = $("#grid-" + world.id, sec);
    lvls.forEach(lv => {
      const unlocked = isLevelUnlocked(lv.id);
      const stars = progress.stars[lv.id] ?? 0;
      const tile = document.createElement("div");
      tile.className = "level-tile" + (unlocked ? "" : " locked") + (stars > 0 ? " done" : "");
      tile.innerHTML = `
        <div class="lvl-icon">${typeIcon(lv.type)}</div>
        <div class="lvl-title">${lv.title}</div>
        <div class="lvl-stars">${unlocked ? ("★".repeat(stars) + "☆".repeat(3 - stars)) : "🔒"}</div>
      `;
      tile.addEventListener("click", () => { if (unlocked) loadLevel(lv.id); });
      grid.appendChild(tile);
    });
  });
}
function typeIcon(t) {
  return { quiz: "❓", binary: "🔀", order: "📶", match: "🔗", sort2: "🗂️" }[t] || "🎮";
}

// ---------------- Level loading ----------------
function loadLevel(id) {
  currentLevel = deepClone(LEVELS.find(l => l.id === id));
  attemptsFailed = 0;
  levelState = {};
  $("#lvlTitle").textContent = currentLevel.title;
  $("#lvlWorld").textContent = WORLDS.find(w => w.id === currentLevel.worldId)?.name || "";
  $("#lvlIntro").textContent = currentLevel.intro || "";
  $("#lvlFeedback").className = "feedback hidden";
  $("#lvlFeedback").textContent = "";
  const body = $("#lvlBody");
  body.innerHTML = "";

  if (currentLevel.type === "quiz") renderQuiz(body);
  else if (currentLevel.type === "binary") renderBinary(body);
  else if (currentLevel.type === "order") renderOrder(body);
  else if (currentLevel.type === "match") renderMatchLevel(body);
  else if (currentLevel.type === "sort2") renderSort2(body);

  showScreen("screenLevel");
}

function setFeedback(text, mode) {
  const el = $("#lvlFeedback");
  el.classList.remove("hidden", "ok", "bad", "info");
  el.classList.add(mode || "info");
  el.textContent = text;
}

// ---------------- QUIZ ----------------
function renderQuiz(body) {
  levelState.answers = new Array(currentLevel.questions.length).fill(null);
  levelState.checked = false;
  const qWrap = document.createElement("div");
  qWrap.className = "quiz-list";
  currentLevel.questions.forEach((q, qi) => {
    const qEl = document.createElement("div");
    qEl.className = "quiz-q";
    qEl.innerHTML = `<div class="q-text">${qi + 1}. ${q.q}</div>`;
    const opts = document.createElement("div");
    opts.className = "q-options";
    q.options.forEach((opt, oi) => {
      const b = document.createElement("button");
      b.className = "opt-btn";
      b.textContent = opt;
      b.addEventListener("click", () => {
        if (levelState.checked) return;
        levelState.answers[qi] = oi;
        Array.from(opts.children).forEach(c => c.classList.remove("picked"));
        b.classList.add("picked");
      });
      opts.appendChild(b);
    });
    qEl.appendChild(opts);
    const exp = document.createElement("div");
    exp.className = "q-explain hidden";
    qEl.appendChild(exp);
    qWrap.appendChild(qEl);
  });
  body.appendChild(qWrap);

  const btnRow = document.createElement("div");
  btnRow.className = "action-row";
  const checkBtn = document.createElement("button");
  checkBtn.className = "btn primary";
  checkBtn.textContent = "✅ Провери";
  checkBtn.addEventListener("click", () => checkQuiz(qWrap, checkBtn));
  btnRow.appendChild(checkBtn);
  body.appendChild(btnRow);
}
function checkQuiz(qWrap, checkBtn) {
  if (levelState.answers.some(a => a === null)) {
    setFeedback("Отговори на всички въпроси първо.", "bad");
    return;
  }
  let correct = 0;
  currentLevel.questions.forEach((q, qi) => {
    const qEl = qWrap.children[qi];
    const opts = qEl.querySelector(".q-options");
    const exp = qEl.querySelector(".q-explain");
    const ok = levelState.answers[qi] === q.correct;
    if (ok) correct++;
    Array.from(opts.children).forEach((c, oi) => {
      c.classList.remove("picked");
      c.classList.toggle("correct", oi === q.correct);
      c.classList.toggle("wrong", oi === levelState.answers[qi] && !ok);
      c.disabled = true;
    });
    exp.textContent = "💡 " + q.explain;
    exp.classList.remove("hidden");
  });
  levelState.checked = true;
  checkBtn.remove();
  const total = currentLevel.questions.length;
  const ratio = correct / total;
  if (ratio >= 0.6) {
    finishLevel(true, correct === total ? 0 : attemptsFailed + 1);
  } else {
    attemptsFailed++;
    setFeedback(`Резултат: ${correct}/${total}. Трябва поне ${Math.ceil(total * 0.6)}/${total}. Опитай пак!`, "bad");
    const retry = document.createElement("button");
    retry.className = "btn secondary";
    retry.textContent = "🔁 Опитай пак";
    retry.addEventListener("click", () => loadLevel(currentLevel.id));
    $("#lvlBody").appendChild(retry);
  }
}

// ---------------- BINARY BUILDER ----------------
const BIT_VALUES = [128, 64, 32, 16, 8, 4, 2, 1];
function renderBinary(body) {
  levelState.targetIdx = 0;
  levelState.bits = BIT_VALUES.map(() => 0);
  levelState.fails = 0;
  renderBinaryTarget(body);
}
function renderBinaryTarget(body) {
  body.innerHTML = "";
  const target = currentLevel.targets[levelState.targetIdx];
  const info = document.createElement("div");
  info.className = "binary-info";
  info.innerHTML = `<div class="target-num">Целево число: <b>${target}</b></div>
    <div class="progress-dots">${currentLevel.targets.map((_, i) =>
      `<span class="dot ${i < levelState.targetIdx ? "done" : i === levelState.targetIdx ? "active" : ""}"></span>`).join("")}</div>`;
  body.appendChild(info);

  const switches = document.createElement("div");
  switches.className = "switches";
  BIT_VALUES.forEach((val, i) => {
    const sw = document.createElement("button");
    sw.className = "switch-btn" + (levelState.bits[i] ? " on" : "");
    sw.innerHTML = `<div class="sw-val">${val}</div><div class="sw-state">${levelState.bits[i]}</div>`;
    sw.addEventListener("click", () => {
      levelState.bits[i] = levelState.bits[i] ? 0 : 1;
      renderBinaryTarget(body);
    });
    switches.appendChild(sw);
  });
  body.appendChild(switches);

  const sum = levelState.bits.reduce((s, b, i) => s + b * BIT_VALUES[i], 0);
  const sumEl = document.createElement("div");
  sumEl.className = "binary-sum";
  sumEl.innerHTML = `Сбор: <b>${sum}</b>`;
  body.appendChild(sumEl);

  const btnRow = document.createElement("div");
  btnRow.className = "action-row";
  const checkBtn = document.createElement("button");
  checkBtn.className = "btn primary";
  checkBtn.textContent = "✅ Провери";
  checkBtn.addEventListener("click", () => {
    if (sum === target) {
      levelState.targetIdx++;
      levelState.bits = BIT_VALUES.map(() => 0);
      if (levelState.targetIdx >= currentLevel.targets.length) {
        finishLevel(true, levelState.fails);
      } else {
        setFeedback("✅ Точно! Следващо число.", "ok");
        renderBinaryTarget(body);
      }
    } else {
      levelState.fails++;
      setFeedback(`Сборът е ${sum}, трябва да е ${target}. Опитай пак.`, "bad");
    }
  });
  btnRow.appendChild(checkBtn);
  body.appendChild(btnRow);
}

// ---------------- ORDER ----------------
function renderOrder(body) {
  levelState.order = shuffle(currentLevel.items.map(it => it.id));
  levelState.fails = 0;
  renderOrderList(body);
}
function renderOrderList(body) {
  body.innerHTML = "";
  const list = document.createElement("div");
  list.className = "order-list";
  levelState.order.forEach((id, idx) => {
    const item = currentLevel.items.find(i => i.id === id);
    const row = document.createElement("div");
    row.className = "order-row";
    row.innerHTML = `
      <div class="order-pos">${idx + 1}</div>
      <div class="order-label">${item.label}</div>
      <div class="order-arrows">
        <button class="arrow-btn" data-dir="up" ${idx === 0 ? "disabled" : ""}>↑</button>
        <button class="arrow-btn" data-dir="down" ${idx === levelState.order.length - 1 ? "disabled" : ""}>↓</button>
      </div>
    `;
    row.querySelector('[data-dir="up"]').addEventListener("click", () => {
      if (idx > 0) { [levelState.order[idx - 1], levelState.order[idx]] = [levelState.order[idx], levelState.order[idx - 1]]; renderOrderList(body); }
    });
    row.querySelector('[data-dir="down"]').addEventListener("click", () => {
      if (idx < levelState.order.length - 1) { [levelState.order[idx + 1], levelState.order[idx]] = [levelState.order[idx], levelState.order[idx + 1]]; renderOrderList(body); }
    });
    list.appendChild(row);
  });
  body.appendChild(list);

  const btnRow = document.createElement("div");
  btnRow.className = "action-row";
  const checkBtn = document.createElement("button");
  checkBtn.className = "btn primary";
  checkBtn.textContent = "✅ Провери подредбата";
  checkBtn.addEventListener("click", () => {
    const ok = JSON.stringify(levelState.order) === JSON.stringify(currentLevel.correctOrder);
    if (ok) finishLevel(true, levelState.fails);
    else { levelState.fails++; setFeedback("Още не е точно. Пробвай пак с ↑ ↓.", "bad"); }
  });
  btnRow.appendChild(checkBtn);
  body.appendChild(btnRow);
}

// ---------------- MATCH ----------------
function renderMatchLevel(body) {
  levelState.rightOrder = shuffle(currentLevel.pairs.map(p => p.id));
  levelState.assign = {}; // leftId -> rightId chosen
  levelState.selectedRight = null;
  levelState.fails = 0;
  renderMatchBoard(body);
}
function renderMatchBoard(body) {
  body.innerHTML = "";
  const board = document.createElement("div");
  board.className = "match-board";

  const leftCol = document.createElement("div");
  leftCol.className = "match-col";
  currentLevel.pairs.forEach(p => {
    const slot = document.createElement("div");
    const assignedId = levelState.assign[p.id];
    slot.className = "match-slot" + (assignedId ? " filled" : "");
    const assignedPair = assignedId ? currentLevel.pairs.find(pp => pp.id === assignedId) : null;
    slot.innerHTML = `<div class="slot-left">${p.left}</div><div class="slot-right">${assignedPair ? assignedPair.right : "— провлачи тук —"}</div>`;
    slot.addEventListener("click", () => {
      if (levelState.selectedRight) {
        levelState.assign[p.id] = levelState.selectedRight;
        levelState.selectedRight = null;
        renderMatchBoard(body);
      } else if (assignedId) {
        delete levelState.assign[p.id];
        renderMatchBoard(body);
      }
    });
    leftCol.appendChild(slot);
  });

  const rightCol = document.createElement("div");
  rightCol.className = "match-col";
  const usedRightIds = new Set(Object.values(levelState.assign));
  levelState.rightOrder.forEach(id => {
    const p = currentLevel.pairs.find(pp => pp.id === id);
    const used = usedRightIds.has(id);
    const tok = document.createElement("div");
    tok.className = "match-token" + (used ? " used" : "") + (levelState.selectedRight === id ? " selected" : "");
    tok.textContent = p.right;
    if (!used) {
      tok.addEventListener("click", () => {
        levelState.selectedRight = levelState.selectedRight === id ? null : id;
        renderMatchBoard(body);
      });
    }
    rightCol.appendChild(tok);
  });

  board.appendChild(leftCol);
  board.appendChild(rightCol);
  body.appendChild(board);

  const hint = document.createElement("div");
  hint.className = "small muted";
  hint.textContent = "Кликни жетон вдясно, после кликни клетката отляво, за да го поставиш.";
  body.appendChild(hint);

  const btnRow = document.createElement("div");
  btnRow.className = "action-row";
  const checkBtn = document.createElement("button");
  checkBtn.className = "btn primary";
  checkBtn.textContent = "✅ Провери";
  checkBtn.addEventListener("click", () => {
    const allFilled = currentLevel.pairs.every(p => levelState.assign[p.id]);
    if (!allFilled) { setFeedback("Първо запълни всички клетки.", "bad"); return; }
    const ok = currentLevel.pairs.every(p => levelState.assign[p.id] === p.id);
    if (ok) finishLevel(true, levelState.fails);
    else { levelState.fails++; setFeedback("Има грешни двойки. Провери отново.", "bad"); }
  });
  btnRow.appendChild(checkBtn);
  body.appendChild(btnRow);
}

// ---------------- SORT2 ----------------
function renderSort2(body) {
  levelState.itemsOrder = shuffle(currentLevel.items.map(i => i.id));
  levelState.assign = {}; // itemId -> boxId
  levelState.selectedItem = null;
  levelState.fails = 0;
  renderSort2Board(body);
}
function renderSort2Board(body) {
  body.innerHTML = "";
  const pool = document.createElement("div");
  pool.className = "sort2-pool";
  levelState.itemsOrder.forEach(id => {
    const it = currentLevel.items.find(i => i.id === id);
    if (levelState.assign[id]) return;
    const chip = document.createElement("div");
    chip.className = "sort2-chip" + (levelState.selectedItem === id ? " selected" : "");
    chip.textContent = it.label;
    chip.addEventListener("click", () => {
      levelState.selectedItem = levelState.selectedItem === id ? null : id;
      renderSort2Board(body);
    });
    pool.appendChild(chip);
  });
  body.appendChild(pool);

  const boxesWrap = document.createElement("div");
  boxesWrap.className = "sort2-boxes";
  currentLevel.boxes.forEach(box => {
    const boxEl = document.createElement("div");
    boxEl.className = "sort2-box";
    const chipsHtml = currentLevel.items
      .filter(it => levelState.assign[it.id] === box.id)
      .map(it => `<div class="sort2-chip placed">${it.label}</div>`).join("");
    boxEl.innerHTML = `<div class="sort2-box-head">${box.label}</div><div class="sort2-box-body">${chipsHtml}</div>`;
    boxEl.addEventListener("click", () => {
      if (levelState.selectedItem) {
        levelState.assign[levelState.selectedItem] = box.id;
        levelState.selectedItem = null;
        renderSort2Board(body);
      }
    });
    boxesWrap.appendChild(boxEl);
  });
  body.appendChild(boxesWrap);

  const hint = document.createElement("div");
  hint.className = "small muted";
  hint.textContent = "Кликни елемент отгоре, после кликни кутията, в която да го сложиш.";
  body.appendChild(hint);

  const btnRow = document.createElement("div");
  btnRow.className = "action-row";
  const checkBtn = document.createElement("button");
  checkBtn.className = "btn primary";
  checkBtn.textContent = "✅ Провери";
  checkBtn.addEventListener("click", () => {
    const allPlaced = currentLevel.items.every(it => levelState.assign[it.id]);
    if (!allPlaced) { setFeedback("Първо разпредели всички елементи.", "bad"); return; }
    const ok = currentLevel.items.every(it => levelState.assign[it.id] === it.correctBox);
    if (ok) finishLevel(true, levelState.fails);
    else { levelState.fails++; setFeedback("Има грешно разпределени елементи.", "bad"); }
  });
  btnRow.appendChild(checkBtn);
  body.appendChild(btnRow);
}

// ---------------- Finish / scoring ----------------
function finishLevel(ok, fails) {
  if (!ok) return;
  const stars = fails === 0 ? 3 : fails <= 2 ? 2 : 1;
  const prevStars = progress.stars[currentLevel.id] ?? 0;
  const xpGain = stars * 10;
  progress.stars[currentLevel.id] = Math.max(prevStars, stars);
  if (stars > prevStars) progress.xp += xpGain;
  if (progress.unlocked < currentLevel.id + 1) progress.unlocked = currentLevel.id + 1;
  saveProgress();

  const world = WORLDS.find(w => w.id === currentLevel.worldId);
  const worldLevels = LEVELS.filter(l => l.worldId === currentLevel.worldId);
  const worldJustCompleted = worldLevels.every(l => isLevelDone(l.id));
  let badgeMsg = "";
  if (worldJustCompleted && !progress.badges.includes(world.badge)) {
    progress.badges.push(world.badge);
    saveProgress();
    badgeMsg = ` 🎉 Получи значка ${world.badgeEmoji} ${world.badge}!`;
  }

  setFeedback(`✅ Успех! ${"★".repeat(stars)}${"☆".repeat(3 - stars)} (+${stars > prevStars ? xpGain : 0} XP)${badgeMsg}`, "ok");
  updateTopbarAvatar();

  const btnRow = document.createElement("div");
  btnRow.className = "action-row";
  const nextBtn = document.createElement("button");
  nextBtn.className = "btn primary";
  nextBtn.textContent = "➡️ Към картата";
  nextBtn.addEventListener("click", showMap);
  btnRow.appendChild(nextBtn);
  const nextLevel = LEVELS.find(l => l.id === currentLevel.id + 1);
  if (nextLevel && isLevelUnlocked(nextLevel.id)) {
    const goNext = document.createElement("button");
    goNext.className = "btn secondary";
    goNext.textContent = "▶ Следващо ниво";
    goNext.addEventListener("click", () => loadLevel(nextLevel.id));
    btnRow.appendChild(goNext);
  }
  $("#lvlBody").appendChild(btnRow);
}

function showMap() { renderMap(); showScreen("screenMap"); }

// ---------------- Init ----------------
function init() {
  updateTopbarAvatar();
  $("#btnStartGame").addEventListener("click", showMap);
  $("#btnMap").addEventListener("click", showMap);
  $("#btnChangeAvatar").addEventListener("click", startIntro);
  $("#btnResetProgress").addEventListener("click", () => {
    if (confirm("Да нулирам ли целия прогрес?")) {
      const av = progress.avatar;
      progress = { unlocked: 1, stars: {}, xp: 0, avatar: av, badges: [] };
      saveProgress();
      showMap();
    }
  });

  if (!progress.avatar) {
    progress.avatar = AVATARS[0].id;
    saveProgress();
  }
  showMap();
}
window.addEventListener("DOMContentLoaded", init);
