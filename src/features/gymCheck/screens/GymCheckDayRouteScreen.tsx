import { useMutation } from "@tanstack/react-query";
import { getISODay } from "date-fns";
import React from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import type { WorkoutRoutineWeek } from "@/src/types/workoutRoutine.types";

import { useGymCheck } from "@/src/hooks/gymCheck/useGymCheck";
import { useRoutineWeek } from "@/src/hooks/routines/useRoutineWeek";

import { extractAttachments, toAttachmentOptions, type AttachmentOption } from "@/src/utils/routines/attachments";
import { DAY_KEYS, type DayKey } from "@/src/utils/routines/plan";
import { toWeekKey } from "@/src/utils/weekKey";

import { uploadRoutineAttachments } from "@/src/services/workout/routineAttachments.service";

import { useTheme } from "@/src/theme/ThemeProvider";
import { RNFile } from "@/src/types/upload.types";
import type { ExercisePlanInfo } from "../components/GymCheckExerciseRow";
import { GymCheckDayScreen } from "./GymCheckDayScreen";

type Props = { date: string };

function isValidDateIso(v: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function dateIsoToWeekKeyAndDayKey(dateIso: string): { weekKey: string; dayKey: DayKey } {
    const d = new Date(`${dateIso}T00:00:00`);
    const weekKey = toWeekKey(d);

    const isoDay = getISODay(d); // 1..7 (Mon..Sun)
    const idx = Math.max(0, Math.min(6, isoDay - 1));
    const dayKey = DAY_KEYS[idx];

    return { weekKey, dayKey };
}

function safeExtractPlannedDay(routineWeek: any, dayKey: DayKey) {
    const days = routineWeek?.days;
    if (!Array.isArray(days)) return null;
    return days.find((d: any) => d?.dayKey === dayKey) ?? null;
}

function buildAttachmentByPublicIdFromRoutine(routine: unknown): Map<string, AttachmentOption> {
    const list = extractAttachments(routine);
    const opts = toAttachmentOptions(list);
    const map = new Map<string, AttachmentOption>();
    for (const o of opts) map.set(o.publicId, o);
    return map;
}

function buildAttachmentsSet(routine: unknown): Set<string> {
    const list = extractAttachments(routine);
    const opts = toAttachmentOptions(list);
    const s = new Set<string>();
    for (const a of opts) s.add(a.publicId);
    return s;
}

function diffNewAttachmentPublicIds(before: Set<string>, after: Set<string>): string[] {
    const added: string[] = [];
    for (const id of after) {
        if (!before.has(id)) added.push(id);
    }
    return added;
}

function safeExtractServerGymDay(routineWeek: any, dayKey: DayKey): any | null {
    const meta = routineWeek?.meta;
    const gc = meta?.gymCheck;
    const day = gc?.[dayKey];
    if (!day || typeof day !== "object") return null;
    return day;
}

function serverGymDayToLocal(server: any) {
    const toStr = (v: any) => (v === null || v === undefined ? "" : String(v));

    const metrics = server?.metrics ?? {};
    const exercises = server?.exercises ?? {};

    const exOut: Record<string, any> = {};
    for (const [exerciseId, ex] of Object.entries(exercises)) {
        exOut[String(exerciseId)] = {
            done: (ex as any)?.done === true,
            notes: typeof (ex as any)?.notes === "string" ? (ex as any).notes : undefined,
            durationMin: (ex as any)?.durationMin == null ? undefined : String((ex as any).durationMin),
            mediaPublicIds: Array.isArray((ex as any)?.mediaPublicIds) ? (ex as any).mediaPublicIds : [],
        };
    }

    return {
        durationMin: toStr(server?.durationMin),
        notes: toStr(server?.notes),
        metrics: {
            startAt: toStr(metrics?.startAt),
            endAt: toStr(metrics?.endAt),
            activeKcal: toStr(metrics?.activeKcal),
            totalKcal: toStr(metrics?.totalKcal),
            avgHr: toStr(metrics?.avgHr),
            maxHr: toStr(metrics?.maxHr),
            distanceKm: toStr(metrics?.distanceKm),
            steps: toStr(metrics?.steps),
            elevationGainM: toStr(metrics?.elevationGainM),
            paceSecPerKm: toStr(metrics?.paceSecPerKm),
            cadenceRpm: toStr(metrics?.cadenceRpm),
            effortRpe: toStr(metrics?.effortRpe),
            trainingSource: toStr(metrics?.trainingSource),
            dayEffortRpe: toStr(metrics?.dayEffortRpe),
        },
        exercises: exOut,
    };
}

export function GymCheckDayRouteScreen({ date }: Props) {
    const { colors } = useTheme();

    if (!date || !isValidDateIso(date)) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>Gym Check (Día)</Text>
                <Text style={{ color: colors.mutedText }}>
                    Fecha inválida: <Text style={{ fontFamily: "Menlo", color: colors.text }}>{date || "—"}</Text>
                </Text>
            </View>
        );
    }

    const { weekKey, dayKey } = dateIsoToWeekKeyAndDayKey(date);

    const routineQuery = useRoutineWeek(weekKey);
    const routine = routineQuery.data ?? null;

    const gym = useGymCheck(weekKey);

    const uploadMutation = useMutation({
        mutationFn: (args: { files: RNFile[]; query?: Record<string, any> }) =>
            uploadRoutineAttachments(weekKey, args.files as any, args.query),
    });

    const plannedDay = React.useMemo(() => safeExtractPlannedDay(routine as any, dayKey), [routine, dayKey]);

    const exerciseIds = React.useMemo(() => {
        const ex = plannedDay?.exercises;
        if (!Array.isArray(ex)) return [];
        return ex.map((e: any) => String(e?.id ?? "")).filter(Boolean);
    }, [plannedDay]);

    const exerciseNameById = React.useMemo(() => {
        const map: Record<string, string> = {};
        const ex = plannedDay?.exercises;
        if (!Array.isArray(ex)) return map;

        for (const e of ex) {
            const id = String(e?.id ?? "").trim();
            if (!id) continue;
            const name = String(e?.name ?? "").trim();
            if (name) map[id] = name;
        }

        return map;
    }, [plannedDay]);

    const exercisePlanById = React.useMemo(() => {
        const map: Record<string, ExercisePlanInfo> = {};
        const ex = plannedDay?.exercises;
        if (!Array.isArray(ex)) return map;

        for (const e of ex) {
            const id = String(e?.id ?? "").trim();
            if (!id) continue;

            map[id] = {
                sets: e?.sets ?? null,
                reps: typeof e?.reps === "string" ? e.reps : e?.reps != null ? String(e.reps) : null,
                rpe: e?.rpe ?? null,
                load: e?.load ?? null,
                notes: typeof e?.notes === "string" ? e.notes : null,
            };
        }

        return map;
    }, [plannedDay]);

    // hydrate local state from server meta (only when week is loaded)
    const serverDay = React.useMemo(() => safeExtractServerGymDay(routine as any, dayKey), [routine, dayKey]);

    React.useEffect(() => {
        if (!serverDay) return;
        if (!gym.hydrated) return;

        gym.setDay(dayKey, serverGymDayToLocal(serverDay));
    }, [gym.hydrated, serverDay, dayKey]);

    async function onUploadExerciseFiles(args: { exerciseId: string; files: RNFile[] }) {
        if (!routine) {
            Alert.alert("Error", "No hay rutina cargada para esta semana.");
            return;
        }
        if (!args.files.length) return;

        try {
            const before = buildAttachmentsSet(routine as WorkoutRoutineWeek);

            await uploadMutation.mutateAsync({ files: args.files, query: {} });

            const ref = await routineQuery.refetch();
            const nextRoutine = (ref.data ?? null) as WorkoutRoutineWeek | null;

            const after = buildAttachmentsSet(nextRoutine);
            const added = diffNewAttachmentPublicIds(before, after);

            if (added.length === 0) {
                Alert.alert("Error", "Upload terminó, pero no se detectó el nuevo publicId.");
                return;
            }

            // Attach to local GymCheck exercise state
            const currentDay = gym.getDay(dayKey);
            const cur = currentDay.exercises?.[args.exerciseId]?.mediaPublicIds ?? [];

            const nextList = [...cur];
            for (const pid of added) {
                if (!nextList.includes(pid)) nextList.push(pid);
            }

            gym.setExerciseField(dayKey, args.exerciseId, { mediaPublicIds: nextList });

            Alert.alert("Listo", "Media subida y ligada al ejercicio.");
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "No se pudo subir media.");
        }
    }

    if (routineQuery.isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 10 }}>
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
                    No se pudo cargar la semana <Text style={{ fontFamily: "Menlo", color: colors.text }}>{weekKey}</Text>.
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