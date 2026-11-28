import { View } from "react-native";
import type { WebsiteContainer } from "../../state/browser/types";
import { useSettings } from "../../state/browser/hooks";
import { PROFILE_COLORS } from "../ui/theme";
import { Symbol } from "../ui";

/** The container's pastel symbol overlaid on the favicon. */
export function ContainerTabSymbol({ container, size = 12 }: { container: WebsiteContainer; size?: number }) {
  const shown = useSettings((settings) => settings.showContainerSymbolsInTabs);
  if (!shown) return null;
  const swatch = PROFILE_COLORS[container.color].swatch;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{
        position: "absolute",
        // Center the mark on the favicon corner so the favicon stays readable
        // while the container cue remains visually attached to it.
        right: -6,
        bottom: -6,
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Symbol
        name={container.icon}
        size={size}
        weight="bold"
        color={swatch}
        style={{ width: size, height: size }}
      />
    </View>
  );
}
