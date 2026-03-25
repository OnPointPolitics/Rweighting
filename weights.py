#!/usr/bin/env python3
"""
=============================================================================
POLL WEIGHTING & LIKELY VOTER MODEL
Logistic Curve LV Screen | RIM Weighting | Toplines & Crosstabs
=============================================================================
USAGE:
    python poll_weighting.py input.csv output.txt

REQUIRED PACKAGES:
    pip install pandas numpy scipy

LIKELY VOTER MODEL — HOW IT WORKS:
  1. Each respondent scores 0–16 on propensity items (registration,
     vote history, motivation, social norm).
  2. A logistic curve is FIT to the empirical CDF of those scores so
     that the midpoint equals the weighted median LV score in the
     design-weighted sample. The area under the curve (integral of
     lv_prob across the 0–16 score range, divided by 16) equals the
     projected turnout fraction.
  3. Each respondent's LV probability = logistic(score; midpoint, k).
  4. LV weight = design_wt × lv_prob, then renormalized to RV total.

RAKING:
  Implemented as pure Iterative Proportional Fitting (no weightipy).
  Weights are capped at 5× and floored at 0.2× after every pass.
  "Did not vote" respondents are kept in the sample but excluded from
  the recall rake — the partisan target applies only over voters.
=============================================================================
"""

import sys
import re
import warnings
from datetime import datetime

import numpy as np
import pandas as pd
from scipy.optimize import curve_fit
from scipy.integrate import quad

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# CLI args
# ---------------------------------------------------------------------------
args        = sys.argv[1:]
input_file  = args[0] if len(args) >= 1 else "input.csv"
output_file = args[1] if len(args) >= 2 else "output.txt"

print("=== POLL WEIGHTING PROGRAM ===")
print(f"Input:  {input_file}")
print(f"Output: {output_file}\n")

# =============================================================================
# 1. LOAD DATA
# =============================================================================
df = pd.read_csv(input_file, dtype=str).fillna("")
print(f"Loaded {len(df)} respondents.\n")

print("Columns found in data:")
for c in df.columns:
    print(f"  {repr(c)}")
print()

if "respondent_id" not in df.columns:
    df["respondent_id"] = [str(i) for i in range(1, len(df) + 1)]
else:
    df["respondent_id"] = df["respondent_id"].astype(str)

# =============================================================================
# 2. STATE -> REGION MAPPING
# =============================================================================
STATE_TO_REGION = {
    "Alabama": "Appalachia / South Interior",
    "Alaska": "West / Mountain / Pacific",
    "Arizona": "Southwest",
    "Arkansas": "Lower Midwest / Plains",
    "California": "West / Mountain / Pacific",
    "Colorado": "West / Mountain / Pacific",
    "Connecticut": "New England",
    "Delaware": "Mid-Atlantic",
    "Florida": "Southeast Atlantic",
    "Georgia": "Southeast Atlantic",
    "Hawaii": "West / Mountain / Pacific",
    "Idaho": "West / Mountain / Pacific",
    "Illinois": "Great Lakes",
    "Indiana": "Great Lakes",
    "Iowa": "Lower Midwest / Plains",
    "Kansas": "Lower Midwest / Plains",
    "Kentucky": "Appalachia / South Interior",
    "Louisiana": "Appalachia / South Interior",
    "Maine": "New England",
    "Maryland": "Mid-Atlantic",
    "Massachusetts": "New England",
    "Michigan": "Great Lakes",
    "Minnesota": "Great Lakes",
    "Mississippi": "Appalachia / South Interior",
    "Missouri": "Lower Midwest / Plains",
    "Montana": "West / Mountain / Pacific",
    "Nebraska": "Lower Midwest / Plains",
    "Nevada": "West / Mountain / Pacific",
    "New Hampshire": "New England",
    "New Jersey": "Mid-Atlantic",
    "New Mexico": "Southwest",
    "New York": "Mid-Atlantic",
    "North Carolina": "Southeast Atlantic",
    "North Dakota": "Lower Midwest / Plains",
    "Ohio": "Great Lakes",
    "Oklahoma": "Southwest",
    "Oregon": "West / Mountain / Pacific",
    "Pennsylvania": "Mid-Atlantic",
    "Rhode Island": "New England",
    "South Carolina": "Southeast Atlantic",
    "South Dakota": "Lower Midwest / Plains",
    "Tennessee": "Appalachia / South Interior",
    "Texas": "Southwest",
    "Utah": "West / Mountain / Pacific",
    "Vermont": "New England",
    "Virginia": "Southeast Atlantic",
    "Washington": "West / Mountain / Pacific",
    "West Virginia": "Appalachia / South Interior",
    "Wisconsin": "Great Lakes",
    "Wyoming": "West / Mountain / Pacific",
}
DEFAULT_REGION = "West / Mountain / Pacific"

