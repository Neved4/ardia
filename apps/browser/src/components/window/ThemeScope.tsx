import { useMemo, type ReactNode } from "react";
import { spaceLookSource } from "../../lib/profileLook";
import { useGlassSettings, useScopedLook } from "../../state/app/theme";
import { isIncognitoProfile } from "../../state/browser/model";
import { useProfileLook } from "../../state/profiles/hooks";
import { GlassLookContext, liquidGlass } from "../ui/Glass";
import { scopedTheme, ThemeContext, type Theme } from "../ui/theme";

export function ThemeScope({ children }: { children: ReactNode }) {
  const theme = useScopedLook(scopedTheme);
  const { glass, panes, tint } = useGlassSettings();
  const look = useMemo(() => ({ controls: liquidGlass && glass, panes: liquidGlass && glass && panes, tint }), [glass, panes, tint]);
  return (
    <ThemeContext.Provider value={theme}>
      <GlassLookContext.Provider value={look}>{children}</GlassLookContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useProfileTheme(profileId: string): Theme {
  return useProfileLook(profileId, (profile, appDark, settings) => scopedTheme(isIncognitoProfile(profileId), profile, appDark, spaceLookSource(settings)));
}
