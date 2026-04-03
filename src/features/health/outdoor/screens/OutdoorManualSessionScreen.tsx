// /src/features/health/outdoor/screens/OutdoorManualSessionScreen.tsx

import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import { DatePickerField } from "@/src/features/components/DatePickerField";
import { DeviceSelectRN } from "@/src/features/components/DeviceSelectRN";
import {
    buildOutdoorManualSessionFormFromSession,
    buildOutdoorManualSessionPayload,
    type OutdoorManualSessionFormValues,
} from "@/src/features/health/outdoor/utils/buildOutdoorManualSessionPayload";
import { useOutdoorSessionDetails } from "@/src/hooks/health/outdoor/useOutdoorSessionDetails";
import { ensureWorkoutDayExistsDays } from "@/src/services/workout/days.service";
import {
    createSession,
    patchSession,
} from "@/src/services/workout/sessions.service";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { OutdoorActivityType } from "@/src/types/health/healthOutdoor.types";
import type { ISODate, WorkoutSession } from "@/src/types/workoutDay.types";
import { getLocalTodayIsoDate } from "@/src/utils/dates/dateDisplay";

type TextFieldProps = {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    keyboardType?: "default" | "numeric" | "number-pad" | "decimal-pad";
    multiline?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
    maxLength?: number;
};

type ToggleOption<TValue extends string> = {
    value: TValue;
    label: string;
};

function resolveDateParam(value: string | string[] | undefined): ISODate {
    if (typeof value === "string" && value.trim().length > 0) {
        return value as ISODate;
    }

    return getLocalTodayIsoDate();
}

function resolveOptionalStringParam(value: string | string[] | undefined): string | null {
    if (typeof value === "string" && value.trim().length > 0) {
        return value;
    }

    return null;
}

function toErrorMessage(error: unknown, fallback: string): string {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object" &&
        (error as { response?: unknown }).response !== null
    ) {
        const apiMessage = (
            error as {
                response: {
                    data?: {
                        error?: {
                            message?: string;
                        };
                    };
                };
            }
        ).response.data?.error?.message;

        if (typeof apiMessage === "string" && apiMessage.trim().length > 0) {
            return apiMessage;
        }
    }

    return error instanceof Error ? error.message : fallback;
}

function buildInitialForm(date: ISODate): OutdoorManualSessionFormValues {
    return {
        date,
        activityType: "walking",

        startTime: "",
        endTime: "",
        durationMinutes: "",

        activeKcal: "",
        totalKcal: "",

        avgHr: "",
        maxHr: "",

        distanceKm: "",
        steps: "",
        elevationGainM: "",

        paceSecPerKm: "",
        avgSpeedKmh: "",
        maxSpeedKmh: "",

        cadenceRpm: "",
        strideLengthM: "",

        sourceDevice: null,
        notes: "",
    };
}

function isManualOutdoorEditable(session: WorkoutSession | null): boolean {
    if (!session) {
        return false;
    }

    return (
        session.meta?.source === "manual" &&
        session.meta?.sessionKind === "manual-outdoor" &&
        (session.activityType === "walking" || session.activityType === "running")
    );
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function clampInt(n: number, min: number, max: number): number {
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
}

/**
 * Soft formatter while typing.
 * Accepts only digits and renders partial HH:MM states:
 * "", "1", "12", "12:3", "12:34"
 */
function formatTimeTyping(raw: string): string {
    const source = String(raw ?? "");
    const digits = source.replace(/[^\d]/g, "");

    if (digits.length === 0) return "";
    if (digits.length === 1) return digits;
    if (digits.length === 2) return digits;
    if (digits.length === 3) return `${digits.slice(0, 2)}:${digits.slice(2)}`;

    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

/**
 * Final formatter on blur.
 * If incomplete, clears the value.
 * If complete, clamps hours/minutes and pads to HH:MM.
 */
function normalizeTimeOnBlur(raw: string): string {
    const value = String(raw ?? "").trim();
    if (!value) {
        return "";
    }

    const match = /^(\d{1,2})(?::(\d{1,2}))?$/.exec(value.replace(/[^\d:]/g, ""));
    if (!match) {
        return "";
    }

    const hhPart = match[1] ?? "";
    const mmPart = match[2] ?? "";

    if (!mmPart) {
        return "";
    }

    let hh = Number(hhPart);
    let mm = Number(mmPart);

    hh = clampInt(hh, 0, 23);
    mm = clampInt(mm, 0, 59);

    return `${pad2(hh)}:${pad2(mm)}`;
}

function SectionCard(props: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 16,
                backgroundColor: colors.surface,
                gap: 12,
            }}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                    {props.title}
                </Text>

                {props.subtitle ? (
                    <Text style={{ color: colors.mutedText }}>{props.subtitle}</Text>
                ) : null}
            </View>

            {props.children}
        </View>
    );
}

