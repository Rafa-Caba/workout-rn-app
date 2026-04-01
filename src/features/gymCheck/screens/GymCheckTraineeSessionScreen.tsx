// src/features/gymCheck/screens/GymCheckTraineeSessionScreen.tsx
import NetInfo from "@react-native-community/netinfo";
import { useMutation } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import { useCreateGymCheckSession } from "@/src/hooks/gymCheck/useCreateGymCheckSession";
import { useGymCheck } from "@/src/hooks/gymCheck/useGymCheck";
import { useBootstrapWorkoutSession } from "@/src/hooks/health/useBootstrapWorkoutSession";
import { useHealthPermissions } from "@/src/hooks/health/useHealthPermissions";
import { useTheme } from "@/src/theme/ThemeProvider";

import type {
    HealthImportedWorkoutSessionMinimal,
    HealthPermissionsStatus,
} from "@/src/types/health/health.types";
import type { MediaFeedItem } from "@/src/types/media.types";
import type { RNFile } from "@/src/types/upload.types";
import type { WorkoutDay } from "@/src/types/workoutDay.types";
import type { WorkoutRoutineWeek } from "@/src/types/workoutRoutine.types";

import { readHealthWorkoutsByDate } from "@/src/services/health/health.service";
import { getMedia } from "@/src/services/workout/media.service";
import { uploadRoutineAttachments } from "@/src/services/workout/routineAttachments.service";
import { getWorkoutDay } from "@/src/services/workout/sessions.service";

import {
    hasMeaningfulImportedWorkoutMetrics,
    mapImportedWorkoutToGymCheckMetricsPatch,
} from "@/src/utils/health/healthWorkout.mapper";
import type { AttachmentOption } from "@/src/utils/routines/attachments";
import { DAY_KEYS, type DayKey, type ExerciseItem } from "@/src/utils/routines/plan";
import { toWeekKey, weekKeyToStartDate } from "@/src/utils/weekKey";

import {
    buildAttachMediaItemsFromGymDay,
    buildGymCheckSessionPayload,
    dayKeyToDateIso,
} from "@/src/utils/gymCheck/sessionPayload";

import type { ExercisePlanInfo } from "../components/GymCheckExerciseRow";
import { GymCheckDayScreen } from "./GymCheckDayScreen";

type UploadQuery = Record<string, string | number | boolean | null | undefined>;
type CreateGymCheckPayload = NonNullable<ReturnType<typeof buildGymCheckSessionPayload>>;

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

function hasGymCheckSession(day: WorkoutDay | null | undefined): boolean {
    const sessions = Array.isArray(day?.training?.sessions) ? day.training.sessions : [];
    return sessions.some((s) => String(s?.meta?.sessionKey ?? "") === "gym_check");
}

function buildAttachmentByPublicIdFromMediaItems(
    items: MediaFeedItem[]
): Map<string, AttachmentOption> {
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
            format: undefined,
            createdAt: undefined,
            meta: undefined,
        });
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
        const ex = Array.isArray(day?.plannedRoutine?.exercises)
            ? day.plannedRoutine.exercises
            : [];
        return ex.length > 0;
    });

    if (withExercises.length > 0) return withExercises;

    const withPlan = DAY_KEYS.filter((dk) => Boolean(weekDays[dk]?.plannedRoutine));
    if (withPlan.length > 0) return withPlan;

    const withTraining = DAY_KEYS.filter((dk) => {
        const sessions = Array.isArray(weekDays[dk]?.training?.sessions)
            ? weekDays[dk]!.training!.sessions
            : [];
        return sessions.length > 0;
    });

    return withTraining.length > 0 ? withTraining : [...DAY_KEYS];
}

/**
 * Build a RoutineWeek-like object so we can reuse the same GymCheckDayScreen UI.
 * Only the fields GymCheckDayScreen depends on are needed.
 */
function buildRoutineLikeWeek(args: {
    weekKey: string;
    weekDays: Record<DayKey, WorkoutDay | null>;
}): WorkoutRoutineWeek {
    const { weekKey, weekDays } = args;

    const days = DAY_KEYS.map((dayKey) => {
        const wd = weekDays[dayKey];
        const pr = wd?.plannedRoutine ?? null;

        const exercisesRaw = Array.isArray(pr?.exercises) ? pr.exercises : [];

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
        };
    });

    const start = weekKeyToStartDate(weekKey) ?? new Date();
    const end = addDays(start, 6);

    return {
        id: `trainee_week_${weekKey}`,
        weekKey,
        range: {
            from: format(start, "yyyy-MM-dd"),
            to: format(end, "yyyy-MM-dd"),
        },
        title: null,
        split: null,
        plannedDays: null,
        status: "active",
        days: days as never,
        meta: null,
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    } as WorkoutRoutineWeek;
}

