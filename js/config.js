// =============================================================
// 健身教練設定檔 —— 想調整計劃、目標、規則，改呢個檔就得。
// Claude Code 讀完匯出嘅 log 之後，主要都係改呢度。
// 改完記得將 sw.js 入面嘅 CACHE_VERSION 加 1，手機先會攞到新版。
// =============================================================
window.CONFIG = {
  version: '1.23.0',

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
    row:        { name: '坐姿划船（鋼索）Seated Cable Row', type: 'compound', unit: 'kg', inc: 2.5, rest: '90–120 秒',
                  cue: '鋼索滑輪機兩邊滑輪調到最低，坐喺訓練椅；挺胸，先夾背，再用手肘拉向肚臍；唔好用腰向後拗。',
                  sub: '企姿單手鋼索划船：滑輪調到胸口高度，企定一隻腳踏前，一次拉一邊（唔使啞鈴）', avoid: [], painSub: {} },
    chestPress: { name: '器械胸推 Machine Chest Press', type: 'compound', unit: 'kg', inc: 2.5, rest: '90–120 秒',
                  cue: '肩胛骨收埋貼住背墊，推到手差唔多直但唔鎖死，慢慢放返。',
                  sub: '啞鈴臥推／跪地掌上壓', avoid: ['shoulder'], painSub: { shoulder: null } },
    latPulldown:{ name: '滑輪下拉（鋼索）Cable Pulldown', type: 'compound', unit: 'kg', inc: 2.5, rest: '90–120 秒',
                  cue: '鋼索滑輪機兩邊滑輪調到最高，跪低或者坐喺訓練椅；手肘向下向後，將手柄拉到胸口兩側；身體唔好大幅向後瞓。',
                  sub: '單手鋼索下拉（一次一邊）', avoid: ['shoulder'], painSub: { shoulder: null } },
    latRaise:   { name: '啞鈴側平舉 Lateral Raise', type: 'isolation', unit: 'kg', inc: 1, rest: '60–90 秒',
                  cue: '手肘微彎，舉到膊頭高度就夠；放落要慢，唔好聳膊。',
                  sub: '器械側平舉／彈力帶側平舉', avoid: ['shoulder'], painSub: { shoulder: null } },
    plank:      { name: '平板支撐 Plank', type: 'core', unit: 'sec', inc: 5, rest: '60 秒', reps: [20, 40],
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
    abMachine:  { name: '腹背機捲腹 Ab Crunch Machine', type: 'core', unit: 'kg', inc: 2.5, rest: '60 秒',
                  cue: '墊放喺胸前，雙腳踩住前面黑色橫桿，雙手抱住墊；呼氣用腹肌向前彎落去，吸氣慢慢返原位。',
                  sub: '鋼索滑輪機跪地捲腹（繩索）', avoid: ['back'], painSub: { back: 'deadBug' } },
    backExt:    { name: '背伸展 Back Extension', type: 'isolation', unit: 'kg', inc: 2.5, rest: '60–90 秒',
                  cue: '墊放喺背後，雙腳踩住黑色橫桿，扣好左邊安全帶；雙手胸前交叉，慢慢向後倒，吸氣返原位；唔好過度拗腰。',
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
                  cue: '有凳就坐直背貼椅背；冇凳就企直、膝頭微彎、收肚唔好拗腰。推上去唔好碰埋，落到耳仔高度。', sub: '器械肩推', avoid: ['shoulder'], painSub: { shoulder: null } },
    gluteBridge:{ name: '臀橋 Glute Bridge', type: 'bw', unit: 'bw', inc: 2, rest: '60 秒',
                  cue: '瞓低屈膝，用臀部發力頂起，頂點夾實 1 秒。', sub: '單腳臀橋', avoid: [], painSub: {} },
    dbRdl:      { name: '啞鈴羅馬尼亞硬拉 Dumbbell RDL', type: 'compound', unit: 'kg', inc: 1, rest: '90–120 秒',
                  cue: '同你做開嘅「Hello」（早安式）一樣係屈髖，但啞鈴揸喺身前、貼住大腿落：膝頭微彎，屁股向後推，背保持直，落到膝頭下面少少感覺大腿後拉緊就起返身。',
                  sub: '臀橋／腿推機（腳踩高啲）', avoid: ['back'], painSub: { back: 'gluteBridge' } },
    facePull:   { name: '面拉（鋼索）Face Pull', type: 'isolation', unit: 'kg', inc: 2.5, rest: '60–90 秒',
                  cue: '鋼索滑輪調到眼睛高度，揸住手柄／繩，拉向額頭，手肘向外向後打開，夾實上背；唔好聳膊。',
                  sub: '反向飛鳥', avoid: ['shoulder'], painSub: { shoulder: null } },
    assistPullup:{ name: '輔助引體上升機 Assisted Pull-up', type: 'compound', unit: 'kg', inc: 2.5, rest: '90–120 秒', assist: true,
                  cue: '膝頭跪喺軟墊，雙手揸頂上手柄；先沉膊頭，再用手肘向下拉，將自己拉上去直至下巴到手柄高度，慢慢落返。kg 係「輔助」重量：越重越易，進步係慢慢減輕。',
                  sub: '滑輪下拉（鋼索）', avoid: ['shoulder'], painSub: { shoulder: null } },
    gobletSquat:{ name: '高腳杯深蹲 Goblet Squat', type: 'compound', unit: 'kg', inc: 1, rest: '90–120 秒',
                  cue: '雙手捧住啞鈴喺心口前，屁股向後向下坐，胸口挺起，膝頭跟腳尖方向。',
                  sub: '腿推機', avoid: ['knee'], painSub: { knee: 'gluteBridge' } },
    birdDog:    { name: '鳥狗式 Bird-dog', type: 'core', unit: 'bw', inc: 2, rest: '45 秒',
                  cue: '四點跪地，對角手腳伸直，身體唔好搖；每邊計一下。', sub: '死蟲式', avoid: [], painSub: {} },
    dbRow:      { name: '單手啞鈴划船 Dumbbell Row', type: 'compound', unit: 'kg', inc: 1, rest: '60–90 秒', reps: [10, 12],
                  cue: '一隻手撐凳或者膝頭，背平直；手肘向上向後拉到腰側，唔好轉身借力。每邊做一次先計一組。',
                  sub: '鋼索划船', avoid: [], painSub: {} },
    floorPress: { name: '啞鈴地板臥推 Dumbbell Floor Press', type: 'compound', unit: 'kg', inc: 1, rest: '90 秒', reps: [10, 12],
                  cue: '瞓喺瑜伽墊屈膝，啞鈴喺胸口兩邊；手肘大約 45 度，落到手臂輕輕掂地停一停再推上去（唔使凳）。',
                  sub: '掌上壓', avoid: ['shoulder', 'wrist'], painSub: { shoulder: null, wrist: null } },
    dbRevFly:   { name: '俯身啞鈴反向飛鳥 Bent-over Reverse Fly', type: 'isolation', unit: 'kg', inc: 1, rest: '60 秒', reps: [12, 15],
                  cue: '膝頭微彎，屈髖令上身向前傾約 45 度，背保持直；手肘微彎向兩邊打開，用膊頭後面發力，唔好聳膊。用輕重量。',
                  sub: '彈力帶拉開', avoid: ['shoulder', 'back'], painSub: { shoulder: null, back: null } },
    pushup:     { name: '掌上壓 Push-up', type: 'bw', unit: 'bw', inc: 2, rest: '60–90 秒', reps: [6, 12],
                  cue: '雙手比膊頭略闊，身體一直線；做唔到就跪地做。', sub: '跪地掌上壓', avoid: ['shoulder', 'wrist'], painSub: { shoulder: null, wrist: null } },
    deadBug:    { name: '死蟲式 Dead Bug', type: 'core', unit: 'bw', inc: 2, rest: '45 秒',
                  cue: '下背貼實地，對角手腳慢慢放低，呼氣收肚。', sub: '平板支撐', avoid: [], painSub: {} }
  },

  // ---------- 訓練日 ----------
  // reps: [最少, 最多]；sets: [第1階段, 第2階段]
  workouts: {
    gymA: { name: 'Gym A 日（全身）', phase: 1, exercises: [
      { key: 'legPress', sets: 2, reps: [10, 12] },
      { key: 'reverseFly', sets: 2, reps: [12, 15] },
      { key: 'chestPress', sets: 2, reps: [10, 12] },
      { key: 'latPulldown', sets: 2, reps: [10, 12] },
      { key: 'latRaise', sets: 2, reps: [12, 15] },
      { key: 'abMachine', sets: 2, reps: [12, 15] } ] },
    gymB: { name: 'Gym B 日（全身）', phase: 1, exercises: [
      { key: 'legPress', sets: 2, reps: [10, 12] },
      { key: 'dbRdl', sets: 2, reps: [10, 12] },
      { key: 'assistPullup', sets: 2, reps: [8, 12] },
      { key: 'dbShoulderPress', sets: 2, reps: [10, 12] },
      { key: 'chestFly', sets: 2, reps: [12, 15] },
      { key: 'backExt', sets: 2, reps: [12, 15] } ] },
    d1: { name: '全身 Day 1', phase: 2, exercises: [
      { key: 'backExt', sets: 3, reps: [10, 14] },
      { key: 'latPulldown', sets: 3, reps: [10, 12] },
      { key: 'dbBench', sets: 3, reps: [10, 12] },
      { key: 'latRaise', sets: 3, reps: [12, 15] },
      { key: 'gobletSquat', sets: 3, reps: [10, 12] },
      { key: 'dbCurl', sets: 2, reps: [12, 15] },
      { key: 'pushdown', sets: 2, reps: [12, 15] } ] },
    d2: { name: '全身 Day 2', phase: 2, exercises: [
      { key: 'legPress', sets: 3, reps: [8, 12], note: '想試保加利亞分腿蹲可以，但先用徒手、確定膝頭同平衡 OK。' },
      { key: 'latPulldown', sets: 3, reps: [8, 12] },
      { key: 'reverseFly', sets: 3, reps: [12, 15] },
      { key: 'dbRdl', sets: 3, reps: [10, 12] },
      { key: 'latRaise', sets: 3, reps: [12, 15] },
      { key: 'ohTriceps', sets: 2, reps: [12, 15] },
      { key: 'cableCurl', sets: 2, reps: [10, 15] } ] },
    d3: { name: '全身 Day 3', phase: 2, exercises: [
      { key: 'dbShoulderPress', sets: 3, reps: [10, 12] },
      { key: 'legPress', sets: 3, reps: [10, 12] },
      { key: 'dbRdl', sets: 3, reps: [10, 12] },
      { key: 'chestFly', sets: 3, reps: [12, 15] },
      { key: 'ohTriceps', sets: 2, reps: [12, 15] },
      { key: 'abMachine', sets: 3, reps: [12, 15] } ] }
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
    office: { name: '辦公時間', tip: '放工 6–9 點健身室人多：可以行／踩返屋企做帶氧，gym 留俾早更或者休息日。' },
    middle: { name: '晚更', tip: '返工前去 gym（避開放工人多時段），或者放工後行 30 分鐘。' },
    night:  { name: '夜更', tip: '夜更後唔做重訓。行 15–20 分鐘 + 伸展，然後優先瞓覺。' },
    rest:   { name: '休息日', tip: '最適合做完整 gym；平日早上或者下午 chocoZAP 人較少。' },
    travel: { name: '旅行', tip: '旅行行路都計活動分鐘，返嚟照常繼續，唔使內疚。' },
    sick:   { name: '病咗', tip: '今日休息、飲水、瞓覺。好返先慢慢恢復。' }
  },

  // 班表：預設上落班時間（用戶喺「📅 班表」改成真實時間，存喺 S.shiftTimes）
  shiftDefaults: {
    early:  { start: '08:00', end: '16:00' },
    office: { start: '08:45', end: '17:30', endFri: '17:45' }, // 星期五遲 15 分鐘放工
    middle: { start: '16:00', end: '23:00' },
    night:  { start: '23:00', end: '08:00' }
  },

  // 返工班次（用嚟排 gym／通勤）同班表格仔簡稱
  workShifts: ['early', 'office', 'middle'],
  rosterShifts: { early: '早', office: '辦', middle: '晚', night: '夜', rest: '休' },
  // 對方頁面：資料檔、網址（相對呢頁）
  partner: { name: '女朋友', path: 'data/her.json', url: 'her/' },

  // 女朋友班表（對方未有自己頁面／未同步時用；有同步就自動讀對方真實班表）
  gfShifts: {
    A:   { name: 'A',   start: '07:00', end: '16:00' },
    P:   { name: 'P',   start: '13:00', end: '22:00' },
    SA:  { name: 'SA',  start: '07:00', end: '14:00' },
    N:   { name: 'N',   start: '21:00', end: '07:00' },
    Day: { name: 'Day', start: '09:00', end: '18:00' },
    off: { name: '休',  start: null,    end: null }
  },
  // gym 日：熱身 + 重量訓練 + 帶氧收尾（燃脂、心肺）；平板支撐／捲腹留返屋企做
  gymExtras: {
    warmup: { minutes: 6, text: '單車或者太空漫步機輕鬆踩 5 分鐘（微微出汗）→ 第一部機用好輕重量做 1 組 × 12 先。' },
    cardio: {
      hard:   { minutes: 15, kind: 'walk', intensity: 'vigorous', title: '間歇帶氧 15 分鐘（中高強度）', key: 'treadmill',
                text: '斜坡跑步機：坡度 8%、時速 5 行 2 分鐘 → 坡度 12–15% 行 1 分鐘，重複 4 次；或者單車 30 秒快踩 + 90 秒慢踩 × 6。最後 2 分鐘放慢。' },
      normal: { minutes: 15, kind: 'walk', intensity: 'moderate', title: '斜坡行 15 分鐘', key: 'treadmill',
                text: '斜坡跑步機坡度 8–10%、時速 4.5–5.5，微喘仲講到嘢。' },
      easy:   { minutes: 8, kind: 'cycle', intensity: 'light', title: '輕鬆踩 8 分鐘', key: 'bike',
                text: '單車或者臥式單車輕鬆踩，當收操。' }
    },
    // 帶氧可以自己揀機（時間同強度跟當日狀態）
    cardioChoices: {
      incline: { label: '斜坡行', kind: 'walk', key: 'treadmill', text: '跑步機坡度 8–12%、時速 4.5–5.5；想辛苦啲就加坡度，唔使跑。' },
      run:     { label: '跑步機跑', kind: 'run', key: 'treadmill', text: '慢跑 2 分鐘 + 快行 1 分鐘重複；或者 30 秒快跑 + 90 秒行 × 6。膝頭唔舒服就唔好揀。' },
      bike:    { label: '單車', kind: 'cycle', key: 'bike', text: '健身室單車：中等阻力踩，或者 30 秒快踩 + 90 秒慢踩重複。對膝頭最輕。' },
      walker:  { label: '太空漫步機', kind: 'walk', key: null, text: '太空漫步機（橢圓機）手腳一齊郁，大步慢慢擺；對膝頭好輕。' }
    },
    warmupChoices: { bike: { label: '單車', text: '單車輕鬆踩 5 分鐘' }, walk: { label: '跑步機快行', text: '跑步機快行 5 分鐘（唔使斜坡）' }, walker: { label: '太空漫步機', text: '太空漫步機輕鬆擺 5 分鐘' } },
    kneeText: '膝頭唔舒服：唔好行斜坡，改用臥式單車或者太空漫步機，時間一樣。',
    homeCore: '返屋企做 5 分鐘核心：平板支撐 30 秒 × 2、捲腹 15 下 × 2（gym 冇位瞓地，留返屋企做）。'
  },

  // 點樣揀／睇重量（第一次做、圖鑑、引導模式都會顯示）
  weightGuide: [
    '機上面嘅重量：望住旁邊嗰疊鐵片，每塊印住數字。將插銷插入邊一塊，數字就係重量，App 記低呢個數字就得。',
    '鋼索滑輪機：插銷位同樣有數字。呢種機通常有滑輪減力，拉起嚟會覺得比數字輕，正常。每次記同一個數字就可以比較進度。',
    '可調式啞鈴：轉手柄兩邊個轉盤，見到嘅數字就係一隻啞鈴嘅重量（記一隻嘅重量，唔使加埋兩隻）。',
    '第一次試重量：由最輕 2–3 塊開始做 5 下熱身 → 每次加 1 塊再試幾下 → 揀一個做到目標次數上限、但仲剩大約 3 下力（RPE 7）嘅重量，記低。',
    '揀錯唔緊要：太輕就下一組加 1 塊；做唔夠目標最少次數就減 1 塊。下次 App 會根據紀錄提你加唔加重。'
  ],

  together: {
    window: ['07:00', '22:00'],  // 可以做運動嘅時段
    commuteBuffer: 45,           // 上班前後預留（分鐘）
    sleepAfterNight: 480,        // 通宵更後瞓覺（分鐘）：落更 07:00 → 大約 15:00 先起身
    preNight: 120,               // 通宵更前休息（分鐘）
    minMinutes: 90,
    ideas: { long: '一齊行大埔滘自然護理區，或者沿吐露港單車徑踩去大美督', short: '一齊沿大埔海濱公園快行，或者一齊去 gym' }
  },

  painAdvice: {
    knee: '膝頭痛：今日唔做蹲、腿推同腿伸展。如果痛持續超過 1–2 星期，或者腫、鎖住，請睇醫生或物理治療師。',
    back: '腰背痛：避開背伸展同捲腹，改做鳥狗式／死蟲式。痛持續或者有腳麻，請睇醫生或物理治療師。',
    shoulder: '膊頭痛：略過推舉同側平舉，只做唔痛嘅動作。痛持續請睇醫生或物理治療師。',
    wrist: '手腕痛：改用器械，避免啞鈴同掌上壓。痛持續請睇醫生或物理治療師。'
  },

  // ---------- 飲食 ----------
  // ---------- 肌肉酸痛圖（今日邊度酸）----------
  // ---------- gym 器材（每間 gym 喺 App 剔有咩機；相：img/ex 動作相或者 img/eq） ----------
  equipment: {
    legPress:      { name: '腿推機 Leg Press', img: 'img/ex/legPress-0.jpg', cat: '腿' },
    legExt:        { name: '腿伸展機 Leg Extension', img: 'img/ex/legExt-0.jpg', cat: '腿' },
    legCurl:       { name: '腿彎舉機 Leg Curl', img: 'img/ex/legCurl-0.jpg', cat: '腿' },
    hipAbd:        { name: '髖外展／內收機 Hip Abductor / Adductor', img: 'img/eq/hipAbd.jpg', cat: '腿' },
    calfRaise:     { name: '小腿提踵機 Calf Raise', img: 'img/eq/calfRaise.jpg', cat: '腿' },
    chestPress:    { name: '胸推機 Chest Press', img: 'img/ex/chestPress-0.jpg', cat: '胸／膊' },
    pecDeck:       { name: '夾胸／反向飛鳥機 Pec Deck', img: 'img/ex/chestFly-0.jpg', cat: '胸／膊' },
    shoulderPress: { name: '肩推機 Shoulder Press', img: 'img/ex/shoulderPress-0.jpg', cat: '胸／膊' },
    pulldown:      { name: '下拉機 Lat Pulldown', img: 'img/ex/latPulldown-0.jpg', cat: '背' },
    seatedRow:     { name: '坐姿划船機 Seated Row', img: 'img/ex/row-0.jpg', cat: '背' },
    cable:         { name: '鋼索滑輪機 Cable Machine', img: 'img/ex/pushdown-0.jpg', cat: '背' },
    assistPullup:  { name: '輔助引體上升機 Assisted Pull-up', img: 'img/ex/assistPullup-0.jpg', cat: '背' },
    backExt:       { name: '背伸展機／腹背機 Back Extension', img: 'img/ex/backExt-0.jpg', cat: '核心' },
    abMachine:     { name: '捲腹機／腹背機 Ab Crunch', img: 'img/ex/abMachine-0.jpg', cat: '核心' },
    dumbbells:     { name: '啞鈴 Dumbbells', img: 'img/ex/dbCurl-0.jpg', cat: '自由重量' },
    bench:         { name: '可調凳 Adjustable Bench', img: 'img/ex/dbBench-0.jpg', cat: '自由重量' },
    kettlebell:    { name: '壺鈴 Kettlebell', img: 'img/eq/kettlebell.jpg', cat: '自由重量' },
    smith:         { name: '史密斯機 Smith Machine', img: 'img/eq/smith.jpg', cat: '自由重量' },
    rack:          { name: '深蹲架＋槓鈴 Squat Rack / Barbell', img: 'img/eq/rack.jpg', cat: '自由重量' },
    treadmill:     { name: '跑步機 Treadmill', img: 'img/ex/treadmill-0.jpg', cat: '帶氧' },
    bike:          { name: '健身單車 Exercise Bike', img: 'img/ex/bike-0.jpg', cat: '帶氧' },
    elliptical:    { name: '太空漫步機 Elliptical', img: 'img/eq/elliptical.jpg', cat: '帶氧' },
    rower:         { name: '划艇機 Rowing Machine', img: 'img/eq/rower.jpg', cat: '帶氧' },
    stairs:        { name: '踏步機 Stair Climber', img: 'img/eq/stairs.jpg', cat: '帶氧' }
  },
  // 每個動作要用咩器材：全部都要有；[a, b] = 其中一樣就得；冇寫 = 唔使器材
  exerciseEquip: {
    legPress: ['legPress'], legExt: ['legExt'], legCurl: ['legCurl'], chestPress: ['chestPress'], chestFly: ['pecDeck'],
    reverseFly: [['pecDeck', 'cable']], shoulderPress: ['shoulderPress'], latPulldown: [['pulldown', 'cable']], row: [['seatedRow', 'cable']],
    assistPullup: ['assistPullup'], backExt: ['backExt'], abMachine: ['abMachine'], pushdown: ['cable'], cableCurl: ['cable'], facePull: ['cable'],
    latRaise: ['dumbbells'], dbCurl: ['dumbbells'], ohTriceps: ['dumbbells'], dbRdl: ['dumbbells'], gobletSquat: [['dumbbells', 'kettlebell']],
    dbBench: ['dumbbells', 'bench'], dbShoulderPress: ['dumbbells'], hipThrust: ['rack', 'bench'],
    dbRow: ['dumbbells'], floorPress: ['dumbbells'], dbRevFly: ['dumbbells']
  },
  // gym 帶氧／熱身揀機要用嘅器材
  choiceEquip: { incline: 'treadmill', run: 'treadmill', walk: 'treadmill', bike: 'bike', walker: 'elliptical' },
  // 第一次用 App 嘅預設 gym（之後喺 App 改）
  defaultGym: { id: 'chocozap-taiwo', name: 'chocoZAP 太和',
    eq: ['legPress', 'chestPress', 'pecDeck', 'cable', 'assistPullup', 'backExt', 'abMachine', 'dumbbells', 'bench', 'treadmill', 'bike', 'elliptical'] },
  // 第一次用自動加「屋企」（之後喺 App 改）；dbKg = 屋企啞鈴最重幾 kg
  // plates：啞鈴片 [每片 kg, 片數]（兩隻啞鈴共用）；dbKg = 一隻啞鈴上晒片最重幾 kg
  homeSeed: { id: 'home', name: '屋企', eq: ['dumbbells'], dbKg: 10, plates: [[1.25, 4], [1.5, 4], [2, 4]] },
  // 凌晨幾點前嘅紀錄計返前一日（夜更、宵夜）
  dayStartHour: 4,
  // 「複製俾 Claude」嘅背景（唔好寫身高體重等個人數字，App 會由手機資料加）
  aiBackground: '健身新手（2026 年 11 月開始），返輪班（早更／辦公時間／夜更），喺香港住。目標係養成習慣（持續最重要）同增肌；體重正常偏輕，唔使減重，要食夠。唔鍾意熱同濕，唔識游水。',
  aiRules: ['頭 4 週唔做力竭、唔做保加利亞分腿蹲，目標 RPE 7（每組仲有大約 3 下力）', '有痛就停相關動作、改做替代動作；痛持續就睇醫生／物理治療師', 'gym 只做器械同啞鈴，平板支撐、捲腹留返屋企做', '夜更前後只做輕鬆行路同伸展', '用字鼓勵，唔好講「失敗」'],

  // App 內「🤖 問 AI」：Claude 檢查 log 之後喺度更新建議，AI 每次都會跟（唔好寫個人數字，呢個 repo 公開）
  coachNotes: [
    '新手每個動作 2–3 組已經夠；每次 5–6 個動作、總共 12–18 組最好，唔好每個動作 4 組。',
    'chocoZAP 冇腿彎舉、腿伸展機：腿只靠腿推機，大腿後用啞鈴羅馬尼亞硬拉。',
    '「胸＋膊頭」二合一機：向前推 = 胸推，向中間夾 = 夾胸，反過嚟坐 = 反向飛鳥。',
    '屋企器材少：優先做啞鈴單手划船、地板臥推、企住肩推、高腳杯深蹲、俯身反向飛鳥、平板支撐。',
    '時間唔夠就減組數，唔好減熱身；先做複合動作（腿推、胸推、下拉／划船），單關節同核心放最後。'
  ],
  sore: {
    regions: {
      shoulders: '膊頭（前／側）', chest: '胸', biceps: '二頭肌', forearm: '前臂', abs: '腹', obliques: '側腹', quads: '大腿前',
      traps: '上背（斜方肌）', rearDelt: '膊頭後', triceps: '三頭肌', lats: '背闊肌／中背', lowerBack: '下背', glutes: '臀', hamstrings: '大腿後', calves: '小腿'
    },
    // 每個動作主要練到邊度（用嚟對比酸嘅位）
    map: {
      legPress: ['quads', 'glutes', 'hamstrings'], legExt: ['quads'], legCurl: ['hamstrings'], dbRdl: ['hamstrings', 'glutes', 'lowerBack'], gluteBridge: ['glutes', 'hamstrings'],
      gobletSquat: ['quads', 'glutes'], bwSquat: ['quads', 'glutes'], splitSquat: ['quads', 'glutes'],
      row: ['lats', 'traps', 'rearDelt', 'biceps'], latPulldown: ['lats', 'biceps'], assistPullup: ['lats', 'biceps', 'traps'], dbRow: ['lats', 'traps', 'biceps'],
      backExt: ['lowerBack', 'glutes', 'hamstrings'], abMachine: ['abs'], plank: ['abs', 'obliques'], crunch: ['abs'], deadBug: ['abs', 'obliques'],
      chestPress: ['chest', 'shoulders', 'triceps'], dbBench: ['chest', 'shoulders', 'triceps'], pushup: ['chest', 'shoulders', 'triceps'], chestFly: ['chest'],
      latRaise: ['shoulders'], shoulderPress: ['shoulders', 'triceps'], dbShoulderPress: ['shoulders', 'triceps'],
      reverseFly: ['rearDelt', 'traps'], facePull: ['rearDelt', 'traps'], dbRevFly: ['rearDelt', 'traps'], floorPress: ['chest', 'triceps', 'shoulders'], birdDog: ['lowerBack', 'abs', 'glutes'],
      dbCurl: ['biceps', 'forearm'], cableCurl: ['biceps', 'forearm'], pushdown: ['triceps'], ohTriceps: ['triceps']
    },
    // 活動都會令啲位酸
    actMap: { walk: ['calves'], run: ['calves', 'quads'], hike: ['calves', 'quads', 'glutes'], cycle: ['quads'], badminton: ['calves', 'shoulders'] },
    // 冇練過都酸：可能借錯力
    hints: {
      lowerBack: '下背酸：腿推時腰要貼實椅背；背伸展唔好向後拗過頭。酸痛持續或者係刺痛，就停相關動作。',
      traps: '上背／頸酸：下拉、划船、肩推時膊頭沉低，唔好聳膊；返工坐耐都會令呢度繃緊。',
      forearm: '前臂酸：下拉、划船唔好揸得太實，諗住用手肘拉。',
      shoulders: '膊頭酸但冇練膊頭：胸推時手肘唔好打得太開（大約 45 度）。',
      calves: '小腿酸：多數係行路、企得耐或者跑步，正常。',
      quads: '大腿前酸：可能係踩單車、行山或者落樓梯，正常。'
    }
  },

  nutrition: {
    proteinFoods: ['雞蛋', '雞胸／雞髀', '魚', '豆腐', '牛肉', '無糖乳酪', '牛奶／高鈣豆漿'],
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

// =============================================================
// 女朋友頁面（her/index.html 設定 window.FC_USER = 'her'）
// 個人數據（身高、體重、體脂）只喺佢部手機輸入，唔寫入呢度。
// =============================================================
if (window.FC_USER === 'her') (function (C) {
  C.homeSeed = null;
  C.user = 'her';
  C.partner = { name: '男朋友', path: 'data/fitness.json', url: '../' };
  C.goalText = '目標：減脂、身形實啲。每週 2–3 次 gym + 每日多行路；體重慢慢落（每週 0.3–0.5kg）就最理想。';
  C.aiBackground = '健身新手（2026 年 11 月開始），返輪班（A／SA／Day／P／夜更），喺香港住，同男朋友一齊去 gym。目標係減脂、身形實啲，每週 2–3 次 gym + 多行路，體重慢慢落（每週 0.3–0.5kg）。';
  C.aiRules = ['頭 4 週唔做力竭，目標 RPE 7（每組仲有大約 3 下力）', '有痛就停相關動作、改做替代動作', '可以輕微熱量赤字，但唔好捱餓', '用字鼓勵，唔好講「失敗」'];
  C.targets = Object.assign({}, C.targets, { cardioMinutes: 200, stepsLow: 7000, stepsHigh: 9000 });
  C.shifts = {
    A:      { name: 'A 更', tip: '16:00 放工，之後去 gym 最好。' },
    SA:     { name: 'SA 更', tip: '14:00 放工，下晝 gym 人少，最啱做完整訓練。' },
    Day:    { name: 'Day 更', tip: '18:00 放工：gym 人多就改快行 30 分鐘。' },
    P:      { name: 'P 更', tip: '13:00 返工：上晝去 gym，做完食個午餐先返工。' },
    night:  { name: 'N 更', tip: 'N 更前後唔做重訓。落更瞓夠先，瞓醒行 15–20 分鐘 + 伸展。' },
    rest:   { name: '休息日', tip: '最適合做完整 gym；平日上晝或者下晝 chocoZAP 人較少。' },
    travel: { name: '旅行', tip: '旅行行路都計活動分鐘，返嚟照常繼續。' },
    sick:   { name: '病咗', tip: '今日休息、飲水、瞓覺。好返先慢慢恢復。' }
  };
  C.shiftDefaults = {
    A:     { start: '07:00', end: '16:00' },
    SA:    { start: '07:00', end: '14:00' },
    Day:   { start: '09:00', end: '18:00' },
    P:     { start: '13:00', end: '22:00' },
    night: { start: '21:00', end: '07:00' }
  };
  C.workShifts = ['A', 'SA', 'Day', 'P'];
  C.rosterShifts = { A: 'A', SA: 'SA', Day: 'Day', P: 'P', night: 'N', rest: '休' };
  // 男朋友未同步時嘅後備班表
  C.gfShifts = {
    early:  { name: '早', start: '08:00', end: '16:00' },
    office: { name: '辦', start: '08:45', end: '17:30' },
    middle: { name: '晚', start: '16:00', end: '23:00' },
    night:  { name: '夜', start: '23:00', end: '08:00' },
    rest:   { name: '休', start: null, end: null }
  };
  C.commute = null;
  C.gymExtras = Object.assign({}, C.gymExtras, { cardio: {
    hard:   Object.assign({}, C.gymExtras.cardio.hard, { minutes: 20, title: '間歇帶氧 20 分鐘（中高強度）' }),
    normal: Object.assign({}, C.gymExtras.cardio.normal, { minutes: 20, title: '斜坡行 20 分鐘' }),
    easy:   Object.assign({}, C.gymExtras.cardio.easy, { minutes: 10, title: '輕鬆踩 10 分鐘' })
  } });
  C.nutritionGoal = '減脂飲食：每餐一個手掌份量蛋白質（每日大約 70–90g）、半碟菜、飯半碗；飲品走甜。唔使捱餓，慢慢減先唔會反彈。';
  // 同男朋友一齊去 gym 時唔好撞機：每個位置都用唔同嘅機
  // （佢 A：腿推、夾胸機反向、胸推、鋼索、啞鈴、腹背機；佢 B：腿推、啞鈴、輔助引體機、啞鈴肩推、夾胸機、腹背機）
  const reorder = (w, keys) => { const ex = C.workouts[w].exercises; C.workouts[w] = Object.assign({}, C.workouts[w], { exercises: keys.map(k => ex.find(e => e.key === k)).filter(Boolean).concat(ex.filter(e => !keys.includes(e.key))) }); };
  reorder('gymA', ['latPulldown', 'latRaise', 'legPress', 'reverseFly', 'abMachine', 'chestPress']);
  reorder('gymB', ['dbShoulderPress', 'assistPullup', 'backExt', 'chestFly', 'legPress', 'dbRdl']);
  ['d1', 'd2', 'd3'].forEach(w => { const ex = C.workouts[w].exercises, h = Math.floor(ex.length / 2); reorder(w, ex.slice(h).concat(ex.slice(0, h)).map(e => e.key)); });
  C.milestones = C.milestones.filter(m => !/commute/i.test(m.id));
})(window.CONFIG);
