// src/hooks/health/outdoor/useOutdoorPermissions.ts

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";

import {
    OUTDOOR_HEALTH_READ_PERMISSIONS,
    type HealthPermissionKey,
} from "@/src/services/health/healthPermissionKeys";
import {
    getOutdoorPermissionsStatus,
    requestOutdoorPermissions,
} from "@/src/services/health/outdoor/outdoorHealth.service";
import type { HealthPermissionsStatus } from "@/src/types/health/health.types";

type UseOutdoorPermissionsOptions = {
    permissions?: HealthPermissionKey[];
    autoRefresh?: boolean;
};

type UseOutdoorPermissionsResult = {
    status: HealthPermissionsStatus | null;
    isGranted: boolean;
    isLoading: boolean;
    error: string | null;
    requestPermissions: () => Promise<HealthPermissionsStatus>;
    refreshPermissions: () => Promise<HealthPermissionsStatus>;
};

const OUTDOOR_PERMISSIONS_STORAGE_KEY = "health.outdoor.permissions.granted";

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

async function readPersistedOutdoorGranted(): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem(OUTDOOR_PERMISSIONS_STORAGE_KEY);
        return value === "true";
    } catch {
        return false;
    }
}

async function writePersistedOutdoorGranted(value: boolean): Promise<void> {
    try {
        await AsyncStorage.setItem(
            OUTDOOR_PERMISSIONS_STORAGE_KEY,
            value ? "true" : "false"
        );
    } catch {
        // no-op
    }
}

export function useOutdoorPermissions(
    options?: UseOutdoorPermissionsOptions
): UseOutdoorPermissionsResult {
    const permissions = React.useMemo<HealthPermissionKey[]>(
        () => options?.permissions ?? OUTDOOR_HEALTH_READ_PERMISSIONS,
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
            const nextStatus = await getOutdoorPermissionsStatus({
                permissions,
            });

            setStatus(nextStatus);

            const grantedFromNative = arePermissionsGranted(nextStatus, permissions);
            const persistedGranted = await readPersistedOutdoorGranted();

            if (grantedFromNative) {
                await writePersistedOutdoorGranted(true);
                setIsGrantedPersisted(true);
            } else {
                setIsGrantedPersisted(persistedGranted);
            }

            return nextStatus;
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Failed to refresh outdoor permissions.";

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
                const nextStatus = await requestOutdoorPermissions({
                    permissions,
                });

                setStatus(nextStatus);

                const granted = arePermissionsGranted(nextStatus, permissions);
                await writePersistedOutdoorGranted(granted);
                setIsGrantedPersisted(granted);

                return nextStatus;
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Failed to request outdoor permissions.";

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
                const persistedGranted = await readPersistedOutdoorGranted();
                const nextStatus = await getOutdoorPermissionsStatus({
                    permissions,
                });

                if (!isMounted) return;

                setStatus(nextStatus);

                const grantedFromNative = arePermissionsGranted(nextStatus, permissions);
                setIsGrantedPersisted(grantedFromNative || persistedGranted);
            } catch (err: unknown) {
                if (!isMounted) return;

                const message =
                    err instanceof Error ? err.message : "Failed to load outdoor permissions.";

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