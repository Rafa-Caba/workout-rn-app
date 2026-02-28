import { DAY_KEYS } from "@/src/utils/routines/plan";
import { weekKeyToStartDate } from "@/src/utils/weekKey";
import { addDays, format } from "date-fns";

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

export function getActiveDayDate(args: {
    weekKey: string;
    routine: unknown;
    dayKey: (typeof DAY_KEYS)[number];
}): string | null {
    const { weekKey, routine, dayKey } = args;

    // Prefer backend routine.days[].date if present
    if (isRecord(routine) && Array.isArray((routine as any).days)) {
        const hit = (routine as any).days.find((d: any) => d && d.dayKey === dayKey);
        if (hit && typeof hit.date === "string") return hit.date;
    }

    // Fallback compute from weekKey start date + index
    const start = weekKeyToStartDate(weekKey);
    if (!start) return null;

    const idx = DAY_KEYS.indexOf(dayKey);
    if (idx < 0) return null;

    return format(addDays(start, idx), "yyyy-MM-dd");
}

export function getSessionsFromWorkoutDay(day: unknown): Array<{ id: string; type?: string | null }> {
    if (!isRecord(day)) return [];
    const training = (day as any).training;
    if (!isRecord(training)) return [];
    const sessions = (training as any).sessions;
    if (!Array.isArray(sessions)) return [];

    return sessions
        .map((s) => (isRecord(s) ? s : null))
        .filter(Boolean)
        .map((s: any) => ({
            id: typeof s.id === "string" ? s.id : "",
            type: typeof s.type === "string" ? s.type : null,
        }))
        .filter((s) => s.id);
}