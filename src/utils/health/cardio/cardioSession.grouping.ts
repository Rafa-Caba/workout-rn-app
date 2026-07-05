// src/utils/health/cardio/cardioSession.grouping.ts
// Helpers to filter, sort, and group Cardio sessions by date, activity, and environment.

import type { CardioActivityType } from "@/src/types/health/healthCardio.types";
import type { ISODate, WorkoutCardioEnvironment, WorkoutSession } from "@/src/types/workoutDay.types";
import {
    isCardioActivityType,
    isCardioEnvironment,
    resolveWorkoutSessionCardioEnvironment,
} from "@/src/utils/health/cardio/cardioSession.helpers";

export type CardioEnvironmentFilter = Exclude<WorkoutCardioEnvironment, null>;
export type CardioEnvironmentGroupKey = CardioEnvironmentFilter | "unknown";

export type GroupedCardioSessions = Record<CardioEnvironmentGroupKey, Record<CardioActivityType, WorkoutSession[]>>;

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

export function filterCardioSessions(
    sessions: WorkoutSession[],
    activityTypes?: CardioActivityType[],
    cardioEnvironments?: CardioEnvironmentFilter[]
): WorkoutSession[] {
    const allowedActivities = Array.isArray(activityTypes) ? activityTypes : null;
    const allowedEnvironments = Array.isArray(cardioEnvironments) ? cardioEnvironments : null;

    return sessions.filter((session) => {
        if (!isCardioActivityType(session.activityType)) {
            return false;
        }

        if (allowedActivities && allowedActivities.length > 0 && !allowedActivities.includes(session.activityType)) {
            return false;
        }

        if (!allowedEnvironments || allowedEnvironments.length === 0) {
            return true;
        }

        const environment = resolveWorkoutSessionCardioEnvironment(session);
        return isCardioEnvironment(environment) && allowedEnvironments.includes(environment);
    });
}

export function sortCardioSessionsByStartAt(
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

export function getCardioSessionsForDate(
    sessions: WorkoutSession[],
    date: ISODate,
    activityTypes?: CardioActivityType[],
    cardioEnvironments?: CardioEnvironmentFilter[]
): WorkoutSession[] {
    const cardioSessions = filterCardioSessions(sessions, activityTypes, cardioEnvironments);

    return cardioSessions.filter((session) => {
        const startDate = toDateKey(session.startAt);
        const endDate = toDateKey(session.endAt);

        return startDate === date || endDate === date;
    });
}

export function groupCardioSessionsByEnvironmentAndActivity(
    sessions: WorkoutSession[]
): GroupedCardioSessions {
    const grouped: GroupedCardioSessions = {
        outdoor: {
            walking: [],
            running: [],
        },
        indoor: {
            walking: [],
            running: [],
        },
        unknown: {
            walking: [],
            running: [],
        },
    };

    for (const session of filterCardioSessions(sessions)) {
        const activityType = session.activityType;
        const environment = resolveWorkoutSessionCardioEnvironment(session);

        if (!isCardioActivityType(activityType)) {
            continue;
        }

        const groupKey: CardioEnvironmentGroupKey = isCardioEnvironment(environment)
            ? environment
            : "unknown";

        grouped[groupKey][activityType].push(session);
    }

    return {
        outdoor: {
            walking: sortCardioSessionsByStartAt(grouped.outdoor.walking, "asc"),
            running: sortCardioSessionsByStartAt(grouped.outdoor.running, "asc"),
        },
        indoor: {
            walking: sortCardioSessionsByStartAt(grouped.indoor.walking, "asc"),
            running: sortCardioSessionsByStartAt(grouped.indoor.running, "asc"),
        },
        unknown: {
            walking: sortCardioSessionsByStartAt(grouped.unknown.walking, "asc"),
            running: sortCardioSessionsByStartAt(grouped.unknown.running, "asc"),
        },
    };
}

export function groupCardioSessionsByActivityType(
    sessions: WorkoutSession[]
): Record<CardioActivityType, WorkoutSession[]> {
    const walking: WorkoutSession[] = [];
    const running: WorkoutSession[] = [];

    for (const session of filterCardioSessions(sessions)) {
        if (session.activityType === "walking") {
            walking.push(session);
            continue;
        }

        if (session.activityType === "running") {
            running.push(session);
        }
    }

    return {
        walking: sortCardioSessionsByStartAt(walking, "asc"),
        running: sortCardioSessionsByStartAt(running, "asc"),
    };
}
