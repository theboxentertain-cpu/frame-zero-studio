import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecordEditor } from "@/components/fz/RecordEditor";
import { I18nProvider } from "@/lib/i18n";
import { ConflictError } from "@/lib/records";
const fake = vi.hoisted(() => ({
  rows: [{ id: "brief", version: 1, notes: "original" }],
  update: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ useSession: () => ({ mode: "filmmaker" }) }));
vi.mock("@/lib/records", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/records")>()),
  rowsQuery: () => ({ queryKey: ["rows"], queryFn: () => fake.rows }),
  useRowMutation: () => ({
    update: { mutateAsync: fake.update, isPending: false },
    create: { isPending: false },
    remove: {},
    refresh: fake.refresh,
  }),
}));
function app(qc: QueryClient) {
  return (
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <RecordEditor
          table="briefs"
          projectId="project"
          fields={[{ key: "notes", label: { en: "Notes", ar: "ملاحظات" }, type: "textarea" }]}
          allowCreate={false}
          allowArchive={false}
          titleOf={() => "Brief"}
          newLabel={{ en: "Add", ar: "إضافة" }}
          empty={{ title: { en: "Empty", ar: "فارغ" }, body: { en: "Write", ar: "اكتب" } }}
        />
      </I18nProvider>
    </QueryClientProvider>
  );
}
beforeEach(() => {
  fake.rows = [{ id: "brief", version: 1, notes: "original" }];
  fake.update.mockReset();
  fake.refresh.mockReset();
  localStorage.clear();
});
describe("written editor", () => {
  it("keeps a dirty draft tied to its original version and requires explicit conflict recovery", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(app(qc));
    fireEvent.click(await screen.findByRole("button", { name: /Brief/ }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "أنا راجع شبرا" } });
    qc.setQueryData(["rows"], [{ id: "brief", version: 2, notes: "remote change" }]);
    fake.update.mockRejectedValueOnce(new ConflictError());
    fireEvent.click(screen.getByRole("button", { name: "حفظ" }));
    await waitFor(() =>
      expect(fake.update).toHaveBeenCalledWith({
        id: "brief",
        version: 1,
        patch: { notes: "أنا راجع شبرا" },
      }),
    );
    expect(screen.getByRole("textbox")).toHaveValue("أنا راجع شبرا");
    fireEvent.click(await screen.findByRole("button", { name: "تحميل الأحدث" }));
    expect(screen.getByRole("textbox")).toHaveValue("remote change");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "مراجعة جديدة" } });
    fake.update.mockResolvedValueOnce({ id: "brief", version: 3, notes: "مراجعة جديدة" });
    fireEvent.click(screen.getByRole("button", { name: "حفظ" }));
    await waitFor(() =>
      expect(fake.update).toHaveBeenLastCalledWith({
        id: "brief",
        version: 2,
        patch: { notes: "مراجعة جديدة" },
      }),
    );
  });
});
