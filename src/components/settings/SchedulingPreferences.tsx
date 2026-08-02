"use client";

import type { ProfileRow } from "@/types/database";
import type { IsoWeekday, QuadrantScheduleMode } from "@/lib/scheduling/userPreferences";
import {
  HOUR_END_TIME_OPTIONS,
  HOUR_START_TIME_OPTIONS,
  WEEKDAY_OPTIONS,
} from "@/lib/scheduling/userPreferences";

function sliceTime(value: string): string {
  return value.slice(0, 5);
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-300">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function WeekdayPicker({
  label,
  selected,
  onChange,
}: {
  label: string;
  selected: IsoWeekday[];
  onChange: (days: IsoWeekday[]) => void;
}) {
  function toggle(iso: IsoWeekday) {
    if (selected.includes(iso)) {
      onChange(selected.filter((day) => day !== iso));
    } else {
      onChange([...selected, iso].sort((a, b) => a - b));
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm text-slate-300">{label}</p>
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_OPTIONS.map((day) => {
          const isSelected = selected.includes(day.iso);
          return (
            <button
              key={day.iso}
              type="button"
              onClick={() => toggle(day.iso)}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                isSelected
                  ? "border-blue-500 bg-blue-500/20 text-blue-200"
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
              title={day.label}
            >
              {day.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HoursBlock({
  title,
  days,
  onDaysChange,
  start,
  end,
  onStartChange,
  onEndChange,
}: {
  title: string;
  days: IsoWeekday[];
  onDaysChange: (days: IsoWeekday[]) => void;
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="text-sm font-medium text-slate-200">{title}</h3>
      <WeekdayPicker label="Gün" selected={days} onChange={onDaysChange} />
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Başlangıç saati"
          value={start}
          onChange={onStartChange}
          options={HOUR_START_TIME_OPTIONS.map((time) => ({ value: time, label: time }))}
        />
        <SelectField
          label="Bitiş saati"
          value={end}
          onChange={onEndChange}
          options={HOUR_END_TIME_OPTIONS.map((time) => ({ value: time, label: time }))}
        />
      </div>
    </div>
  );
}

function QuadrantRadioGroup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: QuadrantScheduleMode;
  onChange: (value: QuadrantScheduleMode) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-200">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <label
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
            value === "work_hours"
              ? "border-blue-500 bg-blue-500/15 text-blue-200"
              : "border-slate-700 text-slate-300 hover:border-slate-500"
          }`}
        >
          <input
            type="radio"
            name={`${label}-schedule`}
            checked={value === "work_hours"}
            onChange={() => onChange("work_hours")}
            className="sr-only"
          />
          Çalışma Saatleri
        </label>
        <label
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
            value === "active_hours"
              ? "border-blue-500 bg-blue-500/15 text-blue-200"
              : "border-slate-700 text-slate-300 hover:border-slate-500"
          }`}
        >
          <input
            type="radio"
            name={`${label}-schedule`}
            checked={value === "active_hours"}
            onChange={() => onChange("active_hours")}
            className="sr-only"
          />
          Aktif Saatler
        </label>
      </div>
    </fieldset>
  );
}

export { HoursBlock, QuadrantRadioGroup, sliceTime };
