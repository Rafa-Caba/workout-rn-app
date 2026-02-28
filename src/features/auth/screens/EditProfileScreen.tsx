// src/features/auth/screens/EditProfileScreen.tsx
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
    subMonths,
} from "date-fns";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { useMe } from "@/src/hooks/auth/useMe";
import { useUserStore } from "@/src/store/user.store";
import { useTheme } from "@/src/theme/ThemeProvider";

import type { AuthUser, CoachMode, Sex, TrainingLevel, Units } from "@/src/types/auth.types";
import type { ActivityGoal, UserProfileUpdateRequest } from "@/src/types/user.types";

type SexUi = "" | Exclude<Sex, null>;
type TrainingLevelUi = "" | Exclude<TrainingLevel, null>;
type ActivityGoalUi = "" | Exclude<ActivityGoal, null>;
type WeightUnitUi = "" | Units["weight"];
type DistanceUnitUi = "" | Units["distance"];

type FormState = {
    name: string;
    sex: SexUi;

    heightCm: string;
    currentWeightKg: string;

    unitWeight: WeightUnitUi;
    unitDistance: DistanceUnitUi;

    birthDate: string; // YYYY-MM-DD
    activityGoal: ActivityGoalUi;
    timezone: string;

    trainingLevel: TrainingLevelUi;
    healthNotes: string;
};

function toStr(v: unknown): string {
    return String(v ?? "").trim();
}

function toNumberOrNull(s: string): number | null {
    const t = String(s ?? "").trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
}

function normalizeBirthDate(v: string): string {
    const s = String(v ?? "").trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return s;
}

function coachModeLabel(mode: CoachMode | null | undefined): string {
    if (!mode) return "—";
    return mode === "NONE" ? "REGULAR" : mode;
}

function buildInitialForm(me: AuthUser | null): FormState {
    return {
        name: toStr(me?.name),
        sex: (me?.sex ?? "") as SexUi,

        heightCm: me?.heightCm == null ? "" : String(me.heightCm),
        currentWeightKg: me?.currentWeightKg == null ? "" : String(me.currentWeightKg),

        unitWeight: (me?.units?.weight ?? "") as WeightUnitUi,
        unitDistance: (me?.units?.distance ?? "") as DistanceUnitUi,

        birthDate: toStr(me?.birthDate),
        activityGoal: (me?.activityGoal ?? "") as ActivityGoalUi,
        timezone: toStr(me?.timezone),

        trainingLevel: (me?.trainingLevel ?? "") as TrainingLevelUi,
        healthNotes: toStr(me?.healthNotes),
    };
}

function isDirty(a: FormState, b: FormState): boolean {
    const keys = Object.keys(a) as (keyof FormState)[];
    for (const k of keys) {
        if (String(a[k] ?? "") !== String(b[k] ?? "")) return true;
    }
    return false;
}

function Label({ text }: { text: string }) {
    const { colors } = useTheme();
    return <Text style={{ color: colors.mutedText, fontWeight: "900", fontSize: 12 }}>{text}</Text>;
}

function Input(props: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    keyboardType?: "default" | "numeric";
    multiline?: boolean;
    numberOfLines?: number;
}) {
    const { colors } = useTheme();

    return (
        <TextInput
            value={props.value}
            onChangeText={props.onChange}
            placeholder={props.placeholder}
            placeholderTextColor={colors.mutedText}
            keyboardType={props.keyboardType ?? "default"}
            multiline={props.multiline}
            numberOfLines={props.numberOfLines}
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: colors.text,
                backgroundColor: colors.surface,
                fontWeight: "700",
                minHeight: props.multiline ? 92 : undefined,
                textAlignVertical: props.multiline ? "top" : "center",
            }}
        />
    );
}

