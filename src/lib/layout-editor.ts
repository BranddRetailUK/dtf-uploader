import {
  LAYOUT_CANVAS_HEIGHT_MM,
  LAYOUT_CANVAS_WIDTH_MM,
} from "@/lib/layout-config";

export const LAYOUT_ITEM_GAP_MM = 10;
export const LAYOUT_SCAN_STEP_MM = 8;
export const MIN_LAYOUT_ITEM_SIZE_MM = 0;
export const DEFAULT_LAYOUT_ITEM_MAX_WIDTH_MM = 170;
export const DEFAULT_LAYOUT_ITEM_MAX_HEIGHT_MM = 220;

export type LayoutCanvasItem = {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function intersects(a: LayoutCanvasItem, b: LayoutCanvasItem, gapMm = 0) {
  return !(
    a.xMm + a.widthMm + gapMm <= b.xMm ||
    b.xMm + b.widthMm + gapMm <= a.xMm ||
    a.yMm + a.heightMm + gapMm <= b.yMm ||
    b.yMm + b.heightMm + gapMm <= a.yMm
  );
}

function fitsWithinCanvas(item: Pick<LayoutCanvasItem, "xMm" | "yMm" | "widthMm" | "heightMm">) {
  return (
    item.xMm >= 0 &&
    item.yMm >= 0 &&
    item.xMm + item.widthMm <= LAYOUT_CANVAS_WIDTH_MM &&
    item.yMm + item.heightMm <= LAYOUT_CANVAS_HEIGHT_MM
  );
}

export function getDefaultLayoutItemSize(input: {
  widthPx: number;
  heightPx: number;
}) {
  const safeWidth = Math.max(1, input.widthPx);
  const safeHeight = Math.max(1, input.heightPx);
  const aspectRatio = safeWidth / safeHeight;

  if (
    aspectRatio >=
    DEFAULT_LAYOUT_ITEM_MAX_WIDTH_MM / DEFAULT_LAYOUT_ITEM_MAX_HEIGHT_MM
  ) {
    return {
      widthMm: DEFAULT_LAYOUT_ITEM_MAX_WIDTH_MM,
      heightMm: DEFAULT_LAYOUT_ITEM_MAX_WIDTH_MM / aspectRatio,
    };
  }

  return {
    widthMm: DEFAULT_LAYOUT_ITEM_MAX_HEIGHT_MM * aspectRatio,
    heightMm: DEFAULT_LAYOUT_ITEM_MAX_HEIGHT_MM,
  };
}

export function findNextOpenLayoutPosition(
  existingItems: LayoutCanvasItem[],
  input: {
    widthMm: number;
    heightMm: number;
    gapMm?: number;
    scanStepMm?: number;
  },
) {
  const gapMm = input.gapMm ?? LAYOUT_ITEM_GAP_MM;
  const scanStepMm = input.scanStepMm ?? LAYOUT_SCAN_STEP_MM;
  const maxX = Math.max(0, LAYOUT_CANVAS_WIDTH_MM - input.widthMm);
  const maxY = Math.max(0, LAYOUT_CANVAS_HEIGHT_MM - input.heightMm);

  for (let yMm = 0; yMm <= maxY; yMm += scanStepMm) {
    for (let xMm = 0; xMm <= maxX; xMm += scanStepMm) {
      const candidate = {
        id: "__candidate__",
        xMm,
        yMm,
        widthMm: input.widthMm,
        heightMm: input.heightMm,
      };

      if (
        existingItems.every((item) => !intersects(candidate, item, gapMm))
      ) {
        return { xMm, yMm };
      }
    }
  }

  return { xMm: 0, yMm: 0 };
}

export function clampLayoutItemToCanvas<T extends LayoutCanvasItem>(item: T): T {
  const widthMm = clamp(item.widthMm, MIN_LAYOUT_ITEM_SIZE_MM, LAYOUT_CANVAS_WIDTH_MM);
  const heightMm = clamp(
    item.heightMm,
    MIN_LAYOUT_ITEM_SIZE_MM,
    LAYOUT_CANVAS_HEIGHT_MM,
  );

  return {
    ...item,
    widthMm,
    heightMm,
    xMm: clamp(item.xMm, 0, LAYOUT_CANVAS_WIDTH_MM - widthMm),
    yMm: clamp(item.yMm, 0, LAYOUT_CANVAS_HEIGHT_MM - heightMm),
  };
}

export function arrangeLayoutItems<T extends LayoutCanvasItem>(items: T[]) {
  const nextPlaced: LayoutCanvasItem[] = [];
  const arrangedById = new Map<string, { xMm: number; yMm: number }>();
  const sortedItems = [...items].sort((left, right) => {
    const areaDifference =
      right.widthMm * right.heightMm - left.widthMm * left.heightMm;

    if (areaDifference !== 0) {
      return areaDifference;
    }

    return left.id.localeCompare(right.id);
  });

  for (const item of sortedItems) {
    const position = findNextOpenLayoutPosition(nextPlaced, {
      widthMm: item.widthMm,
      heightMm: item.heightMm,
    });

    arrangedById.set(item.id, position);
    nextPlaced.push({
      ...item,
      ...position,
    });
  }

  return items.map((item) => ({
    ...item,
    ...arrangedById.get(item.id)!,
  }));
}

export function duplicateLayoutItemGrid<T extends LayoutCanvasItem>(
  selectedItem: T,
  otherItems: T[],
  gapMm = LAYOUT_ITEM_GAP_MM,
) {
  const duplicates: T[] = [];
  const occupied = otherItems.map((item) => ({
    id: item.id,
    xMm: item.xMm,
    yMm: item.yMm,
    widthMm: item.widthMm,
    heightMm: item.heightMm,
  }));
  const maxX = LAYOUT_CANVAS_WIDTH_MM - selectedItem.widthMm;
  const maxY = LAYOUT_CANVAS_HEIGHT_MM - selectedItem.heightMm;

  for (
    let yMm = selectedItem.yMm;
    yMm <= maxY;
    yMm += selectedItem.heightMm + gapMm
  ) {
    for (
      let xMm = selectedItem.xMm;
      xMm <= maxX;
      xMm += selectedItem.widthMm + gapMm
    ) {
      if (xMm === selectedItem.xMm && yMm === selectedItem.yMm) {
        continue;
      }

      const candidate = {
        ...selectedItem,
        id: `${selectedItem.id}-${duplicates.length + 1}`,
        xMm,
        yMm,
      };

      if (!fitsWithinCanvas(candidate)) {
        continue;
      }

      if (occupied.some((item) => intersects(candidate, item, 0))) {
        continue;
      }

      duplicates.push(candidate);
      occupied.push(candidate);
    }
  }

  return duplicates;
}
