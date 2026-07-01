import { call } from "./apiClient";
import type { ExpertRecommendationListResponse, ExpertRecommendationResponse } from "./api.types";

export const expertRecommendationApi = {
  /** POST — Gọi AI generate mới, lưu DB và trả kết quả */
  generate(jobPostingId: number) {
    return call<ExpertRecommendationListResponse>({
      method: "POST",
      url: `/api/jobs/${jobPostingId}/expert-recommendations`,
      timeout: 90000,
    });
  },
  /** GET — Lấy danh sách dã lưu (không gọi lại AI) */
  get(jobPostingId: number) {
    return call<ExpertRecommendationListResponse>({
      method: "GET",
      url: `/api/jobs/${jobPostingId}/expert-recommendations`,
    });
  },
  /** POST — Doanh nghiệp chọn chuyên gia từ danh sách dề xuất */
  select(jobPostingId: number, expertId: number) {
    return call<ExpertRecommendationResponse>({
      method: "POST",
      url: `/api/jobs/${jobPostingId}/expert-recommendations/${expertId}/select`,
    });
  },
};
