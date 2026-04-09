// src/features/gymCheck/screens/GymCheckSessionScreen.tsx
import NetInfo from "@react-native-community/netinfo";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import { useCreateGymCheckSession } from "@/src/hooks/gymCheck/useCreateGymCheckSession";
import { useGymCheck } from "@/src/hooks/gymCheck/useGymCheck";
import { useSyncGymCheckDay } from "@/src/hooks/gymCheck/useSyncGymCheckDay";
import { useBootstrapWorkoutSession } from "@/src/hooks/health/useBootstrapWorkoutSession";
import { useHealthPermissions } from "@/src/hooks/health/useHealthPermissions";
import { useRoutineWeek } from "@/src/hooks/routines/useRoutineWeek";

import { useTheme } from "@/src/theme/ThemeProvider";

import type {
    HealthImportedWorkoutSessionMinimal,
    HealthPermissionsStatus,
} from "@/src/types/health/health.types";
import type { RNFile } from "@/src/types/upload.types";
import type { WorkoutRoutineWeek } from "@/src/types/workoutRoutine.types";

import { readHealthWorkoutsByDate } from "@/src/services/health/health.service";
import { uploadRoutineAttachments } from "@/src/services/workout/routineAttachments.service";
import { getWorkoutDay } from "@/src/services/workout/sessions.service";
import {
    hasMeaningfulImportedWorkoutMetrics,
    mapImportedWorkoutToGymCheckMetricsPatch,
} from "@/src/utils/health/healthWorkout.mapper";
import {
    extractAttachments,
    toAttachmentOptions,
    type AttachmentOption,
} from "@/src/utils/routines/attachments";
import { DAY_KEYS, type DayKey, type ExerciseItem } from "@/src/utils/routines/plan";
import { toWeekKey } from "@/src/utils/weekKey";

import {
    buildAttachMediaItemsFromGymDay,
    buildGymCheckSessionPayload,
    dayKeyToDateIso,
} from "@/src/utils/gymCheck/sessionPayload";

import { ApiAxiosError } from "@/src/services/http.client";
import type { ExercisePlanInfo } from "../components/GymCheckExerciseRow";
import { GymCheckDayScreen } from "./GymCheckDayScreen";

type UploadQuery = Record<string, string | number | boolean | null | undefined>;

type CreateGymCheckPayload = NonNullable<ReturnType<typeof buildGymCheckSessionPayload>>;

