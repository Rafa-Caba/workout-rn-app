import { api } from "@/src/services/http.client";
import type {
    GymCheckDayPatchBody,
    GymCheckExercisePatch,
    GymCheckMetricsPatch,
    GymDayState,
} from "@/src/types/gymCheck.types";
import type { WorkoutExerciseSet } from "@/src/types/workoutDay.types";
import type { DayKey, WorkoutRoutineWeek } from "@/src/types/workoutRoutine.types";

/**
 * Supports two caller styles:
 * 1) Old: GymDayState with string inputs (UX)
 * 2) New: Already-clean patch payload (numbers/null) from sync hook
 */

// -------------------- Helpers --------------------

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function toNumberOrNull(v: unknown): number | null {
    if (typeof v === "number") {
        return Number.isFinite(v) ? v : null;
    }

    const s = String(v ?? "").trim();
    if (!s) return null;

    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

function toIntOrNull(v: unknown): number | null {
    const n = toNumberOrNull(v);
    if (n === null) return null;
    return Math.trunc(n);
}

function toStringOrNull(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s.length ? s : null;
}

function toStringArrayOrNull(v: unknown): string[] | null {
    if (v === null) return null;
    if (!Array.isArray(v)) return null;
    const out = v.map((x) => String(x).trim()).filter(Boolean);
    return out.length ? out : null;
}

function normalizePerformedSets(value: unknown): WorkoutExerciseSet[] | null {
    if (!Array.isArray(value)) return null;

    const items: WorkoutExerciseSet[] = [];

    value.forEach((item, index) => {
        if (!isPlainObject(item)) return;

        const setIndexRaw = item.setIndex;
        const repsRaw = item.reps;
        const weightRaw = item.weight;
        const unitRaw = item.unit;
        const rpeRaw = item.rpe;
        const isWarmupRaw = item.isWarmup;
        const isDropSetRaw = item.isDropSet;
        const tempoRaw = item.tempo;
        const restSecRaw = item.restSec;
        const tagsRaw = item.tags;
        const metaRaw = item.meta;

        items.push({
            setIndex:
                typeof setIndexRaw === "number" && Number.isFinite(setIndexRaw) && setIndexRaw > 0
                    ? Math.trunc(setIndexRaw)
                    : index + 1,
            reps:
                repsRaw === null
                    ? null
                    : typeof repsRaw === "number" && Number.isFinite(repsRaw)
                        ? Math.trunc(repsRaw)
                        : null,
            weight:
                weightRaw === null
                    ? null
                    : typeof weightRaw === "number" && Number.isFinite(weightRaw)
                        ? weightRaw
                        : null,
            unit: unitRaw === "kg" ? "kg" : "lb",
            rpe:
                rpeRaw === null
                    ? null
                    : typeof rpeRaw === "number" && Number.isFinite(rpeRaw)
                        ? rpeRaw
                        : null,
            isWarmup: isWarmupRaw === true,
            isDropSet: isDropSetRaw === true,
            tempo: typeof tempoRaw === "string" ? tempoRaw : null,
            restSec:
                restSecRaw === null
                    ? null
                    : typeof restSecRaw === "number" && Number.isFinite(restSecRaw)
                        ? Math.trunc(restSecRaw)
                        : null,
            tags: Array.isArray(tagsRaw) ? tagsRaw.map((tag) => String(tag).trim()).filter(Boolean) : null,
            meta:
                metaRaw && typeof metaRaw === "object" && !Array.isArray(metaRaw)
                    ? (metaRaw as Record<string, unknown>)
                    : null,
        });
    });

    if (items.length === 0) return null;

    return items.map((item, index) => ({
        ...item,
        setIndex: index + 1,
    }));
}

/**
 * If caller already sends the "clean" payload (numbers/null + metrics),
 * pass it through as-is.
 */
function looksLikeCleanPatch(input: unknown): input is GymCheckDayPatchBody {
    if (!isPlainObject(input)) return false;

    const hasMetrics = "metrics" in input;
    const dm = input.durationMin;
    const hasNumberDuration = typeof dm === "number" || dm === null;

    return hasMetrics || hasNumberDuration;
}

/**
 * Convert old GymDayState (string inputs) -> GymCheckDayPatchBody
 */
function buildPatchFromGymDayState(gymDay: GymDayState): GymCheckDayPatchBody {
    const exercises: Record<string, GymCheckExercisePatch> = {};

    for (const [exerciseId, st] of Object.entries(gymDay.exercises ?? {})) {
        if (!exerciseId) continue;

        exercises[exerciseId] = {
            done: typeof st?.done === "boolean" ? Boolean(st.done) : null,
            notes: toStringOrNull(st?.notes),
            durationMin: toNumberOrNull(st?.durationMin),
            mediaPublicIds: toStringArrayOrNull(st?.mediaPublicIds) ?? null,
            performedSets: normalizePerformedSets(st?.performedSets),
        };
    }

    const m = gymDay.metrics ?? {};

    const metrics: GymCheckMetricsPatch = {
        startAt: toStringOrNull(m.startAt),
        endAt: toStringOrNull(m.endAt),

        activeKcal: toNumberOrNull(m.activeKcal),
        totalKcal: toNumberOrNull(m.totalKcal),

        avgHr: toIntOrNull(m.avgHr),
        maxHr: toIntOrNull(m.maxHr),

        distanceKm: toNumberOrNull(m.distanceKm),
        steps: toIntOrNull(m.steps),
        elevationGainM: toNumberOrNull(m.elevationGainM),

        paceSecPerKm: toIntOrNull(m.paceSecPerKm),
        cadenceRpm: toIntOrNull(m.cadenceRpm),

        effortRpe: toNumberOrNull(m.effortRpe),

        trainingSource: toStringOrNull(m.trainingSource),
        dayEffortRpe: toNumberOrNull(m.dayEffortRpe),
    };

    return {
        durationMin: toNumberOrNull(gymDay.durationMin),
        notes: toStringOrNull(gymDay.notes),
        metrics,
        exercises,
    };
}

// -------------------- API --------------------

export async function syncGymCheckDay(
    weekKey: string,
    dayKey: DayKey,
    input: GymDayState | GymCheckDayPatchBody
): Promise<WorkoutRoutineWeek> {
    const payload: GymCheckDayPatchBody = looksLikeCleanPatch(input)
        ? input
        : buildPatchFromGymDayState(input);

    const res = await api.patch(
        `/workout/routines/weeks/${encodeURIComponent(weekKey)}/gym-check/${encodeURIComponent(dayKey)}`,
        payload
    );

    return res.data as WorkoutRoutineWeek;
}