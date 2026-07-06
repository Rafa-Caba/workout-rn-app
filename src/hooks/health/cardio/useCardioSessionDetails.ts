// src/hooks/health/cardio/useCardioSessionDetails.ts

import * as React from "react";

import { syncCardioSessionDetails } from "@/src/services/health/cardio/cardioSync.service";
import { getWorkoutDayServ } from "@/src/services/workout/days.service";
import type { CardioActivityType } from "@/src/types/health/cardio/healthCardio.types";
import type { ISODate, WorkoutDay, WorkoutSession } from "@/src/types/workoutDay.types";
import { normalizeCardioHealthErrorMessage } from "@/src/utils/health/cardio/cardioHealthError.helpers";
import { getCardioSessionsForDate } from "@/src/utils/health/cardio/cardioSession.grouping";

type UseCardioSessionDetailsOptions = {
    date: ISODate;
    sessionId: string;
    includeRoutes?: boolean;
    autoLoad?: boolean;
    activityTypes?: CardioActivityType[];
};

type UseCardioSessionDetailsResult = {
    day: WorkoutDay | null;
    session: WorkoutSession | null;
    loading: boolean;
    error: string | null;
    notFound: boolean;
    refresh: () => Promise<WorkoutSession | null>;
};

function toErrorMessage(error: unknown, fallback: string): string {
    return normalizeCardioHealthErrorMessage(error, fallback);
}

function findCardioSessionById(day: WorkoutDay | null, date: ISODate, sessionId: string): WorkoutSession | null {
    if (!day) {
        return null;
    }

    const cardioSessions = getCardioSessionsForDate(
        Array.isArray(day.training?.sessions) ? day.training.sessions : [],
        date
    );

    return cardioSessions.find((session) => session.id === sessionId) ?? null;
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

export function useCardioSessionDetails(
    options: UseCardioSessionDetailsOptions
): UseCardioSessionDetailsResult {
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
            const existingSession = findCardioSessionById(currentDay, date, sessionId);

            if (existingSession) {
                setDay(currentDay);
                setSession(existingSession);
                setNotFound(false);
                return existingSession;
            }

            const result = await syncCardioSessionDetails({
                date,
                sessionId,
                includeRoutes,
                activityTypes,
            });

            const refreshedDay = result.day ?? (await safeGetWorkoutDay(date));
            const refreshedSession =
                result.mappedSession ?? findCardioSessionById(refreshedDay, date, sessionId);

            setDay(refreshedDay);
            setSession(refreshedSession);
            setNotFound(refreshedSession === null);

            return refreshedSession;
        } catch (err: unknown) {
            const message = toErrorMessage(err, "Failed to load cardio session details.");
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
                const existingSession = findCardioSessionById(currentDay, date, sessionId);

                if (!isMounted) return;

                if (existingSession) {
                    setDay(currentDay);
                    setSession(existingSession);
                    setNotFound(false);
                    return;
                }

                const result = await syncCardioSessionDetails({
                    date,
                    sessionId,
                    includeRoutes,
                    activityTypes,
                });

                if (!isMounted) return;

                const refreshedDay = result.day ?? (await safeGetWorkoutDay(date));
                const refreshedSession =
                    result.mappedSession ?? findCardioSessionById(refreshedDay, date, sessionId);

                setDay(refreshedDay);
                setSession(refreshedSession);
                setNotFound(refreshedSession === null);
            } catch (err: unknown) {
                if (!isMounted) return;
                setError(toErrorMessage(err, "Failed to auto-load cardio session details."));
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
