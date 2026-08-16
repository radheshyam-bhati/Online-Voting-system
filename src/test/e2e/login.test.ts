import { test, expect } from "@playwright/test";

test.describe("Login flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("shows login form", async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("redirects to home after successful login", async ({ page }) => {
    await page.fill('input[type="email"]', "admin@college.edu");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/");
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.fill('input[type="email"]', "wrong@college.edu");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=Incorrect email or password")).toBeVisible();
  });
});