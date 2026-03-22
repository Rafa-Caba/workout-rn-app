// src/features/daySummary/components/DaySessionsSection.tsx

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import type { WorkoutDay, WorkoutSession } from "@/src/types/workoutDay.types";
import { secondsToHhMm } from "@/src/utils/dashboard/format";

import { DayDetailSection } from "./DayDetailSection";
import { DayRowItem, DayTwoColGrid } from "./DayMetricGrid";
import { DaySessionCard } from "./DaySessionCard";
import type { DayUiColors } from "./dayDetail.helpers";
import { maxNullable, sumNullable } from "./dayDetail.helpers";

type Props = {
    day: WorkoutDay;
    sessions: WorkoutSession[];
    colors: DayUiColors;
    onOpenMedia: (item: MediaViewerItem) => void;
};

export function DaySessionsSection({ day, sessions, colors, onOpenMedia }: Props) {
    const sessionsCount = sessions.length;

    const totalDurationSec = sumNullable(sessions.map((session) => session.durationSeconds));
    const totalActiveKcal = sumNullable(sessions.map((session) => session.activeKcal));
    const totalKcal = sumNullable(sessions.map((session) => session.totalKcal));

    const maxHr = maxNullable(sessions.map((session) => session.maxHr));
    const avgHrValues = sessions
        .map((session) => session.avgHr)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    const avgHr =
        avgHrValues.length > 0
            ? Math.round(avgHrValues.reduce((acc, value) => acc + value, 0) / avgHrValues.length)
            : null;

    const totalSteps = sumNullable(sessions.map((session) => session.steps));
    const totalDistanceKm = sumNullable(sessions.map((session) => session.distanceKm));
    const totalElevation = sumNullable(sessions.map((session) => session.elevationGainM));

    const shouldShowDayTotals = sessionsCount > 1;

    return (
        <DayDetailSection title="🏋️ Sesiones" colors={colors}>
            {sessionsCount === 0 ? (
                <Text style={[styles.emptyText, { color: colors.mutedText }]}>Sin sesiones registradas.</Text>
            ) : (
                <>
                    {shouldShowDayTotals ? (
                        <View style={[styles.rollupCard, { borderColor: colors.border }]}>
                            <Text style={[styles.rollupTitle, { color: colors.text }]}>Totales del día</Text>

                            <DayTwoColGrid>
                                <DayRowItem label="⏱️ Duración" value={secondsToHhMm(totalDurationSec)} colors={colors} />
                                <DayRowItem
                                    label="🔥 Kcal activas"
                                    value={totalActiveKcal > 0 ? `${totalActiveKcal} kcal` : "—"}
                                    colors={colors}
                                />

                                <DayRowItem
                                    label="🍽️ Kcal totales"
                                    value={totalKcal > 0 ? `${totalKcal} kcal` : "—"}
                                    colors={colors}
                                />
                                <DayRowItem
                                    label="❤️ FC prom"
                                    value={avgHr !== null ? String(avgHr) : "—"}
                                    colors={colors}
                                />

                                <DayRowItem
                                    label="⚡ FC máx"
                                    value={maxHr !== null ? String(maxHr) : "—"}
                                    colors={colors}
                                />
                                <DayRowItem
                                    label="🚶 Pasos"
                                    value={totalSteps > 0 ? String(totalSteps) : "—"}
                                    colors={colors}
                                />

                                <DayRowItem
                                    label="📏 Distancia"
                                    value={totalDistanceKm > 0 ? `${totalDistanceKm.toFixed(2)} km` : "—"}
                                    colors={colors}
                                />
                                <DayRowItem
                                    label="⛰️ Elevación"
                                    value={totalElevation > 0 ? `${String(totalElevation)} m` : "—"}
                                    colors={colors}
                                />
                            </DayTwoColGrid>
                        </View>
                    ) : null}

                    {sessions.map((session, index) => (
                        <DaySessionCard
                            key={session.id || `${day.date}-${index}`}
                            session={session}
                            day={day}
                            colors={colors}
                            onOpenMedia={onOpenMedia}
                        />
                    ))}
                </>
            )}
        </DayDetailSection>
    );
}

const styles = StyleSheet.create({
    emptyText: {
        fontSize: 13,
        fontWeight: "700",
    },
    rollupCard: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        gap: 10,
    },
    rollupTitle: {
        fontSize: 14,
        fontWeight: "900",
    },
});