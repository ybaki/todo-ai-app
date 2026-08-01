import { test, expect } from "@playwright/test";

/**
 * Gercek Microsoft OAuth akisi otomatize edilemez (harici IdP + gercek
 * hesap gerektirir). Bu suite, oturum acmayan bir kullanicinin korumali
 * sayfalara erisemedigini ve login/privacy sayfalarinin dogru render
 * edildigini dogrulayan bir "guard" duman testidir.
 */

test.describe("Kimlik dogrulama guard'lari", () => {
  test("oturum acmamis kullanici /app'e girdiginde /login'e yonlendirilir", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login sayfasi Google ile giris butonunu gosterir", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /Google ile giriş yap/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Gizlilik politikası/i })).toBeVisible();
  });

  test("gizlilik politikasi sayfasi erisilebilir", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("oturum acmamis kullanici korumali ayarlar sayfasindan da yonlendirilir", async ({
    page,
  }) => {
    await page.goto("/app/settings");
    await expect(page).toHaveURL(/\/login/);
  });
});
