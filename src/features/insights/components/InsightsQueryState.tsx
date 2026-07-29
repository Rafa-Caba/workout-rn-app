// src/features/insights/components/InsightsQueryState.tsx
// Inline loading, error, and empty states for independently refreshable Insights cards.

import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type InsightsQueryStateProps = {
    kind: "loading" | "error" | "empty";
    title: string;
    description?: string;
    onRetry?: () => void;
};

export function InsightsQueryState({
    kind,
    title,
    description,
    onRetry,
}: InsightsQueryStateProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.state, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {kind === "loading" ? <ActivityIndicator color={colors.primary} /> : null}
            <Text style={[styles.title, { color: kind === "error" ? colors.danger : colors.text }]}>
                {title}
            </Text>
            {description ? (
                <Text style={[styles.description, { color: colors.mutedText }]}>{description}</Text>
            ) : null}

            {kind === "error" && onRetry ? (
                <Pressable
                    accessibilityRole="button"
                    onPress={onRetry}
                    style={({ pressed }) => [
                        styles.retryButton,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            opacity: pressed ? 0.82 : 1,
                        },
                    ]}
                >
                    <Text style={[styles.retryText, { color: colors.text }]}>Reintentar</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    state: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 15,
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
    },
    title: {
        fontSize: 14,
        fontWeight: "900",
        textAlign: "center",
    },
    description: {
        fontSize: 12,
        fontWeight: "700",
        lineHeight: 17,
        textAlign: "center",
    },
    retryButton: {
        marginTop: 3,
        minHeight: 40,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 15,
        alignItems: "center",
        justifyContent: "center",
    },
    retryText: {
        fontSize: 13,
        fontWeight: "900",
    },
});
