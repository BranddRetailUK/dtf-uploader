"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiCopy,
  FiGrid,
  FiImage,
  FiLoader,
  FiMoon,
  FiPlus,
  FiSun,
} from "react-icons/fi";

import {
  LAYOUT_BACKGROUND_MODE_LABELS,
  type LayoutBackgroundMode,
  type LayoutSummary,
} from "@/lib/domain";
import { formatDateTime } from "@/lib/format";

type ArtworkDraft = {
  id: string;
  name: string;
  previewUrl: string;
};

type LayoutMutationResponse = {
  layout?: LayoutSummary;
  error?: string;
};

export function LayoutV2Studio({
  initialLayouts,
}: {
  initialLayouts: LayoutSummary[];
}) {
  const [artworks, setArtworks] = useState<ArtworkDraft[]>([]);
  const [layouts, setLayouts] = useState(initialLayouts);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(
    initialLayouts[0]?.id ?? null,
  );
  const [isCreatingLayout, setIsCreatingLayout] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "neutral" | "success" | "error";
    message: string;
  } | null>(null);
  const artworkRef = useRef<ArtworkDraft[]>([]);

  useEffect(() => {
    artworkRef.current = artworks;
  }, [artworks]);

  useEffect(() => {
    return () => {
      artworkRef.current.forEach((artwork) => URL.revokeObjectURL(artwork.previewUrl));
    };
  }, []);

  const selectedLayout =
    layouts.find((layout) => layout.id === selectedLayoutId) ?? null;
  const backgroundMode = selectedLayout?.backgroundMode === "DARK" ? "dark" : "light";

  function handleArtworks(event: React.ChangeEvent<HTMLInputElement>) {
    const next = Array.from(event.target.files ?? []).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }));

    setArtworks((current) => [...current, ...next]);
    event.target.value = "";
  }

  async function handleCreateLayout() {
    setIsCreatingLayout(true);
    setFeedback(null);

    const response = await fetch("/api/layouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const payload = (await response.json().catch(() => null)) as
      | LayoutMutationResponse
      | null;

    if (!response.ok || !payload?.layout) {
      setFeedback({
        tone: "error",
        message: payload?.error ?? "We couldn't create a new layout.",
      });
      setIsCreatingLayout(false);
      return;
    }

    setLayouts((current) => [payload.layout!, ...current]);
    setSelectedLayoutId(payload.layout.id);
    setFeedback({
      tone: "success",
      message: `${payload.layout.name} is ready. Background changes now save to your account.`,
    });
    setIsCreatingLayout(false);
  }

  async function handleBackgroundMode(nextMode: LayoutBackgroundMode) {
    if (!selectedLayout || isSavingLayout || selectedLayout.backgroundMode === nextMode) {
      return;
    }

    const previousMode = selectedLayout.backgroundMode;
    setIsSavingLayout(true);
    setFeedback({
      tone: "neutral",
      message: `Saving ${LAYOUT_BACKGROUND_MODE_LABELS[nextMode].toLowerCase()} background...`,
    });
    setLayouts((current) =>
      current.map((layout) =>
        layout.id === selectedLayout.id
          ? {
              ...layout,
              backgroundMode: nextMode,
            }
          : layout,
      ),
    );

    const response = await fetch(`/api/layouts/${selectedLayout.id}`, {
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
      setLayouts((current) =>
        current.map((layout) =>
          layout.id === selectedLayout.id
            ? {
                ...layout,
                backgroundMode: previousMode,
              }
            : layout,
        ),
      );
      setFeedback({
        tone: "error",
        message: payload?.error ?? "We couldn't save the layout background.",
      });
      setIsSavingLayout(false);
      return;
    }

    setLayouts((current) =>
      current.map((layout) => (layout.id === payload.layout!.id ? payload.layout! : layout)),
    );
    setFeedback({
      tone: "success",
      message: `${payload.layout.name} saved with a ${LAYOUT_BACKGROUND_MODE_LABELS[nextMode].toLowerCase()} background.`,
    });
    setIsSavingLayout(false);
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="surface-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">Layout v2</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-[#1c1c1c] sm:text-5xl">
              Saved layout workspace
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#666666]">
              V2 is now backed by persisted layouts. The workspace saves layout shells
              and background mode already, while artwork uploads, arrange, and
              duplicate are the next steps.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateLayout}
            disabled={isCreatingLayout}
            className="primary-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreatingLayout ? (
              <FiLoader className="size-4 animate-spin" />
            ) : (
              <FiPlus className="size-4" />
            )}
            {isCreatingLayout ? "Creating..." : "New layout"}
          </button>
        </div>

        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow">Saved layouts</p>
            <div className="rounded-full border border-[#7e00ff]/14 bg-[#faf8ff] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#7e00ff]">
              {layouts.length} total
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {layouts.length === 0 ? (
              <div className="rounded-[1.8rem] border border-dashed border-[#1c1c1c]/10 bg-[#fafafa] px-5 py-8 text-sm leading-7 text-[#666666]">
                No saved layouts yet. Create the first one to start the V2 canvas.
              </div>
            ) : (
              layouts.map((layout) => (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => setSelectedLayoutId(layout.id)}
                  className={`flex w-full items-start justify-between gap-4 rounded-[1.6rem] border px-4 py-4 text-left transition ${
                    selectedLayoutId === layout.id
                      ? "border-[#7e00ff]/35 bg-[#f7f1ff]"
                      : "border-[#1c1c1c]/8 bg-white hover:border-[#7e00ff]/20"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-[#1c1c1c]">
                      {layout.name}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#666666]">
                      {LAYOUT_BACKGROUND_MODE_LABELS[layout.backgroundMode]} background •{" "}
                      {layout.items.length} item{layout.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs uppercase tracking-[0.16em] text-[#666666]">
                    {formatDateTime(layout.updatedAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleBackgroundMode("LIGHT")}
            disabled={!selectedLayout || isSavingLayout}
            className={`secondary-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-55 ${
              backgroundMode === "light" ? "border-[#7e00ff]/35 bg-[#f4ebff]" : ""
            }`}
          >
            <FiSun className="size-4" />
            Light
          </button>
          <button
            type="button"
            onClick={() => void handleBackgroundMode("DARK")}
            disabled={!selectedLayout || isSavingLayout}
            className={`secondary-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-55 ${
              backgroundMode === "dark" ? "border-[#7e00ff]/35 bg-[#f4ebff]" : ""
            }`}
          >
            <FiMoon className="size-4" />
            Dark
          </button>
        </div>

        <div className="mt-8 rounded-[1.8rem] border border-[#1c1c1c]/8 bg-[#fafafa] p-5">
          <div className="flex flex-wrap gap-3">
            <label className="primary-button inline-flex cursor-pointer px-4 py-2 text-sm">
              <FiImage className="size-4" />
              Add artwork
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleArtworks}
              />
            </label>
            <button
              type="button"
              disabled
              className="secondary-button cursor-not-allowed px-4 py-2 text-sm opacity-55"
            >
              <FiGrid className="size-4" />
              Arrange
            </button>
            <button
              type="button"
              disabled
              className="secondary-button cursor-not-allowed px-4 py-2 text-sm opacity-55"
            >
              <FiCopy className="size-4" />
              Duplicate
            </button>
          </div>

          <p className="mt-4 text-sm leading-7 text-[#666666]">
            The artwork tray is still local in this first V2 slice. Cloudinary-backed
            layout asset uploads and metadata capture come next.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {artworks.length === 0 ? (
            <div className="rounded-[1.8rem] border border-dashed border-[#1c1c1c]/10 bg-[#fafafa] px-5 py-8 text-sm text-[#666666] sm:col-span-2">
              No local artwork added yet.
            </div>
          ) : (
            artworks.map((artwork) => (
              <div
                key={artwork.id}
                className="rounded-[1.8rem] border border-[#1c1c1c]/8 bg-white p-3"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-[1.4rem] border border-[#1c1c1c]/8 bg-[#fafafa]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artwork.previewUrl}
                    alt={artwork.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-3 truncate text-sm font-semibold text-[#1c1c1c]">
                  {artwork.name}
                </p>
              </div>
            ))
          )}
        </div>

        {feedback ? (
          <div
            className={`mt-6 rounded-[1.6rem] border px-5 py-4 text-sm leading-7 ${
              feedback.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : feedback.tone === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-[#7e00ff]/14 bg-[#faf8ff] text-[#5a5a5a]"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}
      </div>

      <div className="surface-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Template preview</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">
              {selectedLayout?.name ?? "Create a layout"}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#666666]">
              {selectedLayout
                ? `Background mode and layout shell are saved for ${selectedLayout.name}.`
                : "Create a layout to start persisting the V2 workspace."}
            </p>
          </div>
          <div className="rounded-full border border-[#7e00ff]/14 bg-[#faf8ff] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#7e00ff]">
            560mm × 1000mm
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <div
            className={`relative aspect-[56/100] w-full max-w-[28rem] rounded-[2rem] border p-4 shadow-[0_18px_50px_rgba(28,28,28,0.08)] ${
              backgroundMode === "light"
                ? "border-[#1c1c1c]/10 bg-[#f7f7f7]"
                : "border-[#1c1c1c]/10 bg-[#1c1c1c]"
            }`}
          >
            <div
              className={`grid h-full w-full place-items-center rounded-[1.5rem] border border-dashed ${
                backgroundMode === "light"
                  ? "border-[#1c1c1c]/12 text-[#666666]"
                  : "border-white/18 text-white/72"
              }`}
            >
              <div className="max-w-[15rem] text-center">
                <p className="text-xs uppercase tracking-[0.28em] opacity-70">
                  {selectedLayout ? "Persisted shell" : "Awaiting layout"}
                </p>
                <p className="mt-4 text-base leading-7">
                  {selectedLayout
                    ? `${LAYOUT_BACKGROUND_MODE_LABELS[selectedLayout.backgroundMode]} background saved. Asset placement, duplicate, and arrange will build on this canvas next.`
                    : "Use the New layout button to create the first saved V2 workspace."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {selectedLayout ? (
          <div className="mt-8 rounded-[1.8rem] border border-[#1c1c1c]/8 bg-[#fafafa] p-5">
            <p className="eyebrow">Layout data</p>
            <div className="mt-4 grid gap-3 text-sm text-[#666666] sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-[#1c1c1c]/8 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#7e00ff]">
                  Background
                </p>
                <p className="mt-2 font-semibold text-[#1c1c1c]">
                  {LAYOUT_BACKGROUND_MODE_LABELS[selectedLayout.backgroundMode]}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[#1c1c1c]/8 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#7e00ff]">
                  Saved items
                </p>
                <p className="mt-2 font-semibold text-[#1c1c1c]">
                  {selectedLayout.items.length}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[#1c1c1c]/8 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#7e00ff]">
                  Created
                </p>
                <p className="mt-2 font-semibold text-[#1c1c1c]">
                  {formatDateTime(selectedLayout.createdAt)}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[#1c1c1c]/8 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[#7e00ff]">
                  Updated
                </p>
                <p className="mt-2 font-semibold text-[#1c1c1c]">
                  {formatDateTime(selectedLayout.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
