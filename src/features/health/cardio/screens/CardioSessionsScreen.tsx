// /src/features/health/cardio/screens/CardioSessionsScreen.tsx
// Cardio day screen for indoor/outdoor walking and running sessions.

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { DatePickerField } from "@/src/features/components/DatePickerField";
import CardioEmptyState from "@/src/features/health/cardio/components/CardioEmptyState";
import CardioSessionCard from "@/src/features/health/cardio/components/CardioSessionCard";
import { useCardioBootstrap } from "@/src/hooks/health/cardio/useCardioBootstrap";
import { useCardioPermissions } from "@/src/hooks/health/cardio/useCardioPermissions";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { CardioActivityType } from "@/src/types/health/healthCardio.types";
import type { ISODate, WorkoutSession } from "@/src/types/workoutDay.types";
import { normalizeApiError } from "@/src/utils/api/apiErrorMessage";
import {
    formatFlexibleDateLabel,
    getLocalTodayIsoDate,
} from "@/src/utils/dates/dateDisplay";
import {
    CARDIO_HEALTH_PERMISSION_MESSAGE,
    isCardioHealthPermissionError,
    isCardioHealthPermissionMessage,
} from "@/src/utils/health/cardio/cardioHealthError.helpers";
import {
    groupCardioSessionsByEnvironmentAndActivity,
    type CardioEnvironmentGroupKey,
} from "@/src/utils/health/cardio/cardioSession.grouping";
import {
    formatCardioCalories,
    formatCardioDistance,
    formatCardioSteps,
} from "@/src/utils/health/cardio/cardioSession.helpers";

