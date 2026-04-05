// /src/features/health/outdoor/components/OutdoorSessionMediaPickerButton.tsx

import React from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type Props = {
    disabled?: boolean;
    loading?: boolean;
    onPress: () => void;
};

export default function OutdoorSessionMediaPickerButton({
    disabled = false,
    loading = false,
    onPress,
}: Props) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            style={({ pressed }) => ({
                borderWidth: 1,
                borderColor: colors.primary,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor: colors.primary,
                opacity: disabled || loading ? 0.6 : pressed ? 0.9 : 1,
                minWidth: 110,
                alignItems: "center",
                justifyContent: "center",
            })}
        >
            {loading ? (
                <ActivityIndicator color={colors.primaryText} />
            ) : (
                <Text
                    style={{
                        color: colors.primaryText,
                        fontWeight: "800",
                    }}
                >
                    Agregar
                </Text>
            )}
        </Pressable>
    );
}