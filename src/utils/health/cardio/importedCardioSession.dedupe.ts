// /src/utils/health/cardio/importedCardioSession.dedupe.ts
// Stable dedupe for provider sessions returned by multi-day Health queries.

import type { HealthImportedCardioSession } from "@/src/types/health/cardio/healthCardio.types";

function normalize(value: string | null | undefined): string {
    return (value ?? "").trim();
}

function buildImportedSessionKey(session: HealthImportedCardioSession): string {
    const externalId = normalize(session.externalId);
    if (externalId) return `${session.source}:external:${externalId}`;

    return [
        session.source,
        session.activityType,
        normalize(session.providerWorkoutType),
        normalize(session.startAt),
        normalize(session.endAt),
        session.metrics.durationSeconds ?? "",
        session.metrics.distanceKm ?? "",
    ].join("|");
}

export function dedupeImportedCardioSessions(
    sessions: HealthImportedCardioSession[],
): HealthImportedCardioSession[] {
    const byKey = new Map<string, HealthImportedCardioSession>();

    for (const session of sessions) {
        const key = buildImportedSessionKey(session);
        const current = byKey.get(key);

        if (!current) {
            byKey.set(key, session);
            continue;
        }

        const currentRoutePoints = current.route?.routeSummary.pointCount ?? 0;
        const nextRoutePoints = session.route?.routeSummary.pointCount ?? 0;

        if (nextRoutePoints > currentRoutePoints) {
            byKey.set(key, session);
        }
    }

    return Array.from(byKey.values()).sort((left, right) => {
        const leftMs = left.startAt ? new Date(left.startAt).getTime() : Number.POSITIVE_INFINITY;
        const rightMs = right.startAt ? new Date(right.startAt).getTime() : Number.POSITIVE_INFINITY;
        return leftMs - rightMs;
    });
}
