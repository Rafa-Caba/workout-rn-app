import { useMutation } from "@tanstack/react-query";
import { addWeeks, format, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

import type { Movement } from "@/src/types/movements.types";
import type { WorkoutRoutineDay, WorkoutRoutineStatus, WorkoutRoutineWeek } from "@/src/types/workoutRoutine.types";

import { useInitRoutineWeek, useRoutineWeek, useSetRoutineArchived, useUpdateRoutineWeek } from "@/src/hooks/routines/useRoutineWeek";
import { useMovements } from "@/src/hooks/useMovements";

import { uploadRoutineAttachments } from "@/src/services/workout/routineAttachments.service";

import { extractAttachments, toAttachmentOptions, type AttachmentOption } from "@/src/utils/routines/attachments";
import {
    DAY_KEYS,
    getPlanFromMeta,
    normalizePlans,
    setPlanIntoMeta,
    type DayKey,
    type DayPlan,
    type ExerciseItem,
} from "@/src/utils/routines/plan";
import { normalizePutBodyForApi, type RoutineUpsertBody } from "@/src/utils/routines/putBody";
import { saveRoutineWeekWithPlanFallback } from "@/src/utils/routines/saveRoutineWeek";
import { toastError, toastSuccess } from "@/src/utils/toast";

import type { MovementOption } from "../components/MovementPickerInline";
import { PlannedDaysTabs } from "../components/PlannedDaysTabs";
import { RoutineDayEditor } from "../components/RoutineDayEditor";
import { RoutineExercisesEditor, type RoutineExerciseDraft } from "../components/RoutineExercisesEditor";

type Props = { weekKey: string };
type InitFormState = { title: string; split: string; unarchive: boolean };

function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function weekKeyFromDate(d: Date): string {
    const y = getISOWeekYear(d);
    const w = getISOWeek(d);
    return `${y}-W${pad2(w)}`;
}

function startDateFromWeekKey(weekKey: string): Date | null {
    const m = /^(\d{4})-W(\d{2})$/.exec(weekKey.trim());
    if (!m) return null;

    const year = Number(m[1]);
    const week = Number(m[2]);
    if (!Number.isFinite(year) || !Number.isFinite(week)) return null;

    const jan4 = new Date(Date.UTC(year, 0, 4, 0, 0, 0));
    const d = addWeeks(jan4, week - 1);
    return startOfISOWeek(d);
}

function formatISODate(d: Date): string {
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

function Card(props: { title: string; subtitle?: string; children: React.ReactNode }) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 12,
                gap: 10,
            }}
        >
            <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>{props.title}</Text>
                {props.subtitle ? <Text style={{ color: colors.mutedText }}>{props.subtitle}</Text> : null}
            </View>
            {props.children}
        </View>
    );
}

function Button(props: { title: string; onPress: () => void; disabled?: boolean; tone?: "primary" | "neutral" | "danger" }) {
    const { colors } = useTheme();
    const tone = props.tone ?? "neutral";

    const borderColor = tone === "primary" ? colors.primary : tone === "danger" ? colors.danger : colors.border;
    const bgColor = tone === "primary" ? colors.primary : colors.surface;
    const textColor = tone === "primary" ? colors.primaryText : tone === "danger" ? colors.danger : colors.text;

    return (
        <Pressable
            onPress={props.onPress}
            disabled={props.disabled}
            style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor,
                backgroundColor: bgColor,
                opacity: props.disabled ? 0.5 : pressed ? 0.92 : 1,
            })}
        >
            <Text style={{ fontWeight: "900", color: textColor, textAlign: "center" }}>{props.title}</Text>
        </Pressable>
    );
}

function Input(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    const { colors } = useTheme();

    return (
        <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "700", color: colors.text }}>{props.label}</Text>
            <TextInput
                value={props.value}
                onChangeText={props.onChange}
                placeholder={props.placeholder}
                placeholderTextColor={colors.mutedText}
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontWeight: "700",
                }}
            />
        </View>
    );
}

