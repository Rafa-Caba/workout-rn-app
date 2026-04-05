// /src/features/health/outdoor/screens/OutdoorSessionDetailsScreen.tsx

import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import OutdoorEmptyState from "@/src/features/health/outdoor/components/OutdoorEmptyState";
import OutdoorRouteMap from "@/src/features/health/outdoor/components/OutdoorRouteMap";
import OutdoorRoutePreview from "@/src/features/health/outdoor/components/OutdoorRoutePreview";
import OutdoorSessionBadge from "@/src/features/health/outdoor/components/OutdoorSessionBadge";
import OutdoorSessionMediaSection from "@/src/features/health/outdoor/components/OutdoorSessionMediaSection";
import OutdoorSessionMetrics from "@/src/features/health/outdoor/components/OutdoorSessionMetrics";
import { useOutdoorSessionDetails } from "@/src/hooks/health/outdoor/useOutdoorSessionDetails";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { ISODate, WorkoutSession } from "@/src/types/workoutDay.types";
import { formatFlexibleDateLabel } from "@/src/utils/dates/dateDisplay";
import { buildOutdoorSessionTitleFromWorkoutSession } from "@/src/utils/health/outdoor/outdoorSession.helpers";

type Props = {
    date: ISODate;
    sessionId: string;
};

function MetaRow(props: { label: string; value: string }) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
            }}
        >
            <Text style={{ color: colors.mutedText, flex: 1 }}>{props.label}</Text>
            <Text
                style={{
                    color: colors.text,
                    fontWeight: "700",
                    flex: 1,
                    textAlign: "right",
                }}
            >
                {props.value}
            </Text>
        </View>
    );
}

function formatDateTime(value: string | null | undefined): string {
    if (!value) {
        return "—";
    }

    const dateValue = new Date(value);
    if (!Number.isFinite(dateValue.getTime())) {
        return "—";
    }

    return dateValue.toLocaleString();
}

function formatSourceLabel(value: string | null | undefined): string {
    if (value === "healthkit") return "HealthKit";
    if (value === "health-connect") return "Health Connect";
    if (value === "manual") return "Manual";
    return "—";
}

function formatSessionKindLabel(value: string | null | undefined): string {
    if (value === "device-import") return "Importada del dispositivo";
    if (value === "manual-outdoor") return "Manual outdoor";
    if (value === "gym-check") return "Gym Check";
    return "—";
}

function formatImportMetaDate(
    source: string | null | undefined,
    value: string | null | undefined
): string {
    if (source === "manual" && !value) {
        return "No aplica";
    }

    return formatDateTime(value);
}

function isManualOutdoorEditable(session: WorkoutSession | null): boolean {
    if (!session) {
        return false;
    }

    return (
        session.meta?.source === "manual" &&
        session.meta?.sessionKind === "manual-outdoor" &&
        (session.activityType === "walking" || session.activityType === "running")
    );
}

export function OutdoorSessionDetailsScreen({ date, sessionId }: Props) {
    const { colors } = useTheme();
    const router = useRouter();

    const details = useOutdoorSessionDetails({
        date,
        sessionId,
        includeRoutes: true,
        autoLoad: true,
    });

    if (details.loading && !details.session) {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    padding: 16,
                    justifyContent: "center",
                }}
            >
                <Text style={{ color: colors.mutedText }}>Cargando detalle outdoor…</Text>
            </View>
        );
    }

    if (details.notFound || !details.session) {
        return (
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
            >
                <OutdoorEmptyState
                    title="No se encontró la sesión outdoor"
                    description="Intentamos resolver la sesión desde el día y desde Health, pero todavía no estuvo disponible."
                    onRetry={() => {
                        void details.refresh();
                    }}
                    retryLabel="Reintentar detalle"
                />
            </ScrollView>
        );
    }

    const session = details.session;
    const source = session.meta?.source ?? null;
    const canEditManualSession = isManualOutdoorEditable(session);

    function openEditManualSession() {
        router.push({
            pathname: "/(app)/calendar/outdoor/edit/[date]/[sessionId]",
            params: {
                date,
                sessionId,
            },
        });
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        >
            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 16,
                    padding: 16,
                    backgroundColor: colors.surface,
                    gap: 10,
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                    }}
                >
                    {session.activityType ? (
                        <OutdoorSessionBadge activityType={session.activityType} />
                    ) : (
                        <View />
                    )}

                    {canEditManualSession ? (
                        <Pressable
                            onPress={openEditManualSession}
                            style={({ pressed }) => ({
                                borderWidth: 1,
                                borderColor: colors.primary,
                                borderRadius: 12,
                                paddingHorizontal: 14,
                                paddingVertical: 7,
                                backgroundColor: colors.primary,
                                opacity: pressed ? 0.9 : 1,
                            })}
                        >
                            <Text
                                style={{
                                    color: colors.primaryText,
                                    fontWeight: "800",
                                }}
                            >
                                Editar
                            </Text>
                        </Pressable>
                    ) : null}
                </View>

                <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
                    {buildOutdoorSessionTitleFromWorkoutSession(session)}
                </Text>

                <Text style={{ color: colors.mutedText }}>
                    Fecha: {formatFlexibleDateLabel(date, "es")}
                </Text>
            </View>

            <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>
                    Métricas
                </Text>
                <OutdoorSessionMetrics session={session} />
            </View>

            <OutdoorRouteMap
                hasRoute={session.hasRoute}
                routeSummary={session.routeSummary}
            />

            <OutdoorRoutePreview
                hasRoute={session.hasRoute}
                routeSummary={session.routeSummary}
            />

            <OutdoorSessionMediaSection
                date={date}
                session={session}
                onRefresh={details.refresh}
            />

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 16,
                    padding: 16,
                    backgroundColor: colors.surface,
                    gap: 12,
                }}
            >
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                    Metadata de sesión
                </Text>

                <MetaRow label="Fuente" value={formatSourceLabel(source)} />
                <MetaRow
                    label="Tipo de sesión"
                    value={formatSessionKindLabel(session.meta?.sessionKind ?? null)}
                />
                <MetaRow label="Dispositivo" value={session.meta?.sourceDevice ?? "—"} />
                <MetaRow label="External ID" value={session.meta?.externalId ?? "—"} />
                <MetaRow label="Tipo original" value={session.meta?.originalType ?? "—"} />
                <MetaRow
                    label="Importado"
                    value={formatImportMetaDate(source, session.meta?.importedAt ?? null)}
                />
                <MetaRow
                    label="Último sync"
                    value={formatImportMetaDate(source, session.meta?.lastSyncedAt ?? null)}
                />
                <MetaRow
                    label="Inicio"
                    value={formatDateTime(session.startAt)}
                />
                <MetaRow
                    label="Fin"
                    value={formatDateTime(session.endAt)}
                />
            </View>

            {details.error ? (
                <Text style={{ color: colors.danger ?? colors.text }}>{details.error}</Text>
            ) : null}
        </ScrollView>
    );
}

export default OutdoorSessionDetailsScreen;