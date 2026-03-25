#!/usr/bin/env python3
"""
=============================================================================
POLL WEIGHTING & LIKELY VOTER MODEL  — COMPLETE REWRITE
Iterative Proportional Fitting (RIM/Raking) | Logistic-Curve LV Screen
Toplines & Crosstabs
=============================================================================
USAGE:
    python poll_weighting.py input.csv output.txt

REQUIRED PACKAGES:  pandas  numpy  scipy
    pip install pandas numpy scipy

HOW THE RAKING WORKS (no third-party library required):
  • Each weighting variable gets a set of target proportions that sum to 1.
  • We iterate:  for each variable, scale every respondent's weight so that
    the weighted marginal distribution matches the target.
  • We repeat until all marginals are within 0.0001 of their targets
    OR 1 000 iterations, whichever comes first.
  • Weights are capped at 5× and floored at 0.2× after every pass.
  • A "Did not vote" bucket is excluded from the recall target; recall
    targets are normalised over Trump / Harris / Third Party only and
    "Did not vote" respondents receive recall weight = 1.0 (they do not
    distort the partisan rake).

HOW THE LIKELY VOTER MODEL WORKS:
  1. Each respondent scores 0-16 across four propensity dimensions:
       • Registration (0 or 3 pts)
       • Vote history  (0–7 pts, recency-weighted)
       • Motivation / plan certainty (0–4 pts)
       • Social norm — people around me vote (0–2 pts)
  2. A logistic function is fit to the weighted ECDF of scores so that
     the inflection point equals the weighted-median score.
  3. LV probability = logistic(score; midpoint, k).
  4. LV weight = design_wt × lv_prob, renormalised so that the sum of
     LV weights equals the sum of design weights (same universe size).

RACE CLASSIFICATION (read from RaceEdu column when present):
  "White, Non College (Non-hispanic)"  → White Non-College
  "White, College (Non-hispanic)"      → White College
  "Black/African American"             → Black
  "Hispanic (Any Race)"                → Hispanic
  "Asian / Other"                      → Asian/Other
=============================================================================
"""

import sys
import re
import warnings
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import curve_fit
from scipy.integrate import quad

warnings.filterwarnings("ignore")

# ──────────────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────────────
args        = sys.argv[1:]
input_file  = args[0] if len(args) >= 1 else "input.csv"
output_file = args[1] if len(args) >= 2 else "output.txt"

print("=" * 70)
print("  POLL WEIGHTING & LIKELY VOTER MODEL")
print("=" * 70)
print(f"  Input  : {input_file}")
print(f"  Output : {output_file}")
print()

# ══════════════════════════════════════════════════════════════════════════════
# 1.  LOAD DATA
# ══════════════════════════════════════════════════════════════════════════════
df = pd.read_csv(input_file, dtype=str).fillna("")
print(f"Loaded {len(df):,} respondents.\n")

print("Columns found:")
for c in df.columns:
    print(f"  {repr(c)}")
print()

if "respondent_id" not in df.columns:
    df["respondent_id"] = [str(i) for i in range(1, len(df) + 1)]
else:
    df["respondent_id"] = df["respondent_id"].astype(str)

# ──────────────────────────────────────────────────────────────────────────────
# Raw value inspection
# ──────────────────────────────────────────────────────────────────────────────
print("=== RAW VALUE INSPECTION (first 8 unique values per key column) ===")
for col in ["Race", "RaceEdu", "Gender", "TPSI Gender", "Age", "Education",
            "Region", "Q13_Recall2024", "Vote2024_Bucket", "Q8_Recall2024"]:
    if col in df.columns:
        vals = df[col].dropna().unique()[:8]
        print(f"  {col}: {list(vals)}")
print("=" * 70)
print()

