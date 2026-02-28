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
            style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
            }}
        >
            <Text style={{ fontWeight: "900", color: colors.text }}>{props.title}</Text>
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
            style={{
                width: "14.2857%",
                padding: 6,
            }}
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
                <Text style={{ fontWeight: "900", color: isToday ? colors.primaryText : colors.text }}>
                    {label}
                </Text>

                {iso ? (
                    <Text style={{ fontSize: 10, color: isToday ? colors.primaryText : colors.mutedText, marginTop: 1 }}>
                        {iso.slice(8, 10)}
                    </Text>
                ) : null}
            </View>
        </Pressable>
    );
}

export default function CalendarMonthRoute() {
    const router = useRouter();
    const { colors } = useTheme();

    const today = React.useMemo(() => new Date(), []);
    const todayIso = React.useMemo(() => todayIsoLocal(), []);

    const [cursor, setCursor] = React.useState<Date>(() => startOfMonth(today));
    const headerTitle = React.useMemo(() => format(cursor, "MMMM yyyy"), [cursor]);

    const monthStart = React.useMemo(() => startOfMonth(cursor), [cursor]);
    const monthEnd = React.useMemo(() => endOfMonth(cursor), [cursor]);

    const gridStart = React.useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
    const gridEnd = React.useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);

    const days = React.useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

    const dayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    function openDay(date: Date) {
        const iso = format(date, "yyyy-MM-dd") as ISODate;
        router.push(`/(app)/calendar/day/${iso}` as any);
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>Calendario</Text>
                <Text style={{ color: colors.mutedText }}>Mes actual + accesos reales</Text>
            </View>

            {/* Quick navigation (real) */}
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
                <Text style={{ fontWeight: "900", color: colors.text }}>Accesos</Text>

                <ActionButton
                    colors={colors}
                    title="Rutinas"
                    subtitle="Ver semanas, cargar/editar rutina"
                    onPress={() => router.push("/(app)/calendar/routines" as any)}
                />

                <ActionButton
                    colors={colors}
                    title="Gym Check"
                    subtitle="Selector de semana + tabs de días"
                    onPress={() => router.push("/(app)/calendar/gym-check" as any)}
                />

                <ActionButton
                    colors={colors}
                    title={`Resumen Día (${todayIso})`}
                    subtitle="Placeholder (se convertirá en Day Summary)"
                    onPress={() => router.push(`/(app)/calendar/day/${todayIso}` as any)}
                />

                <ActionButton
                    colors={colors}
                    title="Resumen Semana (placeholder)"
                    subtitle="Lo conectamos luego a Weekly Summary"
                    onPress={() => {
                        // eslint-disable-next-line no-console
                        console.log("Weekly summary route not implemented yet.");
                    }}
                />
            </View>

            {/* Month calendar */}
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
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <Pressable
                        onPress={() => setCursor((d) => addMonths(d, -1))}
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            backgroundColor: colors.surface,
                        }}
                    >
                        <Text style={{ fontWeight: "900", color: colors.text }}>←</Text>
                    </Pressable>

                    <Text style={{ fontWeight: "900", fontSize: 16, color: colors.text }}>{headerTitle}</Text>

                    <Pressable
                        onPress={() => setCursor((d) => addMonths(d, 1))}
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            backgroundColor: colors.surface,
                        }}
                    >
                        <Text style={{ fontWeight: "900", color: colors.text }}>→</Text>
                    </Pressable>
                </View>

                <View style={{ flexDirection: "row" }}>
                    {dayLabels.map((d) => (
                        <View key={d} style={{ width: "14.2857%", paddingVertical: 6, alignItems: "center" }}>
                            <Text style={{ fontSize: 12, fontWeight: "900", color: colors.mutedText }}>{d}</Text>
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