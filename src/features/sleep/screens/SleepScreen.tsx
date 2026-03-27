// /src/features/sleep/screens/SleepScreen.tsx
import React from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import { isValid, parse } from "date-fns";

import { DeviceSelectRN } from "../../components/DeviceSelectRN";
import { DatePickerField } from "../components/DatePickerField";
import { SleepEmptyState } from "../components/SleepEmptyState";
import { SleepMetricsRow } from "../components/SleepMetricsRow";
import { normalizeSleepDraft, toSleepDraft, type SleepDraft } from "../components/sleepDraft";

import { useBootstrapSleep } from "@/src/hooks/health/useBootstrapSleep";
import { useHealthPermissions } from "@/src/hooks/health/useHealthPermissions";
import { useUpdateSleep } from "@/src/hooks/useUpdateSleep";
import { useWorkoutDay } from "@/src/hooks/workout/useWorkoutDay";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { HealthPermissionsStatus } from "@/src/types/health.types";
import type { SleepBlock } from "@/src/types/workoutDay.types";

function safeText(v: unknown): string {
    const s = String(v ?? "").trim();
    return s.length ? s : "—";
}

function isISODate(s: string): boolean {
    const parsed = parse(s.trim(), "yyyy-MM-dd", new Date());
    return isValid(parsed);
}

