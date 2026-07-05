// src/features/health/cardio/components/CardioRouteMap.tsx
// Real map renderer for outdoor Cardio routes using persisted routePoints.
// Falls back to routeSummary start/end markers when detailed points are missing.

import React from "react";
import { Text, View } from "react-native";
import MapView, { Marker, Polyline, type LatLng, type Region } from "react-native-maps";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutRoutePoint, WorkoutRouteSummary } from "@/src/types/workoutDay.types";

type Props = {
    hasRoute: boolean;
    routeSummary: WorkoutRouteSummary | null;
    routePoints?: WorkoutRoutePoint[] | null;
    height?: number;
};

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function hasLatLng(
    latitude: number | null | undefined,
    longitude: number | null | undefined
): boolean {
    return isFiniteNumber(latitude) && isFiniteNumber(longitude);
}

function toLatLngFromPoint(point: WorkoutRoutePoint): LatLng | null {
    if (!hasLatLng(point.latitude, point.longitude)) {
        return null;
    }

    return {
        latitude: point.latitude,
        longitude: point.longitude,
    };
}

function getCoordinates(routePoints: WorkoutRoutePoint[] | null | undefined): LatLng[] {
    if (!Array.isArray(routePoints)) {
        return [];
    }

    return routePoints
        .map((point) => toLatLngFromPoint(point))
        .filter((point): point is LatLng => point !== null);
}

function buildRegionFromCoordinates(coordinates: LatLng[]): Region | null {
    if (coordinates.length === 0) {
        return null;
    }

    let minLatitude = coordinates[0]?.latitude ?? 0;
    let maxLatitude = coordinates[0]?.latitude ?? 0;
    let minLongitude = coordinates[0]?.longitude ?? 0;
    let maxLongitude = coordinates[0]?.longitude ?? 0;

    for (const coordinate of coordinates) {
        minLatitude = Math.min(minLatitude, coordinate.latitude);
        maxLatitude = Math.max(maxLatitude, coordinate.latitude);
        minLongitude = Math.min(minLongitude, coordinate.longitude);
        maxLongitude = Math.max(maxLongitude, coordinate.longitude);
    }

    const latitude = (minLatitude + maxLatitude) / 2;
    const longitude = (minLongitude + maxLongitude) / 2;
    const rawLatitudeDelta = Math.abs(maxLatitude - minLatitude);
    const rawLongitudeDelta = Math.abs(maxLongitude - minLongitude);

    return {
        latitude,
        longitude,
        latitudeDelta: Math.max(rawLatitudeDelta * 1.6, 0.01),
        longitudeDelta: Math.max(rawLongitudeDelta * 1.6, 0.01),
    };
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

function buildStartCoordinate(input: {
    coordinates: LatLng[];
    routeSummary: WorkoutRouteSummary | null;
}): LatLng | null {
    const first = input.coordinates[0] ?? null;
    if (first) {
        return first;
    }

    if (!input.routeSummary) {
        return null;
    }

    if (!hasLatLng(input.routeSummary.startLatitude, input.routeSummary.startLongitude)) {
        return null;
    }

    return {
        latitude: input.routeSummary.startLatitude ?? 0,
        longitude: input.routeSummary.startLongitude ?? 0,
    };
}

function buildEndCoordinate(input: {
    coordinates: LatLng[];
    routeSummary: WorkoutRouteSummary | null;
}): LatLng | null {
    const last = input.coordinates[input.coordinates.length - 1] ?? null;
    if (last) {
        return last;
    }

    if (!input.routeSummary) {
        return null;
    }

    if (!hasLatLng(input.routeSummary.endLatitude, input.routeSummary.endLongitude)) {
        return null;
    }

    return {
        latitude: input.routeSummary.endLatitude ?? 0,
        longitude: input.routeSummary.endLongitude ?? 0,
    };
}

function EmptyMapMessage(props: { title: string; message: string }) {
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
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                {props.title}
            </Text>
            <Text style={{ color: colors.mutedText }}>{props.message}</Text>
        </View>
    );
}

export function CardioRouteMap({
    hasRoute,
    routeSummary,
    routePoints,
    height = 260,
}: Props) {
    const { colors } = useTheme();
    const coordinates = React.useMemo(() => getCoordinates(routePoints), [routePoints]);

    if (!hasRoute) {
        return (
            <EmptyMapMessage
                title="Mapa"
                message="Esta sesión no trae ruta disponible todavía."
            />
        );
    }

    if (!routeSummary && coordinates.length === 0) {
        return (
            <EmptyMapMessage
                title="Mapa"
                message="Hay una ruta marcada como disponible, pero todavía no tenemos coordenadas suficientes para renderizar el mapa."
            />
        );
    }

    const region = buildRegionFromCoordinates(coordinates) ??
        (routeSummary ? buildRegionFromSummary(routeSummary) : null);

    if (!region) {
        return (
            <EmptyMapMessage
                title="Mapa"
                message="La ruta existe, pero el resumen actual no trae inicio/fin o bounds suficientes para ubicarla."
            />
        );
    }

    const startCoordinate = buildStartCoordinate({ coordinates, routeSummary });
    const endCoordinate = buildEndCoordinate({ coordinates, routeSummary });
    const canDrawPolyline = coordinates.length >= 2;

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
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                    Mapa
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    {canDrawPolyline
                        ? `Ruta completa con ${coordinates.length} puntos registrados.`
                        : "Mapa con punto de inicio/fin. Falta más detalle para dibujar la línea completa."}
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
                    {canDrawPolyline ? (
                        <Polyline
                            coordinates={coordinates}
                            strokeColor={colors.primary}
                            strokeWidth={5}
                        />
                    ) : null}

                    {startCoordinate ? (
                        <Marker
                            coordinate={startCoordinate}
                            title="Inicio"
                            description="Punto inicial detectado"
                            pinColor="green"
                        />
                    ) : null}

                    {endCoordinate ? (
                        <Marker
                            coordinate={endCoordinate}
                            title="Fin"
                            description="Punto final detectado"
                            pinColor="red"
                        />
                    ) : null}
                </MapView>
            </View>
        </View>
    );
}

export default CardioRouteMap;
