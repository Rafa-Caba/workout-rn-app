import React from "react";
import { Text, View } from "react-native";

import { useAuthStore } from "@/src/store/auth.store";
import type { RNFile } from "@/src/types/upload.types";
import type { WeightUnit } from "@/src/types/workoutDay.types";
import type { WorkoutRoutineWeek } from "@/src/types/workoutRoutine.types";
import type { AttachmentOption } from "@/src/utils/routines/attachments";
import type { DayKey, ExerciseItem } from "@/src/utils/routines/plan";

import { useTheme } from "@/src/theme/ThemeProvider";

import { GymCheckCard } from "../components/GymCheckCard";
import { GymCheckDeviceMetricsCard } from "../components/GymCheckDeviceMetricsCard";
import { GymCheckExerciseRow, type ExercisePlanInfo, type MediaThumb } from "../components/GymCheckExerciseRow";
import { GymCheckField } from "../components/GymCheckField";

import type { GymDayState, GymExerciseState } from "@/src/hooks/gymCheck/useGymCheck";
import type { WorkoutExerciseSet } from "@/src/types/workoutDay.types";
import { pickMediaFiles } from "@/src/utils/gymCheck/imagePickerFiles";

type GymApi = {
    hydrated: boolean;
    getDay: (dayKey: DayKey) => GymDayState;
    setDayField: (dayKey: DayKey, patch: Partial<GymDayState>) => void;
    setMetricsField: (dayKey: DayKey, patch: Partial<GymDayState["metrics"]>) => void;
    setExerciseDone: (dayKey: DayKey, exerciseId: string, done: boolean) => void;
    setExerciseField: (dayKey: DayKey, exerciseId: string, patch: Partial<GymExerciseState>) => void;

    ensureExercisePrefilledFromPlan: (args: {
        dayKey: DayKey;
        exerciseId: string;
        exercise: ExerciseItem;
        unit: WeightUnit;
    }) => void;

    updateExercisePerformedSet: (
        dayKey: DayKey,
        exerciseId: string,
        setIndex: number,
        patch: Partial<WorkoutExerciseSet>
    ) => void;

    addExercisePerformedSet: (dayKey: DayKey, exerciseId: string, unit: WeightUnit) => void;
    removeExercisePerformedSet: (dayKey: DayKey, exerciseId: string, setIndex: number) => void;
};

type Props = {
    weekKey: string;
    dayKey: DayKey;

    routine: WorkoutRoutineWeek;
    attachmentByPublicId: Map<string, AttachmentOption>;

    exerciseIds: string[];
    exerciseNameById: Record<string, string>;
    exercisePlanById: Record<string, ExercisePlanInfo | undefined>;

    uploading: boolean;
    onUploadExerciseFiles: (args: { exerciseId: string; files: RNFile[] }) => Promise<void>;

    gym: GymApi;
};

/**
 * Resolves a media type from MIME or URL.
 */
function guessResourceTypeFromUrlOrMime(urlOrType: string): "image" | "video" {
    const s = String(urlOrType ?? "").toLowerCase();
    if (s.includes("video")) return "video";
    if (s.endsWith(".mp4") || s.endsWith(".mov") || s.endsWith(".m4v") || s.endsWith(".webm")) return "video";
    return "image";
}

/**
 * Builds a temporary local thumb so selected media can be previewed immediately
 * before the upload/refetch flow finishes.
 */
function buildLocalThumbFromFile(f: RNFile): MediaThumb | null {
    const file = f as RNFile & { uri?: string; name?: string; type?: string };

    const uri = String(file.uri ?? "").trim();
    if (!uri) return null;

    const name = String(file.name ?? "").trim();
    const type = String(file.type ?? "").trim();

    const id = name || uri;
    const resourceType = guessResourceTypeFromUrlOrMime(type || uri);

    return {
        publicId: `__local__:${id}`,
        url: uri,
        resourceType,
    };
}

