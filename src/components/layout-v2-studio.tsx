"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiCopy,
  FiGrid,
  FiImage,
  FiMoon,
  FiSun,
  FiTrash2,
  FiUploadCloud,
} from "react-icons/fi";

import type { LayoutBackgroundMode, LayoutSummary } from "@/lib/domain";
import { formatFileSize } from "@/lib/format";
import {
  arrangeLayoutItems,
  clampLayoutItemToCanvas,
  duplicateLayoutItemGrid,
  getDefaultLayoutItemSize,
  findNextOpenLayoutPosition,
  MIN_LAYOUT_ITEM_SIZE_MM,
} from "@/lib/layout-editor";
import {
  LAYOUT_CANVAS_HEIGHT_MM,
  LAYOUT_CANVAS_WIDTH_MM,
} from "@/lib/layout-config";

type CanvasArtwork = {
  id: string;
  name: string;
  bytes: number;
  previewUrl: string;
  widthPx: number;
  heightPx: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  zIndex: number;
};

type LayoutMutationResponse = {
  layout?: LayoutSummary;
  error?: string;
};

type CanvasInteraction =
  | {
      type: "drag";
      itemId: string;
      startClientX: number;
      startClientY: number;
      originXMm: number;
      originYMm: number;
    }
  | {
      type: "resize";
      itemId: string;
      startClientX: number;
      startClientY: number;
      originWidthMm: number;
      originHeightMm: number;
      originXMm: number;
      originYMm: number;
      aspectRatio: number;
    };

function isImageFile(file: File) {
  return (
    file.type.toLowerCase().startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(file.name)
  );
}

async function readArtworkFile(file: File) {
  const previewUrl = URL.createObjectURL(file);

  return new Promise<{
    previewUrl: string;
    widthPx: number;
    heightPx: number;
  }>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        previewUrl,
        widthPx: image.naturalWidth || 1,
        heightPx: image.naturalHeight || 1,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error(`We couldn't load ${file.name}.`));
    };

    image.src = previewUrl;
  });
}

function toCanvasRect(item: CanvasArtwork) {
  return {
    id: item.id,
    xMm: item.xMm,
    yMm: item.yMm,
    widthMm: item.widthMm,
    heightMm: item.heightMm,
  };
}

