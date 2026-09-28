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

test("profile views are counted for the candidate", async ({ page, browser }) => {
  const { login } = await import("./helpers");
  const employerCtx = await browser.newContext();
  const employer = await employerCtx.newPage();
  await login(employer, "demo.employer03@kadrtop.demo");
  await employer.goto("/candidate/00000000-0000-4000-8000-000000000011");
  await expect(employer.getByRole("heading", { level: 1 })).toBeVisible();
  await employer.waitForTimeout(1000);
  await employerCtx.close();

  await login(page, "demo.candidate11@kadrtop.demo");
  await expect(page.getByText("Profil koʻrishlari")).toBeVisible();
  const value = page
    .locator("div", { has: page.getByText("Profil koʻrishlari", { exact: true }) })
    .locator("p")
    .nth(1);
  await expect(value).not.toHaveText("0");
});
