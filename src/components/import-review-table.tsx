"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { withBasePath } from "@/lib/base-path";

type ImportReviewRow = {
  id: string;
  rowIndex: number;
  status: string;
  warning?: string | null;
  rawData: unknown;
  normalizedData?: {
    accountId?: string;
    accountName?: string;
    instrumentId?: string | null;
    instrumentName?: string | null;
    date?: string;
    operationType?: string;
    quantity?: string;
    price?: string;
    amountGross?: string;
    taxAmount?: string;
    commissionAmount?: string;
    amountNet?: string;
    currency?: string;
    fingerprint?: string;
    duplicate?: boolean;
    rawText?: string;
  } | null;
};

const operationTypes = [
  "BUY",
  "SELL",
  "DIVIDEND",
  "COUPON",
  "BOND_REDEMPTION",
  "TAX",
  "COMMISSION",
  "DEPOSIT",
  "WITHDRAWAL",
  "CURRENCY_EXCHANGE",
  "BROKER_FEE",
  "OTHER",
];

export function ImportReviewTable({ importFileId, rows }: { importFileId: string; rows: ImportReviewRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(rows);
  const [message, setMessage] = useState("");

  function updateRow(id: string, key: string, value: string) {
    setItems((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              normalizedData: {
                ...(row.normalizedData ?? {}),
                [key]: value,
              },
            }
          : row,
      ),
    );
  }

  async function saveRow(row: ImportReviewRow) {
    await fetch(withBasePath(`/api/import-rows/${row.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ normalizedData: row.normalizedData, status: "RECOGNIZED" }),
    });
    router.refresh();
  }

  async function deleteRow(id: string) {
    await fetch(withBasePath(`/api/import-rows/${id}`), { method: "DELETE" });
    setItems((current) => current.filter((row) => row.id !== id));
    router.refresh();
  }

  async function confirmImport() {
    const response = await fetch(withBasePath(`/api/imports/${importFileId}/confirm`), { method: "POST" });
    const result = await response.json();
    setMessage(`Сохранено: ${result.created ?? 0}. Дубли: ${result.duplicates ?? 0}.`);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <div className="font-semibold">Проверка операций</div>
        <button
          type="button"
          onClick={confirmImport}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white"
        >
          <Check className="h-4 w-4" />
          Подтвердить импорт
        </button>
      </div>
      {message ? <div className="border-b border-slate-200 px-4 py-2 text-sm text-slate-600">{message}</div> : null}
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.06em] text-slate-500">
            <tr>
              {[
                "Дата",
                "Счет",
                "Инструмент",
                "Тип",
                "Кол-во",
                "Цена",
                "До налогов",
                "Налог",
                "Комиссия",
                "После налогов",
                "Валюта",
                "Статус",
                "",
              ].map((header) => (
                <th key={header} className="border-b border-slate-200 px-3 py-3 text-left font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const normalized = row.normalizedData ?? {};
              return (
                <tr key={row.id} className="border-b border-slate-100 align-top">
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={normalized.date?.slice(0, 10) ?? ""}
                      onChange={(event) => updateRow(row.id, "date", event.target.value)}
                      className="h-9 w-36 rounded-md border border-slate-300 px-2"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={normalized.accountName ?? ""}
                      onChange={(event) => updateRow(row.id, "accountName", event.target.value)}
                      className="h-9 w-44 rounded-md border border-slate-300 px-2"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={normalized.instrumentName ?? ""}
                      onChange={(event) => updateRow(row.id, "instrumentName", event.target.value)}
                      className="h-9 w-48 rounded-md border border-slate-300 px-2"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={normalized.operationType ?? "OTHER"}
                      onChange={(event) => updateRow(row.id, "operationType", event.target.value)}
                      className="h-9 w-44 rounded-md border border-slate-300 bg-white px-2"
                    >
                      {operationTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>
                  {["quantity", "price", "amountGross", "taxAmount", "commissionAmount", "amountNet", "currency"].map((key) => (
                    <td key={key} className="px-3 py-2">
                      <input
                        value={String(normalized[key as keyof typeof normalized] ?? "")}
                        onChange={(event) => updateRow(row.id, key, event.target.value)}
                        className="h-9 w-28 rounded-md border border-slate-300 px-2"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="whitespace-nowrap text-xs font-medium text-slate-600">{row.status}</div>
                    {row.warning ? <div className="mt-1 max-w-48 text-xs text-amber-700">{row.warning}</div> : null}
                    {normalized.duplicate ? <div className="mt-1 text-xs text-rose-700">Дубль</div> : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => saveRow(row)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300"
                        title="Сохранить строку"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-rose-700"
                        title="Удалить строку"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
