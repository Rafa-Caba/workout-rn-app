// /src/features/gymCheck/components/GymCheckDeviceMetricsCard.tsx
// Collapsible strength-session metrics form used by Gym Check and trainee mode.

import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { GymDayMetricsState } from "@/src/types/gymCheck.types";
import { DeviceSelectRN } from "../../components/DeviceSelectRN";
import { GymCheckField } from "./GymCheckField";

type Props = {
    title?: string;
    metrics: GymDayMetricsState;
    onChange: (patch: Partial<GymDayMetricsState>) => void;
    disabled?: boolean;
    defaultOpen?: boolean;
};

function hasAnyValue(metrics: GymDayMetricsState): boolean {
    return (
        metrics.totalKcalEstimated ||
        [
            metrics.startAt,
            metrics.endAt,
            metrics.activeKcal,
            metrics.totalKcal,
            metrics.avgHr,
            metrics.maxHr,
            metrics.effortRpe,
            metrics.trainingSource,
            metrics.dayEffortRpe,
        ].some((value) => value.trim().length > 0)
    );
}

type FieldKey =
    | "startAt"
    | "endAt"
    | "activeKcal"
    | "totalKcal"
    | "avgHr"
    | "maxHr"
    | "effortRpe"
    | "trainingSource"
    | "dayEffortRpe";

function FieldWrap(props: { active: boolean; children: React.ReactNode }) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                flex: 1,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: props.active ? colors.primary : "transparent",
                padding: props.active ? 6 : 0,
                backgroundColor: "transparent",
            }}
        >
            <View
                style={{
                    borderRadius: 14,
                    backgroundColor: props.active
                        ? `${colors.primary}14`
                        : "transparent",
                }}
            >
                {props.children}
            </View>
        </View>
    );
}

function pad2(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
}

