// src/features/health/cardio/screens/CardioDiagnosticsScreen.tsx
// Local Cardio diagnostics: inspect Health without saving or run the dedicated
// session CRUD sync while exposing sanitized source, route, payload and API errors.

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

import { DatePickerField } from "@/src/features/components/DatePickerField";
import { useCardioPermissions } from "@/src/hooks/health/cardio/useCardioPermissions";
import { useHealthDiagnostics } from "@/src/hooks/health/useHealthDiagnostics";
import {
    inspectCardioSessionsForDate,
    syncCardioSessionsForDate,
    type CardioInspectionResult,
    type CardioSyncResult,
} from "@/src/services/health/cardio/cardioSync.service";
import {
    HEALTH_DIAGNOSTIC_MAX_EVENTS,
    serializeHealthDiagnostics,
} from "@/src/services/health/diagnostics/healthDiagnostics.service";
import { useTheme } from "@/src/theme/ThemeProvider";
import type {
    HealthCardioDiagnosticSession,
    HealthDiagnosticEvent,
} from "@/src/types/health/healthDiagnostics.types";
import type { ISODate } from "@/src/types/workoutDay.types";
import { normalizeApiError } from "@/src/utils/api/apiErrorMessage";
import { getLocalTodayIsoDate } from "@/src/utils/dates/dateDisplay";
import {
    formatCardioCalories,
    formatCardioDistance,
    formatCardioPace,
    formatCardioSteps,
} from "@/src/utils/health/cardio/cardioSession.helpers";

type CardioDiagnosticEvent = Extract<
    HealthDiagnosticEvent,
    {
        kind:
        | "cardio-inspection"
        | "cardio-merge"
        | "cardio-persistence"
        | "cardio-sync-completed"
        | "cardio-sync-error";
    }
>;

