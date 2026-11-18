# 健身教練：交俾 Claude Code 調整嘅指引

用戶喺手機用「設定 → 匯出俾 Claude」，將 `fitness-log-YYYY-MM-DD.json` 放入 `logs/`，然後叫 Claude「睇最新 log 幫我調整」。

## 攞最新資料
手機開咗同步之後，最新資料喺**私人** repo `benleung2004/fitness-data` 嘅 `data/fitness.json`（格式同匯出 JSON 一樣）。用呢個指令攞落 `logs/`，唔使用戶 AirDrop：

```bash
gh api repos/benleung2004/fitness-data/contents/data/fitness.json -H "Accept: application/vnd.github.raw" > logs/fitness-log-$(date +%F).json
```

如果失敗（例如未開同步），就叫用戶用手機「匯出俾 Claude」再放入 `logs/`。

**女朋友頁面**（`her/`，同一套程式，`window.FC_USER = 'her'`）：資料喺 `data/her.json`，食物相喺 `meals-her/<日期>/`。攞落 `logs/her-log-$(date +%F).json`。佢嘅計劃設定喺 `js/config.js` 最尾 `if (window.FC_USER === 'her')` 嗰段（減脂目標、佢嘅班次 A／SA／Day／P／N、帶氧 20 分鐘）。佢嘅身高、體重、體脂唔好寫入 code（公開 repo）。分析佢嘅 log 時，原則同下面「唔可以改嘅原則」唔同：佢目標係減脂，可以建議輕微熱量赤字。**唔好改 `fitness-data` 入面嘅資料**，嗰度只係俾手機寫。

### 食物相
JSON 嘅 `meals`（`id`、`date`、`slot` 早／午／晚／小食、`note`、`up` 有冇上載、`path`；`text: true` = 冇相、只係文字紀錄，直接睇 `note`；`protein` = App 按文字關鍵字估有冇蛋白質，`null` = 冇字嘅相，要你睇相判斷再話俾用戶知）。相喺私人 repo 嘅 `meals/<日期>/<id>.jpg`。下載最近 7 日嘅相落 `logs/meals/`（**唔好上載、唔好 commit**）：

```bash
for d in $(seq 0 6 | xargs -I{} date -v-{}d +%F); do
  gh api "repos/benleung2004/fitness-data/contents/meals/$d" --jq '.[].path' 2>/dev/null | while read p; do
    mkdir -p "logs/$(dirname "$p")"; gh api "repos/benleung2004/fitness-data/contents/$p" -H "Accept: application/vnd.github.raw" > "logs/$p"; done
done
```

逐張睇相（Read 工具），每餐估：蛋白質（g）、大約熱量、有冇菜、甜飲。報告用表格：日期／餐／估計蛋白質／建議。目標每日蛋白質大約 1.6 g × 體重 kg。估算只係大概，要講明。

## Claude 要做嘅嘢
1. 讀 `logs/` 入面**最新**嗰個 JSON（如果有舊 log，同上一個比較趨勢）。次序：
   - `noteForClaude`：用戶想改咩（可能係空，空都要主動分析）
   - `insights`：App 自動觀察（停滯、太辛苦、成日跳過、班次去唔到 gym、痛症、瞓覺等）
   - `activityMix`、`exerciseCompletion`：近 28 日做得多／做得少、每個動作完成率
   - `adjustments`、`adjustLog`：用戶喺手機已經套用咗嘅自動調整（例如移除咗某個動作）→ 如果應該變成永久改動，就改 `config.js`，並提醒用戶喺手機「設定 → 目前嘅自動調整」還原
   - `weeklySummaries`、`workouts`、`activities`、`days[*].checkin`、`days[*].rec`（當日建議咗咩）
   - `profile.noGym`（未有 gym 會籍：gym 日改做屋企徒手肌力，`home` 訓練當 gym 計）、`days[*].restDay`（用戶揀咗嗰日唔做運動，唔當做「冇去」）
   - `days[*].health`（Apple Watch 經 iPhone 捷徑匯入：`rhr` 靜止心率、`hrv`、`sleep` 小時、`kcal`、`ex` 運動分鐘、`km`）：睇睡眠／心率同班次、訓練量嘅關係；`days[*].steps`、`sleepH` 有手錶數據時係自動填
   - `roster`（每日班次）、`shiftTimesEffective`（上落班時間）、`gfRoster`（女朋友班次，可選）、`plan7`（App 按班表排嘅未來 7 日，`together` = 兩個都得閒嘅時段）：比較「排咗 gym」同實際 `workouts`，睇邊種班次經常做唔到
2. 用繁體中文（香港口語）寫一份簡短報告：
   - 過去 2–4 週嘅 gym 次數、帶氧分鐘、步數、睡眠、飲水同體重趨勢
   - 每個動作有冇進步，有冇停滯（連續 3 次同一重量、同一次數）
   - 痛症報告、精神差嘅日子同班次之間有冇關係
