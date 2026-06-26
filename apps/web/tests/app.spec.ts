import { expect, test } from "@playwright/test";

test("task-first interface exposes Skill actions without code panels", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Exam Prep", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Daily Notes", exact: true })).toBeVisible();
  await expect(page.locator("h1", { hasText: "Generate Notes" })).toBeVisible();
  await expect(page.getByLabel("Task conversation")).toBeVisible();
  await expect(page.getByText("Answer AI questions")).toBeVisible();
  await expect(page.getByLabel("Course / module").first()).toHaveValue("");
  await expect(page.getByRole("button", { name: /MCQ Practice/ })).toBeVisible();
  await page.getByRole("button", { name: "Coursework", exact: true }).click();
  await expect(page.getByRole("button", { name: /Write an Essay/ })).toBeVisible();
  await expect(page.getByText("Memory Collection")).toHaveCount(0);
  await expect(page.getByText("Run packet JSON")).toHaveCount(0);
  await expect(page.getByText("Choose a workflow")).toHaveCount(0);
  await expect(page.getByText("Required decisions")).toHaveCount(0);
  await expect(page.getByText("Current Operation")).toHaveCount(0);
  await expect(page.locator("main").getByText("Source roles")).toHaveCount(0);
});

test("exam route can build a user-facing plan state with bridge offline fallback", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Exam Prep", exact: true }).click();
  await page.getByLabel("Course / module").first().fill("BIO101");
  await page.getByLabel("Message to agent").fill("make notes and MCQ revision");
  await page.getByRole("button", { name: "Generate Questions" }).click();
  await expect(page.getByText(/AI-generated questions|Bridge fallback questions/).first()).toBeVisible();
  await page.getByRole("button", { name: "Build Review Plan" }).click();
  await expect(page.getByText(/offline handoff|plan ready|review questions ready/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Run with Codex" })).toBeEnabled();
});

test("coursework route generates interactive questions inside the chat workspace", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Coursework" }).click();
  await page.getByRole("button", { name: /Interactive Website Coursework/ }).click();
  await expect(page.locator("main").getByText("Output mode")).toHaveCount(0);
  await page.getByRole("button", { name: "Generate Questions" }).click();
  await expect(page.getByText(/AI-generated questions|Bridge fallback questions/).first()).toBeVisible();
  await page.getByRole("button", { name: "Static website", exact: true }).click();
  await page.getByRole("button", { name: "Prepare Coursework Gate" }).click();
  await expect(page.getByText(/decision payload ready|offline handoff/i).first()).toBeVisible();
});

test("mobile layout keeps primary controls accessible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Build Review Plan" })).toBeVisible();
  await page.getByRole("button", { name: "Sources" }).click();
  await expect(page.locator("h1", { hasText: "Upload Sources" })).toBeVisible();
  await expect(page.getByText("Lecture slides / materials").first()).toBeVisible();
});

test("sources page is upload-first and only shows source upload categories", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sources" }).click();
  const main = page.locator("main");
  await expect(page.locator("h1", { hasText: "Upload Sources" })).toBeVisible();
  await expect(main.getByText("Transcripts / recordings").first()).toBeVisible();
  await expect(main.getByText("Assignment briefs").first()).toBeVisible();
  await expect(main.getByText("Readings").first()).toBeVisible();
  await expect(main.getByText("Timetable")).toHaveCount(0);
  await expect(main.getByText("Announcements")).toHaveCount(0);
  await expect(main.getByText("Tutor / marker feedback")).toHaveCount(0);
  await page.locator("#source-upload").setInputFiles({
    name: "lecture-transcript.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("The lecturer explained a mechanism that is not visible on the slides."),
  });
  await expect(page.getByText("lecture-transcript.txt")).toBeVisible();
  await expect(page.getByText(/not visible on the slides/)).toBeVisible();
});

test("daily notes family exposes timetable and daily notes actions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Daily Notes" }).click();
  await expect(page.getByRole("button", { name: /Daily Notes Generation/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Timetable Review/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Lecture Gap Notes/ })).toBeVisible();
  await page.getByRole("button", { name: /Timetable Review/ }).click();
  await expect(page.locator("h1", { hasText: "Timetable Review" })).toBeVisible();
});

test("memory setup lives in settings without institution or program defaults", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("User Specific Memory")).toHaveCount(0);
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByText("User Specific Memory", { exact: true })).toBeVisible();
  await expect(page.getByText("Generate Memory", { exact: true })).toBeVisible();
  await expect(page.getByText("Writing style and notes preferences")).toBeVisible();
  await expect(page.getByLabel("Writing sample")).toBeVisible();
  await expect(page.getByLabel("Notes preference")).toBeVisible();
  await expect(page.getByText("Timetable", { exact: true })).toBeVisible();
  await expect(page.getByText("Tutor / marker feedback", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Course / module").last()).toHaveValue("");
  await expect(page.getByText("Institution")).toHaveCount(0);
  await expect(page.getByText("Program")).toHaveCount(0);
});
