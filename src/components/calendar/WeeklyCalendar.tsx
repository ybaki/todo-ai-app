"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";

interface BusyRow {
  start_at: string;
  end_at: string;
  status: string;
}

interface ScheduledBlockRow {
  id: string;
  start_at: string;
  end_at: string;
  tasks?: { title: string | null; raw_text: string } | null;
}

/**
 * ALT: Haftalik Takvim (dokuman bolum 4.1).
 * Outlook busy bloklari + uygulama ici planlar farkli renklerle gosterilir.
 * Yarı saydam oneri bloklari SuggestionBubble icinde ayrica sunulur (Faz 5).
 */
export function WeeklyCalendar({ refreshKey }: { refreshKey: number }) {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [busyRes, blocksRes] = await Promise.all([
        fetch("/api/calendar/busy"),
        fetch("/api/schedule/blocks"),
      ]);

      const busyData = busyRes.ok
        ? ((await busyRes.json()) as { connected: boolean; busy: BusyRow[] })
        : { connected: false, busy: [] };
      const blocksData = blocksRes.ok
        ? ((await blocksRes.json()) as { blocks: ScheduledBlockRow[] })
        : { blocks: [] };

      if (cancelled) return;

      setCalendarConnected(busyData.connected);

      const busyEvents: EventInput[] = busyData.busy.map((row, index) => ({
        id: `busy-${index}`,
        title: "Meşgul (Outlook)",
        start: row.start_at,
        end: row.end_at,
        backgroundColor: "#475569",
        borderColor: "#475569",
      }));

      const planEvents: EventInput[] = blocksData.blocks.map((row) => ({
        id: `block-${row.id}`,
        title: row.tasks?.title ?? row.tasks?.raw_text ?? "Planlanan görev",
        start: row.start_at,
        end: row.end_at,
        backgroundColor: "#2563eb",
        borderColor: "#2563eb",
      }));

      setEvents([...busyEvents, ...planEvents]);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      {calendarConnected === false ? (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          <span>Outlook takvimi bağlı değil; yalnızca uygulama içi planlar gösteriliyor.</span>
          <a href="/api/calendar/connect" className="font-medium underline">
            Outlook&apos;u bağla
          </a>
        </div>
      ) : null}
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
