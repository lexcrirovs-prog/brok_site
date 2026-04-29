"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, Search } from "lucide-react";

export type DataTableRow = {
  id: string;
  [key: string]: string | number | null | undefined;
};

export type DataTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
  hrefPrefix?: string;
};

export function DataTable({
  columns,
  rows,
  filterKey,
  filterLabel = "Фильтр",
}: {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  filterKey?: string;
  filterLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? "id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("all");

  const filterValues = useMemo(() => {
    if (!filterKey) return [];
    return [...new Set(rows.map((row) => String(row[filterKey] ?? "")).filter(Boolean))].sort();
  }, [filterKey, rows]);

  const visibleRows = useMemo(() => {
    return rows
      .filter((row) => {
        const matchesQuery = Object.values(row).join(" ").toLowerCase().includes(query.toLowerCase());
        const matchesFilter = filter === "all" || String(row[filterKey ?? ""] ?? "") === filter;
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => {
        const left = a[sortKey] ?? "";
        const right = b[sortKey] ?? "";
        const result =
          typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left).localeCompare(String(right), "ru");
        return sortDir === "asc" ? result : -result;
      });
  }, [rows, query, filter, filterKey, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((value) => (value === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск"
            className="h-9 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-slate-950"
          />
        </label>
        {filterKey ? (
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="all">{filterLabel}: все</option>
            {filterValues.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.06em] text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="border-b border-slate-200 px-4 py-3 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex items-center gap-1"
                  >
                    {column.label}
                    <ArrowDownUp className="h-3 w-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {columns.map((column) => {
                  const content = row[column.key] ?? "";
                  return (
                    <td
                      key={column.key}
                      className={`border-b border-slate-100 px-4 py-3 ${column.align === "right" ? "text-right tabular-nums" : "text-left"}`}
                    >
                      {column.hrefPrefix ? (
                        <Link className="font-medium text-slate-950 underline-offset-4 hover:underline" href={`${column.hrefPrefix}/${row.id}`}>
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {visibleRows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length}>
                  Нет данных
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
