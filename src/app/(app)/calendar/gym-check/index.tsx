// src/app/(app)/calendar/gym-check/index.tsx
import { GymCheckSessionScreen } from "@/src/features/gymCheck/screens/GymCheckSessionScreen";
import { GymCheckTraineeSessionScreen } from "@/src/features/gymCheck/screens/GymCheckTraineeSessionScreen";
import { useAuthStore } from "@/src/store/auth.store";
import React from "react";

export default function GymCheckIndexRoute() {
    const user = useAuthStore((s) => s.user);
    const coachMode = user?.coachMode as string | undefined;

    if (coachMode === "TRAINEE") {
        return <GymCheckTraineeSessionScreen />;
    }

    return <GymCheckSessionScreen />;
}