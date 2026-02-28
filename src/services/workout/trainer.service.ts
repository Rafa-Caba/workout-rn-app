// /src/services/workout/trainer.service.ts
import { api } from "@/src/services/http.client";

import type { PublicUser } from "@/src/types/auth.types";
import type { ISODate, WeekKey, WeekViewResponse, WorkoutDay } from "@/src/types/workoutDay.types";

import type {
    GetTraineeDayResponse,
    GetTraineeRecoveryResponse,
    PatchPlannedRoutineBody,
    PatchPlannedRoutineResponse,
    WeeklyAssignBody,
    WeeklyAssignResponse,
} from "@/src/types/trainer.types";

import type {
    GetTraineeCoachProfileResponse,
    UpsertTraineeCoachProfileBody,
    UpsertTraineeCoachProfileResponse,
} from "@/src/types/trainerCoachProfile.types";

/**
 * =========================================================
 * Internal helpers
 * =========================================================
 */

function toStatus(e: any): number | null {
    return e?.status ?? e?.response?.status ?? null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function assertRecord(data: unknown, message: string): Record<string, unknown> {
    if (!isRecord(data)) {
        const err: any = new Error(message);
        err.status = 500;
        err.code = "INVALID_RESPONSE";
        err.details = { data };
        throw err;
    }
    return data;
}

/**
 * =========================================================
 * Trainer services
 * Base path: /api/trainer
 * (api instance already includes baseURL)
 * =========================================================
 */

/**
 * GET /trainer/trainees
 *
 * BE may return either:
 * - PublicUser[]
 * - { items: PublicUser[] } (paginated-like wrapper)
 */
export async function listTrainees(): Promise<PublicUser[]> {
    const res = await api.get("/trainer/trainees");
    const data = res.data as unknown;

    // Accept direct array
    if (Array.isArray(data)) {
        return data as PublicUser[];
    }

    // Accept wrapped { items: [...] }
    if (isRecord(data) && Array.isArray((data as any).items)) {
        return (data as any).items as PublicUser[];
    }

    const err: any = new Error("Invalid trainees response");
    err.status = 500;
    err.code = "INVALID_RESPONSE";
    err.details = { data };
    throw err;
}

/**
 * GET /trainer/trainees/:id/day?date=YYYY-MM-DD
 * BE returns: { day: WorkoutDayDoc | null }
 */
export async function getTraineeDay(traineeId: string, date: ISODate): Promise<GetTraineeDayResponse> {
    const res = await api.get(`/trainer/trainees/${encodeURIComponent(traineeId)}/day`, {
        params: { date },
    });

    const obj = assertRecord(res.data as unknown, "Invalid trainee day response");

    // Allow { day: null } or { day: {..} }
    return obj as unknown as GetTraineeDayResponse;
}

/**
 * GET /trainer/trainees/:id/summary/week
 */
export type GetTraineeWeekSummaryArgs = {
    traineeId: string;
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

function buildWeekSummaryParams(args: GetTraineeWeekSummaryArgs): Record<string, unknown> {
    const params: Record<string, unknown> = {
        weekKey: args.weekKey,
    };

    // fields can be string[] or comma string in BE; we send string[] (safe)
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

export async function getTraineeWeekSummary(args: GetTraineeWeekSummaryArgs): Promise<WeekViewResponse> {
    const { traineeId } = args;

    const res = await api.get(`/trainer/trainees/${encodeURIComponent(traineeId)}/summary/week`, {
        params: buildWeekSummaryParams(args),
    });

    const obj = assertRecord(res.data as unknown, "Invalid trainee week summary response");
    return obj as unknown as WeekViewResponse;
}

/**
 * GET /trainer/trainees/:id/recovery?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function getTraineeRecovery(
    traineeId: string,
    from: ISODate,
    to: ISODate
): Promise<GetTraineeRecoveryResponse> {
    const res = await api.get(`/trainer/trainees/${encodeURIComponent(traineeId)}/recovery`, {
        params: { from, to },
    });

    const obj = assertRecord(res.data as unknown, "Invalid trainee recovery response");
    return obj as unknown as GetTraineeRecoveryResponse;
}

/**
 * PATCH /trainer/trainees/:id/days/:date/plannedRoutine
 */
export async function patchTraineePlannedRoutine(
    traineeId: string,
    date: ISODate,
    body: PatchPlannedRoutineBody
): Promise<PatchPlannedRoutineResponse> {
    const res = await api.patch(
        `/trainer/trainees/${encodeURIComponent(traineeId)}/days/${encodeURIComponent(date)}/plannedRoutine`,
        body
    );

    const obj = assertRecord(res.data as unknown, "Invalid patch plannedRoutine response");
    return obj as unknown as PatchPlannedRoutineResponse;
}

/**
 * POST /trainer/trainees/:id/weeks/:weekKey/assign
 */
export async function assignWeekToTrainee(
    traineeId: string,
    weekKey: WeekKey,
    body: WeeklyAssignBody
): Promise<WeeklyAssignResponse> {
    const res = await api.post(
        `/trainer/trainees/${encodeURIComponent(traineeId)}/weeks/${encodeURIComponent(weekKey)}/assign`,
        body
    );

    const obj = assertRecord(res.data as unknown, "Invalid weekly assign response");
    return obj as unknown as WeeklyAssignResponse;
}

/**
 * =========================================================
 * Optional convenience wrappers
 * =========================================================
 */

export async function safePatchTraineePlannedRoutine(
    traineeId: string,
    date: ISODate,
    body: PatchPlannedRoutineBody
): Promise<WorkoutDay> {
    try {
        return await patchTraineePlannedRoutine(traineeId, date, body);
    } catch (e: any) {
        const status = toStatus(e);

        if (status === 409) {
            const err: any = new Error("Planned routine is locked by training");
            err.status = 409;
            err.code = "PLANNED_LOCKED_BY_TRAINING";
            err.details = { traineeId, date };
            throw err;
        }

        throw e;
    }
}

export function defaultTrainerWeekSummaryParams(weekKey: WeekKey): Omit<GetTraineeWeekSummaryArgs, "traineeId"> {
    return {
        weekKey,
        fields: null,

        fillMissingDays: true,
        includeRollups: true,

        includeSleep: true,
        includeTraining: true,

        includeSummaries: true,
        includeTotals: true,
        includeTypes: true,

        includeRaw: false,
    };
}

/**
 * =========================================================
 * Coach ↔ Trainee Profile (coach-owned)
 * =========================================================
 */

/**
 * GET /trainer/trainees/:id/profile
 * BE returns: { profile: CoachTraineeProfile | null }
 */
export async function getTraineeCoachProfile(traineeId: string): Promise<GetTraineeCoachProfileResponse> {
    const res = await api.get(`/trainer/trainees/${encodeURIComponent(traineeId)}/profile`);
    const obj = assertRecord(res.data as unknown, "Invalid coach profile response");
    return obj as unknown as GetTraineeCoachProfileResponse;
}

/**
 * PUT /trainer/trainees/:id/profile
 * BE returns: { profile: CoachTraineeProfile }
 */
export async function upsertTraineeCoachProfile(
    traineeId: string,
    body: UpsertTraineeCoachProfileBody
): Promise<UpsertTraineeCoachProfileResponse> {
    const res = await api.put(`/trainer/trainees/${encodeURIComponent(traineeId)}/profile`, body);
    const obj = assertRecord(res.data as unknown, "Invalid upsert coach profile response");
    return obj as unknown as UpsertTraineeCoachProfileResponse;
}