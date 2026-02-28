// src/features/routines/components/ExerciseAttachmentPickerRN.tsx
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import type { RNFile } from "../../../types/upload.types";
import type { AttachmentOption } from "../../../utils/routines/attachments";
import { RoutineMediaViewerModal, type RoutineMediaItem } from "./RoutineMediaViewerModal";

type Props = {
    title: string;
    hint?: string;
    emptyText: string;
    uploadAndAttachLabel: string;

    attachmentOptions: AttachmentOption[];
    selectedIds: string[];

    pendingFiles: RNFile[];

    disabled?: boolean;
    busy?: boolean;

    onRemoveLinked: (publicId: string) => void;
    onPickFiles: (files: RNFile[]) => void;
    onRemovePending: (index?: number) => void;
};

function Button(props: { title: string; onPress: () => void; disabled?: boolean; tone?: "primary" | "neutral" }) {
    const accent = "#2563EB";
    const bg = props.tone === "primary" ? accent : "transparent";
    const color = props.tone === "primary" ? "#FFFFFF" : "#111827";
    const borderColor = props.tone === "primary" ? accent : "#111827";

    return (
        <Pressable
            onPress={props.onPress}
            disabled={props.disabled}
            style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor,
                backgroundColor: bg,
                opacity: props.disabled ? 0.5 : 1,
            }}
        >
            <Text style={{ fontWeight: "900", color }}>{props.title}</Text>
        </Pressable>
    );
}

function fileNameFromUri(uri: string): string {
    const parts = uri.split("/");
    return parts[parts.length - 1] ?? "file";
}

function isVideoMime(mime: string | null | undefined): boolean {
    return typeof mime === "string" && mime.startsWith("video/");
}

function guessMimeFromUri(uri: string): string {
    const u = uri.toLowerCase();
    if (u.endsWith(".mp4") || u.endsWith(".mov") || u.endsWith(".m4v") || u.endsWith(".webm")) return "video/mp4";
    if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
    if (u.endsWith(".png")) return "image/png";
    if (u.endsWith(".webp")) return "image/webp";
    if (u.endsWith(".heic")) return "image/heic";
    if (u.endsWith(".heif")) return "image/heif";
    return "application/octet-stream";
}

function assetToRNFile(a: ImagePicker.ImagePickerAsset): RNFile {
    const name = a.fileName ?? fileNameFromUri(a.uri);
    const type = a.mimeType ?? guessMimeFromUri(a.uri);

    return {
        uri: a.uri,
        name,
        type,
    };
}

function inferResourceType(opt: AttachmentOption): "image" | "video" | "other" {
    if (opt.resourceType === "image" || opt.resourceType === "video") return opt.resourceType;

    const u = (opt.url ?? "").toLowerCase();
    if (u.match(/\.(png|jpg|jpeg|webp|gif|heic|heif)(\?.*)?$/)) return "image";
    if (u.match(/\.(mp4|mov|m4v|webm)(\?.*)?$/)) return "video";

    return "other";
}

