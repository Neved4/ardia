import { useEffect, useState } from "react";
import { View, type LayoutRectangle } from "react-native";
import { useSettings, useWindow } from "../../state/browser/hooks";
import { chooseFromMenu } from "../../state/app/menuChoice";
import { deleteClosedGroup, reopenClosedGroup } from "../../state/groups/closedGroups";
import { useClosedGroupsForProfile } from "../../state/groups/hooks";
import { GROUP_COLORS } from "../../state/groups/tokens";
import { ContextMenuArea, useTheme } from "../ui";
import { withAlpha } from "../ui/tokens";
import { BarButton } from "./BarItem";
import { useBarSize } from "./barSize";
import { bookmarksBar } from "./tokens";
import { closedGroupsLayout } from "./closedGroupsLayout";

export function ClosedGroupsBar({ windowId, maxWidth, onWidth }: { windowId: string; maxWidth: number; onWidth: (width: number) => void }) {
  const profileId = useWindow(windowId, (window) => window?.kind === "main" ? window.profileId : "");
  const groups = useClosedGroupsForProfile(profileId);
  const shown = useSettings((s) => s.showClosedGroupsInBookmarksBar);
  const size = useBarSize();
  const theme = useTheme();
  const [frames, setFrames] = useState<Record<string, LayoutRectangle>>({});
  const { width, overflowing, visible } = closedGroupsLayout(groups.map((entry) => entry.id), frames, maxWidth, bookmarksBar.overflowWidth, bookmarksBar.closedGroupGap);
  const fits = (id: string) => visible.includes(id);
  const hidden = groups.filter((group) => !fits(group.id));
  useEffect(() => {
    onWidth(shown && groups.length ? width : 0);
  }, [shown, groups.length, width, onWidth]);
  if (!shown || !groups.length) return null;
  const openOverflow = async () => {
    const id = await chooseFromMenu(hidden.map((entry) => ({ value: entry.id, title: `${entry.group.name || "Untitled group"} (${entry.tabs.length} tabs)`, symbol: "folder" })));
    if (id) reopenClosedGroup(id, windowId);
  };
  const contextMenu = async (entryId: string) => {
    const choice = await chooseFromMenu([{ id: "open", title: "Open Group", symbol: "folder" }, { id: "delete", title: "Delete Group", symbol: "trash" }]);
    if (choice === "open") reopenClosedGroup(entryId, windowId);
    else if (choice === "delete") deleteClosedGroup(entryId, profileId);
  };
  return (
    <View style={{ width, height: size.item, overflow: "hidden", flexShrink: 0 }}>
      <View style={{ width: groups.length * (size.itemMaxWidth + bookmarksBar.closedGroupGap), flexDirection: "row", alignItems: "center" }}>
        {groups.map((entry) => {
          const color = entry.group.color;
          const tint = color && color !== "none" ? (GROUP_COLORS[color]?.hex ?? theme.icon) : theme.icon;
          return (
            <View
              key={entry.id}
              onLayout={(e) => {
                const frame = e.nativeEvent.layout;
                setFrames((previous) => {
                  const old = previous[entry.id];
                  return old?.x === frame.x && old.width === frame.width ? previous : { ...previous, [entry.id]: frame };
                });
              }}
              pointerEvents={fits(entry.id) ? "auto" : "none"}
              style={{ flexShrink: 0, opacity: fits(entry.id) ? 1 : 0, marginRight: bookmarksBar.closedGroupGap, borderRadius: size.radius, backgroundColor: color === "none" ? undefined : withAlpha(tint, bookmarksBar.closedGroupTint) }}
            >
              <ContextMenuArea captureDescendants onContextMenu={() => void contextMenu(entry.id)}>
                <BarButton title={entry.group.name || "Untitled group"} tooltip={`Reopen ${entry.group.name || "group"} (${entry.tabs.length} tabs)`} onPress={() => reopenClosedGroup(entry.id, windowId)} />
              </ContextMenuArea>
            </View>
          );
        })}
      </View>
      {overflowing && (
        <View style={{ position: "absolute", top: 0, right: 0, width: bookmarksBar.overflowWidth, height: size.item }}>
          <BarButton icon="chevron.right.2" tooltip="More closed groups" width={bookmarksBar.overflowWidth} onPress={() => void openOverflow()} />
        </View>
      )}
    </View>
  );
}
