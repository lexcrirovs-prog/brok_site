export type Period = {
  startDate: Date;
  endDate: Date;
};

export type PeriodPreset =
  | "current-year"
  | "last-year"
  | "current-month"
  | "last-30-days"
  | "last-90-days"
  | "custom"
  | "all";

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function getPeriodFromPreset(
  preset: PeriodPreset = "current-year",
  customStart?: string | null,
  customEnd?: string | null,
): Period {
  const now = new Date();
  const endDate = endOfDay(now);

  if (preset === "all") {
    return {
      startDate: new Date("1970-01-01T00:00:00.000Z"),
      endDate,
    };
  }

  if (preset === "last-year") {
    return {
      startDate: new Date(now.getFullYear() - 1, 0, 1),
      endDate: endOfDay(new Date(now.getFullYear() - 1, 11, 31)),
    };
  }

  if (preset === "current-month") {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate,
    };
  }

  if (preset === "last-30-days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { startDate: startOfDay(start), endDate };
  }

  if (preset === "last-90-days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 90);
    return { startDate: startOfDay(start), endDate };
  }

  if (preset === "custom" && customStart && customEnd) {
    return {
      startDate: startOfDay(new Date(customStart)),
      endDate: endOfDay(new Date(customEnd)),
    };
  }

  return {
    startDate: new Date(now.getFullYear(), 0, 1),
    endDate,
  };
}

export function getDaysInPeriod(period: Period): number {
  const day = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / day));
}

export function isWithinPeriod(date: Date | string, period: Period): boolean {
  const time = new Date(date).getTime();
  return time >= period.startDate.getTime() && time <= period.endDate.getTime();
}

export function monthKey(date: Date | string): string {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}
