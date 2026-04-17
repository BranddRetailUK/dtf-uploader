import type { LayoutBackgroundMode } from "@/lib/domain";
import {
  LAYOUT_CANVAS_HEIGHT_MM,
  LAYOUT_CANVAS_WIDTH_MM,
} from "@/lib/layout-config";
import { buildTemplateFilename } from "@/lib/template-files";

const MM_TO_POINTS = 72 / 25.4;
const TEMPLATE_RENDER_PX_PER_MM = 3;

const PDF_BACKGROUND_COLORS: Record<LayoutBackgroundMode, string> = {
  LIGHT: "#ffffff",
  GREY: "#808080",
  DARK: "#111111",
};

export type LayoutTemplateArtwork = {
  previewUrl: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  zIndex: number;
};

function encodePdfText(value: string) {
  return new TextEncoder().encode(value);
}

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });

  return result;
}

function formatPdfNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}

function buildSinglePagePdf(input: {
  imageBytes: Uint8Array;
  imageWidthPx: number;
  imageHeightPx: number;
  pageWidthPt: number;
  pageHeightPt: number;
}) {
  const objects = [
    encodePdfText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    encodePdfText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
    encodePdfText(
      `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatPdfNumber(input.pageWidthPt)} ${formatPdfNumber(
        input.pageHeightPt,
      )}] /Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>
endobj
`,
    ),
    concatBytes([
      encodePdfText(
        `4 0 obj
<< /Type /XObject /Subtype /Image /Width ${input.imageWidthPx} /Height ${input.imageHeightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${input.imageBytes.length} >>
stream
`,
      ),
      input.imageBytes,
      encodePdfText("\nendstream\nendobj\n"),
    ]),
    (() => {
      const contentStream = `q
${formatPdfNumber(input.pageWidthPt)} 0 0 ${formatPdfNumber(input.pageHeightPt)} 0 0 cm
/Im0 Do
Q
`;

      return encodePdfText(
        `5 0 obj
<< /Length ${contentStream.length} >>
stream
${contentStream}endstream
endobj
`,
      );
    })(),
  ];
  const header = concatBytes([
    encodePdfText("%PDF-1.3\n"),
    new Uint8Array([0x25, 0xff, 0xff, 0xff, 0xff, 0x0a]),
  ]);
  const chunks = [header];
  const offsets = [0];
  let offset = header.length;

  objects.forEach((objectBytes) => {
    offsets.push(offset);
    chunks.push(objectBytes);
    offset += objectBytes.length;
  });

  const xrefOffset = offset;
  const xrefRows = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((value) => `${value.toString().padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ];

  chunks.push(encodePdfText(`${xrefRows.join("\n")}\n`));

  return concatBytes(chunks);
}

async function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("One of the layout images couldn't be read."));
    image.src = url;
  });
}

async function createJpegBytesFromCanvas(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob);
          return;
        }

        reject(new Error("We couldn't render the layout as a PDF."));
      },
      "image/jpeg",
      0.92,
    );
  });

  return new Uint8Array(await blob.arrayBuffer());
}

export async function createLayoutTemplatePdfFile(input: {
  artworks: LayoutTemplateArtwork[];
  backgroundMode: LayoutBackgroundMode;
}) {
  if (input.artworks.length === 0) {
    throw new Error("Add artwork before creating a template.");
  }

  const canvas = document.createElement("canvas");
  const canvasWidthPx = Math.round(LAYOUT_CANVAS_WIDTH_MM * TEMPLATE_RENDER_PX_PER_MM);
  const canvasHeightPx = Math.round(
    LAYOUT_CANVAS_HEIGHT_MM * TEMPLATE_RENDER_PX_PER_MM,
  );

  canvas.width = canvasWidthPx;
  canvas.height = canvasHeightPx;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("We couldn't prepare the layout preview.");
  }

  context.fillStyle = PDF_BACKGROUND_COLORS[input.backgroundMode];
  context.fillRect(0, 0, canvasWidthPx, canvasHeightPx);

  const sortedArtworks = [...input.artworks].sort((left, right) => left.zIndex - right.zIndex);
  const loadedImages = await Promise.all(
    sortedArtworks.map((artwork) => loadImage(artwork.previewUrl)),
  );

  sortedArtworks.forEach((artwork, index) => {
    context.drawImage(
      loadedImages[index],
      artwork.xMm * TEMPLATE_RENDER_PX_PER_MM,
      artwork.yMm * TEMPLATE_RENDER_PX_PER_MM,
      artwork.widthMm * TEMPLATE_RENDER_PX_PER_MM,
      artwork.heightMm * TEMPLATE_RENDER_PX_PER_MM,
    );
  });

  const jpegBytes = await createJpegBytesFromCanvas(canvas);
  const pdfBytes = buildSinglePagePdf({
    imageBytes: jpegBytes,
    imageWidthPx: canvasWidthPx,
    imageHeightPx: canvasHeightPx,
    pageWidthPt: LAYOUT_CANVAS_WIDTH_MM * MM_TO_POINTS,
    pageHeightPt: LAYOUT_CANVAS_HEIGHT_MM * MM_TO_POINTS,
  });

  return new File([pdfBytes], buildTemplateFilename(new Date()), {
    type: "application/pdf",
    lastModified: Date.now(),
  });
}
