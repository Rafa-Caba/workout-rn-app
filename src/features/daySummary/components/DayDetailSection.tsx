// src/features/daySummary/components/DayDetailSection.tsx

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { DayUiColors } from "./dayDetail.helpers";

type Props = {
    title: string;
    colors: DayUiColors;
    children: React.ReactNode;
};

export function DayDetailSection({ title, colors, children }: Props) {
    return (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
            <View style={styles.sectionBody}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "900",
    },
    sectionBody: {
        marginTop: 10,
        gap: 10,
    },
});