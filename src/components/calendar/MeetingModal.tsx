"use client";

import { useEffect, useMemo, useState } from "react";
import { addMonths, format } from "date-fns";
import { tr } from "date-fns/locale";
import type { MeetingRecurrenceFrequency, MeetingRecurrenceRule } from "@/types/database";
import {
  RECURRENCE_FREQUENCY_LABELS,
  WEEKDAY_LABELS,
  combineDateAndTime,
  formatMeetingDateSummary,
  getDefaultMeetingRange,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/calendar/meetings";

interface MeetingModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

export function MeetingModal({ open, onClose, onSaved }: MeetingModalProps) {
  const defaults = useMemo(() => getDefaultMeetingRange(), [open]);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => toDateInputValue(defaults.startAt));
  const [startTime, setStartTime] = useState(() => toTimeInputValue(defaults.startAt));
  const [endTime, setEndTime] = useState(() => toTimeInputValue(defaults.endAt));
  const [interval, setInterval] = useState(1);
  const [frequency, setFrequency] = useState<MeetingRecurrenceFrequency>("week");
  const [weekday, setWeekday] = useState(defaults.startAt.getDay());
  const [untilDate, setUntilDate] = useState(() =>
    toDateInputValue(addMonths(defaults.startAt, 3))
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const range = getDefaultMeetingRange();
    setTitle("");
    setDetails("");
    setDateOpen(false);
    setRepeatOpen(false);
    setStartDate(toDateInputValue(range.startAt));
    setStartTime(toTimeInputValue(range.startAt));
    setEndTime(toTimeInputValue(range.endAt));
    setInterval(1);
    setFrequency("week");
    setWeekday(range.startAt.getDay());
    setUntilDate(toDateInputValue(addMonths(range.startAt, 3)));
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const startAt = combineDateAndTime(startDate, startTime);
  const endAt = combineDateAndTime(startDate, endTime);
  const dateSummary =
    startAt && endAt && endAt > startAt
      ? formatMeetingDateSummary(startAt, endAt)
      : "Tarih ve saat seç";

  async function handleSave() {
    if (!startAt || !endAt) {
      setError("Geçerli bir başlangıç tarihi ve saati girin.");
      return;
    }
    if (endAt <= startAt) {
      setError("Bitiş saati başlangıçtan sonra olmalı.");
      return;
    }

    let recurrence: MeetingRecurrenceRule | null = null;
    if (repeatOpen) {
      recurrence = {
        frequency,
        interval,
        until: untilDate ? new Date(`${untilDate}T23:59:59`).toISOString() : null,
        weekday: frequency === "week" ? weekday : undefined,
      };
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/calendar/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          details: details.trim() || null,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          recurrence,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(data?.message ?? "Kaydedilemedi.");
        return;
      }

      await onSaved?.();
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-modal-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-800 px-4 py-3">
          <input
            id="meeting-modal-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Başlık ekle"
            className="min-w-0 flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="ml-3 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <button
            type="button"
            onClick={() => setDateOpen((current) => !current)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-left text-sm hover:border-slate-600"
          >
            <span className="text-slate-300">{dateSummary}</span>
            <span className="text-slate-500">{dateOpen ? "▲" : "▼"}</span>
          </button>

          {dateOpen ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block text-xs text-slate-400">
                Başlangıç tarihi
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-400">
                Başlangıç saati
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
                />
              </label>
              <label className="block text-xs text-slate-400">
                Bitiş saati
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
                />
              </label>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setRepeatOpen((current) => !current)}
            className={`mt-3 flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
              repeatOpen
                ? "border-blue-500/60 bg-blue-500/10 text-blue-200"
                : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-600"
            }`}
          >
            <span aria-hidden>↻</span>
            <span>Yinele</span>
          </button>

          {repeatOpen ? (
            <div className="mt-3 space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
                <span>Her</span>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={interval}
                  onChange={(event) => setInterval(Number(event.target.value) || 1)}
                  className="w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-center"
                />
                <select
                  value={frequency}
                  onChange={(event) =>
                    setFrequency(event.target.value as MeetingRecurrenceFrequency)
                  }
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1"
                >
                  {(Object.keys(RECURRENCE_FREQUENCY_LABELS) as MeetingRecurrenceFrequency[]).map(
                    (key) => (
                      <option key={key} value={key}>
                        {RECURRENCE_FREQUENCY_LABELS[key]}
                      </option>
                    )
                  )}
                </select>
              </div>

              {frequency === "week" ? (
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_LABELS.map((label, index) => (
                    <button
                      key={`${label}-${index}`}
                      type="button"
                      onClick={() => setWeekday(index)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                        weekday === index
                          ? "bg-blue-600 text-white"
                          : "border border-slate-700 text-slate-400 hover:border-slate-500"
                      }`}
                      title={format(new Date(2026, 7, 2 + index), "EEEE", { locale: tr })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}

              <label className="block text-xs text-slate-400">
                Bitiş tarihi
                <input
                  type="date"
                  value={untilDate}
                  onChange={(event) => setUntilDate(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100"
                />
              </label>
            </div>
          ) : null}

          <label className="mt-4 block text-xs text-slate-400">
            Detay
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={4}
              placeholder="Toplantı notları..."
              className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            />
          </label>

          {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        </div>

        <div className="border-t border-slate-800 px-4 py-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {isSaving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
