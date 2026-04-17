"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiGrid,
  FiImage,
  FiMoon,
  FiSun,
  FiTrash2,
  FiUploadCloud,
} from "react-icons/fi";

import { ActionStatusModal } from "@/components/action-status-modal";
import {
  clearLayoutDraft,
  loadLayoutDraft,
  saveLayoutDraft,
} from "@/lib/browser-drafts";
import type { LayoutBackgroundMode, LayoutSummary } from "@/lib/domain";
import { formatFileSize } from "@/lib/format";
import {
  arrangeLayoutItems,
  clampLayoutItemToCanvas,
  getDefaultLayoutItemSize,
  findNextOpenLayoutPosition,
  duplicateLayoutItemGrid,
  MIN_LAYOUT_ITEM_SIZE_MM,
} from "@/lib/layout-editor";
import { createLayoutTemplatePdfFile } from "@/lib/layout-template-pdf";
import {
  LAYOUT_CANVAS_HEIGHT_MM,
  LAYOUT_CANVAS_WIDTH_MM,
} from "@/lib/layout-config";
import { queuePendingLayoutUpload } from "@/lib/pending-layout-upload";

type CanvasArtwork = {
  id: string;
  groupId: string;
  name: string;
  bytes: number;
  sourceFile: File;
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

const LAYOUT_BACKGROUND_UI: Record<
  LayoutBackgroundMode,
  {
    outerClassName: string;
    dragOuterClassName: string;
    innerClassName: string;
    emptyStateClassName: string;
  }
> = {
  LIGHT: {
    outerClassName: "border-[#1c1c1c]/10 bg-[#f7f7f7]",
    dragOuterClassName: "border-[#7e00ff]/35 bg-[#f4ebff]",
    innerClassName: "border-[#1c1c1c]/12 bg-white",
    emptyStateClassName:
      "border-[#1c1c1c]/10 bg-[#fafafa] text-[#666666] hover:border-[#7e00ff]/24 hover:text-[#1c1c1c]",
  },
  GREY: {
    outerClassName: "border-[#1c1c1c]/10 bg-[#d6d6d6]",
    dragOuterClassName: "border-[#7e00ff]/35 bg-[#dcd3eb]",
    innerClassName: "border-[#1c1c1c]/12 bg-black/50",
    emptyStateClassName:
      "border-black/10 bg-white/55 text-[#3f3f3f] hover:border-[#7e00ff]/24 hover:text-[#1c1c1c]",
  },
  DARK: {
    outerClassName: "border-[#1c1c1c]/10 bg-[#1c1c1c]",
    dragOuterClassName: "border-[#7e00ff]/35 bg-[#2a2236]",
    innerClassName: "border-white/18 bg-[#111111]",
    emptyStateClassName:
      "border-white/16 bg-white/3 text-white/72 hover:border-[#7e00ff]/28",
  },
};

type CanvasInteraction =
  | {
      type: "drag";
      itemId: string;
      startClientX: number;
      startClientY: number;
      originXMm: number;
      originYMm: number;
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

function revokeUnusedPreviewUrls(
  currentArtworks: CanvasArtwork[],
  nextArtworks: CanvasArtwork[],
) {
  const retainedPreviewUrls = new Set(
    nextArtworks.map((artwork) => artwork.previewUrl),
  );
  const revokedPreviewUrls = new Set<string>();

  currentArtworks.forEach((artwork) => {
    if (
      retainedPreviewUrls.has(artwork.previewUrl) ||
      revokedPreviewUrls.has(artwork.previewUrl)
    ) {
      return;
    }

    URL.revokeObjectURL(artwork.previewUrl);
    revokedPreviewUrls.add(artwork.previewUrl);
  });
}

function sortArtworksByPosition(left: CanvasArtwork, right: CanvasArtwork) {
  if (left.yMm !== right.yMm) {
    return left.yMm - right.yMm;
  }

  if (left.xMm !== right.xMm) {
    return left.xMm - right.xMm;
  }

  return left.zIndex - right.zIndex;
}

function buildArtworkGroupCopies(input: {
  currentArtworks: CanvasArtwork[];
  parentArtwork: CanvasArtwork;
  targetCopyCount: number;
}) {
  const safeTargetCopyCount = Math.max(0, Math.floor(input.targetCopyCount));
  const groupId = input.parentArtwork.groupId;
  const currentChildren = input.currentArtworks
    .filter(
      (artwork) => artwork.groupId === groupId && artwork.id !== input.parentArtwork.id,
    )
    .slice()
    .sort(sortArtworksByPosition);
  const otherArtworks = input.currentArtworks.filter(
    (artwork) => artwork.groupId !== groupId,
  );
  const availableCopySlots = duplicateLayoutItemGrid(
    toCanvasRect(input.parentArtwork),
    otherArtworks.map(toCanvasRect),
  );
  const removedIds = new Set<string>();
  let nextZIndex =
    input.currentArtworks.reduce(
      (max, artwork) => Math.max(max, artwork.zIndex),
      -1,
    ) + 1;

  const nextChildren = availableCopySlots
    .slice(0, safeTargetCopyCount)
    .map((slot, index) => {
      const existingChild = currentChildren[index];

      return {
        ...(existingChild ?? input.parentArtwork),
        id: existingChild?.id ?? crypto.randomUUID(),
        groupId,
        xMm: slot.xMm,
        yMm: slot.yMm,
        widthMm: input.parentArtwork.widthMm,
        heightMm: input.parentArtwork.heightMm,
        zIndex: existingChild?.zIndex ?? nextZIndex++,
      };
    });

  currentChildren.slice(nextChildren.length).forEach((artwork) => {
    removedIds.add(artwork.id);
  });

  return {
    nextArtworks: [...otherArtworks, input.parentArtwork, ...nextChildren],
    removedIds,
  };
}

export function LayoutV2Studio({
  initialLayout,
  userId,
}: {
  initialLayout: LayoutSummary | null;
  userId: string;
}) {
  const router = useRouter();
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
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [templateModalPhase, setTemplateModalPhase] = useState<
    "idle" | "uploading" | "success"
  >("idle");
  const [canvasSizePx, setCanvasSizePx] = useState({ width: 0, height: 0 });
  const [interaction, setInteraction] = useState<CanvasInteraction | null>(null);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const printableAreaRef = useRef<HTMLDivElement | null>(null);
  const artworkRef = useRef<CanvasArtwork[]>([]);
  const dragDepthRef = useRef(0);
  const autoCreateAttemptedRef = useRef(false);
  const templateSuccessTimerRef = useRef<number | null>(null);

  useEffect(() => {
    artworkRef.current = artworks;
  }, [artworks]);

  useEffect(() => {
    return () => {
      new Set(artworkRef.current.map((artwork) => artwork.previewUrl)).forEach(
        (previewUrl) => {
          URL.revokeObjectURL(previewUrl);
        },
      );

      if (templateSuccessTimerRef.current) {
        window.clearTimeout(templateSuccessTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateLayoutDraft() {
      const savedDraft = await loadLayoutDraft(userId);

      if (cancelled) {
        return;
      }

      if (!savedDraft || savedDraft.artworks.length === 0) {
        setIsDraftHydrated(true);
        return;
      }

      const assetsById = new Map(
        savedDraft.assets.map((asset) => [
          asset.assetId,
          {
            ...asset,
            previewUrl: URL.createObjectURL(asset.file),
          },
        ]),
      );
      const restoredArtworks = savedDraft.artworks.flatMap((artwork) => {
        const asset = assetsById.get(artwork.groupId);

        if (!asset) {
          return [];
        }

        return [
          {
            id: artwork.id,
            groupId: artwork.groupId,
            name: asset.name,
            bytes: asset.bytes,
            sourceFile: asset.file,
            previewUrl: asset.previewUrl,
            widthPx: asset.widthPx,
            heightPx: asset.heightPx,
            xMm: artwork.xMm,
            yMm: artwork.yMm,
            widthMm: artwork.widthMm,
            heightMm: artwork.heightMm,
            zIndex: artwork.zIndex,
          },
        ];
      });

      setArtworks((current) => {
        revokeUnusedPreviewUrls(current, restoredArtworks);
        return restoredArtworks;
      });
      setBackgroundMode(savedDraft.backgroundMode);
      setSelectedArtworkId(
        restoredArtworks.some((artwork) => artwork.id === savedDraft.selectedArtworkId)
          ? savedDraft.selectedArtworkId
          : restoredArtworks.at(-1)?.id ?? null,
      );
      setIsDraftHydrated(true);
    }

    void hydrateLayoutDraft();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!isDraftHydrated) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (artworks.length === 0) {
        void clearLayoutDraft(userId);
        return;
      }

      const parentArtworks = artworks.filter(
        (artwork) => artwork.id === artwork.groupId,
      );

      void saveLayoutDraft(userId, {
        selectedArtworkId,
        backgroundMode,
        assets: parentArtworks.map((artwork) => ({
          assetId: artwork.groupId,
          name: artwork.name,
          bytes: artwork.bytes,
          widthPx: artwork.widthPx,
          heightPx: artwork.heightPx,
          file: artwork.sourceFile,
        })),
        artworks: artworks.map((artwork) => ({
          id: artwork.id,
          groupId: artwork.groupId,
          xMm: artwork.xMm,
          yMm: artwork.yMm,
          widthMm: artwork.widthMm,
          heightMm: artwork.heightMm,
          zIndex: artwork.zIndex,
        })),
      });
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [artworks, backgroundMode, isDraftHydrated, selectedArtworkId, userId]);

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
    if (!isDraftHydrated || layout || autoCreateAttemptedRef.current) {
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
  }, [backgroundMode, isDraftHydrated, layout]);

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

          return clampLayoutItemToCanvas({
            ...item,
            xMm: activeInteraction.originXMm + deltaXMM,
            yMm: activeInteraction.originYMm + deltaYMM,
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
  const artworkGroups = Array.from(
    artworks.reduce(
      (groups, artwork) => {
        const currentGroup = groups.get(artwork.groupId) ?? {
          groupId: artwork.groupId,
          parent: null as CanvasArtwork | null,
          children: [] as CanvasArtwork[],
          maxZIndex: -1,
        };

        if (artwork.id === artwork.groupId) {
          currentGroup.parent = artwork;
        } else {
          currentGroup.children.push(artwork);
        }

        currentGroup.maxZIndex = Math.max(currentGroup.maxZIndex, artwork.zIndex);
        groups.set(artwork.groupId, currentGroup);
        return groups;
      },
      new Map<
        string,
        {
          groupId: string;
          parent: CanvasArtwork | null;
          children: CanvasArtwork[];
          maxZIndex: number;
        }
      >(),
    ).values(),
  )
    .filter((group) => group.parent)
    .map((group) => ({
      ...group,
      parent: group.parent!,
      children: group.children.slice().sort(sortArtworksByPosition),
    }))
    .sort((left, right) => right.maxZIndex - left.maxZIndex);
  const backgroundUi = LAYOUT_BACKGROUND_UI[backgroundMode];

  function showTemplateUploadingModal() {
    if (templateSuccessTimerRef.current) {
      window.clearTimeout(templateSuccessTimerRef.current);
      templateSuccessTimerRef.current = null;
    }

    setTemplateModalPhase("uploading");
  }

  function showTemplateSuccessModal() {
    if (templateSuccessTimerRef.current) {
      window.clearTimeout(templateSuccessTimerRef.current);
    }

    setTemplateModalPhase("success");

    return new Promise<void>((resolve) => {
      templateSuccessTimerRef.current = window.setTimeout(() => {
        setTemplateModalPhase("idle");
        templateSuccessTimerRef.current = null;
        resolve();
      }, 1800);
    });
  }

  function hideTemplateModal() {
    if (templateSuccessTimerRef.current) {
      window.clearTimeout(templateSuccessTimerRef.current);
      templateSuccessTimerRef.current = null;
    }

    setTemplateModalPhase("idle");
  }

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
          const artworkId = crypto.randomUUID();
          const nextArtwork: CanvasArtwork = {
            id: artworkId,
            groupId: artworkId,
            name: loadedFile.file.name,
            bytes: loadedFile.file.size,
            sourceFile: loadedFile.file,
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
      const artworkToRemove = current.find((entry) => entry.id === artworkId);

      if (!artworkToRemove) {
        return current;
      }

      const removedArtworkIds = new Set(
        artworkToRemove.id === artworkToRemove.groupId
          ? current
              .filter((entry) => entry.groupId === artworkToRemove.groupId)
              .map((entry) => entry.id)
          : [artworkId],
      );
      const next = current.filter((entry) => !removedArtworkIds.has(entry.id));

      revokeUnusedPreviewUrls(current, next);

      if (selectedArtworkId && removedArtworkIds.has(selectedArtworkId)) {
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

  async function handleAddToOrder() {
    if (artworkRef.current.length === 0 || isAddingTemplate) {
      return;
    }

    setIsAddingTemplate(true);
    setFeedback(null);
    showTemplateUploadingModal();

    try {
      const templateFile = await createLayoutTemplatePdfFile({
        artworks: artworkRef.current.map((artwork) => ({
          previewUrl: artwork.previewUrl,
          xMm: artwork.xMm,
          yMm: artwork.yMm,
          widthMm: artwork.widthMm,
          heightMm: artwork.heightMm,
          zIndex: artwork.zIndex,
        })),
        backgroundMode,
      });

      queuePendingLayoutUpload(templateFile);
      await showTemplateSuccessModal();
      router.push("/");
    } catch (error) {
      hideTemplateModal();
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "We couldn't add the template to your order.",
      });
    } finally {
      setIsAddingTemplate(false);
    }
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

    const parentArtwork =
      artworks.find((artwork) => artwork.id === selectedArtwork.groupId) ??
      selectedArtwork;
    const currentCopyCount = artworks.filter(
      (artwork) =>
        artwork.groupId === parentArtwork.groupId && artwork.id !== parentArtwork.id,
    ).length;

    setArtworkCopyCount(parentArtwork.groupId, currentCopyCount + 1);
  }

  function setArtworkCopyCount(groupId: string, rawValue: string | number) {
    const parsedValue =
      typeof rawValue === "number" ? rawValue : Number.parseInt(rawValue, 10);

    if (!Number.isFinite(parsedValue)) {
      return;
    }

    setArtworks((current) => {
      const parentArtwork = current.find((artwork) => artwork.id === groupId);

      if (!parentArtwork) {
        return current;
      }

      const { nextArtworks, removedIds } = buildArtworkGroupCopies({
        currentArtworks: current,
        parentArtwork,
        targetCopyCount: parsedValue,
      });

      if (selectedArtworkId && removedIds.has(selectedArtworkId)) {
        setSelectedArtworkId(parentArtwork.id);
      }

      return nextArtworks;
    });
  }

  function updateArtworkDimension(
    groupId: string,
    dimension: "width" | "height",
    rawValue: string,
  ) {
    const parsedValue = Number(rawValue);

    if (!Number.isFinite(parsedValue)) {
      return;
    }

    setArtworks((current) => {
      const parentArtwork = current.find((artwork) => artwork.id === groupId);

      if (!parentArtwork) {
        return current;
      }

      const safeDimension = Math.max(0, parsedValue);
      const aspectRatio = parentArtwork.widthPx / parentArtwork.heightPx;
      const requestedWidthMm =
        dimension === "width" ? safeDimension : safeDimension * aspectRatio;
      const requestedHeightMm =
        dimension === "height" ? safeDimension : safeDimension / aspectRatio;
      const nextParentArtwork = clampLayoutItemToCanvas({
        ...parentArtwork,
        widthMm: requestedWidthMm,
        heightMm: requestedHeightMm,
      });
      const currentCopyCount = current.filter(
        (artwork) =>
          artwork.groupId === groupId && artwork.id !== nextParentArtwork.id,
      ).length;

      return buildArtworkGroupCopies({
        currentArtworks: current,
        parentArtwork: nextParentArtwork,
        targetCopyCount: currentCopyCount,
      }).nextArtworks;
    });
  }

  function nudgeArtworkDimension(
    groupId: string,
    dimension: "width" | "height",
    delta: number,
  ) {
    const parentArtwork = artworks.find((artwork) => artwork.id === groupId);

    if (!parentArtwork) {
      return;
    }

    const currentValue =
      dimension === "width" ? parentArtwork.widthMm : parentArtwork.heightMm;

    updateArtworkDimension(groupId, dimension, String(Math.round(currentValue + delta)));
  }

  function nudgeArtworkCopyCount(groupId: string, delta: number) {
    const parentArtwork = artworks.find((artwork) => artwork.id === groupId);

    if (!parentArtwork) {
      return;
    }

    const currentCopyCount = artworks.filter(
      (artwork) =>
        artwork.groupId === groupId && artwork.id !== parentArtwork.id,
    ).length;

    setArtworkCopyCount(groupId, currentCopyCount + delta);
  }

  return (
    <>
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
        <div className="mt-5">
          <button
            type="button"
            onClick={openFilePicker}
            className="primary-button px-4 py-2.5 text-sm"
          >
            <FiImage className="size-4" />
            Add artwork
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
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
            onClick={() => void handleBackgroundMode("GREY")}
            disabled={isSavingBackground}
            className={`secondary-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45 ${
              backgroundMode === "GREY" ? "border-[#7e00ff]/35 bg-[#f4ebff]" : ""
            }`}
          >
            <span className="size-3 rounded-full bg-black/50" />
            Grey
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

        <div className="mt-8">
          <p className="eyebrow">Artwork</p>
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
            artworkGroups.map((group) => {
              const isGroupSelected =
                selectedArtworkId === group.parent.id ||
                group.children.some((artwork) => artwork.id === selectedArtworkId);

              return (
                <div
                  key={group.groupId}
                  className={`rounded-[1.5rem] border px-4 py-3 transition ${
                    isGroupSelected
                      ? "border-[#7e00ff]/35 bg-[#f7f1ff]"
                      : "border-[#1c1c1c]/8 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => bringArtworkToFront(group.parent.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="relative h-14 w-14 overflow-hidden rounded-[1rem] border border-[#1c1c1c]/8 bg-[#fafafa]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={group.parent.previewUrl}
                          alt={group.parent.name}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1c1c1c]">
                          {group.parent.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-xs uppercase tracking-[0.16em] text-[#666666]">
                            {formatFileSize(group.parent.bytes)}
                          </p>
                          <span className="rounded-full border border-[#7e00ff]/14 bg-[#faf8ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7e00ff]">
                            {group.children.length === 0
                              ? "Original"
                              : group.children.length === 1
                                ? "1 copy"
                                : `${group.children.length} copies`}
                          </span>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeArtwork(group.parent.id)}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#1c1c1c]/8 text-[#666666] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={
                        group.children.length === 0
                          ? `Remove ${group.parent.name}`
                          : `Remove ${group.parent.name} and its duplicates`
                      }
                    >
                      <FiTrash2 className="size-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["width", "height"] as const).map((dimension) => {
                      const isWidth = dimension === "width";
                      const currentValue = Math.round(
                        isWidth ? group.parent.widthMm : group.parent.heightMm,
                      );

                      return (
                        <label
                          key={dimension}
                          className="inline-flex items-center rounded-full border border-[#7e00ff]/16 bg-white shadow-[0_10px_24px_rgba(126,0,255,0.07)]"
                        >
                          <span className="pl-3 pr-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                            {isWidth ? "W" : "H"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              nudgeArtworkDimension(group.groupId, dimension, -1)
                            }
                            disabled={currentValue <= MIN_LAYOUT_ITEM_SIZE_MM}
                            className="inline-flex size-9 items-center justify-center text-[#666666] transition hover:bg-[#f4ebff] hover:text-[#7e00ff] disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label={`Decrease ${
                              isWidth ? "width" : "height"
                            } for ${group.parent.name}`}
                          >
                            <FiChevronLeft className="size-4" />
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={MIN_LAYOUT_ITEM_SIZE_MM}
                            step={1}
                            value={currentValue}
                            onFocus={(event) => event.currentTarget.select()}
                            onChange={(event) =>
                              updateArtworkDimension(
                                group.groupId,
                                dimension,
                                event.target.value,
                              )
                            }
                            className="w-[4.6rem] border-none bg-transparent text-center text-sm font-semibold tracking-normal text-[#1c1c1c] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            aria-label={`Set ${
                              isWidth ? "width" : "height"
                            } for ${group.parent.name}`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              nudgeArtworkDimension(group.groupId, dimension, 1)
                            }
                            className="inline-flex size-9 items-center justify-center text-[#666666] transition hover:bg-[#f4ebff] hover:text-[#7e00ff]"
                            aria-label={`Increase ${
                              isWidth ? "width" : "height"
                            } for ${group.parent.name}`}
                          >
                            <FiChevronRight className="size-4" />
                          </button>
                          <span className="pl-1 pr-3 text-[11px] uppercase tracking-[0.12em] text-[#666666]">
                            mm
                          </span>
                        </label>
                      );
                    })}

                    <label className="inline-flex items-center rounded-full border border-[#7e00ff]/16 bg-white shadow-[0_10px_24px_rgba(126,0,255,0.07)]">
                      <span className="pl-3 pr-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
                        Copies
                      </span>
                      <button
                        type="button"
                        onClick={() => nudgeArtworkCopyCount(group.groupId, -1)}
                        disabled={group.children.length <= 0}
                        className="inline-flex size-9 items-center justify-center text-[#666666] transition hover:bg-[#f4ebff] hover:text-[#7e00ff] disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label={`Decrease copies for ${group.parent.name}`}
                      >
                        <FiChevronLeft className="size-4" />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={group.children.length}
                        onChange={(event) =>
                          setArtworkCopyCount(group.groupId, event.target.value)
                        }
                        className="w-[4.8rem] border-none bg-transparent text-center text-sm font-semibold tracking-normal text-[#1c1c1c] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        aria-label={`Set copies for ${group.parent.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => nudgeArtworkCopyCount(group.groupId, 1)}
                        className="inline-flex size-9 items-center justify-center text-[#666666] transition hover:bg-[#f4ebff] hover:text-[#7e00ff]"
                        aria-label={`Increase copies for ${group.parent.name}`}
                      >
                        <FiChevronRight className="size-4" />
                      </button>
                    </label>
                  </div>

                  {group.children.length > 0 ? (
                    <div className="mt-4 border-t border-[#1c1c1c]/8 pt-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#666666]">
                          Duplicates
                        </p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#666666]">
                          {group.children.length}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {group.children.map((artwork, index) => (
                          <div
                            key={artwork.id}
                            className={`flex items-center justify-between gap-3 rounded-[1.2rem] border px-3 py-2 transition ${
                              selectedArtworkId === artwork.id
                                ? "border-[#7e00ff]/30 bg-white"
                                : "border-[#1c1c1c]/8 bg-[#fafafa]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => bringArtworkToFront(artwork.id)}
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                              <div className="relative h-10 w-10 overflow-hidden rounded-[0.9rem] border border-[#1c1c1c]/8 bg-white">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={artwork.previewUrl}
                                  alt={`${group.parent.name} duplicate ${index + 1}`}
                                  className="h-full w-full object-contain"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#1c1c1c]">
                                  Duplicate {index + 1}
                                </p>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => removeArtwork(artwork.id)}
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-[#1c1c1c]/8 text-[#666666] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                              aria-label={`Remove duplicate ${index + 1} for ${group.parent.name}`}
                            >
                              <FiTrash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
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
          <p className="eyebrow">Template preview</p>
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
            className={`relative aspect-[56/100] w-full max-w-[32rem] rounded-[2rem] border p-4 shadow-[0_18px_50px_rgba(28,28,28,0.08)] transition ${backgroundUi.outerClassName} ${
              isDraggingFiles ? `scale-[0.995] ${backgroundUi.dragOuterClassName}` : ""
            }`}
          >
            <div
              ref={printableAreaRef}
              onPointerDown={() => setSelectedArtworkId(null)}
              className={`relative h-full w-full overflow-hidden rounded-[1.5rem] border border-dashed ${backgroundUi.innerClassName}`}
            >
              {pieces.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className={`flex max-w-xs flex-col items-center gap-4 rounded-[1.8rem] border border-dashed px-8 py-10 transition ${backgroundUi.emptyStateClassName}`}
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
                return (
                  <div
                    key={artwork.id}
                    onPointerDown={(event) => startDrag(event, artwork)}
                    onClick={(event) => {
                      event.stopPropagation();
                      bringArtworkToFront(artwork.id);
                    }}
                    className="absolute touch-none cursor-grab"
                    style={{
                      left: `${(artwork.xMm / LAYOUT_CANVAS_WIDTH_MM) * 100}%`,
                      top: `${(artwork.yMm / LAYOUT_CANVAS_HEIGHT_MM) * 100}%`,
                      width: `${(artwork.widthMm / LAYOUT_CANVAS_WIDTH_MM) * 100}%`,
                      height: `${(artwork.heightMm / LAYOUT_CANVAS_HEIGHT_MM) * 100}%`,
                      zIndex: artwork.zIndex + 1,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={artwork.previewUrl}
                      alt={artwork.name}
                      draggable={false}
                      className="h-full w-full select-none object-contain"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleAddToOrder()}
          disabled={artworks.length === 0 || isAddingTemplate}
          className="primary-button mt-6 w-full px-5 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isAddingTemplate ? "Preparing template..." : "Add to order"}
          <FiUploadCloud className="size-4" />
        </button>
        </div>
      </section>

      {templateModalPhase !== "idle" ? (
        <ActionStatusModal
          phase={templateModalPhase}
          loadingTitle="Adding template"
          loadingMessage="Please wait while your template is added."
          successTitle="Template added"
          successMessage="Your layout template is now on the upload page."
        />
      ) : null}
    </>
  );
}
