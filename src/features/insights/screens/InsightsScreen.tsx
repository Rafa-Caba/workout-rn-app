// src/features/insights/screens/InsightsScreen.tsx
// Unified one-scroll Insights experience with shared filters and independent reloads.

import { format, subDays } from "date-fns";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { usePRs } from "@/src/hooks/summary/usePRs";
import { useRecovery } from "@/src/hooks/summary/useRecovery";
import { useStreaks } from "@/src/hooks/summary/useStreaks";
import type { StreaksMode } from "@/src/services/workout/insights.service";
import { useTheme } from "@/src/theme/ThemeProvider";

import { InsightsFiltersCard } from "../components/InsightsFiltersCard";
import { InsightsPRsSection } from "../components/InsightsPRsSection";
import { InsightsRecoverySection } from "../components/InsightsRecoverySection";
import { InsightsStreaksSection } from "../components/InsightsStreaksSection";
import { getRangeValidationMessage } from "../utils/insights.helpers";

/** Parses the optional streak gap while preserving an empty editing state. */
function parseGapDays(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return undefined;

    return Math.max(0, Math.trunc(parsed));
}

export function InsightsScreen() {
    const { colors } = useTheme();
    const today = React.useMemo(() => new Date(), []);

    const [mode, setMode] = React.useState<StreaksMode>("both");
    const [gapDaysText, setGapDaysText] = React.useState("0");
    const [asOf, setAsOf] = React.useState(() => format(today, "yyyy-MM-dd"));
    const [from, setFrom] = React.useState(() => format(subDays(today, 30), "yyyy-MM-dd"));
    const [to, setTo] = React.useState(() => format(today, "yyyy-MM-dd"));

    const gapDays = React.useMemo(() => parseGapDays(gapDaysText), [gapDaysText]);
    const rangeValidationMessage = React.useMemo(
        () => getRangeValidationMessage(from, to),
        [from, to],
    );
    const rangeEnabled = rangeValidationMessage === null;

    const streaksQuery = useStreaks(
        {
            mode,
            gapDays,
            asOf,
        },
        Boolean(asOf),
    );
    const prsQuery = usePRs({ from, to }, rangeEnabled);
    const recoveryQuery = useRecovery({ from, to }, rangeEnabled);

    return (
        <ScrollView
            style={[styles.screen, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
        >
            <View style={styles.hero}>
                <Text style={[styles.title, { color: colors.text }]}>Insights</Text>
                <Text style={[styles.subtitle, { color: colors.mutedText }]}>
                    Rachas, recuperación y récords personales en un solo lugar.
                </Text>
            </View>

            <InsightsFiltersCard
                mode={mode}
                onModeChange={setMode}
                gapDaysText={gapDaysText}
                onGapDaysTextChange={setGapDaysText}
                asOf={asOf}
                onAsOfChange={setAsOf}
                from={from}
                onFromChange={setFrom}
                to={to}
                onToChange={setTo}
                rangeValidationMessage={rangeValidationMessage}
            />

            <InsightsStreaksSection
                data={streaksQuery.data}
                loading={streaksQuery.isLoading}
                fetching={streaksQuery.isFetching}
                error={streaksQuery.error}
                onRefresh={() => {
                    void streaksQuery.refetch();
                }}
            />

            <InsightsRecoverySection
                data={recoveryQuery.data}
                loading={recoveryQuery.isLoading}
                fetching={recoveryQuery.isFetching}
                error={recoveryQuery.error}
                rangeValidationMessage={rangeValidationMessage}
                onRefresh={() => {
                    void recoveryQuery.refetch();
                }}
            />

            <InsightsPRsSection
                data={prsQuery.data}
                loading={prsQuery.isLoading}
                fetching={prsQuery.isFetching}
                error={prsQuery.error}
                rangeValidationMessage={rangeValidationMessage}
                onRefresh={() => {
                    void prsQuery.refetch();
                }}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 42,
        gap: 14,
    },
    hero: {
        gap: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: "900",
    },
    subtitle: {
        fontSize: 13,
        fontWeight: "700",
        lineHeight: 19,
    },
});
