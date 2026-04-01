// src/hooks/health/outdoor/useOutdoorBootstrap.ts

import * as React from "react";

import {
    ensureOutdoorSessionsForDate,
    syncOutdoorSessionsForDate,
    type OutdoorEnsureResult,
    type OutdoorSyncResult
} from "@/src/services/health/outdoor/outdoorSync.service";
import { getWorkoutDayServ } from "@/src/services/workout/days.service";
import type { OutdoorActivityType } from "@/src/types/health/healthOutdoor.types";
import type { ISODate, WorkoutDay, WorkoutSession } from "@/src/types/workoutDay.types";
import {
    getOutdoorSessionsForDate,
    sortOutdoorSessionsByStartAt,
} from "@/src/utils/health/outdoor/outdoorSession.grouping";

type UseOutdoorBootstrapOptions = {
    date: ISODate;
    activityTypes?: OutdoorActivityType[];
    includeRoutes?: boolean;
    autoBootstrap?: boolean;
};

type UseOutdoorBootstrapResult = {
    day: WorkoutDay | null;
    sessions: WorkoutSession[];
    loading: boolean;
    error: string | null;
    bootstrapResult: OutdoorEnsureResult | null;
    lastSyncResult: OutdoorSyncResult | null;
    bootstrap: () => Promise<OutdoorEnsureResult>;
    resync: () => Promise<OutdoorSyncResult>;
    refresh: () => Promise<void>;
};

function toErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

function extractOutdoorSessions(
    day: WorkoutDay | null,
    date: ISODate,
    activityTypes?: OutdoorActivityType[]
): WorkoutSession[] {
    if (!day) {
        return [];
    }

    return sortOutdoorSessionsByStartAt(
        getOutdoorSessionsForDate(
            Array.isArray(day.training?.sessions) ? day.training.sessions : [],
            date,
            activityTypes
        ),
        "asc"
    );
}

export function useOutdoorBootstrap(
    options: UseOutdoorBootstrapOptions
): UseOutdoorBootstrapResult {
    const { date, activityTypes, includeRoutes = false, autoBootstrap = true } = options;

    const [day, setDay] = React.useState<WorkoutDay | null>(null);
    const [loading, setLoading] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);
    const [bootstrapResult, setBootstrapResult] = React.useState<OutdoorEnsureResult | null>(null);
    const [lastSyncResult, setLastSyncResult] = React.useState<OutdoorSyncResult | null>(null);

    const refresh = React.useCallback(async (): Promise<void> => {
        try {
            const nextDay = await getWorkoutDayServ(date);
            setDay(nextDay);
        } catch (err: unknown) {
            const maybeStatus =
                typeof err === "object" &&
                    err !== null &&
                    "status" in err &&
                    typeof (err as { status?: unknown }).status === "number"
                    ? (err as { status: number }).status
                    : null;

            if (maybeStatus === 404) {
                setDay(null);
                return;
            }

            throw err;
        }
    }, [date]);

    const bootstrap = React.useCallback(async (): Promise<OutdoorEnsureResult> => {
        setLoading(true);
        setError(null);

        try {
            const result = await ensureOutdoorSessionsForDate({
                date,
                activityTypes,
                includeRoutes,
            });

            setBootstrapResult(result);
            setDay(result.day);

            return result;
        } catch (err: unknown) {
            const message = toErrorMessage(err, "Failed to bootstrap outdoor sessions.");
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [activityTypes, date, includeRoutes]);

    const resync = React.useCallback(async (): Promise<OutdoorSyncResult> => {
        setLoading(true);
        setError(null);

        try {
            const result = await syncOutdoorSessionsForDate({
                date,
                activityTypes,
                includeRoutes,
            });

            setLastSyncResult(result);
            setDay(result.day);

            return result;
        } catch (err: unknown) {
            const message = toErrorMessage(err, "Failed to resync outdoor sessions.");
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [activityTypes, date, includeRoutes]);

    React.useEffect(() => {
        let isMounted = true;

        void (async () => {
            try {
                const nextDay = await getWorkoutDayServ(date);

                if (!isMounted) return;
                setDay(nextDay);
            } catch (err: unknown) {
                const maybeStatus =
                    typeof err === "object" &&
                        err !== null &&
                        "status" in err &&
                        typeof (err as { status?: unknown }).status === "number"
                        ? (err as { status: number }).status
                        : null;

                if (!isMounted) return;

                if (maybeStatus === 404) {
                    setDay(null);
                    return;
                }

                setError(toErrorMessage(err, "Failed to load workout day."));
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [date]);

    React.useEffect(() => {
        if (!autoBootstrap) {
            return;
        }

        let isMounted = true;

        void (async () => {
            try {
                const result = await ensureOutdoorSessionsForDate({
                    date,
                    activityTypes,
                    includeRoutes,
                });

                if (!isMounted) return;

                setBootstrapResult(result);
                setDay(result.day);
            } catch (err: unknown) {
                if (!isMounted) return;
                setError(toErrorMessage(err, "Failed to auto-bootstrap outdoor sessions."));
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [activityTypes, autoBootstrap, date, includeRoutes]);

    const sessions = React.useMemo<WorkoutSession[]>(() => {
        return extractOutdoorSessions(day, date, activityTypes);
    }, [activityTypes, date, day]);

    return {
        day,
        sessions,
        loading,
        error,
        bootstrapResult,
        lastSyncResult,
        bootstrap,
        resync,
        refresh,
    };
}