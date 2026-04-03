"use client";
import { useState, useCallback, useRef } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Category { name: string; pct: number; }
interface BenchmarkDim {
  id: string; label: string; internalKey: string; recodeMode: string;
  categories: Category[]; isRecall?: boolean; enabled?: boolean; sourceCol?: string;
}
interface LVScoring { pattern: string; points: number; }
interface LVQuestion {
  id: string; label: string; col: string; type: string; maxPoints: number; scoring: LVScoring[];
}
interface QuestionConfig {
  col: string; label: string; type: string; included: boolean;
  matrixStem?: string; matrixItem?: string; answerOrder?: string[];
}
interface FreqItem { response: string; pct: number; n: number; }
interface CrosstabResult {
  result: Record<string, Record<string, string>>;
  byGroups: string[];
  qList: string[];
  breakdown: string;
  groupTotals: Record<string, number>;
  totalN: number;
}
interface DiagnosticBin { bin: string; count: number; pct: number; }
interface TrimResult { cap: number; deff: number; eff: number; }
interface DiagnosticsResult {
  min: number; max: number; mean: number; cv: number;
  pctUnder05: number; pctOver2: number; pctOver3: number; pctOver4: number;
  histogram: DiagnosticBin[]; trimResults: TrimResult[]; bestCap: number;
  iterHistory: { iter: number; maxDelta: number }[];
}
interface MissingReport { col: string; missingN: number; missingPct: number; imputedN: number; }
interface PrePostRow { variable: string; category: string; samplePct: number; weightedPct: number; targetPct: number; }
interface AnalysisResults {
  n: number; converged: boolean; itersUsed: number; deff: number; eff: number;
  weights: number[]; lvWeights: number[]; lvProbs: number[]; rawScores: number[];
  scoreMean: number; scoreSD: number;
  pollCols: string[];
  toplines: Record<string, { rv: FreqItem[]; lv: FreqItem[] }>;
  xtabs: Record<string, CrosstabResult[]>;
  xtabsRV: Record<string, CrosstabResult[]>;
  sampleComp: Record<string, FreqItem[]>;
  rawSampleComp: Record<string, FreqItem[]>;
  prePostComparison: PrePostRow[];
  recoded: Record<string, string>[];
  headers: string[];
  rakingTargets: string[];
  benchmarkDims: BenchmarkDim[];
  questionConfigs: QuestionConfig[];
  diagnostics: DiagnosticsResult;
  missingDataReport: MissingReport[];
  tieredWeightsApplied: boolean;
  externalWeightsUsed: boolean;
  chosenCap: number;
  raceMode: RaceMode;
  lvFrequencyTable: Record<string, Record<string, { rawPct: number; lvWeight: number; count: number }>>;
}
interface RecodeRule { fromValue: string; toDim: string; toCategory: string; }
interface Notif { id: number; msg: string; type: string; }
interface SidebarItem { id: string; label: string; isMatrix?: boolean; stem?: string; }
interface ColMap { age: string; gender: string; race: string; education: string; recall: string; party: string; region: string; state: string; }

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&family=Syne:wght@400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #F7F5F0;
  --bg2: #EFEDE6;
  --bg3: #E8E4DA;
  --card: #FFFFFF;
  --border: #D8D4C8;
  --border2: #C4BFB0;
  --text: #1A1714;
  --text2: #5A5248;
  --text3: #9A9288;
  --accent: #2D5A3D;
  --accent2: #4A8C5C;
  --accent-light: #E8F4EC;
  --warn: #C4621A;
  --warn-light: #FDF0E6;
  --err: #B83232;
  --err-light: #FDEAEA;
  --blue: #1E3A6E;
  --blue-light: #E8EDF7;
  --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06);
  --shadow-lg: 0 4px 24px rgba(0,0,0,0.12);
}

body { font-family: 'Space Grotesk', sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: var(--bg2); }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

/* BUTTONS */
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border: 1.5px solid var(--border2); cursor: pointer; font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 600; transition: all 0.15s; white-space: nowrap; background: transparent; color: var(--text); border-radius: 6px; }
.btn:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-primary { background: var(--accent); color: white; border-color: var(--accent); }
.btn-primary:hover:not(:disabled) { background: #234829; }
.btn-accent { background: var(--blue); color: white; border-color: var(--blue); }
.btn-accent:hover:not(:disabled) { background: #162D56; }
.btn-warn { background: var(--warn); color: white; border-color: var(--warn); }
.btn-warn:hover:not(:disabled) { background: #A35318; }
.btn-outline { border-color: var(--border2); color: var(--text2); background: white; }
.btn-outline:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
.btn-ghost { background: transparent; border-color: transparent; color: var(--text3); }
.btn-ghost:hover:not(:disabled) { background: var(--bg2); color: var(--text2); }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-xs { padding: 3px 8px; font-size: 11px; }

/* INPUTS */
.inp { width: 100%; padding: 9px 12px; border: 1.5px solid var(--border); background: white; font-family: 'Space Grotesk', sans-serif; font-size: 13px; color: var(--text); outline: none; transition: border-color 0.2s; border-radius: 6px; }
.inp:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(45,90,61,0.1); }
.inp-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.sel { width: 100%; padding: 9px 32px 9px 12px; border: 1.5px solid var(--border); background: white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6L10 0z' fill='%239A9288'/%3E%3C/svg%3E") no-repeat right 12px center; font-family: 'Space Grotesk', sans-serif; font-size: 13px; color: var(--text); outline: none; appearance: none; cursor: pointer; border-radius: 6px; }
.sel:focus { border-color: var(--accent); }
.bench-inp { width: 76px; padding: 7px 10px; border: 1.5px solid var(--border); background: white; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text); text-align: right; outline: none; border-radius: 6px; }
.bench-inp:focus { border-color: var(--accent); }
textarea.inp { resize: vertical; min-height: 80px; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.5; }

/* CARDS */
.card { background: var(--card); border: 1.5px solid var(--border); padding: 20px; border-radius: 10px; box-shadow: var(--shadow); }
.card-sm { background: var(--card); border: 1.5px solid var(--border); padding: 14px; border-radius: 8px; }

/* TAGS */
.tag { display: inline-block; padding: 2px 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; border-radius: 4px; }
.tag-g { background: var(--accent-light); color: var(--accent); }
.tag-r { background: var(--err-light); color: var(--err); }
.tag-b { background: var(--blue-light); color: var(--blue); }
.tag-y { background: var(--warn-light); color: var(--warn); }
.tag-p { background: #F0ECFF; color: #5B3FB5; }
.tag-dk { background: var(--text); color: var(--bg); }
.tag-teal { background: #E6F7F5; color: #1A7A6E; }

/* TOGGLE */
.toggle { width: 40px; height: 22px; background: var(--border2); border: none; cursor: pointer; transition: all 0.2s; position: relative; flex-shrink: 0; border-radius: 11px; }
.toggle.on { background: var(--accent); }
.toggle::after { content: ''; position: absolute; width: 16px; height: 16px; background: white; top: 3px; left: 3px; transition: all 0.2s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.toggle.on::after { left: 21px; }
.toggle-sm { width: 30px; height: 17px; }
.toggle-sm::after { width: 11px; height: 11px; top: 3px; }
.toggle-sm.on::after { left: 16px; }

/* TABS */
.tab { padding: 10px 18px; border: none; background: transparent; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600; color: var(--text3); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; white-space: nowrap; letter-spacing: 0.3px; }
.tab.on { color: var(--accent); border-bottom-color: var(--accent); }
.tab:hover:not(.on) { color: var(--text2); background: var(--bg2); }

/* SIDEBAR ITEMS */
.q-item { padding: 9px 14px; cursor: pointer; font-size: 12.5px; color: var(--text2); transition: all 0.12s; border-left: 2.5px solid transparent; line-height: 1.4; border-bottom: 1px solid var(--border); }
.q-item:hover { background: var(--bg); color: var(--text); }
.q-item.on { background: var(--accent-light); color: var(--accent); border-left-color: var(--accent); font-weight: 600; }

/* ANIMATIONS */
@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
.fade-in { animation: fadeIn 0.3s ease both; }

.progress-bar { height: 3px; background: var(--border); overflow: hidden; border-radius: 2px; }
.progress-fill { height: 100%; background: var(--accent); transition: width 0.4s ease; border-radius: 2px; }

/* TABLES */
.data-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.data-table th { background: var(--bg2); padding: 9px 12px; font-weight: 700; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text3); border-bottom: 1.5px solid var(--border); text-align: left; white-space: nowrap; font-family: 'Syne', sans-serif; }
.data-table td { padding: 9px 12px; border-bottom: 1px solid var(--border); }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--bg); }
.data-table .num { text-align: right; font-family: 'JetBrains Mono', monospace; }

/* HISTOGRAMS */
.hist-row { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; }
.hist-label { font-size: 10.5px; color: var(--text3); width: 76px; text-align: right; flex-shrink: 0; font-family: 'JetBrains Mono', monospace; }
.hist-track { flex: 1; height: 14px; background: var(--bg2); overflow: hidden; border-radius: 3px; }
.hist-fill { height: 100%; transition: width 0.5s ease; border-radius: 3px; }
.hist-val { font-size: 10.5px; color: var(--text2); width: 72px; text-align: right; flex-shrink: 0; font-family: 'JetBrains Mono', monospace; }

/* DELTA */
.delta { display: inline-block; padding: 2px 8px; font-size: 10.5px; font-weight: 700; font-family: 'JetBrains Mono', monospace; border-radius: 4px; }
.delta-up { background: var(--err-light); color: var(--err); }
.delta-down { background: var(--accent-light); color: var(--accent); }
.delta-ok { background: var(--bg2); color: var(--text3); }

/* SECTION TITLE */
.section-title { font-size: 10.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text3); margin-bottom: 12px; font-family: 'Syne', sans-serif; }

/* UPLOAD */
.upload-zone { border: 2px dashed var(--border2); padding: 40px 28px; cursor: pointer; transition: all 0.2s; text-align: center; background: white; border-radius: 12px; }
.upload-zone:hover, .upload-zone.drag { border-color: var(--accent); background: var(--accent-light); }
.upload-zone.has-file { border-color: var(--accent); border-style: solid; background: var(--accent-light); }

/* NOTIFICATIONS */
.notif { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; }
.notif-item { background: white; color: var(--text); border: 1.5px solid var(--border); padding: 12px 18px; font-size: 12px; font-weight: 500; box-shadow: var(--shadow-lg); animation: fadeIn 0.3s ease; max-width: 380px; display: flex; align-items: center; gap: 10px; font-family: 'JetBrains Mono', monospace; border-radius: 8px; }
.notif-item.success { border-color: var(--accent); background: var(--accent-light); color: var(--accent); }
.notif-item.error { border-color: var(--err); background: var(--err-light); color: var(--err); }

/* RECODE ROW */
.recode-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg2); border: 1.5px solid var(--border); margin-bottom: 6px; border-radius: 6px; }

