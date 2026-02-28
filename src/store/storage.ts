// /src/store/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StateStorage } from "zustand/middleware";

function createMemoryStorage(): StateStorage {
    const mem = new Map<string, string>();
    return {
        getItem: async (name) => mem.get(name) ?? null,
        setItem: async (name, value) => {
            mem.set(name, value);
        },
        removeItem: async (name) => {
            mem.delete(name);
        },
    };
}

function isAsyncStorageUsable(): boolean {
    try {
        const anyAS = AsyncStorage as any;
        return !!anyAS && typeof anyAS.getItem === "function";
    } catch {
        return false;
    }
}

export function getZustandStorage(): StateStorage {
    if (isAsyncStorageUsable()) return AsyncStorage;
    return createMemoryStorage();
}