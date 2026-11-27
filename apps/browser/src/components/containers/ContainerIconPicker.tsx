import { useEffect } from "react";
import { AccessibilityInfo, findNodeHandle, type View } from "react-native";
import { create } from "zustand";
import { iconSymbol, symbolIcon } from "../../lib/customIcon";
import { IconPickerLayer, nearAnchor } from "../iconPicker/IconPickerPanel";
import type { PickerSymbol } from "../iconPicker/IconPickerPanel";

type Anchor = { x: number; y: number; width: number; height: number };
type Picker = { windowId: string; anchor: Anchor | null; focusTarget: View | null; current: string; symbols: PickerSymbol[]; onChoose: (symbol: string) => void };

const useContainerIconPicker = create<{ picker: Picker | null }>()(() => ({ picker: null }));

const measure = (view: View | null): Promise<Anchor | null> =>
  new Promise((resolve) => (view ? view.measureInWindow((x, y, width, height) => resolve(width ? { x, y, width, height } : null)) : resolve(null)));

export async function openContainerIconPicker(windowId: string, focusTarget: View | null, current: string, symbols: PickerSymbol[], onChoose: (symbol: string) => void) {
  useContainerIconPicker.setState({ picker: { windowId, anchor: await measure(focusTarget), focusTarget, current, symbols, onChoose } });
}

export function closeContainerIconPicker(windowId?: string, restoreFocus = true) {
  const picker = useContainerIconPicker.getState().picker;
  if (picker && (!windowId || picker.windowId === windowId)) {
    useContainerIconPicker.setState({ picker: null });
    const target = picker.focusTarget;
    if (restoreFocus && target) requestAnimationFrame(() => {
      const node = findNodeHandle(target);
      if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
    });
  }
}

export function ContainerIconPicker({ windowId }: { windowId: string }) {
  const picker = useContainerIconPicker((state) => (state.picker?.windowId === windowId ? state.picker : null));
  useEffect(() => () => closeContainerIconPicker(windowId, false), [windowId]);
  if (!picker) return null;
  return (
    <IconPickerLayer
      current={symbolIcon(picker.current)}
      symbols={picker.symbols}
      actions={[]}
      symbolsOnly
      onChoose={(symbol) => {
        picker.onChoose(iconSymbol(symbol) ?? symbol);
        closeContainerIconPicker(windowId);
      }}
      onClose={() => closeContainerIconPicker(windowId)}
      placeIn={nearAnchor(picker.anchor)}
    />
  );
}
