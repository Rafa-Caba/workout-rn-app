// src/features/dashboard/screens/DashboardScreen.tsx
import React from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

import { useDashboard } from "@/src/hooks/useDashboard";
import { useAuthStore } from "@/src/store/auth.store";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { MediaFeedItem } from "@/src/types/media.types";
import {
    formatIsoToPPP,
    getSafeUserName,
    minutesToHhMm,
    pickTrendPointForWeek,
    secondsToHhMm,
} from "@/src/utils/dashboard/format";

import { AppBrandFooter } from "@/src/features/components/branding/AppBrandFooter";
import { DashboardMediaViewerModal } from "@/src/features/dashboard/components/DashboardMediaViewerModal";

function Card(props: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    colors: ReturnType<typeof useTheme>["colors"];
}) {
    const { colors } = props;

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                padding: 12,
                gap: 8,
                backgroundColor: colors.surface,
            }}
        >
            <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>{props.title}</Text>
                {props.subtitle ? <Text style={{ color: colors.mutedText }}>{props.subtitle}</Text> : null}
            </View>

            {props.children}
        </View>
    );
}

function StatRow(props: { label: string; value: string | number; colors: ReturnType<typeof useTheme>["colors"] }) {
    const { colors } = props;

    return (
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ color: colors.mutedText }}>{props.label}</Text>
            <Text style={{ fontWeight: "800", color: colors.text }}>{props.value}</Text>
        </View>
    );
}

function SectionBox(props: { title: string; children: React.ReactNode; colors: ReturnType<typeof useTheme>["colors"] }) {
    const { colors } = props;

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 10,
                gap: 6,
                backgroundColor: colors.background,
            }}
        >
            <Text style={{ fontWeight: "900", color: colors.text }}>{props.title}</Text>
            {props.children}
        </View>
    );
}

