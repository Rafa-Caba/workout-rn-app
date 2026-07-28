// src/features/daySummary/components/DaySessionsSection.tsx

/**
 * Unified training panel.
 * Gym / Training and Cardio are rendered as independent blocks so each one can
 * show category-specific metrics and empty states without mixing semantics.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import type { WorkoutSession } from "@/src/types/workoutDay.types";

import { DayDetailSection } from "./DayDetailSection";
import { DayPill } from "./DayMetricGrid";
import { DaySessionCard } from "./DaySessionCard";
import type { DayUiColors } from "./dayDetail.helpers";
import { countMedia, splitSessionsByKind } from "./dayDetail.helpers";

type Props = {
    date: string;
    sessions: WorkoutSession[];
    colors: DayUiColors;
    onOpenMedia: (item: MediaViewerItem) => void;
};

type SessionGroupProps = {
    title: string;
    icon: string;
    emptyTitle: string;
    emptyDescription: string;
    sessions: WorkoutSession[];
    date: string;
    colors: DayUiColors;
    onOpenMedia: (item: MediaViewerItem) => void;
};

function SessionGroup({
    title,
    icon,
    emptyTitle,
    emptyDescription,
    sessions,
    date,
    colors,
    onOpenMedia,
}: SessionGroupProps) {
    return (
        <View style={styles.group}>
            <View style={styles.groupHeader}>
                <Text style={[styles.groupTitle, { color: colors.text }]}>
                    {icon} {title}
                </Text>
                <View style={[styles.countBadge, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Text style={[styles.countBadgeText, { color: colors.mutedText }]}>{sessions.length}</Text>
                </View>
            </View>

            {sessions.length === 0 ? (
                <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyTitle}</Text>
                    <Text style={[styles.emptyDescription, { color: colors.mutedText }]}>{emptyDescription}</Text>
                </View>
            ) : (
                <View style={styles.sessionList}>
                    {sessions.map((session, index) => (
                        <DaySessionCard
                            key={session.id || `${date}-${title}-${index}`}
                            session={session}
                            date={date}
                            colors={colors}
                            onOpenMedia={onOpenMedia}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

export function DaySessionsSection({ date, sessions, colors, onOpenMedia }: Props) {
    const groups = splitSessionsByKind(sessions);
    const mediaCount = countMedia(sessions);

    return (
        <DayDetailSection title="🏋️ Entrenamiento" colors={colors}>
            <View style={styles.summaryPills}>
                <DayPill label={`🏋️ Sesiones Gym: ${groups.gym.length}`} colors={colors} />
                <DayPill label={`🚶 Sesiones Cardio: ${groups.cardio.length}`} colors={colors} />
                <DayPill label={`📎 Media total: ${mediaCount}`} colors={colors} />
            </View>

            <SessionGroup
                title="Gym / Training"
                icon="🏋️"
                emptyTitle="Sin sesiones de Gym"
                emptyDescription="Las sesiones de Gym Check, importaciones de fuerza o registros manuales aparecerán aquí."
                sessions={groups.gym}
                date={date}
                colors={colors}
                onOpenMedia={onOpenMedia}
            />

            <SessionGroup
                title="Cardio"
                icon="🚶"
                emptyTitle="Sin sesiones de Cardio"
                emptyDescription="Las caminatas, carreras y sesiones Cardio manuales o en vivo aparecerán aquí."
                sessions={groups.cardio}
                date={date}
                colors={colors}
                onOpenMedia={onOpenMedia}
            />
        </DayDetailSection>
    );
}

const styles = StyleSheet.create({
    summaryPills: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    group: {
        gap: 9,
    },
    groupHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    groupTitle: {
        fontSize: 15,
        fontWeight: "900",
    },
    countBadge: {
        minWidth: 25,
        height: 25,
        paddingHorizontal: 7,
        borderWidth: 1,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    countBadgeText: {
        fontSize: 11,
        fontWeight: "900",
    },
    sessionList: {
        gap: 11,
    },
    emptyState: {
        borderWidth: 1,
        borderStyle: "dashed",
        borderRadius: 14,
        padding: 14,
        gap: 5,
    },
    emptyTitle: {
        fontSize: 13,
        fontWeight: "900",
    },
    emptyDescription: {
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 18,
    },
});