export function LayoutV2Studio({
  initialLayout,
}: {
  initialLayout: LayoutSummary | null;
}) {
  const [layout, setLayout] = useState<LayoutSummary | null>(initialLayout);
  const [backgroundMode, setBackgroundMode] = useState<LayoutBackgroundMode>(
    initialLayout?.backgroundMode ?? "LIGHT",
  );
  const [artworks, setArtworks] = useState<CanvasArtwork[]>([]);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "error";
    message: string;
  } | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isSavingBackground, setIsSavingBackground] = useState(false);
  const [canvasSizePx, setCanvasSizePx] = useState({ width: 0, height: 0 });
  const [interaction, setInteraction] = useState<CanvasInteraction | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const printableAreaRef = useRef<HTMLDivElement | null>(null);
  const artworkRef = useRef<CanvasArtwork[]>([]);
  const dragDepthRef = useRef(0);
  const autoCreateAttemptedRef = useRef(false);

  useEffect(() => {
    artworkRef.current = artworks;
  }, [artworks]);

  useEffect(() => {
    return () => {
      artworkRef.current.forEach((artwork) => {
        URL.revokeObjectURL(artwork.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    const node = printableAreaRef.current;

    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;

      if (!rect) {
        return;
      }

      setCanvasSizePx({
        width: rect.width,
        height: rect.height,
      });
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (layout || autoCreateAttemptedRef.current) {
      return;
    }

    autoCreateAttemptedRef.current = true;
    let cancelled = false;

    async function createLayoutShell() {
      const response = await fetch("/api/layouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          backgroundMode,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | LayoutMutationResponse
        | null;

      if (cancelled || !response.ok || !payload?.layout) {
        if (!cancelled) {
          setFeedback({
            tone: "error",
            message: payload?.error ?? "We couldn't open the layout workspace.",
          });
        }
        return;
      }

      setLayout(payload.layout);
      setBackgroundMode(payload.layout.backgroundMode);
    }

    void createLayoutShell();

    return () => {
      cancelled = true;
    };
  }, [backgroundMode, layout]);

  useEffect(() => {
    if (!interaction || canvasSizePx.width <= 0 || canvasSizePx.height <= 0) {
      return;
    }

    const activeInteraction = interaction;

    function handlePointerMove(event: PointerEvent) {
      setArtworks((current) =>
        current.map((item) => {
          if (item.id !== activeInteraction.itemId) {
            return item;
          }

          const deltaXMM =
            ((event.clientX - activeInteraction.startClientX) / canvasSizePx.width) *
            LAYOUT_CANVAS_WIDTH_MM;
          const deltaYMM =
            ((event.clientY - activeInteraction.startClientY) / canvasSizePx.height) *
            LAYOUT_CANVAS_HEIGHT_MM;

          if (activeInteraction.type === "drag") {
            return clampLayoutItemToCanvas({
              ...item,
              xMm: activeInteraction.originXMm + deltaXMM,
              yMm: activeInteraction.originYMm + deltaYMM,
            });
          }

          const widthFromDelta = activeInteraction.originWidthMm + deltaXMM;
          const heightDrivenWidth =
            (activeInteraction.originHeightMm + deltaYMM) * activeInteraction.aspectRatio;
          const nextWidthMM = Math.max(
            MIN_LAYOUT_ITEM_SIZE_MM,
            Math.abs(widthFromDelta - activeInteraction.originWidthMm) >=
              Math.abs(heightDrivenWidth - activeInteraction.originWidthMm)
              ? widthFromDelta
              : heightDrivenWidth,
          );
          const maxWidthFromBounds = LAYOUT_CANVAS_WIDTH_MM - activeInteraction.originXMm;
          const maxHeightFromBounds = LAYOUT_CANVAS_HEIGHT_MM - activeInteraction.originYMm;
          const boundedWidthMM = Math.min(nextWidthMM, maxWidthFromBounds);
          const boundedHeightMM = boundedWidthMM / activeInteraction.aspectRatio;

          if (boundedHeightMM > maxHeightFromBounds) {
            const constrainedHeightMM = maxHeightFromBounds;
            const constrainedWidthMM =
              constrainedHeightMM * activeInteraction.aspectRatio;

            return clampLayoutItemToCanvas({
              ...item,
              widthMm: constrainedWidthMM,
              heightMm: constrainedHeightMM,
            });
          }

          return clampLayoutItemToCanvas({
            ...item,
            widthMm: boundedWidthMM,
            heightMm: boundedHeightMM,
          });
        }),
      );
    }

    function handlePointerUp() {
      setInteraction(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [canvasSizePx.height, canvasSizePx.width, interaction]);

  const selectedArtwork =
    artworks.find((artwork) => artwork.id === selectedArtworkId) ?? null;
  const pieces = [...artworks].sort((left, right) => left.zIndex - right.zIndex);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function bringArtworkToFront(artworkId: string) {
    setSelectedArtworkId(artworkId);
    setArtworks((current) => {
      const nextZIndex = current.reduce(
        (max, artwork) => Math.max(max, artwork.zIndex),
        -1,
      ) + 1;

      return current.map((artwork) =>
        artwork.id === artworkId ? { ...artwork, zIndex: nextZIndex } : artwork,
      );
    });
  }

  async function addArtworkFiles(nextFiles: File[]) {
    const imageFiles = nextFiles.filter(isImageFile);

    if (imageFiles.length === 0) {
      setFeedback({
        tone: "error",
        message: "Please add image artwork files.",
      });
      return;
    }

    try {
      const loadedFiles = await Promise.all(
        imageFiles.map(async (file) => ({
          file,
          ...(await readArtworkFile(file)),
        })),
      );

      let lastAddedId: string | null = null;

      setArtworks((current) => {
        const working = [...current];
        let nextZIndex =
          current.reduce((max, artwork) => Math.max(max, artwork.zIndex), -1) + 1;

        for (const loadedFile of loadedFiles) {
          const defaultSize = getDefaultLayoutItemSize({
            widthPx: loadedFile.widthPx,
            heightPx: loadedFile.heightPx,
          });
          const position = findNextOpenLayoutPosition(
            working.map(toCanvasRect),
            defaultSize,
          );
          const nextArtwork: CanvasArtwork = {
            id: crypto.randomUUID(),
            name: loadedFile.file.name,
            bytes: loadedFile.file.size,
            previewUrl: loadedFile.previewUrl,
            widthPx: loadedFile.widthPx,
            heightPx: loadedFile.heightPx,
            widthMm: defaultSize.widthMm,
            heightMm: defaultSize.heightMm,
            xMm: position.xMm,
            yMm: position.yMm,
            zIndex: nextZIndex,
          };

          nextZIndex += 1;
          lastAddedId = nextArtwork.id;
          working.push(nextArtwork);
        }

        return working;
      });

      if (lastAddedId) {
        setSelectedArtworkId(lastAddedId);
      }

      setFeedback(null);
    } catch (error) {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error ? error.message : "We couldn't add that artwork.",
      });
    }
  }

  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);

    if (nextFiles.length > 0) {
      void addArtworkFiles(nextFiles);
    }

    event.target.value = "";
  }

  function removeArtwork(artworkId: string) {
    setArtworks((current) => {
      const artwork = current.find((entry) => entry.id === artworkId);

      if (artwork) {
        URL.revokeObjectURL(artwork.previewUrl);
      }

      const next = current.filter((entry) => entry.id !== artworkId);

      if (selectedArtworkId === artworkId) {
        setSelectedArtworkId(next.at(-1)?.id ?? null);
      }

      return next;
    });
  }

  function handleDragEnter(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFiles(true);
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDraggingFiles(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDraggingFiles(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFiles(false);
    void addArtworkFiles(Array.from(event.dataTransfer.files));
  }

  function startDrag(
    event: React.PointerEvent<HTMLDivElement>,
    artwork: CanvasArtwork,
  ) {
    event.preventDefault();
    event.stopPropagation();
    bringArtworkToFront(artwork.id);
    setInteraction({
      type: "drag",
      itemId: artwork.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originXMm: artwork.xMm,
      originYMm: artwork.yMm,
    });
  }

  function startResize(
    event: React.PointerEvent<HTMLButtonElement>,
    artwork: CanvasArtwork,
  ) {
    event.preventDefault();
    event.stopPropagation();
    bringArtworkToFront(artwork.id);
    setInteraction({
      type: "resize",
      itemId: artwork.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originWidthMm: artwork.widthMm,
      originHeightMm: artwork.heightMm,
      originXMm: artwork.xMm,
      originYMm: artwork.yMm,
      aspectRatio: artwork.widthPx / artwork.heightPx,
    });
  }

  async function handleBackgroundMode(nextMode: LayoutBackgroundMode) {
    if (backgroundMode === nextMode) {
      return;
    }

    const previousMode = backgroundMode;
    setBackgroundMode(nextMode);
    setFeedback(null);

    if (!layout) {
      return;
    }

    setIsSavingBackground(true);

    const response = await fetch(`/api/layouts/${layout.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        backgroundMode: nextMode,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | LayoutMutationResponse
      | null;

    if (!response.ok || !payload?.layout) {
      setBackgroundMode(previousMode);
      setFeedback({
        tone: "error",
        message: payload?.error ?? "We couldn't update the background.",
      });
      setIsSavingBackground(false);
      return;
    }

    setLayout(payload.layout);
    setBackgroundMode(payload.layout.backgroundMode);
    setIsSavingBackground(false);
  }

  function handleArrange() {
    if (artworks.length < 2) {
      return;
    }

    setArtworks((current) => {
      const arranged = arrangeLayoutItems(current.map(toCanvasRect));
      const nextById = new Map(arranged.map((artwork) => [artwork.id, artwork]));

      return current.map((artwork, index) => {
        const next = nextById.get(artwork.id)!;

        return {
          ...artwork,
          xMm: next.xMm,
          yMm: next.yMm,
          zIndex: index,
        };
      });
    });
  }

  function handleDuplicate() {
    if (!selectedArtwork) {
      return;
    }

    setArtworks((current) => {
      const currentSelected =
        current.find((artwork) => artwork.id === selectedArtwork.id) ?? selectedArtwork;
      const duplicates = duplicateLayoutItemGrid(
        toCanvasRect(currentSelected),
        current
          .filter((artwork) => artwork.id !== currentSelected.id)
          .map(toCanvasRect),
      );

      if (duplicates.length === 0) {
        return current;
      }

      let nextZIndex =
        current.reduce((max, artwork) => Math.max(max, artwork.zIndex), -1) + 1;

      return [
        ...current,
        ...duplicates.map((duplicate) => ({
          ...currentSelected,
          id: crypto.randomUUID(),
          xMm: duplicate.xMm,
          yMm: duplicate.yMm,
          zIndex: nextZIndex++,
        })),
      ];
    });
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      <div className="surface-panel">
        <p className="eyebrow">Layout</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openFilePicker}
            className="primary-button px-4 py-2.5 text-sm"
          >
            <FiImage className="size-4" />
            Add artwork
          </button>
          <button
            type="button"
            onClick={handleArrange}
            disabled={artworks.length < 2}
            className="secondary-button px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-45"
          >
            <FiGrid className="size-4" />
            Arrange
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={!selectedArtwork}
            className="secondary-button px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-45"
          >
            <FiCopy className="size-4" />
            Duplicate
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleBackgroundMode("LIGHT")}
            disabled={isSavingBackground}
            className={`secondary-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45 ${
              backgroundMode === "LIGHT" ? "border-[#7e00ff]/35 bg-[#f4ebff]" : ""
            }`}
          >
            <FiSun className="size-4" />
            Light
          </button>
          <button
            type="button"
            onClick={() => void handleBackgroundMode("DARK")}
            disabled={isSavingBackground}
            className={`secondary-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45 ${
              backgroundMode === "DARK" ? "border-[#7e00ff]/35 bg-[#f4ebff]" : ""
            }`}
          >
            <FiMoon className="size-4" />
            Dark
          </button>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="eyebrow">Artwork</p>
          <div className="rounded-full border border-[#7e00ff]/14 bg-[#faf8ff] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#7e00ff]">
            {artworks.length} piece{artworks.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {artworks.length === 0 ? (
            <button
              type="button"
              onClick={openFilePicker}
              className="flex w-full items-center justify-center gap-3 rounded-[1.8rem] border border-dashed border-[#1c1c1c]/10 bg-[#fafafa] px-5 py-8 text-sm font-medium text-[#666666] transition hover:border-[#7e00ff]/24 hover:text-[#1c1c1c]"
            >
              <FiUploadCloud className="size-5 text-[#7e00ff]" />
              Add artwork to start the layout
            </button>
          ) : (
            artworks
              .slice()
              .sort((left, right) => right.zIndex - left.zIndex)
              .map((artwork) => (
                <div
                  key={artwork.id}
                  className={`flex items-center justify-between gap-3 rounded-[1.5rem] border px-4 py-3 transition ${
                    selectedArtworkId === artwork.id
                      ? "border-[#7e00ff]/35 bg-[#f7f1ff]"
                      : "border-[#1c1c1c]/8 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => bringArtworkToFront(artwork.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="relative h-14 w-14 overflow-hidden rounded-[1rem] border border-[#1c1c1c]/8 bg-[#fafafa]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={artwork.previewUrl}
                        alt={artwork.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1c1c1c]">
                        {artwork.name}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#666666]">
                        {Math.round(artwork.widthMm)} × {Math.round(artwork.heightMm)} mm
                      </p>
                      <p className="text-xs uppercase tracking-[0.16em] text-[#666666]">
                        {formatFileSize(artwork.bytes)}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => removeArtwork(artwork.id)}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#1c1c1c]/8 text-[#666666] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Remove ${artwork.name}`}
                  >
                    <FiTrash2 className="size-4" />
                  </button>
                </div>
              ))
          )}
        </div>

        {feedback ? (
          <div className="mt-6 rounded-[1.6rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-700">
            {feedback.message}
          </div>
        ) : null}
      </div>

      <div className="surface-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Template preview</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">
              {layout?.name ?? "Layout"}
            </h2>
          </div>
          <div className="rounded-full border border-[#7e00ff]/14 bg-[#faf8ff] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#7e00ff]">
            560mm × 1000mm
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative aspect-[56/100] w-full max-w-[32rem] rounded-[2rem] border p-4 shadow-[0_18px_50px_rgba(28,28,28,0.08)] transition ${
              backgroundMode === "LIGHT"
                ? "border-[#1c1c1c]/10 bg-[#f7f7f7]"
                : "border-[#1c1c1c]/10 bg-[#1c1c1c]"
            } ${
              isDraggingFiles
                ? backgroundMode === "LIGHT"
                  ? "scale-[0.995] border-[#7e00ff]/35 bg-[#f4ebff]"
                  : "scale-[0.995] border-[#7e00ff]/35 bg-[#2a2236]"
                : ""
            }`}
          >
            <div
              ref={printableAreaRef}
              onPointerDown={() => setSelectedArtworkId(null)}
              className={`relative h-full w-full overflow-hidden rounded-[1.5rem] border border-dashed ${
                backgroundMode === "LIGHT"
                  ? "border-[#1c1c1c]/12 bg-white"
                  : "border-white/18 bg-[#111111]"
              }`}
            >
              {pieces.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className={`flex max-w-xs flex-col items-center gap-4 rounded-[1.8rem] border border-dashed px-8 py-10 transition ${
                      backgroundMode === "LIGHT"
                        ? "border-[#1c1c1c]/10 bg-[#fafafa] text-[#666666] hover:border-[#7e00ff]/24 hover:text-[#1c1c1c]"
                        : "border-white/16 bg-white/3 text-white/72 hover:border-[#7e00ff]/28"
                    }`}
                  >
                    <div className="flex size-15 items-center justify-center rounded-[1.2rem] bg-[#f4ebff] text-[#7e00ff]">
                      <FiUploadCloud className="size-6" />
                    </div>
                    <span className="text-sm font-medium leading-7">
                      Drag artwork here or choose files
                    </span>
                  </button>
                </div>
              ) : null}

              {pieces.map((artwork) => {
                const isSelected = selectedArtworkId === artwork.id;

                return (
                  <div
                    key={artwork.id}
                    onPointerDown={(event) => startDrag(event, artwork)}
                    onClick={(event) => {
                      event.stopPropagation();
                      bringArtworkToFront(artwork.id);
                    }}
                    className={`absolute touch-none overflow-visible rounded-[0.9rem] ${
                      isSelected ? "cursor-grabbing" : "cursor-grab"
                    }`}
                    style={{
                      left: `${(artwork.xMm / LAYOUT_CANVAS_WIDTH_MM) * 100}%`,
                      top: `${(artwork.yMm / LAYOUT_CANVAS_HEIGHT_MM) * 100}%`,
                      width: `${(artwork.widthMm / LAYOUT_CANVAS_WIDTH_MM) * 100}%`,
                      height: `${(artwork.heightMm / LAYOUT_CANVAS_HEIGHT_MM) * 100}%`,
                      zIndex: artwork.zIndex + 1,
                    }}
                  >
                    <div
                      className={`relative h-full w-full overflow-hidden rounded-[0.9rem] border bg-white/90 shadow-[0_10px_28px_rgba(28,28,28,0.12)] ${
                        isSelected
                          ? "border-[#7e00ff] ring-2 ring-[#7e00ff]/20"
                          : "border-[#1c1c1c]/12"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={artwork.previewUrl}
                        alt={artwork.name}
                        draggable={false}
                        className="h-full w-full select-none object-contain"
                      />
                    </div>

                    <span
                      className={`pointer-events-none absolute -top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] shadow-[0_8px_24px_rgba(28,28,28,0.08)] ${
                        isSelected
                          ? "bg-[#7e00ff] text-white"
                          : "bg-white/92 text-[#666666]"
                      }`}
                    >
                      {artwork.name}
                    </span>

                    <button
                      type="button"
                      onPointerDown={(event) => startResize(event, artwork)}
                      onClick={(event) => event.stopPropagation()}
                      className="absolute -bottom-3 -right-3 inline-flex size-7 items-center justify-center rounded-full border-2 border-white bg-[#7e00ff] text-white shadow-[0_10px_24px_rgba(126,0,255,0.22)]"
                      aria-label={`Resize ${artwork.name}`}
                    >
                      <span className="block h-2.5 w-2.5 rounded-[0.35rem] border border-white/85" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
