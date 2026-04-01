// src/features/health/outdoor/components/OutdoorRouteMap.tsx

import React from "react";
import { Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutRouteSummary } from "@/src/types/workoutDay.types";

type Props = {
    hasRoute: boolean;
    routeSummary: WorkoutRouteSummary | null;
    height?: number;
};

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function hasLatLng(latitude: number | null | undefined, longitude: number | null | undefined): boolean {
    return isFiniteNumber(latitude) && isFiniteNumber(longitude);
}

function buildRegionFromSummary(routeSummary: WorkoutRouteSummary): Region | null {
    const startAvailable = hasLatLng(
        routeSummary.startLatitude,
        routeSummary.startLongitude
    );

    const endAvailable = hasLatLng(
        routeSummary.endLatitude,
        routeSummary.endLongitude
    );

    const boundsAvailable =
        isFiniteNumber(routeSummary.minLatitude) &&
        isFiniteNumber(routeSummary.maxLatitude) &&
        isFiniteNumber(routeSummary.minLongitude) &&
        isFiniteNumber(routeSummary.maxLongitude);

    if (boundsAvailable) {
        const latitude = ((routeSummary.minLatitude ?? 0) + (routeSummary.maxLatitude ?? 0)) / 2;
        const longitude =
            ((routeSummary.minLongitude ?? 0) + (routeSummary.maxLongitude ?? 0)) / 2;

        const rawLatitudeDelta = Math.abs(
            (routeSummary.maxLatitude ?? latitude) - (routeSummary.minLatitude ?? latitude)
        );

        const rawLongitudeDelta = Math.abs(
            (routeSummary.maxLongitude ?? longitude) - (routeSummary.minLongitude ?? longitude)
        );

        return {
            latitude,
            longitude,
            latitudeDelta: Math.max(rawLatitudeDelta * 1.6, 0.01),
            longitudeDelta: Math.max(rawLongitudeDelta * 1.6, 0.01),
        };
    }

    if (startAvailable && endAvailable) {
        const latitude =
            ((routeSummary.startLatitude ?? 0) + (routeSummary.endLatitude ?? 0)) / 2;
        const longitude =
            ((routeSummary.startLongitude ?? 0) + (routeSummary.endLongitude ?? 0)) / 2;

        const rawLatitudeDelta = Math.abs(
            (routeSummary.endLatitude ?? latitude) - (routeSummary.startLatitude ?? latitude)
        );

        const rawLongitudeDelta = Math.abs(
            (routeSummary.endLongitude ?? longitude) - (routeSummary.startLongitude ?? longitude)
        );

        return {
            latitude,
            longitude,
            latitudeDelta: Math.max(rawLatitudeDelta * 1.8, 0.01),
            longitudeDelta: Math.max(rawLongitudeDelta * 1.8, 0.01),
        };
    }

    if (startAvailable) {
        return {
            latitude: routeSummary.startLatitude ?? 0,
            longitude: routeSummary.startLongitude ?? 0,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
        };
    }

    if (endAvailable) {
        return {
            latitude: routeSummary.endLatitude ?? 0,
            longitude: routeSummary.endLongitude ?? 0,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
        };
    }

    return null;
}

export function OutdoorRouteMap({
    hasRoute,
    routeSummary,
    height = 260,
}: Props) {
    const { colors } = useTheme();

    if (!hasRoute) {
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
                    Mapa
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    Esta sesión no trae ruta disponible todavía.
                </Text>
            </View>
        );
    }

    if (!routeSummary) {
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
                    Mapa
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    Hay una ruta marcada como disponible, pero todavía no tenemos coordenadas suficientes para renderizar el mapa.
                </Text>
            </View>
        );
    }

    const region = buildRegionFromSummary(routeSummary);

    if (!region) {
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
                    Mapa
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    La ruta existe, pero el resumen actual no trae inicio/fin o bounds suficientes para ubicarla.
                </Text>
            </View>
        );
    }

    const hasStart = hasLatLng(
        routeSummary.startLatitude,
        routeSummary.startLongitude
    );

    const hasEnd = hasLatLng(
        routeSummary.endLatitude,
        routeSummary.endLongitude
    );

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 12,
                backgroundColor: colors.surface,
                gap: 10,
            }}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>
                    Mapa
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    Vista real fase 1 con inicio / fin y encuadre de la ruta.
                </Text>
            </View>

            <View
                style={{
                    overflow: "hidden",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                }}
            >
                <MapView
                    style={{ width: "100%", height }}
                    initialRegion={region}
                    region={region}
                    showsCompass
                    rotateEnabled={false}
                    toolbarEnabled={false}
                    pitchEnabled={false}
                >
                    {hasStart ? (
                        <Marker
                            coordinate={{
                                latitude: routeSummary.startLatitude ?? 0,
                                longitude: routeSummary.startLongitude ?? 0,
                            }}
                            title="Inicio"
                            description="Punto inicial detectado"
                            pinColor="green"
                        />
                    ) : null}

                    {hasEnd ? (
                        <Marker
                            coordinate={{
                                latitude: routeSummary.endLatitude ?? 0,
                                longitude: routeSummary.endLongitude ?? 0,
                            }}
                            title="Fin"
                            description="Punto final detectado"
                            pinColor="red"
                        />
                    ) : null}
                </MapView>
            </View>

            <Text style={{ color: colors.mutedText }}>
                La línea completa de la ruta se podrá dibujar cuando el bridge/provider nos entregue los route points completos.
            </Text>
        </View>
    );
}

export default OutdoorRouteMap;