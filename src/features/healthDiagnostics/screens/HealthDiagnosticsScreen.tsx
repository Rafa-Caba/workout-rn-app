// /src/features/healthDiagnostics/screens/WorkoutHealthDiagnosticsScreen.tsx
// Local-only HealthKit workout diagnostics focused on Gym Check imports.

import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    Share,
    Text,
    View,
} from "react-native";

import { DatePickerField } from "@/src/features/sleep/components/DatePickerField";
import { useHealthDiagnostics } from "@/src/hooks/health/useHealthDiagnostics";
import { useHealthPermissions } from "@/src/hooks/health/useHealthPermissions";
import {
    HEALTH_DIAGNOSTIC_MAX_EVENTS,
    serializeHealthDiagnostics,
} from "@/src/services/health/diagnostics/healthDiagnostics.service";
import { readHealthGymCheckWorkoutByDate } from "@/src/services/health/health.service";
import { WORKOUT_HEALTH_READ_PERMISSIONS } from "@/src/services/health/healthPermissionKeys";
import { useTheme } from "@/src/theme/ThemeProvider";
import type {
    HealthDiagnosticEvent,
    HealthWorkoutDiagnosticSample,
} from "@/src/types/health/healthDiagnostics.types";
import { GYM_CHECK_PROVIDER_WORKOUT_LABEL } from "@/src/utils/health/healthGymCheckWorkout.selector";

function todayISO(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function initialDate(value: string | string[] | undefined): string {
    const candidate = Array.isArray(value) ? value[0] : value;
    return candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate)
        ? candidate
        : todayISO();
}

function isWorkoutEvent(event: HealthDiagnosticEvent): boolean {
    return event.kind.startsWith("workout-");
}

function eventTitle(event: HealthDiagnosticEvent): string {
    if (event.kind === "workout-query-started") return "Consulta iniciada";
    if (event.kind === "workout-query-result") return "Entrenamientos recibidos";
    if (event.kind === "workout-selection") return "Selección para Gym Check";
    if (event.kind === "workout-query-error") return "Error de consulta";
    if (event.kind === "workout-persistence") return "Persistencia";
    return event.kind;
}

function eventSummary(event: HealthDiagnosticEvent): string {
    if (event.kind === "workout-query-started") {
        return `${event.range.startDate} → ${event.range.endDate}`;
    }

    if (event.kind === "workout-query-result") {
        return `${event.receivedSampleCount} recibidos · ${event.mappedSampleCount} mapeados · ${event.rejectedSampleCount} rechazados`;
    }

    if (event.kind === "workout-selection") {
        const matchingCount =
            event.matchingCandidateCount ?? event.meaningfulCandidateCount;
        return `${event.outcome} · ${matchingCount}/${event.candidateCount} del tipo requerido · ${event.selectedType ?? "sin selección"}`;
    }

    if (event.kind === "workout-query-error") return event.errorMessage;

    if (event.kind === "workout-persistence") {
        return event.saved
            ? `Guardado: ${event.mode}`
            : event.errorMessage ?? "No se guardó";
    }

    return "";
}

function formatDuration(seconds: number | null): string {
    if (seconds === null || !Number.isFinite(seconds)) {
        return "—";
    }

    const rounded = Math.max(0, Math.round(seconds));
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const remainingSeconds = rounded % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }

    return `${minutes}m ${remainingSeconds}s`;
}

function formatMetric(value: number | null, suffix = ""): string {
    if (value === null || !Number.isFinite(value)) {
        return "—";
    }

    const rounded = Number(value.toFixed(2));
    return `${rounded}${suffix}`;
}

function SelectedWorkoutCard(props: {
    sample: HealthWorkoutDiagnosticSample | null;
    colors: ReturnType<typeof useTheme>["colors"];
}) {
    const { sample, colors } = props;

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 12,
                gap: 7,
            }}
        >
            <Text style={{ color: colors.text, fontWeight: "900" }}>
                Workout elegido
            </Text>

            {!sample ? (
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    No hay una sesión elegible para Gym Check.
                </Text>
            ) : (
                <>
                    <Text style={{ color: colors.text, fontWeight: "900" }}>
                        {sample.providerWorkoutType ?? sample.type}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        {sample.startAt ?? "—"} → {sample.endAt ?? "—"}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Duración: {formatDuration(sample.metrics.durationSeconds)}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Kcal activas: {formatMetric(sample.metrics.activeKcal)}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Kcal totales: {formatMetric(sample.metrics.totalKcal)}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        HR promedio: {formatMetric(sample.metrics.avgHr)}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        HR máximo: {formatMetric(sample.metrics.maxHr)}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Dispositivo: {sample.sourceDevice ?? "—"}
                    </Text>
                </>
            )}
        </View>
    );
}

