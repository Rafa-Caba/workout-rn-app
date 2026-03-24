// /src/features/daySummary/screens/DayDetailScreen.tsx

/**
 * DayDetailScreen
 *
 * Main entry for the day detail module.
 * It switches between:
 * - Resumen
 * - Día
 */

import { format } from "date-fns";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

import { DaySummaryScreen } from "./DaySummaryScreen";
import { DayTrainingSessionSleepDetailsScreen } from "./DayTrainingSessionSleepDetailsScreen";

type Props = {
    date: string;
};

type TabKey = "summary" | "day";

function safeParseIsoDate(isoDate: string): Date | null {
    if (!isoDate) return null;

    const dt = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return null;

    return dt;
}

function formatDayHeader(isoDate: string): { short: string; long: string } {
    const dt = safeParseIsoDate(isoDate);
    if (!dt) return { short: "—", long: "—" };

    const short = format(dt, "dd-MM-yyyy");
    const long = format(dt, "MMM dd, yyyy");

    return { short, long };
}

export function DayDetailScreen({ date }: Props) {
    const { colors } = useTheme();
    const [tab, setTab] = React.useState<TabKey>("summary");

    const label = React.useMemo(() => formatDayHeader(date), [date]);

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={styles.headerTextWrap}>
                    <Text style={[styles.title, { color: colors.text }]}>Día</Text>
                    <Text style={[styles.subtitle, { color: colors.mutedText }]} numberOfLines={1}>
                        {label.long}
                    </Text>
                </View>

                <View style={[styles.segment, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <SegmentButton
                        active={tab === "summary"}
                        title="Resumen"
                        onPress={() => setTab("summary")}
                        colors={colors}
                    />
                    <SegmentButton
                        active={tab === "day"}
                        title="Día"
                        onPress={() => setTab("day")}
                        colors={colors}
                    />
                </View>
            </View>

            <View style={styles.body}>
                {tab === "summary" ? (
                    <DaySummaryScreen date={date} />
                ) : (
                    <DayTrainingSessionSleepDetailsScreen date={date} />
                )}
            </View>
        </ScrollView>
    );
}

function SegmentButton(props: {
    active: boolean;
    title: string;
    onPress: () => void;
    colors: { primary: string; primaryText: string; text: string; border: string };
}) {
    const { active, title, onPress, colors } = props;

    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.segmentBtn,
                active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: "transparent", borderColor: "transparent" },
            ]}
        >
            <Text style={[styles.segmentBtnText, active ? { color: colors.primaryText } : { color: colors.text }]}>
                {title}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    headerTextWrap: { flex: 1 },
    title: { fontSize: 22, fontWeight: "800" },
    subtitle: { marginTop: 2, fontSize: 13, fontWeight: "600" },
    segment: {
        flexDirection: "row",
        borderWidth: 1,
        borderRadius: 12,
        padding: 2,
        alignItems: "center",
        gap: 5,
    },
    segmentBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        minWidth: 88,
        alignItems: "center",
        justifyContent: "center",
    },
    segmentBtnText: { fontSize: 13, fontWeight: "700" },
    body: { flex: 1, padding: 16 },
});