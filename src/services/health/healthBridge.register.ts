// /src/services/health/healthBridge.register.ts

import { Platform } from "react-native";

import { healthAndroidBridge } from "@/src/services/health/bridge/healthAndroid.bridge";
import { healthIOSBridge } from "@/src/services/health/bridge/healthIOS.bridge";
import { registerHealthAndroidAdapter } from "@/src/services/health/healthAndroid.service";
import type { NativeHealthBridge } from "@/src/services/health/healthBridge.types";
import { registerHealthIOSAdapter } from "@/src/services/health/healthIOS.service";

/**
 * Keeps the selected bridge instance for app-wide debugging / introspection if needed later.
 */
let registeredBridge: NativeHealthBridge | null = null;

export function getRegisteredHealthBridge(): NativeHealthBridge | null {
    return registeredBridge;
}

export function registerHealthBridge(): NativeHealthBridge | null {
    if (Platform.OS === "ios") {
        registerHealthIOSAdapter(healthIOSBridge);
        registeredBridge = healthIOSBridge;
        return registeredBridge;
    }

    if (Platform.OS === "android") {
        registerHealthAndroidAdapter(healthAndroidBridge);
        registeredBridge = healthAndroidBridge;
        return registeredBridge;
    }

    registeredBridge = null;
    return null;
}