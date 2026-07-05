// src/features/health/cardio/components/CardioSessionBadge.tsx

import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { CardioActivityType } from "@/src/types/health/cardio/healthCardio.types";
import { getCardioActivityLabel } from "@/src/utils/health/cardio/cardioSession.helpers";

type Props = {
    activityType: CardioActivityType;
};

export function CardioSessionBadge({ activityType }: Props) {
    const { colors } = useTheme();

    const isWalking = activityType === "walking";

    const backgroundColor = isWalking ? colors.surface : colors.primary;
    const textColor = isWalking ? colors.text : colors.primaryText;
    const borderColor = isWalking ? colors.border : colors.primary;

    return (
        <View
            style={{
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                borderWidth: 1,
                borderColor,
                backgroundColor,
            }}
        >
            <Text
                style={{
                    fontSize: 12,
                    fontWeight: "900",
                    color: textColor,
                }}
            >
                {getCardioActivityLabel(activityType)}
            </Text>
        </View>
    );
}

export default CardioSessionBadge;
