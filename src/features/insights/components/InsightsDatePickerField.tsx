// src/features/insights/components/InsightsDatePickerField.tsx
// Compact date selector that keeps API values normalized as YYYY-MM-DD.

import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import React from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type InsightsDatePickerFieldProps = {
    label: string;
    value: string;
    onChange: (next: string) => void;
    disabled?: boolean;
};

/** Converts a normalized date string into a safe local Date instance. */
function parseDate(value: string): Date {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Formats a normalized date using the Spanish Mexico locale. */
function formatDisplay(value: string): string {
    return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(parseDate(value));
}

export function InsightsDatePickerField({
    label,
    value,
    onChange,
    disabled = false,
}: InsightsDatePickerFieldProps) {
    const { colors } = useTheme();
    const [open, setOpen] = React.useState(false);
    const [temporaryDate, setTemporaryDate] = React.useState<Date>(() => parseDate(value));

    React.useEffect(() => {
        setTemporaryDate(parseDate(value));
    }, [value]);

    function close(): void {
        setOpen(false);
    }

    function confirm(): void {
        onChange(format(temporaryDate, "yyyy-MM-dd"));
        close();
    }

    return (
        <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedText }]}>{label}</Text>

            <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => setOpen(true)}
                style={({ pressed }) => [
                    styles.input,
                    {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        opacity: disabled ? 0.55 : pressed ? 0.86 : 1,
                    },
                ]}
            >
                <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
                    {formatDisplay(value)}
                </Text>
            </Pressable>

            <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
                <Pressable style={styles.backdrop} onPress={close}>
                    <Pressable
                        onPress={(event) => event.stopPropagation()}
                        style={[
                            styles.modalCard,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                        ]}
                    >
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Selecciona fecha</Text>

                        <DateTimePicker
                            value={temporaryDate}
                            mode="date"
                            display={Platform.OS === "ios" ? "spinner" : "calendar"}
                            onChange={(event, selectedDate) => {
                                if (Platform.OS !== "ios" && event.type === "dismissed") {
                                    close();
                                    return;
                                }

                                if (!selectedDate) return;

                                if (Platform.OS === "ios") {
                                    setTemporaryDate(selectedDate);
                                    return;
                                }

                                onChange(format(selectedDate, "yyyy-MM-dd"));
                                close();
                            }}
                        />

                        {Platform.OS === "ios" ? (
                            <View style={styles.actions}>
                                <Pressable
                                    onPress={close}
                                    style={({ pressed }) => [
                                        styles.secondaryButton,
                                        {
                                            borderColor: colors.border,
                                            backgroundColor: colors.background,
                                            opacity: pressed ? 0.86 : 1,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.buttonText, { color: colors.text }]}>Cancelar</Text>
                                </Pressable>

                                <Pressable
                                    onPress={confirm}
                                    style={({ pressed }) => [
                                        styles.primaryButton,
                                        {
                                            backgroundColor: colors.primary,
                                            opacity: pressed ? 0.86 : 1,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.buttonText, { color: colors.primaryText }]}>Elegir</Text>
                                </Pressable>
                            </View>
                        ) : null}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    field: {
        flex: 1,
        minWidth: 135,
        gap: 6,
    },
    label: {
        fontSize: 11,
        fontWeight: "800",
    },
    input: {
        minHeight: 44,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        justifyContent: "center",
    },
    value: {
        fontSize: 12,
        fontWeight: "800",
        textAlign: "center",
    },
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        padding: 18,
    },
    modalCard: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        gap: 12,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: "900",
    },
    actions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
    },
    secondaryButton: {
        minHeight: 42,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryButton: {
        minHeight: 42,
        borderRadius: 12,
        paddingHorizontal: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonText: {
        fontSize: 13,
        fontWeight: "900",
    },
});
