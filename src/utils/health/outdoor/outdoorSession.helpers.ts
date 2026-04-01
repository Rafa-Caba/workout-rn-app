// src/utils/health/outdoor/outdoorSession.helpers.ts

import type { HealthImportedOutdoorSession, OutdoorActivityType } from "@/src/types/health/healthOutdoor.types";
import type { WorkoutSession } from "@/src/types/workoutDay.types";

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

export function isOutdoorActivityType(value: unknown): value is OutdoorActivityType {
    return value === "walking" || value === "running";
}

export function getOutdoorActivityLabel(
    activityType: OutdoorActivityType | null | undefined
): string {
    if (activityType === "walking") return "Walking";
    if (activityType === "running") return "Running";
    return "Outdoor";
}

function resolveIndoorOutdoorLabel(providerWorkoutType: string | null | undefined): string | null {
    const normalized = typeof providerWorkoutType === "string"
        ? providerWorkoutType.trim().toLowerCase()
        : "";

    if (!normalized) return null;
    if (normalized.includes("indoor")) return "Indoor";
    if (normalized.includes("outdoor")) return "Outdoor";

    return null;
}

export function buildOutdoorSessionTitle(input: {
    activityType: OutdoorActivityType | null | undefined;
    providerWorkoutType?: string | null;
    fallback?: string | null;
}): string {
    const activityLabel = getOutdoorActivityLabel(input.activityType);
    const locationLabel = resolveIndoorOutdoorLabel(input.providerWorkoutType);

    if (locationLabel && activityLabel !== "Outdoor") {
        return `${locationLabel} ${activityLabel}`;
    }

    if (typeof input.fallback === "string" && input.fallback.trim().length > 0) {
        return input.fallback.trim();
    }

    return activityLabel;
}

export function buildOutdoorSessionTitleFromImported(
    session: HealthImportedOutdoorSession
): string {
    return buildOutdoorSessionTitle({
        activityType: session.activityType,
        providerWorkoutType: session.providerWorkoutType,
    });
}

export function buildOutdoorSessionTitleFromWorkoutSession(
    session: WorkoutSession
): string {
    return buildOutdoorSessionTitle({
        activityType: session.activityType,
        providerWorkoutType: session.meta?.originalType ?? null,
        fallback: session.type,
    });
}

export function formatOutdoorDistance(distanceKm: number | null | undefined): string {
    if (!isFiniteNumber(distanceKm) || distanceKm <= 0) return "—";
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }

    return `${distanceKm.toFixed(distanceKm >= 10 ? 1 : 2)} km`;
}

export function formatOutdoorPace(paceSecPerKm: number | null | undefined): string {
    if (!isFiniteNumber(paceSecPerKm) || paceSecPerKm <= 0) return "—";

    const totalSeconds = Math.round(paceSecPerKm);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")} /km`;
}

export function formatOutdoorCalories(kcal: number | null | undefined): string {
    if (!isFiniteNumber(kcal) || kcal <= 0) return "—";
    return `${Math.round(kcal)} kcal`;
}

export function formatOutdoorSteps(steps: number | null | undefined): string {
    if (!isFiniteNumber(steps) || steps <= 0) return "—";
    return `${Math.round(steps).toLocaleString()} steps`;
}