# ══════════════════════════════════════════════════════════════════════════════
# 2.  FLORIDA COUNTY → REGION MAP
# ══════════════════════════════════════════════════════════════════════════════
COUNTY_TO_REGION = {
    # South Florida
    "Miami-Dade": "South Florida", "Broward": "South Florida",
    "Palm Beach": "South Florida", "Monroe": "South Florida",
    # Southeast / Treasure Coast
    "Martin": "Southeast / Treasure Coast", "St. Lucie": "Southeast / Treasure Coast",
    "Indian River": "Southeast / Treasure Coast", "Okeechobee": "Southeast / Treasure Coast",
    "Highlands": "Southeast / Treasure Coast", "Glades": "Southeast / Treasure Coast",
    "Hendry": "Southeast / Treasure Coast",
    # Central Florida
    "Orange": "Central Florida", "Osceola": "Central Florida",
    "Seminole": "Central Florida", "Lake": "Central Florida",
    "Polk": "Central Florida", "Volusia": "Central Florida",
    "Brevard": "Central Florida",
    # Tampa Bay / Southwest
    "Hillsborough": "Tampa Bay / Southwest", "Pinellas": "Tampa Bay / Southwest",
    "Pasco": "Tampa Bay / Southwest", "Hernando": "Tampa Bay / Southwest",
    "Citrus": "Tampa Bay / Southwest", "Manatee": "Tampa Bay / Southwest",
    "Sarasota": "Tampa Bay / Southwest", "Charlotte": "Tampa Bay / Southwest",
    "Lee": "Tampa Bay / Southwest", "Collier": "Tampa Bay / Southwest",
    "DeSoto": "Tampa Bay / Southwest", "Hardee": "Tampa Bay / Southwest",
    # North Florida / First Coast
    "Duval": "North Florida / First Coast", "Clay": "North Florida / First Coast",
    "St. Johns": "North Florida / First Coast", "Flagler": "North Florida / First Coast",
    "Putnam": "North Florida / First Coast", "Nassau": "North Florida / First Coast",
    "Baker": "North Florida / First Coast", "Bradford": "North Florida / First Coast",
    "Union": "North Florida / First Coast", "Alachua": "North Florida / First Coast",
    # North Central Florida
    "Marion": "North Central Florida", "Sumter": "North Central Florida",
    "Levy": "North Central Florida", "Gilchrist": "North Central Florida",
    "Dixie": "North Central Florida", "Lafayette": "North Central Florida",
    "Suwannee": "North Central Florida", "Columbia": "North Central Florida",
    "Hamilton": "North Central Florida", "Madison": "North Central Florida",
    "Taylor": "North Central Florida", "Jefferson": "North Central Florida",
    "Wakulla": "North Central Florida",
    # Florida Panhandle
    "Escambia": "Florida Panhandle", "Santa Rosa": "Florida Panhandle",
    "Okaloosa": "Florida Panhandle", "Walton": "Florida Panhandle",
    "Bay": "Florida Panhandle", "Washington": "Florida Panhandle",
    "Holmes": "Florida Panhandle", "Jackson": "Florida Panhandle",
    "Calhoun": "Florida Panhandle", "Gulf": "Florida Panhandle",
    "Franklin": "Florida Panhandle", "Liberty": "Florida Panhandle",
    "Gadsden": "Florida Panhandle", "Leon": "Florida Panhandle",
}

VALID_REGIONS  = set(COUNTY_TO_REGION.values())
DEFAULT_REGION = "Central Florida"

def map_county(raw):
    cleaned = re.sub(r"\s*County$", "", str(raw), flags=re.I).strip()
    return COUNTY_TO_REGION.get(cleaned, None)

if "US County" in df.columns:
    df["region_mapped"] = df["US County"].apply(lambda v: map_county(v) or DEFAULT_REGION)
    print("Region mapped from 'US County'.")
elif "Florida Region" in df.columns:
    df["region_mapped"] = df["Florida Region"].str.strip().replace("", DEFAULT_REGION)
    df["region_mapped"] = df["region_mapped"].apply(lambda v: v if v in VALID_REGIONS else DEFAULT_REGION)
    print("Region mapped from 'Florida Region'.")
elif "Region" in df.columns:
    def _map_region(v):
        v = str(v).strip()
        if not v:
            return DEFAULT_REGION
        fc = map_county(v)
        if fc:
            return fc
        if v in VALID_REGIONS:
            return v
        return DEFAULT_REGION
    df["region_mapped"] = df["Region"].apply(_map_region)
    n_def = (df["region_mapped"] == DEFAULT_REGION).sum()
    print(f"Region mapped from 'Region' ({len(df)-n_def}/{len(df)} rows resolved).")
elif "US Region" in df.columns:
    df["region_mapped"] = df["US Region"].str.strip().replace("", DEFAULT_REGION)
    print("Region mapped from 'US Region'.")
else:
    df["region_mapped"] = DEFAULT_REGION
    print(f"WARNING: No region column found. All set to '{DEFAULT_REGION}' — region weighting skipped.")

print(f"  Distribution: {df['region_mapped'].value_counts().to_dict()}\n")

# ══════════════════════════════════════════════════════════════════════════════
# 3.  DEMOGRAPHIC RECODING
# ══════════════════════════════════════════════════════════════════════════════

def recode_age(x):
    x = str(x).strip()
    if re.search(r"^18[-\s]?29|18 to 29|18\.?-?29", x, re.I): return "18-29"
    if re.search(r"^30[-\s]?44|30 to 44", x, re.I):            return "30-44"
    if re.search(r"^45[-\s]?64|45 to 64", x, re.I):            return "45-64"
    if re.search(r"^65|\b65\+|65 and over|65 or older",  x, re.I): return "65+"
    # numeric
    try:
        n = int(re.search(r"\d+", x).group())
        if 18 <= n <= 29: return "18-29"
        if 30 <= n <= 44: return "30-44"
        if 45 <= n <= 64: return "45-64"
        if n >= 65:        return "65+"
    except Exception:
        pass
    return None

def recode_gender(x):
    x = str(x).strip().lower()
    if re.search(r"female|woman|^f$", x): return "Female"
    if re.search(r"male|man|^m$",   x):   return "Male"
    return None

