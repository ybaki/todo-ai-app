/**
 * Elle yazilmis Supabase tip tanimlari (supabase/migrations/*.sql ile birebir eslesir).
 *
 * NOT: Gercek bir Supabase projesi baglandiktan sonra bu dosyayi
 * `supabase gen types typescript --project-id <id> > src/types/database.ts`
 * komutuyla otomatik uretilenle degistirin; bu dosya yalnizca kod yazmayi
 * mumkun kilmak icin gecici/elle bakimli bir kaynaktir.
 */

import type { IsoWeekday, QuadrantScheduleMode } from "@/lib/scheduling/userPreferences";

export type EisenhowerQuadrant = "urgent_important" | "not_urgent_important" | "get_rid";

/** DB'de kalan eski enum degerleri (0006 oncesi). */
export type LegacyQuadrant = "urgent_not_important" | "not_urgent_not_important";

export type StoredQuadrant = EisenhowerQuadrant | LegacyQuadrant;

export type TaskStatus =
  | "inbox"
  | "analyzing"
  | "needs_user_input"
  | "suggested"
  | "confirmed"
  | "scheduled"
  | "conflicted"
  | "reschedule_suggested"
  | "done"
  | "archived";

export type EnergyLevel = "low" | "medium" | "high_focus";
export type ScheduleSuggestionStatus = "candidate" | "accepted" | "rejected";
export type ScheduledBlockSource = "app" | "outlook";
export type CalendarProvider = "microsoft";

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  timezone: string;
  work_start: string;
  work_end: string;
  work_days: IsoWeekday[];
  active_start: string;
  active_end: string;
  active_days: IsoWeekday[];
  /** @deprecated work_days kullanin */
  work_day_mode?: string | null;
  urgent_schedule_mode: QuadrantScheduleMode;
  plan_schedule_mode: QuadrantScheduleMode;
  get_rid_schedule_mode: QuadrantScheduleMode;
  lunch_start: string | null;
  lunch_end: string | null;
  buffer_minutes: number;
  min_focus_block_minutes: number;
  max_daily_focus_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  raw_text: string;
  title: string | null;
  status: TaskStatus;
  quadrant: StoredQuadrant | null;
  deadline: string | null;
  estimated_minutes: number | null;
  minimum_chunk_minutes: number | null;
  splittable: boolean;
  energy: EnergyLevel | null;
  tags: string[];
  confidence: number | null;
  source: "web" | "chrome_extension";
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAnalysisRow {
  id: string;
  task_id: string;
  user_id: string;
  model: string;
  prompt_version: string;
  input_tokens: number | null;
  output_tokens: number | null;
  output_json: Record<string, unknown>;
  confidence: number | null;
  cost_usd: number | null;
  latency_ms: number | null;
  is_valid: boolean;
  error_message: string | null;
  created_at: string;
}

export interface CalendarConnectionRow {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  tenant_id: string | null;
  scopes: string[];
  token_ref: string | null;
  status: "connected" | "disconnected" | "error";
  expires_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarBusyCacheRow {
  id: string;
  user_id: string;
  start_at: string;
  end_at: string;
  status: "busy" | "tentative" | "oof";
  fetched_at: string;
  source_hash: string;
}

export interface ScheduleSuggestionRow {
  id: string;
  task_id: string;
  user_id: string;
  start_at: string;
  end_at: string;
  score: number;
  status: ScheduleSuggestionStatus;
  reason: string | null;
  rank: number;
  created_at: string;
}

export interface ScheduledBlockRow {
  id: string;
  task_id: string;
  user_id: string;
  start_at: string;
  end_at: string;
  source: ScheduledBlockSource;
  external_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskFeedbackRow {
  id: string;
  task_id: string;
  user_id: string;
  feedback_type:
    | "quadrant_change"
    | "duration_change"
    | "slot_rejected"
    | "slot_accepted"
    | "manual_edit";
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ExtensionTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  label: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface ManualCalendarBlockRow {
  id: string;
  user_id: string;
  start_at: string;
  end_at: string;
  created_at: string;
}

export type MeetingRecurrenceFrequency = "day" | "week" | "month" | "year";

export interface MeetingRecurrenceRule {
  frequency: MeetingRecurrenceFrequency;
  interval: number;
  until: string | null;
  /** Haftalik yinelemede secili gun (0=Pazar). */
  weekday?: number;
}

export interface CalendarMeetingRow {
  id: string;
  user_id: string;
  title: string;
  details: string | null;
  start_at: string;
  end_at: string;
  recurrence_rule: MeetingRecurrenceRule | null;
  series_id: string | null;
  created_at: string;
}

// Supabase js-client'in generic Database sozlesmesini karsilamak icin minimal iskelet.
// Relationships bilinctli olarak bos birakildi (PostgREST embed sorgulari
// `select("*, tasks(...)")` gibi runtime'da calisir, yalnizca tip cikarimi
// icin ayrintili FK grafigi gerekmiyor).
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      tasks: Table<TaskRow>;
      task_analyses: Table<TaskAnalysisRow>;
      calendar_connections: Table<CalendarConnectionRow>;
      calendar_busy_cache: Table<CalendarBusyCacheRow>;
      schedule_suggestions: Table<ScheduleSuggestionRow>;
      scheduled_blocks: Table<ScheduledBlockRow>;
      task_feedback: Table<TaskFeedbackRow>;
      audit_logs: Table<AuditLogRow>;
      extension_tokens: Table<ExtensionTokenRow>;
      manual_calendar_blocks: Table<ManualCalendarBlockRow>;
      calendar_meetings: Table<CalendarMeetingRow>;
    };
    Views: Record<string, never>;
    Functions: {
      store_calendar_token: {
        Args: { p_existing_ref: string | null; p_secret: string; p_name: string };
        Returns: string;
      };
      read_calendar_token: {
        Args: { p_token_ref: string };
        Returns: string | null;
      };
      delete_calendar_token: {
        Args: { p_token_ref: string };
        Returns: undefined;
      };
    };
  };
}
