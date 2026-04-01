// /src/features/daySummary/components/DaySessionCard.tsx

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { WorkoutDay, WorkoutSession } from "@/src/types/workoutDay.types";

import { DayRowItem, DayTwoColGrid } from "./DayMetricGrid";
import { DaySessionExerciseCard } from "./DaySessionExerciseCard";
import { DaySessionMediaGrid } from "./DaySessionMediaGrid";
import type { DayUiColors } from "./dayDetail.helpers";
import {
    normalizeExercises,
    normalizeMedia,
    safeDecimal,
    safePace,
    safeTime,
    sessionDisplayDayEffort,
    sessionDisplayDevice,
    sessionDisplayNote,
    sessionDisplaySource,
    sessionDisplayTitle,
    toViewerItem,
} from "./dayDetail.helpers";

type Props = {
    session: WorkoutSession;
    day: WorkoutDay;
    colors: DayUiColors;
    onOpenMedia: ReturnType<typeof buildOpenMediaHandler>;
};

function buildOpenMediaHandler(
    openViewer: (item: ReturnType<typeof toViewerItem>) => void,
    day: WorkoutDay,
    session: WorkoutSession
) {
    return (mediaIndexItem: Parameters<typeof toViewerItem>[0]) => {
        openViewer(
            toViewerItem(mediaIndexItem, {
                date: day.date,
                sessionType: session.type ?? null,
            })
        );
    };
}

function formatDuration(durationSeconds: number | null): string {
    if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        return "—";
    }

    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.round((durationSeconds % 3600) / 60);

    return `${hours}h ${minutes}m`;
}

export function DaySessionCard({ session, day, colors, onOpenMedia }: Props) {
    const exercises = normalizeExercises(session);
    const media = normalizeMedia(session);
    const setsCount = exercises.reduce(
        (acc, exercise) => acc + (Array.isArray(exercise.sets) ? exercise.sets.length : 0),
        0
    );

    return (
        <View style={[styles.sessionCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.sessionHeader}>
                <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>
                    🏷️ {sessionDisplayTitle(session)}
                </Text>

                <Text style={[styles.sessionMeta, { color: colors.mutedText }]} numberOfLines={1}>
                    {sessionDisplayNote(session)}
                </Text>
            </View>

            <DayTwoColGrid>
                <DayRowItem label="🟢 Inicio" value={safeTime(session.startAt)} colors={colors} />
                <DayRowItem label="🔴 Fin" value={safeTime(session.endAt)} colors={colors} />

                <DayRowItem
                    label="⏱️ Duración"
                    value={formatDuration(session.durationSeconds)}
                    colors={colors}
                />
                <DayRowItem
                    label="🎯 RPE sesión"
                    value={session.effortRpe !== null ? String(session.effortRpe) : "—"}
                    colors={colors}
                />

                <DayRowItem
                    label="🔥 Activas"
                    value={session.activeKcal !== null ? `${session.activeKcal} kcal` : "—"}
                    colors={colors}
                />

                <DayRowItem
                    label="🍽️ Totales"
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
                    label="📈 RPE del día"
                    value={sessionDisplayDayEffort(session)}
                    colors={colors}
                />

                <DayRowItem
                    label="⌚ Dispositivo"
                    value={sessionDisplayDevice(session)}
                    colors={colors}
                />
                <DayRowItem
                    label="📦 Fuente"
                    value={sessionDisplaySource(session)}
                    colors={colors}
                />

                <DayRowItem label="🖼️ Media" value={String(media.length)} colors={colors} />
                <DayRowItem label="🏋️ Ejercicios" value={String(exercises.length)} colors={colors} />

                <DayRowItem label="📦 Sets" value={String(setsCount)} colors={colors} />
                <DayRowItem
                    label="🧾 Tipo"
                    value={session.type?.trim() ? session.type : "—"}
                    colors={colors}
                />
            </DayTwoColGrid>

            <View style={[styles.exercisesBox, { borderColor: colors.border }]}>
                <Text style={[styles.exercisesTitle, { color: colors.text }]}>🏋️ Ejercicios</Text>

                {exercises.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.mutedText }]}>Sin ejercicios en esta sesión.</Text>
                ) : (
                    <View style={styles.exercisesList}>
                        {exercises.map((exercise) => (
                            <DaySessionExerciseCard key={exercise.id} exercise={exercise} colors={colors} />
                        ))}
                    </View>
                )}
            </View>

            <View style={[styles.mediaBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.mediaTitle, { color: colors.text }]}>🖼️ Media</Text>

                {media.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.mutedText }]}>Sin media en esta sesión.</Text>
                ) : (
                    <DaySessionMediaGrid items={media} colors={colors} onPress={onOpenMedia} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    sessionCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        gap: 10,
    },
    sessionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 10,
    },
    sessionTitle: {
        fontSize: 14,
        fontWeight: "900",
        flex: 1,
    },
    sessionMeta: {
        fontSize: 12,
        fontWeight: "800",
        flex: 1,
        textAlign: "right",
    },
    exercisesBox: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        gap: 10,
    },
    exercisesTitle: {
        fontSize: 14,
        fontWeight: "900",
    },
    exercisesList: {
        gap: 10,
    },
    mediaBox: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        gap: 10,
    },
    mediaTitle: {
        fontSize: 14,
        fontWeight: "900",
    },
    emptyText: {
        fontSize: 13,
        fontWeight: "700",
    },
});