def recode_race_edu(x):
    """
    Priority: Non-College white checked BEFORE college-white so 'Non College'
    in the string doesn't accidentally match the college branch.
    """
    x = str(x).strip()
    if re.search(r"non.?coll|no.?coll|noncoll", x, re.I):
        return "White Non-College"
    if re.search(r"white", x, re.I) and re.search(r"coll", x, re.I):
        return "White College"
    if re.search(r"black|african.?american", x, re.I):
        return "Black"
    if re.search(r"hispanic|latino|latina", x, re.I):
        return "Hispanic"
    if re.search(r"asian|pacific|native|multi|other", x, re.I):
        return "Asian/Other"
    if re.search(r"^white", x, re.I):
        return "White Non-College"
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

def recode_recall(x):
    x = str(x).strip()
    if re.search(r"trump|republican|rep\b|gop",              x, re.I): return "Trump"
    if re.search(r"harris|biden|democrat|dem\b|kamala",      x, re.I): return "Harris"
    if re.search(r"third|other|independ|libertarian|green|rfk|kennedy|jo\b|jorgensen|west\b", x, re.I):
        return "Third Party"
    if re.search(r"did not|didn.?t|not vote|no vote|ineligible|wasn.?t|dnv", x, re.I):
        return "Did not vote"
    return None

# ---- detect columns ----
age_col = next((c for c in df.columns if c == "Age" or c.startswith("Age")), None)

gender_col = None
for gc in ["TPSI Gender", "Gender"]:
    if gc in df.columns:
        gender_col = gc
        break

race_source_col = None
if "RaceEdu" in df.columns:
    race_source_col = "RaceEdu"
    print("Race: using 'RaceEdu' (White split by education).")
elif "Race" in df.columns:
    race_source_col = "Race"
    print("Race: using 'Race' (no White education split).")
else:
    print("WARNING: No Race/RaceEdu column. Race weighting skipped.")

recall_col = None
for cname in ["Q13_Recall2024", "Q8_Recall2024", "Recall2024",
              "Vote2024_Bucket", "recall_vote", "2024 vote", "Q13", "Q8"]:
    if cname in df.columns:
        recall_col = cname
        break
if recall_col is None:
    for c in df.columns:
        if re.search(r"recall|2024.vote|voted.for|vote2024", c, re.I):
            recall_col = c
            break

df["age_w"]    = df[age_col].apply(recode_age)              if age_col         else None
df["gender_w"] = df[gender_col].apply(recode_gender)        if gender_col      else None
df["race_w"]   = df[race_source_col].apply(recode_race_edu) if race_source_col else None
df["edu_w"]    = df["Education"].apply(recode_education)    if "Education" in df.columns else None
df["region_w"] = df["region_mapped"]
df["recall_w"] = df[recall_col].apply(recode_recall)        if recall_col      else None

print("\nDemographic recoding — missingness:")
weight_vars = ["age_w", "gender_w", "race_w", "edu_w", "region_w", "recall_w"]
for v in weight_vars:
    if df[v].isna().all():
        print(f"  {v:<12} (column not found — skipped from weighting)")
    else:
        n_miss = df[v].isna().sum()
        print(f"  {v:<12} {n_miss:4d} missing ({n_miss/len(df)*100:.1f}%)")

print("\nDemographic recode value counts (RAW SAMPLE, unweighted):")
for v in weight_vars:
    if df[v].notna().any():
        vc = df[v].value_counts(dropna=False)
        print(f"  {v}:")
        for val, cnt in vc.items():
            print(f"    {str(val):<42} n={cnt}")

# Fill missing demos with modal value
def modal(s):
    s2 = s.dropna()
    return s2.value_counts().index[0] if len(s2) > 0 else "Unknown"

for v in ["age_w", "gender_w", "race_w", "edu_w", "region_w"]:
    if df[v].notna().any():
        df[v] = df[v].fillna(modal(df[v]))

print()

# ══════════════════════════════════════════════════════════════════════════════
# 4.  RIM / ITERATIVE PROPORTIONAL FITTING  (no external library)
# ══════════════════════════════════════════════════════════════════════════════
print("─" * 70)
print("  STEP 1: RIM Raking (Iterative Proportional Fitting)")
print("─" * 70)

# ── Target margins (proportions, must sum to 1.0 each) ──────────────────────
TARGET_AGE = {
    "18-29": 0.180, "30-44": 0.235, "45-64": 0.335, "65+": 0.250,
}
TARGET_GENDER = {
    "Female": 0.533, "Male": 0.467,
}
TARGET_RACE = {
    "White Non-College": 0.352, "White College": 0.262,
    "Black": 0.176, "Hispanic": 0.168, "Asian/Other": 0.042,
}
TARGET_EDU = {
    "HS or less": 0.340, "Some college": 0.300,
    "Bachelor's": 0.220, "Postgraduate": 0.140,
}
TARGET_REGION = {
    "South Florida":               0.245,
    "Southeast / Treasure Coast":  0.043,
    "Central Florida":             0.218,
    "Tampa Bay / Southwest":       0.269,
    "North Florida / First Coast": 0.108,
    "North Central Florida":       0.043,
    "Florida Panhandle":           0.073,
}
# Recall target applies only to Trump / Harris / Third Party voters.
# "Did not vote" respondents are kept in the sample but excluded from
# the recall rake — their recall weight factor stays 1.0.
TARGET_RECALL_VOTERS = {
    "Trump": 0.563, "Harris": 0.432, "Third Party": 0.005,
}

