// /src/features/health/outdoor/utils/buildOutdoorManualSessionPayload.ts

import type { CreateSessionBody } from "@/src/services/workout/sessions.service";
import type { OutdoorActivityType } from "@/src/types/health/healthOutdoor.types";
import type { ISODate, WorkoutSession } from "@/src/types/workoutDay.types";

export type OutdoorManualSessionFormValues = {
    date: ISODate;
    activityType: OutdoorActivityType | null;

    startTime: string;
    endTime: string;
    durationMinutes: string;

    activeKcal: string;
    totalKcal: string;

    avgHr: string;
    maxHr: string;

    distanceKm: string;
    steps: string;
    elevationGainM: string;

    paceSecPerKm: string;
    avgSpeedKmh: string;
    maxSpeedKmh: string;

    cadenceRpm: string;
    strideLengthM: string;

    sourceDevice: string | null;
    notes: string;
};

export type BuildOutdoorManualSessionPayloadResult =
    | { ok: true; payload: CreateSessionBody }
    | { ok: false; error: string };

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function normalizeText(value: string): string {
    return value.trim();
}

function parseOptionalNumber(value: string): number | null {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) {
        return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalPositiveNumber(value: string): number | null {
    const parsed = parseOptionalNumber(value);
    if (!isFiniteNumber(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function parseTimeInput(value: string): { hour: number; minute: number } | null {
    const raw = value.trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})$/);

    if (!match) {
        return null;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return null;
    }

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
    }

    return { hour, minute };
}

function parseIsoDateParts(date: ISODate): { year: number; month: number; day: number } | null {
    const match = String(date).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }

    return { year, month, day };
}

function buildLocalIsoDateTime(date: ISODate, time: string): string | null {
    const dateParts = parseIsoDateParts(date);
    const timeParts = parseTimeInput(time);

    if (!dateParts || !timeParts) {
        return null;
    }

    const localDate = new Date(
        dateParts.year,
        dateParts.month - 1,
        dateParts.day,
        timeParts.hour,
        timeParts.minute,
        0,
        0
    );

    if (!Number.isFinite(localDate.getTime())) {
        return null;
    }

    return localDate.toISOString();
}

function buildSessionType(activityType: OutdoorActivityType): string {
    return activityType === "running" ? "Outdoor Running" : "Outdoor Walking";
}

function resolveDurationSeconds(input: {
    startAt: string;
    endAt: string | null;
    durationMinutes: number | null;
}): number | null {
    if (isFiniteNumber(input.durationMinutes) && input.durationMinutes > 0) {
        return Math.round(input.durationMinutes * 60);
    }

    if (!input.endAt) {
        return null;
    }

    const startMs = new Date(input.startAt).getTime();
    const endMs = new Date(input.endAt).getTime();

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return null;
    }

    return Math.round((endMs - startMs) / 1000);
}

function resolveComputedEndAt(input: {
    startAt: string;
    endAt: string | null;
    durationSeconds: number | null;
}): string | null {
    if (input.endAt) {
        return input.endAt;
    }

    if (!isFiniteNumber(input.durationSeconds) || input.durationSeconds <= 0) {
        return null;
    }

    const startMs = new Date(input.startAt).getTime();
    if (!Number.isFinite(startMs)) {
        return null;
    }

    return new Date(startMs + input.durationSeconds * 1000).toISOString();
}

function resolvePaceSecPerKm(input: {
    paceSecPerKm: number | null;
    distanceKm: number | null;
    durationSeconds: number | null;
}): number | null {
    if (isFiniteNumber(input.paceSecPerKm) && input.paceSecPerKm > 0) {
        return Math.round(input.paceSecPerKm);
    }

    if (
        !isFiniteNumber(input.distanceKm) ||
        input.distanceKm <= 0 ||
        !isFiniteNumber(input.durationSeconds) ||
        input.durationSeconds <= 0
    ) {
        return null;
    }

    return Math.round(input.durationSeconds / input.distanceKm);
}

