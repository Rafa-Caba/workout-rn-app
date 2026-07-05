// src/types/health/cardio/cardioHealthWrite.types.ts
// Strongly typed contracts for writing app-created Cardio workouts
// into Health Connect / HealthKit after the backend session is saved.

import type { CardioLiveSessionSnapshot } from "@/src/types/health/cardio/cardioLiveSession.types";
import type { HealthProvider } from "@/src/types/health/cardio/health.types";
import type {
    ISODate,
    ISODateTime,
    WorkoutHealthWriteStatus,
    WorkoutSession,
} from "@/src/types/workoutDay.types";

export type CardioHealthWriteProvider = HealthProvider;

export type CardioHealthWriteInput = {
    date: ISODate;
    session: WorkoutSession;
    snapshot: CardioLiveSessionSnapshot | null;
};

export type CardioHealthWriteDetail = {
    key: string;
    value: string | number | boolean | null;
};

export type CardioHealthWriteResult = {
    provider: CardioHealthWriteProvider;
    status: WorkoutHealthWriteStatus;
    externalId: string | null;
    writtenAt: ISODateTime | null;
    error: string | null;
    details: CardioHealthWriteDetail[];
};

export type CardioHealthWriteBackendPatch = {
    healthWriteStatus: WorkoutHealthWriteStatus;
    healthExternalId: string | null;
    healthWrittenAt: ISODateTime | null;
};
