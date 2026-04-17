"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FiExternalLink, FiUser } from "react-icons/fi";

import { StatusBadge } from "@/components/status-badge";
import {
  ADMIN_STATUS_OPTIONS,
  ORDER_STATUS_LABELS,
  type OrderSummary,
} from "@/lib/domain";
import {
  formatCurrencyFromPence,
  formatDateTime,
  formatFileSize,
} from "@/lib/format";

export function AdminOrderBoard({ initialOrders }: { initialOrders: OrderSummary[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [orders, setOrders] = useState(initialOrders);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleStatusChange(orderId: string, status: string) {
    setBusyId(orderId);
    setFeedback(null);

    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; order?: OrderSummary }
      | null;

    if (!response.ok || !payload?.order) {
      setFeedback(payload?.error ?? "We couldn't update the order status.");
      setBusyId(null);
      return;
    }

    setOrders((current) =>
      current.map((order) => (order.id === payload.order!.id ? payload.order! : order)),
    );
    setFeedback(
      `Order ${payload.order.id.slice(-6).toUpperCase()} is now ${ORDER_STATUS_LABELS[payload.order.status].toLowerCase()}.`,
    );
    setBusyId(null);

    startTransition(() => {
      router.refresh();
    });
  }

  if (orders.length === 0) {
    return (
      <div className="surface-panel text-center">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">
          No orders yet
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#666666]">
          Customer orders will appear here once files start coming in.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="surface-panel flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">
            Customer orders
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#666666]">
            Review uploaded files, customer details, and production status in one
            place.
          </p>
        </div>

        <div className="rounded-3xl border border-[#7e00ff]/14 bg-[#faf8ff] px-5 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7e00ff]">
            Total orders
          </p>
          <p className="mt-2 text-3xl font-semibold text-[#1c1c1c]">{orders.length}</p>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-[1.8rem] border border-[#7e00ff]/14 bg-[#faf8ff] px-5 py-4 text-sm text-[#5a5a5a]">
          {feedback}
        </div>
      ) : null}

      {orders.map((order) => (
        <article key={order.id} className="surface-panel space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={order.status} />
                <span className="text-xs uppercase tracking-[0.22em] text-[#666666]">
                  Order {order.id.slice(-6).toUpperCase()}
                </span>
              </div>
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">
                {order.customer.companyName}
              </h2>
              <div className="flex flex-wrap gap-3 text-sm text-[#666666]">
                <span>{formatDateTime(order.createdAt)}</span>
                <span>{order.fileCount} file{order.fileCount === 1 ? "" : "s"}</span>
                <span>{formatCurrencyFromPence(order.totalPence)} total</span>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-[#7e00ff]/14 bg-[#faf8ff] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7e00ff]">
                Update status
              </p>
              <select
                className="mt-3 w-full rounded-2xl border border-[#1c1c1c]/10 bg-white px-4 py-3 text-sm text-[#1c1c1c] outline-none transition focus:border-[#7e00ff]/40"
                value={order.status}
                disabled={busyId === order.id}
                onChange={(event) =>
                  void handleStatusChange(order.id, event.target.value)
                }
              >
                <option value="UPLOADING">Uploading</option>
                {ADMIN_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="rounded-[1.8rem] border border-[#1c1c1c]/8 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7e00ff]">
                Customer
              </p>
              <div className="mt-4 flex items-start gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f4ebff] text-[#7e00ff]">
                  <FiUser className="size-5" />
                </div>
                <div className="space-y-1 text-sm leading-7 text-[#666666]">
                  <p className="font-semibold text-[#1c1c1c]">
                    {order.customer.firstName} {order.customer.lastName}
                  </p>
                  <p>{order.customer.email}</p>
                  <p>{order.customer.companyName}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-sm text-[#666666]">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrencyFromPence(order.subtotalPence)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>VAT</span>
                  <span>{formatCurrencyFromPence(order.vatPence)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#1c1c1c]/8 pt-3 font-semibold text-[#1c1c1c]">
                  <span>Total</span>
                  <span>{formatCurrencyFromPence(order.totalPence)}</span>
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
                    <div>
                      <p className="text-base font-semibold text-[#1c1c1c]">
                        {file.originalName}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#666666]">
                        {formatFileSize(file.bytes)} • {file.mimeType}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={file.uploadStatus} kind="file" />
                      {file.cloudinaryPublicId ? (
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
          </div>
        </article>
      ))}
    </section>
  );
}
