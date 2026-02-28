// src/features/gymCheck/screens/GymCheckSessionScreen.tsx
import NetInfo from "@react-native-community/netinfo";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import { useCreateGymCheckSession } from "@/src/hooks/gymCheck/useCreateGymCheckSession";
import { useGymCheck, type GymDayState } from "@/src/hooks/gymCheck/useGymCheck";
import { useSyncGymCheckDay } from "@/src/hooks/gymCheck/useSyncGymCheckDay";
import { useRoutineWeek } from "@/src/hooks/routines/useRoutineWeek";

import { useTheme } from "@/src/theme/ThemeProvider";

import type { RNFile } from "@/src/types/upload.types";
import type { WorkoutRoutineWeek } from "@/src/types/workoutRoutine.types";

import { extractAttachments, toAttachmentOptions, type AttachmentOption } from "@/src/utils/routines/attachments";
import { DAY_KEYS, type DayKey } from "@/src/utils/routines/plan";
import { toWeekKey } from "@/src/utils/weekKey";

import { uploadRoutineAttachments } from "@/src/services/workout/routineAttachments.service";
import { getWorkoutDay, type CreateSessionBody } from "@/src/services/workout/sessions.service";
import {
    buildAttachMediaItemsFromGymDay,
    dayKeyToDateIso,
    parseDurationMinutesToSeconds,
} from "@/src/utils/gymCheck/sessionPayload";

import type { ExercisePlanInfo } from "../components/GymCheckExerciseRow";
import { GymCheckDayScreen } from "./GymCheckDayScreen";

type Props = { mode?: "DEFAULT" | "TRAINEE" };

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
    const planned = (data as any)?.plannedDays;
    if (Array.isArray(planned) && planned.length) return planned as DayKey[];
    return [...DAY_KEYS];
}

