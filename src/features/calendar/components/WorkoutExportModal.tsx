// /src/features/calendar/components/WorkoutExportModal.tsx
// Page-sheet form for exporting complete WorkoutDay data as XLSX or PDF.
// The API resolves day/week/month boundaries and generates the final file.

import { Ionicons } from "@expo/vector-icons";
import {
    endOfMonth,
    endOfWeek,
    format,
    isValid,
    parseISO,
    startOfMonth,
    startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import React from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DatePickerField } from "@/src/features/components/DatePickerField";
import { useWorkoutExport } from "@/src/hooks/workout/useWorkoutExport";
import { useSettingsStore } from "@/src/store/settings.store";
import { useTheme } from "@/src/theme/ThemeProvider";
import type {
    WorkoutReportFormat,
    WorkoutReportRequest,
    WorkoutReportSelection,
    WorkoutReportSelectionKind,
} from "@/src/types/workoutExport.types";
import { toastError } from "@/src/utils/toast";

type Props = {
    visible: boolean;
    initialDate: string;
    onClose: () => void;
};

type SelectionOption = {
    value: WorkoutReportSelectionKind;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
};

type FormatOption = {
    value: WorkoutReportFormat;
    label: string;
    description: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
};

type OptionRowProps = {
    label: string;
    description: string;
    value: boolean;
    disabled?: boolean;
    onChange: (next: boolean) => void;
};

const SELECTION_OPTIONS: readonly SelectionOption[] = [
    { value: "day", label: "Día", icon: "today-outline" },
    { value: "week", label: "Semana", icon: "calendar-outline" },
    { value: "month", label: "Mes", icon: "grid-outline" },
    { value: "range", label: "Rango", icon: "options-outline" },
];

const FORMAT_OPTIONS: readonly FormatOption[] = [
    {
        value: "xlsx",
        label: "XLSX",
        description: "Hojas completas para analizar datos, sets, rutas y metadata.",
        icon: "grid-outline",
    },
    {
        value: "pdf",
        label: "PDF",
        description: "Reporte legible por día con sueño, notas y sesiones.",
        icon: "document-text-outline",
    },
];

function parseDate(value: string): Date | null {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
}

function formatDisplayDate(value: string): string {
    const parsed = parseDate(value);

    return parsed
        ? format(parsed, "d 'de' MMMM 'de' yyyy", { locale: es })
        : value;
}

function selectionDateLabel(kind: WorkoutReportSelectionKind): string {
    if (kind === "day") return "Fecha del día";
    if (kind === "week") return "Fecha dentro de la semana";
    return "Fecha dentro del mes";
}

function buildSelectionDescription(
    kind: WorkoutReportSelectionKind,
    selectedDate: string,
    rangeFrom: string,
    rangeTo: string,
    weekStartsOn: 0 | 1,
): string {
    if (kind === "range") {
        return `${formatDisplayDate(rangeFrom)} — ${formatDisplayDate(rangeTo)}`;
    }

    const parsed = parseDate(selectedDate);

    if (!parsed) {
        return "Selecciona una fecha válida.";
    }

    if (kind === "day") {
        return formatDisplayDate(selectedDate);
    }

    if (kind === "week") {
        const from = startOfWeek(parsed, { weekStartsOn });
        const to = endOfWeek(parsed, { weekStartsOn });
        return `${format(from, "d MMM", { locale: es })} — ${format(to, "d MMM yyyy", { locale: es })}`;
    }

    const from = startOfMonth(parsed);
    const to = endOfMonth(parsed);
    return `${format(from, "d MMM", { locale: es })} — ${format(to, "d MMM yyyy", { locale: es })}`;
}

function buildSelection(
    kind: WorkoutReportSelectionKind,
    selectedDate: string,
    rangeFrom: string,
    rangeTo: string,
): WorkoutReportSelection | null {
    if (kind === "range") {
        const fromDate = parseDate(rangeFrom);
        const toDate = parseDate(rangeTo);

        if (!fromDate || !toDate || fromDate.getTime() > toDate.getTime()) {
            return null;
        }

        return {
            kind: "range",
            from: rangeFrom,
            to: rangeTo,
        };
    }

    if (!parseDate(selectedDate)) {
        return null;
    }

    if (kind === "day") {
        return { kind: "day", date: selectedDate };
    }

    if (kind === "week") {
        return { kind: "week", date: selectedDate };
    }

    return { kind: "month", date: selectedDate };
}