function SelectPill<T extends string>(props: {
    label: string;
    value: T;
    options: { label: string; value: T }[];
    onChange: (v: T) => void;
}) {
    const { colors } = useTheme();

    return (
        <View style={{ gap: 6 }}>
            <Label text={props.label} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {props.options.map((o) => {
                    const active = o.value === props.value;
                    return (
                        <Pressable
                            key={o.value}
                            onPress={() => props.onChange(o.value)}
                            style={{
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: active ? colors.primary : colors.border,
                                backgroundColor: active ? colors.primary : colors.surface,
                                opacity: active ? 1 : 0.95,
                            }}
                        >
                            <Text style={{ fontWeight: "900", color: active ? colors.primaryText : colors.text }}>
                                {o.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

/**
 * Simple calendar modal using date-fns only.
 * Stores YYYY-MM-DD in form.
 */
function BirthDatePicker(props: {
    value: string;
    onChange: (iso: string) => void;
}) {
    const { colors } = useTheme();

    const [open, setOpen] = React.useState(false);

    const selectedDate = React.useMemo(() => {
        const s = String(props.value ?? "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
        const d = new Date(`${s}T00:00:00`);
        return Number.isNaN(d.getTime()) ? null : d;
    }, [props.value]);

    const [cursor, setCursor] = React.useState<Date>(() => {
        return selectedDate ? startOfMonth(selectedDate) : startOfMonth(new Date());
    });

    React.useEffect(() => {
        // if user already has a date and opens modal later, center that month
        if (selectedDate) setCursor(startOfMonth(selectedDate));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate?.getTime()]);

    const monthStart = React.useMemo(() => startOfMonth(cursor), [cursor]);
    const monthEnd = React.useMemo(() => endOfMonth(cursor), [cursor]);

    const gridStart = React.useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
    const gridEnd = React.useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);

    const days = React.useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

    const headerTitle = React.useMemo(() => format(cursor, "MMM yyyy"), [cursor]);

    const displayValue = React.useMemo(() => {
        if (!selectedDate) return "—";
        return format(selectedDate, "MMM d, yyyy");
    }, [selectedDate]);

    function pickDay(d: Date) {
        const iso = format(d, "yyyy-MM-dd");
        props.onChange(iso);
        setOpen(false);
    }

    function clear() {
        props.onChange("");
        setOpen(false);
    }

    return (
        <>
            <View style={{ gap: 6 }}>
                <Label text="Fecha de nacimiento" />
                <Pressable
                    onPress={() => setOpen(true)}
                    style={({ pressed }) => ({
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        backgroundColor: pressed ? colors.background : colors.surface,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                    })}
                >
                    <Text style={{ color: colors.text, fontWeight: "800" }}>{displayValue}</Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "900" }}>📅</Text>
                </Pressable>

                <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                    Se guarda como YYYY-MM-DD. (Ej. 1990-01-31)
                </Text>
            </View>

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable
                    onPress={() => setOpen(false)}
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "center", padding: 16 }}
                >
                    <Pressable
                        onPress={() => undefined}
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 16,
                            backgroundColor: colors.surface,
                            padding: 14,
                            gap: 12,
                        }}
                    >
                        {/* Header */}
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <Pressable
                                onPress={() => setCursor((d) => subMonths(d, 1))}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: pressed ? colors.background : colors.surface,
                                })}
                            >
                                <Text style={{ color: colors.text, fontWeight: "900" }}>←</Text>
                            </Pressable>

                            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>{headerTitle}</Text>

                            <Pressable
                                onPress={() => setCursor((d) => addMonths(d, 1))}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: pressed ? colors.background : colors.surface,
                                })}
                            >
                                <Text style={{ color: colors.text, fontWeight: "900" }}>→</Text>
                            </Pressable>
                        </View>

                        {/* Week labels */}
                        <View style={{ flexDirection: "row" }}>
                            {["L", "M", "X", "J", "V", "S", "D"].map((w) => (
                                <View key={w} style={{ width: "14.2857%", alignItems: "center", paddingVertical: 6 }}>
                                    <Text style={{ color: colors.mutedText, fontWeight: "900", fontSize: 12 }}>{w}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Grid */}
                        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                            {days.map((d) => {
                                const inMonth = isSameMonth(d, cursor);
                                const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;

                                return (
                                    <Pressable
                                        key={format(d, "yyyy-MM-dd")}
                                        onPress={() => pickDay(d)}
                                        style={{
                                            width: "14.2857%",
                                            padding: 4,
                                        }}
                                    >
                                        <View
                                            style={{
                                                height: 40,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: isSelected ? colors.primary : colors.border,
                                                backgroundColor: isSelected ? colors.primary : colors.surface,
                                                opacity: inMonth ? 1 : 0.35,
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontWeight: "900",
                                                    color: isSelected ? colors.primaryText : colors.text,
                                                }}
                                            >
                                                {format(d, "d")}
                                            </Text>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Actions */}
                        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                            <Pressable
                                onPress={clear}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: pressed ? colors.background : colors.surface,
                                    alignItems: "center",
                                })}
                            >
                                <Text style={{ color: colors.text, fontWeight: "900" }}>Quitar</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => setOpen(false)}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: colors.primary,
                                    alignItems: "center",
                                    opacity: pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ color: colors.primaryText, fontWeight: "900" }}>Listo</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

