"use client";

import { useRouter } from "next/navigation";
import { RotateCw, Trash2 } from "lucide-react";
import { withBasePath } from "@/lib/base-path";

export function ImportActions({ importFileId }: { importFileId: string }) {
  const router = useRouter();

  async function reprocess() {
    await fetch(withBasePath(`/api/imports/${importFileId}/reprocess`), { method: "POST" });
    router.refresh();
  }

  async function remove() {
    await fetch(withBasePath(`/api/imports/${importFileId}`), { method: "DELETE" });
    router.push("/imports");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={reprocess}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium"
      >
        <RotateCw className="h-4 w-4" />
        Повторить
      </button>
      <button
        type="button"
        onClick={remove}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-rose-200 bg-white px-3 text-sm font-medium text-rose-700"
      >
        <Trash2 className="h-4 w-4" />
        Удалить
      </button>
    </div>
  );
}
