"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import { getWeekStartSunday } from "@/lib/calendar/weekView";

const MONTH_LABELS = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

interface CalendarDatePickerProps {
  anchorDate: Date;
  onSelectWeek: (weekStart: Date) => void;
  onClose: () => void;
}

export function CalendarDatePicker({ anchorDate, onSelectWeek, onClose }: CalendarDatePickerProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(anchorDate));
  const rootRef = useRef<HTMLDivElement>(null);

  const weekStart = getWeekStartSunday(anchorDate);
  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(weekStart, { weekStartsOn: 0 }),
      }),
    [weekStart]
  );

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [visibleMonth]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      className="absolute left-0 top-full z-40 mt-2 w-[min(92vw,520px)] overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl"
    >
      <div className="grid sm:grid-cols-[1.2fr_0.8fr]">
        <div className="border-b border-slate-800 p-3 sm:border-b-0 sm:border-r">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
              className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Önceki ay"
            >
              ‹
            </button>
            <span className="text-sm font-medium capitalize text-slate-200">
              {format(visibleMonth, "LLLL yyyy", { locale: tr })}
            </span>
            <button
              type="button"
              onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Sonraki ay"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500">
            {["P", "P", "S", "Ç", "P", "C", "C"].map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const inMonth = isSameMonth(day, visibleMonth);
              const inSelectedWeek = weekDays.some((weekDay) => isSameDay(weekDay, day));
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onSelectWeek(getWeekStartSunday(day));
                    onClose();
                  }}
                  className={`flex h-8 items-center justify-center rounded-md text-sm transition ${
                    !inMonth ? "text-slate-600" : "text-slate-200"
                  } ${
                    inSelectedWeek
                      ? "bg-blue-500/15 ring-1 ring-blue-500/50"
                      : "hover:bg-slate-800"
                  } ${isToday ? "font-semibold text-blue-300" : ""}`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-200">{visibleMonth.getFullYear()}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setVisibleMonth((current) => addMonths(current, -12))}
                className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800"
                aria-label="Önceki yıl"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setVisibleMonth((current) => addMonths(current, 12))}
                className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800"
                aria-label="Sonraki yıl"
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MONTH_LABELS.map((label, index) => {
              const isActive = visibleMonth.getMonth() === index;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), index, 1))}
                  className={`rounded-md px-2 py-2 text-sm ${
                    isActive
                      ? "bg-blue-500/20 text-blue-200 ring-1 ring-blue-500/40"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectWeek(getWeekStartSunday(new Date()));
              onClose();
            }}
            className="mt-4 text-sm text-blue-400 hover:text-blue-300"
          >
            Bugün
          </button>
        </div>
      </div>
    </div>
  );
}