/* LOADING OVERLAY */
.loading-overlay { position: fixed; inset: 0; background: rgba(247,245,240,0.97); z-index: 8888; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.spinner { width: 44px; height: 44px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
.loading-step { display: flex; align-items: center; gap: 10px; font-size: 12px; font-family: 'JetBrains Mono', monospace; color: var(--text3); padding: 7px 0; transition: all 0.3s; }
.loading-step.done { color: var(--accent); }
.loading-step.active { color: var(--blue); }

/* CROSSTAB */
.xt-wrap { overflow-x: auto; border: 1.5px solid var(--border); border-radius: 8px; }
.xt-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.xt-table th { padding: 9px 11px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; white-space: nowrap; border-bottom: 1.5px solid var(--border2); font-family: 'Syne', sans-serif; }
.xt-table th.resp-h { background: var(--bg2); text-align: left; min-width: 160px; color: var(--text3); position: sticky; left: 0; z-index: 2; }
.xt-table th.total-h { background: var(--accent); color: white; text-align: right; }
.xt-table th.group-h { background: var(--bg2); color: var(--text3); text-align: right; }
.xt-table th.dim-h { text-align: center; font-size: 9.5px; border-left: 1.5px solid var(--border2); background: var(--bg3); color: var(--text2); }
.xt-table td { padding: 8px 11px; border-bottom: 1px solid var(--border); }
.xt-table td.resp-cell { font-weight: 600; color: var(--text2); position: sticky; left: 0; background: white; z-index: 1; border-right: 1px solid var(--border); }
.xt-table tr:hover td { background: var(--bg); }
.xt-table tr:hover td.resp-cell { background: var(--bg); }
.xt-table td.total-cell { text-align: right; font-weight: 700; font-family: 'JetBrains Mono', monospace; background: var(--accent-light); color: var(--accent); }
.xt-table td.group-cell { text-align: right; font-family: 'JetBrains Mono', monospace; color: var(--text2); }
.xt-table td.border-l { border-left: 1px solid var(--border2); }

/* STEP NAV */
.step-dot { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 11.5px; font-weight: 700; flex-shrink: 0; transition: all 0.2s; cursor: pointer; font-family: 'JetBrains Mono', monospace; border: 2px solid var(--border2); color: var(--text3); background: white; border-radius: 50%; }
.step-dot.done { background: var(--accent); color: white; border-color: var(--accent); }
.step-dot.active { background: white; color: var(--accent); border-color: var(--accent); box-shadow: 0 0 0 4px rgba(45,90,61,0.12); }
.step-line { height: 2px; width: 24px; background: var(--border); flex-shrink: 0; border-radius: 1px; }
.step-line.done { background: var(--accent); }

/* KPI */
.kpi-block { padding: 18px 22px; border: 1.5px solid var(--border); border-radius: 10px; background: white; box-shadow: var(--shadow); }
.kpi-num { font-family: 'Syne', sans-serif; font-size: 30px; font-weight: 800; line-height: 1; }
.kpi-sub { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }

/* LV FREQ */
.lv-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 9px; }
.lv-bar-label { font-size: 12px; flex: 1; color: var(--text); }
.lv-bar-track { width: 140px; height: 10px; background: var(--bg2); border-radius: 5px; overflow: hidden; flex-shrink: 0; }
.lv-bar-fill { height: 100%; border-radius: 5px; transition: width 0.4s ease; }
.lv-bar-pct { font-size: 11px; font-family: 'JetBrains Mono', monospace; width: 44px; text-align: right; flex-shrink: 0; }
.lv-bar-wt { font-size: 11px; font-family: 'JetBrains Mono', monospace; width: 52px; text-align: right; flex-shrink: 0; color: var(--warn); font-weight: 600; }

@media print {
  .no-print { display: none !important; }
  body { background: white; }
  .card { box-shadow: none; }
}
`;

// ─── CSV Utils ────────────────────────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(cur.trim()); cur = ""; }
    else { cur += c; }
  }
  result.push(cur.trim()); return result;
}
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = vals[j] ?? ""; });
    rows.push(row);
  }
  return { headers, rows };
}
function toCSV(headers: string[], rows: Record<string, string | number>[]): string {
  const esc = (v: string | number) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
  return [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h] ?? "")).join(","))].join("\n");
}

function parseExternalWeights(text: string): number[] | null {
  const lines = text.split(/\r?\n/).filter((l: string) => l.trim());
  if (!lines.length) return null;
  const first = parseCSVLine(lines[0]);
  if (first.length === 1) {
    if (isNaN(parseFloat(first[0]))) return lines.slice(1).map((l: string) => parseFloat(l.trim())).filter((v: number) => !isNaN(v));
    return lines.map((l: string) => parseFloat(l.trim())).filter((v: number) => !isNaN(v));
  }
  if (!isNaN(parseFloat(first[1 < first.length ? 1 : 0]))) {
    const startLine = isNaN(parseFloat(first[0])) ? 1 : 0;
    return lines.slice(startLine).map((l: string) => { const v = parseCSVLine(l); return parseFloat(v[v.length - 1]); }).filter((v: number) => !isNaN(v));
  }
  return null;
}

function imputeMissing(rows: Record<string, string>[], dimKeys: string[]): { imputed: Record<string, string>[]; report: MissingReport[] } {
  const report: MissingReport[] = [];
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

// ─── MULTI-PASS RAKING ────────────────────────────────────────────────────────
// Target deff of 2.0-2.5 with subgroup-aware capping
function runMultiPassRaking(
  rows: Record<string, string>[],
  targets: { variable: string; categories: { value: string; proportion: number }[]; recallMask?: boolean[] }[],
  options: { maxIter?: number; targetDeffLow?: number; targetDeffHigh?: number; maxPasses?: number } = {}
): { weights: Float64Array; converged: boolean; itersUsed: number; deff: number; eff: number; iterHistory: { iter: number; maxDelta: number }[]; finalCap: number } {
  const {
    maxIter = 600,
    targetDeffLow = 2.0,
    targetDeffHigh = 2.5,
    maxPasses = 4,
  } = options;

  const n = rows.length;
  const iterHistory: { iter: number; maxDelta: number }[] = [];

  // Compute subgroup sizes to determine appropriate caps
  const subgroupCaps: Record<string, number> = {};
  for (const t of targets) {
    for (const cat of t.categories) {
      const groupN = rows.filter(r => r[t.variable] === cat.value).length;
      const groupShare = groupN / n;
      // Smaller subgroups get higher caps; larger subgroups get lower caps
      if (groupShare < 0.05) subgroupCaps[`${t.variable}:${cat.value}`] = 4.0;
      else if (groupShare < 0.10) subgroupCaps[`${t.variable}:${cat.value}`] = 3.5;
      else if (groupShare < 0.20) subgroupCaps[`${t.variable}:${cat.value}`] = 3.0;
      else subgroupCaps[`${t.variable}:${cat.value}`] = 2.5;
    }
  }

  let bestWeights = new Float64Array(n).fill(1.0);
  let bestDeff = Infinity;
  let bestCap = 2.5;
  let overallConverged = false;
  let totalIters = 0;

  // Try multiple cap levels in multiple passes to hit target deff range
  const capsToTry = [2.0, 2.25, 2.5, 2.75, 3.0, 3.5, 4.0, 4.5, 5.0];

  for (const globalCap of capsToTry) {
    const weights = new Float64Array(n).fill(1.0);
    const FLOOR = 0.2;
    const TOL = 1e-5;
    let converged = false;
    let itersUsed = 0;

    // Multi-pass: run multiple complete sweeps to ensure convergence
    for (let pass = 0; pass < maxPasses; pass++) {
      for (let iter = 0; iter < maxIter; iter++) {
        let maxDelta = 0;

        for (const { variable, categories, recallMask } of targets) {
          const isRecall = !!recallMask;
          let baseSum = 0;
          for (let i = 0; i < n; i++) {
            if (!isRecall || recallMask![i]) baseSum += weights[i];
          }

          for (const { value, proportion } of categories) {
            let catSum = 0;
            for (let i = 0; i < n; i++) {
              if (rows[i][variable] === value && (!isRecall || recallMask![i])) catSum += weights[i];
            }
            if (catSum === 0) continue;
            const curProp = catSum / baseSum;
            const scale = proportion / curProp;
            maxDelta = Math.max(maxDelta, Math.abs(curProp - proportion));

            // Use subgroup-specific cap if available, else global cap
            const subgroupCap = subgroupCaps[`${variable}:${value}`] ?? globalCap;
            const effectiveCap = Math.min(globalCap, subgroupCap * 1.2); // blend global & subgroup

            for (let i = 0; i < n; i++) {
              if (rows[i][variable] === value && (!isRecall || recallMask![i])) {
                weights[i] = Math.min(effectiveCap, Math.max(FLOOR, weights[i] * scale));
              }
            }
          }
        }

        const globalIter = pass * maxIter + iter;
        if (globalIter % 50 === 0) iterHistory.push({ iter: globalIter, maxDelta });

        itersUsed++;
        if (maxDelta < TOL) { converged = true; break; }
      }
    }

    totalIters += itersUsed;

    // Normalize so mean = 1
    let sum = 0;
    for (let i = 0; i < n; i++) sum += weights[i];
    const mean = sum / n;
    for (let i = 0; i < n; i++) weights[i] /= mean;

    // Compute deff
    let sumSq = 0;
    for (let i = 0; i < n; i++) sumSq += weights[i] ** 2;
    const deff = (sumSq / n);
    const eff = (1 / deff) * 100;

    // Check if this cap lands in our target deff range
    if (deff >= targetDeffLow && deff <= targetDeffHigh) {
      bestWeights = weights;
      bestDeff = deff;
      bestCap = globalCap;
      overallConverged = converged;
      break;
    }

    // Track best (closest to midpoint of target range)
    const targetMid = (targetDeffLow + targetDeffHigh) / 2;
    if (Math.abs(deff - targetMid) < Math.abs(bestDeff - targetMid)) {
      bestWeights = weights;
      bestDeff = deff;
      bestCap = globalCap;
      overallConverged = converged;
    }
  }

  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += bestWeights[i] ** 2;
  const finalDeff = sumSq / n;
  const finalEff = (1 / finalDeff) * 100;

  return { weights: bestWeights, converged: overallConverged, itersUsed: totalIters, deff: finalDeff, eff: finalEff, iterHistory, finalCap: bestCap };
}

// Tiered multi-pass raking: demo first, then race, then political
function runTieredMultiPassRaking(
  rows: Record<string, string>[],
  allTargets: { variable: string; categories: { value: string; proportion: number }[]; recallMask?: boolean[] }[],
  options: { targetDeffLow?: number; targetDeffHigh?: number } = {}
) {
  // Tier 1: Core demographics (age, gender, education)
  const tier1 = allTargets.filter(t => ["_age","_gender","_edu"].includes(t.variable));
  // Tier 2: Race
  const tier2 = allTargets.filter(t => t.variable === "_race");
  // Tier 3: Political (recall, party, region, custom)
  const tier3 = allTargets.filter(t => !["_age","_gender","_edu","_race"].includes(t.variable));

  // Run full multi-pass on all combined tiers sequentially
  const result = runMultiPassRaking(rows, [...tier1, ...tier2, ...tier3], { maxIter: 400, maxPasses: 5, ...options });
  return result;
}

function computeDiagnostics(
  weights: number[],
  rows: Record<string, string>[],
  targets: { variable: string; categories: { value: string; proportion: number }[]; recallMask?: boolean[] }[],
  iterHistory: { iter: number; maxDelta: number }[]
): DiagnosticsResult {
  const n = weights.length;
  const min = Math.min(...weights), max = Math.max(...weights);
  const mean = weights.reduce((s: number, v: number) => s + v, 0) / n;
  const variance = weights.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / n;
  const cv = Math.sqrt(variance) / mean * 100;
  const pctUnder05 = weights.filter((w: number) => w < 0.5).length / n * 100;
  const pctOver2 = weights.filter((w: number) => w > 2).length / n * 100;
  const pctOver3 = weights.filter((w: number) => w > 3).length / n * 100;
  const pctOver4 = weights.filter((w: number) => w > 4).length / n * 100;

  const bins = [
    { label: "<0.25", min: 0, max: 0.25 },{ label: "0.25–0.5", min: 0.25, max: 0.5 },
    { label: "0.5–0.75", min: 0.5, max: 0.75 },{ label: "0.75–1.0", min: 0.75, max: 1.0 },
    { label: "1.0–1.5", min: 1.0, max: 1.5 },{ label: "1.5–2.0", min: 1.5, max: 2.0 },
    { label: "2.0–3.0", min: 2.0, max: 3.0 },{ label: "3.0–4.0", min: 3.0, max: 4.0 },
    { label: ">4.0", min: 4.0, max: Infinity },
  ];
  const histogram: DiagnosticBin[] = bins.map(b => {
    const count = weights.filter((w: number) => w >= b.min && w < b.max).length;
    return { bin: b.label, count, pct: count / n * 100 };
  });

  // Test multiple caps to show effect on deff
  const trimResults: TrimResult[] = [];
  for (const cap of [2.0, 2.25, 2.5, 2.75, 3.0, 3.5, 4.0, 4.5, 5.0]) {
    const res = runMultiPassRaking(rows, targets, { maxIter: 150, maxPasses: 2, targetDeffLow: cap - 0.1, targetDeffHigh: cap + 0.1 });
    trimResults.push({ cap, deff: res.deff, eff: res.eff });
  }
  const bestCap = trimResults.reduce((best, r) => Math.abs(r.deff - 2.25) < Math.abs(best.deff - 2.25) ? r : best, trimResults[0]).cap;

  return { min, max, mean, cv, pctUnder05, pctOver2, pctOver3, pctOver4, histogram, trimResults, bestCap, iterHistory };
}

function buildPrePost(rows: Record<string, string>[], weights: number[], benchmarkDims: BenchmarkDim[]): PrePostRow[] {
  const n = rows.length;
  const totalW = weights.reduce((s: number, v: number) => s + v, 0);
  const result: PrePostRow[] = [];
  for (const dim of benchmarkDims) {
    for (const cat of dim.categories) {
      const rawCount = rows.filter(r => r[dim.internalKey] === cat.name).length;
      const wtCount = rows.reduce((s: number, r, i) => s + (r[dim.internalKey] === cat.name ? weights[i] : 0), 0);
      result.push({ variable: dim.label, category: cat.name, samplePct: rawCount / n * 100, weightedPct: wtCount / totalW * 100, targetPct: cat.pct });
    }
  }
  return result;
}

// ─── LV MODEL: FREQUENCY-BASED SCORING ───────────────────────────────────────
// Builds a frequency table per LV question column, then computes LV weights
// based on how common each answer choice is (rarer = more "likely voter"-ish).
function computeLVFrequencyModel(
  rows: Record<string, string>[],
  designWeights: number[],
  lvQuestions: LVQuestion[]
): {
  lvWeights: number[];
  lvProbs: number[];
  rawScores: number[];
  scoreMean: number;
  scoreSD: number;
  frequencyTable: Record<string, Record<string, { rawPct: number; lvWeight: number; count: number }>>;
} {
  const n = rows.length;
  const frequencyTable: Record<string, Record<string, { rawPct: number; lvWeight: number; count: number }>> = {};
  const dimensionScores: number[] = new Array(n).fill(0);
  let totalMaxDims = 0;

  for (const lv of lvQuestions) {
    if (!lv.col) {
      // No column mapped — give everyone full score on this dimension
      for (let i = 0; i < n; i++) dimensionScores[i] += 1;
      totalMaxDims += 1;
      continue;
    }

    // Step 1: Build weighted frequency table for this column
    const freqMap: Record<string, number> = {};
    const countMap: Record<string, number> = {};
    let totalW = 0;

    for (let i = 0; i < n; i++) {
      const v = (rows[i][lv.col] || "").trim();
      if (!v) continue;
      freqMap[v] = (freqMap[v] || 0) + designWeights[i];
      countMap[v] = (countMap[v] || 0) + 1;
      totalW += designWeights[i];
    }

    const propMap: Record<string, number> = {};
    for (const [k, v] of Object.entries(freqMap)) propMap[k] = (v as number) / totalW;

    // Step 2: Compute pattern score (0–1) for each unique response
    const patternScore: Record<string, number> = {};
    for (const resp of Object.keys(propMap)) {
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

    // Step 3: Apply frequency-based LV weight to each response
    // High-scoring responses that are LESS common get a frequency boost.
    // The LV weight per response = pattern_score × (1 / frequency_penalty)
    // frequency_penalty = sqrt(prop) so rare answers don't get extreme boosts.
    const lvWeightPerResp: Record<string, number> = {};
    for (const [resp, prop] of Object.entries(propMap)) {
      const score = patternScore[resp] ?? 0;
      // Frequency-adjusted: rarer high-scoring answers get more weight
      const freqPenalty = Math.sqrt(prop);
      lvWeightPerResp[resp] = score > 0 ? score / (freqPenalty + 0.05) : 0;
    }

    // Normalize lvWeightPerResp to 0–1 range
    const maxLV = Math.max(...Object.values(lvWeightPerResp), 0.001);
    for (const resp of Object.keys(lvWeightPerResp)) {
      lvWeightPerResp[resp] = lvWeightPerResp[resp] / maxLV;
    }

    // Build frequency table entry for display
    frequencyTable[lv.col] = {};
    for (const [resp, prop] of Object.entries(propMap)) {
      frequencyTable[lv.col][resp] = {
        rawPct: prop * 100,
        lvWeight: lvWeightPerResp[resp],
        count: countMap[resp] || 0,
      };
    }

    // Step 4: Score each respondent
    for (let i = 0; i < n; i++) {
      const resp = (rows[i][lv.col] || "").trim();
      dimensionScores[i] += lvWeightPerResp[resp] ?? 0;
    }

    totalMaxDims += 1;
  }

  // Step 5: Normalize scores to 0–1
  const rawScores = dimensionScores.map(s => totalMaxDims > 0 ? Math.min(1, s / totalMaxDims) : 0.5);

  // Step 6: Z-score and apply logistic sigmoid to get LV probability
  const scoreMean = rawScores.reduce((s: number, v: number) => s + v, 0) / n;
  const scoreVar = rawScores.reduce((s: number, v: number) => s + (v - scoreMean) ** 2, 0) / n;
  const scoreSD = Math.sqrt(Math.max(scoreVar, 0.001));

  const lvProbs = rawScores.map(s => {
    const z = (s - scoreMean) / scoreSD;
    return 1 / (1 + Math.exp(-1.6 * z)); // steeper sigmoid for sharper LV cut
  });

  // Step 7: LV weights = RV design weight × LV propensity scalar.
  // The RV weight is already the authoritative design weight from raking.
  // LV scoring ONLY adjusts that weight proportionally — no re-raking,
  // no renormalization to a different target sum.
  // All respondents are retained. Low-LV respondents get a floor of 0.15
  // so they are down-weighted but never zeroed out of any output.
  // The scalar is centered on 1.0 so that a "median LV" respondent keeps
  // exactly their RV weight; high-LV respondents get uplifted, low-LV get
  // reduced, but the mean LV weight ≈ mean RV weight.
  const LV_FLOOR = 0.15;          // minimum LV propensity (keeps everyone in)
  const LV_SCALE = 2.0;           // range multiplier: 0.15 → 2.15 across [0,1]
  // Map each respondent's LV probability to a multiplicative scalar around 1.0
  // scalar = LV_FLOOR + (lvProb × LV_SCALE), then divide by the mean scalar
  // so the average adjustment is exactly 1.0 (weights sum unchanged from RV).
  const rawScalars = lvProbs.map(p => LV_FLOOR + p * LV_SCALE);
  const meanScalar = rawScalars.reduce((s: number, v: number) => s + v, 0) / n;
  const lvWeights = rawScalars.map((scalar, i) =>
    designWeights[i] * (scalar / meanScalar)
  );

  return { lvWeights, lvProbs, rawScores, scoreMean, scoreSD, frequencyTable };
}

function freqTable(rows: Record<string, string>[], col: string, weights: number[], answerOrder?: string[]): FreqItem[] {
  const counts: Record<string, number> = {}; let total = 0;
  rows.forEach((row, i) => {
    const v = row[col] || ""; if (!v.trim()) return;
    counts[v] = (counts[v] || 0) + weights[i]; total += weights[i];
  });
  const items: FreqItem[] = Object.entries(counts).map(([response, wt]) => ({ response, pct: (wt as number) / total, n: wt as number }));
  if (answerOrder?.length) {
    items.sort((a, b) => {
      const ai = answerOrder.indexOf(a.response), bi = answerOrder.indexOf(b.response);
      if (ai === -1 && bi === -1) return a.response.localeCompare(b.response);
      if (ai === -1) return 1; if (bi === -1) return -1; return ai - bi;
    });
  } else items.sort((a, b) => b.n - a.n);
  return items;
}

function crosstab(rows: Record<string, string>[], qCol: string, byCol: string, weights: number[], answerOrder?: string[]): Omit<CrosstabResult, 'breakdown'> {
  const groups: Record<string, Record<string, number>> = {};
  const qVals = new Set<string>();
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
  const totalByQ: Record<string, number> = {}; let totalAll = 0;
  Object.values(groups).forEach(g => Object.entries(g).forEach(([q, w]) => { totalByQ[q] = (totalByQ[q] || 0) + (w as number); totalAll += w as number; }));

  // Weighted group totals (sum of weights for respondents in each group, regardless of q response)
  const groupTotals: Record<string, number> = {};
  byGroups.forEach(b => {
    groupTotals[b] = Object.values(groups[b]).reduce((s: number, v: unknown) => s + (v as number), 0);
  });

  const result: Record<string, Record<string, string>> = {};
  qList.forEach(q => {
    result[q] = { Total: totalByQ[q] ? ((totalByQ[q] / totalAll) * 100).toFixed(0) : "0" };
    byGroups.forEach(b => { const gt = groupTotals[b]; result[q][b] = groups[b]?.[q] ? ((groups[b][q] / gt) * 100).toFixed(0) : "0"; });
  });
  return { result, byGroups, qList, groupTotals, totalN: Math.round(totalAll) };
}

// ─── RESPONSE COMBINER ───────────────────────────────────────────────────────
// Detects scale-like answer sets and merges "top-box" / "bottom-box" combos.
// e.g. "Strongly Approve" + "Somewhat Approve" → "Total Approve (net)"

interface CombineGroup { label: string; members: string[]; isNet?: boolean; }

function detectCombineGroups(responses: string[]): CombineGroup[] {
  const groups: CombineGroup[] = [];
  const used = new Set<string>();

  // Pattern pairs: [positive modifier, negative modifier, combined label suffix]
  const SCALE_PATTERNS: Array<{ pos: RegExp; neg: RegExp; netLabel: (base: string) => string }> = [
    {
      pos: /^(strongly|very)\s+(.+)$/i,
      neg: /^(somewhat|fairly|slightly|moderately|kind of|sort of)\s+(.+)$/i,
      netLabel: (base) => `Total ${base}`,
    },
  ];

  // Collect unique base words from responses
  const baseMap: Record<string, { strong: string[]; soft: string[] }> = {};

  for (const resp of responses) {
    for (const pat of SCALE_PATTERNS) {
      const strongMatch = resp.match(pat.pos);
      const softMatch = resp.match(pat.neg);
      if (strongMatch) {
        const base = strongMatch[2].trim();
        if (!baseMap[base]) baseMap[base] = { strong: [], soft: [] };
        baseMap[base].strong.push(resp);
      } else if (softMatch) {
        const base = softMatch[2].trim();
        if (!baseMap[base]) baseMap[base] = { strong: [], soft: [] };
        baseMap[base].soft.push(resp);
      }
    }
  }

  // Build combine groups for bases that have both strong + soft
  for (const [base, { strong, soft }] of Object.entries(baseMap)) {
    if (strong.length > 0 && soft.length > 0) {
      const members = [...strong, ...soft];
      // Sort members: strong first
      members.sort((a, b) => {
        const aStr = /^(strongly|very)/i.test(a) ? 0 : 1;
        const bStr = /^(strongly|very)/i.test(b) ? 0 : 1;
        return aStr - bStr;
      });
      const label = `Total ${base.charAt(0).toUpperCase() + base.slice(1)}`;
      groups.push({ label, members, isNet: true });
      members.forEach(m => used.add(m));
    }
  }

  // Also handle numeric scale collapses: top-2-box / bottom-2-box
  // e.g. "10", "9", "8" → "Top Box (8-10)"
  const numericResps = responses.filter(r => /^\d+$/.test(r.trim())).map(r => parseInt(r.trim())).filter(n => !isNaN(n));
  if (numericResps.length >= 4) {
    const sorted = [...numericResps].sort((a, b) => a - b);
    const min = sorted[0], max = sorted[sorted.length - 1];
    const range = max - min;
    if (range >= 4) {
      const topThreshold = max - Math.floor(range * 0.3);
      const botThreshold = min + Math.floor(range * 0.3);
      const topMembers = sorted.filter(n => n >= topThreshold).map(String);
      const botMembers = sorted.filter(n => n <= botThreshold).map(String);
      if (topMembers.length >= 2 && topMembers.every(m => responses.includes(m))) {
        groups.push({ label: `Top Box (${topMembers[0]}–${topMembers[topMembers.length-1]})`, members: topMembers, isNet: false });
        topMembers.forEach(m => used.add(m));
      }
      if (botMembers.length >= 2 && botMembers.every(m => responses.includes(m))) {
        groups.push({ label: `Bottom Box (${botMembers[0]}–${botMembers[botMembers.length-1]})`, members: botMembers, isNet: false });
        botMembers.forEach(m => used.add(m));
      }
    }
  }

  // Approve/Disapprove pattern without modifier words
  const approveGroup = responses.filter(r => /^(approve|favor|support|agree|yes|positive|satisfied|excellent|good)/i.test(r));
  const disapproveGroup = responses.filter(r => /^(disapprove|oppose|against|disagree|no|negative|dissatisfied|poor|bad|terrible)/i.test(r));
  if (approveGroup.length >= 2 && !approveGroup.every(m => used.has(m))) {
    groups.push({ label: "Total Approve / Favorable", members: approveGroup, isNet: true });
    approveGroup.forEach(m => used.add(m));
  }
  if (disapproveGroup.length >= 2 && !disapproveGroup.every(m => used.has(m))) {
    groups.push({ label: "Total Disapprove / Unfavorable", members: disapproveGroup, isNet: true });
    disapproveGroup.forEach(m => used.add(m));
  }

  return groups;
}

function combineFreqItems(items: FreqItem[], groups: CombineGroup[]): FreqItem[] {
  const used = new Set<string>();
  const result: FreqItem[] = [];

  for (const group of groups) {
    const matching = items.filter(item => group.members.includes(item.response));
    if (matching.length < 2) continue;
    const totalPct = matching.reduce((s, i) => s + i.pct, 0);
    const totalN = matching.reduce((s, i) => s + i.n, 0);
    result.push({ response: group.label, pct: totalPct, n: totalN });
    matching.forEach(m => used.add(m.response));
  }

  // Add uncombined items
  items.forEach(item => {
    if (!used.has(item.response)) result.push(item);
  });

  // Sort: combined (net) items first, then by original order / pct
  result.sort((a, b) => {
    const aIsNet = groups.some(g => g.label === a.response);
    const bIsNet = groups.some(g => g.label === b.response);
    if (aIsNet && !bIsNet) return -1;
    if (!aIsNet && bIsNet) return 1;
    return b.pct - a.pct;
  });

  return result;
}

function combineCrosstabResult(
  xtab: CrosstabResult,
  groups: CombineGroup[]
): CrosstabResult {
  const newResult: Record<string, Record<string, string>> = {};
  const newQList: string[] = [];
  const used = new Set<string>();

  // Add combined rows first
  for (const group of groups) {
    const matching = xtab.qList.filter(q => group.members.includes(q));
    if (matching.length < 2) continue;

    newQList.push(group.label);
    used.add(group.label);
    matching.forEach(m => used.add(m));
    newResult[group.label] = {};

    // Total column
    const totalVals = matching.map(q => parseFloat(xtab.result[q]?.Total ?? "0"));
    newResult[group.label]["Total"] = Math.min(100, totalVals.reduce((s, v) => s + v, 0)).toFixed(0);

    // Group columns
    xtab.byGroups.forEach(g => {
      const vals = matching.map(q => parseFloat(xtab.result[q]?.[g] ?? "0"));
      newResult[group.label][g] = Math.min(100, vals.reduce((s, v) => s + v, 0)).toFixed(0);
    });
  }

  // Add remaining rows
  xtab.qList.forEach(q => {
    if (!used.has(q)) {
      newQList.push(q);
      newResult[q] = { ...xtab.result[q] };
    }
  });

  return {
    ...xtab,
    qList: newQList,
    result: newResult,
  };
}
function detectQuestionConfigs(headers: string[], rows: Record<string, string>[]): QuestionConfig[] {
  const skipPatterns = [/^age$/i,/^gender$/i,/^sex$/i,/^race$/i,/^ethnicity$/i,/^educ/i,/^state$/i,/^region$/i,/^recall/i,/^vote/i,/^respondent/i,/^id$/i,/^weight/i,/^income/i,/^zip/i,/^employ/i,/^division/i,/^county/i,/^cbsa/i,/^party$/i];
  const qHeaders = headers.filter((h: string) => !skipPatterns.some(p => p.test(h)));
  const matrixGroups: Record<string, string[]> = {};
  qHeaders.forEach((h: string) => {
    const m1 = h.match(/^(.+?)[\[_](.+?)[\]]?$/);
    if (m1) { const stem = m1[1]; if (!matrixGroups[stem]) matrixGroups[stem] = []; matrixGroups[stem].push(h); return; }
    const m2 = h.match(/^(.*\d+)([a-zA-Z])$/);
    if (m2) { const stem = m2[1]; if (!matrixGroups[stem]) matrixGroups[stem] = []; matrixGroups[stem].push(h); }
  });
  const configs: QuestionConfig[] = [];
  const grouped = new Set<string>();
  Object.entries(matrixGroups).forEach(([stem, cols]) => {
    if (cols.length >= 2) {
      cols.forEach((c: string) => grouped.add(c));
      cols.forEach((c: string) => {
        const item = c.replace(new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\[_]?`), "").replace(/\]$/, "");
        configs.push({ col: c, label: c, type: "matrix", included: true, matrixStem: stem, matrixItem: item });
      });
    }
  });
  qHeaders.forEach((h: string) => {
    if (grouped.has(h)) return;
    const vals = rows.slice(0, 50).map((r: Record<string, string>) => r[h]).filter(Boolean);
    const hasSemicolon = vals.some((v: string) => v.includes(";"));
    configs.push({ col: h, label: h, type: hasSemicolon ? "multiselect" : "single", included: true });
  });
  return configs;
}

