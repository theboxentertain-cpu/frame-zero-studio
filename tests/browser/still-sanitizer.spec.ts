import { expect, test } from "@playwright/test";

// These tests exercise the actual Android-width Chromium canvas import code.
// They deliberately do NOT impersonate live Supabase authentication or Storage.
test("Android-width import converts valid camera images into verified WebP", async ({ page }) => {
  await page.goto("/");
  const outcome = await page.evaluate(async () => {
    const { sanitizeImage } = await import("/src/features/stills/data.ts");
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No canvas context");
    const gradient = context.createLinearGradient(0, 0, 640, 360);
    gradient.addColorStop(0, "#18232f");
    gradient.addColorStop(1, "#c4a16b");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 640, 360);
    context.fillStyle = "#a43d42";
    context.fillRect(80, 80, 250, 140);
    const makeBlob = (type: string) =>
      new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No image"))), type),
      );
    const formats = [
      { mime: "image/png", extension: "png" },
      { mime: "image/jpeg", extension: "jpg" },
      { mime: "image/webp", extension: "webp" },
    ];
    const results = [];
    for (const format of formats) {
      const source = await makeBlob(format.mime);
      const file = new File([source], "reference." + format.extension, { type: format.mime });
      const cleaned = await sanitizeImage(file);
      const bitmap = await createImageBitmap(cleaned.data);
      const hash = await crypto.subtle.digest("SHA-256", await cleaned.data.arrayBuffer());
      const verifiedHash = Array.from(new Uint8Array(hash))
        .map((number) => number.toString(16).padStart(2, "0"))
        .join("");
      results.push({
        declared: cleaned.data.type,
        width: bitmap.width,
        height: bitmap.height,
        hashMatches: verifiedHash === cleaned.sha256,
        sized: cleaned.data.size > 0 && cleaned.data.size <= 8 * 1024 * 1024,
      });
      bitmap.close();
    }
    return results;
  });
  expect(outcome).toHaveLength(3);
  for (const result of outcome) {
    expect(result).toEqual({
      declared: "image/webp",
      width: 640,
      height: 360,
      hashMatches: true,
      sized: true,
    });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("image import rejects spoofed formats, undersized frames and silent WebP fallback", async ({
  page,
}) => {
  await page.goto("/");
  const errors = await page.evaluate(async () => {
    const { sanitizeImage } = await import("/src/features/stills/data.ts");
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No canvas context");
    context.fillStyle = "#334455";
    context.fillRect(0, 0, 320, 240);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No PNG"))), "image/png"),
    );
    const message = async (file: File) => {
      try {
        await sanitizeImage(file);
        return "unexpected_success";
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    };
    const spoofed = await message(new File([png], "spoofed.jpg", { type: "image/jpeg" }));
    const unsupported = await message(new File([png], "frame.gif", { type: "image/gif" }));
    const small = document.createElement("canvas");
    small.width = 300;
    small.height = 220;
    const smallContext = small.getContext("2d");
    if (!smallContext) throw new Error("No canvas context");
    smallContext.fillStyle = "#334455";
    smallContext.fillRect(0, 0, 300, 220);
    const tinyPng = await new Promise<Blob>((resolve, reject) =>
      small.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No PNG"))), "image/png"),
    );
    const dimensions = await message(new File([tinyPng], "small.png", { type: "image/png" }));
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    let fallback = "";
    try {
      HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
        if (type === "image/webp") {
          return originalToBlob.call(
            this,
            (blob) => callback(blob ? new Blob([blob], { type: "image/png" }) : null),
            type,
            quality,
          );
        }
        return originalToBlob.call(this, callback, type, quality);
      };
      fallback = await message(new File([png], "reference.png", { type: "image/png" }));
    } finally {
      HTMLCanvasElement.prototype.toBlob = originalToBlob;
    }
    return { spoofed, unsupported, dimensions, fallback };
  });
  expect(errors.spoofed).toContain("does not match its declared format");
  expect(errors.unsupported).toContain("Use a JPEG, PNG or WebP");
  expect(errors.dimensions).toContain("Unsupported image dimensions");
  expect(errors.fallback).toContain("WebP encoding is unavailable");
});