function clampInt(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

/**
 * Soft time formatter for input typing.
 * It keeps partial HH:MM states without aggressively padding or clamping.
 */
function formatTimeTyping(raw: string): string {
    const digits = raw.replace(/[^\d]/g, "");

    if (digits.length === 0) return "";
    if (digits.length === 1) return digits;
    if (digits.length === 2) return digits;
    if (digits.length === 3) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

/**
 * Normalizes a completed time input on blur.
 */
function normalizeTimeOnBlur(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return "";

    const match = /^(\d{1,2})(?::(\d{1,2}))?$/.exec(
        trimmed.replace(/[^\d:]/g, "")
    );
    if (!match) return "";

    const hoursPart = match[1] ?? "";
    const minutesPart = match[2] ?? "";
    if (!minutesPart) return "";

    const hours = clampInt(Number(hoursPart), 0, 23);
    const minutes = clampInt(Number(minutesPart), 0, 59);

    return `${pad2(hours)}:${pad2(minutes)}`;
}

export function GymCheckDeviceMetricsCard({
    title = "Métricas del dispositivo",
    metrics,
    onChange,
    disabled = false,
    defaultOpen = false,
}: Props) {
    const { colors } = useTheme();

    const [open, setOpen] = React.useState<boolean>(() => defaultOpen);
    const [activeKey, setActiveKey] = React.useState<FieldKey | null>(null);

    const hasAny = React.useMemo(() => hasAnyValue(metrics), [metrics]);

    const setActive = (key: FieldKey) => {
        if (disabled) return;
        setActiveKey(key);
        if (!open) setOpen(true);
    };

    const clearActive = (key: FieldKey) => {
        setActiveKey((current) => (current === key ? null : current));
    };

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 14,
                backgroundColor: colors.surface,
                gap: 12,
            }}
        >
            <Pressable
                onPress={() => setOpen((current) => !current)}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <View style={{ gap: 2 }}>
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: "900",
                            color: colors.text,
                        }}
                    >
                        {title}
                    </Text>
                    <Text style={{ color: colors.mutedText }}>
                        {hasAny
                            ? "Hay datos guardados"
                            : "Toca para llenar (opcional)"}
                    </Text>
                </View>

                <Text style={{ fontWeight: "900", color: colors.text }}>
                    {open ? "▲" : "▼"}
                </Text>
            </Pressable>

            {open ? (
                <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                        <FieldWrap active={activeKey === "startAt"}>
                            <GymCheckField
                                label="Hora inicio (HH:MM)"
                                value={metrics.startAt}
                                onChange={(value) =>
                                    onChange({ startAt: formatTimeTyping(value) })
                                }
                                placeholder="07:10"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("startAt")}
                                onBlur={() => {
                                    onChange({
                                        startAt: normalizeTimeOnBlur(metrics.startAt),
                                    });
                                    clearActive("startAt");
                                }}
                            />
                        </FieldWrap>

                        <FieldWrap active={activeKey === "endAt"}>
                            <GymCheckField
                                label="Hora fin (HH:MM)"
                                value={metrics.endAt}
                                onChange={(value) =>
                                    onChange({ endAt: formatTimeTyping(value) })
                                }
                                placeholder="08:10"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("endAt")}
                                onBlur={() => {
                                    onChange({
                                        endAt: normalizeTimeOnBlur(metrics.endAt),
                                    });
                                    clearActive("endAt");
                                }}
                            />
                        </FieldWrap>
                    </View>

                    <View style={{ flexDirection: "row", gap: 12 }}>
                        <FieldWrap active={activeKey === "activeKcal"}>
                            <GymCheckField
                                label="Kcal activas"
                                value={metrics.activeKcal}
                                onChange={(value) =>
                                    onChange({ activeKcal: value })
                                }
                                placeholder="Ej. 425"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("activeKcal")}
                                onBlur={() => clearActive("activeKcal")}
                            />
                        </FieldWrap>

                        <FieldWrap active={activeKey === "totalKcal"}>
                            <GymCheckField
                                label={
                                    metrics.totalKcalEstimated
                                        ? "Kcal totales (estimadas)"
                                        : "Kcal totales"
                                }
                                value={metrics.totalKcal}
                                onChange={(value) =>
                                    onChange({
                                        totalKcal: value,
                                        totalKcalEstimated: false,
                                    })
                                }
                                placeholder="Ej. 587"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("totalKcal")}
                                onBlur={() => clearActive("totalKcal")}
                            />
                        </FieldWrap>
                    </View>

                    {metrics.totalKcalEstimated ? (
                        <Text
                            style={{
                                color: colors.mutedText,
                                fontSize: 12,
                                lineHeight: 17,
                            }}
                        >
                            Estimación calculada con energía activa + energía basal
                            del intervalo de HealthKit.
                        </Text>
                    ) : null}

                    <View style={{ flexDirection: "row", gap: 12 }}>
                        <FieldWrap active={activeKey === "avgHr"}>
                            <GymCheckField
                                label="HR promedio"
                                value={metrics.avgHr}
                                onChange={(value) => onChange({ avgHr: value })}
                                placeholder="Ej. 112"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("avgHr")}
                                onBlur={() => clearActive("avgHr")}
                            />
                        </FieldWrap>

                        <FieldWrap active={activeKey === "maxHr"}>
                            <GymCheckField
                                label="HR máximo"
                                value={metrics.maxHr}
                                onChange={(value) => onChange({ maxHr: value })}
                                placeholder="Ej. 154"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("maxHr")}
                                onBlur={() => clearActive("maxHr")}
                            />
                        </FieldWrap>
                    </View>

                    <View style={{ flexDirection: "row", gap: 12 }}>
                        <FieldWrap active={activeKey === "effortRpe"}>
                            <GymCheckField
                                label="Esfuerzo (RPE)"
                                value={metrics.effortRpe}
                                onChange={(value) =>
                                    onChange({ effortRpe: value })
                                }
                                placeholder="1-10"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("effortRpe")}
                                onBlur={() => clearActive("effortRpe")}
                            />
                        </FieldWrap>

                        <FieldWrap active={activeKey === "dayEffortRpe"}>
                            <GymCheckField
                                label="RPE del día"
                                value={metrics.dayEffortRpe}
                                onChange={(value) =>
                                    onChange({ dayEffortRpe: value })
                                }
                                placeholder="1-10"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("dayEffortRpe")}
                                onBlur={() => clearActive("dayEffortRpe")}
                            />
                        </FieldWrap>
                    </View>

                    <FieldWrap active={activeKey === "trainingSource"}>
                        <DeviceSelectRN
                            label="Dispositivo"
                            value={metrics.trainingSource || null}
                            onChange={(next) =>
                                onChange({ trainingSource: next ?? "" })
                            }
                            disabled={disabled}
                            allowOther
                            placeholder="Selecciona un dispositivo"
                            onOpen={() => setActive("trainingSource")}
                            onClose={() => clearActive("trainingSource")}
                        />
                    </FieldWrap>
                </View>
            ) : null}
        </View>
    );
}