function TextField({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    multiline = false,
    onFocus,
    onBlur,
    maxLength,
}: TextFieldProps) {
    const { colors } = useTheme();

    return (
        <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.mutedText }}>
                {label}
            </Text>

            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.mutedText}
                keyboardType={keyboardType}
                multiline={multiline}
                onFocus={onFocus}
                onBlur={onBlur}
                maxLength={maxLength}
                textAlignVertical={multiline ? "top" : "center"}
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    backgroundColor: colors.background,
                    color: colors.text,
                    paddingHorizontal: 12,
                    paddingVertical: multiline ? 12 : 10,
                    minHeight: multiline ? 110 : undefined,
                    fontWeight: "600",
                }}
            />
        </View>
    );
}

function ToggleGroup<TValue extends string>(props: {
    label: string;
    value: TValue;
    options: ToggleOption<TValue>[];
    onChange: (next: TValue) => void;
}) {
    const { colors } = useTheme();

    return (
        <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.mutedText }}>
                {props.label}
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
                {props.options.map((option) => {
                    const selected = option.value === props.value;

                    return (
                        <Pressable
                            key={option.value}
                            onPress={() => props.onChange(option.value)}
                            style={({ pressed }) => ({
                                flex: 1,
                                borderWidth: 1,
                                borderColor: selected ? colors.primary : colors.border,
                                backgroundColor: selected ? colors.primary : colors.background,
                                borderRadius: 12,
                                paddingVertical: 12,
                                paddingHorizontal: 10,
                                opacity: pressed ? 0.9 : 1,
                            })}
                        >
                            <Text
                                style={{
                                    textAlign: "center",
                                    fontWeight: "800",
                                    color: selected ? colors.primaryText : colors.text,
                                }}
                            >
                                {option.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function Row(props: { children: React.ReactNode }) {
    return (
        <View style={{ flexDirection: "row", gap: 10 }}>
            {props.children}
        </View>
    );
}

function FieldColumn(props: { children: React.ReactNode }) {
    return <View style={{ flex: 1 }}>{props.children}</View>;
}

export function OutdoorManualSessionScreen() {
    const params = useLocalSearchParams<{ date?: string | string[]; sessionId?: string | string[] }>();
    const router = useRouter();
    const { colors } = useTheme();

    const initialDate = React.useMemo(() => resolveDateParam(params.date), [params.date]);
    const sessionId = React.useMemo(
        () => resolveOptionalStringParam(params.sessionId),
        [params.sessionId]
    );
    const isEditMode = sessionId !== null;

    const details = useOutdoorSessionDetails({
        date: initialDate,
        sessionId: sessionId ?? "",
        includeRoutes: false,
        autoLoad: isEditMode,
    });

    const [form, setForm] = React.useState<OutdoorManualSessionFormValues>(() =>
        buildInitialForm(initialDate)
    );
    const [error, setError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState<boolean>(false);

    const didHydrateEditForm = React.useRef<boolean>(false);

    React.useEffect(() => {
        didHydrateEditForm.current = false;
    }, [initialDate, sessionId]);

    React.useEffect(() => {
        if (!isEditMode) {
            setForm((current) => ({
                ...current,
                date: initialDate,
            }));
            return;
        }

        const session = details.session;
        if (!session || !isManualOutdoorEditable(session) || didHydrateEditForm.current) {
            return;
        }

        setForm(buildOutdoorManualSessionFormFromSession(session, initialDate));
        didHydrateEditForm.current = true;
    }, [details.session, initialDate, isEditMode]);

    function updateField<TKey extends keyof OutdoorManualSessionFormValues>(
        key: TKey,
        value: OutdoorManualSessionFormValues[TKey]
    ) {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    }

    async function handleSave() {
        setError(null);

        const result = buildOutdoorManualSessionPayload(form);
        if (!result.ok) {
            setError(result.error);
            return;
        }

        setSubmitting(true);

        try {
            if (isEditMode && sessionId) {
                const updated = await patchSession(form.date, sessionId, result.payload, {
                    returnMode: "session",
                });

                if ("session" in updated && updated.session?.id) {
                    router.replace({
                        pathname: "/(app)/calendar/outdoor/session/[date]/[sessionId]",
                        params: {
                            date: form.date,
                            sessionId: updated.session.id,
                        },
                    });
                    return;
                }

                router.replace({
                    pathname: "/(app)/calendar/outdoor/session/[date]/[sessionId]",
                    params: {
                        date: form.date,
                        sessionId,
                    },
                });
                return;
            }

            /**
             * Create mode must ensure the canonical WorkoutDay exists first,
             * same as Gym Check bootstrap/create flows.
             */
            await ensureWorkoutDayExistsDays(form.date);

            const created = await createSession(form.date, result.payload, {
                returnMode: "session",
            });

            if ("session" in created && created.session?.id) {
                router.replace({
                    pathname: "/(app)/calendar/outdoor/session/[date]/[sessionId]",
                    params: {
                        date: form.date,
                        sessionId: created.session.id,
                    },
                });
                return;
            }

            router.replace({
                pathname: "/(app)/calendar/outdoor",
                params: {
                    date: form.date,
                },
            });
        } catch (err: unknown) {
            setError(
                toErrorMessage(
                    err,
                    isEditMode
                        ? "No se pudo actualizar la sesión manual outdoor."
                        : "No se pudo guardar la sesión manual outdoor."
                )
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (isEditMode && details.loading && !details.session) {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    padding: 16,
                    justifyContent: "center",
                }}
            >
                <Text style={{ color: colors.mutedText }}>Cargando sesión manual…</Text>
            </View>
        );
    }

    if (isEditMode && (details.notFound || !details.session)) {
        return (
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
            >
                <SectionCard
                    title="No se pudo editar la sesión"
                    subtitle="No encontramos una sesión manual outdoor para este identificador."
                >
                    <Text style={{ color: colors.mutedText, lineHeight: 20 }}>
                        Verifica que la sesión siga existiendo y vuelve a intentarlo desde el detalle.
                    </Text>

                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => ({
                            alignSelf: "flex-start",
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            backgroundColor: colors.background,
                            opacity: pressed ? 0.9 : 1,
                        })}
                    >
                        <Text style={{ color: colors.text, fontWeight: "800" }}>Volver</Text>
                    </Pressable>
                </SectionCard>
            </ScrollView>
        );
    }

    if (isEditMode && !isManualOutdoorEditable(details.session)) {
        return (
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
            >
                <SectionCard
                    title="Esta sesión no es editable"
                    subtitle="Solo las sesiones outdoor manuales pueden modificarse desde este formulario."
                >
                    <Text style={{ color: colors.mutedText, lineHeight: 20 }}>
                        Las sesiones importadas desde HealthKit o Health Connect deben mantenerse como
                        referencia del dispositivo.
                    </Text>

                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => ({
                            alignSelf: "flex-start",
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            backgroundColor: colors.background,
                            opacity: pressed ? 0.9 : 1,
                        })}
                    >
                        <Text style={{ color: colors.text, fontWeight: "800" }}>Volver</Text>
                    </Pressable>
                </SectionCard>
            </ScrollView>
        );
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
                    {isEditMode ? "Editar sesión outdoor" : "Captura manual outdoor"}
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    {isEditMode
                        ? "Ajusta la sesión manual si necesitas corregir datos capturados manualmente."
                        : "Usa este fallback cuando no haya datos en HealthKit / Health Connect para este día."}
                </Text>
            </View>

            <SectionCard
                title="Sesión"
                subtitle="Mantén el mismo patrón de datos que una sesión importada."
            >
                <DatePickerField
                    label="Fecha"
                    value={form.date}
                    onChange={(next) => updateField("date", next as ISODate)}
                    displayFormat="MMM dd, yyyy"
                    disabled={isEditMode}
                />

                <ToggleGroup<OutdoorActivityType>
                    label="Actividad"
                    value={form.activityType ?? "walking"}
                    onChange={(next) => updateField("activityType", next)}
                    options={[
                        { value: "walking", label: "Walking" },
                        { value: "running", label: "Running" },
                    ]}
                />

                <DeviceSelectRN
                    label="Dispositivo"
                    value={form.sourceDevice}
                    onChange={(next) => updateField("sourceDevice", next)}
                    allowOther
                    placeholder="Selecciona un dispositivo"
                />

                <Row>
                    <FieldColumn>
                        <TextField
                            label="Hora inicio (HH:MM)"
                            value={form.startTime}
                            onChangeText={(value) =>
                                updateField("startTime", formatTimeTyping(value))
                            }
                            onBlur={() =>
                                updateField(
                                    "startTime",
                                    normalizeTimeOnBlur(String(form.startTime ?? ""))
                                )
                            }
                            placeholder="07:10"
                            keyboardType="numeric"
                            maxLength={5}
                        />
                    </FieldColumn>

                    <FieldColumn>
                        <TextField
                            label="Hora fin (HH:MM)"
                            value={form.endTime}
                            onChangeText={(value) =>
                                updateField("endTime", formatTimeTyping(value))
                            }
                            onBlur={() =>
                                updateField(
                                    "endTime",
                                    normalizeTimeOnBlur(String(form.endTime ?? ""))
                                )
                            }
                            placeholder="08:02"
                            keyboardType="numeric"
                            maxLength={5}
                        />
                    </FieldColumn>
                </Row>

                <TextField
                    label="Duración (min)"
                    value={form.durationMinutes}
                    onChangeText={(value) => updateField("durationMinutes", value)}
                    placeholder="52"
                    keyboardType="decimal-pad"
                />

                <Text style={{ color: colors.mutedText, lineHeight: 20 }}>
                    Agrega hora de fin o duración. Si dejas la hora de fin vacía pero pones duración,
                    se calculará automáticamente.
                </Text>
            </SectionCard>

            <SectionCard title="Energía y pulso">
                <Row>
                    <FieldColumn>
                        <TextField
                            label="Kcal activas"
                            value={form.activeKcal}
                            onChangeText={(value) => updateField("activeKcal", value)}
                            placeholder="312"
                            keyboardType="decimal-pad"
                        />
                    </FieldColumn>

                    <FieldColumn>
                        <TextField
                            label="Kcal totales"
                            value={form.totalKcal}
                            onChangeText={(value) => updateField("totalKcal", value)}
                            placeholder="405"
                            keyboardType="decimal-pad"
                        />
                    </FieldColumn>
                </Row>

                <Row>
                    <FieldColumn>
                        <TextField
                            label="HR promedio"
                            value={form.avgHr}
                            onChangeText={(value) => updateField("avgHr", value)}
                            placeholder="128"
                            keyboardType="decimal-pad"
                        />
                    </FieldColumn>

                    <FieldColumn>
                        <TextField
                            label="HR máximo"
                            value={form.maxHr}
                            onChangeText={(value) => updateField("maxHr", value)}
                            placeholder="154"
                            keyboardType="decimal-pad"
                        />
                    </FieldColumn>
                </Row>
            </SectionCard>

            <SectionCard title="Movimiento">
                <Row>
                    <FieldColumn>
                        <TextField
                            label="Distancia (km)"
                            value={form.distanceKm}
                            onChangeText={(value) => updateField("distanceKm", value)}
                            placeholder="4.85"
                            keyboardType="decimal-pad"
                        />
                    </FieldColumn>

                    <FieldColumn>
                        <TextField
                            label="Pasos"
                            value={form.steps}
                            onChangeText={(value) => updateField("steps", value)}
                            placeholder="6320"
                            keyboardType="decimal-pad"
                        />
                    </FieldColumn>
                </Row>

                <Row>
                    <FieldColumn>
                        <TextField
                            label="Elevación ganada (m)"
                            value={form.elevationGainM}
                            onChangeText={(value) => updateField("elevationGainM", value)}
                            placeholder="35"
                            keyboardType="decimal-pad"
                        />
                    </FieldColumn>

                    <FieldColumn>
                        <TextField
                            label="Ritmo (seg/km)"
                            value={form.paceSecPerKm}
                            onChangeText={(value) => updateField("paceSecPerKm", value)}
                            placeholder="370"
                            keyboardType="decimal-pad"
                        />
                    </FieldColumn>
                </Row>

                <Row>
                    <FieldColumn>
                        <TextField
                            label="Vel. promedio (km/h)"
                            value={form.avgSpeedKmh}
                            onChangeText={(value) => updateField("avgSpeedKmh", value)}
                            placeholder="9.7"
                            keyboardType="decimal-pad"
                        />
                    </FieldColumn>

                    <FieldColumn>
                        <TextField
                            label="Velocidad máxima (km/h)"
                            value={form.maxSpeedKmh}
                            onChangeText={(value) => updateField("maxSpeedKmh", value)}
                            placeholder="12.4"
                            keyboardType="decimal-pad"
                        />
                    </FieldColumn>
                </Row>

                <Row>
                    <FieldColumn>
                        <TextField
                            label="Cadencia (rpm)"
                            value={form.cadenceRpm}
                            onChangeText={(value) => updateField("cadenceRpm", value)}
                            placeholder="164"
                            keyboardType="decimal-pad"
                        />
                    </FieldColumn>

                    <FieldColumn>
                        <TextField
                            label="Zancada (m)"
                            value={form.strideLengthM}
                            onChangeText={(value) => updateField("strideLengthM", value)}
                            placeholder="0.92"
                            keyboardType="decimal-pad"
                        />
                    </FieldColumn>
                </Row>
            </SectionCard>

            <SectionCard title="Notas">
                <TextField
                    label="Observaciones"
                    value={form.notes}
                    onChangeText={(value) => updateField("notes", value)}
                    placeholder="Ej. sesión capturada manualmente porque el dispositivo no registró."
                    multiline
                />
            </SectionCard>

            {error ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.danger ?? colors.border,
                        borderRadius: 14,
                        padding: 12,
                        backgroundColor: colors.surface,
                    }}
                >
                    <Text style={{ color: colors.danger ?? colors.text, fontWeight: "800" }}>
                        {error}
                    </Text>
                </View>
            ) : null}

            <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                    onPress={() => router.back()}
                    disabled={submitting}
                    style={({ pressed }) => ({
                        flex: 1,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        paddingVertical: 14,
                        backgroundColor: colors.background,
                        opacity: submitting ? 0.6 : pressed ? 0.9 : 1,
                    })}
                >
                    <Text
                        style={{
                            textAlign: "center",
                            color: colors.text,
                            fontWeight: "800",
                        }}
                    >
                        Cancelar
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => {
                        void handleSave();
                    }}
                    disabled={submitting}
                    style={({ pressed }) => ({
                        flex: 1,
                        borderWidth: 1,
                        borderColor: colors.primary,
                        borderRadius: 12,
                        paddingVertical: 14,
                        backgroundColor: colors.primary,
                        opacity: submitting ? 0.6 : pressed ? 0.9 : 1,
                    })}
                >
                    <Text
                        style={{
                            textAlign: "center",
                            color: colors.primaryText,
                            fontWeight: "800",
                        }}
                    >
                        {submitting
                            ? isEditMode
                                ? "Actualizando..."
                                : "Guardando..."
                            : isEditMode
                                ? "Guardar cambios"
                                : "Guardar sesión"}
                    </Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}

export default OutdoorManualSessionScreen;