// src/services/apiConfig.ts
// Centralized API configuration (single source of truth).

import Constants from "expo-constants";
import { Platform } from "react-native";

export const API_PREFIX = "/api";
export const API_TIMEOUT_MS = 25_000;

type ExpoExtra = {
  apiBaseUrl?: string;
};

function getExtra(): ExpoExtra {
  const cfg = Constants.expoConfig;
  const extra = cfg?.extra as unknown;

  if (extra && typeof extra === "object") {
    const maybe = extra as Record<string, unknown>;
    const apiBaseUrl = typeof maybe.apiBaseUrl === "string" ? maybe.apiBaseUrl : undefined;
    return { apiBaseUrl };
  }

  return {};
}

export function getApiBaseUrl(): string {
  const extra = getExtra();
  const fromExtra = typeof extra.apiBaseUrl === "string" ? extra.apiBaseUrl.trim() : "";

  if (fromExtra.length > 0) return fromExtra;

  // DEV fallbacks
  if (__DEV__) {
    if (Platform.OS === "android") return "http://10.0.2.2:4000";
    return "http://localhost:4000";
  }

  // Safe fallback
  return "https://workout-api-cabanillas.up.railway.app";
}

export function getApiRoot(): string {
  const base = getApiBaseUrl().replace(/\/+$/, "");
  const prefix = API_PREFIX ? `/${API_PREFIX.replace(/^\/+/, "")}` : "";
  return `${base}${prefix}`;
}