ALL_TARGETS_RAW = {
    "age_w":    (TARGET_AGE,    df["age_w"]),
    "gender_w": (TARGET_GENDER, df["gender_w"]),
    "race_w":   (TARGET_RACE,   df["race_w"]),
    "edu_w":    (TARGET_EDU,    df["edu_w"]),
    "region_w": (TARGET_REGION, df["region_w"]),
    # recall is handled separately below
}

def build_target(target_dict, observed_series):
    """
    Keep only categories present in the data.
    Renormalise remaining proportions so they sum to 1.
    Returns None if fewer than 2 categories match (no variance to rake).
    """
    present = set(observed_series.dropna().unique())
    sub     = {k: v for k, v in target_dict.items() if k in present}
    if len(sub) < 2:
        if sub:
            print(f"    NOTE: only one category ({list(sub.keys())}) — variable skipped (no variance).")
        return None
    total = sum(sub.values())
    return {k: v / total for k, v in sub.items()}   # proportions, not %

# Build active targets
active_targets = {}   # var_name → {cat: proportion}
skipped_vars   = []

for var, (tgt, series) in ALL_TARGETS_RAW.items():
    result = build_target(tgt, series)
    if result is None:
        skipped_vars.append(var)
        print(f"  Skipping {var} (no usable variance)")
    else:
        active_targets[var] = result

# Recall: only rake over voters (Trump / Harris / Third Party)
recall_voters_mask = df["recall_w"].isin(["Trump", "Harris", "Third Party"]) if df["recall_w"].notna().any() else pd.Series(False, index=df.index)
if recall_col and recall_voters_mask.sum() >= 2:
    recall_tgt = build_target(TARGET_RECALL_VOTERS, df.loc[recall_voters_mask, "recall_w"])
    if recall_tgt:
        active_targets["recall_w"] = recall_tgt   # subset handled inside raker
    else:
        skipped_vars.append("recall_w")
else:
    skipped_vars.append("recall_w")
    print("  Skipping recall_w (not enough voter categories)")

print(f"\n  Raking variables: {list(active_targets.keys())}")
print(f"  Skipped:          {skipped_vars}")

# ── Core IPF raker ─────────────────────────────────────────────────────────
WEIGHT_CAP   = 5.0
WEIGHT_FLOOR = 0.2
MAX_ITER     = 1000
CONVERGENCE  = 1e-4

weights = np.ones(len(df), dtype=float)
n_total = float(len(df))

converged   = False
n_iter_used = 0

for iteration in range(MAX_ITER):
    max_delta = 0.0

    for var, targets in active_targets.items():
        # For recall, only adjust weights of Trump/Harris/Third Party voters
        if var == "recall_w":
            base_mask = recall_voters_mask.values
        else:
            base_mask = np.ones(len(df), dtype=bool)

        base_wt_sum = weights[base_mask].sum()

        for cat, tgt_prop in targets.items():
            if var == "recall_w":
                cat_mask = base_mask & (df["recall_w"] == cat).values
            else:
                cat_mask = (df[var] == cat).values

            cat_wt_sum = weights[cat_mask].sum()
            if cat_wt_sum == 0:
                continue

            # What proportion does this category currently represent in its universe?
            cur_prop = cat_wt_sum / base_wt_sum
            scale    = tgt_prop / cur_prop
            delta    = abs(cur_prop - tgt_prop)
            if delta > max_delta:
                max_delta = delta

            weights[cat_mask] *= scale

        # Cap and floor after each variable
        weights = np.clip(weights, WEIGHT_FLOOR, WEIGHT_CAP)

    n_iter_used = iteration + 1
    if max_delta < CONVERGENCE:
        converged = True
        break

# Renormalise so mean weight = 1.0
weights = weights / weights.mean()

df["design_wt"] = weights

# ── Convergence report ─────────────────────────────────────────────────────
print(f"\n  {'Converged' if converged else 'DID NOT CONVERGE'} in {n_iter_used} iteration(s).")
print(f"  Design weight range: {weights.min():.4f} – {weights.max():.4f}  "
      f"(mean={weights.mean():.4f}  std={weights.std():.4f})")

# DEFF
deff = (weights**2).mean() / (weights.mean()**2)
eff  = 1.0 / deff * 100
print(f"  Design effect (DEFF): {deff:.3f}   Weighting efficiency: {eff:.1f}%")

