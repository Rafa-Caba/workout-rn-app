import React from "react";
import { GymCheckDayRouteScreen } from "./GymCheckDayRouteScreen";

type Props = { date: string };

export function GymCheckDayContainerScreen({ date }: Props) {
    return <GymCheckDayRouteScreen date={date} />;
}