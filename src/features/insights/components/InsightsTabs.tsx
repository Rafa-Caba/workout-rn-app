// src/features/insights/components/InsightsTabs.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export type InsightsTab = "streaks" | "prs" | "recovery";

type TabDef = { value: InsightsTab; label: string };

const TABS: TabDef[] = [
    { value: "streaks", label: "Rachas" },
    { value: "prs", label: "PRs" },
    { value: "recovery", label: "Recuperación" },
];

type Props = {
    value: InsightsTab;
    onChange: (next: InsightsTab) => void;
};

export function InsightsTabs({ value, onChange }: Props) {
    const { colors } = useTheme();

    return (
        <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
            {TABS.map((t) => {
                const active = t.value === value;
                return (
                    <Pressable
                        key={t.value}
                        onPress={() => onChange(t.value)}
                        style={({ pressed }) => [
                            styles.tab,
                            {
                                backgroundColor: active ? colors.primary : "transparent",
                                opacity: pressed ? 0.92 : 1,
                            },
                        ]}
                    >
                        <Text
                            style={{
                                fontWeight: "800",
                                color: active ? "#fff" : colors.text,
                                fontSize: 14,
                            }}
                        >
                            {t.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flexDirection: "row",
        borderWidth: 1,
        borderRadius: 16,
        padding: 4,
        gap: 2,
    },
    tab: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 14,
    },
});