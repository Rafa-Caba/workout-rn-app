// /src/features/movements/components/MovementsList.tsx
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { Movement } from "@/src/types/movements.types";

import type { MediaViewerItem } from "../../components/media/MediaViewerModal";

type Props = {
    items: Movement[];
    onEdit: (movement: Movement) => void;
    onDelete: (movement: Movement) => void;
    onOpenMedia: (item: MediaViewerItem) => void;
};

function safeText(value: unknown): string {
    const text = String(value ?? "").trim();
    return text.length ? text : "—";
}

function buildSubtitle(movement: Movement): string | null {
    const muscleGroup = movement.muscleGroup.filter((value) => value.trim().length > 0);
    const equipment = movement.equipment.filter((value) => value.trim().length > 0);

    return muscleGroup.length && equipment.length
        ? `Músculo: ${muscleGroup.join(', ')} • \nEquipo: ${equipment.join(', ')}`
        : null;
}

export function MovementsList({ items, onEdit, onDelete, onOpenMedia }: Props) {
    const { colors } = useTheme();

    if (!items.length) {
        return (
            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 16,
                    alignItems: "center",
                    gap: 6,
                }}
            >
                <Text style={{ fontWeight: "800", color: colors.text }}>No hay movimientos</Text>
                <Text style={{ color: colors.mutedText, textAlign: "center" }}>
                    Crea tu primer movimiento para usarlo en rutinas.
                </Text>
            </View>
        );
    }

    return (
        <View style={{ gap: 10 }}>
            {items.map((movement) => {
                const subtitle = buildSubtitle(movement) ?? "Sin detalles";
                const canViewMedia = Boolean(movement.media?.url);

                function onPressMedia() {
                    if (!movement.media?.url) {
                        return;
                    }

                    const viewerItem: MediaViewerItem = {
                        url: movement.media.url,
                        resourceType: movement.media.resourceType,
                        title: movement.name,
                        subtitle: buildSubtitle(movement),
                        tags: null,
                        notes: null,
                        metaRows: [
                            {
                                label: "Grupo muscular",
                                value: safeText(movement.muscleGroup.join(", ")),
                            },
                            {
                                label: "Equipo",
                                value: safeText(movement.equipment.join(", ")),
                            },
                            {
                                label: "Estado",
                                value: movement.isActive ? "Activo" : "Inactivo",
                            },
                        ],
                    };

                    onOpenMedia(viewerItem);
                }

                return (
                    <View
                        key={movement.id}
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                            borderRadius: 16,
                            padding: 12,
                            gap: 10,
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <Pressable
                                onPress={onPressMedia}
                                disabled={!canViewMedia}
                                style={({ pressed }) => ({
                                    width: 100,
                                    height: 80,
                                    borderRadius: 14,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    overflow: "hidden",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: pressed && canViewMedia ? 0.92 : 1,
                                })}
                            >
                                {movement.media?.url ? (
                                    <Image source={{ uri: movement.media.url }} style={{ width: "100%", height: "100%" }} />
                                ) : (
                                    <Text style={{ fontWeight: "800", color: colors.mutedText, fontSize: 12 }}>
                                        IMG
                                    </Text>
                                )}
                            </Pressable>

                            <View style={{ flex: 1, gap: 2 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <Text style={{ flex: 1, fontSize: 15, fontWeight: "800", color: colors.text }}>
                                        {safeText(movement.name)}
                                    </Text>

                                    {!movement.isActive ? (
                                        <View
                                            style={{
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                borderRadius: 999,
                                                paddingHorizontal: 10,
                                                paddingVertical: 4,
                                            }}
                                        >
                                            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.mutedText }}>
                                                Inactivo
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>

                                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>{subtitle}</Text>

                                {canViewMedia ? (
                                    <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700" }}>
                                        Toca la imagen para ver
                                    </Text>
                                ) : null}
                            </View>
                        </View>

                        <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
                            <Pressable
                                onPress={() => onEdit(movement)}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    opacity: pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ color: colors.text, fontWeight: "800" }}>Editar</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => onDelete(movement)}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    backgroundColor: colors.primary,
                                    opacity: pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Eliminar</Text>
                            </Pressable>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}