# Verify margins
print("\n  Margin verification (weighted vs target):")
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
            mask = df[var] == cat
            got  = df.loc[mask, "design_wt"].sum() / universe_wt
            flag = "✓" if abs(got - tgt) < 0.005 else "✗"
            print(f"    {flag} {var}={cat:<30} target={tgt:.3f}  got={got:.3f}  Δ={got-tgt:+.4f}")
print()

# ══════════════════════════════════════════════════════════════════════════════
# 5.  LIKELY VOTER SCORING  (0–16 points)
# ══════════════════════════════════════════════════════════════════════════════
print("─" * 70)
print("  STEP 2: Likely Voter Scoring (0–16 pts)")
print("─" * 70)

def get_col(colname):
    """Return column by exact name or prefix match; empty series if absent."""
    if colname in df.columns:
        return df[colname]
    for c in df.columns:
        if c.startswith(colname):
            print(f"    NOTE: Matched '{colname}' → '{c}'")
            return df[c]
    return pd.Series([""] * len(df), index=df.index)

def yes_flag(series):
    """Binary 1/0: yes / checked / selected / registered."""
    return series.astype(str).str.lower().str.contains(
        r"yes|true|^1$|checked|selected|registered", regex=True
    ).astype(int)

# ── S1: Registration  (0 or 3 pts) ─────────────────────────────────────────
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
    s_reg = yes_flag(df[reg_col]) * 3
    print(f"  Registration: '{reg_col}'")
else:
    s_reg = pd.Series(3, index=df.index, dtype=int)
    print("  WARNING: No registration column — treating all as registered (3 pts).")

# ── S2: Vote history  (0–7 pts, recency-weighted) ───────────────────────────
_hp2 = "Q2: Which of the following election years did you vote in at least once? (Select all that apply)_"
_hp3 = "Q3: Which of the following election years did you vote in at least once?_"
hp   = _hp3 if any(c.startswith(_hp3) for c in df.columns) else _hp2

s_history = (
    yes_flag(get_col(hp + "2024 - Presidential Election")) * 3 +
    yes_flag(get_col(hp + "2022 - Midterm Elections"))     * 2 +
    yes_flag(get_col(hp + "2020 - Presidential Election")) * 3 +
    yes_flag(get_col(hp + "2018 - Midterm Elections"))      * 2 +
    yes_flag(get_col(hp + "2016 - Presidential Election")) * 2 +
    yes_flag(get_col(hp + "2014 - Midterm Elections"))      * 1 +
    yes_flag(get_col(hp + "I voted in an election that occurred before the options above")) * 1 -
    yes_flag(get_col(hp + "I did not vote in any of these elections / wasn't eligible to vote")) * 5
).clip(0, 7)

# ── S3: Motivation / plan certainty  (0–4 pts; take the stronger signal) ────
def score_motivation(series):
    x = series.astype(str).str.lower().str.strip()
    s = pd.Series(2, index=series.index, dtype=int)
    s[x.str.contains(r"extremely|absolutely|definitely|certain|10|100%", regex=True)] = 4
    s[x.str.contains(r"very|probably will|likely|8|9",                   regex=True)] = 3
    s[x.str.contains(r"somewhat|maybe|50.50|toss|5|6|7",                 regex=True)] = 2
    s[x.str.contains(r"not very|probably not|unlikely|3|4",              regex=True)] = 1
    s[x.str.contains(r"not at all|no|definitely not|^1$|^2$",            regex=True)] = 0
    return s

def score_plan_certainty(series):
    x = series.astype(str).str.lower().str.strip()
    s = pd.Series(2, index=series.index, dtype=int)
    s[x.str.contains(r"yes.*know both|know both",       regex=True)] = 4
    s[x.str.contains(r"know one|i know one",            regex=True)] = 3
    s[x.str.contains(r"plan to figure|not yet.*plan",   regex=True)] = 2
    s[x.str.contains(r"do not plan|don.?t plan",        regex=True)] = 0
    return s

q3_col = next((c for c in df.columns if re.search(r"Q3.*motiv|motiv.*Q3", c, re.I)), None)
q4_col = next((c for c in df.columns if re.search(r"Q4.*plan|plan.*Q4|Q4.*certain", c, re.I)), None)
if "Q3_Motivation"   in df.columns: q3_col = "Q3_Motivation"
if "Q4_PlanCertainty" in df.columns: q4_col = "Q4_PlanCertainty"

print(f"  Motivation:      '{q3_col}'")
print(f"  Plan certainty:  '{q4_col}'")

s_motiv = score_motivation(   get_col(q3_col) if q3_col else pd.Series([""] * len(df)))
s_plan  = score_plan_certainty(get_col(q4_col) if q4_col else pd.Series([""] * len(df)))
s_combined = pd.concat([s_motiv, s_plan], axis=1).max(axis=1)

# ── S4: Social norm  (0–2 pts) ──────────────────────────────────────────────
q5_col = next((c for c in df.columns if re.search(r"Q5.*others|others.*Q5|Q5.*social", c, re.I)), None)
if "Q5_OthersVoting" in df.columns: q5_col = "Q5_OthersVoting"
print(f"  Social norm:     '{q5_col}'")

