"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { withBasePath } from "@/lib/base-path";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

const inputClass = "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm";
const buttonClass = "h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white";

export function AddBrokerForm() {
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    await fetch(withBasePath("/api/brokers"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_1fr_auto] lg:items-end">
      <Field label="Название">
        <input name="name" required className={inputClass} />
      </Field>
      <Field label="Тип">
        <select name="type" className={inputClass}>
          <option value="TBANK">TBANK</option>
          <option value="SBER">SBER</option>
          <option value="VTB">VTB</option>
          <option value="OTHER">OTHER</option>
        </select>
      </Field>
      <button className={buttonClass}>Добавить брокера</button>
    </form>
  );
}

export function AddAccountForm({ brokers }: { brokers: { id: string; name: string }[] }) {
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    await fetch(withBasePath("/api/accounts"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
      <Field label="Брокер">
        <select name="brokerId" required className={inputClass}>
          {brokers.map((broker) => (
            <option key={broker.id} value={broker.id}>
              {broker.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Счет">
        <input name="name" required className={inputClass} />
      </Field>
      <Field label="Тип">
        <select name="accountType" className={inputClass}>
          <option value="BROKERAGE">brokerage</option>
          <option value="IIS">IIS</option>
          <option value="OTHER">other</option>
        </select>
      </Field>
      <button className={buttonClass}>Добавить счет</button>
    </form>
  );
}

export function AddWatchlistForm({ instruments }: { instruments: { id: string; ticker: string; name: string }[] }) {
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    await fetch(withBasePath("/api/watchlist"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-4">
      <Field label="Инструмент">
        <select name="instrumentId" required className={inputClass}>
          {instruments.map((instrument) => (
            <option key={instrument.id} value={instrument.id}>
              {instrument.ticker} — {instrument.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Цена покупки">
        <input name="targetBuyPrice" className={inputClass} />
      </Field>
      <Field label="Приоритет">
        <input name="priority" type="number" min="1" max="5" defaultValue="3" className={inputClass} />
      </Field>
      <Field label="Статус">
        <select name="status" className={inputClass}>
          <option value="WATCHING">watching</option>
          <option value="BOUGHT">bought</option>
          <option value="REJECTED">rejected</option>
          <option value="ARCHIVED">archived</option>
        </select>
      </Field>
      <label className="grid gap-1 text-sm font-medium text-slate-700 lg:col-span-3">
        Причина
        <input name="reason" className={inputClass} />
      </label>
      <button className={buttonClass}>Добавить</button>
    </form>
  );
}

export function AddNoteForm({ instruments }: { instruments: { id: string; ticker: string; name: string }[] }) {
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    await fetch(withBasePath("/api/notes"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-3">
      <Field label="Инструмент">
        <select name="instrumentId" required className={inputClass}>
          {instruments.map((instrument) => (
            <option key={instrument.id} value={instrument.id}>
              {instrument.ticker} — {instrument.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Источник">
        <select name="sourceType" className={inputClass}>
          <option value="BLOGGER">blogger</option>
          <option value="ANALYST">analyst</option>
          <option value="OWN_IDEA">own_idea</option>
          <option value="NEWS">news</option>
          <option value="REPORT">report</option>
          <option value="OTHER">other</option>
        </select>
      </Field>
      <Field label="Имя источника">
        <input name="sourceName" className={inputClass} />
      </Field>
      <Field label="Заголовок">
        <input name="title" required className={inputClass} />
      </Field>
      <Field label="Целевая цена">
        <input name="expectedPrice" className={inputClass} />
      </Field>
      <Field label="Пересмотр">
        <input name="reviewDate" type="date" className={inputClass} />
      </Field>
      <label className="grid gap-1 text-sm font-medium text-slate-700 lg:col-span-3">
        Тезис
        <input name="thesis" className={inputClass} />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700 lg:col-span-3">
        Текст
        <textarea name="text" required rows={3} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <div className="lg:col-span-3">
        <button className={buttonClass}>Добавить заметку</button>
      </div>
    </form>
  );
}

export function PriceUpdateForm({ instruments }: { instruments: { id: string; ticker: string; name: string }[] }) {
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    await fetch(withBasePath("/api/prices"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_1fr_auto] lg:items-end">
      <Field label="Инструмент">
        <select name="instrumentId" required className={inputClass}>
          {instruments.map((instrument) => (
            <option key={instrument.id} value={instrument.id}>
              {instrument.ticker} — {instrument.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Цена">
        <input name="price" required className={inputClass} />
      </Field>
      <button className={buttonClass}>Обновить цену</button>
    </form>
  );
}

export function PriceCsvImportForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch(withBasePath("/api/prices/import"), { method: "POST", body: new FormData(form) });
    const result = await response.json();
    setMessage(`Обновлено цен: ${result.updated ?? 0}`);
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <Field label="CSV с ценами">
          <input name="file" type="file" accept=".csv,text/csv" required className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
        </Field>
        <button className={buttonClass}>Загрузить цены</button>
      </div>
      {message ? <div className="mt-3 text-sm text-slate-600">{message}</div> : null}
    </form>
  );
}
