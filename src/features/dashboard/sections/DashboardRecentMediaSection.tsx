// /src/features/dashboard/sections/DashboardRecentMediaSection.tsx

import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import DashboardCard from "@/src/features/dashboard/components/DashboardCard";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { MediaFeedItem } from "@/src/types/media.types";

type Props = {
    items: MediaFeedItem[];
    isLoading: boolean;
    onSelect: (item: MediaFeedItem) => void;
};

export default function DashboardRecentMediaSection({
    items,
    isLoading,
    onSelect,
}: Props) {
    const { colors } = useTheme();

    return (
        <DashboardCard title="Media reciente">
            {isLoading && items.length === 0 ? (
                <Text style={{ color: colors.mutedText }}>Cargando...</Text>
            ) : null}

            {!isLoading && items.length === 0 ? (
                <Text style={{ color: colors.mutedText }}>Sin media.</Text>
            ) : null}

            {items.length > 0 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {items.map((item) => {
                        const isImage = item.resourceType === "image";

                        return (
                            <Pressable
                                key={`${item.source}:${item.publicId}`}
                                onPress={() => onSelect(item)}
                                style={{
                                    width: "48%",
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    borderRadius: 12,
                                    overflow: "hidden",
                                    backgroundColor: colors.background,
                                }}
                            >
                                {isImage ? (
                                    <Image
                                        source={{ uri: item.url }}
                                        style={{ width: "100%", height: 110 }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View
                                        style={{
                                            height: 110,
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: colors.mutedText,
                                                fontWeight: "900",
                                            }}
                                        >
                                            Video
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            ) : null}
        </DashboardCard>
    );
}