function getPlannedDayFromDays(routine: WorkoutRoutineWeek | null | undefined, dayKey: DayKey): any | null {
    if (!routine) return null;
    const days = (routine as any)?.days;
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

function shouldSyncGymDay(day: GymDayState | null | undefined): boolean {
    if (!day) return false;

    if (String(day.durationMin ?? "").trim()) return true;
    if (String(day.notes ?? "").trim()) return true;

    const metrics = day.metrics ?? null;
    if (metrics && hasAnyMetricValue(metrics as any)) return true;

    const exercises = day.exercises ?? {};
    for (const st of Object.values(exercises)) {
        const s = st;
        if (!s) continue;
        if (s.done === true) return true;
        if (String(s.notes ?? "").trim()) return true;
        if (String(s.durationMin ?? "").trim()) return true;
        if (Array.isArray(s.mediaPublicIds) && s.mediaPublicIds.length > 0) return true;
    }

    return false;
}

function routineSignature(args: { weekKey: string; routine: WorkoutRoutineWeek | null }): string {
    const { weekKey, routine } = args;
    if (!routine) return `${weekKey}|__null__`;
    const id = String((routine as any)?.id ?? (routine as any)?._id ?? "");
    const updatedAt = String((routine as any)?.updatedAt ?? "");
    const metaUpdatedAt = String((routine as any)?.meta?.updatedAt ?? "");
    return `${weekKey}|${id}|${updatedAt || metaUpdatedAt}`;
}

function hasGymCheckSession(day: any): boolean {
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

export function GymCheckSessionScreen({ mode = "DEFAULT" }: Props) {
    const { colors } = useTheme();

    const [anchorDateIso, setAnchorDateIso] = React.useState<string>(() => todayIsoLocal());
    const weekKey = React.useMemo(() => toWeekKey(new Date(`${anchorDateIso}T00:00:00`)), [anchorDateIso]);

    const routineWeekQuery = useRoutineWeek(weekKey);
    const routine = routineWeekQuery.data ?? null;

    const isMissingRoutine =
        routineWeekQuery.isFetched && !routineWeekQuery.isFetching && routine === null && !routineWeekQuery.isError;

    const tabs = React.useMemo(() => plannedTabsFromWeek(routine), [routine]);
    const [activeDayKey, setActiveDayKey] = React.useState<DayKey>("Mon");

    React.useEffect(() => {
        if (!tabs.includes(activeDayKey)) setActiveDayKey(tabs[0] ?? "Mon");
    }, [tabs, activeDayKey]);

    const gym = useGymCheck(weekKey);
    const syncDayMutation = useSyncGymCheckDay(weekKey);
    const createSessionMutation = useCreateGymCheckSession();

    const uploadMutation = useMutation({
        mutationFn: (args: { files: RNFile[]; query?: Record<string, any> }) =>
            uploadRoutineAttachments(weekKey, args.files as any, args.query),
    });

    const hydratedSigRef = React.useRef<string>("");

    React.useEffect(() => {
        if (!routine) return;
        if (!gym.hydrated) return;

        const sig = routineSignature({ weekKey, routine });
        if (hydratedSigRef.current === sig) return;
        hydratedSigRef.current = sig;

        gym.hydrateFromRemote(routine);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routine, weekKey, gym.hydrated]);

    const plannedDay = React.useMemo(() => getPlannedDayFromDays(routine, activeDayKey), [routine, activeDayKey]);

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

    const attachmentByPublicId = React.useMemo(() => buildAttachmentByPublicIdFromRoutine(routine), [routine]);

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
            } catch {
                if (!alive) return;
                setGymCheckSessionExists(false);
            }
        }

        void run();

        return () => {
            alive = false;
        };
    }, [weekKey, activeDayKey]);

    async function onUploadExerciseFiles(args: { exerciseId: string; files: RNFile[] }) {
        if (!routine) {
            Alert.alert("Sin rutina", "No hay rutina para esta semana, no se puede subir media aquí.");
            return;
        }
        if (!args.files.length) return;

        try {
            const before = buildAttachmentsSet(routine);

            await uploadMutation.mutateAsync({ files: args.files, query: {} });

            const ref = await routineWeekQuery.refetch();
            const nextRoutine = ref.data ?? null;

            const after = buildAttachmentsSet(nextRoutine);
            const added = diffNewAttachmentPublicIds(before, after);

            const day = gym.getDay(activeDayKey);
            const cur = day.exercises?.[args.exerciseId]?.mediaPublicIds ?? [];

            const nextList = [...cur];
            for (const pid of added) if (!nextList.includes(pid)) nextList.push(pid);

            gym.setExerciseField(activeDayKey, args.exerciseId, { mediaPublicIds: nextList });

            Alert.alert("Listo", "Media subida y ligada al ejercicio.");
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "No se pudo subir media.");
        }
    }

    async function syncWholeWeekToDb() {
        if (!routine) return;

        const net = await NetInfo.fetch();
        if (!net.isConnected) {
            Alert.alert("Sin internet", "Estás offline. Tu progreso queda guardado localmente.");
            return;
        }

        for (const dayKey of DAY_KEYS) {
            const day = gym.getDay(dayKey);
            if (!shouldSyncGymDay(day)) continue;

            await syncDayMutation.mutateAsync({
                routine,
                dayKey,
                gymDay: day as any,
            });
        }

        await routineWeekQuery.refetch();
    }

    async function onSaveGymCheckToDb() {
        if (!routine) {
            Alert.alert("Sin rutina", "No hay rutina para esta semana.");
            return;
        }

        try {
            await syncWholeWeekToDb();

            const net = await NetInfo.fetch();

            if (net.isConnected) {
                const ref = await routineWeekQuery.refetch();
                const freshRoutine = ref.data ?? null;

                if (freshRoutine) {
                    await gym.clearLocalWeek(weekKey);
                    gym.hydrateFromRemote(freshRoutine);
                    hydratedSigRef.current = routineSignature({ weekKey, routine: freshRoutine });
                }

                Alert.alert("Listo", "Gym Check guardado (semana) ✅");
            }
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "No se pudo guardar.");
        }
    }

    async function onCreateRealSession() {
        if (!routine) {
            Alert.alert("Sin rutina", "No hay rutina para esta semana.");
            return;
        }

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
            await syncWholeWeekToDb();

            const ref = await routineWeekQuery.refetch();
            const nextRoutine = ref.data ?? null;
            if (!nextRoutine) throw new Error("No se pudo refrescar la rutina.");

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

            await gym.clearLocalWeek(weekKey);
            gym.hydrateFromRemote(nextRoutine);
            hydratedSigRef.current = routineSignature({ weekKey, routine: nextRoutine });

            try {
                const day = await getWorkoutDay(date);
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
        !gym.hydrated ||
        routineWeekQuery.isFetching ||
        routineWeekQuery.isLoading ||
        uploadMutation.isPending ||
        syncDayMutation.isPending ||
        createSessionMutation.isPending;

    const createSessionLabel = gymCheckSessionExists ? "Actualizar la Sesión" : "Crear sesión del Día";

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 12 }}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>Gym Check</Text>
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
                    <Text style={{ fontWeight: "900", textAlign: "center", color: colors.text }}>← Semana</Text>
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
                    <Text style={{ fontWeight: "900", textAlign: "center", color: colors.text }}>Semana →</Text>
                </Pressable>
            </View>

            {!gym.hydrated || routineWeekQuery.isLoading ? (
                <View style={{ paddingVertical: 24, alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText }}>Cargando semana...</Text>
                </View>
            ) : routineWeekQuery.isError ? (
                <View style={{ paddingVertical: 12, gap: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>
                        No se pudo cargar la semana.
                    </Text>
                    <Text style={{ color: colors.mutedText }}>Intenta de nuevo o revisa tu conexión.</Text>
                </View>
            ) : isMissingRoutine ? (
                <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Sin rutina en esta semana</Text>
                    <Text style={{ color: colors.mutedText }}>
                        Navega a otra semana (← / →) o crea la rutina desde la sección de Rutinas.
                    </Text>
                </View>
            ) : (
                <>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {tabs.map((k) => {
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
                                    <Text style={{ fontWeight: "900", color: active ? colors.primaryText : colors.text }}>
                                        {dayLabelEs(k)}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <GymCheckDayScreen
                        weekKey={weekKey}
                        dayKey={activeDayKey}
                        routine={routine as WorkoutRoutineWeek}
                        attachmentByPublicId={attachmentByPublicId}
                        exerciseIds={exerciseIds}
                        exerciseNameById={exerciseNameById}
                        exercisePlanById={exercisePlanById}
                        uploading={uploadMutation.isPending}
                        onUploadExerciseFiles={onUploadExerciseFiles}
                        gym={gym}
                    />

                    <View style={{ gap: 10 }}>
                        <Pressable
                            disabled={busy}
                            onPress={onSaveGymCheckToDb}
                            style={{
                                padding: 14,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.primary,
                                backgroundColor: colors.primary,
                                opacity: busy ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: colors.primaryText, fontWeight: "900", textAlign: "center" }}>
                                Guardar Gym Check (semana)
                            </Text>
                        </Pressable>

                        <Pressable
                            disabled={busy}
                            onPress={onCreateRealSession}
                            style={{
                                padding: 14,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                                opacity: busy ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ fontWeight: "900", textAlign: "center", color: colors.text }}>
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
                            <Text style={{ fontWeight: "900", textAlign: "center", color: colors.text }}>
                                Reset semana (local)
                            </Text>
                        </Pressable>
                    </View>
                </>
            )}
        </ScrollView>
    );
}