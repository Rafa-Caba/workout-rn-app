// src/hooks/summary/usePlanVsActual.ts
import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getPlanVsActual } from "@/src/services/planVsActual.service";
import { getRoutineWeek } from "@/src/services/workout/routines.service";
import { mergePlanVsActualPlanned } from "@/src/utils/pva/mergePlanVsActual";
import type { DayKey } from "@/src/utils/routines/plan";

type ISODate = string;

type PvaRange = {
    from: ISODate;
    to: ISODate;
};

type PvaPlanned = {
    sessionType: string | null;
    focus: string | null;
    tags: string[] | null;
};

type PvaActualSession = {
    id: string;
    type: string;
};

type PvaGymCheckSummary = {
    durationMin: number | null;
    notes: string | null;
    totalPlannedExercises: number;
    doneExercises: number;
    hasAnyCheck: boolean;
};

export type PlanVsActualDay = {
    date: ISODate;
    dayKey: DayKey;
    planned: PvaPlanned | null;
    actual: { sessions: PvaActualSession[] };
    status: string;
    gymCheck?: PvaGymCheckSummary; // injected by merge
};

export type PlanVsActualMerged = {
    weekKey: string;
    range: PvaRange;
    hasRoutineTemplate: boolean;
    days: PlanVsActualDay[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hasDaysShape(v: unknown): v is { days: unknown[] } {
    return isRecord(v) && Array.isArray((v as any).days);
}

/**
 * mergePlanVsActualPlanned might return either:
 *  A) the merged PVA object directly: { weekKey, range, days: [...] }
 *  B) a debug wrapper: { pva: {...}, nextDays: [...] }
 *
 * This normalizes to: { ...pva, days: nextDays } if wrapper,
 * or returns the merged object if already in shape.
 */
function normalizeMergedResult(merged: unknown, weekKey: string): PlanVsActualMerged {
    // Case A: merged object already has days
    if (hasDaysShape(merged)) {
        const wk = typeof (merged as any).weekKey === "string" ? ((merged as any).weekKey as string) : weekKey;
        const range = isRecord((merged as any).range)
            ? {
                from: String((merged as any).range.from ?? ""),
                to: String((merged as any).range.to ?? ""),
            }
            : { from: "", to: "" };

        return {
            weekKey: wk,
            range,
            hasRoutineTemplate: Boolean((merged as any).hasRoutineTemplate),
            days: ((merged as any).days ?? []) as PlanVsActualDay[],
        };
    }

    // Case B: wrapper shape { pva, nextDays }
    if (isRecord(merged) && isRecord((merged as any).pva) && Array.isArray((merged as any).nextDays)) {
        const pva = (merged as any).pva;

        const wk = typeof pva.weekKey === "string" ? (pva.weekKey as string) : weekKey;

        const range = isRecord(pva.range)
            ? { from: String(pva.range.from ?? ""), to: String(pva.range.to ?? "") }
            : { from: "", to: "" };

        return {
            weekKey: wk,
            range,
            hasRoutineTemplate: Boolean(pva.hasRoutineTemplate),
            days: (merged as any).nextDays as PlanVsActualDay[],
        };
    }

    // Fallback (shouldn't happen): empty shape but stable
    return {
        weekKey,
        range: { from: "", to: "" },
        hasRoutineTemplate: false,
        days: [],
    };
}

export function usePlanVsActual(weekKey: string, enabled: boolean = true) {
    return useQuery<PlanVsActualMerged, ApiAxiosError>({
        queryKey: ["planVsActual", weekKey],
        enabled: Boolean(weekKey) && enabled,
        queryFn: async () => {
            const [pva, routine] = await Promise.all([
                getPlanVsActual(weekKey),
                getRoutineWeek(weekKey).catch(() => null),
            ]);

            const merged = mergePlanVsActualPlanned(pva, routine);
            return normalizeMergedResult(merged, weekKey);
        },
        staleTime: 30_000,
    });
}