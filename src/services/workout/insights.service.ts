// src/services/workout/insights.service.ts
// Typed API contracts for streaks, personal records, and recovery insights.

import { api } from "@/src/services/http.client";

export type ISODate = string; // YYYY-MM-DD
export type WeekKey = string; // YYYY-W##

/** Metrics supported by the personal-records endpoint. */
export type InsightMetric =
    | "activeKcal"
    | "durationSeconds"
    | "avgHr"
    | "maxHr"
    | "distanceKm"
    | "steps"
    | "paceSecPerKm";

/** One personal record returned by the API. */
export type PrRecord = {
    metric: InsightMetric;
    mode: "max" | "min";
    value: number;
    date: ISODate;
    weekKey: WeekKey;
    sessionId: string;
    sessionType: string;
};

/** API response for personal records within a date range. */
export type PrsResponse = {
    range: { from: ISODate; to: ISODate };
    prs: PrRecord[];
};

/** Recovery traffic-light classification returned by the API. */
export type RecoveryLevel = "green" | "yellow" | "red" | "unknown";

/** One daily recovery point returned by the API. */
export type RecoveryPoint = {
    date: ISODate;
    weekKey: WeekKey;
    sleepScore: number | null;
    deepMinutes: number | null;
    totalSleepMinutes: number | null;
    trainingLoad: number;
    recoveryScore: number | null;
    level: RecoveryLevel;
};

/** API response for recovery within a date range. */
export type RecoveryResponse = {
    range: { from: ISODate; to: ISODate };
    points: RecoveryPoint[];
};

/** Dataset used to calculate a streak. */
export type StreaksMode = "training" | "sleep" | "both";

/** API response for the streak calculation. */
export type StreaksResponse = {
    asOf: ISODate;
    mode: StreaksMode;
    gapDays: number;
    currentStreakDays: number;
    longestStreakDays: number;
    lastQualifiedDate: ISODate | null;
};

/** Query parameters accepted by the streak endpoint. */
export type GetStreaksArgs = {
    mode: StreaksMode;
    gapDays?: number;
    asOf?: ISODate;
};

/** Shared query parameters accepted by PR and recovery endpoints. */
export type GetInsightRangeArgs = {
    from?: ISODate;
    to?: ISODate;
};

/** Loads the current and longest streak for the selected dataset. */
export async function getStreaks(args: GetStreaksArgs): Promise<StreaksResponse> {
    const response = await api.get<StreaksResponse>("/workout/insights/streaks", {
        params: {
            mode: args.mode,
            gapDays: args.gapDays,
            asOf: args.asOf,
        },
    });

    return response.data;
}

/** Loads personal records for the selected inclusive date range. */
export async function getPRs(args: GetInsightRangeArgs): Promise<PrsResponse> {
    const response = await api.get<PrsResponse>("/workout/insights/prs", {
        params: {
            from: args.from,
            to: args.to,
        },
    });

    return response.data;
}

/** Loads daily recovery points for the selected inclusive date range. */
export async function getRecovery(args: GetInsightRangeArgs): Promise<RecoveryResponse> {
    const response = await api.get<RecoveryResponse>("/workout/insights/recovery", {
        params: {
            from: args.from,
            to: args.to,
        },
    });

    return response.data;
}