if "TPSI State" in df.columns:
    df["region_mapped"] = df["TPSI State"].map(STATE_TO_REGION).fillna(DEFAULT_REGION)
elif "US Region" in df.columns:
    df["region_mapped"] = df["US Region"]
else:
    df["region_mapped"] = DEFAULT_REGION
    print("WARNING: No state/region column found. Defaulting to West/Mountain/Pacific.")

# =============================================================================
# 3. RECODE DEMOGRAPHICS
# =============================================================================

def recode_age(x):
    x = str(x)
    if re.search(r"^18|18-29|18 to 29|18.29", x): return "18-29"
    if re.search(r"^30|30-44|30 to 44|30.44", x): return "30-44"
    if re.search(r"^45|45-64|45 to 64|45.64", x): return "45-64"
    if re.search(r"^65|65\+|65 and|65 or|65 to", x): return "65+"
    return None

def recode_gender(x):
    x = str(x).strip().title()
    if re.search(r"Female|Woman", x): return "Female"
    if re.search(r"Male|Man", x):     return "Male"
    return None

def recode_education(x):
    x = str(x).strip()
    if re.search(r"less than|no diploma|some high|high school|hs grad|ged|12th grade", x, re.I):
        return "HS or less"
    if re.search(r"some college|associate|2.year|vocational|trade school", x, re.I):
        return "Some college"
    if re.search(r"bachelor|4.year|college grad|b\.a|b\.s|undergraduate", x, re.I):
        return "Bachelor's"
    if re.search(r"post.?grad|master|mba|phd|jd|md|doctoral|professional deg", x, re.I):
        return "Postgraduate"
    return None

def recode_race(race, education):
    race = str(race).strip()
    education = str(education).strip()

    # White gets split by education
    if re.search(r"white", race, re.I):
        if re.search(r"bachelor|4.year|college grad|b\.a|b\.s|undergraduate|post.?grad|master|mba|phd|jd|md|doctoral|professional deg", education, re.I):
            return "White College"
        if re.search(r"less than|no diploma|some high|high school|hs grad|ged|12th grade|some college|associate|2.year|vocational|trade school", education, re.I):
            return "White Non-College"
        return "White Non-College"

    if re.search(r"black|african american", race, re.I):
        return "Black"
    if re.search(r"hispanic|latino|latina", race, re.I):
        return "Hispanic"
    if re.search(r"asian|pacific|native|multi|other", race, re.I):
        return "Asian/Other"

    return None

def recode_recall(x):
    """Recode 2024 recall vote into Trump / Harris / Third Party / Did not vote."""
    x = str(x).strip()
    if re.search(r"trump|republican|rep\b|gop", x, re.I):          return "Trump"
    if re.search(r"harris|biden|democrat|dem\b|kamala", x, re.I):  return "Harris"
    if re.search(r"third|other|independ|libertarian|green|rfk|kennedy", x, re.I):
        return "Third Party"
    if re.search(r"did not|didn.?t|not vote|no vote|ineligible|wasn.?t", x, re.I):
        return "Did not vote"
    return None

# Detect age column
age_col = None
if "Age" in df.columns:
    age_col = "Age"
else:
    for c in df.columns:
        if c.startswith("Age"):
            age_col = c
            break

df["age_w"]    = df[age_col].apply(recode_age)           if age_col                     else None
df["gender_w"] = df["TPSI Gender"].apply(recode_gender)  if "TPSI Gender" in df.columns else None
df["race_w"] = (
    df.apply(lambda r: recode_race(r["Race"], r["Education"]), axis=1)
    if {"Race", "Education"}.issubset(df.columns)
    else None
)
df["edu_w"]    = df["Education"].apply(recode_education) if "Education"    in df.columns else None
df["region_w"] = df["region_mapped"]

# Recall vote — try common column names
recall_col = None
for cname in ["Q8_Recall2024", "Recall2024", "recall_vote", "2024 vote", "Q8"]:
    if cname in df.columns:
        recall_col = cname
        break
if recall_col is None:
    for c in df.columns:
        if re.search(r"recall|2024.vote|voted.for", c, re.I):
            recall_col = c
            break

df["recall_w"] = df[recall_col].apply(recode_recall) if recall_col else None

print("Demographic recoding — missingness:")
weight_vars = ["age_w", "gender_w", "race_w", "edu_w", "region_w", "recall_w"]
for v in weight_vars:
    if df[v].isna().all():
        print(f"  {v:<12} (column not found — skipped from weighting)")
    else:
        n_miss = df[v].isna().sum()
        pct    = n_miss / len(df) * 100
        print(f"  {v:<12} {n_miss} missing ({pct:.1f}%)")
print()

def modal(series):
    s = series.dropna()
    return s.value_counts().index[0] if len(s) > 0 else "Unknown"

