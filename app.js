const $ = (sel, el=document)=>el.querySelector(sel);

const STORAGE_KEY = "fabrika_algo_progress_v1";
function loadProgress(){
  try{
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {unlocked: p.unlocked ?? 1, stars: p.stars ?? {}};
  }catch(e){ return {unlocked: 1, stars: {}}; }
}
function saveProgress(p){ localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }

function shapeIcon(shape){ return shape==="circle"?"⭕":shape==="square"?"⬜":shape==="triangle"?"🔺":"◼️"; }
function colorClass(color){ return color==="red"?"red":color==="blue"?"blue":color==="green"?"green":""; }
function colorDot(color){ return color==="red"?"🔴":color==="blue"?"🔵":color==="green"?"🟢":"⚪"; }
function sizeText(size){ return size===1?"малко":size===2?"средно":"голямо"; }

const BLOCKS = {
  TAKE: { icon:"📦", label:"Вземи", hint:"вземи следващия предмет", kind:"stmt" },

  PUT_A:{ icon:"➡️", label:"Сложи в A", hint:"прати в кутия A", kind:"stmt", box:"A" },
  PUT_B:{ icon:"➡️", label:"Сложи в B", hint:"прати в кутия B", kind:"stmt", box:"B" },
  PUT_C:{ icon:"➡️", label:"Сложи в C", hint:"прати в кутия C", kind:"stmt", box:"C" },
  PUT_X:{ icon:"❌", label:"Кош (X)", hint:"изхвърли", kind:"stmt", box:"X" },

  PAINT_GREEN:{ icon:"🟢", label:"Боядисай зелено", hint:"ако не е зелено → зелено", kind:"stmt" },
  TOGGLE:{ icon:"🔄", label:"Превключи", hint:"0↔1 (за редуване)", kind:"stmt" },

  ADD_SUM:{ icon:"➕", label:"Добави към сума", hint:"сума += число", kind:"stmt" },
  CHECK_SUM_EQ_10:{ icon:"💡", label:"Провери сума=10", hint:"ако е 10 → успех", kind:"stmt", target:10 },
  CHECK_SUM_GT_10:{ icon:"⚠️", label:"Провери сума>10", hint:"ако е >10 → грешка", kind:"stmt", target:10 },

  CALL_F:{ icon:"☎️", label:"CALL F", hint:"изпълни супер блока F", kind:"stmt" },

  IF_COLOR_RED:{ icon:"🟥", label:"АКО ЧЕРВЕНО", hint:"ако предметът е червен…", kind:"if", cond:{kind:"COLOR_IS", value:"red"} },
  IF_COLOR_BLUE:{ icon:"🟦", label:"АКО СИНЬО", hint:"ако предметът е син…", kind:"if", cond:{kind:"COLOR_IS", value:"blue"} },
  IF_SHAPE_CIRCLE:{ icon:"⭕", label:"АКО КРЪГ", hint:"ако формата е кръг…", kind:"if", cond:{kind:"SHAPE_IS", value:"circle"} },
  IF_SHAPE_SQUARE:{ icon:"⬜", label:"АКО КВАДРАТ", hint:"ако формата е квадрат…", kind:"if", cond:{kind:"SHAPE_IS", value:"square"} },
  IF_N_GT_5:{ icon:"🔢", label:"АКО > 5", hint:"ако числото е > 5…", kind:"if", cond:{kind:"N_GT", value:5} },
  IF_SIZE_1:{ icon:"📏", label:"АКО МАЛКО", hint:"ако размерът е малък…", kind:"if", cond:{kind:"SIZE_IS", value:1} },
  IF_SIZE_2:{ icon:"📏", label:"АКО СРЕДНО", hint:"ако размерът е среден…", kind:"if", cond:{kind:"SIZE_IS", value:2} },
  IF_TOGGLE_1:{ icon:"🔀", label:"АКО превключвател=1", hint:"ако превключвателят е 1…", kind:"if", cond:{kind:"TOGGLE_IS", value:1} },

  REPEAT_3:{ icon:"🔁", label:"Повтори 3", hint:"повтори тялото 3 пъти", kind:"repeat", n:3 },
  REPEAT_4:{ icon:"🔁", label:"Повтори 4", hint:"повтори тялото 4 пъти", kind:"repeat", n:4 },
  REPEAT_5:{ icon:"🔁", label:"Повтори 5", hint:"повтори тялото 5 пъти", kind:"repeat", n:5 },
  REPEAT_6:{ icon:"🔁", label:"Повтори 6", hint:"повтори тялото 6 пъти", kind:"repeat", n:6 },
  REPEAT_8:{ icon:"🔁", label:"Повтори 8", hint:"повтори тялото 8 пъти", kind:"repeat", n:8 },

  ANSWER_10:{ icon:"✅", label:"Отговор: 10", hint:"избери 10", kind:"answer", value:10 }
};

