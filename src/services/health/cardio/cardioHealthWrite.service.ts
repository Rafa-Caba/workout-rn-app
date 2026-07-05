// src/services/health/cardio/cardioHealthWrite.service.ts
// Platform facade for writing app-created Cardio sessions to the OS health library.

import { Platform } from "react-native";

import { writeCardioWorkoutToHealthConnect } from "@/src/services/health/cardio/cardioAndroidWrite.service";
import { writeCardioWorkoutToHealthKit } from "@/src/services/health/cardio/cardioIOSWrite.service";
import { patchSession } from "@/src/services/workout/sessions.service";
import type {
    CardioHealthWriteBackendPatch,
    CardioHealthWriteInput,
    CardioHealthWriteResult,
} from "@/src/types/health/cardio/cardioHealthWrite.types";
import type { WorkoutSessionMeta } from "@/src/types/workoutDay.types";
import {
    buildFallbackHealthWritePatch,
    buildHealthWriteMetaPatch,
} from "@/src/services/health/cardio/cardioHealthWrite.helpers";

function buildUnsupportedResult(): CardioHealthWriteResult {
    return {
        provider: Platform.OS === "android" ? "health-connect" : "healthkit",
        status: "failed",
        externalId: null,
        writtenAt: null,
        error: "La escritura a Health solo está soportada en iOS y Android.",
        details: [],
    };
}

export async function writeCardioWorkoutToOS(
    input: CardioHealthWriteInput
): Promise<CardioHealthWriteResult> {
    if (Platform.OS === "ios") {
        return writeCardioWorkoutToHealthKit(input);
    }

    if (Platform.OS === "android") {
        return writeCardioWorkoutToHealthConnect(input);
    }

    return buildUnsupportedResult();
}

function buildBackendPatchFromResult(
    result: CardioHealthWriteResult
): CardioHealthWriteBackendPatch {
    return buildFallbackHealthWritePatch(
        result.status,
        result.externalId,
        result.writtenAt
    );
}

export async function patchCardioHealthWriteStatus(input: {
    date: string;
    sessionId: string;
    currentMeta: WorkoutSessionMeta | null;
    result: CardioHealthWriteResult;
}): Promise<void> {
    const meta = buildHealthWriteMetaPatch(
        input.currentMeta,
        buildBackendPatchFromResult(input.result)
    );

    await patchSession(
        input.date,
        input.sessionId,
        { meta },
        { returnMode: "session" }
    );
}

export async function writeCardioWorkoutToOSAndPatchBackend(
    input: CardioHealthWriteInput
): Promise<CardioHealthWriteResult> {
    const result = await writeCardioWorkoutToOS(input);

    await patchCardioHealthWriteStatus({
        date: input.date,
        sessionId: input.session.id,
        currentMeta: input.session.meta,
        result,
    });

    return result;
}
