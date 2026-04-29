"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  FileUp,
  Home,
  Landmark,
  NotebookText,
  Settings,
  Table2,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/transactions", label: "Transactions", icon: Table2 },
  { href: "/imports", label: "Import Reports", icon: FileUp },
  { href: "/brokers", label: "Brokers", icon: Landmark },
  { href: "/instruments", label: "Instruments", icon: BriefcaseBusiness },
  { href: "/watchlist", label: "Watchlist", icon: Bell },
  { href: "/notes", label: "Notes", icon: NotebookText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center border-b border-slate-200 px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            brok_site
          </Link>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                  active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <div className="text-sm font-medium text-slate-500">Учет инвестиционного портфеля</div>
              <div className="text-xl font-semibold tracking-tight">Единая картина по брокерам</div>
            </div>
            <div className="flex flex-wrap gap-2 lg:hidden">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "rounded-md border px-3 py-2 text-xs font-medium",
                    pathname === item.href ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
