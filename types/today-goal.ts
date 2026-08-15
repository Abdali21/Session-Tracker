export const TODAY_GOAL_PRIORITIES = [
  "creative_mastery",
  "client_execution",
  "client_acquisition",
] as const;

export type TodayGoalPriority = (typeof TODAY_GOAL_PRIORITIES)[number];

export const TODAY_GOAL_PRIORITY_LABELS = {
  creative_mastery: "Creative Mastery",
  client_execution: "Client Execution",
  client_acquisition: "Client Acquisition",
} satisfies Record<TodayGoalPriority, string>;

export interface TodayGoal {
  outcome: string;
  priority: TodayGoalPriority;
  /** ISO 8601 timestamp for the most recent manual save. */
  updatedAt: string;
}
