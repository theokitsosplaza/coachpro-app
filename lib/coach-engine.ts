/**
 * CoachPro — Deterministic Coach Engine
 * ---------------------------------------------------------------------------
 * This file is the BRAIN'S RULEBOOK. It does 100% of the trend math and all
 * the safety checks using plain arithmetic — NO AI. That is deliberate:
 *
 *   - A number is a number. It can never "hallucinate" a wrong macro target
 *     or quietly skip a safety warning.
 *   - Every threshold lives in ENGINE_CONFIG below, so you can tune the whole
 *     system from one place without touching the logic.
 *   - The AI layer (built next) only READS the output of this file. It turns
 *     these structured flags into a friendly, coach-voice message. It never
 *     does the math itself.
 *
 * All functions are pure (same input -> same output, no database calls), which
 * makes them trivially testable. See coach-engine.test.ts for live examples.
 * ---------------------------------------------------------------------------
 */

// ===========================================================================
// 1. TYPES  (these mirror your Supabase tables — feed real rows straight in)
// ===========================================================================

export type Goal = 'fat_loss' | 'muscle_gain' | 'maintenance' | 'recomp';

export interface ClientInput {
  id: string;
  name: string;
  goal: string; // raw text from the DB; normalised internally
  currentPhase?: string | null;
  targetProtein: number; // grams/day
  targetCarbs: number; // grams/day
  targetFats: number; // grams/day
}

export interface CheckInInput {
  id: string;
  date: string | Date; // CheckIn.date (timestamp)
  weight: number; // kg
  sleepScore: number; // 1-10  (ASSUMPTION: higher = better sleep — confirm)
  fatigueScore: number; // 1-10  (ASSUMPTION: higher = MORE fatigued — confirm)
  loggedProtein: number; // grams (average for the week)
  loggedCarbs: number; // grams
  loggedFats: number; // grams
  cycleAffected?: boolean; // undefined treated as false; suppresses weight-based verdicts for this check-in
}

export type Severity = 'safety' | 'warning' | 'info';
export type Triage = 'red' | 'yellow' | 'green' | 'grey'; // grey = not enough data yet

export type Action =
  | 'await_data'
  | 'hold'
  | 'adjust_macros'
  | 'address_adherence'
  | 'deload'
  | 'diet_break'
  | 'review'; // review = a human safety call is required

export interface Flag {
  code: string;
  severity: Severity;
  title: string;
  detail: string;
  suggestedAction: Action;
}

export interface MacroSet {
  protein: number;
  carbs: number;
  fats: number;
}

export interface Synthesis {
  clientId: string;
  asOf: Date;
  dataQuality: {
    checkInsUsed: number;
    windowDays: number;
    sufficient: boolean;
    warnings: string[];
  };
  weight: {
    latest: number | null;
    ratePerWeekPct: number | null; // negative = losing, positive = gaining
    direction: 'losing' | 'gaining' | 'flat' | null;
    vsGoal: string; // plain-language read
  };
  adherence: {
    calorieRatio: number; // logged kcal / target kcal (1.0 = on target)
    proteinRatio: number;
    carbRatio: number;
    fatRatio: number;
    status: 'on_plan' | 'under' | 'over' | 'unknown'; // by CALORIES vs prescription
  };
  flags: Flag[]; // sorted: safety first, then warnings, then info
  recommendation: {
    action: Action;
    headline: string; // machine summary (the AI rephrases this for the coach)
    proposedMacros: MacroSet | null;
    rationale: string;
  };
  triage: Triage;
}

// ===========================================================================
// 2. CONFIG  (every threshold the system uses — tune here, nowhere else)
// ===========================================================================

