// src/hooks/health/outdoor/useOutdoorResync.ts

import * as React from "react";

import {
    syncOutdoorSessionDetails,
    syncOutdoorSessionsForDate,
    type OutdoorSessionDetailsResult,
    type OutdoorSyncResult,
} from "@/src/services/health/outdoor/outdoorSync.service";
import type { OutdoorActivityType } from "@/src/types/health/healthOutdoor.types";
import type { ISODate } from "@/src/types/workoutDay.types";

type SyncDateInput = {
    date: ISODate;
    activityTypes?: OutdoorActivityType[];
    includeRoutes?: boolean;
};

type SyncSessionInput = {
    date: ISODate;
    sessionId?: string;
    externalId?: string | null;
    activityTypes?: OutdoorActivityType[];
    includeRoutes?: boolean;
};

type UseOutdoorResyncResult = {
    isSyncing: boolean;
    error: string | null;
    lastDateSyncResult: OutdoorSyncResult | null;
    lastSessionSyncResult: OutdoorSessionDetailsResult | null;
    syncDate: (input: SyncDateInput) => Promise<OutdoorSyncResult>;
    syncSession: (input: SyncSessionInput) => Promise<OutdoorSessionDetailsResult>;
};

function toErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

export function useOutdoorResync(): UseOutdoorResyncResult {
    const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);
    const [lastDateSyncResult, setLastDateSyncResult] = React.useState<OutdoorSyncResult | null>(null);
    const [lastSessionSyncResult, setLastSessionSyncResult] =
        React.useState<OutdoorSessionDetailsResult | null>(null);

    const syncDate = React.useCallback(
        async (input: SyncDateInput): Promise<OutdoorSyncResult> => {
            setIsSyncing(true);
            setError(null);

            try {
                const result = await syncOutdoorSessionsForDate({
                    date: input.date,
                    activityTypes: input.activityTypes,
                    includeRoutes: input.includeRoutes ?? false,
                });

                setLastDateSyncResult(result);
                return result;
            } catch (err: unknown) {
                const message = toErrorMessage(err, "Failed to sync outdoor sessions for date.");
                setError(message);
                throw err;
            } finally {
                setIsSyncing(false);
            }
        },
        []
    );

    const syncSession = React.useCallback(
        async (input: SyncSessionInput): Promise<OutdoorSessionDetailsResult> => {
            setIsSyncing(true);
            setError(null);

            try {
                const result = await syncOutdoorSessionDetails({
                    date: input.date,
                    sessionId: input.sessionId,
                    externalId: input.externalId ?? null,
                    activityTypes: input.activityTypes,
                    includeRoutes: input.includeRoutes ?? true,
                });

                setLastSessionSyncResult(result);
                return result;
            } catch (err: unknown) {
                const message = toErrorMessage(err, "Failed to sync outdoor session details.");
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