// /src/services/workout/workoutWeek.service.ts
import { api } from "@/src/services/http.client";
import type { WeekKey, WeekViewResponse } from "@/src/types/workoutDay.types";

type AnyRecord = Record<string, unknown>;
function isRecord(v: unknown): v is AnyRecord {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function assertRecord(data: unknown, message: string): AnyRecord {
    if (!isRecord(data)) {
        const err: any = new Error(message);
        err.status = 500;
        err.code = "INVALID_RESPONSE";
        err.details = { data };
        throw err;
    }
    return data;
}

export type GetWorkoutWeekArgs = {
    weekKey: WeekKey;
    fields?: string[] | null;

    fillMissingDays?: boolean;
    includeRollups?: boolean;

    includeSleep?: boolean;
    includeTraining?: boolean;

    includeSummaries?: boolean;
    includeTotals?: boolean;
    includeTypes?: boolean;

    includeRaw?: boolean;
};

function buildWeekParams(args: GetWorkoutWeekArgs): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (args.fields !== undefined) params.fields = args.fields;

    if (args.fillMissingDays !== undefined) params.fillMissingDays = args.fillMissingDays;
    if (args.includeRollups !== undefined) params.includeRollups = args.includeRollups;

    if (args.includeSleep !== undefined) params.includeSleep = args.includeSleep;
    if (args.includeTraining !== undefined) params.includeTraining = args.includeTraining;

    if (args.includeSummaries !== undefined) params.includeSummaries = args.includeSummaries;
    if (args.includeTotals !== undefined) params.includeTotals = args.includeTotals;
    if (args.includeTypes !== undefined) params.includeTypes = args.includeTypes;

    if (args.includeRaw !== undefined) params.includeRaw = args.includeRaw;

    return params;
}

/**
 * GET /workout/week/:weekKey
 * Returns WeekViewResponse
 */
export async function getWorkoutWeekView(args: GetWorkoutWeekArgs): Promise<WeekViewResponse> {
    const res = await api.get(`/workout/week/${encodeURIComponent(args.weekKey)}`, {
        params: buildWeekParams(args),
    });

    const obj = assertRecord(res.data as unknown, "Invalid workout week view response");
    return obj as unknown as WeekViewResponse;
}

/**
 * Convenience defaults for Trainee Gym Check.
 */
export function defaultTraineeWeekViewParams(weekKey: WeekKey): GetWorkoutWeekArgs {
    return {
        weekKey,
        fields: null,

        fillMissingDays: true,
        includeRollups: false,

        includeSleep: false,
        includeTraining: true,

        includeSummaries: false,
        includeTotals: false,
        includeTypes: false,

        includeRaw: false,
    };
}