// /app.config.ts
import "dotenv/config";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type ExpoConfigExtra = {
    apiBaseUrl?: string;
};

type PluginTuple = [string, { [key: string]: JsonValue }];
type PluginEntry = string | PluginTuple;

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

const apiBaseUrl =
    readEnv("EXPO_PUBLIC_API_URL") ??
    readEnv("PROD_URL") ??
    "https://workout-api-cabanillas.up.railway.app";

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
            image: "./assets/images/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#0B1220",
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: "com.rafaelcaba.workoutrn",
            infoPlist: {
                NSHealthShareUsageDescription:
                    "Workout App lee tus datos de sueño, frecuencia cardiaca, pasos, distancia y entrenamientos para autocompletar métricas y mejorar tu seguimiento.",
                NSHealthUpdateUsageDescription:
                    "Workout App puede guardar o sincronizar datos relacionados con entrenamientos y salud cuando esa función esté habilitada.",
            },
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/images/adaptive-icon.png",
                backgroundColor: "#ffffff",
            },
            predictiveBackGestureEnabled: false,
            package: "com.rafaelcaba.workoutrn",
        },
        web: {
            bundler: "metro",
            output: "static",
            favicon: "./assets/images/favicon.png",
        },
        plugins: [
            "expo-router",
            "expo-secure-store",
            "@react-native-community/datetimepicker",
            "react-native-health",
            "expo-health-connect",
            [
                "expo-build-properties",
                {
                    android: {
                        compileSdkVersion: 34,
                        targetSdkVersion: 34,
                        minSdkVersion: 26,
                    },
                },
            ],
        ],
        experiments: {
            typedRoutes: true,
        },
        extra: {
            router: {},
            eas: {
                projectId: "90004283-7528-46d7-a1a0-55da280d91bc",
            },
            apiBaseUrl,
        },
    },
};

export default config;