function hasRelevantWorkoutPermissions(status: HealthPermissionsStatus | null): boolean {
    if (!status || !status.available) {
        return false;
    }

    const entries = Object.entries(status.permissions);
    if (entries.length === 0) {
        return false;
    }

    const relevantEntries = entries.filter(([key]) =>
        /(exercise|workout|distance|speed|heart|calorie|elevation|steps|power|route)/i.test(
            key
        )
    );

    const targetEntries = relevantEntries.length > 0 ? relevantEntries : entries;
    return targetEntries.every(([, value]) => value === "granted");
}

function isMissingWorkoutPermissionError(error: unknown): boolean {
    const message = String(error ?? "");

    return (
        message.includes("READ_EXERCISE") ||
        message.includes("READ_EXERCISE_ROUTE") ||
        message.includes("READ_EXERCISE_ROUTES") ||
        message.includes("HealthConnectException") ||
        message.includes("SecurityException") ||
        message.includes("ExerciseSessionRecord") ||
        message.includes("permission")
    );
}

function pickImportedMetricsSession(
    sessions: HealthImportedWorkoutSessionMinimal[]
): HealthImportedWorkoutSessionMinimal | null {
    const candidates = sessions.filter((session) =>
        hasMeaningfulImportedWorkoutMetrics(session.metrics)
    );

    return candidates[0] ?? null;
}

function mergeImportedMetricsIntoPayload(
    payload: CreateGymCheckPayload,
    importedSession: HealthImportedWorkoutSessionMinimal
): CreateGymCheckPayload {
    const patch = mapImportedWorkoutToGymCheckMetricsPatch(importedSession);

    return {
        ...payload,
        startAt: patch.startAt ?? payload.startAt ?? null,
        endAt: patch.endAt ?? payload.endAt ?? null,
        durationSeconds: patch.durationSeconds ?? payload.durationSeconds ?? null,
        activeKcal: patch.activeKcal ?? payload.activeKcal ?? null,
        totalKcal: patch.totalKcal ?? payload.totalKcal ?? null,
        avgHr: patch.avgHr ?? payload.avgHr ?? null,
        maxHr: patch.maxHr ?? payload.maxHr ?? null,
        distanceKm: patch.distanceKm ?? payload.distanceKm ?? null,
        steps: patch.steps ?? payload.steps ?? null,
        elevationGainM: patch.elevationGainM ?? payload.elevationGainM ?? null,
        paceSecPerKm: patch.paceSecPerKm ?? payload.paceSecPerKm ?? null,
        cadenceRpm: patch.cadenceRpm ?? payload.cadenceRpm ?? null,
        meta: {
            ...(payload.meta ?? {}),
            ...(patch.meta ?? {}),
        },
    };
}

