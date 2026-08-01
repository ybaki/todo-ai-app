"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";

interface ScheduledBlockRow {
  id: string;
  start_at: string;
  end_at: string;
  tasks?: { title: string | null; raw_text: string } | null;
}

/** Haftalik takvim — yalnizca uygulama ici plan bloklari (Outlook devre disi). */
export function WeeklyCalendar({ refreshKey }: { refreshKey: number }) {
  const [events, setEvents] = useState<EventInput[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const blocksRes = await fetch("/api/schedule/blocks");
      const blocksData = blocksRes.ok
        ? ((await blocksRes.json()) as { blocks: ScheduledBlockRow[] })
        : { blocks: [] };

      if (cancelled) return;

      setEvents(
        blocksData.blocks.map((row) => ({
          id: `block-${row.id}`,
          title: row.tasks?.title ?? row.tasks?.raw_text ?? "Planlanan görev",
          start: row.start_at,
          end: row.end_at,
          backgroundColor: "#2563eb",
          borderColor: "#2563eb",
        }))
      );
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        height="auto"
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        allDaySlot={false}
        events={events}
        nowIndicator
      />
    </div>
  );
}
