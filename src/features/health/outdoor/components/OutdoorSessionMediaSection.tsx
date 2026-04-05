// /src/features/health/outdoor/components/OutdoorSessionMediaSection.tsx

import React from "react";
import { Text, View } from "react-native";

import {
    MediaViewerModal,
} from "@/src/features/components/media/MediaViewerModal";
import { useOutdoorSessionMedia } from "@/src/hooks/health/outdoor/useOutdoorSessionMedia";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutSession } from "@/src/types/workoutDay.types";

import OutdoorSessionMediaCard from "./OutdoorSessionMediaCard";
import OutdoorSessionMediaPickerButton from "./OutdoorSessionMediaPickerButton";

type Props = {
    date: string;
    session: WorkoutSession;
    onRefresh: () => Promise<WorkoutSession | null>;
};

export default function OutdoorSessionMediaSection({
    date,
    session,
    onRefresh,
}: Props) {
    const { colors } = useTheme();

    const media = Array.isArray(session.media) ? session.media : [];

    const mediaHook = useOutdoorSessionMedia({
        date,
        sessionId: session.id,
        session,
        onRefresh,
    });

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 16,
                backgroundColor: colors.surface,
                gap: 14,
            }}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                }}
            >
                <View style={{ flex: 1 }}>
                    <Text
                        style={{
                            fontSize: 18,
                            fontWeight: "800",
                            color: colors.text,
                        }}
                    >
                        Media de la sesión
                    </Text>

                    <Text
                        style={{
                            color: colors.mutedText,
                            marginTop: 2,
                        }}
                    >
                        Sube imágenes o videos relacionados con esta sesión outdoor.
                    </Text>
                </View>

                <OutdoorSessionMediaPickerButton
                    loading={mediaHook.uploading}
                    onPress={() => {
                        void mediaHook.pickAndUploadMedia();
                    }}
                />
            </View>

            {mediaHook.error ? (
                <Text style={{ color: colors.danger ?? colors.text }}>
                    {mediaHook.error}
                </Text>
            ) : null}

            {media.length === 0 ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderStyle: "dashed",
                        borderColor: colors.border,
                        borderRadius: 14,
                        padding: 16,
                        backgroundColor: colors.background,
                    }}
                >
                    <Text
                        style={{
                            color: colors.text,
                            fontWeight: "800",
                            marginBottom: 4,
                        }}
                    >
                        Aún no hay media en esta sesión
                    </Text>

                    <Text style={{ color: colors.mutedText }}>
                        Puedes agregar fotos o videos del recorrido, del lugar o del resultado de la sesión.
                    </Text>
                </View>
            ) : (
                <View
                    style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        gap: 12,
                    }}
                >
                    {media.map((item) => (
                        <OutdoorSessionMediaCard
                            key={item.publicId}
                            item={item}
                            onPress={() => mediaHook.openViewer(item)}
                            onDelete={() => {
                                void mediaHook.deleteMediaItem(item);
                            }}
                            deleting={mediaHook.deletingPublicId === item.publicId}
                        />
                    ))}
                </View>
            )}

            <MediaViewerModal
                visible={mediaHook.viewerVisible}
                item={mediaHook.viewerItem}
                onClose={mediaHook.closeViewer}
            />
        </View>
    );
}