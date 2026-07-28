// src/features/daySummary/components/DayNotesSection.tsx
// Creates, edits, lists, and deletes typed notes for one WorkoutDay.

import React from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    useCreateDayNote,
    useDeleteDayNote,
    useUpdateDayNote,
} from "@/src/hooks/workout/useDayNotes";
import { useWorkoutDay } from "@/src/hooks/workout/useWorkoutDay";
import { useTheme } from "@/src/theme/ThemeProvider";
import type {
    WorkoutDayNote,
    WorkoutDayNoteType,
} from "@/src/types/workoutDay.types";
import {
    DAY_NOTE_DESCRIPTION_MAX_LENGTH,
    DAY_NOTE_TITLE_MAX_LENGTH,
    DAY_NOTE_TYPE_OPTIONS,
    getDayNoteTypeOption,
    normalizeDayNoteDraft,
} from "@/src/utils/dayNotes";

type Props = {
    date: string;
};

type FormState = {
    type: WorkoutDayNoteType;
    title: string;
    description: string;
};

const EMPTY_FORM: FormState = {
    type: "personal",
    title: "",
    description: "",
};

function readErrorMessage(error: unknown): string {
    return error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "No se pudo completar la operación.";
}

function toFormState(note: WorkoutDayNote | null): FormState {
    if (!note) return EMPTY_FORM;

    return {
        type: note.type,
        title: note.title,
        description: note.description ?? "",
    };
}

