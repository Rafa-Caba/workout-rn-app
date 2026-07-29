// src/features/insights/components/InsightsSectionCard.tsx
// Shared section shell with an independent refresh action and optional status badge.

import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type InsightsSectionCardProps = {
    title: string;
    subtitle: string;
    refreshLabel: string;
    refreshing: boolean;
    onRefresh: () => void;
    badgeLabel?: string;
    refreshDisabled?: boolean;
    children: React.ReactNode;
};

export function InsightsSectionCard({
    title,
    subtitle,
    refreshLabel,
    refreshing,
    onRefresh,
    badgeLabel,
    refreshDisabled = false,
    children,
}: InsightsSectionCardProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.header}>
                <View style={styles.headingCopy}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                        {badgeLabel ? (
                            <View style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <Text style={[styles.badgeText, { color: colors.text }]} numberOfLines={1}>
                                    {badgeLabel}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    <Text style={[styles.subtitle, { color: colors.mutedText }]}>{subtitle}</Text>
                </View>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={refreshLabel}
                    disabled={refreshing || refreshDisabled}
                    onPress={onRefresh}
                    style={({ pressed }) => [
                        styles.refreshButton,
                        {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            opacity: refreshing || refreshDisabled ? 0.55 : pressed ? 0.82 : 1,
                        },
                    ]}
                >
                    {refreshing ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <MaterialCommunityIcons name="refresh" size={18} color={colors.text} />
                    )}
                </Pressable>
            </View>

            <View style={styles.content}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        gap: 12,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    headingCopy: {
        flex: 1,
        gap: 3,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: "900",
    },
    subtitle: {
        fontSize: 12,
        fontWeight: "700",
        lineHeight: 17,
    },
    badge: {
        maxWidth: "68%",
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "900",
    },
    refreshButton: {
        width: 42,
        height: 42,
        borderWidth: 1,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    content: {
        gap: 10,
    },
});