export function GymCheckTraineeSessionScreen() {
    const { colors } = useTheme();

    const [anchorDateIso, setAnchorDateIso] = React.useState<string>(() => todayIsoLocal());
    const weekKey = React.useMemo(
        () => toWeekKey(new Date(`${anchorDateIso}T00:00:00`)),
        [anchorDateIso]
    );

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

    const [attachmentByPublicId, setAttachmentByPublicId] = React.useState<
        Map<string, AttachmentOption>
    >(() => new Map());

    const gym = useGymCheck(weekKey);
    const createSessionMutation = useCreateGymCheckSession();
    const bootstrapWorkoutMutation = useBootstrapWorkoutSession();

    const {
        availability: healthAvailable,
        granted: healthGranted,
        provider,
        permissionsStatus,
        requestPermissions,
        refreshAvailability,
        isCheckingAvailability,
        isRequestingPermissions,
    } = useHealthPermissions();

    const uploadMutation = useMutation({
        mutationFn: (args: { files: RNFile[]; query?: UploadQuery }) =>
            uploadRoutineAttachments(weekKey, args.files, args.query),
    });

    React.useEffect(() => {
        let alive = true;

        async function run() {
            try {
                setWeekLoading(true);
                setWeekError(null);

                const start = weekKeyToStartDate(weekKey);
                const base = start ?? new Date();

                const dates: { dayKey: DayKey; dateIso: string }[] = DAY_KEYS.map((dk, idx) => ({
                    dayKey: dk,
                    dateIso: format(addDays(base, idx), "yyyy-MM-dd"),
                }));

                const results = await Promise.allSettled(
                    dates.map(async (x) => {
                        const day = await getWorkoutDay(x.dateIso);
                        return { dayKey: x.dayKey, day };
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

                for (const result of results) {
                    if (result.status === "fulfilled") {
                        next[result.value.dayKey] = result.value.day;
                    }
                }

                setWeekDays(next);
            } catch (e: unknown) {
                if (!alive) return;
                setWeekError(e instanceof Error ? e.message : "No se pudo cargar la semana");
            } finally {
                if (!alive) return;
                setWeekLoading(false);
            }
        }

        void run();
        return () => {
            alive = false;
        };
    }, [weekKey]);

    const availableDayKeys = React.useMemo(
        () => buildAvailableDayKeys(weekDays),
        [weekDays]
    );
    const [activeDayKey, setActiveDayKey] = React.useState<DayKey>("Mon");

    React.useEffect(() => {
        const today = new Date(anchorDateIso);
        const jsDay = today.getDay();
        const isoIdx = (jsDay + 6) % 7;
        const todayKey = DAY_KEYS[isoIdx] as DayKey;

        const preferred = availableDayKeys.includes(todayKey)
            ? todayKey
            : availableDayKeys[0] ?? "Mon";
        setActiveDayKey(preferred);
    }, [anchorDateIso, availableDayKeys]);

    const activeDay = weekDays[activeDayKey] ?? null;
    const gymCheckSessionExists = hasGymCheckSession(activeDay);

    const routineLikeWeek = React.useMemo(
        () => buildRoutineLikeWeek({ weekKey, weekDays }),
        [weekKey, weekDays]
    );

    const plannedDay = React.useMemo(() => {
        const days = (routineLikeWeek as { days?: Array<Record<string, unknown>> }).days ?? [];
        return days.find((d) => d?.dayKey === activeDayKey) ?? null;
    }, [routineLikeWeek, activeDayKey]);

    const exercisesList = React.useMemo<ExerciseItem[]>(() => {
        const ex = plannedDay?.exercises;
        if (!Array.isArray(ex)) return [];

        return ex.map((e, index) => ({
            id: String(e?.id ?? `idx_${index}`),
            name: String(e?.name ?? ""),
            sets: e?.sets != null ? String(e.sets) : undefined,
            reps:
                typeof e?.reps === "string"
                    ? e.reps
                    : e?.reps != null
                        ? String(e.reps)
                        : undefined,
            rpe: e?.rpe != null ? String(e.rpe) : undefined,
            load: e?.load != null ? String(e.load) : undefined,
            notes: typeof e?.notes === "string" ? e.notes : undefined,
            attachmentPublicIds: Array.isArray(e?.attachmentPublicIds)
                ? e.attachmentPublicIds
                : undefined,
            movementId: e?.movementId != null ? String(e.movementId) : undefined,
            movementName: e?.movementName != null ? String(e.movementName) : undefined,
        }));
    }, [plannedDay]);

    const exerciseIds = React.useMemo(
        () => exercisesList.map((e) => e.id).filter(Boolean),
        [exercisesList]
    );

    const exerciseNameById = React.useMemo(() => {
        const map: Record<string, string> = {};
        for (const e of exercisesList) {
            if (e.id) map[e.id] = String(e.name ?? "").trim();
        }
        return map;
    }, [exercisesList]);

    const exercisePlanById = React.useMemo(() => {
        const map: Record<string, ExercisePlanInfo> = {};
        for (const e of exercisesList) {
            if (!e.id) continue;

            map[e.id] = {
                sets: e.sets ?? null,
                reps: e.reps ?? null,
                rpe: e.rpe ?? null,
                load: e.load ?? null,
                notes: e.notes ?? null,
            };
        }
        return map;
    }, [exercisesList]);

    React.useEffect(() => {
        if (!activeDay || exercisesList.length === 0) return;

        gym.hydrateDayFromWorkoutDay({
            dayKey: activeDayKey,
            workoutDay: activeDay,
            plannedExercises: exercisesList,
        });
    }, [activeDay, activeDayKey, exercisesList, gym]);

    React.useEffect(() => {
        let alive = true;

        async function run() {
            try {
                const net = await NetInfo.fetch();
                if (!net.isConnected) {
                    if (!alive) return;
                    setAttachmentByPublicId(new Map());
                    return;
                }

                const res = await getMedia({
                    source: "routine",
                    weekKey,
                    limit: 200,
                });

                if (!alive) return;
                const items = Array.isArray(res.items) ? res.items : [];
                setAttachmentByPublicId(buildAttachmentByPublicIdFromMediaItems(items));
            } catch {
                if (!alive) return;
                setAttachmentByPublicId(new Map());
            }
        }

        void run();
        return () => {
            alive = false;
        };
    }, [weekKey]);

    const providerLabel =
        provider === "healthkit"
            ? "HealthKit"
            : provider === "health-connect"
                ? "Health Connect"
                : "Salud";

    async function ensureHealthPermissionAccess(args?: {
        showAlertOnFailure?: boolean;
    }): Promise<boolean> {
        const showAlertOnFailure = args?.showAlertOnFailure === true;

        const available = healthAvailable || (await refreshAvailability());

        if (!available) {
            if (showAlertOnFailure) {
                Alert.alert(
                    "Salud no disponible",
                    "La integración de Salud no está disponible en este dispositivo o build."
                );
            }

            return false;
        }

        const status = healthGranted
            ? permissionsStatus
            : await requestPermissions();

        const grantedNow = hasRelevantWorkoutPermissions(
            status ??
            ({
                provider: provider ?? "health-connect",
                available,
                permissions: {},
                checkedAt: new Date().toISOString(),
            } as HealthPermissionsStatus)
        );

        if (!grantedNow) {
            if (showAlertOnFailure) {
                Alert.alert(
                    "Permisos requeridos",
                    "Todavía faltan permisos de Salud para leer workouts y métricas importadas."
                );
            }

            return false;
        }

        return true;
    }

    async function buildPayloadWithAutoSyncedMetrics(args: {
        date: string;
        payload: CreateGymCheckPayload;
    }): Promise<CreateGymCheckPayload> {
        const canUseHealth = await ensureHealthPermissionAccess({
            showAlertOnFailure: false,
        });

        if (!canUseHealth) {
            return args.payload;
        }

        try {
            const importedSessions = await readHealthWorkoutsByDate({ date: args.date });
            const importedSession = pickImportedMetricsSession(importedSessions);

            if (!importedSession) {
                return args.payload;
            }

            return mergeImportedMetricsIntoPayload(args.payload, importedSession);
        } catch {
            return args.payload;
        }
    }

    async function resyncWorkoutMetricsForDate(args: {
        date: string;
        dayKey: DayKey;
    }): Promise<void> {
        const canUseHealth = await ensureHealthPermissionAccess({
            showAlertOnFailure: true,
        });

        if (!canUseHealth) {
            return;
        }

        try {
            const result = await bootstrapWorkoutMutation.mutateAsync({ date: args.date });
            const freshDay = await getWorkoutDay(args.date);

            setWeekDays((prev) => ({
                ...prev,
                [args.dayKey]: freshDay,
            }));

            gym.hydrateDayFromWorkoutDay({
                dayKey: args.dayKey,
                workoutDay: freshDay,
                plannedExercises: exercisesList,
            });

            if (result.mode === "noop") {
                Alert.alert("Sin datos", "No se encontraron métricas importables para este día.");
                return;
            }

            Alert.alert(
                "Listo",
                result.mode === "patched-existing-session"
                    ? "Métricas re-sincronizadas en la sesión existente."
                    : "Se creó una sesión mínima automática con métricas importadas."
            );
        } catch (error) {
            if (isMissingWorkoutPermissionError(error)) {
                Alert.alert(
                    "Permisos faltantes",
                    "La app aún no tiene todos los permisos necesarios para leer workouts del dispositivo."
                );
                return;
            }

            const message =
                error instanceof Error ? error.message : "No se pudo re-sincronizar métricas.";
            Alert.alert("Error", message);
        }
    }

    async function uploadExerciseFiles(args: { exerciseId: string; files: RNFile[] }) {
        if (!args.files.length) return;

        try {
            const query: UploadQuery = {};
            await uploadMutation.mutateAsync({ files: args.files, query });

            const res = await getMedia({
                source: "routine",
                weekKey,
                limit: 200,
            });

            const items = Array.isArray(res.items) ? res.items : [];
            const map = buildAttachmentByPublicIdFromMediaItems(items);
            setAttachmentByPublicId(map);

            const latestIds = items
                .map((item) => String(item?.publicId ?? "").trim())
                .filter(Boolean)
                .slice(0, args.files.length);

            for (const publicId of latestIds) {
                gym.addExerciseMediaPublicId(activeDayKey, args.exerciseId, publicId);
            }

            Alert.alert("Listo", "Media subida y ligada al ejercicio.");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "No se pudo subir media.";
            Alert.alert("Error", message);
        }
    }

    async function onCreateRealSession() {
        if (!activeDay || exercisesList.length === 0) {
            Alert.alert("Error", "Este día no tiene ejercicios planeados.");
            return;
        }

        const date = dayKeyToDateIso(weekKey, activeDayKey);
        if (!date) {
            Alert.alert("Error", "No se pudo calcular la fecha del día.");
            return;
        }

        try {
            const net = await NetInfo.fetch();
            if (!net.isConnected) {
                Alert.alert(
                    "Sin internet",
                    "Necesitas conexión para crear o actualizar la sesión."
                );
                return;
            }

            const dayAfterCommit = gym.getDay(activeDayKey);

            const basePayload = buildGymCheckSessionPayload({
                gymDay: dayAfterCommit,
                plan: {
                    dayKey: activeDayKey,
                    sessionType:
                        typeof plannedDay?.sessionType === "string"
                            ? plannedDay.sessionType
                            : undefined,
                    focus:
                        typeof plannedDay?.focus === "string"
                            ? plannedDay.focus
                            : undefined,
                    notes:
                        typeof plannedDay?.notes === "string"
                            ? plannedDay.notes
                            : undefined,
                    tags: Array.isArray(plannedDay?.tags) ? plannedDay.tags : undefined,
                    exercises: exercisesList,
                },
                fallbackType: "Workout",
            });

            if (!basePayload) {
                Alert.alert(
                    "Error",
                    "Marca al menos un ejercicio como hecho para crear la sesión."
                );
                return;
            }

            const payload = await buildPayloadWithAutoSyncedMetrics({
                date,
                payload: basePayload,
            });

            const attachMediaItems = buildAttachMediaItemsFromGymDay({
                gymDay: dayAfterCommit,
                attachmentByPublicId,
            });

            const result = await createSessionMutation.mutateAsync({
                date,
                payload,
                attachMediaItems,
                weekKey,
            });

            Alert.alert(
                "Listo",
                result.mode === "patched"
                    ? "Sesión real actualizada."
                    : "Sesión real creada."
            );

            const freshDay = await getWorkoutDay(date);
            setWeekDays((prev) => ({
                ...prev,
                [activeDayKey]: freshDay,
            }));

            gym.hydrateDayFromWorkoutDay({
                dayKey: activeDayKey,
                workoutDay: freshDay,
                plannedExercises: exercisesList,
            });
        } catch (e: unknown) {
            const message =
                e instanceof Error ? e.message : "No se pudo crear la sesión.";
            Alert.alert("Error", message);
        }
    }

    const canGoPrev = shiftDateIsoByDays(anchorDateIso, -7) !== null;
    const canGoNext = shiftDateIsoByDays(anchorDateIso, 7) !== null;
    const isHealthSyncBusy =
        bootstrapWorkoutMutation.isPending || isRequestingPermissions || isCheckingAvailability;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 16 }}
        >
            <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>
                    Gym Check
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    Plan asignado por tu entrenador + checklist + métricas
                </Text>
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 14,
                    backgroundColor: colors.surface,
                    padding: 12,
                    gap: 12,
                }}
            >
                <Text style={{ fontWeight: "900", color: colors.text }}>Semana</Text>

                <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                        disabled={!canGoPrev}
                        onPress={() => {
                            const next = shiftDateIsoByDays(anchorDateIso, -7);
                            if (next) setAnchorDateIso(next);
                        }}
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: canGoPrev ? 1 : 0.5,
                        }}
                    >
                        <Text style={{ color: colors.text, fontWeight: "800" }}>←</Text>
                    </Pressable>

                    <View
                        style={{
                            flex: 1,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 10,
                            backgroundColor: colors.background,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            justifyContent: "center",
                        }}
                    >
                        <Text style={{ color: colors.text, fontWeight: "700" }}>{weekKey}</Text>
                    </View>

                    <Pressable
                        disabled={!canGoNext}
                        onPress={() => {
                            const next = shiftDateIsoByDays(anchorDateIso, 7);
                            if (next) setAnchorDateIso(next);
                        }}
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: canGoNext ? 1 : 0.5,
                        }}
                    >
                        <Text style={{ color: colors.text, fontWeight: "800" }}>→</Text>
                    </Pressable>
                </View>

                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    {availableDayKeys.map((k) => {
                        const active = activeDayKey === k;

                        return (
                            <Pressable
                                key={k}
                                onPress={() => setActiveDayKey(k)}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: active ? colors.primary : colors.border,
                                    backgroundColor: active
                                        ? `${colors.primary}22`
                                        : colors.background,
                                }}
                            >
                                <Text
                                    style={{
                                        color: active ? colors.primary : colors.text,
                                        fontWeight: "900",
                                    }}
                                >
                                    {dayLabelEs(k)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        borderRadius: 12,
                        padding: 10,
                        gap: 6,
                    }}
                >
                    <Text style={{ fontSize: 12, fontWeight: "900", color: colors.text }}>
                        Estado de Salud
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Provider: {providerLabel}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Disponible: {healthAvailable ? "Sí" : "No"}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Permisos workout:{" "}
                        {hasRelevantWorkoutPermissions(permissionsStatus) ? "Concedidos" : "Pendientes"}
                    </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <Pressable
                        onPress={() => {
                            void onCreateRealSession();
                        }}
                        disabled={createSessionMutation.isPending || isHealthSyncBusy}
                        style={{
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 12,
                            backgroundColor: colors.primary,
                            opacity:
                                createSessionMutation.isPending || isHealthSyncBusy ? 0.7 : 1,
                        }}
                    >
                        <Text style={{ color: "#fff", fontWeight: "900" }}>
                            {gymCheckSessionExists ? "Actualizar sesión" : "Crear sesión"}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            const date = dayKeyToDateIso(weekKey, activeDayKey);
                            if (!date) {
                                Alert.alert(
                                    "Error",
                                    "No se pudo calcular la fecha del día."
                                );
                                return;
                            }

                            void resyncWorkoutMetricsForDate({
                                date,
                                dayKey: activeDayKey,
                            });
                        }}
                        disabled={isHealthSyncBusy || createSessionMutation.isPending}
                        style={{
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity:
                                isHealthSyncBusy || createSessionMutation.isPending ? 0.7 : 1,
                        }}
                    >
                        <Text style={{ color: colors.text, fontWeight: "900" }}>
                            {isHealthSyncBusy ? "Sincronizando..." : "Re-sincronizar métricas"}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => gym.resetWeek()}
                        style={{
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                        }}
                    >
                        <Text style={{ color: colors.text, fontWeight: "900" }}>
                            Reset local
                        </Text>
                    </Pressable>
                </View>
            </View>

            {weekLoading || !gym.hydrated ? (
                <View
                    style={{
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 24,
                        gap: 10,
                    }}
                >
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText }}>Cargando semana…</Text>
                </View>
            ) : weekError ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 14,
                        padding: 16,
                        backgroundColor: colors.surface,
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "900", marginBottom: 6 }}>
                        Error
                    </Text>
                    <Text style={{ color: colors.mutedText }}>{weekError}</Text>
                </View>
            ) : !activeDay?.plannedRoutine ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 14,
                        padding: 16,
                        backgroundColor: colors.surface,
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "900", marginBottom: 6 }}>
                        Sin plan asignado
                    </Text>
                    <Text style={{ color: colors.mutedText }}>
                        Este día no tiene plannedRoutine asignado.
                    </Text>
                </View>
            ) : (
                <GymCheckDayScreen
                    weekKey={weekKey}
                    dayKey={activeDayKey}
                    routine={routineLikeWeek}
                    attachmentByPublicId={attachmentByPublicId}
                    exerciseIds={exerciseIds}
                    exerciseNameById={exerciseNameById}
                    exercisePlanById={exercisePlanById}
                    uploading={uploadMutation.isPending}
                    onUploadExerciseFiles={uploadExerciseFiles}
                    gym={gym}
                />
            )}
        </ScrollView>
    );
}