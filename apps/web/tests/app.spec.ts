import { expect, test } from "@playwright/test";

test("task-first interface exposes Skill actions without code panels", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Exam Prep", exact: true })).toBeVisible();
  await expect(page.locator("h1", { hasText: "Generate Notes" })).toBeVisible();
  await expect(page.getByLabel("Course / module").first()).toHaveValue("");
  await expect(page.getByRole("button", { name: /MCQ Practice/ })).toBeVisible();
  await page.getByRole("button", { name: "Coursework", exact: true }).click();
  await expect(page.getByRole("button", { name: /Write an Essay/ })).toBeVisible();
  await expect(page.getByText("Memory Collection")).toHaveCount(0);
  await expect(page.getByText("Run packet JSON")).toHaveCount(0);
  await expect(page.getByText("Choose a workflow")).toHaveCount(0);
});

test("exam route can build a user-facing plan state with bridge offline fallback", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Exam Prep", exact: true }).click();
  await page.getByLabel("Course / module").first().fill("BIO101");
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
  await expect(page.getByRole("button", { name: "Build Review Plan" })).toBeVisible();
  await page.getByRole("button", { name: "Sources" }).click();
  await expect(page.getByRole("button", { name: /Lecture materials/ }).first()).toBeVisible();
});

test("memory setup lives in settings without institution or program defaults", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("User Specific Memory")).toHaveCount(0);
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByText("User Specific Memory", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Course / module").last()).toHaveValue("");
  await expect(page.getByText("Institution")).toHaveCount(0);
  await expect(page.getByText("Program")).toHaveCount(0);
});
