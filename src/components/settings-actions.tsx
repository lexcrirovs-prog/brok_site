"use client";

import { useState } from "react";
import { withBasePath } from "@/lib/base-path";

export function SettingsActions() {
  const [message, setMessage] = useState("");

  async function clearTestData() {
    const response = await fetch(withBasePath("/api/settings/clear-test-data"), { method: "POST" });
    setMessage(response.ok ? "Тестовые операции очищены" : "Ошибка очистки");
  }

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-3">
      <a
        href={withBasePath("/api/settings/export")}
        className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 text-sm font-medium"
      >
        Экспорт CSV
      </a>
      <a
        href={withBasePath("/api/settings/backup")}
        className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 text-sm font-medium"
      >
        Резервная копия JSON
      </a>
      <button
        type="button"
        onClick={clearTestData}
        className="h-10 rounded-md border border-rose-200 text-sm font-medium text-rose-700"
      >
        Очистить тестовые данные
      </button>
      {message ? <div className="text-sm text-slate-600 lg:col-span-3">{message}</div> : null}
    </div>
  );
}

export function DefaultCurrencyForm() {
  const [currency, setCurrency] = useState("RUB");
  const [message, setMessage] = useState("");

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem("brok_site_default_currency", currency);
    setMessage("Валюта сохранена");
  }

  return (
    <form onSubmit={save} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Валюта по умолчанию
        <select
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="RUB">RUB</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="CNY">CNY</option>
        </select>
      </label>
      <button className="mt-3 h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white">Сохранить</button>
      {message ? <div className="mt-3 text-sm text-slate-600">{message}</div> : null}
    </form>
  );
}
