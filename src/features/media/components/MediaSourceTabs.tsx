// src/features/media/components/MediaSourceTabs.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export type MediaSourceTab = "all" | "day" | "routine";

type Props = {
    value: MediaSourceTab;
    onChange: (next: MediaSourceTab) => void;
};

export function MediaSourceTabs({ value, onChange }: Props) {
    const { colors } = useTheme();

    return (
        <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <TabButton label="Todo" active={value === "all"} onPress={() => onChange("all")} />
            <TabButton label="Días" active={value === "day"} onPress={() => onChange("day")} />
            <TabButton label="Rutinas" active={value === "routine"} onPress={() => onChange("routine")} />
        </View>
    );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.btn,
                {
                    backgroundColor: active ? colors.primary : "transparent",
                    borderColor: active ? colors.primary : "transparent",
                    opacity: pressed ? 0.92 : 1,
                },
            ]}
        >
            <Text style={[styles.btnText, { color: active ? colors.primaryText : colors.text }]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        borderWidth: 1,
        borderRadius: 14,
        padding: 4,
        gap: 6,
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: 'center',
    },
    btn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: 92,
        alignItems: "center",
        justifyContent: "center",
    },
    btnText: { fontSize: 12, fontWeight: "900" },
});