// /src/features/movements/components/MovementsList.tsx
// Responsive two-column movement catalog with vertical cards and optional
// muscle/equipment section dividers.

import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { Movement } from "@/src/types/movements.types";

import type { MediaViewerItem } from "../../components/media/MediaViewerModal";
import {
    formatMovementGroupLabel,
    getMovementGroupKey,
    type MovementSortMode,
} from "./movementSorting";

type Props = {
    items: Movement[];
    sortMode: MovementSortMode;
    onEdit: (movement: Movement) => void;
    onDelete: (movement: Movement) => void;
    onOpenMedia: (item: MediaViewerItem) => void;
};

type MovementSection = {
    key: string;
    label: string | null;
    items: Movement[];
};

function safeText(value: unknown): string {
    const text = String(value ?? "").trim();

    return text.length > 0 ? text : "—";
}

function cleanValues(values: string[]): string[] {
    return values
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
}

function buildMediaSubtitle(movement: Movement): string | null {
    const muscleGroup = cleanValues(movement.muscleGroup);
    const equipment = cleanValues(movement.equipment);
    const parts: string[] = [];

    if (muscleGroup.length > 0) {
        parts.push(`Músculo: ${muscleGroup.join(", ")}`);
    }

    if (equipment.length > 0) {
        parts.push(`Equipo: ${equipment.join(", ")}`);
    }

    return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Converts the already-sorted catalog into visual sections.
 *
 * Name sorting uses one unlabelled section. Muscle and equipment sorting
 * create one section for each primary catalog value.
 */
function buildMovementSections(
    items: Movement[],
    sortMode: MovementSortMode,
): MovementSection[] {
    if (sortMode === "name") {
        return [
            {
                key: "name",
                label: null,
                items,
            },
        ];
    }

    const sections: MovementSection[] = [];

    for (const movement of items) {
        const key = getMovementGroupKey(movement, sortMode);
        const currentSection = sections.at(-1);

        if (currentSection?.key === key) {
            currentSection.items.push(movement);
            continue;
        }

        sections.push({
            key,
            label: formatMovementGroupLabel(movement, sortMode),
            items: [movement],
        });
    }

    return sections;
}

function MovementGroupDivider({ label }: { label: string }) {
    const { colors } = useTheme();

    return (
        <View style={styles.groupDivider}>
            <View
                style={[
                    styles.groupLine,
                    {
                        backgroundColor: colors.border,
                    },
                ]}
            />

            <Text
                style={[
                    styles.groupLabel,
                    {
                        color: colors.mutedText,
                    },
                ]}
            >
                {label}
            </Text>

            <View
                style={[
                    styles.groupLine,
                    {
                        backgroundColor: colors.border,
                    },
                ]}
            />
        </View>
    );
}

type MovementCardProps = {
    movement: Movement;
    onEdit: (movement: Movement) => void;
    onDelete: (movement: Movement) => void;
    onOpenMedia: (item: MediaViewerItem) => void;
};

function MovementCard({
    movement,
    onEdit,
    onDelete,
    onOpenMedia,
}: MovementCardProps) {
    const { colors } = useTheme();

    const muscleGroup = cleanValues(movement.muscleGroup);
    const equipment = cleanValues(movement.equipment);
    const mediaUrl = movement.media?.url ?? null;
    const canViewMedia = Boolean(mediaUrl);

    function onPressMedia(): void {
        if (!mediaUrl || !movement.media) {
            return;
        }

        const viewerItem: MediaViewerItem = {
            url: mediaUrl,
            resourceType: movement.media.resourceType,
            title: movement.name,
            subtitle: buildMediaSubtitle(movement),
            tags: null,
            notes: null,
            metaRows: [
                {
                    label: "Grupo muscular",
                    value:
                        muscleGroup.length > 0
                            ? muscleGroup.join(", ")
                            : "—",
                },
                {
                    label: "Equipo",
                    value:
                        equipment.length > 0
                            ? equipment.join(", ")
                            : "—",
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
            style={[
                styles.card,
                {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                },
            ]}
        >
            <Pressable
                onPress={onPressMedia}
                disabled={!canViewMedia}
                style={({ pressed }) => [
                    styles.thumbnailButton,
                    {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        opacity: pressed && canViewMedia ? 0.92 : 1,
                    },
                ]}
            >
                {mediaUrl ? (
                    <Image
                        source={{
                            uri: mediaUrl,
                        }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                    />
                ) : (
                    <Text
                        style={[
                            styles.thumbnailFallback,
                            {
                                color: colors.mutedText,
                            },
                        ]}
                    >
                        IMG
                    </Text>
                )}
            </Pressable>

            <View style={styles.content}>
                <View style={styles.titleRow}>
                    <Text
                        numberOfLines={2}
                        style={[
                            styles.title,
                            {
                                color: colors.text,
                            },
                        ]}
                    >
                        {safeText(movement.name)}
                    </Text>

                    {!movement.isActive ? (
                        <View
                            style={[
                                styles.inactiveBadge,
                                {
                                    borderColor: colors.border,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.inactiveBadgeText,
                                    {
                                        color: colors.mutedText,
                                    },
                                ]}
                            >
                                Inactivo
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.detailBlock}>
                    <Text
                        style={[
                            styles.detailLabel,
                            {
                                color: colors.mutedText,
                            },
                        ]}
                    >
                        Músculo
                    </Text>

                    <Text
                        numberOfLines={2}
                        style={[
                            styles.detailValue,
                            {
                                color: colors.text,
                            },
                        ]}
                    >
                        {muscleGroup.length > 0
                            ? muscleGroup.join(", ")
                            : "—"}
                    </Text>
                </View>

                <View style={styles.detailBlock}>
                    <Text
                        style={[
                            styles.detailLabel,
                            {
                                color: colors.mutedText,
                            },
                        ]}
                    >
                        Equipo
                    </Text>

                    <Text
                        numberOfLines={2}
                        style={[
                            styles.detailValue,
                            {
                                color: colors.text,
                            },
                        ]}
                    >
                        {equipment.length > 0
                            ? equipment.join(", ")
                            : "—"}
                    </Text>
                </View>
            </View>

            <View
                style={[
                    styles.actionsRow,
                    {
                        borderTopColor: colors.border,
                    },
                ]}
            >
                <Pressable
                    onPress={() => onEdit(movement)}
                    style={({ pressed }) => [
                        styles.actionButton,
                        {
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: pressed ? 0.92 : 1,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.actionText,
                            {
                                color: colors.text,
                            },
                        ]}
                    >
                        Editar
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => onDelete(movement)}
                    style={({ pressed }) => [
                        styles.actionButton,
                        {
                            borderColor: colors.primary,
                            backgroundColor: colors.primary,
                            opacity: pressed ? 0.92 : 1,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.actionText,
                            {
                                color: colors.primaryText,
                            },
                        ]}
                    >
                        Eliminar
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

export function MovementsList({
    items,
    sortMode,
    onEdit,
    onDelete,
    onOpenMedia,
}: Props) {
    const { colors } = useTheme();

    if (!items.length) {
        return (
            <View
                style={[
                    styles.emptyCard,
                    {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                    },
                ]}
            >
                <Text
                    style={[
                        styles.emptyTitle,
                        {
                            color: colors.text,
                        },
                    ]}
                >
                    No hay movimientos
                </Text>

                <Text
                    style={[
                        styles.emptyText,
                        {
                            color: colors.mutedText,
                        },
                    ]}
                >
                    Crea tu primer movimiento para usarlo en rutinas.
                </Text>
            </View>
        );
    }

    const sections = buildMovementSections(items, sortMode);

    return (
        <View style={styles.sections}>
            {sections.map((section) => (
                <View
                    key={section.key}
                    style={styles.section}
                >
                    {section.label ? (
                        <MovementGroupDivider label={section.label} />
                    ) : null}

                    <View style={styles.grid}>
                        {section.items.map((movement) => (
                            <MovementCard
                                key={movement.id}
                                movement={movement}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onOpenMedia={onOpenMedia}
                            />
                        ))}
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    sections: {
        gap: 12,
    },
    section: {
        gap: 10,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "flex-start",
        columnGap: 10,
        rowGap: 10,
    },
    emptyCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        gap: 6,
    },
    emptyTitle: {
        fontWeight: "800",
    },
    emptyText: {
        textAlign: "center",
    },
    groupDivider: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 2,
        paddingTop: 2,
    },
    groupLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
    },
    groupLabel: {
        fontSize: 12,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    card: {
        width: "48%",
        minWidth: 0,
        borderWidth: 1,
        borderRadius: 16,
        padding: 10,
        gap: 10,
        overflow: "hidden",
    },
    thumbnailButton: {
        width: "100%",
        aspectRatio: 1.4,
        borderRadius: 12,
        borderWidth: 0,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    thumbnail: {
        width: "100%",
        height: "100%",
    },
    thumbnailFallback: {
        fontWeight: "800",
        fontSize: 13,
    },
    content: {
        minWidth: 0,
        gap: 7,
    },
    titleRow: {
        minWidth: 0,
        gap: 5,
    },
    title: {
        minWidth: 0,
        fontSize: 15,
        lineHeight: 15,
        fontWeight: "800",
    },
    inactiveBadge: {
        alignSelf: "flex-start",
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    inactiveBadgeText: {
        fontSize: 9,
        fontWeight: "800",
    },
    detailBlock: {
        minWidth: 0,
        gap: 1,
    },
    detailLabel: {
        fontSize: 10,
        fontWeight: "800",
    },
    detailValue: {
        minWidth: 0,
        fontSize: 12,
        lineHeight: 13,
        fontWeight: "700",
    },
    actionsRow: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 8,
        flexDirection: "row",
        gap: 6,
    },
    actionButton: {
        flex: 1,
        minWidth: 0,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 7,
        alignItems: "center",
        justifyContent: "center",
    },
    actionText: {
        fontSize: 12,
        fontWeight: "800",
    },
});