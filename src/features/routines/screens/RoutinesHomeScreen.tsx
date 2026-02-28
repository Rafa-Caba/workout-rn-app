// src/routines/screens/RoutinesHomeScreen.tsx
import { format, getISOWeek, getISOWeekYear } from "date-fns";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

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
    return (
        <Pressable
            onPress={props.onPress}
            style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
            }}
        >
            <Text style={{ fontWeight: "900" }}>{props.title}</Text>
        </Pressable>
    );
}

export function RoutinesHomeScreen() {
    const router = useRouter();

    const wk = React.useMemo(() => weekKeyFromIso(todayIso()), []);

    return (
        <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: 'space-between' }}>
            <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 20, fontWeight: "900" }}>Rutinas</Text>
                <Text style={{ color: "#6B7280" }}>
                    Aquí puedes abrir una semana para editar/initializar la rutina.
                </Text>

                <Button
                    title={`Abrir semana actual (${wk})`}
                    onPress={() => router.push(`/(app)/calendar/routines/week/${wk}` as any)}
                />
            </View>

            {/* App image placeholder (future AppSettings.logoUrl) */}
            <View style={{ alignItems: "center", gap: 10, paddingVertical: 6, marginBottom: 30 }}>
                <View
                    style={{
                        width: 84,
                        height: 84,
                        borderRadius: 999,
                        borderWidth: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#F3F4F6",
                    }}
                >
                    <Text style={{ fontSize: 34 }}>🏋️</Text>
                </View>

                <View style={{ alignItems: "center", gap: 2 }}>
                    <Text style={{ fontSize: 18, fontWeight: "900" }}>Workout App</Text>
                    <Text style={{ color: "#6B7280", textAlign: "center" }}>
                        Logo pendiente (AppSettings)
                    </Text>
                </View>
            </View>
        </View>
    );
}