for v in ["age_w", "gender_w", "race_w", "edu_w", "region_w"]:
    df[v] = df[v].fillna(modal(df[v]))

# =============================================================================
# 4. RIM WEIGHTING — pure Iterative Proportional Fitting (no weightipy)
# =============================================================================
print("--- Step 1: RIM Weighting (Iterative Proportional Fitting) ---")

# ── Targets (unchanged from original) ────────────────────────────────────────
TARGET_AGE    = {"18-29": 0.266, "30-44": 0.281, "45-64": 0.228, "65+": 0.225}
TARGET_GENDER = {"Female": 0.525, "Male": 0.475}
TARGET_RACE   = {
    "White Non-College": 0.469, "White College": 0.221,
    "Black": 0.126, "Hispanic": 0.116, "Asian/Other": 0.068,
}
TARGET_EDU = {
    "HS or less": 0.291, "Some college": 0.285,
    "Bachelor's": 0.265, "Postgraduate": 0.159,
}
TARGET_REGION = {
    "New England": 0.048,   "Mid-Atlantic": 0.150,
    "Southeast Atlantic": 0.170, "Appalachia / South Interior": 0.081,
    "Great Lakes": 0.172,   "Lower Midwest / Plains": 0.061,
    "Southwest": 0.117,     "West / Mountain / Pacific": 0.201,
}
# FIX: recall target covers voters only (Trump / Harris / Third Party).
# "Did not vote" respondents are kept in the sample but excluded from
# this rake so they cannot distort the partisan balance.
TARGET_RECALL_VOTERS = {
    "Trump": 0.498, "Harris": 0.483, "Third Party": 0.012,
}

# ── Build active targets: keep only categories present in data, renormalise ──
def build_target(target_dict, observed_series):
    """
    Restrict to categories present in the data and renormalise so proportions
    sum to 1.0.  Returns None if fewer than 2 categories survive (no variance).
    """
    present = set(observed_series.dropna().unique())
    sub     = {k: v for k, v in target_dict.items() if k in present}
    if len(sub) < 2:
        if sub:
            print(f"    NOTE: only one category ({list(sub.keys())}) — variable skipped (no variance).")
        return None
    total = sum(sub.values())
    return {k: v / total for k, v in sub.items()}   # proportions (not %)

ALL_TARGETS_RAW = {
    "age_w":    (TARGET_AGE,    df["age_w"]),
    "gender_w": (TARGET_GENDER, df["gender_w"]),
    "race_w":   (TARGET_RACE,   df["race_w"]),
    "edu_w":    (TARGET_EDU,    df["edu_w"]),
    "region_w": (TARGET_REGION, df["region_w"]),
    # recall handled separately below
}

active_targets = {}
skipped_vars   = []

for var, (tgt, series) in ALL_TARGETS_RAW.items():
    result = build_target(tgt, series)
    if result is None:
        skipped_vars.append(var)
        print(f"  NOTE: {var} skipped (no matching categories found in data)")
    else:
        active_targets[var] = result

# Recall: only rake over Trump / Harris / Third Party voters
recall_voters_mask = (
    df["recall_w"].isin(["Trump", "Harris", "Third Party"])
    if df["recall_w"].notna().any()
    else pd.Series(False, index=df.index)
)
if recall_col and recall_voters_mask.sum() >= 2:
    recall_tgt = build_target(TARGET_RECALL_VOTERS, df.loc[recall_voters_mask, "recall_w"])
    if recall_tgt:
        active_targets["recall_w"] = recall_tgt
    else:
        skipped_vars.append("recall_w")
else:
    skipped_vars.append("recall_w")
    print("  NOTE: recall_w skipped (not enough voter categories)")

print(f"  Raking variables: {list(active_targets.keys())}")
if skipped_vars:
    print(f"  Skipped:          {skipped_vars}")

# ── IPF core loop ─────────────────────────────────────────────────────────────
WEIGHT_CAP   = 5.0
WEIGHT_FLOOR = 0.2
MAX_ITER     = 1000
CONVERGENCE  = 1e-4

weights     = np.ones(len(df), dtype=float)
converged   = False
n_iter_used = 0

for iteration in range(MAX_ITER):
    max_delta = 0.0

    for var, targets in active_targets.items():
        # For recall, only adjust weights of Trump/Harris/Third Party voters
        if var == "recall_w":
            base_mask   = recall_voters_mask.values
        else:
            base_mask   = np.ones(len(df), dtype=bool)

        base_wt_sum = weights[base_mask].sum()

        for cat, tgt_prop in targets.items():
            if var == "recall_w":
                cat_mask = base_mask & (df["recall_w"] == cat).values
            else:
                cat_mask = (df[var] == cat).values

            cat_wt_sum = weights[cat_mask].sum()
            if cat_wt_sum == 0:
                continue

            cur_prop = cat_wt_sum / base_wt_sum
            scale    = tgt_prop / cur_prop
            delta    = abs(cur_prop - tgt_prop)
            if delta > max_delta:
                max_delta = delta

            weights[cat_mask] *= scale

        # FIX: cap and floor enforced after every variable, every pass
        weights = np.clip(weights, WEIGHT_FLOOR, WEIGHT_CAP)

    n_iter_used = iteration + 1
    if max_delta < CONVERGENCE:
        converged = True
        break

