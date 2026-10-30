import { useBrowser, type BrowserState } from "../browser/store";
import { isIncognitoProfile } from "../browser/model";
import { removeTabs } from "../tabs/tabs";
import { keptDeletedGroups, restoringGroup } from "../pins/closedTabs";

export function closedGroupsForProfile(s: Pick<BrowserState, "profiles" | "closedGroups">, profileId: string) {
  if (!s.profiles[profileId] || isIncognitoProfile(profileId)) return [];
  return s.closedGroups.filter((entry) => entry.tabs.length > 0 && entry.tabs.every((tab) => tab.profileId === profileId));
}

export const closedGroupsOnBarForProfile = (s: Pick<BrowserState, "profiles" | "closedGroups">, profileId: string) =>
  closedGroupsForProfile(s, profileId).filter((entry) => entry.hiddenFromBar !== true);

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

export function unpinClosedGroup(entryId: string, profileId: string) {
  const s = useBrowser.getState();
  const entry = closedGroupsForProfile(s, profileId).find((group) => group.id === entryId);
  if (!entry || entry.hiddenFromBar) return;
  useBrowser.setState({ closedGroups: s.closedGroups.map((group) => group.id === entryId ? { ...group, hiddenFromBar: true } : group) });
}

export function reopenClosedGroupInNewWindow(entryId: string, profileId: string) {
  const s = useBrowser.getState();
  const entry = closedGroupsForProfile(s, profileId).find((group) => group.id === entryId);
  if (!entry) return;
  const windowId = s.createWindow({ profileId });
  const created = useBrowser.getState();
  const blank = created.windows[windowId]?.tabIds ?? [];
  useBrowser.setState(removeTabs(restoringGroup(created, entry, windowId, true), blank, false));
}

export function openClosedGroupTab(entryId: string, index: number, windowId: string) {
  const s = useBrowser.getState();
  const window = s.windows[windowId];
  if (!window || window.kind !== "main" || !Number.isInteger(index)) return;
  const entry = closedGroupsForProfile(s, window.profileId).find((group) => group.id === entryId);
  const tab = entry?.tabs[index];
  if (tab?.url) s.newTab(windowId, { url: tab.url, profileId: window.profileId });
}