function isISODate(value: string): value is ISODate {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function initialDate(value: string | string[] | undefined): ISODate {
    const candidate = Array.isArray(value) ? value[0] : value;
    return typeof candidate === "string" && isISODate(candidate)
        ? candidate
        : getLocalTodayIsoDate();
}

function isCardioEvent(event: HealthDiagnosticEvent): event is CardioDiagnosticEvent {
    return (
        event.kind === "cardio-inspection" ||
        event.kind === "cardio-merge" ||
        event.kind === "cardio-persistence" ||
        event.kind === "cardio-sync-completed" ||
        event.kind === "cardio-sync-error"
    );
}

function formatDuration(seconds: number | null): string {
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
        return "—";
    }

    const rounded = Math.round(seconds);
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const remainingSeconds = rounded % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`;
    if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
    return `${remainingSeconds}s`;
}

function formatNullableNumber(value: number | null, suffix = ""): string {
    return typeof value === "number" && Number.isFinite(value)
        ? `${Math.round(value * 100) / 100}${suffix}`
        : "—";
}

function eventTitle(event: CardioDiagnosticEvent): string {
    if (event.kind === "cardio-inspection") return "Lectura y normalización";
    if (event.kind === "cardio-merge") return "Plan de cambios";
    if (event.kind === "cardio-persistence") {
        return event.operation === "create" ? "POST de sesión" : "PATCH de sesión";
    }
    if (event.kind === "cardio-sync-completed") return "Sincronización completada";
    return `Error · ${event.stage}`;
}

function eventSummary(event: CardioDiagnosticEvent): string {
    if (event.kind === "cardio-inspection") {
        return `${event.importedSessionCount} importadas · ${event.routeSessionCount} con ruta · ${event.routePointCount} puntos GPS`;
    }

    if (event.kind === "cardio-merge") {
        return `${event.insertedCount} crear · ${event.updatedCount} actualizar · ${event.unchangedCount} sin cambios`;
    }

    if (event.kind === "cardio-persistence") {
        return event.saved
            ? event.message
            : `${event.message}${event.httpStatus ? ` · HTTP ${event.httpStatus}` : ""}`;
    }

    if (event.kind === "cardio-sync-completed") {
        return `${event.persistedCount} persistidas · ${event.routePointCount} puntos GPS leídos`;
    }

    return `${event.message}${event.httpStatus ? ` · HTTP ${event.httpStatus}` : ""}`;
}

function ActionButton(props: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    primary?: boolean;
}) {
    const { colors } = useTheme();

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={props.label}
            onPress={props.onPress}
            disabled={props.disabled}
            style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: props.primary ? colors.primary : colors.border,
                backgroundColor: props.primary ? colors.primary : colors.surface,
                opacity: props.disabled ? 0.55 : pressed ? 0.82 : 1,
            })}
        >
            <Text
                style={{
                    textAlign: "center",
                    fontWeight: "900",
                    color: props.primary ? colors.primaryText : colors.text,
                }}
            >
                {props.label}
            </Text>
        </Pressable>
    );
}

function MetricLine(props: { label: string; value: string }) {
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
            <Text style={{ flex: 1, color: colors.mutedText, fontWeight: "700" }}>
                {props.label}
            </Text>
            <Text
                selectable
                style={{ flex: 1, color: colors.text, fontWeight: "800", textAlign: "right" }}
            >
                {props.value}
            </Text>
        </View>
    );
}

function DiagnosticSessionCard(props: {
    session: HealthCardioDiagnosticSession;
    index: number;
    expanded: boolean;
    onToggle: () => void;
}) {
    const { colors } = useTheme();
    const { session } = props;

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 14,
                backgroundColor: colors.surface,
                gap: 8,
            }}
        >
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
                Sesión {props.index + 1} · {session.activityType}
            </Text>
            <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                {session.startAt ?? "—"} → {session.endAt ?? "—"}
            </Text>

            <MetricLine label="Entorno" value={session.cardioEnvironment ?? "sin clasificar"} />
            <MetricLine label="Tipo original" value={session.providerWorkoutType ?? "—"} />
            <MetricLine label="Dispositivo" value={session.sourceDevice ?? "—"} />
            <MetricLine label="ID externo" value={session.externalId ?? "—"} />
            <MetricLine label="Duración" value={formatDuration(session.metrics.durationSeconds)} />
            <MetricLine label="Kcal activas" value={formatCardioCalories(session.metrics.activeKcal)} />
            <MetricLine
                label="Kcal totales"
                value={`${formatCardioCalories(session.metrics.totalKcal)}${session.metrics.totalKcalEstimated ? " (estimadas)" : ""}`}
            />
            <MetricLine
                label="FC prom/máx"
                value={`${formatNullableNumber(session.metrics.avgHr)} / ${formatNullableNumber(session.metrics.maxHr)}`}
            />
            <MetricLine label="Distancia" value={formatCardioDistance(session.metrics.distanceKm)} />
            <MetricLine label="Ritmo" value={formatCardioPace(session.metrics.paceSecPerKm)} />
            <MetricLine label="Pasos" value={formatCardioSteps(session.metrics.steps)} />
            <MetricLine
                label="Elevación"
                value={formatNullableNumber(session.metrics.elevationGainM, " m")}
            />
            <MetricLine
                label="Esfuerzo RPE"
                value={formatNullableNumber(session.metrics.effortRpe)}
            />
            <MetricLine
                label="Ruta"
                value={session.route.hasRoute ? "Sí" : "No"}
            />
            <MetricLine
                label="Puntos GPS"
                value={`${session.route.pointCount}${session.route.pointsTruncated ? ` · vista ${session.route.pointsStored}` : ""}`}
            />

            {!session.route.hasRoute || session.route.pointCount === 0 ? (
                <Text style={{ color: colors.mutedText, fontSize: 12, lineHeight: 18 }}>
                    HealthKit no devolvió puntos GPS para esta sesión. Revisa el permiso de rutas de entrenamiento; el diagnóstico consulta HKWorkoutRoute usando el ID del workout.
                </Text>
            ) : null}

            <ActionButton
                label={props.expanded ? "Ocultar JSON sanitizado" : "Ver JSON sanitizado"}
                onPress={props.onToggle}
            />

            {props.expanded ? (
                <Text
                    selectable
                    style={{ color: colors.mutedText, fontFamily: "Courier", fontSize: 10 }}
                >
                    {JSON.stringify(session, null, 2)}
                </Text>
            ) : null}
        </View>
    );
}

export default function CardioDiagnosticsScreen() {
    const params = useLocalSearchParams<{ date?: string | string[] }>();
    const { colors } = useTheme();
    const permissions = useCardioPermissions();
    const { events, isLoading, refresh, clear } = useHealthDiagnostics();

    const [date, setDate] = React.useState<ISODate>(() => initialDate(params.date));
    const [runningMode, setRunningMode] = React.useState<"inspect" | "sync" | null>(null);
    const [inspection, setInspection] = React.useState<CardioInspectionResult | null>(null);
    const [syncResult, setSyncResult] = React.useState<CardioSyncResult | null>(null);
    const [expandedSessionIndexes, setExpandedSessionIndexes] = React.useState<Set<number>>(
        () => new Set<number>()
    );
    const [expandedEventIds, setExpandedEventIds] = React.useState<Set<string>>(
        () => new Set<string>()
    );

    const cardioEvents = React.useMemo(
        () => events.filter(isCardioEvent).reverse(),
        [events]
    );

    const latestInspectionEvent = React.useMemo(() => {
        for (const event of cardioEvents) {
            if (event.kind === "cardio-inspection" && event.targetDate === date) {
                return event;
            }
        }
        return null;
    }, [cardioEvents, date]);

    const latestTerminalEvent = React.useMemo(() => {
        for (const event of cardioEvents) {
            if (event.targetDate !== date) {
                continue;
            }

            if (
                event.kind === "cardio-inspection" ||
                event.kind === "cardio-sync-completed" ||
                event.kind === "cardio-sync-error"
            ) {
                return event;
            }
        }

        return null;
    }, [cardioEvents, date]);

    // Do not keep rendering an older failure after a newer inspection or sync
    // for the same day completed successfully. The full event history remains
    // available below for troubleshooting.
    const latestError =
        latestTerminalEvent?.kind === "cardio-sync-error"
            ? latestTerminalEvent
            : null;

    const latestSessions = latestInspectionEvent?.sessions ?? [];
    const busy = runningMode !== null || permissions.isLoading;

    async function ensurePermissions(): Promise<boolean> {
        if (permissions.isGranted) return true;

        const status = await permissions.requestPermissions();
        return status.available;
    }

    async function runInspection(): Promise<void> {
        setRunningMode("inspect");
        try {
            const canRead = await ensurePermissions();
            if (!canRead) {
                Alert.alert("Salud no disponible", "No se pudo inicializar el proveedor de salud.");
                return;
            }

            const result = await inspectCardioSessionsForDate({
                date,
                includeRoutes: true,
            });
            setInspection(result);
            setSyncResult(null);
            await refresh();

            Alert.alert(
                "Diagnóstico completado",
                result.importedSessions.length > 0
                    ? `${result.importedSessions.length} sesión(es) leídas · ${result.routePointCount} puntos GPS. No se guardó nada.`
                    : "Health no devolvió sesiones para esta fecha. No se guardó nada."
            );
        } catch (error: unknown) {
            const normalized = normalizeApiError(error);
            await refresh();
            Alert.alert("Error de diagnóstico", normalized.message);
        } finally {
            setRunningMode(null);
        }
    }

    async function runSync(): Promise<void> {
        setRunningMode("sync");
        try {
            const canRead = await ensurePermissions();
            if (!canRead) {
                Alert.alert("Salud no disponible", "No se pudo inicializar el proveedor de salud.");
                return;
            }

            const result = await syncCardioSessionsForDate({
                date,
                includeRoutes: true,
            });
            setSyncResult(result);
            setInspection({
                provider: result.provider,
                date: result.date,
                includeRoutes: true,
                importedSessions: result.importedSessions,
                mappedSessions: result.mappedSessions,
                existingDay: result.day,
                existingSessions: result.persistedSessions,
                routeSessionCount: result.importedSessions.filter(
                    (session) => session.route?.hasRoute === true
                ).length,
                routePointCount: result.importedSessions.reduce(
                    (total, session) => total + (session.route?.points?.length ?? 0),
                    0
                ),
            });
            await refresh();

            Alert.alert(
                "Sincronización completada",
                `${result.insertedCount} creada(s) · ${result.updatedCount} actualizada(s) · ${result.unchangedCount} sin cambios.`
            );
        } catch (error: unknown) {
            const normalized = normalizeApiError(error);
            await refresh();
            Alert.alert("Error al sincronizar", normalized.message);
        } finally {
            setRunningMode(null);
        }
    }

    async function shareDiagnostics(): Promise<void> {
        await Share.share({
            title: `Diagnóstico de cardio ${date}`,
            message: serializeHealthDiagnostics(events),
        });
    }

    function toggleSession(index: number): void {
        setExpandedSessionIndexes((current) => {
            const next = new Set(current);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    }

    function toggleEvent(id: string): void {
        setExpandedEventIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 36 }}
            refreshControl={
                <RefreshControl refreshing={isLoading} onRefresh={() => void refresh()} />
            }
        >
            <View style={{ gap: 4 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900" }}>
                    Diagnóstico de cardio
                </Text>
                <Text style={{ color: colors.mutedText, lineHeight: 20 }}>
                    Revisa lectura, normalización, rutas GPS y payloads del API. La consulta simple no modifica la base de datos.
                </Text>
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 16,
                    padding: 14,
                    backgroundColor: colors.surface,
                    gap: 10,
                }}
            >
                <DatePickerField
                    label="Día a diagnosticar"
                    value={date}
                    onChange={(nextDate) => {
                        if (isISODate(nextDate)) setDate(nextDate);
                    }}
                    disabled={busy}
                    displayFormat="dd/MM/yyyy"
                />

                <ActionButton
                    label={runningMode === "inspect" ? "Consultando Health…" : "Consultar Health sin guardar"}
                    onPress={() => void runInspection()}
                    disabled={busy}
                    primary
                />
                <ActionButton
                    label={runningMode === "sync" ? "Sincronizando…" : "Sincronizar y guardar"}
                    onPress={() => void runSync()}
                    disabled={busy}
                />

                <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <ActionButton
                            label="Compartir JSON"
                            onPress={() => void shareDiagnostics()}
                            disabled={busy}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <ActionButton
                            label="Limpiar log"
                            onPress={() => void clear()}
                            disabled={busy}
                        />
                    </View>
                </View>
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 16,
                    padding: 14,
                    backgroundColor: colors.surface,
                    gap: 7,
                }}
            >
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>
                    Resumen
                </Text>
                <MetricLine label="Proveedor" value={inspection?.provider ?? latestInspectionEvent?.provider ?? "—"} />
                <MetricLine label="Sesiones existentes" value={String(latestInspectionEvent?.existingSessionCount ?? inspection?.existingSessions.length ?? 0)} />
                <MetricLine label="Sesiones importadas" value={String(latestInspectionEvent?.importedSessionCount ?? inspection?.importedSessions.length ?? 0)} />
                <MetricLine label="Sesiones con ruta" value={String(latestInspectionEvent?.routeSessionCount ?? inspection?.routeSessionCount ?? 0)} />
                <MetricLine label="Puntos GPS" value={String(latestInspectionEvent?.routePointCount ?? inspection?.routePointCount ?? 0)} />
                <MetricLine label="Creadas" value={String(syncResult?.insertedCount ?? 0)} />
                <MetricLine label="Actualizadas" value={String(syncResult?.updatedCount ?? 0)} />
                <MetricLine label="Sin cambios" value={String(syncResult?.unchangedCount ?? 0)} />
                <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                    Eventos locales: {events.length}/{HEALTH_DIAGNOSTIC_MAX_EVENTS}
                </Text>
            </View>

            {latestError ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.danger ?? colors.border,
                        borderRadius: 16,
                        padding: 14,
                        backgroundColor: colors.surface,
                        gap: 6,
                    }}
                >
                    <Text style={{ color: colors.danger ?? colors.text, fontWeight: "900" }}>
                        Último error · {latestError.stage}
                    </Text>
                    <Text selectable style={{ color: colors.text }}>
                        {latestError.message}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        HTTP {latestError.httpStatus ?? "—"} · código {latestError.apiCode ?? "—"}
                    </Text>
                    {latestError.validationDetails ? (
                        <Text selectable style={{ color: colors.mutedText, fontFamily: "Courier", fontSize: 10 }}>
                            {JSON.stringify(latestError.validationDetails, null, 2)}
                        </Text>
                    ) : null}
                </View>
            ) : null}

            <View style={{ gap: 10 }}>
                <Text style={{ color: colors.text, fontSize: 19, fontWeight: "900" }}>
                    Sesiones leídas de Health
                </Text>
                {latestSessions.length === 0 ? (
                    <Text style={{ color: colors.mutedText }}>
                        Ejecuta “Consultar Health sin guardar” para ver las muestras de la fecha.
                    </Text>
                ) : (
                    latestSessions.map((session, index) => (
                        <DiagnosticSessionCard
                            key={`${session.externalId ?? session.startAt ?? "cardio"}-${index}`}
                            session={session}
                            index={index}
                            expanded={expandedSessionIndexes.has(index)}
                            onToggle={() => toggleSession(index)}
                        />
                    ))
                )}
            </View>

            <View style={{ gap: 10 }}>
                <Text style={{ color: colors.text, fontSize: 19, fontWeight: "900" }}>
                    Eventos de cardio
                </Text>
                {isLoading ? <ActivityIndicator /> : null}
                {cardioEvents.length === 0 ? (
                    <Text style={{ color: colors.mutedText }}>Todavía no hay eventos de cardio.</Text>
                ) : null}

                {cardioEvents.map((event) => {
                    const expanded = expandedEventIds.has(event.id);
                    return (
                        <Pressable
                            key={event.id}
                            accessibilityRole="button"
                            accessibilityLabel={`${eventTitle(event)}. ${expanded ? "Ocultar" : "Mostrar"} JSON`}
                            onPress={() => toggleEvent(event.id)}
                            style={({ pressed }) => ({
                                minHeight: 44,
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 14,
                                padding: 12,
                                backgroundColor: colors.surface,
                                gap: 5,
                                opacity: pressed ? 0.82 : 1,
                            })}
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
                                    style={{ color: colors.mutedText, fontFamily: "Courier", fontSize: 10 }}
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
