import { PROFILE_COLORS } from "../ui/theme";
import { chooseFromMenu, type ChoiceItem } from "../../state/app/menuChoice";
import { showToast } from "../../state/app/toasts";
import { prompt } from "../../platform/dialogs";
import { createWebsiteContainer, deleteWebsiteContainer, openWebsiteContainerTab, updateWebsiteContainer } from "../../state/containers/actions";
import { websiteContainersForMenu } from "../../state/containers/current";
import { useBrowser } from "../../state/browser/store";
import { PROFILE_SYMBOLS } from "../profiles/ProfileIcons";
import type { WebsiteContainer } from "../../state/browser/types";

type ContainerAction =
  | { kind: "create" }
  | { kind: "rename"; containerId: string }
  | { kind: "open"; containerId: string }
  | { kind: "color"; containerId: string; color: WebsiteContainer["color"] }
  | { kind: "icon"; containerId: string; icon: string }
  | { kind: "delete"; containerId: string };

const colors = Object.entries(PROFILE_COLORS).map(([id, color]) => ({
  value: { kind: "color" as const, containerId: "", color: id as WebsiteContainer["color"] },
  title: color.name,
  swatch: color.swatch,
}));

function menuItems(): ChoiceItem<ContainerAction>[] {
  const containers = websiteContainersForMenu();
  return [
    { value: { kind: "create" }, title: "New Container", symbol: "plus" },
    ...(containers.length ? [{ separator: true as const }] : []),
    ...containers.map(({ container, canDelete }) => ({
      id: `container:${container.id}`,
      title: container.name,
      symbol: container.icon,
      swatch: PROFILE_COLORS[container.color].swatch,
      children: [
        { value: { kind: "open" as const, containerId: container.id }, title: `New Tab in ${container.name}`, symbol: "plus" },
        { value: { kind: "rename" as const, containerId: container.id }, title: "Rename…", symbol: "pencil" },
        {
          id: `color:${container.id}`,
          title: "Color",
          symbol: "paintpalette",
          children: colors.map((item) => ({
            ...item,
            value: { ...item.value, containerId: container.id },
            checked: item.value.color === container.color,
          })),
        },
        {
          id: `icon:${container.id}`,
          title: "Icon",
          symbol: "photo",
          children: PROFILE_SYMBOLS.map((icon) => ({
            value: { kind: "icon" as const, containerId: container.id, icon: icon.name },
            title: icon.title,
            symbol: icon.name,
            checked: icon.name === container.icon,
          })),
        },
        {
          value: { kind: "delete" as const, containerId: container.id },
          title: canDelete ? "Remove Container" : "Remove Container (in use)",
          symbol: "trash",
          enabled: canDelete,
        },
      ],
    })),
  ];
}

export async function openWebsiteContainerMenu(windowId: string, url?: string) {
  const choice = await chooseFromMenu(menuItems());
  if (!choice || typeof choice === "string") return;
  if (choice.kind === "create") {
    const name = await prompt({ title: "New Container", placeholder: "Container name", confirmTitle: "Create", windowId });
    if (name === null) return;
    const id = createWebsiteContainer({ name });
    openWebsiteContainerTab(windowId, id, url);
  } else if (choice.kind === "open") {
    openWebsiteContainerTab(windowId, choice.containerId, url);
  } else if (choice.kind === "rename") {
    const container = useBrowser.getState().containers[choice.containerId];
    if (!container) return;
    const name = await prompt({ title: "Rename Container", value: container.name, placeholder: "Container name", confirmTitle: "Rename", windowId });
    if (name !== null) updateWebsiteContainer(choice.containerId, { name });
  } else if (choice.kind === "color") {
    updateWebsiteContainer(choice.containerId, { color: choice.color });
  } else if (choice.kind === "icon") {
    updateWebsiteContainer(choice.containerId, { icon: choice.icon });
  } else if (choice.kind === "delete") {
    if (!(await deleteWebsiteContainer(choice.containerId))) {
      showToast(windowId, "Couldn't remove this container", "Ardia kept the container because it couldn't clear its website data.", { icon: "exclamationmark.triangle" });
    }
  }
}