3. 提出 1–3 個**細**改動，等用戶批准之後先改 code。
4. 改完：
   - 將 `sw.js` 嘅 `CACHE_VERSION` 加 1，同埋 `js/config.js` 嘅 `version` 加 1
   - 測試：`node --check js/app.js`，再用 headless Chrome（`--allow-file-access-from-files`）開 `index.html` 喺 375px 闊度影相檢查（內置瀏覽器 pane 開本機檔案只係靜態快照，唔會行 JS）
   - 用戶批准先 commit / push 去 GitHub Pages

## 改邊度
- 目標、規則數字 → `js/config.js` 嘅 `targets`、`rules`
- 動作、組數、次數、替代動作 → `js/config.js` 嘅 `exercises`、`workouts`
- 班次提示、飲食建議、通勤建議 → `js/config.js`
- 用戶嘅 gym：chocoZAP 太和（有鋼索滑輪機、可調凳、啞鈴；冇下拉專用機同坐姿划船機，所以 row／latPulldown 用鋼索做）。「點揀重量」教學 → `js/config.js` 嘅 `weightGuide`
- 動作教學（中文步驟、常見錯誤、示範圖）→ `js/library.js`；新動作要加相就由 free-exercise-db 下載、縮到 480px 闊放入 `img/ex/<key>-0.jpg`／`-1.jpg`，再加入 `sw.js` 預先快取清單
- 推薦邏輯 → `js/app.js` 嘅 `recommend()`
- gym 日熱身、帶氧收尾（燃脂）、屋企核心提示 → `js/config.js` 嘅 `gymExtras`；組數按時間／精神加減 → `setsFor()`；帶氧強度揀法 → `gymCardio()`。gym 只做器械，平板支撐／捲腹留返屋企
- 班表排程（邊日 gym、通勤、恢復）→ `js/app.js` 嘅 `planDays()`、`gymScore()`、`commuteFeasible()`；預設上落班時間 → `js/config.js` 嘅 `shiftDefaults`
- 女朋友一齊郁（佢嘅班次時間、得閒時段計法、活動建議）→ `js/config.js` 嘅 `gfShifts`、`together`；邏輯 → `togetherWindow()`
- 通勤（行／踩分鐘、地圖起點）→ `js/config.js` 嘅 `commute`；判斷邏輯 → `commuteAdvice()`
- 加重邏輯 → `js/app.js` 嘅 `progression()`
- 兩個人互睇（👫 對方分頁）→ `vPartner()`、`fetchPartner()`；對方班表自動讀取 → `partnerShift()`；一齊做 = workout／activity 嘅 `together: true`
- 休息後重排：`planDays()` 用 `gymGoal()`（週一嗰日 `days[週一].noMakeup` = 揀咗「唔使補」→ 本週 gym 目標降到 `gymMin`），本週帶氧按仲差分鐘分落帶氧日（`p.min`）；提示卡 → `replanBox()`
- 踩返屋企 + 精簡 gym：workout `mode: 'commute'`（頭 4 個動作、冇熱身同 gym 帶氧，踩單車記做 `commute: true` 嘅 cycle activity）；掣 → `commuteGymBtn()`，訓練畫面卡 → `bikeCard()`
- 活動速度／卡路里：`actEstimate()`（MET × 最近體重 × 鐘數；activity 存 `kmh`、`kcal`，只係估算）；`weeklySummaries` 有 `actKcal`
- 今日邊度酸（2D 前面／背面人體圖）→ `days[*].sore = { r: { 部位: 1 有啲酸／2 好酸 }, at }`；部位同動作對照 → `js/config.js` 嘅 `sore`（`regions`、`map`、`actMap`、`hints`）；分析 → `soreAnalysis()`。分析 log 時：酸喺練過嘅肌肉 = 正常；冇練都酸（尤其下背、上背、前臂）= 可能借錯力，對返嗰幾日做咗咩動作
- gym 帶氧／熱身可揀機 → `gymExtras.cardioChoices`、`warmupChoices`；換同部位動作 → `swapOptions()`（按 `library.js` 嘅 `group`）

## 唔可以改嘅原則（來自原本 brief）
- 新手、以「持續」為主要成功指標，唔係減重或者健美
- 唔好建議大熱量赤字（體重本身正常）
- 唔好預設跑步做帶氧（佢唔鍾意熱同濕）；唔好建議游水（唔識游）
- 頭 4 週唔做保加利亞分腿蹲、唔做高 RPE 或者力竭
- 夜更後只做輕鬆行路同伸展
- 有痛就停相關動作，建議替代，痛持續要建議睇醫生或物理治療師
- 用字只鼓勵，唔講「失敗」，漏咗一日唔會清零 streak

## 私隱
- `logs/` 已經寫入 `.gitignore`，**唔好上載去 GitHub**
- 相片只存喺手機（IndexedDB），唔會匯出
