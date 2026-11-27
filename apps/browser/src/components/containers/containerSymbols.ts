import { PROFILE_SYMBOLS } from "../profiles/ProfileIcons";

const DEFAULT_CONTAINER_SYMBOLS = [
  { name: "touchid", title: "Fingerprint" },
  { name: "dollarsign.circle.fill", title: "Banking" },
];

export const CONTAINER_SYMBOLS = [
  ...DEFAULT_CONTAINER_SYMBOLS,
  ...PROFILE_SYMBOLS.filter(({ name }) => !DEFAULT_CONTAINER_SYMBOLS.some((symbol) => symbol.name === name)),
];