# Renormalise to mean = 1.0
weights = weights / weights.mean()
df["design_wt"] = weights

# ── Convergence diagnostics ───────────────────────────────────────────────────
deff = (weights**2).mean() / (weights.mean()**2)
eff  = 1.0 / deff * 100

print(f"  {'Converged' if converged else 'DID NOT CONVERGE'} in {n_iter_used} iteration(s).")
print(f"  Design effect (DEFF): {deff:.3f}   Weighting efficiency: {eff:.1f}%")
print(f"  Weights: {weights.min():.4f} – {weights.max():.4f}  (mean={weights.mean():.4f})\n")

# FIX: margin verification — print ✓/✗ for every category
print("  Margin verification (weighted vs target):")
for var, targets in active_targets.items():
    if var == "recall_w":
        universe_wt = df.loc[recall_voters_mask, "design_wt"].sum()
        for cat, tgt in sorted(targets.items()):
            mask = recall_voters_mask & (df["recall_w"] == cat)
            got  = df.loc[mask, "design_wt"].sum() / universe_wt
            flag = "✓" if abs(got - tgt) < 0.005 else "✗"
            print(f"    {flag} {var}={cat:<30} target={tgt:.3f}  got={got:.3f}  Δ={got-tgt:+.4f}")
    else:
        universe_wt = df["design_wt"].sum()
        for cat, tgt in sorted(targets.items()):
            got  = df.loc[df[var] == cat, "design_wt"].sum() / universe_wt
            flag = "✓" if abs(got - tgt) < 0.005 else "✗"
            print(f"    {flag} {var}={cat:<30} target={tgt:.3f}  got={got:.3f}  Δ={got-tgt:+.4f}")
print()

# =============================================================================
# 5. LIKELY VOTER SCORE (0–16)
# =============================================================================
print("--- Step 2: Likely Voter Scoring ---")

def gc(colname):
    """Get column safely; return empty series if not found."""
    if colname in df.columns:
        return df[colname]
    for c in df.columns:
        if c.startswith(colname):
            print(f"  NOTE: Matched '{colname}' → '{c}'")
            return df[c]
    return pd.Series([""] * len(df), index=df.index)

def is_yes(series):
    """Score a yes/no / Selected/Not Selected column as 1 or 0."""
    return series.astype(str).str.lower().str.contains(
        r"yes|true|^1$|checked|selected|registered", regex=True
    ).astype(int)

# ---- S1: Registration (0 or 3 pts) ----
reg_col = None
for cname in ["Q1_Registration", "Q1_RegistrationQ2", "Q1"]:
    if cname in df.columns:
        reg_col = cname
        break
if reg_col is None:
    for c in df.columns:
        if re.search(r"Q1.*registr|registr.*Q1", c, re.I):
            reg_col = c
            break
if reg_col:
    s_reg = is_yes(df[reg_col]) * 3
    print(f"  Registration column: '{reg_col}'")
else:
    s_reg = pd.Series(3, index=df.index, dtype=int)
    print("  WARNING: No registration column found. Treating all as registered (3 pts).")

# ---- S2: Vote history (recency-weighted, max 7 pts) ----
hp = "Q2: Which of the following election years did you vote in at least once? (Select all that apply)_"

s_history = (
    is_yes(gc(hp + "2024 - Presidential Election")) * 3 +
    is_yes(gc(hp + "2022 - Midterm Elections"))      * 2 +
    is_yes(gc(hp + "2020 - Presidential Election"))  * 3 +
    is_yes(gc(hp + "2018 - Midterm Elections"))       * 2 +
    is_yes(gc(hp + "2016 - Presidential Election"))  * 2 +
    is_yes(gc(hp + "2014 - Midterm Elections"))       * 1 +
    is_yes(gc(hp + "I voted in an election that occurred before the options above")) * 1 -
    is_yes(gc(hp + "I did not vote in any of these elections / wasn't eligible to vote")) * 5
).clip(0, 7)

# ---- S3: Motivation / plan certainty (0–4 pts each, take the stronger) ----
def score_motivation(series):
    x      = series.astype(str).str.lower().str.strip()
    scores = pd.Series(2, index=series.index, dtype=int)
    scores[x.str.contains(r"extremely|absolutely|definitely|certain|10|100%", regex=True)] = 4
    scores[x.str.contains(r"very|probably will|likely|8|9",                   regex=True)] = 3
    scores[x.str.contains(r"somewhat|maybe|50.50|toss|5|6|7",                 regex=True)] = 2
    scores[x.str.contains(r"not very|probably not|unlikely|3|4",              regex=True)] = 1
    scores[x.str.contains(r"not at all|not motivated at all|no|definitely not|^1$|^2$", regex=True)] = 0
    return scores

