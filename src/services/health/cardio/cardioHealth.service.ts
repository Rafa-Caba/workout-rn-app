// src/services/health/cardio/cardioHealth.service.ts

import { Platform } from "react-native";

import {
    getCardioAndroidPermissionsStatus,
    isCardioAndroidAvailable,
    readCardioAndroidSessions,
    requestCardioAndroidPermissions,
} from "@/src/services/health/cardio/cardioAndroid.service";
import {
    getCardioIOSPermissionsStatus,
    isCardioIOSAvailable,
    readCardioIOSSessions,
    requestCardioIOSPermissions,
} from "@/src/services/health/cardio/cardioIOS.service";
import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import type { HealthPermissionsStatus, HealthProvider } from "@/src/types/health/cardio/health.types";
import type {
    HealthImportedCardioQuery,
    HealthImportedCardioSessionsResult,
} from "@/src/types/health/cardio/healthCardio.types";

/**
 * Facade input types for the cardio module.
 * Keep app-facing and neutral.
 */
export type CardioHealthPermissionsRequest = {
    permissions: HealthPermissionKey[];
};

export type CardioHealthReadSessionsInput = HealthImportedCardioQuery & {
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
    input: CardioHealthReadSessionsInput
): HealthImportedCardioSessionsResult {
    return {
        provider: input.provider,
        query: {
            provider: input.provider,
            date: input.date,
            from: input.from,
            to: input.to,
            activityTypes: input.activityTypes,
            cardioEnvironments: input.cardioEnvironments,
        },
        sessions: [],
        syncedAt: new Date().toISOString(),
    };
}

function throwUnsupportedPlatform(): never {
    throw new Error("Cardio health service is only supported on iOS and Android.");
}

export async function isCardioHealthAvailable(): Promise<boolean> {
    if (isIOS()) {
        return isCardioIOSAvailable();
    }

    if (isAndroid()) {
        return isCardioAndroidAvailable();
    }

    return false;
}

export async function getCardioHealthProvider(): Promise<HealthProvider | null> {
    return getCurrentProvider();
}

export async function getCardioPermissionsStatus(
    input: CardioHealthPermissionsRequest
): Promise<HealthPermissionsStatus> {
    if (isIOS()) {
        return getCardioIOSPermissionsStatus(input);
    }

    if (isAndroid()) {
        return getCardioAndroidPermissionsStatus(input);
    }

    return buildUnavailablePermissionsStatus();
}

export async function requestCardioPermissions(
    input: CardioHealthPermissionsRequest
): Promise<HealthPermissionsStatus> {
    if (isIOS()) {
        return requestCardioIOSPermissions(input);
    }

    if (isAndroid()) {
        return requestCardioAndroidPermissions(input);
    }

    return buildUnavailablePermissionsStatus();
}

export async function readCardioSessions(
    input: CardioHealthReadSessionsInput
): Promise<HealthImportedCardioSessionsResult> {
    if (isIOS()) {
        return readCardioIOSSessions(input);
    }

    if (isAndroid()) {
        return readCardioAndroidSessions(input);
    }

    return buildEmptySessionsResult(input);
}

export function assertCardioHealthSupportedPlatform(): void {
    if (isIOS() || isAndroid()) return;
    throwUnsupportedPlatform();
}