export const ENGINE_CONFIG = {
  weightUnit: 'kg',

  // --- Scale-direction assumptions. CONFIRM THESE with Kostas. ---
  sleepHigherIsBetter: true,
  fatigueHigherIsWorse: true,

  // --- Trend window ---
  // Check-ins are weekly, so 14 days is only ~2 points. We use 28 days for a
  // stable trend while honouring the "never react to a single day" principle.
  trendWindowDays: 28,
  minCheckInsForTrend: 2,
  flatThresholdPctPerWeek: 0.15, // |rate| below this counts as "flat"

  // --- Weight velocity, in % of bodyweight per week ---
  fatLoss: { idealMin: 0.5, idealMax: 1.0, stallBelow: 0.3 },
  muscleGain: { idealMin: 0.1, idealMax: 0.5, fastAbove: 0.75 },
  maintenance: { band: 0.25 },

  // --- Macro adherence ---
  adherenceTolerance: 0.1, // within 10% of target = "on plan"
  poorAdherenceBelow: 0.8, // hitting < 80% of target = poor

  // --- Fatigue ---
  fatigueRisingDelta: 2, // recent avg up by >= 2 points vs prior avg

  // --- Macro adjustment sizing ---
  cutAdjustPct: 0.07, // reduce intake ~7% to break a stall
  gainAdjustPct: 0.06, // increase intake ~6% to resume gaining
  trimSurplusPct: 0.05, // shave surplus when gaining too fast
  roundMacrosTo: 5, // round proposed grams to nearest 5g
  floorFats: 40, // never propose fats below this (hormonal health)
  floorCarbs: 50, // never propose carbs below this

  // --- Wellbeing attention thresholds (single-week, absolute) ---
  // Soft signals that sit BELOW the hard safety brakes: they flag a client for a
  // look (triage -> yellow via a 'warning' flag) but never null macros or force
  // 'review'. They fill the gap between "fine" and "collapse". These mirror the
  // UI's red stat-card bands (see AICheckInsClient sleepColor/fatigueColor) so a
  // red card always has a matching flag. Tune with real coaches.
  wellbeing: {
    sleepLowAtOrBelow: 4,    // latest sleepScore <= this  -> SLEEP_LOW (warning)
    fatigueHighAtOrAbove: 7, // latest fatigueScore >= this -> FATIGUE_HIGH (warning)
  },

  // --- HARD SAFETY BRAKES (the AI can never override these) ---
  safety: {
    rapidLossRatePerWeek: 1.5, // % bodyweight/week -> too fast
    sleepCollapseAtOrBelow: 4, // sleepScore at or under this
    sleepCollapseConsecutive: 2, // for this many consecutive check-ins
  },
} as const;

// ===========================================================================
// 3. SMALL HELPERS
// ===========================================================================

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

function round(n: number, step: number): number {
  return Math.round(n / step) * step;
}

/** Map whatever free-text goal is in the DB onto our four canonical goals. */
export function normalizeGoal(raw: string): Goal | null {
  const g = (raw || '').toLowerCase();
  if (/(cut|fat[\s_-]?loss|lose|lean[\s_-]?down|deficit|shred|diet)/.test(g)) return 'fat_loss';
  if (/(bulk|gain|mass|build|surplus|grow)/.test(g)) return 'muscle_gain';
  if (/(recomp|recomposition)/.test(g)) return 'recomp';
  if (/(maintain|maintenance|hold)/.test(g)) return 'maintenance';
  return null; // unknown -> engine will flag for manual review
}

/** Sort newest-last so the most recent check-in is the final element. */
function sortByDate(checkins: CheckInInput[]): CheckInInput[] {
  return [...checkins].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());
}

/** Least-squares slope of weight (kg) over time, returned as %/week. */
function weightRatePerWeekPct(checkins: CheckInInput[]): number | null {
  if (checkins.length < ENGINE_CONFIG.minCheckInsForTrend) return null;
  const t0 = toDate(checkins[0].date).getTime();
  const xs = checkins.map((c) => (toDate(c.date).getTime() - t0) / 86_400_000); // days
  const ys = checkins.map((c) => c.weight);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  if (den === 0) return null;
  const slopePerDay = num / den; // kg/day
  if (meanY === 0) return null;
  return ((slopePerDay * 7) / meanY) * 100; // %/week
}

