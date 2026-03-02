// src/features/movements/components/MovementListItem.tsx
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { Movement } from "@/src/types/movements.types";

type Props = {
    movement: Movement;
    onPress?: () => void;
};

export function MovementListItem({ movement, onPress }: Props) {
    const theme = useTheme();
    const { colors } = theme;

    const subtitleParts = [movement.muscleGroup, movement.equipment].filter(Boolean);
    const subtitle = subtitleParts.length ? subtitleParts.join(" • ") : "Sin detalles";

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.row,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.92 : 1,
                },
            ]}
        >
            <View
                style={[
                    styles.thumbWrap,
                    {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                    },
                ]}
            >
                {movement.media?.url ? (
                    <Image source={{ uri: movement.media.url }} style={styles.thumb} />
                ) : (
                    <Text style={[styles.thumbFallback, { color: colors.mutedText }]}>IMG</Text>
                )}
            </View>

            <View style={styles.meta}>
                <View style={styles.titleRow}>
                    <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                        {movement.name}
                    </Text>

                    {!movement.isActive ? (
                        <View style={[styles.badge, { borderColor: colors.border }]}>
                            <Text style={[styles.badgeText, { color: colors.mutedText }]}>Inactivo</Text>
                        </View>
                    ) : null}
                </View>

                <Text numberOfLines={1} style={[styles.subtitle, { color: colors.mutedText }]}>
                    {subtitle}
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 12,
    },
    thumbWrap: {
        width: 52,
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    thumb: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    thumbFallback: {
        fontWeight: "800",
        fontSize: 12,
    },
    meta: {
        flex: 1,
        gap: 4,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: "800",
    },
    subtitle: {
        fontSize: 13,
        fontWeight: "600",
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "800",
    },
});