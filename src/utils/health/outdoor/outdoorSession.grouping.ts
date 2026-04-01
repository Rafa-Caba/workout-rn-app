// src/utils/health/outdoor/outdoorSession.grouping.ts

import type { OutdoorActivityType } from "@/src/types/health/healthOutdoor.types";
import type { ISODate, WorkoutSession } from "@/src/types/workoutDay.types";
import { isOutdoorActivityType } from "@/src/utils/health/outdoor/outdoorSession.helpers";

function getStartTimeValue(session: WorkoutSession): number {
    if (!session.startAt) return Number.NEGATIVE_INFINITY;

    const value = new Date(session.startAt).getTime();
    return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

function toDateKey(value: string | null | undefined): ISODate | null {
    if (!value) return null;

    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return null;

    return new Date(value).toISOString().slice(0, 10);
}

export function filterOutdoorSessions(
    sessions: WorkoutSession[],
    activityTypes?: OutdoorActivityType[]
): WorkoutSession[] {
    const allowed = Array.isArray(activityTypes) ? activityTypes : null;

    return sessions.filter((session) => {
        if (!isOutdoorActivityType(session.activityType)) {
            return false;
        }

        if (!allowed || allowed.length === 0) {
            return true;
        }

        return allowed.includes(session.activityType);
    });
}

export function sortOutdoorSessionsByStartAt(
    sessions: WorkoutSession[],
    direction: "asc" | "desc" = "asc"
): WorkoutSession[] {
    const sorted = [...sessions].sort((a, b) => {
        const aTime = getStartTimeValue(a);
        const bTime = getStartTimeValue(b);
        return aTime - bTime;
    });

    return direction === "desc" ? sorted.reverse() : sorted;
}

export function getOutdoorSessionsForDate(
    sessions: WorkoutSession[],
    date: ISODate,
    activityTypes?: OutdoorActivityType[]
): WorkoutSession[] {
    const outdoorSessions = filterOutdoorSessions(sessions, activityTypes);

    return outdoorSessions.filter((session) => {
        const startDate = toDateKey(session.startAt);
        const endDate = toDateKey(session.endAt);

        return startDate === date || endDate === date;
    });
}

export function groupOutdoorSessionsByActivityType(
    sessions: WorkoutSession[]
): Record<OutdoorActivityType, WorkoutSession[]> {
    const walking: WorkoutSession[] = [];
    const running: WorkoutSession[] = [];

    for (const session of filterOutdoorSessions(sessions)) {
        if (session.activityType === "walking") {
            walking.push(session);
            continue;
        }

        if (session.activityType === "running") {
            running.push(session);
        }
    }

    return {
        walking: sortOutdoorSessionsByStartAt(walking, "asc"),
        running: sortOutdoorSessionsByStartAt(running, "asc"),
    };
}