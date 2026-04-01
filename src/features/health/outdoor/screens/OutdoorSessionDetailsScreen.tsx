// src/features/health/outdoor/screens/OutdoorSessionDetailsScreen.tsx

import React from "react";
import { ScrollView, Text, View } from "react-native";

import OutdoorEmptyState from "@/src/features/health/outdoor/components/OutdoorEmptyState";
import OutdoorRouteMap from "@/src/features/health/outdoor/components/OutdoorRouteMap";
import OutdoorRoutePreview from "@/src/features/health/outdoor/components/OutdoorRoutePreview";
import OutdoorSessionBadge from "@/src/features/health/outdoor/components/OutdoorSessionBadge";
import OutdoorSessionMetrics from "@/src/features/health/outdoor/components/OutdoorSessionMetrics";
import { useOutdoorSessionDetails } from "@/src/hooks/health/outdoor/useOutdoorSessionDetails";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { ISODate } from "@/src/types/workoutDay.types";
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

    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
        return "—";
    }

    return date.toLocaleString();
}

export function OutdoorSessionDetailsScreen({ date, sessionId }: Props) {
    const { colors } = useTheme();

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
                {session.activityType ? (
                    <OutdoorSessionBadge activityType={session.activityType} />
                ) : null}

                <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>
                    {buildOutdoorSessionTitleFromWorkoutSession(session)}
                </Text>

                <Text style={{ color: colors.mutedText }}>
                    Fecha: {date}
                </Text>
            </View>

            <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>
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
                <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>
                    Metadata importada
                </Text>

                <MetaRow label="Fuente" value={session.meta?.source ?? "—"} />
                <MetaRow label="Dispositivo" value={session.meta?.sourceDevice ?? "—"} />
                <MetaRow label="External ID" value={session.meta?.externalId ?? "—"} />
                <MetaRow label="Tipo original" value={session.meta?.originalType ?? "—"} />
                <MetaRow
                    label="Importado"
                    value={formatDateTime(session.meta?.importedAt ?? null)}
                />
                <MetaRow
                    label="Último sync"
                    value={formatDateTime(session.meta?.lastSyncedAt ?? null)}
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