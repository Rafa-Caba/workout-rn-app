// src/hooks/health/cardio/useCardioBootstrap.ts

import * as React from "react";

import {
    ensureCardioSessionsForDate,
    syncCardioSessionsForDate,
    type CardioEnsureResult,
    type CardioSyncResult,
} from "@/src/services/health/cardio/cardioSync.service";
import { getWorkoutDayServ } from "@/src/services/workout/days.service";
import type { CardioActivityType } from "@/src/types/health/cardio/healthCardio.types";
import type { ISODate, WorkoutCardioEnvironment, WorkoutDay, WorkoutSession } from "@/src/types/workoutDay.types";
import { normalizeCardioHealthErrorMessage } from "@/src/utils/health/cardio/cardioHealthError.helpers";
import {
    getCardioSessionsForDate,
    sortCardioSessionsByStartAt,
} from "@/src/utils/health/cardio/cardioSession.grouping";

type UseCardioBootstrapOptions = {
    date: ISODate;
    activityTypes?: CardioActivityType[];
    cardioEnvironments?: Exclude<WorkoutCardioEnvironment, null>[];
    includeRoutes?: boolean;
    autoBootstrap?: boolean;
};

type UseCardioBootstrapResult = {
    day: WorkoutDay | null;
    sessions: WorkoutSession[];
    loading: boolean;
    error: string | null;
    bootstrapResult: CardioEnsureResult | null;
    lastSyncResult: CardioSyncResult | null;
    bootstrap: () => Promise<CardioEnsureResult>;
    resync: () => Promise<CardioSyncResult>;
    refresh: () => Promise<void>;
};

function extractHttpStatus(error: unknown): number | null {
    if (typeof error !== "object" || error === null) {
        return null;
    }

    if (
        "status" in error &&
        typeof (error as { status?: unknown }).status === "number"
    ) {
        return (error as { status: number }).status;
    }

    if (
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object" &&
        (error as { response?: unknown }).response !== null &&
        "status" in ((error as { response: { status?: unknown } }).response) &&
        typeof (error as { response: { status?: unknown } }).response.status === "number"
    ) {
        return (error as { response: { status: number } }).response.status;
    }

    return null;
}

function toErrorMessage(error: unknown, fallback: string): string {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object" &&
        (error as { response?: unknown }).response !== null
    ) {
        const response = (error as {
            response: {
                data?: {
                    error?: {
                        message?: string;
                    };
                };
            };
        }).response;

        const apiMessage = response.data?.error?.message;
        if (typeof apiMessage === "string" && apiMessage.trim().length > 0) {
            return apiMessage;
        }
    }

    return normalizeCardioHealthErrorMessage(error, fallback);
}

function extractCardioSessions(
    day: WorkoutDay | null,
    date: ISODate,
    activityTypes?: CardioActivityType[],
    cardioEnvironments?: Exclude<WorkoutCardioEnvironment, null>[]
): WorkoutSession[] {
    if (!day) {
        return [];
    }

    return sortCardioSessionsByStartAt(
        getCardioSessionsForDate(
            Array.isArray(day.training?.sessions) ? day.training.sessions : [],
            date,
            activityTypes,
            cardioEnvironments
        ),
        "asc"
    );
}

export function useCardioBootstrap(
    options: UseCardioBootstrapOptions
): UseCardioBootstrapResult {
    const { date, activityTypes, cardioEnvironments, includeRoutes = false, autoBootstrap = true } = options;

    const [day, setDay] = React.useState<WorkoutDay | null>(null);
    const [loading, setLoading] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);
    const [bootstrapResult, setBootstrapResult] = React.useState<CardioEnsureResult | null>(null);
    const [lastSyncResult, setLastSyncResult] = React.useState<CardioSyncResult | null>(null);

    const refresh = React.useCallback(async (): Promise<void> => {
        try {
            const nextDay = await getWorkoutDayServ(date);
            setDay(nextDay);
        } catch (err: unknown) {
            const maybeStatus = extractHttpStatus(err);

            if (maybeStatus === 404) {
                setDay(null);
                return;
            }

            throw err;
        }
    }, [date]);

    const bootstrap = React.useCallback(async (): Promise<CardioEnsureResult> => {
        setLoading(true);
        setError(null);

        try {
            const result = await ensureCardioSessionsForDate({
                date,
                activityTypes,
                cardioEnvironments,
                includeRoutes,
            });

            setBootstrapResult(result);
            setDay(result.day);

            return result;
        } catch (err: unknown) {
            const message = toErrorMessage(err, "Failed to bootstrap cardio sessions.");
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [activityTypes, cardioEnvironments, date, includeRoutes]);

    const resync = React.useCallback(async (): Promise<CardioSyncResult> => {
        setLoading(true);
        setError(null);

        try {
            const result = await syncCardioSessionsForDate({
                date,
                activityTypes,
                cardioEnvironments,
                includeRoutes,
            });

            setLastSyncResult(result);
            setDay(result.day);

            return result;
        } catch (err: unknown) {
            const message = toErrorMessage(err, "Failed to resync cardio sessions.");
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [activityTypes, cardioEnvironments, date, includeRoutes]);

    React.useEffect(() => {
        let isMounted = true;

        void (async () => {
            try {
                const nextDay = await getWorkoutDayServ(date);

                if (!isMounted) return;
                setDay(nextDay);
            } catch (err: unknown) {
                const maybeStatus = extractHttpStatus(err);

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
                if (isMounted) {
                    setLoading(true);
                    setError(null);
                }

                const result = await ensureCardioSessionsForDate({
                    date,
                    activityTypes,
                    cardioEnvironments,
                    includeRoutes,
                });

                if (!isMounted) return;

                setBootstrapResult(result);
                setDay(result.day);
            } catch (err: unknown) {
                if (!isMounted) return;
                setError(toErrorMessage(err, "Failed to auto-bootstrap cardio sessions."));
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [activityTypes, autoBootstrap, cardioEnvironments, date, includeRoutes]);

    const sessions = React.useMemo<WorkoutSession[]>(() => {
        return extractCardioSessions(day, date, activityTypes, cardioEnvironments);
    }, [activityTypes, cardioEnvironments, date, day]);

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
