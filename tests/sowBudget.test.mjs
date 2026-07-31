import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyManualMilestoneBudgetEdit,
  applyReallocationByMilestoneIndex,
  buildReallocateBudgetRequest,
  createInitialBudgetConfirmationState,
  isBelowAiEstimate,
  resolveAuthoritativeBudget,
  shouldLockBusinessBudgetInput,
  shouldPreserveMilestoneBudgetAllocation,
  shouldShowAiBudgetAssessment,
  validateBudgetIntegrity,
} from "../src/pages/MarketplacePages/CreateJobPage/sowBudget.ts";

const assessment = {
  currency: "VND",
  businessBudget: 50_000_000,
  estimatedMin: 120_000_000,
  recommendedBudget: 140_000_000,
  estimatedMax: 160_000_000,
  status: "TOO_LOW",
  gapToMinimum: 70_000_000,
  confidence: "MEDIUM",
  source: "AI_ADVISORY",
  requiresBusinessConfirmation: true,
  message: "Ngân sách thấp hơn khoảng AI tham khảo.",
  factors: [],
};

const milestones = [
  {
    milestoneName: "M1",
    fundsAllocated: "14000000",
    businessBudget: 14_000_000,
    recommendedBudget: 40_000_000,
    orderIndex: "1",
    durationValue: "1",
    acceptanceCriteria: ["Done"],
  },
  {
    milestoneName: "M2",
    fundsAllocated: "36000000",
    businessBudget: 36_000_000,
    recommendedBudget: 100_000_000,
    orderIndex: "2",
    durationValue: "1",
    acceptanceCriteria: ["Done"],
  },
];

const pageSourcePromise = readFile(
  new URL(
    "../src/pages/MarketplacePages/CreateJobPage/CreateJobPage.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("customer budget card shows the AI proposal as one range", async () => {
  const source = await pageSourcePromise;
  const cardSource = source.slice(
    source.indexOf("function BudgetAssessmentCard"),
    source.indexOf("export function CreateJobPage"),
  );
  assert.match(cardSource, /Khoảng ngân sách AI đề xuất/);
  assert.doesNotMatch(cardSource, /Mức đề xuất phù hợp/);
  assert.doesNotMatch(
    cardSource,
    /formatCurrency\(assessment\.recommendedBudget\)/,
  );
  assert.equal(cardSource.match(/<Input/g)?.length, 1);
  assert.match(cardSource, /Bạn là người quyết định ngân sách cuối cùng/);
  assert.match(cardSource, /Tiếp tục với ngân sách này/);
  assert.match(cardSource, /Đã chọn ngân sách hiện tại/);
  assert.match(cardSource, /Điều chỉnh ngân sách/);
  assert.doesNotMatch(
    cardSource,
    /Bạn đã chọn tiếp tục với ngân sách hiện tại/,
  );
  assert.doesNotMatch(cardSource, /Độ tin cậy:/);
  assert.doesNotMatch(cardSource, /Nguồn:/);
  assert.doesNotMatch(cardSource, /assessment\.factors/);
  assert.doesNotMatch(cardSource, /Business/);
});

test("ORIGINAL uses Business budget and milestone.budget values", () => {
  const state = {
    ...createInitialBudgetConfirmationState(),
    selection: "ORIGINAL",
  };
  assert.equal(resolveAuthoritativeBudget(assessment, state, 1), 50_000_000);
  assert.deepEqual(
    milestones.map((milestone) => milestone.businessBudget),
    [14_000_000, 36_000_000],
  );
});

test("HIGH Business budget hides the AI assessment and keeps Business budget authoritative", () => {
  const highAssessment = {
    ...assessment,
    businessBudget: 200_000_000,
    status: "HIGH",
  };

  assert.equal(shouldShowAiBudgetAssessment(highAssessment), false);
  assert.equal(
    resolveAuthoritativeBudget(
      highAssessment,
      createInitialBudgetConfirmationState(),
      1,
    ),
    200_000_000,
  );
});