function resolveAvgSpeedKmh(input: {
    avgSpeedKmh: number | null;
    distanceKm: number | null;
    durationSeconds: number | null;
}): number | null {
    if (isFiniteNumber(input.avgSpeedKmh) && input.avgSpeedKmh > 0) {
        return input.avgSpeedKmh;
    }

    if (
        !isFiniteNumber(input.distanceKm) ||
        input.distanceKm <= 0 ||
        !isFiniteNumber(input.durationSeconds) ||
        input.durationSeconds <= 0
    ) {
        return null;
    }

    const hours = input.durationSeconds / 3600;
    if (hours <= 0) {
        return null;
    }

    return Number((input.distanceKm / hours).toFixed(2));
}

function hasAtLeastOneMetric(values: OutdoorManualSessionFormValues): boolean {
    const metricValues = [
        values.durationMinutes,
        values.activeKcal,
        values.totalKcal,
        values.avgHr,
        values.maxHr,
        values.distanceKm,
        values.steps,
        values.elevationGainM,
        values.paceSecPerKm,
        values.avgSpeedKmh,
        values.maxSpeedKmh,
        values.cadenceRpm,
        values.strideLengthM,
        values.endTime,
    ];

    return metricValues.some((value) => normalizeText(value).length > 0);
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function formatIsoTimeToHHmm(value: string | null | undefined): string {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
        return "";
    }

    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatOptionalNumber(value: number | null | undefined): string {
    return isFiniteNumber(value) ? String(value) : "";
}

function formatDurationMinutes(durationSeconds: number | null | undefined): string {
    if (!isFiniteNumber(durationSeconds) || durationSeconds <= 0) {
        return "";
    }

    return String(Math.round(durationSeconds / 60));
}

export function buildOutdoorManualSessionFormFromSession(
    session: WorkoutSession,
    date: ISODate
): OutdoorManualSessionFormValues {
    const outdoorMetrics = session.outdoorMetrics ?? null;

    return {
        date,
        activityType: session.activityType,

        startTime: formatIsoTimeToHHmm(session.startAt),
        endTime: formatIsoTimeToHHmm(session.endAt),
        durationMinutes: formatDurationMinutes(session.durationSeconds),

        activeKcal: formatOptionalNumber(session.activeKcal),
        totalKcal: formatOptionalNumber(session.totalKcal),

        avgHr: formatOptionalNumber(session.avgHr),
        maxHr: formatOptionalNumber(session.maxHr),

        distanceKm: formatOptionalNumber(session.distanceKm),
        steps: formatOptionalNumber(session.steps),
        elevationGainM: formatOptionalNumber(session.elevationGainM),

        paceSecPerKm: formatOptionalNumber(session.paceSecPerKm),
        avgSpeedKmh: formatOptionalNumber(outdoorMetrics?.avgSpeedKmh),
        maxSpeedKmh: formatOptionalNumber(outdoorMetrics?.maxSpeedKmh),

        cadenceRpm: formatOptionalNumber(session.cadenceRpm),
        strideLengthM: formatOptionalNumber(outdoorMetrics?.strideLengthM),

        sourceDevice: session.meta?.sourceDevice ?? null,
        notes: session.notes ?? "",
    };
}

export function buildOutdoorManualSessionPayload(
    values: OutdoorManualSessionFormValues
): BuildOutdoorManualSessionPayloadResult {
    if (!values.activityType) {
        return {
            ok: false,
            error: "Selecciona si la sesión fue walking o running.",
        };
    }

    if (!values.startTime.trim()) {
        return {
            ok: false,
            error: "La hora de inicio es obligatoria.",
        };
    }

    if (!values.endTime.trim() && !values.durationMinutes.trim()) {
        return {
            ok: false,
            error: "Agrega hora de fin o duración para que la sesión siga el mismo patrón de Health.",
        };
    }

    if (!hasAtLeastOneMetric(values)) {
        return {
            ok: false,
            error: "Agrega al menos una métrica de la sesión antes de guardar.",
        };
    }

    const startAt = buildLocalIsoDateTime(values.date, values.startTime);
    if (!startAt) {
        return {
            ok: false,
            error: "La hora de inicio no tiene un formato válido. Usa HH:mm.",
        };
    }

    const rawEndAt = values.endTime.trim()
        ? buildLocalIsoDateTime(values.date, values.endTime)
        : null;

    if (values.endTime.trim() && !rawEndAt) {
        return {
            ok: false,
            error: "La hora de fin no tiene un formato válido. Usa HH:mm.",
        };
    }

    const durationMinutes = parseOptionalPositiveNumber(values.durationMinutes);
    const durationSeconds = resolveDurationSeconds({
        startAt,
        endAt: rawEndAt,
        durationMinutes,
    });

    const endAt = resolveComputedEndAt({
        startAt,
        endAt: rawEndAt,
        durationSeconds,
    });

    if (rawEndAt) {
        const startMs = new Date(startAt).getTime();
        const endMs = new Date(rawEndAt).getTime();

        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
            return {
                ok: false,
                error: "La hora de fin debe ser posterior a la hora de inicio.",
            };
        }
    }

    const activeKcal = parseOptionalPositiveNumber(values.activeKcal);
    const totalKcal = parseOptionalPositiveNumber(values.totalKcal);
    const avgHr = parseOptionalPositiveNumber(values.avgHr);
    const maxHr = parseOptionalPositiveNumber(values.maxHr);
    const distanceKm = parseOptionalPositiveNumber(values.distanceKm);
    const steps = parseOptionalPositiveNumber(values.steps);
    const elevationGainM = parseOptionalPositiveNumber(values.elevationGainM);
    const cadenceRpm = parseOptionalPositiveNumber(values.cadenceRpm);
    const strideLengthM = parseOptionalPositiveNumber(values.strideLengthM);
    const maxSpeedKmh = parseOptionalPositiveNumber(values.maxSpeedKmh);

    if (
        isFiniteNumber(activeKcal) &&
        isFiniteNumber(totalKcal) &&
        totalKcal < activeKcal
    ) {
        return {
            ok: false,
            error: "Las kcal totales no pueden ser menores a las kcal activas.",
        };
    }

    const paceSecPerKm = resolvePaceSecPerKm({
        paceSecPerKm: parseOptionalPositiveNumber(values.paceSecPerKm),
        distanceKm,
        durationSeconds,
    });

    const avgSpeedKmh = resolveAvgSpeedKmh({
        avgSpeedKmh: parseOptionalPositiveNumber(values.avgSpeedKmh),
        distanceKm,
        durationSeconds,
    });

    const notes = normalizeText(values.notes) || null;
    const sourceDevice = normalizeText(values.sourceDevice ?? "") || null;

    const payload: CreateSessionBody = {
        type: buildSessionType(values.activityType),
        activityType: values.activityType,

        startAt,
        endAt,

        durationSeconds,

        activeKcal,
        totalKcal,

        avgHr,
        maxHr,

        distanceKm,
        steps,
        elevationGainM,

        paceSecPerKm,
        cadenceRpm,

        hasRoute: false,
        routeSummary: null,
        outdoorMetrics: {
            distanceKm,
            steps,
            elevationGainM,
            paceSecPerKm,
            avgSpeedKmh,
            maxSpeedKmh,
            cadenceRpm,
            strideLengthM,
        },

        effortRpe: null,
        notes,
        exercises: null,

        meta: {
            source: "manual",
            sourceDevice,
            importedAt: null,
            lastSyncedAt: null,
            sessionKind: "manual-outdoor",
            externalId: null,
            originalType: null,
            provider: null,
        },
    };

    return {
        ok: true,
        payload,
    };
}