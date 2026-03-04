// app.config.ts
import "dotenv/config";

type ExpoConfigExtra = {
    apiBaseUrl?: string;
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
        splash: {
            image: string;
            resizeMode: "contain" | "cover" | "native";
            backgroundColor: string;
        };
        ios: {
            supportsTablet: boolean;
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
        plugins: Array<string | [string, Record<string, string | number | boolean>]>;
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
    const v = process.env[name];
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t.length ? t : undefined;
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
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/images/adaptive-icon.png",
                backgroundColor: "#ffffff",
            },
            predictiveBackGestureEnabled: false,
            package: "com.rafael_caba.workoutrn",
        },
        web: {
            bundler: "metro",
            output: "static",
            favicon: "./assets/images/favicon.png",
        },
        plugins: ["expo-router", "expo-secure-store", "@react-native-community/datetimepicker"],
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