export default function DashboardScreen() {
    const { colors } = useTheme();

    const user = useAuthStore((s) => s.user);
    const name = getSafeUserName(user);

    const [selected, setSelected] = React.useState<MediaFeedItem | null>(null);

    const d = useDashboard();
    const todayLabel = React.useMemo(() => formatIsoToPPP(d.today), [d.today]);

    const rangeTraining = d.rangeSummary.data?.training ?? null;
    const rangeSleep = d.rangeSummary.data?.sleep ?? null;

    const day = d.daySummary.data ?? null;
    const week = d.weekSummary.data ?? null;

    const trendPoint = React.useMemo(
        () => pickTrendPointForWeek(d.weekTrend.data, d.weekKey),
        [d.weekTrend.data, d.weekKey]
    );

    const streaks = d.streaks.data ?? null;
    const media: MediaFeedItem[] = d.media.data?.items ?? [];

    return (
        <>
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 26 }}
            >
                <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
                        Bienvenido, {name}
                    </Text>

                    <Text style={{ color: colors.mutedText, fontSize: 13, marginBottom: 5 }}>
                        Hoy: <Text style={{ fontFamily: "Menlo", color: colors.text }}>{d.today}</Text> · {todayLabel} ·
                        Semana: <Text style={{ fontFamily: "Menlo", color: colors.text }}>{d.weekKey}</Text>
                    </Text>
                </View>

                {d.error ? (
                    <Card title="Error" subtitle="No se pudo cargar el dashboard" colors={colors}>
                        <Text style={{ color: colors.mutedText }}>
                            {(d.error as any)?.message ?? "Intenta de nuevo."}
                        </Text>
                    </Card>
                ) : null}

                {/* Today */}
                <Card title="Hoy" colors={colors}>
                    {!day && d.isLoading ? <Text style={{ color: colors.mutedText }}>Cargando...</Text> : null}
                    {!day && !d.isLoading ? <Text style={{ color: colors.mutedText }}>Sin datos todavía.</Text> : null}

                    {day ? (
                        <View style={{ gap: 10 }}>
                            <Text style={{ color: colors.mutedText }}>
                                Fecha: <Text style={{ fontFamily: "Menlo", color: colors.text }}>{day.date}</Text> ·
                                WeekKey:{" "}
                                <Text style={{ fontFamily: "Menlo", color: colors.text }}>{day.weekKey ?? "—"}</Text>
                            </Text>

                            <SectionBox title="Entrenamiento" colors={colors}>
                                <StatRow colors={colors} label="Sesiones" value={day.training.sessionsCount} />
                                <StatRow colors={colors} label="Duración" value={secondsToHhMm(day.training.durationSeconds)} />
                                <StatRow colors={colors} label="Kcal activas" value={day.training.activeKcal ?? "—"} />
                                <StatRow
                                    colors={colors}
                                    label="HR avg / max"
                                    value={`${day.training.avgHr ?? "—"} / ${day.training.maxHr ?? "—"}`}
                                />
                            </SectionBox>

                            <SectionBox title="Sueño" colors={colors}>
                                {!day.sleep ? (
                                    <Text style={{ color: colors.mutedText }}>Sin datos de sueño.</Text>
                                ) : (
                                    <>
                                        <StatRow
                                            colors={colors}
                                            label="Total"
                                            value={day.sleep.totalMinutes ? minutesToHhMm(day.sleep.totalMinutes) : "—"}
                                        />
                                        <StatRow
                                            colors={colors}
                                            label="Deep / REM (min)"
                                            value={`${day.sleep.deepMinutes ?? "—"} / ${day.sleep.remMinutes ?? "—"}`}
                                        />
                                        <StatRow colors={colors} label="Score" value={day.sleep.score ?? "—"} />
                                    </>
                                )}
                            </SectionBox>
                        </View>
                    ) : null}
                </Card>

                {/* This week */}
                <Card title="Esta semana" colors={colors}>
                    {!week && d.isLoading ? <Text style={{ color: colors.mutedText }}>Cargando...</Text> : null}
                    {!week && !d.isLoading ? <Text style={{ color: colors.mutedText }}>Sin datos todavía.</Text> : null}

                    {week ? (
                        <View style={{ gap: 10 }}>
                            <Text style={{ color: colors.mutedText }}>
                                <Text style={{ fontFamily: "Menlo", color: colors.text }}>{week.weekKey}</Text> ·{" "}
                                {week.range.from} → {week.range.to}
                            </Text>

                            <SectionBox title="Resumen" colors={colors}>
                                <StatRow colors={colors} label="Sesiones" value={week.training.sessionsCount} />
                                <StatRow colors={colors} label="Duración" value={secondsToHhMm(week.training.durationSeconds)} />
                                <StatRow colors={colors} label="Kcal activas" value={week.training.activeKcal ?? "—"} />
                                <StatRow
                                    colors={colors}
                                    label="HR avg / max"
                                    value={`${week.training.avgHr ?? "—"} / ${week.training.maxHr ?? "—"}`}
                                />
                            </SectionBox>

                            <SectionBox title="Tendencia" colors={colors}>
                                {!trendPoint ? (
                                    <Text style={{ color: colors.mutedText }}>Sin trend.</Text>
                                ) : (
                                    <Text style={{ color: colors.mutedText }}>
                                        Días loggeados:{" "}
                                        <Text style={{ fontWeight: "900", color: colors.text }}>{trendPoint.daysCount}</Text> ·
                                        Media:{" "}
                                        <Text style={{ fontWeight: "900", color: colors.text }}>{trendPoint.mediaCount}</Text>
                                    </Text>
                                )}
                            </SectionBox>
                        </View>
                    ) : null}
                </Card>

                {/* Last 7 days */}
                <Card title="Últimos 7 días" subtitle={`${d.range.from} → ${d.range.to}`} colors={colors}>
                    <View style={{ gap: 10 }}>
                        <SectionBox title="Entrenamiento" colors={colors}>
                            <StatRow colors={colors} label="Sesiones" value={rangeTraining?.sessionsCount ?? 0} />
                            <StatRow colors={colors} label="Duración" value={secondsToHhMm(rangeTraining?.durationSeconds ?? 0)} />
                            <StatRow colors={colors} label="Kcal activas" value={rangeTraining?.activeKcal ?? "—"} />
                            <StatRow
                                colors={colors}
                                label="HR avg / max"
                                value={`${rangeTraining?.avgHr ?? "—"} / ${rangeTraining?.maxHr ?? "—"}`}
                            />
                            <StatRow colors={colors} label="Media" value={rangeTraining?.mediaCount ?? 0} />
                        </SectionBox>

                        <SectionBox title="Sueño" colors={colors}>
                            <StatRow colors={colors} label="Días con sueño" value={rangeSleep?.daysWithSleep ?? 0} />
                            <StatRow
                                colors={colors}
                                label="Promedio total"
                                value={rangeSleep?.avgTotalMinutes ? minutesToHhMm(rangeSleep.avgTotalMinutes) : "—"}
                            />
                            <StatRow colors={colors} label="Promedio Deep (min)" value={rangeSleep?.avgDeepMinutes ?? "—"} />
                            <StatRow colors={colors} label="Promedio REM (min)" value={rangeSleep?.avgRemMinutes ?? "—"} />
                            <StatRow colors={colors} label="Promedio score" value={rangeSleep?.avgScore ?? "—"} />
                        </SectionBox>
                    </View>
                </Card>

                {/* Streak */}
                <Card title="Racha" colors={colors}>
                    {!streaks && d.isLoading ? <Text style={{ color: colors.mutedText }}>Cargando...</Text> : null}
                    {!streaks && !d.isLoading ? <Text style={{ color: colors.mutedText }}>Sin datos todavía.</Text> : null}

                    {streaks ? (
                        <View
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 12,
                                padding: 12,
                                gap: 6,
                                backgroundColor: colors.background,
                            }}
                        >
                            <Text style={{ color: colors.mutedText }}>
                                Al día: <Text style={{ fontFamily: "Menlo", color: colors.text }}>{streaks.asOf}</Text>
                            </Text>

                            <Text style={{ fontSize: 36, fontWeight: "900", color: colors.primary }}>
                                {streaks.currentStreakDays}
                            </Text>

                            <Text style={{ color: colors.mutedText }}>días</Text>

                            <Text style={{ color: colors.mutedText }}>
                                Más larga: <Text style={{ fontWeight: "900", color: colors.text }}>{streaks.longestStreakDays}</Text> ·
                                Último día: <Text style={{ fontWeight: "900", color: colors.text }}>{streaks.lastQualifiedDate ?? "—"}</Text>
                            </Text>
                        </View>
                    ) : null}
                </Card>

                {/* Media */}
                <Card title="Media reciente" colors={colors}>
                    {d.isLoading && media.length === 0 ? <Text style={{ color: colors.mutedText }}>Cargando...</Text> : null}
                    {!d.isLoading && media.length === 0 ? <Text style={{ color: colors.mutedText }}>Sin media.</Text> : null}

                    {media.length > 0 ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                            {media.map((m) => {
                                const isImage = m.resourceType === "image";
                                return (
                                    <Pressable
                                        key={`${m.source}:${m.publicId}`}
                                        onPress={() => setSelected(m)}
                                        style={{
                                            width: "48%",
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            borderRadius: 12,
                                            overflow: "hidden",
                                            backgroundColor: colors.background,
                                        }}
                                    >
                                        {isImage ? (
                                            <Image source={{ uri: m.url }} style={{ width: "100%", height: 110 }} resizeMode="cover" />
                                        ) : (
                                            <View style={{ height: 110, alignItems: "center", justifyContent: "center" }}>
                                                <Text style={{ color: colors.mutedText, fontWeight: "900" }}>Video</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    ) : null}
                </Card>

                {/* Mini-brand footer (Dashboard only) */}
                <AppBrandFooter />
            </ScrollView>

            <DashboardMediaViewerModal visible={!!selected} item={selected} onClose={() => setSelected(null)} />
        </>
    );
}