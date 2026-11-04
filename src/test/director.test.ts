import { describe, expect, it } from "vitest";
import { directorRemarks, type ProjectFacts } from "@/lib/director";

const empty: ProjectFacts = {
  briefHasFacts: false,
  briefHasDecisions: false,
  interpretations: 0,
  scenes: 0,
  shots: 0,
  shotsWithoutChange: 0,
  shotsWithoutCutReason: 0,
  characters: 0,
  locations: 0,
  gatesApproved: 0,
  gatesTotal: 6,
};
const complete: ProjectFacts = {
  ...empty,
  briefHasFacts: true,
  briefHasDecisions: true,
  interpretations: 1,
  scenes: 2,
  shots: 5,
  characters: 2,
  locations: 1,
  gatesApproved: 1,
};

describe("Director's Second Chair remarks are grounded in stored project facts", () => {
  it("starts with the empty brief on a new project and shows at most three remarks", () => {
    const r = directorRemarks(empty);
    expect(r[0]!.key).toBe("brief_empty");
    expect(r).toHaveLength(3);
  });

  it("counts shots without a stated change from the real number", () => {
    const r = directorRemarks({ ...complete, shotsWithoutChange: 4 });
    expect(r.map((x) => x.key)).toEqual(["shots_without_change"]);
    expect(r[0]!.text.en).toContain("4 shot(s)");
  });

  it("asks for shots when scenes exist but none are planned", () => {
    expect(directorRemarks({ ...complete, shots: 0 }).map((x) => x.key)).toEqual(["no_shots"]);
  });

  it("reports approved gates as the user's signatures when the written plan is complete", () => {
    const r = directorRemarks(complete);
    expect(r.map((x) => x.key)).toEqual(["ready_for_gates"]);
    expect(r[0]!.text.en).toContain("1 of 6");
  });
});
