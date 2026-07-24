import type {
  BudgetAssessment,
  ReallocateSowBudgetRequest,
  ReallocateSowBudgetResponse,
} from "../../../services/api.types";
import type { MilestoneDraft } from "../marketplacePages.utils";

export type BudgetSelectionMode = "ORIGINAL" | "CUSTOM" | "MANUAL";

export interface SowBudgetConfirmationState {
  selection: BudgetSelectionMode | null;
  customBudget: string;
  allocation: ReallocateSowBudgetResponse | null;
  error: string;
}

export function createInitialBudgetConfirmationState(): SowBudgetConfirmationState {
  return {
    selection: null,
    customBudget: "",
    allocation: null,
    error: "",
  };
}

export function shouldPreserveMilestoneBudgetAllocation(
  state: SowBudgetConfirmationState,
) {
  return (
    state.selection === "MANUAL" ||
    (state.selection === "CUSTOM" && state.allocation !== null)
  );
}

export function buildReallocateBudgetRequest(
  selectedBudget: number,
  milestones: MilestoneDraft[],
): ReallocateSowBudgetRequest {
  if (!Number.isSafeInteger(selectedBudget) || selectedBudget <= 0) {
    throw new Error("Ngân sách tùy chỉnh phải là số VND nguyên lớn hơn 0.");
  }

  return {
    selectedBudget,
    milestones: milestones.map((milestone, milestoneIndex) => {
      if (
        !Number.isSafeInteger(milestone.recommendedBudget) ||
        Number(milestone.recommendedBudget) <= 0
      ) {
        throw new Error(
          `Milestone ${milestoneIndex + 1} chưa có ngân sách AI tham khảo. Vui lòng tạo lại SoW.`,
        );
      }

      return {
        milestoneIndex,
        referenceBudget: Number(milestone.recommendedBudget),
      };
    }),
  };
}

export function applyReallocationByMilestoneIndex(
  milestones: MilestoneDraft[],
  response: ReallocateSowBudgetResponse,
): MilestoneDraft[] {
  if (!Number.isSafeInteger(response.selectedBudget) || response.selectedBudget <= 0) {
    throw new Error("Phản hồi phân bổ không có ngân sách hợp lệ.");
  }

  const allocationsByIndex = new Map<number, number>();
  response.allocations.forEach((allocation) => {
    if (
      !Number.isInteger(allocation.milestoneIndex) ||
      allocation.milestoneIndex < 0 ||
      allocation.milestoneIndex >= milestones.length ||
      allocationsByIndex.has(allocation.milestoneIndex) ||
      !Number.isSafeInteger(allocation.fundsAllocated) ||
      allocation.fundsAllocated <= 0
    ) {
      throw new Error("Phản hồi phân bổ milestone không hợp lệ.");
    }
    allocationsByIndex.set(
      allocation.milestoneIndex,
      allocation.fundsAllocated,
    );
  });

  if (allocationsByIndex.size !== milestones.length) {
    throw new Error("Phản hồi phân bổ chưa đủ cho tất cả milestone.");
  }

  const allocatedTotal = Array.from(allocationsByIndex.values()).reduce(
    (total, amount) => total + amount,
    0,
  );
  if (allocatedTotal !== response.selectedBudget) {
    throw new Error("Tổng phân bổ từ backend không khớp ngân sách đã chọn.");
  }

  return milestones.map((milestone, milestoneIndex) => ({
    ...milestone,
    fundsAllocated: String(allocationsByIndex.get(milestoneIndex)),
  }));
}

export function applyManualMilestoneBudgetEdit(
  milestones: MilestoneDraft[],
  milestoneIndex: number,
  amount: string,
): { milestones: MilestoneDraft[]; totalBudget: number } {
  if (milestoneIndex < 0 || milestoneIndex >= milestones.length) {
    throw new Error("Milestone cần chỉnh sửa không tồn tại.");
  }

  const updatedMilestones = milestones.map((milestone, index) =>
    index === milestoneIndex
      ? { ...milestone, fundsAllocated: amount }
      : milestone,
  );
  const totalBudget = updatedMilestones.reduce(
    (total, milestone) => total + Number(milestone.fundsAllocated || 0),
    0,
  );

  return { milestones: updatedMilestones, totalBudget };
}

export function resolveAuthoritativeBudget(
  assessment: BudgetAssessment | null,
  state: SowBudgetConfirmationState,
  fallbackBudget: number,
): number | null {
  if (!assessment) {
    return Number.isSafeInteger(fallbackBudget) && fallbackBudget > 0
      ? fallbackBudget
      : null;
  }
  if (state.selection === "MANUAL") {
    return Number.isSafeInteger(fallbackBudget) && fallbackBudget > 0
      ? fallbackBudget
      : null;
  }
  if (!shouldShowAiBudgetAssessment(assessment)) {
    return assessment.businessBudget;
  }
  if (state.selection === "ORIGINAL") {
    return assessment.businessBudget;
  }
  if (state.selection === "CUSTOM" && state.allocation) {
    return state.allocation.selectedBudget;
  }
  return null;
}

export function validateBudgetIntegrity(
  milestones: Array<{ fundsAllocated: number }>,
  jobBudget: number,
): string[] {
  const errors: string[] = [];
  if (milestones.length === 0) {
    errors.push("Job phải có ít nhất một milestone.");
  }
  if (
    milestones.some(
      (milestone) =>
        !Number.isSafeInteger(milestone.fundsAllocated) ||
        milestone.fundsAllocated <= 0,
    )
  ) {
    errors.push("Mọi milestone phải có fundsAllocated là số VND nguyên lớn hơn 0.");
  }
  const total = milestones.reduce(
    (sum, milestone) => sum + milestone.fundsAllocated,
    0,
  );
  if (!Number.isSafeInteger(jobBudget) || jobBudget <= 0 || total !== jobBudget) {
    errors.push("Tổng fundsAllocated phải bằng chính xác ngân sách Job.");
  }
  return errors;
}

export function isBelowAiEstimate(
  customBudget: number,
  assessment: BudgetAssessment,
) {
  return Number.isFinite(customBudget) && customBudget < assessment.estimatedMin;
}

export function shouldShowAiBudgetAssessment(assessment: BudgetAssessment) {
  return assessment.status !== "HIGH";
}

export function shouldLockBusinessBudgetInput(
  assessment: BudgetAssessment | null,
  sowGeneratedLocked: boolean,
) {
  return (
    sowGeneratedLocked ||
    Boolean(assessment && shouldShowAiBudgetAssessment(assessment))
  );
}
