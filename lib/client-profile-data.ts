import type { RosterStatus } from "@/lib/roster-data";
import { getRosterClient } from "@/lib/roster-data";

export type WorkoutStatus = "completed" | "missed" | "pending";

export type MacroMetric = {
  label: "Protein" | "Carbs" | "Fats";
  target: number;
  actual: number;
  unit: string;
  compliancePercent: number;
};

export type MicrocycleWorkout = {
  id: string;
  name: string;
  scheduledDay: string;
  status: WorkoutStatus;
};

export type StartingMetrics = {
  startDate: string;
  weightKg: number;
  bodyFatPercent?: number;
  waistCm?: number;
  notes?: string;
};

export type ClientBio = {
  age: number;
  heightCm: number;
  occupation: string;
  activityLevel: string;
  injuryHistory: string[];
  startingMetrics: StartingMetrics;
};

export type ClientProfile = {
  id: string;
  name: string;
  initials: string;
  phase: string;
  goal: string;
  status: RosterStatus;
  weekRange: string;
  weightTrendKg: number[];
  weightDayLabels: string[];
  currentWeightKg: number;
  weightChangeKg: number;
  overallMacroCompliance: number;
  macros: MacroMetric[];
  workouts: MicrocycleWorkout[];
  // activity
  dailySteps: number;
  dailyStepsGoal: number;
  // biofeedback
  sleepQuality: number;
  sleepLabel: string;
  fatigueRpe: number;
  fatigueLabel: string;
  stressLevel: number;
  stressLabel: string;
  hungerScore: number;
  hungerMax: number;
  hungerLabel: string;
  coachNotesDefault: string;
  bio?: ClientBio;
};

export const MARCUS_CHEN_BIO: ClientBio = {
  age: 29,
  heightCm: 178,
  occupation: "Software Engineer",
  activityLevel:
    "Sedentary desk job (~6k steps/day) + structured lifting 5×/week — classified as moderately active",
  injuryHistory: [
    "Left shoulder impingement (2023) — cleared for overhead work with controlled tempo",
    "No current restrictions; avoid behind-neck pressing per physio note",
  ],
  startingMetrics: {
    startDate: "March 3, 2026",
    weightKg: 84.2,
    bodyFatPercent: 18.2,
    waistCm: 84,
    notes:
      "Baseline before 12-week aesthetic cut. Target: V-taper emphasis, maintain strength on compounds.",
  },
};

export const MARCUS_CHEN_PROFILE: ClientProfile = {
  id: "marcus-chen",
  name: "Marcus Chen",
  initials: "MC",
  phase: "12-Week Aesthetic Cut",
  goal: "Aesthetic V-Shape",
  status: "pending_review",
  weekRange: "May 27 – Jun 2, 2026",
  weightTrendKg: [83.1, 82.9, 82.8, 82.6, 82.5, 82.4, 82.4],
  weightDayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  currentWeightKg: 82.4,
  weightChangeKg: -0.2,
  overallMacroCompliance: 94,
  macros: [
    { label: "Protein", target: 150, actual: 155, unit: "g", compliancePercent: 103 },
    { label: "Carbs", target: 280, actual: 262, unit: "g", compliancePercent: 94 },
    { label: "Fats", target: 75, actual: 71, unit: "g", compliancePercent: 95 },
  ],
  workouts: [
    { id: "w1", name: "Upper A", scheduledDay: "Mon", status: "completed" },
    { id: "w2", name: "Lower A", scheduledDay: "Tue", status: "completed" },
    { id: "w3", name: "Upper B", scheduledDay: "Thu", status: "completed" },
    { id: "w4", name: "Lower B", scheduledDay: "Fri", status: "missed" },
    { id: "w5", name: "Conditioning", scheduledDay: "Sun", status: "pending" },
  ],
  dailySteps: 7200,
  dailyStepsGoal: 10000,
  sleepQuality: 6.8,
  sleepLabel: "Moderate — late screens 2 nights",
  fatigueRpe: 7.2,
  fatigueLabel: "Elevated — lower body skipped",
  stressLevel: 4,
  stressLabel: "Manageable — pre-deadline week at work",
  hungerScore: 3,
  hungerMax: 5,
  hungerLabel: "Neutral — no notable cravings reported",
  coachNotesDefault:
    "Marcus is responding well to protein targets. Weight plateau suggests NEAT drop rather than intake — monitor steps before cutting calories. Consider PPL next microcycle if Lower B miss repeats. Follow up on sleep hygiene before week 9.",
  bio: MARCUS_CHEN_BIO,
};

export function getClientProfile(id: string): ClientProfile | undefined {
  if (id === "marcus-chen") return MARCUS_CHEN_PROFILE;

  const roster = getRosterClient(id);
  if (!roster) return undefined;

  return {
    id: roster.id,
    name: roster.name,
    initials: roster.initials,
    phase: `${roster.goal} Phase`,
    goal: roster.goal,
    status: roster.status,
    weekRange: "Current microcycle",
    weightTrendKg: [80, 80.2, 80.1, 80, 79.9, 80, 80],
    weightDayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    currentWeightKg: 80,
    weightChangeKg: 0,
    overallMacroCompliance: roster.macrosPercent,
    macros: [
      {
        label: "Protein",
        target: 140,
        actual: Math.round(140 * (roster.macrosPercent / 100)),
        unit: "g",
        compliancePercent: roster.macrosPercent,
      },
      {
        label: "Carbs",
        target: 250,
        actual: Math.round(250 * (roster.macrosPercent / 100)),
        unit: "g",
        compliancePercent: roster.macrosPercent - 2,
      },
      {
        label: "Fats",
        target: 70,
        actual: Math.round(70 * (roster.macrosPercent / 100)),
        unit: "g",
        compliancePercent: roster.macrosPercent - 1,
      },
    ],
    workouts: Array.from({ length: roster.workoutsPlanned }, (_, i) => ({
      id: `w${i}`,
      name: `Session ${i + 1}`,
      scheduledDay: ["Mon", "Tue", "Thu", "Fri", "Sun"][i] ?? "—",
      status:
        i < roster.workoutsCompleted
          ? ("completed" as const)
          : i === roster.workoutsCompleted
            ? ("missed" as const)
            : ("pending" as const),
    })),
    dailySteps: 8000,
    dailyStepsGoal: 10000,
    sleepQuality: 7,
    sleepLabel: "Reported via check-in",
    fatigueRpe: 6,
    fatigueLabel: "Within expected range",
    stressLevel: 5,
    stressLabel: "Moderate",
    hungerScore: 3,
    hungerMax: 5,
    hungerLabel: "Neutral",
    coachNotesDefault: "",
    bio: {
      age: 32,
      heightCm: 175,
      occupation: "Not specified",
      activityLevel: "Moderate — per onboarding intake",
      injuryHistory: ["No reported injuries on file"],
      startingMetrics: {
        startDate: "Onboarding",
        weightKg: 80,
        notes: "Starting metrics pending full intake.",
      },
    },
  };
}

export function getClientBio(id: string): ClientBio | undefined {
  return getClientProfile(id)?.bio;
}
