// /src/features/components/media/MediaViewerModal.tsx
// Full-screen media preview. Images remain inside the app; videos can open in
// the external player because React Native does not include a native saver here.

import React from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export type MediaViewerResourceType = "image" | "video";

export type MediaViewerMetaRow = {
    label: string;
    value: string;
};

export type MediaViewerItem = {
    url: string;
    resourceType: MediaViewerResourceType;
    title?: string | null;
    subtitle?: string | null;
    tags?: string[] | null;
    notes?: string | null;
    metaRows?: MediaViewerMetaRow[] | null;
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
            style={[
                styles.chip,
                {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                },
            ]}
        >
            <Text style={[styles.chipText, { color: colors.text }]}>{text}</Text>
        </View>
    );
}

function MetaRow({ label, value }: MediaViewerMetaRow) {
    const { colors } = useTheme();

    return (
        <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.mutedText }]}>{label}</Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>{value}</Text>
        </View>
    );
}

export function MediaViewerModal({ visible, item, onClose }: Props) {
    const { colors } = useTheme();
    const [imageLoading, setImageLoading] = React.useState(false);

    React.useEffect(() => {
        setImageLoading(false);
    }, [item?.url]);

    if (!item) {
        return null;
    }

    const mediaUrl = item.url;

    const isImage = item.resourceType === "image";
    const title = (item.title ?? "Media").trim();
    const subtitle = (item.subtitle ?? "").trim() || null;
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const notes =
        typeof item.notes === "string" && item.notes.trim().length > 0
            ? item.notes.trim()
            : null;
    const metaRows = Array.isArray(item.metaRows) ? item.metaRows : [];

    async function openVideoExternally(): Promise<void> {
        if (isImage) {
            return;
        }

        try {
            const supported = await Linking.canOpenURL(mediaUrl);

            if (!supported) {
                return;
            }

            await Linking.openURL(mediaUrl);
        } catch {
            // El preview permanece disponible si falla el reproductor externo.
        }
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View
                style={[
                    styles.container,
                    { backgroundColor: colors.background },
                ]}
            >
                <View
                    style={[
                        styles.header,
                        {
                            borderBottomColor: colors.border,
                            backgroundColor: colors.surface,
                        },
                    ]}
                >
                    <View style={styles.headerTextWrap}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>
                            {title}
                        </Text>
                        {subtitle ? (
                            <Text
                                style={[styles.headerSubtitle, { color: colors.mutedText }]}
                                numberOfLines={2}
                            >
                                {subtitle}
                            </Text>
                        ) : null}
                    </View>

                    <Pressable
                        onPress={onClose}
                        style={({ pressed }) => [
                            styles.closeButton,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                                opacity: pressed ? 0.92 : 1,
                            },
                        ]}
                    >
                        <Text style={[styles.closeButtonText, { color: colors.text }]}>Cerrar</Text>
                    </Pressable>
                </View>

                <View style={styles.content}>
                    {isImage ? (
                        <View style={styles.imageStage}>
                            {imageLoading ? (
                                <View style={styles.loaderWrap}>
                                    <ActivityIndicator />
                                </View>
                            ) : null}

                            <Image
                                source={{ uri: mediaUrl }}
                                style={styles.fullImage}
                                resizeMode="contain"
                                onLoadStart={() => setImageLoading(true)}
                                onLoadEnd={() => setImageLoading(false)}
                            />
                        </View>
                    ) : (
                        <View style={styles.videoStage}>
                            <Text style={[styles.videoTitle, { color: colors.text }]}>Video</Text>
                            <Text style={[styles.videoText, { color: colors.mutedText }]}>
                                Se abrirá en el reproductor externo del dispositivo.
                            </Text>

                            <Pressable
                                onPress={() => {
                                    void openVideoExternally();
                                }}
                                style={({ pressed }) => [
                                    styles.videoButton,
                                    {
                                        backgroundColor: colors.primary,
                                        opacity: pressed ? 0.92 : 1,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.videoButtonText,
                                        { color: colors.primaryText },
                                    ]}
                                >
                                    Abrir video
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </View>

                {notes || tags.length > 0 || metaRows.length > 0 ? (
                    <View
                        style={[
                            styles.details,
                            {
                                borderTopColor: colors.border,
                                backgroundColor: colors.surface,
                            },
                        ]}
                    >
                        {notes ? (
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailTitle, { color: colors.text }]}>Notas</Text>
                                <Text style={{ color: colors.text }}>{notes}</Text>
                            </View>
                        ) : null}

                        {tags.length > 0 ? (
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailTitle, { color: colors.text }]}>Tags</Text>
                                <View style={styles.tagsWrap}>
                                    {tags.map((tag) => (
                                        <Chip key={tag} text={tag} />
                                    ))}
                                </View>
                            </View>
                        ) : null}

                        {metaRows.length > 0 ? (
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailTitle, { color: colors.text }]}>Detalles</Text>
                                <View style={styles.metaRows}>
                                    {metaRows.map((row) => (
                                        <MetaRow
                                            key={`${row.label}:${row.value}`}
                                            label={row.label}
                                            value={row.value}
                                        />
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingBottom: 5,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    headerTextWrap: {
        flex: 1,
        gap: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "800",
    },
    headerSubtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
    closeButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderRadius: 10,
    },
    closeButtonText: {
        fontWeight: "800",
    },
    content: {
        flex: 1,
    },
    imageStage: {
        flex: 1,
        backgroundColor: "#0B1220",
    },
    loaderWrap: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
    },
    fullImage: {
        width: "100%",
        height: "100%",
    },
    videoStage: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        gap: 8,
    },
    videoTitle: {
        fontSize: 16,
        fontWeight: "800",
    },
    videoText: {
        textAlign: "center",
    },
    videoButton: {
        marginTop: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
    },
    videoButtonText: {
        fontWeight: "800",
    },
    details: {
        padding: 16,
        paddingBottom: 20,
        borderTopWidth: 1,
        gap: 10,
    },
    detailSection: {
        gap: 6,
    },
    detailTitle: {
        fontWeight: "800",
    },
    tagsWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 12,
        fontWeight: "800",
    },
    metaRows: {
        gap: 6,
    },
    metaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    metaLabel: {
        flex: 1,
    },
    metaValue: {
        flex: 1,
        textAlign: "right",
        fontWeight: "800",
    },
});
