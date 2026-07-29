// src/features/calendar/components/CalendarActionsSheet.tsx

/**
 * Bottom sheet with the calendar module's secondary destinations.
 * Day and weekly summary shortcuts are intentionally excluded.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { type ComponentProps } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/theme/ThemeProvider";

type CalendarAction = {
    id: "cardio" | "routines" | "gym-check" | "health-backfill";
    icon: ComponentProps<typeof Ionicons>["name"];
    title: string;
    subtitle: string;
    onPress: () => void;
};

type Props = {
    visible: boolean;
    selectedDate: string;
    onClose: () => void;
    onOpenCardio: () => void;
    onOpenRoutines: () => void;
    onOpenGymCheck: () => void;
    onOpenHealthBackfill: () => void;
};

export function CalendarActionsSheet({
    visible,
    selectedDate,
    onClose,
    onOpenCardio,
    onOpenRoutines,
    onOpenGymCheck,
    onOpenHealthBackfill,
}: Props) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const actions: CalendarAction[] = [
        {
            id: "cardio",
            icon: "walk-outline",
            title: "Cardio",
            subtitle: `Walking y running del ${selectedDate}.`,
            onPress: onOpenCardio,
        },
        {
            id: "routines",
            icon: "barbell-outline",
            title: "Rutinas",
            subtitle: "Ver, cargar y editar semanas de rutina.",
            onPress: onOpenRoutines,
        },
        {
            id: "gym-check",
            icon: "checkbox-outline",
            title: "Gym Check",
            subtitle: "Abrir el registro de entrenamiento del gimnasio.",
            onPress: onOpenGymCheck,
        },
        {
            id: "health-backfill",
            icon: "cloud-download-outline",
            title: "Health Backfill",
            subtitle: "Importar histórico desde HealthKit o Health Connect.",
            onPress: onOpenHealthBackfill,
        },
    ];

    function runAction(action: CalendarAction): void {
        onClose();
        action.onPress();
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.root}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar acciones del calendario"
                    onPress={onClose}
                    style={styles.backdrop}
                />

                <View
                    accessibilityViewIsModal
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            paddingBottom: Math.max(insets.bottom, 14),
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.handle,
                            { backgroundColor: colors.border },
                        ]}
                    />

                    <View style={styles.headerRow}>
                        <View style={styles.headerText}>
                            <Text style={[styles.title, { color: colors.text }]}>Acciones</Text>
                            <Text style={[styles.subtitle, { color: colors.mutedText }]}>Accesos del calendario para {selectedDate}.</Text>
                        </View>

                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Cerrar acciones"
                            hitSlop={8}
                            onPress={onClose}
                            style={({ pressed }) => [
                                styles.closeButton,
                                {
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    opacity: pressed ? 0.72 : 1,
                                },
                            ]}
                        >
                            <Ionicons name="close" size={20} color={colors.text} />
                        </Pressable>
                    </View>

                    <View style={styles.actionList}>
                        {actions.map((action) => (
                            <Pressable
                                key={action.id}
                                accessibilityRole="button"
                                accessibilityLabel={action.title}
                                accessibilityHint={action.subtitle}
                                onPress={() => runAction(action)}
                                style={({ pressed }) => [
                                    styles.actionRow,
                                    {
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                        opacity: pressed ? 0.76 : 1,
                                    },
                                ]}
                            >
                                <View
                                    style={[
                                        styles.iconBox,
                                        { backgroundColor: colors.card },
                                    ]}
                                >
                                    <Ionicons
                                        name={action.icon}
                                        size={22}
                                        color={colors.primary}
                                    />
                                </View>

                                <View style={styles.actionText}>
                                    <Text style={[styles.actionTitle, { color: colors.text }]}>{action.title}</Text>
                                    <Text style={[styles.actionSubtitle, { color: colors.mutedText }]}>{action.subtitle}</Text>
                                </View>

                                <Ionicons
                                    name="chevron-forward"
                                    size={18}
                                    color={colors.mutedText}
                                />
                            </Pressable>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end" },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.48)",
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 10,
        gap: 14,
    },
    handle: {
        width: 44,
        height: 5,
        borderRadius: 999,
        alignSelf: "center",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    headerText: { flex: 1, gap: 3 },
    title: { fontSize: 21, fontWeight: "900" },
    subtitle: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    actionList: { gap: 9 },
    actionRow: {
        minHeight: 56,
        borderWidth: 1,
        borderRadius: 15,
        paddingHorizontal: 12,
        paddingVertical: 11,
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
    },
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
    },
    actionText: { flex: 1, gap: 2 },
    actionTitle: { fontSize: 15, fontWeight: "900" },
    actionSubtitle: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
});
