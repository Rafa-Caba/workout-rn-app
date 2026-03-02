// src/features/media/screens/MediaExploreScreen.tsx
import { addWeeks, format } from "date-fns";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import { MediaViewerModal } from "@/src/features/components/media/MediaViewerModal";

import { DatePickerField } from "@/src/features/components/DatePickerField";
import { useMedia } from "@/src/hooks/useMedia";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { MediaFeedItem } from "@/src/types/media.types";
import { dedupeMediaFeedItems } from "@/src/utils/media/dedupe";
import { toWeekKey, weekKeyToStartDate } from "@/src/utils/weekKey";

import { MediaGrid } from "../components/MediaGrid";
import { MediaSourceTabs, type MediaSourceTab } from "../components/MediaSourceTabs";

type UiPageInfo = {
    pages: number;
    itemsInUi: number;
    nextCursor: string | null;
};

function todayIsoLocal(): string {
    return format(new Date(), "yyyy-MM-dd");
}

function toViewerItem(item: MediaFeedItem): MediaViewerItem {
    const title = item.resourceType === "image" ? "Imagen" : "Video";

    const subtitleParts: string[] = [];
    if (item.date) subtitleParts.push(item.date);
    if (item.sessionType) subtitleParts.push(item.sessionType);

    return {
        url: item.url,
        resourceType: item.resourceType,
        title,
        subtitle: subtitleParts.length ? subtitleParts.join(" • ") : null,
        tags: item.dayTags ?? null,
        notes: item.dayNotes ?? null,
        metaRows: [
            { label: "Fuente", value: item.source },
            { label: "WeekKey", value: item.weekKey },
            { label: "Formato", value: item.format ? item.format.toUpperCase() : "—" },
            { label: "Sesión", value: item.sessionType || "—" },
            { label: "Session ID", value: item.sessionId ? `${item.sessionId.slice(0, 4)}…${item.sessionId.slice(-4)}` : "—" },
        ],
    };
}

