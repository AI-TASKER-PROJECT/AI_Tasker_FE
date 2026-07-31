import assert from "node:assert/strict";
import test from "node:test";
import { resolveMatchedCatalogNames } from "../src/pages/MarketplacePages/marketplacePages.utils.ts";

const skills = [
  { skillId: 8, skillName: "Machine Learning" },
  { skillId: 16, skillName: "Data Analysis" },
  { skillId: 17, skillName: "Recommendation Systems" },
  { skillId: 22, skillName: "Python" },
];

const domains = [
  { domainId: 7, domainName: "Retail" },
  { domainId: 19, domainName: "Artificial Intelligence" },
  { domainId: 26, domainName: "Data Science" },
];

test("recommendation badges resolve legacy CSV skill ids to separate names", () => {
  assert.deepEqual(
    resolveMatchedCatalogNames(
      ["8,16,17,22"],
      skills,
      "skillId",
      "skillName",
    ),
    [
      "Machine Learning",
      "Data Analysis",
      "Recommendation Systems",
      "Python",
    ],
  );
});

test("recommendation badges resolve domain ids and preserve API names", () => {
  assert.deepEqual(
    resolveMatchedCatalogNames(
      ["7", "19", "26"],
      domains,
      "domainId",
      "domainName",
    ),
    ["Retail", "Artificial Intelligence", "Data Science"],
  );
  assert.deepEqual(
    resolveMatchedCatalogNames(
      ["Customer Support", "RAG / Knowledge Base"],
      [],
      "skillId",
      "skillName",
    ),
    ["Customer Support", "RAG / Knowledge Base"],
  );
});
