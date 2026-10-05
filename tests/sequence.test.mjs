import assert from "node:assert/strict";
import test from "node:test";
import {
  workCardOffset,
  workLastStopOffset,
  workOffsetAtProgress,
  workProgressAtOffset,
  workTrackScreens,
  workTravelScreens,
} from "../src/scene/sequence.ts";

test("route restoration reverses the eased carousel mapping at every progress", () => {
  for (const count of [3, 6]) {
    for (const viewport of [390, 720, 1280]) {
      for (let sample = 0; sample <= 100; sample += 1) {
        const progress = sample / 100;
        const offset = workOffsetAtProgress(progress, viewport, count);
        assert.ok(Math.abs(workProgressAtOffset(offset, viewport, count) - progress) < 0.00001);
      }
    }
  }
});

test("every selected card stop agrees with controls, rendering and history", () => {
  for (const count of [3, 6]) {
    const top = 720;
    for (let index = 0; index < count; index += 1) {
      const stop = workCardOffset(index, top, 720, count);
      assert.ok(Math.abs(workProgressAtOffset(stop - top, 720, count) - index / (count - 1)) < 0.000001);
    }
    const last = workLastStopOffset(top, 720, count);
    assert.equal(last, workCardOffset(count - 1, top, 720, count));
    assert.ok(top + workTravelScreens(count) * 720 > last);
    assert.equal(workTrackScreens(count), workTravelScreens(count) + 1);
  }
});

test("entry and exit travel hold their nearest card", () => {
  assert.equal(workProgressAtOffset(-100, 720, 6), 0);
  assert.equal(workProgressAtOffset(0, 720, 6), 0);
  assert.equal(workProgressAtOffset(workTravelScreens(6) * 720, 720, 6), 1);
  assert.equal(workOffsetAtProgress(0.5, 720, 1), workCardOffset(0, 0, 720, 1));
});
