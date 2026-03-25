"use client";
import { useState, useCallback, useRef, useEffect } from "react";

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #F0EDE6;
  --card: #FFFFFF;
  --border: #E0D8CC;
  --border2: #D0C8B8;
  --text: #1A1A1A;
  --text2: #555;
  --text3: #888;
  --accent: #C5444A;
  --accent2: #1565C0;
  --accent3: #2E7D32;
  --accent4: #F57F17;
  --shadow: 0 2px 12px rgba(0,0,0,0.08);
  --shadow2: 0 8px 32px rgba(0,0,0,0.12);
  --radius: 10px;
  --radius-sm: 6px;
}
body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #C8C0B0; border-radius: 3px; }

/* Buttons */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: var(--radius-sm); border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500; transition: all 0.18s; white-space: nowrap; line-height: 1; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-dark { background: var(--text); color: var(--bg); }
.btn-dark:hover:not(:disabled) { background: #333; transform: translateY(-1px); box-shadow: var(--shadow2); }
.btn-outline { background: transparent; color: var(--text); border: 1.5px solid var(--border2); }
.btn-outline:hover:not(:disabled) { border-color: var(--text); background: rgba(0,0,0,0.04); }
.btn-red { background: var(--accent); color: white; }
.btn-red:hover:not(:disabled) { background: #A83840; transform: translateY(-1px); box-shadow: var(--shadow2); }
.btn-green { background: var(--accent3); color: white; }
.btn-green:hover:not(:disabled) { background: #1B5E20; transform: translateY(-1px); }
.btn-ghost { background: transparent; color: var(--text3); border: 1px solid var(--border); }
.btn-ghost:hover:not(:disabled) { color: var(--text); border-color: #999; }
.btn-sm { padding: 5px 11px; font-size: 12px; }
.btn-xs { padding: 3px 8px; font-size: 11px; }

/* Inputs */
.inp { width: 100%; padding: 8px 11px; border: 1.5px solid var(--border2); border-radius: var(--radius-sm); font-family: inherit; font-size: 13px; background: white; outline: none; transition: border-color 0.2s; color: var(--text); }
.inp:focus { border-color: var(--text); }
.inp-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.sel { width: 100%; padding: 8px 32px 8px 11px; border: 1.5px solid var(--border2); border-radius: var(--radius-sm); font-family: inherit; font-size: 13px; background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7'%3E%3Cpath d='M0 0l5.5 7L11 0z' fill='%23888'/%3E%3C/svg%3E") no-repeat right 11px center; outline: none; cursor: pointer; appearance: none; color: var(--text); }
.sel:focus { border-color: var(--text); }
.bench-inp { width: 72px; padding: 5px 7px; border: 1.5px solid var(--border2); border-radius: var(--radius-sm); font-family: 'JetBrains Mono', monospace; font-size: 12px; text-align: right; outline: none; background: white; }
.bench-inp:focus { border-color: var(--text); }
textarea.inp { resize: vertical; min-height: 80px; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.5; }

/* Cards */
.card { background: var(--card); border-radius: var(--radius); padding: 20px; border: 1px solid var(--border); }
.card-sm { background: var(--card); border-radius: var(--radius-sm); padding: 14px; border: 1px solid var(--border); }

/* Tags */
.tag { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; }
.tag-g { background: #E8F5E9; color: #2E7D32; }
.tag-r { background: #FFEBEE; color: #C62828; }
.tag-b { background: #E3F2FD; color: #1565C0; }
.tag-y { background: #FFF8E1; color: #F57F17; }
.tag-p { background: #F3E5F5; color: #6A1B9A; }
.tag-o { background: #FFF3E0; color: #E65100; }
.tag-dk { background: #1A1A1A; color: #F0EDE6; }
.tag-teal { background: #E0F7FA; color: #006064; }
.tag-pink { background: #FCE4EC; color: #880E4F; }

/* Toggle */
.toggle { width: 38px; height: 20px; background: #D0C8B8; border-radius: 10px; cursor: pointer; transition: background 0.2s; position: relative; flex-shrink: 0; }
.toggle.on { background: var(--text); }
.toggle::after { content: ''; position: absolute; width: 16px; height: 16px; background: white; border-radius: 50%; top: 2px; left: 2px; transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.toggle.on::after { left: 20px; }
.toggle-sm { width: 28px; height: 16px; }
.toggle-sm::after { width: 12px; height: 12px; }
.toggle-sm.on::after { left: 14px; }

/* Tabs */
.tab { padding: 8px 16px; border: none; background: transparent; font-family: inherit; font-size: 13px; font-weight: 500; color: var(--text3); cursor: pointer; border-bottom: 2.5px solid transparent; transition: all 0.18s; white-space: nowrap; }
.tab.on { color: var(--text); border-bottom-color: var(--accent); }
.tab:hover:not(.on) { color: #444; }

/* Q sidebar item */
.q-item { padding: 8px 12px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12.5px; color: var(--text2); transition: all 0.13s; border: 1px solid transparent; line-height: 1.4; }
.q-item:hover { background: #E8E4DA; color: var(--text); }
.q-item.on { background: var(--text); color: var(--bg); }

/* Animations */
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.fade-in { animation: fadeIn 0.3s ease both; }
.slide-in { animation: slideIn 0.25s ease both; }

/* Progress */
.progress-bar { height: 4px; background: #E0D8CC; border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.4s ease; }

/* Tables */
.data-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.data-table th { background: var(--bg); padding: 8px 10px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text3); border-bottom: 2px solid var(--border); text-align: left; white-space: nowrap; }
.data-table th.total-col { background: var(--text); color: var(--bg); text-align: right; }
.data-table td { padding: 7px 10px; border-bottom: 1px solid #F4F2EE; }
.data-table tr:hover td { background: #FAFAF8; }
.data-table .num { text-align: right; font-family: 'JetBrains Mono', monospace; }
.data-table .total-val { font-weight: 700; font-family: 'JetBrains Mono', monospace; text-align: right; }

/* Hist bars */
.hist-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.hist-label { font-size: 11px; color: var(--text3); width: 72px; text-align: right; flex-shrink: 0; font-family: 'JetBrains Mono', monospace; }
.hist-track { flex: 1; height: 16px; background: var(--bg); border-radius: 3px; overflow: hidden; }
.hist-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
.hist-val { font-size: 11px; color: var(--text2); width: 60px; text-align: right; flex-shrink: 0; font-family: 'JetBrains Mono', monospace; }

/* Pre/post delta pills */
.delta { display: inline-block; padding: 1px 7px; border-radius: 12px; font-size: 10.5px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.delta-up { background: #FFEBEE; color: #C62828; }
.delta-down { background: #E8F5E9; color: #2E7D32; }
.delta-ok { background: var(--bg); color: var(--text3); }

/* Section header */
.section-title { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text3); margin-bottom: 12px; }

/* Upload zone */
.upload-zone { border: 2px dashed var(--border2); border-radius: var(--radius); padding: 32px 24px; cursor: pointer; transition: all 0.2s; text-align: center; background: white; }
.upload-zone:hover, .upload-zone.drag { border-color: var(--text); background: #F8F6F2; }
.upload-zone.has-file { border-color: var(--accent3); border-style: solid; background: #F0FFF4; }

/* Notification */
.notif { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; }
.notif-item { background: var(--text); color: var(--bg); border-radius: var(--radius-sm); padding: 12px 18px; font-size: 13px; font-weight: 500; box-shadow: var(--shadow2); animation: fadeIn 0.3s ease; max-width: 340px; display: flex; align-items: center; gap: 10px; }
.notif-item.success { background: #1B5E20; }
.notif-item.error { background: #B71C1C; }
.notif-item.warn { background: #E65100; }

/* Recode rule row */
.recode-row { display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: var(--bg); border-radius: var(--radius-sm); margin-bottom: 6px; border: 1px solid var(--border); }

/* Loading overlay */
.loading-overlay { position: fixed; inset: 0; background: rgba(240,237,230,0.92); backdrop-filter: blur(4px); z-index: 8888; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.spinner { width: 48px; height: 48px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
.loading-steps { display: flex; flex-direction: column; gap: 8px; margin-top: 28px; max-width: 360px; width: 100%; }
.loading-step { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text3); padding: 8px 14px; border-radius: var(--radius-sm); transition: all 0.3s; }
.loading-step.done { color: var(--accent3); background: #E8F5E9; }
.loading-step.active { color: var(--text); background: var(--bg); font-weight: 600; animation: pulse 1.2s ease infinite; }
.loading-step.pending { color: var(--border2); }

/* Crosstab - Rasmussen style */
.xt-wrap { overflow-x: auto; border-radius: var(--radius-sm); border: 1px solid var(--border); }
.xt-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.xt-table th { padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; white-space: nowrap; border-bottom: 2px solid var(--border); }
.xt-table th.resp-h { background: var(--bg); text-align: left; min-width: 160px; color: var(--text3); position: sticky; left: 0; z-index: 2; }
.xt-table th.total-h { background: var(--text); color: var(--bg); text-align: right; }
.xt-table th.group-h { background: var(--bg); color: var(--text3); text-align: right; }
.xt-table th.dim-h { text-align: center; font-size: 9.5px; border-left: 2px solid var(--border2); }
.xt-table td { padding: 7px 10px; border-bottom: 1px solid #F4F2EE; }
.xt-table td.resp-cell { font-weight: 500; color: var(--text2); position: sticky; left: 0; background: white; z-index: 1; }
.xt-table tr:hover td { background: #FAFAF8; }
.xt-table tr:hover td.resp-cell { background: #F4F2EE; }
.xt-table td.total-cell { text-align: right; font-weight: 700; font-family: 'JetBrains Mono', monospace; background: #FFFBF0; }
.xt-table td.group-cell { text-align: right; font-family: 'JetBrains Mono', monospace; color: var(--text2); }
.xt-table td.border-l { border-left: 2px solid var(--border); }

/* LV bull curve vis */
.bull-curve { position: relative; height: 90px; background: var(--bg); border-radius: var(--radius-sm); overflow: hidden; }

/* Methodology note */
.method-box { background: #F8F6F2; border-left: 3px solid var(--accent); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; padding: 12px 16px; font-size: 12.5px; color: var(--text2); line-height: 1.7; margin-bottom: 12px; }

/* Step nav circles */
.step-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; transition: all 0.25s; cursor: pointer; }
.step-line { height: 2px; width: 20px; border-radius: 1px; flex-shrink: 0; transition: background 0.25s; }

/* Tooltip */
.tooltip { position: relative; cursor: help; }
.tooltip::after { content: attr(data-tip); position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: #1A1A1A; color: #F0EDE6; font-size: 11px; padding: 5px 10px; border-radius: 5px; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.2s; z-index: 100; }
.tooltip:hover::after { opacity: 1; }

@media (max-width: 768px) {
  .hide-mobile { display: none !important; }
  .main-grid { grid-template-columns: 1fr !important; }
}
@media print {
  .no-print { display: none !important; }
  body { background: white; }
  .card { border: 1px solid #ccc !important; page-break-inside: avoid; }
}
`;

// ─── Types ────────────────────────────────────────────────────────────────────
// (all the original types plus new ones)

// ─── CSV / File Utils ─────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const result = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(cur.trim()); cur = ""; }
    else { cur += c; }
  }
  result.push(cur.trim()); return result;
}
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, j) => { row[h] = vals[j] ?? ""; });
    rows.push(row);
  }
  return { headers, rows };
}
function toCSV(headers, rows) {
  const esc = v => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
  return [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h] ?? "")).join(","))].join("\n");
}

// ─── Parse questionnaire text ─────────────────────────────────────────────────
function parseQuestionnaire(text, csvHeaders) {
  const entries = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let currentQ = null;
  const qNumPattern = /^[Qq](\d+[a-zA-Z]?)[:\.\s]/;
  const answerPattern = /^[\d]+[\.:\)]\s+(.+)$|^[a-zA-Z][\.:\)]\s+(.+)$/;
  for (const line of lines) {
    if (qNumPattern.test(line)) {
      if (currentQ?.answers?.length) entries.push(currentQ);
      const qNum = line.match(qNumPattern)[1].toUpperCase();
      const matchedCol = csvHeaders.find(h => {
        const hU = h.toUpperCase();
        return hU === `Q${qNum}` || hU.startsWith(`Q${qNum}_`) || hU.startsWith(`Q${qNum}[`);
      }) || "";
      currentQ = { col: matchedCol, questionText: line, answers: [] };
    } else if (currentQ) {
      const m = line.match(answerPattern);
      if (m) currentQ.answers.push(m[1] || m[2]);
    }
  }
  if (currentQ?.answers?.length) entries.push(currentQ);
  return entries;
}

// ─── Parse weight definitions file ───────────────────────────────────────────
function parseWeightDefinitions(text) {
  // Format: CSV or key=value pairs
  const defs = {};
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#"));
  // Try CSV format first
  if (lines[0]?.includes(",")) {
    const headers = parseCSVLine(lines[0]);
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      const row = {};
      headers.forEach((h, j) => { row[h.trim()] = (vals[j] || "").trim(); });
      // Could be state->region or cat->group mappings
      const firstKey = Object.keys(row)[0];
      const firstVal = Object.values(row)[0];
      if (firstKey && firstVal) {
        if (!defs[firstKey]) defs[firstKey] = [];
        defs[firstKey].push(row);
      }
    }
  } else {
    // key=value format
    for (const line of lines) {
      const [k, v] = line.split("=").map(s => s.trim());
      if (k && v) defs[k] = v;
    }
  }
  return defs;
}

// ─── Parse external weights file (.txt / CSV) ─────────────────────────────────
function parseExternalWeights(text) {
  // Expects: respondent_id,weight  or just a column of weights
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return null;
  const first = parseCSVLine(lines[0]);
  // If single column, just parse as array
  if (first.length === 1 && isNaN(parseFloat(first[0]))) {
    // header row, skip
    return lines.slice(1).map(l => parseFloat(l.trim())).filter(v => !isNaN(v));
  }
  if (first.length === 1) {
    return lines.map(l => parseFloat(l.trim())).filter(v => !isNaN(v));
  }
  // Two columns: id, weight — return as map
  const headers = parseCSVLine(lines[0]);
  if (isNaN(parseFloat(first[1 < first.length ? 1 : 0]))) {
    // header present
    const map = {};
    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      if (vals.length >= 2) map[vals[0]] = parseFloat(vals[1]);
    }
    return map;
  }
  // No header, just weights
  return lines.map(l => { const v = parseCSVLine(l); return parseFloat(v[v.length - 1]); }).filter(v => !isNaN(v));
}

// ─── Hot-deck imputation ──────────────────────────────────────────────────────
function imputeMissing(rows, dimKeys) {
  const report = [];
  const imputed = rows.map(r => ({ ...r }));
  for (const key of dimKeys) {
    const present = rows.map((r, i) => ({ val: r[key], i })).filter(x => x.val && x.val.trim());
    const missing = rows.map((r, i) => ({ val: r[key], i })).filter(x => !x.val || !x.val.trim());
    if (!missing.length) continue;
    report.push({ col: key, missingN: missing.length, missingPct: missing.length / rows.length * 100, imputedN: missing.length });
    for (const m of missing) {
      const donor = present[Math.floor(Math.random() * present.length)];
      if (donor) imputed[m.i][key] = donor.val;
    }
  }
  return { imputed, report };
}

// ─── Raking ───────────────────────────────────────────────────────────────────
function runRaking(rows, targets, maxIter = 500, cap = 5.0) {
  const n = rows.length;
  const weights = new Float64Array(n).fill(1.0);
  const FLOOR = 0.2, TOL = 1e-4;
  let converged = false, itersUsed = 0;
  for (let iter = 0; iter < maxIter; iter++) {
    let maxDelta = 0;
    for (const { variable, categories, recallMask } of targets) {
      const isRecall = !!recallMask;
      let baseSum = 0;
      for (let i = 0; i < n; i++) if (!isRecall || recallMask[i]) baseSum += weights[i];
      for (const { value, proportion } of categories) {
        let catSum = 0;
        for (let i = 0; i < n; i++) if (rows[i][variable] === value && (!isRecall || recallMask[i])) catSum += weights[i];
        if (catSum === 0) continue;
        const curProp = catSum / baseSum;
        const scale = proportion / curProp;
        maxDelta = Math.max(maxDelta, Math.abs(curProp - proportion));
        for (let i = 0; i < n; i++) {
          if (rows[i][variable] === value && (!isRecall || recallMask[i]))
            weights[i] = Math.min(cap, Math.max(FLOOR, weights[i] * scale));
        }
      }
    }
    itersUsed = iter + 1;
    if (maxDelta < TOL) { converged = true; break; }
  }
  let sum = 0;
  for (let i = 0; i < n; i++) sum += weights[i];
  const mean = sum / n;
  for (let i = 0; i < n; i++) weights[i] /= mean;
  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += weights[i] ** 2;
  const deff = (sumSq / n) / ((sum / n / n) * (sum / n));
  const eff = (1 / deff) * 100;
  return { weights, converged, itersUsed, deff, eff };
}

function runTieredRaking(rows, allTargets, cap = 5.0) {
  const demoTargets = allTargets.filter(t => ["_age","_gender","_edu"].includes(t.variable));
  const raceTargets = allTargets.filter(t => t.variable === "_race");
  const politicalTargets = allTargets.filter(t => !["_age","_gender","_edu","_race"].includes(t.variable));
  return runRaking(rows, [...demoTargets, ...raceTargets, ...politicalTargets], 600, cap);
}

// ─── Weight diagnostics ───────────────────────────────────────────────────────
function computeDiagnostics(weights, rows, targets) {
  const n = weights.length;
  const min = Math.min(...weights), max = Math.max(...weights);
  const mean = weights.reduce((s, v) => s + v, 0) / n;
  const variance = weights.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const cv = Math.sqrt(variance) / mean * 100;
  const pctUnder05 = weights.filter(w => w < 0.5).length / n * 100;
  const pctOver2 = weights.filter(w => w > 2).length / n * 100;
  const pctOver3 = weights.filter(w => w > 3).length / n * 100;
  const pctOver4 = weights.filter(w => w > 4).length / n * 100;
  const bins = [
    { label: "<0.25", min: 0, max: 0.25 },{ label: "0.25–0.5", min: 0.25, max: 0.5 },
    { label: "0.5–0.75", min: 0.5, max: 0.75 },{ label: "0.75–1.0", min: 0.75, max: 1.0 },
    { label: "1.0–1.5", min: 1.0, max: 1.5 },{ label: "1.5–2.0", min: 1.5, max: 2.0 },
    { label: "2.0–3.0", min: 2.0, max: 3.0 },{ label: "3.0–4.0", min: 3.0, max: 4.0 },
    { label: ">4.0", min: 4.0, max: Infinity },
  ];
  const histogram = bins.map(b => { const count = weights.filter(w => w >= b.min && w < b.max).length; return { bin: b.label, count, pct: count / n * 100 }; });
  const trimResults = [];
  for (const cap of [2.5, 3.0, 3.5, 4.0, 4.5, 5.0]) {
    const res = runRaking(rows, targets, 200, cap);
    trimResults.push({ cap, deff: res.deff, eff: res.eff });
  }
  const bestCap = trimResults.reduce((best, r) => r.deff < best.deff ? r : best, trimResults[0]).cap;
  return { min, max, mean, cv, pctUnder05, pctOver2, pctOver3, pctOver4, histogram, trimResults, bestCap };
}

// ─── PRE/POST ─────────────────────────────────────────────────────────────────
function buildPrePost(rows, weights, benchmarkDims) {
  const n = rows.length;
  const totalW = weights.reduce((s, v) => s + v, 0);
  const result = [];
  for (const dim of benchmarkDims) {
    for (const cat of dim.categories) {
      const rawCount = rows.filter(r => r[dim.internalKey] === cat.name).length;
      const wtCount = rows.reduce((s, r, i) => s + (r[dim.internalKey] === cat.name ? weights[i] : 0), 0);
      result.push({ variable: dim.label, category: cat.name, samplePct: rawCount / n * 100, weightedPct: wtCount / totalW * 100, targetPct: cat.pct });
    }
  }
  return result;
}

// ─── Revised LV Model: Bell-Curve Frequency-Based ────────────────────────────
// Instead of logistic on a point score, we:
// 1. For each LV dimension, compute the observed frequency of each response
// 2. Score each response 0–1 based on its position on a normal distribution of "LV-ness"
// 3. Combine dimension scores → composite 0–1
// 4. Apply as probability weight (each respondent gets weight = composite * design_weight)

function computeLVBellCurve(rows, designWeights, lvQuestions) {
  const n = rows.length;
  // For each question, compute weighted frequency of each response
  const totalW = designWeights.reduce((s, v) => s + v, 0);
  const dimensionScores = new Array(n).fill(0); // sum of per-dimension scores
  let totalMaxDims = 0;

  for (const lv of lvQuestions) {
    if (!lv.col) {
      // Auto full score: add 1 to all
      for (let i = 0; i < n; i++) dimensionScores[i] += 1;
      totalMaxDims += 1;
      continue;
    }
    // Compute frequency of each response (weighted)
    const freqMap = {};
    for (let i = 0; i < n; i++) {
      const v = (rows[i][lv.col] || "").trim();
      if (!v) continue;
      freqMap[v] = (freqMap[v] || 0) + designWeights[i];
    }
    const totalNonMissing = Object.values(freqMap).reduce((s, v) => s + v, 0);
    // Normalize to proportions
    const propMap = {};
    for (const [k, v] of Object.entries(freqMap)) propMap[k] = v / totalNonMissing;

    // For each response, compute how "LV-favorable" it is based on scoring patterns
    // Pattern score: 1=high LV, 0=low LV; responses with no pattern = medium
    const patternScore = {};
    for (const [resp] of Object.entries(propMap)) {
      let matched = false;
      for (const sc of lv.scoring) {
        try {
          if (new RegExp(sc.pattern, "i").test(resp)) {
            patternScore[resp] = sc.points / lv.maxPoints;
            matched = true;
            break;
          }
        } catch {
          if (resp.toLowerCase().includes(sc.pattern.toLowerCase())) {
            patternScore[resp] = sc.points / lv.maxPoints;
            matched = true;
            break;
          }
        }
      }
      if (!matched) patternScore[resp] = 0;
    }

    // Now apply a bell curve weighting:
    // Responses with RARE frequency among LV-favorable responses get upweighted
    // The bell curve is applied over the 0–1 score space
    // High-LV responses that are rare = more informative → but we normalize across dimension
    // Simple approach: score = patternScore * bell(propMap) 
    // bell: respondents in the middle frequency get neutral, extremes get more signal
    // Final per-respondent score for this dimension:
    for (let i = 0; i < n; i++) {
      const resp = (rows[i][lv.col] || "").trim();
      const ps = patternScore[resp] ?? 0;
      // Adjust by rarity: rare favorable responses get a slight boost (inverse of frequency)
      const freq = propMap[resp] || 1;
      // Bell: weight = ps * (1 - 0.3 * freq) ... frequency dampens slightly
      const dimScore = ps * (1 - 0.25 * freq);
      dimensionScores[i] += Math.max(0, dimScore);
    }
    totalMaxDims += 1;
  }

  // Normalize to 0–1
  const rawScores = dimensionScores.map(s => totalMaxDims > 0 ? Math.min(1, s / totalMaxDims) : 0.5);

  // Apply normal distribution transformation: 
  // Convert scores to probabilities using a bell/normal CDF-like transform
  // Scores near the population median get middling probability
  // Very high scorers get high LV probability
  const scoreMean = rawScores.reduce((s, v) => s + v, 0) / n;
  const scoreVar = rawScores.reduce((s, v) => s + (v - scoreMean) ** 2, 0) / n;
  const scoreSD = Math.sqrt(Math.max(scoreVar, 0.001));

  // Logistic on standardized score with width parameter
  const lvProbs = rawScores.map(s => {
    const z = (s - scoreMean) / scoreSD;
    // Sigmoid of z-score: center = 0 (population median = 50% LV)
    return 1 / (1 + Math.exp(-1.2 * z));
  });

  // LV weights = designWeights * lvProbs, renormalized to same sum
  const rawLV = lvProbs.map((p, i) => designWeights[i] * p);
  const sumLV = rawLV.reduce((s, v) => s + v, 0);
  const sumDW = designWeights.reduce((s, v) => s + v, 0);
  const lvWeights = rawLV.map(w => w * sumDW / sumLV);

  return { lvWeights, lvProbs, rawScores, scoreMean, scoreSD };
}

// ─── Freq / Crosstab ──────────────────────────────────────────────────────────
function freqTable(rows, col, weights, answerOrder) {
  const counts = {}; let total = 0;
  rows.forEach((row, i) => {
    const v = row[col] || ""; if (!v.trim()) return;
    counts[v] = (counts[v] || 0) + weights[i]; total += weights[i];
  });
  const items = Object.entries(counts).map(([response, wt]) => ({ response, pct: wt / total, n: wt }));
  if (answerOrder?.length) {
    items.sort((a, b) => {
      const ai = answerOrder.indexOf(a.response), bi = answerOrder.indexOf(b.response);
      if (ai === -1 && bi === -1) return a.response.localeCompare(b.response);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });
  } else items.sort((a, b) => b.n - a.n);
  return items;
}

function crosstab(rows, qCol, byCol, weights, answerOrder) {
  const groups = {}; const qVals = new Set();
  rows.forEach((row, i) => {
    const q = row[qCol] || "", b = row[byCol] || "";
    if (!q.trim() || !b.trim()) return;
    qVals.add(q);
    if (!groups[b]) groups[b] = {};
    groups[b][q] = (groups[b][q] || 0) + weights[i];
  });
  const byGroups = Object.keys(groups).sort();
  let qList = Array.from(qVals);
  if (answerOrder?.length) {
    qList.sort((a, b) => { const ai = answerOrder.indexOf(a), bi = answerOrder.indexOf(b); if (ai === -1 && bi === -1) return a.localeCompare(b); if (ai === -1) return 1; if (bi === -1) return -1; return ai - bi; });
  } else qList.sort();
  const totalByQ = {}; let totalAll = 0;
  Object.values(groups).forEach(g => Object.entries(g).forEach(([q, w]) => { totalByQ[q] = (totalByQ[q] || 0) + w; totalAll += w; }));
  const result = {};
  qList.forEach(q => {
    result[q] = { Total: totalByQ[q] ? ((totalByQ[q] / totalAll) * 100).toFixed(0) : "0" };
    byGroups.forEach(b => { const gt = Object.values(groups[b]).reduce((s, v) => s + v, 0); result[q][b] = groups[b]?.[q] ? ((groups[b][q] / gt) * 100).toFixed(0) : "0"; });
  });
  return { result, byGroups, qList };
}

// ─── Detect questions ─────────────────────────────────────────────────────────
function detectQuestionConfigs(headers, rows) {
  const skipPatterns = [/^age$/i,/^gender$/i,/^sex$/i,/^race$/i,/^ethnicity$/i,/^educ/i,/^state$/i,/^region$/i,/^recall/i,/^vote/i,/^respondent/i,/^id$/i,/^weight/i,/^income/i,/^zip/i,/^employ/i,/^division/i,/^county/i,/^cbsa/i,/^party$/i];
  const qHeaders = headers.filter(h => !skipPatterns.some(p => p.test(h)));
  const matrixGroups = {};
  qHeaders.forEach(h => {
    const m1 = h.match(/^(.+?)[\[_](.+?)[\]]?$/);
    if (m1) { const stem = m1[1]; if (!matrixGroups[stem]) matrixGroups[stem] = []; matrixGroups[stem].push(h); return; }
    const m2 = h.match(/^(.*\d+)([a-zA-Z])$/);
    if (m2) { const stem = m2[1]; if (!matrixGroups[stem]) matrixGroups[stem] = []; matrixGroups[stem].push(h); }
  });
  const configs = [];
  const grouped = new Set();
  Object.entries(matrixGroups).forEach(([stem, cols]) => {
    if (cols.length >= 2) {
      cols.forEach(c => grouped.add(c));
      cols.forEach(c => {
        const item = c.replace(new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\[_]?`), "").replace(/\]$/, "");
        configs.push({ col: c, label: c, type: "matrix", included: true, matrixStem: stem, matrixItem: item });
      });
    }
  });
  qHeaders.forEach(h => {
    if (grouped.has(h)) return;
    const vals = rows.slice(0, 50).map(r => r[h]).filter(Boolean);
    const hasSemicolon = vals.some(v => v.includes(";"));
    configs.push({ col: h, label: h, type: hasSemicolon ? "multiselect" : "single", included: true });
  });
  return configs;
}

// ─── Recode race ──────────────────────────────────────────────────────────────
function recodeRaceValue(raceVal, eduVal, benchCategories) {
  const r = raceVal.toLowerCase();
  const catNames = benchCategories.map(c => c.name.toLowerCase());
  const hasWhiteCollege = catNames.some(n => n.includes("white") && (n.includes("college") || n.includes("grad") || n.includes("educ")));
  if (/white/.test(r)) {
    if (hasWhiteCollege) {
      const isCollege = /bachelor|post.?grad|master|phd|4.year|graduate/.test((eduVal || "").toLowerCase());
      const colCat = benchCategories.find(c => /college/i.test(c.name) && /white/i.test(c.name));
      const nonColCat = benchCategories.find(c => /non.?college/i.test(c.name) && /white/i.test(c.name));
      if (isCollege && colCat) return colCat.name;
      if (!isCollege && nonColCat) return nonColCat.name;
      return colCat?.name || nonColCat?.name || raceVal;
    }
    return benchCategories.find(c => /white/i.test(c.name))?.name || raceVal;
  }
  if (/black|african/.test(r)) return benchCategories.find(c => /black/i.test(c.name))?.name || raceVal;
  if (/hispanic|latino/.test(r)) return benchCategories.find(c => /hispanic/i.test(c.name))?.name || raceVal;
  if (/asian|pacific|native|other/.test(r)) return benchCategories.find(c => /asian|other/i.test(c.name))?.name || raceVal;
  return benchCategories.find(c => c.name.toLowerCase() === r)?.name || raceVal;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_LV_QUESTIONS = [
  { id: "registration", label: "Voter Registration", col: "", type: "registration", maxPoints: 3, scoring: [{ pattern: "yes|registered|true|1", points: 3 }] },
  { id: "history", label: "Vote History", col: "", type: "history", maxPoints: 7, scoring: [{ pattern: "2024", points: 3 },{ pattern: "2022", points: 2 },{ pattern: "2020", points: 3 },{ pattern: "2018", points: 2 }] },
  { id: "motivation", label: "Motivation / Likelihood to Vote", col: "", type: "motivation", maxPoints: 4, scoring: [{ pattern: "extreme|absolutely|certain|definitely", points: 4 },{ pattern: "very|probably|likely", points: 3 },{ pattern: "somewhat|maybe|50", points: 2 },{ pattern: "not very|unlikely", points: 1 }] },
  { id: "social", label: "Social Norm (Others Voting)", col: "", type: "social", maxPoints: 2, scoring: [{ pattern: "most|all|everyone", points: 2 },{ pattern: "some|half", points: 1 }] },
  { id: "plan", label: "Plan To Vote", col: "", type: "plan", maxPoints: 3, scoring: [{ pattern: "both", points: 3 },{ pattern: "one", points: 2 },{ pattern: "yet|plan", points: 1 }] }
];

const DEFAULT_BENCHMARK_DIMS = [
  { id: "age", label: "Age", internalKey: "_age", recodeMode: "standard", categories: [{ name: "18-29", pct: 26.6 },{ name: "30-44", pct: 28.1 },{ name: "45-64", pct: 22.8 },{ name: "65+", pct: 22.5 }] },
  { id: "gender", label: "Gender", internalKey: "_gender", recodeMode: "standard", categories: [{ name: "Female", pct: 52.5 },{ name: "Male", pct: 47.5 }] },
  { id: "race", label: "Race / Ethnicity", internalKey: "_race", recodeMode: "standard", categories: [{ name: "White Non-College", pct: 46.9 },{ name: "White College", pct: 22.1 },{ name: "Black", pct: 12.6 },{ name: "Hispanic", pct: 11.6 },{ name: "Asian/Other", pct: 6.8 }] },
  { id: "education", label: "Education", internalKey: "_edu", recodeMode: "standard", categories: [{ name: "HS or less", pct: 29.1 },{ name: "Some college", pct: 28.5 },{ name: "Bachelor's", pct: 26.5 },{ name: "Postgraduate", pct: 15.9 }] },
  { id: "recall", label: "2024 Recall Vote", internalKey: "_recall", isRecall: true, recodeMode: "standard", categories: [{ name: "Trump", pct: 49.8 },{ name: "Harris", pct: 48.3 },{ name: "Third Party", pct: 1.2 }] },
  { id: "party", label: "Party ID", internalKey: "_party", recodeMode: "standard", categories: [{ name: "Republican", pct: 28.0 },{ name: "Independent", pct: 38.0 },{ name: "Democrat", pct: 29.0 },{ name: "Other", pct: 5.0 }] },
  { id: "region", label: "Region", internalKey: "_region", recodeMode: "standard", categories: [{ name: "Northeast", pct: 17.9 },{ name: "Midwest", pct: 21.2 },{ name: "South", pct: 38.3 },{ name: "West", pct: 22.6 }] },
];

const CORE_DIM_IDS = ["age", "gender", "race", "education", "recall", "party", "region"];

// State → Region mapping
const STATE_REGION_MAP = {
  "CT":"Northeast","ME":"Northeast","MA":"Northeast","NH":"Northeast","NJ":"Northeast","NY":"Northeast","PA":"Northeast","RI":"Northeast","VT":"Northeast",
  "IL":"Midwest","IN":"Midwest","IA":"Midwest","KS":"Midwest","MI":"Midwest","MN":"Midwest","MO":"Midwest","NE":"Midwest","ND":"Midwest","OH":"Midwest","SD":"Midwest","WI":"Midwest",
  "AL":"South","AR":"South","DE":"South","FL":"South","GA":"South","KY":"South","LA":"South","MD":"South","MS":"South","NC":"South","OK":"South","SC":"South","TN":"South","TX":"South","VA":"South","WV":"South","DC":"South",
  "AK":"West","AZ":"West","CA":"West","CO":"West","HI":"West","ID":"West","MT":"West","NV":"West","NM":"West","OR":"West","UT":"West","WA":"West","WY":"West"
};

// ─── Notification ─────────────────────────────────────────────────────────────
function useNotifications() {
  const [notifs, setNotifs] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = Date.now();
    setNotifs(p => [...p, { id, msg, type }]);
    setTimeout(() => setNotifs(p => p.filter(n => n.id !== id)), 3500);
  }, []);
  return { notifs, add };
}

// ─── Loading overlay ──────────────────────────────────────────────────────────
function LoadingOverlay({ steps, activeStep }) {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, marginTop: 24, color: "#1A1A1A" }}>
        Processing Survey Data
      </div>
      <div style={{ fontSize: 13, color: "#888", marginTop: 6, marginBottom: 20 }}>
        Running advanced weighting pipeline…
      </div>
      <div className="loading-steps">
        {steps.map((s, i) => (
          <div key={i} className={`loading-step ${i < activeStep ? "done" : i === activeStep ? "active" : "pending"}`}>
            <span style={{ fontSize: 16 }}>{i < activeStep ? "✓" : i === activeStep ? "⟳" : "○"}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28, width: 300 }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.round(activeStep / (steps.length - 1) * 100)}%` }} />
        </div>
        <div style={{ textAlign: "right", fontSize: 11, color: "#888", marginTop: 4 }}>
          {Math.round(activeStep / (steps.length - 1) * 100)}%
        </div>
      </div>
    </div>
  );
}

// ─── Benchmark Card ───────────────────────────────────────────────────────────
function BenchmarkCard({ dim, di, sum, ok, csvData, setBenchmarkDims, canDelete, onDelete }) {
  return (
    <div className="card" style={canDelete ? { border: "1.5px solid #D4C8F8" } : {}}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <input className="inp" value={dim.label} style={{ fontWeight: 600, flex: 1, fontSize: 14 }}
          onChange={e => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, label: e.target.value } : d))} />
        <span className={`tag ${ok ? "tag-g" : "tag-r"}`}>{sum.toFixed(1)}%</span>
        {canDelete && <button className="btn btn-ghost btn-xs" onClick={onDelete} style={{ color: "#C5444A" }}>✕</button>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "#888" }}>Recall-only:</span>
        <div className={`toggle toggle-sm ${dim.isRecall ? "on" : ""}`}
          onClick={() => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, isRecall: !d.isRecall } : d))} />
        <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>Enabled in weighting:</span>
        <div className={`toggle toggle-sm ${dim.enabled !== false ? "on" : ""}`}
          onClick={() => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, enabled: !(d.enabled !== false) } : d))} />
      </div>
      {canDelete && csvData && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Source column:</label>
          <select className="sel" style={{ fontSize: 12 }} value={dim.sourceCol || ""}
            onChange={e => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, sourceCol: e.target.value } : d))}>
            <option value="">— Auto-detect —</option>
            {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      )}
      {dim.categories.map((cat, ci) => (
        <div key={ci} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
          <input className="inp" value={cat.name} style={{ flex: 1, fontSize: 12 }}
            onChange={e => setBenchmarkDims(p => p.map((d, di2) => di2 === di ? { ...d, categories: d.categories.map((c, ci2) => ci2 === ci ? { ...c, name: e.target.value } : c) } : d))} />
          <input type="number" className="bench-inp" value={cat.pct} step="0.1" min="0" max="100"
            onChange={e => setBenchmarkDims(p => p.map((d, di2) => di2 === di ? { ...d, categories: d.categories.map((c, ci2) => ci2 === ci ? { ...c, pct: parseFloat(e.target.value) || 0 } : c) } : d))} />
          <span style={{ fontSize: 11, color: "#888" }}>%</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setBenchmarkDims(p => p.map((d, di2) => di2 === di ? { ...d, categories: d.categories.filter((_, ci2) => ci2 !== ci) } : d))}>✕</button>
        </div>
      ))}
      <button className="btn btn-ghost btn-xs" style={{ marginTop: 6 }}
        onClick={() => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, categories: [...d.categories, { name: "New Category", pct: 0 }] } : d))}>
        + Add Category
      </button>
    </div>
  );
}

// ─── Add Dimension Modal ──────────────────────────────────────────────────────
function AddDimModal({ csvHeaders, onAdd, onClose }) {
  const [label, setLabel] = useState("");
  const [col, setCol] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div className="card" style={{ width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.22)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20 }}>Add Weighting Dimension</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="section-title" style={{ display: "block", marginBottom: 6 }}>Dimension Name *</label>
          <input className="inp" placeholder="e.g. Region, Party ID, Income…" value={label} autoFocus
            onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && label.trim()) { onAdd(label.trim(), col); onClose(); } if (e.key === "Escape") onClose(); }} />
        </div>
        <div style={{ marginBottom: 22 }}>
          <label className="section-title" style={{ display: "block", marginBottom: 6 }}>CSV Column (optional)</label>
          <select className="sel" value={col} onChange={e => setCol(e.target.value)}>
            <option value="">— Map later —</option>
            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-dark" disabled={!label.trim()} onClick={() => { onAdd(label.trim(), col); onClose(); }}>Add Dimension</button>
        </div>
      </div>
    </div>
  );
}

// ─── Recode Rules Editor ──────────────────────────────────────────────────────
function RecodeEditor({ csvData, recodeRules, setRecodeRules, benchmarkDims }) {
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newDim, setNewDim] = useState(benchmarkDims[0]?.internalKey || "");
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const addRule = () => {
    if (!newFrom.trim() || !newTo.trim() || !newDim) return;
    setRecodeRules(p => [...p, { fromValue: newFrom.trim(), toDim: newDim, toCategory: newTo.trim() }]);
    setNewFrom(""); setNewTo("");
  };

  const applyPaste = () => {
    const lines = pasteText.split(/\r?\n/).filter(l => l.trim());
    const newRules = [];
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map(s => s.trim());
      if (parts.length >= 3) newRules.push({ fromValue: parts[0], toDim: parts[1], toCategory: parts[2] });
      else if (parts.length === 2) newRules.push({ fromValue: parts[0], toDim: newDim, toCategory: parts[1] });
    }
    setRecodeRules(p => [...p, ...newRules]);
    setPasteText(""); setPasteMode(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label className="section-title" style={{ display: "block", marginBottom: 4 }}>From Value (raw CSV)</label>
            <input className="inp inp-mono" placeholder='e.g. "White, non-Hispanic"' value={newFrom} onChange={e => setNewFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="section-title" style={{ display: "block", marginBottom: 4 }}>Target Dimension</label>
            <select className="sel" value={newDim} onChange={e => setNewDim(e.target.value)}>
              {benchmarkDims.map(d => <option key={d.internalKey} value={d.internalKey}>{d.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="section-title" style={{ display: "block", marginBottom: 4 }}>Map To Category</label>
            <select className="sel" value={newTo} onChange={e => setNewTo(e.target.value)}>
              <option value="">— Select —</option>
              {(benchmarkDims.find(d => d.internalKey === newDim)?.categories || []).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <button className="btn btn-dark btn-sm" onClick={addRule} style={{ flexShrink: 0 }}>Add</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline btn-xs" onClick={() => setPasteMode(!pasteMode)}>
            {pasteMode ? "Hide" : "📋 Paste Bulk Rules"}
          </button>
        </div>
        {pasteMode && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11.5, color: "#888", marginBottom: 6 }}>
              Format: <code style={{ background: "#F0EDE6", padding: "1px 5px", borderRadius: 3 }}>raw_value, _dim_key, Category Name</code> (one per line, CSV or tab-separated)
            </div>
            <textarea className="inp" value={pasteText} onChange={e => setPasteText(e.target.value)}
              placeholder={"California, _region, West\nTexas, _region, South\nNew York, _region, Northeast"} rows={5} />
            <button className="btn btn-dark btn-sm" style={{ marginTop: 8 }} onClick={applyPaste}>Apply Paste</button>
          </div>
        )}
      </div>
      {recodeRules.length > 0 && (
        <div>
          <div className="section-title">Active Recode Rules ({recodeRules.length})</div>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {recodeRules.map((rule, i) => (
              <div key={i} className="recode-row">
                <span className="tag tag-y">{rule.fromValue}</span>
                <span style={{ color: "#888", fontSize: 13 }}>→</span>
                <span style={{ fontSize: 11, color: "#888", fontFamily: "JetBrains Mono" }}>{rule.toDim}</span>
                <span style={{ color: "#888", fontSize: 13 }}>:</span>
                <span className="tag tag-g">{rule.toCategory}</span>
                <button className="btn btn-ghost btn-xs" style={{ marginLeft: "auto" }} onClick={() => setRecodeRules(p => p.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost btn-xs" style={{ marginTop: 8, color: "#C5444A" }} onClick={() => setRecodeRules([])}>Clear All Rules</button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function PSIApp() {
  const [step, setStep] = useState(0);
  const [csvData, setCsvData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [colMap, setColMap] = useState({ age: "", gender: "", race: "", education: "", recall: "", party: "", region: "", state: "" });
  const [benchmarkDims, setBenchmarkDims] = useState(DEFAULT_BENCHMARK_DIMS);
  const [lvQuestions, setLvQuestions] = useState(DEFAULT_LV_QUESTIONS);
  const [questionConfigs, setQuestionConfigs] = useState([]);
  const [questionnaire, setQuestionnaire] = useState([]);
  const [results, setResults] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState("toplines");
  const [selectedQ, setSelectedQ] = useState(null);
  const [showAddDimModal, setShowAddDimModal] = useState(false);
  const [recodeRules, setRecodeRules] = useState([]);
  const [externalWeights, setExternalWeights] = useState(null);
  const [externalWeightsName, setExternalWeightsName] = useState("");
  const [weightDefsName, setWeightDefsName] = useState("");
  const [showRecodeEditor, setShowRecodeEditor] = useState(false);
  const [useTieredRaking, setUseTieredRaking] = useState(true);
  const [useHotDeckImputation, setUseHotDeckImputation] = useState(true);
  const [useSmartTrimming, setUseSmartTrimming] = useState(true);
  const [xtabMode, setXtabMode] = useState("lv"); // "rv" or "lv"
  const { notifs, add: addNotif } = useNotifications();

  const fileInputRef = useRef(null);
  const questionnaireInputRef = useRef(null);
  const weightsInputRef = useRef(null);
  const weightDefsInputRef = useRef(null);

  const customDims = benchmarkDims.filter(d => !CORE_DIM_IDS.includes(d.id));

  const LOADING_STEPS = [
    "Parsing & validating CSV data",
    "Recoding demographics",
    "Applying recode rules",
    "Hot-deck imputation",
    "Building raking targets",
    "Running smart cap optimization",
    "Running IPF/RIM raking algorithm",
    "Computing weight diagnostics",
    "Fitting bell-curve LV model",
    "Generating toplines & crosstabs",
    "Assembling report",
  ];

  const handleAddDimension = useCallback((label, sourceCol) => {
    const slug = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const id = `custom_${slug}_${Date.now()}`;
    setBenchmarkDims(prev => [...prev, {
      id, label, internalKey: `_${id}`, recodeMode: "custom", enabled: true,
      sourceCol: sourceCol || undefined,
      categories: [{ name: "Category A", pct: 50 },{ name: "Category B", pct: 50 }]
    }]);
  }, []);

  const handleRemoveCustomDim = useCallback((id) => { setBenchmarkDims(prev => prev.filter(d => d.id !== id)); }, []);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      setCsvData(parsed);
      const h = parsed.headers;
      const find = (...terms) => h.find(c => terms.some(t => c.toLowerCase().includes(t.toLowerCase()))) || "";
      setColMap({
        age: find("age"), gender: find("gender","sex"), race: find("race","ethnicity"),
        education: find("educ"), recall: find("recall","2024vote","Q8"), party: find("party","pid"),
        region: find("region"), state: find("state","st_")
      });
      setQuestionConfigs(detectQuestionConfigs(h, parsed.rows));
      setLvQuestions(prev => prev.map(lv => ({ ...lv, col: lv.col || (lv.type === "registration" ? find("registr") : lv.type === "history" ? find("history","voted") : lv.type === "motivation" ? find("motiv","likely","intent") : "") })));
      setStep(1);
      addNotif(`✓ Loaded ${parsed.rows.length.toLocaleString()} rows, ${parsed.headers.length} columns`, "success");
    };
    reader.readAsText(file);
  }, [addNotif]);

  const handleQuestionnaireFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = e => {
      const entries = parseQuestionnaire(e.target.result, csvData?.headers || []);
      setQuestionnaire(entries);
      if (entries.length > 0) {
        setQuestionConfigs(prev => prev.map(qc => {
          const entry = entries.find(e => e.col === qc.col || (qc.matrixStem && e.col === qc.matrixStem));
          if (entry) return { ...qc, answerOrder: entry.answers };
          return qc;
        }));
        addNotif(`✓ Questionnaire: ${entries.length} questions parsed`, "success");
      } else addNotif("Could not parse questionnaire — check format", "error");
    };
    reader.readAsText(file);
  }, [csvData, addNotif]);

  const handleWeightsFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = e => {
      const weights = parseExternalWeights(e.target.result);
      if (weights && (Array.isArray(weights) ? weights.length > 0 : Object.keys(weights).length > 0)) {
        setExternalWeights(weights);
        setExternalWeightsName(file.name);
        addNotif(`✓ External weights loaded from ${file.name}`, "success");
      } else addNotif("Could not parse weights file", "error");
    };
    reader.readAsText(file);
  }, [addNotif]);

  const handleWeightDefsFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = e => {
      const defs = parseWeightDefinitions(e.target.result);
      setWeightDefsName(file.name);
      // Auto-apply state→region mapping if state column detected
      if (csvData?.headers.some(h => /state/i.test(h))) {
        const stateEntries = Object.entries(defs);
        if (stateEntries.length > 0) {
          // Build recode rules from definitions
          const newRules = stateEntries.flatMap(([key, vals]) => {
            if (Array.isArray(vals)) return vals.map(v => ({ fromValue: v.state || v.State || "", toDim: "_region", toCategory: v.region || v.Region || "" }));
            return [{ fromValue: key, toDim: "_region", toCategory: String(vals) }];
          }).filter(r => r.fromValue && r.toCategory);
          if (newRules.length > 0) {
            setRecodeRules(p => [...p, ...newRules]);
            addNotif(`✓ ${newRules.length} mapping rules loaded from ${file.name}`, "success");
          }
        }
      }
    };
    reader.readAsText(file);
  }, [csvData, addNotif]);

  const recodeDemographics = useCallback((rows) => {
    return rows.map(row => {
      const r = { ...row };

      // Age
      if (colMap.age && row[colMap.age]) {
        const v = row[colMap.age];
        const dim = benchmarkDims.find(d => d.id === "age");
        const exact = dim?.categories.find(c => c.name === v || c.name.toLowerCase() === v.toLowerCase());
        if (exact) r._age = exact.name;
        else if (/18.?29|^18$|^19$|^2[0-9]$/.test(v)) r._age = "18-29";
        else if (/30.?44|^3[0-9]$|^4[0-4]$/.test(v)) r._age = "30-44";
        else if (/45.?64|^4[5-9]$|^5[0-9]$|^6[0-4]$/.test(v)) r._age = "45-64";
        else if (/65|^6[5-9]$|^[7-9]\d$|^100/.test(v)) r._age = "65+";
        else r._age = v;
      }

      // Gender
      if (colMap.gender && row[colMap.gender]) {
        const v = row[colMap.gender].toLowerCase();
        const dim = benchmarkDims.find(d => d.id === "gender");
        const exact = dim?.categories.find(c => c.name.toLowerCase() === v);
        if (exact) r._gender = exact.name;
        else r._gender = /female|woman/.test(v) ? "Female" : /male|man/.test(v) ? "Male" : row[colMap.gender];
      }

      // Race
      const raceDim = benchmarkDims.find(d => d.id === "race");
      const raceVal = row[colMap.race] || "";
      if (raceVal && raceDim) r._race = recodeRaceValue(raceVal, row[colMap.education] || "", raceDim.categories);
      else if (raceVal) r._race = raceVal;

      // Education
      if (colMap.education && row[colMap.education]) {
        const v = row[colMap.education].toLowerCase();
        const dim = benchmarkDims.find(d => d.id === "education");
        const exact = dim?.categories.find(c => c.name.toLowerCase() === v);
        if (exact) r._edu = exact.name;
        else if (/less than|hs|high school|ged|12th|grade 12/.test(v)) r._edu = "HS or less";
        else if (/some college|assoc|2.year|vocational/.test(v)) r._edu = "Some college";
        else if (/bachelor|4.year|b\.a|b\.s/.test(v)) r._edu = "Bachelor's";
        else if (/post.?grad|master|mba|phd|jd|md/.test(v)) r._edu = "Postgraduate";
        else r._edu = row[colMap.education];
      }

      // Recall
      if (colMap.recall && row[colMap.recall]) {
        const v = row[colMap.recall].toLowerCase();
        const dim = benchmarkDims.find(d => d.isRecall);
        const exact = dim?.categories.find(c => c.name.toLowerCase() === v);
        if (exact) r._recall = exact.name;
        else if (/trump|republican|gop/.test(v)) r._recall = "Trump";
        else if (/harris|biden|democrat|kamala/.test(v)) r._recall = "Harris";
        else if (/third|other|independent|libertarian|green/.test(v)) r._recall = "Third Party";
        else if (/not vote|didn|did not/.test(v)) r._recall = "Did not vote";
        else r._recall = row[colMap.recall];
      }

      // Party
      if (colMap.party && row[colMap.party]) {
        const v = row[colMap.party].toLowerCase();
        const dim = benchmarkDims.find(d => d.id === "party");
        const exact = dim?.categories.find(c => c.name.toLowerCase() === v);
        if (exact) r._party = exact.name;
        else if (/rep|gop|republican/.test(v)) r._party = "Republican";
        else if (/dem|democrat/.test(v)) r._party = "Democrat";
        else if (/ind|independent/.test(v)) r._party = "Independent";
        else r._party = row[colMap.party];
      }

      // Region — auto from state if no region column
      if (colMap.region && row[colMap.region]) {
        const v = row[colMap.region];
        const dim = benchmarkDims.find(d => d.id === "region");
        const exact = dim?.categories.find(c => c.name.toLowerCase() === v.toLowerCase());
        r._region = exact ? exact.name : v;
      } else if (colMap.state && row[colMap.state]) {
        const st = row[colMap.state].toUpperCase().trim().slice(0, 2);
        r._region = STATE_REGION_MAP[st] || "";
      }

      // Custom dims
      benchmarkDims.forEach(dim => {
        if (CORE_DIM_IDS.includes(dim.id)) return;
        const srcCol = dim.sourceCol || "";
        if (srcCol && row[srcCol] !== undefined) {
          const raw = row[srcCol] || "";
          const exact = dim.categories.find(c => c.name.toLowerCase() === raw.toLowerCase());
          r[dim.internalKey] = exact ? exact.name : raw;
        }
      });

      return r;
    });
  }, [colMap, benchmarkDims]);

  const applyRecodeRules = useCallback((rows) => {
    if (!recodeRules.length) return rows;
    return rows.map(row => {
      const r = { ...row };
      for (const rule of recodeRules) {
        // Check every column for matching value
        for (const col of Object.keys(r)) {
          if ((r[col] || "").toLowerCase() === rule.fromValue.toLowerCase()) {
            r[rule.toDim] = rule.toCategory;
          }
        }
      }
      return r;
    });
  }, [recodeRules]);

  // Composite recode: race × education → voter type
  const applyCompositeRecodes = useCallback((rows) => {
    return rows.map(row => {
      const r = { ...row };
      // "Black Non-College" etc. for any dim that uses "×"
      benchmarkDims.forEach(dim => {
        if (!dim.label.includes("×")) return;
        const [dimA, dimB] = dim.label.split("×").map(s => s.trim());
        const keyA = benchmarkDims.find(d => d.label === dimA)?.internalKey;
        const keyB = benchmarkDims.find(d => d.label === dimB)?.internalKey;
        if (keyA && keyB && r[keyA] && r[keyB]) {
          const composite = `${r[keyA]} ${r[keyB]}`;
          const exact = dim.categories.find(c => c.name.toLowerCase() === composite.toLowerCase());
          r[dim.internalKey] = exact ? exact.name : composite;
        }
      });
      return r;
    });
  }, [benchmarkDims]);

  const processData = useCallback(() => {
    if (!csvData) return;
    setProcessing(true);
    setLoadingStep(0);

    const runStep = (stepIdx, fn, delay = 80) => new Promise(resolve => {
      setLoadingStep(stepIdx);
      setTimeout(() => { resolve(fn()); }, delay);
    });

    (async () => {
      try {
        const { rows, headers } = csvData;
        const n = rows.length;

        // Step 0: Parse (already done)
        await runStep(0, () => {}, 100);

        // Step 1-2: Recode
        let recoded = await runStep(1, () => recodeDemographics(rows));
        recoded = await runStep(2, () => applyRecodeRules(recoded));
        recoded = await runStep(2, () => applyCompositeRecodes(recoded));

        // Step 3: Imputation
        const dimKeys = benchmarkDims.map(d => d.internalKey);
        let missingDataReport = [];
        await runStep(3, () => {
          if (useHotDeckImputation) {
            const { imputed, report } = imputeMissing(recoded, dimKeys);
            recoded = imputed; missingDataReport = report;
          }
        });

        // Step 4: Raking targets
        const rakingTargets = await runStep(4, () => {
          const targets = [];
          benchmarkDims.filter(d => d.enabled !== false).forEach(dim => {
            const present = new Set(recoded.map(r => r[dim.internalKey]).filter(Boolean));
            const filtered = dim.categories.filter(c => present.has(c.name));
            if (filtered.length < 2) return;
            const total = filtered.reduce((s, c) => s + c.pct, 0);
            const target = { variable: dim.internalKey, categories: filtered.map(c => ({ value: c.name, proportion: c.pct / total })) };
            if (dim.isRecall) { target.recallMask = recoded.map(r => filtered.some(f => f.name === (r[dim.internalKey] || ""))); }
            targets.push(target);
          });
          return targets;
        });

        // Step 5: Smart cap
        let chosenCap = 5.0;
        let trimResults = [];
        await runStep(5, () => {
          if (useSmartTrimming) {
            for (const cap of [2.5, 3.0, 3.5, 4.0, 4.5, 5.0]) {
              const res = runRaking(recoded, rakingTargets, 150, cap);
              trimResults.push({ cap, deff: res.deff, eff: res.eff });
            }
            chosenCap = trimResults.reduce((best, r) => r.deff < best.deff ? r : best, trimResults[0]).cap;
          }
        });

        // Step 6: Raking
        let weights, converged, itersUsed, deff, eff;
        await runStep(6, () => {
          let result;
          if (externalWeights) {
            // Use external weights
            const wArr = Array.isArray(externalWeights) ? externalWeights : Object.values(externalWeights);
            weights = new Float64Array(wArr.length === n ? wArr : new Array(n).fill(1));
            converged = true; itersUsed = 0;
            let sum = 0; for (let i = 0; i < n; i++) sum += weights[i];
            const mean = sum / n; for (let i = 0; i < n; i++) weights[i] /= mean;
            let sumSq = 0; for (let i = 0; i < n; i++) sumSq += weights[i] ** 2;
            deff = (sumSq / n) / ((sum / n / n) * (sum / n));
            eff = (1 / deff) * 100;
          } else {
            result = useTieredRaking ? runTieredRaking(recoded, rakingTargets, chosenCap) : runRaking(recoded, rakingTargets, 500, chosenCap);
            ({ weights, converged, itersUsed, deff, eff } = result);
          }
        });

        // Step 7: Diagnostics
        let diagnostics;
        await runStep(7, () => {
          diagnostics = computeDiagnostics(Array.from(weights), recoded, rakingTargets);
          if (trimResults.length) { diagnostics.trimResults = trimResults; diagnostics.bestCap = chosenCap; }
        });

        // Step 8: LV model
        let lvWeights, lvProbs, rawScores, scoreMean, scoreSD;
        await runStep(8, () => {
          const result = computeLVBellCurve(recoded, Array.from(weights), lvQuestions);
          lvWeights = result.lvWeights; lvProbs = result.lvProbs;
          rawScores = result.rawScores; scoreMean = result.scoreMean; scoreSD = result.scoreSD;
        });

        // Step 9: Toplines + Crosstabs
        let toplines = {}, xtabs = {}, sampleComp = {}, rawSampleComp = {}, prePostComparison = [];
        await runStep(9, () => {
          const includedCols = questionConfigs.filter(q => q.included).map(q => q.col);
          includedCols.forEach(q => {
            const order = questionConfigs.find(c => c.col === q)?.answerOrder;
            toplines[q] = { rv: freqTable(recoded, q, Array.from(weights), order), lv: freqTable(recoded, q, lvWeights, order) };
          });

          // Crosstab dimensions: all non-recall dims + party
          const byVars = benchmarkDims.filter(d => !d.isRecall && d.enabled !== false).map(d => ({ col: d.internalKey, label: d.label }));
          includedCols.forEach(q => {
            const order = questionConfigs.find(c => c.col === q)?.answerOrder;
            xtabs[q] = byVars.map(({ col, label }) => ({ breakdown: label, ...crosstab(recoded, q, col, xtabMode === "lv" ? lvWeights : Array.from(weights), order) }));
          });

          benchmarkDims.forEach(dim => {
            sampleComp[dim.label] = freqTable(recoded, dim.internalKey, Array.from(weights));
            rawSampleComp[dim.label] = freqTable(recoded, dim.internalKey, new Array(n).fill(1));
          });

          prePostComparison = buildPrePost(recoded, Array.from(weights), benchmarkDims);
        });

        // Step 10: Assemble
        await runStep(10, () => {}, 200);

        setResults({
          n, converged, itersUsed, deff, eff,
          weights: Array.from(weights), lvWeights, lvProbs, rawScores, scoreMean, scoreSD,
          pollCols: questionConfigs.filter(q => q.included).map(q => q.col),
          toplines, xtabs, sampleComp, rawSampleComp, prePostComparison,
          recoded, headers,
          rakingTargets: rakingTargets.map(t => t.variable),
          benchmarkDims, questionConfigs,
          diagnostics, missingDataReport,
          tieredWeightsApplied: useTieredRaking && !externalWeights,
          externalWeightsUsed: !!externalWeights,
          chosenCap,
        });
        setSelectedQ((questionConfigs.filter(q => q.included)[0])?.col || null);
        setStep(5);
        addNotif("✓ Analysis complete!", "success");
      } catch (err) {
        addNotif("Error: " + (err instanceof Error ? err.message : String(err)), "error");
      }
      setProcessing(false);
    })();
  }, [csvData, benchmarkDims, lvQuestions, questionConfigs, recodeDemographics, applyRecodeRules, applyCompositeRecodes, useTieredRaking, useHotDeckImputation, useSmartTrimming, externalWeights, xtabMode, addNotif]);

  const exportWeightedCSV = useCallback(() => {
    if (!results) return;
    const rows = results.recoded.map((r, i) => ({ ...r, design_wt: results.weights[i].toFixed(5), lv_wt: results.lvWeights[i].toFixed(5), lv_prob: results.lvProbs[i].toFixed(5), lv_score: results.rawScores[i].toFixed(4) }));
    const headers = [...results.headers, "design_wt","lv_wt","lv_prob","lv_score"].filter((h, i, a) => a.indexOf(h) === i);
    const blob = new Blob([toCSV(headers, rows)], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "weighted_data.csv"; a.click();
  }, [results]);

  const exportCrosstabsCSV = useCallback(() => {
    if (!results) return;
    const lines = [];
    results.pollCols.forEach(q => {
      const qLabel = results.questionConfigs.find(c => c.col === q)?.label || q;
      const xtabsForQ = results.xtabs[q] || [];
      if (!xtabsForQ.length) return;
      lines.push(`"${qLabel} (${q})"`);
      // Build header: Response | LV Total | [Dim: Group] ...
      const dimHeaders = ["Response", "LV Total"];
      xtabsForQ.forEach(xt => xt.byGroups.forEach(g => dimHeaders.push(`${xt.breakdown}: ${g}`)));
      lines.push(dimHeaders.map(h => `"${h}"`).join(","));
      (xtabsForQ[0]?.qList || []).forEach(resp => {
        const row = [`"${resp}"`, xtabsForQ[0]?.result[resp]?.Total ?? "0"];
        xtabsForQ.forEach(xt => xt.byGroups.forEach(g => row.push(xt.result[resp]?.[g] ?? "0")));
        lines.push(row.join(","));
      });
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "crosstabs.csv"; a.click();
  }, [results]);

  const STEPS = ["Upload", "Map & Import", "Benchmarks", "LV Model", "Questions", "Report"];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#F0EDE6" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Notifications */}
      <div className="notif">
        {notifs.map(n => (
          <div key={n.id} className={`notif-item ${n.type}`}>
            {n.type === "success" ? "✓" : n.type === "error" ? "✕" : "ℹ"} {n.msg}
          </div>
        ))}
      </div>

      {/* Loading overlay */}
      {processing && <LoadingOverlay steps={LOADING_STEPS} activeStep={loadingStep} />}

      {/* Add dimension modal */}
      {showAddDimModal && csvData && (
        <AddDimModal csvHeaders={csvData.headers} onAdd={handleAddDimension} onClose={() => setShowAddDimModal(false)} />
      )}

      {/* HEADER */}
      <header style={{ background: "#1A1A1A", color: "#F0EDE6", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 16px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: "#C5444A", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="3" x2="12" y2="16"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, lineHeight: 1.2 }}>Public Sentiment Institute</div>
            <div style={{ fontSize: 9.5, color: "#555", letterSpacing: 1.2, textTransform: "uppercase" }}>Poll Weighting &amp; Analysis Suite</div>
          </div>
        </div>
        {step >= 1 && (
          <div className="no-print hide-mobile" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div className="step-dot" style={{ background: step > i ? "#C5444A" : step === i ? "#F0EDE6" : "#2A2A2A", color: step === i ? "#1A1A1A" : step > i ? "white" : "#555", cursor: i <= step ? "pointer" : "default" }} onClick={() => { if (i <= step && !processing) setStep(i); }}>
                  {step > i ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 11, color: step === i ? "#F0EDE6" : "#555", marginRight: 2 }}>{s}</span>
                {i < STEPS.length - 1 && <div className="step-line" style={{ background: step > i ? "#C5444A" : "#2A2A2A" }} />}
              </div>
            ))}
          </div>
        )}
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── STEP 0: UPLOAD ── */}
        {step === 0 && (
          <div className="fade-in" style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 44, lineHeight: 1.1, marginBottom: 12 }}>
              Upload Your<br /><em style={{ color: "#C5444A" }}>Survey Data</em>
            </div>
            <p style={{ color: "#666", marginBottom: 36, fontSize: 15, lineHeight: 1.65 }}>
              Import a CSV to begin professional demographic weighting,<br />apply custom benchmarks, and generate publication-ready reports.
            </p>
            <div
              className={`upload-zone ${isDragging ? "drag" : ""}`}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.name.endsWith(".csv")) handleFile(f); }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C0B8A8" strokeWidth="1.5" style={{ marginBottom: 12 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 5 }}>Drop CSV here or click to browse</div>
              <div style={{ color: "#999", fontSize: 13 }}>Standard survey export format</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {["IPF/RIM Raking","Tiered Weighting","Bell-Curve LV Model","Rasmussen Crosstabs","Party/Region Tabs","Hot-Deck Imputation","Smart Cap Optimizer","External Weights"].map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#666" }}>
                  <span style={{ color: "#C5444A", fontWeight: 700 }}>✓</span>{f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: MAP + IMPORT ── */}
        {step === 1 && csvData && (
          <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, marginBottom: 4 }}>Map Columns & Import Files</div>
              <p style={{ color: "#666", fontSize: 13.5 }}><strong>{fileName}</strong> · {csvData.rows.length.toLocaleString()} respondents · {csvData.headers.length} columns</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              {/* Column mapping */}
              <div className="card">
                <div className="section-title">Core Demographic Variables</div>
                {[
                  { key: "age", label: "Age" }, { key: "gender", label: "Gender / Sex" },
                  { key: "race", label: "Race / Ethnicity" }, { key: "education", label: "Education" },
                  { key: "recall", label: "2024 Recall Vote" }, { key: "party", label: "Party ID" },
                  { key: "region", label: "Region" }, { key: "state", label: "State (auto-region)" },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display: "grid", gridTemplateColumns: "160px 1fr", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <label style={{ fontSize: 13, fontWeight: 500 }}>{label}</label>
                    <select className="sel" value={colMap[key] || ""} onChange={e => setColMap(p => ({ ...p, [key]: e.target.value }))}>
                      <option value="">— Not mapped —</option>
                      {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}

                {customDims.length > 0 && (
                  <>
                    <div className="section-title" style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>Additional Dimensions</div>
                    {customDims.map(dim => (
                      <div key={dim.id} style={{ display: "grid", gridTemplateColumns: "160px 1fr auto", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <label style={{ fontSize: 13, color: "#444" }}>{dim.label}</label>
                        <select className="sel" value={dim.sourceCol || ""} onChange={e => setBenchmarkDims(prev => prev.map(d => d.id === dim.id ? { ...d, sourceCol: e.target.value } : d))}>
                          <option value="">— Not mapped —</option>
                          {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <button className="btn btn-ghost btn-xs" onClick={() => handleRemoveCustomDim(dim.id)} style={{ color: "#C5444A" }}>✕</button>
                      </div>
                    ))}
                  </>
                )}

                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowAddDimModal(true)}>
                    + Add Dimension
                  </button>
                </div>
              </div>

              {/* File imports */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Questionnaire */}
                <div className="card">
                  <div className="section-title">Questionnaire File (.txt)</div>
                  <div style={{ fontSize: 12.5, color: "#666", marginBottom: 10, lineHeight: 1.5 }}>
                    Upload a text file with questions labeled Q1:, Q2:, etc. and numbered answer choices to set answer ordering in crosstabs.
                  </div>
                  <div style={{ display: "flex", align: "center", gap: 10 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => questionnaireInputRef.current?.click()}>
                      ⬆ Upload Questionnaire
                    </button>
                    {questionnaire.length > 0 && <span className="tag tag-g">{questionnaire.length} questions</span>}
                  </div>
                  <input ref={questionnaireInputRef} type="file" accept=".txt,.docx" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleQuestionnaireFile(e.target.files[0]); }} />
                </div>

                {/* External weights */}
                <div className="card">
                  <div className="section-title">External Weights (.txt / .csv)</div>
                  <div style={{ fontSize: 12.5, color: "#666", marginBottom: 10, lineHeight: 1.5 }}>
                    Import pre-computed weights. Format: one weight per line, or two columns (ID, weight). If loaded, replaces internal raking.
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => weightsInputRef.current?.click()}>
                      ⬆ Upload Weights
                    </button>
                    {externalWeightsName && <span className="tag tag-g">{externalWeightsName}</span>}
                    {externalWeights && <button className="btn btn-ghost btn-xs" style={{ color: "#C5444A" }} onClick={() => { setExternalWeights(null); setExternalWeightsName(""); }}>Remove</button>}
                  </div>
                  <input ref={weightsInputRef} type="file" accept=".txt,.csv" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleWeightsFile(e.target.files[0]); }} />
                </div>

                {/* Weight definitions / mappings */}
                <div className="card">
                  <div className="section-title">Weight Definitions / Mappings (.txt / .csv)</div>
                  <div style={{ fontSize: 12.5, color: "#666", marginBottom: 10, lineHeight: 1.5 }}>
                    Import region mappings, custom recodes, or benchmark definitions. Format: state,region or key=value pairs.
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => weightDefsInputRef.current?.click()}>
                      ⬆ Upload Definitions
                    </button>
                    {weightDefsName && <span className="tag tag-teal">{weightDefsName}</span>}
                  </div>
                  <input ref={weightDefsInputRef} type="file" accept=".txt,.csv" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleWeightDefsFile(e.target.files[0]); }} />
                </div>

                {/* Recode rules */}
                <div className="card" style={{ border: showRecodeEditor ? "1.5px solid #D4C8F8" : "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div className="section-title" style={{ marginBottom: 2 }}>Custom Recode Rules</div>
                      <div style={{ fontSize: 12, color: "#888" }}>Map raw values → dimension categories</div>
                    </div>
                    <div style={{ display: "flex", align: "center", gap: 8 }}>
                      {recodeRules.length > 0 && <span className="tag tag-p">{recodeRules.length} rules</span>}
                      <button className="btn btn-outline btn-sm" onClick={() => setShowRecodeEditor(!showRecodeEditor)}>
                        {showRecodeEditor ? "Close" : "Edit Rules"}
                      </button>
                    </div>
                  </div>
                  {showRecodeEditor && (
                    <RecodeEditor csvData={csvData} recodeRules={recodeRules} setRecodeRules={setRecodeRules} benchmarkDims={benchmarkDims} />
                  )}
                </div>
              </div>
            </div>

            {/* Advanced options */}
            <div className="card" style={{ marginTop: 18, background: "#FAFAF8", border: "1.5px solid var(--border)" }}>
              <div className="section-title">Advanced Modeling Options</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { key: "tiered", label: "Tiered / Hierarchical Raking", desc: "Rake Demo → Race → Political sequentially to prevent overfitting", val: useTieredRaking, set: setUseTieredRaking },
                  { key: "hotdeck", label: "Hot-Deck Imputation", desc: "Replace missing demographic values by drawing from observed donors", val: useHotDeckImputation, set: setUseHotDeckImputation },
                  { key: "trim", label: "Smart Weight Cap Optimization", desc: "Auto-select optimal cap (2.5–5.0) to minimize design effect", val: useSmartTrimming, set: setUseSmartTrimming },
                  { key: "xtabmode", label: "Crosstab Weighting Mode", desc: "", val: null, set: null, isSelect: true },
                ].map(opt => (
                  <div key={opt.key} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                    {opt.isSelect ? (
                      <>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Crosstab Weighting Mode</div>
                          <div style={{ display: "flex", gap: 8 }}>
                            {["rv","lv"].map(m => (
                              <button key={m} className={`btn btn-sm ${xtabMode === m ? "btn-dark" : "btn-outline"}`} onClick={() => setXtabMode(m)}>
                                {m.toUpperCase()} Weighted
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={`toggle ${opt.val ? "on" : ""}`} style={{ marginTop: 2 }} onClick={() => opt.set(!opt.val)} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{opt.label}</div>
                          <div style={{ fontSize: 11.5, color: "#888", lineHeight: 1.5 }}>{opt.desc}</div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setStep(0)}>← Back</button>
              <button className="btn btn-dark" onClick={() => setStep(2)}>Set Benchmarks →</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: BENCHMARKS ── */}
        {step === 2 && (
          <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, marginBottom: 4 }}>Weighting Benchmarks</div>
              <p style={{ color: "#666", fontSize: 13.5 }}>Set target proportions. Each dimension must sum to 100%.</p>
            </div>

            <div className="section-title">Core Dimensions</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginBottom: 24 }}>
              {benchmarkDims.filter(d => CORE_DIM_IDS.includes(d.id)).map(dim => {
                const di = benchmarkDims.indexOf(dim);
                const sum = dim.categories.reduce((s, c) => s + (parseFloat(String(c.pct)) || 0), 0);
                return <BenchmarkCard key={dim.id} dim={dim} di={di} sum={sum} ok={Math.abs(sum - 100) < 0.5} csvData={csvData} setBenchmarkDims={setBenchmarkDims} canDelete={false} />;
              })}
            </div>

            {customDims.length > 0 && (
              <>
                <div className="section-title">Additional Dimensions</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginBottom: 18 }}>
                  {customDims.map(dim => {
                    const di = benchmarkDims.indexOf(dim);
                    const sum = dim.categories.reduce((s, c) => s + (parseFloat(String(c.pct)) || 0), 0);
                    return <BenchmarkCard key={dim.id} dim={dim} di={di} sum={sum} ok={Math.abs(sum - 100) < 0.5} csvData={csvData} setBenchmarkDims={setBenchmarkDims} canDelete={true} onDelete={() => handleRemoveCustomDim(dim.id)} />;
                  })}
                </div>
              </>
            )}

            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 20px", background: "white", borderRadius: 10, border: "2px dashed #D0C8B8", cursor: "pointer", marginBottom: 8 }} onClick={() => setShowAddDimModal(true)}>
              <div style={{ width: 28, height: 28, background: "#F0EDE6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#888" }}>+</div>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>Add Dimension</div><div style={{ fontSize: 11.5, color: "#888" }}>Party, Income, Region, etc.</div></div>
            </div>

            <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "space-between" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setBenchmarkDims(DEFAULT_BENCHMARK_DIMS)}>Reset Defaults</button>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-dark" onClick={() => setStep(3)}>LV Model →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: LV MODEL ── */}
        {step === 3 && (
          <div className="fade-in">
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, marginBottom: 4 }}>Likely Voter Model</div>
              <p style={{ color: "#666", fontSize: 13.5 }}>Bell-curve frequency-based LV propensity model. For each dimension, response frequency scores are placed on a normal distribution.</p>
            </div>

            <div className="card" style={{ marginBottom: 18, background: "#FFFBF0", border: "1.5px solid #F0D080" }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>How the Bell-Curve LV Model Works</div>
              <div style={{ fontSize: 12.5, color: "#555", lineHeight: 1.7 }}>
                <strong>1. Frequency Analysis:</strong> For each LV dimension question, the tool computes the weighted frequency of every response. <br />
                <strong>2. Pattern Scoring:</strong> Each response is scored 0–1 based on how "LV-favorable" it is (using your regex patterns below). <br />
                <strong>3. Bell Curve:</strong> Each respondent's composite score is standardized into a z-score, then passed through a logistic sigmoid centered at the population median — producing a 0–1 LV probability. <br />
                <strong>4. LV Weights:</strong> LV weight = design weight × LV probability (renormalized to maintain total sample size).
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {lvQuestions.map((lv, li) => (
                <div key={lv.id} className="card">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 8, background: "#1A1A1A", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Serif Display', serif", fontSize: 13, flexShrink: 0, textAlign: "center" }}>
                      {lv.maxPoints}pt
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                        <input className="inp" value={lv.label} style={{ fontWeight: 600, width: 220, fontSize: 13.5 }} onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, label: e.target.value } : q))} />
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11.5, color: "#888" }}>Max pts:</span>
                          <input type="number" className="bench-inp" value={lv.maxPoints} min="0" max="20" onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, maxPoints: parseInt(e.target.value) || 0 } : q))} />
                        </div>
                        <button className="btn btn-ghost btn-xs" style={{ color: "#C5444A" }} onClick={() => setLvQuestions(p => p.filter((_, i) => i !== li))}>Remove</button>
                      </div>
                      {csvData && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 12, color: "#888", whiteSpace: "nowrap" }}>Survey column:</span>
                          <select className="sel" value={lv.col} style={{ maxWidth: 280, fontSize: 12 }} onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, col: e.target.value } : q))}>
                            <option value="">— Use default max score (everyone full points) —</option>
                            {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Scoring patterns (regex):</div>
                      {lv.scoring.map((sc, si) => (
                        <div key={si} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                          <input className="inp inp-mono" value={sc.pattern} placeholder="Pattern (regex or substring)" style={{ flex: 1, fontSize: 12 }} onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, scoring: q.scoring.map((s, j) => j === si ? { ...s, pattern: e.target.value } : s) } : q))} />
                          <span style={{ fontSize: 13, color: "#888" }}>→</span>
                          <input type="number" className="bench-inp" value={sc.points} min="0" max={lv.maxPoints} onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, scoring: q.scoring.map((s, j) => j === si ? { ...s, points: parseInt(e.target.value) || 0 } : s) } : q))} />
                          <span style={{ fontSize: 11, color: "#888" }}>pts</span>
                          <button className="btn btn-ghost btn-xs" onClick={() => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, scoring: q.scoring.filter((_, j) => j !== si) } : q))}>✕</button>
                        </div>
                      ))}
                      <button className="btn btn-ghost btn-xs" style={{ marginTop: 4 }} onClick={() => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, scoring: [...q.scoring, { pattern: "", points: 1 }] } : q))}>+ Add Pattern</button>
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn btn-outline btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setLvQuestions(p => [...p, { id: `custom_${Date.now()}`, label: "New LV Question", col: "", type: "custom", maxPoints: 3, scoring: [{ pattern: "", points: 3 }] }])}>
                + Add LV Dimension
              </button>
            </div>

            <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-dark" onClick={() => setStep(4)}>Select Questions →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: QUESTIONS ── */}
        {step === 4 && (
          <div className="fade-in">
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, marginBottom: 4 }}>Question Configuration</div>
              <p style={{ color: "#666", fontSize: 13.5 }}>Select questions to include in toplines and crosstabs. Upload a questionnaire file to set answer order.</p>
            </div>

            <div className="card" style={{ marginBottom: 18, background: "#FFFBF0", border: "1.5px solid #F0D080" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>📄 Upload Questionnaire (Optional)</div>
                  <div style={{ fontSize: 12, color: "#777" }}>Q1:, Q2: labeled with numbered answer choices.</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="btn btn-outline btn-sm" onClick={() => questionnaireInputRef.current?.click()}>⬆ Upload</button>
                  {questionnaire.length > 0 && <span className="tag tag-g">{questionnaire.length} questions loaded</span>}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setQuestionConfigs(p => p.map(q => ({ ...q, included: true })))}>Select All</button>
              <button className="btn btn-outline btn-sm" onClick={() => setQuestionConfigs(p => p.map(q => ({ ...q, included: false })))}>Deselect All</button>
              <span style={{ fontSize: 12.5, color: "#888", alignSelf: "center" }}>{questionConfigs.filter(q => q.included).length} of {questionConfigs.length} selected</span>
            </div>

            {(() => {
              const stems = new Set(questionConfigs.filter(q => q.matrixStem).map(q => q.matrixStem));
              const singles = questionConfigs.filter(q => !q.matrixStem);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Array.from(stems).map(stem => {
                    const items = questionConfigs.filter(q => q.matrixStem === stem);
                    const allOn = items.every(q => q.included);
                    return (
                      <div key={stem} className="card" style={{ border: "1.5px solid #D4C8F8" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <span className="tag tag-p">Matrix</span>
                          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{stem}</span>
                          <div className={`toggle toggle-sm ${allOn ? "on" : ""}`} onClick={() => setQuestionConfigs(p => p.map(q => q.matrixStem === stem ? { ...q, included: !allOn } : q))} />
                          <span style={{ fontSize: 11.5, color: "#888" }}>Toggle all</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {items.map(q => {
                            const idx = questionConfigs.findIndex(c => c.col === q.col);
                            return (
                              <div key={q.col} style={{ display: "flex", alignItems: "center", gap: 6, background: q.included ? "#F0EDE6" : "#F8F8F8", borderRadius: 6, padding: "5px 10px", border: "1px solid var(--border)" }}>
                                <div className={`toggle toggle-sm ${q.included ? "on" : ""}`} onClick={() => setQuestionConfigs(p => p.map((c, i) => i === idx ? { ...c, included: !c.included } : c))} />
                                <span style={{ fontSize: 12, color: "#444" }}>{q.matrixItem || q.col}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {singles.map(q => {
                    const idx = questionConfigs.findIndex(c => c.col === q.col);
                    return (
                      <div key={q.col} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "white", borderRadius: 8, border: "1px solid var(--border)" }}>
                        <div className={`toggle toggle-sm ${q.included ? "on" : ""}`} onClick={() => setQuestionConfigs(p => p.map((c, i) => i === idx ? { ...c, included: !c.included } : c))} />
                        <input className="inp" value={q.label} style={{ flex: 1, maxWidth: 380, fontSize: 13 }} onChange={e => setQuestionConfigs(p => p.map((c, i) => i === idx ? { ...c, label: e.target.value } : c))} />
                        <select className="sel" value={q.type} style={{ width: 140 }} onChange={e => setQuestionConfigs(p => p.map((c, i) => i === idx ? { ...c, type: e.target.value } : c))}>
                          <option value="single">Single Select</option>
                          <option value="multiselect">Multi-Select</option>
                          <option value="matrix">Matrix</option>
                        </select>
                        <span className={`tag ${q.type === "single" ? "tag-b" : q.type === "matrix" ? "tag-p" : "tag-y"}`}>{q.type}</span>
                        <span style={{ fontSize: 11, color: "#999", fontFamily: "JetBrains Mono" }}>{q.col}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setStep(3)}>← Back</button>
              <button className="btn btn-red" onClick={processData} disabled={questionConfigs.filter(q => q.included).length === 0}>
                ⚙ Run Analysis
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: REPORT ── */}
        {step === 5 && results && !processing && (
          <ReportView
            results={results}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedQ={selectedQ}
            setSelectedQ={setSelectedQ}
            exportWeightedCSV={exportWeightedCSV}
            exportCrosstabsCSV={exportCrosstabsCSV}
            onBack={() => setStep(4)}
            xtabMode={xtabMode}
          />
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function ReportView({ results, activeTab, setActiveTab, selectedQ, setSelectedQ, exportWeightedCSV, exportCrosstabsCSV, onBack, xtabMode }) {
  const d = results.diagnostics;
  const pollUsable = d.pctOver3 < 10 && d.deff < 2.5 && d.cv < 60;
  const deffColor = d.deff < 1.5 ? "#2E7D32" : d.deff < 2.5 ? "#F57F17" : "#C62828";

  // Build sidebar items
  const sidebarItems = [];
  const addedStems = new Set();
  results.questionConfigs.filter(q => q.included && results.pollCols.includes(q.col)).forEach(q => {
    if (q.matrixStem) {
      if (!addedStems.has(q.matrixStem)) { addedStems.add(q.matrixStem); sidebarItems.push({ id: `matrix_${q.matrixStem}`, label: q.matrixStem, isMatrix: true, stem: q.matrixStem }); }
    } else { sidebarItems.push({ id: q.col, label: results.questionConfigs.find(c => c.col === q.col)?.label || q.col }); }
  });

  const getLabel = col => results.questionConfigs.find(q => q.col === col)?.label || col;
  const getAnswerOrder = col => results.questionConfigs.find(q => q.col === col)?.answerOrder;
  const selectedItemId = selectedQ ? (results.questionConfigs.find(q => q.col === selectedQ)?.matrixStem ? `matrix_${results.questionConfigs.find(q => q.col === selectedQ)?.matrixStem}` : selectedQ) : null;

  const TABS = [
    { id: "toplines", label: "Toplines" },
    { id: "crosstabs", label: "Crosstabs" },
    { id: "diagnostics", label: "⚡ Diagnostics" },
    { id: "prepost", label: "Pre/Post" },
    { id: "sample", label: "Sample Comp." },
    { id: "missing", label: "Missing Data" },
    { id: "lv", label: "LV Model" },
    { id: "methodology", label: "Methodology" },
  ];

  return (
    <div className="fade-in">
      {/* Top bar */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, marginBottom: 4 }}>Survey Analysis Report</div>
          <div style={{ fontSize: 12.5, color: "#666", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>N={results.n.toLocaleString()}</span><span style={{ color: "#ccc" }}>·</span>
            <span>{results.pollCols.length} questions</span><span style={{ color: "#ccc" }}>·</span>
            <span>DEFF={results.deff.toFixed(2)}</span><span style={{ color: "#ccc" }}>·</span>
            <span>Eff={results.eff.toFixed(1)}%</span>
            <span className={`tag ${results.converged ? "tag-g" : "tag-y"}`}>{results.converged ? `Converged (${results.itersUsed}i)` : `DNC`}</span>
            {results.tieredWeightsApplied && <span className="tag tag-p">Tiered</span>}
            {results.externalWeightsUsed && <span className="tag tag-teal">External Wts</span>}
            <span className="tag tag-b">Cap: {results.chosenCap}×</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-outline btn-sm" onClick={onBack}>← Back</button>
          <button className="btn btn-outline btn-sm" onClick={exportWeightedCSV}>⬇ Weighted CSV</button>
          <button className="btn btn-outline btn-sm" onClick={exportCrosstabsCSV}>⬇ Crosstabs CSV</button>
          <button className="btn btn-red btn-sm" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>

      {/* KPI bar */}
      <div className="card" style={{ marginBottom: 18, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { label: "Total N", value: results.n.toLocaleString(), sub: "Unweighted" },
          { label: "Design Effect", value: results.deff.toFixed(3), sub: `Eff: ${results.eff.toFixed(1)}%`, color: deffColor },
          { label: "Weight Range", value: `${d.min.toFixed(2)}–${d.max.toFixed(2)}`, sub: `CV: ${d.cv.toFixed(1)}%` },
          { label: "Effective LV N", value: Math.round(results.lvProbs.reduce((s, v) => s + v, 0)).toLocaleString(), sub: `Mean LV: ${(results.lvProbs.reduce((s, v) => s + v, 0) / results.n * 100).toFixed(1)}%` },
          { label: "Poll Usability", value: pollUsable ? "✓ Good" : "⚠ Review", sub: pollUsable ? "Weights acceptable" : "Check diagnostics", color: pollUsable ? "#2E7D32" : "#C62828" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ textAlign: "center", padding: "6px 4px" }}>
            <div style={{ fontSize: 11, color: color || "#888", marginBottom: 2 }}>{label}</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 21, color: color || "#1A1A1A", lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: 11, color: color || "#999", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="no-print" style={{ borderBottom: "2px solid var(--border)", marginBottom: 20, display: "flex", gap: 0, overflowX: "auto" }}>
        {TABS.map(t => <button key={t.id} className={`tab ${activeTab === t.id ? "on" : ""}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>)}
      </div>

      {/* ── TOPLINES ── */}
      {activeTab === "toplines" && (
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
          <QSidebar items={sidebarItems} selectedId={selectedItemId} onSelect={(item) => {
            if (item.isMatrix && item.stem) { const fc = results.questionConfigs.find(q => q.matrixStem === item.stem && results.pollCols.includes(q.col))?.col; if (fc) setSelectedQ(fc); }
            else setSelectedQ(item.id);
          }} />
          <div>
            {selectedQ && (() => {
              const qConfig = results.questionConfigs.find(q => q.col === selectedQ);
              const isMatrix = !!qConfig?.matrixStem;
              if (isMatrix) {
                const matrixCols = results.questionConfigs.filter(q => q.matrixStem === qConfig.matrixStem && results.pollCols.includes(q.col)).map(q => q.col);
                return (
                  <div className="card">
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#888", marginBottom: 4 }}>Matrix</div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 18 }}>{qConfig.matrixStem}</div>
                    {matrixCols.map(col => { const tl = results.toplines[col]; if (!tl) return null; const sub = results.questionConfigs.find(q => q.col === col)?.matrixItem || col; return (<div key={col} style={{ marginBottom: 28 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 10, paddingLeft: 6, borderLeft: "3px solid #C5444A" }}>{sub}</div><ToplineChart tl={tl} /></div>); })}
                  </div>
                );
              }
              const tl = results.toplines[selectedQ]; if (!tl) return null;
              return (
                <div className="card">
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#888", marginBottom: 2 }}>{selectedQ}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{getLabel(selectedQ)}</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <span className="tag tag-b">RV Weighted</span>
                    <span className="tag tag-y">LV Weighted</span>
                  </div>
                  <ToplineChart tl={tl} />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── CROSSTABS ── */}
      {activeTab === "crosstabs" && (
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
          <QSidebar items={sidebarItems} selectedId={selectedItemId} onSelect={(item) => {
            if (item.isMatrix && item.stem) { const fc = results.questionConfigs.find(q => q.matrixStem === item.stem && results.pollCols.includes(q.col))?.col; if (fc) setSelectedQ(fc); }
            else setSelectedQ(item.id);
          }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span className="tag tag-dk">{xtabMode.toUpperCase()} Weighted</span>
              <span style={{ fontSize: 12, color: "#888" }}>Crosstabs weighted by {xtabMode === "lv" ? "Likely Voter" : "Registered Voter"} weights</span>
            </div>
            {selectedQ && (() => {
              const qConfig = results.questionConfigs.find(q => q.col === selectedQ);
              const isMatrix = !!qConfig?.matrixStem;
              const matrixCols = isMatrix ? results.questionConfigs.filter(q => q.matrixStem === qConfig.matrixStem && results.pollCols.includes(q.col)).map(q => q.col) : [selectedQ];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {matrixCols.map(col => {
                    const xtabsForQ = results.xtabs[col] || [];
                    const subLabel = isMatrix ? (results.questionConfigs.find(q => q.col === col)?.matrixItem || col) : getLabel(col);
                    return (
                      <div key={col} className="card">
                        {isMatrix && <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, paddingLeft: 6, borderLeft: "3px solid #C5444A" }}>{subLabel}</div>}
                        {!isMatrix && <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{subLabel}</div>}
                        <RasmussenXtab xtabs={xtabsForQ} answerOrder={getAnswerOrder(col)} />
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── DIAGNOSTICS ── */}
      {activeTab === "diagnostics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Usability banner */}
          <div className="card" style={{ background: pollUsable ? "#E8F5E9" : "#FFEBEE", border: `2px solid ${pollUsable ? "#A5D6A7" : "#EF9A9A"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 32 }}>{pollUsable ? "✅" : "⚠️"}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: pollUsable ? "#1B5E20" : "#B71C1C" }}>
                  {pollUsable ? "Poll weights are acceptable" : "Review weight quality before publishing"}
                </div>
                <div style={{ fontSize: 12.5, color: pollUsable ? "#2E7D32" : "#C62828", marginTop: 3 }}>
                  DEFF={d.deff.toFixed(3)} · CV={d.cv.toFixed(1)}% · {d.pctOver3.toFixed(1)}% of weights above 3.0
                  {!pollUsable && " · Recommend adjusting benchmarks or enabling Smart Trimming"}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div className="card">
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14 }}>Weight Statistics</div>
              {[
                ["Minimum Weight", d.min.toFixed(4), d.min < 0.25 ? "tag-r" : "tag-g"],
                ["Maximum Weight", d.max.toFixed(4), d.max > 4 ? "tag-r" : d.max > 2.5 ? "tag-y" : "tag-g"],
                ["Mean Weight", d.mean.toFixed(4), "tag-b"],
                ["Coeff. of Variation", `${d.cv.toFixed(1)}%`, d.cv > 60 ? "tag-r" : d.cv > 40 ? "tag-y" : "tag-g"],
                ["% Weights < 0.5", `${d.pctUnder05.toFixed(1)}%`, d.pctUnder05 > 15 ? "tag-r" : "tag-g"],
                ["% Weights > 2.0", `${d.pctOver2.toFixed(1)}%`, d.pctOver2 > 20 ? "tag-r" : d.pctOver2 > 10 ? "tag-y" : "tag-g"],
                ["% Weights > 3.0", `${d.pctOver3.toFixed(1)}%`, d.pctOver3 > 10 ? "tag-r" : d.pctOver3 > 5 ? "tag-y" : "tag-g"],
                ["% Weights > 4.0", `${d.pctOver4.toFixed(1)}%`, d.pctOver4 > 5 ? "tag-r" : d.pctOver4 > 2 ? "tag-y" : "tag-g"],
                ["Chosen Cap", `${results.chosenCap}×`, "tag-dk"],
              ].map(([k, v, cls]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #F4F2EE" }}>
                  <span style={{ fontSize: 13, color: "#555" }}>{k}</span>
                  <span className={`tag ${cls}`} style={{ fontFamily: "JetBrains Mono" }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14 }}>Weight Distribution</div>
              {d.histogram.map(bin => {
                const isHigh = bin.bin.includes(">4") || bin.bin.includes("3.0–4");
                const isLow = bin.bin.includes("<0.25");
                const isGood = bin.bin.includes("0.75–1.0") || bin.bin.includes("1.0–1.5");
                const barColor = isHigh ? "#C5444A" : isLow ? "#F57F17" : isGood ? "#2E7D32" : "#1A1A1A";
                return (
                  <div key={bin.bin} className="hist-row">
                    <span className="hist-label">{bin.bin}</span>
                    <div className="hist-track">
                      <div className="hist-fill" style={{ width: `${Math.min(100, bin.pct)}%`, background: barColor, opacity: 0.8 }} />
                    </div>
                    <span className="hist-val">{bin.pct.toFixed(1)}% <span style={{ color: "#bbb" }}>({bin.count})</span></span>
                  </div>
                );
              })}
            </div>
          </div>

          {d.trimResults?.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18 }}>Smart Cap Optimizer</div>
                <span className="tag tag-g">Best: {d.bestCap}× cap</span>
              </div>
              <div style={{ fontSize: 12.5, color: "#666", marginBottom: 12 }}>
                Each cap tested to find optimal tradeoff. Lower DEFF = more efficient sample.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
                {d.trimResults.map(r => (
                  <div key={r.cap} style={{ background: r.cap === d.bestCap ? "#1A1A1A" : "white", color: r.cap === d.bestCap ? "white" : "#444", border: "1.5px solid", borderColor: r.cap === d.bestCap ? "#1A1A1A" : "#E0D8CC", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Cap {r.cap}×</div>
                    <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, marginTop: 3, opacity: 0.8 }}>DEFF {r.deff.toFixed(3)}</div>
                    <div style={{ fontSize: 10.5, marginTop: 2, opacity: 0.7 }}>Eff {r.eff.toFixed(1)}%</div>
                    {r.cap === d.bestCap && <div style={{ fontSize: 10, marginTop: 4, color: "#C5444A" }}>★ optimal</div>}
                  </div>
                ))}
              </div>
              <div>
                <div className="section-title">DEFF by cap</div>
                {d.trimResults.map(r => {
                  const maxD = Math.max(...d.trimResults.map(x => x.deff));
                  return (
                    <div key={r.cap} className="hist-row">
                      <span className="hist-label">Cap {r.cap}×</span>
                      <div className="hist-track">
                        <div className="hist-fill" style={{ width: `${(r.deff / maxD) * 100}%`, background: r.cap === d.bestCap ? "#2E7D32" : "#C0B8A8", opacity: r.cap === d.bestCap ? 1 : 0.5 }} />
                      </div>
                      <span className="hist-val" style={{ fontWeight: r.cap === d.bestCap ? 700 : 400, color: r.cap === d.bestCap ? "#2E7D32" : "#555" }}>{r.deff.toFixed(3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRE/POST ── */}
      {activeTab === "prepost" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card" style={{ background: "#FFFBF0", border: "1.5px solid #F0D080" }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>📊 Pre vs. Post-Weighting Composition</div>
            <div style={{ fontSize: 12.5, color: "#666" }}>
              Large shifts indicate sample imbalance. The <strong>Δ vs Target</strong> column confirms accuracy — values near 0 = well-calibrated.
            </div>
          </div>
          {Object.entries(
            results.prePostComparison.reduce((acc, row) => { if (!acc[row.variable]) acc[row.variable] = []; acc[row.variable].push(row); return acc; }, {})
          ).map(([varName, rows]) => (
            <div key={varName} className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>{varName}</div>
              <div className="xt-wrap">
                <table className="data-table" style={{ fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th style={{ textAlign: "right" }}>Unweighted</th>
                      <th style={{ textAlign: "right" }}>Weighted</th>
                      <th style={{ textAlign: "right" }}>Target</th>
                      <th style={{ textAlign: "right" }}>Shift</th>
                      <th style={{ textAlign: "right" }}>Δ vs Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const shift = r.weightedPct - r.samplePct;
                      const delta = r.weightedPct - r.targetPct;
                      return (
                        <tr key={r.category}>
                          <td style={{ fontWeight: 500 }}>{r.category}</td>
                          <td className="num">{r.samplePct.toFixed(1)}%</td>
                          <td className="num" style={{ fontWeight: 700 }}>{r.weightedPct.toFixed(1)}%</td>
                          <td className="num" style={{ color: "#888" }}>{r.targetPct.toFixed(1)}%</td>
                          <td style={{ textAlign: "right" }}>
                            <span className={`delta ${Math.abs(shift) < 2 ? "delta-ok" : shift > 0 ? "delta-up" : "delta-down"}`}>{shift > 0 ? "+" : ""}{shift.toFixed(1)}pp</span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span className={`delta ${Math.abs(delta) < 1 ? "delta-ok" : Math.abs(delta) < 3 ? "delta-down" : "delta-up"}`}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}pp</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Sparkline bars */}
              <div style={{ marginTop: 14 }}>
                {rows.map(r => (
                  <div key={r.category} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>{r.category}</div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <div style={{ flex: 1, height: 7, background: "#F0EDE6", borderRadius: 2 }}><div style={{ width: `${Math.min(100, r.samplePct)}%`, height: "100%", background: "#B8B0A0", borderRadius: 2 }} /></div>
                      <div style={{ flex: 1, height: 7, background: "#F0EDE6", borderRadius: 2 }}><div style={{ width: `${Math.min(100, r.weightedPct)}%`, height: "100%", background: "#1565C0", borderRadius: 2 }} /></div>
                      <div style={{ flex: 1, height: 7, background: "#F0EDE6", borderRadius: 2 }}><div style={{ width: `${Math.min(100, r.targetPct)}%`, height: "100%", background: "#C5444A", borderRadius: 2 }} /></div>
                    </div>
                    <div style={{ display: "flex", gap: 4, fontSize: 9, color: "#bbb", marginTop: 2 }}>
                      <div style={{ flex: 1 }}>Unwtd</div><div style={{ flex: 1 }}>Wtd</div><div style={{ flex: 1 }}>Target</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SAMPLE COMP ── */}
      {activeTab === "sample" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {Object.entries(results.sampleComp).map(([dim, data]) => {
            const rawData = results.rawSampleComp[dim] || [];
            return (
              <div key={dim} className="card">
                <div className="section-title">{dim}</div>
                {data.map(item => {
                  const raw = rawData.find(r => r.response === item.response);
                  return (
                    <div key={item.response} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 13 }}>{item.response}</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          {raw && <span style={{ fontSize: 11, color: "#888" }}>{(raw.pct * 100).toFixed(1)}%</span>}
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{(item.pct * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: "#F0EDE6", borderRadius: 3, position: "relative" }}>
                        {raw && <div style={{ position: "absolute", left: 0, top: 0, width: `${Math.min(100, raw.pct * 100)}%`, height: "100%", background: "#C8C0B0", borderRadius: 3, opacity: 0.6 }} />}
                        <div style={{ width: `${Math.min(100, item.pct * 100)}%`, height: "100%", background: "#1A1A1A", borderRadius: 3 }} />
                      </div>
                      <div style={{ display: "flex", gap: 8, fontSize: 9, color: "#bbb", marginTop: 2 }}>
                        <span>■ Unweighted</span><span>■ Weighted</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MISSING DATA ── */}
      {activeTab === "missing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {results.missingDataReport.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 56 }}>
              <div style={{ fontSize: 42, marginBottom: 12 }}>✅</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 8 }}>No Missing Data Found</div>
              <div style={{ color: "#666", fontSize: 14 }}>All demographic variables were fully populated.</div>
            </div>
          ) : (
            <>
              <div className="card" style={{ background: "#FFFBF0", border: "1.5px solid #F0D080" }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>🔧 Hot-Deck Imputation Applied</div>
                <div style={{ fontSize: 12.5, color: "#666" }}>Missing values filled by randomly drawing from respondents with observed values. Imputed cells tracked below.</div>
              </div>
              <div className="card">
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14 }}>Missing Data by Variable</div>
                <div className="xt-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Variable</th>
                        <th style={{ textAlign: "right" }}>Missing N</th>
                        <th style={{ textAlign: "right" }}>Missing %</th>
                        <th style={{ textAlign: "right" }}>Imputed N</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.missingDataReport.map(r => (
                        <tr key={r.col}>
                          <td style={{ fontFamily: "JetBrains Mono", fontSize: 12 }}>{r.col}</td>
                          <td className="num">{r.missingN.toLocaleString()}</td>
                          <td className="num">{r.missingPct.toFixed(1)}%</td>
                          <td className="num" style={{ color: "#2E7D32", fontWeight: 700 }}>{r.imputedN.toLocaleString()}</td>
                          <td><span className={`tag ${r.missingPct < 5 ? "tag-g" : r.missingPct < 15 ? "tag-y" : "tag-r"}`}>{r.missingPct < 5 ? "Low" : r.missingPct < 15 ? "Moderate" : "High"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── LV MODEL ── */}
      {activeTab === "lv" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div className="card">
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14 }}>LV Model Parameters</div>
              {[
                ["Model Type", "Bell-curve frequency-based (z-score logistic)"],
                ["Score Mean", results.scoreMean?.toFixed(4) ?? "—"],
                ["Score Std Dev", results.scoreSD?.toFixed(4) ?? "—"],
                ["Mean LV Probability", `${(results.lvProbs.reduce((s, v) => s + v, 0) / results.n * 100).toFixed(1)}%`],
                ["Effective LV N", Math.round(results.lvProbs.reduce((s, v) => s + v, 0)).toLocaleString()],
                ["LV Dimensions Used", results.lvProbs.length > 0 ? "Active" : "None"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F4F2EE", fontSize: 13 }}>
                  <span style={{ color: "#666" }}>{k}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14 }}>LV Probability Distribution</div>
              {/* Histogram of LV probs */}
              {[0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9].map((lo, i) => {
                const hi = lo + 0.1;
                const cnt = results.lvProbs.filter(p => p >= lo && p < hi).length;
                const pct = cnt / results.n * 100;
                const label = `${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}%`;
                const isMiddle = lo >= 0.4 && lo < 0.6;
                return (
                  <div key={i} className="hist-row">
                    <span className="hist-label">{label}</span>
                    <div className="hist-track">
                      <div className="hist-fill" style={{ width: `${pct}%`, background: isMiddle ? "#F57F17" : "#1A1A1A", opacity: 0.75 }} />
                    </div>
                    <span className="hist-val">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 8 }}>Respondent LV Score Distribution</div>
            <div style={{ fontSize: 12.5, color: "#666", marginBottom: 14 }}>
              Raw composite LV scores (0–1) before bell-curve transformation. The population is divided into deciles below.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 8 }}>
              {Array.from({ length: 10 }, (_, di) => {
                const lo = di / 10, hi = (di + 1) / 10;
                const cnt = results.rawScores.filter(s => s >= lo && (di === 9 ? s <= hi : s < hi)).length;
                const pct = cnt / results.n * 100;
                const meanLV = results.rawScores.reduce((sum, s, i) => sum + (s >= lo && (di === 9 ? s <= hi : s < hi) ? results.lvProbs[i] : 0), 0) / Math.max(cnt, 1);
                return (
                  <div key={di} style={{ textAlign: "center" }}>
                    <div style={{ height: 80, background: "#F0EDE6", borderRadius: 4, display: "flex", flexDirection: "column", justifyContent: "flex-end", overflow: "hidden", position: "relative" }}>
                      <div style={{ width: "100%", height: `${pct}%`, background: `hsl(${(di / 9) * 120}, 60%, 45%)`, transition: "height 0.5s" }} />
                    </div>
                    <div style={{ fontSize: 9, color: "#888", marginTop: 4 }}>D{di + 1}</div>
                    <div style={{ fontSize: 10, fontWeight: 600 }}>{pct.toFixed(0)}%</div>
                    <div style={{ fontSize: 9, color: "#C5444A" }}>LV:{(meanLV * 100).toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "#bbb" }}>
              <span>← Low LV propensity</span>
              <span>High LV propensity →</span>
            </div>
          </div>
        </div>
      )}

      {/* ── METHODOLOGY ── */}
      {activeTab === "methodology" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="card">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14 }}>Raking Diagnostics</div>
            {[
              ["Method", results.tieredWeightsApplied ? "Tiered IPF/RIM (Demo→Race→Political)" : results.externalWeightsUsed ? "External Weights (imported)" : "Flat IPF/RIM Raking"],
              ["Convergence", results.converged ? `Yes — ${results.itersUsed} iterations` : `Did not converge (${results.itersUsed})`],
              ["Design Effect (DEFF)", results.deff.toFixed(4)],
              ["Weighting Efficiency", `${results.eff.toFixed(1)}%`],
              ["Weight Floor / Cap", `0.20 / ${results.chosenCap}`],
              ["Cap Selection", `${results.chosenCap}× (minimum DEFF criterion)`],
              ["Active Dimensions", results.rakingTargets.length],
              ["Raking Variables", results.rakingTargets.join(", ")],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F4F2EE", fontSize: 13 }}>
                <span style={{ color: "#666" }}>{k}</span>
                <span style={{ fontWeight: 500, maxWidth: 260, textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14 }}>LV Model</div>
            <div className="method-box">
              Likely voter probabilities are computed using a bell-curve frequency model. Each respondent's LV score (0–1) is standardized to a z-score relative to the survey population's weighted median and standard deviation. The resulting z-score is passed through a logistic sigmoid with slope k=1.2, producing a LV probability between 0 and 1. LV weights = design weights × LV probabilities, renormalized to preserve total sample size.
            </div>
            {[
              ["Score Mean", results.scoreMean?.toFixed(4) ?? "—"],
              ["Score Std Dev", results.scoreSD?.toFixed(4) ?? "—"],
              ["Mean LV Probability", `${(results.lvProbs.reduce((s, v) => s + v, 0) / results.n * 100).toFixed(1)}%`],
              ["Effective LV N", Math.round(results.lvProbs.reduce((s, v) => s + v, 0)).toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F4F2EE", fontSize: 13 }}>
                <span style={{ color: "#666" }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14 }}>Recode & Imputation</div>
            <div className="method-box">
              {results.missingDataReport.length > 0 ? `Hot-deck probabilistic imputation was applied to ${results.missingDataReport.length} variable(s). Missing values were replaced by randomly drawing from respondents with observed values in the same survey wave.` : "No imputation was necessary — all demographic variables were fully populated."}
            </div>
            {[
              ["Custom Recode Rules", results.recoded ? "Applied" : "None"],
              ["State→Region Auto-Map", "Active (US Census regions)"],
              ["Race×Edu Composite", "Available via cross-tab dimensions"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F4F2EE", fontSize: 13 }}>
                <span style={{ color: "#666" }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, marginBottom: 14 }}>Crosstab Structure</div>
            <div className="method-box">
              Crosstabs follow the Rasmussen/Emerson format: response choices in rows, demographic breakdowns in columns, with the LV total in a highlighted leftmost position. Each cell shows the column-percentage within that demographic group.
            </div>
            <div style={{ fontSize: 12.5, color: "#555", lineHeight: 1.7 }}>
              <div><strong>Dimensions:</strong> {results.benchmarkDims.filter(d => !d.isRecall).map(d => d.label).join(", ")}</div>
              <div style={{ marginTop: 6 }}><strong>Weighting:</strong> {xtabMode.toUpperCase()} weights applied to all crosstabs</div>
              <div style={{ marginTop: 6 }}><strong>Cell values:</strong> Column percentages (% within demographic group)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Q Sidebar ────────────────────────────────────────────────────────────────
function QSidebar({ items, selectedId, onSelect }) {
  return (
    <div style={{ background: "white", borderRadius: 10, border: "1px solid var(--border)", padding: 10, maxHeight: 640, overflowY: "auto", position: "sticky", top: 80 }}>
      <div className="section-title" style={{ padding: "2px 8px 8px" }}>Questions</div>
      {items.map(item => (
        <div key={item.id} className={`q-item ${selectedId === item.id ? "on" : ""}`} onClick={() => onSelect(item)}>
          {item.isMatrix && <span style={{ fontSize: 9, fontWeight: 700, color: "#6A1B9A", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 1 }}>Matrix</span>}
          <span>{item.label.length > 40 ? item.label.slice(0, 40) + "…" : item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Topline Chart ────────────────────────────────────────────────────────────
function ToplineChart({ tl }) {
  const maxPct = Math.max(...tl.rv.map(i => i.pct * 100), 1);
  return (
    <div>
      {tl.rv.map(item => {
        const lvItem = tl.lv.find(l => l.response === item.response);
        const rvPct = item.pct * 100, lvPct = lvItem ? lvItem.pct * 100 : 0;
        return (
          <div key={item.response} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "#333", flex: 1, paddingRight: 12 }}>{item.response}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <span className="tag tag-b" style={{ minWidth: 52, textAlign: "center", fontFamily: "JetBrains Mono" }}>{rvPct.toFixed(1)}%</span>
                <span className="tag tag-y" style={{ minWidth: 52, textAlign: "center", fontFamily: "JetBrains Mono" }}>{lvPct.toFixed(1)}%</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: "#888", width: 16 }}>RV</span>
              <div style={{ flex: 1, height: 8, background: "#F0EDE6", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (rvPct / maxPct) * 100)}%`, height: "100%", background: "#1565C0", borderRadius: 3, opacity: 0.75 }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10, color: "#888", width: 16 }}>LV</span>
              <div style={{ flex: 1, height: 8, background: "#F0EDE6", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (lvPct / maxPct) * 100)}%`, height: "100%", background: "#F57F17", borderRadius: 3, opacity: 0.85 }} />
              </div>
            </div>
          </div>
        );
      })}
      {/* Data table */}
      <div style={{ marginTop: 20, overflowX: "auto", borderTop: "2px solid #F0EDE6", paddingTop: 14 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Response</th>
              <th style={{ textAlign: "right", color: "#1565C0" }}>RV %</th>
              <th style={{ textAlign: "right", color: "#F57F17" }}>LV %</th>
              <th style={{ textAlign: "right" }}>Wtd N</th>
            </tr>
          </thead>
          <tbody>
            {tl.rv.map(item => {
              const lv = tl.lv.find(l => l.response === item.response);
              return (
                <tr key={item.response}>
                  <td style={{ color: "#333" }}>{item.response}</td>
                  <td className="num" style={{ fontWeight: 700, color: "#1565C0" }}>{(item.pct * 100).toFixed(1)}%</td>
                  <td className="num" style={{ fontWeight: 700, color: "#C5444A" }}>{lv ? (lv.pct * 100).toFixed(1) + "%" : "—"}</td>
                  <td className="num" style={{ color: "#888" }}>{item.n.toFixed(0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Rasmussen-style Crosstab ─────────────────────────────────────────────────
function RasmussenXtab({ xtabs, answerOrder }) {
  if (!xtabs.length) return <div style={{ color: "#888", fontSize: 13 }}>No crosstab data available.</div>;
  const allResponses = xtabs[0].qList;

  // Assign distinct header colors per dimension
  const dimBg = { "Gender": "#EBF3FE", "Age": "#EDFAEE", "Race / Ethnicity": "#FFF4E5", "Education": "#F5EEFF", "Party ID": "#FDE8F0", "Region": "#E5F9F8" };

  return (
    <div className="xt-wrap">
      <table className="xt-table" style={{ minWidth: 700 }}>
        <thead>
          {/* Dimension headers */}
          <tr>
            <th className="resp-h" rowSpan={2}>Response</th>
            <th className="total-h" rowSpan={2} style={{ textAlign: "right", minWidth: 70 }}>Total</th>
            {xtabs.map(xt => (
              <th key={xt.breakdown} className="dim-h" colSpan={xt.byGroups.length} style={{ background: dimBg[xt.breakdown] || "#F8F6F2", borderLeft: "2px solid var(--border2)", color: "#444" }}>
                {xt.breakdown}
              </th>
            ))}
          </tr>
          {/* Group sub-headers */}
          <tr>
            {xtabs.map(xt => xt.byGroups.map((g, gi) => (
              <th key={`${xt.breakdown}_${g}`} className="group-h" style={{ background: dimBg[xt.breakdown] || "#F8F6F2", borderLeft: gi === 0 ? "2px solid var(--border2)" : "none", fontSize: 10, whiteSpace: "nowrap" }}>
                {g}
              </th>
            )))}
          </tr>
        </thead>
        <tbody>
          {allResponses.map((resp, ri) => (
            <tr key={resp} style={{ background: ri % 2 === 0 ? "white" : "#FAFAF8" }}>
              <td className="resp-cell">{resp}</td>
              <td className="total-cell">{xtabs[0].result[resp]?.Total ?? "—"}%</td>
              {xtabs.map(xt => xt.byGroups.map((g, gi) => (
                <td key={`${xt.breakdown}_${g}`} className="group-cell" style={{ borderLeft: gi === 0 ? "2px solid var(--border)" : "none" }}>
                  {xt.result[resp]?.[g] ?? "—"}%
                </td>
              )))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}