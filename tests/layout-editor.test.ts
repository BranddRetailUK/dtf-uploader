import assert from "node:assert/strict";
import test from "node:test";

import {
  arrangeLayoutItems,
  clampLayoutItemToCanvas,
  duplicateLayoutItemGrid,
  findNextOpenLayoutPosition,
  getDefaultLayoutItemSize,
} from "@/lib/layout-editor";

test("getDefaultLayoutItemSize fits tall artwork inside the default bounds", () => {
  const size = getDefaultLayoutItemSize({
    widthPx: 1000,
    heightPx: 2000,
  });

  assert.equal(size.widthMm, 110);
  assert.equal(size.heightMm, 220);
});

test("findNextOpenLayoutPosition starts at the top left", () => {
  const position = findNextOpenLayoutPosition([], {
    widthMm: 120,
    heightMm: 120,
  });

  assert.deepEqual(position, { xMm: 0, yMm: 0 });
});

test("findNextOpenLayoutPosition fills a row before moving down", () => {
  const position = findNextOpenLayoutPosition(
    [
      {
        id: "item_1",
        xMm: 0,
        yMm: 0,
        widthMm: 120,
        heightMm: 120,
      },
    ],
    {
      widthMm: 120,
      heightMm: 120,
    },
  );

  assert.equal(position.yMm, 0);
  assert.ok(position.xMm > 120);
});

test("clampLayoutItemToCanvas keeps artwork inside the preview bounds", () => {
  const item = clampLayoutItemToCanvas({
    id: "item_1",
    xMm: 540,
    yMm: 980,
    widthMm: 120,
    heightMm: 80,
  });

  assert.equal(item.xMm, 440);
  assert.equal(item.yMm, 920);
});

test("arrangeLayoutItems packs artwork from the top left without overlap", () => {
  const arranged = arrangeLayoutItems([
    {
      id: "item_1",
      xMm: 300,
      yMm: 400,
      widthMm: 180,
      heightMm: 180,
    },
    {
      id: "item_2",
      xMm: 0,
      yMm: 0,
      widthMm: 120,
      heightMm: 120,
    },
  ]);

  assert.deepEqual(
    arranged.map((item) => ({ id: item.id, xMm: item.xMm, yMm: item.yMm })),
    [
      { id: "item_1", xMm: 0, yMm: 0 },
      { id: "item_2", xMm: 192, yMm: 0 },
    ],
  );
});

test("duplicateLayoutItemGrid fills copies within the preview bounds", () => {
  const duplicates = duplicateLayoutItemGrid(
    {
      id: "item_1",
      xMm: 0,
      yMm: 0,
      widthMm: 120,
      heightMm: 120,
    },
    [],
  );

  assert.equal(duplicates.length > 0, true);
  assert.deepEqual(duplicates[0], {
    id: "item_1-1",
    xMm: 130,
    yMm: 0,
    widthMm: 120,
    heightMm: 120,
  });
});
