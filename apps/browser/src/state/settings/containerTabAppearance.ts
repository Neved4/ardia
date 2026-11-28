export const CONTAINER_TAB_INDICATORS = ["dot", "line"] as const;
export type ContainerTabIndicator = (typeof CONTAINER_TAB_INDICATORS)[number];

export function containerTabIndicatorKind(containerTabIndicator: ContainerTabIndicator) {
  switch (containerTabIndicator) {
    case "dot": return "dot";
    default: return null;
  }
}
