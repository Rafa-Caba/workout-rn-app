// src/features/gymCheck/screens/GymCheckTraineeSessionScreen.tsx
import NetInfo from "@react-native-community/netinfo";
import { useMutation } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import { useCreateGymCheckSession } from "@/src/hooks/gymCheck/useCreateGymCheckSession";
import { useGymCheck, type GymDayState } from "@/src/hooks/gymCheck/useGymCheck";
import { useTheme } from "@/src/theme/ThemeProvider";

import type { MediaFeedItem } from "@/src/types/media.types";
import type { RNFile } from "@/src/types/upload.types";
import type { WorkoutDay } from "@/src/types/workoutDay.types";
import type { WorkoutRoutineWeek } from "@/src/types/workoutRoutine.types";

import { getMedia } from "@/src/services/workout/media.service";
import { uploadRoutineAttachments } from "@/src/services/workout/routineAttachments.service";
import { getWorkoutDay, type CreateSessionBody } from "@/src/services/workout/sessions.service";

import type { AttachmentOption } from "@/src/utils/routines/attachments";
import { DAY_KEYS, type DayKey } from "@/src/utils/routines/plan";
import { toWeekKey, weekKeyToStartDate } from "@/src/utils/weekKey";

import {
    buildAttachMediaItemsFromGymDay,
    dayKeyToDateIso,
    parseDurationMinutesToSeconds,
} from "@/src/utils/gymCheck/sessionPayload";

import type { ExercisePlanInfo } from "../components/GymCheckExerciseRow";
import { GymCheckDayScreen } from "./GymCheckDayScreen";

/**
 * Notes:
 * - This is a separate screen for TRAINEE mode (web parity).
 * - It reuses the same UI components as the default GymCheck screen.
 * - Instead of reading a RoutineWeek template, it reads plannedRoutine from WorkoutDay docs.
 * - It DOES allow media upload by using the routine attachments endpoint + resolving URLs via /workout/media.
 */

function todayIsoLocal(): string {
    return format(new Date(), "yyyy-MM-dd");
}

function shiftDateIsoByDays(dateIso: string, deltaDays: number): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
    const d = new Date(`${dateIso}T00:00:00`);
    d.setDate(d.getDate() + deltaDays);
    return format(d, "yyyy-MM-dd");
}

function dayLabelEs(k: DayKey): string {
    switch (k) {
        case "Mon":
            return "Lun";
        case "Tue":
            return "Mar";
        case "Wed":
            return "Mié";
        case "Thu":
            return "Jue";
        case "Fri":
            return "Vie";
        case "Sat":
            return "Sáb";
        case "Sun":
            return "Dom";
        default:
            return k;
    }
}

function hasGymCheckSession(day: WorkoutDay | any): boolean {
    const sessions = Array.isArray(day?.training?.sessions) ? day.training.sessions : [];
    return Boolean(sessions.find((s: any) => String(s?.meta?.sessionKey ?? "") === "gym_check"));
}

function toStringOrNull(v: unknown): string | null {
    const s = String(v ?? "").trim();
    return s.length ? s : null;
}