const NEST_ALLOWED = new Set(Object.keys(BLOCKS)); // за простота: позволяваме всички в слотовете

function makeNode(blockId){
  const def = BLOCKS[blockId];
  const node = { id: crypto.randomUUID(), blockId };
  if(def.kind==="if"){ node.then=[]; node.else=[]; }
  if(def.kind==="repeat"){ node.body=[]; }
  return node;
}

// ---- state ----
let progress = loadProgress();
let currentLevel = null;
let levelIndex = 0;
let program = [];
let funcF = [];
let answerValue = null;
let sim = null;
let hintUsed = false;

function showLevels(){
  $("#screenLevels").classList.remove("hidden");
  $("#screenGame").classList.add("hidden");
  renderLevels();
}
function showGame(){
  $("#screenLevels").classList.add("hidden");
  $("#screenGame").classList.remove("hidden");
}

function renderLevels(){
  const grid = $("#levelsGrid");
  grid.innerHTML = "";
  LEVELS.forEach((lv, idx)=>{
    const unlocked = (idx+1) <= progress.unlocked;
    const tile = document.createElement("div");
    tile.className = "level-tile" + (unlocked ? "" : " locked");
    const stars = progress.stars[lv.id] ?? 0;
    tile.innerHTML = `
      <div class="level-num">Ниво ${lv.id}</div>
      <div class="level-name">${lv.title}</div>
      <div class="level-stars">${"★".repeat(stars)}${"☆".repeat(3-stars)}</div>
    `;
    tile.addEventListener("click", ()=>{
      if(!unlocked) return;
      loadLevel(idx);
      showGame();
    });
    grid.appendChild(tile);
  });
}

function loadLevel(idx){
  levelIndex = idx;
  currentLevel = deepClone(LEVELS[idx]);
  $("#lvlTitle").textContent = `Ниво ${currentLevel.id}: ${currentLevel.title}`;
  $("#lvlGoal").textContent = currentLevel.goalText;

  $("#funcFWrap").classList.toggle("hidden", !currentLevel.allowedBlocks.includes("CALL_F"));

  program = [];
  funcF = [];
  answerValue = null;

  if(currentLevel.presetProgram){
    program = currentLevel.presetProgram.map(convertPresetNode);
  }

  renderInput(0);
  renderBoxes({A:[],B:[],C:[],X:[]});
  renderPalette();
  renderProgram();
  renderFuncF();
  setResult("Подреди блокове и натисни ▶ СТАРТ.", "muted");

  resetSim();
}

function convertPresetNode(p){
  if(p.type==="TAKE") return makeNode("TAKE");
  if(p.type==="PUT")  return makeNode(p.box==="A"?"PUT_A":p.box==="B"?"PUT_B":p.box==="C"?"PUT_C":"PUT_X");
  if(p.type==="REPEAT"){
    const rid = `REPEAT_${p.n}`;
    const node = makeNode(BLOCKS[rid] ? rid : "REPEAT_4");
    node.body = (p.body||[]).map(convertPresetNode);
    return node;
  }
  if(p.type==="IF"){
    let bid = "IF_COLOR_RED";
    const c = p.cond;
    if(c.kind==="COLOR_IS" && c.value==="red") bid="IF_COLOR_RED";
    const node = makeNode(bid);
    node.then = (p.then||[]).map(convertPresetNode);
    node.else = (p.else||[]).map(convertPresetNode);
    return node;
  }
  return makeNode("TAKE");
}

function renderInput(nextIndex){
  const row = $("#inputRow");
  row.innerHTML = "";
  currentLevel.items.forEach((it, i)=>{
    const div = document.createElement("div");
    div.className = "item" + (i===nextIndex ? " next" : "");
    div.innerHTML = `
      <div class="shape">${shapeIcon(it.shape)}</div>
      <div class="num">${it.n}</div>
      <div class="meta">${colorDot(it.color)} • ${sizeText(it.size)}</div>
    `;
    row.appendChild(div);
  });
}

