import assert from "node:assert/strict";
import { test } from "node:test";
const { clearBrowsingData, startProfileDataCleanup } = await import("./profileData.ts");
const { useBrowser } = await import("../browser/store.ts");
const { engineCalls, containerStorageCalls } = await import("../../test-native/ardiacore.ts");
const model = await import("../browser/model.ts");

test("clearing history leaves container website data alone", async () => {
  useBrowser.getState().hydrate({});
  useBrowser.getState().createContainer({ name: "Work" });
  engineCalls.length = 0;
  containerStorageCalls.length = 0;

  await clearBrowsingData("work-profile", ["history"], 1234);

  assert.deepEqual(engineCalls, [{ domain: "profiles", verb: "clearBrowsingData", profile: "work-profile" }]);
  assert.deepEqual(containerStorageCalls, []);
});

test("clearing cookies and site data clears every container for the selected profile", async () => {
  useBrowser.getState().hydrate({});
  useBrowser.getState().createContainer({ name: "Work" });
  useBrowser.getState().createContainer({ name: "Personal" });
  const containerIds = Object.keys(useBrowser.getState().containers);
  engineCalls.length = 0;
  containerStorageCalls.length = 0;

  await clearBrowsingData("work-profile", ["siteData", "cache"], 1234);

  assert.deepEqual(engineCalls, [
    { domain: "profiles", verb: "clearBrowsingData", profile: "work-profile" },
    ...containerIds.map(() => ({ domain: "profiles", verb: "clearContainerStorage", profile: "work-profile" })),
  ]);
  assert.deepEqual(containerStorageCalls, [
    ...containerIds.map((containerId) => ({ profile: "work-profile", containerId, since: 1234 })),
  ]);
});

test("deleting an unused profile removes its persistent container storage", async () => {
  useBrowser.getState().hydrate({});
  const containerId = useBrowser.getState().createContainer({ name: "Work" });
  const profileId = useBrowser.getState().createProfile({ name: "Doomed" });
  const engine = model.engineProfile(useBrowser.getState(), profileId);
  containerStorageCalls.length = 0;
  const stop = startProfileDataCleanup();
  useBrowser.getState().deleteProfile(profileId);
  try {
    await new Promise((resolve) => setTimeout(resolve, 1600));
    assert.ok(containerStorageCalls.some((call) => call.profile === engine && call.containerId === containerId && call.since === undefined));
    assert.ok(!useBrowser.getState().orphanedProfileData.includes(engine));
  } finally {
    stop();
  }
});
