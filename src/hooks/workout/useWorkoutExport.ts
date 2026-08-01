// /src/hooks/workout/useWorkoutExport.ts
// React Query mutation for generating and sharing XLSX/PDF workout reports.

import { useMutation } from "@tanstack/react-query";

import { shareWorkoutReport } from "@/src/services/workout/export.service";
import type {
    WorkoutReportFile,
    WorkoutReportRequest,
} from "@/src/types/workoutExport.types";

export function useWorkoutExport() {
    return useMutation<WorkoutReportFile, Error, WorkoutReportRequest>({
        mutationFn: shareWorkoutReport,
    });
}
