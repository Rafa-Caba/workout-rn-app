// src/features/calendar/components/CalendarNoteFormModal.tsx

/**
 * Page-sheet form for creating or editing one typed WorkoutDay note.
 * The date is editable when creating and locked when editing.
 */

import React from "react";
import {
    ActivityIndicator,
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

import { DatePickerField } from "@/src/features/components/DatePickerField";
import { useTheme } from "@/src/theme/ThemeProvider";
import type {
    WorkoutDayNote,
    WorkoutDayNoteDraft,
    WorkoutDayNoteType,
} from "@/src/types/workoutDay.types";
import {
    DAY_NOTE_DESCRIPTION_MAX_LENGTH,
    DAY_NOTE_TITLE_MAX_LENGTH,
    DAY_NOTE_TYPE_OPTIONS,
    normalizeDayNoteDraft,
} from "@/src/utils/dayNotes";

type FormState = {
    date: string;
    type: WorkoutDayNoteType;
    title: string;
    description: string;
};

type Props = {
    visible: boolean;
    initialDate: string;
    initialNote: WorkoutDayNote | null;
    saving: boolean;
    onClose: () => void;
    onSave: (args: {
        date: string;
        draft: WorkoutDayNoteDraft;
    }) => Promise<void>;
};

function buildInitialForm(
    date: string,
    note: WorkoutDayNote | null
): FormState {
    if (note) {
        return {
            date,
            type: note.type,
            title: note.title,
            description: note.description ?? "",
        };
    }

    return {
        date,
        type: "reminder",
        title: "",
        description: "",
    };
}

export function CalendarNoteFormModal({
    visible,
    initialDate,
    initialNote,
    saving,
    onClose,
    onSave,
}: Props) {
    const { colors } = useTheme();
    const [form, setForm] = React.useState<FormState>(() =>
        buildInitialForm(initialDate, initialNote)
    );
    const [validationMessage, setValidationMessage] = React.useState<string | null>(
        null
    );

    const editing = initialNote !== null;

    React.useEffect(() => {
        if (!visible) return;

        setForm(buildInitialForm(initialDate, initialNote));
        setValidationMessage(null);
    }, [initialDate, initialNote, visible]);

    async function submit(): Promise<void> {
        const draft = normalizeDayNoteDraft(form);

        if (!form.date) {
            setValidationMessage("Selecciona una fecha válida.");
            return;
        }

        if (!draft) {
            setValidationMessage(
                `El título es obligatorio y admite hasta ${DAY_NOTE_TITLE_MAX_LENGTH} caracteres. La descripción admite hasta ${DAY_NOTE_DESCRIPTION_MAX_LENGTH}.`
            );
            return;
        }

        setValidationMessage(null);
        await onSave({ date: form.date, draft });
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={saving ? undefined : onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                accessibilityViewIsModal
                style={[styles.root, { backgroundColor: colors.background }]}
            >
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
                        <Text style={[styles.title, { color: colors.text }]}>{editing ? "Editar nota" : "Agregar nota"}</Text>
                        <Text style={[styles.subtitle, { color: colors.mutedText }]}>{editing ? "Actualiza únicamente la nota seleccionada." : "Se sincronizará con la web en el día elegido."}</Text>
                    </View>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Cerrar formulario de nota"
                        disabled={saving}
                        onPress={onClose}
                        style={({ pressed }) => [
                            styles.closeButton,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                opacity: pressed || saving ? 0.62 : 1,
                            },
                        ]}
                    >
                        <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
                    </Pressable>
                </View>

                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.content}
                >
                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <DatePickerField
                            label="Fecha"
                            value={form.date}
                            disabled={editing || saving}
                            displayFormat="dd/MM/yyyy"
                            flexDirPassed="column"
                            onChange={(date) =>
                                setForm((current) => ({ ...current, date }))
                            }
                        />

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: colors.mutedText }]}>Tipo de nota</Text>
                            <View style={styles.typeGrid}>
                                {DAY_NOTE_TYPE_OPTIONS.map((option) => {
                                    const selected = form.type === option.value;

                                    return (
                                        <Pressable
                                            key={option.value}
                                            accessibilityRole="button"
                                            disabled={saving}
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
                                                    opacity: pressed || saving ? 0.68 : 1,
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
                                                numberOfLines={1}
                                            >
                                                {option.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.fieldGroup}>
                            <View style={styles.labelRow}>
                                <Text style={[styles.label, { color: colors.mutedText }]}>Título</Text>
                                <Text style={[styles.count, { color: colors.mutedText }]}>{form.title.length}/{DAY_NOTE_TITLE_MAX_LENGTH}</Text>
                            </View>
                            <TextInput
                                value={form.title}
                                editable={!saving}
                                maxLength={DAY_NOTE_TITLE_MAX_LENGTH}
                                placeholder="Ej. Cita con fisioterapia"
                                placeholderTextColor={colors.mutedText}
                                onChangeText={(title) =>
                                    setForm((current) => ({ ...current, title }))
                                }
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
                            <View style={styles.labelRow}>
                                <Text style={[styles.label, { color: colors.mutedText }]}>Descripción</Text>
                                <Text style={[styles.count, { color: colors.mutedText }]}>{form.description.length}/{DAY_NOTE_DESCRIPTION_MAX_LENGTH}</Text>
                            </View>
                            <TextInput
                                value={form.description}
                                editable={!saving}
                                maxLength={DAY_NOTE_DESCRIPTION_MAX_LENGTH}
                                multiline
                                textAlignVertical="top"
                                placeholder="Detalles opcionales"
                                placeholderTextColor={colors.mutedText}
                                onChangeText={(description) =>
                                    setForm((current) => ({
                                        ...current,
                                        description,
                                    }))
                                }
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
                            <Text style={[styles.helper, { color: colors.mutedText }]}>Texto simple; se conservan los saltos de línea.</Text>
                        </View>

                        {validationMessage ? (
                            <Text style={[styles.validation, { color: colors.danger }]}>{validationMessage}</Text>
                        ) : null}
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
                        disabled={saving}
                        onPress={onClose}
                        style={({ pressed }) => [
                            styles.footerButton,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                opacity: pressed || saving ? 0.64 : 1,
                            },
                        ]}
                    >
                        <Text style={[styles.footerButtonText, { color: colors.text }]}>Cancelar</Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        disabled={saving}
                        onPress={() => void submit()}
                        style={({ pressed }) => [
                            styles.footerButton,
                            {
                                borderColor: colors.primary,
                                backgroundColor: colors.primary,
                                opacity: pressed || saving ? 0.7 : 1,
                            },
                        ]}
                    >
                        {saving ? (
                            <ActivityIndicator color={colors.primaryText} />
                        ) : (
                            <Text style={[styles.footerButtonText, { color: colors.primaryText }]}>{editing ? "Guardar cambios" : "Guardar nota"}</Text>
                        )}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
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
    headerText: { flex: 1, gap: 3 },
    title: { fontSize: 21, fontWeight: "900" },
    subtitle: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
    closeButton: {
        width: 44,
        height: 44,
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
        padding: 14,
        gap: 17,
    },
    fieldGroup: { gap: 7 },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    label: { fontSize: 12, fontWeight: "800" },
    count: { fontSize: 11, fontWeight: "700" },
    typeGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    typeOption: {
        width: "31%",
        minWidth: 96,
        borderWidth: 1,
        borderRadius: 13,
        paddingHorizontal: 8,
        paddingVertical: 10,
        alignItems: "center",
        gap: 4,
    },
    typeEmoji: { fontSize: 20 },
    typeLabel: { fontSize: 11, fontWeight: "800" },
    input: {
        borderWidth: 1,
        borderRadius: 13,
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 15,
        fontWeight: "600",
    },
    descriptionInput: { minHeight: 120 },
    helper: { fontSize: 11, lineHeight: 16, fontWeight: "600" },
    validation: { fontSize: 12, lineHeight: 17, fontWeight: "800" },
    footer: {
        borderTopWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        flexDirection: "row",
        gap: 10,
    },
    footerButton: {
        flex: 1,
        minHeight: 46,
        borderWidth: 1,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
    },
    footerButtonText: { fontSize: 14, fontWeight: "900", textAlign: "center" },
});
