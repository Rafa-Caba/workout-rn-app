import React from "react";
import { Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type Props = {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    keyboardType?: "default" | "numeric";
    disabled?: boolean;

    onFocus?: () => void;
    onBlur?: () => void;
};

export function GymCheckField({
    label,
    value,
    onChange,
    placeholder,
    keyboardType = "default",
    disabled = false,
    onFocus,
    onBlur,
}: Props) {
    const { colors } = useTheme();

    return (
        <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, color: colors.mutedText }}>{label}</Text>

            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={colors.mutedText}
                keyboardType={keyboardType}
                editable={!disabled}
                onFocus={onFocus}
                onBlur={onBlur}
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 12,
                    backgroundColor: disabled ? colors.surface : colors.background,
                    color: colors.text,
                    opacity: disabled ? 0.7 : 1,
                }}
            />
        </View>
    );
}