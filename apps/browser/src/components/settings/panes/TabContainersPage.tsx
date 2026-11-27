import { useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, View } from "react-native";
import { useShallow } from "zustand/react/shallow";
import { prompt } from "../../../platform/dialogs";
import { confirm } from "../../../state/app/system";
import { showToast } from "../../../state/app/toasts";
import { useBrowser } from "../../../state/browser/store";
import { canDeleteContainer } from "../../../state/containers/containers";
import { createWebsiteContainer, deleteWebsiteContainer, updateWebsiteContainer } from "../../../state/containers/actions";
import { SETTINGS_WINDOW_ID } from "../../../state/settings/settingsWindows";
import { PROFILE_COLORS } from "../../ui/theme";
import { Button, DialogActions, DialogTitle, Sheet, Symbol, Text, TextField, space } from "../../ui";
import { Group, Row, SectionHeader, FormField } from "../Form";
import { ProfileSubPage } from "./ProfileSubPage";
import { closeSettingsSheet, showSettingsSheet } from "../../../state/settings/sheet";
import { CONTAINER_SYMBOLS } from "../../containers/containerSymbols";
import type { WebsiteContainer } from "../../../state/browser/types";
import { ThemeSwatches } from "../ThemeEditor";
import { closeContainerIconPicker, openContainerIconPicker } from "../../containers/ContainerIconPicker";

export function TabContainersPage() {
  const [removal, setRemoval] = useState<{ containerId: string; phase: "confirming" | "removing" } | null>(null);
  const removalInProgress = useRef(false);
  const editButtons = useRef(new Map<string, View>());
  useBrowser(
    useShallow((s) => [
      s.containers,
      s.tabs,
      s.closedTabs,
      s.closedWindows,
      s.parkedPins,
      s.closedGroups,
      s.deletedGroups,
      s.cleanedTabs,
    ] as const),
  );
  const state = useBrowser.getState();
  const containers = Object.values(state.containers).map((container) => ({ container, canDelete: canDeleteContainer(state, container.id) }));
  const removalName = containers.find(({ container }) => container.id === removal?.containerId)?.container.name;
  const headerDescription = removal
    ? removal.phase === "confirming"
      ? `Confirm or cancel removal of ${removalName ?? "this container"}. Other actions are paused.`
      : `Clearing ${removalName ?? "this container"}’s cookies and site data. Other actions are paused.`
    : "Names are shared across profiles. Cookies and site data stay separate in each profile.";

  const create = async () => {
    const name = await prompt({ title: "New Tab Container", placeholder: "Container name", confirmTitle: "Create", windowId: SETTINGS_WINDOW_ID });
    if (name !== null) {
      const id = createWebsiteContainer({ name });
      const created = useBrowser.getState().containers[id];
      if (created) AccessibilityInfo.announceForAccessibility(`${created.name} tab container created.`);
    }
  };

  const remove = async (containerId: string, name: string) => {
    if (removalInProgress.current) return;
    removalInProgress.current = true;
    setRemoval({ containerId, phase: "confirming" });
    try {
      const { confirmed } = await confirm({
        title: `Remove “${name}”?`,
        message: "Its cookies and site data will be cleared from every profile.",
        confirmTitle: "Remove Container",
        destructive: true,
        windowId: SETTINGS_WINDOW_ID,
      });
      if (!confirmed) {
        AccessibilityInfo.announceForAccessibility(`Removal of ${name} canceled.`);
        return;
      }
      setRemoval({ containerId, phase: "removing" });
      AccessibilityInfo.announceForAccessibility(`Removing ${name}. Clearing its cookies and site data. Other container actions are paused.`);
      if (!(await deleteWebsiteContainer(containerId))) {
        showToast(SETTINGS_WINDOW_ID, "Couldn't remove this container", "Ardia kept it because its website data couldn't be cleared.", { icon: "exclamationmark.triangle" });
        AccessibilityInfo.announceForAccessibility(`Couldn't remove ${name}. Its website data couldn't be cleared, so the container was kept.`);
      } else {
        AccessibilityInfo.announceForAccessibility(`${name} removed. Its cookies and site data were cleared from every profile.`);
      }
    } finally {
      removalInProgress.current = false;
      setRemoval(null);
    }
  };

  return (
    <ProfileSubPage>
      <SectionHeader
        title="Tab containers"
        description={headerDescription}
        action={<Button title="New Tab Container…" icon="plus" disabled={removal !== null} onPress={() => void create()} />}
      />
      <Group>
        {!containers.length ? (
          <Row title="No tab containers yet" description="Create one to give selected tabs their own cookies and site data." />
        ) : (
          containers.map(({ container, canDelete }) => {
            const activeRemoval = removal?.containerId === container.id ? removal : null;
            const isRemoving = activeRemoval?.phase === "removing";
            return (
              <Row
                key={container.id}
                icon={<Symbol name={container.icon} size={17} color={PROFILE_COLORS[container.color].swatch} style={CONTAINER_ICON} />}
                title={container.name}
                description={isRemoving ? "Clearing this container’s cookies and site data…" : canDelete ? undefined : "A tab or recently closed item still uses this container."}
              >
                <Button
                  title="Edit"
                  accessibilityLabel={`Edit ${container.name}`}
                  icon="pencil"
                  focusRef={(view) => {
                    if (view) editButtons.current.set(container.id, view);
                    else editButtons.current.delete(container.id);
                  }}
                  disabled={removal !== null}
                  onPress={() => showSettingsSheet(<ContainerEditorSheet container={container} returnFocusTo={editButtons.current.get(container.id) ?? null} />)}
                />
                <Button
                  variant="icon"
                  icon="trash"
                  size="m"
                  tooltip={isRemoving ? `Removing ${container.name}…` : `Remove ${container.name}…`}
                  accessibilityHint="Clears this container’s cookies and site data from every profile."
                  disabled={!canDelete || removal !== null}
                  onPress={() => void remove(container.id, container.name)}
                />
              </Row>
            );
          })
        )}
      </Group>
    </ProfileSubPage>
  );
}

