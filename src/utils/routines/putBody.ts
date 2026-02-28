import { DayKey } from "@/src/types/workoutRoutine.types";

export type RoutineUpsertBody = {
    title?: string | null;
    split?: string | null;
    plannedDays?: DayKey[] | null;
    meta?: Record<string, unknown> | null;
};

export function normalizePutBodyForApi(body: RoutineUpsertBody): RoutineUpsertBody {
    const title = typeof body.title === "string" ? body.title.trim() : body.title;
    const split = typeof body.split === "string" ? body.split.trim() : body.split;

    return {
        title: title ? title : null,
        split: split ? split : null,
        plannedDays: body.plannedDays && body.plannedDays.length ? body.plannedDays : null,
        meta: (body.meta as Record<string, unknown> | null) ?? null,
    };
}