def score_plan_certainty(series):
    x      = series.astype(str).str.lower().str.strip()
    scores = pd.Series(2, index=series.index, dtype=int)
    scores[x.str.contains(r"yes.*know both|know both", regex=True)] = 4
    scores[x.str.contains(r"know one|i know one", regex=True)]      = 3
    scores[x.str.contains(r"plan to figure|not yet.*plan", regex=True)] = 2
    scores[x.str.contains(r"do not plan|don.?t plan|i do not plan", regex=True)] = 0
    return scores

q3_col = None
for cname in ["Q3_Motivation"]:
    if cname in df.columns:
        q3_col = cname
        break
if q3_col is None:
    for c in df.columns:
        if re.search(r"Q3.*motiv|motiv.*Q3", c, re.I):
            q3_col = c
            break

q4_col = None
for cname in ["Q4_PlanCertainty"]:
    if cname in df.columns:
        q4_col = cname
        break
if q4_col is None:
    for c in df.columns:
        if re.search(r"Q4.*plan|plan.*Q4|Q4.*certain|certain.*Q4", c, re.I):
            q4_col = c
            break

print(f"  Motivation column:      '{q3_col}'")
print(f"  Plan certainty column:  '{q4_col}'")

s_motivation = score_motivation(gc(q3_col) if q3_col else pd.Series([""] * len(df)))
s_plan       = score_plan_certainty(gc(q4_col) if q4_col else pd.Series([""] * len(df)))
s_combined   = pd.concat([s_motivation, s_plan], axis=1).max(axis=1)

# ---- S4: Social norm — others voting (0–2 pts) ----
q5_col = None
for cname in ["Q5_OthersVoting"]:
    if cname in df.columns:
        q5_col = cname
        break
if q5_col is None:
    for c in df.columns:
        if re.search(r"Q5.*others|others.*Q5|Q5.*social|social.*norm", c, re.I):
            q5_col = c
            break

print(f"  Social norm column:     '{q5_col}'")

s_others_raw = gc(q5_col).astype(str).str.lower().str.strip() if q5_col else pd.Series([""] * len(df))
s_others = pd.Series(1, index=df.index, dtype=int)
s_others[s_others_raw.str.contains(r"most|all|everyone|very likely|definitely|all or nearly all", regex=True)] = 2
s_others[s_others_raw.str.contains(r"some|about half|likely|probably",                             regex=True)] = 1
s_others[s_others_raw.str.contains(r"few|none|unlikely|don.?t know|a few",                         regex=True)] = 0

df["lv_raw"] = (s_reg + s_history + s_combined + s_others).astype(float)

print(f"\n  Raw score range: {int(df['lv_raw'].min())} – {int(df['lv_raw'].max())}  "
      f"(mean={df['lv_raw'].mean():.2f})")

# =============================================================================
# 6. FIT LOGISTIC CURVE TO SAMPLE DATA
# =============================================================================
print("\n--- Step 3: Fitting Logistic Curve to Sample Distribution ---")

scores_arr  = df["lv_raw"].values
weights_arr = df["design_wt"].values

def weighted_median(values, weights):
    order   = np.argsort(values)
    vals_s  = values[order]
    wts_s   = weights[order]
    cum_wt  = np.cumsum(wts_s) / wts_s.sum()
    idx     = np.searchsorted(cum_wt, 0.50)
    return float(vals_s[min(idx, len(vals_s) - 1)])

midpoint = weighted_median(scores_arr, weights_arr)
print(f"  Weighted median LV score (midpoint): {midpoint:.3f}")

unique_scores = np.unique(scores_arr)
ecdf_vals = np.array([
    np.sum(weights_arr[scores_arr <= s]) / weights_arr.sum()
    for s in unique_scores
])

def logistic_fixed_mid(x, k):
    return 1.0 / (1.0 + np.exp(-k * (x - midpoint)))

try:
    popt, _ = curve_fit(logistic_fixed_mid, unique_scores, ecdf_vals,
                        p0=[0.6], bounds=(0.1, 5.0), maxfev=5000)
    k_fitted = float(popt[0])
    print(f"  Fitted steepness k: {k_fitted:.4f}")
except Exception as e:
    k_fitted = 1.2
    print(f"  curve_fit failed ({e}); using default k={k_fitted}")

area, _ = quad(logistic_fixed_mid, 0, 16, args=(k_fitted,))
implied_turnout = area / 16.0
print(f"  Implied turnout (area / score range): {implied_turnout*100:.1f}%")