raw5 = get_col(q5_col).astype(str).str.lower().str.strip() if q5_col else pd.Series([""] * len(df))
s_others = pd.Series(1, index=df.index, dtype=int)
s_others[raw5.str.contains(r"most|all|everyone|very likely|definitely|all or nearly all", regex=True)] = 2
s_others[raw5.str.contains(r"some|about half|likely|probably",                            regex=True)] = 1
s_others[raw5.str.contains(r"few|none|unlikely|don.?t know|a few",                        regex=True)] = 0

df["lv_raw"] = (s_reg + s_history + s_combined + s_others).clip(0, 16).astype(float)

print(f"\n  Score range: {int(df['lv_raw'].min())} – {int(df['lv_raw'].max())}"
      f"   mean={df['lv_raw'].mean():.2f}")

# ══════════════════════════════════════════════════════════════════════════════
# 6.  FIT LOGISTIC CURVE  →  LV PROBABILITIES
# ══════════════════════════════════════════════════════════════════════════════
print("\n─" * 70)
print("  STEP 3: Fit Logistic Curve to Weighted Score CDF")
print("─" * 70)

scores_arr  = df["lv_raw"].values
weights_arr = df["design_wt"].values

def weighted_median(vals, wts):
    order  = np.argsort(vals)
    v_s    = vals[order]
    w_s    = wts[order]
    cumw   = np.cumsum(w_s) / w_s.sum()
    idx    = np.searchsorted(cumw, 0.50)
    return float(v_s[min(idx, len(v_s) - 1)])

midpoint = weighted_median(scores_arr, weights_arr)
print(f"  Weighted-median LV score (inflection point): {midpoint:.3f}")

unique_scores = np.unique(scores_arr)
ecdf_vals     = np.array([
    np.sum(weights_arr[scores_arr <= s]) / weights_arr.sum()
    for s in unique_scores
])

def logistic(x, k):
    return 1.0 / (1.0 + np.exp(-k * (x - midpoint)))

try:
    popt, _ = curve_fit(logistic, unique_scores, ecdf_vals,
                        p0=[0.6], bounds=(0.1, 5.0), maxfev=5000)
    k_fit = float(popt[0])
    print(f"  Fitted steepness k = {k_fit:.4f}")
except Exception as e:
    k_fit = 1.2
    print(f"  curve_fit failed ({e}) — using k={k_fit}")

area, _         = quad(logistic, 0, 16, args=(k_fit,))
implied_turnout = area / 16.0
print(f"  Implied turnout fraction: {implied_turnout*100:.1f}%")

# ══════════════════════════════════════════════════════════════════════════════
# 7.  BUILD LV WEIGHTS
# ══════════════════════════════════════════════════════════════════════════════
df["lv_prob"] = 1.0 / (1.0 + np.exp(-k_fit * (df["lv_raw"] - midpoint)))
df["lv_wt"]   = df["design_wt"] * df["lv_prob"]
# Renormalise: keep the LV universe at the same total weight as the RV universe
df["lv_wt"]   = df["lv_wt"] * (df["design_wt"].sum() / df["lv_wt"].sum())

print(f"\n  Mean LV probability : {df['lv_prob'].mean()*100:.1f}%")
print(f"  Effective LV N      : {df['lv_prob'].sum():.0f}")
print(f"  LV weight range     : {df['lv_wt'].min():.4f} – {df['lv_wt'].max():.4f}\n")

# ══════════════════════════════════════════════════════════════════════════════
# 8.  IDENTIFY POLL QUESTION COLUMNS
# ══════════════════════════════════════════════════════════════════════════════
LV_SCREEN_PREFIXES = (
    "Q1_Registration", "Q1: The following survey",
    "Q2: Which of the following",
    "Q3: Which of the following election years",
    "Q3_Motivation", "Q4_PlanCertainty", "Q5_OthersVoting",
)

SKIP_COLS = {
    "Age", "Gender", "TPSI Gender", "TPSI State", "Race", "RaceEdu",
    "Education", "Party", "Party_Detailed",
    "Household income US", "US Zip Code", "US Region", "US Division",
    "US Statistical Area (CBSA)", "US County", "Employment Status",
    "Region", "Florida Region",
    "respondent_id", "design_wt", "lv_wt", "lv_raw", "lv_prob",
    "region_mapped", "age_w", "gender_w", "race_w", "edu_w", "region_w", "recall_w",
}
if recall_col:
    SKIP_COLS.add(recall_col)

poll_cols = [
    c for c in df.columns
    if c not in SKIP_COLS
    and not any(c.startswith(p) for p in LV_SCREEN_PREFIXES)
    and re.match(r"^Q[0-9]+", c, re.I)
]

print(f"Poll questions for output: {len(poll_cols)}")
for c in poll_cols:
    print(f"  {c[:100]}")
print()

