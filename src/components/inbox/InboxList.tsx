"use client";

import type { TaskRow } from "@/types/database";
import { QUADRANT_LABELS, QUADRANT_ORDER } from "@/lib/quadrant";

interface InboxListProps {
  tasks: TaskRow[];
  onAnalyze: (taskId: string) => void;
  onManualQuadrant: (taskId: string, quadrant: TaskRow["quadrant"]) => void;
  onDelete: (taskId: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  inbox: "Inbox",
  analyzing: "AI analiz ediyor...",
  needs_user_input: "AI belirleyemedi, sen sec",
};

export function InboxList({ tasks, onAnalyze, onManualQuadrant, onDelete }: InboxListProps) {
  const visibleTasks = tasks.filter((task) =>
    ["inbox", "analyzing", "needs_user_input"].includes(task.status)
  );

  if (visibleTasks.length === 0) {
    return <p className="text-sm text-slate-500">Inbox bos. Yeni bir gorev ekleyerek basla.</p>;
  }

  return (
    <ul className="space-y-2">
      {visibleTasks.map((task) => (
        <li key={task.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <p className="text-sm text-slate-100">{task.raw_text}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">{STATUS_LABEL[task.status] ?? task.status}</span>
            <div className="flex gap-2">
              {task.status === "inbox" ? (
                <button
                  onClick={() => onAnalyze(task.id)}
                  className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-500"
                >
                  AI ile analiz et
                </button>
              ) : null}
              <button
                onClick={() => onDelete(task.id)}
                className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-red-500 hover:text-red-400"
              >
                Sil
              </button>
            </div>
          </div>

          {task.status === "needs_user_input" ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUADRANT_ORDER.map((quadrant) => (
                <button
                  key={quadrant}
                  onClick={() => onManualQuadrant(task.id, quadrant)}
                  className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-blue-500 hover:text-blue-300"
                >
                  {QUADRANT_LABELS[quadrant]}
                </button>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
