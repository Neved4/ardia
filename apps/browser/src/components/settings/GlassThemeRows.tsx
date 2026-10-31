import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { font, liquidGlass, PopUp, Toggle } from "../ui";
import { useTheme } from "../ui/theme";
import { useSettings } from "../../state/browser/hooks";
import { updateSettings } from "../../state/settings/actions";
import type { Settings } from "../../state/settings/settings";
import { LABEL, Slider } from "./ThemeControls";

const STYLE_OPTIONS: { value: Settings["interfaceStyle"]; title: string }[] = [
  { value: "glass", title: "Glass" },
  { value: "classic", title: "Classic" },
];

const roundAmount = (value: number) => Math.round(value * 100) / 100;

function LabelledRow({ label, children }: { label: string; children: ReactNode }) {
  const ui = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={{ width: LABEL + 10, ...font.small, color: ui.textPrimary }}>{label}</Text>
      {children}
    </View>
  );
}

export function GlassThemeRows() {
  const style = useSettings((s) => s.interfaceStyle);
  const tinted = useSettings((s) => s.glassTintWithTheme);
  const amount = useSettings((s) => s.glassTintAmount);
  const panes = useSettings((s) => s.glassPanes);
  if (!liquidGlass) return null;
  const glass = style === "glass";
  return (
    <>
      <LabelledRow label="Interface style">
        <PopUp value={style} minWidth={96} options={STYLE_OPTIONS} onChange={(interfaceStyle) => updateSettings({ interfaceStyle })} />
      </LabelledRow>
      {glass ? (
        <>
          <LabelledRow label="Tint the glass">
            <Toggle value={tinted} onChange={(glassTintWithTheme) => updateSettings({ glassTintWithTheme })} />
          </LabelledRow>
          {tinted ? <Slider label="Tint amount" value={amount} onChange={(v) => updateSettings({ glassTintAmount: roundAmount(v) })} /> : null}
          <LabelledRow label="Glass panels">
            <Toggle value={panes} onChange={(glassPanes) => updateSettings({ glassPanes })} />
          </LabelledRow>
        </>
      ) : null}
    </>
  );
}
