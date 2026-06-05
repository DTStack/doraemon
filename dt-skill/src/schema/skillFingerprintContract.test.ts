/* @vitest-environment node */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildSkillFingerprint, fingerprintFromGoldenCase, sha256Hex } from "./skillFingerprintContract.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const goldenVectors = JSON.parse(
  readFileSync(resolve(repoRoot, "contracts/skill-fingerprint/golden-vectors.v1.json"), "utf8"),
);

describe("skill fingerprint contract adapter", () => {
  it("matches shared golden vectors", () => {
    for (const testCase of goldenVectors.cases) {
      const fingerprint = fingerprintFromGoldenCase(testCase);
      if (testCase.fingerprint) {
        expect(fingerprint, testCase.name).toBe(testCase.fingerprint);
      }
      expect(fingerprintFromGoldenCase(testCase), testCase.name).toBe(fingerprint);
    }
  });

  it("sorts paths before hashing", () => {
    const fingerprint = buildSkillFingerprint([
      { path: "b.txt", sha256: sha256Hex("b") },
      { path: "a.txt", sha256: sha256Hex("a") },
    ]);
    const expected = buildSkillFingerprint([
      { path: "a.txt", sha256: sha256Hex("a") },
      { path: "b.txt", sha256: sha256Hex("b") },
    ]);
    expect(fingerprint).toBe(expected);
  });
});