export function ExerciseAttachmentPickerRN({
    title,
    hint,
    emptyText,
    uploadAndAttachLabel,
    attachmentOptions,
    selectedIds,
    pendingFiles,
    disabled,
    busy,
    onRemoveLinked,
    onPickFiles,
    onRemovePending,
}: Props) {
    const linked = React.useMemo(() => {
        const map = new Map<string, AttachmentOption>();
        for (const o of attachmentOptions) map.set(o.publicId, o);

        return (selectedIds ?? [])
            .filter(Boolean)
            .map((id) => {
                const opt = map.get(id);
                return {
                    publicId: id,
                    label: opt?.label ?? id,
                    url: opt?.url ?? "",
                    resourceType: opt?.resourceType,
                    originalName: opt?.originalName ?? null,
                };
            });
    }, [attachmentOptions, selectedIds]);

    const [viewer, setViewer] = React.useState<RoutineMediaItem | null>(null);

    const openPicker = async () => {
        if (disabled || busy) return;

        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;

        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            quality: 1,
            selectionLimit: 0,
        });

        if (res.canceled) return;

        const files = (res.assets ?? []).map(assetToRNFile);
        if (files.length) onPickFiles(files);
    };

    const openLinkedInModal = (opt: { url: string; label: string; resourceType?: string }) => {
        const url = opt.url ?? "";
        if (!url) return;

        const rt = inferResourceType({
            publicId: "x",
            label: opt.label,
            url,
            resourceType: opt.resourceType as any,
        });

        if (rt === "other") return;

        setViewer({
            url,
            label: opt.label,
            resourceType: rt,
        });
    };

    return (
        <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800" }}>{title}</Text>
                    {hint ? <Text style={{ color: "#6B7280", fontSize: 12 }}>{hint}</Text> : null}
                </View>

                <Button
                    title={busy ? "…" : uploadAndAttachLabel}
                    onPress={openPicker}
                    disabled={disabled || busy}
                    tone="primary"
                />
            </View>

            {/* Pending */}
            {pendingFiles.length > 0 ? (
                <View style={{ borderWidth: 1, borderRadius: 14, padding: 10, gap: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontWeight: "900" }}>Pendiente</Text>
                        <Button title="Quitar todo" onPress={() => onRemovePending()} disabled={disabled} />
                    </View>

                    <View style={{ gap: 10 }}>
                        {pendingFiles.map((f, i) => {
                            const name = (f as any).name ?? fileNameFromUri((f as any).uri ?? "");
                            const type = (f as any).type ?? "";
                            const isVideo = isVideoMime(type);

                            return (
                                <View key={`${name}_${i}`} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                                    {isVideo ? (
                                        <View
                                            style={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <Text style={{ fontWeight: "900", fontSize: 12 }}>Video</Text>
                                        </View>
                                    ) : (
                                        <Image
                                            source={{ uri: (f as any).uri }}
                                            style={{ width: 64, height: 64, borderRadius: 12, borderWidth: 1 }}
                                            resizeMode="cover"
                                        />
                                    )}

                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: "#6B7280", fontSize: 12 }} numberOfLines={2}>
                                            {name}
                                        </Text>
                                        <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }}>
                                            Se subirá cuando presiones <Text style={{ fontWeight: "900" }}>Guardar</Text>.
                                        </Text>
                                    </View>

                                    <Button title="✕" onPress={() => onRemovePending(i)} disabled={disabled} />
                                </View>
                            );
                        })}
                    </View>
                </View>
            ) : null}

            {/* Linked */}
            <View style={{ gap: 6 }}>
                <Text style={{ fontWeight: "900" }}>Enlazados</Text>

                {linked.length === 0 ? (
                    <Text style={{ color: "#6B7280" }}>{emptyText}</Text>
                ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                        {linked.map((opt) => {
                            const url = opt.url ?? "";
                            const kind = inferResourceType({
                                publicId: opt.publicId,
                                label: opt.label,
                                url,
                                resourceType: opt.resourceType,
                            });

                            return (
                                <View key={opt.publicId} style={{ width: 110, gap: 6 }}>
                                    <Pressable
                                        onPress={() =>
                                            openLinkedInModal({ url, label: opt.label, resourceType: opt.resourceType })
                                        }
                                        disabled={disabled || kind === "other"}
                                        style={{ borderWidth: 1, borderRadius: 12, overflow: "hidden" }}
                                    >
                                        <View style={{ width: "100%", height: 90, alignItems: "center", justifyContent: "center" }}>
                                            {!url ? (
                                                <Text style={{ color: "#6B7280", fontSize: 12 }}>Sin URL</Text>
                                            ) : kind === "image" ? (
                                                <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                                            ) : kind === "video" ? (
                                                <Text style={{ fontWeight: "900", fontSize: 12 }}>Video</Text>
                                            ) : (
                                                <Text style={{ color: "#6B7280", fontSize: 12 }}>Abrir</Text>
                                            )}
                                        </View>

                                        <View style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
                                            <Text style={{ color: "#6B7280", fontSize: 11 }} numberOfLines={1}>
                                                {opt.label}
                                            </Text>
                                        </View>
                                    </Pressable>

                                    <Button title="Quitar" onPress={() => onRemoveLinked(opt.publicId)} disabled={disabled} />
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>

            <RoutineMediaViewerModal visible={!!viewer} item={viewer} onClose={() => setViewer(null)} />
        </View>
    );
}