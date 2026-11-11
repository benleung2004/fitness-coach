# 健身教練：交俾 Claude Code 調整嘅指引

用戶喺手機用「設定 → 匯出俾 Claude」，將 `fitness-log-YYYY-MM-DD.json` 放入 `logs/`，然後叫 Claude「睇最新 log 幫我調整」。

## 攞最新資料
手機開咗同步之後，最新資料喺**私人** repo `benleung2004/fitness-data` 嘅 `data/fitness.json`（格式同匯出 JSON 一樣）。用呢個指令攞落 `logs/`，唔使用戶 AirDrop：

```bash
gh api repos/benleung2004/fitness-data/contents/data/fitness.json -H "Accept: application/vnd.github.raw" > logs/fitness-log-$(date +%F).json
```

如果失敗（例如未開同步），就叫用戶用手機「匯出俾 Claude」再放入 `logs/`。**唔好改 `fitness-data` 入面嘅資料**，嗰度只係俾手機寫。

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
- 班表排程（邊日 gym、通勤、恢復）→ `js/app.js` 嘅 `planDays()`、`gymScore()`、`commuteFeasible()`；預設上落班時間 → `js/config.js` 嘅 `shiftDefaults`
- 女朋友一齊郁（佢嘅班次時間、得閒時段計法、活動建議）→ `js/config.js` 嘅 `gfShifts`、`together`；邏輯 → `togetherWindow()`
- 通勤（行／踩分鐘、地圖起點）→ `js/config.js` 嘅 `commute`；判斷邏輯 → `commuteAdvice()`
- 加重邏輯 → `js/app.js` 嘅 `progression()`

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