function ToggleChip(props: { label: string; active: boolean; onPress: () => void }) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: props.active ? colors.primary : colors.border,
                backgroundColor: props.active ? colors.primary : "transparent",
                opacity: pressed ? 0.92 : 1,
            })}
        >
            <Text style={{ fontWeight: "900", color: props.active ? colors.primaryText : colors.text }}>
                {props.label}
            </Text>
        </Pressable>
    );
}

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function makeId(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any;
    if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
    return `ex_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function ensureExerciseIds(input: DayPlan[]): DayPlan[] {
    return input.map((p) => ({
        ...p,
        exercises: p.exercises?.map((e) => ({
            ...e,
            id: e.id || makeId(),
            attachmentPublicIds: Array.isArray((e as any).attachmentPublicIds) ? (e as any).attachmentPublicIds : [],
        })),
    }));
}

function normalizePlansForUi(plans: DayPlan[]): DayPlan[] {
    return ensureExerciseIds(normalizePlans(plans));
}

function routineDaysToPlans(days: WorkoutRoutineDay[] | null | undefined): DayPlan[] {
    const list = Array.isArray(days) ? days : [];
    const mapped: DayPlan[] = list
        .filter((d) => d && DAY_KEYS.includes(d.dayKey as DayKey))
        .map((d) => {
            const dayKey = d.dayKey as DayKey;
            const exercises: ExerciseItem[] | undefined = Array.isArray(d.exercises)
                ? d.exercises.map((e) => ({
                    id: String(e.id || makeId()),
                    name: String(e.name ?? ""),
                    sets: e.sets == null ? undefined : String(e.sets),
                    reps: e.reps == null ? undefined : String(e.reps),
                    rpe: e.rpe == null ? undefined : String(e.rpe),
                    load: e.load ?? undefined,
                    notes: e.notes ?? undefined,
                    attachmentPublicIds: Array.isArray(e.attachmentPublicIds) ? e.attachmentPublicIds : [],
                    movementId: e.movementId ?? undefined,
                    movementName: e.movementName ?? undefined,
                }))
                : undefined;

            return {
                dayKey,
                sessionType: d.sessionType ?? undefined,
                focus: d.focus ?? undefined,
                tags: Array.isArray(d.tags) ? d.tags : undefined,
                notes: d.notes ?? undefined,
                exercises,
            };
        });

    return normalizePlansForUi(mapped);
}

function toDraftExercises(exercises: ExerciseItem[] | undefined): RoutineExerciseDraft[] {
    return (exercises ?? []).map((e) => ({
        id: e.id,
        name: e.name ?? "",
        movementId: e.movementId ?? null,
        movementName: e.movementName ?? null,
        sets: e.sets ?? "",
        reps: e.reps ?? "",
        rpe: e.rpe ?? "",
        load: e.load ?? "",
        notes: e.notes ?? "",
        attachmentPublicIds: e.attachmentPublicIds ?? [],
        pendingFiles: [],
    }));
}

function mapMovementsToOptions(movements: Movement[]): MovementOption[] {
    return movements.map((m) => ({
        id: m.id,
        name: m.name,
        imageUrl: m.media?.url ?? null,
    }));
}

function buildAttachmentsSet(routine: unknown): Set<string> {
    const list = extractAttachments(routine as any);
    const s = new Set<string>();
    for (const a of list) {
        if (a && typeof a.publicId === "string" && a.publicId.trim()) s.add(a.publicId.trim());
    }
    return s;
}

function diffNewAttachmentPublicIds(before: Set<string>, after: Set<string>): string[] {
    const added: string[] = [];
    for (const id of after) if (!before.has(id)) added.push(id);
    return added;
}

function mergeAttachmentOptions(base: AttachmentOption[], extra: AttachmentOption[]): AttachmentOption[] {
    const map = new Map<string, AttachmentOption>();
    for (const a of base) map.set(a.publicId, a);
    for (const a of extra) {
        if (!a.publicId) continue;
        if (!map.has(a.publicId)) map.set(a.publicId, a);
    }
    return Array.from(map.values());
}

function pickAttachmentOptionByPublicId(routine: unknown, publicId: string): AttachmentOption | null {
    if (!routine) return null;
    const list = extractAttachments(routine as any);
    const opts = toAttachmentOptions(list);
    const found = opts.find((o) => o.publicId === publicId);
    return found ?? null;
}

export function RoutinesWeekScreen({ weekKey }: Props) {
    const router = useRouter();
    const { colors } = useTheme();

    const wk = weekKey?.trim() ?? "";
    const weekStart = React.useMemo(() => startDateFromWeekKey(wk), [wk]);

    const rangeLabel = React.useMemo(() => {
        if (!weekStart) return "—";
        const from = formatISODate(weekStart);
        const to = formatISODate(addWeeks(weekStart, 1));
        return `${from} → ${to}`;
    }, [weekStart]);

    const routineQuery = useRoutineWeek(wk);
    const routine = (routineQuery.data ?? null) as WorkoutRoutineWeek | null;

    const [localAttachments, setLocalAttachments] = React.useState<AttachmentOption[]>([]);

    const initMutation = useInitRoutineWeek(wk);
    const updateMutation = useUpdateRoutineWeek(wk);
    const archiveMutation = useSetRoutineArchived();

    const movementsQ = useMovements({ activeOnly: true });
    const movementOptions: MovementOption[] = React.useMemo(
        () => mapMovementsToOptions(movementsQ.data ?? []),
        [movementsQ.data]
    );

    const [initForm, setInitForm] = React.useState<InitFormState>({
        title: "",
        split: "",
        unarchive: true,
    });

    const [putBody, setPutBody] = React.useState<RoutineUpsertBody>({
        title: "",
        split: "",
        plannedDays: null,
        meta: null,
    });

    const [plans, setPlans] = React.useState<DayPlan[]>(() => normalizePlansForUi([]));
    const plansRef = React.useRef<DayPlan[]>(plans);
    React.useEffect(() => {
        plansRef.current = plans;
    }, [plans]);

    const [selectedDay, setSelectedDay] = React.useState<DayKey>("Mon");

    const activePlan = React.useMemo(
        () => plans.find((p) => p.dayKey === selectedDay) ?? ({ dayKey: selectedDay } as DayPlan),
        [plans, selectedDay]
    );

    const [dayDraft, setDayDraft] = React.useState({
        sessionType: "",
        focus: "",
        tagsCsv: "",
        notes: "",
    });

    const [exerciseDrafts, setExerciseDrafts] = React.useState<RoutineExerciseDraft[]>([]);

    const attachments = React.useMemo(() => extractAttachments(routine), [routine]);
    const baseAttachmentOptions: AttachmentOption[] = React.useMemo(() => toAttachmentOptions(attachments), [attachments]);
    const attachmentOptions: AttachmentOption[] = React.useMemo(
        () => mergeAttachmentOptions(baseAttachmentOptions, localAttachments),
        [baseAttachmentOptions, localAttachments]
    );

    const uploadMutation = useMutation({
        mutationFn: (args: { files: any[]; query?: Record<string, any> }) =>
            uploadRoutineAttachments(wk, args.files as any[], args.query),
    });

    const busy =
        initMutation.isPending ||
        updateMutation.isPending ||
        archiveMutation.isPending ||
        uploadMutation.isPending ||
        routineQuery.isFetching;

    React.useEffect(() => {
        if (!routine) return;

        const title = typeof routine.title === "string" ? routine.title : "";
        const split = typeof routine.split === "string" ? routine.split : "";
        const plannedDays = Array.isArray(routine.plannedDays) ? routine.plannedDays : null;

        setLocalAttachments([]); // reset optimistic cache on routine change

        setPutBody({
            title,
            split,
            plannedDays: plannedDays as any,
            meta: isRecord(routine.meta) ? (routine.meta as any) : null,
        });

        const canonicalPlans = routineDaysToPlans(routine.days);
        const fallbackPlans = normalizePlansForUi(getPlanFromMeta(routine?.meta ?? {}));
        const hasCanonicalDays = Array.isArray(routine.days) && routine.days.length > 0;
        const chosenPlans = hasCanonicalDays ? canonicalPlans : fallbackPlans;

        setPlans(chosenPlans);
        plansRef.current = chosenPlans;

        const plannedList = (plannedDays ?? []).filter((d) => DAY_KEYS.includes(d as any)) as DayKey[];
        if (plannedList.length > 0 && !plannedList.includes(selectedDay)) setSelectedDay(plannedList[0]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routine?.id, routine?.updatedAt]);

    const lastPlanHashRef = React.useRef<string>("");
    React.useEffect(() => {
        const hash = JSON.stringify(plans);
        if (hash === lastPlanHashRef.current) return;
        lastPlanHashRef.current = hash;

        setPutBody((prev) => {
            const baseMeta = isRecord(prev.meta) ? prev.meta : null;
            const nextMeta = setPlanIntoMeta(baseMeta, plans);
            return { ...prev, meta: nextMeta as any };
        });
    }, [plans]);

    React.useEffect(() => {
        const p = activePlan;

        setDayDraft({
            sessionType: p.sessionType ?? "",
            focus: p.focus ?? "",
            tagsCsv: (p.tags ?? []).join(", "),
            notes: p.notes ?? "",
        });

        setExerciseDrafts(toDraftExercises(p.exercises));
    }, [activePlan.dayKey]);

    function togglePlannedDay(dayKey: DayKey) {
        setPutBody((prev) => {
            const current = (prev.plannedDays ?? []) as DayKey[];
            const exists = current.includes(dayKey);
            const next = exists ? current.filter((d) => d !== dayKey) : [...current, dayKey];
            return { ...prev, plannedDays: next.length ? next : null };
        });
    }

    // keep plans consistent (no tagsCsv inside plan)
    function commitDayDraft(patch: Partial<typeof dayDraft>) {
        setDayDraft((s) => {
            const next = { ...s, ...patch };

            const tags = next.tagsCsv
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean);

            setPlans((prev) =>
                prev.map((p) =>
                    p.dayKey === selectedDay
                        ? {
                            ...p,
                            sessionType: next.sessionType,
                            focus: next.focus,
                            notes: next.notes,
                            tags: tags.length ? tags : undefined,
                        }
                        : p
                )
            );

            return next;
        });
    }

    function onExercisesChange(nextExercises: RoutineExerciseDraft[]) {
        setExerciseDrafts(nextExercises);

        const tags = dayDraft.tagsCsv
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);

        setPlans((prev) =>
            prev.map((p) => {
                if (p.dayKey !== selectedDay) return p;

                const mapped: ExerciseItem[] = nextExercises.map((d) => ({
                    id: d.id,
                    name: d.name ?? "",
                    sets: d.sets ?? "",
                    reps: d.reps ?? "",
                    rpe: d.rpe ?? "",
                    load: d.load ?? "",
                    notes: d.notes ?? "",
                    attachmentPublicIds: d.attachmentPublicIds ?? [],
                    movementId: d.movementId ?? undefined,
                    movementName: d.movementName ?? undefined,
                }));

                return {
                    ...p,
                    sessionType: dayDraft.sessionType,
                    focus: dayDraft.focus,
                    notes: dayDraft.notes,
                    tags: tags.length ? tags : undefined,
                    exercises: mapped.length ? mapped : undefined,
                };
            })
        );
    }

    const goPrevWeek = () => {
        if (!weekStart) return;
        router.replace(`/(app)/calendar/routines/week/${weekKeyFromDate(addWeeks(weekStart, -1))}` as any);
    };

    const goNextWeek = () => {
        if (!weekStart) return;
        router.replace(`/(app)/calendar/routines/week/${weekKeyFromDate(addWeeks(weekStart, 1))}` as any);
    };

    async function initRoutine() {
        try {
            await initMutation.mutateAsync({
                title: initForm.title.trim() || undefined,
                split: initForm.split.trim() || undefined,
                unarchive: initForm.unarchive,
            });
            toastSuccess("Rutina inicializada", "Ya puedes editar días y ejercicios.");
            await routineQuery.refetch();
        } catch (e: any) {
            toastError("Error", e?.message ?? "No se pudo inicializar la rutina.");
        }
    }

    async function uploadPendingExerciseFilesIfAny(): Promise<DayPlan[]> {
        if (!routine) return plansRef.current;

        const pending = exerciseDrafts
            .map((d) => ({ exerciseId: d.id, files: d.pendingFiles ?? [] }))
            .filter((x) => x.files.length > 0);

        if (pending.length === 0) return plansRef.current;

        let nextPlans = plansRef.current;

        for (const item of pending) {
            const before = buildAttachmentsSet(routineQuery.data ?? routine);

            await uploadMutation.mutateAsync({ files: item.files as any[], query: {} });

            const ref = await routineQuery.refetch();
            const nextRoutine = (ref.data ?? null) as WorkoutRoutineWeek | null;

            const after = buildAttachmentsSet(nextRoutine);
            const added = diffNewAttachmentPublicIds(before, after);
            const newId = added.length > 0 ? added[0] : null;

            if (newId) {
                if (nextRoutine) {
                    const opt = pickAttachmentOptionByPublicId(nextRoutine, newId);
                    if (opt) setLocalAttachments((prev) => mergeAttachmentOptions(prev, [opt]));
                }

                nextPlans = nextPlans.map((p) => {
                    if (p.dayKey !== selectedDay) return p;

                    const ex = p.exercises ?? [];
                    const nextEx = ex.map((row) => {
                        if (row.id !== item.exerciseId) return row;
                        const cur = Array.isArray(row.attachmentPublicIds) ? row.attachmentPublicIds : [];
                        const nextIds = cur.includes(newId) ? cur : [...cur, newId];
                        return { ...row, attachmentPublicIds: nextIds };
                    });

                    return { ...p, exercises: nextEx };
                });

                setPlans(nextPlans);
                plansRef.current = nextPlans;

                setExerciseDrafts((prev) => prev.map((d) => (d.id === item.exerciseId ? { ...d, pendingFiles: [] } : d)));
                setExerciseDrafts((prev) => [...prev]);
            }
        }

        return nextPlans;
    }

    async function saveRoutine() {
        if (!routine) return;

        try {
            const updatedPlans = await uploadPendingExerciseFilesIfAny();

            const baseMeta = isRecord(putBody.meta) ? putBody.meta : null;
            const nextMeta = setPlanIntoMeta(baseMeta, updatedPlans);

            const bodyWithUpdatedMeta: RoutineUpsertBody = {
                ...putBody,
                meta: nextMeta as any,
            };

            setPutBody(bodyWithUpdatedMeta);

            const apiBody = normalizePutBodyForApi(bodyWithUpdatedMeta);

            await saveRoutineWeekWithPlanFallback({
                weekKey: wk,
                baseBody: apiBody,
                plans: updatedPlans,
                mutateAsync: (payload: any) => updateMutation.mutateAsync({ routine: payload as any }) as any,
            });

            toastSuccess("Guardado", "Rutina guardada ✅");
            await routineQuery.refetch();
        } catch (e: any) {
            toastError("Error", e?.message ?? "No se pudo guardar la rutina.");
        }
    }

    async function setArchived(archived: boolean) {
        try {
            await archiveMutation.mutateAsync({ weekKey: wk, archived, status: routine?.status });
            toastSuccess(archived ? "Archivada" : "Desarchivada", "OK");
        } catch (e: any) {
            toastError("Error", (e as any)?.message ?? "No se pudo actualizar el estado.");
        }
    }

    const plannedDaysList = ((putBody.plannedDays ?? []) as DayKey[]).filter((d) => DAY_KEYS.includes(d as any));
    const dayTabs = plannedDaysList.length > 0 ? plannedDaysList : [...DAY_KEYS];

    const selectedDayDate = React.useMemo(() => {
        if (!weekStart) return "";
        const idx = DAY_KEYS.indexOf(selectedDay);
        if (idx < 0) return "";
        const d = new Date(weekStart.getTime() + idx * 86400000);
        return formatISODate(d);
    }, [weekStart, selectedDay]);

    const status = (routine?.status ?? "active") as WorkoutRoutineStatus;

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12 }}>
            <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>Rutinas</Text>
                <Text style={{ color: colors.mutedText }}>
                    Semana: <Text style={{ fontFamily: "Menlo", color: colors.text }}>{wk}</Text> · {rangeLabel}
                </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                    <Button title="← Semana" onPress={goPrevWeek} disabled={!weekStart || busy} />
                </View>
                <View style={{ flex: 1 }}>
                    <Button title="Semana →" onPress={goNextWeek} disabled={!weekStart || busy} />
                </View>
            </View>

            {!routine ? (
                <Card title="Inicializar rutina" subtitle="Esta semana no existe aún. Inicialízala para empezar.">
                    <Input
                        label="Título (opcional)"
                        value={initForm.title}
                        onChange={(v) => setInitForm((s) => ({ ...s, title: v }))}
                    />
                    <Input
                        label="Split (opcional)"
                        value={initForm.split}
                        onChange={(v) => setInitForm((s) => ({ ...s, split: v }))}
                    />

                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: "800", color: colors.text }}>Desarchivar si ya estaba archivada</Text>
                            <Text style={{ color: colors.mutedText }}>Si existía como archivada, la reactiva.</Text>
                        </View>
                        <Switch value={initForm.unarchive} onValueChange={(v) => setInitForm((s) => ({ ...s, unarchive: v }))} />
                    </View>

                    <Button
                        title={initMutation.isPending ? "Inicializando..." : "Inicializar"}
                        onPress={initRoutine}
                        disabled={busy}
                        tone="primary"
                    />
                </Card>
            ) : (
                <>
                    <Card title="Semana">
                        <Input label="Título" value={putBody.title ?? ""} onChange={(v) => setPutBody((p) => ({ ...p, title: v }))} />
                        <Input label="Split" value={putBody.split ?? ""} onChange={(v) => setPutBody((p) => ({ ...p, split: v }))} />

                        <View style={{ gap: 8 }}>
                            <Text style={{ fontWeight: "900", color: colors.text }}>Días planeados</Text>
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                {DAY_KEYS.map((k) => (
                                    <ToggleChip
                                        key={k}
                                        label={dayLabelEs(k)}
                                        active={plannedDaysList.includes(k)}
                                        onPress={() => togglePlannedDay(k)}
                                    />
                                ))}
                            </View>
                        </View>

                        <Button title={updateMutation.isPending ? "Guardando..." : "Guardar"} onPress={saveRoutine} disabled={busy} tone="primary" />
                    </Card>

                    <Card title="Editar día" subtitle="Selecciona un día planeado para editar sesión y ejercicios.">
                        <PlannedDaysTabs days={dayTabs} value={selectedDay} onChange={setSelectedDay} />

                        <RoutineDayEditor dayKey={selectedDay} date={selectedDayDate} value={dayDraft} onChange={commitDayDraft} />

                        <RoutineExercisesEditor
                            movements={movementOptions}
                            attachmentOptions={attachmentOptions}
                            value={exerciseDrafts}
                            onChange={onExercisesChange}
                        />
                    </Card>

                    <Card title="Estado">
                        <Text style={{ color: colors.mutedText }}>
                            Estado actual: <Text style={{ fontWeight: "900", color: colors.text }}>{status}</Text>
                        </Text>

                        {status === "active" ? (
                            <Button
                                title={archiveMutation.isPending ? "Archivando..." : "Archivar"}
                                onPress={() => setArchived(true)}
                                disabled={busy}
                                tone="danger"
                            />
                        ) : (
                            <Button
                                title={archiveMutation.isPending ? "Desarchivando..." : "Desarchivar"}
                                onPress={() => setArchived(false)}
                                disabled={busy}
                                tone="primary"
                            />
                        )}
                    </Card>
                </>
            )}
        </ScrollView>
    );
}