export function MediaExploreScreen() {
    const { colors } = useTheme();

    const [sourceTab, setSourceTab] = React.useState<MediaSourceTab>("all");

    // Días: day picker
    const [dayIso, setDayIso] = React.useState<string>(() => todayIsoLocal());

    // Rutinas: weekKey + prev/next
    const [routineWeekKey, setRoutineWeekKey] = React.useState<string>(() => toWeekKey(new Date()));

    // Paging
    const [cursor, setCursor] = React.useState<string | undefined>(undefined);
    const [limit] = React.useState<number>(12);

    const [items, setItems] = React.useState<MediaFeedItem[]>([]);
    const [nextCursor, setNextCursor] = React.useState<string | null>(null);

    // Viewer modal
    const [viewerVisible, setViewerVisible] = React.useState(false);
    const [viewerItem, setViewerItem] = React.useState<MediaViewerItem | null>(null);

    // Reset list when source changes
    React.useEffect(() => {
        setCursor(undefined);
        setItems([]);
        setNextCursor(null);
    }, [sourceTab]);

    // Reset list when day changes (relevant for Días)
    React.useEffect(() => {
        if (sourceTab !== "day") return;
        setCursor(undefined);
        setItems([]);
        setNextCursor(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dayIso]);

    // Reset list when routine week changes (relevant for Rutinas)
    React.useEffect(() => {
        if (sourceTab !== "routine") return;
        setCursor(undefined);
        setItems([]);
        setNextCursor(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routineWeekKey]);

    function goPrevRoutineWeek() {
        const start = weekKeyToStartDate(routineWeekKey);
        const prev = addWeeks(start, -1);
        setRoutineWeekKey(toWeekKey(prev));
    }

    function goNextRoutineWeek() {
        const start = weekKeyToStartDate(routineWeekKey);
        const next = addWeeks(start, 1);
        setRoutineWeekKey(toWeekKey(next));
    }

    const queryParams = React.useMemo(() => {
        // EXACT behavior requested:
        // - all: global (no filters)
        // - day: by date
        // - routine: by weekKey (with prev/next)
        if (sourceTab === "day") {
            return { source: "day" as const, date: dayIso, limit, cursor };
        }
        if (sourceTab === "routine") {
            return { source: "routine" as const, weekKey: routineWeekKey, limit, cursor };
        }
        // all (global)
        return { source: "all" as const, limit, cursor };
    }, [sourceTab, dayIso, routineWeekKey, limit, cursor]);

    const { data, isLoading, isFetching, isError } = useMedia(queryParams);

    // Merge/append when data arrives
    React.useEffect(() => {
        if (!data) return;

        setNextCursor(data.nextCursor ?? null);

        setItems((prev) => {
            const merged = dedupeMediaFeedItems([...(prev ?? []), ...(data.items ?? [])]);
            return merged;
        });
    }, [data]);

    const pageInfo: UiPageInfo = React.useMemo(() => {
        const pages = Math.max(1, Math.ceil((items.length || 0) / limit));
        return {
            pages,
            itemsInUi: items.length,
            nextCursor,
        };
    }, [items.length, limit, nextCursor]);

    const openViewer = React.useCallback((m: MediaFeedItem) => {
        setViewerItem(toViewerItem(m));
        setViewerVisible(true);
    }, []);

    const closeViewer = React.useCallback(() => {
        setViewerVisible(false);
        setViewerItem(null);
    }, []);

    const canLoadMore = Boolean(nextCursor) && !isFetching && !isLoading;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
        >
            <MediaViewerModal visible={viewerVisible} item={viewerItem} onClose={closeViewer} />

            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Media</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "600" }}>Explora archivos por fuente.</Text>
            </View>

            {/* Controls */}
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={{ gap: 10 }}>
                    <Text style={{ fontWeight: "800", color: colors.text }}>Explorar</Text>

                    <View style={{ gap: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: colors.mutedText }}>Fuente</Text>
                        <MediaSourceTabs value={sourceTab} onChange={setSourceTab} />
                    </View>

                    {/* Scope UI by tab */}
                    {sourceTab === "day" ? (
                        <View style={{ gap: 10 }}>
                            <DatePickerField
                                label="Fecha (Días)"
                                value={dayIso}
                                onChange={setDayIso}
                                displayFormat="MM/dd/yyyy"
                            />
                        </View>
                    ) : null}

                    {sourceTab === "routine" ? (
                        <View style={{ gap: 10 }}>
                            <View style={styles.routineNavRow}>
                                <Pressable
                                    onPress={goPrevRoutineWeek}
                                    style={({ pressed }) => ({
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                        opacity: pressed ? 0.92 : 1,
                                        flex: 1,
                                        alignItems: "center",
                                    })}
                                >
                                    <Text style={{ fontWeight: "800", color: colors.text, fontSize: 13 }}>← Semana anterior</Text>
                                </Pressable>

                                <Pressable
                                    onPress={goNextRoutineWeek}
                                    style={({ pressed }) => ({
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                        opacity: pressed ? 0.92 : 1,
                                        flex: 1,
                                        alignItems: "center",
                                    })}
                                >
                                    <Text style={{ fontWeight: "800", color: colors.text, fontSize: 13 }}>Semana siguiente →</Text>
                                </Pressable>
                            </View>

                            <View style={[styles.infoRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>weekKey (Rutinas):</Text>
                                <Text style={{ color: colors.text, fontWeight: "800" }}>{routineWeekKey}</Text>
                            </View>
                        </View>
                    ) : null}

                    {sourceTab === "all" ? (
                        <View style={[styles.infoRow, { borderColor: colors.border, backgroundColor: colors.background, width: '60%' }]}>
                            <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Mostrando:</Text>
                            <Text style={{ color: colors.text, fontWeight: "800", marginHorizontal: 'auto' }}>Todo</Text>
                        </View>
                    ) : null}

                    <View style={styles.actionsRow}>
                        <Pressable
                            onPress={() => canLoadMore && setCursor(nextCursor ?? undefined)}
                            disabled={!canLoadMore}
                            style={({ pressed }) => ({
                                paddingHorizontal: 14,
                                paddingVertical: 12,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                opacity: !canLoadMore ? 0.5 : pressed ? 0.92 : 1,
                            })}
                        >
                            <Text style={{ fontWeight: "800", color: colors.text }}>Siguiente página</Text>
                        </Pressable>

                        <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Items cargados: {pageInfo.itemsInUi}</Text>

                        {isFetching ? <Text style={{ color: colors.mutedText, fontWeight: "800" }}>sync</Text> : null}
                    </View>
                </View>
            </View>

            {/* Small stats cards */}
            <View style={styles.kpisRow}>
                <Kpi title="Total Items" value={pageInfo.itemsInUi} />
                <Kpi title="Páginas" value={pageInfo.pages} />
                <Kpi title="nextCursor" value={pageInfo.nextCursor ? "✓" : "—"} />
            </View>

            {/* Content */}
            {isLoading && items.length === 0 ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>Cargando media...</Text>
                </View>
            ) : isError ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>No se pudo cargar media.</Text>
                </View>
            ) : items.length === 0 ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Sin media.</Text>
                </View>
            ) : (
                <MediaGrid items={items} columns={3} onPressItem={openViewer} />
            )}

            {/* local component */}
            {null}

            {/*
                Keeping Kpi inside file for consistency with other screens.
            */}
        </ScrollView>
    );

    function Kpi({ title, value }: { title: string; value: string | number }) {
        return (
            <View style={[styles.kpiCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>{title}</Text>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>{String(value)}</Text>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 16, padding: 12 },

    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: "space-between",
    },

    routineNavRow: {
        flexDirection: "row",
        gap: 10,
    },

    infoRow: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },

    kpisRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    kpiCard: {
        flex: 1,
        minWidth: "30%",
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 6,
    },

    center: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
    },
});