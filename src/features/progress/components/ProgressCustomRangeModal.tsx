// src/features/progress/components/ProgressCustomRangeModal.tsx
import DateTimePicker, {
    type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React from "react";
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type Props = {
    visible: boolean;
    from: string | null;
    to: string | null;
    onChangeFrom: (value: string) => void;
    onChangeTo: (value: string) => void;
    onApply: () => void;
    onClose: () => void;
};

function toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function fromIsoDate(value: string | null): Date {
    if (!value) {
        return new Date();
    }

    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

export function ProgressCustomRangeModal({
    visible,
    from,
    to,
    onChangeFrom,
    onChangeTo,
    onApply,
    onClose,
}: Props) {
    const { colors } = useTheme();

    const [showFromPicker, setShowFromPicker] = React.useState(false);
    const [showToPicker, setShowToPicker] = React.useState(false);

    const fromDate = React.useMemo(() => fromIsoDate(from), [from]);
    const toDate = React.useMemo(() => fromIsoDate(to), [to]);

    const handleFromChange = React.useCallback(
        (event: DateTimePickerEvent, selectedDate?: Date) => {
            if (Platform.OS !== "ios") {
                setShowFromPicker(false);
            }

            if (event.type === "dismissed" || !selectedDate) {
                return;
            }

            onChangeFrom(toIsoDate(selectedDate));
        },
        [onChangeFrom]
    );

    const handleToChange = React.useCallback(
        (event: DateTimePickerEvent, selectedDate?: Date) => {
            if (Platform.OS !== "ios") {
                setShowToPicker(false);
            }

            if (event.type === "dismissed" || !selectedDate) {
                return;
            }

            onChangeTo(toIsoDate(selectedDate));
        },
        [onChangeTo]
    );

    const canApply = Boolean(from && to && from <= to);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />

                <View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { color: colors.text }]}>
                                Rango personalizado
                            </Text>
                            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
                                Selecciona fecha inicial y final para comparar progreso.
                            </Text>
                        </View>

                        <Pressable
                            onPress={onClose}
                            style={({ pressed }) => [
                                styles.secondaryButton,
                                {
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    opacity: pressed ? 0.92 : 1,
                                },
                            ]}
                        >
                            <Text style={{ color: colors.text, fontWeight: "800" }}>
                                Cerrar
                            </Text>
                        </Pressable>
                    </View>

                    <View style={styles.fields}>
                        <View style={{ gap: 6 }}>
                            <Text style={[styles.label, { color: colors.text }]}>
                                Fecha inicio
                            </Text>

                            <Pressable
                                onPress={() => setShowFromPicker(true)}
                                style={({ pressed }) => [
                                    styles.fieldButton,
                                    {
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                        opacity: pressed ? 0.92 : 1,
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        color: from ? colors.text : colors.mutedText,
                                        fontWeight: "800",
                                    }}
                                >
                                    {from ?? "Selecciona inicio"}
                                </Text>
                            </Pressable>
                        </View>

                        {showFromPicker ? (
                            <DateTimePicker
                                value={fromDate}
                                mode="date"
                                display={Platform.OS === "ios" ? "spinner" : "default"}
                                onChange={handleFromChange}
                            />
                        ) : null}

                        <View style={{ gap: 6 }}>
                            <Text style={[styles.label, { color: colors.text }]}>
                                Fecha fin
                            </Text>

                            <Pressable
                                onPress={() => setShowToPicker(true)}
                                style={({ pressed }) => [
                                    styles.fieldButton,
                                    {
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                        opacity: pressed ? 0.92 : 1,
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        color: to ? colors.text : colors.mutedText,
                                        fontWeight: "800",
                                    }}
                                >
                                    {to ?? "Selecciona fin"}
                                </Text>
                            </Pressable>
                        </View>

                        {showToPicker ? (
                            <DateTimePicker
                                value={toDate}
                                mode="date"
                                display={Platform.OS === "ios" ? "spinner" : "default"}
                                onChange={handleToChange}
                            />
                        ) : null}
                    </View>

                    {from && to && from > to ? (
                        <Text style={{ color: "#d97706", fontWeight: "800" }}>
                            La fecha inicial no puede ser mayor que la final.
                        </Text>
                    ) : null}

                    <Pressable
                        disabled={!canApply}
                        onPress={onApply}
                        style={({ pressed }) => [
                            styles.primaryButton,
                            {
                                backgroundColor: canApply ? colors.primary : colors.border,
                                opacity: pressed ? 0.92 : 1,
                            },
                        ]}
                    >
                        <Text
                            style={{
                                color: canApply ? colors.primaryText : colors.mutedText,
                                fontWeight: "800",
                            }}
                        >
                            Aplicar rango
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 20,
        gap: 14,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
    },
    subtitle: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: "700",
    },
    fields: {
        gap: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: "800",
    },
    fieldButton: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    secondaryButton: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    primaryButton: {
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 14,
        alignItems: "center",
        justifyContent: "center",
    },
});