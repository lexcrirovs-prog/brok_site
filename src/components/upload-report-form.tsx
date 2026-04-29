"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload } from "lucide-react";
import { withBasePath } from "@/lib/base-path";

export function UploadReportForm({ brokers }: { brokers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch(withBasePath("/api/imports"), {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.error ?? "Ошибка загрузки");
      return;
    }

    setMessage("Файл загружен");
    router.push(`/imports/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr_auto] lg:items-end">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Брокер
          <select name="brokerId" required className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
            {brokers.map((broker) => (
              <option key={broker.id} value={broker.id}>
                {broker.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Отчет
          <input
            name="file"
            type="file"
            accept=".csv,.xlsx,.pdf,text/csv,application/pdf"
            required
            className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {loading ? "Загрузка" : "Загрузить"}
        </button>
      </div>
      {message ? <div className="mt-3 text-sm text-slate-600">{message}</div> : null}
    </form>
  );
}
