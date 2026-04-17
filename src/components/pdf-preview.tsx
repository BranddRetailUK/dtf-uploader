"use client";

import { useEffect, useRef, useState } from "react";
import { FiAlertCircle, FiLoader } from "react-icons/fi";

let pdfWorkerConfigured = false;

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (!pdfWorkerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.mjs",
      import.meta.url,
    ).toString();
    pdfWorkerConfigured = true;
  }

  return pdfjs;
}

export function PdfPreview({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const element = viewportRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setViewportWidth(Math.floor(width));
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const host = canvasHostRef.current;

    if (!host || viewportWidth === 0) {
      return;
    }

    let active = true;

    setStatus("loading");
    host.innerHTML = "";

    void (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const loadingTask = pdfjs.getDocument(src);
        const pdf = await loadingTask.promise;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (!active) {
            return;
          }

          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.max(0.1, (viewportWidth - 24) / baseViewport.width);
          const viewport = page.getViewport({ scale });
          const outputScale = window.devicePixelRatio || 1;

          const pageShell = document.createElement("div");
          pageShell.style.borderRadius = "1.25rem";
          pageShell.style.overflow = "hidden";
          pageShell.style.border = "1px solid rgba(28, 28, 28, 0.08)";
          pageShell.style.background = "#ffffff";
          pageShell.style.boxShadow = "0 16px 34px rgba(28, 28, 28, 0.06)";

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Canvas rendering is unavailable.");
          }

          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.display = "block";
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          pageShell.appendChild(canvas);
          host.appendChild(pageShell);

          await page
            .render({
              canvas,
              canvasContext: context,
              viewport,
              transform:
                outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
            })
            .promise;
        }

        if (active) {
          setStatus("ready");
        }
      } catch {
        if (active) {
          host.innerHTML = "";
          setStatus("error");
        }
      }
    })();

    return () => {
      active = false;
      host.innerHTML = "";
    };
  }, [src, viewportWidth]);

  return (
    <div
      ref={viewportRef}
      className="preview-shell relative h-[700px] overflow-auto"
      aria-label={title}
    >
      <div ref={canvasHostRef} className="space-y-4" />

      {status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(255,255,255,0.78)] backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-3 text-center text-sm text-[#666666]">
            <FiLoader className="size-7 animate-spin text-[#7e00ff]" />
            <span>Loading preview...</span>
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3 text-sm leading-7 text-[#666666]">
            <FiAlertCircle className="size-7 text-rose-500" />
            <span>We couldn&apos;t render this PDF preview.</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
