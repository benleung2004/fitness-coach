// =============================================================
// 健身教練設定檔 —— 想調整計劃、目標、規則，改呢個檔就得。
// Claude Code 讀完匯出嘅 log 之後，主要都係改呢度。
// 改完記得將 sw.js 入面嘅 CACHE_VERSION 加 1，手機先會攞到新版。
// =============================================================
window.CONFIG = {
  version: '1.4.0',

  // ---------- 每週 / 每日目標 ----------
  targets: {
    gymMin: 2,               // 每週最少 gym 次數
    gymIdeal: 3,             // 每週理想 gym 次數
    cardioMinutes: 150,      // 每週中等強度帶氧分鐘（劇烈 1 分鐘當 2 分鐘）
    stepsLow: 6000,          // 每日步數目標（下限）
    stepsHigh: 8000,         // 每日步數目標（上限）
    waterMl: 2000,           // 每日飲水（休息日）
    waterMlWorkout: 2500,    // 每日飲水（運動日）
    sleepHours: 7,           // 目標睡眠
    waistEveryDays: 14,      // 幾耐量一次腰圍
    photoEveryDays: 28,      // 幾耐影一次進度相
    logDaysPerWeek: 3        // 每週最少記錄日數（留存指標）
  },

  // ---------- 規則參數 ----------
  rules: {
    returnAfterDays: 7,        // 幾多日冇做 gym 就用「回歸訓練」（較輕）
    phase2MinWeeks: 4,         // 最少幾多週先升第 2 階段
    phase2MinGymSessions: 8,   // 最少完成幾多次 gym 先升第 2 階段
    progressWeightPct: [2.5, 5], // 達標後加重百分比範圍
    hotTempC: 30,              // 高過呢個溫度唔建議戶外跑步
    humidHumidity: 85,         // 濕度高過呢個（而且 >= 27°C）唔建議跑步
    commuteKm: 8.6,            // 中大 → 屋企 步行距離
    commuteRunReadyMinutes: 30 // 可以連續慢跑幾多分鐘先建議跑成程返屋企
  },

  // ---------- 動作庫 ----------
  // type: compound(複合) / isolation(單關節) / core / bw(徒手)
  // unit: kg / sec(秒) / bw(冇重量)
  // avoid: 呢啲部位痛就唔做；painSub: 對應部位痛時改做邊個動作（null = 直接略過）
  exercises: {
    legPress:   { name: '腿推機 Leg Press', type: 'compound', unit: 'kg', inc: 5, rest: '90–120 秒',
                  cue: '腳掌成個踩實，膝頭跟住腳尖方向；落到大約 90 度，推返上去唔好鎖死膝頭。',
                  sub: '高腳杯深蹲 Goblet Squat／徒手分腿蹲', avoid: ['knee'], painSub: { knee: 'gluteBridge' } },
    row:        { name: '坐姿划船 Seated / Machine Row', type: 'compound', unit: 'kg', inc: 2.5, rest: '90–120 秒',
                  cue: '挺胸，先將膊頭向後收，再用手肘拉向肚臍；唔好用腰向後拗。',
                  sub: '單手啞鈴划船', avoid: [], painSub: {} },
    chestPress: { name: '器械胸推 Machine Chest Press', type: 'compound', unit: 'kg', inc: 2.5, rest: '90–120 秒',
                  cue: '肩胛骨收埋貼住背墊，推到手差唔多直但唔鎖死，慢慢放返。',
                  sub: '啞鈴臥推／跪地掌上壓', avoid: ['shoulder'], painSub: { shoulder: null } },
    latPulldown:{ name: '滑輪下拉 Lat Pulldown', type: 'compound', unit: 'kg', inc: 2.5, rest: '90–120 秒',
                  cue: '拉向鎖骨位置，手肘向下向後；身體唔好大幅向後瞓。',
                  sub: '輔助引體上升／彈力帶下拉', avoid: ['shoulder'], painSub: { shoulder: 'row' } },
    latRaise:   { name: '啞鈴側平舉 Lateral Raise', type: 'isolation', unit: 'kg', inc: 1, rest: '60–90 秒',
                  cue: '手肘微彎，舉到膊頭高度就夠；放落要慢，唔好聳膊。',
                  sub: '器械側平舉／彈力帶側平舉', avoid: ['shoulder'], painSub: { shoulder: null } },
    plank:      { name: '平板支撐 Plank', type: 'core', unit: 'sec', inc: 5, rest: '60 秒',
                  cue: '頭到腳一直線，收肚收臀，唔好塌腰或者翹高屁股。',
                  sub: '跪地平板支撐', avoid: ['back'], painSub: { back: 'birdDog' } },
    legExt:     { name: '腿伸展機 Leg Extension', type: 'isolation', unit: 'kg', inc: 2.5, rest: '60–90 秒',
                  cue: '膝頭對準機器轉軸；頂到最高停一停，慢慢放。',
                  sub: '徒手深蹲（慢速）', avoid: ['knee'], painSub: { knee: 'gluteBridge' } },
    legCurl:    { name: '腿彎舉機 Leg Curl', type: 'isolation', unit: 'kg', inc: 2.5, rest: '60–90 秒',
                  cue: '屁股貼實座位，用大腿後面發力屈膝，唔好甩。',
                  sub: '臀橋／瑞士球腿彎舉', avoid: [], painSub: {} },
    shoulderPress:{ name: '坐姿肩推 Shoulder Press', type: 'compound', unit: 'kg', inc: 2.5, rest: '90–120 秒',
                  cue: '背貼實椅背，推上去時唔好拗腰；落到耳仔高度左右。',
                  sub: '器械肩推／啞鈴肩推', avoid: ['shoulder'], painSub: { shoulder: null } },
    chestFly:   { name: '器械夾胸 Machine Chest Fly', type: 'isolation', unit: 'kg', inc: 2.5, rest: '60–90 秒',
                  cue: '手肘微彎固定角度，好似攬住一棵大樹咁合埋。',
                  sub: '啞鈴飛鳥（輕重量）', avoid: ['shoulder'], painSub: { shoulder: null } },
    crunch:     { name: '捲腹 Crunch', type: 'core', unit: 'bw', inc: 2, rest: '60 秒',
                  cue: '下背貼地，用腹肌將膊頭捲離地面；唔好用手拉頸。',
                  sub: '死蟲式 Dead Bug', avoid: ['back'], painSub: { back: 'deadBug' } },
    backExt:    { name: '背伸展 Back Extension', type: 'isolation', unit: 'bw', inc: 2, rest: '60–90 秒',
                  cue: '下背舒服先做；上到身體一直線就停，唔好過度向後拗。',
                  sub: '鳥狗式 Bird-dog／臀橋', avoid: ['back'], painSub: { back: 'birdDog' } },
    dbBench:    { name: '啞鈴臥推 Dumbbell Bench Press', type: 'compound', unit: 'kg', inc: 1, rest: '90–120 秒',
                  cue: '肩胛骨收埋，手肘大約 45 度；落到胸側，推返上去。',
                  sub: '器械胸推', avoid: ['shoulder', 'wrist'], painSub: { shoulder: null, wrist: 'chestPress' } },
    dbCurl:     { name: '啞鈴彎舉 Dumbbell Curl', type: 'isolation', unit: 'kg', inc: 1, rest: '60–90 秒',
                  cue: '手肘貼身唔郁，唔好用身體甩。', sub: '繩索彎舉', avoid: ['wrist'], painSub: { wrist: null } },
    pushdown:   { name: '繩索三頭下壓 Triceps Pushdown', type: 'isolation', unit: 'kg', inc: 2.5, rest: '60–90 秒',
                  cue: '手肘貼住身邊，只係前臂郁；壓到底停一停。', sub: '啞鈴過頭三頭伸展', avoid: ['wrist'], painSub: { wrist: null } },
    reverseFly: { name: '反向飛鳥／面拉 Reverse Fly / Face Pull', type: 'isolation', unit: 'kg', inc: 2.5, rest: '60–90 秒',
                  cue: '用膊頭後面發力向外拉開，唔好聳膊。', sub: '彈力帶拉開', avoid: ['shoulder'], painSub: { shoulder: null } },
    hipThrust:  { name: '臀推／臀橋 Hip Thrust', type: 'compound', unit: 'kg', inc: 5, rest: '90 秒',
                  cue: '下巴微收，頂到最高時夾實臀部；唔好用腰頂。', sub: '徒手臀橋', avoid: [], painSub: { back: 'gluteBridge' } },
    ohTriceps:  { name: '過頭三頭伸展 Overhead Triceps Ext.', type: 'isolation', unit: 'kg', inc: 1, rest: '60–90 秒',
                  cue: '手肘指向前上方唔好向外開，慢慢落。', sub: '繩索三頭下壓', avoid: ['shoulder'], painSub: { shoulder: 'pushdown' } },
    cableCurl:  { name: '繩索彎舉 Cable Curl', type: 'isolation', unit: 'kg', inc: 2.5, rest: '60–90 秒',
                  cue: '手肘固定，捲上去停一停。', sub: '啞鈴彎舉', avoid: ['wrist'], painSub: { wrist: null } },
    dbShoulderPress:{ name: '啞鈴肩推 Dumbbell Shoulder Press', type: 'compound', unit: 'kg', inc: 1, rest: '90–120 秒',
                  cue: '坐直背貼椅背，推上去唔好碰埋，落到耳仔高度。', sub: '器械肩推', avoid: ['shoulder'], painSub: { shoulder: null } },
    gluteBridge:{ name: '臀橋 Glute Bridge', type: 'bw', unit: 'bw', inc: 2, rest: '60 秒',
                  cue: '瞓低屈膝，用臀部發力頂起，頂點夾實 1 秒。', sub: '單腳臀橋', avoid: [], painSub: {} },
    birdDog:    { name: '鳥狗式 Bird-dog', type: 'core', unit: 'bw', inc: 2, rest: '45 秒',
                  cue: '四點跪地，對角手腳伸直，身體唔好搖；每邊計一下。', sub: '死蟲式', avoid: [], painSub: {} },
    deadBug:    { name: '死蟲式 Dead Bug', type: 'core', unit: 'bw', inc: 2, rest: '45 秒',
                  cue: '下背貼實地，對角手腳慢慢放低，呼氣收肚。', sub: '平板支撐', avoid: [], painSub: {} }
  },

  // ---------- 訓練日 ----------
  // reps: [最少, 最多]；sets: [第1階段, 第2階段]
  workouts: {
    gymA: { name: 'Gym A 日（全身）', phase: 1, exercises: [
      { key: 'legPress', sets: 2, reps: [10, 12] },
      { key: 'row', sets: 2, reps: [10, 12] },
      { key: 'chestPress', sets: 2, reps: [10, 12] },
      { key: 'latPulldown', sets: 2, reps: [10, 12] },
      { key: 'latRaise', sets: 2, reps: [12, 15] },
      { key: 'plank', sets: 2, reps: [20, 40] } ] },
    gymB: { name: 'Gym B 日（全身）', phase: 1, exercises: [
      { key: 'legExt', sets: 2, reps: [10, 12] },
      { key: 'legCurl', sets: 2, reps: [10, 12] },
      { key: 'row', sets: 2, reps: [10, 12] },
      { key: 'shoulderPress', sets: 2, reps: [10, 12] },
      { key: 'chestFly', sets: 2, reps: [12, 15] },
      { key: 'crunch', sets: 2, reps: [12, 20] } ] },
    d1: { name: '全身 Day 1', phase: 2, exercises: [
      { key: 'backExt', sets: 3, reps: [10, 14] },
      { key: 'row', sets: 3, reps: [10, 12] },
      { key: 'dbBench', sets: 3, reps: [10, 12] },
      { key: 'latRaise', sets: 3, reps: [12, 15] },
      { key: 'legExt', sets: 3, reps: [10, 14] },
      { key: 'dbCurl', sets: 2, reps: [12, 15] },
      { key: 'pushdown', sets: 2, reps: [12, 15] } ] },
    d2: { name: '全身 Day 2', phase: 2, exercises: [
      { key: 'legPress', sets: 3, reps: [8, 12], note: '想試保加利亞分腿蹲可以，但先用徒手、確定膝頭同平衡 OK。' },
      { key: 'latPulldown', sets: 3, reps: [8, 12] },
      { key: 'reverseFly', sets: 3, reps: [12, 15] },
      { key: 'hipThrust', sets: 3, reps: [10, 12] },
      { key: 'latRaise', sets: 3, reps: [12, 15] },
      { key: 'ohTriceps', sets: 2, reps: [12, 15] },
      { key: 'cableCurl', sets: 2, reps: [10, 15] } ] },
    d3: { name: '全身 Day 3', phase: 2, exercises: [
      { key: 'dbShoulderPress', sets: 3, reps: [10, 12] },
      { key: 'legPress', sets: 3, reps: [10, 12] },
      { key: 'legCurl', sets: 3, reps: [10, 12] },
      { key: 'chestFly', sets: 3, reps: [12, 15] },
      { key: 'ohTriceps', sets: 2, reps: [12, 15] },
      { key: 'crunch', sets: 3, reps: [12, 20] } ] }
  },

  phases: {
    1: { name: '第 1 階段：新手適應（約 4 週）', rpe: 7, rotation: ['gymA', 'gymB'],
         note: 'RPE 7 = 做完每組仲有大約 3 下乾淨嘅力。唔好做到力竭。' },
    2: { name: '第 2 階段：全身增肌（6 週）', rpe: 8, rotation: ['d1', 'd2', 'd3'],
         note: 'RPE 8 = 仲有大約 2 下嘅力。只有全部次數做足、姿勢好，先加重。' }
  },

  // ---------- 非 gym 方案 ----------
  homeCircuit: { name: '屋企 20 分鐘循環', minutes: 20,
    steps: ['徒手深蹲 × 12', '掌上壓 × 8–12（做唔到就跪地做）', '分腿蹲 每邊 × 8', '臀橋 × 15', '平板支撐 30 秒'],
    keys: ['bwSquat', 'pushup', 'splitSquat', 'gluteBridge', 'plank'],   // 對應動作圖鑑
    note: '做 3 輪，每輪之間休息 60 秒。落雨、紅黃雨或者唔想去 gym 用。' },

  recovery: { name: '恢復模式（10–20 分鐘）', minutes: 15,
    steps: ['輕鬆行 10–15 分鐘（樓下或者屋苑）', '髖屈肌伸展 每邊 30 秒', '大腿後伸展 每邊 30 秒',
            '胸肌伸展（手肘向後）30 秒', '貓牛式 × 8', '嬰兒式 30–60 秒', '頸側伸展 每邊 20 秒'],
    keys: [null, 'hipFlexor', 'hamstringStretch', 'chestStretch', 'catCow', 'childPose', 'neckStretch'],
    note: '夜更後、好攰或者瞓得差嗰日用。做完就去瞓，瞓覺比練得辛苦更重要。' },

  cardioOptions: [
    { kind: 'walk', text: '快行 30–45 分鐘（講到嘢但唱唔到歌嘅速度）' },
    { kind: 'cycle', text: '踩單車 30–45 分鐘（吐露港單車徑好啱）' },
    { kind: 'run', text: '跑行交替：慢跑 1 分鐘 + 行 2 分鐘，做 8–10 次（天氣涼先做）' },
    { kind: 'hike', text: '行山：計實際郁動嘅時間' }
  ],

  // ---------- 班次提示 ----------
  shifts: {
    early:  { name: '早更', tip: '放工後去 gym 最好；或者聽朝做帶氧。' },
    middle: { name: '中更', tip: '返工前去 gym（避開放工人多時段），或者放工後行 30 分鐘。' },
    night:  { name: '夜更', tip: '夜更後唔做重訓。行 15–20 分鐘 + 伸展，然後優先瞓覺。' },
    rest:   { name: '休息日', tip: '最適合做完整 gym；平日早上或者下午康文署健身室人較少。' },
    travel: { name: '旅行', tip: '旅行行路都計活動分鐘，返嚟照常繼續，唔使內疚。' },
    sick:   { name: '病咗', tip: '今日休息、飲水、瞓覺。好返先慢慢恢復。' }
  },

  // 班表：預設上落班時間（用戶喺「📅 班表」改成真實時間，存喺 S.shiftTimes）
  shiftDefaults: {
    early:  { start: '07:00', end: '15:00' },
    middle: { start: '15:00', end: '23:00' },
    night:  { start: '23:00', end: '07:00' }
  },

  painAdvice: {
    knee: '膝頭痛：今日唔做蹲、腿推同腿伸展。如果痛持續超過 1–2 星期，或者腫、鎖住，請睇醫生或物理治療師。',
    back: '腰背痛：避開背伸展同捲腹，改做鳥狗式／死蟲式。痛持續或者有腳麻，請睇醫生或物理治療師。',
    shoulder: '膊頭痛：略過推舉同側平舉，只做唔痛嘅動作。痛持續請睇醫生或物理治療師。',
    wrist: '手腕痛：改用器械，避免啞鈴同掌上壓。痛持續請睇醫生或物理治療師。'
  },

  // ---------- 飲食 ----------
  nutrition: {
    proteinFoods: ['雞蛋', '雞胸／雞髀', '魚', '豆腐', '牛肉', '無糖乳酪', '牛奶／高鈣豆漿'],
    drinkSwaps: [
      ['凍檸茶（正常甜）', '凍檸茶走甜／少甜，或者凍檸水走甜'],
      ['汽水', '梳打水／無糖茶'],
      ['珍珠奶茶', '無糖茶 + 一杯牛奶'],
      ['盒裝檸檬茶', '無糖烏龍茶／綠茶']
    ],
    eatingOut: [
      { place: '泰國菜', tip: '揀燒雞、冬陰功、炒雜菜；飯半碗就夠，少啲甜酸醬。' },
      { place: '粉麵', tip: '湯粉麵好過撈麵；加牛肉／魚蛋／雞翼，再加一碟油菜（走油）。' },
      { place: '意粉', tip: '揀番茄底，少揀忌廉汁；加雞或者海鮮。' },
      { place: '快餐', tip: '揀燒雞／雞扒套餐，飲品轉無糖茶或者水，薯條可以細份。' },
      { place: '碟頭飯', tip: '叉燒雞飯、蒸魚飯都 OK；叫「少飯、多菜、汁另上」。' },
      { place: '茶餐廳早餐', tip: '炒蛋多士、火腿通粉（少麵豉湯）；配熱奶茶少甜或者熱檸水。' },
      { place: '中大飯堂', tip: '揀有一份肉 + 一份菜嘅套餐，盡量唔好淨係食麵包當一餐。' }
    ],
    shakeNote: 'Gym 後可以飲一杯蛋白粉，但食物蛋白質優先（例如牛奶 + 雞蛋）。'
  },

  // ---------- 通勤（中大 → 大埔）----------
  commute: {
    title: '中大 ↔ 大埔 通勤運動',
    origin: '香港中文大學',          // 地圖起點
    homeDefault: '大埔墟',            // 屋企位置（用戶可以喺設定改，只存喺私人資料）
    minutes: { walk: 105, cycle: 35, run: 50 },
    options: [
      { level: '入門（第 1 週開始）', text: '放工行一段：例如喺大埔墟站落車再行返屋企，或者週末試行全程 8.6 km（大約 1 小時 45 分）。' },
      { level: '入門（第 1 週開始）', text: '踩單車：沿吐露港單車徑，速度輕鬆，計做中等帶氧。記住戴頭盔、開燈。' },
      { level: '中級（第 6 週後）', text: '跑行交替返屋企：先跑一段（例如 2–3 km），其餘行，或者跑到一半轉車。' },
      { level: '進階', text: '可以連續慢跑 30 分鐘都舒服之後，先試跑成程 8.6 km。揀涼爽日子、休息日或者早更放工。' }
    ],
    safety: [
      '夜更前後唔好跑返屋企，瞓覺優先。',
      '跑返屋企最大好處：返到屋企就沖涼，唔使擔心公司冇浴室。',
      '袋要輕：工作衫、手提電腦可以留喺公司；用貼身腰包或者細背囊。',
      '天黑跑要著光色衫、帶燈；揀單車徑或者行人路，唔好跑馬路。',
      '跑之前飲水，30°C 以上或者有酷熱／暴雨警告就改坐車。'
    ]
  },

  // ---------- 里程碑 ----------
  milestones: [
    { id: 'firstGym', text: '完成第 1 次 gym' },
    { id: 'gym10', text: '完成 10 次 gym' },
    { id: 'gym20', text: '完成 20 次 gym' },
    { id: 'gym30', text: '完成 30 次 gym' },
    { id: 'weeks4', text: '連續 4 週達到每週最少 gym 目標' },
    { id: 'cardio150', text: '一週帶氧達 150 分鐘' },
    { id: 'firstCommute', text: '第一次行／踩／跑返屋企' },
    { id: 'commuteRun', text: '第一次跑返屋企（全程或部分）' },
    { id: 'log7', text: '累計記錄 7 日' },
    { id: 'log30', text: '累計記錄 30 日' }
  ]
};
