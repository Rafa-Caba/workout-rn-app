// src/features/health/cardio/components/CardioSessionMetrics.tsx

import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutSession } from "@/src/types/workoutDay.types";
import {
    formatCardioCalories,
    formatCardioDistance,
    formatCardioPace,
    formatCardioSteps,
} from "@/src/utils/health/cardio/cardioSession.helpers";

type MetricItemProps = {
    label: string;
    value: string;
};

function MetricItem({ label, value }: MetricItemProps) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                width: "48%",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 12,
                backgroundColor: colors.surface,
                gap: 4,
            }}
        >
            <Text style={{ fontSize: 12, color: colors.mutedText }}>{label}</Text>
            <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>{value}</Text>
        </View>
    );
}

type Props = {
    session: WorkoutSession;
};

function formatDuration(durationSeconds: number | null | undefined): string {
    if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        return "—";
    }

    const totalMinutes = Math.round(durationSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes} min`;
}

function formatHeartRate(value: number | null | undefined): string {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return "—";
    }

    return `${Math.round(value)} bpm`;
}

function formatCadence(value: number | null | undefined): string {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return "—";
    }

    return `${Math.round(value)} spm`;
}

function formatElevation(value: number | null | undefined): string {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return "—";
    }

    return `${Math.round(value)} m`;
}

export function CardioSessionMetrics({ session }: Props) {
    const elevationValue =
        session.cardioMetrics?.elevationGainM ??
        session.elevationGainM ??
        null;

    const cadenceValue =
        session.cardioMetrics?.cadenceRpm ??
        session.cadenceRpm ??
        null;

    return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <MetricItem label="Distancia" value={formatCardioDistance(session.distanceKm)} />
            <MetricItem label="Tiempo" value={formatDuration(session.durationSeconds)} />
            <MetricItem label="Kcal activas" value={formatCardioCalories(session.activeKcal)} />
            <MetricItem label="Pasos" value={formatCardioSteps(session.steps)} />
            <MetricItem label="HR promedio" value={formatHeartRate(session.avgHr)} />
            <MetricItem label="HR máxima" value={formatHeartRate(session.maxHr)} />
            <MetricItem label="Ritmo" value={formatCardioPace(session.paceSecPerKm)} />
            <MetricItem label="Cadencia" value={formatCadence(cadenceValue)} />
            <MetricItem label="Elevación" value={formatElevation(elevationValue)} />
        </View>
    );
}

export default CardioSessionMetrics;
