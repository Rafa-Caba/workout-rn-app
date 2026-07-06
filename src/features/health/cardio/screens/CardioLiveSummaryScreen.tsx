// src/features/health/cardio/screens/CardioLiveSummaryScreen.tsx
// Summary screen after a phone-GPS outdoor Cardio live session is saved.

import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import CardioRouteMap from "@/src/features/health/cardio/components/CardioRouteMap";
import { useCardioSessionDetails } from "@/src/hooks/health/cardio/useCardioSessionDetails";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { CardioHealthWriteProvider } from "@/src/types/health/cardio/cardioHealthWrite.types";
import type { CardioActivityType } from "@/src/types/health/healthCardio.types";
import type { ISODate } from "@/src/types/workoutDay.types";
import { formatFlexibleDateLabel } from "@/src/utils/dates/dateDisplay";
import {
    formatCardioDistance,
    formatCardioPace,
} from "@/src/utils/health/cardio/cardioSession.helpers";

function parseOptionalNumber(value: string | string[] | undefined): number | null {
    if (typeof value !== "string" || value.trim().length === 0) {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalString(value: string | string[] | undefined): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseActivityType(value: string | string[] | undefined): CardioActivityType {
    return value === "running" ? "running" : "walking";
}

function parseHealthWriteStatus(value: string | string[] | undefined): "pending" | "synced" | "failed" {
    if (value === "synced" || value === "failed" || value === "pending") {
        return value;
    }

    return "pending";
}

function parseHealthProvider(value: string | string[] | undefined): CardioHealthWriteProvider | null {
    if (value === "healthkit" || value === "health-connect") {
        return value;
    }

    return null;
}

function formatHealthProvider(provider: CardioHealthWriteProvider | null): string {
    if (provider === "healthkit") return "HealthKit";
    if (provider === "health-connect") return "Health Connect";
    return "Health";
}

function formatHealthWriteStatus(input: {
    status: "pending" | "synced" | "failed";
    provider: CardioHealthWriteProvider | null;
}): string {
    const providerLabel = formatHealthProvider(input.provider);

    if (input.status === "synced") {
        return `Sincronizado con ${providerLabel}`;
    }

    if (input.status === "failed") {
        return `Falló sync con ${providerLabel}`;
    }

    return `Pendiente con ${providerLabel}`;
}

function formatDuration(durationSeconds: number | null): string {
    if (durationSeconds === null || durationSeconds <= 0) {
        return "—";
    }

    const totalSeconds = Math.round(durationSeconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    return `${minutes}m ${seconds}s`;
}

function MetricRow(props: { label: string; value: string }) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                paddingVertical: 10,
            }}
        >
            <Text style={{ color: colors.mutedText, fontWeight: "700" }}>{props.label}</Text>
            <Text style={{
                color: colors.text,
                fontWeight: "800",
                flexShrink: 1,
                textAlign: "right",
            }}>{props.value}</Text>
        </View>
    );
}

function ActionButton(props: { label: string; onPress: () => void; primary?: boolean }) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: props.primary ? colors.primary : colors.border,
                backgroundColor: props.primary ? colors.primary : colors.background,
                opacity: pressed ? 0.82 : 1,
            })}
        >
            <Text
                style={{
                    color: props.primary ? colors.primaryText : colors.text,
                    fontWeight: "800",
                    textAlign: "center",
                }}
            >
                {props.label}
            </Text>
        </Pressable>
    );
}

export function CardioLiveSummaryScreen() {
    const params = useLocalSearchParams<{
        date?: string | string[];
        sessionId?: string | string[];
        activityType?: string | string[];
        distanceKm?: string | string[];
        durationSeconds?: string | string[];
        paceSecPerKm?: string | string[];
        healthWriteStatus?: string | string[];
        healthExternalId?: string | string[];
        healthWriteError?: string | string[];
        healthProvider?: string | string[];
    }>();
    const router = useRouter();
    const { colors } = useTheme();

    const date = (parseOptionalString(params.date) ?? "") as ISODate;
    const sessionId = parseOptionalString(params.sessionId);
    const activityType = parseActivityType(params.activityType);
    const distanceKm = parseOptionalNumber(params.distanceKm);
    const durationSeconds = parseOptionalNumber(params.durationSeconds);
    const paceSecPerKm = parseOptionalNumber(params.paceSecPerKm);
    const healthWriteStatus = parseHealthWriteStatus(params.healthWriteStatus);
    const healthExternalId = parseOptionalString(params.healthExternalId);
    const healthWriteError = parseOptionalString(params.healthWriteError);
    const healthProvider = parseHealthProvider(params.healthProvider);

    const title = activityType === "running" ? "Outdoor Run guardado" : "Outdoor Walk guardado";
    const canLoadSessionDetails = Boolean(date && sessionId);
    const details = useCardioSessionDetails({
        date,
        sessionId: sessionId ?? "",
        includeRoutes: true,
        autoLoad: canLoadSessionDetails,
        activityTypes: [activityType],
    });
    const savedSession = details.session;

    function openDetail() {
        if (!date || !sessionId) {
            router.replace("/(app)/calendar/cardio");
            return;
        }

        router.replace({
            pathname: "/(app)/calendar/cardio/session/[date]/[sessionId]",
            params: { date, sessionId },
        });
    }

    function openCardioDay() {
        if (!date) {
            router.replace("/(app)/calendar/cardio");
            return;
        }

        router.replace({
            pathname: "/(app)/calendar/cardio/[date]",
            params: { date },
        });
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: "800" }}>
                    {title}
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    {date ? formatFlexibleDateLabel(date, "es") : "Sesión guardada"}
                </Text>
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 18,
                    padding: 16,
                    backgroundColor: colors.surface,
                    gap: 4,
                }}
            >
                <MetricRow label="Distancia" value={formatCardioDistance(distanceKm)} />
                <MetricRow label="Tiempo" value={formatDuration(durationSeconds)} />
                <MetricRow label="Ritmo" value={formatCardioPace(paceSecPerKm)} />
                <MetricRow
                    label="Sync OS"
                    value={formatHealthWriteStatus({
                        status: healthWriteStatus,
                        provider: healthProvider,
                    })}
                />
                {healthExternalId ? (
                    <MetricRow label="External ID" value={healthExternalId} />
                ) : null}
                {healthWriteError ? (
                    <MetricRow label="Sync error" value={healthWriteError} />
                ) : null}
            </View>

            {savedSession?.cardioEnvironment === "outdoor" ? (
                <CardioRouteMap
                    hasRoute={savedSession.hasRoute}
                    routeSummary={savedSession.routeSummary}
                    routePoints={savedSession.routePoints}
                    height={240}
                />
            ) : null}

            {details.error ? (
                <Text style={{ color: colors.danger ?? colors.text }}>
                    No se pudo cargar el mapa guardado todavía: {details.error}
                </Text>
            ) : null}

            <View style={{ gap: 10 }}>
                <ActionButton label="Ver detalle" onPress={openDetail} primary />
                <ActionButton label="Volver a Cardio" onPress={openCardioDay} />
            </View>
        </ScrollView>
    );
}

export default CardioLiveSummaryScreen;