function todayIsoLocal(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function shiftDateIsoByDays(dateIso: string, deltaDays: number): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
    const d = new Date(`${dateIso}T00:00:00`);
    d.setDate(d.getDate() + deltaDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
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

function plannedTabsFromWeek(data: WorkoutRoutineWeek | null | undefined): DayKey[] {
    const planned = (data as { plannedDays?: unknown } | null)?.plannedDays;
    if (Array.isArray(planned) && planned.length) return planned as DayKey[];
    return [...DAY_KEYS];
}

function getPlannedDayFromDays(routine: WorkoutRoutineWeek | null | undefined, dayKey: DayKey) {
    const safeRoutine = routine as
        | (WorkoutRoutineWeek & { days?: Array<Record<string, unknown>> })
        | null;
    const days = safeRoutine?.days;
    if (!Array.isArray(days)) return null;
    return days.find((d) => d?.dayKey === dayKey) ?? null;
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
    for (const id of after) if (!before.has(id)) added.push(id);
    return added;
}

function hasAnyMetricValue(metrics: Record<string, unknown> | null | undefined): boolean {
    if (!metrics) return false;
    for (const v of Object.values(metrics)) {
        if (String(v ?? "").trim()) return true;
    }
    return false;
}

function shouldSyncGymDay(
    day: ReturnType<ReturnType<typeof useGymCheck>["getDay"]> | null | undefined
): boolean {
    if (!day) return false;

    if (String(day.durationMin ?? "").trim()) return true;
    if (String(day.notes ?? "").trim()) return true;

    const metrics = day.metrics ?? null;
    if (metrics && hasAnyMetricValue(metrics)) return true;

    const exercises = day.exercises ?? {};
    for (const st of Object.values(exercises)) {
        if (!st) continue;
        if (st.done === true) return true;
        if (String(st.notes ?? "").trim()) return true;
        if (String(st.durationMin ?? "").trim()) return true;
        if (Array.isArray(st.mediaPublicIds) && st.mediaPublicIds.length > 0) return true;
        if (Array.isArray(st.performedSets) && st.performedSets.length > 0) return true;
    }

    return false;
}

function routineSignature(args: { weekKey: string; routine: WorkoutRoutineWeek | null }): string {
    const { weekKey, routine } = args;
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
    return `${weekKey}|${id}|${updatedAt || metaUpdatedAt}`;
}

function hasGymCheckSession(day: unknown): boolean {
    const safeDay = day as {
        training?: {
            sessions?: Array<{
                meta?: Record<string, unknown> | null;
            }> | null;
        } | null;
    } | null;

    const sessions = Array.isArray(safeDay?.training?.sessions)
        ? safeDay.training.sessions
        : [];
    return sessions.some((s) => String(s?.meta?.sessionKey ?? "") === "gym_check");
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

export function GymCheckSessionScreen() {
    const { colors } = useTheme();

    const [anchorDateIso, setAnchorDateIso] = React.useState<string>(() => todayIsoLocal());
    const weekKey = React.useMemo(
        () => toWeekKey(new Date(`${anchorDateIso}T00:00:00`)),
        [anchorDateIso]
    );

    const routineWeekQuery = useRoutineWeek(weekKey);
    const routine = routineWeekQuery.data ?? null;

    const isMissingRoutine =
        routineWeekQuery.isFetched &&
        !routineWeekQuery.isFetching &&
        routine === null &&
        !routineWeekQuery.isError;

    const tabs = React.useMemo(() => plannedTabsFromWeek(routine), [routine]);
    const [activeDayKey, setActiveDayKey] = React.useState<DayKey>("Mon");

    React.useEffect(() => {
        if (!tabs.includes(activeDayKey)) setActiveDayKey(tabs[0] ?? "Mon");
    }, [tabs, activeDayKey]);

    const gym = useGymCheck(weekKey);
    const syncDayMutation = useSyncGymCheckDay(weekKey);
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

    const hydratedSigRef = React.useRef<string>("");

    React.useEffect(() => {
        if (!routine) return;
        if (!gym.hydrated) return;

        const sig = routineSignature({ weekKey, routine });
        if (hydratedSigRef.current === sig) return;
        hydratedSigRef.current = sig;

        gym.hydrateFromRemote(routine);
    }, [routine, weekKey, gym]);

    const plannedDay = React.useMemo(
        () => getPlannedDayFromDays(routine, activeDayKey),
        [routine, activeDayKey]
    );

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

    const attachmentByPublicId = React.useMemo(
        () => buildAttachmentByPublicIdFromRoutine(routine),
        [routine]
    );

    const [gymCheckSessionExists, setGymCheckSessionExists] = React.useState<boolean>(false);

    React.useEffect(() => {
        let alive = true;

        async function run() {
            try {
                const date = dayKeyToDateIso(weekKey, activeDayKey);
                if (!date) {
                    if (!alive) return;
                    setGymCheckSessionExists(false);
                    return;
                }

                const net = await NetInfo.fetch();
                if (!net.isConnected) {
                    if (!alive) return;
                    setGymCheckSessionExists(false);
                    return;
                }

                const day = await getWorkoutDay(date);
                if (!alive) return;

                setGymCheckSessionExists(hasGymCheckSession(day));

                gym.hydrateDayFromWorkoutDay({
                    dayKey: activeDayKey,
                    workoutDay: day,
                    plannedExercises: exercisesList,
                });
            } catch {
                if (!alive) return;
                setGymCheckSessionExists(false);
            }
        }

        void run();
        return () => {
            alive = false;
        };
    }, [weekKey, activeDayKey, exercisesList, gym]);

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

        /**
         * Always re-request before a workout read/import attempt.
         * This keeps the permission state fresher on Android Health Connect.
         */
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

            setGymCheckSessionExists(hasGymCheckSession(freshDay));
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
        if (!routine) {
            Alert.alert("Error", "No hay rutina cargada para esta semana.");
            return;
        }
        if (!args.files.length) return;

        try {
            const before = buildAttachmentsSet(routine);
            const query: UploadQuery = {};

            await uploadMutation.mutateAsync({ files: args.files, query });

            const ref = await routineWeekQuery.refetch();
            const nextRoutine = ref.data ?? null;
            const after = buildAttachmentsSet(nextRoutine);

            const added = diffNewAttachmentPublicIds(before, after);

            if (added.length === 0) {
                Alert.alert("Error", "Upload terminó, pero no se detectó el nuevo publicId.");
                return;
            }

            for (const publicId of added) {
                gym.addExerciseMediaPublicId(activeDayKey, args.exerciseId, publicId);
            }

            Alert.alert("Listo", "Media subida y ligada al ejercicio.");
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "No se pudo subir media.";
            Alert.alert("Error", message);
        }
    }

    async function syncWholeWeekToDb() {
        const net = await NetInfo.fetch();
        if (!net.isConnected) return;

        for (const dayKey of DAY_KEYS) {
            const day = gym.getDay(dayKey);
            if (!shouldSyncGymDay(day)) continue;

            await syncDayMutation.mutateAsync({
                routine,
                dayKey,
                gymDay: day,
            });
        }

        await routineWeekQuery.refetch();
    }

    async function onCreateRealSession() {
        if (!plannedDay || exercisesList.length === 0) {
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

            setGymCheckSessionExists(true);

            Alert.alert(
                "Listo",
                result.mode === "patched"
                    ? "Sesión real actualizada."
                    : "Sesión real creada."
            );

            await syncWholeWeekToDb();

            const freshDay = await getWorkoutDay(date);
            gym.hydrateDayFromWorkoutDay({
                dayKey: activeDayKey,
                workoutDay: freshDay,
                plannedExercises: exercisesList,
            });
        } catch (e: unknown) {
            const apiError = e as ApiAxiosError;
            const backendMessage =
                apiError.response?.data?.error?.message ??
                apiError.response?.data?.error.message ??
                null;

            const message =
                backendMessage ??
                (e instanceof Error ? e.message : "No se pudo crear la sesión");

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
                <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
                    Gym Check
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    Rutina por semana + métricas + media por ejercicio
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
                <Text style={{ fontWeight: "800", color: colors.text }}>Semana</Text>

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
                    {tabs.map((k) => {
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
                                        fontWeight: "800",
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
                    <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
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
                        <Text style={{ color: "#fff", fontWeight: "800" }}>
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
                        <Text style={{ color: colors.text, fontWeight: "800" }}>
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
                        <Text style={{ color: colors.text, fontWeight: "800" }}>
                            Reset local
                        </Text>
                    </Pressable>
                </View>
            </View>

            {routineWeekQuery.isLoading || !gym.hydrated ? (
                <View
                    style={{
                        alignItems: "center",
                        justifyContent: "center",
                        paddingVertical: 24,
                        gap: 10,
                    }}
                >
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText }}>Cargando rutina…</Text>
                </View>
            ) : isMissingRoutine ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 14,
                        padding: 16,
                        backgroundColor: colors.surface,
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "800", marginBottom: 6 }}>
                        Sin rutina
                    </Text>
                    <Text style={{ color: colors.mutedText }}>
                        No hay una rutina guardada para la semana {weekKey}.
                    </Text>
                </View>
            ) : routineWeekQuery.isError ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 14,
                        padding: 16,
                        backgroundColor: colors.surface,
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "800", marginBottom: 6 }}>
                        Error
                    </Text>
                    <Text style={{ color: colors.mutedText }}>
                        No se pudo cargar la rutina semanal.
                    </Text>
                </View>
            ) : !plannedDay ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 14,
                        padding: 16,
                        backgroundColor: colors.surface,
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "800", marginBottom: 6 }}>
                        Sin plan para el día
                    </Text>
                    <Text style={{ color: colors.mutedText }}>
                        No hay ejercicios planeados para {dayLabelEs(activeDayKey)}.
                    </Text>
                </View>
            ) : (
                <GymCheckDayScreen
                    weekKey={weekKey}
                    dayKey={activeDayKey}
                    routine={routine as WorkoutRoutineWeek}
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