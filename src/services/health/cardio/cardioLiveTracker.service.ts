// src/services/cardio/cardioLiveTracker.service.ts
// Foreground phone-GPS tracking helpers for outdoor Cardio live sessions.

import * as Location from "expo-location";

import type {
    CardioLiveLocationPermissionStatus,
    CardioLiveRoutePoint,
} from "@/src/types/health/cardio/cardioLiveSession.types";

export type CardioLiveLocationPermissionResult = {
    status: CardioLiveLocationPermissionStatus;
    canAskAgain: boolean;
    message: string | null;
};

export type CardioLiveTrackerSubscription = {
    remove: () => void;
};

export type CardioLiveLocationWatcherOptions = {
    onPoint: (point: CardioLiveRoutePoint) => void;
    onError: (message: string) => void;
};

const EARTH_RADIUS_M = 6371000;
const MIN_POINT_DISTANCE_M = 2;
const MAX_ACCEPTED_ACCURACY_M = 75;

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function degreesToRadians(value: number): number {
    return (value * Math.PI) / 180;
}

export function calculateDistanceMeters(
    from: Pick<CardioLiveRoutePoint, "latitude" | "longitude">,
    to: Pick<CardioLiveRoutePoint, "latitude" | "longitude">
): number {
    const lat1 = degreesToRadians(from.latitude);
    const lat2 = degreesToRadians(to.latitude);
    const deltaLat = degreesToRadians(to.latitude - from.latitude);
    const deltaLon = degreesToRadians(to.longitude - from.longitude);

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_M * c;
}

export function shouldAcceptLiveRoutePoint(input: {
    nextPoint: CardioLiveRoutePoint;
    previousPoint: CardioLiveRoutePoint | null;
}): boolean {
    const accuracy = input.nextPoint.accuracyM;

    if (
        isFiniteNumber(accuracy) &&
        accuracy > MAX_ACCEPTED_ACCURACY_M &&
        input.previousPoint !== null
    ) {
        return false;
    }

    if (!input.previousPoint) {
        return true;
    }

    const distanceMeters = calculateDistanceMeters(input.previousPoint, input.nextPoint);

    return distanceMeters >= MIN_POINT_DISTANCE_M;
}

export function mapExpoLocationToLiveRoutePoint(
    location: Location.LocationObject
): CardioLiveRoutePoint | null {
    const latitude = location.coords.latitude;
    const longitude = location.coords.longitude;

    if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
        return null;
    }

    return {
        latitude,
        longitude,
        altitudeM: isFiniteNumber(location.coords.altitude) ? location.coords.altitude : null,
        speedMps: isFiniteNumber(location.coords.speed) ? location.coords.speed : null,
        accuracyM: isFiniteNumber(location.coords.accuracy) ? location.coords.accuracy : null,
        recordedAt: new Date(location.timestamp).toISOString(),
    };
}

export async function requestCardioLiveLocationPermission(): Promise<CardioLiveLocationPermissionResult> {
    const servicesEnabled = await Location.hasServicesEnabledAsync();

    if (!servicesEnabled) {
        return {
            status: "unavailable",
            canAskAgain: false,
            message: "Los servicios de ubicación están apagados en este dispositivo.",
        };
    }

    const current = await Location.getForegroundPermissionsAsync();

    if (current.granted) {
        return {
            status: "granted",
            canAskAgain: current.canAskAgain,
            message: null,
        };
    }

    const requested = await Location.requestForegroundPermissionsAsync();

    if (!requested.granted) {
        return {
            status: "denied",
            canAskAgain: requested.canAskAgain,
            message: "Necesitamos permiso de ubicación para registrar caminatas o carreras outdoor.",
        };
    }

    return {
        status: "granted",
        canAskAgain: requested.canAskAgain,
        message: null,
    };
}

export async function startCardioLiveLocationWatcher(
    options: CardioLiveLocationWatcherOptions
): Promise<CardioLiveTrackerSubscription> {
    try {
        const subscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 1000,
                distanceInterval: 3,
            },
            (location) => {
                const point = mapExpoLocationToLiveRoutePoint(location);
                if (point) {
                    options.onPoint(point);
                }
            }
        );

        return {
            remove: () => subscription.remove(),
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo iniciar el GPS.";
        options.onError(message);
        throw error;
    }
}
