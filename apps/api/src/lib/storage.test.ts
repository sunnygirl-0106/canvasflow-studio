import { describe, it, expect } from "vitest";
import { validateAsset } from "./storage";

describe("validateAsset", () => {
  it("accepts valid image types", () => {
    expect(validateAsset("image/png", 1024)).toBeNull();
    expect(validateAsset("image/jpeg", 1024)).toBeNull();
    expect(validateAsset("image/webp", 1024)).toBeNull();
    expect(validateAsset("image/gif", 1024)).toBeNull();
  });

  it("accepts valid video types", () => {
    expect(validateAsset("video/mp4", 1024)).toBeNull();
    expect(validateAsset("video/webm", 1024)).toBeNull();
    expect(validateAsset("video/quicktime", 1024)).toBeNull();
  });

  it("rejects unsupported content types", () => {
    expect(validateAsset("application/octet-stream", 1024)).toContain("Unsupported");
    expect(validateAsset("text/plain", 1024)).toContain("Unsupported");
    expect(validateAsset("image/svg+xml", 1024)).toContain("Unsupported");
    expect(validateAsset("video/avi", 1024)).toContain("Unsupported");
  });

  it("rejects images over 20MB", () => {
    const over20MB = 21 * 1024 * 1024;
    expect(validateAsset("image/png", over20MB)).toContain("too large");
  });

  it("accepts images at exactly 20MB", () => {
    const exactly20MB = 20 * 1024 * 1024;
    expect(validateAsset("image/png", exactly20MB)).toBeNull();
  });

  it("rejects videos over 500MB", () => {
    const over500MB = 501 * 1024 * 1024;
    expect(validateAsset("video/mp4", over500MB)).toContain("too large");
  });

  it("accepts videos at exactly 500MB", () => {
    const exactly500MB = 500 * 1024 * 1024;
    expect(validateAsset("video/mp4", exactly500MB)).toBeNull();
  });
});
