// src/features/progress/screens/ProgressScreen.tsx
import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppBrandFooter } from "@/src/features/components/branding/AppBrandFooter";
import { useWorkoutProgress } from "@/src/hooks/summary/useWorkoutProgress";
import { useTheme } from "@/src/theme/ThemeProvider";
import type {
    WorkoutProgressCompareTo,
    WorkoutProgressMode,
} from "@/src/types/workoutProgress.types";

import { ExerciseProgressSection } from "../components/ExerciseProgressSection";
import { ProgressExerciseTableCard } from "../components/ProgressExerciseTableCard";
import { ProgressHeroCard } from "../components/ProgressHeroCard";
import { ProgressHighlightsCard } from "../components/ProgressHighlightsCard";
import { ProgressMetricsSection } from "../components/ProgressMetricsSection";
import { ProgressPeriodSelector } from "../components/ProgressPeriodSelector";
import { SessionTypeProgressCard } from "../components/SessionTypeProgressCard";
import { TopExerciseHighlightsCard } from "../components/TopExerciseHighlightsCard";

export function ProgressScreen() {
    const { colors } = useTheme();

    const [mode, setMode] = React.useState<WorkoutProgressMode>("last30");
    const [compareTo, setCompareTo] =
        React.useState<WorkoutProgressCompareTo>("previous_period");

    const progressQuery = useWorkoutProgress({
        mode,
        compareTo,
        includeExerciseProgress: true,
    });

    const data = progressQuery.data ?? null;

    const onRefresh = React.useCallback(() => {
        void progressQuery.refetch();
    }, [progressQuery]);

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={progressQuery.isRefetching}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                />
            }
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>
                    Progreso
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Compara entrenamiento, sueño, adherencia y mejoras por ejercicio.
                </Text>
            </View>

            <ProgressPeriodSelector
                mode={mode}
                compareTo={compareTo}
                onChangeMode={setMode}
                onChangeCompareTo={setCompareTo}
            />

            {progressQuery.isLoading ? (
                <View style={[styles.centerCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Cargando progreso...
                    </Text>
                </View>
            ) : progressQuery.isError || !data ? (
                <View style={[styles.centerCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.text, fontWeight: "900" }}>
                        No se pudo cargar progreso
                    </Text>
                    <Text style={{ color: colors.mutedText }}>
                        Intenta nuevamente.
                    </Text>
                </View>
            ) : (
                <>
                    <ProgressHeroCard
                        hero={data.hero}
                        range={data.range}
                        compareRange={data.compareRange}
                    />

                    <ProgressMetricsSection
                        title="Entrenamiento"
                        subtitle="Sesiones, duración, kcal, HR, distancia y pasos"
                        metrics={data.training}
                    />

                    <ProgressMetricsSection
                        title="Sueño"
                        subtitle="Sueño promedio, deep, REM y score"
                        metrics={data.sleep}
                    />

                    <ProgressMetricsSection
                        title="Adherencia"
                        subtitle="Planeado vs completado, ejercicios, sets y calidad"
                        metrics={data.adherence}
                    />

                    <ProgressHighlightsCard
                        title="Highlights automáticos"
                        items={data.highlights}
                    />

                    <ProgressExerciseTableCard rows={data.exerciseTable} />

                    <TopExerciseHighlightsCard items={data.exerciseHighlights} />

                    <ExerciseProgressSection items={data.exerciseProgress} />

                    <SessionTypeProgressCard items={data.sessionTypeProgress} />
                </>
            )}

            <AppBrandFooter />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 14,
        paddingBottom: 32,
    },
    centerCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 18,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
});