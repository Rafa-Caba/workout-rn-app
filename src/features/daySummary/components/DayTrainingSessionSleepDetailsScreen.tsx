// src/features/daySummary/components/DayTrainingSessionSleepDetailsScreen.tsx

import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import type { MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import { MediaViewerModal } from "@/src/features/components/media/MediaViewerModal";

import { useWorkoutDay } from "@/src/hooks/workout/useWorkoutDay";
import { useTheme } from "@/src/theme/ThemeProvider";

import { DayPill } from "../components/DayMetricGrid";
import { DaySessionsSection } from "../components/DaySessionsSection";
import { DaySleepSection } from "../components/DaySleepSection";
import {
    countMedia,
    normalizeSessions,
    type DayUiColors,
} from "../components/dayDetail.helpers";

type Props = {
    date: string;
};

export function DayTrainingSessionSleepDetailsScreen({ date }: Props) {
    const { colors } = useTheme();

    const uiColors: DayUiColors = {
        background: colors.background,
        surface: colors.surface,
        border: colors.border,
        text: colors.text,
        mutedText: colors.mutedText,
    };

    const { data: day, isLoading, isError } = useWorkoutDay(date);

    const [viewerVisible, setViewerVisible] = React.useState(false);
    const [viewerItem, setViewerItem] = React.useState<MediaViewerItem | null>(null);

    const openViewer = React.useCallback((item: MediaViewerItem) => {
        setViewerItem(item);
        setViewerVisible(true);
    }, []);

    const closeViewer = React.useCallback(() => {
        setViewerVisible(false);
        setViewerItem(null);
    }, []);

    if (isLoading) {
        return (
            <View style={[styles.center, { backgroundColor: uiColors.background }]}>
                <ActivityIndicator />
                <Text style={[styles.centerText, { color: uiColors.mutedText }]}>Cargando día...</Text>
            </View>
        );
    }

    if (isError) {
        return (
            <View style={[styles.center, { backgroundColor: uiColors.background }]}>
                <Text style={[styles.centerText, { color: uiColors.mutedText }]}>No se pudo cargar el día.</Text>
            </View>
        );
    }

    if (!day) {
        return (
            <View style={[styles.center, { backgroundColor: uiColors.background }]}>
                <Text style={[styles.centerText, { color: uiColors.mutedText }]}>No hay datos para este día.</Text>
            </View>
        );
    }

    const sessions = normalizeSessions(day);
    const sessionsCount = sessions.length;
    const mediaCount = countMedia(sessions);

    return (
        <View style={styles.container}>
            <MediaViewerModal visible={viewerVisible} item={viewerItem} onClose={closeViewer} />

            <View style={[styles.topRow, { borderColor: uiColors.border, backgroundColor: uiColors.surface }]}>
                <View style={styles.topRowLeft}>
                    <Text style={[styles.topRowTitle, { color: uiColors.text }]}>📅 Fecha</Text>
                    <Text style={[styles.topRowValue, { color: uiColors.mutedText }]}>{day.date || "—"}</Text>
                </View>

                <View style={styles.pills}>
                    <DayPill label={`🏋️ Sesiones: ${sessionsCount}`} colors={uiColors} />
                    <DayPill label={`🖼️ Media: ${mediaCount}`} colors={uiColors} />
                </View>
            </View>

            <DaySleepSection sleep={day.sleep} colors={uiColors} />

            <DaySessionsSection
                day={day}
                sessions={sessions}
                colors={uiColors}
                onOpenMedia={openViewer}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        gap: 12,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    centerText: {
        fontSize: 13,
        fontWeight: "600",
    },
    topRow: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    topRowLeft: {
        flex: 1,
    },
    topRowTitle: {
        fontSize: 12,
        fontWeight: "900",
    },
    topRowValue: {
        marginTop: 4,
        fontSize: 13,
        fontWeight: "700",
    },
    pills: {
        flexDirection: "row",
        gap: 8,
        flexWrap: "wrap",
    },
});