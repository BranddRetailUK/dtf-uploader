export function isGeneratedTemplateFileName(originalName: string) {
  const normalizedName = originalName.trim().toLowerCase();

  return (
    normalizedName.startsWith("lami-template") ||
    normalizedName.startsWith("lami template")
  );
}

export function formatTemplateDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function buildTemplateDisplayName(value: string | Date) {
  return `Template ${formatTemplateDate(value)}`;
}

export function buildTemplateFilename(value: string | Date) {
  return `${buildTemplateDisplayName(value)}.pdf`;
}
