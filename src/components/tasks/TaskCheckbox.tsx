"use client";

interface TaskCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function TaskCheckbox({ checked, onChange, disabled }: TaskCheckboxProps) {
  return (
    <label
      className={`group relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-slate-500 bg-slate-900/80 transition-all duration-200 ease-out peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/50 peer-checked:scale-105 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 group-hover:border-slate-400 peer-checked:group-hover:border-emerald-400"
        aria-hidden
      >
        <svg
          viewBox="0 0 12 10"
          className={`h-3 w-3 text-white transition-all duration-200 ${
            checked ? "scale-100 opacity-100" : "scale-75 opacity-0"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 5.5 4.5 9 11 1" />
        </svg>
      </span>
    </label>
  );
}
