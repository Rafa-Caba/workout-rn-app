import type { WorkoutRoutineDay } from "@/src/types/workoutRoutine.types";
import type { DayPlan } from "@/src/utils/routines/plan";
import { plansToRoutineDays } from "@/src/utils/routines/plan";
import type { RoutineUpsertBody } from "@/src/utils/routines/putBody";

type FieldErrors = Record<string, string[] | undefined>;
type ErrorDetails = { formErrors?: string[]; fieldErrors?: FieldErrors } | undefined;

type ApiLikeError = {
    message?: string;
    response?: {
        data?: {
            error?: {
                message?: string;
                details?: ErrorDetails;
            };
        };
    };
};

function isDaysRejectedError(e: unknown): boolean {
    const err = e as ApiLikeError;

    const details = err.response?.data?.error?.details;
    const formErrors = details?.formErrors ?? [];
    const fieldErrors = details?.fieldErrors ?? {};

    const allText = [
        ...formErrors,
        ...(fieldErrors.days ?? []),
        String(err.response?.data?.error?.message ?? ""),
        String(err.message ?? ""),
    ]
        .join(" | ")
        .toLowerCase();

    return allText.includes("unrecognized") && allText.includes("days");
}

type UpdatePayloadBulk = RoutineUpsertBody & { days: WorkoutRoutineDay[] };
type UpdatePayloadSingle = RoutineUpsertBody & { day: WorkoutRoutineDay };

type MutateAsync = (payload: UpdatePayloadBulk | UpdatePayloadSingle | RoutineUpsertBody) => Promise<unknown>;

/**
 * Saves routine week payload + ensures planned routine gets persisted.
 * Strategy:
 *  - Try bulk PUT with `days: [...]`
 *  - If backend rejects `days`, fallback to 7 PUTs using strict `day: {...}`
 */
export async function saveRoutineWeekWithPlanFallback(args: {
    weekKey: string;
    baseBody: RoutineUpsertBody; // already normalized
    plans: DayPlan[];
    mutateAsync: MutateAsync;
}) {
    const { weekKey, baseBody, plans, mutateAsync } = args;

    const days = plansToRoutineDays(weekKey, plans);

    // Attempt bulk first
    try {
        await mutateAsync({ ...baseBody, days });
        return;
    } catch (e) {
        if (!isDaysRejectedError(e)) throw e;
    }

    // Fallback: strict schema supports `day`
    for (const d of days) {
        await mutateAsync({ ...baseBody, day: d });
    }
}