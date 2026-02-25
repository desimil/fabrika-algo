const LEVELS = [
  {
    id: 1,
    title: "Опаковай 3 подаръка",
    goalText: "Всички 3 предмета трябва да са в кутия A.",
    items: [
      {color:"red", shape:"circle", n:1, size:1},
      {color:"blue", shape:"square", n:2, size:1},
      {color:"red", shape:"triangle", n:3, size:1},
    ],
    allowedBlocks: ["TAKE","PUT_A","REPEAT_3"],
    goal: {type:"ALL_IN", box:"A"},
    hint: "Използвай: 🔁 Повтори 3 → (📦 Вземи, ➡ A)."
  },
  {
    id: 2,
    title: "Цветни кутии",
    goalText: "Червено → A, синьо → B.",
    items: [
      {color:"red", shape:"circle", n:1, size:1},
      {color:"blue", shape:"square", n:2, size:1},
      {color:"blue", shape:"circle", n:3, size:1},
      {color:"red", shape:"square", n:4, size:1},
      {color:"red", shape:"circle", n:5, size:1},
      {color:"blue", shape:"square", n:6, size:1},
    ],
    allowedBlocks: ["TAKE","IF_COLOR_RED","PUT_A","PUT_B","REPEAT_6"],
    goal: {type:"SPLIT_COLOR", redBox:"A", blueBox:"B"},
    hint: "🔁 Повтори 6 → 📦 Вземи → 🟥 Ако ЧЕРВЕНО (ТОГАВА ➡ A, ИНАЧЕ ➡ B)."
  },
  {
    id: 3,
    title: "Само кръговете",
    goalText: "Кръг → A, другото → X.",
    items: [
      {color:"red", shape:"circle", n:1, size:1},
      {color:"blue", shape:"square", n:2, size:1},
      {color:"red", shape:"triangle", n:3, size:1},
      {color:"blue", shape:"circle", n:4, size:1},
      {color:"red", shape:"square", n:5, size:1},
    ],
    allowedBlocks: ["TAKE","IF_SHAPE_CIRCLE","PUT_A","PUT_X","REPEAT_5"],
    goal: {type:"FILTER_SHAPE", shape:"circle", keepBox:"A", otherBox:"X"},
    hint: "🔁 Повтори 5 → 📦 Вземи → ⭕ Ако КРЪГ (ТОГАВА ➡ A, ИНАЧЕ ❌)."
  },
  {
    id: 4,
    title: "Повтори 4",
    goalText: "Всички 4 предмета → A, с малко блокове.",
    items: [
      {color:"red", shape:"square", n:1, size:1},
      {color:"blue", shape:"square", n:2, size:1},
      {color:"red", shape:"circle", n:3, size:1},
      {color:"blue", shape:"circle", n:4, size:1},
    ],
    allowedBlocks: ["TAKE","PUT_A","REPEAT_4"],
    goal: {type:"ALL_IN", box:"A"},
    hint: "🔁 Повтори 4 и вътре: 📦 Вземи → ➡ A."
  },
  {
    id: 5,
    title: "Шахмат (редуване)",
    goalText: "Първият в A, вторият в B, после A, B… (8 предмета).",
    items: Array.from({length:8}, (_,i)=>({color:"red", shape:"circle", n:i+1, size:1})),
    allowedBlocks: ["TAKE","PUT_A","PUT_B","TOGGLE","IF_TOGGLE_1","REPEAT_8"],
    goal: {type:"ALTERNATE_AB", count:8},
    hint: "🔁 Повтори 8 → 📦 Вземи → 🔄 Превключи → ако превключвател=1 ➡ A иначе ➡ B."
  },
  {
    id: 6,
    title: "По-голямо от 5",
    goalText: "Ако числото > 5 → A, иначе → B.",
    items: [
      {color:"red", shape:"square", n:1, size:1},
      {color:"blue", shape:"square", n:6, size:1},
      {color:"red", shape:"circle", n:9, size:1},
      {color:"blue", shape:"circle", n:2, size:1},
      {color:"red", shape:"triangle", n:7, size:1},
    ],
    allowedBlocks: ["TAKE","IF_N_GT_5","PUT_A","PUT_B","REPEAT_5"],
    goal: {type:"SPLIT_N_GT", gt:5, gtBox:"A", leBox:"B"},
    hint: "🔁 Повтори 5 → 📦 Вземи → 🔢 Ако >5 (ТОГАВА ➡ A, ИНАЧЕ ➡ B)."
  },
  {
    id: 7,
    title: "Точно 10",
    goalText: "Събирай числата. Точно 10 = успех. Над 10 = грешка.",
    items: [
      {color:"red", shape:"square", n:3, size:1},
      {color:"blue", shape:"square", n:4, size:1},
      {color:"red", shape:"circle", n:2, size:1},
      {color:"blue", shape:"circle", n:1, size:1},
      {color:"red", shape:"triangle", n:5, size:1},
    ],
    allowedBlocks: ["TAKE","ADD_SUM","CHECK_SUM_EQ_10","CHECK_SUM_GT_10","REPEAT_5"],
    goal: {type:"SUM_EXACT", target:10},
    hint: "🔁 Повтори 5 → 📦 Вземи → ➕ Добави към сума → ⚠ ако сума>10 стоп. Накрая сума=10."
  },
  {
    id: 8,
    title: "Бояджийска машина",
    goalText: "Всички трябва да станат зелени и да са в A.",
    items: [
      {color:"red", shape:"square", n:1, size:1},
      {color:"blue", shape:"circle", n:2, size:1},
      {color:"green", shape:"triangle", n:3, size:1},
      {color:"red", shape:"circle", n:4, size:1},
    ],
    allowedBlocks: ["TAKE","PAINT_GREEN","PUT_A","REPEAT_4"],
    goal: {type:"ALL_GREEN_IN_A"},
    hint: "🔁 Повтори 4 → 📦 Вземи → 🟢 Боядисай зелено → ➡ A."
  },
  {
    id: 9,
    title: "Поправи грешката",
    goalText: "Има готова програма с една грешка. Поправи я: червено → A, синьо → B.",
    items: [
      {color:"red", shape:"circle", n:1, size:1},
      {color:"blue", shape:"square", n:2, size:1},
      {color:"red", shape:"square", n:3, size:1},
      {color:"blue", shape:"circle", n:4, size:1},
    ],
    allowedBlocks: ["TAKE","IF_COLOR_RED","PUT_A","PUT_B","REPEAT_4"],
    goal: {type:"SPLIT_COLOR", redBox:"A", blueBox:"B"},
    presetProgram: [
      {type:"REPEAT", n:4, body:[
        {type:"TAKE"},
        {type:"IF", cond:{kind:"COLOR_IS", value:"red"},
          then:[{type:"PUT", box:"B"}],  // грешка: трябва A
          else:[{type:"PUT", box:"B"}]
        }
      ]}
    ],
    hint: "В „АКО ЧЕРВЕНО“ — в ТОГАВА трябва да е ➡ A."
  },
  {
    id: 10,
    title: "Три правила",
    goalText: "Кръг → A, квадрат → B, другото → X.",
    items: [
      {color:"red", shape:"circle", n:1, size:1},
      {color:"blue", shape:"square", n:2, size:1},
      {color:"red", shape:"triangle", n:3, size:1},
      {color:"blue", shape:"circle", n:4, size:1},
      {color:"red", shape:"square", n:5, size:1},
    ],
    allowedBlocks: ["TAKE","IF_SHAPE_CIRCLE","IF_SHAPE_SQUARE","PUT_A","PUT_B","PUT_X","REPEAT_5"],
    goal: {type:"SHAPE_MAP"},
    hint: "Първо ⭕ → A, иначе ⬜ → B, иначе → X."
  },
  {
    id: 11,
    title: "По размер",
    goalText: "Малко→A, средно→B, голямо→C.",
    items: [
      {color:"red", shape:"circle", n:1, size:1},
      {color:"blue", shape:"square", n:2, size:2},
      {color:"red", shape:"triangle", n:3, size:3},
      {color:"blue", shape:"circle", n:4, size:1},
      {color:"red", shape:"square", n:5, size:2},
    ],
    allowedBlocks: ["TAKE","IF_SIZE_1","IF_SIZE_2","PUT_A","PUT_B","PUT_C","REPEAT_5"],
    goal: {type:"SIZE_SPLIT"},
    hint: "Размер 1 → A, иначе размер 2 → B, иначе → C."
  },
  {
    id: 12,
    title: "Тайни тестове",
    goalText: "(Червено ИЛИ кръг) → A, иначе → B. Има скрити тестове!",
    items: [
      {color:"red", shape:"square", n:1, size:1},
      {color:"blue", shape:"circle", n:2, size:1},
      {color:"blue", shape:"square", n:3, size:1},
      {color:"red", shape:"circle", n:4, size:1},
      {color:"blue", shape:"triangle", n:5, size:1},
    ],
    allowedBlocks: ["TAKE","IF_COLOR_RED","IF_SHAPE_CIRCLE","PUT_A","PUT_B","REPEAT_5"],
    goal: {type:"LOGIC_OR_RED_OR_CIRCLE"},
    hiddenTests: [
      [
        {color:"blue", shape:"circle", n:7, size:1},
        {color:"red", shape:"triangle", n:1, size:1},
        {color:"blue", shape:"square", n:4, size:1}
      ],
      [
        {color:"red", shape:"circle", n:9, size:1},
        {color:"blue", shape:"triangle", n:2, size:1}
      ]
    ],
    hint: "Ако е червено → A, иначе ако е кръг → A, иначе → B."
  },
  {
    id: 13,
    title: "Супер блок F",
    goalText: "Създай F и я извикай 5 пъти: синьо → B, иначе → A.",
    items: [
      {color:"red", shape:"square", n:1, size:1},
      {color:"blue", shape:"circle", n:2, size:1},
      {color:"blue", shape:"square", n:3, size:1},
      {color:"red", shape:"circle", n:4, size:1},
      {color:"blue", shape:"triangle", n:5, size:1},
    ],
    allowedBlocks: ["TAKE","CALL_F","IF_COLOR_BLUE","PUT_A","PUT_B","REPEAT_5"],
    goal: {type:"BLUE_TO_B_ELSE_A"},
    hint: "В F: 📦 Вземи → 🟦 Ако СИНЬО (➡ B / ➡ A). После: 🔁 Повтори 5 → ☎ CALL F."
  },
  {
    id: 14,
    title: "Закономерност +2",
    goalText: "След 2,4,6,8 идва 10. Избери правилния отговор.",
    items: [
      {color:"red", shape:"square", n:2, size:1},
      {color:"blue", shape:"square", n:4, size:1},
      {color:"red", shape:"square", n:6, size:1},
      {color:"blue", shape:"square", n:8, size:1},
    ],
    allowedBlocks: ["ANSWER_10"],
    goal: {type:"ANSWER", value:10},
    hint: "Всеки път +2 → след 8 идва 10."
  },
  {
    id: 15,
    title: "Голямата поръчка (финал)",
    goalText: "Кръг→A, иначе ако число>5→B, иначе боядисай зелено→C.",
    items: [
      {color:"red", shape:"circle", n:2, size:1},
      {color:"blue", shape:"square", n:7, size:1},
      {color:"red", shape:"triangle", n:3, size:1},
      {color:"blue", shape:"circle", n:9, size:1},
      {color:"red", shape:"square", n:4, size:1},
      {color:"blue", shape:"triangle", n:6, size:1},
    ],
    allowedBlocks: ["TAKE","IF_SHAPE_CIRCLE","IF_N_GT_5","PUT_A","PUT_B","PUT_C","PAINT_GREEN","REPEAT_6"],
    goal: {type:"FINAL_COMBO"},
    hint: "Ако ⭕ → A. Иначе ако >5 → B. Иначе 🟢 → C."
  }
];