"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiFileText,
  FiLoader,
  FiTrash2,
  FiUploadCloud,
} from "react-icons/fi";

import { formatCurrencyFromPence, formatFileSize } from "@/lib/format";
import {
  DEFAULT_ORDER_FILE_QUANTITY,
  MAX_ORDER_FILE_QUANTITY,
} from "@/lib/order-config";
import { calculatePriceBreakdown } from "@/lib/pricing";
import { PdfPreview } from "@/components/pdf-preview";

type LocalUpload = {
  clientId: string;
  file: File;
  name: string;
  type: string;
  size: number;
  quantity: number;
  previewUrl: string;
};

type OrderCreateResponse = {
  orderId: string;
  pricing: {
    subtotalPence: number;
    vatPence: number;
    totalPence: number;
  };
  files: {
    id: string;
    clientId: string;
    originalName: string;
  }[];
};

type UploadSignResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  tags: string;
  resourceType: string;
  uploadUrl: string;
};

function isPdfFile(file: Pick<LocalUpload, "name" | "type">) {
  return (
    file.type.toLowerCase().includes("pdf") ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isImageFile(file: Pick<LocalUpload, "type">) {
  return file.type.toLowerCase().startsWith("image/");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function getTotalUploadCount(files: Pick<LocalUpload, "quantity">[]) {
  return files.reduce((sum, file) => sum + file.quantity, 0);
}

export function UploadStudio() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [files, setFiles] = useState<LocalUpload[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [activeBackgroundUploads, setActiveBackgroundUploads] = useState(0);
  const [feedback, setFeedback] = useState<{
    tone: "neutral" | "success" | "warning" | "error";
    message: string;
  } | null>(null);
  const [modalPhase, setModalPhase] = useState<"idle" | "uploading" | "success">(
    "idle",
  );

  const fileRef = useRef<LocalUpload[]>([]);
  const successTimerRef = useRef<number | null>(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    fileRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      fileRef.current.forEach((file) => URL.revokeObjectURL(file.previewUrl));

      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const selectedFile =
    files.find((file) => file.clientId === selectedId) ?? files[0] ?? null;
  const selectedIndex = selectedFile
    ? files.findIndex((file) => file.clientId === selectedFile.clientId)
    : -1;
  const totalUploadCount = getTotalUploadCount(files);
  const pricing = calculatePriceBreakdown(totalUploadCount);

  function handleDragEnter(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    consumeFiles(Array.from(event.dataTransfer.files));
  }

  function showUploadingModal() {
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }

    setModalPhase("uploading");
  }

  function showSuccessModal() {
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }

    setModalPhase("success");

    return new Promise<void>((resolve) => {
      successTimerRef.current = window.setTimeout(() => {
        setModalPhase("idle");
        successTimerRef.current = null;
        resolve();
      }, 1800);
    });
  }

  function hideModal() {
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }

    setModalPhase("idle");
  }

  function consumeFiles(nextFiles: File[]) {
    if (nextFiles.length === 0) {
      setFeedback({
        tone: "warning",
        message: "Please choose one or more files.",
      });
      return;
    }

    const mapped = nextFiles.map((file) => ({
      clientId: crypto.randomUUID(),
      file,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      quantity: DEFAULT_ORDER_FILE_QUANTITY,
      previewUrl: URL.createObjectURL(file),
    }));

    setFiles((current) => [...current, ...mapped]);
    setSelectedId((current) => current ?? mapped[0]?.clientId ?? null);
    setFeedback(null);
  }

  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);

    if (nextFiles.length > 0) {
      consumeFiles(nextFiles);
    }

    event.target.value = "";
  }

  function removeFile(clientId: string) {
    setFiles((current) => {
      const toRemove = current.find((file) => file.clientId === clientId);

      if (toRemove) {
        URL.revokeObjectURL(toRemove.previewUrl);
      }

      const next = current.filter((file) => file.clientId !== clientId);

      if (selectedId === clientId) {
        setSelectedId(next[0]?.clientId ?? null);
      }

      return next;
    });
  }

  function updateFileQuantity(clientId: string, delta: number) {
    setFiles((current) =>
      current.map((file) => {
        if (file.clientId !== clientId) {
          return file;
        }

        return {
          ...file,
          quantity: Math.min(
            MAX_ORDER_FILE_QUANTITY,
            Math.max(1, file.quantity + delta),
          ),
        };
      }),
    );
  }

  function showAdjacentPreview(direction: "previous" | "next") {
    if (files.length < 2) {
      return;
    }

    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const delta = direction === "next" ? 1 : -1;
    const nextIndex = (currentIndex + delta + files.length) % files.length;
    const nextFile = files[nextIndex];

    if (nextFile) {
      setSelectedId(nextFile.clientId);
    }
  }

  async function createOrder(snapshot: LocalUpload[]) {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: snapshot.map((file) => ({
          clientId: file.clientId,
          name: file.name,
          size: file.size,
          type: file.type,
          quantity: file.quantity,
        })),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | (OrderCreateResponse & { error?: string })
      | null;

    if (!response.ok || !payload) {
      throw new Error(payload?.error ?? "We couldn't prepare your order.");
    }

    return payload;
  }

  async function uploadSingleFile(
    orderId: string,
    orderFileId: string,
    file: LocalUpload,
  ) {
    let finalizeRequestSent = false;

    const signResponse = await fetch("/api/uploads/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        orderFileId,
      }),
    });

    const signPayload = (await signResponse.json().catch(() => null)) as
      | (UploadSignResponse & { error?: string })
      | null;

    if (!signResponse.ok || !signPayload) {
      throw new Error(signPayload?.error ?? "We couldn't prepare one of your files.");
    }

    const formData = new FormData();
    formData.append("file", file.file);
    formData.append("api_key", signPayload.apiKey);
    formData.append("timestamp", String(signPayload.timestamp));
    formData.append("signature", signPayload.signature);
    formData.append("folder", signPayload.folder);
    formData.append("public_id", signPayload.publicId);
    formData.append("tags", signPayload.tags);

    try {
      const cloudinaryResponse = await fetch(signPayload.uploadUrl, {
        method: "POST",
        body: formData,
      });

      const cloudinaryPayload = (await cloudinaryResponse.json().catch(
        () => null,
      )) as
        | {
            bytes?: number;
            public_id?: string;
            secure_url?: string;
            error?: { message?: string };
          }
        | null;

      if (!cloudinaryResponse.ok || !cloudinaryPayload?.secure_url) {
        throw new Error(
          cloudinaryPayload?.error?.message ??
            "One of your files couldn't be uploaded.",
        );
      }

      const finalizeResponse = await fetch("/api/uploads/finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          orderFileId,
          success: true,
          cloudinaryPublicId: cloudinaryPayload.public_id,
        }),
      });
      finalizeRequestSent = true;

      const finalizePayload = (await finalizeResponse.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!finalizeResponse.ok) {
        throw new Error(
          finalizePayload?.error ??
            "Your upload finished, but the order couldn't be updated.",
        );
      }
    } catch (error) {
      if (!finalizeRequestSent) {
        await fetch("/api/uploads/finalize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            orderFileId,
            success: false,
            errorMessage: getErrorMessage(error),
          }),
        });
      }

      throw error;
    }
  }

  async function runBackgroundUpload(
    snapshot: LocalUpload[],
    orderResponse: OrderCreateResponse,
  ) {
    setActiveBackgroundUploads((current) => current + 1);

    try {
      const results = await Promise.allSettled(
        orderResponse.files.map(async (createdFile) => {
          const localFile = snapshot.find(
            (file) => file.clientId === createdFile.clientId,
          );

          if (!localFile) {
            throw new Error(
              `We couldn't match ${createdFile.originalName} after checkout. Please try again.`,
            );
          }

          await uploadSingleFile(orderResponse.orderId, createdFile.id, localFile);
        }),
      );

      const failures = results.filter(
        (result) => result.status === "rejected",
      ).length;

      setFeedback({
        tone: failures > 0 ? "warning" : "success",
        message:
          failures > 0
            ? `Your order is saved, but ${failures} file${failures === 1 ? "" : "s"} need attention. You can review the details in your profile.`
            : "Your files have been uploaded and your order is now available in your profile.",
      });

      if (failures > 0) {
        hideModal();
        startTransition(() => {
          router.refresh();
        });
      } else {
        await showSuccessModal();
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (error) {
      hideModal();
      setFeedback({
        tone: "error",
        message: `We couldn't finish the background upload: ${getErrorMessage(error)}`,
      });
    } finally {
      setActiveBackgroundUploads((current) => Math.max(0, current - 1));
    }
  }

  function renderSelectedPreview() {
    if (!selectedFile) {
      return (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`preview-shell flex h-[700px] items-center justify-center border-dashed px-8 text-center transition ${
            isDragging
              ? "border-[#7e00ff] bg-[#f7f1ff]"
              : "border-[#1c1c1c]/10 bg-[#fafafa]"
          }`}
        >
          <div className="flex max-w-sm flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-[1.5rem] bg-[#f4ebff] text-[#7e00ff]">
              <FiUploadCloud className="size-7" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-semibold text-[#1c1c1c]">
                Drag or upload artwork
              </p>
              <p className="text-sm leading-7 text-[#666666]">
                Drop files here or use the upload area to choose files from your
                device.
              </p>
            </div>
          </div>
        </div>
      );
    }

    let content: React.ReactNode;

    if (isPdfFile(selectedFile)) {
      content = (
        <PdfPreview
          src={selectedFile.previewUrl}
          title={selectedFile.name}
        />
      );
    } else if (isImageFile(selectedFile)) {
      content = (
        <div className="preview-shell relative flex h-[700px] items-center justify-center overflow-hidden bg-[#fafafa] p-6">
          <Image
            src={selectedFile.previewUrl}
            alt={selectedFile.name}
            fill
            unoptimized
            sizes="(min-width: 1280px) 60vw, 100vw"
            className="object-contain p-6"
          />
        </div>
      );
    } else {
      content = (
        <div className="preview-shell flex h-[700px] items-center justify-center bg-[#fafafa] px-8 text-center">
          <div className="flex max-w-sm flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-[1.5rem] bg-[#f4ebff] text-[#7e00ff]">
              <FiFileText className="size-7" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-semibold text-[#1c1c1c]">
                Preview not available
              </p>
              <p className="text-sm leading-7 text-[#666666]">
                This file type can still be uploaded, even though it can&apos;t be
                rendered in the preview window.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative transition ${isDragging ? "scale-[0.998]" : ""}`}
      >
        {content}

        {files.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => showAdjacentPreview("previous")}
              className="absolute left-4 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#1c1c1c]/8 bg-white/92 text-[#1c1c1c] shadow-[0_12px_28px_rgba(28,28,28,0.1)] transition hover:border-[#7e00ff]/24 hover:text-[#7e00ff]"
              aria-label="Show previous file preview"
            >
              <FiChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => showAdjacentPreview("next")}
              className="absolute right-4 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#1c1c1c]/8 bg-white/92 text-[#1c1c1c] shadow-[0_12px_28px_rgba(28,28,28,0.1)] transition hover:border-[#7e00ff]/24 hover:text-[#7e00ff]"
              aria-label="Show next file preview"
            >
              <FiChevronRight className="size-5" />
            </button>
            <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full border border-[#1c1c1c]/8 bg-white/92 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-[#666666] shadow-[0_12px_28px_rgba(28,28,28,0.08)]">
              {selectedIndex + 1} / {files.length}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  async function handleUpload() {
    if (files.length === 0 || isCreatingOrder) {
      return;
    }

    const snapshot = [...files];
    setIsCreatingOrder(true);
    setFeedback(null);

    try {
      const orderResponse = await createOrder(snapshot);

      showUploadingModal();
      snapshot.forEach((file) => URL.revokeObjectURL(file.previewUrl));
      setFiles([]);
      setSelectedId(null);
      setFeedback({
        tone: "neutral",
        message: "Your order has been created. Your files are uploading now.",
      });
      void runBackgroundUpload(snapshot, orderResponse);
    } catch (error) {
      hideModal();
      setFeedback({
        tone: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setIsCreatingOrder(false);
    }
  }

  return (
    <>
      <section>
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="surface-panel">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1c1c1c]/8 pb-4">
              <div>
                <p className="eyebrow">Preview</p>
                <h2 className="mt-2 text-xl font-semibold text-[#1c1c1c]">
                  {selectedFile?.name ?? "Select a file to preview"}
                </h2>
              </div>

              {selectedFile ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-[#1c1c1c]/10 bg-[#faf8ff] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#666666]">
                    {formatFileSize(selectedFile.size)}
                  </div>
                  <div className="rounded-full border border-[#1c1c1c]/10 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#666666]">
                    Qty {selectedFile.quantity}
                  </div>
                  {files.length > 1 ? (
                    <div className="rounded-full border border-[#1c1c1c]/10 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#666666]">
                      {selectedIndex + 1} of {files.length}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-5">{renderSelectedPreview()}</div>
          </div>

          <div className="space-y-4">
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`surface-panel border-dashed transition ${
                isDragging ? "border-[#7e00ff] bg-[#f7f1ff]" : ""
              }`}
            >
              <div className="flex size-14 items-center justify-center rounded-[1.2rem] bg-[#f4ebff] text-[#7e00ff]">
                <FiUploadCloud className="size-6" />
              </div>

              <h2 className="mt-5 text-xl font-semibold text-[#1c1c1c]">
                Add artwork files
              </h2>
              <p className="mt-2 text-sm leading-7 text-[#666666]">
                Drag and drop your files here or choose them from your device.
              </p>

              <label className="primary-button mt-6 inline-flex cursor-pointer px-5 py-3 text-sm">
                Choose files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>

              <div className="mt-6 space-y-3">
                {files.length === 0 ? (
                  <div className="rounded-[1.4rem] border border-dashed border-[#1c1c1c]/10 bg-[#fafafa] px-4 py-5 text-sm text-[#666666]">
                    No files added yet.
                  </div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.clientId}
                      className={`flex w-full items-center justify-between gap-3 rounded-[1.4rem] border px-4 py-4 text-left transition ${
                        selectedFile?.clientId === file.clientId
                          ? "border-[#7e00ff]/35 bg-[#f7f1ff]"
                          : "border-[#1c1c1c]/8 bg-white hover:border-[#7e00ff]/20"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(file.clientId)}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-[1rem] bg-[#f4ebff] text-[#7e00ff]">
                          <FiFileText className="size-4" />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="truncate text-sm font-semibold text-[#1c1c1c]">
                            {file.name}
                          </p>
                          <p className="text-xs uppercase tracking-[0.16em] text-[#666666]">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-2">
                        <div className="flex items-center rounded-full border border-[#7e00ff]/16 bg-white shadow-[0_10px_24px_rgba(126,0,255,0.07)]">
                          <button
                            type="button"
                            onClick={() => updateFileQuantity(file.clientId, -1)}
                            disabled={file.quantity <= 1}
                            className="inline-flex size-9 items-center justify-center rounded-l-full text-[#666666] transition hover:bg-[#f4ebff] hover:text-[#7e00ff] disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label={`Decrease quantity for ${file.name}`}
                          >
                            <FiChevronLeft className="size-4" />
                          </button>
                          <span className="min-w-[2.5rem] px-1 text-center text-sm font-semibold text-[#1c1c1c]">
                            {file.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateFileQuantity(file.clientId, 1)}
                            disabled={file.quantity >= MAX_ORDER_FILE_QUANTITY}
                            className="inline-flex size-9 items-center justify-center rounded-r-full text-[#666666] transition hover:bg-[#f4ebff] hover:text-[#7e00ff] disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label={`Increase quantity for ${file.name}`}
                          >
                            <FiChevronRight className="size-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(file.clientId)}
                          className="inline-flex size-9 items-center justify-center rounded-full border border-[#1c1c1c]/8 text-[#666666] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Remove ${file.name}`}
                        >
                          <FiTrash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#7e00ff]/14 bg-[#faf8ff] p-5">
              <p className="eyebrow">Price</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">
                {pricing.fileCount === 0
                  ? "£0"
                  : formatCurrencyFromPence(pricing.totalPence)}
              </p>
              <p className="mt-3 text-sm leading-7 text-[#666666]">
                {pricing.fileCount > 0
                  ? `Total including VAT for ${pricing.fileCount} upload${pricing.fileCount === 1 ? "" : "s"}.`
                  : "Add files to see your order total."}
              </p>
              {files.length > 0 && totalUploadCount !== files.length ? (
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#7e00ff]">
                  {files.length} artwork file{files.length === 1 ? "" : "s"} across{" "}
                  {totalUploadCount} billed upload
                  {totalUploadCount === 1 ? "" : "s"}
                </p>
              ) : null}

              <div className="mt-5 space-y-3 text-sm text-[#666666]">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrencyFromPence(pricing.subtotalPence)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>VAT</span>
                  <span>{formatCurrencyFromPence(pricing.vatPence)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#1c1c1c]/8 pt-3 text-base font-semibold text-[#1c1c1c]">
                  <span>Total</span>
                  <span>{formatCurrencyFromPence(pricing.totalPence)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpload}
              disabled={files.length === 0 || isCreatingOrder}
              className="primary-button w-full px-5 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isCreatingOrder ? "Preparing your order..." : "Send files"}
              <FiUploadCloud className="size-4" />
            </button>

            {feedback ? (
              <div
                className={`rounded-[1.6rem] border px-5 py-4 text-sm leading-7 ${
                  feedback.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : feedback.tone === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : feedback.tone === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-[#7e00ff]/14 bg-[#faf8ff] text-[#5a5a5a]"
                }`}
              >
                {feedback.message}
              </div>
            ) : null}

            {activeBackgroundUploads > 0 ? (
              <p className="text-sm leading-7 text-[#666666]">
                {activeBackgroundUploads} upload
                {activeBackgroundUploads === 1 ? "" : "s"} still processing in the
                background.
              </p>
            ) : null}
          </div>
        </div>
      </section>
 
      {modalPhase !== "idle" ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(28,28,28,0.16)] px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] border border-[#7e00ff]/16 bg-white p-8 text-center shadow-[0_30px_90px_rgba(28,28,28,0.14)]">
            <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-[#f4ebff]">
              {modalPhase === "uploading" ? (
                <FiLoader className="size-10 animate-spin text-[#7e00ff]" />
              ) : (
                <FiCheck className="size-10 text-emerald-500" />
              )}
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">
              {modalPhase === "uploading" ? "Uploading" : "Uploaded"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#666666]">
              {modalPhase === "uploading"
                ? "Please wait while your files upload."
                : "Your order has been sent. Any later issue will appear in your profile."}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
