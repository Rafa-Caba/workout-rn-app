// src/hooks/health/useHealthPermissions.ts

import * as React from "react";

import {
    getHealthProvider,
    isHealthAvailable,
    requestHealthPermissions,
} from "@/src/services/health/health.service";
import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import { DEFAULT_HEALTH_READ_PERMISSIONS } from "@/src/services/health/healthPermissionKeys";
import type { HealthPermissionsStatus, HealthProvider } from "@/src/types/health/health.types";

type UseHealthPermissionsResult = {
    availability: boolean;
    granted: boolean;
    provider: HealthProvider | null;
    permissionsStatus: HealthPermissionsStatus | null;
    isCheckingAvailability: boolean;
    isRequestingPermissions: boolean;
    requestPermissions: (permissions?: HealthPermissionKey[]) => Promise<HealthPermissionsStatus>;
    refreshAvailability: () => Promise<boolean>;
};

function arePermissionsGranted(status: HealthPermissionsStatus | null): boolean {
    if (!status || !status.available) {
        return false;
    }

    const entries = Object.values(status.permissions);
    if (entries.length === 0) {
        return false;
    }

    return entries.every((value) => value === "granted");
}

export function useHealthPermissions(): UseHealthPermissionsResult {
    const [availability, setAvailability] = React.useState<boolean>(false);
    const [permissionsStatus, setPermissionsStatus] = React.useState<HealthPermissionsStatus | null>(null);
    const [isCheckingAvailability, setIsCheckingAvailability] = React.useState<boolean>(true);
    const [isRequestingPermissions, setIsRequestingPermissions] = React.useState<boolean>(false);
    const [provider, setProvider] = React.useState<HealthProvider | null>(null);

    const refreshAvailability = React.useCallback(async (): Promise<boolean> => {
        setIsCheckingAvailability(true);

        try {
            const [available, resolvedProvider] = await Promise.all([
                isHealthAvailable(),
                getHealthProvider(),
            ]);

            setAvailability(available);
            setProvider(resolvedProvider);

            return available;
        } finally {
            setIsCheckingAvailability(false);
        }
    }, []);

    React.useEffect(() => {
        void refreshAvailability();
    }, [refreshAvailability]);

    const requestPermissionsHandler = React.useCallback(
        async (
            permissions: HealthPermissionKey[] = DEFAULT_HEALTH_READ_PERMISSIONS
        ): Promise<HealthPermissionsStatus> => {
            setIsRequestingPermissions(true);

            try {
                const status = await requestHealthPermissions({ permissions });
                setPermissionsStatus(status);
                setAvailability(status.available);
                setProvider(status.provider);
                return status;
            } finally {
                setIsRequestingPermissions(false);
            }
        },
        []
    );

    const granted = React.useMemo<boolean>(() => {
        return arePermissionsGranted(permissionsStatus);
    }, [permissionsStatus]);

    return {
        availability,
        granted,
        provider,
        permissionsStatus,
        isCheckingAvailability,
        isRequestingPermissions,
        requestPermissions: requestPermissionsHandler,
        refreshAvailability,
    };
}