// ===========================================================================
// 4. MACRO ADHERENCE
// ===========================================================================

function safeRatio(logged: number, target: number): number {
  if (!target || target <= 0) return 1; // no target set -> treat as "on plan"
  return logged / target;
}

function macroKcal(p: number, c: number, f: number): number {
  return p * 4 + c * 4 + f * 9;
}

function computeAdherence(client: ClientInput, checkins: CheckInInput[]): Synthesis['adherence'] {
  if (!checkins.length) {
    return { calorieRatio: 1, proteinRatio: 1, carbRatio: 1, fatRatio: 1, status: 'unknown' };
  }
  const n = checkins.length;
  const avg = (sel: (c: CheckInInput) => number) => checkins.reduce((a, c) => a + sel(c), 0) / n;
  const loggedP = avg((c) => c.loggedProtein);
  const loggedC = avg((c) => c.loggedCarbs);
  const loggedF = avg((c) => c.loggedFats);

  const targetKcal = macroKcal(client.targetProtein, client.targetCarbs, client.targetFats);
  const loggedKcal = macroKcal(loggedP, loggedC, loggedF);
  const calorieRatio = targetKcal > 0 ? loggedKcal / targetKcal : 1;

  const tol = ENGINE_CONFIG.adherenceTolerance;
  let status: Synthesis['adherence']['status'];
  if (calorieRatio > 1 + tol) status = 'over'; // eating ABOVE the prescription
  else if (calorieRatio < 1 - tol) status = 'under'; // eating BELOW the prescription
  else status = 'on_plan';

  return {
    calorieRatio,
    proteinRatio: safeRatio(loggedP, client.targetProtein),
    carbRatio: safeRatio(loggedC, client.targetCarbs),
    fatRatio: safeRatio(loggedF, client.targetFats),
    status,
  };
}

// ===========================================================================
// 5. HARD SAFETY BRAKES  (always evaluated; cannot be overridden downstream)
// ===========================================================================

function safetyBrakes(checkins: CheckInInput[], ratePct: number | null): Flag[] {
  const flags: Flag[] = [];
  const s = ENGINE_CONFIG.safety;

  // (1) Rapid weight loss
  if (ratePct !== null && ratePct < 0 && Math.abs(ratePct) > s.rapidLossRatePerWeek) {
    flags.push({
      code: 'SAFETY_RAPID_LOSS',
      severity: 'safety',
      title: 'Weight dropping too fast',
      detail:
        `Trend is about ${Math.abs(ratePct).toFixed(1)}% of bodyweight per week, ` +
        `above the ${s.rapidLossRatePerWeek}% safe ceiling. Check for under-eating, ` +
        `excessive cardio, or illness before any further deficit.`,
      suggestedAction: 'review',
    });
  }

  // (2) Sleep collapse — adapted from the spec's "5 consecutive days" to
  //     consecutive weekly check-ins, since data arrives weekly not daily.
  const recent = checkins.slice(-s.sleepCollapseConsecutive);
  if (
    recent.length === s.sleepCollapseConsecutive &&
    recent.every((c) => c.sleepScore <= s.sleepCollapseAtOrBelow)
  ) {
    flags.push({
      code: 'SAFETY_SLEEP_COLLAPSE',
      severity: 'safety',
      title: 'Sleep has collapsed',
      detail:
        `Sleep has been at or below ${s.sleepCollapseAtOrBelow}/10 for ` +
        `${s.sleepCollapseConsecutive} check-ins running. Prioritise recovery and ` +
        `lifestyle factors over macro precision right now.`,
      suggestedAction: 'review',
    });
  }

  // (3) Digestion / bloating "Hard Stop" — FROM GEMINI'S SPEC, NOT YET POSSIBLE.
  //     The CheckIn table has no digestion or qualitative-notes field, so this
  //     rule cannot run. To enable it later, add `digestionScore` (int4) or a
  //     `notes` (text) column to CheckIn and uncomment digestionHardStop().
  //     flags.push(...digestionHardStop(checkins));

  return flags;
}