# ══════════════════════════════════════════════════════════════════════════════
# 9.  OUTPUT HELPERS
# ══════════════════════════════════════════════════════════════════════════════
def freq_tbl(series, weights):
    tmp = pd.DataFrame({"val": series.astype(str), "w": weights})
    tmp = tmp[tmp["val"].str.strip() != ""]
    g   = tmp.groupby("val")["w"].sum().sort_index()
    tot = g.sum()
    return pd.DataFrame({
        "Response": g.index,
        "Pct":      g.values / tot,
        "N_wtd":    g.values,
    }).reset_index(drop=True)

def xtab_with_total(q_series, b_series, weights):
    """
    Returns a DataFrame:
      index   = response categories (rows)
      columns = "Total" + subgroup categories
    Values are column percentages (0–100).
    """
    tmp = pd.DataFrame({
        "q": q_series.astype(str),
        "b": b_series.astype(str),
        "w": weights,
    })
    tmp = tmp[(tmp["q"].str.strip() != "") & (tmp["b"].str.strip() != "")]

    # Total column
    total_g   = tmp.groupby("q")["w"].sum()
    total_pct = (total_g / total_g.sum() * 100).round(1)

    # Subgroup columns (column %)
    ct = tmp.pivot_table(index="q", columns="b", values="w",
                         aggfunc="sum", fill_value=0)
    ct_pct = (ct.div(ct.sum(axis=0)) * 100).round(1)

    all_resp   = total_pct.index.union(ct_pct.index)
    total_pct  = total_pct.reindex(all_resp, fill_value=0.0)
    ct_pct     = ct_pct.reindex(all_resp, fill_value=0.0)

    result            = pd.concat([total_pct.rename("Total"), ct_pct], axis=1)
    result.index.name = "q"
    return result

RACE_COL_ORDER = [
    "White Non-College", "White College", "Black", "Hispanic", "Asian/Other",
]
REGION_COL_ORDER = [
    "South Florida", "Southeast / Treasure Coast", "Central Florida",
    "Tampa Bay / Southwest", "North Florida / First Coast",
    "North Central Florida", "Florida Panhandle",
]

def order_columns(ct, breakdown_var):
    non_total = [c for c in ct.columns if c != "Total"]
    if breakdown_var == "race_w":
        ordered   = [c for c in RACE_COL_ORDER   if c in non_total]
        remainder = [c for c in non_total         if c not in RACE_COL_ORDER]
    elif breakdown_var == "region_w":
        ordered   = [c for c in REGION_COL_ORDER if c in non_total]
        remainder = [c for c in non_total         if c not in REGION_COL_ORDER]
    else:
        ordered, remainder = [], non_total
    return ct[["Total"] + ordered + remainder]

def render_freq(tbl, label=""):
    if tbl is None or len(tbl) == 0:
        return "  (no data)"
    lines = ([label] if label else []) + [
        f"    {str(r['Response']):<46} {r['Pct']*100:5.1f}%  (n={r['N_wtd']:.0f})"
        for _, r in tbl.iterrows()
    ]
    return "\n".join(lines)

def render_xtab(ct):
    if ct is None or ct.empty:
        return "  (no data)"
    cols  = ct.columns.tolist()
    CW    = 16
    RW    = 42
    hdr   = " " * (RW + 2) + "".join(f"{str(c)[:CW-1]:<{CW}}" for c in cols)
    rows  = [hdr]
    for rn in ct.index:
        cells = "".join(f"{str(ct.loc[rn, c])+'%':<{CW}}" for c in cols)
        rows.append(f"  {str(rn)[:RW]:<{RW}} {cells}")
    return "\n".join(rows)

DIV = "=" * 100
div = "-" * 100

# ══════════════════════════════════════════════════════════════════════════════
# 10. BUILD REPORT
# ══════════════════════════════════════════════════════════════════════════════
lines = []
lines += [
    DIV,
    "  POLL RESULTS — TOPLINES & CROSSTABS",
    f"  Generated:            {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
    f"  Input file:           {input_file}",
    f"  Total N (unweighted): {len(df):,}",
    f"  Poll questions:       {len(poll_cols)}",
    f"  Race source column:   {race_source_col or 'NOT FOUND'}",
    DIV, "",
]