function toNumberOrNull(v: unknown): number | null {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

function toIntOrNull(v: unknown): number | null {
    const n = toNumberOrNull(v);
    return n === null ? null : Math.trunc(n);
}

function hasAnyMetricValue(metrics: Record<string, unknown> | null | undefined): boolean {
    if (!metrics) return false;
    for (const v of Object.values(metrics)) {
        if (String(v ?? "").trim()) return true;
    }
    return false;
}

function shouldSyncGymDay(day: GymDayState | null | undefined): boolean {
    if (!day) return false;

    if (String(day.durationMin ?? "").trim()) return true;
    if (String(day.notes ?? "").trim()) return true;

    const metrics = day.metrics ?? null;
    if (metrics && hasAnyMetricValue(metrics as any)) return true;

    const exercises = day.exercises ?? {};
    for (const st of Object.values(exercises)) {
        const s = st as any;
        if (!s) continue;
        if (s.done === true) return true;
        if (String(s.notes ?? "").trim()) return true;
        if (String(s.durationMin ?? "").trim()) return true;
        if (Array.isArray(s.mediaPublicIds) && s.mediaPublicIds.length > 0) return true;
    }

    return false;
}

function buildAttachmentByPublicIdFromMediaItems(items: MediaFeedItem[]): Map<string, AttachmentOption> {
    const map = new Map<string, AttachmentOption>();

    for (const it of items) {
        const pid = String(it?.publicId ?? "").trim();
        if (!pid) continue;

        map.set(pid, {
            publicId: pid,
            label: pid,
            url: it.url,
            resourceType: it.resourceType,
            originalName: undefined,
        } as AttachmentOption);
    }

    return map;
}

/**
 * Determine day tabs for trainee:
 * 1) days with plannedRoutine.exercises
 * 2) days with plannedRoutine
 * 3) days with training sessions
 * 4) fallback all
 */
function buildAvailableDayKeys(weekDays: Record<DayKey, WorkoutDay | null>): DayKey[] {
    const withExercises = DAY_KEYS.filter((dk) => {
        const day = weekDays[dk];
        const ex = Array.isArray(day?.plannedRoutine?.exercises) ? day!.plannedRoutine!.exercises : [];
        return ex.length > 0;
    });

    if (withExercises.length > 0) return withExercises;

    const withPlan = DAY_KEYS.filter((dk) => Boolean(weekDays[dk]?.plannedRoutine));
    if (withPlan.length > 0) return withPlan;

    const withTraining = DAY_KEYS.filter((dk) => {
        const sessions = Array.isArray(weekDays[dk]?.training?.sessions) ? weekDays[dk]!.training!.sessions : [];
        return sessions.length > 0;
    });

    return withTraining.length > 0 ? withTraining : [...DAY_KEYS];
}

/**
 * Build a RoutineWeek-like object so we can reuse the same GymCheckDayScreen UI.
 * Only the fields GymCheckSessionScreen depends on are needed:
 * - weekKey
 * - days[] with dayKey + exercises + sessionType
 */
function buildRoutineLikeWeek(args: {
    weekKey: string;
    weekDays: Record<DayKey, WorkoutDay | null>;
}): WorkoutRoutineWeek {
    const { weekKey, weekDays } = args;

    const days = DAY_KEYS.map((dayKey) => {
        const wd = weekDays[dayKey];
        const pr = wd?.plannedRoutine ?? null;

        const exercisesRaw = Array.isArray(pr?.exercises) ? pr!.exercises! : [];

        const exercises = exercisesRaw.map((ex) => ({
            id: String(ex.id ?? ""),
            name: String(ex.movementName ?? ex.name ?? ""),
            sets: ex.sets ?? null,
            reps: ex.reps ?? null,
            rpe: ex.rpe ?? null,
            load: ex.load ?? null,
            notes: ex.notes ?? null,
            attachmentPublicIds: ex.attachmentPublicIds ?? null,
            movementId: ex.movementId ?? null,
            movementName: ex.movementName ?? null,
        }));

        return {
            dayKey,
            date: wd?.date ?? null,
            sessionType: pr?.sessionType ?? null,
            focus: pr?.focus ?? null,
            tags: pr?.tags ?? null,
            notes: pr?.notes ?? null,
            exercises: exercises.length ? exercises : null,
        } as any;
    });

    return {
        id: `trainee_week_${weekKey}`,
        weekKey,
        title: null,
        split: null,
        plannedDays: null,
        status: "active",
        days: days as any,
        meta: null,
        attachments: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    } as any;
}

export function GymCheckTraineeSessionScreen() {
    const { colors } = useTheme();

    const [anchorDateIso, setAnchorDateIso] = React.useState<string>(() => todayIsoLocal());
    const weekKey = React.useMemo(() => toWeekKey(new Date(`${anchorDateIso}T00:00:00`)), [anchorDateIso]);

    const [activeDayKey, setActiveDayKey] = React.useState<DayKey>("Mon");

    // Load WorkoutDay for each day in the selected week
    const [weekDays, setWeekDays] = React.useState<Record<DayKey, WorkoutDay | null>>({
        Mon: null,
        Tue: null,
        Wed: null,
        Thu: null,
        Fri: null,
        Sat: null,
        Sun: null,
    });
    const [weekLoading, setWeekLoading] = React.useState(false);
    const [weekError, setWeekError] = React.useState<string | null>(null);

    // Routine attachments resolution via /workout/media (source=routine, weekKey)
    const [attachmentByPublicId, setAttachmentByPublicId] = React.useState<Map<string, AttachmentOption>>(() => new Map());

    const gym = useGymCheck(weekKey);
    const createSessionMutation = useCreateGymCheckSession();

    const uploadMutation = useMutation({
        mutationFn: (args: { files: RNFile[]; query?: Record<string, any> }) =>
            uploadRoutineAttachments(weekKey, args.files as any, args.query),
    });

    React.useEffect(() => {
        let alive = true;

        async function loadWeek() {
            setWeekLoading(true);
            setWeekError(null);

            try {
                const start = weekKeyToStartDate(weekKey);
                const base = start ?? new Date();

                const dates: { dayKey: DayKey; dateIso: string }[] = DAY_KEYS.map((dk, idx) => ({
                    dayKey: dk,
                    dateIso: format(addDays(base, idx), "yyyy-MM-dd"),
                }));

                const net = await NetInfo.fetch();
                if (!net.isConnected) {
                    if (!alive) return;
                    setWeekError("Sin internet. No se pudo cargar el plan del entrenador.");
                    return;
                }

                const results = await Promise.allSettled(
                    dates.map(async (x) => {
                        const day = await getWorkoutDay(x.dateIso);
                        return { dayKey: x.dayKey, day: day as WorkoutDay };
                    })
                );

                if (!alive) return;

                const next: Record<DayKey, WorkoutDay | null> = {
                    Mon: null,
                    Tue: null,
                    Wed: null,
                    Thu: null,
                    Fri: null,
                    Sat: null,
                    Sun: null,
                };

                for (const r of results) {
                    if (r.status === "fulfilled") {
                        next[r.value.dayKey] = r.value.day;
                    }
                }

                setWeekDays(next);

                // Also load routine media for this weekKey to resolve URLs for attachments
                try {
                    const feed = await getMedia({ source: "routine", weekKey, limit: 200 });
                    if (!alive) return;

                    const items = Array.isArray(feed?.items) ? feed.items : [];
                    setAttachmentByPublicId(buildAttachmentByPublicIdFromMediaItems(items));
                } catch {
                    // If it fails, keep an empty map; user can still create session without media.
                    if (!alive) return;
                    setAttachmentByPublicId(new Map());
                }
            } catch (e: any) {
                if (!alive) return;
                setWeekError(e?.message ?? "No se pudo cargar la semana.");
            } finally {
                if (!alive) return;
                setWeekLoading(false);
            }
        }

        void loadWeek();

        return () => {
            alive = false;
        };
    }, [weekKey]);

    const availableDayKeys = React.useMemo(() => buildAvailableDayKeys(weekDays), [weekDays]);

    React.useEffect(() => {
        // Ensure active day is always valid for the current week.
        if (!availableDayKeys.includes(activeDayKey)) {
            setActiveDayKey(availableDayKeys[0] ?? "Mon");
        }
    }, [availableDayKeys, activeDayKey]);

    const routineLikeWeek = React.useMemo(() => buildRoutineLikeWeek({ weekKey, weekDays }), [weekKey, weekDays]);

    const plannedDay = React.useMemo(() => {
        const days = (routineLikeWeek as any)?.days;
        if (!Array.isArray(days)) return null;
        return days.find((d: any) => d?.dayKey === activeDayKey) ?? null;
    }, [routineLikeWeek, activeDayKey]);

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

    const remoteDay = weekDays[activeDayKey] ?? null;

    const [gymCheckSessionExists, setGymCheckSessionExists] = React.useState<boolean>(false);
    React.useEffect(() => {
        setGymCheckSessionExists(remoteDay ? hasGymCheckSession(remoteDay) : false);
    }, [remoteDay?.id, remoteDay?.updatedAt, weekKey, activeDayKey]);

    async function refreshRoutineMediaMap() {
        try {
            const feed = await getMedia({ source: "routine", weekKey, limit: 200 });
            const items = Array.isArray(feed?.items) ? feed.items : [];
            setAttachmentByPublicId(buildAttachmentByPublicIdFromMediaItems(items));
        } catch {
            setAttachmentByPublicId((prev) => prev ?? new Map());
        }
    }

    async function onUploadExerciseFiles(args: { exerciseId: string; files: RNFile[] }) {
        if (!args.files.length) return;

        const net = await NetInfo.fetch();
        if (!net.isConnected) {
            Alert.alert("Sin internet", "Para subir media necesitas conexión.");
            return;
        }

        try {
            await uploadMutation.mutateAsync({ files: args.files, query: {} });
            await refreshRoutineMediaMap();

            Alert.alert("Listo", "Media subida ✅");
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "No se pudo subir media.");
        }
    }

    async function onCreateRealSession() {
        const date = dayKeyToDateIso(weekKey, activeDayKey);
        if (!date) {
            Alert.alert("Error", "No se pudo determinar la fecha del día activo.");
            return;
        }

        const net = await NetInfo.fetch();
        if (!net.isConnected) {
            Alert.alert("Sin internet", "Para crear/actualizar la sesión necesitas conexión.");
            return;
        }

        const wasExisting = gymCheckSessionExists;

        try {
            // For trainee, we don't sync routine week to DB.
            // We only create/patch the actual session using local gym check state + plannedRoutine display data.

            const gymDayAfter = gym.getDay(activeDayKey);

            const attachMediaItems = buildAttachMediaItemsFromGymDay({
                gymDay: gymDayAfter,
                attachmentByPublicId,
            });

            const durationSeconds = parseDurationMinutesToSeconds(gymDayAfter?.durationMin);
            const notes = typeof gymDayAfter?.notes === "string" ? gymDayAfter.notes : null;

            const type =
                typeof plannedDay?.sessionType === "string" && plannedDay.sessionType.trim()
                    ? plannedDay.sessionType.trim()
                    : "Entrenamiento";

            const m = gymDayAfter?.metrics ?? {};

            const payload: CreateSessionBody = {
                type,
                durationSeconds: typeof durationSeconds === "number" ? durationSeconds : null,
                notes,

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

                meta: {
                    sessionKey: "gym_check",
                    trainingSource: toStringOrNull(m.trainingSource),
                    dayEffortRpe: toNumberOrNull(m.dayEffortRpe),
                },
            };

            const upserted = await createSessionMutation.mutateAsync({
                date,
                payload,
                attachMediaItems,
                weekKey,
            });

            Alert.alert("Listo", upserted.mode === "patched" ? "Sesión actualizada ✅" : "Sesión creada ✅");

            // Refresh remote day to update gym_check session exists
            try {
                const day = await getWorkoutDay(date);
                setWeekDays((prev) => ({ ...prev, [activeDayKey]: day as WorkoutDay }));
                setGymCheckSessionExists(hasGymCheckSession(day));
            } catch {
                setGymCheckSessionExists(true);
            }
        } catch (e: any) {
            Alert.alert(
                "Error",
                e?.message ?? (wasExisting ? "No se pudo actualizar la sesión." : "No se pudo crear la sesión.")
            );
        }
    }

    async function onResetWeekLocal() {
        Alert.alert("Reset", "¿Borrar progreso local de esta semana?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Reset",
                style: "destructive",
                onPress: () => gym.resetWeek(),
            },
        ]);
    }

    const busy =
        weekLoading ||
        uploadMutation.isPending ||
        createSessionMutation.isPending ||
        !gym.hydrated;

    const createSessionLabel = gymCheckSessionExists ? "Actualizar la Sesión" : "Crear sesión del Día";

    const hasPlanToday = Boolean(remoteDay?.plannedRoutine);
    const plannedExercisesCount = Array.isArray(remoteDay?.plannedRoutine?.exercises)
        ? remoteDay!.plannedRoutine!.exercises!.length
        : 0;

    const showNoPlan =
        !hasPlanToday || plannedExercisesCount <= 0;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 12 }}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>Gym Check</Text>
                <Text style={{ color: colors.mutedText }}>
                    Plan asignado por tu entrenador + checklist + métricas
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    Semana: <Text style={{ fontFamily: "Menlo", color: colors.text }}>{weekKey}</Text>
                </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                    disabled={busy}
                    onPress={() => {
                        const next = shiftDateIsoByDays(anchorDateIso, -7);
                        if (next) setAnchorDateIso(next);
                    }}
                    style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: busy ? 0.5 : 1,
                    }}
                >
                    <Text style={{ fontWeight: "800", textAlign: "center", color: colors.text }}>← Semana</Text>
                </Pressable>

                <Pressable
                    disabled={busy}
                    onPress={() => {
                        const next = shiftDateIsoByDays(anchorDateIso, 7);
                        if (next) setAnchorDateIso(next);
                    }}
                    style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: busy ? 0.5 : 1,
                    }}
                >
                    <Text style={{ fontWeight: "800", textAlign: "center", color: colors.text }}>Semana →</Text>
                </Pressable>
            </View>

            {weekLoading ? (
                <View style={{ paddingVertical: 24, alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText }}>Cargando semana...</Text>
                </View>
            ) : weekError ? (
                <View style={{ paddingVertical: 12, gap: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>
                        No se pudo cargar la semana.
                    </Text>
                    <Text style={{ color: colors.mutedText }}>{weekError}</Text>
                </View>
            ) : (
                <>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {availableDayKeys.map((k) => {
                            const active = k === activeDayKey;
                            return (
                                <Pressable
                                    key={k}
                                    onPress={() => setActiveDayKey(k)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: active ? colors.primary : colors.border,
                                        backgroundColor: active ? colors.primary : "transparent",
                                    }}
                                >
                                    <Text style={{ fontWeight: "800", color: active ? colors.primaryText : colors.text }}>
                                        {dayLabelEs(k)}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {showNoPlan ? (
                        <View
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                                borderRadius: 16,
                                padding: 14,
                                gap: 6,
                            }}
                        >
                            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>Sin plan asignado</Text>
                            <Text style={{ color: colors.mutedText }}>
                                Este día no tiene ejercicios planeados por tu entrenador.
                            </Text>
                        </View>
                    ) : (
                        <GymCheckDayScreen
                            weekKey={weekKey}
                            dayKey={activeDayKey}
                            routine={routineLikeWeek as unknown as WorkoutRoutineWeek}
                            attachmentByPublicId={attachmentByPublicId}
                            exerciseIds={exerciseIds}
                            exerciseNameById={exerciseNameById}
                            exercisePlanById={exercisePlanById}
                            uploading={uploadMutation.isPending}
                            onUploadExerciseFiles={onUploadExerciseFiles}
                            gym={gym}
                        />
                    )}

                    <View style={{ gap: 10 }}>
                        <Pressable
                            disabled={busy || showNoPlan}
                            onPress={onCreateRealSession}
                            style={{
                                padding: 14,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                                opacity: busy || showNoPlan ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ fontWeight: "800", textAlign: "center", color: colors.text }}>
                                {createSessionLabel}
                            </Text>
                        </Pressable>

                        <Pressable
                            disabled={busy}
                            onPress={onResetWeekLocal}
                            style={{
                                padding: 14,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                                opacity: busy ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ fontWeight: "800", textAlign: "center", color: colors.text }}>
                                Reset semana (local)
                            </Text>
                        </Pressable>
                    </View>
                </>
            )}
        </ScrollView>
    );
}