export default function EditProfileScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const { me, loading } = useMe(true);
    const updateMe = useUserStore((s) => s.updateMe);

    const initialRef = React.useRef<FormState | null>(null);
    const [form, setForm] = React.useState<FormState>(() => buildInitialForm(me));

    React.useEffect(() => {
        const init = buildInitialForm(me);
        initialRef.current = init;
        setForm(init);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [me?.id]);

    const init = initialRef.current ?? buildInitialForm(me);
    const dirty = isDirty(form, init);
    const canSave = dirty && !loading && form.name.trim().length >= 2;

    const onReset = () => setForm(init);
    const onCancel = () => router.back();

    const onSave = async () => {
        if (!canSave) return;

        try {
            const hasAnyUnits = form.unitWeight !== "" || form.unitDistance !== "";
            const nextUnits: Units | null =
                hasAnyUnits && form.unitWeight !== "" && form.unitDistance !== ""
                    ? { weight: form.unitWeight, distance: form.unitDistance }
                    : null;

            const payload: UserProfileUpdateRequest = {
                name: form.name.trim(),
                sex: form.sex === "" ? null : form.sex,

                heightCm: toNumberOrNull(form.heightCm),
                currentWeightKg: toNumberOrNull(form.currentWeightKg),

                units: nextUnits,

                birthDate: form.birthDate.trim() ? normalizeBirthDate(form.birthDate) : null,
                activityGoal: form.activityGoal === "" ? null : form.activityGoal,
                timezone: form.timezone.trim() ? form.timezone.trim() : null,

                trainingLevel: form.trainingLevel === "" ? null : form.trainingLevel,
                healthNotes: form.healthNotes.trim() ? form.healthNotes.trim() : null,
            };

            await updateMe(payload);
            Alert.alert("Listo", "Perfil actualizado ✅");
            router.back();
        } catch (e: unknown) {
            const msg = typeof (e as any)?.message === "string" ? (e as any).message : "No se pudo actualizar.";
            Alert.alert("Error", msg);
        }
    };

    const cmLabel = coachModeLabel(me?.coachMode);

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}>
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>Editar perfil</Text>
                <Text style={{ color: colors.mutedText }}>Actualiza tu información personal.</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                    onPress={onCancel}
                    style={({ pressed }) => ({
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: pressed ? colors.background : colors.surface,
                        alignItems: "center",
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ fontWeight: "900", color: colors.text }}>Cancelar</Text>
                </Pressable>

                <Pressable
                    onPress={onSave}
                    disabled={!canSave}
                    style={({ pressed }) => ({
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: canSave ? colors.primary : colors.border,
                        alignItems: "center",
                        opacity: !canSave ? 0.6 : pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ fontWeight: "900", color: canSave ? colors.primaryText : colors.mutedText }}>Guardar</Text>
                </Pressable>
            </View>

            <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 14 }}>
                <View style={{ gap: 6 }}>
                    <Label text="Nombre" />
                    <Input value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} placeholder="Tu nombre" />
                </View>

                <SelectPill<SexUi>
                    label="Sexo"
                    value={form.sex}
                    onChange={(v) => setForm((s) => ({ ...s, sex: v }))}
                    options={[
                        { label: "—", value: "" },
                        { label: "Hombre", value: "male" },
                        { label: "Mujer", value: "female" },
                        { label: "Otro", value: "other" },
                    ]}
                />

                <View style={{ flexDirection: "row", gap: 12 }}>
                    <View style={{ flex: 1, gap: 6 }}>
                        <Label text="Altura (cm)" />
                        <Input value={form.heightCm} onChange={(v) => setForm((s) => ({ ...s, heightCm: v }))} placeholder="Ej. 175" keyboardType="numeric" />
                    </View>

                    <View style={{ flex: 1, gap: 6 }}>
                        <Label text="Peso actual (kg)" />
                        <Input value={form.currentWeightKg} onChange={(v) => setForm((s) => ({ ...s, currentWeightKg: v }))} placeholder="Ej. 78.5" keyboardType="numeric" />
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>Nota: el peso se guarda internamente en kg.</Text>
                    </View>
                </View>

                <SelectPill<WeightUnitUi>
                    label="Unidad preferida (peso)"
                    value={form.unitWeight}
                    onChange={(v) => setForm((s) => ({ ...s, unitWeight: v }))}
                    options={[
                        { label: "—", value: "" },
                        { label: "kg", value: "kg" },
                        { label: "lb", value: "lb" },
                    ]}
                />

                <SelectPill<DistanceUnitUi>
                    label="Unidades: Distancia"
                    value={form.unitDistance}
                    onChange={(v) => setForm((s) => ({ ...s, unitDistance: v }))}
                    options={[
                        { label: "—", value: "" },
                        { label: "km", value: "km" },
                        { label: "mi", value: "mi" },
                    ]}
                />

                <BirthDatePicker
                    value={form.birthDate}
                    onChange={(iso) => setForm((s) => ({ ...s, birthDate: iso }))}
                />

                <SelectPill<ActivityGoalUi>
                    label="Objetivo"
                    value={form.activityGoal}
                    onChange={(v) => setForm((s) => ({ ...s, activityGoal: v }))}
                    options={[
                        { label: "—", value: "" },
                        { label: "fat_loss", value: "fat_loss" },
                        { label: "hypertrophy", value: "hypertrophy" },
                        { label: "strength", value: "strength" },
                        { label: "maintenance", value: "maintenance" },
                        { label: "other", value: "other" },
                    ]}
                />

                <SelectPill<TrainingLevelUi>
                    label="Nivel de entrenamiento"
                    value={form.trainingLevel}
                    onChange={(v) => setForm((s) => ({ ...s, trainingLevel: v }))}
                    options={[
                        { label: "Sin definir", value: "" },
                        { label: "BEGINNER", value: "BEGINNER" },
                        { label: "INTERMEDIATE", value: "INTERMEDIATE" },
                        { label: "ADVANCED", value: "ADVANCED" },
                    ]}
                />

                <View style={{ gap: 6 }}>
                    <Label text="Notas de salud" />
                    <Input value={form.healthNotes} onChange={(v) => setForm((s) => ({ ...s, healthNotes: v }))} placeholder="Opcional" multiline numberOfLines={4} />
                </View>

                <View style={{ gap: 6 }}>
                    <Label text="Modo Coach (solo lectura)" />
                    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.background }}>
                        <Text style={{ fontWeight: "900", color: colors.text }}>{cmLabel}</Text>
                    </View>
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                        onPress={onReset}
                        disabled={!dirty}
                        style={({ pressed }) => ({
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: pressed ? colors.background : colors.surface,
                            alignItems: "center",
                            opacity: !dirty ? 0.6 : pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "900", color: colors.text }}>Restablecer</Text>
                    </Pressable>

                    <Pressable
                        onPress={onSave}
                        disabled={!canSave}
                        style={({ pressed }) => ({
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 12,
                            backgroundColor: canSave ? colors.primary : colors.border,
                            alignItems: "center",
                            opacity: !canSave ? 0.6 : pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "900", color: canSave ? colors.primaryText : colors.mutedText }}>Guardar</Text>
                    </Pressable>
                </View>

                {!dirty ? <Text style={{ color: colors.mutedText, fontSize: 12 }}>No hay cambios para guardar.</Text> : null}
            </View>
        </ScrollView>
    );
}