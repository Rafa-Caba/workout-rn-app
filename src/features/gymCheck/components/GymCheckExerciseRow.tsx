import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import { MediaViewerModal, type MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import { useTheme } from "@/src/theme/ThemeProvider";

export type MediaThumb = {
    publicId: string;
    url: string;
    resourceType: "image" | "video";
};

export type ExercisePlanInfo = {
    sets?: number | string | null;
    reps?: string | null;
    rpe?: number | string | null;
    load?: string | number | null;
    notes?: string | null;
};

type Props = {
    title: string;
    plan?: ExercisePlanInfo | null;

    done: boolean;
    busy?: boolean;

    media: MediaThumb[];

    onToggleDone: () => void;
    onUploadPress: () => void;
    onRemoveMediaAt: (index: number) => void;
};

function Row(props: { label: string; value: string }) {
    const { colors } = useTheme();

    return (
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <Text style={{ color: colors.mutedText, fontWeight: "800" }}>{props.label}</Text>
            <Text style={{ fontWeight: "900", color: colors.text }}>{props.value}</Text>
        </View>
    );
}

function normalizeValue(v: unknown): string {
    const s = String(v ?? "").trim();
    return s.length ? s : "—";
}

export function GymCheckExerciseRow({
    title,
    plan,
    done,
    busy = false,
    media,
    onToggleDone,
    onUploadPress,
    onRemoveMediaAt,
}: Props) {
    const { colors } = useTheme();

    const [viewer, setViewer] = React.useState<MediaViewerItem | null>(null);

    return (
        <>
            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 14,
                    padding: 12,
                    gap: 12,
                    backgroundColor: colors.surface,
                }}
            >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontWeight: "900", fontSize: 16, color: colors.text }}>{title}</Text>
                        {String(plan?.notes ?? "").trim() ? (
                            <Text style={{ color: colors.mutedText }}>{String(plan?.notes ?? "")}</Text>
                        ) : null}
                    </View>

                    <Pressable
                        onPress={busy ? undefined : onToggleDone}
                        style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 999,
                            backgroundColor: done ? `${colors.primary}22` : colors.background,
                            borderWidth: 1,
                            borderColor: done ? `${colors.primary}55` : colors.border,
                            opacity: busy ? 0.6 : 1,
                        }}
                    >
                        <Text style={{ fontWeight: "900", color: done ? colors.primary : colors.text }}>
                            {done ? "Hecho" : "Pendiente"}
                        </Text>
                    </Pressable>
                </View>

                {/* Exercise plan details */}
                <View
                    style={{
                        gap: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        padding: 12,
                        backgroundColor: colors.background,
                    }}
                >
                    <Row label="Series" value={normalizeValue(plan?.sets)} />
                    <Row label="Reps" value={normalizeValue(plan?.reps)} />
                    <Row label="RPE" value={normalizeValue(plan?.rpe)} />
                    <Row label="Carga" value={normalizeValue(plan?.load)} />
                </View>

                {/* Media */}
                <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontWeight: "900", color: colors.text }}>Media</Text>

                        <Pressable
                            onPress={busy ? undefined : onUploadPress}
                            style={{
                                borderRadius: 12,
                                backgroundColor: colors.primary,
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                opacity: busy ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: colors.primaryText, fontWeight: "900" }}>Subir</Text>
                        </Pressable>
                    </View>

                    {media.length === 0 ? (
                        <Text style={{ color: colors.mutedText, fontStyle: "italic" }}>
                            Sin media aún. Puedes subir foto/video si quieres.
                        </Text>
                    ) : (
                        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                            {media.map((m, idx) => {
                                const isVideo = m.resourceType === "video";
                                const url = String(m.url ?? "").trim();

                                return (
                                    <View key={`${m.publicId}:${m.url}`} style={{ position: "relative" }}>
                                        <Pressable
                                            onPress={() => {
                                                if (!url) return;

                                                setViewer({
                                                    url,
                                                    resourceType: isVideo ? "video" : "image",
                                                    title: "Media",
                                                    subtitle: title,
                                                    metaRows: [
                                                        { label: "Tipo", value: isVideo ? "Video" : "Imagen" },
                                                    ],
                                                });
                                            }}
                                            style={{
                                                height: 72,
                                                width: 72,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                overflow: "hidden",
                                                backgroundColor: colors.background,
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            {!isVideo ? (
                                                <Image
                                                    key={`${m.publicId}:${m.url}`}
                                                    source={{ uri: url }}
                                                    style={{ height: "100%", width: "100%" }}
                                                    resizeMode="cover"
                                                    fadeDuration={0}
                                                />
                                            ) : (
                                                <Text style={{ fontWeight: "900", color: colors.mutedText }}>VIDEO</Text>
                                            )}
                                        </Pressable>

                                        <Pressable
                                            onPress={busy ? undefined : () => onRemoveMediaAt(idx)}
                                            style={{
                                                position: "absolute",
                                                top: -8,
                                                right: -8,
                                                height: 26,
                                                width: 26,
                                                borderRadius: 999,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                backgroundColor: colors.surface,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                opacity: busy ? 0.6 : 1,
                                            }}
                                        >
                                            <Text style={{ fontWeight: "900", color: colors.text }}>✕</Text>
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </View>

            <MediaViewerModal visible={!!viewer} item={viewer} onClose={() => setViewer(null)} />
        </>
    );
}