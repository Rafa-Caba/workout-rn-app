// /src/hooks/health/useHealthDiagnostics.ts

import * as React from "react";

import {
    clearHealthDiagnosticEvents,
    getHealthDiagnosticEvents,
    subscribeHealthDiagnosticEvents,
} from "@/src/services/health/diagnostics/healthDiagnostics.service";
import type { HealthDiagnosticEvent } from "@/src/types/health/healthDiagnostics.types";

type UseHealthDiagnosticsResult = {
    events: HealthDiagnosticEvent[];
    isLoading: boolean;
    refresh: () => Promise<void>;
    clear: () => Promise<void>;
};

export function useHealthDiagnostics(): UseHealthDiagnosticsResult {
    const [events, setEvents] = React.useState<HealthDiagnosticEvent[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const refresh = React.useCallback(async (): Promise<void> => {
        setIsLoading(true);
        try {
            setEvents(await getHealthDiagnosticEvents());
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clear = React.useCallback(async (): Promise<void> => {
        await clearHealthDiagnosticEvents();
        setEvents([]);
    }, []);

    React.useEffect(() => {
        const unsubscribe = subscribeHealthDiagnosticEvents(setEvents);
        void refresh();
        return unsubscribe;
    }, [refresh]);

    return {
        events,
        isLoading,
        refresh,
        clear,
    };
}
