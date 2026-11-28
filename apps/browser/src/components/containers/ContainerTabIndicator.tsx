import { useId } from "react";
import Svg, { Circle, Defs, Mask, Rect } from "react-native-svg";
import { containerDotLayout } from "../sidebar/engineMarkLayout";

export function ContainerTabIndicator({ color, size }: {
  color: string;
  size: number;
}) {
  const maskId = `container-dot-${useId().replace(/:/g, "")}`;
  const { diameter, ...dotLayout } = containerDotLayout(size);
  return (
    <Svg pointerEvents="none" accessible={false} viewBox="0 0 11 11" style={[CUTOUT, { width: diameter, height: diameter }, dotLayout]}>
      <Defs>
        <Mask id={maskId} x="0" y="0" width="11" height="11" maskUnits="userSpaceOnUse">
          <Rect width="11" height="11" fill="white" />
          <Circle cx="1" cy="1" r="5" fill="black" />
        </Mask>
      </Defs>
      <Circle cx="5.5" cy="5.5" r="3.5" fill={color} mask={`url(#${maskId})`} />
    </Svg>
  );
}

const CUTOUT = {
  position: "absolute",
  width: 11,
  height: 11,
} as const;

