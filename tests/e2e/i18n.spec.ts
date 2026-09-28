import { expect, test, type Page } from "@playwright/test";
import { DEMO_PASSWORD } from "./helpers";

// A rendered dictionary key such as "search.filters" means a missing translation.
const RAW_KEY =
  /\b(common|nav|enums|errors|success|validation|home|search|cards|vacancy|candidate|company|pricing|pages|auth|dashboard|employer|profile|cv|applications|companyForm|vacancyForm|saved|verification|billing|settings|messaging|notificationsPage|support)\.[a-z][A-Za-z0-9_.]*/;

async function expectTranslated(page: Page, paths: string[]) {
  for (const path of paths) {
    await page.goto(path);
    const text = await page.locator("body").innerText();
    expect(text.match(RAW_KEY)?.[0] ?? null, `raw key on ${path}`).toBeNull();
  }
}

test.describe("languages", () => {
  test("switching to Russian translates the UI and persists", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "uz");
    await page.getByRole("combobox", { name: "Til" }).first().selectOption("ru");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("И кадры, и работа — найдите рядом с собой.");
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.getByRole("tab", { name: "Ищу работу" })).toBeVisible();

    // cookie persists across navigation; search results, cards and filters are localized
    await page.goto("/jobs/xorazm/urganch-shahri");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Работа — Urganch shahri");
    await expect(page.getByText(/найдено вакансий: \d+/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Применить" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Откликнуться" }).first()).toBeVisible();

    // server action errors are translated on the client
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@e2e.kadrtop.demo");
    await page.getByLabel("Пароль").fill("wrong-password-1");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page.getByText("Неверный email или пароль.")).toBeVisible();

    // back to Uzbek
    await page.getByRole("combobox", { name: "Язык" }).first().selectOption("uz");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kirish");
  });

  test("English static pages and client-side validation messages", async ({ page, context }) => {
    await context.addCookies([{ name: "locale", value: "en", url: "http://localhost:3000" }]);
    await page.goto("/privacy");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
    await expect(page).toHaveTitle(/Privacy policy/);

    await page.goto("/register");
    await page.getByRole("button", { name: "Sign up" }).last().click();
    // Zod issues are message keys, rendered in the active language
    const fieldErrors = page.locator("form p[role=alert]");
    await expect(fieldErrors.first()).toBeVisible();
    await expect(page.getByText("Choose a role")).toBeVisible();
    for (const text of await fieldErrors.allTextContents()) expect(text).not.toMatch(/^validation\./);
  });

  test("an unsupported locale cookie falls back to Uzbek", async ({ page, context }) => {
    await context.addCookies([{ name: "locale", value: "xx", url: "http://localhost:3000" }]);
    await page.goto("/about");
    await expect(page.locator("html")).toHaveAttribute("lang", "uz");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Biz haqimizda");
  });

  test("no untranslated keys on public and dashboard pages (English)", async ({ page, context }) => {
    await context.addCookies([{ name: "locale", value: "en", url: "http://localhost:3000" }]);
    await expectTranslated(page, ["/", "/jobs", "/candidates?view=map", "/pricing", "/about", "/terms", "/nonexistent-page"]);
    await page.goto("/jobs");
    await page.getByRole("link", { name: "Details", exact: true }).first().click();
    await expectTranslated(page, [new URL(page.url()).pathname]);

    await page.goto("/login?next=/dashboard");
    await page.getByLabel("Email").fill("demo.candidate02@kadrtop.demo");
    await page.getByLabel("Password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));
    await expectTranslated(page, [
      "/dashboard",
      "/dashboard/profile",
      "/dashboard/cv",
      "/dashboard/applications",
      "/dashboard/saved",
      "/dashboard/verification",
      "/dashboard/billing",
      "/dashboard/settings",
      "/messages",
      "/notifications",
      "/support",
    ]);
  });
});