test("HIGH Business budget does not lock the editable Business budget input", () => {
  const highAssessment = {
    ...assessment,
    businessBudget: 200_000_000,
    status: "HIGH",
  };

  assert.equal(shouldLockBusinessBudgetInput(highAssessment, false), false);
  assert.equal(shouldLockBusinessBudgetInput(highAssessment, true), true);
  assert.equal(shouldLockBusinessBudgetInput(assessment, false), true);
});

test("editing a hidden HIGH assessment marks the budget as manual", async () => {
  const source = await pageSourcePromise;
  const updateBudgetSource = source.slice(
    source.indexOf("const updateFormBudgetAmount"),
    source.indexOf("const updateMilestone ="),
  );

  assert.match(updateBudgetSource, /selection:\s*"MANUAL"/);
  assert.match(updateBudgetSource, /!shouldShowAiBudgetAssessment\(budgetAssessment\)/);
  assert.match(source, /disabled=\{businessBudgetInputLocked\}/);
});

test("manual milestone edits override the original total even when the AI card is hidden", () => {
  const highAssessment = {
    ...assessment,
    businessBudget: 200_000_000,
    status: "HIGH",
  };

  assert.equal(
    resolveAuthoritativeBudget(
      highAssessment,
      {
        selection: "MANUAL",
        customBudget: "210000000",
        allocation: null,
        error: "",
      },
      210_000_000,
    ),
    210_000_000,
  );
});

test("non-HIGH budgets continue to show the AI assessment", () => {
  assert.equal(shouldShowAiBudgetAssessment(assessment), true);
});

test("CUSTOM request uses recommendedBudget only as referenceBudget", () => {
  assert.deepEqual(buildReallocateBudgetRequest(110_000_000, milestones), {
    selectedBudget: 110_000_000,
    milestones: [
      { milestoneIndex: 0, referenceBudget: 40_000_000 },
      { milestoneIndex: 1, referenceBudget: 100_000_000 },
    ],
  });
});

test("CUSTOM confirmation calls the backend reallocation API", async () => {
  const source = await pageSourcePromise;
  assert.match(source, /await sowApi\.reallocateBudget\(request\)/);
  assert.match(source, /applyReallocationByMilestoneIndex/);
});

test("confirmed CUSTOM and MANUAL allocations survive milestone content updates", () => {
  const customState = {
    selection: "CUSTOM",
    customBudget: "110000000",
    allocation: {
      selectedBudget: 110_000_000,
      allocations: [
        { milestoneIndex: 0, fundsAllocated: 31_428_571 },
        { milestoneIndex: 1, fundsAllocated: 78_571_429 },
      ],
    },
    error: "",
  };

  assert.equal(shouldPreserveMilestoneBudgetAllocation(customState), true);
  assert.equal(
    shouldPreserveMilestoneBudgetAllocation({
      ...customState,
      allocation: null,
    }),
    false,
  );
  assert.equal(
    shouldPreserveMilestoneBudgetAllocation({
      selection: "MANUAL",
      customBudget: "65000000",
      allocation: null,
      error: "",
    }),
    true,
  );
});

test("deleting a milestone reallocates the confirmed custom total over remaining milestones", () => {
  const remainingMilestones = [milestones[1]];
  assert.deepEqual(
    buildReallocateBudgetRequest(110_000_000, remainingMilestones),
    {
      selectedBudget: 110_000_000,
      milestones: [{ milestoneIndex: 0, referenceBudget: 100_000_000 }],
    },
  );

  const reallocated = applyReallocationByMilestoneIndex(remainingMilestones, {
    selectedBudget: 110_000_000,
    allocations: [{ milestoneIndex: 0, fundsAllocated: 110_000_000 }],
  });
  assert.equal(reallocated[0].fundsAllocated, "110000000");
});

test("allocation response is mapped by milestoneIndex, not array order", () => {
  const response = {
    selectedBudget: 110_000_000,
    allocations: [
      { milestoneIndex: 1, fundsAllocated: 78_571_429 },
      { milestoneIndex: 0, fundsAllocated: 31_428_571 },
    ],
  };
  const mapped = applyReallocationByMilestoneIndex(milestones, response);
  assert.deepEqual(
    mapped.map((milestone) => Number(milestone.fundsAllocated)),
    [31_428_571, 78_571_429],
  );
  assert.equal(
    resolveAuthoritativeBudget(
      assessment,
      {
        selection: "CUSTOM",
        customBudget: "110000000",
        allocation: response,
        error: "",
      },
      1,
    ),
    110_000_000,
  );
});

