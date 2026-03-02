// src/features/sleep/screens/SleepScreen.tsx
import React from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import { isValid, parse } from "date-fns";

import { useUpdateSleep } from "@/src/hooks/useUpdateSleep";
import { useWorkoutDay } from "@/src/hooks/workout/useWorkoutDay";
import type { SleepBlock } from "@/src/types/workoutDay.types";

import { DeviceSelectRN } from "../../components/DeviceSelectRN";
import { DatePickerField } from "../components/DatePickerField";
import { SleepEmptyState } from "../components/SleepEmptyState";
import { SleepMetricsRow } from "../components/SleepMetricsRow";
import { normalizeSleepDraft, toSleepDraft, type SleepDraft } from "../components/sleepDraft";

function safeText(v: unknown): string {
    const s = String(v ?? "").trim();
    return s.length ? s : "—";
}

function isISODate(s: string): boolean {
    const parsed = parse(s.trim(), "yyyy-MM-dd", new Date());
    return isValid(parsed);
}

function todayISO(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export default function SleepScreen() {
    const { colors } = useTheme();

    const [date, setDate] = React.useState<string>(todayISO());

    const dayQ = useWorkoutDay(date, isISODate(date));
    const updateSleepM = useUpdateSleep();

    const day = dayQ.data ?? null;
    const sleep = day?.sleep ?? null;

    const [draft, setDraft] = React.useState<SleepDraft>(() => toSleepDraft(null));

    /**
     * Fix:
     * - We must not "hydrate only once per date" because sleep may arrive AFTER initial render.
     * - Instead hydrate when (date,sleep) changes ONLY if user hasn't edited fields (isDirty=false).
     */
    const [isDirty, setIsDirty] = React.useState(false);

    const patchDraft = React.useCallback((patch: Partial<SleepDraft>) => {
        setIsDirty(true);
        setDraft((s) => ({ ...s, ...patch }));
    }, []);

    // When date changes, allow hydration again and clear dirty
    React.useEffect(() => {
        setIsDirty(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    // Hydrate from backend sleep once it is available (or null), only if not dirty
    React.useEffect(() => {
        if (!isISODate(date)) return;
        if (isDirty) return;

        setDraft(toSleepDraft(sleep));
    }, [date, sleep, isDirty]);

    const loading = dayQ.isLoading || dayQ.isFetching;
    const error = dayQ.error ? safeText((dayQ.error as unknown as { message?: string })?.message) : "";

    const onRefresh = async () => {
        await dayQ.refetch();
    };

    const onSave = async () => {
        if (!isISODate(date)) {
            Alert.alert("Fecha inválida", "Usa el formato YYYY-MM-DD.");
            return;
        }

        const normalized = normalizeSleepDraft(draft);

        try {
            await updateSleepM.mutateAsync({ date, sleep: normalized });
            setIsDirty(false);
            Alert.alert("Listo", "Sueño guardado.");
        } catch (e: unknown) {
            Alert.alert("Error", safeText(e));
        }
    };

    const onDeleteSleep = () => {
        if (!isISODate(date)) return;

        Alert.alert(
            "Borrar sueño",
            "Esto borrará el bloque de sueño de este día.\n\n¿Continuar?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Borrar sueño",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await updateSleepM.mutateAsync({ date, sleep: null });
                            setDraft(toSleepDraft(null));
                            setIsDirty(false);
                        } catch (e: unknown) {
                            Alert.alert("Error", safeText(e));
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    // derived preview metrics
    const derived: SleepBlock | null = normalizeSleepDraft(draft);

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
            keyboardShouldPersistTaps="handled"
        >
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Sueño</Text>
                    <Text style={{ color: colors.mutedText }}>Registra y edita métricas de sueño por día.</Text>
                </View>
            </View>

            {/* Top bar: Date + metrics preview + delete */}
            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 12,
                    gap: 10,
                }}
            >
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
                    <View style={{ flex: 1, gap: 6 }}>
                        <DatePickerField
                            value={date}
                            onChange={(next) => setDate(next)}
                            disabled={updateSleepM.isPending}
                        />
                    </View>

                    <Pressable
                        onPress={onDeleteSleep}
                        disabled={updateSleepM.isPending}
                        style={({ pressed }) => ({
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ color: colors.text, fontWeight: "800" }}>Borrar sueño</Text>
                    </Pressable>
                </View>

                <SleepMetricsRow sleep={derived} />
            </View>

            {/* Error */}
            {error ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        padding: 12,
                        gap: 8,
                    }}
                >
                    <Text style={{ fontWeight: "800", color: colors.text }}>Error</Text>
                    <Text style={{ color: colors.mutedText }}>{error}</Text>
                </View>
            ) : null}

            {/* Loading empty */}
            {loading && !day ? (
                <View style={{ paddingVertical: 18, alignItems: "center", gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText }}>Cargando día...</Text>
                </View>
            ) : null}

            {/* Empty state */}
            {!loading && !sleep ? <SleepEmptyState /> : null}

            {/* Form */}
            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 12,
                    gap: 10,
                }}
            >
                <View style={{ flexDirection: "row", gap: 10 }}>
                    <Field
                        label="Minutos dormido"
                        placeholder="e.g. 420"
                        hint="Ej: 420 (7h)."
                        value={draft.timeAsleepMinutes}
                        onChange={(v) => patchDraft({ timeAsleepMinutes: v })}
                    />
                    <Field
                        label="Minutos en cama"
                        placeholder="e.g. 480"
                        hint="Ejemplo: 480 (8h)"
                        value={draft.timeInBedMinutes}
                        onChange={(v) => patchDraft({ timeInBedMinutes: v })}
                    />
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                    <Field
                        label="Score"
                        placeholder="0–100"
                        hint="0–100. Vacío si no aplica."
                        value={draft.score}
                        onChange={(v) => patchDraft({ score: v })}
                    />
                    <Field
                        label="Awake (min)"
                        placeholder="e.g. 12"
                        hint={null}
                        value={draft.awakeMinutes}
                        onChange={(v) => patchDraft({ awakeMinutes: v })}
                    />
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                    <Field
                        label="REM (min)"
                        placeholder="e.g. 120"
                        hint={null}
                        value={draft.remMinutes}
                        onChange={(v) => patchDraft({ remMinutes: v })}
                    />
                    <Field
                        label="Core (min)"
                        placeholder="e.g. 260"
                        hint={null}
                        value={draft.coreMinutes}
                        onChange={(v) => patchDraft({ coreMinutes: v })}
                    />
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ width: "49%" }}>
                        <Field
                            label="Deep (min)"
                            placeholder="e.g. 45"
                            hint={null}
                            value={draft.deepMinutes}
                            onChange={(v) => patchDraft({ deepMinutes: v })}
                        />
                    </View>

                    <View style={{ width: "50%" }}>
                        <DeviceSelectRN
                            value={draft.source}
                            onChange={(next) => patchDraft({ source: next })}
                            disabled={updateSleepM.isPending}
                        />
                    </View>
                </View>

                {/* Save */}
                <View style={{ gap: 10, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <Pressable
                        onPress={onSave}
                        disabled={updateSleepM.isPending}
                        style={({ pressed }) => ({
                            width: 150,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 12,
                            backgroundColor: colors.primary,
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ color: colors.primaryText, fontWeight: "800", textAlign: "center" }}>
                            {updateSleepM.isPending ? "Guardando..." : sleep ? "Actualizar" : "Guardar"}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </ScrollView>
    );
}

function Field(props: {
    label: string;
    placeholder: string;
    hint: string | null;
    value: string;
    onChange: (v: string) => void;
}) {
    const { colors } = useTheme();

    return (
        <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.mutedText }}>{props.label}</Text>
            <TextInput
                value={props.value}
                onChangeText={props.onChange}
                placeholder={props.placeholder}
                placeholderTextColor={colors.mutedText}
                keyboardType="number-pad"
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
            {props.hint ? (
                <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "600" }}>{props.hint}</Text>
            ) : null}
        </View>
    );
}