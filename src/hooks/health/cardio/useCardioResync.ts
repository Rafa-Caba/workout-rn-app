// src/hooks/health/cardio/useCardioResync.ts

import * as React from "react";

import {
    syncCardioSessionDetails,
    syncCardioSessionsForDate,
    type CardioSessionDetailsResult,
    type CardioSyncResult,
} from "@/src/services/health/cardio/cardioSync.service";
import type { CardioActivityType } from "@/src/types/health/healthCardio.types";
import type { ISODate, WorkoutCardioEnvironment } from "@/src/types/workoutDay.types";

type SyncDateInput = {
    date: ISODate;
    activityTypes?: CardioActivityType[];
    cardioEnvironments?: Exclude<WorkoutCardioEnvironment, null>[];
    includeRoutes?: boolean;
};

type SyncSessionInput = {
    date: ISODate;
    sessionId?: string;
    externalId?: string | null;
    activityTypes?: CardioActivityType[];
    cardioEnvironments?: Exclude<WorkoutCardioEnvironment, null>[];
    includeRoutes?: boolean;
};

type UseCardioResyncResult = {
    isSyncing: boolean;
    error: string | null;
    lastDateSyncResult: CardioSyncResult | null;
    lastSessionSyncResult: CardioSessionDetailsResult | null;
    syncDate: (input: SyncDateInput) => Promise<CardioSyncResult>;
    syncSession: (input: SyncSessionInput) => Promise<CardioSessionDetailsResult>;
};

function toErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

export function useCardioResync(): UseCardioResyncResult {
    const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);
    const [lastDateSyncResult, setLastDateSyncResult] = React.useState<CardioSyncResult | null>(null);
    const [lastSessionSyncResult, setLastSessionSyncResult] =
        React.useState<CardioSessionDetailsResult | null>(null);

    const syncDate = React.useCallback(
        async (input: SyncDateInput): Promise<CardioSyncResult> => {
            setIsSyncing(true);
            setError(null);

            try {
                const result = await syncCardioSessionsForDate({
                    date: input.date,
                    activityTypes: input.activityTypes,
                    cardioEnvironments: input.cardioEnvironments,
                    includeRoutes: input.includeRoutes ?? false,
                });

                setLastDateSyncResult(result);
                return result;
            } catch (err: unknown) {
                const message = toErrorMessage(err, "Failed to sync cardio sessions for date.");
                setError(message);
                throw err;
            } finally {
                setIsSyncing(false);
            }
        },
        []
    );

    const syncSession = React.useCallback(
        async (input: SyncSessionInput): Promise<CardioSessionDetailsResult> => {
            setIsSyncing(true);
            setError(null);

            try {
                const result = await syncCardioSessionDetails({
                    date: input.date,
                    sessionId: input.sessionId,
                    externalId: input.externalId ?? null,
                    activityTypes: input.activityTypes,
                    cardioEnvironments: input.cardioEnvironments,
                    includeRoutes: input.includeRoutes ?? true,
                });

                setLastSessionSyncResult(result);
                return result;
            } catch (err: unknown) {
                const message = toErrorMessage(err, "Failed to sync cardio session details.");
                setError(message);
                throw err;
            } finally {
                setIsSyncing(false);
            }
        },
        []
    );

    return {
        isSyncing,
        error,
        lastDateSyncResult,
        lastSessionSyncResult,
        syncDate,
        syncSession,
    };
}
