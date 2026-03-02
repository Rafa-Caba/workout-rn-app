// src/features/daySummary/screens/DayTrainingSessionSleepDetailsScreen.tsx
import React from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import { MediaViewerModal } from "@/src/features/components/media/MediaViewerModal";

import { useWorkoutDay } from "@/src/hooks/workout/useWorkoutDay";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutExercise, WorkoutExerciseSet, WorkoutMediaItem, WorkoutSession } from "@/src/types/workoutDay.types";
import { minutesToHhMm, secondsToHhMm } from "@/src/utils/dashboard/format";

type Props = {
    date: string;
};

function isFiniteNumber(n: unknown): n is number {
    return typeof n === "number" && Number.isFinite(n);
}

function sumNullable(nums: Array<number | null | undefined>): number {
    let total = 0;
    for (const n of nums) {
        if (isFiniteNumber(n)) total += n;
    }
    return total;
}

function maxNullable(nums: Array<number | null | undefined>): number | null {
    let max: number | null = null;
    for (const n of nums) {
        if (!isFiniteNumber(n)) continue;
        if (max === null || n > max) max = n;
    }
    return max;
}

function countMedia(sessions: WorkoutSession[]): number {
    let count = 0;
    for (const s of sessions) {
        const media = s.media ?? null;
        if (Array.isArray(media)) count += media.length;
    }
    return count;
}

function safeTime(iso: string | null): string {
    if (!iso) return "—";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "—";
    try {
        return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(dt);
    } catch {
        const hh = String(dt.getHours()).padStart(2, "0");
        const mm = String(dt.getMinutes()).padStart(2, "0");
        return `${hh}:${mm}`;
    }
}

