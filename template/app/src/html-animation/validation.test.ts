import { describe, expect, it } from "vitest";
import { hardenAnimationHtml, validateAnimationHtml } from "./validation";

const safeAnimation = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <style>
      .orb { animation: pulse 2s infinite alternate; }
      @keyframes pulse { to { transform: scale(1.2); } }
    </style>
  </head>
  <body><div class="orb">Glowing orb</div></body>
</html>`;

describe("validateAnimationHtml", () => {
  it("accepts a self-contained CSS animation", () => {
    expect(validateAnimationHtml(safeAnimation)).toEqual({ ok: true });
  });

  it("rejects executable content and external resources", () => {
    const unsafeAnimation = safeAnimation.replace(
      "</body>",
      '<script>fetch("https://example.com")</script><img src="https://example.com/a.png"></body>',
    );

    const result = validateAnimationHtml(unsafeAnimation);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContain("<script> elements are not allowed.");
      expect(result.issues.join(" ")).toContain("External resource URL");
    }
  });

  it("rejects inline event handlers and CSS imports", () => {
    const unsafeAnimation = safeAnimation
      .replace("<style>", '<style>@import "https://example.com/a.css";')
      .replace('class="orb"', 'class="orb" onload="alert(1)"');

    const result = validateAnimationHtml(unsafeAnimation);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContain("Inline event handlers are not allowed.");
      expect(result.issues).toContain("CSS @import is not allowed.");
    }
  });
});

describe("hardenAnimationHtml", () => {
  it("injects a restrictive content security policy", () => {
    const hardened = hardenAnimationHtml(safeAnimation);

    expect(hardened).toContain("Content-Security-Policy");
    expect(hardened).toContain("connect-src 'none'");
    expect(hardened).toContain("frame-src 'none'");
  });
});
