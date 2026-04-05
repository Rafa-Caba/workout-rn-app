// /src/features/health/outdoor/components/OutdoorSessionMediaCard.tsx

import React from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    Text,
    View,
} from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutMediaItem } from "@/src/types/workoutDay.types";
import {
    formatOutdoorMediaDateTime,
} from "@/src/utils/health/outdoor/outdoorSessionMedia.helpers";

type Props = {
    item: WorkoutMediaItem;
    onPress: () => void;
    onDelete?: (() => void) | null;
    deleting?: boolean;
};

export default function OutdoorSessionMediaCard({
    item,
    onPress,
    onDelete = null,
    deleting = false,
}: Props) {
    const { colors } = useTheme();
    const [imageLoading, setImageLoading] = React.useState<boolean>(false);

    const isVideo = item.resourceType === "video";
    const subtitle = formatOutdoorMediaDateTime(item.createdAt);

    return (
        <View
            style={{
                width: "48%",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                overflow: "hidden",
                backgroundColor: colors.surface,
            }}
        >
            <Pressable onPress={onPress}>
                <View
                    style={{
                        height: 140,
                        backgroundColor: colors.card ?? colors.surface,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {isVideo ? (
                        <View
                            style={{
                                flex: 1,
                                width: "100%",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 12,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 34,
                                    marginBottom: 6,
                                }}
                            >
                                🎥
                            </Text>
                            <Text
                                style={{
                                    color: colors.text,
                                    fontWeight: "800",
                                }}
                            >
                                Video
                            </Text>
                        </View>
                    ) : (
                        <>
                            {imageLoading ? (
                                <View
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <ActivityIndicator />
                                </View>
                            ) : null}

                            <Image
                                source={{ uri: item.url }}
                                resizeMode="cover"
                                style={{ width: "100%", height: "100%" }}
                                onLoadStart={() => setImageLoading(true)}
                                onLoadEnd={() => setImageLoading(false)}
                            />
                        </>
                    )}
                </View>
            </Pressable>

            <View style={{ padding: 10, gap: 6 }}>
                <Text
                    style={{
                        color: colors.text,
                        fontWeight: "800",
                    }}
                    numberOfLines={1}
                >
                    {isVideo ? "Video" : "Imagen"}
                </Text>

                <Text
                    style={{
                        color: colors.mutedText,
                        fontSize: 12,
                    }}
                    numberOfLines={1}
                >
                    {subtitle}
                </Text>

                {onDelete ? (
                    <Pressable
                        onPress={onDelete}
                        disabled={deleting}
                        style={({ pressed }) => ({
                            marginTop: 4,
                            borderWidth: 1,
                            borderColor: colors.danger ?? colors.border,
                            borderRadius: 10,
                            paddingVertical: 8,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: colors.surface,
                            opacity: deleting ? 0.6 : pressed ? 0.8 : 1,
                        })}
                    >
                        <Text
                            style={{
                                color: colors.danger ?? colors.text,
                                fontWeight: "800",
                            }}
                        >
                            {deleting ? "Eliminando..." : "Eliminar"}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        </View>
    );
}