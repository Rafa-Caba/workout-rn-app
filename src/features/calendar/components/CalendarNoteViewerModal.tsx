// src/features/calendar/components/CalendarNoteViewerModal.tsx

/**
 * Viewer for a calendar note with edit and atomic delete actions.
 */

import React from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutDayNote } from "@/src/types/workoutDay.types";
import { getDayNoteTypeOption } from "@/src/utils/dayNotes";

type Props = {
    visible: boolean;
    date: string | null;
    note: WorkoutDayNote | null;
    deleting: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => Promise<void>;
};

function formatDate(dateIso: string | null): string {
    if (!dateIso) return "—";

    const date = new Date(`${dateIso}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateIso;

    return new Intl.DateTimeFormat("es-MX", { dateStyle: "full" }).format(date);
}

export function CalendarNoteViewerModal({
    visible,
    date,
    note,
    deleting,
    onClose,
    onEdit,
    onDelete,
}: Props) {
    const { colors } = useTheme();
    const option = note ? getDayNoteTypeOption(note.type) : null;

    function confirmDelete(): void {
        if (!note) return;

        Alert.alert(
            "Eliminar nota",
            "Esta acción elimina únicamente la nota seleccionada. El sueño y el entrenamiento del día no se modificarán.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar nota",
                    style: "destructive",
                    onPress: () => {
                        void onDelete();
                    },
                },
            ]
        );
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={deleting ? undefined : onClose}
        >
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <View
                    style={[
                        styles.header,
                        {
                            backgroundColor: colors.surface,
                            borderBottomColor: colors.border,
                        },
                    ]}
                >
                    <View style={styles.headerText}>
                        <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>{option?.emoji} {note?.title ?? "Nota"}</Text>
                        <Text style={[styles.subtitle, { color: colors.mutedText }]}>{formatDate(date)}</Text>
                    </View>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Cerrar nota"
                        disabled={deleting}
                        onPress={onClose}
                        style={({ pressed }) => [
                            styles.closeButton,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                opacity: pressed || deleting ? 0.62 : 1,
                            },
                        ]}
                    >
                        <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        {option ? (
                            <View
                                style={[
                                    styles.chip,
                                    {
                                        backgroundColor: colors.card,
                                        borderColor: colors.border,
                                    },
                                ]}
                            >
                                <Text style={[styles.chipText, { color: colors.text }]}>{option.emoji} {option.label}</Text>
                            </View>
                        ) : null}

                        <Text
                            style={[
                                styles.description,
                                {
                                    color: note?.description
                                        ? colors.text
                                        : colors.mutedText,
                                },
                            ]}
                        >
                            {note?.description ?? "Sin descripción."}
                        </Text>
                    </View>
                </ScrollView>

                <View
                    style={[
                        styles.footer,
                        {
                            backgroundColor: colors.surface,
                            borderTopColor: colors.border,
                        },
                    ]}
                >
                    <Pressable
                        accessibilityRole="button"
                        disabled={!note || deleting}
                        onPress={onEdit}
                        style={({ pressed }) => [
                            styles.actionButton,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                opacity: pressed || deleting ? 0.66 : 1,
                            },
                        ]}
                    >
                        <Text style={[styles.actionText, { color: colors.text }]}>Editar</Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        disabled={!note || deleting}
                        onPress={confirmDelete}
                        style={({ pressed }) => [
                            styles.actionButton,
                            {
                                borderColor: colors.danger,
                                backgroundColor: colors.background,
                                opacity: pressed || deleting ? 0.66 : 1,
                            },
                        ]}
                    >
                        {deleting ? (
                            <ActivityIndicator color={colors.danger} />
                        ) : (
                            <Text style={[styles.actionText, { color: colors.danger }]}>Eliminar</Text>
                        )}
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        disabled={deleting}
                        onPress={onClose}
                        style={({ pressed }) => [
                            styles.actionButton,
                            styles.primaryAction,
                            {
                                borderColor: colors.primary,
                                backgroundColor: colors.primary,
                                opacity: pressed || deleting ? 0.7 : 1,
                            },
                        ]}
                    >
                        <Text style={[styles.actionText, { color: colors.primaryText }]}>Cerrar</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        borderBottomWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    headerText: { flex: 1, gap: 4 },
    title: { fontSize: 21, lineHeight: 27, fontWeight: "900" },
    subtitle: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
    closeButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    closeText: { fontSize: 16, fontWeight: "900" },
    content: { padding: 16, paddingBottom: 28 },
    card: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 16,
        gap: 16,
    },
    chip: {
        alignSelf: "flex-start",
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 11,
        paddingVertical: 7,
    },
    chipText: { fontSize: 12, fontWeight: "800" },
    description: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
    footer: {
        borderTopWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 9,
    },
    actionButton: {
        minHeight: 44,
        minWidth: 96,
        borderWidth: 1,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    primaryAction: { flexGrow: 1 },
    actionText: { fontSize: 14, fontWeight: "900" },
});
