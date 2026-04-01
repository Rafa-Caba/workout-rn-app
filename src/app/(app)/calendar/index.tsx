// src/app/(app)/calendar/index.tsx

import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
} from "date-fns";

import { useTheme } from "@/src/theme/ThemeProvider";
import { weekKeyFromIso } from "@/src/utils/dashboard/date";
import { toastSuccess } from "@/src/utils/toast";

type ISODate = `${number}-${string}-${string}`;

function todayIsoLocal(): ISODate {
    return format(new Date(), "yyyy-MM-dd") as ISODate;
}

function ActionButton(props: {
    title: string;
    subtitle?: string;
    onPress: () => void;
    colors: ReturnType<typeof useTheme>["colors"];
}) {
    const { colors } = props;

    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.82 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
            })}
        >
            <Text style={{ fontWeight: "800", color: colors.text }}>{props.title}</Text>

            {props.subtitle ? (
                <Text style={{ color: colors.mutedText, marginTop: 2 }}>{props.subtitle}</Text>
            ) : null}
        </Pressable>
    );
}

function DayCell(props: {
    label: string;
    iso?: ISODate;
    isToday?: boolean;
    muted?: boolean;
    onPress?: () => void;
    colors: ReturnType<typeof useTheme>["colors"];
}) {
    const { label, iso, isToday, muted, onPress, colors } = props;

    return (
        <Pressable
            onPress={iso ? onPress : undefined}
            style={({ pressed }) => ({
                width: "14.2857%",
                padding: 6,
                opacity: pressed ? 0.82 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
        >
            <View
                style={{
                    height: 48,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isToday ? colors.primary : colors.border,
                    backgroundColor: isToday ? colors.primary : colors.surface,
                    opacity: muted ? 0.45 : 1,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Text
                    style={{
                        fontWeight: "800",
                        color: isToday ? colors.primaryText : colors.text,
                    }}
                >
                    {label}
                </Text>

                {iso ? (
                    <Text
                        style={{
                            fontSize: 10,
                            color: isToday ? colors.primaryText : colors.mutedText,
                            marginTop: 1,
                        }}
                    >
                        {iso.slice(8, 10)}
                    </Text>
                ) : null}
            </View>
        </Pressable>
    );
}

function SectionHeader(props: {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    colors: ReturnType<typeof useTheme>["colors"];
}) {
    const { colors } = props;

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
            }}
        >
            <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: "800", color: colors.text, fontSize: 20 }}>
                    {props.title}
                </Text>

                {props.subtitle ? (
                    <Text style={{ color: colors.mutedText }}>{props.subtitle}</Text>
                ) : null}
            </View>

            {props.right}
        </View>
    );
}

