// src/types/health/healthCardio.types.ts
// Compatibility entry point. Cardio contracts live in one canonical module so
// screens and services cannot drift into slightly different shapes.

export type {
    CardioActivityType,
    CardioRoutePoint,
    HealthImportedCardioMetrics,
    HealthImportedCardioQuery,
    HealthImportedCardioRoute,
    HealthImportedCardioSession,
    HealthImportedCardioSessionsResult
} from "@/src/types/health/cardio/healthCardio.types";
