// /src/features/movements/components/MovementsFilters.tsx
// Search, active-state filter, and movement catalog ordering controls.

import React from "react";
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

import {
    getMovementSortLabel,
    MOVEMENT_SORT_OPTIONS,
    type MovementSortMode,
} from "./movementSorting";

type Props = {
    search: string;
    activeOnly: boolean;
    sortMode: MovementSortMode;
    onChangeSearch: (next: string) => void;
    onChangeActiveOnly: (next: boolean) => void;
    onChangeSortMode: (next: MovementSortMode) => void;
};

export function MovementsFilters({
    search,
    activeOnly,
    sortMode,
    onChangeSearch,
    onChangeActiveOnly,
    onChangeSortMode,
}: Props) {
    const { colors } = useTheme();
    const [sortOpen, setSortOpen] = React.useState(false);

    function selectSortMode(next: MovementSortMode) {
        onChangeSortMode(next);
        setSortOpen(false);
    }

    return (
        <>
            <View
                style={[
                    styles.card,
                    {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                    },
                ]}
            >
                <View style={styles.searchGroup}>
                    <Text style={[styles.label, { color: colors.mutedText }]}>Buscar</Text>
                    <TextInput
                        value={search}
                        onChangeText={onChangeSearch}
                        placeholder="Nombre..."
                        placeholderTextColor={colors.mutedText}
                        style={[
                            styles.input,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                color: colors.text,
                            },
                        ]}
                    />
                </View>

                <View style={styles.controlsRow}>
                    <Pressable
                        onPress={() => setSortOpen(true)}
                        style={({ pressed }) => [
                            styles.sortButton,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                opacity: pressed ? 0.92 : 1,
                            },
                        ]}
                    >
                        <View style={styles.sortTextWrap}>
                            <Text style={[styles.sortCaption, { color: colors.mutedText }]}>Ordenar</Text>
                            <Text numberOfLines={1} style={[styles.sortValue, { color: colors.text }]}>
                                {getMovementSortLabel(sortMode)}
                            </Text>
                        </View>
                        <Text style={[styles.chevron, { color: colors.text }]}>▾</Text>
                    </Pressable>

                    <View style={styles.activeControl}>
                        <Switch
                            value={activeOnly}
                            onValueChange={onChangeActiveOnly}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                        <Text style={[styles.activeLabel, { color: colors.text }]}>Solo activos</Text>
                    </View>
                </View>
            </View>

            <Modal
                visible={sortOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setSortOpen(false)}
            >
                <Pressable
                    onPress={() => setSortOpen(false)}
                    style={styles.modalBackdrop}
                >
                    <Pressable
                        onPress={() => undefined}
                        style={[
                            styles.sortModal,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                            },
                        ]}
                    >
                        <View style={styles.modalHeading}>
                            <View style={styles.modalHeadingText}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Ordenar movimientos</Text>
                                <Text style={[styles.modalSubtitle, { color: colors.mutedText }]}>Selecciona el criterio principal.</Text>
                            </View>
                            <Pressable
                                onPress={() => setSortOpen(false)}
                                style={({ pressed }) => [
                                    styles.closeButton,
                                    {
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                        opacity: pressed ? 0.92 : 1,
                                    },
                                ]}
                            >
                                <Text style={[styles.closeButtonText, { color: colors.text }]}>Cerrar</Text>
                            </Pressable>
                        </View>

                        <View style={styles.optionsList}>
                            {MOVEMENT_SORT_OPTIONS.map((option) => {
                                const selected = option.value === sortMode;

                                return (
                                    <Pressable
                                        key={option.value}
                                        onPress={() => selectSortMode(option.value)}
                                        style={({ pressed }) => [
                                            styles.optionRow,
                                            {
                                                borderColor: selected ? colors.primary : colors.border,
                                                backgroundColor: colors.background,
                                                opacity: pressed ? 0.92 : 1,
                                            },
                                        ]}
                                    >
                                        <View style={styles.optionTextWrap}>
                                            <Text style={[styles.optionTitle, { color: colors.text }]}>
                                                {option.label}
                                            </Text>
                                            <Text style={[styles.optionDescription, { color: colors.mutedText }]}>
                                                {option.description}
                                            </Text>
                                        </View>
                                        <Text
                                            style={[
                                                styles.optionMark,
                                                { color: selected ? colors.primary : colors.mutedText },
                                            ]}
                                        >
                                            {selected ? "✓" : "○"}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        gap: 12,
    },
    searchGroup: {
        gap: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: "800",
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontWeight: "700",
    },
    controlsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    sortButton: {
        flex: 1,
        minWidth: 0,
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    sortTextWrap: {
        flex: 1,
        minWidth: 0,
        gap: 1,
    },
    sortCaption: {
        fontSize: 11,
        fontWeight: "800",
    },
    sortValue: {
        fontSize: 13,
        fontWeight: "900",
    },
    chevron: {
        fontSize: 15,
        fontWeight: "900",
    },
    activeControl: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
    },
    activeLabel: {
        fontWeight: "800",
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        padding: 18,
        justifyContent: "center",
    },
    sortModal: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        gap: 14,
    },
    modalHeading: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    modalHeadingText: {
        flex: 1,
        gap: 3,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "900",
    },
    modalSubtitle: {
        fontSize: 13,
    },
    closeButton: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 11,
        paddingVertical: 8,
    },
    closeButtonText: {
        fontSize: 12,
        fontWeight: "900",
    },
    optionsList: {
        gap: 9,
    },
    optionRow: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    optionTextWrap: {
        flex: 1,
        gap: 3,
    },
    optionTitle: {
        fontSize: 15,
        fontWeight: "900",
    },
    optionDescription: {
        fontSize: 12,
        lineHeight: 17,
    },
    optionMark: {
        fontSize: 18,
        fontWeight: "900",
    },
});
