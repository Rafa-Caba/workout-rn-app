// src/utils/health/cardio/cardioSession.helpers.ts
// Cardio session display, formatting, and type guard helpers.

import type { CardioActivityType, HealthImportedCardioSession } from "@/src/types/health/cardio/healthCardio.types";
import type { WorkoutCardioEnvironment, WorkoutSession } from "@/src/types/workoutDay.types";
import { detectCardioEnvironmentFromProviderText } from "@/src/utils/health/cardio/cardioEnvironment.mapper";

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

export function isCardioActivityType(value: unknown): value is CardioActivityType {
    return value === "walking" || value === "running";
}

export function isCardioEnvironment(value: unknown): value is Exclude<WorkoutCardioEnvironment, null> {
    return value === "outdoor" || value === "indoor";
}

export function getCardioActivityLabel(
    activityType: CardioActivityType | null | undefined
): string {
    if (activityType === "walking") return "Walking";
    if (activityType === "running") return "Running";
    return "Cardio";
}

export function getCardioEnvironmentLabel(
    cardioEnvironment: WorkoutCardioEnvironment | undefined
): string {
    if (cardioEnvironment === "outdoor") return "Outdoor";
    if (cardioEnvironment === "indoor") return "Indoor";
    return "Cardio";
}

export function detectCardioEnvironmentFromProviderWorkoutType(
    providerWorkoutType: string | null | undefined
): WorkoutCardioEnvironment {
    return detectCardioEnvironmentFromProviderText(providerWorkoutType);
}

export function resolveWorkoutSessionCardioEnvironment(
    session: WorkoutSession
): WorkoutCardioEnvironment {
    if (isCardioEnvironment(session.cardioEnvironment)) {
        return session.cardioEnvironment;
    }

    if (session.hasRoute || session.routeSummary) {
        return "outdoor";
    }

    return detectCardioEnvironmentFromProviderWorkoutType(session.meta?.originalType ?? null);
}

export function buildCardioSessionTitle(input: {
    activityType: CardioActivityType | null | undefined;
    cardioEnvironment?: WorkoutCardioEnvironment;
    providerWorkoutType?: string | null;
    fallback?: string | null;
}): string {
    const activityLabel = getCardioActivityLabel(input.activityType);
    const environment = input.cardioEnvironment ?? detectCardioEnvironmentFromProviderWorkoutType(input.providerWorkoutType);
    const environmentLabel = getCardioEnvironmentLabel(environment);

    if (environmentLabel !== "Cardio" && activityLabel !== "Cardio") {
        return `${environmentLabel} ${activityLabel}`;
    }

    if (typeof input.fallback === "string" && input.fallback.trim().length > 0) {
        return input.fallback.trim();
    }

    return activityLabel;
}

export function buildCardioSessionTitleFromImported(
    session: HealthImportedCardioSession
): string {
    return buildCardioSessionTitle({
        activityType: session.activityType,
        cardioEnvironment: session.cardioEnvironment,
        providerWorkoutType: session.providerWorkoutType,
    });
}

export function buildCardioSessionTitleFromWorkoutSession(
    session: WorkoutSession
): string {
    return buildCardioSessionTitle({
        activityType: session.activityType,
        cardioEnvironment: resolveWorkoutSessionCardioEnvironment(session),
        providerWorkoutType: session.meta?.originalType ?? null,
        fallback: session.type,
    });
}

export function formatCardioDistance(distanceKm: number | null | undefined): string {
    if (!isFiniteNumber(distanceKm) || distanceKm <= 0) return "—";
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }

    return `${distanceKm.toFixed(distanceKm >= 10 ? 1 : 2)} km`;
}

export function formatCardioPace(paceSecPerKm: number | null | undefined): string {
    if (!isFiniteNumber(paceSecPerKm) || paceSecPerKm <= 0) return "—";

    const totalSeconds = Math.round(paceSecPerKm);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")} /km`;
}

export function formatCardioCalories(kcal: number | null | undefined): string {
    if (!isFiniteNumber(kcal) || kcal <= 0) return "—";
    return `${Math.round(kcal)} kcal`;
}

export function formatCardioSteps(steps: number | null | undefined): string {
    if (!isFiniteNumber(steps) || steps <= 0) return "—";
    return `${Math.round(steps).toLocaleString()} steps`;
}
