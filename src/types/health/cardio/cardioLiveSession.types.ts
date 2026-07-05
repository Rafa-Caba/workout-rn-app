// src/types/cardio/cardioLiveSession.types.ts
// Strongly typed live Cardio session contracts for phone GPS tracking.

import type { CardioActivityType } from "@/src/types/health/cardio/healthCardio.types";
import type {
    ISODate,
    ISODateTime,
    WorkoutRouteSummary,
    WorkoutSession,
} from "@/src/types/workoutDay.types";

export type CardioLiveSessionStatus =
    | "idle"
    | "requesting-permissions"
    | "ready"
    | "running"
    | "paused"
    | "finishing"
    | "finished"
    | "failed";

export type CardioLiveLocationPermissionStatus =
    | "unknown"
    | "granted"
    | "denied"
    | "unavailable";

export type CardioLiveRoutePoint = {
    latitude: number;
    longitude: number;
    altitudeM: number | null;
    speedMps: number | null;
    accuracyM: number | null;
    recordedAt: ISODateTime;
};

export type CardioLiveSessionSnapshot = {
    activityType: CardioActivityType;
    date: ISODate;

    startAt: ISODateTime;
    endAt: ISODateTime;
    durationSeconds: number;

    distanceKm: number;
    paceSecPerKm: number | null;
    avgSpeedKmh: number | null;
    maxSpeedKmh: number | null;

    routePoints: CardioLiveRoutePoint[];
    routeSummary: WorkoutRouteSummary | null;
    hasRoute: boolean;
};

export type CardioLiveSessionSavedResult = {
    date: ISODate;
    sessionId: string | null;
    session: WorkoutSession | null;
    snapshot: CardioLiveSessionSnapshot;
};

export type CardioLiveSessionError = {
    code:
    | "LOCATION_UNAVAILABLE"
    | "LOCATION_PERMISSION_DENIED"
    | "TRACKING_START_FAILED"
    | "SESSION_NOT_RUNNING"
    | "SESSION_EMPTY"
    | "SAVE_FAILED";
    message: string;
};
