import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
    date: string;
};

function ActionButton(props: { title: string; onPress: () => void; disabled?: boolean }) {
    return (
        <Pressable
            onPress={props.onPress}
            disabled={props.disabled}
            style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                opacity: props.disabled ? 0.5 : 1,
            }}
        >
            <Text style={{ fontWeight: "800" }}>{props.title}</Text>
        </Pressable>
    );
}

export function DayDetailScreen({ date }: Props) {
    const router = useRouter();

    const hasDate = typeof date === "string" && date.trim().length > 0;

    const goToRoutineDay = () => {
        if (!hasDate) return;
        router.push(`/(app)/calendar/routines/day/${date}` as any);
    };

    const goToGymCheckDay = () => {
        if (!hasDate) return;
        router.push(`/(app)/calendar/gym-check/${date}` as any);
    };

    return (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "900" }}>Detalle del Día</Text>
                <Text style={{ color: "#6B7280" }}>
                    date: <Text style={{ fontFamily: "Menlo" }}>{hasDate ? date : "—"}</Text>
                </Text>
            </View>

            <View style={{ gap: 10 }}>
                <ActionButton title="Rutina del día" onPress={goToRoutineDay} disabled={!hasDate} />
                <ActionButton title="Gym Check del día" onPress={goToGymCheckDay} disabled={!hasDate} />
            </View>

            <View style={{ borderWidth: 1, borderRadius: 14, padding: 12 }}>
                <Text style={{ fontWeight: "800" }}>Contenido</Text>
                <Text style={{ color: "#6B7280", marginTop: 6 }}>
                    Placeholder: aquí luego renderizamos sleep/training/notes/tags + sesiones del día.
                </Text>
            </View>
        </View>
    );
}