function safePace(secPerKm: number | null): string {
    if (!isFiniteNumber(secPerKm) || secPerKm <= 0) return "—";
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${String(s).padStart(2, "0")} /km`;
}

function safeNumber(v: number | null): string {
    if (!isFiniteNumber(v)) return "—";
    return String(v);
}

function safeDecimal(v: number | null, digits: number = 2): string {
    if (!isFiniteNumber(v)) return "—";
    return v.toFixed(digits);
}

function normalizeExercises(session: WorkoutSession): WorkoutExercise[] {
    return Array.isArray(session.exercises) ? session.exercises : [];
}

function normalizeSets(ex: WorkoutExercise): WorkoutExerciseSet[] {
    return Array.isArray(ex.sets) ? ex.sets : [];
}

function normalizeMedia(session: WorkoutSession): WorkoutMediaItem[] {
    return Array.isArray(session.media) ? session.media : [];
}

function toViewerItem(
    media: WorkoutMediaItem,
    ctx: {
        date: string;
        sessionType: string | null;
        sessionId: string;
    }
): MediaViewerItem {
    const title = media.resourceType === "image" ? "Imagen" : "Video";
    const subtitle = `${ctx.date} • ${ctx.sessionType ?? "Sesión"}`;

    return {
        url: media.url,
        resourceType: media.resourceType,
        title,
        subtitle,
        tags: null,
        notes: null,
        metaRows: [
            { label: "Formato", value: media.resourceType ? media.resourceType.toUpperCase() : "—" },
            { label: "Sesión", value: ctx.sessionType ?? "—" },
            { label: "Session ID", value: `${ctx.sessionId.slice(0, 4)}…${ctx.sessionId.slice(-4)}` },
        ],
    };
}

export function DayTrainingSessionSleepDetailsScreen({ date }: Props) {
    const { colors } = useTheme();
    const { data: day, isLoading, isError } = useWorkoutDay(date);

    const [viewerVisible, setViewerVisible] = React.useState(false);
    const [viewerItem, setViewerItem] = React.useState<MediaViewerItem | null>(null);

    const openViewer = React.useCallback((item: MediaViewerItem) => {
        setViewerItem(item);
        setViewerVisible(true);
    }, []);

    const closeViewer = React.useCallback(() => {
        setViewerVisible(false);
        setViewerItem(null);
    }, []);

    if (isLoading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator />
                <Text style={[styles.centerText, { color: colors.mutedText }]}>Cargando día...</Text>
            </View>
        );
    }

    if (isError) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Text style={[styles.centerText, { color: colors.mutedText }]}>No se pudo cargar el día.</Text>
            </View>
        );
    }

    if (!day) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Text style={[styles.centerText, { color: colors.mutedText }]}>No hay datos para este día.</Text>
            </View>
        );
    }

    const sessions: WorkoutSession[] = Array.isArray(day.training?.sessions) ? (day.training!.sessions as WorkoutSession[]) : [];
    const sessionsCount = sessions.length;
    const mediaCount = countMedia(sessions);

    const totalDurationSec = sumNullable(sessions.map((s) => s.durationSeconds));
    const totalActiveKcal = sumNullable(sessions.map((s) => s.activeKcal));
    const totalKcal = sumNullable(sessions.map((s) => s.totalKcal));

    const maxHr = maxNullable(sessions.map((s) => s.maxHr));
    const avgHrValues = sessions.map((s) => s.avgHr).filter((v): v is number => isFiniteNumber(v));
    const avgHr = avgHrValues.length ? Math.round(avgHrValues.reduce((a, b) => a + b, 0) / avgHrValues.length) : null;

    const totalSteps = sumNullable(sessions.map((s) => s.steps));
    const totalDistanceKm = sumNullable(sessions.map((s) => s.distanceKm));
    const totalElevation = sumNullable(sessions.map((s) => s.elevationGainM));

    const sleep = day.sleep;

    return (
        <View style={styles.container}>
            <MediaViewerModal visible={viewerVisible} item={viewerItem} onClose={closeViewer} />

            <View style={[styles.topRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={styles.topRowLeft}>
                    <Text style={[styles.topRowTitle, { color: colors.text }]}>📅 Fecha</Text>
                    <Text style={[styles.topRowValue, { color: colors.mutedText }]}>{day.date || "—"}</Text>
                </View>

                <View style={styles.pills}>
                    <Pill label={`🏋️ Sesiones: ${sessionsCount}`} colors={colors} />
                    <Pill label={`🖼️ Media: ${mediaCount}`} colors={colors} />
                </View>
            </View>

            <Section title="🛌 Sueño" colors={colors}>
                {!sleep ? (
                    <Text style={[styles.emptyText, { color: colors.mutedText }]}>Sin registro de sueño.</Text>
                ) : (
                    <TwoColGrid>
                        <RowItem label="🛌 Total dormido" value={minutesToHhMm(sleep.timeAsleepMinutes ?? 0)} colors={colors} />
                        <RowItem label="🏆 Sleep Score" value={sleep.score !== null ? String(sleep.score) : "—"} colors={colors} />

                        <RowItem label="🌙 REM" value={sleep.remMinutes !== null ? minutesToHhMm(sleep.remMinutes) : "—"} colors={colors} />
                        <RowItem label="🧠 Deep" value={sleep.deepMinutes !== null ? minutesToHhMm(sleep.deepMinutes) : "—"} colors={colors} />

                        <RowItem label="😴 Core" value={sleep.coreMinutes !== null ? minutesToHhMm(sleep.coreMinutes) : "—"} colors={colors} />
                        <RowItem label="👀 Despierto" value={sleep.awakeMinutes !== null ? minutesToHhMm(sleep.awakeMinutes) : "—"} colors={colors} />

                        <RowItem label="⌚ Fuente" value={sleep.source ?? "—"} colors={colors} />
                    </TwoColGrid>
                )}
            </Section>

            <Section title="🏋️ Sesiones" colors={colors}>
                {sessionsCount === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.mutedText }]}>Sin sesiones registradas.</Text>
                ) : (
                    <>
                        <View style={[styles.rollupCard, { borderColor: colors.border }]}>
                            <Text style={[styles.rollupTitle, { color: colors.text }]}>Totales del día</Text>
                            <TwoColGrid>
                                <RowItem label="⏱️ Duración" value={secondsToHhMm(totalDurationSec)} colors={colors} />
                                <RowItem label="🔥 Kcal activas" value={totalActiveKcal > 0 ? `${totalActiveKcal} kcal` : "—"} colors={colors} />

                                <RowItem label="🍽️ Kcal totales" value={totalKcal > 0 ? `${totalKcal} kcal` : "—"} colors={colors} />
                                <RowItem label="❤️ FC prom" value={avgHr !== null ? String(avgHr) : "—"} colors={colors} />

                                <RowItem label="⚡ FC máx" value={maxHr !== null ? String(maxHr) : "—"} colors={colors} />
                                <RowItem label="🚶 Pasos" value={totalSteps > 0 ? String(totalSteps) : "—"} colors={colors} />

                                <RowItem label="📏 Distancia" value={totalDistanceKm > 0 ? `${safeDecimal(totalDistanceKm, 2)} km` : "—"} colors={colors} />
                                <RowItem label="⛰️ Elevación" value={totalElevation > 0 ? `${String(totalElevation)} m` : "—"} colors={colors} />
                            </TwoColGrid>
                        </View>

                        {sessions.map((s, idx) => {
                            const exercises = normalizeExercises(s);
                            const setsCount = exercises.reduce((acc, ex) => acc + normalizeSets(ex).length, 0);
                            const media = normalizeMedia(s);

                            return (
                                <View
                                    key={s.id ?? String(idx)}
                                    style={[styles.sessionCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
                                >
                                    <View style={styles.sessionHeader}>
                                        <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>
                                            {`🏷️ ${s.type || "Sesión"}`}
                                        </Text>
                                        <Text style={[styles.sessionMeta, { color: colors.mutedText }]} numberOfLines={1}>
                                            {`ID: ${String(s.id).slice(0, 4)}…${String(s.id).slice(-4)}`}
                                        </Text>
                                    </View>

                                    <TwoColGrid>
                                        <RowItem label="🟢 Inicio" value={safeTime(s.startAt)} colors={colors} />
                                        <RowItem label="🔴 Fin" value={safeTime(s.endAt)} colors={colors} />

                                        <RowItem label="⏱️ Duración" value={s.durationSeconds ? secondsToHhMm(s.durationSeconds) : "—"} colors={colors} />
                                        <RowItem label="🎯 RPE" value={s.effortRpe !== null ? String(s.effortRpe) : "—"} colors={colors} />

                                        <RowItem label="🔥 Activas" value={s.activeKcal !== null ? `${s.activeKcal} kcal` : "—"} colors={colors} />
                                        <RowItem label="🍽️ Totales" value={s.totalKcal !== null ? `${s.totalKcal} kcal` : "—"} colors={colors} />

                                        <RowItem label="❤️ FC prom" value={s.avgHr !== null ? String(s.avgHr) : "—"} colors={colors} />
                                        <RowItem label="⚡ FC máx" value={s.maxHr !== null ? String(s.maxHr) : "—"} colors={colors} />

                                        <RowItem label="🚶 Pasos" value={s.steps !== null ? String(s.steps) : "—"} colors={colors} />
                                        <RowItem
                                            label="📏 Distancia"
                                            value={s.distanceKm !== null ? `${safeDecimal(s.distanceKm, 2)} km` : "—"}
                                            colors={colors}
                                        />

                                        <RowItem label="⛰️ Elevación" value={s.elevationGainM !== null ? `${s.elevationGainM} m` : "—"} colors={colors} />
                                        <RowItem label="⏱️ Ritmo" value={safePace(s.paceSecPerKm)} colors={colors} />

                                        <RowItem label="🎶 Cadencia" value={s.cadenceRpm !== null ? `${safeNumber(s.cadenceRpm)} rpm` : "—"} colors={colors} />
                                        <RowItem label="🖼️ Media" value={String(media.length)} colors={colors} />

                                        <RowItem label="🏋️ Ejercicios" value={String(exercises.length)} colors={colors} />
                                        <RowItem label="📦 Sets" value={String(setsCount)} colors={colors} />
                                    </TwoColGrid>

                                    <View style={[styles.noteBox, { borderColor: colors.border }]}>
                                        <Text style={[styles.noteLabel, { color: colors.mutedText }]}>📝 Nota</Text>
                                        <Text style={[styles.noteText, { color: colors.text }]} numberOfLines={6}>
                                            {s.notes ?? "—"}
                                        </Text>
                                    </View>

                                    <View style={[styles.exercisesBox, { borderColor: colors.border }]}>
                                        <Text style={[styles.exercisesTitle, { color: colors.text }]}>🏋️ Ejercicios</Text>

                                        {exercises.length === 0 ? (
                                            <Text style={[styles.emptyText, { color: colors.mutedText }]}>Sin ejercicios en esta sesión.</Text>
                                        ) : (
                                            <View style={styles.exercisesList}>
                                                {exercises.map((ex) => (
                                                    <ExerciseCard key={ex.id} ex={ex} colors={colors} />
                                                ))}
                                            </View>
                                        )}
                                    </View>

                                    <View style={[styles.mediaBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                                        <Text style={[styles.mediaTitle, { color: colors.text }]}>🖼️ Media</Text>

                                        {media.length === 0 ? (
                                            <Text style={[styles.emptyText, { color: colors.mutedText }]}>Sin media en esta sesión.</Text>
                                        ) : (
                                            <MediaGrid
                                                items={media}
                                                colors={colors}
                                                onPress={(m) =>
                                                    openViewer(
                                                        toViewerItem(m, {
                                                            date: day.date,
                                                            sessionType: s.type ?? null,
                                                            sessionId: s.id,
                                                        })
                                                    )
                                                }
                                            />
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </>
                )}
            </Section>
        </View>
    );
}

function MediaGrid(props: {
    items: WorkoutMediaItem[];
    colors: { border: string; surface: string; text: string; mutedText: string };
    onPress: (item: WorkoutMediaItem) => void;
}) {
    const { items, colors, onPress } = props;

    return (
        <View style={styles.mediaGrid}>
            {items.map((m) => (
                <Pressable
                    key={m.publicId}
                    onPress={() => onPress(m)}
                    style={[styles.mediaTile, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                    {m.resourceType === "image" ? (
                        <Image source={{ uri: m.url }} style={styles.mediaImage} resizeMode="cover" />
                    ) : (
                        <View style={styles.videoTile}>
                            <Text style={[styles.videoBadge, { color: colors.text }]}>🎬 Video</Text>
                            <Text style={[styles.videoHint, { color: colors.mutedText }]} numberOfLines={2}>
                                {m.format ? `.${m.format}` : "—"}
                            </Text>
                        </View>
                    )}

                    <View style={styles.mediaMetaRow}>
                        <Text style={[styles.mediaMetaText, { color: colors.mutedText }]} numberOfLines={1}>
                            {m.resourceType === "image" ? "🖼️ Image" : "🎬 Video"}
                        </Text>
                        <Text style={[styles.mediaMetaText, { color: colors.mutedText }]} numberOfLines={1}>
                            {m.format ? m.format.toUpperCase() : "—"}
                        </Text>
                    </View>
                </Pressable>
            ))}
        </View>
    );
}

function ExerciseCard(props: {
    ex: WorkoutExercise;
    colors: { border: string; surface: string; text: string; mutedText: string };
}) {
    const { ex, colors } = props;
    const sets = normalizeSets(ex);

    return (
        <View style={[styles.exerciseCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={styles.exerciseHeader}>
                <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
                    {`🏋️ ${ex.name}`}
                </Text>
                <Text style={[styles.exerciseMeta, { color: colors.mutedText }]} numberOfLines={1}>
                    {ex.movementName ? `🧩 ${ex.movementName}` : "—"}
                </Text>
            </View>

            <View style={[styles.exerciseNotesBox, { borderColor: colors.border }]}>
                <Text style={[styles.exerciseNotesLabel, { color: colors.mutedText }]}>📝 Notas</Text>
                <Text style={[styles.exerciseNotesText, { color: colors.text }]} numberOfLines={4}>
                    {ex.notes ?? "—"}
                </Text>
            </View>

            <View style={styles.setTable}>
                <View style={[styles.setHeaderRow, { borderColor: colors.border }]}>
                    <Text style={[styles.setHeaderCell, { color: colors.mutedText }]}>Set</Text>
                    <Text style={[styles.setHeaderCell, { color: colors.mutedText }]}>Reps</Text>
                    <Text style={[styles.setHeaderCell, { color: colors.mutedText }]}>Weight</Text>
                    <Text style={[styles.setHeaderCell, { color: colors.mutedText }]}>RPE</Text>
                    <Text style={[styles.setHeaderCell, { color: colors.mutedText }]}>Flags</Text>
                </View>

                {sets.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.mutedText }]}>Sin sets.</Text>
                ) : (
                    sets.map((st) => <SetRow key={`${ex.id}:${st.setIndex}`} set={st} colors={colors} />)
                )}
            </View>
        </View>
    );
}

function SetRow(props: {
    set: WorkoutExerciseSet;
    colors: { border: string; text: string; mutedText: string };
}) {
    const { set, colors } = props;

    const reps = set.reps !== null ? String(set.reps) : "—";
    const weight =
        set.weight !== null && isFiniteNumber(set.weight)
            ? `${String(set.weight)} ${set.unit}`
            : set.weight === 0
                ? `0 ${set.unit}`
                : "—";
    const rpe = set.rpe !== null ? String(set.rpe) : "—";

    const flags: string[] = [];
    if (set.isWarmup) flags.push("W");
    if (set.isDropSet) flags.push("D");

    const flagText = flags.length ? flags.join(",") : "—";

    return (
        <View style={[styles.setRow, { borderColor: colors.border }]}>
            <Text style={[styles.setCell, { color: colors.text }]}>{String(set.setIndex)}</Text>
            <Text style={[styles.setCell, { color: colors.text }]}>{reps}</Text>
            <Text style={[styles.setCell, { color: colors.text }]}>{weight}</Text>
            <Text style={[styles.setCell, { color: colors.text }]}>{rpe}</Text>
            <Text style={[styles.setCell, { color: colors.mutedText }]}>{flagText}</Text>
        </View>
    );
}

function Section(props: { title: string; colors: { text: string; surface: string; border: string }; children: React.ReactNode }) {
    const { title, colors, children } = props;

    return (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
            <View style={styles.sectionBody}>{children}</View>
        </View>
    );
}

function Pill(props: { label: string; colors: { border: string; mutedText: string; surface: string } }) {
    const { label, colors } = props;

    return (
        <View style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.pillText, { color: colors.mutedText }]} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

function TwoColGrid({ children }: { children: React.ReactNode }) {
    return <View style={styles.grid}>{children}</View>;
}

function RowItem(props: { label: string; value: string; colors: { mutedText: string; text: string; border: string } }) {
    const { label, value, colors } = props;

    return (
        <View style={[styles.rowItem, { borderColor: colors.border }]}>
            <Text style={[styles.rowLabel, { color: colors.mutedText }]} numberOfLines={1}>
                {label}
            </Text>
            <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>
                {value || "—"}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, gap: 12 },

    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
    centerText: { fontSize: 13, fontWeight: "600" },

    topRow: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    topRowLeft: { flex: 1 },
    topRowTitle: { fontSize: 12, fontWeight: "900" },
    topRowValue: { marginTop: 4, fontSize: 13, fontWeight: "700" },

    pills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    pillText: { fontSize: 12, fontWeight: "800" },

    section: { borderWidth: 1, borderRadius: 16, padding: 14 },
    sectionTitle: { fontSize: 16, fontWeight: "900" },
    sectionBody: { marginTop: 10, gap: 10 },

    emptyText: { fontSize: 13, fontWeight: "700" },

    rollupCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
    rollupTitle: { fontSize: 14, fontWeight: "900" },

    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    rowItem: {
        width: "48%",
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        justifyContent: "center",
    },
    rowLabel: { fontSize: 12, fontWeight: "900" },
    rowValue: { marginTop: 6, fontSize: 14, fontWeight: "900" },

    sessionCard: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
    sessionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 10 },
    sessionTitle: { fontSize: 14, fontWeight: "900", flex: 1 },
    sessionMeta: { fontSize: 12, fontWeight: "800" },

    noteBox: { borderWidth: 1, borderRadius: 14, padding: 12 },
    noteLabel: { fontSize: 12, fontWeight: "900" },
    noteText: { marginTop: 6, fontSize: 13, fontWeight: "700", lineHeight: 18 },

    exercisesBox: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
    exercisesTitle: { fontSize: 14, fontWeight: "900" },
    exercisesList: { gap: 10 },

    exerciseCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
    exerciseHeader: { gap: 4 },
    exerciseName: { fontSize: 14, fontWeight: "900" },
    exerciseMeta: { fontSize: 12, fontWeight: "800" },

    exerciseNotesBox: { borderWidth: 1, borderRadius: 12, padding: 10 },
    exerciseNotesLabel: { fontSize: 12, fontWeight: "900" },
    exerciseNotesText: { marginTop: 6, fontSize: 13, fontWeight: "700", lineHeight: 18 },

    setTable: { gap: 8 },
    setHeaderRow: { flexDirection: "row", borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
    setHeaderCell: { flex: 1, fontSize: 12, fontWeight: "900" },

    setRow: { flexDirection: "row", borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
    setCell: { flex: 1, fontSize: 12, fontWeight: "800" },

    mediaBox: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
    mediaTitle: { fontSize: 14, fontWeight: "900" },

    mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    mediaTile: { width: "48%", borderWidth: 1, borderRadius: 14, overflow: "hidden" },
    mediaImage: { width: "100%", height: 140 },
    mediaMetaRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8 },
    mediaMetaText: { fontSize: 12, fontWeight: "800" },

    videoTile: { height: 140, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10 },
    videoBadge: { fontSize: 14, fontWeight: "900" },
    videoHint: { fontSize: 12, fontWeight: "700", textAlign: "center" },
});