// src/features/movements/screens/NewMovementScreen.tsx
import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { useCreateMovement } from "@/src/hooks/useMovements";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { MovementsListQuery } from "@/src/types/movements.types";

import { MovementForm } from "../components/MovementForm";
import { buildMovementFormData, type MovementFormState } from "../components/movementFormData";

function safeText(v: unknown): string {
    const s = String(v ?? "").trim();
    return s.length ? s : "—";
}

const REFRESH_QUERY: MovementsListQuery = { activeOnly: true };

export default function NewMovementScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const createM = useCreateMovement(REFRESH_QUERY);

    const [form, setForm] = React.useState<MovementFormState>({
        name: "",
        muscleGroup: null,
        equipment: null,
        isActive: true,
        image: null,
    });

    const onCreate = async () => {
        const nameTrim = form.name.trim();
        if (!nameTrim) return;

        const fd = buildMovementFormData({ ...form, name: nameTrim }, { imageFieldName: "media" });

        try {
            const created = await createM.mutateAsync(fd);
            router.replace({ pathname: "/(app)/movements/[id]", params: { id: created.id } });
        } catch (e: unknown) {
            Alert.alert("Error", safeText(e));
        }
    };

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
                busy={createM.isPending}
            />
        </ScrollView>
    );
}