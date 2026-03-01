// src/features/gymCheck/components/GymCheckDeviceMetricsCard.tsx
import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import { DeviceSelectRN } from "../../components/DeviceSelectRN";
import { GymCheckField } from "./GymCheckField";

type Metrics = Record<string, string | undefined>;

type Props = {
    title?: string;
    metrics: Metrics;
    onChange: (patch: Metrics) => void;
    disabled?: boolean;
    defaultOpen?: boolean;
};

function hasAnyValue(metrics: Metrics): boolean {
    for (const v of Object.values(metrics)) {
        if (String(v ?? "").trim()) return true;
    }
    return false;
}

type FieldKey =
    | "startAt"
    | "endAt"
    | "activeKcal"
    | "totalKcal"
    | "avgHr"
    | "maxHr"
    | "distanceKm"
    | "steps"
    | "elevationGainM"
    | "paceSecPerKm"
    | "cadenceRpm"
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
                    backgroundColor: props.active ? `${colors.primary}14` : "transparent",
                }}
            >
                {props.children}
            </View>
        </View>
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
 * SOFT formatter for typing:
 * - Keep only digits + at most one ":" in correct spot
 * - Allow partial states: "", "1", "12", "12:", "12:3", "12:34"
 * - Does NOT clamp or auto-pad aggressively while typing
 */