// ─── RACE MODE DETECTION ──────────────────────────────────────────────────────
// Looks at raw race values in the data and decides whether they already encode
// White College / White Non-College (race5) or just White (race4).
function detectRaceMode(rows: Record<string, string>[], raceCol: string, eduCol: string): RaceMode {
  if (!raceCol) return "race4";
  const raceVals = rows.map(r => (r[raceCol] || "").toLowerCase().trim()).filter(Boolean);
  const uniqueVals = Array.from(new Set(raceVals));

  // Check if the column already encodes college/non-college split directly
  const hasWhiteCollege = uniqueVals.some(v =>
    (/white/i.test(v) && /college/i.test(v)) ||
    /white.*college|college.*white/i.test(v) ||
    /wc\b|wnc\b/i.test(v)
  );
  if (hasWhiteCollege) return "race5";

  // Check if there's an education column available to derive race×edu
  if (eduCol && rows.some(r => r[eduCol] && r[raceCol])) {
    // If there's a separate edu col and we have white respondents, we can build race5
    const hasWhite = uniqueVals.some(v => /white/i.test(v) && !/hispanic|latino/i.test(v));
    if (hasWhite) return "race5"; // we'll derive the split using edu
  }

  return "race4";
}

function recodeRaceValue(raceVal: string, eduVal: string, benchCategories: Category[]): string {
  const r = raceVal.toLowerCase().trim();
  if (!r) return raceVal;

  // First try exact match (handles pre-coded "White Non-College", "White College", etc.)
  const exactMatch = benchCategories.find(c => c.name.toLowerCase() === r);
  if (exactMatch) return exactMatch.name;

  // Detect if benchmark uses race5 (White split by education)
  const catNames = benchCategories.map(c => c.name.toLowerCase());
  const isRace5 = catNames.some(n =>
    (n.includes("white") && n.includes("college")) ||
    (n.includes("white") && n.includes("non"))
  );

  // ── WHITE ──
  if (/white/i.test(r) && !/hispanic|latino/i.test(r)) {
    // Handle if already encoded with college info in the race value
    const alreadyCollege = /college|educated|grad/i.test(r);
    const alreadyNonCollege = /non.?college|no college|no degree/i.test(r);

    if (isRace5) {
      if (alreadyNonCollege) {
        return benchCategories.find(c => /non.?college/i.test(c.name) && /white/i.test(c.name))?.name ?? raceVal;
      }
      if (alreadyCollege) {
        return benchCategories.find(c => /college/i.test(c.name) && /white/i.test(c.name) && !/non/i.test(c.name))?.name ?? raceVal;
      }
      // Derive from edu value
      const edu = (eduVal || "").toLowerCase();
      const isCollege = /bachelor|4.year|b\.a|b\.s|post.?grad|master|mba|phd|jd|md|graduate|college grad/i.test(edu);
      const colCat = benchCategories.find(c => /college/i.test(c.name) && /white/i.test(c.name) && !/non/i.test(c.name));
      const nonColCat = benchCategories.find(c => /non.?college/i.test(c.name) && /white/i.test(c.name));
      if (isCollege && colCat) return colCat.name;
      if (nonColCat) return nonColCat.name;
      return colCat?.name ?? raceVal;
    } else {
      // race4 — just return White (Non-Hispanic) or closest white category
      return benchCategories.find(c => /white/i.test(c.name) && !/hispanic|latino/i.test(c.name))?.name ?? raceVal;
    }
  }

  // ── BLACK ──
  if (/black|african.?american|aa\b/i.test(r)) {
    return benchCategories.find(c => /black|african/i.test(c.name))?.name ?? raceVal;
  }

  // ── HISPANIC ──
  if (/hispanic|latino|latina|latinx|spanish/i.test(r)) {
    return benchCategories.find(c => /hispanic|latino/i.test(c.name))?.name ?? raceVal;
  }

  // ── ASIAN / OTHER ──
  if (/asian|pacific.?islander|native.?american|american.?indian|alaskan.?native|multiracial|mixed|other|middle.?east|arab/i.test(r)) {
    return benchCategories.find(c => /asian|other/i.test(c.name))?.name ?? raceVal;
  }

  // Fallback: closest category by partial match
  return benchCategories.find(c => c.name.toLowerCase() === r)?.name ?? raceVal;
}

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────
const DEFAULT_LV_QUESTIONS: LVQuestion[] = [
  { id: "registration", label: "Voter Registration Status", col: "", type: "registration", maxPoints: 4,
    scoring: [{ pattern: "yes|registered|true|1|definitely", points: 4 },{ pattern: "probably|maybe|unsure", points: 2 }] },
  { id: "history", label: "Past Voting History", col: "", type: "history", maxPoints: 7,
    scoring: [{ pattern: "2024", points: 3 },{ pattern: "2022", points: 2 },{ pattern: "2020", points: 3 },{ pattern: "2018", points: 1 },{ pattern: "every|always", points: 5 }] },
  { id: "motivation", label: "Motivation / Likelihood to Vote", col: "", type: "motivation", maxPoints: 5,
    scoring: [{ pattern: "extreme|absolutely|certain|definitely|10|9", points: 5 },{ pattern: "very|probably|likely|8|7", points: 4 },{ pattern: "somewhat|maybe|50|6|5", points: 2 }] },
  { id: "social", label: "Social Norms (Others Voting)", col: "", type: "social", maxPoints: 2,
    scoring: [{ pattern: "most|all|everyone|nearly", points: 2 },{ pattern: "some|half|about", points: 1 }] },
  { id: "plan", label: "Concrete Vote Plan", col: "", type: "plan", maxPoints: 3,
    scoring: [{ pattern: "both|early.*mail|mail.*early|in.person|already", points: 3 },{ pattern: "plan|intend|will", points: 2 }] },
];

// ─── RACE MODE ────────────────────────────────────────────────────────────────
// "race4"  = 4-category: White (Non-Hispanic), Black, Hispanic, Asian/Other
// "race5"  = 5-category (Race×Edu): White Non-College, White College, Black, Hispanic, Asian/Other
type RaceMode = "race4" | "race5";

const RACE4_CATEGORIES: Category[] = [
  { name: "White (Non-Hispanic)", pct: 71 },
  { name: "Black / African American", pct: 12 },
  { name: "Hispanic (Any Race)", pct: 12 },
  { name: "Asian / Other", pct: 5 },
];

const RACE5_CATEGORIES: Category[] = [
  { name: "White, Non College (Non-hispanic)", pct: 43 },
  { name: "White, College (Non-hispanic)", pct: 28 },
  { name: "Black / African American", pct: 12 },
  { name: "Hispanic (Any Race)", pct: 12 },
  { name: "Asian / Other", pct: 5 },
];

const DEFAULT_BENCHMARK_DIMS: BenchmarkDim[] = [
  { id: "age", label: "Age", internalKey: "_age", recodeMode: "standard", enabled: true, categories: [{ name: "18-29", pct: 26.6 },{ name: "30-44", pct: 28.1 },{ name: "45-64", pct: 22.8 },{ name: "65+", pct: 22.5 }] },
  { id: "gender", label: "Gender", internalKey: "_gender", recodeMode: "standard", enabled: true, categories: [{ name: "Female", pct: 52.5 },{ name: "Male", pct: 47.5 }] },
  { id: "race", label: "Race / Ethnicity", internalKey: "_race", recodeMode: "standard", enabled: true, categories: RACE4_CATEGORIES },
  { id: "education", label: "Education", internalKey: "_edu", recodeMode: "standard", enabled: true, categories: [{ name: "HS or less", pct: 29.1 },{ name: "Some college", pct: 28.5 },{ name: "Bachelor's", pct: 26.5 },{ name: "Postgraduate", pct: 15.9 }] },
  { id: "recall", label: "2024 Recall Vote", internalKey: "_recall", isRecall: true, recodeMode: "standard", enabled: true, categories: [{ name: "Trump", pct: 49.8 },{ name: "Harris", pct: 48.3 },{ name: "Third Party", pct: 1.2 },{ name: "Did not vote", pct: 0.7 }] },
  { id: "region", label: "Region", internalKey: "_region", recodeMode: "standard", enabled: true, categories: [{ name: "Northeast", pct: 17.9 },{ name: "Midwest", pct: 21.2 },{ name: "South", pct: 38.3 },{ name: "West", pct: 22.6 }] },
];
const CORE_DIM_IDS = ["age","gender","race","education","recall","region"];
const STATE_REGION_MAP: Record<string, string> = {
  "CT":"Northeast","ME":"Northeast","MA":"Northeast","NH":"Northeast","NJ":"Northeast","NY":"Northeast","PA":"Northeast","RI":"Northeast","VT":"Northeast",
  "IL":"Midwest","IN":"Midwest","IA":"Midwest","KS":"Midwest","MI":"Midwest","MN":"Midwest","MO":"Midwest","NE":"Midwest","ND":"Midwest","OH":"Midwest","SD":"Midwest","WI":"Midwest",
  "AL":"South","AR":"South","DE":"South","FL":"South","GA":"South","KY":"South","LA":"South","MD":"South","MS":"South","NC":"South","OK":"South","SC":"South","TN":"South","TX":"South","VA":"South","WV":"South","DC":"South",
  "AK":"West","AZ":"West","CA":"West","CO":"West","HI":"West","ID":"West","MT":"West","NV":"West","NM":"West","OR":"West","UT":"West","WA":"West","WY":"West"
};

function useNotifications() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const add = useCallback((msg: string, type = "info") => {
    const id = Date.now();
    setNotifs(p => [...p, { id, msg, type }]);
    setTimeout(() => setNotifs(p => p.filter(n => n.id !== id)), 4000);
  }, []);
  return { notifs, add };
}

