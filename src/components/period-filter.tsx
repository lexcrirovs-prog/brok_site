"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { PeriodPreset } from "@/lib/period";

const options: { value: PeriodPreset; label: string }[] = [
  { value: "current-year", label: "Текущий год" },
  { value: "last-year", label: "Прошлый год" },
  { value: "current-month", label: "Текущий месяц" },
  { value: "last-30-days", label: "30 дней" },
  { value: "last-90-days", label: "90 дней" },
  { value: "custom", label: "Период" },
  { value: "all", label: "Все время" },
];

export function PeriodFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [preset, setPreset] = useState<PeriodPreset>((searchParams.get("period") as PeriodPreset) ?? "current-year");
  const [start, setStart] = useState(searchParams.get("start") ?? "");
  const [end, setEnd] = useState(searchParams.get("end") ?? "");

  function apply(nextPreset = preset) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", nextPreset);
    if (nextPreset === "custom") {
      if (start) params.set("start", start);
      if (end) params.set("end", end);
    } else {
      params.delete("start");
      params.delete("end");
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={preset}
        onChange={(event) => {
          const value = event.target.value as PeriodPreset;
          setPreset(value);
          apply(value);
        }}
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {preset === "custom" ? (
        <>
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          />
          <input
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => apply()}
            className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white"
          >
            Применить
          </button>
        </>
      ) : null}
    </div>
  );
}
