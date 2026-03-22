// src/features/gymCheck/screens/GymCheckDayRouteScreen.tsx

/**
 * GymCheckDayRouteScreen
 *
 * Loads the routine week, derives the selected ISO day, and hydrates
 * the local gym-check draft from the planned routine.
 *
 * Important:
 * Remote hydration must run only once per routine signature.
 * Otherwise local edits like Done -> Pending or performed-set changes
 * can be overwritten by stale backend data until the session is saved.
 */

import { useMutation } from "@tanstack/react-query";
import { getISODay } from "date-fns";
import React from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import type { WorkoutRoutineWeek } from "@/src/types/workoutRoutine.types";

import { useGymCheck } from "@/src/hooks/gymCheck/useGymCheck";
import { useRoutineWeek } from "@/src/hooks/routines/useRoutineWeek";

import { extractAttachments, toAttachmentOptions, type AttachmentOption } from "@/src/utils/routines/attachments";
import { DAY_KEYS, type DayKey, type ExerciseItem } from "@/src/utils/routines/plan";
import { toWeekKey } from "@/src/utils/weekKey";

import { uploadRoutineAttachments } from "@/src/services/workout/routineAttachments.service";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { RNFile } from "@/src/types/upload.types";
import type { ExercisePlanInfo } from "../components/GymCheckExerciseRow";
import { GymCheckDayScreen } from "./GymCheckDayScreen";

type UploadQuery = Record<string, string | number | boolean | null | undefined>;

