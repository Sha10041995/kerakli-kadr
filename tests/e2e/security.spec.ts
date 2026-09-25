import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("access control", () => {
  test("private routes redirect guests to login", async ({ page }) => {
    for (const path of ["/dashboard", "/admin", "/messages", "/dashboard/vacancies/new"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/%2F/g, "(%2F|/)")}`));
    }
  });

  test("open redirect via ?next is neutralised", async ({ page }) => {
    await login(page, "demo.candidate02@kadrtop.demo", undefined, "//evil.example.com");
    await expect(page).toHaveURL(/localhost:3000\/dashboard/);
  });

  test("job seekers cannot open the admin panel or employer tools", async ({ page }) => {
    await login(page, "demo.candidate03@kadrtop.demo");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/dashboard/vacancies/new");
    await expect(page).toHaveURL(/\/onboarding|\/dashboard/);
  });

  test("API rejects malformed location requests", async ({ request }) => {
    expect((await request.get("/api/locations?level=districts&parent=1%20OR%201=1")).status()).toBe(400);
    expect((await request.get("/api/locations?level=users&parent=1")).status()).toBe(400);
    expect((await request.get("/api/locations?level=districts&parent=6")).status()).toBe(200);
  });

  test("payment webhook refuses unknown providers", async ({ request }) => {
    const res = await request.post("/api/payments/evilpay/webhook", { data: { paymentId: "x", status: "paid" } });
    expect(res.status()).toBe(404);
  });
});