// ===========================================================================
// 6. FATIGUE TREND
// ===========================================================================

function fatigueFlag(checkins: CheckInInput[]): Flag | null {
  if (checkins.length < 4) return null; // need 2 recent + 2 prior to compare
  const recent = checkins.slice(-2);
  const prior = checkins.slice(-4, -2);
  const avg = (arr: CheckInInput[]) => arr.reduce((a, c) => a + c.fatigueScore, 0) / arr.length;
  const delta = avg(recent) - avg(prior);
  if (delta >= ENGINE_CONFIG.fatigueRisingDelta) {
    return {
      code: 'FATIGUE_RISING',
      severity: 'warning',
      title: 'Fatigue climbing',
      detail:
        `Reported fatigue rose ~${delta.toFixed(1)} points over the last two check-ins. ` +
        `Consider a deload or a cut in training volume. (Even stronger signal if ` +
        `the weights on the bar are also dropping — wire that in once workout data ` +
        `is structured.)`,
      suggestedAction: 'deload',
    };
  }
  return null;
}

// ===========================================================================
// 6b. WELLBEING ATTENTION FLAGS  (single-week absolute; warning, not safety)
// ===========================================================================
// These read only the LATEST check-in — this week's self-report — mirroring how
// weight.latest is taken from the most recent check-in. They raise a 'warning'
// (enough to turn the roster tile yellow and surface a card) WITHOUT touching
// the recommendation or proposed macros. They sit one rung below the hard
// brakes in safetyBrakes(). Contrast:
//   SAFETY_SLEEP_COLLAPSE (safety): sleep <= 4 for 2 weeks running -> red/brake
//   SLEEP_LOW (warning):            this week's sleep <= 4          -> yellow/look
//   FATIGUE_RISING (warning): fatigue trending up >= 2 pts over the window
//   FATIGUE_HIGH (warning):   this week's fatigue >= 7 (absolute)

function sleepLowFlag(latest: CheckInInput | null): Flag | null {
  if (!latest) return null;
  const threshold = ENGINE_CONFIG.wellbeing.sleepLowAtOrBelow;
  if (latest.sleepScore > threshold) return null;
  return {
    code: 'SLEEP_LOW',
    severity: 'warning',
    title: 'Poor sleep reported',
    detail:
      `Client reported sleep at ${latest.sleepScore}/10 this week, at or below the ` +
      `${threshold}/10 attention line. Check recovery, stress, and lifestyle before ` +
      `pushing the plan harder.`,
    suggestedAction: 'hold',
  };
}

function fatigueHighFlag(latest: CheckInInput | null): Flag | null {
  if (!latest) return null;
  const threshold = ENGINE_CONFIG.wellbeing.fatigueHighAtOrAbove;
  if (latest.fatigueScore < threshold) return null;
  return {
    code: 'FATIGUE_HIGH',
    severity: 'warning',
    title: 'High fatigue reported',
    detail:
      `Client reported fatigue at ${latest.fatigueScore}/10 this week, at or above the ` +
      `${threshold}/10 attention line. Weigh recovery and training load before any ` +
      `macro change.`,
    suggestedAction: 'hold',
  };
}

// ===========================================================================
// 7. MACRO ADJUSTMENT PROPOSALS  (a STARTING POINT — the coach approves/edits)
// ===========================================================================

function kcal(m: MacroSet): number {
  return m.protein * 4 + m.carbs * 4 + m.fats * 9;
}