function renderBoxes(boxes){
  $("#boxA").innerHTML=""; $("#boxB").innerHTML=""; $("#boxC").innerHTML=""; $("#boxX").innerHTML="";
  for(const k of ["A","B","C","X"]){
    const el = $("#box"+k);
    boxes[k].forEach(it=>{
      const pip = document.createElement("div");
      pip.className = "pip " + colorClass(it.color);
      pip.title = `${it.color} ${it.shape} n=${it.n} size=${it.size}`;
      pip.textContent = shapeIcon(it.shape);
      el.appendChild(pip);
    });
  }
}

function renderPalette(){
  const pal = $("#palette");
  pal.innerHTML = "";
  currentLevel.allowedBlocks.forEach(id=>{
    const def = BLOCKS[id];
    const b = document.createElement("div");
    b.className = "block";
    b.draggable = true;
    b.dataset.blockId = id;
    b.innerHTML = `
      <div class="icon">${def.icon}</div>
      <div>
        <div class="label">${def.label}</div>
        <div class="hint">${def.hint}</div>
      </div>
    `;
    b.addEventListener("dragstart", (e)=>{
      e.dataTransfer.setData("text/plain", JSON.stringify({blockId:id}));
      e.dataTransfer.effectAllowed = "copy";
    });
    b.addEventListener("click", ()=>{
      if(def.kind==="answer"){
        answerValue = def.value;
        setResult(`Избра отговор: ${answerValue}. Натисни ▶ СТАРТ.`, "muted");
        return;
      }
      program.push(makeNode(id));
      renderProgram();
    });
    pal.appendChild(b);
  });
}

function renderProgram(){
  const zone = $("#programZone");
  zone.innerHTML = "";
  setupDropZone(zone, (payload)=>{
    if(!payload.blockId) return;
    program.push(makeNode(payload.blockId));
    renderProgram();
  });
  program.forEach((node, idx)=>{
    zone.appendChild(renderProgNode(node, ()=>{ program.splice(idx,1); renderProgram(); }));
  });
}

function renderFuncF(){
  const zone = $("#funcFZone");
  if(!zone) return;
  zone.innerHTML = "";
  setupDropZone(zone, (payload)=>{
    if(!payload.blockId) return;
    funcF.push(makeNode(payload.blockId));
    renderFuncF();
  });
  funcF.forEach((node, idx)=>{
    zone.appendChild(renderProgNode(node, ()=>{ funcF.splice(idx,1); renderFuncF(); }));
  });
}

function renderProgNode(node, onDelete){
  const def = BLOCKS[node.blockId];
  const wrap = document.createElement("div");
  wrap.className = "prog-block";
  wrap.innerHTML = `
    <div class="left">${def.icon}</div>
    <div class="main">
      <div class="name">${def.label}</div>
      <div class="sub">${def.hint}</div>
    </div>
    <button class="del" title="Махни">×</button>
  `;
  wrap.querySelector(".del").addEventListener("click", onDelete);

  if(def.kind==="if"){
    const nest = document.createElement("div");
    nest.className = "nest two";

    const slotThen = document.createElement("div");
    slotThen.className = "slot";
    slotThen.innerHTML = `<div class="slot-title">ТОГАВА</div>`;
    setupSlot(slotThen, node.then);

    const slotElse = document.createElement("div");
    slotElse.className = "slot";
    slotElse.innerHTML = `<div class="slot-title">ИНАЧЕ</div>`;
    setupSlot(slotElse, node.else);

    node.then.forEach((ch, i)=> slotThen.appendChild(renderProgNode(ch, ()=>{ node.then.splice(i,1); renderProgram(); renderFuncF(); })));
    node.else.forEach((ch, i)=> slotElse.appendChild(renderProgNode(ch, ()=>{ node.else.splice(i,1); renderProgram(); renderFuncF(); })));

    nest.appendChild(slotThen);
    nest.appendChild(slotElse);
    wrap.appendChild(nest);
  }

  if(def.kind==="repeat"){
    const nest = document.createElement("div");
    nest.className = "nest";
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.innerHTML = `<div class="slot-title">ВЪТРЕ (повтаря се)</div>`;
    setupSlot(slot, node.body);
    node.body.forEach((ch, i)=> slot.appendChild(renderProgNode(ch, ()=>{ node.body.splice(i,1); renderProgram(); renderFuncF(); })));
    nest.appendChild(slot);
    wrap.appendChild(nest);
  }

  return wrap;
}

