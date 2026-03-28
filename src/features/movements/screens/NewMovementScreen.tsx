// /src/features/movements/screens/NewMovementScreen.tsx
import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { useCreateMovement } from "@/src/hooks/useMovements";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { MovementsListQuery } from "@/src/types/movements.types";

import { MovementForm } from "../components/MovementForm";
import { buildMovementFormData, type MovementFormState } from "../components/movementFormData";

function safeText(value: unknown): string {
    const text = String(value ?? "").trim();
    return text.length ? text : "—";
}

const REFRESH_QUERY: MovementsListQuery = { activeOnly: true };

export default function NewMovementScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const createMovementMutation = useCreateMovement(REFRESH_QUERY);

    const [form, setForm] = React.useState<MovementFormState>({
        name: "",
        muscleGroup: [],
        equipment: [],
        isActive: true,
        image: null,
    });

    async function onCreate() {
        const trimmedName = form.name.trim();
        if (!trimmedName) {
            return;
        }

        const formData = buildMovementFormData(
            { ...form, name: trimmedName },
            { imageFieldName: "media" }
        );

        try {
            const created = await createMovementMutation.mutateAsync(formData);
            router.replace({
                pathname: "/(app)/movements/[id]",
                params: { id: created.id },
            });
        } catch (errorValue: unknown) {
            Alert.alert("Error", safeText(errorValue));
        }
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Nuevo movimiento</Text>
                <Text style={{ color: colors.mutedText }}>Crea un movimiento para usarlo en rutinas.</Text>
            </View>

            <MovementForm
                submitLabel="Crear"
                value={form}
                onChange={setForm}
                onSubmit={onCreate}
                busy={createMovementMutation.isPending}
            />
        </ScrollView>
    );
}