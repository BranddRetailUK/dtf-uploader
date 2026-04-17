"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  FiCheck,
  FiClock,
  FiFileText,
  FiLoader,
  FiTrash2,
  FiUploadCloud,
} from "react-icons/fi";

import { formatCurrencyFromPence, formatFileSize } from "@/lib/format";
import { calculatePriceBreakdown, UPLOAD_MODAL_DURATION_MS } from "@/lib/pricing";

type LocalPdf = {
  clientId: string;
  file: File;
  name: string;
  type: string;
  size: number;
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

function isPdf(file: File) {
  return file.type.toLowerCase().includes("pdf") || file.name.endsWith(".pdf");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function UploadStudio(props: {
  firstName: string;
  companyName: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [files, setFiles] = useState<LocalPdf[]>([]);
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

  const fileRef = useRef<LocalPdf[]>([]);
  const timerRef = useRef<number[]>([]);

  useEffect(() => {
    fileRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      fileRef.current.forEach((file) => URL.revokeObjectURL(file.previewUrl));
      timerRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const selectedFile =
    files.find((file) => file.clientId === selectedId) ?? files[0] ?? null;
  const pricing = calculatePriceBreakdown(files.length);

  function setTimedModal() {
    timerRef.current.forEach((timer) => window.clearTimeout(timer));
    timerRef.current = [];
    setModalPhase("uploading");

    timerRef.current.push(
      window.setTimeout(() => {
        setModalPhase("success");
      }, Math.round(UPLOAD_MODAL_DURATION_MS * 0.65)),
    );

    timerRef.current.push(
      window.setTimeout(() => {
        setModalPhase("idle");
      }, UPLOAD_MODAL_DURATION_MS),
    );
  }

  function consumeFiles(nextFiles: File[]) {
    const accepted = nextFiles.filter(isPdf);
    const rejected = nextFiles.length - accepted.length;

    if (accepted.length === 0) {
      setFeedback({
        tone: "warning",
        message: "Please choose PDF files only.",
      });
      return;
    }

    const mapped = accepted.map((file) => ({
      clientId: crypto.randomUUID(),
      file,
      name: file.name,
      type: file.type || "application/pdf",
      size: file.size,
      previewUrl: URL.createObjectURL(file),
    }));

    setFiles((current) => [...current, ...mapped]);
    setSelectedId((current) => current ?? mapped[0]?.clientId ?? null);

    if (rejected > 0) {
      setFeedback({
        tone: "warning",
        message: `${rejected} file${rejected === 1 ? "" : "s"} were skipped because only PDFs are supported.`,
      });
    } else {
      setFeedback(null);
    }
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

  async function createOrder(snapshot: LocalPdf[]) {
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
    file: LocalPdf,
  ) {
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
          cloudinaryUrl: cloudinaryPayload.secure_url,
          bytes: cloudinaryPayload.bytes ?? file.size,
        }),
      });

      if (!finalizeResponse.ok) {
        throw new Error("Your upload finished, but the order couldn't be updated.");
      }
    } catch (error) {
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

      throw error;
    }
  }

  async function runBackgroundUpload(
    snapshot: LocalPdf[],
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

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: `We couldn't finish the background upload: ${getErrorMessage(error)}`,
      });
    } finally {
      setActiveBackgroundUploads((current) => Math.max(0, current - 1));
    }
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

      setTimedModal();
      snapshot.forEach((file) => URL.revokeObjectURL(file.previewUrl));
      setFiles([]);
      setSelectedId(null);
      setFeedback({
        tone: "neutral",
        message:
          "Your order has been created. The upload animation runs on a 4 second timer while your files continue uploading.",
      });
      void runBackgroundUpload(snapshot, orderResponse);
    } catch (error) {
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
      <section className="space-y-6">
        <div className="space-y-3">
          <p className="eyebrow">Upload files</p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#1c1c1c] sm:text-4xl">
            Upload your PDF artwork
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-[#666666]">
            Hello {props.firstName}. Add ready-to-print PDF files for{" "}
            {props.companyName}, check each file in the preview window, then send
            them in one order.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="surface-panel">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1c1c1c]/8 pb-4">
              <div>
                <p className="eyebrow">Preview</p>
                <h2 className="mt-2 text-xl font-semibold text-[#1c1c1c]">
                  {selectedFile?.name ?? "Select a PDF to preview"}
                </h2>
              </div>

              {selectedFile ? (
                <div className="rounded-full border border-[#1c1c1c]/10 bg-[#faf8ff] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#666666]">
                  {formatFileSize(selectedFile.size)}
                </div>
              ) : null}
            </div>

            <div className="mt-5">
              {selectedFile ? (
                <div className="preview-shell">
                  <iframe
                    src={selectedFile.previewUrl}
                    title={selectedFile.name}
                    className="h-[700px] w-full rounded-[1.25rem] border-0 bg-white"
                  />
                </div>
              ) : (
                <div className="flex h-[700px] items-center justify-center rounded-[1.7rem] border border-dashed border-[#1c1c1c]/10 bg-[#fafafa] px-8 text-center text-sm leading-7 text-[#666666]">
                  Add one or more PDF files on the right and the selected file will
                  appear here.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                consumeFiles(Array.from(event.dataTransfer.files));
              }}
              className={`surface-panel border-dashed transition ${
                isDragging ? "border-[#7e00ff] bg-[#f7f1ff]" : ""
              }`}
            >
              <div className="flex size-14 items-center justify-center rounded-[1.2rem] bg-[#f4ebff] text-[#7e00ff]">
                <FiUploadCloud className="size-6" />
              </div>

              <h2 className="mt-5 text-xl font-semibold text-[#1c1c1c]">
                Add PDF files
              </h2>
              <p className="mt-2 text-sm leading-7 text-[#666666]">
                Drag and drop your files here or choose them from your device.
              </p>

              <label className="primary-button mt-6 inline-flex cursor-pointer px-5 py-3 text-sm">
                Choose files
                <input
                  type="file"
                  accept="application/pdf,.pdf"
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
                    <button
                      key={file.clientId}
                      type="button"
                      onClick={() => setSelectedId(file.clientId)}
                      className={`flex w-full items-center justify-between gap-3 rounded-[1.4rem] border px-4 py-4 text-left transition ${
                        selectedFile?.clientId === file.clientId
                          ? "border-[#7e00ff]/35 bg-[#f7f1ff]"
                          : "border-[#1c1c1c]/8 bg-white hover:border-[#7e00ff]/20"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-[1rem] bg-[#f4ebff] text-[#7e00ff]">
                          <FiFileText className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#1c1c1c]">
                            {file.name}
                          </p>
                          <p className="text-xs uppercase tracking-[0.16em] text-[#666666]">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>

                      <span
                        onClick={(event) => {
                          event.stopPropagation();
                          removeFile(file.clientId);
                        }}
                        className="inline-flex size-9 items-center justify-center rounded-full border border-[#1c1c1c]/8 text-[#666666] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <FiTrash2 className="size-4" />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#7e00ff]/14 bg-[#faf8ff] p-5">
              <p className="eyebrow">Price</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">
                {formatCurrencyFromPence(pricing.unitPricePence)} + VAT per file
              </p>
              <p className="mt-3 text-sm leading-7 text-[#666666]">
                {pricing.fileCount > 0
                  ? `${pricing.fileCount} file${pricing.fileCount === 1 ? "" : "s"} selected.`
                  : "Add files to see your order total."}
              </p>

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
                ? "Please wait while we start your upload."
                : "Your order has been sent. Any later issue will appear in your profile."}
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.24em] text-[#7e00ff]">
              <FiClock className="size-4" />
              4 second upload flow
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