function formatTimeTyping(raw: string): string {
    const s = String(raw ?? "");

    // Keep digits only
    const digits = s.replace(/[^\d]/g, "");

    if (digits.length === 0) return "";
    if (digits.length === 1) return digits; // "H"
    if (digits.length === 2) return digits; // "HH"
    if (digits.length === 3) return `${digits.slice(0, 2)}:${digits.slice(2)}`; // "HH:M"
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`; // "HH:MM" (ignore extra)
}

/**
 * Commit formatter for blur:
 * - If empty or incomplete -> return "" (clears)
 * - If complete HH:MM -> clamp and pad
 */
function normalizeTimeOnBlur(raw: string): string {
    const s = String(raw ?? "").trim();
    if (!s) return "";

    // Accept only HH:MM exactly at commit time
    const m = /^(\d{1,2})(?::(\d{1,2}))?$/.exec(s.replace(/[^\d:]/g, ""));
    if (!m) return "";

    const hhPart = m[1] ?? "";
    const mmPart = m[2] ?? "";

    // Require minutes to be present to keep value
    if (!mmPart) return "";

    let hh = Number(hhPart);
    let mm = Number(mmPart);

    hh = clampInt(hh, 0, 23);
    mm = clampInt(mm, 0, 59);

    return `${pad2(hh)}:${pad2(mm)}`;
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

    const setActive = (k: FieldKey) => {
        if (disabled) return;
        setActiveKey(k);
        if (!open) setOpen(true);
    };

    const clearActive = (k: FieldKey) => {
        setActiveKey((cur) => (cur === k ? null : cur));
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
                onPress={() => setOpen((s) => !s)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            >
                <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>{title}</Text>
                    <Text style={{ color: colors.mutedText }}>
                        {hasAny ? "Hay datos guardados" : "Toca para llenar (opcional)"}
                    </Text>
                </View>

                <Text style={{ fontWeight: "900", color: colors.text }}>{open ? "▲" : "▼"}</Text>
            </Pressable>

            {open ? (
                <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                        <FieldWrap active={activeKey === "startAt"}>
                            <GymCheckField
                                label="Hora inicio (HH:MM)"
                                value={String(metrics.startAt ?? "")}
                                onChange={(v) => onChange({ startAt: formatTimeTyping(v) })}
                                placeholder="07:10"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("startAt")}
                                onBlur={() => {
                                    onChange({ startAt: normalizeTimeOnBlur(String(metrics.startAt ?? "")) });
                                    clearActive("startAt");
                                }}
                            />
                        </FieldWrap>

                        <FieldWrap active={activeKey === "endAt"}>
                            <GymCheckField
                                label="Hora fin (HH:MM)"
                                value={String(metrics.endAt ?? "")}
                                onChange={(v) => onChange({ endAt: formatTimeTyping(v) })}
                                placeholder="08:10"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("endAt")}
                                onBlur={() => {
                                    onChange({ endAt: normalizeTimeOnBlur(String(metrics.endAt ?? "")) });
                                    clearActive("endAt");
                                }}
                            />
                        </FieldWrap>
                    </View>

                    {/* The rest stays as-is */}
                    <View style={{ flexDirection: "row", gap: 12 }}>
                        <FieldWrap active={activeKey === "activeKcal"}>
                            <GymCheckField
                                label="Kcal activas"
                                value={String(metrics.activeKcal ?? "")}
                                onChange={(v) => onChange({ activeKcal: v })}
                                placeholder="e.g. 432"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("activeKcal")}
                                onBlur={() => clearActive("activeKcal")}
                            />
                        </FieldWrap>

                        <FieldWrap active={activeKey === "totalKcal"}>
                            <GymCheckField
                                label="Kcal totales"
                                value={String(metrics.totalKcal ?? "")}
                                onChange={(v) => onChange({ totalKcal: v })}
                                placeholder="e.g. 545"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("totalKcal")}
                                onBlur={() => clearActive("totalKcal")}
                            />
                        </FieldWrap>
                    </View>

                    <View style={{ flexDirection: "row", gap: 12 }}>
                        <FieldWrap active={activeKey === "avgHr"}>
                            <GymCheckField
                                label="HR promedio"
                                value={String(metrics.avgHr ?? "")}
                                onChange={(v) => onChange({ avgHr: v })}
                                placeholder="e.g. 121"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("avgHr")}
                                onBlur={() => clearActive("avgHr")}
                            />
                        </FieldWrap>

                        <FieldWrap active={activeKey === "maxHr"}>
                            <GymCheckField
                                label="HR máximo"
                                value={String(metrics.maxHr ?? "")}
                                onChange={(v) => onChange({ maxHr: v })}
                                placeholder="e.g. 160"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("maxHr")}
                                onBlur={() => clearActive("maxHr")}
                            />
                        </FieldWrap>
                    </View>

                    <View style={{ flexDirection: "row", gap: 12 }}>
                        <FieldWrap active={activeKey === "distanceKm"}>
                            <GymCheckField
                                label="Distancia (km)"
                                value={String(metrics.distanceKm ?? "")}
                                onChange={(v) => onChange({ distanceKm: v })}
                                placeholder="e.g. 1.17"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("distanceKm")}
                                onBlur={() => clearActive("distanceKm")}
                            />
                        </FieldWrap>

                        <FieldWrap active={activeKey === "steps"}>
                            <GymCheckField
                                label="Pasos"
                                value={String(metrics.steps ?? "")}
                                onChange={(v) => onChange({ steps: v })}
                                placeholder="e.g. 4200"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("steps")}
                                onBlur={() => clearActive("steps")}
                            />
                        </FieldWrap>
                    </View>

                    <View style={{ flexDirection: "row", gap: 12 }}>
                        <FieldWrap active={activeKey === "elevationGainM"}>
                            <GymCheckField
                                label="Elevación (m)"
                                value={String(metrics.elevationGainM ?? "")}
                                onChange={(v) => onChange({ elevationGainM: v })}
                                placeholder="e.g. 20"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("elevationGainM")}
                                onBlur={() => clearActive("elevationGainM")}
                            />
                        </FieldWrap>

                        <FieldWrap active={activeKey === "paceSecPerKm"}>
                            <GymCheckField
                                label="Ritmo (sec/km)"
                                value={String(metrics.paceSecPerKm ?? "")}
                                onChange={(v) => onChange({ paceSecPerKm: v })}
                                placeholder="e.g. 512"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("paceSecPerKm")}
                                onBlur={() => clearActive("paceSecPerKm")}
                            />
                        </FieldWrap>
                    </View>

                    <View style={{ flexDirection: "row", gap: 12 }}>
                        <FieldWrap active={activeKey === "cadenceRpm"}>
                            <GymCheckField
                                label="Cadencia (rpm)"
                                value={String(metrics.cadenceRpm ?? "")}
                                onChange={(v) => onChange({ cadenceRpm: v })}
                                placeholder="e.g. 78"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("cadenceRpm")}
                                onBlur={() => clearActive("cadenceRpm")}
                            />
                        </FieldWrap>

                        <FieldWrap active={activeKey === "effortRpe"}>
                            <GymCheckField
                                label="Esfuerzo (RPE)"
                                value={String(metrics.effortRpe ?? "")}
                                onChange={(v) => onChange({ effortRpe: v })}
                                placeholder="1-10"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("effortRpe")}
                                onBlur={() => clearActive("effortRpe")}
                            />
                        </FieldWrap>
                    </View>

                    <View style={{ flexDirection: "row", gap: 12 }}>
                        <FieldWrap active={activeKey === "trainingSource"}>
                            <DeviceSelectRN
                                label="Dispositivo"
                                value={metrics.trainingSource ?? null}
                                onChange={(next) => onChange({ trainingSource: next ?? undefined })}
                                disabled={disabled}
                                allowOther
                                placeholder="Selecciona un dispositivo"
                                onOpen={() => setActive("trainingSource")}
                                onClose={() => clearActive("trainingSource")}
                            />
                        </FieldWrap>

                        <FieldWrap active={activeKey === "dayEffortRpe"}>
                            <GymCheckField
                                label="RPE del día"
                                value={String(metrics.dayEffortRpe ?? "")}
                                onChange={(v) => onChange({ dayEffortRpe: v })}
                                placeholder="1-10"
                                keyboardType="numeric"
                                disabled={disabled}
                                onFocus={() => setActive("dayEffortRpe")}
                                onBlur={() => clearActive("dayEffortRpe")}
                            />
                        </FieldWrap>
                    </View>
                </View>
            ) : null}
        </View>
    );
}