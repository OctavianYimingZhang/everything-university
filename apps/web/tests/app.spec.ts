import { expect, test } from "@playwright/test";

test("memory-first interface exposes usable controls without code panels", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Everything University Control Center" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Memory Collection", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Coursework", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exam Prep", exact: true })).toBeVisible();
  await expect(page.getByText("User Specific Memory").first()).toBeVisible();
  await expect(page.getByText("Run packet JSON")).toHaveCount(0);
  await expect(page.getByText("Choose a workflow")).toHaveCount(0);
});

test("exam route can build a user-facing plan state with bridge offline fallback", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Exam Prep" }).click();
  await page.getByLabel("Course code").fill("BIO101");
  await page.getByLabel("Task prompt").fill("make notes and MCQ revision");
  await page.getByRole("button", { name: "Build Review Plan" }).click();
  await expect(page.getByText(/offline handoff|plan ready|review questions ready/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Run with Codex" })).toBeEnabled();
});

test("coursework route exposes required decisions as interactive cards", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Coursework" }).click();
  await page.getByRole("button", { name: /Interactive Website Coursework/ }).click();
  await expect(page.getByText("Output mode")).toBeVisible();
  await page.getByText("Static website").click();
  await page.getByRole("button", { name: "Prepare Coursework Gate" }).click();
  await expect(page.getByText(/decision payload ready|offline handoff/i).first()).toBeVisible();
});

test("mobile layout keeps primary controls accessible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Refresh Memory" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Sources" }).click();
  await expect(page.getByRole("button", { name: /Lecture materials/ }).first()).toBeVisible();
});
