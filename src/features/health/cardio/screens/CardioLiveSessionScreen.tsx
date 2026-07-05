// src/features/health/cardio/screens/CardioLiveSessionScreen.tsx
// Foreground phone-GPS live tracking screen for outdoor walking/running sessions.

import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { useCardioLiveSession } from "@/src/hooks/health/cardio/useCardioLiveSession";
import { mapCardioLiveSnapshotToCreateSessionBody } from "@/src/services/health/cardio/cardioLiveSession.mapper";
import {
    createSession,
    ensureWorkoutDayExists,
    type ReturnSession,
} from "@/src/services/workout/sessions.service";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { CardioActivityType } from "@/src/types/health/healthCardio.types";
import type { WorkoutSession } from "@/src/types/workoutDay.types";
import {
    formatCardioDistance,
    formatCardioPace,
} from "@/src/utils/health/cardio/cardioSession.helpers";

function isCardioActivityType(value: unknown): value is CardioActivityType {
    return value === "walking" || value === "running";
}

function resolveActivityType(value: string | string[] | undefined): CardioActivityType {
    if (typeof value === "string" && isCardioActivityType(value)) {
        return value;
    }

    return "walking";
}

function formatDuration(durationSeconds: number): string {
    const totalSeconds = Math.max(0, Math.round(durationSeconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatSpeed(speedKmh: number | null | undefined): string {
    if (typeof speedKmh !== "number" || !Number.isFinite(speedKmh) || speedKmh <= 0) {
        return "—";
    }

    return `${speedKmh.toFixed(1)} km/h`;
}

function getActivityTitle(activityType: CardioActivityType): string {
    return activityType === "running" ? "Outdoor Run" : "Outdoor Walk";
}

function isReturnSession(value: unknown): value is ReturnSession {
    return typeof value === "object" && value !== null && "session" in value;
}

function extractCreatedSession(value: unknown): WorkoutSession | null {
    if (!isReturnSession(value)) {
        return null;
    }

    return value.session ?? null;
}

function MetricCard(props: { label: string; value: string }) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                width: "48%",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                padding: 14,
                backgroundColor: colors.surface,
                gap: 4,
            }}
        >
            <Text style={{ color: colors.mutedText, fontWeight: "700" }}>{props.label}</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>
                {props.value}
            </Text>
        </View>
    );
}

function ActionButton(props: {
    label: string;
    onPress: () => void;
    primary?: boolean;
    danger?: boolean;
    disabled?: boolean;
}) {
    const { colors } = useTheme();

    const backgroundColor = props.primary
        ? colors.primary
        : props.danger
            ? colors.danger ?? colors.background
            : colors.background;

    const borderColor = props.primary
        ? colors.primary
        : props.danger
            ? colors.danger ?? colors.border
            : colors.border;

    const textColor = props.primary
        ? colors.primaryText
        : props.danger
            ? colors.primaryText
            : colors.text;

    return (
        <Pressable
            onPress={props.disabled ? undefined : props.onPress}
            style={({ pressed }) => ({
                flexGrow: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor,
                backgroundColor,
                opacity: props.disabled ? 0.5 : pressed ? 0.82 : 1,
            })}
        >
            <Text style={{ color: textColor, fontWeight: "900" }}>{props.label}</Text>
        </Pressable>
    );
}

