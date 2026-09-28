import { expect, test } from "@playwright/test";

test.describe("public pages", () => {
  test("home page shows hero, search and local talent", async ({ page }) => {
    const cspViolations: string[] = [];
    page.on("console", (msg) => {
      if (/Content Security Policy/i.test(msg.text())) cspViolations.push(msg.text());
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("oʻz hududingizdan toping");
    await expect(page.getByRole("tab", { name: "Ish qidiryapman" })).toBeVisible();
    await expect(page.getByText("Hududingizdagi kadrlar")).toBeVisible();
    await expect(page.getByText("DEMO").first()).toBeHidden(); // demo badge only on detail pages
    // interactive client component works (tabs) => hydration passed the strict CSP
    await page.getByRole("tab", { name: "Kadr qidiryapman" }).click();
    await expect(page.getByText("Qanday kadr kerak?")).toBeVisible();
    expect(cspViolations).toEqual([]);
  });

  test("location-first search from the home page", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Viloyat").first().selectOption({ label: "Xorazm viloyati" });
    const district = page.getByLabel("Tuman yoki shahar").first();
    await expect(district.locator("option", { hasText: "Urganch shahri" })).toHaveCount(1);
    await district.selectOption({ label: "Urganch shahri" });
    await page.getByRole("button", { name: "Qidirish" }).click();
    await page.waitForURL(/\/jobs\?.*district=/);
    await expect(page.getByText("ta vakansiya topildi")).toBeVisible();
    // exact-district results are labelled and come first
    await expect(page.getByText("Tumaningizda").first()).toBeVisible();
  });

  test("SEO location pages resolve and unknown slugs 404", async ({ page }) => {
    const ok = await page.goto("/jobs/xorazm/urganch-shahri");
    expect(ok?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Urganch shahridagi ish oʻrinlari");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/jobs\/xorazm\/urganch-shahri$/);

    const talent = await page.goto("/candidates/toshkent/elektrik");
    expect(talent?.status()).toBe(200);
    await expect(page.getByText(/ta elektrik mavjud/)).toBeVisible();

    const missing = await page.goto("/jobs/mars/olympus");
    expect(missing?.status()).toBe(404);
  });

  test("vacancy detail has structured data and asks guests to log in", async ({ page }) => {
    await page.goto("/jobs");
    await page.getByRole("link", { name: "Batafsil" }).first().click();
    await page.waitForURL(/\/vacancy\//);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    await expect(page.getByText("Ariza yuborish uchun tizimga kiring.")).toBeVisible();
  });

  test("candidate profiles never expose phone numbers", async ({ page }) => {
    await page.goto("/candidates");
    await page.getByRole("link", { name: "Profilni koʻrish" }).first().click();
    await page.waitForURL(/\/candidate\//);
    const html = await page.content();
    expect(html).not.toMatch(/\+99890\d{7}/);
    await expect(page.getByText("Telefon raqam ommaga koʻrsatilmaydi")).toBeVisible();
  });

  test("security headers are set", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    const csp = h["content-security-policy"];
    expect(csp).toContain("frame-ancestors 'none'");
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    // every inline script rendered by Next.js carries the request nonce
    const nonce = scriptSrc.match(/'nonce-([^']+)'/)![1];
    const html = await res.text();
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)].map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);
    for (const attrs of scripts) expect(attrs).toContain(`nonce="${nonce}"`);
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("robots and sitemap", async ({ request }) => {
    expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /dashboard");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/jobs/xorazm/urganch-shahri");
    expect(sitemap).toContain("/vacancy/");
  });
});
