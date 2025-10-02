"use client";

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  className?: string;
  clearLabel?: string;
};

const STARS = [1, 2, 3, 4, 5] as const;

export function StarRating({ value, onChange, className = "", clearLabel = "クリア" }: Props) {
  const containerClass = ["flex items-center gap-1", className].filter(Boolean).join(" ");
  return (
    <div className={containerClass}>
      {STARS.map((s) => {
        const active = value !== null && value >= s;
        const buttonClass = [
          "text-xl",
          active ? "text-yellow-400" : "text-zinc-600 hover:text-zinc-400",
        ].join(" ");
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(active && value === s ? null : s)}
            className={buttonClass}
            aria-label={`${s} 星`}
          >
            {active ? "★" : "☆"}
          </button>
        );
      })}
      {value !== null && (
        <button className="ml-2 text-xs text-zinc-500 hover:text-zinc-300" onClick={() => onChange(null)}>
          {clearLabel}
        </button>
      )}
    </div>
  );
}
