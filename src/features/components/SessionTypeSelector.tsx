// src/features/components/SessionTypeSelector.tsx
// Reusable session type selector following the same intent as the Device selector:
// compact field, current value preview, and modal-based selection.

import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import {
    SESSION_TYPE_OPTIONS,
    type SessionTypeOption,
} from "./sessionTypeOptions";

type Props = {
    label?: string;
    placeholder?: string;
    value: string | null | undefined;
    onChange: (value: SessionTypeOption) => void;
    disabled?: boolean;
    helperText?: string | null;
};

export function SessionTypeSelector({
    label = "Tipo de sesión",
    placeholder = "Selecciona un tipo",
    value,
    onChange,
    disabled = false,
    helperText = null,
}: Props) {
    const { colors } = useTheme();
    const [visible, setVisible] = React.useState(false);

    const selectedValue = value?.trim() ? value.trim() : null;

    const open = React.useCallback(() => {
        if (disabled) {
            return;
        }

        setVisible(true);
    }, [disabled]);

    const close = React.useCallback(() => {
        setVisible(false);
    }, []);

    const handleSelect = React.useCallback(
        (nextValue: SessionTypeOption) => {
            onChange(nextValue);
            setVisible(false);
        },
        [onChange]
    );

    return (
        <>
            <View style={styles.container}>
                <Text style={[styles.label, { color: colors.text }]}>{label}</Text>

                <Pressable
                    onPress={open}
                    disabled={disabled}
                    style={({ pressed }) => [
                        styles.trigger,
                        {
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                            opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
                        },
                    ]}
                >
                    <View style={styles.triggerLeft}>
                        <MaterialCommunityIcons
                            name="format-list-bulleted-square"
                            size={18}
                            color={colors.text}
                        />
                        <Text
                            style={[
                                styles.triggerText,
                                { color: selectedValue ? colors.text : colors.mutedText },
                            ]}
                            numberOfLines={1}
                        >
                            {selectedValue ?? placeholder}
                        </Text>
                    </View>

                    <MaterialCommunityIcons
                        name="chevron-down"
                        size={20}
                        color={colors.mutedText}
                    />
                </Pressable>

                {helperText ? (
                    <Text style={[styles.helperText, { color: colors.mutedText }]}>
                        {helperText}
                    </Text>
                ) : null}
            </View>

            <Modal
                visible={visible}
                animationType="slide"
                transparent
                onRequestClose={close}
            >
                <View style={styles.overlay}>
                    <Pressable style={styles.backdrop} onPress={close} />

                    <View
                        style={[
                            styles.sheet,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={styles.sheetHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                                    Seleccionar tipo de sesión
                                </Text>
                                <Text
                                    style={[
                                        styles.sheetSubtitle,
                                        { color: colors.mutedText },
                                    ]}
                                >
                                    Usa valores canónicos para mantener el progreso limpio.
                                </Text>
                            </View>

                            <Pressable
                                onPress={close}
                                style={({ pressed }) => [
                                    styles.closeBtn,
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

                        <ScrollView
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {SESSION_TYPE_OPTIONS.map((option) => {
                                const selected = selectedValue === option;

                                return (
                                    <Pressable
                                        key={option}
                                        onPress={() => handleSelect(option)}
                                        style={({ pressed }) => [
                                            styles.optionRow,
                                            {
                                                borderColor: selected
                                                    ? colors.primary
                                                    : colors.border,
                                                backgroundColor: selected
                                                    ? colors.primary + "18"
                                                    : colors.background,
                                                opacity: pressed ? 0.92 : 1,
                                            },
                                        ]}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={{
                                                    color: colors.text,
                                                    fontWeight: "800",
                                                    fontSize: 14,
                                                }}
                                            >
                                                {option}
                                            </Text>
                                        </View>

                                        {selected ? (
                                            <MaterialCommunityIcons
                                                name="check-circle"
                                                size={20}
                                                color={colors.primary}
                                            />
                                        ) : (
                                            <MaterialCommunityIcons
                                                name="circle-outline"
                                                size={20}
                                                color={colors.mutedText}
                                            />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: "800",
    },
    trigger: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    triggerLeft: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    triggerText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "700",
    },
    helperText: {
        fontSize: 12,
        fontWeight: "600",
    },
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
        paddingBottom: 18,
        maxHeight: "75%",
    },
    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: "800",
    },
    sheetSubtitle: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: "700",
    },
    closeBtn: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    listContent: {
        gap: 8,
        paddingBottom: 10,
    },
    optionRow: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
});