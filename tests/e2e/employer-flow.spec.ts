import { expect, test } from "@playwright/test";
import { login, register, selectLocation, uniqueEmail } from "./helpers";

test("employer: registration → company → vacancy → matches → application management", async ({ page, browser }) => {
  await register(page, "employer", uniqueEmail("employer"), "Bobur", "Ishberuvchi");
  await page.waitForURL(/\/dashboard\/company/);
  await page.getByLabel("Turi").selectOption({ label: "Fermer xoʻjaligi" });
  await page.getByLabel("Kompaniya nomi").fill("E2E Agro fermer xoʻjaligi");
  await page.getByLabel("STIR (INN)").fill("301234567");
  await selectLocation(page, "Qashqadaryo viloyati", "Kitob tumani");
  await page.getByRole("button", { name: "Davom etish" }).click();
  await page.waitForURL(/\/dashboard\/vacancies\/new/);

  // Create a vacancy in Kitob
  await page.getByLabel("Kasb").selectOption({ label: "Payvandchi" });
  const title = `Payvandchi kerak E2E ${Date.now()}`;
  await page.getByLabel("Sarlavha").fill(title);
  await page.getByLabel("Tavsif").fill("Fermer xoʻjaligida metall konstruksiyalarni payvandlash uchun tajribali usta kerak.");
  await page.getByLabel("dan", { exact: true }).fill("5000000");
  await page.getByLabel("gacha", { exact: true }).fill("7000000");
  await page.getByRole("checkbox", { name: "Shoshilinch" }).check();
  await page.getByRole("button", { name: "Eʼlon qilish" }).click();
  await page.waitForURL(/\/dashboard\/vacancies\/[0-9a-f-]+\?saved=active/);
  await expect(page.getByText("Vakansiya eʼlon qilindi!")).toBeVisible();
  // Matching candidates with an explainable MATCH SCORE
  await expect(page.getByRole("heading", { name: "Mos nomzodlar" })).toBeVisible();
  const vacancyUrl = page.url().split("?")[0];
  const vacancyId = vacancyUrl.split("/").pop()!;

  // Candidate search by profession + location
  await page.goto("/candidates/qashqadaryo/kitob");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Kitob tumani");

  // A demo candidate applies in a separate session
  const other = await browser.newContext();
  const cand = await other.newPage();
  await login(cand, "demo.candidate05@kadrtop.demo");
  await cand.goto(`/vacancy/${vacancyId}`);
  await cand.getByRole("button", { name: "Ariza yuborish" }).click();
  await expect(cand.getByText("Siz ariza yuborgansiz.")).toBeVisible();

  // Employer manages the application
  await page.goto(`/dashboard/vacancies/${vacancyId}`);
  await expect(page.getByRole("heading", { name: "Arizalar (1)" })).toBeVisible();
  await page.getByRole("button", { name: "Kontaktni koʻrish" }).click();
  await expect(page.getByRole("link", { name: /\+99890/ })).toBeVisible();
  await page.getByLabel("Ariza holati").selectOption({ label: "Saralandi" });
  await expect(page.getByText("Saralandi").first()).toBeVisible();

  // Candidate sees the new status and a notification
  await cand.goto("/dashboard/applications");
  await expect(cand.getByText("Saralandi").first()).toBeVisible();
  await cand.goto("/notifications");
  await expect(cand.getByText("Siz saralangan nomzodlar roʻyxatidasiz").first()).toBeVisible();

  // Messaging between employer and candidate
  await page.getByRole("button", { name: "Xabar yozish" }).click();
  await page.waitForURL(/\/messages\//);
  const text = `Assalomu alaykum! Ertaga suhbatga kela olasizmi? #${Date.now()}`;
  await page.getByLabel("Xabar", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Yuborish" }).click();
  // the composer is cleared only after the server confirmed the message
  await expect(page.getByLabel("Xabar", { exact: true })).toHaveValue("");
  await expect(page.locator("p", { hasText: text })).toBeVisible();
  await cand.goto("/messages");
  await expect(cand.getByText(text)).toBeVisible();
  await other.close();
});
