export const CONTAINER_TAB_INDICATORS = ["dot", "line", "engine"] as const;
export type ContainerTabIndicator = (typeof CONTAINER_TAB_INDICATORS)[number];

export function containerTabIndicatorKind(containerTabIndicator: ContainerTabIndicator) {
  switch (containerTabIndicator) {
    case "dot": return "dot";
    case "line": return "line";
    case "engine": return "engine";
  }
}
