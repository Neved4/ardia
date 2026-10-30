import assert from "node:assert/strict";
import { test } from "node:test";
const { useBrowser } = await import("../browser/store.ts");
const { closedGroupsForProfile, reopenClosedGroup, deleteClosedGroup } = await import("./closedGroups.ts");
const { startPersistence, flushPersistence, loadSession } = await import("../session/persist.ts");
const stub = await import("../../test-native/index.ts");
const S = () => useBrowser.getState();

function setup() {
  S().hydrate({});
  const windowId = S().createWindow({ url: "https://keep.example/" });
  return windowId;
}

function close(windowId, name = "Research") {
  const ids = ["one", "two"].map((host) => S().newTab(windowId, { url: `https://${host}.example/` }));
  const groupId = S().createGroup(ids, { name });
  S().closeGroup(groupId);
  return { entry: S().closedGroups.at(-1), ids, groupId };
}

test("closed groups retain more than twenty snapshots without live tabs or individual closed entries", () => {
  const windowId = setup();
  for (let i = 0; i < 25; i++) {
    const { ids, groupId } = close(windowId, `Group ${i}`);
    assert.ok(ids.every((id) => !S().tabs[id]));
    assert.equal(S().groups[groupId], undefined);
  }
  assert.equal(S().closedGroups.length, 25);
  assert.equal(S().closedTabs.length, 0);
});

test("a closed group opens in the requested same-profile window and only once", () => {
  const original = setup();
  const { entry } = close(original);
  const target = S().createWindow();
  reopenClosedGroup(entry.id, target);
  const group = Object.values(S().groups).find((group) => group.name === "Research");
  assert.equal(group.windowId, target);
  assert.equal(S().closedGroups.length, 0);
  const count = Object.keys(S().tabs).length;
  reopenClosedGroup(entry.id, target);
  assert.equal(Object.keys(S().tabs).length, count);
});

test("closed groups cannot cross profiles or open in private windows", () => {
  const windowId = setup();
  const { entry } = close(windowId);
  const profileId = S().createProfile({ name: "Other" });
  const other = S().createWindow({ profileId });
  assert.deepEqual(closedGroupsForProfile(S(), profileId), []);
  reopenClosedGroup(entry.id, other);
  assert.equal(S().closedGroups.length, 1);
  const privateWindow = S().createWindow({ kind: "private" });
  reopenClosedGroup(entry.id, privateWindow);
  assert.equal(S().closedGroups.length, 1);
  close(privateWindow);
  assert.equal(S().closedGroups.length, 1);
});

test("deleting a closed group preserves separate seven-day recovery and rejects another profile", () => {
  const windowId = setup();
  const { entry } = close(windowId);
  deleteClosedGroup(entry.id, "missing");
  assert.equal(S().closedGroups.length, 1);
  deleteClosedGroup(entry.id, "default");
  assert.equal(S().closedGroups.length, 0);
  assert.equal(S().deletedGroups.at(-1).id, entry.id);
  S().restoreClosed(entry.id, windowId);
  assert.equal(S().deletedGroups.length, 0);
  assert.ok(Object.values(S().groups).some((group) => group.name === "Research"));
});

test("closed groups survive saving and relaunching without restoring their live tabs", () => {
  stub.docs.clear();
  const stop = startPersistence();
  const windowId = setup();
  const { entry, ids } = close(windowId);
  flushPersistence();
  stop();
  assert.ok(stub.docs.has("session.json"));
  S().hydrate(loadSession());
  assert.equal(S().closedGroups[0].id, entry.id);
  assert.ok(ids.every((id) => !S().tabs[id]));
});