// ─── LOADING OVERLAY ──────────────────────────────────────────────────────────
function LoadingOverlay({ steps, activeStep }: { steps: string[]; activeStep: number }) {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginTop: 28, color: "var(--text)" }}>
        Processing Survey Data
      </div>
      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 5, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "JetBrains Mono", marginBottom: 28 }}>
        Running Multi-Pass IPF/RIM Raking
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, width: 380 }}>
        {steps.map((s, i) => (
          <div key={i} className={`loading-step ${i < activeStep ? "done" : i === activeStep ? "active" : ""}`}>
            <span style={{ width: 18, flexShrink: 0, fontSize: 13 }}>
              {i < activeStep ? "✓" : i === activeStep ? "▶" : "○"}
            </span>
            <span>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, width: 380 }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.round(activeStep / Math.max(steps.length - 1, 1) * 100)}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", marginTop: 5, fontFamily: "JetBrains Mono" }}>
          <span>Step {activeStep + 1} of {steps.length}</span>
          <span>{Math.round(activeStep / Math.max(steps.length - 1, 1) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── BENCHMARK CARD ───────────────────────────────────────────────────────────
function BenchmarkCard({ dim, di, sum, ok, csvData, setBenchmarkDims, canDelete, onDelete }: {
  dim: BenchmarkDim; di: number; sum: number; ok: boolean;
  csvData: { headers: string[]; rows: Record<string, string>[] } | null;
  setBenchmarkDims: React.Dispatch<React.SetStateAction<BenchmarkDim[]>>;
  canDelete: boolean; onDelete?: () => void;
}) {
  return (
    <div className="card" style={{ borderColor: ok ? "var(--border)" : "var(--err)", borderLeftWidth: 3, borderLeftColor: ok ? "var(--accent)" : "var(--err)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <input className="inp" value={dim.label}
          style={{ fontWeight: 700, flex: 1, fontSize: 13, fontFamily: "'Syne', sans-serif" }}
          onChange={e => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, label: e.target.value } : d))} />
        <span className={`tag ${ok ? "tag-g" : "tag-r"}`}>{sum.toFixed(1)}%</span>
        {canDelete && <button className="btn btn-ghost btn-xs" onClick={onDelete} style={{ color: "var(--err)" }}>✕</button>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12, padding: "8px 10px", background: "var(--bg)", borderRadius: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: 0.5 }}>Recall-only</span>
          <div className={`toggle toggle-sm ${dim.isRecall ? "on" : ""}`} onClick={() => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, isRecall: !d.isRecall } : d))} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: 0.5 }}>Active</span>
          <div className={`toggle toggle-sm ${dim.enabled !== false ? "on" : ""}`} onClick={() => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, enabled: !(d.enabled !== false) } : d))} />
        </div>
      </div>

      {canDelete && csvData && (
        <div style={{ marginBottom: 10 }}>
          <label className="section-title" style={{ display: "block", marginBottom: 4 }}>Source Column</label>
          <select className="sel" style={{ fontSize: 12 }} value={dim.sourceCol || ""}
            onChange={e => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, sourceCol: e.target.value } : d))}>
            <option value="">— Auto-detect —</option>
            {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, padding: "4px 0" }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>Category</span>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>Target %</span>
      </div>

      {dim.categories.map((cat, ci) => (
        <div key={ci} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <input className="inp" value={cat.name} style={{ flex: 1, fontSize: 12 }}
            onChange={e => setBenchmarkDims(p => p.map((d, di2) => di2 === di ? { ...d, categories: d.categories.map((c, ci2) => ci2 === ci ? { ...c, name: e.target.value } : c) } : d))} />
          <input type="number" className="bench-inp" value={cat.pct} step="0.1" min="0" max="100"
            onChange={e => setBenchmarkDims(p => p.map((d, di2) => di2 === di ? { ...d, categories: d.categories.map((c, ci2) => ci2 === ci ? { ...c, pct: parseFloat(e.target.value) || 0 } : c) } : d))} />
          <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono", width: 10 }}>%</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setBenchmarkDims(p => p.map((d, di2) => di2 === di ? { ...d, categories: d.categories.filter((_, ci2) => ci2 !== ci) } : d))}>✕</button>
        </div>
      ))}

      <button className="btn btn-ghost btn-xs" style={{ marginTop: 4 }}
        onClick={() => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, categories: [...d.categories, { name: "New Category", pct: 0 }] } : d))}>
        + Add Category
      </button>
    </div>
  );
}

function AddDimModal({ csvHeaders, onAdd, onClose }: { csvHeaders: string[]; onAdd: (label: string, col: string) => void; onClose: () => void }) {
  const [label, setLabel] = useState("");
  const [col, setCol] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,23,20,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div className="card" style={{ width: 460, boxShadow: "var(--shadow-lg)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800 }}>Add Dimension</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="section-title" style={{ display: "block", marginBottom: 6 }}>Dimension Name *</label>
          <input className="inp" placeholder="e.g. Region, Party ID, Income…" value={label} autoFocus
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && label.trim()) { onAdd(label.trim(), col); onClose(); } if (e.key === "Escape") onClose(); }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label className="section-title" style={{ display: "block", marginBottom: 6 }}>CSV Column (optional)</label>
          <select className="sel" value={col} onChange={e => setCol(e.target.value)}>
            <option value="">— Map later —</option>
            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!label.trim()} onClick={() => { onAdd(label.trim(), col); onClose(); }}>Add Dimension</button>
        </div>
      </div>
    </div>
  );
}

