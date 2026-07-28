// /src/features/healthDiagnostics/screens/HealthDiagnosticsScreen.tsx

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
import { readHealthSleepByDate } from "@/src/services/health/health.service";
import { SLEEP_HEALTH_READ_PERMISSIONS } from "@/src/services/health/healthPermissionKeys";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { HealthDiagnosticEvent } from "@/src/types/health/healthDiagnostics.types";

type HealthSleepNormalizationEvent = Extract<
    HealthDiagnosticEvent,
    { kind: "sleep-normalization" }
>;
type SleepHealthDiagnosticEvent = Extract<
    HealthDiagnosticEvent,
    {
        kind:
        | "availability"
        | "permissions"
        | "sleep-query-started"
        | "sleep-query-result"
        | "sleep-normalization"
        | "sleep-query-error"
        | "sleep-persistence";
    }
>;

function isSleepHealthDiagnosticEvent(
    event: HealthDiagnosticEvent
): event is SleepHealthDiagnosticEvent {
    return !event.kind.startsWith("workout-");
}

function todayISO(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isValidISODate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [yearText, monthText, dayText] = value.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const candidate = new Date(year, month - 1, day, 12, 0, 0, 0);

    return (
        candidate.getFullYear() === year &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day
    );
}

function initialDateFromParam(value: string | string[] | undefined): string {
    const candidate = Array.isArray(value) ? value[0] : value;
    return candidate && isValidISODate(candidate) ? candidate : todayISO();
}

function formatDateTime(value: string): string {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : value;
}

function formatEventTitle(event: SleepHealthDiagnosticEvent): string {
    if (event.kind === "availability") return "Disponibilidad";
    if (event.kind === "permissions") return "Permisos";
    if (event.kind === "sleep-query-started") return "Consulta iniciada";
    if (event.kind === "sleep-query-result") return "Muestras recibidas";
    if (event.kind === "sleep-normalization") return "Normalización";
    if (event.kind === "sleep-query-error") return "Error de consulta";
    return "Persistencia";
}

function formatEventSummary(event: SleepHealthDiagnosticEvent): string {
    if (event.kind === "availability") {
        return event.available ? "HealthKit disponible" : "HealthKit no disponible";
    }

    if (event.kind === "permissions") {
        return event.nativeRequestCompleted
            ? "Solicitud nativa completada; Apple no confirma lecturas individuales"
            : event.errorMessage ?? "Solicitud nativa incompleta";
    }

    if (event.kind === "sleep-query-started") {
        return `${event.range.targetDate}: ${formatDateTime(event.range.startDate)} → ${formatDateTime(event.range.endDate)}`;
    }

    if (event.kind === "sleep-query-result") {
        const suffix = event.samplesTruncated ? " (vista previa limitada)" : "";
        return `${event.receivedSampleCount} muestras recibidas${suffix}`;
    }

    if (event.kind === "sleep-normalization") {
        return `${event.outcome} · ${event.totals.timeAsleepMinutes ?? 0} min dormido · ${event.selectedSourceKey ?? "sin fuente"}`;
    }

    if (event.kind === "sleep-query-error") {
        return event.errorMessage;
    }

    return event.saved
        ? "Sueño normalizado guardado sin raw"
        : event.errorMessage ?? "No se guardó sueño";
}

function latestNormalization(
    events: SleepHealthDiagnosticEvent[]
): HealthSleepNormalizationEvent | null {
    for (let index = events.length - 1; index >= 0; index -= 1) {
        const event = events[index];
        if (event.kind === "sleep-normalization") return event;
    }

    return null;
}

