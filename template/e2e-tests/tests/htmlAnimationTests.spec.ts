import { expect, test } from "@playwright/test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { hardenAnimationHtml } from "../../app/src/html-animation/validation";
import { createRandomUser, logUserIn, signUserUp } from "./utils";

test("preview hardening blocks obfuscated external CSS requests", async ({
  page,
}) => {
  let requestCount = 0;
  const server = createServer((_request, response) => {
    requestCount += 1;
    response.writeHead(204);
    response.end();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const { port } = server.address() as AddressInfo;
    const acceptedHtml = `<!doctype html>
<html>
  <head data-note=">">
    <style>
      .orb { background: transparent; animation: pulse 1s infinite; }
      @keyframes pulse { to { opacity: 0.5; } }
    </style>
  </head>
  <body class="orb">Glowing orb</body>
</html>`;
    // Simulate a future validator bypass to verify that CSP remains an
    // independent network boundary around accepted model output.
    const hardenedHtml = hardenAnimationHtml(acceptedHtml).replace(
      "background: transparent",
      `background: u\\72l(http://127.0.0.1:${port}/should-not-load)`,
    );

    await page.setContent('<iframe title="preview" sandbox=""></iframe>');
    await page.getByTitle("preview").evaluate((iframe, srcDoc) => {
      (iframe as HTMLIFrameElement).srcdoc = srcDoc;
    }, hardenedHtml);
    await page.waitForTimeout(300);

    const previewFrame = page
      .frames()
      .find((frame) => frame !== page.mainFrame());
    expect(previewFrame).toBeDefined();
    await expect(previewFrame!.locator("body")).toHaveCSS(
      "animation-name",
      "pulse",
    );
    expect(requestCount).toBe(0);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("animation studio requires authentication", async ({ page }) => {
  await page.goto("/animation-studio");

  await page.waitForURL("**/login");
  expect(page.url()).toContain("/login");
});

test("authenticated users can open the animation studio", async ({ page }) => {
  const user = createRandomUser();
  await signUserUp({ page, user });
  await logUserIn({ page, user });

  await page.goto("/animation-studio");

  await expect(
    page.getByRole("heading", {
      name: "Turn an idea into a safe HTML animation",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate animation" }),
  ).toBeDisabled();
  await expect(page.getByText("Script-free, network-blocked")).toBeVisible();
});
