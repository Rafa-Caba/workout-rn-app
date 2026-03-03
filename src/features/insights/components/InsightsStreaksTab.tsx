// src/features/insights/components/InsightsStreaksTab.tsx
import { format } from "date-fns";
import React from "react";
import { ActivityIndicator, DimensionValue, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { DatePickerField } from "@/src/features/components/DatePickerField";
import { useStreaks } from "@/src/hooks/summary/useStreaks";
import type { StreaksMode, StreaksResponse } from "@/src/services/workout/insights.service";
import { useTheme } from "@/src/theme/ThemeProvider";

function todayIsoLocal(): string {
    return format(new Date(), "yyyy-MM-dd");
}

type Props = {
    defaultAsOf?: string;
};

type ModeOption = { value: StreaksMode; label: string };

const MODES: ModeOption[] = [
    { value: "both", label: "Ambos" },
    { value: "training", label: "Entreno" },
    { value: "sleep", label: "Sueño" },
];

export function InsightsStreaksTab({ defaultAsOf }: Props) {
    const { colors } = useTheme();

    const [mode, setMode] = React.useState<StreaksMode>("both");
    const [gapDaysText, setGapDaysText] = React.useState<string>("0");
    const [asOf, setAsOf] = React.useState<string>(() => defaultAsOf ?? todayIsoLocal());

    const gapDays = React.useMemo(() => {
        const n = Number(gapDaysText);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.floor(n));
    }, [gapDaysText]);

    const enabled = true;

    const { data, isLoading, isFetching, isError, refetch } = useStreaks({ mode, gapDays, asOf }, enabled);

    return (
        <View style={{ gap: 12 }}>
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "800", color: colors.text }}>Rachas</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Rachas de entrenamiento/sueño.
                </Text>

                <View style={{ height: 10 }} />

                <View style={styles.controlsRow}>
                    <View style={{ flex: 1, gap: 8 }}>
                        <Text style={[styles.label, { color: colors.mutedText }]}>Modo</Text>
                        <View style={[styles.modeWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                            {MODES.map((m) => {
                                const active = m.value === mode;
                                return (
                                    <Pressable
                                        key={m.value}
                                        onPress={() => setMode(m.value)}
                                        style={({ pressed }) => [
                                            styles.modeTab,
                                            {
                                                backgroundColor: active ? colors.primary : "transparent",
                                                opacity: pressed ? 0.92 : 1,
                                            },
                                        ]}
                                    >
                                        <Text style={{ fontWeight: "800", color: active ? "#fff" : colors.text, fontSize: 13 }}>
                                            {m.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    <View style={{ width: 110, gap: 8 }}>
                        <Text style={[styles.label, { color: colors.mutedText }]}>Días de margen</Text>
                        <TextInput
                            value={gapDaysText}
                            onChangeText={(t) => {
                                // Allow empty while editing
                                if (t === "") return setGapDaysText("");
                                // Keep only digits
                                const cleaned = t.replace(/[^\d]/g, "");
                                setGapDaysText(cleaned);
                            }}
                            keyboardType="number-pad"
                            placeholder="0"
                            placeholderTextColor={colors.mutedText}
                            style={[
                                styles.input,
                                {
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    color: colors.text,
                                },
                            ]}
                        />
                        <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                            Cuántos días puedes faltar sin romper la racha.
                        </Text>
                    </View>
                </View>

                <View style={{ height: 10 }} />

                <DatePickerField label="Rachas Hasta" value={asOf} onChange={setAsOf} displayFormat="MM/dd/yyyy" />

                <View style={{ height: 10 }} />

                {/* <View style={styles.actionsRow}>
                    <Pressable
                        onPress={() => refetch()}
                        style={({ pressed }) => ({
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>Recargar</Text>
                    </Pressable>

                    {isFetching ? <Text style={{ color: colors.mutedText, fontWeight: "800" }}>sync</Text> : null}
                </View> */}
            </View>

            {isLoading ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Cargando rachas...</Text>
                </View>
            ) : isError ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>No se pudieron cargar las rachas.</Text>
                </View>
            ) : data ? (
                <StreaksResults data={data} />
            ) : null}
        </View>
    );

    function StreaksResults({ data }: { data: StreaksResponse }) {
        return (
            <View style={styles.kpisRow}>
                <Kpi title="Racha actual" value={data.currentStreakDays || "—"} width="30%" />
                <Kpi title="Mejor racha" value={data.longestStreakDays || "—"} width="29%" />
                <Kpi title="Último día válido" value={data.lastQualifiedDate ?? "—"} width="36%" />
            </View>
        );
    }

    function Kpi({ title, value, width }: { title: string; value: string | number, width: DimensionValue | undefined }) {
        return (
            <View style={[styles.kpiCard, { borderColor: colors.border, backgroundColor: colors.surface, minWidth: width, }]}>
                <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>{title}</Text>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>{String(value)}</Text>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 4 },

    label: { fontSize: 12, fontWeight: "800" },

    controlsRow: {
        flexDirection: "column",
        gap: 12,
        alignItems: "flex-start",
        flexWrap: "wrap",
    },

    modeWrap: {
        flexDirection: "row",
        width: '100%',
        borderWidth: 1,
        borderRadius: 16,
        padding: 4,
        gap: 6,
    },
    modeTab: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 14,
        minWidth: 90,
    },

    input: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontWeight: "800",
        fontSize: 14,
    },

    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
    },

    kpisRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    kpiCard: {
        flex: 1,
        minWidth: "30%",
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 6,
    },

    center: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
    },
});