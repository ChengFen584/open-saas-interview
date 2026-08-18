import { expect, test } from "@playwright/test";
import { createRandomUser, logUserIn, signUserUp } from "./utils";

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
