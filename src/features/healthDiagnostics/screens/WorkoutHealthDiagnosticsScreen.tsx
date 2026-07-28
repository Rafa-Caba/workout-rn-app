// src/features/healthDiagnostics/screens/WorkoutHealthDiagnosticsScreen.tsx

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
import { readHealthWorkoutsByDate } from "@/src/services/health/health.service";
import { WORKOUT_HEALTH_READ_PERMISSIONS } from "@/src/services/health/healthPermissionKeys";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { HealthDiagnosticEvent } from "@/src/types/health/healthDiagnostics.types";

function todayISO(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function initialDate(value: string | string[] | undefined): string {
    const candidate = Array.isArray(value) ? value[0] : value;
    return candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : todayISO();
}

function isWorkoutEvent(event: HealthDiagnosticEvent): boolean {
    return event.kind.startsWith("workout-");
}

function eventTitle(event: HealthDiagnosticEvent): string {
    if (event.kind === "workout-query-started") return "Consulta iniciada";
    if (event.kind === "workout-query-result") return "Workouts recibidos";
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
        return `${event.outcome} · ${event.meaningfulCandidateCount}/${event.candidateCount} candidatos útiles · ${event.selectedType ?? "sin selección"}`;
    }

    if (event.kind === "workout-query-error") return event.errorMessage;

    if (event.kind === "workout-persistence") {
        return event.saved ? `Guardado: ${event.mode}` : event.errorMessage ?? "No se guardó";
    }

    return "";
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
    const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => new Set());

    const workoutEvents = React.useMemo(
        () => events.filter(isWorkoutEvent).reverse(),
        [events]
    );

    const latestResult = React.useMemo(() => {
        for (const event of workoutEvents) {
            if (event.kind === "workout-query-result" && event.range.targetDate === date) {
                return event;
            }
        }
        return null;
    }, [date, workoutEvents]);

    const latestSelection = React.useMemo(() => {
        for (const event of workoutEvents) {
            if (event.kind === "workout-selection" && event.targetDate === date) {
                return event;
            }
        }
        return null;
    }, [date, workoutEvents]);

    const busy = running || isCheckingAvailability || isRequestingPermissions;

    async function runDiagnostic(): Promise<void> {
        if (!availability) {
            Alert.alert("Salud no disponible", "HealthKit no está disponible en este dispositivo o build.");
            return;
        }

        setRunning(true);
        try {
            const status = await requestPermissions(WORKOUT_HEALTH_READ_PERMISSIONS);
            if (!status.available) {
                Alert.alert("Salud no disponible", "No se pudo inicializar HealthKit.");
                return;
            }

            const workouts = await readHealthWorkoutsByDate({ date });
            await refresh();

            Alert.alert(
                "Diagnóstico completado",
                workouts.length > 0
                    ? `${workouts.length} workout(s) recibidos. No se guardó nada en la base de datos.`
                    : "No se encontraron workouts para esa fecha."
            );
        } catch (error: unknown) {
            Alert.alert("Error", error instanceof Error ? error.message : String(error));
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
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refresh()} />}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>
                    Diagnóstico de workouts
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "600" }}>
                    Consulta HealthKit sin guardar y muestra exactamente qué sesión podría completar Gym Check.
                </Text>
            </View>

            <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16, padding: 12, gap: 10 }}>
                <DatePickerField value={date} onChange={setDate} disabled={busy} />
                <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                    Se consulta el día local completo y Gym Check solo considera Traditional Strength Training.
                </Text>
                <Pressable
                    onPress={() => void runDiagnostic()}
                    disabled={busy}
                    style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 12, opacity: busy ? 0.6 : 1 }}
                >
                    <Text style={{ color: colors.primaryText, textAlign: "center", fontWeight: "900" }}>
                        {busy ? "Consultando..." : "Probar consulta sin guardar"}
                    </Text>
                </Pressable>
                <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable onPress={() => void shareDiagnostics()} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 11 }}>
                        <Text style={{ color: colors.text, textAlign: "center", fontWeight: "800" }}>Compartir</Text>
                    </Pressable>
                    <Pressable onPress={() => void clear()} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 11 }}>
                        <Text style={{ color: colors.text, textAlign: "center", fontWeight: "800" }}>Limpiar</Text>
                    </Pressable>
                </View>
            </View>

            <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 16, padding: 12, gap: 8 }}>
                <Text style={{ color: colors.text, fontWeight: "900" }}>Resumen de la fecha</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Recibidos: {latestResult?.receivedSampleCount ?? 0}
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Mapeados: {latestResult?.mappedSampleCount ?? 0}
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Candidatos útiles: {latestSelection?.meaningfulCandidateCount ?? 0}
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Selección: {latestSelection?.selectedType ?? "—"}
                </Text>
                <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                    Eventos locales: {events.length}/{HEALTH_DIAGNOSTIC_MAX_EVENTS}
                </Text>
            </View>

            {latestResult?.samples.map((sample, index) => (
                <View key={`${sample.externalId ?? "sample"}-${index}`} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 5 }}>
                    <Text style={{ color: colors.text, fontWeight: "900" }}>{sample.type}</Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>{sample.startAt ?? "—"} → {sample.endAt ?? "—"}</Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>Dispositivo: {sample.sourceDevice ?? "—"}</Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>Métricas útiles: {sample.hasMeaningfulMetrics ? "Sí" : "No"}</Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        Duración {sample.metrics.durationSeconds ?? "—"}s · Activas {sample.metrics.activeKcal ?? "—"} kcal · Totales {sample.metrics.totalKcal ?? "—"} kcal{sample.metrics.totalKcalEstimated ? " (estimadas)" : ""}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        HR promedio/máximo: {sample.metrics.avgHr ?? "—"}/{sample.metrics.maxHr ?? "—"}
                    </Text>
                </View>
            ))}

            <View style={{ gap: 8 }}>
                <Text style={{ color: colors.text, fontWeight: "900" }}>Eventos</Text>
                {isLoading ? <ActivityIndicator /> : null}
                {workoutEvents.map((event) => {
                    const expanded = expandedIds.has(event.id);
                    return (
                        <Pressable key={event.id} onPress={() => toggleExpanded(event.id)} style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 5 }}>
                            <Text style={{ color: colors.text, fontWeight: "900" }}>{eventTitle(event)}</Text>
                            <Text style={{ color: colors.mutedText, fontSize: 12 }}>{event.createdAt}</Text>
                            <Text style={{ color: colors.mutedText }}>{eventSummary(event)}</Text>
                            {expanded ? (
                                <Text selectable style={{ color: colors.mutedText, fontFamily: "Courier", fontSize: 10 }}>
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
