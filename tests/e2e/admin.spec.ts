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
