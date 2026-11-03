import { render, screen, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { SessionProvider, useSession } from "@/lib/session";
const auth = vi.hoisted(() => ({
  callback: undefined as undefined | ((event: string, session: unknown) => void),
  resolve: undefined as undefined | ((v: unknown) => void),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: () =>
        new Promise((resolve) => {
          auth.resolve = resolve;
        }),
      onAuthStateChange: (cb: typeof auth.callback) => {
        auth.callback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    }),
  },
}));
function Probe() {
  const { user, ready } = useSession();
  return <span>{ready ? (user?.id ?? "signed out") : "loading"}</span>;
}
it("clears private caches across account switches and ignores a stale startup response", async () => {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </QueryClientProvider>,
  );
  await act(async () => auth.callback?.("SIGNED_IN", { user: { id: "A" } }));
  qc.setQueryData(["briefs", "private-A"], { notes: "secret A" });
  await act(async () => auth.callback?.("SIGNED_IN", { user: { id: "B" } }));
  expect(qc.getQueryData(["briefs", "private-A"])).toBeUndefined();
  expect(screen.getByText("B")).toBeInTheDocument();
  await act(async () => auth.resolve?.({ data: { user: { id: "A" } } }));
  expect(screen.getByText("B")).toBeInTheDocument();
  qc.setQueryData(["project", "B"], "private B");
  await act(async () => auth.callback?.("SIGNED_OUT", null));
  await waitFor(() => expect(screen.getByText("signed out")).toBeInTheDocument());
  expect(qc.getQueryData(["project", "B"])).toBeUndefined();
});