function setupDropZone(zone, onDrop){
  zone.addEventListener("dragover", (e)=>{ e.preventDefault(); zone.classList.add("over"); });
  zone.addEventListener("dragleave", ()=> zone.classList.remove("over"));
  zone.addEventListener("drop", (e)=>{
    e.preventDefault();
    zone.classList.remove("over");
    try{ onDrop(JSON.parse(e.dataTransfer.getData("text/plain")||"{}")); }catch(_){}
  });
}
function setupSlot(slotEl, arrRef){
  slotEl.addEventListener("dragover", (e)=>{ e.preventDefault(); slotEl.classList.add("over"); });
  slotEl.addEventListener("dragleave", ()=> slotEl.classList.remove("over"));
  slotEl.addEventListener("drop", (e)=>{
    e.preventDefault();
    slotEl.classList.remove("over");
    try{
      const payload = JSON.parse(e.dataTransfer.getData("text/plain")||"{}");
      if(!payload.blockId) return;
      if(!NEST_ALLOWED.has(payload.blockId)) return;
      arrRef.push(makeNode(payload.blockId));
      renderProgram(); renderFuncF();
    }catch(_){}
  });
}

// ---- simulation ----
function resetSim(){
  sim = {
    input: deepClone(currentLevel.items),
    nextIndex: 0,
    held: null,
    toggle: 0,
    sum: 0,
    boxes: {A:[],B:[],C:[],X:[]},
    ip: 0,
    done: false,
    failReason: null
  };
  renderInput(sim.nextIndex);
  renderBoxes(sim.boxes);
  updateStatus();
}
function updateStatus(){
  $("#heldText").textContent = sim.held ? `${colorDot(sim.held.color)} ${shapeIcon(sim.held.shape)} ${sim.held.n} (${sizeText(sim.held.size)})` : "—";
  $("#sumText").textContent = sim.sum;
  $("#toggleText").textContent = sim.toggle;
}
function evalCond(cond){
  if(cond.kind==="TOGGLE_IS") return sim.toggle === cond.value;
  if(!sim.held) return false;
  const it = sim.held;
  if(cond.kind==="COLOR_IS") return it.color === cond.value;
  if(cond.kind==="SHAPE_IS") return it.shape === cond.value;
  if(cond.kind==="N_GT") return it.n > cond.value;
  if(cond.kind==="SIZE_IS") return it.size === cond.value;
  return false;
}
function execList(list){
  for(const node of list){
    if(sim.done) return;
    execNode(node);
  }
}
function execNode(node){
  const def = BLOCKS[node.blockId];
  const id = node.blockId;

  if(def.kind==="answer") return;

  if(id==="TAKE"){
    if(sim.nextIndex >= sim.input.length){ sim.done = true; return; }
    sim.held = sim.input[sim.nextIndex];
    sim.nextIndex++;
    return;
  }
  if(id==="PUT_A"||id==="PUT_B"||id==="PUT_C"||id==="PUT_X"){
    if(!sim.held) return;
    sim.boxes[def.box].push(sim.held);
    sim.held = null;
    return;
  }
  if(id==="PAINT_GREEN"){ if(sim.held && sim.held.color!=="green") sim.held.color="green"; return; }
  if(id==="TOGGLE"){ sim.toggle = sim.toggle ? 0 : 1; return; }
  if(id==="ADD_SUM"){ if(sim.held) sim.sum += sim.held.n; return; }
  if(id==="CHECK_SUM_GT_10"){
    if(sim.sum > 10){ sim.done = true; sim.failReason = "Сумата стана по-голяма от 10."; }
    return;
  }
  if(id==="CALL_F"){ execList(funcF); return; }

  if(def.kind==="if"){
    if(evalCond(def.cond)) execList(node.then);
    else execList(node.else);
    return;
  }
  if(def.kind==="repeat"){
    for(let r=0;r<def.n;r++){ if(sim.done) break; execList(node.body); }
    return;
  }
}

