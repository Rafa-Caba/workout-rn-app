import type { WeekKey, WeeksTrendResponse } from "@/src/types/workoutDashboard.types";
import { format } from "date-fns";

export function secondsToHhMm(sec: number): string {
    const safe = Number.isFinite(sec) ? Math.max(0, Math.floor(sec)) : 0;
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function minutesToHhMm(min: number): string {
    const safe = Number.isFinite(min) ? Math.max(0, Math.floor(min)) : 0;
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatIsoToPPP(isoDate: string): string {
    const dt = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return "—";
    return format(dt, "PPP");
}

export function getSafeUserName(user: unknown): string {
    if (!user || typeof user !== "object") return "—";
    const name = (user as { name?: unknown }).name;
    return typeof name === "string" && name.trim() ? name.trim() : "—";
}

export function pickTrendPointForWeek(trend: WeeksTrendResponse | undefined, weekKey: WeekKey) {
    const points = trend?.points ?? [];
    return points.find((p) => p.weekKey === weekKey) ?? points[0] ?? null;
}