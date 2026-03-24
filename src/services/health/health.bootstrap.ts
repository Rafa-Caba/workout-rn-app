// /src/services/health/health.bootstrap.ts

import { Platform } from "react-native";

import { registerHealthBridge } from "@/src/services/health/healthBridge.register";
import type { NativeHealthBridge } from "@/src/services/health/healthBridge.types";

let bootstrapped = false;
let bootstrappedBridge: NativeHealthBridge | null = null;

/**
 * Registers the platform bridge once during app boot.
 * Safe to call multiple times.
 */
export function bootstrapHealthServices(): NativeHealthBridge | null {
    if (bootstrapped) {
        return bootstrappedBridge;
    }

    if (Platform.OS !== "ios" && Platform.OS !== "android") {
        bootstrapped = true;
        bootstrappedBridge = null;
        return bootstrappedBridge;
    }

    bootstrappedBridge = registerHealthBridge();
    bootstrapped = true;

    return bootstrappedBridge;
}

export function getBootstrappedHealthBridge(): NativeHealthBridge | null {
    return bootstrappedBridge;
}