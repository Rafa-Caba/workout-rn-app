// src/services/health/outdoor/outdoorHealth.service.ts

import { Platform } from "react-native";

import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import {
    getOutdoorAndroidPermissionsStatus,
    isOutdoorAndroidAvailable,
    readOutdoorAndroidSessions,
    requestOutdoorAndroidPermissions,
} from "@/src/services/health/outdoor/outdoorAndroid.service";
import {
    getOutdoorIOSPermissionsStatus,
    isOutdoorIOSAvailable,
    readOutdoorIOSSessions,
    requestOutdoorIOSPermissions,
} from "@/src/services/health/outdoor/outdoorIOS.service";
import type { HealthPermissionsStatus, HealthProvider } from "@/src/types/health/health.types";
import type {
    HealthImportedOutdoorQuery,
    HealthImportedOutdoorSessionsResult,
} from "@/src/types/health/healthOutdoor.types";

/**
 * Facade input types for the outdoor module.
 * Keep app-facing and neutral.
 */
export type OutdoorHealthPermissionsRequest = {
    permissions: HealthPermissionKey[];
};

export type OutdoorHealthReadSessionsInput = HealthImportedOutdoorQuery & {
    includeRoutes?: boolean;
};

function isIOS(): boolean {
    return Platform.OS === "ios";
}

function isAndroid(): boolean {
    return Platform.OS === "android";
}

function getCurrentProvider(): HealthProvider | null {
    if (isIOS()) return "healthkit";
    if (isAndroid()) return "health-connect";
    return null;
}

function getFallbackProvider(): HealthProvider {
    return getCurrentProvider() ?? "healthkit";
}

function buildUnavailablePermissionsStatus(): HealthPermissionsStatus {
    return {
        provider: getFallbackProvider(),
        available: false,
        permissions: {},
        checkedAt: new Date().toISOString(),
    };
}

function buildEmptySessionsResult(
    input: OutdoorHealthReadSessionsInput
): HealthImportedOutdoorSessionsResult {
    return {
        provider: input.provider,
        query: {
            provider: input.provider,
            date: input.date,
            from: input.from,
            to: input.to,
            activityTypes: input.activityTypes,
        },
        sessions: [],
        syncedAt: new Date().toISOString(),
    };
}

function throwUnsupportedPlatform(): never {
    throw new Error("Outdoor health service is only supported on iOS and Android.");
}

export async function isOutdoorHealthAvailable(): Promise<boolean> {
    if (isIOS()) {
        return isOutdoorIOSAvailable();
    }

    if (isAndroid()) {
        return isOutdoorAndroidAvailable();
    }

    return false;
}

export async function getOutdoorHealthProvider(): Promise<HealthProvider | null> {
    return getCurrentProvider();
}

export async function getOutdoorPermissionsStatus(
    input: OutdoorHealthPermissionsRequest
): Promise<HealthPermissionsStatus> {
    if (isIOS()) {
        return getOutdoorIOSPermissionsStatus(input);
    }

    if (isAndroid()) {
        return getOutdoorAndroidPermissionsStatus(input);
    }

    return buildUnavailablePermissionsStatus();
}

export async function requestOutdoorPermissions(
    input: OutdoorHealthPermissionsRequest
): Promise<HealthPermissionsStatus> {
    if (isIOS()) {
        return requestOutdoorIOSPermissions(input);
    }

    if (isAndroid()) {
        return requestOutdoorAndroidPermissions(input);
    }

    return buildUnavailablePermissionsStatus();
}

export async function readOutdoorSessions(
    input: OutdoorHealthReadSessionsInput
): Promise<HealthImportedOutdoorSessionsResult> {
    if (isIOS()) {
        return readOutdoorIOSSessions(input);
    }

    if (isAndroid()) {
        return readOutdoorAndroidSessions(input);
    }

    return buildEmptySessionsResult(input);
}

export function assertOutdoorHealthSupportedPlatform(): void {
    if (isIOS() || isAndroid()) return;
    throwUnsupportedPlatform();
}