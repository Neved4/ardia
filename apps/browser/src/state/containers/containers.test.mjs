import assert from "node:assert/strict";
import { test } from "node:test";

const { createContainersSlice } = await import("./containers.ts");
const native = await import("../../test-native/index.ts");
const { useBrowser } = await import("../browser/store.ts");
const { deleteWebsiteContainer, moveTabToWebsiteContainer } = await import("./actions.ts");
const model = await import("../browser/model.ts");

function setup() {
  let state = { containers: {}, tabs: {} };
  const set = (patch) => {
    state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  };
  const get = () => state;
  const actions = createContainersSlice(set, get);
  Object.assign(state, actions);
  return { get, ...actions };
}

test("containers can be created, edited, and removed when no tab uses them", () => {
  const s = setup();
  const id = s.createContainer({ name: " Work ", color: "green", icon: "briefcase.fill" });
  assert.deepEqual(s.get().containers[id], { id, name: "Work", color: "green", icon: "briefcase.fill", createdAt: s.get().containers[id].createdAt });
  s.updateContainer(id, { name: "Office", color: "purple" });
  assert.equal(s.get().containers[id].name, "Office");
  assert.equal(s.get().containers[id].color, "purple");
  assert.equal(s.deleteContainer(id), true);
  assert.equal(s.get().containers[id], undefined);
});

test("a container in use by a tab cannot be removed", () => {
  const s = setup();
  const id = s.createContainer();
  s.get().tabs["tab-1"] = { id: "tab-1", containerId: id };
  assert.equal(s.deleteContainer(id), false);
  assert.ok(s.get().containers[id]);
});

test("removing an unused container clears its profile storage before deleting it", async () => {
  useBrowser.getState().hydrate({});
  const id = useBrowser.getState().createContainer({ name: "Work" });
  native.engineCalls.length = 0;

  assert.equal(await deleteWebsiteContainer(id), true);
  assert.equal(useBrowser.getState().containers[id], undefined);
  assert.deepEqual(native.engineCalls.filter((entry) => entry.verb === "deleteContainerStorage"), [
    { domain: "profiles", verb: "deleteContainerStorage", profile: "" },
  ]);
});

test("a container stays available if its website data cannot be cleared", async () => {
  useBrowser.getState().hydrate({});
  const id = useBrowser.getState().createContainer({ name: "Work" });
  native.containerStorageClear.ok = false;

  assert.equal(await deleteWebsiteContainer(id), false);
  assert.ok(useBrowser.getState().containers[id]);
  native.containerStorageClear.ok = true;
});

test("a tab cannot move into a container while its storage is being removed", async () => {
  useBrowser.getState().hydrate({});
  const id = useBrowser.getState().createContainer({ name: "Work" });
  const windowId = useBrowser.getState().createWindow();
  const tabId = model.activeTabId(useBrowser.getState(), windowId);

  const removing = deleteWebsiteContainer(id);
  assert.equal(await moveTabToWebsiteContainer(tabId, id), false);
  assert.equal(await removing, true);
  assert.equal(useBrowser.getState().containers[id], undefined);
});