function stepOnce(){
  if(sim.done) return;

  if(currentLevel.goal.type==="ANSWER"){
    sim.done = true;
    if(answerValue !== currentLevel.goal.value) sim.failReason = "Избраният отговор не е правилен.";
    return;
  }

  if(sim.ip >= program.length){ sim.done = true; return; }
  execNode(program[sim.ip]);
  sim.ip++;

  renderInput(sim.nextIndex);
  renderBoxes(sim.boxes);
  updateStatus();
}
function runAll(){
  const maxSteps = 500;
  let steps = 0;
  while(!sim.done && steps < maxSteps){ stepOnce(); steps++; }
  if(steps >= maxSteps){ sim.done = true; sim.failReason = "Твърде много стъпки. Опитай по-просто."; }
}

function totalPlaced(){
  return sim.boxes.A.length + sim.boxes.B.length + sim.boxes.C.length + sim.boxes.X.length;
}

function checkGoal(){
  if(sim.failReason) return {ok:false, reason: sim.failReason};
  const g = currentLevel.goal;

  if(g.type==="ALL_IN"){
    const ok = totalPlaced()===sim.input.length && sim.boxes[g.box].length===sim.input.length;
    return ok?{ok:true}:{ok:false, reason:"Не всички предмети са в правилната кутия."};
  }

  if(g.type==="SPLIT_COLOR"){
    const okA = sim.boxes[g.redBox].every(it=>it.color==="red");
    const okB = sim.boxes[g.blueBox].every(it=>it.color==="blue");
    const ok = okA && okB && totalPlaced()===sim.input.length;
    return ok?{ok:true}:{ok:false, reason:"Провери цветовете в кутиите A и B."};
  }

  if(g.type==="FILTER_SHAPE"){
    const okKeep = sim.boxes[g.keepBox].every(it=>it.shape===g.shape);
    const okOther = sim.boxes[g.otherBox].every(it=>it.shape!==g.shape);
    const ok = okKeep && okOther && totalPlaced()===sim.input.length;
    return ok?{ok:true}:{ok:false, reason:"В A трябва да има само кръгове, а в X — без кръгове."};
  }

  if(g.type==="ALTERNATE_AB"){
    const okCount = (sim.boxes.A.length + sim.boxes.B.length) === g.count;
    const okBalance = Math.abs(sim.boxes.A.length - sim.boxes.B.length) <= 1;
    return (okCount && okBalance)?{ok:true}:{ok:false, reason:"Трябва да са редувани A,B,A,B…"};
  }

  if(g.type==="SPLIT_N_GT"){
    const okGt = sim.boxes[g.gtBox].every(it=>it.n > g.gt);
    const okLe = sim.boxes[g.leBox].every(it=>it.n <= g.gt);
    const ok = okGt && okLe && totalPlaced()===sim.input.length;
    return ok?{ok:true}:{ok:false, reason:"Провери: >5 в A, останалото в B."};
  }

  if(g.type==="SUM_EXACT"){
    const ok = sim.sum === g.target;
    return ok?{ok:true}:{ok:false, reason:`Сумата трябва да е точно ${g.target}. Сега е ${sim.sum}.`};
  }

  if(g.type==="ALL_GREEN_IN_A"){
    const ok = sim.boxes.A.length===sim.input.length && sim.boxes.A.every(it=>it.color==="green");
    return ok?{ok:true}:{ok:false, reason:"Всичко трябва да е зелено и в A."};
  }

  if(g.type==="SHAPE_MAP"){
    const okA = sim.boxes.A.every(it=>it.shape==="circle");
    const okB = sim.boxes.B.every(it=>it.shape==="square");
    const okX = sim.boxes.X.every(it=>it.shape!=="circle" && it.shape!=="square");
    const ok = okA && okB && okX && totalPlaced()===sim.input.length;
    return ok?{ok:true}:{ok:false, reason:"Кръгове→A, квадрати→B, другото→X."};
  }

  if(g.type==="SIZE_SPLIT"){
    const okA = sim.boxes.A.every(it=>it.size===1);
    const okB = sim.boxes.B.every(it=>it.size===2);
    const okC = sim.boxes.C.every(it=>it.size===3);
    const ok = okA && okB && okC && totalPlaced()===sim.input.length;
    return ok?{ok:true}:{ok:false, reason:"Размер: малко→A, средно→B, голямо→C."};
  }

  if(g.type==="LOGIC_OR_RED_OR_CIRCLE"){
    const okA = sim.boxes.A.every(it=>it.color==="red" || it.shape==="circle");
    const okB = sim.boxes.B.every(it=>!(it.color==="red" || it.shape==="circle"));
    const ok = okA && okB && totalPlaced()===sim.input.length;
    return ok?{ok:true}:{ok:false, reason:"(червено ИЛИ кръг) → A, иначе → B."};
  }

  if(g.type==="BLUE_TO_B_ELSE_A"){
    const okB = sim.boxes.B.every(it=>it.color==="blue");
    const okA = sim.boxes.A.every(it=>it.color!=="blue");
    const ok = okB && okA && totalPlaced()===sim.input.length;
    return ok?{ok:true}:{ok:false, reason:"Синьо→B, иначе→A. Провери F и CALL F."};
  }

  if(g.type==="FINAL_COMBO"){
    const okA = sim.boxes.A.every(it=>it.shape==="circle");
    const okB = sim.boxes.B.every(it=>it.shape!=="circle" && it.n>5);
    const okC = sim.boxes.C.every(it=>it.shape!=="circle" && it.n<=5 && it.color==="green");
    const ok = okA && okB && okC && totalPlaced()===sim.input.length;
    return ok?{ok:true}:{ok:false, reason:"Провери трите правила (кръг→A, >5→B, иначе зелено→C)."};
  }

  if(g.type==="ANSWER"){
    return answerValue===g.value ? {ok:true}:{ok:false, reason:"Грешен отговор."};
  }

  return {ok:false, reason:"Целта не е изпълнена."};
}

