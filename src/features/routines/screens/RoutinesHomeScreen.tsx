// src/routines/screens/RoutinesHomeScreen.tsx
import { format, getISOWeek, getISOWeekYear } from "date-fns";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

import { AppBrandFooter } from "../../components/branding/AppBrandFooter";

function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function todayIso(): string {
    return format(new Date(), "yyyy-MM-dd");
}

function weekKeyFromIso(today: string): string {
    const d = new Date(`${today}T00:00:00`);
    const y = getISOWeekYear(d);
    const w = getISOWeek(d);
    return `${y}-W${pad2(w)}`;
}

function Button(props: { title: string; onPress: () => void }) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.primary,
                backgroundColor: colors.primary,
                opacity: pressed ? 0.92 : 1,
            })}
        >
            <Text style={{ fontWeight: "800", color: colors.primaryText }}>{props.title}</Text>
        </Pressable>
    );
}

export function RoutinesHomeScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const wk = React.useMemo(() => weekKeyFromIso(todayIso()), []);

    return (
        <View
            style={{
                flex: 1,
                padding: 16,
                gap: 12,
                justifyContent: "space-between",
                backgroundColor: colors.background,
            }}
        >
            <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>Rutinas</Text>
                <Text style={{ color: colors.mutedText }}>
                    Aquí puedes abrir una semana para editar/initializar la rutina.
                </Text>

                <Button
                    title={`Abrir semana actual (${wk})`}
                    onPress={() => router.push(`/(app)/calendar/routines/week/${wk}` as any)}
                />
            </View>

            {/* App image */}
            <View
                style={{
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 6,
                    borderRadius: 16,
                    padding: 12,
                }}
            >
                <AppBrandFooter />
            </View>
        </View>
    );
}