// /src/types/workoutExport.types.ts
// Shared contracts for requesting complete XLSX/PDF workout reports from the API.

export type WorkoutReportFormat = "xlsx" | "pdf";
export type WorkoutReportSelectionKind = "day" | "week" | "month" | "range";

export type WorkoutReportSelection =
    | {
        kind: "day";
        date: string;
    }
    | {
        kind: "week";
        date: string;
    }
    | {
        kind: "month";
        date: string;
    }
    | {
        kind: "range";
        from: string;
        to: string;
    };

export type WorkoutReportRequest = {
    selection: WorkoutReportSelection;
    format: WorkoutReportFormat;
    includeEmptyDays: boolean;
    includeMediaLinks: boolean;
    includeGpsPoints: boolean;
    includeTechnicalMetadata: boolean;
};

export type WorkoutReportFile = {
    filename: string;
    mimeType: string;
    uri: string;
};
