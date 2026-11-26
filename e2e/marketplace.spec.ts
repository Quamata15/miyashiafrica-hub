import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { expect, mockSupabase, PRODUCT, test } from "./fixtures";

test("home page shows the market and the baobab logo", async ({ page }) => {
  await mockSupabase(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tout s'achète");
  await expect(page.getByRole("img", { name: "MIYASHI" }).first()).toBeVisible();
  await expect(page.getByRole("search")).toBeVisible();
});

test("language switch translates the menus", async ({ page, isMobile }) => {
  test.skip(isMobile, "switch is in the desktop header");
  await mockSupabase(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Buy anything");
});

test("buyer picks a variant and pays from the wallet", async ({ page }) => {
  const calls: { rpc: string; body: unknown }[] = [];
  await mockSupabase(page, { signedIn: true, calls });
  await page.goto(`/product/${PRODUCT}`);
  await expect(page.getByRole("heading", { name: "Pagne wax 6 yards" })).toBeVisible();
  await expect(page.getByText("À partir de 5 pièces")).toBeVisible();
  await page.getByRole("button", { name: /Commander maintenant/ }).click();
  await expect(page).toHaveURL(/\/checkout\?product=/);
  await page.getByText("Portefeuille MIYASHI").click();
  await page.getByRole("button", { name: /^Payer 12/ }).click();
  await expect(page).toHaveURL(/order-success/);
  const order = calls.find((c) => c.rpc === "place_order")?.body as { p: Record<string, unknown> };
  expect(order.p).toMatchObject({ product_id: PRODUCT, variant_id: "v1", quantity: 1, payment_mode: "wallet", address_id: "a1" });
});

test("pickup point programme lists the required documents", async ({ page }) => {
  await mockSupabase(page);
  await page.goto("/devenir-point-relais");
  await expect(page.getByRole("heading", { name: "Devenez point relais MIYASHI" })).toBeVisible();
  for (const doc of ["Extrait RCCM", "Attestation d'identification fiscale (NIF)", "Photo de l'espace de stockage"]) await expect(page.getByText(doc).first()).toBeVisible();
  await expect(page.getByText("Visite du local")).toBeVisible();
});

test("key pages have no serious accessibility violations", async ({ page, isMobile }) => {
  test.skip(isMobile, "run once");
  const axe = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
  await mockSupabase(page);
  for (const path of ["/", "/marketplace", "/devenir-point-relais", "/auth"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async () =>
      (await (window as unknown as { axe: { run: (d: Document, o: unknown) => Promise<{ violations: { id: string; impact: string }[] }> } }).axe.run(document, { runOnly: ["wcag2a", "wcag2aa"] })).violations
        .filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => v.id));
    expect(violations, path).toEqual([]);
  }
});