export default function WorkoutHealthDiagnosticsScreen() {
    const { colors } = useTheme();
    const params = useLocalSearchParams<{ date?: string | string[] }>();
    const { events, isLoading, refresh, clear } = useHealthDiagnostics();
    const {
        availability,
        requestPermissions,
        isCheckingAvailability,
        isRequestingPermissions,
    } = useHealthPermissions();

    const [date, setDate] = React.useState(() => initialDate(params.date));
    const [running, setRunning] = React.useState(false);
    const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
        () => new Set()
    );

    const workoutEvents = React.useMemo(
        () => events.filter(isWorkoutEvent).reverse(),
        [events]
    );

    const latestResult = React.useMemo(() => {
        for (const event of workoutEvents) {
            if (
                event.kind === "workout-query-result" &&
                event.range.targetDate === date
            ) {
                return event;
            }
        }
        return null;
    }, [date, workoutEvents]);

    const latestSelection = React.useMemo(() => {
        for (const event of workoutEvents) {
            if (
                event.kind === "workout-selection" &&
                event.targetDate === date
            ) {
                return event;
            }
        }
        return null;
    }, [date, workoutEvents]);

    const selectedSample = latestSelection?.selectedSample ?? null;
    const busy = running || isCheckingAvailability || isRequestingPermissions;

    async function runDiagnostic(): Promise<void> {
        if (!availability) {
            Alert.alert(
                "Salud no disponible",
                "HealthKit no está disponible en este dispositivo o build."
            );
            return;
        }

        setRunning(true);
        try {
            const status = await requestPermissions(
                WORKOUT_HEALTH_READ_PERMISSIONS
            );
            if (!status.available) {
                Alert.alert(
                    "Salud no disponible",
                    "No se pudo inicializar HealthKit."
                );
                return;
            }

            const result = await readHealthGymCheckWorkoutByDate({ date });
            await refresh();

            Alert.alert(
                "Diagnóstico completado",
                result.selected
                    ? `Se eligió una sesión ${GYM_CHECK_PROVIDER_WORKOUT_LABEL}. No se guardó nada en la base de datos.`
                    : `Se recibieron ${result.workouts.length} entrenamientos, pero no se encontró una sesión ${GYM_CHECK_PROVIDER_WORKOUT_LABEL} importable.`
            );
        } catch (error: unknown) {
            Alert.alert(
                "Error",
                error instanceof Error ? error.message : String(error)
            );
        } finally {
            setRunning(false);
        }
    }

    async function shareDiagnostics(): Promise<void> {
        await Share.share({
            message: serializeHealthDiagnostics(events),
            title: `Diagnóstico HealthKit workouts ${date}`,
        });
    }

    function toggleExpanded(id: string): void {
        setExpandedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
            refreshControl={
                <RefreshControl
                    refreshing={isLoading}
                    onRefresh={() => void refresh()}
                />
            }
        >
            <View style={{ gap: 4 }}>
                <Text
                    style={{
                        color: colors.text,
                        fontSize: 22,
                        fontWeight: "900",
                    }}
                >
                    Diagnóstico de Gym Check
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "600" }}>
                    Consulta HealthKit sin guardar y verifica la sesión exacta que
                    completaría las métricas de Gym Check.
                </Text>
            </View>

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
                <DatePickerField value={date} onChange={setDate} disabled={busy} />
                <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                    Filtro requerido: {GYM_CHECK_PROVIDER_WORKOUT_LABEL}. Los demás
                    tipos permanecen visibles para diagnóstico, pero no se usan en
                    Gym Check.
                </Text>
                <Pressable
                    onPress={() => void runDiagnostic()}
                    disabled={busy}
                    style={{
                        backgroundColor: colors.primary,
                        borderRadius: 12,
                        padding: 12,
                        opacity: busy ? 0.6 : 1,
                    }}
                >
                    <Text
                        style={{
                            color: colors.primaryText,
                            textAlign: "center",
                            fontWeight: "900",
                        }}
                    >
                        {busy ? "Consultando..." : "Probar consulta sin guardar"}
                    </Text>
                </Pressable>
                <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                        onPress={() => void shareDiagnostics()}
                        style={{
                            flex: 1,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            padding: 11,
                        }}
                    >
                        <Text
                            style={{
                                color: colors.text,
                                textAlign: "center",
                                fontWeight: "800",
                            }}
                        >
                            Compartir
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => void clear()}
                        style={{
                            flex: 1,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            padding: 11,
                        }}
                    >
                        <Text
                            style={{
                                color: colors.text,
                                textAlign: "center",
                                fontWeight: "800",
                            }}
                        >
                            Limpiar
                        </Text>
                    </Pressable>
                </View>
            </View>

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
                <Text style={{ color: colors.text, fontWeight: "900" }}>
                    Resumen de la fecha
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Entrenamientos reales recibidos: {latestResult?.receivedSampleCount ?? 0}
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Mapeados: {latestResult?.mappedSampleCount ?? 0}
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Coincidencias del tipo requerido:{" "}
                    {latestSelection?.matchingCandidateCount ?? 0}
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Coincidencias con métricas útiles:{" "}
                    {latestSelection?.meaningfulCandidateCount ?? 0}
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Resultado: {latestSelection?.outcome ?? "—"}
                </Text>
                <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                    Eventos locales: {events.length}/{HEALTH_DIAGNOSTIC_MAX_EVENTS}
                </Text>
            </View>

            <SelectedWorkoutCard sample={selectedSample} colors={colors} />

            <View style={{ gap: 8 }}>
                <Text style={{ color: colors.text, fontWeight: "900" }}>
                    Entrenamientos devueltos por HealthKit
                </Text>
                {latestResult?.samples.map((sample, index) => (
                    <View
                        key={`${sample.externalId ?? sample.startAt ?? "sample"}-${index}`}
                        style={{
                            borderWidth: 1,
                            borderColor: sample.eligibleForGymCheck
                                ? colors.primary
                                : colors.border,
                            backgroundColor: colors.surface,
                            borderRadius: 14,
                            padding: 12,
                            gap: 5,
                        }}
                    >
                        <Text style={{ color: colors.text, fontWeight: "900" }}>
                            {sample.providerWorkoutType ?? sample.type}
                        </Text>
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                            {sample.startAt ?? "—"} → {sample.endAt ?? "—"}
                        </Text>
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                            Elegible para Gym Check:{" "}
                            {sample.eligibleForGymCheck ? "Sí" : "No"}
                        </Text>
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                            Dispositivo: {sample.sourceDevice ?? "—"}
                        </Text>
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                            Duración {formatDuration(sample.metrics.durationSeconds)} ·
                            Activas {formatMetric(sample.metrics.activeKcal, " kcal")} ·
                            Totales {formatMetric(sample.metrics.totalKcal, " kcal")}
                        </Text>
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                            HR {formatMetric(sample.metrics.avgHr)}/
                            {formatMetric(sample.metrics.maxHr)} · Distancia{" "}
                            {formatMetric(sample.metrics.distanceKm, " km")} · Pasos{" "}
                            {formatMetric(sample.metrics.steps)}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={{ gap: 8 }}>
                <Text style={{ color: colors.text, fontWeight: "900" }}>
                    Eventos
                </Text>
                {isLoading ? <ActivityIndicator /> : null}
                {workoutEvents.map((event) => {
                    const expanded = expandedIds.has(event.id);
                    return (
                        <Pressable
                            key={event.id}
                            onPress={() => toggleExpanded(event.id)}
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                                borderRadius: 14,
                                padding: 12,
                                gap: 5,
                            }}
                        >
                            <Text style={{ color: colors.text, fontWeight: "900" }}>
                                {eventTitle(event)}
                            </Text>
                            <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                                {event.createdAt}
                            </Text>
                            <Text style={{ color: colors.mutedText }}>
                                {eventSummary(event)}
                            </Text>
                            {expanded ? (
                                <Text
                                    selectable
                                    style={{
                                        color: colors.mutedText,
                                        fontFamily: "Courier",
                                        fontSize: 10,
                                    }}
                                >
                                    {JSON.stringify(event, null, 2)}
                                </Text>
                            ) : null}
                        </Pressable>
                    );
                })}
            </View>
        </ScrollView>
    );
}
