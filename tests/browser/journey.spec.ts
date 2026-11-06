import { test, expect } from "@playwright/test";
// Browser interaction tests use a deliberately isolated API fixture, not live Auth/RLS evidence.
const uid = "11111111-1111-4111-8111-111111111111",
  pid = "33333333-3333-4333-8333-333333333333";
const sid = "44444444-4444-4444-8444-444444444444",
  shotid = "55555555-5555-4555-8555-555555555555";
const user = {
  id: uid,
  aud: "authenticated",
  role: "authenticated",
  email: "director@example.test",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: new Date().toISOString(),
};
test("mobile Arabic journey: sign in, create film, save brief/revision, sign out and reopen; all locked pages render", async ({
  page,
}) => {
  test.setTimeout(90000);
  const tables: Record<string, Record<string, unknown>[]> = {
    profiles: [{ id: uid, mode: "filmmaker", locale: "ar" }],
    projects: [],
    briefs: [],
    interpretations: [],
    scenes: [{ id: sid, project_id: pid, title: "المشهد الأول", version: 1 }],
    shots: [{ id: shotid, project_id: pid, scene_id: sid, shot_number: "1", version: 1 }],
  };
  let snapshots = 0;
  await page.route("https://fonts.googleapis.com/**", (r) =>
    r.fulfill({ contentType: "text/css", body: "" }),
  );
  await page.route("**/auth/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/logout")) return route.fulfill({ status: 204 });
    if (url.pathname.endsWith("/user")) return route.fulfill({ json: user });
    const token = [
      "eyJhbGciOiJIUzI1NiJ9",
      Buffer.from(
        JSON.stringify({
          sub: uid,
          exp: Math.floor(Date.now() / 1000) + 3600,
          role: "authenticated",
        }),
      ).toString("base64url"),
      "signature",
    ].join(".");
    return route.fulfill({
      json: {
        access_token: token,
        refresh_token: "fixture-only-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user,
      },
    });
  });
  await page.route("**/rest/v1/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      table = url.pathname.split("/").at(-1)!;
    if (table === "fz_save_brief_revision") {
      snapshots++;
      tables.briefs![0]!["current_revision"] = snapshots;
      return route.fulfill({ json: snapshots });
    }
    if (table === "fz_gate_status") return route.fulfill({ json: [] });
    const list = tables[table] ?? (tables[table] = []),
      body = req.postDataJSON() as Record<string, unknown> | null;
    const matches = (r: Record<string, unknown>) =>
      [...url.searchParams].every(([k, v]) => !v.startsWith("eq.") || String(r[k]) === v.slice(3));
    if (req.method() === "POST") {
      const row = {
        ...body,
        id: table === "projects" ? pid : crypto.randomUUID(),
        version: 1,
        created_at: new Date().toISOString(),
      };
      list.push(row);
      if (table === "projects")
        tables.briefs!.push({
          id: "brief-fixture",
          project_id: pid,
          version: 1,
          source_facts: "",
          proposed_interpretation: "",
          approved_decisions: "",
          notes: "",
          current_revision: 0,
        });
      return route.fulfill({ json: row });
    }
    if (req.method() === "PATCH") {
      const row = list.find(matches);
      if (row) {
        Object.assign(row, body);
        row["version"] = Number(row["version"]) + 1;
      }
      return route.fulfill({ json: row ?? null });
    }
    const rows = list.filter(matches);
    return route.fulfill({
      json: req.headers()["accept"]?.includes("object+json") ? (rows[0] ?? null) : rows,
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/auth/);
  async function signin() {
    await page.getByLabel("البريد الإلكتروني").fill("director@example.test");
    await page.getByLabel("كلمة المرور", { exact: true }).fill("fixture-password-only");
    await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
    await expect(page).toHaveURL(/\/projects/);
  }
  await signin();
  await page.getByRole("link", { name: "فيلم جديد", exact: true }).first().click();
  await page.getByLabel("اسم الفيلم").fill("رجوع لشبرا");
  await page.getByLabel("الفكرة بالمصري / ملخص الفيلم").fill("واحد راجع بيته وبيسمع صوت قديم");
  await page.getByLabel("المنطقة", { exact: true }).fill("شبرا، القاهرة");
  await page.getByRole("button", { name: "فيلم جديد", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${pid}/brief`));
  await page.getByRole("button", { name: /سجل مكتوب/ }).click();
  await page.getByLabel("حقائق المصدر").fill("الشارع في شبرا، والصوت جاي من شباك البيت");
  await page.getByLabel("قرارات المخرج المعتمدة").fill("أداء طبيعي وكاميرا ثابتة لها دافع");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await expect(page.getByText("تم الحفظ", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "حفظ نسخة من الموجز المحفوظ" }).click();
  await expect.poll(() => snapshots).toBe(1);
  expect(tables.briefs![0]!["source_facts"]).toContain("شبرا");
  expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
  const paths = [
    "brief",
    "interpretations",
    "treatment",
    "story",
    "cast",
    "performances",
    "locations",
    "language",
    "scenes",
    `scenes/${sid}/plan`,
    `scenes/${sid}/stills`,
    `scenes/${sid}/production`,
    `shots/${shotid}/retake`,
    "continuity",
    "edit",
    "sound",
    "grade",
    "quality",
    "export",
    "versions",
    "budget",
  ];
  for (const path of paths) {
    await page.goto(`/projects/${pid}/${path}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("This page didn't load", { exact: false })).toHaveCount(0);
    if (path === `scenes/${sid}/stills`) {
      await expect(page.getByText("التوليد بالذكاء الاصطناعي: غير متصل")).toBeVisible();
      await expect(page.getByRole("button", { name: "تجهيز مراجع اللقطات" })).toBeDisabled();
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.goto("/account");
  await expect(page.locator("h1")).toContainText("الحساب");
  await page.getByRole("combobox", { name: "الوضع", exact: true }).selectOption("director");
  await page.getByRole("button", { name: "حفظ", exact: true }).click();
  await page.getByRole("button", { name: "القائمة", exact: true }).click();
  await page.getByRole("button", { name: "تسجيل الخروج", exact: true }).last().click();
  await expect(page).toHaveURL(/\/auth/);
  await signin();
  await page.getByRole("link", { name: "فتح", exact: true }).first().click();
  await page.getByRole("button", { name: /سجل مكتوب/ }).click();
  await expect(page.getByLabel("حقائق المصدر")).toHaveValue(
    "الشارع في شبرا، والصوت جاي من شباك البيت",
  );
  expect(errors).toEqual([]);
});
test("public landing supports Arabic mobile and English desktop without overflow", async ({
  page,
}) => {
  await page.route("https://fonts.googleapis.com/**", (r) =>
    r.fulfill({ contentType: "text/css", body: "" }),
  );
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("heading", { name: "Every shot has a reason." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
