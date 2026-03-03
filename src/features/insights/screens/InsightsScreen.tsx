// src/features/insights/screens/InsightsScreen.tsx
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

import { InsightsPRsTab } from "../components/InsightsPRsTab";
import { InsightsRecoveryTab } from "../components/InsightsRecoveryTab";
import { InsightsStreaksTab } from "../components/InsightsStreaksTab";
import { InsightsTabs, type InsightsTab } from "../components/InsightsTabs";

export function InsightsScreen() {
    const { colors } = useTheme();

    const [tab, setTab] = React.useState<InsightsTab>("streaks");

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>Insights</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>Explora rachas, PRs y recuperación.</Text>
            </View>

            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "900", color: colors.text }}>Explorar</Text>

                <View style={{ height: 10 }} />

                <InsightsTabs value={tab} onChange={setTab} />
            </View>

            {tab === "streaks" ? <InsightsStreaksTab /> : null}
            {tab === "prs" ? <InsightsPRsTab /> : null}
            {tab === "recovery" ? <InsightsRecoveryTab /> : null}

            {null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, gap: 14, paddingBottom: 32 },
    card: { borderWidth: 1, borderRadius: 16, padding: 12 },
});