# =============================================================================
# 7. APPLY LOGISTIC PROBABILITIES → LV WEIGHTS
# =============================================================================
df["lv_prob"] = 1.0 / (1.0 + np.exp(-k_fitted * (df["lv_raw"] - midpoint)))
df["lv_wt"]   = df["design_wt"] * df["lv_prob"]
df["lv_wt"]   = df["lv_wt"] * (df["design_wt"].sum() / df["lv_wt"].sum())

print(f"  Mean LV probability:  {df['lv_prob'].mean()*100:.1f}%")
print(f"  Effective LV N:       {df['lv_prob'].sum():.0f}")
print(f"  LV weight range:      {df['lv_wt'].min():.3f} – {df['lv_wt'].max():.3f}\n")

# =============================================================================
# 8. IDENTIFY POLL QUESTION COLUMNS
# =============================================================================
lv_screen_prefixes = (
    "Q1_Registration",
    "Q2: Which of the following",
    "Q3_Motivation",
    "Q4_PlanCertainty",
    "Q5_OthersVoting",
)

SKIP_COLS = {
    "Age", "TPSI Gender", "TPSI State", "Race", "Education",
    "Household income US", "US Zip Code", "US Region", "US Division",
    "US Statistical Area (CBSA)", "US County", "Employment Status", "Region",
    "respondent_id", "design_wt", "lv_wt", "lv_raw", "lv_prob",
    "region_mapped", "age_w", "gender_w", "race_w", "edu_w",
    "region_w", "recall_w",
}
if recall_col:
    SKIP_COLS.add(recall_col)

def is_lv_screen_col(col):
    return any(col.startswith(p) for p in lv_screen_prefixes)

poll_cols = [
    c for c in df.columns
    if c not in SKIP_COLS
    and not is_lv_screen_col(c)
    and re.match(r"^Q[0-9]+", c, re.I)
]

print(f"Poll questions for output: {len(poll_cols)}")
for c in poll_cols:
    print(f"  {c[:100]}")
print()

# =============================================================================
# 9. WEIGHTED OUTPUT HELPERS
# =============================================================================

def freq_tbl(series, weights):
    """Return frequency table with Response, Pct, N_wtd."""
    tmp = pd.DataFrame({"val": series.astype(str), "w": weights})
    tmp = tmp[tmp["val"].str.strip() != ""]
    g   = tmp.groupby("val")["w"].sum().sort_index()
    tot = g.sum()
    return pd.DataFrame({
        "Response": g.index, "Pct": g.values / tot, "N_wtd": g.values
    }).reset_index(drop=True)


def xtab_with_total(q_series, b_series, weights):
    """
    Build a crosstab (column %) with a 'Total' column prepended on the left.
    Returns a DataFrame where:
      - index = response choices
      - columns = ['Total', group1, group2, ...]
      - all values are percentages (0–100, rounded to 1 dp)
    """
    tmp = pd.DataFrame({
        "q": q_series.astype(str),
        "b": b_series.astype(str),
        "w": weights
    })
    tmp = tmp[(tmp["q"].str.strip() != "") & (tmp["b"].str.strip() != "")]

    # Overall total column (marginal %)
    total_g   = tmp.groupby("q")["w"].sum()
    total_pct = (total_g / total_g.sum() * 100).round(1)

    # By-group crosstab column %
    ct = tmp.pivot_table(index="q", columns="b", values="w",
                         aggfunc="sum", fill_value=0)
    ct_pct = (ct.div(ct.sum(axis=0)) * 100).round(1)

    # Align index (some responses may be missing from ct_pct)
    all_responses = total_pct.index.union(ct_pct.index)
    total_pct = total_pct.reindex(all_responses, fill_value=0.0)
    ct_pct    = ct_pct.reindex(all_responses, fill_value=0.0)

    # Prepend Total as the leftmost column
    result = pd.concat([total_pct.rename("Total"), ct_pct], axis=1)
    result.index.name = "q"
    return result


def clean_label(x):
    x = str(x).strip()
    x = re.sub(r"\s+", " ", x)
    return x

def clean_question_name(q):
    q = clean_label(q)
    return q

fmt_pct = lambda p: f"{p*100:5.1f}%"

DIV = "=" * 100
div = "-" * 100

def render_freq(tbl, label=""):
    if tbl is None or len(tbl) == 0:
        return "  (no data)"
    out = ([label] if label else []) + [
        f"    {str(r['Response']):<45} {fmt_pct(r['Pct'])}  (n={r['N_wtd']:.0f})"
        for _, r in tbl.iterrows()
    ]
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Race column ordering — always show White Non-College and White College first
# ---------------------------------------------------------------------------
RACE_COL_ORDER = [
    "White Non-College", "White College",
    "Black", "Hispanic", "Asian/Other",
]


