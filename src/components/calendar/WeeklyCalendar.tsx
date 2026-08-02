"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, endOfDay, format, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import type { CalendarMeetingRow, EisenhowerQuadrant, ManualCalendarBlockRow } from "@/types/database";
import { blockOverlapsMeetings } from "@/lib/calendar/manualBlockCarve";
import {
  CALENDAR_SLOT_HEIGHT_PX,
  blockBelongsToDay,
  buildRangeFromRows,
  formatCalendarRangeLabel,
  formatHourLabel,
  formatSelectionTimeRange,
  getCalendarGridBackgroundStyle,
  getCalendarScrollViewportHeightPx,
  getCalendarHours,
  getBlockPlacement,
  getDayHeaderLabel,
  getNowIndicatorTopPx,
  getPreviewPlacement,
  getWeekDaysFromAnchor,
  isTodayDay,
  rowIndexFromPointer,
  selectionOverlapsManualBlocks,
  selectionOverlapsPending,
  getWeekStartSunday,
} from "@/lib/calendar/weekView";
import { CalendarEditMenu, type CalendarEditMode } from "./CalendarEditMenu";
import { CalendarNavigation } from "./CalendarNavigation";
import { DismissibleNotice } from "./DismissibleNotice";
import { MeetingModal } from "./MeetingModal";
import { TaskEditMenu, type TimeSuggestMode } from "@/components/tasks/TaskEditMenu";
import {
  DEFAULT_QUADRANT,
  QUADRANT_BLOCK_STYLES,
  normalizeQuadrant,
} from "@/lib/quadrant";

interface ScheduledBlockRow {
  id: string;
  task_id: string;
  start_at: string;
  end_at: string;
  tasks?: {
    title: string | null;
    raw_text: string;
    quadrant: EisenhowerQuadrant | null;
  } | null;
}

const MANUAL_BLOCK_STYLE =
  "border-slate-500/80 bg-[repeating-linear-gradient(135deg,rgba(100,116,139,0.35)_0px,rgba(100,116,139,0.35)_6px,rgba(15,23,42,0.55)_6px,rgba(15,23,42,0.55)_12px)] text-slate-300";

const MEETING_BLOCK_STYLE = "border-sky-500/60 bg-sky-500/25 text-sky-100";

const PENDING_PREVIEW_STYLE =
  "border-blue-400/70 bg-blue-500/20 ring-1 ring-blue-400/50";

const DAY_COLUMNS = "64px repeat(7, minmax(0, 1fr))";

interface WeeklyCalendarProps {
  refreshKey?: number;
  className?: string;
  /** Gorunen saat penceresi; verilirse govde sabit yukseklikte scroll eder. */
  visibleHours?: number;
  onReschedule?: (
    taskId: string,
    mode: TimeSuggestMode,
    customStartAt?: string
  ) => void | Promise<void>;
  onQuadrantChange?: (taskId: string, quadrant: EisenhowerQuadrant) => void | Promise<void>;
  onTasksChanged?: () => void | Promise<void>;
}

interface RowSelection {
  id: string;
  dayIndex: number;
  startRow: number;
  endRow: number;
}

function getRowIndex(event: React.PointerEvent<HTMLDivElement>): number {
  const rect = event.currentTarget.getBoundingClientRect();
  return rowIndexFromPointer(rect.top, event.clientY);
}

function createSelectionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 7 gunluk, 30 dk slotlu, duzenlenebilir haftalik takvim. */
export function WeeklyCalendar({
  refreshKey = 0,
  className = "",
  visibleHours,
  onReschedule,
  onQuadrantChange,
  onTasksChanged,
}: WeeklyCalendarProps) {
  const [taskBlocks, setTaskBlocks] = useState<ScheduledBlockRow[]>([]);
  const [manualBlocks, setManualBlocks] = useState<ManualCalendarBlockRow[]>([]);
  const [meetings, setMeetings] = useState<CalendarMeetingRow[]>([]);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<CalendarEditMode>(null);
  const [hoveredTaskBlockId, setHoveredTaskBlockId] = useState<string | null>(null);
  const [dragSelection, setDragSelection] = useState<RowSelection | null>(null);
  const [pendingSelections, setPendingSelections] = useState<RowSelection[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignNotice, setAssignNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [viewAnchor, setViewAnchor] = useState(() => getWeekStartSunday(new Date()));
  const dragAnchorRef = useRef<{ dayIndex: number; rowIndex: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => getWeekDaysFromAnchor(viewAnchor), [viewAnchor]);
  const gridBackground = useMemo(() => getCalendarGridBackgroundStyle(), []);
  const rangeLabel = useMemo(() => formatCalendarRangeLabel(days), [days]);
  const todayDayIndex = days.findIndex((day) => isTodayDay(day, now));
  const todayInView = todayDayIndex >= 0;
  const nowTopPx = getNowIndicatorTopPx(now);

  const loadCalendar = useCallback(async () => {
    const start = startOfDay(viewAnchor).toISOString();
    const end = endOfDay(addDays(viewAnchor, 6)).toISOString();
    const query = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

    const [tasksResponse, manualResponse, meetingsResponse] = await Promise.all([
      fetch(`/api/schedule/blocks?${query}`),
      fetch(`/api/calendar/manual-blocks?${query}`),
      fetch(`/api/calendar/meetings?${query}`),
    ]);

    const tasksData = tasksResponse.ok
      ? ((await tasksResponse.json()) as { blocks: ScheduledBlockRow[] })
      : { blocks: [] };
    const manualData = manualResponse.ok
      ? ((await manualResponse.json()) as { blocks: ManualCalendarBlockRow[] })
      : { blocks: [] };
    const meetingsData = meetingsResponse.ok
      ? ((await meetingsResponse.json()) as { meetings: CalendarMeetingRow[] })
      : { meetings: [] };

    setTaskBlocks(tasksData.blocks);
    setManualBlocks(manualData.blocks);
    setMeetings(meetingsData.meetings);
  }, [viewAnchor]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar, refreshKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!scrollRef.current || !todayInView) return;
    scrollRef.current.scrollTop = Math.max(0, nowTopPx - 120);
  }, [viewAnchor, todayInView, nowTopPx]);

  function resetSelectionState() {
    setDragSelection(null);
    setPendingSelections([]);
    setSelectionError(null);
    dragAnchorRef.current = null;
  }

  function handlePrevWeek() {
    setViewAnchor((current) => getWeekStartSunday(addDays(current, -7)));
    resetSelectionState();
  }

  function handleNextWeek() {
    setViewAnchor((current) => getWeekStartSunday(addDays(current, 7)));
    resetSelectionState();
  }

  function handleSelectWeek(weekStart: Date) {
    setViewAnchor(getWeekStartSunday(weekStart));
    resetSelectionState();
  }

  function handleToday() {
    setViewAnchor(getWeekStartSunday(new Date()));
    resetSelectionState();
  }

  async function handleAssignTask() {
    setIsAssigning(true);
    setAssignNotice(null);

    try {
      const response = await fetch("/api/schedule/assign-current", { method: "POST" });
      if (!response.ok) {
        setAssignNotice("Atanacak görev bulunamadı.");
        return;
      }

      await loadCalendar();
      await onTasksChanged?.();
    } catch {
      setAssignNotice("Görev atanırken bir hata oluştu.");
    } finally {
      setIsAssigning(false);
    }
  }

  function handleModeChange(mode: CalendarEditMode) {
    setEditMode(mode);
    setDragSelection(null);
    setPendingSelections([]);
    setSelectionError(null);
    dragAnchorRef.current = null;
  }

  function validateSelection(selection: RowSelection, pending: RowSelection[]): string | null {
    const day = days[selection.dayIndex];
    if (selectionOverlapsManualBlocks(day, selection.startRow, selection.endRow, manualBlocks)) {
      return "Bu aralık mevcut bir kapalı blokla çakışıyor.";
    }
    if (
      selectionOverlapsPending(
        day,
        selection.startRow,
        selection.endRow,
        selection.dayIndex,
        pending.filter((item) => item.id !== selection.id)
      )
    ) {
      return "Bu aralık bekleyen başka bir seçimle çakışıyor.";
    }
    return null;
  }

  async function confirmAllPendingSelections() {
    if (pendingSelections.length === 0) return;

    for (const selection of pendingSelections) {
      const error = validateSelection(selection, pendingSelections);
      if (error) {
        setSelectionError(error);
        return;
      }
    }

    setIsSaving(true);
    setSelectionError(null);

    try {
      for (const selection of pendingSelections) {
        const day = days[selection.dayIndex];
        const range = buildRangeFromRows(day, selection.startRow, selection.endRow);
        const response = await fetch("/api/calendar/manual-blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(range),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { message?: string } | null;
          setSelectionError(data?.message ?? "Kaydedilemedi.");
          await loadCalendar();
          return;
        }
      }

      setPendingSelections([]);
      await loadCalendar();
    } finally {
      setIsSaving(false);
    }
  }

  function removePendingSelection(id: string) {
    setPendingSelections((current) => current.filter((item) => item.id !== id));
    setSelectionError(null);
  }

  async function deleteManualBlock(blockId: string) {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/calendar/manual-blocks/${blockId}`, {
        method: "DELETE",
      });
      if (!response.ok) return;
      await loadCalendar();
    } finally {
      setIsSaving(false);
    }
  }

  function handleDayPointerDown(dayIndex: number, event: React.PointerEvent<HTMLDivElement>) {
    if (editMode !== "block" || isSaving) return;
    event.preventDefault();

    const rowIndex = getRowIndex(event);
    dragAnchorRef.current = { dayIndex, rowIndex };
    setDragSelection({
      id: "drag",
      dayIndex,
      startRow: rowIndex,
      endRow: rowIndex,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDayPointerMove(dayIndex: number, event: React.PointerEvent<HTMLDivElement>) {
    if (
      editMode !== "block" ||
      !dragAnchorRef.current ||
      dragAnchorRef.current.dayIndex !== dayIndex
    ) {
      return;
    }

    const rowIndex = getRowIndex(event);
    setDragSelection({
      id: "drag",
      dayIndex,
      startRow: dragAnchorRef.current.rowIndex,
      endRow: rowIndex,
    });
  }

  function handleDayPointerUp(dayIndex: number, event: React.PointerEvent<HTMLDivElement>) {
    if (editMode !== "block" || !dragAnchorRef.current || dragAnchorRef.current.dayIndex !== dayIndex) {
      return;
    }

    const endRow = getRowIndex(event);
    const startRow = dragAnchorRef.current.rowIndex;
    dragAnchorRef.current = null;
    setDragSelection(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const nextSelection: RowSelection = {
      id: createSelectionId(),
      dayIndex,
      startRow,
      endRow,
    };
    const day = days[dayIndex];
    const overlapError = validateSelection(nextSelection, pendingSelections);
    if (overlapError) {
      setSelectionError(overlapError);
      return;
    }

    setSelectionError(null);
    setPendingSelections((current) => [...current, nextSelection]);
  }

  const previewSelections = [
    ...pendingSelections,
    ...(dragSelection ? [dragSelection] : []),
  ];

  const modeHint =
    editMode === "block"
      ? "Blokla modu: 30 dk adımlarla sürükle, istediğin kadar seç, sonra toplu onayla."
      : editMode === "delete"
        ? "Sil modu: kapalı bloklara tıkla."
        : null;

  const scrollViewportHeightPx = visibleHours
    ? getCalendarScrollViewportHeightPx(visibleHours)
    : null;

  return (
    <>
      {assignNotice ? (
        <DismissibleNotice
          message={assignNotice}
          onDismiss={() => setAssignNotice(null)}
        />
      ) : null}
    <section
      className={`flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 ${className}`}
    >
      {pendingSelections.length > 0 ? (
        <div className="border-b border-slate-800 bg-slate-950/70 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400">
              {pendingSelections.length} seçim bekliyor
            </span>
            {selectionError ? <span className="text-red-400">{selectionError}</span> : null}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void confirmAllPendingSelections()}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                Tümünü onayla
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={resetSelectionState}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                İptal
              </button>
            </div>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {pendingSelections.map((selection) => (
              <li
                key={selection.id}
                className="flex items-center gap-1 rounded-md border border-blue-500/40 bg-blue-500/10 px-2 py-1 text-slate-200"
              >
                <span>
                  {format(days[selection.dayIndex], "d MMM EEE", { locale: tr })}{" "}
                  {formatSelectionTimeRange(
                    days[selection.dayIndex],
                    selection.startRow,
                    selection.endRow
                  )}
                </span>
                <button
                  type="button"
                  aria-label="Seçimi kaldır"
                  onClick={() => removePendingSelection(selection.id)}
                  className="ml-1 text-slate-400 hover:text-red-400"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : modeHint ? (
        <div className="border-b border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
          {modeHint}
          {isSaving ? " · Kaydediliyor..." : null}
        </div>
      ) : null}

      <CalendarNavigation
        rangeLabel={rangeLabel}
        viewAnchor={viewAnchor}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
        onSelectWeek={handleSelectWeek}
        onAssignTask={handleAssignTask}
        isAssigning={isAssigning}
      />

      <div
        className="grid border-b border-slate-800 bg-slate-950/80"
        style={{ gridTemplateColumns: DAY_COLUMNS }}
      >
        <div className="flex items-center justify-center px-2 py-4">
          <CalendarEditMenu
            mode={editMode}
            onModeChange={handleModeChange}
            onAddMeeting={() => setMeetingModalOpen(true)}
          />
        </div>
        {days.map((day) => {
          const isToday = isTodayDay(day, now);
          return (
            <div
              key={day.toISOString()}
              className={`border-l border-slate-800 px-2 py-3 ${
                isToday ? "bg-blue-500/10" : ""
              }`}
            >
              <p className="text-xs font-semibold capitalize text-slate-200">
                {getDayHeaderLabel(day)}
              </p>
              <p className="text-[11px] text-slate-500">
                {format(day, "d MMM", { locale: tr })}
              </p>
            </div>
          );
        })}
      </div>

      <div
        ref={scrollRef}
        className={`min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto ${
          scrollViewportHeightPx ? "" : "max-h-[min(56vh,560px)]"
        }`}
        style={
          scrollViewportHeightPx
            ? { height: scrollViewportHeightPx, maxHeight: scrollViewportHeightPx }
            : undefined
        }
      >
        <div className="relative grid" style={{ gridTemplateColumns: DAY_COLUMNS }}>
          <div className="relative border-r border-slate-800 bg-slate-950/40" style={gridBackground}>
            {getCalendarHours().map((hour) => {
              const topPx = hour * 2 * CALENDAR_SLOT_HEIGHT_PX;
              return (
                <span
                  key={hour}
                  className="absolute right-2 text-[10px] leading-none text-slate-500"
                  style={{ top: topPx + 2 }}
                >
                  {formatHourLabel(hour)}
                </span>
              );
            })}
            {todayInView ? (
              <span
                className="absolute right-2 z-30 text-[10px] font-semibold leading-none text-red-400"
                style={{ top: nowTopPx - 1 }}
              >
                {format(now, "HH:mm")}
              </span>
            ) : null}
          </div>

          {days.map((day, dayIndex) => {
            const isToday = isTodayDay(day, now);
            const dayTaskBlocks = taskBlocks.filter((block) =>
              blockBelongsToDay(block.start_at, day)
            );
            const dayManualBlocks = manualBlocks.filter(
              (block) =>
                blockBelongsToDay(block.start_at, day) &&
                !blockOverlapsMeetings(block, meetings)
            );
            const dayMeetings = meetings.filter((meeting) =>
              blockBelongsToDay(meeting.start_at, day)
            );
            const dayPreviews = previewSelections.filter((item) => item.dayIndex === dayIndex);

            return (
              <div
                key={day.toISOString()}
                className={`relative border-l border-slate-800 ${
                  isToday ? "bg-blue-500/5" : ""
                } ${editMode === "block" ? "cursor-crosshair select-none touch-none" : ""}`}
                style={gridBackground}
                onPointerDown={(event) => handleDayPointerDown(dayIndex, event)}
                onPointerMove={(event) => handleDayPointerMove(dayIndex, event)}
                onPointerUp={(event) => handleDayPointerUp(dayIndex, event)}
              >
                {isToday ? (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-red-500"
                    style={{ top: nowTopPx }}
                    aria-hidden
                  />
                ) : null}

                {dayPreviews.map((preview) => {
                  const placement = getPreviewPlacement(preview.startRow, preview.endRow);
                  const isPending = preview.id !== "drag";
                  return (
                    <div
                      key={preview.id}
                      className={`pointer-events-none absolute left-1 right-1 rounded-md border ${
                        isPending ? PENDING_PREVIEW_STYLE : "border-blue-300/50 bg-blue-400/10"
                      }`}
                      style={{ top: placement.topPx, height: placement.heightPx }}
                    />
                  );
                })}

                {dayManualBlocks.map((block) => {
                  const placement = getBlockPlacement(block.start_at, block.end_at);
                  return (
                    <button
                      key={block.id}
                      type="button"
                      disabled={editMode !== "delete" || isSaving}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (editMode === "delete") {
                          void deleteManualBlock(block.id);
                        }
                      }}
                      className={`absolute left-1 right-1 overflow-hidden rounded-md border px-1.5 py-0.5 text-[10px] leading-tight ${MANUAL_BLOCK_STYLE} z-[1] ${
                        editMode === "delete"
                          ? "z-10 cursor-pointer ring-1 ring-red-400/60 hover:ring-red-400"
                          : "pointer-events-none"
                      }`}
                      style={{ top: placement.topPx, height: placement.heightPx }}
                      title="Kapalı alan"
                    >
                      <span className="line-clamp-2">Kapalı</span>
                    </button>
                  );
                })}

                {dayMeetings.map((meeting) => {
                  const placement = getBlockPlacement(meeting.start_at, meeting.end_at);
                  const label = meeting.title.trim() || "Toplantı";
                  return (
                    <div
                      key={meeting.id}
                      className={`pointer-events-none absolute left-1 right-1 overflow-hidden rounded-md border px-1.5 py-0.5 text-[10px] leading-tight ${MEETING_BLOCK_STYLE} z-[5]`}
                      style={{ top: placement.topPx, height: placement.heightPx }}
                      title={meeting.details ?? label}
                    >
                      <span className="line-clamp-2">{label}</span>
                    </div>
                  );
                })}

                {dayTaskBlocks.map((block) => {
                  const placement = getBlockPlacement(block.start_at, block.end_at);
                  const quadrant =
                    normalizeQuadrant(block.tasks?.quadrant ?? null) ?? DEFAULT_QUADRANT;
                  const title =
                    block.tasks?.title?.trim() ||
                    block.tasks?.raw_text?.trim() ||
                    "Planlanan görev";
                  const isHovered = hoveredTaskBlockId === block.id;
                  const blockHeight = isHovered
                    ? Math.max(placement.heightPx, 72)
                    : placement.heightPx;

                  return (
                    <div
                      key={block.id}
                      className={`group absolute left-1 right-1 rounded-md border px-1.5 py-1 text-[11px] leading-snug transition-all duration-200 ${QUADRANT_BLOCK_STYLES[quadrant]} ${
                        isHovered ? "z-30 shadow-lg ring-1 ring-white/20" : "z-10 overflow-hidden"
                      } ${editMode === "block" ? "pointer-events-none" : "pointer-events-auto relative"}`}
                      style={{ top: placement.topPx, height: blockHeight }}
                      title={title}
                      onMouseEnter={() => setHoveredTaskBlockId(block.id)}
                      onMouseLeave={() =>
                        setHoveredTaskBlockId((current) => (current === block.id ? null : current))
                      }
                    >
                      <span className={isHovered ? "block whitespace-normal" : "line-clamp-2"}>
                        {title}
                      </span>
                      {onReschedule && onQuadrantChange && editMode === null ? (
                        <TaskEditMenu
                          variant="calendar"
                          currentQuadrant={block.tasks?.quadrant}
                          onQuadrantChange={(next) => onQuadrantChange(block.task_id, next)}
                          onReschedule={(mode, customStartAt) =>
                            onReschedule(block.task_id, mode, customStartAt)
                          }
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <MeetingModal
        open={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        onSaved={loadCalendar}
      />
    </section>
    </>
  );
}
