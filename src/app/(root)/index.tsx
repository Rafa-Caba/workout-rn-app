import { useAuthStore } from "@/src/store/auth.store";
import { Redirect } from "expo-router";

export default function RootIndex() {
    const user = useAuthStore((s) => s.user);

    if (user) return <Redirect href="/(app)/dashboard" />;
    return <Redirect href="/(auth)/login" />;
}