export default function HealthDiagnosticsScreen() {
    const { colors } = useTheme();
    const params = useLocalSearchParams<{ date?: string | string[] }>();
    const { events, isLoading, refresh, clear } = useHealthDiagnostics();
    const {
        availability,
        provider,
        requestPermissions,
        isCheckingAvailability,
        isRequestingPermissions,
    } = useHealthPermissions();

    const [date, setDate] = React.useState(() => initialDateFromParam(params.date));
    const [isRunning, setIsRunning] = React.useState(false);
    const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => new Set());

    const sleepEvents = React.useMemo(
        () => events.filter(isSleepHealthDiagnosticEvent),
        [events]
    );
    const latest = React.useMemo(() => latestNormalization(sleepEvents), [sleepEvents]);
    const newestEvents = React.useMemo(() => [...sleepEvents].reverse(), [sleepEvents]);
    const busy = isRunning || isCheckingAvailability || isRequestingPermissions;

    const toggleExpanded = React.useCallback((id: string) => {
        setExpandedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const runDiagnostic = React.useCallback(async () => {
        if (!availability) {
            Alert.alert(
                "Salud no disponible",
                "HealthKit / Health Connect no está disponible en este dispositivo o build."
            );
            return;
        }

        setIsRunning(true);
        try {
            const status = await requestPermissions(SLEEP_HEALTH_READ_PERMISSIONS);
            if (!status.available) {
                Alert.alert("Salud no disponible", "No fue posible inicializar el proveedor de Salud.");
                return;
            }

            const sleep = await readHealthSleepByDate({ date });
            await refresh();

            if (!sleep) {
                Alert.alert(
                    "Diagnóstico completado",
                    "La consulta terminó sin sueño normalizado. Revisa el evento de Normalización para ver muestras, fuentes y motivo."
                );
                return;
            }

            Alert.alert(
                "Diagnóstico completado",
                `${sleep.timeAsleepMinutes ?? 0} min dormido · ${sleep.sourceDevice ?? "fuente sin nombre"}. No se guardó en la base de datos.`
            );
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            await refresh();
            Alert.alert("Error de diagnóstico", message);
        } finally {
            setIsRunning(false);
        }
    }, [availability, date, refresh, requestPermissions]);

    const shareDiagnostics = React.useCallback(async () => {
        if (events.length === 0) {
            Alert.alert("Sin eventos", "Todavía no hay diagnóstico para compartir.");
            return;
        }

        await Share.share({
            title: "Diagnóstico de Salud",
            message: serializeHealthDiagnostics(events),
        });
    }, [events]);

    const confirmClear = React.useCallback(() => {
        Alert.alert(
            "Limpiar diagnóstico",
            "Se eliminarán únicamente los eventos locales de diagnóstico. No se modificará Salud ni la base de datos.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Limpiar",
                    style: "destructive",
                    onPress: () => {
                        void clear();
                    },
                },
            ]
        );
    }, [clear]);

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, paddingBottom: 36, gap: 12 }}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>
                    Diagnóstico de Salud
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "600" }}>
                    Consulta Salud sin guardar datos y explica cada paso del importador.
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

                <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700" }}>
                    En iOS se consulta desde las 12:00 del día anterior hasta las 18:00 del día seleccionado y se asignan las muestras por su fecha local de finalización.
                </Text>

                <Pressable
                    onPress={() => void runDiagnostic()}
                    disabled={busy}
                    style={({ pressed }) => ({
                        backgroundColor: colors.primary,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        opacity: busy ? 0.6 : pressed ? 0.9 : 1,
                    })}
                >
                    <Text style={{ color: colors.primaryText, fontWeight: "900", textAlign: "center" }}>
                        {busy ? "Consultando..." : "Probar consulta sin guardar"}
                    </Text>
                </Pressable>

                <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                        onPress={() => void shareDiagnostics()}
                        style={({ pressed }) => ({
                            flex: 1,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            borderRadius: 12,
                            padding: 11,
                            opacity: pressed ? 0.9 : 1,
                        })}
                    >
                        <Text style={{ color: colors.text, fontWeight: "800", textAlign: "center" }}>
                            Compartir
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={confirmClear}
                        style={({ pressed }) => ({
                            flex: 1,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            borderRadius: 12,
                            padding: 11,
                            opacity: pressed ? 0.9 : 1,
                        })}
                    >
                        <Text style={{ color: colors.text, fontWeight: "800", textAlign: "center" }}>
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
                <Text style={{ color: colors.text, fontWeight: "900" }}>Estado operativo</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Provider: {provider === "healthkit" ? "HealthKit" : provider === "health-connect" ? "Health Connect" : "Sin resolver"}
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Disponible: {availability ? "Sí" : "No"}
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Eventos locales: {events.length}/{HEALTH_DIAGNOSTIC_MAX_EVENTS}
                </Text>
                <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                    Apple permite saber que la solicitud de permisos terminó, pero no confirma si cada permiso individual de lectura fue concedido.
                </Text>
            </View>

            {latest ? (
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
                    <Text style={{ color: colors.text, fontWeight: "900" }}>
                        Última normalización · {latest.targetDate}
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <Metric label="Resultado" value={latest.outcome} />
                        <Metric label="Recibidas" value={String(latest.receivedSampleCount)} />
                        <Metric label="Válidas" value={String(latest.validSampleCount)} />
                        <Metric label="Duplicadas" value={String(latest.duplicateSampleCount)} />
                        <Metric label="Día objetivo" value={String(latest.targetDateSampleCount)} />
                        <Metric label="Noche elegida" value={String(latest.targetNightSampleCount)} />
                        <Metric label="Descartadas" value={String(latest.discardedTargetDateSampleCount)} />
                        <Metric label="Dormido" value={`${latest.totals.timeAsleepMinutes ?? 0} min`} />
                        <Metric label="REM" value={`${latest.totals.remMinutes ?? 0} min`} />
                        <Metric label="Core" value={`${latest.totals.coreMinutes ?? 0} min`} />
                        <Metric label="Deep" value={`${latest.totals.deepMinutes ?? 0} min`} />
                        <Metric label="Awake" value={`${latest.totals.awakeMinutes ?? 0} min`} />
                    </View>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        Fuente seleccionada: {latest.selectedSourceKey ?? "—"}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        Fechas de finalización encontradas: {latest.availableNightKeys.join(", ") || "—"}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        Bloques de sueño detectados: {latest.nightSummaries.length}
                    </Text>
                    {latest.unknownValues.length > 0 ? (
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                            Valores no reconocidos: {latest.unknownValues.join(", ")}
                        </Text>
                    ) : null}

                    {latest.nightSummaries.length > 0 ? (
                        <View style={{ gap: 6 }}>
                            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}>
                                Bloques detectados
                            </Text>
                            {latest.nightSummaries.map((night) => (
                                <View
                                    key={`${night.startDate}-${night.endDate}`}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                        borderRadius: 10,
                                        padding: 8,
                                        gap: 2,
                                    }}
                                >
                                    <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}>
                                        {night.selected ? "Seleccionado · " : "Descartado · "}
                                        {night.meaningfulSleepMinutes} min
                                    </Text>
                                    <Text style={{ color: colors.mutedText, fontSize: 11 }}>
                                        {formatDateTime(night.startDate)} → {formatDateTime(night.endDate)}
                                    </Text>
                                    <Text style={{ color: colors.mutedText, fontSize: 11 }}>
                                        Muestras relacionadas: {night.sampleCount}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ) : null}

                    {latest.sourceSummaries.length > 0 ? (
                        <View style={{ gap: 6 }}>
                            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}>
                                Fuentes de la noche elegida
                            </Text>
                            {latest.sourceSummaries.map((source) => (
                                <View
                                    key={source.sourceKey}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                        borderRadius: 10,
                                        padding: 8,
                                        gap: 2,
                                    }}
                                >
                                    <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}>
                                        {source.sourceName ?? source.sourceId ?? "Fuente sin nombre"}
                                    </Text>
                                    <Text style={{ color: colors.mutedText, fontSize: 11 }}>
                                        {source.selected ? "Sueño principal" : "Fuente secundaria"}
                                        {source.selectedForInBed ? " · Tiempo en cama" : ""}
                                    </Text>
                                    <Text style={{ color: colors.mutedText, fontSize: 11 }}>
                                        Detallado {source.detailedStageMinutes} min · Genérico {source.genericAsleepMinutes} min · En cama {source.inBedMinutes} min · Despierto {source.awakeMinutes} min
                                    </Text>
                                </View>
                            ))}
                        </View>
                    ) : null}
                </View>
            ) : null}

            <View style={{ gap: 8 }}>
                <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>
                    Eventos
                </Text>

                {isLoading && events.length === 0 ? (
                    <View style={{ alignItems: "center", paddingVertical: 18, gap: 8 }}>
                        <ActivityIndicator />
                        <Text style={{ color: colors.mutedText }}>Cargando diagnóstico...</Text>
                    </View>
                ) : null}

                {!isLoading && events.length === 0 ? (
                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                            borderRadius: 16,
                            padding: 14,
                        }}
                    >
                        <Text style={{ color: colors.mutedText, textAlign: "center" }}>
                            Aún no hay eventos. Ejecuta una consulta o importa sueño desde la pantalla anterior.
                        </Text>
                    </View>
                ) : null}

                {newestEvents.map((event) => {
                    const expanded = expandedIds.has(event.id);
                    const levelSymbol = event.level === "error" ? "🔴" : event.level === "warning" ? "🟡" : "🟢";

                    return (
                        <Pressable
                            key={event.id}
                            onPress={() => toggleExpanded(event.id)}
                            style={({ pressed }) => ({
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                                borderRadius: 14,
                                padding: 12,
                                gap: 6,
                                opacity: pressed ? 0.92 : 1,
                            })}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Text>{levelSymbol}</Text>
                                <Text style={{ color: colors.text, fontWeight: "900", flex: 1 }}>
                                    {formatEventTitle(event)}
                                </Text>
                                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>
                                    {expanded ? "−" : "+"}
                                </Text>
                            </View>
                            <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                                {formatDateTime(event.createdAt)}
                            </Text>
                            <Text style={{ color: colors.text, fontSize: 13 }}>
                                {formatEventSummary(event)}
                            </Text>
                            {expanded ? (
                                <ScrollView horizontal>
                                    <Text
                                        selectable
                                        style={{
                                            color: colors.mutedText,
                                            fontFamily: "monospace",
                                            fontSize: 11,
                                            lineHeight: 16,
                                            paddingTop: 6,
                                        }}
                                    >
                                        {JSON.stringify(event, null, 2)}
                                    </Text>
                                </ScrollView>
                            ) : null}
                        </Pressable>
                    );
                })}
            </View>
        </ScrollView>
    );
}

function Metric(props: { label: string; value: string }) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                minWidth: "30%",
                flexGrow: 1,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: 9,
                gap: 2,
            }}
        >
            <Text style={{ color: colors.mutedText, fontSize: 11, fontWeight: "700" }}>
                {props.label}
            </Text>
            <Text style={{ color: colors.text, fontWeight: "900" }}>{props.value}</Text>
        </View>
    );
}
