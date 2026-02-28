// /src/services/apiConfig.ts
// Centralized API configuration (single source of truth).

import { Platform } from "react-native";

export const API_PREFIX: string = "/api"; // backend prefix
export const API_TIMEOUT_MS = 25_000;

export function getApiBaseUrl(): string {
  const raw = (process as any)?.env?.EXPO_PUBLIC_API_URL;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed;
  }

  // IMPORTANT:
  // - iOS Simulator can use localhost
  // - Android Emulator must use 10.0.2.2 to reach host machine
  // - Physical device needs LAN IP or deployed URL (set EXPO_PUBLIC_API_URL)
  if (__DEV__) {
    if (Platform.OS === "android") return "http://10.0.2.2:4000";
    return "http://localhost:4000";
  }

  return "http://localhost:4000";
}

export function getApiRoot(): string {
  const base = getApiBaseUrl().replace(/\/+$/, "");
  const prefix = API_PREFIX ? `/${API_PREFIX.replace(/^\/+/, "")}` : "";
  return `${base}${prefix}`;
}