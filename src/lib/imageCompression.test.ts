import { describe, it, expect } from "vitest";
import {
  calculateTargetDimensions,
  formatFileSize,
  compressImage,
} from "./imageCompression";

describe("calculateTargetDimensions – scaling logic", () => {
  it("scales down large landscape photo so longest edge is 1280px", () => {
    // Standard 12MP landscape photo: 4032 x 3024
    const result = calculateTargetDimensions(4032, 3024, 1280);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(960);
  });

  it("scales down large portrait photo so longest edge is 1280px", () => {
    // Standard 12MP portrait photo: 3024 x 4032
    const result = calculateTargetDimensions(3024, 4032, 1280);
    expect(result.width).toBe(960);
    expect(result.height).toBe(1280);
  });

  it("scales down square image to 1280 x 1280", () => {
    const result = calculateTargetDimensions(2000, 2000, 1280);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(1280);
  });

  it("does not upscale images smaller than maxDimension", () => {
    // 800 x 600 is already <= 1280 on both sides
    const result = calculateTargetDimensions(800, 600, 1280);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it("handles exact 1280px edge without alteration", () => {
    const result = calculateTargetDimensions(1280, 720, 1280);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);
  });

  it("handles non-positive dimensions safely", () => {
    const result = calculateTargetDimensions(0, 0, 1280);
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });
});

describe("formatFileSize", () => {
  it("formats bytes, kilobytes, and megabytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(250 * 1024)).toBe("250 KB");
    expect(formatFileSize(4 * 1024 * 1024)).toBe("4.0 MB");
  });
});

describe("compressImage", () => {
  it("returns a Blob", async () => {
    // Create a mock blob of 1000 bytes
    const inputBlob = new Blob(["test image content"], { type: "image/jpeg" });
    const result = await compressImage(inputBlob, 1280, 0.7);
    expect(result).toBeDefined();
    expect(result instanceof Blob).toBe(true);
  });
});

