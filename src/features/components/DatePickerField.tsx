// src/features/components/DatePickerField.tsx
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parse } from "date-fns";
import React from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type Props = {
    label?: string;
    value: string; // "yyyy-MM-dd"
    onChange: (next: string) => void;
    disabled?: boolean;

    /**
     * Optional: display format for the input (value remains yyyy-MM-dd)
     * Example: "MM/dd/yyyy" or "MMM dd, yyyy"
     */
    displayFormat?: string;
};

function parseISODateOrToday(s: string): Date {
    const parsed = parse(String(s ?? "").trim(), "yyyy-MM-dd", new Date());
    if (Number.isNaN(parsed.getTime())) return new Date();
    return parsed;
}

function safeDisplay(value: string, displayFormat?: string): string {
    if (!value) return "YYYY-MM-DD";

    if (!displayFormat) return value;

    const dt = parseISODateOrToday(value);
    try {
        return format(dt, displayFormat);
    } catch {
        return value;
    }
}

export function DatePickerField({
    label = "Fecha",
    value,
    onChange,
    disabled,
    displayFormat,
}: Props) {
    const { colors } = useTheme();

    const [open, setOpen] = React.useState(false);
    const [temp, setTemp] = React.useState<Date>(() => parseISODateOrToday(value));

    React.useEffect(() => {
        setTemp(parseISODateOrToday(value));
    }, [value]);

    const close = () => setOpen(false);

    const confirmIOS = () => {
        onChange(format(temp, "yyyy-MM-dd"));
        close();
    };

    return (
        <View style={{ flex: 1, gap: 6 }}>
            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.mutedText }}>
                    {label}
                </Text>

                <Pressable
                    onPress={() => !disabled && setOpen(true)}
                    disabled={disabled}
                    style={({ pressed }) => ({
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        width: '60%',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        opacity: disabled ? 0.6 : pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ color: colors.text, fontWeight: "900", textAlign: 'center' }}>
                        {safeDisplay(value, displayFormat)}
                    </Text>
                </Pressable>
            </View>

            <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
                <Pressable
                    onPress={close}
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.45)",
                        padding: 16,
                        justifyContent: "center",
                    }}
                >
                    <Pressable
                        onPress={() => { }}
                        style={{
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                            padding: 12,
                            gap: 12,
                        }}
                    >
                        <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>
                            Selecciona fecha
                        </Text>

                        <DateTimePicker
                            value={temp}
                            mode="date"
                            display={Platform.OS === "ios" ? "spinner" : "calendar"}
                            onChange={(_event, selected) => {
                                if (!selected) return;

                                if (Platform.OS !== "ios") {
                                    onChange(format(selected, "yyyy-MM-dd"));
                                    close();
                                    return;
                                }

                                setTemp(selected);
                            }}
                        />

                        {Platform.OS === "ios" ? (
                            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
                                <Pressable
                                    onPress={close}
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
                                    <Text style={{ color: colors.text, fontWeight: "900" }}>Cancelar</Text>
                                </Pressable>

                                <Pressable
                                    onPress={confirmIOS}
                                    style={({ pressed }) => ({
                                        paddingHorizontal: 14,
                                        paddingVertical: 10,
                                        borderRadius: 12,
                                        backgroundColor: colors.primary,
                                        opacity: pressed ? 0.92 : 1,
                                    })}
                                >
                                    <Text style={{ color: colors.primaryText, fontWeight: "900" }}>Elegir</Text>
                                </Pressable>
                            </View>
                        ) : null}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}