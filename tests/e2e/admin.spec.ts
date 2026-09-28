import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("admin dashboard, moderation and settings", async ({ page }) => {
  await login(page, "admin@kadrtop.demo", undefined, "/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Faol vakansiyalar")).toBeVisible();
  await expect(page.getByText("Talab yuqori: tuman × kasb")).toBeVisible();

  await page.goto("/admin/vacancies?status=active");
  await expect(page.getByRole("button", { name: "Rad etish" }).first()).toBeVisible();

  await page.goto("/admin/settings");
  await expect(page.getByLabel("Hudud mosligi")).toHaveValue("25");

  await page.goto("/admin/locations?region=1");
  await expect(page.getByText("Chilonzor tumani")).toBeVisible();

  await page.goto("/admin/audit");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
});

test("support ticket → admin reply → user notified; admin broadcast", async ({ page, browser }) => {
  const subject = `Toʻlov savoli ${Date.now()}`;
  const userCtx = await browser.newContext();
  const user = await userCtx.newPage();
  await login(user, "demo.employer02@kadrtop.demo", undefined, "/support");
  await user.getByLabel("Mavzu").fill(subject);
  await user.getByLabel("Batafsil").fill("Tarifni qanday uzaytirsam boʻladi? Iltimos yordam bering.");
  await user.getByRole("button", { name: "Yuborish" }).click();
  await expect(user.getByText(subject)).toBeVisible();

  await login(page, "admin@kadrtop.demo", undefined, "/admin/complaints");
  const card = page
    .locator("div", { hasText: subject })
    .filter({ has: page.getByLabel("Javob") })
    .last();
  await card.getByLabel("Javob").fill("Billing sahifasida “Uzaytirish” tugmasini bosing.");
  await card.getByRole("button", { name: "Javob yuborish" }).click();
  await expect(page.getByText(subject)).toBeHidden();

  await user.goto("/notifications");
  await expect(user.getByText("Murojaatingizga javob berildi").first()).toBeVisible();

  const title = `Yangilik ${Date.now()}`;
  await page.goto("/admin/notifications");
  await page.getByLabel("Sarlavha").fill(title);
  await page.getByLabel("Kimga").selectOption("employer");
  await page.getByRole("button", { name: "Yuborish" }).click();
  await expect(page.getByText(/ta foydalanuvchiga yuborildi/)).toBeVisible();
  await user.goto("/notifications");
  await expect(user.getByText(title)).toBeVisible();
  await userCtx.close();

  await page.goto("/admin/companies");
  await expect(page.getByRole("heading", { name: "Ish beruvchilar va kompaniyalar" })).toBeVisible();
});

test("admin demand map", async ({ page }) => {
  await login(page, "admin@kadrtop.demo", undefined, "/admin/analytics");
  await expect(page.getByTestId("map")).toBeVisible();
  await expect(page.locator(".leaflet-interactive").first()).toBeAttached();
});
