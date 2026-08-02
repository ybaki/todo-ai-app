"use client";

interface TaskDurationRailProps {
  label: string;
  muted?: boolean;
}

/** Kart basinda dikey sure etiketi (asagidan yukari okuma). */
export function TaskDurationRail({ label, muted = false }: TaskDurationRailProps) {
  return (
    <div
      className={`flex w-9 shrink-0 items-center justify-center self-stretch border-r ${
        muted ? "border-slate-800/80" : "border-white/5"
      }`}
      aria-hidden
    >
      <span
        className={`select-none text-[10px] font-semibold leading-none tracking-tight ${
          muted ? "text-slate-600" : "text-slate-300/90"
        }`}
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {label}
      </span>
    </div>
  );
}
