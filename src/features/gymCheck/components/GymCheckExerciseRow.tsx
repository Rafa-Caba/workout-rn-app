/**
 * GymCheckExerciseRow
 *
 * Renders:
 * - exercise header
 * - plan summary
 * - collapsible real sets section
 * - media preview area
 *
 * Important preserved behavior:
 * - the real sets section remains collapsed by default
 * - `onOpenRealSets` is only called when needed
 * - real sets can be edited while the exercise is still "Pendiente"
 *
 * Additional UX rule:
 * - when the exercise is "Hecho", the real sets remain visible/readable
 * - but add/remove/edit actions are locked until it returns to "Pendiente"
 */

import * as React from "react";
import { Image, Pressable, Text, View } from "react-native";

import { MediaViewerModal, type MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { WeightUnit, WorkoutExerciseSet } from "@/src/types/workoutDay.types";
import { GymCheckPerformedSetEditor } from "./GymCheckPerformedSetEditor";

export type MediaThumb = {
    publicId: string;
    url: string;
    resourceType: "image" | "video";
};

export type ExercisePlanInfo = {
    sets?: number | string | null;
    reps?: string | null;
    rpe?: number | string | null;
    load?: string | number | null;
    notes?: string | null;
};

type Props = {
    title: string;
    plan?: ExercisePlanInfo | null;

    done: boolean;
    busy?: boolean;

    media: MediaThumb[];
    performedSets: WorkoutExerciseSet[];

    unit: WeightUnit;

    onToggleDone: () => void;
    onUploadPress: () => void;
    onRemoveMediaAt: (index: number) => void;

    onOpenRealSets: () => void;
    onChangePerformedSet: (setIndex: number, patch: Partial<WorkoutExerciseSet>) => void;
    onAddPerformedSet: () => void;
    onRemovePerformedSet: (setIndex: number) => void;
};

function Row(props: { label: string; value: string }) {
    const { colors } = useTheme();

    return (
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <Text style={{ color: colors.mutedText, fontWeight: "800" }}>{props.label}</Text>
            <Text style={{ fontWeight: "900", color: colors.text }}>{props.value}</Text>
        </View>
    );
}

function normalizeValue(v: unknown): string {
    const s = String(v ?? "").trim();
    return s.length ? s : "—";
}

export function GymCheckExerciseRow({
    title,
    plan,
    done,
    busy = false,
    media,
    performedSets,
    unit,
    onToggleDone,
    onUploadPress,
    onRemoveMediaAt,
    onOpenRealSets,
    onChangePerformedSet,
    onAddPerformedSet,
    onRemovePerformedSet,
}: Props) {
    const { colors } = useTheme();

    const [viewer, setViewer] = React.useState<MediaViewerItem | null>(null);
    const [setsOpen, setSetsOpen] = React.useState<boolean>(() => false);

    const setsLocked = busy || done;

    return (
        <>
            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 14,
                    padding: 12,
                    gap: 12,
                    backgroundColor: colors.surface,
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                    }}
                >
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontWeight: "900", fontSize: 16, color: colors.text }}>
                            {title}
                        </Text>
                        {String(plan?.notes ?? "").trim() ? (
                            <Text style={{ color: colors.mutedText }}>
                                {String(plan?.notes ?? "")}
                            </Text>
                        ) : null}
                    </View>

                    <Pressable
                        onPress={busy ? undefined : onToggleDone}
                        style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 999,
                            backgroundColor: done ? `${colors.primary}22` : colors.background,
                            borderWidth: 1,
                            borderColor: done ? `${colors.primary}55` : colors.border,
                            opacity: busy ? 0.6 : 1,
                        }}
                    >
                        <Text style={{ fontWeight: "900", color: done ? colors.primary : colors.text }}>
                            {done ? "Hecho" : "Pendiente"}
                        </Text>
                    </Pressable>
                </View>

                <View
                    style={{
                        gap: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        padding: 12,
                        backgroundColor: colors.background,
                    }}
                >
                    <Row label="Series" value={normalizeValue(plan?.sets)} />
                    <Row label="Reps" value={normalizeValue(plan?.reps)} />
                    <Row label="RPE" value={normalizeValue(plan?.rpe)} />
                    <Row label="Carga" value={normalizeValue(plan?.load)} />
                </View>

                <View
                    style={{
                        gap: 10,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        padding: 12,
                        backgroundColor: colors.background,
                        opacity: done ? 0.9 : 1,
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                        }}
                    >
                        <Pressable
                            onPress={() => {
                                const next = !setsOpen;
                                setSetsOpen(next);

                                if (next && performedSets.length === 0) {
                                    onOpenRealSets();
                                }
                            }}
                            style={{ flex: 1 }}
                        >
                            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 15 }}>
                                {setsOpen ? "▼" : "▶"} Sets reales
                            </Text>

                            <Text style={{ color: colors.mutedText, marginTop: 4 }}>
                                {performedSets.length > 0
                                    ? `${performedSets.length} set(s)`
                                    : "Puedes capturarlos aunque el ejercicio siga en Pendiente"}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={
                                setsLocked
                                    ? undefined
                                    : () => {
                                        if (!setsOpen) {
                                            setSetsOpen(true);
                                        }
                                        if (performedSets.length === 0) {
                                            onOpenRealSets();
                                        }
                                        onAddPerformedSet();
                                    }
                            }
                            disabled={setsLocked}
                            style={{
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                                opacity: setsLocked ? 0.5 : 1,
                            }}
                        >
                            <Text style={{ color: colors.text, fontWeight: "900" }}>+ Set</Text>
                        </Pressable>
                    </View>

                    {setsOpen ? (
                        <View style={{ gap: 10 }}>
                            {performedSets.length === 0 ? (
                                <Text style={{ color: colors.mutedText, fontStyle: "italic" }}>
                                    Sin sets reales aún. Puedes usar “+ Set” para empezar.
                                </Text>
                            ) : (
                                <>
                                    {done ? (
                                        <Text style={{ color: colors.mutedText }}>
                                            Este ejercicio está marcado como Hecho. Para editar los sets, cámbialo a Pendiente.
                                        </Text>
                                    ) : null}

                                    {performedSets.map((set, index) => (
                                        <GymCheckPerformedSetEditor
                                            key={`set-${set.setIndex}-${index}`}
                                            index={index}
                                            set={set}
                                            unit={unit}
                                            busy={setsLocked}
                                            canRemove={performedSets.length > 1}
                                            onCommit={(patch) => onChangePerformedSet(index, patch)}
                                            onRemove={() => onRemovePerformedSet(index)}
                                        />
                                    ))}
                                </>
                            )}
                        </View>
                    ) : null}
                </View>

                <Pressable
                    onPress={busy ? undefined : onUploadPress}
                    style={{
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        opacity: busy ? 0.6 : 1,
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "900", textAlign: "center" }}>
                        Subir media
                    </Text>
                </Pressable>

                <View style={{ gap: 8 }}>
                    {media.length === 0 ? (
                        <Text style={{ color: colors.mutedText, fontStyle: "italic" }}>
                            Sin media aún. Puedes subir foto/video si quieres.
                        </Text>
                    ) : (
                        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                            {media.map((m, idx) => {
                                const isVideo = m.resourceType === "video";
                                const url = String(m.url ?? "").trim();

                                return (
                                    <View key={`${m.publicId}:${m.url}`} style={{ position: "relative" }}>
                                        <Pressable
                                            onPress={() => {
                                                if (!url) return;

                                                setViewer({
                                                    url,
                                                    resourceType: isVideo ? "video" : "image",
                                                    title: "Media",
                                                    subtitle: title,
                                                    metaRows: [
                                                        {
                                                            label: "Tipo",
                                                            value: isVideo ? "Video" : "Imagen",
                                                        },
                                                    ],
                                                });
                                            }}
                                            style={{
                                                height: 72,
                                                width: 72,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                overflow: "hidden",
                                                backgroundColor: colors.background,
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            {!isVideo ? (
                                                <Image
                                                    key={`${m.publicId}:${m.url}`}
                                                    source={{ uri: url }}
                                                    style={{ height: "100%", width: "100%" }}
                                                    resizeMode="cover"
                                                    fadeDuration={0}
                                                />
                                            ) : (
                                                <Text style={{ fontWeight: "900", color: colors.mutedText }}>
                                                    VIDEO
                                                </Text>
                                            )}
                                        </Pressable>

                                        <Pressable
                                            onPress={busy ? undefined : () => onRemoveMediaAt(idx)}
                                            style={{
                                                position: "absolute",
                                                top: -8,
                                                right: -8,
                                                height: 26,
                                                width: 26,
                                                borderRadius: 999,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                backgroundColor: colors.surface,
                                                alignItems: "center",
                                                justifyContent: "center",
                                                opacity: busy ? 0.6 : 1,
                                            }}
                                        >
                                            <Text style={{ fontWeight: "900", color: colors.text }}>✕</Text>
                                        </Pressable>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </View>

            <MediaViewerModal visible={!!viewer} item={viewer} onClose={() => setViewer(null)} />
        </>
    );
}