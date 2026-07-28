// /src/features/daySummary/components/DaySleepSection.tsx

/**
 * Sleep panel for the unified day detail.
 * It mirrors the useful web explorer values while keeping unavailable metrics
 * explicit instead of inventing data.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SleepBlock } from "@/src/types/workoutDay.types";
import { minutesToHhMm } from "@/src/utils/dashboard/format";

import { DayDetailSection } from "./DayDetailSection";
import { DayRowItem, DayTwoColGrid } from "./DayMetricGrid";
import type { DayUiColors } from "./dayDetail.helpers";
import { formatMetaDate, isFiniteNumber } from "./dayDetail.helpers";

type Props = {
    sleep: SleepBlock | null;
    colors: DayUiColors;
};

function hasMeaningfulSleep(sleep: SleepBlock | null): boolean {
    if (!sleep) return false;

    return [
        sleep.timeAsleepMinutes,
        sleep.timeInBedMinutes,
        sleep.score,
        sleep.awakeMinutes,
        sleep.remMinutes,
        sleep.coreMinutes,
        sleep.deepMinutes,
    ].some((value) => isFiniteNumber(value));
}

function formatMinutes(value: number | null): string {
    return isFiniteNumber(value) ? minutesToHhMm(value) : "—";
}

function formatPercent(value: number | null): string {
    return isFiniteNumber(value) ? `${Math.round(value)}%` : "—";
}

function calculateStagePercent(stageMinutes: number | null, totalMinutes: number | null): number | null {
    if (!isFiniteNumber(stageMinutes) || !isFiniteNumber(totalMinutes) || totalMinutes <= 0) {
        return null;
    }

    return (stageMinutes / totalMinutes) * 100;
}

function calculateEfficiency(sleep: SleepBlock): number | null {
    if (
        !isFiniteNumber(sleep.timeAsleepMinutes) ||
        !isFiniteNumber(sleep.timeInBedMinutes) ||
        sleep.timeInBedMinutes <= 0
    ) {
        return null;
    }

    return Math.min(100, (sleep.timeAsleepMinutes / sleep.timeInBedMinutes) * 100);
}

export function DaySleepSection({ sleep, colors }: Props) {
    const available = hasMeaningfulSleep(sleep);

    return (
        <DayDetailSection title="🛌 Sueño" colors={colors}>
            {!available || !sleep ? (
                <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin registro de sueño</Text>
                    <Text style={[styles.emptyText, { color: colors.mutedText }]}>Cuando HealthKit, Health Connect o un registro manual tenga datos para este día, aparecerán aquí.</Text>
                </View>
            ) : (
                <DayTwoColGrid>
                    <DayRowItem
                        label="🛌 Total dormido"
                        value={formatMinutes(sleep.timeAsleepMinutes)}
                        colors={colors}
                    />
                    <DayRowItem
                        label="🏆 Sleep Score"
                        value={isFiniteNumber(sleep.score) ? String(sleep.score) : "—"}
                        colors={colors}
                    />

                    <DayRowItem
                        label="💤 Eficiencia"
                        value={formatPercent(calculateEfficiency(sleep))}
                        colors={colors}
                    />
                    <DayRowItem label="🔄 Readiness" value="—" colors={colors} />

                    <DayRowItem
                        label="🧠 REM %"
                        value={formatPercent(
                            calculateStagePercent(sleep.remMinutes, sleep.timeAsleepMinutes)
                        )}
                        colors={colors}
                    />
                    <DayRowItem
                        label="🌙 Deep %"
                        value={formatPercent(
                            calculateStagePercent(sleep.deepMinutes, sleep.timeAsleepMinutes)
                        )}
                        colors={colors}
                    />

                    <DayRowItem
                        label="😴 Ligero / Core"
                        value={formatMinutes(sleep.coreMinutes)}
                        colors={colors}
                    />
                    <DayRowItem
                        label="⏱️ Despierto"
                        value={formatMinutes(sleep.awakeMinutes)}
                        colors={colors}
                    />

                    <DayRowItem label="📡 Fuente" value={sleep.source ?? "—"} colors={colors} />
                    <DayRowItem
                        label="⌚ Dispositivo origen"
                        value={sleep.sourceDevice ?? "—"}
                        colors={colors}
                    />

                    <DayRowItem
                        label="⬇️ Importado"
                        value={formatMetaDate(sleep.importedAt)}
                        colors={colors}
                    />
                    <DayRowItem
                        label="🔄 Último sync"
                        value={formatMetaDate(sleep.lastSyncedAt)}
                        colors={colors}
                    />
                </DayTwoColGrid>
            )}
        </DayDetailSection>
    );
}

const styles = StyleSheet.create({
    emptyState: {
        borderWidth: 1,
        borderStyle: "dashed",
        borderRadius: 14,
        padding: 14,
        gap: 5,
    },
    emptyTitle: {
        fontSize: 13,
        fontWeight: "900",
    },
    emptyText: {
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 18,
    },
});