test("AI-generated milestone budgets can be edited manually and keep the Job total synchronized", () => {
  const firstEdit = applyManualMilestoneBudgetEdit(
    milestones,
    0,
    "20000000",
  );
  const secondEdit = applyManualMilestoneBudgetEdit(
    firstEdit.milestones,
    1,
    "45000000",
  );

  assert.deepEqual(
    secondEdit.milestones.map((milestone) => milestone.fundsAllocated),
    ["20000000", "45000000"],
  );
  assert.equal(secondEdit.totalBudget, 65_000_000);
  assert.equal(
    resolveAuthoritativeBudget(
      assessment,
      {
        selection: "MANUAL",
        customBudget: String(secondEdit.totalBudget),
        allocation: null,
        error: "",
      },
      secondEdit.totalBudget,
    ),
    65_000_000,
  );
});

test("milestone budget inputs unlock after editing an AI-generated SoW", async () => {
  const source = await pageSourcePromise;
  const milestoneBudgetInput = source.slice(
    source.indexOf("aria-label={`Ngân sách ${index + 1}`}"),
    source.indexOf("aria-label={`Giai đoạn ${index + 1}`}"),
  );

  assert.match(milestoneBudgetInput, /disabled=\{\s*sowGeneratedLocked\s*\}/);
  assert.doesNotMatch(milestoneBudgetInput, /Boolean\(budgetAssessment\)/);
});

test("milestone total must exactly equal Job budget", () => {
  assert.deepEqual(
    validateBudgetIntegrity(
      [{ fundsAllocated: 31_428_571 }, { fundsAllocated: 78_571_429 }],
      110_000_000,
    ),
    [],
  );
  assert.match(
    validateBudgetIntegrity(
      [{ fundsAllocated: 31_428_571 }, { fundsAllocated: 78_571_428 }],
      110_000_000,
    )[0],
    /bằng chính xác/,
  );
});

test("low custom budget warns but remains valid for reallocation", () => {
  assert.equal(isBelowAiEstimate(110_000_000, assessment), true);
  assert.equal(
    buildReallocateBudgetRequest(110_000_000, milestones).selectedBudget,
    110_000_000,
  );
});

test("regeneration reset clears selection, custom value, allocation and error", () => {
  assert.deepEqual(createInitialBudgetConfirmationState(), {
    selection: null,
    customBudget: "",
    allocation: null,
    error: "",
  });
});

test("recommendedBudget is never assigned as the authoritative Job budget", async () => {
  const source = await pageSourcePromise;
  const payloadSource = source.slice(
    source.indexOf("const buildMilestonePayload"),
    source.indexOf("const publishSavedJob"),
  );
  assert.doesNotMatch(payloadSource, /budget:\s*.*recommendedBudget/);
  assert.match(payloadSource, /budget: authoritativeBudget/);
  assert.match(source, /setBudgetAssessment\(null\);\s*clearBudgetConfirmation\(\)/);
  assert.match(
    source,
    /budgetAssessment && budgetAssessmentVisible/,
  );
});

test("VND formatting keeps the full backend number", () => {
  const formatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(140_000_000);
  assert.equal(formatted.replace(/\s/g, " "), "140.000.000 ₫");
});

test("Create Job UI contains no AI budget authority option", async () => {
  const source = await pageSourcePromise;
  const removedState = "USE_AI_" + "RECOMMENDATION";
  const removedLabel = "Dùng ngân sách " + "AI";
  assert.equal(source.includes(removedState), false);
  assert.equal(source.includes(removedLabel), false);
  assert.match(
    source,
    /Mức tham khảo chỉ giúp\s+[\s\S]*bạn cân nhắc trước khi đăng dự án/,
  );
});
