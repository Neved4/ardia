import { call } from "../../platform/engine";
import { useBrowser } from "../browser/store";
import { engineProfile } from "../browser/model";
import type { WebsiteContainer } from "../browser/types";
import { canDeleteContainer } from "./containers";
import { openPageIn } from "../engines/actions";
import { chosenEngine } from "../engines/engines";

const deleting = new Set<string>();

export function createWebsiteContainer(options?: Partial<Pick<WebsiteContainer, "name" | "color" | "icon">>) {
  return useBrowser.getState().createContainer(options);
}

export function openWebsiteContainerTab(windowId: string, containerId: string, url?: string) {
  const s = useBrowser.getState();
  if (!s.containers[containerId] || deleting.has(containerId)) return "";
  return s.newTab(windowId, { url, snapshot: { containerId, engine: "webkit" } });
}

export function moveTabToWebsiteContainer(tabId: string, containerId: string | null) {
  const tab = useBrowser.getState().tabs[tabId];
  if (!tab || (containerId && (!useBrowser.getState().containers[containerId] || deleting.has(containerId)))) return Promise.resolve(false);
  if (containerId) return openPageIn(tabId, "webkit", { containerId });
  return openPageIn(tabId, chosenEngine(useBrowser.getState(), tab.url) ?? "chromium", { containerId: null });
}

export function updateWebsiteContainer(id: string, patch: Partial<Pick<WebsiteContainer, "name" | "color" | "icon">>) {
  useBrowser.getState().updateContainer(id, patch);
}

export async function deleteWebsiteContainer(id: string) {
  const s = useBrowser.getState();
  if (!s.containers[id] || !canDeleteContainer(s, id) || deleting.has(id)) return false;
  deleting.add(id);
  try {
    const profiles = [...new Set(s.profileOrder.map((profileId) => engineProfile(s, profileId)))];
    const results = await Promise.all(profiles.map((profile) => call("profiles.deleteContainerStorage", { profile, containerId: id })));
    if (results.some((result) => !result.ok)) return false;
    return useBrowser.getState().deleteContainer(id);
  } catch {
    return false;
  } finally {
    deleting.delete(id);
  }
}
