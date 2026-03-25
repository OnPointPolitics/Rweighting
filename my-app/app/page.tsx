"use client";
import { useState, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Row = Record<string, string>;
interface CSVData { headers: string[]; rows: Row[]; }
interface Category { value: string; proportion: number; }
interface RakingTarget { variable: string; categories: Category[]; recallMask?: boolean[]; }
interface RakingResult { weights: Float64Array; converged: boolean; itersUsed: number; deff: number; eff: number; }
interface LVResult { lvWeights: number[]; lvProbs: number[]; midpoint: number; k: number; }
interface FreqItem { response: string; pct: number; n: number; }
interface CrosstabResult { result: Record<string, Record<string, string>>; byGroups: string[]; qList: string[]; }
interface XtabEntry extends CrosstabResult { breakdown: string; }

interface BenchmarkDim {
  id: string;
  label: string;
  internalKey: string;
  categories: { name: string; pct: number }[];
  isRecall?: boolean;
  recodeMode?: "standard" | "custom";
  sourceCol?: string;
}

interface LVQuestion {
  id: string;
  label: string;
  col: string;
  type: "registration" | "history" | "motivation" | "social" | "custom";
  scoring: { pattern: string; points: number }[];
  maxPoints: number;
}

interface QuestionConfig {
  col: string;
  label: string;
  type: "single" | "matrix" | "multiselect";
  included: boolean;
  matrixStem?: string;
  matrixItem?: string;
  answerOrder?: string[];
}

interface QuestionnaireEntry {
  col: string;
  questionText: string;
  answers: string[];
}

interface Results {
  n: number; converged: boolean; itersUsed: number; deff: number; eff: number;
  weights: number[]; lvWeights: number[]; lvProbs: number[]; lvScores: number[];
  midpoint: number; k: number;
  pollCols: string[];
  toplines: Record<string, { rv: FreqItem[]; lv: FreqItem[] }>;
  xtabs: Record<string, XtabEntry[]>;
  sampleComp: Record<string, FreqItem[]>;
  recoded: Row[]; headers: string[];
  rakingTargets: string[];
  benchmarkDims: BenchmarkDim[];
  questionConfigs: QuestionConfig[];
}

// ─── CSV Utils ────────────────────────────────────────────────────────────────
function parseCSV(text: string): CSVData {
  const lines = text.split(/\r?\n/);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCSVLine(lines[i]);
    const row: Row = {};
    headers.forEach((h, j) => { row[h] = vals[j] ?? ""; });
    rows.push(row);
  }
  return { headers, rows };
}
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
function toCSV(headers: string[], rows: Row[]): string {
  const esc = (v: unknown): string => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...rows.map(r => headers.map(h => esc(r[h] ?? "")).join(","))].join("\n");
}

