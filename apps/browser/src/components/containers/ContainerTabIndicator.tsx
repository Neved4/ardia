import { View } from "react-native";
import { containerDotLayout } from "../sidebar/engineMarkLayout";

export function ContainerTabIndicator({ color, cutoutColor, size }: {
  color: string;
  cutoutColor: string;
  size: number;
}) {
  const dotLayout = containerDotLayout(size);
  return (
    <View pointerEvents="none" accessible={false} style={[CUTOUT, dotLayout, { backgroundColor: cutoutColor }]}>
      <View style={[DOT, { backgroundColor: color }]} />
    </View>
  );
}

const CUTOUT = {
  position: "absolute",
  width: 11,
  height: 11,
  borderRadius: 6,
  alignItems: "center",
  justifyContent: "center",
} as const;

const DOT = {
  width: 7,
  height: 7,
  borderRadius: 4,
} as const;