const CONTAINER_ICON = { width: 22, height: 22 } as const;

function ContainerEditorSheet({ container, returnFocusTo }: { container: WebsiteContainer; returnFocusTo: View | null }) {
  const [name, setName] = useState(container.name);
  const [color, setColor] = useState(container.color);
  const [icon, setIcon] = useState(container.icon);
  const iconButton = useRef<View>(null);
  const close = () => {
    closeContainerIconPicker(SETTINGS_WINDOW_ID, false);
    closeSettingsSheet();
    if (returnFocusTo) requestAnimationFrame(() => {
      const node = findNodeHandle(returnFocusTo);
      if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
    });
  };
  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateWebsiteContainer(container.id, { name: trimmed, color, icon });
    close();
  };

  const openIconPicker = () => {
    void openContainerIconPicker(SETTINGS_WINDOW_ID, iconButton.current, icon, CONTAINER_SYMBOLS, setIcon);
  };

  return (
    <Sheet onClose={close}>
      <DialogTitle
        icon={<Symbol name={icon} size={20} color={PROFILE_COLORS[color].swatch} style={CONTAINER_ICON} />}
        subtitle="Update its name, color, or icon."
      >
        Edit Tab Container
      </DialogTitle>
      <FormField label="Name">
        <TextField value={name} onChangeText={setName} onSubmit={save} autoFocus />
      </FormField>
      <FormField label="Color">
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.m }}>
          <ThemeSwatches color={color} onPreset={setColor} size={24} gap={10} accessibilityLabel="Container color" />
          <Text size="small" tone="textSecondary">{PROFILE_COLORS[color].name}</Text>
        </View>
      </FormField>
      <FormField label="Icon">
        <Button
          focusRef={iconButton}
          title={CONTAINER_SYMBOLS.find((symbol) => symbol.name === icon)?.title ?? icon}
          icon={icon}
          onPress={openIconPicker}
        />
      </FormField>
      <DialogActions>
        <Button title="Cancel" onPress={close} />
        <Button title="Save" kind="primary" disabled={!name.trim()} onPress={save} />
      </DialogActions>
    </Sheet>
  );
}
