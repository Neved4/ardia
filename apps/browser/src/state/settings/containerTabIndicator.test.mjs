import assert from "node:assert/strict";
import { test } from "node:test";
const { DEFAULT_SETTINGS, SETTING_SPECS, parseSettings } = await import("./settings.ts");
const { CONTAINER_TAB_INDICATORS, containerTabIndicatorKind } = await import("./containerTabAppearance.ts");

test("tab indicator has one synced choice and defaults to Dot", () => {
  const key = "containerTabIndicator";
  assert.equal(DEFAULT_SETTINGS[key], "dot");
  assert.equal(SETTING_SPECS[key].synced, true);
  for (const mode of CONTAINER_TAB_INDICATORS) assert.equal(parseSettings({ [key]: mode })[key], mode);
  assert.equal(parseSettings({ [key]: "unknown" })[key], "dot");
});

test("each single-choice mode selects exactly its matching tab mark", () => {
  assert.deepEqual(CONTAINER_TAB_INDICATORS.map(containerTabIndicatorKind), ["dot", "line", "engine"]);
});
