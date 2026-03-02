// src/features/sleep/components/SleepMetricsRow.tsx
import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { SleepBlock } from "@/src/types/workoutDay.types";

function mmToHM(min: number | null): string {
    if (min === null) return "—";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${String(m).padStart(2, "0")}m`;
}

function percent(asleep: number | null, inBed: number | null): string {
    if (asleep === null || inBed === null || inBed <= 0) return "—";
    const p = Math.round((asleep / inBed) * 100);
    return `${Math.max(0, Math.min(100, p))}%`;
}

function sumPhases(s: SleepBlock | null): number | null {
    if (!s) return null;
    const parts = [s.awakeMinutes, s.remMinutes, s.coreMinutes, s.deepMinutes].filter(
        (x): x is number => typeof x === "number" && Number.isFinite(x)
    );
    if (!parts.length) return null;
    return parts.reduce((a, b) => a + b, 0);
}

export function SleepMetricsRow({ sleep }: { sleep: SleepBlock | null }) {
    const { colors } = useTheme();

    const timeAsleep = sleep?.timeAsleepMinutes ?? null;
    const timeInBed = sleep?.timeInBedMinutes ?? null;
    const eff = percent(timeAsleep, timeInBed);
    const score = sleep?.score ?? null;
    const phases = sumPhases(sleep);

    const chip = (label: string, value: string) => (
        <View
            style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                borderRadius: 14,
                paddingVertical: 10,
                paddingHorizontal: 10,
                gap: 4,
            }}
        >
            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.mutedText }}>{label}</Text>
            <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>{value}</Text>
        </View>
    );

    return (
        <View style={{ flexDirection: "column", gap: 10 }}>
            <View style={{ display: 'flex', flexDirection: 'row', gap: 10 }}>
                {chip("Tiempo dormido", mmToHM(timeAsleep))}
                {chip("Tiempo en cama", mmToHM(timeInBed))}
            </View>
            <View style={{ display: 'flex', flexDirection: 'row', gap: 5 }}>
                {chip("Eficiencia", eff)}
                {chip("Sleep Score", score === null ? "—" : String(score))}
                {chip("Suma fases", phases === null ? "—" : `${phases}m`)}
            </View>
        </View>
    );
}