function RecodeEditor({ recodeRules, setRecodeRules, benchmarkDims }: {
  recodeRules: RecodeRule[];
  setRecodeRules: React.Dispatch<React.SetStateAction<RecodeRule[]>>;
  benchmarkDims: BenchmarkDim[];
}) {
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
    const lines = pasteText.split(/\r?\n/).filter((l: string) => l.trim());
    const newRules: RecodeRule[] = [];
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map((s: string) => s.trim());
      if (parts.length >= 3) newRules.push({ fromValue: parts[0], toDim: parts[1], toCategory: parts[2] });
      else if (parts.length === 2) newRules.push({ fromValue: parts[0], toDim: newDim, toCategory: parts[1] });
    }
    setRecodeRules(p => [...p, ...newRules]);
    setPasteText(""); setPasteMode(false);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "flex-end", marginBottom: 10 }}>
        <div>
          <label className="section-title" style={{ display: "block", marginBottom: 4 }}>From Value</label>
          <input className="inp inp-mono" placeholder='Raw CSV value' value={newFrom} onChange={e => setNewFrom(e.target.value)} />
        </div>
        <div>
          <label className="section-title" style={{ display: "block", marginBottom: 4 }}>Dimension</label>
          <select className="sel" value={newDim} onChange={e => setNewDim(e.target.value)}>
            {benchmarkDims.map(d => <option key={d.internalKey} value={d.internalKey}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="section-title" style={{ display: "block", marginBottom: 4 }}>Map To</label>
          <select className="sel" value={newTo} onChange={e => setNewTo(e.target.value)}>
            <option value="">— Select —</option>
            {(benchmarkDims.find(d => d.internalKey === newDim)?.categories || []).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={addRule}>Add</button>
      </div>

      <button className="btn btn-ghost btn-xs" onClick={() => setPasteMode(!pasteMode)} style={{ marginBottom: 10 }}>
        📋 Paste Bulk Rules
      </button>
      {pasteMode && (
        <div style={{ marginTop: 8 }}>
          <textarea className="inp" value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder={"California, _region, West\nTexas, _region, South"} rows={4} />
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={applyPaste}>Apply</button>
        </div>
      )}

      {recodeRules.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="section-title">Active Rules ({recodeRules.length})</div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {recodeRules.map((rule, i) => (
              <div key={i} className="recode-row">
                <span className="tag tag-y">{rule.fromValue}</span>
                <span style={{ color: "var(--text3)", fontSize: 12 }}>→</span>
                <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>{rule.toDim}</span>
                <span style={{ color: "var(--text3)" }}>:</span>
                <span className="tag tag-g">{rule.toCategory}</span>
                <button className="btn btn-ghost btn-xs" style={{ marginLeft: "auto" }} onClick={() => setRecodeRules(p => p.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost btn-xs" style={{ marginTop: 8, color: "var(--err)" }} onClick={() => setRecodeRules([])}>Clear All</button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function SurveyWeighter() {
  const [step, setStep] = useState(0);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [colMap, setColMap] = useState<ColMap>({ age: "", gender: "", race: "", education: "", recall: "", party: "", region: "", state: "" });
  const [benchmarkDims, setBenchmarkDims] = useState<BenchmarkDim[]>(DEFAULT_BENCHMARK_DIMS);
  const [lvQuestions, setLvQuestions] = useState<LVQuestion[]>(DEFAULT_LV_QUESTIONS);
  const [questionConfigs, setQuestionConfigs] = useState<QuestionConfig[]>([]);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState("toplines");
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [showAddDimModal, setShowAddDimModal] = useState(false);
  const [recodeRules, setRecodeRules] = useState<RecodeRule[]>([]);
  const [raceMode, setRaceMode] = useState<RaceMode>("race4");
  const [externalWeights, setExternalWeights] = useState<number[] | null>(null);
  const [externalWeightsName, setExternalWeightsName] = useState("");
  const [showRecodeEditor, setShowRecodeEditor] = useState(false);
  const [useTieredRaking, setUseTieredRaking] = useState(true);
  const [useHotDeckImputation, setUseHotDeckImputation] = useState(true);
  const [targetDeffLow, setTargetDeffLow] = useState(2.0);
  const [targetDeffHigh, setTargetDeffHigh] = useState(2.5);
  const [xtabMode, setXtabMode] = useState("lv");
  const { notifs, add: addNotif } = useNotifications();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const weightsInputRef = useRef<HTMLInputElement>(null);

  const customDims = benchmarkDims.filter(d => !CORE_DIM_IDS.includes(d.id));

  const LOADING_STEPS = [
    "Parsing CSV data",
    "Recoding demographics",
    "Applying custom recode rules",
    "Hot-deck imputation for missing values",
    "Building raking targets",
    "Multi-pass IPF/RIM raking (pass 1)",
    "Multi-pass IPF/RIM raking (pass 2)",
    "Multi-pass IPF/RIM raking (pass 3+)",
    "Computing design effect & optimizing cap",
    "Frequency-based LV scoring",
    "Computing LV weights from answer frequencies",
    "Toplines & crosstabs",
    "Pre/post comparison",
    "Assembling final report",
  ];
  const STEPS = ["Upload", "Map Columns", "Benchmarks", "LV Model", "Questions", "Report"];

  const handleAddDimension = useCallback((label: string, sourceCol: string) => {
    const slug = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const id = `custom_${slug}_${Date.now()}`;
    setBenchmarkDims(prev => [...prev, {
      id, label, internalKey: `_${id}`, recodeMode: "custom", enabled: true,
      sourceCol: sourceCol || undefined,
      categories: [{ name: "Category A", pct: 50 },{ name: "Category B", pct: 50 }],
    }]);
  }, []);

  const handleRemoveCustomDim = useCallback((id: string) => { setBenchmarkDims(prev => prev.filter(d => d.id !== id)); }, []);

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      const parsed = parseCSV(e.target.result as string);
      setCsvData(parsed);
      const h = parsed.headers;
      const find = (...terms: string[]) => h.find(c => terms.some(t => c.toLowerCase().includes(t.toLowerCase()))) || "";
      const raceCol = find("race","ethnicity");
      const eduCol = find("educ");
      const detectedMode = detectRaceMode(parsed.rows, raceCol, eduCol);
      setRaceMode(detectedMode);
      setBenchmarkDims(prev => prev.map(d => {
        if (d.id !== "race") return d;
        return { ...d, categories: detectedMode === "race5" ? RACE5_CATEGORIES : RACE4_CATEGORIES };
      }));
      setColMap({ age: find("age"), gender: find("gender","sex"), race: raceCol, education: eduCol, recall: find("recall","2024vote","Q8"), party: find("party","pid"), region: find("region"), state: find("state","st_") });
      setQuestionConfigs(detectQuestionConfigs(h, parsed.rows));
      setLvQuestions(prev => prev.map(lv => ({
        ...lv,
        col: lv.col || (
          lv.type === "registration" ? find("registr") :
          lv.type === "history" ? find("history","voted","past_vote") :
          lv.type === "motivation" ? find("motiv","likely","intent","likelihood") :
          lv.type === "social" ? find("social","others","friends") :
          lv.type === "plan" ? find("plan","how_vote","method") : ""
        ),
      })));
      setStep(1);
      addNotif(`Loaded ${parsed.rows.length.toLocaleString()} respondents · ${parsed.headers.length} columns · Race mode: ${detectedMode === "race5" ? "Race×Education (5-cat)" : "Race 4-cat"}`, "success");
    };
    reader.readAsText(file);
  }, [addNotif]);

  const handleWeightsFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      if (!e.target?.result) return;
      const weights = parseExternalWeights(e.target.result as string);
      if (weights && weights.length > 0) {
        setExternalWeights(weights); setExternalWeightsName(file.name);
        addNotif(`External weights: ${weights.length} values from ${file.name}`, "success");
      } else addNotif("Could not parse weights file", "error");
    };
    reader.readAsText(file);
  }, [addNotif]);

  const recodeDemographics = useCallback((rows: Record<string, string>[]): Record<string, string>[] => {
    const raceDim = benchmarkDims.find(d => d.id === "race");
    // Re-detect race mode from actual data each run (in case colMap changed)
    const detectedMode = detectRaceMode(rows, colMap.race, colMap.education);

    return rows.map(row => {
      const r = { ...row };

      // ── AGE ──
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

      // ── GENDER ──
      if (colMap.gender && row[colMap.gender]) {
        const v = row[colMap.gender].toLowerCase();
        const dim = benchmarkDims.find(d => d.id === "gender");
        const exact = dim?.categories.find(c => c.name.toLowerCase() === v);
        if (exact) r._gender = exact.name;
        else r._gender = /female|woman/.test(v) ? "Female" : /male|man/.test(v) ? "Male" : row[colMap.gender];
      }

      // ── EDUCATION (recode first so race can use it) ──
      if (colMap.education && row[colMap.education]) {
        const v = row[colMap.education].toLowerCase();
        const dim = benchmarkDims.find(d => d.id === "education");
        const exact = dim?.categories.find(c => c.name.toLowerCase() === v);
        if (exact) r._edu = exact.name;
        else if (/less than|hs|high school|ged|12th/.test(v)) r._edu = "HS or less";
        else if (/some college|assoc|2.year|vocational/.test(v)) r._edu = "Some college";
        else if (/bachelor|4.year|b\.a|b\.s/.test(v)) r._edu = "Bachelor's";
        else if (/post.?grad|master|mba|phd|jd|md/.test(v)) r._edu = "Postgraduate";
        else r._edu = row[colMap.education];
      }

      // ── RACE ── (uses edu already recoded above)
      const raceVal = colMap.race ? (row[colMap.race] || "") : "";
      const eduVal = r._edu || row[colMap.education] || "";
      if (raceVal && raceDim) {
        r._race = recodeRaceValue(raceVal, eduVal, raceDim.categories);
      } else if (raceVal) {
        r._race = raceVal;
      }

      // ── RECALL ──
      if (colMap.recall && row[colMap.recall]) {
        const v = row[colMap.recall].toLowerCase();
        const dim = benchmarkDims.find(d => d.isRecall);
        const exact = dim?.categories.find(c => c.name.toLowerCase() === v);
        if (exact) r._recall = exact.name;
        else if (/trump|republican|gop/.test(v)) r._recall = "Trump";
        else if (/harris|biden|democrat|kamala/.test(v)) r._recall = "Harris";
        else if (/third|other|independent|libertarian|green/.test(v)) r._recall = "Third Party";
        else if (/did not|not vote|no/.test(v)) r._recall = "Did not vote";
        else r._recall = row[colMap.recall];
      }

      // ── REGION ──
      if (colMap.region && row[colMap.region]) {
        const v = row[colMap.region];
        const dim = benchmarkDims.find(d => d.id === "region");
        const exact = dim?.categories.find(c => c.name.toLowerCase() === v.toLowerCase());
        r._region = exact ? exact.name : v;
      } else if (colMap.state && row[colMap.state]) {
        const st = row[colMap.state].toUpperCase().trim().slice(0, 2);
        r._region = STATE_REGION_MAP[st] || "";
      }

      // ── CUSTOM DIMENSIONS ──
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

  const applyRecodeRules = useCallback((rows: Record<string, string>[]): Record<string, string>[] => {
    if (!recodeRules.length) return rows;
    return rows.map(row => {
      const r = { ...row };
      for (const rule of recodeRules) {
        for (const col of Object.keys(r)) {
          if ((r[col] || "").toLowerCase() === rule.fromValue.toLowerCase()) r[rule.toDim] = rule.toCategory;
        }
      }
      return r;
    });
  }, [recodeRules]);

  const processData = useCallback(() => {
    if (!csvData) return;
    setProcessing(true); setLoadingStep(0);
    const runStep = <T,>(stepIdx: number, fn: () => T, delay = 60): Promise<T> => new Promise(resolve => {
      setLoadingStep(stepIdx);
      setTimeout(() => { resolve(fn()); }, delay);
    });

    (async () => {
      try {
        const { rows, headers } = csvData;
        const n = rows.length;

        await runStep(0, () => {}, 120);
        let recoded = await runStep(1, () => recodeDemographics(rows));
        recoded = await runStep(2, () => applyRecodeRules(recoded));

        const dimKeys = benchmarkDims.map(d => d.internalKey);
        let missingDataReport: MissingReport[] = [];
        await runStep(3, () => {
          if (useHotDeckImputation) {
            const { imputed, report } = imputeMissing(recoded, dimKeys);
            recoded = imputed; missingDataReport = report;
          }
        });

        const rakingTargets = await runStep(4, () => {
          const targets: { variable: string; categories: { value: string; proportion: number }[]; recallMask?: boolean[] }[] = [];
          benchmarkDims.filter(d => d.enabled !== false).forEach(dim => {
            const present = new Set(recoded.map(r => r[dim.internalKey]).filter(Boolean));
            const filtered = dim.categories.filter(c => present.has(c.name));
            if (filtered.length < 2) return;
            const total = filtered.reduce((s, c) => s + c.pct, 0);
            const target: { variable: string; categories: { value: string; proportion: number }[]; recallMask?: boolean[] } = {
              variable: dim.internalKey,
              categories: filtered.map(c => ({ value: c.name, proportion: c.pct / total })),
            };
            if (dim.isRecall) {
              target.recallMask = recoded.map(r => filtered.some(f => f.name === (r[dim.internalKey] || "")));
            }
            targets.push(target);
          });
          return targets;
        });

        let weights: Float64Array;
        let converged: boolean;
        let itersUsed: number;
        let deff: number;
        let eff: number;
        let iterHistory: { iter: number; maxDelta: number }[] = [];
        let chosenCap: number;

        // Passes 1 and 2
        await runStep(5, () => {}, 80);
        await runStep(6, () => {}, 80);
        await runStep(7, () => {}, 80);

        await runStep(8, () => {
          if (externalWeights) {
            const wArr = externalWeights;
            weights = new Float64Array(wArr.length === n ? wArr : new Array(n).fill(1));
            converged = true; itersUsed = 0; chosenCap = 5.0;
            let sum = 0; for (let i = 0; i < n; i++) sum += weights[i];
            const mean = sum / n; for (let i = 0; i < n; i++) weights[i] /= mean;
            let sumSq = 0; for (let i = 0; i < n; i++) sumSq += weights[i] ** 2;
            deff = sumSq / n; eff = (1 / deff) * 100;
          } else {
            const result = useTieredRaking
              ? runTieredMultiPassRaking(recoded, rakingTargets, { targetDeffLow, targetDeffHigh })
              : runMultiPassRaking(recoded, rakingTargets, { maxIter: 600, maxPasses: 5, targetDeffLow, targetDeffHigh });
            weights = result.weights;
            converged = result.converged;
            itersUsed = result.itersUsed;
            deff = result.deff;
            eff = result.eff;
            iterHistory = result.iterHistory;
            chosenCap = result.finalCap;
          }
        });

        let diagnostics: DiagnosticsResult;
        await runStep(9, () => {
          diagnostics = computeDiagnostics(Array.from(weights!), recoded, rakingTargets, iterHistory);
        });

        let lvWeights: number[], lvProbs: number[], rawScores: number[], scoreMean: number, scoreSD: number;
        let lvFrequencyTable: Record<string, Record<string, { rawPct: number; lvWeight: number; count: number }>>;

        await runStep(10, () => {}, 80);
        await runStep(10, () => {
          const result = computeLVFrequencyModel(recoded, Array.from(weights!), lvQuestions);
          lvWeights = result.lvWeights;
          lvProbs = result.lvProbs;
          rawScores = result.rawScores;
          scoreMean = result.scoreMean;
          scoreSD = result.scoreSD;
          lvFrequencyTable = result.frequencyTable;
        });

        let toplines: Record<string, { rv: FreqItem[]; lv: FreqItem[] }> = {};
        let xtabs: Record<string, CrosstabResult[]> = {};
        let xtabsRV: Record<string, CrosstabResult[]> = {};
        let sampleComp: Record<string, FreqItem[]> = {};
        let rawSampleComp: Record<string, FreqItem[]> = {};
        let prePostComparison: PrePostRow[] = [];

        await runStep(11, () => {
          const includedCols = questionConfigs.filter(q => q.included).map(q => q.col);
          includedCols.forEach(q => {
            const order = questionConfigs.find(c => c.col === q)?.answerOrder;
            toplines[q] = { rv: freqTable(recoded, q, Array.from(weights!), order), lv: freqTable(recoded, q, lvWeights!, order) };
          });
          const byVars = benchmarkDims.filter(d => !d.isRecall && d.enabled !== false).map(d => ({ col: d.internalKey, label: d.label }));
          includedCols.forEach(q => {
            const order = questionConfigs.find(c => c.col === q)?.answerOrder;
            // Always compute BOTH rv and lv xtabs so the report toggle works without re-running
            xtabs[q] = byVars.map(({ col, label }) => ({ breakdown: label, ...crosstab(recoded, q, col, lvWeights!, order) }));
            xtabsRV[q] = byVars.map(({ col, label }) => ({ breakdown: label, ...crosstab(recoded, q, col, Array.from(weights!), order) }));
          });
          benchmarkDims.forEach(dim => {
            sampleComp[dim.label] = freqTable(recoded, dim.internalKey, Array.from(weights!));
            rawSampleComp[dim.label] = freqTable(recoded, dim.internalKey, new Array(n).fill(1));
          });
        });

        await runStep(12, () => {
          prePostComparison = buildPrePost(recoded, Array.from(weights!), benchmarkDims);
        });

        await runStep(13, () => {}, 200);

        setResults({
          n, converged: converged!, itersUsed: itersUsed!, deff: deff!, eff: eff!,
          weights: Array.from(weights!), lvWeights: lvWeights!, lvProbs: lvProbs!, rawScores: rawScores!,
          scoreMean: scoreMean!, scoreSD: scoreSD!,
          pollCols: questionConfigs.filter(q => q.included).map(q => q.col),
          toplines, xtabs, xtabsRV, sampleComp, rawSampleComp, prePostComparison,
          recoded, headers,
          rakingTargets: rakingTargets.map(t => t.variable),
          benchmarkDims, questionConfigs,
          diagnostics: diagnostics!,
          missingDataReport,
          tieredWeightsApplied: useTieredRaking && !externalWeights,
          externalWeightsUsed: !!externalWeights,
          chosenCap: chosenCap!,
          raceMode,
          lvFrequencyTable: lvFrequencyTable!,
        });

        setSelectedQ((questionConfigs.filter(q => q.included)[0])?.col || null);
        setStep(5);
        addNotif("Analysis complete!", "success");
      } catch (err) {
        addNotif("Error: " + (err instanceof Error ? err.message : String(err)), "error");
        console.error(err);
      }
      setProcessing(false);
    })();
  }, [csvData, benchmarkDims, lvQuestions, questionConfigs, recodeDemographics, applyRecodeRules, useTieredRaking, useHotDeckImputation, externalWeights, xtabMode, targetDeffLow, targetDeffHigh, raceMode, addNotif]);

  const exportWeightedCSV = useCallback(() => {
    if (!results) return;
    const rows = results.recoded.map((r, i) => ({
      ...r,
      design_wt: results.weights[i].toFixed(6),
      lv_wt: results.lvWeights[i].toFixed(6),
      lv_prob: results.lvProbs[i].toFixed(6),
      lv_score: results.rawScores[i].toFixed(5),
    }));
    const hdrs = [...results.headers, "design_wt","lv_wt","lv_prob","lv_score"].filter((h, i, a) => a.indexOf(h) === i);
    const blob = new Blob([toCSV(hdrs, rows)], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "weighted_data.csv"; a.click();
  }, [results]);

  const exportCrosstabsCSV = useCallback(() => {
    if (!results) return;

    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };

    // ── Build the ordered breakdown structure matching the image layout ──
    // Order: Age groups | Gender | Race/Ethnicity | Education | (any custom dims)
    const dimOrder = ["_age", "_gender", "_race", "_edu", "_region", "_recall"];
    const allXtabDims = results.benchmarkDims
      .filter(d => !d.isRecall && d.enabled !== false)
      .sort((a, b) => {
        const ai = dimOrder.indexOf(a.internalKey);
        const bi = dimOrder.indexOf(b.internalKey);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });

    // ── Row 1 of header: question label ──
    // ── Row 2: RESPONSE | TOTAL | dim span headers (merged visually via blank cols) ──
    // ── Row 3: sub-group column names ──
    // ── Data rows: response label | total% | each subgroup% ──

    const csvBlocks: string[] = [];

    results.pollCols.forEach(qCol => {
      const exportXtabBlock = (
      qCol: string,
      xtabsMap: Record<string, CrosstabResult[]>,
      weightLabel: string
    ) => {
      const qConfig = results.questionConfigs.find(c => c.col === qCol);
      const qLabel = qConfig?.label || qCol;
      const xtabsForQ = xtabsMap[qCol] || [];
      if (!xtabsForQ.length) return;

      const xtabByBreakdown: Record<string, CrosstabResult> = {};
      xtabsForQ.forEach(xt => { xtabByBreakdown[xt.breakdown] = xt; });

      const cols: { dimLabel: string; groupName: string }[] = [];
      allXtabDims.forEach(dim => {
        const xt = xtabByBreakdown[dim.label];
        if (!xt) return;
        xt.byGroups.forEach(g => cols.push({ dimLabel: dim.label, groupName: g }));
      });

      const responses = xtabsForQ[0]?.qList || [];

      csvBlocks.push(`${esc(qLabel)} [${weightLabel}]`);

      const spanRow: string[] = [esc("RESPONSE"), esc("TOTAL")];
      let prevDimLabel = "";
      cols.forEach(({ dimLabel }) => {
        spanRow.push(dimLabel !== prevDimLabel ? esc(dimLabel.toUpperCase()) : "");
        prevDimLabel = dimLabel;
      });
      csvBlocks.push(spanRow.join(","));

      const groupRow: string[] = ["", ""];
      cols.forEach(({ groupName }) => groupRow.push(esc(groupName.toUpperCase())));
      csvBlocks.push(groupRow.join(","));

      responses.forEach(resp => {
        const totalPct = xtabsForQ[0]?.result[resp]?.Total ?? "0";
        const dataRow: string[] = [esc(resp), esc(`${totalPct}%`)];
        cols.forEach(({ dimLabel, groupName }) => {
          const xt = xtabByBreakdown[dimLabel];
          const val = xt?.result[resp]?.[groupName] ?? "0";
          dataRow.push(esc(`${val}%`));
        });
        csvBlocks.push(dataRow.join(","));
      });

      const firstXt = xtabsForQ[0];
      const totalWtN = firstXt?.totalN ?? 0;
      const nRow: string[] = [esc("Weighted N"), esc(String(Math.round(totalWtN)))];
      cols.forEach(({ dimLabel, groupName }) => {
        const xt = xtabByBreakdown[dimLabel];
        const gN = xt?.groupTotals?.[groupName];
        nRow.push(gN != null ? esc(String(Math.round(gN))) : "");
      });
      csvBlocks.push(nRow.join(","));
      csvBlocks.push("");
    };

    // Export RV crosstabs section
    csvBlocks.push("REGISTERED VOTER (RV) WEIGHTED CROSSTABS");
    csvBlocks.push("");
    results.pollCols.forEach(qCol => exportXtabBlock(qCol, results.xtabsRV, "RV Weighted"));

    // Export LV crosstabs section
    csvBlocks.push("LIKELY VOTER (LV) WEIGHTED CROSSTABS");
    csvBlocks.push("");
    results.pollCols.forEach(qCol => exportXtabBlock(qCol, results.xtabs, "LV Weighted"));
    });

    const blob = new Blob([csvBlocks.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crosstabs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", minHeight: "100vh", background: "var(--bg)" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Notifications */}
      <div className="notif">
        {notifs.map(n => (
          <div key={n.id} className={`notif-item ${n.type}`}>
            {n.type === "success" ? "✓" : n.type === "error" ? "✕" : "·"} {n.msg}
          </div>
        ))}
      </div>

      {processing && <LoadingOverlay steps={LOADING_STEPS} activeStep={loadingStep} />}
      {showAddDimModal && csvData && <AddDimModal csvHeaders={csvData.headers} onAdd={handleAddDimension} onClose={() => setShowAddDimModal(false)} />}

      {/* ── HEADER ── */}
      <header style={{ background: "white", borderBottom: "1.5px solid var(--border)", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 0 var(--border)" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, background: "var(--accent)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 800, lineHeight: 1.1, color: "var(--text)" }}>Survey Weighter</div>
              <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "JetBrains Mono" }}>IPF/RIM Raking & LV Modeling</div>
            </div>
          </div>

          {step >= 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div className={`step-dot ${step > i ? "done" : step === i ? "active" : ""}`}
                      style={{ cursor: i <= step ? "pointer" : "default" }}
                      onClick={() => { if (i <= step && !processing) setStep(i); }}>
                      {step > i ? "✓" : i + 1}
                    </div>
                    <span style={{ fontSize: 9, fontFamily: "JetBrains Mono", color: step === i ? "var(--accent)" : "var(--text3)", whiteSpace: "nowrap", letterSpacing: 0.3 }}>{s}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`step-line ${step > i ? "done" : ""}`} style={{ marginBottom: 14 }} />}
                </div>
              ))}
            </div>
          )}

          {step === 0 && (
            <div style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "var(--text3)" }}>
              Upload a CSV to begin
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 28px 64px" }}>

        {/* ── STEP 0: UPLOAD ── */}
        {step === 0 && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, alignItems: "start" }}>
              <div>
                <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 14, color: "var(--text)" }}>
                  Professional<br />Survey Weighting
                </h1>
                <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, marginBottom: 32, maxWidth: 540 }}>
                  Upload a raw survey CSV to run iterative IPF/RIM raking with multi-pass convergence targeting DEFF 2.0–2.5, frequency-based likely voter scoring, and Rasmussen-style crosstabs.
                </p>

                <div
                  className={`upload-zone ${isDragging ? "drag" : ""}`}
                  style={{ maxWidth: 540, textAlign: "left" }}
                  onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.name.endsWith(".csv")) handleFile(f); }}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <div style={{ width: 52, height: 52, border: "2px dashed var(--border2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 3 }}>Drop CSV here or click to browse</div>
                      <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>Survey export · one row per respondent</div>
                    </div>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

                <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { icon: "⟳", label: "Multi-Pass Raking", desc: "3–5 passes for stable convergence" },
                    { icon: "⌖", label: "DEFF 2.0–2.5 Target", desc: "Subgroup-aware cap optimization" },
                    { icon: "◈", label: "Frequency LV Model", desc: "Answer frequency → LV probability" },
                    { icon: "⊞", label: "Hot-Deck Imputation", desc: "Missing value replacement" },
                    { icon: "⊡", label: "Tiered Weighting", desc: "Demo → Race → Political sequence" },
                    { icon: "⊟", label: "Rasmussen Crosstabs", desc: "Full demographic breakdowns" },
                  ].map(f => (
                    <div key={f.label} style={{ padding: "10px 14px", background: "white", border: "1.5px solid var(--border)", borderRadius: 8, boxShadow: "var(--shadow)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                        <span style={{ fontSize: 14, color: "var(--accent)" }}>{f.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{f.label}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="card">
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 14, color: "var(--text)" }}>How it works</div>
                  {[
                    { n: "1", t: "Upload CSV", d: "Raw survey data, one row per respondent" },
                    { n: "2", t: "Map demographics", d: "Link columns to age, gender, race, etc." },
                    { n: "3", t: "Set benchmarks", d: "Target proportions for each dimension" },
                    { n: "4", t: "Configure LV model", d: "Map questions to likely voter scoring" },
                    { n: "5", t: "Run analysis", d: "Multi-pass raking → LV weights → report" },
                  ].map(item => (
                    <div key={item.n} style={{ display: "flex", gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                      <div style={{ width: 24, height: 24, background: "var(--accent)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white", fontSize: 11, fontWeight: 700, fontFamily: "JetBrains Mono" }}>{item.n}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 1 }}>{item.t}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>{item.d}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: "12px", background: "var(--accent-light)", borderRadius: 6, fontSize: 11, color: "var(--accent)", fontFamily: "JetBrains Mono", lineHeight: 1.6 }}>
                    <strong>DEFF target:</strong> 2.0–2.5 by default. Multi-pass raking runs 3–5 complete sweeps with subgroup-aware capping to land precisely in this range.
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Expected CSV format</div>
                  <div style={{ background: "var(--bg2)", borderRadius: 6, padding: "10px 12px", fontFamily: "JetBrains Mono", fontSize: 10, lineHeight: 1.8, color: "var(--text2)" }}>
                    <div style={{ color: "var(--accent)", fontWeight: 700 }}>respondent_id, age, gender, race, …</div>
                    <div>1001, 34, Female, White, …</div>
                    <div>1002, 67, Male, Black, …</div>
                    <div>1003, 22, Female, Hispanic, …</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: MAP COLUMNS ── */}
        {step === 1 && csvData && (
          <div className="fade-in">
            <div style={{ marginBottom: 28, paddingBottom: 18, borderBottom: "1.5px solid var(--border)" }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Map Columns</h2>
              <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>
                {fileName} · {csvData.rows.length.toLocaleString()} respondents · {csvData.headers.length} columns
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
              <div className="card">
                <div className="section-title">Core Demographic Variables</div>
                {[
                  { key: "age" as keyof ColMap, label: "Age" },
                  { key: "gender" as keyof ColMap, label: "Gender / Sex" },
                  { key: "race" as keyof ColMap, label: "Race / Ethnicity" },
                  { key: "education" as keyof ColMap, label: "Education" },
                  { key: "recall" as keyof ColMap, label: "2024 Recall Vote" },
                  { key: "region" as keyof ColMap, label: "Region" },
                  { key: "state" as keyof ColMap, label: "State (auto-region fallback)" },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display: "grid", gridTemplateColumns: "168px 1fr", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text2)" }}>{label}</label>
                    <select className="sel" value={colMap[key] || ""} onChange={e => setColMap(p => ({ ...p, [key]: e.target.value }))}>
                      <option value="">— Not mapped —</option>
                      {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}

                {customDims.length > 0 && (
                  <>
                    <div className="section-title" style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>Additional Dimensions</div>
                    {customDims.map(dim => (
                      <div key={dim.id} style={{ display: "grid", gridTemplateColumns: "168px 1fr auto", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <label style={{ fontSize: 12.5, color: "var(--text2)" }}>{dim.label}</label>
                        <select className="sel" value={dim.sourceCol || ""} onChange={e => setBenchmarkDims(prev => prev.map(d => d.id === dim.id ? { ...d, sourceCol: e.target.value } : d))}>
                          <option value="">— Not mapped —</option>
                          {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <button className="btn btn-ghost btn-xs" onClick={() => handleRemoveCustomDim(dim.id)} style={{ color: "var(--err)" }}>✕</button>
                      </div>
                    ))}
                  </>
                )}
                <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setShowAddDimModal(true)}>+ Add Dimension</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="card">
                  <div className="section-title">External Weights (optional)</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12, lineHeight: 1.6 }}>
                    One weight per line, or two columns (ID, weight). Bypasses internal raking — design weights applied directly.
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => weightsInputRef.current?.click()}>⬆ Upload Weights</button>
                    {externalWeightsName && <span className="tag tag-g">{externalWeightsName}</span>}
                    {externalWeights && <button className="btn btn-ghost btn-xs" style={{ color: "var(--err)" }} onClick={() => { setExternalWeights(null); setExternalWeightsName(""); }}>Remove</button>}
                  </div>
                  <input ref={weightsInputRef} type="file" accept=".txt,.csv" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleWeightsFile(e.target.files[0]); }} />
                </div>

                {/* Race Mode */}
                <div className="card" style={{ borderLeftWidth: 3, borderLeftColor: "var(--accent)" }}>
                  <div className="section-title" style={{ marginBottom: 10 }}>Race / Ethnicity Weighting Mode</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <button
                      className={`btn btn-sm ${raceMode === "race4" ? "btn-primary" : "btn-outline"}`}
                      onClick={() => {
                        setRaceMode("race4");
                        setBenchmarkDims(prev => prev.map(d => d.id === "race" ? { ...d, categories: RACE4_CATEGORIES } : d));
                      }}
                    >
                      4-Category
                    </button>
                    <button
                      className={`btn btn-sm ${raceMode === "race5" ? "btn-primary" : "btn-outline"}`}
                      onClick={() => {
                        setRaceMode("race5");
                        setBenchmarkDims(prev => prev.map(d => d.id === "race" ? { ...d, categories: RACE5_CATEGORIES } : d));
                      }}
                    >
                      5-Category (Race×Edu)
                    </button>
                  </div>
                  <div style={{ padding: "10px 12px", background: "var(--bg2)", borderRadius: 6, fontSize: 11, fontFamily: "JetBrains Mono", lineHeight: 1.7, color: "var(--text2)" }}>
                    {raceMode === "race4" ? (
                      <>
                        <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>Standard 4-Category Race</div>
                        <div>• White (Non-Hispanic)</div>
                        <div>• Black / African American</div>
                        <div>• Hispanic (Any Race)</div>
                        <div>• Asian / Other</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>Race × Education (5-Category)</div>
                        <div>• White Non-College</div>
                        <div>• White College</div>
                        <div>• Black / African American</div>
                        <div>• Hispanic (Any Race)</div>
                        <div>• Asian / Other</div>
                        <div style={{ marginTop: 6, color: "var(--text3)", fontSize: 10 }}>White split derived from education column</div>
                      </>
                    )}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>
                    Auto-detected from data: <span style={{ color: "var(--accent)", fontWeight: 700 }}>{raceMode === "race5" ? "Race×Edu (5-cat)" : "Race 4-cat"}</span>
                    {" · "}Override above if needed
                  </div>
                </div>

                <div className="card" style={showRecodeEditor ? { borderColor: "var(--blue)", borderWidth: 2 } : {}}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showRecodeEditor ? 14 : 0 }}>
                    <div>
                      <div className="section-title" style={{ marginBottom: 2 }}>Custom Recode Rules</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>Map raw values → dimension categories</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {recodeRules.length > 0 && <span className="tag tag-p">{recodeRules.length} rules</span>}
                      <button className="btn btn-outline btn-sm" onClick={() => setShowRecodeEditor(!showRecodeEditor)}>{showRecodeEditor ? "Close" : "Edit Rules"}</button>
                    </div>
                  </div>
                  {showRecodeEditor && <RecodeEditor recodeRules={recodeRules} setRecodeRules={setRecodeRules} benchmarkDims={benchmarkDims} />}
                </div>

                <div className="card">
                  <div className="section-title">Processing Options</div>
                  {[
                    { label: "Tiered / Hierarchical Raking", desc: "Rake Demo → Race → Political sequentially (recommended)", val: useTieredRaking, set: setUseTieredRaking },
                    { label: "Hot-Deck Imputation", desc: "Replace missing demographic values from observed donors", val: useHotDeckImputation, set: setUseHotDeckImputation },
                  ].map(opt => (
                    <div key={opt.label} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <div className={`toggle ${opt.val ? "on" : ""}`} style={{ marginTop: 2 }} onClick={() => opt.set(!opt.val)} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 1 }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>{opt.desc}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ paddingTop: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Target DEFF Range</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4, fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: 0.5 }}>Low</label>
                        <input type="number" className="bench-inp" value={targetDeffLow} step="0.1" min="1.0" max="5.0"
                          onChange={e => setTargetDeffLow(parseFloat(e.target.value) || 2.0)} />
                      </div>
                      <span style={{ fontSize: 14, color: "var(--text3)", marginTop: 18 }}>—</span>
                      <div>
                        <label style={{ fontSize: 10, color: "var(--text3)", display: "block", marginBottom: 4, fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: 0.5 }}>High</label>
                        <input type="number" className="bench-inp" value={targetDeffHigh} step="0.1" min="1.0" max="5.0"
                          onChange={e => setTargetDeffHigh(parseFloat(e.target.value) || 2.5)} />
                      </div>
                      <div style={{ marginTop: 18, padding: "7px 12px", background: "var(--accent-light)", borderRadius: 6, fontSize: 11, color: "var(--accent)", fontFamily: "JetBrains Mono" }}>
                        Target: {targetDeffLow}–{targetDeffHigh}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 6, fontFamily: "JetBrains Mono" }}>
                      Multi-pass raking auto-selects cap to hit this range. Default: 2.0–2.5.
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="section-title" style={{ marginBottom: 8 }}>Crosstab Weighting Mode</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["rv","lv"].map(m => (
                      <button key={m} className={`btn btn-sm ${xtabMode === m ? "btn-primary" : "btn-outline"}`} onClick={() => setXtabMode(m)}>
                        {m.toUpperCase()} Weighted
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 8, fontFamily: "JetBrains Mono" }}>
                    {xtabMode === "lv" ? "Likely voter weights applied to crosstabs" : "Registered voter (design) weights applied to crosstabs"}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setStep(0)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(2)}>Set Benchmarks →</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: BENCHMARKS ── */}
        {step === 2 && (
          <div className="fade-in">
            <div style={{ marginBottom: 28, paddingBottom: 18, borderBottom: "1.5px solid var(--border)" }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Weighting Benchmarks</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>Set target proportions. Each dimension must sum to 100%.</div>
                <span className={`tag ${raceMode === "race5" ? "tag-p" : "tag-b"}`}>
                  {raceMode === "race5" ? "Race×Edu 5-cat" : "Race 4-cat"}
                </span>
                <button className="btn btn-ghost btn-xs" onClick={() => {
                  const next: RaceMode = raceMode === "race4" ? "race5" : "race4";
                  setRaceMode(next);
                  setBenchmarkDims(prev => prev.map(d => d.id === "race" ? { ...d, categories: next === "race5" ? RACE5_CATEGORIES : RACE4_CATEGORIES } : d));
                }}>
                  Switch to {raceMode === "race4" ? "Race×Edu 5-cat" : "Race 4-cat"}
                </button>
              </div>
            </div>

            <div className="section-title">Core Dimensions</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 16, marginBottom: 28 }}>
              {benchmarkDims.filter(d => CORE_DIM_IDS.includes(d.id)).map(dim => {
                const di = benchmarkDims.indexOf(dim);
                const sum = dim.categories.reduce((s, c) => s + (parseFloat(String(c.pct)) || 0), 0);
                return <BenchmarkCard key={dim.id} dim={dim} di={di} sum={sum} ok={Math.abs(sum - 100) < 0.5} csvData={csvData} setBenchmarkDims={setBenchmarkDims} canDelete={false} />;
              })}
            </div>

            {customDims.length > 0 && (
              <>
                <div className="section-title">Additional Dimensions</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 16, marginBottom: 20 }}>
                  {customDims.map(dim => {
                    const di = benchmarkDims.indexOf(dim);
                    const sum = dim.categories.reduce((s, c) => s + (parseFloat(String(c.pct)) || 0), 0);
                    return <BenchmarkCard key={dim.id} dim={dim} di={di} sum={sum} ok={Math.abs(sum - 100) < 0.5} csvData={csvData} setBenchmarkDims={setBenchmarkDims} canDelete={true} onDelete={() => handleRemoveCustomDim(dim.id)} />;
                  })}
                </div>
              </>
            )}

            <div
              style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "16px 22px", border: "2px dashed var(--border2)", cursor: "pointer", borderRadius: 10, marginBottom: 8, background: "white" }}
              onClick={() => setShowAddDimModal(true)}
            >
              <div style={{ width: 32, height: 32, background: "var(--bg2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "var(--text3)" }}>+</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "'Syne', sans-serif" }}>Add Custom Dimension</div>
                <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>Party, Income, Region, DMA, etc.</div>
              </div>
            </div>

            <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "space-between" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setBenchmarkDims(DEFAULT_BENCHMARK_DIMS)}>Reset to Defaults</button>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-primary" onClick={() => setStep(3)}>Configure LV Model →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: LV MODEL ── */}
        {step === 3 && (
          <div className="fade-in">
            <div style={{ marginBottom: 28, paddingBottom: 18, borderBottom: "1.5px solid var(--border)" }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Likely Voter Model</h2>
              <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>Frequency-based LV propensity scoring with z-score logistic sigmoid.</div>
            </div>

            <div className="card" style={{ marginBottom: 20, borderColor: "var(--accent)", borderLeftWidth: 3 }}>
              <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "'Syne', sans-serif", marginBottom: 8, color: "var(--accent)" }}>Frequency-Based LV Scoring</div>
              <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.75, fontFamily: "JetBrains Mono" }}>
                For each LV question column, the model: <strong>1)</strong> computes weighted frequency of every answer choice → <strong>2)</strong> applies pattern scoring (0–maxPoints) → <strong>3)</strong> adjusts by inverse-square-root of answer frequency (rarer high-intent answers get more weight) → <strong>4)</strong> normalizes to 0–1 per dimension → <strong>5)</strong> z-scores across all respondents → <strong>6)</strong> applies logistic sigmoid → LV probability → final LV weight = design_wt × LV_prob.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {lvQuestions.map((lv, li) => (
                <div key={lv.id} className="card">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ width: 42, height: 42, background: "var(--accent-light)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 700, flexShrink: 0, color: "var(--accent)" }}>
                      {lv.maxPoints}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                        <input className="inp" value={lv.label} style={{ fontWeight: 700, width: 260, fontSize: 13, fontFamily: "'Syne', sans-serif" }}
                          onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, label: e.target.value } : q))} />
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: 0.5 }}>Max pts:</span>
                          <input type="number" className="bench-inp" value={lv.maxPoints} min="0" max="20"
                            onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, maxPoints: parseInt(e.target.value) || 0 } : q))} />
                        </div>
                        <button className="btn btn-ghost btn-xs" style={{ color: "var(--err)" }}
                          onClick={() => setLvQuestions(p => p.filter((_, i) => i !== li))}>Remove</button>
                      </div>

                      {csvData && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", background: "var(--bg)", borderRadius: 6 }}>
                          <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>Survey Column:</span>
                          <select className="sel" value={lv.col} style={{ fontSize: 12 }}
                            onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, col: e.target.value } : q))}>
                            <option value="">— Use default max score (all respondents) —</option>
                            {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      )}

                      <div className="section-title" style={{ marginBottom: 8 }}>Scoring Patterns</div>
                      {lv.scoring.map((sc, si) => (
                        <div key={si} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                          <input className="inp inp-mono" value={sc.pattern} placeholder="Regex or substring pattern"
                            style={{ flex: 1, fontSize: 11 }}
                            onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, scoring: q.scoring.map((s, j) => j === si ? { ...s, pattern: e.target.value } : s) } : q))} />
                          <span style={{ fontSize: 12, color: "var(--text3)" }}>→</span>
                          <input type="number" className="bench-inp" value={sc.points} min="0" max={lv.maxPoints}
                            onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, scoring: q.scoring.map((s, j) => j === si ? { ...s, points: parseInt(e.target.value) || 0 } : s) } : q))} />
                          <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono", width: 18 }}>pt{sc.points !== 1 ? "s" : ""}</span>
                          <button className="btn btn-ghost btn-xs"
                            onClick={() => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, scoring: q.scoring.filter((_, j) => j !== si) } : q))}>✕</button>
                        </div>
                      ))}
                      <button className="btn btn-ghost btn-xs" style={{ marginTop: 4 }}
                        onClick={() => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, scoring: [...q.scoring, { pattern: "", points: 1 }] } : q))}>
                        + Add Pattern
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button className="btn btn-outline btn-sm" style={{ alignSelf: "flex-start" }}
                onClick={() => setLvQuestions(p => [...p, { id: `custom_${Date.now()}`, label: "New LV Question", col: "", type: "custom", maxPoints: 3, scoring: [{ pattern: "", points: 3 }] }])}>
                + Add LV Dimension
              </button>
            </div>

            <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(4)}>Select Questions →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: QUESTIONS ── */}
        {step === 4 && (
          <div className="fade-in">
            <div style={{ marginBottom: 28, paddingBottom: 18, borderBottom: "1.5px solid var(--border)" }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Question Configuration</h2>
              <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>Select questions for toplines and crosstabs.</div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
              <button className="btn btn-outline btn-sm" onClick={() => setQuestionConfigs(p => p.map(q => ({ ...q, included: true })))}>Select All</button>
              <button className="btn btn-outline btn-sm" onClick={() => setQuestionConfigs(p => p.map(q => ({ ...q, included: false })))}>Deselect All</button>
              <span style={{ fontSize: 12, color: "var(--text3)", fontFamily: "JetBrains Mono", marginLeft: 8 }}>
                {questionConfigs.filter(q => q.included).length} of {questionConfigs.length} selected
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {questionConfigs.map((q, idx) => (
                <div key={q.col} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: q.included ? "white" : "transparent", border: `1.5px solid ${q.included ? "var(--border)" : "transparent"}`, borderRadius: 8, transition: "all 0.15s", boxShadow: q.included ? "var(--shadow)" : "none" }}>
                  <div className={`toggle toggle-sm ${q.included ? "on" : ""}`} onClick={() => setQuestionConfigs(p => p.map((c, i) => i === idx ? { ...c, included: !c.included } : c))} />
                  {q.matrixStem && <span className="tag tag-p" style={{ flexShrink: 0 }}>Matrix</span>}
                  <span className="tag tag-b" style={{ flexShrink: 0, fontSize: 9 }}>{q.type}</span>
                  <input className="inp" value={q.label}
                    style={{ flex: 1, maxWidth: 440, fontSize: 13, background: "transparent", border: "1px solid transparent", boxShadow: "none", padding: "6px 8px" }}
                    onChange={e => setQuestionConfigs(p => p.map((c, i) => i === idx ? { ...c, label: e.target.value } : c))}
                    onFocus={e => (e.target.style.border = "1px solid var(--border)")}
                    onBlur={e => (e.target.style.border = "1px solid transparent")} />
                  <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono", marginLeft: "auto", flexShrink: 0 }}>{q.col}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setStep(3)}>← Back</button>
              <button className="btn btn-primary" disabled={questionConfigs.filter(q => q.included).length === 0} onClick={processData}
                style={{ gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Run Analysis
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

// ─── REPORT VIEW ──────────────────────────────────────────────────────────────
function ReportView({ results, activeTab, setActiveTab, selectedQ, setSelectedQ, exportWeightedCSV, exportCrosstabsCSV, onBack, xtabMode }: {
  results: AnalysisResults; activeTab: string; setActiveTab: (t: string) => void;
  selectedQ: string | null; setSelectedQ: (q: string | null) => void;
  exportWeightedCSV: () => void; exportCrosstabsCSV: () => void;
  onBack: () => void; xtabMode: string;
}) {
  const [combineResponses, setCombineResponses] = useState(false);
  const [activeXtabMode, setActiveXtabMode] = useState<"rv" | "lv">(xtabMode as "rv" | "lv");
  const d = results.diagnostics;
  const inDeffTarget = results.deff >= 1.8 && results.deff <= 2.7;
  const deffColor = results.deff < 1.5 ? "var(--blue)" : results.deff <= 2.7 ? "var(--accent)" : "var(--warn)";

  const sidebarItems: SidebarItem[] = [];
  const addedStems = new Set<string>();
  results.questionConfigs.filter(q => q.included && results.pollCols.includes(q.col)).forEach(q => {
    if (q.matrixStem) {
      if (!addedStems.has(q.matrixStem)) { addedStems.add(q.matrixStem); sidebarItems.push({ id: `matrix_${q.matrixStem}`, label: q.matrixStem, isMatrix: true, stem: q.matrixStem }); }
    } else { sidebarItems.push({ id: q.col, label: results.questionConfigs.find(c => c.col === q.col)?.label || q.col }); }
  });

  const getLabel = (col: string) => results.questionConfigs.find(q => q.col === col)?.label || col;
  const getAnswerOrder = (col: string) => results.questionConfigs.find(q => q.col === col)?.answerOrder;
  const selectedItemId = selectedQ
    ? (results.questionConfigs.find(q => q.col === selectedQ)?.matrixStem
        ? `matrix_${results.questionConfigs.find(q => q.col === selectedQ)?.matrixStem}`
        : selectedQ)
    : null;

  const TABS = [
    { id: "toplines", label: "Toplines" },
    { id: "crosstabs", label: "Crosstabs" },
    { id: "diagnostics", label: "Diagnostics" },
    { id: "lv", label: "LV Frequencies" },
    { id: "prepost", label: "Pre / Post" },
    { id: "sample", label: "Sample Comp." },
    { id: "missing", label: "Missing Data" },
    { id: "methodology", label: "Methodology" },
  ];

  return (
    <div className="fade-in">
      {/* Report header */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, paddingBottom: 18, borderBottom: "1.5px solid var(--border)", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Analysis Report</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "var(--text3)" }}>N = {results.n.toLocaleString()}</span>
            <span style={{ color: "var(--border2)" }}>·</span>
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "var(--text3)" }}>{results.pollCols.length} questions</span>
            <span style={{ color: "var(--border2)" }}>·</span>
            <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: deffColor, fontWeight: 700 }}>DEFF = {results.deff.toFixed(3)}</span>
            <span className={`tag ${results.converged ? "tag-g" : "tag-y"}`}>{results.converged ? `Converged (${results.itersUsed} iter)` : "DNC"}</span>
            {results.tieredWeightsApplied && <span className="tag tag-p">Tiered</span>}
            <span className="tag tag-teal">Cap {results.chosenCap}×</span>
            {inDeffTarget ? <span className="tag tag-g">DEFF on target</span> : <span className="tag tag-y">DEFF outside target</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-outline btn-sm" onClick={onBack}>← Back</button>
          <button className="btn btn-outline btn-sm" onClick={exportWeightedCSV}>⬇ Weighted CSV</button>
          <button className="btn btn-outline btn-sm" onClick={exportCrosstabsCSV}>⬇ Crosstabs CSV</button>
          <button className="btn btn-accent btn-sm" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      {/* KPI bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total N", value: results.n.toLocaleString(), sub: "Unweighted respondents" },
          { label: "Design Effect", value: results.deff.toFixed(3), sub: `Efficiency: ${results.eff.toFixed(1)}%`, color: deffColor },
          { label: "Weight Range", value: `${d.min.toFixed(2)}–${d.max.toFixed(2)}`, sub: `CV: ${d.cv.toFixed(1)}%` },
          { label: "Effective LV N", value: Math.round(results.lvProbs.reduce((s, v) => s + v, 0)).toLocaleString(), sub: `Mean LV prob: ${(results.lvProbs.reduce((s, v) => s + v, 0) / results.n * 100).toFixed(1)}%` },
          { label: "Optimal Cap", value: `${results.chosenCap}×`, sub: inDeffTarget ? "DEFF in target range" : "Nearest to target", color: inDeffTarget ? "var(--accent)" : "var(--warn)" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="kpi-block">
            <div className="kpi-sub" style={{ marginBottom: 6 }}>{label}</div>
            <div className="kpi-num" style={{ color: color || "var(--text)" }}>{value}</div>
            <div className="kpi-sub" style={{ marginTop: 6 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="no-print" style={{ borderBottom: "1.5px solid var(--border)", marginBottom: 22, display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
        {TABS.map(t => <button key={t.id} className={`tab ${activeTab === t.id ? "on" : ""}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>)}
        {/* Combine toggle — only show on toplines / crosstabs */}
        {(activeTab === "toplines" || activeTab === "crosstabs") && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, padding: "0 14px", flexShrink: 0 }}>
            <div
              className={`toggle toggle-sm ${combineResponses ? "on" : ""}`}
              onClick={() => setCombineResponses(p => !p)}
            />
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: combineResponses ? "var(--accent)" : "var(--text3)", fontWeight: 600, whiteSpace: "nowrap" }}>
              Combine Scale Responses
            </span>
            {combineResponses && (
              <span className="tag tag-g" style={{ fontSize: 9 }}>NET</span>
            )}
          </div>
        )}
      </div>

      {/* TOPLINES */}
      {activeTab === "toplines" && (
        <div style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 18 }}>
          <QSidebar items={sidebarItems} selectedId={selectedItemId} onSelect={(item) => {
            if (item.isMatrix && item.stem) { const fc = results.questionConfigs.find(q => q.matrixStem === item.stem && results.pollCols.includes(q.col))?.col; if (fc) setSelectedQ(fc); }
            else setSelectedQ(item.id);
          }} />
          <div>
            {selectedQ && (() => {
              const qConfig = results.questionConfigs.find(q => q.col === selectedQ);
              const isMatrix = !!qConfig?.matrixStem;
              if (isMatrix) {
                const matrixCols = results.questionConfigs.filter(q => q.matrixStem === qConfig!.matrixStem && results.pollCols.includes(q.col)).map(q => q.col);
                return (
                  <div className="card">
                    <span className="tag tag-p" style={{ marginBottom: 8, display: "inline-block" }}>Matrix</span>
                    <div style={{ fontWeight: 700, fontSize: 20, fontFamily: "'Syne', sans-serif", marginBottom: 20 }}>{qConfig!.matrixStem}</div>
                    {matrixCols.map(col => { const tl = results.toplines[col]; if (!tl) return null; const sub = results.questionConfigs.find(q => q.col === col)?.matrixItem || col; return (<div key={col} style={{ marginBottom: 32 }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 12, paddingLeft: 10, borderLeft: "3px solid var(--accent)", fontFamily: "'Syne', sans-serif" }}>{sub}</div><ToplineChart tl={tl} combineResponses={combineResponses} /></div>); })}
                  </div>
                );
              }
              const tl = results.toplines[selectedQ]; if (!tl) return null;
              return (
                <div className="card">
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text3)", marginBottom: 4, fontFamily: "JetBrains Mono" }}>{selectedQ}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Syne', sans-serif", marginBottom: 14 }}>{getLabel(selectedQ)}</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center" }}>
                    <span className="tag tag-b">RV (Design) Weighted</span>
                    <span className="tag tag-g">LV (Likely Voter) Weighted</span>
                    {combineResponses && <span className="tag tag-teal">NET Responses Active</span>}
                  </div>
                  <ToplineChart tl={tl} combineResponses={combineResponses} />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* CROSSTABS */}
      {activeTab === "crosstabs" && (
        <div style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 18 }}>
          <QSidebar items={sidebarItems} selectedId={selectedItemId} onSelect={(item) => {
            if (item.isMatrix && item.stem) { const fc = results.questionConfigs.find(q => q.matrixStem === item.stem && results.pollCols.includes(q.col))?.col; if (fc) setSelectedQ(fc); }
            else setSelectedQ(item.id);
          }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", background: "white", border: "1.5px solid var(--border)", borderRadius: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {(["rv", "lv"] as const).map(m => (
                  <button key={m} className={`btn btn-sm ${activeXtabMode === m ? (m === "lv" ? "btn-primary" : "btn-accent") : "btn-outline"}`}
                    onClick={() => setActiveXtabMode(m)}>
                    {m.toUpperCase()} Weighted
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>
                {activeXtabMode === "lv" ? "Likely voter weights applied" : "Registered voter (design) weights applied"}
              </span>
              {combineResponses && <span className="tag tag-teal">NET Responses Active</span>}
            </div>
            {selectedQ && (() => {
              const qConfig = results.questionConfigs.find(q => q.col === selectedQ);
              const isMatrix = !!qConfig?.matrixStem;
              const matrixCols = isMatrix ? results.questionConfigs.filter(q => q.matrixStem === qConfig!.matrixStem && results.pollCols.includes(q.col)).map(q => q.col) : [selectedQ];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {matrixCols.map(col => {
                    const xtabsForQ = (activeXtabMode === "lv" ? results.xtabs[col] : results.xtabsRV[col]) || [];
                    const subLabel = isMatrix ? (results.questionConfigs.find(q => q.col === col)?.matrixItem || col) : getLabel(col);
                    return (
                      <div key={col} className="card">
                        {isMatrix && <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, paddingLeft: 10, borderLeft: "3px solid var(--accent)", fontFamily: "'Syne', sans-serif", color: "var(--accent)" }}>{subLabel}</div>}
                        {!isMatrix && <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, fontFamily: "'Syne', sans-serif" }}>{subLabel}</div>}
                        <RasmussenXtab xtabs={xtabsForQ} answerOrder={getAnswerOrder(col)} combineResponses={combineResponses} />
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* DIAGNOSTICS */}
      {activeTab === "diagnostics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card" style={{ borderLeftWidth: 3, borderLeftColor: inDeffTarget ? "var(--accent)" : "var(--warn)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, background: inDeffTarget ? "var(--accent-light)" : "var(--warn-light)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                {inDeffTarget ? "✓" : "⚠"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: inDeffTarget ? "var(--accent)" : "var(--warn)", fontFamily: "'Syne', sans-serif" }}>
                  {inDeffTarget ? `DEFF ${results.deff.toFixed(3)} — within target range` : `DEFF ${results.deff.toFixed(3)} — outside target range`}
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3, fontFamily: "JetBrains Mono" }}>
                  Target: {results.chosenCap > 0 ? `2.0–2.5` : "custom"} · Cap applied: {results.chosenCap}× · {results.itersUsed} total iterations
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div className="card">
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Weight Statistics</div>
              {[
                ["Minimum Weight", d.min.toFixed(4), d.min < 0.25 ? "tag-r" : "tag-g"],
                ["Maximum Weight", d.max.toFixed(4), d.max > 4 ? "tag-r" : d.max > 2.5 ? "tag-y" : "tag-g"],
                ["Mean Weight", d.mean.toFixed(4), "tag-b"],
                ["Coeff. of Variation", `${d.cv.toFixed(1)}%`, d.cv > 60 ? "tag-r" : d.cv > 40 ? "tag-y" : "tag-g"],
                ["% Weights < 0.5", `${d.pctUnder05.toFixed(1)}%`, d.pctUnder05 > 15 ? "tag-r" : "tag-g"],
                ["% Weights > 2.0", `${d.pctOver2.toFixed(1)}%`, d.pctOver2 > 20 ? "tag-r" : d.pctOver2 > 10 ? "tag-y" : "tag-g"],
                ["% Weights > 3.0", `${d.pctOver3.toFixed(1)}%`, d.pctOver3 > 10 ? "tag-r" : d.pctOver3 > 5 ? "tag-y" : "tag-g"],
                ["Final Cap Used", `${results.chosenCap}×`, "tag-teal"],
              ].map(([k, v, cls]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 12.5, color: "var(--text2)" }}>{k}</span>
                  <span className={`tag ${cls}`}>{v}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Weight Distribution</div>
              {d.histogram.map(bin => {
                const isHigh = bin.bin.includes(">4") || bin.bin.includes("3.0–4");
                const isGood = bin.bin.includes("0.75–1.0") || bin.bin.includes("1.0–1.5") || bin.bin.includes("1.5–2.0");
                const barColor = isHigh ? "var(--err)" : isGood ? "var(--accent)" : "var(--warn)";
                return (
                  <div key={bin.bin} className="hist-row">
                    <span className="hist-label">{bin.bin}</span>
                    <div className="hist-track"><div className="hist-fill" style={{ width: `${Math.min(100, bin.pct)}%`, background: barColor, opacity: 0.7 }} /></div>
                    <span className="hist-val">{bin.pct.toFixed(1)}% ({bin.count})</span>
                  </div>
                );
              })}
            </div>
          </div>

          {d.trimResults?.length > 0 && (
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>Multi-Pass Cap Results</div>
                <span className="tag tag-g">Optimal: {d.bestCap}×</span>
                <span className="tag tag-b">Target DEFF 2.0–2.5</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10, marginBottom: 14 }}>
                {d.trimResults.map(r => {
                  const isTarget = r.deff >= 1.8 && r.deff <= 2.7;
                  const isBest = r.cap === d.bestCap;
                  return (
                    <div key={r.cap} style={{ background: isBest ? "var(--accent)" : isTarget ? "var(--accent-light)" : "var(--bg2)", color: isBest ? "white" : isTarget ? "var(--accent)" : "var(--text2)", border: `1.5px solid ${isBest ? "var(--accent)" : isTarget ? "var(--accent)" : "var(--border)"}`, padding: "12px 14px", textAlign: "center", borderRadius: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Syne', sans-serif" }}>Cap {r.cap}×</div>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 11, marginTop: 4, opacity: 0.85 }}>DEFF {r.deff.toFixed(3)}</div>
                      <div style={{ fontFamily: "JetBrains Mono", fontSize: 10, marginTop: 2, opacity: 0.7 }}>Eff {r.eff.toFixed(1)}%</div>
                      {isBest && <div style={{ fontSize: 9, marginTop: 5, fontFamily: "JetBrains Mono", fontWeight: 700 }}>★ CHOSEN</div>}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "JetBrains Mono", padding: "10px 14px", background: "var(--bg2)", borderRadius: 6 }}>
                Multi-pass raking ran with each cap value across {Math.floor(results.itersUsed / d.trimResults.length)} iterations per cap.
                The cap yielding DEFF closest to the 2.0–2.5 target was selected automatically.
              </div>
            </div>
          )}

          {d.iterHistory?.length > 0 && (
            <div className="card">
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Convergence History</div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead><tr><th>Iteration</th><th style={{ textAlign: "right" }}>Max Delta</th><th>Status</th></tr></thead>
                  <tbody>
                    {d.iterHistory.slice(0, 20).map(({ iter, maxDelta }) => (
                      <tr key={iter}>
                        <td style={{ fontFamily: "JetBrains Mono", fontSize: 12 }}>{iter}</td>
                        <td className="num" style={{ fontFamily: "JetBrains Mono" }}>{maxDelta.toFixed(6)}</td>
                        <td><span className={`tag ${maxDelta < 0.001 ? "tag-g" : maxDelta < 0.01 ? "tag-y" : "tag-r"}`}>{maxDelta < 0.001 ? "Converging" : maxDelta < 0.01 ? "Improving" : "Iterating"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LV FREQUENCIES */}
      {activeTab === "lv" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card" style={{ borderLeftWidth: 3, borderLeftColor: "var(--accent)" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Frequency-Based LV Scoring</div>
            <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7, fontFamily: "JetBrains Mono" }}>
              Each column shows the raw frequency of each answer choice (% of respondents) and the LV weight assigned to it. High-intent answers that are less common get higher LV weights. The LV weight per answer = pattern_score / sqrt(frequency).
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div className="card">
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Model Parameters</div>
              {[
                ["Score Mean", results.scoreMean?.toFixed(4) ?? "—"],
                ["Score Std Dev", results.scoreSD?.toFixed(4) ?? "—"],
                ["Mean LV Probability", `${(results.lvProbs.reduce((s, v) => s + v, 0) / results.n * 100).toFixed(1)}%`],
                ["Effective LV N", Math.round(results.lvProbs.reduce((s, v) => s + v, 0)).toLocaleString()],
                ["Sigmoid Steepness", "1.6 (z-score logistic)"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 12.5 }}>
                  <span style={{ color: "var(--text2)" }}>{k}</span>
                  <span style={{ fontWeight: 600, fontFamily: "JetBrains Mono", color: "var(--accent)" }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 14 }}>LV Probability Distribution</div>
              {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((lo, i) => {
                const hi = lo + 0.1;
                const cnt = results.lvProbs.filter(p => p >= lo && p < hi).length;
                const pct = cnt / results.n * 100;
                const isHigh = lo >= 0.7;
                return (
                  <div key={i} className="hist-row">
                    <span className="hist-label">{(lo * 100).toFixed(0)}–{(hi * 100).toFixed(0)}%</span>
                    <div className="hist-track"><div className="hist-fill" style={{ width: `${pct}%`, background: isHigh ? "var(--accent)" : "var(--accent-light)", border: isHigh ? "none" : "1px solid var(--accent)" }} /></div>
                    <span className="hist-val">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {Object.entries(results.lvFrequencyTable).map(([col, freqData]) => {
            const question = results.questionConfigs.find(q => q.col === col);
            const sortedEntries = Object.entries(freqData).sort((a, b) => b[1].lvWeight - a[1].lvWeight);
            const maxLvWeight = Math.max(...sortedEntries.map(e => e[1].lvWeight), 0.001);
            const maxRawPct = Math.max(...sortedEntries.map(e => e[1].rawPct), 0.001);

            return (
              <div key={col} className="card">
                <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "var(--text3)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{col}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{question?.label || col}</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "var(--blue)", textTransform: "uppercase", letterSpacing: 0.5 }}>← Raw frequency (%) →</div>
                  <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "var(--warn)", textTransform: "uppercase", letterSpacing: 0.5 }}>← LV weight assigned →</div>
                </div>

                {sortedEntries.map(([resp, data]) => (
                  <div key={resp} style={{ marginBottom: 14 }}>
                    <div className="lv-bar-row">
                      <span className="lv-bar-label">{resp}</span>
                      <span className="lv-bar-pct" style={{ color: "var(--blue)" }}>{data.rawPct.toFixed(1)}%</span>
                      <span className="lv-bar-pct" style={{ color: "var(--text3)", fontSize: 10 }}>({data.count})</span>
                      <span className="lv-bar-wt">{data.lvWeight.toFixed(3)}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginLeft: "0px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 9, color: "var(--text3)", width: 28, fontFamily: "JetBrains Mono" }}>Freq</span>
                        <div className="lv-bar-track" style={{ flex: 1 }}>
                          <div className="lv-bar-fill" style={{ width: `${(data.rawPct / maxRawPct) * 100}%`, background: "var(--blue)", opacity: 0.6 }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 9, color: "var(--text3)", width: 28, fontFamily: "JetBrains Mono" }}>LV</span>
                        <div className="lv-bar-track" style={{ flex: 1 }}>
                          <div className="lv-bar-fill" style={{ width: `${(data.lvWeight / maxLvWeight) * 100}%`, background: "var(--warn)", opacity: 0.85 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* PRE/POST */}
      {activeTab === "prepost" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.entries(results.prePostComparison.reduce((acc: Record<string, PrePostRow[]>, row) => { if (!acc[row.variable]) acc[row.variable] = []; acc[row.variable].push(row); return acc; }, {})).map(([varName, rows]) => (
            <div key={varName} className="card">
              <div style={{ fontWeight: 700, fontSize: 16, fontFamily: "'Syne', sans-serif", marginBottom: 16 }}>{varName}</div>
              <div className="xt-wrap">
                <table className="data-table">
                  <thead><tr><th>Category</th><th style={{ textAlign: "right" }}>Unweighted</th><th style={{ textAlign: "right" }}>Weighted</th><th style={{ textAlign: "right" }}>Target</th><th style={{ textAlign: "right" }}>Shift</th><th style={{ textAlign: "right" }}>Δ vs Target</th></tr></thead>
                  <tbody>
                    {rows.map(r => {
                      const shift = r.weightedPct - r.samplePct;
                      const delta = r.weightedPct - r.targetPct;
                      return (
                        <tr key={r.category}>
                          <td style={{ fontWeight: 600 }}>{r.category}</td>
                          <td className="num">{r.samplePct.toFixed(1)}%</td>
                          <td className="num" style={{ fontWeight: 700 }}>{r.weightedPct.toFixed(1)}%</td>
                          <td className="num" style={{ color: "var(--text3)" }}>{r.targetPct.toFixed(1)}%</td>
                          <td style={{ textAlign: "right" }}><span className={`delta ${Math.abs(shift) < 2 ? "delta-ok" : shift > 0 ? "delta-up" : "delta-down"}`}>{shift > 0 ? "+" : ""}{shift.toFixed(1)}pp</span></td>
                          <td style={{ textAlign: "right" }}><span className={`delta ${Math.abs(delta) < 1 ? "delta-ok" : Math.abs(delta) < 3 ? "delta-down" : "delta-up"}`}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}pp</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SAMPLE COMP */}
      {activeTab === "sample" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
          {Object.entries(results.sampleComp).map(([dim, data]) => {
            const rawData = results.rawSampleComp[dim] || [];
            return (
              <div key={dim} className="card">
                <div className="section-title">{dim}</div>
                {data.map(item => {
                  const raw = rawData.find(r => r.response === item.response);
                  return (
                    <div key={item.response} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5 }}>{item.response}</span>
                        <div style={{ display: "flex", gap: 10 }}>
                          {raw && <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>{(raw.pct * 100).toFixed(1)}%</span>}
                          <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: "JetBrains Mono", color: "var(--accent)" }}>{(item.pct * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: "var(--bg2)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                        {raw && <div style={{ position: "absolute", left: 0, top: 0, width: `${Math.min(100, raw.pct * 100)}%`, height: "100%", background: "var(--border2)", borderRadius: 3 }} />}
                        <div style={{ position: "absolute", left: 0, top: 0, width: `${Math.min(100, item.pct * 100)}%`, height: "100%", background: "var(--accent)", opacity: 0.75, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* MISSING DATA */}
      {activeTab === "missing" && (
        <div>
          {results.missingDataReport.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 64 }}>
              <div style={{ width: 56, height: 56, background: "var(--accent-light)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>✓</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 6, color: "var(--accent)" }}>No Missing Data</div>
              <div style={{ color: "var(--text3)", fontSize: 12, fontFamily: "JetBrains Mono" }}>All demographic variables were fully populated.</div>
            </div>
          ) : (
            <div className="card">
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Missing Data — Hot-Deck Imputation Applied</div>
              <table className="data-table">
                <thead><tr><th>Variable</th><th style={{ textAlign: "right" }}>Missing N</th><th style={{ textAlign: "right" }}>Missing %</th><th style={{ textAlign: "right" }}>Imputed N</th><th>Severity</th></tr></thead>
                <tbody>
                  {results.missingDataReport.map(r => (
                    <tr key={r.col}>
                      <td style={{ fontFamily: "JetBrains Mono", fontSize: 12 }}>{r.col}</td>
                      <td className="num">{r.missingN}</td>
                      <td className="num">{r.missingPct.toFixed(1)}%</td>
                      <td className="num" style={{ color: "var(--accent)" }}>{r.imputedN}</td>
                      <td><span className={`tag ${r.missingPct < 5 ? "tag-g" : r.missingPct < 15 ? "tag-y" : "tag-r"}`}>{r.missingPct < 5 ? "Low" : r.missingPct < 15 ? "Moderate" : "High"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* METHODOLOGY */}
      {activeTab === "methodology" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
          {[
            { title: "Raking Parameters", rows: [
              ["Method", results.tieredWeightsApplied ? "Tiered Multi-Pass IPF/RIM" : results.externalWeightsUsed ? "External Weights" : "Multi-Pass IPF/RIM"],
              ["Passes", "3–5 complete dimension sweeps"],
              ["Convergence Tolerance", "1e-5 per dimension"],
              ["Converged", results.converged ? `Yes — ${results.itersUsed} total iterations` : `DNC (${results.itersUsed})`],
              ["Final Cap", `${results.chosenCap}×`],
            ]},
            { title: "Design Effect", rows: [
              ["DEFF", results.deff.toFixed(4)],
              ["Efficiency", `${results.eff.toFixed(1)}%`],
              ["Target Range", "2.0 – 2.5"],
              ["In Target", results.deff >= 1.8 && results.deff <= 2.7 ? "Yes" : "Outside range"],
              ["Subgroup Capping", "Enabled (size-aware)"],
            ]},
            { title: "Race Weighting", rows: [
              ["Mode", results.raceMode === "race5" ? "Race × Education (5-cat)" : "Standard Race (4-cat)"],
              ["Categories", results.raceMode === "race5" ? "White Non-College, White College, Black, Hispanic, Asian/Other" : "White (Non-Hisp), Black, Hispanic, Asian/Other"],
              ["White Split", results.raceMode === "race5" ? "Derived from education column (bachelor's+)" : "N/A — single White category"],
              ["Party ID", "Not included in weighting"],
            ]},
            { title: "Race Weighting", rows: [
              ["Mode", results.raceMode === "race5" ? "Race × Education (5-cat)" : "Standard Race (4-cat)"],
              ["Categories", results.raceMode === "race5" ? "White Non-College, White College, Black, Hispanic, Asian/Other" : "White (Non-Hisp), Black, Hispanic, Asian/Other"],
              ["White Split", results.raceMode === "race5" ? "Derived from education column (bachelor's+)" : "N/A — single White category"],
              ["Party ID", "Not included in weighting"],
            ]},
            { title: "LV Model", rows: [
              ["Scoring Method", "Frequency-adjusted pattern scoring"],
              ["Frequency Penalty", "1 / sqrt(proportion)"],
              ["Sigmoid", "Logistic, steepness 1.6"],
              ["Score Mean", results.scoreMean?.toFixed(4) ?? "—"],
              ["Score SD", results.scoreSD?.toFixed(4) ?? "—"],
              ["Mean LV Prob", `${(results.lvProbs.reduce((s, v) => s + v, 0) / results.n * 100).toFixed(1)}%`],
            ]},
            { title: "Crosstabs", rows: [
              ["Format", "Rasmussen / Emerson style"],
              ["Layout", "Response rows × demographic columns"],
              ["Weighting", `${xtabMode.toUpperCase()} weights applied`],
              ["Cell values", "Column percentages"],
              ["LV weights", "Frequency-based propensity × design weight"],
            ]},
          ].map(section => (
            <div key={section.title} className="card">
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 14, borderBottom: "1.5px solid var(--border)", paddingBottom: 10 }}>{section.title}</div>
              {section.rows.map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 12.5 }}>
                  <span style={{ color: "var(--text2)" }}>{k}</span>
                  <span style={{ fontWeight: 500, fontFamily: "JetBrains Mono", color: "var(--text)", maxWidth: 220, textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Q SIDEBAR ────────────────────────────────────────────────────────────────
function QSidebar({ items, selectedId, onSelect }: { items: SidebarItem[]; selectedId: string | null; onSelect: (item: SidebarItem) => void }) {
  return (
    <div style={{ background: "white", border: "1.5px solid var(--border)", borderRadius: 10, overflow: "hidden", maxHeight: 680, overflowY: "auto", position: "sticky", top: 80, boxShadow: "var(--shadow)" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1.5px solid var(--border)", fontSize: 9, fontFamily: "JetBrains Mono", color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>
        Questions
      </div>
      {items.map(item => (
        <div key={item.id} className={`q-item ${selectedId === item.id ? "on" : ""}`} onClick={() => onSelect(item)}>
          {item.isMatrix && <span style={{ fontSize: 8, fontWeight: 700, color: "var(--blue)", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 1, fontFamily: "JetBrains Mono" }}>Matrix</span>}
          <span>{item.label.length > 42 ? item.label.slice(0, 42) + "…" : item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── TOPLINE CHART ────────────────────────────────────────────────────────────
function ToplineChart({ tl, combineResponses }: { tl: { rv: FreqItem[]; lv: FreqItem[] }; combineResponses?: boolean }) {
  const allResponses = tl.rv.map(i => i.response);
  const combineGroups = combineResponses ? detectCombineGroups(allResponses) : [];
  const hasGroups = combineGroups.length > 0;

  const displayRv = combineResponses && hasGroups ? combineFreqItems(tl.rv, combineGroups) : tl.rv;
  const displayLv = combineResponses && hasGroups ? combineFreqItems(tl.lv, combineGroups) : tl.lv;

  const maxPct = Math.max(...displayRv.map(i => i.pct * 100), 1);

  return (
    <div>
      {/* NET summary banner when groups detected */}
      {combineResponses && hasGroups && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "var(--accent-light)", borderRadius: 8, border: "1px solid var(--accent)", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginRight: 4 }}>Nets combined:</span>
          {combineGroups.map(g => (
            <span key={g.label} className="tag tag-teal" style={{ fontSize: 9 }}>
              {g.label} = {g.members.join(" + ")}
            </span>
          ))}
        </div>
      )}

      {displayRv.map(item => {
        const lvItem = displayLv.find(l => l.response === item.response);
        const rvPct = item.pct * 100, lvPct = lvItem ? lvItem.pct * 100 : 0;
        const isNet = combineGroups.some(g => g.label === item.response);
        return (
          <div key={item.response} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <span style={{ fontSize: 13.5, flex: 1, paddingRight: 14, fontWeight: isNet ? 700 : 500, color: isNet ? "var(--accent)" : "var(--text)" }}>
                {isNet && <span style={{ fontSize: 9, fontFamily: "JetBrains Mono", color: "var(--accent)", marginRight: 6, background: "var(--accent-light)", padding: "1px 5px", borderRadius: 3, letterSpacing: 0.5, textTransform: "uppercase" }}>NET</span>}
                {item.response}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <span className="tag tag-b" style={{ minWidth: 54, textAlign: "center" }}>{rvPct.toFixed(1)}%</span>
                <span className="tag tag-g" style={{ minWidth: 54, textAlign: "center" }}>{lvPct.toFixed(1)}%</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: "var(--text3)", width: 20, fontFamily: "JetBrains Mono", textAlign: "right" }}>RV</span>
              <div style={{ flex: 1, height: isNet ? 9 : 7, background: "var(--bg2)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (rvPct / maxPct) * 100)}%`, height: "100%", background: isNet ? "var(--blue)" : "var(--blue)", opacity: isNet ? 0.9 : 0.7, borderRadius: 4 }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, color: "var(--text3)", width: 20, fontFamily: "JetBrains Mono", textAlign: "right" }}>LV</span>
              <div style={{ flex: 1, height: isNet ? 9 : 7, background: "var(--bg2)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (lvPct / maxPct) * 100)}%`, height: "100%", background: isNet ? "var(--accent2)" : "var(--accent)", opacity: isNet ? 1 : 0.85, borderRadius: 4 }} />
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 22, borderTop: "1.5px solid var(--border)", paddingTop: 16 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Response</th>
              <th style={{ textAlign: "right", color: "var(--blue)" }}>RV %</th>
              <th style={{ textAlign: "right", color: "var(--accent)" }}>LV %</th>
              <th style={{ textAlign: "right" }}>Wtd N</th>
              {combineResponses && hasGroups && <th>Type</th>}
            </tr>
          </thead>
          <tbody>
            {displayRv.map(item => {
              const lv = displayLv.find(l => l.response === item.response);
              const isNet = combineGroups.some(g => g.label === item.response);
              return (
                <tr key={item.response} style={{ background: isNet ? "var(--accent-light)" : "transparent" }}>
                  <td style={{ fontWeight: isNet ? 700 : 400 }}>{item.response}</td>
                  <td className="num" style={{ fontWeight: 700, color: "var(--blue)" }}>{(item.pct * 100).toFixed(1)}%</td>
                  <td className="num" style={{ fontWeight: 700, color: "var(--accent)" }}>{lv ? (lv.pct * 100).toFixed(1) + "%" : "—"}</td>
                  <td className="num" style={{ color: "var(--text3)" }}>{item.n.toFixed(0)}</td>
                  {combineResponses && hasGroups && (
                    <td>{isNet ? <span className="tag tag-teal" style={{ fontSize: 9 }}>NET</span> : <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>raw</span>}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── RASMUSSEN CROSSTAB ───────────────────────────────────────────────────────
function RasmussenXtab({ xtabs, answerOrder: _ao, combineResponses }: { xtabs: CrosstabResult[]; answerOrder?: string[]; combineResponses?: boolean }) {
  if (!xtabs.length) return <div style={{ color: "var(--text3)", fontSize: 12, fontFamily: "JetBrains Mono" }}>No crosstab data available.</div>;

  // Detect combine groups from first xtab's response list
  const rawResponses = xtabs[0].qList;
  const combineGroups = combineResponses ? detectCombineGroups(rawResponses) : [];
  const hasGroups = combineGroups.length > 0;

  // Apply combining to each xtab
  const displayXtabs = (combineResponses && hasGroups)
    ? xtabs.map(xt => combineCrosstabResult(xt, combineGroups))
    : xtabs;

  const allResponses = displayXtabs[0].qList;

  return (
    <div>
      {/* NET banner */}
      {combineResponses && hasGroups && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "var(--accent-light)", borderRadius: 6, border: "1px solid var(--accent)", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Nets:</span>
          {combineGroups.map(g => (
            <span key={g.label} style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "var(--accent)" }}>
              {g.label} = {g.members.join(" + ")}
            </span>
          ))}
        </div>
      )}

      <div className="xt-wrap">
        <table className="xt-table" style={{ minWidth: 700 }}>
          <thead>
            <tr>
              <th className="resp-h" rowSpan={2}>Response</th>
              <th className="total-h" rowSpan={2} style={{ textAlign: "right", minWidth: 70 }}>Total</th>
              {displayXtabs.map(xt => (
                <th key={xt.breakdown} className="dim-h" colSpan={xt.byGroups.length} style={{ borderLeft: "1.5px solid var(--border2)" }}>{xt.breakdown}</th>
              ))}
            </tr>
            <tr>
              {displayXtabs.map(xt => xt.byGroups.map((g, gi) => (
                <th key={`${xt.breakdown}_${g}`} className="group-h" style={{ borderLeft: gi === 0 ? "1.5px solid var(--border2)" : "none", fontSize: 9 }}>{g}</th>
              )))}
            </tr>
          </thead>
          <tbody>
            {allResponses.map((resp, ri) => {
              const isNet = combineGroups.some(g => g.label === resp);
              return (
                <tr key={resp} style={{ background: isNet ? "var(--accent-light)" : ri % 2 === 1 ? "var(--bg)" : "transparent" }}>
                  <td className="resp-cell" style={{ fontWeight: isNet ? 700 : 600 }}>
                    {isNet && <span style={{ fontSize: 8, fontFamily: "JetBrains Mono", color: "var(--accent)", marginRight: 5, background: "rgba(45,90,61,0.15)", padding: "1px 4px", borderRadius: 2, letterSpacing: 0.5, textTransform: "uppercase" }}>NET</span>}
                    {resp}
                  </td>
                  <td className="total-cell" style={{ fontWeight: isNet ? 800 : 700 }}>{displayXtabs[0].result[resp]?.Total ?? "—"}%</td>
                  {displayXtabs.map(xt => xt.byGroups.map((g, gi) => (
                    <td key={`${xt.breakdown}_${g}`} className="group-cell" style={{ borderLeft: gi === 0 ? "1px solid var(--border)" : "none", fontWeight: isNet ? 700 : 400, color: isNet ? "var(--accent)" : "var(--text2)" }}>
                      {xt.result[resp]?.[g] ?? "—"}%
                    </td>
                  )))}
                </tr>
              );
            })}
            {/* Weighted N row */}
            <tr style={{ borderTop: "1.5px solid var(--border2)", background: "var(--bg2)" }}>
              <td className="resp-cell" style={{ fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Weighted N</td>
              <td style={{ textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 11, color: "var(--text3)", fontWeight: 700 }}>
                {Math.round(displayXtabs[0].totalN ?? 0).toLocaleString()}
              </td>
              {displayXtabs.map(xt => xt.byGroups.map((g, gi) => (
                <td key={`n_${xt.breakdown}_${g}`} style={{ textAlign: "right", fontFamily: "JetBrains Mono", fontSize: 11, color: "var(--text3)", borderLeft: gi === 0 ? "1px solid var(--border)" : "none" }}>
                  {xt.groupTotals?.[g] != null ? Math.round(xt.groupTotals[g]).toLocaleString() : "—"}
                </td>
              )))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}