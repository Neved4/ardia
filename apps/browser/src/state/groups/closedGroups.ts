import { useBrowser, type BrowserState } from "../browser/store";
import { isIncognitoProfile } from "../browser/model";
import { keptDeletedGroups, restoringGroup } from "../pins/closedTabs";

export function closedGroupsForProfile(s: Pick<BrowserState, "profiles" | "closedGroups">, profileId: string) {
  if (!s.profiles[profileId] || isIncognitoProfile(profileId)) return [];
  return s.closedGroups.filter((entry) => entry.tabs.length > 0 && entry.tabs.every((tab) => tab.profileId === profileId));
}

export function reopenClosedGroup(entryId: string, windowId: string) {
  const s = useBrowser.getState();
  const window = s.windows[windowId];
  if (!window || window.kind !== "main") return;
  const entry = closedGroupsForProfile(s, window.profileId).find((group) => group.id === entryId);
  if (entry) useBrowser.setState(restoringGroup(s, entry, windowId, true));
}

export function deleteClosedGroup(entryId: string, profileId: string) {
  const s = useBrowser.getState();
  const entry = closedGroupsForProfile(s, profileId).find((group) => group.id === entryId);
  if (!entry) return;
  useBrowser.setState({
    closedGroups: s.closedGroups.filter((group) => group.id !== entryId),
    deletedGroups: [...keptDeletedGroups(s.deletedGroups), { ...entry, closedAt: Date.now() }],
  });
}
