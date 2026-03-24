// /src/features/daySummary/components/DaySleepSection.tsx

import React from "react";
import { StyleSheet, Text } from "react-native";

import type { SleepBlock } from "@/src/types/workoutDay.types";
import { minutesToHhMm } from "@/src/utils/dashboard/format";

import { DayDetailSection } from "./DayDetailSection";
import { DayRowItem, DayTwoColGrid } from "./DayMetricGrid";
import type { DayUiColors } from "./dayDetail.helpers";

type Props = {
    sleep: SleepBlock | null;
    colors: DayUiColors;
};

function formatMetaDate(value: string | null | undefined): string {
    if (!value) return "—";

    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
}

export function DaySleepSection({ sleep, colors }: Props) {
    return (
        <DayDetailSection title="🛌 Sueño" colors={colors}>
            {!sleep ? (
                <Text style={[styles.emptyText, { color: colors.mutedText }]}>Sin registro de sueño.</Text>
            ) : (
                <DayTwoColGrid>
                    <DayRowItem
                        label="🛌 Total dormido"
                        value={minutesToHhMm(sleep.timeAsleepMinutes ?? 0)}
                        colors={colors}
                    />
                    <DayRowItem
                        label="🏆 Sleep Score"
                        value={sleep.score !== null ? String(sleep.score) : "—"}
                        colors={colors}
                    />

                    <DayRowItem
                        label="🌙 REM"
                        value={sleep.remMinutes !== null ? minutesToHhMm(sleep.remMinutes) : "—"}
                        colors={colors}
                    />
                    <DayRowItem
                        label="🧠 Deep"
                        value={sleep.deepMinutes !== null ? minutesToHhMm(sleep.deepMinutes) : "—"}
                        colors={colors}
                    />

                    <DayRowItem
                        label="😴 Core"
                        value={sleep.coreMinutes !== null ? minutesToHhMm(sleep.coreMinutes) : "—"}
                        colors={colors}
                    />
                    <DayRowItem
                        label="👀 Despierto"
                        value={sleep.awakeMinutes !== null ? minutesToHhMm(sleep.awakeMinutes) : "—"}
                        colors={colors}
                    />

                    <DayRowItem label="⌚ Fuente" value={sleep.source ?? "—"} colors={colors} />
                    <DayRowItem label="📱 Dispositivo" value={sleep.sourceDevice ?? "—"} colors={colors} />

                    <DayRowItem
                        label="🕒 Importado"
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
    emptyText: {
        fontSize: 13,
        fontWeight: "700",
    },
});