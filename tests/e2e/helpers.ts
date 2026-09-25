import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "Demo12345!";
export const uniqueEmail = (prefix: string) => `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@e2e.kadrtop.demo`;

export async function login(page: Page, email: string, password = DEMO_PASSWORD, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parol").fill(password);
  await page.getByRole("button", { name: "Kirish" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function register(
  page: Page,
  role: "job_seeker" | "employer",
  email: string,
  first = "Test",
  last = "Foydalanuvchi",
) {
  await page.goto(`/register?role=${role}`);
  await page.getByLabel("Ism").fill(first);
  await page.getByLabel("Familiya").fill(last);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parol").fill("Test12345");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Roʻyxatdan oʻtish" }).click();
}

export async function selectLocation(page: Page, region: string, district: string) {
  await page.getByLabel("Viloyat").first().selectOption({ label: region });
  const districtSelect = page.getByLabel("Tuman yoki shahar").first();
  await expect(districtSelect.locator("option", { hasText: district })).toHaveCount(1);
  await districtSelect.selectOption({ label: district });
}
