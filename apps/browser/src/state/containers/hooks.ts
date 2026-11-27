import { useBrowser } from "../browser/store";

export function useWebsiteContainer(id: string | undefined) {
  return useBrowser((s) => (id ? s.containers[id] : undefined));
}

export function useWebsiteContainerCount() {
  return useBrowser((s) => Object.keys(s.containers).length);
}
