// src/features/trainer/components/TrainerAssignRoutineSection.tsx
import { toastError, toastInfo, toastSuccess } from "@/src/utils/toast";
import { addDays, format, getISODay, parseISO } from "date-fns";
import React from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useRoutineWeek } from "@/src/hooks/routines/useRoutineWeek";
import { usePatchTraineePlannedRoutine } from "@/src/hooks/trainer/usePatchTraineePlannedRoutine";
import { useTrainerDay } from "@/src/hooks/trainer/useTrainerDay";
import { useMovements } from "@/src/hooks/useMovements";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { Movement } from "@/src/types/movements.types";
import type {
    ISODate,
    PlannedMeta,
    PlannedRoutine,
    PlannedRoutineExercise,
    PlannedRoutineSource,
    WeekKey,
} from "@/src/types/workoutDay.types";
import type { DayKey, DayPlan, ExerciseItem } from "@/src/utils/routines/plan";
import { DAY_KEYS, normalizePlans, plansToRoutineDays } from "@/src/utils/routines/plan";
import { weekKeyToStartDate } from "@/src/utils/weekKey";

function makeId(): string {
    const g: any = globalThis as any;
    if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
    return `ex_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function dayKeyLabelEs(dayKey: DayKey): string {
    switch (dayKey) {
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
            return dayKey;
    }
}

function getDayKeyFromIsoDate(dateIso: string): DayKey {
    const n = getISODay(parseISO(dateIso)); // 1..7 Mon..Sun
    return DAY_KEYS[n - 1] ?? "Mon";
}

function getDateForDayKey(weekKey: string, dayKey: DayKey): ISODate {
    const start = weekKeyToStartDate(weekKey);
    const idx = DAY_KEYS.indexOf(dayKey);
    const d = addDays(start, Math.max(0, idx));
    return format(d, "yyyy-MM-dd") as ISODate;
}

function plannedRoutineToDayPlan(dayKey: DayKey, pr: PlannedRoutine): DayPlan {
    const exercises: ExerciseItem[] | undefined = Array.isArray(pr.exercises)
        ? pr.exercises.map((ex) => ({
            id: ex.id || makeId(),
            name: ex.name ?? "",
            sets: ex.sets != null ? String(ex.sets) : undefined,
            reps: ex.reps ?? undefined,
            rpe: ex.rpe != null ? String(ex.rpe) : undefined,
            load: ex.load ?? undefined,
            notes: ex.notes ?? undefined,
            attachmentPublicIds: ex.attachmentPublicIds ?? undefined,
            movementId: ex.movementId ?? undefined,
            movementName: ex.movementName ?? undefined,
        }))
        : undefined;

    return {
        dayKey,
        sessionType: pr.sessionType ?? undefined,
        focus: pr.focus ?? undefined,
        tags: Array.isArray(pr.tags) ? pr.tags : undefined,
        notes: pr.notes ?? undefined,
        exercises,
    };
}

function mapPlanToPlannedRoutine(day: {
    dayKey: DayKey;
    sessionType: string | null;
    focus: string | null;
    notes: string | null;
    tags: string[] | null;
    exercises: any[] | null;
}): PlannedRoutine {
    const exercises: PlannedRoutineExercise[] | null = Array.isArray(day.exercises)
        ? day.exercises.map((ex) => ({
            id: ex.id,
            name: ex.name,
            movementId: ex.movementId ?? null,
            movementName: ex.movementName ?? null,
            sets: ex.sets ?? null,
            reps: ex.reps ?? null,
            rpe: ex.rpe ?? null,
            load: ex.load ?? null,
            notes: ex.notes ?? null,
            attachmentPublicIds: ex.attachmentPublicIds ?? null,
        }))
        : null;

    return {
        sessionType: day.sessionType ?? null,
        focus: day.focus ?? null,
        exercises,
        notes: day.notes ?? null,
        tags: day.tags ?? null,
    };
}

type Props = {
    traineeId: string;
    weekKey: WeekKey;
    date: ISODate;
};

type FieldProps = {
    label: string;
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    multiline?: boolean;
};

const Field = React.memo(function Field(props: FieldProps) {
    const { colors } = useTheme();

    return (
        <View style={{ gap: 6 }}>
            <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>{props.label}</Text>
            <TextInput
                value={props.value}
                onChangeText={props.onChange}
                editable={!props.disabled}
                multiline={props.multiline}
                placeholder={props.label}
                placeholderTextColor={colors.mutedText}
                style={[
                    styles.input,
                    {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        color: colors.text,
                        minHeight: props.multiline ? 80 : undefined,
                        textAlignVertical: props.multiline ? "top" : "center",
                    },
                ]}
            />
        </View>
    );
});

type MovementPickerProps = {
    disabled?: boolean;
    valueLabel: string | null;
    onPick: (m: Movement) => void;
};

const MovementPicker = React.memo(function MovementPicker(props: MovementPickerProps) {
    const { colors } = useTheme();

    const q = useMovements({ q: "", activeOnly: true } as any);
    const [open, setOpen] = React.useState(false);

    const label = props.valueLabel ? props.valueLabel : "Seleccionar movimiento";

    return (
        <>
            <View style={{ gap: 6 }}>
                <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>Movimiento</Text>

                <Pressable
                    onPress={() => !props.disabled && setOpen(true)}
                    disabled={props.disabled}
                    style={({ pressed }) => ({
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: props.disabled ? 0.5 : pressed ? 0.92 : 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                    })}
                >
                    <Text style={{ fontWeight: "800", color: colors.text, flex: 1 }} numberOfLines={1}>
                        {label}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>▾</Text>
                </Pressable>
            </View>

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
                <View style={[styles.sheet, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>Movimientos</Text>
                        <Pressable onPress={() => setOpen(false)}>
                            <Text style={{ fontWeight: "800", color: colors.mutedText }}>Cerrar</Text>
                        </Pressable>
                    </View>

                    <View style={{ height: 10 }} />

                    {q.isLoading ? (
                        <View style={{ alignItems: "center", gap: 8, paddingVertical: 10 }}>
                            <ActivityIndicator />
                            <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Cargando movimientos…</Text>
                        </View>
                    ) : q.isError ? (
                        <Pressable
                            onPress={() => q.refetch()}
                            style={({ pressed }) => ({
                                padding: 12,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                opacity: pressed ? 0.92 : 1,
                            })}
                        >
                            <Text style={{ fontWeight: "800", color: colors.text }}>Error al cargar. Toca para reintentar.</Text>
                        </Pressable>
                    ) : (
                        <FlatList
                            data={q.data ?? []}
                            keyExtractor={(it) => it.id}
                            style={{ maxHeight: 360 }}
                            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() => {
                                        props.onPick(item);
                                        setOpen(false);
                                    }}
                                    style={({ pressed }) => ({
                                        padding: 12,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                        opacity: pressed ? 0.92 : 1,
                                    })}
                                >
                                    <Text style={{ fontWeight: "800", color: colors.text }} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    {item.muscleGroup ? (
                                        <Text style={{ fontWeight: "700", color: colors.mutedText }} numberOfLines={1}>
                                            {item.muscleGroup}
                                        </Text>
                                    ) : null}
                                </Pressable>
                            )}
                        />
                    )}
                </View>
            </Modal>
        </>
    );
});

type ExerciseEditorProps = {
    index: number;
    ex: ExerciseItem;
    disabled?: boolean;
    onRemove: () => void;
    onChange: (patch: Partial<ExerciseItem>) => void;
};

const ExerciseEditor = React.memo(function ExerciseEditor(props: ExerciseEditorProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.exerciseCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={styles.exerciseTop}>
                <Text style={{ fontWeight: "800", color: colors.text }}>Ejercicio #{props.index + 1}</Text>

                <Pressable
                    onPress={() => !props.disabled && props.onRemove()}
                    disabled={props.disabled}
                    style={({ pressed }) => ({
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: props.disabled ? 0.5 : pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ fontWeight: "800", color: colors.text }}>Eliminar</Text>
                </Pressable>
            </View>

            <MovementPicker
                disabled={props.disabled}
                valueLabel={props.ex.movementName ?? null}
                onPick={(m) => {
                    props.onChange({
                        movementId: m.id,
                        movementName: m.name,
                        name: m.name,
                    });
                }}
            />

            <FieldSmall
                label="Nombre"
                value={props.ex.name ?? ""}
                onChange={(v) => props.onChange({ name: v })}
                disabled={props.disabled}
            />

            <FieldSmall
                label="Notas"
                value={props.ex.notes ?? ""}
                onChange={(v) => props.onChange({ notes: v })}
                disabled={props.disabled}
                multiline
            />

            <View style={styles.row4}>
                <FieldTiny
                    label="Series"
                    value={props.ex.sets ?? ""}
                    onChange={(v) => props.onChange({ sets: v })}
                    disabled={props.disabled}
                />
                <FieldTiny
                    label="Reps"
                    value={props.ex.reps ?? ""}
                    onChange={(v) => props.onChange({ reps: v })}
                    disabled={props.disabled}
                />
            </View>

            <View style={styles.row4}>
                <FieldTiny
                    label="RPE (planeado)"
                    value={props.ex.rpe ?? ""}
                    onChange={(v) => props.onChange({ rpe: v })}
                    disabled={props.disabled}
                />
                <FieldTiny
                    label="Carga"
                    value={props.ex.load ?? ""}
                    onChange={(v) => props.onChange({ load: v })}
                    disabled={props.disabled}
                />
            </View>
        </View>
    );
});

type FieldSmallProps = {
    label: string;
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    multiline?: boolean;
};

const FieldSmall = React.memo(function FieldSmall(args: FieldSmallProps) {
    const { colors } = useTheme();

    return (
        <View style={{ gap: 6 }}>
            <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>{args.label}</Text>
            <TextInput
                value={args.value}
                onChangeText={args.onChange}
                editable={!args.disabled}
                multiline={args.multiline}
                placeholder={args.label}
                placeholderTextColor={colors.mutedText}
                style={[
                    styles.input,
                    {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        color: colors.text,
                        minHeight: args.multiline ? 70 : undefined,
                        textAlignVertical: args.multiline ? "top" : "center",
                    },
                ]}
            />
        </View>
    );
});

type FieldTinyProps = {
    label: string;
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
};

const FieldTiny = React.memo(function FieldTiny(args: FieldTinyProps) {
    const { colors } = useTheme();

    return (
        <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>{args.label}</Text>
            <TextInput
                value={args.value}
                onChangeText={args.onChange}
                editable={!args.disabled}
                placeholder={args.label}
                placeholderTextColor={colors.mutedText}
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            />
        </View>
    );
});

export function TrainerAssignRoutineSection({ traineeId, weekKey, date }: Props) {
    const { colors } = useTheme();

    const tplQ = useRoutineWeek(weekKey);
    const patchDayM = usePatchTraineePlannedRoutine();

    const [activeDayKey, setActiveDayKey] = React.useState<DayKey>(() => getDayKeyFromIsoDate(date));
    const [plans, setPlans] = React.useState<DayPlan[]>(() => normalizePlans([]));
    const [tagsCsvDraft, setTagsCsvDraft] = React.useState<string>("");

    React.useEffect(() => {
        setActiveDayKey(getDayKeyFromIsoDate(date));
    }, [date]);

    // Initialize editor with template week (trainer routine)
    React.useEffect(() => {
        const templateWeek: any = tplQ.data ?? null;
        if (!templateWeek) {
            setPlans(normalizePlans([]));
            return;
        }

        // templateWeek.days is WorkoutRoutineDay[] (typed in your routines types). We map a minimal compatible plan.
        const next: DayPlan[] = normalizePlans(
            Array.isArray(templateWeek.days)
                ? templateWeek.days.map((d: any) => ({
                    dayKey: d.dayKey,
                    sessionType: d.sessionType ?? undefined,
                    focus: d.focus ?? undefined,
                    tags: Array.isArray(d.tags) ? d.tags : undefined,
                    notes: d.notes ?? undefined,
                    exercises: Array.isArray(d.exercises)
                        ? d.exercises.map((ex: any) => ({
                            id: ex.id || makeId(),
                            name: ex.name ?? "",
                            sets: ex.sets != null ? String(ex.sets) : undefined,
                            reps: ex.reps ?? undefined,
                            rpe: ex.rpe != null ? String(ex.rpe) : undefined,
                            load: ex.load ?? undefined,
                            notes: ex.notes ?? undefined,
                            attachmentPublicIds: ex.attachmentPublicIds ?? undefined,
                            movementId: ex.movementId ?? undefined,
                            movementName: ex.movementName ?? undefined,
                        }))
                        : undefined,
                }))
                : []
        );

        setPlans(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tplQ.data && (tplQ.data as any)?.id, weekKey]);

    const activeDate = React.useMemo(() => getDateForDayKey(weekKey, activeDayKey), [weekKey, activeDayKey]);

    const traineeDayQ = useTrainerDay({ traineeId, date: activeDate as any });
    const hasTrainingLock = Boolean(traineeDayQ.data?.day?.training);

    // HYDRATE: source of truth is trainee day plannedRoutine when present
    React.useEffect(() => {
        const day = traineeDayQ.data?.day ?? null;
        if (!day) return;
        if (day.date !== activeDate) return;

        if (day.plannedRoutine) {
            const fromTrainee = plannedRoutineToDayPlan(activeDayKey, day.plannedRoutine);

            setPlans((prev) => {
                const next = normalizePlans(prev);
                const idx = next.findIndex((p) => p.dayKey === activeDayKey);
                if (idx < 0) return next;
                next[idx] = fromTrainee;
                return next;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [traineeDayQ.data, activeDate, activeDayKey]);

    React.useEffect(() => {
        // sync when switching days (avoid comma being "eaten" by join/split loop)
        setTagsCsvDraft((activePlan.tags ?? []).join(", "));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeDayKey]);

    const activePlan: DayPlan = React.useMemo(() => {
        const found = plans.find((p) => p.dayKey === activeDayKey);
        return found ?? ({ dayKey: activeDayKey } as DayPlan);
    }, [plans, activeDayKey]);

    const busy = patchDayM.isPending || traineeDayQ.isLoading || hasTrainingLock;

    // const onSaveActiveDay = async () => {
    //     if (hasTrainingLock) return;

    //     const plannedAt = new Date().toISOString();
    //     const routineDays = plansToRoutineDays(weekKey, plans);
    //     const day = routineDays.find((d) => d.dayKey === activeDayKey) ?? null;

    //     const isEmpty =
    //         !day ||
    //         (!day.sessionType && !day.focus && (!day.exercises || day.exercises.length === 0) && !day.notes && (!day.tags || day.tags.length === 0));

    //     const plannedRoutine: PlannedRoutine | null = isEmpty
    //         ? null
    //         : mapPlanToPlannedRoutine({
    //             dayKey: activeDayKey,
    //             sessionType: day.sessionType,
    //             focus: day.focus,
    //             notes: day.notes,
    //             tags: day.tags,
    //             exercises: day.exercises,
    //         });

    //     const plannedMeta: PlannedMeta = {
    //         plannedBy: traineeId, // not used by BE as strict; BE overwrites with auth user in most setups
    //         plannedAt,
    //         source: "trainer" as PlannedRoutineSource,
    //     };

    //     await patchDayM.mutateAsync({
    //         traineeId,
    //         date: activeDate as any,
    //         body: {
    //             plannedRoutine,
    //             plannedMeta: { plannedAt, source: "trainer" as PlannedRoutineSource },
    //         },
    //         weekKey: weekKey as any,
    //     });

    //     // reflect immediately in UI
    //     if (plannedRoutine) {
    //         const fromSaved = plannedRoutineToDayPlan(activeDayKey, plannedRoutine);
    //         setPlans((prev) => {
    //             const next = normalizePlans(prev);
    //             const idx = next.findIndex((p) => p.dayKey === activeDayKey);
    //             if (idx >= 0) next[idx] = fromSaved;
    //             return next;
    //         });
    //     }
    // };

    const onSaveActiveDay = async () => {
        if (hasTrainingLock) {
            toastInfo("Bloqueado", "Ya tiene entrenamiento. No se puede modificar este día.");
            return;
        }

        try {
            const plannedAt = new Date().toISOString();
            const routineDays = plansToRoutineDays(weekKey, plans);
            const day = routineDays.find((d) => d.dayKey === activeDayKey) ?? null;

            const isEmpty =
                !day ||
                (!day.sessionType &&
                    !day.focus &&
                    (!day.exercises || day.exercises.length === 0) &&
                    !day.notes &&
                    (!day.tags || day.tags.length === 0));

            const plannedRoutine: PlannedRoutine | null = isEmpty
                ? null
                : mapPlanToPlannedRoutine({
                    dayKey: activeDayKey,
                    sessionType: day.sessionType,
                    focus: day.focus,
                    notes: day.notes,
                    tags: day.tags,
                    exercises: day.exercises,
                });

            const plannedMeta: PlannedMeta = {
                plannedBy: traineeId, // not used by BE as strict; BE overwrites with auth user in most setups
                plannedAt,
                source: "trainer" as PlannedRoutineSource,
            };

            await patchDayM.mutateAsync({
                traineeId,
                date: activeDate as any,
                body: {
                    plannedRoutine,
                    plannedMeta: { plannedAt, source: "trainer" as PlannedRoutineSource },
                },
                weekKey: weekKey as any,
            });

            // reflect immediately in UI
            if (plannedRoutine) {
                const fromSaved = plannedRoutineToDayPlan(activeDayKey, plannedRoutine);
                setPlans((prev) => {
                    const next = normalizePlans(prev);
                    const idx = next.findIndex((p) => p.dayKey === activeDayKey);
                    if (idx >= 0) next[idx] = fromSaved;
                    return next;
                });

                toastSuccess("Guardado", "Rutina del día actualizada.");
            } else {
                setPlans((prev) => {
                    const next = normalizePlans(prev);
                    const idx = next.findIndex((p) => p.dayKey === activeDayKey);
                    if (idx >= 0) next[idx] = { dayKey: activeDayKey } as DayPlan;
                    return next;
                });

                toastSuccess("Guardado", "Día guardado como descanso (sin rutina).");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "No se pudo guardar. Intenta de nuevo.";
            toastError("Error al guardar", message);
        }
    };

    const onMarkRestActiveDay = async () => {
        if (hasTrainingLock) return;

        const plannedAt = new Date().toISOString();

        await patchDayM.mutateAsync({
            traineeId,
            date: activeDate as any,
            body: {
                plannedRoutine: null,
                plannedMeta: { plannedAt, source: "trainer" as PlannedRoutineSource },
            },
            weekKey: weekKey as any,
        });

        setPlans((prev) => {
            const next = normalizePlans(prev);
            const idx = next.findIndex((p) => p.dayKey === activeDayKey);
            if (idx >= 0) next[idx] = { dayKey: activeDayKey } as DayPlan;
            return next;
        });
    };

    const onUpdatePlan = (patch: Partial<DayPlan>) => {
        setPlans((prev) => {
            const next = normalizePlans(prev);
            const idx = next.findIndex((p) => p.dayKey === activeDayKey);
            if (idx < 0) return next;
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
    };

    const onAddExercise = () => {
        setPlans((prev) => {
            const next = normalizePlans(prev);
            const idx = next.findIndex((p) => p.dayKey === activeDayKey);
            if (idx < 0) return next;

            const p = next[idx];
            const ex: ExerciseItem = { id: makeId(), name: "" };
            const exercises = Array.isArray(p.exercises) ? [...p.exercises, ex] : [ex];
            next[idx] = { ...p, exercises };
            return next;
        });
    };

    const onRemoveExercise = (idxToRemove: number) => {
        setPlans((prev) => {
            const next = normalizePlans(prev);
            const idx = next.findIndex((p) => p.dayKey === activeDayKey);
            if (idx < 0) return next;

            const p = next[idx];
            const exercises = Array.isArray(p.exercises) ? [...p.exercises] : [];
            exercises.splice(idxToRemove, 1);

            next[idx] = { ...p, exercises: exercises.length ? exercises : undefined };
            return next;
        });
    };

    const onUpdateExercise = (idxToUpdate: number, patch: Partial<ExerciseItem>) => {
        setPlans((prev) => {
            const next = normalizePlans(prev);
            const idx = next.findIndex((p) => p.dayKey === activeDayKey);
            if (idx < 0) return next;

            const p = next[idx];
            const exercises = Array.isArray(p.exercises) ? [...p.exercises] : [];
            const current = exercises[idxToUpdate];
            if (!current) return next;

            exercises[idxToUpdate] = { ...current, ...patch };
            next[idx] = { ...p, exercises };
            return next;
        });
    };

    return (
        <View style={{ gap: 12 }}>
            {/* Day selector tabs */}
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "800", color: colors.text }}>Editar por día</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    El editor refleja lo guardado en el trainee (source of truth).
                </Text>

                <View style={{ height: 10 }} />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {DAY_KEYS.map((dk) => {
                        const active = dk === activeDayKey;
                        return (
                            <Pressable
                                key={dk}
                                onPress={() => setActiveDayKey(dk)}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: active ? colors.primary : colors.background,
                                    opacity: pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ fontWeight: "800", color: active ? "#fff" : colors.text }}>
                                    {dayKeyLabelEs(dk)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                <View style={{ height: 10 }} />

                <View style={[styles.infoRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>
                        Día seleccionado: <Text style={{ color: colors.text }}>{dayKeyLabelEs(activeDayKey)}</Text>
                    </Text>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>{activeDate}</Text>
                </View>

                <View style={{ height: 10 }} />

                <View style={styles.actionsRow}>
                    <Pressable
                        onPress={() => !busy && onSaveActiveDay()}
                        disabled={busy}
                        style={({ pressed }) => ({
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: busy ? 0.5 : pressed ? 0.92 : 1,
                            flex: 1,
                            alignItems: "center",
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>
                            {patchDayM.isPending ? "Guardando…" : "Guardar este día"}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => !busy && onMarkRestActiveDay()}
                        disabled={busy}
                        style={({ pressed }) => ({
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: busy ? 0.5 : pressed ? 0.92 : 1,
                            flex: 1,
                            alignItems: "center",
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>Marcar descanso</Text>
                    </Pressable>
                </View>

                {traineeDayQ.isLoading ? (
                    <View style={{ marginTop: 10, alignItems: "center" }}>
                        <ActivityIndicator />
                        <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Cargando día del trainee…</Text>
                    </View>
                ) : hasTrainingLock ? (
                    <View style={{ marginTop: 10 }}>
                        <Text style={{ color: colors.mutedText, fontWeight: "800" }}>
                            Bloqueado: ya tiene entrenamiento (no se puede modificar).
                        </Text>
                    </View>
                ) : null}
            </View>

            {/* Editor */}
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "800", color: colors.text }}>Rutina del día</Text>

                <View style={{ height: 10 }} />

                <Field
                    label="Tipo de sesión"
                    value={activePlan.sessionType ?? ""}
                    onChange={(v) => onUpdatePlan({ sessionType: v.trim() ? v : undefined })}
                    disabled={busy}
                />

                <Field
                    label="Enfoque"
                    value={activePlan.focus ?? ""}
                    onChange={(v) => onUpdatePlan({ focus: v.trim() ? v : undefined })}
                    disabled={busy}
                />

                <Field
                    label="Tags (CSV)"
                    value={tagsCsvDraft}
                    onChange={(v) => {
                        setTagsCsvDraft(v);

                        const tags = v
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean);

                        onUpdatePlan({ tags: tags.length ? tags : undefined });
                    }}
                    disabled={busy}
                />

                <Field
                    label="Notas"
                    value={activePlan.notes ?? ""}
                    onChange={(v) => onUpdatePlan({ notes: v.trim() ? v : undefined })}
                    disabled={busy}
                    multiline
                />

                <View style={{ height: 6 }} />

                <View style={styles.exerciseHeader}>
                    <Text style={{ fontWeight: "800", color: colors.text }}>Ejercicios del día</Text>

                    <Pressable
                        onPress={() => !busy && onAddExercise()}
                        disabled={busy}
                        style={({ pressed }) => ({
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: busy ? 0.5 : pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>Añadir ejercicio</Text>
                    </Pressable>
                </View>

                <View style={{ height: 10 }} />

                {!activePlan.exercises || activePlan.exercises.length === 0 ? (
                    <View style={[styles.emptyBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                        <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Agrega tu primer ejercicio para este día.</Text>
                    </View>
                ) : (
                    <View style={{ gap: 10 }}>
                        {activePlan.exercises.map((ex, idx) => (
                            <ExerciseEditor
                                key={ex.id}
                                index={idx}
                                ex={ex}
                                disabled={busy}
                                onRemove={() => onRemoveExercise(idx)}
                                onChange={(patch) => onUpdateExercise(idx, patch)}
                            />
                        ))}
                    </View>
                )}
            </View>

            {null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 4 },

    infoRow: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },

    actionsRow: { flexDirection: "row", gap: 10 },

    input: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontWeight: "800",
        fontSize: 14,
    },

    exerciseHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    emptyBox: { borderWidth: 1, borderRadius: 14, padding: 12, alignItems: "center", justifyContent: "center" },

    exerciseCard: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
    exerciseTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    row4: { flexDirection: "row", gap: 10 },

    backdrop: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" },
    sheet: { position: "absolute", left: 16, right: 16, top: 110, borderWidth: 1, borderRadius: 16, padding: 12, gap: 6 },
});