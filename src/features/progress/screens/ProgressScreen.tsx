// src/features/progress/screens/ProgressScreen.tsx
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppBrandFooter } from "@/src/features/components/branding/AppBrandFooter";
import { useBodyProgress } from "@/src/hooks/bodyMetrics/useBodyProgress";
import { useWorkoutProgress } from "@/src/hooks/summary/useWorkoutProgress";
import { useTheme } from "@/src/theme/ThemeProvider";
import type {
    WorkoutProgressCompareTo,
    WorkoutProgressMode,
} from "@/src/types/workoutProgress.types";

import { BodyProgressHighlightsCard } from "../components/BodyProgressHighlightsCard";
import { BodyProgressMetricsCard } from "../components/BodyProgressMetricsCard";
import { ExerciseProgressSection } from "../components/ExerciseProgressSection";
import { ProgressCustomRangeModal } from "../components/ProgressCustomRangeModal";
import { ProgressExerciseTableCard } from "../components/ProgressExerciseTableCard";
import { ProgressHeroCard } from "../components/ProgressHeroCard";
import { ProgressHighlightsCard } from "../components/ProgressHighlightsCard";
import { ProgressMetricsSection } from "../components/ProgressMetricsSection";
import { ProgressPeriodSelector } from "../components/ProgressPeriodSelector";
import { SessionTypeProgressCard } from "../components/SessionTypeProgressCard";
import { TopExerciseHighlightsCard } from "../components/TopExerciseHighlightsCard";

export function ProgressScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const [mode, setMode] = React.useState<WorkoutProgressMode>("last30");
    const [compareTo, setCompareTo] =
        React.useState<WorkoutProgressCompareTo>("previous_period");

    const [customRangeVisible, setCustomRangeVisible] = React.useState(false);

    const [draftFrom, setDraftFrom] = React.useState<string | null>(null);
    const [draftTo, setDraftTo] = React.useState<string | null>(null);

    const [appliedFrom, setAppliedFrom] = React.useState<string | undefined>(undefined);
    const [appliedTo, setAppliedTo] = React.useState<string | undefined>(undefined);

    const progressQuery = useWorkoutProgress({
        mode,
        compareTo,
        from: mode === "customRange" ? appliedFrom : undefined,
        to: mode === "customRange" ? appliedTo : undefined,
        includeExerciseProgress: true,
    });

    const bodyProgressQuery = useBodyProgress({
        mode,
        compareTo,
        from: mode === "customRange" ? appliedFrom : undefined,
        to: mode === "customRange" ? appliedTo : undefined,
    });

    const data = progressQuery.data ?? null;
    const bodyData = bodyProgressQuery.data ?? null;

    const onRefresh = React.useCallback(() => {
        void Promise.all([progressQuery.refetch(), bodyProgressQuery.refetch()]);
    }, [bodyProgressQuery, progressQuery]);

    const customRangeLabel = React.useMemo(() => {
        if (mode !== "customRange" || !appliedFrom || !appliedTo) {
            return null;
        }

        return `${appliedFrom} → ${appliedTo}`;
    }, [mode, appliedFrom, appliedTo]);

    const handleChangeMode = React.useCallback((nextMode: WorkoutProgressMode) => {
        setMode(nextMode);

        if (nextMode === "customRange") {
            setCustomRangeVisible(true);
        }
    }, []);

    const handleOpenCustomRange = React.useCallback(() => {
        setCustomRangeVisible(true);
    }, []);

    const handleApplyCustomRange = React.useCallback(() => {
        if (!draftFrom || !draftTo || draftFrom > draftTo) {
            return;
        }

        setAppliedFrom(draftFrom);
        setAppliedTo(draftTo);
        setMode("customRange");
        setCustomRangeVisible(false);
    }, [draftFrom, draftTo]);

    return (
        <>
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                contentContainerStyle={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={progressQuery.isRefetching || bodyProgressQuery.isRefetching}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
                        Progreso
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Compara entrenamiento, sueño, adherencia, mejoras por ejercicio y evolución corporal.
                    </Text>
                </View>

                <ProgressPeriodSelector
                    mode={mode}
                    compareTo={compareTo}
                    customRangeLabel={customRangeLabel}
                    onChangeMode={handleChangeMode}
                    onChangeCompareTo={setCompareTo}
                    onOpenCustomRange={handleOpenCustomRange}
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
                        <Text style={{ color: colors.text, fontWeight: "800" }}>
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

                        <View style={{ gap: 10 }}>
                            <BodyProgressMetricsCard
                                title="Composición corporal"
                                subtitle="Peso, grasa corporal y cintura comparados contra el periodo previo"
                                metrics={bodyData?.metrics ?? []}
                            />

                            {bodyData?.highlights?.length ? (
                                <BodyProgressHighlightsCard
                                    title="Highlights corporales"
                                    items={bodyData.highlights}
                                />
                            ) : null}

                            <Pressable
                                onPress={() => router.push("/(app)/me/body-metrics")}
                                style={({ pressed }) => ({
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: pressed ? colors.background : colors.surface,
                                    alignItems: "center",
                                    opacity: pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ fontWeight: "800", color: colors.text }}>
                                    Ver historial corporal
                                </Text>
                            </Pressable>
                        </View>

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

            <ProgressCustomRangeModal
                visible={customRangeVisible}
                from={draftFrom}
                to={draftTo}
                onChangeFrom={setDraftFrom}
                onChangeTo={setDraftTo}
                onApply={handleApplyCustomRange}
                onClose={() => setCustomRangeVisible(false)}
            />
        </>
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