// ─── Raking ───────────────────────────────────────────────────────────────────
function runRaking(rows: Row[], targets: RakingTarget[], maxIter = 500): RakingResult {
  const n = rows.length;
  const weights = new Float64Array(n).fill(1.0);
  const FLOOR = 0.2, CAP = 5.0, TOL = 1e-4;
  let converged = false, itersUsed = 0;
  for (let iter = 0; iter < maxIter; iter++) {
    let maxDelta = 0;
    for (const { variable, categories, recallMask } of targets) {
      const isRecall = !!recallMask;
      let baseSum = 0;
      for (let i = 0; i < n; i++) if (!isRecall || recallMask![i]) baseSum += weights[i];
      for (const { value, proportion } of categories) {
        let catSum = 0;
        for (let i = 0; i < n; i++) if (rows[i][variable] === value && (!isRecall || recallMask![i])) catSum += weights[i];
        if (catSum === 0) continue;
        const curProp = catSum / baseSum;
        const scale = proportion / curProp;
        maxDelta = Math.max(maxDelta, Math.abs(curProp - proportion));
        for (let i = 0; i < n; i++) {
          if (rows[i][variable] === value && (!isRecall || recallMask![i]))
            weights[i] = Math.min(CAP, Math.max(FLOOR, weights[i] * scale));
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

// ─── LV ──────────────────────────────────────────────────────────────────────
function computeLVScoresCustom(rows: Row[], lvQuestions: LVQuestion[]): number[] {
  const maxTotal = lvQuestions.reduce((s, q) => s + q.maxPoints, 0) || 16;
  return rows.map(row => {
    let score = 0;
    for (const lv of lvQuestions) {
      if (!lv.col) { score += lv.maxPoints; continue; }
      const v = (row[lv.col] || "").toLowerCase();
      let matched = false;
      for (const sc of lv.scoring) {
        try {
          if (new RegExp(sc.pattern, "i").test(v)) { score += sc.points; matched = true; break; }
        } catch { if (v.includes(sc.pattern.toLowerCase())) { score += sc.points; matched = true; break; } }
      }
      if (!matched) { /* 0 points */ }
    }
    return Math.min(maxTotal, score);
  });
}

function logistic(x: number, m: number, k: number) { return 1 / (1 + Math.exp(-k * (x - m))); }
function weightedMedian(vals: number[], wts: number[]): number {
  const pairs = vals.map((v, i) => [v, wts[i]] as [number, number]).sort((a, b) => a[0] - b[0]);
  const tw = pairs.reduce((s, p) => s + p[1], 0);
  let cum = 0;
  for (const [v, w] of pairs) { cum += w; if (cum >= tw / 2) return v; }
  return pairs[pairs.length - 1][0];
}
function computeLVWeights(rows: Row[], designWeights: Float64Array, lvScores: number[], k: number): LVResult {
  const midpoint = weightedMedian(lvScores, Array.from(designWeights));
  const lvProbs = lvScores.map(s => logistic(s, midpoint, k));
  const lvWts = lvProbs.map((p, i) => designWeights[i] * p);
  const total = lvWts.reduce((s, v) => s + v, 0);
  const dTotal = Array.from(designWeights).reduce((s, v) => s + v, 0);
  return { lvWeights: lvWts.map(w => w * dTotal / total), lvProbs, midpoint, k };
}

// ─── Freq / Crosstab ──────────────────────────────────────────────────────────
function freqTable(rows: Row[], col: string, weights: number[], answerOrder?: string[]): FreqItem[] {
  const counts: Record<string, number> = {}; let total = 0;
  rows.forEach((row, i) => {
    const v = row[col] || "";
    if (!v.trim()) return;
    counts[v] = (counts[v] || 0) + weights[i]; total += weights[i];
  });
  const items = Object.entries(counts).map(([response, wt]) => ({ response, pct: wt / total, n: wt }));
  if (answerOrder && answerOrder.length > 0) {
    items.sort((a, b) => {
      const ai = answerOrder.indexOf(a.response);
      const bi = answerOrder.indexOf(b.response);
      if (ai === -1 && bi === -1) return a.response.localeCompare(b.response);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  } else {
    items.sort((a, b) => a.response.localeCompare(b.response));
  }
  return items;
}

function crosstab(rows: Row[], qCol: string, byCol: string, weights: number[], answerOrder?: string[]): CrosstabResult {
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
  if (answerOrder && answerOrder.length > 0) {
    qList.sort((a, b) => {
      const ai = answerOrder.indexOf(a);
      const bi = answerOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  } else { qList.sort(); }
  const totalByQ: Record<string, number> = {}; let totalAll = 0;
  Object.values(groups).forEach(g => Object.entries(g).forEach(([q, w]) => { totalByQ[q] = (totalByQ[q] || 0) + w; totalAll += w; }));
  const result: Record<string, Record<string, string>> = {};
  qList.forEach(q => {
    result[q] = { Total: totalByQ[q] ? ((totalByQ[q] / totalAll) * 100).toFixed(0) : "0" };
    byGroups.forEach(b => {
      const gt = Object.values(groups[b]).reduce((s, v) => s + v, 0);
      result[q][b] = groups[b][q] ? ((groups[b][q] / gt) * 100).toFixed(0) : "0";
    });
  });
  return { result, byGroups, qList };
}

// ─── Detect question type ─────────────────────────────────────────────────────
function detectQuestionConfigs(headers: string[], rows: Row[]): QuestionConfig[] {
  const skipPatterns = [/^age$/i, /^gender$/i, /^sex$/i, /^race$/i, /^ethnicity$/i, /^educ/i, /^state$/i,
    /^region$/i, /^recall/i, /^vote/i, /^respondent/i, /^id$/i, /^weight/i, /^income/i,
    /^zip/i, /^employ/i, /^division/i, /^county/i, /^cbsa/i, /^party$/i];
  const qHeaders = headers.filter(h => !skipPatterns.some(p => p.test(h)));
  const matrixGroups: Record<string, string[]> = {};
  qHeaders.forEach(h => {
    const m1 = h.match(/^(.+?)[\[_](.+?)[\]]?$/);
    if (m1) { const stem = m1[1]; if (!matrixGroups[stem]) matrixGroups[stem] = []; matrixGroups[stem].push(h); return; }
    const m2 = h.match(/^(.*\d+)([a-zA-Z])$/);
    if (m2) { const stem = m2[1]; if (!matrixGroups[stem]) matrixGroups[stem] = []; matrixGroups[stem].push(h); }
  });
  const configs: QuestionConfig[] = [];
  const grouped = new Set<string>();
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
    const isBinary = vals.length > 0 && vals.every(v => v === "0" || v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "false");
    const hasSemicolon = vals.some(v => v.includes(";"));
    configs.push({ col: h, label: h, type: (isBinary || hasSemicolon) ? "multiselect" : "single", included: true });
  });
  return configs;
}

// ─── Race recoding ─────────────────────────────────────────────────────────────
function recodeRaceValue(raceVal: string, eduVal: string, benchCategories: { name: string; pct: number }[]): string {
  const r = raceVal.toLowerCase();
  const catNames = benchCategories.map(c => c.name.toLowerCase());
  const hasWhiteCollege = catNames.some(n => n.includes("white") && (n.includes("college") || n.includes("grad") || n.includes("educ")));
  const hasWhiteOnly = catNames.some(n => n === "white" || n === "white non-hispanic");
  if (/white/.test(r)) {
    if (hasWhiteCollege) {
      const e = eduVal.toLowerCase();
      const isCollege = /bachelor|post.?grad|master|phd|4.year|graduate/.test(e);
      const colCat = benchCategories.find(c => /college/i.test(c.name) && /white/i.test(c.name));
      const nonColCat = benchCategories.find(c => /non.?college/i.test(c.name) && /white/i.test(c.name));
      if (isCollege && colCat) return colCat.name;
      if (!isCollege && nonColCat) return nonColCat.name;
      return colCat?.name || nonColCat?.name || raceVal;
    }
    if (hasWhiteOnly) { return benchCategories.find(c => c.name.toLowerCase() === "white" || c.name.toLowerCase() === "white non-hispanic")?.name || raceVal; }
    return benchCategories.find(c => /white/i.test(c.name))?.name || raceVal;
  }
  if (/black|african/.test(r)) return benchCategories.find(c => /black/i.test(c.name))?.name || raceVal;
  if (/hispanic|latino/.test(r)) return benchCategories.find(c => /hispanic/i.test(c.name))?.name || raceVal;
  if (/asian|pacific|native|other/.test(r)) return benchCategories.find(c => /asian|other/i.test(c.name))?.name || raceVal;
  return benchCategories.find(c => c.name.toLowerCase() === r)?.name || raceVal;
}

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_LV_QUESTIONS: LVQuestion[] = [
  { id: "registration", label: "Voter Registration", col: "", type: "registration", maxPoints: 3, scoring: [{ pattern: "yes|registered|true|1", points: 3 }] },
  { id: "history", label: "Vote History", col: "", type: "history", maxPoints: 7, scoring: [{ pattern: "2024", points: 3 }, { pattern: "2022", points: 2 }, { pattern: "2020", points: 3 }, { pattern: "2018", points: 2 }, { pattern: "2016", points: 2 }] },
  { id: "motivation", label: "Motivation / Likelihood to Vote", col: "", type: "motivation", maxPoints: 4, scoring: [{ pattern: "extreme|absolutely|certain|definitely", points: 4 }, { pattern: "very|probably will|likely", points: 3 }, { pattern: "somewhat|maybe|50", points: 2 }, { pattern: "not very|unlikely", points: 1 }] },
  { id: "social", label: "Social Norm (Others Voting)", col: "", type: "social", maxPoints: 2, scoring: [{ pattern: "most|all|everyone", points: 2 }, { pattern: "some|half", points: 1 }] }
];

const DEFAULT_BENCHMARK_DIMS: BenchmarkDim[] = [
  { id: "age", label: "Age", internalKey: "_age", recodeMode: "standard", categories: [{ name: "18-29", pct: 26.6 }, { name: "30-44", pct: 28.1 }, { name: "45-64", pct: 22.8 }, { name: "65+", pct: 22.5 }] },
  { id: "gender", label: "Gender", internalKey: "_gender", recodeMode: "standard", categories: [{ name: "Female", pct: 52.5 }, { name: "Male", pct: 47.5 }] },
  { id: "race", label: "Race / Ethnicity", internalKey: "_race", recodeMode: "standard", categories: [{ name: "White Non-College", pct: 46.9 }, { name: "White College", pct: 22.1 }, { name: "Black", pct: 12.6 }, { name: "Hispanic", pct: 11.6 }, { name: "Asian/Other", pct: 6.8 }] },
  { id: "education", label: "Education", internalKey: "_edu", recodeMode: "standard", categories: [{ name: "HS or less", pct: 29.1 }, { name: "Some college", pct: 28.5 }, { name: "Bachelor's", pct: 26.5 }, { name: "Postgraduate", pct: 15.9 }] },
  { id: "recall", label: "2024 Recall Vote", internalKey: "_recall", isRecall: true, recodeMode: "standard", categories: [{ name: "Trump", pct: 49.8 }, { name: "Harris", pct: 48.3 }, { name: "Third Party", pct: 1.2 }] },
];

const CORE_DIM_IDS = ["age", "gender", "race", "education", "recall"];

interface ColMap { [key: string]: string; }

// ─── Add Dimension Modal ──────────────────────────────────────────────────────
function AddDimensionModal({ csvHeaders, onAdd, onClose }: { csvHeaders: string[]; onAdd: (label: string, col: string) => void; onClose: () => void; }) {
  const [label, setLabel] = useState("");
  const [col, setCol] = useState("");
  const handleAdd = () => { if (!label.trim()) return; onAdd(label.trim(), col); onClose(); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: 12, padding: 28, width: 440, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.22)", border: "1px solid #E0D8CC" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20 }}>Add Weighting Dimension</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#999" }}>×</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 }}>Dimension Name <span style={{ color: "#C5444A" }}>*</span></label>
          <input className="inp" placeholder="e.g. Region, Party ID, Income…" value={label} autoFocus onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") onClose(); }} />
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Set target proportions in the Benchmarks step.</div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 }}>CSV Column (optional)</label>
          <select className="sel" value={col} onChange={e => setCol(e.target.value)}>
            <option value="">— Map later —</option>
            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-dark" onClick={handleAdd} style={{ opacity: label.trim() ? 1 : 0.45, cursor: label.trim() ? "pointer" : "not-allowed" }}>Add Dimension</button>
        </div>
      </div>
    </div>
  );
}

// ─── Benchmark Card ───────────────────────────────────────────────────────────
function BenchmarkCard({ dim, di, sum, ok, csvData, setBenchmarkDims, canDelete, onDelete }: {
  dim: BenchmarkDim; di: number; sum: number; ok: boolean;
  csvData: CSVData | null;
  setBenchmarkDims: React.Dispatch<React.SetStateAction<BenchmarkDim[]>>;
  canDelete: boolean; onDelete?: () => void;
}) {
  return (
    <div className="card" style={canDelete ? { border: "1.5px solid #E0D0F8" } : {}}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <input className="inp" value={dim.label} style={{ fontWeight: 600, flex: 1 }}
          onChange={e => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, label: e.target.value } : d))} />
        <span className={`tag ${ok ? "tag-g" : "tag-r"}`}>{sum.toFixed(1)}%</span>
        {canDelete && onDelete && <button className="btn btn-ghost btn-sm" onClick={onDelete} style={{ color: "#C5444A", borderColor: "#F0D0D0", padding: "4px 8px" }}>✕</button>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "#888" }}>Recall-only weighting:</span>
        <div className={`toggle ${dim.isRecall ? "on" : ""}`} onClick={() => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, isRecall: !d.isRecall } : d))} />
      </div>
      {canDelete && csvData && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: "#888", whiteSpace: "nowrap" }}>Source column:</span>
          <select className="sel" style={{ fontSize: 12 }} value={dim.sourceCol || ""}
            onChange={e => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, sourceCol: e.target.value } : d))}>
            <option value="">— Auto-detect —</option>
            {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      )}
      {dim.categories.map((cat, ci) => (
        <div key={ci} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <input className="inp" value={cat.name} style={{ flex: 1, fontSize: 12.5 }}
            onChange={e => setBenchmarkDims(p => p.map((d, di2) => di2 === di ? { ...d, categories: d.categories.map((c, ci2) => ci2 === ci ? { ...c, name: e.target.value } : c) } : d))} />
          <input type="number" className="bench-inp" value={cat.pct} step="0.1" min="0" max="100"
            onChange={e => setBenchmarkDims(p => p.map((d, di2) => di2 === di ? { ...d, categories: d.categories.map((c, ci2) => ci2 === ci ? { ...c, pct: parseFloat(e.target.value) || 0 } : c) } : d))} />
          <span style={{ fontSize: 11, color: "#888" }}>%</span>
          <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px" }}
            onClick={() => setBenchmarkDims(p => p.map((d, di2) => di2 === di ? { ...d, categories: d.categories.filter((_, ci2) => ci2 !== ci) } : d))}>✕</button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }}
        onClick={() => setBenchmarkDims(p => p.map((d, i) => i === di ? { ...d, categories: [...d.categories, { name: "New Category", pct: 0 }] } : d))}>+ Add Category</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function PSIApp() {
  const [step, setStep] = useState(0);
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [fileName, setFileName] = useState("");
  const [colMap, setColMap] = useState<ColMap>({ age: "", gender: "", race: "", education: "", recall: "" });
  const [benchmarkDims, setBenchmarkDims] = useState<BenchmarkDim[]>(DEFAULT_BENCHMARK_DIMS);
  const [lvQuestions, setLvQuestions] = useState<LVQuestion[]>(DEFAULT_LV_QUESTIONS);
  const [lvK, setLvK] = useState(0.62);
  const [questionConfigs, setQuestionConfigs] = useState<QuestionConfig[]>([]);
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireEntry[]>([]);
  const [results, setResults] = useState<Results | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("toplines");
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const questionnaireInputRef = useRef<HTMLInputElement>(null);
  const [showAddDimModal, setShowAddDimModal] = useState(false);

  const customDims = benchmarkDims.filter(d => !CORE_DIM_IDS.includes(d.id));

  const handleAddDimension = useCallback((label: string, sourceCol: string) => {
    const slug = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const id = `custom_${slug}_${Date.now()}`;
    setBenchmarkDims(prev => [...prev, { id, label, internalKey: `_${id}`, recodeMode: "custom", sourceCol: sourceCol || undefined, categories: [{ name: "Category A", pct: 50 }, { name: "Category B", pct: 50 }] }]);
  }, []);

  const handleRemoveCustomDim = useCallback((id: string) => {
    setBenchmarkDims(prev => prev.filter(d => d.id !== id));
  }, []);

  const parseQuestionnaire = useCallback((text: string, csvHeaders: string[]): QuestionnaireEntry[] => {
    const entries: QuestionnaireEntry[] = [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let currentQ: Partial<QuestionnaireEntry> | null = null;
    const qNumPattern = /^[Qq](\d+[a-zA-Z]?)[:\.\s]/;
    const answerPattern = /^[\d]+[\.:\)]\s+(.+)$|^[a-zA-Z][\.:\)]\s+(.+)$/;
    for (const line of lines) {
      if (qNumPattern.test(line)) {
        if (currentQ?.answers?.length) entries.push(currentQ as QuestionnaireEntry);
        const qNum = line.match(qNumPattern)![1].toUpperCase();
        const matchedCol = csvHeaders.find(h => { const hU = h.toUpperCase(); return hU === `Q${qNum}` || hU.startsWith(`Q${qNum}_`) || hU.startsWith(`Q${qNum}[`); }) || "";
        currentQ = { col: matchedCol, questionText: line, answers: [] };
      } else if (currentQ) {
        const m = line.match(answerPattern);
        if (m) currentQ.answers!.push(m[1] || m[2]);
      }
    }
    if (currentQ?.answers?.length) entries.push(currentQ as QuestionnaireEntry);
    return entries;
  }, []);

  const handleQuestionnaireFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target!.result as string;
      const entries = parseQuestionnaire(text, csvData?.headers || []);
      setQuestionnaire(entries);
      if (entries.length > 0) {
        setQuestionConfigs(prev => prev.map(qc => {
          const entry = entries.find(e => e.col === qc.col || (qc.matrixStem && e.col === qc.matrixStem));
          if (entry) return { ...qc, answerOrder: entry.answers };
          return qc;
        }));
        alert(`Questionnaire loaded: ${entries.length} questions parsed.`);
      } else { alert("Could not parse questionnaire."); }
    };
    reader.readAsText(file);
  }, [csvData, parseQuestionnaire]);

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target!.result as string);
      setCsvData(parsed);
      const h = parsed.headers;
      const find = (...terms: string[]) => h.find(c => terms.some(t => c.toLowerCase().includes(t.toLowerCase()))) || "";
      setColMap({ age: find("age"), gender: find("gender","sex"), race: find("race","ethnicity"), education: find("educ"), recall: find("recall","2024vote","Q8") });
      setQuestionConfigs(detectQuestionConfigs(h, parsed.rows));
      setLvQuestions(prev => prev.map(lv => ({ ...lv, col: lv.col || (lv.type === "registration" ? find("registr") : lv.type === "history" ? find("history","voted") : lv.type === "motivation" ? find("motiv","likely") : lv.type === "social" ? find("social","others") : "") })));
      setStep(1);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  }, [handleFile]);

  const recodeDemographics = useCallback((rows: Row[]): Row[] => {
    return rows.map(row => {
      const r: Row = { ...row };
      // Age
      if (colMap.age && row[colMap.age]) {
        const v = row[colMap.age];
        const dim = benchmarkDims.find(d => d.id === "age");
        const exact = dim?.categories.find(c => c.name === v || c.name.toLowerCase() === v.toLowerCase());
        if (exact) r._age = exact.name;
        else if (/18.?29|^18$/.test(v)) r._age = "18-29";
        else if (/30.?44/.test(v)) r._age = "30-44";
        else if (/45.?64/.test(v)) r._age = "45-64";
        else if (/65/.test(v)) r._age = "65+";
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
        else if (/less than|hs|high school|ged|12th/.test(v)) r._edu = "HS or less";
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

  const processData = useCallback(() => {
    if (!csvData) return;
    setProcessing(true);
    setTimeout(() => {
      try {
        const { rows, headers } = csvData;
        const n = rows.length;
        const recoded = recodeDemographics(rows);
        const rakingTargets: RakingTarget[] = [];
        benchmarkDims.forEach(dim => {
          const present = new Set(recoded.map(r => r[dim.internalKey]).filter(Boolean));
          const filtered = dim.categories.filter(c => present.has(c.name));
          if (filtered.length < 2) return;
          const total = filtered.reduce((s, c) => s + c.pct, 0);
          const target: RakingTarget = { variable: dim.internalKey, categories: filtered.map(c => ({ value: c.name, proportion: c.pct / total })) };
          if (dim.isRecall) { target.recallMask = recoded.map(r => filtered.some(f => f.name === (r[dim.internalKey] || ""))); }
          rakingTargets.push(target);
        });
        const { weights, converged, itersUsed, deff, eff } = runRaking(recoded, rakingTargets);
        const lvScores = computeLVScoresCustom(recoded, lvQuestions);
        const { lvWeights, lvProbs, midpoint, k } = computeLVWeights(recoded, weights, lvScores, lvK);
        const includedCols = questionConfigs.filter(q => q.included).map(q => q.col);
        const toplines: Results["toplines"] = {};
        includedCols.forEach(q => {
          const order = questionConfigs.find(c => c.col === q)?.answerOrder;
          toplines[q] = { rv: freqTable(recoded, q, Array.from(weights), order), lv: freqTable(recoded, q, lvWeights, order) };
        });
        const byVars = benchmarkDims.filter(d => !d.isRecall).map(d => ({ col: d.internalKey, label: d.label }));
        const xtabs: Results["xtabs"] = {};
        includedCols.forEach(q => {
          const order = questionConfigs.find(c => c.col === q)?.answerOrder;
          xtabs[q] = byVars.map(({ col, label }) => ({ breakdown: label, ...crosstab(recoded, q, col, lvWeights, order) }));
        });
        const sampleComp: Record<string, FreqItem[]> = {};
        benchmarkDims.forEach(dim => { sampleComp[dim.label] = freqTable(recoded, dim.internalKey, Array.from(weights)); });
        setResults({ n, converged, itersUsed, deff, eff, weights: Array.from(weights), lvWeights, lvProbs, lvScores, midpoint, k, pollCols: includedCols, toplines, xtabs, sampleComp, recoded, headers, rakingTargets: rakingTargets.map(t => t.variable), benchmarkDims, questionConfigs });
        setSelectedQ(includedCols[0] || null);
        setStep(5);
      } catch (err) { alert("Error: " + (err instanceof Error ? err.message : String(err))); }
      setProcessing(false);
    }, 50);
  }, [csvData, colMap, benchmarkDims, lvQuestions, lvK, questionConfigs, recodeDemographics]);

  const exportCrosstabsCSV = useCallback(() => {
    if (!results) return;
    const lines: string[] = [];
    results.pollCols.forEach(q => {
      const qLabel = results.questionConfigs.find(c => c.col === q)?.label || q;
      const xtabsForQ = results.xtabs[q] || [];
      if (!xtabsForQ.length) return;
      lines.push(`"${qLabel} (${q})"`);
      const dimHeaders: string[] = ["Response", "LV Total"];
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

  const exportWeightedCSV = useCallback(() => {
    if (!results) return;
    const rows = results.recoded.map((r, i) => ({ ...r, design_wt: results.weights[i].toFixed(4), lv_wt: results.lvWeights[i].toFixed(4), lv_prob: results.lvProbs[i].toFixed(4), lv_score: String(results.lvScores[i]) }));
    const headers = [...results.headers, "design_wt","lv_wt","lv_prob","lv_score"].filter((h,i,a)=>a.indexOf(h)===i);
    const blob = new Blob([toCSV(headers, rows)], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "weighted_data.csv"; a.click();
  }, [results]);

  const STEPS = ["Upload","Map Columns","Benchmarks","LV Model","Questions","Report"];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#F0EDE6", color: "#1A1A1A" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap');
        *{box-sizing:border-box;} body{margin:0;background:#F0EDE6;}
        ::-webkit-scrollbar{width:6px;height:6px;} ::-webkit-scrollbar-track{background:#E8E4DA;} ::-webkit-scrollbar-thumb{background:#B8B0A0;border-radius:3px;}
        .btn{display:inline-flex;align-items:center;gap:7px;padding:9px 20px;border-radius:6px;border:none;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:500;transition:all 0.18s;white-space:nowrap;}
        .btn-dark{background:#1A1A1A;color:#F0EDE6;} .btn-dark:hover{background:#333;transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,0.18);}
        .btn-outline{background:transparent;color:#1A1A1A;border:1.5px solid #C8C0B0;} .btn-outline:hover{border-color:#1A1A1A;background:rgba(0,0,0,0.04);}
        .btn-red{background:#C5444A;color:white;} .btn-red:hover{background:#A83840;transform:translateY(-1px);}
        .btn-sm{padding:5px 12px;font-size:12px;}
        .btn-ghost{background:transparent;color:#888;border:1px solid #E0D8CC;} .btn-ghost:hover{color:#1A1A1A;border-color:#999;}
        .inp{width:100%;padding:8px 11px;border:1.5px solid #D0C8B8;border-radius:6px;font-family:inherit;font-size:13.5px;background:white;outline:none;transition:border-color 0.2s;} .inp:focus{border-color:#1A1A1A;}
        .sel{width:100%;padding:8px 32px 8px 11px;border:1.5px solid #D0C8B8;border-radius:6px;font-family:inherit;font-size:13.5px;background:white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7'%3E%3Cpath d='M0 0l5.5 7L11 0z' fill='%23888'/%3E%3C/svg%3E") no-repeat right 11px center;outline:none;cursor:pointer;appearance:none;} .sel:focus{border-color:#1A1A1A;}
        .card{background:white;border-radius:10px;padding:22px;border:1px solid #E0D8CC;}
        .tab{padding:7px 16px;border:none;background:transparent;font-family:inherit;font-size:13px;font-weight:500;color:#888;cursor:pointer;border-bottom:2px solid transparent;transition:all 0.18s;white-space:nowrap;}
        .tab.on{color:#1A1A1A;border-bottom-color:#1A1A1A;} .tab:hover:not(.on){color:#444;}
        .q-item{padding:9px 13px;border-radius:6px;cursor:pointer;font-size:12.5px;color:#555;transition:all 0.13s;border:1px solid transparent;line-height:1.4;}
        .q-item:hover{background:#E8E4DA;color:#1A1A1A;} .q-item.on{background:#1A1A1A;color:#F0EDE6;}
        .tag{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;}
        .tag-g{background:#E8F5E9;color:#2E7D32;} .tag-r{background:#FFEBEE;color:#C62828;} .tag-b{background:#E3F2FD;color:#1565C0;} .tag-y{background:#FFF8E1;color:#F57F17;} .tag-p{background:#F3E5F5;color:#6A1B9A;}
        .bench-inp{width:72px;padding:5px 7px;border:1.5px solid #D0C8B8;border-radius:5px;font-family:inherit;font-size:13px;text-align:right;outline:none;} .bench-inp:focus{border-color:#1A1A1A;}
        .toggle{width:38px;height:20px;background:#D0C8B8;border-radius:10px;cursor:pointer;transition:background 0.2s;position:relative;flex-shrink:0;}
        .toggle.on{background:#1A1A1A;} .toggle::after{content:'';position:absolute;width:16px;height:16px;background:white;border-radius:50%;top:2px;left:2px;transition:left 0.2s;} .toggle.on::after{left:20px;}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @media print{.no-print{display:none!important;}body{background:white;}.card{border:1px solid #ccc!important;}.topline-print-card{page-break-inside:avoid;margin-bottom:24px;}}
        .xtab-table{width:100%;font-size:12px;border-collapse:collapse;}
        .xtab-table th{background:#F0EDE6;padding:7px 10px;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666;border-bottom:2px solid #D8D0C4;white-space:nowrap;}
        .xtab-table th.total-col{background:#1A1A1A;color:white;}
        .xtab-table td{padding:6px 10px;border-bottom:1px solid #F0EDE6;white-space:nowrap;}
        .xtab-table tr:last-child td{border-bottom:none;}
        .xtab-table tr:hover td{background:#FAFAF8;}
        .xtab-table .resp-col{color:#333;font-weight:500;min-width:140px;}
        .xtab-table .total-val{font-weight:700;background:#FFFBF0;}
        .xtab-table .group-val{color:#444;text-align:right;}
        .lv-score-ring{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;}
      `}</style>

      {/* HEADER */}
      <header style={{ background: "#1A1A1A", color: "#F0EDE6", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 34, height: 34, background: "#C5444A", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="3" x2="12" y2="16"/></svg>
          </div>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17 }}>Public Sentiment Institute</div>
            <div style={{ fontSize: 10, color: "#666", letterSpacing: 1, textTransform: "uppercase" }}>Poll Weighting &amp; Analysis Suite</div>
          </div>
        </div>
        {step >= 1 && (
          <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div onClick={() => { if (i <= step) setStep(i); }}
                  style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0, cursor: i <= step ? "pointer" : "default", background: step > i ? "#C5444A" : step === i ? "#F0EDE6" : "#2A2A2A", color: step === i ? "#1A1A1A" : step > i ? "white" : "#555", transition: "all 0.2s" }}>
                  {step > i ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 11, color: step === i ? "#F0EDE6" : "#555" }}>{s}</span>
                {i < STEPS.length - 1 && <div style={{ width: 16, height: 1.5, background: step > i ? "#C5444A" : "#2A2A2A", borderRadius: 1 }} />}
              </div>
            ))}
          </div>
        )}
      </header>

      {showAddDimModal && csvData && (
        <AddDimensionModal csvHeaders={csvData.headers} onAdd={handleAddDimension} onClose={() => setShowAddDimModal(false)} />
      )}

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "36px 24px" }}>

        {/* STEP 0: UPLOAD */}
        {step === 0 && (
          <div style={{ maxWidth: 580, margin: "72px auto", textAlign: "center" }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, lineHeight: 1.15, marginBottom: 14 }}>Upload Your<br /><em style={{ color: "#C5444A" }}>Survey Data</em></div>
            <p style={{ color: "#666", marginBottom: 36, fontSize: 15, lineHeight: 1.6 }}>Import a CSV to begin demographic weighting,<br />apply custom benchmarks, and generate reports.</p>
            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
              style={{ border: "2px dashed #C0B8A8", borderRadius: 12, padding: "56px 40px", cursor: "pointer", background: "white", transition: "all 0.2s" }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "#1A1A1A"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "#C0B8A8"}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#C0B8A8" strokeWidth="1.5" style={{ marginBottom: 14 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 6 }}>Drop CSV here or click to browse</div>
              <div style={{ color: "#888", fontSize: 13 }}>Standard survey export format</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            <div style={{ marginTop: 28, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              {["IPF/RIM Raking","Custom Benchmarks","Logistic LV Model","Rasmussen Crosstabs","Matrix & Multi-Select"].map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#666" }}><span style={{ color: "#C5444A", fontWeight: 700 }}>✓</span>{f}</div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1: COLUMN MAPPING */}
        {step === 1 && csvData && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, marginBottom: 6 }}>Map Demographic Columns</div>
              <p style={{ color: "#666", fontSize: 14 }}><strong>{fileName}</strong> · {csvData.rows.length.toLocaleString()} respondents · {csvData.headers.length} columns</p>
            </div>
            <div className="card" style={{ maxWidth: 680 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "#999", marginBottom: 14 }}>Core Demographic Variables</div>
              {(["age","gender","race","education","recall"] as const).map((key) => {
                const dim = benchmarkDims.find(d => d.id === key);
                const labelMap: Record<string,string> = { age:"Age", gender:"Gender / Sex", race:"Race / Ethnicity", education:"Education", recall:"2024 Recall Vote" };
                return (
                  <div key={key} style={{ display: "grid", gridTemplateColumns: "200px 1fr", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <label style={{ fontSize: 13.5, fontWeight: 500 }}>{dim?.label || labelMap[key]}</label>
                    <select className="sel" value={colMap[key] || ""} onChange={e => setColMap(p => ({ ...p, [key]: e.target.value }))}>
                      <option value="">— Not mapped —</option>
                      {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                );
              })}

              {/* Additional custom dims */}
              {customDims.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "#999", marginTop: 22, marginBottom: 14, paddingTop: 16, borderTop: "1px solid #F0EDE6" }}>Additional Weighting Dimensions</div>
                  {customDims.map((dim) => (
                    <div key={dim.id} style={{ display: "grid", gridTemplateColumns: "200px 1fr auto", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 500, color: "#444" }}>{dim.label}</label>
                      <select className="sel" value={dim.sourceCol || ""}
                        onChange={e => setBenchmarkDims(prev => prev.map(d => d.id === dim.id ? { ...d, sourceCol: e.target.value } : d))}>
                        <option value="">— Not mapped —</option>
                        {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveCustomDim(dim.id)} style={{ padding: "5px 10px", color: "#C5444A", borderColor: "#F0D0D0" }}>✕</button>
                    </div>
                  ))}
                </>
              )}

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #F0EDE6" }}>
                <button className="btn btn-outline btn-sm" onClick={() => setShowAddDimModal(true)}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Weighting Dimension
                </button>
                <div style={{ fontSize: 11, color: "#999", marginTop: 6 }}>Add region, party ID, income, or any custom variable to rake against.</div>
              </div>
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setStep(0)}>← Back</button>
              <button className="btn btn-dark" onClick={() => setStep(2)}>Set Benchmarks →</button>
            </div>
          </div>
        )}

        {/* STEP 2: BENCHMARKS */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, marginBottom: 6 }}>Weighting Benchmarks</div>
              <p style={{ color: "#666", fontSize: 14 }}>Set target proportions. Each dimension must sum to 100%. <strong>Race recoding adapts automatically.</strong></p>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "#999", marginBottom: 14 }}>Core Dimensions</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 18, marginBottom: 28 }}>
              {benchmarkDims.filter(d => CORE_DIM_IDS.includes(d.id)).map((dim) => {
                const di = benchmarkDims.indexOf(dim);
                const sum = dim.categories.reduce((s, c) => s + (parseFloat(String(c.pct)) || 0), 0);
                return <BenchmarkCard key={dim.id} dim={dim} di={di} sum={sum} ok={Math.abs(sum-100)<0.5} csvData={csvData} setBenchmarkDims={setBenchmarkDims} canDelete={false} />;
              })}
            </div>
            {customDims.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "#999", marginBottom: 14 }}>Additional Dimensions</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 18, marginBottom: 24 }}>
                  {customDims.map((dim) => {
                    const di = benchmarkDims.indexOf(dim);
                    const sum = dim.categories.reduce((s, c) => s + (parseFloat(String(c.pct)) || 0), 0);
                    return <BenchmarkCard key={dim.id} dim={dim} di={di} sum={sum} ok={Math.abs(sum-100)<0.5} csvData={csvData} setBenchmarkDims={setBenchmarkDims} canDelete={true} onDelete={() => handleRemoveCustomDim(dim.id)} />;
                  })}
                </div>
              </>
            )}
            <div className="card" style={{ display: "inline-flex", alignItems: "center", gap: 14, border: "2px dashed #D0C8B8", background: "transparent", padding: "18px 24px", cursor: "pointer", marginBottom: 8 }} onClick={() => setShowAddDimModal(true)}>
              <div style={{ width: 32, height: 32, background: "#F0EDE6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#888" }}>+</div>
              <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>Add Dimension</div><div style={{ fontSize: 11.5, color: "#888" }}>Region, Party ID, Income, etc.</div></div>
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setBenchmarkDims(DEFAULT_BENCHMARK_DIMS)}>Reset Defaults</button>
              <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-dark" onClick={() => setStep(3)}>LV Model →</button>
            </div>
          </div>
        )}

        {/* STEP 3: LV MODEL */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, marginBottom: 6 }}>Likely Voter Model</div>
              <p style={{ color: "#666", fontSize: 14 }}>Configure the logistic LV propensity model.</p>
            </div>
            <div className="card" style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Steepness (k)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="range" min="0.1" max="2" step="0.01" value={lvK} onChange={e => setLvK(parseFloat(e.target.value))} style={{ width: 140 }} />
                    <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600 }}>{lvK.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>Higher = sharper LV cutoff. Default: 0.62</div>
                </div>
                <div style={{ flex: 1, background: "#F8F6F2", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#555" }}>
                  Total score range: <strong>0–{lvQuestions.reduce((s, q) => s + q.maxPoints, 0)}</strong> pts. The logistic curve converts each score to a LV probability using the weighted median as midpoint.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {lvQuestions.map((lv, li) => (
                <div key={lv.id} className="card">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div className="lv-score-ring" style={{ background: "#1A1A1A", color: "white" }}>{lv.maxPoints}pt</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                        <input className="inp" value={lv.label} style={{ fontWeight: 600, width: 240 }} onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, label: e.target.value } : q))} />
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, color: "#888" }}>Max pts:</span>
                          <input type="number" className="bench-inp" value={lv.maxPoints} min="0" max="20" onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, maxPoints: parseInt(e.target.value) || 0 } : q))} />
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => setLvQuestions(p => p.filter((_, i) => i !== li))}>Remove</button>
                      </div>
                      {csvData && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 12, color: "#888", whiteSpace: "nowrap" }}>Survey column:</span>
                          <select className="sel" value={lv.col} style={{ maxWidth: 280 }} onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, col: e.target.value } : q))}>
                            <option value="">— Use default max score —</option>
                            {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Scoring patterns:</div>
                      {lv.scoring.map((sc, si) => (
                        <div key={si} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                          <input className="inp" value={sc.pattern} placeholder="Pattern (regex)" style={{ flex: 1, fontFamily: "monospace", fontSize: 12 }} onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, scoring: q.scoring.map((s, j) => j === si ? { ...s, pattern: e.target.value } : s) } : q))} />
                          <span style={{ fontSize: 12, color: "#888" }}>→</span>
                          <input type="number" className="bench-inp" value={sc.points} min="0" max={lv.maxPoints} onChange={e => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, scoring: q.scoring.map((s, j) => j === si ? { ...s, points: parseInt(e.target.value) || 0 } : s) } : q))} />
                          <span style={{ fontSize: 11, color: "#888" }}>pts</span>
                          <button className="btn btn-ghost btn-sm" style={{ padding: "3px 8px" }} onClick={() => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, scoring: q.scoring.filter((_, j) => j !== si) } : q))}>✕</button>
                        </div>
                      ))}
                      <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => setLvQuestions(p => p.map((q, i) => i === li ? { ...q, scoring: [...q.scoring, { pattern: "", points: 1 }] } : q))}>+ Add Pattern</button>
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn btn-outline" style={{ alignSelf: "flex-start" }} onClick={() => setLvQuestions(p => [...p, { id: `custom_${Date.now()}`, label: "New LV Question", col: "", type: "custom", maxPoints: 3, scoring: [{ pattern: "", points: 3 }] }])}>+ Add LV Question</button>
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-dark" onClick={() => setStep(4)}>Select Questions →</button>
            </div>
          </div>
        )}

        {/* STEP 4: QUESTIONS */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, marginBottom: 6 }}>Question Configuration</div>
              <p style={{ color: "#666", fontSize: 14 }}>Select questions to include. Upload a questionnaire file to order answer choices.</p>
            </div>
            <div className="card" style={{ marginBottom: 20, background: "#FFFBF0", border: "1.5px solid #F0D080" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 3 }}>📄 Upload Questionnaire (Optional)</div>
                  <div style={{ fontSize: 12, color: "#777" }}>Questions labeled Q1:, Q2:, etc. with numbered answer choices.</div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                  <button className="btn btn-outline" onClick={() => questionnaireInputRef.current?.click()}>⬆ Upload</button>
                  {questionnaire.length > 0 && <span className="tag tag-g">{questionnaire.length} questions</span>}
                </div>
              </div>
              <input ref={questionnaireInputRef} type="file" accept=".txt" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleQuestionnaireFile(e.target.files[0]); }} />
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setQuestionConfigs(p => p.map(q => ({ ...q, included: true })))}>Select All</button>
              <button className="btn btn-outline btn-sm" onClick={() => setQuestionConfigs(p => p.map(q => ({ ...q, included: false })))}>Deselect All</button>
              <span style={{ fontSize: 12, color: "#888", alignSelf: "center" }}>{questionConfigs.filter(q => q.included).length} of {questionConfigs.length} selected</span>
            </div>
            {(() => {
              const stems = new Set(questionConfigs.filter(q => q.matrixStem).map(q => q.matrixStem!));
              const singles = questionConfigs.filter(q => !q.matrixStem);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {Array.from(stems).map(stem => {
                    const items = questionConfigs.filter(q => q.matrixStem === stem);
                    const allOn = items.every(q => q.included);
                    return (
                      <div key={stem} className="card" style={{ border: "1.5px solid #D4C8F8", background: "#FDFCFF" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <span className="tag tag-p">Matrix</span>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{stem}</span>
                          <div className={`toggle ${allOn ? "on" : ""}`} onClick={() => setQuestionConfigs(p => p.map(q => q.matrixStem === stem ? { ...q, included: !allOn } : q))} />
                          <span style={{ fontSize: 12, color: "#888" }}>Toggle all</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {items.map(q => {
                            const idx = questionConfigs.findIndex(c => c.col === q.col);
                            return (
                              <div key={q.col} style={{ display: "flex", alignItems: "center", gap: 6, background: q.included ? "#F0EDE6" : "#F8F8F8", borderRadius: 6, padding: "5px 10px", border: "1px solid #E0D8CC" }}>
                                <div className={`toggle ${q.included ? "on" : ""}`} style={{ width: 28, height: 15 }} onClick={() => setQuestionConfigs(p => p.map((c, i) => i === idx ? { ...c, included: !c.included } : c))} />
                                <input className="inp" value={q.label} style={{ width: 160, fontSize: 12 }} onChange={e => setQuestionConfigs(p => p.map((c, i) => i === idx ? { ...c, label: e.target.value } : c))} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {singles.map(q => {
                      const idx = questionConfigs.findIndex(c => c.col === q.col);
                      return (
                        <div key={q.col} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "white", borderRadius: 8, border: "1px solid #E0D8CC" }}>
                          <div className={`toggle ${q.included ? "on" : ""}`} onClick={() => setQuestionConfigs(p => p.map((c, i) => i === idx ? { ...c, included: !c.included } : c))} />
                          <input className="inp" value={q.label} style={{ flex: 1, maxWidth: 400, fontSize: 13 }} onChange={e => setQuestionConfigs(p => p.map((c, i) => i === idx ? { ...c, label: e.target.value } : c))} />
                          <select className="sel" value={q.type} style={{ width: 140 }} onChange={e => setQuestionConfigs(p => p.map((c, i) => i === idx ? { ...c, type: e.target.value as QuestionConfig["type"] } : c))}>
                            <option value="single">Single Select</option>
                            <option value="multiselect">Multi-Select</option>
                            <option value="matrix">Matrix</option>
                          </select>
                          <span className={`tag ${q.type === "single" ? "tag-b" : q.type === "matrix" ? "tag-p" : "tag-y"}`}>{q.type}</span>
                          <span style={{ fontSize: 11, color: "#888", whiteSpace: "nowrap" }}>{q.col}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setStep(3)}>← Back</button>
              <button className="btn btn-red" onClick={() => { setStep(5); processData(); }}>⚙ Run Analysis →</button>
            </div>
          </div>
        )}

        {/* PROCESSING */}
        {processing && (
          <div style={{ textAlign: "center", padding: "120px 40px" }}>
            <div style={{ width: 56, height: 56, margin: "0 auto 24px", border: "3px solid #E0D8CC", borderTop: "3px solid #C5444A", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, marginBottom: 10 }}>Processing Survey Data</div>
            <p style={{ color: "#666" }}>Running IPF raking, fitting LV model, building crosstabs…</p>
          </div>
        )}

        {/* STEP 5: REPORT */}
        {step === 5 && results && !processing && (
          <ReportView results={results} activeTab={activeTab} setActiveTab={setActiveTab} selectedQ={selectedQ} setSelectedQ={setSelectedQ} exportWeightedCSV={exportWeightedCSV} exportCrosstabsCSV={exportCrosstabsCSV} onBack={() => setStep(4)} />
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function ReportView({ results, activeTab, setActiveTab, selectedQ, setSelectedQ, exportWeightedCSV, exportCrosstabsCSV, onBack }: {
  results: Results; activeTab: string; setActiveTab: (t: string) => void;
  selectedQ: string | null; setSelectedQ: (q: string | null) => void;
  exportWeightedCSV: () => void; exportCrosstabsCSV: () => void; onBack: () => void;
}) {
  const sidebarItems: { id: string; label: string; isMatrix?: boolean; stem?: string }[] = [];
  const addedStems = new Set<string>();
  results.questionConfigs.filter(q => q.included && results.pollCols.includes(q.col)).forEach(q => {
    if (q.matrixStem) {
      if (!addedStems.has(q.matrixStem)) { addedStems.add(q.matrixStem); sidebarItems.push({ id: `matrix_${q.matrixStem}`, label: q.matrixStem, isMatrix: true, stem: q.matrixStem }); }
    } else { sidebarItems.push({ id: q.col, label: results.questionConfigs.find(c => c.col === q.col)?.label || q.col }); }
  });
  const getLabel = (col: string) => results.questionConfigs.find(q => q.col === col)?.label || col;
  const getAnswerOrder = (col: string) => results.questionConfigs.find(q => q.col === col)?.answerOrder;
  const selectedItemId = selectedQ ? (results.questionConfigs.find(q => q.col === selectedQ)?.matrixStem ? `matrix_${results.questionConfigs.find(q => q.col === selectedQ)!.matrixStem}` : selectedQ) : null;

  return (
    <div>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, marginBottom: 4 }}>Survey Analysis Report</div>
          <div style={{ fontSize: 13, color: "#666", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span>N={results.n.toLocaleString()}</span><span>·</span>
            <span>{results.pollCols.length} questions</span><span>·</span>
            <span>DEFF={results.deff.toFixed(2)}</span><span>·</span>
            <span>Eff={results.eff.toFixed(1)}%</span>
            <span className={`tag ${results.converged ? "tag-g" : "tag-y"}`}>{results.converged ? `Converged (${results.itersUsed} iter)` : `DNC (${results.itersUsed} iter)`}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-outline" onClick={onBack}>← Back</button>
          <button className="btn btn-outline" onClick={exportWeightedCSV}>⬇ Weighted CSV</button>
          <button className="btn btn-outline" onClick={exportCrosstabsCSV}>⬇ Crosstabs CSV</button>
          <button className="btn btn-red" onClick={() => window.print()}>🖨 Print / PDF</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {[
          { label: "Total Respondents", value: results.n.toLocaleString(), sub: "Unweighted N" },
          { label: "Design Effect", value: results.deff.toFixed(3), sub: `Eff: ${results.eff.toFixed(1)}%` },
          { label: "Effective LV N", value: Math.round(results.lvProbs.reduce((s,v)=>s+v,0)).toLocaleString(), sub: `Mean LV: ${(results.lvProbs.reduce((s,v)=>s+v,0)/results.n*100).toFixed(1)}%` },
          { label: "Raking Method", value: "IPF/RIM", sub: results.converged ? `${results.itersUsed} iterations` : `DNC (${results.itersUsed})` },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11.5, color: "#888", marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: "#999", marginTop: 3 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="no-print" style={{ borderBottom: "2px solid #E0D8CC", marginBottom: 20, display: "flex", gap: 0, overflowX: "auto" }}>
        {["toplines","crosstabs","sample","methodology"].map(t => (
          <button key={t} className={`tab ${activeTab===t?"on":""}`} onClick={() => setActiveTab(t)}>
            {{ toplines:"Toplines", crosstabs:"Crosstabs", sample:"Sample Composition", methodology:"Methodology" }[t]}
          </button>
        ))}
      </div>

      {activeTab === "toplines" && (
        <>
          <div className="no-print" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 18 }}>
            <div style={{ background: "white", borderRadius: 10, border: "1px solid #E0D8CC", padding: 10, maxHeight: 640, overflowY: "auto" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#888", padding: "4px 10px 8px" }}>Questions</div>
              {sidebarItems.map(item => (
                <div key={item.id} className={`q-item ${selectedItemId===item.id?"on":""}`}
                  onClick={() => { if (item.isMatrix && item.stem) { const fc = results.questionConfigs.find(q => q.matrixStem === item.stem && results.pollCols.includes(q.col))?.col; if (fc) setSelectedQ(fc); } else setSelectedQ(item.id); }}>
                  {item.isMatrix && <span style={{ fontSize: 9, fontWeight: 700, color: "#6A1B9A", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 1 }}>Matrix</span>}
                  {item.label.length > 42 ? item.label.slice(0,42)+"…" : item.label}
                </div>
              ))}
            </div>
            <div>
              {selectedQ && (() => {
                const qConfig = results.questionConfigs.find(q => q.col === selectedQ);
                const isMatrix = !!qConfig?.matrixStem;
                const matrixCols = isMatrix ? results.questionConfigs.filter(q => q.matrixStem === qConfig!.matrixStem && results.pollCols.includes(q.col)).map(q => q.col) : null;
                if (isMatrix && matrixCols) return (
                  <div className="card">
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#888", marginBottom: 4 }}>Matrix Question</div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{qConfig!.matrixStem}</div>
                    {matrixCols.map(col => { const tl = results.toplines[col]; if (!tl) return null; const sub = results.questionConfigs.find(q => q.col === col)?.matrixItem || col; return (<div key={col} style={{ marginBottom: 24 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 10, paddingLeft: 4, borderLeft: "3px solid #C5444A" }}>{sub}</div><ToplineBarChart tl={tl} /></div>); })}
                  </div>
                );
                const tl = results.toplines[selectedQ]; if (!tl) return null;
                return (
                  <div className="card">
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#888", marginBottom: 2 }}>{selectedQ}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{getLabel(selectedQ)}</div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 18 }}><span className="tag tag-b">RV</span><span className="tag tag-y">LV</span></div>
                    <ToplineBarChart tl={tl} />
                  </div>
                );
              })()}
            </div>
          </div>
          <div style={{ display: "none" }} className="print-all-toplines">
            <style>{`@media print { .print-all-toplines { display: block !important; } }`}</style>
            <div style={{ fontFamily: "'DM Sans', sans-serif", marginBottom: 24 }}>
              <strong style={{ fontSize: 20 }}>Topline Results</strong>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>N={results.n} · DEFF={results.deff.toFixed(2)}</div>
            </div>
            {sidebarItems.map(item => {
              if (item.isMatrix && item.stem) {
                const mc = results.questionConfigs.filter(q => q.matrixStem === item.stem && results.pollCols.includes(q.col)).map(q => q.col);
                return (<div key={item.id} className="topline-print-card" style={{ marginBottom: 32, borderBottom: "2px solid #E0D8CC", paddingBottom: 24 }}><div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>{item.stem}</div>{mc.map(col => { const tl = results.toplines[col]; if (!tl) return null; return (<div key={col} style={{ marginBottom: 20 }}><div style={{ fontSize: 12.5, fontWeight: 600, color: "#333", marginBottom: 8, paddingLeft: 8, borderLeft: "3px solid #C5444A" }}>{results.questionConfigs.find(q => q.col === col)?.matrixItem || col}</div><PrintToplineTable tl={tl} /></div>); })}</div>);
              }
              const tl = results.toplines[item.id]; if (!tl) return null;
              return (<div key={item.id} className="topline-print-card" style={{ marginBottom: 28, borderBottom: "1px solid #E8E4DA", paddingBottom: 20 }}><div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{item.id}</div><div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>{item.label}</div><PrintToplineTable tl={tl} /></div>);
            })}
          </div>
        </>
      )}

      {activeTab === "crosstabs" && (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 18 }}>
          <div className="no-print" style={{ background: "white", borderRadius: 10, border: "1px solid #E0D8CC", padding: 10, maxHeight: 640, overflowY: "auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#888", padding: "4px 10px 8px" }}>Questions</div>
            {sidebarItems.map(item => (
              <div key={item.id} className={`q-item ${selectedItemId===item.id?"on":""}`}
                onClick={() => { if (item.isMatrix && item.stem) { const fc = results.questionConfigs.find(q => q.matrixStem === item.stem && results.pollCols.includes(q.col))?.col; if (fc) setSelectedQ(fc); } else setSelectedQ(item.id); }}>
                {item.label.length > 42 ? item.label.slice(0,42)+"…" : item.label}
              </div>
            ))}
          </div>
          <div>
            {selectedQ && (() => {
              const qConfig = results.questionConfigs.find(q => q.col === selectedQ);
              const isMatrix = !!qConfig?.matrixStem;
              const matrixCols = isMatrix ? results.questionConfigs.filter(q => q.matrixStem === qConfig!.matrixStem && results.pollCols.includes(q.col)).map(q => q.col) : [selectedQ];
              return (<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>{matrixCols.map(col => { const xtabsForQ = results.xtabs[col] || []; const subLabel = isMatrix ? (results.questionConfigs.find(q => q.col === col)?.matrixItem || col) : getLabel(col); return (<div key={col} className="card">{isMatrix && <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, paddingLeft: 6, borderLeft: "3px solid #C5444A" }}>{subLabel}</div>}{!isMatrix && <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{subLabel}</div>}<RasmussenCrosstab xtabs={xtabsForQ} answerOrder={getAnswerOrder(col)} /></div>); })}</div>);
            })()}
          </div>
        </div>
      )}

      {activeTab === "sample" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 18 }}>
          {Object.entries(results.sampleComp).map(([dim, data]) => (
            <div key={dim} className="card">
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#888", marginBottom: 14 }}>{dim}</div>
              {data.map(item => (
                <div key={item.response} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 13 }}>{item.response}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{(item.pct*100).toFixed(1)}%</span></div>
                  <div style={{ height: 6, background: "#F0EDE6", borderRadius: 3 }}><div style={{ width: `${Math.min(100,item.pct*100)}%`, height: "100%", background: "#1A1A1A", borderRadius: 3 }} /></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {activeTab === "methodology" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: 16 }}>Raking Diagnostics</div>
            {([["Method","Iterative Proportional Fitting (RIM/IPF)"],["Convergence",results.converged?`Yes — ${results.itersUsed} iterations`:`No (${results.itersUsed} max)`],["Design Effect (DEFF)",results.deff.toFixed(3)],["Weighting Efficiency",`${results.eff.toFixed(1)}%`],["Weight Floor / Cap","0.2 / 5.0"],["Active Raking Variables",results.rakingTargets.join(", ")]] as [string,string][]).map(([k,v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F0EDE6", fontSize: 13 }}><span style={{ color: "#666" }}>{k}</span><span style={{ fontWeight: 500 }}>{v}</span></div>
            ))}
          </div>
          <div className="card">
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: 16 }}>Likely Voter Model</div>
            {([["Model Type","Logistic curve on propensity score"],["Score Range",`0 – ${results.lvScores.length?Math.max(...results.lvScores):"—"}`],["Midpoint (Weighted Median)",results.midpoint.toFixed(3)],["Fitted Steepness (k)",results.k.toFixed(4)],["Mean LV Probability",`${(results.lvProbs.reduce((s,v)=>s+v,0)/results.n*100).toFixed(1)}%`],["Effective LV N",Math.round(results.lvProbs.reduce((s,v)=>s+v,0)).toLocaleString()]] as [string,string][]).map(([k,v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F0EDE6", fontSize: 13 }}><span style={{ color: "#666" }}>{k}</span><span style={{ fontWeight: 500 }}>{v}</span></div>
            ))}
          </div>
          <div className="card" style={{ gridColumn: "1/-1" }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: 14 }}>LV Score Distribution</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Array.from(new Set(results.lvScores)).sort((a,b)=>a-b).map(sc => {
                const tw = results.weights.reduce((s,v)=>s+v,0);
                const cw = results.lvScores.reduce((s,score,i)=>s+(score===sc?results.weights[i]:0),0);
                const prob = logistic(sc, results.midpoint, results.k);
                return (<div key={sc} style={{ background: "#F8F6F2", borderRadius: 8, padding: "8px 12px", textAlign: "center", minWidth: 72, border: "1px solid #E8E4DA" }}><div style={{ fontSize: 10, color: "#888" }}>Score {sc}</div><div style={{ fontWeight: 700, fontSize: 14 }}>{(cw/tw*100).toFixed(1)}%</div><div style={{ fontSize: 10, color: "#C5444A" }}>LV={((prob)*100).toFixed(0)}%</div></div>);
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToplineBarChart({ tl }: { tl: { rv: FreqItem[]; lv: FreqItem[] } }) {
  const maxPct = Math.max(...tl.rv.map(i => i.pct * 100), 1);
  return (
    <div>
      {tl.rv.map(item => {
        const lvItem = tl.lv.find(l => l.response === item.response);
        const rvPct = item.pct * 100, lvPct = lvItem ? lvItem.pct * 100 : 0;
        return (
          <div key={item.response} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: "#333", flex: 1, paddingRight: 16 }}>{item.response}</span>
              <div style={{ display: "flex", gap: 10 }}>
                <span className="tag tag-b" style={{ minWidth: 52, textAlign: "center" }}>{rvPct.toFixed(1)}%</span>
                <span className="tag tag-y" style={{ minWidth: 52, textAlign: "center" }}>{lvPct.toFixed(1)}%</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: "#888", width: 18 }}>RV</span>
              <div style={{ flex: 1, height: 9, background: "#F0EDE6", borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${Math.min(100,(rvPct/maxPct)*100)}%`, height: "100%", background: "#1565C0", borderRadius: 4, opacity: 0.75 }} /></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "#888", width: 18 }}>LV</span>
              <div style={{ flex: 1, height: 9, background: "#F0EDE6", borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${Math.min(100,(lvPct/maxPct)*100)}%`, height: "100%", background: "#F57F17", borderRadius: 4, opacity: 0.85 }} /></div>
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: "2px solid #E8E4DA" }}><th style={{ textAlign: "left", padding: "5px 8px", fontWeight: 500, color: "#888", fontSize: 11 }}>Response</th><th style={{ textAlign: "right", padding: "5px 8px", fontWeight: 500, color: "#1565C0", fontSize: 11 }}>RV %</th><th style={{ textAlign: "right", padding: "5px 8px", fontWeight: 500, color: "#F57F17", fontSize: 11 }}>LV %</th><th style={{ textAlign: "right", padding: "5px 8px", fontWeight: 500, color: "#888", fontSize: 11 }}>Wtd N</th></tr></thead>
          <tbody>{tl.rv.map(item => { const lv = tl.lv.find(l => l.response === item.response); return (<tr key={item.response} style={{ borderBottom: "1px solid #F4F2EE" }}><td style={{ padding: "5px 8px", color: "#333" }}>{item.response}</td><td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600, color: "#1565C0" }}>{(item.pct*100).toFixed(1)}%</td><td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600, color: "#C5444A" }}>{lv?(lv.pct*100).toFixed(1)+"%":"—"}</td><td style={{ padding: "5px 8px", textAlign: "right", color: "#888" }}>{item.n.toFixed(0)}</td></tr>); })}</tbody>
        </table>
      </div>
    </div>
  );
}

function PrintToplineTable({ tl }: { tl: { rv: FreqItem[]; lv: FreqItem[] } }) {
  return (
    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", border: "1px solid #E0D8CC" }}>
      <thead><tr style={{ background: "#F0EDE6" }}><th style={{ textAlign: "left", padding: "5px 10px", fontWeight: 600, fontSize: 11, color: "#555", border: "1px solid #E0D8CC" }}>Response</th><th style={{ textAlign: "right", padding: "5px 10px", fontWeight: 600, fontSize: 11, color: "#1565C0", border: "1px solid #E0D8CC" }}>RV %</th><th style={{ textAlign: "right", padding: "5px 10px", fontWeight: 600, fontSize: 11, color: "#C5444A", border: "1px solid #E0D8CC" }}>LV %</th><th style={{ textAlign: "right", padding: "5px 10px", fontWeight: 600, fontSize: 11, color: "#888", border: "1px solid #E0D8CC" }}>Wtd N</th></tr></thead>
      <tbody>{tl.rv.map((item, ri) => { const lv = tl.lv.find(l => l.response === item.response); return (<tr key={item.response} style={{ background: ri%2===0?"white":"#FAFAF8" }}><td style={{ padding: "5px 10px", border: "1px solid #E0D8CC" }}>{item.response}</td><td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600, color: "#1565C0", border: "1px solid #E0D8CC" }}>{(item.pct*100).toFixed(1)}%</td><td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600, color: "#C5444A", border: "1px solid #E0D8CC" }}>{lv?(lv.pct*100).toFixed(1)+"%":"—"}</td><td style={{ padding: "5px 10px", textAlign: "right", color: "#888", border: "1px solid #E0D8CC" }}>{item.n.toFixed(0)}</td></tr>); })}</tbody>
    </table>
  );
}

function RasmussenCrosstab({ xtabs, answerOrder }: { xtabs: XtabEntry[]; answerOrder?: string[] }) {
  if (!xtabs.length) return <div style={{ color: "#888", fontSize: 13 }}>No crosstab data available.</div>;
  const allResponses = xtabs[0].qList;
  const dimColors: Record<string, string> = { "Gender": "#E3F2FD", "Age": "#E8F5E9", "Race / Ethnicity": "#FFF3E0", "Education": "#F3E5F5" };
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="xtab-table" style={{ minWidth: 700 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", minWidth: 160, borderBottom: "2px solid #D8D0C4", background: "#F0EDE6" }} rowSpan={2}>Response</th>
            <th className="total-col" style={{ textAlign: "right", borderBottom: "2px solid #D8D0C4" }} rowSpan={2}>LV Total</th>
            {xtabs.map(xt => (<th key={xt.breakdown} colSpan={xt.byGroups.length} style={{ textAlign: "center", background: dimColors[xt.breakdown] || "#F8F6F2", borderBottom: "1px solid #D8D0C4", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "#555", borderLeft: "2px solid #D8D0C4" }}>{xt.breakdown}</th>))}
          </tr>
          <tr>
            {xtabs.map(xt => xt.byGroups.map((g, gi) => (<th key={`${xt.breakdown}_${g}`} style={{ textAlign: "right", background: dimColors[xt.breakdown] || "#F8F6F2", borderBottom: "2px solid #D8D0C4", fontSize: 11, fontWeight: 500, color: "#555", borderLeft: gi===0?"2px solid #D8D0C4":"none", whiteSpace: "nowrap" }}>{g}</th>)))}
          </tr>
        </thead>
        <tbody>
          {allResponses.map((resp, ri) => (
            <tr key={resp} style={{ background: ri%2===0?"white":"#FAFAF8" }}>
              <td className="resp-col">{resp}</td>
              <td className="total-val" style={{ textAlign: "right", fontWeight: 700, borderRight: "2px solid #E0D8CC" }}>{xtabs[0].result[resp]?.Total ?? "—"}%</td>
              {xtabs.map(xt => xt.byGroups.map((g, gi) => (<td key={`${xt.breakdown}_${g}`} className="group-val" style={{ borderLeft: gi===0?"2px solid #E0D8CC":"none" }}>{xt.result[resp]?.[g] ?? "—"}%</td>)))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}