// src/hooks/health/outdoor/useOutdoorSessionDetails.ts

import * as React from "react";

import { syncOutdoorSessionDetails } from "@/src/services/health/outdoor/outdoorSync.service";
import { getWorkoutDayServ } from "@/src/services/workout/days.service";
import type { OutdoorActivityType } from "@/src/types/health/healthOutdoor.types";
import type { ISODate, WorkoutDay, WorkoutSession } from "@/src/types/workoutDay.types";
import { getOutdoorSessionsForDate } from "@/src/utils/health/outdoor/outdoorSession.grouping";

type UseOutdoorSessionDetailsOptions = {
    date: ISODate;
    sessionId: string;
    includeRoutes?: boolean;
    autoLoad?: boolean;
    activityTypes?: OutdoorActivityType[];
};

type UseOutdoorSessionDetailsResult = {
    day: WorkoutDay | null;
    session: WorkoutSession | null;
    loading: boolean;
    error: string | null;
    notFound: boolean;
    refresh: () => Promise<WorkoutSession | null>;
};

function toErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

function findOutdoorSessionById(day: WorkoutDay | null, date: ISODate, sessionId: string): WorkoutSession | null {
    if (!day) {
        return null;
    }

    const outdoorSessions = getOutdoorSessionsForDate(
        Array.isArray(day.training?.sessions) ? day.training.sessions : [],
        date
    );

    return outdoorSessions.find((session) => session.id === sessionId) ?? null;
}

async function safeGetWorkoutDay(date: ISODate): Promise<WorkoutDay | null> {
    try {
        return await getWorkoutDayServ(date);
    } catch (err: unknown) {
        const maybeStatus =
            typeof err === "object" &&
                err !== null &&
                "status" in err &&
                typeof (err as { status?: unknown }).status === "number"
                ? (err as { status: number }).status
                : null;

        if (maybeStatus === 404) {
            return null;
        }

        throw err;
    }
}

export function useOutdoorSessionDetails(
    options: UseOutdoorSessionDetailsOptions
): UseOutdoorSessionDetailsResult {
    const {
        date,
        sessionId,
        includeRoutes = true,
        autoLoad = true,
        activityTypes,
    } = options;

    const [day, setDay] = React.useState<WorkoutDay | null>(null);
    const [session, setSession] = React.useState<WorkoutSession | null>(null);
    const [loading, setLoading] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);
    const [notFound, setNotFound] = React.useState<boolean>(false);

    const refresh = React.useCallback(async (): Promise<WorkoutSession | null> => {
        setLoading(true);
        setError(null);
        setNotFound(false);

        try {
            const currentDay = await safeGetWorkoutDay(date);
            const existingSession = findOutdoorSessionById(currentDay, date, sessionId);

            if (existingSession) {
                setDay(currentDay);
                setSession(existingSession);
                setNotFound(false);
                return existingSession;
            }

            const result = await syncOutdoorSessionDetails({
                date,
                sessionId,
                includeRoutes,
                activityTypes,
            });

            const refreshedDay = result.day ?? (await safeGetWorkoutDay(date));
            const refreshedSession =
                result.mappedSession ?? findOutdoorSessionById(refreshedDay, date, sessionId);

            setDay(refreshedDay);
            setSession(refreshedSession);
            setNotFound(refreshedSession === null);

            return refreshedSession;
        } catch (err: unknown) {
            const message = toErrorMessage(err, "Failed to load outdoor session details.");
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [activityTypes, date, includeRoutes, sessionId]);

    React.useEffect(() => {
        if (!autoLoad) {
            return;
        }

        let isMounted = true;

        void (async () => {
            try {
                const currentDay = await safeGetWorkoutDay(date);
                const existingSession = findOutdoorSessionById(currentDay, date, sessionId);

                if (!isMounted) return;

                if (existingSession) {
                    setDay(currentDay);
                    setSession(existingSession);
                    setNotFound(false);
                    return;
                }

                const result = await syncOutdoorSessionDetails({
                    date,
                    sessionId,
                    includeRoutes,
                    activityTypes,
                });

                if (!isMounted) return;

                const refreshedDay = result.day ?? (await safeGetWorkoutDay(date));
                const refreshedSession =
                    result.mappedSession ?? findOutdoorSessionById(refreshedDay, date, sessionId);

                setDay(refreshedDay);
                setSession(refreshedSession);
                setNotFound(refreshedSession === null);
            } catch (err: unknown) {
                if (!isMounted) return;
                setError(toErrorMessage(err, "Failed to auto-load outdoor session details."));
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [activityTypes, autoLoad, date, includeRoutes, sessionId]);

    return {
        day,
        session,
        loading,
        error,
        notFound,
        refresh,
    };
}