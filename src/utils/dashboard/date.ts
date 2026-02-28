import type { ISODate, WeekKey } from "@/src/types/workoutDashboard.types";
import { toWeekKey } from "@/src/utils/weekKey";
import { addDays, format } from "date-fns";

export function todayIso(): ISODate {
    return format(new Date(), "yyyy-MM-dd") as ISODate;
}

export function weekKeyFromIso(today: ISODate): WeekKey {
    return toWeekKey(new Date(`${today}T00:00:00`)) as WeekKey;
}

export function last7Range(today: ISODate): { from: ISODate; to: ISODate } {
    const d = new Date(`${today}T00:00:00`);
    const from = format(addDays(d, -6), "yyyy-MM-dd") as ISODate;
    return { from, to: today };
}