def order_columns(ct, breakdown_var):
    """
    Re-order the crosstab columns so that:
      - 'Total' is always first (leftmost)
      - For race breakdowns: White Non-College, White College first, then others
      - All other breakdowns: natural sort order (as-is from pivot)
    """
    cols = list(ct.columns)
    non_total = [c for c in cols if c != "Total"]

    if breakdown_var == "race_w":
        ordered = [c for c in RACE_COL_ORDER if c in non_total]
        remainder = [c for c in non_total if c not in RACE_COL_ORDER]
        non_total = ordered + remainder

    return ct[["Total"] + non_total]


def render_xtab_with_total(ct):
    """
    Render a crosstab that already has a 'Total' column as the leftmost column.
    All values are percentages; append '%' to each cell.
    """
    if ct is None or ct.empty:
        return "  (no data)"

    cols     = ct.columns.tolist()          # includes 'Total' first
    COL_W    = 16
    RESP_W   = 42
    header   = " " * (RESP_W + 2) + "".join(f"{str(c)[:COL_W-1]:<{COL_W}}" for c in cols)
    rows     = [header]

    for rn in ct.index:
        label = str(rn)[:RESP_W]
        cells = "".join(
            f"{str(ct.loc[rn, c]) + '%':<{COL_W}}" for c in cols
        )
        rows.append(f"  {label:<{RESP_W}} {cells}")

    return "\n".join(rows)


def xtab_to_wide_df(q_name, b_name, ct):
    """
    Convert one crosstab (with Total column) into a wide DataFrame for CSV export.
    """
    if ct is None or ct.empty:
        return pd.DataFrame()

    out = ct.copy().reset_index()
    out = out.rename(columns={"q": "Response"})
    out.insert(0, "Breakdown", b_name)
    out.insert(0, "Question", clean_question_name(q_name))
    out.columns = [clean_label(c) for c in out.columns]
    return out


# =============================================================================
# 10. BUILD & WRITE REPORT
# =============================================================================
lines = []

lines += [
    DIV,
    "POLL RESULTS — TOPLINES & CROSSTABS",
    f"Generated:            {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
    f"Input file:           {input_file}",
    f"Total N (unweighted): {len(df)}",
    f"Poll questions:       {len(poll_cols)}",
    f"Weighting method:     Iterative Proportional Fitting (RIM / raking)",
    DIV, "",
]

# ---- RAKING ENGINE REPORT ----
lines += [DIV, "RAKING ENGINE REPORT", DIV]
lines += [
    f"  Weighting variables:   {list(active_targets.keys())}",
    f"  Skipped variables:     {skipped_vars}",
    f"  {'Converged' if converged else 'DID NOT CONVERGE'} in {n_iter_used} iteration(s)",
    f"  Weight floor / cap:    {WEIGHT_FLOOR} / {WEIGHT_CAP}",
    f"  Design effect (DEFF):  {deff:.3f}",
    f"  Weighting efficiency:  {eff:.1f}%",
    f"  Weight range:          {weights.min():.4f} – {weights.max():.4f}  (mean={weights.mean():.4f})",
    "",
    "  Margin verification (target vs achieved):",
]
for var, targets in active_targets.items():
    if var == "recall_w":
        universe_wt = df.loc[recall_voters_mask, "design_wt"].sum()
        for cat, tgt in sorted(targets.items()):
            mask = recall_voters_mask & (df["recall_w"] == cat)
            got  = df.loc[mask, "design_wt"].sum() / universe_wt
            lines.append(f"    {var}={cat:<30} target={tgt:.3f}  achieved={got:.3f}  Δ={got-tgt:+.4f}")
    else:
        univ = df["design_wt"].sum()
        for cat, tgt in sorted(targets.items()):
            got = df.loc[df[var] == cat, "design_wt"].sum() / univ
            lines.append(f"    {var}={cat:<30} target={tgt:.3f}  achieved={got:.3f}  Δ={got-tgt:+.4f}")
lines.append("")

# ---- SAMPLE COMPOSITION ----
lines += [DIV, "SAMPLE COMPOSITION (Design-Weighted RV Universe)", DIV, ""]
COMP_LABELS = {
    "age_w": "Age", "gender_w": "Gender", "race_w": "Race / Ethnicity",
    "edu_w": "Education", "region_w": "Region", "recall_w": "2024 Recall Vote",
}
for v, lbl in COMP_LABELS.items():
    lines += [div, lbl, div]
    lines.append(render_freq(freq_tbl(df[v], df["design_wt"])))
    lines.append("")