function isValidDateIso(v: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function dateIsoToWeekKeyAndDayKey(dateIso: string): { weekKey: string; dayKey: DayKey } {
    const d = new Date(`${dateIso}T00:00:00`);
    const weekKey = toWeekKey(d);

    const isoDay = getISODay(d);
    const idx = Math.max(0, Math.min(6, isoDay - 1));
    const dayKey = DAY_KEYS[idx];

    return { weekKey, dayKey };
}

function safeExtractPlannedDay(routineWeek: WorkoutRoutineWeek | null | undefined, dayKey: DayKey) {
    const safeRoutine = routineWeek as (WorkoutRoutineWeek & { days?: Array<Record<string, unknown>> }) | null;
    const days = safeRoutine?.days;
    if (!Array.isArray(days)) return null;
    return days.find((d) => d?.dayKey === dayKey) ?? null;
}

function buildAttachmentByPublicIdFromRoutine(routine: unknown): Map<string, AttachmentOption> {
    const list = extractAttachments(routine);
    const opts = toAttachmentOptions(list);
    const map = new Map<string, AttachmentOption>();

    for (const option of opts) {
        map.set(option.publicId, option);
    }

    return map;
}

function buildAttachmentsSet(routine: unknown): Set<string> {
    const list = extractAttachments(routine);
    const opts = toAttachmentOptions(list);
    const result = new Set<string>();

    for (const option of opts) {
        result.add(option.publicId);
    }

    return result;
}

function diffNewAttachmentPublicIds(before: Set<string>, after: Set<string>): string[] {
    const added: string[] = [];

    for (const id of after) {
        if (!before.has(id)) {
            added.push(id);
        }
    }

    return added;
}

/**
 * Stable signature for the fetched routine.
 * Hydration should only happen once per signature.
 */
function buildRoutineSignature(weekKey: string, routine: WorkoutRoutineWeek | null): string {
    if (!routine) return `${weekKey}|__null__`;

    const safeRoutine = routine as WorkoutRoutineWeek & {
        id?: string;
        _id?: string;
        updatedAt?: string;
        meta?: { updatedAt?: string } | null;
    };

    const id = String(safeRoutine.id ?? safeRoutine._id ?? "");
    const updatedAt = String(safeRoutine.updatedAt ?? "");
    const metaUpdatedAt = String(safeRoutine.meta?.updatedAt ?? "");

    return `${weekKey}|${id}|${updatedAt}|${metaUpdatedAt}`;
}

export function GymCheckDayRouteScreen({ date }: { date: string }) {
    const { colors } = useTheme();

    if (!date || !isValidDateIso(date)) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>Gym Check (Día)</Text>
                <Text style={{ color: colors.mutedText }}>
                    Fecha inválida: <Text style={{ color: colors.text }}>{date || "—"}</Text>
                </Text>
            </View>
        );
    }

    const { weekKey, dayKey } = dateIsoToWeekKeyAndDayKey(date);

    const routineQuery = useRoutineWeek(weekKey);
    const routine = routineQuery.data ?? null;

    const gym = useGymCheck(weekKey);

    const uploadMutation = useMutation({
        mutationFn: (args: { files: RNFile[]; query?: UploadQuery }) =>
            uploadRoutineAttachments(weekKey, args.files, args.query),
    });

    const plannedDay = React.useMemo(() => safeExtractPlannedDay(routine, dayKey), [routine, dayKey]);

    const exercisesList = React.useMemo<ExerciseItem[]>(() => {
        const exercises = plannedDay?.exercises;
        if (!Array.isArray(exercises)) return [];

        return exercises.map((exercise, index) => ({
            id: String(exercise?.id ?? `idx_${index}`),
            name: String(exercise?.name ?? ""),
            sets: exercise?.sets != null ? String(exercise.sets) : undefined,
            reps:
                typeof exercise?.reps === "string"
                    ? exercise.reps
                    : exercise?.reps != null
                        ? String(exercise.reps)
                        : undefined,
            rpe: exercise?.rpe != null ? String(exercise.rpe) : undefined,
            load: exercise?.load != null ? String(exercise.load) : undefined,
            notes: typeof exercise?.notes === "string" ? exercise.notes : undefined,
            attachmentPublicIds: Array.isArray(exercise?.attachmentPublicIds) ? exercise.attachmentPublicIds : undefined,
            movementId: exercise?.movementId != null ? String(exercise.movementId) : undefined,
            movementName: exercise?.movementName != null ? String(exercise.movementName) : undefined,
        }));
    }, [plannedDay]);

    const exerciseIds = React.useMemo(() => exercisesList.map((exercise) => exercise.id).filter(Boolean), [exercisesList]);

    const exerciseNameById = React.useMemo(() => {
        const map: Record<string, string> = {};

        for (const exercise of exercisesList) {
            if (exercise.id) {
                map[exercise.id] = String(exercise.name ?? "").trim();
            }
        }

        return map;
    }, [exercisesList]);

    const exercisePlanById = React.useMemo(() => {
        const map: Record<string, ExercisePlanInfo> = {};

        for (const exercise of exercisesList) {
            if (!exercise.id) continue;

            map[exercise.id] = {
                sets: exercise.sets ?? null,
                reps: exercise.reps ?? null,
                rpe: exercise.rpe ?? null,
                load: exercise.load ?? null,
                notes: exercise.notes ?? null,
            };
        }

        return map;
    }, [exercisesList]);

    /**
     * Prevent stale backend hydration from overwriting local edits.
     * We hydrate only once per fetched routine signature.
     */
    const hydratedSignatureRef = React.useRef<string>("");

    React.useEffect(() => {
        if (!gym.hydrated) return;
        if (!routine) return;

        const nextSignature = buildRoutineSignature(weekKey, routine);
        if (hydratedSignatureRef.current === nextSignature) return;

        hydratedSignatureRef.current = nextSignature;
        gym.hydrateFromRemote(routine);
    }, [gym.hydrated, routine, weekKey, gym.hydrateFromRemote]);

    async function onUploadExerciseFiles(args: { exerciseId: string; files: RNFile[] }) {
        if (!routine) {
            Alert.alert("Error", "No hay rutina cargada para esta semana.");
            return;
        }

        if (!args.files.length) return;

        try {
            const before = buildAttachmentsSet(routine);
            const query: UploadQuery = {};

            await uploadMutation.mutateAsync({ files: args.files, query });

            const refetchResult = await routineQuery.refetch();
            const nextRoutine = refetchResult.data ?? null;

            const after = buildAttachmentsSet(nextRoutine);
            const added = diffNewAttachmentPublicIds(before, after);

            if (added.length === 0) {
                Alert.alert("Error", "Upload terminó, pero no se detectó el nuevo publicId.");
                return;
            }

            for (const publicId of added) {
                gym.addExerciseMediaPublicId(dayKey, args.exerciseId, publicId);
            }

            Alert.alert("Listo", "Media subida y ligada al ejercicio.");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "No se pudo subir media.";
            Alert.alert("Error", message);
        }
    }

    if (routineQuery.isLoading || !gym.hydrated) {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                }}
            >
                <ActivityIndicator />
                <Text style={{ color: colors.mutedText }}>Cargando semana...</Text>
            </View>
        );
    }

    if (routineQuery.isError || !routine) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>Gym Check (Día)</Text>
                <Text style={{ color: colors.mutedText }}>
                    No se pudo cargar la semana <Text style={{ color: colors.text }}>{weekKey}</Text>.
                </Text>
            </View>
        );
    }

    const attachmentByPublicId = buildAttachmentByPublicIdFromRoutine(routine);

    return (
        <GymCheckDayScreen
            weekKey={weekKey}
            dayKey={dayKey}
            exerciseIds={exerciseIds}
            exerciseNameById={exerciseNameById}
            routine={routine}
            attachmentByPublicId={attachmentByPublicId}
            exercisePlanById={exercisePlanById}
            uploading={uploadMutation.isPending}
            onUploadExerciseFiles={onUploadExerciseFiles}
            gym={gym}
        />
    );
}