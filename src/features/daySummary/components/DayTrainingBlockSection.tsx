// /src/features/daySummary/components/DayTrainingBlockSection.tsx

/**
 * Compatibility wrapper for consumers that still pass a complete WorkoutDay.
 * The unified session panel only needs the canonical date plus its sessions.
 */

import React from "react";

import type { MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import type { WorkoutDay, WorkoutSession } from "@/src/types/workoutDay.types";

import { DaySessionsSection } from "./DaySessionsSection";
import type { DayUiColors } from "./dayDetail.helpers";

type Props = {
    day: WorkoutDay;
    sessions: WorkoutSession[];
    colors: DayUiColors;
    onOpenMedia: (item: MediaViewerItem) => void;
};

export function DayTrainingBlockSection({ day, sessions, colors, onOpenMedia }: Props) {
    return (
        <DaySessionsSection
            date={day.date}
            sessions={sessions}
            colors={colors}
            onOpenMedia={onOpenMedia}
        />
    );
}

export default DayTrainingBlockSection;
