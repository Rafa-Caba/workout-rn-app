// src/hooks/health/cardio/useCardioPermissions.ts

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";

import {
    CARDIO_HEALTH_READ_PERMISSIONS,
    type HealthPermissionKey,
} from "@/src/services/health/healthPermissionKeys";
import {
    getCardioPermissionsStatus,
    requestCardioPermissions,
} from "@/src/services/health/cardio/cardioHealth.service";
import type { HealthPermissionsStatus } from "@/src/types/health/health.types";

type UseCardioPermissionsOptions = {
    permissions?: HealthPermissionKey[];
    autoRefresh?: boolean;
};

type UseCardioPermissionsResult = {
    status: HealthPermissionsStatus | null;
    isGranted: boolean;
    isLoading: boolean;
    error: string | null;
    requestPermissions: () => Promise<HealthPermissionsStatus>;
    refreshPermissions: () => Promise<HealthPermissionsStatus>;
};

const CARDIO_PERMISSIONS_STORAGE_KEY = "health.cardio.permissions.granted";

function arePermissionsGranted(
    status: HealthPermissionsStatus | null,
    requiredPermissions: HealthPermissionKey[]
): boolean {
    if (!status?.available) {
        return false;
    }

    for (const permission of requiredPermissions) {
        if (status.permissions[permission] !== "granted") {
            return false;
        }
    }

    return true;
}

async function readPersistedCardioGranted(): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem(CARDIO_PERMISSIONS_STORAGE_KEY);
        return value === "true";
    } catch {
        return false;
    }
}

async function writePersistedCardioGranted(value: boolean): Promise<void> {
    try {
        await AsyncStorage.setItem(
            CARDIO_PERMISSIONS_STORAGE_KEY,
            value ? "true" : "false"
        );
    } catch {
        // no-op
    }
}

export function useCardioPermissions(
    options?: UseCardioPermissionsOptions
): UseCardioPermissionsResult {
    const permissions = React.useMemo<HealthPermissionKey[]>(
        () => options?.permissions ?? CARDIO_HEALTH_READ_PERMISSIONS,
        [options?.permissions]
    );

    const [status, setStatus] = React.useState<HealthPermissionsStatus | null>(null);
    const [isGrantedPersisted, setIsGrantedPersisted] = React.useState<boolean>(false);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const refreshPermissions = React.useCallback(async (): Promise<HealthPermissionsStatus> => {
        setIsLoading(true);
        setError(null);

        try {
            const nextStatus = await getCardioPermissionsStatus({
                permissions,
            });

            setStatus(nextStatus);

            const grantedFromNative = arePermissionsGranted(nextStatus, permissions);
            const persistedGranted = await readPersistedCardioGranted();

            if (grantedFromNative) {
                await writePersistedCardioGranted(true);
                setIsGrantedPersisted(true);
            } else {
                setIsGrantedPersisted(persistedGranted);
            }

            return nextStatus;
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Failed to refresh cardio permissions.";

            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [permissions]);

    const requestPermissionsAction = React.useCallback(
        async (): Promise<HealthPermissionsStatus> => {
            setIsLoading(true);
            setError(null);

            try {
                const nextStatus = await requestCardioPermissions({
                    permissions,
                });

                setStatus(nextStatus);

                const granted = arePermissionsGranted(nextStatus, permissions);
                await writePersistedCardioGranted(granted);
                setIsGrantedPersisted(granted);

                return nextStatus;
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Failed to request cardio permissions.";

                setError(message);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [permissions]
    );

    React.useEffect(() => {
        if (options?.autoRefresh === false) {
            return;
        }

        let isMounted = true;

        void (async () => {
            try {
                const persistedGranted = await readPersistedCardioGranted();
                const nextStatus = await getCardioPermissionsStatus({
                    permissions,
                });

                if (!isMounted) return;

                setStatus(nextStatus);

                const grantedFromNative = arePermissionsGranted(nextStatus, permissions);
                setIsGrantedPersisted(grantedFromNative || persistedGranted);
            } catch (err: unknown) {
                if (!isMounted) return;

                const message =
                    err instanceof Error ? err.message : "Failed to load cardio permissions.";

                setError(message);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [options?.autoRefresh, permissions]);

    const isGranted = React.useMemo<boolean>(() => {
        const grantedFromNative = arePermissionsGranted(status, permissions);
        return grantedFromNative || isGrantedPersisted;
    }, [isGrantedPersisted, permissions, status]);

    return {
        status,
        isGranted,
        isLoading,
        error,
        requestPermissions: requestPermissionsAction,
        refreshPermissions,
    };
}