/** Reduce intake by pct, holding protein, trimming carbs (60%) and fats (40%). */
function reduceMacros(target: MacroSet, pct: number): MacroSet {
  const deltaKcal = kcal(target) * pct;
  const carbCut = (deltaKcal * 0.6) / 4;
  const fatCut = (deltaKcal * 0.4) / 9;
  return {
    protein: target.protein, // protein is protected on a cut
    carbs: Math.max(ENGINE_CONFIG.floorCarbs, round(target.carbs - carbCut, ENGINE_CONFIG.roundMacrosTo)),
    fats: Math.max(ENGINE_CONFIG.floorFats, round(target.fats - fatCut, ENGINE_CONFIG.roundMacrosTo)),
  };
}

/** Increase intake by pct, adding mostly to carbs (the cheap training fuel). */
function increaseMacros(target: MacroSet, pct: number): MacroSet {
  const deltaKcal = kcal(target) * pct;
  const carbAdd = (deltaKcal * 0.8) / 4;
  const fatAdd = (deltaKcal * 0.2) / 9;
  return {
    protein: target.protein,
    carbs: round(target.carbs + carbAdd, ENGINE_CONFIG.roundMacrosTo),
    fats: round(target.fats + fatAdd, ENGINE_CONFIG.roundMacrosTo),
  };
}

// ===========================================================================
// 7b. ON-TRACK RATIONALE  (acknowledge warnings without contradicting them)
// ===========================================================================
// The "on track / hold" verdict must never read "no issues" while warning cards
// are on screen. onTrackRationale() is the single source of that copy;
// rationaleForFinalWarnings() lets the route re-express it for the FINAL warning
// count once downstream flags (the reflection attention flag) are merged in,
// touching ONLY the on-track fallback — every other rationale is returned as-is.

export function onTrackRationale(warningCount: number): string {
  if (warningCount <= 0) return 'No issues detected in the current window.';
  const noun = warningCount === 1 ? 'item' : 'items';
  return `On track, but ${warningCount} ${noun} flagged for your attention.`;
}

export function rationaleForFinalWarnings(
  engineRationale: string,
  engineWarningCount: number,
  finalWarningCount: number,
): string {
  return engineRationale === onTrackRationale(engineWarningCount)
    ? onTrackRationale(finalWarningCount)
    : engineRationale;
}

// ===========================================================================
// 8. MAIN ENTRY POINT
// ===========================================================================