export default function CalendarMonthRoute() {
    const router = useRouter();
    const { colors } = useTheme();

    const today = React.useMemo(() => new Date(), []);
    const todayIso = React.useMemo(() => todayIsoLocal(), []);

    const [cursor, setCursor] = React.useState<Date>(() => startOfMonth(today));
    const [isActionsExpanded, setIsActionsExpanded] = React.useState<boolean>(false);

    const headerTitle = React.useMemo(() => format(cursor, "MMMM yyyy"), [cursor]);

    const monthStart = React.useMemo(() => startOfMonth(cursor), [cursor]);
    const monthEnd = React.useMemo(() => endOfMonth(cursor), [cursor]);

    const gridStart = React.useMemo(
        () => startOfWeek(monthStart, { weekStartsOn: 1 }),
        [monthStart]
    );
    const gridEnd = React.useMemo(
        () => endOfWeek(monthEnd, { weekStartsOn: 1 }),
        [monthEnd]
    );

    const days = React.useMemo(
        () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
        [gridStart, gridEnd]
    );

    const dayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    const weekKey = weekKeyFromIso(todayIso);

    function openDay(date: Date) {
        const iso = format(date, "yyyy-MM-dd") as ISODate;
        toastSuccess("Abriendo día", `Cargando resumen del ${iso}.`);
        router.push({
            pathname: "/(app)/calendar/day/[date]",
            params: { date: iso },
        });
    }

    function openRoutines() {
        toastSuccess("Abriendo rutinas", "Ya puedes ver y editar semanas de rutina.");
        router.push("/(app)/calendar/routines");
    }

    function openGymCheck() {
        toastSuccess("Abriendo Gym Check", "Entrando al selector semanal de Gym Check.");
        router.push("/(app)/calendar/gym-check");
    }

    function openTodaySummary() {
        toastSuccess("Abriendo resumen del día", `Cargando el día ${todayIso}.`);
        router.push({
            pathname: "/(app)/calendar/day/[date]",
            params: { date: todayIso },
        });
    }

    function openWeekSummary() {
        toastSuccess("Abriendo resumen semanal", `Cargando la semana ${weekKey}.`);
        router.push({
            pathname: "/(app)/calendar/weekView/[weekKey]",
            params: { weekKey },
        });
    }

    function openOutdoor() {
        toastSuccess(
            "Abriendo Walking + Running",
            `Cargando outdoor del día ${todayIso}.`
        );
        router.push({
            pathname: "/(app)/calendar/outdoor/[date]",
            params: { date: todayIso },
        });
    }

    function openHealthBackfill() {
        toastSuccess(
            "Abriendo Health Backfill",
            "Ya puedes importar histórico por día o por rango."
        );
        router.push("/calendar/health-backfill");
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
                    Calendario
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    Mes actual + accesos reales
                </Text>
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 12,
                    gap: 10,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                }}
            >
                <SectionHeader
                    colors={colors}
                    title="Accesos"
                    subtitle={
                        isActionsExpanded
                            ? "Accesos rápidos a resumen, outdoor, rutinas, gym y health."
                            : "Toca para expandir los accesos rápidos."
                    }
                    right={
                        <Pressable
                            onPress={() => setIsActionsExpanded((prev) => !prev)}
                            style={({ pressed }) => ({
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                opacity: pressed ? 0.82 : 1,
                            })}
                        >
                            <Text style={{ fontWeight: "800", color: colors.text }}>
                                {isActionsExpanded ? "Ocultar" : "Mostrar"}
                            </Text>
                        </Pressable>
                    }
                />

                {isActionsExpanded ? (
                    <>
                        <ActionButton
                            colors={colors}
                            title={`Resumen Día (${todayIso})`}
                            subtitle="Resumen de la Sesión Gym y Sueño"
                            onPress={openTodaySummary}
                        />

                        <ActionButton
                            colors={colors}
                            title="Resumen Semanal"
                            subtitle="Resumen de toda la semana de Sueño y Training."
                            onPress={openWeekSummary}
                        />

                        <ActionButton
                            colors={colors}
                            title="Walking + Running"
                            subtitle="Dashboard outdoor del día + secciones de Walking y Running."
                            onPress={openOutdoor}
                        />

                        <ActionButton
                            colors={colors}
                            title="Rutinas"
                            subtitle="Ver semanas, cargar/editar rutina"
                            onPress={openRoutines}
                        />

                        <ActionButton
                            colors={colors}
                            title="Gym Check"
                            subtitle="Selector de semana + tabs de días"
                            onPress={openGymCheck}
                        />

                        <ActionButton
                            colors={colors}
                            title="Health Backfill"
                            subtitle="Importar histórico por día o por rango desde HealthKit / Health Connect."
                            onPress={openHealthBackfill}
                        />
                    </>
                ) : (
                    <Pressable
                        onPress={() => setIsActionsExpanded(true)}
                        style={({ pressed }) => ({
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 14,
                            paddingVertical: 14,
                            backgroundColor: colors.background,
                            opacity: pressed ? 0.82 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>
                            Ver accesos rápidos
                        </Text>
                        <Text style={{ color: colors.mutedText, marginTop: 2 }}>
                            Día, Semana, Walking + Running, Rutinas, Gym Check y Health Backfill.
                        </Text>
                    </Pressable>
                )}
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 12,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    gap: 10,
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
                        onPress={() => setCursor((d) => addMonths(d, -1))}
                        style={({ pressed }) => ({
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            backgroundColor: colors.surface,
                            opacity: pressed ? 0.82 : 1,
                            transform: [{ scale: pressed ? 0.97 : 1 }],
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>←</Text>
                    </Pressable>

                    <Text style={{ fontWeight: "800", fontSize: 16, color: colors.text }}>
                        {headerTitle}
                    </Text>

                    <Pressable
                        onPress={() => setCursor((d) => addMonths(d, 1))}
                        style={({ pressed }) => ({
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            backgroundColor: colors.surface,
                            opacity: pressed ? 0.82 : 1,
                            transform: [{ scale: pressed ? 0.97 : 1 }],
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>→</Text>
                    </Pressable>
                </View>

                <View style={{ flexDirection: "row" }}>
                    {dayLabels.map((d) => (
                        <View
                            key={d}
                            style={{
                                width: "14.2857%",
                                paddingVertical: 6,
                                alignItems: "center",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 12,
                                    fontWeight: "800",
                                    color: colors.mutedText,
                                }}
                            >
                                {d}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                    {days.map((d) => {
                        const iso = format(d, "yyyy-MM-dd") as ISODate;
                        const muted = !isSameMonth(d, cursor);
                        const isToday = isSameDay(d, today);

                        return (
                            <DayCell
                                key={iso}
                                label={format(d, "d")}
                                iso={iso}
                                muted={muted}
                                isToday={isToday}
                                onPress={() => openDay(d)}
                                colors={colors}
                            />
                        );
                    })}
                </View>

                <Text style={{ color: colors.mutedText, marginTop: 6 }}>
                    Tip: toca un día para abrir el resumen del día.
                </Text>
            </View>
        </ScrollView>
    );
}