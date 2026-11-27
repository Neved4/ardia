import { useBrowser } from "../browser/store";
import { canDeleteContainer } from "./containers";

export function websiteContainersForMenu() {
  const s = useBrowser.getState();
  return Object.values(s.containers).map((container) => ({ container, canDelete: canDeleteContainer(s, container.id) }));
}