export function analyzeClient(client: ClientInput, allCheckins: CheckInInput[]): Synthesis {
  const asOf = new Date();
  const sorted = sortByDate(allCheckins);

  // Keep only check-ins inside the trend window.
  const cutoff = Date.now() - ENGINE_CONFIG.trendWindowDays * 86_400_000;
  const windowed = sorted.filter((c) => toDate(c.date).getTime() >= cutoff);
  const used = windowed.length >= ENGINE_CONFIG.minCheckInsForTrend ? windowed : sorted;

  const latest = sorted.length ? sorted[sorted.length - 1] : null;
  const target: MacroSet = {
    protein: client.targetProtein,
    carbs: client.targetCarbs,
    fats: client.targetFats,
  };

  const goal = normalizeGoal(client.goal);
  const ratePct = weightRatePerWeekPct(used);
  const adherence = computeAdherence(client, used);

  const flags: Flag[] = [];
  const dataWarnings: string[] = [];

  // ---- Data sufficiency ----
  const sufficient = used.length >= ENGINE_CONFIG.minCheckInsForTrend && ratePct !== null;
  if (!sufficient) {
    dataWarnings.push(
      `Only ${sorted.length} check-in(s) on file. Need at least ` +
        `${ENGINE_CONFIG.minCheckInsForTrend} to read a real trend.`
    );
  }
  if (goal === null) {
    dataWarnings.push(`Goal "${client.goal}" wasn't recognised — defaulting to manual review.`);
  }

  // ---- Hard safety brakes first ----
  const safety = safetyBrakes(used, ratePct);
  flags.push(...safety);

  // ---- Weight direction ----
  let direction: Synthesis['weight']['direction'] = null;
  let vsGoal = 'Not enough data to read a trend yet.';
  let proposedMacros: MacroSet | null = null;
  let primaryAction: Action = sufficient ? 'hold' : 'await_data';
  let headline = 'On track — hold and keep monitoring.';
  let rationale = '';

  if (sufficient && ratePct !== null) {
    const flat = Math.abs(ratePct) < ENGINE_CONFIG.flatThresholdPctPerWeek;
    direction = flat ? 'flat' : ratePct < 0 ? 'losing' : 'gaining';
    const lossRate = -ratePct; // positive when losing

    // -- Cycle-affected week: suppress all weight-based verdicts ---------------
    // CONSERVATIVE v1 ASSUMPTION: hormonal water retention can mask 1-3 kg of
    // true fat/lean change, making the scale misleading for one week. Reacting
    // to it would cause unnecessary macro churn.
    // NOT modelled here: contraception effects, irregular cycles, perimenopausal
    // variation. Validate exact thresholds with real coaches before hardening.
    if (latest?.cycleAffected === true) {
      vsGoal = 'Weight may be cycle-affected this week — holding the plan.';
      primaryAction = 'hold';
      headline =
        "Weight may be cycle-affected this week — holding the plan; don't adjust macros on " +
        "this week's scale alone. Coach to use judgement.";
      rationale =
        'Coach flagged potential cycle-related weight fluctuation. Hormonal water retention ' +
        'can mask true progress. No weight-based adjustment this week; ' +
        'review next week before acting.';
      flags.push({
        code: 'CYCLE_AFFECTED',
        severity: 'info',
        title: 'Cycle-affected week',
        detail:
          "Weight may be cycle-affected — holding the plan; don't adjust on this week's " +
          'scale alone. Coach to use judgement.',
        suggestedAction: 'hold',
      });
    } else if (goal === 'fat_loss') {
      const cfg = ENGINE_CONFIG.fatLoss;
      const calPct = Math.round(adherence.calorieRatio * 100);
      if (lossRate >= cfg.idealMin && lossRate <= cfg.idealMax) {
        vsGoal = `Losing ${lossRate.toFixed(1)}%/wk — right in the target band.`;
        headline = 'Fat loss on track — hold macros.';
      } else if (lossRate < cfg.stallBelow) {
        // Stalled. The key fork: metabolism, or was the plan not followed?
        if (adherence.status === 'over') {
          vsGoal = `Loss stalled (${lossRate.toFixed(1)}%/wk); intake ~${calPct}% of target.`;
          primaryAction = 'address_adherence';
          headline = 'Stall is adherence, not metabolism — intake is above plan.';
          rationale =
            `Calories are averaging ~${calPct}% of the prescription. Tighten compliance ` +
            `before changing macros — cutting targets the client already exceeds won't help.`;
          flags.push({
            code: 'STALL_OVEREATING',
            severity: 'warning',
            title: 'Stalled — eating above plan',
            detail: rationale,
            suggestedAction: 'address_adherence',
          });
        } else if (adherence.status === 'on_plan') {
          vsGoal = `Loss stalled (${lossRate.toFixed(1)}%/wk) with good adherence.`;
          primaryAction = 'adjust_macros';
          proposedMacros = reduceMacros(target, ENGINE_CONFIG.cutAdjustPct);
          headline = `Genuine plateau — trim intake ~${Math.round(ENGINE_CONFIG.cutAdjustPct * 100)}%.`;
          rationale =
            `Plan is being followed but the scale trend is flat, so a small calorie ` +
            `reduction (carbs/fats, protein held) is warranted. A diet break is the ` +
            `alternative if the client is fatigued or has been dieting a long time.`;
          flags.push({
            code: 'PLATEAU_GOOD_ADHERENCE',
            severity: 'warning',
            title: 'Genuine plateau',
            detail: rationale,
            suggestedAction: 'adjust_macros',
          });
        } else {
          // Eating UNDER target yet not losing — do NOT cut further blindly.
          vsGoal = `Stalled while eating ~${calPct}% of target — investigate, don't cut.`;
          primaryAction = 'review';
          headline = 'Stalled despite under-eating — review before cutting further.';
          rationale =
            `Reducing macros when intake is already below target is risky. Check logging ` +
            `accuracy, water retention, sleep/stress, or true metabolic adaptation first.`;
          flags.push({
            code: 'STALL_UNDEREATING',
            severity: 'warning',
            title: 'Stalled but under target',
            detail: rationale,
            suggestedAction: 'review',
          });
        }
      } else {
        vsGoal = `Losing slowly (${lossRate.toFixed(1)}%/wk) — monitor one more week.`;
      }
    } else if (goal === 'muscle_gain') {
      const cfg = ENGINE_CONFIG.muscleGain;
      const calPct = Math.round(adherence.calorieRatio * 100);
      const gainRate = ratePct;
      if (gainRate > cfg.fastAbove) {
        vsGoal = `Gaining fast (${gainRate.toFixed(1)}%/wk) — likely excess fat.`;
        primaryAction = 'adjust_macros';
        proposedMacros = reduceMacros(target, ENGINE_CONFIG.trimSurplusPct);
        headline = 'Gaining too fast — shave the surplus slightly.';
        rationale = `Above ${cfg.fastAbove}%/wk tends to add fat faster than muscle.`;
        flags.push({
          code: 'GAIN_TOO_FAST',
          severity: 'warning',
          title: 'Gaining too fast',
          detail: rationale,
          suggestedAction: 'adjust_macros',
        });
      } else if (gainRate < cfg.idealMin) {
        if (adherence.status === 'under') {
          vsGoal = `Not gaining; intake only ~${calPct}% of target.`;
          primaryAction = 'address_adherence';
          headline = 'Not gaining because intake is short — fix adherence first.';
          rationale = `Calories are averaging ~${calPct}% of the prescribed surplus.`;
          flags.push({
            code: 'NOGAIN_UNDEREATING',
            severity: 'warning',
            title: 'Not gaining — under target',
            detail: rationale,
            suggestedAction: 'address_adherence',
          });
        } else if (adherence.status === 'on_plan') {
          vsGoal = `Gain stalled (${gainRate.toFixed(1)}%/wk) with good adherence.`;
          primaryAction = 'adjust_macros';
          proposedMacros = increaseMacros(target, ENGINE_CONFIG.gainAdjustPct);
          headline = `Add calories ~${Math.round(ENGINE_CONFIG.gainAdjustPct * 100)}% to resume gaining.`;
          rationale = `Plan followed but weight flat, so a small surplus bump is warranted.`;
          flags.push({
            code: 'GAIN_STALLED',
            severity: 'warning',
            title: 'Gain stalled',
            detail: rationale,
            suggestedAction: 'adjust_macros',
          });
        } else {
          vsGoal = `Eating ~${calPct}% of target but not gaining — review.`;
          primaryAction = 'review';
          headline = 'Over target yet not gaining — review (logging, activity, illness).';
          rationale = `Unusual: surplus reported but no gain. Investigate before adding more food.`;
          flags.push({
            code: 'NOGAIN_OVEREATING',
            severity: 'warning',
            title: 'Not gaining despite surplus',
            detail: rationale,
            suggestedAction: 'review',
          });
        }
      } else {
        vsGoal = `Gaining ${gainRate.toFixed(1)}%/wk — solid lean-gain pace.`;
        headline = 'Lean gain on track — hold macros.';
      }
    } else if (goal === 'maintenance' || goal === 'recomp') {
      if (Math.abs(ratePct) <= ENGINE_CONFIG.maintenance.band) {
        vsGoal = `Holding steady (${ratePct.toFixed(1)}%/wk) — as intended.`;
      } else {
        vsGoal = `Drifting ${ratePct > 0 ? 'up' : 'down'} (${ratePct.toFixed(1)}%/wk).`;
        flags.push({
          code: 'MAINTENANCE_DRIFT',
          severity: 'info',
          title: 'Drifting from maintenance',
          detail: `Weight is moving more than the ±${ENGINE_CONFIG.maintenance.band}%/wk band allows.`,
          suggestedAction: 'adjust_macros',
        });
      }
    } else {
      vsGoal = `Trend is ${ratePct.toFixed(1)}%/wk, but the goal is unclear — review manually.`;
      primaryAction = 'review';
    }
  }

  // ---- Fatigue trend ----
  const fatigue = fatigueFlag(used);
  if (fatigue) flags.push(fatigue);

  // ---- Wellbeing attention flags (this week's self-report) ----
  // Single-week absolute reads on the latest check-in. Warning-level: they turn
  // the tile yellow and surface a card, but never touch primaryAction or
  // proposedMacros. SLEEP_LOW is suppressed when the hard sleep-collapse brake
  // already fired, so the coach never sees a red "collapsed" card and a
  // redundant yellow "poor sleep" card for the same signal. FATIGUE_RISING and
  // FATIGUE_HIGH are allowed to coexist — they say different things (trending up
  // vs high right now).
  const sleepAlreadyFlagged = flags.some((f) => f.code === 'SAFETY_SLEEP_COLLAPSE');
  const sleepLow = sleepAlreadyFlagged ? null : sleepLowFlag(latest);
  if (sleepLow) flags.push(sleepLow);

  const fatigueHigh = fatigueHighFlag(latest);
  if (fatigueHigh) flags.push(fatigueHigh);

  // ---- Protein floor (muscle retention — matters most on a cut) ----
  if (adherence.status !== 'unknown' && adherence.proteinRatio < ENGINE_CONFIG.poorAdherenceBelow) {
    flags.push({
      code: 'PROTEIN_LOW',
      severity: 'warning',
      title: 'Protein under target',
      detail:
        `Averaging ~${Math.round(adherence.proteinRatio * 100)}% of the protein target. ` +
        `Raise protein to protect muscle, especially in a deficit.`,
      suggestedAction: 'address_adherence',
    });
  }

  // ---- Sort flags by severity ----
  const order: Record<Severity, number> = { safety: 0, warning: 1, info: 2 };
  flags.sort((a, b) => order[a.severity] - order[b.severity]);

  // ---- Final recommendation: safety always wins ----
  if (safety.length > 0) {
    primaryAction = 'review';
    proposedMacros = null; // never auto-propose macros while a safety brake is on
    headline = safety[0].title + ' — coach review required before any macro change.';
    rationale = safety.map((f) => f.detail).join(' ');
  } else if (!rationale) {
    rationale =
      primaryAction === 'await_data'
        ? 'Waiting on more check-ins to read a reliable trend.'
        : onTrackRationale(flags.filter((f) => f.severity === 'warning').length);
  }

  // ---- Triage colour for the roster board ----
  let triage: Triage;
  if (safety.length > 0) triage = 'red';
  else if (!sufficient) triage = 'grey';
  else if (flags.some((f) => f.severity === 'warning')) triage = 'yellow';
  else triage = 'green';

  return {
    clientId: client.id,
    asOf,
    dataQuality: {
      checkInsUsed: used.length,
      windowDays: ENGINE_CONFIG.trendWindowDays,
      sufficient,
      warnings: dataWarnings,
    },
    weight: {
      latest: latest ? latest.weight : null,
      ratePerWeekPct: ratePct,
      direction,
      vsGoal,
    },
    adherence,
    flags,
    recommendation: { action: primaryAction, headline, proposedMacros, rationale },
    triage,
  };
}
