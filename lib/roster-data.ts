export type RosterStatus = "on_track" | "pending_review" | "action_needed";

export type RosterClient = {
  id: string;
  name: string;
  initials: string;
  goal: string;
  status: RosterStatus;
  macrosPercent: number;
  workoutsCompleted: number;
  workoutsPlanned: number;
};

export const ROSTER_STATUS_LABELS: Record<
  RosterStatus,
  "On Track" | "Pending Review" | "Action Needed"
> = {
  on_track: "On Track",
  pending_review: "Pending Review",
  action_needed: "Action Needed",
};

export const ROSTER_CLIENTS: RosterClient[] = [
  { id: "marcus-chen", name: "Marcus Chen", initials: "MC", goal: "Aesthetic V-Shape", status: "pending_review", macrosPercent: 94, workoutsCompleted: 4, workoutsPlanned: 5 },
  { id: "sarah-okafor", name: "Sarah Okafor", initials: "SO", goal: "Cutting", status: "on_track", macrosPercent: 98, workoutsCompleted: 5, workoutsPlanned: 5 },
  { id: "james-mitchell", name: "James Mitchell", initials: "JM", goal: "Muscle Gain", status: "action_needed", macrosPercent: 72, workoutsCompleted: 2, workoutsPlanned: 5 },
  { id: "elena-vasquez", name: "Elena Vasquez", initials: "EV", goal: "Recomp", status: "on_track", macrosPercent: 91, workoutsCompleted: 4, workoutsPlanned: 4 },
  { id: "david-kim", name: "David Kim", initials: "DK", goal: "Cutting", status: "on_track", macrosPercent: 96, workoutsCompleted: 5, workoutsPlanned: 5 },
  { id: "priya-sharma", name: "Priya Sharma", initials: "PS", goal: "Aesthetic V-Shape", status: "pending_review", macrosPercent: 88, workoutsCompleted: 4, workoutsPlanned: 5 },
  { id: "lucas-berg", name: "Lucas Berg", initials: "LB", goal: "Muscle Gain", status: "on_track", macrosPercent: 93, workoutsCompleted: 5, workoutsPlanned: 5 },
  { id: "amira-hassan", name: "Amira Hassan", initials: "AH", goal: "Recomp", status: "action_needed", macrosPercent: 65, workoutsCompleted: 3, workoutsPlanned: 5 },
  { id: "noah-fischer", name: "Noah Fischer", initials: "NF", goal: "Cutting", status: "on_track", macrosPercent: 97, workoutsCompleted: 5, workoutsPlanned: 5 },
  { id: "chloe-martin", name: "Chloe Martin", initials: "CM", goal: "Aesthetic V-Shape", status: "on_track", macrosPercent: 92, workoutsCompleted: 4, workoutsPlanned: 4 },
  { id: "ryan-torres", name: "Ryan Torres", initials: "RT", goal: "Muscle Gain", status: "pending_review", macrosPercent: 86, workoutsCompleted: 4, workoutsPlanned: 5 },
  { id: "nina-petrov", name: "Nina Petrov", initials: "NP", goal: "Recomp", status: "on_track", macrosPercent: 90, workoutsCompleted: 4, workoutsPlanned: 5 },
  { id: "omar-siddiqui", name: "Omar Siddiqui", initials: "OS", goal: "Cutting", status: "action_needed", macrosPercent: 58, workoutsCompleted: 1, workoutsPlanned: 5 },
  { id: "grace-ellison", name: "Grace Ellison", initials: "GE", goal: "Aesthetic V-Shape", status: "on_track", macrosPercent: 95, workoutsCompleted: 5, workoutsPlanned: 5 },
  { id: "leo-nakamura", name: "Leo Nakamura", initials: "LN", goal: "Muscle Gain", status: "on_track", macrosPercent: 89, workoutsCompleted: 4, workoutsPlanned: 5 },
  { id: "hannah-brooks", name: "Hannah Brooks", initials: "HB", goal: "Recomp", status: "pending_review", macrosPercent: 84, workoutsCompleted: 3, workoutsPlanned: 4 },
  { id: "alex-romano", name: "Alex Romano", initials: "AR", goal: "Cutting", status: "on_track", macrosPercent: 99, workoutsCompleted: 5, workoutsPlanned: 5 },
  { id: "yuki-tanaka", name: "Yuki Tanaka", initials: "YT", goal: "Aesthetic V-Shape", status: "on_track", macrosPercent: 94, workoutsCompleted: 4, workoutsPlanned: 5 },
  { id: "miguel-alvarez", name: "Miguel Alvarez", initials: "MA", goal: "Muscle Gain", status: "action_needed", macrosPercent: 70, workoutsCompleted: 2, workoutsPlanned: 5 },
  { id: "sophie-laurent", name: "Sophie Laurent", initials: "SL", goal: "Recomp", status: "on_track", macrosPercent: 91, workoutsCompleted: 4, workoutsPlanned: 5 },
  { id: "ben-carter", name: "Ben Carter", initials: "BC", goal: "Cutting", status: "pending_review", macrosPercent: 87, workoutsCompleted: 4, workoutsPlanned: 5 },
  { id: "zara-ahmed", name: "Zara Ahmed", initials: "ZA", goal: "Aesthetic V-Shape", status: "on_track", macrosPercent: 93, workoutsCompleted: 5, workoutsPlanned: 5 },
  { id: "ethan-walsh", name: "Ethan Walsh", initials: "EW", goal: "Muscle Gain", status: "on_track", macrosPercent: 96, workoutsCompleted: 5, workoutsPlanned: 5 },
  { id: "lily-nguyen", name: "Lily Nguyen", initials: "LY", goal: "Recomp", status: "action_needed", macrosPercent: 61, workoutsCompleted: 3, workoutsPlanned: 5 },
  { id: "carlos-mendez", name: "Carlos Mendez", initials: "CM", goal: "Cutting", status: "on_track", macrosPercent: 92, workoutsCompleted: 4, workoutsPlanned: 5 },
  { id: "emma-sjoberg", name: "Emma Sjöberg", initials: "ES", goal: "Aesthetic V-Shape", status: "pending_review", macrosPercent: 85, workoutsCompleted: 4, workoutsPlanned: 5 },
  { id: "jordan-lee", name: "Jordan Lee", initials: "JL", goal: "Muscle Gain", status: "on_track", macrosPercent: 90, workoutsCompleted: 4, workoutsPlanned: 5 },
  { id: "fatima-diallo", name: "Fatima Diallo", initials: "FD", goal: "Recomp", status: "on_track", macrosPercent: 88, workoutsCompleted: 4, workoutsPlanned: 4 },
  { id: "tyler-jensen", name: "Tyler Jensen", initials: "TJ", goal: "Cutting", status: "action_needed", macrosPercent: 54, workoutsCompleted: 2, workoutsPlanned: 5 },
  { id: "isabella-rossi", name: "Isabella Rossi", initials: "IR", goal: "Aesthetic V-Shape", status: "on_track", macrosPercent: 97, workoutsCompleted: 5, workoutsPlanned: 5 },
  { id: "aaron-patel", name: "Aaron Patel", initials: "AP", goal: "Muscle Gain", status: "pending_review", macrosPercent: 83, workoutsCompleted: 3, workoutsPlanned: 5 },
  { id: "maya-chen", name: "Maya Chen", initials: "MC", goal: "Recomp", status: "on_track", macrosPercent: 94, workoutsCompleted: 4, workoutsPlanned: 5 },
  { id: "viktor-novak", name: "Viktor Novak", initials: "VN", goal: "Cutting", status: "on_track", macrosPercent: 95, workoutsCompleted: 5, workoutsPlanned: 5 },
];

export function getRosterClient(id: string): RosterClient | undefined {
  return ROSTER_CLIENTS.find((c) => c.id === id);
}

export function getRosterCounts(clients: RosterClient[] = ROSTER_CLIENTS) {
  return clients.reduce(
    (acc, c) => {
      acc[c.status]++;
      return acc;
    },
    { on_track: 0, pending_review: 0, action_needed: 0 }
  );
}
