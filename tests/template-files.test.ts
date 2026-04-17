import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTemplateDisplayName,
  buildTemplateFilename,
  isGeneratedTemplateFileName,
} from "@/lib/template-files";

test("isGeneratedTemplateFileName accepts both legacy and clean template names", () => {
  assert.equal(isGeneratedTemplateFileName("lami-template-2026-04-17T12-00-00.pdf"), true);
  assert.equal(isGeneratedTemplateFileName("Lami Template 17 Apr 2026.pdf"), true);
  assert.equal(isGeneratedTemplateFileName("customer-artwork.pdf"), false);
});

test("template display and filename helpers use a clean date format", () => {
  assert.equal(buildTemplateDisplayName("2026-04-17T12:00:00.000Z"), "Template 17 Apr 2026");
  assert.equal(buildTemplateFilename("2026-04-17T12:00:00.000Z"), "Template 17 Apr 2026.pdf");
});
