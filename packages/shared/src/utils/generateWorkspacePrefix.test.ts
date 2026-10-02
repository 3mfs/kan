import { describe, expect, it } from "vitest";

import {
  generateWorkspacePrefix,
  normalizeWorkspacePrefix,
} from "./generateWorkspacePrefix";

describe("generateWorkspacePrefix", () => {
  it("generates initials from a multi-word workspace name", () => {
    expect(generateWorkspacePrefix("Product Development")).toBe("PD");
  });

  it("limits single-word prefixes to three characters", () => {
    expect(generateWorkspacePrefix("Engineering")).toBe("ENG");
  });
});

describe("normalizeWorkspacePrefix", () => {
  it("trims whitespace and uppercases the prefix", () => {
    expect(normalizeWorkspacePrefix(" eng ")).toBe("ENG");
  });
});
