export type UserRole = "USER" | "ADMIN";

export type OrderStatus =
  | "UPLOADING"
  | "RECEIVED"
  | "IN_PRODUCTION"
  | "COMPLETED"
  | "FAILED";

export type UploadStatus = "PENDING" | "UPLOADING" | "UPLOADED" | "FAILED";
export type LayoutBackgroundMode = "LIGHT" | "GREY" | "DARK";

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
  quantity: number;
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

export type ArtworkAssetSummary = {
  id: string;
  originalName: string;
  mimeType: string;
  bytes: number;
  widthPx: number | null;
  heightPx: number | null;
  dpiX: number | null;
  dpiY: number | null;
  aspectRatio: number | null;
  uploadStatus: UploadStatus;
  cloudinaryPublicId: string | null;
  cloudinaryUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LayoutItemSummary = {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotationDeg: number;
  quantity: number;
  zIndex: number;
  artworkAsset: ArtworkAssetSummary;
};

export type LayoutSummary = {
  id: string;
  name: string;
  backgroundMode: LayoutBackgroundMode;
  canvasWidthMm: number;
  canvasHeightMm: number;
  createdAt: string;
  updatedAt: string;
  items: LayoutItemSummary[];
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

export const LAYOUT_BACKGROUND_MODE_LABELS: Record<LayoutBackgroundMode, string> = {
  LIGHT: "Light",
  GREY: "Grey",
  DARK: "Dark",
};

export const ADMIN_STATUS_OPTIONS: OrderStatus[] = [
  "RECEIVED",
  "IN_PRODUCTION",
  "COMPLETED",
  "FAILED",
];
