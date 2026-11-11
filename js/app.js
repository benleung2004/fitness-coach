/* 健身教練 v1 —— 所有資料只存喺呢部機（localStorage + IndexedDB 相片） */
(function () {
'use strict';
const C = window.CONFIG;
const KEY = 'fc_v1';
const GYM_TYPES = ['gymA', 'gymB', 'd1', 'd2', 'd3'];

// ---------- 小工具 ----------
const pad = n => String(n).padStart(2, '0');
const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => ds(new Date());
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ds(d); };
const diffDays = (a, b) => Math.round((pd(b) - pd(a)) / 864e5); // b - a
const weekStart = s => { const d = pd(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return ds(d); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const sum = a => a.reduce((x, y) => x + y, 0);
const avg = a => a.length ? sum(a) / a.length : null;
const r1 = n => Math.round(n * 10) / 10;
const $ = sel => document.querySelector(sel);
const WD = ['日', '一', '二', '三', '四', '五', '六'];
const fmtDate = s => { const d = pd(s); return `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`; };
const shortDate = s => { const d = pd(s); return `${d.getMonth() + 1}/${d.getDate()}`; };

const ACT_KINDS = { walk: '行路', cycle: '踩單車', run: '跑步', hike: '行山', badminton: '羽毛球', recovery: '恢復／伸展', other: '其他' };
const INTENSITY = { light: '輕鬆', moderate: '中等（微喘仲講到嘢）', vigorous: '劇烈（講唔到成句）' };
const PAIN = { none: '冇', knee: '膝頭', back: '腰背', shoulder: '膊頭', wrist: '手腕' };

// ---------- 資料 ----------
function blank() {
  return { profile: { onboarded: false, nickname: '', heightCm: '', startDate: today(), gfMode: false, phaseOverride: 'auto' },
           days: {}, workouts: [], activities: [], body: [], achieved: {}, active: null, reviewSeen: '', noteForClaude: '', noteUpd: 0,
           weather: null, deleted: {}, lastBackup: '', roster: {}, gfRoster: {}, shiftTimes: null };
}
let S;
try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = blank(); }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('儲存失敗：手機空間可能唔夠'); } }
function save() { persist(); scheduleSync(); }

// ---------- 合併（同步同匯入共用）：唔會覆蓋，以較新嗰份為準 ----------
function mergeData(R) {
  if (!R || typeof R !== 'object') return false;
  const before = JSON.stringify([S.profile, S.days, S.workouts, S.activities, S.body, S.achieved, S.adjust, S.adjustLog, S.insightSeen, S.noteForClaude, S.deleted, S.reviewSeen, S.lastBackup, S.roster, S.gfRoster, S.shiftTimes]);
  const dead = Object.assign({}, R.deleted || {}, S.deleted || {});
  S.deleted = dead;
  const stamp = x => x.upd || x.at || 0;
  const byId = (a, b) => {
    const m = new Map();
    [...(a || []), ...(b || [])].forEach(x => { if (!x || !x.id) return; const o = m.get(x.id); if (!o || stamp(x) > stamp(o)) m.set(x.id, x); });
    return [...m.values()].filter(x => !dead[x.id]);
  };
  S.workouts = byId(S.workouts, R.workouts);
  S.activities = byId(S.activities, R.activities);
  S.body = byId(S.body, R.body);
  Object.entries(R.days || {}).forEach(([d, r]) => {
    const l = S.days[d];
    if (!l) { S.days[d] = r; return; }
    const useR = r.checkin && (!l.checkin || (r.checkin.at || 0) > (l.checkin.at || 0));
    const check = {};
    new Set([...Object.keys(l.check || {}), ...Object.keys(r.check || {})]).forEach(k => { check[k] = !!((l.check || {})[k] || (r.check || {})[k]); });
    const maxN = (a, b) => (a == null ? b : b == null ? a : Math.max(a, b));
    S.days[d] = { check, waterMl: Math.max(l.waterMl || 0, r.waterMl || 0), protein: Math.max(l.protein || 0, r.protein || 0),
      steps: maxN(l.steps, r.steps), sleepH: l.sleepH ?? r.sleepH ?? null,
      checkin: useR ? r.checkin : l.checkin, rec: useR ? r.rec : (l.rec ?? r.rec) };
    const restR = (r.restUpd || 0) > (l.restUpd || 0) ? r : l;
    if (restR.restUpd) { S.days[d].restDay = !!restR.restDay; S.days[d].restUpd = restR.restUpd; }
  });
  if (R.profile && ((!S.profile.onboarded && R.profile.onboarded) || (R.profile.upd || 0) > (S.profile.upd || 0))) S.profile = R.profile;
  Object.entries(R.achieved || {}).forEach(([k, v]) => { if (!S.achieved[k] || v < S.achieved[k]) S.achieved[k] = v; });
  if (R.adjustments && (R.adjustments.upd || 0) > ((S.adjust || {}).upd || 0)) S.adjust = R.adjustments;
  const logs = new Map([...(S.adjustLog || []), ...(R.adjustLog || [])].map(x => [x.date + x.id, x]));
  S.adjustLog = [...logs.values()].sort((a, b) => a.date.localeCompare(b.date));
  S.insightSeen = Object.assign({}, R.dismissedInsights || {}, S.insightSeen || {});
  Object.entries(R.dismissedInsights || {}).forEach(([k, v]) => { if (v > S.insightSeen[k]) S.insightSeen[k] = v; });
  if ((R.noteUpd || 0) > (S.noteUpd || 0)) { S.noteForClaude = R.noteForClaude || ''; S.noteUpd = R.noteUpd; }
  if ((R.reviewSeen || '') > (S.reviewSeen || '')) S.reviewSeen = R.reviewSeen;
  if ((R.lastBackup || '') > (S.lastBackup || '')) S.lastBackup = R.lastBackup;
  ['roster', 'gfRoster'].forEach(key => {
    S[key] = S[key] || {};
    Object.entries(R[key] || {}).forEach(([d, r]) => { const l = S[key][d]; if (r && (!l || (r.upd || 0) > (l.upd || 0))) S[key][d] = r; });
  });
  if (R.shiftTimes && R.shiftTimes.t && (R.shiftTimes.upd || 0) > ((S.shiftTimes || {}).upd || 0)) S.shiftTimes = { t: R.shiftTimes.t, upd: R.shiftTimes.upd };
  return before !== JSON.stringify([S.profile, S.days, S.workouts, S.activities, S.body, S.achieved, S.adjust, S.adjustLog, S.insightSeen, S.noteForClaude, S.deleted, S.reviewSeen, S.lastBackup, S.roster, S.gfRoster, S.shiftTimes]);
}

