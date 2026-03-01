// src/features/auth/screens/EditProfileScreen.tsx
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isAfter,
    isSameDay,
    isSameMonth,
    isValid,
    parseISO,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subMonths,
} from "date-fns";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { useMe } from "@/src/hooks/auth/useMe";
import { useSettings } from "@/src/hooks/auth/useSettings";
import { useUserStore } from "@/src/store/user.store";
import { useTheme } from "@/src/theme/ThemeProvider";

import type { AuthUser, CoachMode, Sex, TrainingLevel, Units } from "@/src/types/auth.types";
import type { UserSettingsUpdateRequest, WeekStartsOn } from "@/src/types/settings.types";
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

    /**
     * UI weight input (display unit depends on unitWeight)
     * - if unitWeight === "kg": display kg
     * - if unitWeight === "lb": display lb
     * Always saved to API as currentWeightKg (kg).
     */
    weightDisplay: string;

    unitWeight: WeightUnitUi;
    unitDistance: DistanceUnitUi;

    birthDate: string; // YYYY-MM-DD
    activityGoal: ActivityGoalUi;
    timezone: string;

    trainingLevel: TrainingLevelUi;
    healthNotes: string;
};

type PrefState = {
    weekStartsOn: WeekStartsOn;
    defaultRpe: number | null;
};

function getErrorMessage(e: unknown, fallback: string): string {
    if (e instanceof Error && e.message.trim()) return e.message.trim();
    if (typeof e === "object" && e) {
        const maybe = e as { message?: unknown };
        if (typeof maybe.message === "string" && maybe.message.trim()) return maybe.message.trim();
    }
    return fallback;
}

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

