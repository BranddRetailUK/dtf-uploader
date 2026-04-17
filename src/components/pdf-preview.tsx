"use client";

import { useEffect, useRef, useState } from "react";
import { FiAlertCircle, FiLoader } from "react-icons/fi";

let pdfWorkerConfigured = false;

type LoadingTaskHandle = {
  promise: PromiseLike<unknown>;
  destroy?: () => void;
};

type ViewportHandle = {
  width: number;
  height: number;
};

type PageHandle = {
  getViewport: (options: { scale: number }) => ViewportHandle;
  render: (params: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    viewport: ViewportHandle;
    transform?: number[];
  }) => RenderTaskHandle;
};

type DocumentHandle = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PageHandle>;
};

type RenderTaskHandle = {
  promise: PromiseLike<unknown>;
  cancel?: () => void;
};

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pageCount, setPageCount] = useState<number | null>(null);

  useEffect(() => {
    const element = viewportRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const width = Math.floor(entries[0]?.contentRect.width ?? 0);
      const height = Math.floor(entries[0]?.contentRect.height ?? 0);

      setViewportSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context || viewportSize.width === 0 || viewportSize.height === 0) {
      return;
    }

    let active = true;
    let loadingTask: LoadingTaskHandle | undefined;
    let renderTask: RenderTaskHandle | undefined;

    setStatus("loading");
    setPageCount(null);

    void (async () => {
      try {
        const pdfjs = await loadPdfJs();
        loadingTask = pdfjs.getDocument(src) as LoadingTaskHandle;
        const pdf = (await loadingTask.promise) as DocumentHandle;

        if (!active) {
          return;
        }

        setPageCount(pdf.numPages);

        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(160, viewportSize.width - 24);
        const availableHeight = Math.max(200, viewportSize.height - 24);
        const fitScale = Math.min(
          availableWidth / baseViewport.width,
          availableHeight / baseViewport.height,
        );
        const scale = Math.max(0.1, fitScale);
        const viewport = page.getViewport({ scale });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
        canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
        canvas.style.display = "block";
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform:
            outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        }) as RenderTaskHandle;

        await renderTask.promise;

        if (active) {
          setStatus("ready");
        }
      } catch {
        if (active) {
          setPageCount(null);
          setStatus("error");
        }
      }
    })();

    return () => {
      active = false;
      renderTask?.cancel?.();
      loadingTask?.destroy?.();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [src, viewportSize.height, viewportSize.width]);

  return (
    <div
      ref={viewportRef}
      className="preview-shell relative h-[700px] overflow-hidden"
      aria-label={title}
    >
      <div className="flex h-full items-center justify-center">
        <div className="overflow-hidden rounded-[1.25rem] border border-[#1c1c1c]/8 bg-white shadow-[0_16px_34px_rgba(28,28,28,0.06)]">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {status === "ready" && pageCount && pageCount > 1 ? (
        <div className="absolute right-5 top-5 rounded-full border border-[#1c1c1c]/8 bg-white/92 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-[#666666] shadow-[0_12px_28px_rgba(28,28,28,0.08)]">
          Page 1 of {pageCount}
        </div>
      ) : null}

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