// ---------- GitHub 私人 repo 同步（token 只存喺呢部機，唔會匯出） ----------
const SYNC_KEY = 'fc_sync', SYNC_PATH = 'data/fitness.json';
let SY;
try { SY = JSON.parse(localStorage.getItem(SYNC_KEY) || '{}'); } catch (e) { SY = {}; }
const saveSY = () => { try { localStorage.setItem(SYNC_KEY, JSON.stringify(SY)); } catch (e) {} };
const DEVICE = (() => { let d = null; try { d = localStorage.getItem('fc_device'); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem('fc_device', d); } } catch (e) {} return d || 'unknown'; })();
let syncTimer = null, syncing = false, syncAgain = false;
const syncReady = () => !!(SY.repo && SY.token);
function scheduleSync() { if (!syncReady()) return; clearTimeout(syncTimer); syncTimer = setTimeout(() => syncNow(false), 4000); }
const b64enc = s => { const b = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(bin); };
const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
function ghFetch(opts = {}) {
  return fetch(`https://api.github.com/repos/${SY.repo}/contents/${SYNC_PATH}`, Object.assign({ cache: 'no-store' }, opts, {
    headers: Object.assign({ Authorization: `Bearer ${SY.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, opts.headers || {})
  }));
}
async function pullRemote() {
  const r = await ghFetch();
  if (r.status === 404) return { data: null, sha: null };
  if (r.status === 401 || r.status === 403) throw new Error('auth');
  if (!r.ok) throw new Error('GitHub 回應 ' + r.status);
  const j = await r.json();
  let text = j.content ? b64dec(j.content) : await (await ghFetch({ headers: { Accept: 'application/vnd.github.raw' } })).text();
  return { data: JSON.parse(text), sha: j.sha };
}
const coreOf = d => { const c = Object.assign({}, d); delete c.sync; delete c.exportedAt; return JSON.stringify(c); };
async function syncNow(manual) {
  if (!syncReady()) return;
  if (!navigator.onLine) { if (manual) toast('而家離線，有網會自動同步'); return; }
  if (syncing) { syncAgain = true; return; }
  syncing = true; clearTimeout(syncTimer);
  try {
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      const remote = await pullRemote();
      if (remote.data && mergeData(remote.data)) { persist(); render(); }
      const local = exportData();
      if (remote.data && coreOf(remote.data) === coreOf(local)) { ok = true; break; }
      const payload = Object.assign(local, { sync: { device: DEVICE, name: SY.name || '', at: new Date().toISOString() } });
      const body = { message: `sync ${today()} ${SY.name || DEVICE}`, content: b64enc(JSON.stringify(payload, null, 1)) };
      if (remote.sha) body.sha = remote.sha;
      const r = await ghFetch({ method: 'PUT', body: JSON.stringify(body) });
      if (r.status === 409 || r.status === 422) continue; // 另一部機啱啱改咗：再拉一次再合併
      if (r.status === 401 || r.status === 403) throw new Error('auth');
      if (!r.ok) throw new Error('GitHub 回應 ' + r.status);
      ok = true;
    }
    if (!ok) throw new Error('多部機同時同步，稍後再試');
    SY.lastSync = Date.now(); SY.lastError = ''; saveSY();
    if (manual) toast('☁️ 同步完成');
  } catch (e) {
    SY.lastError = e.message === 'auth' ? 'Token 無效、過期，或者冇呢個 repo 嘅權限' : (e.message === 'Failed to fetch' ? '連唔到 GitHub' : e.message);
    saveSY();
    if (manual) toast('同步失敗：' + SY.lastError);
    else render();
  } finally {
    syncing = false;
    const st = document.getElementById('syncStatus'); if (st) st.textContent = syncStatusText();
    if (syncAgain) { syncAgain = false; scheduleSync(); }
  }
}
function syncStatusText() {
  if (!syncReady()) return '未連接：資料只存喺呢部機。';
  if (SY.lastError) return '⚠️ ' + SY.lastError;
  if (SY.lastSync) { const d = new Date(SY.lastSync); return `✅ 上次同步：${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  return '已連接，未同步。';
}
function day(d = today()) {
  if (!S.days[d]) S.days[d] = { check: {}, waterMl: 0, steps: null, sleepH: null, protein: 0 };
  return S.days[d];
}

let UI = { tab: 'today', editCheckin: false, strengthEx: 'legPress' };

// ---------- 計算 ----------
const gymWorkouts = () => S.workouts.filter(w => GYM_TYPES.includes(w.type)).sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at);
const lastGym = () => { const g = gymWorkouts(); return g[g.length - 1] || null; };
// 未有 gym 會籍：屋企徒手肌力當做 gym 日計
const noGym = () => !!S.profile.noGym;
const strengthWorkouts = () => S.workouts.filter(w => GYM_TYPES.includes(w.type) || (noGym() && w.type === 'home')).sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at);
function phase() {
  if (S.profile.phaseOverride === '1') return 1;
  if (S.profile.phaseOverride === '2') return 2;
  const weeks = Math.floor(diffDays(S.profile.startDate, today()) / 7);
  return (weeks >= C.rules.phase2MinWeeks && gymWorkouts().length >= C.rules.phase2MinGymSessions) ? 2 : 1;
}
const weekNo = () => Math.max(1, Math.floor(diffDays(S.profile.startDate, today()) / 7) + 1);
function nextTemplate() {
  const rot = C.phases[phase()].rotation;
  const last = lastGym();
  if (!last || !rot.includes(last.type)) return rot[0];
  return rot[(rot.indexOf(last.type) + 1) % rot.length];
}
function cardioCredit(a) {
  if (a.intensity === 'vigorous') return a.minutes * 2;
  if (a.intensity === 'moderate') return a.minutes;
  return 0;
}
function hasLog(d) {
  const x = S.days[d];
  const dayHas = x && (x.checkin || x.restDay || Object.values(x.check || {}).some(Boolean) || x.waterMl || x.steps || x.sleepH);
  return !!(dayHas || S.workouts.some(w => w.date === d) || S.activities.some(a => a.date === d) || S.body.some(b => b.date === d));
}
function weekStats(ws) {
  const we = addDays(ws, 6);
  const inW = d => d >= ws && d <= we;
  const dates = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const acts = S.activities.filter(a => inW(a.date));
  const daysIn = dates.map(d => S.days[d]).filter(Boolean);
  const steps = daysIn.map(x => x.steps).filter(v => v != null);
  const sleep = daysIn.map(x => x.sleepH).filter(v => v != null);
  const water = daysIn.map(x => x.waterMl).filter(v => v > 0);
  const weights = S.body.filter(b => inW(b.date) && b.weight != null).map(b => b.weight);
  return {
    weekStart: ws,
    gym: S.workouts.filter(w => inW(w.date) && (GYM_TYPES.includes(w.type) || (noGym() && w.type === 'home'))).length,
    home: S.workouts.filter(w => inW(w.date) && w.type === 'home').length,
    cardio: sum(acts.map(cardioCredit)),
    light: sum(acts.filter(a => a.intensity === 'light').map(a => a.minutes)),
    logDays: dates.filter(hasLog).length,
    avgSteps: steps.length ? Math.round(avg(steps)) : null,
    avgSleep: sleep.length ? r1(avg(sleep)) : null,
    avgWaterL: water.length ? r1(avg(water) / 1000) : null,
    avgWeight: weights.length ? r1(avg(weights)) : null
  };
}
function weeklySummaries(n = 12) {
  const out = [];
  let ws = weekStart(today());
  for (let i = 0; i < n; i++) { out.unshift(weekStats(ws)); ws = addDays(ws, -7); }
  for (let i = 1; i < out.length; i++) {
    if (out[i].avgWeight != null && out[i - 1].avgWeight != null) out[i].weightChange = r1(out[i].avgWeight - out[i - 1].avgWeight);
  }
  out.forEach(w => {
    w.adherence = Math.round(100 * (Math.min(w.gym / C.targets.gymMin, 1) * 0.5 + Math.min(w.cardio / C.targets.cardioMinutes, 1) * 0.3 + Math.min(w.logDays / C.targets.logDaysPerWeek, 1) * 0.2));
    w.focus = weekFocus(w);
  });
  return out;
}
function weekFocus(w) {
  if (w.gym < C.targets.gymMin) return `下週先做到 ${C.targets.gymMin} 次 gym：喺班表上揀兩日，當係約咗自己。`;
  if (w.cardio < C.targets.cardioMinutes) return '加 1–2 次 30 分鐘快行或者行／踩返屋企，帶氧就夠。';
  if (w.avgSleep != null && w.avgSleep < C.targets.sleepHours) return '瞓覺係下一步：輪班日盡量固定瞓覺時間，瞓前 1 小時少睇手機。';
  if (w.avgWaterL != null && w.avgWaterL < C.targets.waterMl / 1000) return '飲水少咗：返工帶一支 1L 水樽，飲兩支就達標。';
  if (w.gym < C.targets.gymIdeal) return '做得好！得閒可以試加第 3 次 gym。';
  return '好穩定！保持呢個節奏就得。';
}
// ---------- 教練觀察：自動追蹤紀錄，判斷要唔要調整 ----------
function adj() {
  S.adjust = Object.assign({ skip: {}, deload: {}, shortDefault: false, shiftPref: {} }, S.adjust || {});
  return S.adjust;
}
function repsFor(key) {
  for (const w of Object.values(C.workouts)) { const s = w.exercises.find(x => x.key === key); if (s) return s.reps; }
  return [8, 12];
}
function activityMix(days = 28) {
  const since = addDays(today(), -days);
  const m = {};
  S.activities.filter(a => a.date > since).forEach(a => { m[a.kind] = m[a.kind] || { kind: a.kind, label: ACT_KINDS[a.kind] || a.kind, times: 0, minutes: 0 }; m[a.kind].times++; m[a.kind].minutes += a.minutes; });
  const gym = S.workouts.filter(w => w.date > since && GYM_TYPES.includes(w.type)).length;
  const home = S.workouts.filter(w => w.date > since && w.type === 'home').length;
  if (gym) m.gym = { kind: 'gym', label: 'Gym', times: gym, minutes: sum(S.workouts.filter(w => w.date > since && GYM_TYPES.includes(w.type)).map(w => w.minutes || 45)) };
  if (home) m.home = { kind: 'home', label: '屋企循環', times: home, minutes: home * C.homeCircuit.minutes };
  const list = Object.values(m).sort((a, b) => b.minutes - a.minutes);
  const planned = ['gym', 'walk', 'cycle'];
  const missing = planned.filter(k => !m[k]).map(k => ({ gym: 'Gym', walk: '行路', cycle: '踩單車' }[k]));
  return { days, list, missing };
}
function exerciseCompletion() {
  const sessions = gymWorkouts().filter(w => !w.quick && (w.exercises || []).some(e => e.sets.some(s => s.done)));
  const out = {};
  sessions.forEach(w => w.exercises.forEach(e => {
    const o = out[e.key] = out[e.key] || { key: e.key, name: C.exercises[e.key] ? C.exercises[e.key].name : e.key, planned: 0, done: 0, history: [] };
    o.planned++;
    const d = e.sets.filter(s => s.done);
    if (d.length) o.done++;
    if (!e.altUsed) o.history.push({ date: w.date, sets: d });
  }));
  return Object.values(out);
}
function insights() {
  const t = today(), A = adj(), items = [];
  const add = it => {
    const seen = (S.insightSeen || {})[it.id];
    if (seen && diffDays(seen, t) < 14) return;
    items.push(it);
  };
  // 1. 每個動作：成日跳過／停滯／太辛苦／太輕鬆
  exerciseCompletion().forEach(o => {
    const ex = C.exercises[o.key]; if (!ex) return;
    const recent = o.history.slice(-3);
    const skipped = recent.filter(h => !h.sets.length).length;
    if (recent.length >= 3 && skipped >= 2 && !A.skip[o.key]) {
      add({ id: 'skip:' + o.key, level: 'adjust', title: `你成日跳過「${ex.name}」`, detail: `最近 3 次有 ${skipped} 次冇做。可以暫時由計劃移除，或者匯出叫 Claude 幫你換一個鍾意嘅動作。`, action: { type: 'skip', key: o.key }, actionLabel: '暫時移除' });
    }
    const done = o.history.filter(h => h.sets.length);
    if (ex.unit !== 'kg' || !done.length) return;
    const top = h => Math.max(...h.sets.map(s => s.w || 0));
    const repsSum = h => sum(h.sets.map(s => s.r || 0));
    const maxRpe = h => Math.max(0, ...h.sets.map(s => s.rpe || 0));
    const [, hi] = repsFor(o.key);
    const last2 = done.slice(-2), last3 = done.slice(-3), last = done[done.length - 1];
    if (A.deload[o.key]) return;
    if (last2.length === 2 && last2.every(h => maxRpe(h) >= 9)) {
      const w = top(last);
      add({ id: 'hard:' + o.key, level: 'adjust', title: `「${ex.name}」連續 2 次好辛苦（RPE 9+）`, detail: `新手唔使咁辛苦。建議下次減 10%（約 ${roundTo(w * 0.9, ex.inc)}kg），做好姿勢再慢慢加返。`, action: { type: 'deload', key: o.key }, actionLabel: '下次減 10%' });
    } else if (last3.length === 3 && top(last3[0]) > 0 && last3.every(h => top(h) === top(last3[0])) && repsSum(last3[2]) <= repsSum(last3[0])) {
      const w = top(last);
      add({ id: 'stall:' + o.key, level: 'adjust', title: `「${ex.name}」連續 3 次冇進步`, detail: `一直停喺 ${w}kg。建議下次減 10%（約 ${roundTo(w * 0.9, ex.inc)}kg）做多啲下，再重新加上去；亦檢查吓瞓覺同蛋白質夠唔夠。`, action: { type: 'deload', key: o.key }, actionLabel: '下次減 10%' });
    } else if (last.sets.every(s => (s.r || 0) >= hi) && maxRpe(last) > 0 && maxRpe(last) <= 6 && top(last) > 0) {
      add({ id: 'easy:' + o.key, level: 'info', title: `「${ex.name}」上次好輕鬆（RPE ≤ 6）`, detail: '下次可以一次加多啲（大約 10%），加完 RPE 應該喺 7 左右。' });
    }
  });
  // 2. 每週 gym 次數
  const ws = weekStart(t);
  const past = [1, 2, 3].map(i => weekStats(addDays(ws, -7 * i)));
  const startedWeeks = past.filter(w => w.weekStart >= weekStart(S.profile.startDate));
  if (startedWeeks.length === 3 && startedWeeks.every(w => w.gym < C.targets.gymMin) && !A.shortDefault) {
    add({ id: 'shortDefault', level: 'adjust', title: '過去 3 週 gym 都未夠 2 次', detail: '唔緊要，代表計劃要遷就你。建議將 gym 預設改做 30 分鐘精簡版（頭 4 個動作），易啲出門口。', action: { type: 'shortDefault' }, actionLabel: '改用精簡版' });
  }
  if (startedWeeks.length === 3 && startedWeeks.every(w => w.gym >= C.targets.gymMin)) {
    add({ id: 'goodStreak', level: 'good', title: '連續 3 週 gym 達標 👏', detail: phase() === 1 ? '你已經建立緊習慣。可以試吓每週加第 3 次。' : '保持！可以匯出叫 Claude 幫你計劃下一個階段。' });
  }
  // 3. 帶氧、步數、瞓覺
  if (startedWeeks.length >= 2 && startedWeeks.slice(0, 2).every(w => w.cardio < C.targets.cardioMinutes / 2)) {
    add({ id: 'cardioLow', level: 'info', title: '帶氧連續 2 週唔夠一半', detail: '最易嘅方法：放工行一段返屋企（20 分鐘），或者用單車代步。每次 10 分鐘都計。' });
  }
  const recentDays = Object.entries(S.days).filter(([d]) => d > addDays(t, -14) && d <= t);
  const steps = recentDays.map(([, v]) => v.steps).filter(v => v != null);
  if (steps.length >= 4 && avg(steps) < C.targets.stepsLow) {
    add({ id: 'stepsLow', level: 'info', title: `近 2 週平均步數 ${Math.round(avg(steps))}`, detail: `目標 ${C.targets.stepsLow}+。返工坐得多，每個鐘起身行 2 分鐘，或者落早一個站行返屋企。` });
  }
  const sleepByShift = {};
  Object.entries(S.days).filter(([d]) => d > addDays(t, -28)).forEach(([, v]) => {
    if (v.checkin && v.sleepH != null) (sleepByShift[v.checkin.shift] = sleepByShift[v.checkin.shift] || []).push(v.sleepH);
  });
  Object.entries(sleepByShift).forEach(([sh, arr]) => {
    if (arr.length >= 2 && avg(arr) < 6.5) add({ id: 'sleep:' + sh, level: 'info', title: `${C.shifts[sh] ? C.shifts[sh].name : sh}日平均淨係瞓 ${r1(avg(arr))} 小時`, detail: '瞓唔夠會影響增肌同食慾。呢啲日子優先瞓覺，運動做恢復模式就夠。' });
  });
  // 4. 痛症重複出現
  const pains = {};
  recentDays.forEach(([, v]) => { if (v.checkin && v.checkin.pain && v.checkin.pain !== 'none') pains[v.checkin.pain] = (pains[v.checkin.pain] || 0) + 1; });
  Object.entries(pains).forEach(([p, n]) => {
    if (n >= 3) add({ id: 'pain:' + p, level: 'warn', title: `近 2 週有 ${n} 日報${PAIN[p]}痛`, detail: '持續痛唔正常，建議睇醫生或者物理治療師。App 會繼續自動避開相關動作。' });
  });
  // 5. 邊個班次成日去唔到 gym
  const byShift = {};
  Object.entries(S.days).filter(([d]) => d > addDays(t, -28) && d < t).forEach(([d, v]) => {
    if (v.rec !== 'gym' || !v.checkin) return;
    const sh = v.checkin.shift;
    const b = byShift[sh] = byShift[sh] || { rec: 0, miss: 0 };
    b.rec++;
    if (!S.workouts.some(w => w.date === d && GYM_TYPES.includes(w.type))) b.miss++;
  });
  Object.entries(byShift).forEach(([sh, b]) => {
    if (b.miss >= 3 && b.miss / b.rec >= 0.6 && A.shiftPref[sh] !== 'cardio') {
      const name = C.shifts[sh] ? C.shifts[sh].name : sh;
      add({ id: 'shift:' + sh, level: 'adjust', title: `${name}日建議 gym，${b.rec} 次有 ${b.miss} 次冇去`, detail: `可能${name}真係唔方便。建議以後${name}日預設改做帶氧（行／踩返屋企），gym 留俾其他日子。`, action: { type: 'shiftPref', shift: sh }, actionLabel: `${name}改做帶氧` });
    }
  });
  // 6. 紀錄太少
  const logDays7 = Array.from({ length: 7 }, (_, i) => addDays(t, -i)).filter(hasLog).length;
  if (S.profile.onboarded && diffDays(S.profile.startDate, t) >= 7 && logDays7 < 2) {
    add({ id: 'logLow', level: 'info', title: '呢個禮拜得好少紀錄', detail: '唔使完美，每日開 App 撳一下清單就夠。紀錄越多，建議越準。' });
  }
  const order = { warn: 0, adjust: 1, info: 2, good: 3 };
  return items.sort((a, b) => order[a.level] - order[b.level]);
}
function applyInsight(id) {
  const it = insights().find(x => x.id === id);
  if (!it || !it.action) return;
  const A = adj(), a = it.action;
  if (a.type === 'skip') A.skip[a.key] = today();
  if (a.type === 'deload') A.deload[a.key] = today();
  if (a.type === 'shortDefault') A.shortDefault = today();
  if (a.type === 'shiftPref') A.shiftPref[a.shift] = 'cardio';
  A.upd = Date.now();
  (S.adjustLog = S.adjustLog || []).push({ date: today(), id, title: it.title, action: a });
  save();
}
function adjustList() {
  const A = adj(), out = [];
  Object.keys(A.skip).forEach(k => out.push({ k: 'skip:' + k, text: `已移除：${C.exercises[k] ? C.exercises[k].name : k}` }));
  Object.keys(A.deload).forEach(k => out.push({ k: 'deload:' + k, text: `下次減 10%：${C.exercises[k] ? C.exercises[k].name : k}` }));
  if (A.shortDefault) out.push({ k: 'shortDefault', text: 'Gym 預設用 30 分鐘精簡版' });
  Object.keys(A.shiftPref).forEach(s => out.push({ k: 'shift:' + s, text: `${C.shifts[s] ? C.shifts[s].name : s}日預設做帶氧` }));
  return out;
}
const LV = { warn: ['⚠️', 'warn'], adjust: ['🔧', 'warn'], info: ['💡', ''], good: ['🌟', 'ok'] };
function insightHtml(it) {
  return `<div class="list-item"><div class="grow"><div><span class="chip ${LV[it.level][1]}">${LV[it.level][0]}</span> <b>${esc(it.title)}</b></div>
    <div class="small muted">${esc(it.detail)}</div>
    <div class="row" style="margin-top:6px">${it.action ? `<button class="btn sm" data-act="applyInsight" data-id="${esc(it.id)}">${esc(it.actionLabel)}</button>` : ''}
    <button class="btn sm ghost" data-act="dismissInsight" data-id="${esc(it.id)}">${it.action ? '唔使' : '收到'}</button></div></div></div>`;
}

// 連續達標週數（未完嘅本週唔會令 streak 斷）
function weekStreak() {
  let ws = weekStart(today()), n = 0;
  if (weekStats(ws).gym >= C.targets.gymMin) n++;
  ws = addDays(ws, -7);
  while (weekStats(ws).gym >= C.targets.gymMin) { n++; ws = addDays(ws, -7); if (n > 520) break; }
  return n;
}
function waterTarget(d = today()) {
  const worked = S.workouts.some(w => w.date === d) || S.activities.some(a => a.date === d && a.minutes >= 30);
  return worked ? C.targets.waterMlWorkout : C.targets.waterMl;
}
function autoChecks(d = today()) {
  const x = day(d);
  const acts = S.activities.filter(a => a.date === d);
  return {
    water: x.waterMl >= waterTarget(d),
    protein: x.protein >= 2,
    steps: x.steps != null && x.steps >= C.targets.stepsLow,
    workout: S.workouts.some(w => w.date === d) || sum(acts.map(a => a.minutes)) >= 20,
    sleep: x.sleepH != null && x.sleepH >= C.targets.sleepHours
  };
}

// ---------- 動作處理（痛 → 替代） ----------
function resolveEx(slotKey, pain) {
  const ex = C.exercises[slotKey];
  if (!pain || pain === 'none' || !ex.avoid.includes(pain)) return { key: slotKey };
  const sub = ex.painSub[pain];
  if (sub && !C.exercises[sub].avoid.includes(pain)) return { key: sub, from: slotKey };
  return { key: null, from: slotKey };
}
function lastSetsFor(key) {
  for (let i = S.workouts.length - 1; i >= 0; i--) {
    const w = S.workouts[i];
    const it = (w.exercises || []).find(e => e.key === key && !e.altUsed && e.sets.some(s => s.done));
    if (it) return { date: w.date, sets: it.sets.filter(s => s.done) };
  }
  return null;
}
function roundTo(x, inc) { return Math.round(x / inc) * inc; }
function progression(key, reps) {
  const ex = C.exercises[key];
  const last = lastSetsFor(key);
  const [lo, hi] = reps;
  const unitWord = ex.unit === 'sec' ? '秒' : '下';
  if (!last) return { text: `第一次做：揀一個做到 ${hi}${unitWord} 仲有 3 下力嘅重量就啱。寧願輕啲，先學好動作。`, w: null };
  const rs = last.sets.map(s => num(s.r) || 0);
  const rpes = last.sets.map(s => num(s.rpe)).filter(v => v != null);
  const maxRpe = rpes.length ? Math.max(...rpes) : 7;
  const allTop = rs.every(r => r >= hi);
  const anyLow = rs.some(r => r < lo);
  if (ex.unit !== 'kg') {
    if (allTop && maxRpe <= 8) return { text: `上次全部做到 ${hi}${unitWord}：今次每組加 ${ex.inc}${unitWord}，或者放慢動作。`, w: null };
    return { text: `上次 ${rs.join(' / ')}${unitWord}：今次目標每組 ${hi}${unitWord}。`, w: null };
  }
  const w = Math.max(...last.sets.map(s => num(s.w) || 0));
  if (allTop && maxRpe <= 8) {
    const [p1, p2] = C.rules.progressWeightPct;
    let nw = roundTo(w * (1 + p2 / 100), ex.inc);
    if (nw > w * (1 + p2 / 100) + 0.01) nw -= ex.inc;
    if (nw < w * (1 + p1 / 100) - 0.01 || nw <= w) nw = w + ex.inc;
    return { text: `上次 ${w}kg 全部做足 ${hi} 下、RPE ≤ 8 👍 今次試 ${nw}kg，由 ${lo} 下開始再慢慢加。`, w: nw };
  }
  if (maxRpe >= 9.5 || anyLow) return { text: `上次 ${w}kg 幾辛苦（${rs.join('/')} 下，RPE ${maxRpe}）：今次保持 ${w}kg，專心做好姿勢。`, w };
  return { text: `上次 ${w}kg：${rs.join(' / ')} 下。今次保持 ${w}kg，每組試加 1–2 下（目標 ${hi} 下）。`, w };
}
function warmupText(key, w) {
  const ex = C.exercises[key];
  if (ex.unit !== 'kg' || ex.type !== 'compound') return '';
  if (!w || w < 15) return '熱身：用好輕重量做 1 組 × 10 下。';
  return `熱身：${roundTo(w * 0.5, ex.inc)}kg × 8 下 → ${roundTo(w * 0.7, ex.inc)}kg × 5 下（唔計入正式組）。`;
}
const restSecs = key => ({ compound: 105, isolation: 75 }[C.exercises[key].type] || 60);

// ---------- 天氣（香港天文台開放數據） ----------
async function loadWeather() {
  if (S.weather && Date.now() - S.weather.at < 30 * 60e3) return;
  try {
    const base = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?lang=tc&dataType=';
    const [now, warn] = await Promise.all([fetch(base + 'rhrread').then(r => r.json()), fetch(base + 'warnsum').then(r => r.json())]);
    const temps = (now.temperature && now.temperature.data) || [];
    const t = temps.find(x => x.place === '大埔') || temps.find(x => x.place === '香港天文台') || temps[0];
    const h = now.humidity && now.humidity.data && now.humidity.data[0];
    const warnings = Object.keys(warn || {}).map(k => ({ code: k, name: warn[k].name }));
    S.weather = { at: Date.now(), temp: t ? t.value : null, place: t ? t.place : '', hum: h ? h.value : null, warnings };
    persist(); render();
  } catch (e) { /* 冇網或者 API 失敗：照用冇天氣嘅建議 */ }
}
function weatherState() {
  const w = S.weather;
  if (!w || Date.now() - w.at > 6 * 3600e3) return { known: false, outdoorBad: false, runBad: false, text: '' };
  const bad = w.warnings.filter(x => ['WRAIN', 'WTS', 'WTCSGNL', 'WHOT'].includes(x.code));
  const hot = w.temp != null && w.temp >= C.rules.hotTempC;
  const humid = w.hum != null && w.temp != null && w.hum >= C.rules.humidHumidity && w.temp >= 27;
  return { known: true, outdoorBad: bad.length > 0 || hot, runBad: bad.length > 0 || hot || humid,
           text: `${w.place} ${w.temp ?? '–'}°C · 濕度 ${w.hum ?? '–'}%${w.warnings.length ? ' · ⚠️ ' + w.warnings.map(x => x.name).join('、') : ''}` };
}

// ---------- 日落（香港天文台開放數據，冇網就用每月約數） ----------
const SUN_APPROX = ['18:05', '18:25', '18:35', '18:45', '18:58', '19:08', '19:10', '18:55', '18:30', '18:05', '17:45', '17:42'];
let SUN = {};
try { SUN = JSON.parse(localStorage.getItem('fc_sun') || '{}'); } catch (e) { SUN = {}; }
const sunset = d => SUN[d] || SUN_APPROX[pd(d).getMonth()];
async function loadSun() {
  const d = today();
  if (SUN[d] && SUN[addDays(d, 6)]) return;
  try {
    for (const m of new Set([d, addDays(d, 6)].map(x => x.slice(0, 7)))) {
      const [y, mo] = m.split('-');
      const r = await fetch(`https://data.weather.gov.hk/weatherAPI/opendata/opendata.php?dataType=SRS&lang=en&rformat=json&year=${y}&month=${Number(mo)}`).then(x => x.json());
      (r.data || []).forEach(row => { if (/^\d\d:\d\d$/.test(row[3] || '')) SUN[row[0]] = row[3]; });
    }
    Object.keys(SUN).forEach(k => { if (k < addDays(d, -3)) delete SUN[k]; });
    try { localStorage.setItem('fc_sun', JSON.stringify(SUN)); } catch (e) {}
    render();
  } catch (e) { /* 用約數 */ }
}

// ---------- 班表 ----------
const ROSTER_SHIFTS = { early: '早', office: '辦', middle: '晚', night: '夜', rest: '休' };
const WORK_SHIFTS = ['early', 'office', 'middle'];
const toMin = t => { if (!t || !/^\d\d:\d\d$/.test(t)) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtMin = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
function shiftTimes() {
  const t = (S.shiftTimes && S.shiftTimes.t) || {};
  const out = {};
  Object.keys(C.shiftDefaults).forEach(k => { out[k] = Object.assign({}, C.shiftDefaults[k], t[k] || {}); });
  return out;
}
const rosterShift = d => (S.roster && S.roster[d] && S.roster[d].s) || null;
const hasRoster = () => Object.entries(S.roster || {}).some(([d, r]) => r && r.s && d >= today());
// 辦公時間星期五遲啲放工
function timesFor(sh, d) {
  const T = shiftTimes()[sh];
  if (!T) return null;
  return { start: T.start, end: (T.endFri && d && pd(d).getDay() === 5) ? T.endFri : T.end };
}
function shiftLabel(sh, d) {
  const T = timesFor(sh, d);
  return (C.shifts[sh] ? C.shifts[sh].name : sh) + (T ? ` ${T.start}–${T.end}` : '');
}
// 放工時間夠早（20:00 前）先建議成程行／踩返屋企
const commuteFeasible = (sh, d) => { const T = timesFor(sh, d); const e = T && toMin(T.end); return WORK_SHIFTS.includes(sh) && e != null && e <= 1200 && e >= 360; };
function gymScore(sh) {
  if (!sh || adj().shiftPref[sh] === 'cardio') return 0;
  if (sh === 'rest') return 1;
  if (sh === 'early') return 2;
  if (sh === 'office') return 2.5;
  if (sh === 'middle') { const T = shiftTimes().middle; const st = toMin(T.start), e = toMin(T.end); return (st != null && st >= 660) || (e != null && e <= 1200) ? 3 : 0; }
  return 0;
}
// 未來 n 日計劃：每週排夠理想 gym 次數、唔連續兩日，其餘按班次排通勤／帶氧／恢復
function planDays(start, n = 7, todayShift) {
  const gyms = strengthWorkouts();
  const gymDates = new Set(gyms.map(w => w.date));
  const days = [];
  for (let i = 0; i < n; i++) { const d = addDays(start, i); days.push({ date: d, shift: (i === 0 && todayShift) || rosterShift(d), kind: null }); }
  const picked = new Set();
  const near = d => [addDays(d, -1), d, addDays(d, 1)].some(x => gymDates.has(x) || picked.has(x));
  [...new Set(days.map(p => weekStart(p.date)))].forEach(wk => {
    let need = C.targets.gymIdeal - gyms.filter(w => weekStart(w.date) === wk).length;
    days.filter(p => weekStart(p.date) === wk && gymScore(p.shift) && !(S.days[p.date] || {}).restDay)
      .sort((a, b) => gymScore(a.shift) - gymScore(b.shift) || a.date.localeCompare(b.date))
      .forEach(p => { if (need > 0 && !near(p.date)) { picked.add(p.date); need--; } });
  });
  days.forEach(p => {
    if (gymDates.has(p.date)) p.kind = 'done';
    else if ((S.days[p.date] || {}).restDay) p.kind = 'restday';
    else if (picked.has(p.date)) p.kind = 'gym';
    else if (!p.shift) p.kind = null;
    else if (p.shift === 'night') p.kind = 'recovery';
    else if (commuteFeasible(p.shift, p.date)) p.kind = 'commute';
    else p.kind = 'cardio';
  });
  return days;
}
const PLAN_ICON = { gym: '🏋️', commute: '🚶', cardio: '🚲', recovery: '🌙', done: '✅', restday: '😌' };
function planText(p) {
  const T = timesFor(p.shift, p.date) || {};
  const st = toMin(T.start), e = toMin(T.end);
  if (p.kind === 'restday') return '唔做運動，休息一日（行路、通勤照計）';
  if (p.kind === 'done') return noGym() ? '已經做咗肌力訓練' : '已經做咗 gym';
  if (p.kind === 'gym' && noGym()) {
    const when = p.shift === 'rest' ? '任何時間' : p.shift === 'middle' && st != null && st >= 660 ? `返工前 ${fmtMin(st - 120)}` : `放工返到屋企 ${e != null ? fmtMin(e + 60) : ''}`;
    return `屋企徒手肌力 3 輪（未有 gym 暫代）：${when}`;
  }
  if (p.kind === 'gym') {
    if (p.shift === 'rest') return rosterShift(addDays(p.date, -1)) === 'night' ? 'Gym：夜更後先瞓夠，下晝 3 點後先去' : 'Gym：上晝 10–12 點（人少）';
    if (p.shift === 'middle' && st != null && st >= 660) return `Gym：返工前 ${fmtMin(st - 150)} 開始（做大約 75 分鐘）`;
    return `Gym：放工後 ${e != null ? fmtMin(e + 45) : ''} 左右`;
  }
  if (p.kind === 'commute') {
    const arrive = e + C.commute.minutes.walk;
    const dark = arrive > toMin(sunset(p.date)) + 20;
    return `${fmtMin(e)} 放工行／踩返屋企${dark ? `（日落 ${sunset(p.date)}，後半程會黑，帶燈）` : '（天黑前到）'}`;
  }
  if (p.kind === 'cardio') return p.shift === 'rest' ? '快行／踩單車 30–45 分鐘' : '返工前快行／踩單車 30 分鐘（收工太夜唔行返屋企）';
  if (p.kind === 'recovery') return '夜更：瞓醒行 15 分鐘 + 伸展，瞓覺優先';
  return '未入班表';
}
// 今日通勤判斷：放工時間 + 日落 + 天氣
function commuteAdvice(d, sh) {
  sh = sh || rosterShift(d) || ((S.days[d] || {}).checkin || {}).shift;
  if (!sh) return { ok: false, shift: null, lines: ['未知今日班次：答咗今日問答或者入咗班表，就會幫你判斷。'] };
  if (sh === 'night') return { ok: false, shift: sh, lines: ['夜更：今日唔建議行／跑返屋企，瞓覺優先。'] };
  if (!WORK_SHIFTS.includes(sh)) return { ok: false, shift: sh, lines: ['今日唔使返工。想練通勤路線，可以揀涼爽時間試行一段。'] };
  const e = toMin(timesFor(sh, d).end);
  const wx = weatherState();
  const lines = [];
  let ok = true;
  if (wx.outdoorBad) { ok = false; lines.push('天氣唔適合（太熱或者有警告），今日搭車返，改做室內'); }
  if (!commuteFeasible(sh, d)) { ok = false; lines.push(`${fmtMin(e)} 先收工太夜，唔建議成程行返；可以落車後行一段 20 分鐘`); }
  else {
    const sun = sunset(d), walk = e + C.commute.minutes.walk;
    lines.push(walk > toMin(sun) + 20
      ? `${fmtMin(e)} 放工行返屋企大約 ${fmtMin(walk)} 到，日落 ${sun}：後半程會黑，著光色衫、帶燈，行行人路／單車徑`
      : `${fmtMin(e)} 放工行返屋企大約 ${fmtMin(walk)} 到，天黑前（日落 ${sun}）到屋企 ✅`);
    if (wx.runBad) lines.push('今日熱／濕，唔好跑，行或者踩單車');
  }
  if (wx.known) lines.push('天氣：' + wx.text);
  return { ok, shift: sh, lines };
}
// ---------- 同女朋友一齊郁：搵兩個人都得閒嘅時段 ----------
const gfShift = d => (S.gfRoster && S.gfRoster[d] && S.gfRoster[d].s) || null;
// 一日入面有咩時間唔得閒（分鐘區間），包括返工前後交通、通宵更前休息同之後瞓覺
function busyIntervals(cur, prev) {
  const G = C.together, out = [];
  const add = (t, isPrev) => {
    if (!t || !t.start || !t.end) return;
    const a = toMin(t.start), b = toMin(t.end), overnight = b <= a;
    if (isPrev) { if (overnight) out.push([0, b + G.sleepAfterNight]); return; }
    if (overnight) out.push([a - G.preNight, 1440]);
    else out.push([a - G.commuteBuffer, b + G.commuteBuffer]);
  };
  add(prev, true); add(cur, false);
  return out;
}
function freeIntervals(busy) {
  const [w0, w1] = C.together.window.map(toMin);
  let free = [[w0, w1]];
  busy.forEach(([a, b]) => { free = free.flatMap(([x, y]) => (b <= x || a >= y) ? [[x, y]] : [[x, a], [b, y]].filter(([p, q]) => q - p > 0)); });
  return free;
}
function togetherWindow(d) {
  const mine = rosterShift(d), hers = gfShift(d);
  if (!S.profile.gfMode || !mine || !hers) return null;
  const myT = sh => (sh && sh !== 'rest' ? timesFor(sh, d) : null);
  const myPrev = rosterShift(addDays(d, -1));
  const herT = sh => { const g = C.gfShifts[sh]; return g && g.start ? g : null; };
  const a = freeIntervals(busyIntervals(myT(mine), myPrev && myPrev !== 'rest' ? timesFor(myPrev, addDays(d, -1)) : null));
  const b = freeIntervals(busyIntervals(herT(hers), herT(gfShift(addDays(d, -1)))));
  let best = null;
  a.forEach(([x, y]) => b.forEach(([p, q]) => { const s0 = Math.max(x, p), e0 = Math.min(y, q); if (e0 - s0 >= C.together.minMinutes && (!best || e0 - s0 > best[1] - best[0])) best = [s0, e0]; }));
  return best;
}
function togetherText(d) {
  const w = togetherWindow(d);
  if (!w) return '';
  return `👫 同女朋友都得閒 ${fmtMin(w[0])}–${fmtMin(w[1])}：${w[1] - w[0] >= 150 ? C.together.ideas.long : C.together.ideas.short}`;
}
const mapUrl = mode => `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(C.commute.origin)}&destination=${encodeURIComponent(S.profile.home || C.commute.homeDefault)}&travelmode=${mode}`;

// ---------- 推薦引擎 ----------
function recommend(ci) {
  const t = today();
  const wx = weatherState();
  const ph = phase();
  const ws = weekStats(weekStart(t));
  const sw = strengthWorkouts();
  const lg = noGym() ? (sw[sw.length - 1] || null) : lastGym();
  const daysSinceGym = lg ? diffDays(lg.date, t) : null;
  const shiftTip = C.shifts[ci.shift] ? C.shifts[ci.shift].tip : '';
  const why = [];
  const extra = [];
  const minimum = '最低版本：行 10 分鐘 + 伸展 5 分鐘。做咗就算贏，唔使完美。';
  const doneToday = S.workouts.some(w => w.date === t && GYM_TYPES.concat('home').includes(w.type));
  if (ci.pain !== 'none') extra.push(C.painAdvice[ci.pain]);

  if (ci.shift === 'sick') return { kind: 'rest', icon: '🛌', title: '今日休息', summary: '病咗就休息、飲水、瞓覺。好返之後用「回歸訓練」慢慢返嚟。', why: ['身體恢復比 streak 重要'], extra, minimum: '今日嘅最低版本：飲夠水、早啲瞓。' };
  if (ci.shift === 'travel') return { kind: 'cardio', cardioKind: 'walk', minutes: 30, icon: '🧳', title: '旅行：行路就係運動', summary: '旅行行嘅路全部可以記做活動分鐘。返嚟之後照常繼續計劃，唔使內疚。', why: [shiftTip], extra, minimum };
  if (S.days[t] && S.days[t].restDay && !doneToday) return { kind: 'restday', icon: '😌', title: '今日唔做運動（休息）', summary: '休息都係計劃嘅一部分。行路、通勤照樣記錄，照樣計入步數同帶氧。', why: ['你揀咗今日休息'], extra: [], minimum: '' };
  if (doneToday) return { kind: 'done', icon: '✅', title: '今日已經練咗！', summary: '做得好。今日剩低嘅可以輕鬆行 10–20 分鐘、飲夠水、早啲瞓。', why: [], extra, minimum: '' };
  if (ci.shift === 'night') return { kind: 'recovery', icon: '🌙', title: C.recovery.name, summary: '夜更前後唔做重訓。行 15–20 分鐘再伸展，之後優先瞓覺。', why: [shiftTip], extra, minimum: '最低版本：伸展 5 分鐘就去瞓。' };
  if (ci.energy === 'low' || ci.sleepQ === 'bad') return { kind: 'recovery', icon: '🔋', title: C.recovery.name, summary: '今日精神或者睡眠唔夠好，做輕鬆版就得，聽日再嚟過。', why: [ci.energy === 'low' ? '你話今日好攰' : '尋晚瞓得唔好'], extra, minimum: '最低版本：伸展 5 分鐘。' };

  const gymYesterday = lg && daysSinceGym === 1;
  const isReturn = !noGym() && lg && daysSinceGym >= C.rules.returnAfterDays;
  const tmpl = nextTemplate();
  if (togetherText(t)) extra.push(togetherText(t));
  if (WORK_SHIFTS.includes(ci.shift) && ci.energy !== 'low') {
    const cm = commuteAdvice(t, ci.shift);
    if (cm.ok) extra.push(`放工可以行／踩單車返屋企（${C.rules.commuteKm} km）：${cm.lines[0]}。記得喺「活動」記錄。`);
  }
  if (wx.known) why.push('天氣：' + wx.text);

  const cardio = (kind, mins, reason) => {
    let k = kind;
    if (k === 'run' && wx.runBad) { k = 'cycle'; why.push('天氣熱／濕，跑步改踩單車或者快行'); }
    if (wx.outdoorBad && ['walk', 'cycle', 'run', 'hike'].includes(k)) {
      if (!noGym()) return { kind: 'cardio', cardioKind: 'cycle', minutes: mins, icon: '🚲', title: `chocoZAP 室內帶氧 ${mins} 分鐘`, summary: '天氣唔適合戶外：去 chocoZAP 踩單車、行斜坡跑步機或者太空漫步機（對膝頭最輕鬆），中等強度：微微喘氣、仲講到嘢。', why: why.concat(reason || []), extra, minimum: '最低版本：踩 15 分鐘。' };
      return { kind: 'home', icon: '🏠', title: C.homeCircuit.name, summary: '天氣唔適合戶外，改做屋企循環。', why: why.concat(reason || []), extra, minimum: '最低版本：做 1 輪循環。' };
    }
    const label = { walk: '快行', cycle: '踩單車', run: '跑行交替', hike: '行山' }[k] || '快行';
    return { kind: 'cardio', cardioKind: k, minutes: mins, icon: k === 'cycle' ? '🚲' : '🚶', title: `${label} ${mins} 分鐘`, summary: `中等強度：微微喘氣、仲講到嘢。${ci.shift === 'rest' ? '' : shiftTip}`, why: why.concat(reason || []), extra, minimum };
  };
  const A = adj();
  const gym = (reason, short) => {
    if (noGym()) return { kind: 'home', icon: '🏠', title: C.homeCircuit.name + '（代替 gym）', summary: '未入 gym 之前，用徒手肌力保持習慣：' + C.homeCircuit.note,
      why: why.concat(reason, '設定咗「未有 gym 會籍」'), extra: extra.concat('想郁多啲：做完再行 20 分鐘，或者揀踩單車／行山做帶氧。入咗 gym 會籍之後，去 ⚙︎ 設定熄咗「未有 gym」。'), minimum: '最低版本：做 1 輪。' };
    const shortByCoach = !short && !!A.shortDefault;
    short = short || shortByCoach;
    const mode = isReturn ? 'return' : (short ? 'short' : 'normal');
    const r = [reason];
    if (isReturn) r.push(`隔咗 ${daysSinceGym} 日冇做 gym，今次用較輕嘅「回歸訓練」`);
    if (short) r.push(shortByCoach ? '教練調整：預設做 30 分鐘精簡版（頭 4 個動作）' : '時間得 30 分鐘：做精簡版（頭 4 個動作）');
    return { kind: 'gym', template: tmpl, mode, icon: '🏋️', title: (isReturn ? '回歸訓練：' : '') + C.workouts[tmpl].name,
             summary: `${C.phases[ph].note} ${shiftTip}`, why: why.concat(r),
             extra: extra.concat('chocoZAP 太和：平日上晝同下晝通常較少人，盡量避開放工 6–9 點。第一次用部機，記得先用輕重量試。'),
             minimum: '最低版本：每個動作做 1 組，20 分鐘搞掂。' };
  };

  if (ci.time <= 15) {
    if (ci.pref === 'home' || wx.outdoorBad) return { kind: 'home', icon: '🏠', title: '屋企 10 分鐘', summary: '屋企循環做 2 輪就得。', why: why.concat('時間得 15 分鐘'), extra, minimum: '最低版本：做 1 輪。' };
    return cardio('walk', 15, '時間得 15 分鐘，行一圈都有用');
  }
  if (gymYesterday && ci.pref !== 'home') return cardio(ci.pref === 'cycle' ? 'cycle' : 'walk', Math.min(ci.time, 45), '琴日先做完 gym，今日畀肌肉恢復');
  if (ci.pref === 'walk') return cardio('walk', Math.min(ci.time, 45), '你今日想行路');
  if (ci.pref === 'cycle') return cardio('cycle', Math.min(ci.time, 45), '你今日想踩單車');
  if (ci.pref === 'home') return { kind: 'home', icon: '🏠', title: C.homeCircuit.name, summary: C.homeCircuit.note, why: why.concat('你今日想喺屋企做'), extra, minimum: '最低版本：做 1 輪。' };
  if (ci.pref === 'sport') {
    if (S.profile.gfMode) return { kind: 'cardio', cardioKind: 'hike', minutes: Math.min(ci.time, 60), icon: '👫', title: '同女朋友一齊郁', summary: '可以一齊行山（例如大埔滘自然護理區）、沿海濱行或者一齊去 gym。', why: why.concat('女朋友模式開咗'), extra, minimum };
    return cardio('hike', Math.min(ci.time, 60), '你今日想做戶外運動');
  }
  if (ci.pref === 'gym') {
    if (ws.gym >= C.targets.gymIdeal) return cardio('walk', Math.min(ci.time, 45), `本週已經做咗 ${ws.gym} 次 gym，夠晒！今日做帶氧`);
    return gym('你今日想去 gym', ci.time < 45);
  }
  // 「你幫我揀」
  if (A.shiftPref[ci.shift] === 'cardio') return cardio('walk', Math.min(ci.time, 45), `教練調整：${C.shifts[ci.shift].name}日你通常去唔到 gym，改做帶氧`);
  if (hasRoster() && C.shifts[ci.shift] && ROSTER_SHIFTS[ci.shift]) {
    const plan = planDays(t, 7, ci.shift);
    if (plan[0].kind === 'gym' && ci.time >= 30 && ws.gym < C.targets.gymIdeal) return gym('班表計劃：今日係 gym 日', ci.time < 45);
    if (plan[0].kind !== 'gym') {
      const later = plan.slice(1).filter(p => p.kind === 'gym' && weekStart(p.date) === weekStart(t));
      if (later.length && ws.gym + later.length >= C.targets.gymMin) {
        return cardio('walk', Math.min(ci.time, 45), `班表計劃：本週 gym 排咗喺 ${later.map(p => shortDate(p.date)).join('、')}，今日做帶氧`);
      }
    }
  }
  if (ws.gym < C.targets.gymIdeal && ci.time >= 30) {
    const reason = ws.gym < C.targets.gymMin ? `本週做咗 ${ws.gym}/${C.targets.gymMin} 次 gym` : `本週已達最低目標，第 ${ws.gym + 1} 次係加分`;
    if (ws.gym >= C.targets.gymMin && ws.cardio < C.targets.cardioMinutes) return cardio('walk', Math.min(ci.time, 45), `gym 已達標（${ws.gym} 次），帶氧仲差 ${C.targets.cardioMinutes - ws.cardio} 分鐘`);
    return gym(reason, ci.time < 45);
  }
  if (ws.cardio < C.targets.cardioMinutes) return cardio('walk', Math.min(ci.time, 45), `本週帶氧 ${ws.cardio}/${C.targets.cardioMinutes} 分鐘`);
  return cardio('walk', 20, '本週目標都達到晒，今日輕鬆行就好');
}

// ---------- 畫面 ----------
function render() {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === UI.tab));
  $('#topTitle').textContent = S.profile.nickname ? `${S.profile.nickname} 嘅健身教練` : '健身教練';
  $('#topSub').textContent = `${fmtDate(today())} · 第 ${weekNo()} 週 · 第 ${phase()} 階段`;
  const views = { today: vToday, train: vTrain, library: vLibrary, activity: vActivity, progress: vProgress, food: vFood };
  $('#app').innerHTML = views[UI.tab]();
  if (UI.tab === 'progress') fillPhotos();
  if (UI.tab === 'library') filterLibrary();
}

const opts = (name, map, cur) => `<div class="opts">${Object.entries(map).map(([k, v]) =>
  `<button class="opt ${String(cur) === String(k) ? 'on' : ''}" data-act="pick" data-name="${name}" data-v="${k}">${v}</button>`).join('')}</div>`;

function vOnboard() {
  return `<div class="card hero">
    <div class="big">你嘅目標唔係急住減重，而係建立每週 2–3 次穩定運動。</div>
    <p class="muted">先填幾樣基本資料（只會存喺你部手機）。</p>
    <label class="f">暱稱（可以唔填）<input id="obName" maxlength="20"></label>
    <div class="grid2">
      <label class="f">身高 cm<input id="obH" type="number" inputmode="decimal"></label>
      <label class="f">而家體重 kg<input id="obW" type="number" inputmode="decimal" step="0.1"></label>
    </div>
    <label class="f">開始日期<input id="obStart" type="date" value="${today()}"></label>
    <label class="row f"><input type="checkbox" id="obGf"> 女朋友有時會一齊做運動</label>
    <button class="btn block" data-act="onboard">開始</button>
    <p class="small muted" style="margin-top:10px">已經喺另一部機用緊？先撳右上角 ⚙︎ →「多裝置同步」連接，紀錄會自動搬過嚟。</p>
  </div>`;
}

function vCheckin(ci) {
  ci = ci || {};
  const rs = rosterShift(today());
  const d = UI.draft || (UI.draft = Object.assign({ shift: rs || '', energy: 'normal', sleepQ: 'ok', pain: 'none', time: 45, pref: 'any' }, ci));
  return `<div class="card">
    <h2>今日 30 秒問答</h2>
    <div class="q"><div class="q-label">1. 今日班次${rs && d.shift === rs ? ' <span class="chip ok">已跟班表填好</span>' : ''}</div>${opts('shift', Object.fromEntries(Object.entries(C.shifts).map(([k, v]) => [k, v.name])), d.shift)}</div>
    <div class="q"><div class="q-label">2. 精神</div>${opts('energy', { low: '好攰', normal: '普通', high: '好有精神' }, d.energy)}</div>
    <div class="q"><div class="q-label">3. 尋晚瞓得點</div>${opts('sleepQ', { bad: '差', ok: '一般', good: '好' }, d.sleepQ)}</div>
    <div class="q"><div class="q-label">4. 有冇邊度痛</div>${opts('pain', PAIN, d.pain)}</div>
    <div class="q"><div class="q-label">5. 有幾多時間</div>${opts('time', { 15: '15 分', 30: '30 分', 45: '45 分', 60: '60 分+' }, d.time)}</div>
    <div class="q"><div class="q-label">6. 今日想做咩</div>${opts('pref', { any: '你幫我揀', gym: 'Gym', walk: '行路', cycle: '踩單車', home: '屋企', sport: S.profile.gfMode ? '行山／一齊郁' : '行山／戶外' }, d.pref)}</div>
    <button class="btn block" data-act="submitCheckin">話我知今日做咩</button>
  </div>`;
}

function vRec(rec) {
  let body = '';
  if (rec.kind === 'gym') {
    const pain = (day().checkin || {}).pain;
    let list = C.workouts[rec.template].exercises.filter(s => !adj().skip[s.key]);
    if (rec.mode === 'short') list = list.slice(0, 4);
    body = `<ul class="clean">${list.map(s => {
      const r = resolveEx(s.key, pain);
      if (!r.key) return `<li class="muted"><s>${esc(C.exercises[s.key].name)}</s>（今日略過）</li>`;
      const sets = rec.mode === 'return' ? Math.max(1, s.sets - 1) : s.sets;
      return `<li>${exLink(r.key, esc(C.exercises[r.key].name))} <span class="muted">${sets} × ${s.reps[0]}–${s.reps[1]}</span>${r.from ? ' <span class="chip warn">替代</span>' : ''}</li>`;
    }).join('')}</ul>
    <button class="btn block" data-act="startGym" data-t="${rec.template}" data-mode="${rec.mode}">開始訓練</button>`;
  } else if (rec.kind === 'cardio') {
    body = `<button class="btn block" data-act="logAct" data-kind="${rec.cardioKind}" data-min="${rec.minutes}">做完，記錄 ${rec.minutes} 分鐘</button>`;
  } else if (rec.kind === 'recovery') {
    body = `<ul class="clean">${C.recovery.steps.map((s, i) => `<li>${exLink(C.recovery.keys[i], esc(s))}</li>`).join('')}</ul>
    <button class="btn block" data-act="logRecovery">完成恢復</button>`;
  } else if (rec.kind === 'home') {
    body = `<ul class="clean">${C.homeCircuit.steps.map((s, i) => `<li>${exLink(C.homeCircuit.keys[i], esc(s))}</li>`).join('')}</ul><p class="small muted">${esc(C.homeCircuit.note)}</p>
    <button class="btn block" data-act="logHome">做完，記錄</button>`;
  } else if (rec.kind === 'restday') {
    body = '<button class="btn sm ghost" data-act="toggleRestDay">取消（今日都做運動）</button>';
  } else if (rec.kind === 'cardio' || rec.kind === 'done') {
    body = '';
  }
  return `<div class="card hero">
    <div class="muted small">今日建議（只有一個）</div>
    <div class="big">${rec.icon} ${esc(rec.title)}</div>
    <p>${esc(rec.summary)}</p>
    ${rec.why.filter(Boolean).length ? `<p class="small muted">原因：${rec.why.filter(Boolean).map(esc).join('；')}</p>` : ''}
    ${body}
    ${rec.minimum ? `<p class="small" style="margin-top:10px">🪫 ${esc(rec.minimum)}</p>` : ''}
    ${rec.extra.length ? `<ul class="clean small muted">${rec.extra.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <div class="row" style="margin-top:8px"><button class="btn sm ghost" data-act="editCheckin">改答案</button></div>
  </div>`;
}

function vToday() {
  if (!S.profile.onboarded) return vOnboard();
  const x = day();
  const auto = autoChecks();
  const ws = weekStats(weekStart(today()));
  const items = [
    ['water', '💧', '飲水', `${r1(x.waterMl / 1000)}/${waterTarget() / 1000}L`],
    ['protein', '🍳', '蛋白質', `${x.protein}/3 餐`],
    ['veg', '🥦', '蔬菜', ''],
    ['steps', '👟', '步數', x.steps != null ? x.steps : `${C.targets.stepsLow}+`],
    ['workout', '🏋️', '運動', ''],
    ['sleep', '😴', '瞓覺', x.sleepH != null ? `${x.sleepH} 小時` : `${C.targets.sleepHours}h+`]
  ];
  let review = '';
  const lastWs = addDays(weekStart(today()), -7);
  if (S.reviewSeen !== lastWs && S.workouts.concat(S.activities).some(a => a.date < weekStart(today()))) {
    const w = weekStats(lastWs);
    review = `<div class="card"><h2>📅 上週回顧</h2>
      <p>Gym ${w.gym} 次 · 帶氧 ${w.cardio} 分鐘 · 記錄 ${w.logDays} 日${w.avgSleep != null ? ` · 平均瞓 ${w.avgSleep}h` : ''}</p>
      <p><b>下週重點：</b>${esc(weekFocus(w))}</p>
      <button class="btn sm ghost" data-act="seenReview" data-w="${lastWs}">收到</button></div>`;
  }
  const ci = x.checkin;
  let main;
  if (x.restDay && !UI.editCheckin) main = vRec(recommend(ci || { shift: rosterShift(today()) || 'rest', energy: 'normal', sleepQ: 'ok', pain: 'none', time: 45, pref: 'any' }));
  else if (!ci || UI.editCheckin) main = vCheckin(ci);
  else {
    const rec = recommend(ci);
    // 記低今日建議咗咩，之後用嚟分析「建議咗但做唔到」嘅情況
    if (rec.kind !== 'done' && x.rec !== rec.kind) { x.rec = rec.kind; save(); }
    main = vRec(rec);
  }
  const wx = weatherState();
  const ins = insights().filter(i => i.level !== 'info').slice(0, 2);
  const insCard = ins.length ? `<div class="card"><div class="row between"><h2>🧠 教練觀察</h2><button class="btn sm ghost" data-tab="progress">睇全部</button></div>${ins.map(insightHtml).join('')}</div>` : '';
  let safety = '';
  if (syncReady() && SY.lastError) safety = `<div class="card"><b>☁️ 同步有問題</b><p class="small muted">${esc(SY.lastError)}。紀錄仍然安全存喺呢部機。</p><button class="btn sm ghost" data-act="openSettings">去設定</button></div>`;
  else if (!syncReady() && (S.workouts.length || S.activities.length) && (!S.lastBackup || diffDays(S.lastBackup, today()) >= 7)) safety = `<div class="card"><b>💾 一個禮拜冇備份</b><p class="small muted">開咗同步就唔使理呢個；未開就撳一下匯出備份（存去 iCloud 雲碟或者 AirDrop 去 Mac）。</p><div class="row"><button class="btn sm" data-act="backupNow">一撳備份</button><button class="btn sm ghost" data-act="openSettings">設定同步</button></div></div>`;
  return `${review}${safety}${main}${insCard}${vPlanCard()}
  <div class="grid2" style="margin-bottom:12px">
    <button class="btn blue" data-act="dunno">🤷 唔知今日做咩</button>
    <button class="btn ghost" data-act="lowMode">🌙 好攰／夜更模式</button>
  </div>
  <div class="card">
    <div class="row between"><h2>今日清單</h2><span class="small muted">撳一下就完成</span></div>
    <div class="checks">${items.map(([k, ic, l, sub]) => {
      const on = x.check[k] || auto[k];
      return `<button class="check ${on ? 'on' : ''}" data-act="toggleCheck" data-k="${k}"><span class="ic">${ic}</span>${l}<span class="sub">${esc(sub)}</span></button>`;
    }).join('')}</div>
    <div class="grid2" style="margin-top:10px">
      <label class="f">今日步數<input type="number" inputmode="numeric" data-field="steps" value="${x.steps ?? ''}" placeholder="例如 7000"></label>
      <label class="f">尋晚瞓咗（小時）<input type="number" inputmode="decimal" step="0.5" data-field="sleepH" value="${x.sleepH ?? ''}" placeholder="例如 7"></label>
    </div>
  </div>
  <div class="card">
    <h2>快速記錄</h2>
    <div class="quick">
      <button class="btn ghost" data-act="quickGym">✅ Gym 做完</button>
      <button class="btn ghost" data-act="logAct" data-kind="walk" data-min="30">🚶 行咗 30 分鐘</button>
      <button class="btn ghost" data-act="logAct" data-kind="cycle" data-min="30" data-commute="1">🚲 踩單車返工／放工</button>
      <button class="btn ghost" data-act="water2L">💧 飲咗 2L 水</button>
      <button class="btn ghost" data-act="slept7">😴 瞓咗 7 粒鐘</button>
      <button class="btn ghost" data-act="logAct" data-kind="walk" data-min="105" data-km="${C.rules.commuteKm}" data-commute="1">🏠 行返屋企</button>
      <button class="btn ${x.restDay ? '' : 'ghost'}" data-act="toggleRestDay" style="grid-column:1/-1">${x.restDay ? '↩️ 取消：今日都做運動' : '😌 今日唔做運動（休息，行路照計）'}</button>
    </div>
  </div>
  <div class="card">
    <h2>本週</h2>
    ${progressLine('Gym', ws.gym, C.targets.gymMin, `次（理想 ${C.targets.gymIdeal}）`)}
    ${progressLine('帶氧', ws.cardio, C.targets.cardioMinutes, '分鐘')}
    ${progressLine('有記錄', ws.logDays, C.targets.logDaysPerWeek, '日')}
    ${wx.known ? `<p class="small muted">🌤️ ${esc(wx.text)}</p>` : ''}
  </div>`;
}
function vPlanCard() {
  if (!hasRoster()) return `<div class="card"><div class="row between"><h2>📅 班表</h2><button class="btn sm" data-act="openRoster">輸入班表</button></div>
    <p class="small muted">入咗早／中／夜更嘅上落班時間同未來幾星期嘅班，App 會預早排好邊日去 gym、邊日行返屋企，每日問答亦會自動填班次。</p></div>`;
  const plan = planDays(today(), 7);
  return `<div class="card"><div class="row between"><h2>📅 未來 7 日</h2><button class="btn sm ghost" data-act="openRoster">改班表</button></div>
    ${plan.map((p, i) => `<div class="list-item"><div class="grow"><b>${i === 0 ? '今日' : shortDate(p.date)}（${WD[pd(p.date).getDay()]}）</b> <span class="chip">${p.shift ? esc(shiftLabel(p.shift, p.date)) : '未入班'}</span>
      <div class="small ${p.kind === 'gym' ? '' : 'muted'}">${p.kind === 'gym' && noGym() ? '🏠' : (PLAN_ICON[p.kind] || '·')} ${esc(planText(p))}</div>${togetherText(p.date) ? `<div class="small" style="color:var(--blue)">${esc(togetherText(p.date))}</div>` : ''}</div>
      ${p.kind === 'done' ? '' : `<button class="btn sm ${p.kind === 'restday' ? '' : 'ghost'}" data-act="toggleRestDay" data-d="${p.date}" aria-label="唔做運動">😌</button>`}</div>`).join('')}
    <p class="small muted">撳 😌 = 嗰日唔做運動，訓練日會自動搬去其他日子。實際做咩，仍然會跟你當日問答（精神、痛、時間）再調整。</p>
    ${noGym() ? '<p class="small">🏠 未有 gym 會籍：gym 日暫時改做屋企徒手肌力。<button class="btn sm ghost" data-act="toggleNoGym">已經入咗 gym</button></p>'
      : (gymWorkouts().length ? '' : '<p class="small muted">未入 gym？<button class="btn sm ghost" data-act="toggleNoGym">暫時用其他運動代替</button></p>')}</div>`;
}
function rosterModal() {
  const gf = UI.rosterWho === 'gf';
  const T = shiftTimes();
  const t0 = today(), start = weekStart(t0);
  const opts = gf ? Object.fromEntries(Object.entries(C.gfShifts).map(([k, v]) => [k, v.name])) : ROSTER_SHIFTS;
  const get = gf ? gfShift : rosterShift;
  let rows = '';
  for (let i = 0; i < 35; i++) {
    const d = addDays(start, i);
    if (d < t0) continue;
    if (pd(d).getDay() === 1 || d === t0) rows += `<div class="small muted" style="margin:10px 0 2px">${shortDate(weekStart(d))} 嗰週</div>`;
    const cur = get(d), mine = rosterShift(d);
    rows += `<div class="rrow"><span class="rd">${shortDate(d)} ${WD[pd(d).getDay()]}${gf && mine ? `<span class="small muted" style="display:block">我：${ROSTER_SHIFTS[mine] || ''}</span>` : ''}</span><div class="seg" style="grid-template-columns:repeat(${Object.keys(opts).length},1fr)">${Object.entries(opts).map(([k, v]) =>
      `<button class="seg-b ${cur === k ? 'on' : ''}" data-act="setRoster" data-who="${gf ? 'gf' : 'me'}" data-d="${d}" data-s="${k}">${esc(v)}</button>`).join('')}</div></div>`;
  }
  const tRow = (k, label) => `<div class="ttrow"><span>${label}</span><input type="time" id="t-${k}-s" value="${esc(T[k].start)}"><span>–</span><input type="time" id="t-${k}-e" value="${esc(T[k].end)}"></div>`;
  const head = gf
    ? `<p class="small muted">可選：只係用嚟搵你哋兩個都得閒、可以一齊做運動嘅時間。${S.profile.gfMode ? '' : '<b>要喺 ⚙︎ 設定開「女朋友模式」先會顯示。</b>'}</p>
       <p class="small muted">${Object.values(C.gfShifts).filter(v => v.start).map(v => `${v.name} ${v.start}–${v.end}`).join(' · ')}</p>`
    : `<h3>每更上落班時間</h3>
    ${tRow('early', '早更')}
    ${tRow('office', '辦公')}
    <div class="ttrow"><span></span><span class="small muted" style="text-align:right">星期五</span><span></span><input type="time" id="t-office-f" value="${esc(T.office.endFri || T.office.end)}"></div>
    ${tRow('middle', '晚更')}
    ${tRow('night', '夜更')}
    <button class="btn sm" data-act="saveShiftTimes" style="margin-top:6px">儲存時間</button>
    <h3 style="margin-top:18px">未來 5 星期（撳一下揀，再撳一下清除）</h3>
    <p class="small muted">早＝早更、辦＝辦公時間、晚＝晚更、夜＝夜更、休＝休息日。即撳即存，會同步去其他裝置。</p>`;
  modal(`<h2>📅 班表</h2>
    <div class="seg" style="grid-template-columns:1fr 1fr;margin-bottom:8px"><button class="seg-b ${gf ? '' : 'on'}" data-act="rosterWho" data-w="me">我</button><button class="seg-b ${gf ? 'on' : ''}" data-act="rosterWho" data-w="gf">👫 女朋友（可選）</button></div>
    ${head}${rows}
    <div style="height:12px"></div><button class="btn block ghost" data-act="closeModal">完成</button>`);
}
function progressLine(label, v, target, unit) {
  const pct = Math.min(100, Math.round(100 * v / target));
  return `<div style="margin:8px 0"><div class="row between small"><span>${label}</span><span>${v} / ${target} ${unit}${v >= target ? ' ✅' : ''}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`;
}

// ---------- 訓練頁 ----------
function vTrain() {
  if (S.active) return S.active.guided ? vGuided() : vSession();
  const ph = phase();
  const gymN = gymWorkouts().length;
  const next = nextTemplate();
  const p2 = ph === 1 ? `<p class="small muted">升第 2 階段條件：開始滿 ${C.rules.phase2MinWeeks} 週（而家第 ${weekNo()} 週）＋ 完成 ${C.rules.phase2MinGymSessions} 次 gym（而家 ${gymN} 次）。冇時限，慢慢嚟。</p>` : '';
  const tmplCard = k => {
    const w = C.workouts[k];
    return `<div class="card">
      <div class="row between"><h2>${esc(w.name)}</h2>${k === next ? '<span class="chip ok">下一個</span>' : ''}</div>
      <ul class="clean small">${w.exercises.map(s => `<li>${exLink(s.key, esc(C.exercises[s.key].name))} <span class="muted">${ph === 1 && w.phase === 2 ? 2 : s.sets} × ${s.reps[0]}–${s.reps[1]}${C.exercises[s.key].unit === 'sec' ? ' 秒' : ''}</span></li>`).join('')}</ul>
      <button class="btn block ${k === next ? '' : 'ghost'}" data-act="startGym" data-t="${k}" data-mode="normal">開始 ${esc(w.name)}</button>
    </div>`;
  };
  const other = ph === 1 ? ['d1', 'd2', 'd3'] : ['gymA', 'gymB'];
  const hist = S.workouts.slice().sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at).slice(0, 12);
  return `<div class="card hero">
      <div class="big">${esc(C.phases[ph].name)}</div>
      <p>${esc(C.phases[ph].note)}</p>
      <p class="small muted">每組休息：複合動作 90–120 秒，單關節／核心 60–90 秒。熱身 5–8 分鐘踩單車或快行，完咗伸展 5 分鐘。</p>
      ${weightGuideHtml(false)}
      ${p2}
    </div>
    ${C.phases[ph].rotation.map(tmplCard).join('')}
    <details class="card"><summary>睇${ph === 1 ? '第 2 階段' : '第 1 階段'}嘅訓練日</summary>${other.map(k => `<p><b>${esc(C.workouts[k].name)}</b>：${C.workouts[k].exercises.map(s => esc(C.exercises[s.key].name)).join('、')}</p>`).join('')}</details>
    <div class="card"><h2>訓練紀錄</h2>
      ${hist.length ? hist.map(w => `<div class="list-item"><div><b>${fmtDate(w.date)}</b> ${esc(workoutName(w))}<div class="small muted">${w.quick ? '快速記錄' : `${(w.exercises || []).filter(e => e.sets.some(s => s.done)).length} 個動作`}${w.minutes ? ` · ${w.minutes} 分鐘` : ''}${w.note ? ' · ' + esc(w.note) : ''}</div></div>
        <button class="btn sm ghost" data-act="delWorkout" data-id="${w.id}">刪除</button></div>`).join('') : '<p class="muted">未有紀錄。第一次永遠最難，做完就係贏咗。</p>'}
    </div>`;
}
const workoutName = w => (C.workouts[w.type] ? C.workouts[w.type].name : { home: '屋企循環', recovery: '恢復' }[w.type] || w.type) + (w.mode === 'return' ? '（回歸）' : w.mode === 'short' ? '（精簡）' : '');

function startGym(t, mode) {
  const pain = (day().checkin || {}).pain || 'none';
  const ph = phase();
  const A = adj();
  let list = C.workouts[t].exercises.filter(s => !A.skip[s.key]);
  if (mode === 'short') list = list.slice(0, 4);
  const items = [];
  list.forEach(s => {
    const r = resolveEx(s.key, pain);
    if (!r.key) return;
    let sets = (ph === 1 && C.workouts[t].phase === 2) ? 2 : s.sets;
    if (mode === 'return') sets = Math.max(1, sets - 1);
    const prog = progression(r.key, s.reps);
    let w = prog.w;
    if (mode === 'return' && w) w = roundTo(w * 0.85, C.exercises[r.key].inc);
    else if (A.deload[r.key] && w) w = roundTo(w * 0.9, C.exercises[r.key].inc);
    items.push({ slot: s.key, key: r.key, subFrom: r.from || null, altUsed: false, reps: s.reps, note: '',
                 sets: Array.from({ length: sets }, () => ({ w: w ?? '', r: '', rpe: '', done: false })) });
  });
  S.active = { id: uid(), type: t, mode, date: today(), startedAt: Date.now(), items, pain };
  save(); UI.tab = 'train'; render(); window.scrollTo(0, 0);
}

function vSession() {
  const a = S.active;
  const ph = phase();
  const rpeOpts = ['', 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
  const mins = Math.round((Date.now() - a.startedAt) / 60000);
  return `<div class="card hero">
    <div class="big">${esc(workoutName({ type: a.type, mode: a.mode }))}</div>
    <p class="small">目標 RPE ${a.mode === 'return' ? 6 : C.phases[ph].rpe}${ph === 1 ? '（頭 4 週唔好做到力竭）' : ''} · 已經 ${mins} 分鐘</p>
    <p class="small muted">每組做完撳 ✓，會自動開始休息計時。RPE 10 = 一下都做唔到；7 = 仲有 3 下。</p>
    ${weightGuideHtml(!gymWorkouts().length)}
    <button class="btn block" data-act="guidedOn">▶️ 引導模式（一個一個動作帶住做）</button>
    ${a.pain && a.pain !== 'none' ? `<p class="small" style="color:var(--warn)">${esc(C.painAdvice[a.pain])}</p>` : ''}
  </div>
  <div class="card">${a.items.map((it, i) => {
    const ex = C.exercises[it.key];
    const prog = progression(it.key, it.reps);
    if (adj().deload[it.key]) prog.text = '🔧 教練調整：今次減 10% 重量，專心做足次數同姿勢，之後再慢慢加返。';
    const unit = ex.unit === 'sec' ? '秒' : '下';
    const wPlaceholder = ex.unit === 'kg' ? 'kg' : '—';
    return `<div class="ex">
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><button class="thumbbtn" data-act="exInfo" data-k="${it.key}" aria-label="睇示範">${animHtml(it.key, 'sm')}</button>
        <div class="grow"><div class="ex-name">${exLink(it.key, esc(ex.name))}</div>${it.subFrom ? '<span class="chip warn">因痛替代</span>' : ''}
      <div class="small muted">${it.sets.length} 組 × ${it.reps[0]}–${it.reps[1]} ${unit} · 休息 ${esc(ex.rest)}</div></div></div>
      ${C.workouts[a.type].exercises.find(s => s.key === it.slot && s.note) ? `<div class="small muted">${esc(C.workouts[a.type].exercises.find(s => s.key === it.slot).note)}</div>` : ''}
      <div class="sug">${esc(prog.text)}${warmupText(it.key, prog.w) ? '<br>' + esc(warmupText(it.key, prog.w)) : ''}</div>
      <details><summary>姿勢提示／冇器材點算</summary><p class="small">✅ ${esc(ex.cue)}</p><p class="small">🔁 替代：${esc(ex.sub)}</p>
        <label class="row small"><input type="checkbox" data-alt="${i}" ${it.altUsed ? 'checked' : ''}> 今次用咗替代動作（唔計入加重建議）</label></details>
      <div class="sethead"><span>組</span><span>${ex.unit === 'kg' ? '重量 kg' : '—'}</span><span>${unit}數</span><span>RPE</span><span></span></div>
      ${it.sets.map((s, j) => `<div class="setrow">
        <span class="n">${j + 1}</span>
        <input type="number" inputmode="decimal" step="0.5" placeholder="${wPlaceholder}" ${ex.unit === 'kg' ? '' : 'disabled'} data-set="${i},${j},w" value="${esc(s.w)}">
        <input type="number" inputmode="numeric" placeholder="${it.reps[1]}" data-set="${i},${j},r" value="${esc(s.r)}">
        <select data-set="${i},${j},rpe">${rpeOpts.map(v => `<option value="${v}" ${String(s.rpe) === String(v) ? 'selected' : ''}>${v === '' ? 'RPE' : v}</option>`).join('')}</select>
        <button class="setbtn ${s.done ? 'on' : ''}" data-act="doneSet" data-i="${i}" data-j="${j}">✓</button>
      </div>`).join('')}
      <div class="row"><button class="btn sm ghost" data-act="addSet" data-i="${i}">＋ 加一組</button>
        <input class="grow" placeholder="備註（例如：座位調第 4 格）" data-note="${i}" value="${esc(it.note)}" style="margin:0;padding:8px"></div>
    </div>`;
  }).join('')}</div>
  <button class="btn block" data-act="finishGym">完成訓練 🎉</button>
  <div style="height:8px"></div>
  <button class="btn block danger" data-act="cancelGym">放棄今次（唔儲存）</button>`;
}

const curSet = it => it.sets.findIndex(x => !x.done);
const weightGuideHtml = open => `<details ${open ? 'open' : ''}><summary>⚖️ 點樣睇／揀重量？</summary><ul class="clean small">${C.weightGuide.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>`;
function vGuided() {
  const a = S.active, n = a.items.length;
  if (!n) return vSession();
  if (UI.gi == null || UI.gi >= n) { const k = a.items.findIndex(x => curSet(x) >= 0); UI.gi = k < 0 ? n - 1 : k; }
  const i = UI.gi, it = a.items[i], ex = C.exercises[it.key], j = curSet(it), s = j >= 0 ? it.sets[j] : null;
  const total = sum(a.items.map(x => x.sets.length)), done = sum(a.items.map(x => x.sets.filter(y => y.done).length));
  const allDone = done === total;
  const prog = progression(it.key, it.reps);
  if (adj().deload[it.key]) prog.text = '🔧 教練調整：今次減 10% 重量，專心做足次數同姿勢。';
  const unit = ex.unit === 'sec' ? '秒' : '下';
  const rpeOpts = ['', 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
  const prev = j > 0 ? it.sets[j - 1] : null;
  const nextIt = a.items.slice(i + 1).find(x => curSet(x) >= 0);
  const wu = j === 0 ? warmupText(it.key, prog.w) : '';
  return `<div class="card">
    <div class="row between small muted"><span>動作 ${i + 1} / ${n}</span><span>已完成 ${done} / ${total} 組 · ${Math.round((Date.now() - a.startedAt) / 60000)} 分鐘</span></div>
    <div class="bar" style="margin:6px 0 12px"><i style="width:${Math.round(100 * done / total)}%"></i></div>
    ${animHtml(it.key, 'lg')}
    <div class="gname">${exLink(it.key, esc(ex.name))}</div>
    ${it.subFrom ? '<span class="chip warn">因痛替代</span>' : ''}
    <p class="small muted" style="margin:4px 0">✅ ${esc(ex.cue)}</p>
    <div class="sug">${esc(prog.text)}${wu ? '<br>' + esc(wu) : ''}</div>
    ${ex.unit === 'kg' ? weightGuideHtml(prog.w == null && j === 0) : ''}
    ${s ? `<div class="gset">第 ${j + 1} / ${it.sets.length} 組 · 目標 ${it.reps[0]}–${it.reps[1]} ${unit}</div>
      ${prev ? `<p class="small muted" style="margin:0 0 6px">上一組：${prev.w !== '' && prev.w != null ? esc(prev.w) + 'kg × ' : ''}${esc(prev.r)} ${unit}${prev.rpe ? ' @ RPE ' + esc(prev.rpe) : ''}</p>` : ''}
      <div class="grid3">
        <label class="f" style="margin:0">重量 kg<input type="number" inputmode="decimal" step="0.5" ${ex.unit === 'kg' ? '' : 'disabled'} data-set="${i},${j},w" value="${esc(s.w)}"></label>
        <label class="f" style="margin:0">${unit}數<input type="number" inputmode="numeric" placeholder="${it.reps[1]}" data-set="${i},${j},r" value="${esc(s.r)}"></label>
        <label class="f" style="margin:0">RPE<select data-set="${i},${j},rpe">${rpeOpts.map(v => `<option value="${v}" ${String(s.rpe) === String(v) ? 'selected' : ''}>${v === '' ? '—' : v}</option>`).join('')}</select></label>
      </div>
      <button class="btn block xl" data-act="doneSet" data-i="${i}" data-j="${j}" style="margin-top:12px">✓ 做完第 ${j + 1} 組</button>
      <p class="small muted" style="margin:6px 0 0">撳完會自動開始休息 ${restSecs(it.key)} 秒計時。次數唔填就當做到 ${it.reps[1]} ${unit}。</p>`
    : `<div class="gset">呢個動作完成 ✅</div>${nextIt ? `<button class="btn block xl" data-act="gGo" data-i="${a.items.indexOf(nextIt)}">下一個：${esc(C.exercises[nextIt.key].name)} →</button>` : ''}`}
    <div class="grid2" style="margin-top:12px"><button class="btn ghost" data-act="gGo" data-i="${i - 1}" ${i === 0 ? 'disabled' : ''}>← 上一個</button><button class="btn ghost" data-act="gGo" data-i="${i + 1}" ${i === n - 1 ? 'disabled' : ''}>下一個 →</button></div>
  </div>
  ${allDone ? '<div class="card hero"><div class="big">全部完成 🎉</div><p>做得好！記得伸展 5 分鐘。</p><button class="btn block" data-act="finishGym">儲存訓練</button></div>' : ''}
  <div class="grid2"><button class="btn ghost" data-act="guidedOff">📋 睇成個清單</button><button class="btn ghost" data-act="finishGym">提早完成</button></div>`;
}
// 引導模式時保持螢幕唔熄（iOS 16.4+ 支援；唔支援就算）
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}

function finishGym() {
  const a = S.active;
  const done = a.items.some(it => it.sets.some(s => s.done));
  if (!done && !confirm('未剔任何一組，都要儲存嗎？')) return;
  const minutes = Math.max(1, Math.round((Date.now() - a.startedAt) / 60000));
  S.workouts.push({ id: a.id, at: Date.now(), date: a.date, type: a.type, mode: a.mode, minutes, pain: a.pain,
    exercises: a.items.map(it => ({ key: it.key, slot: it.slot, subFrom: it.subFrom, altUsed: it.altUsed, note: it.note,
      sets: it.sets.map(s => ({ w: num(s.w), r: num(s.r), rpe: num(s.rpe), done: s.done })) })) });
  const A = adj();
  a.items.forEach(it => { if (A.deload[it.key] && it.sets.some(s => s.done)) delete A.deload[it.key]; });
  S.active = null;
  stopTimer(); keepAwake(false); UI.gi = null;
  save(); checkMilestones(); UI.tab = 'today'; render(); window.scrollTo(0, 0);
  toast('訓練完成！記得飲水同食啲蛋白質 💪');
}

// ---------- 活動頁 ----------
function vActivity() {
  const ws = weekStats(weekStart(today()));
  const runs = S.activities.filter(a => a.kind === 'run');
  const longest = runs.length ? Math.max(...runs.map(a => a.minutes)) : 0;
  const ready = longest >= C.rules.commuteRunReadyMinutes;
  const wx = weatherState();
  const list = S.activities.slice().sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at).slice(0, 20);
  return `<div class="card">
    <h2>本週帶氧</h2>
    ${progressLine('中等強度分鐘（劇烈 ×2）', ws.cardio, C.targets.cardioMinutes, '')}
    <p class="small muted">輕鬆活動：${ws.light} 分鐘（唔計入 150，但一樣有用）。熱同濕嘅日子，踩單車或者快行好過跑步。</p>
    ${wx.known ? `<p class="small muted">🌤️ ${esc(wx.text)}${wx.runBad ? ' → 今日唔建議戶外跑步' : ''}</p>` : ''}
  </div>
  <div class="card">
    <h2>記錄活動</h2>
    <div class="quick">
      <button class="btn ghost" data-act="logAct" data-kind="walk" data-min="30">🚶 快行 30 分</button>
      <button class="btn ghost" data-act="logAct" data-kind="cycle" data-min="30">🚲 踩單車 30 分</button>
      <button class="btn ghost" data-act="logAct" data-kind="run" data-min="25" data-int="moderate">🏃 跑行交替 25 分</button>
      <button class="btn ghost" data-act="logAct" data-kind="hike" data-min="60">⛰️ 行山</button>
      <button class="btn ghost" data-act="logAct" data-kind="badminton" data-min="45">🏸 羽毛球</button>
      <button class="btn ghost" data-act="logAct" data-kind="other" data-min="30">➕ 其他</button>
    </div>
  </div>
  <div class="card">
    <h2>🏠 ${esc(C.commute.title)}</h2>
    <p class="small muted">中大 → 大埔屋企步行大約 ${C.rules.commuteKm} km（行 ${C.commute.minutes.walk} 分／踩 ${C.commute.minutes.cycle} 分）。</p>
    ${(() => { const cm = commuteAdvice(today()); return `<div class="sug"><b>今日${cm.shift ? `（${esc(C.shifts[cm.shift] ? C.shifts[cm.shift].name : cm.shift)}）` : ''}：</b>${cm.lines.map(esc).join('<br>')}</div>`; })()}
    <div class="grid2" style="margin:8px 0"><a class="btn sm ghost" href="${mapUrl('walking')}" target="_blank" rel="noopener">🗺️ 行路路線</a><a class="btn sm ghost" href="${mapUrl('bicycling')}" target="_blank" rel="noopener">🗺️ 單車路線</a></div>
    <p class="small muted">地圖終點：${esc(S.profile.home || C.commute.homeDefault)}（可以喺 ⚙︎ 設定改）</p>
    <ul class="clean small">${C.commute.options.map(o => `<li><b>${esc(o.level)}</b>：${esc(o.text)}</li>`).join('')}</ul>
    <p class="small">跑步準備度：最長一次跑步記錄 <b>${longest} 分鐘</b> ${ready ? '✅ 可以考慮試跑成程（揀涼爽日子）' : `→ 要可以連續跑 ${C.rules.commuteRunReadyMinutes} 分鐘先試跑成程，之前用跑行交替`}</p>
    <details><summary>安全同實用提示</summary><ul class="clean small">${C.commute.safety.map(s => `<li>${esc(s)}</li>`).join('')}</ul></details>
    <div class="quick" style="margin-top:8px">
      <button class="btn ghost" data-act="logAct" data-kind="walk" data-min="105" data-km="${C.rules.commuteKm}" data-commute="1">🚶 行返屋企</button>
      <button class="btn ghost" data-act="logAct" data-kind="cycle" data-min="35" data-km="${C.rules.commuteKm}" data-commute="1">🚲 踩返屋企</button>
      <button class="btn ghost" data-act="logAct" data-kind="run" data-min="50" data-km="${C.rules.commuteKm}" data-commute="1" data-int="vigorous">🏃 跑／跑行返屋企</button>
      <button class="btn ghost" data-act="logAct" data-kind="walk" data-min="20" data-commute="1">🚶 行一段（落車後）</button>
    </div>
  </div>
  <div class="card"><h2>最近活動</h2>
    ${list.length ? list.map(a => `<div class="list-item"><div><b>${fmtDate(a.date)}</b> ${ACT_KINDS[a.kind] || a.kind}${a.commute ? '（通勤）' : ''} ${a.minutes} 分鐘
      <div class="small muted">${esc(INTENSITY[a.intensity] || '')}${a.km ? ` · ${a.km} km` : ''}${a.note ? ' · ' + esc(a.note) : ''}</div></div>
      <button class="btn sm ghost" data-act="delAct" data-id="${a.id}">刪除</button></div>`).join('') : '<p class="muted">未有紀錄。</p>'}
  </div>`;
}
function actModal(o) {
  const kinds = Object.entries(ACT_KINDS).map(([k, v]) => `<option value="${k}" ${k === o.kind ? 'selected' : ''}>${v}</option>`).join('');
  const ints = Object.entries(INTENSITY).map(([k, v]) => `<option value="${k}" ${k === (o.int || 'moderate') ? 'selected' : ''}>${v}</option>`).join('');
  modal(`<h2>記錄活動${o.commute ? '（通勤）' : ''}</h2>
    ${o.commute ? '<p class="small muted">通勤都計帶氧！請填實際時間同強度。</p>' : ''}
    <label class="f">類型<select id="aKind">${kinds}</select></label>
    <div class="grid2"><label class="f">分鐘<input id="aMin" type="number" inputmode="numeric" value="${o.min || 30}"></label>
    <label class="f">距離 km（可不填）<input id="aKm" type="number" inputmode="decimal" step="0.1" value="${o.km || ''}"></label></div>
    <label class="f">強度<select id="aInt">${ints}</select></label>
    <label class="f">日期<input id="aDate" type="date" value="${today()}"></label>
    <label class="f">備註<input id="aNote" placeholder="例如：同女朋友、途經吐露港"></label>
    <input type="hidden" id="aCommute" value="${o.commute ? 1 : ''}">
    <div class="grid2"><button class="btn ghost" data-act="closeModal">取消</button><button class="btn" data-act="saveAct">儲存</button></div>`);
}

// ---------- 進度頁 ----------
function vProgress() {
  const weeks = weeklySummaries(12);
  const cur = weeks[weeks.length - 1];
  const lastWaist = S.body.filter(b => b.waist != null).sort((a, b) => a.date.localeCompare(b.date)).pop();
  const waistDue = !lastWaist || diffDays(lastWaist.date, today()) >= C.targets.waistEveryDays;
  const exKeys = [...new Set(S.workouts.flatMap(w => (w.exercises || []).filter(e => !e.altUsed && e.sets.some(s => s.done)).map(e => e.key)))];
  if (!exKeys.includes(UI.strengthEx) && exKeys.length) UI.strengthEx = exKeys[0];
  const ach = C.milestones.map(m => ({ ...m, on: !!S.achieved[m.id] }));
  const steps = weeks.slice(-4).map(w => w.avgSteps).filter(v => v != null);
  return `<div class="grid3" style="margin-bottom:12px">
      <div class="stat"><div class="v">${cur.gym}</div><div class="l">本週 gym</div></div>
      <div class="stat"><div class="v">${cur.cardio}</div><div class="l">本週帶氧分鐘</div></div>
      <div class="stat"><div class="v">${weekStreak()}</div><div class="l">連續達標週</div></div>
      <div class="stat"><div class="v">${gymWorkouts().length}</div><div class="l">總 gym 次數</div></div>
      <div class="stat"><div class="v">${steps.length ? Math.round(avg(steps)) : '–'}</div><div class="l">近 4 週平均步數</div></div>
      <div class="stat"><div class="v">${cur.adherence}%</div><div class="l">本週完成度</div></div>
    </div>
    ${vInsights()}
    <div class="card">
      <h2>身體數據</h2>
      <p class="small muted">體重睇每週平均，唔好睇每日上落（飲水、食鹽都會令體重差 1kg）。${waistDue ? '<b style="color:var(--warn)">今週量一量腰圍吧（肚臍高度、呼氣後量）。</b>' : `下次量腰圍：${shortDate(addDays(lastWaist.date, C.targets.waistEveryDays))}`}</p>
      <div class="grid2"><label class="f">體重 kg<input id="bW" type="number" inputmode="decimal" step="0.1"></label>
      <label class="f">腰圍 cm<input id="bWaist" type="number" inputmode="decimal" step="0.5"></label></div>
      <button class="btn block" data-act="saveBody">儲存今日</button>
      <h3>每週平均體重</h3>${lineChart(weeks.map(w => ({ l: shortDate(w.weekStart), v: w.avgWeight })), 'kg')}
      <h3>腰圍</h3>${lineChart(S.body.filter(b => b.waist != null).sort((a, b) => a.date.localeCompare(b.date)).slice(-12).map(b => ({ l: shortDate(b.date), v: b.waist })), 'cm')}
    </div>
    <div class="card"><h2>每週 gym 次數</h2>${barChart(weeks.map(w => ({ l: shortDate(w.weekStart), v: w.gym })), C.targets.gymMin)}
      <h3>每週帶氧分鐘</h3>${barChart(weeks.map(w => ({ l: shortDate(w.weekStart), v: w.cardio })), C.targets.cardioMinutes)}</div>
    <div class="card"><h2>力量進步</h2>
      ${exKeys.length ? `<select data-act-change="strengthEx">${exKeys.map(k => `<option value="${k}" ${k === UI.strengthEx ? 'selected' : ''}>${esc(C.exercises[k].name)}</option>`).join('')}</select>
      ${strengthChart(UI.strengthEx)}` : '<p class="muted">做完第一次 gym 就會見到圖表。</p>'}
    </div>
    <div class="card"><h2>🏅 里程碑</h2>${ach.map(m => `<div class="ms ${m.on ? '' : 'off'}">${m.on ? '🏅' : '⬜'} ${esc(m.text)}${m.on ? ` <span class="small muted">${shortDate(S.achieved[m.id])}</span>` : ''}</div>`).join('')}</div>
    <div class="card"><h2>📷 進度相（只存喺呢部手機）</h2>
      <p class="small muted">每 ${C.targets.photoEveryDays} 日影一次：正面、側面、背面，同一個位置同燈光。相片唔會匯出，亦唔會上傳。</p>
      <div class="grid2"><select id="pAngle"><option value="front">正面</option><option value="side">側面</option><option value="back">背面</option></select>
      <label class="btn ghost" style="margin-top:4px">選擇相片<input type="file" accept="image/*" id="pFile" class="hidden"></label></div>
      <div id="photoBox" style="margin-top:10px"><p class="muted small">載入中…</p></div>
    </div>
    <div class="card"><h2>每週總結</h2>
      <table class="t"><tr><th>週</th><th>Gym</th><th>帶氧</th><th>步數</th><th>瞓</th><th>體重</th></tr>
      ${weeks.slice().reverse().filter(w => w.logDays).slice(0, 8).map(w => `<tr><td>${shortDate(w.weekStart)}</td><td>${w.gym}</td><td>${w.cardio}</td><td>${w.avgSteps ?? '–'}</td><td>${w.avgSleep ?? '–'}</td><td>${w.avgWeight ?? '–'}${w.weightChange != null ? `<br><span class="muted">${w.weightChange > 0 ? '+' : ''}${w.weightChange}</span>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">未有資料</td></tr>'}
      </table></div>`;
}
function vInsights() {
  const ins = insights();
  const mix = activityMix(28);
  const comp = exerciseCompletion().filter(o => o.planned >= 2);
  const maxMin = Math.max(1, ...mix.list.map(m => m.minutes));
  return `<div class="card"><h2>🧠 教練觀察（自動追蹤）</h2>
    <p class="small muted">App 每次打開都會分析你嘅紀錄，見到需要調整就會喺度提你。撳「套用」即刻改計劃；想大改就匯出俾 Claude。</p>
    ${ins.length ? ins.map(insightHtml).join('') : '<p class="small muted">暫時冇需要調整嘅地方，繼續保持 👍（紀錄越多，觀察越準）</p>'}
    <h3>近 28 日做得多／做得少</h3>
    ${mix.list.length ? mix.list.map(m => `<div style="margin:6px 0"><div class="row between small"><span>${esc(m.label)}</span><span>${m.times} 次 · ${m.minutes} 分鐘</span></div><div class="bar"><i style="width:${Math.round(100 * m.minutes / maxMin)}%"></i></div></div>`).join('') : '<p class="small muted">未有紀錄。</p>'}
    ${mix.missing.length ? `<p class="small muted">近 28 日未做過：${mix.missing.map(esc).join('、')}</p>` : ''}
    ${comp.length ? `<h3>動作完成率</h3>${comp.sort((a, b) => a.done / a.planned - b.done / b.planned).map(o => `<div class="row between small" style="padding:3px 0"><span>${esc(o.name)}</span><span class="${o.done / o.planned < 0.5 ? 'chip warn' : 'muted'}">${o.done}/${o.planned} 次</span></div>`).join('')}` : ''}
  </div>`;
}
function strengthChart(key) {
  const ex = C.exercises[key];
  const pts = S.workouts.slice().sort((a, b) => a.date.localeCompare(b.date)).map(w => {
    const e = (w.exercises || []).find(x => x.key === key && !x.altUsed);
    if (!e) return null;
    const done = e.sets.filter(s => s.done);
    if (!done.length) return null;
    const v = ex.unit === 'kg' ? Math.max(...done.map(s => s.w || 0)) : Math.max(...done.map(s => s.r || 0));
    return { l: shortDate(w.date), v };
  }).filter(Boolean).slice(-16);
  return lineChart(pts, ex.unit === 'kg' ? 'kg（最重一組）' : ex.unit === 'sec' ? '秒' : '下');
}
function lineChart(pts, unit) {
  const p = pts.filter(x => x.v != null);
  if (p.length < 2) return `<p class="small muted">${p.length ? `目前：${p[0].v} ${unit}。` : ''}再多啲記錄就會畫到趨勢線。</p>`;
  const W = 320, H = 140, L = 32, R = 8, T = 10, B = 22;
  let lo = Math.min(...p.map(x => x.v)), hi = Math.max(...p.map(x => x.v));
  if (hi - lo < 1) { lo -= 1; hi += 1; }
  const x = i => L + (W - L - R) * i / (p.length - 1);
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const d = p.map((q, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(q.v).toFixed(1)}`).join('');
  const step = Math.ceil(p.length / 6);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(unit)} 趨勢">
    <line x1="${L}" x2="${W - R}" y1="${y(hi)}" y2="${y(hi)}" stroke="var(--line)"/><line x1="${L}" x2="${W - R}" y1="${y(lo)}" y2="${y(lo)}" stroke="var(--line)"/>
    <text x="2" y="${y(hi) + 3}">${r1(hi)}</text><text x="2" y="${y(lo) + 3}">${r1(lo)}</text>
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
    ${p.map((q, i) => `<circle cx="${x(i)}" cy="${y(q.v)}" r="3.5" fill="var(--accent)"><title>${q.l}: ${q.v}</title></circle>`).join('')}
    ${p.map((q, i) => (i % step === 0 || i === p.length - 1) ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${q.l}</text>` : '').join('')}
  </svg><p class="small muted" style="margin:0">單位：${esc(unit)} · 最新 ${p[p.length - 1].v}</p>`;
}
function barChart(pts, target) {
  const W = 320, H = 130, L = 8, R = 8, T = 14, B = 22;
  const hi = Math.max(target * 1.2, ...pts.map(p => p.v || 0), 1);
  const bw = (W - L - R) / pts.length;
  const y = v => T + (H - T - B) * (1 - v / hi);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="每週數據">
    <line x1="${L}" x2="${W - R}" y1="${y(target)}" y2="${y(target)}" stroke="var(--warn)" stroke-dasharray="4 4"/>
    <text x="${W - R}" y="${y(target) - 3}" text-anchor="end">目標 ${target}</text>
    ${pts.map((p, i) => `<rect x="${L + i * bw + 3}" y="${y(p.v || 0)}" width="${bw - 6}" height="${Math.max(0, H - B - y(p.v || 0))}" rx="3" fill="${(p.v || 0) >= target ? 'var(--accent)' : 'var(--blue)'}"><title>${p.l}: ${p.v}</title></rect>`).join('')}
    ${pts.map((p, i) => i % 2 === pts.length % 2 ? '' : `<text x="${L + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${p.l}</text>`).join('')}
  </svg>`;
}

// ---------- 相片（IndexedDB，只存本機） ----------
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('fc_photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function photoTx(mode, fn) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('photos', mode); const st = tx.objectStore('photos');
    const out = fn(st);
    tx.oncomplete = () => res(out && out.result); tx.onerror = () => rej(tx.error);
  });
}
async function shrink(file) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1080 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
}
let photoUrls = [];
async function fillPhotos() {
  const box = $('#photoBox'); if (!box) return;
  try {
    const all = (await photoTx('readonly', st => st.getAll())) || [];
    photoUrls.forEach(u => URL.revokeObjectURL(u)); photoUrls = [];
    if (!all.length) { box.innerHTML = '<p class="muted small">未有相片。</p>'; return; }
    const byDate = {};
    all.forEach(p => { (byDate[p.date] = byDate[p.date] || {})[p.angle] = p; });
    const dates = Object.keys(byDate).sort().reverse();
    const names = { front: '正面', side: '側面', back: '背面' };
    box.innerHTML = dates.map(d => `<p class="small"><b>${fmtDate(d)}</b></p><div class="photos">${['front', 'side', 'back'].map(a => {
      const p = byDate[d][a];
      if (!p) return `<figure><div style="aspect-ratio:3/4;border-radius:10px;background:var(--card2)"></div><figcaption>${names[a]}</figcaption></figure>`;
      const u = URL.createObjectURL(p.blob); photoUrls.push(u);
      return `<figure><img src="${u}" alt="${names[a]}"><figcaption>${names[a]} <a href="#" data-act="delPhoto" data-id="${p.id}" style="color:var(--danger)">刪</a></figcaption></figure>`;
    }).join('')}</div>`).join('');
  } catch (e) { box.innerHTML = '<p class="muted small">呢個瀏覽器唔支援相片儲存。</p>'; }
}

// ---------- 動作圖鑑 ----------
const L = window.LIBRARY || { groups: {}, items: {} };
const SVG_POSES = {
  birdDog: [
    '<circle cx="52" cy="50" r="8"/><path d="M60 56 L120 58 M68 57 L68 104 M120 58 L120 104 L150 104"/>',
    '<circle cx="52" cy="50" r="8"/><path d="M60 56 L120 58 M68 57 L22 50 M120 58 L178 54 M120 58 L120 104 L150 104"/><path d="M68 57 L68 104" opacity=".35"/>'
  ],
  chestStretch: [
    '<rect x="44" y="6" width="8" height="104" fill="currentColor" stroke="none" opacity=".35"/><circle cx="100" cy="24" r="9"/><path d="M100 33 L100 72 L92 108 M100 72 L108 108 M100 40 L60 40 L60 16"/>',
    '<rect x="44" y="6" width="8" height="104" fill="currentColor" stroke="none" opacity=".35"/><circle cx="116" cy="28" r="9"/><path d="M114 37 L104 72 L92 108 M104 72 L124 108 M112 44 L60 40 L60 16"/>'
  ],
  neckStretch: [
    '<circle cx="100" cy="24" r="10"/><path d="M100 34 L100 76 L88 110 M100 76 L112 110 M100 42 L76 70 M100 42 L124 70"/>',
    '<circle cx="113" cy="30" r="10"/><path d="M100 34 L100 76 L88 110 M100 76 L112 110 M100 42 L76 70 M100 42 L128 26 L118 22"/>'
  ]
};
function animHtml(key, cls = '') {
  const it = L.items[key];
  if (!it) return '';
  if (it.img === 'photo') return `<div class="anim ${cls}"><img src="img/ex/${key}-0.jpg" alt="${esc(it.zh)} 開始姿勢" loading="lazy"><img class="b" src="img/ex/${key}-1.jpg" alt="${esc(it.zh)} 完成姿勢" loading="lazy"></div>`;
  const p = SVG_POSES[key];
  if (!p) return '';
  return `<div class="anim svg ${cls}"><svg viewBox="0 0 200 120" role="img" aria-label="${esc(it.zh)} 示範"><g class="a">${p[0]}</g><g class="b">${p[1]}</g><path d="M8 110 L192 110" opacity=".3"/></svg></div>`;
}
const exLink = (key, text) => L.items[key] ? `<button class="exlink" data-act="exInfo" data-k="${key}">${text} <span class="i">ⓘ</span></button>` : text;
function usedIn(key) {
  return Object.entries(C.workouts).filter(([, w]) => w.exercises.some(s => s.key === key)).map(([, w]) => {
    const s = w.exercises.find(x => x.key === key); return `${w.name}（${s.sets} × ${s.reps[0]}–${s.reps[1]}）`; })
    .concat(C.homeCircuit.keys.includes(key) ? [C.homeCircuit.name] : [], C.recovery.keys.includes(key) ? [C.recovery.name] : []);
}
function exModal(key) {
  const it = L.items[key]; if (!it) return;
  const ex = C.exercises[key];
  const used = usedIn(key);
  const yt = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(`${it.en} 教學`);
  modal(`${animHtml(key, 'lg')}
    <p class="small muted" style="margin:6px 0 0">${it.img !== 'photo' ? '簡單線條示範' : it.swap ? '相片會自動喺左右兩邊之間切換' : '相片會自動喺「開始」同「完成」姿勢之間切換'}</p>
    <h2 style="margin:10px 0 0">${esc(it.zh)}</h2>
    <div class="muted">${esc(it.en)}</div>
    <p class="small"><b>練邊度：</b>${esc(it.muscles)}</p>
    ${it.note ? `<p class="small muted">💡 ${esc(it.note)}</p>` : ''}
    ${it.find ? `<p class="small"><b>🔍 喺 gym 點認：</b>${esc(it.find)}</p>` : ''}
    <h3>步驟</h3><ol class="clean">${it.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
    ${ex ? `<p class="small">✅ <b>重點：</b>${esc(ex.cue)}</p>` : ''}
    <h3>常見錯誤</h3><ul class="clean small">${it.mistakes.map(x => `<li>❌ ${esc(x)}</li>`).join('')}</ul>
    ${ex ? `<p class="small">🔁 <b>冇呢部機／做唔到：</b>${esc(ex.sub)}</p><p class="small muted">休息：${esc(ex.rest)}</p>` : ''}
    ${ex && ex.unit === 'kg' ? weightGuideHtml(false) : ''}
    ${used.length ? `<p class="small"><b>📅 喺你計劃入面：</b>${used.map(esc).join('、')}</p>` : ''}
    <a class="btn block blue" href="${yt}" target="_blank" rel="noopener">▶️ YouTube 搵教學片</a>
    ${it.credit ? `<p class="small muted" style="margin-top:8px">${esc(it.credit)}</p>` : ''}
    <div style="height:8px"></div><button class="btn block ghost" data-act="closeModal">關閉</button>`);
  const box = $('#modalBox'); if (box) box.scrollTop = 0;
}
function vLibrary() {
  const g = UI.libGroup || 'all';
  const plan = new Set(C.phases[phase()].rotation.flatMap(t => C.workouts[t].exercises.map(s => s.key)));
  const entries = Object.entries(L.items).filter(([, it]) => g === 'all' || (g === 'plan' ? false : it.group === g) || (g === 'plan'));
  const list = g === 'plan' ? entries.filter(([k]) => plan.has(k)) : entries;
  return `<div class="card">
    <h2>📖 動作圖鑑</h2>
    <p class="small muted">撳任何動作睇示範、步驟同常見錯誤。喺 gym 唔識部機，就喺度搜尋英文名（例如 "Leg Press"）。</p>
    <input id="libSearch" placeholder="搜尋：腿推、chest、伸展…" autocomplete="off" value="${esc(UI.libQ || '')}">
    <div class="opts" style="margin-top:8px">
      <button class="opt ${g === 'all' ? 'on' : ''}" data-act="libGroup" data-g="all">全部</button>
      <button class="opt ${g === 'plan' ? 'on' : ''}" data-act="libGroup" data-g="plan">⭐ 而家計劃</button>
      ${Object.entries(L.groups).map(([k, v]) => `<button class="opt ${g === k ? 'on' : ''}" data-act="libGroup" data-g="${k}">${v}</button>`).join('')}
    </div>
  </div>
  <div id="libList">${list.map(([k, it]) => `<button class="libitem" data-act="exInfo" data-k="${k}" data-text="${esc((it.zh + ' ' + it.en + ' ' + it.muscles + ' ' + (L.groups[it.group] || '')).toLowerCase())}">
      ${animHtml(k, 'sm')}
      <span class="grow"><b>${esc(it.zh)}</b>${plan.has(k) ? ' <span class="chip ok">計劃</span>' : ''}<br><span class="small muted">${esc(it.en)}</span><br><span class="small muted">${esc(it.muscles)}</span></span>
    </button>`).join('')}</div>
  <p class="small muted" style="text-align:center">${esc(L.credit || '')}</p>`;
}
function filterLibrary() {
  const q = (UI.libQ || '').trim().toLowerCase();
  document.querySelectorAll('#libList .libitem').forEach(el => { el.classList.toggle('hidden', !!q && !el.dataset.text.includes(q)); });
}

// ---------- 飲食頁 ----------
function vFood() {
  const x = day();
  const tgt = waterTarget();
  const N = C.nutrition;
  return `<div class="card hero">
    <h2>💧 今日飲水</h2>
    <div class="big">${r1(x.waterMl / 1000)} / ${tgt / 1000} L</div>
    <div class="bar"><i style="width:${Math.min(100, 100 * x.waterMl / tgt)}%"></i></div>
    <p class="small muted">${tgt > C.targets.waterMl ? '今日有運動，目標多咗 0.5L。' : ''}一支 500ml 水樽 = 2 下「+250」。</p>
    <div class="grid3"><button class="btn ghost" data-act="water" data-ml="-250">−250</button><button class="btn" data-act="water" data-ml="250">+250ml</button><button class="btn" data-act="water" data-ml="500">+500ml</button></div>
  </div>
  <div class="card"><h2>🍳 蛋白質（每餐一份）</h2>
    <p class="small muted">唔使計卡路里。每餐有一份掌心大嘅蛋白質就得：${N.proteinFoods.map(esc).join('、')}。</p>
    <div class="grid3">${[1, 2, 3].map(n => `<button class="check ${x.protein >= n ? 'on' : ''}" data-act="protein" data-n="${n}"><span class="ic">${['🌅', '☀️', '🌙'][n - 1]}</span>${['第 1 餐', '第 2 餐', '第 3 餐'][n - 1]}</button>`).join('')}</div>
    <p class="small muted" style="margin-top:8px">${esc(N.shakeNote)}</p></div>
  <div class="card"><h2>🥤 飲品換一換</h2>${N.drinkSwaps.map(([a, b]) => `<div class="list-item"><span>${esc(a)}</span><span>→ <b>${esc(b)}</b></span></div>`).join('')}</div>
  <div class="card"><h2>🍜 出街食點揀</h2>${N.eatingOut.map(e => `<div class="list-item"><div><b>${esc(e.place)}</b><div class="small">${esc(e.tip)}</div></div></div>`).join('')}
    <p class="small muted">每餐盡量加一份菜：叫「多菜」、加一碟油菜（走油），或者揀有菜嘅套餐。</p></div>
  <div class="card"><p class="small muted">你體重本身正常，唔需要節食。目標係「多啲蛋白質 + 少啲甜飲」，肚腩會慢慢細，肌肉會慢慢多。</p></div>`;
}

// ---------- 設定 / 匯出 ----------
function settingsModal() {
  const p = S.profile;
  modal(`<h2>設定</h2>
    <label class="f">暱稱<input id="sName" value="${esc(p.nickname)}" maxlength="20"></label>
    <div class="grid2"><label class="f">身高 cm<input id="sH" type="number" value="${esc(p.heightCm)}"></label>
    <label class="f">開始日期<input id="sStart" type="date" value="${esc(p.startDate)}"></label></div>
    <label class="row f"><input type="checkbox" id="sGf" ${p.gfMode ? 'checked' : ''}> 女朋友模式（建議一齊做嘅活動）</label>
    <label class="row f"><input type="checkbox" id="sNoGym" ${p.noGym ? 'checked' : ''}> 未有 gym 會籍（gym 日暫時改做屋企徒手肌力同帶氧）</label>
    <label class="f">屋企位置（通勤地圖終點，只存喺你嘅私人資料）<input id="sHome" value="${esc(p.home || '')}" placeholder="${esc(C.commute.homeDefault)}"></label>
    <button class="btn block ghost" data-act="openRoster" style="margin-bottom:8px">📅 班表同上落班時間</button>
    <label class="f">訓練階段<select id="sPhase"><option value="auto" ${p.phaseOverride === 'auto' ? 'selected' : ''}>自動（建議）</option><option value="1" ${p.phaseOverride === '1' ? 'selected' : ''}>固定第 1 階段</option><option value="2" ${p.phaseOverride === '2' ? 'selected' : ''}>固定第 2 階段</option></select></label>
    <button class="btn block" data-act="saveSettings">儲存設定</button>
    <h3 style="margin-top:20px">☁️ 多裝置同步（GitHub 私人 repo）</h3>
    <p class="small" id="syncStatus">${esc(syncStatusText())}</p>
    <p class="small muted">每次記錄完都會自動上傳；喺另一部機打開會自動合併。Token 只存喺呢部機，唔會匯出，亦唔會上載。相片唔同步。</p>
    <label class="f">Repo<input id="syRepo" value="${esc(SY.repo || 'benleung2004/fitness-data')}" autocapitalize="off" autocorrect="off"></label>
    <label class="f">呢部機叫咩（方便睇紀錄）<input id="syName" value="${esc(SY.name || '')}" placeholder="例如 iPhone、Mac"></label>
    <label class="f">GitHub Token<input id="syToken" type="password" autocomplete="off" autocapitalize="off" placeholder="${SY.token ? '已設定（想換先填）' : 'github_pat_…'}"></label>
    <div class="grid2"><button class="btn" data-act="connectSync">${SY.token ? '儲存並同步' : '連接並同步'}</button><button class="btn ghost" data-act="syncNowBtn" ${syncReady() ? '' : 'disabled'}>立即同步</button></div>
    ${SY.token ? '<div style="height:8px"></div><button class="btn sm danger" data-act="disconnectSync">喺呢部機中斷同步（唔會刪資料）</button>' : ''}
    <p class="small muted">本機保護：${UI.persisted ? '✅ 已啟用永久儲存' : '瀏覽器未確認永久儲存（加入主畫面後會較穩陣）'}</p>
    <h3 style="margin-top:20px">🔧 目前嘅自動調整</h3>
    ${adjustList().length ? adjustList().map(a => `<div class="list-item"><span class="small">${esc(a.text)}</span><button class="btn sm ghost" data-act="resetAdjust" data-k="${esc(a.k)}">還原</button></div>`).join('') : '<p class="small muted">未有。教練觀察建議調整時，你撳「套用」就會出現喺度。</p>'}
    <h3 style="margin-top:20px">🤖 交俾 Claude 調整</h3>
    <p class="small muted">匯出你所有紀錄（唔包括相片），連埋 App 自動分析出嚟嘅「教練觀察」、做得多／做得少、動作完成率。AirDrop 或者傳去 Mac 嘅 <code>Desktop/fitness-coach/logs/</code>，再喺 Claude Code 講「睇最新 log 幫我調整」。Claude 會睇晒全部紀錄，就算你乜都唔寫都會分析。</p>
    <label class="f">想 Claude 特別幫你改咩？（可以唔填）<textarea id="sNote" placeholder="例如：晚更好難去 gym，想改返工前 30 分鐘版本">${esc(S.noteForClaude)}</textarea></label>
    <button class="btn block blue" data-act="exportClaude">📤 匯出俾 Claude（JSON）</button>
    <div style="height:8px"></div>
    <button class="btn block ghost" data-act="copySummary">📋 複製文字摘要（可以直接貼俾 Claude）</button>
    <h3 style="margin-top:20px">備份</h3>
    <p class="small muted">匯出嘅 JSON 亦都係備份。換手機或者清咗瀏覽器資料，用「匯入」攞返。</p>
    <label class="btn block ghost">📥 匯入 JSON 備份<input type="file" accept="application/json,.json" id="importFile" class="hidden"></label>
    <div style="height:16px"></div>
    <button class="btn block danger" data-act="resetAll">清除全部資料</button>
    <p class="small muted" style="text-align:center">版本 ${esc(C.version)}</p>
    <button class="btn block ghost" data-act="closeModal">關閉</button>`);
}
function exportData() {
  return {
    app: 'fitness-coach', exportedAt: new Date().toISOString(), configVersion: C.version,
    noteForClaude: S.noteForClaude, noteUpd: S.noteUpd || 0, deleted: S.deleted || {}, reviewSeen: S.reviewSeen || '', lastBackup: S.lastBackup || '',
    current: { phase: phase(), week: weekNo(), nextTemplate: nextTemplate(), weekStreak: weekStreak() },
    insights: insights().map(({ id, level, title, detail }) => ({ id, level, title, detail })),
    activityMix: activityMix(28),
    exerciseCompletion: exerciseCompletion().map(({ key, name, planned, done }) => ({ key, name, planned, done })),
    adjustments: adj(), adjustLog: S.adjustLog || [], dismissedInsights: S.insightSeen || {},
    weeklySummaries: weeklySummaries(12),
    roster: S.roster || {}, gfRoster: S.gfRoster || {}, shiftTimes: S.shiftTimes || null, shiftTimesEffective: shiftTimes(), plan7: planDays(today(), 7).map(p => ({ date: p.date, shift: p.shift, gfShift: gfShift(p.date), kind: p.kind, text: planText(p), together: togetherText(p.date) })),
    profile: S.profile, body: S.body, workouts: S.workouts, activities: S.activities, days: S.days, achieved: S.achieved
  };
}
async function exportClaude() {
  const json = JSON.stringify(exportData(), null, 2);
  const name = `fitness-log-${today()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function summaryText() {
  const w = weeklySummaries(8).filter(x => x.logDays);
  const recent = S.workouts.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const lines = [`# 健身紀錄摘要（${today()}）`, `第 ${weekNo()} 週 · 第 ${phase()} 階段 · 總 gym ${gymWorkouts().length} 次 · 連續達標 ${weekStreak()} 週`, ''];
  if (S.noteForClaude) lines.push(`## 我想調整`, S.noteForClaude, '');
  const ins = insights();
  if (ins.length) { lines.push('## App 自動觀察'); ins.forEach(i => lines.push(`- [${i.level}] ${i.title}：${i.detail}`)); lines.push(''); }
  const mix = activityMix(28);
  lines.push('## 近 28 日做得多／少', ...mix.list.map(m => `- ${m.label}: ${m.times} 次 / ${m.minutes} 分鐘`), mix.missing.length ? `- 未做過：${mix.missing.join('、')}` : '', '');
  if (hasRoster()) lines.push('## 未來 7 日班表計劃', ...planDays(today(), 7).map(p => `- ${p.date} ${p.shift ? shiftLabel(p.shift, p.date) : '未入班'}：${planText(p)}${togetherText(p.date) ? '；' + togetherText(p.date) : ''}`), '');
  const al = adjustList();
  if (al.length) lines.push('## 已套用嘅自動調整', ...al.map(a => '- ' + a.text), '');
  lines.push('## 每週', '| 週一 | gym | 帶氧分 | 步數 | 瞓 | 水L | 體重 | 完成度 |', '|---|---|---|---|---|---|---|---|');
  w.forEach(x => lines.push(`| ${x.weekStart} | ${x.gym} | ${x.cardio} | ${x.avgSteps ?? '-'} | ${x.avgSleep ?? '-'} | ${x.avgWaterL ?? '-'} | ${x.avgWeight ?? '-'} | ${x.adherence}% |`));
  lines.push('', '## 最近訓練');
  recent.forEach(r => {
    lines.push(`- ${r.date} ${workoutName(r)}${r.minutes ? ` ${r.minutes}分鐘` : ''}${r.pain && r.pain !== 'none' ? ` 痛:${PAIN[r.pain]}` : ''}`);
    (r.exercises || []).forEach(e => { const d = e.sets.filter(s => s.done); if (d.length) lines.push(`  - ${C.exercises[e.key].name}: ${d.map(s => `${s.w ?? ''}${s.w != null ? 'kg×' : ''}${s.r ?? '?'}@${s.rpe ?? '-'}`).join(', ')}${e.note ? `（${e.note}）` : ''}`); });
  });
  const ci = Object.entries(S.days).filter(([, v]) => v.checkin).sort().slice(-14);
  if (ci.length) { lines.push('', '## 最近問答'); ci.forEach(([d, v]) => lines.push(`- ${d} ${C.shifts[v.checkin.shift]?.name || '-'} 精神:${v.checkin.energy} 瞓:${v.checkin.sleepQ} 痛:${PAIN[v.checkin.pain]} 時間:${v.checkin.time} 想做:${v.checkin.pref}`)); }
  return lines.join('\n');
}

// ---------- 里程碑 ----------
function checkMilestones() {
  const g = gymWorkouts().length;
  const hit = {
    firstGym: g >= 1, gym10: g >= 10, gym20: g >= 20, gym30: g >= 30,
    weeks4: weekStreak() >= 4,
    cardio150: weeklySummaries(52).some(w => w.cardio >= C.targets.cardioMinutes),
    firstCommute: S.activities.some(a => a.commute),
    commuteRun: S.activities.some(a => a.commute && a.kind === 'run'),
    log7: Object.keys(S.days).filter(hasLog).length >= 7,
    log30: Object.keys(S.days).filter(hasLog).length >= 30
  };
  const fresh = C.milestones.filter(m => hit[m.id] && !S.achieved[m.id]);
  fresh.forEach(m => { S.achieved[m.id] = today(); });
  if (fresh.length) { save(); setTimeout(() => toast('🏅 新里程碑：' + fresh.map(m => m.text).join('、')), 600); }
}

// ---------- 計時器 ----------
let timerEnd = 0, timerInt = null;
function startTimer(secs) {
  timerEnd = Date.now() + secs * 1000;
  $('#timer').classList.remove('hidden', 'done');
  clearInterval(timerInt); timerInt = setInterval(tick, 250); tick();
}
function tick() {
  const left = Math.round((timerEnd - Date.now()) / 1000);
  const v = Math.max(0, left);
  $('#timerTime').textContent = `${Math.floor(v / 60)}:${pad(v % 60)}`;
  if (left <= 0 && !$('#timer').classList.contains('done')) {
    $('#timer').classList.add('done'); $('#timerTime').textContent = '可以做下一組！';
    try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
    beep();
    clearInterval(timerInt);
  }
}
function stopTimer() { clearInterval(timerInt); $('#timer').classList.add('hidden'); }
let actx;
function beep() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach(t => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(actx.destination);
      o.start(actx.currentTime + t); o.stop(actx.currentTime + t + 0.15);
    });
  } catch (e) {}
}

// ---------- 彈出 / 提示 ----------
function modal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modalBox').innerHTML = ''; }
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2600); }

function addActivity(a) {
  S.activities.push(Object.assign({ id: uid(), at: Date.now() }, a));
  save(); checkMilestones(); render();
}

// ---------- 事件 ----------
const actions = {
  pick(el) { UI.draft[el.dataset.name] = el.dataset.name === 'time' ? Number(el.dataset.v) : el.dataset.v; render(); },
  submitCheckin() {
    if (!UI.draft.shift) { toast('先揀今日班次'); return; }
    day().checkin = Object.assign({}, UI.draft, { at: Date.now() }); UI.draft = null; UI.editCheckin = false; save(); render(); window.scrollTo(0, 0);
  },
  editCheckin() { UI.editCheckin = true; UI.draft = null; render(); },
  onboard() {
    const w = num($('#obW').value);
    S.profile.nickname = $('#obName').value.trim();
    S.profile.heightCm = num($('#obH').value) || '';
    S.profile.startDate = $('#obStart').value || today();
    S.profile.gfMode = $('#obGf').checked;
    S.profile.onboarded = true;
    S.profile.upd = Date.now();
    if (w) S.body.push({ id: uid(), date: today(), weight: w, waist: null, upd: Date.now() });
    save(); render();
  },
  dunno() {
    const ci = day().checkin || { shift: 'rest', energy: 'normal', sleepQ: 'ok', pain: 'none', time: 45, pref: 'any' };
    const rec = recommend(ci);
    modal(`<div class="muted small">${day().checkin ? '根據你今日嘅答案' : '你未答今日問題，當你休息日、精神普通、有 45 分鐘'}</div>
      <div class="big" style="font-size:22px;font-weight:800;margin:8px 0">${rec.icon} ${esc(rec.title)}</div>
      <p>${esc(rec.summary)}</p>${rec.minimum ? `<p class="small">🪫 ${esc(rec.minimum)}</p>` : ''}
      ${rec.kind === 'gym' ? `<button class="btn block" data-act="startGym" data-t="${rec.template}" data-mode="${rec.mode}">開始</button>` : ''}
      ${rec.kind === 'cardio' ? `<button class="btn block" data-act="logAct" data-kind="${rec.cardioKind}" data-min="${rec.minutes}">做完，記錄</button>` : ''}
      <div style="height:8px"></div><button class="btn block ghost" data-act="closeModal">好，去做！</button>`);
  },
  lowMode() {
    modal(`<h2>🌙 ${esc(C.recovery.name)}</h2><p class="small muted">${esc(C.recovery.note)}</p>
      ${C.recovery.steps.map((s, i) => `<div class="row" style="padding:8px 0;border-top:1px solid var(--line);flex-wrap:nowrap"><input type="checkbox" aria-label="完成"> <span class="grow">${exLink(C.recovery.keys[i], esc(s))}</span></div>`).join('')}
      <div class="grid2" style="margin-top:12px"><button class="btn ghost" data-act="closeModal">關閉</button><button class="btn" data-act="logRecovery">完成</button></div>`);
  },
  logRecovery() { closeModal(); addActivity({ date: today(), kind: 'recovery', minutes: 15, intensity: 'light', note: '恢復模式' }); toast('做得好，去休息啦 🌙'); },
  logHome() {
    S.workouts.push({ id: uid(), at: Date.now(), date: today(), type: 'home', minutes: C.homeCircuit.minutes, exercises: [] });
    save(); checkMilestones(); render(); toast('屋企訓練完成 💪');
  },
  toggleCheck(el) {
    const k = el.dataset.k, x = day();
    const auto = autoChecks()[k];
    if (auto && !x.check[k]) { toast('已經自動完成咗 ✅'); return; }
    x.check[k] = !x.check[k]; save(); render();
  },
  quickGym() {
    const t = nextTemplate();
    if (!confirm(`記錄「${C.workouts[t].name}」已完成？（冇逐組記錄，唔會計入加重建議）`)) return;
    S.workouts.push({ id: uid(), at: Date.now(), date: today(), type: t, quick: true, exercises: [] });
    save(); checkMilestones(); render(); toast('Gym 完成 ✅');
  },
  water2L() { const x = day(); x.waterMl = Math.max(x.waterMl, 2000); save(); render(); toast('💧 已記錄 2L'); },
  slept7() { day().sleepH = 7; save(); render(); toast('😴 已記錄 7 小時'); },
  water(el) { const x = day(); x.waterMl = Math.max(0, x.waterMl + Number(el.dataset.ml)); save(); render(); },
  protein(el) { const x = day(); const n = Number(el.dataset.n); x.protein = x.protein === n ? n - 1 : n; save(); render(); },
  applyInsight(el) { applyInsight(el.dataset.id); render(); toast('已調整計劃，可以喺設定還原'); },
  dismissInsight(el) { (S.insightSeen = S.insightSeen || {})[el.dataset.id] = today(); save(); render(); },
  resetAdjust(el) {
    const A = adj(), [type, k] = el.dataset.k.split(':');
    if (type === 'skip') delete A.skip[k];
    if (type === 'deload') delete A.deload[k];
    if (type === 'shortDefault') A.shortDefault = false;
    if (type === 'shift') delete A.shiftPref[k];
    A.upd = Date.now();
    save(); settingsModal(); render(); toast('已還原');
  },
  connectSync() {
    const repo = $('#syRepo').value.trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) { toast('Repo 格式應該係「帳戶名/repo名」'); return; }
    const tok = $('#syToken').value.trim();
    if (!tok && !SY.token) { toast('請貼上 GitHub token'); return; }
    SY.repo = repo; SY.name = $('#syName').value.trim(); if (tok) SY.token = tok;
    SY.lastError = ''; saveSY();
    $('#syToken').value = '';
    syncNow(true).then(() => settingsModal());
  },
  syncNowBtn() { syncNow(true); },
  disconnectSync() {
    if (!confirm('喺呢部機中斷同步？資料會保留喺呢部機同 GitHub，之後可以再連接。')) return;
    delete SY.token; SY.lastError = ''; saveSY(); settingsModal(); toast('已中斷');
  },
  backupNow() { S.lastBackup = today(); save(); exportClaude(); render(); },
  exInfo(el) { exModal(el.dataset.k); },
  libGroup(el) { UI.libGroup = el.dataset.g; render(); },
  seenReview(el) { S.reviewSeen = el.dataset.w; save(); render(); },
  startGym(el) {
    closeModal();
    if (S.active && !confirm('有一個未完成嘅訓練，要放棄佢重新開始？')) { UI.tab = 'train'; render(); return; }
    startGym(el.dataset.t, el.dataset.mode || 'normal');
  },
  doneSet(el) {
    const it = S.active.items[el.dataset.i], s = it.sets[el.dataset.j];
    s.done = !s.done;
    if (s.done && s.r === '') s.r = it.reps[1];
    if (s.done && S.active.guided) {
      it.sets.forEach(x => { if (!x.done && s.w !== '') x.w = s.w; });
      if (curSet(it) < 0) {
        const k = S.active.items.findIndex(x => curSet(x) >= 0);
        if (k >= 0) { UI.gi = k; toast(`下一個動作：${C.exercises[S.active.items[k].key].name}`); }
      }
    }
    save(); render();
    if (s.done && S.active.guided) window.scrollTo(0, 0);
    if (s.done) startTimer(restSecs(it.key));
  },
  addSet(el) { const it = S.active.items[el.dataset.i]; const l = it.sets[it.sets.length - 1]; it.sets.push({ w: l ? l.w : '', r: '', rpe: '', done: false }); save(); render(); },
  finishGym,
  cancelGym() { if (confirm('確定放棄？今次記錄唔會儲存。')) { S.active = null; stopTimer(); keepAwake(false); save(); render(); } },
  guidedOn() { S.active.guided = true; UI.gi = null; persist(); keepAwake(true); render(); window.scrollTo(0, 0); },
  guidedOff() { S.active.guided = false; persist(); keepAwake(false); render(); window.scrollTo(0, 0); },
  gGo(el) { const k = Number(el.dataset.i); if (S.active && k >= 0 && k < S.active.items.length) { UI.gi = k; render(); window.scrollTo(0, 0); } },
  delWorkout(el) { if (confirm('刪除呢個訓練紀錄？')) { S.deleted[el.dataset.id] = Date.now(); S.workouts = S.workouts.filter(w => w.id !== el.dataset.id); save(); render(); } },
  delAct(el) { if (confirm('刪除呢個活動？')) { S.deleted[el.dataset.id] = Date.now(); S.activities = S.activities.filter(a => a.id !== el.dataset.id); save(); render(); } },
  logAct(el) { closeModal(); actModal({ kind: el.dataset.kind, min: el.dataset.min, km: el.dataset.km, commute: !!el.dataset.commute, int: el.dataset.int }); },
  saveAct() {
    const minutes = num($('#aMin').value);
    if (!minutes || minutes <= 0) { toast('請填分鐘'); return; }
    const a = { date: $('#aDate').value || today(), kind: $('#aKind').value, minutes, intensity: $('#aInt').value,
                km: num($('#aKm').value), commute: !!$('#aCommute').value, note: $('#aNote').value.trim() };
    closeModal(); addActivity(a); toast(`已記錄 ${minutes} 分鐘 👍`);
  },
  saveBody() {
    const w = num($('#bW').value), waist = num($('#bWaist').value);
    if (w == null && waist == null) { toast('填體重或者腰圍'); return; }
    const ex = S.body.find(b => b.date === today());
    if (ex) { if (w != null) ex.weight = w; if (waist != null) ex.waist = waist; ex.upd = Date.now(); }
    else S.body.push({ id: uid(), date: today(), weight: w, waist, upd: Date.now() });
    save(); render(); toast('已儲存');
  },
  async delPhoto(el) { if (confirm('刪除呢張相？')) { await photoTx('readwrite', st => st.delete(el.dataset.id)); fillPhotos(); } },
  openSettings() { settingsModal(); },
  toggleRestDay(el) {
    const d = el.dataset.d || today(), x = day(d);
    x.restDay = !x.restDay; x.restUpd = Date.now();
    save(); render(); toast(x.restDay ? `${d === today() ? '今日' : shortDate(d)}唔做運動 😌 行路照計` : '已取消');
  },
  toggleNoGym() { S.profile.noGym = !S.profile.noGym; S.profile.upd = Date.now(); save(); render(); toast(S.profile.noGym ? '已改：gym 日暫時做屋企徒手肌力' : '已改返：gym 日去 gym 💪'); },
  openRoster() { UI.rosterWho = 'me'; rosterModal(); },
  rosterWho(el) { UI.rosterWho = el.dataset.w; rosterModal(); },
  setRoster(el) {
    const key = el.dataset.who === 'gf' ? 'gfRoster' : 'roster';
    const d = el.dataset.d, v = (key === 'gfRoster' ? gfShift(d) : rosterShift(d)) === el.dataset.s ? '' : el.dataset.s;
    S[key] = S[key] || {};
    S[key][d] = { s: v, upd: Date.now() };
    el.parentNode.querySelectorAll('.seg-b').forEach(b => b.classList.toggle('on', b.dataset.s === v));
    save(); render();
  },
  saveShiftTimes() {
    const t = {};
    const ok = v => toMin(v) != null;
    for (const k of ['early', 'office', 'middle', 'night']) {
      const a = $(`#t-${k}-s`).value, b = $(`#t-${k}-e`).value;
      if (!ok(a) || !ok(b)) { toast(`請填好${C.shifts[k].name}時間`); return; }
      t[k] = { start: a, end: b };
    }
    const f = $('#t-office-f').value;
    if (!ok(f)) { toast('請填好星期五放工時間'); return; }
    t.office.endFri = f;
    S.shiftTimes = { t, upd: Date.now() };
    save(); render(); toast('已儲存上落班時間');
  },
  closeModal,
  saveSettings() {
    const p = S.profile;
    p.nickname = $('#sName').value.trim(); p.heightCm = num($('#sH').value) || '';
    p.startDate = $('#sStart').value || p.startDate; p.gfMode = $('#sGf').checked; p.phaseOverride = $('#sPhase').value; p.home = $('#sHome').value.trim(); p.noGym = $('#sNoGym').checked; p.upd = Date.now();
    setNote($('#sNote').value);
    save(); closeModal(); render(); toast('已儲存設定');
  },
  exportClaude() { setNote($('#sNote').value); S.lastBackup = today(); save(); exportClaude(); },
  async copySummary() {
    setNote($('#sNote').value); save();
    try { await navigator.clipboard.writeText(summaryText()); toast('已複製，可以貼俾 Claude'); }
    catch (e) { modal(`<h2>摘要</h2><textarea style="min-height:50vh">${esc(summaryText())}</textarea><button class="btn block ghost" data-act="closeModal">關閉</button>`); }
  },
  resetAll() {
    if (!confirm('會清除呢部機所有紀錄（相片除外）。建議先匯出備份。確定？')) return;
    if (!confirm('真係確定？呢個動作冇得還原。')) return;
    localStorage.removeItem(KEY); S = blank(); closeModal(); render();
  },
  timerAdd(el) { timerEnd += Number(el.dataset.s) * 1000; if ($('#timer').classList.contains('done')) { $('#timer').classList.remove('done'); clearInterval(timerInt); timerInt = setInterval(tick, 250); } tick(); },
  timerStop() { stopTimer(); }
};

document.addEventListener('click', e => {
  const tab = e.target.closest('[data-tab]');
  if (tab) { UI.tab = tab.dataset.tab; UI.editCheckin = false; render(); window.scrollTo(0, 0); return; }
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT') return;
  if (el.tagName === 'A') e.preventDefault();
  const fn = actions[el.dataset.act];
  if (fn) fn(el);
});
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset.set) { setField(t); return; }
  if (t.dataset.alt != null) { S.active.items[t.dataset.alt].altUsed = t.checked; save(); return; }
  if (t.dataset.actChange === 'strengthEx') { UI.strengthEx = t.value; render(); return; }
  if (t.dataset.field) {
    const v = num(t.value); const x = day(); x[t.dataset.field] = v; save(); render(); return;
  }
  if (t.id === 'pFile' && t.files[0]) {
    try {
      const blob = await shrink(t.files[0]);
      await photoTx('readwrite', st => st.put({ id: uid(), date: today(), angle: $('#pAngle').value, blob }));
      toast('相片已存（只喺呢部機）'); fillPhotos();
    } catch (err) { toast('存唔到相片'); }
    t.value = '';
    return;
  }
  if (t.id === 'importFile' && t.files[0]) {
    try {
      const d = JSON.parse(await t.files[0].text());
      if (d.app !== 'fitness-coach' || !Array.isArray(d.workouts)) throw new Error('格式唔啱');
      if (!confirm(`將 ${d.exportedAt ? d.exportedAt.slice(0, 10) : ''} 嘅備份合併入呢部機？（唔會刪走現有紀錄，同一筆以較新為準）`)) return;
      mergeData(d);
      save(); closeModal(); render(); toast('合併完成');
    } catch (err) { toast('匯入失敗：' + err.message); }
  }
});
// 訓練輸入：打字時即時儲存（唔重畫，避免收起鍵盤）
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.set) setField(t, true);
  if (t.id === 'libSearch') { UI.libQ = t.value; filterLibrary(); }
  if (t.dataset.note != null && S.active) { S.active.items[t.dataset.note].note = t.value; persist(); }
});
function setField(t) {
  if (!S.active) return;
  const [i, j, f] = t.dataset.set.split(',');
  S.active.items[i].sets[j][f] = t.value; persist();
}
function setNote(v) { v = (v || '').trim(); if (v !== S.noteForClaude) { S.noteForClaude = v; S.noteUpd = Date.now(); } }

// ---------- 啟動 ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
// 叫瀏覽器將資料列為「永久儲存」，減少被自動清走嘅機會
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(v => { UI.persisted = v; }); } catch (e) {}
render();
checkMilestones();
loadWeather();
loadSun();
syncNow(false);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { render(); loadWeather(); loadSun(); syncNow(false); if (S.active && S.active.guided) keepAwake(true); }
  else if (syncTimer) syncNow(false); // 收埋 App 之前，即刻上傳未同步嘅改動
});
window.addEventListener('online', () => syncNow(false));
})();
