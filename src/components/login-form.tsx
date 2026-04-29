"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { withBasePath } from "@/lib/base-path";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch(withBasePath("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const result = await response.json();
      setError(result.error ?? "Ошибка входа");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold tracking-tight">Вход</h1>
      <div className="mt-5 grid gap-3">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Email
          <input name="email" type="email" required defaultValue="investor@example.com" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Пароль
          <input name="password" type="password" required defaultValue="password123" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        </label>
      </div>
      {error ? <div className="mt-3 text-sm text-rose-700">{error}</div> : null}
      <button className="mt-5 h-10 w-full rounded-md bg-slate-950 text-sm font-medium text-white">Войти</button>
    </form>
  );
}
