export type UserRole = "USER" | "ADMIN";

export type OrderStatus =
  | "UPLOADING"
  | "RECEIVED"
  | "IN_PRODUCTION"
  | "COMPLETED"
  | "FAILED";

export type UploadStatus = "PENDING" | "UPLOADING" | "UPLOADED" | "FAILED";

export type PriceBreakdown = {
  fileCount: number;
  unitPricePence: number;
  subtotalPence: number;
  vatRate: number;
  vatPence: number;
  totalPence: number;
};

export type CustomerSummary = {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  role: UserRole;
};

export type OrderFileSummary = {
  id: string;
  originalName: string;
  mimeType: string;
  bytes: number;
  uploadStatus: UploadStatus;
  cloudinaryPublicId: string | null;
  cloudinaryUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderSummary = {
  id: string;
  status: OrderStatus;
  fileCount: number;
  subtotalPence: number;
  vatPence: number;
  totalPence: number;
  createdAt: string;
  updatedAt: string;
  files: OrderFileSummary[];
  customer: CustomerSummary;
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  UPLOADING: "Uploading",
  RECEIVED: "Received",
  IN_PRODUCTION: "In production",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export const FILE_STATUS_LABELS: Record<UploadStatus, string> = {
  PENDING: "Pending",
  UPLOADING: "Uploading",
  UPLOADED: "Uploaded",
  FAILED: "Failed",
};

export const ADMIN_STATUS_OPTIONS: OrderStatus[] = [
  "RECEIVED",
  "IN_PRODUCTION",
  "COMPLETED",
  "FAILED",
];
