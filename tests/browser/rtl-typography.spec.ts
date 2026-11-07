import { expect, test } from "@playwright/test";

test("Arabic Director remarks and tagline remain upright, while English keeps its slant", async ({
  page,
}) => {
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  const arabicTagline = page.getByText("من فكرة واحدة إلى النسخة النهائية.", { exact: true });
  const arabicRemarks = page
    .getByRole("complementary", { name: "الكرسي الثاني للمخرج" })
    .locator("li > span.font-display")
    .first();
  await expect(arabicTagline).toBeVisible();
  await expect(arabicRemarks).toBeVisible();
  expect(await arabicTagline.evaluate((element) => getComputedStyle(element).fontStyle)).toBe(
    "normal",
  );
  expect(await arabicRemarks.evaluate((element) => getComputedStyle(element).fontStyle)).toBe(
    "normal",
  );

  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

  const englishTagline = page.getByText("From one thought to the final cut.", { exact: true });
  const englishRemarks = page
    .getByRole("complementary", { name: "The Director's Second Chair" })
    .locator("li > span.font-display")
    .first();
  await expect(englishTagline).toBeVisible();
  await expect(englishRemarks).toBeVisible();
  expect(await englishTagline.evaluate((element) => getComputedStyle(element).fontStyle)).toBe(
    "italic",
  );
  expect(await englishRemarks.evaluate((element) => getComputedStyle(element).fontStyle)).toBe(
    "italic",
  );
});
