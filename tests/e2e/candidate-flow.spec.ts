import { expect, test } from "@playwright/test";
import { register, selectLocation, uniqueEmail } from "./helpers";

test("candidate: registration → profile → local job search → application", async ({ page }) => {
  await register(page, "job_seeker", uniqueEmail("candidate"), "Sardor", "Test");
  await page.waitForURL(/\/dashboard\/profile/);

  await page.getByLabel("Kasb").selectOption({ label: "Payvandchi" });
  await page.getByLabel("Tajriba (yil)").fill("4");
  await page.getByLabel("Sarlavha").fill("Tajribali payvandchi");
  await selectLocation(page, "Xorazm viloyati", "Urganch shahri");
  await page.getByRole("button", { name: "Profilni saqlash" }).click();
  await expect(page.getByText("Profil saqlandi")).toBeVisible();

  // Search jobs near me
  await page.goto("/jobs/xorazm/urganch-shahri");
  await page.getByRole("link", { name: "Batafsil" }).first().click();
  await page.waitForURL(/\/vacancy\//);
  const title = await page.getByRole("heading", { level: 1 }).textContent();
  await page.getByPlaceholder("Qisqacha oʻzingiz haqingizda (ixtiyoriy)").fill("Salom! Men yaqin joyda yashayman.");
  await page.getByRole("button", { name: "Ariza yuborish" }).click();
  await expect(page.getByText("Siz ariza yuborgansiz.")).toBeVisible();

  await page.goto("/dashboard/applications");
  await expect(page.getByRole("link", { name: title ?? "" })).toBeVisible();
  await expect(page.getByText("Yuborildi").first()).toBeVisible();

  // CV is generated from the profile
  await page.goto("/dashboard/cv");
  await expect(page.getByRole("heading", { name: "Sardor Test" })).toBeVisible();
});
