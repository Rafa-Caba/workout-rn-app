// src/features/media/components/MediaGrid.tsx
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { MediaFeedItem } from "@/src/types/media.types";

type Props = {
    items: MediaFeedItem[];
    columns?: number;
    onPressItem: (item: MediaFeedItem) => void;
};

export function MediaGrid({ items, columns = 3, onPressItem }: Props) {
    const { colors } = useTheme();

    const tileWidthPct = React.useMemo(() => `${100 / columns}%` as const, [columns]);

    return (
        <View style={styles.grid}>
            {items.map((m) => (
                <Pressable
                    key={m.publicId}
                    onPress={() => onPressItem(m)}
                    style={({ pressed }) => [
                        styles.tileWrap,
                        { width: tileWidthPct, opacity: pressed ? 0.92 : 1 },
                    ]}
                >
                    <View style={[styles.tile, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                        {m.resourceType === "image" ? (
                            <Image source={{ uri: m.url }} style={styles.img} resizeMode="cover" />
                        ) : (
                            <View style={styles.videoBox}>
                                <Text style={[styles.videoBadge, { color: colors.text }]}>🎬 Video</Text>
                                <Text style={[styles.videoHint, { color: colors.mutedText }]} numberOfLines={1}>
                                    {m.format ? `.${m.format}` : "—"}
                                </Text>
                            </View>
                        )}

                        <View style={styles.meta}>
                            <Text style={[styles.metaTitle, { color: colors.text }]} numberOfLines={1}>
                                {m.publicId}
                            </Text>

                            <Text style={[styles.metaSub, { color: colors.mutedText }]} numberOfLines={1}>
                                {m.date ? `📅 ${m.date}` : "📎 Attachment"}
                            </Text>

                            <Text style={[styles.metaSub, { color: colors.mutedText }]} numberOfLines={1}>
                                {`src:${m.source}`}
                            </Text>
                        </View>
                    </View>
                </Pressable>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    grid: { flexDirection: "row", flexWrap: "wrap" },
    tileWrap: { padding: 4 },
    tile: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },

    img: { width: "100%", height: 110 },

    videoBox: { height: 110, alignItems: "center", justifyContent: "center", gap: 6 },
    videoBadge: { fontSize: 14, fontWeight: "900" },
    videoHint: { fontSize: 12, fontWeight: "800" },

    meta: { padding: 10, gap: 4 },
    metaTitle: { fontSize: 12, fontWeight: "900" },
    metaSub: { fontSize: 11, fontWeight: "800" },
});