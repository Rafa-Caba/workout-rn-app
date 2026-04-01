// src/features/health/outdoor/components/OutdoorSessionBadge.tsx

import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { OutdoorActivityType } from "@/src/types/health/healthOutdoor.types";
import { getOutdoorActivityLabel } from "@/src/utils/health/outdoor/outdoorSession.helpers";

type Props = {
    activityType: OutdoorActivityType;
};

export function OutdoorSessionBadge({ activityType }: Props) {
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
                {getOutdoorActivityLabel(activityType)}
            </Text>
        </View>
    );
}

export default OutdoorSessionBadge;