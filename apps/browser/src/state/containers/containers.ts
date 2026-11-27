import type { StateCreator } from "zustand";
import type { BrowserState } from "../browser/store";
import { newId } from "../browser/model";
import type { WebsiteContainer } from "../browser/types";
import type { ProfileColor } from "../../lib/profileLook";

export function defaultWebsiteContainers(): Record<string, WebsiteContainer> {
  return {
    "container-personal": { id: "container-personal", name: "Personal", color: "blue", icon: "touchid", createdAt: 0 },
    "container-work": { id: "container-work", name: "Work", color: "orange", icon: "briefcase.fill", createdAt: 0 },
    "container-banking": { id: "container-banking", name: "Banking", color: "green", icon: "dollarsign.circle.fill", createdAt: 0 },
    "container-shopping": { id: "container-shopping", name: "Shopping", color: "pink", icon: "cart.fill", createdAt: 0 },
  };
}

const COLORS: ProfileColor[] = ["blue", "green", "orange", "purple", "red", "yellow", "pink", "plum", "neutral"];

export type ContainersSlice = {
  containers: Record<string, WebsiteContainer>;
  createContainer(options?: Partial<Pick<WebsiteContainer, "name" | "color" | "icon">>): string;
  updateContainer(id: string, patch: Partial<Pick<WebsiteContainer, "name" | "color" | "icon">>): void;
  deleteContainer(id: string): boolean;
};

function referenced(s: BrowserState, id: string) {
  const snapshot = (tab: { containerId?: string }) => tab.containerId === id;
  return (
    Object.values(s.tabs).some(snapshot) ||
    (s.closedTabs ?? []).some((item) => snapshot(item.tab)) ||
    (s.closedWindows ?? []).some((item) => item.tabs.some(snapshot)) ||
    Object.values(s.parkedPins ?? {}).some((item) => item.tabs.some(snapshot)) ||
    (s.closedGroups ?? []).some((item) => item.tabs.some(snapshot)) ||
    (s.deletedGroups ?? []).some((item) => item.tabs.some(snapshot)) ||
    (s.cleanedTabs ?? []).some((item) => snapshot(item.tab))
  );
}

export const canDeleteContainer = (s: BrowserState, id: string) => !referenced(s, id);

export const createContainersSlice: StateCreator<BrowserState, [], [], ContainersSlice> = (set, get) => ({
  containers: {},

  createContainer(options = {}) {
    const id = newId("container");
    const name = options.name?.trim();
    const color = options.color ?? COLORS[Object.keys(get().containers).length % COLORS.length]!;
    set((s) => ({
      containers: {
        ...s.containers,
        [id]: { id, name: name || `Container ${Object.keys(s.containers).length + 1}`, color, icon: options.icon ?? "globe", createdAt: Date.now() },
      },
    }));
    return id;
  },

  updateContainer(id, patch) {
    set((s) => {
      const container = s.containers[id];
      if (!container) return {};
      const name = patch.name?.trim();
      return {
        containers: {
          ...s.containers,
          [id]: { ...container, ...patch, ...(patch.name !== undefined ? { name: name || container.name } : {}) },
        },
      };
    });
  },

  deleteContainer(id) {
    const s = get();
    if (!s.containers[id] || referenced(s, id)) return false;
    const containers = { ...s.containers };
    delete containers[id];
    set({ containers });
    return true;
  },
});