# ── Weighting engine report ─────────────────────────────────────────────────
lines += [DIV, "  RAKING ENGINE REPORT", DIV]
lines += [
    f"  Method:                Iterative Proportional Fitting (RIM / raking)",
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

# ── Sample composition ──────────────────────────────────────────────────────
lines += [DIV, "  SAMPLE COMPOSITION (Design-Weighted RV Universe)", DIV, ""]
COMP_LABELS = {
    "age_w":    "Age",
    "gender_w": "Gender",
    "race_w":   "Race / Ethnicity",
    "edu_w":    "Education",
    "region_w": "Florida Region",
    "recall_w": "2024 Recall Vote",
}
for v, lbl in COMP_LABELS.items():
    if df[v].notna().any():
        lines += [div, f"  {lbl}", div]
        lines.append(render_freq(freq_tbl(df[v], df["design_wt"])))
        lines.append("")

# ── LV diagnostics ──────────────────────────────────────────────────────────
lines += [DIV, "  LIKELY VOTER MODEL DIAGNOSTICS", DIV]
lines += [
    "  Method: Logistic curve fit to empirical weighted CDF of LV scores.",
    f"  Inflection point (weighted-median score): {midpoint:.3f}",
    f"  Fitted steepness k:                       {k_fit:.4f}",
    f"  Implied turnout fraction:                 {implied_turnout*100:.1f}%",
    f"  Mean LV probability:                      {df['lv_prob'].mean()*100:.1f}%",
    f"  Effective LV N:                           {df['lv_prob'].sum():.0f}",
    f"  Design weight range:                      {weights.min():.4f} – {weights.max():.4f}",
    f"  LV weight range:                          {df['lv_wt'].min():.4f} – {df['lv_wt'].max():.4f}",
    "",
    "  Component means (all respondents, unweighted):",
    f"    Registration  : {s_reg.mean():.2f} / 3",
    f"    Vote history  : {s_history.mean():.2f} / 7",
    f"    Motivation    : {s_combined.mean():.2f} / 4",
    f"    Social norm   : {s_others.mean():.2f} / 2",
    f"    TOTAL raw     : {df['lv_raw'].mean():.2f} / 16",
    "",
    "  LV score distribution (design-weighted):",
]
for sc in sorted(df["lv_raw"].unique()):
    mask = df["lv_raw"] == sc
    wt_  = df.loc[mask, "design_wt"].sum() / df["design_wt"].sum() * 100
    prob = df.loc[mask, "lv_prob"].mean() * 100
    lines.append(f"    Score {sc:4.0f}:  {wt_:5.1f}% of RVs  → LV prob {prob:5.1f}%")
lines.append("")

# ── Toplines ────────────────────────────────────────────────────────────────
lines += [DIV, "  TOPLINES", DIV, ""]
for qv in poll_cols:
    tbl_rv = freq_tbl(df[qv], df["design_wt"])
    tbl_lv = freq_tbl(df[qv], df["lv_wt"])
    lines += [div, f"  {qv}", div]
    lines.append(render_freq(tbl_rv, "  Registered Voters (RV):"))
    lines.append("")
    lines.append(render_freq(tbl_lv, "  Likely Voters (LV):"))
    lines.append("")

# ── Crosstabs ───────────────────────────────────────────────────────────────
BY_VARS = {
    "gender_w": "Gender",
    "age_w":    "Age",
    "race_w":   "Race",
    "edu_w":    "Education",
    "region_w": "Florida Region",
}

lines += [
    DIV,
    "  CROSSTABS  (Likely Voter weights — column percentages)",
    "  Total % = overall; subgroup columns show within-subgroup distribution.",
    "  Race: White Non-College | White College | Black | Hispanic | Asian/Other",
    "  Region: South FL → Treasure Coast → Central → Tampa Bay → N. FL → N. Central → Panhandle",
    DIV, "",
]

crosstab_rows = []
for qv in poll_cols:
    for bv, blab in BY_VARS.items():
        if df[bv].isna().all():
            continue
        ct_raw = xtab_with_total(df[qv], df[bv], df["lv_wt"])
        ct     = order_columns(ct_raw, bv)
        lines += [div, f"  {qv[:55]:<55}  ×  {blab}", div]
        lines.append(render_xtab(ct))
        lines.append("")

        # Collect for CSV
        for rn in ct.index:
            row = {"Question": qv, "Breakdown": blab, "Response": rn}
            for col in ct.columns:
                row[col] = ct.loc[rn, col]
            crosstab_rows.append(row)

lines += [DIV, "  END OF REPORT", DIV]

# ══════════════════════════════════════════════════════════════════════════════
# 11.  WRITE OUTPUT FILES
# ══════════════════════════════════════════════════════════════════════════════
with open(output_file, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

stem         = re.sub(r"\.txt$", "", output_file)
data_csv     = stem + "_weighted_data.csv"
crosstab_csv = stem + "_crosstabs.csv"

df.to_csv(data_csv, index=False)

if crosstab_rows:
    crosstab_df = pd.DataFrame(crosstab_rows)

    fixed  = ["Question", "Breakdown", "Response", "Total"]
    others = [c for c in crosstab_df.columns if c not in fixed]

    def _sort_key(col):
        if col in RACE_COL_ORDER:   return (0, RACE_COL_ORDER.index(col))
        if col in REGION_COL_ORDER: return (1, REGION_COL_ORDER.index(col))
        return (2, col)

    others.sort(key=_sort_key)
    final_cols = [c for c in fixed + others if c in crosstab_df.columns]
    crosstab_df[final_cols].to_csv(crosstab_csv, index=False)
else:
    pd.DataFrame(columns=["Question", "Breakdown", "Response", "Total"]).to_csv(
        crosstab_csv, index=False
    )

print(f"\n✅  Report txt   : {output_file}")
print(f"✅  Weighted CSV : {data_csv}")
print(f"✅  Crosstabs CSV: {crosstab_csv}")
print("\nDone.")