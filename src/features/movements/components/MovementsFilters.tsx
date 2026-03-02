// src/features/movements/components/MovementsFilters.tsx
import React from "react";
import { Switch, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type Props = {
    search: string;
    activeOnly: boolean;
    onChangeSearch: (next: string) => void;
    onChangeActiveOnly: (next: boolean) => void;
};

export function MovementsFilters({ search, activeOnly, onChangeSearch, onChangeActiveOnly }: Props) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 12,
                gap: 10,
            }}
        >
            <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.mutedText }}>Buscar</Text>
                <TextInput
                    value={search}
                    onChangeText={onChangeSearch}
                    placeholder="Nombre..."
                    placeholderTextColor={colors.mutedText}
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontWeight: "700",
                    }}
                />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                <Switch
                    value={activeOnly}
                    onValueChange={onChangeActiveOnly}
                    trackColor={{ false: colors.border, true: colors.primary }}
                />
                <Text style={{ fontWeight: "800", color: colors.text }}>Solo activos</Text>
            </View>
        </View>
    );
}