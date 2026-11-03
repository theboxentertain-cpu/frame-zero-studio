import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { PAGES, WORLDS } from "@/lib/pages";
const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
describe("locked application contract", () => {
  it("keeps exactly 24 stable page IDs and four worlds", () => {
    expect(PAGES.map((p) => p.id)).toEqual(
      Array.from({ length: 24 }, (_, i) => `P${String(i).padStart(2, "0")}`),
    );
    expect(WORLDS.map((w) => w.id)).toEqual(["create", "cast_world", "direct", "finish"]);
  });
  for (const p of PAGES) {
    const path =
      p.scope === "global"
        ? p.seg
        : p.scope === "scene"
          ? `/projects/film/scenes/scene/${p.seg}`
          : p.scope === "shot"
            ? `/projects/film/shots/shot/${p.seg}`
            : `/projects/film/${p.seg}`;
    it(`${p.id} matches ${path} behind authentication`, () => {
      const matches = router.matchRoutes(path);
      expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
      expect(matches.some((m) => m.routeId === "/_authenticated")).toBe(true);
      const expected =
        p.scope === "global"
          ? `/_authenticated${p.seg}${p.id === "P00" ? "/" : ""}`
          : p.scope === "scene"
            ? `/_authenticated/projects/$id/scenes/$sid/${p.seg}`
            : p.scope === "shot"
              ? `/_authenticated/projects/$id/shots/$shotid/${p.seg}`
              : `/_authenticated/projects/$id/${p.seg}${p.id === "P10" ? "/" : ""}`;
      expect(matches.at(-1)?.routeId).toBe(expected);
    });
  }
  it("matches the public landing page", () =>
    expect(router.matchRoutes("/").at(-1)?.routeId).toBe("/"));
});