export function CardioLiveSessionScreen() {
    const params = useLocalSearchParams<{ activityType?: string | string[] }>();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { colors } = useTheme();

    const activityType = resolveActivityType(params.activityType);
    const live = useCardioLiveSession({ activityType });
    const [saving, setSaving] = React.useState<boolean>(false);

    const title = getActivityTitle(activityType);

    async function saveFinishedSession(): Promise<void> {
        if (saving) {
            return;
        }

        const snapshot = await live.finish();
        if (!snapshot) {
            return;
        }

        setSaving(true);

        try {
            await ensureWorkoutDayExists(snapshot.date);

            const payload = mapCardioLiveSnapshotToCreateSessionBody(snapshot);
            const created = await createSession(snapshot.date, payload, { returnMode: "session" });
            const session = extractCreatedSession(created);
            const sessionId = session?.id ?? null;

            await queryClient.invalidateQueries({ queryKey: ["workoutDay", snapshot.date] });

            router.replace({
                pathname: "/(app)/calendar/cardio/live-summary",
                params: {
                    date: snapshot.date,
                    sessionId: sessionId ?? "",
                    activityType: snapshot.activityType,
                    distanceKm: String(snapshot.distanceKm),
                    durationSeconds: String(snapshot.durationSeconds),
                    paceSecPerKm: snapshot.paceSecPerKm === null ? "" : String(snapshot.paceSecPerKm),
                },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo guardar la sesión.";
            Alert.alert("No se pudo guardar", message);
        } finally {
            setSaving(false);
        }
    }

    function confirmFinish() {
        Alert.alert(
            "Finalizar sesión",
            "¿Quieres finalizar y guardar esta sesión outdoor en el backend?",
            [
                { text: "Seguir", style: "cancel" },
                { text: "Finalizar", style: "default", onPress: () => void saveFinishedSession() },
            ]
        );
    }

    function confirmCancel() {
        Alert.alert(
            "Cancelar sesión",
            "Esto descartará la sesión en vivo y no se guardará en el backend.",
            [
                { text: "Seguir", style: "cancel" },
                {
                    text: "Cancelar sesión",
                    style: "destructive",
                    onPress: () => {
                        live.cancel();
                        router.back();
                    },
                },
            ]
        );
    }

    const canStart = live.status === "idle" || live.status === "ready" || live.status === "failed";
    const canPause = live.status === "running";
    const canResume = live.status === "paused";
    const canFinish = live.status === "running" || live.status === "paused";

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>
                    {title}
                </Text>
                <Text style={{ color: colors.mutedText, lineHeight: 20 }}>
                    Registra una caminata o carrera outdoor usando GPS del teléfono. HR, calorías y métricas de wearable se agregarán después cuando escribamos/mezclemos con HealthKit o Health Connect.
                </Text>
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 18,
                    padding: 18,
                    backgroundColor: colors.surface,
                    gap: 14,
                }}
            >
                <View style={{ gap: 4 }}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Estado</Text>
                    <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>
                        {live.status}
                    </Text>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    <MetricCard label="Tiempo" value={formatDuration(live.elapsedSeconds)} />
                    <MetricCard label="Distancia" value={formatCardioDistance(live.distanceKm)} />
                    <MetricCard label="Ritmo" value={formatCardioPace(live.paceSecPerKm)} />
                    <MetricCard label="Velocidad" value={formatSpeed(live.avgSpeedKmh)} />
                    <MetricCard label="Puntos GPS" value={String(live.routePoints.length)} />
                    <MetricCard label="Max speed" value={formatSpeed(live.maxSpeedKmh)} />
                </View>
            </View>

            {live.error ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.danger ?? colors.border,
                        borderRadius: 16,
                        padding: 14,
                        backgroundColor: colors.surface,
                        gap: 8,
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "900" }}>Detalle del error</Text>
                    <Text style={{ color: colors.mutedText, lineHeight: 20 }}>
                        {live.error.message}
                    </Text>
                    <View style={{ alignItems: "flex-start" }}>
                        <ActionButton label="Limpiar error" onPress={live.clearError} />
                    </View>
                </View>
            ) : null}

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 18,
                    padding: 16,
                    backgroundColor: colors.surface,
                    gap: 12,
                }}
            >
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>
                    Controles
                </Text>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    {canStart ? (
                        <ActionButton
                            label="Start"
                            onPress={() => {
                                void live.start();
                            }}
                            primary
                            disabled={saving}
                        />
                    ) : null}

                    {canPause ? (
                        <ActionButton label="Pausar" onPress={live.pause} disabled={saving} />
                    ) : null}

                    {canResume ? (
                        <ActionButton
                            label="Reanudar"
                            onPress={() => {
                                void live.resume();
                            }}
                            primary
                            disabled={saving}
                        />
                    ) : null}

                    {canFinish ? (
                        <ActionButton
                            label={saving ? "Guardando…" : "Finish + guardar"}
                            onPress={confirmFinish}
                            primary
                            disabled={saving}
                        />
                    ) : null}

                    <ActionButton
                        label="Cancelar"
                        onPress={confirmCancel}
                        danger
                        disabled={saving}
                    />
                </View>
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 16,
                    padding: 14,
                    backgroundColor: colors.surface,
                    gap: 6,
                }}
            >
                <Text style={{ color: colors.text, fontWeight: "900" }}>Notas de esta fase</Text>
                <Text style={{ color: colors.mutedText, lineHeight: 20 }}>
                    Esta versión guarda en el backend como source app-live y sessionKind live-cardio. La escritura a HealthKit / Health Connect queda preparada para la siguiente fase con healthWriteStatus pending.
                </Text>
            </View>
        </ScrollView>
    );
}

export default CardioLiveSessionScreen;
