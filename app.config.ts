// /app.config.ts
// Expo app configuration for Workout RN.
// Configures EAS updates, HealthKit / Health Connect, Android Google Maps,
// location permissions, and a consistent transparent-logo splash screen.

import "dotenv/config";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type ExpoConfigExtra = {
    apiBaseUrl?: string;
};

type PluginTuple = [string, { [key: string]: JsonValue }];
type PluginEntry = string | PluginTuple;

type AndroidConfig = {
    googleMaps?: {
        apiKey: string;
    };
};

type AppConfig = {
    expo: {
        name: string;
        slug: string;
        version: string;
        orientation: "portrait" | "landscape" | "default";
        icon: string;
        scheme: string;
        userInterfaceStyle: "automatic" | "light" | "dark";
        newArchEnabled?: boolean;
        updates: {
            url: string;
        };
        runtimeVersion: {
            policy: string;
        };

        /**
         * Legacy splash fallback.
         * The expo-splash-screen config plugin below is the preferred source.
         */
        splash: {
            image: string;
            resizeMode: "contain" | "cover" | "native";
            backgroundColor: string;
        };

        ios: {
            supportsTablet: boolean;
            bundleIdentifier?: string;
            infoPlist?: Record<string, JsonValue>;
        };

        android: {
            adaptiveIcon: {
                foregroundImage: string;
                backgroundColor: string;
            };
            predictiveBackGestureEnabled?: boolean;
            package: string;
            permissions?: string[];
            config?: AndroidConfig;
        };

        web: {
            bundler: "metro" | "webpack";
            output: "static" | "single";
            favicon: string;
        };

        plugins: PluginEntry[];

        experiments?: {
            typedRoutes?: boolean;
        };

        extra: {
            router?: Record<string, never>;
            eas: { projectId: string };
            googleMapsAndroidApiKeyConfigured: boolean;
        } & ExpoConfigExtra;
    };
};

function readEnv(name: string): string | undefined {
    const value = process.env[name];

    if (typeof value !== "string") {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function createPluginTuple(name: string, options: { [key: string]: JsonValue }): PluginTuple {
    return [name, options];
}

function createAndroidConfig(googleMapsApiKey: string | undefined): AndroidConfig | undefined {
    if (!googleMapsApiKey) {
        return undefined;
    }

    return {
        googleMaps: {
            apiKey: googleMapsApiKey,
        },
    };
}

/**
 * Splash values.
 * splash-icon.png is now a transparent logo-only PNG, so the native splash
 * background can fill the entire screen without visible image bands.
 */
const splashImage = "./assets/images/splash-icon.png";
const splashBackgroundColor = "#000000";
const splashImageWidth = 300;

const apiBaseUrl =
    readEnv("EXPO_PUBLIC_API_URL") ??
    readEnv("PROD_URL") ??
    "https://workout-api-cabanillas.up.railway.app";

const googleMapsAndroidApiKey = readEnv("GOOGLE_MAPS_ANDROID_API_KEY");

const healthSharePermission =
    "Workout App lee tus datos de sueño, frecuencia cardiaca, pasos, distancia, calorías, elevación, rutas y entrenamientos para autocompletar métricas y mejorar tu seguimiento.";

const healthUpdatePermission =
    "Workout App puede guardar o sincronizar datos relacionados con entrenamientos y salud cuando esa función esté habilitada.";

const locationWhenInUsePermission =
    "Workout App usa tu ubicación mientras la app está en uso para mostrar mapas y registrar sesiones outdoor como walking y running.";

const plugins: PluginEntry[] = [
    "expo-router",
    "expo-secure-store",
    "@react-native-community/datetimepicker",
    createPluginTuple("expo-splash-screen", {
        image: splashImage,
        backgroundColor: splashBackgroundColor,
        resizeMode: "contain",
        imageWidth: splashImageWidth,
        dark: {
            image: splashImage,
            backgroundColor: splashBackgroundColor,
        },
    }),
    createPluginTuple("react-native-health", {
        healthSharePermission,
        healthUpdatePermission,
    }),
    "expo-health-connect",
    createPluginTuple("expo-build-properties", {
        android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 26,
            buildToolsVersion: "35.0.0",
        },
    }),
];

const config: AppConfig = {
    expo: {
        name: "Workout App",
        slug: "workout-rn",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/images/icon.png",
        scheme: "workoutrn",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,
        updates: {
            url: "https://u.expo.dev/90004283-7528-46d7-a1a0-55da280d91bc",
        },
        runtimeVersion: {
            policy: "appVersion",
        },
        splash: {
            image: splashImage,
            resizeMode: "contain",
            backgroundColor: splashBackgroundColor,
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: "com.rafaelcaba.workoutrn",
            infoPlist: {
                NSHealthShareUsageDescription: healthSharePermission,
                NSHealthUpdateUsageDescription: healthUpdatePermission,
                NSLocationWhenInUseUsageDescription: locationWhenInUsePermission,
            },
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/images/adaptive-icon.png",
                backgroundColor: "#0B1220",
            },
            predictiveBackGestureEnabled: false,
            package: "com.rafaelcaba.workoutrn",
            config: createAndroidConfig(googleMapsAndroidApiKey),
            permissions: [
                /**
                 * Android location.
                 * Needed for outdoor live Cardio sessions and maps.
                 */
                "android.permission.ACCESS_FINE_LOCATION",

                /**
                 * Health Connect — sleep.
                 */
                "android.permission.health.READ_SLEEP",

                /**
                 * Health Connect — exercise / workout sessions.
                 */
                "android.permission.health.READ_EXERCISE",
                "android.permission.health.READ_EXERCISE_ROUTES",
                "android.permission.health.WRITE_EXERCISE",
                "android.permission.health.WRITE_EXERCISE_ROUTE",

                /**
                 * Health Connect — common workout metrics.
                 */
                "android.permission.health.READ_HEART_RATE",
                "android.permission.health.READ_DISTANCE",
                "android.permission.health.READ_SPEED",
                "android.permission.health.READ_TOTAL_CALORIES_BURNED",
                "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
                "android.permission.health.READ_ELEVATION_GAINED",
                "android.permission.health.READ_STEPS",
                "android.permission.health.READ_POWER",
                "android.permission.health.WRITE_DISTANCE",
                "android.permission.health.WRITE_SPEED",
                "android.permission.health.WRITE_ACTIVE_CALORIES_BURNED",

                /**
                 * Health Connect — broader history access.
                 * Useful for historical backfill / range imports.
                 */
                "android.permission.health.READ_HEALTH_DATA_HISTORY",
            ],
        },
        web: {
            bundler: "metro",
            output: "static",
            favicon: "./assets/images/favicon.png",
        },
        plugins,
        experiments: {
            typedRoutes: true,
        },
        extra: {
            router: {},
            eas: {
                projectId: "90004283-7528-46d7-a1a0-55da280d91bc",
            },
            apiBaseUrl,
            googleMapsAndroidApiKeyConfigured: Boolean(googleMapsAndroidApiKey),
        },
    },
};

export default config;
