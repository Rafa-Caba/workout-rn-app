// src/features/daySummary/components/DaySessionMediaGrid.tsx

import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { WorkoutMediaItem } from "@/src/types/workoutDay.types";
import type { DayUiColors } from "./dayDetail.helpers";

type Props = {
    items: WorkoutMediaItem[];
    colors: DayUiColors;
    onPress: (item: WorkoutMediaItem) => void;
};

export function DaySessionMediaGrid({ items, colors, onPress }: Props) {
    return (
        <View style={styles.mediaGrid}>
            {items.map((item) => (
                <Pressable
                    key={item.publicId}
                    onPress={() => onPress(item)}
                    style={[styles.mediaTile, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                    {item.resourceType === "image" ? (
                        <Image source={{ uri: item.url }} style={styles.mediaImage} resizeMode="cover" />
                    ) : (
                        <View style={styles.videoTile}>
                            <Text style={[styles.videoBadge, { color: colors.text }]}>🎬 Video</Text>
                            <Text style={[styles.videoHint, { color: colors.mutedText }]} numberOfLines={2}>
                                {item.format ? `.${item.format}` : "—"}
                            </Text>
                        </View>
                    )}

                    <View style={styles.mediaMetaRow}>
                        <Text style={[styles.mediaMetaText, { color: colors.mutedText }]} numberOfLines={1}>
                            {item.resourceType === "image" ? "🖼️ Imagen" : "🎬 Video"}
                        </Text>
                        <Text style={[styles.mediaMetaText, { color: colors.mutedText }]} numberOfLines={1}>
                            {item.format ? item.format.toUpperCase() : "—"}
                        </Text>
                    </View>
                </Pressable>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    mediaGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    mediaTile: {
        width: "48%",
        borderWidth: 1,
        borderRadius: 14,
        overflow: "hidden",
    },
    mediaImage: {
        width: "100%",
        height: 140,
    },
    mediaMetaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    mediaMetaText: {
        fontSize: 12,
        fontWeight: "800",
    },
    videoTile: {
        height: 140,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 10,
    },
    videoBadge: {
        fontSize: 14,
        fontWeight: "900",
    },
    videoHint: {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
    },
});