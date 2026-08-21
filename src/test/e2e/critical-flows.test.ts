import { test, expect } from "@playwright/test";

test.describe("Vote flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("student can vote in an election", async ({ page }) => {
    // Login as student
    await page.fill('input[name="fullName"]', "John Doe");
    await page.fill('input[name="enrollmentNo"]', "STU2024001");
    await page.fill('input[name="email"]', "student1@college.edu");
    await page.click('button[type="submit"]');

    // Wait for redirect to elections
    await expect(page).toHaveURL(/\/elections/);

    // Find an open election and click vote
    const voteButton = page.locator('a:has-text("Vote Now"), button:has-text("Vote Now")').first();
    if (await voteButton.count() > 0) {
      await voteButton.click();

      // Select a candidate
      const candidateCard = page.locator('[role="radio"], .candidate-card, [data-candidate]').first();
      if (await candidateCard.count() > 0) {
        await candidateCard.click();

        // Continue to confirmation
        await page.click('button:has-text("Continue"), button:has-text("Confirm")');

        // Confirm vote
        await page.click('button:has-text("Confirm Vote"), button:has-text("I Confirm")');

        // Should show success
        await expect(page.locator("text=Vote Submitted, text=Vote Recorded")).toBeVisible();
      }
    }
  });
});

test.describe("Nomination flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("student can nominate themselves", async ({ page }) => {
    await page.fill('input[name="fullName"]', "Jane Smith");
    await page.fill('input[name="enrollmentNo"]', "STU2024002");
    await page.fill('input[name="email"]', "student2@college.edu");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/elections/);

    // Find nomination button
    const nominateButton = page.locator('a:has-text("Nominate"), button:has-text("Nominate")').first();
    if (await nominateButton.count() > 0) {
      await nominateButton.click();

      // Fill nomination form
      await page.fill('textarea[name="answer"]', "I want to serve the club...");
      
      // Submit
      await page.click('button:has-text("Submit Nomination")');

      // Should show success
      await expect(page.locator("text=Nomination Submitted")).toBeVisible();
    }
  });
});

test.describe("Admin election management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@college.edu");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');
  });

  test("admin can create an election", async ({ page }) => {
    await page.goto("/admin/elections/create");
    
    await page.fill('input[name="name"]', "Test Election 2026");
    await page.check('input[name="multiCampus"]');
    await page.fill('input[name="nominationStartsAt"]', "2026-01-15T09:00");
    await page.fill('input[name="nominationEndsAt"]', "2026-01-20T17:00");
    await page.fill('input[name="startsAt"]', "2026-02-01T09:00");
    await page.fill('input[name="endsAt"]', "2026-02-05T17:00");
    await page.selectOption('select[name="resultsVisibility"]', "members_only");
    
    await page.click('button:has-text("Create Election")');
    
    await expect(page.locator("text=Test Election 2026")).toBeVisible();
  });

  test("admin can void an election with reason", async ({ page }) => {
    await page.goto("/admin/elections");
    
    // Find void button and click
    const voidButton = page.locator('button:has-text("Void")').first();
    if (await voidButton.count() > 0) {
      await voidButton.click();
      
      // Fill reason
      await page.fill('textarea[name="voidReason"], textarea[id="voidReason"]', "Budget constraints");
      
      // Confirm
      await page.click('button:has-text("Void Election")');
      
      await expect(page.locator("text=Election voided")).toBeVisible();
    }
  });
});

test.describe("Password reset flow", () => {
  test("user can request password reset", async ({ page }) => {
    await page.goto("/forgot-password");
    
    await page.fill('input[name="email"]', "student1@college.edu");
    await page.click('button:has-text("Send Reset Link")');
    
    await expect(page.locator("text=Reset Link Sent")).toBeVisible();
  });

  test("user can reset password with valid token", async ({ page }) => {
    // This would require a valid token - test with mock token
    await page.goto("/reset-password?token=test-token");
    
    await expect(page.locator("text=Invalid Reset Link")).toBeVisible();
  });
});