export type TimeSuggestMode =
  | "first_available"
  | "within_work_hours"
  | "same_day_next_week"
  | "custom";

export const TIME_SUGGEST_OPTIONS: Array<{
  mode: Exclude<TimeSuggestMode, "custom">;
  label: string;
}> = [
  { mode: "first_available", label: "İlk boşluğa planla" },
  { mode: "within_work_hours", label: "Mesai saatleri içine planla" },
  { mode: "same_day_next_week", label: "Gelecek hafta aynı güne taşı" },
];
