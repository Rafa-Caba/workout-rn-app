// src/features/gymCheck/screens/GymCheckDayScreen.tsx
import React from "react";
import { View } from "react-native";

import type { RNFile } from "@/src/types/upload.types";
import type { WorkoutRoutineWeek } from "@/src/types/workoutRoutine.types";

import type { GymDayState } from "@/src/hooks/gymCheck/useGymCheck";
import type { AttachmentOption } from "@/src/utils/routines/attachments";
import type { DayKey } from "@/src/utils/routines/plan";

import { useTheme } from "@/src/theme/ThemeProvider";

import { GymCheckCard } from "../components/GymCheckCard";
import { GymCheckDeviceMetricsCard } from "../components/GymCheckDeviceMetricsCard";
import { GymCheckExerciseRow, type ExercisePlanInfo, type MediaThumb } from "../components/GymCheckExerciseRow";
import { GymCheckField } from "../components/GymCheckField";

import { pickMediaFiles } from "@/src/utils/gymCheck/imagePickerFiles";

type GymApi = {
    hydrated: boolean;
    getDay: (dayKey: DayKey) => GymDayState;
    setDayField: (dayKey: DayKey, patch: Partial<GymDayState>) => void;
    setMetricsField: (dayKey: DayKey, patch: any) => void;
    setExerciseDone: (dayKey: DayKey, exerciseId: string, done: boolean) => void;
    setExerciseField: (dayKey: DayKey, exerciseId: string, patch: any) => void;
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

function guessResourceTypeFromUrlOrMime(urlOrType: string): "image" | "video" {
    const s = String(urlOrType ?? "").toLowerCase();
    if (s.includes("video")) return "video";
    if (s.endsWith(".mp4") || s.endsWith(".mov") || s.endsWith(".m4v") || s.endsWith(".webm")) return "video";
    return "image";
}

function buildLocalThumbFromFile(f: RNFile): MediaThumb | null {
    const uri = String((f as any)?.uri ?? "").trim();
    if (!uri) return null;

    const name = String((f as any)?.name ?? "").trim();
    const type = String((f as any)?.type ?? "").trim();

    const id = name || uri;
    const resourceType = guessResourceTypeFromUrlOrMime(type || uri);

    return {
        publicId: `__local__:${id}`,
        url: uri,
        resourceType,
    };
}

export function GymCheckDayScreen({
    weekKey,
    dayKey,
    routine,
    attachmentByPublicId,
    exerciseIds,
    exerciseNameById,
    exercisePlanById,
    uploading,
    onUploadExerciseFiles,
    gym,
}: Props) {
    const { colors } = useTheme();

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routine?.id, routine?.updatedAt, attachmentByPublicId, dayKey, weekKey, day.exercises]);

    const overallBusy = uploading;

    function removeMediaAt(exerciseId: string, idx: number) {
        const current = day.exercises?.[exerciseId]?.mediaPublicIds ?? [];
        if (idx < 0 || idx >= current.length) return;
        const next = current.filter((_, i) => i !== idx);
        gym.setExerciseField(dayKey, exerciseId, { mediaPublicIds: next });
    }

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
                resourceType: (opt.resourceType as any) ?? "image",
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
                metrics={day.metrics as any}
                onChange={(patch) => gym.setMetricsField(dayKey, patch as any)}
                disabled={overallBusy}
                defaultOpen={false}
            />

            <GymCheckCard title="Ejercicios">
                <View style={{ gap: 12 }}>
                    {exerciseIds.map((exerciseId) => {
                        const ex = day.exercises?.[exerciseId] ?? { done: false, mediaPublicIds: [] };
                        const title = exerciseNameById[exerciseId] ?? exerciseId;

                        const thumbs = mediaThumbsForExercise(exerciseId);
                        const plan = exercisePlanById[exerciseId] ?? null;

                        return (
                            <GymCheckExerciseRow
                                key={`${exerciseId}:${(ex.mediaPublicIds ?? []).join(",")}:${thumbs.length}:${Boolean(ex.done)}`}
                                title={title}
                                plan={plan}
                                busy={overallBusy}
                                done={Boolean(ex.done)}
                                media={thumbs}
                                onToggleDone={() => gym.setExerciseDone(dayKey, exerciseId, !Boolean(ex.done))}
                                onUploadPress={() => uploadForExercise(exerciseId)}
                                onRemoveMediaAt={(idx) => removeMediaAt(exerciseId, idx)}
                            />
                        );
                    })}
                </View>
            </GymCheckCard>
        </View>
    );
}