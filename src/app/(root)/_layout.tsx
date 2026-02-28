import { Slot } from "expo-router";
import React from "react";

import { QueryProvider } from "@/src/providers/QueryProvider";

export default function RootLayout() {
    return (
        <QueryProvider>
            <Slot />
        </QueryProvider>
    );
}