// /src/features/daySummary/components/DaySessionCard.tsx

/**
 * Collapsible session card for the unified day detail.
 *
 * Gym and Cardio share the same shell, but each category renders only the
 * metrics that are meaningful for it. Cardio additionally renders the route
 * map when persisted coordinates are available.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import CardioRouteMap from "@/src/features/health/cardio/components/CardioRouteMap";
import type { WorkoutSession } from "@/src/types/workoutDay.types";

import { DayPill, DayRowItem, DayTwoColGrid } from "./DayMetricGrid";
import { DaySessionExerciseCard } from "./DaySessionExerciseCard";
import { DaySessionMediaGrid } from "./DaySessionMediaGrid";
import type { DayUiColors } from "./dayDetail.helpers";
import {
    countExerciseSets,
    formatDurationSeconds,
    formatMetaDate,
    isCardioSession,
    isFiniteNumber,
    normalizeExercises,
    normalizeMedia,
    safeDecimal,
    safePace,
    safeTime,
    sessionDisplayActivity,
    sessionDisplayDayEffort,
    sessionDisplayDevice,
    sessionDisplayKind,
    sessionDisplayNote,
    sessionDisplaySource,
    sessionDisplayTitle,
    toViewerItem,
} from "./dayDetail.helpers";

type Props = {
    session: WorkoutSession;
    date: string;
    colors: DayUiColors;
    onOpenMedia: (item: MediaViewerItem) => void;
};

function SessionTag(props: { label: string; colors: DayUiColors }) {
    return <DayPill label={props.label} colors={props.colors} />;
}

export function DaySessionCard({ session, date, colors, onOpenMedia }: Props) {
    const [open, setOpen] = React.useState(true);
    const [showExercises, setShowExercises] = React.useState(false);

    const cardio = isCardioSession(session);
    const exercises = normalizeExercises(session);
    const media = normalizeMedia(session);
    const setsCount = countExerciseSets(session);
    const activityLabel = sessionDisplayActivity(session);
    const averageSpeedKmh = session.cardioMetrics?.avgSpeedKmh ?? null;
    const maxSpeedKmh = session.cardioMetrics?.maxSpeedKmh ?? null;
    const strideLengthM = session.cardioMetrics?.strideLengthM ?? null;
    const totalKcalLabel = session.meta?.totalKcalEstimated
        ? "🍽️ Totales estimadas"
        : "🍽️ Totales";

    const openMedia = React.useCallback(
        (mediaItem: Parameters<typeof toViewerItem>[0]) => {
            onOpenMedia(
                toViewerItem(mediaItem, {
                    date,
                    sessionType: session.type ?? null,
                })
            );
        },
        [date, onOpenMedia, session.type]
    );

    return (
        <View style={[styles.sessionCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={open ? "Colapsar sesión" : "Expandir sesión"}
                onPress={() => setOpen((current) => !current)}
                style={({ pressed }) => [styles.sessionHeader, { opacity: pressed ? 0.74 : 1 }]}
            >
                <View style={[styles.collapseButton, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Text style={[styles.collapseButtonText, { color: colors.text }]}>{open ? "−" : "+"}</Text>
                </View>

                <View style={styles.sessionHeaderText}>
                    <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={2}>
                        Día: {sessionDisplayTitle(session)}
                    </Text>
                    <Text style={[styles.sessionHint, { color: colors.mutedText }]}>
                        {open ? "Toca para colapsar esta sesión" : "Toca para ver métricas y detalles"}
                    </Text>
                    {sessionDisplayNote(session) !== "Sin notas" ? (
                        <Text style={[styles.sessionNote, { color: colors.text }]} numberOfLines={3}>
                            {sessionDisplayNote(session)}
                        </Text>
                    ) : null}
                </View>
            </Pressable>

            {open ? (
                <View style={[styles.sessionBody, { borderTopColor: colors.border }]}>
                    <View style={styles.tagsRow}>
                        <SessionTag label={cardio ? "🚶 Cardio" : "🏋️ Gym / Training"} colors={colors} />
                        {activityLabel ? <SessionTag label={activityLabel} colors={colors} /> : null}
                        <SessionTag label={sessionDisplayKind(session)} colors={colors} />
                        <SessionTag label={sessionDisplaySource(session)} colors={colors} />
                    </View>

                    <DayTwoColGrid>
                        <DayRowItem
                            label="⏱️ Duración"
                            value={formatDurationSeconds(session.durationSeconds)}
                            colors={colors}
                        />
                        <DayRowItem label="📎 Media" value={String(media.length)} colors={colors} />

                        <DayRowItem
                            label="🔥 Calorías activas"
                            value={session.activeKcal !== null ? `${session.activeKcal} kcal` : "—"}
                            colors={colors}
                        />
                        <DayRowItem
                            label={totalKcalLabel}
                            value={session.totalKcal !== null ? `${session.totalKcal} kcal` : "—"}
                            colors={colors}
                        />

                        <DayRowItem
                            label="❤️ FC prom"
                            value={session.avgHr !== null ? String(session.avgHr) : "—"}
                            colors={colors}
                        />
                        <DayRowItem
                            label="⚡ FC máx"
                            value={session.maxHr !== null ? String(session.maxHr) : "—"}
                            colors={colors}
                        />

                        {cardio ? (
                            <>
                                <DayRowItem
                                    label="🚶 Pasos"
                                    value={session.steps !== null ? String(session.steps) : "—"}
                                    colors={colors}
                                />
                                <DayRowItem
                                    label="📏 Distancia"
                                    value={session.distanceKm !== null ? `${safeDecimal(session.distanceKm, 2)} km` : "—"}
                                    colors={colors}
                                />

                                <DayRowItem
                                    label="⛰️ Elevación"
                                    value={session.elevationGainM !== null ? `${session.elevationGainM} m` : "—"}
                                    colors={colors}
                                />
                                <DayRowItem
                                    label="⏱️ Ritmo"
                                    value={safePace(session.paceSecPerKm)}
                                    colors={colors}
                                />

                                <DayRowItem
                                    label="🎶 Cadencia"
                                    value={session.cadenceRpm !== null ? `${String(session.cadenceRpm)} rpm` : "—"}
                                    colors={colors}
                                />
                                <DayRowItem
                                    label="🎯 RPE"
                                    value={session.effortRpe !== null ? String(session.effortRpe) : "—"}
                                    colors={colors}
                                />
                                <DayRowItem
                                    label="📈 Vel. prom"
                                    value={
                                        isFiniteNumber(averageSpeedKmh)
                                            ? `${safeDecimal(averageSpeedKmh, 2)} km/h`
                                            : "—"
                                    }
                                    colors={colors}
                                />
                                <DayRowItem
                                    label="⚡ Vel. máx"
                                    value={
                                        isFiniteNumber(maxSpeedKmh)
                                            ? `${safeDecimal(maxSpeedKmh, 2)} km/h`
                                            : "—"
                                    }
                                    colors={colors}
                                />
                                <DayRowItem
                                    label="👣 Zancada"
                                    value={
                                        isFiniteNumber(strideLengthM)
                                            ? `${safeDecimal(strideLengthM, 2)} m`
                                            : "—"
                                    }
                                    colors={colors}
                                />
                                <DayRowItem
                                    label="🗺️ Ruta"
                                    value={session.hasRoute ? "Sí" : "No"}
                                    colors={colors}
                                />
                                <DayRowItem
                                    label="📍 Puntos de ruta"
                                    value={String(
                                        session.routeSummary?.pointCount ??
                                        session.routePoints?.length ??
                                        0
                                    )}
                                    colors={colors}
                                />
                            </>
                        ) : (
                            <>
                                <DayRowItem
                                    label="🎯 RPE sesión"
                                    value={session.effortRpe !== null ? String(session.effortRpe) : "—"}
                                    colors={colors}
                                />
                                <DayRowItem
                                    label="📈 RPE del día"
                                    value={sessionDisplayDayEffort(session)}
                                    colors={colors}
                                />

                                <DayRowItem label="🏋️ Ejercicios" value={String(exercises.length)} colors={colors} />
                                <DayRowItem label="📦 Sets" value={String(setsCount)} colors={colors} />
                            </>
                        )}

                        <DayRowItem label="🟢 Inicio" value={safeTime(session.startAt)} colors={colors} />
                        <DayRowItem label="🔴 Fin" value={safeTime(session.endAt)} colors={colors} />

                        <DayRowItem
                            label="⬇️ Importado"
                            value={formatMetaDate(session.meta?.importedAt)}
                            colors={colors}
                        />
                        <DayRowItem
                            label="🔄 Último sync"
                            value={formatMetaDate(session.meta?.lastSyncedAt)}
                            colors={colors}
                        />

                        <DayRowItem
                            label="⌚ Dispositivo origen"
                            value={sessionDisplayDevice(session)}
                            colors={colors}
                        />
                        <DayRowItem
                            label="🆔 ID externo"
                            value={session.meta?.externalId ?? session.meta?.healthExternalId ?? "—"}
                            colors={colors}
                        />
                    </DayTwoColGrid>

                    {!cardio ? (
                        <View style={[styles.exercisesBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                            <View style={styles.exercisesHeader}>
                                <Text style={[styles.exercisesTitle, { color: colors.text }]}>Lista de ejercicios ({exercises.length})</Text>
                                {exercises.length > 0 ? (
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={() => setShowExercises((current) => !current)}
                                        style={({ pressed }) => [
                                            styles.outlineButton,
                                            { borderColor: colors.border, opacity: pressed ? 0.72 : 1 },
                                        ]}
                                    >
                                        <Text style={[styles.outlineButtonText, { color: colors.text }]}>
                                            {showExercises ? "Ocultar" : "Mostrar"}
                                        </Text>
                                    </Pressable>
                                ) : null}
                            </View>

                            {exercises.length === 0 ? (
                                <Text style={[styles.emptyText, { color: colors.mutedText }]}>Sin ejercicios en esta sesión.</Text>
                            ) : showExercises ? (
                                <View style={styles.exercisesList}>
                                    {exercises.map((exercise) => (
                                        <DaySessionExerciseCard key={exercise.id} exercise={exercise} colors={colors} />
                                    ))}
                                </View>
                            ) : (
                                <Text style={[styles.helperText, { color: colors.mutedText }]}>Toca “Mostrar” para revisar ejercicios y sets reales.</Text>
                            )}
                        </View>
                    ) : null}

                    {cardio && session.hasRoute ? (
                        <View style={styles.routeBox}>
                            <View style={styles.routeHeader}>
                                <Text style={[styles.routeTitle, { color: colors.text }]}>Mapa de ruta</Text>
                                <Text style={[styles.routeMeta, { color: colors.mutedText }]}>
                                    {session.routeSummary?.pointCount ?? session.routePoints?.length ?? 0} puntos GPS
                                </Text>
                            </View>
                            <CardioRouteMap
                                hasRoute={session.hasRoute}
                                routeSummary={session.routeSummary}
                                routePoints={session.routePoints}
                                height={230}
                            />
                        </View>
                    ) : null}

                    {media.length > 0 ? (
                        <View style={[styles.mediaBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                            <Text style={[styles.mediaTitle, { color: colors.text }]}>Media</Text>
                            <DaySessionMediaGrid items={media} colors={colors} onPress={openMedia} />
                        </View>
                    ) : (
                        <Text style={[styles.noMediaText, { color: colors.mutedText }]}>Sin media en esta sesión.</Text>
                    )}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    sessionCard: {
        borderWidth: 1,
        borderRadius: 16,
        overflow: "hidden",
    },
    sessionHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        padding: 12,
    },
    collapseButton: {
        width: 30,
        height: 30,
        borderWidth: 1,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    collapseButtonText: {
        fontSize: 20,
        fontWeight: "700",
        lineHeight: 22,
    },
    sessionHeaderText: {
        flex: 1,
        gap: 4,
    },
    sessionTitle: {
        fontSize: 15,
        fontWeight: "900",
        lineHeight: 20,
    },
    sessionHint: {
        fontSize: 11,
        fontWeight: "600",
    },
    sessionNote: {
        marginTop: 3,
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 18,
    },
    sessionBody: {
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 11,
        padding: 12,
    },
    tagsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 7,
    },
    exercisesBox: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 11,
        gap: 10,
    },
    exercisesHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    exercisesTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: "900",
    },
    outlineButton: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 11,
        paddingVertical: 8,
    },
    outlineButtonText: {
        fontSize: 12,
        fontWeight: "900",
    },
    exercisesList: {
        gap: 10,
    },
    helperText: {
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 18,
    },
    emptyText: {
        fontSize: 12,
        fontWeight: "700",
    },
    routeBox: {
        gap: 8,
    },
    routeHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    routeTitle: {
        fontSize: 14,
        fontWeight: "900",
    },
    routeMeta: {
        fontSize: 11,
        fontWeight: "700",
    },
    mediaBox: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 11,
        gap: 10,
    },
    mediaTitle: {
        fontSize: 14,
        fontWeight: "900",
    },
    noMediaText: {
        fontSize: 12,
        fontWeight: "600",
    },
});