function countNodes(list){
  let c=0;
  for(const n of list){
    c++;
    const def = BLOCKS[n.blockId];
    if(def.kind==="if") c += countNodes(n.then) + countNodes(n.else);
    if(def.kind==="repeat") c += countNodes(n.body);
  }
  return c;
}
function computeStars(){
  let stars = 1;
  const flat = countNodes(program) + countNodes(funcF);
  const softTarget = currentLevel.id <= 4 ? 6 : currentLevel.id <= 8 ? 10 : 14;
  if(flat <= softTarget) stars++;
  if(!hintUsed) stars++;
  return clamp(stars,1,3);
}

function setResult(text, mode){
  const el = $("#result");
  el.classList.remove("ok","bad");
  if(mode==="ok") el.classList.add("ok");
  if(mode==="bad") el.classList.add("bad");
  el.textContent = text;
}

function finish(){
  const res = checkGoal();
  if(res.ok){
    const stars = computeStars();
    setResult(`✅ Успех! ${"★".repeat(stars)}${"☆".repeat(3-stars)}`, "ok");
    if(progress.unlocked < currentLevel.id + 1) progress.unlocked = currentLevel.id + 1;
    progress.stars[currentLevel.id] = Math.max(progress.stars[currentLevel.id] ?? 0, stars);
    saveProgress(progress);
  }else{
    setResult("❌ Не е изпълнено. " + res.reason, "bad");
  }
}

function onStep(){
  if(sim.done){ setResult("Натисни ↻ Рестарт, за да опиташ пак.", "muted"); return; }
  stepOnce();
  if(sim.done || sim.ip>=program.length) sim.done = true;
  finish();
}
function onRun(){
  if(sim.done){ setResult("Натисни ↻ Рестарт, за да опиташ пак.", "muted"); return; }
  runAll();
  sim.done = true;
  renderInput(sim.nextIndex);
  renderBoxes(sim.boxes);
  updateStatus();
  finish();
}
function onHint(){
  hintUsed = true;
  setResult("💡 " + (currentLevel.hint || "Опитай с 🔁 Повтори и АКО рамки."), "muted");
}
function doRestart(){
  hintUsed = false;
  loadLevel(levelIndex);
}

function init(){
  renderLevels();
  $("#btnLevels").addEventListener("click", showLevels);
  $("#btnBack").addEventListener("click", showLevels);
  $("#btnRestart").addEventListener("click", doRestart);
  $("#btnStep").addEventListener("click", onStep);
  $("#btnRun").addEventListener("click", onRun);
  $("#btnHint").addEventListener("click", onHint);
  $("#btnResetProgress").addEventListener("click", ()=>{
    if(confirm("Да нулирам ли прогреса?")){
      progress = {unlocked: 1, stars:{}};
      saveProgress(progress);
      renderLevels();
    }
  });
  showLevels();
}
window.addEventListener("DOMContentLoaded", init);