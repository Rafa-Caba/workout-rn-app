// /src/features/components/DatePickerField.tsx
// Reusable date-only field. Keeps yyyy-MM-dd as the stored value while the
// native picker follows the app theme and Spanish locale.

import DateTimePicker, {
    type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import React from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type DatePickerFieldProps = {
    label?: string;
    value: string;
    onChange: (next: string) => void;
    disabled?: boolean;
    displayFormat?: string;
    flexDirPassed?: "row" | "column" | "row-reverse" | "column-reverse";
};

function parseISODateOrToday(value: string): Date {
    const parsed = parse(value.trim(), "yyyy-MM-dd", new Date());
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function safeDisplay(value: string, displayFormat?: string): string {
    if (!value) return "YYYY-MM-DD";
    if (!displayFormat) return value;

    const date = parseISODateOrToday(value);

    try {
        return format(date, displayFormat, { locale: es });
    } catch {
        return value;
    }
}

export function DatePickerField({
    label = "Fecha",
    value,
    onChange,
    disabled = false,
    displayFormat,
}: DatePickerFieldProps) {
    const { colors, resolvedScheme } = useTheme();

    const [open, setOpen] = React.useState<boolean>(false);
    const [temp, setTemp] = React.useState<Date>(() => parseISODateOrToday(value));

    React.useEffect(() => {
        if (!open) {
            setTemp(parseISODateOrToday(value));
        }
    }, [open, value]);

    function openPicker(): void {
        if (disabled) return;

        setTemp(parseISODateOrToday(value));
        setOpen(true);
    }

    function cancelPicker(): void {
        setTemp(parseISODateOrToday(value));
        setOpen(false);
    }

    function confirmIOS(): void {
        onChange(format(temp, "yyyy-MM-dd"));
        setOpen(false);
    }

    function handlePickerChange(
        _event: DateTimePickerEvent,
        selectedDate?: Date
    ): void {
        if (!selectedDate) return;

        if (Platform.OS !== "ios") {
            onChange(format(selectedDate, "yyyy-MM-dd"));
            setOpen(false);
            return;
        }

        setTemp(selectedDate);
    }

    return (
        <View style={{ flex: 1, gap: 6 }}>
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <Text
                    style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: colors.mutedText,
                    }}
                >
                    {label}
                </Text>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${label}: ${safeDisplay(value, displayFormat)}`}
                    onPress={openPicker}
                    disabled={disabled}
                    style={({ pressed }) => ({
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        width: "60%",
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        opacity: disabled ? 0.6 : pressed ? 0.92 : 1,
                    })}
                >
                    <Text
                        style={{
                            color: colors.text,
                            fontWeight: "800",
                            textAlign: "center",
                        }}
                    >
                        {safeDisplay(value, displayFormat)}
                    </Text>
                </Pressable>
            </View>

            <Modal
                visible={open}
                transparent
                animationType="fade"
                onRequestClose={cancelPicker}
            >
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar selector de fecha"
                    onPress={cancelPicker}
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.45)",
                        padding: 16,
                        justifyContent: "center",
                    }}
                >
                    <Pressable
                        accessibilityViewIsModal
                        onPress={() => undefined}
                        style={{
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                            padding: 12,
                            gap: 12,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "800",
                                color: colors.text,
                            }}
                        >
                            Selecciona fecha
                        </Text>

                        {Platform.OS === "ios" ? (
                            <DateTimePicker
                                value={temp}
                                mode="date"
                                display="spinner"
                                locale="es-MX"
                                themeVariant={resolvedScheme}
                                textColor={colors.text}
                                onChange={handlePickerChange}
                            />
                        ) : (
                            <DateTimePicker
                                value={temp}
                                mode="date"
                                display="calendar"
                                onChange={handlePickerChange}
                            />
                        )}

                        {Platform.OS === "ios" ? (
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "flex-end",
                                    gap: 10,
                                }}
                            >
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel="Cancelar selección de fecha"
                                    onPress={cancelPicker}
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
                                    <Text style={{ color: colors.text, fontWeight: "800" }}>
                                        Cancelar
                                    </Text>
                                </Pressable>

                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel="Confirmar fecha"
                                    onPress={confirmIOS}
                                    style={({ pressed }) => ({
                                        paddingHorizontal: 14,
                                        paddingVertical: 10,
                                        borderRadius: 12,
                                        backgroundColor: colors.primary,
                                        opacity: pressed ? 0.92 : 1,
                                    })}
                                >
                                    <Text
                                        style={{
                                            color: colors.primaryText,
                                            fontWeight: "800",
                                        }}
                                    >
                                        Elegir
                                    </Text>
                                </Pressable>
                            </View>
                        ) : null}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}