export function GymCheckDayScreen({
    dayKey,
    attachmentByPublicId,
    exerciseIds,
    exerciseNameById,
    exercisePlanById,
    uploading,
    onUploadExerciseFiles,
    gym,
}: Props) {
    const { colors } = useTheme();
    const { user } = useAuthStore();
    const unitLoad = user?.units?.weight === "kg" ? "kg" : "lb";

    const day = gym.getDay(dayKey);

    const [localThumbsByExercise, setLocalThumbsByExercise] = React.useState<Record<string, MediaThumb[]>>({});

    React.useEffect(() => {
        setLocalThumbsByExercise((prev) => {
            const next: Record<string, MediaThumb[]> = { ...prev };

            for (const exId of Object.keys(next)) {
                const list = next[exId] ?? [];
                const hasLocal = list.some((x) => x.publicId.startsWith("__local__:"));
                if (!hasLocal) continue;

                const ids = day.exercises?.[exId]?.mediaPublicIds ?? [];
                const hasAnyReal = ids.some((pid) => attachmentByPublicId.has(pid));

                if (hasAnyReal) {
                    next[exId] = list.filter((x) => !x.publicId.startsWith("__local__:"));
                    if (next[exId].length === 0) delete next[exId];
                }
            }

            return next;
        });
    }, [attachmentByPublicId, day.exercises]);

    const overallBusy = uploading;

    /**
     * Removes one media reference from the local day draft only.
     */
    function removeMediaAt(exerciseId: string, idx: number) {
        const current = day.exercises?.[exerciseId]?.mediaPublicIds ?? [];
        if (idx < 0 || idx >= current.length) return;

        const next = current.filter((_, i) => i !== idx);
        gym.setExerciseField(dayKey, exerciseId, { mediaPublicIds: next });
    }

    /**
     * Merges persisted remote thumbs with temporary local thumbs.
     */
    function mediaThumbsForExercise(exerciseId: string): MediaThumb[] {
        const ids = Array.isArray(day.exercises?.[exerciseId]?.mediaPublicIds)
            ? day.exercises[exerciseId]!.mediaPublicIds
            : [];

        const out: MediaThumb[] = [];

        for (const pid of ids) {
            const opt = attachmentByPublicId.get(pid);
            if (!opt) continue;

            out.push({
                publicId: pid,
                url: opt.url ?? "",
                resourceType: opt.resourceType === "video" ? "video" : "image",
            });
        }

        const local = localThumbsByExercise[exerciseId] ?? [];

        if (out.length === 0 && local.length > 0) return local;

        const map = new Map<string, MediaThumb>();
        for (const m of out) map.set(`${m.publicId}:${m.url}`, m);
        for (const m of local) {
            const key = `${m.publicId}:${m.url}`;
            if (!map.has(key)) map.set(key, m);
        }

        return Array.from(map.values());
    }

    /**
     * Picks local media, shows previews immediately, then delegates upload.
     */
    async function uploadForExercise(exerciseId: string) {
        const files = await pickMediaFiles();
        if (!files.length) return;

        const locals = files.map(buildLocalThumbFromFile).filter(Boolean) as MediaThumb[];
        if (locals.length) {
            setLocalThumbsByExercise((prev) => ({
                ...prev,
                [exerciseId]: [...(prev[exerciseId] ?? []), ...locals],
            }));
        }

        await onUploadExerciseFiles({ exerciseId, files });
    }

    return (
        <View style={{ gap: 14, backgroundColor: colors.background }}>
            <GymCheckCard title="Registro rápido">
                <GymCheckField
                    label="Duración (min)"
                    value={day.durationMin}
                    onChange={(v) => gym.setDayField(dayKey, { durationMin: v })}
                    placeholder="Ej. 75"
                    keyboardType="numeric"
                    disabled={overallBusy}
                />

                <GymCheckField
                    label="Notas (tuyas)"
                    value={day.notes}
                    onChange={(v) => gym.setDayField(dayKey, { notes: v })}
                    placeholder="Notas rápidas..."
                    disabled={overallBusy}
                />
            </GymCheckCard>

            <GymCheckDeviceMetricsCard
                metrics={day.metrics}
                onChange={(patch) => gym.setMetricsField(dayKey, patch)}
                disabled={overallBusy}
                defaultOpen={false}
            />

            <GymCheckCard title="Ejercicios">
                <View style={{ gap: 12 }}>
                    {exerciseIds.length === 0 ? (
                        <Text style={{ color: colors.mutedText }}>Este día no tiene ejercicios planeados.</Text>
                    ) : (
                        exerciseIds.map((exerciseId) => {
                            const ex = day.exercises?.[exerciseId] ?? {
                                done: false,
                                mediaPublicIds: [],
                                performedSets: [],
                            };

                            const title = exerciseNameById[exerciseId] ?? exerciseId;
                            const thumbs = mediaThumbsForExercise(exerciseId);
                            const plan = exercisePlanById[exerciseId] ?? null;

                            const exerciseForPrefill: ExerciseItem = {
                                id: exerciseId,
                                name: title,
                                sets: plan?.sets != null ? String(plan.sets) : undefined,
                                reps: plan?.reps ?? undefined,
                                rpe: plan?.rpe != null ? String(plan.rpe) : undefined,
                                load: plan?.load != null ? String(plan.load) : undefined,
                                notes: plan?.notes ?? undefined,
                            };

                            return (
                                <GymCheckExerciseRow
                                    key={exerciseId}
                                    title={title}
                                    plan={plan}
                                    busy={overallBusy}
                                    done={Boolean(ex.done)}
                                    media={thumbs}
                                    performedSets={Array.isArray(ex.performedSets) ? ex.performedSets : []}
                                    unit={unitLoad}
                                    onToggleDone={() => {
                                        gym.setExerciseDone(dayKey, exerciseId, !Boolean(ex.done));
                                    }}
                                    onOpenRealSets={() => {
                                        if ((ex.performedSets ?? []).length === 0) {
                                            gym.ensureExercisePrefilledFromPlan({
                                                dayKey,
                                                exerciseId,
                                                exercise: exerciseForPrefill,
                                                unit: unitLoad,
                                            });
                                        }
                                    }}
                                    onUploadPress={() => uploadForExercise(exerciseId)}
                                    onRemoveMediaAt={(idx) => removeMediaAt(exerciseId, idx)}
                                    onChangePerformedSet={(setIndex, patch) =>
                                        gym.updateExercisePerformedSet(dayKey, exerciseId, setIndex, patch)
                                    }
                                    onAddPerformedSet={() => gym.addExercisePerformedSet(dayKey, exerciseId, unitLoad)}
                                    onRemovePerformedSet={(setIndex) =>
                                        gym.removeExercisePerformedSet(dayKey, exerciseId, setIndex)
                                    }
                                />
                            );
                        })
                    )}
                </View>
            </GymCheckCard>
        </View>
    );
}