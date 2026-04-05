// src/features/components/media/MediaViewerModal.tsx

import React from "react";
import { ActivityIndicator, Image, Linking, Modal, Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export type MediaViewerResourceType = "image" | "video";

export type MediaViewerItem = {
    url: string;
    resourceType: MediaViewerResourceType;

    title?: string | null;
    subtitle?: string | null;

    // Optional: show chips/tags
    tags?: string[] | null;

    // Optional: show notes/description
    notes?: string | null;

    // Optional: small meta rows
    metaRows?: { label: string; value: string }[] | null;
};

type Props = {
    visible: boolean;
    item: MediaViewerItem | null;
    onClose: () => void;
};

function Chip({ text }: { text: string }) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
            }}
        >
            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>{text}</Text>
        </View>
    );
}

function MetaRow(props: { label: string; value: string }) {
    const { colors } = useTheme();

    return (
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ color: colors.mutedText }}>{props.label}</Text>
            <Text style={{ color: colors.text, fontWeight: "800" }}>{props.value}</Text>
        </View>
    );
}

export function MediaViewerModal({ visible, item, onClose }: Props) {
    const { colors } = useTheme();
    const [imgLoading, setImgLoading] = React.useState(false);

    React.useEffect(() => {
        setImgLoading(false);
    }, [item?.url]);

    if (!item) return null;

    const isImage = item.resourceType === "image";

    const title = (item.title ?? "Media").trim();
    const subtitle = (item.subtitle ?? "").trim() || null;

    const tags = Array.isArray(item.tags) ? item.tags : [];
    const notes = typeof item.notes === "string" && item.notes.trim() ? item.notes.trim() : null;
    const metaRows: {
        label: string;
        value: string;
    }[] = [];
    // const metaRows = Array.isArray(item.metaRows) ? item.metaRows : [];
    // console.log({ metaRows });

    const onOpenUrl = async () => {
        try {
            await Linking.openURL(item.url);
        } catch {
            // ignore (toast later if needed)
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: colors.background, paddingBottom: 5 }}>
                {/* Header */}
                <View
                    style={{
                        paddingHorizontal: 16,
                        paddingTop: 14,
                        paddingBottom: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        backgroundColor: colors.surface,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>{title}</Text>
                        {subtitle ? (
                            <Text style={{ color: colors.mutedText }} numberOfLines={1}>
                                {subtitle}
                            </Text>
                        ) : null}
                    </View>

                    <Pressable
                        onPress={onClose}
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 10,
                            backgroundColor: colors.surface,
                        }}
                    >
                        <Text style={{ fontWeight: "900", color: colors.text }}>Cerrar</Text>
                    </Pressable>
                </View>

                {/* Content (BIG) */}
                <View style={{ flex: 1 }}>
                    {isImage ? (
                        <View style={{ flex: 1, backgroundColor: "#0B1220" }}>
                            {imgLoading ? (
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

                            <Pressable onPress={onOpenUrl} style={{ flex: 1 }}>
                                <Image
                                    source={{ uri: item.url }}
                                    style={{ width: "100%", height: "100%" }}
                                    resizeMode="contain"
                                    onLoadStart={() => setImgLoading(true)}
                                    onLoadEnd={() => setImgLoading(false)}
                                />
                            </Pressable>
                        </View>
                    ) : (
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16, gap: 8 }}>
                            <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>Video</Text>
                            <Text style={{ color: colors.mutedText, textAlign: "center" }}>
                                Por ahora abrimos el video en el reproductor externo.
                            </Text>

                            <Pressable
                                onPress={onOpenUrl}
                                style={{
                                    marginTop: 8,
                                    paddingHorizontal: 14,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: colors.primary,
                                }}
                            >
                                <Text style={{ color: colors.primaryText, fontWeight: "900" }}>Abrir video</Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                {/* Details (compact) */}
                {notes || tags.length > 0 || metaRows.length > 0 ? (
                    <View
                        style={{
                            padding: 16,
                            paddingBottom: 20,
                            borderTopWidth: 1,
                            borderTopColor: colors.border,
                            backgroundColor: colors.surface,
                            gap: 10,
                        }}
                    >
                        {notes ? (
                            <View style={{ gap: 6 }}>
                                <Text style={{ fontWeight: "900", color: colors.text }}>Notas</Text>
                                <Text style={{ color: colors.text }}>{notes}</Text>
                            </View>
                        ) : null}

                        {tags.length > 0 ? (
                            <View style={{ gap: 6 }}>
                                <Text style={{ fontWeight: "900", color: colors.text }}>Tags</Text>
                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                    {tags.map((t) => (
                                        <Chip key={t} text={t} />
                                    ))}
                                </View>
                            </View>
                        ) : null}

                        {metaRows.length > 0 ? (
                            <View style={{ gap: 6 }}>
                                <Text style={{ fontWeight: "900", color: colors.text }}>Detalles</Text>
                                <View style={{ gap: 6 }}>
                                    {metaRows.map((r) => (
                                        <MetaRow key={`${r.label}:${r.value}`} label={r.label} value={r.value} />
                                    ))}
                                </View>
                            </View>
                        ) : null}
                    </View>
                ) : null}
            </View>
        </Modal>
    );
}