// src/features/progress/components/progressFormatters.ts
import type {
    WorkoutExerciseComparisonBasis,
    WorkoutProgressComparisonRange,
    WorkoutProgressMetric,
    WorkoutProgressValueUnit,
} from "@/src/types/workoutProgress.types";

export function formatRangeLabel(range: WorkoutProgressComparisonRange): string {
    return `${range.from} → ${range.to}`;
}

export function formatUnitValue(
    value: number | null,
    unit: WorkoutProgressValueUnit
): string {
    if (value === null || Number.isNaN(value)) {
        return "—";
    }

    switch (unit) {
        case "seconds": {
            const totalMinutes = Math.round(value / 60);
            if (totalMinutes < 60) {
                return `${totalMinutes} min`;
            }

            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }

        case "minutes":
            return `${Math.round(value)} min`;

        case "kcal":
            return `${Math.round(value)} kcal`;

        case "bpm":
            return `${Math.round(value)} bpm`;

        case "km":
            return `${value.toFixed(1)} km`;

        case "steps":
            return Intl.NumberFormat("es-MX").format(Math.round(value));

        case "percent":
            return `${value.toFixed(1)}%`;

        case "score":
            return `${Math.round(value)}`;

        case "load":
            return `${value.toFixed(1)} lb`;

        case "reps":
            return `${Math.round(value)} reps`;

        case "sets":
            return `${Math.round(value)} sets`;

        case "volume":
            return Intl.NumberFormat("es-MX", {
                maximumFractionDigits: 0,
            }).format(value);

        case "days":
            return `${Math.round(value)} días`;

        case "count":
        default:
            return Intl.NumberFormat("es-MX", {
                maximumFractionDigits: 0,
            }).format(Math.round(value));
    }
}

export function formatMetricValue(metric: WorkoutProgressMetric): string {
    return formatUnitValue(metric.current, metric.unit);
}

export function formatMetricDelta(metric: WorkoutProgressMetric): string {
    if (metric.delta === null && metric.percentDelta === null) {
        return "Sin comparación";
    }

    const deltaPrefix = (metric.delta ?? 0) > 0 ? "+" : "";
    const pctPrefix = (metric.percentDelta ?? 0) > 0 ? "+" : "";

    if (metric.unit === "percent") {
        return `${pctPrefix}${(metric.delta ?? 0).toFixed(1)} pts`;
    }

    if (metric.percentDelta !== null) {
        return `${pctPrefix}${metric.percentDelta.toFixed(1)}%`;
    }

    return `${deltaPrefix}${formatUnitValue(metric.delta, metric.unit)}`;
}

export function getTrendTone(
    delta: number | null,
    isPositiveWhenUp = true
): "positive" | "neutral" | "attention" {
    if (delta === null || Math.abs(delta) < 0.0001) {
        return "neutral";
    }

    if (isPositiveWhenUp) {
        return delta > 0 ? "positive" : "attention";
    }

    return delta < 0 ? "positive" : "attention";
}

export function formatExerciseBasisLabel(
    basis: WorkoutExerciseComparisonBasis
): string {
    switch (basis) {
        case "topSetLoad":
            return "Top set";
        case "volumeLoad":
            return "Volumen";
        case "weeklyVolumeLoad":
            return "Volumen semanal";
        case "totalReps":
            return "Reps totales";
        case "completedReps":
            return "Reps completadas";
        case "completedSets":
            return "Sets completados";
        case "bestRepsAtSameLoad":
            return "Reps mismo peso";
        case "estimatedStrength":
            return "Fuerza estimada";
        default:
            return basis;
    }
}