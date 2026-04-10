// src/features/progress/components/BodyProgressHighlightsCard.tsx

import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { BodyProgressHighlight } from "@/src/types/bodyProgress.types";

type Props = {
    title: string;
    items: BodyProgressHighlight[];
};

export function BodyProgressHighlightsCard({ title, items }: Props) {
    const { colors } = useTheme();

    if (!items.length) {
        return null;
    }

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 12,
                gap: 10,
                backgroundColor: colors.surface,
            }}
        >
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17 }}>
                {title}
            </Text>

            <View style={{ gap: 10 }}>
                {items.map((item) => {
                    const accentColor =
                        item.tone === "positive"
                            ? colors.primary
                            : item.tone === "attention"
                                ? "#d97706"
                                : colors.mutedText;

                    return (
                        <View
                            key={item.id}
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 12,
                                padding: 10,
                                gap: 4,
                                backgroundColor: colors.background,
                            }}
                        >
                            <Text style={{ color: accentColor, fontWeight: "800" }}>
                                {item.title}
                            </Text>
                            <Text style={{ color: colors.text }}>{item.message}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}