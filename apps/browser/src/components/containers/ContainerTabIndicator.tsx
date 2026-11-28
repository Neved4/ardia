import { View } from "react-native";
import type { WebsiteContainer } from "../../state/browser/types";
import { useSettings } from "../../state/browser/hooks";
import { PROFILE_COLORS } from "../ui/theme";
import { containerTabIndicatorKind } from "../../state/settings/containerTabAppearance";

export function ContainerTabIndicator({ container, cutoutColor }: {
  container: WebsiteContainer;
  cutoutColor: string;
}) {
  const setting = useSettings((settings) => settings.containerTabIndicator);
  const kind = containerTabIndicatorKind(setting);
  const swatch = PROFILE_COLORS[container.color].swatch;
  if (kind === "dot") return (
    <View pointerEvents="none" accessible={false} style={[CUTOUT, { backgroundColor: cutoutColor }]}>
      <View style={[DOT, { backgroundColor: swatch }]} />
    </View>
  );
  return null;
}

const CUTOUT = {
  position: "absolute",
  right: -7,
  bottom: -7,
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
