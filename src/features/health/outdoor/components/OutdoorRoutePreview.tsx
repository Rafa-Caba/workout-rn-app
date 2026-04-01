// src/features/health/outdoor/components/OutdoorRoutePreview.tsx

import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutRouteSummary } from "@/src/types/workoutDay.types";

type Props = {
    hasRoute: boolean;
    routeSummary: WorkoutRouteSummary | null;
};

function formatCoordinatePair(
    latitude: number | null,
    longitude: number | null
): string {
    if (
        typeof latitude !== "number" ||
        !Number.isFinite(latitude) ||
        typeof longitude !== "number" ||
        !Number.isFinite(longitude)
    ) {
        return "—";
    }

    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export function OutdoorRoutePreview({ hasRoute, routeSummary }: Props) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 16,
                backgroundColor: colors.surface,
                gap: 8,
            }}
        >
            <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>
                Ruta
            </Text>

            {!hasRoute ? (
                <Text style={{ color: colors.mutedText }}>
                    Esta sesión no trae ruta disponible todavía.
                </Text>
            ) : null}

            {hasRoute ? (
                <>
                    <Text style={{ color: colors.text }}>
                        Puntos detectados:{" "}
                        <Text style={{ fontWeight: "900" }}>
                            {routeSummary?.pointCount ?? 0}
                        </Text>
                    </Text>

                    <Text style={{ color: colors.text }}>
                        Inicio:{" "}
                        <Text style={{ fontWeight: "700" }}>
                            {formatCoordinatePair(
                                routeSummary?.startLatitude ?? null,
                                routeSummary?.startLongitude ?? null
                            )}
                        </Text>
                    </Text>

                    <Text style={{ color: colors.text }}>
                        Fin:{" "}
                        <Text style={{ fontWeight: "700" }}>
                            {formatCoordinatePair(
                                routeSummary?.endLatitude ?? null,
                                routeSummary?.endLongitude ?? null
                            )}
                        </Text>
                    </Text>

                    <Text style={{ color: colors.mutedText, marginTop: 4 }}>
                        Mapa real: recomendado en fase siguiente con{" "}
                        <Text style={{ fontWeight: "900", color: colors.text }}>
                            react-native-maps
                        </Text>{" "}
                        para mantenerlo simple y nativo en iOS/Android.
                    </Text>
                </>
            ) : null}
        </View>
    );
}

export default OutdoorRoutePreview;