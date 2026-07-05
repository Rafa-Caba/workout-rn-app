// src/hooks/cardio/useCardioLiveSession.ts
// React hook that manages foreground phone-GPS tracking for outdoor Cardio live sessions.

import React from "react";

import {
    buildCardioLiveRouteSummary,
    getLocalIsoDateFromDate,
    resolveCardioLiveAvgSpeedKmh,
    resolveCardioLiveMaxSpeedKmh,
    resolveCardioLivePaceSecPerKm,
} from "@/src/services/health/cardio/cardioLiveSession.mapper";
import {
    calculateDistanceMeters,
    requestCardioLiveLocationPermission,
    shouldAcceptLiveRoutePoint,
    startCardioLiveLocationWatcher,
    type CardioLiveTrackerSubscription,
} from "@/src/services/health/cardio/cardioLiveTracker.service";
import type {
    CardioLiveLocationPermissionStatus,
    CardioLiveRoutePoint,
    CardioLiveSessionError,
    CardioLiveSessionSnapshot,
    CardioLiveSessionStatus,
} from "@/src/types/health/cardio/cardioLiveSession.types";
import type { CardioActivityType } from "@/src/types/health/cardio/healthCardio.types";

export type UseCardioLiveSessionArgs = {
    activityType: CardioActivityType;
};

export type UseCardioLiveSessionReturn = {
    status: CardioLiveSessionStatus;
    permissionStatus: CardioLiveLocationPermissionStatus;
    activityType: CardioActivityType;
    error: CardioLiveSessionError | null;

    startAt: string | null;
    endAt: string | null;
    elapsedSeconds: number;
    distanceKm: number;
    paceSecPerKm: number | null;
    avgSpeedKmh: number | null;
    maxSpeedKmh: number | null;
    routePoints: CardioLiveRoutePoint[];

    requestPermissions: () => Promise<boolean>;
    start: () => Promise<void>;
    pause: () => void;
    resume: () => Promise<void>;
    finish: () => Promise<CardioLiveSessionSnapshot | null>;
    cancel: () => void;
    clearError: () => void;
};

function nowMs(): number {
    return Date.now();
}

function toIso(ms: number): string {
    return new Date(ms).toISOString();
}

function roundDistanceKm(distanceMeters: number): number {
    return Math.round((distanceMeters / 1000) * 1000) / 1000;
}

function buildError(
    code: CardioLiveSessionError["code"],
    message: string
): CardioLiveSessionError {
    return { code, message };
}

