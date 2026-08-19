export const MAX_HTML_BYTES = 80_000;

const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src data:",
  "font-src data:",
  "media-src data:",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const forbiddenTags = [
  "script",
  "iframe",
  "frame",
  "object",
  "embed",
  "base",
  "link",
  "form",
];

export type HtmlValidationResult =
  | { ok: true }
  | { ok: false; issues: string[] };

export function validateAnimationHtml(html: string): HtmlValidationResult {
  const issues: string[] = [];
  const byteLength = new TextEncoder().encode(html).length;
  const decodedCss = decodeCssEscapes(html);

  if (byteLength > MAX_HTML_BYTES) {
    issues.push(
      `HTML exceeds the ${MAX_HTML_BYTES.toLocaleString()} byte limit.`,
    );
  }

  if (!/^\s*<!doctype html>/i.test(html)) {
    issues.push("A complete HTML document with <!doctype html> is required.");
  }

  for (const tag of ["html", "head", "body"]) {
    if (!new RegExp(`<${tag}(?:\\s|>)`, "i").test(html)) {
      issues.push(`Missing <${tag}> element.`);
    }
  }

  for (const tag of forbiddenTags) {
    if (new RegExp(`<\\s*${tag}(?:\\s|/?>)`, "i").test(html)) {
      issues.push(`<${tag}> elements are not allowed.`);
    }
  }

  if (/\son[a-z]+\s*=/i.test(html)) {
    issues.push("Inline event handlers are not allowed.");
  }

  if (/\bjavascript\s*:/i.test(html)) {
    issues.push("javascript: URLs are not allowed.");
  }

  if (/<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i.test(html)) {
    issues.push("Meta refresh is not allowed.");
  }

  if (/\bsrcset\s*=/i.test(html)) {
    issues.push(
      "srcset is not allowed because previews must be self-contained.",
    );
  }

  if (/@import\b/i.test(decodedCss)) {
    issues.push("CSS @import is not allowed.");
  }

  for (const value of readUrlAttributeValues(html)) {
    if (!isAllowedEmbeddedUrl(value)) {
      issues.push(`External resource URL is not allowed: ${summarize(value)}`);
    }
  }

  for (const value of readCssUrlValues(decodedCss)) {
    if (!isAllowedEmbeddedUrl(value)) {
      issues.push(`External CSS resource is not allowed: ${summarize(value)}`);
    }
  }

  const uniqueIssues = [...new Set(issues)];
  return uniqueIssues.length === 0
    ? { ok: true }
    : { ok: false, issues: uniqueIssues };
}

export function hardenAnimationHtml(html: string): string {
  const validation = validateAnimationHtml(html);
  if (!validation.ok) {
    throw new Error(validation.issues.join(" "));
  }

  const csp = `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}">`;
  // Browsers place this pre-<html> meta token in the implicit head. Keeping it
  // before all model-controlled markup prevents a quoted `>` from swallowing it.
  return html.replace(
    /^\s*<!doctype html>/i,
    (doctype) => `${doctype}\n${csp}`,
  );
}

function readUrlAttributeValues(html: string): string[] {
  const values: string[] = [];
  const pattern =
    /\b(?:src|href|xlink:href|poster|action|formaction)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

  for (const match of html.matchAll(pattern)) {
    values.push((match[1] ?? match[2] ?? match[3] ?? "").trim());
  }

  return values;
}

function readCssUrlValues(html: string): string[] {
  const values: string[] = [];
  const pattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/gi;

  for (const match of html.matchAll(pattern)) {
    values.push((match[1] ?? match[2] ?? match[3] ?? "").trim());
  }

  return values;
}

function decodeCssEscapes(value: string): string {
  return value
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return codePoint === 0 || codePoint > 0x10ffff
        ? "\uFFFD"
        : String.fromCodePoint(codePoint);
    })
    .replace(/\\([^\r\n0-9a-f])/gi, "$1");
}

function isAllowedEmbeddedUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "" ||
    normalized.startsWith("#") ||
    normalized.startsWith("data:image/") ||
    normalized.startsWith("data:font/")
  );
}

function summarize(value: string): string {
  return value.length <= 80 ? value : `${value.slice(0, 77)}...`;
}
