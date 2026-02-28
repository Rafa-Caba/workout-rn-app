// /src/services/workout/insights.service.ts
import { api } from "@/src/services/http.client";

export type ISODate = string; // YYYY-MM-DD
export type WeekKey = string; // YYYY-W##

/** =========================
 *  PRs
 *  ========================= */
export type InsightMetric =
    | "activeKcal"
    | "durationSeconds"
    | "avgHr"
    | "maxHr"
    | "distanceKm"
    | "steps"
    | "paceSecPerKm";

export type PrRecord = {
    metric: InsightMetric;
    mode: "max" | "min";
    value: number;
    date: ISODate;
    weekKey: WeekKey;
    sessionId: string;
    sessionType: string;
};

export type PrsResponse = {
    range: { from: ISODate; to: ISODate };
    prs: PrRecord[];
};

/** =========================
 *  Recovery
 *  ========================= */
export type RecoveryLevel = "green" | "yellow" | "red" | "unknown";

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

export type RecoveryResponse = {
    range: { from: ISODate; to: ISODate };
    points: RecoveryPoint[];
};

/** =========================
 *  Streaks
 *  ========================= */
export type StreaksMode = "training" | "sleep" | "both";

export type StreaksResponse = {
    asOf: ISODate;
    mode: StreaksMode;
    gapDays: number;

    currentStreakDays: number;
    longestStreakDays: number;

    lastQualifiedDate: ISODate | null;
};

export async function getStreaks(args: { mode: StreaksMode; gapDays?: number; asOf?: ISODate }): Promise<StreaksResponse> {
    const res = await api.get(`/workout/insights/streaks`, {
        params: { mode: args.mode, gapDays: args.gapDays, asOf: args.asOf },
    });
    return res.data as StreaksResponse;
}

export async function getPRs(args: { from?: ISODate; to?: ISODate }): Promise<PrsResponse> {
    const res = await api.get(`/workout/insights/prs`, { params: { from: args.from, to: args.to } });
    return res.data as PrsResponse;
}

export async function getRecovery(args: { from?: ISODate; to?: ISODate }): Promise<RecoveryResponse> {
    const res = await api.get(`/workout/insights/recovery`, { params: { from: args.from, to: args.to } });
    return res.data as RecoveryResponse;
}