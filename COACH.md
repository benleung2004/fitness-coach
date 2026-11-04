# 健身教練：交俾 Claude Code 調整嘅指引

用戶喺手機用「設定 → 匯出俾 Claude」，將 `fitness-log-YYYY-MM-DD.json` 放入 `logs/`，然後叫 Claude「睇最新 log 幫我調整」。

## Claude 要做嘅嘢
1. 讀 `logs/` 入面**最新**嗰個 JSON（如果有舊 log，同上一個比較趨勢）。次序：
   - `noteForClaude`：用戶想改咩（可能係空，空都要主動分析）
   - `insights`：App 自動觀察（停滯、太辛苦、成日跳過、班次去唔到 gym、痛症、瞓覺等）
   - `activityMix`、`exerciseCompletion`：近 28 日做得多／做得少、每個動作完成率
   - `adjustments`、`adjustLog`：用戶喺手機已經套用咗嘅自動調整（例如移除咗某個動作）→ 如果應該變成永久改動，就改 `config.js`，並提醒用戶喺手機「設定 → 目前嘅自動調整」還原
   - `weeklySummaries`、`workouts`、`activities`、`days[*].checkin`、`days[*].rec`（當日建議咗咩）
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
- 推薦邏輯 → `js/app.js` 嘅 `recommend()`
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
