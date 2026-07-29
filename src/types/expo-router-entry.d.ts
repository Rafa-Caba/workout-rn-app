// /src/types/expo-router-entry.d.ts
// Strongly typed declaration for Expo Router's application entry component.

declare module "expo-router/entry" {
    import type { ComponentType } from "react";

    const entry: ComponentType;
    export default entry;
}
