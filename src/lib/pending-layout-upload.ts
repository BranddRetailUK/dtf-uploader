let pendingLayoutUploads: File[] = [];

export function queuePendingLayoutUpload(file: File) {
  pendingLayoutUploads = [...pendingLayoutUploads, file];
}

export function consumePendingLayoutUploads() {
  const queued = pendingLayoutUploads;
  pendingLayoutUploads = [];
  return queued;
}
