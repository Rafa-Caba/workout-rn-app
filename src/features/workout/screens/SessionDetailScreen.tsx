import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
    sessionId: string;
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

export function SessionDetailScreen({ sessionId }: Props) {
    const router = useRouter();

    const hasSessionId = typeof sessionId === "string" && sessionId.trim().length > 0;

    const goToGymCheckSession = () => {
        if (!hasSessionId) return;
        router.push(`/(app)/calendar/gym-check/session/${sessionId}` as any);
    };

    return (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "900" }}>Detalle de Sesión</Text>
                <Text style={{ color: "#6B7280" }}>
                    sessionId: <Text style={{ fontFamily: "Menlo" }}>{hasSessionId ? sessionId : "—"}</Text>
                </Text>
            </View>

            <View style={{ gap: 10 }}>
                <ActionButton
                    title="Gym Check de la sesión"
                    onPress={goToGymCheckSession}
                    disabled={!hasSessionId}
                />
            </View>

            <View style={{ borderWidth: 1, borderRadius: 14, padding: 12 }}>
                <Text style={{ fontWeight: "800" }}>Contenido</Text>
                <Text style={{ color: "#6B7280", marginTop: 6 }}>
                    Placeholder: aquí luego renderizamos ejercicios de la sesión, media, etc.
                </Text>
            </View>
        </View>
    );
}