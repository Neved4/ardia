import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const { DEFAULT_SETTINGS, SETTING_SPECS, parseSettings } = await import("./settings.ts");
const { CONTAINER_TAB_INDICATORS, containerTabIndicatorKind } = await import("./containerTabAppearance.ts");
const { containerDotLayout, engineMarkLayout } = await import("../../components/sidebar/engineMarkLayout.ts");

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

test("container dots use the existing engine mark position", () => {
  for (const size of [14, 16, 20, 24]) {
    const { diameter, right } = containerDotLayout(size);
    const { box, offset } = engineMarkLayout(size);
    assert.ok(Math.abs((-right - diameter / 2) - (offset - box / 2)) < 1e-9);
  }
});

test("container dots cut out with transparency instead of painting a tab color", () => {
  const source = readFileSync(new URL("../../components/containers/ContainerTabIndicator.tsx", import.meta.url), "utf8");
  assert.match(source, /<Mask id=\{maskId\}/);
  assert.match(source, /fill="black"/);
  assert.doesNotMatch(source, /cutoutColor|backgroundColor/);
});
