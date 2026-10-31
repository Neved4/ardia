import { GlassEffect, isLiquidGlass } from "@ardia/shell";
import { createContext, memo, useContext } from "react";
import { useTheme, type Theme } from "./theme";
import { controlGlass } from "./tokens";
import { parseColor, toHex } from "../../lib/color";

export const liquidGlass = isLiquidGlass();

const PROFILE_SHARE = 0.15;
const CONTROL_PROFILE_SHARE = 0.8;
const CONTROL_TINT_LIFT = 0.1;
const PANEL_TINT_SHARE = 0.85;
const GLASS_STYLE = { control: "clear", panel: "regular" } as const;

export type GlassKind = keyof typeof GLASS_STYLE;
export type GlassState = keyof typeof controlGlass.dark;
export type GlassLook = { controls: boolean; panes: boolean; tinted: boolean };

export const GlassLookContext = createContext<GlassLook>({ controls: liquidGlass, panes: liquidGlass, tinted: true });

export const useGlassLook = () => useContext(GlassLookContext);

export function useGlass(surface: "controls" | "panes" = "controls"): boolean {
  return useGlassLook()[surface];
}

function profileTinted(theme: Theme, color: string, tinted: boolean, share = PROFILE_SHARE): string {
  const [r, g, b, a] = parseColor(color);
  if (!tinted) return toHex([r, g, b, a * 255]);
  const [pr, pg, pb] = parseColor(theme.backdrop.tintColor);
  const mix = (c: number, p: number) => c + (p - c) * share;
  return toHex([mix(r, pr), mix(g, pg), mix(b, pb), a * 255]);
}

export function controlGlassTint(theme: Theme, state: GlassState, tinted: boolean, dark = theme.dark): string {
  const [r, g, b, a] = parseColor(controlGlass[dark ? "dark" : "light"][state]);
  const lifted = toHex([r, g, b, Math.min(1, a + (tinted ? CONTROL_TINT_LIFT : 0)) * 255]);
  return profileTinted(theme, lifted, tinted, CONTROL_PROFILE_SHARE);
}

export function panelGlassTint(theme: Theme, fill: string, tinted: boolean): string {
  const [r, g, b, a] = parseColor(fill);
  return profileTinted(theme, toHex([r, g, b, Math.min(1, a * PANEL_TINT_SHARE) * 255]), tinted);
}

export const GlassFill = memo(function GlassFill({
  radius,
  border = 0,
  state = "rest",
  panelFill,
  dark,
  theme: shownTheme,
}: {
  radius: number;
  border?: number;
  state?: GlassState;
  panelFill?: string;
  dark?: boolean;
  theme?: Theme;
}) {
  const contextTheme = useTheme();
  const theme = shownTheme ?? contextTheme;
  const { tinted } = useGlassLook();
  const shownDark = dark ?? theme.dark;
  const frame = { position: "absolute", top: -border, left: -border, right: -border, bottom: -border } as const;
  return (
    <GlassEffect
      pointerEvents="none"
      glassStyle={GLASS_STYLE[panelFill ? "panel" : "control"]}
      cornerRadius={radius}
      tint={panelFill ? panelGlassTint(theme, panelFill, tinted) : controlGlassTint(theme, state, tinted, shownDark)}
      dark={shownDark}
      style={frame}
    />
  );
});
