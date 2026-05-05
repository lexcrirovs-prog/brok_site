"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import clsx from "clsx";
import { withBasePath } from "@/lib/base-path";

type MoexUpdateResponse = {
  updated?: number;
  errors?: number;
  items?: { ticker: string; status: string; message?: string }[];
};

export function MoexPriceRefreshButton({
  instrumentId,
  compact = false,
}: {
  instrumentId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(withBasePath("/api/prices/moex"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(instrumentId ? { instrumentIds: [instrumentId] } : {}),
      });
      const result = (await response.json()) as MoexUpdateResponse;
      const failed = result.errors ?? 0;
      setMessage(`MOEX: обновлено ${result.updated ?? 0}${failed ? `, ошибок ${failed}` : ""}`);
      router.refresh();
    } catch {
      setMessage("MOEX: ошибка обновления");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={clsx("flex flex-col gap-2", compact ? "items-start lg:items-end" : "")}>
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className={clsx(
          "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60",
          compact ? "w-full sm:w-auto" : "w-full",
        )}
      >
        <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin")} />
        {loading ? "Обновляю" : instrumentId ? "Цена MOEX" : "Обновить MOEX"}
      </button>
      {message ? <div className="text-xs text-slate-500">{message}</div> : null}
    </div>
  );
}

export function MoexPriceUpdatePanel({ supportedCount }: { supportedCount: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-950">Котировки Московской биржи</h3>
        <div className="text-sm text-slate-600">MOEX ISS, бесплатные данные с задержкой. Инструментов: {supportedCount}</div>
      </div>
      <MoexPriceRefreshButton />
    </div>
  );
}