function parseBirthDateIso(iso: string): Date | null {
    const s = String(iso ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = parseISO(s);
    return isValid(d) ? d : null;
}

function isBirthDateInFuture(iso: string): boolean {
    const d = parseBirthDateIso(iso);
    if (!d) return false;
    return isAfter(startOfDay(d), startOfDay(new Date()));
}

function coachModeLabel(mode: CoachMode | null | undefined): string {
    if (!mode) return "—";
    return mode === "NONE" ? "REGULAR" : mode;
}

function kgToLb(kg: number): number {
    return kg * 2.2046226218;
}

function lbToKg(lb: number): number {
    return lb / 2.2046226218;
}

function format1(n: number): string {
    return n.toFixed(1);
}

function buildInitialForm(me: AuthUser | null): FormState {
    const unitWeight = (me?.units?.weight ?? "") as WeightUnitUi;
    const unitDistance = (me?.units?.distance ?? "") as DistanceUnitUi;

    const weightKg = typeof me?.currentWeightKg === "number" && Number.isFinite(me.currentWeightKg) ? me.currentWeightKg : null;

    const weightDisplay =
        weightKg == null
            ? ""
            : unitWeight === "lb"
                ? format1(kgToLb(weightKg))
                : format1(weightKg);

    return {
        name: toStr(me?.name),
        sex: (me?.sex ?? "") as SexUi,

        heightCm: me?.heightCm == null ? "" : String(me.heightCm),

        weightDisplay,

        unitWeight,
        unitDistance,

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

function isPrefsDirty(a: PrefState, b: PrefState): boolean {
    if (a.weekStartsOn !== b.weekStartsOn) return true;
    if ((a.defaultRpe ?? null) !== (b.defaultRpe ?? null)) return true;
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

function OptionRow(props: { label: string; value: string; onPress: () => void; disabled?: boolean }) {
    const { colors } = useTheme();
    return (
        <Pressable
            onPress={props.onPress}
            disabled={props.disabled}
            style={({ pressed }) => ({
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.background : colors.surface,
                opacity: props.disabled ? 0.6 : pressed ? 0.92 : 1,
            })}
        >
            <Text style={{ color: colors.mutedText, fontWeight: "700" }}>{props.label}</Text>
            <Text style={{ color: colors.text, fontWeight: "800" }}>{props.value}</Text>
        </Pressable>
    );
}

function ModalShell(props: {
    visible: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const { colors } = useTheme();

    return (
        <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", padding: 16, justifyContent: "center" }}>
                <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, padding: 14, gap: 12, maxHeight: "80%" }}>
                    <View style={{ gap: 2 }}>
                        <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>{props.title}</Text>
                        {props.subtitle ? <Text style={{ color: colors.mutedText }}>{props.subtitle}</Text> : null}
                    </View>

                    <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 4 }} showsVerticalScrollIndicator={false}>
                        {props.children}
                    </ScrollView>

                    <Pressable
                        onPress={props.onClose}
                        style={({ pressed }) => ({
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: pressed ? colors.background : colors.surface,
                            alignItems: "center",
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "900", color: colors.text }}>Cerrar</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

/**
 * Simple calendar modal using date-fns only.
 * Stores YYYY-MM-DD in form.
 */
function BirthDatePicker(props: {
    value: string;
    onChange: (iso: string) => void;
    error?: string | null;
}) {
    const { colors } = useTheme();

    const [open, setOpen] = React.useState(false);

    const selectedDate = React.useMemo(() => parseBirthDateIso(props.value), [props.value]);

    const [cursor, setCursor] = React.useState<Date>(() => {
        return selectedDate ? startOfMonth(selectedDate) : startOfMonth(new Date());
    });

    React.useEffect(() => {
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
                        borderColor: props.error ? "#EF4444" : colors.border,
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

                {props.error ? (
                    <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "800" }}>{props.error}</Text>
                ) : (
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>Se guarda como YYYY-MM-DD. (Ej. 1990-01-31)</Text>
                )}
            </View>

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "center", padding: 16 }}>
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

                        <View style={{ flexDirection: "row" }}>
                            {["L", "M", "X", "J", "V", "S", "D"].map((w) => (
                                <View key={w} style={{ width: "14.2857%", alignItems: "center", paddingVertical: 6 }}>
                                    <Text style={{ color: colors.mutedText, fontWeight: "900", fontSize: 12 }}>{w}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                            {days.map((d) => {
                                const inMonth = isSameMonth(d, cursor);
                                const isSelected = selectedDate ? isSameDay(d, selectedDate) : false;
                                const disabledFuture = isAfter(startOfDay(d), startOfDay(new Date()));

                                return (
                                    <Pressable
                                        key={format(d, "yyyy-MM-dd")}
                                        onPress={() => (disabledFuture ? undefined : pickDay(d))}
                                        style={{ width: "14.2857%", padding: 4, opacity: disabledFuture ? 0.4 : 1 }}
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
                                            <Text style={{ fontWeight: "900", color: isSelected ? colors.primaryText : colors.text }}>{format(d, "d")}</Text>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>

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

function weekStartsOnLabel(v: WeekStartsOn): string {
    return v === 1 ? "Lunes" : "Domingo";
}

function rpeLabel(v: number | null): string {
    return v == null ? "—" : String(v);
}

export default function EditProfileScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const { me, loading } = useMe(true);
    const updateMe = useUserStore((s) => s.updateMe);

    const { settings, loading: settingsLoading, error: settingsError, update: updateSettings } = useSettings(true);

    const initialRef = React.useRef<FormState | null>(null);
    const prefsInitialRef = React.useRef<PrefState | null>(null);

    const [form, setForm] = React.useState<FormState>(() => buildInitialForm(me));

    const [prefs, setPrefs] = React.useState<PrefState>(() => ({
        weekStartsOn: settings.weekStartsOn,
        defaultRpe: settings.defaults?.defaultRpe ?? null,
    }));

    const [weekModalOpen, setWeekModalOpen] = React.useState(false);
    const [rpeModalOpen, setRpeModalOpen] = React.useState(false);

    // Keep a stable internal kg value (regardless of UI unit)
    const weightKgRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        const init = buildInitialForm(me);
        initialRef.current = init;
        setForm(init);

        const kg = typeof me?.currentWeightKg === "number" && Number.isFinite(me.currentWeightKg) ? me.currentWeightKg : null;
        weightKgRef.current = kg;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [me?.id]);

    React.useEffect(() => {
        const next: PrefState = {
            weekStartsOn: settings.weekStartsOn,
            defaultRpe: settings.defaults?.defaultRpe ?? null,
        };
        prefsInitialRef.current = next;
        setPrefs(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.weekStartsOn, settings.defaults?.defaultRpe]);

    // Whenever user edits weightDisplay, update internal kg ref (best-effort)
    React.useEffect(() => {
        const n = toNumberOrNull(form.weightDisplay);
        if (n == null) {
            weightKgRef.current = null;
            return;
        }
        weightKgRef.current = form.unitWeight === "lb" ? lbToKg(n) : n;
    }, [form.weightDisplay, form.unitWeight]);

    const init = initialRef.current ?? buildInitialForm(me);
    const dirtyProfile = isDirty(form, init);

    const prefsInit = prefsInitialRef.current ?? { weekStartsOn: settings.weekStartsOn, defaultRpe: settings.defaults?.defaultRpe ?? null };
    const dirtyPrefs = isPrefsDirty(prefs, prefsInit);

    const birthDateError = React.useMemo(() => {
        const s = String(form.birthDate ?? "").trim();
        if (!s) return null;
        if (isBirthDateInFuture(s)) return "La fecha no puede ser en el futuro.";
        return null;
    }, [form.birthDate]);

    const canSave = (dirtyProfile || dirtyPrefs) && !loading && !settingsLoading && form.name.trim().length >= 2 && !birthDateError;

    const onReset = () => {
        setForm(init);

        const kg = typeof me?.currentWeightKg === "number" && Number.isFinite(me.currentWeightKg) ? me.currentWeightKg : null;
        weightKgRef.current = kg;

        setPrefs(prefsInit);
    };

    const onCancel = () => router.back();

    function onChangeWeightUnit(next: WeightUnitUi) {
        setForm((s) => {
            const currentNum = toNumberOrNull(s.weightDisplay);
            if (currentNum == null) return { ...s, unitWeight: next };

            const currentKg = s.unitWeight === "lb" ? lbToKg(currentNum) : currentNum;
            const nextDisplay = next === "lb" ? format1(kgToLb(currentKg)) : format1(currentKg);

            return { ...s, unitWeight: next, weightDisplay: nextDisplay };
        });
    }

    const onSave = async () => {
        if (!canSave) return;

        const errors: string[] = [];

        // 1) Profile payload
        if (dirtyProfile) {
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
                    currentWeightKg: weightKgRef.current,

                    units: nextUnits,

                    birthDate: form.birthDate.trim() ? normalizeBirthDate(form.birthDate) : null,
                    activityGoal: form.activityGoal === "" ? null : form.activityGoal,
                    timezone: form.timezone.trim() ? form.timezone.trim() : null,

                    trainingLevel: form.trainingLevel === "" ? null : form.trainingLevel,
                    healthNotes: form.healthNotes.trim() ? form.healthNotes.trim() : null,
                };

                await updateMe(payload);
            } catch (e: unknown) {
                errors.push(getErrorMessage(e, "No se pudo actualizar el perfil."));
            }
        }

        // 2) Settings payload
        if (dirtyPrefs) {
            try {
                const payload: UserSettingsUpdateRequest = {
                    weekStartsOn: prefs.weekStartsOn,
                    defaults: { defaultRpe: prefs.defaultRpe },
                };
                await updateSettings(payload);
            } catch (e: unknown) {
                errors.push(getErrorMessage(e, "No se pudieron guardar las preferencias de la app."));
            }
        }

        if (errors.length) {
            Alert.alert("Guardado parcial", errors.join("\n"));
            return;
        }

        Alert.alert("Listo", "Cambios guardados ✅");
        router.back();
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

            {/* PERFIL */}
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
                        <Label text={`Peso actual (${form.unitWeight === "lb" ? "lb" : "kg"})`} />
                        <Input
                            value={form.weightDisplay}
                            onChange={(v) => setForm((s) => ({ ...s, weightDisplay: v }))}
                            placeholder={form.unitWeight === "lb" ? "Ej. 173.1" : "Ej. 78.5"}
                            keyboardType="numeric"
                        />
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>Se guarda internamente en kg.</Text>
                    </View>
                </View>

                <SelectPill<WeightUnitUi>
                    label="Unidad preferida (peso)"
                    value={form.unitWeight}
                    onChange={onChangeWeightUnit}
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

                <BirthDatePicker value={form.birthDate} onChange={(iso) => setForm((s) => ({ ...s, birthDate: iso }))} error={birthDateError} />

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
            </View>

            {/* APLICACIÓN (Preferencias) */}
            <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 12 }}>
                <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Aplicación</Text>
                    <Text style={{ color: colors.mutedText }}>Preferencias de comportamiento y visualización.</Text>
                </View>

                <OptionRow
                    label="Semana inicia en"
                    value={weekStartsOnLabel(prefs.weekStartsOn)}
                    onPress={() => setWeekModalOpen(true)}
                    disabled={settingsLoading}
                />

                <OptionRow
                    label="RPE por defecto"
                    value={rpeLabel(prefs.defaultRpe)}
                    onPress={() => setRpeModalOpen(true)}
                    disabled={settingsLoading}
                />

                {settingsError ? <Text style={{ color: colors.mutedText, fontSize: 12 }}>{String(settingsError)}</Text> : null}

                {settingsLoading ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ActivityIndicator size="small" />
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>Cargando settings...</Text>
                    </View>
                ) : null}
            </View>

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                    onPress={onReset}
                    disabled={!(dirtyProfile || dirtyPrefs)}
                    style={({ pressed }) => ({
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: pressed ? colors.background : colors.surface,
                        alignItems: "center",
                        opacity: !(dirtyProfile || dirtyPrefs) ? 0.6 : pressed ? 0.92 : 1,
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

            {/* Week modal */}
            <ModalShell
                visible={weekModalOpen}
                title="Semana inicia en"
                subtitle="Afecta semanas, calendarios y navegación por semana."
                onClose={() => setWeekModalOpen(false)}
            >
                <Pressable
                    onPress={() => {
                        setPrefs((s) => ({ ...s, weekStartsOn: 1 }));
                        setWeekModalOpen(false);
                    }}
                    style={({ pressed }) => ({
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: pressed ? colors.background : colors.surface,
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ color: colors.text, fontWeight: "900" }}>Lunes</Text>
                    <Text style={{ color: colors.mutedText }}>Por defecto.</Text>
                </Pressable>

                <Pressable
                    onPress={() => {
                        setPrefs((s) => ({ ...s, weekStartsOn: 0 }));
                        setWeekModalOpen(false);
                    }}
                    style={({ pressed }) => ({
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: pressed ? colors.background : colors.surface,
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ color: colors.text, fontWeight: "900" }}>Domingo</Text>
                    <Text style={{ color: colors.mutedText }}>Alternativa.</Text>
                </Pressable>
            </ModalShell>

            {/* RPE modal */}
            <ModalShell
                visible={rpeModalOpen}
                title="RPE por defecto"
                subtitle="Se usará como valor inicial al registrar sesiones (si aplica)."
                onClose={() => setRpeModalOpen(false)}
            >
                <Pressable
                    onPress={() => {
                        setPrefs((s) => ({ ...s, defaultRpe: null }));
                        setRpeModalOpen(false);
                    }}
                    style={({ pressed }) => ({
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: pressed ? colors.background : colors.surface,
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ color: colors.text, fontWeight: "900" }}>—</Text>
                    <Text style={{ color: colors.mutedText }}>Sin valor por defecto.</Text>
                </Pressable>

                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <Pressable
                        key={n}
                        onPress={() => {
                            setPrefs((s) => ({ ...s, defaultRpe: n }));
                            setRpeModalOpen(false);
                        }}
                        style={({ pressed }) => ({
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: pressed ? colors.background : colors.surface,
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ color: colors.text, fontWeight: "900" }}>{n}</Text>
                    </Pressable>
                ))}
            </ModalShell>
        </ScrollView>
    );
}