function OptionRow({
    label,
    description,
    value,
    disabled = false,
    onChange,
}: OptionRowProps) {
    const { colors } = useTheme();

    return (
        <View
            style={[
                styles.optionRow,
                {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    opacity: disabled ? 0.5 : 1,
                },
            ]}
        >
            <View style={styles.optionText}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>{label}</Text>
                <Text style={[styles.optionDescription, { color: colors.mutedText }]}>{description}</Text>
            </View>

            <Switch
                accessibilityLabel={label}
                disabled={disabled}
                value={value}
                onValueChange={onChange}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
            />
        </View>
    );
}

export function WorkoutExportModal({
    visible,
    initialDate,
    onClose,
}: Props) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const weekStartsOn = useSettingsStore(
        (state) => state.settings.weekStartsOn,
    );
    const exportMutation = useWorkoutExport();

    const [selectionKind, setSelectionKind] =
        React.useState<WorkoutReportSelectionKind>("day");
    const [selectedDate, setSelectedDate] = React.useState(initialDate);
    const [rangeFrom, setRangeFrom] = React.useState(initialDate);
    const [rangeTo, setRangeTo] = React.useState(initialDate);
    const [reportFormat, setReportFormat] =
        React.useState<WorkoutReportFormat>("xlsx");
    const [includeEmptyDays, setIncludeEmptyDays] = React.useState(false);
    const [includeMediaLinks, setIncludeMediaLinks] = React.useState(true);
    const [includeGpsPoints, setIncludeGpsPoints] = React.useState(false);
    const [includeTechnicalMetadata, setIncludeTechnicalMetadata] =
        React.useState(false);
    const [validationMessage, setValidationMessage] =
        React.useState<string | null>(null);

    const exporting = exportMutation.isPending;
    const gpsPointsEnabled = reportFormat === "xlsx";

    React.useEffect(() => {
        if (!visible) return;

        setSelectionKind("day");
        setSelectedDate(initialDate);
        setRangeFrom(initialDate);
        setRangeTo(initialDate);
        setReportFormat("xlsx");
        setIncludeEmptyDays(false);
        setIncludeMediaLinks(true);
        setIncludeGpsPoints(false);
        setIncludeTechnicalMetadata(false);
        setValidationMessage(null);
    }, [initialDate, visible]);

    React.useEffect(() => {
        if (reportFormat === "pdf" && includeGpsPoints) {
            setIncludeGpsPoints(false);
        }
    }, [includeGpsPoints, reportFormat]);

    const selectionDescription = React.useMemo(
        () =>
            buildSelectionDescription(
                selectionKind,
                selectedDate,
                rangeFrom,
                rangeTo,
                weekStartsOn,
            ),
        [rangeFrom, rangeTo, selectedDate, selectionKind, weekStartsOn],
    );

    function close(): void {
        if (!exporting) {
            onClose();
        }
    }

    async function submit(): Promise<void> {
        const selection = buildSelection(
            selectionKind,
            selectedDate,
            rangeFrom,
            rangeTo,
        );

        if (!selection) {
            setValidationMessage(
                selectionKind === "range"
                    ? "Selecciona un rango válido. La fecha inicial no puede ser posterior a la final."
                    : "Selecciona una fecha válida.",
            );
            return;
        }

        const request: WorkoutReportRequest = {
            selection,
            format: reportFormat,
            includeEmptyDays,
            includeMediaLinks,
            includeGpsPoints: gpsPointsEnabled && includeGpsPoints,
            includeTechnicalMetadata,
        };

        setValidationMessage(null);

        try {
            await exportMutation.mutateAsync(request);
        } catch (error: unknown) {
            const message =
                error instanceof Error && error.message.trim()
                    ? error.message.trim()
                    : "No se pudo generar el archivo. Inténtalo nuevamente.";

            toastError("No se pudo exportar", message);
        }
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={close}
        >
            <View
                accessibilityViewIsModal
                style={[styles.root, { backgroundColor: colors.background }]}
            >
                <View
                    style={[
                        styles.header,
                        {
                            backgroundColor: colors.surface,
                            borderBottomColor: colors.border,
                        },
                    ]}
                >
                    <View style={styles.headerText}>
                        <Text style={[styles.title, { color: colors.text }]}>Exportar datos</Text>
                        <Text style={[styles.subtitle, { color: colors.mutedText }]}>Sueño, notas, sesiones, ejercicios, cardio, rutas y datos futuros del periodo.</Text>
                    </View>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Cerrar exportación"
                        disabled={exporting}
                        onPress={close}
                        style={({ pressed }) => [
                            styles.closeButton,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                opacity: pressed || exporting ? 0.62 : 1,
                            },
                        ]}
                    >
                        <Ionicons name="close" size={21} color={colors.text} />
                    </Pressable>
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                >
                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Periodo</Text>
                            <Text style={[styles.sectionSubtitle, { color: colors.mutedText }]}>La semana respeta el primer día configurado en la app.</Text>
                        </View>

                        <View style={styles.selectionGrid}>
                            {SELECTION_OPTIONS.map((option) => {
                                const selected = selectionKind === option.value;

                                return (
                                    <Pressable
                                        key={option.value}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected }}
                                        disabled={exporting}
                                        onPress={() => {
                                            setSelectionKind(option.value);
                                            setValidationMessage(null);
                                        }}
                                        style={({ pressed }) => [
                                            styles.selectionButton,
                                            {
                                                borderColor: selected
                                                    ? colors.primary
                                                    : colors.border,
                                                backgroundColor: selected
                                                    ? colors.card
                                                    : colors.background,
                                                opacity: pressed || exporting ? 0.68 : 1,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name={option.icon}
                                            size={18}
                                            color={selected ? colors.primary : colors.text}
                                        />
                                        <Text
                                            style={[
                                                styles.selectionLabel,
                                                {
                                                    color: selected
                                                        ? colors.primary
                                                        : colors.text,
                                                },
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {selectionKind === "range" ? (
                            <View style={styles.dateStack}>
                                <DatePickerField
                                    label="Desde"
                                    value={rangeFrom}
                                    disabled={exporting}
                                    displayFormat="dd/MM/yyyy"
                                    onChange={(next) => {
                                        setRangeFrom(next);
                                        setValidationMessage(null);
                                    }}
                                />
                                <DatePickerField
                                    label="Hasta"
                                    value={rangeTo}
                                    disabled={exporting}
                                    displayFormat="dd/MM/yyyy"
                                    onChange={(next) => {
                                        setRangeTo(next);
                                        setValidationMessage(null);
                                    }}
                                />
                            </View>
                        ) : (
                            <DatePickerField
                                label={selectionDateLabel(selectionKind)}
                                value={selectedDate}
                                disabled={exporting}
                                displayFormat="dd/MM/yyyy"
                                onChange={(next) => {
                                    setSelectedDate(next);
                                    setValidationMessage(null);
                                }}
                            />
                        )}

                        <View
                            style={[
                                styles.periodPreview,
                                {
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                },
                            ]}
                        >
                            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                            <Text style={[styles.periodPreviewText, { color: colors.text }]}>{selectionDescription}</Text>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Formato</Text>
                            <Text style={[styles.sectionSubtitle, { color: colors.mutedText }]}>XLSX conserva el detalle técnico; PDF prioriza lectura.</Text>
                        </View>

                        <View style={styles.formatStack}>
                            {FORMAT_OPTIONS.map((option) => {
                                const selected = reportFormat === option.value;

                                return (
                                    <Pressable
                                        key={option.value}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected }}
                                        disabled={exporting}
                                        onPress={() => setReportFormat(option.value)}
                                        style={({ pressed }) => [
                                            styles.formatButton,
                                            {
                                                borderColor: selected
                                                    ? colors.primary
                                                    : colors.border,
                                                backgroundColor: selected
                                                    ? colors.card
                                                    : colors.background,
                                                opacity: pressed || exporting ? 0.68 : 1,
                                            },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.formatIcon,
                                                { backgroundColor: colors.surface },
                                            ]}
                                        >
                                            <Ionicons
                                                name={option.icon}
                                                size={22}
                                                color={selected ? colors.primary : colors.text}
                                            />
                                        </View>
                                        <View style={styles.formatText}>
                                            <Text
                                                style={[
                                                    styles.formatLabel,
                                                    {
                                                        color: selected
                                                            ? colors.primary
                                                            : colors.text,
                                                    },
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                            <Text style={[styles.formatDescription, { color: colors.mutedText }]}>{option.description}</Text>
                                        </View>
                                        <Ionicons
                                            name={selected ? "radio-button-on" : "radio-button-off"}
                                            size={20}
                                            color={selected ? colors.primary : colors.mutedText}
                                        />
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contenido</Text>
                            <Text style={[styles.sectionSubtitle, { color: colors.mutedText }]}>Los datos principales de cada día siempre se incluyen.</Text>
                        </View>

                        <View style={styles.optionsStack}>
                            <OptionRow
                                label="Incluir días vacíos"
                                description="Mantiene las fechas sin sueño, notas ni sesiones dentro del periodo."
                                value={includeEmptyDays}
                                disabled={exporting}
                                onChange={setIncludeEmptyDays}
                            />
                            <OptionRow
                                label="Incluir enlaces de media"
                                description="Agrega las URLs de imágenes y videos asociados."
                                value={includeMediaLinks}
                                disabled={exporting}
                                onChange={setIncludeMediaLinks}
                            />
                            <OptionRow
                                label="Incluir puntos GPS completos"
                                description={
                                    gpsPointsEnabled
                                        ? "Crea una hoja con latitud, longitud, altitud y tiempo por punto."
                                        : "Disponible en XLSX; el PDF conserva el resumen de la ruta."
                                }
                                value={gpsPointsEnabled && includeGpsPoints}
                                disabled={exporting || !gpsPointsEnabled}
                                onChange={setIncludeGpsPoints}
                            />
                            <OptionRow
                                label="Incluir metadata técnica"
                                description="Agrega sources, IDs externos, raw importado y datos de sincronización."
                                value={includeTechnicalMetadata}
                                disabled={exporting}
                                onChange={setIncludeTechnicalMetadata}
                            />
                        </View>

                        {validationMessage ? (
                            <Text style={[styles.validation, { color: colors.danger }]}>{validationMessage}</Text>
                        ) : null}
                    </View>
                </ScrollView>

                <View
                    style={[
                        styles.footer,
                        {
                            backgroundColor: colors.surface,
                            borderTopColor: colors.border,
                            paddingBottom: Math.max(insets.bottom, 12),
                        },
                    ]}
                >
                    <Pressable
                        accessibilityRole="button"
                        disabled={exporting}
                        onPress={close}
                        style={({ pressed }) => [
                            styles.footerButton,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                opacity: pressed || exporting ? 0.62 : 1,
                            },
                        ]}
                    >
                        <Text style={[styles.footerButtonText, { color: colors.text }]}>Cancelar</Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Generar reporte ${reportFormat.toUpperCase()}`}
                        disabled={exporting}
                        onPress={() => {
                            void submit();
                        }}
                        style={({ pressed }) => [
                            styles.footerButton,
                            styles.primaryFooterButton,
                            {
                                borderColor: colors.primary,
                                backgroundColor: colors.primary,
                                opacity: pressed || exporting ? 0.68 : 1,
                            },
                        ]}
                    >
                        {exporting ? (
                            <ActivityIndicator size="small" color={colors.primaryText} />
                        ) : (
                            <Ionicons name="share-outline" size={18} color={colors.primaryText} />
                        )}
                        <Text style={[styles.footerButtonText, { color: colors.primaryText }]}>{exporting ? "Generando..." : `Exportar ${reportFormat.toUpperCase()}`}</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        borderBottomWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    headerText: { flex: 1, gap: 3 },
    title: { fontSize: 21, fontWeight: "900" },
    subtitle: { fontSize: 12, lineHeight: 17, fontWeight: "600" },
    closeButton: {
        width: 44,
        height: 44,
        borderWidth: 1,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
    },
    content: { padding: 14, gap: 12, paddingBottom: 26 },
    card: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 13,
        gap: 13,
    },
    sectionHeader: { gap: 2 },
    sectionTitle: { fontSize: 16, fontWeight: "900" },
    sectionSubtitle: { fontSize: 11, lineHeight: 16, fontWeight: "600" },
    selectionGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 7,
    },
    selectionButton: {
        width: "48.8%",
        minHeight: 44,
        borderWidth: 1,
        borderRadius: 13,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    selectionLabel: { fontSize: 13, fontWeight: "900" },
    dateStack: { gap: 12 },
    periodPreview: {
        minHeight: 46,
        borderWidth: 1,
        borderRadius: 13,
        paddingHorizontal: 11,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    periodPreviewText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "800" },
    formatStack: { gap: 8 },
    formatButton: {
        minHeight: 72,
        borderWidth: 1,
        borderRadius: 15,
        paddingHorizontal: 11,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    formatIcon: {
        width: 43,
        height: 43,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
    },
    formatText: { flex: 1, gap: 2 },
    formatLabel: { fontSize: 14, fontWeight: "900" },
    formatDescription: { fontSize: 11, lineHeight: 16, fontWeight: "600" },
    optionsStack: { gap: 8 },
    optionRow: {
        minHeight: 70,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 11,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    optionText: { flex: 1, gap: 2 },
    optionLabel: { fontSize: 13, fontWeight: "900" },
    optionDescription: { fontSize: 10, lineHeight: 15, fontWeight: "600" },
    validation: { fontSize: 12, lineHeight: 17, fontWeight: "800" },
    footer: {
        borderTopWidth: 1,
        paddingHorizontal: 14,
        paddingTop: 11,
        flexDirection: "row",
        gap: 9,
    },
    footerButton: {
        flex: 1,
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
    },
    primaryFooterButton: { flex: 1.35 },
    footerButtonText: { fontSize: 13, fontWeight: "900" },
});
