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
      theme: p.theme ?? null,
      storySeen: p.storySeen ?? false,
      badges: p.badges ?? []
    };
  } catch (e) {
    return { unlocked: 1, stars: {}, xp: 0, avatar: null, theme: null, storySeen: false, badges: [] };
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
function getTheme() { return THEMES.find(t => t.id === progress.theme) || null; }
function appOf() { return getTheme() || { appName: "Дигиталния свят", appDesc: "дигитално приложение", fans: "потребителите", emoji: "💾" }; }
function applyTheme(str) { return (str || "").replace(/\{app\}/g, appOf().appName); }
function taunt() { return TAUNTS[Math.floor(Math.random() * TAUNTS.length)]; }
function cheer() { return CHEERS[Math.floor(Math.random() * CHEERS.length)]; }
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

function renderThemePicker() {
  const wrap = $("#themePicker");
  wrap.innerHTML = "";
  THEMES.forEach(th => {
    const b = document.createElement("button");
    b.className = "theme-btn " + th.id + (progress.theme === th.id ? " selected" : "");
    b.innerHTML = `<span class="th-emoji">${th.emoji}</span><span class="th-name">${th.name}</span><span class="th-app">${th.appName}</span>`;
    b.addEventListener("click", () => {
      progress.theme = th.id;
      saveProgress();
      renderThemePicker();
      updateTopbarAvatar();
      applyThemeVisual();
    });
    wrap.appendChild(b);
  });
  const startBtn = $("#btnStartGame");
  if (startBtn) {
    startBtn.disabled = !progress.theme;
    startBtn.textContent = progress.theme ? "🚀 Старт на мисията" : "👆 Първо избери тема";
  }
}

let lastShownXp = null;
function updateTopbarAvatar() {
  const av = AVATARS.find(a => a.id === progress.avatar) || AVATARS[0];
  $("#topAvatar").textContent = av.emoji;
  $("#topAvatar").className = "top-avatar " + av.id;
  const xpEl = $("#topXp");
  xpEl.textContent = progress.xp + " XP";
  if (lastShownXp !== null && progress.xp > lastShownXp) {
    xpEl.classList.remove("bump");
    void xpEl.offsetWidth;
    xpEl.classList.add("bump");
  }
  lastShownXp = progress.xp;
}

function startIntro() {
  renderThemePicker();
  renderAvatarPicker("#avatarPicker", null);
  showScreen("screenIntro");
}

function applyThemeVisual() {
  const theme = progress.theme;
  document.documentElement.dataset.theme = theme || "";
  const vis = THEME_VISUALS[theme];
  const icons = vis ? vis.bgIcons : ["🟩", "🧱", "🟦", "⭐", "🟪", "💎", "🟨", "✨"];
  const bg = $(".bg-blocks");
  if (bg) {
    bg.innerHTML = icons.map(ic => `<span>${ic}</span>`).join("");
  }
}

function renderThemeBanner() {
  const el = $("#themeBanner");
  if (!el) return;
  const theme = progress.theme;
  const vis = THEME_VISUALS[theme];
  if (!vis) { el.innerHTML = ""; return; }
  el.innerHTML = `
    <div class="banner-icons">${vis.bannerIcons.map(ic => `<span>${ic}</span>`).join("")}</div>
    <div class="banner-label">📍 Влизаш в ${vis.place} на ${appOf().appName}</div>
  `;
}

function showStory(story, onContinue) {
  let html = "";
  if (story.alert) html += `<div class="story-alert">${story.alert}</div>`;
  story.lines.forEach(line => {
    const who = line.speaker === "villain" ? STORY.villain : STORY.mentor;
    html += `
      <div class="story-bubble ${line.speaker}">
        <div class="bubble-avatar">${who.emoji}</div>
        <div class="bubble-content">
          <div class="bubble-name">${who.name}</div>
          <div class="bubble-text">${line.text}</div>
        </div>
      </div>`;
  });
  $("#storyText").innerHTML = html;
  const btn = $("#btnStoryContinue");
  const newBtn = btn.cloneNode(true);
  btn.replaceWith(newBtn);
  newBtn.addEventListener("click", onContinue);
  showScreen("screenStory");
}

function storyForLevelEnd(id) {
  const app = appOf();
  if (id === 7) return STORY.worldEnd1(app);
  if (id === 13) return STORY.worldEnd2(app);
  if (id === 14) return STORY.finalVictory(app);
  return null;
}

function isLevelUnlocked(id) { return id <= progress.unlocked; }
function isLevelDone(id) { return (progress.stars[id] ?? 0) > 0; }

function renderMap() {
  updateTopbarAvatar();
  applyThemeVisual();
  renderThemeBanner();
  const app = appOf();
  $("#mapHeading").textContent = `Мисия: спаси ${app.appName} ${app.emoji}`;
  $("#mapSubtext").textContent = `Ел Глитч разбърка ${app.appDesc} в купчина от нули и единици. Мини през мисиите, събирай XP и значки, и стани DIGITAL HERO.`;
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
        <div class="lvl-title">${levelTitleFor(lv)}</div>
        <div class="lvl-stars">${unlocked ? ("★".repeat(stars) + "☆".repeat(3 - stars)) : "🔒"}</div>
      `;
      tile.addEventListener("click", () => { if (unlocked) loadLevel(lv.id); });
      grid.appendChild(tile);
    });
  });
}
function levelTitleFor(lv) {
  if (lv.id === 2 && progress.theme && THEME_VISUALS[progress.theme]) return THEME_VISUALS[progress.theme].safe.title;
  return lv.title;
}
function typeIcon(t) {
  return { quiz: "❓", binary: "🔀", order: "📶", match: "🔗", sort2: "🗂️" }[t] || "🎮";
}

// ---------------- Level loading ----------------
function loadLevel(id) {
  currentLevel = deepClone(LEVELS.find(l => l.id === id));
  const theme = progress.theme;
  if (currentLevel.id === 2 && theme && THEME_VISUALS[theme]) {
    const safe = THEME_VISUALS[theme].safe;
    currentLevel.title = safe.title;
    currentLevel.mission = safe.mission;
    currentLevel.intro = safe.intro;
  }
  if (currentLevel.id === 4 && theme && ASCII_QUIZ_OVERRIDES[theme]) {
    const ov = ASCII_QUIZ_OVERRIDES[theme];
    currentLevel.questions = deepClone(ov.questions);
    currentLevel.mission = ov.mission;
    currentLevel.intro = ov.intro;
    currentLevel.optionShape = ov.optionShape;
  }
  if (currentLevel.id === 6 && theme && QUIZ_OVERRIDES[theme]) currentLevel.questions = deepClone(QUIZ_OVERRIDES[theme]);
  attemptsFailed = 0;
  levelState = {};
  $("#lvlTitle").textContent = currentLevel.title;
  $("#lvlWorld").textContent = WORLDS.find(w => w.id === currentLevel.worldId)?.name || "";
  $("#lvlMission").innerHTML = currentLevel.mission ? `${STORY.mentor.emoji} <b>${STORY.mentor.name}:</b> ${applyTheme(currentLevel.mission)}` : "";
  $("#lvlIntro").textContent = applyTheme(currentLevel.intro || "");
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
const OPT_LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];
const SHAPE_ICON = { shirt: "🎽", sticker: "💿", tag: "🏷️" };
function renderQuiz(body) {
  levelState.answers = new Array(currentLevel.questions.length).fill(null);
  levelState.checked = false;
  const shape = currentLevel.optionShape || null;
  const qWrap = document.createElement("div");
  qWrap.className = "quiz-list";
  currentLevel.questions.forEach((q, qi) => {
    const qEl = document.createElement("div");
    qEl.className = "quiz-q";
    qEl.innerHTML = `<div class="q-text">${qi + 1}. ${applyTheme(q.q)}</div>`;
    const opts = document.createElement("div");
    opts.className = "q-options" + (shape ? " q-options-shaped" : "");
    q.options.forEach((opt, oi) => {
      const b = document.createElement("button");
      if (shape) {
        b.className = "opt-shape shape-" + shape;
        b.innerHTML = `<span class="shape-icon">${SHAPE_ICON[shape] || "🏷️"}</span><span class="shape-code">${opt}</span>`;
      } else {
        b.className = "opt-btn";
        b.innerHTML = `<span class="opt-badge">${OPT_LETTERS[oi] || oi + 1}</span><span class="opt-text">${opt}</span>`;
      }
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
    setFeedback(`Резултат: ${correct}/${total}. Трябва поне ${Math.ceil(total * 0.6)}/${total}. Опитай пак! ${taunt()}`, "bad");
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
  const frame = document.createElement("div");
  frame.className = "safe-frame";

  const header = document.createElement("div");
  header.className = "safe-header";
  header.innerHTML = `<span>🔒</span> ТАЕН КОД <span>🔒</span>`;
  frame.appendChild(header);

  const info = document.createElement("div");
  info.className = "binary-info";
  info.innerHTML = `<div class="target-num">Целево число: <b>${target}</b></div>
    <div class="progress-dots">${currentLevel.targets.map((_, i) =>
      `<span class="dot ${i < levelState.targetIdx ? "done" : i === levelState.targetIdx ? "active" : ""}"></span>`).join("")}</div>`;
  frame.appendChild(info);

  const switches = document.createElement("div");
  switches.className = "switches";
  BIT_VALUES.forEach((val, i) => {
    const sw = document.createElement("button");
    sw.className = "switch-btn" + (levelState.bits[i] ? " on" : "");
    sw.innerHTML = `<div class="sw-lock">${levelState.bits[i] ? "🔓" : "🔒"}</div><div class="sw-val">${val}</div>`;
    sw.addEventListener("click", () => {
      levelState.bits[i] = levelState.bits[i] ? 0 : 1;
      renderBinaryTarget(body);
    });
    switches.appendChild(sw);
  });
  frame.appendChild(switches);

  const sum = levelState.bits.reduce((s, b, i) => s + b * BIT_VALUES[i], 0);
  const sumEl = document.createElement("div");
  sumEl.className = "led-display";
  sumEl.innerHTML = `СБОР: <b>${sum}</b>`;
  frame.appendChild(sumEl);
  body.appendChild(frame);

  const btnRow = document.createElement("div");
  btnRow.className = "action-row";
  const checkBtn = document.createElement("button");
  checkBtn.className = "btn primary";
  checkBtn.textContent = "🔓 Провери кода";
  checkBtn.addEventListener("click", () => {
    if (sum === target) {
      levelState.targetIdx++;
      levelState.bits = BIT_VALUES.map(() => 0);
      if (levelState.targetIdx >= currentLevel.targets.length) {
        finishLevel(true, levelState.fails);
      } else {
        setFeedback("🔓 Точно! Следваща ключалка.", "ok");
        renderBinaryTarget(body);
      }
    } else {
      levelState.fails++;
      setFeedback(`Сборът е ${sum}, трябва да е ${target}. Опитай пак. ${taunt()}`, "bad");
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
    else { levelState.fails++; setFeedback("Още не е точно. Пробвай пак с ↑ ↓. " + taunt(), "bad"); }
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
    else { levelState.fails++; setFeedback("Има грешни двойки. Провери отново. " + taunt(), "bad"); }
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
    else { levelState.fails++; setFeedback("Има грешно разпределени елементи. " + taunt(), "bad"); }
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

  setFeedback(`✅ Успех! ${"★".repeat(stars)}${"☆".repeat(3 - stars)} (+${stars > prevStars ? xpGain : 0} XP)${badgeMsg} ${cheer()}`, "ok");
  updateTopbarAvatar();

  const btnRow = document.createElement("div");
  btnRow.className = "action-row";

  const storyHtml = storyForLevelEnd(currentLevel.id);
  if (storyHtml) {
    const storyBtn = document.createElement("button");
    storyBtn.className = "btn primary";
    storyBtn.textContent = "🎬 Продължи сюжета";
    storyBtn.addEventListener("click", () => showStory(storyHtml, showMap));
    btnRow.appendChild(storyBtn);
  } else {
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn primary";
    nextBtn.textContent = "➡️ Към картата";
    nextBtn.addEventListener("click", showMap);
    btnRow.appendChild(nextBtn);
    const nextLevel = LEVELS.find(l => l.id === currentLevel.id + 1);
    if (nextLevel && isLevelUnlocked(nextLevel.id)) {
      const goNext = document.createElement("button");
      goNext.className = "btn secondary";
      goNext.textContent = "▶ Следваща мисия";
      goNext.addEventListener("click", () => loadLevel(nextLevel.id));
      btnRow.appendChild(goNext);
    }
  }
  $("#lvlBody").appendChild(btnRow);
}

function showMap() { renderMap(); showScreen("screenMap"); }

// ---------------- Init ----------------
function init() {
  updateTopbarAvatar();
  $("#btnStartGame").addEventListener("click", () => {
    if (!progress.theme) { renderThemePicker(); return; } // require a theme first
    if (!progress.storySeen) {
      progress.storySeen = true;
      saveProgress();
      showStory(STORY.intro(appOf()), showMap);
    } else {
      showMap();
    }
  });
  $("#btnMap").addEventListener("click", showMap);
  $("#btnChangeAvatar").addEventListener("click", startIntro);
  $("#btnChangeTheme").addEventListener("click", () => showStory(STORY.intro(appOf()), showMap));
  $("#btnResetProgress").addEventListener("click", () => {
    if (confirm("Да нулирам ли целия прогрес?")) {
      progress = { unlocked: 1, stars: {}, xp: 0, avatar: progress.avatar, theme: null, storySeen: false, badges: [] };
      saveProgress();
      applyThemeVisual();
      startIntro();
    }
  });

  if (!progress.avatar) {
    progress.avatar = AVATARS[0].id;
    saveProgress();
  }
  applyThemeVisual();
  if (!progress.theme) {
    startIntro();
  } else {
    showMap();
  }
}
window.addEventListener("DOMContentLoaded", init);
