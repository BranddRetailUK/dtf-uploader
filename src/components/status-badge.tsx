import {
  FILE_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type UploadStatus,
} from "@/lib/domain";

function getTone(status: OrderStatus | UploadStatus) {
  switch (status) {
    case "UPLOADING":
      return "border-[#7e00ff]/18 bg-[#f4ebff] text-[#7e00ff]";
    case "RECEIVED":
    case "UPLOADED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "IN_PRODUCTION":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "COMPLETED":
      return "border-lime-200 bg-lime-50 text-lime-700";
    case "FAILED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "PENDING":
    default:
      return "border-[#1c1c1c]/8 bg-[#fafafa] text-[#666666]";
  }
}

export function StatusBadge(props: {
  status: OrderStatus | UploadStatus;
  kind?: "order" | "file";
}) {
  const label =
    props.kind === "file"
      ? FILE_STATUS_LABELS[props.status as UploadStatus]
      : ORDER_STATUS_LABELS[props.status as OrderStatus];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${getTone(
        props.status,
      )}`}
    >
      {label}
    </span>
  );
}
