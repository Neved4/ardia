import assert from "node:assert/strict";
import { test } from "node:test";
const { DEFAULT_SETTINGS, SETTING_SPECS, parseSettings } = await import("./settings.ts");

test("container symbols preserve the color marker by default and accept the saved display preference", () => {
  const key = "showContainerSymbolsInTabs";
  assert.equal(DEFAULT_SETTINGS[key], false);
  assert.equal(SETTING_SPECS[key].synced, true);
  assert.equal(parseSettings({ [key]: true })[key], true);
  assert.equal(parseSettings({ [key]: "yes" })[key], false);
});

