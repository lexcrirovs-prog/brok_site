import clsx from "clsx";

export function StatCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "positive" | "negative" | "warning";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div
        className={clsx(
          "mt-2 text-2xl font-semibold tracking-tight",
          tone === "positive" && "text-emerald-700",
          tone === "negative" && "text-rose-700",
          tone === "warning" && "text-amber-700",
          tone === "neutral" && "text-slate-950",
        )}
      >
        {value}
      </div>
      {detail ? <div className="mt-1 text-sm text-slate-500">{detail}</div> : null}
    </div>
  );
}
