// src/features/calendar/screens/CalendarMonthScreen.tsx

/**
 * Real monthly WorkoutDay calendar.
 *
 * Shows the same daily indicators as the web version:
 * - training
 * - sleep
 * - up to three typed note icons plus an overflow counter
 *
 * It also owns the add-note flow, note viewer, loading/error states,
 * pull-to-refresh, and the secondary actions bottom sheet.
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
    addDays,
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    parseISO,
    startOfMonth,
    startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useCreateDayNote, useDeleteDayNote, useUpdateDayNote } from "@/src/hooks/workout/useDayNotes";
import { useWorkoutCalendar } from "@/src/hooks/workout/useWorkoutCalendar";
import type { GetWorkoutCalendarArgs } from "@/src/services/workout/calendar.service";
import { useSettingsStore } from "@/src/store/settings.store";
import { useTheme } from "@/src/theme/ThemeProvider";
import type {
    CalendarDayFull,
    WorkoutDayNote,
    WorkoutDayNoteDraft,
} from "@/src/types/workoutDay.types";
import { getDayNoteTypeOption } from "@/src/utils/dayNotes";
import { toastError, toastSuccess } from "@/src/utils/toast";

import { CalendarActionsSheet } from "../components/CalendarActionsSheet";
import { CalendarNoteFormModal } from "../components/CalendarNoteFormModal";
import { CalendarNoteViewerModal } from "../components/CalendarNoteViewerModal";
import { WorkoutExportModal } from "../components/WorkoutExportModal";

type NoteContext = {
    date: string;
    note: WorkoutDayNote;
};

type NoteFormContext = {
    date: string;
    note: WorkoutDayNote | null;
};

type CalendarCellProps = {
    calendarDate: Date;
    day: CalendarDayFull | undefined;
    currentMonth: boolean;
    today: boolean;
    selected: boolean;
    onOpenDay: () => void;
    onOpenNote: (note: WorkoutDayNote) => void;
};

function capitalize(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function todayIso(): string {
    return format(new Date(), "yyyy-MM-dd");
}

function hasSleep(day: CalendarDayFull | undefined): boolean {
    return Boolean(day?.hasSleep || day?.sleep || day?.sleepSummary);
}

function hasTraining(day: CalendarDayFull | undefined): boolean {
    if (day?.hasTraining) return true;
    if ((day?.training?.sessions?.length ?? 0) > 0) return true;
    return (day?.trainingSummary?.sessionsCount ?? 0) > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) return error.message.trim();
    if (!isRecord(error)) return fallback;

    const response = error.response;
    if (!isRecord(response)) return fallback;

    const data = response.data;
    if (!isRecord(data)) return fallback;

    const errorBody = data.error;
    if (!isRecord(errorBody)) return fallback;

    return typeof errorBody.message === "string" && errorBody.message.trim()
        ? errorBody.message.trim()
        : fallback;
}

function CalendarCell({
    calendarDate,
    day,
    currentMonth,
    today,
    selected,
    onOpenDay,
    onOpenNote,
}: CalendarCellProps) {
    const { colors } = useTheme();
    const notes = day?.dayNotes ?? [];
    const visibleNotes = notes.slice(0, 3);

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${format(calendarDate, "d 'de' MMMM 'de' yyyy", { locale: es })}`}
            onPress={onOpenDay}
            style={({ pressed }) => [
                styles.dayCell,
                {
                    borderRightColor: colors.border,
                    borderBottomColor: colors.border,
                    backgroundColor: selected ? colors.card : colors.surface,
                    opacity: currentMonth ? (pressed ? 0.76 : 1) : pressed ? 0.34 : 0.44,
                },
                today
                    ? {
                        borderWidth: 2,
                        borderColor: colors.primary,
                        marginLeft: -1,
                        marginTop: -1,
                    }
                    : null,
            ]}
        >
            <Text
                style={[
                    styles.dayNumber,
                    {
                        color: today || selected ? colors.primary : colors.text,
                    },
                ]}
            >
                {format(calendarDate, "d")}
            </Text>

            <View style={styles.primaryIndicators}>
                {hasTraining(day) ? (
                    <Text accessibilityLabel="Entrenamiento" style={styles.primaryIndicator}>🏋️</Text>
                ) : null}
                {hasSleep(day) ? (
                    <Text accessibilityLabel="Sueño" style={styles.primaryIndicator}>😴</Text>
                ) : null}
            </View>

            <View style={styles.noteIndicators}>
                {visibleNotes.map((note) => {
                    const option = getDayNoteTypeOption(note.type);

                    return (
                        <Pressable
                            key={note.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Abrir nota: ${note.title}`}
                            hitSlop={8}
                            onPress={(event) => {
                                event.stopPropagation();
                                onOpenNote(note);
                            }}
                            style={({ pressed }) => [
                                styles.noteIndicatorButton,
                                { opacity: pressed ? 0.5 : 1 },
                            ]}
                        >
                            <Text style={styles.noteIndicator}>{option.emoji}</Text>
                        </Pressable>
                    );
                })}

                {notes.length > 3 ? (
                    <Text style={[styles.noteOverflow, { color: colors.mutedText }]}>+{notes.length - 3}</Text>
                ) : null}
            </View>
        </Pressable>
    );
}

export function CalendarMonthScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const weekStartsOn = useSettingsStore((state) => state.settings.weekStartsOn);

    const initialDate = React.useMemo(() => todayIso(), []);
    const today = React.useMemo(() => new Date(), []);

    const [visibleMonth, setVisibleMonth] = React.useState<Date>(() =>
        startOfMonth(today)
    );
    const [selectedDate, setSelectedDate] = React.useState<string>(initialDate);
    const [actionsVisible, setActionsVisible] = React.useState(false);
    const [exportVisible, setExportVisible] = React.useState(false);
    const [noteForm, setNoteForm] = React.useState<NoteFormContext | null>(null);
    const [openNote, setOpenNote] = React.useState<NoteContext | null>(null);

    const calendarStart = React.useMemo(
        () =>
            startOfWeek(startOfMonth(visibleMonth), {
                weekStartsOn,
            }),
        [visibleMonth, weekStartsOn]
    );
    const calendarEnd = React.useMemo(
        () =>
            endOfWeek(endOfMonth(visibleMonth), {
                weekStartsOn,
            }),
        [visibleMonth, weekStartsOn]
    );
    const calendarDates = React.useMemo(
        () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
        [calendarEnd, calendarStart]
    );
    const weekDayDates = React.useMemo(
        () => Array.from({ length: 7 }, (_, index) => addDays(calendarStart, index)),
        [calendarStart]
    );

    const calendarArgs = React.useMemo<GetWorkoutCalendarArgs>(
        () => ({
            from: format(calendarStart, "yyyy-MM-dd"),
            to: format(calendarEnd, "yyyy-MM-dd"),
            fields: [
                "date",
                "weekKey",
                "hasSleep",
                "hasTraining",
                "sleepSummary",
                "trainingSummary",
                "dayNotes",
            ],
            fillMissingDays: true,
            includeRollups: false,
            includeSleep: true,
            includeTraining: true,
            includeSummaries: true,
            includeTotals: false,
            includeTypes: false,
            includeRaw: false,
        }),
        [calendarEnd, calendarStart]
    );

    const calendarQuery = useWorkoutCalendar(calendarArgs);
    const createNote = useCreateDayNote();
    const updateNote = useUpdateDayNote();
    const deleteNote = useDeleteDayNote();

    const savingNote = createNote.isPending || updateNote.isPending;

    const dayByDate = React.useMemo(() => {
        const map = new Map<string, CalendarDayFull>();

        for (const day of calendarQuery.data?.days ?? []) {
            if (day.date) map.set(day.date, day);
        }

        return map;
    }, [calendarQuery.data?.days]);

    useFocusEffect(
        React.useCallback(() => {
            void calendarQuery.refetch();
        }, [calendarQuery.refetch])
    );

    React.useEffect(() => {
        if (!calendarQuery.isError) return;

        toastError(
            "No se pudo cargar el calendario",
            readErrorMessage(calendarQuery.error, "Revisa tu conexión e inténtalo de nuevo.")
        );
    }, [calendarQuery.error, calendarQuery.isError]);

    function openDay(dateIso: string): void {
        setSelectedDate(dateIso);
        router.push({
            pathname: "/(app)/calendar/day/[date]",
            params: { date: dateIso },
        });
    }

    function openNoteViewer(date: string, note: WorkoutDayNote): void {
        setSelectedDate(date);
        setOpenNote({ date, note });
    }

    function openCreateNote(): void {
        setNoteForm({ date: selectedDate, note: null });
    }

    function openEditNote(): void {
        if (!openNote) return;

        setNoteForm({ date: openNote.date, note: openNote.note });
        setOpenNote(null);
    }

    async function saveNote(args: {
        date: string;
        draft: WorkoutDayNoteDraft;
    }): Promise<void> {
        try {
            if (noteForm?.note) {
                await updateNote.mutateAsync({
                    date: noteForm.date,
                    noteId: noteForm.note.id,
                    draft: args.draft,
                });
            } else {
                await createNote.mutateAsync(args);
            }

            setSelectedDate(args.date);
            setVisibleMonth(startOfMonth(parseISO(args.date)));
            setNoteForm(null);

            toastSuccess(
                noteForm?.note ? "Nota actualizada" : "Nota guardada",
                `Calendario actualizado para ${args.date}.`
            );
        } catch (error: unknown) {
            toastError(
                noteForm?.note ? "No se pudo actualizar" : "No se pudo guardar",
                readErrorMessage(error, "Inténtalo nuevamente.")
            );
        }
    }

    async function removeNote(): Promise<void> {
        if (!openNote) return;

        try {
            await deleteNote.mutateAsync({
                date: openNote.date,
                noteId: openNote.note.id,
            });

            setOpenNote(null);
            toastSuccess("Nota eliminada", "El resto de los datos del día se conservó.");
        } catch (error: unknown) {
            toastError(
                "No se pudo eliminar",
                readErrorMessage(error, "Inténtalo nuevamente.")
            );
        }
    }

    function openCardio(): void {
        router.push({
            pathname: "/(app)/calendar/cardio/[date]",
            params: { date: selectedDate },
        });
    }

    return (
        <>
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                contentContainerStyle={styles.pageContent}
                refreshControl={
                    <RefreshControl
                        refreshing={calendarQuery.isRefetching && !calendarQuery.isLoading}
                        onRefresh={() => {
                            void calendarQuery.refetch();
                        }}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={styles.heroRow}>
                    <View style={styles.heroText}>
                        <Text style={[styles.pageTitle, { color: colors.text }]}>Calendario</Text>
                        <Text style={[styles.pageSubtitle, { color: colors.mutedText }]}>Sueño, entrenamiento y notas sincronizados.</Text>
                    </View>

                    <View style={styles.heroActions}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Agregar nota"
                            accessibilityState={{ disabled: savingNote || deleteNote.isPending }}
                            onPress={openCreateNote}
                            disabled={savingNote || deleteNote.isPending}
                            style={({ pressed }) => [
                                styles.headerButton,
                                {
                                    borderColor: colors.primary,
                                    backgroundColor: colors.primary,
                                    opacity:
                                        pressed || savingNote || deleteNote.isPending
                                            ? 0.68
                                            : 1,
                                },
                            ]}
                        >
                            <Ionicons name="add" size={18} color={colors.primaryText} />
                            <Text style={[styles.headerButtonText, { color: colors.primaryText }]}>Agregar nota</Text>
                        </Pressable>

                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Abrir acciones del calendario"
                            onPress={() => setActionsVisible(true)}
                            style={({ pressed }) => [
                                styles.headerButton,
                                {
                                    borderColor: colors.border,
                                    backgroundColor: colors.surface,
                                    opacity: pressed ? 0.72 : 1,
                                },
                            ]}
                        >
                            <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
                            <Text style={[styles.headerButtonText, { color: colors.text }]}>Acciones</Text>
                        </Pressable>
                    </View>
                </View>

                <View
                    style={[
                        styles.calendarCard,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <View style={styles.monthHeader}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Mes anterior"
                            onPress={() => setVisibleMonth((current) => addMonths(current, -1))}
                            style={({ pressed }) => [
                                styles.monthButton,
                                {
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    opacity: pressed ? 0.7 : 1,
                                },
                            ]}
                        >
                            <Ionicons name="chevron-back" size={21} color={colors.text} />
                        </Pressable>

                        <View style={styles.monthTitleGroup}>
                            <Text style={[styles.monthTitle, { color: colors.text }]}>{capitalize(format(visibleMonth, "MMMM yyyy", { locale: es }))}</Text>
                            <View style={styles.monthStatusRow}>
                                {calendarQuery.isFetching ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : null}
                                <Text style={[styles.monthSubtitle, { color: colors.mutedText }]}>{calendarQuery.isFetching ? "Actualizando calendario..." : "Toca un día para abrir su detalle."}</Text>
                            </View>
                        </View>

                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Mes siguiente"
                            onPress={() => setVisibleMonth((current) => addMonths(current, 1))}
                            style={({ pressed }) => [
                                styles.monthButton,
                                {
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    opacity: pressed ? 0.7 : 1,
                                },
                            ]}
                        >
                            <Ionicons name="chevron-forward" size={21} color={colors.text} />
                        </Pressable>
                    </View>

                    {calendarQuery.isLoading ? (
                        <View style={styles.stateBox}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={[styles.stateTitle, { color: colors.text }]}>Cargando calendario</Text>
                            <Text style={[styles.stateDescription, { color: colors.mutedText }]}>Consultando sueño, entrenamiento y notas del mes.</Text>
                        </View>
                    ) : calendarQuery.isError ? (
                        <View style={styles.stateBox}>
                            <Ionicons name="cloud-offline-outline" size={34} color={colors.danger} />
                            <Text style={[styles.stateTitle, { color: colors.text }]}>No se pudo cargar</Text>
                            <Text style={[styles.stateDescription, { color: colors.mutedText }]}>{readErrorMessage(calendarQuery.error, "Revisa tu conexión e inténtalo de nuevo.")}</Text>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Reintentar carga del calendario"
                                onPress={() => {
                                    void calendarQuery.refetch();
                                }}
                                style={({ pressed }) => [
                                    styles.retryButton,
                                    {
                                        backgroundColor: colors.primary,
                                        opacity: pressed ? 0.72 : 1,
                                    },
                                ]}
                            >
                                <Text style={[styles.retryText, { color: colors.primaryText }]}>Reintentar</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <>
                            <View
                                style={[
                                    styles.weekHeader,
                                    {
                                        borderTopColor: colors.border,
                                        borderLeftColor: colors.border,
                                    },
                                ]}
                            >
                                {weekDayDates.map((date) => (
                                    <View
                                        key={format(date, "yyyy-MM-dd")}
                                        style={[
                                            styles.weekDay,
                                            {
                                                borderRightColor: colors.border,
                                                borderBottomColor: colors.border,
                                                backgroundColor: colors.background,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.weekDayText, { color: colors.mutedText }]}>{capitalize(format(date, "EEE", { locale: es }))}</Text>
                                    </View>
                                ))}
                            </View>

                            <View
                                style={[
                                    styles.calendarGrid,
                                    {
                                        borderLeftColor: colors.border,
                                    },
                                ]}
                            >
                                {calendarDates.map((calendarDate) => {
                                    const dateIso = format(calendarDate, "yyyy-MM-dd");
                                    const day = dayByDate.get(dateIso);

                                    return (
                                        <CalendarCell
                                            key={dateIso}
                                            calendarDate={calendarDate}
                                            day={day}
                                            currentMonth={isSameMonth(calendarDate, visibleMonth)}
                                            today={isSameDay(calendarDate, today)}
                                            selected={selectedDate === dateIso}
                                            onOpenDay={() => openDay(dateIso)}
                                            onOpenNote={(note) => openNoteViewer(dateIso, note)}
                                        />
                                    );
                                })}
                            </View>
                        </>
                    )}
                </View>

                <View
                    style={[
                        styles.legend,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <Text style={[styles.legendTitle, { color: colors.text }]}>Indicadores</Text>
                    <View style={styles.legendItems}>
                        <Text style={[styles.legendItem, { color: colors.mutedText }]}>🏋️ Entrenamiento</Text>
                        <Text style={[styles.legendItem, { color: colors.mutedText }]}>😴 Sueño</Text>
                        <Text style={[styles.legendItem, { color: colors.mutedText }]}>🎁 📅 🔔 🩺 📝 📌 Notas</Text>
                    </View>
                </View>
            </ScrollView>

            <CalendarActionsSheet
                visible={actionsVisible}
                selectedDate={selectedDate}
                onClose={() => setActionsVisible(false)}
                onOpenCardio={openCardio}
                onOpenRoutines={() => router.push("/(app)/calendar/routines")}
                onOpenGymCheck={() => router.push("/(app)/calendar/gym-check")}
                onOpenHealthBackfill={() =>
                    router.push("/(app)/calendar/health-backfill")
                }
                onOpenExport={() => setExportVisible(true)}
            />

            <WorkoutExportModal
                visible={exportVisible}
                initialDate={selectedDate}
                onClose={() => setExportVisible(false)}
            />

            <CalendarNoteFormModal
                visible={noteForm !== null}
                initialDate={noteForm?.date ?? selectedDate}
                initialNote={noteForm?.note ?? null}
                saving={savingNote}
                onClose={() => {
                    if (!savingNote) setNoteForm(null);
                }}
                onSave={saveNote}
            />

            <CalendarNoteViewerModal
                visible={openNote !== null}
                date={openNote?.date ?? null}
                note={openNote?.note ?? null}
                deleting={deleteNote.isPending}
                onClose={() => {
                    if (!deleteNote.isPending) setOpenNote(null);
                }}
                onEdit={openEditNote}
                onDelete={removeNote}
            />
        </>
    );
}

const styles = StyleSheet.create({
    pageContent: { padding: 14, gap: 14, paddingBottom: 34 },
    heroRow: {
        gap: 10,
    },
    heroText: { flex: 1, gap: 3 },
    pageTitle: { fontSize: 23, fontWeight: "900" },
    pageSubtitle: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
    heroActions: {
        flexDirection: "row",
        gap: 8,
    },
    headerButton: {
        flex: 1,
        minHeight: 44,
        borderWidth: 1,
        borderRadius: 13,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
    },
    headerButtonText: { fontSize: 12, fontWeight: "900" },
    calendarCard: {
        borderWidth: 1,
        borderRadius: 18,
        overflow: "hidden",
    },
    monthHeader: {
        paddingHorizontal: 11,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 9,
    },
    monthButton: {
        width: 44,
        height: 44,
        borderRadius: 13,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    monthTitleGroup: { flex: 1, alignItems: "center", gap: 3 },
    monthTitle: { fontSize: 17, fontWeight: "900", textAlign: "center" },
    monthStatusRow: {
        minHeight: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
    },
    monthSubtitle: { fontSize: 10, fontWeight: "700", textAlign: "center" },
    stateBox: {
        minHeight: 360,
        paddingHorizontal: 24,
        paddingVertical: 44,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    stateTitle: { fontSize: 18, fontWeight: "900", textAlign: "center" },
    stateDescription: { fontSize: 13, lineHeight: 19, fontWeight: "600", textAlign: "center" },
    retryButton: {
        minHeight: 44,
        marginTop: 4,
        borderRadius: 13,
        paddingHorizontal: 18,
        paddingVertical: 11,
    },
    retryText: { fontSize: 13, fontWeight: "900" },
    weekHeader: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderLeftWidth: 1,
    },
    weekDay: {
        flex: 1,
        minWidth: 0,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        paddingVertical: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    weekDayText: { fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
    calendarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        borderLeftWidth: 1,
    },
    dayCell: {
        width: "14.285714%",
        minWidth: 0,
        minHeight: 88,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        paddingHorizontal: 3,
        paddingVertical: 5,
        alignItems: "center",
        gap: 3,
    },
    dayNumber: { alignSelf: "flex-start", fontSize: 13, fontWeight: "900" },
    primaryIndicators: {
        minHeight: 22,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
    },
    primaryIndicator: { fontSize: 14 },
    noteIndicators: {
        minHeight: 23,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 0,
    },
    noteIndicatorButton: {
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
    },
    noteIndicator: { fontSize: 12 },
    noteOverflow: { fontSize: 9, fontWeight: "900" },
    legend: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        gap: 8,
    },
    legendTitle: { fontSize: 14, fontWeight: "900" },
    legendItems: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    legendItem: { fontSize: 11, fontWeight: "700" },
});
