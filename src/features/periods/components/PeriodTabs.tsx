// src/features/periods/components/PeriodTabs.tsx
// Three-option segmented control for Months, Weeks, and Date Range.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PeriodTab } from "@/src/features/periods/utils/periods.helpers";
import { useTheme } from "@/src/theme/ThemeProvider";

const TABS: ReadonlyArray<{ value: PeriodTab; label: string }> = [
    { value: "month", label: "Meses" },
    { value: "week", label: "Semanas" },
    { value: "range", label: "Rango" },
];

type Props = {
    value: PeriodTab;
    onChange: (next: PeriodTab) => void;
};

export function PeriodTabs({ value, onChange }: Props) {
    const { colors } = useTheme();

    return (
        <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {TABS.map((tab) => {
                const active = tab.value === value;

                return (
                    <Pressable
                        key={tab.value}
                        accessibilityRole="tab"
                        accessibilityLabel={tab.label}
                        accessibilityState={{ selected: active }}
                        onPress={() => onChange(tab.value)}
                        style={({ pressed }) => [
                            styles.tab,
                            {
                                backgroundColor: active ? colors.primary : "transparent",
                                opacity: pressed ? 0.86 : 1,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.label,
                                { color: active ? colors.primaryText : colors.text },
                            ]}
                        >
                            {tab.label}
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
        borderRadius: 15,
        padding: 4,
        gap: 3,
    },
    tab: {
        flex: 1,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        paddingHorizontal: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: "900",
    },
});
