// src/features/periods/components/PeriodDatePickerField.tsx
// Date/month selector that keeps API values normalized as yyyy-MM-dd or yyyy-MM.

import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import React from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type PickerMode = "date" | "month";

type Props = {
    label: string;
    value: string;
    mode?: PickerMode;
    onChange: (next: string) => void;
    disabled?: boolean;
};

function parseValue(value: string, mode: PickerMode): Date {
    const normalized = mode === "month" ? `${value}-01` : value;
    const parsed = new Date(`${normalized}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDisplay(value: string, mode: PickerMode): string {
    const parsed = parseValue(value, mode);

    if (mode === "month") {
        const label = new Intl.DateTimeFormat("es-MX", {
            month: "long",
            year: "numeric",
        }).format(parsed);
        return label.charAt(0).toUpperCase() + label.slice(1);
    }

    return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(parsed);
}

function serializeValue(date: Date, mode: PickerMode): string {
    return format(date, mode === "month" ? "yyyy-MM" : "yyyy-MM-dd");
}

export function PeriodDatePickerField({
    label,
    value,
    mode = "date",
    onChange,
    disabled = false,
}: Props) {
    const { colors } = useTheme();
    const [open, setOpen] = React.useState(false);
    const [temporaryDate, setTemporaryDate] = React.useState<Date>(() => parseValue(value, mode));

    React.useEffect(() => {
        setTemporaryDate(parseValue(value, mode));
    }, [mode, value]);

    function close(): void {
        setOpen(false);
    }

    function confirm(): void {
        onChange(serializeValue(temporaryDate, mode));
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
                    {formatDisplay(value, mode)}
                </Text>
            </Pressable>

            <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
                <Pressable style={styles.backdrop} onPress={close}>
                    <Pressable
                        onPress={(event) => event.stopPropagation()}
                        style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Selecciona {mode === "month" ? "mes" : "fecha"}</Text>

                        <DateTimePicker
                            value={temporaryDate}
                            mode="date"
                            display={Platform.OS === "ios" ? "spinner" : "calendar"}
                            onChange={(_event, selectedDate) => {
                                if (!selectedDate) return;

                                if (Platform.OS === "ios") {
                                    setTemporaryDate(selectedDate);
                                    return;
                                }

                                onChange(serializeValue(selectedDate, mode));
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
        minWidth: 145,
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
        paddingHorizontal: 11,
        justifyContent: "center",
    },
    value: {
        fontSize: 13,
        fontWeight: "800",
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
