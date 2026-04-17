"use client";

import { useState } from "react";
import { FiCopy, FiGrid, FiImage, FiMoon, FiSun } from "react-icons/fi";

type ArtworkDraft = {
  id: string;
  name: string;
  previewUrl: string;
};

export function LayoutV2Studio() {
  const [backgroundMode, setBackgroundMode] = useState<"light" | "dark">("light");
  const [artworks, setArtworks] = useState<ArtworkDraft[]>([]);

  function handleArtworks(event: React.ChangeEvent<HTMLInputElement>) {
    const next = Array.from(event.target.files ?? []).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }));

    setArtworks((current) => [...current, ...next]);
    event.target.value = "";
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="surface-panel">
        <p className="eyebrow">Layout v2</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-[#1c1c1c] sm:text-5xl">
          560mm × 1000mm template
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#666666]">
          This is the reserved workspace for the future layout tool. The visual
          shell is ready now, while arrange and duplicate logic will be added in a
          later version.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setBackgroundMode("light")}
            className={`secondary-button px-4 py-2 text-sm ${
              backgroundMode === "light" ? "border-[#7e00ff]/35 bg-[#f4ebff]" : ""
            }`}
          >
            <FiSun className="size-4" />
            Light
          </button>
          <button
            type="button"
            onClick={() => setBackgroundMode("dark")}
            className={`secondary-button px-4 py-2 text-sm ${
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
            Arrange will later place artwork in the most space-efficient layout,
            and Duplicate will repeat a selected piece in a grid.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {artworks.length === 0 ? (
            <div className="rounded-[1.8rem] border border-dashed border-[#1c1c1c]/10 bg-[#fafafa] px-5 py-8 text-sm text-[#666666] sm:col-span-2">
              No artwork added yet.
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
      </div>

      <div className="surface-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Template preview</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">
              Fixed print area
            </h2>
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
              <div className="max-w-[14rem] text-center">
                <p className="text-xs uppercase tracking-[0.28em] opacity-70">
                  Workspace placeholder
                </p>
                <p className="mt-4 text-base leading-7">
                  Future arrange and duplicate logic will place artwork tiles inside
                  this printable area.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
