import type { CreateSessionBody } from "@/src/services/workout/sessions.service";
import type { GymDayState } from "@/src/types/gymCheck.types";
import type { DayKey, DayPlan } from "@/src/utils/routines/plan";
import { DAY_KEYS, getPlanFromMeta } from "@/src/utils/routines/plan";
import { buildGymCheckSessionPayload } from "./sessionPayload";

type AnyRecord = Record<string, unknown>;

function isRecord(v: unknown): v is AnyRecord {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function getRoutineMeta(routine: unknown): AnyRecord | null {
    if (!isRecord(routine)) return null;
    const meta = routine.meta;
    return isRecord(meta) ? meta : null;
}

function getGymCheckDay(meta: AnyRecord | null, dayKey: DayKey): GymDayState | null {
    if (!meta) return null;
    const gymCheck = meta.gymCheck;
    if (!isRecord(gymCheck)) return null;

    const day = gymCheck[dayKey];
    if (!isRecord(day)) return null;

    const exercisesRaw = isRecord(day.exercises) ? day.exercises : {};

    const exercises: GymDayState["exercises"] = Object.fromEntries(
        Object.entries(exercisesRaw).map(([exerciseId, raw]) => {
            const ex = isRecord(raw) ? raw : {};
            return [
                exerciseId,
                {
                    done: ex.done === true,
                    notes: typeof ex.notes === "string" ? ex.notes : undefined,
                    durationMin:
                        typeof ex.durationMin === "number"
                            ? String(ex.durationMin)
                            : typeof ex.durationMin === "string"
                                ? ex.durationMin
                                : undefined,
                    mediaPublicIds: Array.isArray(ex.mediaPublicIds)
                        ? ex.mediaPublicIds.map((item) => String(item).trim()).filter(Boolean)
                        : [],
                    performedSets: Array.isArray(ex.performedSets) ? ex.performedSets : [],
                },
            ];
        })
    );

    const metricsRaw = isRecord(day.metrics) ? day.metrics : {};

    return {
        durationMin:
            typeof day.durationMin === "number"
                ? String(day.durationMin)
                : typeof day.durationMin === "string"
                    ? day.durationMin
                    : "",
        notes: typeof day.notes === "string" ? day.notes : "",
        metrics: {
            startAt: typeof metricsRaw.startAt === "string" ? metricsRaw.startAt : "",
            endAt: typeof metricsRaw.endAt === "string" ? metricsRaw.endAt : "",
            activeKcal: metricsRaw.activeKcal != null ? String(metricsRaw.activeKcal) : "",
            totalKcal: metricsRaw.totalKcal != null ? String(metricsRaw.totalKcal) : "",
            avgHr: metricsRaw.avgHr != null ? String(metricsRaw.avgHr) : "",
            maxHr: metricsRaw.maxHr != null ? String(metricsRaw.maxHr) : "",
            distanceKm: metricsRaw.distanceKm != null ? String(metricsRaw.distanceKm) : "",
            steps: metricsRaw.steps != null ? String(metricsRaw.steps) : "",
            elevationGainM: metricsRaw.elevationGainM != null ? String(metricsRaw.elevationGainM) : "",
            paceSecPerKm: metricsRaw.paceSecPerKm != null ? String(metricsRaw.paceSecPerKm) : "",
            cadenceRpm: metricsRaw.cadenceRpm != null ? String(metricsRaw.cadenceRpm) : "",
            effortRpe: metricsRaw.effortRpe != null ? String(metricsRaw.effortRpe) : "",
            trainingSource: typeof metricsRaw.trainingSource === "string" ? metricsRaw.trainingSource : "",
            dayEffortRpe: metricsRaw.dayEffortRpe != null ? String(metricsRaw.dayEffortRpe) : "",
        },
        exercises,
    };
}

export type CreateWorkoutSessionBody = CreateSessionBody;

export function buildGymCheckSessionFromRoutine(args: {
    routine: unknown;
    weekKey: string;
    dayKey: DayKey;
    includeOnlyDone: true;
}): { ok: true; body: CreateWorkoutSessionBody } | { ok: false; reason: string } {
    const { routine, dayKey } = args;

    if (!DAY_KEYS.includes(dayKey)) {
        return { ok: false, reason: "Invalid dayKey." };
    }

    const meta = getRoutineMeta(routine);
    const plans: DayPlan[] = getPlanFromMeta(meta);
    const plan = plans.find((p) => p.dayKey === dayKey) ?? ({ dayKey } as DayPlan);

    const gymDay = getGymCheckDay(meta, dayKey);
    if (!gymDay) {
        return { ok: false, reason: "No Gym Check data found for this day." };
    }

    const body = buildGymCheckSessionPayload({
        gymDay,
        plan,
        fallbackType: "Gym Check",
    });

    if (!body) {
        return { ok: false, reason: "No done exercises found in Gym Check for this day." };
    }

    return { ok: true, body };
}