export function useCardioLiveSession(
    args: UseCardioLiveSessionArgs
): UseCardioLiveSessionReturn {
    const watcherRef = React.useRef<CardioLiveTrackerSubscription | null>(null);
    const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const activeStartedMsRef = React.useRef<number | null>(null);
    const accumulatedMsRef = React.useRef<number>(0);
    const startedAtMsRef = React.useRef<number | null>(null);
    const lastPointRef = React.useRef<CardioLiveRoutePoint | null>(null);
    const totalDistanceMetersRef = React.useRef<number>(0);

    const [status, setStatus] = React.useState<CardioLiveSessionStatus>("idle");
    const [permissionStatus, setPermissionStatus] = React.useState<CardioLiveLocationPermissionStatus>("unknown");
    const [error, setError] = React.useState<CardioLiveSessionError | null>(null);
    const [startAt, setStartAt] = React.useState<string | null>(null);
    const [endAt, setEndAt] = React.useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(0);
    const [distanceKm, setDistanceKm] = React.useState<number>(0);
    const [routePoints, setRoutePoints] = React.useState<CardioLiveRoutePoint[]>([]);

    const stopTimer = React.useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const stopWatcher = React.useCallback(() => {
        if (watcherRef.current) {
            watcherRef.current.remove();
            watcherRef.current = null;
        }
    }, []);

    const getCurrentElapsedMs = React.useCallback((): number => {
        const activeStartedMs = activeStartedMsRef.current;

        if (activeStartedMs === null) {
            return accumulatedMsRef.current;
        }

        return accumulatedMsRef.current + Math.max(0, nowMs() - activeStartedMs);
    }, []);

    const syncElapsedState = React.useCallback(() => {
        setElapsedSeconds(Math.floor(getCurrentElapsedMs() / 1000));
    }, [getCurrentElapsedMs]);

    const startTimer = React.useCallback(() => {
        stopTimer();
        syncElapsedState();

        timerRef.current = setInterval(() => {
            syncElapsedState();
        }, 1000);
    }, [stopTimer, syncElapsedState]);

    const handlePoint = React.useCallback((point: CardioLiveRoutePoint) => {
        const previousPoint = lastPointRef.current;

        if (!shouldAcceptLiveRoutePoint({ nextPoint: point, previousPoint })) {
            return;
        }

        if (previousPoint) {
            const deltaMeters = calculateDistanceMeters(previousPoint, point);
            totalDistanceMetersRef.current += deltaMeters;
            setDistanceKm(roundDistanceKm(totalDistanceMetersRef.current));
        }

        lastPointRef.current = point;
        setRoutePoints((prev) => [...prev, point]);
    }, []);

    const requestPermissions = React.useCallback(async (): Promise<boolean> => {
        setStatus((current) => (current === "idle" ? "requesting-permissions" : current));
        setError(null);

        const result = await requestCardioLiveLocationPermission();
        setPermissionStatus(result.status);

        if (result.status !== "granted") {
            setStatus("failed");
            setError(
                buildError(
                    result.status === "unavailable"
                        ? "LOCATION_UNAVAILABLE"
                        : "LOCATION_PERMISSION_DENIED",
                    result.message ?? "No se pudo obtener permiso de ubicación."
                )
            );
            return false;
        }

        setStatus((current) => (current === "requesting-permissions" ? "ready" : current));
        return true;
    }, []);

    const startWatcher = React.useCallback(async (): Promise<void> => {
        stopWatcher();

        watcherRef.current = await startCardioLiveLocationWatcher({
            onPoint: handlePoint,
            onError: (message) => {
                setError(buildError("TRACKING_START_FAILED", message));
            },
        });
    }, [handlePoint, stopWatcher]);

    const start = React.useCallback(async (): Promise<void> => {
        const allowed = await requestPermissions();
        if (!allowed) {
            return;
        }

        const startMs = nowMs();
        startedAtMsRef.current = startMs;
        activeStartedMsRef.current = startMs;
        accumulatedMsRef.current = 0;
        totalDistanceMetersRef.current = 0;
        lastPointRef.current = null;

        setStartAt(toIso(startMs));
        setEndAt(null);
        setElapsedSeconds(0);
        setDistanceKm(0);
        setRoutePoints([]);
        setStatus("running");
        setError(null);

        try {
            await startWatcher();
            startTimer();
        } catch (watchError) {
            stopTimer();
            stopWatcher();
            setStatus("failed");
            setError(
                buildError(
                    "TRACKING_START_FAILED",
                    watchError instanceof Error ? watchError.message : "No se pudo iniciar GPS."
                )
            );
        }
    }, [requestPermissions, startTimer, startWatcher, stopTimer, stopWatcher]);

    const pause = React.useCallback(() => {
        if (status !== "running") {
            return;
        }

        accumulatedMsRef.current = getCurrentElapsedMs();
        activeStartedMsRef.current = null;
        syncElapsedState();
        stopTimer();
        stopWatcher();
        setStatus("paused");
    }, [getCurrentElapsedMs, status, stopTimer, stopWatcher, syncElapsedState]);

    const resume = React.useCallback(async (): Promise<void> => {
        if (status !== "paused") {
            return;
        }

        const allowed = await requestPermissions();
        if (!allowed) {
            return;
        }

        activeStartedMsRef.current = nowMs();
        setStatus("running");
        setError(null);

        try {
            await startWatcher();
            startTimer();
        } catch (watchError) {
            setStatus("failed");
            setError(
                buildError(
                    "TRACKING_START_FAILED",
                    watchError instanceof Error ? watchError.message : "No se pudo reanudar GPS."
                )
            );
        }
    }, [requestPermissions, startTimer, startWatcher, status]);

    const finish = React.useCallback(async (): Promise<CardioLiveSessionSnapshot | null> => {
        if (status !== "running" && status !== "paused") {
            setError(buildError("SESSION_NOT_RUNNING", "No hay una sesión activa para finalizar."));
            return null;
        }

        const startedAtMs = startedAtMsRef.current;
        if (startedAtMs === null) {
            setError(buildError("SESSION_EMPTY", "La sesión no tiene hora de inicio."));
            return null;
        }

        const finalElapsedMs = getCurrentElapsedMs();
        const finalDurationSeconds = Math.max(0, Math.round(finalElapsedMs / 1000));

        if (finalDurationSeconds <= 0) {
            setError(buildError("SESSION_EMPTY", "La sesión duró muy poco para guardarse."));
            return null;
        }

        setStatus("finishing");
        stopTimer();
        stopWatcher();
        accumulatedMsRef.current = finalElapsedMs;
        activeStartedMsRef.current = null;

        const finishedAtMs = nowMs();
        const routeSummary = buildCardioLiveRouteSummary(routePoints);
        const finalDistanceKm = roundDistanceKm(totalDistanceMetersRef.current);
        const finalPaceSecPerKm = resolveCardioLivePaceSecPerKm({
            durationSeconds: finalDurationSeconds,
            distanceKm: finalDistanceKm,
        });
        const finalAvgSpeedKmh = resolveCardioLiveAvgSpeedKmh({
            durationSeconds: finalDurationSeconds,
            distanceKm: finalDistanceKm,
        });
        const finalMaxSpeedKmh = resolveCardioLiveMaxSpeedKmh(routePoints);

        const snapshot: CardioLiveSessionSnapshot = {
            activityType: args.activityType,
            date: getLocalIsoDateFromDate(new Date(startedAtMs)),
            startAt: toIso(startedAtMs),
            endAt: toIso(finishedAtMs),
            durationSeconds: finalDurationSeconds,
            distanceKm: finalDistanceKm,
            paceSecPerKm: finalPaceSecPerKm,
            avgSpeedKmh: finalAvgSpeedKmh,
            maxSpeedKmh: finalMaxSpeedKmh,
            routePoints,
            routeSummary,
            hasRoute: routePoints.length > 0 && routeSummary !== null,
        };

        setEndAt(snapshot.endAt);
        setElapsedSeconds(snapshot.durationSeconds);
        setDistanceKm(snapshot.distanceKm);
        setStatus("finished");

        return snapshot;
    }, [args.activityType, getCurrentElapsedMs, routePoints, status, stopTimer, stopWatcher]);

    const cancel = React.useCallback(() => {
        stopTimer();
        stopWatcher();
        activeStartedMsRef.current = null;
        accumulatedMsRef.current = 0;
        startedAtMsRef.current = null;
        lastPointRef.current = null;
        totalDistanceMetersRef.current = 0;
        setStatus("idle");
        setError(null);
        setStartAt(null);
        setEndAt(null);
        setElapsedSeconds(0);
        setDistanceKm(0);
        setRoutePoints([]);
    }, [stopTimer, stopWatcher]);

    const clearError = React.useCallback(() => {
        setError(null);
    }, []);

    React.useEffect(() => {
        return () => {
            stopTimer();
            stopWatcher();
        };
    }, [stopTimer, stopWatcher]);

    const paceSecPerKm = React.useMemo(() => {
        return resolveCardioLivePaceSecPerKm({ durationSeconds: elapsedSeconds, distanceKm });
    }, [distanceKm, elapsedSeconds]);

    const avgSpeedKmh = React.useMemo(() => {
        return resolveCardioLiveAvgSpeedKmh({ durationSeconds: elapsedSeconds, distanceKm });
    }, [distanceKm, elapsedSeconds]);

    const maxSpeedKmh = React.useMemo(() => {
        return resolveCardioLiveMaxSpeedKmh(routePoints);
    }, [routePoints]);

    return {
        status,
        permissionStatus,
        activityType: args.activityType,
        error,
        startAt,
        endAt,
        elapsedSeconds,
        distanceKm,
        paceSecPerKm,
        avgSpeedKmh,
        maxSpeedKmh,
        routePoints,
        requestPermissions,
        start,
        pause,
        resume,
        finish,
        cancel,
        clearError,
    };
}
