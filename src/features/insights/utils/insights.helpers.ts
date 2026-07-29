// src/features/insights/utils/insights.helpers.ts
// Pure formatting, validation, and aggregation helpers shared by Insights sections.

import type {
    InsightMetric,
    PrRecord,
    RecoveryLevel,
    RecoveryPoint,
    StreaksMode,
} from "@/src/services/workout/insights.service";

/** Returns true when a value is a non-array object with string keys. */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Extracts a useful API error message without unsafe assertions. */
export function readInsightsErrorMessage(
    error: unknown,
    fallback = "No se pudieron cargar los datos.",
): string {
    if (isRecord(error)) {
        const response = error.response;

        if (isRecord(response)) {
            const data = response.data;

            if (isRecord(data)) {
                const directMessage = data.message;
                if (typeof directMessage === "string" && directMessage.trim()) {
                    return directMessage.trim();
                }

                const nestedError = data.error;
                if (isRecord(nestedError)) {
                    const nestedMessage = nestedError.message;
                    if (typeof nestedMessage === "string" && nestedMessage.trim()) {
                        return nestedMessage.trim();
                    }
                }
            }
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message.trim();
    }

    return fallback;
}

/** Validates normalized inclusive ISO dates used by PRs and recovery. */
export function getRangeValidationMessage(from: string, to: string): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return "Selecciona una fecha inicial y una fecha final válidas.";
    }

    if (from > to) {
        return "La fecha Desde no puede ser posterior a Hasta.";
    }

    return null;
}

/** Calculates the average of finite numeric values while ignoring nulls. */
export function averageNumbers(values: Array<number | null | undefined>): number | null {
    const valid = values.filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value),
    );

    if (valid.length === 0) return null;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

/** Returns the most recent known recovery level in chronological API points. */
export function getLatestRecoveryLevel(points: RecoveryPoint[]): RecoveryLevel {
    const latestKnown = [...points].reverse().find((point) => point.level !== "unknown");
    return latestKnown?.level ?? "unknown";
}

/** Formats a finite number without unnecessary trailing zeros. */
export function formatFiniteNumber(
    value: number | null | undefined,
    decimals = 0,
): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";

    const fixed = value.toFixed(decimals);
    return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

/** Formats a minute value as a compact hour/minute string. */
export function formatMinutes(value: number | null | undefined): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";

    const total = Math.max(0, Math.round(value));
    const hours = Math.floor(total / 60);
    const minutes = total % 60;

    if (hours <= 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
}

/** Formats a second value as a compact minute/second string. */
export function formatSeconds(value: number | null | undefined): string {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";

    const total = Math.max(0, Math.round(value));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;

    if (minutes <= 0) return `${seconds}s`;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

/** Formats a personal-record value using the same units as Web. */
export function formatMetricValue(metric: InsightMetric, value: number): string {
    if (!Number.isFinite(value)) return "—";

    if (metric === "durationSeconds") return formatSeconds(value);
    if (metric === "paceSecPerKm") return `${formatSeconds(value)} /km`;
    if (metric === "distanceKm") return `${formatFiniteNumber(value, 2)} km`;
    if (metric === "steps") return Math.round(value).toLocaleString("es-MX");
    if (metric === "activeKcal") return `${Math.round(value)} kcal`;
    if (metric === "avgHr" || metric === "maxHr") return `${Math.round(value)} bpm`;

    return formatFiniteNumber(value, 2);
}

/** Formats the metric and optimization direction used by one personal record. */
export function formatMetricLabel(metric: InsightMetric, mode: PrRecord["mode"]): string {
    const labelByMetric: Record<InsightMetric, string> = {
        activeKcal: "Kcal activas",
        durationSeconds: "Duración",
        avgHr: "FC promedio",
        maxHr: "FC máxima",
        distanceKm: "Distancia",
        steps: "Pasos",
        paceSecPerKm: "Ritmo",
    };

    const modeLabel = mode === "min" ? "mejor menor" : "mejor mayor";
    return `${labelByMetric[metric]} · ${modeLabel}`;
}

/** Human-readable label for a streak mode. */
export function formatStreakMode(mode: StreaksMode): string {
    if (mode === "training") return "Entrenamiento";
    if (mode === "sleep") return "Sueño";
    return "Ambos";
}

/** Spanish label and emoji for a recovery traffic-light level. */
export function formatRecoveryLevel(level: RecoveryLevel): string {
    if (level === "green") return "🟢 Verde";
    if (level === "yellow") return "🟡 Amarillo";
    if (level === "red") return "🔴 Rojo";
    return "⚪ Sin nivel";
}
