import Link from "next/link";
import { FiExternalLink, FiUploadCloud } from "react-icons/fi";

import { LogoutButton } from "@/components/logout-button";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { formatCurrencyFromPence, formatDateTime, formatFileSize } from "@/lib/format";
import type { OrderFileSummary } from "@/lib/domain";
import { getOrdersForUser } from "@/lib/orders";
import {
  buildTemplateDisplayName,
  isGeneratedTemplateFileName,
} from "@/lib/template-files";

function isTemplateFile(file: OrderFileSummary) {
  return isGeneratedTemplateFileName(file.originalName);
}

function getProfileFileTitle(file: OrderFileSummary) {
  return isTemplateFile(file)
    ? buildTemplateDisplayName(file.createdAt)
    : file.originalName;
}

export default async function ProfilePage() {
  const user = await requireUser();
  const orders = await getOrdersForUser(user.id);

  if (orders.length === 0) {
    return (
      <section className="surface-panel">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="eyebrow">Your uploads</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">
              No uploads yet
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#666666] sm:mx-0">
              Your previous orders will appear here as soon as you send your first
              files.
            </p>
          </div>

          <LogoutButton />
        </div>

        <Link
          href="/"
          className="primary-button mt-8 inline-flex px-5 py-3 text-sm"
        >
          <FiUploadCloud className="size-4" />
          Start uploading
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="surface-panel">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">Your uploads</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">
              Order history
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#666666]">
              Review each order, see every file inside it, and check whether an
              upload completed successfully.
            </p>
          </div>

          <LogoutButton />
        </div>
      </div>

      {orders.map((order) => (
        <article key={order.id} className="surface-panel space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={order.status} />
                <span className="text-xs uppercase tracking-[0.24em] text-[#666666]">
                  Order {order.id.slice(-6).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-[#666666]">
                <span>{formatDateTime(order.createdAt)}</span>
                <span>{order.fileCount} upload{order.fileCount === 1 ? "" : "s"}</span>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-[#7e00ff]/14 bg-[#faf8ff] px-5 py-4">
              <div className="space-y-2 text-sm text-[#666666]">
                <div className="flex items-center justify-between gap-6">
                  <span>Subtotal</span>
                  <span>{formatCurrencyFromPence(order.subtotalPence)}</span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span>VAT</span>
                  <span>{formatCurrencyFromPence(order.vatPence)}</span>
                </div>
                <div className="flex items-center justify-between gap-6 border-t border-[#1c1c1c]/8 pt-2 font-semibold text-[#1c1c1c]">
                  <span>Total</span>
                  <span>{formatCurrencyFromPence(order.totalPence)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {order.files.map((file) => (
              <div
                key={file.id}
                className="rounded-[1.8rem] border border-[#1c1c1c]/8 bg-white p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    {isTemplateFile(file) ? (
                      <div className="flex h-28 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-[#1c1c1c]/8 bg-[#fafafa] shadow-[0_12px_28px_rgba(28,28,28,0.05)]">
                        {file.uploadStatus === "UPLOADED" && file.cloudinaryUrl ? (
                          <object
                            data={`/api/files/${file.id}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
                            type="application/pdf"
                            aria-hidden="true"
                            className="pointer-events-none block h-full w-full"
                          >
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#666666]">
                              PDF
                            </div>
                          </object>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#666666]">
                            PDF
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div>
                      <p className="text-base font-semibold text-[#1c1c1c]">
                        {getProfileFileTitle(file)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#666666]">
                        {formatFileSize(file.bytes)} • {file.mimeType} • Qty {file.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={file.uploadStatus} kind="file" />
                    {file.cloudinaryUrl ? (
                      <a
                        href={`/api/files/${file.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="secondary-button px-3 py-1.5 text-sm"
                      >
                        Open file
                        <FiExternalLink className="size-4" />
                      </a>
                    ) : null}
                  </div>
                </div>
                {file.errorMessage ? (
                  <p className="mt-3 text-sm text-rose-700">{file.errorMessage}</p>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
