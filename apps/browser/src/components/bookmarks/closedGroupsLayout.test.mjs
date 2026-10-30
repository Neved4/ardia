import assert from "node:assert/strict";
import { test } from "node:test";
import { closedGroupsLayout } from "./closedGroupsLayout.ts";
import { bookmarksBar, barSizes } from "./tokens.ts";

const layout = (frames, maxWidth) => closedGroupsLayout(["a", "b", "c"], frames, maxWidth, bookmarksBar.overflowWidth, bookmarksBar.closedGroupGap);

test("closed group overflow reserves its button and keeps only whole chips clickable", () => {
  const frames = { a: { x: 0, width: 70 }, b: { x: 74, width: 80 }, c: { x: 158, width: 90 } };
  assert.deepEqual(layout(frames, 190), { width: 190, overflowing: true, visible: ["a", "b"] });
  assert.deepEqual(layout(frames, 120), { width: 120, overflowing: true, visible: ["a"] });
  assert.deepEqual(layout(frames, 25), { width: 25, overflowing: true, visible: [] });
  assert.deepEqual(layout(frames, 300), { width: 252, overflowing: false, visible: ["a", "b", "c"] });
});

test("both bar sizes use measured widths when the window changes", () => {
  for (const size of Object.values(barSizes)) {
    const frames = Object.fromEntries(["a", "b", "c"].map((id, i) => [id, { x: i * (size.itemMaxWidth + bookmarksBar.closedGroupGap), width: size.itemMaxWidth }]));
    assert.deepEqual(layout(frames, size.itemMaxWidth + bookmarksBar.overflowWidth).visible, ["a"]);
    assert.deepEqual(layout(frames, 1000).visible, ["a", "b", "c"]);
  }
});

test("unmeasured groups are not clickable and removed groups stop reserving space", () => {
  assert.deepEqual(layout({}, 100).visible, []);
  assert.deepEqual(closedGroupsLayout(["a"], { a: { x: 0, width: 50 }, c: { x: 150, width: 100 } }, 300, 28, 4), { width: 54, overflowing: false, visible: ["a"] });
});