function todayISO(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatMetaDate(value: string | null | undefined): string {
    if (!value) return "—";

    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
}

function hasImportedMetadata(sleep: SleepBlock | null): boolean {
    if (!sleep) return false;

    return Boolean(
        (typeof sleep.source === "string" && sleep.source.trim()) ||
        (typeof sleep.sourceDevice === "string" && sleep.sourceDevice.trim()) ||
        (typeof sleep.importedAt === "string" && sleep.importedAt.trim())
    );
}

function hasGrantedSleepPermission(status: HealthPermissionsStatus | null): boolean {
    if (!status || !status.available) {
        return false;
    }

    const entries = Object.entries(status.permissions);
    if (entries.length === 0) {
        return false;
    }

    /**
     * Prefer explicit sleep-related permission keys when available.
     * If none are present, fall back to checking all returned permissions.
     */
    const sleepEntries = entries.filter(([key]) => /sleep/i.test(key));
    const relevantEntries = sleepEntries.length > 0 ? sleepEntries : entries;

    return relevantEntries.every(([, value]) => value === "granted");
}

function isMissingSleepPermissionError(error: unknown): boolean {
    const message = String(error ?? "");

    return (
        message.includes("READ_SLEEP") ||
        message.includes("SleepSessionRecord") ||
        message.includes("HealthConnectException") ||
        message.includes("SecurityException")
    );
}

export default function SleepScreen() {
    const { colors } = useTheme();

    const [date, setDate] = React.useState<string>(todayISO());

    const dayQ = useWorkoutDay(date, isISODate(date));
    const updateSleepM = useUpdateSleep();
    const bootstrapSleepM = useBootstrapSleep();

    const {
        availability,
        granted,
        provider,
        requestPermissions,
        isCheckingAvailability,
        isRequestingPermissions,
        permissionsStatus,
    } = useHealthPermissions();

    const day = dayQ.data ?? null;
    const sleep = day?.sleep ?? null;

    const [draft, setDraft] = React.useState<SleepDraft>(() => toSleepDraft(null));
    const [isDirty, setIsDirty] = React.useState(false);

    const patchDraft = React.useCallback((patch: Partial<SleepDraft>) => {
        setIsDirty(true);
        setDraft((s) => ({ ...s, ...patch }));
    }, []);

    React.useEffect(() => {
        setIsDirty(false);
    }, [date]);

    React.useEffect(() => {
        if (!isISODate(date)) return;
        if (isDirty) return;

        setDraft(toSleepDraft(sleep));
    }, [date, sleep, isDirty]);

    const loading = dayQ.isLoading || dayQ.isFetching;
    const syncLoading = bootstrapSleepM.isPending || isRequestingPermissions || isCheckingAvailability;
    const saveLoading = updateSleepM.isPending;
    const busy = loading || syncLoading || saveLoading;

    const error = dayQ.error ? safeText((dayQ.error as { message?: string } | null)?.message) : "";

    const onRefresh = async () => {
        await dayQ.refetch();
    };

    const onSave = async () => {
        if (!isISODate(date)) {
            Alert.alert("Fecha inválida", "Usa el formato YYYY-MM-DD.");
            return;
        }

        const normalized = normalizeSleepDraft(draft);

        try {
            await updateSleepM.mutateAsync({ date, sleep: normalized });
            setIsDirty(false);
            Alert.alert("Listo", "Sueño guardado.");
        } catch (e: unknown) {
            Alert.alert("Error", safeText(e));
        }
    };

    const onDeleteSleep = () => {
        if (!isISODate(date)) return;

        Alert.alert(
            "Borrar sueño",
            "Esto borrará el bloque de sueño de este día.\n\n¿Continuar?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Borrar sueño",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await updateSleepM.mutateAsync({ date, sleep: null });
                            setDraft(toSleepDraft(null));
                            setIsDirty(false);
                        } catch (e: unknown) {
                            Alert.alert("Error", safeText(e));
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const runHealthImport = async (kind: "initial" | "retry") => {
        if (!isISODate(date)) {
            Alert.alert("Fecha inválida", "Usa el formato YYYY-MM-DD.");
            return;
        }

        if (!availability) {
            Alert.alert(
                "Salud no disponible",
                "La integración de Salud no está disponible en este dispositivo o build."
            );
            return;
        }

        try {
            /**
             * Important:
             * Request permissions explicitly before every import attempt.
             * This keeps Android Health Connect flows more predictable and avoids
             * trying to read sleep data with stale or incomplete permission state.
             */
            const status = await requestPermissions();

            const permissionGranted = hasGrantedSleepPermission(status);

            if (!status.available || !permissionGranted) {
                Alert.alert(
                    "Permisos requeridos",
                    "No se concedieron los permisos necesarios para leer sueño desde Salud."
                );
                return;
            }

            const result = await bootstrapSleepM.mutateAsync({ date });

            await dayQ.refetch();

            if (!result) {
                Alert.alert(
                    kind === "retry" ? "Sin nuevos datos" : "Sin datos de Salud",
                    "No se encontraron datos de sueño para esta fecha. Puedes llenarlos manualmente."
                );
                return;
            }

            setIsDirty(false);
            setDraft(toSleepDraft(result.sleep ?? null));

            Alert.alert("Listo", "Sueño importado desde Salud.");
        } catch (e: unknown) {
            if (isMissingSleepPermissionError(e)) {
                Alert.alert(
                    "Permiso de sueño faltante",
                    "La app todavía no tiene permiso para leer sueño desde Health Connect / HealthKit. Intenta conceder permisos y vuelve a importar."
                );
                return;
            }

            Alert.alert("Error", safeText(e));
        }
    };

    const derived: SleepBlock | null = normalizeSleepDraft(draft);
    const importedMetaVisible = hasImportedMetadata(sleep);
    const providerLabel =
        provider === "healthkit" ? "HealthKit" : provider === "health-connect" ? "Health Connect" : "Salud";

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
            keyboardShouldPersistTaps="handled"
        >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Sueño</Text>
                    <Text style={{ color: colors.mutedText }}>
                        Importa desde Salud o captura manualmente por día.
                    </Text>
                </View>
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 12,
                    gap: 10,
                }}
            >
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
                    <View style={{ flex: 1, gap: 6 }}>
                        <DatePickerField value={date} onChange={(next) => setDate(next)} disabled={busy} />
                    </View>

                    <Pressable
                        onPress={onDeleteSleep}
                        disabled={busy}
                        style={({ pressed }) => ({
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: busy ? 0.6 : pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ color: colors.text, fontWeight: "800" }}>Borrar sueño</Text>
                    </Pressable>
                </View>

                <SleepMetricsRow sleep={derived} />

                <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                        onPress={() => void runHealthImport("initial")}
                        disabled={busy}
                        style={({ pressed }) => ({
                            flex: 1,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 12,
                            backgroundColor: colors.primary,
                            opacity: busy ? 0.6 : pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ color: colors.primaryText, fontWeight: "900", textAlign: "center" }}>
                            {syncLoading ? "Importando..." : `Importar desde ${providerLabel}`}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => void runHealthImport("retry")}
                        disabled={busy}
                        style={({ pressed }) => ({
                            flex: 1,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: busy ? 0.6 : pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ color: colors.text, fontWeight: "900", textAlign: "center" }}>
                            Reintentar sync
                        </Text>
                    </Pressable>
                </View>

                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        borderRadius: 14,
                        padding: 10,
                        gap: 8,
                    }}
                >
                    <Text style={{ fontSize: 12, fontWeight: "900", color: colors.text }}>
                        Estado de Salud
                    </Text>

                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Provider: {providerLabel}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Disponible: {availability ? "Sí" : "No"}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Permisos: {granted ? "Concedidos" : "Pendientes"}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Sleep Permission: {hasGrantedSleepPermission(permissionsStatus) ? "Concedido" : "Pendiente"}
                    </Text>
                </View>

                {importedMetaVisible ? (
                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            borderRadius: 14,
                            padding: 10,
                            gap: 8,
                        }}
                    >
                        <Text style={{ fontSize: 12, fontWeight: "900", color: colors.text }}>
                            Metadata importada
                        </Text>

                        <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                            Source: {safeText(sleep?.source)}
                        </Text>
                        <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                            Device: {safeText(sleep?.sourceDevice)}
                        </Text>
                        <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                            Imported At: {formatMetaDate(sleep?.importedAt)}
                        </Text>
                    </View>
                ) : null}
            </View>

            {error ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        padding: 12,
                        gap: 8,
                    }}
                >
                    <Text style={{ fontWeight: "800", color: colors.text }}>Error</Text>
                    <Text style={{ color: colors.mutedText }}>{error}</Text>
                </View>
            ) : null}

            {loading && !day ? (
                <View style={{ paddingVertical: 18, alignItems: "center", gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText }}>Cargando día...</Text>
                </View>
            ) : null}

            {!loading && !sleep ? <SleepEmptyState /> : null}

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 12,
                    gap: 10,
                }}
            >
                <View style={{ flexDirection: "row", gap: 10 }}>
                    <Field
                        label="Minutos dormido"
                        placeholder="e.g. 420"
                        hint="Ej: 420 (7h)."
                        value={draft.timeAsleepMinutes}
                        onChange={(v) => patchDraft({ timeAsleepMinutes: v })}
                    />
                    <Field
                        label="Minutos en cama"
                        placeholder="e.g. 480"
                        hint="Ejemplo: 480 (8h)"
                        value={draft.timeInBedMinutes}
                        onChange={(v) => patchDraft({ timeInBedMinutes: v })}
                    />
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                    <Field
                        label="Score"
                        placeholder="0–100"
                        hint="0–100. Vacío si no aplica."
                        value={draft.score}
                        onChange={(v) => patchDraft({ score: v })}
                    />
                    <Field
                        label="Awake (min)"
                        placeholder="e.g. 12"
                        hint={null}
                        value={draft.awakeMinutes}
                        onChange={(v) => patchDraft({ awakeMinutes: v })}
                    />
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                    <Field
                        label="REM (min)"
                        placeholder="e.g. 120"
                        hint={null}
                        value={draft.remMinutes}
                        onChange={(v) => patchDraft({ remMinutes: v })}
                    />
                    <Field
                        label="Core (min)"
                        placeholder="e.g. 260"
                        hint={null}
                        value={draft.coreMinutes}
                        onChange={(v) => patchDraft({ coreMinutes: v })}
                    />
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ width: "49%" }}>
                        <Field
                            label="Deep (min)"
                            placeholder="e.g. 45"
                            hint={null}
                            value={draft.deepMinutes}
                            onChange={(v) => patchDraft({ deepMinutes: v })}
                        />
                    </View>

                    <View style={{ width: "50%" }}>
                        <DeviceSelectRN
                            value={draft.source}
                            onChange={(next) => patchDraft({ source: next })}
                            disabled={busy}
                        />
                    </View>
                </View>

                <Field
                    label="Dispositivo / Source Device"
                    placeholder="Ej. Apple Watch, iPhone, Pixel Watch"
                    hint="Si no vino desde Salud, puedes capturarlo manualmente."
                    value={draft.sourceDevice}
                    onChange={(v) => patchDraft({ sourceDevice: v })}
                    keyboardType="default"
                />

                <View style={{ gap: 10, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <Pressable
                        onPress={onSave}
                        disabled={busy}
                        style={({ pressed }) => ({
                            width: 150,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 12,
                            backgroundColor: colors.primary,
                            opacity: busy ? 0.6 : pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ color: colors.primaryText, fontWeight: "800", textAlign: "center" }}>
                            {saveLoading ? "Guardando..." : sleep ? "Actualizar" : "Guardar"}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </ScrollView>
    );
}

function Field(props: {
    label: string;
    placeholder: string;
    hint: string | null;
    value: string;
    onChange: (v: string) => void;
    keyboardType?: "default" | "number-pad";
}) {
    const { colors } = useTheme();

    return (
        <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.mutedText }}>{props.label}</Text>
            <TextInput
                value={props.value}
                onChangeText={props.onChange}
                placeholder={props.placeholder}
                placeholderTextColor={colors.mutedText}
                keyboardType={props.keyboardType ?? "number-pad"}
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontWeight: "700",
                }}
            />
            {props.hint ? (
                <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "600" }}>{props.hint}</Text>
            ) : null}
        </View>
    );
}