function formatUpdatedAt(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("es-MX", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export function DayNotesSection({ date }: Props) {
    const { colors } = useTheme();
    const dayQuery = useWorkoutDay(date);
    const createNote = useCreateDayNote();
    const updateNote = useUpdateDayNote();
    const deleteNote = useDeleteDayNote();

    const [modalVisible, setModalVisible] = React.useState(false);
    const [editingNote, setEditingNote] = React.useState<WorkoutDayNote | null>(
        null
    );
    const [form, setForm] = React.useState<FormState>(EMPTY_FORM);

    const notes = dayQuery.data?.dayNotes ?? [];
    const saving = createNote.isPending || updateNote.isPending;

    const openCreate = (): void => {
        setEditingNote(null);
        setForm(EMPTY_FORM);
        setModalVisible(true);
    };

    const openEdit = (note: WorkoutDayNote): void => {
        setEditingNote(note);
        setForm(toFormState(note));
        setModalVisible(true);
    };

    const closeModal = (): void => {
        if (saving) return;

        setModalVisible(false);
        setEditingNote(null);
        setForm(EMPTY_FORM);
    };

    const saveNote = async (): Promise<void> => {
        const draft = normalizeDayNoteDraft(form);

        if (!draft) {
            Alert.alert(
                "Revisa la nota",
                `El título es obligatorio y admite hasta ${DAY_NOTE_TITLE_MAX_LENGTH} caracteres. La descripción admite hasta ${DAY_NOTE_DESCRIPTION_MAX_LENGTH}.`
            );
            return;
        }

        try {
            if (editingNote) {
                await updateNote.mutateAsync({
                    date,
                    noteId: editingNote.id,
                    draft,
                });
            } else {
                await createNote.mutateAsync({ date, draft });
            }

            closeModal();
        } catch (error: unknown) {
            Alert.alert("No se pudo guardar", readErrorMessage(error));
        }
    };

    const confirmDelete = (note: WorkoutDayNote): void => {
        Alert.alert(
            "Eliminar nota",
            `¿Eliminar “${note.title}”? Esta acción no se puede deshacer.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: () => {
                        void deleteNote
                            .mutateAsync({ date, noteId: note.id })
                            .catch((error: unknown) => {
                                Alert.alert(
                                    "No se pudo eliminar",
                                    readErrorMessage(error)
                                );
                            });
                    },
                },
            ]
        );
    };

    return (
        <>
            <View
                style={[
                    styles.section,
                    {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                    },
                ]}
            >
                <View style={styles.headerRow}>
                    <View style={styles.headerTextGroup}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Notas del día</Text>
                        <Text style={[styles.sectionSubtitle, { color: colors.mutedText }]}>Se sincronizan entre la web y la app.</Text>
                    </View>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Agregar nota del día"
                        onPress={openCreate}
                        style={({ pressed }) => [
                            styles.primaryButton,
                            {
                                backgroundColor: colors.primary,
                                opacity: pressed ? 0.78 : 1,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.primaryButtonText,
                                { color: colors.primaryText },
                            ]}
                        >
                            + Nota
                        </Text>
                    </Pressable>
                </View>

                {dayQuery.isLoading ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator />
                        <Text style={{ color: colors.mutedText }}>Cargando notas...</Text>
                    </View>
                ) : null}

                {dayQuery.isError ? (
                    <Text style={[styles.errorText, { color: colors.danger }]}>No se pudieron cargar las notas.</Text>
                ) : null}

                {!dayQuery.isLoading && !dayQuery.isError && notes.length === 0 ? (
                    <View
                        style={[
                            styles.emptyState,
                            {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin notas del día</Text>
                        <Text style={[styles.emptyDescription, { color: colors.mutedText }]}>Agrega cumpleaños, citas, recordatorios, salud o notas personales.</Text>
                    </View>
                ) : null}

                {notes.map((note) => {
                    const option = getDayNoteTypeOption(note.type);

                    return (
                        <View
                            key={note.id}
                            style={[
                                styles.noteCard,
                                {
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                },
                            ]}
                        >
                            <View style={styles.noteHeader}>
                                <View style={styles.noteTitleGroup}>
                                    <Text style={styles.noteEmoji}>{option.emoji}</Text>
                                    <View style={styles.noteTextGroup}>
                                        <Text
                                            style={[styles.noteTitle, { color: colors.text }]}
                                            numberOfLines={2}
                                        >
                                            {note.title}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.noteType,
                                                { color: colors.mutedText },
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {note.description ? (
                                <Text
                                    style={[
                                        styles.noteDescription,
                                        { color: colors.text },
                                    ]}
                                >
                                    {note.description}
                                </Text>
                            ) : null}

                            <Text
                                style={[
                                    styles.noteTimestamp,
                                    { color: colors.mutedText },
                                ]}
                            >
                                Actualizada: {formatUpdatedAt(note.updatedAt)}
                            </Text>

                            <View style={styles.noteActions}>
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => openEdit(note)}
                                    style={({ pressed }) => [
                                        styles.secondaryButton,
                                        {
                                            borderColor: colors.border,
                                            opacity: pressed ? 0.72 : 1,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.secondaryButtonText,
                                            { color: colors.text },
                                        ]}
                                    >
                                        Editar
                                    </Text>
                                </Pressable>

                                <Pressable
                                    accessibilityRole="button"
                                    disabled={deleteNote.isPending}
                                    onPress={() => confirmDelete(note)}
                                    style={({ pressed }) => [
                                        styles.secondaryButton,
                                        {
                                            borderColor: colors.danger,
                                            opacity:
                                                pressed || deleteNote.isPending
                                                    ? 0.65
                                                    : 1,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.secondaryButtonText,
                                            { color: colors.danger },
                                        ]}
                                    >
                                        Eliminar
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    );
                })}
            </View>

            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={closeModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.modalBackdrop}
                >
                    <View
                        style={[
                            styles.modalCard,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={styles.modalContent}
                        >
                            <View style={styles.modalHeader}>
                                <View style={styles.headerTextGroup}>
                                    <Text
                                        style={[
                                            styles.modalTitle,
                                            { color: colors.text },
                                        ]}
                                    >
                                        {editingNote ? "Editar nota" : "Nueva nota"}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.sectionSubtitle,
                                            { color: colors.mutedText },
                                        ]}
                                    >
                                        {date}
                                    </Text>
                                </View>

                                <Pressable
                                    accessibilityRole="button"
                                    onPress={closeModal}
                                    disabled={saving}
                                    style={({ pressed }) => [
                                        styles.closeButton,
                                        {
                                            borderColor: colors.border,
                                            opacity: pressed || saving ? 0.6 : 1,
                                        },
                                    ]}
                                >
                                    <Text style={{ color: colors.text, fontWeight: "900" }}>✕</Text>
                                </Pressable>
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Tipo</Text>
                                <View style={styles.typeOptions}>
                                    {DAY_NOTE_TYPE_OPTIONS.map((option) => {
                                        const selected = form.type === option.value;

                                        return (
                                            <Pressable
                                                key={option.value}
                                                accessibilityRole="button"
                                                onPress={() =>
                                                    setForm((current) => ({
                                                        ...current,
                                                        type: option.value,
                                                    }))
                                                }
                                                style={({ pressed }) => [
                                                    styles.typeOption,
                                                    {
                                                        borderColor: selected
                                                            ? colors.primary
                                                            : colors.border,
                                                        backgroundColor: selected
                                                            ? colors.card
                                                            : colors.background,
                                                        opacity: pressed ? 0.75 : 1,
                                                    },
                                                ]}
                                            >
                                                <Text style={styles.typeEmoji}>{option.emoji}</Text>
                                                <Text
                                                    style={[
                                                        styles.typeLabel,
                                                        {
                                                            color: selected
                                                                ? colors.primary
                                                                : colors.text,
                                                        },
                                                    ]}
                                                >
                                                    {option.label}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={styles.fieldGroup}>
                                <View style={styles.fieldLabelRow}>
                                    <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Título</Text>
                                    <Text style={[styles.characterCount, { color: colors.mutedText }]}>{form.title.length}/{DAY_NOTE_TITLE_MAX_LENGTH}</Text>
                                </View>
                                <TextInput
                                    value={form.title}
                                    onChangeText={(title) =>
                                        setForm((current) => ({ ...current, title }))
                                    }
                                    maxLength={DAY_NOTE_TITLE_MAX_LENGTH}
                                    placeholder="Ej. Cita con fisioterapia"
                                    placeholderTextColor={colors.mutedText}
                                    style={[
                                        styles.input,
                                        {
                                            color: colors.text,
                                            borderColor: colors.border,
                                            backgroundColor: colors.background,
                                        },
                                    ]}
                                />
                            </View>

                            <View style={styles.fieldGroup}>
                                <View style={styles.fieldLabelRow}>
                                    <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Descripción</Text>
                                    <Text style={[styles.characterCount, { color: colors.mutedText }]}>{form.description.length}/{DAY_NOTE_DESCRIPTION_MAX_LENGTH}</Text>
                                </View>
                                <TextInput
                                    value={form.description}
                                    onChangeText={(description) =>
                                        setForm((current) => ({
                                            ...current,
                                            description,
                                        }))
                                    }
                                    maxLength={DAY_NOTE_DESCRIPTION_MAX_LENGTH}
                                    multiline
                                    placeholder="Detalles opcionales"
                                    placeholderTextColor={colors.mutedText}
                                    textAlignVertical="top"
                                    style={[
                                        styles.input,
                                        styles.descriptionInput,
                                        {
                                            color: colors.text,
                                            borderColor: colors.border,
                                            backgroundColor: colors.background,
                                        },
                                    ]}
                                />
                            </View>

                            <View style={styles.modalActions}>
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={closeModal}
                                    disabled={saving}
                                    style={({ pressed }) => [
                                        styles.modalActionButton,
                                        {
                                            borderColor: colors.border,
                                            opacity: pressed || saving ? 0.65 : 1,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.modalActionText, { color: colors.text }]}>Cancelar</Text>
                                </Pressable>

                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => void saveNote()}
                                    disabled={saving}
                                    style={({ pressed }) => [
                                        styles.modalActionButton,
                                        {
                                            backgroundColor: colors.primary,
                                            borderColor: colors.primary,
                                            opacity: pressed || saving ? 0.7 : 1,
                                        },
                                    ]}
                                >
                                    {saving ? (
                                        <ActivityIndicator color={colors.primaryText} />
                                    ) : (
                                        <Text style={[styles.modalActionText, { color: colors.primaryText }]}>Guardar</Text>
                                    )}
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    section: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 12,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    headerTextGroup: { flex: 1, gap: 3 },
    sectionTitle: { fontSize: 15, fontWeight: "900" },
    sectionSubtitle: { fontSize: 12, fontWeight: "600", lineHeight: 17 },
    primaryButton: {
        borderRadius: 12,
        paddingHorizontal: 13,
        paddingVertical: 9,
    },
    primaryButtonText: { fontSize: 13, fontWeight: "900" },
    loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    errorText: { fontSize: 13, fontWeight: "700" },
    emptyState: {
        borderWidth: 1,
        borderStyle: "dashed",
        borderRadius: 14,
        padding: 14,
        gap: 5,
    },
    emptyTitle: { fontSize: 13, fontWeight: "800" },
    emptyDescription: { fontSize: 12, fontWeight: "600", lineHeight: 17 },
    noteCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 9 },
    noteHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
    noteTitleGroup: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 9 },
    noteTextGroup: { flex: 1, gap: 2 },
    noteEmoji: { fontSize: 20 },
    noteTitle: { fontSize: 14, fontWeight: "900", lineHeight: 19 },
    noteType: { fontSize: 11, fontWeight: "700" },
    noteDescription: { fontSize: 13, fontWeight: "600", lineHeight: 19 },
    noteTimestamp: { fontSize: 10, fontWeight: "600" },
    noteActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
    secondaryButton: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 11,
        paddingVertical: 7,
    },
    secondaryButtonText: { fontSize: 12, fontWeight: "800" },
    modalBackdrop: {
        flex: 1,
        justifyContent: "center",
        padding: 16,
        backgroundColor: "rgba(0,0,0,0.48)",
    },
    modalCard: {
        maxHeight: "92%",
        borderWidth: 1,
        borderRadius: 20,
        overflow: "hidden",
    },
    modalContent: { padding: 16, gap: 16 },
    modalHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    modalTitle: { fontSize: 19, fontWeight: "900" },
    closeButton: {
        width: 36,
        height: 36,
        borderWidth: 1,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    fieldGroup: { gap: 7 },
    fieldLabelRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    fieldLabel: { fontSize: 12, fontWeight: "800" },
    characterCount: { fontSize: 10, fontWeight: "600" },
    typeOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    typeOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    typeEmoji: { fontSize: 14 },
    typeLabel: { fontSize: 11, fontWeight: "800" },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 14,
        fontWeight: "600",
    },
    descriptionInput: { minHeight: 112 },
    modalActions: { flexDirection: "row", gap: 10 },
    modalActionButton: {
        flex: 1,
        minHeight: 44,
        borderWidth: 1,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
    },
    modalActionText: { fontSize: 13, fontWeight: "900" },
});
