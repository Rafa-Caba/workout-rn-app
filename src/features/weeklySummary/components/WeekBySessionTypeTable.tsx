// src/features/weeklySummary/components/WeekBySessionTypeTable.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WeekBySessionTypeRow } from "@/src/utils/weeksExplorer";

type Props = {
    rows: WeekBySessionTypeRow[];
};

export function WeekBySessionTypeTable({ rows }: Props) {
    const { colors } = useTheme();

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Por tipo de sesión</Text>

            <View style={[styles.headerRow, { borderColor: colors.border }]}>
                <Text style={[styles.hCellLeft, { color: colors.mutedText }]}>Tipo</Text>
                <Text style={[styles.hCell, { color: colors.mutedText }]}>Sesiones</Text>
                <Text style={[styles.hCell, { color: colors.mutedText }]}>Duración (min)</Text>
                <Text style={[styles.hCell, { color: colors.mutedText }]}>Kcal</Text>
            </View>

            {rows.length === 0 ? (
                <Text style={[styles.empty, { color: colors.mutedText }]}>Sin datos.</Text>
            ) : (
                rows.map((r, idx) => (
                    <View key={`${r.sessionType}-${idx}`} style={[styles.row, { borderColor: colors.border }]}>
                        <Text style={[styles.cellLeft, { color: colors.text }]} numberOfLines={1}>
                            {r.sessionType}
                        </Text>
                        <Text style={[styles.cell, { color: colors.text }]} numberOfLines={1}>
                            {String(r.sessionsCount)}
                        </Text>
                        <Text style={[styles.cell, { color: colors.text }]} numberOfLines={1}>
                            {String(r.durationMinutes)}
                        </Text>
                        <Text style={[styles.cell, { color: colors.text }]} numberOfLines={1}>
                            {String(r.activeKcal)}
                        </Text>
                    </View>
                ))
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
    title: { fontSize: 14, fontWeight: "900" },

    headerRow: {
        flexDirection: "row",
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 10,
        gap: 8,
    },
    hCellLeft: { flex: 2, fontSize: 12, fontWeight: "900" },
    hCell: { flex: 1, textAlign: "right", fontSize: 12, fontWeight: "900" },

    row: {
        flexDirection: "row",
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 10,
        gap: 8,
    },
    cellLeft: { flex: 2, fontSize: 12, fontWeight: "800" },
    cell: { flex: 1, textAlign: "right", fontSize: 12, fontWeight: "800" },

    empty: { fontSize: 13, fontWeight: "700" },
});