# ---- LV DIAGNOSTICS ----
lines += [DIV, "LIKELY VOTER MODEL DIAGNOSTICS", DIV]
lines += [
    "  Method: Logistic curve fit to empirical weighted CDF of LV scores",
    f"  Midpoint = weighted median LV score: {midpoint:.3f}",
    f"  Fitted steepness k:                  {k_fitted:.4f}",
    f"  Implied turnout (area/range):         {implied_turnout*100:.1f}%",
    f"  Mean LV probability:                 {df['lv_prob'].mean()*100:.1f}%",
    f"  Effective LV N:                      {df['lv_prob'].sum():.0f}",
    f"  Design weight range:                 {df['design_wt'].min():.3f} – {df['design_wt'].max():.3f}",
    f"  LV weight range:                     {df['lv_wt'].min():.3f} – {df['lv_wt'].max():.3f}",
    "",
    "  Component score means (all respondents, unweighted):",
    f"    Registration:   {s_reg.mean():.2f} / 3",
    f"    Vote history:   {s_history.mean():.2f} / 7",
    f"    Motivation:     {s_combined.mean():.2f} / 4",
    f"    Social norm:    {s_others.mean():.2f} / 2",
    f"    Total raw:      {df['lv_raw'].mean():.2f} / 16",
    "",
    "  LV score distribution (design-weighted):",
]
for sc in sorted(df["lv_raw"].unique()):
    mask = df["lv_raw"] == sc
    wt   = df.loc[mask, "design_wt"].sum() / df["design_wt"].sum() * 100
    prob = df.loc[mask, "lv_prob"].mean() * 100
    lines.append(f"    Score {sc:4.0f}:  {wt:5.1f}% of RVs  → LV prob {prob:5.1f}%")
lines.append("")

# ---- Define breakdown vars ----
BY_VARS = {
    "gender_w": "Gender",
    "age_w":    "Age",
    "race_w":   "Race",
    "edu_w":    "Education",
    "region_w": "Region",
}

crosstab_tables = []

# ---- TOPLINES (RV + LV marginals) ----
lines += [DIV, "TOPLINES", DIV, ""]
for qv in poll_cols:
    tbl_rv = freq_tbl(df[qv], df["design_wt"])
    tbl_lv = freq_tbl(df[qv], df["lv_wt"])
    lines += [div, qv, div]
    lines.append(render_freq(tbl_rv, "  Registered Voters (RV):"))
    lines.append("")
    lines.append(render_freq(tbl_lv, "  Likely Voters (LV):"))
    lines.append("")

# ---- CROSSTABS (LV weights, by demographic breaks) ----
lines += [
    DIV,
    "CROSSTABS  (Likely Voter Weights — Column Percentages)",
    "  Layout: Total % shown first (leftmost), then each subgroup % to the right.",
    "  Race breakdown includes White Non-College and White College as separate columns.",
    DIV, "",
]

for qv in poll_cols:
    for bv, blab in BY_VARS.items():
        ct_raw = xtab_with_total(df[qv], df[bv], df["lv_wt"])
        ct     = order_columns(ct_raw, bv)

        lines += [div, f"{qv[:55]:<55}  x  {blab}", div]
        lines.append(render_xtab_with_total(ct))
        lines.append("")

        wide_ct = xtab_to_wide_df(qv, blab, ct)
        if not wide_ct.empty:
            crosstab_tables.append(wide_ct)

lines += [DIV, "END OF REPORT", DIV]

with open(output_file, "w") as f:
    f.write("\n".join(lines))

import re as _re
out_csv = _re.sub(r"\.txt$", "_weighted_data.csv", output_file)
df.to_csv(out_csv, index=False)

print(f"✅ Report:        {output_file}")
print(f"✅ Weighted data: {out_csv}")

# ---- EXPORT CROSSTABS CSV (WIDE FORMAT) ----
crosstab_file = _re.sub(r"\.txt$", "_crosstabs.csv", output_file)

if crosstab_tables:
    crosstab_df = pd.concat(crosstab_tables, ignore_index=True, sort=False)

    id_cols = {"Question", "Breakdown", "Response", "Total"}
    for col in crosstab_df.columns:
        if col not in id_cols:
            crosstab_df[col] = pd.to_numeric(crosstab_df[col], errors="coerce").round(1)

    fixed_cols = ["Question", "Breakdown", "Response", "Total"]
    remaining  = [c for c in crosstab_df.columns if c not in fixed_cols]

    race_cols_present = [c for c in RACE_COL_ORDER if c in remaining]
    other_cols        = [c for c in remaining if c not in RACE_COL_ORDER]
    remaining_ordered = race_cols_present + other_cols

    final_cols = fixed_cols + remaining_ordered
    final_cols = [c for c in final_cols if c in crosstab_df.columns]
    crosstab_df = crosstab_df[final_cols]

    crosstab_df.to_csv(crosstab_file, index=False)
else:
    pd.DataFrame(columns=["Question", "Breakdown", "Response", "Total"]).to_csv(
        crosstab_file, index=False
    )

print(f"✅ Crosstabs CSV: {crosstab_file}")