function formatDuration(durationSeconds: number): string {
    const totalMinutes = Math.round(durationSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes} min`;
}

function isISODate(value: string): value is ISODate {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function resolveDateParam(value: string | string[] | undefined): ISODate {
    if (typeof value === "string" && isISODate(value)) {
        return value;
    }

    return getLocalTodayIsoDate();
}

function MetricsPill(props: { label: string; value: string }) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                width: "48%",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 12,
                backgroundColor: colors.surface,
                gap: 4,
            }}
        >
            <Text style={{ fontSize: 12, color: colors.mutedText }}>{props.label}</Text>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>
                {props.value}
            </Text>
        </View>
    );
}

function ActionButton(props: {
    label: string;
    onPress: () => void;
    primary?: boolean;
}) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: props.primary ? colors.primary : colors.border,
                backgroundColor: props.primary ? colors.primary : colors.background,
                opacity: pressed ? 0.82 : 1,
            })}
        >
            <Text
                style={{
                    fontWeight: "800",
                    color: props.primary ? colors.primaryText : colors.text,
                }}
            >
                {props.label}
            </Text>
        </Pressable>
    );
}

function computeDashboardTotals(sessions: WorkoutSession[]) {
    let totalDistanceKm = 0;
    let totalSteps = 0;
    let totalActiveKcal = 0;
    let totalDurationSeconds = 0;
    let sessionsWithDistance = 0;
    let sessionsWithSteps = 0;
    let sessionsWithKcal = 0;
    let sessionsWithDuration = 0;

    for (const session of sessions) {
        if (typeof session.distanceKm === "number" && Number.isFinite(session.distanceKm)) {
            totalDistanceKm += session.distanceKm;
            sessionsWithDistance += 1;
        }

        if (typeof session.steps === "number" && Number.isFinite(session.steps)) {
            totalSteps += session.steps;
            sessionsWithSteps += 1;
        }

        if (typeof session.activeKcal === "number" && Number.isFinite(session.activeKcal)) {
            totalActiveKcal += session.activeKcal;
            sessionsWithKcal += 1;
        }

        if (
            typeof session.durationSeconds === "number" &&
            Number.isFinite(session.durationSeconds)
        ) {
            totalDurationSeconds += session.durationSeconds;
            sessionsWithDuration += 1;
        }
    }

    return {
        sessionsCount: sessions.length,
        totalDistanceKm: sessionsWithDistance > 0 ? totalDistanceKm : null,
        totalSteps: sessionsWithSteps > 0 ? totalSteps : null,
        totalActiveKcal: sessionsWithKcal > 0 ? totalActiveKcal : null,
        totalDurationSeconds: sessionsWithDuration > 0 ? totalDurationSeconds : null,
    };
}

function SectionTitle(props: { title: string; subtitle?: string }) {
    const { colors } = useTheme();

    return (
        <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>
                {props.title}
            </Text>
            {props.subtitle ? (
                <Text style={{ color: colors.mutedText }}>{props.subtitle}</Text>
            ) : null}
        </View>
    );
}

function ManualFallbackCard(props: {
    dateLabel: string;
    onPress: () => void;
}) {
    const { colors } = useTheme();

    return (
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
            <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>
                ¿No hubo datos desde Health?
            </Text>

            <Text style={{ color: colors.mutedText, lineHeight: 20 }}>
                Puedes capturar manualmente una sesión indoor u outdoor para {props.dateLabel} usando el mismo patrón de métricas que una importada.
            </Text>

            <View style={{ alignItems: "flex-start" }}>
                <ActionButton
                    label="Capturar sesión manual"
                    onPress={props.onPress}
                    primary
                />
            </View>
        </View>
    );
}

function renderSessionList(input: {
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptyDescription: string;
    sessions: WorkoutSession[];
    onRetry: () => void;
    onOpenSession: (session: WorkoutSession) => void;
}) {
    return (
        <View style={{ gap: 12 }}>
            <SectionTitle title={input.title} subtitle={input.subtitle} />

            {input.sessions.length === 0 ? (
                <CardioEmptyState
                    title={input.emptyTitle}
                    description={input.emptyDescription}
                    onRetry={input.onRetry}
                />
            ) : (
                input.sessions.map((session) => (
                    <CardioSessionCard
                        key={session.id}
                        session={session}
                        onPress={input.onOpenSession}
                    />
                ))
            )}
        </View>
    );
}

export function CardioSessionsScreen() {
    const params = useLocalSearchParams<{ date?: string | string[] }>();
    const router = useRouter();
    const { colors } = useTheme();

    const date = resolveDateParam(params.date);

    const displayDate = React.useMemo(() => {
        return formatFlexibleDateLabel(date, "es");
    }, [date]);

    const permissions = useCardioPermissions();

    const cardio = useCardioBootstrap({
        date,
        includeRoutes: true,
        autoBootstrap: true,
    });

    const hasHandledInitialFocusRef = React.useRef(false);
    const refreshRef = React.useRef(cardio.refresh);

    React.useEffect(() => {
        refreshRef.current = cardio.refresh;
    }, [cardio.refresh]);

    useFocusEffect(
        React.useCallback(() => {
            if (!hasHandledInitialFocusRef.current) {
                hasHandledInitialFocusRef.current = true;
                return undefined;
            }

            /**
             * Coming back from live summary/details only needs a BE refresh.
             * Avoid running Health Connect backfill automatically here because
             * Android can throw a runtime SecurityException when Health Connect
             * permissions were reset by a clean native rebuild.
             */
            void refreshRef.current().catch(() => undefined);

            return undefined;
        }, [])
    );

    const groupedSessions = React.useMemo(() => {
        return groupCardioSessionsByEnvironmentAndActivity(cardio.sessions);
    }, [cardio.sessions]);

    const dashboardTotals = React.useMemo(() => {
        return computeDashboardTotals(cardio.sessions);
    }, [cardio.sessions]);

    function handleDateChange(nextDate: string) {
        router.setParams({ date: nextDate });
    }

    function goToToday() {
        router.setParams({ date: getLocalTodayIsoDate() });
    }

    function openLiveCardio(activityType: CardioActivityType) {
        router.push({
            pathname: "/(app)/calendar/cardio/live",
            params: { activityType },
        });
    }

    function openManualSessionForm() {
        router.push({
            pathname: "/(app)/calendar/cardio/manual",
            params: {
                date,
            },
        });
    }

    function openDiagnostics() {
        router.push({
            pathname: "/(app)/calendar/cardio/diagnostics",
            params: { date },
        });
    }

    function openSessionDetails(session: WorkoutSession) {
        router.push({
            pathname: "/(app)/calendar/cardio/session/[date]/[sessionId]",
            params: {
                date,
                sessionId: session.id,
            },
        });
    }

    async function resync(): Promise<void> {
        try {
            if (!permissions.isGranted) {
                await permissions.requestPermissions();
            }

            const result = await cardio.resync();
            Alert.alert(
                "Cardio sincronizado",
                `${result.insertedCount} creada(s) · ${result.updatedCount} actualizada(s) · ${result.unchangedCount} sin cambios.`
            );
        } catch (err: unknown) {
            if (isCardioHealthPermissionError(err)) {
                Alert.alert(
                    "Permisos de Cardio",
                    CARDIO_HEALTH_PERMISSION_MESSAGE
                );
                return;
            }

            Alert.alert("Error al sincronizar", normalizeApiError(err).message);
        }
    }

    const shouldShowPermissionCard =
        !permissions.isGranted || isCardioHealthPermissionMessage(cardio.error);

    const environmentSections: Array<{
        key: CardioEnvironmentGroupKey;
        title: string;
        subtitle: string;
    }> = [
            {
                key: "outdoor",
                title: "Outdoor",
                subtitle: "Caminatas y carreras con ruta/GPS cuando Health lo permita.",
            },
            {
                key: "indoor",
                title: "Indoor",
                subtitle: "Caminadora o sesiones sin ruta GPS; distancia puede ser manual o de wearable.",
            },
            {
                key: "unknown",
                title: "Cardio sin clasificar",
                subtitle: "Health no indicó si fue indoor u outdoor, así que lo dejamos sin asumir.",
            },
        ];

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        >
            <View style={{ gap: 10 }}>
                <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
                        Cardio
                    </Text>
                    <Text style={{ color: colors.mutedText }}>
                        Walking + Running indoor/outdoor del día {displayDate}
                    </Text>
                </View>

                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 16,
                        padding: 12,
                        backgroundColor: colors.surface,
                        gap: 10,
                    }}
                >
                    <DatePickerField
                        label="Día a consultar"
                        value={date}
                        onChange={handleDateChange}
                        displayFormat="dd/MM/yyyy"
                    />

                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "flex-end",
                            flexWrap: "wrap",
                            gap: 10,
                        }}
                    >
                        <ActionButton label="Ir a hoy" onPress={goToToday} />
                        <ActionButton
                            label="Agregar manual"
                            onPress={openManualSessionForm}
                            primary
                        />
                    </View>
                </View>
            </View>

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
                <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>
                        Iniciar outdoor live
                    </Text>
                    <Text style={{ color: colors.mutedText, lineHeight: 20 }}>
                        Usa GPS del teléfono para registrar una caminata o carrera outdoor en vivo.
                    </Text>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
                    <ActionButton
                        label="Iniciar caminata"
                        onPress={() => openLiveCardio("walking")}
                        primary
                    />
                    <ActionButton
                        label="Iniciar carrera"
                        onPress={() => openLiveCardio("running")}
                        primary
                    />
                </View>
            </View>

            {shouldShowPermissionCard ? (
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
                    <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                        Permisos de Cardio
                    </Text>
                    <Text style={{ color: colors.mutedText }}>
                        Necesitamos permisos de HealthKit / Health Connect para leer caminatas y carreras.
                    </Text>

                    <Pressable
                        onPress={() => {
                            void permissions.requestPermissions().catch(() => undefined);
                        }}
                        style={({ pressed }) => ({
                            alignSelf: "flex-start",
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 12,
                            backgroundColor: colors.primary,
                            borderWidth: 1,
                            borderColor: colors.primary,
                            opacity: pressed ? 0.82 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.primaryText }}>
                            Dar permisos
                        </Text>
                    </Pressable>
                </View>
            ) : null}

            {!cardio.loading && cardio.sessions.length === 0 ? (
                <ManualFallbackCard
                    dateLabel={displayDate}
                    onPress={openManualSessionForm}
                />
            ) : null}

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 16,
                    padding: 16,
                    backgroundColor: colors.surface,
                    gap: 14,
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                    }}
                >
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
                            Dashboard general
                        </Text>
                        <Text style={{ color: colors.mutedText }}>
                            Resumen cardio del día
                        </Text>
                    </View>

                    <View style={{ gap: 8 }}>
                        <ActionButton label="Diagnóstico" onPress={openDiagnostics} />
                        <ActionButton label="Re-sincronizar" onPress={() => { void resync(); }} />
                    </View>
                </View>

                {cardio.loading ? (
                    <Text style={{ color: colors.mutedText }}>Cargando cardio…</Text>
                ) : null}

                {cardio.error ? (
                    <Text style={{ color: colors.danger ?? colors.text }}>{cardio.error}</Text>
                ) : null}

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    <MetricsPill
                        label="Sesiones"
                        value={String(dashboardTotals.sessionsCount)}
                    />
                    <MetricsPill
                        label="Distancia total"
                        value={formatCardioDistance(dashboardTotals.totalDistanceKm)}
                    />
                    <MetricsPill
                        label="Pasos totales"
                        value={formatCardioSteps(dashboardTotals.totalSteps)}
                    />
                    <MetricsPill
                        label="Kcal activas"
                        value={formatCardioCalories(dashboardTotals.totalActiveKcal)}
                    />
                    <MetricsPill
                        label="Tiempo total"
                        value={
                            dashboardTotals.totalDurationSeconds != null
                                ? formatDuration(dashboardTotals.totalDurationSeconds)
                                : "—"
                        }
                    />
                </View>
            </View>

            {environmentSections.map((environmentSection) => {
                const sessionsForEnvironment = groupedSessions[environmentSection.key];

                return (
                    <View key={environmentSection.key} style={{ gap: 14 }}>
                        <SectionTitle
                            title={environmentSection.title}
                            subtitle={environmentSection.subtitle}
                        />

                        {renderSessionList({
                            title: `${environmentSection.title} Walking`,
                            subtitle: "Sesiones de caminata detectadas para este día.",
                            emptyTitle: `No hubo ${environmentSection.title.toLowerCase()} walking`,
                            emptyDescription: "No encontramos caminatas importadas o manuales para este día.",
                            sessions: sessionsForEnvironment.walking,
                            onRetry: resync,
                            onOpenSession: openSessionDetails,
                        })}

                        {renderSessionList({
                            title: `${environmentSection.title} Running`,
                            subtitle: "Sesiones de carrera detectadas para este día.",
                            emptyTitle: `No hubo ${environmentSection.title.toLowerCase()} running`,
                            emptyDescription: "No encontramos carreras importadas o manuales para este día.",
                            sessions: sessionsForEnvironment.running,
                            onRetry: resync,
                            onOpenSession: openSessionDetails,
                        })}
                    </View>
                );
            })}
        </ScrollView>
    );
}

export default CardioSessionsScreen;
