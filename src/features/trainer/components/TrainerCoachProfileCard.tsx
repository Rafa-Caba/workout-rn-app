// src/features/trainer/components/TrainerCoachProfileCard.tsx
import React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useTrainerCoachProfile } from "@/src/hooks/trainer/useTrainerCoachProfile";
import { useUpsertTrainerCoachProfile } from "@/src/hooks/trainer/useUpsertTrainerCoachProfile";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { TrainingLevel } from "@/src/types/trainerCoachProfile.types";

const LEVELS: Array<{ value: Exclude<TrainingLevel, null>; labelEs: string }> = [
    { value: "BEGINNER", labelEs: "Principiante" },
    { value: "INTERMEDIATE", labelEs: "Intermedio" },
    { value: "ADVANCED", labelEs: "Avanzado" },
];

function normalizeLevel(v: unknown): TrainingLevel {
    if (v === "BEGINNER" || v === "INTERMEDIATE" || v === "ADVANCED") return v;
    return null;
}

function levelLabelEs(v: TrainingLevel): string {
    if (v === "BEGINNER") return "Principiante";
    if (v === "INTERMEDIATE") return "Intermedio";
    if (v === "ADVANCED") return "Avanzado";
    return "Sin definir";
}

type Props = {
    traineeId: string;
};

export function TrainerCoachProfileCard({ traineeId }: Props) {
    const { colors } = useTheme();

    const q = useTrainerCoachProfile({ traineeId });
    const m = useUpsertTrainerCoachProfile();

    const loadedProfile = q.data?.profile ?? null;

    const [level, setLevel] = React.useState<TrainingLevel>(null);
    const [notes, setNotes] = React.useState<string>("");

    const [dirty, setDirty] = React.useState(false);

    const [levelModalOpen, setLevelModalOpen] = React.useState(false);

    React.useEffect(() => {
        const lvl = normalizeLevel((loadedProfile as any)?.coachAssessedLevel);
        const n = typeof (loadedProfile as any)?.coachNotes === "string" ? String((loadedProfile as any).coachNotes) : "";

        setLevel(lvl);
        setNotes(n);
        setDirty(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [traineeId, (loadedProfile as any)?.id]);

    const isSaving = m.isPending;
    const isLoading = q.isLoading;

    const statusLabel = q.isLoading ? "Cargando…" : loadedProfile ? "Guardado" : "Nuevo";

    const onSave = async () => {
        await m.mutateAsync({
            traineeId,
            body: {
                coachAssessedLevel: level,
                coachNotes: notes.trim() ? notes.trim() : null,
            },
        });

        setDirty(false);
    };

    return (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.headerRow}>
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontWeight: "800", color: colors.text }}>Perfil del coach</Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                        Estos datos los llena el coach (ej. después de la primera cita).
                    </Text>
                </View>

                <Pressable
                    onPress={() => !isLoading && !isSaving && dirty && onSave()}
                    disabled={isLoading || isSaving || !dirty}
                    style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        opacity: isLoading || isSaving || !dirty ? 0.5 : pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ fontWeight: "800", color: colors.text }}>
                        {isSaving ? "Guardando…" : "Guardar"}
                    </Text>
                </Pressable>
            </View>

            {q.isError ? (
                <View style={[styles.notice, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>
                        Error al cargar el perfil del coach. Intenta recargar.
                    </Text>
                </View>
            ) : null}

            <View style={styles.gridRow}>
                <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>Nivel (coach)</Text>

                    <Pressable
                        onPress={() => !isLoading && setLevelModalOpen(true)}
                        disabled={isLoading}
                        style={({ pressed }) => ({
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: isLoading ? 0.6 : pressed ? 0.92 : 1,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }} numberOfLines={1}>
                            {levelLabelEs(level)}
                        </Text>
                        <Text style={{ color: colors.mutedText, fontWeight: "800" }}>▾</Text>
                    </Pressable>
                </View>

                <View style={{ width: 140, gap: 6 }}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>Estado</Text>
                    <View
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            justifyContent: "center",
                        }}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>{statusLabel}</Text>
                    </View>
                </View>
            </View>

            <View style={{ gap: 6 }}>
                <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>Notas del coach</Text>

                <TextInput
                    value={notes}
                    onChangeText={(t) => {
                        setNotes(t);
                        setDirty(true);
                    }}
                    placeholder="Ej: técnica, prioridades, consideraciones, lesiones, objetivos…"
                    placeholderTextColor={colors.mutedText}
                    multiline
                    style={[
                        styles.textArea,
                        { borderColor: colors.border, backgroundColor: colors.background, color: colors.text },
                    ]}
                    editable={!isLoading}
                />
            </View>

            {isLoading ? (
                <View style={{ marginTop: 8 }}>
                    <ActivityIndicator />
                </View>
            ) : null}

            <Modal visible={levelModalOpen} transparent animationType="fade" onRequestClose={() => setLevelModalOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setLevelModalOpen(false)} />
                <View style={[styles.sheet, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>Nivel (coach)</Text>

                    <View style={{ height: 10 }} />

                    <Pressable
                        onPress={() => {
                            setLevel(null);
                            setDirty(true);
                            setLevelModalOpen(false);
                        }}
                        style={({ pressed }) => ({
                            padding: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>Sin definir</Text>
                    </Pressable>

                    <View style={{ height: 8 }} />

                    {LEVELS.map((o) => (
                        <Pressable
                            key={o.value}
                            onPress={() => {
                                setLevel(o.value);
                                setDirty(true);
                                setLevelModalOpen(false);
                            }}
                            style={({ pressed }) => ({
                                padding: 12,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                opacity: pressed ? 0.92 : 1,
                            })}
                        >
                            <Text style={{ fontWeight: "800", color: colors.text }}>{o.labelEs}</Text>
                        </Pressable>
                    ))}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },

    headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },

    gridRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },

    textArea: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 90,
        textAlignVertical: "top",
        fontWeight: "700",
    },

    notice: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 10,
    },

    backdrop: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" },

    sheet: {
        position: "absolute",
        left: 16,
        right: 16,
        top: 120,
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        gap: 8,
    },
});